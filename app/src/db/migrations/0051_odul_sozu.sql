-- 0051 · Ödül paketi "görünürse kesin" — Ü275
--
-- Ürün sahibi Blok Kırıcı'da ödüllü bloğu kırdı ve hiçbir şey almadı:
-- paket 500 puanı geçen HER turda çıkıyordu, kupon ise tur sonunda
-- %22–45 şansla veriliyordu. Ekran "kazandın" diyor, sunucu çoğu zaman
-- vermiyordu. Kararı: *"görünürse kesin"* — şans paket görünmeden ÖNCE
-- atılıyor, görünen paketi alan kuponu kesin alıyor.
--
-- `odul_sozu`: paket tahtaya ilk çıktığında sunucunun verdiği karar.
--   NULL  → henüz sorulmadı (paket hiç çıkmadı ya da oyuncu kafede değil)
--   true  → paket görünür, teslim edilirse kupon kesin
--   false → paket sıradan parça gibi çizilir, kupon yok
--
-- ⚠️ Karar bir kez veriliyor ve DEĞİŞMİYOR: ikinci soru ilk cevabı
-- alıyor. Yeniden sorarak şans yenilenebilseydi "görünürse kesin"
-- kuralı "istediğin kadar zar at" olurdu.
--
-- `odul_soruldu_at`: kararın verildiği an — denetim için.
ALTER TABLE play_sessions ADD COLUMN odul_sozu boolean;
ALTER TABLE play_sessions ADD COLUMN odul_soruldu_at timestamptz;

COMMENT ON COLUMN play_sessions.odul_sozu IS
  'Ü275: paket göründüğünde verilen karar. true ise teslim edilen paket kesin kupon. Bir kez yazılır.';
