import { withCafe, type Db } from "@/db/context";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { log } from "@/lib/log";
import { isGunu } from "@/lib/tarih";

/**
 * Ürün bazlı yüzde kampanyası — Ö4, Ü17, Ü26.
 *
 * Katalogdaki yüzdeli ödülden farkı: bu **puan istemez**, kafenin itmek
 * istediği ürüne bağlıdır ve otomatik düşer. Katalogdaki ise oyuncunun
 * puanıyla satın aldığı bir hedeftir. İki farklı ihtiyaç, iki tablo (Ü26).
 *
 * ── Üç sınır da zorunlu ─────────────────────────────────────
 *
 * Yüzde tek başına bir taahhüt değil: %20 demek, adisyon büyüdükçe büyüyen
 * bir borç demek. Üstünü kapatan üç sınır var ve **üçü de `NOT NULL`**:
 *
 *   TL tavanı (Ü17)  tek adisyonun sınırsız büyümesini engeller
 *   Adet limiti      toplam maruziyeti sınırlar
 *   Süre             unutulmuş kampanyanın süresiz akmasını engeller
 *
 * Üçü de veritabanı düzeyinde zorunlu — kod hata yapsa bile limitsiz
 * kampanya kaydedilemez (göç 0002 ve 0011).
 */

export type KampanyaDurumu = "draft" | "active" | "paused" | "ended";

export type Kampanya = {
  id: string;
  urunId: string;
  urunAdi: string;
  yuzde: number;
  /** Ü17: tek kullanımda düşülecek en yüksek tutar (kuruş). */
  tavanKurus: number;
  gunlukLimit: number;
  toplamLimit: number | null;
  baslangic: Date;
  bitis: Date;
  durum: KampanyaDurumu;
  /** Ü100: upsell kipi — bu ziyarette kullanılan teklif. */
  hemen: boolean;
  /** Upsell teklifinin geçerlilik süresi (saat). */
  gecerliSaat: number;
  /** Bugün bu kampanyadan kaç kupon çıktı — canlı sayaç. */
  bugunKullanilan: number;
  /** Kampanya başından beri toplam. */
  toplamKullanilan: number;
};

export type KampanyaSonucu = { ok: true; id: string } | { ok: false; hata: string };

/** En uzun kampanya süresi — unutulmuş kampanya en pahalı hatadır. */
export const EN_UZUN_GUN = 90;

export async function listele(cafeId: string): Promise<Kampanya[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{
      id: string;
      product_id: string;
      urun_adi: string;
      percent: number;
      max_discount_kurus: string;
      daily_limit: number;
      total_limit: number | null;
      starts_at: Date;
      ends_at: Date;
      status: KampanyaDurumu;
      instant: boolean;
      offer_hours: number;
      bugun: string;
      toplam: string;
    }>(
      `SELECT pc.id, pc.product_id, p.name AS urun_adi, pc.percent, pc.max_discount_kurus,
              pc.daily_limit, pc.total_limit, pc.starts_at, pc.ends_at, pc.status,
              pc.instant, pc.offer_hours,
              -- Gün başlangıcı İstanbul gece yarısı; sunucunun UTC günü değil.
              (SELECT count(*) FROM coupons k
                WHERE k.campaign_id = pc.id
                  AND k.issued_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul'))
                AS bugun,
              (SELECT count(*) FROM coupons k WHERE k.campaign_id = pc.id) AS toplam
         FROM percentage_campaigns pc
         JOIN products p ON p.id = pc.product_id
        ORDER BY
          CASE pc.status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,
          pc.ends_at DESC`,
      [isGunu()],
    ),
  );

  return satirlar.map((r) => ({
    id: r.id,
    urunId: r.product_id,
    urunAdi: r.urun_adi,
    yuzde: r.percent,
    tavanKurus: Number(r.max_discount_kurus),
    gunlukLimit: r.daily_limit,
    toplamLimit: r.total_limit,
    baslangic: r.starts_at,
    bitis: r.ends_at,
    durum: r.status,
    hemen: r.instant,
    gecerliSaat: r.offer_hours,
    bugunKullanilan: Number(r.bugun),
    toplamKullanilan: Number(r.toplam),
  }));
}

/* ── Teslim: hangi kampanya düşecek (Ü82) ──────────────────── */

export type UygunKampanya = {
  id: string;
  yuzde: number;
  urunAdi: string;
  /** Ü17: bütçeden rezerve edilecek TL tavanı (kuruş). */
  tavanKurus: number;
};

