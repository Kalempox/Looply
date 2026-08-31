import { withBypass } from "@/db/context";
import { identifierHash } from "@/lib/crypto";
import { newId } from "@/lib/ids";
import { log } from "@/lib/log";

/**
 * Masa oturumu — oyuncunun "şu an şu kafede, şu masada" hâli.
 *
 * Oyun oturumundan ayrı: bir ziyarette birden çok oyun oynanır ama
 * doğrulama bir kez yapılır. Kanıt burada birikiyor (AL-2):
 *
 *   K1  karekod okutuldu              → masa oturumu açıldığında
 *   K2  konum doğrulandı              → tarayıcı izin verirse
 *   K3  masada yeterince kalındı      → 5 dakika sonra
 *   K4  fiş kodu girildi              → Faz 7
 *   K5  kasiyer onayı                 → Faz 7
 */

export const OTURUM_SAAT = 3;
export const GEOFENCE_METRE = 150;
export const K3_DAKIKA = 5;

export const K1 = 1;
export const K2 = 2;
export const K3 = 4;

export type MasaOturumu = {
  id: string;
  cafeId: string;
  tableId: string;
  cafeAdi: string;
  masaAdi: string;
  baslangic: Date;
  bitis: Date;
  kanitMaskesi: number;
  kanitSeviyesi: number;
  mesafeM: number | null;
  konumReddedildi: boolean;
};

/** Bit maskesinden seviye: art arda sağlanan en yüksek kanıt. */
export function seviyeHesapla(maske: number): number {
  let seviye = 0;
  for (const [bit, s] of [
    [K1, 1],
    [K2, 2],
    [K3, 3],
  ] as const) {
    if (maske & bit) seviye = s;
    else break;
  }
  return seviye;
}

/**
 * İki nokta arası mesafe (metre) — haversine.
 * Sunucuda hesaplanır ve **yalnızca sonuç saklanır**; koordinat atılır (G10).
 */
