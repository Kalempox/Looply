# 02 — Karar Defteri

> **CANLI DOKÜMAN.** Her karar turunda güncellenir. Çelişkide bu dosya kazanır.

**Son güncelleme:** 2026-08-27

---

## Özellik kararları

| # | Fikir | Karar | Tarih | Gerekçe |
|---|---|---|---|---|
| Ö1 | **Masayı Fethet** (masa leaderboard) | ✅ KABUL | 2026-08-22 | En ucuz geliştirme, en yüksek tekrar-oynanma. Masaya kimlik verir. |
| Ö2 | **Masa Oyunu** (takım modu) | ✅ KABUL | 2026-08-22 | Grup > birey. Adisyon 3-4 katı, doğal viralite. |
| Ö3 | **Happy Hour** | ✅ KABUL — **havuz olarak, dümdüz** | 2026-08-22 | Çarpan matematiği yerine görünür TL havuzu. İki tarafın da anladığı tek dil. |
| Ö4 | **Ürün İtme Kampanyası** | ✅ KABUL | 2026-08-22 | En kolay satılan özellik. Kafenin zaten sahip olduğu ihtiyaç. |
| Ö5 | **Masa vs Masa Düellosu** | ❌ RET | 2026-08-22 | **İnsanlar birbirini rahatsız edebilir.** Kafede gürültü üreten mekanik uzun ömürlü olmaz. |
| Ö6 | Google yorum teşviki | ❌ RET | 2026-08-22 | Google/TripAdvisor teşvikli yorumu açıkça yasaklıyor. Kafenin işletme profili cezalandırılır. |

---

## Altyapı kararları

| # | Konu | Karar | Tarih |
|---|---|---|---|
| ~~A1~~ | ~~Evde oynama — sadece XP~~ | ⛔ **Ü3 ile geçersiz.** Evde oynama hiçbir şey kazandırmaz. | 2026-08-22 |
| A2 | **Tek para birimi: puan** | ✅ Geçerli. Ü14 XP'yi geri getirdi ama XP **harcanmıyor** — para birimi değil, ilerleme sayacı. Harcanabilir tek birim puan olarak kalıyor. | 2026-08-22 |
| A3 | **Kanıt seviyeleri** | K1–K5 kademeli doğrulama, ödül değerine göre | 2026-08-22 |
| A4 | **Kupon "kullanıldı" yetkisi** | **Asla oyuncunun telefonunda değil.** Kasiyer onaylar (K5). | 2026-08-22 |
| A5 | **Ödül zamanlaması** | Çift katmanlı: küçük ödül anında, **büyük ödül yarından itibaren** | 2026-08-22 |
| A6 | **Ürün doğrulama (MVP)** | **Kasiyer kodu.** POS entegrasyonu V2. | 2026-08-22 |
| A7 | **Gelir bağı** | Havuzu **açmak ücretsiz**, havuzu **duyurmak ücretli** | 2026-08-22 |
| A8 | Çapraz-kafe XP kullanımı | ⏸️ **V2'ye ertelendi** — mahsuplaşma mekanizması çözülmeden olmaz | 2026-08-22 |

---

## Ürün kararları — akış ve kapsam

> 2026-08-22 karar turu. Ürün sahibinin tarif ettiği akış, önceki bazı varsayımları geçersiz kıldı.

| # | Konu | Karar |
|---|---|---|
| Ü1 | **Kayıt akışı** | Karekod → **telefon + ad + soyad → SMS doğrulama** → oyun. Kayıt oyundan **önce**. |
| Ü2 | **Yaş sınırı** | **18+ zorunlu.** Çocuk verisi hiç işlenmez; KVKK'nın veli onayı rejimi devreye girmez. |
| Ü3 | **Kafe dışında oynama** | Serbest ama **hiçbir şey kazandırmaz** — ne puan, ne kupon, ne sıralama. |
| ~~Ü4~~ | ~~**XP kaldırıldı**~~ | ⛔ **Ü14 ile geri alındı.** XP geri geldi — ama para birimi olarak değil, harcanmayan ilerleme sayacı olarak. |
| Ü5 | **Puan kafe bazında** | A kafesinin puanı A'da harcanır. Mahsuplaşma sorunu (S8) şema düzeyinde doğmaz. |
| Ü6 | **Kafe bütçesi: haftalık taban** | Minimum **1.500 TL/hafta**. Altına inilemez, üstüne çıkılabilir. Devretmez. |
| Ü7 | **Bütçe kasada tükenir** | REZERVE → HARCANDI / SERBEST. Kullanılmayan kuponun maliyeti yok. |
| ~~Ü8~~ | ~~**Yüzde indirimleri bütçe dışı**~~ | ⛔ **Ü17 ile değişti.** TL tavanı gelince bütçe dışında tutma gerekçesi kalktı. Adet + süre limiti zorunluluğu **devam ediyor**. |
| Ü9 | **Kuponu kasiyer kapatır** | Yetki asla oyuncunun telefonunda değil. → Onay yöntemi **Ü19 ile genişledi**: QR birincil, 6 haneli kod yedek. |
| Ü10 | **10 oyun, kategori yok** | İlk sürümde kategori ayrımı yapılmayacak. Motor takılabilir, oyunlar partiler hâlinde. |
| Ü11 | **Ürün adı: CafePlay** | Geçici. Klasör adı `cafemasa` kalıyor. → S9 şimdilik kapandı. |
| Ü12 | **Platform: web** | Native uygulama **yok**. Safari, Chrome ve diğer tüm tarayıcılarda doğru çalışmalı. |
| Ü13 | **Dış servisler arayüz arkasında sahtelenir** | Kod, mimari ve güvenlik **gerçek**; yalnızca dışarıya açılan uçlar takılıp çıkarılabilir. SMS önce ekrana basılır, sonra tek dosyayla gerçek sağlayıcıya bağlanır. Atılacak prototip değil — ürünün kendisi. |

### Yeni kapsam karar turu — 2026-08-24

> 24 Ağustos'ta gelen üç kaynak doküman (davet + fraud, kupon QR akışı, ödül tipleri)
> mevcut kararlarla beş yerde çelişiyordu. Çelişkiler `12-yeni-kapsam.md`'de
> Ç1–Ç6 olarak çıkarıldı ve bu turda karara bağlandı. S18 ve S19 de burada kapandı.

| # | Konu | Karar | Kaynak |
|---|---|---|---|
| Ü14 | **XP geri geldi — ilerleme sayacı olarak** | Ayrı, **harcanmayan** sayaç. Ü3'e sadık: yalnızca **kafede** kazanılır, kafe dışında oynamak XP de kazandırmaz. Puan para, XP ilerleme. Seviye, rozet ve (Faz 9'da) davet ödülü aynı kavrama bağlanır. Ü4 geri alındı. | Ç2 · S18 |
| Ü15 | **Seviye yalnızca kafe bazında** | Ü5 ile tam tutarlı: XP kafe bazında birikir, seviye o kafedeki XP'den hesaplanır. **Global profil seviyesi yok.** Oyuncu "bu kafede 4. seviyeyim" der, "ben 4. seviyeyim" demez. | S18 |
| Ü16 | **Rozetler yalnızca statü** | Platformun tanımladığı **sabit liste**; kafe kendi rozetini tanımlayamaz. **Ekonomik değeri yok** — puan, kupon veya bütçe muhasebesine hiç dokunmaz, E5'i bozmaz, yeni fraud yüzeyi açmaz. | S19 |
| Ü17 | **Yüzde indirimler TL tavanlı ve bütçeye dahil** | `%20 · en fazla 100 TL` biçiminde. **Tavandan rezerve edilir**, kasada gerçekleşen tutar harcanan olarak düşülür, aradaki fark bütçeye iade edilir. Tek bütçe defteri kalır. Ü8'in adet + süre limiti zorunluluğu aynen sürüyor. | Ç4 |
| Ü18 | **Kafe bakiyesi v1'de yok** | Saklanan değer aracı v1 kapsamı dışında. Bakiye defteri, kısmi kullanım, kalan takibi, iade/itiraz akışı ve ödeme mevzuatı sınırı hiç doğmuyor. Pilot verisinden sonra yeniden tartışılır. **→ Ü40 ile genişletildi:** sabit tutarlı indirim eklendi; o bakiye değil, tek kullanımlık kupon. | Ç5 |
| Ü19 | **Kupon onayı: QR birincil, kod yedek** | İkisi de **aynı tek kullanımlık jetonu** taşır ve **aynı atomik onaydan** geçer. QR hızlı; kamera izni reddedilirse, ışık kötüyse veya ekran kırıksa 6 haneli kod devrede. QR'ın içinde ödül bilgisi **yok** — yalnızca jeton; değer sunucudan gelir. Ü9'un yetki kuralı değişmedi. | Ç1 |
| Ü20 | **Davet sistemi + fraud motoru → Faz 9** | Çekirdek döngü (oyna → kupon → kasa) kapanmadan davet kurmak, ödül vaat edilen şeyin henüz çalışmadığı anlamına gelir. Ayrıca fraud motoru ancak davranış verisi biriktikten sonra kalibre edilebilir. İlk sürümde davet ödülü **para değil XP** (Ü14). | Ç6 |

**Ç3 · Bütçe dönemi:** Yeni doküman "günlük 1.500 TL" diyordu; **Ü6 geçerli** — haftalık taban 1.500 TL. Aradaki yedi katlık fark, yeni dokümanın eski varsayımla yazılmış olmasından.

**Ü14'ün getirdiği şema borcu:** XP için ayrı, append-only ve kafe bazlı bir defter gerekiyor (E3). Puan defterinden ayrı tutulmalı — birleştirilirse "harcanmayan sayaç" garantisi kaybolur.

**Ü17'nin getirdiği şema borcu:** rezervasyon artık **tavan tutarından** yapılıp gerçekleşen tutara göre kapanıyor; bütçe defterine rezerve edilen ve gerçekleşen ayrı ayrı yazılmalı (E10, E11 bozulmadan).

### Faz 5 karar turu — 2026-08-25

