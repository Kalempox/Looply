import { withCafe } from "@/db/context";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";

/**
 * Kafe ürün listesi — kafenin kendi menüsü.
 *
 * Ürünler tek başına ödül değil; **ödülün ve kampanyanın dayanağı**:
 * "1 filtre kahve — 45 TL" ödülü de, "latte'de %20" kampanyası da buradaki
 * bir satıra bağlanıyor. Fiyat, bütçeden düşecek tutarın kaynağı.
 *
 * `cafe_id` her zaman oturumdan geliyor (değişmez kural #3) ve `withCafe`
 * bağlamı RLS ile ikinci katmanı kuruyor: başka kafenin ürünü sorgu yanlış
 * yazılsa bile dönmez.
 */

export type Urun = {
  id: string;
  ad: string;
  fiyatKurus: number;
  aktif: boolean;
};

/** Ürün adı ve fiyatı için sınırlar — panel formu da bunları kullanıyor. */
export const EN_UZUN_AD = 60;
export const EN_YUKSEK_FIYAT_KURUS = 1_000_00; // 1.000 TL

export type UrunSonucu = { ok: true; urun: Urun } | { ok: false; hata: string };

export async function listele(cafeId: string, hepsi = true): Promise<Urun[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{ id: string; name: string; price_kurus: string; active: boolean }>(
      `SELECT id, name, price_kurus, active FROM products
        ${hepsi ? "" : "WHERE active"}
        ORDER BY active DESC, name`,
    ),
  );

  return satirlar.map((r) => ({
    id: r.id,
    ad: r.name,
    fiyatKurus: Number(r.price_kurus),
    aktif: r.active,
  }));
}

export async function ekle(opts: {
  cafeId: string;
  ad: string;
  fiyatKurus: number;
  aktorId: string;
}): Promise<UrunSonucu> {
  const ad = opts.ad.trim();

  if (ad.length < 2) return { ok: false, hata: "Ürün adı en az iki harf olmalı." };
  if (ad.length > EN_UZUN_AD) return { ok: false, hata: `Ürün adı en fazla ${EN_UZUN_AD} karakter.` };
  if (!Number.isInteger(opts.fiyatKurus) || opts.fiyatKurus <= 0) {
    return { ok: false, hata: "Fiyat sıfırdan büyük olmalı." };
  }
  if (opts.fiyatKurus > EN_YUKSEK_FIYAT_KURUS) {
    return { ok: false, hata: "Fiyat 1.000 TL'yi aşamaz — yanlış yazılmış olabilir." };
  }

  return withCafe(opts.cafeId, async (db) => {
    const varMi = await db.one(`SELECT 1 FROM products WHERE lower(name) = lower($1)`, [ad]);
    if (varMi) return { ok: false as const, hata: "Bu isimde bir ürün zaten var." };

    const id = newId("prd");
    await db.query(
      `INSERT INTO products (id, cafe_id, name, price_kurus) VALUES ($1,$2,$3,$4)`,
      [id, opts.cafeId, ad, opts.fiyatKurus],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "product.create",
      targetType: "product",
      targetId: id,
      detail: { fiyatKurus: opts.fiyatKurus },
    });

    return { ok: true as const, urun: { id, ad, fiyatKurus: opts.fiyatKurus, aktif: true } };
  });
}

/**
 * Ürünü kullanımdan kaldırır veya geri açar.
 *
 * **Silinmiyor** (G23'ün veri tarafındaki karşılığı): ürün geçmiş ödüllere ve
 * kampanyalara bağlı; silinseydi eski kuponun neyi temsil ettiği kaybolurdu.
 */
export async function durumDegistir(opts: {
  cafeId: string;
  urunId: string;
  aktif: boolean;
  aktorId: string;
}): Promise<boolean> {
  return withCafe(opts.cafeId, async (db) => {
    const r = await db.query(`UPDATE products SET active = $2 WHERE id = $1`, [
      opts.urunId,
      opts.aktif,
    ]);
    if (!r.rowCount) return false;

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "product.update",
      targetType: "product",
      targetId: opts.urunId,
      detail: { aktif: opts.aktif },
    });
    return true;
  });
}
