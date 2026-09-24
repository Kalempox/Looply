import jsQR from "jsqr";

/**
 * Kasanın yedek karekod okuyucusu — Ü283.
 *
 * Tarayıcının kendi dedektörü (`BarcodeDetector`) Chrome/Android'de var,
 * Safari/iPhone'da yok. Ürün sahibi kasayı iPhone'la denedi ve kamera
 * açılmadı; altı haneli kodu elle yazmak kasada tek yol kalıyordu. Kamera
 * karesi burada jsQR ile (ZXing algoritmasının JS portu) çözülüyor.
 *
 * Kasa bileşeni bu modülü yalnızca dedektörü olmayan tarayıcıda, kamera
 * açılınca yüklüyor — Android'in paketine girmiyor.
 */

/**
 * Çözülen karenin kenarı (piksel).
 *
 * Kupon karekodu sürüm 3 (29 modül, M). Telefon ekranı 20 cm'den
 * tutulduğunda karekod 1280×720 karede ~175 piksel; orta kare 640'a
 * inince modül başına ~5 piksel kalıyor — jsQR'ın rahat okuduğu yer.
 * Bütün kareyi çözmek yavaşlatır, bu yüzden yalnızca orta kare.
 */
export const KARE_KENARI = 640;

/** Kameranın orta karesi ve çizileceği boy. */
export function ortaKare(genislik: number, yukseklik: number) {
  const kenar = Math.min(genislik, yukseklik);
  return {
    sx: (genislik - kenar) / 2,
    sy: (yukseklik - kenar) / 2,
    kenar,
    hedef: Math.min(kenar, KARE_KENARI),
  };
}

/**
 * Bir kareden karekodun değeri; okunamazsa `null`.
 *
 * Kupon karekodu ekranda beyaz zeminde koyu çiziliyor (`oduller/[kuponId]`),
 * ters renk denemesi gereksiz ve her kareyi iki kat yavaşlatırdı.
 */
export function kareCoz(rgba: Uint8ClampedArray, genislik: number, yukseklik: number): string | null {
  return jsQR(rgba, genislik, yukseklik, { inversionAttempts: "dontInvert" })?.data || null;
}
