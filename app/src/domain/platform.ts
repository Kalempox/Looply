import { withBypass } from "@/db/context";
import { decryptPII } from "@/lib/crypto";
import { audit } from "@/lib/audit";

/**
 * Platform paneli — Ü130.
 *
 * ── Neden ayrı bir modül ────────────────────────────────────
 *
 * `cafe.ts` bir kafenin kendi işini yapıyor; burası **bütün kafelere
 * birden** bakıyor. İkisi aynı dosyada olsaydı kiracı sınırının nerede
 * bittiği okunmaz hâle gelirdi: bu dosyadaki her sorgu bilerek kafe
 * sınırının dışında ve her biri `withBypass` gerekçesiyle işaretli.
 *
 * ── 🔴 Kişisel veri buradan akıyor ──────────────────────────
 *
 * docs/08 §3: kişisel veri okumak kayıt tutmakla yetinilecek bir şey
 * değil. Bu modülün iki kuralı var ve ikisi de tiplerde zorlanıyor:
 *
 *   1. **Liste ekranları telefonu MASKELİ veriyor.** Tam numara ayrı bir
 *      çağrıyla ve gerekçeyle açılıyor (`telefonuAc`, `cafe.ts`teki
 *      kardeşi gibi), her açış denetim izine düşüyor.
 *   2. **Pazarlama kitlesi rızasızları hiç görmüyor.** Süzgeç sorguda,
 *      ekranda değil: ekranda süzseydik "hepsini göster" diyen bir
 *      sonraki geliştirici rızasızlara da ulaşırdı.
 */

/* ── Kafeler ───────────────────────────────────────────────── */

export type KafeOzeti = {
  cafeId: string;
  ad: string;
  sehir: string | null;
  durum: string;
  /** Ü125: şubeyse ana işletmenin adı. */
  anaSubeAdi: string | null;
  onayTarihi: Date | null;
  konumVar: boolean;
  urun: number;
  odul: number;
  personel: number;
  /** Son 30 günde bu kafede tamamlanan oyun. */
  oyun30: number;
  /** Son 30 günde kasada onaylanan kupon. */
  kullanilanKupon30: number;
  /** Son 30 günde fiilen verilen indirim (kuruş). */
  indirim30Kurus: number;
};

/**
 * Bütün kafeler, tek listede.
 *
 * ⚠️ Sayılar **30 güne** bağlı ve bu kasıtlı: "toplam" rakamı eski
 * kafeyi hep üstte tutar ve panelin cevaplaması gereken soru o değil —
 * *"şu an hangi kafe çalışıyor."*
 *
 * ⚠️ `LEFT JOIN` değil alt sorgu: dört ayrı JOIN'in satırları birbirini
 * çarpardı (bir kafenin 7 ürünü ve 16 ödülü varsa 112 satır) ve
 * `count(DISTINCT …)` ile düzeltmek sorguyu okunmaz yapardı.
 */
export async function kafeler(): Promise<KafeOzeti[]> {
  const satirlar = await withBypass("platform: kafe listesi", (db) =>
    db.all<{
      id: string;
      name: string;
      city: string | null;
      status: string;
      approved_at: Date | null;
      konum_var: boolean;
      ana_sube_adi: string | null;
      urun: string;
      odul: string;
      personel: string;
      oyun30: string;
      kupon30: string;
      indirim30: string;
    }>(
      `SELECT c.id, c.name, c.city, c.status, c.approved_at,
              (c.lat IS NOT NULL AND c.lng IS NOT NULL) AS konum_var,
              a.name AS ana_sube_adi,
              (SELECT count(*) FROM products p WHERE p.cafe_id = c.id AND p.active) AS urun,
              (SELECT count(*) FROM rewards r WHERE r.cafe_id = c.id AND r.active) AS odul,
              (SELECT count(*) FROM staff s WHERE s.cafe_id = c.id AND s.active) AS personel,
              (SELECT count(*) FROM play_sessions ps
                WHERE ps.cafe_id = c.id AND ps.status = 'completed'
                  AND ps.business_date > CURRENT_DATE - 30) AS oyun30,
              (SELECT count(*) FROM coupons k
                WHERE k.cafe_id = c.id AND k.status = 'redeemed'
                  AND k.redeemed_at > now() - interval '30 days') AS kupon30,
              (SELECT COALESCE(sum(k.reserved_kurus), 0) FROM coupons k
                WHERE k.cafe_id = c.id AND k.status = 'redeemed'
                  AND k.redeemed_at > now() - interval '30 days') AS indirim30
         FROM cafes c
         LEFT JOIN cafes a ON a.id = c.parent_cafe_id
        ORDER BY
          CASE c.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1
                        WHEN 'suspended' THEN 2 ELSE 3 END,
          c.name`,
    ),
  );

  return satirlar.map((r) => ({
    cafeId: r.id,
    ad: r.name,
    sehir: r.city,
    durum: r.status,
    anaSubeAdi: r.ana_sube_adi,
    onayTarihi: r.approved_at,
    konumVar: r.konum_var,
    urun: Number(r.urun),
    odul: Number(r.odul),
    personel: Number(r.personel),
    oyun30: Number(r.oyun30),
    kullanilanKupon30: Number(r.kupon30),
    indirim30Kurus: Number(r.indirim30),
  }));
}

