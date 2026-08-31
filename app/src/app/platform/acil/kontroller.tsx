"use client";

import { useActionState, useState } from "react";
import { anahtarEylemi, kafeEylemi, oturumEylemi, type AcilDurumu } from "./actions";
import { IsletmeDugme, IsletmeUyari, isletmeGirdi } from "@/components/isletme";

const BOS: AcilDurumu = {};

/**
 * Acil durdurma kontrolleri.
 *
 * Üç tasarım kuralı:
 *   1. Durdurmak **tek adım** — panik anında ikinci ekran istemiyoruz
 *   2. Geri açmak ve ağır işlemler **gerekçe ister** — kayıt okunabilir olmalı
 *   3. Açık olan durdurma her zaman **görünür** — unutulmuş durdurma en
 *      pahalı hata: kimse fark etmeden sistem yarı kapalı çalışır
 */

export function AnahtarDugmesi({
  anahtar,
  baslik,
  aciklama,
  durduruldu,
}: {
  anahtar: string;
  baslik: string;
  aciklama: string;
  durduruldu: boolean;
}) {
  const [durum, action, bekliyor] = useActionState(anahtarEylemi, BOS);

  return (
    <div
      className={`border px-4 py-4 ${
        durduruldu ? "border-tehlike/60 bg-tehlike/5" : "border-cizgi bg-yuzey"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-display text-[16px] font-bold text-yazi">{baslik}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-yazi-sonuk">{aciklama}</p>
          {durduruldu && (
            <div className="mt-2 etiket-caps text-tehlike">
              ● şu an durdurulmuş
            </div>
          )}
        </div>

        <form action={action} className="shrink-0">
          <input type="hidden" name="anahtar" value={anahtar} />
          <input type="hidden" name="deger" value={durduruldu ? "false" : "true"} />
          <IsletmeDugme type="submit" disabled={bekliyor} tehlike={!durduruldu} ikincil={durduruldu}>
            {bekliyor ? "…" : durduruldu ? "Yeniden aç" : "Durdur"}
          </IsletmeDugme>
        </form>
      </div>

      {durum.hata && (
        <div className="mt-3">
          <IsletmeUyari>{durum.hata}</IsletmeUyari>
        </div>
      )}
    </div>
  );
}

export function KafeKontrolu({
  kafeler,
}: {
  kafeler: { id: string; ad: string; askida: boolean }[];
}) {
  const [durum, action, bekliyor] = useActionState(kafeEylemi, BOS);
  const [secili, setSecili] = useState(kafeler[0]?.id ?? "");

  const kafe = kafeler.find((k) => k.id === secili);

  if (kafeler.length === 0) {
    return <p className="text-[13px] text-yazi-sonuk">Onaylı kafe yok.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <select
        name="cafeId"
        value={secili}
        onChange={(e) => setSecili(e.target.value)}
        className={isletmeGirdi}
      >
        {kafeler.map((k) => (
          <option key={k.id} value={k.id}>
            {k.ad}
            {k.askida ? " — askıda" : ""}
          </option>
        ))}
      </select>

      <input type="hidden" name="askiya" value={kafe?.askida ? "false" : "true"} />

      <input
        name="sebep"
        className={isletmeGirdi}
        placeholder={kafe?.askida ? "Neden yeniden açılıyor?" : "Neden askıya alınıyor?"}
        maxLength={200}
      />

      <IsletmeDugme type="submit" disabled={bekliyor} tehlike={!kafe?.askida}>
        {bekliyor ? "…" : kafe?.askida ? "Kafeyi yeniden aç" : "Kafeyi askıya al"}
      </IsletmeDugme>
    </form>
  );
}

export function OturumKontrolu({ acikOturum }: { acikOturum: number }) {
  const [durum, action, bekliyor] = useActionState(oturumEylemi, BOS);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <p className="text-[13px] leading-relaxed text-yazi-sonuk">
        Şu an <strong className="text-yazi">{acikOturum}</strong> açık oturum var. Hepsi
        kapanır: oyuncular, kasiyerler, kafe yöneticileri ve platform ekibi. Kimse veri
        kaybetmez, herkes yeniden giriş yapar.
      </p>

      <input name="sebep" className={isletmeGirdi} placeholder="Gerekçe" maxLength={200} />

      <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-yazi">
        <input type="checkbox" name="onay" value="evet" className="mt-1" />
        <span>
          Kendi oturumumun da kapanacağını biliyorum. İşlemden sonra yeniden giriş yapacağım.
        </span>
      </label>

      <IsletmeDugme type="submit" disabled={bekliyor} tehlike>
        {bekliyor ? "…" : "Tüm oturumları iptal et"}
      </IsletmeDugme>
    </form>
  );
}
