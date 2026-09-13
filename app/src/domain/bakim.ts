import { ISLER } from "./isler";
import { log } from "@/lib/log";

/**
 * Bakım köprüsü — arka plan işlerini çalıştırır.
 *
 * ── Neden burada, neden zamanlanmış iş değil ────────────────
 *
 * `bekleyenleriAc` ve `sureDolanlariSupur` Faz 7'de yazıldı ama **hiçbir
 * yerden çağrılmıyordu.** Sonucu iki gerçek arıza: ertelenmiş kupon sonsuza
 * kadar `pending` kalıyordu, ve süresi dolan kuponun rezervasyonu bütçeye
 * **hiç geri dönmüyordu** (E11).
 *
 * Birincisi artık burada değil, okuma tarafında çözülü: kuponun hâline
 * `status` kolonu değil **zaman** karar veriyor. Yani bakım gecikse bile
 * oyuncu kuponunu kullanabiliyor. Bu bilinçli: **para yolundaki doğruluk
 * arka plan işine bağlanmaz.**
 *
 * Gerçek zamanlanmış iş **Faz 10'un maddesi**. Burası o iş gelene kadarki
 * köprü: bütçenin okunduğu ve envanterin açıldığı ekranlarda çalışıyor.
 *
 * ⚠️ Köprünün bilinen bedeli: **kimse ekran açmazsa işler gecikir.**
 * Hatırlatma SMS'i bir sonraki ziyarete kadar bekleyebilir; temizlik ve
 * silme birkaç saat gecikebilir. Hiçbiri para yolunda değil.
 *
 * ── Ü113: liste artık kayıt defterinden geliyor ─────────────
 *
 * İşler tek tek elle çağrılıyordu ve dört kez bir iş yazılıp bağlanmadan
 * kaldı. Artık `domain/isler.ts` geziliyor; bağlamayı unutmak, işi hiç
 * yazmamak kadar görünür.
 *
 * ── ⚠️ Her işin KENDİ hatası, kendi aralığı ────────────────
 *
 * Eskiden bütün işler **tek bir `try` bloğundaydı**: ilk patlayan iş,
 * sonrakilerin hepsini durduruyordu — Happy Hour programı hata verdiğinde
 * bütçe iadesi de, hatırlatma da hiç koşmuyordu. Artık her iş kendi
 * hatasını yutuyor ve sıradaki koşmaya devam ediyor.
 *
 * Aralık da iş başına: temizlik işleri saatlik/günlük, kupon işleri
 * dakikalık. Her dakika `DELETE` taramanın kimseye faydası yok.
 */

/** İş adı → son koşu zamanı (ms). */
const sonKosu = new Map<string, number>();

export async function bakim(): Promise<void> {
  const simdi = Date.now();
  const yapilan: Record<string, number> = {};

  for (const is of ISLER) {
    const gecen = simdi - (sonKosu.get(is.ad) ?? 0);
    if (gecen < is.aralikDk * 60_000) continue;

    // Beklemeden işaretle: aynı anda gelen ikinci istek tekrar başlatmasın.
    sonKosu.set(is.ad, simdi);

    try {
      const adet = await is.calistir();
      if (adet) yapilan[is.ad] = adet;
    } catch (hata) {
      // Bakım bir yan iş. Başarısız olursa sayfa yine de açılmalı; ekranın
      // çökmesi, gecikmiş bir bütçe iadesinden çok daha kötü.
      log.warn("bakim isi basarisiz", { is: is.ad, hata: String(hata).slice(0, 200) });
    }
  }

  if (Object.keys(yapilan).length) log.info("bakim", yapilan);
}

/** Test için: son koşu kayıtlarını sıfırlar. */
export function sifirla(): void {
  sonKosu.clear();
}
