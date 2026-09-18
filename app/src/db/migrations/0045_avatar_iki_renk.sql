-- Ü186 · Loopy'nin gövdesi ve şeridi ayrı ayrı renkleniyor
--
-- Ü147'de tek bir `avatar_renk` kolonu açılmıştı ve altı renkle sınırlı
-- bir CHECK taşıyordu. Hiç kullanılmadı: elde tek render vardı ve seçici
-- `COK_RENKLI` bayrağının arkasında kapalı bekliyordu.
--
-- Ürün sahibi: *"kahve bardağı ayrı, çizgi ayrı, her renkte
-- seçeneklerimiz olmalı."* Yani tek renk değil İKİ renk: gövde ve şerit
-- bağımsız seçiliyor.
--
-- ── 🔴 Neden CHECK listesi yok ─────────────────────────────
--
-- Palet 66 gövde + 15 şerit ve büyümeye açık (yeni renk eklemek bir
-- JSON satırı). 66 değeri CHECK içine yazmak, her renk eklemesinde bir
-- göç daha yazmak demekti.
--
-- Kısıt yine var ama BİÇİME bakıyor: küçük harf, rakam ve tire. Asıl
-- liste `components/avatar-paleti.json`da ve doğrulaması
-- `domain/avatar.ts`te. Katmanlı savunma korunuyor — veritabanı çöp
-- veriyi almıyor, uygulama da listeyi zorluyor.

ALTER TABLE players
  ADD COLUMN avatar_govde text NOT NULL DEFAULT 'krem'
    CHECK (avatar_govde ~ '^[a-z0-9-]{2,24}$');

ALTER TABLE players
  ADD COLUMN avatar_serit text NOT NULL DEFAULT 'turuncu-canli'
    CHECK (avatar_serit ~ '^[a-z0-9-]{2,24}$');

COMMENT ON COLUMN players.avatar_govde IS
  'Loopy''nin bardak gövdesinin rengi. Palet: components/avatar-paleti.json';
COMMENT ON COLUMN players.avatar_serit IS
  'Loopy''nin çapraz şeridinin rengi. Palet: components/avatar-paleti.json';

-- ⚠️ `avatar_renk` DÜŞÜRÜLÜYOR. Veri kaybı yok: kolon hiç kullanılmadı,
-- her satırda varsayılan duruyor. Yerinde bırakmak, bir daha hiç
-- okunmayacak bir kolonu ve onun altı değerlik CHECK'ini taşımak olurdu.
ALTER TABLE players DROP COLUMN avatar_renk;

-- ⚠️ `avatar_aksesuar` KALIYOR ve bu bilerek. Aksesuar (bere, gözlük,
-- fular) hâlâ planda; kolonu şimdi düşürüp sonra geri eklemek iki göç
-- eder. Bugün okunmuyor.
