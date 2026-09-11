"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as oyunSecimi from "@/domain/oyun-secimi";

export type OyunDurumu = { hata?: string; bilgi?: string };

/**
 * Bir oyunu açar veya kapatır.
 *
 * `cafeId` **oturumdan** (değişmez kural #3): form alanından gelseydi bir
 * kafe yöneticisi başka kafenin oyunlarını kapatabilirdi.
 */
export async function oyunDurumu(oyunId: string, acik: boolean): Promise<OyunDurumu> {
  const o = await kafeYoneticisiGerekli();

  const sonuc = await oyunSecimi.degistir({
    cafeId: o.cafeId,
    oyunId,
    acik,
    aktorId: o.ozneId,
  });

  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/oyunlar");
  return {
    bilgi: acik
      ? "Oyun açıldı. Müşteriler yeniden oynayabilir."
      : "Oyun kapatıldı. Katalogdan kalktı, başlatılamıyor.",
  };
}
