-- ═══════════════════════════════════════════════════════════
-- Ü103 · Ödül başına günlük adet + kupon kullanım penceresi
-- ═══════════════════════════════════════════════════════════
--
-- Kapsam belgesinin panel listesinden iki madde. İkisi de aynı ihtiyacın
-- iki yüzü: **kafe neyi ne zaman dağıttığını yönetebilmeli.**
--
-- ── 1. Ödül başına günlük adet ──────────────────────────────
--
-- Bugün tek sınır bütçe (E10) ve tempo (Ü87). İkisi de **para** sınırı;
-- adet sınırı yok. Kafe "günde en fazla 5 ücretsiz tatlı" diyemiyor —
-- mutfağın kapasitesi paradan bağımsız bir şey.
--
-- Yüzde kampanyasında bu sınır zaten vardı (`daily_limit`); ödülde yoktu.
--
-- ⚠️ **Verilen kupon sayılıyor, kullanılan değil.** Kafenin taahhüdü
-- kuponu verdiği anda doğuyor (Ü7: tutar o an rezerve oluyor). Kullanılanı
-- saysaydık kafe bir günde 50 kupon dağıtır, hepsi ertesi gün kullanılır
-- ve "günde 5" sözü hiçbir şeyi sınırlamamış olurdu.
--
-- ── 2. Kupon kullanım günü ve saati ─────────────────────────
--
-- İşletmenin asıl derdi boş saatler. "Ücretsiz filtre kahve, yalnızca hafta
-- içi 14:00–17:00" diyebilmek, ödülü **trafik yönlendirme aracına**
-- çeviriyor — yoğun saatte zaten dolu olan kafeye indirimle müşteri
-- çekmenin anlamı yok.
--
-- `usable_days`: haftanın günleri, Postgres `EXTRACT(dow)` düzeninde
-- (0 = Pazar … 6 = Cumartesi). NULL = her gün.
-- `usable_from_hour` / `usable_to_hour`: NULL = her saat.
--
-- ⚠️ **Pencere gece yarısını aşamıyor** — kafe çalışma saatlerindeki
-- (Ü90) aynı bilinen sınır. 22:00–02:00 gibi bir pencere kurulamıyor;
-- kısıt bunu veritabanı seviyesinde reddediyor ki panel ile veri
-- birbirine düşmesin.
--
-- ⚠️ **Pencere OYUNCUYA GÖSTERİLMEK ZORUNDA.** Gizli bir kısıt, kupon
-- ekranında görünmeyen bir kural demek: oyuncu kasaya gidiyor, reddediliyor
-- ve suçu kafeye yüklüyor. E9 TL'yi saklıyor, Ü97 saati saklıyor — ama
-- ikisi de oyuncunun **elindeki şeyi kullanabilmesini** engellemiyor.
-- Kullanım penceresi o türden değil: bilinmezse ödül işe yaramaz.

ALTER TABLE rewards
  ADD COLUMN daily_limit int
    CHECK (daily_limit IS NULL OR daily_limit > 0),
  ADD COLUMN usable_days int[],
  ADD COLUMN usable_from_hour int
    CHECK (usable_from_hour IS NULL OR usable_from_hour BETWEEN 0 AND 23),
  ADD COLUMN usable_to_hour int
    CHECK (usable_to_hour IS NULL OR usable_to_hour BETWEEN 1 AND 24);

-- Saat penceresi ya tamamen boş ya tamamen dolu; yarım tanım okunamaz.
ALTER TABLE rewards ADD CONSTRAINT odul_saat_penceresi_tam
  CHECK ((usable_from_hour IS NULL) = (usable_to_hour IS NULL));

-- Gece yarısını aşan pencere yok (Ü90'daki aynı sınır).
ALTER TABLE rewards ADD CONSTRAINT odul_saat_penceresi_ileri
  CHECK (usable_from_hour IS NULL OR usable_to_hour > usable_from_hour);

-- Gün listesi boş olamaz: boş dizi "hiçbir gün kullanılamaz" demek olurdu
-- ve bu, ödülü sessizce ölü hâle getirirdi. Kısıtsızlık NULL ile anlatılıyor.
ALTER TABLE rewards ADD CONSTRAINT odul_gun_listesi_dolu
  CHECK (usable_days IS NULL OR array_length(usable_days, 1) BETWEEN 1 AND 7);

COMMENT ON COLUMN rewards.daily_limit IS
  'Ü103: günde en fazla kaç kupon VERİLEBİLİR. NULL = sınırsız. Verilen sayılıyor, kullanılan değil (Ü7).';
COMMENT ON COLUMN rewards.usable_days IS
  'Ü103: kuponun kullanılabileceği haftanın günleri, EXTRACT(dow) düzeninde (0=Pazar). NULL = her gün.';
COMMENT ON COLUMN rewards.usable_from_hour IS
  'Ü103: kullanım penceresinin başlangıcı. NULL = her saat. Gece yarısını aşamaz.';
