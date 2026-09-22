/**
 * Türkçe adı adres parçasına çevirir.
 *
 * ── Neden ayrı dosya ────────────────────────────────────────
 *
 * Ü247'ye kadar `domain/cafe.ts` içinde özeldi ve tek çağıranı vardı
 * (kafe slug'ı). Basılı karekod kodu da aynı dönüşümü istiyor:
 * *"Kahve Durağı"* → `kahve-duragi`. İki yere ayrı ayrı yazılsaydı
 * biri güncellenmeden kalırdı — bu projede o hatanın adı var (Ü71).
 *
 * ⚠️ Veritabanına dokunmuyor, bu yüzden `domain/` değil `lib/`.
 */

/**
 * Türkçe harfler ASCII karşılığına iniyor.
 *
 * ⚠️ `İ` → `i`: JavaScript'in `toLowerCase()`i onu `i̇` (nokta ayrı bir
 * birleşen olarak) yapıyor ve sonuç adreste iki karaktere dönüşüyor.
 * Haritadan geçirmek bunu kaynağında çözüyor.
 */
const HARITA: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
  Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
};

export function slugla(ad: string, enFazla = 32): string {
  return ad
    .split("")
    .map((h) => HARITA[h] ?? h)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, enFazla)
    /* ⚠️ Kırpma sona tire bırakmış olabilir; biçim kısıtı (ve okunuş)
       tireyle biten bir kodu kabul etmiyor. */
    .replace(/-$/, "");
}
