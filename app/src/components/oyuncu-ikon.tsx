import Image from "next/image";
import { RENK, oyunRengi, type OyuncuRengi } from "./oyuncu-renk";

/**
 * Oyuncu tarafının ikonları — Ü65.
 *
 * ── Emoji neden kalktı ──────────────────────────────────────
 *
 * Ürün sahibi: *"emojilerimiz çok kötü, onları değiştirmeliyiz."*
 * Haklı ve sebebi teknik: 🟦🔤🧱🎡🔥🎟️🏅👑 her işletim sisteminde
 * **başka bir sanatçının çizimi**. Windows'ta düz, iOS'ta parlak,
 * Android'de bambaşka; boyutları ve taban hizaları tutmuyor, yan yana
 * dizildiklerinde sıra bozuk görünüyor. Üçü de bizim ürünümüzün
 * kimliğini taşımıyor.
 *
 * Buradakiler çok renkli ve dolgulu — panelin tek renkli kontur
 * ikonlarının (Ü63) tersi. İki taraf bilerek ayrı: panel okunacak bir
 * belge, burası oynanacak bir yer.
 *
 * ── Gradyan yok ─────────────────────────────────────────────
 *
 * SVG gradyanı `id` istiyor ve aynı ikon bir sayfada iki kez
 * çizildiğinde `id` çakışıyor. Renk geçişi yerine düz katmanlar var:
 * aynı ailenin iki tonu üst üste. Yan etkisi iyi oldu — ikonlar
 * 20 pikselde de okunuyor.
 */

type IkonProps = { boy?: number };

function Kutu({ boy = 24, children }: IkonProps & { children: React.ReactNode }) {
  return (
    <svg width={boy} height={boy} viewBox="0 0 48 48" fill="none" aria-hidden>
      {children}
    </svg>
  );
}

/* ── Oyun ikonları ─────────────────────────────────────────── */

/*
 * ── Oyun ikonları referans dilinde (Ü67) ────────────────────
 *
 * Ürün sahibi `Downloads/icons` klasörünü *"örnek al"* diye verdi.
 * Oradaki üç oyun ikonunun dili net: Blok dolgu karelerden (block
 * blast), Kelime ve Düşen ince çizgili kontur.
 *
 * Kutlama ikonları (alev, çark, taç, hediye, madalya) dolgulu ve çok
 * renkli kalıyor. Ayrım bilerek: **oyun ikonu tanıtır, kutlama ikonu
 * kutlar.** Hepsi kontur olsaydı oyun sonu ekranındaki hediye kutusu
 * bir menü satırı gibi dururdu.
 */

/** Blok — dolu kareler, referanstaki gibi halka düzeninde. */
export function BlokIkonu({ boy }: IkonProps) {
  const r = RENK.gok;
  const kare = (x: number, y: number, renk: string) => (
    <rect key={`${x}-${y}`} x={x} y={y} width="10" height="10" rx="2.5" fill={renk} />
  );
  return (
    <Kutu boy={boy}>
      {kare(2, 2, r.canli)}
      {kare(14, 2, r.ana)}
      {kare(26, 2, r.canli)}
      {kare(2, 14, r.ana)}
      {kare(36, 14, r.canli)}
      {kare(36, 26, r.ana)}
      {kare(2, 36, r.canli)}
      {kare(14, 36, r.ana)}
      {kare(26, 36, r.canli)}
      {kare(36, 36, r.koyu)}
    </Kutu>
  );
}

/**
 * Kelime — harf taşları.
 *
 * Taşların üstünde gerçek harf var. Yol çizmek daha güvenli olurdu ama
 * 20 pikselde okunacak bir "A" elle çizilince lekeye dönüşüyor; sayfanın
 * kendi yazı tipi burada işi yapıyor. Harfler dekoratif, `aria-hidden`
 * zaten dışarıdan geliyor.
 */
export function KelimeIkonu({ boy }: IkonProps) {
  const r = RENK.menekse;
  const cerceve = {
    fill: "none",
    stroke: r.ana,
    strokeWidth: 2.6,
    rx: 4,
    width: 20,
    height: 20,
  };
  const yazi = {
    textAnchor: "middle" as const,
    fontSize: 12,
    fontWeight: 800,
    fill: r.ana,
    stroke: "none",
  };
  return (
    <Kutu boy={boy}>
      <rect x="3" y="3" {...cerceve} />
      <text x="13" y="18" {...yazi}>
        A
      </text>
      <rect x="25" y="3" {...cerceve} />
      <text x="35" y="18" {...yazi}>
        B
      </text>
      <rect x="3" y="25" {...cerceve} />
      <text x="13" y="40" {...yazi}>
        C
      </text>
      <rect x="25" y="25" {...cerceve} stroke={r.canli} />
    </Kutu>
  );
}

