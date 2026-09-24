"use server";

import { revalidatePath } from "next/cache";
import { platformGerekli } from "@/domain/yetki";
import { basiliKoduTasi } from "@/domain/qr";

export type TasimaDurumu = { hata?: string; bilgi?: string };

/**
 * Basılı kodun yönlendirmesini değiştirir — Ü266/Ü267.
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
  const hedefCafeId = String(form.get("hedefCafeId") ?? "").trim();
  const gerekce = String(form.get("gerekce") ?? "").trim();

  if (!kod) return { hata: "Kod seçilmedi." };
  if (!hedefCafeId) return { hata: "Hedef kafe seçilmedi." };

  const sonuc = await basiliKoduTasi({ kod, hedefCafeId, bakanId: o.ozneId, gerekce });

  revalidatePath("/platform/karekodlar");
  if (!sonuc.ok) return { hata: sonuc.hata };

  /* ⚠️ Serbest bırakılan kod söyleniyor: sessiz kalsa, hedef kafenin
     eski kodunun artık hiçbir yere gitmediği kayıttan başka hiçbir yerde
     görünmezdi. */
  return {
    bilgi: sonuc.birakilanKod
      ? `“${kod}” artık yeni kafeye gidiyor. O kafenin hiç kullanılmamış eski kodu (${sonuc.birakilanKod}) serbest bırakıldı.`
      : sonuc.masaAcildi
        ? `“${kod}” artık yeni kafeye gidiyor. Kafenin masası bu kodla açıldı.`
        : `“${kod}” artık yeni kafeye gidiyor. Kafenin masasına bu kod verildi.`,
  };
}
