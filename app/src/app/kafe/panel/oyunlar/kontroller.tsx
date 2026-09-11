"use client";

import { useState, useTransition } from "react";
import { oyunDurumu, type OyunDurumu } from "./actions";
import { IsletmeUyari } from "@/components/isletme";

/**
 * Oyunu açıp kapatan anahtar (Ü109).
 *
 * ── Neden hata satırın YANINDA duruyor ──────────────────────
 *
 * Tek gerçek hata *"en az bir oyun açık kalmalı"* ve o hata belirli bir
 * satıra ait: kafe son oyunu kapatmaya çalıştı. Sayfanın tepesinde bir
 * uyarı gösterseydik hangi denemeye ait olduğu kaybolurdu.
 */
export function OyunAnahtari({
  oyunId,
  acik,
  oyunAdi,
}: {
  oyunId: string;
  acik: boolean;
  oyunAdi: string;
}) {
  const [bekliyor, basla] = useTransition();
  const [durum, setDurum] = useState<OyunDurumu>({});

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={bekliyor}
        aria-pressed={acik}
        aria-label={`${oyunAdi} ${acik ? "açık" : "kapalı"}`}
        onClick={() =>
          basla(async () => setDurum(await oyunDurumu(oyunId, !acik)))
        }
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          acik ? "bg-vurgu" : "bg-cizgi"
        }`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all ${
            acik ? "left-6" : "left-1"
          }`}
        />
      </button>

      {durum.hata && (
        <div className="w-full max-w-xs">
          <IsletmeUyari>{durum.hata}</IsletmeUyari>
        </div>
      )}
    </div>
  );
}