/** Düşen — inen parça ve biriken duvar, kontur. */
export function DusenIkonu({ boy }: IkonProps) {
  const r = RENK.pembe;
  const cizgi = {
    fill: "none",
    stroke: r.ana,
    strokeWidth: 2.6,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };
  return (
    <Kutu boy={boy}>
      {/* İnen T parçası */}
      <path d="M4 4h18v7h-5.5v7h-7v-7H4V4Z" {...cizgi} />
      {/* Duvar */}
      <path d="M4 30h7v-7h14v-7h7v14h12v14H4V30Z" {...cizgi} stroke={r.canli} />
      <path d="M4 37h40" {...cizgi} stroke={r.canli} />
    </Kutu>
  );
}

/**
 * 🔴 Üretilmiş ikonu olan oyunlar — Ü187.
 *
 * Ü183'te kartlar neon sahnelere geçince aynı kartın üstünde iki ayrı
 * malzeme kaldı: parlak, hacimli bir sahne ve yanında düz vektör bir
 * simge. Ürün sahibi *"küçük logoları da değiştirmeliyiz"* dedi ve
 * haklıydı — aynı yüzeyde iki dil.
 *
 * Üretim ve üç turluk arayış `scripts/oyun-ikon-uret.py`de yazılı.
 */
const URETILMIS = new Set(["dusen", "blok", "yilan"]);

/**
 * Elle çizilmiş ikonlar — yalnızca üretilmişi olmayan oyunlar için.
 *
 * ⚠️ `dusen` ve `blok`un çizimleri SİLİNMEDİ, listeden çıkarıldı.
 * Kullanılmıyorlar ama Ü147'den beri ürünün dilini taşıyorlar ve yeni
 * bir oyunun ikonu üretilene kadar geçici olarak gerekebilirler.
 */
const OYUN_IKONU: Record<string, (p: IkonProps) => React.ReactElement> = {
  kelime: KelimeIkonu,
};

/**
 * Oyunun ikonu.
 *
 * Üç kademeli: üretilmiş görsel → elle çizim → jenerik daire.
 * Tanınmayan oyun için jeneriğe düşüyor: ekranda boşluk kalmıyor,
 * yalnızca oyunun kendine ait çizimi olmuyor. Oyun listesi kodda sabit
 * (`OYUNLAR`) ama ikon eşlemesi ayrı dosyada — biri eklenip diğeri
 * unutulduğunda ekran çökmemeli.
 */
export function OyunIkonu({ oyunId, boy = 24 }: { oyunId: string; boy?: number }) {
  if (URETILMIS.has(oyunId)) {
    return (
      <Image
        src={`/oyun/ikon-${oyunId}-256.webp`}
        alt=""
        aria-hidden
        width={256}
        height={256}
        style={{ width: boy, height: boy }}
      />
    );
  }

  const Ikon = OYUN_IKONU[oyunId];
  if (Ikon) return <Ikon boy={boy} />;

  const r = RENK[oyunRengi(oyunId)];
  return (
    <Kutu boy={boy}>
      <circle cx="24" cy="24" r="18" fill={r.canli} />
      <circle cx="24" cy="24" r="7" fill={r.ana} />
    </Kutu>
  );
}

/* ── Ürün ikonları ─────────────────────────────────────────── */

/** Şans çarkı — dilimler, ampuller, ibre. */
export function CarkIkonu({ boy }: IkonProps) {
  const dilim = ["#8b7cf6", "#fef3c7", "#5eead4", "#fecdd3", "#fde68a", "#a5b4fc"];
  // Altı eşit dilim. Açılar sabit; 60°'lik dilimin kirişi yarıçapa eşit
  // olduğu için köşeler elle yazılabiliyor ve trigonometri gerekmiyor.
  const yollar = [
    "M24 24 L24 6 A18 18 0 0 1 39.6 15 Z",
    "M24 24 L39.6 15 A18 18 0 0 1 39.6 33 Z",
    "M24 24 L39.6 33 A18 18 0 0 1 24 42 Z",
    "M24 24 L24 42 A18 18 0 0 1 8.4 33 Z",
    "M24 24 L8.4 33 A18 18 0 0 1 8.4 15 Z",
    "M24 24 L8.4 15 A18 18 0 0 1 24 6 Z",
  ];

  return (
    <Kutu boy={boy}>
      <circle cx="24" cy="24" r="20" fill="#fb7185" />
      {yollar.map((d, i) => (
        <path key={i} d={d} fill={dilim[i]} />
      ))}
      <circle cx="24" cy="24" r="4.5" fill="#ffcf3f" stroke="#ffffff" strokeWidth="1.5" />
      <path d="M24 1.5 l4 6 h-8 Z" fill="#ffcf3f" />
    </Kutu>
  );
}

