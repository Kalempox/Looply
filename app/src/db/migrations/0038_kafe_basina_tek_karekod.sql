-- ═══════════════════════════════════════════════════════════
-- Ü127 · Kafe başına tek karekod, masa kavramı kalkıyor
-- ═══════════════════════════════════════════════════════════
--
-- Ürün sahibi: *"qr kısmını her kafe için 1 qr olacak şekilde tanımla"*,
-- *"masa kavramına gerek yok."*
--
-- ── Tablo SİLİNMİYOR ────────────────────────────────────────
--
-- `cafe_tables` duruyor ve durmak zorunda: `qr_tokens.table_id`,
-- `game_sessions` ve raporlar ona bakıyor. Düşürseydik geçmiş oyun
-- oturumları sahipsiz kalırdı ve masa raporu bir daha kurulamazdı.
--
-- Kalkan şey **kavram**: kafe artık masa eklemiyor, adlandırmıyor,
-- türlere ayırmıyor. Tabloda kafe başına tek satır kalıyor ve o satır
-- kullanıcıya hiç görünmüyor — kafenin gördüğü tek şey "karekodum".
--
-- Böylece `masaCoz`, `taramaKaydet`, `masa.ac`, oturum ve kanıt zinciri
-- (K1/K2/K3) **hiç değişmiyor**. `domain/masa.ts` zaten masayı değil
-- oturumu yönetiyor; adı yanıltıcı ama işi oyuncunun oturumu.
--
-- ── ⚠️ Basılı eski karekodlar ölüyor ────────────────────────
--
-- Her kafede bir satır kalıyor, diğerleri kapanıyor ve kapalı satırın
-- kodu `masaCoz` tarafından çözülmüyor. Yani masalara yapıştırılmış eski
-- etiketler çalışmaz hâle geliyor. Pilot öncesi olduğumuz için sahada
-- basılı etiket yok; olsaydı bu göç tek başına yapılamazdı.
--
-- Hangi satırın kaldığı rastgele değil: en küçük `sort_order`, eşitlikte
-- en eski. Kafenin ilk oluşturduğu karekod — en çok okutulmuş olma
-- ihtimali en yüksek olan.

-- 1) Kafe başına bir satır bırak.
WITH secim AS (
  SELECT DISTINCT ON (cafe_id) id
    FROM cafe_tables
   WHERE active
   ORDER BY cafe_id, sort_order, created_at, id
)
UPDATE cafe_tables SET active = false
 WHERE active AND id NOT IN (SELECT id FROM secim);

-- 2) Kalan satırın etiketi artık kafenin kendi adı: panelde "Masa 1"
--    yazan bir karekod, masa kavramı kalkmışken anlamsız.
UPDATE cafe_tables t
   SET label = c.name, kind = 'masa', sort_order = 0
  FROM cafes c
 WHERE c.id = t.cafe_id AND t.active;

-- 3) 🔴 Kural veritabanında: kafe ikinci bir aktif karekod alamaz.
--    Yalnızca arayüzü kaldırsaydık, `masaYonetim.ekle` hâlâ çağrılabilir
--    ve kafe sessizce iki karekodlu hâle gelirdi — panel tekini gösterip
--    öbürünü görünmez bırakırdı.
CREATE UNIQUE INDEX cafe_tables_tek_aktif ON cafe_tables (cafe_id) WHERE active;

COMMENT ON INDEX cafe_tables_tek_aktif IS
  'Ü127: kafe başına tek aktif karekod. Masa kavramı kalktı; tablo geçmiş oturumlar ve raporlar için duruyor.';

COMMENT ON COLUMN cafe_tables.label IS
  'Ü127: artık kafenin adı. Masa etiketi ("Masa 7") kavramı kalktı.';
COMMENT ON COLUMN cafe_tables.kind IS
  'Ü108 tür ayrımı (masa/kasa/menu/fis) Ü127 ile kullanımdan kalktı — tek karekod var. Kolon eski satırlar için duruyor.';
