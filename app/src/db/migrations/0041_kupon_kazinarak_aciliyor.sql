-- ═══════════════════════════════════════════════════════════
-- Ü141 · Oyundan çıkan kupon KAPALI doğuyor, kazınarak açılıyor
-- ═══════════════════════════════════════════════════════════
--
-- Ürün sahibi: *"oyun oynayıp kupon kazanan kişilerin kuponlarım
-- kısmına bu kazıma animasyonunu ekle."* Referans: Bread'in günlük puan
-- kartı — yeşil dokulu yüzey parmakla silindikçe altındaki ödülü
-- açıyor.
--
-- ── Açılış TEK olmalı, iki değil ────────────────────────────
--
-- Ürün sahibine soruldu ve *"kazıma tek açılış olsun"* seçildi. Bugün
-- ödül oyun bitiminde adıyla yazılıyor; kazıma eklenip o da kalsaydı
-- oyuncu ne kazandığını **zaten bilerek** kazıyacaktı ve jest boşa
-- düşerdi. Artık oyun sonu "bir kupon kazandın" diyor, adını
-- söylemiyor; ad ilk kez kazıma bittiğinde görünüyor.
--
-- ── Neden kolon, neden tarayıcıda değil ─────────────────────
--
-- Açıklık kalıcı ve kişiye ait bir durum: oyuncu telefonunu değiştirse,
-- tarayıcı verisini silse ya da başka bir cihazdan girse kuponunu
-- **açılmış** bulmalı. `localStorage`'da tutulsaydı kupon her yeni
-- cihazda yeniden kapanır, oyuncu aynı ödülü üçüncü kez "kazanıyormuş"
-- gibi görürdü.
--
-- NULL = henüz kazınmadı. Ayrı bir boolean yerine zaman damgası:
-- "ne zaman açtı" sorusu ileride de sorulabilir ve iki kolon tutup
-- ikisini tutarlı bırakmak zorunda kalmıyoruz.
--
-- ── 🔴 Yalnızca OYUNDAN çıkan kupon kapalı ──────────────────
--
-- Dört kupon kaynağı var ve üçü kapalı doğmamalı:
--
--   · `anlikOdulVer`     → oyun ödülü      · KAPALI doğar
--   · `carkOduluVer`     → çark            · açık doğar
--   · `kampanyaKuponuVer`→ kafenin ikramı  · açık doğar
--   · `upsellKuponuVer`  → teklif          · açık doğar
--
-- Çark zaten kendi tören sahnesi: oyuncu çarkı çeviriyor, dilim
-- duruyor, ödül orada açılıyor. Onu da kapatmak **aynı ödülü iki kez
-- açtırmak** olurdu — kaçındığımız şeyin ta kendisi.
--
-- Kampanya kuponu kazanılmış bir şey değil, kafenin pazarlaması
-- (Ü82/Ü138); merak yaratılacak bir tarafı yok. Teklif de oyuncunun
-- bilerek "al" dediği şey — ne aldığını bilmeden alamaz.
--
-- ── Var olan kuponlar açık sayılıyor ────────────────────────
--
-- Geri doldurma `issued_at` ile yapılıyor, `now()` ile değil: bu
-- kuponlar zaten adıyla görülmüştü, "bugün açıldı" demek defteri
-- yanlış yazardı ve "yeni açıldı" kutlamasını (Ü98) hepsinde birden
-- tetiklerdi.

ALTER TABLE coupons ADD COLUMN revealed_at timestamptz;

UPDATE coupons SET revealed_at = issued_at;

COMMENT ON COLUMN coupons.revealed_at IS
  'Ü141: oyuncunun kuponu kazıyarak açtığı an. NULL = henüz kapalı, ödülün adı oyuncuya HİÇ gönderilmemiş olmalı. Yalnızca oyun ödülü (anlikOdulVer) kapalı doğar; çark, kampanya ve teklif açık doğar.';

-- ── 🔴 Kapalı kupon kasada okutulamaz ──────────────────────
--
-- Kuponun kodu ve karekodu doğar doğmaz oluşuyor; kazıma yalnızca
-- ekranda bir perde olsaydı, oyuncu kapalı kuponun karekodunu kasada
-- okutup ödülü hiç açmadan kullanabilirdi. O da "tek açılış" sözünü
-- yalanlardı: ödül ilk kez kasiyerin ekranında görünürdü.
--
-- Kısıt veritabanında, çünkü kasa onayı (`onayla`) ile oyuncu ekranı
-- ayrı yollar; uygulamada tek yere yazılan bir kontrol diğer yoldan
-- atlanabilir. Aynı sınıf hata Ü113'te ("yazıldı ama bağlanmadı") ve
-- Ü137'nin unutulan RLS'inde zaten bir kez yaşandı.
ALTER TABLE coupons ADD CONSTRAINT coupons_kapali_kupon_kullanilamaz
  CHECK (status <> 'redeemed' OR revealed_at IS NOT NULL);

-- ── Kazıma anı kuponun hikâyesine yazılıyor ────────────────
--
-- `revealed_at` "ne zaman açıldı" sorusunu zaten cevaplıyor; olay
-- satırı **defter** tarafı (E3): kuponun başına gelen her şey tek bir
-- yerden, sırayla okunabilmeli. Açılış orada olmazsa "issued" ile
-- "redeemed" arasında bugün gerçekten yaşanan bir adım eksik kalır.
ALTER TABLE coupon_events DROP CONSTRAINT IF EXISTS coupon_events_event_check;
ALTER TABLE coupon_events ADD CONSTRAINT coupon_events_event_check
  CHECK (event IN (
    'issued', 'activated', 'redeemed', 'undone', 'expired', 'rejected',
    'reminder_active', 'reminder_expiring', 'revealed'
  ));

COMMENT ON COLUMN coupon_events.event IS
  'Kuponun hikâyesi. reminder_active / reminder_expiring: hatırlatma SMS''i gönderildi — aynı kupona ikinci kez gönderilmemesinin garantisi bu satır. revealed: oyuncu kuponu kazıyarak açtı (Ü141).';
