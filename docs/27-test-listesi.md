# 27 — UÇTAN UCA TEST LİSTESİ (eksiksiz)

> **Elle, sırayla uygulanmak için.** Her adımda **Yap** (ne yapacağın),
> **✅** (ne görmen gerektiği) ve **🔴** (hangi durumun hata olduğu) ayrı.
> Sonraki bölümler öncekinin bıraktığı duruma dayanıyor.
>
> Rol rol ayrıntı: `28` kafe yöneticisi · `29` oyuncu · `30` kasiyer ·
> `31` butik işletme · `32` butik kasiyeri · `33` platform. Bu liste
> hepsini **tek sırada** topluyor.

**Son güncelleme:** 2026-09-24 · Ü276'ya kadar olan her değişiklik içinde.

📍 **Şu an buradasın: 2.1** — 1. bölüm bitti.

---

## 0 · Hazırlık

### 0.1 · Sunucu ve adres
- Adres: **https://192.168.1.175:3001** — derlenmiş, **hızlı** sürüm
  (`npm run telefon`; kod değişince ben yeniden derleyip açıyorum). 3000
  geliştirme sunucusu: çok daha yavaş, her sayfayı ilk açılışta derliyor.
  Düz `http` ile konum doğrulaması hiç çalışmaz — ikisi de HTTPS. Paneli ve telefonu **aynı porttan** aç —
  karekod panelin açıldığı adresi taşır. ⚠️ IP değişebiliyor:
  `ipconfig` → IPv4.
- **Tam ekran:** Safari'de Paylaş → **Ana Ekrana Ekle**. Oradan açınca
  adres çubuğu olmadan açılır (Ü274).
- Telefon bilgisayarla **aynı Wi-Fi'de** olmalı (mobil veride değil).
- Sertifika uyarısı normal: Safari "Ayrıntıları göster → Bu web sitesini
  ziyaret et", Chrome "Gelişmiş → Devam et".

### 0.2 · Hesaplar
Doğrulama kodları geliştirmede **ekranda sarı kutuda** görünür.

| Kim | Nereden | Bilgi |
|---|---|---|
| Oyuncu (demo) | `/giris` | `05320000099` · parola `Deneme1234` |
| Kafe A yöneticisi | `/kafe/giris` | **Yetkili cep telefonu** `05320000001` + ekrandaki kod |
| Kafe B yöneticisi | `/kafe/giris` | **Yetkili cep telefonu** `05320000002` + ekrandaki kod |
| Moda Butik yöneticisi | `/kafe/giris` | **Yetkili cep telefonu** `05320000003` + ekrandaki kod |
| Boş Test Kafe yöneticisi | `/kafe/giris` | **Yetkili cep telefonu** `05320000077` + ekrandaki kod |
| Kasiyer | `/kasa/giris` | **PIN `1234`** — yalnızca **kayıtlı cihazda** (1.9) |
| Platform yöneticisi | `/platform/giris` | `05310000001` + ekrandaki kod |
| Platform desteği | `/platform/giris` | `05310000002` + ekrandaki kod |

### 0.3 · Gece test ediyorsan
- Kafe kapalıyken **hiç ödül çıkmaz** → Panel → Bütçe → **Açılış 00:00**.
- Her kupon önce **bekler** (Ü269) → beklemeden denemek için Panel →
  Ödüller → **Aktivasyon saati 1**. Ya da kupon kazanınca bana yaz, açılma
  saatini öne çekerim.

---

## 1 · Kafe paneli — kurulum (Kafe A · bilgisayar)

### 1.1 · Giriş
**Yap:** `/kafe/giris` → **Yetkili cep telefonu** kutusuna `05320000001` → ekrandaki 6 haneli kod.
✅ Panel açılır, üstte **Kafe A** yazar.
🔴 Onaysız bir işletme girebiliyorsa.

### 1.2 · Menü
✅ Günlük: Panel · Ödüller · Rapor · Bütçe (geniş ekranda + Kampanyalar,
Çark). Kurulum: Konum · Ürünler · Karekod · Oyunlar · Personel · Happy
Hour · Şubeler.
🔴 Bir durak tıklanınca açılmıyorsa.

