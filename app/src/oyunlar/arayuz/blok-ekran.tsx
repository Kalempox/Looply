"use client";

import { useCallback, useMemo, useState } from "react";
import { blok, type BlokDurumu, type BlokGirdisi, PARCA_HUCRELERI } from "../blok";
import type { OyunEkraniProps } from "./ortak";

/**
 * Blok ekranı — parça seç, ızgaraya dokun.
 *
 * Dokunma modeli mobil için seçildi: sürükle-bırak küçük ekranda parmağın
 * altında kalan hücreyi göstermez. Önce parça seçiliyor, sonra ızgarada
 * hedef hücreye dokunuluyor; dokunulan hücre parçanın **sol üst köşesi**
 * oluyor ve seçim yapılır yapılmaz geçerli konumlar ışıklandırılıyor —
 * böylece kural ezberlenmiyor, görünüyor.
 */
export function BlokEkrani({ tohum, bolum, bitti }: OyunEkraniProps) {
  const [durum, setDurum] = useState<BlokDurumu>(() => blok.baslat(tohum, bolum));
  const [girdiler, setGirdiler] = useState<BlokGirdisi[]>([]);
  const [secili, setSecili] = useState<number | null>(null);

  /** Seçili parçanın sığdığı köşeler — dokunmadan önce görünsün. */
  const gecerliKoseler = useMemo(() => {
    if (secili === null) return new Set<number>();
    const kume = new Set<number>();
    for (let s = 0; s < 8; s++) {
      for (let k = 0; k < 8; k++) {
        if (blok.uygula(durum, { t: secili, s, k })) kume.add(s * 8 + k);
      }
    }
    return kume;
  }, [durum, secili]);

  const koy = useCallback(
    (s: number, k: number) => {
      if (secili === null) return;
      const girdi: BlokGirdisi = { t: secili, s, k };
      const sonraki = blok.uygula(durum, girdi);
      if (!sonraki) return;

      const yeniGirdiler = [...girdiler, girdi];
      setDurum(sonraki);
      setGirdiler(yeniGirdiler);
      setSecili(null);

      if (blok.bittiMi(sonraki)) {
        bitti(yeniGirdiler, blok.skor(sonraki));
      }
    },
    [durum, girdiler, secili, bitti],
  );

  return (
    <div className="oyun-alani">
      <Sayaclar durum={durum} />

      {/* ── Izgara ─────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-8 gap-[3px] rounded-lg border border-cizgi bg-yuzey p-[3px]">
        {Array.from({ length: 64 }, (_, i) => {
          const s = Math.floor(i / 8);
          const k = i % 8;
          const dolu = (durum.izgara[s] & (1 << k)) !== 0;
          const hedef = gecerliKoseler.has(i);

          return (
            <button
              key={i}
              type="button"
              onClick={() => koy(s, k)}
              disabled={secili === null}
              aria-label={`${s + 1}. satır ${k + 1}. sütun`}
              className={`aspect-square transition-colors ${
                dolu
                  ? "bg-vurgu"
                  : hedef
                    ? "bg-vurgu/45 ring-1 ring-vurgu/70"
                    : "bg-cukur"
              }`}
            />
          );
        })}
      </div>

      {/* ── Teklifler ──────────────────────────────── */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {durum.teklifler.map((parca, t) => (
          <button
            key={t}
            type="button"
            disabled={parca < 0}
            onClick={() => setSecili(secili === t ? null : t)}
            aria-pressed={secili === t}
            className={`flex min-h-[84px] items-center justify-center rounded-2xl border border-cizgi bg-yuzey px-2 py-3 disabled:opacity-25 ${
              secili === t ? "ring-2 ring-vurgu" : ""
            }`}
          >
            {parca >= 0 ? <ParcaOnizleme parca={parca} /> : null}
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-[13px] text-yazi-sonuk">
        {secili === null
          ? "Bir parça seç"
          : gecerliKoseler.size === 0
            ? "Bu parça hiçbir yere sığmıyor — başka parça dene"
            : "Işıklı bir kareye dokun"}
      </p>
    </div>
  );
}

function Sayaclar({ durum }: { durum: BlokDurumu }) {
  const yuzde = Math.min(100, Math.round((durum.temizlenen / durum.hedef) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="etiket-caps text-yazi-sonuk">
          Temizlenen {durum.temizlenen}/{durum.hedef}
        </span>
        <span className="font-data text-xl leading-none font-bold text-vurgu tabular">
          {durum.skor}
        </span>
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-cukur">
        <div className="asil-serit h-full rounded-full bg-vurgu" style={{ width: `${yuzde}%` }} />
      </div>
    </div>
  );
}

/** Parçanın küçük önizlemesi — hangi biçimi seçtiğin görünsün. */
function ParcaOnizleme({ parca }: { parca: number }) {
  const hucreler = PARCA_HUCRELERI[parca];
  const enS = Math.max(...hucreler.map((h) => h[0])) + 1;
  const enK = Math.max(...hucreler.map((h) => h[1])) + 1;
  const dolu = new Set(hucreler.map(([s, k]) => s * enK + k));

  return (
    <div
      className="grid gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${enK}, 12px)` }}
      aria-hidden
    >
      {Array.from({ length: enS * enK }, (_, i) => (
        <span
          key={i}
          className={`h-3 w-3 ${dolu.has(i) ? "bg-odul" : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}