/** Günlük seri — alev. */
export function AlevIkonu({ boy }: IkonProps) {
  return (
    <Kutu boy={boy}>
      <path
        d="M24 4c7 7 12 12 12 21a12 12 0 0 1-24 0c0-4 1.5-7 4-10 .5 3 2 5 4 6-1-6 1-12 4-17Z"
        fill="#fb923c"
      />
      <path
        d="M24 24c3.5 3.5 6 6 6 10a6 6 0 0 1-12 0c0-3 2-5.5 6-10Z"
        fill="#fde68a"
      />
    </Kutu>
  );
}

/** Kupon — bilet. Kuponun cinsine göre renkleniyor. */
export function BiletIkonu({ renk = "amber", boy }: IkonProps & { renk?: OyuncuRengi }) {
  const r = RENK[renk];
  return (
    <Kutu boy={boy}>
      <path
        d="M6 14a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v4a5 5 0 0 0 0 12v4a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-4a5 5 0 0 0 0-12v-4Z"
        fill={r.canli}
      />
      <path d="M30 12v24" stroke="#ffffff" strokeWidth="2.4" strokeDasharray="3 3" />
      <circle cx="18" cy="24" r="4" fill="#ffffff" opacity="0.85" />
    </Kutu>
  );
}

/** Rozet — madalya. */
export function MadalyaIkonu({ boy }: IkonProps) {
  return (
    <Kutu boy={boy}>
      <path d="M14 4h8l-5 16-8-3Z" fill="#a5b4fc" />
      <path d="M34 4h-8l5 16 8-3Z" fill="#818cf8" />
      <circle cx="24" cy="31" r="13" fill="#ffcf3f" />
      <circle cx="24" cy="31" r="8.5" fill="#fde68a" />
      <path d="m24 25.5 1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6Z" fill="#c2740a" />
    </Kutu>
  );
}

/** Kürsünün birincisi — taç. */
export function TacIkonu({ boy }: IkonProps) {
  return (
    <Kutu boy={boy}>
      <path d="M6 16l7 7 11-13 11 13 7-7v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V16Z" fill="#ffcf3f" />
      <rect x="6" y="33" width="36" height="6" rx="2" fill="#c2740a" />
      <circle cx="24" cy="25" r="2.6" fill="#fb7185" />
      <circle cx="13" cy="27" r="2" fill="#5eead4" />
      <circle cx="35" cy="27" r="2" fill="#a5b4fc" />
    </Kutu>
  );
}

/** Ödül kazanıldı — hediye kutusu. */
export function HediyeIkonu({ boy }: IkonProps) {
  return (
    <Kutu boy={boy}>
      <rect x="7" y="20" width="34" height="22" rx="3" fill="#a78bfa" />
      <rect x="5" y="13" width="38" height="9" rx="3" fill="#8b7cf6" />
      <rect x="20.5" y="13" width="7" height="29" fill="#ffcf3f" />
      <path
        d="M24 13c-3-6-11-7-11-2 0 3 5 3 11 2Zm0 0c3-6 11-7 11-2 0 3-5 3-11 2Z"
        fill="#fb7185"
      />
    </Kutu>
  );
}

/** Sıralama — kupa. */
export function KupaIkonu({ boy }: IkonProps) {
  return (
    <Kutu boy={boy}>
      <path d="M12 6h24v12a12 12 0 0 1-24 0V6Z" fill="#ffcf3f" />
      <path d="M12 9H7a7 7 0 0 0 7 7V9Zm24 0h5a7 7 0 0 1-7 7V9Z" fill="#c2740a" />
      <rect x="20" y="29" width="8" height="8" fill="#c2740a" />
      <rect x="12" y="37" width="24" height="6" rx="2" fill="#fde68a" />
    </Kutu>
  );
}
