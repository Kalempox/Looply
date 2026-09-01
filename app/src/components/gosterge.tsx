/**
 * İşletme panelinin gösterge parçaları — Ü62.
 *
 * ── Neden ortak dosya ───────────────────────────────────────
 *
 * Aynı dört parça sekiz sayfada lazım: sayı kartı, halka gösterge,
 * çubuk liste, dilim listesi. Sayfa sayfa yazılsalardı biri kalın
 * çerçeveli, biri ince olurdu; sekizinci sayfada da tamamen başka bir
 * şey. Panel bir belge değil, bir gösterge takımı — parçaların aynı
 * yerden gelmesi, dilin tutarlı kalmasının tek yolu.
 *
 * ── Referanslar ─────────────────────────────────────────────
 *
 * Ürün sahibinin verdiği yönetim panellerinden (Orchid, Valex, Enlite)
 * alınan sözlük: etiket + ikon kutusu + büyük sayı + değişim rozeti,
 * kartın tabanına yayılan kıvılcım, ortasında yüzde yazan halka, renkli
 * ilerleme çubuklarından oluşan liste.
 *
 * ── Renk anlam taşımıyor ────────────────────────────────────
 *
 * Kutuların rengi yalnızca birbirinden ayırıyor. "Kırmızı = kötü" gibi
 * bir okuma ekrana gömülmüyor: "bugün 2 kupon az verildi" kafe için
 * kötü haber değil, bütçe korunuyor demek — o yorum kafeye göre değişir.
 */

import Link from "next/link";

/* ── Sayı kartı ────────────────────────────────────────────── */

export type SayiKartiOzellik = {
  etiket: string;
  /** Zaten biçimlenmiş değer — TL, adet, yüzde ne olursa. */
  deger: string;
  /** Değerin altındaki kısa açıklama. */
  alt?: string;
  ikon?: React.ReactNode;
  /** Düne/geçen döneme göre yüzde değişim; bilinmiyorsa geçilmiyor. */
  degisim?: number | null;
  /** Kıvılcım grafiğin verisi — en az iki nokta gerekiyor. */
  seri?: number[];
  /** Dolu renkli kart. Bir ekranda **en fazla bir tane** olmalı. */
  vurgulu?: boolean;
  /** Kart tıklanabilirse gidilecek yer. */
  yol?: string;
};