| # | Konu | Karar | Kaynak |
|---|---|---|---|
| Ü21 | **İlk üç oyun** | **Blok yerleştirme** (8×8 ızgara, teklif edilen parçalar) · **Düşen blok** · **Kelime bulmaca**. Üçü de yapısal olarak farklı girdi üretiyor — takılabilir motorun genellediğini kanıtlıyorlar. Her birine **5 bölüm**. | S17 (kısmen) |
| Ü22 | **Düşen blok oyunu kendi kimliğimizle** | Mekanik kurulur, **ad ve görsel dil bize ait**. "Tetris" markası lisanssız kullanılmaz — The Tetris Company klonlara karşı dava açıyor ve kazanmış durumda (Tetris Holding v. Xio, 2012; ihlal *görsel ifade* benzerliğinden doğdu). Düşen-blok mekaniğinin hareket alanı avukat sorularına eklenir (G6, `08` §10). | — |
| Ü23 | **Kelime kaynağı: hunspell-tr (MPL-2.0)** | Türkçe, ücretsiz, geniş; ve **veriyi açıkça kapsayan tek lisans**. Zemberek yalnızca *"code is licensed under Apache-2.0"* diyor — sözlük verisi için ifade yok, veri yeniden dağıtılacağı için o boşluğa girilmiyor. TDK'dan bot ile kazınmış listeler **kullanılmaz**: TDK açık lisans vermiyor. | — |
| Ü24 | **Kelime listesi ~5.000, küratörlü** | Kökler çıkarılır; 3–7 harf, özel ad yok, kısaltma yok, arkaik yok. **Küfür ve hakaret süzgeci zorunlu** — ekran kafede görünür yerde duruyor. Nadir ama geçerli kelimenin bonus sayılmaması kabul edilen bedel. | — |

**Ü23'ün getirdiği yükümlülük:** MPL-2.0 **dosya düzeyinde** copyleft'tir. hunspell-tr verisinden türetilen kelime listesi dosyası MPL-2.0 kalır ve kaynağı erişilebilir tutulur. Uygulama kodunun lisansına dokunmaz. Liste rekabet avantajı olmadığı için bu bedel bilerek kabul edildi.

**S5 notu:** seçilen üç oyun deterministik replay'e uygun. Eski listedeki **tepki süresi oyunları (Refleks) uygun değildi** — sunucu istemcinin zaman damgasına inanmak zorunda kalıyordu. `lib/games.ts` bu üçüne göre yeniden düzenlenecek.

**İçerik geçici:** ürün sahibinin notu — *"önemli olan anlam değil harf sayısı ve kelimeler, harfler şimdilik göstermelik."* Kalıcı olan **motor ve sunucu doğrulaması**; bölüm içerikleri sonradan değiştirilebilir veri.

### Faz 6 karar turu — 2026-08-25

| # | Konu | Karar | Kaynak |
|---|---|---|---|
| Ü25 | **Bütçe haftası pazartesi başlar, ilk dönem orantılı** | Tüm kafeler aynı takvimde — raporlar karşılaştırılabilir, operasyon tek ritimde. Kafe hafta ortasında katılırsa ilk dönem kısa olur ve **alt sınır da orantılı** uygulanır: 3 günlük ilk dönemde taban `3/7 × 1.500 TL`. Tam haftada taban yine 1.500 TL. | S13 |
| Ü26 | **Yüzde indirim iki yerde birden** | ① **Katalogda:** TL tavanlı indirim kuponu, oyuncu **puanıyla satın alır**. ② **Kampanya olarak:** kafe ürün bazında yüzde tanımlar, puan istemez, otomatik düşer. İki farklı ihtiyaç: birincisi oyuncunun hedefi, ikincisi kafenin itmek istediği ürün (Ö4). Şema zaten iki tablo — `rewards` ve `percentage_campaigns`. | S16 |

**Ü25'in getirdiği şema borcu:** `budget_periods.committed_kurus >= 150000` kısıtı orantılı ilk dönemi **reddederdi** (3 günlük dönemde 643 TL < 1.500 TL). Kısıt dönem uzunluğuna göre ölçeklenecek: `committed_kurus * 7 >= 150000 * (period_end - period_start)`. Gevşetme olduğu için mevcut hiçbir satır ihlale düşmüyor (G23).

**Ü26'nın getirdiği şema borcu:** `rewards` tablosu ödülün **tipini** bilmiyor — `kind` alanı ('instant'/'catalog') nasıl verildiğini söylüyor, ne olduğunu değil. `reward_type` ('product'/'percent') ve `percent` kolonları eklenecek. Yüzdeli ödülde `cost_kurus` **TL tavanı** anlamına gelir; Ü17 "tavandan rezerve edilir" dediği için rezervasyon mantığı değişmeden çalışır.

### Faz 7 karar turu — 2026-08-25

| # | Konu | Karar | Kaynak |
|---|---|---|---|
| Ü27 | **Anlık ödül döngüsel seçilir** | Kafenin sıraladığı listeden **sırayla**: birinci nitelikli oyuncuya ilk ödül, ikinciye ikinci, liste bitince başa döner. Rastgelelik yok — E8 öngörülemezliği reddetti, arka kapıdan geri girmesin. Kafe sırayı panelden değiştirebilir. | S12 |
| Ü28 | **51 TL üstü ödül ertesi gün aktifleşir** | ~~A5'in sayıya bağlanmış hâli; eşik E6'nın K4 kademesiyle aynı.~~ **→ Ü39 ile değiştirildi (2026-08-31): 12 saat + kafenin ayarı.** | A5 |

**Ü27'nin uygulanışı — durum tutmadan:** sıra, kafenin bugüne kadar dağıttığı anlık kupon sayısının aktif anlık ödül sayısına bölümünden kalan. Ayrı bir sayaç kolonu gerekmiyor; defter zaten sayıyı taşıyor. Kafe listeyi değiştirirse sıra kayar — kabul edilen bedel.

**Ü28'in getirdiği şey:** kupon `activates_at` alanı zaten var (Faz 2). Ertelenen kupon `pending` durumunda başlıyor, süresi dolunca `active` oluyor. Oyuncu ekranı bunu dürüstçe söylüyor. *Süre ve eşik Ü39 ile değişti — aşağı bak.*

### Faz 8 karar turu — 2026-08-25

| # | Konu | Karar | Kaynak |
|---|---|---|---|
| Ü29 | **Satılan birim: nitelikli oyuncu** | Kaynak dokümanın modeli benimsendi: **Free Reach** (günde N nitelikli oyuncu ücretsiz) + **Boost** paketleri (+20/+50/+100…). A7 ile tutarlı: havuzu açmak ücretsiz, duyurmak ücretli. Kafe raporunun **baş sayısı** bu; diğer sayılar onu açıklıyor. | S14 |
| Ü30 | **Rapor mahremiyet eşiği: 5** | Saat ve masa kırılımında **5 kişiden az** içeren gruplar sayı yerine `<5` gösterilir; toplamlar yine doğru. Küçük kafede *"14:32'de 3 oyuncu"* satırı işletmecinin hafızasıyla birleşince kişiyi işaret edebilir — G1'in rapor tarafındaki karşılığı. | Faz 8 kapısı |

**Ü29'un teknik durumu:** `play_sessions.is_qualified` Faz 5'ten beri hesaplanıyor — günde bir, cihaz ve kafe başına (S3, docs/06 §5). Rapor için **ek şema gerekmiyor**.

**Ü29'un kapsam dışı bıraktığı:** Free Reach kotasının sayısı ve Boost fiyatları **ticari karar**; ürün sahibinde. Faz 8 kotayı *uygulamıyor*, yalnızca satılan birimi ölçüp gösteriyor. Kota zorlaması ve faturalama pilot sonrasına kalıyor.

### Tasarım dili karar turu — 2026-08-26

| # | Konu | Karar | Kaynak |
|---|---|---|---|
| Ü31 | **Tasarım dili: "Açık ve Asil"** | Koyu çini paleti **terk edildi.** Yerine açık, beyaz zeminli, tek mavi vurgulu (`#0B57D0`) ve asil altın ödül renkli (`#D4AF37`) bir sistem. Tipografi **Outfit** (metin ve başlık) + **JetBrains Mono** (tüm sayılar). Ayırıcı öğe: 1px `#E5E5E5` saç teli çizgiler ve gölge yerine tonlama. Köşeler yuvarlatılıyor — kart 16px, düğme 8px, çip 4px. | Ürün sahibi |

**Ü31'in geçersiz kıldığı:** `globals.css` içindeki İznik/çini paleti ve `.karo` bileşeni (koyu degrade + kobalt iç çerçeve). Üç ayrı palet (oyuncu koyu / işletme kâğıt / kasa koyu) **tek palete indi**; üç yüzeyi ayıran şey artık renk değil **yoğunluk, süs ve ton**: oyuncu ifadeli, kasa büyütülmüş, işletme belge gibi.

**Ü31'in dokunmadığı:** E9 (oyuncu kupon ekranında TL ve geçerlilik damgası yok), G1 (kafe ekranlarında kişisel veri yok) ve alt gezinmenin üç durağı. Bunlar tasarım tercihi değil, güvenlik ve mahremiyet kuralları — palet değişse de aynen duruyor.

**Uygulanışı:** `docs/17-stitch-arayuz-promptu.md` — kilitli sistemin tam tanımı, ekran promptları ve koda taşıma adımları. **40 ekranın tamamı** `docs/tasarim/` altında, tek ortak kabukta ve birbirine bağlı.

**⚠️ Kontrast düzeltmesi — 2026-08-26.** Kilitli değerlerden ikisi sistemin **kendi** erişilebilirlik kuralını (4.5:1) tutturamıyordu. `#757575` sönük metin sayfa zemininde 4.41, çukur zeminde 4.12'de kalıyordu → **`#6B6B6B`** (en kötü hâl 4.76). `#D4AF37` **metin olarak** beyazda 2.10'daydı — iyi gören bir gözde bile kayboluyor → altının yazı hâli için **`#856612`** (`--color-odul-koyu`) eklendi. Altın; çerçeve, dolgu ve asil şerit olarak `#D4AF37` kalıyor, ürünün tanınır rengi orada. `#D93025` değişmedi, yalnızca zemini değişti (tehlike kutuları çukurdan yüzeye alındı: 4.26 → 4.77). Tasarım dosyaları da aynı değerlere çekildi. **Bu bir palet genişletmesi değil, aynı rengin okunabilir tonu — ürün sahibinin onayına açık.**

