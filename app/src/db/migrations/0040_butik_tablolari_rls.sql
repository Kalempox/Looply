-- ═══════════════════════════════════════════════════════════
-- Ü137 · Butik tablolarına RLS
-- ═══════════════════════════════════════════════════════════
--
-- 🔴 **Göç 0039 bunu unuttu ve bu bir güvenlik açığıydı.**
--
-- `cark_kosullari` ve `cark_haklari` kiracı tabloları — ikisinde de
-- `cafe_id` var — ama satır düzeyi güvenlik açılmamıştı. `withCafe`
-- bağlamı `app.cafe_id` ayarlıyor; RLS yoksa o ayar hiçbir şey yapmıyor
-- ve bir işletme **başka işletmenin çark koşullarını okuyabilir, çark
-- haklarını görebilirdi**.
--
-- Açığı projenin kendi koruması yakaladı: `kiraci-izolasyonu.test.ts`
-- şemadaki her `cafe_id` taşıyan tabloyu tarayıp RLS arıyor ve iki yeni
-- tabloyu listeleyip düştü. Testin varlık sebebi tam olarak bu —
-- "yeni tablo eklerken RLS unutulur" diye yazılmış ve unutuldu.
--
-- ── `cark_haklari` neden hem kafe hem oyuncu ────────────────
--
-- Satırın iki sahibi var: hakkı **işletme** veriyor (`cafe_id`), sonra
-- **oyuncu** sahipleniyor (`player_id`). İkisi de kendi tarafını
-- görebilmeli:
--
--   · İşletme: "bugün kaç hak verdim" (kasa ekranı, rapor)
--   · Oyuncu:  "çevirebileceğim hakkım var mı"
--
-- Bu yüzden `coupons` ve `play_sessions` ile aynı çift politikalı kalıp
-- kullanılıyor, `products` gibi tek taraflı kalıp değil.
--
-- ⚠️ `player_id` NULL olabilir (hak henüz sahiplenilmemiş). Oyuncu
-- politikası o satırları görmüyor ve görmemeli: sahipsiz bir hak
-- kimsenin hakkı değil. Kasadaki QR'ı okutan kişi `withBypass` yolundan
-- geçiyor (`cark-hakki.coz`) çünkü o an henüz hiçbir bağlamda değil.

/* ── Yalnızca kafeye ait: koşullar ─────────────────────────── */

ALTER TABLE cark_kosullari ENABLE ROW LEVEL SECURITY;
ALTER TABLE cark_kosullari FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON cark_kosullari
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON cark_kosullari
  USING (cafe_id = current_setting('app.cafe_id', true))
  WITH CHECK (cafe_id = current_setting('app.cafe_id', true));

/* ── Hem kafeye hem oyuncuya ait: haklar ───────────────────── */

ALTER TABLE cark_haklari ENABLE ROW LEVEL SECURITY;
ALTER TABLE cark_haklari FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON cark_haklari
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON cark_haklari
  USING (cafe_id = current_setting('app.cafe_id', true))
  WITH CHECK (cafe_id = current_setting('app.cafe_id', true));

CREATE POLICY player ON cark_haklari
  USING (player_id = current_setting('app.player_id', true))
  WITH CHECK (player_id = current_setting('app.player_id', true));

COMMENT ON TABLE cark_haklari IS
  'Ü137: kasiyerin verdiği tekil çark hakkı. Satırda kişisel veri YOK — müşteri jetonu okutup kendi kaydoluyor, player_id ancak o an doluyor. RLS 0040''ta eklendi (0039 unutmuştu).';
