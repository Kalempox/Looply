"use server";

import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { pinGiris, cihazinKafesi } from "@/domain/staff";

export type KasaGirisDurumu = { hata?: string; kafeAdi?: string };

/**
 * Kasiyer girişi — G11.
 *
 * Üç şart birden: cihaz kayıtlı, kafe onaylı, PIN doğru. Cihaz kayıtlı
 * değilse PIN **hiç denenmiyor** — 10.000 ihtimali internete açmıyoruz.
 *
 * Kafe kimliği formdan gelmiyor, **cihazdan çözülüyor**. Kasiyerin her
 * vardiya başında kafe seçmesi, üç saniyede bitmesi gereken akışa gereksiz
 * bir adım eklerdi; ayrıca formdan gelen bir kafe kimliği, başka kafenin
 * kasasına PIN denemenin kapısı olurdu.
 */
export async function girisEylemi(
  _onceki: KasaGirisDurumu,
  form: FormData,
): Promise<KasaGirisDurumu> {
  const cihazId = String(form.get("cihazId") ?? "");
  const pin = String(form.get("pin") ?? "").replace(/[^\d]/g, "");

  if (!cihazId) return { hata: "Cihaz kimliği okunamadı. Sayfayı yenile." };
  if (pin.length !== 4) return { hata: "PIN dört haneli olmalı." };

  const kafe = await cihazinKafesi(cihazId);
  if (!kafe) {
    return {
      hata: "Bu cihaz kayıtlı değil. İşletme yöneticisi panelden kaydetmeli.",
    };
  }

  const sonuc = await pinGiris({ cafeId: kafe.cafeId, cihazId, pin });

  if (sonuc.durum === "kilitli") {
    return { hata: "Çok fazla yanlış deneme. Bir süre bekle." };
  }
  if (sonuc.durum === "cihaz_kayitsiz") {
    return { hata: "Bu cihaz kayıtlı değil." };
  }
  if (sonuc.durum === "yanlis") {
    return { hata: "PIN yanlış.", kafeAdi: kafe.ad };
  }

  await oturum.olustur({
    ozneTipi: "staff",
    ozneId: sonuc.staffId,
    rol: "kasiyer",
    cafeId: kafe.cafeId,
    cihazId,
  });

  redirect("/kasa");
}
