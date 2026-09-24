"use client";

import { useActionState, useState } from "react";
import { tasiEylemi, type TasimaDurumu } from "./actions";
import { IsletmeDugme, IsletmeAlan, isletmeGirdi, IsletmeUyari } from "@/components/isletme";

const BOS: TasimaDurumu = {};

export type Hedef = {
  cafeId: string;
  cafeAdi: string;
  mevcutKod: string | null;
  masaVar: boolean;
  kullanimda: boolean;
};

/** Seçenek metni — kafe seçilmeden önce ne olacağını söylüyor. */
function hedefMetni(h: Hedef): string {
  if (!h.masaVar) return `${h.cafeAdi} · karekodu yok, bu kodla açılır`;
  if (!h.mevcutKod) return `${h.cafeAdi} · adlı kodu yok, bu kod verilir`;
  if (h.kullanimda) return `${h.cafeAdi} · kendi kodu kullanımda — taşınamaz`;
  return `${h.cafeAdi} · kendi kodu hiç kullanılmamış, yerine geçer`;
}

/**
 * Tek tuşla yönlendirme değiştirme — Ü266/Ü267.
 *
 * ⚠️ Hedef **kafe**, masa değil. Kafe başına tek aktif masa var (göç
 * 0038) ve ürün sahibi de "hangi kafeye" diye düşünüyor.
 *
 * ⚠️ Kendi kodu kullanımda olan kafe seçenekte **kapalı** duruyor ve
 * sebebi yazıyor. Seçip gönderince reddedilmesini beklemek, yöneticiye
 * aynı şeyi bir tur geç söylemek olurdu. Sunucu yine de ayrıca
 * reddediyor — seçeneği kapatmak arayüzün işi, kuralı korumak değil.
 *
 * ⚠️ Kapalıyken yalnızca bir düğme duruyor: bu işlem bir kafenin
 * müşterisini ötekine yönlendiriyor; yanlışlıkla tıklanacak yerde açık
 * form durmamalı.
 */
export function YonlendirmeDegistir({
  kod,
  kaynakCafeId,
  hedefler,
}: {
  kod: string;
  kaynakCafeId: string;
  hedefler: Hedef[];
}) {
  const [acik, setAcik] = useState(false);
  const [durum, eylem, bekliyor] = useActionState(tasiEylemi, BOS);

  if (durum.bilgi) {
    return <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>;
  }

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="font-data text-[11px] text-yazi-sonuk underline hover:text-yazi"
      >
        yönlendirmeyi değiştir
      </button>
    );
  }

  const secenekler = hedefler.filter((h) => h.cafeId !== kaynakCafeId);

  return (
    <form action={eylem} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="kod" value={kod} />

      <IsletmeAlan etiket="Hangi kafeye gitsin">
        <select name="hedefCafeId" required className={isletmeGirdi}>
          <option value="">Seç…</option>
          {secenekler.map((h) => (
            <option key={h.cafeId} value={h.cafeId} disabled={h.kullanimda}>
              {hedefMetni(h)}
            </option>
          ))}
        </select>
      </IsletmeAlan>

      {/* ⚠️ Gerekçe zorunlu: işlem denetim izine yazılıyor. */}
      <IsletmeAlan etiket="Gerekçe">
        <input
          name="gerekce"
          required
          minLength={3}
          placeholder="örn. toptan basılan kod yeni kafeye verildi"
          className={isletmeGirdi}
        />
      </IsletmeAlan>

      {durum.hata && <IsletmeUyari tur="hata">{durum.hata}</IsletmeUyari>}

      <div className="flex gap-2">
        <IsletmeDugme type="submit" disabled={bekliyor}>
          {bekliyor ? "taşınıyor…" : "Taşı"}
        </IsletmeDugme>
        <button
          type="button"
          onClick={() => setAcik(false)}
          className="text-[13px] text-yazi-sonuk underline"
        >
          vazgeç
        </button>
      </div>
    </form>
  );
}
