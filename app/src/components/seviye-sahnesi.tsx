"use client";

import { useEffect, useState } from "react";
import { LoopyKosan } from "./loopy-kosan";

/**
 * Seviye atlama sahnesi — Ü274.
 *
 * Ürün sahibi: *"2. seviyeye çıkma ekrana streak gibi bir animasyonla
 * gelmeli, yani her level atlama görseldeki gibi olmamalı."* Görseldeki,
 * sonuç listesinin içinde duran lacivert karttı (`SeviyeKutlamasi`):
 * kutlama, okunacak satırlardan biri gibi duruyordu.
 *
 * Seri sahnesinin (Ü66) dilinde: tam ekran, kendiliğinden gelen,
 * arkasından Loopy'nin koştuğu bir an. Kart kaldırılmadı — sahne
 * kapanınca sonuçların arasında kaydı olarak duruyor.
 *
 * ⚠️ Günlük damga YOK (serideki gibi): seviye atlamak nadir bir olay ve
 * her biri kendi kutlamasını hak ediyor. Sahne bileşen kurulunca bir
 * kez açılıyor; yalnızca seviye atlanan turun sonucunda çiziliyor.
 *
 * ⚠️ Yarım saniye gecikme serideki gerekçeyle: sayfa çizilirken açılan
 * tam ekran "bir şey ters gitti" gibi duruyor.
 */

/** Altın kıvılcımlar — seri sahnesindeki `seri-kivilcim` hareketiyle. */
const KIVILCIMLAR = [
  { x: 14, alt: 24, boy: 6, gecikme: 0, renk: "#fbbf24" },
  { x: 27, alt: 14, boy: 4, gecikme: 520, renk: "#fde68a" },
  { x: 41, alt: 28, boy: 5, gecikme: 1040, renk: "#ffffff" },
  { x: 55, alt: 12, boy: 4, gecikme: 300, renk: "#fde68a" },
  { x: 69, alt: 26, boy: 6, gecikme: 1480, renk: "#fbbf24" },
  { x: 82, alt: 16, boy: 4, gecikme: 820, renk: "#ffffff" },
  { x: 9, alt: 34, boy: 3, gecikme: 1900, renk: "#fde68a" },
  { x: 91, alt: 30, boy: 5, gecikme: 1260, renk: "#fbbf24" },
];

/** Rozetten saçılan parçalar — kartın `seviye-parca` hareketi, daha geniş. */
const PARCALAR = [
  { u: -110, v: -64, d: 180, g: 8, gecikme: 0 },
  { u: 102, v: -78, d: -150, g: 7, gecikme: 60 },
  { u: -138, v: 14, d: 120, g: 6, gecikme: 110 },
  { u: 128, v: 26, d: -200, g: 8, gecikme: 40 },
  { u: -58, v: -118, d: 220, g: 7, gecikme: 150 },
  { u: 54, v: -124, d: -110, g: 6, gecikme: 90 },
  { u: -88, v: 80, d: 160, g: 7, gecikme: 180 },
  { u: 80, v: 88, d: -170, g: 6, gecikme: 130 },
];

export function SeviyeSahnesi({ seviye }: { seviye: number }) {
  const [acik, setAcik] = useState(false);

  useEffect(() => {
    const zamanlayici = window.setTimeout(() => setAcik(true), 500);
    return () => window.clearTimeout(zamanlayici);
  }, []);

  // Sahne açıkken arkadaki sayfa kaymasın; Escape kapatsın.
  useEffect(() => {
    if (!acik) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcik(false);
    };
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = onceki;
      window.removeEventListener("keydown", esc);
    };
  }, [acik]);

  if (!acik) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Seviye atladın"
      className="sahne-ac fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto px-6 py-8"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 42%, #1e3a8a 0%, #172554 50%, #0b1024 100%)",
        }}
      />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {KIVILCIMLAR.map((k, i) => (
          <span
            key={i}
            className="seri-kivilcim absolute rounded-full"
            style={{
              left: `${k.x}%`,
              bottom: `${k.alt}%`,
              width: k.boy,
              height: k.boy,
              background: k.renk,
              animationDelay: `${k.gecikme}ms`,
            }}
          />
        ))}
      </div>

      {/* Seri sahnesindeki gibi: Loopy altta, içeriğin ARKASINDA koşuyor. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-hidden">
        <LoopyKosan />
      </div>

      <button
        type="button"
        onClick={() => setAcik(false)}
        aria-label="Kapat"
        className="absolute top-4 right-4 z-20 grid size-10 place-items-center rounded-full bg-white/10 text-xl text-white/80"
      >
        ×
      </button>

      <div className="sahne-cark-gel relative z-10 w-full max-w-[380px] text-center text-white">
        <div className="relative mx-auto w-fit">
          <span
            aria-hidden
            className="seviye-halka pointer-events-none absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, var(--color-odul) 0%, transparent 68%)" }}
          />
          <div className="seviye-rozet relative grid size-[136px] place-items-center rounded-full border-4 border-odul bg-vitrin-lacivert-acik">
            <span className="font-data text-6xl leading-none font-bold text-odul tabular">
              {seviye}
            </span>
          </div>
          {PARCALAR.map((p, i) => (
            <span
              key={i}
              aria-hidden
              className="seviye-parca pointer-events-none absolute top-1/2 left-1/2 rounded-[1px] bg-odul"
              style={
                {
                  width: p.g,
                  height: p.g,
                  "--u": `${p.u}px`,
                  "--v": `${p.v}px`,
                  "--d": `${p.d}deg`,
                  animationDelay: `${p.gecikme}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <div className="seri-sayi mt-7">
          <div className="etiket-caps text-odul">Seviye atladın</div>
          <div className="mt-2 font-display text-4xl leading-tight font-extrabold">
            {seviye}. seviyedesin
          </div>
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-white/75">
          Bu kafedeki seviyen yükseldi. Her kafede ayrı ilerliyorsun.
        </p>

        <button
          type="button"
          onClick={() => setAcik(false)}
          className="mt-7 w-full rounded-xl bg-odul py-3.5 font-display text-[16px] font-bold text-vitrin-lacivert"
        >
          Devam
        </button>
      </div>
    </div>
  );
}
