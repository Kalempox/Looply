"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { personelEkle, pinDegistir, personelPasiflestir, cihazKaydet } from "@/domain/staff";
import { isimSemasi, pinSemasi, dogrula } from "@/lib/validate";
import { withCafe } from "@/db/context";

export type PersonelDurumu = { hata?: string; bilgi?: string };

const eklemeSemasi = z.object({ ad: isimSemasi, pin: pinSemasi });

/** Basit PIN'ler kabul edilmez — 4 hane zaten dar, bir de tahmin edilebilir olmasın. */
const ZAYIF_PINLER = new Set([
  "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
  "1234", "4321", "1212", "2121", "0123", "1122",
]);

/**
 * Yönetici, yalnızca KENDİ kafesinin personelini yönetebilir.
 * `cafeId` oturumdan geliyor; hiçbir eylem onu formdan okumuyor.
 */
async function kendiPersoneliMi(cafeId: string, staffId: string): Promise<boolean> {
  const r = await withCafe(cafeId, (db) =>
    db.one(`SELECT 1 FROM staff WHERE id = $1`, [staffId]),
  );
  return !!r;
}

export async function personelEkleEylemi(
  _onceki: PersonelDurumu,
  form: FormData,
): Promise<PersonelDurumu> {
  const o = await kafeYoneticisiGerekli();

  const sonuc = dogrula(eklemeSemasi, {
    ad: String(form.get("ad") ?? ""),
    pin: String(form.get("pin") ?? ""),
  });
  if (!sonuc.ok) return { hata: Object.values(sonuc.hatalar)[0] };

  if (ZAYIF_PINLER.has(sonuc.veri.pin)) {
    return { hata: "Bu PIN çok kolay tahmin edilir. Başka bir dörtlü seç." };
  }

  await personelEkle({
    cafeId: o.cafeId,
    ad: sonuc.veri.ad,
    pin: sonuc.veri.pin,
    ekleyenId: o.ozneId,
  });

  revalidatePath("/kafe/panel/personel");
  return { bilgi: `${sonuc.veri.ad} eklendi. PIN'i kendisine ilet.` };
}

export async function pinDegistirEylemi(
  _onceki: PersonelDurumu,
  form: FormData,
): Promise<PersonelDurumu> {
  const o = await kafeYoneticisiGerekli();
  const staffId = String(form.get("staffId") ?? "");

  if (!(await kendiPersoneliMi(o.cafeId, staffId))) return { hata: "Personel bulunamadı" };

  const sonuc = dogrula(pinSemasi, String(form.get("pin") ?? ""));
  if (!sonuc.ok) return { hata: "PIN 4 rakamdır" };
  if (ZAYIF_PINLER.has(sonuc.veri)) {
    return { hata: "Bu PIN çok kolay tahmin edilir. Başka bir dörtlü seç." };
  }

  await pinDegistir(staffId, sonuc.veri, o.ozneId);
  revalidatePath("/kafe/panel/personel");
  return { bilgi: "PIN değiştirildi." };
}

export async function pasiflestirEylemi(
  _onceki: PersonelDurumu,
  form: FormData,
): Promise<PersonelDurumu> {
  const o = await kafeYoneticisiGerekli();
  const staffId = String(form.get("staffId") ?? "");

  if (!(await kendiPersoneliMi(o.cafeId, staffId))) return { hata: "Personel bulunamadı" };
  if (staffId === o.ozneId) return { hata: "Kendi hesabını kapatamazsın" };

  await personelPasiflestir(staffId, o.ozneId);
  revalidatePath("/kafe/panel/personel");
  return { bilgi: "Personel kapatıldı ve açık oturumları düşürüldü." };
}

export async function cihazKaydetEylemi(
  _onceki: PersonelDurumu,
  form: FormData,
): Promise<PersonelDurumu> {
  const o = await kafeYoneticisiGerekli();

  const etiket = String(form.get("etiket") ?? "").trim();
  const cihazId = String(form.get("cihazId") ?? "").trim();
  if (etiket.length < 2) return { hata: "Cihaza bir ad ver (örn. Kasa tableti)" };
  if (cihazId.length < 8) return { hata: "Cihaz kimliği okunamadı. Sayfayı yenileyip tekrar dene." };

  await cihazKaydet({ cafeId: o.cafeId, etiket, cihazId, kaydedenId: o.ozneId });
  revalidatePath("/kafe/panel/personel");
  return { bilgi: `${etiket} kaydedildi. Kasiyer artık bu cihazdan PIN'le girebilir.` };
}
