-- 0009 · XP defteri ve rozetler
--
-- Ü14: XP geri geldi — ama para birimi olarak değil, HARCANMAYAN ilerleme
-- sayacı olarak. Puan harcanıyor; ödül alan oyuncunun seviyesi düşmemeli.
-- Bu yüzden ayrı defter: puanla aynı tabloda tutulsaydı "harcanmaz"
-- garantisi kod disiplinine kalırdı.
--
-- Ü15: seviye KAFE BAZINDA. Global profil seviyesi yok — Ü5 ile aynı hat:
-- A kafesinde kazanılan A'da kalır. `cafe_id` bu yüzden NOT NULL.
--
-- Ü3 + Ü16: kafe dışında oynamak XP de kazandırmaz; rozetin ekonomik
-- değeri yoktur ve hiçbir deftere dokunmaz.

-- ═══════════════════════════════════════════════════════════
-- XP DEFTERİ
-- ═══════════════════════════════════════════════════════════

CREATE TABLE xp_ledger (
  id            text PRIMARY KEY,
  cafe_id       text NOT NULL REFERENCES cafes(id),
  player_id     text NOT NULL REFERENCES players(id),
  business_date date NOT NULL,
  delta         int  NOT NULL CHECK (delta <> 0),

  -- Kaynak kümesinde HARCAMA YOK. "XP harcanmaz" garantisi burada duruyor:
  -- yeni bir harcama yolu açmak, bu CHECK'i değiştiren bir göç yazmayı
  -- gerektirir — yani sessizce olamaz.
  --   GAME       oyun oynandı (Faz 5)
  --   BADGE      rozet kazanıldı — rozetin kendisi değersiz, XP'si olabilir
  --   REFERRAL   davet niteliklendi (Faz 9, Ü20)
  --   ADJUSTMENT düzeltme / geri alma — fraud iptali burada
  source_type   text NOT NULL
                CHECK (source_type IN ('GAME','BADGE','REFERRAL','ADJUSTMENT')),
  source_id     text,

  -- Negatif XP yalnızca açık bir düzeltmeyle olur. Oyuncu bir şey satın
  -- alarak XP'sini düşüremez — mekanik olarak imkânsız.
  CONSTRAINT xp_harcanmaz CHECK (delta > 0 OR source_type = 'ADJUSTMENT'),

  proof_level   int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Ü3'ün şemadaki karşılığı: oyundan XP ancak konum doğrulanmış bir masa
  -- oturumunda (K2) yazılabilir. Kafe dışında oynayan XP kazanamaz ve bunu
  -- kod değil veritabanı reddeder.
  --
  -- Düzeltme (ADJUSTMENT) ve davet (REFERRAL) masada gerçekleşmez —
  -- davet XP'si davet edeni ödüllendirir, o sırada masada olması gerekmez.
  -- Rozet (BADGE) her okumada değerlendirilebilir. Üçü kapsam dışı.
  CONSTRAINT xp_oyun_kafede CHECK (source_type <> 'GAME' OR proof_level >= 2)
);

COMMENT ON TABLE xp_ledger IS
  'Ü14: harcanmayan ilerleme sayacı. E3 — bakiye kolonu YOKTUR, bakiye = SUM(delta). Append-only: UPDATE yetkisi yoktur.';
COMMENT ON COLUMN xp_ledger.cafe_id IS
  'Ü15: seviye kafe bazında. Global seviye istenirse tüm kafelerin toplamı alınır — şema borcu doğmaz.';
COMMENT ON COLUMN xp_ledger.proof_level IS
  'Ü3: oyundan XP için K2 (konum doğrulandı) şart — xp_oyun_kafede kısıtı. Düzeltme ve davet satırları kapsam dışı.';

CREATE INDEX xp_ledger_player_idx ON xp_ledger (player_id, cafe_id);
CREATE INDEX xp_ledger_day_idx    ON xp_ledger (cafe_id, player_id, business_date);

ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_ledger FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON xp_ledger
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON xp_ledger
  USING (cafe_id = current_setting('app.cafe_id', true))
  WITH CHECK (cafe_id = current_setting('app.cafe_id', true));

CREATE POLICY owner ON xp_ledger
  USING (player_id = current_setting('app.player_id', true))
  WITH CHECK (player_id = current_setting('app.player_id', true));

-- E3 / 0004 ile aynı gerekçe: defter satırı düzeltilmez, ters satır yazılır.
REVOKE UPDATE ON xp_ledger FROM cafeplay_app;

