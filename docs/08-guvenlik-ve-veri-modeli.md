# 08 — Güvenlik ve Veri Modeli

**Faz 1 çıktısı.** Kod yazılmadan önce tartışmalı hiçbir alan kalmamalı.
**Son güncelleme:** 2026-08-22

Dayanak: `02-karar-defteri.md` (Ü1–Ü12, G1–G8, E1–E11) · `06-ekonomi-ve-dogrulama.md` · `07-uretim-plani.md`

---

# §1 · Roller

Beş özne var. Her biri ayrı oturum politikası, ayrı yetki kümesi taşır.

| Rol | Kim | Kapsam |
|---|---|---|
| **oyuncu** | Karekod okutup kaydolan kişi | Kendi verisi |
| **kasiyer** | Kafe personeli | Tek kafe, yalnızca kupon onayı |
| **kafe_yoneticisi** | Kafe sahibi / işletmeci | Tek kafe, tam panel |
| **platform_destek** | Destek ekibi | Tüm kafeler, **kişisel veri okuma yok** |
| **platform_admin** | Ürün sahibi ve ekibi | Her şey — her erişim denetim izine düşer |

**Kritik ayrım:** `platform_destek`, günlük operasyon için var (kafe onayı, hata inceleme) ve **oyuncunun telefon/ad/soyadını göremez**. Kişisel veriye erişim yalnızca `platform_admin` rolünde ve her seferinde kayıt altında. Böylece "tüm ekip her şeyi görüyor" durumu oluşmaz.

---

# §2 · Veri sınıflandırması

`H` = Hassas · `K` = Kişisel · `F` = Finansal · `D` = Davranışsal · `T` = Teknik

| Alan | Sınıf | Saklama biçimi | Kafe | Destek | Admin | Süre |
|---|---|---|---|---|---|---|
| Telefon numarası | **H** | Şifreli (AES-256-GCM) + kör indeks (HMAC) | ❌ | ❌ | 🔍 kayıtlı | Silme + 30 gün |
| Ad, soyad | **K** | Şifreli | ❌ | ❌ | 🔍 kayıtlı | Silme + 30 gün |
| Doğum yılı (18+ kontrolü) | **K** | Şifreli | ❌ | ❌ | 🔍 kayıtlı | Silme + 30 gün |
| Doğrulama kodu | **H** | HMAC + sunucu biberi (pepper) | ❌ | ❌ | ❌ | 3 dakika |
| Rıza kayıtları | **K** | Düz (metin sürümü + zaman) | ❌ | ✅ | ✅ | Silme + 10 yıl* |
| Oturum jetonu | **H** | SHA-256 hash | ❌ | ❌ | ❌ | 90 gün |
| Anonim oyuncu kodu | **D** | Düz — **kafe bazında farklı** | ✅ | ✅ | ✅ | Anonim kalır |
| Puan, skor, oyun geçmişi | **D** | Düz | ✅ anonim kod ile | ✅ | ✅ | Anonimleştirilerek kalır |
| Kupon, indirim tutarı | **F** | Append-only defter | ✅ kendi kafesi | ✅ | ✅ | 10 yıl |
| Kafe bütçesi, ciro | **F** | Düz | ✅ kendi kafesi | ✅ | ✅ | 10 yıl |
| Kafe belgeleri (vergi levhası) | **K** | Şifreli dosya, erişim kayıtlı | ✅ kendi | ✅ | ✅ | Üyelik + 10 yıl |
| Personel PIN'i | **H** | argon2id | ❌ | ❌ | ❌ | Personel aktif olduğu sürece |
| IP adresi | **T/K** | HMAC hash | ❌ | ✅ | ✅ | 90 gün |
| Cihaz parmak izi | **T/K** | HMAC hash | ❌ | ✅ | ✅ | 90 gün |
| Konum (geofence) | **K** | **Saklanmaz** — yalnızca mesafe (metre) saklanır | ✅ mesafe | ✅ | ✅ | Oturum ömrü |

\* Rıza kayıtları, ispat yükümlülüğü için hesap silindikten sonra da tutulur — ama içinde kişiyi tanımlayan alan bırakılmaz, yalnızca `player_id` + metin sürümü + zaman.

### İki kural

> **1. Ham konum hiçbir zaman saklanmaz.** Sunucu enlem/boylamı alır, kafeye uzaklığı hesaplar, **yalnızca metreyi** yazar. Oyuncunun nerede olduğu değil, kafeye yakın olup olmadığı bilgisi tutulur.
>
> **2. Anonim oyuncu kodu kafe bazında farklıdır.** Aynı oyuncu A kafesinde `P-4F2A`, B kafesinde `P-91QK` olur. İki kafe verilerini birleştirse bile aynı kişiyi eşleştiremez.

---

# §3 · Rol × yetki matrisi

`—` yetki yok · `O` okuma · `Y` yazma · `O*` yalnızca kendi kaydı · `🔍` erişim denetim izine düşer

