import type { CSSProperties } from "react";

/**
 * Sekme'nin yüzeyi — Ü217.
 *
 * ── Hangi dil ───────────────────────────────────────────────
 *
 * Referans video (`gamesvideos/bbtan.mp4`) siyah zeminde neon çizgili
 * bir arcade. Bu, Blok ve Düşen'in diliyle aynı aileden; Sekme onlara
 * katılıyor. **Yılan katılmıyor** ve bu bilinçli — onun referansı ayrı
 * bir görsel (parlak çimen, taş duvar) ve ürün sahibi *"tamamen
 * referans gibi"* dedi.
 *
 * ⚠️ Kimlik rengi **menekşe**. Ü85'in kuralı: her oyunun kendi rengi
 * var. Menekşe Ü208'de Kelime kaldırılınca boşalmıştı; dördüncü oyun
 * onu devraldı.
 */

export const SEKME_RENK = {
  ana: "#A855F7",
  acik: "#D9C4FF",
  koyu: "#5B21B6",
  isik: "#C084FC",
  top: "#F1F5FF",
  topIsik: "#93C5FD",
  hediye: "#4ADE80",
} as const;

/**
 * Blok renkleri — cana göre.
 *
 * ⚠️ Renk **can sayısının kendisinden** türüyor, blok kimliğinden
 * değil. Oyuncu bir bakışta "şu blok daha dayanıklı" diyebilmeli;
 * numarayı okumak zorunda kalmamalı. Referansta da aynı mantık var.
 *
 * ⚠️ Eşikler tura değil cana bağlı: tur ilerledikçe canlar büyüyor ve
 * tahtadaki en koyu blok hep en zor olan oluyor.
 */
const BLOK_TONLARI: readonly {
  esik: number;
  /** `rgb()` kanalları — cam alfası çalışma zamanında ekleniyor (Ü210). */
  ust: string;
  orta: string;
  alt: string;
  isik: string;
  yazi: string;
}[] = [
  { esik: 18, ust: "196 181 253", orta: "139 92 246", alt: "76 29 149", isik: "#A78BFA", yazi: "#EDE9FE" },
  { esik: 12, ust: "165 180 252", orta: "99 102 241", alt: "49 46 129", isik: "#818CF8", yazi: "#E0E7FF" },
  { esik: 8, ust: "125 211 252", orta: "14 165 233", alt: "7 89 133", isik: "#38BDF8", yazi: "#E0F2FE" },
  { esik: 5, ust: "110 231 183", orta: "16 185 129", alt: "6 95 70", isik: "#34D399", yazi: "#D1FAE5" },
  { esik: 3, ust: "253 224 71", orta: "234 179 8", alt: "133 77 14", isik: "#FACC15", yazi: "#FEF9C3" },
  { esik: 1, ust: "253 164 175", orta: "244 63 94", alt: "159 18 57", isik: "#FB7185", yazi: "#FFE4E6" },
];

/** `rgb(r g b / a)` — cam katmanları. */
function saydam(kanal: string, alfa: number): string {
  return `rgb(${kanal} / ${alfa})`;
}

/**
 * Üçgen bloğun kırpma yolu — dik açının köşesine göre.
 *
 * ⚠️ Motorun `carpismaEkseni` içindeki "dolu taraf" tanımıyla
 * **birebir aynı** olmak zorunda. Ayrışırsa oyuncu boşluğa vurur ya da
 * görünmeyen bir yüzeyden seker — ikisi de oyunu yalan söyler.
 *
 *   0 sol-üst · 1 sağ-üst · 2 sağ-alt · 3 sol-alt
 */
const UCGEN_YOLU: readonly string[] = [
  "polygon(0 0, 100% 0, 0 100%)",
  "polygon(0 0, 100% 0, 100% 100%)",
  "polygon(100% 0, 100% 100%, 0 100%)",
  "polygon(0 0, 0 100%, 100% 100%)",
];

function tonBul(can: number) {
  return BLOK_TONLARI.find((t) => can >= t.esik) ?? BLOK_TONLARI[BLOK_TONLARI.length - 1];
}

/** Sahne — Blok ve Düşen'le aynı derinlik, menekşeye kayan bulut. */
export function sekmeSahnesi(): CSSProperties {
  return {
    background: [
      "radial-gradient(ellipse 88% 42% at 78% 16%, rgba(168,85,247,.36) 0%, transparent 62%)",
      "radial-gradient(ellipse 78% 38% at 18% 70%, rgba(56,189,248,.18) 0%, transparent 60%)",
      "radial-gradient(ellipse 130% 85% at 50% 4%, #241C6B 0%, #14103E 42%, #05060F 100%)",
    ].join(", "),
  };
}

