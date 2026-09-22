"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ikibin,
  enBuyukKaro,
  IKIBIN_EN,
  type IkibinDurumu,
  type IkibinGirdisi,
  type IkibinYonu,
} from "../ikibin";
import {
  ikibinBosluk,
  ikibinKaro,
  ikibinPaketi,
  ikibinPanel,
  ikibinSahnesi,
  ikibinTahtasi,
  ikibinYaziBoyu,
} from "./ikibin-yuzey";
import { useOyunSesi } from "./oyun-ses";
import type { OyunEkraniProps } from "./ortak";

/**
 * 2048 ekranı — Ü259.
 *
 * ── Ü214: zamansız oyun, boş render yok ────────────────────
 *
 * Bu ekranda saat yok. Durum **yalnızca** oyuncu bir yöne kaydırınca
 * değişiyor, yani rAF döngüsüne de tick sayacına da gerek yok —
 * Blok'la aynı aile. Ü214'ün "saniyede 20 boş render" tuzağı burada
 * hiç kurulmuyor.
 *
 * ── Kaydırma: eşik ve YÖN SEÇİMİ ───────────────────────────
 *
 * Parmak hiçbir zaman tam yatay ya da tam dikey gitmiyor; baskın
 * eksen seçiliyor. Eşik olmadan en ufak titreme bir hamle sayılır ve
 * oyuncu istemediği yöne kayardı — 2048'de tek yanlış hamle turu
 * bitirebiliyor.
 */

/** Hamle sayılması için gereken en az kaydırma (piksel). */
const ESIK = 24;

type Yerel = {
  durum: IkibinDurumu;
  girdiler: IkibinGirdisi[];
};

