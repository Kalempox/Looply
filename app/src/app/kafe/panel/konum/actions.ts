"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { konumBelirle } from "@/domain/cafe";

export type KonumDurumu = { hata?: string; bilgi?: string };

/**
 * Kafenin konumunu kaydeder.
 *
 * `cafeId` **oturumdan** geliyor (değişmez kural #3): form alanından gelseydi
 * bir kafe yöneticisi başka kafenin konumunu değiştirip o kafedeki tüm
 * kazanımları kırabilirdi.
 */
export async function konumKaydet(lat: number, lng: number): Promise<KonumDurumu> {
  const o = await kafeYoneticisiGerekli();

  const sonuc = await konumBelirle({ cafeId: o.cafeId, lat, lng, aktorId: o.ozneId });
  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel");
  revalidatePath("/kafe/panel/konum");
  return { bilgi: "Kafenin konumu kaydedildi. Oyuncular artık doğrulayabilir." };
}
