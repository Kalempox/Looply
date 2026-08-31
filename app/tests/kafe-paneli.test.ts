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
import * as masa from "@/domain/masa";
import * as masaYonetim from "@/domain/masa-yonetim";
import * as qr from "@/domain/qr";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import { randomInt } from "node:crypto";
import { pazartesi, gunEkle, isGunu } from "@/lib/tarih";
import { yoneticiSorgu } from "./_yardim";

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

  test("tam hafta tabanı 1.500 TL", () => {
    const a = butce.donemAraligi("2026-08-26");
    assert.equal(a.gunSayisi, 7);
    assert.equal(butce.tabanKurus(a.gunSayisi), butce.HAFTALIK_TABAN_KURUS);
  });

  test("hafta ortasında katılan kafenin ilk dönemi kısa ve tabanı orantılı", () => {
    // Çarşamba katıldı: 26 Ağustos → 31 Ağustos = 5 gün.
    const a = butce.donemAraligi("2026-08-26", "2026-08-26");
    assert.equal(a.baslangic, "2026-08-26");
    assert.equal(a.gunSayisi, 5);

    const taban = butce.tabanKurus(5);
    assert.ok(taban < butce.HAFTALIK_TABAN_KURUS, "kısa dönemde taban düşmedi");
    assert.equal(taban, Math.ceil((150_000 * 5) / 7));
  });

  test("katılım günü haftanın başındaysa dönem yine pazartesi başlar", () => {
    const a = butce.donemAraligi("2026-08-28", "2026-08-10");
    assert.equal(a.baslangic, "2026-08-24");
    assert.equal(a.gunSayisi, 7);
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Bütçe alt sınırı
   ═══════════════════════════════════════════════════════════ */

describe("bütçe alt sınırın altına inemez (Ü6, Ü25)", () => {
  test("tam haftada 1.500 TL'nin altı reddedilir", async () => {
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

  test("veritabanı da reddeder — orantılı taban kısıtı", async () => {
    // Tam haftalık dönem için 1.000 TL: kod atlansa bile şema durdurmalı.
    const hafta = pazartesi(bugun);
    await assert.rejects(
      withBypass("test: düşük taahhüt", (db) =>
        db.query(
          `INSERT INTO budget_periods (id, cafe_id, period_start, period_end, committed_kurus)
           VALUES ('bdg_test_dusuk', $1, $2, $3, 100000)`,
          [kafeB, hafta, gunEkle(hafta, 7)],
        ),
      ),
      /butce_tabani_orantili|violates check constraint/i,
    );
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Bütçe muhasebesi — E10, E11
   ═══════════════════════════════════════════════════════════ */

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
      butce.rezerveEt(db, { cafeId: kafeA, kurus: 50_000, not: "test", gun: bugun }),
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

  test("kanıt seviyesi tutardan hesaplanır — E6", () => {
    assert.equal(katalog.kanitSeviyesi(10_00), 2);
    assert.equal(katalog.kanitSeviyesi(15_00), 2);
    assert.equal(katalog.kanitSeviyesi(16_00), 3);
    assert.equal(katalog.kanitSeviyesi(50_00), 3);
    assert.equal(katalog.kanitSeviyesi(51_00), 4);
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
    assert.equal(sonuc.ok, false);
    assert.match(sonuc.ok === false ? sonuc.hata : "", /tavan/i);
  });

  test("yüzdesiz yüzdeli ödül reddedilir", async () => {
    const sonuc = await katalog.ekle({
      cafeId: kafeA,
      tip: "percent",
      baslik: "TEST Yüzdesiz",
      maliyetKurus: 10_000,
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
           VALUES ('rwd_test_bozuk', $1, 'catalog', 'percent', 'TEST bozuk', 100, 5000, NULL)`,
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
      maliyetKurus: 1_500,
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

describe("masa karekodları (D11)", () => {
  test("masa eklenebiliyor ve karekodu çözülüyor", async () => {
    const ad = `TEST Masa ${randomInt(100000)}`;
    const s = await masaYonetim.ekle({ cafeId: kafeA, ad, aktorId: yoneticiA });
    assert.ok(s.ok, s.ok === false ? s.hata : "");

    const liste = await masaYonetim.listele(kafeA);
    const yeni = liste.find((m) => m.ad === ad);
    assert.ok(yeni, "eklenen masa listede yok");
    assert.match(yeni.kod, /^[0-9a-f]{16}$/, "basılı kod beklenen biçimde değil");

    const cozum = await qr.masaCoz(yeni.kod);
    assert.equal(cozum?.tableId, yeni.id, "basılı kod masaya çözülmedi");

    await yoneticiSorgu(`DELETE FROM cafe_tables WHERE id = $1`, [yeni.id]);
  });

  test("iki masanın karekodu farklı", async () => {
    const a = `TEST A ${randomInt(100000)}`;
    const b = `TEST B ${randomInt(100000)}`;
    await masaYonetim.ekle({ cafeId: kafeA, ad: a, aktorId: yoneticiA });
    await masaYonetim.ekle({ cafeId: kafeA, ad: b, aktorId: yoneticiA });

    const liste = await masaYonetim.listele(kafeA);
    const ma = liste.find((m) => m.ad === a)!;
    const mb = liste.find((m) => m.ad === b)!;
    assert.notEqual(ma.kod, mb.kod, "iki masa aynı karekodu taşıyor");

    await yoneticiSorgu(`DELETE FROM cafe_tables WHERE id IN ($1,$2)`, [ma.id, mb.id]);
  });

  test("aynı adda ikinci masa reddediliyor", async () => {
    const ad = `TEST Tek ${randomInt(100000)}`;
    await masaYonetim.ekle({ cafeId: kafeA, ad, aktorId: yoneticiA });
    const ikinci = await masaYonetim.ekle({ cafeId: kafeA, ad, aktorId: yoneticiA });
    assert.equal(ikinci.ok, false, "aynı ad iki kez kabul edildi");

    await yoneticiSorgu(`DELETE FROM cafe_tables WHERE cafe_id = $1 AND label = $2`, [kafeA, ad]);
  });

  test("boş ad reddediliyor", async () => {
    const s = await masaYonetim.ekle({ cafeId: kafeA, ad: "   ", aktorId: yoneticiA });
    assert.equal(s.ok, false);
  });

  test("kapatılan masanın karekodu çalışmıyor ama satırı duruyor", async () => {
    // Silmek yerine kapatmak: silinen masanın geçmiş oturumları ve raporları
    // sahipsiz kalırdı.
    const ad = `TEST Kapali ${randomInt(100000)}`;
    const s = await masaYonetim.ekle({ cafeId: kafeA, ad, aktorId: yoneticiA });
    assert.ok(s.ok);
    const kod = (await masaYonetim.listele(kafeA)).find((m) => m.ad === ad)!.kod;

    assert.ok(await qr.masaCoz(kod), "test kurulumu: kod açıkken çözülmüyor");

    await masaYonetim.durumDegistir({
      cafeId: kafeA,
      tableId: s.ok ? s.id : "",
      aktif: false,
      aktorId: yoneticiA,
    });

    assert.equal(await qr.masaCoz(kod), null, "kapalı masanın kodu hâlâ çözülüyor");
    const liste = await masaYonetim.listele(kafeA);
    assert.ok(liste.find((m) => m.ad === ad), "kapatılan masa listeden silindi");

    await yoneticiSorgu(`DELETE FROM cafe_tables WHERE cafe_id = $1 AND label = $2`, [kafeA, ad]);
  });

  test("başka kafenin masası kapatılamıyor (G12)", async () => {
    const masaB = await withBypass("test: kafe b masası", (db) =>
      db.one<{ id: string }>(
        `SELECT id FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1`,
        [kafeB],
      ),
    );

    const s = await masaYonetim.durumDegistir({
      cafeId: kafeA,
      tableId: masaB!.id,
      aktif: false,
      aktorId: yoneticiA,
    });
    assert.equal(s.ok, false, "başka kafenin masası kapatıldı");

    const hala = await withBypass("test: kontrol", (db) =>
      db.one<{ active: boolean }>(`SELECT active FROM cafe_tables WHERE id = $1`, [masaB!.id]),
    );
    assert.equal(hala?.active, true, "başka kafenin masası kapandı");
  });

  test("masa ekleme denetim izine düşüyor", async () => {
    const ad = `TEST Iz ${randomInt(100000)}`;
    const s = await masaYonetim.ekle({ cafeId: kafeA, ad, aktorId: yoneticiA });
    assert.ok(s.ok);

    const iz = await withCafe(kafeA, (db) =>
      db.all(`SELECT 1 FROM audit_log WHERE action = 'table.create' AND target_id = $1`, [
        s.ok ? s.id : "",
      ]),
    );
    assert.equal(iz.length, 1, "masa ekleme kayda geçmedi");

    await yoneticiSorgu(`DELETE FROM cafe_tables WHERE cafe_id = $1 AND label = $2`, [kafeA, ad]);
  });
});
