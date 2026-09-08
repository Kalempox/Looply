import { withBypass, withCafe, type Db } from "@/db/context";
import { newId } from "@/lib/ids";
import { log } from "@/lib/log";
import { isGunu } from "@/lib/tarih";
import type { Aralik } from "./rapor";

/**
 * Upsell: bu ziyarette kullanılan teklif (Ü100).
 *
 * ── Ne olduğu ───────────────────────────────────────────────
 *
 * Ürün sahibi terimi bilmiyordu, açıkladık ve tanım netleşti: müşteri
 * zaten masada; amaç onu **yarın geri getirmek değil, bugün ikinci ürünü
 * sattırmak**. Kahveyi içen kişiye tatlıyı satmak.
 *
 * ⚠️ Bu, kurduğumuz ekonominin **tersi yönde** çalışıyor:
 *
 *   normal ödül → 12 saat bekler → ertesi ziyareti üretir (Ü28, Ü97)
 *   upsell      → hemen kullanılır → bu ziyarette satış üretir
 *
 * Bu yüzden ayrı bir kavram değil, yüzde kampanyasının bir **kipi**
 * (`percentage_campaigns.instant`). Ayrı bir ekonomi kolu açmak, limit ve
 * bütçe kurallarını ikinci kez yazmak olurdu.
 *
 * ── Neden oyuncu teklifi kabul ediyor ───────────────────────
 *
 * Normal kampanya kuponu oyun sonunda kendiliğinden veriliyor. Upsell'de
 * bu iki sebeple yanlış olurdu:
 *
 *   1. ⚠️ **Bütçe.** Kupon üretildiği anda tutarı rezerve oluyor (Ü7).
 *      Teklifi görmezden gelecek on kişiye kupon basmak, kafenin günlük
 *      bütçesini kullanılmayacak sözlere bağlar. Ürün sahibinin en çok
 *      dikkat ettiği şey bütçenin yönetilebilirliği (Ü89).
 *   2. ⚠️ **Ölçüm.** "Gösterildi" ile "aldı" aynı şey olursa huninin ilk
 *      iki basamağı hep eşit çıkar ve teklifin ilgi çekip çekmediği
 *      ölçülemez.
 *
 * ── 🔴 POS yok: neyi ölçtüğümüze dikkat ─────────────────────
 *
 * Panel görselinde huninin altında *"840 TL ek satış geliri"* yazıyor.
 * **Bunu yazamayız.** Kupon kasada onaylandığında bildiğimiz şey
 * "cheesecake kuponu kullanıldı"; "cheesecake satıldı ve şu kadar gelir
 * oldu" değil. İkisi kulağa aynı geliyor ama biri ölçüm, öbürü tahmin.
 * Tahmini kesin gibi yazan panel, ilk tutmayan sayıda güvenini kaybeder.
 *
 * Bu modül yalnızca sayabildiğini sayıyor: gösterim, kabul, kullanım ve
 * kullanılan kuponların bağladığı **indirim** tutarı.
 */

export type Teklif = {
  /** Gösterim defterindeki satır — kabul bunun üstünden yapılıyor. */
  teklifId: string;
  kampanyaId: string;
  yuzde: number;
  urunAdi: string;
  gecerliSaat: number;
};

/**
 * Bu oyuncuya gösterilecek upsell teklifi var mı?
 *
 * Uygunluk süzgeçleri normal kampanyayla **aynı** (aktif, tarih aralığı,
 * günlük limit, toplam limit, oyuncu bugün almamış) — tek fark
 * `instant = true` ve sayımın kuponlara değil **kabul edilmiş tekliflere**
 * bakması.
 *
 * ⚠️ Limitler kabul üzerinden sayılıyor, gösterim üzerinden değil:
 * gösterim kafeye hiçbir şeye mal olmuyor, kupon mal oluyor. Gösterimi
 * limite saysaydık kafe "20 kişiye göstereyim" derken 20 kuponluk hakkını
 * ilk 20 bakışta harcardı.
 */
