import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { appPool } from "./pool";
import { log } from "@/lib/log";

/**
 * Kiracı izolasyon katmanı — G12'nin uygulama tarafı.
 *
 * Kural (07-uretim-plani.md, değişmez #3):
 *   cafe_id istekten OKUNMAZ, her zaman oturumdan türetilir.
 *
 * Bunu iki mekanizma birlikte sağlıyor:
 *
 *   1. DERLEME ZAMANI — sorgu çalıştırmak için `Db` tipinde bir nesne
 *      gerekir ve bu tip yalnızca aşağıdaki üç fonksiyondan çıkar.
 *      Havuzdan doğrudan sorgu çalıştıran kod derlenmez.
 *
 *   2. ÇALIŞMA ZAMANI — bağlam, işlem başında `app.cafe_id` /
 *      `app.player_id` oturum değişkenlerini kurar; RLS politikaları
 *      (0003 göçü) satırları buna göre süzer. SQL'de WHERE unutulsa
 *      bile veritabanı fazladan satır döndürmez.
 *
 * Not: ikinci mekanizma asıl koruma. Birincisi, yanlışlıkla yanlış
 * kapıdan girilmesini engelleyen bir korkuluk.
 */

declare const marka: unique symbol;

export type Kip = "cafe" | "player" | "bypass";

export type Db = {
  readonly [marka]: Kip;
  query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
  /** Tek satır bekleyen sorgular için. Satır yoksa undefined. */
  one<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<T | undefined>;
  all<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]>;
  readonly kip: Kip;
  readonly cafeId?: string;
  readonly playerId?: string;
};

function sarmala(client: PoolClient, kip: Kip, cafeId?: string, playerId?: string): Db {
  const db = {
    kip,
    cafeId,
    playerId,
    query: <T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) =>
      client.query<T>(sql, params),
    one: async <T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) =>
      (await client.query<T>(sql, params)).rows[0],
    all: async <T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) =>
      (await client.query<T>(sql, params)).rows,
  };
  return db as unknown as Db;
}

type Ayar = { cafeId?: string; playerId?: string; bypass?: boolean };

async function calistir<T>(kip: Kip, ayar: Ayar, fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await appPool().connect();
  try {
    await client.query("BEGIN");

    // set_config(..., true) = yalnızca bu işlem boyunca geçerli.
    // Bağlantı havuza döndüğünde değer kalmaz — sızıntı olmaz.
    if (ayar.bypass) {
      await client.query("SELECT set_config('app.bypass', 'on', true)");
    }
    if (ayar.cafeId) {
      await client.query("SELECT set_config('app.cafe_id', $1, true)", [ayar.cafeId]);
    }
    if (ayar.playerId) {
      await client.query("SELECT set_config('app.player_id', $1, true)", [ayar.playerId]);
    }

    const sonuc = await fn(sarmala(client, kip, ayar.cafeId, ayar.playerId));
    await client.query("COMMIT");
    return sonuc;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Kafe bağlamı. `cafeId` yalnızca doğrulanmış oturumdan gelmelidir —
 * istek gövdesinden veya URL'den gelen bir değer buraya verilmez.
 */
export function withCafe<T>(cafeId: string, fn: (db: Db) => Promise<T>): Promise<T> {
  if (!cafeId) throw new Error("withCafe: cafeId zorunlu");
  return calistir("cafe", { cafeId }, fn);
}

/** Oyuncu bağlamı — yalnızca kendi satırlarını görür. */
export function withPlayer<T>(playerId: string, fn: (db: Db) => Promise<T>): Promise<T> {
  if (!playerId) throw new Error("withPlayer: playerId zorunlu");
  return calistir("player", { playerId }, fn);
}

/**
 * Sunucu içi bağlam — RLS'yi atlar.
 *
 * Yalnızca kimlik oluşmadan önce çalışan akışlarda kullanılır:
 * karekod jetonu çözümleme, doğrulama kodu, oturum arama, hız sınırı.
 * Ayrıca platform panelinde.
 *
 * `neden` parametresi zorunlu: bu fonksiyonun her çağrısı, kod
 * incelemesinde gerekçesiyle birlikte görünsün.
 */
export function withBypass<T>(neden: string, fn: (db: Db) => Promise<T>): Promise<T> {
  if (!neden) throw new Error("withBypass: gerekçe zorunlu");
  log.debug("bypass baglami", { neden });
  return calistir("bypass", { bypass: true }, fn);
}
