"use client";

import { useActionState, useTransition } from "react";
import { masaEkle, masaDurumu, type MasaDurumu } from "./actions";
import { TURLER, TUR_ADI } from "@/domain/karekod-turu";
import { IsletmeDugme, IsletmeAlan, isletmeGirdi, IsletmeUyari } from "@/components/isletme";

const BOS: MasaDurumu = {};

/**
 * Yeni karekod (Ü108).
 *
 * Tür seçimi burada, ayrı bir "kasa karekodu ekle" düğmesi yerine: dördü
 * de aynı şeyi üretiyor ve ayrı düğmeler dört ayrı akış öğretirdi.
 */
export function MasaEkleme() {
  const [durum, action, bekliyor] = useActionState(masaEkle, BOS);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <div className="grid gap-4 sm:grid-cols-[140px_1fr_160px] sm:items-end">
        <IsletmeAlan etiket="Nereye">
          <select name="tur" className={isletmeGirdi} defaultValue="masa">
            {TURLER.map((t) => (
              <option key={t} value={t}>
                {TUR_ADI[t].tekil}
              </option>
            ))}
          </select>
        </IsletmeAlan>
        <IsletmeAlan
          etiket="Ad"
          ipucu="Müşterinin göreceği ad — örn. Masa 7, Bahçe 2, Kasa"
        >
          <input name="ad" className={isletmeGirdi} placeholder="Masa 7" maxLength={40} />
        </IsletmeAlan>
        <IsletmeDugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Ekleniyor…" : "Karekod ekle"}
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
