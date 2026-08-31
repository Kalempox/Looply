"use client";

import { useActionState, useTransition } from "react";
import { pencereAc, pencereKapat, type HappyDurumu } from "./actions";
import { IsletmeDugme, IsletmeAlan, isletmeGirdi, IsletmeUyari } from "@/components/isletme";

const BOS: HappyDurumu = {};

/**
 * Süre sınırları **prop olarak** geliyor, `@/domain/happy`den içe
 * aktarılmıyor.
 *
 * İlk hâli sabitleri doğrudan içe aktarıyordu ve o modül `@/db/context`e,
 * o da `pg` sürücüsüne bağlı — Next tüm zinciri istemci paketine sokmaya
 * çalışıp `Can't resolve 'dns'` ile patladı. Tip kontrolü ve lint bunu
 * göremez; yalnızca tarayıcıda görünür.
 *
 * Kural: istemci bileşeni alan katmanından **yalnızca tip** alabilir
 * (`import type` derlemede silinir), değer alamaz.
 */
export function PencereFormu({
  enKisaSaat,
  enUzunSaat,
}: {
  enKisaSaat: number;
  enUzunSaat: number;
}) {
  const [durum, action, bekliyor] = useActionState(pencereAc, BOS);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <div className="grid gap-4 sm:grid-cols-3">
        <IsletmeAlan etiket="Başlangıç" ipucu="Kafenin boş saati">
          <input name="baslangic" type="time" defaultValue="14:00" className={isletmeGirdi} />
        </IsletmeAlan>

        <IsletmeAlan etiket="Süre (saat)" ipucu={`${enKisaSaat}–${enUzunSaat} saat`}>
          <select name="sure" defaultValue="3" className={isletmeGirdi}>
            {Array.from({ length: enUzunSaat - enKisaSaat + 1 }, (_, i) => enKisaSaat + i).map(
              (s) => (
                <option key={s} value={s}>
                  {s} saat
                </option>
              ),
            )}
          </select>
        </IsletmeAlan>

        <IsletmeAlan etiket="Havuz (TL)" ipucu="Bu pencerede dağıtılacak en fazla tutar">
          <input
            name="havuz"
            type="text"
            inputMode="numeric"
            placeholder="400"
            className={isletmeGirdi}
          />
        </IsletmeAlan>
      </div>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Açılıyor…" : "Pencereyi aç"}
      </IsletmeDugme>
    </form>
  );
}

/**
 * Pencereyi erken kapatır.
 *
 * "Sil" değil "kapat": pencerede dağıtılmış kuponlar ona etiketli ve geçmiş
 * bozulmamalı. Kalan havuz zaten genel bütçede duruyor — kapatmak hiçbir
 * parayı geri getirmiyor, çünkü hiçbir para ayrılmamıştı.
 */
export function KapatDugmesi({ pencereId }: { pencereId: string }) {
  const [bekliyor, basla] = useTransition();

  return (
    <button
      type="button"
      disabled={bekliyor}
      onClick={() => basla(async () => void (await pencereKapat(pencereId)))}
      className="etiket-caps text-yazi-sonuk underline disabled:opacity-50"
    >
      {bekliyor ? "…" : "kapat"}
    </button>
  );
}
