-- 0015 · Sıralamalarda ad görünürlüğü (Ö1 · Masayı Fethet)
--
-- ── Neden bir kolon gerekiyor ───────────────────────────────
--
-- Ö1'in tamamı aslında bir SORGU: masanın kralı = o masada, günün oyununda
-- yapılmış en yüksek doğrulanmış skor. Yeni tablo gerekmiyor, `play_sessions`
-- zaten her şeyi taşıyor.
--
-- Gereken tek yeni şey **izin**. Spec ekranda "👑 Kral: Mert — 8.420" diyor;
-- yani bir oyuncunun adı, aynı masadaki YABANCILARA gösteriliyor. Bugüne
-- kadar ad ve soyad şifreli duruyordu ve hiç kimseye gösterilmiyordu —
-- kafeye bile (G1). Bu, ürünün ilk oyuncudan-oyuncuya ifşası.
--
-- ── Neden ad, neden anonim kod değil ────────────────────────
--
-- Anonim kod (`P-4F2A`) hiçbir ifşa doğurmaz ama mekaniği öldürür: kimse
-- "P-4F2A'yı devireceğim" demez. Ö1'in tek üretim gerekçesi masaya kimlik
-- vermek; kimliksiz taht, boş bir sayıdır.
--
-- Orta yol: **yalnızca ad** (soyad asla), varsayılan açık, `/verilerim`den
-- tek dokunuşla kapatılabilir ve aydınlatma metninde yazılı. Kapatan oyuncu
-- sıralamada anonim koduyla görünür — tahttan düşmez, yalnızca adı gizlenir.
--
-- ⚠️ Varsayılanın AÇIK olması hukuki incelemeye tabi (S20/H2 ile birlikte
-- avukata gidiyor). Kapalıya çevirmek tek satır: DEFAULT false.
--
-- G23: yalnızca ekleme, varsayılan değerli. Mevcut satırlar bozulmuyor.

ALTER TABLE players
  ADD COLUMN leaderboard_name_visible boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN players.leaderboard_name_visible IS
  'Ö1: masa tahtında oyuncunun ADI görünsün mü. Kapalıysa kafeye özel anonim kod gösterilir. Soyad hiçbir koşulda gösterilmez.';
