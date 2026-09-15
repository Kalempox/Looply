"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { subeBasvurusu } from "@/domain/cafe";

export type SubeFormDurumu = {
  hata?: string;
  basarili?: boolean;
  degerler?: { ad?: string; sehir?: string };
};

/**
 * Şube başvurusu eylemi (Ü125).
 *
 * ⚠️ `cafeId` ve `staffId` **oturumdan** geliyor, formdan değil —
 * Değişmez kural #3. Formdan gelselerdi bir yönetici, gizli alanı
 * değiştirip başka bir işletmenin adına şube açardı.
 *
 * ⚠️ Hata durumunda girilen değerler geri veriliyor: adres üç satırlık
 * bir alan ve reddedilen formda kaybolması, kullanıcıyı ikinci kez
 * yazmaya zorlar.
 */
export async function subeBasvuruEylemi(
  _onceki: SubeFormDurumu,
  form: FormData,
): Promise<SubeFormDurumu> {
  const o = await kafeYoneticisiGerekli();

  const degerler = {
    ad: String(form.get("ad") ?? ""),
    sehir: String(form.get("sehir") ?? ""),
  };

  const sonuc = await subeBasvurusu({
    cafeId: o.cafeId,
    staffId: o.ozneId,
    ...degerler,
  });

  if (!sonuc.ok) return { hata: sonuc.hata, degerler };

  revalidatePath("/kafe/panel/subeler");
  return { basarili: true };
}
