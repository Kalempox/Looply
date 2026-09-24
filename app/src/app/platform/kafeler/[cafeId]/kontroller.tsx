"use client";

import { useActionState } from "react";
import { ayarEylemi, isletmeTuruEylemi, type AyarDurumu, type TurDurumu } from "./actions";
import { IsletmeAlan, isletmeGirdi, IsletmeDugme, IsletmeUyari } from "@/components/isletme";

const BOS: AyarDurumu = {};

/**
 * Aktivasyon saati — platform tarafı (Ü129 / Ü130).
 *
 * Kafenin kendi panelinde eşikle **aynı formda** duruyor; burada tek
 * başına, çünkü platform eşiğe karışmıyor. Eşik kafenin ödül ekonomisi
 * hakkındaki kararı; saat ise destek sırasında sorulan bir soru
 * ("müşteri kuponu hemen kullanamıyor, süreyi kısaltalım mı").
 */
export function AktivasyonAyari({ cafeId, mevcut }: { cafeId: string; mevcut: number }) {
  const [durum, action, bekliyor] = useActionState(ayarEylemi, BOS);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <input type="hidden" name="cafeId" value={cafeId} />

      <IsletmeAlan
        etiket="Aktivasyon saati"
        ipucu="Her ödül kaç saat sonra açılsın. Çark ve oyun ödülü için aynı. 1–48 — ödül hiçbir zaman hemen açılmaz."
      >
        <input
          name="saat"
          type="number"
          min={1}
          max={48}
          defaultValue={String(mevcut)}
          className={isletmeGirdi}
        />
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Kaydediliyor…" : "Kaydet"}
      </IsletmeDugme>
    </form>
  );
}

/**
 * İşletme türü — Ü137.
 *
 * Kafe oyun oynatıyor, butik kasadan çark hakkı veriyor. Tür ürünün
 * hangi akışı çalıştıracağını belirliyor, o yüzden işletmenin kendi
 * elinde değil.
 */
export function IsletmeTuruAyari({ cafeId, mevcut }: { cafeId: string; mevcut: string }) {
  const [durum, action, bekliyor] = useActionState(isletmeTuruEylemi, {} as TurDurumu);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <input type="hidden" name="cafeId" value={cafeId} />

      <IsletmeAlan
        etiket="İşletme türü"
        ipucu="Kafe: müşteri oyun oynar, çark oyun sonunda döner. Butik: oyun yok, çark hakkını kasiyer alışverişe bakarak verir."
      >
        <select name="tur" defaultValue={mevcut} className={isletmeGirdi}>
          <option value="kafe">Kafe — oyunla</option>
          <option value="butik">Butik — alışverişle</option>
        </select>
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Kaydediliyor…" : "Türü kaydet"}
      </IsletmeDugme>
    </form>
  );
}
