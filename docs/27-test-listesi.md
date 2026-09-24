# 27 — UÇTAN UCA TEST LİSTESİ (eksiksiz)

> **Elle, sırayla uygulanmak için.** Her adımda **Yap** (ne yapacağın),
> **✅** (ne görmen gerektiği) ve **🔴** (hangi durumun hata olduğu) ayrı.
> Sonraki bölümler öncekinin bıraktığı duruma dayanıyor.
>
> Rol rol ayrıntı: `28` kafe yöneticisi · `29` oyuncu · `30` kasiyer ·
> `31` butik işletme · `32` butik kasiyeri · `33` platform. Bu liste
> hepsini **tek sırada** topluyor.

**Son güncelleme:** 2026-09-24 · Ü277'ye kadar olan her değişiklik içinde.

📍 **Şu an buradasın: 1.3** — 1. bölüm **🔗 Etki** yöntemiyle yeniden (Ü277).

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

### 0.4 · ⚠️ Otomatik testler ve senin verin
Otomatik test takımı seninle **aynı veritabanını** kullanıyor ve Kafe A'nın
konumunu, yarıçapını, oyun anahtarlarını, bütçesini ve happy hour
pencerelerini değiştiriyor. 24 Eylül 04:37'deki koşuda Kafe A'da kapalı
oyunlar vardı (senin 1.8'den olmalı); koşu onları geri açtı ve kaydını sildi.
**Sen test ederken takımı çalıştırmıyorum**; yalnızca
tip denetimi ve lint.

---

## 1 · Kafe paneli — kurulum (Kafe A · bilgisayar)

> **Ü277 · yöntem:** Düğmenin çalışması yetmiyor; panelde yapılan her
> şeyin **gerçekten işlediği** sınanıyor. Her adımda **🔗 Etki** satırı
> var: oyuncunun telefonunda neyin değişmesi gerektiği ve benim
> veritabanında neye bakacağım. Adımı bitirince yaz — kaydı ve etkisini
> kontrol edip sonucu söylerim.

### 1.1 · Giriş
**Yap:** `/kafe/giris` → **Yetkili cep telefonu** kutusuna `05320000001` → ekrandaki 6 haneli kod.
✅ Panel açılır, üstte **Kafe A** yazar.
🔴 Onaysız bir işletme girebiliyorsa.

### 1.2 · Menü
✅ Günlük: Panel · Ödüller · Rapor · Bütçe (geniş ekranda + Kampanyalar,
Çark). Kurulum: Konum · Ürünler · Karekod · Oyunlar · Personel · Happy
Hour · Şubeler.
🔴 Bir durak tıklanınca açılmıyorsa.

### 1.3 · Konum — 🔴 bunsuz kimse ödül kazanamaz (Ü274 · Ü278)
İki yol var; biri yeter.

**Yap (telefon, kafenin içinde):** Konum → **Konumu güncelle** (izin ver).
✅ Kayıt "±X m" doğruluğunu yazar (telefonda genelde ±5–20 m).

**Yap (bilgisayar):** Google Haritalar'da kafenin binasının üstüne **sağ
tıkla** → en üstteki sayılara tıkla (kopyalanır) → Konum sayfasındaki
**Google Haritalar'dan koordinat** alanına yapıştır → **Haritada gör ↗**
ile noktayı kontrol et → **Bu koordinatı kaydet**.
✅ Yapıştırınca enlem/boylam ve "Haritada gör" çıkar; düğme ancak geçerli
koordinatta açılır.
✅ Reddedilir ve sebebini söyler: kısa link (`maps.app.goo.gl`) · "41.04,
28.98" gibi kaba koordinat · ters sıra ("28.98380, 41.03690") · Türkiye
dışı.
✅ Bilgisayarın kendi okuması ±100 m'den kötüyse (ör. "±5 km") kaydedilmez;
"Yine de kaydet" düğmesi **yok**, bu alana yönlendirir. Bilgisayarda GPS
yok; konum Wi-Fi'den ya da internet adresinden tahmin ediliyor.

Sonra: Yarıçap **200** → **Yarıçapı kaydet**. Kayıtlı konumun yanındaki
**Haritada gör ↗** kafenin binasını göstermeli.
🔗 **Etki:** Oyuncu kafede "Konumumu doğrula" deyince **"Doğrulandı · X m"**;
200 m dışında reddedilir (bölüm 3). Ben: kafenin koordinatı, yarıçapı ve
denetim izinde hangi yoldan girildiği (`konum_elle_girildi` /
`konum_isaretlendi`).
🔴 İzin reddedilince sayfa bozuluyorsa; ters ya da kaba koordinat
kaydedilebiliyorsa; "Haritada gör" başka bir yeri gösteriyorsa.

### 1.4 · Ürünler
**Yap:** Ürünler → bir ürün ve fiyatı ekle (ör. "Filtre Kahve", 60 TL).
✅ Listeye düşer.
🔗 **Etki:** Ürün, ödül formunda **fiyatıyla** listelenir (1.5). Ben: ürün
ve fiyatı kayıtta mı.

### 1.5 · Ödüller — değer ürünün fiyatından (Ü268 · Ü269 · Ü277)
**Yap:** Ödüller → **Yeni ödül**, üç tipi sırayla dene:
- **Ürün:** ürünü seç → fiyat **sorulmaz**; "Bu ödül 60 TL değerinde —
  ürünün fiyatı" yazar.
- **Yüzde:** ürünü seç, oranı yaz (20) → **yalnızca oran** sorulur;
  "Filtre Kahve 60 TL × %20 = 12 TL indirim" yazar.
- **Tutar:** TL yaz (ör. 30) → "Bu ödül 30 TL indirim".

✅ Ürün kutusunda her ürün fiyatıyla yazar ("Filtre Kahve — 60 TL").
✅ Alt sınır yok: 12 TL'lik yüzde ya da 15 TL'lik ürün eklenebilir. Üst
sınırı aşan ödülde kırmızı uyarı çıkar ve **Ödülü ekle** kapanır.
✅ Listede yüzde ödülü "%20 = 12 TL" ve altında "Filtre Kahve · 60 TL".
✅ Eski ödüller de kurala uydu (Ü278, göç 0053): "testte yüzde 10 indirim"
"%10 = 5 TL", "ize amreicano yüzde 10" "%10 = 27,9 TL"; "Ice Americano" 120 TL
(yayında değil).
✅ Hiçbir ödülde **"Masada 5 dakika"** yazmıyor — her ödül yalnızca konum
doğrulaması ister.
✅ **Açılma ve geçerlilik:** Aktivasyon saati (1–48) · Kupon kaç gün
geçerli (1–30) · Ödül üst sınırı (en az 50). "Gecikmeli açılma eşiği"
alanı **yok**; üstteki kart **"Açılma süresi: 12 saat"**.
✅ **Şans çarkı** kartı boş değil: çarktaki ödüller ve her birinin çıkma
ihtimali (%) yazar.
🔗 **Etki:** Yeni ödül oyuncunun **çarkında** dilim olur ve oyunun ödül
paketinden çıkabilir. Kazanılan kupon **aktivasyon saati** kadar sonra
açılır (Ödüllerim'de "bekliyor"). Kasada ürüne bağlı yüzde kuponunda
kasiyere tutar **sorulmaz**, indirim ödülün değeridir (6.6). Ben: ödülün
kayıtlı değeri (ürün = fiyat, yüzde = fiyat × oran) ve çark dilimleri.
🔴 Ürün seçince yine fiyat soruyorsa; yüzde "en fazla indirim" soruyorsa;
TL karşılığı yanlışsa; tavanı aşan ödül kaydedilebiliyorsa.

### 1.6 · Bütçe
**Yap:** Bütçe → **Bu dönemin bütçesi (TL)**. Önce alt sınırın altında bir
tutar dene, sonra geçerli bir tutar kaydet.
✅ Alt sınırın altı reddedilir — alt sınır günde 1.500 TL × dönemin gün
sayısı (tam haftada 10.500 TL); kutunun altındaki ipucu tam rakamı yazar.
✅ **Şu an dağıtılabilir** dolu. Bütçe güne yayılır; sabah erken ya da gece
yarısından hemen sonra küçük görünmesi normal.
✅ **Açılış / Kapanış** burada (0.3).
✅ **Yoğun saatlerin ve bugünkü dağıtım** (Ü281): açık saatlerin grafiği,
en yoğun üç saat vurgulu ("en yoğun 16:00–19:00 · günün kalabalığının
%X'i"), bu saate kadar açılan / dağıtılan, bugün 500'ü geçen tur ve
**şu an paket şansı**. Az veride "öğreniliyor" der ve bütçe düz açılır.
✅ "500'ü geçen tur" kutusundaki **bugün beklenen ~N**, üstteki sayıdan hiç
küçük olmaz (bugün kalabalıksa beklenen de artar).
🔗 **Etki:** Bütçe biterse oyunda ödül paketi hiç çıkmaz, çark ödül
vermez (5.3); kafe kapalıyken de öyle. Ben: dönemin tutarı kayıtta mı.

### 1.7 · Karekod (Ü270)
**Yap:** Karekod → **Yazdır**.
✅ Ortada mutlu Loopy, altında `kafe-a-y85kuahv`. Yazdırma sayfası aynı kodu
gösterir.
✅ Paneli `localhost` ile açsan bile karekod **192.168.1.175** adresini
taşır.
🔗 **Etki:** Telefonla okutunca Kafe A açılır (2.1).
🔴 Ekrandaki kod ile yazdırılan farklıysa.

### 1.8 · Oyunlar
**Yap:** Oyunlar → bir oyunun anahtarını kapat. Hangisi olduğunu bana yaz.
✅ Hepsini kapatmaya çalışınca: "En az bir oyun açık kalmalı…"
🔗 **Etki:** Kapattığın oyun oyuncunun listesinde **yok**, adres çubuğuna
yazılsa da açılmaz (2.3). **Sonra tekrar aç** — 4. bölümde dokuzu da
lazım. Ben: oyun kafede kapalı mı, açınca geri geldi mi.
🔴 Kapalı oyun "Bugünün oyunu" olarak çıkıyorsa.

### 1.9 · Personel ve kasa (Ü285)
**Yap:** Personel → kasiyer ekle (**Adı** + 4 haneli **PIN**).
✅ Cihaz kaydı **yok**. Sağda **Kasa girişi**: kasiyerlere verilecek adres
(`…:3001/kasa`), üç adım ve kafenin yarıçapı; üstteki kartta "Kasa girişi ·
150 m". Konum işaretli değilse kırmızı uyarı ("hiçbir kasiyer giremez").
🔗 **Etki:** Kasiyer kafenin içinden, herhangi bir telefondan girer (6.2).
Ben: kasiyer kayıtta mı.

### 1.10 · Happy Hour (Ü277)
**Yap:** Happy Hour sayfasını aç. Sonra **Haftalık program** → bir günün
satırına saat, süre ve havuz yaz → Kaydet. Bugünün satırında mavi
**"bugün"** etiketi var (Ü278).
✅ **Bugünün pencereleri** kartında bugünkü programın penceresi hiçbir
ekranı açmadan duruyor: saati gelmediyse "sırada", geldiyse "açık".
(24 Eylül: Perşembe 04:00 programından 04:00–07:00 kendiliğinden açıldı.)
✅ Kayıt mesajı ne olacağını söyler: "Kaydedildi. Her Perşembe 14:00'te
happy hour kendiliğinden başlar ve 3 saat sürer — senin bir şey yapman
gerekmez …". Bugünün satırıysa sonuna bugünü ekler: "Bugün 14:00'te
başlayacak" · "şu an açık" · bugünkü sürüyor ya da yapıldıysa "yeni saat
gelecek haftadan geçerli".
✅ Kafenin son kaydı geçerli (Ü279): bugünün satırına yazılan saat **bugün
de** açılır — bugünkü happy hour yapılmışsa mesaj "Bugün ikinci happy hour
… başlayacak / şu an açık" der. Açılmazsa nedenini söyler: saati geçti ·
süren happy hour ile çakışıyor · günde en fazla 2 happy hour.
🔗 **Etki:** Pencere açıkken bugünkü oyun ödülünü **almış** oyuncu
havuzdan **ikinci** bir ödül kazanabilir (5.8). Kafenin elle kapattığı
pencere o gün yeniden açılmaz. Ben: pencere kayıtta mı, ikinci ödül
havuzdan mı düştü.
🔴 Program saati geldiği hâlde pencere yoksa; bugünün satırına yazılan
saat bugün açılmıyor ve nedenini söylemiyorsa; aynı gün 2'den fazla
pencere varsa; pencere dışında happy hour ödülü çıkıyorsa.

### 1.11 · Çark
**Yap:** Çark → dilimleri, yüzdeleri ve **çark üst sınırını** gör.
✅ Ödüller sayfasındaki **Şans çarkı** kartı aynı dilimleri aynı
yüzdelerle gösterir.
🔗 **Etki:** Oyuncunun çarkında aynı dilimler var (5.6). Ben: çekilişin
kullandığı tablo ile ekrandaki yüzdeler aynı mı.
🔴 Günlük adedi dolmuş ödül çarkta görünmeye devam ediyorsa.

### 1.12 · Kampanyalar
**Yap:** Kampanyalar → bir kampanya oluştur, yayınla.
🔗 **Etki:** Oyuncunun **/firsatlar** ekranında görünür (5.9). Ben:
kampanya yayında mı.

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

### 3.4 · Masa oturumu dolmuyor, konum takip ediliyor (Ü279)
**Yap:** Karekodu okut, konumu doğrula, sonra uygulamayı açık bırakıp
kafede dolaş; bir süre sonra oyun başlat.
✅ Karekod **bir kez**: 3 saat sonra "Masa oturumun doldu" **çıkmaz**,
oturum gece yarısına kadar sürer.
✅ Uygulama açıkken konum birkaç dakikada bir sessizce yenilenir (izin
verdiysen); oyun ve çark başlamadan önce de. Şerit "Doğrulandı · X m"
kalır.
✅ Kafeden çıkınca (yarıçap dışı) şerit "Kafeden X m uzaktasın" der ve
oyun **kazandırmaz**; geri gelince kendiliğinden düzelir.
✅ Uygulamayı 15 dakikadan uzun kapalı tutup açınca şerit "konumunu
doğrula" der (uzaktasın değil) ve birkaç saniyede yenilenir.
🔗 **Etki:** Ben: oturumun bitişi, son konum okumasının zamanı ve mesafesi.
🔴 Kafedeyken "oturum doldu" / "karekodu tekrar okut" çıkıyorsa; kafeden
çıkmışken oyun kazandırıyorsa.

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
| 4.10 | **Blok Kırıcı'da top bloğun içinden geçmiyor** (Ü280): üçgen ve duvar dibindeki bloklarda da sekiyor | top bloğun içine girip karşıya geçiyorsa — hangi blok, hangi açı |

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
✅ Paketi **alamadan** tur biterse kupon çıkmaz ve sonuç ekranı bunu
**söylemez** (ürün sahibinin kararı); günün oyun ödülü hakkı yanmaz,
sonraki turlarda paket yeniden çıkabilir.
✅ **Çarktan kazanmış olsan da** oyundan ödül alabilirsin — çark ve oyun
ayrı haklar (günde 1 çark + 1 oyun ödülü).
🔴 Paketi aldın ve kupon çıkmadıysa (ekranda sebep de yoksa); skor 500'ün
altında kupon çıkıyorsa; konumsuz (K1) oturuma kupon çıkıyorsa.

### 5.2 · Paket her turda çıkmaz
**Yap:** 500'ü geçen 10 tur oyna.
✅ Paketin sıklığı **bütçeye ve kalabalığa** bağlı (Ü281): bol bütçe ve tenha
kafede sık (en çok %90), dar bütçe ve kalabalıkta seyrek. O anki değer
Bütçe → **Şu an paket şansı**. Çıkmayan turda kupon da yok — ekran
kazandırmayan bir paket göstermiyor.
✅ Bugünkü oyun ödülünü aldıktan sonra paket hiç çıkmaz (Yılan'da altın
yem sıradan elma gibi görünür).
🔴 Şans %90'ın üstündeymiş gibi her turda çıkıyorsa; paket alındığı hâlde
kupon gelmiyorsa.

### 5.3 · 🔴 Bütçe temposu — "havuz 2 saatte boşalmamalı"
Kafe açılırken bütçenin **%10'u** hazır, kalanı **kafenin yoğunluk
profiline göre** açılıyor (Ü281): akşam yoğun kafede para akşama kalıyor.
Profil yoksa düz çizgi. Kapalıyken sıfır.
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
✅ Kazanınca sonuç kartı bunu söyler (Ü278): bekleme cümlesi + "Kuponun
hesabında — Ödüllerim ekranında 'Yakında açılıyor' altında". Kupon
Ödüllerim'de **Yakında açılıyor** bölümündedir, "Kasada gösterebilirsin"de
değil. 🔴 "Kasada gösterebilirsin" derse.
✅ Kafe **kapalıyken** ya da çark bekleme süresindeyken **ana ekranda çark
kartı hiç yoktur** (Ü275). Misafire çark hiç gösterilmez (Ü274).
🔴 Süre dolmadan ikinci kez çevrilebiliyorsa.

### 5.6b · Ana ekran (Ü275)
✅ Günlük seri tam ekran **günde bir kez** gelir; kapatınca ana ekranda seri
kartı **kalmaz** (seri sayısı Profil'de).
✅ Günün ilk oyunundan dönünce seri bir artar ama sahne **ikinci kez
açılmaz** (Ü278 — önce açılıyordu). Güncellemeden sonraki ilk açılışta bir
kez daha gelebilir; eski damga farklı biçimdeydi.
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

### 6.2 · Kasa girişi — PIN ve konum (Ü285)
**Yap:** Kafenin içindeyken **herhangi bir telefondan** `…:3001/kasa/giris`
→ kasiyer PIN'i → **Giriş** → tarayıcı konum isterse **izin ver**.
✅ **"Kupon onayı"** ekranı: tarayıcı + bugünün özeti. Başka iş yok.
✅ Konum izni reddedilirse: "Kasaya girmek için konum izni gerekli…".
✅ Kafenin yarıçapı dışında: "Kasaya yalnızca kafenin içinden girilebilir —
en yakın kafeye X m uzaktasın." Konum bulanıksa "yeterince net değil".
✅ Yanlış PIN: "PIN yanlış."; aynı telefondan 5 yanlıştan sonra "Çok fazla
deneme".
⚠️ Bilgisayarda konum ±5 km yanılabiliyor (1.3) — kasayı telefon ya da
tabletle dene.
🔴 Kafenin dışından (yarıçap dışı) PIN kabul ediliyorsa; başka kafenin
kasası açılıyorsa.

### 6.3 · Yetki sınırı
**Yap:** Kasiyerle `/kafe/panel`, `/kafe/panel/butce`, `/platform` yaz.
✅ Üçüne de giremez. 🔴 Birine girebiliyorsa.

### 6.4 · Okut
- **Android/Chrome:** müşterinin kupon karekodunu kameraya tut → kupon
  bilgisi gelir.
- **iPhone/Safari (Ü283):** **QR okut** → kamera izni ver → kuponu
  görüntünün ortasına getir → kupon bilgisi gelir. 6 karakterli kod alanı
  da hep duruyor.
🔴 Ekran boş kamerada donuyorsa; elle giriş alanı yoksa.

### 6.5 · Açılmadan önce
**Yap:** Henüz açılmamış kuponu okut.
✅ Reddedilir ve **ne zaman açılacağını** söyler.

### 6.6 · Onayla
**Yap:** Açılmış kuponu onayla.
✅ "Kullanıldı"; müşterinin ekranında da kapanır; bütçeden düşer.
✅ Ürüne bağlı yüzde kuponunda (Ü277) ekranda "%20 · Filtre Kahve" ve
indirimin TL'si yazar; kasiyere **tutar sorulmaz**.
🔗 **Etki:** Ben: kuponun düştüğü tutar ödülün değeri mi.

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
