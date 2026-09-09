-- ═══════════════════════════════════════════════════════════
-- Ü101 · Bir sahip, birden çok şube
-- ═══════════════════════════════════════════════════════════
--
-- ── Sorun ───────────────────────────────────────────────────
--
-- Panel görselinde üst şeritte bir şube seçici var ("Kahve Durağı ▾").
-- Şema bunu **engelliyordu**: `staff_phone_idx` global tekil, yani aynı
-- telefon bütün sistemde yalnızca bir personel satırına sahip olabiliyor.
-- Bir sahip iki şubesini tek numarayla yönetemiyordu.
--
-- Tekillik kafe başına taşınıyor: aynı kişi farklı kafelerde yönetici
-- olabiliyor, ama aynı kafede iki kez görünemiyor.
--
-- ── ⚠️ Başvurudaki telefon bloğu KALIYOR ────────────────────
--
-- `basvuruOlustur` "bu telefon zaten kayıtlı" diye reddediyor ve bu kontrol
-- **kaldırılmadı**. Kaldırsaydık tek numarayla sınırsız kafe başvurusu
-- yapmanın yolu açılırdı — her biri kendi günlük bütçesiyle, hepsi aynı
-- kişinin. Platformun onay süreci (G5) tam da bunu elemek için var.
--
-- Yani çok şube **kontrollü yoldan** açılıyor: ikinci şube, var olan bir
-- kafenin personel listesine yönetici eklenerek kuruluyor; self-servis
-- başvurudan değil. Şema izin veriyor, kapı hâlâ platformun elinde.
--
-- ── Neden kısmi indeks yine kısmi ───────────────────────────
--
-- `WHERE phone_index IS NOT NULL`: kasiyerin telefonu yok (G11, kayıtlı
-- cihazda PIN). Kısmi olmasaydı bir kafedeki ikinci kasiyer NULL çakışması
-- yaşardı.

DROP INDEX staff_phone_idx;

CREATE UNIQUE INDEX staff_kafe_phone_idx
  ON staff (cafe_id, phone_index)
  WHERE phone_index IS NOT NULL;

COMMENT ON INDEX staff_kafe_phone_idx IS
  'Ü101: tekillik kafe başına. Aynı kişi farklı şubelerde yönetici olabilir, aynı şubede iki kez olamaz.';