export function mesafeMetre(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Masa oturumu açar. Karekod okutulduğu için K1 baştan var. */
export async function ac(opts: {
  cafeId: string;
  tableId: string;
  playerId: string;
  cihazId?: string;
}): Promise<string> {
  const id = newId("mas");
  const bitis = new Date(Date.now() + OTURUM_SAAT * 3_600_000);

  await withBypass("masa oturumu açma", async (db) => {
    // Aynı masada açık oturum varsa süresini uzat — her karekod okutmada
    // yeni ziyaret sayılmasın.
    const mevcut = await db.one<{ id: string }>(
      `UPDATE table_sessions SET expires_at = $4, last_seen_at = now()
        WHERE player_id = $1 AND cafe_id = $2 AND table_id = $3 AND expires_at > now()
      RETURNING id`,
      [opts.playerId, opts.cafeId, opts.tableId, bitis],
    );
    if (mevcut) return;

    await db.query(
      `INSERT INTO table_sessions
         (id, cafe_id, table_id, player_id, device_id_hash, expires_at, proof_mask, proof_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,1)`,
      [
        id,
        opts.cafeId,
        opts.tableId,
        opts.playerId,
        opts.cihazId ? identifierHash(opts.cihazId) : null,
        bitis,
        K1,
      ],
    );
  });

  return id;
}

/** Oyuncunun açık masa oturumu. Yoksa oyuncu kafe dışındadır (Ü3). */
export async function aktif(playerId: string): Promise<MasaOturumu | null> {
  const r = await withBypass("aktif masa oturumu", (db) =>
    db.one<{
      id: string;
      cafe_id: string;
      table_id: string;
      cafe_adi: string;
      masa_adi: string;
      started_at: Date;
      expires_at: Date;
      proof_mask: number;
      proof_level: number;
      geo_distance_m: number | null;
      geo_reddedildi: boolean;
    }>(
      `SELECT ts.id, ts.cafe_id, ts.table_id, c.name AS cafe_adi, t.label AS masa_adi,
              ts.started_at, ts.expires_at, ts.proof_mask, ts.proof_level,
              ts.geo_distance_m, ts.geo_reddedildi
         FROM table_sessions ts
         JOIN cafes c ON c.id = ts.cafe_id
         JOIN cafe_tables t ON t.id = ts.table_id
        WHERE ts.player_id = $1 AND ts.expires_at > now() AND c.status = 'approved'
        ORDER BY ts.started_at DESC LIMIT 1`,
      [playerId],
    ),
  );

  if (!r) return null;

  // K3: masada yeterince kalındı mı? Her okumada yeniden değerlendirilir.
  let maske = r.proof_mask;
  const dakika = (Date.now() - r.started_at.getTime()) / 60_000;
  if (dakika >= K3_DAKIKA && maske & K2) maske |= K3;

  return {
    id: r.id,
    cafeId: r.cafe_id,
    tableId: r.table_id,
    cafeAdi: r.cafe_adi,
    masaAdi: r.masa_adi,
    baslangic: r.started_at,
    bitis: r.expires_at,
    kanitMaskesi: maske,
    kanitSeviyesi: seviyeHesapla(maske),
    mesafeM: r.geo_distance_m,
    konumReddedildi: r.geo_reddedildi,
  };
}

/**
 * Misafirken ölçülen konumu, kayıttan sonra açılan masa oturumuna işler (Ü35).
 *
 * Ölçüm zaten sunucuda yapıldı ve imzalı talepte taşındı; burada yapılan tek
 * şey sonucu deftere geçirmek. `konumDogrula` ile aynı alanları aynı biçimde
 * yazıyor — koordinat yine hiç görünmüyor (G10), yalnızca metre.
 *
 * Kanıt bitini yalnızca **eklemek** mümkün: `proof_mask` üzerine OR yazılıyor,
 * hiçbir bit düşürülmüyor. Talep, sahip olunmayan bir kanıtı veremez ama var
 * olanı da silemez.
 */
export async function konumuUygula(opts: {
  playerId: string;
  cafeId: string;
  tableId: string;
  k2: boolean;
  mesafeM: number | null;
}): Promise<void> {
  await withBypass("misafir konumunu masaya işleme", (db) =>
    db.query(
      `UPDATE table_sessions
          SET geo_distance_m = COALESCE($4, geo_distance_m),
              geo_checked_at = now(),
              proof_mask = proof_mask | $5,
              proof_level = CASE WHEN (proof_mask | $5) >= $6 THEN 2 ELSE proof_level END
        WHERE player_id = $1 AND cafe_id = $2 AND table_id = $3 AND expires_at > now()`,
      [opts.playerId, opts.cafeId, opts.tableId, opts.mesafeM, opts.k2 ? K2 : 0, K1 | K2],
    ),
  );
}

export type KonumSonucu =
  | { durum: "dogrulandi"; mesafeM: number }
  | { durum: "uzak"; mesafeM: number }
  | { durum: "kafe_konumu_yok" }
  | { durum: "oturum_yok" };

/**
 * Konum doğrulaması (K2).
 *
 * Enlem/boylam sunucuya gelir, kafeye uzaklık hesaplanır ve **yalnızca metre
 * saklanır** (G10). "Oyuncu şu saatte şuradaydı" verisi hiç oluşmaz —
 * elimizde kalan tek şey "kafeye 40 metre mesafedeydi".
 */
export async function konumDogrula(
  playerId: string,
  lat: number,
  lng: number,
): Promise<KonumSonucu> {
  return withBypass("konum doğrulama", async (db) => {
    const r = await db.one<{ id: string; c_lat: number | null; c_lng: number | null; proof_mask: number }>(
      `SELECT ts.id, c.lat AS c_lat, c.lng AS c_lng, ts.proof_mask
         FROM table_sessions ts JOIN cafes c ON c.id = ts.cafe_id
        WHERE ts.player_id = $1 AND ts.expires_at > now()
        ORDER BY ts.started_at DESC LIMIT 1`,
      [playerId],
    );

    if (!r) return { durum: "oturum_yok" as const };
    if (r.c_lat == null || r.c_lng == null) return { durum: "kafe_konumu_yok" as const };

    const mesafe = mesafeMetre(lat, lng, r.c_lat, r.c_lng);
    const yakin = mesafe <= GEOFENCE_METRE;
    const maske = yakin ? r.proof_mask | K2 : r.proof_mask;

    await db.query(
      `UPDATE table_sessions
          SET geo_distance_m = $2, geo_checked_at = now(), geo_reddedildi = false,
              proof_mask = $3, proof_level = $4
        WHERE id = $1`,
      [r.id, mesafe, maske, seviyeHesapla(maske)],
    );

    // Koordinat loglanmıyor (docs/08 §7.1) — yalnızca sonuç
    log.info("konum dogrulandi", { yakin, mesafeM: mesafe });

    return yakin
      ? ({ durum: "dogrulandi", mesafeM: mesafe } as const)
      : ({ durum: "uzak", mesafeM: mesafe } as const);
  });
}

/**
 * Kullanıcı konum iznini reddetti.
 *
 * Bu bir hata değil, normal bir durum: tarayıcıda konum kullanıcı onayına
 * bağlı ve reddedilebilir. Akış çökmüyor — oyuncu oynamaya devam ediyor,
 * yalnızca büyük ödüle erişemiyor (docs/07 §3 tarayıcı gerçekleri).
 */
export async function konumReddedildi(playerId: string): Promise<void> {
  await withBypass("konum reddi", (db) =>
    db.query(
      `UPDATE table_sessions SET geo_reddedildi = true, geo_checked_at = now()
        WHERE player_id = $1 AND expires_at > now()`,
      [playerId],
    ),
  );
}
