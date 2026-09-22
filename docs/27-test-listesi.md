# 27 — UÇTAN UCA TEST LİSTESİ

> **Bu liste elle takip edilmek için yazıldı.** Her adımda *ne yapacağın*,
> *ne görmen gerektiği* ve *hangi durumun hata olduğu* ayrı ayrı yazılı.
>
> Sıra önemli: sonraki bölümler öncekinin bıraktığı duruma dayanıyor.

**Son güncelleme:** 2026-09-22

---

## 👥 ROLE GÖRE AYRI BELGELER

Bu dosya **bütün akışı tek sırada** anlatıyor. Belirli bir kişinin
gözünden A'dan Z'ye yürümek istersen aşağıdakiler ayrı ayrı yazıldı —
her adımda *ne yaparsın · ne görmelisin · ne zaman hata sayılır*:

| Belge | Kim | Nerede test edilir |
|---|---|---|
| [`28`](28-test-kafe-yoneticisi.md) | **Kafe yöneticisi** — başvuru, kurulum, günlük kullanım | Bilgisayar + telefon |
| [`29`](29-test-oyuncu.md) | **Oyuncu** — karekod, konum, dokuz oyun, kupon | 🔴 Gerçek telefon şart |
| [`30`](30-test-barista-kasiyer.md) | **Barista / kasiyer** — kupon onayı | Android **ve** iPhone |
| [`31`](31-test-butik-isletme.md) | **Butik işletme** — oyun yok, çark var | Bilgisayar |
| [`32`](32-test-butik-kasiyer.md) | **Butik kasiyeri** — iki işi var | Tablet/telefon |
| [`33`](33-test-platform.md) | **Platform yöneticisi** — izolasyon ve gizlilik | Bilgisayar |

⚠️ **Sıra:** 28 → 29 → 30 zincirleme ilerliyor; kurulmamış bir kafede
oyuncu akışı test edilemez. Butik zinciri (31 → 32) bağımsız. 33 her
zaman koşulabilir.

⚠️ Aşağıdaki **§0 Hazırlık** hepsi için ortak — hangisiyle
başlayacaksan önce onu yap.

---

## 🔴 0 · Hazırlık — bunlar olmadan yarısı test edilemez

### 0.1 · HTTPS şart

```bash
npm run dev:https
```

⚠️ **Düz `npm run dev` ile konum doğrulaması (K2) HİÇ çalışmaz.** Tarayıcı
`navigator.geolocation`u yalnızca güvenli bağlamda veriyor. K2 olmadan:

- puan yazılmaz
- XP yazılmaz
- kupon açılmaz

Yani ürünün para tarafının tamamı sessizce ölü kalır ve bu bir hata gibi
**görünmez** — ekran "konumunu doğrula" der, sen de doğrulayamazsın.

Telefon sertifika uyarısı verecek; "yine de devam et" de. Kendi imzalı
sertifika, beklenen durum.

### 0.2 · Telefonun ve bilgisayarın aynı ağda olmalı

Adres: `https://<bilgisayarın-LAN-ip>:3000`

IP'yi bulmak için `ipconfig` → "IPv4 Address". ⚠️ **Değişebiliyor** —
test başında bir kez daha bak.

### 0.3 · Kafenin konumu senin konumun olmalı

Tohumdaki Kafe A İstanbul'da (41.0369, 28.9838). Başka bir yerdeysen K2
hiçbir zaman geçmez.

Test süresince kafenin konumunu kendi konumuna çek: **Panel → Konum**.
⚠️ Test bitince geri al, yoksa sonraki testler yanlış yerden geçer.

### 0.4 · Hesaplar

| Kim | Nasıl girer | Bilgi |
|---|---|---|
| Oyuncu (demo) | `/giris` | `05320000099` · `Deneme1234` |
| Kafe yöneticisi | `/kafe/giris` | `05320000001` · kod ekranda |
| Kasiyer | `/kasa/giris` | **PIN `1234`** |
| Platform | `/platform/giris` | tohumdaki yönetici |

⚠️ Geliştirmede doğrulama kodu **ekranda** görünüyor (sahte sağlayıcı).
Canlıda e-posta/SMS ile gidecek.

