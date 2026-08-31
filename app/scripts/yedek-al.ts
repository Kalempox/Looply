import "./_env";
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { createCipheriv, randomBytes } from "node:crypto";
import path from "node:path";
import { env } from "@/lib/env";

/**
 * Yedek alma — G15.
 *
 * Sızıntıların en yaygın yolu canlı veritabanı değil, korumasız yedek:
 * canlı sistemin tüm verisini taşır ama korumalarının hiçbirine sahip değildir.
 *
 * Bu yüzden yedek dosyası şifreleniyor ve anahtarı `PII_ENC_KEY`'den AYRI.
 * Satırlar zaten şifreli (telefon, ad, soyad); yedeğin ayrıca şifrelenmesi
 * savunma derinliği — dosya sızarsa saldırganın elinde iki anahtar eksik kalır.
 *
 * Saklama: 30 gün. Daha uzunu "sildik" beyanını yalan yapar (docs/08 §6).
 */

const YEDEK_DIZINI = path.join(process.cwd(), "yedekler");
const SAKLAMA_GUNU = 30;

function pgDump(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const p = spawn(
      "docker",
      ["compose", "exec", "-T", "db", "pg_dump", "-U", "cafeplay_admin", "-d", "cafeplay"],
      { cwd: process.cwd() },
    );

    const parcalar: Buffer[] = [];
    const hata: Buffer[] = [];
    p.stdout.on("data", (d) => parcalar.push(d));
    p.stderr.on("data", (d) => hata.push(d));

    p.on("close", (kod) => {
      if (kod === 0) resolve(Buffer.concat(parcalar));
      else reject(new Error(`pg_dump başarısız (${kod}): ${Buffer.concat(hata).toString()}`));
    });
    p.on("error", reject);
  });
}

/** [nonce:12][şifreli gövde][etiket:16] */
function sifrele(veri: Buffer): Buffer {
  const anahtar = Buffer.from(env().BACKUP_ENC_KEY, "base64");
  const nonce = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", anahtar, nonce);
  return Buffer.concat([nonce, c.update(veri), c.final(), c.getAuthTag()]);
}

function eskileriTemizle(): number {
  const sinir = Date.now() - SAKLAMA_GUNU * 86_400_000;
  let silinen = 0;
  for (const dosya of readdirSync(YEDEK_DIZINI)) {
    if (!dosya.endsWith(".sql.enc")) continue;
    const damga = Date.parse(dosya.slice(0, 19).replace(/_/g, ":"));
    if (Number.isFinite(damga) && damga < sinir) {
      unlinkSync(path.join(YEDEK_DIZINI, dosya));
      silinen++;
    }
  }
  return silinen;
}

async function main() {
  mkdirSync(YEDEK_DIZINI, { recursive: true });

  const ham = await pgDump();
  const sifreli = sifrele(ham);

  const damga = new Date().toISOString().slice(0, 19).replace(/:/g, "_");
  const yol = path.join(YEDEK_DIZINI, `${damga}.sql.enc`);
  writeFileSync(yol, sifreli);

  const silinen = eskileriTemizle();

  console.log(`✓ Yedek alındı`);
  console.log(`  Dosya    ${path.basename(yol)}`);
  console.log(`  Ham      ${(ham.length / 1024).toFixed(1)} KB`);
  console.log(`  Şifreli  ${(sifreli.length / 1024).toFixed(1)} KB (AES-256-GCM, ayrı anahtar)`);
  if (silinen) console.log(`  ${silinen} eski yedek silindi (${SAKLAMA_GUNU} gün saklama)`);
  console.log(`\n  Bu yedek geri yüklenebilir mi? → npm run db:restore-drill`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
