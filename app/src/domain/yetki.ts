import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import type { Oturum } from "@/domain/session";

/**
 * Sayfa ve eylem girişlerinde yetki kontrolü.
 *
 * Değişmez #3: `cafe_id` istekten OKUNMAZ, oturumdan gelir. Bu dosyadan
 * dönen `cafeId` her sorgunun kiracı anahtarıdır; sayfa parametresinden
 * gelen bir kafe kimliği hiçbir yerde kullanılmaz.
 */

export type KafeOturumu = Oturum & { cafeId: string };

export async function kafeYoneticisiGerekli(): Promise<KafeOturumu> {
  const o = await oturum.oku();
  if (!o || o.rol !== "kafe_yoneticisi" || !o.cafeId) redirect("/kafe/giris");
  return o as KafeOturumu;
}

export async function kasiyerGerekli(): Promise<KafeOturumu> {
  const o = await oturum.oku();
  if (!o || o.rol !== "kasiyer" || !o.cafeId) redirect("/kasa/giris");
  return o as KafeOturumu;
}

/**
 * Platform erişimi.
 *
 * G9: `platform_destek` günlük işi yapar ama kişisel veri göremez.
 * Kişisel veri gerektiren ekranlar `sadeceAdmin` ile korunur.
 */
export async function platformGerekli(sadeceAdmin = false): Promise<Oturum> {
  const o = await oturum.oku();
  if (!o || (o.rol !== "platform_admin" && o.rol !== "platform_destek")) {
    redirect("/platform/giris");
  }
  if (sadeceAdmin && o.rol !== "platform_admin") redirect("/platform?yetkisiz=1");
  return o;
}
