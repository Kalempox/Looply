"use client";

import { useState, useTransition } from "react";
import { disaAktarEylemi } from "./actions";
import { IsletmeDugme, IsletmeUyari } from "@/components/isletme";

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
export function DisaAktarma({ hafta }: { hafta: "bu" | "gecen" }) {
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  const indir = () =>
    basla(async () => {
      try {
        const csv = await disaAktarEylemi(hafta);
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cafeplay-rapor-${hafta === "gecen" ? "gecen" : "bu"}-hafta.csv`;
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
        Bu dönemin özeti, saatlik dağılımı, masa hareketi, kampanya sonuçları ve doğrulama
        defteri.
      </p>
      <p className="text-[12px] leading-relaxed text-yazi-sonuk">
        İndirilen dosyada da mahremiyet eşiği geçerli: beş kişiden az içeren gruplar{" "}
        <code className="font-data">&lt;5</code> olarak yazılır. Her indirme kayda geçer.
      </p>
    </div>
  );
}