| Tablo | oyuncu | kasiyer | kafe_yoneticisi | platform_destek | platform_admin |
|---|---|---|---|---|---|
| `players` (kişisel alanlar) | O* | — | — | — | O 🔍 |
| `players` (anonim alanlar) | O* | — | O | O | O |
| `player_consents` | O* | — | — | O | O/Y |
| `player_aliases` | — | O | O | O | O |
| `otp_challenges` | — | — | — | — | — |
| `sessions` | O* | O* | O (kendi kafesi) | O | O/Y 🔍 |
| `cafes` | O (halka açık alanlar) | O* | O/Y* | O | O/Y |
| `cafe_documents` | — | — | O/Y* | O 🔍 | O/Y 🔍 |
| `cafe_tables` | O (karekodla) | O | O/Y | O | O/Y |
| `staff` | — | O* | O/Y | O | O/Y |
| `products` | O | O | O/Y | O | O |
| `rewards` | O | O | O/Y | O | O |
| `percentage_campaigns` | O | O | O/Y | O | O |
| `budget_periods` | — | — | O/Y | O | O/Y |
| `budget_ledger` | — | — | O | O | O |
| `play_sessions` | O* | — | O (anonim) | O | O |
| `points_ledger` | O* | — | O (anonim) | O | O |
| `coupons` | O* | O + **onay** | O (anonim) | O | O |
| `audit_log` | — | — | O (kendi kafesi) | O | O |
| `fraud_flags` | — | — | — | O | O/Y |
| `platform_config` | — | — | — | O | O/Y |
| `cafe_config` | — | — | O/Y | O | O/Y |

### Değişmez yetki kuralları

1. **Hiçbir rol `coupons.status` alanını doğrudan yazamaz.** Tek yol, kasiyer oturumundan çağrılan onay işlemidir (E9, A4).
2. **`oyuncu` rolü hiçbir finansal alana yazamaz.** Puan ve bütçe hareketleri yalnızca sunucu iş mantığından doğar.
3. **`kafe_yoneticisi` başka kafeyi göremez.** `cafe_id` istekten değil, oturumdan gelir.
4. **`audit_log` hiçbir rol için güncellenebilir veya silinebilir değildir.** Uygulama veritabanı kullanıcısında `UPDATE`/`DELETE` yetkisi yoktur.
5. **`otp_challenges` hiçbir arayüzden okunamaz.** Yalnızca doğrulama işlemi içinden erişilir.

### Toplu kişisel veri erişimi

`platform_admin` rolünün kişisel veri okuması denetim izine düşüyor — ama **engellenmiyor**. Kayıt tutmak, on bin kaydın tek sorguda okunmasını durdurmaz. Ek kısıtlar:

| Erişim | Kural |
|---|---|
| Tekil kayıt okuma | Gerekçe alanı zorunlu, denetim izine yazılır |
| **50 kayıttan fazla** | İkinci bir `platform_admin` onayı + anında alarm |
| Toplu dışa aktarma | **Yasak.** Kişisel veri toplu olarak dışarı çıkarılamaz |
| Destek ekranları | Yalnızca maskeli gösterim; tam değer istemciye hiç gitmez |
| **Liste ekranları** | Hiçbir role tam numara göstermez (G26). Açmak ayrı bir işlem, gerekçe zorunlu |

Amaç meşru kullanımı zorlaştırmak değil: tekil destek talebi tek tıkla çözülür, on bin kayıt okumak ise iki kişinin bilerek karar vermesini gerektirir.

---

# §4 · Kimlik akışları

## 4.1 · Oyuncu kaydı

```
① Karekod okutulur
   → /m/{masa_token}
   → sunucu: token geçerli mi? 90 sn içinde mi? kullanılmamış mı?
   → kafe + masa çözümlenir, tek kullanımlık oturum bağlamı açılır

② Form: telefon · ad · soyad · doğum yılı
   → 18+ kontrolü sunucuda
   → KVKK aydınlatma gösterilir
   → [ ] Ticari ileti izni  ← AYRI kutu, işaretsiz gelir (G7)

③ SMS gönderimi
   → kota kontrolü: numara (1/dk, 5/saat, 10/gün) · IP (5/saat) · cihaz
   → 6 haneli kod üretilir, HMAC'lenip saklanır, düz hâli hiçbir yere yazılmaz
   → SMS metninde kafe adı ve link YOK

④ Kod doğrulama
   → 3 dk içinde, tek kullanım, sabit zamanlı karşılaştırma
   → 5 yanlış → numara 15 dk kilitli
   → başarılı: kod kaydı anında silinir

⑤ Hesap
   → numara daha önce kayıtlıysa: mevcut hesaba giriş
   → değilse: yeni oyuncu + rıza kayıtları + kafeye özel anonim kod
   → oturum açılır (90 gün, cihaza bağlı)
```

**Kural:** ②'deki form gönderildiğinde henüz hesap oluşmaz. Hesap ancak ④ başarılı olunca yazılır — doğrulanmamış telefon numarası veritabanında kalıcı olarak durmaz.

## 4.2 · Tekrar giriş

Oturum 90 gün geçerli ve cihaza bağlı. Süresi dolduğunda veya başka cihazdan girildiğinde: telefon → SMS kodu. Ad/soyad tekrar sorulmaz.

## 4.3 · Numara değişikliği

```
mevcut numaraya kod  →  doğrula
        ↓
yeni numaraya kod    →  doğrula
        ↓
değişiklik uygulanır + denetim izi + eski numaraya bilgilendirme SMS'i
```

Tek taraflı doğrulama **kabul edilmez** — hesabı ele geçiren biri numarayı tek adımda değiştiremesin.

### 🔴 SIM swap koruması — 24 saat ödül kilidi

Çift doğrulama SIM swap'i çözmez: saldırgan operatörden numarayı devraldıysa **iki mesajı da o alır**. Bu yüzden koruma doğrulamada değil, sonuçta olmalı:

> Numara değiştikten sonra **24 saat** boyunca kupon kullanılamaz ve katalog ödülü alınamaz.

Kilit süresince oyuncu oynayabilir ve puan kazanabilir — duran tek şey **değerin dışarı çıkması**. Buna eşlik eden iki bildirim:

- **Eski numaraya** SMS: değişikliği gerçek sahibi fark etsin
- **Yeni cihazdan girişte** bildirim: hesabın başka yerde açıldığını sahibi görsün

