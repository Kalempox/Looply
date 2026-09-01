-- ═══════════════════════════════════════════════════════════
-- Ü52 · Ödül sadeleşmesi
--
-- İki karar birden uygulanıyor:
--
--   1. **Puanla ödül alma kalktı.** Puan artık yalnızca sıralama ve
--      seviye için birikiyor; harcanmıyor. Katalog ödülü diye ayrı bir
--      tip kalmadı — kafe, oyunlardan ve çarktan **düşebilecek** ödülleri
--      tanımlıyor, hepsi o kadar.
--
--   2. **Değer aralığı sabit:** 25 TL ile 50 TL arası, 5'er artışla.
--
-- ── Neden kolon düşürülmüyor ────────────────────────────────
--
-- `rewards.kind` ve `rewards.points_price` yerinde kalıyor. Kolonları
-- düşürmek, bugüne kadar üretilmiş kuponların bağlı olduğu satırları
-- yeniden yazmayı ve `odul_tipi_tutarli` kısıtını sökmeyi gerektirirdi;
-- kazancı yok. Yeni kod ikisini de yazmıyor, yalnızca sabit değer
-- veriyor.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Katalog ödülleri artık düşebilen ödül ────────────────
UPDATE rewards SET kind = 'instant', points_price = 0 WHERE kind <> 'instant';

-- ── 2. Değerleri yeni aralığa taşı ──────────────────────────
--
-- Aralık dışındaki ödüller silinmiyor: kafenin tanımladığı ödül, kafenin
-- kararı. En yakın geçerli basamağa yuvarlanıyor ve aralığa sıkıştırılıyor.
-- Silmek, kafenin panelinde sebepsiz kaybolan satırlar demek olurdu.
UPDATE rewards
   SET cost_kurus = LEAST(
         5000,
         GREATEST(2500, (round(cost_kurus::numeric / 500) * 500)::bigint)
       )
 WHERE cost_kurus NOT IN (2500, 3000, 3500, 4000, 4500, 5000);

-- ── 3. Kanıt kademesini yeni bantlara göre yeniden hesapla ──
--
-- ⚠️ E6'nın bantları Ü52 ile kaydı: 25–35 TL → K2, 40–50 TL → K3.
-- Eski hâlinde 16–50 TL'nin tamamı K3'tü ve ödül tabanı 25 TL'ye
-- çıkınca HER ödül K3 oluyordu — çarkın ilk karekod akışı (oyuncu
-- henüz K2'de) hiçbir zaman ödül veremezdi.
UPDATE rewards
   SET min_proof_level = CASE
         WHEN cost_kurus <= 3500 THEN 2
         WHEN cost_kurus <= 5000 THEN 3
         ELSE 4
       END;

-- ── 4. Değer aralığını şemaya yaz ───────────────────────────
--
-- Kural yalnızca uygulamada dursaydı, doğrudan SQL ile ya da ileride
-- yazılacak bir betikle aralık dışı ödül girilebilirdi. Ödül değeri
-- bütçeye ve kanıt kademesine giriyor: veritabanı da reddetmeli.
ALTER TABLE rewards DROP CONSTRAINT IF EXISTS odul_degeri_basamakli;
ALTER TABLE rewards ADD CONSTRAINT odul_degeri_basamakli
  CHECK (cost_kurus BETWEEN 2500 AND 5000 AND cost_kurus % 500 = 0);

COMMENT ON CONSTRAINT odul_degeri_basamakli ON rewards IS
  'Ü52: ödül değeri 25-50 TL arası, 5 TL basamaklarla. Serbest tutar yok.';
