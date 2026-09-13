"use client";

import { useActionState, useState } from "react";
import {
  personelEkleEylemi,
  pinDegistirEylemi,
  pasiflestirEylemi,
  cihazKaydetEylemi,
  type PersonelDurumu,
} from "./actions";
import { IsletmeAlan, isletmeGirdi, IsletmeDugme, IsletmeUyari, Rozet } from "@/components/isletme";
import { useCihazId } from "@/lib/cihaz";

type Personel = {
  id: string;
  ad: string;
  aktif: boolean;
  pinDegisti: Date;
  pinEskiMi: boolean;
};

const BOS: PersonelDurumu = {};

export function PersonelEkleFormu() {
  const [durum, action, bekliyor] = useActionState(personelEkleEylemi, BOS);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <div className="grid gap-4 sm:grid-cols-2">
        <IsletmeAlan etiket="Adı">
          <input name="ad" className={isletmeGirdi} required />
        </IsletmeAlan>
        <IsletmeAlan etiket="PIN" ipucu="4 rakam · 1234 gibi kolay dizileri kabul etmiyoruz">
          <input
            name="pin"
            inputMode="numeric"
            maxLength={4}
            className={`${isletmeGirdi} font-data tracking-[0.3em] tabular`}
            required
          />
        </IsletmeAlan>
      </div>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Ekleniyor…" : "Kasiyer ekle"}
      </IsletmeDugme>
    </form>
  );
}

export function PersonelSatiri({ personel }: { personel: Personel }) {
  const [acik, setAcik] = useState(false);

  return (
    <li className="py-3.5">
      <div className="flex items-center justify-between gap-4">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{personel.ad}</span>
          <span className="block font-data text-[11px] text-yazi-sonuk">
            PIN {new Date(personel.pinDegisti).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
            &apos;da değişti
          </span>
        </span>
        {personel.pinEskiMi && <Rozet tur="bekliyor">PIN eski</Rozet>}
        <button
          type="button"
          onClick={() => setAcik(!acik)}
          className="shrink-0 text-[13px] text-yazi-sonuk underline"
        >
          {acik ? "Kapat" : "Yönet"}
        </button>
      </div>

      {acik && (
        <div className="mt-4 grid gap-4 border-t border-cizgi pt-4 sm:grid-cols-2">
          <PinDegistir staffId={personel.id} />
          <Pasiflestir staffId={personel.id} ad={personel.ad} />
        </div>
      )}
    </li>
  );
}

function PinDegistir({ staffId }: { staffId: string }) {
  const [durum, action, bekliyor] = useActionState(pinDegistirEylemi, BOS);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="staffId" value={staffId} />
      <IsletmeAlan etiket="Yeni PIN">
        <input
          name="pin"
          inputMode="numeric"
          maxLength={4}
          className={`${isletmeGirdi} font-data tracking-[0.3em] tabular`}
          required
        />
      </IsletmeAlan>
      {durum.hata && <p className="text-[13px] text-tehlike">{durum.hata}</p>}
      {durum.bilgi && <p className="text-[13px] text-yazi-sonuk">{durum.bilgi}</p>}
      <IsletmeDugme ikincil type="submit" disabled={bekliyor}>
        {bekliyor ? "Değiştiriliyor…" : "PIN'i değiştir"}
      </IsletmeDugme>
    </form>
  );
}

function Pasiflestir({ staffId, ad }: { staffId: string; ad: string }) {
  const [durum, action, bekliyor] = useActionState(pasiflestirEylemi, BOS);
  const [onay, setOnay] = useState(false);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="staffId" value={staffId} />
      <p className="text-[13px] leading-relaxed text-yazi-sonuk">
        Hesabı kapatınca {ad} kupon onaylayamaz ve açık oturumu <strong>anında</strong> düşer.
      </p>
      {durum.hata && <p className="text-[13px] text-tehlike">{durum.hata}</p>}
      {onay ? (
        <div className="flex gap-3">
          <IsletmeDugme tehlike type="submit" disabled={bekliyor}>
            {bekliyor ? "Kapatılıyor…" : "Evet, kapat"}
          </IsletmeDugme>
          <button type="button" onClick={() => setOnay(false)} className="text-[14px] underline">
            Vazgeç
          </button>
        </div>
      ) : (
        <IsletmeDugme ikincil type="button" onClick={() => setOnay(true)}>
          Hesabı kapat
        </IsletmeDugme>
      )}
    </form>
  );
}

/**
 * Cihaz kimliği tarayıcıda üretilip saklanıyor.
 *
 * Sunucu bunun hash'ini tutuyor (G11) — kayıtlı olmayan bir cihazdan
 * PIN denemesi hiç işleme alınmıyor.
 */
export function CihazKaydiFormu() {
  const [durum, action, bekliyor] = useActionState(cihazKaydetEylemi, BOS);
  const cihazId = useCihazId();

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="cihazId" value={cihazId} />
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      {/*
        ⚠️ Alan adı `etiket` — `etiket-caps` DEĞİL (Ü114).
        `etiket-caps` bir CSS sınıfı; bir bul-değiştir turunda HTML
        `name` özniteliğine de bulaşmış ve eylem `form.get("etiket")`
        okuduğu için cihaz kaydı **hiç çalışmıyordu**. Kasiyer PIN'i
        yalnızca kayıtlı cihazda geçtiğinden (G11), bu hiçbir kasiyerin
        giriş yapamaması demekti.
      */}
      <IsletmeAlan etiket="Cihaz adı" ipucu="Örn. Kasa tableti, Bar telefonu">
        <input name="etiket" className={isletmeGirdi} required />
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor || !cihazId}>
        {bekliyor ? "Kaydediliyor…" : "Bu cihazı kaydet"}
      </IsletmeDugme>
    </form>
  );
}
