import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass, withCafe } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as masa from "@/domain/masa";
import * as butce from "@/domain/butce";
import * as katalog from "@/domain/katalog";
import * as kupon from "@/domain/kupon";
import * as ayar from "@/domain/ayar";
import { kuponDetayi } from "@/domain/odul";
import { yazIle as puanYaz } from "@/domain/puan";
import { isGunu } from "@/lib/tarih";
import { yoneticiSorgu } from "./_yardim";

/**
 * FAZ 7 GÜVENLİK KAPISI — kupon ve kasa onayı.
 *
 * Planın en sıkı fazı: para değeri burada gerçek dünyaya çıkıyor.
 *
 *   1. Aynı kupon iki kez onaylanamaz — EŞZAMANLI iki istekte bile
 *   2. Aynı kupon QR'dan ve koddan aynı anda gelirse yalnızca biri geçer
 *   3. Oyuncu kendi kuponunu "kullanıldı" yapamaz
 *   4. Başka kafenin kuponu kabul edilmez
 *   5. Tutar istemciden değil kayıttan düşer
 *   6. Bütçe negatife düşemez
 */

const KAFE_LAT = 41.0369;
const KAFE_LNG = 28.9838;

let kafeA = "";
let kafeB = "";
let masaA = "";
let yoneticiA = "";
let kasiyerA = "";
let oyuncuId = "";

let katalogOdulId = "";
let buyukOdulId = "";
let yuzdeOdulId = "";
let tutarOdulId = "";

const bugun = isGunu();
const TABAN = 3_000_000 + randomInt(5_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0559${String(TABAN + sayac++).slice(-7)}`);

/** Doğrulanmış (K2) masa oturumu — kazanım için şart. */
async function dogrulanmisOturum(playerId: string) {
  await masa.ac({ cafeId: kafeA, tableId: masaA, playerId });
  const s = await masa.konumDogrula(playerId, KAFE_LAT, KAFE_LNG);
  assert.equal(s.durum, "dogrulandi", "test kurulumu: konum doğrulanamadı");
}

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    // Bu dosya kafe-b üzerinde çalışıyor: `oyun-motoru.test.ts` kafe-a'yı
    // kullanıyor ve test dosyaları PARALEL koşuyor. Aynı kafenin bütçesini
    // iki dosyadan eşzamanlı değiştirmek, ikisini de rastgele düşürürdü.
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const t = await db.one<{ id: string }>(
      "SELECT id FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1",
      [a!.id],
    );
    const y = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [a!.id],
    );
    const k = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'cashier' LIMIT 1",
      [a!.id],
    );
    return { a: a?.id, b: b?.id, t: t?.id, y: y?.id, k: k?.id };
  });
  assert.ok(v.a && v.b && v.t && v.y && v.k, "Tohum verisi eksik — önce: npm run db:seed");
  kafeA = v.a;
  kafeB = v.b;
  masaA = v.t;
  yoneticiA = v.y;
  kasiyerA = v.k;

  await yoneticiSorgu(`UPDATE cafes SET lat = $2, lng = $3 WHERE id = $1`, [
    kafeA,
    KAFE_LAT,
    KAFE_LNG,
  ]);
  await yoneticiSorgu(
    `UPDATE platform_config SET value = 'false'::jsonb
      WHERE key IN ('kupon_dagitimi_durduruldu','oyun_durduruldu')`,
  );

  // Bol bütçe: testler bütçe sınırını ayrıca sınıyor.
  const b = await butce.donemBelirle({
    cafeId: kafeA,
    taahhutKurus: 500_000,
    aktorId: yoneticiA,
    gun: bugun,
  });
  assert.ok(b.ok, b.ok === false ? b.hata : "");

  const ekle = async (o: Parameters<typeof katalog.ekle>[0]) => {
    const s = await katalog.ekle(o);
    assert.ok(s.ok, s.ok === false ? s.hata : "");
    return s.ok ? s.id : "";
  };

  // Döngü testi için iki anlık ödül; kimlikleri gerekmiyor.
  await ekle({
    cafeId: kafeA,
    tip: "product",
    baslik: "KTEST Anlık kurabiye",
    maliyetKurus: 1_200,
    puanFiyati: 0,
    anlik: true,
    aktorId: yoneticiA,
  });
  await ekle({
    cafeId: kafeA,
    tip: "product",
    baslik: "KTEST Anlık çay",
    maliyetKurus: 800,
    puanFiyati: 0,
    anlik: true,
    aktorId: yoneticiA,
  });
  katalogOdulId = await ekle({
    cafeId: kafeA,
    tip: "product",
    baslik: "KTEST Küçük kahve",
    maliyetKurus: 1_500,
    puanFiyati: 10,
    anlik: false,
    aktorId: yoneticiA,
  });
  buyukOdulId = await ekle({
    cafeId: kafeA,
    tip: "product",
    baslik: "KTEST Büyük tatlı",
    maliyetKurus: 12_000,
    puanFiyati: 20,
    anlik: false,
    aktorId: yoneticiA,
  });
  tutarOdulId = await ekle({
    cafeId: kafeA,
    tip: "amount",
    baslik: "KTEST 20 TL indirim",
    maliyetKurus: 2_000,
    puanFiyati: 15,
    anlik: false,
    aktorId: yoneticiA,
  });
  yuzdeOdulId = await ekle({
    cafeId: kafeA,
    tip: "percent",
    baslik: "KTEST Yüzde indirim",
    maliyetKurus: 4_000,
    yuzde: 20,
    puanFiyati: 15,
    anlik: false,
    aktorId: yoneticiA,
  });

  oyuncuId = (
    await kaydet({
      telefon: yeniTelefon(),
      ad: "Kupon",
      soyad: "Testi",
      dogumYili: 1990,
      pazarlamaIzni: false,
    })
  ).oyuncu.id;

  await dogrulanmisOturum(oyuncuId);

  // Katalogdan alabilmesi için puan. Günlük tavan 900 (E4) olduğu için test
  // ödüllerinin puan fiyatları bilerek düşük — testler onlarca kupon alıyor.
  await withBypass("test: puan verme", (db) =>
    puanYaz(db, {
      playerId: oyuncuId,
      cafeId: kafeA,
      taban: 900,
      carpan: 1,
      sebep: "test",
      kanitSeviyesi: 2,
    }),
  );
});

after(async () => {
  await yoneticiSorgu(`DELETE FROM coupon_events WHERE cafe_id = ANY($1)`, [[kafeA, kafeB]]);
  await yoneticiSorgu(
    `DELETE FROM coupons WHERE player_id = $1 OR reward_id IN
       (SELECT id FROM rewards WHERE title LIKE 'KTEST %')`,
    [oyuncuId],
  );
  await yoneticiSorgu(`DELETE FROM budget_ledger WHERE cafe_id = $1`, [kafeA]);
  await yoneticiSorgu(`DELETE FROM rewards WHERE title LIKE 'KTEST %'`);
  await yoneticiSorgu(`DELETE FROM points_ledger WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM xp_ledger WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM player_badges WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM play_sessions WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM table_sessions WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [oyuncuId]);
  await closePools();
});