**✅ Koda taşındı — 2026-08-26.** 49 dosya değişti, `npm run ci` yeşil kaldı (210 test). Üç yerde plandan sapıldı ve üçünün de gerekçesi kayıtta: alt gezinme ikonları Material Symbols yerine **elle çizilen SVG** (ikon ailesi yalnızca CDN'de; oyuncunun sayfa trafiği üçüncü tarafa sızmasın), font değişkenleri `<body>` yerine **`<html>`** (yoksa `@theme` zinciri `:root`ta kopuyor ve tüm metin Times'a düşüyor), ve **mikro etiketler mono'dan Outfit 600'e** (bu sistemde mono yalnızca sayıya ait). Ayrıntı: `16-faz8-kapi-raporu.md` §7.

---

## Güvenlik ve mahremiyet kararları

> Sistem telefon numarası, ad ve soyad işliyor; kafe tarafında indirim ve ciro verisi tutuyor.
> Bu kararlar `07-uretim-plani.md`'nin dayanağıdır.

| # | Konu | Karar |
|---|---|---|
| G1 | **Kafe ne görür** | **Sadece anonim kod** (P-4F2A) ve davranış verisi. Ad, soyad, telefon **hiçbir ekranda yok**. |
| G2 | **Platform ne görür** | Tam veri — kampanya mesajı, sıralama, destek için. Veri sorumlusu platform. |
| G3 | **Barındırma** | **Türkiye'de sunucu.** Yurt dışına aktarım yükümlülüğü hiç doğmaz. |
| G4 | **SMS sağlayıcısı** | **Türkiye'den.** Entegrasyon sağlayıcıdan bağımsız yazılır. |
| G5 | **Kafe kaydı** | **Belge + manuel onay.** Onaylanmadan hiçbir karekod üretilmez. |
| G6 | **Hukuki destek** | Alınacak. Aydınlatma, açık rıza ve kafe sözleşmesi avukat onayından geçecek. |
| G7 | **Pazarlama mesajı** | Hizmet rızasından **ayrı izin** + **İYS kaydı**. Kayıt onayı bunu kapsamaz. |
| G8 | **Çalışma ritmi** | Her fazın **başında onay alınır**, sonunda sonuç gösterilir. |
| G9 | **Platform ekibi ikiye ayrılır** | `platform_destek` günlük işi yapar ama **kişisel veri göremez**. Telefon/ad/soyad yalnızca `platform_admin`'de ve **her erişim kayıtlı**. → `08` §1 |
| G10 | **Ham konum saklanmaz** | Sunucu enlem/boylamı alır, kafeye **uzaklığı metre olarak** yazar ve koordinatı atar. Oyuncunun nerede olduğu değil, kafeye yakın olup olmadığı tutulur. |
| G11 | **Kasiyer PIN'i yalnızca kayıtlı cihazda çalışır** | 4 hane tek başına yeterli güvenlik değil. Cihaz kaydı yöneticinin onayıyla bir kez yapılır. |
| G12 | **Kiracı izolasyonu iki katmanlı** | Uygulama süzgeci + PostgreSQL satır düzeyi güvenliği (RLS). Biri geliştirici hatasına, diğeri yapılandırma hatasına karşı. |
| G13 | **Hesap ancak SMS doğrulandıktan sonra yazılır** | Doğrulanmamış telefon numarası veritabanında kalıcı olarak durmaz. |

### Güvenlik incelemesi turu — 2026-08-22

> Planın kendi zayıf noktaları tarandı; on açık bulundu ve hepsi işlendi.

| # | Konu | Karar |
|---|---|---|
| G14 | **Global SMS tavanı** | Numara/IP kotaları yetmez — dağıtık saldırı hepsinin içinde kalır. Günlük toplam tavan; %70 uyarı, %90 **kayıt durur**, %100 tamamen durur. Giriş en son durur. |
| G15 | **Yedekler şifreli ve ayrı anahtarlı** | Sızıntının en yaygın yolu korumasız yedek. Ayda bir **geri yükleme tatbikatı** — geri yüklenemeyen yedek, yedek sayılmaz. |
| G16 | **SIM swap: 24 saat ödül kilidi** | Çift doğrulama SIM swap'i çözmez, iki mesajı da saldırgan alır. Koruma sonuçta: numara değişince 24 saat kupon kullanılamaz. |
| G17 | **Olay müdahale planı Faz 3'ten önce** | Faz 3'te gerçek numaralar giriyor; KVKK bildirim süresi 72 saat. Faz 10'a bırakılamaz. |
| G18 | **Acil durdurma tasarlanmış bir yetenek** | Dört düğme: kafeyi askıya al · tüm oturumları iptal et · kupon dağıtımını durdur · SMS'i durdur. O an kod yazarak yapılamaz. |
| G19 | **İzleme ve alarm eşikleri** | Saldırıyı fark etmek, engellemek kadar önemli. Yedi alarm tanımlandı. |
| G20 | **Toplu kişisel veri erişimi kısıtlı** | Kayıt tutmak, on bin kaydın okunmasını durdurmaz. 50+ kayıt → ikinci admin onayı. Toplu dışa aktarma **yasak**. |
| G21 | **Kasiyer PIN paylaşımı: bilinçli ödün** | Sahada engellenemez. Engellemeye çalışmak yerine **görünür kılınıyor**: günlük personel bazlı onay raporu işletmeciye gider. |
| G22 | **Güvenlik incelemesi Faz 3 kapısında da** | En riskli faz orası; Faz 10'daki sızma testini beklemeye gelmez. |
| G23 | **Göçler asla yıkıcı olmaz** | Kolon silinmez, kullanımdan kaldırılır. Her dağıtım geri alınabilir kalır. |
| G24 | **CI zorunlu** | Elle çalıştırılan güvenlik kapısı unutulur. Çapraz kiracı testi ve log PII taraması her değişiklikte otomatik; kırmızıysa dağıtım yok. |
| G25 | **KVKK hakları ekranı Faz 3'te** | "Panelden erişilir" yazıyordu ama onu inşa eden faz yoktu. Göster, düzelt, indir, sil, ticari ileti iznini geri al. |

### Faz 3 uygulama kararları — 2026-08-23

| # | Konu | Karar |
|---|---|---|
| G26 | **Liste ekranları tam telefon göstermez** | Başvuru listesi **hiçbir role** tam numara vermiyor. Açmak ayrı bir işlem ve her açış gerekçesiyle denetim izine düşüyor. → Test sırasında `platform_destek` rolünün tam numarayı gördüğü tespit edildi; G9 ihlaliydi, kapatıldı. |
| G27 | **Kayıtsız numarada da "kod gönderildi" denir** | Kafe ve platform girişinde hesabın var olup olmadığı kullanıcıya söylenmez. Aksi halde giriş ekranı, hangi numaraların sistemde yönetici olduğunu sorgulama aracına dönüşürdü. |
| G28 | **PIN hash'i argon2 yerine scrypt** | Node'un içinde geliyor, yerel derleme gerektiren bağımlılık eklemiyor. İkisi de bellek-zorlayıcı; 4 haneli PIN'de belirleyici olan zaten hash değil, **cihaz bağlama + kilitleme**. |
| G29 | **Zayıf PIN reddedilir** | `1234`, `0000`, `1111` gibi diziler kabul edilmiyor. 10.000 ihtimalin en çok denenen 16'sı kapatılıyor. |
| G30 | **Sahte SMS sağlayıcısında kod ekranda görünür** | Test için sunucu logu okumak gereksiz sürtünmeydi. İki şart birden aranıyor (`APP_ENV` canlı değil **ve** sağlayıcı `console`) ve canlıda ikisi birden sağlanamıyor. |
| G31 | **Giden mesaj defteri (`sms_outbox`)** | SMS doğrudan gönderilmiyor, önce deftere yazılıyor: "gönderdik" iddiasının dayanağı, maliyet sayımının tek güvenilir yeri. Defter **kodu içermiyor**, append-only. |
| ⚠️ G32 | **Platform girişinde ikinci faktör EKSİK** | `docs/08` §4.4 platform rolü için ikinci faktör zorunlu diyor; şu an yalnızca telefon + SMS var. **TOTP eklenmeden canlıya çıkılmamalı** — Faz 10 sertleştirme kalemi. |

---

## Ekonomi kararları

| # | Konu | Karar |
|---|---|---|
| E1 | **Formül yok, katalog var** | Kafe her ödül için puan fiyatı ve TL maliyetini kendisi girer. |
| E2 | **Anlık ödül puan istemez** | İlk kez oynayanın puanı sıfır; her ödül puanlı olsa eli boş çıkar ve dönmez. |
| E3 | **Defterler append-only** | Bakiye kolonu yok; bakiye hareketlerin toplamı. Geçmişe dönük düzeltme yapılamaz. |
| E4 | **Günlük puan tavanı: 900** | Ödül limiti tek başına yetmez; puan birikimi de takvime bağlanmalı. |
| E5 | **Çarpanlar çarpışmaz** | En yüksek olan uygulanır (bonus ×2 + fiş ×2 = ×4 değil, ×2). |
| E6 | **Kanıt seviyesi ödül değerine bağlı** | ~~1–15 TL → K2 · 16–50 TL → K3~~ **→ Ü52 ile kaydı:** 25–35 TL → K2 · 40–50 TL → K3 · 51 TL+ → K4 · her kullanım → K5. İlke aynı (büyük ödül güçlü kanıt), bantlar yeni ödül aralığına taşındı. ⚠️ Bu bir gevşemedir: 25 TL'lik ödül eskiden "masada beş dakika" isterken artık konum yetiyor. |
| E7 | **Kasiyer ekranı birinci sınıf** | Sonradan eklenen panel değil. Kasiyer kullanmazsa hiçbir rapor doğru olmaz. |
| E8 | **Şans Çarkı v1'de yok** | Rastgele ödül bütçe öngörülebilirliğini bozar; ayrıca promosyon mevzuatı riski (S7). **→ Ü49 ile TERSİNE ÇEVRİLDİ.** Bütçe gerekçesi karşılandı (çark kafenin kataloğundan çeviriyor, rezervasyon tavanı aynen işliyor); **mevzuat gerekçesi karşılanmadı — S7 hâlâ açık.** |
| E9 | **Geçerlilik yalnızca kasiyer ekranında** | Oyuncu ekranı ödülün adını gösterir ama **TL değerini ve geçerlilik damgasını göstermez**. Kasiyerin sistemi atlaması tasarımla engellenir. → `06` §7 |
| E10 | **rezerve + harcanan ≤ bütçe** | Sistem, kalan bütçenin karşılayamayacağı kadar kupon dağıtmaz. Kafe hiçbir senaryoda bütçesinin üstünü ödemez. |
| E11 | **Süresi dolan kupon yerine yenisi çıkar** | Rezerve serbest kalır, o tutar kadar yeni kupon üretilebilir. Bütçe hafta boyunca döner. |

