import "../scripts/_env";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { icindeMi, pencereYaz, retCumlesi, serbestMi, istanbulGunu } from "@/domain/kullanim-penceresi";

/**
 * Kullanım penceresi (Ü103).
 *
 * ⚠️ Bu kısıt oyuncuya GÖSTERİLİYOR — E9 ve Ü97'nin sakladıklarından
 * farklı olarak, bilinmezse oyuncunun elindeki şey işe yaramıyor. O yüzden
 * sınanan şey yalnızca kontrol değil, **cümlenin doğruluğu** da.
 */

/** İstanbul saatiyle belirli bir an. */
function an(gunIso: string, saat: number): Date {
  return new Date(`${gunIso}T${String(saat).padStart(2, "0")}:00:00+03:00`);
}

// 2026-09-10 perşembe, 2026-09-12 cumartesi, 2026-09-13 pazar
const PERSEMBE = "2026-09-10";
const CUMARTESI = "2026-09-12";
const PAZAR = "2026-09-13";

describe("kullanım penceresi (Ü103)", () => {
  test("gün numaraları Postgres dow düzeninde", () => {
    // 0 = Pazar … 6 = Cumartesi. İki taraf aynı sayıyı kullanmalı, yoksa
    // panelde seçilen gün ile kasada sınanan gün ayrışır.
    assert.equal(istanbulGunu(an(PAZAR, 12)), 0);
    assert.equal(istanbulGunu(an(PERSEMBE, 12)), 4);
    assert.equal(istanbulGunu(an(CUMARTESI, 12)), 6);
  });

  test("🔴 gün UTC'den değil İstanbul'dan okunuyor", () => {
    // Cumartesi 01:00 İstanbul = cuma 22:00 UTC. `getDay()` kullansaydık
    // cumartesi kuponu cuma sanılırdı.
    assert.equal(istanbulGunu(an(CUMARTESI, 1)), 6, "gece yarısından sonra gün kaydı");
  });

  test("kısıtsız pencere serbest sayılıyor ve cümle üretmiyor", () => {
    const p = { gunler: null, baslangicSaati: null, bitisSaati: null };
    assert.equal(serbestMi(p), true);
    assert.equal(pencereYaz(p), null, "kısıt yokken ekranda yer kaplayan cümle çıktı");
    assert.equal(icindeMi(p, an(PAZAR, 3)), true);
  });

  test("yedi günün hepsi seçiliyse kısıt sayılmıyor", () => {
    const p = { gunler: [0, 1, 2, 3, 4, 5, 6], baslangicSaati: null, bitisSaati: null };
    assert.equal(serbestMi(p), true);
    assert.equal(pencereYaz(p), null);
  });

  test("saat penceresi: içeride kabul, dışarıda ret", () => {
    const p = { gunler: null, baslangicSaati: 14, bitisSaati: 17 };
    assert.equal(icindeMi(p, an(PERSEMBE, 13)), false, "başlangıçtan önce kabul edildi");
    assert.equal(icindeMi(p, an(PERSEMBE, 14)), true, "başlangıç anı reddedildi");
    assert.equal(icindeMi(p, an(PERSEMBE, 16)), true);
    assert.equal(icindeMi(p, an(PERSEMBE, 17)), false, "bitiş anı hâlâ açık");
  });

  test("gün penceresi: hafta içi kuponu cumartesi geçmiyor", () => {
    const p = { gunler: [1, 2, 3, 4, 5], baslangicSaati: null, bitisSaati: null };
    assert.equal(icindeMi(p, an(PERSEMBE, 12)), true);
    assert.equal(icindeMi(p, an(CUMARTESI, 12)), false);
  });

  test("hafta içi ve hafta sonu adlarıyla yazılıyor", () => {
    // "Pzt, Sal, Çar, Per, Cum" yerine kafenin kafasındaki kavram.
    assert.equal(
      pencereYaz({ gunler: [1, 2, 3, 4, 5], baslangicSaati: null, bitisSaati: null }),
      "Yalnızca hafta içi",
    );
    assert.equal(
      pencereYaz({ gunler: [0, 6], baslangicSaati: null, bitisSaati: null }),
      "Yalnızca hafta sonu",
    );
    assert.equal(
      pencereYaz({ gunler: [3], baslangicSaati: null, bitisSaati: null }),
      "Yalnızca Çarşamba",
    );
  });

  test("gün ve saat birlikte tek cümlede", () => {
    assert.equal(
      pencereYaz({ gunler: [1, 2, 3, 4, 5], baslangicSaati: 14, bitisSaati: 17 }),
      "hafta içi 14:00–17:00 arası",
    );
  });

  test("🔴 ret cümlesi NE ZAMAN geçerli olduğunu söylüyor", () => {
    // ⚠️ Kasiyer müşteriye bir cevap vermek zorunda; elinde cevap yoksa
    // "sistem kabul etmiyor" der ve suç ürüne kalır.
    const c = retCumlesi({ gunler: [1, 2, 3, 4, 5], baslangicSaati: 14, bitisSaati: 17 });
    assert.ok(/hafta içi/i.test(c), `ret cümlesi pencereyi söylemiyor: ${c}`);
    assert.ok(/14:00/.test(c), `ret cümlesi saati söylemiyor: ${c}`);
  });

  test("gece yarısını aşan pencere kurulamıyor — bilinen sınır", () => {
    // Veritabanı kısıtı bunu zaten reddediyor; burada davranışın ne
    // olduğunu yazıya döküyoruz: 22–02 gibi bir pencere desteklenmiyor
    // (Ü90'daki aynı sınır).
    const p = { gunler: null, baslangicSaati: 22, bitisSaati: 2 };
    assert.equal(icindeMi(p, an(PERSEMBE, 23)), false, "aşan pencere sessizce çalıştı");
  });
});