/**
 * Bu oyuncuya şu an düşebilecek kampanyayı seçer — yoksa `null`.
 *
 * ── Dört süzgeç, hepsi SQL'de ───────────────────────────────
 *
 * 1. **Yayında ve tarih aralığında** — `active`, `starts_at ≤ now < ends_at`
 * 2. **Günlük limit dolmamış** — bugün çıkan kupon sayısı `daily_limit`in altında
 * 3. **Toplam limit dolmamış** — `total_limit` doluysa ona da bakılıyor
 * 4. **Oyuncu bugün bu kampanyadan almamış** — günde bir, kampanya başına
 *
 * Dördü de tek sorguda ve **aynı işlemde**: ayrı okunsalardı iki eşzamanlı
 * oyun bitişi aynı son kupon hakkını iki kez görürdü. Yarışın tamamen
 * kapanması için sayım `FOR UPDATE` ile kilitlenen kampanya satırında
 * yapılıyor.
 *
 * ── Birden fazla uygunsa ────────────────────────────────────
 *
 * **Bugün en az kupon çıkanı** seçiliyor. Kafenin iki kampanyası varsa
 * ikisi de dönüşümlü teşhir alıyor; ilk sıradaki günlük limitini doldurup
 * ikincisini gölgede bırakmıyor. Eşitlikte önce **biteni** — süresi
 * yaklaşan kampanya kullanılmadan kapanmasın.
 *
 * Rastgelelik yok: hangi kampanyanın çıkacağı kafenin kendi ayarlarından
 * türüyor ve panelde gösterilen sayaçla birebir tutuyor.
 */
export async function uygunOlan(
  db: Db,
  cafeId: string,
  playerId: string,
): Promise<UygunKampanya | null> {
  const r = await db.one<{
    id: string;
    percent: number;
    urun_adi: string;
    max_discount_kurus: string;
  }>(
    `SELECT pc.id, pc.percent, p.name AS urun_adi, pc.max_discount_kurus
       FROM percentage_campaigns pc
       JOIN products p ON p.id = pc.product_id
      WHERE pc.cafe_id = $1
        AND pc.status = 'active'
        -- ⚠️ Ü100: upsell kampanyaları buradan GEÇMİYOR. Onlar oyun
        -- sonunda kendiliğinden kupona dönmüyor; oyuncuya teklif olarak
        -- gösteriliyor ve kabul edilirse kupon oluyor (domain/upsell.ts).
        -- Süzgeç konmasaydı upsell kuponu iki yoldan birden üretilirdi.
        -- Not: bu yorumda ters tırnak YOK — dizgiyi kapatır (Ü98'de bir
        -- kez yaşandı).
        AND NOT pc.instant
        AND pc.starts_at <= now() AND pc.ends_at > now()
        -- Günlük limit: gün başlangıcı İstanbul gece yarısı, sunucunun UTC günü değil.
        AND (SELECT count(*) FROM coupons k
              WHERE k.campaign_id = pc.id
                AND k.issued_at >= ($3::date::timestamp AT TIME ZONE 'Europe/Istanbul')
            ) < pc.daily_limit
        AND (pc.total_limit IS NULL
             OR (SELECT count(*) FROM coupons k WHERE k.campaign_id = pc.id) < pc.total_limit)
        -- Oyuncu bugün bu kampanyadan almadıysa
        AND NOT EXISTS (
              SELECT 1 FROM coupons k
               WHERE k.campaign_id = pc.id AND k.player_id = $2
                 AND k.issued_at >= ($3::date::timestamp AT TIME ZONE 'Europe/Istanbul'))
      ORDER BY (SELECT count(*) FROM coupons k
                 WHERE k.campaign_id = pc.id
                   AND k.issued_at >= ($3::date::timestamp AT TIME ZONE 'Europe/Istanbul')),
               pc.ends_at
      LIMIT 1
      FOR UPDATE OF pc`,
    [cafeId, playerId, isGunu()],
  );

  if (!r) return null;

  return {
    id: r.id,
    yuzde: r.percent,
    urunAdi: r.urun_adi,
    tavanKurus: Number(r.max_discount_kurus),
  };
}

