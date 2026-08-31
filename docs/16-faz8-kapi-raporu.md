# 16 — Faz 8 Güvenlik Kapısı Raporu

**Tarih:** 2026-08-26
**Sonuç:** ✅ Geçti — **210/210 test**, `npm run ci` temiz

Faz 8, kafeye **satılan şeyin kanıtını** üretiyor. Faz 7 döngüyü kapatmıştı; burada
o döngünün ürettiği veri, kafenin okuyabileceği ve **denetleyebileceği** bir belgeye
dönüşüyor. Aynı geçişte arayüz Ü31'e taşındı — §7.

---

## §1 · Kapı şartları

| # | Şart | Sonuç |
|---|---|---|
| 1 | Rapor çıktısında hiçbir kişisel veri bulunmamalı | ✅ Ekranda ve CSV'de ad, soyad, telefon, oyuncu kimliği yok — yalnızca kafeye özel anonim kod (`P-FB4V`) |
| 2 | Az kişilik istatistikten kimlik çıkarımı yapılamamalı | ✅ Ü30 eşiği (5) saat ve masa kırılımında; ekranda ve **dosyada** aynı |
| 3 | Rapor görüntüleme denetim izine düşmeli | ✅ `report.view` ve `report.export` ayrı ayrı; gerçek tarayıcı oturumunda doğrulandı |

Denetim izi testte değil, **çalışan uygulamada** da kontrol edildi:

```
2026-08-26T19:02:28Z  report.export  staff  {"baslangic":"2026-08-24","bitis":"2026-08-31"}
2026-08-26T19:02:23Z  report.view    staff  {"baslangic":"2026-08-24","bitis":"2026-08-31"}
```

---

## §2 · Baş sayı: nitelikli oyuncu (Ü29)

Rapor "kaç kişi oyun oynadı" demiyor, **"kaç kişi kafene geldi"** diyor. Satılan birim
Ü29 ile nitelikli oyuncu olduğu için ekranın en üstünde o duruyor; geri kalan her sayı
onu açıklamak için var.

`play_sessions.is_qualified` Faz 5'ten beri hesaplandığından bu faz **şemaya
dokunmadı** — yeni tablo, yeni kolon yok. Faz 8 kotayı uygulamıyor; birimi ölçüyor.
Free Reach kotası ve Boost fiyatları ticari karar olarak ürün sahibinde (S14'ün açık
alt kalemi).

**İkinci sayı bilerek ayrık:** "kazanılan indirim" ile "kasada kullanılan indirim" yan
yana ama farklı ağırlıkta yazılıyor. Kafenin ödediği tek şey ikincisi (Ü7); dağıtılıp
kullanılmayan kuponun maliyeti yok. Satış konuşmasının merkezindeki cümle bu ayrımda
duruyor.

---

## §3 · Ü30 · Mahremiyet eşiği ve bulunan hata

Saat ve masa kırılımında beş kişiden az içeren gruplar sayı yerine `<5` gösteriliyor.
Toplamlar eşiğe tabi değil: tek satır kişiyi işaret edebilir, toplam edemez.

### 🔴 `null` ile `0` karıştırılınca rapor yalan söylüyordu

**Bulgu:** Ekran boş dönem kontrolünü `saatler.every((s) => (s.oyuncu ?? 0) === 0)`
ile yapıyordu. Gizlenmiş saat `null` döndüğü için `?? 0` onu **sıfıra** çeviriyordu.

**Sonucu:** Bütün saatleri eşiğin altında kalan bir haftada ekran *"Bu dönemde henüz
oyun oynanmadı"* yazıyordu — oysa üç oyun oynanmıştı, defterde satırı vardı ve masa
hareketi bölümü aynı ekranda `3 oyun` gösteriyordu. Rapor kendi kendisiyle çelişiyordu.

Bu bir görüntü kusuru değil: rapor satılan şeyin kanıtı. Boş olmadığı hâlde "boş"
demesi, kafeye **yanlış beyan**tır ve tam da satın alma kararının verildiği ekranda
olur.

**Nasıl bulundu:** Tarayıcıda kafe yöneticisi olarak rapor açıldı. "Hangi saat
doluyor" bölümü boş derken defterde `25 Ağu 21:19 · Masa 1 · 3 oyun` satırı duruyordu.
Testler bunu yakalamamıştı çünkü hepsi alan katmanını çağırıyor, ekranın koşulunu
değil.

