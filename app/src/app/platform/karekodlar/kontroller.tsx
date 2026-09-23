"use client";

import { useActionState, useState } from "react";
import { tasiEylemi, type TasimaDurumu } from "./actions";
import { IsletmeDugme, IsletmeAlan, isletmeGirdi, IsletmeUyari } from "@/components/isletme";

const BOS: TasimaDurumu = {};

export type HedefMasa = {
  cafeId: string;
  cafeAdi: string;
  tableId: string;
  masaAdi: string;
};

/**
 * Tek tuşla yönlendirme değiştirme — Ü266.
 *
 * ⚠️ Form satırın **içinde** açılıyor, ayrı bir sayfada değil: ürün
 * sahibinin istediği şey *"hangi kafenin karekodunun yönlendirmesini
 * değiştireceğimize tek tuşla bakabilelim"*. Kodu görmek için bir
 * sayfa, değiştirmek için başka bir sayfa açmak o isteği bozardı.
 *
 * ⚠️ Kapalıyken yalnızca bir düğme duruyor. Bu işlem bir kafenin
 * müşterisini ötekine yönlendiriyor; yanlışlıkla tıklanacak bir yerde
 * açık form durmamalı.
 */
export function YonlendirmeDegistir({
  kod,
  hedefler,
}: {
  kod: string;
  hedefler: HedefMasa[];
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

  if (hedefler.length === 0) {
    return (
      <IsletmeUyari tur="hata">
        Kodu devralabilecek boş masa yok. Hedef kafede **kodu olmayan** bir
        masa açılmalı.
      </IsletmeUyari>
    );
  }

  return (
    <form action={eylem} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="kod" value={kod} />

      <IsletmeAlan etiket="Hangi masaya gitsin">
        <select name="hedefTableId" required className={isletmeGirdi}>
          <option value="">Seç…</option>
          {hedefler.map((h) => (
            <option key={h.tableId} value={h.tableId}>
              {h.cafeAdi} · {h.masaAdi}
            </option>
          ))}
        </select>
      </IsletmeAlan>

      {/* ⚠️ Gerekçe zorunlu: bu işlem denetim izine yazılıyor ve
          "neden" sorusunun cevabı orada olmalı. */}
      <IsletmeAlan etiket="Gerekçe">
        <input
          name="gerekce"
          required
          minLength={3}
          placeholder="örn. kafe taşındı, kodlar devredildi"
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