export type KafeDetayi = KafeOzeti & {
  /** Ü137: kafe oyunla, butik alışverişle çark veriyor. */
  isletmeTuru: string;
  yetkiliAdi: string | null;
  /** ⚠️ MASKELİ — tam numara `cafe.telefonuAc` ile ve denetim iziyle. */
  yetkiliTelefonMaskeli: string | null;
  /** Ü126: işletmenin aranacak numarası, maskesiz. */
  isletmeTelefonu: string | null;
  lat: number | null;
  lng: number | null;
  /** Kafenin kendi ayarları — platform da buradan görüyor (Ü129). */
  ayarlar: { anahtar: string; deger: number }[];
  personeller: { ad: string; rol: string; aktif: boolean }[];
  subeler: { cafeId: string; ad: string; durum: string }[];
};

/**
 * Tek kafenin tam künyesi — Ü130.
 *
 * ⚠️ Yetkilinin cebi burada da **maskeli**. Platform çalışanı kafeyi
 * aramak isterse işletme telefonu var (Ü126, maskesiz); yetkilinin kendi
 * numarası kişisel veri ve tam hâli ayrı bir işlemle, gerekçeyle açılıyor.
 * "Zaten detay ekranındayız" diye maskeyi kaldırmak, denetim izini
 * anlamsızlaştırırdı.
 */
export async function kafeDetayi(cafeId: string): Promise<KafeDetayi | null> {
  const ozet = (await kafeler()).find((k) => k.cafeId === cafeId);
  if (!ozet) return null;

  return withBypass("platform: kafe künyesi", async (db) => {
    const k = await db.one<{
      contact_name_enc: Buffer | null;
      contact_phone_enc: Buffer | null;
      business_phone_enc: Buffer | null;
      lat: number | null;
      lng: number | null;
      isletme_turu: string;
    }>(
      `SELECT contact_name_enc, contact_phone_enc, business_phone_enc, lat, lng, isletme_turu
         FROM cafes WHERE id = $1`,
      [cafeId],
    );

    const ayarlar = await db.all<{ key: string; value: string }>(
      `SELECT key, value FROM cafe_config WHERE cafe_id = $1 ORDER BY key`,
      [cafeId],
    );

    const personeller = await db.all<{ name_enc: Buffer; role: string; active: boolean }>(
      `SELECT name_enc, role, active FROM staff WHERE cafe_id = $1 ORDER BY role, created_at`,
      [cafeId],
    );

    // Şubeler: kökten aşağı. Kendi kaydı listeye girmiyor.
    const subeler = await db.all<{ id: string; name: string; status: string }>(
      `SELECT id, name, status FROM cafes
        WHERE parent_cafe_id = COALESCE((SELECT parent_cafe_id FROM cafes WHERE id = $1), $1)
          AND id <> $1
        ORDER BY applied_at`,
      [cafeId],
    );

    return {
      ...ozet,
      isletmeTuru: k?.isletme_turu ?? "kafe",
      yetkiliAdi: k?.contact_name_enc ? decryptPII(k.contact_name_enc) : null,
      yetkiliTelefonMaskeli: k?.contact_phone_enc
        ? maskele(decryptPII(k.contact_phone_enc))
        : null,
      isletmeTelefonu: k?.business_phone_enc ? decryptPII(k.business_phone_enc) : null,
      lat: k?.lat ?? null,
      lng: k?.lng ?? null,
      ayarlar: ayarlar
        .map((a) => ({ anahtar: a.key, deger: Number(a.value) }))
        .filter((a) => Number.isFinite(a.deger)),
      personeller: personeller.map((p) => ({
        ad: decryptPII(p.name_enc),
        rol: p.role,
        aktif: p.active,
      })),
      subeler: subeler.map((s) => ({ cafeId: s.id, ad: s.name, durum: s.status })),
    };
  });
}

