import { withBypass, type Db } from "@/db/context";
import { encryptPII, decryptPII, phoneIndex, identifierHash } from "@/lib/crypto";
import { newId, aliasCode } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";
import { maskele } from "@/sms";

/**
 * Oyuncu hesabı.
 *
 * G13: hesap ANCAK doğrulama kodu geçtikten sonra yazılır. Formu dolduran
 * ama kodu girmeyen kimsenin numarası veritabanında kalıcı olarak durmaz.
 *
 * Kişisel alanlar şifreli, telefon ayrıca kör indeksli (docs/08 §5.2).
 */

export const RIZA_SURUMU = "v0-taslak-2026-08";

export type Oyuncu = {
  id: string;
  telefon: string; // çözülmüş, YALNIZCA sunucu tarafında
  ad: string;
  soyad: string;
  olusturuldu: Date;
  numaraDegisti: Date | null;
};

/** İstemciye giden biçim — tam numara asla dışarı çıkmaz. */
export type OyuncuGorunum = {
  id: string;
  ad: string;
  soyad: string;
  telefonMaskeli: string;
  odulKilidiBitis: Date | null;
};

function coz(satir: {
  id: string;
  phone_enc: Buffer;
  first_name_enc: Buffer;
  last_name_enc: Buffer;
  created_at: Date;
  phone_changed_at: Date | null;
}): Oyuncu {
  return {
    id: satir.id,
    telefon: decryptPII(satir.phone_enc),
    ad: decryptPII(satir.first_name_enc),
    soyad: decryptPII(satir.last_name_enc),
    olusturuldu: satir.created_at,
    numaraDegisti: satir.phone_changed_at,
  };
}

const ALANLAR = `id, phone_enc, first_name_enc, last_name_enc, created_at, phone_changed_at`;

export async function telefonlaBul(telefon: string): Promise<Oyuncu | null> {
  const r = await withBypass("oyuncu arama", (db) =>
    db.one<Parameters<typeof coz>[0]>(
      `SELECT ${ALANLAR} FROM players WHERE phone_index = $1 AND anonymized_at IS NULL`,
      [phoneIndex(telefon)],
    ),
  );
  return r ? coz(r) : null;
}

export async function idIleBul(playerId: string): Promise<Oyuncu | null> {
  const r = await withBypass("oyuncu okuma", (db) =>
    db.one<Parameters<typeof coz>[0]>(`SELECT ${ALANLAR} FROM players WHERE id = $1`, [playerId]),
  );
  return r ? coz(r) : null;
}

/**
 * Kayıt — yalnızca doğrulama kodu geçtikten sonra çağrılır (G13).
 * Numara zaten kayıtlıysa mevcut hesap döner; yeni hesap açılmaz.
 */
