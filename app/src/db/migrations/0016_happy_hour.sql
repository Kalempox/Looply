-- 0016 · Happy Hour havuzu (Ö3)
--
-- Ü/Ö3 kararı: **DÜMDÜZ.** Çarpan matematiği yok — görünür bir TL havuzu ve
-- bir saat aralığı. *"2x puan" oyuncuya hiçbir şey ifade etmez; kafe de
-- bütçesini hesaplayamaz.*
--
-- ── Havuz neden ayrı bir kese DEĞİL ─────────────────────────
--
-- İlk akla gelen tasarım, pencere açılırken bütçeden para ayırmak. Yapmadık:
-- ayrılan para bütçe defterinde "rezerve" görünürdü, pencere bitince iade
-- satırı yazmak gerekirdi ve E10/E11'in dört sayılı formülüne beşinci bir
-- hareket türü girerdi. Her yeni hareket türü, muhasebenin doğrulanabilirliğini
-- biraz daha zorlaştırır.
--
-- Bunun yerine havuz bir **tavan ve bir saat**: para ana bütçeden hiç
-- çıkmıyor. Pencere içinde verilen kuponlar her zamanki gibi bütçeden
-- rezerve ediliyor, ayrıca pencereye **etiketleniyor**. Pencerenin kalanı
-- = havuz − o pencereye etiketli kuponların rezervi.
--
-- Sonucu: spec'in *"pencere bitince kalan bakiye günün genel havuzuna geri
-- döner (kafe kaybetmez)"* kuralı **kendiliğinden** sağlanıyor. Geri dönecek
-- bir şey yok, çünkü hiçbir şey ayrılmadı.
--
-- ── Pencerede ne değişiyor ──────────────────────────────────
--
-- Normalde anlık ödül günde bir kez düşüyor (docs/06 §3). Açık pencerede
-- oyuncu **ikinci bir anlık ödül** kazanabiliyor ve o ödülün maliyeti
-- pencerenin havuzundan sayılıyor. Kafenin seçtiği saatte kontrollü bir ödül
-- yoğunluğu — havuz eridikçe aciliyet kendiliğinden doğuyor.
--
-- ── A7 · gelir bağı ─────────────────────────────────────────
--
-- Havuzu **açmak ücretsiz** (bu göç). Havuzu **duyurmak ücretli** — yakındaki
-- oyunculara bildirim, Boost ürününün kendisi. Bu göç duyuru tarafına hiç
-- dokunmuyor; o Faz 10 sonrası.
--
-- G23: yalnızca ekleme.

CREATE TABLE happy_hours (
  id            text PRIMARY KEY,
  cafe_id       text NOT NULL REFERENCES cafes(id),

  -- İstanbul takvimiyle iş günü. `starts_at`in tarihinden türetilmiyor:
  -- gece 23:00–01:00 arası bir pencere iki takvim gününe yayılır ve
  -- "günde en fazla 2 pencere" kuralı bozulurdu.
  business_date date NOT NULL,

  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,

  -- Pencereye ayrılan tavan. Bütçeden düşülmüyor — yalnızca bir sınır.
  pool_kurus    bigint NOT NULL CHECK (pool_kurus > 0),

  created_by    text NOT NULL REFERENCES staff(id),
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Kafe pencereyi erken kapatabilir; satır silinmiyor ki geçmiş kalsın.
  cancelled_at  timestamptz,

  -- Ö3: min 1 saat, max 4 saat. Şemada, çünkü "5 dakikalık happy hour"
  -- ya da "tüm gün happy hour" ikisi de kavramı öldürür.
  CONSTRAINT happy_hours_sure CHECK (
    ends_at > starts_at
    AND ends_at <= starts_at + interval '4 hours'
    AND ends_at >= starts_at + interval '1 hour'
  )
);

COMMENT ON TABLE happy_hours IS
  'Ö3: görünür TL havuzu + saat aralığı. Bütçeden para AYIRMAZ — tavan ve saat. Kalan, pencere bitince kendiliğinden genel havuzda kalır.';
COMMENT ON COLUMN happy_hours.pool_kurus IS
  'Pencerede dağıtılabilecek en fazla ödül tutarı. Bütçe defterine hiç dokunmaz; kuponlar her zamanki gibi bütçeden rezerve edilir.';

-- "Günde en fazla 2 pencere" (Ö3) — sayım kodda, ama sıcak yol indeksli.
CREATE INDEX happy_hours_gun_idx ON happy_hours (cafe_id, business_date)
  WHERE cancelled_at IS NULL;

CREATE INDEX happy_hours_acik_idx ON happy_hours (cafe_id, starts_at, ends_at)
  WHERE cancelled_at IS NULL;

ALTER TABLE happy_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE happy_hours FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON happy_hours
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON happy_hours
  USING (cafe_id = current_setting('app.cafe_id', true))
  WITH CHECK (cafe_id = current_setting('app.cafe_id', true));

GRANT SELECT, INSERT, UPDATE ON happy_hours TO cafeplay_app;

-- ═══════════════════════════════════════════════════════════
-- Kuponun pencere etiketi
-- ═══════════════════════════════════════════════════════════
--
-- Havuzun kalanı bu kolondan hesaplanıyor:
--   kalan = pool_kurus − Σ(pencereye etiketli kuponların reserved_kurus'u)
--
-- Etiketlenmemiş kupon (normal günlük ödül, katalog alışverişi) havuzu
-- eritmiyor — pencere yalnızca kendi ürettiği ödüllerden sorumlu.

ALTER TABLE coupons ADD COLUMN happy_hour_id text REFERENCES happy_hours(id);

COMMENT ON COLUMN coupons.happy_hour_id IS
  'Ö3: kupon bir Happy Hour penceresinde üretildiyse o pencere. Havuzun kalanı bu etiketten hesaplanır.';

CREATE INDEX coupons_happy_hour_idx ON coupons (happy_hour_id)
  WHERE happy_hour_id IS NOT NULL;