/* ── Oyuncular ─────────────────────────────────────────────── */

export type OyuncuSatiri = {
  playerId: string;
  /** Ad-soyad — silinmiş hesapta `null`. */
  ad: string | null;
  /** ⚠️ MASKELİ. Tam numara `oyuncuTelefonuAc` ile ve denetim iziyle. */
  telefonMaskeli: string;
  kayit: Date;
  sonGorulme: Date | null;
  /** Ticari ileti rızası açık mı — pazarlama kitlesinin tek ölçütü. */
  ticariIletiRizasi: boolean;
  oyun: number;
  kupon: number;
  /** Kaç farklı kafede oynadı. */
  kafe: number;
  /** Hesap silme talebi var mı ya da anonimleşti mi. */
  silindi: boolean;
};

function maskele(e164: string): string {
  const n = e164.replace("+90", "");
  return `0${n.slice(0, 3)} *** ** ${n.slice(8)}`;
}

/**
 * Oyuncular — arama ve sayfalama ile.
 *
 * ⚠️ **Anonimleşmiş hesabın adı `null` dönüyor**, boş dize değil: ekran
 * "—" yazacak. Boş dize dönseydi ekran onu "adı yok" diye gösterir ve
 * silinmiş hesapla adı hiç girilmemiş hesap aynı görünürdü.
 *
 * ⚠️ Telefon **çözülüyor ama maskeleniyor**: `phone_index` aranabilir bir
 * özet, gösterilebilir bir numara değil. Maskeleme çözdükten sonra
 * yapılıyor ve tam numara bu fonksiyondan hiç çıkmıyor.
 */
