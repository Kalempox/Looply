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

## 🔴 Envanter çıkarılırken bulunanlar

Belgeyi doldurmak bir yazı işi değildi; iki gerçek arıza ve bir eksik test
ortaya çıkardı. Üçü de kapatıldı.

| # | Bulgu | Durum |
|---|---|---|
| 1 | **Hesap silme işi hiç koşmuyordu.** `silmeleriUygula` Faz 2'de yazılmış ve **hiçbir yerden çağrılmıyordu.** Aydınlatma metni *"30 gün sonra geri döndürülemez şekilde silinir"* diyor; fiilen hiçbir hesap silinmiyordu. | ✅ Bakım köprüsüne bağlandı (Ü111), test çiviledi |
| 2 | **Silme, parola özetini bırakıyordu.** Ad, soyad, telefon ve doğum yılı boşaltılıyor, `password_hash` kalıyordu. Kullanıcı aynı parolayı başka yerlerde de kullanıyor olabilir. | ✅ Düzeltildi (Ü111) |
| 3 | ~~Yaş sınırı kontrolü yok~~ — **bu bulgu yanlıştı.** 18+ sınırı Ü2'den beri var ve `lib/validate.ts` içinde uygulanıyor. Gerçek eksik başkaydı: **kuralın hiçbir testi yoktu.** | ✅ Test yazıldı (Ü111) |

### Aydınlatma metninde iki gerçeğe aykırı cümle

Envanterin asıl işi buydu: metnin söylediği ile ürünün yaptığını
karşılaştırmak. İki yerde ayrışıyorlardı — ikisi de düzeltildi.

1. *"Soyadın hiçbir koşulda gösterilmez."* → Liderlik tablosu soyadın baş
   harfini gösteriyor (`Mert Y***`, `domain/liderlik.ts` → `maskele`).
   Metin ayrıca hâlâ kaldırılmış "masa tahtını" anlatıyordu.
2. *"Düzeltme … hepsini Verilerim ekranından tek başına kullanabilirsin —
   talep göndermene gerek yok."* → **Ad-soyad düzeltme ekranı yok**, alan
   yalnızca gösteriliyor. Metin artık düzeltmenin e-posta ile yapıldığını
   ve 30 gün içinde dönüleceğini söylüyor.

⚠️ İkincisi için doğru çözüm uzun vadede metni değil **ürünü** düzeltmek:
`/verilerim` ekranına ad-soyad düzeltme eklenmeli (`docs/23` → madde 36).

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
| Doğum yılı | **18 yaş sınırının uygulanması** (Ü2) ve kontrolün yapıldığının ispatı | Hukuki yükümlülük / sözleşmenin ifası `[AVUKAT ONAYI]` |
| Telefon (SMS) | Kimlik doğrulama (OTP), kupon hatırlatma | Sözleşmenin ifası / meşru menfaat `[DOLDUR]` |
| Konum mesafesi | Ödülün gerçekten kafede kazanıldığını göstermek (Ü3, K2) | **Açık rıza** — izin tarayıcıdan isteniyor |
| Oyun/puan/kupon | Hizmetin kendisi, ticari kayıt | Sözleşmenin ifası |
| IP/UA hash'i | Rızanın ne zaman, nereden verildiğini ispat | Hukuki yükümlülük `[DOLDUR]` |
| Ticari ileti | Pazarlama | **Ayrı açık rıza** ✅ |

⚠️ **Ticari ileti izni şemada ayrı satır**: `player_consents.kind` üç değer
alıyor — `privacy_notice`, `explicit_consent`, `commercial_message`. Hizmet
rızası ticari iletiyi kapsamıyor ve bu, koda değil **şemaya** yazılı (G7).

✅ **Kapsam kararı: şimdilik yalnızca Türkiye.** Belge KVKK'ya göre
yazılıyor, GDPR bölümü **açılmıyor** — tutulmayacak taahhütler vermekten
ve incelemeyi uzatmaktan başka işe yaramazdı. AB'ye açılırken neyin
ekleneceği belgenin sonunda not olarak duruyor.

---

## 3 · Depolama ve altyapı

- **Veritabanı:** PostgreSQL, satır düzeyi güvenlik (RLS) **zorunlu** —
  `cafe_id` taşıyan her tabloda açık ve bunu bir test çiviliyor
  (`tests/kiraci-izolasyonu.test.ts`, Ü107).
