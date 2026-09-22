# 25 — YAYIN PLANI

> **Karar:** demo aşaması kapandı. Ürün doğrudan canlıya, profesyonel
> biçimde çıkacak. Öncelik sırası: **güvenlik → altyapı → mesajlaşma →
> hukuk → kalan ürün işleri.**

**Son güncelleme:** 2026-09-17 · **Durum:** A0 ✅ · A1 ✅ · **F3 hazır, sunucu bekleniyor** · ✅ **her şey commitli**

---

## ⏭️ BURADAN DEVAM ET

> Bu bölüm oturum sıfırlansa bile nerede kalındığını söyler.

### ✅ Commit borcu kapandı — 2026-09-17

Üç dalga art arda commit edildi ve depoda bekleyen iş kalmadı:

| Commit | Ne |
|---|---|
| `ecd8543` | Dalga 7 — butik kipi, platform paneli, on üç iş (Ü125–Ü139) |
| `13971a3` | Dalga 8 — vitrin ürün sahibinin bölüm sırasına geçti (Ü140) |
| `da11163` | **Dalga 9** — hareket turu, dokuz işin dokuzu (Ü141–Ü148) |

`npm run ci` → **629 test, 0 hata**; tip ve lint temiz.
Karar defteri (`docs/02`) **Ü148**'e kadar işlendi.

⚠️ Tek istisna: İlmek'in ham kaynak kareleri (`kahraman.jpg`,
`kahraman-kesik.png` — 2,2 MB, hem `public/` hem `public/avatar/`
altında) **bilerek commit edilmedi**, silinsin mi sorusu ürün
sahibinde. Diskte duruyorlar; `git clean` onları götürür.

### Sıradaki: Dalga 6 → K5

```
Dalga 6 ──► K5 ──► A2 ──► A4 ──► A5 ──► E1, E2, E3
                    │
D1 (avukat) ─── paralel, ama onsuz gerçek müşteriye açılamaz
B + F3 ─────── sunucu + DNS gelince, planın geri kalanından bağımsız
```

**Dalga 6 sanıldığından küçük.** 2026-09-17'de koda bakılarak
doğrulandı: maddeler **39 ve 40 Ü137'de bitmiş**, yalnızca listede
işaretsiz kalmışlardı. Durum:

| # | İş | Boyut |
|---|---|---|
| ✅ 39-kalan | Panel işletme türüne göre farklılaşıyor — Ü150. Butikte "Oyunlar" yok; asıl kapı sunucuda. Yol boyunca: iki durak telefondan **hiç açılamıyordu**, düzeltildi | S |
| ✅ 🔴 | Tohum betiklerinde canlı ortam kilidi — Ü149. `db:demo` bilinen paroladan hesap açıyordu ve `APP_ENV`'a bakmıyordu | S |
| **41** | 🔴 İşletme müşterinin **adını ve telefonunu** görecek — **G1 kalkıyor**, aydınlatma metni ilk gerçek kullanıcıdan önce yeniden yazılmalı | L |
| **42** | Sipariş tutarı kasada girilecek — Ü137'nin *"tutar saklanmıyor"* kararını tersine çeviriyor | M |
| 40-saha | ⚠️ Butik akışı gerçek telefonla hiç denenmedi | — |

**643 test, 0 hata** · tip ve lint temiz.

### F3 · sunucu hâlâ tek eksik

**Demo altyapısı bitti ve uçtan uca kapta doğrulandı.** Kurulum belgesi:
`docs/26-demo-kurulumu.md` (Ü116).

Bekleyen: Türkiye'de bir VPS (Ubuntu 24.04, 2 vCPU / 4 GB) +
`demo.looplybusiness.com` A kaydı. Sunucu hazır olduğunda kurulum yarım
saatlik iş.

⚠️ **Cevapsız soru, üç kez soruldu:** sunucudaki komutları **siz mi
çalıştıracaksınız**, yoksa SSH erişimiyle **ben mi kuracağım**?

### 🔴 D1'in kapsamı Ü124'te bir kez daha genişledi

