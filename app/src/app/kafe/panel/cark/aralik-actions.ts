"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as ayar from "@/domain/ayar";

export type AralikDurumu = { hata?: string; bilgi?: string };

/**
 * Çark aralığını kaydeder — Ü158.
 *
 * Ürün sahibi: *"süreyi kafe sahibi panelden belirlemeli, kaç saatte bir
 * çark çıkacağını."* Önceden `cark.ts`te `ARALIK_SAAT = 24` sabitti ve
 * panelde yalnızca **okunuyordu**; değiştirilemeyen bir sayıyı ayar gibi
 * göstermek kafe sahibini yanıltıyordu.
 *
 * ⚠️ `cafeId` ve `aktorId` **oturumdan** (Değişmez kural #3). Formdan
 * gelselerdi bir yönetici başka işletmenin çark sıklığını değiştirir ve
 * o işletmenin bütçesinden daha hızlı para dağıttırırdı.
 *
 * ⚠️ Sınır denetimi **alan katmanında** (`ayar.sayiYaz`), burada değil:
 * ikisinde de yazsaydık biri gevşediğinde diğeri fark edilmezdi.
 */
export async function aralikEylemi(
  _onceki: AralikDurumu,
  form: FormData,
): Promise<AralikDurumu> {
  const o = await kafeYoneticisiGerekli();

  const saat = Number(String(form.get("saat") ?? "").trim());
  if (!Number.isFinite(saat)) return { hata: "Saat sayı olmalı." };

  const sonuc = await ayar.sayiYaz({
    cafeId: o.cafeId,
    anahtar: ayar.ANAHTARLAR.carkAralikSaat,
    deger: Math.round(saat),
    aktorId: o.ozneId,
  });
  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/cark");
  return {
    bilgi:
      saat === 24
        ? "Müşteri çarkı 24 saatte bir çevirebilecek."
        : `Müşteri çarkı ${Math.round(saat)} saatte bir çevirebilecek.`,
  };
}
