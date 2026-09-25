-- 0057 · Ziyaret oyun başlarken sayılıyor — Ü292
--
-- Ürün sahibi: "her gelen müşteri 1 sn bile oynasa sayılmalı." Ziyaret
-- (`is_qualified`, raporun "sayılan ziyaret"i ve faturanın "nitelikli
-- oyuncu"su) eskiden yalnızca 500'ü geçen oyunun sonunda işaretleniyordu.
-- Artık kafede (K2) başlatılan ilk oyun işaretleniyor (`oyun.basla`).
--
-- Bu göç geçmişi aynı kurala çekiyor: günde hiç ziyareti işaretlenmemiş
-- (kafe, cihaz, gün) üçlüsünde, kafede (K2) başlatılmış ve reddedilmemiş
-- İLK oyun işaretleniyor. Zaten işaretli olan üçlüye dokunulmuyor — sayı
-- aynı kalıyor, benzersizlik indeksi (0002) çiğnenmiyor.
--
-- ⚠️ Davet zinciri bundan etkilenmiyor: o hâlâ eşiği geçen oyun istiyor
-- (`oyun.davetNiteliginde`) ve geçmiş davet durumları yeniden
-- değerlendirilmiyor.
-- ⚠️ Canlı veritabanı boş açılacak; orada hiçbir satıra dokunmaz.

-- `play_sessions` FORCE RLS altında (0053, 0054 ile aynı gerekçe).
SELECT set_config('app.bypass', 'on', true);

UPDATE play_sessions ps
   SET is_qualified = true
  FROM (
    SELECT DISTINCT ON (p.cafe_id, p.device_id_hash, p.business_date) p.id
      FROM play_sessions p
     WHERE p.cafe_id IS NOT NULL
       AND p.business_date IS NOT NULL
       AND p.status <> 'rejected'
       AND (p.proof_mask & 2) <> 0
       AND NOT EXISTS (
             SELECT 1 FROM play_sessions q
              WHERE q.cafe_id = p.cafe_id
                AND q.device_id_hash = p.device_id_hash
                AND q.business_date = p.business_date
                AND q.is_qualified)
     ORDER BY p.cafe_id, p.device_id_hash, p.business_date, p.started_at
  ) ilk
 WHERE ps.id = ilk.id;
