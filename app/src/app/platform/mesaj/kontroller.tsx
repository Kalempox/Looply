"use client";

import { useActionState, useState } from "react";
import { mesajGonder, type MesajDurumu } from "./actions";
import { EN_UZUN_METIN } from "./sinirlar";
import {
  IsletmeAlan,
  isletmeGirdi,
  IsletmeDugme,
  IsletmeUyari,
} from "@/components/isletme";

const BOS: MesajDurumu = {};

/**
 * Kampanya mesajı formu — Ü130.
 *
 * ── Neden önizleme var ──────────────────────────────────────
 *
 * Gönderilen metin yazılana eşit değil: şablon çıkma cümlesini ekliyor
 * (`sms/index.ts` → `campaign`). Yazan kişi bunu görmezse mesajı 160
 * karaktere sığdırdığını sanır ve kutu ikiye bölünür. Önizleme,
 * gidecek metnin tamamını gösteriyor.
 *
 * ── Neden iki kademe ────────────────────────────────────────
 *
 * "Gönder" doğrudan göndermiyor: önce kaç kişiye gideceğini yazan bir
 * onay kademesi var. Binlerce kişiye giden ve geri alınamayan bir işlem,
 * tek tıkla olmamalı.
 */
export function MesajFormu({ kitle }: { kitle: number }) {
  const [durum, action, bekliyor] = useActionState(mesajGonder, BOS);
  const [metin, setMetin] = useState(durum.metin ?? "");
  const [onayAcik, setOnayAcik] = useState(false);

  const cikma = "\n\nCikmak icin: looplybusiness.com/verilerim";
  const tamMetin = metin + cikma;
  const parca = Math.max(Math.ceil(tamMetin.length / 160), 1);

  if (durum.ozet) {
    const o = durum.ozet;
    return (
      <div className="space-y-5">
        <IsletmeUyari tur={o.basarisiz > 0 || o.engellendi > 0 ? "bekle" : "bilgi"}>
          <strong>
            {o.gonderildi} / {o.toplam} mesaj gönderildi.
          </strong>
          {o.engellendi > 0 && (
            <>
              {" "}
              {o.engellendi} tanesi günlük SMS tavanına takıldı — bunlar{" "}
              <strong>gitmedi</strong> ve kendiliğinden tekrar denenmiyor.
            </>
          )}
          {o.basarisiz > 0 && <> {o.basarisiz} tanesi sağlayıcıda başarısız oldu.</>}
        </IsletmeUyari>
        <a href="/platform/mesaj" className="inline-block text-[14px] text-vurgu underline">
          Yeni mesaj
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}

      <IsletmeAlan
        etiket="Mesaj"
        ipucu={`En fazla ${EN_UZUN_METIN} karakter. Çıkma cümlesi otomatik ekleniyor.`}
      >
        <textarea
          name="metin"
          rows={4}
          maxLength={EN_UZUN_METIN}
          value={metin}
          onChange={(e) => {
            setMetin(e.target.value);
            setOnayAcik(false);
          }}
          className={isletmeGirdi}
          placeholder="Bu hafta Looply kafelerinde surpriz oduller seni bekliyor."
        />
      </IsletmeAlan>

      <div className="rounded-xl border border-cizgi bg-cukur px-4 py-3.5">
        <div className="etiket-caps text-[10px] text-yazi-sonuk">Gidecek metin</div>
        <p className="mt-1.5 font-data text-[13px] leading-relaxed whitespace-pre-wrap">
          {tamMetin}
        </p>
        <p className="mt-2 text-[12px] text-yazi-sonuk">
          {tamMetin.length} karakter · {parca} SMS parçası
          {parca > 1 && " — kutu bölünecek, maliyeti katlar"}
        </p>
      </div>

      <IsletmeAlan
        etiket="Gönderim gerekçesi"
        ipucu="Denetim izine yazılıyor — 'neden bu kampanya gitti' sorusunun cevabı."
      >
        <input name="gerekce" className={isletmeGirdi} placeholder="Ekim kampanyası" />
      </IsletmeAlan>

      {!onayAcik ? (
        <IsletmeDugme
          type="button"
          onClick={() => setOnayAcik(true)}
          disabled={metin.trim().length < 10}
        >
          Devam et
        </IsletmeDugme>
      ) : (
        <div className="rounded-xl border border-tehlike/50 bg-tehlike/5 px-4 py-4">
          <p className="text-[14px] leading-relaxed">
            Bu mesaj <strong>{kitle} kişiye</strong> gidecek ve{" "}
            <strong>geri alınamaz</strong>. Yalnızca ticari ileti rızası açık olanlara
            gönderiliyor.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <IsletmeDugme type="submit" disabled={bekliyor}>
              {bekliyor ? "Gönderiliyor…" : `${kitle} kişiye gönder`}
            </IsletmeDugme>
            <IsletmeDugme type="button" ikincil onClick={() => setOnayAcik(false)}>
              Vazgeç
            </IsletmeDugme>
          </div>
        </div>
      )}
    </form>
  );
}
