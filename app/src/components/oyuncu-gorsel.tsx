/**
 * Kart arkası çizimleri — Ü66, Ü67.
 *
 * ── Ne işe yarıyorlar ───────────────────────────────────────
 *
 * Ürün sahibi: *"tatlı indiriminde tatlı, çay veya kahve indiriminde
 * içecek — indirim ne ile alakalıysa o görünsün; arka planda şeffaf."*
 * Çizim, rengin yükünü alıyor: kart artık yalnızca rengiyle değil
 * **içeriğiyle** ayrılıyor.
 *
 * ── Üç çeşit, daha fazlası değil (Ü67) ──────────────────────
 *
 * İlk sürümde sekiz çeşit vardı: kahve, çay, soğuk içecek, tatlı,
 * atıştırmalık, yüzde, para, hediye. Ürün sahibi sadeleştirdi:
 * *"çay ve kahve ayrı değil, onlarda içecek; tatlılarda tatlı; direkt
 * ücret kuponlarında para. Üç çeşit yeterli."*
 *
 * Doğru karar: sekiz çizimin altısı ayrım yapmıyordu. Oyuncu kupona
 * bakınca "bu içecek mi, tatlı mı, para mı" diye soruyor; "bu latte mi
 * americano mu" diye değil — onu zaten başlık söylüyor.
 *
 * ── Çizim dili ──────────────────────────────────────────────
 *
 * Ürün sahibinin verdiği referanslar (`Downloads/icons`) ince çizgili
 * kontur ikonlar: dolgu yok, sabit kalınlık, yuvarlak uçlar. Buradaki
 * çizimler o dilde. Tek istisna Blok: referansı da dolgu kareler.
 *
 * `currentColor` kullanılıyor, yani kart hangi renkteyse çizim de o
 * renkte. Çok renkli olsalardı kartın kendi rengiyle çakışırlardı.
 *
 * ── Fotoğraf değil çizim ────────────────────────────────────
 *
 * Kafenin kendi ürün fotoğrafı yok; stok fotoğraf "bu bardağı mı
 * alacağım" diye okunur ve kupon yanlış bir şey vaat etmiş olur.
 * Çizim cinsi söylüyor, ürünü değil.
 */

export type GorselAdi =
  /* Kupon ve fırsat kartları */
  | "icecek"
  | "soguk"
  | "tatli"
  | "para"
  /* Oyunlar */
  | "blok"
  | "kelime"
  | "dusen"
  /* Ekran başlıkları — Ü68 */
  | "bilet"
  | "kupa"
  | "madalya"
  | "kumanda"
  | "etiket"
  /* Kutlama */
  | "alev"
  | "cark";

/**
 * Kupon kartında kullanılabilecek dört çeşit.
 *
 * Ü67'de üç çeşitti; Ü74'te **soğuk içecek** ayrıldı. Sıcakla soğuk
 * aynı çizimi paylaşamıyor çünkü kartın verdiği his farklı: birinde
 * buhar, diğerinde buz. Ürün sahibinin isteği de buydu — soğuk kartta
 * "buz efekti" olsun.
 *
 * Dördün ötesine geçilmiyor: kategori sayısı arttıkça `gorselSec()`
 * daha çok kelime tanımak zorunda kalır ve tanımadığında sessizce
 * yanlış çizim koyar.
 */
export type KuponGorseli = "icecek" | "soguk" | "tatli" | "para";

/**
 * Kupon başlığından çizim seçer.
 *
 * ── Sıra önemli ─────────────────────────────────────────────
 *
 * Ürün anahtar kelimeleri **önce** bakılıyor: "Tatlıda %10 indirim"
 * hem tatlı hem indirim içeriyor ve ürün sahibinin istediği tatlı.
 * Para en sonda, yalnızca hiçbir ürün tutmadığında — "50 TL indirim"
 * gibi doğrudan tutar kuponlarında.
 *
 * Türkçe küçültme `toLocaleLowerCase("tr")` ile: varsayılan küçültme
 * "IŞIL" gibi başlıklarda I harfini "i"ye düşürüp eşleşmeyi kaydırıyor.
 */
