import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { withBypass, withCafe } from "@/db/context";
import { closePools } from "@/db/pool";
import * as butce from "@/domain/butce";
import * as urun from "@/domain/urun";
import * as katalog from "@/domain/katalog";
import * as kampanya from "@/domain/kampanya";
import * as cafe from "@/domain/cafe";
import * as panelDurum from "@/domain/panel-durum";
import * as masa from "@/domain/masa";
import * as masaYonetim from "@/domain/masa-yonetim";
import * as qr from "@/domain/qr";
import { kaydet } from "@/domain/player";
import { normalizePhone, decryptPII, encryptPII } from "@/lib/crypto";
import { randomInt } from "node:crypto";
import { pazartesi, isGunu } from "@/lib/tarih";
import { yoneticiSorgu, benzersizEposta } from "./_yardim";

/**
 * FAZ 6 GÜVENLİK KAPISI — kafe paneli.
 *
 * Dört iddia sınanıyor:
 *   1. Her yazma işlemi denetim izine düşer
 *   2. Bütçe alt sınırın altına indirilemez — orantılı dönemde de (Ü25)
 *   3. Tavansız veya limitsiz yüzde kampanyası kaydedilemez (Ü17)
 *   4. Başka kafenin ürünü, ödülü veya kampanyası düzenlenemez (G12)
 *
 * Ayrıca bütçe muhasebesinin kendisi: E10 (negatife düşmez) ve E11 (serbest
 * kalan tutar kadar yeni kupon çıkabilir).
 */

let kafeA = "";
let kafeB = "";
let yoneticiA = "";
let urunA = "";
let ilkTaahhut: number | null = null;

const bugun = isGunu();

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const y = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [a!.id],
    );
    return { a: a?.id, b: b?.id, y: y?.id };
  });
  assert.ok(v.a && v.b && v.y, "Tohum verisi yok — önce: npm run db:seed");
  kafeA = v.a;
  kafeB = v.b;
  yoneticiA = v.y;

  // Tohum verisi SİLİNMİYOR: kuponlar tohumdaki bütçe dönemine bağlı ve
  // veritabanı bunu doğru biçimde reddediyor. Testler kendi izlerini
  // bırakıp toplar, tohuma dokunmaz — taahhüt değeri de sonda geri konur.
  const mevcut = await withBypass("test: mevcut taahhüt", (db) =>
    db.one<{ committed_kurus: string }>(
      `SELECT committed_kurus FROM budget_periods
        WHERE cafe_id = $1 AND period_start <= $2 AND period_end > $2`,
      [kafeA, bugun],
    ),
  );
  ilkTaahhut = mevcut ? Number(mevcut.committed_kurus) : null;
});

after(async () => {
  // Yalnızca bu testin ürettiği satırlar — ve yalnızca KENDİ kafesinde.
  // Kafe süzgeci olmayan bir DELETE, aynı veritabanını paylaşan başka bir
  // test dosyasının satırlarını silerdi.
  await yoneticiSorgu(
    `DELETE FROM budget_ledger
      WHERE cafe_id = $1 AND (note LIKE 'test%' OR note = 'süre doldu'
                              OR (note IS NULL AND coupon_id IS NULL))`,
    [kafeA],
  );
  await yoneticiSorgu(
    `DELETE FROM audit_log WHERE cafe_id = ANY($1)
      AND action IN ('budget.create','budget.update','product.create','product.update',
                     'reward.create','reward.update','campaign.create','campaign.publish','campaign.stop')`,
    [[kafeA, kafeB]],
  );
  await yoneticiSorgu(
    `DELETE FROM percentage_campaigns WHERE product_id IN
       (SELECT id FROM products WHERE name LIKE 'TEST %')`,
  );
  await yoneticiSorgu(`DELETE FROM rewards WHERE title LIKE 'TEST %'`);
  await yoneticiSorgu(`DELETE FROM products WHERE name LIKE 'TEST %'`);

  if (ilkTaahhut != null) {
    await yoneticiSorgu(
      `UPDATE budget_periods SET committed_kurus = $2
        WHERE cafe_id = $1 AND period_start <= $3 AND period_end > $3`,
      [kafeA, ilkTaahhut, bugun],
    );
  }
  await closePools();
});

/* ═══════════════════════════════════════════════════════════
   1 · Dönem hesabı (Ü25)
   ═══════════════════════════════════════════════════════════ */

