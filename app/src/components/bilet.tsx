import Link from "next/link";
import { RENK, kartZemin, type OyuncuRengi } from "./oyuncu-renk";
import { Gorsel, type KuponGorseli } from "./oyuncu-gorsel";

/**
 * Kupon bileti — dört stil denemesi (Ü69).
 *
 * ── Neden dördü birden duruyor ──────────────────────────────
 *
 * Ürün sahibi *"B, C, D üçünü de deneyelim, hangisini beğenirsem onda
 * kalırız; sadece Ödüllerim sayfasında yap, orada hemen bakarım"* dedi.
 * Bu dosya o yüzden **geçici**: seçim yapılınca kazanan stil kalacak,
 * diğer üçü ve `?stil=` anahtarı silinecek.
 *
 * Dördü de aynı iskeleti paylaşıyor — koçan, kesikli koparma çizgisi,
 * zımba çentiği — çünkü değişen şey biletin **yüzeyi**, ne olduğu
 * değil. Ortak iskelet ayrıca karşılaştırmayı dürüst tutuyor: aradaki
 * fark stilin kendisi, birinin fazladan bir detayı değil.
 *
 * ── Dördünde de değişmeyen ──────────────────────────────────
 *
 * TL değeri yok (E9) ve geçerlilik damgası yok. Bilet ne kadar
 * "değerli" görünürse görünsün kasada okutulmadan hiçbir şey ifade
 * etmiyor; bu, stille pazarlık edilecek bir şey değil.
 */

export type BiletStili = "a" | "b" | "c" | "d";

export const BILET_STILLERI: { kod: BiletStili; ad: string }[] = [
  { kod: "a", ad: "A · Aydınlık" },
  { kod: "b", ad: "B · Koyu ışın" },
  { kod: "c", ad: "C · Neon" },
  { kod: "d", ad: "D · Koyu cam" },
];

export function stilOku(ham: string | undefined): BiletStili {
  return BILET_STILLERI.some((s) => s.kod === ham) ? (ham as BiletStili) : "b";
}

export type BiletVerisi = {
  href: string;
  kafe: string;
  baslik: string;
  gorsel: KuponGorseli;
  renk: OyuncuRengi;
  /** "8 Eyl" — biletin son kullanım günü. */
  son: string;
};

/**
 * Neon tonlar.
 *
 * `RENK` tablosundaki `canli` tonu pastel zemin için seçilmişti ve koyu
 * kartın üstünde parlamıyor. Neon, doygunluğu ve parlaklığı birlikte
 * yükseltiyor.
 *
 * Kahvenin neonu bilerek amber: kahverengi doygunlaştıkça turuncuya
 * gidiyor — "neon kahverengi" diye bir renk yok.
 */
const NEON: Record<OyuncuRengi, string> = {
  kahve: "#ffb15c",
  yesil: "#39ff9e",
  pembe: "#ff5cae",
  menekse: "#b98cff",
  amber: "#ffd24a",
  gok: "#4cc9ff",
};

export function Bilet({ stil, veri }: { stil: BiletStili; veri: BiletVerisi }) {
  if (stil === "a") return <StilA veri={veri} />;
  if (stil === "c") return <StilC veri={veri} />;
  if (stil === "d") return <StilD veri={veri} />;
  return <StilB veri={veri} />;
}

/* ── Ortak parçalar ────────────────────────────────────────── */

/**
 * Biletin iki yanındaki zımba çentiği.
 *
 * Katman **en üstte** ve `pointer-events-none`: içerikten önce
 * çizildiğinde soldaki çentik renkli koçanın altında kalıyor ve bilet
 * tek taraftan çentikli görünüyordu.
 */
function Centikler() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 0 70%, var(--color-zemin) 8px, transparent 8px)," +
          "radial-gradient(circle at 100% 70%, var(--color-zemin) 8px, transparent 8px)",
      }}
    />
  );
}

/** Kart arkasındaki soluk çizim — sağ kenardan taşıyor, dikeyde ortalı. */
function ArkaCizim({ veri, renk, opaklik }: { veri: BiletVerisi; renk: string; opaklik: number }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-1/2 -right-6 -translate-y-1/2"
      style={{ color: renk, opacity: opaklik }}
    >
      <Gorsel ad={veri.gorsel} boy={118} />
    </span>
  );
}

/**
 * Biletin gövdesi — koçan, kafe adı, başlık, koparma çizgisi.
 *
 * Renkler dışarıdan geliyor; stiller yalnızca kabuğu ve bu dört rengi
 * değiştiriyor.
 */