-- ═══════════════════════════════════════════════════════════
-- ROZET TANIMLARI
-- ═══════════════════════════════════════════════════════════
--
-- Ü16: platformun tanımladığı SABİT liste. Kafe kendi rozetini
-- tanımlayamaz — bu yüzden `cafe_id` kolonu yok ve uygulama rolünün
-- bu tabloya INSERT/UPDATE yetkisi alınıyor. Yeni rozet = yeni göç.

CREATE TABLE badges (
  code        text PRIMARY KEY,
  title       text NOT NULL,
  description text NOT NULL,

  -- global: oyuncu başına bir kez  ·  cafe: her kafede ayrı kazanılır
  scope       text NOT NULL CHECK (scope IN ('global','cafe')),

  -- Değerlendirme kancasının anahtarı — karşılığı src/domain/rozet.ts'de
  rule_key    text NOT NULL,
  threshold   int  CHECK (threshold IS NULL OR threshold > 0),

  sort_order  int  NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE badges IS
  'Ü16: yalnızca statü. Ekonomik değeri yoktur — puan, kupon ve bütçe defterlerine dokunmaz. Platform tanımlar; uygulama rolü yazamaz.';

-- Rozet listesi platformun sözü. Uygulama çalışırken değiştirilemez.
REVOKE INSERT, UPDATE ON badges FROM cafeplay_app;

-- ═══════════════════════════════════════════════════════════
-- KAZANILAN ROZETLER
-- ═══════════════════════════════════════════════════════════

CREATE TABLE player_badges (
  id         text PRIMARY KEY,
  player_id  text NOT NULL REFERENCES players(id),
  badge_code text NOT NULL REFERENCES badges(code),

  -- Kafe rozetinde hangi kafede kazanıldığı; global rozette NULL.
  cafe_id    text REFERENCES cafes(id),
  earned_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE player_badges IS
  'Kazanım kaydı. Hiçbir kazanım defterine satır üretmez (Ü16) — yalnızca statü.';

-- Global rozet oyuncu başına bir kez.
CREATE UNIQUE INDEX player_badges_global_uniq
  ON player_badges (player_id, badge_code) WHERE cafe_id IS NULL;

-- Kafe rozeti her kafede bir kez.
CREATE UNIQUE INDEX player_badges_cafe_uniq
  ON player_badges (player_id, badge_code, cafe_id) WHERE cafe_id IS NOT NULL;

ALTER TABLE player_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_badges FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON player_badges
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

-- G1: kafe politikası BİLEREK yok. Rozet oyuncunun davranış geçmişidir;
-- kafenin gördüğü tek şey anonim koddur. Faz 8 raporu buna ihtiyaç
-- duyarsa ekleme göçüyle açılır — varsayılan kapalı.
CREATE POLICY owner ON player_badges
  USING (player_id = current_setting('app.player_id', true))
  WITH CHECK (player_id = current_setting('app.player_id', true));

-- Kazanılmış rozet geri alınmaz, güncellenmez.
REVOKE UPDATE ON player_badges FROM cafeplay_app;

-- ═══════════════════════════════════════════════════════════
-- İLK ROZET LİSTESİ
-- ═══════════════════════════════════════════════════════════
--
-- Kural anahtarlarının karşılığı src/domain/rozet.ts içinde. Bugün
-- yalnızca ilk ikisi gerçek veri görüyor (masa oturumu var); diğerleri
-- Faz 5 (oyun) ve Faz 7 (kupon) gerçek olay üretince kendiliğinden
-- değerlendirilmeye başlıyor — kod değişikliği gerekmiyor.

INSERT INTO badges (code, title, description, scope, rule_key, threshold, sort_order) VALUES
  ('ilk_ziyaret', 'İlk Ziyaret',  'Bu kafede ilk kez karekod okuttun',        'cafe',   'ziyaret_sayisi',   1,  10),
  ('mudavim',     'Müdavim',      'Bu kafeye beş ayrı gün uğradın',           'cafe',   'ziyaret_gunu',     5,  20),
  ('ilk_oyun',    'İlk Oyun',     'İlk oyununu tamamladın',                   'global', 'oyun_sayisi',      1,  30),
  ('oyuncu_10',   'On Oyun',      'Bu kafede on oyun tamamladın',             'cafe',   'kafe_oyun_sayisi', 10, 40),
  ('seviye_5',    'Beşinci Seviye','Bu kafede beşinci seviyeye ulaştın',      'cafe',   'seviye',           5,  50),
  ('ilk_kupon',   'İlk Ödül',     'İlk kuponunu kasada kullandırdın',         'global', 'kupon_sayisi',     1,  60);
