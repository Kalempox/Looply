import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { withCafe, withBypass, type Db } from "@/db/context";
import { encryptPII, decryptPII, phoneIndex } from "@/lib/crypto";
import { env } from "@/lib/env";
import { newId, safeCode } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";
import { slugla } from "@/lib/slug";

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
  /**
   * Ü126: işletmenin aranacak numarası — **maskelenmiyor.**
   *
   * Yetkilinin cebi kişisel veri ve tam hâli ayrı bir işlemle açılıyor
   * (`telefonuAc`, denetim izine düşüyor). Bu ise işletmenin müşterisine
   * zaten duyurduğu numara; maskeleseydik onaycının onu açmak için
   * kişisel veri açma yolunu kullanması gerekirdi ve denetim izi "kişisel
   * veri görüntülendi" diye dolardı.
   */
  isletmeTelefonu: string | null;
  durum: "pending" | "approved" | "suspended" | "rejected";
  basvuruTarihi: Date | null;
  redSebebi: string | null;
  belgeler: { id: string; tur: string; ad: string | null; boyut: number | null }[];
  /**
   * Ü125: bu bir şube başvurusuysa ana işletmenin adı, değilse `null`.
   *
   * Onaycının ilk bakışta ayırması gereken şey: sıfırdan bir işletme mi,
   * onayladığı bir işletmenin ikinci şubesi mi? Şubenin kendi belgesi yok
   * ve bu bilgi olmadan ekran "belge yüklenmemiş" yazıp onaycıyı yanlış
   * yöne çeker.
   */
  anaSubeAdi: string | null;
};

/* ── Başvuru ──────────────────────────────────────────────── */

