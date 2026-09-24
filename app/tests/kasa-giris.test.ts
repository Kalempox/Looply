import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { newId } from "@/lib/ids";
import { LIMITS } from "@/lib/ratelimit";
import * as ayar from "@/domain/ayar";
import { konumdakiKafe, personelEkle, pinGiris } from "@/domain/staff";
import { testKafeleriniSil } from "./_yardim";

/**
 * Kasa girişi: PIN ve konum — Ü285.
 *
 * Ürün sahibi: *"kasiyer her cihazdan girebilir ama cihazının kafe
 * konumunun içinde olması gerekir — önemli olan PIN ve konum."* Cihaz kaydı
 * (G11) kalktı. Sınanan iki kapı: kafe konumdan doğru çözülüyor (başka
 * kafenin kasasına düşülmüyor) ve PIN taraması kafe başına sayaca takılıyor
 * — konum istemciden geldiği için uydurulabilir, asıl kalkan o sayaç.
 */

// Gerçek kafelerden uzak, her koşuda başka bir nokta (Hakkari civarı).
const MERKEZ_LAT = 37.2 + randomInt(1000) / 10_000;
const MERKEZ_LNG = 43.6 + randomInt(1000) / 10_000;
const kuzey = (m: number) => m / 111_320;
const dogu = (m: number) => m / (111_320 * Math.cos((MERKEZ_LAT * Math.PI) / 180));

const olusanKafeler: string[] = [];

async function kafeAc(opts: {
  lat: number | null;
  lng: number | null;
  durum?: "approved" | "pending";
}): Promise<string> {
  const id = newId("cafe");
  await withBypass("test kafe — kasa girişi", (db) =>
    db.query(
      `INSERT INTO cafes (id, name, slug, status, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, `KasaTest ${id.slice(-5)}`, `kasa-${id.slice(-8)}`, opts.durum ?? "approved", opts.lat, opts.lng],
    ),
  );
  olusanKafeler.push(id);
  return id;
}

let kafeA = "";
let kafeB = "";

before(async () => {
  // İki kafe 120 m arayla — ikisinin de varsayılan yarıçapı 150 m, yani
  // arada kalan bir nokta İKİSİNİN de içinde.
  kafeA = await kafeAc({ lat: MERKEZ_LAT, lng: MERKEZ_LNG });
  kafeB = await kafeAc({ lat: MERKEZ_LAT, lng: MERKEZ_LNG + dogu(120) });
});

after(async () => {
  await testKafeleriniSil(olusanKafeler);
  await closePools();
});

describe("kasa girişi — kafe konumdan (Ü285)", () => {
  test("🔴 kafenin içindeki nokta o kafeyi buluyor", async () => {
    const r = await konumdakiKafe(MERKEZ_LAT + kuzey(40), MERKEZ_LNG, 15);
    assert.equal(r.durum, "bulundu");
    assert.equal(r.durum === "bulundu" && r.cafeId, kafeA);
  });

  test("🔴 iki kafe de yakınsa en yakını — öbürünün kasasına düşülmüyor", async () => {
    // A'ya 90 m, B'ye 30 m: ikisinin de yarıçapında.
    const r = await konumdakiKafe(MERKEZ_LAT, MERKEZ_LNG + dogu(90), 10);
    assert.equal(r.durum === "bulundu" && r.cafeId, kafeB);
  });

  test("yarıçap dışı: giriş yok, en yakın kafenin mesafesi söyleniyor", async () => {
    const r = await konumdakiKafe(MERKEZ_LAT - kuzey(1000), MERKEZ_LNG, 20);
    assert.equal(r.durum, "yok");
    assert.ok(r.durum === "yok" && r.enYakinM !== null && Math.abs(r.enYakinM - 1000) <= 5, JSON.stringify(r));
  });

  test("dışarıda ama doğruluk payı yarıçapa taşıyor: belirsiz, giriş yok", async () => {
    const r = await konumdakiKafe(MERKEZ_LAT - kuzey(250), MERKEZ_LNG, 150);
    assert.equal(r.durum, "belirsiz");
  });

  test("kafenin kendi yarıçap ayarı geçerli", async () => {
    const kafe = await kafeAc({ lat: MERKEZ_LAT + kuzey(3000), lng: MERKEZ_LNG });
    const nokta = MERKEZ_LAT + kuzey(3000 + 80);
    assert.equal((await konumdakiKafe(nokta, MERKEZ_LNG, 5)).durum, "bulundu", "varsayılan 150 m'de 80 m içeride");

    const yonetici = await personelEkle({ cafeId: kafe, ad: "TEST Yönetici", pin: "7391", ekleyenId: "stf_test_u285" });
    const s = await ayar.sayiYaz({ cafeId: kafe, anahtar: ayar.ANAHTARLAR.konumYaricapi, deger: 40, aktorId: yonetici });
    assert.ok(s.ok);
    assert.equal((await konumdakiKafe(nokta, MERKEZ_LNG, 5)).durum, "yok", "40 m yarıçapta 80 m dışarıda");
  });

  test("onaylanmamış ya da konumu olmayan kafe hiç bulunmuyor", async () => {
    const lat = MERKEZ_LAT + kuzey(6000);
    await kafeAc({ lat, lng: MERKEZ_LNG, durum: "pending" });
    await kafeAc({ lat: null, lng: null });
    assert.equal((await konumdakiKafe(lat, MERKEZ_LNG, 5)).durum, "yok");
  });
});

describe("kasa girişi — PIN taraması (Ü285)", () => {
  test("🔴 IP değiştirerek PIN taramak kafe sayacına takılıyor", async () => {
    const kafe = await kafeAc({ lat: MERKEZ_LAT + kuzey(9000), lng: MERKEZ_LNG });
    await personelEkle({ cafeId: kafe, ad: "TEST Kasiyer", pin: "5820", ekleyenId: "stf_test_u285" });

    const tavan = LIMITS.pin_per_cafe_hour.hits;
    for (let i = 0; i < tavan; i++) {
      const r = await pinGiris({ cafeId: kafe, pin: String(1000 + i), ipAnahtari: `tarama-${i}` });
      assert.equal(r.durum, "yanlis", `${i + 1}. deneme`);
    }
    // Yeni bir IP'den, üstelik DOĞRU PIN'le bile kapı kapalı.
    const r = await pinGiris({ cafeId: kafe, pin: "5820", ipAnahtari: "tarama-yeni" });
    assert.equal(r.durum, "kilitli");
  });

  test("aynı bağlantıdan beş denemeden sonra kilit", async () => {
    const kafe = await kafeAc({ lat: MERKEZ_LAT + kuzey(12_000), lng: MERKEZ_LNG });
    await personelEkle({ cafeId: kafe, ad: "TEST Kasiyer", pin: "5820", ekleyenId: "stf_test_u285" });
    const ip = `tek-ip-${randomInt(1_000_000)}`;
    for (let i = 0; i < LIMITS.pin_per_ip_15min.hits; i++) {
      assert.equal((await pinGiris({ cafeId: kafe, pin: String(2000 + i), ipAnahtari: ip })).durum, "yanlis");
    }
    assert.equal((await pinGiris({ cafeId: kafe, pin: "5820", ipAnahtari: ip })).durum, "kilitli");
  });
});
