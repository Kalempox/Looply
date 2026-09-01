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

/**
 * Bir günün dört sayısı.
 *
 * Dört ölçü aynı satırda taşınıyor çünkü hepsi aynı günün hikâyesi:
 * kaç kişi geldi, kaç kupon çıktı, kaçı kasada kullanıldı, ne kadar
 * ödendi. Ayrı dizilere bölünseydi grafikler hizasını kaybedebilirdi.
 */
export type GunSatiri = {
  gun: string;
  ziyaret: number;
  kuponVerilen: number;
  kuponKullanilan: number;
  kurus: number;
};

export type Olcu = {
  /** Bugünkü değer. */
  bugun: number;
  /** Düne göre yüzde değişim. Dün sıfırsa `null` — "%∞ arttı" denmez. */
  degisim: number | null;
  /** Son yedi günün değeri; bugün en sonda. Kıvılcım grafiğin verisi. */
  seri: number[];
};

export type PanelOzeti = {
  /** Bugün sayılan ziyaret (Ü29'un birimi). */
  ziyaret: Olcu;
  /** Bugün dağıtılan kupon. */
  kuponVerilen: Olcu;
  /** Bugün kasada onaylanan kupon. */
  kuponKullanilan: Olcu;
  /** Bugün kasada onaylanan tutar — kafenin fiilen ödediği (kuruş). */
  kullanilanKurus: Olcu;
  /** Son yedi günün tamamı; grafik kartı bunu okuyor. */
  sonYedi: GunSatiri[];
};

/**
 * Bir ölçünün bugünü, düne göre değişimi ve serisi.
 *
 * Değişim **dün sıfırsa null**: "0'dan 3'e çıktı" yüzde olarak sonsuz ve
 * ekranda `%∞` yazmak bilgi değil gürültü. Kart o durumda rozeti hiç
 * göstermiyor.
 */
function olcuKur(seri: number[]): Olcu {
  const bugun = seri[seri.length - 1] ?? 0;
  const dun = seri[seri.length - 2] ?? 0;
  return {
    bugun,
    degisim: dun === 0 ? null : Math.round(((bugun - dun) / dun) * 100),
    seri,
  };
}

export async function ozet(cafeId: string, bugun = isGunu()): Promise<PanelOzeti> {
  const bas = gunEkle(bugun, -6);

  return withCafe(cafeId, async (db) => {
    // Ziyaret ve kupon ayrı tablolarda; iki sorgu tek geçişte birleşiyor.
    const ziyaretler = await db.all<{ gun: string; n: string }>(
      `SELECT business_date::text AS gun, count(*) AS n
         FROM play_sessions
        WHERE is_qualified AND business_date >= $1::date AND business_date <= $2::date
        GROUP BY business_date`,
      [bas, bugun],
    );

    // `issued_at` ve `redeemed_at` zaman damgası; güne indirgemek için
    // İstanbul saatine çevriliyor. `::date` doğrudan uygulansaydı gece
    // 00:00–03:00 arasındaki kuponlar bir önceki güne düşerdi.
    const kuponlar = await db.all<{
      gun: string;
      verilen: string;
      kullanilan: string;
      kurus: string;
    }>(
      `SELECT g.gun::text AS gun,
              count(*) FILTER (WHERE g.tur = 'verilen')   AS verilen,
              count(*) FILTER (WHERE g.tur = 'kullanilan') AS kullanilan,
              COALESCE(sum(g.kurus) FILTER (WHERE g.tur = 'kullanilan'), 0) AS kurus
         FROM (
           SELECT (issued_at AT TIME ZONE 'Europe/Istanbul')::date AS gun,
                  'verilen' AS tur, 0::bigint AS kurus
             FROM coupons
           UNION ALL
           SELECT (redeemed_at AT TIME ZONE 'Europe/Istanbul')::date AS gun,
                  'kullanilan' AS tur, COALESCE(committed_kurus, 0) AS kurus
             FROM coupons WHERE status = 'redeemed'
         ) g
        WHERE g.gun >= $1::date AND g.gun <= $2::date
        GROUP BY g.gun`,
      [bas, bugun],
    );

    const zHarita = new Map(ziyaretler.map((r) => [r.gun, Number(r.n)]));
    const kHarita = new Map(kuponlar.map((r) => [r.gun, r]));

    // Boş günler de dizide yer almalı — eksik gün grafiği kaydırır ve
    // "dün" yanlış güne denk gelir.
    const sonYedi: GunSatiri[] = Array.from({ length: 7 }, (_, i) => {
      const gun = gunEkle(bas, i);
      const k = kHarita.get(gun);
      return {
        gun,
        ziyaret: zHarita.get(gun) ?? 0,
        kuponVerilen: Number(k?.verilen ?? 0),
        kuponKullanilan: Number(k?.kullanilan ?? 0),
        kurus: Number(k?.kurus ?? 0),
      };
    });

    return {
      ziyaret: olcuKur(sonYedi.map((g) => g.ziyaret)),
      kuponVerilen: olcuKur(sonYedi.map((g) => g.kuponVerilen)),
      kuponKullanilan: olcuKur(sonYedi.map((g) => g.kuponKullanilan)),
      kullanilanKurus: olcuKur(sonYedi.map((g) => g.kurus)),
      sonYedi,
    };
  });
}
