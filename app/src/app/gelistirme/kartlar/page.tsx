import { notFound } from "next/navigation";
import { kodEkrandaGosterilir } from "@/sms";
import { RENK, kartZemin, type OyuncuRengi } from "@/components/oyuncu-renk";
import { Gorsel, type KuponGorseli } from "@/components/oyuncu-gorsel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kart denemeleri · CafePlay" };

/**
 * Kart stili denemeleri — Ü69.
 *
 * ── Neden ayrı bir sayfa ────────────────────────────────────
 *
 * Ürün sahibi *"kartlarımızda bu görseldeki gibi tarzlar deneyelim,
 * bakalım hangisi güzel olacak"* dedi. Dört stili sırayla canlıya alıp
 * ekran görüntüsü göndermek yerine hepsi burada yan yana duruyor:
 * aynı üç kupon, dört ayrı kabuk. Karar tek bakışta veriliyor.
 *
 * ── Canlıda yok ─────────────────────────────────────────────
 *
 * `kodEkrandaGosterilir()` kapısı geliştirme defterinin kullandığının
 * aynısı: canlıda iki şart birden sağlanamıyor ve sayfa 404 dönüyor.
 * Bu bir laboratuvar; ürünün parçası değil.
 *
 * ── Stiller neden burada tanımlı ────────────────────────────
 *
 * Dördü de bu dosyada, `components/`'te değil. Seçilmeyen üçü silinecek
 * ve paylaşılan bir dosyaya konsalardı "belki lazım olur" diye orada
 * kalırlardı. Seçilen stil buradan `components/oyuncu.tsx`'e taşınacak.
 */

type Ornek = {
  kafe: string;
  baslik: string;
  gorsel: KuponGorseli;
  renk: OyuncuRengi;
  son: string;
};

/**
 * Üç kupon, üç renk.
 *
 * Ü69'da ürün sahibinin seçtiği tonlar: sıcak içecek kahverengi, tatlı
 * koyu pembe, doğrudan tutar koyu yeşil.
 */
const ORNEKLER: Ornek[] = [
  { kafe: "Kafe A", baslik: "Ücretsiz filtre kahve", gorsel: "icecek", renk: "kahve", son: "8 Eyl" },
  { kafe: "Kafe A", baslik: "Tatlıda %10 indirim", gorsel: "tatli", renk: "pembe", son: "8 Eyl" },
  { kafe: "Kafe A", baslik: "50 TL indirim", gorsel: "para", renk: "yesil", son: "8 Eyl" },
];

/**
 * Neon tonlar — yalnızca bu laboratuvarda.
 *
 * `RENK` tablosundaki `canli` tonu pastel zemin için seçilmişti ve koyu
 * kartın üstünde parlamıyor. Neon, doygunluğu ve parlaklığı birlikte
 * yükseltiyor. Kahvenin neonu yok — kahverengi doygunlaştıkça turuncuya
 * gidiyor, o yüzden onunki bilerek amber.
 */
const NEON: Record<OyuncuRengi, string> = {
  kahve: "#ffb15c",
  yesil: "#39ff9e",
  pembe: "#ff5cae",
  menekse: "#b98cff",
  amber: "#ffd24a",
  gok: "#4cc9ff",
};

