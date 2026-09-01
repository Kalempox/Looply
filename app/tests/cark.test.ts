import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as cark from "@/domain/cark";
import { carkOduluVer } from "@/domain/kupon";
import { newId } from "@/lib/ids";
import { isGunu, gunEkle } from "@/lib/tarih";

/**
 * ŞANS ÇARKI — Ü49.
 *
 * Çark para dağıtıyor. Sınanan dört iddia:
 *
 *   1. **Günde bir kez.** İkinci çevirme aynı gün ödül üretmiyor.
 *   2. **Ucuz ödül baskın.** Ağırlık gerçekten değere ters orantılı —
 *      "çok da yüksek ödüller vermeyen çark" tarifi kodda karşılığını
 *      buluyor mu.
 *   3. **Talep imzalı.** Misafirin elindeki çerez kurcalanınca çözülmüyor;
 *      aksi hâlde ziyaretçi kendi ödülünü yazardı.
 *   4. **Bütçe dışına çıkmıyor.** Bütçesi olmayan kafede çark ödül vermiyor.
 */

let cafeId = "";
let cafeId2 = "";
let oyuncu = "";
let oyuncu2 = "";
const TABAN = 4_000_000 + randomInt(3_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0555${String(TABAN + sayac++).slice(-7)}`);

async function kafeKur(ad: string, butceli: boolean): Promise<string> {
  const id = newId("cafe");
  await withBypass("test kafe", async (db) => {
    await db.query(
      `INSERT INTO cafes (id, name, slug, status, lat, lng)
       VALUES ($1,$2,$3,'approved',41.0,29.0)`,
      [id, ad, `${ad.toLowerCase()}-${id.slice(-6)}`],
    );

    for (const [baslik, kurus] of [
      ["Test ucuz", 5_00],
      ["Test orta", 15_00],
      ["Test pahali", 45_00],
    ] as const) {
      await db.query(
        `INSERT INTO rewards (id, cafe_id, kind, title, points_price, cost_kurus,
                              min_proof_level, reward_type, active)
         VALUES ($1,$2,'instant',$3,0,$4,0,'product',true)`,
        [newId("rwd"), id, baslik, kurus],
      );
    }

    if (butceli) {
      const gun = isGunu();
      await db.query(
        `INSERT INTO budget_periods (id, cafe_id, period_start, period_end, committed_kurus)
         VALUES ($1,$2,$3,$4,$5)`,
        [newId("bp"), id, gun, gunEkle(gun, 1), 5_000_00],
      );
    }
  });
  return id;
}

before(async () => {
  cafeId = await kafeKur("CarkTest", true);
  cafeId2 = await kafeKur("CarkButcesiz", false);

  const a = await kaydet({ telefon: yeniTelefon(), ad: "Deniz", soyad: "Aydın", dogumYili: 1990, pazarlamaIzni: false });
  const b = await kaydet({ telefon: yeniTelefon(), ad: "Kerem", soyad: "Şahin", dogumYili: 1992, pazarlamaIzni: false });
  oyuncu = a.oyuncu.id;
  oyuncu2 = b.oyuncu.id;
});

after(async () => {
  await closePools();
});

describe("çark · günlük sınır", () => {
  test("ilk çevirme ödül üretiyor", async () => {
    const durum = await cark.durum({ playerId: oyuncu, cafeId });
    assert.equal(durum.acik, true, "çark kapalı başladı");

    const secim = cark.sec(durum.acik ? durum.dilimler : []);
    assert.ok(secim);

    const s = await carkOduluVer({
      playerId: oyuncu,
      cafeId,
      odulId: secim.dilim.odulId,
      kanitSeviyesi: 2,
    });
    assert.equal(s.ok, true, s.ok ? "" : s.hata);
  });

  /**
   * ASIL GÜVENCE. Kilit `cark.durum()` ekranında da var ama orası yalnızca
   * ekranı kapatıyor; ödülü üreten fonksiyonun kendisi de reddetmeli —
   * yoksa doğrudan eylemi çağıran biri sınırsız ödül üretirdi.
   */
  test("aynı gün ikinci çevirme ödül üretmiyor — ASIL GÜVENCE", async () => {
    const s = await carkOduluVer({
      playerId: oyuncu,
      cafeId,
      odulId: (await ilkOdul(cafeId)).id,
      kanitSeviyesi: 2,
    });
    assert.equal(s.ok, false, "24 saat kilidi tutmadı — sınırsız ödül yolu açık");
  });

  test("çevirdikten sonra çark kapalı görünüyor", async () => {
    const durum = await cark.durum({ playerId: oyuncu, cafeId });
    assert.equal(durum.acik, false);
    assert.match(cark.durumMetni(durum), /saat/);
  });

  test("başka oyuncunun çarkı etkilenmiyor", async () => {
    const durum = await cark.durum({ playerId: oyuncu2, cafeId });
    assert.equal(durum.acik, true, "bir oyuncunun çevirmesi diğerini kilitledi");
  });

  test("bütçesi olmayan kafede ödül çıkmıyor", async () => {
    const s = await carkOduluVer({
      playerId: oyuncu2,
      cafeId: cafeId2,
      odulId: (await ilkOdul(cafeId2)).id,
      kanitSeviyesi: 2,
    });
    assert.equal(s.ok, false, "bütçesiz kafeden ödül çıktı — E10 delindi");
  });
});

describe("çark · üst sınır", () => {
  /**
   * Ürün sahibinin şartı: *"küçük ödüller dağıtacak."* Havuz (E10) tek bir
   * ödülün büyüklüğünü sınırlamıyor; sınırlayan şey bu ayar.
   *
   * Test kafesinde 5 / 15 / 45 TL var, varsayılan sınır 25 TL: 45 TL'lik
   * ödül çarkta hiç görünmemeli.
   */
  test("sınırın üstündeki ödül çarka girmiyor", async () => {
    const durum = await cark.durum({ playerId: oyuncu2, cafeId });
    assert.equal(durum.acik, true);
    if (!durum.acik) return;

    assert.ok(
      durum.dilimler.every((d) => d.kurusDegeri <= 25_00),
      `sınırın üstünde ödül çarkta: ${durum.dilimler.map((d) => d.kurusDegeri).join(", ")}`,
    );
    assert.ok(
      !durum.dilimler.some((d) => d.baslik === "Test pahali"),
      "45 TL'lik ödül çarkta göründü",
    );
  });

  /**
   * ASIL GÜVENCE. Seçim tarafındaki süzgeç ekranı düzeltir; parayı yazan
   * fonksiyonun da reddetmesi gerekiyor — yoksa doğrudan çağıran biri
   * (ya da kurcalanmış bir talep) sınırı atlardı.
   */
  test("sınır üstü ödül doğrudan çağrıyla da yazılamıyor — ASIL GÜVENCE", async () => {
    const pahali = await withBypass("test pahali odul", (db) =>
      db.one<{ id: string }>(
        `SELECT id FROM rewards WHERE cafe_id = $1 AND title = 'Test pahali'`,
        [cafeId],
      ),
    );
    assert.ok(pahali);

    const s = await carkOduluVer({
      playerId: oyuncu2,
      cafeId,
      odulId: pahali.id,
      kanitSeviyesi: 2,
    });
    assert.equal(s.ok, false, "sınır üstü ödül çarktan yazıldı");
  });
});

describe("çark · ağırlık", () => {
  /**
   * "Çok da yüksek ödüller vermeyen bir çark" tarifi bir sayıya dönüşmeli.
   * 5 TL / 15 TL / 45 TL üçlüsünde ağırlık 1/değer² olduğu için ucuz ödül
   * ezici çoğunlukta olmalı ve pahalı ödül nadir kalmalı.
   */
  test("ucuz ödül belirgin biçimde daha sık çıkıyor", () => {
    const oduller: cark.Dilim[] = [
      { odulId: "ucuz", baslik: "5", kurusDegeri: 5_00 },
      { odulId: "orta", baslik: "15", kurusDegeri: 15_00 },
      { odulId: "pahali", baslik: "45", kurusDegeri: 45_00 },
    ];

    const sayim = { ucuz: 0, orta: 0, pahali: 0 };
    for (let i = 0; i < 3000; i++) {
      sayim[oduller[cark.agirlikliSec(oduller)].odulId as keyof typeof sayim]++;
    }

    assert.ok(sayim.ucuz > sayim.orta, "ucuz ödül ortadan seyrek çıktı");
    assert.ok(sayim.orta > sayim.pahali, "orta ödül pahalıdan seyrek çıktı");
    // Beklenen oran ~0.88 / 0.10 / 0.011. Sınırlar geniş: bu bir dağılım
    // testi, tam sayı testi değil.
    assert.ok(sayim.ucuz > 3000 * 0.75, `ucuz ödül beklenenden az: ${sayim.ucuz}/3000`);
    assert.ok(sayim.pahali < 3000 * 0.05, `pahalı ödül beklenenden sık: ${sayim.pahali}/3000`);
  });

  test("tek ödüllü kafede çark tek dilim — sekiz kez tekrarlamıyor", () => {
    const tek: cark.Dilim[] = [{ odulId: "a", baslik: "A", kurusDegeri: 1000 }];
    assert.equal(cark.dilimleriYay(tek).length, 1);
  });

  test("dört ve üstü ödülde her ödül bir kez görünüyor", () => {
    const dort: cark.Dilim[] = ["a", "b", "c", "d"].map((x, i) => ({
      odulId: x,
      baslik: x,
      kurusDegeri: (i + 1) * 1000,
    }));
    const yayilmis = cark.dilimleriYay(dort);
    assert.equal(yayilmis.length, 4);
    assert.equal(new Set(yayilmis.map((d) => d.odulId)).size, 4);
  });

  test("iki ödül eşit sayıda tekrarlanıyor — görünen sıklık yanıltmıyor", () => {
    const iki: cark.Dilim[] = [
      { odulId: "a", baslik: "A", kurusDegeri: 1000 },
      { odulId: "b", baslik: "B", kurusDegeri: 2000 },
    ];
    const yayilmis = cark.dilimleriYay(iki);
    const a = yayilmis.filter((d) => d.odulId === "a").length;
    const b = yayilmis.filter((d) => d.odulId === "b").length;
    assert.equal(a, b, "bir ödül diğerinden fazla dilim kapladı");
  });
});

describe("çark · misafir talebi", () => {
  test("imzalı talep çözülüyor", async () => {
    const s = await cark.misafirCevir({ cafeId });
    assert.equal(s.ok, true);
    if (!s.ok) return;

    const t = cark.talepCoz(s.cerez);
    assert.ok(t, "kendi ürettiğimiz talep çözülemedi");
    assert.equal(t.cafeId, cafeId);
    assert.equal(t.baslik, s.baslik);
  });

  /**
   * Çerez oyuncunun elinde. Kurcalanabilseydi ziyaretçi, kafenin en pahalı
   * ödülünün kimliğini yazıp kaydolduğunda onu bozdururdu.
   */
  test("kurcalanmış talep çözülmüyor", async () => {
    const s = await cark.misafirCevir({ cafeId });
    assert.equal(s.ok, true);
    if (!s.ok) return;

    const [govde, imza] = s.cerez.split(".");
    const bozuk = Buffer.from(
      JSON.stringify({ ...cark.talepCoz(s.cerez), odulId: "rwd_baskasinin" }),
      "utf8",
    ).toString("base64url");

    assert.equal(cark.talepCoz(`${bozuk}.${imza}`), null, "gövde değişince imza tutmamalı");
    assert.equal(cark.talepCoz(`${govde}.deadbeef`), null, "imza değişince talep açılmamalı");
    assert.equal(cark.talepCoz("gecersiz"), null);
    assert.equal(cark.talepCoz(undefined), null);
  });

  test("misafir çevirmesi kupon üretmiyor — G13", async () => {
    const once = await carkKuponSayisi(cafeId);
    await cark.misafirCevir({ cafeId });
    const sonra = await carkKuponSayisi(cafeId);
    assert.equal(sonra, once, "kaydolmamış ziyaretçi için satır yazıldı");
  });
});

async function ilkOdul(id: string): Promise<{ id: string }> {
  const r = await withBypass("test odul", (db) =>
    db.one<{ id: string }>(
      `SELECT id FROM rewards WHERE cafe_id = $1 AND kind = 'instant' ORDER BY cost_kurus LIMIT 1`,
      [id],
    ),
  );
  assert.ok(r);
  return r;
}

async function carkKuponSayisi(id: string): Promise<number> {
  const r = await withBypass("test cark sayimi", (db) =>
    db.one<{ n: string }>(
      `SELECT count(*) AS n FROM coupons c
         JOIN coupon_events e ON e.coupon_id = c.id AND e.event = 'issued' AND e.reason = 'cark'
        WHERE c.cafe_id = $1`,
      [id],
    ),
  );
  return Number(r?.n ?? 0);
}
