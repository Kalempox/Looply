-- ═══════════════════════════════════════════════════════════
-- Ü110 · Çark olasılıkları kafenin elinde
-- ═══════════════════════════════════════════════════════════
--
-- Ürün sahibi: *"kafeler kendi panelinde, kendi QR kodu okutulduğunda
-- çarkın içinden hangi ödül yüzde kaç ihtimalle çıkacak belirlemeli."*
--
-- Bugüne kadar ağırlık **sıradan** türüyordu (Ü49): ödüller değere göre
-- sıralanıyor ve her basamakta olasılık yarıya iniyordu. İyi bir
-- varsayılan ama kafenin sözü yoktu — oysa dağıtılan para kafenin.
--
-- ── ⚠️ Yüzde değil AĞIRLIK giriliyor ────────────────────────
--
-- Doğrudan yüzde girilseydi toplamın 100 olması gerekirdi: kafe bir ödül
-- eklediğinde ya da sildiğinde bütün satırları elle yeniden hesaplaması
-- gerekir, ve toplam 100 değilken sistemin ne yapacağı belirsiz kalırdı.
-- Ağırlık sıradan bağımsız: yüzde, o anda çarkta bulunan ödüllerin
-- ağırlık toplamından **türetiliyor** ve panelde öyle gösteriliyor.
--
-- Bu ayrıca Ü103 ile de tutarlı: günlük adedi dolan ödül çarktan düşüyor
-- ve kalanların yüzdesi kendiliğinden yeniden dağılıyor. Sabit yüzdelerle
-- bu mümkün olmazdı.
--
-- ── ⚠️ NULL = otomatik, ve hepsi ya NULL ya dolu ────────────
--
-- Kolon **NULL kabul ediyor** ve hepsi NULL ise bugünkü sıraya dayalı
-- dağılım aynen işliyor: paneli hiç açmayan kafede çarkın karakteri
-- değişmiyor.
--
-- Kafe ilk kez bir ağırlık yazdığında, kalan ödüllerin ağırlıkları da o
-- anda **otomatik dağılımdan doldurularak sabitleniyor**. Yarısı otomatik
-- yarısı elle bir liste, panelde gösterilen yüzdeyi açıklanamaz yapardı:
-- kafe 90 yazıp %47 görürdü. "Otomatiğe dön" hepsini yeniden NULL yapıyor.
--
-- ── ⚠️ 0 = bu ödül çarkta çıkmaz ────────────────────────────
--
-- Katalogda ve oyun içi anlık ödül olarak durmaya devam ediyor, yalnızca
-- çarktan düşüyor. Kafenin "bunu çarka koymayayım" demesinin tek yolu
-- eskiden ödülü tamamen kapatmaktı.
--
-- Hepsi sıfır olamaz — okuma tarafı bunu reddedip otomatik dağılıma
-- düşüyor, yoksa çark dönecek bir şey bulamaz ve sessizce ölürdü.
--
-- ── ⚠️ S7 BU KARARLA DAHA DA ACİL ───────────────────────────
--
-- Şans, Ü77'den beri ödül motorunun merkezindeydi; artık **kafe kendi
-- olasılıklarını da yazıyor.** Mevzuat görüşü (S7) gelmeden canlıya
-- çıkılamaz ve bu madde o görüşün kapsamına açıkça girmeli.

ALTER TABLE rewards ADD COLUMN wheel_weight int
  CHECK (wheel_weight IS NULL OR wheel_weight BETWEEN 0 AND 100);

COMMENT ON COLUMN rewards.wheel_weight IS
  'Ü110: çarkta çıkma ağırlığı. NULL = otomatik (sıraya göre). 0 = çarkta çıkmaz. Yüzde değil — yüzde, o anki toplamdan türetiliyor.';
