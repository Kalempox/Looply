import type { CSSProperties } from "react";

/**
 * Bağla'nın yüzeyleri — Ü262.
 *
 * Aile koyu arcade sahnesinde ve bu dosya aynı derinliği kuruyor.
 * Ayırt edici renk **krem**: `oyuncu-renk.ts`'te oyunun kimliği o.
 *
 * ── 🔴 Yol renkleri oyunun DİLİ ─────────────────────────────
 *
 * Oyuncu hangi ucun hangi uca gideceğini **yalnızca** renkten okuyor.
 * Ayır'da (Ü261) aynı kural vardı ve orada gözle seçilen palet renk
 * körlüğü benzetiminde çökmüştü (deuteranopide ΔE 6,8). Burada o ders
 * baştan uygulandı: palet seçilmedi, **arandı**.
 */

export const BAGLA_RENK = {
  isik: "#f0d9a8",
  derin: "#101a30",
} as const;

/**
 * Yol renkleri — kod 1..6.
 *
 * 32 tonluk **canlı** havuzdan, üç görme biçiminde (normal ·
 * deuteranopi · protanopi) en yakın çiftin ΔE'sini birlikte en büyük
 * yapan altılı arandı; sahnenin zemini de aramaya girdi.
 *
 *   en zayıf halka: **36,2**  (normal 51,6 · deuteranopi 36,2 ·
 *   protanopi 37,1)
 *
 * ⚠️ Dört ton Ayır'ınkiyle aynı ve bu bir kopyalama değil: aynı ölçüte
 * göre aranan altı **canlı** rengin tavanı bu. Sekiz renk denendi,
 * arama ancak beyaz/gri/kahve katarak çözebildi (32,8) — o yüzden
 * motorun renk sınırı altıya indi.
 *
 * ⚠️ Sıra ölçüm: bölüm 1'de yalnızca **üç** renk var, o yüzden kod
 * 1-2-3 en ayrışan üçlü (ΔE 49,4).
 *
 * Test `oyun-motoru.test.ts` içinde ve palet değişirse düşer.
 */
const YOLLAR = [
  "#34d399", // 1 zümrüt  ┐
  "#f97316", // 2 turuncu ├ ilk üç: en ayrışan üçlü (ΔE 49,4)
  "#1d4ed8", // 3 çivit   ┘
  "#fde047", // 4 sarı
  "#38bdf8", // 5 gök
  "#be123c", // 6 vişne
] as const;

export const BAGLA_RENK_SAYISI = YOLLAR.length;

/** Bir renk kodunun tonu. Kod 1'den başlıyor. */
export function baglaYolRengi(kod: number): string {
  return YOLLAR[Math.min(YOLLAR.length, Math.max(1, kod)) - 1];
}

/** Sahne — ailenin koyu zemini, kreme kayan bulut. */
export function baglaSahnesi(): CSSProperties {
  return {
    background:
      "radial-gradient(120% 80% at 50% -10%, #1e2b4d 0%, #101a30 45%, #070c18 100%)",
  };
}

/**
 * Tahtanın çerçevesi.
 *
 * ⚠️ Izgara çizgileri **soluk**: oyuncunun okuması gereken şey kareler
 * değil, yolların gidişatı. Çizgi kuvvetlenirse tahta bir tablo gibi
 * görünüyor ve yollar onun üstünde yabancı kalıyor.
 */
export function baglaTahtasi(): CSSProperties {
  return {
    background: "rgb(0 0 0 / .28)",
    border: "2px solid rgb(240 217 168 / .26)",
    borderRadius: 16,
    boxShadow: "inset 0 0 40px rgb(0 0 0 / .45)",
  };
}

/** Tek kare. */
export function baglaKaresi(): CSSProperties {
  return {
    border: "1px solid rgb(255 255 255 / .07)",
    borderRadius: 6,
  };
}

/** HUD hapı — ailenin öteki ekranlarıyla aynı. */
export function baglaPanel(): CSSProperties {
  return {
    background: "rgb(0 0 0 / .32)",
    border: "1px solid rgb(240 217 168 / .22)",
    borderRadius: 999,
  };
}

/**
 * Kalan hak göstergesi — azaldıkça ısınıyor.
 *
 * Ayır'la (Ü261) aynı kural: hak turun tek kaynağı ve oyuncunun ona
 * bakmadan da azaldığını hissetmesi gerekiyor.
 */
export function baglaHakRengi(kalan: number): string {
  if (kalan <= 4) return "#fb7185";
  if (kalan <= 8) return "#fbbf24";
  return "#ffffff";
}
