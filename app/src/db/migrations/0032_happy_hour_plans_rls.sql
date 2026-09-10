-- ═══════════════════════════════════════════════════════════
-- 🔴 Ü107 · happy_hour_plans'a RLS — Ü104'te unutuldu
-- ═══════════════════════════════════════════════════════════
--
-- Göç 0030 `happy_hour_plans` tablosunu açtı ve **satır düzeyi güvenliği
-- kurmayı atladı.** Şemadaki `cafe_id` taşıyan diğer bütün tablolarda RLS
-- açık ve zorunlu; bu tek tablo dışarıda kalmıştı.
--
-- ── Neden ciddi ─────────────────────────────────────────────
--
-- `withCafe(cafeId, ...)` izolasyonu **politikalarla** kuruyor; ev usulü,
-- sorgular ayrıca `cafe_id` süzgeci yazmıyor (`masa-yonetim.listele` de
-- yazmıyor). Politika yoksa süzgeç de yok:
--
--   · `programlar()` → `SELECT ... FROM happy_hour_plans WHERE active`
--     **bütün kafelerin** programlarını döndürürdü. Kafe A'nın paneli
--     Kafe B'nin saatlerini ve havuz tutarlarını gösterirdi.
--   · `programKur()` → `UPDATE happy_hour_plans SET active = false
--     WHERE weekday = $1 AND active` — okuma değil **yazma sızıntısı**:
--     salıya program kuran kafe, bütün kafelerin salı programını
--     kapatırdı.
--
-- Sahada patlamamasının tek sebebi tek kafenin program kurmuş olması.
--
-- Politikalar 0003'teki şablonun aynısı — yeni bir kalıp uydurulmuyor.

ALTER TABLE happy_hour_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE happy_hour_plans FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON happy_hour_plans
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON happy_hour_plans
  USING (cafe_id = current_setting('app.cafe_id', true))
  WITH CHECK (cafe_id = current_setting('app.cafe_id', true));

COMMENT ON TABLE happy_hour_plans IS
  'Ü104: haftalık Happy Hour programı. Haftagünü başına bir satır. RLS 0032''de eklendi — 0030''da unutulmuştu.';
