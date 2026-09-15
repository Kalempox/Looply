-- ═══════════════════════════════════════════════════════════
-- Ü125 · Şube başvurusu panelden yapılıyor
-- ═══════════════════════════════════════════════════════════
--
-- ── Eksik olan neydi ────────────────────────────────────────
--
-- Göç 0026 çok şubeyi şemada açtı: tekillik `(cafe_id, phone_index)`'e
-- taşındı, aynı kişi farklı kafelerde yönetici olabiliyor. Panelde şube
-- seçici de çizildi. Ama **ikinci şubeyi kuracak yol hiç yazılmadı**:
--
--   · `basvuruOlustur` telefonu görünce reddediyor ("zaten kayıtlı")
--   · `personelEkle` rolü `'cashier'` diye sabit yazıyor
--   · `role = 'manager'` INSERT eden tek yer platformun onay akışı
--
-- Sonuç: `subeler.length > 1` hiçbir zaman gerçekleşemiyordu ve şube
-- seçici hiçbir kullanıcıda görünmüyordu. 0026'nın notu bu yolu tarif
-- ediyordu ("var olan bir kafenin personel listesine yönetici eklenerek")
-- ama o da yazılmamıştı.
--
-- ── Seçilen yol ─────────────────────────────────────────────
--
-- Sahibi yeni şubenin bilgisini **kendi panelinden** giriyor. Ticari
-- unvan, vergi numarası ve yetkili bilgileri ana şubeden kopyalanıyor —
-- aynı tüzel kişi, aynı yetkili. Sahibin gireceği tek şey şubenin adı,
-- şehri ve adresi.
--
-- 🔴 **G5 kapısı duruyor.** Şube `pending` doğuyor ve platformun mevcut
-- başvuru ekranında onay bekliyor. Anında açılsaydı panelden onaysız
-- kafe üretmenin yolu açılırdı: vergi numarası ana şubeden kopyalandığı
-- için "aynı vergi no" şartı kendiliğinden sağlanır ve fiilen sınırsız
-- şube açılabilirdi — her biri kendi günlük bütçesi ve vitrin kaydıyla.
-- Onay ekranı zaten yazılı; sahibi kimsenin **veri girmesini** beklemiyor,
-- yalnızca onayı bekliyor.
--
-- ── Bu kolon neden gerekti ──────────────────────────────────
--
-- Çalışma anında şubeler `phone_index` üzerinden bağlanıyor ve bu kolon
-- oraya hiç karışmıyor. Gereken şey **onaycının bağlamı**: karşısındaki
-- kayıt sıfırdan bir işletme mi, yoksa onayladığı bir işletmenin ikinci
-- şubesi mi? Belge satırı bunu tek başına söyleyemiyor — şubenin kendi
-- belgesi yok, vergi levhası ana işletmenin dosyasında duruyor ve ekran
-- "yüklenmemiş" yazıp onaycıyı yanlış yere çekerdi.
--
-- ⚠️ **Her zaman köke işaret ediyor, zincir kurulmuyor.** Sahibi 2.
-- şubedeyken 3. şubeyi açarsa parent yine 1. şube oluyor
-- (`COALESCE(parent_cafe_id, id)`). Zincir kurulsaydı onay ekranı
-- "B'nin şubesi" der, onaycı asıl işletmeyi görmek için satır satır
-- geriye yürümek zorunda kalırdı.

ALTER TABLE cafes ADD COLUMN parent_cafe_id text REFERENCES cafes(id);

COMMENT ON COLUMN cafes.parent_cafe_id IS
  'Ü125: bu kayıt hangi işletmenin şubesi. Her zaman kök kafe — zincir kurulmuyor. Çalışma anındaki şube bağı bu kolondan değil, staff.phone_index üzerinden kuruluyor (0026); bu kolon onaycıya bağlam veriyor.';

-- Kısmi: şube olmayan kafeler indekste yer kaplamasın — bugün kayıtların
-- neredeyse tamamı kök kafe.
CREATE INDEX cafes_parent ON cafes (parent_cafe_id) WHERE parent_cafe_id IS NOT NULL;

-- Kök kafe kendi kendisinin şubesi olamaz: `COALESCE(parent_cafe_id, id)`
-- ile kök çözülürken kendine işaret eden bir satır sonsuz döngü kurardı.
ALTER TABLE cafes ADD CONSTRAINT cafes_parent_kendisi_degil
  CHECK (parent_cafe_id IS NULL OR parent_cafe_id <> id);
