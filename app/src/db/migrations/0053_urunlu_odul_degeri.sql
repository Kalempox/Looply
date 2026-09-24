-- 0053 · Ürüne bağlı ödüllerin değeri ürünün fiyatından — Ü278
--
-- Ü277'nin kuralı: ürün ödülünün değeri ürünün fiyatı, yüzde ödülününki
-- fiyat × oran. Kural yalnızca YENİ ödülde uygulanıyor (`katalog.ekle`).
-- Önce kurulanların değeri elle yazılmıştı ve hiçbiri kurala uymuyordu
-- (geliştirme veritabanında 5 işletmede 13 ödül): "50 TL'lik üründe %10"
-- 50 TL, "120 TL'lik Ice Americano" 30 TL kayıtlı. Panel "%10 = 50 TL"
-- gösteriyor, yeni kupon bütçeden 50 TL ayırıyordu.
--
-- Ürün sahibi (2026-09-24): "Ben güncelleyeyim" — değer kurala göre
-- yeniden hesaplansın, üst sınırı aşan yayından kalksın, listesi verilsin.
--
-- ── Ne yapılıyor ─────────────────────────────────────────────
--
-- 1. Değer yeniden hesaplanıyor: yüzde = round(fiyat × oran / 100) —
--    `katalog.urundenDeger` ile aynı yuvarlama —, ürün = fiyat.
-- 2. Kafenin ödül üst sınırını (`odul_ust_sinir_kurus`, yoksa varsayılan
--    50 TL) aşan ödül YAYINDAN KALKIYOR, silinmiyor: kafenin panelinde
--    sebepsiz kaybolan satır olmasın (0021'in gerekçesi).
-- 3. Her değişiklik denetim izine: eski ve yeni değer, yayından kalktı mı.
--    Kafe "ödülümün değeri neden değişti" diye sorabilmeli.
--
-- ⚠️ Dolaşımdaki kuponlar DEĞİŞMİYOR: ayırdıkları tutar, verildikleri
-- anın sözü. Kasa ürünlü yüzdede zaten fiyat × oranı düşüyor, ayrılanı
-- aşmadan (`kupon.kasaDegeri`).
-- ⚠️ Canlı veritabanı boş açılacak; orada bu göç hiçbir satıra dokunmaz.

-- `rewards`, `cafe_config` ve `audit_log` FORCE RLS altında. Geliştirmede
-- yönetici rolü süper kullanıcı ve zaten atlıyor; canlıda öyle olmayabilir
-- ve güncelleme sessizce sıfır satıra düşerdi. İşleme özel (`true`).
SELECT set_config('app.bypass', 'on', true);

WITH hesap AS (
  SELECT r.id, r.cafe_id, r.cost_kurus AS eski, r.active,
         CASE WHEN r.reward_type = 'percent'
              THEN round(p.price_kurus * r.percent / 100.0)::bigint
              ELSE p.price_kurus
         END AS yeni,
         COALESCE(
           (SELECT (cc.value #>> '{}')::bigint FROM cafe_config cc
             WHERE cc.cafe_id = r.cafe_id AND cc.key = 'odul_ust_sinir_kurus'),
           5000
         ) AS tavan
    FROM rewards r
    JOIN products p ON p.id = r.product_id
   WHERE r.reward_type IN ('percent', 'product')
),
degisen AS (
  SELECT * FROM hesap WHERE yeni > 0 AND yeni <> eski
),
guncel AS (
  UPDATE rewards r
     SET cost_kurus = d.yeni,
         active = CASE WHEN d.yeni > d.tavan THEN false ELSE r.active END
    FROM degisen d
   WHERE r.id = d.id
  RETURNING r.id
)
INSERT INTO audit_log (actor_type, actor_id, cafe_id, action, target_type, target_id, detail)
SELECT 'system', NULL, d.cafe_id, 'reward.update', 'reward', d.id,
       jsonb_build_object(
         'islem', 'deger_urun_fiyatindan',
         'goc', '0053',
         'eskiKurus', d.eski,
         'yeniKurus', d.yeni,
         'yayindanKalkti', d.active AND d.yeni > d.tavan
       )
  FROM degisen d
  JOIN guncel g ON g.id = d.id;
