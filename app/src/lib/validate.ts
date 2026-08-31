import { z } from "zod";
import { log } from "./log";
import { normalizePhone } from "./crypto";

/**
 * Girdi doğrulama katmanı — docs/07 §2.5.
 *
 * Kural: doğrulanmamış veri iş mantığına girmez. İstisnasız.
 *
 * Bu katman iki şey yapıyor:
 *   1. Şemaya uymayan girdiyi kapıda durduruyor
 *   2. Hata mesajının içeriden bilgi sızdırmasını engelliyor —
 *      istemciye alan adları döner, veritabanı yapısı veya
 *      iç hata metni dönmez.
 */

export type Sonuc<T> = { ok: true; veri: T } | { ok: false; hatalar: Record<string, string> };

export function dogrula<T>(sema: z.ZodType<T>, girdi: unknown): Sonuc<T> {
  const r = sema.safeParse(girdi);
  if (r.success) return { ok: true, veri: r.data };

  const hatalar: Record<string, string> = {};
  for (const sorun of r.error.issues) {
    const alan = sorun.path.join(".") || "_";
    hatalar[alan] ??= sorun.message;
  }

  // Hangi alanların reddedildiğini logluyoruz — DEĞERLERİNİ değil.
  log.debug("girdi reddedildi", { alanlar: Object.keys(hatalar) });
  return { ok: false, hatalar };
}

/* ── Ortak alanlar ───────────────────────────────────────────── */

function cepNumarasiMi(ham: string): boolean {
  try {
    normalizePhone(ham);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cep telefonu — doğrular **ve** E.164'e çevirir.
 *
 * İkisinin ayrı durması bir boşluk bırakıyordu: biçim kontrolü yalnızca
 * uzunluğa ve karakterlere bakıyordu, dolayısıyla sabit hat numarası
 * şemadan geçiyor ve hemen ardındaki `normalizePhone` istisna fırlatıyordu.
 * Kullanıcı alan hatası yerine genel bir sunucu hatası görüyordu — dört
 * giriş ekranında birden. Normalizasyon şemanın içine alınınca hata,
 * ait olduğu yerde ve alanın yanında çıkıyor.
 *
 * `normalizePhone` etkisiz eleman: E.164 girdiyi aynen döndürüyor. Bu yüzden
 * çağıranların ellerindeki ikinci `normalizePhone` çağrıları zararsız.
 */
export const telefonSemasi = z
  .string()
  .trim()
  .min(10, "Telefon numarası eksik")
  .max(20, "Telefon numarası çok uzun")
  .regex(/^[0-9+\s().-]+$/, "Telefon numarası yalnızca rakam içerebilir")
  .refine(cepNumarasiMi, "Geçerli bir cep telefonu numarası girin")
  .transform(normalizePhone);

export const isimSemasi = z
  .string()
  .trim()
  .min(2, "En az 2 harf")
  .max(50, "En fazla 50 harf")
  // Türkçe harfler açık; rakam ve sembol kapalı
  .regex(/^[\p{L}\s'-]+$/u, "Yalnızca harf kullanılabilir");

export const otpSemasi = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Doğrulama kodu 6 rakamdır");

export const kuponKoduSemasi = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/, "Kupon kodu 6 karakterdir");

export const pinSemasi = z.string().trim().regex(/^\d{4}$/, "PIN 4 rakamdır");

/** Doğum yılı — 18+ kontrolü (Ü2). Sunucuda, istemciye güvenilmeden. */
export const dogumYiliSemasi = z.coerce
  .number()
  .int()
  .refine((y) => new Date().getFullYear() - y >= 18, "18 yaşından küçükler kaydolamaz")
  .refine((y) => new Date().getFullYear() - y <= 120, "Geçersiz doğum yılı");

/** Kuruş tutarı — negatif olamaz, float olamaz. */
export const kurusSemasi = z.number().int().nonnegative();
