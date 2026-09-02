# 05 — Açık Sorular

> **CANLI DOKÜMAN.** Çözülen soru buradan çıkar, kararı `02-karar-defteri.md`'ye geçer.

**Son güncelleme:** 2026-08-27

---

## ✅ 2026-08-24 turunda kapananlar

| # | Soru | Karar | Nerede |
|---|---|---|---|
| S18 | Seviye neye göre hesaplanacak | **XP** — ayrı, harcanmayan, yalnızca kafede kazanılan sayaç. Seviye **kafe bazında**, global profil seviyesi yok | Ü14, Ü15 |
| S19 | Rozet ne için verilir | Platform tanımlı sabit liste, **yalnızca statü** — ekonomik değeri yok, kafe kendi rozetini tanımlayamaz | Ü16 |

Aynı turda `12-yeni-kapsam.md`'deki altı çelişki de kapandı: Ç1→Ü19 · Ç2→Ü14 · Ç3→Ü6 teyit · Ç4→Ü17 · Ç5→Ü18 · Ç6→Ü20.

---

## ✅ 2026-08-22 turunda kapananlar

| # | Soru | Karar | Nerede |
|---|---|---|---|
| S1 | Ödül ekonomisi sayıya bağlanmamış | Formül yok, katalog var; puan tablosu ve tavanlar kondu | `06` §1–§3 |
| S2 | 1.500 TL eşiği gerilimi | **Haftalık taban** oldu ve kasada kullanılana göre tükeniyor — dağıtılmayanın maliyeti yok | `06` §4 · Ü6, Ü7 |
| S3 | "Nitelikli oyuncu" tanımı | Altı koşul; 1/cihaz/kafe/gün | `06` §5 |
| S4 | Sayacı kim denetliyor | Append-only defter + kafeye açık anonim doğrulama defteri | `06` §6 |
| S7 | Şans Çarkı regülasyon riski | v1'den çıkarıldı | E8 |
| S8 | Çapraz-kafe mahsuplaşması | Puan kafe bazında olduğu için sorun **doğmuyor** | Ü5 |
| S9 | Ürün adı | Şimdilik **Looply**. Klasör adı `cafemasa` kalıyor | Ü11 |
| S10 | Koleksiyon mekaniği (F10/F11) | İkisi de v1'de yok — Faz 9 sonrası | — |
| S12 | Anlık ödül nasıl seçilir | Hâlâ açık → aşağı taşındı | — |

---

## 🔴 Kritik — mimariyi veya iş modelini etkiler

### ✅ S14 · Platform geliri — **kapandı 2026-08-25**

**Karar: satılan birim nitelikli oyuncu** (Ü29). Kaynak dokümanın modeli: Free Reach (günde N ücretsiz) + Boost paketleri. Kafe raporunun baş sayısı bu.

`play_sessions.is_qualified` Faz 5'ten beri hesaplandığı için ek şema gerekmedi.

**Açık kalan alt kalem — ticari:** Free Reach kotasının sayısı ve Boost fiyatları. Faz 8 kotayı uygulamıyor, yalnızca birimi ölçüyor; kota zorlaması ve faturalama pilot verisinden sonra.

---

### S5 · Skor doğrulama — deterministik replay

Sunucu tarafı doğrulama, refleks ve hafıza oyunlarında girdi kaydının sunucuya gitmesini ve skorun yeniden hesaplanmasını gerektirir.

**Mimarinin başında konmazsa sonradan eklemek çok pahalı.** 10 oyunun tamamı bu şartı sağlayacak şekilde seçilmeli: durumu `(seed, girdi olayları)` fonksiyonu olmayan oyun listeye alınmaz.

---

### S6 · KVKK — teknik tarafı bitti, hukuki tarafı bekliyor

Faz 1'de yazılanlar: veri sınıflandırması, saklama ve silme takvimi, veri sahibi hakları akışı, aydınlatma ve açık rıza taslakları, İYS akışı. → `08` §2, §6, §9

