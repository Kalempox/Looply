# 07 — Üretim Planı

**Son güncelleme:** 2026-08-22
**Durum:** Plan onaylandı sayılmaz — Faz 1 başlamadan önce ayrıca onay alınacak (G8).

---

## Ürünün kesinleşmiş şekli

**Oyuncu**
```
Masadaki karekod → telefon + ad + soyad → SMS doğrulama kodu → kayıt tamam
   → oyun listesi (10 oyun, kategori yok) + günün bonuslu oyunu
   → oyna → puan ve/veya indirim kuponu
   → kasada kasiyer 6 haneli kodu onaylar
```

**Kafe**
```
Başvuru → belge yükleme → platform onayı → panel açılır
   → haftalık bütçe (min 1.500 TL) → ödül kataloğu → ürün bazlı yüzde kampanyaları
   → gelen oyuncular (anonim), masa hareketi, kazanılan ve kullanılan indirim
```

**Bağlayıcı kararlar:** `02-karar-defteri.md` → Ü1–Ü12, G1–G8, E1–E8.

---

## Bu projenin ne olduğu

> Kişisel veri işleyen ve para değeri taşıyan bir platform. Oyun, giriş kapısı.

İlk kullanıcıdan itibaren elde tutulanlar: **telefon numarası, ad, soyad** ve kafe tarafında **bütçe, indirim tutarları, ciro verisi**. Bu yüzden güvenlik ayrı bir faz değil, **her fazın geçme şartı**.

---

# BÖLÜM 1 · Tehdit modeli

| Varlık | Tehdit | Karşılık | Faz |
|---|---|---|---|
| **Telefon, ad, soyad** | Veritabanı sızıntısı; çalışan merakı | Şifreli saklama + kör indeks; kafe hiç görmez (G1); denetim izi | 1, 3 |
| **SMS doğrulama kodu** | Kaba kuvvet, tekrar kullanım, SIM swap | Kısa ömür, tek kullanım, hash'li saklama, katmanlı kota, kilit | 3 |
| **SMS bütçesi** | Saldırgan bedava SMS yaktırır — doğrudan para kaybı | Numara/IP/cihaz kotası, şüpheli trafikte kesme | 3 |
| **Kupon** | Sahte üretim, tekrar kullanım, tutar oynama | Sunucu otoritesi, tek kullanım DB kısıtı, kasiyer onayı (Ü9) | 7 |
| **Kafe bütçesi, ciro** | Başka kafenin verisini görme | Kiracı kimliği **oturumdan** gelir, istekten asla | 2, 6 |
| **Yüzde kampanyası** | Limitsiz kampanyada kontrolsüz maliyet | Adet + süre limiti **zorunlu alan** (Ü8), dolunca otomatik kapanır | 6 |
| **Oyun skoru** | İstemcide skor uydurma | Sunucu tarafı yeniden hesaplama (S5) | 5 |
| **Kasa cihazı** | Kafede sahipsiz duran tablet | 8 saatlik oturum, PIN, ekran kilidi, uzaktan iptal | 7 |
| **Kafe hesabı** | Sahte kafe kaydı | Belge + manuel onay (G5); onaysız karekod üretilmez | 3 |
| **Uygulama yüzeyi** | Enjeksiyon, IDOR, CSRF, XSS | Şema doğrulama, parametreli sorgu, kimlikten türeyen yetki, başlıklar | 2 |

---

# BÖLÜM 2 · Güvenlik temelleri

Tek bir fazın işi değil; her fazda uygulanır.

## 2.1 · Veri sınıflandırması

| Veri | Saklama | Kafe görür mü | Süre |
|---|---|---|---|
| Telefon numarası | Şifreli + arama için anahtarlı kör indeks | ❌ **Hiç** | Hesap silinene + 30 gün |
| Ad, soyad | Şifreli | ❌ **Hiç** | Hesap silinene + 30 gün |
| Doğrulama kodu | Hash'li | ❌ | 3 dakika |
| Oturum kaydı | Sunucuda, iptal edilebilir | ❌ | 90 gün |
| Anonim oyuncu kodu | Düz — kafe bazında farklı | ✅ | — |
| Puan, skor | Düz | ✅ Anonim kod üzerinden | Anonimleştirilerek kalır |
| Kupon, indirim tutarı | Append-only defter | ✅ Kendi kafesininki | 10 yıl |
| Kafe bütçesi, ciro | Düz | ✅ Sadece kendisi | 10 yıl |
| IP, cihaz parmak izi | Hash'li | ❌ | 90 gün |

**Kural:** Kişisel veri hiçbir log satırına yazılmaz — telefon, isim, doğrulama kodu dahil.

**Anonim kod kafe bazında farklıdır.** Aynı oyuncu A kafesinde `P-4F2A`, B kafesinde başka bir kod alır; kafeler kendi aralarında eşleştirme yapamaz.

## 2.2 · Telefon numarası

Sistemdeki en hassas alan **ve** birincil arama anahtarı. İkisi birden olduğu için:

