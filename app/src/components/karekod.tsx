import qrUret from "qrcode-generator";

/**
 * Karekod — sunucuda SVG olarak üretilir.
 *
 * İstemciye hiçbir JavaScript inmiyor: kod sunucuda hesaplanıp düz SVG
 * olarak gönderiliyor. Kupon ekranı zaten sunucudan geliyor; QR'ı istemcide
 * üretmek için kütüphane indirtmenin bir karşılığı yok.
 *
 * ── İçinde ne var ───────────────────────────────────────────
 *
 * **Yalnızca jeton.** Ödül adı, TL değeri, kafe bilgisi — hiçbiri yok
 * (Ü19, `04-kupon-kullanim-akisi.txt`). Oyuncu QR içeriğini değiştirip
 * "100 TL yerine 1.000 TL" yapamıyor, çünkü değer QR'da hiç durmuyor;
 * kasiyerin ekranındaki her şey sunucudan geliyor.
 *
 * ── Hata düzeltme seviyesi ──────────────────────────────────
 *
 * `M` (~%15). Kafe ışığı loş, ekran parmak izli, telefon titriyor —
 * `L` bu koşullarda okunma oranını düşürürdü. `H` ise kodu gereksiz
 * yoğunlaştırıp küçük ekranda modülleri inceltirdi.
 */
export function Karekod({
  deger,
  boyut = 220,
  etiket,
}: {
  deger: string;
  /** Kenar uzunluğu (piksel). */
  boyut?: number;
  etiket: string;
}) {
  const qr = qrUret(0, "M");
  qr.addData(deger);
  qr.make();

  const modul = qr.getModuleCount();
  // Sessiz alan (quiet zone) — standart dört modül. Olmazsa okuyucular
  // kodun nerede bittiğini anlayamıyor.
  const kenar = 4;
  const toplam = modul + kenar * 2;

  const kareler: string[] = [];
  for (let s = 0; s < modul; s++) {
    for (let k = 0; k < modul; k++) {
      if (qr.isDark(s, k)) {
        kareler.push(`M${k + kenar},${s + kenar}h1v1h-1z`);
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${toplam} ${toplam}`}
      width={boyut}
      height={boyut}
      role="img"
      aria-label={etiket}
      shapeRendering="crispEdges"
    >
      {/* Beyaz zemin şart: sayfa zemini açık gri olduğu için kodun kendi
          sessiz alanı olmadan okuyucu kenarı bulamıyor. */}
      <rect width={toplam} height={toplam} fill="#ffffff" />
      <path d={kareler.join("")} fill="#000000" />
    </svg>
  );
}