Şans mevzuatı görüşü zaten canlıya çıkışı tek başına durduruyordu. Ama
soru artık daha ağır:

| Tur | Şansın yeri |
|---|---|
| Ü77 | Şans ödül motorunun merkezine girdi |
| Ü110 | Kafe **ağırlık** yazarak olasılığı etkiliyor |
| Ü117 | Butikte oyun yok → ödül **saf tesadüfe** bağlanıyor (ikinci model) |
| **Ü124** | Kafe artık **doğrudan yüzde** yazıyor: "bu ödül %40 ihtimalle çıksın" |

Yani işletme, kazanma olasılığını açıkça ve sayıyla belirliyor. Avukata
sorulacak şey artık "üründe şans var mı" değil, **"işletmenin
belirlediği olasılıkla ödül dağıtmak nedir"**. D1, D2, D3 aynı randevuda.

### Planda olmayan ama biten iki blok

**1 · Vitrin (madde 38) tamamlandı — Ü118–Ü122.** Bu plan yazıldığında
madde 38 `docs/23` Dalga 6'nın ilk işiydi; bitti ve plana hiç işlenmedi.
`looply.com` artık işletmeye sesleniyor: kaydırmalı sahne (masadaki
karekoda yaklaşma → karekodun içine giriş → oyuncu menüsü → ödül
yağmuru), ürünün **gerçek** ekran görüntüleri, gerçek kafe fotoğrafı.
⚠️ Kalan eksik: **insan fotoğrafı** (kasada kupon gösterimi, oynayan el).
Kodla üretilemez, çekilmesi gerekiyor.

**2 · Panel turu — Ü123–Ü124.** Bu plandaki hiçbir bloğa ait değil; ürün
sahibinin ara istekleriydi. Dokuz iş: geliştirme şeridi kaldırıldı, çark
kendi menü durağına taşındı, "Bugün" takvim oldu, doğrulama defteri
sayfalandı, konum menüden çıktı, katalog/ürünler/kampanyalar yeniden
tasarlandı, logo düzeltildi, çark yüzdeye geçti. Ayrıntısı `docs/02`.

### Son durum

- **590 test, 0 hata** · derleme ve lint temiz
- Kararlar `docs/02-karar-defteri.md`'de **Ü124**'e kadar işlendi
- Yapılacaklar listesi: `docs/23-yapilacaklar.md`
- Veri envanteri (KVKK): `docs/24-veri-envanteri.md`

### ✅ Bu turda bitenler (Ü104–Ü114)

