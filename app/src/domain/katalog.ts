import { withCafe } from "@/db/context";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";

/**
 * Ödül kataloğu — kafenin oyuncuya sunduğu ödüller.
 *
 * ── Üç tip (Ü18, Ü26) ───────────────────────────────────────
 *
 *   🏆 Ürün ödülü      kafenin kendi ürünü; `maliyetKurus` perakende değeri
 *   🎟️ Yüzdeli indirim yüzde + **TL tavanı**; `maliyetKurus` TAVANDIR (Ü17)
 *   💸 Tutar indirimi  sabit TL; `maliyetKurus` tutarın kendisi
 *
 * Kafe **bakiyesi** hâlâ yok (Ü18): saklanan değer aracı v1 kapsamı dışında.
 * Tutar indirimi bakiye DEĞİL — tek kullanımlık bir kupon; adisyondan bir
 * kez düşülüyor, kalanı saklanmıyor, sonraki ziyarete devretmiyor. Bakiyenin
 * getirdiği kısmi kullanım, kalan takibi, iade/itiraz akışı ve ödeme
 * mevzuatı sınırı bu tipte hiç doğmuyor.
 *
 * Rezervasyon üç tipte de aynı: her zaman `maliyetKurus` bütçeden rezerve
 * edilir. Yalnızca **yüzdelide** kasada gerçekleşen tutar düşülür ve fark
 * iade edilir; diğer ikisinde gerçekleşen zaten tutarın kendisi.
 *
 * ── Kanıt seviyesi kafenin seçimi değil ─────────────────────
 *
 * E6 ödül değerine göre kanıt seviyesi istiyor: 1–15 TL → K2, 16–50 TL → K3,
 * 51 TL+ → K4. Bu bir **platform kuralı**; kafenin panelinden seçilemiyor,
 * tutardan hesaplanıyor. Kafe seçebilseydi, en pahalı ödülü en zayıf kanıtla
 * verip fraud'a kapı açabilirdi.
 */

export type OdulTipi = "product" | "percent" | "amount";

export type Odul = {
  id: string;
  tip: OdulTipi;
  baslik: string;
  aciklama: string | null;
  /** Ürün ödülünde perakende değeri, yüzdelide TL tavanı, tutar indiriminde tutarın kendisi (kuruş). */
  maliyetKurus: number;
  /** Yüzdeli ödülde indirim oranı; ürün ödülünde null. */
  yuzde: number | null;
  puanFiyati: number;
  /** E2: anlık ödül puan istemez. */
  anlik: boolean;
  kanitSeviyesi: number;
  urunId: string | null;
  urunAdi: string | null;
  aktif: boolean;
};

export type OdulSonucu = { ok: true; id: string } | { ok: false; hata: string };

/** E6: ödül değerine göre gereken kanıt seviyesi. */
export function kanitSeviyesi(maliyetKurus: number): number {
  if (maliyetKurus <= 15_00) return 2;
  if (maliyetKurus <= 50_00) return 3;
  return 4;
}

export async function listele(cafeId: string): Promise<Odul[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{
      id: string;
      reward_type: OdulTipi;
      title: string;
      description: string | null;
      cost_kurus: string;
      percent: number | null;
      points_price: number;
      kind: string;
      min_proof_level: number;
      product_id: string | null;
      urun_adi: string | null;
      active: boolean;
    }>(
      `SELECT r.id, r.reward_type, r.title, r.description, r.cost_kurus, r.percent,
              r.points_price, r.kind, r.min_proof_level, r.product_id,
              p.name AS urun_adi, r.active
         FROM rewards r
         LEFT JOIN products p ON p.id = r.product_id
        ORDER BY r.active DESC, r.kind DESC, r.sort_order, r.points_price`,
    ),
  );

  return satirlar.map((r) => ({
    id: r.id,
    tip: r.reward_type,
    baslik: r.title,
    aciklama: r.description,
    maliyetKurus: Number(r.cost_kurus),
    yuzde: r.percent,
    puanFiyati: r.points_price,
    anlik: r.kind === "instant",
    kanitSeviyesi: r.min_proof_level,
    urunId: r.product_id,
    urunAdi: r.urun_adi,
    aktif: r.active,
  }));
}

