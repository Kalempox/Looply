import type { Db } from "@/db/context";
import { gunEkle, isGunu, istanbulDakikasi } from "@/lib/tarih";
import { KUPON_ESIGI } from "./puan";

/**
 * Kafenin yoğunluk profili — Ü281.
 *
 * ── Neden gerekti ───────────────────────────────────────────
 *
 * Ürün sahibi: *"kafe sabah 9'da açılıp 23'te kapanıyor, en yoğun saat
 * akşam 7 ile 10. Bu saatlere doğru miktarda bütçe kalmalı. Önceki
 * saatlerde bütçeyi her gelene ödül dağıtarak bitirirsek bu kalabalıkta
 * doğru bütçeyi dağıtamayız. Bu saat her kafede farklı; sistem bunu
 * akıllıca yapmalı."*
 *
 * Bütçe gün boyunca **düz bir çizgiyle** açılıyordu (Ü87) ve paketin
 * şansı sabitti (%33,5). Simülasyon (09–23, akşam 19–22 yoğun, 10.000
 * TL): akşam kalabalığına bütçenin yalnızca %20'si kalıyordu, şans
 * akşam %24'e düşüyordu.
 *
 * ── Ne yapılıyor ────────────────────────────────────────────
 *
 * - Kafenin son `BAKILAN_GUN` gününden saat saat **fırsat** sayılıyor:
 *   eşiği (500) geçen, konumu doğrulanmış, o gün henüz oyun ödülü almamış
 *   oyuncunun turu — ödül kazanabilecek tur. Hafta içi ve hafta sonu ayrı.
 * - Bütçe bu profile göre açılıyor (`butce.tempoOrani`): akşam yoğun
 *   kafede para akşama saklanıyor.
 * - Paketin şansı: **kalan bütçe ÷ (günün kalanında beklenen fırsat ×
 *   ortalama ödül)** (`odul-motoru.paketSansi`). Sabah gelen ile akşam
 *   gelenin şansı eşitleniyor; para kalabalığı izliyor. Aynı simülasyonda
 *   akşama bütçenin %49'u kalıyor, şans gün boyu ~%21.
 *
 * ── Az veri ─────────────────────────────────────────────────
 *
 * Her açık saate bir sayımlık ön bilgi ekleniyor (`ONSEL`): verisi az
 * kafenin profili düz başlıyor, veri biriktikçe kendi şekline dönüyor.
 * Hiç geçmişi olmayan kafede günlük fırsat bugünün temposundan, o da
 * yoksa `VARSAYILAN_SAATLIK_FIRSAT`tan tahmin ediliyor.
 */

/** Profilin baktığı gün sayısı — dört hafta. */
export const BAKILAN_GUN = 28;

/** Her açık saate eklenen ön sayım — az veride profil düz kalsın. */
export const ONSEL = 1;

/** Geçmişi olmayan kafede açık saat başına varsayılan fırsat. */
export const VARSAYILAN_SAATLIK_FIRSAT = 20;

/**
 * Bugünün temposuna ne kadar güvenildiği.
 *
 * Bugün şimdiye kadar beklenenin iki katı fırsat geldiyse kalan tahmin
 * 1,5 katına çıkıyor (yarı güven). Tamamına güvenilseydi öğlen tesadüfen
 * gelen bir grup günün kalanını şişirirdi.
 */
export const BUGUN_AGIRLIGI = 0.5;

export type GunTuru = "hafta_ici" | "hafta_sonu";

export type Profil = {
  /** Saat başına pay (0–23) — açık saatler dışında 0, toplamı 1. */
  paylar: number[];
  /** Bu gün türünde ortalama günlük fırsat; geçmiş yoksa `null`. */
  gunlukOrtalama: number | null;
  /** Öğrenmede kullanılan gün sayısı. */
  gunSayisi: number;
  gunTuru: GunTuru;
};

/** İş gününün türü — Türkiye'de cumartesi ve pazar hafta sonu. */
export function gunTuru(gunIso: string): GunTuru {
  // 12:00 UTC: gün sınırından uzak, saat dilimi karışmıyor.
  const g = new Date(`${gunIso}T12:00:00Z`).getUTCDay();
  return g === 0 || g === 6 ? "hafta_sonu" : "hafta_ici";
}

/** Açık saatler — `[acilis, kapanis)`. Bozuk ayarda (kapanış ≤ açılış) bütün gün. */
export function acikSaatler(acilis: number, kapanis: number): number[] {
  if (kapanis <= acilis) return [...Array(24).keys()];
  return [...Array(kapanis - acilis).keys()].map((i) => acilis + i);
}

/**
 * Saat başına sayımdan profil — saf.
 *
 * @param sayim 24 elemanlı: o saatte başlayan fırsat sayısı (bütün günler toplamı)
 */