export async function uygunTeklif(
  db: Db,
  opts: { cafeId: string; playerId: string; oturumId?: string },
): Promise<Teklif | null> {
  const r = await db.one<{
    id: string;
    percent: number;
    urun_adi: string;
    offer_hours: number;
  }>(
    `SELECT pc.id, pc.percent, p.name AS urun_adi, pc.offer_hours
       FROM percentage_campaigns pc
       JOIN products p ON p.id = pc.product_id
      WHERE pc.cafe_id = $1
        AND pc.instant
        AND pc.status = 'active'
        AND pc.starts_at <= now() AND pc.ends_at > now()
        AND (SELECT count(*) FROM campaign_offers o
              WHERE o.campaign_id = pc.id AND o.taken_at IS NOT NULL
                AND o.taken_at >= ($3::date::timestamp AT TIME ZONE 'Europe/Istanbul')
            ) < pc.daily_limit
        AND (pc.total_limit IS NULL
             OR (SELECT count(*) FROM campaign_offers o
                  WHERE o.campaign_id = pc.id AND o.taken_at IS NOT NULL) < pc.total_limit)
        -- Oyuncu bugün bu kampanyayı zaten aldıysa tekrar gösterilmiyor.
        AND NOT EXISTS (
              SELECT 1 FROM campaign_offers o
               WHERE o.campaign_id = pc.id AND o.player_id = $2
                 AND o.taken_at >= ($3::date::timestamp AT TIME ZONE 'Europe/Istanbul'))
      ORDER BY pc.ends_at
      LIMIT 1
      FOR UPDATE OF pc`,
    [opts.cafeId, opts.playerId, isGunu()],
  );

  if (!r) return null;

  /**
   * Gösterimi deftere yaz.
   *
   * ⚠️ Aynı oyun oturumunda ikinci gösterim engelleniyor (şemadaki tekil
   * indeks). Oyuncu sonuç ekranını yenilediğinde huni şişmemeli — yoksa
   * "18 kişiye gösterildi" sayısı gerçek kişi değil sayfa yenileme sayısı
   * olurdu. `ON CONFLICT` var olan satırı geri veriyor: aynı teklif.
   */
  const teklifId = newId("tkl");
  const yazilan = await db.one<{ id: string }>(
    `INSERT INTO campaign_offers (id, cafe_id, campaign_id, player_id, play_session_id)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (campaign_id, play_session_id) WHERE play_session_id IS NOT NULL
       DO UPDATE SET campaign_id = campaign_offers.campaign_id
     RETURNING id`,
    [teklifId, opts.cafeId, r.id, opts.playerId, opts.oturumId ?? null],
  );

  return {
    teklifId: yazilan?.id ?? teklifId,
    kampanyaId: r.id,
    yuzde: r.percent,
    urunAdi: r.urun_adi,
    gecerliSaat: r.offer_hours,
  };
}

export type KabulSonucu =
  | { ok: true; kuponId: string; kod: string; baslik: string; sonKullanim: Date }
  | { ok: false; hata: string };

/**
 * Teklifi kabul et — kupon burada üretiliyor.
 *
 * ⚠️ Teklif **oyuncunun kendi satırı** olmalı: `player_id` süzgeci
 * sorguda açıkça duruyor. Değişmez kural #3'ün buradaki karşılığı —
 * istemciden gelen tek şey teklif kimliği ve o kimlik başkasının
 * teklifini açamıyor.
 *
 * ⚠️ Kupon üretimi `kupon.ts`'e devrediliyor: bütçe rezervasyonu, kanıt
 * kademesi, takma ad ve defter satırı orada. İkinci bir kupon üretme yolu
 * açmak, o kuralların birini bir gün unutmak demek olurdu.
 */
