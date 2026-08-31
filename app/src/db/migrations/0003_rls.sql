-- 0003 · Satır düzeyi güvenliği (RLS)
--
-- G12: kiracı izolasyonu iki katmanlıdır.
--   Katman 1 — uygulama: sorgular yalnızca bağlam nesnesi üzerinden çalışır
--   Katman 2 — veritabanı: BU dosya. Uygulamada süzgeç unutulsa bile satır dönmez.
--
-- Üç erişim kipi vardır ve oturum değişkenleriyle seçilir:
--   app.bypass    = 'on'   → sunucu içi işler (kimlik öncesi akışlar, platform)
--   app.cafe_id   = '...'  → kafe bağlamı: yalnızca o kafenin satırları
--   app.player_id = '...'  → oyuncu bağlamı: yalnızca kendi satırları
--
-- Politikalar PERMISSIVE'dir, yani VEYA ile birleşir. Hiçbir değişken
-- kurulmamışsa hiçbir satır dönmez — güvenli varsayılan budur.
--
-- FORCE ROW LEVEL SECURITY: tablo sahibi de kurala tabi olsun diye.
-- (Süper kullanıcı yine muaftır; bu yüzden testler kısıtlı rolle çalışır.)

-- ── `cafes` tablosu: kiracı anahtarı `cafe_id` değil `id` ───
-- Bu yüzden aşağıdaki döngüye giremiyor, politikaları elle yazılıyor.
ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafes FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON cafes
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON cafes
  USING (id = current_setting('app.cafe_id', true))
  WITH CHECK (id = current_setting('app.cafe_id', true));

-- ── Yalnızca kafeye ait tablolar ────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cafe_documents','cafe_tables','staff','cafe_devices',
    'player_aliases','products','rewards','percentage_campaigns',
    'budget_periods','budget_ledger','cafe_config'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    EXECUTE format($p$
      CREATE POLICY bypass ON %I
        USING (current_setting('app.bypass', true) = 'on')
        WITH CHECK (current_setting('app.bypass', true) = 'on')
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY tenant ON %I
        USING (cafe_id = current_setting('app.cafe_id', true))
        WITH CHECK (cafe_id = current_setting('app.cafe_id', true))
    $p$, t);
  END LOOP;
END
$$;

-- ── Hem kafeye hem oyuncuya ait tablolar ────────────────────
-- Kafe kendi satırlarını görür (anonim kod üzerinden),
-- oyuncu kendi satırlarını görür. İkisi birbirini görmez.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['play_sessions','points_ledger','coupons'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    EXECUTE format($p$
      CREATE POLICY bypass ON %I
        USING (current_setting('app.bypass', true) = 'on')
        WITH CHECK (current_setting('app.bypass', true) = 'on')
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY tenant ON %I
        USING (cafe_id = current_setting('app.cafe_id', true))
        WITH CHECK (cafe_id = current_setting('app.cafe_id', true))
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY owner ON %I
        USING (player_id = current_setting('app.player_id', true))
        WITH CHECK (player_id = current_setting('app.player_id', true))
    $p$, t);
  END LOOP;
END
$$;

-- ── Yalnızca oyuncuya ait tablolar ──────────────────────────
-- G1: kafe bu tabloların hiçbir satırını göremez — kafe politikası YOK.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['players','player_consents'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    EXECUTE format($p$
      CREATE POLICY bypass ON %I
        USING (current_setting('app.bypass', true) = 'on')
        WITH CHECK (current_setting('app.bypass', true) = 'on')
    $p$, t);
  END LOOP;
END
$$;

CREATE POLICY owner ON players
  USING (id = current_setting('app.player_id', true))
  WITH CHECK (id = current_setting('app.player_id', true));

CREATE POLICY owner ON player_consents
  USING (player_id = current_setting('app.player_id', true))
  WITH CHECK (player_id = current_setting('app.player_id', true));

-- ── Kimlik öncesi / sunucu içi tablolar ─────────────────────
-- Bunlar kullanıcı bağlamı oluşmadan önce okunur (jeton çözümleme,
-- doğrulama kodu, hız sınırı). Hiçbir kullanıcı bağlamından erişilemez.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sessions','otp_challenges','qr_tokens','rate_limits','fraud_flags'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$
      CREATE POLICY bypass ON %I
        USING (current_setting('app.bypass', true) = 'on')
        WITH CHECK (current_setting('app.bypass', true) = 'on')
    $p$, t);
  END LOOP;
END
$$;

-- ── Denetim izi ─────────────────────────────────────────────
-- Kafe kendi kaydını okur; yazma her bağlamdan olabilir (kendi kafesi adına).
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON audit_log
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON audit_log
  USING (cafe_id = current_setting('app.cafe_id', true))
  WITH CHECK (cafe_id = current_setting('app.cafe_id', true));

CREATE POLICY owner_write ON audit_log FOR INSERT
  WITH CHECK (current_setting('app.player_id', true) IS NOT NULL);

-- ── Platform ayarları ───────────────────────────────────────
-- Her bağlam okuyabilir (ekonomi sayıları gizli değil), yazamaz.
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config FORCE ROW LEVEL SECURITY;

CREATE POLICY public_read ON platform_config FOR SELECT USING (true);

CREATE POLICY bypass ON platform_config
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');