export function profilHesapla(
  sayim: readonly number[],
  gunSayisi: number,
  acilis: number,
  kapanis: number,
  tur: GunTuru,
): Profil {
  const acik = acikSaatler(acilis, kapanis);
  const paylar = Array(24).fill(0) as number[];
  const toplam = acik.reduce((s, h) => s + (sayim[h] ?? 0) + ONSEL, 0);
  for (const h of acik) paylar[h] = ((sayim[h] ?? 0) + ONSEL) / toplam;

  const veri = acik.reduce((s, h) => s + (sayim[h] ?? 0), 0);
  return {
    paylar,
    gunlukOrtalama: gunSayisi > 0 ? veri / gunSayisi : null,
    gunSayisi,
    gunTuru: tur,
  };
}

/**
 * Günün `an`a kadar geçen payı (0–1) — saf.
 *
 * Açık saatlerin payları toplanıyor, içinde bulunulan saatin payı dakikayla
 * bölünüyor. Profil düzse sonuç `(şimdi − açılış) / (kapanış − açılış)` —
 * Ü87'nin düz temposunun ta kendisi.
 */
export function birikimliPay(paylar: readonly number[], an: Date): number {
  const dk = istanbulDakikasi(an);
  let s = 0;
  for (let h = 0; h < 24; h++) {
    const bas = h * 60;
    if (dk >= bas + 60) s += paylar[h];
    else if (dk > bas) s += (paylar[h] * (dk - bas)) / 60;
  }
  return Math.min(1, s);
}

/**
 * Günün kalanında beklenen fırsat — saf. En az 1 (şimdiki tur).
 *
 * Geçmiş varsa ortalama günlük fırsat, bugünün temposuyla yarı yarıya
 * düzeltiliyor. Yoksa bugünün temposu; o da yoksa varsayılan.
 */
export function kalanFirsat(opts: {
  profil: Profil;
  an: Date;
  /** Bugün şimdiye kadar gelen fırsat. */
  bugunSimdiye: number;
  acilis: number;
  kapanis: number;
}): number {
  const S = birikimliPay(opts.profil.paylar, opts.an);
  return Math.max(1, gunlukTahmin(opts, S) * Math.max(0, 1 - S));
}

/**
 * Bugün için beklenen toplam fırsat — `kalanFirsat` ve panel ortak kullanıyor.
 *
 * Bugün şimdiye kadar gelenin altına inmiyor: gelen fırsat zaten günün
 * parçası.
 */
export function gunlukTahmin(
  opts: { profil: Profil; bugunSimdiye: number; acilis: number; kapanis: number },
  S: number,
): number {
  return Math.max(opts.bugunSimdiye, hamTahmin(opts, S));
}

function hamTahmin(
  opts: { profil: Profil; bugunSimdiye: number; acilis: number; kapanis: number },
  S: number,
): number {
  const D = opts.profil.gunlukOrtalama;
  if (D !== null && D > 0) {
    const beklenenSimdiye = D * S;
    // Birkaç fırsatta oran gürültü — tempo düzeltmesi beklenen ya da gelen
    // 5'i bulunca. Yalnızca beklenene bakılsaydı az geçmişi olan kafede
    // (günde 9 fırsat) öğlene 13 gelse de tahmin 9'da kalıyordu.
    if (Math.max(beklenenSimdiye, opts.bugunSimdiye) >= 5) {
      const k = opts.bugunSimdiye / beklenenSimdiye;
      return D * Math.max(0.5, Math.min(3, 1 + BUGUN_AGIRLIGI * (k - 1)));
    }
    return D;
  }
  if (S >= 0.1 && opts.bugunSimdiye > 0) return opts.bugunSimdiye / S;
  return VARSAYILAN_SAATLIK_FIRSAT * acikSaatler(opts.acilis, opts.kapanis).length;
}

/**
 * İki an arasındaki pay — happy hour penceresinin beklenen fırsatı için.
 */
export function aralikPayi(paylar: readonly number[], bas: Date, bit: Date): number {
  return Math.max(0, birikimliPay(paylar, bit) - birikimliPay(paylar, bas));
}

/* ── Veritabanı ─────────────────────────────────────────────── */

/**
 * Fırsat süzgeci — ödül kazanabilecek tur.
 *
 * ⚠️ Günün oyun ödülünü **daha önce** almış oyuncunun turu sayılmıyor:
 * o tur bütçeden pay istemiyor (E2, günde bir oyun ödülü). Sayılsaydı
 * kalabalık tahmini şişer, şans gereksiz düşerdi.
 */
const FIRSAT_SUZGECI = `
  ps.cafe_id = $1
  AND ps.status = 'completed'
  AND ps.proof_level >= 2
  AND ps.server_score >= $2
  AND NOT EXISTS (
    SELECT 1 FROM coupons c
      JOIN play_sessions onceki ON onceki.id = c.play_session_id
     WHERE c.player_id = ps.player_id AND c.cafe_id = ps.cafe_id
       AND onceki.business_date = ps.business_date
       AND c.issued_at < ps.started_at
  )`;

