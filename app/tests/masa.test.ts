import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as masa from "@/domain/masa";
import * as ayar from "@/domain/ayar";
import { yoneticiSorgu } from "./_yardim";

/**
 * FAZ 4 GÜVENLİK KAPISI — masa oturumu ve konum doğrulaması.
 *
 * İki iddia sınanıyor:
 *   1. Kafe dışı oturumda hiçbir kazanım kaydı oluşmaz (Ü3)
 *   2. Ham konum saklanmaz — yalnızca uzaklık (G10)
 */

const KAFE_LAT = 41.0369;
const KAFE_LNG = 28.9838;

let kafeA = "";
let masaA = "";
let yoneticiA = "";
let oyuncuId = "";

const TABAN = 3_000_000 + randomInt(5_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0556${String(TABAN + sayac++).slice(-7)}`);

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const c = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const t = await db.one<{ id: string }>(
      "SELECT id FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1",
      [c!.id],
    );
    const y = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [c!.id],
    );
    return { c: c?.id, t: t?.id, y: y?.id };
  });
  assert.ok(v.c && v.t && v.y, "Tohum verisi yok — önce: npm run db:seed");
  kafeA = v.c;
  masaA = v.t;
  yoneticiA = v.y;

  // Kafenin koordinatı olmalı; yoksa konum doğrulaması hiç çalışmaz
  await yoneticiSorgu(`UPDATE cafes SET lat = $2, lng = $3 WHERE id = $1`, [
    kafeA,
    KAFE_LAT,
    KAFE_LNG,
  ]);

  const { oyuncu } = await kaydet({
    telefon: yeniTelefon(),
    ad: "Masa",
    soyad: "Testi",
    dogumYili: 1990,
    pazarlamaIzni: false,
  });
  oyuncuId = oyuncu.id;
});

after(async () => {
  await yoneticiSorgu(`DELETE FROM table_sessions WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [oyuncuId]);
  await closePools();
});

describe("mesafe hesabı", () => {
  test("aynı nokta sıfır metre", () => {
    assert.equal(masa.mesafeMetre(KAFE_LAT, KAFE_LNG, KAFE_LAT, KAFE_LNG), 0);
  });

  test("bilinen mesafeyi doğru buluyor", () => {
    // 0.001 derece enlem ≈ 111 metre
    const m = masa.mesafeMetre(KAFE_LAT, KAFE_LNG, KAFE_LAT + 0.001, KAFE_LNG);
    assert.ok(m > 105 && m < 118, `beklenen ~111 m, bulunan ${m}`);
  });

  test("şehirler arası mesafe makul", () => {
    // İstanbul → İzmir ≈ 330 km
    const m = masa.mesafeMetre(KAFE_LAT, KAFE_LNG, 38.4237, 27.1428);
    assert.ok(m > 300_000 && m < 360_000, `beklenen ~330 km, bulunan ${m}`);
  });
});

describe("masa oturumu", () => {
  test("oturum yokken oyuncu kafe dışındadır (Ü3)", async () => {
    assert.equal(await masa.aktif(oyuncuId), null);
  });

  test("karekod okutunca K1 ile açılıyor", async () => {
    await masa.ac({ cafeId: kafeA, tableId: masaA, playerId: oyuncuId });

    const o = await masa.aktif(oyuncuId);
    assert.ok(o, "masa oturumu bulunmalı");
    assert.equal(o.kanitMaskesi & masa.K1, masa.K1, "K1 baştan olmalı");
    assert.equal(o.kanitMaskesi & masa.K2, 0, "K2 henüz olmamalı");
    assert.equal(o.kanitSeviyesi, 1);
  });

  test("aynı masada ikinci okutma yeni oturum açmıyor", async () => {
    const once = await masa.aktif(oyuncuId);
    await masa.ac({ cafeId: kafeA, tableId: masaA, playerId: oyuncuId });
    const sonra = await masa.aktif(oyuncuId);
    assert.equal(sonra?.id, once?.id, "aynı ziyaret sürmeli");
  });

  test("süresi dolan oturum artık aktif değil", async () => {
    await yoneticiSorgu(
      `UPDATE table_sessions SET expires_at = now() - interval '1 minute' WHERE player_id = $1`,
      [oyuncuId],
    );
    assert.equal(await masa.aktif(oyuncuId), null);

    // Testin devamı için geri aç
    await yoneticiSorgu(
      `UPDATE table_sessions SET expires_at = now() + interval '1 hour' WHERE player_id = $1`,
      [oyuncuId],
    );
  });
});

