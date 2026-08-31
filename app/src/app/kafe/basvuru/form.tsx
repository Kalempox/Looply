"use client";

import { useActionState } from "react";
import { basvuruGonder } from "./actions";
import { IsletmeAlan, isletmeGirdi, IsletmeDugme, IsletmeUyari } from "@/components/isletme";

export function BasvuruFormu() {
  const [durum, action, bekliyor] = useActionState(basvuruGonder, { asama: "form" });

  if (durum.asama === "alindi") {
    return (
      <div className="space-y-5">
        <IsletmeUyari tur="bilgi">
          <strong>Başvurun alındı.</strong> Belgeni inceleyip yetkili numarana bilgi vereceğiz.
        </IsletmeUyari>
        <div className="rounded-2xl border border-cizgi bg-yuzey p-5">
          <h2 className="font-display text-lg font-bold">Bundan sonra ne olacak</h2>
          <ol className="mt-3 space-y-2.5 text-[14px] leading-relaxed text-yazi-sonuk">
            <li>
              <strong className="text-yazi">1.</strong> Yüklediğin belgeyi inceliyoruz.
            </li>
            <li>
              <strong className="text-yazi">2.</strong> Onaylanınca yetkili numarasına giriş
              bilgisi gönderiyoruz.
            </li>
            <li>
              <strong className="text-yazi">3.</strong> Panelden haftalık bütçeni ve ödül
              listeni kuruyorsun.
            </li>
            <li>
              <strong className="text-yazi">4.</strong> Masa karekodların üretiliyor.
            </li>
          </ol>
          <p className="mt-4 border-t border-cizgi pt-4 text-[13px] text-yazi-sonuk">
            Onay tamamlanmadan hiçbir karekod üretilmez ve müşterine kupon dağıtılmaz.
          </p>
        </div>
      </div>
    );
  }

  const d = durum.degerler ?? {};

  return (
    <form action={action} className="space-y-5">
      {durum.genelHata && <IsletmeUyari>{durum.genelHata}</IsletmeUyari>}

      <IsletmeAlan etiket="İşletme adı" hata={durum.hatalar?.ad} ipucu="Müşterinin gördüğü ad">
        <input name="ad" defaultValue={d.ad} className={isletmeGirdi} required />
      </IsletmeAlan>

      <IsletmeAlan etiket="Ticari unvan" hata={durum.hatalar?.yasalAd} ipucu="Vergi levhasındaki tam unvan">
        <input name="yasalAd" defaultValue={d.yasalAd} className={isletmeGirdi} required />
      </IsletmeAlan>

      <div className="grid gap-4 sm:grid-cols-2">
        <IsletmeAlan etiket="Vergi numarası" hata={durum.hatalar?.vergiNo}>
          <input
            name="vergiNo"
            inputMode="numeric"
            defaultValue={d.vergiNo}
            className={isletmeGirdi}
            required
          />
        </IsletmeAlan>
        <IsletmeAlan etiket="Şehir" hata={durum.hatalar?.sehir}>
          <input name="sehir" defaultValue={d.sehir} className={isletmeGirdi} required />
        </IsletmeAlan>
      </div>

      <IsletmeAlan etiket="Açık adres" hata={durum.hatalar?.adres}>
        <textarea name="adres" defaultValue={d.adres} rows={3} className={isletmeGirdi} required />
      </IsletmeAlan>

      <div className="grid gap-4 sm:grid-cols-2">
        <IsletmeAlan etiket="Yetkili adı soyadı" hata={durum.hatalar?.yetkiliAdi}>
          <input name="yetkiliAdi" defaultValue={d.yetkiliAdi} className={isletmeGirdi} required />
        </IsletmeAlan>
        <IsletmeAlan
          etiket="Yetkili cep telefonu"
          hata={durum.hatalar?.yetkiliTelefon}
          ipucu="Panele bu numarayla girilir"
        >
          <input
            name="yetkiliTelefon"
            type="tel"
            defaultValue={d.yetkiliTelefon}
            placeholder="0532 123 45 67"
            className={isletmeGirdi}
            required
          />
        </IsletmeAlan>
      </div>

      <IsletmeAlan
        etiket="Vergi levhası veya işletme belgesi"
        hata={durum.hatalar?.belge}
        ipucu="PDF, JPG veya PNG · en fazla 8 MB · şifreli saklanır"
      >
        <input
          name="belge"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className={`${isletmeGirdi} file:mr-3 file:border-0 file:bg-yazi file:px-3 file:py-1.5 file:text-[13px] file:text-white`}
          required
        />
      </IsletmeAlan>

      <div className="border-t border-cizgi pt-5">
        <IsletmeDugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Gönderiliyor…" : "Başvuruyu gönder"}
        </IsletmeDugme>
      </div>
    </form>
  );
}
