import { env } from "@/lib/env";

/**
 * Defterin açık olma şartı — `sms/index.ts`'teki `kodEkrandaGosterilir()`
 * ile aynı. Oradan almıyoruz çünkü döngüsel içe aktarma oluşurdu.
 */
function acikMi(): boolean {
  return env().APP_ENV !== "production" && env().SMS_PROVIDER === "console";
}

/**
 * Geliştirme defteri — test sırasında ne olduğunu görmek için.
 *
 * Doğrulama kodu hiçbir yerde saklanmıyor (docs/08 §7.1): ne veritabanında,
 * ne logda, ne giden mesaj defterinde. Bu da test etmeyi zorlaştırıyordu —
 * özellikle kod hiç gönderilmediğinde (kayıtsız numara, kota, tavan) neden
 * gönderilmediği görünmüyordu.
 *
 * Bu defter **yalnızca bellekte** duruyor, sunucu yeniden başlayınca siliniyor
 * ve canlı ortamda hiç dolmuyor: `kodEkrandaGosterilir()` iki şart birden
 * arıyor (APP_ENV canlı değil **ve** sahte SMS sağlayıcısı), ikisi canlıda
 * birlikte sağlanamıyor.
 */

export type DefterKaydi = {
  zaman: string;
  telefon: string;
  /** Hangi ekrandan geldi — aynı numara farklı akışlarda farklı sonuç verir */
  nereden: string;
  olay: string;
  kod?: string;
  not?: string;
};

const SINIR = 30;

declare global {
  var __looplyGelistirmeDefteri: DefterKaydi[] | undefined;
}

function defter(): DefterKaydi[] {
  return (globalThis.__looplyGelistirmeDefteri ??= []);
}

export function defteriYaz(kayit: Omit<DefterKaydi, "zaman">): void {
  if (!acikMi()) return;
  const d = defter();
  d.unshift({ ...kayit, zaman: new Date().toISOString() });
  if (d.length > SINIR) d.length = SINIR;
}

export function defteriOku(): DefterKaydi[] {
  return acikMi() ? [...defter()] : [];
}

export function defteriTemizle(): void {
  defter().length = 0;
}
