import { withCafe } from "@/db/context";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { TURLER, type Kategori, type KategoriTuru, EN_UZUN_AD } from "./kategori-tur";

/**
 * Ürün kategorileri — Ü75.
 *
 * ── Neden var ───────────────────────────────────────────────
 *
 * Kupon kartındaki çizim ödülün **adı okunarak** tahmin ediliyordu ve
 * ilk yazım hatasında çöktü: kafe "Ice Americano" yerine "ize
 * amreicano" yazınca kupon yeşil para kartı olarak çıktı. Kategori,
 * tahminin yerine kafenin **beyanını** koyuyor.
 *
 * ── Ad kafenin, tür bizim ───────────────────────────────────
 *
 * `ad` kafenin menüsündeki karşılığı ("Kahvaltılıklar", "Soğuklar").
 * `tur` ise bizim tanıdığımız kapalı liste — hangi çizimin
 * kullanılacağını o söylüyor.
 *
 * Ayrım şart: yalnızca ad olsaydı "Bagel & Co" kategorisinde hangi
 * çizimi koyacağımızı bilemezdik; yalnızca tür olsaydı kafe kendi
 * menüsünün dilini kullanamazdı.
 *
 * ── Silme yok ───────────────────────────────────────────────
 *
 * Kategori de ürün gibi yayından kaldırılıyor (G23). Silinseydi ona
 * bağlı ürünlerin ve o ürünlerden çıkmış kuponların neyi temsil
 * ettiği kaybolurdu.
 */

export * from "./kategori-tur";

export type KategoriSonucu = { ok: true; id: string } | { ok: false; hata: string };

export async function listele(cafeId: string, hepsi = true): Promise<Kategori[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{ id: string; name: string; kind: string; active: boolean; urun: string }>(
      `SELECT k.id, k.name, k.kind, k.active,
              (SELECT count(*) FROM products u WHERE u.category_id = k.id) AS urun
         FROM product_categories k
        ${hepsi ? "" : "WHERE k.active"}
        ORDER BY k.active DESC, k.sort_order, k.name`,
    ),
  );

  return satirlar.map((r) => ({
    id: r.id,
    ad: r.name,
    tur: r.kind as KategoriTuru,
    aktif: r.active,
    urunSayisi: Number(r.urun),
  }));
}

export async function ekle(opts: {
  cafeId: string;
  ad: string;
  tur: string;
  aktorId: string;
}): Promise<KategoriSonucu> {
  const ad = opts.ad.trim();

  if (ad.length < 2) return { ok: false, hata: "Kategori adı en az iki harf olmalı." };
  if (ad.length > EN_UZUN_AD) {
    return { ok: false, hata: `Kategori adı en fazla ${EN_UZUN_AD} karakter.` };
  }
  if (!TURLER.includes(opts.tur as KategoriTuru)) {
    return { ok: false, hata: "Kategori türü seçilmedi." };
  }

  return withCafe(opts.cafeId, async (db) => {
    // Benzersizlik indeksi zaten var; buradaki kontrol kullanıcıya
    // anlaşılır bir hata dönebilmek için. İndeks son sözü söylüyor.
    const varMi = await db.one(
      `SELECT 1 FROM product_categories WHERE lower(name) = lower($1)`,
      [ad],
    );
    if (varMi) return { ok: false as const, hata: "Bu isimde bir kategori zaten var." };

    const id = newId("ktg");
    await db.query(
      `INSERT INTO product_categories (id, cafe_id, name, kind) VALUES ($1,$2,$3,$4)`,
      [id, opts.cafeId, ad, opts.tur],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "category.create",
      targetType: "product_category",
      targetId: id,
      // ⚠️ Ad **loglanmıyor**: `lib/log.ts` "ad" alanını reddediyor
      // (docs/08 §7.1) ve kural haklı — anahtar adına bakıyor, alanın
      // kişi adı mı ürün adı mı olduğunu bilemez. Zaten gereksiz:
      // `targetId` satırı işaret ediyor, ad tablodan okunur.
      detail: { tur: opts.tur },
    });

    return { ok: true as const, id };
  });
}

/**
 * Kategoriyi yayından kaldırır veya geri açar.
 *
 * Kaldırılan kategori yeni üründe seçilemiyor ama **eski ürünler ona
 * bağlı kalıyor** — kuponun çizimi bozulmasın diye. Panelde ürün
 * sayısı gösteriliyor ki kafe neyi etkilediğini görsün.
 */
export async function durumDegistir(opts: {
  cafeId: string;
  kategoriId: string;
  aktif: boolean;
  aktorId: string;
}): Promise<boolean> {
  return withCafe(opts.cafeId, async (db) => {
    const r = await db.query(`UPDATE product_categories SET active = $2 WHERE id = $1`, [
      opts.kategoriId,
      opts.aktif,
    ]);
    if (!r.rowCount) return false;

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "category.update",
      targetType: "product_category",
      targetId: opts.kategoriId,
      detail: { aktif: opts.aktif },
    });
    return true;
  });
}