| # | Ne |
|---|---|
| Ü104 | Happy Hour haftalık program + kendi bütçesi |
| Ü105 | Haftalık sezon (liderlik) |
| Ü106 | Günün görevi — çarpan değil hedef |
| Ü107 | 🔴 `happy_hour_plans`a RLS (Ü104'te unutulmuş, yazma sızıntısı) |
| Ü108 | Karekod türleri: masa/kasa/menü/fiş |
| Ü109 | Kafe oyun yönetimi + günün oyunu kafeye bağlandı |
| Ü110 | Çark olasılıkları kafenin elinde |
| Ü111 | 🔴 KVKK envanteri — hesap silme hiç koşmuyordu, parola özeti kalıyordu |
| Ü112 | 🔴 Aydınlatma metni sürümü ile tarihi ayrışmıştı |
| Ü113 | 🔴 "Yazıldı ama bağlanmadı" sınıfı kapatıldı (4 iş bağlanmamıştı) |
| Ü114 | 🔴 Cihaz kaydı çalışmıyordu → **hiçbir kasiyer giremiyordu** |
| Ü115 | 🔴 A1 — personel/yetkili adları şifrelendi + göçlere veri adımı |
| Ü116 | 🔴 F3 demo altyapısı + sunucuya çıkarken bulunan **dört arıza** |

### 🎯 Kapsam kararı: SMS ve WhatsApp OLMADAN yayına hazır hâle getir

Ürün sahibi: *"şimdi SMS ve WhatsApp API olmadan ürünü gerçek piyasaya
çıkarma seviyesine getirelim."*

Yani **C bloğu (mesajlaşma) park edildi**; A, B ve E blokları sonuna kadar
gidiyor. Sağlayıcı bilgisi geldiğinde C tek başına takılacak — arayüz
(`SmsSaglayici`) zaten hazır.

⚠️ **Bilinen sınır:** ürün SMS olmadan **gerçek kullanıcı alamaz** —
kayıt OTP'ye bağlı ve `env.ts` canlı ortamda sahte sağlayıcıyı reddediyor
(Ü81). "Yayına hazır" burada *"SMS bilgisi gelir gelmez çıkılabilir"*
demek, *"SMS'siz çıkılır"* değil.

### ✅ A1 kapandı — Ü115

Bütün adlar artık şifreli:

| Kim | Ad | Telefon |
|---|---|---|
| Oyuncu | 🔒 şifreli | 🔒 şifreli |
| Kafe personeli (`staff.name_enc`) | 🔒 şifreli | 🔒 şifreli |
| Platform çalışanı (`platform_users.name_enc`) | 🔒 şifreli | 🔒 şifreli |
| Kafe yetkilisi (`cafes.contact_name_enc`) | 🔒 şifreli | 🔒 şifreli |

`cafes.legal_name_enc` ve `cafes.address_enc` de şifreli. Düz kalanlar
**bilerek** düz: `cafes.name` (vitrindeki tabela), `slug`, `city`,
`lat/lng` — işletme verisi, kişisel veri değil.

⚠️ **Göç çalıştırıcı yeni bir yetenek kazandı ve A2 onu kullanacak.**
`PII_ENC_KEY` veritabanının dışında olduğu için şifreleme SQL'den
yapılamıyor. `db/migrate.ts` artık `.sql`'in yanındaki aynı adlı `.ts`
dosyasını, `-- @veri-adimi` satırının yerinde ve aynı işlemin içinde
çalıştırıyor.

### Sıradaki iş: A2

**Anahtar rotasyonu.** `docs/08` §5.3 rotasyonu anlatıyor, kodda yok:
`lib/crypto.ts` içinde `KEY_VERSION = 1` sabit ve farklı sürümle
karşılaşınca **hata fırlatıyor**. Bugün bir anahtar sızarsa döndürme
yolumuz yok.

Gereken üç parça:

1. **Birden çok anahtarı aynı anda tanıma** — yeni kayıtlar yeni sürümle
   yazılır, eskiler eski sürümle okunmaya devam eder. Bugün `decryptPII`
   sürüm eşleşmezse atıyor; okuma tarafı sürüm başına anahtar seçmeli.
2. **Yeniden şifreleme geçişi** — satırları eski anahtarla çözüp yeni
   anahtarla yazan bir göç. Ü115'in `-- @veri-adimi` mekanizması tam
   bunun için hazır.
3. **Kör indeks ayrı ele alınır** — `PHONE_INDEX_KEY` rotasyonu bütün
   numaraların çözülmesini gerektiriyor (`docs/08` §5.3), yani ayrı ve
   yalnızca sızıntı şüphesinde koşan bir iş.

⚠️ Karar gerekiyor: **sürüm nerede duracak?** `encryptPII` blob'un ilk
baytına yazıyor; `players` tablosunda ayrı bir `key_version` kolonu da
var ve `docs/08` §5.3 *"şifreli her alanın yanında key_version kolonu
durur"* diyor. İkisi birden fazla — A2 birini seçmeli. Ü115'te yeni
kolon **açılmadı**, karar A2'ye bırakıldı.


---

## Nerede duruyoruz

Ürünün **döngüsü tamamlandı.** Dalga 1–3 kapandı; oyuncu tarafı, kafe
paneli, kupon ekonomisi, bütçe, raporlar, happy hour, karekodlar, oyun
yönetimi ve çark olasılıkları çalışıyor. 566 test geçiyor.

Kalan iş **özellik değil, üretime hazırlık.** Bu plan onu sıralıyor.

---

## ⚠️ Bu planı şekillendiren bir desen

Bu kod tabanında **dört kez** aynı arıza çıktı: bir iş yazıldı, hiçbir
yerden çağrılmadı, ve kimse fark etmedi.

| Ne | Nasıl bulundu |
|---|---|
| Kampanya kuponu üretimi | Ü82 — 403 ödül kuponuna karşı 0 kampanya kuponu |
| `bekleyenleriAc` / `sureDolanlariSupur` | Bakım köprüsü bunun için doğdu |
| `silmeleriUygula` (hesap silme) | Ü111 — KVKK envanteri çıkarılırken |
| `alarm.degerlendir` (saldırı alarmı) | Bu plan yazılırken |

Dördü de aynı imzayı taşıyor: **test fonksiyonu sınıyordu, bağlantıyı
sınamıyordu.** Sonuncusu özellikle kötü çünkü alarm dosyasının kendi
yorumu şunu diyor: *"Saldırı altında olduğumuzu fark etmek, saldırıyı
engellemek kadar önemli. Engelleme sessizce çalışır; kimse bakmazsa
saldırının sürdüğü anlaşılmaz."*

**A0 bu sınıfı kapatıyor** ve plandaki ilk iş o.

---

## 0 · Karar bekleyenler

Bunlar bende iş açmıyor ama yönü belirliyor.

| # | Karar | Durum | Neyi bekletiyor |
|---|---|---|---|
| K2 | SMS sağlayıcısı: Netgsm mi, İletimerkezi mi? | ⏳ | C1, gönderici başlığı |
| K3 | Barındırma sağlayıcısı (Türkiye) | ⏳ | B1 |
| K4 | Tüzel kişi tam unvanı, vergi no, adres | ⏳ | D2 |
| ✅ **K1** | **Uygulama ve veritabanı AYNI sunucuda.** Postgres yalnızca `localhost`'u dinleyecek, dışarı hiç açılmayacak. | **Verildi** | A3 küçüldü — aşağı bkz. |
| ✅ **K5** | **Ödül aralığını kafe belirleyecek.** Kapsam aşağıda. | **Verildi** | Yeni faz — demodan sonra |
| ✅ | WhatsApp Business API kullanılacak | **Verildi** | C2, D3 |
| ✅ | Barındırma Türkiye | **Verildi** | — |
| ✅ | Kapsam yalnızca Türkiye (GDPR yok) | **Verildi** | — |

### K1'in sonucu — A3 küçüldü

Ayrı sunucu tartışmasının **asıl karşı argümanı düştü**: uygulama zaten hem
veritabanı parolasını hem şifreleme anahtarını taşıyor, yani uygulama
sunucusu ele geçerse veritabanı nerede olursa olsun her şey açılır. Ayırmak
koruma sağlamıyor, yalnızca yönetilecek parça sayısını artırıyordu.

Aynı sunucuda ve `listen_addresses = 'localhost'` ile veritabanı
**internetten erişilebilir bir hedef olmaktan tamamen çıkıyor** — açık port
yok, kırılacak parola yok, taranacak yüzey yok.

A3 artık "DB'ye TLS kur" değil, **"veritabanının gerçekten dışarıyı
dinlemediğini doğrula"** işi. Kurulumun parçası.

### K5'in kapsamı — ürün sahibinin sözleriyle

> *"Kafe kendi panelinden ödül çıkacak aralığı TL olarak belirleyebilmeli,
> kaç kaç artacağını da belirlemeli. Cafe ağırlık da belirleyebilmeli;
> böylece o ürünün fiyatı ucuz da olsa daha çok gider. 200 TL'lik ödül
> girip 'bu günde sadece 1 defa çıksın' ya da 'ağırlığı çok düşük olsun'
> diyebilmeli; daha yüksek ihtimalle su veya 20 TL'lik ödül çıksın."*

**Yazılacak olan:**

1. **Ödül değer aralığı ve basamağı kafenin ayarı.** Bugün `katalog.ts`
   sabitleri (`ODUL_EN_AZ` 25 TL, `ODUL_EN_COK` 50 TL, `ODUL_ADIM` 5 TL)
   **ve** göç 0021'in `CHECK` kısıtı kapalı tutuyor. İkisi birden açılacak.
2. **🔴 Ağırlık her yerde geçerli olacak.** Bugün Ü110'un ağırlıkları
   **yalnızca çarkta** çalışıyor; oyun sonu ödülleri `odul-motoru.ts`'in
   kendi sıra tabanlı formülünden geçiyor ve kafenin ağırlığına hiç
   bakmıyor. Kafe "cheesecake daha çok çıksın" dediğinde çarkta çıkıyor,
   oyunda hiçbir şey değişmiyor — **panel de bunu söylemiyor.** Bu, bu
   depoda dört kez çıkan "yazıldı ama yarısına bağlandı" sınıfının
   akrabası ve K5'in içinde kapanacak.

**Zaten var, yeniden yazılmayacak:**

- Ödül başına **günlük adet limiti** + gün/saat penceresi (Ü103) — *"günde
  sadece 1 defa çıksın"* bugün çalışıyor
- Ürün bazında **yüzde kampanyası** (Ü8/Ü17)
- **Günlük bütçe** (taban 1.500 TL/gün, üst sınır yok) ve gün içi tempo
  (Ü87) — oyun ödülleri de bu bütçeden düşüyor

**Yeniden bakılacaklar:**

- **E6 kanıt kademesi** mutlak TL bantlarından (25–35 → K2, 40–50 → K3)
  **kafenin kendi aralığına oransal** hesaba geçecek ve **K3'te
  tavanlanacak.** Sebep: K4 (fiş kodu) bilerek hiçbir yerden verilmiyor
  (Ü108); mutlak bant korunsaydı pahalı ödül **hiç kimseye düşmezdi.**
  ⚠️ Kademeyi gevşetmenin bedeli küçük çünkü iki güçlü koruma daha var:
  günlük adet limiti kaybı tavanlıyor, ve kuponu **yalnızca kasiyer**
  kapatabiliyor (A4/E9, veritabanı kısıtı) — uzaktan kazanılan kupon
  kafeye gelmeden kullanılamıyor.
- **Çark üst sınırı** (`cark_ust_sinir_kurus`) varsayılanı dar aralığa göre
- **Erteleme eşiği** — pahalı ödül daha uzun mu bekletilecek
- **Ağırlık formülü**: Ü49/Ü77'nin sıra tabanlı ağırlığı tam da aralık dar
  olduğu için seçilmişti (`1/değer²` iki kat farkta ayrım kuramıyordu).
  20–200 TL aralığında davranışı **ölçülerek** doğrulanacak (Ü110'daki
  8.000 çevirmelik ölçümün aynısı).

⚠️ **Zamanlama: demodan SONRA.** Patron bir hafta ürünü test edecek; ödül
ekonomisinin merkezini testin hemen öncesinde değiştirmek, onun gördüğü
şeyin hiç oturmamış bir sürüm olması demek.

---

## A · Güvenlik sertleştirme — *bende*

| # | İş | Neden | Boyut |
|---|---|---|---|
| **A0** ✅ | **"Yazıldı ama bağlanmadı" sınıfını kapat** — Ü113 | Dört kez oldu. Arka plan işlerinin bir kaydı olacak ve her birinin çağıranı olduğu sınanacak. Alarm da bu turda köprüye bağlanacak. | S |
| **A1** ✅ | **Personel / yetkili adlarını şifrele** — Ü115 | Oyuncunun adı şifreliydi, personelinki **düz metin**. Beşi de şifrelendi. Yan kazanç: göçler artık uygulama anahtarını gerektiren veri adımı taşıyabiliyor — A2 buna dayanacak. | M |
| **A2** | **Anahtar rotasyonu** | `docs/08` §5.3 rotasyonu anlatıyor, kodda yok: `KEY_VERSION = 1` sabit ve farklı sürüm **hata fırlatıyor**. Anahtar sızarsa döndüremiyoruz. | M |
| **A3** | ~~DB bağlantısında TLS~~ → **veritabanı dışarıyı dinlemiyor mu, doğrula** | K1 verildi: aynı sunucu, `listen_addresses = 'localhost'`. Trafik ağa çıkmadığı için TLS'e gerek kalmadı; iş, Postgres'in gerçekten dışarı kapalı olduğunu doğrulamaya indi. Kurulumun parçası. | XS |
| **A4** | **CSP nonce'a geçiş** | Bugün `script-src` içinde `'unsafe-inline' 'unsafe-eval'` var; bu hâliyle CSP XSS'e karşı neredeyse hiçbir şey yapmıyor. Kodun kendi yorumu zaten "Faz 4'te nonce'a geçilecek" diyor. | M |
| **A5** | **G32 · Platform girişinde TOTP** | Platform yöneticisi **bütün kafelerin** verisine erişiyor ve tek koruma SMS. Oyuncu tarafında SIM swap'e karşı koruma yazdık (G16), platform tarafında yazmadık. | M |

---

## B · Altyapı — *ben + siz*

| # | İş | Not |
|---|---|---|
| **B1** | Canlı Postgres kurulumu | Kısıtlı `cafeplay_app` rolü (RLS buna dayanıyor), `pg_hba` kilidi, WAL arşivi + PITR, otomatik yedek zamanlaması. → K3'e bağlı |
| **B2** | Anahtar üretimi ve kasa | `npm run keys:generate` — altı anahtar. `BACKUP_ENC_KEY` **ayrı yerde** durmalı |
| **B3** | Ters vekil + TLS | Alan adı hazır: `looplybusiness.com` |
| **B4** | **Yedekten geri dönüş tatbikatı** | Betik var (`db:restore-drill`), hiç gerçek koşulmadı. "Yedekten dönebiliyoruz" ancak bir kez gerçekten dönülünce doğru |
| **B5** | Alarm hattı | A0'da köprüye bağlanacak; **nereye** düşeceği burada kurulur (e-posta/WhatsApp) |
| **B6** | Kafe konumlarının girilmesi | Girilmezse K2 düşer, **kimse ödül kazanamaz** |

---

## C · Mesajlaşma — ⏸️ PARK EDİLDİ

> Ürün sahibinin kararı: önce SMS/WhatsApp olmadan yayına hazır hâle
> gelinecek. Bu blok, sağlayıcı bilgisi geldiğinde tek başına takılacak —
> `SmsSaglayici` arayüzü zaten hazır, değişecek tek şey son adım.
>
> ⚠️ Patron *"SMS için entegrasyon lazım olursa hazırda var"* dedi.
> **Hangi sağlayıcı ve onaylı gönderici başlığı var mı** öğrenilirse C1
> ve başlık başvurusu süresi birden kapanır.


| # | İş | Not |
|---|---|---|
| **C1** | SMS sağlayıcı entegrasyonu + gönderici başlığı | Arayüz hazır (`SmsSaglayici`), Netgsm sınıfı boş. Başlık onayı operatörde birkaç iş günü → K2'ye bağlı |
| **C2** | **WhatsApp Business API** | Aynı arayüzün arkasına takılacak. ⚠️ Şablon onayı Meta'da; 24 saat penceresi ve opt-in kuralları SMS'ten farklı |
| **C3** | **İYS entegrasyonu** | ⚠️ **Ticari ileti göndermek için Türkiye'de zorunlu.** Bugün yalnızca hizmet bildirimi gönderiyoruz (kupon açıldı/doluyor) ve onlar kapsam dışı — ama "direkt mesaj" başladığı an zorunlu. Kodda yalnızca `TODO(Faz 10)` var |

### 🔴 md. 9 ARTIK DEVREDE — ve sebebi WhatsApp değil

Bu bölüm *"barındırmayı Türkiye seçtiniz, md. 9 tamamen devre dışı
kalmıştı"* diyordu ve **2026-09-22'de geçerliliğini yitirdi.**

Sebep park edilmiş WhatsApp değil, **e-posta**:

- Ü170 doğrulama kodunu SMS'ten e-postaya taşıdı.
- `src/lib/env.ts:92` canlı ortamın `EPOSTA_SAGLAYICI=console` ile
  açılmasını reddediyor — yani **yayına çıkmak gerçek bir sağlayıcıyı
  zorunlu kılıyor**.
- Enum'daki tek gerçek seçenek Resend ve şirket ABD'de.

Yani aktarım bir tercihle değil, yayına çıkma koşuluyla geldi. Ürün
sahibinin kararı Resend'le devam etmek; envanter buna göre yeniden
yazıldı (`docs/24` §4 ve §5).

⚠️ **Bunun D3'e etkisi:** md. 9 mekanizması artık WhatsApp'a bağlı bir
"ileride" sorusu değil, **canlıya çıkışın koşulu**. Aşağıdaki tabloda
güncellendi.

### WhatsApp'ın ayrı sonucu (hâlâ geçerli)

WhatsApp Business API ile telefon numaraları **Meta'ya** gidiyor ve Türk
bir BSP üzerinden alınsa bile veri Meta altyapısına akıyor. Kanal
açılırsa envantere ikinci bir yurt dışı satır ekler.

⚠️ Artık "boş bölümü bozmak" değil, var olan bölümü büyütmek — bedeli
küçüldü ama yok olmadı.

---

## D · Hukuk — *sizde*

| # | İş | Not |
|---|---|---|
| **D1** | **S7 · Şans mevzuatı görüşü** | 🔴 **Tek başına canlıya çıkışı durduruyor.** Şans, Ü77'den beri ödül motorunun merkezinde. Ü110 ile kafe ağırlık yazıyordu; **Ü124 ile doğrudan yüzde yazıyor** ("bu ödül %40 ihtimalle çıksın"). Ü117 ile butik modelinde beceri payı tamamen kalkıyor. Soru artık "üründe şans var mı" değil, **"işletmenin belirlediği olasılıkla ödül dağıtmak nedir"** |
| **D2** | **S20 · Aydınlatma metni incelemesi** | Hazırlık bitti: `docs/24-veri-envanteri.md`. Tüzel kişi tam unvanı eksik (K4). 🔴 Metindeki *"Kimlerle paylaşıyoruz"* bölümü bugün **"yalnızca operatör hizmet sağlayıcısıyla numaran paylaşılır"** diyor (`app/aydinlatma/page.tsx:87`). E-posta sağlayıcısı orada yok ve *"yalnızca"* kelimesi cümleyi yanlış yapıyor. D3 sonuçlanınca düzeltilecek |
| **D3** | 🔴 **md. 9 mekanizması — E-POSTA için** | **Canlıya çıkışın koşulu, "ileride" değil.** Resend (ABD) doğrulama kodu e-postası gönderiyor ve canlı ortam sağlayıcısız açılmıyor. Açık rıza mı, taahhütname mi? Ayrıca Resend ile veri işleyen sözleşmesi (DPA) ve VERBİS'te yurt dışı aktarım alanı. WhatsApp açılırsa **aynı mekanizmaya ikinci bir satır** ekleniyor |
| **D4** | S6/H2 · Ad-soyad-telefon hukuki sebebi | D2 ile birlikte |

⚠️ **D1, D2 ve D3 aynı randevuda sorulmalı.** Üçü de aynı avukatın
bakacağı şeyler; ayrı ayrı gitmek hem zaman hem para kaybı.

---

## E · Kalan ürün işleri — *bende*

Hiçbiri canlıya çıkışı bloke etmiyor.

| # | İş | Not |
|---|---|---|
| **E1** | 6c · Gece yarısı sınırı | **Dört yerde** bindiriyor: çalışma saatleri, kupon penceresi, happy hour, görev. 02:00'de kapanan kafe hiçbirini doğru kullanamıyor |
| **E2** | 36 · `/verilerim`e ad-soyad düzeltme | Aydınlatma metni şimdilik "e-posta ile" diyor; doğrusu ürünü düzeltmek |
| **E3** | 37 · `sms_outbox` saklama süresi | Temizlik işi yok, süresiz birikiyor. Öneri **12 ay** |
| **E4** | 7b · Blok/Düşen ödül bloğu | İsteğe bağlı |
| **K5** | **Ödül aralığı + basamak kafenin · ağırlık her yerde** | Karar verildi, kapsam §0'da. 🔴 İçinde bir arıza düzeltmesi var: kafenin ağırlıkları bugün yalnızca çarkta işliyor. **Demodan sonra** — ödül ekonomisinin merkezi, test sırasında değişmemeli | L |

---

## F · Çıkış

| # | Adım | Not |
|---|---|---|
| **F1** | Saldırı denemesi — ben | Yetki sınırları, kiracı izolasyonu, para yolu, oturum. ⚠️ Yapısal sınırı var: bu kodu ben yazdım, kör noktalarını da paylaşıyorum |
| **F2** | **Bağımsız sızma testi** | F1'in yerine geçmez, tamamlar |
| **F3** 🟡 | `APP_ENV=staging` ile sunucuya çıkış — Ü116 | **Altyapı hazır ve kapta uçtan uca doğrulandı.** Dockerfile, compose, Caddy (otomatik TLS), ortam şablonu, kurulum belgesi (`docs/26`). Bekleyen tek şey **sunucu + DNS**. 🔴 HTTPS zorunlu: konum doğrulaması güvenli bağlam istiyor, HTTP'de hiç ödül çıkmaz |
| **F4** | Pilot kafe | Tohum verisi silinir, panel Ü80'in kuralına döner |
| **F5** | Yayın | — |

---

## Sıra

```
A0 ✅ ─► A1 ✅ ─► madde 38 ✅ ─► panel turu ✅ ─► COMMIT ✅ ─► Dalga 6 ─► K5 ─► A2 ─► A4 ─► A5 ─► E1,E2,E3
                 (Ü118–Ü122)    (Ü123–Ü124)      (Ü125–Ü148)                                     │
K1 ✅ ──► A3 (kurulumun parçası) ─────────────────────────────────────────────────────────────────┤
K3 ──────► B1,B2,B3,B4,B6 ─────────────────────────────────────────────┤
K2 ──────► C1,C2,C3 (⏸️ park) ─────────────────────────────────────────┤
                                                                       ▼
                                                             F1 ──► F4 ──► F5
                                                                     ▲
D1,D2,D3 (⏸️ ertelendi, sizde) ─────────────────────────────────────┘
```

⚠️ **Sıra değişti — 2026-09-14.** Ürün sahibi: *"şimdilik canlı gibi demoya
geçelim, hemen satmayacağız, patronum 1 hafta test edecek."* Hukuk bloğu
(D) ertelendi, **F3 (staging çıkışı) öne alındı.**

Demo `APP_ENV=staging` + `SMS_PROVIDER=console` ile koşacak: doğrulama kodu
ekranda görünüyor, gerçek SMS beklenmiyor. Alan adı
**`demo.looplybusiness.com`**, tohum verisi duruyor ve patron ayrıca kendi
kafesini sıfırdan kuruyor.

🔴 **HTTPS zorunlu, tercih değil:** konum doğrulaması `navigator.geolocation`
ile yapılıyor ve tarayıcılar bunu yalnızca güvenli bağlamda çalıştırıyor.
HTTP üzerinde hiç kimse ödül kazanamaz — çekirdek döngü kapalı bir demo olur.

**A2, A4, A5, E ve K5 hiçbir karara bağlı değil.** B ve C blokları K2–K3
kararlarını bekliyor. **D1 olmadan F5 olmaz** — ertelenmesi yalnızca demoyu
serbest bırakıyor, yayını değil.

---

## Bu plan nasıl güncellenecek

Her iş bitince kutusu `docs/23-yapilacaklar.md`'de işaretlenir ve karar
defterine (`02`) girer — projenin baştan beri işleyen kuralı. Bu belge
yalnızca **sırayı** tutuyor; ayrıntı oraya yazılıyor.