- **Normalizasyon:** E.164 (`+905321234567`) — tek biçim, yoksa aynı kişi iki hesap açar
- **Arama:** `HMAC-SHA256(numara, arama_anahtarı)` → deterministik kör indeks. Veritabanını ele geçiren, anahtar olmadan numaradan kayıt bulamaz
- **Gösterim:** AES-256-GCM ile şifreli alan
- **Anahtarlar uygulama dışında.** Veritabanı yedeği tek başına sızarsa numaralar açığa çıkmaz
- Platform panelinde bile tam numara **görüntüleme denetim izine düşer**

## 2.3 · SMS doğrulama kodu

| Kural | Değer |
|---|---|
| Uzunluk | 6 hane, kriptografik rastgele |
| Ömür | 3 dakika |
| Kullanım | Tek — doğrulanınca anında geçersiz |
| Saklama | Hash'li. Düz kod ne veritabanında ne logda |
| Karşılaştırma | Sabit zamanlı |
| Yanlış deneme | 5 → numara 15 dakika kilitli |
| Aynı numaraya gönderim | 1/dk · 5/saat · 10/gün |
| Aynı IP'den gönderim | 5/saat |
| Aynı cihazda hesap | 30 günde 2 |
| SMS metni | Kafe adı yok, link yok — kimlik avı yüzeyi açılmasın |
| Numara değişikliği | Hem yeni hem eski numaraya doğrulama |

OTP aynı zamanda bir **maliyet kapısı**: sınırsız bırakılırsa saldırgan bedava SMS yaktırır.

### 🔴 Global SMS tavanı

Numara ve IP başına kotalar tek başına yetmez: saldırgan 500 farklı numara ve 200 farklı IP kullanırsa **her kotanın içinde kalır** ve yine de binlerce SMS yaktırır. Kotaların üstünde bir de toplam tavan gerekir.

| Eşik | Davranış |
|---|---|
| Günlük tavanın **%70**'i | Uyarı — ilgili kişiye bildirim |
| **%90** | **Yeni kayıt durur.** Mevcut kullanıcı girişi devam eder |
| **%100** | SMS tamamen durur; ekranda "şu an doğrulama yapılamıyor" |

**Sıralama önemli:** önce kayıt durur, giriş en son. Saldırının hedefi kayıt akışıdır; mevcut kullanıcıyı sistemden atmak, saldırganın işini görmek olur.

Başlangıç tavanı `sms_daily_global_cap` = 2.000/gün. Gerçek trafiği gördükçe ayarlanır.

## 2.4 · Oturum ve yetkilendirme

| Rol | Oturum | Ek şart |
|---|---|---|
| Oyuncu | 90 gün | Cihaz bağlı |
| Kafe yöneticisi | 12 saat | Kritik işlemlerde ikinci faktör |
| Kasiyer | 8 saat | PIN + ekran kilidi |
| Platform | 8 saat | İkinci faktör zorunlu |

- Çerez: `HttpOnly`, `Secure`, `SameSite=Lax`
- Oturumlar sunucuda tutulur → **uzaktan iptal edilebilir** (çalınan tablet, ayrılan personel)
- **`cafe_id` hiçbir zaman istekten okunmaz, her zaman oturumdan türetilir.** Çapraz kiracı sızıntısının tek gerçek panzehiri
- Her uç nokta için otomatik test: *"A kafesinin oturumuyla B'nin verisi istenirse ne olur?"*

## 2.5 · Uygulama yüzeyi

- Her API girişinde şema doğrulama; doğrulanmamış veri iş mantığına girmez
- Parametreli sorgu, istisnasız
- CSRF: SameSite + origin kontrolü
- Başlıklar: CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Hız sınırı üç katmanda: IP, cihaz, hesap
- Hata mesajları bilgi sızdırmaz
- Kilitlenmiş bağımlılıklar + düzenli güvenlik taraması

## 2.6 · Denetim izi

Silinemez; parayla veya kişisel veriyle ilgili her işlemde:
kupon onayı ve geri alma · bütçe ve kampanya değişikliği · kişisel veri görüntüleme · rol değişiklikleri.

## 2.7 · KVKK ve İYS

- **Aydınlatma metni** + **açık rıza** — ayrı ayrı. Hizmet için zorunlu veri ile pazarlama izni aynı kutuda olamaz
- **Pazarlama mesajı için ayrıca İYS kaydı** (G7)
- **18+ zorunlu** (Ü2) — çocuk verisi hiç işlenmediği için veli onayı rejimi devreye girmez
- Veri sahibi hakları panelden: görme, düzeltme, silme, taşıma
- Silme: kişisel alanlar 30 gün içinde silinir; finansal defter **anonimleştirilerek** kalır
- Sunucu Türkiye'de (G3) → yurt dışına aktarım yükümlülüğü doğmaz
- Metinler avukat onayından geçecek (G6)

## 2.8 · Yedekleme

Veri sızıntılarının en yaygın yolu canlı veritabanı değil, **korumasız yedek**. Yedek, canlı sistemin tüm verisini taşır ama çoğu zaman onun korumalarının hiçbirine sahip değildir.

