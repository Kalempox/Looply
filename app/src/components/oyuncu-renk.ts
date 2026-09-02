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

export type OyuncuRengi = "kahve" | "buz" | "yesil" | "pembe" | "menekse" | "amber" | "gok";

/**
 * Oyuncu tarafındaki kartın yüzeyi — Ü67, Ü70, Ü71.
 *
 * ── Nasıl buraya gelindi ────────────────────────────────────
 *
 * Ü67'de zemin soldan sağa açılan bir gradyandı: solda renk, sağda
 * beyaz. Ü69-70'te kupon bileti dört stil denemesinden geçti ve ürün
 * sahibi **açık zeminli ışın** stilinde karar kıldı — zemin kuponun
 * kendi renginde, üstünde çok soluk bir ışın dokusu.
 *
 * Ü71'de o dil **bütün kartlara** yayıldı: *"bu dili diğer kartlara da
 * yay."* Fırsat kartı, oyun kartı, sayfa başlığı, profildeki kafe
 * kartı — hepsi artık aynı yüzeyi paylaşıyor.
 *
 * ── Neden tek fonksiyon ─────────────────────────────────────
 *
 * Zemin, çerçeve ve ışın üçlüsü altı ayrı dosyada elle yazılıydı ve
 * biletin tonu her değiştiğinde altısını da güncellemek gerekiyordu.
 * Artık kartın yüzeyi tek yerden geliyor; bilet neye benziyorsa
 * ekrandaki her kart ona benziyor.
 *
 * ── Aynı hue, iki durak ─────────────────────────────────────
 *
 * `canli` tonundan onun %44'üne iniyor. Ayrı bir "açık" paleti tutmaya
 * gerek yok — parlaklık farkı yetiyor ve renk ailesi bozulmuyor.
 */
export function kartZemin(renk: OyuncuRengi): string {
  const r = RENK[renk];
  return `linear-gradient(150deg, ${r.canli} 0%, ${r.canli}70 100%)`;
}

/** Kartın çerçevesi — zeminle aynı aileden, biraz koyu. */
export function kartKenar(renk: OyuncuRengi): string {
  return `${RENK[renk].ana}40`;
}

/**
 * Işın dokusu.
 *
 * ⚠️ İki değer birden düşürüldü (Ü70). Tek başına opaklığı kısmak
 * yetmedi: 0.08'de bile doygun bir zeminin üstünde ışınlar **çizgili
 * kumaş** gibi okunuyordu. Seyreltilince (3° dolu, 20° boş) desen
 * olmaktan çıkıp yüzeye düşen ışığa dönüştü.
 *
 * Kaldırılmadı, azaltıldı: kartların ana ekrandaki koyu durum kartıyla
 * akrabalığını kuran tek detay bu.
 */
export const ISIN_OPAKLIK = 0.05;
export const ISIN_DOKUSU =
  "repeating-conic-gradient(from 0deg, #fff 0deg 3deg, transparent 3deg 20deg)";

export type RenkTonu = {
  zemin: string;
  ana: string;
  koyu: string;
  canli: string;
};

export const RENK: Record<OyuncuRengi, RenkTonu> = {
  /* Sıcak içecek — Ü69. Kahvenin kendi rengi. */
  kahve: { zemin: "#f4eae1", ana: "#8a5a33", koyu: "#5c3a1e", canli: "#c08b5c" },
  /* Soğuk içecek — Ü74. Buzlu camın rengi. */
  buz: { zemin: "#e2f5fb", ana: "#3f9ec0", koyu: "#1a6a86", canli: "#8fd8ee" },
  /* Doğrudan tutar kuponu — para yeşili. */
  yesil: { zemin: "#e3f4e8", ana: "#15803d", koyu: "#14532d", canli: "#4ade80" },
  /* Tatlı — koyu pembe. */
  pembe: { zemin: "#fde7f0", ana: "#be185d", koyu: "#831843", canli: "#f472b6" },
  menekse: { zemin: "#f1ecfe", ana: "#7c3aed", koyu: "#5b21b6", canli: "#a78bfa" },
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
 *
 * Düşen Ü69'da gülden **pembeye** geçti: kupon paleti koyu pembeyi
 * aldığında iki yakın ton yan yana gelirdi ve altı renk yerine beş
 * tutmak, ayırt edilebilirliği artırıyor.
 */
export const OYUN_RENGI: Record<string, OyuncuRengi> = {
  blok: "gok",
  kelime: "menekse",
  dusen: "pembe",
  // Ü91: yılan yeşil. Kalan iki ton (kahve, amber) kupon kategorilerinin
  // — sıcak içecek ve yiyecek — ve oyun rengiyle karışmamalılar.
  yilan: "yesil",
};

export function oyunRengi(oyunId: string): OyuncuRengi {
  return OYUN_RENGI[oyunId] ?? "menekse";
}

/*
 * Kupon rengi burada değil, `oyuncu-gorsel.ts`'te (`GORSEL_RENGI`).
 *
 * Ü65'te renk kuponun **teknik tipinden** (ürün/yüzde/tutar) geliyordu
 * ve "Tatlıda %10 indirim" menekşe çıkıyordu: ekranda pasta çizimi,
 * kenarında mor bir şerit. Ü67'de renk gördüğün şeyden türüdü ve Ü69'da
 * ürün sahibi tonları kendisi seçti — **sıcak içecek kahverengi, tatlı
 * koyu pembe, doğrudan tutar kuponu koyu yeşil.** Üçü de gerçek
 * nesnenin rengi; öğrenilecek bir eşleme kalmıyor.
 */