**Düzeltme:** Ayrım ekrandan alınıp alan katmanına taşındı —
`rapor.donemBos(saatler)`, `null`'ı gizlenmiş sayıyor, `0`'ı boş. Aynı hatayı
yapabilecek her yüzey (ekran, CSV, ileride e-posta özeti) tek cevabı okuyor. Gizli
saat varken ekran artık satırları `<5` ile gösteriyor ve altına şunu yazıyor:
*"`<5` yazan saatlerde oyuncu var ama sayısı mahremiyet eşiğinin altında."*
Regresyon testi eklendi.

### 🟠 Dosya, ekranın gösterdiğinin yarısını taşıyordu

**Bulgu:** CSV yalnızca özet, masa hareketi ve saatlik dağılımı içeriyordu; **kampanya
sonuçları ve doğrulama defteri yoktu** (tasarım D10 §8 üçünü de sayıyor).

**Neden önemli:** Defterin varlık sebebi *"sayımızı satır satır denetleyebilirsin"*
(S4). Denetim, ancak dosya muhasebeciye götürülebildiğinde denetimdir; ekranda kalan
bir tablo denetim değil, gösteridir.

**Düzeltme:** İki bölüm de dosyaya eklendi. Defter satırları kimlik taşımıyor —
anonim kod, saat, masa, kanıt seviyesi. Eşik dosyada da geçerli. Ayrıca CSV hücreleri
artık kaçırılıyor: kafenin yazdığı masa veya ürün adı noktalı virgül içerirse sütunlar
kaymıyor.

**Eşiğin defter için geçerli olmaması bilinçli:** defterdeki her satır kafenin zaten
fiziksel olarak gördüğü bir şeyi tekrar ediyor. Eşik, dışarı çıkabilen **toplu**
görünümleri koruyor — birleştirildiğinde kişiyi işaret edebilecek olanları.

---

## §4 · G1 · Kafe kişisel veri görmez

Hiçbir sorgu `player_id` döndürmüyor. Kafenin gördüğü tek kimlik, o kafeye özel anonim
kod; kod kafe başına farklı olduğu için iki kafe kendi kayıtlarını birleştirip aynı
kişiyi izleyemiyor (test: *"anonim kod kafeye özel — başka kafede aynı kod çıkmaz"*).

Üretilen gerçek dosya tarandı:

```
telefon deseni  : yok
oyuncu kimliği  : yok
ad / soyad      : yok
eşik damgası    : var
```

---

## §5 · Uçtan uca doğrulama — gerçek tarayıcıda

| Adım | Sonuç |
|---|---|
| Kafe yöneticisi 0532 000 00 01 ile girdi | Oturum açıldı |
| `/kafe/panel/rapor` | Nitelikli oyuncu 1 · tamamlanan oyun 3 · verilen kupon 2 |
| İndirim bölümü | Kazanılan 30 TL · **kasada kullanılan 15 TL** |
| Saatlik dağılım | `21:00 <5` · `23:00 <5` + eşik açıklaması |
| Doğrulama defteri | `P-FB4V · 25 Ağu 21:19 · Masa 1 · NİTELİKLİ · 3` |
| CSV indir | Beş bölüm, kişisel veri yok, `<5` uygulanmış |
| Denetim izi | `report.view` + `report.export` |

---

## §6 · Faz 8 neyi kapattı

Plandaki beş madde de yerinde:

1. Gelen oyuncular — anonim kod, zaman damgalı doğrulama defteri (S4)
2. Masa bazlı hareket
3. Kazanılan ve fiilen kullanılan indirim — ayrı, ikincisi ağır
4. Kampanya sonuç raporu
5. Dışa aktarma — ekranda ne varsa dosyada da

Kafe artık kendisine satılan şeyi **sayıyla görüyor ve satır satır denetleyebiliyor.**
Denetlenemeyen bir sayı, satış konuşmasında bir iddiadan ibarettir.

---

## §7 · Aynı geçişte: Ü31 arayüz dönüşümü

`docs/17` §5'e göre koyu çini paletinden **"Açık ve Asil"**e geçildi. 49 dosya
değişti, 1 dosya eklendi.

