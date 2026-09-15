"use client";

import { useActionState, useTransition } from "react";
import {
  ekleEylemi,
  durumEylemi,
  kategoriEkleEylemi,
  kategoriDurumEylemi,
  type UrunDurumu,
  type KategoriDurumu,
} from "./actions";
import {
  IsletmeDugme,
  IsletmeAlan,
  isletmeGirdi,
  isletmeMiniDugme,
  IsletmeUyari,
} from "@/components/isletme";
import { TURLER, TUR_ETIKETI, type Kategori } from "@/domain/kategori-tur";

const BOS: UrunDurumu = {};

export function UrunEkleme({ kategoriler }: { kategoriler: Kategori[] }) {
  const [durum, action, bekliyor] = useActionState(ekleEylemi, BOS);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <IsletmeAlan etiket="Ürün adı">
          <input name="ad" className={isletmeGirdi} placeholder="Filtre kahve" maxLength={60} />
        </IsletmeAlan>
        <IsletmeAlan etiket="Fiyat (TL)">
          <input
            name="fiyat"
            type="text"
            inputMode="numeric"
            className={isletmeGirdi}
            placeholder="45"
          />
        </IsletmeAlan>
      </div>

      {/*
        Kategori isteğe bağlı ama **ipucu ne işe yaradığını söylüyor**:
        kafe sahibi "neden kategori isteniyor" diye sorduğunda cevabı
        formun içinde bulmalı. Ü75'ten önce kupon kartındaki çizim
        ödülün adı okunarak tahmin ediliyordu ve ilk yazım hatasında
        yanlış çizim çıkıyordu.
      */}
      <IsletmeAlan
        etiket="Kategori"
        ipucu={
          kategoriler.length === 0
            ? "Önce yandan bir kategori ekle — kuponun görseli kategoriden geliyor."
            : "Oyuncunun kupon kartındaki görsel bu kategoriden geliyor."
        }
      >
        <select name="kategoriId" className={isletmeGirdi} defaultValue="">
          <option value="">Kategorisiz</option>
          {kategoriler
            .filter((k) => k.aktif)
            .map((k) => (
              <option key={k.id} value={k.id}>
                {k.ad} · {TUR_ETIKETI[k.tur]}
              </option>
            ))}
        </select>
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Ekleniyor…" : "Ürün ekle"}
      </IsletmeDugme>
    </form>
  );
}

/* ── Kategori — Ü75 ───────────────────────────────────────── */

const KATEGORI_BOS: KategoriDurumu = {};

/**
 * Kategori ekleme formu.
 *
 * İki alan var ve ayrımı forma da yazılı: **ad** kafenin menüsündeki
 * karşılığı, **tür** ise oyuncunun kupon kartında hangi çizimi
 * göreceği. Kafe "Kahvaltılıklar" diyebilir, biz onun yiyecek
 * olduğunu türden öğreniriz.
 */
export function KategoriEkleme() {
  const [durum, action, bekliyor] = useActionState(kategoriEkleEylemi, KATEGORI_BOS);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <IsletmeAlan etiket="Kategori adı" ipucu="Menünde ne yazıyorsa onu yaz.">
        <input name="ad" className={isletmeGirdi} placeholder="Soğuk içecekler" maxLength={40} />
      </IsletmeAlan>

      <IsletmeAlan
        etiket="Türü"
        ipucu="Oyuncunun kupon kartında görünecek çizimi bu belirliyor."
      >
        <select name="tur" className={isletmeGirdi} defaultValue="sicak">
          {TURLER.map((t) => (
            <option key={t} value={t}>
              {TUR_ETIKETI[t]}
            </option>
          ))}
        </select>
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Ekleniyor…" : "Kategori ekle"}
      </IsletmeDugme>
    </form>
  );
}

export function KategoriDurumDugmesi({
  kategoriId,
  aktif,
}: {
  kategoriId: string;
  aktif: boolean;
}) {
  const [bekliyor, basla] = useTransition();

  return (
    <button
      type="button"
      disabled={bekliyor}
      onClick={() => basla(async () => void (await kategoriDurumEylemi(kategoriId, !aktif)))}
      className={
        aktif
          ? isletmeMiniDugme
          : `${isletmeMiniDugme} border-vurgu/40 text-vurgu hover:border-vurgu hover:text-vurgu`
      }
    >
      {bekliyor ? "…" : aktif ? "Kaldır" : "Geri aç"}
    </button>
  );
}

/**
 * Ürünü kullanımdan kaldırır veya geri açar.
 *
 * "Sil" düğmesi bilerek yok: ürün geçmiş ödüllere ve kampanyalara bağlı.
 * Silinseydi eski kuponun neyi temsil ettiği kaybolurdu.
 */
export function DurumDugmesi({ urunId, aktif }: { urunId: string; aktif: boolean }) {
  const [bekliyor, basla] = useTransition();

  return (
    <button
      type="button"
      disabled={bekliyor}
      onClick={() => basla(async () => void (await durumEylemi(urunId, !aktif)))}
      className={
        aktif
          ? isletmeMiniDugme
          : `${isletmeMiniDugme} border-vurgu/40 text-vurgu hover:border-vurgu hover:text-vurgu`
      }
    >
      {bekliyor ? "…" : aktif ? "Kaldır" : "Geri aç"}
    </button>
  );
}