export async function teklifiAl(opts: {
  playerId: string;
  teklifId: string;
  kanitSeviyesi: number;
  /** Kuponu üreten fonksiyon — döngüsel bağımlılık olmasın diye dışarıdan. */
  kuponVer: (
    db: Db,
    g: {
      cafeId: string;
      kampanyaId: string;
      baslik: string;
      tavanKurus: number;
      gecerliSaat: number;
    },
  ) => Promise<{ ok: true; kuponId: string; kod: string } | { ok: false; hata: string }>;
}): Promise<KabulSonucu> {
  return withBypass("upsell teklifi kabul", async (db) => {
    const t = await db.one<{
      id: string;
      cafe_id: string;
      campaign_id: string;
      taken_at: Date | null;
      percent: number;
      urun_adi: string;
      max_discount_kurus: string;
      offer_hours: number;
      status: string;
      bitis: Date;
    }>(
      `SELECT o.id, o.cafe_id, o.campaign_id, o.taken_at,
              pc.percent, p.name AS urun_adi, pc.max_discount_kurus,
              pc.offer_hours, pc.status, pc.ends_at AS bitis
         FROM campaign_offers o
         JOIN percentage_campaigns pc ON pc.id = o.campaign_id
         JOIN products p ON p.id = pc.product_id
        WHERE o.id = $1 AND o.player_id = $2
        FOR UPDATE OF o`,
      [opts.teklifId, opts.playerId],
    );

    if (!t) return { ok: false as const, hata: "Teklif bulunamadı." };
    if (t.taken_at) return { ok: false as const, hata: "Bu teklifi zaten aldın." };
    if (t.status !== "active" || t.bitis <= new Date()) {
      return { ok: false as const, hata: "Bu teklif artık geçerli değil." };
    }

    const baslik = `%${t.percent} · ${t.urun_adi}`;
    const sonuc = await opts.kuponVer(db, {
      cafeId: t.cafe_id,
      kampanyaId: t.campaign_id,
      baslik,
      tavanKurus: Number(t.max_discount_kurus),
      gecerliSaat: t.offer_hours,
    });

    if (!sonuc.ok) return { ok: false as const, hata: sonuc.hata };

    await db.query(
      `UPDATE campaign_offers SET coupon_id = $2, taken_at = now() WHERE id = $1`,
      [opts.teklifId, sonuc.kuponId],
    );

    log.info("upsell teklifi alindi", { gecerliSaat: t.offer_hours });

    return {
      ok: true as const,
      kuponId: sonuc.kuponId,
      kod: sonuc.kod,
      baslik,
      sonKullanim: new Date(Date.now() + t.offer_hours * 3_600_000),
    };
  });
}

export type HuniSatiri = {
  kampanyaId: string;
  urunAdi: string;
  yuzde: number;
  gosterildi: number;
  alindi: number;
  kullanildi: number;
  /** Kullanılan kuponların kasada tuttuğu indirim. */
  indirimKurus: number;
};

/**
 * Upsell hunisi — kafe panelinin sayısı.
 *
 * ⚠️ Son basamak **"kullanıldı"**, "satıldı" değil. POS'umuz yok; kupon
 * kasada onaylandığında müşterinin ne satın aldığını bilmiyoruz. Panel
 * bunu böyle yazmalı, yoksa ölçmediğimiz bir şeyi ölçmüş gibi göstermiş
 * oluruz.
 */
export async function huni(cafeId: string, aralik: Aralik): Promise<HuniSatiri[]> {
  return withCafe(cafeId, async (db) => {
    const satirlar = await db.all<{
      kampanya_id: string;
      urun_adi: string;
      percent: number;
      gosterildi: string;
      alindi: string;
      kullanildi: string;
      kurus: string;
    }>(
      `SELECT o.campaign_id AS kampanya_id, p.name AS urun_adi, pc.percent,
              count(*)                                        AS gosterildi,
              count(*) FILTER (WHERE o.taken_at IS NOT NULL)  AS alindi,
              count(*) FILTER (WHERE c.status = 'redeemed')   AS kullanildi,
              COALESCE(sum(c.committed_kurus) FILTER (WHERE c.status = 'redeemed'), 0) AS kurus
         FROM campaign_offers o
         JOIN percentage_campaigns pc ON pc.id = o.campaign_id
         JOIN products p ON p.id = pc.product_id
         LEFT JOIN coupons c ON c.id = o.coupon_id
        WHERE o.shown_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul')
          AND o.shown_at <  ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul')
        GROUP BY o.campaign_id, p.name, pc.percent
        ORDER BY count(*) DESC`,
      [aralik.baslangic, aralik.bitis],
    );

    return satirlar.map((r) => ({
      kampanyaId: r.kampanya_id,
      urunAdi: r.urun_adi,
      yuzde: r.percent,
      gosterildi: Number(r.gosterildi),
      alindi: Number(r.alindi),
      kullanildi: Number(r.kullanildi),
      indirimKurus: Number(r.kurus),
    }));
  });
}
