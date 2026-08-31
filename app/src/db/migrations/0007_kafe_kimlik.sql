-- 0007 · Kafe ve platform kimliği
--
-- Kafe yöneticisi ve platform kullanıcısı da telefon + SMS ile giriyor
-- (docs/08 §4.6). Kasiyer farklı: telefonu yok, kayıtlı cihazda PIN
-- kullanıyor (G11) — vardiya değişince telefon beklemek saçma olurdu.

-- ── Personel telefonu ───────────────────────────────────────
-- Yalnızca yöneticide dolu. Kasiyerde NULL kalır.
ALTER TABLE staff ADD COLUMN phone_index bytea;
ALTER TABLE staff ADD COLUMN phone_enc   bytea;

CREATE UNIQUE INDEX staff_phone_idx ON staff (phone_index) WHERE phone_index IS NOT NULL;

COMMENT ON COLUMN staff.phone_index IS
  'Yalnızca kafe yöneticisinde dolu. Kasiyer kayıtlı cihazda PIN kullanır (G11).';

-- ── Platform kullanıcıları ──────────────────────────────────
--
-- G9: platform ekibi ikiye ayrılıyor.
--   platform_destek → günlük iş, kişisel veri GÖREMEZ
--   platform_admin  → tam erişim, her okuma denetim izine düşer
--
-- Tek bir "admin" rolü olsaydı ekibe katılan herkes tüm müşteri
-- veritabanını görürdü; sızıntı yüzeyi ekip büyüdükçe büyürdü.
CREATE TABLE platform_users (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  phone_index bytea NOT NULL UNIQUE,
  phone_enc   bytea NOT NULL,
  role        text NOT NULL CHECK (role IN ('platform_destek','platform_admin')),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz
);

ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_users FORCE ROW LEVEL SECURITY;

-- Kimlik öncesi akış: yalnızca sunucu içi bağlamdan erişilir
CREATE POLICY bypass ON platform_users
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

GRANT SELECT, INSERT, UPDATE ON platform_users TO cafeplay_app;

-- ── Kafe başvurusunda yüklenen belge ────────────────────────
-- Dosyanın kendisi şifreli saklanıyor; burada yalnızca anahtarı ve
-- özgün adı duruyor (docs/08 §2.1 — kafe belgeleri "Kişisel" sınıfında).
ALTER TABLE cafe_documents ADD COLUMN original_name text;
ALTER TABLE cafe_documents ADD COLUMN size_bytes integer;
