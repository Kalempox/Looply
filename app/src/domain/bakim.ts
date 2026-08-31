import { bekleyenleriAc, sureDolanlariSupur } from "./kupon";
import { gonderilecekleriGonder } from "./hatirlatma";
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
 *   · Ertelenmiş kupon (Ü28: eşiğin üstündeki ödül 24 saat sonra açılır) satırda
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
 * ⚠️ Kupon hatırlatmaları da buradan gidiyor ve bunun bir bedeli var:
 * **kimse ekran açmazsa hatırlatma gecikir.** Kuponun kendisi gecikmiyor
 * (yukarıdaki gerekçe), ama SMS bir sonraki ziyarete kadar bekleyebilir.
 * Gerçek zamanlanmış iş geldiğinde ilk taşınacak şey bu.
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
    // Kupon açıldıktan SONRA hatırlatma: sıra tersine dönerse aynı koşuda
    // açılan kupon bir sonraki koşuyu bekler ve mesaj bir dakika gecikir.
    const hatirlatma = await gonderilecekleriGonder();
    // Süresi dolan davet, "sürüyor" sayacını sonsuza kadar şişik tutar
    // (Faz 9). Aynı gerekçe, aynı köprü.
    const davet = await sureDolanlariKapat();
    if (acilan || dolan || davet || hatirlatma.acilan || hatirlatma.suresiDolan) {
      log.info("bakim", {
        acilan,
        dolan,
        davet,
        hatirlatmaAcilan: hatirlatma.acilan,
        hatirlatmaSonGun: hatirlatma.suresiDolan,
      });
    }
  } catch (hata) {
    log.warn("bakim basarisiz", { hata: String(hata) });
  }
}
