import "../scripts/_env";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { redact } from "@/lib/log";

/**
 * FAZ 2 GÜVENLİK KAPISI — loglarda kişisel veri yok.
 *
 * docs/08 §7.1'deki yasaklı alan listesi burada çalıştırılabilir hâle geliyor.
 * Kural iyi niyete bırakılmıyor: geliştirme ortamında yasaklı bir alan
 * loglanmaya çalışıldığında redact() hata fırlatır.
 */

describe("log koruması", () => {
  test("yasaklı alanlar geliştirmede hata fırlatır", () => {
    const yasakli = [
      { phone: "+905321234567" },
      { first_name: "Ahmet" },
      { last_name: "Yılmaz" },
      { otp: "123456" },
      { token: "abc" },
      { pin: "1234" },
      { lat: 41.0369 },
      { authorization: "Bearer x" },
    ];

    for (const girdi of yasakli) {
      const alan = Object.keys(girdi)[0];
      assert.throws(() => redact(girdi), /Log kuralı ihlali/, `"${alan}" geçmemeliydi`);
    }
  });

  test("iç içe nesnelerde de yakalar", () => {
    assert.throws(
      () => redact({ istek: { kullanici: { phone: "+905321234567" } } }),
      /Log kuralı ihlali/,
    );
  });

  test("serbest metinde telefon numarası maskelenir", () => {
    const bicimler = [
      "kullanıcı +905321234567 giriş yaptı",
      "numara 0532 123 45 67 doğrulandı",
      "05321234567 için kod gönderildi",
      "hata: 532-123-45-67 bulunamadı",
    ];

    for (const metin of bicimler) {
      const sonuc = redact({ mesaj: metin }) as { mesaj: string };
      assert.ok(sonuc.mesaj.includes("[telefon]"), `maskelenmedi: ${metin}`);
      assert.ok(!/\d{10}/.test(sonuc.mesaj.replace(/\D/g, "")), `rakamlar kaldı: ${sonuc.mesaj}`);
    }
  });

  test("zararsız alanlar olduğu gibi geçer", () => {
    const sonuc = redact({
      cafe_id: "cafe_abc",
      player_alias: "P-4F2A",
      action: "coupon.redeem",
      amount_kurus: 4500,
      basarili: true,
    });
    assert.deepEqual(sonuc, {
      cafe_id: "cafe_abc",
      player_alias: "P-4F2A",
      action: "coupon.redeem",
      amount_kurus: 4500,
      basarili: true,
    });
  });

  test("bayt dizileri içeriğiyle loglanmaz", () => {
    const sonuc = redact({ phone_index: Buffer.from("gizli") }) as Record<string, unknown>;
    assert.equal(sonuc.phone_index, "[bayt:5]");
  });
});
