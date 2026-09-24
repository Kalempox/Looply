import { test, describe } from "node:test";
import assert from "node:assert/strict";
import qrUret from "qrcode-generator";
import { kareCoz, ortaKare, KARE_KENARI } from "@/lib/karekod-oku";

/**
 * Kasanın yedek karekod okuyucusu (Ü283).
 *
 * Ürün sahibi kasayı iPhone'la denedi: Safari'de `BarcodeDetector` yok,
 * kamera kuponu okumuyordu. Kare artık jsQR ile çözülüyor. Sınanan şey,
 * **bizim** kupon karekodumuzun (32 karakterlik jeton, M seviyesi — tıpkı
 * `components/karekod.tsx`) okuyucunun ayarlarıyla ve kasanın göreceği
 * boylarda çözüldüğü. Kamera ve iPhone'un kendisi burada yok; o kısım
 * telefonda denenir.
 */

/** `randomToken(24)` biçiminde — 32 karakter base64url. */
const JETONLAR = [
  "q3Xk9vT2mB7nR4sW8yZ1cD5fG0hJ6kL-",
  "A_bC3dE4fG5hI6jK7lM8nO9pQ0rS1tU2",
];

/**
 * Karekodu `kenar`×`kenar` kareye çizer — ekrandaki kupon, kameradan.
 *
 * Kamera beyaz ekranı saf beyaz, siyahı saf siyah görmüyor; `zemin` ve
 * `koyu` o soluk hâli, `parazit` sensör gürültüsü.
 */
function kare(
  jeton: string,
  modulPiksel: number,
  opts: { kenar?: number; zemin?: number; koyu?: number; parazit?: number } = {},
): Uint8ClampedArray {
  const { kenar = KARE_KENARI, zemin = 255, koyu = 0, parazit = 0 } = opts;
  const qr = qrUret(0, "M");
  qr.addData(jeton);
  qr.make();
  const n = qr.getModuleCount();
  const bas = Math.floor((kenar - n * modulPiksel) / 2);
  assert.ok(bas >= 4 * modulPiksel, "sessiz alan kareye sığmıyor");

  // Tohumlu gürültü — test her koşuda aynı kareyi görsün.
  let tohum = 7;
  const rastgele = () => ((tohum = (tohum * 1103515245 + 12345) % 2 ** 31) / 2 ** 31) * 2 - 1;

  const veri = new Uint8ClampedArray(kenar * kenar * 4);
  for (let y = 0; y < kenar; y++) {
    for (let x = 0; x < kenar; x++) {
      const r = Math.floor((y - bas) / modulPiksel);
      const c = Math.floor((x - bas) / modulPiksel);
      const icinde = r >= 0 && c >= 0 && r < n && c < n;
      const deger = (icinde && qr.isDark(r, c) ? koyu : zemin) + rastgele() * parazit;
      const i = (y * kenar + x) * 4;
      veri[i] = veri[i + 1] = veri[i + 2] = deger;
      veri[i + 3] = 255;
    }
  }
  return veri;
}

describe("kasanın yedek karekod okuyucusu (Ü283)", () => {
  test("kupon karekodu sürüm 3 — ayar bu boya göre", () => {
    const qr = qrUret(0, "M");
    qr.addData(JETONLAR[0]);
    qr.make();
    assert.equal(qr.getModuleCount(), 29);
  });

  test("🔴 telefon ekranı 20 cm'den: modül başına ~5 piksel okunuyor", () => {
    for (const jeton of JETONLAR) assert.equal(kareCoz(kare(jeton, 5), KARE_KENARI, KARE_KENARI), jeton);
  });

  test("uzaktan tutulan telefon: modül başına 3 piksel de okunuyor", () => {
    assert.equal(kareCoz(kare(JETONLAR[0], 3), KARE_KENARI, KARE_KENARI), JETONLAR[0]);
  });

  test("soluk, parazitli ekran okunuyor", () => {
    const k = kare(JETONLAR[1], 4, { zemin: 205, koyu: 55, parazit: 25 });
    assert.equal(kareCoz(k, KARE_KENARI, KARE_KENARI), JETONLAR[1]);
  });

  test("karekodsuz kare null — boş kare kasaya bir şey göndermiyor", () => {
    const bos = new Uint8ClampedArray(KARE_KENARI * KARE_KENARI * 4).fill(230);
    assert.equal(kareCoz(bos, KARE_KENARI, KARE_KENARI), null);
  });

  test("orta kare: yatay ve dikey kamera, küçültme yalnızca gerekince", () => {
    assert.deepEqual(ortaKare(1280, 720), { sx: 280, sy: 0, kenar: 720, hedef: KARE_KENARI });
    assert.deepEqual(ortaKare(720, 1280), { sx: 0, sy: 280, kenar: 720, hedef: KARE_KENARI });
    assert.deepEqual(ortaKare(640, 480), { sx: 80, sy: 0, kenar: 480, hedef: 480 });
  });
});