**Avukattan beklenen yedi cevap** (`08` §10). İkisi şemayı etkileyebileceği için erken sorulmalı:

- **H2** — ad, soyad, telefon için doğru hukuki sebep: açık rıza mı, sözleşmenin ifası mı?
- **H3** — 5651 sayılı kanun kapsamında trafik kaydı saklama süresi ne olmalı? (`08` §6'daki 90 günü değiştirebilir)

Ayrıca hâlâ yazılmadı: **ihlal bildirimi prosedürü** (Faz 10).

---

## 🔵 Yeni istenen — oyuncu profili ve kafe indirimleri

> Ürün sahibinin 2026-08-23 gecesi ilettiği kapsam. Faz 4 ve Faz 6'ya giriyor.
> **Bloke eden S18 ve S19 kapandı (2026-08-24)** — Faz 4'ün kalanı yazılabilir.

**Oyuncu tarafında istenenler**

| İstenen | Nereye |
|---|---|
| Kazanılan ödüllerin envanteri | Faz 4 · "Ödüllerim" ekranı |
| Rozetler | Faz 4 — ✅ Ü16: platform tanımlı sabit liste, yalnızca statü |
| Oyuncunun seviyesi | Faz 4 — ✅ Ü15: **kafe bazında**; global profil seviyesi **yok** |
| Hangi kafede hangi oyunları oynadığı | Faz 4 · kafe bazlı geçmiş |
| Her kafede ayrı seviye | Faz 4 — ✅ Ü14 + Ü15 |
| Hangi promosyonu hangi kafede kullanabileceği | Faz 4 · kupon kartında kafe bilgisi |
| Bulunduğu kafeye özel indirimler | Faz 4 · masa oturumundaki kafenin kampanyaları |

**Kafe tarafında istenen**

| İstenen | Nereye |
|---|---|
| Özel indirim için seçmelik ürün | Faz 6 · `products` + `percentage_campaigns` (şema hazır) |

---

### ✅ S18 · Seviye neye göre hesaplanacak? — **kapandı 2026-08-24**

**Karar: XP geri geldi** (Ü14) ve **seviye kafe bazında** (Ü15).

XP ayrı, harcanmayan bir sayaç; yalnızca kafede kazanılıyor (Ü3 korundu). Puan para, XP ilerleme — ödül alan oyuncunun seviyesi düşmüyor. Global profil seviyesi **yok**: oyuncu "bu kafede 4. seviyeyim" der. Bu, Ü5'in (puan kafe bazında) mantığıyla aynı hatta duruyor.

> 2026-08-23'te "kendi leveli" de istenmişti; bu karar o isteği **kapsam dışı bırakıyor**. Global seviye sonradan eklenmek istenirse XP defteri zaten kafe bazında tutulduğu için toplamı almak yeterli — şema borcu doğurmuyor.

**Açık kalan alt kalem:** XP miktarları. Bir oyun kaç XP kazandırır, seviye eşikleri ne? Faz 5'te oyun motoru gerçek skor üretene kadar bağlanamaz. Faz 4'te seviye hesabı **eşik tablosundan** okunacak biçimde yazılır; tablo Faz 5'te sayıya bağlanır. → `06-ekonomi-ve-dogrulama.md`

### ✅ S19 · Rozet ne için verilir? — **kapandı 2026-08-24**

**Karar: yalnızca statü** (Ü16). Platformun tanımladığı sabit liste; kafe kendi rozetini tanımlayamaz. Ekonomik değeri yok — havuz muhasebesine dokunmuyor, E5'i bozmuyor, yeni fraud yüzeyi açmıyor.

**Açık kalan alt kalem:** rozet listesinin kendisi. Kazanma koşulları oyun ve kupon verisine dayandığı için Faz 4'te **tanım tablosu + değerlendirme kancası** yazılır, liste Faz 5 ve Faz 7 gerçek olay ürettikçe dolar.

---

## 🟠 Önemli — ürün kararı bekliyor

### ✅ S12 · Anlık ödül nasıl seçilir — **kapandı 2026-08-25**
**Karar: döngüsel** (Ü27). Kafenin sıraladığı listeden sırayla; liste bitince başa döner. Rastgelelik yok — E8'in reddettiği öngörülemezlik arka kapıdan geri girmiyor.

Aynı turda **A5'in eşiği** de sayıya bağlandı: 51 TL üstü ödül ertesi gün aktifleşiyor (Ü28), E6'nın mevcut K4 kademesiyle aynı sınır.

### S15 · Bonuslu oyun kim belirliyor *(Faz 5'te geçici çözümle uygulandı)*
**Şu anki hâl:** platform seçiyor, tarihten türüyor, her gün değişiyor (`src/oyunlar/index.ts` → `gununOyunu`). Sunucu ve istemci aynı cevabı verdiği için doğrulamaya engel değil.

**Açık kalan ürün kararı:** kafe kendi bonuslu oyununu seçebilmeli mi? Seçebilirse bu, kafenin ×2 çarpanla bütçesini daha hızlı eritmesi anlamına gelir — Faz 6'daki bütçe ekranıyla birlikte düşünülmeli.

### ✅ S16 · Yüzde indirimi puanla alınabilir mi — **kapandı 2026-08-25**
**Karar: ikisi de, ayrı yerlerde** (Ü26). Katalogda TL tavanlı indirim kuponu puanla satın alınabiliyor; ayrıca kafe ürün bazında kampanya açıp doğrudan dağıtabiliyor (puan istemez, otomatik düşer). İki farklı ihtiyaç: birincisi oyuncunun hedefi, ikincisi kafenin itmek istediği ürün (Ö4).

Eski itiraz — "puan ekonomisiyle bütçe dışı araç birbirine karışır" — Ü17 ile zaten düşmüştü: tavan gelince tek bütçe defteri kaldı.

### ✅ S13 · Bütçe döneminin başlangıcı — **kapandı 2026-08-25**
**Karar: pazartesi, ilk dönem orantılı** (Ü25). Tüm kafeler aynı takvimde olduğu için raporlar karşılaştırılabilir kalıyor. Hafta ortasında katılan kafenin ilk dönemi kısa ve alt sınırı da orantılı.

### S17 · 10 oyunun listesi *(ilk üçü karara bağlandı · aday liste hazır)*
**İlk üç seçildi (Ü21):** blok yerleştirme · düşen blok · kelime bulmaca. Üçü de deterministik replay'e uygun (S5) ve üçü farklı girdi biçimi üretiyor.

**Açık kalan:** diğer yedi oyun. **Aday liste çıkarıldı → `18-oyun-adaylari.md`** — 11 aday, elenenler gerekçeleriyle, seçim için üç eksen (girdi çeşitliliği, oturum süresi, maliyet). Karar ürün sahibinde.

Süzgeç incelemesinde **üçüncü bir şart** çıktı ve adayların yarısını eledi: **tohum, oyuncudan gizlenen bilgi taşımamalı.** Modül istemcide de çalıştığı için tohum oyuncunun elinde; gizli düzeni kodluyorsa (hafıza oyununda kapalı kartlar, mayın tarlasında mayınlar, solitaire'de deste) oyuncu düzeni kendi tarayıcısında hesaplayıp oyunu hiç oynamadan çözer — üstelik hamleleri kurallara uygun olduğu için sunucu reddedemez.

### S11 · Kafe Ekranı (F2) donanım modeli
Kafe kendi TV'sini mi kullanacak, tablet mi verilecek? Faz 9 sonrası.


---

## 🟠 S20 · Aydınlatma metninin hukuki hâli *(açıldı 2026-08-26)*

`/aydinlatma` ekranı Faz 8 geçişinde yazıldı — kayıt formundaki **zorunlu** onay
kutusu o güne kadar 404'e bakıyordu ve açık rızanın "bilgilendirilmiş" olması şartı bu
bağlantının çalışmasına bağlı.

**Metin hukuk incelemesinden geçmedi.** Bugünkü hâli ürünün gerçek davranışını doğru
anlatıyor (şifreli numara, kafeye özel anonim kod, mesafe saklanır adres saklanmaz,
30 gün silme) ama nihai hâli avukattan gelmeli. Aynı incelemede İYS izin metni ve
veri sorumlusu künyesi de netleşecek.

**Bloke ettiği:** saha pilotu. Gerçek müşteri gerçek numarayla kaydolmadan önce metin
yerinde olmalı.

---

## 🔴 Demo ve pilot ön koşulları *(2026-08-27 taraması)*

Ürünün çalıştığı ama **sahada çalışmayacağı** noktalar. Biri kodla kapandı,
ikisi ortam kararı.

### ✅ Kafe konumu paneli — **kapandı 2026-08-27**

Koordinatı yalnızca geliştirme tohumu yazıyordu; panelde alanı yoktu. Gerçek
başvuru akışından geçmiş **onaylı** bir kafede (`kahve-duragi`) sonucu şuydu:
kurulum tamam, karekodlar masada ve **hiçbir oyuncu hiçbir şey kazanamıyor** —
K2 hiç doğrulanamadığı için. Oyuncuya da "Konum doğrulanamadı" deniyordu,
sanki suç onun telefonundaymış gibi.

`/kafe/panel/konum` yazıldı: kafe sahibi kafedeyken tek düğmeyle işaretliyor.
Panelde konum yoksa kırmızı uyarı ve "EKSİK" rozeti var; oyuncu tarafındaki
mesaj da artık gerçek sebebi söylüyor.

### ⚠️ HTTPS — konum izni için zorunlu

`navigator.geolocation` yalnızca **güvenli bağlamda** çalışıyor. `localhost`
güvenli sayılıyor, ama demoyu telefondan laptopun LAN adresine (`http://192.168…`)
bakarak yapmak **konumu tamamen kapatır** — ne kafe konumu işaretlenebilir ne
oyuncu doğrulanabilir.

**Demo için gereken:** ya laptop tarayıcısında kalmak, ya HTTPS'li bir tünel
(ngrok vb.), ya da hazırlık ortamının sertifikasıyla yayına almak.

### ⚠️ Demo kafesinin koordinatı demo yerinde olmalı

Tohumdaki kafeler İstanbul'a (41.0369, 28.9838) sabitli. Başka bir yerde demo
yapılırsa oyuncu "kafeden 380 m uzaktasın" görür. Artık panelden düzeltilebiliyor
— demo öncesi bir kez basılması yeterli.

---

## Sıradaki iş

**Faz 9 — Kalan 7 oyun + masa mekanikleri + davet sistemi.** Faz 1–8 tamamlandı; son
kapı raporu: `16-faz8-kapi-raporu.md`. Aynı geçişte arayüz Ü31'e ("Açık ve Asil")
taşındı.

Faz 9'u bloke eden açık soru: **S17** — kalan yedi oyunun listesi. Her aday S5
süzgecinden (deterministik replay) geçmeli.

Faz dışı devreden açıklar — **hiçbiri kodla kapatılamıyor**: **S20** aydınlatma metni
hukuk incelemesi · **G32** platform girişinde ikinci faktör · kelime listesinin küfür
süzgeci insan gözünden geçmeli · düşen-blok mekaniğinin hukuki sınırı (G6) · Free Reach
kotası ve Boost fiyatları (ticari) · kupon bakımı için gerçek zamanlanmış iş (köprü
çalışıyor, `16` §8) · **D11 masa karekodları ekranı** — tasarımı hazır, hangi faza
gireceği karara bağlı.

2026-08-26'daki düzeltme turunda kapananlar: ertelenmiş kuponun hiç açılmaması (🔴),
paletin kendi kontrast kuralını tutturamaması, panelde eskimiş "faz 7" rozeti ve
`/firsatlar` altındaki eskimiş not. Ayrıntı: `16-faz8-kapi-raporu.md` §8.