Hesap ele geçirilse bile 24 saatlik pencere, sahibinin fark edip müdahale etmesine yetiyor. Kupon boşaltma saldırısının maliyeti, getirisinden büyük hâle geliyor.

## 4.4 · Hesap silme

```
oyuncu talep eder → SMS ile doğrular → hesap anında pasifleşir
        ↓ 30 gün
kişisel alanlar geri döndürülemez şekilde silinir
        ↓
kalan: player_id, puan/kupon defteri kayıtları — kişiyi tanımlayan alan yok
```

30 günlük pencere, yanlışlıkla silmeyi kurtarmak için. Pencere boyunca hesap kullanılamaz.

## 4.5 · Kafe başvurusu ve onayı

```
başvuru formu (işletme adı, vergi no, adres, yetkili, telefon)
        ↓
belge yükleme (vergi levhası / işletme belgesi)
        ↓
durum: BEKLEMEDE  ← panel açılmaz, karekod üretilmez, kupon dağıtılmaz
        ↓
platform incelemesi → ONAYLANDI / REDDEDİLDİ (gerekçeli)
        ↓
onaylandıysa: yönetici hesabı kurulum bağlantısı gönderilir
```

**Onaysız kafe sistemde hiçbir şey yapamaz** (G5). Bu, sahte kafe kaydıyla kupon üretme yolunu kapatan tek engel.

## 4.6 · Kafe yöneticisi girişi

Telefon + SMS kodu. Ek olarak **kritik işlemlerde ikinci doğrulama**: bütçe değiştirme, personel ekleme/silme, kampanya yayınlama. Oturum 12 saat.

## 4.7 · Kasiyer girişi

```
cihaz kafeye kaydedilir (yönetici tarafından, bir kez)
        ↓
kasiyer 4 haneli PIN girer → oturum 8 saat
        ↓
5 dk hareketsizlik → ekran kilitlenir, PIN tekrar istenir
```

- PIN yalnızca **kayıtlı cihazda** çalışır. Cihaz kaydı olmadan PIN hiçbir işe yaramaz — 4 hane tek başına yeterli güvenlik değildir.
- 5 yanlış PIN → o cihazda 15 dk kilit + yöneticiye bildirim
- Yönetici personeli pasifleştirince oturumu **anında** düşer

### PIN paylaşımı — engellenemez, ama görünür kılınır

Kafede personel pratikte birbirinin PIN'ini bilir. Bunu teknik olarak engellemeye çalışmak boşuna; sistem kullanılmaz hâle gelir ve kasiyer büsbütün kenara iter. Sonuç: **denetim izi "kim onayladı" sorusuna güvenilir cevap veremez.**

Bunu kabul edip görünürlük ekliyoruz:

- **Günlük personel raporu** işletmeciye gider: *"Deniz 14 onay · Selin 3 onay"*. Vardiyada olmayan birinin adına onay görünürse işletmeci fark eder
- PIN **90 günde bir** değişir
- Personel ayrılınca hesabı aynı gün pasifleşir

Bu bir çözüm değil, bilinçli bir ödün — ve nedeni burada yazılı olduğu için sonradan "unutulmuş" sayılmaz. Kesin çözüm POS entegrasyonu (V2).

---

# §5 · Şifreleme ve anahtar yönetimi

## 5.1 · Anahtarlar

| Anahtar | Kullanım | Nerede |
|---|---|---|
| `PII_ENC_KEY` | Ad, soyad, telefon, doğum yılı, belge dosyaları | Sunucu sır kasası — **veritabanında değil** |
| `PHONE_INDEX_KEY` | Telefon kör indeksi (HMAC) | Sunucu sır kasası, `PII_ENC_KEY`'den **ayrı** |
| `OTP_PEPPER` | Doğrulama kodu HMAC'i | Sunucu sır kasası |
| `SESSION_HASH_KEY` | Oturum jetonu hash'i | Sunucu sır kasası |

**Ayrı anahtar olmasının sebebi:** Kör indeks anahtarı sızarsa saldırgan elindeki numaraların sistemde olup olmadığını öğrenir — ama numaraları **okuyamaz**. Tek anahtar kullanılsaydı iki yetenek birden kaybedilirdi.

## 5.2 · Telefon numarası

```
girdi        →  E.164 normalizasyonu  →  +905321234567
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
kör indeks (arama için)          şifreli alan (gösterim için)
HMAC-SHA256(numara,              AES-256-GCM(numara,
  PHONE_INDEX_KEY)                 PII_ENC_KEY, rastgele nonce)
        │                               │
UNIQUE — aynı numara               yalnızca admin, kayıtlı erişimle
iki hesap açamaz                   çözebilir
```

**Normalizasyon şart:** `0532...`, `+90532...`, `90532...` aynı kişidir. Normalize edilmezse aynı kişi üç hesap açar ve limitler anlamını yitirir.

## 5.3 · Anahtar sürümleme ve rotasyon

Şifreli her alanın yanında `key_version` kolonu durur. Rotasyon:
1. Yeni sürüm anahtar devreye alınır, yeni kayıtlar onunla yazılır
2. Eski kayıtlar arka planda tek tek yeniden şifrelenir
3. Hiçbir kayıt kalmayınca eski anahtar imha edilir

Kör indeks anahtarı rotasyonu **numaranın çözülmesini gerektirir** — bu yüzden yalnızca sızıntı şüphesinde yapılır ve planlı bir bakım işidir.

## 5.4 · Parola ve kod hash'leri

