import { z } from "zod";

/**
 * Ortam değişkenleri — açılışta doğrulanır, eksikse uygulama BAŞLAMAZ.
 *
 * Sessizce eksik bir anahtarla çalışmak, en tehlikeli hata biçimi:
 * uygulama ayakta görünür ama şifreleme ya hiç yapılmaz ya da yanlış
 * anahtarla yapılır. Bu yüzden hata erken ve gürültülü olmalı.
 */

/** 32 baytlık base64 anahtar. Kısa anahtar sessizce kabul edilmez. */
const key32 = z
  .string()
  .min(1, "boş")
  .refine((v) => {
    try {
      return Buffer.from(v, "base64").length === 32;
    } catch {
      return false;
    }
  }, "32 baytlık base64 olmalı — `npm run keys:generate` ile üret");

const schema = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),

  DATABASE_URL: z.string().url(),
  APP_DATABASE_URL: z.string().url(),

  PII_ENC_KEY: key32,
  PHONE_INDEX_KEY: key32,
  OTP_PEPPER: key32,
  SESSION_HASH_KEY: key32,
  IDENTIFIER_HASH_KEY: key32,
  // G15: yedek anahtarı diğerlerinden AYRI ve ayrı yerde saklanır.
  // Yedek dosyası sızarsa saldırganın elinde iki ayrı anahtar eksik kalır.
  BACKUP_ENC_KEY: key32,

  SMS_PROVIDER: z.enum(["console", "netgsm", "iletimerkezi"]).default("console"),
  SMS_SENDER_ID: z.string().optional(),
  SMS_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Ortam değişkenleri eksik veya hatalı:\n${lines.join("\n")}`);
  }

  const e = parsed.data;

  // Beş anahtarın tamamı birbirinden farklı olmalı (docs/08 §5.1).
  // Aynı anahtar kullanılırsa, kör indeks sızıntısı doğrudan numaraların
  // okunmasına dönüşür — ayrı olmalarının tek sebebi bu.
  const keys = [
    e.PII_ENC_KEY,
    e.PHONE_INDEX_KEY,
    e.OTP_PEPPER,
    e.SESSION_HASH_KEY,
    e.IDENTIFIER_HASH_KEY,
    e.BACKUP_ENC_KEY,
  ];
  if (new Set(keys).size !== keys.length) {
    throw new Error("Anahtarların tamamı birbirinden farklı olmalı — aynı değer birden fazla yerde kullanılmış");
  }

  if (e.APP_ENV === "production") {
    if (e.SMS_PROVIDER === "console") {
      throw new Error("Canlı ortamda SMS_PROVIDER=console olamaz — kodlar gönderilmez, ekrana basılır");
    }
    if (e.DATABASE_URL === e.APP_DATABASE_URL) {
      throw new Error(
        "Canlı ortamda uygulama, göç (migration) bağlantısını kullanamaz — " +
          "o rol tablo sahibi olduğu için satır düzeyi güvenliğini (RLS) atlar",
      );
    }
  }

  cached = e;
  return e;
}

export const isProduction = () => env().APP_ENV === "production";
export const isDevelopment = () => env().APP_ENV === "development";

/**
 * Çerezlere `Secure` bayrağı konsun mu?
 *
 * ⚠️ Bu kapı önce `isProduction()` idi ve staging çıkışında (F3) yanlış
 * çıktı: demo sunucusu `APP_ENV=staging` ile ama **gerçek HTTPS üzerinde**
 * koşuyor. Bayrak konmasaydı oturum çerezi düz HTTP isteğinde de
 * gönderilebilir hâlde kalırdı — sertifika varken bundan vazgeçmenin
 * sebebi yok.
 *
 * `development` dışarıda: yerel geliştirme `http://localhost` üzerinde
 * çalışıyor ve `Secure` çerez orada hiç yazılmaz — giriş tamamen kırılırdı.
 */
export const cerezGuvenli = () => env().APP_ENV !== "development";

/**
 * Demo/test ortamında mıyız?
 *
 * İki şart birden aranıyor ve ikisi de canlıda sağlanamaz:
 *   · APP_ENV canlı değil
 *   · Sahte SMS sağlayıcısı kullanılıyor — env.ts canlıda bunu zaten reddediyor
 *
 * Tek tanım olması önemli: bu kapının arkasında canlıda asla açılmaması
 * gereken şeyler duruyor (doğrulama kodunun ekranda görünmesi, oyun
 * ipuçları, raporda mahremiyet eşiğinin kalkması). İki ayrı yerde iki ayrı
 * koşul yazılsaydı biri gevşediğinde diğeri fark edilmezdi.
 */
export const demoOrtami = () =>
  env().APP_ENV !== "production" && env().SMS_PROVIDER === "console";
