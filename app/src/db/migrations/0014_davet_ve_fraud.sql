-- 0014 · Davet zinciri ve fraud sinyalleri
--
-- Faz 9'un şema borcu (Ü20, kaynak/03-davet-ve-fraud.txt).
--
-- ── Neden ayrı tablo, neden `players`e kolon değil ──────────
--
-- Davet bir **ilişki** ve o ilişkinin bir **geçmişi** var: tıklandı,
-- kaydoldu, oynadı, kafeye gitti, niteliklendi, ödüllendi — ya da reddedildi.
-- Kolon tutulsaydı yalnızca son hâl bilinirdi ve yöneticinin asıl sorusu
-- cevapsız kalırdı: *"bu davet neden ödül almadı?"*
--
-- ── Ü20: ödül XP, para değil ────────────────────────────────
--
-- Davet hiçbir bütçeye, puana veya kupona dokunmuyor. `xp_ledger`in
-- `source_type` kümesinde `REFERRAL` Faz 9 için zaten ayrılmıştı (0009) —
-- bu göç oraya yeni bir yol açmıyor, var olanı kullanıyor.
--
-- G23: yalnızca ekleme. Mevcut hiçbir tabloya dokunulmuyor.

-- ═══════════════════════════════════════════════════════════
-- DAVET KODU
-- ═══════════════════════════════════════════════════════════
--
-- Kod **sunucunun**, HTML'in değil. Oyuncu bağlantıyı paylaşır; bağlantının
-- neyi ifade ettiğine sunucu karar verir.
--
-- Oyuncu başına tek kod: kod başına ayrı istatistik tutmak bugünkü ihtiyacı
-- aşıyor. Kampanyaya özel kod gerekirse `player_id` tekilliği kalkar ve
-- ayrım kolonu eklenir — bugünden karmaşıklık satın almıyoruz.

