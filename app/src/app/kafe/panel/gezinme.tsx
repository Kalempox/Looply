"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * İşletme panelinin alt gezinme şeridi.
 *
 * ── Neden var ───────────────────────────────────────────────
 *
 * Her alt ekranın altında "← Panele dön" bağlantısı vardı ve kafe sahibi
 * iki ekran arasında gidip gelmek için her seferinde panele uğramak
 * zorundaydı: rapordan ödüllere geçmek üç dokunuş sürüyordu. Şerit, sık
 * kullanılan dört durağı her ekranda erişilebilir yapıyor.
 *
 * ── Neden dört ──────────────────────────────────────────────
 *
 * Kafe sahibinin günlük işi bu dörde iniyor: bugünün özeti, ödül ekonomisi,
 * sonuçlar, kurulum. Diğer ekranlar (ürünler, personel, masalar, happy hour)
 * kurulum sırasında bir kez kullanılıyor ve panelden erişiliyor — şeride
 * konsalardı sık kullanılanı seyrek kullanılan bastırırdı.
 */

const DURAKLAR = [
  { yol: "/kafe/panel", ad: "Panel", ikon: PanelIkonu },
  { yol: "/kafe/panel/oduller", ad: "Ödüller", ikon: OdulIkonu },
  { yol: "/kafe/panel/rapor", ad: "Rapor", ikon: RaporIkonu },
  { yol: "/kafe/panel/butce", ad: "Bütçe", ikon: ButceIkonu },
] as const;

export function PanelGezinme() {
  const yol = usePathname();

  return (
    <nav
      aria-label="İşletme paneli"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-cizgi bg-yuzey/95 backdrop-blur"
    >
      <ul className="mx-auto flex w-full max-w-4xl">
        {DURAKLAR.map((d) => {
          // "/kafe/panel" her alt sayfanın da öneki; yalnızca tam eşleşmede
          // seçili sayılıyor, yoksa dört durak birden aydınlanırdı.
          const secili = d.yol === "/kafe/panel" ? yol === d.yol : yol.startsWith(d.yol);
          const Ikon = d.ikon;

          return (
            <li key={d.yol} className="flex-1">
              <Link
                href={d.yol}
                aria-current={secili ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${
                  secili ? "text-vurgu" : "text-yazi-sonuk hover:text-yazi"
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