### 1.3 · Konum — 🔴 bunsuz kimse ödül kazanamaz
**Yap:** Konum → **Konumu güncelle** (tarayıcı izin ister) → Yarıçap
**200** → **Yarıçapı kaydet**. Bunu, oynayacağın yerde yap: konum paneli
açtığın cihazdan okunur.
✅ Enlem/boylam bulunduğun yeri gösterir; kayıt "±X m" doğruluğunu yazar.
✅ Bilgisayardan okunan kaba konum (±100 m'den kötü) **kaydedilmez**;
ekran "telefondan kaydet" der (Ü274).
🔴 İzin reddedilince sayfa bozuluyorsa.

### 1.4 · Ürünler
**Yap:** Ürünler → bir ürün ve fiyatı ekle.
✅ Listeye düşer.

### 1.5 · Ödüller ve kupon zamanlaması (Ü268 · Ü269)
**Yap:** Ödüller.
✅ Hiçbir ödülde **"Masada 5 dakika"** yazmıyor — her ödül yalnızca konum
doğrulaması ister.
✅ **Yeni ödül**: değer **sayı kutusu**, altında "25 ile *üst sınır* TL
arası, tam TL". 27 kaydedilir; 24, 27,5 ve üst sınırın 1 fazlası kaydedilmez.
✅ **Açılma ve geçerlilik** kutusunda: **Aktivasyon saati** (1–48) ·
**Kupon kaç gün geçerli** (1–30) · **Ödül üst sınırı** (en az 50, yukarısı
serbest). "Gecikmeli açılma eşiği" alanı **yok**.
✅ Üstteki kart **"Açılma süresi: 12 saat"**; ödül satırları da kafenin
saatini yazar ("6 saat sonra açılır").
🔴 Bir ödül hemen açılıyor diye yazıyorsa; 49'luk üst sınır ya da tavanı
aşan ödül kaydedilebiliyorsa.

### 1.6 · Bütçe
**Yap:** Bütçe → **Bu dönemin bütçesi (TL)**.
✅ Alt sınırın altı reddedilir — alt sınır günde 1.500 TL × dönemin gün
sayısı (tam haftada 10.500 TL); kutunun altındaki ipucu tam rakamı yazar.
✅ **Şu an dağıtılabilir** dolu. Bütçe güne yayılır; sabah erken ya da gece
yarısından hemen sonra küçük görünmesi normal.
✅ **Açılış / Kapanış** burada (0.3).

### 1.7 · Karekod (Ü270)
**Yap:** Karekod → **Yazdır**.
✅ Ortada mutlu Loopy, altında `kafe-a-y85kuahv`. Yazdırma sayfası aynı kodu
gösterir.
✅ Paneli `localhost` ile açsan bile karekod **192.168.1.175** adresini
taşır (telefonla okutunca 2.1 çalışır).
🔴 Ekrandaki kod ile yazdırılan farklıysa.

### 1.8 · Oyunlar
**Yap:** Oyunlar → bir oyunun anahtarını kapat.
✅ Hepsini kapatmaya çalışınca: "En az bir oyun açık kalmalı…"
✅ Kapattığın oyun 2.3'te oyuncu listesinde görünmez. **Sonra tekrar aç** —
4. bölümde dokuzu da lazım.
🔴 Kapalı oyun "Bugünün oyunu" olarak çıkıyorsa.

### 1.9 · Personel ve kasa cihazı
**Yap:** Personel → kasiyer ekle (**Adı** + 4 haneli **PIN**). Sonra
**kasada kullanacağın telefon/tabletten** paneli aç → Personel → **Cihaz
adı** ("Kasa tableti") → kaydet. Cihaz kimliği o tarayıcıda tutuluyor.
🔴 Kayıtsız bir cihazda `/kasa/giris` PIN'i kabul ediyorsa.

### 1.10 · Happy Hour
**Yap:** Happy Hour → bir saat aralığı tanımla.
✅ Kaydedilir. ⚠️ Pencere gece yarısını aşamıyor (bilinen sınır).
🔴 Pencere dışında happy hour ödülü çıkıyorsa (5.8).

### 1.11 · Çark
**Yap:** Çark → dilimleri, yüzdeleri ve **çark üst sınırını** gör.
✅ Ödüller sayfasındaki **"Çarka giren"** kartı, çark üst sınırının
altındaki yayında ödüllerin sayısını gösterir.
🔴 Günlük adedi dolmuş ödül çarkta görünmeye devam ediyorsa.

### 1.12 · Kampanyalar
**Yap:** Kampanyalar → bir kampanya oluştur, yayınla.
✅ Oyuncunun **/firsatlar** ekranında görünür (5.9).

### 1.13 · Şubeler
**Yap:** Şubeler → ikinci şube aç.
✅ Üst şeritte şube seçici belirir; tek şubedeyken görünmez.
🔴 Bir şubenin bütçesi/ödülü öbüründe görünüyorsa.

### 1.14 · Telefondan panel
**Yap:** Aynı paneli telefondan aç, bütün duraklara gir.
🔴 Bir durak telefondan açılamıyorsa.

---

## 2 · Karekod → oyuncu (telefon)

### 2.1 · Karekodu okut
**Yap:** Safari'de Kafe A'nın karekodunu okut. İlk deneme için **gizli
sekme** (misafir olarak).
✅ Adres **192.168.1.175** olarak kalır (Ü273 — önce `0.0.0.0`a
yönleniyordu) → **Kafe A** ve çark açılır.
🔴 "Sunucuya bağlanılamadı" / adres `0.0.0.0` ya da `localhost` oluyorsa;
başka kafe açılıyorsa.

### 2.2 · Misafir oynasın
**Yap:** Bir oyun oyna, bitir.
✅ Skor **"sunucuda doğrulandı"**; hesap açmaya yönlendiriyor.
✅ Konumu doğrulanmış misafir 500'ü geçip ödül paketini alırsa sonuçta
**"Ödül paketini aldın"** yazar; kupon hesap açılınca gelir (Ü275).
🔴 Misafire hesap açmadan kupon veriliyorsa.

### 2.3 · Hesap aç (Ü270)
**Yap:** Telefon, **e-posta**, ad, soyad, doğum yılı, parola → kod
(ekranda sarı kutuda).
✅ Kodu girince hesap açılır; misafirken oynadığın tur hesaba geçer (paket
aldıysan kupon **Ödüllerim**'de, bekliyor).
✅ **"Google / Apple ile devam et" yok.**
✅ 1.8'de kapattığın oyun listede yok (sonra tekrar aç).
🔴 Kodu doğru girdiğin hâlde **"E-posta adresi eksik"** diyorsa.

### 2.4 · Çıkış ve beni hatırla
**Yap:** Normal sekmede çık → parolayla gir, bir kez **Beni hatırla**
işaretli, bir kez işaretsiz.
✅ İşaretli: 90 gün açık kalır, karekodu tekrar okutunca giriş istemez.
İşaretsiz: 12 saatte kapanır. Kutu **varsayılan kapalı** (ürün sahibinin
kararı).
⚠️ Gizli sekmede oturum sekme kapanınca her durumda silinir.

### 2.5 · Parolamı unuttum (Ü270)
**Yap:** Giriş → **Parolanı mı unuttun?** → telefon → kod + yeni parola.
✅ Yalnızca telefon sorulur; kodun gittiği adres maskeli ("a•••@…").
✅ Yeni parolayla içeri alır; çıkıp **yeni** parolayla girilir, eskisiyle
girilmez.
🔴 Başka cihazdaki açık oturum parola değişince kapanmıyorsa.

---

## 3 · Konum doğrulaması (K2) — para buradan geçiyor

### 3.1 · Doğrula
**Yap:** Ana ekranda **Kafedeyim / Doğrula**.
✅ Tarayıcı izin ister; izin verince "doğrulandı".
🔴 İzin penceresi hiç çıkmıyorsa → HTTPS'te değilsin (0.1).

### 3.2 · Reddet
**Yap:** Başka bir sekmede izni reddet.
✅ Hata gibi değil, açıklama olarak görünür. 🔴 Sayfa bozuluyorsa.

### 3.3 · Uzaktan
**Yap:** 200 m'den uzakta dene (yapamazsan atla, not düş).
✅ Reddedilir. 🔴 Kabul ediyorsa yarıçap çalışmıyor.

---

## 4 · Oyunlar — dokuzu da

**Blok · Blok Kırıcı · Blok 2048 · Renkli Tüpler · Renkli Çizgiler · Düşen ·
Yılan · Bıçak Ustası · Tuğla Kırıcı** (bugünkü Blok Kırıcı eskiden
"Sekme"ydi; eski Blok Kırıcı artık Tuğla Kırıcı.)

| # | Kontrol | 🔴 Hata |
|---|---|---|
| 4.1 | Açılıyor | beyaz ekran |
| 4.2 | Dokunma/kaydırma çalışıyor | girdi işlemiyor |
| 4.3 | Skor artıyor | skor sabit |
| 4.4 | Tur **kaybederek bitiyor** | tur hiç bitmiyor |
| 4.5 | Bitişte "sunucuda doğrulandı" | **"Kayıt doğrulanamadı"** — oyun ve süreyi not et |
| 4.6 | Ses açılıp kapanıyor | — |
| 4.7 | Çık düğmesi çalışıyor | tur bitmeden çıkılamıyor |
| 4.8 | **Akıcı** (Ü275): Blok Kırıcı'da toplar, Tuğla Kırıcı'da top ve duvar, Bıçak'ta kütük, Yılan'da gövde takılmadan akıyor | takılma, donma — **hangi oyun, ne yaparken** yaz |
| 4.9 | **Görseller keskin** (Ü276): oyun kartlarındaki sahneler ve çark/seri kartındaki görseller telefonda bulanık değil, eskisiyle aynı | bulanık ya da değişmiş görsel — hangi kart |

Oyuna özel: **2048** sayılar karoyu doldurmalı · **Renkli Çizgiler**
hızlı kaydırınca çizgi kopmamalı · **Renkli Tüpler** kuraldışı dökme hak
yememeli.
**Arka plan:** oyunu açıp uygulamayı 1 dk arka plana at, dön → oyun sürer
ya da düzgün biter. 🔴 "doğrulanamadı" ile reddediliyorsa.

---

## 5 · Ödül ve bütçe

### 5.1 · İlk kupon — "görünürse kesin" (Ü275)
**Yap:** Konumu doğrulanmış hesapla **skor 500+** yap. Ödül nesnesi
(paket / altın yem / ödüllü blok) çıkarsa **al**.
✅ Paketi alınca tur sonunda kupon **kesin** çıkar ve **bekler** (Ü269).
✅ **Çarktan kazanmış olsan da** oyundan ödül alabilirsin — çark ve oyun
ayrı haklar (günde 1 çark + 1 oyun ödülü).
🔴 Paketi aldın ve kupon çıkmadıysa (ekranda sebep de yoksa); skor 500'ün
altında kupon çıkıyorsa; konumsuz (K1) oturuma kupon çıkıyorsa.

### 5.2 · Paket her turda çıkmaz
**Yap:** 500'ü geçen 10 tur oyna.
✅ Paket turların yaklaşık **üçte birinde** çıkar. Çıkmayan turda kupon da
yok — ekran kazandırmayan bir paket göstermiyor.
✅ Bugünkü oyun ödülünü aldıktan sonra paket hiç çıkmaz (Yılan'da altın
yem sıradan elma gibi görünür).
🔴 Her turda çıkıyorsa, ya da paket çıkıp kupon gelmiyorsa.

### 5.3 · 🔴 Bütçe temposu — "havuz 2 saatte boşalmamalı"
Kafe açılırken bütçenin **%10'u** hazır, kalanı açılıştan kapanışa
doğrusal açılıyor; kapalıyken sıfır.
**Yap:** Bütçeyi alt sınırda tut, ardı ardına kupon kazanmaya çalış, Bütçe
ekranını izle.
✅ Bir noktada ödül çıkmaz; saat ilerleyince yeniden çıkar.
🔴 Açılışta bütçenin tamamı dağıtılabiliyorsa.

### 5.3b · Kafe kapalıyken oyun (Ü274)
✅ Kapalı kafede tur bitince "Kafe şu an kapalı, bu turda ödül çıkmadı"
yazar; puan ve XP yine yazılır.
✅ Blok Kırıcı'da ödüllü blok yalnızca ilk belirdiğinde düşer, her atışta
yeniden düşmez. Oynarken sayfa kaymaz, aşağı çekince yenilenmez.
✅ Seviye atlayınca **tam ekran** kutlama gelir (seri gibi).

### 5.4 · Günlük puan tavanı
✅ Günde **900** puana takılıyorsun ve ekran bunu söylüyor.

### 5.5 · Aynı oyundan azalan getiri
✅ Tek oyundan üst üste kazanmaya çalışınca o oyunun şansı azalıyor.

### 5.6 · Çark
**Yap:** `/cark` → çevir.
✅ Varsayılan **24 saatte bir** (kafe 1–168 saat ayarlıyor). Çıkan ödül de
**bekler**. iPhone'da Loopy'nin arkası saydam (siyah kutu yok).
✅ Kafe **kapalıyken** ya da çark bekleme süresindeyken **ana ekranda çark
kartı hiç yoktur** (Ü275). Misafire çark hiç gösterilmez (Ü274).
🔴 Süre dolmadan ikinci kez çevrilebiliyorsa.

### 5.6b · Ana ekran (Ü275)
✅ Günlük seri tam ekran **günde bir kez** gelir; kapatınca ana ekranda seri
kartı **kalmaz** (seri sayısı Profil'de).
✅ Aşağı kaydırınca üstteki kafe şeridi ve alttaki Oyna/Ödüllerim/Profil
şeridi **çekilir**, yukarı kaydırınca geri gelir. Kaydırma takılmaz.

### 5.7 · Kazıma kartı
✅ Kapalı kupon kazınınca adı görünür. Henüz açılmadıysa **bekleyenlere**
geçer, kaybolmaz.

### 5.8 · Happy hour
✅ 1.10'daki pencerede ödüller happy hour kurallarıyla çıkar; dışında çıkmaz.

### 5.9 · Fırsatlar
✅ `/firsatlar`: 1.12'deki kampanya ve çıkabilecek ödüller görünür. Hiçbir
ödülde "Masada 5 dakika" yazmaz.

---

## 6 · Kupon ve kasa

### 6.1 · Ödüllerim (oyuncu)
✅ Kupon görünür ve **bekler**; ödülün **adı** görünür, **saati görünmez** —
yerine bir bekleme cümlesi (bilerek, Ü97).
✅ Açılınca kullanılabilir olur ve "yeni açıldı" diye kutlanır.

### 6.2 · Kasa girişi
**Yap:** Kayıtlı cihazdan (1.9) `/kasa/giris` → PIN `1234`.
✅ **"Kupon onayı"** ekranı: tarayıcı + bugünün özeti. Başka iş yok.
🔴 Kayıtsız cihazda PIN kabul ediliyorsa.

### 6.3 · Yetki sınırı
**Yap:** Kasiyerle `/kafe/panel`, `/kafe/panel/butce`, `/platform` yaz.
✅ Üçüne de giremez. 🔴 Birine girebiliyorsa.

### 6.4 · Okut
- **Android/Chrome:** müşterinin kupon karekodunu kameraya tut → kupon
  bilgisi gelir.
- **iPhone/Safari:** kamera okumuyor (bilinen eksik) — ekran bunu söyler,
  **6 karakterli** kodu elle gir.
🔴 Ekran boş kamerada donuyorsa; elle giriş alanı yoksa.

### 6.5 · Açılmadan önce
**Yap:** Henüz açılmamış kuponu okut.
✅ Reddedilir ve **ne zaman açılacağını** söyler.

### 6.6 · Onayla
**Yap:** Açılmış kuponu onayla.
✅ "Kullanıldı"; müşterinin ekranında da kapanır; bütçeden düşer.

### 6.7 · 🔴 İkinci kez
**Yap:** Aynı kuponu tekrar okut.
✅ Reddedilir, sebebini söyler. 🔴 **Kabul ediliyorsa kritik** — iki kez
bedava ürün.

### 6.8 · Geri alma (60 saniye)
✅ 60 sn içinde geri alınır, kupon yeniden kullanılabilir olur; 60 sn sonra
alınamaz.

### 6.9 · Reddedilmesi gerekenler — her birinde **sebep** yazmalı
| Dene | ✅ Beklenen |
|---|---|
| Süresi dolmuş | "süresi doldu" |
| Kullanım penceresi dışında | ret + **ne zaman geçerli olduğu** |
| **Başka kafenin kuponu** (A'nınkini B'nin kasasında) | ret — kabul ediliyorsa kiracı izolasyonu delinmiş |
| Uydurma kod | ret |

### 6.10 · Kasa özeti
✅ Onayladığın kupon bugünün sayısına yansır.

---

## 7 · Butik (Moda Butik · `05320000003`)

### 7.1 · Oyun yok
✅ Panelde **Oyunlar** durağı yok. `/kafe/panel/oyunlar` elle yazılınca da
**açılmaz**.

### 7.2 · Çark dilimleri
**Yap:** Çark → dilimler ve yüzdeler.
🔴 Yüzde toplamı tutmuyor ve ekran söylemiyorsa.

### 7.3 · Çark koşulları
Dört tür: **Tutar** ("500 TL ve üzeri") · **Ürün** · **Günlük N kişi** ·
**İlk gelen N**. Tutar 50–100.000 TL, adet en çok 100.
✅ Her koşulun okunur bir cümlesi var (kasiyer müşteriye onu söyler).

### 7.4 · Kasada hak ver
**Yap:** `/kasa` altındaki **"Alışverişe çark hakkı ver →"** (normal
kafede bu bağlantı **yok**).
✅ 600 TL → hak verilir, müşterinin `/cark`ı döner.
✅ **480 TL → verilmez ve eksik tutarı söyler** ("20 TL daha").
✅ 0, eksi, boş, 100.000 TL üstü → kabul edilmez.

### 7.5 · Ürün ve adet koşulları
✅ Ürün koşulunda yalnızca doğru üründe hak verilir.
✅ "Günde 3 kişiye": dördüncüsü "bugünkü adet doldu" ile reddedilir;
ertesi gün (İstanbul gece yarısı) sıfırlanır.

### 7.6 · İki iş karışmasın, yetki
✅ Hak vermek kupon sayacını, kupon onaylamak çark hakkını etkilemez.
✅ Butik kasiyeri `/kafe/panel/cark`a giremez.

### 7.7 · Müşteri akışı
✅ Tezgâh karekodu → **oyun listesi değil** çark ve ödüller. Hak
verilmeden çark dönmez. Kupon kafedekiyle aynı: bekler, kasada bozdurulur.
✅ Bütçe butikte de bağlayıcı: bitince ödül çıkmaz ve ekran sebebini söyler.

---

## 8 · Platform (`05310000001`)

### 8.1 · Giriş ve roller
✅ Başvurular · Kafeler · Karekodlar · Oyuncular · Mesaj · Acil durdurma.
✅ **Destek** (`05310000002`) yalnızca okuyabilir; yönetici ekranlarında
"yetkisiz". ⚠️ Bilinen açık: platform girişinde TOTP yok (yayın öncesi
kapatılacak).

### 8.2 · Başvurular
**Yap:** Bekleyen başvuruyu aç → onayla ya da reddet.
✅ Onaylanan **Kafeler**e geçer ve panele girebilir; reddedilen giremez;
aynı başvuru iki kez onaylanamaz.

### 8.3 · Kafeler
✅ Liste: 6 onaylı işletme (deneme kafeleri Ü271'de silindi) ve kurulum
engelleri kırmızı (konum yok, ödül yok…).
✅ Künye: ayarlar **okunur adlarıyla** (Aktivasyon saati, Kupon
geçerliliği, Ödül üst sınırı…), personel, şubeler.
🔴 Konumu girilmemiş kafe "hazır" görünüyorsa; bir kafenin künyesinde
başka kafenin personeli görünüyorsa.

### 8.4 · Karekodlar — yönlendirme ("301") ve kullanım (Ü266–Ü272)
**Yap:** Karekodlar.
✅ Her kod, gittiği kafe ve **Kullanım**: hiç taşınmamış kod tek satır;
taşınmış kod **Yeni** (şu anki kafede) ve **Eski** (önceki kafelerde) ayrı.
**Yap:** `kafe-b-…` satırı → **yönlendirmeyi değiştir** → hedef listesi.
✅ Liste kısa (6 kafe). Kafe A **"kendi kodu kullanımda — taşınamaz"** diye
kapalı. Masası olmayan kafe "bu kodla açılır" der.
**Yap:** Kafe B'nin kodunu **Yonlendirme Test Hedefi**'ne taşı ("bu kodla
açılır") → telefonda Kafe B'nin karekodunu okut → Yonlendirme Test Hedefi
açılmalı → **geri Kafe B'ye taşı** ("adlı kodu yok, bu kod verilir"). Bu
test kafesi her otomatik test koşusunda sıfırlanıyor; gerçek kafelere
iz kalmıyor. **Boş Test Kafe'yi hedef seçme** (10. bölüm için boş kalmalı).
🔴 Taşıdıktan sonra hâlâ eski kafe açılıyorsa; kullanımda kafe
seçilebiliyorsa; geri alınamıyorsa.
⚠️ Geri taşımayı unutma — yoksa Kafe B'nin karekodu başka kafeye gider.

### 8.5 · Oyuncular — 🔴 hassas ekran
✅ Telefonlar **maskeli**. Tek numarayı açmak gerekçe ister ve denetim
izine yazılır.
🔴 Listede tam numara görünüyorsa; gerekçesiz açılıyorsa.

### 8.6 · Mesaj (ticari ileti)
✅ Kitlede yalnızca **izin vermiş** oyuncular; çıkma cümlesi silinemiyor;
ekran "WhatsApp yok, İYS kapsam dışı" diyor.
**Yap:** Bir oyuncunun iznini `/verilerim`den kapat → kitleden düşmeli.

### 8.7 · Acil durdurma
⚠️ **Bütün kafeleri etkiler** — başka testin ortasında yapma.
✅ Durdurunca kupon açılmaz; geri açınca normale döner.

---

## 9 · Sınır durumları ve izolasyon

| # | Dene | ✅ Beklenen |
|---|---|---|
| 9.1 | Karekodun fotoğrafını başka yerde okut | K1 geçer, **K2 geçmez**, ödül yok |
| 9.2 | İki sekmede aynı anda oyna | skorlar karışmaz |
| 9.3 | Oyun ortasında sayfayı yenile | tur kaybolur ama sistem kırılmaz |
| 9.4 | Kafe B'nin karekodunu okut, sonra A'yı | aktif kafe **A** olur |
| 9.5 | Hesabı sil, 30 gün dolmadan gir | "silinecek" durumunda; vazgeçilebilir |
| 9.6 | Kafe yöneticisiyle `/platform/*` | giremez |
| 9.7 | A'nın yöneticisiyle B'nin verisi (adres elle) | veri gelmez |
| 9.8 | Oyuncu oturumuyla panel adresleri | giremez |
| 9.9 | Çıkış yapıp geri düğmesi | sayfa yeniden açılmaz |

---

## 10 · "Veriler doğru düşüyor mu" — Boş Test Kafe (`05320000077`)

Kafe tamamen boş: masa, ödül, ürün, bütçe yok. Her rakam senin yaptığından
gelir.
1. **Giriş** → panel kurulum uyarıları gösterir (konum yok, ödül yok,
   bütçe yok); bütün sayılar **0**. 🔴 "Hazır" diyorsa.
2. **Kur:** konum → ürün → 1–2 ödül → bütçe → karekod (ilk açılışta kod
   üretilir) → oyunlar.
3. **Oyna:** telefonla bu kafenin karekodunu okut, bir tur oyna (skor 500+).
4. **Kontrol et:** Panel özeti 1 oyun · kupon çıktıysa 1 kupon · bütçede
   rezerve tutar; Rapor bugünü sayıyor; Platform → Kafeler'de sayılar
   güncel.
🔴 Bir rakam oynadığınla uyuşmuyorsa — hangi ekran, beklenen, görünen.

---

## 11 · ⚠️ Bugün test EDİLEMEYECEKLER

Eksik değil, **henüz açılmadı** — hata sanma:

| Ne | Neden |
|---|---|
| Gerçek e-posta (doğrulama kodu) | Resend anahtarı yok (U2) — kod ekranda |
| Gerçek SMS | sağlayıcı seçilmedi, park edildi |
| Ödeme (iyzico) | `iyzi.link/AKvxUA` üründe henüz hiçbir yerde yok (U1) |
| Canlı alan adı | `KAREKOD_TABAN_ADRESI` canlıda doldurulmalı (U3) |
| iPhone'da kamerayla kupon okuma | bilinen eksik — elle 6 karakterli kod çalışıyor |
| WhatsApp | park edildi |
| Platform TOTP | bilinen açık, yayın öncesi |

---

## 12 · Hata bildirirken

1. **Adım** (örn. "6.7")
2. **Ne bekledin, ne oldu**
3. **Ekran görüntüsü** — adres çubuğu görünsün

"Çalışmıyor" tek başına iz sürülemiyor: hangi kafe, hangi oyun, hangi
hesap.