const ESLESME: [KuponGorseli, string[]][] = [
  [
    "tatli",
    ["tatlı", "kek", "cheesecake", "brownie", "kurabiye", "pasta", "waffle", "dondurma", "sufle", "muffin", "tiramisu", "profiterol", "magnolia", "kruvasan", "poğaça", "börek", "simit"],
  ],
  /*
    Soğuk, sıcaktan **önce** bakılıyor.

    "Ice americano" hem soğuk listesindeki "ice"i hem sıcak
    listesindeki "americano"yu içeriyor; sıra ters olsaydı buzlu kahve
    buharlı fincanla çıkardı.
  */
  [
    "soguk",
    ["ice", "buz", "soğuk", "cold", "frappe", "frappuccino", "milkshake", "limonata", "smoothie", "meyve suyu", "kola", "ayran", "meşrubat", "granita", "soda"],
  ],
  [
    "icecek",
    ["kahve", "espresso", "latte", "americano", "filtre", "cappuccino", "mocha", "macchiato", "cortado", "çay", "demleme", "bitki", "salep", "sahlep", "içecek"],
  ],
];

/**
 * @param metin Kuponun başlığı — "Ücretsiz filtre kahve", "Tatlıda %10".
 * @param tur   Hiçbir kelime tutmazsa devreye giren yedek. Ürün ödülü
 *              olduğu bilinen ama adı tanınmayan bir kupon ("Sürpriz")
 *              para çizimiyle çıkmamalı — kafede satılan ürünlerin
 *              çoğunluğu içecek olduğu için oraya düşüyor.
 */
export function gorselSec(metin: string, tur?: "urun" | "yuzde" | "tutar"): KuponGorseli {
  const m = metin.toLocaleLowerCase("tr");
  for (const [ad, kelimeler] of ESLESME) {
    if (kelimeler.some((k) => m.includes(k))) return ad;
  }
  return tur === "urun" ? "icecek" : "para";
}

/**
 * Çizimin rengi.
 *
 * Renk artık kuponun **teknik tipinden** (ürün/yüzde/tutar) değil,
 * gördüğü şeyden geliyor: içecek amber, tatlı gül, para nane. Ü65'te
 * renk tipe bağlıydı ve "Tatlıda %10 indirim" menekşe (yüzde) çıkıyordu
 * — ekranda pasta çizimi, kenarında mor bir şerit. İkisi aynı şeyi
 * söylemeli.
 */
export const GORSEL_RENGI = {
  icecek: "kahve",
  soguk: "buz",
  tatli: "pembe",
  para: "yesil",
} as const;

/**
 * Oyunun kart arkasındaki çizimi.
 *
 * `oyuncu-renk.ts`'teki `OYUN_RENGI` ile aynı mantık: eşleşme tek
 * yerde duruyor, çünkü ana ekran, katalog ve oyun kabuğu aynı oyuna
 * aynı çizimi vermek zorunda.
 */
const OYUN_GORSELI: Record<string, GorselAdi> = {
  blok: "blok",
  kelime: "kelime",
  dusen: "dusen",
};

export function oyunGorseli(oyunId: string): GorselAdi {
  return OYUN_GORSELI[oyunId] ?? "blok";
}

/* ── Çizen ─────────────────────────────────────────────────── */

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
      viewBox="0 0 512 512"
      fill="none"
      stroke="currentColor"
      strokeWidth={CIZGI}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {CIZIM[ad]}
    </svg>
  );
}

/** Referans ikonların çizgi kalınlığı — 512'lik kutuda 20 birim. */
const CIZGI = 20;

/*
 * Çizimler modül seviyesinde sabit elemanlar.
 *
 * Bileşen değil eleman: her biri tek seferlik ve `Gorsel` içinde
 * doğrudan gömülüyor. Bileşen olsalardı her çağrıda yeni bir tip
 * yaratılır, React ağacı gereksiz yere yeniden kurulurdu.
 */
