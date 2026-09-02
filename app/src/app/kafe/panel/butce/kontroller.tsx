"use client";

import { useActionState } from "react";
import { butceEylemi, saatEylemi, type ButceDurumu } from "./actions";
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

/**
 * Çalışma saatleri formu (Ü90).
 *
 * Bütçenin gün içinde nasıl açılacağını bu iki sayı belirliyor, o yüzden
 * bütçe sayfasında duruyor — ayrı bir ekrana konsaydı kafe "bütçem duruyor
 * ama kupon çıkmıyor" dediğinde yanlış yere bakardı.
 */
export function SaatFormu({ acilis, kapanis }: { acilis: number; kapanis: number }) {
  const [durum, action, bekliyor] = useActionState(saatEylemi, BOS);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <div className="grid grid-cols-2 gap-3">
        <IsletmeAlan etiket="Açılış" ipucu="Kaçta açıyorsun?">
          <select name="acilis" defaultValue={acilis} className={isletmeGirdi}>
            {SAATLER.slice(0, 23).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </IsletmeAlan>

        <IsletmeAlan etiket="Kapanış" ipucu="Kaçta kapatıyorsun?">
          <select name="kapanis" defaultValue={kapanis} className={isletmeGirdi}>
            {SAATLER.slice(1).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </IsletmeAlan>
      </div>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Kaydediliyor…" : "Saatleri kaydet"}
      </IsletmeDugme>
    </form>
  );
}

const SAATLER = Array.from({ length: 24 }, (_, i) => i);
