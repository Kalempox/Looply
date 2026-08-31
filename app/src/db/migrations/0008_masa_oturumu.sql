-- 0008 · Masa oturumu ve acil durdurma
--
-- Masa oturumu: oyuncunun "şu an şu kafede, şu masada" hâli.
-- Oyun oturumundan (play_sessions) ayrı: bir masa oturumunda birden çok
-- oyun oynanır, ama doğrulama bir kez yapılır.

CREATE TABLE table_sessions (
  id             text PRIMARY KEY,
  cafe_id        text NOT NULL REFERENCES cafes(id),
  table_id       text NOT NULL REFERENCES cafe_tables(id),
  player_id      text NOT NULL REFERENCES players(id),
  device_id_hash bytea,
  started_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  last_seen_at   timestamptz NOT NULL DEFAULT now(),

  -- Kanıt seviyeleri (AL-2). Bit: K1=1 K2=2 K3=4 K4=8 K5=16
  proof_mask     int NOT NULL DEFAULT 1,     -- karekod okutuldu = K1
  proof_level    int NOT NULL DEFAULT 1,

  -- G10: ham konum SAKLANMAZ. Yalnızca kafeye uzaklık, metre.
  geo_distance_m int,
  geo_checked_at timestamptz,
  geo_reddedildi boolean NOT NULL DEFAULT false
);

COMMENT ON TABLE table_sessions IS
  'Oyuncunun bir masadaki ziyareti. Doğrulama burada birikir, oyunlar buna bağlanır.';
COMMENT ON COLUMN table_sessions.geo_distance_m IS
  'G10: enlem/boylam alınır, uzaklık hesaplanır, koordinat atılır. Yalnızca metre kalır.';
COMMENT ON COLUMN table_sessions.geo_reddedildi IS
  'Kullanıcı konum iznini reddetti. Hata değil, normal bir durum — akış buna göre çalışır.';

CREATE INDEX table_sessions_player_idx ON table_sessions (player_id, started_at DESC);
CREATE INDEX table_sessions_cafe_idx ON table_sessions (cafe_id, started_at DESC);

ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON table_sessions
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON table_sessions
  USING (cafe_id = current_setting('app.cafe_id', true))
  WITH CHECK (cafe_id = current_setting('app.cafe_id', true));

CREATE POLICY owner ON table_sessions
  USING (player_id = current_setting('app.player_id', true))
  WITH CHECK (player_id = current_setting('app.player_id', true));

GRANT SELECT, INSERT, UPDATE ON table_sessions TO cafeplay_app;

-- ── Oyun oturumu masa oturumuna bağlanır ────────────────────
ALTER TABLE play_sessions ADD COLUMN table_session_id text REFERENCES table_sessions(id);

-- ── Acil durdurma anahtarları (G18) ─────────────────────────
--
-- Bir sorun anlaşıldığında ilk iş hasarı durdurmak. Bunun tasarlanmış bir
-- yeteneği olmalı — o an kod yazarak yapılamaz.
INSERT INTO platform_config (key, value) VALUES
  ('kupon_dagitimi_durduruldu', 'false'),
  ('sms_durduruldu',            'false'),
  ('oyun_durduruldu',           'false')
ON CONFLICT (key) DO NOTHING;