/** Katalogdan bir kupon alır ve kimliğini döner. */
async function kuponAl(odulId: string) {
  const s = await kupon.katalogdanAl({
    playerId: oyuncuId,
    cafeId: kafeA,
    odulId,
    kanitSeviyesi: 4,
  });
  assert.ok(s.ok, s.ok === false ? s.hata : "");
  return s.ok ? s : null!;
}

/* ═══════════════════════════════════════════════════════════
   1 · Kupon üretimi
   ═══════════════════════════════════════════════════════════ */

describe("kupon üretimi", () => {
  test("katalogdan alınan kupon bütçeden rezerve eder", async () => {
    const once = await butce.durum(kafeA, bugun);
    await kuponAl(katalogOdulId);
    const sonra = await butce.durum(kafeA, bugun);

    assert.equal(sonra.rezerveKurus, once.rezerveKurus + 1_500);
    assert.equal(sonra.dagitilabilirKurus, once.dagitilabilirKurus - 1_500);
  });

  test("eşiğin üstündeki ödül 12 saat ertelenir (Ü28)", async () => {
    const s = await kuponAl(buyukOdulId);
    assert.equal(s.ertelendi, true, "büyük ödül hemen aktif oldu");

    const detay = await kuponDetayi(oyuncuId, s.kuponId);
    assert.equal(detay?.durum, "beklemede");

    // 12 saat: takvim gününe değil oyuncunun kendi saatine bağlı. "Yarın
    // 00:00" olsaydı sabah kazanan 15 saat, akşam kazanan 1 saat beklerdi.
    const saat = (detay!.aktiflesme.getTime() - Date.now()) / 3_600_000;
    assert.ok(saat > 11.5 && saat <= 12, `açılma 12 saat sonra olmalıydı (${saat.toFixed(1)} sa)`);
  });

  test("eşiğin altındaki ödül hemen aktif olur", async () => {
    const s = await kuponAl(katalogOdulId);
    assert.equal(s.ertelendi, false);

    const detay = await kuponDetayi(oyuncuId, s.kuponId);
    assert.equal(detay?.durum, "kullanilabilir");
  });

  /**
   * Eşik platform sabiti değil kafenin ayarı: 50 TL bir kafede büyük ödül,
   * başkasında sıradan. E6'nın kanıt kademesi bundan etkilenmiyor — o
   * ayrı bir kural ve `katalog.kanitSeviyesi` içinde duruyor.
   */
  test("kafe eşiği değiştirince erteleme davranışı değişiyor", async () => {
    const varsayilan = await ayar.sayiOku(kafeA, ayar.ANAHTARLAR.ertelemeEsigi);
    assert.equal(varsayilan, 50_00, "varsayılan eşik 50 TL olmalı");

    // Eşiği sıfıra çek: artık küçük ödül de ertelenmeli
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 0,
      aktorId: kasiyerA,
    });
    assert.equal((await kuponAl(katalogOdulId)).ertelendi, true, "eşik 0 iken her ödül ertelenmeli");

    // Eşiği yükselt: artık büyük ödül de ertelenmemeli
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 500_00,
      aktorId: kasiyerA,
    });
    assert.equal((await kuponAl(buyukOdulId)).ertelendi, false, "eşik yüksekken erteleme olmamalı");

    // Kanıt kademesi ayardan ETKİLENMİYOR — platform kuralı
    assert.equal(katalog.kanitSeviyesi(60_00), 4, "51 TL+ hâlâ K4 istemeli");
    assert.equal(katalog.kanitSeviyesi(15_00), 2);

    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 50_00,
      aktorId: kasiyerA,
    });
  });

  test("puan yetmezse kupon çıkmaz", async () => {
    const yeni = (
      await kaydet({
        telefon: yeniTelefon(),
        ad: "Puansiz",
        soyad: "Oyuncu",
        dogumYili: 1990,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;

    const s = await kupon.katalogdanAl({
      playerId: yeni,
      cafeId: kafeA,
      odulId: katalogOdulId,
      kanitSeviyesi: 4,
    });
    assert.equal(s.ok, false);

    const sayim = await withBypass("test: kupon sayımı", (db) =>
      db.one<{ n: string }>(`SELECT count(*) AS n FROM coupons WHERE player_id = $1`, [yeni]),
    );
    assert.equal(Number(sayim?.n), 0, "puansız oyuncuya kupon üretildi");

    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [yeni]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [yeni]);
  });

  test("kanıt seviyesi yetmezse ödül verilmez (E6)", async () => {
    // Büyük tatlı 120 TL → K4 istiyor. K2 ile alınamamalı.
    const s = await kupon.katalogdanAl({
      playerId: oyuncuId,
      cafeId: kafeA,
      odulId: buyukOdulId,
      kanitSeviyesi: 2,
    });
    assert.equal(s.ok, false);
    assert.match(s.ok === false ? s.hata : "", /doğrulama/i);
  });

  test("bütçe yetmezse kupon çıkmaz — E10", async () => {
    const d = await butce.durum(kafeA, bugun);

    // Kalan bütçeyi doldur.
    await withCafe(kafeA, (db) =>
      butce.rezerveEt(db, {
        cafeId: kafeA,
        kurus: d.dagitilabilirKurus,
        not: "test-doldur",
        gun: bugun,
      }),
    );

    const s = await kupon.katalogdanAl({
      playerId: oyuncuId,
      cafeId: kafeA,
      odulId: katalogOdulId,
      kanitSeviyesi: 4,
    });
    assert.equal(s.ok, false, "bütçe dolu iken kupon üretildi");
    assert.match(s.ok === false ? s.hata : "", /bütçe/i);

    const sonra = await butce.durum(kafeA, bugun);
    assert.ok(sonra.dagitilabilirKurus >= 0, "bütçe negatife düştü");

    // Bütçeyi geri aç.
    await yoneticiSorgu(`DELETE FROM budget_ledger WHERE note = 'test-doldur'`);
  });
});

