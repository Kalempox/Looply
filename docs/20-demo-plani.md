# 20 — Demo planı ve devir notu

> **Bu belge yeni bir oturumun okuyacağı ilk şey.** 2026-08-27'de alınan demo
> kararlarını, kodun bugünkü durumunu ve sıradaki işi taşıyor.

**Tarih:** 2026-08-27 · **Durum:** 286/286 test yeşil, `npm run ci` temiz

---

## 1 · Ne istendi

Ürün sahibinin 27 Ağustos'taki talebi, özetle: *"demoyu A'dan Z'ye tamamlayalım,
sonra simülasyon yapalım, ardından gerçek altyapıya geçelim."* Somut maddeler:

1. Karekodu okutan kişi **önce oynasın**, ödül kazansın; hesap açma **sonra** gelsin
2. Kayıt ekranında "Google ile devam", "Apple ile devam", şifre kuralları, "beni hatırla"
3. Gelen doğrulama kodlarının hepsi ekranda görünsün (simülasyon kolaylığı)
4. Oyunlar oynanabilsin ve ödül kazandırsın

Maddelerin ikisi **kilitli kararlarla çelişiyordu**; ikisi de karara bağlandı (§2).

---

## 2 · Alınan kararlar

### Ü35 · Demo modu — ürün kuralları bozulmuyor

*"Önce oyna, sonra kaydol"* **Ü1'e** (kayıt oyundan önce) aykırı. Çözüm, Ü1'i
değiştirmek değil, **üstüne bir vitrin katmanı** koymak:

> Kayıt öncesi oynanan oyun hiçbir deftere yazılmaz. Sunucu oyunu doğrular ve
> sonucu **imzalı bir talep** olarak çereze koyar. Oyuncu kaydolduğu anda o
> talep **normal yoldan** bozdurulur: gerçek bir `play_sessions` satırı ve
> gerçek bir ödül üretilir; K2, bütçe, günlük tavan ve fraud kuralları aynen
> işler.

Yani ürün kuralları hiç gevşemiyor — yalnızca oynama anı ile kayıt anı yer
değiştiriyor. Konum doğrulanmamışsa ödül yine açılmıyor ve ekran bunu dürüstçe
söylüyor.

### Ü36 · Kimlik: parola + SMS birlikte *(2026-08-27 akşamı genişletildi)*

İlk hâli "hepsi yalnızca görüntü" idi; ürün sahibi **parolanın gerçek olmasını**
istedi. Güncel karar:

| Öğe | Nasıl |
|---|---|
| **Parola** | ✅ **GERÇEK.** scrypt hash, `staff.pin_hash` ile aynı biçim ve parametreler. Kurallar: en az 8 karakter, büyük harf, küçük harf, rakam |
| **SMS** | ✅ Zaten gerçek. Parolanın **yerine değil yanına** — Ü1 değişmedi, hesap hâlâ doğrulanmış numaraya bağlı |
| **Beni hatırla** | ✅ **GERÇEK.** İşaretliyse 90 gün, değilse **12 saat** — ortak cihazda üç ay açık kalmasın |
| **Google / Apple ile devam** | ⚠️ **Yalnızca düğme.** Arkası SMS akışına düşüyor |

**"Şifremi unuttum" akışı bilerek yazılmıyor:** numara zaten doğrulanmış ve SMS
ile giriş açık. Parolasını unutan SMS ile girer, isterse yenisini belirler. Ayrı
sıfırlama jetonu, ayrı kanal ve ayrı saldırı yüzeyi doğmuyor — üstelik kurtarma
en güçlü kanaldan geçiyor.

**Google/Apple neden gerçek değil:** düğmelerin *çalışması* için Google tarafında
ücretsiz bir Cloud projesi + OAuth istemci kimliği, Apple tarafında **ücretli**
Developer Program üyeliği (~$99/yıl) ve yayında bir alan adı gerekiyor. Bunlar
ürün sahibinin hesaplarıyla açılır. Düğmelerin **görünmesi** için hiçbir şey
gerekmiyor — o yüzden şimdilik görünüyorlar.

> ⚠️ Google/Apple düğmeleri `kodEkrandaGosterilir()` kapısının arkasında durur —
> `APP_ENV !== production` **ve** sahte SMS sağlayıcısı. Çalışmayan bir giriş
> düğmesinin canlıya sızması, demo kolaylığından pahalıya mal olur. Parola ve
> "beni hatırla" gerçek olduğu için kapı gerektirmiyor.

---

## 3 · "Oyunlar oynanmıyor" — kovalandı, oyunlar çalışıyor

Blok tarayıcıda uçtan uca oynandı: parça seçildi, hücreye kondu, **skor 0 → 4**.
Motor sağlam.

