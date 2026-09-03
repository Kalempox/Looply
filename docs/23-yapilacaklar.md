# 23 — YAPILACAKLAR

> **Aradığın dosya bu.** Tek liste, sırayla, kutucuklu.
> Bir iş bitince kutusu işaretlenir ve karar defterine (`02`) girer.
>
> Yan dosyalar: neyin **var** olduğu → `21-looply-kapsam-haritasi.md` ·
> demoda neyin **yapılabildiği** → `22-demo-yapilabilirlik.md`

**Son güncelleme:** 2026-09-02 · **Kararlar:** Ü76 – Ü95

---

# DALGA 1 · ✅ TAMAMLANDI — 2026-09-02

- [x] **1 · Kampanya teslim yolu** ✅ **BİTTİ** — Ü82, 2026-09-02
  Nitelikli oyun sonunda, kampanya başına günde bir kupon. Başarı şartı yok
  (ödül oynamanın karşılığı, kampanya kafenin pazarlaması). Seçim rastgele
  değil: bugün en az kupon çıkan kampanya.
  ⚠️ **Yol boyunca bulunan asıl hata:** şema Ü8'in *"yüzde kampanyası
  bütçeden düşmez"* kısıtını taşıyordu; Ü17 bu kararı tersine çevirmiş ama
  kısıt güncellenmemişti. Hiç kampanya kuponu üretilmediği için çelişki iki
  yıl görünmedi. Göç `0023` düzeltti.
  11 test · `npm run ci` 400/400.

- [x] **2 · Sonsuz oyun + `basarili()` kararı** ✅ **BİTTİ** — Ü83, 2026-09-02
  Bölüm kavramı sözleşmeden tamamen kalktı. Turun tek bitişi kaybetmek.
  Zorluk kolları: Blok'ta küçük parçalar seyreliyor, Düşen'de her dört
  satırda hızlanma, Kelime'de tur başına süre (45 sn → 15 sn).
  `basarili` artık **skor eşiği**: `puan.KUPON_ESIGI = 500`, kapsam
  belgesindeki 500/1000/2500 kademesinden. Ü48'in 1500/2500'ü artık
  gerçekten ödenebilir.
  403 test yeşil · tarayıcıda misafir akışıyla uçtan uca oynandı.

- [x] **2b · Skor dengesi** ✅ **KAPANDI** — ürün sahibi elle test etti,
  oynanış iyi. Bot skorlarının düşük olması sorun değil: botlar demo
  verisi üretmek için yazıldı, iyi oynamak için değil.

- [x] **2c · Oyun saati sunucuda doğrulanıyor** ✅ **BİTTİ** — Ü84, 2026-09-02
  Sözleşmeye `gecenMs()` eklendi, sunucu bildirilen saati `duration_ms` ile
  karşılaştırıyor. On dakikayı üç saniye diye bildiren kayıt reddediliyor.
  Aynı kontrol misafir akışında da var.
  ⚠️ Düşen ekranı da duvar saatine geçti — kontrolün ön koşuluydu, yan
  kazancı sekmeyi arkaya atıp parçayı havada tutamamak.
  408 test yeşil · tarayıcıda gizli sekmede yerçekimi doğrulandı.

- [x] **3 · Oyun tahtalarının görünümü** ✅ **BİTTİ** — Ü85, 2026-09-02
  Üç tahta da oyunun kendi rengine geçti; yüzey `arayuz/tahta.tsx`ten tek
  yerden geliyor. Hücreler gradyanlı ve üstten ışık alıyor — dolu hücre
  nesne gibi duruyor, boş hücre çukur.
  Blok'ta seçili teklif yükseliyor ve parça önizlemesi ızgaradaki rengiyle
  aynı; Düşen'de bırak düğmesi tam genişlikte alta indi (yön tuşlarıyla
  karışıp parçayı yanlışlıkla düşürtüyordu); Kelime'de seçili harf doluyor.
  408 test · üç oyun da tarayıcıda mobil boyutta görüldü.

- [x] **4 · İsim değişikliği: CafePlay → Looply** ✅ **BİTTİ** — Ü86, 2026-09-02
  65 dosya: ekran metinleri, SMS şablonları, sayfa başlıkları, aydınlatma
  metni, paket adı, doküman.
  ⚠️ **Veritabanı kimliklerine dokunulmadı** — `cafeplay_app`,
  `cafeplay_admin`, veritabanı adı, kap ve hacim adları. Göçler uygulanmış
  tarihtir ve kullanıcı bu adları hiç görmüyor.
  ⚠️ **SMS gönderici başlığı başvurusu artık yapılabilir** — şablonlar
  "Looply" ile başlıyor ve test bunu çiviliyor. Operatör onayı birkaç iş
  günü; geciken canlıya çıkışı bloke eder.

