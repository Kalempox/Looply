import { z } from "zod";
import { log } from "./log";
import { normalizePhone, normalizeEmail } from "./crypto";

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

/**
 * Oyuncunun e-postası — Ü168.
 *
 * Doğrulama kodu buraya gidiyor, yani yanlış yazılmış bir adres
 * "hesap açılmadı" demek. Yine de kontrol **dar** tutuldu: uzun bir
 * düzenli ifade, geçerli ama sıra dışı adresleri (tire, artı, uzun
 * alan adları) reddedip gerçek kullanıcıyı kapıda bırakıyor. Adresin
 * çalıştığını kanıtlayan tek şey **oraya giden kod**.
 *
 * ⚠️ `normalizeEmail` hem doğruluyor hem küçük harfe indiriyor ve
 * dönüşüm burada yapılıyor: şemadan çıkan değer doğrudan
 * `kaydet()`e gidiyor, yani "normalize etmeyi unutma" diye bir kural
 * kalmıyor. Telefonda da aynı kalıp var (`transform(normalizePhone)`).
 */
export const epostaSemasi = z
  .string()
  .trim()
  .min(3, "E-posta adresi eksik")
  .max(254, "E-posta adresi çok uzun")
  .refine((a) => {
    try {
      normalizeEmail(a);
      return true;
    } catch {
      return false;
    }
  }, "Geçerli bir e-posta adresi girin")
  .superRefine((a, ctx) => {
    const oneri = epostaYazimOnerisi(a);
    if (oneri) ctx.addIssue({ code: "custom", message: `Adresi kontrol et — ${oneri} mi demek istedin?` });
  })
  .transform(normalizeEmail);

/**
 * Sık yapılan alan adı yazım hataları — Ü294.
 *
 * Ürün sahibi: *"olmayan ya da olmayacak gmaili kabul etmemeli."* Bir
 * adresin gerçekten var olduğunu yalnızca oraya giden kod kanıtlar
 * (yukarıdaki not) — ama "gmail.con" ya da "gmial.com" hiçbir zaman
 * e-posta almıyor: yazan kişi kodu hiç göremez, ekran ise ona bir şey
 * söylemez.
 *
 * ⚠️ Liste dar ve **tam eşleşme**. Benzerlik ölçüsüyle (bir harf farkı)
 * yakalamak gerçek sağlayıcıları da reddederdi: "mail.com" ve "ymail.com"
 * "gmail.com"a bir harf uzak ve ikisi de gerçek adres.
 */
const YAZIM_HATALARI: Record<string, string> = {
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmail.com.tr": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmali.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gmeil.com": "gmail.com",
  "hotmail.con": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "homail.com": "hotmail.com",
  "hotamil.com": "hotmail.com",
  "hotmil.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "otlook.com": "outlook.com",
  "outllook.com": "outlook.com",
  "yahoo.con": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "icloud.con": "icloud.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
  "yandex.con": "yandex.com",
};

/** "ali@gmial.com" → "ali@gmail.com"; tanınan bir yazım hatası yoksa `null`. */
export function epostaYazimOnerisi(adres: string): string | null {
  const [ad, alan] = adres.trim().toLowerCase().split("@");
  const dogru = alan ? YAZIM_HATALARI[alan] : undefined;
  return ad && dogru ? `${ad}@${dogru}` : null;
}

/**
 * İşletmenin aranacak telefonu — Ü126.
 *
 * ⚠️ `telefonSemasi`den ayrı ve **cep şartı yok**: kafenin numarası çoğu
 * zaman sabit hat ve `normalizePhone` sabit hattı reddediyor. Aynı şemayı
 * kullansaydık işletme kendi numarasını yazamazdı.
 *
 * E.164'e de çevrilmiyor. Çeviren tek yer giriş kimliğini üreten yol
 * olmalı (`phone_index` ondan türüyor); bu numara aranmak için duruyor,
 * hiçbir şeyin anahtarı değil.
 */
export const isletmeTelefonSemasi = z
  .string()
  .trim()
  .min(10, "Telefon numarası eksik")
  .max(20, "Telefon numarası çok uzun")
  .regex(/^[0-9+\s().-]+$/, "Telefon numarası yalnızca rakam içerebilir");

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
