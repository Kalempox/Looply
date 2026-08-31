-- 0012 · Kupon jetonu ve durum defteri
--
-- Faz 7'nin şema borçları.
--
--   Ü19 → QR ve 6 haneli kod aynı kuponu gösterir, farklı yollardan
--   Faz 7 madde 7 → kupon durum makinesi + append-only defter
--
-- G23: yalnızca ekleme. Mevcut kolonlar ve kısıtlar korunuyor.

-- ═══════════════════════════════════════════════════════════
-- Ü19 · QR jetonu
-- ═══════════════════════════════════════════════════════════
--
-- Neden ayrı bir kolon: 6 haneli kod **konuşulmak** için var. Kasiyer sesli
-- okuyabilmeli, müşteri yazabilmeli — bu yüzden kısa olmak zorunda ve
-- entropisi 31^6 ≈ 887 milyonla sınırlı. QR'ın böyle bir kısıtı yok;
-- yüksek entropiyi bedavaya taşıyor.
--
-- Tek koda bağlansaydı QR yolu, kodun zayıflığını miras alırdı. İki yol da
-- aynı kuponu gösteriyor ve aynı atomik onaydan geçiyor (Ü19) ama biri
-- diğerinin güvenlik tavanını belirlemiyor.
--
-- QR'ın içinde ödül bilgisi YOK — yalnızca jeton. Gerçek ödül sunucudan
-- geliyor, böylece oyuncu QR içeriğini değiştirip değeri büyütemiyor.

ALTER TABLE coupons ADD COLUMN qr_token text;

UPDATE coupons SET qr_token = 'eski_' || id WHERE qr_token IS NULL;

ALTER TABLE coupons ALTER COLUMN qr_token SET NOT NULL;
ALTER TABLE coupons ADD CONSTRAINT coupons_qr_token_key UNIQUE (qr_token);

COMMENT ON COLUMN coupons.qr_token IS
  'Ü19: QR''ın taşıdığı tek kullanımlık jeton. Ödül bilgisi içermez. 6 haneli `code` ile aynı kuponu gösterir; ikisi de aynı atomik onaydan geçer.';

COMMENT ON COLUMN coupons.code IS
  'Ü19: kameranın çalışmadığı durumda yedek yol. Kasiyer sesli okuyabilsin diye kısa; karışan harfler alfabede yok.';

-- Kasiyerin girdiği kodu aramak sıcak yol — indeks şart.
CREATE INDEX coupons_kod_arama_idx ON coupons (cafe_id, code) WHERE status IN ('pending', 'active');
CREATE INDEX coupons_jeton_arama_idx ON coupons (qr_token) WHERE status IN ('pending', 'active');

-- Süresi dolan kuponları süpürmek için (E11: rezerve bütçeye döner).
CREATE INDEX coupons_sure_idx ON coupons (expires_at) WHERE status IN ('pending', 'active');

-- ═══════════════════════════════════════════════════════════
-- Kupon durum defteri
-- ═══════════════════════════════════════════════════════════
--
-- `coupons` satırı kuponun ŞU ANKİ hâlini söylüyor. Bu defter NASIL o hâle
-- geldiğini söylüyor: "bu kupon neden reddedildi", "kim onayladı", "geri
-- alma neden yapıldı".
--
-- `audit_log` personelin eylemlerini tutuyor ama kuponun kendi hikâyesi
-- ayrı bir soru: süre dolumu kimsenin eylemi değil, yine de kayda geçmeli.

CREATE TABLE coupon_events (
  id         text PRIMARY KEY,
  coupon_id  text NOT NULL REFERENCES coupons(id),
  cafe_id    text NOT NULL REFERENCES cafes(id),

  --   issued    kupon üretildi, bütçeden rezerve edildi
  --   activated ertelenmiş kupon aktifleşti (Ü28)
  --   redeemed  kasiyer onayladı, bütçeden kalıcı düştü
  --   undone    60 saniye içinde geri alındı, rezerve geri döndü
  --   expired   süresi doldu, rezerve bütçeye döndü
  --   rejected  onay denendi ve reddedildi — sebebi `reason`'da
  event      text NOT NULL
             CHECK (event IN ('issued','activated','redeemed','undone','expired','rejected')),

  /** Reddedilen denemenin sebebi; diğer olaylarda serbest not. */
  reason     text,
  staff_id   text REFERENCES staff(id),
  device_id  text REFERENCES cafe_devices(id),
  /** O anda geçerli olan tutar (kuruş) — rezerve veya gerçekleşen. */
  amount_kurus bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE coupon_events IS
  'Kuponun hikâyesi. Append-only: uygulama rolünde UPDATE ve DELETE yoktur. "Bu kupon neden bu durumda" sorusunun tek cevap yeri.';

CREATE INDEX coupon_events_kupon_idx ON coupon_events (coupon_id, created_at);
CREATE INDEX coupon_events_kafe_idx ON coupon_events (cafe_id, created_at DESC);

ALTER TABLE coupon_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_events FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON coupon_events
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON coupon_events
  USING (cafe_id = current_setting('app.cafe_id', true))
  WITH CHECK (cafe_id = current_setting('app.cafe_id', true));

-- E3: defter satırı düzeltilmez, yeni satır yazılır.
REVOKE UPDATE ON coupon_events FROM cafeplay_app;

-- ═══════════════════════════════════════════════════════════
-- Ü27 · Anlık ödül sırası
-- ═══════════════════════════════════════════════════════════
--
-- Döngüsel seçim için ayrı bir sayaç kolonu YOK: sıra, kafenin bugüne kadar
-- dağıttığı anlık kupon sayısından türüyor. Sorgunun hızlı olması için
-- kısmi indeks.

CREATE INDEX coupons_anlik_sayim_idx ON coupons (cafe_id)
  WHERE reward_id IS NOT NULL;