| Konu | Kural |
|---|---|
| Sıklık | Günlük tam yedek + sürekli WAL arşivi |
| **Şifreleme** | Yedek dosyası şifreli. Anahtar, uygulama anahtarlarından **ayrı** |
| Konum | Farklı fiziksel konum, **Türkiye içinde** (G3) |
| Erişim | İki kişilik onay; her erişim denetim izine düşer |
| Saklama | **30 gün.** Daha uzunu, "sildik" beyanını yalan yapar |
| **Geri yükleme tatbikatı** | **Ayda bir.** Geri yüklenemeyen yedek, yedek sayılmaz |

Veritabanı satırları zaten şifreli (telefon, ad, soyad). Yedeğin ayrıca şifrelenmesi savunma derinliği: yedek dosyası sızarsa saldırganın elinde iki ayrı anahtar eksik kalır.

## 2.9 · İzleme ve alarm

Saldırı altında olduğumuzu **fark etmek**, saldırıyı engellemek kadar önemli. Aşağıdakiler alarm üretir:

| Belirti | Ne anlama gelir |
|---|---|
| Doğrulama hatası oranı normalin 3 katı | Kaba kuvvet denemesi |
| Günlük SMS tavanının %70'i | Kota saldırısı veya beklenmedik trafik |
| Tek kafede saatlik kupon onayı normalin 5 katı | Kupon sahteciliği veya kasiyer hatası |
| Bir cihazdan 30 günde 2'den fazla hesap denemesi | Sahte hesap üretimi |
| **Çapraz kiracı testinin CI'da kırılması** | Dağıtım anında durur |
| 5xx oranı sıçraması | Arıza |
| Bağlantı havuzu doluluğu | Yük veya sızdıran sorgu |

Ayrıca dışarıdan kontrol edilen bir **sağlık ucu** ve çalışma süresi izlemesi.

## 2.10 · Acil durdurma

Bir sorun anlaşıldığında ilk yapılacak şey, hasarı durdurmak. Bunun **tasarlanmış bir yeteneği** olmalı — o an kod yazılarak yapılamaz.

Platform panelinde tek ekran, dört düğme:

| Düğme | Etkisi |
|---|---|
| **Kafeyi askıya al** | O kafede karekod, kupon, panel — hepsi durur |
| **Tüm oturumları iptal et** | Herkes çıkar; çalınan cihaz senaryosu |
| **Kupon dağıtımını durdur** | Mevcut kuponlar kullanılabilir, yenisi çıkmaz |
| **SMS'i durdur** | Kayıt ve giriş durur; maliyet saldırısı kesilir |

Dördü de geri alınabilir ve her kullanım denetim izine düşer.

## 2.11 · Olay müdahale planı

> ⚠️ **Faz 3'ten önce yazılmış olmalı.** Faz 3'te gerçek telefon numaraları sisteme girmeye başlıyor; o andan itibaren bir ihlal ihtimali var ve KVKK bildirim süresi **72 saat**.

Asgari plan dört soruya yazılı cevap verir:

| Soru | Cevabı önceden belli olmalı |
|---|---|
| **Kim haber alır?** | Tek bir isim ve telefon numarası. "Ekip" değil, kişi |
| **Kim durdurabilir?** | Acil durdurma yetkisi kimde — §2.10 |
| **Kapsam nasıl belirlenir?** | Hangi loglara bakılır, hangi sorgular çalıştırılır |
| **Kim bildirir?** | Kurul'a ve etkilenen kişilere bildirimi kim, hangi metinle yapar |

**Zaman çizelgesi:** ilk 1 saat durdurma · ilk 24 saat kapsam tespiti · 72 saat içinde Kurul bildirimi.

Yılda bir kez masabaşı tatbikat: gerçek bir senaryo okunur, adımlar sözlü olarak yürütülür. Hiç denenmemiş plan, plan değildir.

---

# BÖLÜM 3 · Teknoloji

| Katman | Seçim | Gerekçe |
|---|---|---|
| Uygulama | Next.js (App Router) + TypeScript | Üç yüzey (oyuncu / kafe / kasa) tek kod tabanında |
| İstemci | **Web — kurulum yok** (Ü12) | Karekod okutan kişi uygulama indirmez. Safari, Chrome, Samsung Internet, Firefox |
| Veritabanı | **PostgreSQL** | İşlem bütünlüğü, kısıtlar, eşzamanlılık, yedekleme. Defter sistemi bunu gerektirir |
| Sorgu katmanı | Elle yazılmış SQL + ince tip sarmalayıcı | Kritik güvenceler (UNIQUE, CHECK, koşullu UPDATE) doğrudan SQL'de dursun |
| Barındırma | **Türkiye'de sunucu** (G3) | Sağlayıcıya özgü özellik kullanılmaz — taşınabilir kalır |
| SMS | Sağlayıcıdan bağımsız arayüz (G4) | Geliştirmede sahte sağlayıcı, sahada gerçeği |
| Oturum | Sunucu tarafı, iptal edilebilir | Çalınan cihaz senaryosu |

### Tarayıcı gerçekleri — plana etkisi

