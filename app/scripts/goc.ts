import "./_env";
import { migrate } from "@/db/migrate";
import { closePools } from "@/db/pool";

/**
 * Göç çalıştırıcının komut satırı girişi.
 *
 * Yönetici rolüyle bağlanır (tablo sahibi). Uygulama bu bağlantıyı
 * çalışma zamanında hiçbir zaman kullanmaz — kullansaydı satır düzeyi
 * güvenliği devre dışı kalırdı.
 */

/**
 * Hatayı okunabilir hâle getirir.
 *
 * ⚠️ Sadece `err.message` yazılıyordu ve bu bir tuzaktı: `pg`, bağlantı
 * kurulamadığında **mesajı boş** bir `AggregateError` fırlatıyor
 * (ECONNREFUSED her adres için ayrı ayrı toplanıyor). Sonuç, veritabanı
 * kapalıyken `npm run db:migrate`in hiçbir şey yazmadan 1 ile çıkmasıydı —
 * "komut çalıştı mı, çalışmadı mı" belli değildi.
 */
function okunabilir(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  if (err.message) return err.message;

  const alt = (err as AggregateError).errors;
  if (Array.isArray(alt) && alt.length) {
    return `${err.name}: ${alt.map((e) => e?.message || e?.code || String(e)).join(", ")}`;
  }
  return err.stack ?? err.name;
}

migrate()
  .then(async ({ applied, skipped }) => {
    if (applied.length === 0) console.log(`Şema güncel (${skipped} göç uygulanmış).`);
    else console.log(`\n${applied.length} göç uygulandı.`);
    await closePools();
  })
  .catch(async (err) => {
    console.error("\n" + okunabilir(err));
    await closePools();
    process.exit(1);
  });