/* ═══════════════════════════════════════════════════════════
   1.5 · Ü27 — anlık ödül döngüsel
   ═══════════════════════════════════════════════════════════ */

describe("anlık ödül döngüsel seçilir (Ü27)", () => {
  test("art arda gelen oyuncular sıradaki ödülü alır, liste başa döner", async () => {
    // Kaç anlık ödül var? Sabit sayı varsaymak kırılgan: tohum verisinde
    // zaten bir anlık ödül vardı ve test iki varsaydığı için düşmüştü.
    const anlikSayisi = await withBypass("test: anlık ödül sayısı", (db) =>
      db
        .one<{ n: string }>(
          `SELECT count(*) AS n FROM rewards WHERE cafe_id = $1 AND kind = 'instant' AND active`,
          [kafeA],
        )
        .then((r) => Number(r?.n ?? 0)),
    );
    assert.ok(anlikSayisi >= 2, "döngüyü sınamak için en az iki anlık ödül gerekli");

    const alinanlar: string[] = [];
    const oyuncular: string[] = [];

    // Liste uzunluğu + 1 oyuncu: sonuncusu başa dönmeli.
    // Aynı oyuncu günde bir kez anlık ödül alabildiği için her tur yeni oyuncu.
    //
    // Kuponlar tur ARASINDA silinmiyor: Ü27'de sıra, dağıtılmış anlık kupon
    // sayısından türüyor. Silinseydi sayaç yerinde sayar ve herkes aynı ödülü
    // alırdı — bu testin ilk hâli tam olarak bu yüzden düşmüştü.
    for (let i = 0; i <= anlikSayisi; i++) {
      const p = (
        await kaydet({
          telefon: yeniTelefon(),
          ad: `Anlik${i}`,
          soyad: "Testi",
          dogumYili: 1990,
          pazarlamaIzni: false,
        })
      ).oyuncu.id;
      oyuncular.push(p);

      const s = await withBypass("test: anlık ödül", (db) =>
        kupon.anlikOdulVer(db, { playerId: p, cafeId: kafeA, kanitSeviyesi: 4 }),
      );
      assert.ok(s?.ok, "anlık ödül verilmedi");
      alinanlar.push(s.baslik);
    }

    // Bir tur boyunca hiçbir ödül tekrar etmemeli, tur bitince başa dönmeli.
    // Rastgele seçim olsaydı bu düzen tutmazdı (E8).
    const tur = alinanlar.slice(0, anlikSayisi);
    assert.equal(new Set(tur).size, anlikSayisi, `tur içinde tekrar var: ${tur.join(", ")}`);
    assert.equal(alinanlar[anlikSayisi], alinanlar[0], "liste başa dönmedi");

    for (const p of oyuncular) {
      await yoneticiSorgu(
        `DELETE FROM coupon_events WHERE coupon_id IN (SELECT id FROM coupons WHERE player_id = $1)`,
        [p],
      );
      await yoneticiSorgu(`DELETE FROM coupons WHERE player_id = $1`, [p]);
      await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [p]);
      await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [p]);
      await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [p]);
    }
  });

  test("aynı oyuncu günde iki anlık ödül alamaz", async () => {
    const p = (
      await kaydet({
        telefon: yeniTelefon(),
        ad: "Tekrar",
        soyad: "Testi",
        dogumYili: 1990,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;

    const ilk = await withBypass("test: anlık ödül", (db) =>
      kupon.anlikOdulVer(db, { playerId: p, cafeId: kafeA, kanitSeviyesi: 4 }),
    );
    assert.ok(ilk?.ok);

    const ikinci = await withBypass("test: ikinci anlık ödül", (db) =>
      kupon.anlikOdulVer(db, { playerId: p, cafeId: kafeA, kanitSeviyesi: 4 }),
    );
    assert.equal(ikinci, null, "aynı gün ikinci anlık ödül verildi");

    await yoneticiSorgu(
      `DELETE FROM coupon_events WHERE coupon_id IN (SELECT id FROM coupons WHERE player_id = $1)`,
      [p],
    );
    await yoneticiSorgu(`DELETE FROM coupons WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [p]);
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · E9 — oyuncu ekranında TL yok
   ═══════════════════════════════════════════════════════════ */

describe("oyuncu kuponu TL değeri taşımaz (E9)", () => {
  test("kupon detayında para alanı yok", async () => {
    const s = await kuponAl(katalogOdulId);
    const detay = await kuponDetayi(oyuncuId, s.kuponId);
    assert.ok(detay);

    for (const alan of Object.keys(detay)) {
      assert.ok(
        !/kurus|tutar|deger|fiyat|price|amount/i.test(alan),
        `kupon detayında para alanı var: ${alan}`,
      );
    }
  });

  test("başkasının kuponu okunamaz", async () => {
    const s = await kuponAl(katalogOdulId);
    const baskasi = await kuponDetayi("oyuncu_baska", s.kuponId);
    assert.equal(baskasi, null);
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Kasiyer çözümlemesi
   ═══════════════════════════════════════════════════════════ */

describe("kasiyer kuponu çözer", () => {
  test("QR jetonu ve 6 haneli kod aynı kuponu açar (Ü19)", async () => {
    const s = await kuponAl(katalogOdulId);
    const detay = await kuponDetayi(oyuncuId, s.kuponId);
    assert.ok(detay);

    const jetonla = await kupon.coz(kafeA, detay.jeton);
    const kodla = await kupon.coz(kafeA, detay.kod);

    assert.ok(jetonla.bulundu && kodla.bulundu);
    assert.equal(jetonla.kuponId, kodla.kuponId, "iki yol farklı kupon açtı");
    assert.equal(jetonla.kuponId, s.kuponId);
  });

  test("kasiyer TL değerini GÖRÜR", async () => {
    const s = await kuponAl(katalogOdulId);
    const g = await kupon.coz(kafeA, s.kod);
    assert.ok(g.bulundu);
    assert.equal(g.tutarKurus, 1_500);
    assert.equal(g.gecerli, true);
  });

  test("başka kafenin kuponu bulunamaz", async () => {
    const s = await kuponAl(katalogOdulId);
    const g = await kupon.coz(kafeB, s.kod);
    assert.equal(g.bulundu, false, "kafe B, kafe A'nın kuponunu gördü");
  });

  test("ertelenmiş kupon geçersiz döner ve sebebi söylenir", async () => {
    const s = await kuponAl(buyukOdulId);
    const g = await kupon.coz(kafeA, s.kod);
    assert.ok(g.bulundu);
    assert.equal(g.gecerli, false);
    assert.match(g.sebep ?? "", /açılıyor/);
  });

  test("kafe kodu, müşterinin anonim kodunu gösterir — ad soyad değil (G1)", async () => {
    const s = await kuponAl(katalogOdulId);
    const g = await kupon.coz(kafeA, s.kod);
    assert.ok(g.bulundu);
    assert.match(g.oyuncuKodu, /^P-/, `anonim kod beklenirken: ${g.oyuncuKodu}`);
  });
});

/* ═══════════════════════════════════════════════════════════
   4 · Onay — atomiklik
   ═══════════════════════════════════════════════════════════ */

describe("onay atomik (Faz 7 güvenlik kapısı)", () => {
  test("onay bütçeden kalıcı düşer", async () => {
    const s = await kuponAl(katalogOdulId);
    const once = await butce.durum(kafeA, bugun);

    const sonuc = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.ok(sonuc.ok, sonuc.ok === false ? sonuc.hata : "");
    assert.equal(sonuc.dusulenKurus, 1_500);

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(sonra.harcananKurus, once.harcananKurus + 1_500);
    assert.equal(sonra.rezerveKurus, once.rezerveKurus - 1_500);
  });

  test("aynı kupon iki kez onaylanamaz", async () => {
    const s = await kuponAl(katalogOdulId);

    const ilk = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.ok(ilk.ok);

    const ikinci = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(ikinci.ok, false, "aynı kupon ikinci kez onaylandı");
  });

  test("EŞZAMANLI iki onay isteğinde yalnızca biri geçer", async () => {
    const s = await kuponAl(katalogOdulId);
    const once = await butce.durum(kafeA, bugun);

    // İki telefon aynı anda okutuyor.
    const [a, b] = await Promise.all([
      kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA }),
      kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA }),
    ]);

    const basarili = [a, b].filter((x) => x.ok).length;
    assert.equal(basarili, 1, `eşzamanlı onayda ${basarili} istek geçti`);

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(
      sonra.harcananKurus,
      once.harcananKurus + 1_500,
      "bütçeden iki kez düşüldü",
    );
  });

  test("aynı kupon QR'dan ve koddan aynı anda gelirse yalnızca biri geçer (Ü19)", async () => {
    const s = await kuponAl(katalogOdulId);
    const detay = await kuponDetayi(oyuncuId, s.kuponId);
    assert.ok(detay);

    // İki farklı yol, aynı kupon.
    const [jetonla, kodla] = await Promise.all([
      kupon.coz(kafeA, detay.jeton).then((g) =>
        g.bulundu
          ? kupon.onayla({ cafeId: kafeA, kuponId: g.kuponId, staffId: kasiyerA })
          : { ok: false as const, hata: "bulunamadı" },
      ),
      kupon.coz(kafeA, detay.kod).then((g) =>
        g.bulundu
          ? kupon.onayla({ cafeId: kafeA, kuponId: g.kuponId, staffId: kasiyerA })
          : { ok: false as const, hata: "bulunamadı" },
      ),
    ]);

    assert.equal([jetonla, kodla].filter((x) => x.ok).length, 1, "iki yol da geçti");
  });

  test("başka kafenin kasiyeri onaylayamaz", async () => {
    const s = await kuponAl(katalogOdulId);
    const sonuc = await kupon.onayla({ cafeId: kafeB, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(sonuc.ok, false, "kafe B, kafe A'nın kuponunu onayladı");

    // Kupon hâlâ kullanılabilir olmalı.
    const g = await kupon.coz(kafeA, s.kod);
    assert.ok(g.bulundu && g.gecerli);
  });

  test("ertelenmiş kupon onaylanamaz", async () => {
    const s = await kuponAl(buyukOdulId);
    const sonuc = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(sonuc.ok, false);
  });

  test("onaylayan personel kayda geçer — kupon oyuncu tarafından kapatılamaz (A4)", async () => {
    const s = await kuponAl(katalogOdulId);
    await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });

    const satir = await withBypass("test: onaylayan", (db) =>
      db.one<{ redeemed_by_staff_id: string | null }>(
        `SELECT redeemed_by_staff_id FROM coupons WHERE id = $1`,
        [s.kuponId],
      ),
    );
    assert.equal(satir?.redeemed_by_staff_id, kasiyerA);
  });
});

/* ═══════════════════════════════════════════════════════════
   5 · Yüzdeli kupon — tutar kayıttan (Ü17)
   ═══════════════════════════════════════════════════════════ */

describe("yüzdeli kuponda tutar kayıttan sınırlanır (Ü17)", () => {
  test("gerçekleşen tutar tavandan küçükse fark bütçeye döner", async () => {
    const s = await kuponAl(yuzdeOdulId);
    const once = await butce.durum(kafeA, bugun);

    // Tavan 40 TL, adisyondaki indirim 15 TL.
    const sonuc = await kupon.onayla({
      cafeId: kafeA,
      kuponId: s.kuponId,
      staffId: kasiyerA,
      gerceklesenKurus: 1_500,
    });
    assert.ok(sonuc.ok);
    assert.equal(sonuc.dusulenKurus, 1_500);

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(sonra.harcananKurus, once.harcananKurus + 1_500);
    // Rezerve edilen 4.000'in tamamı çözülmeli: 1.500 harcandı, 2.500 iade.
    assert.equal(sonra.rezerveKurus, once.rezerveKurus - 4_000);
    assert.equal(sonra.iadeKurus, once.iadeKurus + 2_500);
  });

  test("tavanın üstünde tutar iddiası tavana kırpılır", async () => {
    const s = await kuponAl(yuzdeOdulId);

    // Kasiyer 500 TL girmeye çalışıyor; tavan 40 TL.
    const sonuc = await kupon.onayla({
      cafeId: kafeA,
      kuponId: s.kuponId,
      staffId: kasiyerA,
      gerceklesenKurus: 50_000,
    });
    assert.ok(sonuc.ok);
    assert.equal(sonuc.dusulenKurus, 4_000, "tavanın üstü kabul edildi");
  });

  test("ürün ödülünde girilen tutar dikkate alınmaz — değer kayıttan gelir", async () => {
    const s = await kuponAl(katalogOdulId);

    const sonuc = await kupon.onayla({
      cafeId: kafeA,
      kuponId: s.kuponId,
      staffId: kasiyerA,
      gerceklesenKurus: 99_999,
    });
    assert.ok(sonuc.ok);
    assert.equal(sonuc.dusulenKurus, 1_500, "ürün ödülünde istemci tutarı kullanıldı");
  });
});

/* ═══════════════════════════════════════════════════════════
   6 · Geri alma ve süre dolumu
   ═══════════════════════════════════════════════════════════ */

describe("geri alma ve süre dolumu (E11)", () => {
  test("60 saniye içinde geri alma bütçeyi tam iade eder", async () => {
    const s = await kuponAl(katalogOdulId);
    const baslangic = await butce.durum(kafeA, bugun);

    await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    const geri = await kupon.geriAl({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.ok(geri.ok, geri.ok === false ? geri.hata : "");

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(sonra.harcananKurus, baslangic.harcananKurus, "harcama iptal edilmedi");
    assert.equal(
      sonra.dagitilabilirKurus,
      baslangic.dagitilabilirKurus + 1_500,
      "rezervasyon çözülmedi — kupon üretiminde bağlanan tutar geri dönmeliydi",
    );
  });

  test("geri alma süresi dolduysa reddedilir", async () => {
    const s = await kuponAl(katalogOdulId);
    await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });

    // Süreyi geçmişe çek.
    await yoneticiSorgu(
      `UPDATE coupons SET undo_deadline_at = now() - interval '1 minute' WHERE id = $1`,
      [s.kuponId],
    );

    const geri = await kupon.geriAl({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(geri.ok, false);
    assert.match(geri.ok === false ? geri.hata : "", /süre/i);
  });

  test("geri alınan kupon yeniden onaylanamaz", async () => {
    const s = await kuponAl(katalogOdulId);
    await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    await kupon.geriAl({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });

    const tekrar = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(tekrar.ok, false);
  });

  test("süresi dolan kupon rezervasyonu bütçeye iade eder", async () => {
    const s = await kuponAl(katalogOdulId);
    const once = await butce.durum(kafeA, bugun);

    // `coupons_check4` son kullanımın veriliş tarihinden sonra olmasını
    // istiyor — kısıt haklı. Kuponu bütünüyle geçmişe taşıyoruz.
    await yoneticiSorgu(
      `UPDATE coupons SET issued_at = now() - interval '10 days',
                          activates_at = now() - interval '10 days',
                          expires_at = now() - interval '1 day'
        WHERE id = $1`,
      [s.kuponId],
    );

    const adet = await kupon.sureDolanlariSupur();
    assert.ok(adet >= 1);

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(
      sonra.dagitilabilirKurus,
      once.dagitilabilirKurus + 1_500,
      "süresi dolan kuponun tutarı bütçeye dönmedi",
    );
  });

  test("süresi dolan kupon onaylanamaz", async () => {
    const s = await kuponAl(katalogOdulId);
    await yoneticiSorgu(
      `UPDATE coupons SET issued_at = now() - interval '10 days',
                          activates_at = now() - interval '10 days',
                          expires_at = now() - interval '1 day'
        WHERE id = $1`,
      [s.kuponId],
    );

    const sonuc = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(sonuc.ok, false);
  });
});

/* ═══════════════════════════════════════════════════════════
   6b · Ertelenmiş kupon — bakım gecikse bile açılır (Ü28)
   ═══════════════════════════════════════════════════════════

   Gerçekleşen arıza: `bekleyenleriAc` yazılmıştı ama hiçbir yerden
   çağrılmıyordu. Satır sonsuza kadar `pending` kaldığı için hem oyuncunun
   ekranı "yarın açılıyor" demeye devam ediyor, hem de kasa kuponu
   reddediyordu. Ödül kazanılıyor ama asla kullanılamıyordu.

   Düzeltme: kuponun hâline **zaman** karar veriyor, `status` kolonu değil.
   ═══════════════════════════════════════════════════════════ */

describe("ertelenmiş kupon (Ü28)", () => {
  /** Açılma zamanı geçmiş ama süpürülmemiş kupon üretir. */
  async function gecmisteAcilanBekleyen() {
    const s = await kuponAl(katalogOdulId);
    await yoneticiSorgu(
      `UPDATE coupons SET status = 'pending',
                          issued_at = now() - interval '2 days',
                          activates_at = now() - interval '1 day'
        WHERE id = $1`,
      [s.kuponId],
    );
    return s;
  }

  test("bakım geç kalsa da kasa kuponu geçerli görür — REGRESYON", async () => {
    const s = await gecmisteAcilanBekleyen();

    const gorunum = await kupon.coz(kafeA, s.kod);
    assert.equal(gorunum.bulundu, true);
    assert.equal(
      gorunum.bulundu === true ? gorunum.gecerli : null,
      true,
      "açılma zamanı geçmiş kupon hâlâ 'yarın açılıyor' diyor",
    );
  });

  test("bakım geç kalsa da kupon onaylanabilir — REGRESYON", async () => {
    const s = await gecmisteAcilanBekleyen();

    const sonuc = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(sonuc.ok, true, "kazanılmış ödül kasada kullanılamıyor");
  });

  test("açılma zamanı GELMEMİŞ kupon hâlâ reddediliyor", async () => {
    const s = await kuponAl(katalogOdulId);
    await yoneticiSorgu(
      `UPDATE coupons SET status = 'pending', activates_at = now() + interval '1 day'
        WHERE id = $1`,
      [s.kuponId],
    );

    const gorunum = await kupon.coz(kafeA, s.kod);
    assert.equal(gorunum.bulundu === true ? gorunum.gecerli : null, false);

    const sonuc = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(sonuc.ok, false, "erken kupon onaylandı — A5 kırıldı");
  });

  test("bakım çağrısı bekleyeni aktifleştiriyor", async () => {
    const s = await gecmisteAcilanBekleyen();

    await kupon.bekleyenleriAc();

    const satir = await withBypass("test: kupon durumu", (db) =>
      db.one<{ status: string }>(`SELECT status FROM coupons WHERE id = $1`, [s.kuponId]),
    );
    assert.equal(satir?.status, "active", "bakım kuponu açmadı");
  });
});

/* ═══════════════════════════════════════════════════════════
   7 · Defter ve izler
   ═══════════════════════════════════════════════════════════ */

describe("kupon defteri append-only", () => {
  test("her durum geçişi deftere düşer", async () => {
    const s = await kuponAl(katalogOdulId);
    await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    await kupon.geriAl({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });

    const olaylar = await withCafe(kafeA, (db) =>
      db.all<{ event: string }>(
        `SELECT event FROM coupon_events WHERE coupon_id = $1 ORDER BY created_at`,
        [s.kuponId],
      ),
    );

    assert.deepEqual(
      olaylar.map((o) => o.event),
      ["issued", "redeemed", "undone"],
      "kuponun hikâyesi eksik",
    );
  });

  test("defter satırı güncellenemez", async () => {
    await assert.rejects(
      withCafe(kafeA, (db) => db.query(`UPDATE coupon_events SET event = 'redeemed'`)),
      /permission denied/i,
    );
  });

  test("diğer kafe, bu kafenin kupon defterini göremez", async () => {
    // İddia "diğer kafenin hiç defteri yok" DEĞİL — o kafede gerçek kuponlar
    // olabilir. Mesele, BU testin ürettiği satırların oradan görünmemesi.
    const s = await kuponAl(katalogOdulId);

    const digerinde = await withCafe(kafeB, (db) =>
      db.all(`SELECT id FROM coupon_events WHERE coupon_id = $1`, [s.kuponId]),
    );
    assert.equal(digerinde.length, 0, "diğer kafe bu kuponun defterini gördü");

    const kendinde = await withCafe(kafeA, (db) =>
      db.all(`SELECT id FROM coupon_events WHERE coupon_id = $1`, [s.kuponId]),
    );
    assert.ok(kendinde.length > 0, "kafe kendi kupon defterini göremiyor");
  });
});

/* ═══════════════════════════════════════════════════════════
   8 · Ö3 · Happy Hour penceresinde ikinci ödül
   ═══════════════════════════════════════════════════════════

   Pencerede değişen tek şey: günlük "bir anlık ödül" sınırı bir kez daha
   açılıyor ve o ödülün maliyeti pencerenin havuzundan sayılıyor. Havuz
   bitince pencere kapanıyor — oyun oynanır, o pencereden ödül çıkmaz.
   ═══════════════════════════════════════════════════════════ */

describe("Happy Hour penceresi (Ö3)", () => {
  /** Şu an süren, verilen havuzlu bir pencere açar. */
  async function acikPencereYaz(havuzKurus: number) {
    const id = `hh_kupon_${randomInt(1_000_000)}`;
    await yoneticiSorgu(
      `INSERT INTO happy_hours (id, cafe_id, business_date, starts_at, ends_at, pool_kurus, created_by)
       VALUES ($1,$2,$3, now() - interval '10 minutes', now() + interval '110 minutes', $4, $5)`,
      [id, kafeA, bugun, havuzKurus, yoneticiA],
    );
    return id;
  }

  async function pencereleriSil() {
    await yoneticiSorgu(`UPDATE coupons SET happy_hour_id = NULL WHERE cafe_id = $1`, [kafeA]);
    await yoneticiSorgu(`DELETE FROM happy_hours WHERE cafe_id = $1`, [kafeA]);
  }

  async function yeniOyuncuId() {
    return (
      await kaydet({
        telefon: yeniTelefon(),
        ad: "Havuz",
        soyad: "Testi",
        dogumYili: 1990,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;
  }

  test("pencere açıkken ikinci ödül düşüyor ve pencereye etiketleniyor", async () => {
    await pencereleriSil();
    const p = await yeniOyuncuId();

    // Pencere YOKKEN birinci ödül.
    const ilk = await withBypass("test: ilk ödül", (db) =>
      kupon.anlikOdulVer(db, { playerId: p, cafeId: kafeA, kanitSeviyesi: 4 }),
    );
    assert.ok(ilk?.ok, "ilk ödül düşmedi");

    const hhId = await acikPencereYaz(100_000);

    const ikinci = await withBypass("test: pencere ödülü", (db) =>
      kupon.anlikOdulVer(db, { playerId: p, cafeId: kafeA, kanitSeviyesi: 4 }),
    );
    assert.ok(ikinci?.ok, "pencere açıkken ikinci ödül düşmedi");

    const etiket = await withBypass("test: etiket", (db) =>
      db.one<{ happy_hour_id: string | null }>(
        `SELECT happy_hour_id FROM coupons WHERE id = $1`,
        [ikinci.ok ? ikinci.kuponId : ""],
      ),
    );
    assert.equal(etiket?.happy_hour_id, hhId, "ikinci ödül pencereye etiketlenmedi");

    // Birinci ödül pencereye ait DEĞİL — havuzu eritmemeli.
    const ilkEtiket = await withBypass("test: ilk etiket", (db) =>
      db.one<{ happy_hour_id: string | null }>(
        `SELECT happy_hour_id FROM coupons WHERE id = $1`,
        [ilk.ok ? ilk.kuponId : ""],
      ),
    );
    assert.equal(ilkEtiket?.happy_hour_id, null, "normal günlük ödül havuzu eritti");

    await pencereleriSil();
  });

  test("pencerede üçüncü ödül yok — sınır 'günde bir + pencerede bir'", async () => {
    await pencereleriSil();
    const p = await yeniOyuncuId();
    await acikPencereYaz(100_000);

    const a = await withBypass("test: 1", (db) =>
      kupon.anlikOdulVer(db, { playerId: p, cafeId: kafeA, kanitSeviyesi: 4 }),
    );
    const b = await withBypass("test: 2", (db) =>
      kupon.anlikOdulVer(db, { playerId: p, cafeId: kafeA, kanitSeviyesi: 4 }),
    );
    const c = await withBypass("test: 3", (db) =>
      kupon.anlikOdulVer(db, { playerId: p, cafeId: kafeA, kanitSeviyesi: 4 }),
    );

    assert.ok(a?.ok && b?.ok, "iki ödül düşmeliydi");
    assert.equal(c, null, "pencerede üçüncü ödül düştü — sınır sınırsıza döndü");

    await pencereleriSil();
  });

  test("havuza sığmayan ödül verilmiyor — ekrandaki sayı yalan söylemez", async () => {
    await pencereleriSil();
    const p = await yeniOyuncuId();

    await withBypass("test: günlük ödül", (db) =>
      kupon.anlikOdulVer(db, { playerId: p, cafeId: kafeA, kanitSeviyesi: 4 }),
    );

    // Havuz, en ucuz ödülden de küçük.
    await acikPencereYaz(1);

    const pencereden = await withBypass("test: pencere ödülü", (db) =>
      kupon.anlikOdulVer(db, { playerId: p, cafeId: kafeA, kanitSeviyesi: 4 }),
    );
    assert.equal(pencereden, null, "havuza sığmayan ödül verildi");

    await pencereleriSil();
  });

  test("pencere ödülü bütçeden normal şekilde rezerve ediliyor", async () => {
    // Havuz bir tavan, ayrı bir kese değil: kupon yine bütçeden düşüyor.
    await pencereleriSil();
    const p = await yeniOyuncuId();
    await withBypass("test: günlük ödül", (db) =>
      kupon.anlikOdulVer(db, { playerId: p, cafeId: kafeA, kanitSeviyesi: 4 }),
    );
    await acikPencereYaz(100_000);

    const once = await butce.durum(kafeA, bugun);
    const s = await withBypass("test: pencere ödülü", (db) =>
      kupon.anlikOdulVer(db, { playerId: p, cafeId: kafeA, kanitSeviyesi: 4 }),
    );
    assert.ok(s?.ok);
    const sonra = await butce.durum(kafeA, bugun);

    assert.ok(
      sonra.rezerveKurus > once.rezerveKurus,
      "pencere ödülü bütçeden rezerve edilmedi — havuz kese gibi davranıyor",
    );

    await pencereleriSil();
  });
});

/* ═══════════════════════════════════════════════════════════
   Sabit tutarlı indirim ödülü (Ü18 yanına eklenen üçüncü tip)
   ═══════════════════════════════════════════════════════════ */

describe("tutar indirimi ödülü", () => {
  test("tutarın kendisi rezerve edilir ve kasada tamamı düşer", async () => {
    const once = await butce.durum(kafeA, bugun);
    const s = await kuponAl(tutarOdulId);
    const sonra = await butce.durum(kafeA, bugun);

    assert.equal(sonra.rezerveKurus, once.rezerveKurus + 2_000, "tutar kadar rezerve edilmeliydi");

    // Kasiyer tutar GİRMİYOR: yüzdelide gerçekleşen sorulur, sabit tutarda
    // gerçekleşen zaten tutarın kendisi.
    const onay = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.ok(onay.ok, onay.ok === false ? onay.hata : "");
    assert.equal(onay.ok && onay.dusulenKurus, 2_000);

    const bitti = await butce.durum(kafeA, bugun);
    assert.equal(bitti.harcananKurus, once.harcananKurus + 2_000);
    assert.equal(bitti.rezerveKurus, once.rezerveKurus, "rezervasyon harcamaya dönmeliydi");
  });

  /**
   * Bu ödül bir **bakiye değil** (Ü18). Kasiyerin girdiği tutar dikkate
   * alınmıyor: kupon tek kullanımlık ve tam tutarla kapanıyor. Kısmen
   * kullanılıp kalanı devretseydi saklanan değer aracı olurdu.
   */
  test("kasiyer daha düşük tutar girse bile tamamı düşer — bakiye değil", async () => {
    const s = await kuponAl(tutarOdulId);
    const onay = await kupon.onayla({
      cafeId: kafeA,
      kuponId: s.kuponId,
      staffId: kasiyerA,
      gerceklesenKurus: 500, // yok sayılmalı
    });
    assert.ok(onay.ok);
    assert.equal(onay.ok && onay.dusulenKurus, 2_000, "sabit tutarda kısmi kullanım yok");
  });

  test("kasa ekranı ödülü tutar indirimi olarak gösteriyor", async () => {
    const s = await kuponAl(tutarOdulId);
    const gorunum = await kupon.coz(kafeA, s.kod);
    assert.ok(gorunum.bulundu);
    assert.equal(gorunum.bulundu && gorunum.tip, "amount");
    assert.equal(gorunum.bulundu && gorunum.yuzde, null);
    assert.equal(gorunum.bulundu && gorunum.tutarKurus, 2_000);
  });

  test("tutar ödülünde oran verilemez", async () => {
    const sonuc = await katalog.ekle({
      cafeId: kafeA,
      tip: "amount",
      baslik: "KTEST Hatalı",
      maliyetKurus: 2_000,
      yuzde: 20,
      puanFiyati: 10,
      anlik: false,
      aktorId: yoneticiA,
    });
    assert.equal(sonuc.ok, false);
  });
});