- **Konum izni (K2)** her tarayıcıda kullanıcı onayı ister ve HTTPS zorunludur. Reddedilirse K2 alınamaz → o oturum düşük kanıt seviyesinde kalır, büyük ödül alamaz. Akış buna göre tasarlanacak
- **iOS Safari'de bildirim**, ancak site ana ekrana eklenirse çalışır. Yani ertelenmiş kuponu hatırlatmanın güvenilir yolu bildirim değil, **SMS** — bu da hem maliyet hem İYS izni demek (G7). Faz 8 sonrası konusu
- Karekod okutma cihazın kendi kamerasıyla yapılır; uygulama içi tarayıcılarda (Instagram, Facebook) kamera ve konum kısıtlı olabilir → **harici tarayıcıda aç** yönlendirmesi gerekebilir

## 3.1 · Sürekli entegrasyon (CI)

Güvenlik kapıları elle çalıştırılırsa er ya da geç unutulur. Her değişiklikte otomatik koşar:

1. Tip kontrolü ve lint
2. Birim testler
3. **Çapraz kiracı erişim testi**
4. **Loglarda kişisel veri taraması**
5. Bağımlılık güvenlik taraması

Herhangi biri kırmızıysa **dağıtım yapılmaz.** "Güvenlik kapısı" fikrinin otomatikleşmiş hâli budur — insan iradesine bağlı kalmaz.

## 3.2 · Dağıtım ve geri alma

Üç ortam: **geliştirme → hazırlık → canlı.** Canlıya yalnızca hazırlıkta doğrulanmış sürüm çıkar.

### 🔴 Göçler asla yıkıcı olmaz

Bir veritabanı göçü kolon silerse geri dönüş imkânsızlaşır. Bu yüzden:

| Yerine | Bunu yap |
|---|---|
| Kolonu sil | Önce kullanımdan kaldır, iki sürüm sonra sil |
| Kolonu yeniden adlandır | Yeni kolon ekle, çift yaz, sonra eskisini bırak |
| Tipi değiştir | Yeni kolon + geriye dönük dolgu |

Böylece **her dağıtım geri alınabilir** kalır: yeni sürüm bozulursa bir önceki sürüm aynı şemayla çalışmaya devam eder.

### Dağıtım adımları

1. CI yeşil
2. **Otomatik yedek** alınır
3. Göçler uygulanır (yalnızca ekleyici)
4. Yeni sürüm devreye alınır
5. Sağlık kontrolü + 10 dakika gözlem

**Geri alma:** bir önceki sürüme dönüş, hedef 5 dakika. Şema geriye uyumlu olduğu için veritabanına dokunulmaz.

Sıfır kesinti hedefi yok — bu ölçekte kısa bakım penceresi kabul edilebilir ve çok daha basit.

---

# BÖLÜM 4 · Fazlar

Her fazın başında onay alınır, sonunda sonuç gösterilir (G8).
**Hiçbir faz, güvenlik kapısı geçilmeden bitmiş sayılmaz.** Kapı bir kod incelemesi değil, çalıştırılabilir testtir.

## Süre tahmini

> ⚠️ Tahminler **tek geliştirici** ve odaklanmış çalışma günü varsayımıyla.
> Yazılım tahminleri doğası gereği iyimserdir; alt sınır değil **üst sınır** planlanmalı.

| Faz | Tahmin | Not |
|---|---|---|
| 1 · Güvenlik ve veri modeli | ✅ bitti | |
| 2 · İskelet ve izolasyon | **3–4 gün** | Yarısı yazılmış; yedekleme, izleme, CI eklendi |
| 3 · Kimlik | **6–8 gün** | En riskli faz; iki kimlik sistemi + KVKK ekranı + inceleme |
| 4 · Oyuncu ana ekranı | **2–3 gün** | |
| 5 · Oyun motoru + 3 oyun | **5–7 gün** | Motor bir kez, oyunlar sonra ucuzlar |
| 6 · Kafe paneli | **4–5 gün** | |
| 7 · Kupon ve kasa onayı | **4–5 gün** | Eşzamanlılık testleri zaman alır |
| 8 · Kafe raporları | **3–4 gün** | |
| 9 · Kalan 7 oyun + masa mekanikleri | **7–10 gün** | Oyunlar en büyük tek kalem |
| 10 · Sertleştirme ve pilot | **4–6 gün** | + dış inceleme süresi |
| **Toplam** | **38–52 gün** | Kesintisiz çalışma varsayımıyla |

### Kod dışı bekleme süreleri

Bunlar geliştirmeyle paralel yürür ama **erken başlatılmazsa bloke eder**:

| İş | Süre | Bloke ettiği |
|---|---|---|
| SMS gönderici başlığı onayı | Birkaç iş günü | Faz 3'ün sahaya çıkması |
| Avukat — KVKK ve İYS metinleri | 1–2 hafta | Pilot |
| Bağımsız güvenlik incelemesi | Randevu + birkaç gün | Faz 3 kapısı |
| Barındırma kurulumu | 1–2 gün | Hazırlık ortamı |

---

## Faz 1 · Güvenlik ve veri modeli — *kod yok* ✅ **TAMAMLANDI**

Çıktı: [`08-guvenlik-ve-veri-modeli.md`](08-guvenlik-ve-veri-modeli.md)

