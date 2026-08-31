-- 0006 · Kimlik fazının ihtiyaçları
--
-- Faz 3'te eklenenler:
--   · SIM swap koruması için numara değişikliği damgası (G16)
--   · Personel PIN rotasyonu takibi (docs/08 §4.7)
--   · Giden mesaj defteri — SMS'in "gönderildi" iddiası kayıt altına alınır
--   · Kafe başvuru notu

-- ── SIM swap koruması ───────────────────────────────────────
-- Numara değiştikten sonra 24 saat kupon kullanılamaz ve katalog ödülü
-- alınamaz. Çift doğrulama SIM swap'i çözmez — saldırgan iki mesajı da alır.
-- Koruma doğrulamada değil, değerin dışarı çıkışında.
ALTER TABLE players ADD COLUMN phone_changed_at timestamptz;

COMMENT ON COLUMN players.phone_changed_at IS
  'G16: bu damgadan sonraki 24 saat boyunca ödül kilitli.';

-- ── Personel PIN rotasyonu ──────────────────────────────────
ALTER TABLE staff ADD COLUMN pin_changed_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN staff.pin_changed_at IS
  'docs/08 §4.7: PIN 90 günde bir değişir. Paylaşım engellenemiyor, rotasyon zorunlu.';

-- ── Kafe başvurusu ──────────────────────────────────────────
ALTER TABLE cafes ADD COLUMN contact_name text;
ALTER TABLE cafes ADD COLUMN contact_phone_enc bytea;
ALTER TABLE cafes ADD COLUMN applied_at timestamptz;

-- ── Giden mesaj defteri ─────────────────────────────────────
--
-- SMS doğrudan sağlayıcıya gönderilmez; önce buraya yazılır.
-- Üç sebep:
--   1. "Gönderdik" iddiası kayıt altına alınır — sağlayıcı tartışmasında dayanak
--   2. Geliştirmede kodun nereye gittiği görülür (sahte sağlayıcı)
--   3. Maliyet saymanın tek güvenilir yeri burası
--
-- 🔴 `body` alanı doğrulama kodunu İÇERMEZ. Kod yalnızca sağlayıcıya gider;
--    defterde şablon adı ve alıcının maskeli numarası durur.
CREATE TABLE sms_outbox (
  id            text PRIMARY KEY,
  phone_masked  text NOT NULL,              -- '0532 *** ** 67'
  phone_index   bytea NOT NULL,             -- eşleştirme için, numara değil
  template      text NOT NULL
                CHECK (template IN ('otp','phone_changed','new_device','account_deleted','incident')),
  provider      text NOT NULL,              -- 'console' | 'netgsm' | ...
  status        text NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued','sent','failed','blocked')),
  block_reason  text,                       -- 'global_cap' | 'rate_limit'
  provider_ref  text,
  cost_kurus    integer,
  created_at    timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz
);

COMMENT ON TABLE sms_outbox IS
  'Giden mesaj defteri. Doğrulama kodunu İÇERMEZ (docs/08 §7.1).';

CREATE INDEX sms_outbox_phone_idx ON sms_outbox (phone_index, created_at DESC);
CREATE INDEX sms_outbox_gunluk_idx ON sms_outbox (created_at) WHERE status = 'sent';

ALTER TABLE sms_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_outbox FORCE ROW LEVEL SECURITY;

-- Kimlik öncesi akış: yalnızca sunucu içi bağlamdan erişilir
CREATE POLICY bypass ON sms_outbox
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

-- ── Yeni tablolara varsayılan yetkiler ──────────────────────
-- 0001'deki ALTER DEFAULT PRIVILEGES bunu zaten yapıyor; yine de
-- açıkça yazıyoruz ki 0005'teki hata sınıfı tekrar etmesin.
GRANT SELECT, INSERT, UPDATE ON sms_outbox TO cafeplay_app;
