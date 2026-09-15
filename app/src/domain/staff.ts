import { scrypt as scryptCb, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { withBypass } from "@/db/context";
import { identifierHash, phoneIndex, encryptPII, decryptPII } from "@/lib/crypto";
import { newId } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { tuket } from "@/lib/ratelimit";
import { log } from "@/lib/log";

const scrypt = promisify(scryptCb) as (
  parola: string,
  tuz: Buffer,
  uzunluk: number,
  opts: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Personel, PIN ve kayıtlı cihazlar.
 *
 * Kasiyerin girişi telefonla değil PIN'le: vardiya değişiminde SMS beklemek
 * gerçekçi değil. Ama 4 hane tek başına 10.000 ihtimal demek — bu yüzden PIN
 * **yalnızca kayıtlı cihazda** çalışıyor (G11) ve yanlış denemede kilitleniyor.
 */

export const PIN_ROTASYON_GUNU = 90;
const MAX_PIN_DENEME = 5;
const PIN_KILIT_DK = 15;

/**
 * PIN hash'i — scrypt.
 *
 * docs/08 §5.4 argon2id yazıyordu; scrypt'e geçildi çünkü Node'un içinde
 * geliyor ve yerel derleme gerektiren bir bağımlılık eklemiyor. İkisi de
 * bellek-zorlayıcı; 4 haneli bir PIN için belirleyici olan zaten hash değil,
 * **cihaz bağlama ve kilitleme**.
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

/* ── Kayıtlı cihaz ────────────────────────────────────────── */

export async function cihazKaydet(opts: {
  cafeId: string;
  etiket: string;
  cihazId: string;
  kaydedenId: string;
}): Promise<void> {
  await withBypass("cihaz kaydı", (db) =>
    db.query(
      `INSERT INTO cafe_devices (id, cafe_id, label, device_id_hash, registered_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (cafe_id, device_id_hash) DO UPDATE SET active = true, label = excluded.label`,
      [newId("dev"), opts.cafeId, opts.etiket, identifierHash(opts.cihazId), opts.kaydedenId],
    ),
  );
}

export async function cihazKayitliMi(cafeId: string, cihazId: string): Promise<boolean> {
  const r = await withBypass("cihaz kontrolü", (db) =>
    db.one(`SELECT 1 FROM cafe_devices WHERE cafe_id = $1 AND device_id_hash = $2 AND active = true`, [
      cafeId,
      identifierHash(cihazId),
    ]),
  );
  return !!r;
}

/* ── Kasiyer girişi ───────────────────────────────────────── */

export type PinSonucu =
  | { durum: "gecerli"; staffId: string; ad: string }
  | { durum: "yanlis"; kalanDeneme: number }
  | { durum: "kilitli" }
  | { durum: "cihaz_kayitsiz" };

/**
 * PIN girişi. Üç şart birden: kafe onaylı, cihaz kayıtlı, PIN doğru.
 * Cihaz kayıtlı değilse PIN hiç denenmez — 10.000 ihtimali internete açmayalım.
 */
export async function pinGiris(opts: {
  cafeId: string;
  cihazId: string;
  pin: string;
}): Promise<PinSonucu> {
  if (!(await cihazKayitliMi(opts.cafeId, opts.cihazId))) {
    return { durum: "cihaz_kayitsiz" };
  }

  const anahtar = identifierHash(`${opts.cafeId}:${opts.cihazId}`).subarray(0, 8).toString("hex");
  const kota = await tuket("pin_per_device_15min", anahtar);
  if (!kota.izinli) {
    log.warn("pin kilitlendi", { kilitDk: PIN_KILIT_DK });
    return { durum: "kilitli" };
  }

  const personeller = await withBypass("pin girişi", (db) =>
    db.all<{ id: string; name_enc: Buffer; pin_hash: string }>(
      `SELECT id, name_enc, pin_hash FROM staff
        WHERE cafe_id = $1 AND role = 'cashier' AND active = true`,
      [opts.cafeId],
    ),
  );

  for (const p of personeller) {
    // Ad yalnızca EŞLEŞEN satır için çözülüyor: yanlış PIN denemesi,
    // kafedeki bütün kasiyerlerin adını belleğe açmanın bahanesi olmasın.
    if (await pinEslesiyorMu(opts.pin, p.pin_hash)) {
      return { durum: "gecerli", staffId: p.id, ad: decryptPII(p.name_enc) };
    }
  }

  return { durum: "yanlis", kalanDeneme: Math.max(0, MAX_PIN_DENEME - (MAX_PIN_DENEME - kota.kalan)) };
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

/**
 * Cihazın kayıtlı olduğu kafeyi bulur.
 *
 * Kasiyerin hangi kafede çalıştığını **yazması gerekmiyor**: tablet bir kez
 * kaydediliyor (G11), sonrası kendiliğinden. Sahada her vardiya başında kafe
 * seçtirmek, üç saniyede bitmesi gereken akışa gereksiz bir adım eklerdi.
 *
 * Kayıtsız cihazda null döner ve PIN hiç denenmez.
 */
export async function cihazinKafesi(cihazId: string): Promise<{ cafeId: string; ad: string } | null> {
  if (!cihazId) return null;

  const r = await withBypass("cihazın kafesi", (db) =>
    db.one<{ cafe_id: string; name: string }>(
      `SELECT d.cafe_id, c.name
         FROM cafe_devices d JOIN cafes c ON c.id = d.cafe_id
        WHERE d.device_id_hash = $1 AND d.active AND c.status = 'approved'
        LIMIT 1`,
      [identifierHash(cihazId)],
    ),
  );

  return r ? { cafeId: r.cafe_id, ad: r.name } : null;
}