- **Saklamada şifreleme:** kişisel alanlar uygulama katmanında AES-256-GCM.
  Veritabanı diskinin kendi şifrelemesi `[DOLDUR: barındırma kararına bağlı]`.
- **Aktarımda şifreleme:** TLS — ters vekil canlıya çıkış listesinde, alan
  adı hazır. Pilot öncesi kurulacak.
- **Anahtarlar:** altı ayrı anahtar (`PII_ENC_KEY`, `PHONE_INDEX_KEY`,
  `OTP_PEPPER`, `SESSION_HASH_KEY`, `IDENTIFIER_HASH_KEY`, `BACKUP_ENC_KEY`);
  yedek anahtarı **ayrı yerde** tutulacak.
- **Erişim kontrolü:** uygulama rolü (`cafeplay_app`) kısıtlı — defterlerde
  UPDATE/DELETE yetkisi **yok**. Denetim izi silinemiyor.
- ✅ **Barındırma bölgesi: TÜRKİYE.** KVKK md. 9 (yurt dışına aktarım) hiç
  devreye girmiyor. Bu, belgenin en riskli bölümünü tamamen kapatan karar.
- **Sağlayıcı:** `[DOLDUR: Vargonen / Natro / Turkcell bulut / TT bulut …]`
- **Yedekler nerede:** `[DOLDUR: aynı sağlayıcıda farklı bölge mi?]`
  ⚠️ Yedek de Türkiye'de kalmalı — yurt dışındaki bir yedek, md. 9'u
  sunucu Türkiye'de olsa bile geri getirir.

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

⚠️ **SMS sağlayıcısı henüz seçilmedi.** İkisi de Türkiye'de, ikisi de yurt
dışı aktarım doğurmuyor — yani seçim belgenin yapısını değiştirmiyor, tek
etkisi tablodaki ad ve yapılacak **veri işleyen sözleşmesi**. Netgsm
entegrasyonu kodda henüz bağlı değil (`src/sms/index.ts`).
`[DOLDUR: hangisi + veri işleyen sözleşmesi]`

⚠️ **Gönderici başlığı başvurusu bu karara bağlı** — sağlayıcı üzerinden
yapılıyor ve operatör onayı birkaç iş günü sürüyor. Canlıya çıkışı
bekleten maddelerden biri.

⚠️ Barındırma sağlayıcısı seçildiğinde **bu tabloya eklenmeli** (Türkiye).

---

## 5 · Uluslararası aktarım

✅ **Yurt dışına aktarım YOK ve olmayacak.**

- Sunucu **Türkiye**'de (karar verildi)
- Tek alt işlemci (SMS) **Türkiye**'de
- Tarayıcı üçüncü tarafa hiç istek atmıyor — yazı tipleri dahil kendi
  sunucumuzdan

KVKK md. 9 devreye **girmiyor**; açık rıza, taahhütname ya da Kurul kararı
gerekmiyor. Ürünlerin çoğunda en riskli olan bölüm bizde boş.

⚠️ Bu, üç şartın üçü birden korunduğu sürece geçerli. İleride bir analitik
aracı, hata izleme (Sentry) ya da yurt dışı CDN eklenirse **md. 9 geri
gelir** — yeni bir servis eklenmeden önce bu belge güncellenmeli.

---

## 6 · Saklama süreleri

| Veri | Süre |
|---|---|
| Kimlik ve iletişim | Hesap açık olduğu sürece |
| Silme talebi sonrası | **30 gün**, sonra geri döndürülemez anonimleştirme (`silmeleriUygula`) |
| Puan / kupon / bütçe defteri | **Kalıyor**, kişisel bağ kopuyor — ticari kayıt |
| Denetim izi (`audit_log`) | Kalıyor; kişisel veri **içermiyor** (redaction) |
| `sms_outbox` | ⚠️ **Temizlik işi yok — süre kararı gerekiyor.** Numara açık değil (maskeli + kör indeks) ama gönderim kaydı süresiz birikiyor. Öneri: **12 ay** (gönderim ispatı + itiraz penceresi), sonra silinsin. `[ONAY]` |
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
| Düzeltme | ⚠️ **Ekran yok** — KVKK başvuru adresine e-posta ile. Aydınlatma metni düzeltildi (aşağı bkz.) |
| Silme | "Hesabımı sil" → 30 günlük pencere, **iptal edilebilir** |
| İzin geri alma | Pazarlama izni tek dokunuşla açılıp kapanıyor |
| Görünürlük | Liderlik tablosunda ad gizleme |
| Hatırlatmayı kapatma | SMS hatırlatmaları kapatılabiliyor |

