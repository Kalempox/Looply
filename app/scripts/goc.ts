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

migrate()
  .then(async ({ applied, skipped }) => {
    if (applied.length === 0) console.log(`Şema güncel (${skipped} göç uygulanmış).`);
    else console.log(`\n${applied.length} göç uygulandı.`);
    await closePools();
  })
  .catch(async (err) => {
    console.error("\n" + (err instanceof Error ? err.message : String(err)));
    await closePools();
    process.exit(1);
  });