---

## 1 · Kafe tarafı — panel

### 1.1 · Yöneticiyle gir
`/kafe/giris` → telefon → kod → panel.

✅ **Beklenen:** panel açılıyor, kafenin adı görünüyor.
🔴 **Hata:** onaysız kafe giriş yapabiliyorsa (G5 deliniyor).

### 1.2 · Karekod
Panel → **Karekod**.

✅ Karekod görünüyor, ortasında **mutlu Loopy** var, altında kod yazıyor.
✅ "Yazdır" sayfası açılıyor ve ekrandakiyle **aynı** kodu gösteriyor.
🔴 Ekrandaki kod ile yazdırılan kod farklıysa — kafe yanlış etiketi asar.

### 1.3 · Konum
Panel → **Konum** → kendi konumunu işaretle, yarıçapı ayarla.

✅ Kaydedildi diyor.
⚠️ Yarıçap çok darsa (örn. 20 m) K2 GPS sapması yüzünden geçmez. Test için
**200 m** rahat.

### 1.4 · Bütçe
Panel → **Bütçe** → günlük taahhüt gir.

✅ Taban 1.500 TL'nin altı reddediliyor.
✅ Girilen tutar "bugün dağıtılabilir" olarak görünüyor.

### 1.5 · Ödüller ve kupon zamanlaması
Panel → **Ödüller**.

✅ Ödül ekleyebiliyorsun (ad, maliyet, kanıt seviyesi).
✅ **Erteleme eşiği** ayarlanıyor (hangi tutarın üstü ertelensin).
✅ **Erteleme saati** ayarlanıyor (kaç saat sonra açılsın).

✅ **Kupon kaç gün geçerli** ayarlanıyor (Ü250, 1–30 gün, varsayılan 7).

⚠️ Süre **açılıştan** sayılıyor: 12 saat ertelenen 7 günlük kupon 7,5 gün
sonra ölüyor. Üst sınır 30 ve sebebi bütçe — kullanılmamış kupon kafenin
parasını rezerve tutuyor, ancak süresi dolunca iade ediliyor.

### 1.6 · Oyunlar
Panel → **Oyunlar** → bir oyunu kapat.

✅ Kapatılan oyun oyuncunun listesinde **görünmüyor**.
✅ Son oyun kapatılamıyor (en az bir oyun açık kalmalı).
🔴 Kapalı oyun "bugünün oyunu" olarak çıkıyorsa.

### 1.7 · Personel ve cihaz
Panel → **Personel** → kasiyer ekle, cihaz kaydet.

⚠️ **Kasa girişi yalnızca kayıtlı cihazda çalışıyor.** Kasiyerin
telefonunu/tabletini burada kaydetmeden `/kasa/giris` PIN'i kabul etmez.

---

## 2 · Karekod → oyuncu akışı

### 2.1 · Karekodu okut (kayıtsız / misafir)
Telefonun kamerasıyla karekodu okut. Tarayıcıda **gizli sekme** kullan ki
oturum karışmasın.

✅ Kafenin adı görünüyor.
✅ Çark veya oyun listesi açılıyor.
🔴 "Kafe dışındasın" diyorsa — masa bileti çerezi düşmemiş.

### 2.2 · Misafir oynasın
Bir oyun oyna, bitir.

✅ Skor **"sunucuda doğrulandı"** diyor.
✅ "Kazanmak için hesap aç" benzeri bir yönlendirme var.
🔴 Misafire doğrudan kupon veriliyorsa.

### 2.3 · Hesap aç
Kayıt akışını tamamla.

✅ Misafirken oynadığı tur hesabına geçiyor.
✅ Doğrulama kodu ekranda görünüyor (geliştirmede).

---

## 3 · Konum doğrulaması (K2) — para buradan geçiyor

### 3.1 · Doğrula
Ana ekranda **"Doğrula"** / **"Kafedeyim"**.

✅ Tarayıcı konum izni soruyor.
✅ İzin verince "doğrulandı" oluyor.
🔴 İzin penceresi **hiç çıkmıyorsa** → HTTPS'te değilsin (0.1).

