-- 0010 · Oyun oturumu — bölüm ve tekrar gönderim koruması
--
-- `play_sessions` Faz 2'de kurulmuştu; Faz 5 iki şey ekliyor:
--
--   1. BÖLÜM — her oyunun beş bölümü var (Ü21). Hangi bölümün oynandığı
--      skorun anlamını belirliyor: 5. bölümün 300 puanı ile 1. bölümünki
--      aynı skor değil.
--
--   2. TEKRAR GÖNDERİM KORUMASI — aynı oturum iki kez bitirilememeli
--      (Faz 5 güvenlik kapısı). Koruma `status` sütununda ve koşullu
--      UPDATE'te: 'open' değilse ikinci gönderim hiçbir satır güncellemez.

ALTER TABLE play_sessions ADD COLUMN level int CHECK (level IS NULL OR level >= 1);

COMMENT ON COLUMN play_sessions.level IS
  'Ü21: her oyunun beş bölümü var. Faz 5 öncesi satırlarda NULL.';

COMMENT ON COLUMN play_sessions.claimed_score IS
  'S5: istemcinin iddia ettiği skor. Ödül hesabına GİRMEZ — yalnızca denetim ve fraud analizi için saklanır.';

COMMENT ON COLUMN play_sessions.server_score IS
  'S5: sunucunun girdi kaydını yeniden oynatarak bulduğu skor. Puan yalnızca buna göre yazılır.';

-- Günlük puan tavanı (E4) `points_ledger` üzerinden hesaplanıyor; oyun
-- oturumlarını da güne göre saymak gerekebilir (fraud analizi, Faz 9).
CREATE INDEX play_sessions_gun_idx
  ON play_sessions (player_id, cafe_id, business_date);

-- Bitmemiş oturumları bulmak için — oyuncu sekmeyi kapatırsa satır 'open'
-- kalıyor ve süpürülmesi gerekiyor.
CREATE INDEX play_sessions_acik_idx
  ON play_sessions (status, started_at)
  WHERE status = 'open';
