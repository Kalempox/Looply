"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * İşletme panelinin gezinmesi — Ü58.
 *
 * ── İki biçim, tek liste ────────────────────────────────────
 *
 * Telefonda **alt şerit**, bilgisayarda **sol kenar çubuğu**. Aynı
 * duraklar, aynı dosya: ikisi ayrı bileşen olsaydı biri güncellenir
 * diğeri unutulurdu.
 *
 * ── Neden kenar çubuğu gerekti ──────────────────────────────
 *
 * Panel yalnızca telefondan bakılacak diye tasarlanmıştı: içerik dar bir
 * kolonda ortalanıyor, alt şerit ekranın altına yapışıyordu. Kafe sahibi
 * paneli **bilgisayardan da** açıyor ve orada ekranın üçte ikisi bomboş
 * kalıyordu — 2000 piksellik bir ekranda 900 piksellik bir sütun.
 * Referans yönetim panellerinin hepsi (Orchid, Valex, Enlite) sol
 * kenar çubuğu + tam genişlik içerik kullanıyor.
 *
 * ── Neden kenar çubuğunda daha çok durak var ────────────────
 *
 * Alt şeritte dört durak var çünkü telefonda beşinci ikon okunmuyor.
 * Kenar çubuğunda yer bol: kurulum ekranları da oraya giriyor ve kafe
 * sahibi "ürünler" için panele dönmek zorunda kalmıyor.
 */

/** Telefonda alt şeritte görünen dört durak — günlük iş bunlara iniyor. */
const GUNLUK = [
  { yol: "/kafe/panel", ad: "Panel", ikon: PanelIkonu },
  { yol: "/kafe/panel/oduller", ad: "Ödüller", ikon: OdulIkonu },
  { yol: "/kafe/panel/rapor", ad: "Rapor", ikon: RaporIkonu },
  { yol: "/kafe/panel/butce", ad: "Bütçe", ikon: ButceIkonu },
] as const;

/** Yalnızca kenar çubuğunda — kurulum sırasında bir kez kullanılıyor. */
const KURULUM = [
  { yol: "/kafe/panel/urunler", ad: "Ürünler", ikon: UrunIkonu },
  { yol: "/kafe/panel/masalar", ad: "Karekodlar", ikon: MasaIkonu },
  { yol: "/kafe/panel/oyunlar", ad: "Oyunlar", ikon: OyunIkonu },
  { yol: "/kafe/panel/personel", ad: "Personel", ikon: PersonelIkonu },
  { yol: "/kafe/panel/happy-hour", ad: "Happy Hour", ikon: SaatIkonu },
  { yol: "/kafe/panel/konum", ad: "Konum", ikon: KonumIkonu },
] as const;

