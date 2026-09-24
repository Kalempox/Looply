import { scrypt as scryptCb, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { withBypass } from "@/db/context";
import { identifierHash, phoneIndex, encryptPII, decryptPII } from "@/lib/crypto";
import { newId } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { tuket } from "@/lib/ratelimit";
import { log } from "@/lib/log";
import * as ayar from "./ayar";
import { mesafeMetre } from "./masa";

const scrypt = promisify(scryptCb) as (
  parola: string,
  tuz: Buffer,
  uzunluk: number,
  opts: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Personel ve PIN.
 *
 * Kasiyerin girişi telefonla değil PIN'le: vardiya değişiminde SMS beklemek
 * gerçekçi değil. Ama 4 hane tek başına 10.000 ihtimal demek — bu yüzden PIN
 * **yalnızca kafenin içinde** çalışıyor (Ü285; önce kayıtlı cihazdaydı, G11)
 * ve denemeler kafe başına sayılıyor.
 */

export const PIN_ROTASYON_GUNU = 90;
const PIN_KILIT_DK = 15;

/**
 * PIN hash'i — scrypt.
 *
 * docs/08 §5.4 argon2id yazıyordu; scrypt'e geçildi çünkü Node'un içinde
 * geliyor ve yerel derleme gerektiren bir bağımlılık eklemiyor. İkisi de
 * bellek-zorlayıcı; 4 haneli bir PIN için belirleyici olan zaten hash değil,
 * **konum kapısı ve deneme sayacı** (Ü285).
 */
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function pinHashle(pin: string): Promise<string> {
  const tuz = randomBytes(16);
  const h = await scrypt(pin, tuz, 32, SCRYPT);
  return `scrypt$${tuz.toString("hex")}$${h.toString("hex")}`;
}

async function pinEslesiyorMu(pin: string, saklanan: string): Promise<boolean> {
  const [tur, tuzHex, hashHex] = saklanan.split("$");
  if (tur !== "scrypt" || !tuzHex || !hashHex) return false;
  const beklenen = Buffer.from(hashHex, "hex");
  const gelen = await scrypt(pin, Buffer.from(tuzHex, "hex"), beklenen.length, SCRYPT);
  return timingSafeEqual(beklenen, gelen);
}

/* ── Personel yönetimi ────────────────────────────────────── */

export type Personel = {
  id: string;
  ad: string;
  rol: "cashier" | "manager";
  aktif: boolean;
  pinDegisti: Date;
  pinEskiMi: boolean;
  telefonMaskeli: string | null;
};

/**
 * ⚠️ Sıralama SQL'de değil burada (Ü115).
 *
 * `ORDER BY role, name` idi; `name` şifrelendikten sonra o sıralama
 * anlamını yitirdi — şifreli baytlar ada göre değil nonce'a göre dizilir
 * ve her yazmada rastgele nonce üretildiği için sonuç her seferinde
 * **farklı** çıkardı. Ad çözüldükten sonra sıralanıyor; `localeCompare`
 * Türkçe alfabeyi de doğru veriyor (Ç, Ğ, İ, Ö, Ş, Ü).
 */
export async function personelListele(cafeId: string): Promise<Personel[]> {
  const satirlar = await withBypass("personel listesi", (db) =>
    db.all<{
      id: string;
      name_enc: Buffer;
      role: "cashier" | "manager";
      active: boolean;
      pin_changed_at: Date;
      phone_enc: Buffer | null;
    }>(
      `SELECT id, name_enc, role, active, pin_changed_at, phone_enc
         FROM staff WHERE cafe_id = $1`,
      [cafeId],
    ),
  );

  const sinir = Date.now() - PIN_ROTASYON_GUNU * 86_400_000;
  return satirlar
    .map((s) => ({
      id: s.id,
      ad: decryptPII(s.name_enc),
      rol: s.role,
      aktif: s.active,
      pinDegisti: s.pin_changed_at,
      pinEskiMi: s.role === "cashier" && s.pin_changed_at.getTime() < sinir,
      telefonMaskeli: s.phone_enc ? maskeliTelefon(decryptPII(s.phone_enc)) : null,
    }))
    .sort((a, b) => a.rol.localeCompare(b.rol) || a.ad.localeCompare(b.ad, "tr"));
}

function maskeliTelefon(e164: string): string {
  const n = e164.replace("+90", "");
  return `0${n.slice(0, 3)} *** ** ${n.slice(8)}`;
}

export async function personelEkle(opts: {
  cafeId: string;
  ad: string;
  pin: string;
  ekleyenId: string;
}): Promise<string> {
  const id = newId("stf");
  const hash = await pinHashle(opts.pin);

  await withBypass("personel ekleme", async (db) => {
    await db.query(
      `INSERT INTO staff (id, cafe_id, name_enc, pin_hash, role) VALUES ($1,$2,$3,$4,'cashier')`,
      [id, opts.cafeId, encryptPII(opts.ad), hash],
    );
    await audit(db, {
      actorType: "staff",
      actorId: opts.ekleyenId,
      cafeId: opts.cafeId,
      action: "staff.create",
      targetType: "staff",
      targetId: id,
    });
  });

  log.info("personel eklendi");
  return id;
}

export async function pinDegistir(staffId: string, yeniPin: string, degistirenId: string) {
  const hash = await pinHashle(yeniPin);
  await withBypass("pin değişikliği", async (db) => {
    const s = await db.one<{ cafe_id: string }>(`SELECT cafe_id FROM staff WHERE id = $1`, [staffId]);
    await db.query(`UPDATE staff SET pin_hash = $2, pin_changed_at = now() WHERE id = $1`, [
      staffId,
      hash,
    ]);
    await audit(db, {
      actorType: "staff",
      actorId: degistirenId,
      cafeId: s?.cafe_id,
      action: "staff.pin_reset",
      targetType: "staff",
      targetId: staffId,
    });
  });
}

/**
 * Personeli pasifleştirir ve **oturumlarını anında düşürür**.
 * İşten ayrılan biri, tezgâhtaki tablette açık kalan oturumla işlem yapamasın.
 */
export async function personelPasiflestir(staffId: string, yapanId: string) {
  await withBypass("personel pasifleştirme", async (db) => {
    const s = await db.one<{ cafe_id: string }>(`SELECT cafe_id FROM staff WHERE id = $1`, [staffId]);
    await db.query(`UPDATE staff SET active = false, disabled_at = now() WHERE id = $1`, [staffId]);
    await db.query(
      `UPDATE sessions SET revoked_at = now(), revoke_reason = 'personel_pasiflestirildi'
        WHERE subject_id = $1 AND revoked_at IS NULL`,
      [staffId],
    );
    await audit(db, {
      actorType: "staff",
      actorId: yapanId,
      cafeId: s?.cafe_id,
      action: "staff.disable",
      targetType: "staff",
      targetId: staffId,
    });
  });
  log.warn("personel pasiflestirildi");
}

/* ── Kasiyerin kafesi — konum ve PIN (Ü285, Ü286) ─────────── */

/**
 * PIN'in sahibi aranırken bakılan çevre (metre). Kafenin yarıçapı en çok
 * 500 m; daha uzağa bakılması "PIN'in kafesinden X uzaktasın" cümlesi için.
 */
const ARAMA_METRE = 25_000;

/** Bir girişte PIN'in denendiği en çok kafe — her biri scrypt demek. */
const EN_COK_ADAY = 4;

export type KonumKonumu = "icinde" | "belirsiz" | "disinda";

type YakinKafe = { cafeId: string; ad: string; mesafeM: number };

export type KonumdakiKafe = (
  | { durum: "bulundu"; cafeId: string; ad: string; mesafeM: number }
  /** Nokta yarıçapın dışında ama doğruluk payı içeri taşıyor. */
  | { durum: "belirsiz"; mesafeM: number }
  | { durum: "yok"; enYakinM: number | null }
) & {
  /** Çevredeki en yakın üç kafe — PIN'in sahibini bulmak için (Ü286). */
  yakinlar: YakinKafe[];
};

/**
 * Oyuncunun K2 kuralıyla aynı (`masa.konumDogrula`): mesafe ≤ kafenin
 * yarıçapı içeride; dışarıda ama doğruluk payı yarıçapa taşıyorsa belirsiz.
 */
function konumuSinifla(mesafeM: number, yaricapM: number, payM: number): KonumKonumu {
  if (mesafeM <= yaricapM) return "icinde";
  return mesafeM - payM <= yaricapM ? "belirsiz" : "disinda";
}

function dogrulukPayi(dogrulukM?: number): number {
  return dogrulukM != null && Number.isFinite(dogrulukM) ? Math.max(0, dogrulukM) : 0;
}

/**
 * Kasiyerin bulunduğu kafe — Ü285.
 *
 * Ürün sahibi: *"kasiyer her cihazdan girebilir ama cihazının kafe
 * konumunun içinde olması gerekir — kafe sahibi bütün kasiyerlerin
 * telefonundan giriş yapamaz. Önemli olan PIN ve konum."* Cihaz kaydı
 * (G11) kalktı.
 *
 * Yarıçapının içinde olunan onaylı kafelerin **en yakını**; yanında
 * çevredeki en yakın üç kafe (`yakinlar`), PIN başka bir kafenin çıkarsa
 * onu bulmak için.
 *
 * ⚠️ Konum istemciden geliyor ve uydurulabilir — bu bir güvenlik kalkanı
 * değil, "kasiyer kafede olsun" kuralı. PIN taramaya karşı asıl kalkan
 * `pinGiris`in kafe başına sayacı.
 */
export async function konumdakiKafe(
  lat: number,
  lng: number,
  dogrulukM?: number,
): Promise<KonumdakiKafe> {
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) {
    return { durum: "yok", enYakinM: null, yakinlar: [] };
  }

  const dLat = ARAMA_METRE / 111_320;
  const dLng = ARAMA_METRE / (111_320 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
  const satirlar = await withBypass("konumdaki kafe", (db) =>
    db.all<{ id: string; name: string; lat: number; lng: number }>(
      `SELECT id, name, lat, lng FROM cafes
        WHERE status = 'approved' AND lat IS NOT NULL AND lng IS NOT NULL
          AND lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4`,
      [lat - dLat, lat + dLat, lng - dLng, lng + dLng],
    ),
  );
  const kafeler = satirlar
    .map((k) => ({ cafeId: k.id, ad: k.name, mesafeM: mesafeMetre(lat, lng, Number(k.lat), Number(k.lng)) }))
    .sort((a, b) => a.mesafeM - b.mesafeM);

  const payM = dogrulukPayi(dogrulukM);
  const enGenisYaricap = ayar.SINIRLAR[ayar.ANAHTARLAR.konumYaricapi].en_cok;
  let belirsizM: number | null = null;

  for (const k of kafeler) {
    // Sıralı: yarıçapın yetişemeyeceği ilk kafeden sonrası da yetişemez.
    if (k.mesafeM - payM > enGenisYaricap) break;
    const yaricap = await ayar.sayiOku(k.cafeId, ayar.ANAHTARLAR.konumYaricapi);
    const s = konumuSinifla(k.mesafeM, yaricap, payM);
    if (s === "icinde") return { durum: "bulundu", ...k, yakinlar: kafeler.slice(0, 3) };
    if (s === "belirsiz" && belirsizM === null) belirsizM = k.mesafeM;
  }

  const yakinlar = kafeler.slice(0, 3);
  if (belirsizM !== null) return { durum: "belirsiz", mesafeM: belirsizM, yakinlar };
  return { durum: "yok", enYakinM: kafeler[0]?.mesafeM ?? null, yakinlar };
}

/** Konumun belirli bir kafeye göre yeri — PIN'in kafesi bulunduktan sonra. */
export async function kafeyeGore(
  cafeId: string,
  lat: number,
  lng: number,
  dogrulukM?: number,
): Promise<{ ad: string; mesafeM: number; konum: KonumKonumu } | null> {
  const k = await withBypass("kafeye göre konum", (db) =>
    db.one<{ name: string; lat: number | null; lng: number | null }>(
      `SELECT name, lat, lng FROM cafes WHERE id = $1 AND status = 'approved'`,
      [cafeId],
    ),
  );
  if (!k || k.lat == null || k.lng == null) return null;
  const mesafeM = mesafeMetre(lat, lng, Number(k.lat), Number(k.lng));
  const yaricap = await ayar.sayiOku(cafeId, ayar.ANAHTARLAR.konumYaricapi);
  return { ad: k.name, mesafeM, konum: konumuSinifla(mesafeM, yaricap, dogrulukPayi(dogrulukM)) };
}

/* ── Kasiyer girişi ───────────────────────────────────────── */

export type PinSonucu =
  | { durum: "gecerli"; cafeId: string; staffId: string; ad: string }
  | { durum: "yanlis"; kalanDeneme: number }
  | { durum: "kilitli" };

/**
 * PIN'i aday kafelerin kasiyerlerinde **sırayla** dener — ilk eşleşen kazanır.
 *
 * Ü285'e kadar PIN yalnızca kayıtlı cihazda deneniyordu ve 10.000 ihtimal
 * internete kapalıydı. Artık her cihazdan deneniyor ve konum uydurulabilir;
 * bu yüzden sayaçlar: bağlantı (IP) başına ve **denenen her kafe için**
 * saatlik ve günlük. IP değiştirerek tarayan biri kafe sayacına takılıyor —
 * günde 60 deneme, 10.000'in tamamı ~5,5 ay. Bedeli: biri bilerek
 * doldurursa o kafede yeni kasa girişi bir süre kapanır; açık oturumlar
 * sürer.
 *
 * Sıra kiracı sınırını koruyor: konumun içinde olduğu kafe hep önce —
 * iki kafenin kasiyerinin PIN'i aynıysa kasiyer bulunduğu kafeye girer.
 */
export async function pinGiris(opts: {
  cafeIdler: string[];
  pin: string;
  /** İstemcinin IP'sinden türetilmiş — kişisel veri İÇERMEZ (docs/08 §7.1). */
  ipAnahtari: string;
}): Promise<PinSonucu> {
  const ip = await tuket("pin_per_ip_15min", opts.ipAnahtari);
  if (!ip.izinli) {
    log.warn("pin kilitlendi", { kilitDk: PIN_KILIT_DK, kafeSayaci: false });
    return { durum: "kilitli" };
  }

  let kalanDeneme = ip.kalan;
  const adaylar = [...new Set(opts.cafeIdler)].slice(0, EN_COK_ADAY);
  for (const [i, cafeId] of adaylar.entries()) {
    const kafeAnahtari = identifierHash(`pin:${cafeId}`).subarray(0, 8).toString("hex");
    const saat = await tuket("pin_per_cafe_hour", kafeAnahtari);
    const gun = await tuket("pin_per_cafe_day", kafeAnahtari);
    if (!saat.izinli || !gun.izinli) {
      log.warn("pin kilitlendi", { kilitDk: PIN_KILIT_DK, kafeSayaci: true });
      // İlk aday kasiyerin bulunduğu (ya da son girdiği) kafe: o kilitliyse
      // giriş yok. Öbürleri yalnızca "PIN'in kafesi hangisi" sorusu için.
      if (i === 0) return { durum: "kilitli" };
      continue;
    }
    if (i === 0) kalanDeneme = Math.min(kalanDeneme, saat.kalan, gun.kalan);

    const personeller = await withBypass("pin girişi", (db) =>
      db.all<{ id: string; name_enc: Buffer; pin_hash: string }>(
        `SELECT s.id, s.name_enc, s.pin_hash
           FROM staff s JOIN cafes c ON c.id = s.cafe_id
          WHERE s.cafe_id = $1 AND c.status = 'approved'
            AND s.role = 'cashier' AND s.active = true`,
        [cafeId],
      ),
    );

    for (const p of personeller) {
      // Ad yalnızca EŞLEŞEN satır için çözülüyor: yanlış PIN denemesi,
      // kafedeki bütün kasiyerlerin adını belleğe açmanın bahanesi olmasın.
      if (await pinEslesiyorMu(opts.pin, p.pin_hash)) {
        return { durum: "gecerli", cafeId, staffId: p.id, ad: decryptPII(p.name_enc) };
      }
    }
  }

  return { durum: "yanlis", kalanDeneme };
}

export type KasaGirisKarari =
  | { durum: "giris"; cafeId: string; staffId: string; mesafeM: number }
  /** PIN doğru ama PIN'in kafesinin yarıçapı dışındasın (Ü286). */
  | { durum: "uzak"; kafeAdi: string; mesafeM: number }
  | { durum: "belirsiz" }
  | { durum: "yanlis"; kafede: boolean; kafeAdi?: string }
  | { durum: "kilitli" }
  | { durum: "kafe_yok" };

/**
 * Kasa girişinin kararı — konum ve PIN birlikte (Ü285, Ü286).
 *
 * Ürün sahibi Ü286'da: *"'en yakın kafeye X m uzaktasın' değil — bu
 * PIN'in geçerli olduğu kafeden uzaktasın demeli."* PIN'ler kafeden kafeye
 * tekrar edebildiği için PIN'in kafesi adaylar arasından bulunuyor:
 *
 *   1. konumun içinde olduğu kafe (varsa — kiracı sınırı için hep ilk)
 *   2. bu cihazın en son girdiği kafe (`ipucu`, çerezden)
 *   3. çevredeki en yakın kafeler
 *
 * PIN hangisinde tutarsa konum O kafeye göre değerlendiriliyor. Kafenin
 * içindeyken yanlış PIN "PIN yanlış"; dışarıdayken PIN hiçbir adayda
 * tutmadıysa PIN'in uzaktaki bir kafenin olması da mümkün — cümle bunu
 * iddia etmiyor.
 */
export async function kasaGirisi(opts: {
  lat: number;
  lng: number;
  dogrulukM?: number;
  pin: string;
  ipAnahtari: string;
  ipucu?: string | null;
}): Promise<KasaGirisKarari> {
  const yer = await konumdakiKafe(opts.lat, opts.lng, opts.dogrulukM);
  const adaylar = [
    ...(yer.durum === "bulundu" ? [yer.cafeId] : []),
    ...(opts.ipucu ? [opts.ipucu] : []),
    ...yer.yakinlar.map((k) => k.cafeId),
  ];
  if (adaylar.length === 0) return { durum: "kafe_yok" };

  const pin = await pinGiris({ cafeIdler: adaylar, pin: opts.pin, ipAnahtari: opts.ipAnahtari });
  if (pin.durum === "kilitli") return { durum: "kilitli" };
  if (pin.durum === "yanlis") {
    return yer.durum === "bulundu"
      ? { durum: "yanlis", kafede: true, kafeAdi: yer.ad }
      : { durum: "yanlis", kafede: false };
  }

  const k = await kafeyeGore(pin.cafeId, opts.lat, opts.lng, opts.dogrulukM);
  if (!k) return { durum: "kafe_yok" };
  if (k.konum === "icinde") {
    return { durum: "giris", cafeId: pin.cafeId, staffId: pin.staffId, mesafeM: k.mesafeM };
  }
  if (k.konum === "belirsiz") return { durum: "belirsiz" };
  return { durum: "uzak", kafeAdi: k.ad, mesafeM: k.mesafeM };
}

/* ── Platform kullanıcısı ─────────────────────────────────── */

export type PlatformKullanicisi = {
  id: string;
  ad: string;
  rol: "platform_destek" | "platform_admin";
};

export async function platformKullanicisiBul(telefon: string): Promise<PlatformKullanicisi | null> {
  const r = await withBypass("platform kullanıcısı arama", (db) =>
    db.one<{ id: string; name_enc: Buffer; role: PlatformKullanicisi["rol"] }>(
      `SELECT id, name_enc, role FROM platform_users WHERE phone_index = $1 AND active = true`,
      [phoneIndex(telefon)],
    ),
  );
  return r ? { id: r.id, ad: decryptPII(r.name_enc), rol: r.role } : null;
}

export async function platformKullanicisiEkle(opts: {
  ad: string;
  telefon: string;
  rol: PlatformKullanicisi["rol"];
}): Promise<string> {
  const id = newId("pu");
  await withBypass("platform kullanıcısı ekleme", (db) =>
    db.query(
      `INSERT INTO platform_users (id, name_enc, phone_index, phone_enc, role)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (phone_index) DO UPDATE SET active = true, role = excluded.role`,
      [id, encryptPII(opts.ad), phoneIndex(opts.telefon), encryptPII(opts.telefon), opts.rol],
    ),
  );
  return id;
}