1. Veri sınıflandırma tablosunu alan alan doldur
2. Rol × yetki matrisi — dört rol, her tabloda ne yapabilir
3. Kimlik akış şemaları: oyuncu kaydı, kafe kaydı, personel girişi, numara değişikliği, hesap silme
4. Şifreleme ve anahtar yönetimi kararı
5. Saklama ve silme takvimi
6. KVKK ve İYS metin taslakları *(avukata gidecek)*
7. Log politikası: ne loglanır, ne loglanmaz
8. Veritabanı şeması — tablo tablo, kısıtlarıyla

**Biterken:** Şema yazmaya hazır, tartışmalı alan kalmamış.

---

## Faz 2 · İskelet ve kiracı izolasyonu ✅ **TAMAMLANDI** — 2026-08-23

> **Güvenlik kapısı geçildi:** 25/25 test · yedekten geri yükleme fiilen yapıldı · CI boru hattı kuruldu.
> Ayrıntı: `09-faz2-kapi-raporu.md`

1. Proje kurulumu, ortam ayrımı (geliştirme / hazırlık / canlı)
2. Sır yönetimi — hiçbir anahtar depoda durmaz
3. PostgreSQL, göç düzeni
4. Kiracı izolasyon katmanı — `cafe_id` oturumdan türer, sorgu katmanı bunu zorunlu kılar
5. Güvenlik başlıkları, hız sınırı, şema doğrulama katmanı
6. Yapılandırılmış log + denetim izi tablosu
7. **Yedekleme** — şifreli, ayrı anahtarlı, geri yükleme tatbikatıyla (§2.8)
8. **İzleme ve alarm** — sağlık ucu, hata izleme, alarm eşikleri (§2.9)
9. **CI** — beş adımlı boru hattı; kırmızıysa dağıtım yok (§3.1)

**Biterken:** Boş ama güvenli bir iskelet; iki sahte kafe ile izolasyon gösterilebiliyor.

**Güvenlik kapısı**
- Çapraz kiracı test paketi — her uç nokta için "başkasının verisini iste" → hepsi reddedilmeli
- Log çıktısında kişisel veri taraması → sıfır sonuç
- **Yedekten geri yükleme bir kez fiilen yapılmış olmalı** — beyan yetmez
- **CI boru hattı çalışıyor** ve yukarıdaki iki testi kendisi koşuyor

---

## Faz 3 · Kimlik 🟡 **TAMAMLANDI** — 2026-08-23

> **Güvenlik kapısı geçildi, bir açık madde var:** platform girişinde ikinci
> faktör yok (G32). Rapor: [`11-faz3-kapi-raporu.md`](11-faz3-kapi-raporu.md)

En riskli faz. Oyuncu ve kafe tarafı aynı güvenlik temelini paylaştığı için birlikte yapılır.

> **Ön koşul:** §2.11 olay müdahale planı yazılmış olmalı. Bu fazda gerçek
> telefon numaraları sisteme girmeye başlıyor.

**Oyuncu**
1. Karekod → kafe ve masa çözümleme, 90 sn'lik tek kullanımlık token (K1)
2. Telefon + ad + soyad formu; 18+ beyanı; KVKK aydınlatma ve rıza (pazarlama izni ayrı kutu)
3. SMS sağlayıcı arayüzü + sahte sağlayıcı
4. Kod üretimi, gönderimi, doğrulaması — §2.3'ün tamamı, global tavan dahil
5. Oturum açılışı, cihaz bağlama; **yeni cihazdan girişte bildirim**
6. Numara değişikliği — çift doğrulama + **24 saat ödül kilidi** (SIM swap koruması)
7. Hesap silme, 30 günlük pencere
8. **"Verilerim" ekranı** — KVKK m.11 hakları: göster, düzelt, indir, sil, ticari ileti iznini geri al

**Kafe**
1. Başvuru formu: işletme adı, adres, yetkili, telefon
2. Belge yükleme + **platform onay ekranı** (G5)
3. Kafe yöneticisi girişi + ikinci faktör
4. Personel hesabı ve PIN yönetimi

**Biterken:** Karekod okutulup gerçekten kayıt olunabiliyor; onaylanmamış kafe hiçbir şey yapamıyor.

**Güvenlik kapısı**
- Kaba kuvvet → kilit devreye girmeli
- SMS seli → kotada durmalı
- Süresi geçmiş / kullanılmış kod → reddedilmeli
- Veritabanı dökümünde telefon numarası düz metin **görünmemeli**
- Kafe A yöneticisi, kafe B'nin hiçbir uç noktasına erişememeli
- Onaysız kafe için karekod üretilememeli
- Global SMS tavanı aşıldığında **önce kayıt** durmalı, giriş çalışmaya devam etmeli
- Numara değiştikten sonra 24 saat kupon kullanılamamalı
- **Bağımsız güvenlik incelemesi** — kimlik akışı, OTP ve oturum yönetimi. En riskli faz burası; Faz 10'daki tam sızma testini beklemeye gelmez

---

## Faz 4 · Oyuncu ana ekranı