| Ne | Nasıl |
|---|---|
| Font | `Bricolage + Manrope + Martian Mono` → **Outfit + JetBrains Mono**. `next/font/google` derlemede indirip yerelden servis ediyor; canlıda `fonts.googleapis.com`'a istek yok |
| Renk | 15 token → **9 token** (`yuzey`, `zemin`, `cukur`, `cizgi`, `yazi`, `yazi-sonuk`, `vurgu`, `odul`, `tehlike`). Oyuncu-koyu / işletme-kâğıt ayrımı kalktı |
| `.karo` | Silindi. Yerine düz kart: `rounded-2xl border border-cizgi bg-yuzey`; vurgulu kartlarda kenarlık `border-vurgu` / `border-odul` |
| `.butce-bar` | **`.asil-serit`** oldu — `-45°`, `rgba(255,255,255,0.15)` 10px dolu / 10px boş. Yalnızca seviye çubuğu, bütçe çubuğu ve kampanya sayaçlarında |
| Mikro etiket | 84 yerde mono'dan **Outfit 600 · 12/16 · 0.05em**'e (`.etiket-caps`). Bu sistemde mono yalnızca sayıya ait; etiket bir sayı değil, adı |
| Şekil | Keskin köşeden **kart 16 / düğme 8 / çip 4**px'e — 109 yerde |
| Zum | `maximumScale: 1` silindi, `themeColor` `#FAFAFA` |

**İki bulgu:**

### 🔴 Font zinciri `:root`ta kopuyordu

`@theme` bloğu `--font-body: var(--font-outfit)` tanımını **`:root`** üstünde
yapıyor, ama `next/font` değişken sınıfı `<body>`ye yazılıyordu. Özel özellik
`var()` yerine koyması tanımlandığı elemanda olduğu için `--font-body` `:root`ta
geçersiz kalıyor ve **bütün metin** tarayıcı varsayılanına (Times New Roman)
düşüyordu. Font sınıfları `<html>`e taşındı; tarayıcıda ölçülerek doğrulandı:
gövde `Outfit 400`, H1 `Outfit 800 48px`, sayılar `JetBrains Mono`.

Bu hata **önceki palette de vardı** — koyu temada Manrope yerine Times çiziliyordu,
kimse fark etmemişti.

### 🟠 Kayıt formundaki zorunlu onay 404'e bakıyordu

`/aydinlatma` bağlantısı vardı, sayfa yoktu. Açık rızanın "bilgilendirilmiş" olması
şartı bu bağlantının çalışmasına bağlı. Ekran `docs/tasarim/_govde/aydinlatma.html`
düzeninden koda alındı. **Metin hukuk incelemesinden geçmedi** — açık madde.

### İkonlar: Material Symbols yerine çizili SVG

Tasarım dili alt gezinme için Material Symbols Outlined diyor. O aile yalnızca
`fonts.googleapis.com` üstünden geliyor; `next/font/google` tanımıyor. CDN'den
çekmek, oyuncunun hangi sayfayı ne zaman açtığını üçüncü tarafa sızdırırdı — metin
fontlarını kendimizden servis etme sebebimizin aynısı. Üç ikon aynı dilde (24px kutu,
1.6 kalınlık, dolgusuz kontur) elle çizildi.

**Değişmeyenler:** E9 (oyuncu kupon ekranında TL ve geçerlilik damgası yok), G1
(kafe ekranlarında kişisel veri yok), alt gezinmenin üç durağı, karekodun beyaz
sessiz alanı. Bunlar tasarım tercihi değil, güvenlik ve mahremiyet kuralları —
palet değişse de aynen duruyor. 210 test renkten ve sınıf adından bağımsız; hepsi
yeşil kaldı.

---

## §8 · Kapı sonrası düzeltme turu — 2026-08-26

Kapı geçtikten sonra açık maddeler tek tek ele alındı. **214/214 test**, CI temiz.

### 🔴 Ertelenmiş kupon hiç açılmıyordu

**Bulgu:** `bekleyenleriAc` ve `sureDolanlariSupur` Faz 7'de yazılmıştı ama
**hiçbir yerden çağrılmıyordu.** Satır sonsuza kadar `pending` kalıyordu.

**Sonucu — iki ayrı arıza:**

| Nerede | Ne oluyordu |
|---|---|
| Kasa (`coz`) | Kupon reddediliyor, kasiyere *"Bu kupon 27 Ağustos'ta açılıyor"* deniyordu — 30 Ağustos'ta |
| Kasa (`onayla`) | `WHERE status = 'active'` olduğu için onay hiç mümkün değildi |
| Ödüllerim | Kart sürekli "Yarın açılıyor" diyordu |
| Ana ekran | "Kullanılabilir kupon" sayacı o kuponu hiç saymıyordu |
| Bütçe | Süresi dolan kuponun rezervasyonu **bütçeye hiç dönmüyordu** (E11) |

Yani Ü28/A5 — *"51 TL üstü ödül ertesi gün açılır"* — pratikte **"asla
açılmaz"** demekti. Oyuncu ödülü kazanıyor, ekranında görüyor, kasada
kullanamıyordu.