export default async function KartDenemeleri() {
  if (!kodEkrandaGosterilir()) notFound();

  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <div className="mx-auto w-full max-w-md px-5 py-10">
        <header className="mb-9 border-b border-cizgi pb-5">
          <div className="mb-2 etiket-caps text-odul-koyu">Yalnızca geliştirme</div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Kart denemeleri</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-yazi-sonuk">
            Aynı üç kupon, dört ayrı kabuk. Hangisi seçilirse o{" "}
            <code className="font-data text-[12px]">components/oyuncu.tsx</code>&apos;e taşınacak,
            diğer üçü silinecek.
          </p>
        </header>

        <Bolum
          ad="A · Aydınlık"
          not="Şu an canlıda olan. Pastel zemin, soldan sağa açılan renk, sağda soluk çizim."
        >
          {ORNEKLER.map((o) => (
            <AydinlikKart key={o.baslik} o={o} />
          ))}
        </Bolum>

        <Bolum
          ad="B · Koyu ışın"
          not="Ana ekrandaki durum kartının dili: koyu zemin, ışın dokusu. Renk yalnızca vurguda."
        >
          {ORNEKLER.map((o) => (
            <IsinKart key={o.baslik} o={o} />
          ))}
        </Bolum>

        <Bolum
          ad="C · Neon çerçeve"
          not="Neredeyse siyah zemin, fosforlu çerçeve ve ışıma. En 'oyun' duran seçenek."
        >
          {ORNEKLER.map((o) => (
            <NeonKart key={o.baslik} o={o} />
          ))}
        </Bolum>

        <Bolum
          ad="D · Koyu cam + renk ışıması"
          not="Koyu cam yüzey; kuponun rengi arkadan bir ışık hüzmesi olarak geliyor."
        >
          {ORNEKLER.map((o) => (
            <CamKart key={o.baslik} o={o} />
          ))}
        </Bolum>

        <p className="mt-10 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
          Dördünde de TL değeri yok (E9) ve zımba çentiği duruyor — biletin kasada gösterilen bir
          nesne olduğu hissi stilden bağımsız korunmalı.
        </p>
      </div>
    </main>
  );
}

function Bolum({ ad, not, children }: { ad: string; not: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-lg font-bold">{ad}</h2>
      <p className="mt-1 mb-3.5 text-[13px] leading-relaxed text-yazi-sonuk">{not}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

/** Biletin iki yanındaki zımba çentiği — dört stilde de aynı. */
function Centikler({ zemin = "var(--color-zemin)" }: { zemin?: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          `radial-gradient(circle at 0 70%, ${zemin} 8px, transparent 8px),` +
          `radial-gradient(circle at 100% 70%, ${zemin} 8px, transparent 8px)`,
      }}
    />
  );
}

/* ── A · Aydınlık ──────────────────────────────────────────── */

