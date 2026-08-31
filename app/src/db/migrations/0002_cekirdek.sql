-- 0002 · Çekirdek şema
--
-- Kaynak: docs/08-guvenlik-ve-veri-modeli.md §8
--
-- Değişmezler:
--   · Defterler append-only (E3) — bakiye kolonu yok, bakiye = SUM(hareket)
--   · cafe_id kiracıya ait her tabloda
--   · Kupon tekilliği ve kapatma yetkisi DB kısıtı (A4, E9)
--   · Yüzde kampanyasında limit NOT NULL (Ü8) — limitsiz kampanya kaydedilemez
--   · Tutarlar bigint kuruş; zamanlar timestamptz; kimlikler önekli text

-- ═══════════════════════════════════════════════════════════
-- KİRACILIK
-- ═══════════════════════════════════════════════════════════

CREATE TABLE cafes (
  id            text PRIMARY KEY,
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  legal_name    text,
  tax_no_enc    bytea,
  address       text,
  city          text,
  lat           double precision,
  lng           double precision,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','suspended','rejected')),
  approved_at   timestamptz,
  approved_by   text,
  reject_reason text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN cafes.status IS
  'G5: onaysız kafe karekod üretemez, kupon dağıtamaz, bütçe kuramaz.';

CREATE TABLE cafe_documents (
  id          text PRIMARY KEY,
  cafe_id     text NOT NULL REFERENCES cafes(id),
  kind        text NOT NULL CHECK (kind IN ('tax_certificate','business_license','other')),
  file_key    text NOT NULL,
  key_version int  NOT NULL DEFAULT 1,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','rejected'))
);

CREATE TABLE cafe_tables (
  id         text PRIMARY KEY,
  cafe_id    text NOT NULL REFERENCES cafes(id),
  label      text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0,
  qr_secret  bytea NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cafe_id, label)
);

CREATE TABLE staff (
  id          text PRIMARY KEY,
  cafe_id     text NOT NULL REFERENCES cafes(id),
  name        text NOT NULL,
  pin_hash    text NOT NULL,
  role        text NOT NULL CHECK (role IN ('cashier','manager')),
  active      boolean NOT NULL DEFAULT true,
  disabled_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cafe_devices (
  id             text PRIMARY KEY,
  cafe_id        text NOT NULL REFERENCES cafes(id),
  label          text NOT NULL,
  device_id_hash bytea NOT NULL,
  registered_by  text NOT NULL REFERENCES staff(id),
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cafe_id, device_id_hash)
);

COMMENT ON TABLE cafe_devices IS
  'G11: kasiyer PIN''i yalnızca burada kayıtlı cihazda çalışır. 4 hane tek başına yetersiz.';

-- ═══════════════════════════════════════════════════════════
-- OYUNCU VE KİMLİK
-- ═══════════════════════════════════════════════════════════

CREATE TABLE players (
  id                    text PRIMARY KEY,
  phone_index           bytea NOT NULL UNIQUE,
  phone_enc             bytea NOT NULL,
  first_name_enc        bytea NOT NULL,
  last_name_enc         bytea NOT NULL,
  birth_year_enc        bytea NOT NULL,
  key_version           int  NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  last_seen_at          timestamptz,
  deletion_requested_at timestamptz,
  anonymized_at         timestamptz
);

COMMENT ON TABLE players IS
  'G13: kayıt ancak SMS doğrulandıktan sonra yazılır. Doğrulanmamış numara burada durmaz.';

CREATE TABLE player_consents (
  id           text PRIMARY KEY,
  player_id    text NOT NULL REFERENCES players(id),
  kind         text NOT NULL
               CHECK (kind IN ('privacy_notice','explicit_consent','commercial_message')),
  text_version text NOT NULL,
  granted_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz,
  ip_hash      bytea,
  ua_hash      bytea
);

COMMENT ON COLUMN player_consents.kind IS
  'G7: ticari ileti izni AYRI satırdır. Hizmet rızası onu kapsamaz.';