function Govde({
  veri,
  kocan,
  ustYazi,
  baslikYazi,
  cizgi,
  eylemYazi,
  tarihYazi,
  kocanIsik,
  baslikIsik,
}: {
  veri: BiletVerisi;
  kocan: string;
  ustYazi: string;
  baslikYazi: string;
  cizgi: string;
  eylemYazi: string;
  tarihYazi: string;
  kocanIsik?: string;
  baslikIsik?: string;
}) {
  return (
    <div className="relative flex items-stretch">
      <span
        aria-hidden
        className="w-2.5 shrink-0"
        style={{ background: kocan, boxShadow: kocanIsik }}
      />
      <span className="min-w-0 flex-1 px-4 py-4">
        <span className="block etiket-caps" style={{ color: ustYazi }}>
          {veri.kafe}
        </span>
        <span
          className="mt-1 block font-display text-xl leading-tight font-bold"
          style={{ color: baslikYazi, textShadow: baslikIsik }}
        >
          {veri.baslik}
        </span>

        <span className="mt-3 block border-t border-dashed pt-2.5" style={{ borderColor: cizgi }}>
          <span className="flex items-baseline justify-between gap-3">
            <span className="etiket-caps" style={{ color: eylemYazi }}>
              Kasada göster →
            </span>
            <span className="font-data text-[10px] tabular" style={{ color: tarihYazi }}>
              son {veri.son}
            </span>
          </span>
        </span>
      </span>
    </div>
  );
}

const KABUK =
  "kart-golge kart-gel relative block overflow-hidden rounded-2xl transition-transform active:scale-[0.99]";

/* ── A · Aydınlık ──────────────────────────────────────────── */

function StilA({ veri }: { veri: BiletVerisi }) {
  const r = RENK[veri.renk];
  return (
    <Link
      href={veri.href}
      className={`${KABUK} parilti`}
      style={{ background: kartZemin(veri.renk), border: `1px solid ${r.canli}` }}
    >
      <ArkaCizim veri={veri} renk={r.ana} opaklik={0.2} />
      <Govde
        veri={veri}
        kocan={r.ana}
        ustYazi={r.koyu}
        baslikYazi="var(--color-yazi)"
        cizgi={r.ana}
        eylemYazi={r.koyu}
        tarihYazi="var(--color-yazi-sonuk)"
      />
      <Centikler />
    </Link>
  );
}

/* ── B · Koyu ışın ─────────────────────────────────────────── */

function StilB({ veri }: { veri: BiletVerisi }) {
  const neon = NEON[veri.renk];
  return (
    <Link
      href={veri.href}
      className={KABUK}
      style={{
        background: "linear-gradient(150deg, #4c2a8f 0%, #2a1450 55%, #1b0e38 100%)",
        border: `1px solid ${neon}55`,
      }}
    >
      {/* Durum kartının ışın dokusu; merkez kartın dışında kalıyor ki
          ışınların birleştiği nokta metnin üstüne denk gelmesin. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[240%] left-1/2 size-[300%] -translate-x-1/2 opacity-[0.10]"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, #fff 0deg 4deg, transparent 4deg 14deg)",
        }}
      />
      <ArkaCizim veri={veri} renk={neon} opaklik={0.28} />
      <Govde
        veri={veri}
        kocan={neon}
        ustYazi="rgba(255,255,255,0.6)"
        baslikYazi="#ffffff"
        cizgi="rgba(255,255,255,0.25)"
        eylemYazi={neon}
        tarihYazi="rgba(255,255,255,0.5)"
      />
      <Centikler />
    </Link>
  );
}

/* ── C · Neon çerçeve ──────────────────────────────────────── */

function StilC({ veri }: { veri: BiletVerisi }) {
  const neon = NEON[veri.renk];
  return (
    <Link
      href={veri.href}
      className={KABUK}
      style={{
        background: "linear-gradient(160deg, #17141f 0%, #0d0b13 100%)",
        border: `1px solid ${neon}`,
        // Dışarı ışıma + içeriden hafif renk sızması. Biri olmadan
        // çerçeve "renkli kenarlık" gibi duruyor, neon gibi değil.
        boxShadow: `0 0 22px -6px ${neon}, inset 0 0 34px -18px ${neon}`,
      }}
    >
      <ArkaCizim veri={veri} renk={neon} opaklik={0.32} />
      <Govde
        veri={veri}
        kocan={neon}
        kocanIsik={`0 0 14px 0 ${neon}`}
        ustYazi="rgba(255,255,255,0.5)"
        baslikYazi={neon}
        baslikIsik={`0 0 14px ${neon}66`}
        cizgi={`${neon}44`}
        eylemYazi="rgba(255,255,255,0.75)"
        tarihYazi="rgba(255,255,255,0.4)"
      />
      <Centikler />
    </Link>
  );
}

/* ── D · Koyu cam + renk ışıması ───────────────────────────── */

function StilD({ veri }: { veri: BiletVerisi }) {
  const neon = NEON[veri.renk];
  return (
    <Link
      href={veri.href}
      className={KABUK}
      style={{
        background: [
          // Renk sağdan gelen bir hüzme: koyu yüzey sabit kalıyor,
          // kuponun rengi yalnızca ışık olarak giriyor.
          `radial-gradient(90% 130% at 92% 50%, ${neon}3d, transparent 62%)`,
          "linear-gradient(120deg, #1c1830 0%, #14111f 100%)",
        ].join(", "),
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <ArkaCizim veri={veri} renk={neon} opaklik={0.3} />
      <Govde
        veri={veri}
        kocan={`linear-gradient(180deg, ${neon}, ${neon}55)`}
        ustYazi="rgba(255,255,255,0.55)"
        baslikYazi="#ffffff"
        cizgi="rgba(255,255,255,0.18)"
        eylemYazi={neon}
        tarihYazi="rgba(255,255,255,0.45)"
      />
      <Centikler />
    </Link>
  );
}
