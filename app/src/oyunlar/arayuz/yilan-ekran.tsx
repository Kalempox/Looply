"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  yilan,
  YILAN_EN,
  YILAN_BOY,
  adimTickiHesapla,
  type YilanDurumu,
  type YilanGirdisi,
  type Yon,
} from "../yilan";
import { TICK_MS } from "../sozlesme";
import { hucreStili, oyunTonu, tahtaStili } from "./tahta";
import type { OyunEkraniProps } from "./ortak";

/**
 * Yılan ekranı.
 *
 * ── Ödül tahtanın üstünde (Ü91) ─────────────────────────────
 *
 * Yemin bazısı elma değil **kupon**. Ekranın işi onu ayırt edilebilir
 * kılmak: altın zemin, nabız ve kupon çizimi. Oyuncu ona doğru sürüyor,
 * yakalayamayabiliyor — kaybetme ihtimali mekaniğin kendisi.
 *
 * ── Saat duvar saatinden ────────────────────────────────────
 *
 * Düşen ve Kelime ile aynı çözüm (Ü84): tick sayarak ilerletmek gizli
 * sekmede tarayıcı kısıtlaması yüzünden duruyor ve oyuncu sekmeyi arkaya
 * atıp yılanı dondurabiliyordu.
 */

type Yerel = {
  durum: YilanDurumu;
  girdiler: YilanGirdisi[];
  tick: number;
};