Yol boyunca bir yanılgı yaşandı ve kayda değer: dolan hücre mavi yerine gri
görünüyordu. Sebep üründe değil, **inceleme aracındaydı** — tarayıcı paneli gizli
olduğu için (`visibilityState: hidden`) `transition-colors` geçişi donuyor ve
renk başlangıç değerinde takılı kalıyor. `transition: none` verilince anında
maviye döndü.

> **Ders:** gizli panelde CSS geçişi ölçülmez. Renk doğrulaması yapılacaksa ya
> panel görünür olmalı ya da geçiş kapatılmalı.

### Ödül kazanılamamasının gerçek sebebi

Oyun ekranının tepesinde **"KAZANDIRMAZ"** yazıyor: konum doğrulanmadan
(K2) puan, XP, kupon ve taht — hiçbiri yazılmıyor. **Ü3'ün ta kendisi**, hata
değil.

Üstelik 27 Ağustos sabahına kadar gerçek bir kafenin konumu **hiç
ayarlanamıyordu** (koordinatı yalnızca tohum betiği yazıyordu). O ekran yazıldı:
`/kafe/panel/konum`. Demo öncesi **bir kez basılmalı** — yoksa demo yapılan yer
İstanbul değilse oyuncu "kafeden 380 m uzaktasın" görür.

---

## 4 · Kodlar zaten ekranda — keşfedilebilirlik sorunu olabilir

Üç yerde birden görünüyorlar:

| Nerede | Ne |
|---|---|
| `/gelistirme` | **Tüm** gelen kodların defteri, üç saniyede bir kendini yeniliyor |
| Giriş ekranı | Kod satır içinde, altın kutuda |
| Her sayfanın sağ alt köşesi | "KODLAR" kısayolu |

Hepsi `kodEkrandaGosterilir()` kapısının arkasında; canlıda hiçbiri yok.
Eksik görülen bir şey varsa tamamlanacak — ama önce eksiğin ne olduğu
netleşmeli.

---

## 5 · Sıradaki iş — demo modunun uygulanması

Sıra demo etkisine göre. Hiçbiri kilitli kararı bozmuyor.

### 5.1 · Misafir oyun akışı (Ü35)

```
/m/{kod}  →  masa bileti çerezi  →  /hemen   (yeni ekran)
                                      ↓
                            oyun seç → oyna → sonuç
                                      ↓
                    "Ödülünü kullanmak için hesabına gir"
                                      ↓
                        /giris  →  kayıt/giriş  →  talep bozdurulur
                                      ↓
                    gerçek play_sessions + gerçek ödül (K2 şartıyla)
```

Yazılacaklar:

| Parça | Not |
|---|---|
| `/hemen` ekranı | Masa künyesi + oyun seçimi + oyun kabuğu. Mevcut `OyunEkrani` aynen kullanılır |
| `misafirBasla(oyunId, bolum)` | Tohumu **sunucu** üretir (istemci tohum seçemez). DB satırı yok; imzalı çerez |
| `misafirBitir(girdiler, iddia)` | Sunucu `tekrarOyna` ile doğrular, sonucu imzalı **talep çerezine** yazar |
| Talebin bozdurulması | `giris/actions.ts` içinde, `kaydet`ten hemen sonra — masa bileti örüntüsüyle aynı yerde |
| Talep ömrü | Kısa (30 dk). Süresi dolan talep sessizce düşer |

**Dikkat edilecek:** talep çerezi **imzalı** olmalı (masa bileti gibi), yoksa
oyuncu kendi skorunu yazar. Zaten `qr.ts` içinde bilet imzalama örüntüsü var.

### 5.2 · Kimlik: parola + SMS (Ü36)

#### ✅ Zaten yazıldı — tekrar yazma

| Parça | Nerede |
|---|---|
| Göç `0017_oyuncu_parolasi.sql` | `players.password_hash`, `players.password_set_at`, `sessions.remember_me` — **uygulandı** |
| `domain/parola.ts` | Kurallar, scrypt hash, `belirle`, `varMi`, `girisDene` (hız sınırlı, tek hata mesajı) |
| `session.olustur({ hatirla })` | `hatirla: false` → 12 saat, aksi hâlde 90 gün |
| Denetim işlemi | `player.password_set` |

#### ⬜ Kalan — `/giris` ekranının yeniden düzeni

Ekran bugün tek akış: telefon + isim → SMS. Olması gereken:

