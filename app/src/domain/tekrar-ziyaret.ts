import { withCafe } from "@/db/context";
import { isGunu, gunEkle } from "@/lib/tarih";
import { GIZLEME_ESIGI, esikVarsayilan } from "./rapor";

/**
 * Tekrar ziyaret metriği (Ü102).
 *
 * ── Neden bu, ürünün en kritik sayısı ───────────────────────
 *
 * Kapsam belgesi bunu *"en kritik metrik"* diye işaretledi ve dış analiz
 * de aynı yere geldi: işletmecinin sorduğu soru **"kaç kişi oynadı"**
 * değil, *"bu sistem sayesinde müşteri geri geldi mi?"*
 *
 * Looply'nin bütün ekonomisi bu iddia üzerine kurulu — ödül 12 saat
 * bekliyor (Ü28, Ü97) ki oyuncunun geri gelmek için bir sebebi olsun.
 * İddia ölçülmezse ürün, oyun oynatan bir eğlence olarak kalır.
 *
 * ── ⚠️ Kohorta zaman tanımak ────────────────────────────────
 *
 * En kolay yanlış şu olurdu: *"bu ay gelenlerin %20'si tekrar geldi."*
 * Dün ilk kez gelen birinin geri dönmeye **zamanı olmadı**; onu paydaya
 * koymak oranı sistematik olarak düşük gösterir ve kafe ürünün işe
 * yaramadığını sanır.
 *
 * Bu yüzden kohort **kapanmış** bir aralıktan seçiliyor: ilk ziyareti
 * `[D-42, D-14]` arasında olanlar. Herkese en az 14 gün tanınıyor.
 * Pencere ekranda da **yazılıyor** — okuyan neyi okuduğunu bilmeli.
 *
 * ── ⚠️ Ziyaret nedir ────────────────────────────────────────
 *
 * Bir **gün**, bir kafe. Aynı gün üç oyun oynayan kişi bir kez gelmiştir.
 * Oyun sayısını ziyaret saymak, en çok oynayanı en sadık müşteri gibi
 * gösterirdi; oysa ikisi farklı şeyler.
 *
 * Yalnızca **nitelikli** oturumlar (`is_qualified`): kafede olduğu
 * doğrulanmamış bir oyun ziyaret değildir.
 *
 * ── 🔴 Kupon etkisi bir NEDENSELLİK İDDİASI DEĞİL ───────────
 *
 * "Kupon kazananların dönüş oranı %38, kazanmayanların %12" cümlesi
 * doğru olabilir ama *"kupon sayesinde döndüler"* demek **değildir**:
 * kupon kazanan oyuncu zaten daha çok oynamış, daha iyi skor yapmış,
 * muhtemelen zaten daha bağlı biri. Karşılaştırma **fark** olarak
 * sunuluyor ve ekran bunun bir tahmin olmadığını, bir gözlem olduğunu
 * söylüyor. Gerçek nedenselliği ölçmek A/B testi ister (Dalga 4).
 */

/** Kohort penceresi: bu kadar gün öncesine kadar bakılıyor. */
export const KOHORT_BASI_GUN = 42;

/** Kohortun en yeni üyesine tanınan gün sayısı. */
export const FIRSAT_GUNU = 14;

export type TekrarZiyaret = {
  /** Kohortun tanımı — ekranda yazılması için. */
  pencere: { baslangic: string; bitis: string; firsatGunu: number };
  /** Bu pencerede ilk kez gelen kişi sayısı. */
  kohort: number | null;
  /** İçlerinden en az bir kez daha gelenler. */
  donen: number | null;
  /** Dönüş oranı (0–1). Kohort eşiğin altındaysa null. */
  oran: number | null;
  /** İlk ve ikinci ziyaret arasındaki ortanca gün. */
  ortancaGun: number | null;
  /** Kaçıncı ziyarette oldukları — bütün dönem için. */
  dagilim: { etiket: string; kisi: number }[];
  /** 🔴 Gözlem, nedensellik değil. */
  kuponFarki: {
    kuponluDonen: number | null;
    kuponluToplam: number | null;
    kuponsuzDonen: number | null;
    kuponsuzToplam: number | null;
  };
};

/** Ü30: eşiğin altındaki grubu gizler. */
function gizle(sayi: number, esikAcik: boolean): number | null {
  if (!esikAcik) return sayi;
  return sayi > 0 && sayi < GIZLEME_ESIGI ? null : sayi;
}