export function PanelGezinme() {
  const yol = usePathname();

  // "/kafe/panel" her alt sayfanın da öneki; yalnızca tam eşleşmede
  // seçili sayılıyor, yoksa bütün duraklar birden aydınlanırdı.
  const secili = (d: string) => (d === "/kafe/panel" ? yol === d : yol.startsWith(d));

  return (
    <>
      {/* ── Telefon: alt şerit ─────────────────────────── */}
      <nav
        aria-label="İşletme paneli"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-cizgi bg-yuzey/95 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex w-full max-w-4xl">
          {GUNLUK.map((d) => {
            const Ikon = d.ikon;
            return (
              <li key={d.yol} className="flex-1">
                <Link
                  href={d.yol}
                  aria-current={secili(d.yol) ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${
                    secili(d.yol) ? "text-vurgu" : "text-yazi-sonuk hover:text-yazi"
                  }`}
                >
                  <Ikon />
                  <span className="etiket-caps text-[10px]">{d.ad}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Bilgisayar: sol kenar çubuğu ────────────────── */}
      <aside
        aria-label="İşletme paneli"
        className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-cizgi bg-yuzey lg:flex"
      >
        <div className="border-b border-cizgi px-5 py-5">
          <div className="font-display text-lg leading-none font-extrabold tracking-tight">
            Looply
          </div>
          <div className="etiket-caps mt-1.5 text-[10px] text-yazi-sonuk">İşletme paneli</div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Grup baslik="Günlük" duraklar={GUNLUK} secili={secili} />
          <div className="mt-5">
            <Grup baslik="Kurulum" duraklar={KURULUM} secili={secili} />
          </div>
        </div>

        <div className="border-t border-cizgi px-5 py-4">
          <Link href="/cikis" className="text-[13px] text-yazi-sonuk underline hover:text-yazi">
            Çıkış yap
          </Link>
        </div>
      </aside>
    </>
  );
}

function Grup({
  baslik,
  duraklar,
  secili,
}: {
  baslik: string;
  duraklar: readonly { yol: string; ad: string; ikon: () => React.ReactElement }[];
  secili: (yol: string) => boolean;
}) {
  return (
    <div>
      <div className="etiket-caps px-2 pb-2 text-[9px] text-yazi-sonuk">{baslik}</div>
      <ul className="space-y-0.5">
        {duraklar.map((d) => {
          const Ikon = d.ikon;
          const aktif = secili(d.yol);
          return (
            <li key={d.yol}>
              <Link
                href={d.yol}
                aria-current={aktif ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-[14px] font-semibold transition-colors ${
                  aktif ? "bg-vurgu/10 text-vurgu" : "text-yazi-sonuk hover:bg-cukur hover:text-yazi"
                }`}
              >
                <Ikon />
                {d.ad}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── İkonlar ──────────────────────────────────────────────────
 *
 * Satır içi SVG: emoji kullanılmıyor (işletme tarafının kuralı) ve dış
 * kaynak da yok — ikon için ağ isteği yapmak gereksiz.
 * `currentColor` sayesinde seçili rengi bağlantıdan miras alıyorlar.
 */

const ORTAK = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function PanelIkonu() {
  return (
    <svg {...ORTAK}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function OdulIkonu() {
  return (
    <svg {...ORTAK}>
      <path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Z" />
      <path d="M3 5.5h18V9H3z" />
      <path d="M12 5.5V21" />
      <path d="M12 5.5S10.5 3 8.75 3a2 2 0 1 0 0 4H12Zm0 0S13.5 3 15.25 3a2 2 0 1 1 0 4H12Z" />
    </svg>
  );
}

function RaporIkonu() {
  return (
    <svg {...ORTAK}>
      <path d="M3 21h18" />
      <rect x="5" y="12" width="4" height="7" rx="1" />
      <rect x="10" y="7" width="4" height="12" rx="1" />
      <rect x="15" y="14" width="4" height="5" rx="1" />
    </svg>
  );
}

function ButceIkonu() {
  return (
    <svg {...ORTAK}>
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <path d="M2.5 10.5h19" />
      <circle cx="17" cy="15" r="1.3" />
    </svg>
  );
}

function UrunIkonu() {
  return (
    <svg {...ORTAK}>
      <path d="M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
      <path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7 4.5v1.5M11 3.5v2.5" />
    </svg>
  );
}

function MasaIkonu() {
  return (
    <svg {...ORTAK}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
    </svg>
  );
}

/** Ü109: oyun yönetimi — kumanda kolu. */
function OyunIkonu() {
  return (
    <svg {...ORTAK}>
      <rect x="2" y="7" width="20" height="11" rx="4" />
      <path d="M7 11v3M5.5 12.5h3M15.5 11.5h.01M18 13.5h.01" />
    </svg>
  );
}

function PersonelIkonu() {
  return (
    <svg {...ORTAK}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16 5.4a3.2 3.2 0 0 1 0 5.2M17.5 20a6.2 6.2 0 0 0-2.3-4.8" />
    </svg>
  );
}

function SaatIkonu() {
  return (
    <svg {...ORTAK}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function KonumIkonu() {
  return (
    <svg {...ORTAK}>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}
