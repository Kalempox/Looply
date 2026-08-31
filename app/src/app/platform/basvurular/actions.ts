"use server";

import { revalidatePath } from "next/cache";
import { platformGerekli } from "@/domain/yetki";
import { onayla, reddet, telefonuAc } from "@/domain/cafe";

export type OnayDurumu = { hata?: string; bilgi?: string };

/**
 * Başvuru onayı ve reddi.
 *
 * G9: bu iki işlem `platform_admin` yetkisi ister. `platform_destek`
 * başvuruları görebilir ama karara bağlayamaz — kafe onaylamak, sisteme
 * kupon üretebilecek yeni bir taraf sokmak demek.
 */

export async function onaylaEylemi(_onceki: OnayDurumu, form: FormData): Promise<OnayDurumu> {
  const o = await platformGerekli(true);
  const cafeId = String(form.get("cafeId") ?? "");
  if (!cafeId) return { hata: "Başvuru seçilmedi" };

  const sonuc = await onayla(cafeId, o.ozneId);
  revalidatePath("/platform/basvurular");

  return sonuc.ok
    ? { bilgi: "Onaylandı. Yönetici hesabı açıldı; yetkili artık panele girebilir." }
    : { hata: sonuc.hata };
}

/**
 * Yetkilinin tam numarasını açar.
 *
 * Yalnızca yönetici çağırabilir ve her çağrı gerekçesiyle denetim izine düşer
 * (docs/08 §3). Numarayı listede herkese göstermek yerine böyle yapıyoruz:
 * meşru kullanım tek tıkla oluyor, toplu okuma ise kayıt bırakıyor.
 */
export async function telefonuAcEylemi(cafeId: string): Promise<string | null> {
  const o = await platformGerekli(true);
  return telefonuAc(cafeId, o.ozneId, "başvuru incelemesi");
}

export async function reddetEylemi(_onceki: OnayDurumu, form: FormData): Promise<OnayDurumu> {
  const o = await platformGerekli(true);
  const cafeId = String(form.get("cafeId") ?? "");
  const sebep = String(form.get("sebep") ?? "").trim();

  if (!cafeId) return { hata: "Başvuru seçilmedi" };
  if (sebep.length < 5) return { hata: "Ret gerekçesi yaz — başvuran ne düzelteceğini bilmeli" };

  await reddet(cafeId, o.ozneId, sebep.slice(0, 300));
  revalidatePath("/platform/basvurular");
  return { bilgi: "Reddedildi." };
}
