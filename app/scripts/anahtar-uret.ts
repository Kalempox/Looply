import { randomBytes } from "node:crypto";

/**
 * Anahtar üretici — docs/08 §5.1.
 *
 *   npm run keys:generate
 *
 * Çıktıyı .env.local'e yapıştır. Bu değerler HİÇBİR ZAMAN depoya girmez;
 * canlı ortamda da dosyada değil, sunucunun sır kasasında durur.
 */

const ANAHTARLAR = [
  ["PII_ENC_KEY", "Ad, soyad, telefon, e-posta, doğum yılı — şifreleme"],
  ["PHONE_INDEX_KEY", "Telefon kör indeksi — aramak için, geri çevrilemez"],
  ["EMAIL_INDEX_KEY", "E-posta kör indeksi — telefonunkinden ayrı olmalı (Ü168)"],
  ["OTP_PEPPER", "Doğrulama kodu biberi — veritabanında durmaz"],
  ["SESSION_HASH_KEY", "Oturum jetonu hash'i"],
  ["IDENTIFIER_HASH_KEY", "IP ve cihaz kimliği hash'i"],
] as const;

console.log("# .env.local içine yapıştır — bu değerleri paylaşma, depoya ekleme\n");

for (const [ad, aciklama] of ANAHTARLAR) {
  console.log(`# ${aciklama}`);
  console.log(`${ad}=${randomBytes(32).toString("base64")}\n`);
}

console.log("# Beşi de birbirinden farklı olmalı — env.ts bunu açılışta kontrol eder.");
