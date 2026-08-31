"use client";

import { useActionState } from "react";
import { butceEylemi, type ButceDurumu } from "./actions";
import { IsletmeDugme, IsletmeAlan, isletmeGirdi, IsletmeUyari } from "@/components/isletme";

const BOS: ButceDurumu = {};

/**
 * Bütçe formu.
 *
 * Girdi **TL** cinsinden alınıyor, kuruşa sunucuda çevriliyor. Kafe sahibinin
 * kuruş düşünmesi gerekmiyor; sistemin tamsayı tutması gerekiyor. İkisi de
 * kendi tarafında doğru.
 */
export function ButceFormu({
  mevcutTl,
  tabanTl,
  gunSayisi,
}: {
  mevcutTl: number | null;
  tabanTl: number;
  gunSayisi: number;
}) {
  const [durum, action, bekliyor] = useActionState(butceEylemi, BOS);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <IsletmeAlan
        etiket="Bu dönemin bütçesi (TL)"
        ipucu={
          gunSayisi === 7
            ? `Alt sınır ${tabanTl.toLocaleString("tr-TR")} TL. Üst sınır yok.`
            : `Bu dönem ${gunSayisi} gün — alt sınır orantılı olarak ${tabanTl.toLocaleString("tr-TR")} TL.`
        }
      >
        <input
          name="tutar"
          type="text"
          inputMode="numeric"
          defaultValue={mevcutTl ?? tabanTl}
          className={isletmeGirdi}
          placeholder={String(tabanTl)}
        />
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Kaydediliyor…" : mevcutTl ? "Bütçeyi güncelle" : "Bütçeyi belirle"}
      </IsletmeDugme>
    </form>
  );
}
