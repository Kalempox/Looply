# 24 — VERİ ENVANTERİ (KVKK)

> **Bu belge avukata gidecek olan şey.** Aydınlatma metninin kendisi değil,
> onun **dayanağı**: ürünün gerçekte hangi veriyi, neden, nerede, ne kadar
> süre işlediği.
>
> Kaynak: `saas-gizlilik-checklist-ve-prompt.md`. O belgenin uyarısı haklı —
> *"AI sizin ürününüzün gerçek veri akışını bilmediği için yanlış veya eksik
> yazar."* Bu yüzden aşağıdaki her satır **koddan** çıkarıldı; dosya ve satır
> referansları veriliyor. Kodun cevaplayamadığı yerler `[DOLDUR]` işaretli.

**Son güncelleme:** 2026-09-13 · **Durum:** hukuk incelemesi bekliyor (S20)

---

## 🔴 Envanter çıkarılırken bulunan üç arıza

Belgeyi doldurmak bir yazı işi değildi; üç gerçek arıza ortaya çıkardı.
İlk ikisi düzeltildi, üçüncüsü karar bekliyor.

| # | Bulgu | Durum |
|---|---|---|
| 1 | **Hesap silme işi hiç koşmuyordu.** `silmeleriUygula` Faz 2'de yazılmış ve **hiçbir yerden çağrılmıyordu.** Aydınlatma metni *"30 gün sonra geri döndürülemez şekilde silinir"* diyor; fiilen hiçbir hesap silinmiyordu. | ✅ Bakım köprüsüne bağlandı (Ü111), test çiviledi |
| 2 | **Silme, parola özetini bırakıyordu.** Ad, soyad, telefon ve doğum yılı boşaltılıyor, `password_hash` kalıyordu. Kullanıcı aynı parolayı başka yerlerde de kullanıyor olabilir. | ✅ Düzeltildi (Ü111) |
| 3 | **Yaş sınırı kontrolü yok.** Doğum yılı alınıp şifreleniyor ama **hiçbir yerde kullanılmıyor** — 13 yaşındaki biri kaydolabilir. | ⚠️ **Karar gerekiyor** (aşağıda §9) |

Ayrıca aydınlatma metninde **gerçeğe aykırı bir cümle** vardı: *"Soyadın
hiçbir koşulda gösterilmez."* Liderlik tablosu soyadın baş harfini gösteriyor
(`Mert Y***`, `domain/liderlik.ts` → `maskele`). Metin düzeltildi.

---

## 1 · Toplanan veri envanteri

### 1.1 Oyuncu (son kullanıcı)

| Veri | Nerede | Nasıl saklanıyor |
|---|---|---|
| Ad, soyad | `players.first_name_enc`, `last_name_enc` | **AES-256-GCM şifreli** (`lib/crypto.ts`) |
| Cep telefonu | `players.phone_enc` | AES-256-GCM şifreli |
| Telefon arama indeksi | `players.phone_index` | **HMAC-SHA256 kör indeks** — numaranın kendisi değil |
| Doğum yılı | `players.birth_year_enc` | AES-256-GCM şifreli |
| Parola (isteğe bağlı) | `players.password_hash` | **scrypt**, rastgele tuzla (`domain/parola.ts`) |
| Kafeye özel takma kod | `player_aliases.code` | Düz metin — **kimlik değil**, kafenin gördüğü tek şey |
| Rıza kayıtları | `player_consents` | Tür, metin sürümü, tarih + **IP ve tarayıcı bilgisinin hash'i** (ham değil) |
| Oyun oturumları | `play_sessions` | Skor, süre, girdi kaydı, kanıt maskesi |
| Puan / XP / kupon | `points_ledger`, `xp_ledger`, `coupons` | Append-only defter |
| Kafeye uzaklık | `table_sessions.geo_distance_m` | **Yalnızca metre.** Koordinat saklanmıyor |
| Cihaz vekili | `play_sessions.device_id_hash` | Oyuncu kimliğinden türeyen hash — gerçek cihaz parmak izi **toplanmıyor** |