export async function oyuncular(opts: {
  arama?: string;
  limit?: number;
  offset?: number;
}): Promise<{ satirlar: OyuncuSatiri[]; toplam: number }> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const arama = opts.arama?.trim() ?? "";

  const { satirlar, toplam } = await withBypass("platform: oyuncu listesi", async (db) => {
    const sayim = await db.one<{ n: string }>(`SELECT count(*) AS n FROM players`);

    const satirlar = await db.all<{
      id: string;
      first_name_enc: Buffer | null;
      last_name_enc: Buffer | null;
      phone_enc: Buffer;
      created_at: Date;
      last_seen_at: Date | null;
      anonymized_at: Date | null;
      deletion_requested_at: Date | null;
      riza: boolean;
      oyun: string;
      kupon: string;
      kafe: string;
    }>(
      `SELECT p.id, p.first_name_enc, p.last_name_enc, p.phone_enc,
              p.created_at, p.last_seen_at, p.anonymized_at, p.deletion_requested_at,
              EXISTS (SELECT 1 FROM player_consents pc
                       WHERE pc.player_id = p.id
                         AND pc.kind = 'commercial_message'
                         AND pc.revoked_at IS NULL) AS riza,
              (SELECT count(*) FROM play_sessions ps
                WHERE ps.player_id = p.id AND ps.status = 'completed') AS oyun,
              (SELECT count(*) FROM coupons k WHERE k.player_id = p.id) AS kupon,
              (SELECT count(DISTINCT k.cafe_id) FROM coupons k WHERE k.player_id = p.id) AS kafe
         FROM players p
        ORDER BY p.last_seen_at DESC NULLS LAST, p.created_at DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return { satirlar, toplam: Number(sayim!.n) };
  });

  const eslesti = satirlar.map((r) => {
    const ad = r.anonymized_at
      ? null
      : [r.first_name_enc, r.last_name_enc]
          .filter(Boolean)
          .map((b) => decryptPII(b as Buffer))
          .join(" ") || null;

    return {
      playerId: r.id,
      ad,
      telefonMaskeli: maskele(decryptPII(r.phone_enc)),
      kayit: r.created_at,
      sonGorulme: r.last_seen_at,
      ticariIletiRizasi: r.riza,
      oyun: Number(r.oyun),
      kupon: Number(r.kupon),
      kafe: Number(r.kafe),
      silindi: r.anonymized_at !== null || r.deletion_requested_at !== null,
    };
  });

  // ⚠️ Arama şifreli alanda SQL'le yapılamıyor — `first_name_enc` her
  // şifrelemede farklı blob üretiyor, `LIKE` hiçbir şey bulmaz. Bu yüzden
  // süzgeç çözdükten SONRA, bellekte. Sayfa başına en fazla 200 satır
  // olduğu için maliyeti sınırlı; arama bütün tabloyu değil **açık
  // sayfayı** süzüyor ve ekran bunu açıkça söylüyor.
  const suzulmus = arama
    ? eslesti.filter(
        (s) =>
          s.ad?.toLocaleLowerCase("tr").includes(arama.toLocaleLowerCase("tr")) ||
          s.telefonMaskeli.includes(arama),
      )
    : eslesti;

  return { satirlar: suzulmus, toplam };
}

/**
 * Bir oyuncunun tam telefon numarasını açar — **denetim iziyle**.
 *
 * `cafe.telefonuAc`ın kardeşi ve aynı sebeple var: liste hiçbir role tam
 * numara göstermiyor, tek tek ve bilerek açılıyor. Gerekçe zorunlu —
 * "neden baktın" sorusunun cevabı kayıtta olmalı.
 */
export async function oyuncuTelefonuAc(
  playerId: string,
  bakanId: string,
  gerekce: string,
): Promise<string | null> {
  return withBypass("platform: oyuncu telefonu açma", async (db) => {
    const r = await db.one<{ phone_enc: Buffer }>(
      `SELECT phone_enc FROM players WHERE id = $1`,
      [playerId],
    );
    if (!r) return null;

    await audit(db, {
      actorType: "platform",
      actorId: bakanId,
      action: "pii.view",
      targetType: "player",
      targetId: playerId,
      detail: { alan: "telefon", gerekce },
    });

    return decryptPII(r.phone_enc);
  });
}

/* ── Pazarlama kitlesi ─────────────────────────────────────── */

export type Alici = { playerId: string; ad: string | null; telefon: string };

/**
 * Ticari ileti gönderilebilecek oyuncular — Ü130.
 *
 * 🔴 **Süzgeç SORGUDA, ekranda değil.** Üç şart da burada:
 *
 *   1. `commercial_message` rızası var ve **geri alınmamış**
 *   2. Hesap anonimleşmemiş ve silme talebi yok
 *   3. Numara duruyor
 *
 * Ekranda süzseydik, "hepsini göster" diyen bir sonraki geliştirici
 * rızasızlara da ulaşırdı. Rızasız gönderim Türkiye'de ceza konusu ve bu
 * fonksiyondan rızasız bir satır **çıkmıyor**.
 *
 * ⚠️ Telefon burada **tam** dönüyor — gönderim için şart. Bu yüzden her
 * çağrı denetim izine düşüyor ve fonksiyon yalnızca gönderim yolundan
 * çağrılıyor; liste ekranları `oyuncular()` kullanıyor ve o maskeli.
 *
 * ⚠️ İYS (İleti Yönetim Sistemi) kaydı bu kodun kapsamı dışında ve yasal
 * olarak zorunlu. Rıza burada, kayıt sizde.
 */
export async function pazarlamaKitlesi(bakanId: string, gerekce: string): Promise<Alici[]> {
  return withBypass("platform: pazarlama kitlesi", async (db) => {
    const satirlar = await db.all<{
      id: string;
      first_name_enc: Buffer | null;
      last_name_enc: Buffer | null;
      phone_enc: Buffer;
    }>(
      `SELECT p.id, p.first_name_enc, p.last_name_enc, p.phone_enc
         FROM players p
        WHERE p.anonymized_at IS NULL
          AND p.deletion_requested_at IS NULL
          AND EXISTS (SELECT 1 FROM player_consents pc
                       WHERE pc.player_id = p.id
                         AND pc.kind = 'commercial_message'
                         AND pc.revoked_at IS NULL)
        ORDER BY p.created_at`,
    );

    await audit(db, {
      actorType: "platform",
      actorId: bakanId,
      action: "pii.view",
      targetType: "player",
      detail: { alan: "pazarlama kitlesi", adet: satirlar.length, gerekce },
    });

    return satirlar.map((r) => ({
      playerId: r.id,
      ad:
        [r.first_name_enc, r.last_name_enc]
          .filter(Boolean)
          .map((b) => decryptPII(b as Buffer))
          .join(" ") || null,
      telefon: decryptPII(r.phone_enc),
    }));
  });
}

/** Rıza veren oyuncu sayısı — kitleyi açmadan önce ekranda görünen sayı. */
export async function pazarlamaKitleSayisi(): Promise<number> {
  const r = await withBypass("platform: kitle sayısı", (db) =>
    db.one<{ n: string }>(
      `SELECT count(*) AS n FROM players p
        WHERE p.anonymized_at IS NULL
          AND p.deletion_requested_at IS NULL
          AND EXISTS (SELECT 1 FROM player_consents pc
                       WHERE pc.player_id = p.id
                         AND pc.kind = 'commercial_message'
                         AND pc.revoked_at IS NULL)`,
    ),
  );
  return Number(r!.n);
}
