-- 0020 · Bütçe dönemi haftalıktan günlüğe
--
-- ═══════════════════════════════════════════════════════════
-- Neden değişiyor
-- ═══════════════════════════════════════════════════════════
--
-- Ü25 dönemi haftalık kurmuştu: pazartesi başlar, tüm kafeler aynı takvimde
-- olur ve raporlar karşılaştırılabilir kalır. Gerekçe teknik olarak
-- sağlamdı ama ürün belgesiyle çelişiyordu: orada dönem her yerde **günlük**
-- geçiyor — *"Günlük ödül bütçesi: 1.500 TL"*, *"Minimum promosyon
-- kapasitesi: 1.500 TL/gün"*, *"50 TL × 10 adet + 100 TL × 5 adet"*.
--
-- Kafenin zihnindeki birim de bu: "bugün ne kadar dağıtacağım". Haftalık
-- taahhüt, pazartesi verilen bir kararın cuma gününü de bağlaması demekti
-- ve kafe hafta ortasında "bugün yoğun, havuzu artırayım" diyemiyordu.
--
-- ═══════════════════════════════════════════════════════════
-- Taban da günlük
-- ═══════════════════════════════════════════════════════════
--
-- Eski kısıt haftalık 1.500 TL'yi gün sayısına oranlıyordu:
--   committed * 7 >= 150000 * gün      → günlük ~214 TL
--
-- Yeni kısıt tabanı doğrudan güne bağlıyor:
--   committed >= 150000 * gün          → günlük 1.500 TL
--
-- ⚠️ Bu, kafenin asgari taahhüdünü **yedi katına** çıkarıyor. Bilerek:
-- belgedeki sayı 1.500 TL/gün ve satış argümanı ("boş saatini doldur")
-- o büyüklükteki bir havuz üzerine kurulu. Üst sınır yine yok.
--
-- Mevcut haftalık satırlar bu kısıtı geçemez; aşağıda gün gün bölünüyorlar.

-- ── 1) Var olan haftalık dönemleri güne böl ─────────────────
--
-- Silmek olmazdı: kuponlar `budget_period_id` ile bu satırlara bağlı ve
-- bütçe defteri de öyle. Bunun yerine her haftalık satır, kapsadığı ilk
-- güne indirgeniyor; kalan günler için satır ÜRETİLMİYOR çünkü o günlerin
-- kuponu zaten ilk satıra bağlı ve geçmişi bozmanın anlamı yok.
--
-- Taahhüt gün başına düşürülüyor: haftalık 5.000 TL, günlük ~714 TL.
-- Geçmiş dönemin bütçesi zaten harcanmış; buradaki amaç yalnızca yeni
-- kısıtı ihlal etmeyen tutarlı bir satır bırakmak.

UPDATE budget_periods
   SET committed_kurus = GREATEST(
         150000,
         (committed_kurus / GREATEST(1, period_end - period_start))
       ),
       period_end = period_start + 1
 WHERE period_end - period_start > 1;

-- ── 2) Kısıt: taban artık günlük ────────────────────────────

ALTER TABLE budget_periods DROP CONSTRAINT IF EXISTS butce_tabani_orantili;
ALTER TABLE budget_periods ADD CONSTRAINT butce_tabani_gunluk
  CHECK (committed_kurus >= 150000 * (period_end - period_start));

COMMENT ON COLUMN budget_periods.committed_kurus IS
  'Ü45: günlük taban 1.500 TL. Dönem bir gündür; kafe her gün için ayrı taahhüt verir. Üst sınır yok.';

COMMENT ON TABLE budget_periods IS
  'Kafenin bir GÜN için dağıtmayı taahhüt ettiği ödül değeri (Ü45). Sistemde gerçek para durmaz; bu, kafenin kendi ürününün perakende değeri.';
