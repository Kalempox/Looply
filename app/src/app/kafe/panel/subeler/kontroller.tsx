"use client";

import { useActionState } from "react";
import { subeBasvuruEylemi, type SubeFormDurumu } from "./actions";
import { IsletmeAlan, isletmeGirdi, IsletmeDugme, IsletmeUyari } from "@/components/isletme";

const BOS: SubeFormDurumu = {};

/**
 * Şube başvuru formu (Ü125).
 *
 * ── Neden yalnızca üç alan ──────────────────────────────────
 *
 * İlk başvuruda yedi alan ve bir belge isteniyordu. Şubede ticari unvan,
 * vergi numarası ve yetkili bilgileri ana şubeden kopyalanıyor — aynı
 * tüzel kişi. Sahibine kendi vergi numarasını yeniden yazdırmak hem
 * gereksiz hem de yanlış yazma riski.
 */
export function SubeBasvuruFormu() {
  const [durum, action, bekliyor] = useActionState(subeBasvuruEylemi, BOS);

  if (durum.basarili) {
    return (
      <IsletmeUyari tur="bilgi">
        <strong>Şube başvurun alındı.</strong> İnceleyip yetkili numarana bilgi vereceğiz.
        Onaylanınca üst şeritteki şube seçicide görünecek.
      </IsletmeUyari>
    );
  }

  const d = durum.degerler ?? {};

  return (
    <form action={action} className="space-y-5">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}

      <IsletmeAlan etiket="Şube adı" ipucu="Müşterinin gördüğü ad — örneğin “Kadıköy”">
        <input name="ad" defaultValue={d.ad} className={isletmeGirdi} required />
      </IsletmeAlan>

      <IsletmeAlan etiket="Şehir">
        <input name="sehir" defaultValue={d.sehir} className={isletmeGirdi} required />
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Gönderiliyor…" : "Şube başvurusu gönder"}
      </IsletmeDugme>

      <p className="text-[13px] leading-relaxed text-yazi-sonuk">
        Ticari unvan, vergi numarası ve yetkili bilgileri bu şubeden devralınıyor. Menün ve
        ödül listen de kopyalanıyor — <strong className="text-yazi">bütçe ve konum</strong>{" "}
        kopyalanmıyor, onay sonrası yeni şubede ayrıca kuruyorsun.
      </p>
    </form>
  );
}
