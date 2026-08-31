/**
 * Yapılandırılmış log + kişisel veri koruması.
 *
 * docs/08 §7.1 — şunlar HİÇBİR seviyede, HİÇBİR ortamda loglanmaz:
 *   telefon · ad · soyad · doğum yılı · doğrulama kodu · oturum jetonu
 *   personel PIN'i · ham konum · kafe belgelerinin içeriği
 *
 * Kural iyi niyete bırakılmıyor: yasaklı alan adları silinir, metin
 * değerlerinde telefon numarasına benzeyen diziler maskelenir. Geliştirme
 * ortamında yasaklı alan görülürse hata fırlatılır — kural, canlıya
 * çıkmadan geliştiricinin masasında kırılsın.
 */

const YASAKLI_ALANLAR = new Set([
  "phone", "phone_number", "telefon", "msisdn", "phone_enc",
  "first_name", "last_name", "name", "ad", "soyad", "full_name",
  "first_name_enc", "last_name_enc", "birth_year", "birth_year_enc", "dogum_yili",
  "otp", "code", "otp_code", "code_hmac", "verification_code", "dogrulama_kodu",
  "token", "token_hash", "session_token", "access_token", "refresh_token",
  "pin", "pin_hash", "password", "parola", "secret", "qr_secret",
  "lat", "lng", "latitude", "longitude", "coords",
  "authorization", "cookie", "set-cookie",
]);

/** +90…, 05…, 5… ile başlayan Türk cep numarası biçimleri */
const TELEFON_DESENI = /(?:\+?90[\s.-]?)?0?[\s.-]?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g;

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

function maskele(value: string): string {
  return value.replace(TELEFON_DESENI, "[telefon]");
}

export function redact(input: unknown, depth = 0): unknown {
  if (depth > 6) return "[derin]";
  if (input === null || input === undefined) return input;

  if (typeof input === "string") return maskele(input);
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (input instanceof Date) return input.toISOString();
  if (Buffer.isBuffer(input)) return `[bayt:${input.length}]`;

  if (Array.isArray(input)) return input.map((v) => redact(v, depth + 1));

  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (YASAKLI_ALANLAR.has(k.toLowerCase())) {
        if (process.env.APP_ENV !== "production") {
          throw new Error(
            `Log kuralı ihlali: "${k}" alanı loglanamaz (docs/08 §7.1). ` +
              `Bu hata bilerek fırlatılıyor — kural canlıya çıkmadan burada kırılsın.`,
          );
        }
        continue;
      }
      out[k] = redact(v, depth + 1);
    }
    return out;
  }

  return "[bilinmeyen]";
}

function yaz(level: LogLevel, message: string, fields: LogFields = {}) {
  const satir = {
    ts: new Date().toISOString(),
    level,
    msg: maskele(message),
    ...(redact(fields) as LogFields),
  };
  process.stdout.write(JSON.stringify(satir) + "\n");
}

export const log = {
  debug: (m: string, f?: LogFields) => yaz("debug", m, f),
  info: (m: string, f?: LogFields) => yaz("info", m, f),
  warn: (m: string, f?: LogFields) => yaz("warn", m, f),
  error: (m: string, f?: LogFields) => yaz("error", m, f),
};

export function hataAlanlari(err: unknown): LogFields {
  if (err instanceof Error) {
    return {
      error: err.name,
      detail: maskele(err.message),
      stack: process.env.APP_ENV === "production" ? undefined : err.stack?.split("\n").slice(0, 4),
    };
  }
  return { error: "unknown", detail: String(err).slice(0, 200) };
}
