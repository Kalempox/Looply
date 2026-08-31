import { withCafe } from "@/db/context";
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
      bugun: string;
      toplam: string;
    }>(
      `SELECT pc.id, pc.product_id, p.name AS urun_adi, pc.percent, pc.max_discount_kurus,
              pc.daily_limit, pc.total_limit, pc.starts_at, pc.ends_at, pc.status,
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
    bugunKullanilan: Number(r.bugun),
    toplamKullanilan: Number(r.toplam),
  }));
}

export async function olustur(opts: {
  cafeId: string;
  urunId: string;
  yuzde: number;
  tavanKurus: number;
  gunlukLimit: number;
  toplamLimit?: number | null;
  gunSayisi: number;
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
          starts_at, ends_at, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now(), now() + ($8 || ' days')::interval, 'draft', $9)`,
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
