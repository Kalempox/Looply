-- 0011 · Katalog, kampanya tavanı ve orantılı bütçe dönemi
--
-- Faz 6'nın şema borçları. Üçü de Faz 4/5 karar turlarından devrediyor:
--
--   Ü17 → yüzde kampanyasında TL tavanı ZORUNLU
--   Ü25 → bütçe haftası pazartesi; ilk dönem kısaysa taban orantılı
--   Ü26 → ödülün TİPİ şemada yok; katalogda yüzdeli ödül satılabilmeli
--
-- G23: hiçbiri yıkıcı değil. Kolon silinmiyor, kısıtlar yalnızca ekleniyor
-- veya gevşetiliyor — mevcut hiçbir satır ihlale düşmüyor.

-- ═══════════════════════════════════════════════════════════
-- Ü25 · Orantılı bütçe tabanı
-- ═══════════════════════════════════════════════════════════
--
-- Eski kısıt her dönemde düz 1.500 TL istiyordu. Kafe çarşamba katılırsa
-- ilk dönem 5 gün sürüyor ve orantılı taban 1.071 TL oluyor — eski kısıt
-- bunu REDDEDERDİ ve kafe ya fazla taahhüt eder ya da sisteme giremezdi.
--
-- Bölme yok: `committed * 7 >= 150000 * gün` biçimi tamsayı aritmetiğinde
-- yuvarlama tartışması bırakmıyor.

ALTER TABLE budget_periods DROP CONSTRAINT budget_periods_committed_kurus_check;

ALTER TABLE budget_periods ADD CONSTRAINT butce_tabani_orantili
  CHECK (committed_kurus * 7 >= 150000 * (period_end - period_start));

COMMENT ON COLUMN budget_periods.committed_kurus IS
  'Ü6 + Ü25: haftalık taban 1.500 TL; dönem kısaysa taban gün sayısına göre orantılı. Üst sınır yok.';

-- ═══════════════════════════════════════════════════════════
-- Ü17 · Yüzde kampanyasında TL tavanı zorunlu
-- ═══════════════════════════════════════════════════════════
--
-- Yüzde tek başına taahhüt değil: %20 demek, adisyon büyüdükçe büyüyen bir
-- borç demek. Tavan olmadan kampanya bütçeye yazılamazdı — Ü8'in "bütçe
-- dışı" kararının gerekçesi buydu. Tavan gelince gerekçe kalktı.
--
-- Önce nullable eklenip mevcut satırlar dolduruluyor, sonra NOT NULL
-- yapılıyor: tek adımda NOT NULL eklemek dolu tabloda başarısız olurdu.

ALTER TABLE percentage_campaigns ADD COLUMN max_discount_kurus bigint;

UPDATE percentage_campaigns SET max_discount_kurus = 10000
 WHERE max_discount_kurus IS NULL;

ALTER TABLE percentage_campaigns ALTER COLUMN max_discount_kurus SET NOT NULL;

ALTER TABLE percentage_campaigns ADD CONSTRAINT kampanya_tavani_pozitif
  CHECK (max_discount_kurus > 0);

COMMENT ON COLUMN percentage_campaigns.max_discount_kurus IS
  'Ü17: tek kullanımda düşülecek en yüksek TL (kuruş). Bütçeden bu tutar rezerve edilir, kasada gerçekleşen düşülür, fark iade edilir.';

COMMENT ON TABLE percentage_campaigns IS
  'Ü26: kafenin doğrudan dağıttığı ürün kampanyası — puan istemez, otomatik düşer. Katalogdan puanla satın alınan yüzdeli ödül `rewards` tablosunda.';

-- ═══════════════════════════════════════════════════════════
-- Ü26 · Ödülün tipi
-- ═══════════════════════════════════════════════════════════
--
-- `kind` alanı ödülün NASIL verildiğini söylüyor ('instant' otomatik düşer,
-- 'catalog' puanla alınır). NE OLDUĞUNU söyleyen bir alan yoktu.
--
-- Yüzdeli ödülde `cost_kurus` **TL tavanı** anlamına gelir. Ü17 "tavandan
-- rezerve edilir" dediği için rezervasyon mantığı iki tipte de aynı kalıyor:
-- her zaman `cost_kurus` rezerve edilir.

ALTER TABLE rewards ADD COLUMN reward_type text NOT NULL DEFAULT 'product'
  CHECK (reward_type IN ('product', 'percent'));

ALTER TABLE rewards ADD COLUMN percent int
  CHECK (percent IS NULL OR (percent >= 1 AND percent <= 100));

-- Hangi ürün olduğu raporlamada gerekiyor; ürün ödülünde isteğe bağlı.
ALTER TABLE rewards ADD COLUMN product_id text REFERENCES products(id);

-- Tip ile yüzde birbirini tutmalı: yüzdeli ödülün yüzdesi olmalı,
-- ürün ödülünün olmamalı. Yarım tanımlı ödül kaydedilemez.
ALTER TABLE rewards ADD CONSTRAINT odul_tipi_tutarli
  CHECK ((reward_type = 'percent') = (percent IS NOT NULL));

COMMENT ON COLUMN rewards.reward_type IS
  'Ü26: product = kafenin ürünü · percent = TL tavanlı yüzde indirimi. `kind` ile karıştırma: o, nasıl verildiğini söyler.';

COMMENT ON COLUMN rewards.cost_kurus IS
  'Bütçeden rezerve edilecek tutar. Ürün ödülünde ürünün perakende değeri, yüzdeli ödülde TL TAVANI (Ü17).';

-- Varsayılan yalnızca mevcut satırları doldurmak içindi; yeni ödül eklerken
-- tip açıkça belirtilsin.
ALTER TABLE rewards ALTER COLUMN reward_type DROP DEFAULT;