CREATE TABLE referral_codes (
  player_id  text PRIMARY KEY REFERENCES players(id),
  code       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE referral_codes IS
  'Ü20: oyuncunun davet kodu. Bağlantı /r/{code}; kodun sahibi sunucudur.';

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON referral_codes
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY owner ON referral_codes
  USING (player_id = current_setting('app.player_id', true))
  WITH CHECK (player_id = current_setting('app.player_id', true));

GRANT SELECT, INSERT ON referral_codes TO cafeplay_app;

-- ═══════════════════════════════════════════════════════════
-- DAVET
-- ═══════════════════════════════════════════════════════════

CREATE TABLE referrals (
  id            text PRIMARY KEY,
  referrer_id   text NOT NULL REFERENCES players(id),
  code          text NOT NULL,

  -- Kayıt olana kadar boş: tıklama da bir davet satırıdır. "Kaç kişi
  -- tıkladı ama kaydolmadı" sorusu ancak böyle cevaplanır.
  invitee_id    text REFERENCES players(id),

  --   clicked         bağlantıya gelindi
  --   registered      davet edilen hesap açtı (telefon zaten doğrulanmış)
  --   game_started    oyun oturumu açıldı
  --   game_completed  bölüm tamamlandı
  --   cafe_verified   kafede, konumu doğrulanmış oturumda oynandı
  --   qualified       yedi şart + fraud kontrolü geçildi
  --   rewarded        XP yazıldı
  --   rejected        fraud motoru reddetti — gerekçesi risk_reasons'ta
  --   expired         süre doldu, hiçbir zaman niteliklenmedi
  status        text NOT NULL
                CHECK (status IN ('clicked','registered','game_started',
                                  'game_completed','cafe_verified','qualified',
                                  'rewarded','rejected','expired')),

  -- Niteliklenmenin gerçekleştiği kafe. XP oraya yazılıyor: değer orada
  -- üretildi, davet edenin o kafedeki durumu da orada yükselmeli (Ü15 —
  -- global XP yok, seviye kafe bazında).
  cafe_id       text REFERENCES cafes(id),

  -- Tıklama anındaki parmak izi. Kişisel veri değil: anahtarlı hash,
  -- gökkuşağı tablosuyla çözülemiyor (docs/08 §7.1).
  visit_ip_hash bytea,
  visit_ua_hash bytea,

  -- Niteliklenme anında davet edilenin kayıt parmak izi buraya kopyalanıyor.
  -- Aşağıdaki benzersiz indeksin dayanağı bu kolon.
  invitee_device_hash bytea,

  risk_score    int  NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_reasons  jsonb NOT NULL DEFAULT '[]'::jsonb,
  reward_xp     int  NOT NULL DEFAULT 0 CHECK (reward_xp >= 0),

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,

  -- Bir oyuncu hayatı boyunca **bir kez** davet edilmiş olabilir. İkinci bir
  -- davetçinin aynı kişiyi sahiplenmesi mümkün değil; atıf tektir ve kalıcıdır.
  CONSTRAINT referrals_tek_davet UNIQUE (invitee_id),

  -- Kendi kendini davet etmenin en kaba hâli: aynı hesap. Şemada kapalı,
  -- yani kod hatası bile bunu üretemez. İncelikli hâli (yeni numarayla
  -- ikinci hesap) fraud motorunun işi — orada sinyalle yakalanıyor.
  CONSTRAINT referrals_kendini_davet
    CHECK (invitee_id IS NULL OR invitee_id <> referrer_id)
);

COMMENT ON TABLE referrals IS
  'Ü20: davet ilişkisi ve durumu. Ödül yalnızca XP (0009 · source_type REFERRAL) — bütçeye ve puana dokunmaz.';
COMMENT ON COLUMN referrals.cafe_id IS
  'Ü15: davet XP''si niteliklenmenin gerçekleştiği kafeye yazılır — global XP yok.';
COMMENT ON COLUMN referrals.risk_reasons IS
  'Fraud motorunun gerekçeleri. "Bu davet neden ödül almadı" sorusunun cevabı burada ve referral_events''te.';

-- "Aynı cihaz ikinci kez nitelikli davet üretemez" — kapı şartı, şemada.
--
-- Skorla değil kısıtla: risk skoru bir yargı, bu ise bir yasak. Aynı
-- davetçinin aynı cihazdan gelen ikinci niteliklenmesi veritabanı
-- seviyesinde reddediliyor.
CREATE UNIQUE INDEX referrals_cihaz_tek_nitelik
  ON referrals (referrer_id, invitee_device_hash)
  WHERE invitee_device_hash IS NOT NULL AND status IN ('qualified', 'rewarded');

CREATE INDEX referrals_kod_idx ON referrals (code);
CREATE INDEX referrals_davetci_idx ON referrals (referrer_id, created_at DESC);
CREATE INDEX referrals_suresi_idx ON referrals (expires_at)
  WHERE status NOT IN ('qualified', 'rewarded', 'rejected', 'expired');

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON referrals
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

-- Davet eden kendi davetlerini görür. Davet edilen bu satırı görmez:
-- "seni kim davet etti" bilgisi davet edilenin ekranında işi olan bir şey
-- değil ve göstermek iki hesabı birbirine bağlar.
CREATE POLICY owner ON referrals
  USING (referrer_id = current_setting('app.player_id', true))
  WITH CHECK (referrer_id = current_setting('app.player_id', true));

GRANT SELECT, INSERT, UPDATE ON referrals TO cafeplay_app;

-- ═══════════════════════════════════════════════════════════
-- DAVET OLAY DEFTERİ
-- ═══════════════════════════════════════════════════════════
--
-- Append-only. Her durum geçişi bir satır; `referrals.status` yalnızca bu
-- defterin son hâli. Defter olmasaydı "reddedildi" cevabı verilebilir ama
-- **neden** ve **ne zaman** cevaplanamazdı.

CREATE TABLE referral_events (
  id          text PRIMARY KEY,
  referral_id text NOT NULL REFERENCES referrals(id),
  from_status text,
  to_status   text NOT NULL,
  reason      text,
  detail      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE referral_events IS
  'Append-only davet geçiş defteri. UPDATE ve DELETE yetkisi YOKTUR — "bu davet neden ödül almadı" sorusunun kaynağı.';

CREATE INDEX referral_events_davet_idx ON referral_events (referral_id, created_at);

ALTER TABLE referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_events FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON referral_events
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

-- Yalnızca ekleme: geçmiş yazıldıktan sonra değişmez.
GRANT SELECT, INSERT ON referral_events TO cafeplay_app;
REVOKE UPDATE ON referral_events FROM cafeplay_app;
