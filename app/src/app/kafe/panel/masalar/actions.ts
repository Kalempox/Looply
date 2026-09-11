"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as masaYonetim from "@/domain/masa-yonetim";
import * as karekodTuru from "@/domain/karekod-turu";

export type MasaDurumu = { hata?: string; bilgi?: string };

/**
 * Masa ekler.
 *
 * `cafeId` **oturumdan** (değişmez kural #3): form alanından gelseydi bir
 * kafe yöneticisi başka kafeye masa ekleyebilirdi.
 */
export async function masaEkle(_onceki: MasaDurumu, form: FormData): Promise<MasaDurumu> {
  const o = await kafeYoneticisiGerekli();

  // Ü108: tür formdan geliyor ve doğrulanıyor. `cafeId`nin aksine tür
  // istemciden alınabilir — para değeri taşımıyor ve yanlış değer
  // `ekle` tarafından reddediliyor (değişmez kural #4 kapsamı dışında).
  const ham = String(form.get("tur") ?? "masa");
  const tur = karekodTuru.turMu(ham) ? ham : "masa";

  const sonuc = await masaYonetim.ekle({
    cafeId: o.cafeId,
    ad: String(form.get("ad") ?? ""),
    tur,
    aktorId: o.ozneId,
  });

  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/masalar");
  revalidatePath("/kafe/panel");
  return { bilgi: `${karekodTuru.TUR_ADI[tur].tekil} karekodu eklendi. Yazdırma sayfasında.` };
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
      ? "Karekod yeniden açıldı."
      : "Karekod kapatıldı. Yapıştırılmış olan artık çalışmıyor.",
  };
}
