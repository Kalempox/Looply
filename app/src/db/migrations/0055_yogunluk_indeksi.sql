-- 0055 · Yoğunluk profili için indeks — Ü281
--
-- Paket kararı ve bütçe tavanı artık kafenin son dört haftasındaki
-- tamamlanmış turları saatlere göre sayıyor (`domain/yogunluk.ts`). Bu
-- sorgu her paket kararında ve her kupon rezervasyonunda koşuyor; mevcut
-- indekslerin hiçbiri `cafe_id` ile başlamıyordu ve sorgu bütün tabloyu
-- tarardı.
--
-- Kısmi: yalnızca tamamlanmış turlar sayılıyor.
CREATE INDEX IF NOT EXISTS play_sessions_yogunluk_idx
  ON play_sessions (cafe_id, business_date)
  WHERE status = 'completed';
