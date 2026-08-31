"use client";

import { useActionState } from "react";
import { girisEylemi, type KasaGirisDurumu } from "./actions";
import { useCihazId } from "@/lib/cihaz";

const BOS: KasaGirisDurumu = {};

/**
 * Kasiyer PIN formu.
 *
 * Cihaz kimliği `localStorage`'dan geliyor ve gizli alanla gönderiliyor;
 * sunucu ondan kafeyi çözüyor. Kasiyer hiçbir şey seçmiyor — tabletini alıp
 * dört hane giriyor.
 *
 * Tasarım kasa tezgâhına göre: büyük rakamlar, geniş dokunma alanı, tek
 * elle erişilebilir. Loş kafede, kalabalık kasada, üç saniyede.
 */
export function KasaGirisFormu() {
  const cihazId = useCihazId();
  const [durum, action, bekliyor] = useActionState(girisEylemi, BOS);

  return (
    <form action={action} className="w-full max-w-xs">
      <input type="hidden" name="cihazId" value={cihazId} />

      {durum.hata && (
        <div className="mb-5 rounded-lg border border-tehlike/60 bg-yuzey px-4 py-3 text-center text-[14px] text-tehlike">
          {durum.hata}
        </div>
      )}

      <label className="block">
        <span className="mb-3 block text-center etiket-caps text-yazi-sonuk">
          Personel PIN&apos;i
        </span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          autoFocus
          className="w-full rounded-lg border border-cizgi bg-cukur py-6 text-center font-data text-4xl tracking-[0.5em] text-yazi focus:border-vurgu focus:outline-none"
          placeholder="••••"
        />
      </label>

      <button
        type="submit"
        disabled={bekliyor || !cihazId}
        className="mt-5 w-full rounded-lg bg-vurgu py-5 font-display text-[18px] font-bold text-white disabled:opacity-45"
      >
        {bekliyor ? "Kontrol ediliyor…" : "Giriş"}
      </button>

      {!cihazId && (
        <p className="mt-4 text-center text-[13px] text-yazi-sonuk">Cihaz tanınıyor…</p>
      )}
    </form>
  );
}
