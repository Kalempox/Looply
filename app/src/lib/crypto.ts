import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "./env";

/**
 * Şifreleme — docs/08 §5.
 *
 * İki farklı işi iki farklı anahtarla yapıyoruz:
 *   · kör indeks  → aramak için, geri çevrilemez (HMAC)
 *   · şifreli alan → okumak için, geri çevrilebilir (AES-256-GCM)
 *
 * Anahtarların ayrı olmasının sebebi: kör indeks anahtarı sızarsa saldırgan
 * elindeki numaranın sistemde olup olmadığını öğrenir ama numarayı okuyamaz.
 */

const KEY_VERSION = 1;

function key(name: "PII_ENC_KEY" | "PHONE_INDEX_KEY" | "OTP_PEPPER" | "SESSION_HASH_KEY" | "IDENTIFIER_HASH_KEY"): Buffer {
  return Buffer.from(env()[name], "base64");
}

// ── Şifreli alanlar ──────────────────────────────────────────
// Biçim: [sürüm:1][nonce:12][şifreli metin + etiket:16]

export function encryptPII(plaintext: string): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("PII_ENC_KEY"), nonce);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([Buffer.from([KEY_VERSION]), nonce, body, cipher.getAuthTag()]);
}

export function decryptPII(blob: Buffer): string {
  const version = blob[0];
  if (version !== KEY_VERSION) {
    throw new Error(`Bilinmeyen anahtar sürümü: ${version}`);
  }
  const nonce = blob.subarray(1, 13);
  const tag = blob.subarray(blob.length - 16);
  const body = blob.subarray(13, blob.length - 16);

  const decipher = createDecipheriv("aes-256-gcm", key("PII_ENC_KEY"), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

// ── Kör indeks ───────────────────────────────────────────────

/**
 * Telefon numarasını E.164'e çevirir: 0532…, 532…, +90532… → +90532…
 * Normalizasyon şart: edilmezse aynı kişi üç ayrı hesap açar ve
 * "aynı numaraya günde 10 SMS" gibi limitler anlamını yitirir.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  let national: string;
  if (digits.startsWith("90") && digits.length === 12) national = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) national = digits.slice(1);
  else if (digits.length === 10) national = digits;
  else throw new Error("Geçersiz telefon numarası");

  if (!national.startsWith("5")) throw new Error("Geçersiz telefon numarası");
  return `+90${national}`;
}

/** Aramak için: aynı numara her zaman aynı indeksi üretir, geri çevrilemez. */
export function phoneIndex(e164: string): Buffer {
  return createHmac("sha256", key("PHONE_INDEX_KEY")).update(e164).digest();
}

/** IP ve cihaz kimliği — anahtarlı, yani gökkuşağı tablosuyla çözülemez. */
export function identifierHash(value: string): Buffer {
  return createHmac("sha256", key("IDENTIFIER_HASH_KEY")).update(value).digest();
}

// ── Jetonlar ve kodlar ───────────────────────────────────────

/** Oturum jetonu yüksek entropili; hızlı hash yeterli. */
export function hashSessionToken(token: string): Buffer {
  return createHmac("sha256", key("SESSION_HASH_KEY")).update(token).digest();
}

/**
 * Doğrulama kodu 6 hane = 1.000.000 ihtimal — düşük entropi.
 * Biber (pepper) veritabanında olmadığı için, veritabanı dökümü tek başına
 * kodların çözülmesine yetmez.
 */
export function hashOtp(code: string): Buffer {
  return createHmac("sha256", key("OTP_PEPPER")).update(code).digest();
}

export function sha256(value: string | Buffer): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Sabit zamanlı karşılaştırma — süre ölçerek kod tahmin edilemesin. */
export function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

// ── İmzalı taşıyıcılar ───────────────────────────────────────

/**
 * Çerezde taşınan ama kurcalanmaması gereken küçük veriler: masa bileti,
 * misafir oyun talebi. İçerikleri açık — gizlilik değil **bütünlük** arıyoruz.
 *
 * `amac` HMAC'in içine giriyor ve bunun sebebi protokoller arası tekrar
 * kullanım: amaç imzaya karışmasaydı, bir masa bileti gövdesi misafir talebi
 * diye geri gönderilebilir ve imza tutardı. Ayrı amaç, ayrı imza uzayı.
 */
export function imzala(amac: string, govde: string): string {
  return createHmac("sha256", key("SESSION_HASH_KEY")).update(`${amac}\n${govde}`).digest("hex");
}

/**
 * İmzayı sabit zamanda doğrular.
 *
 * Biçim kontrolü önce geliyor: `Buffer.from(x, "hex")` bozuk girdide sessizce
 * kısa bir tampon üretir ve `safeEqual` uzunluk farkından ötürü zaten false
 * döner — ama o yolu hiç açmamak daha temiz.
 */
export function imzaGecerliMi(amac: string, govde: string, imza: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(imza)) return false;
  return safeEqual(Buffer.from(imzala(amac, govde), "hex"), Buffer.from(imza, "hex"));
}