| Ne | Yöntem | Gerekçe |
|---|---|---|
| Doğrulama kodu (6 hane) | `HMAC-SHA256(kod, OTP_PEPPER)` | 3 dk ömürlü, 5 denemeli. Biber veritabanında olmadığı için dökümden çözülemez |
| Personel PIN'i (4 hane) | `scrypt` (N=32768) | Uzun ömürlü ve düşük entropili — yavaş hash zorunlu. argon2id yerine scrypt: Node'un içinde geliyor, yerel derleme gerektirmiyor (G28) |
| Oturum jetonu (32 bayt) | `SHA-256` | Yüksek entropili; hızlı hash yeterli |

---

# §6 · Saklama ve silme takvimi

| Veri | Süre | Sonunda ne olur |
|---|---|---|
| Doğrulama kodu | 3 dakika | Kayıt silinir |
| Oturum | 90 gün / rolüne göre | Kayıt silinir |
| IP ve cihaz hash'i | 90 gün | Silinir |
| Oyun oturumu girdi kaydı | 30 gün | Girdi kaydı silinir, skor kalır |
| Kişisel alanlar (ad, soyad, telefon) | Hesap silinene + 30 gün | Geri döndürülemez silme |
| Hareketsiz hesap | 24 ay giriş yok | Bilgilendirme SMS'i → 30 gün → silme |
| Puan defteri | Hesap silinince | `player_id` kalır, kişisel bağ kopar |
| Kupon ve bütçe defteri | **10 yıl** | Anonimleştirilmiş hâlde saklanır |
| Kafe belgeleri | Üyelik + 10 yıl | Silinir |
| Rıza kayıtları | Hesap silinene + 10 yıl | İspat için; kişisel alan içermez |
| Denetim izi | 10 yıl | Silinmez |

**Neden finansal kayıtlar 10 yıl:** ticari defter saklama yükümlülüğü. Bu kayıtlarda kişiyi tanımlayan alan bulunmaz — yalnızca tutar, tarih, kafe ve anonim referans.

**Silme işleminin gerçek olması gerekir:** yedeklerde de. Yedek saklama süresi 30 günü aşmamalı, aksi halde "sildik" ifadesi doğru olmaz.

## 6.1 · Yedekleme

Veri sızıntılarının en yaygın yolu canlı veritabanı değil, **korumasız yedek**: canlı sistemin tüm verisini taşır, ama çoğu zaman onun korumalarının hiçbirine sahip değildir.

| Konu | Kural |
|---|---|
| Sıklık | Günlük tam yedek + sürekli WAL arşivi |
| **Şifreleme** | Yedek dosyası şifreli; anahtar `PII_ENC_KEY`'den **ayrı** ve ayrı yerde |
| Konum | Farklı fiziksel konum, **Türkiye içinde** (G3) |
| Erişim | İki kişilik onay; her erişim denetim izine düşer |
| Saklama | **30 gün** — silme takvimiyle uyumlu |
| **Geri yükleme tatbikatı** | **Ayda bir.** Geri yüklenemeyen yedek, yedek sayılmaz |

Satırlar zaten şifreli (telefon, ad, soyad). Yedeğin ayrıca şifrelenmesi savunma derinliği: yedek dosyası sızarsa saldırganın elinde **iki ayrı anahtar** eksik kalır.

---

# §7 · Log ve denetim politikası

## 7.1 · Loglanmayanlar — kesin liste

> Telefon numarası · ad · soyad · doğum yılı · doğrulama kodu · oturum jetonu · personel PIN'i · ham konum · kafe belgelerinin içeriği

Bu alanlar **hiçbir seviyede, hiçbir ortamda** log satırına yazılmaz. Hata ayıklama sırasında bile. CI'da bir tarama adımı bu listeyi arar; bulursa yapı kırılır.

## 7.2 · Loglananlar

| Alan | Biçim |
|---|---|
| İstek kimliği | rastgele |
| Özne | rol + id (kişisel veri yok) |
| Kafe | `cafe_id` |
| İşlem | `coupon.redeem`, `otp.request` … |
| Sonuç | başarı / hata kodu |
| Süre | ms |
| IP | **hash'li** |

## 7.3 · Denetim izi — `audit_log`

Şu işlemler istisnasız kaydedilir:

| İşlem | Neden |
|---|---|
| Kupon onayı ve geri alma | Para |
| Bütçe değişikliği | Para |
| Kampanya yayınlama / durdurma | Para |
| **Kişisel veri görüntüleme (admin)** | Mahremiyet — kim, ne zaman, hangi kaydı |
| Kafe onayı / reddi | Yetki |
| Personel ekleme / silme / PIN sıfırlama | Yetki |
| Oturum iptali | Güvenlik |
| Rıza değişikliği | Hukuki ispat |

`audit_log` **append-only**: uygulama veritabanı kullanıcısında bu tabloya `UPDATE` ve `DELETE` yetkisi verilmez.

---

# §8 · Veritabanı şeması

PostgreSQL. Tutarlar `bigint` **kuruş**; zamanlar `timestamptz`; kimlikler önekli `text`.

## 8.1 · Kiracılık

