/**
 * Oyuncu tarafının renk ailesi — Ü65.
 *
 * ── Neden bu renkler ────────────────────────────────────────
 *
 * Çarkın dilimlerinden geliyorlar. Ürün sahibi *"çarkı referans al"*
 * dediğinde kastettiği buydu ve ilk denemede yanlış anladım: çarkın
 * **arka fonunu** (koyu mor sahne) alıp her ekrana yapıştırdım. Oysa
 * çarkın kendisi aydınlık ve altı renkli; koyu olan yalnızca üstünde
 * durduğu sahne.
 *
 * Ürün sahibinin düzeltmesi: *"her yere bu mor efekti koyma, daha
 * renkli daha eğlenceli olmalı."*
 *
 * ── `cark.tsx`'teki not artık geçersiz ──────────────────────
 *
 * O dosyada "bu renkler yalnızca çarkta geçerli, `globals.css`e jeton
 * olarak konsalardı palet fiilen genişlerdi" yazıyordu. Karar bilerek
 * çevrildi: palet oyuncu tarafında genişledi. Ama söz konusu endişe
 * hâlâ geçerli olduğu için renkler **globals.css'e girmiyor** —
 * burada, tek dosyada duruyorlar ve yalnızca oyuncu ekranları import
 * ediyor. İşletme paneli kendi alan renklerini kullanmaya devam
 * ediyor (Ü63); iki palet birbirine karışmıyor.
 *
 * ── Tonlar ──────────────────────────────────────────────────
 *
 * Her renkte üç ton var ve üçünün de tek bir işi var:
 *
 * - `zemin` — kartın arka planı. Pastel; üstünde koyu metin okunuyor.
 * - `ana`   — çerçeve, ikon, sayı. Beyaz üstünde AA kontrastı geçiyor.
 * - `koyu`  — pastel zeminin üstündeki metin. `ana` çoğu pastelin
 *             üstünde yeterince koyu kalmıyor.
 * - `canli` — koyu zeminde ya da dolgu olarak kullanılan doygun ton.
 */

export type OyuncuRengi = "menekse" | "nane" | "gul" | "amber" | "gok";

export type RenkTonu = {
  zemin: string;
  ana: string;
  koyu: string;
  canli: string;
};

export const RENK: Record<OyuncuRengi, RenkTonu> = {
  menekse: { zemin: "#f1ecfe", ana: "#7c3aed", koyu: "#5b21b6", canli: "#a78bfa" },
  nane: { zemin: "#d9f7ef", ana: "#0d9488", koyu: "#115e59", canli: "#5eead4" },
  gul: { zemin: "#ffe7ec", ana: "#e11d48", koyu: "#9f1239", canli: "#fb7185" },
  amber: { zemin: "#fff2d5", ana: "#c2740a", koyu: "#8a5206", canli: "#fbbf24" },
  gok: { zemin: "#e2f3fd", ana: "#0284c7", koyu: "#075985", canli: "#38bdf8" },
};

/**
 * Oyunların rengi.
 *
 * Her oyunun kendi rengi var ve her yerde aynı: ana ekrandaki karo,
 * oyun kabuğunun başlığı, profildeki geçmiş satırı. Renk oyunun
 * kimliği — oyuncu adı okumadan hangi oyuna baktığını biliyor.
 *
 * Tanınmayan oyun menekşe: yeni bir oyun eklendiğinde ekran renksiz
 * kalmıyor, yalnızca kimliksiz kalıyor.
 */
export const OYUN_RENGI: Record<string, OyuncuRengi> = {
  blok: "gok",
  kelime: "menekse",
  dusen: "gul",
};

export function oyunRengi(oyunId: string): OyuncuRengi {
  return OYUN_RENGI[oyunId] ?? "menekse";
}

/**
 * Kupon cinsinin rengi.
 *
 * Ödüller ekranında beş kupon alt alta duruyordu ve beşi de aynı
 * renkteydi — cüzdan değil, aynı kartın beş kopyası gibi. Cins zaten
 * biliniyor (`EnvanterKuponu.tur`), renk onu görünür yapıyor.
 */
export const TUR_RENGI = {
  urun: "amber",
  yuzde: "menekse",
  tutar: "nane",
} as const satisfies Record<string, OyuncuRengi>;
