"use client";

import { useActionState } from "react";
import { aralikEylemi, type AralikDurumu } from "./aralik-actions";
import {
  IsletmeAlan,
  isletmeGirdi,
  IsletmeDugme,
  IsletmeUyari,
} from "@/components/isletme";

const BOS: AralikDurumu = {};

/**
 * Çark aralığı ayarı — Ü158.
 *
 * ── Neden bir kart değil, bir form ──────────────────────────
 *
 * Burada önce `SayiKarti` vardı ve *"24 saatte 1 · müşteri başına"*
 * yazıyordu. Okunabilir ama değiştirilemez bir sayı, kafe sahibini
 * *"demek ki değiştirebiliyorum"* diye düşündürüyordu. Ürün sahibi fark
 * etti: *"süreyi kafe sahibi panelden belirlemeli."*
 *
 * ── ⚠️ Sürenin KAYAN olduğu yazıyor ─────────────────────────
 *
 * "Günde bir" demiyoruz çünkü öyle değil: son çevirmenin üstünden bu
 * kadar saat geçmesi gerekiyor. Gece 23:50'de çeviren biri "günde bir"
 * kuralında on dakika sonra tekrar çevirebilirdi. Ekranda bunu
 * söylemezsek kafe sahibi müşterinin şikâyetini anlayamaz.
 */
export function AralikKutusu({ saat }: { saat: number }) {
  const [durum, eylem, bekliyor] = useActionState(aralikEylemi, BOS);

  return (
    <form action={eylem} className="rounded-2xl border border-cizgi bg-yuzey p-5">
      <p className="text-[15px] font-bold">Çevirme sıklığı</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-yazi-sonuk">
        Aynı müşteri çarkı kaç saatte bir çevirebilsin? Süre{" "}
        <strong className="text-yazi">son çevirmeden itibaren</strong> sayılıyor —
        takvim günü değil.
      </p>

      <div className="mt-4 flex items-end gap-3">
        <IsletmeAlan etiket="Saat" ipucu="1 – 168 arası">
          <input
            name="saat"
            type="number"
            min={1}
            max={168}
            step={1}
            defaultValue={saat}
            className={isletmeGirdi}
            required
          />
        </IsletmeAlan>
        <IsletmeDugme type="submit" disabled={bekliyor}>
            {bekliyor ? "Kaydediliyor…" : "Kaydet"}
          </IsletmeDugme>
      </div>

      {durum.hata && (
        <div className="mt-3">
          <IsletmeUyari tur="hata">{durum.hata}</IsletmeUyari>
        </div>
      )}
      {durum.bilgi && (
        <div className="mt-3">
          <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>
        </div>
      )}
    </form>
  );
}
