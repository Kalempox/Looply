import { scrypt as scryptCb, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { withBypass } from "@/db/context";
import { audit } from "@/lib/audit";
import { tuket } from "@/lib/ratelimit";
import { log } from "@/lib/log";
import { gecerliMi } from "./parola-kurallari";

/**
 * Oyuncu parolası — SMS'in **yerine değil, yanına**.
 *
 * ── Ü1 değişmedi ────────────────────────────────────────────
 *
 * Kimlik hâlâ doğrulanmış telefon numarası. Hesap yalnızca OTP'den geçtikten
 * sonra açılıyor (G13) ve parola ancak o hesabın üstüne konuyor. Parolayla
 * giriş, doğrulanmış bir numaraya ikinci bir kapı açıyor — yeni bir kimlik
 * kaynağı yaratmıyor.
 *
 * Gerekçe pratik: her girişte SMS beklemek yavaş ve **pahalı** (docs/07 §2.3
 * — OTP aynı zamanda bir maliyet kapısı). Parola, SMS'i kayıt ve kurtarma
 * anına indiriyor.
 *
 * ── "Şifremi unuttum" neden yok ─────────────────────────────
 *
 * Ayrı bir sıfırlama akışı **bilerek yazılmadı.** Numara zaten doğrulanmış ve
 * SMS ile giriş açık: parolasını unutan SMS ile girer, isterse yenisini
 * belirler. Ayrı sıfırlama jetonu, ayrı kanal ve ayrı saldırı yüzeyi
 * doğmuyor — üstelik kurtarma yolu, sahip olduğumuz **en güçlü** kanaldan
 * geçiyor.
 *
 * ── Hash ────────────────────────────────────────────────────
 *
 * `staff.pinHashle` ile **aynı biçim ve aynı parametreler**. İkinci bir hash
 * uygulaması yazmıyoruz: Faz 7'de tohum betiğinin kendi PIN hash kopyası
 * vardı ve doğrulayıcıyla ayrıştığı için kasiyer hiç giriş yapamıyordu.
 */

const scrypt = promisify(scryptCb) as (
  parola: string,
  tuz: Buffer,
  uzunluk: number,
  opts: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/* ── Kurallar ──────────────────────────────────────────────── */

/**
 * Kurallar `parola-kurallari.ts` içinde, saf bir dosyada duruyor: ekran da
 * aynı listeyi kullanabilsin diye. Sunucu tarafı tek kapıdan geçmeye devam
 * etsin diye buradan yeniden dışa veriliyorlar.
 */
export { EN_AZ_UZUNLUK, EN_COK_UZUNLUK, kurallar, gecerliMi } from "./parola-kurallari";
export type { Kural } from "./parola-kurallari";

/* ── Hash ──────────────────────────────────────────────────── */

export async function hashle(parola: string): Promise<string> {
  const tuz = randomBytes(16);
  const h = await scrypt(parola, tuz, 32, SCRYPT);
  return `scrypt$${tuz.toString("hex")}$${h.toString("hex")}`;
}

async function eslesiyorMu(parola: string, saklanan: string): Promise<boolean> {
  const [tur, tuzHex, hashHex] = saklanan.split("$");
  if (tur !== "scrypt" || !tuzHex || !hashHex) return false;
  const beklenen = Buffer.from(hashHex, "hex");
  const gelen = await scrypt(parola, Buffer.from(tuzHex, "hex"), beklenen.length, SCRYPT);
  return timingSafeEqual(beklenen, gelen);
}

/**
 * Hesabı ya da parolası olmayan yollarda da scrypt çalıştırmak için sabit,
 * kimseye ait olmayan bir hash. Gizli değil — tek işi CPU yakmak; üretilen
 * sonuç zaten atılıyor. Biçimi gerçeğiyle birebir aynı (16 bayt tuz, 32 bayt
 * hash) ki iş yükü de aynı olsun.
 */
const KUKLA_HASH =
  "scrypt$4f1c8ab2d3e05967bc48a1d27e6039f5$" +
  "9d2a7c04e6b8153faa07c9e21d4b6083572ecf19a04d8b3c6e15f9027ab4dc68";

/**
 * Başarısız yolu, başarılı yolla aynı süreye oturtur.
 *
 * Tek hata mesajı tek başına yetmiyordu. Kayıtlı ve parolalı bir numarada
 * scrypt çalışıyor (~55 ms), kayıtsız numarada fonksiyon anında dönüyordu
 * (~5 ms). Aradaki fark, mesajı hiç okumadan "bu numara Looply'de mi"
 * sorusunu cevaplıyor — yani metinde gizlediğimiz şeyi kronometre söylüyor.
 *
 * Eşitlenen, baskın maliyet olan scrypt. Geriye kalan tek fark bir SELECT
 * (mikrosaniyeler) ve çağıran taraf zaten her iki durumda da `telefonlaBul`
 * çalıştırıyor.
 *
 * Hız sınırına takılan yol bilerek DIŞARIDA: o karar hesabın varlığına değil
 * yalnızca sayaca bakıyor, dolayısıyla bir şey sızdırmıyor. Oraya da scrypt
 * konsaydı, sınırı aşan her istek bedava CPU yakma yoluna dönerdi.
 */
async function zamaniEsitle(parola: string): Promise<void> {
  await eslesiyorMu(parola, KUKLA_HASH);
}

/* ── Belirleme ─────────────────────────────────────────────── */

export type ParolaSonucu = { ok: true } | { ok: false; hata: string };

/**
 * Oyuncunun parolasını belirler veya değiştirir.
 *
 * Parolanın kendisi **hiçbir yere loglanmıyor** — `lib/log.ts` "parola" ve
 * "password" alanlarını zaten yasaklıyor; buradan da yalnızca sonuç geçiyor.
 */
export async function belirle(opts: {
  playerId: string;
  parola: string;
}): Promise<ParolaSonucu> {
  if (!gecerliMi(opts.parola)) {
    return { ok: false, hata: "Parola kuralları karşılanmadı." };
  }

  const hash = await hashle(opts.parola);

  await withBypass("parola belirleme", async (db) => {
    await db.query(
      `UPDATE players SET password_hash = $2, password_set_at = now() WHERE id = $1`,
      [opts.playerId, hash],
    );
    await audit(db, {
      actorType: "player",
      actorId: opts.playerId,
      action: "player.password_set",
      targetType: "player",
      targetId: opts.playerId,
    });
  });

  log.info("oyuncu parolasi belirlendi");
  return { ok: true };
}

export async function varMi(playerId: string): Promise<boolean> {
  const r = await withBypass("parola var mı", (db) =>
    db.one<{ v: boolean }>(
      `SELECT password_hash IS NOT NULL AS v FROM players WHERE id = $1`,
      [playerId],
    ),
  );
  return !!r?.v;
}

/* ── Doğrulama ─────────────────────────────────────────────── */

export type GirisHatasi = "yanlis" | "parola_yok" | "cok_sik";

export type GirisSonucu = { ok: true; playerId: string } | { ok: false; durum: GirisHatasi };

/**
 * Başarısız girişin ekranda göreceği metin.
 *
 * `yanlis` ile `parola_yok` **bilerek aynı** cevabı alıyor: ayrılsalardı
 * saldırgan hangi numaraların kayıtlı olduğunu ve hangilerinin parolası
 * bulunduğunu öğrenirdi. Metnin ekranda değil burada durmasının sebebi,
 * bu eşitliğin çalıştırılabilir bir testi olması (tests/kimlik.test.ts) —
 * ekranda iki ayrı dizge olsaydı biri er geç "yardımcı olmak için"
 * ayrıntılanırdı.
 */
export function hataMetni(durum: GirisHatasi): string {
  return durum === "cok_sik"
    ? "Çok fazla deneme yapıldı. 15 dakika sonra tekrar dene — ya da SMS ile gir."
    : "Numara veya parola hatalı.";
}

/**
 * Parolayla giriş.
 *
 * ── Neden hız sınırı ────────────────────────────────────────
 *
 * Parola, PIN'den uzun ama yine de tahmin edilebilir. Kasiyer PIN'inde
 * kullanılan aynı sayaç burada da işliyor: sınırsız deneme, sözlük
 * saldırısını bedava yapardı.
 *
 * ── Neden tek hata mesajı ───────────────────────────────────
 *
 * "Numara kayıtlı değil" ile "parola yanlış" ayrı ayrı söylenirse, saldırgan
 * hangi numaraların kayıtlı olduğunu öğrenir. İkisi de aynı cevabı veriyor.
 *
 * Aynı cevabı vermek yetmiyor, aynı SÜREDE vermek de gerekiyor —
 * `zamaniEsitle` bunun için var.
 */
export async function girisDene(opts: {
  playerId: string | null;
  parola: string;
  /** Hız sınırı anahtarı — kişisel veri İÇERMEZ (docs/08 §7.1). */
  limitAnahtari: string;
}): Promise<GirisSonucu> {
  const limit = await tuket("pin_per_device_15min", opts.limitAnahtari);
  if (!limit.izinli) return { ok: false, durum: "cok_sik" };

  if (!opts.playerId) {
    await zamaniEsitle(opts.parola);
    return { ok: false, durum: "yanlis" };
  }

  const r = await withBypass("parola doğrulama", (db) =>
    db.one<{ password_hash: string | null }>(
      `SELECT password_hash FROM players WHERE id = $1 AND anonymized_at IS NULL`,
      [opts.playerId],
    ),
  );

  if (!r?.password_hash) {
    await zamaniEsitle(opts.parola);
    return { ok: false, durum: "parola_yok" };
  }

  const dogru = await eslesiyorMu(opts.parola, r.password_hash);
  if (!dogru) {
    log.info("parola dogrulanamadi");
    return { ok: false, durum: "yanlis" };
  }

  return { ok: true, playerId: opts.playerId };
}
