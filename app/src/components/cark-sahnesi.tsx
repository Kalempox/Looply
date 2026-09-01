"use client";

import { useEffect, useState } from "react";
import { Cark, type CarkDilimi, type CevirmeCevabi } from "./cark";

/**
 * Çark sahnesi — Ü59.
 *
 * ── Neden tam ekran ─────────────────────────────────────────
 *
 * Çark bir kartın içinde duruyordu: sayfanın ortasında, altında ve
 * üstünde başka içerik varken. Ürün sahibi *"çarkı çevirme animasyonu
 * ekrana gelip ekranda belirmeli, o kutunun içinde olmamalı"* dedi.
 *
 * Haklı gerekçesi şu: çevirme **tek seferlik ve gününün olayı**. Kartın
 * içinde kaldığında sayfadaki onuncu bileşen gibi görünüyor; tam ekranda
 * ekranın o anki tek işi oluyor ve dönüş gerçekten bir olay gibi
 * hissediliyor.
 *
 * ── Sayfada kalan şey ───────────────────────────────────────
 *
 * Sayfada yalnızca **davet** duruyor: küçük bir çark önizlemesi ve
 * düğme. Ödül listesini orada da göstermek sahneyi gereksiz kılardı.
 *
 * ── Kapatma kuralı ──────────────────────────────────────────
 *
 * Çark dönerken sahne kapanmıyor: yarıda kesilen bir dönüşten sonra
 * oyuncu ne kazandığını göremez ama kupon çoktan yazılmıştır. Kapatma
 * yalnızca çevirmeden önce ve sonuç göründükten sonra açık.
 */
export function CarkSahnesi({
  dilimler,
  cevir,
  kilitli = false,
  kapaliMetin,
  altMetin,
  kazandiMetni,
  davetBaslik,
  davetMetin,
}: {
  dilimler: CarkDilimi[];
  cevir: () => Promise<CevirmeCevabi>;
  kilitli?: boolean;
  /** Çark kapalıysa sayfada görünen sebep. */
  kapaliMetin?: string;
  altMetin: string;
  kazandiMetni: React.ReactNode;
  davetBaslik: string;
  davetMetin: string;
}) {
  const [acik, setAcik] = useState(false);
  const [donuyor, setDonuyor] = useState(false);

  /**
   * Sahne açıkken arka plan kaymasın.
   *
   * Kilitlenmezse çark tam ekranken parmak hareketi altındaki sayfayı
   * kaydırıyor ve sahne kapandığında oyuncu bambaşka bir yerde
   * buluyor kendini.
   */
  useEffect(() => {
    if (!acik) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = onceki;
    };
  }, [acik]);

  useEffect(() => {
    if (!acik) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !donuyor) setAcik(false);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [acik, donuyor]);

  return (
    <>
      {/* ── Sayfadaki davet ───────────────────────────── */}
      <button
        type="button"
        onClick={() => !kilitli && setAcik(true)}
        disabled={kilitli}
        className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-5 text-left transition-all ${
          kilitli
            ? "border-cizgi bg-yuzey opacity-60"
            : "border-odul bg-cukur hover:-translate-y-0.5 hover:shadow-md"
        }`}
      >
        <span className="shrink-0">
          <MiniCark dilimler={dilimler} soluk={kilitli} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg leading-tight font-bold">
            {davetBaslik}
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-yazi-sonuk">
            {kilitli ? kapaliMetin : davetMetin}
          </span>
        </span>
        {!kilitli && (
          <span aria-hidden className="text-[18px] text-yazi-sonuk">
            →
          </span>
        )}
      </button>

      {/* ── Sahne ─────────────────────────────────────── */}
      {acik && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Şans çarkı"
          className="sahne-ac fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto px-5 py-8"
        >
          {/*
            Zemin ve ışınlar AYRI katmanlar, ikisi de `absolute inset-0`.

            Bir tur zemin doğrudan diyalogun kendi `background`'ıydı ve
            ışınlar `-z-10` ile arkasına konmuştu. Sonuç: sahne saydam
            açıldı, altındaki sayfa okunuyordu. Negatif z-index, kendi
            yığın bağlamı içinde ebeveynin zemininin de arkasına düşüyor
            — o katman hiç görünmüyor, zemin de boyanmıyordu.

            Şimdi sıralama açık: zemin, ışınlar, içerik. Negatif değer yok.
          */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              // Koyu mor gradyan: referans çarkların hepsi koyu, doygun bir
              // zemine oturuyor. Pastel dilimler ancak orada parlıyor.
              background:
                "radial-gradient(circle at 50% 38%, #4c2a8f 0%, #2a1450 45%, #150a2b 100%)",
            }}
          />
          <span
            aria-hidden
            className="sahne-isik pointer-events-none absolute top-1/2 left-1/2 size-[150vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.14]"
            style={{
              background:
                "repeating-conic-gradient(from 0deg, #fff 0deg 6deg, transparent 6deg 18deg)",
            }}
          />

          <button
            type="button"
            onClick={() => setAcik(false)}
            disabled={donuyor}
            aria-label="Kapat"
            className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/12 text-[20px] text-white transition-colors hover:bg-white/22 disabled:opacity-30"
          >
            ×
          </button>

          <div className="sahne-cark-gel relative z-10 w-full max-w-[420px]">
            <Cark
              dilimler={dilimler}
              cevir={cevir}
              altMetin={altMetin}
              kazandiMetni={kazandiMetni}
              koyuZemin
              donusBildir={setDonuyor}
            />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Davetteki küçük çark.
 *
 * Gerçek çarkın küçültülmüş hâli değil, sadeleştirilmiş bir simgesi:
 * yazı yok, ampul yok. Küçük boyutta ikisi de okunmuyor ve yalnızca
 * kirletiyor.
 */
function MiniCark({
  dilimler,
  soluk,
}: {
  dilimler: CarkDilimi[];
  soluk: boolean;
}) {
  const n = Math.max(1, dilimler.length);
  const adim = 360 / n;

  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 100 100"
      aria-hidden
      className={soluk ? "grayscale" : ""}
    >
      <circle cx="50" cy="50" r="49" fill="#e5316b" />
      {Array.from({ length: n }, (_, i) => {
        const bas = ((i * adim - 90) * Math.PI) / 180;
        const son = (((i + 1) * adim - 90) * Math.PI) / 180;
        const r = 44;
        const x1 = 50 + r * Math.cos(bas);
        const y1 = 50 + r * Math.sin(bas);
        const x2 = 50 + r * Math.cos(son);
        const y2 = 50 + r * Math.sin(son);
        return (
          <path
            key={i}
            d={`M 50 50 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${adim > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`}
            fill={MINI_RENKLER[i % MINI_RENKLER.length]}
            stroke="#fff"
            strokeWidth="1.5"
          />
        );
      })}
      <circle
        cx="50"
        cy="50"
        r="11"
        fill="#ffcf3f"
        stroke="#fff"
        strokeWidth="3"
      />
    </svg>
  );
}

const MINI_RENKLER = [
  "#8b7cf6",
  "#fef3c7",
  "#5eead4",
  "#fecdd3",
  "#fde68a",
  "#a5b4fc",
];