describe("bütçe dönemi pazartesi başlar (Ü25)", () => {
  test("hafta içi her gün aynı pazartesiye düşer", () => {
    // 2026-08-24 pazartesi.
    for (const gun of ["2026-08-24", "2026-08-26", "2026-08-30"]) {
      assert.equal(pazartesi(gun), "2026-08-24", `${gun} yanlış haftaya düştü`);
    }
  });

  test("pazar, önceki haftanın son günüdür", () => {
    assert.equal(pazartesi("2026-08-30"), "2026-08-24");
    assert.equal(pazartesi("2026-08-31"), "2026-08-31");
  });

  /**
   * Ü45: dönem artık bir gün. Haftalık dönem ve "hafta ortasında katılan
   * kafenin orantılı tabanı" kavramları birlikte kalktı — her gün tam bir
   * dönem olduğu için orantılanacak bir şey kalmadı.
   */
  test("dönem tek gün", () => {
    const a = butce.donemAraligi("2026-08-26");
    assert.equal(a.baslangic, "2026-08-26");
    assert.equal(a.bitis, "2026-08-27");
    assert.equal(a.gunSayisi, 1);
  });

  test("günlük taban 1.500 TL", () => {
    assert.equal(butce.tabanKurus(1), butce.GUNLUK_TABAN_KURUS);
    assert.equal(butce.GUNLUK_TABAN_KURUS, 150_000);
  });

  test("tabanın altındaki taahhüt reddediliyor", async () => {
    const sonuc = await butce.donemBelirle({
      cafeId: kafeB,
      taahhutKurus: 149_999,
      aktorId: "stf_test",
    });
    assert.equal(sonuc.ok, false);
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Bütçe alt sınırı
   ═══════════════════════════════════════════════════════════ */

describe("bütçe alt sınırın altına inemez (Ü6, Ü25)", () => {
  test("günlük 1.500 TL'nin altı reddedilir", async () => {
    const sonuc = await butce.donemBelirle({
      cafeId: kafeA,
      taahhutKurus: 100_000,
      aktorId: yoneticiA,
      gun: bugun,
    });
    assert.equal(sonuc.ok, false);
    assert.match(sonuc.ok === false ? sonuc.hata : "", /1\.500/);
  });

  test("geçerli taahhüt kabul edilir ve denetim izine düşer", async () => {
    const sonuc = await butce.donemBelirle({
      cafeId: kafeA,
      taahhutKurus: 200_000,
      aktorId: yoneticiA,
      gun: bugun,
    });
    assert.ok(sonuc.ok, sonuc.ok === false ? sonuc.hata : "");
    assert.equal(sonuc.donem.taahhutKurus, 200_000);

    const iz = await withCafe(kafeA, (db) =>
      db.all<{ action: string }>(
        `SELECT action FROM audit_log WHERE action IN ('budget.create','budget.update')`,
      ),
    );
    assert.ok(iz.length > 0, "bütçe yazımı denetim izine düşmedi");
  });

  test("veritabanı da reddeder — günlük taban kısıtı", async () => {
    // Bir günlük dönem için 1.000 TL: kod atlansa bile şema durdurmalı.
    await assert.rejects(
      withBypass("test: düşük taahhüt", (db) =>
        db.query(
          `INSERT INTO budget_periods (id, cafe_id, period_start, period_end, committed_kurus)
           VALUES ('bdg_test_dusuk', $1, $2, $3, 100000)`,
          [kafeB, "2030-02-05", "2030-02-06"],
        ),
      ),
      /butce_tabani_gunluk|violates check constraint/i,
    );
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Bütçe muhasebesi — E10, E11
   ═══════════════════════════════════════════════════════════ */

/**
 * Tempo penceresinin **tamamen** açık olduğu bir an (Ü87).
 *
 * **Kapanış anı**: `tempoOrani` orada 1 döndürüyor, yani günlük taahhüdün
 * tamamı masada ve kafe hâlâ açık sayılıyor (Ü90'ın yarım saatlik kapanış
 * payı). 22:00 seçilseydi tavan %93'te kalır ve "bütçeyi doldur" kuran
 * testler bütçeyi hiç dolduramazdı — E10'u sınadığını sanan test aslında
 * tempoyu sınardı. 23:30 seçilseydi kapanış payı da bitmiş olurdu.
 *
 * ⚠️ Bu sabit olmadan bütçe testleri **saate bağımlı** oluyor: Ü87 günlük
 * bütçeyi gün içinde kademeli açıyor ve gece yarısından sonra yalnızca
 * onda biri açık. CI'yi 00:05'te koşturmak testleri düşürüyordu — hata
 * testlerde değil, varsayımdaydı.
 *
 * Konusu tempo olan testler kendi saatlerini veriyor (bkz. "bütçe temposu").
 */
const TEMPO_ACIK = new Date("2026-09-02T23:00:00+03:00");

describe("bütçe defteri (E3, E10, E11)", () => {
  /**
   * Testin ihtiyacı olan boşluğu kendisi açar.
   *
   * Önceki hâli 500 TL'lik bir rezervasyonun geçeceğini varsayıyordu ve bu,
   * kafenin o anki bütçesinde o kadar yer kalmasına bağlıydı. Demo
   * simülasyonu (`npm run db:simule`) aynı bütçeyi tüketince varsayım
   * kırıldı. Sınanan şey rezervasyon MEKANİĞİ; ne kadar yer kaldığı değil.
   */
  async function boslukAc() {
    const d = await butce.durum(kafeA, bugun);
    if (d.dagitilabilirKurus >= 100_000) return;
    const sonuc = await butce.donemBelirle({
      cafeId: kafeA,
      taahhutKurus: (d.donem?.taahhutKurus ?? 0) + 200_000,
      aktorId: "stf_test",
      gun: bugun,
    });
    assert.equal(sonuc.ok, true, "test için bütçe yükseltilemedi");
  }

  test("rezervasyon dağıtılabilir tutarı düşürür", async () => {
    await boslukAc();
    const once = await butce.durum(kafeA, bugun);

    const ok = await withCafe(kafeA, (db) =>
      butce.rezerveEt(db, {
        cafeId: kafeA,
        kurus: 50_000,
        not: "test",
        gun: bugun,
        an: TEMPO_ACIK,
      }),
    );
    assert.equal(ok, true);

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(sonra.rezerveKurus, once.rezerveKurus + 50_000);
    assert.equal(sonra.dagitilabilirKurus, once.dagitilabilirKurus - 50_000);
  });

  test("bütçeyi aşan rezervasyon reddedilir — E10", async () => {
    const d = await butce.durum(kafeA, bugun);

    const ok = await withCafe(kafeA, (db) =>
      butce.rezerveEt(db, {
        cafeId: kafeA,
        kurus: d.dagitilabilirKurus + 1,
        not: "test-asim",
        gun: bugun,
        an: TEMPO_ACIK,
      }),
    );
    assert.equal(ok, false, "bütçeyi aşan rezervasyon kabul edildi");

    const sonra = await butce.durum(kafeA, bugun);
    assert.deepEqual(
      { r: sonra.rezerveKurus, h: sonra.harcananKurus },
      { r: d.rezerveKurus, h: d.harcananKurus },
      "reddedilen rezervasyon deftere yazdı",
    );
  });

  test("harcama rezerveden çıkıp kalıcı düşer", async () => {
    const d = await butce.durum(kafeA, bugun);
    assert.ok(d.donem);

    await withCafe(kafeA, (db) =>
      butce.harca(db, { cafeId: kafeA, donemId: d.donem!.id, kurus: 20_000 }),
    );

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(sonra.harcananKurus, d.harcananKurus + 20_000);
    assert.equal(sonra.rezerveKurus, d.rezerveKurus - 20_000, "rezerve düşmedi");
  });

  test("serbest bırakılan tutar bütçeye döner — E11", async () => {
    const d = await butce.durum(kafeA, bugun);
    assert.ok(d.donem);

    await withCafe(kafeA, (db) =>
      butce.serbestBirak(db, {
        cafeId: kafeA,
        donemId: d.donem!.id,
        kurus: 10_000,
        not: "süre doldu",
      }),
    );

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(sonra.iadeKurus, d.iadeKurus + 10_000);
    assert.equal(
      sonra.dagitilabilirKurus,
      d.dagitilabilirKurus + 10_000,
      "serbest kalan tutar yeniden dağıtılabilir olmadı",
    );
  });

  test("dağıtılmış kuponların altına inen bütçe reddedilir", async () => {
    const sonuc = await butce.donemBelirle({
      cafeId: kafeA,
      taahhutKurus: 150_000, // tabanın üstünde ama bağlı tutarın altında olabilir
      aktorId: yoneticiA,
      gun: bugun,
    });

    const d = await butce.durum(kafeA, bugun);
    // Bağlı tutar (rezerve + harcanan) taahhüdü aşamaz — hangi sonuç dönerse dönsün.
    assert.ok(
      d.dagitilabilirKurus >= 0,
      `dağıtılabilir negatife düştü: ${d.dagitilabilirKurus}`,
    );
    assert.ok(sonuc.ok || /kupon zaten dağıtıldı/.test(sonuc.hata));
  });

  test("defter append-only — uygulama rolü güncelleyemez (E3)", async () => {
    await assert.rejects(
      withCafe(kafeA, (db) => db.query(`UPDATE budget_ledger SET amount_kurus = 1`)),
      /permission denied/i,
    );
  });
});

/* ═══════════════════════════════════════════════════════════
   4 · Ürün ve katalog
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   3b · Bütçe temposu (Ü87)
   ═══════════════════════════════════════════════════════════ */

describe("bütçe temposu (Ü87)", () => {
  /** İstanbul saatiyle verilen saatte bir an. */
  const saat = (s: number) => new Date(`2026-09-02T${String(s).padStart(2, "0")}:00:00+03:00`);

  test("oran gün boyunca artıyor, açılışta ilk pay kadar", () => {
    // Çalışma saatleri 09:00–23:00 (varsayılan).
    assert.equal(butce.tempoOrani(saat(9), 9, 23), butce.ILK_PAY, "açılışta ilk pay değil");

    const ogle = butce.tempoOrani(saat(16), 9, 23);
    assert.ok(ogle > butce.tempoOrani(saat(12), 9, 23), "oran gün boyunca artmıyor");
    assert.ok(ogle < 1, "gün ortasında bütçenin tamamı açılmış");
  });

  test("kafe kapalıyken hiç dağıtım yok (Ü90)", () => {
    // Ürün sahibinin kararı: "kafe 23'te kapanıyor, o saatten sonra müşteri
    // gelmeyeceği için sistem ödül eklemesin." İlk sürüm tersini yapıyordu —
    // kapanıştan sonra bütçenin TAMAMINI açıyordu.
    assert.equal(butce.tempoOrani(saat(6), 9, 23), 0, "açılmadan önce dağıtım var");
    assert.equal(butce.tempoOrani(saat(2), 9, 23), 0, "gece yarısından sonra dağıtım var");
    assert.equal(butce.tempoOrani(saat(23), 9, 23), 1, "kapanış payı yok");

    // Kapanış payı: son masanın oyununu bitirmesi için yarım saat.
    const yarimSaatSonra = new Date("2026-09-02T23:29:00+03:00");
    const kirkDakikaSonra = new Date("2026-09-02T23:40:00+03:00");
    assert.equal(butce.tempoOrani(yarimSaatSonra, 9, 23), 1, "kapanış payı erken bitti");
    assert.equal(butce.tempoOrani(kirkDakikaSonra, 9, 23), 0, "kapanış payı hiç bitmiyor");
  });

  test("bozuk pencere tempoyu devre dışı bırakıyor", () => {
    // Bitiş başlangıçtan küçükse kural uygulanamaz; kafeyi kilitlemektense
    // tempoyu kapatmak doğru — bütçe tavanı (E10) zaten yerinde duruyor.
    assert.equal(butce.tempoOrani(saat(12), 20, 8), 1);
  });

  test("aynı tutar sabah reddediliyor, akşam kabul ediliyor", async () => {
    /**
     * Tutar sabit yazılmıyor: tohum ve önceki testler bu dönemde zaten
     * rezervasyon bırakmış olabilir. Sınanan şey mutlak bir sayı değil,
     * **aynı tutara iki saatte iki farklı cevap** verilmesi.
     *
     * ⚠️ Taahhüt testin **kendisi** tarafından açılıyor. Önceki hâli
     * dönemde kalan paya güveniyordu ve o pay başka dosyaların ne kadar
     * harcadığına bağlıydı: upsell testleri eklenince (Ü100) kupon
     * rezervasyonları arttı, aralık kapandı ve bu test **yanlış sebeple**
     * düştü — tempoyu değil, kalan bütçeyi ölçer hâle gelmişti.
     *
     * Bütçe defteri append-only (E3): kupon silinse de rezervasyon
     * satırı kalıyor. Yani "sonra temizlerim" diye bir yol yok; testin
     * kendi payını açması gerekiyor.
     */
    const ilk = await butce.durum(kafeA, bugun);
    assert.ok(ilk.donem, "test kurulumu: dönem yok");
    const oncekiTaahhut = ilk.donem.taahhutKurus;
    await yoneticiSorgu(
      `UPDATE budget_periods SET committed_kurus = committed_kurus + 500000
        WHERE cafe_id = $1 AND period_start <= $2 AND period_end > $2`,
      [kafeA, bugun],
    );

    try {
    const d = await butce.durum(kafeA, bugun);
    assert.ok(d.donem, "test kurulumu: dönem yok");

    const kullanilan = d.donem.taahhutKurus - d.dagitilabilirKurus;
    const sabahTavani = Math.floor(d.donem.taahhutKurus * butce.tempoOrani(saat(10), 9, 23));
    const aksamTavani = Math.floor(d.donem.taahhutKurus * butce.tempoOrani(saat(22), 9, 23));

    // Sabahın açtığı payı aşan, akşamınkine sığan bir tutar.
    const tutar = Math.floor((sabahTavani + aksamTavani) / 2) - kullanilan;
    assert.ok(tutar > 0, `test kurulumu: aralık kalmadı (kullanılan ${kullanilan})`);

    const sabah = await withBypass("test: tempo sabah", (db) =>
      butce.rezerveEt(db, { cafeId: kafeA, kurus: tutar, not: "test tempo", gun: bugun, an: saat(10) }),
    );
    assert.equal(sabah, false, "sabah 10'da akşamın payı rezerve edilebildi");

    const aksam = await withBypass("test: tempo aksam", (db) =>
      butce.rezerveEt(db, { cafeId: kafeA, kurus: tutar, not: "test tempo", gun: bugun, an: saat(22) }),
    );
    assert.equal(aksam, true, "akşam 22'de reddedildi — tempo, tavan değil engel olmuş");
    } finally {
      await yoneticiSorgu(
        `UPDATE budget_periods SET committed_kurus = $3
          WHERE cafe_id = $1 AND period_start <= $2 AND period_end > $2`,
        [kafeA, bugun, oncekiTaahhut],
      );
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   Ad düzeltme (Ü94)
   ═══════════════════════════════════════════════════════════ */

describe("ad düzeltme (Ü94)", () => {
  let odulId = "";
  let yaziHataliUrun = "";
  let komsuUrun = "";
  let komsuAd = "";

  before(async () => {
    // Sahada yaşanan hatanın birebir kendisi (Ü75).
    const u = await urun.ekle({
      cafeId: kafeA,
      ad: `TEST ize amreicano ${randomInt(100000)}`,
      fiyatKurus: 3_000,
      aktorId: yoneticiA,
    });
    assert.ok(u.ok, u.ok === false ? u.hata : "");
    yaziHataliUrun = u.urun.id;

    const o = await katalog.ekle({
      cafeId: kafeA,
      tip: "product",
      baslik: "TEST ize amreicano",
      maliyetKurus: 30_00,
      puanFiyati: 0,
      anlik: true,
      urunId: yaziHataliUrun,
      aktorId: yoneticiA,
    });
    assert.ok(o.ok, o.ok === false ? o.hata : "");
    odulId = o.id;

    // Tekillik sınaması için ikinci bir ürün. Kendi bloğunda kuruluyor:
    // başka describe'ın yarattığı satıra dayanmak, testleri çalışma
    // sırasına bağlar ve sıra değişince sessizce kırılır.
    komsuAd = `TEST Komsu Urun ${randomInt(100000)}`;
    const k = await urun.ekle({
      cafeId: kafeA,
      ad: komsuAd,
      fiyatKurus: 2_500,
      aktorId: yoneticiA,
    });
    assert.ok(k.ok, k.ok === false ? k.hata : "");
    komsuUrun = k.urun.id;
  });

  after(async () => {
    await yoneticiSorgu(`DELETE FROM rewards WHERE id = $1`, [odulId]);
    await yoneticiSorgu(`DELETE FROM products WHERE id = ANY($1)`, [[yaziHataliUrun, komsuUrun]]);
  });

  test("ödülün adı düzeltiliyor — kaldırıp yeniden eklemeye gerek yok", async () => {
    const s = await katalog.adDegistir({
      cafeId: kafeA,
      odulId,
      baslik: "TEST Ice Americano",
      aktorId: yoneticiA,
    });
    assert.ok(s.ok, s.ok === false ? s.hata : "");

    const liste = await katalog.listele(kafeA);
    const bulunan = liste.find((o) => o.id === odulId);
    assert.equal(bulunan?.baslik, "TEST Ice Americano");
  });

  test("ödülün değeri ve tipi ad düzeltmesiyle DEĞİŞMİYOR", async () => {
    // ⚠️ Değer değişebilseydi kafe 30 TL'lik ödülün adını "çay" yapar,
    // elinde kupon olan oyuncu kasada 8 TL'lik bir şey alırdı. Bütçe
    // ekranındaki söz burada da geçerli: verilen söz geri alınmaz.
    const once = (await katalog.listele(kafeA)).find((o) => o.id === odulId);
    await katalog.adDegistir({
      cafeId: kafeA,
      odulId,
      baslik: "TEST Ice Americano Büyük",
      aktorId: yoneticiA,
    });
    const sonra = (await katalog.listele(kafeA)).find((o) => o.id === odulId);

    assert.equal(sonra?.maliyetKurus, once?.maliyetKurus, "ödül değeri değişti");
    assert.equal(sonra?.tip, once?.tip, "ödül tipi değişti");
    assert.equal(sonra?.kanitSeviyesi, once?.kanitSeviyesi, "kanıt kademesi değişti");
    assert.equal(sonra?.urunId, once?.urunId, "bağlı ürün değişti");
  });

  test("eski ad denetim izinde kalıyor", async () => {
    // ⚠️ Ü75'te ad denetim ayrıntısından çıkarılmıştı ("ad zaten satırda
    // duruyor"). Ad DEĞİŞİKLİĞİNDE o gerekçe geçmiyor: eski ad başka
    // hiçbir yerde kalmıyor. Kötüye kullanım ancak burada izlenebilir.
    const iz = await withCafe(kafeA, (db) =>
      db.all<{ detail: { oncekiBaslik?: string; yeniBaslik?: string } }>(
        `SELECT detail FROM audit_log
          WHERE action = 'reward.rename' AND target_id = $1
          ORDER BY created_at`,
        [odulId],
      ),
    );
    assert.ok(iz.length >= 1, "ad değişikliği kayda geçmedi");
    assert.equal(iz[0].detail.oncekiBaslik, "TEST ize amreicano");
    assert.equal(iz[0].detail.yeniBaslik, "TEST Ice Americano");
  });

  test("aynı adı ikinci kez göndermek reddediliyor", async () => {
    const s = await katalog.adDegistir({
      cafeId: kafeA,
      odulId,
      baslik: "TEST Ice Americano Büyük",
      aktorId: yoneticiA,
    });
    assert.equal(s.ok, false);
  });

  test("çok kısa ad reddediliyor", async () => {
    const s = await katalog.adDegistir({ cafeId: kafeA, odulId, baslik: "a", aktorId: yoneticiA });
    assert.equal(s.ok, false);
  });

  test("ürün adı düzeltiliyor", async () => {
    const s = await urun.adDegistir({
      cafeId: kafeA,
      urunId: yaziHataliUrun,
      ad: "TEST Ice Americano ürün",
      aktorId: yoneticiA,
    });
    assert.ok(s.ok, s.ok === false ? s.hata : "");

    const liste = await urun.listele(kafeA);
    assert.equal(liste.find((u) => u.id === yaziHataliUrun)?.ad, "TEST Ice Americano ürün");
  });

  test("var olan başka bir ürünün adına çevrilemiyor", async () => {
    // `ekle`'deki tekillik kuralı düzeltmede de geçerli olmalı; yoksa
    // menüde aynı isimde iki ürün oluşur ve kampanya hangisini seçtiğini
    // kimse ayırt edemez.
    const s = await urun.adDegistir({
      cafeId: kafeA,
      urunId: yaziHataliUrun,
      ad: komsuAd,
      aktorId: yoneticiA,
    });
    assert.equal(s.ok, false);
  });

  test("başka kafenin ödülü düzeltilemiyor", async () => {
    // Değişmez kural #3: cafe_id oturumdan geliyor. RLS bağlamı yabancı
    // satırı zaten görmüyor.
    const s = await katalog.adDegistir({
      cafeId: kafeB,
      odulId,
      baslik: "TEST Sızma",
      aktorId: yoneticiA,
    });
    assert.equal(s.ok, false);

    const hala = (await katalog.listele(kafeA)).find((o) => o.id === odulId);
    assert.equal(hala?.baslik, "TEST Ice Americano Büyük", "yabancı kafe adı değiştirdi");
  });
});

/* ═══════════════════════════════════════════════════════════
   Çok şube ve panel kabuğu (Ü101)
   ═══════════════════════════════════════════════════════════ */

describe("çok şube (Ü101)", () => {
  let ikinciStaff = "";
  let bizimEklediğimiz = false;

  before(async () => {
    // Kafe A yöneticisinin telefonunu Kafe B'ye de yönetici olarak ekle.
    const a = await withBypass("test: yöneticinin telefonu", (db) =>
      db.one<{ phone_index: Buffer | null; phone_enc: Buffer | null; pin_hash: string }>(
        `SELECT phone_index, phone_enc, pin_hash FROM staff WHERE id = $1`,
        [yoneticiA],
      ),
    );
    assert.ok(a?.phone_index, "test kurulumu: yöneticinin telefonu yok");

    /**
     * ⚠️ Satır zaten varsa yeniden kullanılıyor, ikinci kez eklenmiyor.
     *
     * İlk hâli körlemesine INSERT ediyordu ve demo verisinde aynı numara
     * Kafe B'ye elle eklenmiş olduğu için `staff_kafe_phone_idx` çakıştı:
     * test, sınadığı şeyle ilgisi olmayan bir sebeple açılışta ölüyordu.
     * Testin kurulumu, veritabanında ne bulacağına dair varsayım
     * yapmamalı.
     */
    const mevcut = await withBypass("test: kafe B'de var mı", (db) =>
      db.one<{ id: string }>(
        `SELECT id FROM staff WHERE cafe_id = $1 AND phone_index = $2`,
        [kafeB, a.phone_index],
      ),
    );

    if (mevcut) {
      ikinciStaff = mevcut.id;
      bizimEklediğimiz = false;
    } else {
      ikinciStaff = `stf_test_sube_${randomInt(100000)}`;
      bizimEklediğimiz = true;
      await yoneticiSorgu(
        `INSERT INTO staff (id, cafe_id, name_enc, pin_hash, role, phone_index, phone_enc)
         VALUES ($1, $2, $3, $4, 'manager', $5, $6)`,
        [
          ikinciStaff,
          kafeB,
          encryptPII("TEST Sube Yoneticisi"),
          a.pin_hash,
          a.phone_index,
          a.phone_enc,
        ],
      );
    }
  });

  after(async () => {
    // Bulduğumuz satır bizim değilse dokunmuyoruz.
    if (bizimEklediğimiz) await yoneticiSorgu(`DELETE FROM staff WHERE id = $1`, [ikinciStaff]);
  });

  test("aynı telefon iki şubede yönetici olabiliyor", async () => {
    // ⚠️ Ü101'den önce şema bunu engelliyordu: `staff_phone_idx` global
    // tekildi. Tekillik artık kafe başına.
    const liste = await cafe.subeler(yoneticiA);
    assert.ok(liste.length >= 2, `iki şube bekleniyordu, ${liste.length} geldi`);
    assert.ok(liste.some((x) => x.cafeId === kafeA));
    assert.ok(liste.some((x) => x.cafeId === kafeB));
  });

  test("aynı kafede aynı telefon iki kez olamıyor", async () => {
    // Tekillik gevşedi ama kaybolmadı.
    await assert.rejects(
      yoneticiSorgu(
        `INSERT INTO staff (id, cafe_id, name_enc, pin_hash, role, phone_index, phone_enc)
         SELECT $1, cafe_id, $3, pin_hash, 'manager', phone_index, phone_enc
           FROM staff WHERE id = $2`,
        [`stf_test_kopya_${randomInt(100000)}`, ikinciStaff, encryptPII("TEST Kopya")],
      ),
      "aynı kafede ikinci kez eklenebildi",
    );
  });

  test("🔴 yetkisi olmayan şubeye geçilemiyor", async () => {
    // Değişmez kural #3: cafe_id oturumdan gelir. Şube değiştirme isteği
    // istemciden geliyor ve doğrulanmadan oturuma yazılamaz — yazılsaydı
    // yönetici, formdaki kimliği değiştirip başka işletmenin paneline
    // girerdi.
    const yabanci = await withBypass("test: yabancı kafe", (db) =>
      db.one<{ id: string }>(
        `SELECT id FROM cafes WHERE status = 'approved' AND id <> $1 AND id <> $2 LIMIT 1`,
        [kafeA, kafeB],
      ),
    );
    assert.ok(yabanci, "test kurulumu: üçüncü kafe yok");

    assert.equal(
      await cafe.subeyeGecebilirMi(yoneticiA, yabanci.id),
      null,
      "yetkisi olmayan şubeye geçiş kabul edildi",
    );
  });

  test("yetkili olduğu şubeye geçiş o şubenin personel kaydını veriyor", async () => {
    // ⚠️ Yalnızca `cafeId` değişse yetmezdi: her şubede ayrı personel
    // satırı var ve denetim izi doğru satıra bağlanmalı.
    const hedef = await cafe.subeyeGecebilirMi(yoneticiA, kafeB);
    assert.ok(hedef, "kendi şubesine geçemedi");
    assert.equal(hedef.cafeId, kafeB);
    assert.equal(hedef.staffId, ikinciStaff, "eski şubenin personel kaydı taşındı");
  });

  test("giriş çoğul kafe döndürüyor, rastgele seçmiyor", async () => {
    // Önceki sürüm `db.one` kullanıyordu — yani rows[0]. İki şubeli sahip
    // sıralaması belirsiz bir sorgudan gelen rastgele bir şubeye düşerdi.
    const telefon = await withBypass("test: telefon", (db) =>
      db.one<{ phone_enc: Buffer }>(`SELECT phone_enc FROM staff WHERE id = $1`, [yoneticiA]),
    );
    assert.ok(telefon);
    const liste = await cafe.yoneticiKafeleri(decryptPII(telefon.phone_enc));
    assert.ok(liste.length >= 2, "giriş yalnızca bir kafe gördü");
  });
});

describe("panel durumu ve uyarıları (Ü101)", () => {
  test("kurulum eksikse engel uyarısı çıkıyor", async () => {
    await yoneticiSorgu(`UPDATE cafes SET lat = NULL, lng = NULL WHERE id = $1`, [kafeA]);
    try {
      const d = await panelDurum.panelDurumu(kafeA);
      const konum = d.uyarilar.find((u) => u.baslik.includes("konum"));
      assert.ok(konum, "konumsuz kafede uyarı yok");
      assert.equal(konum.onem, "engel");
      assert.ok(d.bekleyen > 0, "çan rozeti boş");
      assert.equal(d.iyiMi, false);
    } finally {
      await yoneticiSorgu(`UPDATE cafes SET lat = $2, lng = $3 WHERE id = $1`, [
        kafeA,
        41.0369,
        28.9838,
      ]);
    }
  });

  test("bilgi uyarısı çan rozetini şişirmiyor", async () => {
    // ⚠️ Her bilgi satırı rozeti şişirseydi çan sürekli dolu görünür ve
    // işletmeci bakmayı bırakırdı. Rozet "bir şey yapman gerekiyor" demeli.
    const d = await panelDurum.panelDurumu(kafeA);
    const bilgiler = d.uyarilar.filter((u) => u.onem === "bilgi").length;
    assert.equal(
      d.bekleyen,
      d.uyarilar.length - bilgiler,
      "bilgi satırları rozete sayıldı",
    );
  });

  test("öneri dayanaksız üretilmiyor", async () => {
    // Her öneri elimizdeki bir sayıya dayanmalı; dayanak yoksa öneri de yok.
    const d = await panelDurum.panelDurumu(kafeA);
    for (const o of d.oneriler) {
      assert.ok(/\d/.test(o.metin), `öneride sayı yok: ${o.metin}`);
    }
  });
});

describe("ürün ve ödül kataloğu", () => {
  test("ürün eklenir ve denetim izine düşer", async () => {
    const sonuc = await urun.ekle({
      cafeId: kafeA,
      ad: "TEST Filtre Kahve",
      fiyatKurus: 4_500,
      aktorId: yoneticiA,
    });
    assert.ok(sonuc.ok, sonuc.ok === false ? sonuc.hata : "");
    urunA = sonuc.urun.id;

    const iz = await withCafe(kafeA, (db) =>
      db.all(`SELECT 1 FROM audit_log WHERE action = 'product.create' AND target_id = $1`, [urunA]),
    );
    assert.equal(iz.length, 1);
  });

  test("aynı isimde ikinci ürün reddedilir", async () => {
    const sonuc = await urun.ekle({
      cafeId: kafeA,
      ad: "test filtre kahve",
      fiyatKurus: 5_000,
      aktorId: yoneticiA,
    });
    assert.equal(sonuc.ok, false);
  });

  /**
   * ⚠️ Bantlar Ü52 ile kaydı. Eskiden 1-15 → K2, 16-50 → K3'tü. Ödül
   * tabanı 25 TL'ye çıkınca HER ödül K3 oldu ve çarkın ilk karekod akışı
   * (oyuncu henüz K2'de) hiçbir zaman ödül veremez hâle geldi. İlke aynı
   * kaldı — büyük ödül daha güçlü kanıt — kademeler yeni aralığa taşındı.
   */
  test("kanıt seviyesi tutardan hesaplanır — E6", () => {
    assert.equal(katalog.kanitSeviyesi(25_00), 2, "taban ödül konumla alınabilmeli");
    assert.equal(katalog.kanitSeviyesi(35_00), 2);
    assert.equal(katalog.kanitSeviyesi(40_00), 3, "üst yarı masada beş dakika istemeli");
    assert.equal(katalog.kanitSeviyesi(50_00), 3);
    assert.equal(katalog.kanitSeviyesi(51_00), 4, "aralık dışı hâlâ K4");
  });

  test("ödül değeri 25-50 TL arası ve 5'er artışlı olmalı — Ü52", async () => {
    for (const gecersiz of [20_00, 27_50, 55_00, 0]) {
      const s = await katalog.ekle({
        cafeId: kafeA,
        tip: "amount",
        baslik: `TEST gecersiz ${gecersiz}`,
        maliyetKurus: gecersiz,
        puanFiyati: 0,
        anlik: true,
        aktorId: yoneticiA,
      });
      assert.equal(s.ok, false, `${gecersiz / 100} TL kabul edildi`);
    }

    // Sınırdaki iki değer kabul edilmeli.
    for (const gecerli of [25_00, 50_00]) {
      const s = await katalog.ekle({
        cafeId: kafeA,
        tip: "amount",
        baslik: `TEST gecerli ${gecerli}`,
        maliyetKurus: gecerli,
        puanFiyati: 0,
        anlik: true,
        aktorId: yoneticiA,
      });
      assert.ok(s.ok, s.ok === false ? s.hata : "");
    }
  });

  test("ürün ödülü eklenir, kanıt seviyesi otomatik", async () => {
    const sonuc = await katalog.ekle({
      cafeId: kafeA,
      tip: "product",
      baslik: "TEST Ücretsiz kahve",
      maliyetKurus: 4_500,
      puanFiyati: 6_000,
      anlik: false,
      urunId: urunA,
      aktorId: yoneticiA,
    });
    assert.ok(sonuc.ok, sonuc.ok === false ? sonuc.hata : "");

    const liste = await katalog.listele(kafeA);
    const eklenen = liste.find((x) => x.id === (sonuc.ok ? sonuc.id : ""));
    assert.ok(eklenen);
    assert.equal(eklenen.kanitSeviyesi, 3, "45 TL ödül K3 olmalı");
    assert.equal(eklenen.yuzde, null);
  });

  test("tavansız yüzdeli ödül reddedilir (Ü17)", async () => {
    const sonuc = await katalog.ekle({
      cafeId: kafeA,
      tip: "percent",
      baslik: "TEST Tavansız",
      maliyetKurus: 0,
      yuzde: 20,
      puanFiyati: 3_000,
      anlik: false,
      aktorId: yoneticiA,
    });
    // Ü52 sonrası mesaj değer kuralından geliyor: sıfır zaten geçerli bir
    // basamak değil. Reddin sebebi değişti, reddin kendisi değişmedi.
    assert.equal(sonuc.ok, false);
    assert.match(sonuc.ok === false ? sonuc.hata : "", /25|50|artış/i);
  });

  test("yüzdesiz yüzdeli ödül reddedilir", async () => {
    const sonuc = await katalog.ekle({
      cafeId: kafeA,
      tip: "percent",
      baslik: "TEST Yüzdesiz",
      maliyetKurus: 40_00,
      puanFiyati: 3_000,
      anlik: false,
      aktorId: yoneticiA,
    });
    assert.equal(sonuc.ok, false);
  });

  test("veritabanı yarım tanımlı ödülü reddeder", async () => {
    await assert.rejects(
      withBypass("test: tutarsız ödül", (db) =>
        db.query(
          `INSERT INTO rewards (id, cafe_id, kind, reward_type, title, points_price, cost_kurus, percent)
           VALUES ('rwd_test_bozuk', $1, 'instant', 'percent', 'TEST bozuk', 0, 5000, NULL)`,
          [kafeA],
        ),
      ),
      /odul_tipi_tutarli|violates check constraint/i,
    );
  });

  test("anlık ödül puan istemez — E2", async () => {
    const sonuc = await katalog.ekle({
      cafeId: kafeA,
      tip: "product",
      baslik: "TEST Anlık espresso",
      maliyetKurus: 25_00,
      puanFiyati: 999,
      anlik: true,
      aktorId: yoneticiA,
    });
    assert.ok(sonuc.ok);

    const liste = await katalog.listele(kafeA);
    const eklenen = liste.find((x) => x.id === (sonuc.ok ? sonuc.id : ""));
    assert.equal(eklenen?.puanFiyati, 0, "anlık ödüle puan fiyatı yazıldı");
  });
});

/* ═══════════════════════════════════════════════════════════
   5 · Kampanya — üç sınır da zorunlu
   ═══════════════════════════════════════════════════════════ */

describe("yüzde kampanyası (Ü17, Ö4)", () => {
  test("geçerli kampanya taslak olarak açılır", async () => {
    const sonuc = await kampanya.olustur({
      cafeId: kafeA,
      urunId: urunA,
      yuzde: 20,
      tavanKurus: 900,
      gunlukLimit: 20,
      gunSayisi: 7,
      aktorId: yoneticiA,
    });
    assert.ok(sonuc.ok, sonuc.ok === false ? sonuc.hata : "");

    const liste = await kampanya.listele(kafeA);
    const k = liste.find((x) => x.id === (sonuc.ok ? sonuc.id : ""));
    assert.equal(k?.durum, "draft", "kampanya doğrudan yayına alındı");
  });

  test("tavansız kampanya reddedilir", async () => {
    const sonuc = await kampanya.olustur({
      cafeId: kafeA,
      urunId: urunA,
      yuzde: 20,
      tavanKurus: 0,
      gunlukLimit: 20,
      gunSayisi: 7,
      aktorId: yoneticiA,
    });
    assert.equal(sonuc.ok, false);
    assert.match(sonuc.ok === false ? sonuc.hata : "", /tavan/i);
  });

  test("limitsiz kampanya reddedilir", async () => {
    const sonuc = await kampanya.olustur({
      cafeId: kafeA,
      urunId: urunA,
      yuzde: 20,
      tavanKurus: 900,
      gunlukLimit: 0,
      gunSayisi: 7,
      aktorId: yoneticiA,
    });
    assert.equal(sonuc.ok, false);
  });

  test("süresiz kampanya reddedilir", async () => {
    for (const gunSayisi of [0, 365]) {
      const sonuc = await kampanya.olustur({
        cafeId: kafeA,
        urunId: urunA,
        yuzde: 20,
        tavanKurus: 900,
        gunlukLimit: 20,
        gunSayisi,
        aktorId: yoneticiA,
      });
      assert.equal(sonuc.ok, false, `${gunSayisi} gün kabul edildi`);
    }
  });

  test("ürün fiyatının üstünde tavan reddedilir", async () => {
    // 45 TL ürün, %20 → en fazla 9 TL. 50 TL tavan anlamsız.
    const sonuc = await kampanya.olustur({
      cafeId: kafeA,
      urunId: urunA,
      yuzde: 20,
      tavanKurus: 5_000,
      gunlukLimit: 20,
      gunSayisi: 7,
      aktorId: yoneticiA,
    });
    assert.equal(sonuc.ok, false);
  });

  test("veritabanı tavansız kampanyayı reddeder", async () => {
    await assert.rejects(
      withBypass("test: tavansız kampanya", (db) =>
        db.query(
          `INSERT INTO percentage_campaigns
             (id, cafe_id, product_id, percent, daily_limit, starts_at, ends_at, created_by)
           VALUES ('cmp_test_tavansiz', $1, $2, 20, 5, now(), now() + interval '1 day', $3)`,
          [kafeA, urunA, yoneticiA],
        ),
      ),
      /max_discount_kurus|null value/i,
    );
  });

  test("yayına alma ve durdurma denetim izine düşer", async () => {
    const liste = await kampanya.listele(kafeA);
    const taslak = liste.find((k) => k.durum === "draft");
    assert.ok(taslak, "taslak kampanya yok");

    await kampanya.durumDegistir({
      cafeId: kafeA,
      kampanyaId: taslak.id,
      yeniDurum: "active",
      aktorId: yoneticiA,
    });

    const iz = await withCafe(kafeA, (db) =>
      db.all(`SELECT 1 FROM audit_log WHERE action = 'campaign.publish' AND target_id = $1`, [
        taslak.id,
      ]),
    );
    assert.equal(iz.length, 1);
  });

  test("bitmiş kampanya yeniden başlatılamaz", async () => {
    const liste = await kampanya.listele(kafeA);
    const aktif = liste.find((k) => k.durum === "active");
    assert.ok(aktif);

    await kampanya.durumDegistir({
      cafeId: kafeA,
      kampanyaId: aktif.id,
      yeniDurum: "ended",
      aktorId: yoneticiA,
    });

    const geri = await kampanya.durumDegistir({
      cafeId: kafeA,
      kampanyaId: aktif.id,
      yeniDurum: "active",
      aktorId: yoneticiA,
    });
    assert.equal(geri.ok, false);
  });
});

/* ═══════════════════════════════════════════════════════════
   6 · Kiracı izolasyonu — G12
   ═══════════════════════════════════════════════════════════ */

describe("başka kafenin verisi düzenlenemez (G12)", () => {
  test("kafe B, kafe A'nın ürününü kapatamaz", async () => {
    const ok = await urun.durumDegistir({
      cafeId: kafeB,
      urunId: urunA,
      aktif: false,
      aktorId: yoneticiA,
    });
    assert.equal(ok, false, "başka kafenin ürünü değiştirildi");

    const liste = await urun.listele(kafeA);
    assert.equal(liste.find((u) => u.id === urunA)?.aktif, true);
  });

  test("kafe B, kafe A'nın ürünlerini göremez", async () => {
    const liste = await urun.listele(kafeB);
    assert.equal(liste.find((u) => u.id === urunA), undefined);
  });

  test("kafe B, kafe A'nın kataloğunu göremez", async () => {
    const liste = await katalog.listele(kafeB);
    assert.ok(
      liste.every((o) => !o.baslik.startsWith("TEST ")),
      "kafe A'nın ödülleri kafe B'de görünüyor",
    );
  });

  test("kafe B, kafe A'nın kampanyalarını göremez", async () => {
    const liste = await kampanya.listele(kafeB);
    assert.ok(
      liste.every((k) => !k.urunAdi.startsWith("TEST ")),
      "kafe A'nın kampanyaları kafe B'de görünüyor",
    );
  });

  test("kafe B, kafe A'nın ürünüyle kampanya açamaz", async () => {
    const sonuc = await kampanya.olustur({
      cafeId: kafeB,
      urunId: urunA,
      yuzde: 20,
      tavanKurus: 900,
      gunlukLimit: 5,
      gunSayisi: 7,
      aktorId: yoneticiA,
    });
    assert.equal(sonuc.ok, false, "başka kafenin ürünüyle kampanya açıldı");
  });

  test("kafe B, kafe A'nın bütçe dönemini göremez", async () => {
    // İddia "kafe B'nin dönemi yok" DEĞİL — kupon testleri kafe B'de kendi
    // dönemini kuruyor ve test dosyaları paralel koşuyor. Asıl mesele
    // kafe B'nin **kafe A'nın** dönemini görmemesi.
    const a = await butce.durum(kafeA, bugun);
    const b = await butce.durum(kafeB, bugun);
    assert.ok(a.donem, "kafe A'nın dönemi kurulmamış");
    assert.notEqual(b.donem?.id, a.donem.id, "kafe B, kafe A'nın dönemini gördü");
  });
});

/* ═══════════════════════════════════════════════════════════
   Kafe konumu — kurulumun ön koşulu
   ═══════════════════════════════════════════════════════════

   Gerçekleşen arıza: koordinatı yalnızca tohum betiği yazıyordu, panelde
   alanı yoktu. Gerçek başvuru akışından geçmiş ONAYLI bir kafede sonucu
   şuydu — kurulum tamam, karekodlar masada ve hiçbir oyuncu hiçbir şey
   kazanamıyor, çünkü K2 hiç doğrulanamıyor.
   ═══════════════════════════════════════════════════════════ */

describe("kafe konumu", () => {
  test("konum kaydedilebiliyor ve okunabiliyor", async () => {
    const sonuc = await cafe.konumBelirle({
      cafeId: kafeA,
      lat: 41.0369,
      lng: 28.9838,
      aktorId: yoneticiA,
    });
    assert.equal(sonuc.ok, true);

    const k = await cafe.konumVarMi(kafeA);
    assert.equal(k.var, true);
    assert.ok(Math.abs((k.lat ?? 0) - 41.0369) < 0.0001);
  });

  test("konum belirlemek denetim izine düşüyor", async () => {
    await cafe.konumBelirle({ cafeId: kafeA, lat: 41.04, lng: 28.98, aktorId: yoneticiA });

    const iz = await withCafe(kafeA, (db) =>
      db.all(`SELECT 1 FROM audit_log WHERE action = 'cafe.location'`),
    );
    assert.ok(iz.length >= 1, "konum değişikliği kayda geçmedi");
  });

  test("geçersiz aralık reddediliyor", async () => {
    const s = await cafe.konumBelirle({
      cafeId: kafeA,
      lat: 91,
      lng: 28.98,
      aktorId: yoneticiA,
    });
    assert.equal(s.ok, false);
  });

  test("0,0 reddediliyor — 'konum alınamadı' hâlinin sessiz çıktısı", async () => {
    // Kaydedilseydi kafe Gine Körfezi'nde görünür ve K2 yine hiç
    // doğrulanmazdı; hatayı sessizce kalıcılaştırmak en kötüsü.
    const s = await cafe.konumBelirle({ cafeId: kafeA, lat: 0, lng: 0, aktorId: yoneticiA });
    assert.equal(s.ok, false);
  });

  test("konumu olmayan kafede doğrulama açıkça 'kafe konumu yok' diyor", async () => {
    // Oyuncuya "konum doğrulanamadı" demek onu telefonuyla uğraştırırdı;
    // eksik olan kafenin kurulumu.
    await yoneticiSorgu(`UPDATE cafes SET lat = NULL, lng = NULL WHERE id = $1`, [kafeB]);

    const oyuncu = await kaydet({
      telefon: normalizePhone(`0546${String(4_100_000 + randomInt(800_000)).slice(-7)}`),
      eposta: benzersizEposta(),
      ad: "Konumsuz",
      soyad: "Test",
      dogumYili: 1990,
      pazarlamaIzni: false,
    });
    const masaB = await withBypass("test: kafe b masası", (db) =>
      db.one<{ id: string }>(
        `SELECT id FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1`,
        [kafeB],
      ),
    );
    await masa.ac({ cafeId: kafeB, tableId: masaB!.id, playerId: oyuncu.oyuncu.id });

    const s = await masa.konumDogrula(oyuncu.oyuncu.id, 41.0369, 28.9838);
    assert.equal(s.durum, "kafe_konumu_yok");

    await yoneticiSorgu(`DELETE FROM table_sessions WHERE player_id = $1`, [oyuncu.oyuncu.id]);
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [oyuncu.oyuncu.id]);
    await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [oyuncu.oyuncu.id]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [oyuncu.oyuncu.id]);
  });
});

/* ═══════════════════════════════════════════════════════════
   D11 · Masa karekodları
   ═══════════════════════════════════════════════════════════

   Masalar yalnızca tohum betiğiyle üretiliyordu: gerçek bir başvuru
   onaylanıp panel açıldığında kafenin hiç masası olmuyordu — yani
   yapıştıracak karekodu da yok ve ürünün giriş kapısı hiç açılmıyordu.
   ═══════════════════════════════════════════════════════════ */

describe("kafe karekodu (Ü127)", () => {
  /**
   * D11'in masa testleri BURADAN KALDIRILDI — masa kavramı Ü127 ile
   * kalktı. Ekleme, adlandırma, tür ve "aynı ad" çakışması diye bir şey
   * yok: kafenin tek karekodu var ve kafe onu adlandırmıyor.
   *
   * D11'in asıl derdi duruyor ve aşağıda sınanıyor: **onaylanan kafenin
   * yapıştıracak bir karekodu olmalı.** O zaman masalar yalnızca tohum
   * betiğiyle üretiliyordu ve gerçek bir başvuru onaylandığında kafenin
   * hiç karekodu olmuyordu — ürünün giriş kapısı hiç açılmıyordu.
   */
  test("🔴 karekodu olmayan kafe kendiliğinden karekod alıyor", async () => {
    // Göç 0038'den önce onaylanmış ve hiç karekod eklememiş kafeler var;
    // panel "önce karekod ekle" dememeli, üretmeli.
    await yoneticiSorgu(`UPDATE cafe_tables SET active = false WHERE cafe_id = $1`, [kafeA]);

    const k = await masaYonetim.kafeKarekodu(kafeA);
    assert.match(k.kod, /^[0-9a-f]{16}$/, "basılı kod beklenen biçimde değil");

    const cozum = await qr.masaCoz(k.kod);
    assert.equal(cozum?.tableId, k.id, "üretilen karekod çözülemiyor");
    assert.equal(cozum?.cafeId, kafeA, "karekod başka kafeye çözülüyor");
  });

  test("karekod okutulunca kafeye çözülüyor ve tarama kaydı düşüyor", async () => {
    const k = await masaYonetim.kafeKarekodu(kafeA);
    const cozum = await qr.masaCoz(k.kod);
    assert.ok(cozum, "kafe karekodu çözülemedi");

    await qr.taramaKaydet(cozum.cafeId, cozum.tableId);
    const kayit = await withBypass("test: tarama kaydı", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*) AS n FROM qr_tokens WHERE cafe_id = $1 AND table_id = $2`,
        [kafeA, cozum.tableId],
      ),
    );
    assert.ok(Number(kayit!.n) > 0, "tarama defterine yazılmadı");
  });

  test("🔴 başka kafenin karekodu bu kafeye çözülmüyor (G12)", async () => {
    const bKarekod = await masaYonetim.kafeKarekodu(kafeB);
    const cozum = await qr.masaCoz(bKarekod.kod);
    assert.equal(cozum?.cafeId, kafeB, "B'nin karekodu B'ye çözülmeli");
    assert.notEqual(cozum?.cafeId, kafeA, "kafeler arası karekod sızıntısı");
  });
});
