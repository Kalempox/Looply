"use client";

import { useActionState, useState, useTransition } from "react";
import { olusturEylemi, durumEylemi, type KampanyaDurumu } from "./actions";
import type { KampanyaDurumu as Durum } from "@/domain/kampanya";
import { IsletmeDugme, IsletmeAlan, isletmeGirdi, IsletmeUyari } from "@/components/isletme";

const BOS: KampanyaDurumu = {};

/**
 * Kampanya oluşturma.
 *
 * Üç sınır da **zorunlu alan** (Ü17 + Ö4): TL tavanı, günlük adet, süre.
 * Hiçbiri "isteğe bağlı" olarak sunulmuyor, çünkü üçü birden olmadan yüzde
 * indirimi açık uçlu bir borçtur. Toplam limit tek isteğe bağlı olan.
 *
 * Form, seçilen ürünün fiyatından **makul tavanı hesaplayıp gösteriyor** —
 * kafe sahibi "%20 indirim en fazla kaç TL eder" sorusunu kafadan çözmesin.
 */
export function KampanyaOlusturma({
  urunler,
}: {
  urunler: { id: string; ad: string; fiyatKurus: number }[];
}) {
  const [durum, action, bekliyor] = useActionState(olusturEylemi, BOS);
  const [urunId, setUrunId] = useState(urunler[0]?.id ?? "");
  const [yuzde, setYuzde] = useState(20);

  const urun = urunler.find((u) => u.id === urunId);
  const makulTavanTl = urun ? Math.ceil((urun.fiyatKurus * yuzde) / 100 / 100) : null;

  if (urunler.length === 0) {
    return (
      <IsletmeUyari tur="bekle">
        Kampanya açmak için önce aktif bir ürün gerekiyor. Ürün bazlı kampanya, hangi ürünü ittiğini
        bilmeden tanımlanamaz.
      </IsletmeUyari>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <IsletmeAlan etiket="Ürün">
        <select
          name="urunId"
          value={urunId}
          onChange={(e) => setUrunId(e.target.value)}
          className={isletmeGirdi}
        >
          {urunler.map((u) => (
            <option key={u.id} value={u.id}>
              {u.ad} — {(u.fiyatKurus / 100).toLocaleString("tr-TR")} TL
            </option>
          ))}
        </select>
      </IsletmeAlan>

      <div className="grid gap-4 sm:grid-cols-2">
        <IsletmeAlan etiket="İndirim oranı (%)">
          <input
            name="yuzde"
            type="text"
            inputMode="numeric"
            value={yuzde || ""}
            onChange={(e) => setYuzde(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
            className={isletmeGirdi}
          />
        </IsletmeAlan>

        <IsletmeAlan
          etiket="En fazla indirim (TL)"
          ipucu={
            makulTavanTl != null
              ? `Bu üründe %${yuzde} indirim ${makulTavanTl.toLocaleString("tr-TR")} TL eder.`
              : undefined
          }
        >
          <input
            name="tavan"
            type="text"
            inputMode="numeric"
            defaultValue={makulTavanTl ?? ""}
            key={makulTavanTl ?? "bos"}
            className={isletmeGirdi}
          />
        </IsletmeAlan>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <IsletmeAlan etiket="Günlük adet">
          <input
            name="gunlukLimit"
            type="text"
            inputMode="numeric"
            className={isletmeGirdi}
            placeholder="20"
          />
        </IsletmeAlan>
        <IsletmeAlan etiket="Süre (gün)">
          <input
            name="gunSayisi"
            type="text"
            inputMode="numeric"
            className={isletmeGirdi}
            placeholder="7"
          />
        </IsletmeAlan>
        <IsletmeAlan etiket="Toplam adet" ipucu="İsteğe bağlı">
          <input name="toplamLimit" type="text" inputMode="numeric" className={isletmeGirdi} />
        </IsletmeAlan>
      </div>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Kaydediliyor…" : "Taslak olarak kaydet"}
      </IsletmeDugme>
    </form>
  );
}

export function DurumDugmeleri({ kampanyaId, durum }: { kampanyaId: string; durum: Durum }) {
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  const cevir = (yeni: Durum) =>
    basla(async () => {
      const c = await durumEylemi(kampanyaId, yeni);
      setHata(c.hata ?? null);
    });

  if (durum === "ended") {
 return <span className="etiket-caps text-yazi-sonuk">bitti</span>;
  }

  return (
    <span className="flex flex-col items-end gap-1.5">
      {hata && <span className="text-[12px] text-tehlike">{hata}</span>}
      <span className="flex gap-3">
        {durum === "active" ? (
          <Kucuk onBas={() => cevir("paused")} bekliyor={bekliyor}>
            duraklat
          </Kucuk>
        ) : (
          <Kucuk onBas={() => cevir("active")} bekliyor={bekliyor}>
            yayına al
          </Kucuk>
        )}
        <Kucuk onBas={() => cevir("ended")} bekliyor={bekliyor}>
          bitir
        </Kucuk>
      </span>
    </span>
  );
}

function Kucuk({
  onBas,
  bekliyor,
  children,
}: {
  onBas: () => void;
  bekliyor: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onBas}
      disabled={bekliyor}
      className="etiket-caps text-yazi-sonuk underline disabled:opacity-50"
    >
      {bekliyor ? "…" : children}
    </button>
  );
}
