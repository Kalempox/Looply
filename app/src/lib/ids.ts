import { randomBytes, randomInt } from "node:crypto";

/**
 * Kimlikler — zaman öneki + rastgelelik.
 * Sıralanabilir (kayıt sırası korunur) ama tahmin edilemez (sayaç değil).
 */
export function newId(prefix: string): string {
  const t = Date.now().toString(36).padStart(9, "0");
  return `${prefix}_${t}${randomBytes(8).toString("hex")}`;
}

/**
 * Karıştırılabilir harfler (0/O, 1/I/L) dışarıda.
 * Kasiyer kodu sesli okuyabilmeli, müşteri de yazabilmeli.
 */
const GUVENLI_ALFABE = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function safeCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += GUVENLI_ALFABE[randomInt(GUVENLI_ALFABE.length)];
  return out;
}

/** Kupon kodu — 6 hane (docs/06 §7). */
export const couponCode = () => safeCode(6);

/** Kafeye özel anonim oyuncu kodu: "P-4F2A" (G1). */
export const aliasCode = () => `P-${safeCode(4)}`;

/** SMS doğrulama kodu — 6 rakam, kriptografik rastgele. */
export function otpCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += randomInt(10);
  return out;
}
