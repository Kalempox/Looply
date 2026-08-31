import "./_env";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createDecipheriv } from "node:crypto";
import path from "node:path";
import { env } from "@/lib/env";

/**
 * Geri yükleme tatbikatı — G15.
 *
 * > Geri yüklenemeyen yedek, yedek sayılmaz.
 *
 * Bu betik yedeği gerçekten geri yükler: ayrı bir veritabanı oluşturur,
 * şifreli yedeği çözüp içine basar, satır sayılarını doğrular ve
 * veritabanını siler. Beyan değil, kanıt.
 *
 * Ayda bir çalıştırılmalı (docs/08 §6.1).
 */

const YEDEK_DIZINI = path.join(process.cwd(), "yedekler");
const TATBIKAT_DB = "cafeplay_tatbikat";

function psql(args: string[], stdin?: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn("docker", ["compose", "exec", "-T", "db", "psql", ...args], { cwd: process.cwd() });

    const cikti: Buffer[] = [];
    const hata: Buffer[] = [];
    p.stdout.on("data", (d) => cikti.push(d));
    p.stderr.on("data", (d) => hata.push(d));

    p.on("close", (kod) => {
      if (kod === 0) resolve(Buffer.concat(cikti).toString());
      else reject(new Error(`psql (${kod}): ${Buffer.concat(hata).toString().slice(0, 400)}`));
    });
    p.on("error", reject);

    if (stdin) p.stdin.write(stdin);
    p.stdin.end();
  });
}

function coz(sifreli: Buffer): Buffer {
  const anahtar = Buffer.from(env().BACKUP_ENC_KEY, "base64");
  const nonce = sifreli.subarray(0, 12);
  const etiket = sifreli.subarray(sifreli.length - 16);
  const govde = sifreli.subarray(12, sifreli.length - 16);

  const d = createDecipheriv("aes-256-gcm", anahtar, nonce);
  d.setAuthTag(etiket);
  return Buffer.concat([d.update(govde), d.final()]);
}

function sonYedek(): string {
  const dosyalar = readdirSync(YEDEK_DIZINI)
    .filter((f) => f.endsWith(".sql.enc"))
    .sort();
  if (dosyalar.length === 0) throw new Error("Hiç yedek yok — önce: npm run db:backup");
  return path.join(YEDEK_DIZINI, dosyalar[dosyalar.length - 1]);
}

async function main() {
  const yol = sonYedek();
  console.log(`Tatbikat: ${path.basename(yol)}\n`);

  console.log("  1. Şifre çözülüyor…");
  const sql = coz(readFileSync(yol));
  console.log(`     ✓ ${(sql.length / 1024).toFixed(1)} KB çözüldü — anahtar doğru`);

  console.log("  2. Tatbikat veritabanı oluşturuluyor…");
  await psql(["-U", "cafeplay_admin", "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${TATBIKAT_DB}`]);
  await psql(["-U", "cafeplay_admin", "-d", "postgres", "-c", `CREATE DATABASE ${TATBIKAT_DB}`]);
  console.log(`     ✓ ${TATBIKAT_DB}`);

  console.log("  3. Yedek geri yükleniyor…");
  await psql(["-U", "cafeplay_admin", "-d", TATBIKAT_DB, "-q"], sql);
  console.log("     ✓ yüklendi");

  console.log("  4. Doğrulanıyor…");
  const kontroller = [
    ["cafes", 2],
    ["players", 1],
    ["cafe_tables", 18],
    ["coupons", 2],
    ["budget_periods", 2],
  ] as const;

  let hataSayisi = 0;
  for (const [tablo, beklenen] of kontroller) {
    const cikti = await psql([
      "-U", "cafeplay_admin", "-d", TATBIKAT_DB, "-t", "-A",
      "-c", `SELECT count(*) FROM ${tablo}`,
    ]);
    const bulunan = Number(cikti.trim());
    const ok = bulunan === beklenen;
    if (!ok) hataSayisi++;
    console.log(`     ${ok ? "✓" : "✗"} ${tablo.padEnd(16)} ${bulunan} satır (beklenen ${beklenen})`);
  }

  console.log("  5. Tatbikat veritabanı siliniyor…");
  await psql(["-U", "cafeplay_admin", "-d", "postgres", "-c", `DROP DATABASE ${TATBIKAT_DB}`]);
  console.log("     ✓ silindi");

  if (hataSayisi > 0) {
    console.error(`\n✗ TATBİKAT BAŞARISIZ — ${hataSayisi} tablo beklenen satır sayısını tutturmadı`);
    process.exit(1);
  }
  console.log(`\n✓ Tatbikat başarılı. Bu yedek geri yüklenebilir.`);
}

main().catch((e) => {
  console.error("\n✗ TATBİKAT BAŞARISIZ:", e instanceof Error ? e.message : e);
  process.exit(1);
});