**Toplanmayanlar** (açıkça yazılmalı, çünkü çoğu SaaS toplar):

- E-posta adresi ❌
- Ödeme / kart bilgisi ❌ — sistemde ödeme akışı yok
- GPS koordinatı ❌ — izin alınıyor, **mesafe** hesaplanıyor, koordinat atılıyor
- Kullanıcı yüklemesi (dosya, mesaj, destek metni) ❌
- Üçüncü taraf girişi (Google/Apple/Microsoft) ❌
- Reklam / analitik kimliği ❌

### 1.2 İşletme tarafı

Ad-soyad ve telefon (`staff`), kasiyer PIN'i (hash), vergi levhası belgesi
(`cafe_documents`), kafe konumu (`cafes.lat/lng`).
⚠️ **Kafe konumu kişisel veri değil** — işletmenin adresi.

### 1.3 Çerezler

Hepsi **işlevsel**; pazarlama ya da analitik çerezi **yok**.

| Çerez | İş | Ömür |
|---|---|---|
| `cp_oturum` | Oturum | HttpOnly, SameSite=Lax |
| `cp_masa` | Masa bileti (imzalı) | 30 dk |
| `cp_cark`, `cp_talep`, `cp_misafir_oyun`, `cp_misafir_konum` | Kaydolmamış ziyaretçinin kazandığını taşımak | 30 dk |
| `cp_davet` | Davet bağı | — |

⚠️ Misafir çerezleri **bilerek** var: G13 gereği doğrulanmamış ziyaretçinin
veritabanında izi olmamalı, kazandığı şey imzalı çerezde bekliyor.

### 1.4 Loglar

`lib/log.ts` **kişisel veriyi yasaklıyor ve bunu çalıştırma anında
uyguluyor**: yasaklı alan adı (ad, soyad, telefon, konum, jeton, parola…)
görülürse geliştirme ortamında **hata fırlatıyor**; metinlerdeki Türk cep
numarası deseni `[telefon]` ile maskeleniyor.

---

## 2 · Amaç ve hukuki dayanak

| Veri | Amaç | Önerilen dayanak (KVKK md. 5) |
|---|---|---|
| Ad, soyad, telefon | Hesap açma, ödülü kişiye bağlama, kasada doğrulama | `[DOLDUR: sözleşmenin ifası]` |
| Doğum yılı | `[DOLDUR: bugün hiçbir yerde kullanılmıyor — §9]` | `[DOLDUR]` |
| Telefon (SMS) | Kimlik doğrulama (OTP), kupon hatırlatma | Sözleşmenin ifası / meşru menfaat `[DOLDUR]` |
| Konum mesafesi | Ödülün gerçekten kafede kazanıldığını göstermek (Ü3, K2) | **Açık rıza** — izin tarayıcıdan isteniyor |
| Oyun/puan/kupon | Hizmetin kendisi, ticari kayıt | Sözleşmenin ifası |
| IP/UA hash'i | Rızanın ne zaman, nereden verildiğini ispat | Hukuki yükümlülük `[DOLDUR]` |
| Ticari ileti | Pazarlama | **Ayrı açık rıza** ✅ |

⚠️ **Ticari ileti izni şemada ayrı satır**: `player_consents.kind` üç değer
alıyor — `privacy_notice`, `explicit_consent`, `commercial_message`. Hizmet
rızası ticari iletiyi kapsamıyor ve bu, koda değil **şemaya** yazılı (G7).

⚠️ **AB kullanıcısı hedeflenmiyorsa GDPR bölümü yazılmamalı.** `[DOLDUR:
yalnızca Türkiye mi?]`

---

## 3 · Depolama ve altyapı

- **Veritabanı:** PostgreSQL, satır düzeyi güvenlik (RLS) **zorunlu** —
  `cafe_id` taşıyan her tabloda açık ve bunu bir test çiviliyor
  (`tests/kiraci-izolasyonu.test.ts`, Ü107).