---

# DALGA 2 · ✅ TAMAMLANDI — 2026-09-03

Üçü tek bir soruyu cevaplıyor: *bu turda ödül çıkacak mı, hangisi, ne kadar?*
Ayrı ayrı yazılırsa üçüncüsü ilk ikisini bozar.

- [x] **5 · Bütçe temposu** ✅ **BİTTİ** — Ü87, 2026-09-02
  Günlük bütçe gün içinde kademeli açılıyor (varsayılan pencere 09:00–23:00,
  kafenin ayarı). Oran birikimli ve bir **tavan**: sabah kimse gelmediyse pay
  kaybolmuyor; kimse gelmezse hiçbir şey dağıtılmıyor.
  Günün onda biri ilk andan açık — sıfırdan başlasaydı sabahın ilk müşterisi
  eli boş dönerdi (E2).
  ⚠️ Dönem **günlük** (Ü45), haftalık değil — Ü78 yazılırken yanlış
  hatırlanmıştı; tempo bu yüzden gün *içinde* işliyor.
  ⚠️ Pencere saatleri bir tahmin: kafenin gerçek çalışma saatleri sistemde
  yok. Öngörü paneli (madde 16) gerçek veriyle bunu iyileştirecek.
  411 test · panelde "şu an dağıtılabilir" ayrı gösteriliyor.

- [x] **6 · Ödül motoru** ✅ **BİTTİ** — Ü88, 2026-09-02
  Üç girdi çalışıyor. Ölçüldü: eşikte %55 düşme / en pahalı ~%0; doyumda
  %90 / ~%9; doyumda iki kazanımdan sonra %45 / ~%1.
  En ucuz ödül her koşulda en olası kalıyor — sıralama ters çevrilmiyor.
  ⚠️ Göç `0024`: `coupons.play_session_id`. Azalan getirinin ihtiyaç duyduğu
  "hangi oyundan" bağı hiç yoktu; `kaynakId` alınıp hiçbir yere
  yazılmıyordu. Yan kazanç: "hangi oyun daha çok ödül dağıtıyor" sorulabilir.
  **Ü89 ile oranlar kısıldı** (ürün sahibi): düşme %50–75, en pahalı ödül
  %1,5, ortalama 26–27 TL. Ucuz ürünler her koşulda baskın.
  418 test.

- [x] **6b · Kafe kapalıyken ödül yok + panelde çalışma saatleri** ✅ **BİTTİ**
  — Ü90, 2026-09-03. Ü87 kapanıştan sonra bütçenin tamamını açıyordu; artık
  sıfır. Kapanışa yarım saatlik pay var (son masanın turu bitsin).
  Açılış/kapanış panelden seçiliyor, bütçenin hemen altında.

- [ ] **6c · Çalışma saati penceresi gece yarısını aşamıyor** ⚠️ *bilinen sınır*
  Gece 02:00'ye kadar açık bir kafe kapanışını 23 yazmak zorunda ve yarım
  geceden sonrası kapalı sayılıyor. Panel bunu açıkça reddediyor
  ("gece yarısını aşan saatler henüz desteklenmiyor").
  Gerçek gece kafeleri geldiğinde iş günü tanımıyla birlikte ele alınmalı.

- [x] **7 · Oyun içi ödül işareti + Yılan oyunu** ✅ **BİTTİ** — Ü91, 2026-09-03
  Yılan eklendi; elmanın bazısı **altın kupon**. İlk beş yemde çıkmıyor
  (öğrenme anı), sonra uygun yemlerin beşte biri.
  Oyun kupon üretmiyor, yalnızca sayıyor — sunucu replay'de aynı sayıyı
  buluyor. İşaret şansı yükseltiyor (%50→%70, %75→%95) ve **kupon eşiğini
  atlıyor**; tier'i açmıyor (bütçe, Ü89).
  ⚠️ Yılan ilk yön tuşuna kadar bekliyor — ilk sürümde oyuncu ekrana
  bakmadan üç saniyede duvara giriyordu.
  424 test · tarayıcıda oynandı.