CREATE TABLE player_aliases (
  cafe_id    text NOT NULL REFERENCES cafes(id),
  player_id  text NOT NULL REFERENCES players(id),
  code       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cafe_id, player_id),
  UNIQUE (cafe_id, code)
);

COMMENT ON TABLE player_aliases IS
  'G1: kafenin gördüğü tek kimlik. Kod kafe bazında farklıdır — iki kafe verisini birleştirse bile eşleştiremez.';

CREATE TABLE otp_challenges (
  id             text PRIMARY KEY,
  phone_index    bytea NOT NULL,
  code_hmac      bytea NOT NULL,
  purpose        text NOT NULL
                 CHECK (purpose IN ('register','login','phone_change','account_delete')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  consumed_at    timestamptz,
  attempt_count  int NOT NULL DEFAULT 0,
  locked_until   timestamptz,
  ip_hash        bytea,
  device_id_hash bytea
);

CREATE INDEX otp_challenges_phone_idx ON otp_challenges (phone_index, created_at DESC);

CREATE TABLE sessions (
  id             text PRIMARY KEY,
  subject_type   text NOT NULL CHECK (subject_type IN ('player','staff','platform')),
  subject_id     text NOT NULL,
  cafe_id        text REFERENCES cafes(id),
  role           text NOT NULL
                 CHECK (role IN ('oyuncu','kasiyer','kafe_yoneticisi','platform_destek','platform_admin')),
  token_hash     bytea NOT NULL UNIQUE,
  device_id_hash bytea,
  ua_hash        bytea,
  ip_hash        bytea,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  revoked_at     timestamptz,
  revoke_reason  text
);

CREATE INDEX sessions_subject_idx ON sessions (subject_type, subject_id) WHERE revoked_at IS NULL;

-- ═══════════════════════════════════════════════════════════
-- DOĞRULAMA VE OYUN
-- ═══════════════════════════════════════════════════════════

CREATE TABLE qr_tokens (
  token_hash  bytea PRIMARY KEY,
  cafe_id     text NOT NULL REFERENCES cafes(id),
  table_id    text NOT NULL REFERENCES cafe_tables(id),
  issued_at   timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_by text
);

CREATE TABLE play_sessions (
  id             text PRIMARY KEY,
  cafe_id        text REFERENCES cafes(id),
  table_id       text REFERENCES cafe_tables(id),
  player_id      text NOT NULL REFERENCES players(id),
  device_id_hash bytea NOT NULL,
  game_id        text NOT NULL,
  seed           text NOT NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz,
  duration_ms    int,
  server_score   int,
  claimed_score  int,
  input_log      jsonb,
  proof_mask     int NOT NULL DEFAULT 0,
  proof_level    int NOT NULL DEFAULT 0,
  geo_distance_m int,
  is_qualified   boolean NOT NULL DEFAULT false,
  business_date  date,
  status         text NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','completed','abandoned','rejected')),
  reject_reason  text
);

COMMENT ON COLUMN play_sessions.cafe_id IS
  'Ü3: NULL = kafe dışı oturum. Hiçbir kazanım üretmez.';
COMMENT ON COLUMN play_sessions.geo_distance_m IS
  'G10: ham konum saklanmaz. Yalnızca kafeye uzaklık, metre.';
COMMENT ON COLUMN play_sessions.server_score IS
  'Geçerli olan skor budur. claimed_score yalnızca denetim içindir.';

-- docs/06 §5: 1 nitelikli oturum / cihaz / kafe / gün
CREATE UNIQUE INDEX play_sessions_qualified_idx
  ON play_sessions (cafe_id, device_id_hash, business_date)
  WHERE is_qualified;

CREATE INDEX play_sessions_player_idx ON play_sessions (player_id, started_at DESC);

-- ═══════════════════════════════════════════════════════════
-- PUAN DEFTERİ  (append-only)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE points_ledger (
  id            text PRIMARY KEY,
  cafe_id       text NOT NULL REFERENCES cafes(id),
  player_id     text NOT NULL REFERENCES players(id),
  business_date date NOT NULL,
  delta         int  NOT NULL,
  reason        text NOT NULL,
  multiplier    numeric(3,1) NOT NULL DEFAULT 1.0,
  ref_type      text,
  ref_id        text,
  proof_level   int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE points_ledger IS
  'E3: bakiye kolonu YOKTUR. Bakiye = SUM(delta). Günlük tavan bu tablodan okunur.';

CREATE INDEX points_ledger_player_idx ON points_ledger (cafe_id, player_id);
CREATE INDEX points_ledger_day_idx ON points_ledger (cafe_id, player_id, business_date);

-- ═══════════════════════════════════════════════════════════
-- BÜTÇE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE budget_periods (
  id              text PRIMARY KEY,
  cafe_id         text NOT NULL REFERENCES cafes(id),
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  committed_kurus bigint NOT NULL CHECK (committed_kurus >= 150000),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cafe_id, period_start),
  CHECK (period_end > period_start)
);

COMMENT ON COLUMN budget_periods.committed_kurus IS
  'Ü6: haftalık taban 1.500 TL = 150000 kuruş. Altına inilemez — kısıt bunu zorlar.';

CREATE TABLE budget_ledger (
  id               text PRIMARY KEY,
  cafe_id          text NOT NULL REFERENCES cafes(id),
  budget_period_id text NOT NULL REFERENCES budget_periods(id),
  kind             text NOT NULL CHECK (kind IN ('reserve','commit','release')),
  amount_kurus     bigint NOT NULL CHECK (amount_kurus >= 0),
  coupon_id        text,
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE budget_ledger IS
  'E10: rezerve + harcanan <= bütçe. CHECK ile ifade edilemez — budget_periods satırı FOR UPDATE ile kilitlenerek uygulanır.';

CREATE INDEX budget_ledger_period_idx ON budget_ledger (budget_period_id);
CREATE INDEX budget_ledger_coupon_idx ON budget_ledger (coupon_id);

-- ═══════════════════════════════════════════════════════════
-- ÜRÜN, ÖDÜL, KAMPANYA
-- ═══════════════════════════════════════════════════════════

CREATE TABLE products (
  id          text PRIMARY KEY,
  cafe_id     text NOT NULL REFERENCES cafes(id),
  name        text NOT NULL,
  price_kurus bigint NOT NULL CHECK (price_kurus >= 0),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Tip A: TL değerli — BÜTÇEDEN düşer
CREATE TABLE rewards (
  id              text PRIMARY KEY,
  cafe_id         text NOT NULL REFERENCES cafes(id),
  kind            text NOT NULL CHECK (kind IN ('instant','catalog')),
  title           text NOT NULL,
  description     text,
  points_price    int  NOT NULL DEFAULT 0 CHECK (points_price >= 0),
  cost_kurus      bigint NOT NULL CHECK (cost_kurus > 0),
  min_proof_level int  NOT NULL DEFAULT 2 CHECK (min_proof_level BETWEEN 0 AND 5),
  sort_order      int  NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'instant' OR points_price = 0)
);

COMMENT ON TABLE rewards IS
  'E2: anlık ödül puan istemez — ilk kez oynayanın puanı sıfırdır, eli boş çıkmamalı.';

-- Tip B: ürün bazlı yüzde — BÜTÇE DIŞI (Ü8)
CREATE TABLE percentage_campaigns (
  id          text PRIMARY KEY,
  cafe_id     text NOT NULL REFERENCES cafes(id),
  product_id  text NOT NULL REFERENCES products(id),
  percent     int  NOT NULL CHECK (percent BETWEEN 1 AND 100),
  daily_limit int  NOT NULL CHECK (daily_limit > 0),
  total_limit int  CHECK (total_limit IS NULL OR total_limit > 0),
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  status      text NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','active','paused','ended')),
  created_by  text NOT NULL REFERENCES staff(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

COMMENT ON TABLE percentage_campaigns IS
  'Ü8''in şemadaki karşılığı: daily_limit ve ends_at NOT NULL. Limitsiz kampanya veritabanı seviyesinde kaydedilemez.';

-- ═══════════════════════════════════════════════════════════
-- KUPON
-- ═══════════════════════════════════════════════════════════

CREATE TABLE coupons (
  id                   text PRIMARY KEY,
  cafe_id              text NOT NULL REFERENCES cafes(id),
  player_id            text NOT NULL REFERENCES players(id),
  reward_id            text REFERENCES rewards(id),
  campaign_id          text REFERENCES percentage_campaigns(id),
  code                 text NOT NULL UNIQUE,
  status               text NOT NULL
                       CHECK (status IN ('pending','active','redeemed','expired','undone')),
  issued_at            timestamptz NOT NULL DEFAULT now(),
  activates_at         timestamptz NOT NULL,
  expires_at           timestamptz NOT NULL,
  budget_period_id     text REFERENCES budget_periods(id),
  reserved_kurus       bigint NOT NULL DEFAULT 0 CHECK (reserved_kurus >= 0),
  committed_kurus      bigint CHECK (committed_kurus IS NULL OR committed_kurus >= 0),
  redeemed_at          timestamptz,
  redeemed_by_staff_id text REFERENCES staff(id),
  redeemed_device_id   text REFERENCES cafe_devices(id),
  undo_deadline_at     timestamptz,
  proof_level          int NOT NULL DEFAULT 0,

  -- Tam olarak biri: ya katalog ödülü ya yüzde kampanyası
  CHECK ((reward_id IS NOT NULL) <> (campaign_id IS NOT NULL)),

  -- A4 / E9: kuponu yalnızca personel kapatabilir
  CHECK (status <> 'redeemed' OR redeemed_by_staff_id IS NOT NULL),
  CHECK (status <> 'redeemed' OR committed_kurus IS NOT NULL),

  -- Ü8: yüzde kampanyası bütçeden düşmez
  CHECK (campaign_id IS NULL OR (reserved_kurus = 0 AND budget_period_id IS NULL)),

  CHECK (expires_at > issued_at)
);

COMMENT ON COLUMN coupons.redeemed_by_staff_id IS
  'A4: kupon oyuncunun telefonundan kapatılamaz. Bu kolon NULL ise durum redeemed olamaz.';

CREATE INDEX coupons_player_idx ON coupons (cafe_id, player_id, status);
CREATE INDEX coupons_status_idx ON coupons (cafe_id, status, expires_at);

-- ═══════════════════════════════════════════════════════════
-- DENETİM VE GÜVENLİK
-- ═══════════════════════════════════════════════════════════

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  actor_type  text NOT NULL,
  actor_id    text,
  cafe_id     text,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  detail      jsonb,
  ip_hash     bytea,
  ua_hash     bytea,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_log IS
  'Append-only. Uygulama rolünde UPDATE/DELETE yetkisi yoktur — 0004 göçüne bakınız.';
COMMENT ON COLUMN audit_log.detail IS
  'docs/08 §7.1: kişisel veri İÇERMEZ.';

CREATE INDEX audit_log_cafe_idx ON audit_log (cafe_id, created_at DESC);
CREATE INDEX audit_log_actor_idx ON audit_log (actor_id, created_at DESC);

CREATE TABLE fraud_flags (
  id             text PRIMARY KEY,
  cafe_id        text REFERENCES cafes(id),
  player_id      text REFERENCES players(id),
  device_id_hash bytea,
  rule           text NOT NULL,
  detail         jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Hız sınırı sayaçları. Redis yok — erken ölçekte Postgres yeterli
-- ve tek bir bileşenin arızası sistemi kilitlemiyor.
CREATE TABLE rate_limits (
  bucket       text NOT NULL,
  window_start timestamptz NOT NULL,
  hits         int NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX rate_limits_cleanup_idx ON rate_limits (window_start);

-- ═══════════════════════════════════════════════════════════
-- CONFIG
-- ═══════════════════════════════════════════════════════════

CREATE TABLE platform_config (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

CREATE TABLE cafe_config (
  cafe_id text NOT NULL REFERENCES cafes(id),
  key     text NOT NULL,
  value   jsonb NOT NULL,
  PRIMARY KEY (cafe_id, key)
);