**Yanıt süresi:** KVKK gereği **en geç 30 gün**. Aydınlatma metni bunu
yazıyor.
**Başvuru adresi:** `[DOLDUR — §9'daki kimlik bloğunda]`

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

### Yaş sınırı — **18+, uygulanıyor**

**Ü2:** *"18+ zorunlu. Çocuk verisi hiç işlenmez; KVKK'nın veli onayı
rejimi devreye girmez."*

Kural `lib/validate.ts` → `dogumYiliSemasi` içinde ve kayıt şemasına bağlı
(`app/giris/actions.ts`). 18 yaşından küçük **kaydolamıyor**.

Doğum yılı kontrolden sonra da saklanıyor; amacı kontrolün yapıldığını
ispat etmek. Veri minimizasyonu açısından savunulabilir: toplanan alanın
tanımlı bir amacı var.

⚠️ **Bilinen sınır: kontrol YIL bazlı, gün hassasiyeti yok.** Yalnızca
doğum yılı toplanıyor, tam tarih değil; 18'ine o yıl içinde girecek biri
doğum gününden önce de kaydolabiliyor. Tam tarih istemek bunu kapatırdı
ama **daha fazla kişisel veri** toplamak demekti — minimizasyon ile
kesinlik arasında bilinçli tercih. Aydınlatma metninde böyle anlatılmalı.

⚠️ Envanter çıkarılırken bu kuralın **hiçbir testi olmadığı** görüldü ve
test yazıldı (`tests/hesap-silme.test.ts`). Testsiz bir doğrulama, bir gün
"şu alan fazla kısıtlıyor" diye sessizce gevşetilebilir; gevşediği an ürün
veli onayı rejiminin içine düşer.

### Diğer

- ✅ **Hizmet verilen ülke: Türkiye.** GDPR bölümü açılmıyor (aşağıya bkz.).
- **Veri sorumlusu:** `[DOLDUR: tüzel kişi tam unvanı]`
- **Vergi dairesi ve numarası:** `[DOLDUR]`
- **Kayıtlı adres:** `[DOLDUR]`
- **MERSİS numarası:** `[DOLDUR — varsa]`
- **KVKK başvuru e-postası:** `[DOLDUR — kvkk@looply.com gerçek mi?]`
- **KEP adresi:** `[DOLDUR — varsa]`
- **Alan adı:** `[DOLDUR — looply.com mu, cafeplay.com.tr mi?]`
  ⚠️ Belgelerde iki ad birden geçiyor; aydınlatma metninde tek ad olmalı.
- **VERBİS kaydı:** `[DOLDUR]` — çalışan sayısı ve yıllık ciro eşiklerine
  bağlı; avukat söyleyecek.
- **DPO / irtibat kişisi:** `[DOLDUR]`
- **İhlalde sorumlu kişi:** `[DOLDUR: ad + iletişim]` — Kurula **72 saat**
  içinde bildirimi bu kişi yapacak.

---

## AB'ye açılırsanız ne değişir

Bugün GDPR bölümü **bilerek yok** (kapsam: Türkiye). İleride AB kullanıcısı
hedeflenirse şunlar eklenir — belgeyi baştan yazmak gerekmez:

1. **Art. 6 hukuki dayanakları** — KVKK md. 5 karşılıkları zaten §2'de
2. **Veri taşınabilirliği** — `/verilerim` ekranı JSON indirme ile bunu
   zaten karşılıyor
3. **AB temsilcisi** (Art. 27) — AB'de yerleşik değilsek atanması gerekebilir
4. **Saklama sürelerinin açıkça yazılması** — §6'daki `[DOLDUR]`lar kapanmalı
5. ⚠️ **Sunucu Türkiye'de kalırsa**, AB'den Türkiye'ye aktarım GDPR'ın
   yeterlilik kararı sorununu doğurur. Bu, kapsam genişletme kararının en
   pahalı tarafı ve baştan bilinmeli.

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