```sql
CREATE TABLE cafes (
  id            text PRIMARY KEY,          -- 'cafe_...'
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  legal_name    text,
  tax_no_enc    bytea,                     -- şifreli
  address       text,
  city          text,
  lat           double precision,
  lng           double precision,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','suspended','rejected')),
  approved_at   timestamptz,
  approved_by   text,                      -- platform kullanıcısı
  reject_reason text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- G5: onaysız kafe hiçbir şey yapamaz. Karekod, kupon ve bütçe
-- işlemlerinin tamamı bu kontrolden geçer.

CREATE TABLE cafe_documents (
  id          text PRIMARY KEY,
  cafe_id     text NOT NULL REFERENCES cafes(id),
  kind        text NOT NULL CHECK (kind IN ('tax_certificate','business_license','other')),
  file_key    text NOT NULL,               -- şifreli depoda anahtar
  key_version int  NOT NULL DEFAULT 1,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','rejected'))
);

CREATE TABLE cafe_tables (
  id          text PRIMARY KEY,
  cafe_id     text NOT NULL REFERENCES cafes(id),
  label       text NOT NULL,               -- 'Masa 7', 'Kasa'
  sort_order  int  NOT NULL DEFAULT 0,
  qr_secret   bytea NOT NULL,              -- masaya basılan kalıcı sır
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cafe_id, label)
);

CREATE TABLE staff (
  id          text PRIMARY KEY,
  cafe_id     text NOT NULL REFERENCES cafes(id),
  name        text NOT NULL,
  pin_hash    text NOT NULL,               -- argon2id
  role        text NOT NULL CHECK (role IN ('cashier','manager')),
  active      boolean NOT NULL DEFAULT true,
  disabled_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cafe_devices (              -- kasiyer PIN'i yalnızca kayıtlı cihazda çalışır
  id             text PRIMARY KEY,
  cafe_id        text NOT NULL REFERENCES cafes(id),
  label          text NOT NULL,            -- 'Kasa tableti'
  device_id_hash text NOT NULL,
  registered_by  text NOT NULL REFERENCES staff(id),
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cafe_id, device_id_hash)
);
```

## 8.2 · Oyuncu ve kimlik

```sql
CREATE TABLE players (
  id                text PRIMARY KEY,      -- 'plr_...'
  phone_index       bytea NOT NULL UNIQUE, -- HMAC(numara, PHONE_INDEX_KEY)
  phone_enc         bytea NOT NULL,        -- AES-256-GCM
  first_name_enc    bytea NOT NULL,
  last_name_enc     bytea NOT NULL,
  birth_year_enc    bytea NOT NULL,
  key_version       int  NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz,
  deletion_requested_at timestamptz,       -- 30 günlük pencere başlangıcı
  anonymized_at     timestamptz            -- dolduysa kişisel alanlar silinmiştir
);

-- Ü2: 18+ kontrolü kayıt anında sunucuda yapılır; doğum yılı yalnızca
-- bu kontrol ve hukuki ispat için tutulur.

CREATE TABLE player_consents (
  id           text PRIMARY KEY,
  player_id    text NOT NULL REFERENCES players(id),
  kind         text NOT NULL CHECK (kind IN ('privacy_notice','explicit_consent','commercial_message')),
  text_version text NOT NULL,              -- 'v1.0-2026-08'
  granted_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz,
  ip_hash      bytea,
  ua_hash      bytea
);

-- G7: ticari ileti izni ayrı satırdır. Hizmet rızası bunu kapsamaz.

CREATE TABLE player_aliases (              -- G1: kafe yalnızca bunu görür
  cafe_id    text NOT NULL REFERENCES cafes(id),
  player_id  text NOT NULL REFERENCES players(id),
  code       text NOT NULL,                -- 'P-4F2A'
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cafe_id, player_id),
  UNIQUE (cafe_id, code)
);

CREATE TABLE otp_challenges (
  id             text PRIMARY KEY,
  phone_index    bytea NOT NULL,           -- hesap henüz yoksa da çalışsın diye
  code_hmac      bytea NOT NULL,           -- HMAC(kod, OTP_PEPPER)
  purpose        text NOT NULL CHECK (purpose IN ('register','login','phone_change','account_delete')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,     -- +3 dakika
  consumed_at    timestamptz,
  attempt_count  int NOT NULL DEFAULT 0,
  locked_until   timestamptz,
  ip_hash        bytea,
  device_id_hash bytea
);

CREATE INDEX ON otp_challenges (phone_index, created_at DESC);
-- Doğrulanan kod kaydı ANINDA silinir; süresi geçenler saatlik iş ile temizlenir.

CREATE TABLE sessions (
  id             text PRIMARY KEY,
  subject_type   text NOT NULL CHECK (subject_type IN ('player','staff','platform')),
  subject_id     text NOT NULL,
  cafe_id        text REFERENCES cafes(id),-- personel oturumlarında dolu
  role           text NOT NULL CHECK (role IN ('oyuncu','kasiyer','kafe_yoneticisi','platform_destek','platform_admin')),
  token_hash     bytea NOT NULL UNIQUE,
  device_id_hash bytea,
  ua_hash        bytea,
  ip_hash        bytea,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  revoked_at     timestamptz,
  revoke_reason  text
);

CREATE INDEX ON sessions (subject_type, subject_id) WHERE revoked_at IS NULL;
-- Uzaktan iptal: çalınan tablet, ayrılan personel, şüpheli erişim.
```

## 8.3 · Doğrulama ve oyun

