-- ═══════════════════════════════════════════════════════════
-- Ü88 · Kupon hangi oyundan çıktı
-- ═══════════════════════════════════════════════════════════
--
-- ── Neden gerekiyor ─────────────────────────────────────────
--
-- Ödül motoru (Ü77) üç girdiyle çalışıyor ve üçüncüsü şu:
--
--   *"Oyuncu belirli bir oyunu çok iyi oynuyor ve ondan ödül
--   kazanıyorsa, yaptığı iyi skorlarda kazandığı ödüller azalır;
--   böylece hep aynı oyunla yüksek ödül kazanamaz."*
--
-- Bunu hesaplamak için "bu oyuncu **bu oyundan** son günlerde ne
-- kazandı" sorusunun cevaplanabilmesi gerekiyor. Bugün cevaplanamıyor:
-- kupon satırı hangi oyun oturumundan çıktığını bilmiyor.
--
-- ── Ölü parametre canlanıyor ────────────────────────────────
--
-- `anlikOdulVer` zaten `kaynakId` alıyordu (oyun oturumunun kimliği) ama
-- hiçbir yere yazmıyordu — imzada duran, hiçbir işe yaramayan bir alan.
-- Artık kolona yazılıyor.
--
-- ── Yan kazanç: defter okunur hâle geliyor ──────────────────
--
-- "Bu kupon nereden çıktı" sorusunun cevabı şimdiye kadar `coupon_events`
-- içindeki `note` metniydi ("anlik", "cark", "kampanya"). Hangi **oyun**
-- olduğu hiçbir yerde yoktu; kafenin raporunda "hangi oyun daha çok ödül
-- dağıtıyor" sorusu sorulamıyordu.
--
-- ── Neden NULL serbest ──────────────────────────────────────
--
-- Her kuponun bir oyun oturumu yok: çark kuponunun, kampanya kuponunun ve
-- bugüne kadar üretilmiş bütün kuponların oturumu yok. Kolon nullable ve
-- eski satırlar olduğu gibi kalıyor (E3: geçmişe dönük düzeltme yok).

ALTER TABLE coupons ADD COLUMN play_session_id text REFERENCES play_sessions(id);

COMMENT ON COLUMN coupons.play_session_id IS
  'Ü88: kuponu doğuran oyun oturumu. Çark, kampanya ve eski kuponlarda NULL. Ödül motorunun oyun başına azalan getiri hesabı buradan geçiyor (Ü77).';

-- Motorun sorgusu: "bu oyuncu, bu kafede, bu oyundan, son N günde kaç
-- kupon aldı". Oyuncu + kafe zaten indeksli; buradaki indeks join'in
-- oturum tarafını hızlandırıyor.
CREATE INDEX coupons_play_session_idx ON coupons (play_session_id)
  WHERE play_session_id IS NOT NULL;
