import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { withCafe, withBypass } from "@/db/context";
import { encryptPII, decryptPII, phoneIndex } from "@/lib/crypto";
import { env } from "@/lib/env";
import { newId, safeCode } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";

/**
 * Kafe başvurusu, onayı ve personeli.
 *
 * G5: onaysız kafe sistemde hiçbir şey yapamaz — karekod üretilmez,
 * kupon dağıtılmaz, panel açılmaz. Sahte kafe kaydıyla kupon üretmenin
 * önündeki tek engel bu.
 */

const BELGE_DIZINI = path.join(process.cwd(), "belgeler");
const MAX_BELGE_BAYT = 8 * 1024 * 1024;

const IZINLI_TURLER: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export type Basvuru = {
  id: string;
  ad: string;
  yasalAd: string | null;
  sehir: string | null;
  adres: string | null;
  yetkiliAdi: string | null;
  /**
   * G9 / docs/08 §3: listede HERKESE maskeli gösterilir — destek rolüne de.
   * Tam numarayı görmek ayrı bir işlem ve denetim izine düşer (`telefonuAc`).
   */
  yetkiliTelefonMaskeli: string | null;
  durum: "pending" | "approved" | "suspended" | "rejected";
  basvuruTarihi: Date | null;
  redSebebi: string | null;
  belgeler: { id: string; tur: string; ad: string | null; boyut: number | null }[];
};

/* ── Başvuru ──────────────────────────────────────────────── */

export async function basvuruOlustur(opts: {
  ad: string;
  yasalAd: string;
  vergiNo: string;
  sehir: string;
  adres: string;
  yetkiliAdi: string;
  yetkiliTelefon: string; // E.164
}): Promise<{ cafeId: string } | { hata: "telefon_kayitli" | "slug_cakismasi" }> {
  const mevcut = await withBypass("başvuru kontrolü", (db) =>
    db.one(`SELECT 1 FROM staff WHERE phone_index = $1`, [phoneIndex(opts.yetkiliTelefon)]),
  );
  if (mevcut) return { hata: "telefon_kayitli" };

  const cafeId = newId("cafe");
  // Slug'a rastgele son ek: kafe adından tahmin edilebilir bir adres üretmeyelim
  const slug = `${slugla(opts.ad)}-${safeCode(4).toLowerCase()}`;

  await withBypass("kafe başvurusu", async (db) => {
    await db.query(
      `INSERT INTO cafes
         (id, slug, name, legal_name, tax_no_enc, city, address,
          contact_name, contact_phone_enc, status, applied_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending', now())`,
      [
        cafeId,
        slug,
        opts.ad,
        opts.yasalAd,
        encryptPII(opts.vergiNo),
        opts.sehir,
        opts.adres,
        opts.yetkiliAdi,
        encryptPII(opts.yetkiliTelefon),
      ],
    );
  });

  log.info("kafe basvurusu alindi", { sehir: opts.sehir });
  return { cafeId };
}

