import { withCafe } from "@/db/context";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";
import type { KategoriTuru } from "./kategori-tur";

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
  /** Ü75: hangi kategoride. Kategorisiz ürünler için `null`. */
  kategoriId: string | null;
  /** Kategorinin türü — kupon kartındaki çizimi bu seçiyor. */
  kategoriTuru: KategoriTuru | null;
  /** Ü94: adı değiştirmenin kaç dolaşımdaki kuponu etkileyeceği. */
  acikKupon: number;
};

/** Ürün adı ve fiyatı için sınırlar — panel formu da bunları kullanıyor. */
export const EN_UZUN_AD = 60;
export const EN_YUKSEK_FIYAT_KURUS = 1_000_00; // 1.000 TL

export type UrunSonucu = { ok: true; urun: Urun } | { ok: false; hata: string };

export async function listele(cafeId: string, hepsi = true): Promise<Urun[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{
      id: string;
      name: string;
      price_kurus: string;
      active: boolean;
      category_id: string | null;
      kind: string | null;
      acik_kupon: string;
    }>(
      `SELECT u.id, u.name, u.price_kurus, u.active, u.category_id, k.kind,
              (SELECT count(*)
                 FROM coupons c
                 LEFT JOIN percentage_campaigns kmp ON kmp.id = c.campaign_id
                 LEFT JOIN rewards r ON r.id = c.reward_id
                WHERE c.status IN ('pending','active')
                  AND (kmp.product_id = u.id OR r.product_id = u.id)) AS acik_kupon
         FROM products u
         LEFT JOIN product_categories k ON k.id = u.category_id
        ${hepsi ? "" : "WHERE u.active"}
        ORDER BY u.active DESC, u.name`,
    ),
  );

  return satirlar.map((r) => ({
    id: r.id,
    ad: r.name,
    fiyatKurus: Number(r.price_kurus),
    aktif: r.active,
    kategoriId: r.category_id,
    kategoriTuru: (r.kind as KategoriTuru | null) ?? null,
    acikKupon: Number(r.acik_kupon),
  }));
}

export async function ekle(opts: {
  cafeId: string;
  ad: string;
  fiyatKurus: number;
  /** Ü75: isteğe bağlı — kategorisiz ürün de eklenebiliyor. */
  kategoriId?: string | null;
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

    // Kategori kafenin kendi kategorisi mi? `withCafe` bağlamı RLS ile
    // zaten başka kafenin satırını döndürmüyor, ama yabancı anahtar
    // hatası yerine anlaşılır bir mesaj vermek daha iyi.
    let kategoriTuru: KategoriTuru | null = null;
    if (opts.kategoriId) {
      const k = await db.one<{ kind: string }>(
        `SELECT kind FROM product_categories WHERE id = $1 AND active`,
        [opts.kategoriId],
      );
      if (!k) return { ok: false as const, hata: "Seçilen kategori bulunamadı." };
      kategoriTuru = k.kind as KategoriTuru;
    }

    const id = newId("prd");
    await db.query(
      `INSERT INTO products (id, cafe_id, name, price_kurus, category_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, opts.cafeId, ad, opts.fiyatKurus, opts.kategoriId ?? null],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "product.create",
      targetType: "product",
      targetId: id,
      detail: { fiyatKurus: opts.fiyatKurus, kategoriId: opts.kategoriId ?? null },
    });

    return {
      ok: true as const,
      urun: {
        id,
        ad,
        fiyatKurus: opts.fiyatKurus,
        aktif: true,
        kategoriId: opts.kategoriId ?? null,
        kategoriTuru,
        // Yeni ürün: henüz hiçbir kupon ona bağlı olamaz.
        acikKupon: 0,
      },
    };
  });
}

export type AdSonucu =
  | { ok: true; etkilenenKupon: number }
  | { ok: false; hata: string };

/**
 * Ürünün adını düzeltir (Ü94).
 *
 * ⚠️ Sahada yaşanan hata buydu: kafe "Ice Americano" yerine **"ize
 * amreicano"** yazdı (Ü75) ve tek çare ürünü kaldırıp yeniden eklemekti —
 * yani ona bağlı ödüllerin ve kampanyaların geçmişini kaybetmek.
 *
 * ⚠️ **Fiyat ve kategori burada değişmiyor.** Fiyat, yüzde kampanyasının
 * tavan hesabına giriyor (Ü17); kategori kupon kartının çizimini seçiyor
 * (Ü75). İkisini de ad düzeltmesiyle aynı düğmeye bağlamak, yazım hatası
 * düzeltmek isteyen kafenin yanlışlıkla ekonomiyi değiştirmesi demek olurdu.
 *
 * Adı değiştirmek dolaşımdaki kampanya kuponlarının başlığını da
 * değiştiriyor (kupon adı `products` satırından okunuyor) — yazım hatası
 * için istenen davranış bu. Kaç kuponun etkileneceği geri dönülüyor ve
 * panelde önceden gösteriliyor; eski ad denetim izine yazılıyor.
 */
export async function adDegistir(opts: {
  cafeId: string;
  urunId: string;
  ad: string;
  aktorId: string;
}): Promise<AdSonucu> {
  const ad = opts.ad.trim();

  if (ad.length < 2) return { ok: false, hata: "Ürün adı en az iki harf olmalı." };
  if (ad.length > EN_UZUN_AD) return { ok: false, hata: `Ürün adı en fazla ${EN_UZUN_AD} karakter.` };

  return withCafe(opts.cafeId, async (db) => {
    const onceki = await db.one<{ name: string }>(`SELECT name FROM products WHERE id = $1`, [
      opts.urunId,
    ]);
    if (!onceki) return { ok: false as const, hata: "Ürün bulunamadı." };
    if (onceki.name === ad) return { ok: false as const, hata: "Ürün adı zaten böyle." };

    // `ekle` ile aynı kural: aynı isimde ikinci ürün olamaz. Kendisi hariç.
    const cakisma = await db.one(
      `SELECT 1 FROM products WHERE lower(name) = lower($1) AND id <> $2`,
      [ad, opts.urunId],
    );
    if (cakisma) return { ok: false as const, hata: "Bu isimde bir ürün zaten var." };

    // Ürün adı hem kampanya kuponlarında hem de o üründen türeyen ödül
    // kuponlarında görünüyor; ikisi de sayılıyor.
    const etkilenen = await db.one<{ n: string }>(
      `SELECT count(*) AS n
         FROM coupons c
         LEFT JOIN percentage_campaigns kmp ON kmp.id = c.campaign_id
         LEFT JOIN rewards r ON r.id = c.reward_id
        WHERE c.status IN ('pending','active')
          AND (kmp.product_id = $1 OR r.product_id = $1)`,
      [opts.urunId],
    );

    await db.query(`UPDATE products SET name = $2 WHERE id = $1`, [opts.urunId, ad]);

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "product.rename",
      targetType: "product",
      targetId: opts.urunId,
      detail: {
        oncekiBaslik: onceki.name,
        yeniBaslik: ad,
        etkilenenAcikKupon: Number(etkilenen?.n ?? 0),
      },
    });

    return { ok: true as const, etkilenenKupon: Number(etkilenen?.n ?? 0) };
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
