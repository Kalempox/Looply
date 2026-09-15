import type { PoolClient } from "pg";
import { encryptPII } from "@/lib/crypto";

/**
 * Ü115 · A1 — var olan adları şifreler.
 *
 * `0035_personel_adlari_sifreli.sql` içindeki `-- @veri-adimi` satırının
 * yerinde, **aynı işlemin içinde** çalışır: kolonlar eklendikten sonra,
 * düz metin düşürülmeden önce.
 *
 * ── Neden SQL değil ─────────────────────────────────────────
 *
 * `PII_ENC_KEY` sunucunun sır kasasında, veritabanında değil (docs/08
 * §5.1). Postgres anahtarı görmüyor; şifrelemeyi yapabilecek tek yer
 * uygulama. Anahtarın veritabanına konulması bu adımı SQL'e indirirdi ve
 * şifrelemenin tamamını anlamsız kılardı: döküm hem veriyi hem anahtarı
 * taşırdı.
 *
 * ── Boş satır yok ───────────────────────────────────────────
 *
 * `staff.name` ve `platform_users.name` NOT NULL'dı, yani her satırda bir
 * değer var. `cafes` üçlüsü NULL olabiliyor (tohumdan gelen kafelerin
 * başvuru bilgisi yok) — NULL olan NULL kalıyor, boş metin şifrelenmiyor.
 * Aksi hâlde "adres girilmemiş" ile "adresi boş" birbirine karışırdı.
 */
export default async function veriAdimi(client: PoolClient): Promise<void> {
  const sayac = { staff: 0, platform: 0, cafes: 0 };

  const personel = await client.query<{ id: string; name: string }>(
    `SELECT id, name FROM staff`,
  );
  for (const s of personel.rows) {
    await client.query(`UPDATE staff SET name_enc = $2 WHERE id = $1`, [s.id, encryptPII(s.name)]);
    sayac.staff++;
  }

  const platform = await client.query<{ id: string; name: string }>(
    `SELECT id, name FROM platform_users`,
  );
  for (const p of platform.rows) {
    await client.query(`UPDATE platform_users SET name_enc = $2 WHERE id = $1`, [
      p.id,
      encryptPII(p.name),
    ]);
    sayac.platform++;
  }

  const kafeler = await client.query<{
    id: string;
    contact_name: string | null;
    legal_name: string | null;
    address: string | null;
  }>(
    `SELECT id, contact_name, legal_name, address FROM cafes
      WHERE contact_name IS NOT NULL OR legal_name IS NOT NULL OR address IS NOT NULL`,
  );
  for (const k of kafeler.rows) {
    await client.query(
      `UPDATE cafes SET contact_name_enc = $2, legal_name_enc = $3, address_enc = $4 WHERE id = $1`,
      [
        k.id,
        k.contact_name === null ? null : encryptPII(k.contact_name),
        k.legal_name === null ? null : encryptPII(k.legal_name),
        k.address === null ? null : encryptPII(k.address),
      ],
    );
    sayac.cafes++;
  }

  // Sayılar yazılıyor, adlar yazılmıyor — `lib/log.ts`in yasakladığı şey
  // tam olarak bu göçün taşıdığı veri.
  console.log(
    `    · şifrelendi: ${sayac.staff} personel, ${sayac.platform} platform kullanıcısı, ${sayac.cafes} kafe kaydı`,
  );
}
