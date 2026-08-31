"use client";

import { useState, useTransition } from "react";
import {
  verileriIndir,
  pazarlamaIzniVer,
  pazarlamaIzniniGeriAl,
  hatirlatmayiAc,
  hatirlatmayiKapat,
  hesabiSil,
  silmeyiIptalEt,
  adGorunurluguAyarla,
} from "./actions";
import { Dugme } from "@/components/ui";

/** Veriyi sunucudan alır ve tarayıcıda dosya olarak indirir. */
export function VeriIndirmeDugmesi() {
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  return (
    <div>
      <Dugme
        ikincil
        disabled={bekliyor}
        onClick={() =>
          basla(async () => {
            try {
              const json = await verileriIndir();
              const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = `cafeplay-verilerim-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              setHata("Dosya hazırlanamadı. Biraz sonra tekrar dene.");
            }
          })
        }
      >
        {bekliyor ? "Hazırlanıyor…" : "Verilerimi indir"}
      </Dugme>
      {hata && <p className="mt-2 text-[13px] text-tehlike">{hata}</p>}
    </div>
  );
}

export function IzinAnahtari({ acik }: { acik: boolean }) {
  const [durum, setDurum] = useState(acik);
  const [bekliyor, basla] = useTransition();

  return (
    <button
      type="button"
      disabled={bekliyor}
      aria-pressed={durum}
      onClick={() =>
        basla(async () => {
          const yeni = !durum;
          setDurum(yeni);
          if (yeni) await pazarlamaIzniVer();
          else await pazarlamaIzniniGeriAl();
        })
      }
      className="flex w-full items-center justify-between rounded-lg border border-cizgi bg-cukur px-4 py-3.5 text-left disabled:opacity-50"
    >
      <span className="text-[15px]">Kampanya mesajı almak istiyorum</span>
      <span
      className={`ml-3 shrink-0 border px-2.5 py-1 etiket-caps ${
          durum ? "border-vurgu text-vurgu" : "border-cizgi text-yazi-sonuk"
        }`}
      >
        {durum ? "açık" : "kapalı"}
      </span>
    </button>
  );
}

/**
 * Ödül hatırlatması anahtarı.
 *
 * Kampanya izninin **yanında ama ondan ayrı** duruyor: biri ticari ileti
 * izni (G7, İYS kapsamında), diğeri hizmete ait bildirim tercihi. Aynı
 * kutuda birleştirmek, KVKK'nın "farklı amaçları tek işlemle birleştirme"
 * ilkesine aykırı olurdu — ve zaten farklı şeyler.
 */
export function HatirlatmaAnahtari({ acik }: { acik: boolean }) {
  const [durum, setDurum] = useState(acik);
  const [bekliyor, basla] = useTransition();

  return (
    <button
      type="button"
      disabled={bekliyor}
      aria-pressed={durum}
      onClick={() =>
        basla(async () => {
          const yeni = !durum;
          setDurum(yeni);
          if (yeni) await hatirlatmayiAc();
          else await hatirlatmayiKapat();
        })
      }
      className="flex w-full items-center justify-between rounded-lg border border-cizgi bg-cukur px-4 py-3.5 text-left disabled:opacity-50"
    >
      <span className="text-[15px]">
        Ödülüm kullanıma açılınca haber ver
        <span className="mt-0.5 block text-[13px] text-yazi-sonuk">
          Yalnızca kendi kazandığın ödüller — kampanya mesajı değil.
        </span>
      </span>
      <span
        className={`ml-3 shrink-0 border px-2.5 py-1 etiket-caps ${
          durum ? "border-vurgu text-vurgu" : "border-cizgi text-yazi-sonuk"
        }`}
      >
        {durum ? "açık" : "kapalı"}
      </span>
    </button>
  );
}

export function HesapSilme({ silmeTalebiVar }: { silmeTalebiVar: boolean }) {
  const [onay, setOnay] = useState(false);
  const [bekliyor, basla] = useTransition();

  if (silmeTalebiVar) {
    return (
      <Dugme ikincil disabled={bekliyor} onClick={() => basla(() => silmeyiIptalEt())}>
        {bekliyor ? "İşleniyor…" : "Silme talebimden vazgeç"}
      </Dugme>
    );
  }

  if (!onay) {
    return (
      <Dugme ikincil onClick={() => setOnay(true)}>
        Hesabımı sil
      </Dugme>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-tehlike/60 bg-yuzey p-4">
      <p className="text-[14px] leading-relaxed">
        Hesabın kapatılacak ve tüm cihazlardan çıkış yapılacak. Kişisel bilgilerin 30 gün
        sonra silinecek. Bu süre içinde vazgeçebilirsin.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={bekliyor}
          onClick={() => basla(() => hesabiSil())}
          className="flex-1 rounded-lg bg-tehlike px-4 py-3 font-display text-[15px] font-bold text-white disabled:opacity-50"
        >
          {bekliyor ? "Siliniyor…" : "Evet, sil"}
        </button>
        <button
          type="button"
          onClick={() => setOnay(false)}
          className="flex-1 rounded-lg border border-cizgi px-4 py-3 text-[15px]"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}

/**
 * Ö1: masa tahtında ad görünürlüğü.
 *
 * `IzinAnahtari` ile aynı görünüyor ama ayrı bir bileşen: o bir KVKK
 * rızasını (İYS kaydı doğuran) açıp kapatıyor, bu yalnızca bir görünürlük
 * tercihi. İkisini tek bileşene bindirmek, farklı hukuki ağırlıktaki iki
 * şeyi aynı koda bağlardı.
 */
export function AdGorunurluguAnahtari({ acik }: { acik: boolean }) {
  const [durum, setDurum] = useState(acik);
  const [bekliyor, basla] = useTransition();

  return (
    <button
      type="button"
      disabled={bekliyor}
      aria-pressed={durum}
      onClick={() =>
        basla(async () => {
          const yeni = !durum;
          setDurum(yeni);
          await adGorunurluguAyarla(yeni);
        })
      }
      className="flex w-full items-center justify-between rounded-lg border border-cizgi bg-cukur px-4 py-3.5 text-left disabled:opacity-50"
    >
      <span className="text-[15px]">Masa tahtında adım görünsün</span>
      <span
        className={`etiket-caps ml-3 shrink-0 rounded border px-2.5 py-1 ${
          durum ? "border-vurgu text-vurgu" : "border-cizgi text-yazi-sonuk"
        }`}
      >
        {durum ? "açık" : "kapalı"}
      </span>
    </button>
  );
}
