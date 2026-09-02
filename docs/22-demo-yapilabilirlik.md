# 22 — Demoda Yapılabilirlik

> *"Demoda gerçek veri olmadan yapılabilecek kısımları söyle, yapılamayacak
> kısımları işaretle ki unutmayalım, sonra yapalım, eksik kalmasın."*
> — Ürün sahibi, 2026-09-02
>
> 🟢 Demoda tam çalışır · 🟡 Yapı bugün, sayı simülasyondan
> · 🔴 **İşaretli — demoda yapılamaz** · 🔵 Veriye değil, karara bağlı

---

# Önce ayrım: "gerçek veri" iki ayrı şey için gerekiyor

### 1 · Yapıyı yazmak için — neredeyse hiçbiri gerekmiyor

`npm run db:simule` bir haftalık trafik üretebiliyor: oyuncular, oyunlar,
kuponlar, kasa onayları. Bir sorgu, bir metrik, bir grafik simüle veriyle de
**doğru çalışır** ve demoda dolu görünür. Ekranın doğruluğu verinin gerçek
olmasına bağlı değil.

### 2 · Bir sayıya güvenmek için — asıl sınır burada

Simülasyon botları **benim yazdığım varsayımlara** göre davranıyor. O veriye
uydurulan bir tahmin modeli kendi varsayımını doğrular: doğru görünür,
değersizdir, ve kafe ona bakarak gerçek para harcar. Bu yüzden **model
katmanı** demoda yazılamaz — yazılırsa yalan olur.

### 3 · Üçüncü sınır: dış hesap, veri değil

Hava durumu servisi, ödeme sağlayıcısı, gerçek reklamveren — bunlar veriyle
değil **sözleşmeyle** açılıyor. Ama üçünün de **sahte sağlayıcısı yazılabilir.**
Projede bu örüntü zaten var ve çalışıyor: `SMS_PROVIDER=console`. Sahte
sağlayıcı yapıyı tamamlar; canlıda gerçeği takılır, tek satır ayar değişir.

---

# 🟢 Demoda tam yapılabilir — gerçek veri gerekmiyor

Hepsi saf mantık, sorgu ya da ayar. Girdileri bugün veritabanında var.

| # | İş | Neden veri gerekmiyor |
|---|---|---|
| 1 | **Kampanya teslimi** | Saf mantık. Kampanya satırı var, kupon üretimi var; eksik olan tek şey ikisini bağlayan yol |
| 2 | **Sonsuz oyun** (Blok, Düşen, Kelime) | Oyun mantığı. Hiçbir dış girdi yok |
| 3 | **Oyun içi ödül bloğu** | Aynı — oyun tahtasının kendisi |
| 4 | **Ödül motoru** — şans + skor ağırlığı + azalan getiri (Ü77) | Girdisi **kupon defteri**, o da bugün dolu. "Bu oyuncu bu oyundan son 30 günde ne kazandı" sorusu şu an cevaplanabiliyor |
| 5 | **Bütçe temposu** (Ü78) | Taahhüt, rezervasyon ve harcama defteri hepsi yerinde. Tempo bunların üstünde bir hesap |
| 6 | **Leaderboard genişletme** — haftalık, şehir, arkadaş | Sorgu. Haftalık sıfırlama takvim işi; şehir kafe adresinden; arkadaş davet bağından |
| 7 | **Günün Challenge'ı rotasyonu** | Takvim. Hangi gün hangi oyun — veri değil, kural |
| 8 | **Haftalık puan** | Sorgu. Puan defteri append-only, tarih aralığı zaten var |
| 9 | **Yakındaki kafeler / keşif** | Kafe koordinatları panelden giriliyor, oyuncu konumu K2 için zaten alınıyor. İki kafe yeter |
| 10 | **Kafe oyun yönetimi** — hangi oyun açık | Ayar. Oyun kayıt defteri var, süzgeç eklenecek |
| 11 | **Kupon kullanım günü ve saati** | Ayar + kasada bir kontrol. Happy Hour'un aynası |
| 12 | **Ödül başına günlük adet limiti** | Sayaç. Kupon defterinden okunuyor |
| 13 | **Saat bazlı challenge** | Saat. Happy Hour altyapısı kısmen taşıyor |
| 14 | **Kafeye özel tema** — Pizza Blocks | Sunum katmanı. Tek motor, çok tema |
| 15 | **Ödül ve ürün adını düzeltme** | Basit düzenleme ekranı. **En küçük iş, en acil ihtiyaç** — hata sahada zaten yaşandı |
| 16 | **Kasa, menü, fiş karekodları** | Masa karekodu altyapısı hazır; tür alanı eklenecek |
| 17 | **Kafe vs kafe** | Toplam. İki kafe ve birkaç oyuncu yeter |
| 18 | **Toplu kupon kullanımının engellenmesi** (Ü76) | Bugün zaten tek tek okutuluyor; kural yazıya dökülüp testle çivilenecek |
| 19 | **Erişim seviyeleri / Boost** — mantık tarafı | Sayaç ve kapı. 🔵 Fiyatlandırma ayrı bir karar |

