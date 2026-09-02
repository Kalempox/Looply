# 01 — Proje Analizi

**Kaynak:** `kaynak/looply-urun-tanimi.txt` (31 bölüm) + `kaynak/buyume-ve-gelir-modeli.txt` (17 bölüm)
**Tarih:** 2026-08-22

---

## 1. İki kaynak dokümanın ilişkisi

| Dosya | Katman | İçerik |
|---|---|---|
| `looply-urun-tanimi.txt` | **ÜRÜN** | Ne yapıyoruz, kim kullanıyor, hangi ekranlar var |
| `buyume-ve-gelir-modeli.txt` | **TİCARİ** | Para nereden geliyor, nasıl büyüyoruz |

İkinci doküman daha sonra yazılmış ve birincinin **§28 "Abonelik ve ödeme"** bölümünü fiilen geçersiz kılıyor: abonelik ana gelir modeli olmaktan çıkarılıp 6. sıraya itiliyor, yerine kullanım-bazlı erişim satışı konuyor.

**Kural:** Çelişkide gelir modeli dokümanı kazanır.

---

## 2. Dört aktör

| Aktör | Ne istiyor | Looply'e ne veriyor |
|---|---|---|
| **Oyuncu** | Eğlence, puan, seviye, ödül, kupon, sıralama | Dikkat + veri + kafeye ziyaret. **Para ödemiyor.** |
| **Kafe** | Müşteri çekmek, tekrar getirmek, ölçülebilir sonuç | Promosyon havuzu (ürün) + erişim ödemesi |
| **Platform** | Ağı büyütmek, trafiği ölçmek ve satmak | Altyapı, oyunlar, oyuncu havuzu |
| **Reklamveren** | Looply oyuncularına ulaşmak | Reklam / sponsorluk bütçesi |

Kaynak dokümandaki kilit tanım:

> *"Oyuncu ürünün müşterisi değil, platformun değer üreten kullanıcısıdır."*

Yani oyuncu **envanterin kendisi**.

---

## 3. Çekirdek döngü

```
QR → Kafe sayfası → Oyun → Skor → Ödül → Kupon
   → Kasada kullanım → Tekrar ziyaret → tekrar oyun → daha değerli ödül
```

Bu döngünün kalbi **kupon kullanımı (redemption)**. Çünkü ölçülebilir tek gerçek-dünya sonucu odur:

- Kupon kullanılmazsa → kafe "bana ne kazandırdı" sorusunu cevaplayamaz
- Cevaplayamazsa → erişim satın almaz
- Satın almazsa → gelir modeli çalışmaz

**➜ Kupon redemption oranı projenin tek kritik metriğidir.**

---

## 4. Modül envanteri

Ürün dokümanı esasen bir ekran/rol matrisi çıkarmış:

### Oyuncu tarafı (9 modül)
Ana sayfa · Oyunlar · Günün Challenge'ı · Puanlarım · Ödüller · Kuponlarım · Leaderboard · Kafeler (keşif) · Kampanyalar

**Oyunlar (ilk sürüm):** 30 Saniye Challenge · Hafıza · Şans Çarkı
> ⚠️ Şans Çarkı için regülasyon notu → `05-acik-sorular.md`

### Kafe paneli (8 modül)
Dashboard · Oyun yönetimi · QR kodlar (masa bazlı) · Ödüller yönetimi · Kupon yönetimi · Müşteriler · Reklamlar · İstatistikler

### Platform paneli (3 modül)
Platform Dashboard · Finans (mimaride hazır, ilk sürümde pasif) · Analitik

### Yatay katmanlar
Fraud koruması · Abonelik altyapısı (hazır, kapalı) · Çoklu işletme ağı

---

## 5. Doğru bulunmuş tasarım kararları

**İki ayrı tasarım dili.** Oyuncu tarafı eğlenceli (büyük buton, animasyon, rozet), işletme tarafı sıkıcı-profesyonel (tablo, KPI).

