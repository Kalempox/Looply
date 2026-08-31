"use client";

import { useActionState, useTransition } from "react";
import { ekleEylemi, durumEylemi, type UrunDurumu } from "./actions";
import { IsletmeDugme, IsletmeAlan, isletmeGirdi, IsletmeUyari } from "@/components/isletme";

const BOS: UrunDurumu = {};

export function UrunEkleme() {
  const [durum, action, bekliyor] = useActionState(ekleEylemi, BOS);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <IsletmeAlan etiket="Ürün adı">
          <input name="ad" className={isletmeGirdi} placeholder="Filtre kahve" maxLength={60} />
        </IsletmeAlan>
        <IsletmeAlan etiket="Fiyat (TL)">
          <input
            name="fiyat"
            type="text"
            inputMode="numeric"
            className={isletmeGirdi}
            placeholder="45"
          />
        </IsletmeAlan>
      </div>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Ekleniyor…" : "Ürün ekle"}
      </IsletmeDugme>
    </form>
  );
}

/**
 * Ürünü kullanımdan kaldırır veya geri açar.
 *
 * "Sil" düğmesi bilerek yok: ürün geçmiş ödüllere ve kampanyalara bağlı.
 * Silinseydi eski kuponun neyi temsil ettiği kaybolurdu.
 */
export function DurumDugmesi({ urunId, aktif }: { urunId: string; aktif: boolean }) {
  const [bekliyor, basla] = useTransition();

  return (
    <button
      type="button"
      disabled={bekliyor}
      onClick={() => basla(async () => void (await durumEylemi(urunId, !aktif)))}
      className="etiket-caps text-yazi-sonuk underline disabled:opacity-50"
    >
      {bekliyor ? "…" : aktif ? "kaldır" : "geri aç"}
    </button>
  );
}