describe("konum doğrulaması (K2)", () => {
  test("kafeye yakınken K2 veriliyor", async () => {
    // ~40 metre kuzey
    const sonuc = await masa.konumDogrula(oyuncuId, KAFE_LAT + 0.00036, KAFE_LNG);
    assert.equal(sonuc.durum, "dogrulandi");
    if (sonuc.durum === "dogrulandi") {
      assert.ok(sonuc.mesafeM < masa.GEOFENCE_METRE);
    }

    const o = await masa.aktif(oyuncuId);
    assert.equal(o!.kanitMaskesi & masa.K2, masa.K2, "K2 verilmeliydi");
    assert.equal(o!.kanitSeviyesi, 2);
  });

  test("🔴 ham koordinat SAKLANMIYOR (G10)", async () => {
    const satir = await withBypass("test: masa oturumu satırı", (db) =>
      db.one<Record<string, unknown>>(
        `SELECT * FROM table_sessions WHERE player_id = $1`,
        [oyuncuId],
      ),
    );
    const govde = JSON.stringify(satir);

    assert.ok(!govde.includes("41.03"), "enlem saklanmış");
    assert.ok(!govde.includes("28.98"), "boylam saklanmış");
    assert.ok(typeof satir!.geo_distance_m === "number", "yalnızca uzaklık saklanmalı");
  });

  test("kafeden uzaktayken K2 verilmiyor", async () => {
    // Önce K2'yi sıfırla
    await yoneticiSorgu(
      `UPDATE table_sessions SET proof_mask = 1, proof_level = 1, geo_distance_m = NULL
        WHERE player_id = $1`,
      [oyuncuId],
    );

    // ~1 km kuzey
    const sonuc = await masa.konumDogrula(oyuncuId, KAFE_LAT + 0.009, KAFE_LNG);
    assert.equal(sonuc.durum, "uzak");

    const o = await masa.aktif(oyuncuId);
    assert.equal(o!.kanitMaskesi & masa.K2, 0, "uzaktayken K2 verilmemeli");
    assert.equal(o!.kanitSeviyesi, 1);
    assert.ok(o!.mesafeM! > masa.GEOFENCE_METRE, "mesafe yine de kaydedilmeli");
  });

  test("🔴 yarıçap kafenin ayarı — dar çember uzağı reddediyor (Ü131)", async () => {
    // `GEOFENCE_METRE = 150` sabitken her kafeye aynı çember uygulanıyordu;
    // 150 metre, yan binadaki birinin de "kafedeyim" sayılması demekti.
    // Ürün sahibi yarıçapı kafeye verdi. Bu test ayarın gerçekten K2'ye
    // geçtiğini çiviliyor — panelde yazan sayı ile kabul edilen mesafe
    // ayrışırsa kafe "40 yazdım, hâlâ 150 metreden kazanıyorlar" der.
    const sifirla = () =>
      yoneticiSorgu(
        `UPDATE table_sessions SET proof_mask = 1, proof_level = 1, geo_distance_m = NULL
          WHERE player_id = $1`,
        [oyuncuId],
      );

    // ~80 metre kuzey: varsayılan 150'nin içinde, ayarlanacak 40'ın dışında.
    const SEKSEN_METRE = KAFE_LAT + 0.00072;

    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.konumYaricapi,
      deger: 40,
      aktorId: yoneticiA,
    });

    await sifirla();
    const dar = await masa.konumDogrula(oyuncuId, SEKSEN_METRE, KAFE_LNG);
    assert.equal(dar.durum, "uzak", "40 metre yarıçapta 80 metre kabul edildi");

    // Aynı nokta, geniş çemberde kabul edilmeli — reddin sebebi mesafe
    // değil de başka bir şey olsaydı bu da başarısız olurdu.
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.konumYaricapi,
      deger: 150,
      aktorId: yoneticiA,
    });

    await sifirla();
    const genis = await masa.konumDogrula(oyuncuId, SEKSEN_METRE, KAFE_LNG);
    assert.equal(genis.durum, "dogrulandi", "150 metre yarıçapta 80 metre reddedildi");

    await sifirla();
  });

  test("konum reddi bir hata değil, kayıtlı bir durum", async () => {
    await masa.konumReddedildi(oyuncuId);

    const o = await masa.aktif(oyuncuId);
    assert.ok(o, "oturum ayakta kalmalı — akış çökmemeli");
    assert.equal(o.konumReddedildi, true);
    assert.equal(o.kanitSeviyesi, 1, "reddedince K1'de kalır");
  });

  test("masa oturumu olmayan oyuncuda konum işlemi yok sayılıyor", async () => {
    const { oyuncu } = await kaydet({
      telefon: yeniTelefon(),
      ad: "Oturumsuz",
      soyad: "Testi",
      dogumYili: 1990,
      pazarlamaIzni: false,
    });

    const sonuc = await masa.konumDogrula(oyuncu.id, KAFE_LAT, KAFE_LNG);
    assert.equal(sonuc.durum, "oturum_yok");

    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [oyuncu.id]);
    await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [oyuncu.id]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [oyuncu.id]);
  });
});

