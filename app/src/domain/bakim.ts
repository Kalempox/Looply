import { bekleyenleriAc, sureDolanlariSupur } from "./kupon";
import { sureDolanlariKapat } from "./davet";
import { log } from "@/lib/log";

/**
 * Bakım köprüsü — ertelenmiş kuponları açar, süresi dolan kupon ve davetleri
 * kapatır.
 *
 * ── Neden burada, neden zamanlanmış iş değil ────────────────
 *
 * `bekleyenleriAc` ve `sureDolanlariSupur` Faz 7'de yazıldı ama **hiçbir
 * yerden çağrılmıyordu.** Sonucu iki gerçek arıza:
 *
 *   · Ertelenmiş kupon (Ü28: eşiğin üstündeki ödül 12 saat sonra açılır) satırda
 *     sonsuza kadar `pending` kalıyordu.
 *   · Süresi dolan kuponun rezervasyonu bütçeye **hiç geri dönmüyordu** —
 *     kafenin dağıtılabilir bütçesi sessizce eriyordu (E11).
 *
 * Birincisi artık burada değil, okuma tarafında çözülü: kuponun hâline
 * `status` kolonu değil **zaman** karar veriyor (`domain/odul.ts`
 * `durumBelirle`, `domain/kupon.ts` `coz`/`onayla`). Yani bakım gecikse bile
 * oyuncu kuponunu kullanabiliyor. Bu bilinçli: **para yolundaki doğruluk
 * arka plan işine bağlanmaz.**
 *
 * Geriye ikincisi kalıyor — bütçe muhasebesi ve defterin toparlanması. Onun
 * için gerçek bir zamanlanmış iş gerekiyor ve o **Faz 10'un maddesi**. Burası
 * o iş gelene kadarki köprü: bütçenin okunduğu ve envanterin açıldığı
 * ekranlarda, dakikada en fazla bir kez.
 *
 * ── Hata yutuluyor ─────────────────────────────────────────
 *
 * Bakım bir yan iş. Başarısız olursa sayfa yine de açılmalı; ekranın
 * çökmesi, gecikmiş bir bütçe iadesinden çok daha kötü.
 */

/** İki koşu arasındaki en kısa süre. */
const ARALIK_MS = 60_000;

let sonKosu = 0;

export async function bakim(): Promise<void> {
  const simdi = Date.now();
  if (simdi - sonKosu < ARALIK_MS) return;
  // Beklemeden işaretle: aynı anda gelen ikinci istek tekrar başlatmasın.
  sonKosu = simdi;

  try {
    const acilan = await bekleyenleriAc();
    const dolan = await sureDolanlariSupur();
    // Süresi dolan davet, "sürüyor" sayacını sonsuza kadar şişik tutar
    // (Faz 9). Aynı gerekçe, aynı köprü.
    const davet = await sureDolanlariKapat();
    if (acilan || dolan || davet) log.info("bakim", { acilan, dolan, davet });
  } catch (hata) {
    log.warn("bakim basarisiz", { hata: String(hata) });
  }
}
