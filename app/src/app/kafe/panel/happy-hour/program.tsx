"use client";

import { useActionState } from "react";
import { IsletmeUyari, isletmeGirdi } from "@/components/isletme";
import { programEylemi, type HappyDurumu } from "./actions";

/**
 * Haftalık Happy Hour programı (Ü104).
 *
 * ── Neden yedi ayrı satır ───────────────────────────────────
 *
 * Ürün sahibi: *"ister haftanın her günü belirli saat, ister farklı
 * günlerde farklı saatler."* Tek bir "her gün şu saat" kalıbı sorulanın
 * yarısını karşılardı — kafenin salı ve cumartesi boş saatleri aynı değil.
 *
 * Her gün kendi formu: bir günü değiştirmek diğerlerine dokunmuyor ve
 * kaydetme hatası yalnızca o satırda kalıyor.
 *
 * ── ⚠️ Boş havuz = o gün happy hour yok ─────────────────────
 *
 * Ayrı bir "sil" düğmesi yok. Kafe zaten havuzu boşaltarak "bu gün olmasın"
 * demek istiyor; iki ayrı yol iki ayrı sonuç doğurma riski taşırdı.
 */

/** Postgres EXTRACT(dow) düzeni: 0 = Pazar. Ekranda hafta pazartesi başlıyor. */
const GUNLER = [
  { no: 1, ad: "Pazartesi" },
  { no: 2, ad: "Salı" },
  { no: 3, ad: "Çarşamba" },
  { no: 4, ad: "Perşembe" },
  { no: 5, ad: "Cuma" },
  { no: 6, ad: "Cumartesi" },
  { no: 0, ad: "Pazar" },
];

export type ProgramSatiri = {
  haftaGunu: number;
  baslangicDakika: number;
  sureDakika: number;
  havuzKurus: number;
};

export function HaftalikProgram({
  programlar,
  enKisaSaat,
  enUzunSaat,
}: {
  programlar: ProgramSatiri[];
  enKisaSaat: number;
  enUzunSaat: number;
}) {
  return (
    <div className="grid gap-2">
      {GUNLER.map((g) => (
        <GunSatiri
          key={g.no}
          gun={g}
          mevcut={programlar.find((p) => p.haftaGunu === g.no) ?? null}
          enKisaSaat={enKisaSaat}
          enUzunSaat={enUzunSaat}
        />
      ))}
    </div>
  );
}

function GunSatiri({
  gun,
  mevcut,
  enKisaSaat,
  enUzunSaat,
}: {
  gun: { no: number; ad: string };
  mevcut: ProgramSatiri | null;
  enKisaSaat: number;
  enUzunSaat: number;
}) {
  const [durum, action, bekliyor] = useActionState(programEylemi, {} as HappyDurumu);

  const saatYaz = (dakika: number) =>
    `${String(Math.floor(dakika / 60)).padStart(2, "0")}:${String(dakika % 60).padStart(2, "0")}`;

  return (
    <form
      action={action}
      className={`rounded-xl border px-4 py-3 ${
        mevcut ? "border-odul bg-odul-zemin" : "border-cizgi bg-yuzey"
      }`}
    >
      <input type="hidden" name="haftaGunu" value={gun.no} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[7rem] flex-1">
          <div className="font-display text-[15px] font-bold">{gun.ad}</div>
          <div className="mt-0.5 text-[12px] text-yazi-sonuk">
            {mevcut
              ? `${saatYaz(mevcut.baslangicDakika)} · ${mevcut.sureDakika / 60} saat · ${(
                  mevcut.havuzKurus / 100
                ).toLocaleString("tr-TR")} TL`
              : "program yok"}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="etiket-caps text-yazi-sonuk">Başlangıç</span>
          <input
            name="baslangic"
            type="time"
            defaultValue={mevcut ? saatYaz(mevcut.baslangicDakika) : "14:00"}
            className={`${isletmeGirdi} w-[7.5rem]`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="etiket-caps text-yazi-sonuk">Süre</span>
          <select
            name="sure"
            defaultValue={String(mevcut ? mevcut.sureDakika / 60 : 3)}
            className={`${isletmeGirdi} w-[6rem]`}
          >
            {Array.from({ length: enUzunSaat - enKisaSaat + 1 }, (_, i) => enKisaSaat + i).map(
              (s) => (
                <option key={s} value={s}>
                  {s} saat
                </option>
              ),
            )}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="etiket-caps text-yazi-sonuk">Havuz (TL)</span>
          <input
            name="havuz"
            type="text"
            inputMode="numeric"
            defaultValue={mevcut ? String(Math.round(mevcut.havuzKurus / 100)) : ""}
            placeholder="yok"
            className={`${isletmeGirdi} w-[6.5rem]`}
          />
        </label>

        <button
          type="submit"
          disabled={bekliyor}
          className="etiket-caps rounded-lg bg-vurgu px-4 py-2.5 text-white disabled:opacity-50"
        >
          {bekliyor ? "…" : "Kaydet"}
        </button>
      </div>

      {durum.hata && (
        <div className="mt-2">
          <IsletmeUyari>{durum.hata}</IsletmeUyari>
        </div>
      )}
      {durum.bilgi && (
        <p className="mt-2 text-[12px] leading-relaxed text-vurgu">{durum.bilgi}</p>
      )}
    </form>
  );
}
