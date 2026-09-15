import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
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
 *
 * ── Veri adımı: `.sql` yanında `.ts` (Ü115) ─────────────────
 *
 * Bazı göçler SQL'in **yapamayacağı** bir dönüşüm istiyor. En keskin
 * örneği şifreleme: `PII_ENC_KEY` bilerek veritabanının dışında duruyor,
 * yani Postgres'in elinde anahtar yok ve `UPDATE ... SET x = şifrele(y)`
 * diye bir SQL yazılamıyor.
 *
 * Çözüm: aynı adı taşıyan bir `.ts` dosyası. Varsa **aynı işlemin
 * içinde**, SQL'deki `-- @veri-adimi` satırının yerinde çalışır:
 *
 *     0035_x.sql (marker'a kadar)  →  0035_x.ts  →  0035_x.sql (kalanı)
 *
 * Üçü tek BEGIN/COMMIT arasında. Ortadaki adım patlarsa şema da geri
 * alınır — "kolonu ekledim ama doldurmadım" diye bir ara durum yok.
 *
 * Marker yoksa `.ts` SQL'in tamamından sonra çalışır. `.ts` yokken marker
 * bulunursa hata verilir: göçün yarısı sessizce atlanmasın.
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "src/db/migrations");

/** SQL'in neresinde veri adımının çalışacağını söyleyen satır. */
const VERI_ADIMI = /^[ \t]*--[ \t]*@veri-adimi[ \t]*$/m;

type VeriAdimi = (client: PoolClient) => Promise<void>;

async function ensureTable() {
  await adminPool().query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

/**
 * Eşlikçi `.ts` dosyasını yükleyip çalıştırır.
 *
 * Dosya **tek bir varsayılan dışa aktarım** vermeli: işlem istemcisini alan
 * bir async fonksiyon. Başka bir şey dönerse hata veriyoruz — sessizce
 * atlanan bir veri adımı, bu depoda dört kez yaşanmış "yazıldı ama
 * bağlanmadı" arızasının aynısı olurdu.
 */
async function veriAdimi(dosya: string, gocAdi: string, client: PoolClient): Promise<void> {
  const modul = (await import(pathToFileURL(dosya).href)) as { default?: unknown };
  if (typeof modul.default !== "function") {
    throw new Error(
      `${gocAdi}: ${path.basename(dosya)} varsayılan dışa aktarım olarak bir fonksiyon vermiyor.\n` +
        `Beklenen: export default async function (client) { ... }`,
    );
  }
  await (modul.default as VeriAdimi)(client);
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
    const veriDosyasi = path.join(MIGRATIONS_DIR, file.replace(/\.sql$/, ".ts"));
    const veriKaynagi = existsSync(veriDosyasi) ? readFileSync(veriDosyasi, "utf8") : "";

    // Veri adımı da özete giriyor — yoksa `.ts` uygulandıktan sonra
    // sessizce düzenlenebilirdi. Eşlikçisi olmayan göçlerde boş metin
    // eklenmesi özeti değiştirmiyor: eski kayıtlar geçerli kalıyor.
    const checksum = createHash("sha256").update(sql).update(veriKaynagi).digest("hex").slice(0, 16);

    const onceki = uygulanmis.get(file);
    if (onceki) {
      if (onceki !== checksum) {
        // Özet `.sql` ve varsa `.ts` üzerinden hesaplanıyor; ikisinden
        // hangisinin değiştiğini bilmiyoruz, bu yüzden ikisini de adıyla
        // söylüyoruz — "sql'e dokunmadım ki" diye aranmasın.
        const nerede = veriKaynagi ? `${file} veya ${path.basename(veriDosyasi)}` : file;
        throw new Error(
          `Göç dosyası uygulandıktan sonra değiştirilmiş: ${nerede}\n` +
            `Uygulanmış göç düzenlenmez — yeni bir göç dosyası ekle.`,
        );
      }
      skipped++;
      continue;
    }

    const parcalar = sql.split(VERI_ADIMI);
    if (parcalar.length > 2) {
      throw new Error(`${file}: "-- @veri-adimi" birden fazla kez yazılmış. Veri adımı tektir.`);
    }
    const [once, sonra] = parcalar;
    if (sonra !== undefined && !veriKaynagi) {
      throw new Error(
        `${file}: "-- @veri-adimi" yazıyor ama yanında ${path.basename(veriDosyasi)} yok.\n` +
          `Göçün ikinci yarısı veri adımına bağlı; eşlikçi olmadan çalıştırılamaz.`,
      );
    }

    const client = await adminPool().connect();
    try {
      await client.query("BEGIN");
      await client.query(once);
      if (veriKaynagi) {
        await veriAdimi(veriDosyasi, file, client);
        if (sonra) await client.query(sonra);
      }
      await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [
        file,
        checksum,
      ]);
      await client.query("COMMIT");
      applied.push(file);
      console.log(`  ✓ ${file}${veriKaynagi ? " (+ veri adımı)" : ""}`);
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
