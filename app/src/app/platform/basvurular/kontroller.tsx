"use client";

import { useActionState, useState, useTransition } from "react";
import { onaylaEylemi, reddetEylemi, telefonuAcEylemi, type OnayDurumu } from "./actions";
import { IsletmeDugme, IsletmeAlan, isletmeGirdi, IsletmeUyari } from "@/components/isletme";

const BOS: OnayDurumu = {};

/**
 * Telefonu tek tek açar. Liste hiçbir role tam numara göstermiyor;
 * bu düğmeye her basış denetim izine düşüyor (docs/08 §3).
 */
export function TelefonAcma({ cafeId, maskeli }: { cafeId: string; maskeli: string }) {
  const [tam, setTam] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  if (tam) {
    return (
      <span>
        <span className="block text-[14px]">{tam}</span>
        <span className="font-data text-[10px] text-yazi-sonuk">görüntüleme kaydedildi</span>
      </span>
    );
  }

  return (
    <span>
      <span className="block text-[14px]">{maskeli}</span>
      <button
        type="button"
        disabled={bekliyor}
        onClick={() => basla(async () => setTam(await telefonuAcEylemi(cafeId)))}
        className="font-data text-[10px] text-yazi-sonuk underline disabled:opacity-50"
      >
        {bekliyor ? "açılıyor…" : "tam numarayı göster"}
      </button>
    </span>
  );
}

export function KararKontrolleri({ cafeId, ad }: { cafeId: string; ad: string }) {
  const [redAcik, setRedAcik] = useState(false);
  const [onayDurumu, onayAction, onayBekliyor] = useActionState(onaylaEylemi, BOS);
  const [redDurumu, redAction, redBekliyor] = useActionState(reddetEylemi, BOS);

  const mesaj = onayDurumu.hata ?? redDurumu.hata;
  const bilgi = onayDurumu.bilgi ?? redDurumu.bilgi;

  if (bilgi) return <IsletmeUyari tur="bilgi">{bilgi}</IsletmeUyari>;

  return (
    <div className="space-y-4">
      {mesaj && <IsletmeUyari>{mesaj}</IsletmeUyari>}

      <p className="text-[13px] leading-relaxed text-yazi-sonuk">
        Onaylayınca <strong className="text-yazi">{ad}</strong> için yönetici hesabı açılır ve
        yetkili panele girebilir hâle gelir.
      </p>

      {redAcik ? (
        <form action={redAction} className="space-y-3">
          <input type="hidden" name="cafeId" value={cafeId} />
          <IsletmeAlan
            etiket="Ret gerekçesi"
            ipucu="Başvuran ne düzelteceğini bilmeli — genel bir cümle yazma"
          >
            <textarea name="sebep" rows={2} className={isletmeGirdi} required />
          </IsletmeAlan>
          <div className="flex gap-3">
            <IsletmeDugme tehlike type="submit" disabled={redBekliyor}>
              {redBekliyor ? "Reddediliyor…" : "Reddet"}
            </IsletmeDugme>
            <button type="button" onClick={() => setRedAcik(false)} className="text-[14px] underline">
              Vazgeç
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-3">
          <form action={onayAction}>
            <input type="hidden" name="cafeId" value={cafeId} />
            <IsletmeDugme type="submit" disabled={onayBekliyor}>
              {onayBekliyor ? "Onaylanıyor…" : "Onayla"}
            </IsletmeDugme>
          </form>
          <IsletmeDugme ikincil type="button" onClick={() => setRedAcik(true)}>
            Reddet
          </IsletmeDugme>
        </div>
      )}
    </div>
  );
}