```
/giris
 ├─ [Google ile devam]  [Apple ile devam]      ← demo kapısı arkasında
 ├─ ── veya ──
 ├─ Sekme: "Giriş yap"  |  "Hesap aç"
 │
 ├─ Giriş yap:   telefon + parola  → [Gir]
 │               "SMS ile gir" bağlantısı → mevcut OTP akışı
 │               [ ] Beni hatırla
 │
 └─ Hesap aç:    telefon + ad + soyad + doğum yılı
                 + parola (canlı kural listesi)
                 + onaylar (aydınlatma zorunlu, pazarlama ayrı)
                 [ ] Beni hatırla
                 → SMS doğrulama → hesap + parola birlikte yazılır
```

Yazılacak sunucu eylemleri (`app/giris/actions.ts`):

| Eylem | İş |
|---|---|
| `parolaIleGir(durum, form)` | `telefonlaBul` → `parola.girisDene` → `oturum.olustur({ hatirla })`. Hata mesajı **tek**: "Numara veya parola hatalı" (kayıtlı numarayı ele vermemek için) |
| `kodGonder` | Değişiklik yok; `parola` ve `hatirla` alanlarını adım 2'ye taşısın |
| `kodDogrulaVeGir` | `kaydet`ten sonra parola verildiyse `parola.belirle`; `oturum.olustur`a `hatirla` geçsin |

Hız sınırı anahtarı **kişisel veri içermemeli** (docs/08 §7.1) — telefonun kör
indeksinin ilk baytları kullanılmalı, numaranın kendisi değil.

### 5.3 · Simülasyon

İki yol var, ikisi de kurulabilir:

1. **Betikle veri üretme** — 30 oyuncu, bir haftalık trafik, kuponlar, kasa
   onayları. Ekranlar dolu görünür, rapor anlamlı sayılar gösterir.
2. **Tarayıcıda elle tam tur** — yavaş ama gördüğün şey gerçek demo.

Önerilen: önce betikle hafta doldurulur, sonra tarayıcıda tek tur elle yürünür.

---

### 5.4 · Sıra

1. `/giris` ekranının yeniden düzeni (§5.2 kalan kısmı) — misafir akışı buraya iniyor
2. Misafir oyun akışı (§5.1)
3. Simülasyon (§5.3)

---

## 6 · Demoyu çalıştırma

```bash
npm run db:up && npm run db:migrate && npm run db:seed && npm run dev
```

| Konu | Değer |
|---|---|
| Oyuncu | Herhangi bir numara — kod ekranda çıkar |
| Kafe A yöneticisi | 0532 000 00 01 |
| Kafe B yöneticisi | 0532 000 00 02 |
| Platform yöneticisi | 0531 000 00 01 |
| Kasiyer PIN | 1234 |
| Kodlar defteri | `/gelistirme` |

**Telefondan demo yapılacaksa HTTPS şart** — `navigator.geolocation` yalnızca
güvenli bağlamda çalışıyor. `localhost` güvenli sayılıyor, `http://192.168…`
sayılmıyor. Üç yol:

| Yol | Güven deposuna dokunur mu |
|---|---|
| Laptop tarayıcısında demo | Hayır |
| `npx cloudflared tunnel --url http://localhost:3000` | Hayır |
| `npm run dev:https` (önce **kullanıcı** `mkcert -install` çalıştırır) | **Evet** — kök sertifika kurar |

---

## 7 · Bu turda tamamlananlar

| Ne | Nerede |
|---|---|
| Ü31 arayüz geçişi | `16-faz8-kapi-raporu.md` §7 |
| Faz 8 · kafe raporları | `16-faz8-kapi-raporu.md` |
| S17 oyun aday listesi | `18-oyun-adaylari.md` — **karar bekliyor** |
| Faz 9 · davet + fraud | `19-faz9-davet-kapi-raporu.md` |
| Ö1 · Masayı Fethet | `02` Ü33 |
| Ö3 · Happy Hour havuzu | `02` Ü34 |
| D11 · masa karekodları | panel → Masa karekodları |
| Kafe konumu paneli | 🔴 onaylı kafelerde ürün sessizce çalışmıyordu |
| Oyuncu parolası · altyapı | göç `0017`, `domain/parola.ts`, oturumda `hatirla` — **ekran kısmı §5.2'de kaldı** |

## 8 · Karar bekleyenler

| # | Konu |
|---|---|
| **S17** | Kalan 7 oyunun listesi → `18-oyun-adaylari.md` |
| **S20** | Aydınlatma metni hukuk incelemesi — **pilotu bloke ediyor**, teslim 1–2 hafta |
| **Ü32** | Davet XP'si niteliklenen kafeye yazılıyor — varsayım, onay bekliyor |
| **Ü33** | Tahtta ad varsayılan görünür — hukuki incelemeye tabi |
| — | Ö2 masa oyunu (takım modu) — Faz 9'un kalan tek bloğu |
