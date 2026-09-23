"use server";

import { revalidatePath } from "next/cache";
import { platformGerekli } from "@/domain/yetki";
import { basiliKoduTasi } from "@/domain/qr";

export type TasimaDurumu = { hata?: string; bilgi?: string };

/**
 * Basılı kodun yönlendirmesini değiştirir — Ü266.
 *
 * ⚠️ `platformGerekli(true)` — yalnızca **yönetici**, destek rolü değil.
 * Bu işlem bir kafenin müşterisini ötekine yönlendiriyor; destek
 * ekibinin gündelik işlerinden biri değil.
 */
export async function tasiEylemi(
  _onceki: TasimaDurumu,
  form: FormData,
): Promise<TasimaDurumu> {
  const o = await platformGerekli(true);

  const kod = String(form.get("kod") ?? "").trim();
  const hedefTableId = String(form.get("hedefTableId") ?? "").trim();
  const gerekce = String(form.get("gerekce") ?? "").trim();

  if (!kod) return { hata: "Kod seçilmedi." };
  if (!hedefTableId) return { hata: "Hedef masa seçilmedi." };

  const sonuc = await basiliKoduTasi({ kod, hedefTableId, bakanId: o.ozneId, gerekce });

  revalidatePath("/platform/karekodlar");
  return sonuc.ok
    ? { bilgi: `“${kod}” artık yeni masaya gidiyor. Basılı kâğıt değişmedi.` }
    : { hata: sonuc.hata };
}
