# 29 — TEST · OYUNCU (A'dan Z'ye)

> **Kim olduğun:** kafeye gelmiş bir müşteri. Elinde **telefon** var.
>
> **Önce oku:** `27-test-listesi.md` §0. Bu akışın yarısı bilgisayardan
> test **edilemez** — konum doğrulaması gerçek bir telefon istiyor.
>
> **Önce kur:** `28-test-kafe-yoneticisi.md` bitmiş olmalı; konumu ve
> ödülü olmayan bir kafede hiçbir şey kazanamazsın.

**Giriş:** `/giris` · **Masa karekodu:** `/m/<kod>` · **Oyunlar:** `/oyunlar`

---

## A · Karekodu okut

### A.1 · Masadaki karekodu telefon kamerasıyla okut

**Ne yaparsın:** masadaki kâğıdı telefonun kamerasına tut.

**Ne görmelisin:** tarayıcı `/m/<kod>` adresini açar ve oyuncu ekranına
düşersin.

🔴 **Hata sayılır:**
- Karekod okunmuyorsa.
- Açılan sayfa "masa bulunamadı" diyorsa — kod ile masa eşleşmiyor.

⚠️ Hem yeni adlı kodlar (`kafe-a-7f3k9x2m`) hem eski 16 haneli kodlar
çalışmalı.

### A.2 · Misafir olarak oyna

**Ne yaparsın:** kayıt olmadan oynamayı seç.

**Ne görmelisin:** oyun listesine girersin; oynayabilirsin.

🔴 **Hata sayılır:** oynamak için zorla kayıt isteniyorsa. Ürünün kuralı
**önce oyna, sonra kaydol**.

### A.3 · Hesap aç

**Ne yaparsın:** telefon numaranı gir, gelen doğrulama kodunu yaz.

**Ne görmelisin:** hesap açılır ve **misafirken kazandıkların hesaba
taşınır**.

🔴 **Hata sayılır:** misafirken toplanan puan kayboluyorsa.

⚠️ Geliştirmede SMS gerçekten gitmiyor; doğrulama kodu `/gelistirme`
sayfasındaki defterde görünür.

---

## B · Konum doğrulaması — 🔴 paranın geçtiği yer

### B.1 · Doğrula

**Ne yaparsın:** oyun sonunda konum izni iste ve **izin ver**.

**Ne görmelisin:** puan yazılır, XP yazılır, ödül kapısı açılır.

🔴 **Hata sayılır:** izin verdiğin hâlde "konumunu doğrula" ekranında
kalıyorsan.

### B.2 · Reddet

**Ne yaparsın:** aynı turu oyna, konum iznini **reddet**.

**Ne görmelisin:** puan **yazılmaz**, kupon **açılmaz**, ekran sebebini
söyler.

🔴 **Hata sayılır:** reddettiğin hâlde puan yazılıyorsa. Bu, kafede
olmayan herkesin ödül kazanabilmesi demektir.

### B.3 · Uzaktan dene

**Ne yaparsın:** kafeden uzakta (ya da kafenin konumunu başka bir yere
alarak) oyna.

**Ne görmelisin:** ödül çıkmaz.

🔴 **Hata sayılır:** uzaktan ödül kazanılabiliyorsa.

⚠️ **HTTP üzerinde bu bölümün tamamı sessizce ölüdür.** Tarayıcı konumu
yalnızca güvenli bağlamda veriyor; `npm run dev:https` şart.

---

## C · Oyunlar — dokuzu da

**Ne yaparsın:** `/oyunlar` → karuseli gez → her oyunu aç.

**Ne görmelisin:** her kartta oyunun kendi ikonu ve sahnesi; "Oyna" ile
oyun açılır.

| # | Oyun | Ne denemelisin |
|---|---|---|
| 1 | **Blok** | Parça yerleştir, tıkanınca bitsin |
| 2 | **Blok Kırıcı** | Topu fırlat, blokları patlat |
| 3 | **Blok 2048** | Kaydır, aynı sayılar birleşsin. Sayılar **karoyu doldurmalı** |
| 4 | **Renkli Tüpler** | Tüpe dokun, ötekine dokun, üstteki renk aksın |
| 5 | **Renkli Çizgiler** | Noktadan başla, parmağını **hızlı** kaydır |
| 6 | **Düşen** | Satır doldur |
| 7 | **Yılan** | Yem topla, duvara çarpma |
| 8 | **Bıçak Ustası** | Dönen kütüğe sapla |
| 9 | **Tuğla Kırıcı** | Paletle topu tut, duvarı indir |

