"use server";

import { revalidatePath } from "next/cache";
import { withCafe } from "@/db/context";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { donemBelirle } from "@/domain/butce";

export type ButceDurumu = { hata?: string; bilgi?: string };

/**
 * Haftalık bütçeyi belirler.
 *
 * `cafeId` **oturumdan** geliyor (değişmez kural #3). Form alanından gelseydi,
 * bir kafe yöneticisi başka kafenin bütçesini değiştirebilirdi.
 *
 * Kafenin onay tarihi de sunucuda okunuyor: orantılı ilk dönemin (Ü25)
 * dayanağı o tarih ve istemciden gelmemeli.
 */
export async function butceEylemi(_onceki: ButceDurumu, form: FormData): Promise<ButceDurumu> {
  const o = await kafeYoneticisiGerekli();

  const ham = String(form.get("tutar") ?? "").replace(/[^\d]/g, "");
  if (!ham) return { hata: "Bir tutar gir." };

  const tutarTl = Number(ham);
  if (!Number.isFinite(tutarTl) || tutarTl <= 0) return { hata: "Geçerli bir tutar gir." };
  if (tutarTl > 1_000_000) return { hata: "Bu tutar fazla yüksek görünüyor — kontrol et." };

  const kafe = await withCafe(o.cafeId, (db) =>
    db.one<{ approved_at: string | null }>(`SELECT approved_at::date::text FROM cafes`),
  );

  const sonuc = await donemBelirle({
    cafeId: o.cafeId,
    taahhutKurus: tutarTl * 100,
    aktorId: o.ozneId,
    katilimGunu: kafe?.approved_at ?? undefined,
  });

  revalidatePath("/kafe/panel/butce");
  revalidatePath("/kafe/panel");

  return sonuc.ok
    ? { bilgi: "Bütçe kaydedildi. Kullanılmayan kuponun maliyeti yok — yalnızca kasada onaylanan düşer." }
    : { hata: sonuc.hata };
}