- [x] **7c · Ödül yemden ayrıldı + oranlar düştü** ✅ **BİTTİ** — Ü92/Ü93
  Ödül artık yemin yerine değil **yanına** beliriyor ve 25 adım sonra
  kayboluyor: yakalamak bir karar. Kovalayan %21, görmezden gelen %3.
  Motor tabanı 0,50–0,75 → **0,22–0,45** (Blok %26 → %10).
  İşaret payı ters yönde arttı (0,20 → 0,35): yakalanan ödül %62 karşılık
  veriyor, yoksa görünen ödülü kaçırmak oyunu yalan çıkarırdı.
  Bütçe paneline **ödül dökümü** eklendi — hangi ödül, kaç açık, kaç kasada.

- [ ] **7b · Blok ve Düşen'e de ödül bloğu** *(isteğe bağlı)*
  Sözleşmedeki `odulIsareti` seamı hazır; Yılan'da ayrı nesne olarak
  çözüldü (Ü92), Blok/Düşen'de de aynı yaklaşım kurulabilir.

---

# DALGA 3 · ŞİMDİ — döngüyü güçlendiren ucuz işler ⬅️

- [x] **8 · Ödül ve ürün adını düzeltme** ✅ **BİTTİ** — Ü94, 2026-09-03
  Ödül ve ürün satırında "adı düzelt" kutusu. **Yalnızca ad ve açıklama**;
  değer, tip, fiyat ve kategori değişmiyor — verilen söz geri alınmaz.
  Kaç açık kuponun etkileneceği kutu açılır açılmaz yazıyor.
  Eski ad denetim izinde (`oncekiBaslik`) — Ü75'te ad izden çıkarılmıştı
  ama ad DEĞİŞİKLİĞİNDE eski ad başka hiçbir yerde kalmıyor.
  Demo verisindeki "ize amreicano" ve "çoklata" düzeltildi.
- [x] **8b · Girişli oyuncu karekodu okutunca masaya oturuyor** ✅ **BİTTİ** — Ü95
  🔴 Sahada bulunan hata: girişli oyuncu karekodu okutunca masa oturumu
  **hiç açılmıyordu** — "Kafe dışındasın" görüp ödül kazanamıyordu.
  İlk ziyarette çalışması (kayıt akışı oturumu kendisi açıyor) hatayı
  gizlemişti. `masayaOturt` ortak modüle taşındı, üç yol da çağırıyor.
  Ayrıca: "oturumun doldu" artık "kafe dışındasın"dan ayrı ve ne
  yapılacağını söylüyor; konumsuz kafede çalışmayan "Doğrula" düğmesi
  kaldırıldı.

- [ ] **9 · Haftalık leaderboard sezonu + haftalık puan**
- [ ] **10 · Günün Challenge'ı rotasyonu**
  Bugün yalnızca 2× çarpan var; gün rotasyonu yok.
- [ ] **11 · Tekrar ziyaret metriği**
  Kapsam belgesinin "en kritik metrik" dediği şey. Veri var, hesap yok.
- [ ] **12 · Ödül başına günlük adet limiti + kupon kullanım günü ve saati**
- [ ] **13 · Kasa, menü ve fiş karekodları + kafe oyun yönetimi**

---

# DALGA 4 · Ondan sonra — yeni yüzeyler

- [ ] **14 · Kafe keşif ekranı (yakındaki kafeler) + kafe vs kafe**
- [ ] **15 · Analitik / event pipeline**
  D1/D7/D30 retention buna bağlı.
- [ ] **16 · Öngörü paneli** (Ü80)
  Üç katman: geçmişi göster · kural tahmini · model.
  ⚠️ **Motor dürüst bozulmalı**: yeterli geçmiş yoksa sayı uydurmaz,
  "henüz yeterli veri yok" der.
- [ ] **17 · Platform dashboard**
- [ ] **18 · Kafeye özel tema** (Pizza Blocks / Burger Blocks)

---

# DALGA 5 · Demo için "varmış gibi" (Ü81)

Sahte **sağlayıcı** ve tohumlanmış **geçmiş** ile. Ekran taklidi yok —
gerçek kod, sahte veri. Canlıya geçerken atılacak kod olmayacak.

- [ ] **19 · Sahte sağlayıcı altyapısı**
  `SMS_PROVIDER=console` örüntüsü hava, ödeme ve reklam için tekrarlanıyor.
  🔴 **Sert kural:** `env.ts` canlı ortamda sahte sağlayıcıyı **reddeder** —
  uygulama başlamaz. Beyanla değil, başlatma hatasıyla.

- [ ] **20 · `npm run db:demo` tohumu**
  12 haftalık makul trafik + sahte reklamveren + kafe abonelikleri + hava
  geçmişi. 🔴 Canlı veritabanında çalışmayı reddeder.

