"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disaAktarEylemi, adisyonKaydet } from "./actions";
import { IsletmeDugme, IsletmeUyari, isletmeGirdi } from "@/components/isletme";

/* ── Tarih aralığı ─────────────────────────────────────────── */

/**
 * Rapor dönemi seçimi.
 *
 * ── Neden hem hazır hem serbest ─────────────────────────────
 *
 * Kafe sahibinin sorularının çoğu "son bir haftada ne oldu" — o soru için
 * tarih girdirmek angarya. Ama geri kalanı ("geçen ay", "maç günü",
 * "kampanyayı açtığımdan beri") hazır aralıklara sığmıyordu ve eski iki
 * sekmeli ekranda cevapsız kalıyordu.
 *
 * ── Neden URL'de ────────────────────────────────────────────
 *
 * Seçim adres çubuğunda duruyor, bileşen state'inde değil: kafe sahibi
 * "geçen ayın raporu" bağlantısını muhasebecisine gönderebilsin ve sayfa
 * yenilendiğinde aynı dönem açılsın. Sunucu bileşeni de aynı parametreyi
 * okuduğu için ekranla CSV aynı aralığı görüyor.
 */
export function TarihAraligi({
  hazir,
  bas,
  bit,
  secenekler,
}: {
  hazir: string | null;
  bas: string;
  bit: string;
  secenekler: readonly { ad: string; etiket: string }[];
}) {
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [ozel, setOzel] = useState({ bas, bit });

  const git = (q: string) => basla(() => router.push(`/kafe/panel/rapor?${q}`));

  return (
    <div className="mb-7 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {secenekler.map((s) => (
          <button
            key={s.ad}
            type="button"
            aria-pressed={hazir === s.ad}
            onClick={() => git(`on=${s.ad}`)}
            disabled={bekliyor}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              hazir === s.ad
                ? "border-yazi bg-yazi text-yuzey"
                : "border-cizgi text-yazi-sonuk hover:border-yazi-sonuk"
            }`}
          >
            {s.etiket}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-[9rem]">
          <span className="etiket-caps mb-1 block text-[10px] text-yazi-sonuk">Başlangıç</span>
          <input
            type="date"
            value={ozel.bas}
            max={ozel.bit}
            onChange={(e) => setOzel((o) => ({ ...o, bas: e.target.value }))}
            className={`${isletmeGirdi} py-2 text-[14px]`}
          />
        </label>
        <label className="flex-1 min-w-[9rem]">
          <span className="etiket-caps mb-1 block text-[10px] text-yazi-sonuk">Bitiş</span>
          <input
            type="date"
            value={ozel.bit}
            min={ozel.bas}
            onChange={(e) => setOzel((o) => ({ ...o, bit: e.target.value }))}
            className={`${isletmeGirdi} py-2 text-[14px]`}
          />
        </label>
        <button
          type="button"
          disabled={bekliyor || !ozel.bas || !ozel.bit || ozel.bas > ozel.bit}
          onClick={() => git(`bas=${ozel.bas}&bit=${ozel.bit}`)}
          className="rounded-lg border border-cizgi bg-yuzey px-4 py-2.5 font-display text-[14px] font-bold text-yazi transition-colors hover:border-yazi-sonuk disabled:cursor-not-allowed disabled:opacity-40"
        >
          Göster
        </button>
      </div>
    </div>
  );
}

/* ── Ortalama adisyon ──────────────────────────────────────── */

/**
 * Getiri tahmininin tek varsayımı.
 *
 * Ekranda getirinin yanında duruyor, ayarlar sayfasında değil: kafe sahibi
 * tahmini görüp *"bu rakam yüksek"* dediği anda dayanağını düzeltebilsin.
 * Ayrı bir ekrana konsaydı, tahminin bir varsayıma dayandığı fark edilmezdi.
 */
export function AdisyonAyari({ mevcutTl }: { mevcutTl: number }) {
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [deger, setDeger] = useState(String(mevcutTl));
  const [hata, setHata] = useState<string | null>(null);
  const [kaydedildi, setKaydedildi] = useState(false);

  const kaydet = () =>
    basla(async () => {
      setHata(null);
      setKaydedildi(false);
      const s = await adisyonKaydet(Number(deger));
      if (!s.ok) {
        setHata(s.hata ?? "Kaydedilemedi.");
        return;
      }
      setKaydedildi(true);
      router.refresh();
    });

  return (
    <div className="space-y-2">
      {hata && <IsletmeUyari>{hata}</IsletmeUyari>}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-yazi-sonuk">Bir müşteri ortalama</span>
        <input
          type="number"
          inputMode="numeric"
          min={20}
          max={5000}
          value={deger}
          onChange={(e) => {
            setDeger(e.target.value);
            setKaydedildi(false);
          }}
          className={`${isletmeGirdi} w-24 py-2 text-center text-[15px]`}
        />
        <span className="text-[13px] text-yazi-sonuk">TL harcıyor</span>
        <button
          type="button"
          onClick={kaydet}
          disabled={bekliyor || deger === String(mevcutTl)}
          className="rounded-lg border border-cizgi px-3.5 py-2 text-[13px] font-semibold text-yazi transition-colors hover:border-yazi-sonuk disabled:cursor-not-allowed disabled:opacity-40"
        >
          {bekliyor ? "…" : kaydedildi ? "Kaydedildi" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

/* ── Dışa aktarma ──────────────────────────────────────────── */

/**
 * CSV indirme.
 *
 * Dosya sunucuda üretiliyor, istemci yalnızca indiriyor. Tarayıcıda üretmek
 * için verinin tamamını istemciye göndermek gerekirdi — mahremiyet eşiğinin
 * arkasına saklanan sayılar da dahil.
 *
 * Excel Türkçe yerelde UTF-8'i BOM olmadan tanımıyor: Türkçe karakterler
 * bozuk görünür. BOM burada ekleniyor.
 */
export function DisaAktarma({
  sorgu,
  dosyaAdi,
}: {
  sorgu: { on?: string; bas?: string; bit?: string };
  dosyaAdi: string;
}) {
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  const indir = () =>
    basla(async () => {
      try {
        const csv = await disaAktarEylemi(sorgu);
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `looply-rapor-${dosyaAdi}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setHata("Dosya oluşturulamadı. Sayfayı yenileyip tekrar dene.");
      }
    });

  return (
    <div className="space-y-3">
      {hata && <IsletmeUyari>{hata}</IsletmeUyari>}
      <IsletmeDugme type="button" ikincil onClick={indir} disabled={bekliyor}>
        {bekliyor ? "Hazırlanıyor…" : "CSV olarak indir"}
      </IsletmeDugme>
      <p className="text-[13px] leading-relaxed text-yazi-sonuk">
        Seçili dönemin özeti, saatlik dağılımı, masa hareketi, kampanya sonuçları ve doğrulama
        defteri. Her indirme kayda geçer.
      </p>
    </div>
  );
}