> **Not (2026-08-23):** Faz 3'te yazılan oyuncu ekranları **işlevsel iskelet** —
> akışın çalıştığını göstermek için yapıldılar, tasarlanmadılar. Ürün sahibi
> gördü ve "şimdilik böyle kalsın" dedi. Oyuncu arayüzünün gerçek tasarımı
> bu fazın işi; mevcut ekranlar baştan ele alınacak.

1. Karekod sonrası karşılama — hangi kafe, hangi masa
2. **Günün bonuslu oyunu** üstte, ayrı
3. 10 oyunluk düz liste (kategori yok — Ü10)
4. Puanım, kuponlarım, kazanılan indirim özeti
5. Kafe dışında açılış: oynanır ama hiçbir şey kazandırmaz, ekranda açıkça yazar (Ü3)

**Eklenen kapsam (2026-08-23, ürün sahibi):**

6. **Ödüllerim** — kazanılan ödüllerin envanteri; hangi kupon hangi kafede geçerli
7. **Profilim** — kafe bazlı seviye ve rozetler
8. **Kafe geçmişi** — hangi kafede hangi oyunlar oynandı
9. **Buradaki fırsatlar** — bulunulan kafenin aktif indirim ve kampanyaları
10. **Acil durdurma ekranı** (G18) — platform panelinde dört düğme, §2.10

> ✅ **S18 ve S19 kapandı (2026-08-24).** Seviye **XP**'ye dayanıyor (Ü14): ayrı,
> harcanmayan sayaç, yalnızca kafede kazanılıyor. Seviye **kafe bazında** (Ü15) —
> global profil seviyesi yok. Rozetler **yalnızca statü** (Ü16): platform tanımlı
> sabit liste, ekonomik değer yok. İki ekranın da önü açık.

**Faz 4'ün ilk yarısı yazıldı (2026-08-23/24):** masa oturumu, K2 konum doğrulaması, durum şeridi, oyuncu giriş ekranı.

**Biterken:** Kayıttan sonra oyuncu gerçek bir ana ekran görüyor; oyunlar henüz yer tutucu.

**Güvenlik kapısı**
- Ekrandaki her sayı sunucudan gelir
- Kafe dışı oturumda hiçbir kazanım kaydı oluşmaz — **puan da XP de yazılmaz** (Ü3, Ü14)
- XP defteri append-only ve kafe bazlı; başka kafenin XP'si okunamaz (Ü15 + G12)
- Rozet hiçbir kazanım kaydı üretmez — puan, kupon veya bütçe defterine dokunmaz (Ü16)
- Acil durdurma dört düğmesi gerçekten durdurur ve her kullanım denetim izine düşer (G18)

---

## Faz 5 · Oyun motoru + ilk 3 oyun

1. Oturum başlatma — tohum (seed) sunucudan
2. Girdi kaydı → sunucuya gönderim
3. **Sunucu skoru yeniden hesaplar**; istemciden gelen skor yalnızca denetim için saklanır
4. Takılabilir oyun arayüzü — yeni oyun eklemek kod değişikliği değil, dosya eklemek olsun
5. İlk 3 oyun (Ü21), her birine **5 bölüm**
6. Bonuslu oyun çarpanı

**Oyun sözleşmesi.** İstemci ve sunucu **aynı modülü** çalıştırır; doğrulama, girdi kaydı üzerinde `fold` işlemidir:

```
baslat(tohum) → Durum
uygula(Durum, Girdi) → Durum | null      // geçersiz hamle null döner
bittiMi(Durum) → boolean
skor(Durum) → number
```

**Deterministik rastgelelik zorunlu:** tohumlu PRNG kullanılır, `Math.random()` oyun modüllerinde lint kuralıyla yasaklanır. Tek bir kayan nokta farkı replay'i bozar ve dürüst oyuncunun skoru reddedilir.

**İlk üç oyun ve girdi biçimleri (Ü21):**

| Oyun | Girdi kaydı | Sunucu doğrulaması |
|---|---|---|
| **Blok yerleştirme** | `(teklif no, satır, sütun)` | Tohumdan aynı parçaları üret, yerleşimleri tekrar oyna. Zaman hiç yok |
| **Düşen blok** | `(tick, tuş)` | Sunucu aynı oyun döngüsünü çalıştırır: yerçekimi, kilit gecikmesi |
| **Kelime bulmaca** | Gönderilen kelimeler | Harf setini tohumdan üret, listeden doğrula, skoru topla |

Üçü kasıtlı olarak **farklı girdi biçimleri** üretiyor — "yeni oyun eklemek dosya eklemektir" iddiası ancak böyle sınanır.

> **İçerik geçici (ürün sahibi, 2026-08-25):** bölüm içerikleri ve kelimeler
> göstermelik. Kalıcı olan motor ve sunucu doğrulaması; içerik sonradan
> değiştirilebilir veri.

**Biterken:** Üç oyun gerçekten oynanıyor, skorlar sunucuda doğrulanıyor, puan ve XP yazılıyor.

**Güvenlik kapısı**
- Değiştirilmiş istemciyle yüksek skor gönderimi → reddedilmeli
- Aynı oturumun tekrar gönderimi → reddedilmeli
- Günlük puan tavanı aşılamamalı
- Kafe dışında oynanan oyun **ne puan ne XP** yazmamalı (Ü3, Ü14)
- Süresi geçmiş veya başkasına ait oturum kabul edilmemeli
- Girdi kaydına **boyut sınırı** — sınırsız kayıt, sunucuyu yeniden oynatarak yormanın en ucuz yolu