export async function tekrarZiyaret(
  cafeId: string,
  an: Date = new Date(),
  esikAcik = esikVarsayilan(),
): Promise<TekrarZiyaret> {
  const bugun = isGunu(an);
  const bas = gunEkle(bugun, -KOHORT_BASI_GUN);
  const bit = gunEkle(bugun, -FIRSAT_GUNU);

  return withCafe(cafeId, async (db) => {
    /**
     * Kohort ve dönüş.
     *
     * `ziyaretler`: kişi başına **ayrı gün** listesi — aynı günün birden
     * çok oyunu tek satıra iniyor.
     * `ilk`: her kişinin bu kafedeki ilk ziyaret günü.
     * Kohort, ilk ziyareti pencereye düşenler.
     */
    const r = await db.one<{
      kohort: string;
      donen: string;
      ortanca: string | null;
    }>(
      `WITH ziyaretler AS (
         SELECT DISTINCT player_id, business_date AS gun
           FROM play_sessions
          WHERE is_qualified AND business_date IS NOT NULL
       ),
       ilk AS (
         SELECT player_id, min(gun) AS ilk_gun FROM ziyaretler GROUP BY player_id
       ),
       kohort AS (
         SELECT i.player_id, i.ilk_gun
           FROM ilk i
          WHERE i.ilk_gun >= $1::date AND i.ilk_gun <= $2::date
       ),
       ikinci AS (
         SELECT k.player_id, k.ilk_gun, min(z.gun) AS ikinci_gun
           FROM kohort k
           JOIN ziyaretler z ON z.player_id = k.player_id AND z.gun > k.ilk_gun
          GROUP BY k.player_id, k.ilk_gun
       )
       SELECT (SELECT count(*) FROM kohort)::text  AS kohort,
              (SELECT count(*) FROM ikinci)::text  AS donen,
              (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY (ikinci_gun - ilk_gun))
                 FROM ikinci)::text                AS ortanca`,
      [bas, bit],
    );

    const kohortSayi = Number(r?.kohort ?? 0);
    const donenSayi = Number(r?.donen ?? 0);

    /**
     * ⚠️ Oran, kohort gizlenmişse de gizleniyor.
     *
     * Yüzde tek başına zararsız görünür ama küçük kohortta geri
     * hesaplanabilir: "3 kişiden %33" cümlesi bir kişiyi işaret eder.
     * Ü30'un amacı tam olarak bu.
     */
    const kohortGoster = gizle(kohortSayi, esikAcik);
    const oran = kohortGoster != null && kohortSayi > 0 ? donenSayi / kohortSayi : null;

    // ── Kaçıncı ziyaret dağılımı ───────────────────────────
    const dagilimSatirlari = await db.all<{ kova: string; kisi: string }>(
      `WITH ziyaretler AS (
         SELECT DISTINCT player_id, business_date AS gun
           FROM play_sessions
          WHERE is_qualified AND business_date IS NOT NULL
       ),
       sayim AS (
         SELECT player_id, count(*) AS n FROM ziyaretler GROUP BY player_id
       )
       SELECT CASE WHEN n = 1 THEN '1' WHEN n = 2 THEN '2' WHEN n = 3 THEN '3'
                   ELSE '4+' END AS kova,
              count(*)::text AS kisi
         FROM sayim GROUP BY 1 ORDER BY 1`,
    );

    const dagilim = ["1", "2", "3", "4+"].map((k) => {
      const s = dagilimSatirlari.find((x) => x.kova === k);
      return {
        etiket: k === "1" ? "Tek ziyaret" : k === "4+" ? "4+ ziyaret" : `${k} ziyaret`,
        kisi: Number(s?.kisi ?? 0),
      };
    });

    /**
     * ── Kupon kazananlar geri geliyor mu? ─────────────────
     *
     * 🔴 Bu bir **gözlem**, nedensellik değil. Kupon kazanan oyuncu zaten
     * daha çok oynamış, daha iyi skor yapmış, muhtemelen zaten daha bağlı.
     * Ekran farkı gösteriyor ve "sayesinde" demiyor.
     *
     * Kupon, kohortun **ilk ziyaretinde** kazanılmış olmalı: sonradan
     * kazanılan kupon dönüşün sebebi olamaz, sonucudur.
     */
    const kupon = await db.one<{
      kuponlu_toplam: string;
      kuponlu_donen: string;
      kuponsuz_toplam: string;
      kuponsuz_donen: string;
    }>(
      `WITH ziyaretler AS (
         SELECT DISTINCT player_id, business_date AS gun
           FROM play_sessions
          WHERE is_qualified AND business_date IS NOT NULL
       ),
       ilk AS (
         SELECT player_id, min(gun) AS ilk_gun FROM ziyaretler GROUP BY player_id
       ),
       kohort AS (
         SELECT i.player_id, i.ilk_gun,
                EXISTS (
                  SELECT 1 FROM coupons c
                   WHERE c.player_id = i.player_id
                     AND (c.issued_at AT TIME ZONE 'Europe/Istanbul')::date = i.ilk_gun
                ) AS kuponlu,
                EXISTS (
                  SELECT 1 FROM ziyaretler z
                   WHERE z.player_id = i.player_id AND z.gun > i.ilk_gun
                ) AS dondu
           FROM ilk i
          WHERE i.ilk_gun >= $1::date AND i.ilk_gun <= $2::date
       )
       SELECT count(*) FILTER (WHERE kuponlu)::text                 AS kuponlu_toplam,
              count(*) FILTER (WHERE kuponlu AND dondu)::text       AS kuponlu_donen,
              count(*) FILTER (WHERE NOT kuponlu)::text             AS kuponsuz_toplam,
              count(*) FILTER (WHERE NOT kuponlu AND dondu)::text   AS kuponsuz_donen
         FROM kohort`,
      [bas, bit],
    );

    return {
      pencere: { baslangic: bas, bitis: bit, firsatGunu: FIRSAT_GUNU },
      kohort: kohortGoster,
      donen: kohortGoster == null ? null : gizle(donenSayi, esikAcik),
      oran,
      ortancaGun: r?.ortanca == null ? null : Math.round(Number(r.ortanca)),
      dagilim,
      kuponFarki: {
        kuponluToplam: gizle(Number(kupon?.kuponlu_toplam ?? 0), esikAcik),
        kuponluDonen: gizle(Number(kupon?.kuponlu_donen ?? 0), esikAcik),
        kuponsuzToplam: gizle(Number(kupon?.kuponsuz_toplam ?? 0), esikAcik),
        kuponsuzDonen: gizle(Number(kupon?.kuponsuz_donen ?? 0), esikAcik),
      },
    };
  });
}