function slugla(ad: string): string {
  const harita: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return ad
    .split("")
    .map((h) => harita[h] ?? h)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

/* ── Belge ────────────────────────────────────────────────── */

/**
 * Belgeyi şifreleyip diske yazar.
 *
 * Vergi levhası kişisel/ticari veri taşır; düz dosya olarak durmaz.
 * Canlıda nesne depolamaya taşınacak — arayüz aynı kalır.
 */
export async function belgeYukle(
  cafeId: string,
  tur: "tax_certificate" | "business_license" | "other",
  dosya: File,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  const uzanti = IZINLI_TURLER[dosya.type];
  if (!uzanti) return { ok: false, hata: "Yalnızca PDF, JPG veya PNG yükleyebilirsin" };
  if (dosya.size > MAX_BELGE_BAYT) return { ok: false, hata: "Dosya 8 MB'dan büyük olamaz" };
  if (dosya.size === 0) return { ok: false, hata: "Dosya boş görünüyor" };

  const anahtar = Buffer.from(env().PII_ENC_KEY, "base64");
  const nonce = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", anahtar, nonce);
  const ham = Buffer.from(await dosya.arrayBuffer());
  const sifreli = Buffer.concat([nonce, c.update(ham), c.final(), c.getAuthTag()]);

  const dosyaAnahtari = `${newId("blg")}.${uzanti}.enc`;
  await mkdir(BELGE_DIZINI, { recursive: true });
  await writeFile(path.join(BELGE_DIZINI, dosyaAnahtari), sifreli);

  await withBypass("belge kaydı", (db) =>
    db.query(
      `INSERT INTO cafe_documents (id, cafe_id, kind, file_key, original_name, size_bytes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [newId("cdoc"), cafeId, tur, dosyaAnahtari, dosya.name.slice(0, 120), dosya.size],
    ),
  );

  log.info("kafe belgesi yuklendi", { tur, boyut: dosya.size });
  return { ok: true };
}

/** Belgeyi çözer. Yalnızca platform inceleme ekranından çağrılır. */
export async function belgeOku(dosyaAnahtari: string): Promise<Buffer> {
  const sifreli = await readFile(path.join(BELGE_DIZINI, dosyaAnahtari));
  const anahtar = Buffer.from(env().PII_ENC_KEY, "base64");
  const nonce = sifreli.subarray(0, 12);
  const etiket = sifreli.subarray(sifreli.length - 16);
  const govde = sifreli.subarray(12, sifreli.length - 16);

  const d = createDecipheriv("aes-256-gcm", anahtar, nonce);
  d.setAuthTag(etiket);
  return Buffer.concat([d.update(govde), d.final()]);
}

/* ── İnceleme ─────────────────────────────────────────────── */

export async function basvurulariListele(
  durum: Basvuru["durum"] = "pending",
): Promise<Basvuru[]> {
  const satirlar = await withBypass("başvuru listesi", (db) =>
    db.all<{
      id: string;
      name: string;
      legal_name: string | null;
      city: string | null;
      address: string | null;
      contact_name: string | null;
      contact_phone_enc: Buffer | null;
      status: Basvuru["durum"];
      applied_at: Date | null;
      reject_reason: string | null;
    }>(
      `SELECT id, name, legal_name, city, address, contact_name, contact_phone_enc,
              status, applied_at, reject_reason
         FROM cafes WHERE status = $1 ORDER BY applied_at DESC NULLS LAST`,
      [durum],
    ),
  );

  const sonuc: Basvuru[] = [];
  for (const s of satirlar) {
    const belgeler = await withBypass("başvuru belgeleri", (db) =>
      db.all<{ id: string; kind: string; original_name: string | null; size_bytes: number | null }>(
        `SELECT id, kind, original_name, size_bytes FROM cafe_documents WHERE cafe_id = $1`,
        [s.id],
      ),
    );
    sonuc.push({
      id: s.id,
      ad: s.name,
      yasalAd: s.legal_name,
      sehir: s.city,
      adres: s.address,
      yetkiliAdi: s.contact_name,
      yetkiliTelefonMaskeli: s.contact_phone_enc
        ? maskeliTelefon(decryptPII(s.contact_phone_enc))
        : null,
      durum: s.status,
      basvuruTarihi: s.applied_at,
      redSebebi: s.reject_reason,
      belgeler: belgeler.map((b) => ({
        id: b.id,
        tur: b.kind,
        ad: b.original_name,
        boyut: b.size_bytes,
      })),
    });
  }
  return sonuc;
}

function maskeliTelefon(e164: string): string {
  const n = e164.replace("+90", "");
  return `0${n.slice(0, 3)} *** ** ${n.slice(8)}`;
}

/**
 * Yetkilinin tam telefon numarasını açar — **yalnızca platform yöneticisi**.
 *
 * docs/08 §3: kişisel veri okumak kayıt tutmakla yetinilecek bir şey değil;
 * her açış gerekçesiyle birlikte denetim izine düşer. Liste ekranı bu yüzden
 * hiçbir role tam numara göstermiyor — tek tek, bilerek açılıyor.
 */
export async function telefonuAc(
  cafeId: string,
  acanId: string,
  gerekce: string,
): Promise<string | null> {
  return withBypass("yetkili telefonu açma", async (db) => {
    const r = await db.one<{ contact_phone_enc: Buffer | null }>(
      `SELECT contact_phone_enc FROM cafes WHERE id = $1`,
      [cafeId],
    );
    if (!r?.contact_phone_enc) return null;

    await audit(db, {
      actorType: "platform",
      actorId: acanId,
      cafeId,
      action: "pii.view",
      targetType: "cafe_contact",
      targetId: cafeId,
      detail: { gerekce: gerekce.slice(0, 200) },
    });

    log.warn("yetkili telefonu goruntulendi", { cafeId });
    return decryptPII(r.contact_phone_enc);
  });
}

/**
 * Kafeyi onaylar ve yönetici hesabını açar.
 *
 * Yönetici hesabı ancak burada doğuyor: onaysız bir kafenin yöneticisi
 * giriş yapamaz, çünkü hesabı yok.
 */
export async function onayla(
  cafeId: string,
  onaylayanId: string,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  return withBypass("kafe onayı", async (db) => {
    const kafe = await db.one<{ contact_phone_enc: Buffer | null; contact_name: string | null; status: string }>(
      `SELECT contact_phone_enc, contact_name, status FROM cafes WHERE id = $1`,
      [cafeId],
    );
    if (!kafe) return { ok: false as const, hata: "Başvuru bulunamadı" };
    if (kafe.status === "approved") return { ok: false as const, hata: "Bu kafe zaten onaylı" };
    if (!kafe.contact_phone_enc) return { ok: false as const, hata: "Yetkili telefonu eksik" };

    const telefon = decryptPII(kafe.contact_phone_enc);

    await db.query(
      `UPDATE cafes SET status = 'approved', approved_at = now(), approved_by = $2,
                        reject_reason = NULL
        WHERE id = $1`,
      [cafeId, onaylayanId],
    );

    await db.query(
      `INSERT INTO staff (id, cafe_id, name, pin_hash, role, phone_index, phone_enc)
       VALUES ($1,$2,$3,'-','manager',$4,$5)`,
      [
        newId("stf"),
        cafeId,
        kafe.contact_name ?? "Yönetici",
        phoneIndex(telefon),
        encryptPII(telefon),
      ],
    );

    await db.query(
      `UPDATE cafe_documents SET status = 'accepted', reviewed_at = now(), reviewed_by = $2
        WHERE cafe_id = $1`,
      [cafeId, onaylayanId],
    );

    await audit(db, {
      actorType: "platform",
      actorId: onaylayanId,
      cafeId,
      action: "cafe.approve",
      targetType: "cafe",
      targetId: cafeId,
    });

    log.info("kafe onaylandi", { cafeId });
    return { ok: true as const };
  });
}

export async function reddet(cafeId: string, onaylayanId: string, sebep: string): Promise<void> {
  await withBypass("kafe reddi", async (db) => {
    await db.query(
      `UPDATE cafes SET status = 'rejected', reject_reason = $2, approved_by = $3 WHERE id = $1`,
      [cafeId, sebep, onaylayanId],
    );
    await audit(db, {
      actorType: "platform",
      actorId: onaylayanId,
      cafeId,
      action: "cafe.reject",
      targetType: "cafe",
      targetId: cafeId,
      detail: { sebep },
    });
  });
  log.info("kafe basvurusu reddedildi");
}

/* ── Kafe yöneticisi girişi ───────────────────────────────── */

export type Yonetici = { staffId: string; cafeId: string; ad: string; kafeAdi: string };

/**
 * Telefonla yönetici arar.
 * **Yalnızca onaylı kafenin yöneticisi bulunur** — G5'in giriş tarafındaki karşılığı.
 */
export async function yoneticiBul(telefon: string): Promise<Yonetici | null> {
  const r = await withBypass("yönetici arama", (db) =>
    db.one<{ id: string; cafe_id: string; name: string; kafe_adi: string }>(
      `SELECT s.id, s.cafe_id, s.name, c.name AS kafe_adi
         FROM staff s JOIN cafes c ON c.id = s.cafe_id
        WHERE s.phone_index = $1
          AND s.role = 'manager'
          AND s.active = true
          AND c.status = 'approved'`,
      [phoneIndex(telefon)],
    ),
  );
  return r ? { staffId: r.id, cafeId: r.cafe_id, ad: r.name, kafeAdi: r.kafe_adi } : null;
}

/* ── Kafe konumu ───────────────────────────────────────────── */

export type KonumSonucu = { ok: true } | { ok: false; hata: string };

/**
 * Kafenin coğrafi konumunu belirler.
 *
 * ── Neden bu ekran var ──────────────────────────────────────
 *
 * K2 (konum doğrulama) kafenin koordinatına göre ölçülüyor. Koordinat yoksa
 * `konumDogrula` hiçbir zaman doğrulayamıyor ve o kafede **hiç kimse hiçbir
 * şey kazanamıyor** — ne puan, ne XP, ne kupon, ne taht.
 *
 * Bu, gerçek başvuru akışından geçmiş onaylı bir kafede fiilen yaşandı:
 * koordinatı yalnızca tohum betiği yazıyordu, panelde alanı yoktu. Kafe
 * kurulumunu tamamlıyor, karekodlarını yapıştırıyor ve ürün sessizce
 * çalışmıyordu.
 *
 * ── Neden adres değil koordinat ─────────────────────────────
 *
 * Başvuruda adres zaten var ama adres → koordinat çevirimi bir dış servis
 * (geocoding) demek: yeni bağımlılık, yeni maliyet, yeni veri aktarımı ve
 * yanlış eşleşme riski. Kafe sahibi zaten kafede duruyor — telefonunun
 * konumunu okumak hem daha doğru hem bedava.
 *
 * ── Saklanan şey ────────────────────────────────────────────
 *
 * Kafenin koordinatı **işletme verisi**, kişisel veri değil; açıkta duruyor.
 * Oyuncunun koordinatı ise hiç saklanmıyor — yalnızca aradaki mesafe
 * (docs/08 §7.1).
 */
export async function konumBelirle(opts: {
  cafeId: string;
  lat: number;
  lng: number;
  aktorId: string;
}): Promise<KonumSonucu> {
  const { lat, lng } = opts;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, hata: "Konum okunamadı. Tekrar dene." };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, hata: "Konum geçerli aralıkta değil." };
  }
  // 0,0 Gine Körfezi'nde bir nokta — "konum alınamadı" hâlinin en yaygın
  // sessiz çıktısı. Kaydedilirse kafe dünyanın öbür ucunda görünür ve K2
  // yine hiç doğrulanmaz; hatayı sessizce kalıcılaştırmaktansa reddediyoruz.
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
    return { ok: false, hata: "Konum okunamadı. Kafenin içinde tekrar dene." };
  }

  await withCafe(opts.cafeId, async (db) => {
    await db.query(`UPDATE cafes SET lat = $2, lng = $3 WHERE id = $1`, [opts.cafeId, lat, lng]);
    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "cafe.location",
      targetType: "cafe",
      targetId: opts.cafeId,
      // Koordinat **yazılmıyor.** İlk hâli `{ lat, lng }` yazıyordu ve
      // `lib/log.ts`in yasaklı alan koruması bunu testte kırdı — haklı
      // olarak: kural alan adına bakıyor, "bu sefer kafenin koordinatı"
      // gibi bir istisna tanımıyor ve tanımamalı da. Bir kez gevşetilen
      // kural, ikinci sefer oyuncunun koordinatını geçirir.
      //
      // Kaybedilen şey "önceki değer neydi"; kalan şey kim, ne zaman ve
      // hangi kafede işaretledi. Güncel koordinat zaten `cafes` satırında.
      detail: { islem: "konum_isaretlendi" },
    });
  });

  return { ok: true };
}

/** Kafenin konumu belirlenmiş mi — panel uyarısının kaynağı. */
export async function konumVarMi(cafeId: string): Promise<{ var: boolean; lat: number | null; lng: number | null }> {
  const r = await withCafe(cafeId, (db) =>
    db.one<{ lat: number | null; lng: number | null }>(`SELECT lat, lng FROM cafes`),
  );
  return { var: r?.lat != null && r?.lng != null, lat: r?.lat ?? null, lng: r?.lng ?? null };
}
