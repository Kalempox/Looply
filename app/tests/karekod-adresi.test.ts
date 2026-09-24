import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { tabanAdres, yerelAgAdresi } from "@/lib/karekod-adresi";

/**
 * Karekodun taşıdığı adres — Ü270 · U3.
 *
 * 🔴 Ürün sahibi paneli bilgisayarda `localhost` ile açtı; ekrandaki
 * karekod `https://localhost:3000/m/…` taşıdı ve telefon "sunucuya
 * bağlanılamadı" dedi. Karekod telefonda okunuyor — "localhost" orada
 * telefonun kendisi.
 */
describe("karekod adresi (Ü270)", () => {
  test("🔴 localhost ağ adresine dönüyor — port korunuyor", () => {
    assert.equal(
      tabanAdres({ host: "localhost:3000", proto: "https", agAdresi: "192.168.1.175" }),
      "https://192.168.1.175:3000",
    );
    assert.equal(
      tabanAdres({ host: "127.0.0.1:3000", proto: "https", agAdresi: "192.168.1.175" }),
      "https://192.168.1.175:3000",
    );
  });

  test("ağ adresiyle açılan panel olduğu gibi kalıyor", () => {
    assert.equal(
      tabanAdres({ host: "192.168.1.175:3000", proto: "https", agAdresi: "192.168.1.175" }),
      "https://192.168.1.175:3000",
    );
  });

  test("sabit taban adres her şeyi geçersiz kılıyor — toptan baskı bununla", () => {
    assert.equal(
      tabanAdres({
        host: "localhost:3000",
        proto: "http",
        sabit: "https://looply.app/",
        agAdresi: "192.168.1.175",
      }),
      "https://looply.app",
    );
  });

  test("canlıda (ağ adresi yok) istek adresine dokunulmuyor", () => {
    assert.equal(
      tabanAdres({ host: "looply.app", proto: "https", agAdresi: null }),
      "https://looply.app",
    );
  });

  test("şema bilinmiyorsa https; çoklu başlıkta ilki", () => {
    assert.equal(tabanAdres({ host: "looply.app", proto: null }), "https://looply.app");
    assert.equal(tabanAdres({ host: "looply.app", proto: "https, http" }), "https://looply.app");
  });

  test("ağ adresi sanal bağdaştırıcıyı değil ev ağını seçiyor", () => {
    const a = yerelAgAdresi();
    // Makineye bağlı; ağ yoksa null dönebilir. Varsa 172.31.x (WSL) olmamalı
    // — bu makinede telefon ona ulaşamıyor — ya da ev ağı yoksa ondan başkası.
    if (a) assert.match(a, /^(192\.168\.|10\.|172\.)/);
  });
});
