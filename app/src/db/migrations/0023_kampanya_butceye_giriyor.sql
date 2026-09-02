-- ═══════════════════════════════════════════════════════════
-- Ü82 · Kampanya kuponu bütçeye giriyor — Ü8'in kalıntısı siliniyor
-- ═══════════════════════════════════════════════════════════
--
-- ── Bulunan çelişki ─────────────────────────────────────────
--
-- Göç 0002 şu kısıtı koymuştu:
--
--   -- Ü8: yüzde kampanyası bütçeden düşmez
--   CHECK (campaign_id IS NULL OR (reserved_kurus = 0 AND budget_period_id IS NULL))
--
-- **Ü17 bu kararı tersine çevirdi:** *"Yüzde indirimler TL tavanlı ve
-- bütçeye dahil. Tavandan rezerve edilir, kasada gerçekleşen tutar
-- harcanan olarak düşülür, aradaki fark bütçeye iade edilir. Tek bütçe
-- defteri kalır."*
--
-- Göç 0011 Ü17'nin `max_discount_kurus` kolonunu ekledi ama bu kısıta
-- hiç dokunmadı. Şema o günden beri Ü8'i, karar defteri Ü17'yi
-- söylüyordu.
--
-- ── Çelişki neden bugüne kadar görünmedi ────────────────────
--
-- **Çünkü hiç kampanya kuponu üretilmedi.** Kupon üretimi
-- `coupons.campaign_id` kolonuna hiç yazmıyordu; kolon yalnızca
-- okunuyordu (403 ödül kuponuna karşılık 0 kampanya kuponu). Kısıt
-- hiçbir zaman tetiklenmedi, bu yüzden kimse iki kararın çeliştiğini
-- fark etmedi.
--
-- Ü82 teslim yolunu yazınca kısıt ilk INSERT'te patladı. Yani bu satır
-- bir hata düzeltmesi değil: **iki yıl önce alınmış bir kararın şemaya
-- geç ulaşması.**
--
-- ── Yerine gelen kural ──────────────────────────────────────
--
-- Asıl korunması gereken değişmez şu: **bütçeden para ayıran her kupon
-- hangi dönemden ayırdığını söylemek zorunda.** Aksi hâlde iade
-- (`serbestBirak`) ve dönem kapanışı parayı nereye geri koyacağını
-- bilemez.
--
-- Kural artık kupon tipinden bağımsız — ödül de kampanya da aynı
-- muhasebeden geçiyor, Ü17'nin "tek bütçe defteri kalır" dediği gibi.

ALTER TABLE coupons DROP CONSTRAINT coupons_check3;

ALTER TABLE coupons ADD CONSTRAINT coupons_rezerve_donem_check
  CHECK (reserved_kurus = 0 OR budget_period_id IS NOT NULL);

COMMENT ON CONSTRAINT coupons_rezerve_donem_check ON coupons IS
  'Ü17 + Ü82: bütçeden rezerve eden kupon dönemini de söylemeli. Kampanya kuponu artık bütçeye dahil (Ü8 tersine çevrildi).';
