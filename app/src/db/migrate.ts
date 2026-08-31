import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { adminPool, closePools } from "./pool";

/**
 * Göç (migration) çalıştırıcı.
 *
 * Dosya adına göre sıralı çalışır, her göç kendi işleminde yürür ve
 * içeriğinin özeti kaydedilir. Uygulanmış bir göç dosyası sonradan
 * değiştirilirse hata verir — canlıda çalışan şema ile depodaki dosya
 * sessizce ayrışmasın.
 *
 * Yönetici rolüyle bağlanır (tablo sahibi). Uygulama bu bağlantıyı
 * hiçbir zaman kullanmaz.
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "src/db/migrations");

async function ensureTable() {
  await adminPool().query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function migrate(): Promise<{ applied: string[]; skipped: number }> {
  await ensureTable();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows } = await adminPool().query<{ name: string; checksum: string }>(
    "SELECT name, checksum FROM schema_migrations",
  );
  const uygulanmis = new Map(rows.map((r) => [r.name, r.checksum]));

  const applied: string[] = [];
  let skipped = 0;

  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex").slice(0, 16);

    const onceki = uygulanmis.get(file);
    if (onceki) {
      if (onceki !== checksum) {
        throw new Error(
          `Göç dosyası uygulandıktan sonra değiştirilmiş: ${file}\n` +
            `Uygulanmış göç düzenlenmez — yeni bir göç dosyası ekle.`,
        );
      }
      skipped++;
      continue;
    }

    const client = await adminPool().connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [
        file,
        checksum,
      ]);
      await client.query("COMMIT");
      applied.push(file);
      console.log(`  ✓ ${file}`);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.error(`  ✗ ${file}`);
      throw err;
    } finally {
      client.release();
    }
  }

  return { applied, skipped };
}

// Doğrudan çalıştırıldığında
if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  migrate()
    .then(({ applied, skipped }) => {
      if (applied.length === 0) console.log(`Şema güncel (${skipped} göç uygulanmış).`);
      else console.log(`${applied.length} göç uygulandı.`);
      return closePools();
    })
    .catch(async (err) => {
      console.error(err instanceof Error ? err.message : err);
      await closePools();
      process.exit(1);
    });
}
