# 30 — TEST · BARİSTA / KASİYER (A'dan Z'ye)

> **Kim olduğun:** tezgâhın arkasındaki kişi. Elinde kafenin tableti ya
> da kendi telefonun var. **Tek işin var:** müşterinin kuponunu onaylamak.
>
> **Önce kur:** `28-test-kafe-yoneticisi.md` §C.7 — yönetici sana bir
> kasiyer hesabı açmış olmalı.

**Rol:** `kasiyer` · **Giriş:** `/kasa/giris` · **Ekran:** `/kasa`

---

## A · Giriş ve yetki sınırı

### A.1 · Kasiyerle gir

**Ne yaparsın:** `/kasa/giris` → kasiyer telefonu + parola.

**Ne görmelisin:** `/kasa` açılır. Başlık **"Kupon onayı"**, altında
kamera tarayıcısı ve bugünün özeti.

🔴 **Hata sayılır:** ekranda kupon onayından başka işler varsa. Bu ekran
bilerek çıplak: kasiyer telaşlı, gözü dağılmamalı.

### A.2 · 🔴 Yetki sınırını dene

**Ne yaparsın:** kasiyerle girmişken adres çubuğuna `/kafe/panel` yaz.

**Ne görmelisin:** panele **giremezsin**, kasiyer girişine geri
atılırsın.

🔴 **Hata sayılır:** kasiyer panele girebiliyorsa. Kasiyer bütçeyi,
ödülleri ve raporu görmemeli.

**Ayrıca dene:** `/platform`, `/kafe/panel/butce`, `/kafe/panel/personel`.
Üçü de kapalı olmalı.

---

## B · Kupon okutma — iki yol da çalışmalı

> 🔴 **Bu bölüm cihaza göre değişiyor ve ikisi de test edilmeli.**
> Karekod okuma `BarcodeDetector` ile yapılıyor; bu API **Chrome ve
> Android'de var, Safari ve iPhone'da yok**. Yani 6 haneli kod bir
> "yedek" değil, bazı cihazlarda **tek yol**.

### B.1 · Android / Chrome — kamerayla

**Ne yaparsın:** müşterinin kupon ekranındaki karekodu kameraya tut.

**Ne görmelisin:** kod okunur, kupon bilgisi ekrana gelir, onay sorulur.

🔴 **Hata sayılır:**
- Kamera izni istenmiyorsa.
- Kod okunuyor ama kupon bilgisi gelmiyorsa.

### B.2 · iPhone / Safari — elle kod

**Ne yaparsın:** aynı ekranı iPhone'da aç.

**Ne görmelisin:** kamera çalışmıyorsa ekran bunu **söylemeli** ve elle
kod girme alanı sunmalı. Müşterinin kupon ekranındaki 6 haneli kodu gir.

🔴 **Hata sayılır:**
- Ekran boş kamera karesi gösterip donuyorsa.
- Elle giriş alanı yoksa — o zaman iPhone'lu kasiyer hiçbir kuponu
  onaylayamaz.
- Hata mesajı "kameraya erişilemedi" demeden sessiz kalıyorsa.

⚠️ **Bilinen eksik:** iPhone'da da doğrudan karekod okuyabilmek için
ayrı bir okuyucu kütüphanesi gerekiyor. Bugün elle kod yolu var; ürün
sahibi *"iOS'ta da Android'de de panel doğrudan karekod okumaya yönelik
olmalı"* dedi ve bu madde açık.

---

## C · Onay ve geri alma

### C.1 · Onayla

**Ne yaparsın:** kupon bilgisini gör, onayla.

**Ne görmelisin:** "kullanıldı" bilgisi ve müşterinin ekranında da
kuponun kapanması.

🔴 **Hata sayılır:** onaydan sonra müşterinin ekranında kupon hâlâ
kullanılabilir görünüyorsa.

### C.2 · 🔴 Aynı kuponu ikinci kez dene

**Ne yaparsın:** az önce onayladığın kuponu tekrar okut.

**Ne görmelisin:** **reddedilir** ve sebebi yazar.

🔴 **Hata sayılır:** ikinci kez kabul ediliyorsa. Bu, bir kuponun iki
kez bedava ürün vermesi demektir.

### C.3 · Geri alma (60 saniye)

**Ne yaparsın:** bir kuponu onayla, sonra **60 saniye içinde** geri al.

**Ne görmelisin:** kupon yeniden kullanılabilir olur.

🔴 **Hata sayılır:**
- Geri alma hiç yoksa — yanlışlıkla okutulan kupon müşterinin hakkını
  yakar.
- 60 saniye **geçtikten sonra** hâlâ geri alınabiliyorsa.

---

## D · Reddedilmesi gereken kuponlar

> Her birinde kasiyerin ekranında **sebep** yazmalı. "Sistem kabul
> etmiyor" yetmez — kasiyer müşteriye bir cevap vermek zorunda, elinde
> cevap yoksa suç ürüne kalır.

| Dene | Beklenen | 🔴 Hata |
|---|---|---|
| Süresi dolmuş kupon | Reddedilir, "süresi doldu" der | Kabul ediliyorsa |
| Kullanım penceresi dışında | Reddedilir ve **ne zaman geçerli olduğunu söyler** | Yalnızca "geçersiz" diyorsa |
| Henüz aktifleşmemiş (24 saat) | Reddedilir, ne zaman açılacağını söyler | Kabul ediliyorsa |
| **Başka kafenin kuponu** | Reddedilir | Kabul ediliyorsa — bu kiracı izolasyonunun kırılması demektir |
| Uydurma kod | Reddedilir | "Kupon bulundu" diyorsa |

---

## E · Bugünün özeti

**Ne yaparsın:** `/kasa` ekranındaki özete bak.

**Ne görmelisin:** bugün kaç kupon onaylandığı.

🔴 **Hata sayılır:** onayladığın kupon sayıya yansımıyorsa.

---

## F · Butikte ikinci iş

Butik işletmede bu ekranda **fazladan bir bağlantı** olmalı:
*"Alışverişe çark hakkı ver →"*

🔴 **Hata sayılır:** bu bağlantı normal kafede de görünüyorsa. Kafede
kasa tutar girmiyor; kasiyer tutar girer, hiçbir koşul tutmaz ve
sistemin bozuk olduğunu sanır.

Devamı: `32-test-butik-kasiyer.md`

---

## Bittiğinde elinde ne olmalı

- [ ] Kasiyer hesabıyla giriş, panele girememe
- [ ] Android'de kamerayla, iPhone'da elle kod ile onay
- [ ] Aynı kuponun ikinci kez reddi
- [ ] 60 saniyelik geri alma
- [ ] Beş ret sebebinin de ekranda yazılı çıkması
