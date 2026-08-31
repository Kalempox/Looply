import { withBypass } from "@/db/context";
import { sha256, randomToken, imzala, imzaGecerliMi } from "@/lib/crypto";
import { log } from "@/lib/log";

/** İmza amacı — misafir talebiyle aynı anahtarı kullanıyor, aynı uzayı değil. */
const AMAC = "masa-bileti";

/**
 * Masa karekodu ve masa bileti — AL-2 / K1.
 *
 * İki parça var:
 *
 *   1. BASILI KAREKOD — masaya yapıştırılan sabit kod. Değeri masanın
 *      `qr_secret` alanından türüyor, tahmin edilemez. Kafe kodu yenilemek
 *      isterse `qr_secret` değiştirilir ve eski çıktılar ölür.
 *
 *   2. MASA BİLETİ — okutunca verilen imzalı, 30 dakikalık kimlik.
 *      HttpOnly çerezde taşınır: adres paylaşmakla geçmez, kurcalanamaz.
 *
 * Basılı karekodun fotoğrafını paylaşmayı bu katmanlar durdurmaz — onu
 * konum doğrulaması (K2) karşılıyor.
 */

/** Masa bileti çerezinin adı. */
export const MASA_COOKIE = "cp_masa";

export type MasaCozumu = {
  cafeId: string;
  cafeAdi: string;
  cafeSlug: string;
  tableId: string;
  masaAdi: string;
};

/** Basılı karekodun taşıdığı değer: qr_secret'ın ilk 16 hex hanesi. */
export function basiliKod(qrSecret: Buffer): string {
  return qrSecret.subarray(0, 8).toString("hex");
}

/**
 * Basılı kodu masaya çözer.
 *
 * G5: kafe onaylanmamışsa hiçbir şey dönmez — onaysız kafe karekod üretemez,
 * ürettiyse de çalışmaz.
 */
export async function masaCoz(kod: string): Promise<MasaCozumu | null> {
  if (!/^[0-9a-f]{16}$/.test(kod)) return null;

  const r = await withBypass("masa karekodu çözümleme", (db) =>
    db.one<{
      cafe_id: string;
      cafe_adi: string;
      cafe_slug: string;
      table_id: string;
      masa_adi: string;
    }>(
      `SELECT c.id AS cafe_id, c.name AS cafe_adi, c.slug AS cafe_slug,
              t.id AS table_id, t.label AS masa_adi
         FROM cafe_tables t
         JOIN cafes c ON c.id = t.cafe_id
        WHERE encode(substring(t.qr_secret from 1 for 8), 'hex') = $1
          AND t.active = true
          AND c.status = 'approved'`,
      [kod],
    ),
  );

  if (!r) return null;
  return {
    cafeId: r.cafe_id,
    cafeAdi: r.cafe_adi,
    cafeSlug: r.cafe_slug,
    tableId: r.table_id,
    masaAdi: r.masa_adi,
  };
}

/**
 * Karekod okutma kaydı.
 *
 * Kafenin doğrulama defterinde (Faz 8) "bu masa şu saatte okutuldu" satırı
 * olarak görünecek. Kimlik doğrulama görevi YOK — o işi masa bileti yapıyor.
 *
 * ⚠️ Burada önce 90 saniyelik tek kullanımlık bir jeton vardı ve adres
 * çubuğunda taşınıyordu. Tasarım hatasıydı: jeton sayfa yüklenirken
 * tüketiliyordu ve Next.js aynı sayfayı iki kez isteyebildiği için
 * (ön yükleme) kullanıcıya ulaşan ikinci istek jetonu "kullanılmış"
 * buluyordu. Bilet artık HttpOnly çerezde — adres paylaşmakla taşınmıyor,
 * yani jetonun sağladığı korumayı zaten fazlasıyla veriyor.
 */
export async function taramaKaydet(cafeId: string, tableId: string): Promise<void> {
  await withBypass("karekod tarama kaydı", (db) =>
    db.query(
      `INSERT INTO qr_tokens (token_hash, cafe_id, table_id, expires_at, consumed_at)
       VALUES ($1,$2,$3, now() + interval '90 seconds', now())`,
      [sha256(randomToken(24)), cafeId, tableId],
    ),
  );
}

/* ── Masa bileti ──────────────────────────────────────────────
 *
 * İçeriği açık ama imzası olmadan üretilemiyor: kurcalanmış bir bilet
 * (başka kafenin kimliği yazılmış) imzayı tutturamıyor. HttpOnly çerezde
 * taşınıyor, yani JavaScript'ten okunamıyor ve adresle paylaşılamıyor.
 */

export const BILET_OMRU_SN = 30 * 60;

export function biletUret(cafeId: string, tableId: string): string {
  const sonGecerlilik = Date.now() + BILET_OMRU_SN * 1000;
  const govde = `${cafeId}.${tableId}.${sonGecerlilik}`;
  return `${govde}.${imzala(AMAC, govde)}`;
}

export function biletCoz(bilet: string): { cafeId: string; tableId: string } | null {
  const parcalar = bilet.split(".");
  if (parcalar.length !== 4) return null;

  const [cafeId, tableId, sonStr, imza] = parcalar;
  const govde = `${cafeId}.${tableId}.${sonStr}`;

  if (!imzaGecerliMi(AMAC, govde, imza)) return null;
  if (Number(sonStr) < Date.now()) return null;
  return { cafeId, tableId };
}

/** Eski tarama kayıtlarını siler. Saatlik iş. */
export async function temizle(): Promise<number> {
  return withBypass("karekod tarama temizliği", async (db) => {
    const r = await db.query(
      `DELETE FROM qr_tokens WHERE expires_at < now() - interval '1 hour'`,
    );
    if (r.rowCount) log.debug("tarama kayitlari temizlendi", { adet: r.rowCount });
    return r.rowCount ?? 0;
  });
}