export function SayiKarti({
  etiket,
  deger,
  alt,
  ikon,
  degisim,
  seri,
  vurgulu = false,
  yol,
}: SayiKartiOzellik) {
  const govde = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={`etiket-caps text-[10px] ${vurgulu ? "text-white/75" : "text-yazi-sonuk"}`}
        >
          {etiket}
        </span>
        {ikon && (
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
              vurgulu ? "bg-white/20 text-white" : "bg-cukur text-yazi"
            }`}
          >
            {ikon}
          </span>
        )}
      </div>

      <div className="mt-2.5 font-data text-2xl leading-none font-bold tabular">{deger}</div>

      {(degisim != null || alt) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {degisim != null && (
            <span
              className={`rounded-full px-1.5 py-0.5 font-data text-[10px] font-bold tabular ${
                vurgulu
                  ? "bg-white/20 text-white"
                  : degisim >= 0
                    ? "bg-vurgu/10 text-vurgu"
                    : "bg-cukur text-yazi-sonuk"
              }`}
            >
              {degisim >= 0 ? "↑" : "↓"} %{Math.abs(degisim)}
            </span>
          )}
          {alt && (
            <span className={`text-[11px] ${vurgulu ? "text-white/75" : "text-yazi-sonuk"}`}>
              {alt}
            </span>
          )}
        </div>
      )}

      {seri && seri.length > 1 && <Kivilcim seri={seri} vurgulu={vurgulu} />}
    </>
  );

  const sinif = `relative overflow-hidden rounded-2xl border px-4 pt-4 ${
    seri && seri.length > 1 ? "pb-8" : "pb-4"
  } ${vurgulu ? "border-vurgu bg-vurgu text-white" : "border-cizgi bg-yuzey"} ${
    yol ? "transition-all hover:-translate-y-0.5 hover:shadow-md" : ""
  }`;

  return yol ? (
    <Link href={yol} className={sinif}>
      {govde}
    </Link>
  ) : (
    <div className={sinif}>{govde}</div>
  );
}

/**
 * Kıvılcım grafik — serinin şekli, eksensiz.
 *
 * Sayı yok, ızgara yok, etiket yok: kart zaten sayıyı yazıyor. Buranın
 * tek işi "yükseliyor mu düşüyor mu" sorusunu bir bakışta cevaplamak.
 *
 * Hepsi eşitse aralık sıfıra düşer ve bölme patlar; en az bir kabul
 * ediliyor ve çizgi düz çıkıyor.
 */
function Kivilcim({ seri, vurgulu }: { seri: number[]; vurgulu: boolean }) {
  const enAz = Math.min(...seri);
  const aralik = Math.max(1, Math.max(...seri) - enAz);

  const nokta = seri.map((v, i) => {
    const x = (i / (seri.length - 1)) * 100;
    const y = 24 - ((v - enAz) / aralik) * 20;
    return `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
  });

  const cizgi = `M ${nokta.join(" L ")}`;
  const renk = vurgulu ? "#ffffff" : "var(--color-vurgu)";

  return (
    <svg
      viewBox="0 0 100 26"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-7 w-full"
      aria-hidden
    >
      <path d={`${cizgi} L 100,26 L 0,26 Z`} fill={renk} opacity={vurgulu ? 0.22 : 0.1} />
      <path
        d={cizgi}
        fill="none"
        stroke={renk}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ── Halka gösterge ────────────────────────────────────────── */

/**
 * Ortasında değer yazan yay.
 *
 * Oran anlatan sayılar için: bütçenin ne kadarı kullanıldı, havuzun ne
 * kadarı kaldı. Çubuk da olurdu ama halka **tek bir orana** odaklanıyor
 * ve kartın içinde çubuktan az yer kaplıyor.
 *
 * Yay tam çember değil, 270 derece: alt kısımdaki boşluk hangi tarafın
 * "başlangıç" olduğunu belli ediyor. Tam çemberde dolu ile boş ayırt
 * edilemiyor.
 */
export function Halka({
  yuzde,
  ortaUst,
  ortaAlt,
  renk = "var(--color-vurgu)",
}: {
  yuzde: number;
  ortaUst: string;
  ortaAlt?: string;
  renk?: string;
}) {
  const kirpik = Math.max(0, Math.min(100, yuzde));
  const R = 42;
  const YAY = 270;
  const cevre = 2 * Math.PI * R;
  const yayUzunlugu = (cevre * YAY) / 360;

  return (
    <div className="relative mx-auto size-[132px]">
      <svg viewBox="0 0 100 100" className="size-full -rotate-[225deg]" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--color-cukur)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${yayUzunlugu} ${cevre}`}
        />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={renk}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${(yayUzunlugu * kirpik) / 100} ${cevre}`}
          style={{ transition: "stroke-dasharray 600ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-data text-2xl leading-none font-bold tabular">{ortaUst}</span>
        {ortaAlt && (
          <span className="etiket-caps mt-1.5 text-[9px] text-yazi-sonuk">{ortaAlt}</span>
        )}
      </div>
    </div>
  );
}

/* ── Çubuk liste ───────────────────────────────────────────── */

export type CubukSatiri = {
  etiket: string;
  deger: number;
  /** Sağda yazan metin — "12 oyun", "3 onay" gibi. */
  not?: string;
};

/**
 * Sıralı çubuk listesi.
 *
 * Enlite'ın "Achievement Target" listesinden: her satırın altında kendi
 * ilerleme çubuğu. Masa hareketi, kasiyer onayı, ürün kullanımı gibi
 * "kim ne kadar" sorularının hepsi bu şekle oturuyor.
 *
 * Ölçek **en büyük satıra** göre, toplama göre değil: amaç payı değil
 * karşılaştırmayı göstermek. Toplama göre olsaydı yirmi satırlık bir
 * listede hepsi görünmez ince çizgilere inerdi.
 */
export function CubukListe({
  satirlar,
  bosMetin = "Henüz kayıt yok.",
}: {
  satirlar: CubukSatiri[];
  bosMetin?: string;
}) {
  if (satirlar.length === 0) {
    return <p className="text-[14px] text-yazi-sonuk">{bosMetin}</p>;
  }

  const enYuksek = Math.max(1, ...satirlar.map((s) => s.deger));

  return (
    <ul className="flex flex-col gap-3">
      {satirlar.map((s, i) => (
        <li key={`${s.etiket}-${i}`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[14px] font-semibold">{s.etiket}</span>
            <span className="shrink-0 font-data text-[12px] text-yazi-sonuk tabular">
              {s.not ?? s.deger.toLocaleString("tr-TR")}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-cukur">
            <div
              className="h-full rounded-full bg-vurgu"
              style={{ width: `${Math.max(3, (s.deger / enYuksek) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── İkonlar ──────────────────────────────────────────────────
 *
 * Satır içi SVG: işletme tarafında emoji yok (Ü31) ve ikon için ağ
 * isteği yapmak gereksiz. `currentColor` ile kutunun rengini alıyorlar.
 */

const CIZGI = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const IKON = {
  kisi: (
    <svg {...CIZGI}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  ),
  kupon: (
    <svg {...CIZGI}>
      <path d="M3 9V6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5V9a3 3 0 0 0 0 6v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V15a3 3 0 0 0 0-6Z" />
      <path d="M14 5v14" strokeDasharray="2 2.5" />
    </svg>
  ),
  onay: (
    <svg {...CIZGI}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </svg>
  ),
  para: (
    <svg {...CIZGI}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
  masa: (
    <svg {...CIZGI}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  urun: (
    <svg {...CIZGI}>
      <path d="M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
      <path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16" />
    </svg>
  ),
  odul: (
    <svg {...CIZGI}>
      <path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Z" />
      <path d="M3 5.5h18V9H3z" />
      <path d="M12 5.5V21" />
    </svg>
  ),
  saat: (
    <svg {...CIZGI}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
} as const;