### 3.2 · Reddet
İzni **reddet**.

✅ Ekran bunu bir hata gibi göstermiyor, "kazanamazsın" diye açıklıyor.
🔴 Sayfa kırılıyorsa.

### 3.3 · Uzaktan dene
Kafenin konumunu uzak bir noktaya al, tekrar doğrula.

✅ Reddediliyor.
🔴 Kabul ediyorsa — yarıçap kontrolü çalışmıyor.

---

## 4 · Oyunlar — yedisi de

Her oyun için ayrı ayrı: **Blok · Düşen · Sekme · Yılan · Bıçak · Blok Kırıcı**

| # | Kontrol | 🔴 Hata sayılır |
|---|---|---|
| 4.1 | Oyun açılıyor, boş ekran gelmiyor | beyaz ekran |
| 4.2 | Dokunma/kaydırma çalışıyor | girdi işlemiyor |
| 4.3 | Skor artıyor | skor sabit |
| 4.4 | Tur **kaybederek bitiyor** | tur hiç bitmiyor |
| 4.5 | Bitişte "sunucuda doğrulandı" | "Kayıt doğrulanamadı" |
| 4.6 | Ses açılıp kapanıyor | — |
| 4.7 | Çık düğmesi çalışıyor | tur bitmeden çıkılamıyor |

⚠️ **4.5 en kritik satır.** "Kayıt doğrulanamadı" görürsen hangi oyunda
ve kaç saniye oynadığını not et — sunucu ile istemcinin hesabı ayrışıyor
demektir.

⚠️ Oyunu açıp **uygulamayı arka plana at**, 1 dakika bekle, geri dön.
✅ Oyun devam ediyor ya da düzgün bitiyor.
🔴 Tur "doğrulanamadı" ile reddediliyorsa.

---

## 5 · Ödül ve bütçe — algoritma burada sınanıyor

### 5.1 · İlk kupon
Eşiği geçecek kadar iyi bir tur oyna (skor 500+).

✅ Oyun içinde bir **ödül nesnesi** beliriyor (paket/altın yem/hedef).
✅ Tur bitince kupon çıkıyor.
🔴 Eşiğin **altında** kupon çıkıyorsa.

### 5.2 · Ödül garanti değil
Eşiği geçen 10 tur oyna, kaçında kupon çıktığını say.

✅ Hepsinde çıkmıyor — şans var (E2).
🔴 Her turda çıkıyorsa → bütçe saatler içinde biter.
🔴 Hiç çıkmıyorsa → oyuncu boş dönüyor.

### 5.3 · 🔴 Bütçe temposu — "havuz 2 saatte boşalmamalı"
Bu ürünün en kritik ekonomik kuralı. Mekanizma **var** (Ü87/Ü90):

- Kafe açılırken günlük bütçenin **%10'u** hazır (`ILK_PAY`)
- Kalanı açılıştan kapanışa **doğrusal** açılıyor
- Oran **birikimli**: sabah kimse gelmediyse o pay kaybolmuyor
- Kafe kapalıyken **sıfır** (+ kapanışa 30 dk pay)

**Nasıl test edilir:**

1. Bütçeyi düşük tut (örn. 1.500 TL) ki sınıra çabuk gelinsin.
2. Panel → Bütçe'de "şu an dağıtılabilir" tutarına bak.
3. Ardı ardına kupon kazanmaya çalış.
4. ✅ Belli bir noktada **"bugünlük ödül kalmadı"** benzeri bir sonuç gelmeli.
5. ✅ Panel → Bütçe'de kullanılan tutar artmış olmalı.
6. Saat ilerledikçe (ya da açılış saatini geri alarak) **yeniden** ödül çıkmalı.

🔴 **Hata sayılır:** açılışta bütçenin tamamı dağıtılabiliyorsa — tempo
çalışmıyor demektir.

### 5.4 · Günlük tavan
Aynı gün çok sayıda tur oyna.

✅ Günlük puan tavanına (900) takılıyorsun ve ekran bunu söylüyor.