```sql
CREATE TABLE qr_tokens (
  token_hash   bytea PRIMARY KEY,          -- düz jeton saklanmaz
  cafe_id      text NOT NULL REFERENCES cafes(id),
  table_id     text NOT NULL REFERENCES cafe_tables(id),
  issued_at    timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,       -- +90 saniye (K1)
  consumed_at  timestamptz,
  consumed_by  text                        -- play_sessions.id
);

CREATE TABLE play_sessions (
  id             text PRIMARY KEY,
  cafe_id        text REFERENCES cafes(id),-- NULL = kafe dışı (Ü3: kazanım yok)
  table_id       text REFERENCES cafe_tables(id),
  player_id      text NOT NULL REFERENCES players(id),
  device_id_hash bytea NOT NULL,
  game_id        text NOT NULL,
  seed           text NOT NULL,            -- sunucudan; deterministik replay (S5)
  started_at     timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz,
  duration_ms    int,
  server_score   int,                      -- SUNUCUNUN hesapladığı — geçerli olan bu
  claimed_score  int,                      -- istemcinin iddiası — yalnızca denetim
  input_log      jsonb,                    -- 30 gün sonra silinir
  proof_mask     int NOT NULL DEFAULT 0,   -- K1=1 K2=2 K3=4 K4=8 K5=16
  proof_level    int NOT NULL DEFAULT 0,
  geo_distance_m int,                      -- ham konum SAKLANMAZ
  is_qualified   boolean NOT NULL DEFAULT false,
  business_date  date,
  status         text NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','completed','abandoned','rejected')),
  reject_reason  text
);

-- E9 §5: 1 nitelikli oturum / cihaz / kafe / gün
CREATE UNIQUE INDEX ON play_sessions (cafe_id, device_id_hash, business_date)
  WHERE is_qualified;

-- Ü3: kafe dışı oturum hiçbir kazanım üretmez.
CREATE INDEX ON play_sessions (player_id, started_at DESC);
```

## 8.4 · Puan defteri

```sql
CREATE TABLE points_ledger (               -- append-only (E3)
  id            text PRIMARY KEY,
  cafe_id       text NOT NULL REFERENCES cafes(id),
  player_id     text NOT NULL REFERENCES players(id),
  business_date date NOT NULL,
  delta         int  NOT NULL,             -- kazanım +, ödül alımı −
  reason        text NOT NULL,             -- 'game_complete','bonus_game','reward_purchase'
  multiplier    numeric(3,1) NOT NULL DEFAULT 1.0,
  ref_type      text,
  ref_id        text,
  proof_level   int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON points_ledger (cafe_id, player_id);
CREATE INDEX ON points_ledger (cafe_id, player_id, business_date);

-- Bakiye kolonu YOKTUR. Bakiye = SUM(delta).
-- Günlük tavan (900) bu tablodan o günün toplamı okunarak uygulanır.
```

## 8.5 · Bütçe

```sql
CREATE TABLE budget_periods (
  id              text PRIMARY KEY,
  cafe_id         text NOT NULL REFERENCES cafes(id),
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  committed_kurus bigint NOT NULL CHECK (committed_kurus >= 150000),  -- Ü6: min 1.500 TL
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cafe_id, period_start)
);

CREATE TABLE budget_ledger (               -- append-only (E3)
  id               text PRIMARY KEY,
  cafe_id          text NOT NULL REFERENCES cafes(id),
  budget_period_id text NOT NULL REFERENCES budget_periods(id),
  kind             text NOT NULL CHECK (kind IN ('reserve','commit','release')),
  amount_kurus     bigint NOT NULL CHECK (amount_kurus >= 0),
  coupon_id        text,
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON budget_ledger (budget_period_id);
CREATE INDEX ON budget_ledger (coupon_id);
```

### E10'un uygulanışı — `rezerve + harcanan ≤ bütçe`

Bu bir `CHECK` ile ifade edilemez; **işlem düzeyinde** uygulanır:

```
BEGIN;
  SELECT * FROM budget_periods
   WHERE id = :period FOR UPDATE;          -- satır kilidi, yarış koşulunu keser

  -- açık yükümlülük = SUM(reserve) − SUM(commit) − SUM(release)
  -- harcanan        = SUM(commit)
  -- if (açık + harcanan + yeni_kupon) > committed_kurus  → kupon verilmez

  INSERT INTO budget_ledger (... 'reserve' ...);
  INSERT INTO coupons (...);
COMMIT;
```

Kilit olmadan iki eşzamanlı istek bütçeyi aşabilir. Bu satır kilidi, kafenin taahhüdünün üstünü ödememesinin **tek** garantisidir.

## 8.6 · Ürün, ödül, kampanya

```sql
CREATE TABLE products (
  id          text PRIMARY KEY,
  cafe_id     text NOT NULL REFERENCES cafes(id),
  name        text NOT NULL,
  price_kurus bigint NOT NULL CHECK (price_kurus >= 0),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rewards (                     -- Tip A: TL değerli, BÜTÇEDEN düşer
  id              text PRIMARY KEY,
  cafe_id         text NOT NULL REFERENCES cafes(id),
  kind            text NOT NULL CHECK (kind IN ('instant','catalog')),
  title           text NOT NULL,
  description     text,
  points_price    int  NOT NULL DEFAULT 0,
  cost_kurus      bigint NOT NULL CHECK (cost_kurus > 0),
  min_proof_level int  NOT NULL DEFAULT 2,
  sort_order      int  NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'instant' OR points_price = 0)   -- E2: anlık ödül puan istemez
);

CREATE TABLE percentage_campaigns (        -- Tip B: BÜTÇE DIŞI (Ü8)
  id            text PRIMARY KEY,
  cafe_id       text NOT NULL REFERENCES cafes(id),
  product_id    text NOT NULL REFERENCES products(id),
  percent       int  NOT NULL CHECK (percent BETWEEN 1 AND 100),
  daily_limit   int  NOT NULL CHECK (daily_limit > 0),   -- Ü8: ZORUNLU
  total_limit   int  CHECK (total_limit IS NULL OR total_limit > 0),
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,                    -- Ü8: ZORUNLU
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','active','paused','ended')),
  created_by    text NOT NULL REFERENCES staff(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

-- Ü8'in şemadaki karşılığı: daily_limit ve ends_at NOT NULL.
-- Limitsiz kampanya veritabanı seviyesinde kaydedilemez.
```

## 8.7 · Kupon