export async function olustur(opts: {
  cafeId: string;
  urunId: string;
  yuzde: number;
  tavanKurus: number;
  gunlukLimit: number;
  toplamLimit?: number | null;
  gunSayisi: number;
  /**
   * Ü100: upsell kipi — bu ziyarette kullanılan teklif.
   *
   * Kupon ertelenmiyor, saatlerle sınırlı ve oyun sonunda kendiliğinden
   * verilmiyor; oyuncuya teklif olarak gösteriliyor.
   */
  hemen?: boolean;
  /** Upsell teklifinin kaç saat geçerli olduğu. Ziyaret süresi kadar. */
  gecerliSaat?: number;
  aktorId: string;
}): Promise<KampanyaSonucu> {
  if (!Number.isInteger(opts.yuzde) || opts.yuzde < 1 || opts.yuzde > 100) {
    return { ok: false, hata: "İndirim oranı 1 ile 100 arasında olmalı." };
  }
  if (!Number.isInteger(opts.tavanKurus) || opts.tavanKurus <= 0) {
    return { ok: false, hata: "TL tavanı zorunlu ve sıfırdan büyük olmalı (Ü17)." };
  }
  if (!Number.isInteger(opts.gunlukLimit) || opts.gunlukLimit <= 0) {
    return { ok: false, hata: "Günlük adet limiti zorunlu ve sıfırdan büyük olmalı." };
  }
  if (opts.toplamLimit != null && (!Number.isInteger(opts.toplamLimit) || opts.toplamLimit <= 0)) {
    return { ok: false, hata: "Toplam limit girildiyse sıfırdan büyük olmalı." };
  }
  if (!Number.isInteger(opts.gunSayisi) || opts.gunSayisi < 1 || opts.gunSayisi > EN_UZUN_GUN) {
    return { ok: false, hata: `Süre 1 ile ${EN_UZUN_GUN} gün arasında olmalı.` };
  }
  const gecerliSaat = opts.gecerliSaat ?? 3;
  if (opts.hemen && (!Number.isInteger(gecerliSaat) || gecerliSaat < 1 || gecerliSaat > 24)) {
    return { ok: false, hata: "Teklif süresi 1 ile 24 saat arasında olmalı." };
  }

  return withCafe(opts.cafeId, async (db) => {
    const urun = await db.one<{ price_kurus: string; name: string }>(
      `SELECT price_kurus, name FROM products WHERE id = $1 AND active`,
      [opts.urunId],
    );
    if (!urun) return { ok: false as const, hata: "Seçilen ürün bulunamadı." };

    // Tavan, ürünün kendi fiyatından yüksek olmamalı — %20 indirim en fazla
    // ürünün %20'si kadar olabilir. Yüksek tavan zararsız ama yanıltıcı:
    // panelde "en fazla 500 TL" yazan bir latte kampanyası kafeyi korkutur.
    const enYuksekMakul = Math.ceil((Number(urun.price_kurus) * opts.yuzde) / 100);
    if (opts.tavanKurus > enYuksekMakul) {
      return {
        ok: false as const,
        hata: `${urun.name} için %${opts.yuzde} indirim en fazla ${(enYuksekMakul / 100).toLocaleString("tr-TR")} TL eder. Tavanı bunun üstüne koymak anlamsız.`,
      };
    }

    const id = newId("cmp");
    await db.query(
      `INSERT INTO percentage_campaigns
         (id, cafe_id, product_id, percent, max_discount_kurus, daily_limit, total_limit,
          starts_at, ends_at, status, created_by, instant, offer_hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now(), now() + ($8 || ' days')::interval, 'draft', $9,
               $10, $11)`,
      [
        id,
        opts.cafeId,
        opts.urunId,
        opts.yuzde,
        opts.tavanKurus,
        opts.gunlukLimit,
        opts.toplamLimit ?? null,
        String(opts.gunSayisi),
        opts.aktorId,
        opts.hemen ?? false,
        gecerliSaat,
      ],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "campaign.create",
      targetType: "campaign",
      targetId: id,
      detail: {
        yuzde: opts.yuzde,
        tavanKurus: opts.tavanKurus,
        gunlukLimit: opts.gunlukLimit,
        gunSayisi: opts.gunSayisi,
        hemen: opts.hemen ?? false,
      },
    });

    return { ok: true as const, id };
  });
}

/**
 * Kampanyayı yayına alır, duraklatır veya bitirir.
 *
 * `ended` **geri alınamaz**: bitmiş kampanya yeniden başlatılmıyor, yenisi
 * açılıyor. Kafenin "durdurdum sanıyordum" diyeceği bir belirsizlik kalmasın.
 */
export async function durumDegistir(opts: {
  cafeId: string;
  kampanyaId: string;
  yeniDurum: KampanyaDurumu;
  aktorId: string;
}): Promise<{ ok: true } | { ok: false; hata: string }> {
  if (opts.yeniDurum === "draft") {
    return { ok: false, hata: "Kampanya taslağa geri döndürülemez." };
  }

  return withCafe(opts.cafeId, async (db) => {
    const mevcut = await db.one<{ status: KampanyaDurumu }>(
      `SELECT status FROM percentage_campaigns WHERE id = $1`,
      [opts.kampanyaId],
    );
    if (!mevcut) return { ok: false as const, hata: "Kampanya bulunamadı." };
    if (mevcut.status === "ended") {
      return { ok: false as const, hata: "Bitmiş kampanya yeniden başlatılamaz. Yenisini aç." };
    }

    await db.query(`UPDATE percentage_campaigns SET status = $2 WHERE id = $1`, [
      opts.kampanyaId,
      opts.yeniDurum,
    ]);

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: opts.yeniDurum === "active" ? "campaign.publish" : "campaign.stop",
      targetType: "campaign",
      targetId: opts.kampanyaId,
      detail: { onceki: mevcut.status, yeni: opts.yeniDurum },
    });

    log.info("kampanya durumu degisti", { yeni: opts.yeniDurum });
    return { ok: true as const };
  });
}