---

## Reddedilen yaklaşımlar (kaynak dokümanlardan)

| Konu | Eski hâli | Yeni karar | Kaynak |
|---|---|---|---|
| Kafeden abonelik | `cafeplay-urun-tanimi.txt` §28 — ana gelir modeli | Ana gelir **değil**, 6. sıraya itildi | `buyume-ve-gelir-modeli.txt` §13, §16 |
| Boost'un garanti satışı | "50 oyuncu satıyoruz" | **"50 nitelikli oyuncuya kadar erişim"** — garanti yok | `buyume-ve-gelir-modeli.txt` §9 |

---

## Karara bağlanmamış — bekleyen fikirler

Aşağıdakiler üretildi ama henüz kabul/ret almadı. Detayları `04-fikir-havuzu.md` içinde.

| Fikir | Not |
|---|---|
| Fiş Eşleme → Ciro Atfı | ⭐ Ö3 ve Ö4'ün **ön koşulu** — teknik olarak zaten yapılması gerekiyor |
| Kafe Ekranı (canlı leaderboard TV) | Ö1'i görünür kılan şey. Güçlü aday. |
| Kapanış Eritme | Ö3'ün varyantı |
| Hava Durumu Tetikleyicisi | Ö3'ün otomatik varyantı |
| Gizli Menü | Ö4 ile aynı altyapı |
| Adisyon Eşiği | Fiş eşlemesi varsa neredeyse bedava |
| Kahve Ismarla (hediye kupon) | — |
| Barista'yı Yen | Personel benimsemesini çözer |
| Fincan Koleksiyonu | Çapraz-kafe trafiğin motoru olabilir |
| Kahve Pasaportu | Fincan Koleksiyonu'nun basit hâli — biri seçilmeli |
| Marka Örnekleme (sampling) | Reklam gelirinden büyük olabilir |
| Marka Sübvansiyonu | 1.500 TL bariyerini düşürür |
| Kafe Ligi (Cafe vs Cafe) | Ö5 reddedildi ama bu kafe-düzeyinde, rahatsızlık üretmiyor |
| Kasiyer Teşviki | A4/A6 benimsemesi için önemli |
| Bekleme Sırası Modu | — |
| Kafe İçi Anket ("CafePlay Insight") | Ö6'nın temiz alternatifi |
| Beyaz etiket / Veri ürünü | Uzun vade |

---

### Faz 9 karar turu — 2026-08-27

| # | Konu | Karar | Kaynak |
|---|---|---|---|
| Ü32 | **Davet XP'si niteliklenen kafeye yazılır** | Ü20 para ödülünü reddediyor, geriye XP kalıyor; XP kafe bazında (Ü15) olduğu için "hangi kafe" cevaplanmak zorundaydı. **Değerin üretildiği kafe** seçildi: davet edilen orada niteliklendi, davet edenin o kafedeki durumu da orada yükseliyor. Alternatifler tutmadı — global XP Ü15'i bozardı, davet edenin "kendi kafesi" tanımsız. Davet eden +100 XP, davet edilen +50 XP. | Faz 9 |

| Ü33 | **Tahtta yalnızca AD, kapatılabilir** | Ö1 ekranda "👑 Kral: Mert" diyor; bu ürünün ilk **oyuncudan oyuncuya** ifşası — bugüne kadar ad ve soyad kafeye bile gösterilmiyordu (G1). Anonim kod mekaniği öldürürdü ("P-4F2A'yı devireceğim" diyen olmaz). Orta yol: yalnızca ad (soyad asla), varsayılan açık, `/verilerim`den kapatılabilir, aydınlatma metninde yazılı. Kapatan tahtta kalır, adı yerine kafeye özel anonim kodu görünür. | Faz 9 · Ö1 |

| Ü34 | **Happy Hour havuzu bir tavan, ayrı bir kese değil** | Ö3'ün "pencere bitince kalan genel havuza döner" kuralı, havuzu bütçeden ayırmadan **kendiliğinden** sağlanıyor: pencere açmak bütçeye hiç dokunmuyor, kuponlar her zamanki gibi bütçeden rezerve ediliyor ve ayrıca pencereye etiketleniyor. Kalan = havuz − etiketli kuponların rezervi. Alternatif (pencereye para ayırmak) bütçe defterine **beşinci bir hareket türü** sokardı ve E10/E11'in dört sayılı formülünü karmaşıklaştırırdı. Pencerede değişen tek şey: günlük "bir anlık ödül" sınırı bir kez daha açılıyor. | Faz 9 · Ö3 |

**Kafe konumu paneli (2026-08-27).** K2'nin dayandığı koordinat yalnızca tohum betiğiyle yazılabiliyordu; gerçek akıştan geçmiş onaylı bir kafede ürün sessizce çalışmıyordu. `/kafe/panel/konum` eklendi — kafe sahibi kafedeyken tarayıcı konumunu işaretliyor. Adres → koordinat çevirimi (geocoding) **bilerek seçilmedi**: yeni dış bağımlılık, yeni maliyet, yanlış eşleşme riski; kafe sahibi zaten oradayken telefonu daha doğru. Koordinat denetim izine **yazılmıyor** — `lib/log.ts`in yasaklı alan koruması `lat`/`lng`yi reddediyor ve o kural gevşetilmedi.

> ⚠️ **Ü33'ün varsayılanı hukuki incelemeye tabi.** "Varsayılan açık" bir işleme
> tercihi; S20/H2 ile birlikte avukata gidiyor. Kapalıya çevirmek tek satır:
> göç 0015'teki `DEFAULT true` → `false`.

> ⚠️ **Ü32 uygulandı ama onaylanmadı.** Kod bu varsayımla yazıldı ve testleri
> geçiyor; ürün sahibi başka bir dağıtım isterse değişecek yer tek bir fonksiyon
> (`domain/davet.ts` · `niteliklendir`). Ayrıntı: `19-faz9-davet-kapi-raporu.md` §5.

**Ü20'nin bu turda netleşen alt kararı — "nitelikli davet" neye eşit:** kaynak
dokümanın sekiz şartından dördü (`oyunu oynadı · tamamladı · asgari etkileşimi
geçti · kafe karekodu etkileşimi yaptı`) tek bir bayrağa indi:
`play_sessions.is_qualified`. O bayrak zaten S3'ün altı koşulunu taşıyor. Yan
etkisi değerli: davet, **kafeye satılan birimle aynı sayıya** bakıyor (Ü29).

---

### Demo karar turu — 2026-08-27

| # | Konu | Karar | Kaynak |
|---|---|---|---|
| Ü35 | **Demo modu — "önce oyna, sonra kaydol"** | Ü1 (kayıt oyundan önce) **değişmedi**; üstüne bir vitrin katmanı kondu. Kayıt öncesi oynanan oyun hiçbir deftere yazılmıyor; sunucu oyunu doğrulayıp sonucu **imzalı bir talep** olarak çereze koyuyor ve oyuncu kaydolunca talep **normal yoldan** bozduruluyor — gerçek `play_sessions` satırı ve gerçek ödül, K2/bütçe/tavan/fraud kuralları aynen işleyerek. Konum doğrulanmamışsa ödül yine açılmıyor. Yani değişen tek şey oynama ile kayıt anının yer değiştirmesi. | Ürün sahibi |
| Ü36 | **Kimlik: parola + SMS birlikte** | Ü1 değişmedi — hesap hâlâ **doğrulanmış numaraya** bağlı ve yalnızca OTP'den sonra açılıyor (G13). Parola onun **yerine değil yanına** geliyor: her girişte SMS beklemek hem yavaş hem pahalı (docs/07 §2.3 — OTP aynı zamanda maliyet kapısı). **Parola gerçek** (scrypt, `staff.pin_hash` ile aynı biçim; en az 8 karakter + büyük + küçük + rakam), **"beni hatırla" gerçek** (işaretliyse 90 gün, değilse 12 saat — ortak cihaz), **Google/Apple yalnızca düğme**. "Şifremi unuttum" akışı bilerek yazılmadı: numara zaten doğrulanmış, SMS ile giriş açık; kurtarma en güçlü kanaldan geçiyor ve yeni bir saldırı yüzeyi doğmuyor. | Ürün sahibi |

> **Ü36 · 2026-08-27 akşamı genişletildi.** İlk hâli "hepsi yalnızca görüntü" idi; parola ve "beni hatırla" **gerçek** oldu. Google/Apple düğmeleri çalışmıyor ve `kodEkrandaGosterilir()` kapısının arkasında duruyor — çalışmayan bir giriş düğmesinin canlıya sızması demo kolaylığından pahalıya mal olur. Gerçekten çalışmaları için Google'da ücretsiz bir Cloud projesi + OAuth istemcisi, Apple'da **ücretli** Developer üyeliği ve yayında bir alan adı gerekiyor; üçü de ürün sahibinin hesaplarıyla açılır.

