/**
 * Aydınlatma metninin sürümü — Ü112.
 *
 * ── Neden kendi dosyasında ──────────────────────────────────
 *
 * Aynı gerçek iki yerde duruyordu ve **ayrıştı**: rıza kayıtlarına yazılan
 * sürüm (`domain/player.ts` → `RIZA_SURUMU`) ile ekranda görünen "son
 * güncelleme" tarihi (`app/aydinlatma/page.tsx`) ayrı ayrı elle yazılmıştı.
 * Ü111'de metin üç yerde değişti; ikisi de güncellenmedi.
 *
 * Sonucu şu olurdu: oyuncu **bugünkü** metni okuyup onaylıyor, defterde
 * **ağustostaki** metnin sürümü yazıyor. Rıza kaydının tek işi "hangi metne
 * onay verildi" sorusunu cevaplamak; yanlış sürüm yazan bir kayıt, hiç
 * kayıt tutmamaktan daha kötü çünkü doğruymuş gibi duruyor.
 *
 * Artık tarih **sürümden türüyor**: ikisi tanım gereği aynı, ayrışamazlar.
 *
 * ── ⚠️ Metin değişince buranın da değişmesi gerekiyor ───────
 *
 * Bu hâlâ elle yapılan bir iş. Metni değiştiren kişi sürümü de artırmalı.
 * Aşağıdaki test bunu kısmen koruyor: sürüm biçimi sabit ve tarih ondan
 * okunuyor, yani "sürümü unuttum ama tarihi yazdım" hâli imkânsız.
 */

/**
 * Sürüm etiketi — rıza defterine bu yazılıyor.
 *
 * Biçim: `v<numara>-<durum>-<YYYY-MM-DD>`. Tarih kısmı ekranda gösterilen
 * "son güncelleme" değeridir.
 *
 * ⚠️ `taslak`: metin **hukuk incelemesinden geçmedi** (S20). Onay gelince
 * `v1-<tarih>` olacak ve o an, mevcut rızaların yenilenip yenilenmeyeceği
 * ayrıca kararlaştırılmalı.
 */
export const RIZA_SURUMU = "v0-taslak-2026-09-24";

/** Sürüm etiketindeki `YYYY-MM-DD`. */
export function rizaTarihiIso(surum: string = RIZA_SURUMU): string {
  const m = surum.match(/(\d{4}-\d{2}-\d{2})$/);
  if (!m) throw new Error(`Rıza sürümü tarih taşımıyor: ${surum}`);
  return m[1];
}

/** Ekranda görünen hâli — "13 Eylül 2026". */
export function rizaTarihiYazi(surum: string = RIZA_SURUMU): string {
  return new Date(`${rizaTarihiIso(surum)}T12:00:00Z`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
