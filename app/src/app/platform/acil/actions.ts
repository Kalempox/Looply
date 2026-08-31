"use server";

import { revalidatePath } from "next/cache";
import { platformGerekli } from "@/domain/yetki";
import { cevir, kafeAskiya, tumOturumlariIptal } from "@/domain/acil";

/**
 * Acil durdurma eylemleri — G18.
 *
 * Dördü de **yalnızca `platform_admin`**. G9 gereği `platform_destek`
 * günlük işi yapar; kafeyi askıya almak veya herkesi sistemden çıkarmak
 * günlük iş değil.
 *
 * ⚠️ Açık soru: gerçek bir olayda nöbette yönetici yoksa ne olacak?
 * `10-olay-mudahale-plani.md` "kim durdurabilir" sorusunu tek bir isme
 * bağlamayı istiyor. Yetkinin ikinci bir kişiye nasıl devredileceği
 * karara bağlanmadı — Faz 10 sertleştirme kalemi.
 */

export type AcilDurumu = { hata?: string; bilgi?: string };

/** Gerekçe zorunlu: kayıt "ne oldu" sorusuna cevap veremiyorsa kayıt değildir. */
function gerekce(form: FormData): string | null {
  const s = String(form.get("sebep") ?? "").trim();
  return s.length >= 5 ? s.slice(0, 200) : null;
}

export async function anahtarEylemi(
  _onceki: AcilDurumu,
  form: FormData,
): Promise<AcilDurumu> {
  const o = await platformGerekli(true);

  const anahtar = String(form.get("anahtar") ?? "");
  const deger = form.get("deger") === "true";

  const ok = await cevir(anahtar, deger, o.ozneId);
  revalidatePath("/platform/acil");

  if (!ok) return { hata: "Tanınmayan durdurma anahtarı." };
  return { bilgi: deger ? "Durduruldu." : "Yeniden açıldı." };
}

export async function kafeEylemi(_onceki: AcilDurumu, form: FormData): Promise<AcilDurumu> {
  const o = await platformGerekli(true);

  const cafeId = String(form.get("cafeId") ?? "");
  const askiya = form.get("askiya") === "true";
  const sebep = gerekce(form);

  if (!cafeId) return { hata: "Kafe seçilmedi." };
  if (!sebep) return { hata: "Gerekçe yaz — bu kayıt sonradan okunacak." };

  const ok = await kafeAskiya(cafeId, askiya, o.ozneId, sebep);
  revalidatePath("/platform/acil");

  if (!ok) return { hata: "Kafenin durumu beklenenden farklı; sayfayı yenile." };
  return {
    bilgi: askiya
      ? "Kafe askıya alındı. Karekod, panel ve kupon üretimi durdu."
      : "Kafe yeniden açıldı.",
  };
}

export async function oturumEylemi(_onceki: AcilDurumu, form: FormData): Promise<AcilDurumu> {
  const o = await platformGerekli(true);

  const sebep = gerekce(form);
  if (!sebep) return { hata: "Gerekçe yaz — bu kayıt sonradan okunacak." };

  // Onay kutusu: bu düğme kendi oturumunu da kapatıyor.
  if (form.get("onay") !== "evet") {
    return { hata: "Kendi oturumun da kapanacak. Onay kutusunu işaretle." };
  }

  const adet = await tumOturumlariIptal(o.ozneId, sebep);
  revalidatePath("/platform/acil");

  return { bilgi: `${adet} oturum kapatıldı. Sen de dahil — yeniden giriş yapman gerekecek.` };
}