function AydinlikKart({ o }: { o: Ornek }) {
  const r = RENK[o.renk];
  return (
    <div
      className="kart-golge parilti relative overflow-hidden rounded-2xl"
      style={{ background: kartZemin(o.renk), border: `1px solid ${r.canli}` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-6 -translate-y-1/2"
        style={{ color: r.ana, opacity: 0.2 }}
      >
        <Gorsel ad={o.gorsel} boy={118} />
      </span>

      <div className="relative flex items-stretch">
        <span aria-hidden className="w-2.5 shrink-0" style={{ background: r.ana }} />
        <span className="min-w-0 flex-1 px-4 py-4">
          <span className="block etiket-caps" style={{ color: r.koyu }}>
            {o.kafe}
          </span>
          <span className="mt-1 block font-display text-xl leading-tight font-bold">
            {o.baslik}
          </span>
          <span
            className="mt-3 block border-t border-dashed pt-2.5"
            style={{ borderColor: r.ana }}
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="etiket-caps" style={{ color: r.koyu }}>
                Kasada göster →
              </span>
              <span className="font-data text-[10px] text-yazi-sonuk tabular">son {o.son}</span>
            </span>
          </span>
        </span>
      </div>

      <Centikler />
    </div>
  );
}

/* ── B · Koyu ışın ─────────────────────────────────────────── */

function IsinKart({ o }: { o: Ornek }) {
  const neon = NEON[o.renk];
  return (
    <div
      className="kart-golge relative overflow-hidden rounded-2xl text-white"
      style={{
        background: "linear-gradient(150deg, #4c2a8f 0%, #2a1450 55%, #1b0e38 100%)",
        border: `1px solid ${neon}55`,
      }}
    >
      {/* Durum kartının ışın dokusu — merkez kartın dışında. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[240%] left-1/2 size-[300%] -translate-x-1/2 opacity-[0.10]"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, #fff 0deg 4deg, transparent 4deg 14deg)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-6 -translate-y-1/2"
        style={{ color: neon, opacity: 0.28 }}
      >
        <Gorsel ad={o.gorsel} boy={118} />
      </span>

      <div className="relative flex items-stretch">
        <span aria-hidden className="w-2.5 shrink-0" style={{ background: neon }} />
        <span className="min-w-0 flex-1 px-4 py-4">
          <span className="block etiket-caps text-white/60">{o.kafe}</span>
          <span className="mt-1 block font-display text-xl leading-tight font-bold">
            {o.baslik}
          </span>
          <span className="mt-3 block border-t border-dashed border-white/25 pt-2.5">
            <span className="flex items-baseline justify-between gap-3">
              <span className="etiket-caps" style={{ color: neon }}>
                Kasada göster →
              </span>
              <span className="font-data text-[10px] text-white/50 tabular">son {o.son}</span>
            </span>
          </span>
        </span>
      </div>

      <Centikler />
    </div>
  );
}

/* ── C · Neon çerçeve ──────────────────────────────────────── */

function NeonKart({ o }: { o: Ornek }) {
  const neon = NEON[o.renk];
  return (
    <div
      className="relative overflow-hidden rounded-2xl text-white"
      style={{
        background: "linear-gradient(160deg, #17141f 0%, #0d0b13 100%)",
        border: `1px solid ${neon}`,
        // Dışarı ışıma + içeriden hafif renk sızması. İkisi birlikte
        // olmazsa çerçeve "renkli kenarlık" gibi duruyor, neon gibi değil.
        boxShadow: `0 0 22px -6px ${neon}, inset 0 0 34px -18px ${neon}`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-6 -translate-y-1/2"
        style={{ color: neon, opacity: 0.32, filter: `drop-shadow(0 0 6px ${neon})` }}
      >
        <Gorsel ad={o.gorsel} boy={118} />
      </span>

      <div className="relative flex items-stretch">
        <span
          aria-hidden
          className="w-2.5 shrink-0"
          style={{ background: neon, boxShadow: `0 0 14px 0 ${neon}` }}
        />
        <span className="min-w-0 flex-1 px-4 py-4">
          <span className="block etiket-caps text-white/50">{o.kafe}</span>
          <span
            className="mt-1 block font-display text-xl leading-tight font-bold"
            style={{ color: neon, textShadow: `0 0 14px ${neon}66` }}
          >
            {o.baslik}
          </span>
          <span
            className="mt-3 block border-t border-dashed pt-2.5"
            style={{ borderColor: `${neon}44` }}
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="etiket-caps text-white/75">Kasada göster →</span>
              <span className="font-data text-[10px] text-white/40 tabular">son {o.son}</span>
            </span>
          </span>
        </span>
      </div>

      <Centikler />
    </div>
  );
}

/* ── D · Koyu cam + renk ışıması ───────────────────────────── */

function CamKart({ o }: { o: Ornek }) {
  const neon = NEON[o.renk];
  return (
    <div
      className="kart-golge relative overflow-hidden rounded-2xl text-white"
      style={{
        background: [
          // Kuponun rengi sağdan gelen bir hüzme olarak: koyu kart
          // sabit, renk yalnızca ışık olarak giriyor.
          `radial-gradient(90% 130% at 92% 50%, ${neon}3d, transparent 62%)`,
          "linear-gradient(120deg, #1c1830 0%, #14111f 100%)",
        ].join(", "),
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-6 -translate-y-1/2"
        style={{ color: neon, opacity: 0.3 }}
      >
        <Gorsel ad={o.gorsel} boy={118} />
      </span>

      <div className="relative flex items-stretch">
        <span
          aria-hidden
          className="w-2.5 shrink-0"
          style={{ background: `linear-gradient(180deg, ${neon}, ${neon}55)` }}
        />
        <span className="min-w-0 flex-1 px-4 py-4">
          <span className="block etiket-caps text-white/55">{o.kafe}</span>
          <span className="mt-1 block font-display text-xl leading-tight font-bold">
            {o.baslik}
          </span>
          <span className="mt-3 block border-t border-dashed border-white/18 pt-2.5">
            <span className="flex items-baseline justify-between gap-3">
              <span className="etiket-caps" style={{ color: neon }}>
                Kasada göster →
              </span>
              <span className="font-data text-[10px] text-white/45 tabular">son {o.son}</span>
            </span>
          </span>
        </span>
      </div>

      <Centikler />
    </div>
  );
}