const CIZIM: Record<GorselAdi, React.ReactElement> = {
  /** Fincan, tabak, buhar — sıcak da soğuk da içecek (Ü67). */
  icecek: (
    <g>
      {/* Buhar */}
      <path d="M152 150c-22-26 22-40 0-66M226 138c-22-26 22-40 0-66M300 150c-22-26 22-40 0-66" />
      {/* Fincan gövdesi */}
      <path d="M18 188h392v104c0 106-86 192-192 192h-8C104 484 18 398 18 292V188Z" />
      {/* Kulp */}
      <path d="M410 224h84v58c0 50-40 90-90 90h-30" />
      {/* Tabak */}
      <path d="M10 462h436c0 34-28 62-62 62H72c-34 0-62-28-62-62Z" />
    </g>
  ),

  /** Soğuk içecek — uzun bardak, pipet, buz küpleri. */
  soguk: (
    <g>
      <path d="M104 26h72" />
      <path d="M104 26c-26 0-38 18-42 46" />
      <path d="M62 72h116l-14 372c-1 24-20 44-44 44h-2c-24 0-43-20-44-44L62 72Z" />
      <path d="M74 150c30-14 62 14 92 0" />
      <rect x="104" y="212" width="72" height="72" rx="10" transform="rotate(18 140 248)" />
      <rect x="64" y="300" width="66" height="66" rx="10" transform="rotate(-14 97 333)" />
    </g>
  ),

  /** Pasta dilimi — katlar ve çilek. */
  tatli: (
    <g>
      {/* Çilek ve sapı */}
      <path d="M300 96c-8-30-30-42-52-40" />
      <path d="M256 74c34 0 52 10 52 34 0 34-24 74-52 74s-52-40-52-74c0-24 18-34 52-34Z" />
      {/* Dilim gövdesi */}
      <path d="M14 250 232 140" />
      <path d="M14 250h484v226H14V250Z" />
      <path d="M312 128c98 8 186 62 186 122" />
      {/* Kremalar */}
      <path d="M14 316c34 0 34-26 68-26s34 26 68 26 34-26 68-26 34 26 68 26 34-26 68-26 34 26 68 26" />
      <path d="M14 380c34 0 34-26 68-26s34 26 68 26 34-26 68-26 34 26 68 26 34-26 68-26 34 26 68 26" />
    </g>
  ),

  /** Banknot destesi ve bozuk para. */
  para: (
    <g>
      {/* Üstteki banknot */}
      <path d="M14 240 300 70l198 118-286 170L14 240Z" />
      <ellipse cx="256" cy="214" rx="34" ry="22" transform="rotate(-30 256 214)" />
      {/* Deste kalınlığı */}
      <path d="M14 240v56l198 118M14 296v56l198 118M498 188v56M420 300l78-46" />
      {/* Bozuk para */}
      <ellipse cx="368" cy="330" rx="88" ry="36" />
      <path d="M280 330v82c0 20 40 36 88 36s88-16 88-36v-82" />
      <path d="M280 372c0 20 40 36 88 36s88-16 88-36" />
    </g>
  ),

  /**
   * Blok — dolu kareler.
   *
   * Referansın (block blast) tek dolgu ikonu bu; kontur çizilseydi
   * "bloklar" değil "kutular" gibi okunurdu.
   */
  blok: (
    <g fill="currentColor" stroke="none">
      <rect x="30" y="30" width="100" height="100" rx="18" />
      <rect x="152" y="30" width="100" height="100" rx="18" />
      <rect x="274" y="30" width="100" height="100" rx="18" />
      <rect x="30" y="152" width="100" height="100" rx="18" />
      <rect x="382" y="152" width="100" height="100" rx="18" />
      <rect x="382" y="274" width="100" height="100" rx="18" />
      <rect x="30" y="382" width="100" height="100" rx="18" />
      <rect x="152" y="382" width="100" height="100" rx="18" />
      <rect x="274" y="382" width="100" height="100" rx="18" />
      <rect x="382" y="382" width="100" height="100" rx="18" />
    </g>
  ),

  /** Kelime — üst üste binen harf taşları. */
  kelime: (
    <g>
      <rect x="20" y="20" width="220" height="220" rx="44" />
      <rect x="72" y="72" width="116" height="116" rx="12" />
      <rect x="272" y="20" width="220" height="220" rx="44" />
      <circle cx="382" cy="130" r="52" />
      <rect x="20" y="272" width="220" height="220" rx="44" />
      <path d="M110 442V322h44a40 40 0 0 1 0 80h-44m52 0 42 40" />
      <rect x="272" y="272" width="220" height="220" rx="44" />
      <path d="M348 442V322h40c34 0 56 24 56 60s-22 60-56 60h-40Z" />
    </g>
  ),

  /** Düşen — inen parça ve biriken duvar. */
  dusen: (
    <g>
      {/* İnen T parçası */}
      <path d="M30 100h180v70h-60v70h-60v-70H30v-70Z" />
      {/* Sağ üstteki küçük parça */}
      <path d="M330 30h150v80h-75v80h-75V30Z" />
      {/* Duvar */}
      <path d="M30 322h75v-80h150v-80h75v160h152v160H30V322Z" />
      <path d="M105 322v160M180 322v160M255 322v160M330 322v160M405 322v160M30 402h452" />
    </g>
  ),

  /**
   * Bilet — "Ödüllerim" başlığı (Ü68).
   *
   * Başlıkların arkasındaki çizimler ilk turda **rastgele** seçilmişti:
   * profilin arkasında harf taşları, ödüllerin arkasında banknot
   * duruyordu. Ürün sahibi haklı olarak *"çok alakasız yerlerde
   * alakasız ikonlar kullanmışsın"* dedi. Artık her başlığın kendi
   * çizimi var ve hiçbiri ödünç değil.
   */
  bilet: (
    <g>
      <path d="M32 150h448v78a48 48 0 0 0 0 96v78H32v-78a48 48 0 0 0 0-96v-78Z" />
      <path d="M330 160v192" strokeDasharray="26 26" />
      <circle cx="150" cy="256" r="42" />
    </g>
  ),

  /** Kupa — sıralama başlığı. */
  kupa: (
    <g>
      <path d="M128 40h256v148c0 71-57 128-128 128s-128-57-128-128V40Z" />
      <path d="M128 76H54c0 62 38 100 84 104M384 76h74c0 62-38 100-84 104" />
      <path d="M216 316h80v76h-80z" />
      <path d="M150 392h212v64H150z" />
    </g>
  ),

  /** Madalya — profil başlığı. */
  madalya: (
    <g>
      <path d="M148 32h72l-46 150-88-40 62-110ZM364 32h-72l46 150 88-40-62-110Z" />
      <circle cx="256" cy="340" r="140" />
      <circle cx="256" cy="340" r="92" />
      <path d="m256 282 26 54 60 8-44 42 11 60-53-29-53 29 11-60-44-42 60-8 26-54Z" />
    </g>
  ),

  /** Kumanda — oyun kataloğu başlığı. */
  kumanda: (
    <g>
      <path d="M170 152h172a112 112 0 0 1 110 90l30 152a62 62 0 0 1-61 74c-20 0-39-10-51-26l-34-46H176l-34 46c-12 16-31 26-51 26a62 62 0 0 1-61-74l30-152a112 112 0 0 1 110-90Z" />
      <path d="M132 232v72M96 268h72" />
      <circle cx="356" cy="240" r="20" />
      <circle cx="410" cy="294" r="20" />
    </g>
  ),

  /** Etiket — fırsatlar başlığı. */
  etiket: (
    <g>
      <path d="M262 40h188a22 22 0 0 1 22 22v188a34 34 0 0 1-10 24L268 458a34 34 0 0 1-48 0L54 292a34 34 0 0 1 0-48L238 50a34 34 0 0 1 24-10Z" />
      <circle cx="396" cy="116" r="28" />
      <path d="M300 210 190 320" />
      <circle cx="196" cy="226" r="30" />
      <circle cx="294" cy="324" r="30" />
    </g>
  ),

  /** Alev — günlük seri. */
  alev: (
    <g>
      <path d="M256 24c78 78 138 130 138 234a138 138 0 0 1-276 0c0-48 18-84 48-116 4 34 22 56 44 68-14-68 14-134 46-186Z" />
      <path d="M256 258c40 40 66 66 66 110a66 66 0 0 1-132 0c0-34 22-62 66-110Z" />
    </g>
  ),

  /** Çark. */
  cark: (
    <g>
      <circle cx="256" cy="270" r="200" />
      <circle cx="256" cy="270" r="148" />
      <path d="M256 70v400M83 170l346 200M83 370l346-200" />
      <circle cx="256" cy="270" r="40" />
    </g>
  ),
};
