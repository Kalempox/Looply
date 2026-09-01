import { withCafe } from "@/db/context";
import { isGunu, gunEkle } from "@/lib/tarih";

/**
 * Panelin gösterge verisi — Ü55.
 *
 * ── Rapordan neden ayrı ─────────────────────────────────────
 *
 * `rapor.ts` bir **dönemi** anlatıyor: kafe oraya karar vermek için,
 * oturup bakmaya gidiyor. Panel ise vardiya arasında iki saniye bakılan
 * yer ve tek soruyu cevaplıyor: *"bugün ne durumdayım?"*
 *
 * İkisini tek fonksiyona bağlamak, panelin her açılışında raporun ağır
 * sorgularını (doğrulama defteri, kampanya kırılımı, kişi bazlı kullanım)
 * koşturmak olurdu. Buradaki sorgular tek geçişte bitiyor.
 *
 * ── Mahremiyet eşiği burada YOK ─────────────────────────────
 *
 * Ü30 eşiği **kırılımları** koruyor: "saat 14'te 2 oyuncu" satırı kişiyi
 * işaret edebilir. Buradaki sayılar toplam — "bugün 3 ziyaret" kimseyi
 * işaret etmiyor ve kafe zaten kapıdan girenleri görüyor.
 */

export type GunSatiri = { gun: string; ziyaret: number };

export type PanelOzeti = {
  /** Bugün sayılan ziyaret (Ü29'un birimi). */
  ziyaret: number;
  /** Bugün dağıtılan kupon. */
  kuponVerilen: number;
  /** Bugün kasada onaylanan kupon. */
  kuponKullanilan: number;
  /** Bugün kasada onaylanan tutar — kafenin fiilen ödediği. */
  kullanilanKurus: number;
  /** Son yedi günün ziyaret grafiği; bugün en sonda. */
  sonYedi: GunSatiri[];
};

export async function ozet(cafeId: string, bugun = isGunu()): Promise<PanelOzeti> {
  const bas = gunEkle(bugun, -6);

  return withCafe(cafeId, async (db) => {
    const r = await db.one<{
      ziyaret: string;
      verilen: string;
      kullanilan: string;
      tutar: string;
    }>(
      `SELECT
         (SELECT count(*) FROM play_sessions
           WHERE is_qualified AND business_date = $1::date)                AS ziyaret,
         (SELECT count(*) FROM coupons
           WHERE issued_at >= $1::date
             AND issued_at < ($1::date + 1))                               AS verilen,
         (SELECT count(*) FROM coupons
           WHERE status = 'redeemed' AND redeemed_at >= $1::date
             AND redeemed_at < ($1::date + 1))                             AS kullanilan,
         (SELECT COALESCE(sum(committed_kurus), 0) FROM coupons
           WHERE status = 'redeemed' AND redeemed_at >= $1::date
             AND redeemed_at < ($1::date + 1))                             AS tutar`,
      [bugun],
    );

    // Boş günler de grafikte yer almalı — "dün hiç kimse gelmedi" de bir
    // bilgi ve eksik sütun grafiği yanıltıyor.
    const gunler = await db.all<{ gun: string; n: string }>(
      `SELECT business_date::text AS gun, count(*) AS n
         FROM play_sessions
        WHERE is_qualified AND business_date >= $1::date AND business_date <= $2::date
        GROUP BY business_date`,
      [bas, bugun],
    );
    const harita = new Map(gunler.map((g) => [g.gun, Number(g.n)]));

    return {
      ziyaret: Number(r?.ziyaret ?? 0),
      kuponVerilen: Number(r?.verilen ?? 0),
      kuponKullanilan: Number(r?.kullanilan ?? 0),
      kullanilanKurus: Number(r?.tutar ?? 0),
      sonYedi: Array.from({ length: 7 }, (_, i) => {
        const gun = gunEkle(bas, i);
        return { gun, ziyaret: harita.get(gun) ?? 0 };
      }),
    };
  });
}