- [ ] **21 · Hava durumu tetikleyicisi**
  Gerçek: kural motoru, havuz açma, panel, takvim (bayram/tatil statik liste).
  Sahte: panelden "bugün yağmurlu" seçimi.

- [ ] **22 · Abonelik ve finans**
  Gerçek: paketler (Starter/Pro/Business), abonelik durumu, süre takibi, panel.
  Sahte: "ödendi" adımı.

- [ ] **23 · Reklam sistemi + reklamveren rolü**
  Gerçek: 4. rol, 4. panel, kiracı izolasyonu, hedefleme, gösterim sayacı,
  oyun sonu reklam yüzeyi. Sahte: reklamveren ve kampanyalar tohumdan.
  ⚠️ Tek başına bir faz büyüklüğünde.

---

# 🔵 Kodla kapanmayan — bugün başlatılmalı

Bunlar yazılım işi değil; bekleme süreleri haftalarla ölçülüyor.

- [ ] **S7 · Şans mevzuatı görüşü** ⚠️ **EN RİSKLİ**
  Demoyu bloke etmiyor, **canlıyı bloke ediyor.** Şans artık çarkın köşesinde
  değil, ödül motorunun merkezinde (Ü77).
- [ ] **S20 · Aydınlatma metni hukuk incelemesi** — 1–2 hafta, pilotu bloke eder
- [ ] **SMS gönderici başlığı** — yeni isimle, operatör onayı birkaç iş günü
- [ ] **S17 · Kalan 7 oyunun listesi** → `18-oyun-adaylari.md`
- [ ] **S6 / H2** · Ad-soyad-telefon için hukuki sebep
- [ ] **Boost fiyatlandırması** — erişim seviyelerinin satılabilir hâli

---

# 🔒 Hâlâ açık iki tasarım kararı

- [ ] **Kafe Bakiyesi** — üçüncü ödül tipi (Ü18 v1'den çıkarmıştı)
  Kısmi kullanım gerekiyor ("125 TL bakiye, 200 TL hesap → 75 TL kalan");
  bugünkü kupon modelinde yok. ⚠️ Nakit çekim eklenirse KYC/AML doğuyor.
- [ ] **Çapraz kafe XP** — "A'da kazan, B'de kullan" (Ü15 + G12)
  Anonim oyuncu kodu kafe bazında farklı; kafeler aynı oyuncuyu eşleştiremiyor.
  Çözüm: platform seviyesinde ayrı XP havuzu.

---

# 🚀 Canlıya çıkış kontrol listesi

- [ ] `APP_ENV=staging` ile sunucuya çıkış (SMS beklemeden bugün mümkün)
- [ ] Kafe konumu panelden **bir kez** basılmalı — yoksa K2 düşer, kimse kazanamaz
- [ ] `npm run keys:generate` — 6 ayrı anahtar, `BACKUP_ENC_KEY` ayrı yerde
- [ ] Production Postgres + kısıtlı `cafeplay_app` rolü (RLS buna dayanıyor)
- [ ] Ters vekil + TLS (alan adı hazır)
- [ ] **G32 · Platform girişinde TOTP** — Faz 3'ten devreden açık madde
- [ ] Gerçek SMS sağlayıcısı (`production` sahte sağlayıcıyla açılmıyor)
- [ ] Yedekten geri dönüş tatbikatı
- [ ] Bağımsız güvenlik incelemesi / sızma testi

---

# ✅ Bitmiş olanlar — kayıt için

Çekirdek döngünün tamamı (16/16): masa QR'ı · kafe sayfası · konum
doğrulaması · 3 oyun · sunucu skor doğrulaması · ödül · 24 saat bekleme ·
kupon · atomik tek kullanım · 60 sn geri alma · süre dolumu iadesi · SMS
hatırlatma · append-only defter.

Kimlik: telefon + SMS OTP · parola · beni hatırla · önce oyna sonra kaydol.

Davet sistemi: 10 durumlu makine · nitelikli davetin 7 şartı · fraud motoru.

Kafe paneli: bütçe · ürün · kategori · ödül · kampanya (oluşturma) ·
Happy Hour · masa karekodları · personel · konum · raporlar.

Oyuncu: ödüller · kuponlar · profil · seviye · XP · rozet · günlük seri ·
çark · Masayı Fethet · kafe bazlı liderlik · fırsatlar.

Platform: kafe başvuru onayı · acil durdurma.