/**
 * Kafenin bugünkü gün türü için profili — son `BAKILAN_GUN` gün, bugün hariç.
 */
export async function profilIle(
  db: Db,
  opts: { cafeId: string; acilis: number; kapanis: number; an?: Date },
): Promise<Profil> {
  const bugun = isGunu(opts.an);
  const tur = gunTuru(bugun);
  const hafta = tur === "hafta_sonu" ? [0, 6] : [1, 2, 3, 4, 5];

  const satirlar = await db.all<{ saat: number; n: string }>(
    `SELECT extract(hour FROM ps.started_at AT TIME ZONE 'Europe/Istanbul')::int AS saat,
            count(*)::text AS n
       FROM play_sessions ps
      WHERE ${FIRSAT_SUZGECI}
        AND ps.business_date >= $3::date AND ps.business_date < $4::date
        AND extract(dow FROM ps.business_date)::int = ANY($5::int[])
      GROUP BY 1`,
    [opts.cafeId, KUPON_ESIGI, gunEkle(bugun, -BAKILAN_GUN), bugun, hafta],
  );
  const gun = await db.one<{ n: string }>(
    `SELECT count(DISTINCT ps.business_date)::text AS n
       FROM play_sessions ps
      WHERE ${FIRSAT_SUZGECI}
        AND ps.business_date >= $3::date AND ps.business_date < $4::date
        AND extract(dow FROM ps.business_date)::int = ANY($5::int[])`,
    [opts.cafeId, KUPON_ESIGI, gunEkle(bugun, -BAKILAN_GUN), bugun, hafta],
  );

  const sayim = Array(24).fill(0) as number[];
  for (const s of satirlar) sayim[s.saat] = Number(s.n);
  return profilHesapla(sayim, Number(gun?.n ?? 0), opts.acilis, opts.kapanis, tur);
}

/** Bugün şimdiye kadar gelen fırsat. */
export async function bugunkuFirsatIle(
  db: Db,
  opts: { cafeId: string; an?: Date },
): Promise<number> {
  const r = await db.one<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM play_sessions ps
      WHERE ${FIRSAT_SUZGECI}
        AND ps.business_date = $3::date AND ps.started_at <= $4`,
    [opts.cafeId, KUPON_ESIGI, isGunu(opts.an), opts.an ?? new Date()],
  );
  return Number(r?.n ?? 0);
}

/**
 * Happy hour penceresinin kalanında beklenen fırsat — pencere havuzu için.
 *
 * Havuz günün oyun ödülünü ZATEN almış oyunculara ikinci ödül veriyor
 * (Ö3); `FIRSAT_SUZGECI` tam o oyuncuları dışarıda bırakıyor. Bu yüzden
 * burada ayrı sayılıyor: son bir saatte eşiği geçen, o gün oyun ödülü
 * almış oyuncuların turu, pencerenin kalan süresine yayılıyor. Pencere
 * yeni açıldıysa sayı küçük, şans yüksek başlıyor ve her yeni turla
 * kendini düzeltiyor.
 */
export async function pencereFirsatIle(
  db: Db,
  opts: { cafeId: string; bitis: Date; an?: Date },
): Promise<number> {
  const an = opts.an ?? new Date();
  const r = await db.one<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM play_sessions ps
      WHERE ps.cafe_id = $1
        AND ps.status = 'completed'
        AND ps.proof_level >= 2
        AND ps.server_score >= $2
        AND ps.started_at > $3::timestamptz - interval '60 minutes'
        AND ps.started_at <= $3
        AND EXISTS (
          SELECT 1 FROM coupons c
            JOIN play_sessions onceki ON onceki.id = c.play_session_id
           WHERE c.player_id = ps.player_id AND c.cafe_id = ps.cafe_id
             AND onceki.business_date = ps.business_date
             AND c.issued_at < ps.started_at
        )`,
    [opts.cafeId, KUPON_ESIGI, an],
  );
  const saatlik = Number(r?.n ?? 0);
  const kalanSaat = Math.max(0, (opts.bitis.getTime() - an.getTime()) / 3_600_000);
  return Math.max(1, saatlik * kalanSaat);
}

/**
 * Profilin en yoğun ardışık `uzunluk` saati — panelde "en yoğun 19–22".
 * Açık saat sayısı kısaysa hepsi.
 */
export function enYogunAralik(
  paylar: readonly number[],
  acilis: number,
  kapanis: number,
  uzunluk = 3,
): { bas: number; bit: number; pay: number } {
  const acik = acikSaatler(acilis, kapanis);
  const n = Math.min(uzunluk, acik.length);
  let enIyi = { bas: acik[0], bit: acik[0] + n, pay: -1 };
  for (let i = 0; i + n <= acik.length; i++) {
    const pay = acik.slice(i, i + n).reduce((s, h) => s + paylar[h], 0);
    if (pay > enIyi.pay) enIyi = { bas: acik[i], bit: acik[i] + n, pay };
  }
  return enIyi;
}