- **Saklamada şifreleme:** kişisel alanlar uygulama katmanında AES-256-GCM.
  Veritabanı diskinin kendi şifrelemesi `[DOLDUR: barındırma kararına bağlı]`.
- **Aktarımda şifreleme:** TLS `[DOLDUR: ters vekil kurulacak — canlıya çıkış listesi]`
- **Anahtarlar:** altı ayrı anahtar (`PII_ENC_KEY`, `PHONE_INDEX_KEY`,
  `OTP_PEPPER`, `SESSION_HASH_KEY`, `IDENTIFIER_HASH_KEY`, `BACKUP_ENC_KEY`);
  yedek anahtarı **ayrı yerde** tutulacak.
- **Erişim kontrolü:** uygulama rolü (`cafeplay_app`) kısıtlı — defterlerde
  UPDATE/DELETE yetkisi **yok**. Denetim izi silinemiyor.
- **Barındırma bölgesi:** `[DOLDUR: Türkiye mi, Frankfurt mı? KVKK md. 9'u bu belirliyor]`
- **Yedekler nerede:** `[DOLDUR]`

---

## 4 · Üçüncü taraflar (alt işlemciler)

**Liste bilerek çok kısa** — bugün tek bir alt işlemci var.

| Servis | Ne için | Hangi veri | Ülke |
|---|---|---|---|
| SMS sağlayıcısı — **Netgsm** veya **İletimerkezi** | OTP ve bildirim | **Telefon numarası + mesaj metni** | Türkiye |

- Analitik aracı ❌ · Ödeme sağlayıcısı ❌ · Hata izleme (Sentry vb.) ❌ ·
  Müşteri destek aracı ❌ · Reklam pikseli ❌ · CDN ❌
- **Yazı tipleri kendi sunucumuzdan**: `next/font/google` fontu **derleme
  anında** indirip yerelden servis ediyor — canlıda tarayıcıdan
  `fonts.googleapis.com`'a istek gitmiyor (`app/layout.tsx`).

⚠️ `sms_outbox` tablosunda numara **açık tutulmuyor**: yalnızca maskeli hâli
(`0532 *** ** 67`) ve kör indeks yazılıyor.

⚠️ **Netgsm entegrasyonu henüz bağlanmadı** (`src/sms/index.ts`). Hangisiyle
sözleşme yapılacağı ve veri işleyen sözleşmesi: `[DOLDUR]`

⚠️ Barındırma sağlayıcısı seçildiğinde **bu tabloya eklenmeli**.

---

## 5 · Uluslararası aktarım

Bugünkü hâliyle **yurt dışına aktarım yok**: tek alt işlemci Türkiye'de,
tarayıcı üçüncü tarafa istek atmıyor.

⚠️ Bu, **barındırma kararı verilene kadar geçerli.** Sunucu Frankfurt'a
konursa KVKK md. 9 devreye girer.
`[DOLDUR: barındırma bölgesi + md. 9 mekanizması]`

---

## 6 · Saklama süreleri

| Veri | Süre |
|---|---|
| Kimlik ve iletişim | Hesap açık olduğu sürece |
| Silme talebi sonrası | **30 gün**, sonra geri döndürülemez anonimleştirme (`silmeleriUygula`) |
| Puan / kupon / bütçe defteri | **Kalıyor**, kişisel bağ kopuyor — ticari kayıt |
| Denetim izi (`audit_log`) | Kalıyor; kişisel veri **içermiyor** (redaction) |
| `sms_outbox` | `[DOLDUR: bir temizlik işi yok — süre kararı gerekiyor]` |
| Karekod tarama kayıtları | 1 saat (`qr.temizle`) |

**Anonimleştirmede ne oluyor:** `phone_enc`, `first_name_enc`,
`last_name_enc`, `birth_year_enc` boş şifreli değerle üzerine yazılıyor,
`phone_index` kimlikle değiştiriliyor, `password_hash` ve `password_set_at`
**NULL** yapılıyor, `anonymized_at` damgalanıyor.

---

## 7 · Kullanıcı hakları