**Toplam: 19 iş, hiçbiri gerçek veri beklemiyor.**

---

# 🟡 Yapı bugün yazılır, sayı simülasyondan gelir

Bunlar demoda **çalışır ve dolu görünür.** Kod doğrudur; içindeki sayı
simüle davranıştan çıktığı için gerçek müşteri davranışı değildir. Demoda
gösterilebilir, **karar dayanağı yapılamaz.**

| # | İş | Bugün ne olur | Ne zaman gerçekleşir |
|---|---|---|---|
| 20 | **Tekrar ziyaret metriği** | Hesap doğru yazılır, simülasyondan gerçek bir yüzde çıkar | İlk pilot kafede ilk ay |
| 21 | **Analitik / event pipeline** | Boru hattı akar, olaylar yazılır, ekranlar dolar | Aynı |
| 22 | **D1 / D7 / D30 retention** | Sayı çıkar — ama simüle oyuncunun geri dönme davranışı botun kuralı | Aynı |
| 23 | **Platform dashboard** | Sayılar **küçük ama gerçek** — ne varsa onu gösterir | Kafe sayısı arttıkça kendiliğinden |
| 24 | **Kafede kalma süresi** | Ölçüm yazılır (masa oturumu zaten var) | "Kaç dakika uzun sayılır" eşiği gerçek veri ister |
| 25 | **Öngörü paneli · katman 1** — geçmişi göster | *"Geçen Cumartesi 43 oyuncu, 1.180 TL ödül"* — saf sorgu, tam çalışır | Şimdi |
| 26 | **Öngörü paneli · katman 2** — kural tahmini | *"Son dört Cumartesinin ortalaması"* — kod doğru, veri azken **"yeterli veri yok"** der | 4–6 hafta gerçek trafik |

> ⚠️ **Ü80'in değişmez kuralı:** motor **dürüst bozulmalı.** Yeterli geçmiş
> yoksa panel bir sayı uydurmaz, "henüz yeterli veri yok" der. Bir öneri
> ancak dayandığı geçmiş gösterilebiliyorsa gösterilir.

---

# 🔴 İşaretli — demoda yapılamaz

**Bu bölüm unutulmamak için var.** Her satırda "neyin gelmesiyle açılır"
yazıyor.

### 24 · Öngörü motorunun model katmanı

> *"Yarın 62 oyuncu bekleniyor, aralık 51–74, önerilen havuz 2.250 TL,
> en yoğun saat 18:00–21:30."*

**Neden yapılamaz:** bu cümledeki her sayı geçmişe uydurulmuş bir modelden
çıkıyor. Simüle veriye uydurulursa model **benim bot kurallarımı** öğrenir
ve gerçek kafede yanlış çıkar — üstelik güvenilir görünerek.

**Açılış şartı:** tek kafede pilot + **8–12 hafta** gerçek trafik. Hava,
takvim ve tatil etkisi için bir sezon daha.

**Şimdi ne yapılabilir:** katman 1 ve 2 (yukarıda 🟡). Panelin yeri, ekranı
ve dili bugün kurulur; içine giren hesap sonra güçlenir. Kafe ilk günden
"geçen hafta ne oldu"yu görür.

---

### 25 · Hava durumu tetikleyicisi

**Neden yapılamaz:** dış servis hesabı gerekiyor — veri değil, sözleşme.

**Açılış şartı:** bir hava durumu sağlayıcısı hesabı (ücretsiz katmanlar
mevcut).

