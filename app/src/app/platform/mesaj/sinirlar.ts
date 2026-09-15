/**
 * Kampanya metninin sınırı — Ü130.
 *
 * ── ⚠️ Neden kendi dosyasında ───────────────────────────────
 *
 * `actions.ts` bir `"use server"` dosyası ve oradan **yalnızca async
 * fonksiyon** dışa aktarılabiliyor. Sabit orada dururken sayfa 500
 * veriyordu ve `tsc` bunu yakalamıyor: Next'in çalışma zamanı kuralı,
 * tip kuralı değil. Hata ancak sayfa gerçekten açılınca göründü.
 *
 * Formun (istemci) ve eylemin (sunucu) paylaştığı her şey böyle saf bir
 * dosyada durmalı — `domain/karekod-turu.ts` aynı sebeple ayrılmıştı.
 *
 * ── Neden 240 ──────────────────────────────────────────────
 *
 * Çıkma cümlesi (~45 karakter) şablonda ekleniyor ve toplam 160'ı
 * geçince SMS ikiye bölünüp maliyeti katlıyor. 240, iki parçalık bir
 * mesajın içinde kalan üst sınır; formda gidecek metnin tamamı ve kaç
 * parça olduğu zaten gösteriliyor.
 */
export const EN_UZUN_METIN = 240;