Talep göndermeye **gerek yok** — hepsi uygulama içinde, `/verilerim`:

| Hak | Nasıl |
|---|---|
| Erişim / taşınabilirlik | "Verilerimi indir" → JSON dosyası |
| Düzeltme | `[DOLDUR: ad-soyad düzeltme ekranı yok — talep yoluyla]` |
| Silme | "Hesabımı sil" → 30 günlük pencere, **iptal edilebilir** |
| İzin geri alma | Pazarlama izni tek dokunuşla açılıp kapanıyor |
| Görünürlük | Liderlik tablosunda ad gizleme |
| Hatırlatmayı kapatma | SMS hatırlatmaları kapatılabiliyor |

**Yanıt süresi:** `[DOLDUR: KVKK 30 gün — e-posta kanalı için taahhüt]`
**Başvuru adresi:** `[DOLDUR: kvkk@looply.com gerçek mi?]`

---

## 8 · Güvenlik ve ihlal bildirimi

**Var olanlar:**

- Kişisel alanlarda AES-256-GCM; telefon araması kör indeksle
- Kiracı izolasyonu RLS ile, testle çivili
- Defterler append-only; uygulama rolünde silme yetkisi yok
- Denetim izi (`audit_log`) — silinemiyor, kişisel veri içermiyor
- Acil durdurma anahtarları (G18)
- Loglarda kişisel veri yasağı — çalışma anında zorlanıyor
- SMS hız ve toplam gönderim sınırı

**Eksikler:**

- **İhlal bildirim süreci yazılı değil** `[DOLDUR: kim, kaç saatte, hangi kanaldan]`
  ⚠️ KVKK: Kurula **72 saat**.
- **Sızma testi / bağımsız güvenlik incelemesi yapılmadı** — canlıya çıkış
  listesinde açık madde.
- **Platform girişinde TOTP yok** (G32) — açık madde.

---

## 9 · Özel durumlar

### ⚠️ Yaş sınırı — karar gerekiyor

**Bugün yaş sınırı YOK.** Doğum yılı alınıyor, şifreleniyor ve **hiçbir
yerde kullanılmıyor** — `domain/player.ts` içinde yalnızca yazılıyor.

Bu iki ayrı sorun doğuruyor:

1. **Veri minimizasyonu:** kullanılmayan bir kişisel veriyi topluyoruz.
   Amacı yoksa toplanmamalı.
2. **Küçüklerin rızası:** ürün ödül dağıtıyor ve şans öğesi içeriyor (S7).
   13 yaşındaki biri bugün kaydolabilir.

Üç seçenek: **(a)** yaş sınırı koy ve doğum yılını onun için kullan ·
**(b)** doğum yılını hiç toplama · **(c)** sınır koyma, gerekçesini yaz.

`[DOLDUR: ürün sahibi + avukat kararı]`

### Diğer

- **Hizmet verilen ülke:** Türkiye `[DOLDUR: başka var mı?]`
- **Veri sorumlusu:** `[DOLDUR: tüzel kişi adı, vergi no, adres]`
  ⚠️ Aydınlatma metni bugün yalnızca "Looply" diyor.
- **DPO / irtibat kişisi:** `[DOLDUR]`
- **VERBİS kaydı:** `[DOLDUR: gerekiyor mu?]`

---

## Avukata giderken

Bu belgeyi çıktı alıp yanına şunları ekleyin:

1. Mevcut aydınlatma metni — `/aydinlatma` ekranı
2. **S7 · şans mevzuatı görüşü** — bu belgeden ayrı ve daha riskli bir
   soru: çark ve ödül motoru şans içeriyor, üstelik Ü110 ile **kafe kendi
   olasılıklarını yazabiliyor.** Aynı görüşmede sorulmalı.
3. §9'daki yaş sınırı kararı

⚠️ **Bu belge hukuki tavsiye değildir.** Ürünün gerçek veri akışının
teknik dökümüdür; nihai metin avukat onayından geçmelidir — özellikle
yurt dışı aktarım (md. 9) ve küçüklerin rızası.