/**
 * Tahtanın neon çerçevesi.
 *
 * Düşen'le aynı yapı (degrade zemin + iki katman parıltı), farklı
 * durak renkleri. ⚠️ 3 piksel: Ü209'da 2 pikselde ölçüldü ve tahta
 * ekranı doldurduğu için dışa taşan parıltının yarısı ekranın dışında
 * kalıyordu.
 */
export function sekmeCerceve(): CSSProperties {
  return {
    padding: 3,
    borderRadius: 18,
    background: "linear-gradient(150deg, #E9D5FF 0%, #A855F7 38%, #6366F1 72%, #38BDF8 100%)",
    boxShadow: [
      "inset 0 0 10px rgba(255,255,255,.5)",
      "0 0 14px rgba(168,85,247,.8)",
      "0 0 34px rgba(99,102,241,.45)",
      "0 18px 40px -18px rgba(0,0,0,.9)",
    ].join(", "),
  };
}

/**
 * Tahtanın içi — koyu, ince sütun çizgili.
 *
 * ⚠️ Desen **dikey**, dama değil: bu oyunda hareket dikey (satırlar
 * iniyor, top yukarı gidiyor) ve sütun çizgileri oyuncunun nişan
 * alırken hangi sütuna baktığını gösteriyor. Dama deseni burada
 * yalnızca gürültü olurdu.
 */
export function sekmeTahtasi(sutun: number): CSSProperties {
  return {
    borderRadius: 16,
    background: [
      `repeating-linear-gradient(90deg, rgba(196,181,253,.055) 0 1px, transparent 1px ${100 / sutun}%)`,
      "linear-gradient(180deg, #120B33 0%, #07061F 100%)",
    ].join(", "),
    boxShadow: "inset 0 2px 14px rgba(0,0,0,.75), inset 0 0 0 1px rgba(196,181,253,.12)",
  };
}

/**
 * Blok — camsı, canına göre renkli.
 *
 * Cam reçetesi Ü210'un dersini izliyor: merkezde yoğun, kenarda
 * saydam. Koyu zeminde düz düşük alfa rengi soldurur.
 */
export function sekmeBloku(can: number, ucgen?: number): CSSProperties {
  const t = tonBul(can);
  const kirpik = ucgen !== undefined;

  return {
    // ⚠️ Üçgende köşe yuvarlatma YOK: `clip-path` zaten keskin bir
    // kenar üretiyor ve yuvarlatma onunla çakışıp köşeyi tırtıklı
    // gösteriyor.
    borderRadius: kirpik ? 0 : 8,
    clipPath: kirpik ? UCGEN_YOLU[ucgen] : undefined,
    background: [
      // 1 · ışık yansıması
      "radial-gradient(circle at 32% 24%, rgba(255,255,255,.55) 0%, rgba(255,255,255,.12) 28%, transparent 56%)",
      // 2 · gövde: merkezde yoğun, kenarda saydam (Ü210)
      `radial-gradient(ellipse 90% 90% at 50% 52%, ${saydam(t.orta, 0.92)} 0%, ${saydam(t.orta, 0.8)} 46%, ${saydam(t.alt, 0.45)} 100%)`,
      // 3 · üstten gelen açık ton — hacim
      `linear-gradient(165deg, ${saydam(t.ust, 0.42)} 0%, transparent 58%)`,
    ].join(", "),
    /*
      ⚠️ Üçgende `box-shadow` YOK ve bu bir kısıt, tercih değil:
      `clip-path` gölgeyi de kırpıyor, yani iç kenar çizgisi üç
      kenardan yalnızca ikisinde görünür ve hipotenüs çıplak kalırdı.
      Kenarı `clip-path`in kendi keskinliği taşıyor.
    */
    boxShadow: kirpik
      ? undefined
      : [
          "inset 0 1.5px 0 rgba(255,255,255,.75)",
          "inset 0 0 0 1.5px rgba(255,255,255,.38)",
          `inset 0 -3px 5px ${saydam(t.alt, 0.5)}`,
          `0 0 9px ${t.isik}66`,
        ].join(", "),
  };
}