export function YilanEkrani({ oyunId, tohum, bitti }: OyunEkraniProps) {
  const [y, setY] = useState<Yerel>(() => ({
    durum: yilan.baslat(tohum),
    girdiler: [],
    tick: 0,
  }));
  const bildirildi = useRef(false);
  const r = oyunTonu(oyunId);

  // ── Saat ─────────────────────────────────────────────
  useEffect(() => {
    const baslangic = Date.now();
    const zamanlayici = setInterval(() => {
      setY((p) => {
        if (yilan.bittiMi(p.durum)) return p;
        const tick = Math.floor((Date.now() - baslangic) / TICK_MS);
        if (tick <= p.tick) return p;
        const sonraki = yilan.uygula(p.durum, { tick, y: "bekle" });
        return { ...p, tick, durum: sonraki ?? p.durum };
      });
    }, TICK_MS);

    return () => clearInterval(zamanlayici);
  }, []);

  // ── Bitiş bildirimi ──────────────────────────────────
  useEffect(() => {
    if (bildirildi.current || !yilan.bittiMi(y.durum)) return;
    bildirildi.current = true;

    // Son bir zaman işareti: sunucunun saati aynı noktaya kadar
    // ilerletmesi için (Düşen'deki aynı gerekçe).
    bitti([...y.girdiler, { tick: y.tick, y: "bekle" }], yilan.skor(y.durum));
  }, [y, bitti]);

  const cevir = useCallback((yon: Yon) => {
    setY((p) => {
      if (yilan.bittiMi(p.durum)) return p;
      const girdi: YilanGirdisi = { tick: p.tick, y: yon };
      const sonraki = yilan.uygula(p.durum, girdi);
      if (!sonraki) return p;
      return { ...p, durum: sonraki, girdiler: [...p.girdiler, girdi] };
    });
  }, []);

  // ── Klavye (masaüstünde test için) ───────────────────
  useEffect(() => {
    const eslesme: Record<string, Yon> = {
      ArrowUp: "yukari",
      ArrowDown: "asagi",
      ArrowLeft: "sol",
      ArrowRight: "sag",
    };
    const tus = (e: KeyboardEvent) => {
      const yon = eslesme[e.key];
      if (!yon) return;
      e.preventDefault();
      cevir(yon);
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [cevir]);

  const durum = y.durum;
  const govde = new Set(durum.govde);
  const bas = durum.govde[0];

  return (
    <div className="oyun-alani">
      <div className="flex items-baseline justify-between gap-3">
        <span className="etiket-caps text-yazi-sonuk">
          {durum.yenen} yem · hız {hizKademesi(durum.adimTicki)}
        </span>
        <span
          key={durum.skor}
          className="patla font-data text-2xl leading-none font-bold tabular"
          style={{ color: r.ana }}
        >
          {durum.skor}
        </span>
      </div>

      {/* Başlamadan önce ne yapacağını söyle: yılan bir yöne basılana
          kadar yerinde duruyor (Ü91). */}
      {!durum.basladi && (
        <p className="mt-1.5 text-[13px] text-yazi-sonuk">
          Başlamak için bir yöne bas
        </p>
      )}

      {/* Ödül tahtada: oyuncu neye doğru sürdüğünü bilmeli. */}
      {durum.basladi && durum.yemOdulMu && (
        <p className="nabiz mt-1.5 inline-block rounded-full border border-odul bg-odul-zemin px-2.5 py-0.5 font-data text-[11px] font-bold tracking-wide text-odul-koyu uppercase">
          Ödül tahtada · yakala
        </p>
      )}

      <div
        className="kart-golge mx-auto mt-4 grid gap-[2px] rounded-2xl p-1.5"
        style={{
          ...tahtaStili(oyunId),
          gridTemplateColumns: `repeat(${YILAN_EN}, minmax(0, 1fr))`,
          maxWidth: 340,
        }}
      >
        {Array.from({ length: YILAN_EN * YILAN_BOY }, (_, i) => {
          const yemMi = i === durum.yem;

          if (yemMi) {
            return (
              <span
                key={i}
                className={`aspect-square rounded-full ${durum.yemOdulMu ? "nabiz" : ""}`}
                style={
                  durum.yemOdulMu
                    ? {
                        background: "linear-gradient(180deg, #f5cf5e 0%, #d4af37 100%)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 0 8px rgba(212,175,55,0.7)",
                      }
                    : { background: "#e05252", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)" }
                }
              />
            );
          }

          if (!govde.has(i)) {
            return <span key={i} className="aspect-square rounded-[3px]" style={hucreStili(oyunId, "bos")} />;
          }

          // Baş, gövdeden ayrılıyor: hangi yöne gittiğin bir bakışta görünsün.
          return (
            <span
              key={i}
              className="aspect-square rounded-[3px]"
              style={
                i === bas
                  ? {
                      background: `linear-gradient(180deg, ${r.canli} 0%, ${r.koyu} 100%)`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), 0 0 6px ${r.ana}66`,
                    }
                  : hucreStili(oyunId, "dolu")
              }
            />
          );
        })}
      </div>

      {/* Yön tuşları artı düzeninde: yılanda yön uzamsal bir şey ve düz bir
          sırada dizmek oyuncuyu her seferinde düşündürüyor. */}
      <div className="mx-auto mt-5 grid w-fit grid-cols-3 gap-2">
        <span />
        <Dugme etiket="▲" adi="Yukarı" onBas={() => cevir("yukari")} renk={r.ana} />
        <span />
        <Dugme etiket="◀" adi="Sola" onBas={() => cevir("sol")} renk={r.ana} />
        <Dugme etiket="▼" adi="Aşağı" onBas={() => cevir("asagi")} renk={r.ana} />
        <Dugme etiket="▶" adi="Sağa" onBas={() => cevir("sag")} renk={r.ana} />
      </div>
    </div>
  );
}

function Dugme({
  etiket,
  adi,
  onBas,
  renk,
}: {
  etiket: string;
  adi: string;
  onBas: () => void;
  renk: string;
}) {
  return (
    <button
      type="button"
      onClick={onBas}
      aria-label={adi}
      className="size-16 rounded-2xl bg-yuzey font-data text-2xl leading-none select-none transition-transform active:scale-95"
      style={{ border: `1px solid ${renk}40`, color: renk, boxShadow: `0 1px 2px ${renk}1a` }}
    >
      {etiket}
    </button>
  );
}

/**
 * Adım hızını okunur bir kademeye çeviriyor.
 *
 * Tick sayısı oyuncuya bir şey söylemiyor ve ters yönde artıyor;
 * 11 tick → 1, 3 tick → 9.
 */
function hizKademesi(adimTicki: number): number {
  return Math.max(1, 11 - adimTicki + 1);
}

export { adimTickiHesapla };