/* ═══════════════════════════════════════════════════════════
   Oyuncuya ne olduğunu söylemek (Ü95)
   ═══════════════════════════════════════════════════════════ */

describe("oyuncu neden kazanamadığını görebiliyor (Ü95)", () => {
  test("kafe konumunu işaretlememişse oturum bunu taşıyor", async () => {
    // ⚠️ Konumsuz kafede K2 hiçbir zaman sağlanamıyor. Ekran bunu
    // bilmezse hiç başarılı olamayacak bir "Doğrula" düğmesi gösteriyor
    // ve oyuncu kendi hatasını arıyor.
    const o1 = await masa.aktif(oyuncuId);
    assert.equal(o1?.kafeKonumuVar, true, "kafenin konumu vardı, yok göründü");

    await yoneticiSorgu(`UPDATE cafes SET lat = NULL, lng = NULL WHERE id = $1`, [kafeA]);
    try {
      const o2 = await masa.aktif(oyuncuId);
      assert.equal(o2?.kafeKonumuVar, false, "konumsuz kafe var göründü");

      const s = await masa.konumDogrula(oyuncuId, KAFE_LAT, KAFE_LNG);
      assert.equal(s.durum, "kafe_konumu_yok", "konumsuz kafede doğrulama başarılı sayıldı");
    } finally {
      await yoneticiSorgu(`UPDATE cafes SET lat = $2, lng = $3 WHERE id = $1`, [
        kafeA,
        KAFE_LAT,
        KAFE_LNG,
      ]);
    }
  });

  test("süresi dolan oturum 'hiç oturmadı' ile karışmıyor", async () => {
    // ⚠️ `aktif()` ikisine de null dönüyor ve ana ekran ikisine de "Kafe
    // dışındasın" diyordu. Veritabanında 245 dolmuş oturuma karşılık 1
    // aktif oturum vardı — bu kenar durum değil, olağan durum.
    const yeniOyuncu = await kaydet({
      telefon: yeniTelefon(),
      ad: "Ceren",
      soyad: "Aydın",
      dogumYili: 1996,
      pazarlamaIzni: false,
    });
    const pid = yeniOyuncu.oyuncu.id;

    try {
      // Henüz hiç masaya oturmadı.
      assert.equal(await masa.sonDolanOturum(pid), null, "oturmamış oyuncuya geçmiş çıktı");

      await masa.ac({ cafeId: kafeA, tableId: masaA, playerId: pid });
      assert.ok(await masa.aktif(pid), "oturum açılmadı");
      // Açık oturum varken "dolan" sayılmamalı.
      assert.equal(await masa.sonDolanOturum(pid), null, "açık oturum dolmuş sayıldı");

      await yoneticiSorgu(
        `UPDATE table_sessions SET expires_at = now() - interval '1 minute' WHERE player_id = $1`,
        [pid],
      );

      assert.equal(await masa.aktif(pid), null, "dolmuş oturum hâlâ aktif");
      const dolan = await masa.sonDolanOturum(pid);
      assert.ok(dolan, "dolmuş oturum bulunamadı — oyuncu yine 'kafe dışında' görünür");
      assert.ok(dolan.cafeAdi.length > 0);
      assert.ok(dolan.masaAdi.length > 0);
    } finally {
      await yoneticiSorgu(`DELETE FROM table_sessions WHERE player_id = $1`, [pid]);
      await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [pid]);
      await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [pid]);
    }
  });
});

describe("kanıt seviyesi", () => {
  test("seviye art arda sağlanan kanıta göre", () => {
    assert.equal(masa.seviyeHesapla(0), 0, "hiç kanıt yok");
    assert.equal(masa.seviyeHesapla(masa.K1), 1);
    assert.equal(masa.seviyeHesapla(masa.K1 | masa.K2), 2);
    assert.equal(masa.seviyeHesapla(masa.K1 | masa.K2 | masa.K3), 3);
  });

  test("araya boşluk girerse seviye yükselmiyor", () => {
    // K1 var, K2 yok, K3 var → seviye 1'de kalmalı.
    // Konumu doğrulamadan masada beklemek büyük ödül açmasın.
    assert.equal(masa.seviyeHesapla(masa.K1 | masa.K3), 1);
    assert.equal(masa.seviyeHesapla(masa.K2 | masa.K3), 0, "K1 olmadan hiçbir şey sayılmaz");
  });
});
