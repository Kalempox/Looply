"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as urun from "@/domain/urun";

export type UrunDurumu = { hata?: string; bilgi?: string };

export async function ekleEylemi(_onceki: UrunDurumu, form: FormData): Promise<UrunDurumu> {
  const o = await kafeYoneticisiGerekli();

  const ad = String(form.get("ad") ?? "");
  const ham = String(form.get("fiyat") ?? "").replace(/[^\d]/g, "");
  if (!ham) return { hata: "Fiyat gir." };

  const sonuc = await urun.ekle({
    cafeId: o.cafeId,
    ad,
    fiyatKurus: Number(ham) * 100,
    aktorId: o.ozneId,
  });

  revalidatePath("/kafe/panel/urunler");
  return sonuc.ok ? { bilgi: `${sonuc.urun.ad} eklendi.` } : { hata: sonuc.hata };
}

export async function durumEylemi(urunId: string, aktif: boolean): Promise<void> {
  const o = await kafeYoneticisiGerekli();
  await urun.durumDegistir({ cafeId: o.cafeId, urunId, aktif, aktorId: o.ozneId });
  revalidatePath("/kafe/panel/urunler");
}
