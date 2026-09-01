/**
 * Kart arkası çizimleri — Ü66.
 *
 * ── Ne işe yarıyorlar ───────────────────────────────────────
 *
 * Ürün sahibi: *"tatlı indiriminde tatlı, çay veya kahve indiriminde
 * içecek — indirim ne ile alakalıysa o görünsün; arka planda şeffaf,
 * blurlu gibi."* İkinci bir gerekçe de vardı: kuponlar doygun renkli
 * gradyanlarla *"fazla cırtlak"* duruyordu. Çizim, rengin yükünü
 * alıyor — kart artık rengiyle değil **içeriğiyle** ayrılıyor ve
 * pastel bir zeminle yetiniyor.
 *
 * ── Neden tek renk ──────────────────────────────────────────
 *
 * Hepsi `currentColor` ile çiziliyor ve şeffaflığı katman katman
 * veriyor. Çok renkli olsalardı kartın kendi rengiyle çakışırlardı;
 * tek renk olunca kart hangi renkteyse çizim de o renkte ve %15-20
 * saydamlıkta arka planda kalıyor.
 *
 * Bulanıklaştırma (`filter: blur`) denendi ve bırakıldı: küçük
 * ekranda çizimi lekeye çeviriyor, üstelik her karede yeniden
 * hesaplanan bir filtre. Düşük saydamlık aynı "arkada duruyor"
 * hissini bedavaya veriyor.
 *
 * ── Fotoğraf değil çizim ────────────────────────────────────
 *
 * Ürün fotoğrafı daha zengin olurdu ama kafenin kendi ürününün
 * fotoğrafı yok; stok fotoğraf da "bu bardağı mı alacağım" diye
 * okunur ve kupon yanlış bir şey vaat etmiş olur. Çizim, cinsi
 * söylüyor, ürünü değil.
 */

export type GorselAdi =
  | "kahve"
  | "cay"
  | "soguk"
  | "tatli"
  | "atistirmalik"
  | "yuzde"
  | "para"
  | "hediye"
  | "blok"
  | "kelime"
  | "dusen"
  | "alev"
  | "cark";

/**
 * Kupon başlığından çizim seçer.
 *
 * ── Sıra önemli ─────────────────────────────────────────────
 *
 * Ürün anahtar kelimeleri **önce** bakılıyor: "Tatlıda %10 indirim"
 * hem tatlı hem yüzde içeriyor ve ürün sahibinin istediği tatlı.
 * Yüzde ile TL en sonda, yalnızca hiçbir ürün tutmadığında.
 *
 * Türkçe küçültme `toLocaleLowerCase("tr")` ile: varsayılan küçültme
 * "ÇAY"ı doğru çeviriyor ama "IŞIL" gibi başlıklarda I harfini "i"ye
 * düşürüyor ve eşleşme kayıyor.
 */
const ESLESME: [GorselAdi, string[]][] = [
  [
    "kahve",
    ["kahve", "espresso", "latte", "americano", "filtre", "cappuccino", "mocha", "macchiato", "cortado", "flat white"],
  ],
  ["cay", ["çay", "demleme", "bitki"]],
  [
    "soguk",
    ["limonata", "smoothie", "soğuk", "buzlu", "milkshake", "frappe", "kola", "ayran", "meşrubat", "meyve suyu", "ice"],
  ],
  [
    "tatli",
    ["tatlı", "kek", "cheesecake", "brownie", "kurabiye", "pasta", "waffle", "dondurma", "sufle", "muffin", "tiramisu", "profiterol", "magnolia"],
  ],
  [
    "atistirmalik",
    ["tost", "sandviç", "sandvic", "bagel", "kruvasan", "poğaça", "simit", "börek", "salata", "kahvaltı", "wrap", "makarna"],
  ],
];

export function gorselSec(metin: string): GorselAdi {
  const m = metin.toLocaleLowerCase("tr");
  for (const [ad, kelimeler] of ESLESME) {
    if (kelimeler.some((k) => m.includes(k))) return ad;
  }
  if (m.includes("%")) return "yuzde";
  if (m.includes("tl") || m.includes("indirim")) return "para";
  return "hediye";
}

/**
 * Oyunun kart arkasındaki çizimi.
 *
 * `oyuncu-renk.ts`'teki `OYUN_RENGI` ile aynı mantık: eşleşme tek
 * yerde duruyor, çünkü ana ekran, katalog ve oyun kabuğu aynı oyuna
 * aynı çizimi vermek zorunda.
 */