**Ü35'in reddettiği alternatif:** Ü1'i gerçekten değiştirmek. Misafir oturumu şeması, kayıt öncesi ödülün sahipliği, kayıtsız çiftlik fraud yüzeyi ve KVKK'da "kayıt öncesi işlenen veri" maddesi doğardı. Demo bunların hiçbirini gerektirmiyor.


### Ürün sahibi karar turu — 2026-08-31

Kaynak: `davet ve login fraud kontrolü7.txt`, `ödül kullanımı.txt`, `ödül açılma
mekanızması.txt`, `kazandırma similasyonu.txt`, `önemli.txt` ve diğer belgelerin
mevcut sistemle karşılaştırılması.

| # | Karar | Gerekçe | Kaynak |
|---|---|---|---|
| **Ü39** | **Erteleme 24 saat; eşik kafenin ayarı** | Ü28'i iki noktada değiştiriyor. **Süre:** "yarın 00:00" takvim gününe bağlıydı ve aynı kural iki oyuncuya on beş kat farklı davranıyordu — sabah 09:00'da kazanan 15 saat, akşam 23:00'te kazanan 1 saat bekliyordu. Sabit süre herkese aynı pencereyi veriyor. **Süre 24 saat** (2026-08-31 akşamı düzeltildi): bir tur 12 saat yazıldı, sonra `ödül açılma mekanızması.txt`'nin *"Ödülün aktifleşme süresi: 24 saat"* satırıyla çeliştiği görülüp geri alındı. **Eşik:** 51 TL platform sabitiydi; artık kafenin panelden değiştirdiği değer (varsayılan 50 TL, aralık 0–500 TL). Ödül ekonomisi kafeden kafeye değişiyor. ⚠️ **E6'nın kanıt kademesi bu ayardan etkilenmiyor** — kafe kendi ödülünün kanıt şartını gevşetebilseydi, en pahalı ödülü en zayıf kanıtla vermenin yolu açılırdı. | Ü28'in revizyonu |
| **Ü40** | **Üçüncü ödül tipi: sabit tutarlı indirim** | Kafe "20 TL indirim" diyebilmeliydi. Teknik olarak bugün de yapılabiliyordu (`percent 100` + `cost_kurus 2000`) ama oyuncunun ekranında **"%100 indirim"** yazıyor ve "bedava" diye okunuyor; ödülün adı ne olduğunu söylemek zorunda. **Bu bakiye değil:** tek kullanımlık kupon, adisyondan bir kez düşüyor, kalanı saklanmıyor, devretmiyor — Ü18'in çekindiği kısmi kullanım, kalan takibi, iade akışı ve ödeme mevzuatı sınırı doğmuyor. Ü18 bu yüzden **değişmedi**, yanına bir tip eklendi. | `ödül kullanımı.txt` |
| **Ü41** | **Platform geliri: kafeden abonelik** | `docs/06` §11'de "⚠️ Tanımsız" olarak duran ve Faz 8'den önce kapatılması gereken soru kapandı: **kafeler platforma abone olacak.** ⚠️ Bu karar, `01-proje-analizi.md` §95'teki *"kafe bedava girer — abonelik yok, satış görüşmesi yok"* gerekçesini geçersiz kılıyor **ama o gerekçe ortadan kalkmadı**: abonelik müşteri kazanım sürtünmesini artırıyor ve bu bedel bilerek kabul ediliyor. **Fiyat: aylık 2.000 TL** (ürün sahibi, karar verildi — bir tur "aylık 200 TL" konuşulmuş ve belgeyle çeliştiği için doğrulanıp düzeltildi). Faturalama akışı hâlâ ayrı bir faz; `cafe_subscriptions` tablosu ve ödeme adımı yok. | `kazandırma similasyonu.txt`, `Giyim butikleri…txt` |
| **Ü42** | **Kupon hatırlatması: hizmet bildirimi** | Ü39 "eşiğin üstündeki ödül 24 saat sonra açılır" diyor ve amacı ertesi ziyaret; ama kupon sessizce açılıyordu — çağıran yoktu. İki SMS eklendi: kupon açıldığında ve son kullanıma 24 saat kala. **Ticari ileti değil hizmet bildirimi:** mesaj oyuncunun kendi kazandığı kuponun durumunu söylüyor, kafe adı/ürün/kampanya/link içermiyor; G7'nin izin + İYS kaydı şartı doğmuyor. Sınıflandırmayı ayakta tutan şey içerik disiplini ve `tests/hatirlatma.test.ts` metni bu yüzden sınıyor. İzin sorulmuyor ama **kapatılabiliyor** (`service_reminder`, `/verilerim`). ⚠️ Sınıflandırma S20'nin hukuk incelemesine girmeli. | `ödül açılma mekanızması.txt` |
| **Ü43** | **Koşullu ödülde ürünü kasiyer girer** | *"2. San Sebastian siparişinde %30"* gibi ödüller sistemin ne satın alındığını bilmesini gerektiriyor; bugün yalnızca **ziyaret** biliniyor, adisyon değil. Üç yol vardı: ziyarete bağlamak (bedelsiz ama "kahve" değil "geliş" ödüllendirir), kasiyerin ürünü girmesi, POS entegrasyonu. **Kasiyer girişi seçildi.** Bedeli açık: kasiyerin işi artıyor ve verinin doğruluğu ona bağlanıyor — kasa ekranı bu yüzden hızlı ve az tıklamalı olmak zorunda. | Ürün sahibi |
| **Ü44** | **Rapora yeni / tekrar gelen müşteri** | Ürün sahibinin *"en kritik metrik"* dediği şey (**oyun → tekrar kafe ziyareti**) hiçbir ekranda yoktu; veri duruyordu ama ayrım hesaplanmıyordu. Ayrım tek soruya iniyor: oyuncunun **bu kafedeki** ilk tamamlanmış oyunu dönemin içinde mi, öncesinde mi. Kafe süzgeci RLS'ten geliyor, yani başka kafedeki geçmiş sızmıyor (G1). Ü30'un mahremiyet eşiği burada da geçerli: beşten az kişi `<5` görünüyor — küçük bir kafede "bu hafta 2 yeni müşteri" satırı işletmecinin hafızasıyla birleşince kişiyi işaret eder. | Ürün sahibi |
| **Ü45** | **Bütçe dönemi haftalıktan GÜNLÜĞE** | Ü25 dönemi haftalık kurmuştu (pazartesi başlar, tüm kafeler aynı takvimde, raporlar karşılaştırılabilir). Gerekçe sağlamdı ama **ürün belgesiyle çelişiyordu**: orada dönem her yerde günlük — *"Günlük ödül bütçesi: 1.500 TL"*, *"Minimum promosyon kapasitesi: 1.500 TL/gün"*. Kafenin zihnindeki birim de bu: "bugün ne kadar dağıtacağım". Haftalık taahhüt, pazartesi verilen kararın cumayı da bağlaması demekti. ⚠️ **Taban da günlük oldu**: eski kısıt haftalık 1.500 TL'yi güne oranlıyordu (~214 TL/gün), yenisi doğrudan **1.500 TL/gün** istiyor — asgari taahhüt yedi katına çıktı. Bilerek: belgedeki sayı bu ve satış argümanı o büyüklükteki havuz üzerine kurulu. Kafe bir kez günlük tutarını söylüyor (`cafe_config`), o günün dönemi ilk ihtiyaçta açılıyor; istediği günü ayrıca değiştirebiliyor. | Ü25'in revizyonu |
| **Ü46** | **Raporda getiri tahmini + serbest tarih aralığı** | Rapor "kaç oyun oynandı" diyordu; kafe sahibinin aboneliği yenilerken sorduğu soru ise **"bu bana ne kazandırdı"** ve cevabı parayla verilmek zorunda. Getiri = **ziyaret × kafenin girdiği ortalama adisyon** (`ortalama_adisyon_kurus`, `cafe_config`). ⚠️ **Bu bir tahmin ve ekran bunu saklamıyor**: ziyaret ile verilen ürün sayılıyor, ciro varsayılıyor. *"Bu müşteriyi biz getirdik"* İDDİA EDİLMİYOR — bir kısmı zaten gelecekti ve bunu ölçmenin yolu yok; ölçemediğimizi ölçmüş gibi göstermek ilk kasa karşılaştırmasında raporun tamamını götürürdü. Dönem seçimi de iki sekmeden (bu hafta / geçen hafta) **serbest tarih aralığına** geçti: seçim URL'de duruyor, ekranla CSV aynı `araligiCoz` çıktısını okuyor. Saatlik kırılım sayı yerine **doluluk oranı** gösteriyor (payda: masa × gün) — "saat 15'te 4 oyuncu" cümlesi kafenin kaç masası olduğu bilinmeden bir şey söylemiyordu. | Ürün sahibi |
| **Ü47** | **Ü30 eşiği demoda kapalı, canlıda açık** | Ürün sahibinin isteği: on kişilik demo kafede her satır `<5` çıkıyor, rapor boş görünüyordu. Eşik `demoOrtami()` arkasında kapanıyor — canlıda o kapı hiçbir koşulda açılmıyor, kural orada aynen duruyor. ⚠️ **Kararın parametre olmasının sebebi testler**: testler de demo ortamında koşuyor, karar fonksiyonun içinde okunsaydı Ü30 sınamalarının hepsi eşik kapalıyken çalışır ve **kuralı hiç sınamamış olurduk**. `masaHareketi/saatlikDagilim/ozet/disaAktar` eşik kararını parametre alıyor; testler `true` geçip üretim davranışını zorluyor. | Ürün sahibi |
| **Ü48** | **Her oyun puan kazandırır + skor eşiği bonusu** | Puan yalnızca **başarılı** bölümde yazılıyordu ve gerekçesi sağlamdı (yarıda bırakıp yeniden başlamak en ucuz çiftlik yolu olmasın). Sonucu şuydu: ilk kez oynayan, oyunu bitiremeyince ekranda *"Kazanım yok"* görüyordu — sadakat ürününde ilk deneyimin cezayla bitmesi. Artık tamamlanmayan bölüm **50 puan + 10 XP** yazıyor (başarılının altıda biri). Çiftlik açılmıyor: günlük tavan (E4), kafede olma ve K2 şartı (Ü3) aynen duruyor ve yarıda bırakarak tavanı doldurmak oynayarak doldurmaktan yavaş. Ayrıca ürün sahibinin *"1500, 2500"* örneği **skor eşiği** olarak eklendi: 1500→+150, 2500→+300 puan. ⚠️ **Kademeler birikmiyor** (2500 yapan 450 değil 300 alıyor) — toplansaydı tek iyi oyun günlük tavanı tek başına doldururdu. Eşik bonusu başarılı/başarısız ayrımının dışında: 2500 skor yapıp bölümü bitirememek de iyi oynamaktır. | Ürün sahibi |
| **Ü49** | **Şans çarkı geri geldi — E8 TERSİNE ÇEVRİLDİ** | E8 çarkı reddetmişti: *"rastgele ödül bütçe öngörülebilirliğini bozar; ayrıca promosyon mevzuatı riski (S7)"*. Ürün sahibi kararı tersine çevirdi. İki gerekçe ayrı ayrı ele alındı: **(1) Bütçe** — çark kendi havuzunu yaratmıyor, kafenin anlık ödül kataloğundan çeviriyor ve normal kupon yolundan geçiyor; `rezerveEt` taahhüdün üstüne çıkmayı reddettiği için kafe hiçbir senaryoda fazla ödemiyor (E10). Rastgelelik **hangi ödül** sorusunu etkiliyor, **ne kadar toplam** sorusunu değil. Ağırlık değerin karesiyle ters orantılı, yani pahalı ödül nadir — varyans da bu yüzden dar. **(2) Mevzuat: ⚠️ AÇIK.** S7 kapanmadı; şans oyunu / çekiliş mevzuatı incelemesi yapılmadı ve bu karar onu gerektiriyor. Ürün sahibinin tarifi: *"çark bir oyun değil, 24 saatte bir oluşan, çok da yüksek ödüller vermeyen bir çark"* — skoru, puanı, XP'si yok, liderliğe girmiyor. İlk karekodda misafir de çeviriyor; ödül **imzalı çerezde** bekliyor ve kayıt anında bozduruluyor (G13: kaydolmamış ziyaretçinin veritabanında satırı yok). ⚠️ **Animasyon göstermelik**: dilimler ekranda eşit görünüyor, ağırlıklar eşit değil — ürün sahibinin kararı. Ekranın hiçbir yerinde "her ödül eşit olası" yazmıyor. **Ödül büyüklüğü ayrıca sınırlı** (`cark_ust_sinir_kurus`, varsayılan 25 TL): günlük havuz (E10) toplamı sınırlıyor ama tek bir ödülün büyüklüğünü sınırlamıyordu — 1.500 TL'lik havuzdan tek seferde 300 TL'lik ödül çıkabilirdi. Sınırın üstündeki anlık ödüller katalogda kalıyor ve **oyun içi** anlık ödül olarak çıkmaya devam ediyor; yalnızca çarkta yoklar. Süzgeç hem seçimde hem parayı yazan `carkOduluVer` içinde. | Ürün sahibi (E8'in revizyonu) |
| **Ü50** | **Masa tahtı yerine liderlik tablosu** | Ö1'in taht kartı tek kişi gösteriyordu. İki sorun: **masa** (oyuncu hangi masada oturduğunu zaten biliyor; "Masa 3 tahtı" ona sistemin iç kavramını anlatıyordu) ve **tek satır** (bir kişilik sıralamada ikinci sıradaki kendini göremiyor). Yerine kafenin bugünkü sıralaması geçti; `taht.ts` mekanizması duruyor, yalnızca ekrandan kalktı. Adlar **maskeli**: ad + soyadın baş harfi, gerisi sabit sayıda yıldız (`Mert Y***`) — yıldız sayısı soyad uzunluğuyla değişseydi maske bilgi sızdırırdı. Taht kartı soyadı hiç çözmüyordu; bu liste baş harf için çözüyor ve tam soyad `maskele()` dışına çıkmıyor. Adını `/verilerim`den kapatan oyuncu anonim koduyla listede kalıyor. Karta tıklayınca **tüm zamanlar** listesi açılıyor ve o, skoru değil **toplam puanı** sıralıyor: aynı listenin uzunu olsaydı ikinci sayfaya gitmenin anlamı olmazdı. | Ürün sahibi |
| **Ü51** | **Blok'ta yalnızca inecek alan gösteriliyor** | Sürükle-bırak eklenirken iki ışıklandırma birden vardı: parçanın **ineceği** kareler ve parçanın **sığdığı bütün** köşeler. İkincisi kaldırıldı — ızgaranın yarısı yanıp sönünce oyuncunun sorduğu soru ("bu parça nereye inecek") değil, sormadığı soru ("nereye inebilir") cevaplanıyordu. Hesap tamamen kalkmadı: parça hiçbir yere sığmıyorsa oyuncu boşuna uğraşmasın diye tek bir evet/hayır olarak duruyor ve ilk sığan köşede tarama bitiyor. | Ürün sahibi |
| **Ü52** | **Ödül modeli sadeleşti: puanla satın alma kalktı, değerler 25–50 TL** | Üç karar birlikte alındı. **(1) Puanla ödül alma kaldırıldı** — ürün sahibi fikrini değiştirdi. Puan artık yalnızca **sıralama ve seviye** için birikiyor; harcanmıyor. `katalogdanAl` silindi (zaten hiçbir ekrana bağlı değildi — yazılmış, çağrılmamıştı). **(2) Tek tip ödül**: `kind='catalog'` kavramı kalktı, kafe artık "oyunlardan ve çarktan **düşebilecek**" ödülleri tanımlıyor. Panelde "anlık mı" sorusu ve puan fiyatı alanı yok. **(3) Değer aralığı sabit**: 25 TL'den 50 TL'ye, 5'er artışla. Serbest tutar yok — kural hem uygulamada hem `odul_degeri_basamakli` kısıtıyla veritabanında. ⚠️ **E6'nın bantları kaymak zorunda kaldı**: taban 25 TL olunca eski bantlarla her ödül K3 (masada beş dakika) oluyordu ve çarkın ilk karekod akışı — ziyaretçi henüz K2'de — hiçbir zaman ödül veremezdi. Yan etkiler: `ertelemeEsigi` aralığı 25–50 TL'ye çekildi (50'de kalsaydı hiçbir ödül ertelenmez, Ü39 ölürdü) ve **çarkın ağırlık formülü değişti** — `1/değer²` iki kat farkı ayırt edemiyordu, yerine sıraya dayalı yarılama geldi (~%51/%25/%13/%6/%3/%2), aralık daralsa da karakteri korunuyor. | Ürün sahibi |
| **Ü53** | **Çarkın animasyonu bozuktu — sunucu eylemi bileşeni söküyordu** | Ürün sahibi *"çark animasyonu eklememişsin, çark şu an düzgün çalışmıyor"* dedi; animasyon yazılmıştı ama hiç görünmüyordu. Sebep: çevirme eylemi `revalidatePath` çağırıyordu, sunucu bileşeni yeniden çiziliyordu, `cark.durum()` bu kez "24 saat kilidi" diyordu ve çarkın yerine **kapalı sürüm** geçiyordu — bileşen daha animasyon başlamadan sökülüyordu. Aynı hata misafir tarafında da vardı: çerez yazılınca sunucu "bu ziyaretçi zaten çevirmiş" diyordu. İki düzeltme: eylemden `revalidatePath` kalktı (`/oyna` ve `/oduller` zaten `force-dynamic`) ve **kapalı hâl artık aynı bileşende** — `kilitli` yalnızca düğmeyi kapatıyor, ağacı değiştirmiyor. Misafir tarafında "açılışta ödül var mıydı" sorusu `useState` ile donduruluyor. Ayrıca yazılar **ışınsal** oldu: teğet yazıp alt yarıyı 180° çevirmek yalnızca çark hiç dönmemişken doğruydu, 2490°'de duran çarkta altı dilimin beşi baş aşağı kalıyordu. | Ürün sahibi (hata bildirimi) |
| **Ü54** | **Günlük seri** | Oyuncunun **bu kafede** arka arkaya kaç gün oyun tamamladığı. Bir gün atlanınca sıfırlanıyor. Kafe başına: kafeler arası ortak bir seri, A'da oynayıp B'nin bütçesinden ödüllenmek demek olurdu (Ü3 ile aynı gerekçe). **Ayrı tablo yok** — seri bir durum değil, `play_sessions`'a sorulan bir soru; iki yerde tutulan aynı gerçek er ya da geç ayrışır (tahtla aynı tercih). Ödül **puan**, kupon değil: Ü52 ile puan zaten harcanmıyor ve işi sıralama/seviye; kupon üretseydi kafenin günlük bütçesine üçüncü bir musluk açılır, E10'un öngörülebilirliği bozulurdu. Bonus 2. günden başlıyor, günde 25 puan artıyor, **200'de duruyor** — günlük puan tavanının (E4) dörtte biri; geçseydi "oyna" yerine "sadece uğra" davranışını ödüllendirirdi. Bugün oynanmadıysa seri **kırılmış sayılmıyor**, "riskte" gösteriliyor: gün bitmeden kırıldığını söylemek, akşam gelecek müşteriyi sabahtan kaybetmek olurdu. | Ürün sahibi |
| **Ü55** | **Kafe paneli gösterge ekranına dönüştü** | Ürün sahibi paneli *"daha görsel ve kullanıcı dostu"* istedi, örnek olarak yönetim paneli şablonları verdi. Panelin üstüne dört **gösterge kutusu** (bugün gelen, verilen kupon, kullanılan, bugün ödediğin) ve **son yedi günün ziyaret grafiği** geldi. Veri `domain/panel.ts`'ten, rapordan ayrı: rapor bir dönemi anlatıyor ve karar vermek için açılıyor, panel vardiya arasında iki saniye bakılıyor — panelin her açılışında raporun ağır sorgularını koşturmak gereksiz. **Palet genişlemedi**: mevcut üç jeton dönüşümlü kullanılıyor ve renk anlam taşımıyor, yalnızca kutuları ayırıyor — anlam taşısaydı (kırmızı = kötü) "bugün 0 kupon" iyi mi kötü mü sorusunun cevabını ekrana gömmüş olurduk ve o cevap kafeye göre değişir. | Ürün sahibi |
| **Ü56** | **Ödül açılışı: hediye kutusu animasyonu** | Çarkın sonucu düz bir kutuda `🎉` emojisiyle görünüyordu; ürün sahibi *"kazandın kısmı da ekrana animasyonla efekt ile çıkmalı"* dedi ve referans olarak bir Lottie animasyonu (zıplayarak açılan hediye kutusu) verdi. **Hareket alındı, dosya alınmadı**: `lottie-web` ~250 KB, animasyon JSON'u 90–330 KB ve bu ekran kafede mobil veriyle, ödülün göründüğü an açılıyor — yarım megabaytlık bir indirme "kazandın" yazısını geciktirmekten başka iş yapmazdı. Aynı sıra CSS ile kuruldu, sıfır bayt indiriliyor: kutu titrer → kapak uçar → ışık halkası ve konfeti → ödül adı büyüyerek gelir. Zamanlama `globals.css` içinde tek zaman çizgisi olarak duruyor. Konfetinin yönleri **sabit dizi** — `Math.random()` render sırasında çağrılsaydı sunucu ile istemci farklı basar ve hidrasyon uyarısı verirdi (aynı hatayı çarkın koordinatlarında bir kez yaptık). ⚠️ Gövdede **karanlık bir ağız** var: ilk çizimde kapak uçunca geriye kapalı görünen bir kutu kalıyordu ve animasyon "açıldı" değil "üstünden bir şey geçti" diye okunuyordu. | Ürün sahibi (Lottie referansı) |
| **Ü57** | **Görsel dil referanslardan çıkarıldı** | Ürün sahibi beş referans verdi ve ilk turda **açmadım** — şablonların genel diline dair varsayımla çalıştım, haklı olarak uyardı. İkinci turda hepsi açıldı. ⚠️ ThemeForest `full_screen_preview` sayfaları uygulama içi tarayıcı panelini **çökertiyor** (Cloudflare doğrulaması otomatik tarayıcıda hiç geçmiyor + sayfa çok ağır); Chrome eklentisi üzerinden gerçek tarayıcıda açılınca sorunsuz. **Çark** (Dribbble): ampullü pembe kasa, pastel dilimler, damla biçimli ok, sıcak göbek. Renkler **paletin bilinçli istisnası** ve yalnızca çark bileşeninde — `globals.css`'e jeton olarak konsalardı palet fiilen genişlerdi. Tek renk ailesiyle çizilen çark ürün sahibinin deyimiyle *"ucuz ve kalitesiz"* duruyordu ve haklıydı: bir şans çarkı anlamını renk çeşitliliğinden alıyor. **Panel** (Orchid, Valex): gösterge kartı artık etiket + ikon kutusu + büyük sayı + **düne göre değişim rozeti** + kartın tabanına yayılan **kıvılcım grafik**; dördünden biri dolu renkli vurgu kartı. Rozetin rengi **yön** söylüyor, iyi/kötü değil — "bugün 2 kupon az verildi" kafe için kötü haber değil, bütçe korunuyor demek; kırmızı boyamak yorumu ekrana gömmek olurdu. | Ürün sahibi (5 referans) |
| **Ü58** | **İşletme paneli bilgisayar için de tasarlandı** | Panel yalnızca telefondan bakılacak varsayımıyla kurulmuştu: içerik `max-w-4xl` (896px) dar bir kolonda ortalanıyor, gezinme alt şerit olarak ekranın altına yapışıyordu. Ürün sahibi *"kafe panele sadece mobilden değil bilgisayardan da bakacak"* dedi ve haklı — 2000 piksellik ekranda 896 piksellik sütun, ekranın üçte ikisini boş bırakıyordu. Referans yönetim panellerinin (Orchid, Valex, Enlite) hepsi sol kenar çubuğu + tam genişlik içerik kullanıyor. Üç değişiklik: **(1)** Gezinme iki biçimli — telefonda alt şerit, `lg`'den itibaren sol kenar çubuğu. Aynı dosya, aynı liste; ayrı bileşen olsalardı biri güncellenir diğeri unutulurdu. Kenar çubuğunda **daha çok durak** var (kurulum ekranları da orada) çünkü yer bol; alt şeritte dört kalıyor, telefonda beşinci ikon okunmuyor. **(2)** `IsletmeSayfa genis` 1600px'e çıktı — sınırsız değil, yoksa geniş ekranda satırlar okunamayacak kadar uzardı. `genis` olmayan sayfalar dar kaldı: onlar form sayfaları ve form genişledikçe doldurulması zorlaşır. **(3)** Kurulum kartları gösterge kartlarıyla aynı dile geçti (ikon kutusu, ok, hover) ve masaüstünde dörtlü ızgaraya oturdu. Ödüller sayfası iki kolona ayrıldı: solda **yazma** işleri (form, ayarlar), sağda **okuma** işi (liste) — kafe ödül eklerken listeyi görüyor. | Ürün sahibi |
| **Ü59** | **Çark tam ekran sahnede** | Çark bir kartın içinde duruyordu — sayfanın ortasında, altında ve üstünde başka içerik varken. Ürün sahibi *"çarkı çevirme animasyonu ekrana gelip ekranda belirmeli, o kutunun içinde olmamalı"* dedi. Gerekçe sağlam: çevirme **günün olayı**, kartın içinde sayfadaki onuncu bileşen gibi görünüyor. Sayfada artık yalnızca **davet** duruyor (mini çark + düğme); dokununca koyu mor gradyan zeminli, arkasında yavaş dönen ışın demeti olan tam ekran sahne açılıyor. **Çark dönerken sahne kapanmıyor**: yarıda kesilen dönüşten sonra oyuncu ne kazandığını göremez ama kupon çoktan yazılmıştır. ⚠️ İki hata çıktı ve düzeltildi: **(1)** Zemin ilk denemede saydam açıldı — ışınlar `-z-10` ile konmuştu ve negatif z-index kendi yığın bağlamında ebeveynin zemininin de arkasına düşüyor. Katmanlar ayrıldı, negatif değer kalmadı. **(2)** Sahnenin toplam yüksekliği 1200 pikseli geçiyordu, telefon ekranı 812: kazanma anında oyuncu ödülü görmüyordu. Çark kazanınca küçülüyor ve sonuç ekranın ortasına kaydırılıyor — yalnızca biri yetmiyordu. | Ürün sahibi |
| **Ü60** | **Panelin alt sayfaları iki kolona ayrıldı** | Alt sayfaların çoğu aynı şekle sahip: bir **form** ve bir **liste**. Telefonda alt alta doğru çalışıyorlardı; bilgisayarda aynı dizilim, ekranın yarısı boşken kullanıcıyı iki üç ekran boyu kaydırtıyordu. Sol kolon **yazma**, sağ kolon **okuma**: kafe sahibi ödül/ürün/kampanya eklerken mevcut listeyi görüyor ve eklediği şeyin zaten var olup olmadığını anlamak için kaydırmıyor. Düzen `IkiKolon` bileşeninde toplandı — üç sayfada tekrarlanan bir ızgara sınıfı, dördüncüsünde farklı yazılırdı. `items-start` şart: varsayılan `stretch` kısa kolonu uzatıp içindeki kartı geriyordu. | Ürün sahibi |
| **Ü61** | **İki ayrı görsel dil: oyuncu canlı, panel resmî** | Ürün sahibinin ayrımı: *"oyuncu ekranında çarktaki dil, panelde panelin dili — çarktaki dilden kastım eğlenceli, canlı, uygulamanın içine çeken, heyecanlı olması; panel daha resmî, net."* Bu, bir renk tercihinden fazlası: iki taraf **farklı işler** yapıyor. Kafe sahibi karar veriyor (sayı okumalı, süs dikkat dağıtmalı), oyuncu oynuyor (heyecan ürünün kendisi). Ü31 paleti ortaklaştırmış ve ayrımı "yoğunluk, süs, ton"a bırakmıştı; bu karar o ayrımı **belirgin hâle getiriyor**. Oyuncunun ana ekranındaki üç beyaz kutu (puan, kupon, seviye) tek bir **koyu gradyan durum kartına** dönüştü: çark sahnesiyle aynı aile, ışın dokusu, cam kutucuklar, altın vurgu. Üçü de aynı soruyu cevaplıyordu (*"bu kafede nerede duruyorum"*) ve tek kart eskisinin yarısı kadar yer kaplıyor. ⚠️ Işın dokusunun merkezi kartın **dışında**: ilk denemede tam sayıların üstüne denk geliyor ve hedef tahtası gibi duruyordu. | Ürün sahibi |
| **Ü62** | **Panelin sekiz iç sayfası gösterge diline geçti** | Ü57 gösterge kartını yalnızca panelin ana ekranına getirmişti; iç sayfalar eski sade düzende kaldı ve ürün sahibi haklı olarak *"bu iç ekranları da yapmamışsın, analizli kısımlarda daha çok grafikli analiz gerekli"* dedi. Ortak parçalar `components/gosterge.tsx`'te toplandı — sayı kartı (etiket + ikon kutusu + değişim rozeti + kıvılcım), halka gösterge, çubuk liste. **Sekiz sayfada sekiz kopya** yazılsaydı biri kalın çerçeveli biri ince olurdu; sekizincisi tamamen başka bir şey. Her sayfaya **o sayfanın cevaplamadığı soru** eklendi: bütçede *"taahhüdün ne kadarı bağlandı"* (halka) ve yedi günlük taahhüt/harcama çubuğu; masalarda *"hangi masa çalışıyor"* (hiç okutulmayan masa, kodu taşımak için tek sebep); personelde *"kim onaylıyor"* (hiç onay yapmamış kasiyer ya PIN'i çalışmıyor ya kasada değil); ödüllerde ortalama değer ve hemen açılan sayısı; happy hour'da havuzun erime oranı. ⚠️ **Konum sayfası dar kaldı**: form sayfası ve genişledikçe doldurulması zorlaşır — yalnızca kartların dili ortaklaştı, grafik eklenmedi. Grafik eklemek orada boşluk doldurmak olurdu. | Ürün sahibi |
| **Ü63** | **Alan renkleri: panelde palet bilerek genişledi** | Ü31 "dokuz renk, ekleme yok — onuncu renk paleti anlamsızlaştırır" diyordu ve o kural bugüne kadar korundu. İşletme panelinde **bilerek gevşetildi**: panel artık bir belge değil gösterge takımı ve sekiz sayfa, dört gösterge kartı, düzinelerce ikon kutusu tek maviyle çizildiğinde ürün sahibinin deyimiyle *"çok basit"* duruyor — daha kötüsü hiçbir kutu diğerinden ayrılmıyor. Beş alan rengi eklendi: **para yeşil, masa sarı, ürün turuncu, personel turkuaz, kampanya mor**; ödül zaten altındı, genel mavi kaldı. Kural: her renk BİR ALANA ait ve o alan dışında kullanılmıyor. ⚠️ *"Yeşil iyi, kırmızı kötü"* okuması YOK — bugün az kupon verilmiş olması kafe için kötü haber değil, bütçe korunuyor demek. Renk **yön bulma** aracı: kafe sahibi ikinci gelişinde başlığı okumadan gideceği kartı buluyor. **Oyuncu tarafı bu renkleri kullanmıyor** — orası çarkın dilinde (Ü61) ve iki dilin karışması ikisini de bozar. Yanında üç düzeltme: (1) ödül tipi seçicisindeki 🏆🎟️💸 emojileri kalktı — işletmede emoji zaten yasaktı (Ü31), bu üçü gözden kaçmıştı ve işletim sistemine göre bambaşka çiziliyordu; yerine kendi ikonlarımız ve birer satır açıklama geldi. (2) Katalog ve menü düz satırdan karta döndü: tip, değer, kanıt ve durum aynı gri cümlenin içinde eriyordu. (3) Panelin gösterge kartları artık **tıklanabilir** ve ilgili sayfaya gidiyor. | Ürün sahibi |
| **Ü64** | **Oyuncu tarafının tamamı çarkın diline geçti** | Ü61 koyu, canlı dili oyuncunun ana ekranındaki durum kartına getirmişti; geri kalan her şey (ödüller, profil, sıralama, oyun kabuğu, oyun sonu) eski beyaz kart düzeninde kaldı. Sonuç ürünün ikiye bölünmesiydi: *"ana ekranın üstü koyu ve canlı, tıklayınca beyaz listeye düşüyorsun."* Ortak parçalar `components/oyuncu.tsx`'te toplandı — koyu kart, cam kutu, altın pul, sıra jetonu. **İki dosya bilerek**: `gosterge.tsx` işletmenin dili, `oyuncu.tsx` oyuncunun dili; tek dosyada toplansalardı bir ekranda yanlış dili kullanmak bir `import` kadar kolay olurdu. Ü63'ün alan renkleri (para yeşil, masa sarı…) bu dosyaya **girmiyor** — oyuncunun ekranında "para" ile "masa" ayrımı yok, kazandığı şey var; tek vurgu altın. Ekran ekran: kullanılabilir kupon **bilet** oldu (zımba çentikleri, altın çerçeve, koyu zemin) — kasada gösterilecek olan hangisi sorusu ekranın en uzaktan okunan cevabı; bekleyen ve geçmiş sakin beyaz kaldı, çünkü kasada gösterilemeyecek bir şeyin bilet gibi durması oyuncuyu boşuna kasaya gönderir. Profilde seviye, XP ve ilerleme üç ayrı yerden tek bir **halkaya** toplandı. Sıralamada bugünün ilk üçü **kürsüye** çıktı (2-1-3 dizilimi, birinci ortada ve en yüksekte; basamak yükseklikleri sabit — skor farkı 5 ile 5000 arasında değişebiliyor ve orantılı bir kürsüde ikinciyle üçüncü çoğu gün aynı yükseklikte çıkardı). Oyun sonu ekranındaki kazanımlar 90 ms arayla kademeli beliriyor. **Uzun listeler beyaz kaldı** — oyun geçmişi, sıralamanın kuyruğu, geçmiş kuponlar: koyu zeminde on beş satır okumak yorucu. Kural şu: *ekranın kendisi* koyu ve canlı, *okunacak liste* sakin. ⚠️ `prefers-reduced-motion` bloğuna `animation-delay: 0` eklendi: yalnızca süreyi kısaltmak yetmiyordu, `both` dolgulu bir animasyon gecikme boyunca `opacity: 0` beklediği için hareketi kapatan kişi kazanım satırlarını hiç göremiyordu. | Ürün sahibi |
| **Ü65** | **Çarkın rengi oyuncu paleti oldu, koyu mor tek yere çekildi** | Ü64'te *"çarkı referans al"* talimatını **yanlış okudum**: çarkın arka fonunu (koyu mor sahne) alıp oyuncu tarafının her ekranına yapıştırdım. Oysa çarkın kendisi aydınlık ve altı renkli; koyu olan yalnızca üstünde durduğu sahne. Ürün sahibinin düzeltmesi: *"her yere bu mor efekti koyma, daha renkli daha eğlenceli olmalı; emojilerimiz çok kötü; sadece kutucuklardan oluşması kötü."* Üç değişiklik: **(1) Palet.** Çarkın dilim renkleri `components/oyuncu-renk.ts`'te beş renge × dört tona açıldı (menekşe, nane, gül, amber, gök). `cark.tsx`'teki "bu renkler yalnızca çarkta geçerli" notu bilerek çevrildi ama renkler `globals.css`e **girmedi**: jeton olsalardı işletme paneli de erişir ve Ü63'ün alan renkleriyle karışırdı. Renk her yerde bir şeyin **kimliği** — oyunun (Blok gök, Kelime menekşe, Düşen gül; ana ekrandaki karodan oyun sonu ekranına kadar aynı), kuponun cinsinin (ürün amber, yüzde menekşe, tutar nane) ve profildeki seviye kuşağının (1-2 nane, 3-4 gök, 5-6 menekşe, 7+ altın). Hiçbiri rastgele değil; rastgele olsaydı süs olurdu. **(2) Emojiler kalktı.** 🟦🔤🧱🎡🔥🎟️🏅👑 her işletim sisteminde başka bir sanatçının çizimiydi — boyutları ve taban hizaları tutmuyor, yan yana dizilince sıra bozuk görünüyordu. Yerlerine `components/oyuncu-ikon.tsx`'te çok renkli, dolgulu kendi ikonlarımız geldi; panelin tek renkli kontur ikonlarının (Ü63) bilerek tersi. ⚠️ **SVG gradyanı kullanılmadı**: gradyan `id` istiyor ve aynı ikon bir sayfada iki kez çizildiğinde `id` çakışıyor; yerine aynı ailenin iki düz tonu üst üste. **(3) Koyu mor iki yerde kaldı**: ana ekranın durum kartı ve çark sahnesi. Kural: *ürünün tek imza yüzeyi var, ekranlar birbirinden renkle ayrılıyor.* ⚠️ Profildeki seviye halkasının yatağı beyazdı ve %0 ilerlemede halka tamamen kayboluyordu — yatak görünür griye çevrildi. | Ürün sahibi |

