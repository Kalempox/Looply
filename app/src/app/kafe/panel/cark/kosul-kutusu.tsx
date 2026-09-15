"use client";

import { useActionState, useState, useTransition } from "react";
import { kosulEkleEylemi, kosulDurumEylemi, type KosulDurumu } from "./kosul-actions";
import {
  IsletmeAlan,
  isletmeGirdi,
  IsletmeDugme,
  IsletmeUyari,
  isletmeMiniDugme,
} from "@/components/isletme";

const BOS: KosulDurumu = {};

type Satir = {
  id: string;
  tur: string;
  metin: string;
  aktif: boolean;
};

/**
 * Çark koşulları — butiğin çark hakkını neye bağladığı (Ü137).
 *
 * ── Neden dört tür ──────────────────────────────────────────
 *
 * Ürün sahibi tek bir kural istemedi: *"ister şu ürünü alana, ister şu
 * kadar harcama yapana, ister her gün, ister ilk gelen — nasıl isterse."*
 *
 * ── Form neden türe göre değişiyor ──────────────────────────
 *
 * Her türün kendi parametresi var ve yalnızca o alan görünüyor. Hepsi
 * birden dursaydı işletmeci "ilk gelen" seçip eşik de yazar, sonra
 * eşiğin neden işlemediğini anlamazdı. Veritabanı kısıtı da bunu
 * reddediyor (`kosul_parametresi`) ama hata mesajı görmek, alanı hiç
 * görmemekten kötü.
 */
export function KosulKutusu({
  kosullar,
  urunler,
}: {
  kosullar: Satir[];
  urunler: { id: string; ad: string }[];
}) {
  const [durum, action, bekliyor] = useActionState(kosulEkleEylemi, BOS);
  const [tur, setTur] = useState("tutar");
  const [degistiren, basla] = useTransition();

  const acik = kosullar.filter((k) => k.aktif);

  return (
    <div className="space-y-6">
      {/* ── Açık koşullar ─────────────────────── */}
      <div>
        <p className="text-[15px] font-semibold">
          Açık koşullar{acik.length > 1 && " — herhangi biri yeterli"}
        </p>
        {kosullar.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-odul/60 bg-odul-zemin px-4 py-4 text-[14px] leading-relaxed">
            Hiç koşul yok — <strong>kasada hiçbir tutar çark hakkı kazandırmaz.</strong>{" "}
            Aşağıdan en az bir tane ekle.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-cizgi border-y border-cizgi">
            {kosullar.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 py-3">
                <span className={k.aktif ? "" : "text-yazi-sonuk line-through"}>
                  {k.metin}
                </span>
                <button
                  type="button"
                  disabled={degistiren}
                  onClick={() => basla(async () => void (await kosulDurumEylemi(k.id, !k.aktif)))}
                  className={isletmeMiniDugme}
                >
                  {k.aktif ? "Kapat" : "Aç"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Yeni koşul ────────────────────────── */}
      <form action={action} className="space-y-4 border-t border-cizgi pt-6">
        <p className="text-[15px] font-semibold">Yeni koşul</p>

        {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
        {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

        <IsletmeAlan etiket="Çark hakkını ne versin">
          <select
            name="tur"
            value={tur}
            onChange={(e) => setTur(e.target.value)}
            className={isletmeGirdi}
          >
            <option value="tutar">Belirli tutarın üzerinde alışveriş</option>
            <option value="urun">Belirli bir ürünü alan</option>
            <option value="gunluk">Her müşteri, günde bir kez</option>
            <option value="ilk_gelen">Günün ilk müşterileri</option>
          </select>
        </IsletmeAlan>

        {tur === "tutar" && (
          <IsletmeAlan
            etiket="Alt sınır (TL)"
            ipucu="Bu tutarın üstündeki alışveriş çark hakkı kazandırır. Altında kalan müşteriye kasiyer ne kadar eksik olduğunu söylüyor."
          >
            <input
              name="esik"
              type="text"
              inputMode="decimal"
              placeholder="3000"
              className={isletmeGirdi}
            />
          </IsletmeAlan>
        )}

        {tur === "urun" && (
          <IsletmeAlan etiket="Ürün" ipucu="Bu ürünü alan müşteri çark hakkı kazanır.">
            {urunler.length === 0 ? (
              <p className="text-[13px] text-yazi-sonuk">
                Önce ürün eklemelisin — Ürünler ekranından.
              </p>
            ) : (
              <select name="urunId" className={isletmeGirdi}>
                {urunler.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.ad}
                  </option>
                ))}
              </select>
            )}
          </IsletmeAlan>
        )}

        {tur === "ilk_gelen" && (
          <IsletmeAlan
            etiket="Kaç kişi"
            ipucu="Günün ilk bu kadar müşterisi hak kazanır. Gün İstanbul gece yarısında başlıyor."
          >
            <input
              name="adet"
              type="number"
              min={1}
              max={100}
              placeholder="5"
              className={isletmeGirdi}
            />
          </IsletmeAlan>
        )}

        {tur === "gunluk" && (
          <p className="rounded-lg border border-cizgi bg-cukur px-4 py-3 text-[13px] leading-relaxed text-yazi-sonuk">
            ⚠️ Bu koşul <strong className="text-yazi">herkese</strong> hak veriyor — tutar
            bakılmıyor. Çark yine günde bir kez dönüyor ama alışveriş şartı kalkıyor.
          </p>
        )}

        <IsletmeDugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Ekleniyor…" : "Koşulu ekle"}
        </IsletmeDugme>
      </form>
    </div>
  );
}
