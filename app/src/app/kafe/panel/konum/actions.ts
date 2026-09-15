"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { konumBelirle } from "@/domain/cafe";
import * as ayar from "@/domain/ayar";

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

export type YaricapDurumu = { hata?: string; bilgi?: string };

/**
 * Konum doğrulama yarıçapı — Ü131.
 *
 * Ürün sahibi: *"konumdan kaç metre uzakta olduğunu tanımlamak için
 * yarıçap belirlesin kafe sahibi, 40 metre diyince 40 metre yarıçaptaki
 * alanda doğru kabul etsin."*
 *
 * ⚠️ Sınırlar `ayar.SINIRLAR`da ve gevşetilemez: altı GPS'in kendi hata
 * payının içinde kalır (kafe kendi masasındaki müşteriyi reddeder), üstü
 * K2'yi anlamsızlaştırır (çember mahalleyi kapsarsa "kafede olmak" bir
 * kanıt olmaktan çıkar).
 *
 * ⚠️ `cafeId` oturumdan — konum kaydetmeyle aynı sebep. Formdan gelseydi
 * bir yönetici başka kafenin çemberini açıp o kafede uzaktan ödül
 * kazanılmasının yolunu açardı.
 */
export async function yaricapKaydet(
  _onceki: YaricapDurumu,
  form: FormData,
): Promise<YaricapDurumu> {
  const o = await kafeYoneticisiGerekli();

  const metre = Number(form.get("yaricap"));
  if (!Number.isInteger(metre)) return { hata: "Yarıçap tam sayı olmalı." };

  const sonuc = await ayar.sayiYaz({
    cafeId: o.cafeId,
    anahtar: ayar.ANAHTARLAR.konumYaricapi,
    deger: metre,
    aktorId: o.ozneId,
  });
  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/konum");
  return { bilgi: `Yarıçap ${metre} metre olarak kaydedildi.` };
}