```sql
CREATE TABLE coupons (
  id                   text PRIMARY KEY,
  cafe_id              text NOT NULL REFERENCES cafes(id),
  player_id            text NOT NULL REFERENCES players(id),
  reward_id            text REFERENCES rewards(id),
  campaign_id          text REFERENCES percentage_campaigns(id),
  code                 text NOT NULL UNIQUE,       -- 6 hane
  status               text NOT NULL
                       CHECK (status IN ('pending','active','redeemed','expired','undone')),
  issued_at            timestamptz NOT NULL DEFAULT now(),
  activates_at         timestamptz NOT NULL,
  expires_at           timestamptz NOT NULL,
  budget_period_id     text REFERENCES budget_periods(id),
  reserved_kurus       bigint NOT NULL DEFAULT 0,
  committed_kurus      bigint,
  redeemed_at          timestamptz,
  redeemed_by_staff_id text REFERENCES staff(id),
  redeemed_device_id   text REFERENCES cafe_devices(id),
  undo_deadline_at     timestamptz,
  proof_level          int NOT NULL DEFAULT 0,

  -- Tam olarak biri: ya katalog ödülü ya yüzde kampanyası
  CHECK ((reward_id IS NOT NULL) <> (campaign_id IS NOT NULL)),

  -- A4 / E9: kuponu yalnızca personel kapatabilir
  CHECK (status <> 'redeemed' OR redeemed_by_staff_id IS NOT NULL),
  CHECK (status <> 'redeemed' OR committed_kurus IS NOT NULL),

  -- Ü8: yüzde kampanyası bütçeden düşmez
  CHECK (campaign_id IS NULL OR (reserved_kurus = 0 AND budget_period_id IS NULL))
);

CREATE INDEX ON coupons (cafe_id, player_id, status);
CREATE INDEX ON coupons (cafe_id, status, expires_at);
```

### Onayın atomikliği

Aynı kuponun iki kez onaylanmaması, uygulama mantığına değil **koşullu UPDATE**'e bırakılır:

```sql
UPDATE coupons
   SET status = 'redeemed',
       redeemed_at = now(),
       redeemed_by_staff_id = :staff,
       redeemed_device_id = :device,
       committed_kurus = :amount,
       undo_deadline_at = now() + interval '60 seconds'
 WHERE id = :coupon
   AND cafe_id = :cafe          -- başka kafenin kuponu kabul edilmez
   AND status = 'active'        -- ← ikinci istek 0 satır günceller
RETURNING id;
```

Dönen satır sayısı 0 ise onay verilmemiştir. Eşzamanlı iki kasiyer isteğinde yalnızca biri kazanır.

## 8.8 · Denetim ve güvenlik

```sql
CREATE TABLE audit_log (                   -- append-only, UPDATE/DELETE yetkisi YOK
  id           bigserial PRIMARY KEY,
  actor_type   text NOT NULL,
  actor_id     text,
  cafe_id      text,
  action       text NOT NULL,              -- 'coupon.redeem','pii.view','budget.update'
  target_type  text,
  target_id    text,
  detail       jsonb,                      -- kişisel veri İÇERMEZ
  ip_hash      bytea,
  ua_hash      bytea,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON audit_log (cafe_id, created_at DESC);
CREATE INDEX ON audit_log (actor_id, created_at DESC);

CREATE TABLE fraud_flags (
  id             text PRIMARY KEY,
  cafe_id        text REFERENCES cafes(id),
  player_id      text REFERENCES players(id),
  device_id_hash bytea,
  rule           text NOT NULL,            -- 'rate_device_hour','geo_lightspeed'
  detail         jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform_config (key text PRIMARY KEY, value jsonb NOT NULL);
CREATE TABLE cafe_config (
  cafe_id text NOT NULL REFERENCES cafes(id),
  key     text NOT NULL,
  value   jsonb NOT NULL,
  PRIMARY KEY (cafe_id, key)
);
```

## 8.9 · Kiracı izolasyonu — iki katman

**Katman 1 — uygulama:** `cafe_id` her sorguda oturumdan gelir. Sorgu katmanı, kiracıya ait bir tabloya `cafe_id` süzgeci olmadan erişimi **derleme zamanında** reddeder.

**Katman 2 — veritabanı (savunma derinliği):** Kiracıya ait tablolarda PostgreSQL satır düzeyi güvenliği (RLS) açılır; oturum değişkeni `app.cafe_id` ile süzülür. Uygulamada bir yerde süzgeç unutulsa bile veritabanı satırı döndürmez.

Tek katman yeterli değil: birincisi geliştirici hatasına, ikincisi yapılandırma hatasına karşı korur.

---

# §9 · KVKK ve İYS metin taslakları

> ⚠️ **Bunlar taslaktır.** G6 uyarınca avukat onayından geçmeden yayına alınamaz.
> Amaç, hukukçuya "neyi işliyoruz, neden, ne kadar" sorusunun teknik cevabını hazır vermek.

## 9.1 · İşleme envanteri — avukata verilecek tablo

| Veri | İşleme amacı | Hukuki sebep (öneri) | Süre |
|---|---|---|---|
| Telefon, ad, soyad | Hesap oluşturma, kimlik doğrulama, kupon sahipliği | Sözleşmenin ifası | Hesap + 30 gün |
| Doğum yılı | 18 yaş kontrolü | Hukuki yükümlülük / sözleşmenin ifası | Hesap + 30 gün |
| Doğrulama kodu | Telefon doğrulaması | Sözleşmenin ifası | 3 dakika |
| IP, cihaz bilgisi | Sahtecilik önleme, güvenlik | Meşru menfaat | 90 gün |
| Konuma uzaklık (metre) | Kafede bulunma doğrulaması | Sözleşmenin ifası | Oturum ömrü |
| Oyun ve puan geçmişi | Hizmetin sunulması | Sözleşmenin ifası | Anonimleştirilerek |
| Kupon ve indirim kayıtları | Hizmetin sunulması, ticari kayıt | Sözleşmenin ifası + hukuki yükümlülük | 10 yıl |
| Telefon (pazarlama) | Kampanya mesajı | **Açık rıza** + İYS | Rıza geri alınana kadar |