export async function kaydet(opts: {
  telefon: string;
  ad: string;
  soyad: string;
  dogumYili: number;
  pazarlamaIzni: boolean;
  ip?: string;
  ua?: string;
}): Promise<{ oyuncu: Oyuncu; yeni: boolean }> {
  const mevcut = await telefonlaBul(opts.telefon);
  if (mevcut) return { oyuncu: mevcut, yeni: false };

  const id = newId("plr");
  const ipHash = opts.ip ? identifierHash(opts.ip) : null;
  const uaHash = opts.ua ? identifierHash(opts.ua) : null;

  await withBypass("oyuncu kaydı", async (db) => {
    await db.query(
      `INSERT INTO players
         (id, phone_index, phone_enc, first_name_enc, last_name_enc, birth_year_enc)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        phoneIndex(opts.telefon),
        encryptPII(opts.telefon),
        encryptPII(opts.ad),
        encryptPII(opts.soyad),
        encryptPII(String(opts.dogumYili)),
      ],
    );

    // Aydınlatma metni: hizmetin ön koşulu
    await rizaYaz(db, id, "privacy_notice", ipHash, uaHash);

    // G7: ticari ileti izni AYRI satır. Hizmet rızası bunu kapsamaz.
    if (opts.pazarlamaIzni) {
      await rizaYaz(db, id, "commercial_message", ipHash, uaHash);
    }

    // Ödül hatırlatmaları — rıza DEĞİL, hizmete ait bildirim tercihi.
    // Kazanılan kuponun durumunu bildiriyor; kafe adı, ürün ve kampanya
    // içermediği için G7'nin kapsamına girmiyor. Kayıtta açık başlıyor,
    // oyuncu `/verilerim` ekranından kapatabiliyor.
    await rizaYaz(db, id, "service_reminder", ipHash, uaHash);

    await audit(db, {
      actorType: "player",
      actorId: id,
      action: "consent.grant",
      targetType: "player",
      targetId: id,
      detail: { surum: RIZA_SURUMU, pazarlama: opts.pazarlamaIzni },
      ipHash: ipHash ?? undefined,
      uaHash: uaHash ?? undefined,
    });
  });

  log.info("oyuncu kaydedildi", { yeni: true, pazarlama: opts.pazarlamaIzni });
  const olusan = await idIleBul(id);
  return { oyuncu: olusan!, yeni: true };
}

async function rizaYaz(
  db: Db,
  playerId: string,
  tur: "privacy_notice" | "explicit_consent" | "commercial_message" | "service_reminder",
  ipHash: Buffer | null,
  uaHash: Buffer | null,
) {
  await db.query(
    `INSERT INTO player_consents (id, player_id, kind, text_version, ip_hash, ua_hash)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [newId("cns"), playerId, tur, RIZA_SURUMU, ipHash, uaHash],
  );
}

/**
 * Kafeye özel anonim kod — G1.
 * Aynı oyuncu her kafede farklı kod alır; kafeler veriyi birleştiremez.
 */
export async function takmaAd(cafeId: string, playerId: string): Promise<string> {
  return withBypass("takma ad", (db) => takmaAdIle(db, cafeId, playerId));
}

/**
 * Takma adı **var olan bir işlemin içinde** üretir.
 *
 * Kupon üretimiyle aynı işlemde çalışması gerekiyor: kasiyer ekranı müşteriyi
 * anonim kodla gösteriyor (G1) ve kupon varsa kodun da olması şart. Ayrı
 * işlem açmak, kuponu yazılmış ama kodu yazılmamış bir aralık bırakırdı.
 */
export async function takmaAdIle(db: Db, cafeId: string, playerId: string): Promise<string> {
  {
    const mevcut = await db.one<{ code: string }>(
      `SELECT code FROM player_aliases WHERE cafe_id = $1 AND player_id = $2`,
      [cafeId, playerId],
    );
    if (mevcut) return mevcut.code;

    // Çakışma ihtimaline karşı birkaç deneme
    for (let i = 0; i < 5; i++) {
      const kod = aliasCode();
      const r = await db.query(
        `INSERT INTO player_aliases (cafe_id, player_id, code) VALUES ($1,$2,$3)
         ON CONFLICT DO NOTHING`,
        [cafeId, playerId, kod],
      );
      if (r.rowCount) return kod;
    }
    throw new Error("Anonim kod üretilemedi");
  }
}

/* ── SIM swap koruması — G16 ─────────────────────────────── */

export const ODUL_KILIDI_SAAT = 24;

/**
 * Numara değişikliğinden sonraki 24 saat boyunca kupon kullanılamaz ve
 * katalog ödülü alınamaz.
 *
 * Çift doğrulama SIM swap'i çözmez: saldırgan numarayı operatörden
 * devraldıysa iki mesajı da o alır. Koruma doğrulamada değil, değerin
 * dışarı çıkışında olmalı. Oyuncu bu süre boyunca oynayabilir ve puan
 * kazanabilir — duran tek şey değer çıkışı.
 */
export function odulKilidiBitis(oyuncu: Oyuncu): Date | null {
  if (!oyuncu.numaraDegisti) return null;
  const bitis = new Date(oyuncu.numaraDegisti.getTime() + ODUL_KILIDI_SAAT * 3_600_000);
  return bitis.getTime() > Date.now() ? bitis : null;
}

export function gorunum(oyuncu: Oyuncu): OyuncuGorunum {
  return {
    id: oyuncu.id,
    ad: oyuncu.ad,
    soyad: oyuncu.soyad,
    telefonMaskeli: maskele(oyuncu.telefon),
    odulKilidiBitis: odulKilidiBitis(oyuncu),
  };
}

/** Numara değişikliğini uygular. Her iki numara da ayrıca doğrulanmış olmalı. */
export async function numaraDegistir(playerId: string, yeniTelefon: string): Promise<void> {
  await withBypass("numara değişikliği", async (db) => {
    await db.query(
      `UPDATE players
          SET phone_index = $2, phone_enc = $3, phone_changed_at = now()
        WHERE id = $1`,
      [playerId, phoneIndex(yeniTelefon), encryptPII(yeniTelefon)],
    );
    await audit(db, {
      actorType: "player",
      actorId: playerId,
      action: "consent.grant",
      targetType: "player",
      targetId: playerId,
      detail: { islem: "numara_degisikligi", odulKilidiSaat: ODUL_KILIDI_SAAT },
    });
  });
  log.warn("numara degistirildi", { odulKilidiSaat: ODUL_KILIDI_SAAT });
}

/* ── Hesap silme — 30 günlük pencere ─────────────────────── */

export async function silmeTalebiOlustur(playerId: string): Promise<void> {
  await withBypass("silme talebi", (db) =>
    db.query(`UPDATE players SET deletion_requested_at = now() WHERE id = $1`, [playerId]),
  );
  log.info("hesap silme talebi alindi");
}

export async function silmeTalebiIptal(playerId: string): Promise<void> {
  await withBypass("silme talebi iptali", (db) =>
    db.query(`UPDATE players SET deletion_requested_at = NULL WHERE id = $1`, [playerId]),
  );
}

/**
 * 30 günü dolan hesapların kişisel alanlarını geri döndürülemez şekilde siler.
 * Finansal defter kayıtları `player_id` ile kalır — kişisel bağ kopar,
 * ticari saklama yükümlülüğü korunur (docs/08 §6).
 */
export async function silmeleriUygula(): Promise<number> {
  return withBypass("silme uygulaması", async (db) => {
    const silinecek = await db.all<{ id: string }>(
      `SELECT id FROM players
        WHERE deletion_requested_at IS NOT NULL
          AND deletion_requested_at < now() - interval '30 days'
          AND anonymized_at IS NULL`,
    );

    for (const { id } of silinecek) {
      const bosluk = encryptPII("");
      await db.query(
        `UPDATE players
            SET phone_enc = $2, first_name_enc = $2, last_name_enc = $2, birth_year_enc = $2,
                phone_index = $3, anonymized_at = now()
          WHERE id = $1`,
        [id, bosluk, Buffer.from(id)], // kör indeks benzersiz olmalı; id yeterli
      );
      await audit(db, {
        actorType: "system",
        action: "consent.revoke",
        targetType: "player",
        targetId: id,
        detail: { islem: "hesap_silme_uygulandi" },
      });
    }

    if (silinecek.length) log.info("hesaplar silindi", { adet: silinecek.length });
    return silinecek.length;
  });
}
