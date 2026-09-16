import { config } from "dotenv";

/**
 * Betikler için ortam yükleyici.
 *
 * Next.js .env.local'i kendisi yükler; komut satırından çalışan betikler
 * (göç, tohum, testler) yüklemez. Bu dosya her betiğin ilk satırında
 * import edilir.
 */
config({ path: ".env.local", quiet: true });

/**
 * Tohum kapısı — sahte veri üreten betiklerin canlı ortam kilidi.
 *
 * ── Neden gerekti ───────────────────────────────────────────
 *
 * `db:demo` bilinen bir paroladan hesap açıyor (`tohum-demo-oyuncu.ts`),
 * `db:butik` ve `db:seed` de sahte işletme ve sahte oyuncu yazıyor.
 * Üçü de `DATABASE_URL`'in nereyi gösterdiğine hiç bakmıyordu: canlı
 * bağlantı açıkken çalıştırılan tek komut, canlı veritabanına parolası
 * herkesçe bilinen bir hesap düşürürdü.
 *
 * ⚠️ **Bu, listenin kendi kuralının çiğnenmesiydi.** `docs/23`'ün Dalga 5
 * maddesi tam bu adı (`npm run db:demo`) *"canlı veritabanında çalışmayı
 * reddeder"* şartıyla ayırmıştı; Ü144 adı aldı, şartı almadı.
 *
 * ── Neden import değil çağrı ────────────────────────────────
 *
 * Bu dosyayı **bütün** betikler import ediyor, göç (`db:migrate`) ve
 * yedek (`db:backup`) dahil — ve onların canlıda çalışması **gerekiyor**.
 * Kapı bu yüzden import anında değil, yalnızca çağıran betikte kapanıyor.
 *
 * ── Neden beyan değil hata ──────────────────────────────────
 *
 * Ü81'in kuralı: sahte sağlayıcı canlıda uyarı vermez, **uygulamayı
 * başlatmaz**. Bir uyarı satırı kaydırılıp geçilir; fırlatılan hata
 * geçilmez. `simulasyon.ts` (`db:simule`) bunu baştan doğru yapıyordu,
 * bu yalnızca aynı örüntünün ortak hâli.
 */
export function tohumKapisi(ne: string): void {
  if (process.env.APP_ENV === "production") {
    throw new Error(
      `${ne} canlı ortamda çalıştırılamaz — sahte veri üretir. ` +
        `APP_ENV=production. Devam etmek istiyorsan bağlantının hangi ` +
        `veritabanını gösterdiğini bir daha kontrol et.`,
    );
  }
}
