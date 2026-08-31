"use client";

import { useActionState, useTransition } from "react";
import { masaEkle, masaDurumu, type MasaDurumu } from "./actions";
import { IsletmeDugme, IsletmeAlan, isletmeGirdi, IsletmeUyari } from "@/components/isletme";

const BOS: MasaDurumu = {};

export function MasaEkleme() {
  const [durum, action, bekliyor] = useActionState(masaEkle, BOS);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <div className="grid gap-4 sm:grid-cols-[1fr_160px] sm:items-end">
        <IsletmeAlan etiket="Masa adı" ipucu="Müşterinin masada göreceği ad — örn. Masa 7, Bahçe 2">
          <input name="ad" className={isletmeGirdi} placeholder="Masa 7" maxLength={40} />
        </IsletmeAlan>
        <IsletmeDugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Ekleniyor…" : "Masa ekle"}
        </IsletmeDugme>
      </div>
    </form>
  );
}

/**
 * Masayı kapatır veya geri açar.
 *
 * "Sil" düğmesi bilerek yok: silinen masanın geçmiş oyun oturumları ve
 * raporları sahipsiz kalırdı. Kapatmak, yapıştırılmış karekodu çalışmaz
 * hâle getirmeye zaten yetiyor.
 */
export function DurumDugmesi({ tableId, aktif }: { tableId: string; aktif: boolean }) {
  const [bekliyor, basla] = useTransition();

  return (
    <button
      type="button"
      disabled={bekliyor}
      onClick={() => basla(async () => void (await masaDurumu(tableId, !aktif)))}
      className="etiket-caps text-yazi-sonuk underline disabled:opacity-50"
    >
      {bekliyor ? "…" : aktif ? "kapat" : "geri aç"}
    </button>
  );
}

/** Yazdırma sayfasını yeni sekmede açar. */
export function YazdirDugmesi() {
  return (
    <a
      href="/kafe/panel/masalar/yazdir"
      target="_blank"
      rel="noreferrer"
      className="inline-block rounded-lg border border-cizgi bg-yuzey px-5 py-3 font-display text-[15px] font-bold text-yazi hover:border-yazi-sonuk"
    >
      Yazdırma sayfasını aç
    </a>
  );
}