> *"Kafe sahibi oyundan değil, sonuçtan etkilenmeli."*

**Masa bazlı QR.** "Hangi masadan kaç oyun oynandı" ölçümünü açıyor — ve sonradan kabul edilen *Masayı Fethet* mekaniğinin altyapısı zaten burada mevcut.

**Günün Challenge'ı.** Haftalık rotasyon (Pzt hafıza, Salı hız, Cuma büyük ödül…). Tek seferlik oynayıp çıkmayı engelleyen retention kancası.

**Kafe / şehir / haftalık leaderboard.** Global leaderboard'dan daha güçlü — "Cafe X'te bu haftanın 1'incisi sensin" ulaşılabilir bir hedef.

**Boost'un "garanti" olarak satılmaması.** Doküman özellikle *"50 oyuncu satıyoruz"* değil **"50 nitelikli oyuncuya kadar erişim"** diyor. Hem sahte-trafik algısını hem karşılayamama riskini kapatan doğru bir refleks.

---

## 6. Gelir modeli

### Kurgu
1. Kafe **bedava** girer — abonelik yok, satış görüşmesi yok
2. Tek şart: günlük min. **1.500 TL değerinde promosyon havuzu** (nakit değil, kendi ürünlerinin perakende değeri)
3. Looply ücretsiz "nitelikli oyuncu" erişimi verir (örn. 10/gün)
4. Kafe daha fazlasını isterse **Boost** satın alır: +20 / +50 / +100 / +250 / +500 oyuncu/gün

### İki kavram
- **Organic Reach** — ücretsiz, doğal trafik
- **Boost Reach** — parayla artırılan görünürlük

### "Nitelikli oyuncu" tanımı (= faturalama birimi)
Gerçek kullanıcı + benzersiz cihaz + QR/kampanyadan gelmiş + oyunu gerçekten başlatmış + minimum etkileşimi tamamlamış.

### Gelir kanalları (öncelik sırasıyla)
1. **Boost Reach** — ana gelir
2. Reklam (markalar → oyunculara)
3. Sponsorlu ödül
4. Sponsorlu oyun (tam markalı, en yüksek fiyat)
5. İşletmeler arası reklam (Cafe → Cafe)
6. Premium SaaS

Aynı trafikten **çift gelir** çıkarma fikri (kafe erişim için öder + marka reklam için öder) modelin en güçlü tarafı.

### Psikolojik avantaj
> ❌ "Aylık 799 TL abonelik"
> ✅ **"Bugün daha fazla müşteri ister misiniz?"**

Kafe soyut bir yazılım değil, somut bir sonuç satın alıyor. Kazanmadıysa ödemiyor ama **sistemden çıkmıyor** — ağ küçülmüyor.

---

## 7. Bulgular

### ✅ ÇÖZÜLDÜ — "Looply kafeye oyuncu getiriyor" iddiası

