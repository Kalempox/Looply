# 33 — TEST · PLATFORM YÖNETİCİSİ (A'dan Z'ye)

> **Kim olduğun:** Looply'nin kendi tarafı. Bütün işletmelerin ve bütün
> oyuncuların verisini görebiliyorsun — **ürünün en tehlikeli ekranı bu.**
>
> Testin büyük kısmı "çalışıyor mu" değil, **"görmemesi gerekeni
> görmüyor mu"**.

**Roller:** `platform_admin` · `platform_destek` · **Giriş:** `/platform/giris`

---

## A · Giriş

### A.1 · Gir

**Ne yaparsın:** `/platform/giris` → telefon + 6 haneli doğrulama kodu
(geliştirmede kod ekranda görünür).

**Ne görmelisin:** platform ekranları açılır.

🔴 **Bilinen açık — yayından önce kapatılmalı:** burada **TOTP yok.**
Platform yöneticisi bütün kafelerin verisine erişiyor ve tek koruma
SMS. Oyuncu tarafında SIM swap'e karşı koruma yazıldı, platform
tarafında yazılmadı. Kodun kendi yorumu bunu "Faz 10"a yazıyor.

### A.2 · İki rolü ayır

**Ne yaparsın:** `platform_destek` rolüyle gir, yalnızca yöneticiye açık
bir ekrana gitmeyi dene.

**Ne görmelisin:** "yetkisiz" ile geri atılırsın.

🔴 **Hata sayılır:** destek rolü admin ekranlarına girebiliyorsa.

---

## B · Başvurular

**Ne yaparsın:** `/platform/basvurular` → bekleyen başvuruyu aç, detayını
gör, onayla ya da reddet.

**Ne görmelisin:** onaylanan işletme `/platform/kafeler` listesine geçer
ve panele girebilir hâle gelir.

🔴 **Hata sayılır:**
- Onaysız işletme panele girebiliyorsa.
- Reddedilen başvuru yine de girebiliyorsa.
- Aynı başvuru iki kez onaylanabiliyorsa.

---

## C · Kafeler

### C.1 · Liste

**Ne yaparsın:** `/platform/kafeler`.

**Ne görmelisin:** işletmeler, 30 günlük sayıları ve **kurulum
engelleri** (konum girilmemiş, ödül yok gibi) kırmızı işaretli.

🔴 **Hata sayılır:** konumu girilmemiş bir kafe "hazır" görünüyorsa.
Bu ekran destek çağrısı geldiğinde bakılacak ilk yer; yanlış söylerse
sorun elle SQL yazarak aranır.

### C.2 · Kafe künyesi

**Ne yaparsın:** bir kafeye gir (`/platform/kafeler/[cafeId]`).

**Ne görmelisin:** ayarlar, personel, şubeler, aktivasyon saati.

🔴 **Hata sayılır:** bir kafenin künyesinde **başka kafenin** personeli
ya da şubesi görünüyorsa.

---

## D · Oyuncular — 🔴 asıl hassas ekran

### D.1 · Telefon maskeli mi

**Ne yaparsın:** `/platform/oyuncular` → listeye bak.

**Ne görmelisin:** telefon numaraları **maskeli**.

🔴 **Hata sayılır:** listede tam numara görünüyorsa.

⚠️ Kuralın sebebi: bir listeyi açmak bir karar değil, **tek bir
numarayı açmak karardır** — ve kayıtta görünmesi gereken şey o karar.

### D.2 · Tek numarayı aç

**Ne yaparsın:** bir oyuncunun tam numarasını görmeyi iste.

**Ne görmelisin:** gerekçe sorulur, numara açılır ve **denetim izine
yazılır**.

🔴 **Hata sayılır:**
- Gerekçe sorulmadan açılıyorsa.
- Açılma kaydı hiçbir yere düşmüyorsa.

---

## E · Ticari ileti

### E.1 · Rızasıza gönderilemediğini doğrula

**Ne yaparsın:** `/platform/mesaj` → kitle seç, mesaj hazırla.

**Ne görmelisin:** kitlede yalnızca **ticari ileti izni vermiş**
oyuncular var.

🔴 **Hata sayılır:** "hepsini seç" gibi bir yol rızasızlara da
ulaşıyorsa.

⚠️ Süzgeç SQL'de, ekranda değil — ekranda süzülseydi sonraki bir
değişiklik rızasızlara da ulaşabilirdi. Test ederken bir oyuncunun
iznini `/verilerim`den kapatıp kitleden düştüğünü gör.

### E.2 · Çıkma cümlesi

**Ne görmelisin:** mesaj şablonunda çıkma cümlesi var ve
**kaldırılamıyor**.

🔴 **Hata sayılır:** çıkma cümlesi silinebiliyorsa.

### E.3 · Bilinen eksikler ekranda yazıyor mu

**Ne görmelisin:** ekran şunları açıkça söylemeli:
- **WhatsApp yok** (Meta Business hesabı + onaylı şablon gerekiyor)
- **İYS kaydı kapsam dışı**

🔴 **Hata sayılır:** ekran bunları söylemiyorsa. "Sistem hallediyordur"
sanılması, ticari ileti mevzuatında doğrudan ceza demektir.

---

## F · Acil durdurma

**Ne yaparsın:** `/platform/acil` → durdur.

**Ne görmelisin:** ödül dağıtımı durur; oyuncu tarafında kupon
açılmaz.

🔴 **Hata sayılır:**
- Durdurduktan sonra hâlâ kupon açılıyorsa.
- Geri açtığında normale dönmüyorsa.

⚠️ Bunu test ederken başka testlerin ortasında olmadığından emin ol;
durdurma bütün kafeleri etkiler.

---

## G · Kiracı izolasyonu — saldırı gözüyle

> Bu bölüm F1 (saldırı denemesi) turunun parçası.

| Dene | Beklenen |
|---|---|
| Kafe yöneticisiyle `/platform/*` | Giremez |
| Kasiyerle `/platform/*` | Giremez |
| A kafesinin yöneticisiyle B kafesinin `cafeId`si | Veri gelmez |
| Oyuncu oturumuyla panel adresleri | Giremez |
| Çıkış yaptıktan sonra geri düğmesi | Sayfa yeniden açılmaz |

🔴 **Hata sayılır:** bunlardan biri veri döndürüyorsa. Ekranın
gizlenmesi yetmez; sunucunun reddetmesi gerekir.

---

## Bittiğinde elinde ne olmalı

- [ ] Onaylanmış ve reddedilmiş birer başvuru
- [ ] Kurulum engeli kırmızı görünen bir kafe
- [ ] Maskeli liste **ve** gerekçeyle açılmış tek bir numara
- [ ] İzni kapatılmış bir oyuncunun kitleden düşmesi
- [ ] Acil durdurmanın gerçekten durdurması
- [ ] Yedi izolasyon denemesinin yedisinin de reddedilmesi