### 5.5 · Aynı oyundan azalan getiri
Tek bir oyundan üst üste kazanmaya çalış.

✅ O oyundan gelen ödül şansı azalıyor.

---

## 6 · Kupon ve kasa

### 6.1 · Kupon listesi
**Ödüllerim**.

✅ Kazanılan kupon görünüyor.
✅ Ertelenmişse **açılma saati** yazıyor ve kullanılamıyor.
✅ Açılınca kullanılabilir oluyor.

### 6.2 · Kasada kullan
Kasiyerin cihazından `/kasa/giris` → PIN `1234` → tarayıcı.

✅ Oyuncunun kupon QR'ını okutunca kupon **kasada** görünüyor.
✅ Ödülün adı ve tutarı **sunucudan** geliyor (QR'da değil).
✅ Onayla → "kullanıldı".
🔴 Kayıtsız cihazdan PIN kabul ediliyorsa.

### 6.3 · 6 haneli yedek kod
QR okutmak yerine kodu elle gir.

✅ Aynı sonuç. (iOS Safari'de kamera API'si yok — bu yol **tek yol**.)

### 6.4 · Geri alma
Onayladıktan sonra **60 saniye** içinde geri al.

✅ Kupon tekrar kullanılabilir oluyor, bütçeye iade ediliyor.
✅ 60 saniye sonra geri alınamıyor.

### 6.5 · İkinci kez kullanma
Aynı kuponu tekrar okut.

🔴 **Kabul ediliyorsa kritik hata** — tek kullanımlık kupon iki kez ödeniyor.

### 6.6 · Başka kafenin kuponu
Kafe A'da kazanılan kuponu Kafe B'nin kasasında okut.

✅ Reddediliyor.
🔴 Kabul ediliyorsa kiracı izolasyonu delinmiş (G12).

---

## 7 · Sınır durumları

| # | Dene | ✅ Beklenen |
|---|---|---|
| 7.1 | Süresi dolmuş kupon okut | reddediliyor |
| 7.2 | Karekodun fotoğrafını başka şehirde okut | K1 geçer, **K2 geçmez**, ödül çıkmaz |
| 7.3 | Aynı anda iki sekmede oyna | ikisi de bağımsız, skor karışmıyor |
| 7.4 | Oyun ortasında sayfayı yenile | tur kaybediliyor ama sistem kırılmıyor |
| 7.5 | Çarkı günde iki kez çevir | ikincisi reddediliyor |
| 7.6 | Kafe B'nin karekodunu okut, sonra A'yı | aktif kafe **A** oluyor |
| 7.7 | Hesabı sil, 30 gün beklemeden gir | hesap "silinecek" durumunda |

---

## 8 · Platform tarafı

`/platform/giris`

✅ Kafe başvurularını görüyor, onaylıyor/reddediyor.
✅ Acil durdurma anahtarı çalışıyor.
✅ Kafelerin raporlarını görüyor.
🔴 Bir kafenin yöneticisi başka kafenin verisini görüyorsa.

---

## 9 · ⚠️ Bugün TEST EDİLEMEYECEKLER

Bunlar eksik değil, **henüz açılmadı** — test ederken hata sanma:

| Ne | Neden |
|---|---|
| Gerçek SMS gönderimi | sağlayıcı seçilmedi (C1); kod ekranda görünüyor |
| Gerçek e-posta gönderimi | Resend hesabı/anahtarı yok; kod ekranda görünüyor |
| Ödeme | `iyzi.link` ile elle alınacak, üründe entegrasyon yok |
| Canlı alan adı | `looplybusiness.com` yayında değil; basılı karekodlar bugün çalışmaz |
| WhatsApp | park edildi (C bloğu) |

---

## 10 · Bulduğun hatayı nasıl bildir

Her hata için üç şey yeter:

1. **Hangi adım** (örn. 5.3 · 4. madde)
2. **Ne bekledin, ne oldu**
3. **Ekran görüntüsü** + varsa telefonun tarayıcı konsolu

⚠️ "Çalışmıyor" tek başına iz sürülemiyor. Hangi kafede, hangi oyunda,
hangi hesapla olduğunu yaz.