/**
 * Üçgenin **kenar çizgisi** — camın kalınlığı.
 *
 * 🔴 Neden ayrı bir katman: `clip-path` `box-shadow`u da kırpıyor,
 * yani üçgene `inset` bir kenar çizgisi verilemiyor — üç kenardan
 * yalnızca ikisi görünür, hipotenüs çıplak kalırdı. Ölçüldü: ilk
 * sürümde üçgenler kare bloklardan gözle görülür biçimde **daha düz**
 * duruyordu, oysa ürün sahibi *"tam camsı"* dedi.
 *
 * Çözüm iki kırpılmış katman: dışta parlak bir üçgen, içinde 1,5
 * piksel içeri çekilmiş cam gövde. Aradaki fark kenar çizgisi oluyor
 * ve hipotenüs de dahil üç kenarı birden sarıyor.
 *
 * ⚠️ İçteki üçgen kutudan `inset` ile küçülüyor, bu da matematiksel
 * olarak üçgeni tam paralel küçültmüyor (hipotenüs biraz daha fazla
 * çekiliyor). 43 piksellik hücrede fark yarım pikselin altında;
 * gözle görülmüyor ve doğrusunu yapmak her üçgen için ayrı poligon
 * hesabı demekti.
 */
export function sekmeUcgenCercevesi(can: number, ucgen: number): CSSProperties {
  const t = tonBul(can);
  return {
    clipPath: UCGEN_YOLU[ucgen],
    background: `linear-gradient(165deg, rgba(255,255,255,.85) 0%, ${saydam(t.ust, 0.55)} 55%, ${saydam(t.alt, 0.5)} 100%)`,
    filter: `drop-shadow(0 0 6px ${t.isik}99)`,
  };
}

/** Bloğun üstündeki sayının rengi — kendi tonunun en açığı. */
export function sekmeBlokYazisi(can: number): string {
  return tonBul(can).yazi;
}

/** Top hediyesi — yeşil, içinde artı. */
export function sekmeHediyesi(): CSSProperties {
  return {
    borderRadius: "9999px",
    background: `radial-gradient(circle at 34% 28%, #DCFCE7 0%, ${SEKME_RENK.hediye} 52%, #15803D 100%)`,
    boxShadow: `0 0 10px ${SEKME_RENK.hediye}cc, inset 0 1px 0 rgba(255,255,255,.6)`,
  };
}

/**
 * Ödül paketi — altın (Ü203 · Ü207).
 *
 * ⚠️ Ürün sahibi bu oyun için özellikle *"üstten düşsün"* dedi ve
 * burada bedava geliyor: zaten her şey üstten iniyor.
 *
 * ⚠️ Rengi paletin dışında ve öyle kalmalı — ödül ürünün her yerinde
 * altın. Menekşe bir ödül bloklarla karışırdı.
 */
export function sekmeOdulu(): CSSProperties {
  return {
    borderRadius: 8,
    background: [
      "repeating-linear-gradient(135deg, rgba(255,252,235,.85) 0 4px, rgba(255,255,255,0) 4px 11px)",
      "linear-gradient(180deg, #e8b93c 0%, #a9781a 100%)",
    ].join(", "),
    boxShadow: "inset 0 0 0 1.5px rgba(255,248,214,.95), 0 0 12px rgba(255,215,94,.9)",
  };
}

/** Uçan top. */
export function sekmeTopu(): CSSProperties {
  return {
    borderRadius: "9999px",
    background: `radial-gradient(circle at 34% 28%, #FFFFFF 0%, ${SEKME_RENK.top} 45%, ${SEKME_RENK.topIsik} 100%)`,
    boxShadow: `0 0 8px ${SEKME_RENK.topIsik}, 0 0 18px ${SEKME_RENK.topIsik}80`,
  };
}

/**
 * Fütüristik HUD paneli — Düşen'dekiyle aynı kesik köşe.
 *
 * ⚠️ Aynı olması gerekiyor: ikisi de aynı ailede ve oyuncu iki oyun
 * arasında geçerken arayüzün dilini yeniden öğrenmemeli.
 */
export function sekmePanel(vurgu: string = SEKME_RENK.isik): CSSProperties {
  return {
    clipPath:
      "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
    background: "linear-gradient(160deg, rgba(28,18,66,.92) 0%, rgba(9,8,34,.92) 100%)",
    boxShadow: `inset 0 0 0 1.5px ${vurgu}66, inset 0 0 14px ${vurgu}22`,
  };
}
