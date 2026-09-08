"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as kampanya from "@/domain/kampanya";

export type KampanyaDurumu = { hata?: string; bilgi?: string };

function sayi(form: FormData, alan: string): number {
  return Number(String(form.get(alan) ?? "").replace(/[^\d]/g, ""));
}

export async function olusturEylemi(
  _onceki: KampanyaDurumu,
  form: FormData,
): Promise<KampanyaDurumu> {
  const o = await kafeYoneticisiGerekli();

  const urunId = String(form.get("urunId") ?? "");
  if (!urunId) return { hata: "Bir ürün seç." };

  const toplamHam = String(form.get("toplamLimit") ?? "").replace(/[^\d]/g, "");

  const sonuc = await kampanya.olustur({
    cafeId: o.cafeId,
    urunId,
    yuzde: sayi(form, "yuzde"),
    tavanKurus: sayi(form, "tavan") * 100,
    gunlukLimit: sayi(form, "gunlukLimit"),
    toplamLimit: toplamHam ? Number(toplamHam) : null,
    gunSayisi: sayi(form, "gunSayisi"),
    // Ü100: upsell kipi. İşaretliyse kupon ertelenmiyor ve oyun sonunda
    // kendiliğinden verilmiyor — oyuncuya teklif olarak gösteriliyor.
    hemen: form.get("hemen") === "on",
    gecerliSaat: sayi(form, "gecerliSaat") || 3,
    aktorId: o.ozneId,
  });

  revalidatePath("/kafe/panel/kampanyalar");
  return sonuc.ok
    ? {
        bilgi:
          form.get("hemen") === "on"
            ? "Upsell teklifi taslak olarak kaydedildi. Yayına aldığında oyun sonunda teklif olarak çıkacak."
            : "Kampanya taslak olarak kaydedildi. Yayına almadan oyunculara görünmez.",
      }
    : { hata: sonuc.hata };
}

export async function durumEylemi(
  kampanyaId: string,
  yeniDurum: kampanya.KampanyaDurumu,
): Promise<{ hata?: string }> {
  const o = await kafeYoneticisiGerekli();
  const sonuc = await kampanya.durumDegistir({
    cafeId: o.cafeId,
    kampanyaId,
    yeniDurum,
    aktorId: o.ozneId,
  });
  revalidatePath("/kafe/panel/kampanyalar");
  return sonuc.ok ? {} : { hata: sonuc.hata };
}