export async function ekle(opts: {
  cafeId: string;
  tip: OdulTipi;
  baslik: string;
  aciklama?: string;
  maliyetKurus: number;
  yuzde?: number;
  puanFiyati: number;
  anlik: boolean;
  urunId?: string;
  aktorId: string;
}): Promise<OdulSonucu> {
  const baslik = opts.baslik.trim();

  if (baslik.length < 2) return { ok: false, hata: "Ödül adı en az iki harf olmalı." };
  if (baslik.length > 60) return { ok: false, hata: "Ödül adı en fazla 60 karakter." };

  if (!Number.isInteger(opts.maliyetKurus) || opts.maliyetKurus <= 0) {
    return {
      ok: false,
      hata:
        opts.tip === "percent"
          ? "TL tavanı sıfırdan büyük olmalı — tavansız yüzde indirimi tanımlanamaz."
          : opts.tip === "amount"
            ? "İndirim tutarı sıfırdan büyük olmalı."
            : "Ödülün TL değeri sıfırdan büyük olmalı.",
    };
  }

  if (opts.tip === "percent") {
    if (!Number.isInteger(opts.yuzde) || (opts.yuzde ?? 0) < 1 || (opts.yuzde ?? 0) > 100) {
      return { ok: false, hata: "İndirim oranı 1 ile 100 arasında olmalı." };
    }
  } else if (opts.yuzde != null) {
    return {
      ok: false,
      hata:
        opts.tip === "amount"
          ? "Tutar indiriminde oran olmaz — tutarın kendisi giriliyor."
          : "Ürün ödülünde indirim oranı olmaz.",
    };
  }

  // E2: anlık ödül puan istemez. Şema da reddediyor; burada anlaşılır cümle.
  const puanFiyati = opts.anlik ? 0 : opts.puanFiyati;
  if (!opts.anlik && (!Number.isInteger(puanFiyati) || puanFiyati <= 0)) {
    return { ok: false, hata: "Katalog ödülünün puan fiyatı sıfırdan büyük olmalı." };
  }

  return withCafe(opts.cafeId, async (db) => {
    if (opts.urunId) {
      const urun = await db.one(`SELECT 1 FROM products WHERE id = $1 AND active`, [opts.urunId]);
      if (!urun) return { ok: false as const, hata: "Seçilen ürün bulunamadı." };
    }

    const id = newId("rwd");
    await db.query(
      `INSERT INTO rewards
         (id, cafe_id, kind, reward_type, title, description, points_price, cost_kurus,
          percent, product_id, min_proof_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        opts.cafeId,
        opts.anlik ? "instant" : "catalog",
        opts.tip,
        baslik,
        opts.aciklama?.trim() || null,
        puanFiyati,
        opts.maliyetKurus,
        opts.tip === "percent" ? opts.yuzde : null,
        opts.urunId ?? null,
        kanitSeviyesi(opts.maliyetKurus),
      ],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.create",
      targetType: "reward",
      targetId: id,
      detail: {
        tip: opts.tip,
        maliyetKurus: opts.maliyetKurus,
        puanFiyati,
        anlik: opts.anlik,
        yuzde: opts.yuzde ?? null,
      },
    });

    return { ok: true as const, id };
  });
}

/** Ödülü yayından kaldırır veya geri açar. Silinmiyor — geçmiş kuponlar bağlı. */
export async function durumDegistir(opts: {
  cafeId: string;
  odulId: string;
  aktif: boolean;
  aktorId: string;
}): Promise<boolean> {
  return withCafe(opts.cafeId, async (db) => {
    const r = await db.query(`UPDATE rewards SET active = $2 WHERE id = $1`, [
      opts.odulId,
      opts.aktif,
    ]);
    if (!r.rowCount) return false;

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.update",
      targetType: "reward",
      targetId: opts.odulId,
      detail: { aktif: opts.aktif },
    });
    return true;
  });
}
