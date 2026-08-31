"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as masaYonetim from "@/domain/masa-yonetim";

export type MasaDurumu = { hata?: string; bilgi?: string };

/**
 * Masa ekler.
 *
 * `cafeId` **oturumdan** (değişmez kural #3): form alanından gelseydi bir
 * kafe yöneticisi başka kafeye masa ekleyebilirdi.
 */
export async function masaEkle(_onceki: MasaDurumu, form: FormData): Promise<MasaDurumu> {
  const o = await kafeYoneticisiGerekli();

  const sonuc = await masaYonetim.ekle({
    cafeId: o.cafeId,
    ad: String(form.get("ad") ?? ""),
    aktorId: o.ozneId,
  });

  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/masalar");
  revalidatePath("/kafe/panel");
  return { bilgi: "Masa eklendi. Karekodu yazdırma sayfasında." };
}

export async function masaDurumu(tableId: string, aktif: boolean): Promise<MasaDurumu> {
  const o = await kafeYoneticisiGerekli();

  const sonuc = await masaYonetim.durumDegistir({
    cafeId: o.cafeId,
    tableId,
    aktif,
    aktorId: o.ozneId,
  });

  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/masalar");
  return {
    bilgi: aktif
      ? "Masa yeniden açıldı."
      : "Masa kapatıldı. Yapıştırılmış karekodu artık çalışmıyor.",
  };
}