**Ü39'un uygulanışı:** eşik `cafe_config` anahtar-değer tablosunda (`domain/ayar.ts`),
panelde *Ödül kataloğu → Gecikmeli açılma* bölümünde. Değişiklik `cafe.config_update`
olarak denetim izine düşüyor — "kupon neden bugün açılmadı" sorusunun cevabı orada aranacak.

**Ü45'in getirdiği yük:** haftalık tek satır yerine gün başına bir satır — yılda
365 dönem. Sorun değil (indeks `(cafe_id, period_start)` üzerinde) ama raporun
dönem aralığı artık bütçe döneminden **bağımsız**: rapor istenen tarih aralığını
gösteriyor, bütçe günlük duruyor. İkisi aynı şey değil.

**Ü44'ün açık bıraktığı:** sayı dönem başına hesaplanıyor, yani "ilk ziyaretten
ikinciye geçiş oranı" (kohort) değil. Gerçek D1/D7/D30 tutundurma ölçümü analitik
olay akışıyla birlikte gelecek.

**Ü42'nin bedeli ve sınırı:** hatırlatma, oyuncu başına SMS sayısını artırıyor —
bugüne kadar yalnızca kayıt/giriş anında mesaj gidiyordu, artık kupon başına iki
mesaj daha var. Öncelik sırası bu yüzden kodda: hatırlatma **kayıtla aynı kademede
(%90) kesiliyor**, girişten önce. Ayrıca hatırlatmalar bakım köprüsünden gidiyor
(`domain/bakim.ts`) ve o köprü ekran açıldığında çalışıyor — kimse ekran açmazsa
**hatırlatma gecikir**. Gerçek zamanlanmış iş geldiğinde (Faz 10) ilk taşınacak şey bu.

**Ü41'in henüz karşılığı olmayan tarafı:** `cafes` tablosunda abonelik durumu yok
(`status` yalnızca pending/approved/suspended). Aboneliğin ürüne girmesi — durum,
faturalama, ödeme başarısızlığında erişimin ne olacağı — ayrı bir faz.

---

## Karar verirken kullanılan filtreler

Bu turlarda kabul/ret kararlarını yönlendiren ilkeler:

1. **Kafenin fiziksel gerçekliğini kullan.** Masa, komşu masa, boş saat, menü — normal bir mobil oyunun yapamayacağı şeyler.
2. **Rahatsızlık üretme.** Kafede gürültü, baskı veya sosyal zorlama yaratan mekanik reddedilir. (→ Ö5 reddi)
3. **Kafeye somut cümle ver.** "Müşteri getiriyorum" zayıf; **"boş saatini dolduruyorum ve istediğin ürünü sattırıyorum"** güçlü.
4. **Basit tut.** Çarpan matematiği yerine görünür TL. (→ Ö3'ün "dümdüz" hâli)
5. **Ödülü mekâna bağla.** Değer üreten her şey doğrulanmış varlığa dayanmalı. (→ A1–A4)
