"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import * as oturum from "@/domain/session";
import * as masa from "@/domain/masa";
import { withBypass } from "@/db/context";
import { kodEkrandaGosterilir } from "@/sms";
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

/**
 * Demo kolaylığı — oyuncuyu kafede sayar.
 *
 * Konum doğrulaması (K2) olmadan hiçbir ödül açılmıyor (Ü3) ve bu, demoyu
 * bilgisayardan göstermeyi imkânsız kılıyor: tarayıcı `navigator.geolocation`
 * izni veriyor olsa bile masa başındaki geliştiricinin konumu kafeye 400 km
 * uzakta.
 *
 * Kural gevşetilmiyor: kafenin **kendi koordinatı** okunup normal
 * `konumDogrula` çağrılıyor, yani mesafe gerçekten hesaplanıyor ve
 * `geo_distance_m` yazılıyor. Değişen tek şey koordinatın nereden geldiği.
 *
 * Canlıda hiçbir koşulda çalışmaz: `kodEkrandaGosterilir()` iki şart birden
 * arıyor (APP_ENV canlı değil **ve** sahte SMS sağlayıcısı) ve `env.ts`
 * canlıda o sağlayıcıyı zaten reddediyor.
 */
export async function demoKafedeSay(): Promise<KonumCevabi> {
  if (!kodEkrandaGosterilir()) return { durum: "olmadi" };

  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const aktif = await masa.aktif(o.ozneId);
  if (!aktif) return { durum: "olmadi" };

  const kafe = await withBypass("demo — kafe koordinatı", (db) =>
    db.one<{ lat: number | null; lng: number | null }>(
      `SELECT lat, lng FROM cafes WHERE id = $1`,
      [aktif.cafeId],
    ),
  );
  if (!kafe || kafe.lat == null || kafe.lng == null) return { durum: "kafe_konumu_yok" };

  const sonuc = await masa.konumDogrula(o.ozneId, kafe.lat, kafe.lng);
  revalidatePath("/oyna");

  return sonuc.durum === "dogrulandi"
    ? { durum: "dogrulandi", mesafeM: sonuc.mesafeM }
    : { durum: "olmadi" };
}
