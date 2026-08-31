"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import * as oturum from "@/domain/session";
import * as masa from "@/domain/masa";
import { dogrula } from "@/lib/validate";

/**
 * Konum doğrulaması (K2).
 *
 * Koordinat sunucuya gelir, kafeye uzaklık hesaplanır, **koordinat atılır**
 * ve yalnızca metre saklanır (G10).
 */

const konumSemasi = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type KonumCevabi =
  | { durum: "dogrulandi"; mesafeM: number }
  | { durum: "uzak"; mesafeM: number }
  | { durum: "olmadi" }
  /**
   * Kafenin konumu hiç belirlenmemiş.
   *
   * Oyuncunun yapabileceği bir şey yok ve "konum doğrulanamadı" demek onu
   * telefonuyla uğraştırırdı. Eksik olan kafenin kurulumu; ekran bunu
   * olduğu gibi söylüyor.
   */
  | { durum: "kafe_konumu_yok" };

export async function konumBildir(lat: number, lng: number): Promise<KonumCevabi> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const girdi = dogrula(konumSemasi, { lat, lng });
  if (!girdi.ok) return { durum: "olmadi" };

  const sonuc = await masa.konumDogrula(o.ozneId, girdi.veri.lat, girdi.veri.lng);
  revalidatePath("/oyna");

  if (sonuc.durum === "dogrulandi") return { durum: "dogrulandi", mesafeM: sonuc.mesafeM };
  if (sonuc.durum === "uzak") return { durum: "uzak", mesafeM: sonuc.mesafeM };
  if (sonuc.durum === "kafe_konumu_yok") return { durum: "kafe_konumu_yok" };
  return { durum: "olmadi" };
}

/** Kullanıcı izni reddetti — hata değil, normal bir durum. */
export async function konumReddedildi(): Promise<void> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return;
  await masa.konumReddedildi(o.ozneId);
  revalidatePath("/oyna");
}

export async function cikisYap(): Promise<void> {
  await oturum.kapat("kullanici_cikisi");
  redirect("/giris");
}
