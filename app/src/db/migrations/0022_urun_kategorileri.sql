-- ═══════════════════════════════════════════════════════════
-- Ü75 · Ürün kategorileri
-- ═══════════════════════════════════════════════════════════
--
-- ── Neden gerekiyor ─────────────────────────────────────────
--
-- Kupon kartındaki çizim şu ana kadar ödülün **adı okunarak** tahmin
-- ediliyordu: "filtre kahve" → fincan, "cheesecake" → tatlı. Tahmin
-- ilk yazım hatasında çöktü — kafe "Ice Americano" yerine "ize
-- amreicano" yazdı ve kupon yeşil para kartı olarak çıktı.
--
-- Ürün sahibinin çözümü doğru: *"panelden kategori de oluşturulsun,
-- ona göre istediğini seçebilsin."* Kafe kendi kategorisini
-- adlandırıyor, ürünü ona bağlıyor, kupon kategoriyi miras alıyor.
-- Metinden tahmin eden kod devre dışı kalıyor.
--
-- ── Ad kafenin, tür bizim ───────────────────────────────────
--
-- İki alan var ve ayrımı önemli:
--
--   name   kafenin verdiği ad — "Kahvaltılıklar", "Soğuklar", ne isterse
--   kind   bizim tanıdığımız tür — hangi çizimin kullanılacağı
--
-- Yalnızca `name` olsaydı kafe "Bagel & Co" yazdığında hangi çizimi
-- koyacağımızı yine bilemezdik; yalnızca `kind` olsaydı kafe kendi
-- menüsünün dilini kullanamazdı. İkisi birlikte hem esneklik hem
-- belirlilik veriyor.
--
-- `kind` listesi **kapalı**: ekranda karşılığı olan çizim kadar tür
-- var. Yeni bir tür eklemek yeni bir çizim çizmek demek, o yüzden
-- veritabanı kısıtı bunu açıkça söylüyor.

CREATE TABLE product_categories (
  id         text PRIMARY KEY,
  cafe_id    text NOT NULL REFERENCES cafes(id),
  name       text NOT NULL,
  kind       text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT kategori_turu CHECK (kind IN ('sicak', 'soguk', 'tatli', 'yiyecek'))
);

COMMENT ON COLUMN product_categories.name IS
  'Kafenin verdiği ad. Menüde ne yazıyorsa o.';
COMMENT ON COLUMN product_categories.kind IS
  'Ü75: ekrandaki çizimi seçen tür. Kapalı liste — her tür bir çizime karşılık geliyor.';

-- Aynı kafede aynı ad iki kez olmasın; küçük/büyük harf farkı yeni
-- kategori sayılmamalı ("Tatlılar" ile "tatlılar" aynı şey).
CREATE UNIQUE INDEX product_categories_ad_benzersiz
  ON product_categories (cafe_id, lower(name));

CREATE INDEX product_categories_cafe ON product_categories (cafe_id, sort_order, name);

-- ── Ürün kategoriye bağlanıyor ──────────────────────────────
--
-- `NULL` serbest: var olan ürünlerin kategorisi yok ve kafe onları
-- tek tek atayana kadar çalışmaya devam etmeli. Kategorisiz ürünün
-- kuponunda eski tahmin yöntemi devreye giriyor.
--
-- Silme yok, `ON DELETE` yok: kategori de ürün gibi yayından
-- kaldırılıyor (G23). Silinseydi eski kuponun neyi temsil ettiği
-- kaybolurdu.
ALTER TABLE products ADD COLUMN category_id text REFERENCES product_categories(id);

CREATE INDEX products_kategori ON products (category_id) WHERE category_id IS NOT NULL;

-- ── RLS: kafeye ait tablo ───────────────────────────────────
--
-- 0003'teki kalıbın aynısı. Bypass yönetim işleri için, tenant
-- politikası kafeyi kendi satırlarına kilitliyor.
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON product_categories
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON product_categories
  USING (cafe_id = current_setting('app.cafe_id', true))
  WITH CHECK (cafe_id = current_setting('app.cafe_id', true));