**Düzeltme — karar zamanın:** kuponun hâline artık `status` kolonu değil
`activates_at` / `expires_at` karar veriyor (`domain/odul.ts`,
`domain/kupon.ts` `coz` ve `onayla`, `domain/puan.ts`). Bakım işi gecikse bile
oyuncu kuponunu kullanabiliyor. Bilinçli bir sıralama: **para yolundaki
doğruluk arka plan işine bağlanmaz.** Onay hâlâ tek koşullu UPDATE — atomiklik
bozulmadı, eşzamanlılık testleri geçiyor.

**Bakım köprüsü:** `domain/bakim.ts` — envanter ve bütçe/rapor ekranları
açılırken, dakikada en fazla bir kez `bekleyenleriAc` + `sureDolanlariSupur`
çalıştırıyor; hatası yutuluyor (bakım yüzünden ekran çökmemeli). Gerçek
zamanlanmış iş **Faz 10'da** kalıyor; bu köprü yalnızca bütçe iadesini ve
defteri toparlıyor.

Dört regresyon testi eklendi — üçü ertelenmiş kupon, biri "açılma zamanı
gelmemiş kupon hâlâ reddedilmeli" (A5 ters yönden korunuyor).

### 🟠 Palet kendi erişilebilirlik kuralını tutturamıyordu

Ölçüldü: `#757575` sönük metin sayfa zemininde **4.41**, çukur zeminde
**4.12**; `#D4AF37` **metin olarak** beyazda **2.10**. Sistemin kendi kuralı
4.5:1 diyor.

| Değişen | Eski | Yeni | En kötü hâl |
|---|---|---|---|
| Sönük metin | `#757575` | `#6B6B6B` | 4.76 |
| Altın **metin** | `#D4AF37` | `#856612` (`odul-koyu`) | 4.80 |
| Tehlike metni | zemin `cukur` | zemin `yuzey` | 4.77 |

Altın; çerçeve, dolgu ve asil şerit olarak `#D4AF37` **kalıyor** — ürünün
tanınır rengi orada; değişen yalnızca yazı hâli. Tasarım kaynağı da aynı
değerlere çekildi (`kur.mjs` + 40 ekran + `index.html`). Tarayıcıda dokuz
ekranda otomatik kontrast taraması yapıldı: **ihlal yok**.

> Bu bir palet genişletmesi değil, aynı rengin okunabilir tonu — yine de
> kilitli sisteme dokunuyor, **ürün sahibinin onayına açık**.

### Küçük düzeltmeler

| Ne | Nasıldı |
|---|---|
| Panelde "Masa karekodları · **faz 7**" rozeti | Faz 7 çoktan bitmişti; "sırada" oldu |
| `/firsatlar` altındaki not | *"Ödül alma ve kupon kullanma Faz 7'de açılıyor"* yazıyordu; artık ekranın gerçek işini anlatıyor |
| Oyun tahtası hücreleri | Boş hücre zeminden **açık**, aralık koyuydu — tasarımın tersi. Artık boş hücre çukur, tahta beyaz |
| Tasarım kaynağı | `kur.mjs` 11 Stitch dosyasına dokunmuyor sanılıyordu; aslında 40 ekranın hepsi üretiliyor — belge düzeltildi |

---

## §9 · Kalan açık maddeler

Hiçbiri kodla kapatılamıyor: üçü insan kararı, biri faz kapsamı.

| # | Konu | Neden burada değil | Nereye |
|---|---|---|---|
| ⚠️ | **S20 · Aydınlatma metni** hukuk incelemesinden geçmedi | Hukuki metin avukattan gelir | Pilot öncesi |
| ⚠️ | Kelime listesinin küfür süzgeci insan gözünden geçmeli | Otomatik süzgeç yanlış eleme yapar | Faz 10 |
| ⚠️ | Düşen-blok mekaniğinin hukuki sınırı | Avukat sorusu (G6) | Faz 10 |
| — | Free Reach kotası ve Boost fiyatları | Ticari karar, ürün sahibinde | Pilot sonrası |
| ⚠️ | **G32:** platform girişinde ikinci faktör yok | Faz 10'un maddesi; TOTP kurulumu ayrı iş | Faz 10 |
| — | Kupon bakımı için **gerçek zamanlanmış iş** | Köprü çalışıyor, doğruluk ona bağlı değil | Faz 10 |
| — | **D11 masa karekodları ekranı** yazılmadı — kafe kendi masa kodlarını yazdıramıyor | Tasarımı hazır; hangi faza gireceği karara bağlı | Ürün sahibi |
