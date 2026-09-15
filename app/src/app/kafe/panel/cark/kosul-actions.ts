"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as kosul from "@/domain/cark-kosul";

export type KosulDurumu = { hata?: string; bilgi?: string };

/**
 * Çark koşulu ekleme — Ü137.
 *
 * ⚠️ `cafeId` ve `aktorId` **oturumdan** (Değişmez kural #3). Formdan
 * gelselerdi bir yönetici başka işletmenin çark koşulunu değiştirir ve
 * o işletmenin bütçesinden para dağıtırdı.
 *
 * ⚠️ Doğrulama alan katmanında (`cark-kosul.ekle`), burada değil.
 * İkisinde de yazsaydık biri gevşediğinde diğeri fark edilmezdi.
 */
export async function kosulEkleEylemi(
  _onceki: KosulDurumu,
  form: FormData,
): Promise<KosulDurumu> {
  const o = await kafeYoneticisiGerekli();

  const tur = String(form.get("tur") ?? "") as kosul.KosulTuru;
  if (!["tutar", "urun", "gunluk", "ilk_gelen"].includes(tur)) {
    return { hata: "Koşul türü seç." };
  }

  const tl = Number(String(form.get("esik") ?? "").replace(",", "."));
  const adet = Number(form.get("adet"));

  const sonuc = await kosul.ekle({
    cafeId: o.cafeId,
    tur,
    esikKurus: Number.isFinite(tl) ? Math.round(tl * 100) : undefined,
    urunId: String(form.get("urunId") ?? "") || undefined,
    adet: Number.isFinite(adet) ? adet : undefined,
    aktorId: o.ozneId,
  });

  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/cark");
  return { bilgi: "Koşul eklendi." };
}

export async function kosulDurumEylemi(
  kosulId: string,
  aktif: boolean,
): Promise<{ ok: boolean; hata?: string }> {
  const o = await kafeYoneticisiGerekli();

  const sonuc = await kosul.durumDegistir({
    cafeId: o.cafeId,
    kosulId,
    aktif,
    aktorId: o.ozneId,
  });

  revalidatePath("/kafe/panel/cark");
  return sonuc.ok ? { ok: true } : { ok: false, hata: sonuc.hata };
}
