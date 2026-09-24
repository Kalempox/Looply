import "../scripts/_env";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { koordinatCoz, haritaLinki, hizmetAlanindaMi } from "@/lib/koordinat";

/**
 * Elle girilen kafe koordinatı (Ü278).
 *
 * Ürün sahibi konumu bilgisayardan kaydetmek istedi; bilgisayarın kendi
 * tahmini ±5 km yanıldı. Google Haritalar'ın sağ tık koordinatı kesin —
 * ama yapıştırılan metin yanlış olursa kafe yine yanlış yere düşer ve
 * kafedeki oyuncu "uzaktasın" diye reddedilir. Sınanan şey o kapı.
 */

function ok(girdi: string) {
  const c = koordinatCoz(girdi);
  assert.ok(c.ok, c.ok ? "" : `reddedildi: ${girdi} → ${c.hata}`);
  return c.ok ? c : null!;
}

function red(girdi: string, desen: RegExp) {
  const c = koordinatCoz(girdi);
  assert.equal(c.ok, false, `kabul edildi: ${girdi}`);
  if (!c.ok) assert.match(c.hata, desen, `yanlış sebep: ${c.hata}`);
}

describe("koordinat çözme — kabul edilenler (Ü278)", () => {
  test("sağ tık menüsünün biçimi", () => {
    const c = ok("41.03690, 28.98380");
    assert.equal(c.lat, 41.0369);
    assert.equal(c.lng, 28.9838);
    assert.equal(c.kaynak, "metin");
  });

  test("boşluksuz, ondalığı virgüllü ve etrafında yazı olan biçimler", () => {
    assert.equal(ok("41.03690,28.98380").lng, 28.9838);
    const virgullu = ok("41,03690 28,98380");
    assert.equal(virgullu.lat, 41.0369);
    assert.equal(virgullu.lng, 28.9838);
    assert.equal(ok("41,03690, 28,98380").lng, 28.9838);
    assert.equal(ok("  41.03690 N, 28.98380 E  ").lat, 41.0369);
  });

  test("🔴 yer linkinde işaretli yer alınıyor, haritanın ortası değil", () => {
    // `@` haritanın ortası; kafe 300 m ötede olabilir. `!3d…!4d…` yerin kendisi.
    const c = ok(
      "https://www.google.com/maps/place/Kafe/@41.0300000,28.9700000,15z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d41.0369123!4d28.9838456",
    );
    assert.equal(c.kaynak, "yer");
    assert.equal(c.lat, 41.0369123);
    assert.equal(c.lng, 28.9838456);
  });

  test("sorgu linki, kodlanmış virgülüyle birlikte", () => {
    const c = ok("https://www.google.com/maps?q=41.036912%2C28.983845");
    assert.equal(c.kaynak, "sorgu");
    assert.equal(c.lat, 41.036912);
    assert.equal(ok("https://maps.google.com/?ll=41.036912,28.983845&z=17").kaynak, "sorgu");
  });

  test("yalnızca `@` olan link kabul ediliyor ama 'haritanın ortası' diye işaretleniyor", () => {
    const c = ok("https://www.google.com/maps/@41.0369123,28.9838456,17z");
    assert.equal(c.kaynak, "merkez");
  });

  test("KKTC de hizmet alanında", () => {
    assert.equal(hizmetAlanindaMi(35.1856, 33.3823), true); // Lefkoşa
  });
});

describe("koordinat çözme — reddedilenler (Ü278)", () => {
  test("boş girdi", () => red("   ", /yapıştır/));

  test("kısa link — çözmek için Google'a istek gerekirdi", () => {
    red("https://maps.app.goo.gl/AbCdEf123", /Kısa link/);
  });

  test("koordinatsız link", () => {
    red("https://www.google.com/maps/search/kahve", /koordinat yok/);
  });

  test("🔴 kaba koordinat — kafeyi yan mahalleye koyardı", () => {
    red("41.04, 28.98", /çok kaba/);
    red("41.036, 28.98380", /çok kaba/);
  });

  test("🔴 ters girilmiş koordinat (boylam önce) ne olduğu söylenerek reddediliyor", () => {
    red("28.98380, 41.03690", /yer değiştirmiş/);
  });

  test("Türkiye dışı", () => {
    red("48.85837, 2.29448", /Türkiye'de değil/); // Paris
  });

  test("iki sayı değilse", () => {
    red("41.03690", /İki sayı/);
    red("41°02'12.8\"N 28°59'01.7\"E", /İki sayı/);
  });

  test("dünyada olmayan değer", () => {
    red("141.03690, 28.98380", /Geçerli bir koordinat değil/);
  });
});

describe("harita linki (Ü278)", () => {
  test("kaydetmeden önce gözle kontrol için doğru noktayı açıyor", () => {
    assert.equal(
      haritaLinki(41.0369123, 28.9838456),
      "https://www.google.com/maps?q=41.036912,28.983846",
    );
  });
});