**Şimdi ne yapılabilir:** **sahte sağlayıcı** — `SMS_PROVIDER=console`
örüntüsünün aynısı. Panelden "bugün yağmurlu" seçilir, kural çalışır, havuz
açılır, demoda gösterilir. Gerçek servis geldiğinde tek satır ayar değişir.
⚠️ Ama *"yağmurda talep %30 düşer"* katsayısı **model katmanına** ait — o
yine 🔴.

**Bugünden yapılabilecek yarısı var:** takvim tarafı (resmi tatil, okul
tatili, bayram) dış servis istemiyor, statik bir liste.

---

### 26 · Abonelik ve finans

**Neden yapılamaz:** gerçek ödeme sağlayıcısı, sözleşme ve muhasebe.

**Açılış şartı:** ödeme sağlayıcısı anlaşması + şirket muhasebe kurulumu.

**Şimdi ne yapılabilir:** şema, paket tanımları (Starter / Pro / Business),
kafe aboneliğinin durumu ve **sahte ödeme adımı.** Kapsam belgesinin kendi
planı bu: *"ilk mimaride oluşturup çalıştırmayacağız, ileride eklenebilecek
şekilde hazırlayacağız."*

---

### 27 · Reklam sisteminin ticari tarafı

**Neden yapılamaz:** gerçek reklamveren yok, envanter fiyatı yok, faturalama
yok.

**Açılış şartı:** ilk reklamveren + fiyatlandırma kararı + fatura altyapısı.

**Şimdi ne yapılabilir — sanıldığından fazlası:** reklamveren **rolü**,
dördüncü panel, kiracı izolasyonu, kampanya tanımı, hedefleme kuralları,
gösterim sayacı ve oyun sonu reklam yüzeyi **bugün yazılabilir**; tohuma
sahte bir reklamveren konur ve demo baştan sona yürür. 🔴 olan yalnızca
**para akışı**.

⚠️ Yine de bu blok **çok büyük** — dördüncü bir rol ve dördüncü bir panel,
tek başına bir faz. Demoya girmesi gerekip gerekmediği ayrı bir karar.

---

### 28 · Gerçek retention'ın okunması

**Neden yapılamaz:** *"1.000 kişi oynadı, 600'ü tekrar geldi"* cümlesi ancak
gerçek insanlardan çıkar. Hesap bugün yazılır (🟡 20–22), **anlamı** sonra
gelir.

**Açılış şartı:** pilot kafede ilk 30 gün.

---

# 🔵 Veriye değil, karara bağlı olanlar

Bunlar veri beklemiyor; bir karar bekliyor. Karar geldiği gün yazılabilir.

| Konu | Ne bekliyor | Ne bloke ediyor |
|---|---|---|
| **S7 · Şans mevzuatı** | Hukuki görüş | ⚠️ **Ödül motoru (Ü77) demoda yazılabilir ama canlıya çıkamaz.** Şans artık çarkın köşesinde değil, motorun merkezinde |
| **S20 · Aydınlatma metni** | Hukukçu, 1–2 hafta | Pilot |
| **S17 · Kalan 7 oyun** | Liste kararı | Faz 9'un kapanışı |
| **Boost fiyatlandırması** | Ürün sahibi | Erişim seviyelerinin satılabilir hâli |
| **SMS gönderici başlığı** | Yeni isim + operatör onayı, birkaç iş günü | Canlıya çıkış |
| **G32 · Platform TOTP** | — (yazılabilir) | Alan adında açık duran platform paneli |

---

# Özet

| | Adet | Ne demek |
|---|---|---|
| 🟢 Tam yapılabilir | **19** | Bugün başlanabilir, gerçek veri beklemiyor |
| 🟡 Yapı bugün, sayı sonra | **7** | Demoda dolu görünür; karar dayanağı olmaz |
| 🔴 Demoda yapılamaz | **5** | İşaretli. Açılış şartları yukarıda |
| 🔵 Karar bekleyen | **6** | Veri değil, cevap gerekiyor |

**Sonuç: demoyu bloke eden tek gerçek engel öngörü motorunun model
katmanı** — ve onun bile ekranı, yeri ve dili bugün kurulabilir. Geri kalan
her şey ya tam yapılabilir ya da yapısı yazılıp sayısı sonra oturur.

⚠️ **Demoyu bloke etmeyen ama canlıyı bloke eden iki madde:** S7 (şans
mevzuatı) ve S20 (aydınlatma metni). İkisi de kodla kapanmıyor ve ikisinin
de teslim süresi haftalarla ölçülüyor — **bugün başlatılmalı.**