---

## Faz 6 · Kafe paneli — bütçe, ürün, kampanya

1. Haftalık bütçe belirleme (min 1.500 TL, altına inilemez)
2. Ürün listesi — kafe kendi menüsünü girer
3. Ödül kataloğu — **iki tip** (Ü18: kafe bakiyesi v1'de yok):
   - 🏆 **Ürün ödülü** — kafenin kendi ürünü, TL değeriyle. Nakde çevrilemez
   - 🎟️ **İndirim kuponu** — yüzde + **zorunlu TL tavanı** (`%20 · en fazla 100 TL`)
4. **Ürün bazlı yüzde kampanyası** — adet ve süre limiti **zorunlu alan**; TL tavanıyla bütçeye dahil (Ü17)
5. Kampanya yayına alma / durdurma, canlı sayaç
6. Bütçe durumu: dağıtılabilir kalan, **tavandan rezerve edilen**, fiilen harcanan, iade edilen

**Biterken:** Kafe kendi bütçesini ve kataloğunu kuruyor; oyuncu tarafı bunu görüyor.

**Güvenlik kapısı**
- Her yazma işlemi denetim izine düşmeli
- Bütçe alt sınırın altına indirilememeli
- Limitsiz yüzde kampanyası kaydedilememeli — **TL tavanı olmadan kaydedilememeli** (Ü17)
- Başka kafenin ürünü veya kampanyası düzenlenememeli

---

## Faz 7 · Ödül, kupon ve kasa onayı

Para değerinin gerçek dünyaya çıktığı yer. En sıkı faz.

1. Ödül kazanma kuralları — anlık ve katalog
2. Bütçeden rezervasyon — yüzdeli kuponda **TL tavanı** kadar (Ü17)
3. Kupon üretimi — tek kullanımlık **jeton**; oyuncu ekranında **QR**, altında yedek **6 haneli kod** (Ü19). QR jetondan başka hiçbir şey taşımaz
4. **Kasa ekranı:** PIN girişi → QR okut **veya** kodu gir → doğrula → ONAYLA
5. 60 saniyelik geri alma
6. Süre dolumu → bütçeye iade
7. Kupon durum makinesi + append-only defter
8. Yüzdeli kuponda kapanış: gerçekleşen tutar harcanan yazılır, **tavan ile fark bütçeye iade edilir** (Ü17)
9. Kasiyer kupon geçmişi — "bugün 23 kupon: 8 kahve, 7 tatlı, 5 indirim, 3 diğer"

**Biterken:** Uçtan uca döngü çalışıyor — oyna, kupon al, kasada kullandır, bütçeden düşsün.

**Güvenlik kapısı**
- Aynı kupon iki kez onaylanamamalı — **eşzamanlı** iki istekte bile
- **Aynı jeton QR'dan ve koddan aynı anda gelirse yalnızca biri geçmeli** (Ü19)
- Oyuncu kendi kuponunu "kullanıldı" yapamamalı
- Başka kafenin kuponu kabul edilmemeli
- Tutar istemciden gelen değere göre değil, kayıttaki değere göre düşmeli
- **Değiştirilmiş QR içeriği ödül değerini değiştirememeli** — QR yalnızca jeton taşır
- Bütçe negatife düşememeli

---

## Faz 8 · Kafe raporları ✅ **TAMAMLANDI** — 2026-08-26

> Kapı raporu: `16-faz8-kapi-raporu.md`. Beş madde de yerinde, üç kapı şartı da
> geçti (210 test). Aynı geçişte arayüz Ü31'e taşındı.

1. Gelen oyuncular — **anonim kod**, zaman damgalı doğrulama defteri
2. Masa bazlı hareket
3. Kazanılan ve **fiilen kullanılan** indirim — ikisi ayrı; asıl sayı ikincisi
4. Kampanya sonuç raporu
5. Dışa aktarma

**Not:** Bu fazdan önce **S14 (platform geliri)** çözülmeli — kafeye gösterilen rapor, satılan şeyin kanıtıdır.

**Güvenlik kapısı**
- Rapor çıktısında hiçbir kişisel veri bulunmamalı
- Az kişilik istatistikten kimlik çıkarımı yapılamamalı
- Rapor görüntüleme denetim izine düşmeli

---

## Faz 9 · Kalan 7 oyun + masa mekanikleri + davet sistemi 🟡 **DAVET BLOĞU BİTTİ** — 2026-08-27

> Kapı raporu: `19-faz9-davet-kapi-raporu.md`. Dört güvenlik kapısı şartının
> dördü de davet bloğuna ait ve dördü de geçti. Blok durumu:
>
> | Blok | Durum |
> |---|---|
> | Davet + fraud (Ü20) | ✅ bitti — `19-faz9-davet-kapi-raporu.md` |
> | **Ö1 · Masayı Fethet** | ✅ bitti — 2026-08-27, 18 test |
> | **Ö3 · Happy Hour havuzu** | ✅ bitti — 2026-08-27, 19 test |
> | **D11 · Masa karekodları** | ✅ bitti — 2026-08-27, 7 test |
> | Ö2 · Masa oyunu (takım) | ⬜ en büyük parça; oyun sözleşmesi tek kişilik |
> | Ö4 · Ürün itme | ✅ Faz 6'da yazıldı (`percentage_campaigns`) |
> | Kalan 7 oyun | ⬜ S17 kararı bekliyor → `18-oyun-adaylari.md` |

Kabul edilmiş özellikler (`02-karar-defteri.md` Ö1–Ö4): Masayı Fethet, Happy Hour, ürün itme, masa oyunu.

**Davet (referral) sistemi + fraud motoru** — Ü20 ile bu faza alındı:

1. Benzersiz davet bağlantısı (`/r/8KX92A`)
2. Davet durum makinesi — `CLICKED → REGISTERED → PHONE_VERIFIED → GAME_STARTED → GAME_COMPLETED → CAFE_VERIFIED → QUALIFIED → REWARDED`, yanında `REJECTED / EXPIRED`. Her geçiş kayıtlı: "bu davet neden ödül almadı" cevaplanabilmeli
3. **Nitelikli davet yedi şartı** — telefon doğrulandı · yeni kullanıcı · davet bağlantısından geldi · oyunu oynadı · tamamladı · asgari etkileşimi geçti · **kafe karekodu etkileşimi yaptı** · fraud kontrolünden geçti
4. Fraud motoru — kimlik, cihaz/oturum, ağ, davranış ve davet deseni sinyalleri **risk skoruna** dönüşür; tek sinyal tek başına suçlu ilan etmez
5. Davet ödülü **XP** (Ü14, Ü20) — para değerli ödül yok

> **Tasarım kararı:** telefon doğrulaması tek başına davet başarısı **değil**. Ödül ancak gerçek kafe etkileşimiyle geliyor; sahte numarayla hesap üreten ödül alamıyor.
>
> **Ayrım:** fraud davet ≠ fraud kullanıcı. Şüpheli davetin ödülü bekletilir veya reddedilir, kullanıcı platformdan atılmaz.

Çekirdek döngü sağlam çalışmadan hiçbiri eklenmez.

**Güvenlik kapısı**
- Kendi kendini davet eden ödül alamamalı
- Aynı cihaz/numara ikinci kez nitelikli davet üretememeli
- Davet ödülü bütçeye veya puana dokunmamalı — yalnızca XP yazmalı
- Risk skoru ve reddetme gerekçesi denetim izine düşmeli

---

## Faz 10 · Sertleştirme ve pilot

1. Bağımsız güvenlik incelemesi / sızma testi
2. **Platform girişine TOTP ikinci faktör** (G32) — Faz 3'ten devreden açık madde
2. Yük testi — özellikle SMS ve kupon onay uçları
3. Yedekleme ve **geri dönüş tatbikatı** — yedeği geri yükleyebildiğini kanıtla
4. KVKK ve İYS belgelerinin son hâli
5. Olay müdahale prosedürü
6. Tek kafede saha pilotu

---

# BÖLÜM 5 · Planın değişmez kuralları

1. **Hiçbir faz, güvenlik kapısı geçilmeden bitmez.** Kapı çalıştırılabilir testtir.
2. **Kişisel veri hiçbir loga yazılmaz.**
3. **`cafe_id` istekten okunmaz, oturumdan türetilir.**
4. **Para değeri taşıyan hiçbir sayı istemciden kabul edilmez.**
5. **Finansal kayıt güncellenmez, yeni satır yazılır.**
6. **Her fazın başında onay alınır** (G8).
7. **Her faz çalışan ve gösterilebilir bir şeyle biter.**

---

# BÖLÜM 6 · Kalan karar noktaları

| # | Konu | Bloke ettiği |
|---|---|---|
| S14 | **Platform geliri** — sistemde platformun para kazandığı nokta yok | Faz 8 |
| S17 | **10 oyunun listesi** — hepsi deterministik replay'e uygun olmalı | Faz 5 |
| S15 | Bonuslu oyunu kim ve hangi sıklıkta belirliyor — *şu an tarihten türetiliyor, platform seçiyor; kalan Faz 4 ekranlarını bloke etmiyor* | Faz 5 |
| S16 | Yüzde indirim kataloğa girip puanla da alınabilir mi *(Ü17 ile sadeleşti)* | Faz 6 |
| S13 | Bütçe haftası ne zaman başlıyor | Faz 6 |
| S12 | Anlık ödül nasıl seçiliyor | Faz 7 |
| — | **XP miktarları ve seviye eşikleri** — oyun motoru gerçek skor üretmeden bağlanamaz | Faz 5 |

**2026-08-24'te kapananlar:** S18 (seviye → Ü14, Ü15) · S19 (rozet → Ü16) · Ç1–Ç6 (→ Ü17–Ü20). Faz 4'ü bloke eden karar kalmadı.
| — | SMS sağlayıcı hesabı ve **onaylı gönderici başlığı** — teslim süresi uzun, erken başlat | Faz 3 sahada |