**İlk okumada tespit edilen sorun:** Ürün dokümanında oyuncu zaten kafede oturan müşteridir (masadaki QR'ı okutur). Buna göre müşteriyi kafeye Looply getirmemiş olur.

**CD açıklaması (2026-08-22):** Kasıt, **sırf o oyunu oynamak için kafeye gelen müşteri**. Oyunun kendisi çekim gücü.

**Kalan gereklilik (çelişki değil, yapılacak iş):** Boost'un gerçekten bir şey teslim edebilmesi için oyuncuyu belirli bir kafeye yönlendirebilecek bir **kanal** ürün olarak inşa edilmeli:
- Yakındaki oyunculara bildirim
- Harita / kafe keşif ekranı
- "Bugün burada havuz açık" görünürlüğü

Bu kanal, kabul edilen **Happy Hour Havuzu** özelliğinin duyuru katmanıyla birebir örtüşüyor → bkz. `03-ozellikler.md`.

---

### 🟠 AÇIK — Yumurta-tavuk problemi
Boost'un satılabilmesi için yönlendirilecek bir oyuncu havuzu gerek; o havuz ise kafelerdeki QR'lardan doluyor. **İlk 6–12 ay Boost geliri ≈ 0** varsayılmalı. Model ancak yeterli şehir yoğunluğunda çalışır.

### 🟠 AÇIK — 1.500 TL/gün eşiği
Aylık **45.000 TL perakende değerinde** promosyon taahhüdü. Gerçek maliyet %25–30 varsayımıyla ~11–13k TL/ay. Küçük bir mahalle kafesi için bu, "ücretsiz katılım" iddiasıyla gerilim yaratır.
→ `05-acik-sorular.md` S2

### 🟠 AÇIK — Ödül ekonomisi tanımsız
Puan → ödül dönüşüm oranı hiçbir yerde yok. 4.250 puan neden %10 indirim? Havuz nasıl tükeniyor? Günlük limit ne?
→ `05-acik-sorular.md` S1

### 🟠 AÇIK — Fraud, gelir modelinin doğrudan içinde
"Nitelikli oyuncu" aynı zamanda faturalama birimi olduğu için **platformun kendisi sayacı şişirme teşvikine sahip**. Kafe "50 oyuncu için ödedim, gerçekten 50 gerçek insan mıydı?" diye soracak.
→ `05-acik-sorular.md` S4

### 🟠 AÇIK — Kasada kupon doğrulama akışı tanımsız
Doküman "tek kullanımlık olmalı" diyor ama kasiyer akışı yok. **Kuponu "kullanıldı" işaretleme yetkisi asla oyuncunun telefonunda olmamalı.** Bu yanlış tasarlanırsa hem kafe güveni hem tüm istatistikler çöker.
→ `03-ozellikler.md` §Kanıt Seviyeleri (K5) ile çözüldü, uygulama bekliyor

### 🟠 AÇIK — Çapraz-kafe XP (§29) ekonomik olarak eksik
"Cafe A'da kazandığın XP ile Cafe B'de ödül aç" — B kafesi bedava değer vermiş oluyor. Mahsuplaşma mekanizması gerekiyor. **V2'ye bırakılmalı.**

### 🟠 AÇIK — Skor doğrulama teknik borcu
Sunucu tarafı doğrulama, hafıza/refleks oyunlarında **deterministik replay** gerektirir (girdi kaydı sunucuya, sunucu skoru yeniden hesaplar). Mimarinin başında konmazsa sonradan eklemek çok pahalı.

### 🟠 AÇIK — KVKK
Kafe paneli "Müşteriler" bölümünde oyuncu davranışı gösteriliyor. Açık rıza metni, veri saklama süresi, kafenin görebileceği alanlar tanımlı değil. Türkiye'de opsiyonel değil.

---

## 8. Özet değerlendirme

**Güçlü:** Stratejik konumlandırma doğru (oyun şirketi değil, sadakat altyapısı). Gelir modeli kafe için risksiz ve performansa bağlı; aboneliğe göre çok daha satılabilir. Promosyon havuzunun nakit olmaması zekice. Dört gelir kanalı aynı trafikten besleniyor. Ürün modülleri eksiksiz düşünülmüş.

**Zayıf:** Ödül ekonomisi hiç sayıya bağlanmamış. Kasada doğrulama akışı yok. 1.500 TL eşiği "ücretsiz" mesajıyla gerilimde. Boost için gereken yönlendirme kanalı henüz ürün olarak tanımlanmamış.

**Karar noktası:** Bir sonraki doküman **"Oyuncu Erişim, Doğrulama ve Ödül Ekonomisi"** olmalı ve şu beşini kesin sayıya bağlamalı:
1. Nitelikli oyuncu olay tanımı
2. Organic vs Boost trafik ayrımı
3. Puan → ödül dönüşüm formülü
4. Günlük havuz tüketim kuralı
5. Kupon doğrulama akışı
