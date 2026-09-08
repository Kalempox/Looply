-- ═══════════════════════════════════════════════════════════
-- Ü100 · Upsell: bu ziyarette kullanılan teklif
-- ═══════════════════════════════════════════════════════════
--
-- ── Upsell nedir, neden mevcut kampanyadan farklı ───────────
--
-- Ürün sahibinin sorusu üzerine tanımı netleşti: müşteri zaten masada,
-- amaç onu **yarın geri getirmek değil, bugün ikinci ürünü sattırmak**.
--
-- Bu, bugüne kadar kurduğumuz ekonominin tam tersi yönde çalışıyor:
--
--   normal ödül  → 12 saat bekler → ertesi ziyareti üretir (Ü28, Ü97)
--   upsell       → hemen kullanılır → bu ziyarette satış üretir
--
-- Bu yüzden yeni bir tablo değil, var olan yüzde kampanyasına **iki
-- kolon**: kampanya "bu ziyaretlik" mi ve teklif kaç saat geçerli.
-- Ayrı bir ekonomi kolu açmak yerine var olanın bir kipi.
--
-- ── ⚠️ Neden erteleme kuralı burada geçersiz ────────────────
--
-- `kuponUret` tutarı erteleme eşiğiyle karşılaştırıyor ve üstündekileri
-- 12 saat bekletiyor. Bir upsell kuponu 12 saat beklerse upsell olmaktan
-- çıkar — müşteri o zamana kadar kalkıp gitmiş olur. `instant` kampanya
-- kuponu **hiç ertelenmiyor**.
--
-- ── ⚠️ Neden teklif ayrı bir tabloda sayılıyor ──────────────
--
-- Huninin ilk basamağı "teklif gösterildi" ve o anda **henüz kupon yok**.
-- `coupon_events` kupon kimliğine bağlı, dolayısıyla gösterimi oraya
-- yazamıyoruz. Ayrı bir defter gerekiyor: `campaign_offers`.
--
-- ── ⚠️ Neden oyuncu teklifi KABUL ediyor ────────────────────
--
-- Normal kampanya kuponu oyun sonunda kendiliğinden veriliyor. Upsell'de
-- bu iki sebeple yanlış olurdu:
--
--   1. **Bütçe.** Kupon üretildiği anda tutarı bütçede rezerve oluyor
--      (Ü7). Teklifi görmezden gelecek on kişiye kupon basmak, kafenin
--      günlük bütçesini kullanılmayacak sözlere bağlar.
--   2. **Ölçüm.** "Gösterildi" ile "aldı" aynı şey olursa huninin ilk iki
--      basamağı hep eşit çıkar ve teklifin ilgi çekip çekmediği
--      ölçülemez.
--
-- Kabul etmeyen oyuncu için hiçbir satır yazılmıyor — yalnızca gösterim.

ALTER TABLE percentage_campaigns
  ADD COLUMN instant boolean NOT NULL DEFAULT false,
  ADD COLUMN offer_hours int NOT NULL DEFAULT 3
    CHECK (offer_hours BETWEEN 1 AND 24);

COMMENT ON COLUMN percentage_campaigns.instant IS
  'Ü100: bu ziyarette kullanılan teklif. Kupon ertelenmez, kısa sürelidir.';
COMMENT ON COLUMN percentage_campaigns.offer_hours IS
  'Ü100: kabul edilen teklifin kaç saat geçerli olduğu. Ziyaret süresi kadar.';

-- ── Teklif defteri ─────────────────────────────────────────
--
-- Her gösterim bir satır. Kabul edildiyse `coupon_id` doluyor; edilmediyse
-- satır boş kolonuyla duruyor ve huninin kaybını anlatıyor.
--
-- E3: satır güncellenmiyor, yalnızca kabul anında `coupon_id` yazılıyor.
-- Bu tek yazma bir durum değişikliği değil, eksik bilginin tamamlanması.

CREATE TABLE campaign_offers (
  id          text PRIMARY KEY,
  cafe_id     text NOT NULL REFERENCES cafes(id),
  campaign_id text NOT NULL REFERENCES percentage_campaigns(id),
  player_id   text NOT NULL REFERENCES players(id),
  -- Hangi oyun oturumundan sonra gösterildi. Aynı oturumda ikinci kez
  -- gösterim olmasın diye tekillik buradan kuruluyor.
  play_session_id text REFERENCES play_sessions(id),
  shown_at    timestamptz NOT NULL DEFAULT now(),
  coupon_id   text REFERENCES coupons(id),
  taken_at    timestamptz,
  CHECK ((coupon_id IS NULL) = (taken_at IS NULL))
);

-- Aynı oyun oturumunda aynı kampanya bir kez gösteriliyor: sayfa
-- yenilendiğinde huni şişmesin.
CREATE UNIQUE INDEX campaign_offers_oturum_idx
  ON campaign_offers (campaign_id, play_session_id)
  WHERE play_session_id IS NOT NULL;

CREATE INDEX campaign_offers_kampanya_idx
  ON campaign_offers (campaign_id, shown_at);

COMMENT ON TABLE campaign_offers IS
  'Ü100: upsell hunisinin ilk basamağı. Gösterim anında kupon henüz yok, o yüzden coupon_events kullanılamıyor.';

-- ── RLS ────────────────────────────────────────────────────
--
-- Hem kafeye hem oyuncuya ait: kafe kendi tekliflerini, oyuncu kendi
-- satırlarını görüyor. `coupons` ile aynı desen.

ALTER TABLE campaign_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_offers FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON campaign_offers
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON campaign_offers
  USING (cafe_id = current_setting('app.cafe_id', true))
  WITH CHECK (cafe_id = current_setting('app.cafe_id', true));

CREATE POLICY owner ON campaign_offers
  USING (player_id = current_setting('app.player_id', true))
  WITH CHECK (player_id = current_setting('app.player_id', true));
