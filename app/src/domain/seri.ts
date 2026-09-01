import { type Db } from "@/db/context";
import { isGunu, gunEkle } from "@/lib/tarih";

/**
 * Günlük seri — Ü54.
 *
 * ── Ne sayıyor ──────────────────────────────────────────────
 *
 * Oyuncunun **bu kafede** arka arkaya kaç gün oyun tamamladığı. Bir gün
 * atlandığında seri sıfırlanıyor ve ertesi ziyaret 1'den başlıyor.
 *
 * ── Neden kafe başına ───────────────────────────────────────
 *
 * Seri, kafenin müşterisini geri getirme aracı. Kafeler arası ortak bir
 * seri, A kafesinde oynayıp B kafesinde ödül almak demek olurdu; kafenin
 * bütçesinden çıkan bir ödülü başka kafenin trafiği kazandıramaz (Ü3 ile
 * aynı gerekçe).
 *
 * ── Neden tablo yok ─────────────────────────────────────────
 *
 * Seri bir durum değil, bir sorgunun cevabı: `play_sessions` hangi gün
 * oynandığını zaten taşıyor. Ayrı bir "seri" tablosu tutmak aynı gerçeği
 * iki yerde saklamak olurdu ve iki yer er ya da geç ayrışır — bir oturum
 * reddedilir, sayaç eski hâlinde kalır. Tahtla (Ö1) aynı tercih.
 *
 * ── Ödül: puan, kupon değil ─────────────────────────────────
 *
 * Seri **kupon üretmiyor**. Ü52 ile puan harcanmaz oldu ve puanın işi
 * sıralama ile seviye; seri de oraya yazıyor. Kupon üretseydi kafenin
 * günlük bütçesine üçüncü bir musluk açılırdı ve E10'un öngörülebilirliği
 * bozulurdu.
 */

/** Seride kaç gün geriye bakılıyor — bundan uzun seri "30+" sayılıyor. */
export const EN_UZUN_BAKIS = 60;

/**
 * Seri gününe göre bonus puan.
 *
 * İlk gün bonus yok: seri henüz yok, tek bir ziyaret var. İkinci günden
 * itibaren her gün 25 puan ekleniyor ve 200'de duruyor.
 *
 * Tavan **bilerek düşük**: günlük puan tavanı 900 (E4) ve seri bonusu onun
 * dörtte birini geçerse "oyna" yerine "sadece uğra" davranışını ödüllendirir
 * hâle gelir. Seri, oyunun yerine geçmemeli.
 */
export function bonusPuani(gun: number): number {
  if (gun < 2) return 0;
  return Math.min(200, (gun - 1) * 25);
}

export type Seri = {
  /** Bugün dahil arka arkaya gün sayısı. Bugün oynanmadıysa dünden geriye. */
  gun: number;
  /** Bugün bu kafede tamamlanmış oyun var mı? */
  bugunOynadi: boolean;
  /** Seriyi sürdürmek için bugün oynanması gerekiyor mu? */
  riskte: boolean;
};

/**
 * Seriyi hesaplar.
 *
 * Günler tek sorguda çekiliyor ve geriye doğru yürünüyor. `EN_UZUN_BAKIS`
 * satırla sınırlı: iki yıldır her gün gelen bir müşteri için yedi yüz satır
 * okumanın kimseye faydası yok, ekranda gösterilen sayı zaten tavanlı.
 */
export async function hesapla(
  db: Db,
  opts: { playerId: string; cafeId: string; bugun?: string },
): Promise<Seri> {
  const bugun = opts.bugun ?? isGunu();

  const satirlar = await db.all<{ gun: string }>(
    // `ORDER BY business_date` yazılamıyor: SELECT DISTINCT, sıralama
    // ifadesinin seçilen sütunlar arasında olmasını istiyor. Metne
    // çevrilmiş tarih ISO biçiminde olduğu için metin sıralaması takvim
    // sıralamasıyla aynı — 2026-09-01 > 2026-08-31 hem tarih hem metin.
    `SELECT DISTINCT business_date::text AS gun
       FROM play_sessions
      WHERE player_id = $1 AND cafe_id = $2
        AND status = 'completed'
        AND business_date <= $3::date
      ORDER BY gun DESC
      LIMIT $4`,
    [opts.playerId, opts.cafeId, bugun, EN_UZUN_BAKIS],
  );

  const gunler = new Set(satirlar.map((r) => r.gun));
  const bugunOynadi = gunler.has(bugun);

  // Bugün oynanmadıysa seri dünden geriye sayılıyor ve **kırılmış**
  // sayılmıyor: gün henüz bitmedi. Kırıldığını söylemek, akşam gelecek
  // müşteriyi sabahtan kaybetmek olurdu.
  let imlec = bugunOynadi ? bugun : gunEkle(bugun, -1);
  let gun = 0;
  while (gunler.has(imlec) && gun < EN_UZUN_BAKIS) {
    gun++;
    imlec = gunEkle(imlec, -1);
  }

  return { gun, bugunOynadi, riskte: gun > 0 && !bugunOynadi };
}

/**
 * Bugünün seri bonusu daha önce yazıldı mı?
 *
 * Tek kayıt yeri defterin kendisi: `points_ledger` içinde bugüne ait
 * `seri` sebepli satır varsa bonus verilmiş demektir. Ayrı bir bayrak
 * kolonu, defterle ayrışabilecek ikinci bir gerçek olurdu.
 */
export async function bugunYazildiMi(
  db: Db,
  opts: { playerId: string; cafeId: string; bugun?: string },
): Promise<boolean> {
  const r = await db.one(
    `SELECT 1 FROM points_ledger
      WHERE player_id = $1 AND cafe_id = $2
        AND business_date = $3::date AND reason = 'seri'
      LIMIT 1`,
    [opts.playerId, opts.cafeId, opts.bugun ?? isGunu()],
  );
  return !!r;
}