🔴 **Hata sayılır — hepsinde ortak:**
- Oyuna tıkladığında **boş/beyaz ekran** geliyorsa.
- Oyun ekranı telefona sığmıyorsa (yana ya da aşağı taşıyorsa).
- Tur bittiğinde skor **"sunucuda doğrulandı"** demiyorsa.
- Tur **kazanarak** bitiyorsa. Hiçbir oyun kazanarak bitmez; hepsinin
  bir duvarı var.

🔴 **Renkli Çizgiler'e özel:** parmağını hızlı kaydırdığında çizgi geride
takılıyorsa. Aradaki kareler doldurulmalı.

🔴 **Renkli Tüpler'e özel:** kuraldışı bir dökme denediğinde **hak
yenmemeli** — tüp sarsılır, sayı düşmez.

🔴 **Blok 2048'e özel:** her sayının ayrı bir rengi olmalı ve rakam her
karoda okunmalı.

---

## D · Ödül ve kupon

### D.1 · İlk kupon

**Ne yaparsın:** eşiği geçecek kadar iyi bir tur oyna.

**Ne görmelisin:** ödül açılışı, ardından `/oduller` içinde kupon.

🔴 **Hata sayılır:** eşiği geçtiğin hâlde hiç ödül gelmiyorsa **ve**
kafenin bütçesi doluysa.

### D.2 · Ödül garanti değil

**Ne yaparsın:** üst üste birkaç iyi tur oyna.

**Ne görmelisin:** her turda ödül çıkmaz.

🔴 **Hata sayılır:** her turda ödül çıkıyorsa. Bütçe iki saatte boşalır.

### D.3 · Kupon ekranı

**Ne yaparsın:** `/oduller` → bir kupona gir.

**Ne görmelisin:**
- Kuponun karekodu
- **Ne zaman kullanılabileceği** (kullanım penceresi)
- Ne zaman biteceği (geçerlilik süresi)

🔴 **Hata sayılır:** kullanım penceresi ekranda yazmıyorsa. Bilinmeyen
kural, tutulmamış söz demektir — oyuncu kasaya gider, reddedilir ve
suçu kafeye yükler.

### D.4 · Erteleme

**Ne görmelisin:** yüksek değerli ödüller hemen değil, **ertesi gün**
aktifleşir (24 saat).

🔴 **Hata sayılır:** bekleme süresi ekranda hiç görünmüyorsa.

---

## E · Kuponu kasada kullan

**Ne yaparsın:** kupon ekranındaki karekodu kasiyere okut.
*(Kasiyer tarafı: `30-test-barista-kasiyer.md`)*

**Ne görmelisin:** kupon "kullanıldı" olur ve bir daha kullanılamaz.

🔴 **Hata sayılır:**
- Aynı kupon iki kez kullanılabiliyorsa.
- Kullanım penceresi dışında kabul ediliyorsa.
- Süresi dolmuş kupon kabul ediliyorsa.

⚠️ 60 saniyelik geri alma penceresi var: kasiyer yanlışlıkla
onayladıysa geri alabilmeli.

---

## F · Çark, görev, seri, liderlik

| Ekran | Ne denemelisin | 🔴 Hata |
|---|---|---|
| `/cark` | Çark hakkını kullan | Hakkın yokken çevirebiliyorsan |
| `/oyunlar` | Günün oyunu ×2 veriyor mu | Günün oyunu her gün aynıysa |
| Günlük görev | Görevi tamamla | Görev tamamlanamaz bir hedef veriyorsa |
| Günlük seri | Arka arkaya günler | Seri bir gün atlayınca sıfırlanmıyorsa |
| `/liderlik` | Kafe bazlı sıralama | Başka kafenin oyuncuları listedeyse |
| `/firsatlar` | Kampanyaları gör | Kafenin kampanyası görünmüyorsa |
| `/profil` | Seviye, XP, rozet | Kazandığın rozet görünmüyorsa |

---

## G · Verilerim ve çıkış

**Ne yaparsın:** `/verilerim`.

**Ne görmelisin:** hakkındaki veriler, ticari ileti izni (açıp
kapatabilmelisin), hesap silme.

🔴 **Hata sayılır:**
- Ticari ileti iznini kapattığın hâlde kampanya mesajı geliyorsa.
- Hesabını sildiğinde verilerin kalıyorsa.

⚠️ **Bilinen eksik:** ad-soyad düzeltme henüz üründe yok; aydınlatma
metni "e-posta ile" diyor. Yayından önce kapatılacak madde.

---

## Bittiğinde elinde ne olmalı

- [ ] Karekodla girilmiş bir oturum
- [ ] Misafirden hesaba taşınmış puan
- [ ] Konum doğrulanmış bir tur ve reddedilmiş bir tur
- [ ] Dokuz oyunun dokuzu da açılmış ve skoru sunucuda doğrulanmış
- [ ] En az bir kupon kazanılmış ve kasada bozdurulmuş