## 9.2 · Aydınlatma metni — taslak iskelet

1. **Veri sorumlusu:** [şirket unvanı, adres, iletişim]
2. **İşlenen veriler:** telefon, ad, soyad, doğum yılı, cihaz ve bağlantı bilgileri, oyun ve kupon geçmişi
3. **İşleme amaçları:** hesabın oluşturulması, kimliğin doğrulanması, oyun ve ödül hizmetinin sunulması, sahteciliğin önlenmesi, yasal yükümlülüklerin yerine getirilmesi
4. **Hukuki sebepler:** §9.1 tablosu
5. **Aktarım:** SMS gönderimi için yurt içinde yerleşik hizmet sağlayıcı; **yurt dışına aktarım yapılmaz** (G3)
6. **Kafelerle paylaşım:** *"Üye işletmeler kimliğinizi göremez; yalnızca size özel, işletmeye özgü anonim bir kod ve oyun/kupon hareketiniz paylaşılır."*
7. **Saklama süreleri:** §6 tablosu
8. **Haklarınız:** KVKK m.11 — bilgi talebi, düzeltme, silme, itiraz, taşınabilirlik. Başvuru: uygulama içi **"Verilerim"** ekranı ve [e-posta]
9. **Güvenlik:** telefon numarası ve kimlik bilgileri şifreli saklanır

**6. madde önemli:** G1 kararının müşteriye söylenmiş hâli. Bu cümle, kafelerle veri paylaşımı konusunda hem doğru hem güven verici.

## 9.3 · Açık rıza — ticari elektronik ileti

Kayıt ekranında **ayrı, işaretsiz** kutu:

> ☐ CafePlay'den kampanya ve fırsat bildirimleri almak istiyorum.
> Bu izni istediğim zaman uygulamadan veya İYS üzerinden geri alabilirim.

**Uygulama şartları:**
- Kutu ön işaretli **gelemez**
- Hizmet, bu izne bağlanamaz — işaretlemeyen de kaydolabilmeli
- İzin alınınca **İYS'ye kaydedilir**; geri alınınca İYS'den düşülür
- Her ticari mesajda ret imkânı bulunur

## 9.4 · Kafe sözleşmesi — teknik ekler

| Madde | İçerik |
|---|---|
| Veri işleyen sıfatı | Kafe, oyuncu kişisel verisine erişmez; anonim kod üzerinden çalışır |
| Bütçe taahhüdü | Haftalık minimum 1.500 TL, kasada onaylanan kuponlar üzerinden tükenir |
| Personel sorumluluğu | Kasiyer hesapları kafeye aittir; paylaşılamaz |
| Kupon onurlandırma | Sistemde onaylanan kupon, kafe tarafından karşılanır |
| Fesih ve veri | Üyelik bitince kafe verisi 10 yıl saklanır (ticari kayıt) |

---

# §10 · Avukata sorulacaklar

| # | Soru | Neden önemli |
|---|---|---|
| H1 | **VERBİS kaydı** gerekiyor mu? Eşikler bizim için ne zaman doluyor? | Zorunluysa gecikmesi idari para cezası |
| H2 | Ad, soyad ve telefon için **açık rıza mı, sözleşmenin ifası mı** doğru hukuki sebep? | Yanlış sebep tüm işlemeyi hukuka aykırı kılar |
| H3 | **5651 sayılı kanun** kapsamında yer sağlayıcı yükümlülüğü doğuyor mu? Trafik kaydı saklama süresi ne olmalı? | §6'daki 90 günlük süreyi doğrudan değiştirebilir |
| H4 | Yedeklerdeki verinin silinmesi konusunda kabul edilebilir süre nedir? | "Sildik" beyanının doğruluğu buna bağlı |
| H5 | Oyun + ödül formatı **promosyon/çekiliş mevzuatına** giriyor mu? | Girerse Millî Piyango izni gündeme gelir |
| H6 | Kafeye anonim kod göstermek yeterli mi, yoksa kafe yine de **veri işleyen** sayılır mı? | Sayılırsa her kafeyle ayrı sözleşme gerekir |
| H7 | 18 yaş beyanı yeterli mi, doğrulama gerekiyor mu? | Beyan yeterliyse kayıt akışı basit kalır |

---

# §11 · Faz 1 güvenlik kapısı

Bu belge, aşağıdakilerin tamamı yazılı hâle gelince "bitti" sayılır:

- [x] Veri sınıflandırması — alan alan, kim görür, ne kadar kalır
- [x] Rol × yetki matrisi + beş değişmez yetki kuralı
- [x] Kimlik akışları — kayıt, giriş, numara değişikliği, silme, kafe onayı, kasiyer
- [x] Şifreleme ve anahtar yönetimi — ayrı anahtarlar, sürümleme, rotasyon
- [x] Saklama ve silme takvimi
- [x] Log politikası — loglanmayanlar kesin listesi
- [x] Veritabanı şeması — tablo tablo, kısıtlarıyla
- [x] KVKK / İYS taslakları + avukat soru listesi

**Faz 2'ye geçmeden önce:** H1–H7 sorularının cevapları beklenmez (Faz 10'a kadar sürebilir), ama **H2 ve H3** şemayı etkileyebileceği için erken sorulmalı.
