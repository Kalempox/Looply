/**
 * Kategori türleri ve tipleri — Ü75.
 *
 * ── Neden `kategori.ts`'ten ayrı ────────────────────────────
 *
 * Panelin kategori formu bir **istemci bileşeni** ve tür listesine
 * ihtiyacı var. `kategori.ts`'ten import ettiğinde `withCafe` üzerinden
 * `@/db/context` ve oradan `pg` sürücüsü tarayıcı paketine giriyor;
 * derleme `Can't resolve 'dns'` diyerek 500 dönüyor.
 *
 * Bu dosyada veritabanına dokunan hiçbir şey yok, o yüzden istemci de
 * sunucu da güvenle import edebiliyor. `kategori.ts` buradan
 * yeniden dışa aktarıyor — sunucu tarafındaki çağrı yerleri değişmedi.
 */

/**
 * Kategorinin türü — ekrandaki çizimi seçen şey.
 *
 * Liste **kapalı** ve veritabanı kısıtıyla da kapalı (göç 0022): her
 * tür bir çizime karşılık geliyor, yeni tür eklemek yeni çizim çizmek
 * demek.
 */
export const TURLER = ["sicak", "soguk", "tatli", "yiyecek"] as const;
export type KategoriTuru = (typeof TURLER)[number];

/** Panelde tür seçicisinin metinleri. */
export const TUR_ETIKETI: Record<KategoriTuru, string> = {
  sicak: "Sıcak içecek",
  soguk: "Soğuk içecek",
  tatli: "Tatlı",
  yiyecek: "Yiyecek",
};

export type Kategori = {
  id: string;
  ad: string;
  tur: KategoriTuru;
  aktif: boolean;
  /** Bu kategoriye bağlı ürün sayısı — kaldırmadan önce görülmeli. */
  urunSayisi: number;
};

export const EN_UZUN_AD = 40;
