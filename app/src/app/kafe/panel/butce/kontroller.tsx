"use client";

import { useActionState, useState } from "react";
import { tumGunlerEylemi, gunEylemi, saatEylemi, type ButceDurumu } from "./actions";
import { IsletmeDugme, IsletmeAlan, isletmeGirdi, IsletmeUyari } from "@/components/isletme";

const BOS: ButceDurumu = {};

/**
 * Bütün günlerin bütçesi — Ü287.
 *
 * Girdi **TL** cinsinden alınıyor, kuruşa sunucuda çevriliyor. Kafe sahibinin
 * kuruş düşünmesi gerekmiyor; sistemin tamsayı tutması gerekiyor.
 */
export function TumGunlerFormu({ herGunTl }: { herGunTl: number }) {
  const [durum, action, bekliyor] = useActionState(tumGunlerEylemi, BOS);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <IsletmeAlan
        etiket="Bütün günler (TL)"
        ipucu="Özel ayarladığın günler dahil bütün günler bu tutara döner. En az 1.500 TL."
      >
        <input
          name="tutar"
          type="text"
          inputMode="numeric"
          defaultValue={herGunTl}
          className={isletmeGirdi}
        />
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Kaydediliyor…" : "Bütün günlere uygula"}
      </IsletmeDugme>
    </form>
  );
}

export type PlanSatiri = {
  gun: string;
  gunAdi: string;
  tarihMetni: string;
  tutarTl: number;
  kaynak: "ozel" | "haftanin_gunu" | "her_gun";
  bugunMu: boolean;
};

/** Bugün ve önümüzdeki altı gün — her satır ayrı değiştirilebiliyor (Ü287). */
export function HaftalikPlan({ satirlar }: { satirlar: PlanSatiri[] }) {
  return (
    <ul className="divide-y divide-cizgi border-y border-cizgi">
      {satirlar.map((s) => (
        <PlanGunu key={s.gun} satir={s} />
      ))}
    </ul>
  );
}

function PlanGunu({ satir }: { satir: PlanSatiri }) {
  const [acik, setAcik] = useState(false);
  const [durum, action, bekliyor] = useActionState(gunEylemi, BOS);
  const kaynak =
    satir.kaynak === "ozel"
      ? "yalnızca bu gün"
      : satir.kaynak === "haftanin_gunu"
        ? `her ${satir.gunAdi}`
        : "her gün";

  return (
    <li className="py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-[15px] font-semibold">
            {satir.bugunMu ? "Bugün · " : ""}
            {satir.gunAdi}{" "}
            <span className="font-data text-[12px] font-normal text-yazi-sonuk">{satir.tarihMetni}</span>
          </span>
          <span className="block text-[12px] text-yazi-sonuk">{kaynak}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="font-data text-[16px] font-bold tabular">
            {satir.tutarTl.toLocaleString("tr-TR")} TL
          </span>
          {/* Ü288: ürün sahibi "daha belirgin olsun, siyah buton olabilir" dedi. */}
          <button
            type="button"
            onClick={() => setAcik(!acik)}
            className={
              acik
                ? "rounded-lg border border-cizgi px-4 py-2 text-[13px] font-semibold text-yazi"
                : "rounded-lg bg-yazi px-4 py-2 text-[13px] font-semibold text-zemin hover:opacity-90"
            }
          >
            {acik ? "Kapat" : "Değiştir"}
          </button>
        </span>
      </div>

      {acik && (
        <form action={action} className="mt-3 space-y-3">
          {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
          {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}
          <input type="hidden" name="gun" value={satir.gun} />
          <IsletmeAlan etiket="Tutar (TL)">
            <input
              name="tutar"
              type="text"
              inputMode="numeric"
              defaultValue={satir.tutarTl}
              className={isletmeGirdi}
            />
          </IsletmeAlan>
          <fieldset className="flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
            <label className="flex items-center gap-2">
              <input type="radio" name="kapsam" value="tarih" defaultChecked />
              Yalnızca {satir.tarihMetni}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="kapsam" value="hafta" />
              Her {satir.gunAdi}
            </label>
          </fieldset>
          <IsletmeDugme type="submit" disabled={bekliyor}>
            {bekliyor ? "Kaydediliyor…" : "Kaydet"}
          </IsletmeDugme>
        </form>
      )}
    </li>
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
