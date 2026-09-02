"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as urun from "@/domain/urun";
import * as kategori from "@/domain/kategori";

export type UrunDurumu = { hata?: string; bilgi?: string };
export type KategoriDurumu = { hata?: string; bilgi?: string };

export async function ekleEylemi(_onceki: UrunDurumu, form: FormData): Promise<UrunDurumu> {
  const o = await kafeYoneticisiGerekli();

  const ad = String(form.get("ad") ?? "");
  const ham = String(form.get("fiyat") ?? "").replace(/[^\d]/g, "");
  if (!ham) return { hata: "Fiyat gir." };

  // Boş dize "kategori seçilmedi" demek; `null` olarak geçiyor ki
  // yabancı anahtar boş dizeyle karşılaşmasın.
  const kategoriId = String(form.get("kategoriId") ?? "") || null;

  const sonuc = await urun.ekle({
    cafeId: o.cafeId,
    ad,
    fiyatKurus: Number(ham) * 100,
    kategoriId,
    aktorId: o.ozneId,
  });

  revalidatePath("/kafe/panel/urunler");
  return sonuc.ok ? { bilgi: `${sonuc.urun.ad} eklendi.` } : { hata: sonuc.hata };
}

export async function durumEylemi(urunId: string, aktif: boolean): Promise<void> {
  const o = await kafeYoneticisiGerekli();
  await urun.durumDegistir({ cafeId: o.cafeId, urunId, aktif, aktorId: o.ozneId });
  revalidatePath("/kafe/panel/urunler");
}

/* ── Kategori — Ü75 ───────────────────────────────────────── */

export async function kategoriEkleEylemi(
  _onceki: KategoriDurumu,
  form: FormData,
): Promise<KategoriDurumu> {
  const o = await kafeYoneticisiGerekli();

  const sonuc = await kategori.ekle({
    cafeId: o.cafeId,
    ad: String(form.get("ad") ?? ""),
    tur: String(form.get("tur") ?? ""),
    aktorId: o.ozneId,
  });

  revalidatePath("/kafe/panel/urunler");
  return sonuc.ok ? { bilgi: "Kategori eklendi." } : { hata: sonuc.hata };
}

export async function kategoriDurumEylemi(kategoriId: string, aktif: boolean): Promise<void> {
  const o = await kafeYoneticisiGerekli();
  await kategori.durumDegistir({ cafeId: o.cafeId, kategoriId, aktif, aktorId: o.ozneId });
  revalidatePath("/kafe/panel/urunler");
}