export function IkibinEkrani({ tohum, bitti, kazandirir, cik }: OyunEkraniProps) {
  const [y, setY] = useState<Yerel>(() => ({
    durum: ikibin.baslat(tohum),
    girdiler: [],
  }));
  const bildirildi = useRef(false);
  const ses = useOyunSesi();
  const basla = useRef<{ x: number; yy: number } | null>(null);

  const oyna = useCallback((yon: IkibinYonu) => {
    setY((p) => {
      if (ikibin.bittiMi(p.durum)) return p;
      const girdi: IkibinGirdisi = { y: yon };
      const sonraki = ikibin.uygula(p.durum, girdi);
      /* ⚠️ `null` = kuraldışı hamle (hiçbir karo kıpırdamıyor).
         Kayda YAZILMIYOR: sunucu onu da reddederdi. */
      if (!sonraki) return p;
      return { durum: sonraki, girdiler: [...p.girdiler, girdi] };
    });
  }, []);

  // ── Bitiş bildirimi ──────────────────────────────────
  useEffect(() => {
    if (bildirildi.current || !ikibin.bittiMi(y.durum)) return;
    bildirildi.current = true;
    bitti(y.girdiler, ikibin.skor(y.durum));
  }, [y, bitti]);

  // ── Sesler ───────────────────────────────────────────
  const sonSkor = useRef(0);
  const sonOdul = useRef(false);
  useEffect(() => {
    const d = y.durum;
    if (d.bitti) {
      ses.cal("gecersiz");
      return;
    }
    if (d.odulVerildi && !sonOdul.current) {
      sonOdul.current = true;
      ses.cal("odul");
    } else {
      const s = ikibin.skor(d);
      if (s > sonSkor.current) ses.cal(s - sonSkor.current >= 32 ? "kombo" : "yerlesti");
      sonSkor.current = s;
    }
  }, [y.durum, ses]);

  // ── Klavye ───────────────────────────────────────────
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      const harita: Record<string, IkibinYonu> = {
        ArrowUp: "yukari",
        ArrowDown: "asagi",
        ArrowLeft: "sol",
        ArrowRight: "sag",
      };
      const yon = harita[e.key];
      if (!yon) return;
      if ((e.target as HTMLElement | null)?.closest("button")) return;
      e.preventDefault();
      oyna(yon);
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [oyna]);

  const durum = y.durum;
  const skor = ikibin.skor(durum);
  const paketVar = kazandirir === true;

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={ikibinSahnesi()}>
      {/* ── Üst şerit — ailenin HUD'u ──────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-3 pb-1">
        <span className="flex items-center gap-2 px-3.5 py-1.5" style={ikibinPanel()}>
          <span className="font-display text-[8px] leading-none font-bold tracking-[0.16em] text-white/55 uppercase">
            En büyük
          </span>
          <span className="font-display text-[18px] leading-none font-bold text-white tabular">
            {enBuyukKaro(durum)}
          </span>
        </span>

        <span className="flex items-center gap-2 px-3.5 py-1.5" style={ikibinPanel()}>
          <span className="flex flex-col">
            <span className="font-display text-[8px] leading-none font-bold tracking-[0.16em] text-white/55 uppercase">
              Skor
            </span>
            <span
              key={skor}
              className="dusen-skor mt-0.5 font-display text-[18px] leading-none font-bold text-white tabular"
            >
              {skor.toLocaleString("tr-TR")}
            </span>
          </span>
        </span>

        <span className="flex items-center" style={ikibinPanel()}>
          <SesDugmesi acik={ses.acik} degistir={ses.degistir} />
          {cik && (
            <button
              type="button"
              onClick={cik}
              aria-label="Çık"
              className="flex size-9 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </span>
      </div>

      {/* ── Tahta ───────────────────────────────────
          ⚠️ `<button>` DEĞİL, `role="button"`: düğmenin içerik modeli
          yalnızca metin düzeyi öge kabul ediyor ve tahtanın içinde on
          altı konumlandırılmış hücre var. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-2">
        <div
          role="button"
          tabIndex={0}
          aria-label="Kaydırarak birleştir"
          onPointerDown={(e) => {
            basla.current = { x: e.clientX, yy: e.clientY };
          }}
          onPointerUp={(e) => {
            const b = basla.current;
            basla.current = null;
            if (!b) return;
            const dx = e.clientX - b.x;
            const dy = e.clientY - b.yy;
            if (Math.abs(dx) < ESIK && Math.abs(dy) < ESIK) return;
            /* Baskın eksen kazanıyor — çapraz jest iki hamle
               üretmiyor. */
            if (Math.abs(dx) > Math.abs(dy)) oyna(dx > 0 ? "sag" : "sol");
            else oyna(dy > 0 ? "asagi" : "yukari");
          }}
          className="relative select-none"
          style={{
            ...ikibinTahtasi(),
            /* Bıçak'taki desen: iki `min()` oranı her zaman koruyor.
               `aspect-ratio` + `max-width` birlikte oranı sessizce
               iptal ediyor (Ü255'te ölçüldü). */
            width: "min(92vw, 62dvh)",
            height: "min(92vw, 62dvh)",
            padding: "2.2%",
            touchAction: "none",
          }}
        >
          <div
            className="grid h-full w-full gap-[2.2%]"
            style={{
              gridTemplateColumns: `repeat(${IKIBIN_EN}, 1fr)`,
              gridTemplateRows: `repeat(${IKIBIN_EN}, 1fr)`,
            }}
          >
            {durum.kareler.map((deger, i) => (
              <div key={i} className="relative" style={ikibinBosluk()}>
                {deger > 0 && (
                  <div
                    /* `key` değeri taşıyor: karo birleşince React yeni
                       bir öge görüyor ve animasyon koşuyor. */
                    key={`${i}-${deger}`}
                    className="ikibin-karo absolute inset-0 flex items-center justify-center font-display font-extrabold tabular"
                    style={{ ...ikibinKaro(deger), fontSize: ikibinYaziBoyu(deger) }}
                  >
                    {deger}
                  </div>
                )}
                {/* Ödül paketi — Ü207: `kazandirir` false ise çizilmiyor. */}
                {paketVar && durum.paket[i] && (
                  <span
                    aria-hidden
                    className="nabiz pointer-events-none absolute inset-0"
                    style={ikibinPaketi()}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alt şerit ─────────────────────────────── */}
      <div className="flex h-[42px] shrink-0 items-center justify-center px-3 pb-1">
        <span className="text-[12px] leading-none font-semibold text-white/70">
          {durum.hamle === 0
            ? "Parmağını kaydır · aynı sayılar birleşsin"
            : "Tahta dolmadan birleştir"}
        </span>
      </div>
    </div>
  );
}

/** Hoparlör — ailenin koyu arcade ekranlarıyla aynı hap içinde. */
function SesDugmesi({ acik, degistir }: { acik: boolean; degistir: () => void }) {
  return (
    <button
      type="button"
      onClick={degistir}
      aria-pressed={acik}
      aria-label={acik ? "Sesi kapat" : "Sesi aç"}
      className="flex size-9 items-center justify-center rounded-full transition-colors"
      style={{
        background: acik ? "rgba(103,232,249,.20)" : "transparent",
        color: acik ? "#fff" : "rgba(255,255,255,.62)",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z" fill="currentColor" />
        {acik ? (
          <>
            <path d="M15.6 9.2a4 4 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            <path d="M18.1 6.8a7.5 7.5 0 0 1 0 10.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </>
        ) : (
          <path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