export const OYUN_GORSELI: Record<string, GorselAdi> = {
  blok: "blok",
  kelime: "kelime",
  dusen: "dusen",
};

export function oyunGorseli(oyunId: string): GorselAdi {
  return OYUN_GORSELI[oyunId] ?? "blok";
}

/* ── Çizimler ──────────────────────────────────────────────── */

export function Gorsel({
  ad,
  boy = 120,
  className = "",
}: {
  ad: GorselAdi;
  boy?: number;
  className?: string;
}) {
  return (
    <svg
      width={boy}
      height={boy}
      viewBox="0 0 120 120"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      {CIZIM[ad]}
    </svg>
  );
}

/*
 * Çizimler modül seviyesinde sabit elemanlar.
 *
 * Bileşen değil eleman: her biri tek seferlik ve `Gorsel` içinde
 * doğrudan gömülüyor. Bileşen olsalardı her çağrıda yeni bir tip
 * yaratılır, React ağacı gereksiz yere yeniden kurulurdu.
 */
const CIZIM: Record<GorselAdi, React.ReactElement> = {
  /** Fincan, tabak, buhar. */
  kahve: (
    <g>
      <path d="M26 44h56v26a26 26 0 0 1-26 26h-4a26 26 0 0 1-26-26V44Z" opacity="0.55" />
      <path
        d="M82 52h9a15 15 0 0 1 0 30h-9v-8h9a7 7 0 0 0 0-14h-9v-8Z"
        opacity="0.35"
      />
      <rect x="16" y="100" width="80" height="8" rx="4" opacity="0.4" />
      <path
        d="M44 32c-6-6 4-10-2-16M60 32c-6-6 4-10-2-16M76 32c-6-6 4-10-2-16"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
    </g>
  ),

  /** İnce belli çay bardağı — tabak ve kaşık. */
  cay: (
    <g>
      <path
        d="M40 24h40l-5 20c-4 5-4 11 0 16l5 20H40l5-20c4-5 4-11 0-16L40 24Z"
        opacity="0.5"
      />
      <path d="M43 34h34l-3 12H46l-3-12Z" opacity="0.35" />
      <ellipse cx="60" cy="88" rx="34" ry="8" opacity="0.4" />
      <path
        d="M92 66c8 4 8 14 0 18"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
    </g>
  ),

  /** Uzun bardak, pipet, buz. */
  soguk: (
    <g>
      <path d="M32 28h56l-7 74a8 8 0 0 1-8 7H47a8 8 0 0 1-8-7L32 28Z" opacity="0.45" />
      <rect x="60" y="8" width="8" height="34" rx="4" transform="rotate(14 64 25)" opacity="0.4" />
      <rect x="44" y="44" width="16" height="16" rx="3" opacity="0.3" />
      <rect x="64" y="58" width="14" height="14" rx="3" opacity="0.3" />
      <rect x="48" y="70" width="13" height="13" rx="3" opacity="0.3" />
    </g>
  ),

  /** Pasta dilimi — katlar ve vişne. */
  tatli: (
    <g>
      <path d="M20 60h80l-6 40a8 8 0 0 1-8 7H34a8 8 0 0 1-8-7L20 60Z" opacity="0.45" />
      <path
        d="M20 60c0-12 18-20 40-20s40 8 40 20c-8 8-24 12-40 12s-32-4-40-12Z"
        opacity="0.55"
      />
      <rect x="26" y="76" width="68" height="7" rx="3.5" opacity="0.3" />
      <circle cx="60" cy="26" r="10" opacity="0.5" />
      <path
        d="M60 16c2-8 8-10 12-9"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.35"
      />
    </g>
  ),

  /** Tost — üçgen dilim, kabuk. */
  atistirmalik: (
    <g>
      <path d="M14 88 60 20l46 68a6 6 0 0 1-5 9H19a6 6 0 0 1-5-9Z" opacity="0.5" />
      <path d="M32 78 60 38l28 40H32Z" opacity="0.3" />
      <circle cx="52" cy="66" r="5" opacity="0.4" />
      <circle cx="68" cy="60" r="4" opacity="0.4" />
    </g>
  ),

  /** Yüzde işareti — etiketin içinde. */
  yuzde: (
    <g>
      <path
        d="M62 14h40a6 6 0 0 1 6 6v40a8 8 0 0 1-2.3 5.7l-40 40a8 8 0 0 1-11.4 0L20 71.7a8 8 0 0 1 0-11.4l40-40A8 8 0 0 1 62 14Z"
        opacity="0.35"
      />
      <circle cx="92" cy="30" r="6" opacity="0.5" />
      <path
        d="M74 44 46 72"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      <circle cx="48" cy="46" r="8" fill="none" stroke="currentColor" strokeWidth="6" opacity="0.55" />
      <circle cx="72" cy="70" r="8" fill="none" stroke="currentColor" strokeWidth="6" opacity="0.55" />
    </g>
  ),

  /** Bozuk para yığını. */
  para: (
    <g>
      <ellipse cx="60" cy="88" rx="38" ry="13" opacity="0.5" />
      <rect x="22" y="66" width="76" height="22" opacity="0.5" />
      <ellipse cx="60" cy="66" rx="38" ry="13" opacity="0.6" />
      <ellipse cx="60" cy="46" rx="30" ry="11" opacity="0.4" />
      <rect x="30" y="30" width="60" height="16" opacity="0.3" />
      <ellipse cx="60" cy="30" rx="30" ry="11" opacity="0.45" />
    </g>
  ),

  /** Hediye kutusu — cinsi bilinmeyen ödül. */
  hediye: (
    <g>
      <rect x="18" y="46" width="84" height="58" rx="6" opacity="0.45" />
      <rect x="12" y="30" width="96" height="22" rx="6" opacity="0.55" />
      <rect x="52" y="30" width="16" height="74" opacity="0.35" />
      <path
        d="M60 30c-8-16-28-18-28-5 0 8 13 8 28 5Zm0 0c8-16 28-18 28-5 0 8-13 8-28 5Z"
        opacity="0.4"
      />
    </g>
  ),

  /** Blok — yerleşmiş parçalar. */
  blok: (
    <g>
      <rect x="14" y="14" width="30" height="30" rx="6" opacity="0.5" />
      <rect x="48" y="14" width="30" height="30" rx="6" opacity="0.3" />
      <rect x="14" y="48" width="30" height="30" rx="6" opacity="0.3" />
      <rect x="48" y="48" width="30" height="30" rx="6" opacity="0.55" />
      <rect x="82" y="48" width="24" height="30" rx="6" opacity="0.35" />
      <rect x="48" y="82" width="30" height="24" rx="6" opacity="0.4" />
    </g>
  ),

  /** Kelime — harf taşları. */
  kelime: (
    <g>
      <rect x="10" y="40" width="34" height="34" rx="7" opacity="0.5" />
      <rect x="48" y="24" width="34" height="34" rx="7" opacity="0.35" />
      <rect x="48" y="64" width="34" height="34" rx="7" opacity="0.45" />
      <rect x="86" y="48" width="26" height="34" rx="7" opacity="0.3" />
      <rect x="18" y="54" width="18" height="6" rx="3" opacity="0.55" />
      <rect x="56" y="38" width="18" height="6" rx="3" opacity="0.5" />
      <rect x="56" y="78" width="18" height="6" rx="3" opacity="0.5" />
    </g>
  ),

  /** Düşen — inen parça ve duvar. */
  dusen: (
    <g>
      <rect x="44" y="8" width="34" height="18" rx="4" opacity="0.45" />
      <path
        d="M61 32v12"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="6 8"
        fill="none"
        opacity="0.35"
      />
      <rect x="10" y="54" width="46" height="22" rx="4" opacity="0.45" />
      <rect x="60" y="54" width="50" height="22" rx="4" opacity="0.3" />
      <rect x="10" y="82" width="26" height="22" rx="4" opacity="0.3" />
      <rect x="40" y="82" width="46" height="22" rx="4" opacity="0.5" />
      <rect x="90" y="82" width="20" height="22" rx="4" opacity="0.35" />
    </g>
  ),

  /** Alev — günlük seri. */
  alev: (
    <g>
      <path
        d="M60 8c18 18 32 30 32 54a32 32 0 0 1-64 0c0-11 4-19 11-27 1 8 5 13 10 16-3-16 3-31 11-43Z"
        opacity="0.45"
      />
      <path d="M60 58c9 9 15 15 15 25a15 15 0 0 1-30 0c0-8 5-14 15-25Z" opacity="0.35" />
    </g>
  ),

  /** Çark. */
  cark: (
    <g>
      <circle cx="60" cy="62" r="46" opacity="0.3" />
      <circle cx="60" cy="62" r="34" opacity="0.35" />
      <path
        d="M60 28v68M30 45l60 34M30 79l60-34"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      <circle cx="60" cy="62" r="9" opacity="0.6" />
    </g>
  ),
};