export async function basvuruOlustur(opts: {
  ad: string;
  sehir: string;
  yetkiliAdi: string;
  /** Ü126: işletmenin aranacak numarası. Sabit hat olabilir, giriş kimliği değil. */
  isletmeTelefonu: string;
  yetkiliTelefon: string; // E.164 — giriş kimliği
}): Promise<{ cafeId: string } | { hata: "telefon_kayitli" | "slug_cakismasi" }> {
  const mevcut = await withBypass("başvuru kontrolü", (db) =>
    db.one(`SELECT 1 FROM staff WHERE phone_index = $1`, [phoneIndex(opts.yetkiliTelefon)]),
  );
  if (mevcut) return { hata: "telefon_kayitli" };

  const cafeId = newId("cafe");
  // Slug'a rastgele son ek: kafe adından tahmin edilebilir bir adres üretmeyelim
  const slug = `${slugla(opts.ad)}-${safeCode(4).toLowerCase()}`;

  await withBypass("kafe başvurusu", async (db) => {
    // Ü115: işletme adı (`name`), slug ve şehir düz kalıyor — bunlar
    // vitrindeki tabela ve oyuncunun gördüğü kafe. Yetkilinin adı ve iki
    // telefon şifreli: şahıs şirketinde üçü de kişisel veri.
    //
    // Ü126: `legal_name_enc`, `tax_no_enc` ve `address_enc` artık
    // yazılmıyor — başvuruda sorulmuyorlar. Kolonlar duruyor, eski
    // kayıtlarda dolu (göç 0037).
    await db.query(
      `INSERT INTO cafes
         (id, slug, name, city, contact_name_enc, contact_phone_enc,
          business_phone_enc, status, applied_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending', now())`,
      [
        cafeId,
        slug,
        opts.ad,
        opts.sehir,
        encryptPII(opts.yetkiliAdi),
        encryptPII(opts.yetkiliTelefon),
        encryptPII(opts.isletmeTelefonu),
      ],
    );
  });

  log.info("kafe basvurusu alindi", { sehir: opts.sehir });
  return { cafeId };
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
      legal_name_enc: Buffer | null;
      city: string | null;
      address_enc: Buffer | null;
      contact_name_enc: Buffer | null;
      contact_phone_enc: Buffer | null;
      business_phone_enc: Buffer | null;
      status: Basvuru["durum"];
      applied_at: Date | null;
      reject_reason: string | null;
      ana_sube_adi: string | null;
    }>(
      `SELECT c.id, c.name, c.legal_name_enc, c.city, c.address_enc,
              c.contact_name_enc, c.contact_phone_enc, c.business_phone_enc,
              c.status, c.applied_at, c.reject_reason,
              -- Ü125: şube başvurusuysa ana işletmenin adı. Kafe adı düz
              -- metin (Ü115), çözmek gerekmiyor.
              a.name AS ana_sube_adi
         FROM cafes c
         LEFT JOIN cafes a ON a.id = c.parent_cafe_id
        WHERE c.status = $1 ORDER BY c.applied_at DESC NULLS LAST`,
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
      yasalAd: s.legal_name_enc ? decryptPII(s.legal_name_enc) : null,
      sehir: s.city,
      adres: s.address_enc ? decryptPII(s.address_enc) : null,
      yetkiliAdi: s.contact_name_enc ? decryptPII(s.contact_name_enc) : null,
      yetkiliTelefonMaskeli: s.contact_phone_enc
        ? maskeliTelefon(decryptPII(s.contact_phone_enc))
        : null,
      isletmeTelefonu: s.business_phone_enc ? decryptPII(s.business_phone_enc) : null,
      durum: s.status,
      basvuruTarihi: s.applied_at,
      redSebebi: s.reject_reason,
      anaSubeAdi: s.ana_sube_adi,
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
    const kafe = await db.one<{
      contact_phone_enc: Buffer | null;
      contact_name_enc: Buffer | null;
      status: string;
    }>(`SELECT contact_phone_enc, contact_name_enc, status FROM cafes WHERE id = $1`, [cafeId]);
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

    // Ü115: yetkilinin adı şifreli duruyor. Çözüp yeniden şifrelemek
    // gereksiz görünebilir ama blob'u kopyalamak yanlış olurdu — iki
    // kolonun anahtar sürümü ileride (A2, rotasyon) ayrışabilir ve
    // kopyalanmış blob sessizce eski sürümde kalırdı.
    const yetkiliAdi = kafe.contact_name_enc ? decryptPII(kafe.contact_name_enc) : "Yönetici";

    await db.query(
      `INSERT INTO staff (id, cafe_id, name_enc, pin_hash, role, phone_index, phone_enc)
       VALUES ($1,$2,$3,'-','manager',$4,$5)`,
      [newId("stf"), cafeId, encryptPII(yetkiliAdi), phoneIndex(telefon), encryptPII(telefon)],
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
 * Telefonla yöneticinin **bütün** kafelerini bulur (Ü101).
 *
 * **Yalnızca onaylı kafeler** — G5'in giriş tarafındaki karşılığı.
 *
 * ── ⚠️ Neden çoğul ──────────────────────────────────────────
 *
 * `staff` satırı kafe başına; aynı kişi iki şubede yönetici olabiliyor ve
 * şema bunu hep destekliyordu. Önceki sürüm `db.one` kullanıyordu ve o
 * **rows[0]** demek: iki şubeli sahip, sıralaması belirsiz bir sorgudan
 * dönen rastgele bir şubeye düşerdi ve panelde neden öbür şubeyi
 * göremediğini anlayamazdı. Bugün veritabanında çok şubeli yönetici yok —
 * yani hata henüz yaşanmadı, ama kapı açıktı.
 *
 * Sıralama ada göre: seçim ekranı her girişte aynı düzende çıksın.
 */
export async function yoneticiKafeleri(telefon: string): Promise<Yonetici[]> {
  const satirlar = await withBypass("yönetici arama", (db) =>
    db.all<{ id: string; cafe_id: string; name_enc: Buffer; kafe_adi: string }>(
      `SELECT s.id, s.cafe_id, s.name_enc, c.name AS kafe_adi
         FROM staff s JOIN cafes c ON c.id = s.cafe_id
        WHERE s.phone_index = $1
          AND s.role = 'manager'
          AND s.active = true
          AND c.status = 'approved'
        ORDER BY c.name, c.id`,
      [phoneIndex(telefon)],
    ),
  );

  return satirlar.map((r) => ({
    staffId: r.id,
    cafeId: r.cafe_id,
    ad: decryptPII(r.name_enc),
    kafeAdi: r.kafe_adi,
  }));
}

/** Tek kafe bekleyen çağıranlar için — ilk kafeyi veriyor. */
export async function yoneticiBul(telefon: string): Promise<Yonetici | null> {
  const hepsi = await yoneticiKafeleri(telefon);
  return hepsi[0] ?? null;
}

/**
 * Bu yönetici bu kafeye geçebilir mi? (Ü101)
 *
 * ⚠️ Şube değiştirme isteği istemciden geliyor ve **doğrulanmadan**
 * uygulanamaz: aksi hâlde herhangi bir yönetici, kafe kimliğini yazarak
 * başka bir işletmenin paneline girerdi. Değişmez kural #3'ün buradaki
 * karşılığı — `cafe_id` oturumdan geliyor ve oturuma yazılmadan önce
 * personel kaydıyla eşleşmesi gerekiyor.
 */
export async function subeyeGecebilirMi(
  staffId: string,
  hedefCafeId: string,
): Promise<Yonetici | null> {
  const r = await withBypass("şube değiştirme yetkisi", (db) =>
    db.one<{ id: string; cafe_id: string; name_enc: Buffer; kafe_adi: string }>(
      `SELECT h.id, h.cafe_id, h.name_enc, c.name AS kafe_adi
         FROM staff s
         JOIN staff h ON h.phone_index = s.phone_index
                     AND h.role = 'manager' AND h.active
         JOIN cafes c ON c.id = h.cafe_id AND c.status = 'approved'
        WHERE s.id = $1 AND h.cafe_id = $2`,
      [staffId, hedefCafeId],
    ),
  );

  return r
    ? { staffId: r.id, cafeId: r.cafe_id, ad: decryptPII(r.name_enc), kafeAdi: r.kafe_adi }
    : null;
}

/** Oturumdaki yöneticinin erişebildiği kafeler — panel başlığı için. */
export async function subeler(staffId: string): Promise<Yonetici[]> {
  const satirlar = await withBypass("yöneticinin şubeleri", (db) =>
    db.all<{ id: string; cafe_id: string; name_enc: Buffer; kafe_adi: string }>(
      `SELECT h.id, h.cafe_id, h.name_enc, c.name AS kafe_adi
         FROM staff s
         JOIN staff h ON h.phone_index = s.phone_index
                     AND h.role = 'manager' AND h.active
         JOIN cafes c ON c.id = h.cafe_id AND c.status = 'approved'
        WHERE s.id = $1
        ORDER BY c.name, c.id`,
      [staffId],
    ),
  );

  return satirlar.map((r) => ({
    staffId: r.id,
    cafeId: r.cafe_id,
    ad: decryptPII(r.name_enc),
    kafeAdi: r.kafe_adi,
  }));
}

/* ── Şube başvurusu — panelden (Ü125) ──────────────────────── */

export type SubeSonucu = { ok: true; cafeId: string } | { ok: false; hata: string };

/**
 * Sahibin kendi panelinden açtığı ikinci şube.
 *
 * ── Neden ayrı bir yol ──────────────────────────────────────
 *
 * `basvuruOlustur` bu işi yapamaz: ilk satırı *"bu telefon zaten kayıtlı"*
 * diye reddediyor ve o blok **kasten** duruyor (0026). Kaldırılsaydı tek
 * numarayla sınırsız kafe başvurusunun yolu açılırdı. Şube ise zaten
 * onaylanmış bir işletmenin ikinci adresi: tüzel kişi aynı, vergi
 * numarası aynı, yetkili aynı kişi.
 *
 * Bu yüzden sahibin gireceği alan üçe iniyor — **ad, şehir, adres**.
 * Ticari unvan, vergi numarası ve yetkili bilgileri ana şubeden
 * kopyalanıyor; sahibine kendi vergi numarasını yeniden yazdırmak hem
 * gereksiz hem de yanlış yazma riski.
 *
 * ── 🔴 `pending` doğuyor, G5 duruyor ────────────────────────
 *
 * Şube onaysız açılsaydı panelden onaysız kafe üretmenin yolu açılırdı
 * ve "aynı vergi numarası" şartı bunu engellemezdi — numara zaten ana
 * şubeden kopyalanıyor. Platformun onay ekranı bu kaydı olduğu gibi
 * karşılıyor; `onayla()` değişmedi.
 *
 * ── Onaylanınca şube bağı kendiliğinden kuruluyor ───────────
 *
 * `onayla()` yönetici satırını kafenin `contact_phone_enc` alanından
 * üretiyor. Buraya sahibin **kendi** numarasını yazdığımız için onay
 * anında aynı `phone_index`le ikinci bir yönetici satırı doğuyor ve
 * `subeler()` ikisini o numaradan eşleştiriyor. Yani onay akışına tek
 * satır eklemek gerekmedi; `staff_kafe_phone_idx` de `(cafe_id,
 * phone_index)` üzerinde olduğu için çakışma yok (0026).
 *
 * ── Kopyalama neden başvuru anında ──────────────────────────
 *
 * Ürünler, kategoriler ve ödül kataloğu burada kopyalanıyor — onayda
 * değil. Onayda kopyalansaydı `onayla()` iki farklı kafenin verisine
 * dokunan bir işe dönerdi; oysa oradaki tek iş G5 kapısını açmak.
 *
 * ⚠️ **Bütçe ve konum kopyalanmıyor.** Bütçe ayrı bir para taahhüdü —
 * devralınsaydı sahibi hiç onaylamadığı bir günlük gideri üstlenirdi.
 * Konum ise K2'nin dayanağı ve şubenin kendi koordinatı olmak zorunda;
 * kopyalansaydı yeni şube ana şubenin kapısında doğrulama yapardı ve
 * oradaki oyuncular ödül kazanırdı. Personel ve masalar da şubeye özel.
 */
export async function subeBasvurusu(opts: {
  /** Sahibin şu an açık olan şubesi — oturumdan gelir. */
  cafeId: string;
  /** Oturumdaki yönetici personel satırı. */
  staffId: string;
  ad: string;
  sehir: string;
}): Promise<SubeSonucu> {
  const ad = opts.ad.trim();
  const sehir = opts.sehir.trim();

  if (ad.length < 2 || ad.length > 80) {
    return { ok: false, hata: "Şube adı 2 ile 80 karakter arasında olmalı." };
  }
  if (sehir.length < 2 || sehir.length > 40) {
    return { ok: false, hata: "Şehir 2 ile 40 karakter arasında olmalı." };
  }

  return withBypass("şube başvurusu — ana şubeden devralma", async (db) => {
    // Yönetici satırı ve ana kafe tek sorguda: personelin gerçekten bu
    // kafenin yöneticisi olduğu da burada doğrulanıyor. `staffId` oturumdan
    // geliyor ama kafeyle eşleşmesi ayrıca aranıyor — Değişmez kural #3.
    const kaynak = await db.one<{
      kok_id: string;
      legal_name_enc: Buffer | null;
      tax_no_enc: Buffer | null;
      business_phone_enc: Buffer | null;
      name_enc: Buffer;
      phone_enc: Buffer | null;
    }>(
      `SELECT COALESCE(c.parent_cafe_id, c.id) AS kok_id,
              c.legal_name_enc, c.tax_no_enc, c.business_phone_enc,
              s.name_enc, s.phone_enc
         FROM staff s
         JOIN cafes c ON c.id = s.cafe_id
        WHERE s.id = $1 AND s.cafe_id = $2
          AND s.role = 'manager' AND s.active
          AND c.status = 'approved'`,
      [opts.staffId, opts.cafeId],
    );

    if (!kaynak) {
      return { ok: false as const, hata: "Bu işlem için onaylı bir şubenin yöneticisi olmalısın." };
    }
    if (!kaynak.phone_enc) {
      // Yöneticinin numarası yoksa onay anında `staff` satırı üretilemez ve
      // şube sahipsiz kalırdı — sessizce açıp sonra şaşırmaktansa burada dur.
      return { ok: false as const, hata: "Yetkili telefonun kayıtlı değil. Destekle görüş." };
    }

    const telefon = decryptPII(kaynak.phone_enc);
    const yeniId = newId("cafe");
    const slug = `${slugla(ad)}-${safeCode(4).toLowerCase()}`;

    // Ü126: adres alanı kalktı, işletme telefonu ana şubeden devralınıyor —
    // ticari unvan ve vergi numarasıyla aynı mantık: aynı tüzel kişi.
    await db.query(
      `INSERT INTO cafes
         (id, slug, name, legal_name_enc, tax_no_enc, city,
          contact_name_enc, contact_phone_enc, business_phone_enc,
          status, applied_at, parent_cafe_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending', now(), $10)`,
      [
        yeniId,
        slug,
        ad,
        kaynak.legal_name_enc,
        kaynak.tax_no_enc,
        sehir,
        kaynak.name_enc,
        encryptPII(telefon),
        kaynak.business_phone_enc,
        kaynak.kok_id,
      ],
    );

    await kurulumuKopyala(db, opts.cafeId, yeniId);

    await audit(db, {
      actorType: "staff",
      actorId: opts.staffId,
      cafeId: opts.cafeId,
      action: "cafe.branch_apply",
      targetType: "cafe",
      targetId: yeniId,
      detail: { sehir },
    });

    log.info("sube basvurusu alindi", { sehir });
    return { ok: true as const, cafeId: yeniId };
  });
}

/**
 * Ana şubenin menüsünü ve ödül kataloğunu yeni şubeye kopyalar.
 *
 * ⚠️ **Kimlikler yeniden üretiliyor, kopyalanmıyor.** `products.id` birincil
 * anahtar; aynı satırı iki kafeye aynı kimlikle yazmak mümkün değil. Bu
 * yüzden eski→yeni kimlik haritası tutuluyor ve bağlantılar (`category_id`,
 * `product_id`) yeni kimliklere çevriliyor. Çevrilmeseydi yeni şubenin
 * ödülleri **ana şubenin ürünlerine** bağlı kalır, kiracı izolasyonunu
 * satır düzeyinde delen bir bağ doğardı.
 *
 * Sıra zorunlu: kategoriler → ürünler (kategoriye bakıyor) → ödüller
 * (ürüne bakıyor).
 *
 * ⚠️ Pasif satırlar da geliyor. Sahibi ana şubede bir ürünü kapattıysa
 * bu bir karar; yeni şubede sessizce açılmış bulmak sürpriz olurdu.
 */
async function kurulumuKopyala(db: Db, kaynakCafeId: string, hedefCafeId: string): Promise<void> {
  const kategoriler = await db.all<{
    id: string;
    name: string;
    kind: string;
    sort_order: number;
    active: boolean;
  }>(
    `SELECT id, name, kind, sort_order, active FROM product_categories WHERE cafe_id = $1`,
    [kaynakCafeId],
  );

  const kategoriHaritasi = new Map<string, string>();
  for (const k of kategoriler) {
    const yeni = newId("ktg");
    kategoriHaritasi.set(k.id, yeni);
    await db.query(
      `INSERT INTO product_categories (id, cafe_id, name, kind, sort_order, active)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [yeni, hedefCafeId, k.name, k.kind, k.sort_order, k.active],
    );
  }

  const urunler = await db.all<{
    id: string;
    name: string;
    price_kurus: string;
    active: boolean;
    category_id: string | null;
  }>(`SELECT id, name, price_kurus, active, category_id FROM products WHERE cafe_id = $1`, [
    kaynakCafeId,
  ]);

  const urunHaritasi = new Map<string, string>();
  for (const u of urunler) {
    const yeni = newId("prd");
    urunHaritasi.set(u.id, yeni);
    await db.query(
      `INSERT INTO products (id, cafe_id, name, price_kurus, active, category_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        yeni,
        hedefCafeId,
        u.name,
        u.price_kurus,
        u.active,
        u.category_id ? (kategoriHaritasi.get(u.category_id) ?? null) : null,
      ],
    );
  }

  const oduller = await db.all<{
    kind: string;
    title: string;
    description: string | null;
    points_price: number;
    cost_kurus: string;
    min_proof_level: number;
    sort_order: number;
    active: boolean;
    reward_type: string;
    percent: number | null;
    product_id: string | null;
    daily_limit: number | null;
    usable_days: number[] | null;
    usable_from_hour: number | null;
    usable_to_hour: number | null;
    wheel_weight: number | null;
  }>(
    `SELECT kind, title, description, points_price, cost_kurus, min_proof_level,
            sort_order, active, reward_type, percent, product_id, daily_limit,
            usable_days, usable_from_hour, usable_to_hour, wheel_weight
       FROM rewards WHERE cafe_id = $1`,
    [kaynakCafeId],
  );

  for (const o of oduller) {
    await db.query(
      `INSERT INTO rewards
         (id, cafe_id, kind, title, description, points_price, cost_kurus, min_proof_level,
          sort_order, active, reward_type, percent, product_id, daily_limit,
          usable_days, usable_from_hour, usable_to_hour, wheel_weight)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        newId("rwd"),
        hedefCafeId,
        o.kind,
        o.title,
        o.description,
        o.points_price,
        o.cost_kurus,
        o.min_proof_level,
        o.sort_order,
        o.active,
        o.reward_type,
        o.percent,
        o.product_id ? (urunHaritasi.get(o.product_id) ?? null) : null,
        o.daily_limit,
        o.usable_days,
        o.usable_from_hour,
        o.usable_to_hour,
        o.wheel_weight,
      ],
    );
  }

  log.info("sube kurulumu kopyalandi", {
    kategori: kategoriler.length,
    urun: urunler.length,
    odul: oduller.length,
  });
}

/**
 * Sahibin bütün şubeleri — onay bekleyenler dahil (Ü125).
 *
 * `subeler()` yalnızca **onaylıları** veriyor ve vermeli: oturum
 * değiştirilebilecek yerlerin listesi o. Bu ise şube yönetim ekranının
 * listesi — sahibi başvurusunun nerede olduğunu görebilmeli, yoksa formu
 * ikinci kez doldurur.
 *
 * Bağ `parent_cafe_id` üzerinden değil yine **telefon** üzerinden kuruluyor
 * (0026): onaylı şubelerde yönetici satırı var ve tek doğru kaynak o.
 * Bekleyen şubede henüz personel satırı yok — onay onu üretecek — bu yüzden
 * onlar `cafes.parent_cafe_id` ile kökten toplanıyor.
 */
export type SubeDurumu = {
  cafeId: string;
  kafeAdi: string;
  sehir: string | null;
  durum: Basvuru["durum"];
  redSebebi: string | null;
  /** Oturumun şu an açık olduğu şube mi. */
  acikOlan: boolean;
};

export async function subeDurumlari(
  staffId: string,
  acikCafeId: string,
): Promise<SubeDurumu[]> {
  const satirlar = await withBypass("şube yönetimi listesi", (db) =>
    db.all<{
      id: string;
      name: string;
      city: string | null;
      status: Basvuru["durum"];
      reject_reason: string | null;
    }>(
      `WITH kok AS (
         SELECT COALESCE(c.parent_cafe_id, c.id) AS id
           FROM staff s JOIN cafes c ON c.id = s.cafe_id
          WHERE s.id = $1
       )
       SELECT c.id, c.name, c.city, c.status, c.reject_reason
         FROM cafes c, kok
        WHERE c.id = kok.id OR c.parent_cafe_id = kok.id
        ORDER BY c.parent_cafe_id NULLS FIRST, c.applied_at`,
      [staffId],
    ),
  );

  return satirlar.map((r) => ({
    cafeId: r.id,
    kafeAdi: r.name,
    sehir: r.city,
    durum: r.status,
    redSebebi: r.reject_reason,
    acikOlan: r.id === acikCafeId,
  }));
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
