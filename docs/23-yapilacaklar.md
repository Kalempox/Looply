# 23 — YAPILACAKLAR

> **Aradığın dosya bu.** Tek liste, sırayla, kutucuklu.
> Bir iş bitince kutusu işaretlenir ve karar defterine (`02`) girer.
>
> Yan dosyalar: neyin **var** olduğu → `21-looply-kapsam-haritasi.md` ·
> demoda neyin **yapılabildiği** → `22-demo-yapilabilirlik.md`

**Son güncelleme:** 2026-09-16 · **Kararlar:** Ü76 – Ü139

> 🚀 **Yayına çıkış işleri ayrı bir listede:** `docs/25-yayin-plani.md`
> (güvenlik → altyapı → mesajlaşma → hukuk). Orası **sırayı** tutuyor,
> burası ürün işlerini. Şu an orada: A0 ✅ · A1 ✅ · **sıradaki A2**.

---

# DALGA 7 · ✅ TAMAMLANDI — 2026-09-16

> Tek oturumda on üç iş. Ayrıntı karar defterinde (`02`), Ü125–Ü139.
> 🔴 **Hiçbiri commit edilmedi** — yığın 120+ dosya.

- [x] **Ödül ve kampanya ayrıldı** ✅ — Ü138
  Sekmeler kaldırıldı, sol menüde ayrı duraklar, farkı anlatan not.
  🔴 İki bayat metin bulundu: sekme bileşeni kampanya için *"oyun oynamayı
  gerektirmiyor"* diyordu (yanlış — oynamak şart, kazanmak değil) ve
  Ü52'den kalma *"puanla satın alınır"* cümlesi yeni metinlere kopyalanmıştı.
- [x] **Takvim arızası** ✅ — Ü139
  *"Bugün"e basınca hiçbir şey olmuyordu.* Chrome'da `<input type="date">`
  gövdesine tıklamak takvimi açmıyor; `showPicker()` eklendi, takvim
  simgesi ve odak halkası geldi.
- [x] **Şube başvurusu panelden** ✅ — Ü125 · göç 0036
  0026 şemayı açmış ama yolu yazmamıştı: `subeler.length > 1` hiç
  gerçekleşemiyordu. G5 kapısı duruyor, şube `pending` doğuyor.
- [x] **Başvuru dört alana indi** ✅ — Ü126 · göç 0037
  Ticari unvan, vergi no, adres ve **vergi levhası** kalktı.
  ⚠️ G5'in kanıt tabanı bilerek gevşedi.
- [x] **Kafe başına tek karekod** ✅ — Ü127 · göç 0038
  Masa kavramı, dört karekod türü ve masa raporu kalktı. Tablo duruyor.
- [x] **Kuponlarım kafeye göre** ✅ — Ü128
  Gruplama + geçmiş ikiye ayrıldı (kullandıkların / süresi geçenler).
- [x] **Aktivasyon saati ayar oldu** ✅ — Ü129
  `ERTELEME_SAAT = 12` sabitti; artık kafenin ve platformun ayarı.
- [x] **Platform paneli** ✅ — Ü130
  Kafeler · künye · oyuncular · ticari ileti. ⚠️ **WhatsApp YAPILMADI** —
  Meta hesabı ve şablon onayı gerekiyor. ⚠️ İYS kaydı da kapsam dışında.
- [x] **Konum geri geldi + yarıçap ayarı** ✅ — Ü131
  `GEOFENCE_METRE = 150` sabitti; artık 20–500 m arası kafenin ayarı.
- [x] **Karekod zinciri uçtan uca test** ✅ — Ü132
  İki ucu bağlayan hiçbir test yoktu. Beş test.
- [x] **Vitrin turu** ✅ — Ü133
  Slogan `Geri gel.`, "katılım ücretsiz" kalktı, kayan şerit düzeldi,
  ödüller 6→14, reklam karşılaştırması, mobil hareket.
- [x] **Çift yönlü değer simülasyonu** ✅ — Ü134
  🔴 Gelen tasarım ürünün veremeyeceği bir kupon değeri (5 TL) kullanıyordu
  ve gerçek aralıkta (25 TL) **negatife** dönüyordu. Dördüncü oran
  (artım) eklendi, başa baş noktası öne alındı.
- [x] **Kupon simülasyonu** ✅ — Ü135 · `/gelistirme`
  Kamerasız test: kullanılabilir kuponlar kodlarıyla listeli.
- [x] **Kupon durumu yoklayıcısı** ✅ — Ü136
  Kasiyer onaylayınca müşterinin açık ekranı değişmiyordu. 3 sn yoklama.
- [x] **Butik kipi** ✅ — Ü137 · göç 0039 + 0040
  Oyun yok; çark hakkını kasiyer alışverişe bakarak veriyor. Dört koşul
  türü, VEYA ile bağlı. 🔴 İlk göç **RLS'yi unuttu** — kiracı izolasyonu
  testi yakaladı, 0040 ile kapatıldı. Mock butik: `npm run db:butik`.

## Bu dalgadan kalan açık işler

- [ ] **WhatsApp gönderimi** — Meta Business hesabı + sağlayıcı + şablon
  onayı. Kod tarafı yazılabilir, hesap tarafı işletmede.
- [ ] **Takvimin alt sınırı** — 2019 seçilirse panel sıfırlarla dolu bir
  gün gösteriyor. Kafenin açılış tarihinden öncesi kapatılmalı.
- [ ] **Butik akışı sahada denenmedi** — uçtan uca testler geçiyor ama
  gerçek telefonla kasa→QR→çark yolculuğu henüz yapılmadı.
- [ ] **Vitrindeki 2.000 TL sistem maliyeti** bir fiyat açıklaması ve
  ürünün fiyatlandırması hâlâ karara bağlanmadı (Ü41'in açık bıraktığı).

---

# DALGA 1 · ✅ TAMAMLANDI — 2026-09-02

- [x] **1 · Kampanya teslim yolu** ✅ **BİTTİ** — Ü82, 2026-09-02
  Nitelikli oyun sonunda, kampanya başına günde bir kupon. Başarı şartı yok
  (ödül oynamanın karşılığı, kampanya kafenin pazarlaması). Seçim rastgele
  değil: bugün en az kupon çıkan kampanya.
  ⚠️ **Yol boyunca bulunan asıl hata:** şema Ü8'in *"yüzde kampanyası
  bütçeden düşmez"* kısıtını taşıyordu; Ü17 bu kararı tersine çevirmiş ama
  kısıt güncellenmemişti. Hiç kampanya kuponu üretilmediği için çelişki iki
  yıl görünmedi. Göç `0023` düzeltti.
  11 test · `npm run ci` 400/400.

- [x] **2 · Sonsuz oyun + `basarili()` kararı** ✅ **BİTTİ** — Ü83, 2026-09-02
  Bölüm kavramı sözleşmeden tamamen kalktı. Turun tek bitişi kaybetmek.
  Zorluk kolları: Blok'ta küçük parçalar seyreliyor, Düşen'de her dört
  satırda hızlanma, Kelime'de tur başına süre (45 sn → 15 sn).
  `basarili` artık **skor eşiği**: `puan.KUPON_ESIGI = 500`, kapsam
  belgesindeki 500/1000/2500 kademesinden. Ü48'in 1500/2500'ü artık
  gerçekten ödenebilir.
  403 test yeşil · tarayıcıda misafir akışıyla uçtan uca oynandı.

- [x] **2b · Skor dengesi** ✅ **KAPANDI** — ürün sahibi elle test etti,
  oynanış iyi. Bot skorlarının düşük olması sorun değil: botlar demo
  verisi üretmek için yazıldı, iyi oynamak için değil.

- [x] **2c · Oyun saati sunucuda doğrulanıyor** ✅ **BİTTİ** — Ü84, 2026-09-02
  Sözleşmeye `gecenMs()` eklendi, sunucu bildirilen saati `duration_ms` ile
  karşılaştırıyor. On dakikayı üç saniye diye bildiren kayıt reddediliyor.
  Aynı kontrol misafir akışında da var.
  ⚠️ Düşen ekranı da duvar saatine geçti — kontrolün ön koşuluydu, yan
  kazancı sekmeyi arkaya atıp parçayı havada tutamamak.
  408 test yeşil · tarayıcıda gizli sekmede yerçekimi doğrulandı.

- [x] **3 · Oyun tahtalarının görünümü** ✅ **BİTTİ** — Ü85, 2026-09-02
  Üç tahta da oyunun kendi rengine geçti; yüzey `arayuz/tahta.tsx`ten tek
  yerden geliyor. Hücreler gradyanlı ve üstten ışık alıyor — dolu hücre
  nesne gibi duruyor, boş hücre çukur.
  Blok'ta seçili teklif yükseliyor ve parça önizlemesi ızgaradaki rengiyle
  aynı; Düşen'de bırak düğmesi tam genişlikte alta indi (yön tuşlarıyla
  karışıp parçayı yanlışlıkla düşürtüyordu); Kelime'de seçili harf doluyor.
  408 test · üç oyun da tarayıcıda mobil boyutta görüldü.

- [x] **4 · İsim değişikliği: CafePlay → Looply** ✅ **BİTTİ** — Ü86, 2026-09-02
  65 dosya: ekran metinleri, SMS şablonları, sayfa başlıkları, aydınlatma
  metni, paket adı, doküman.
  ⚠️ **Veritabanı kimliklerine dokunulmadı** — `cafeplay_app`,
  `cafeplay_admin`, veritabanı adı, kap ve hacim adları. Göçler uygulanmış
  tarihtir ve kullanıcı bu adları hiç görmüyor.
  ⚠️ **SMS gönderici başlığı başvurusu artık yapılabilir** — şablonlar
  "Looply" ile başlıyor ve test bunu çiviliyor. Operatör onayı birkaç iş
  günü; geciken canlıya çıkışı bloke eder.

---

# DALGA 2 · ✅ TAMAMLANDI — 2026-09-03

Üçü tek bir soruyu cevaplıyor: *bu turda ödül çıkacak mı, hangisi, ne kadar?*
Ayrı ayrı yazılırsa üçüncüsü ilk ikisini bozar.

- [x] **5 · Bütçe temposu** ✅ **BİTTİ** — Ü87, 2026-09-02
  Günlük bütçe gün içinde kademeli açılıyor (varsayılan pencere 09:00–23:00,
  kafenin ayarı). Oran birikimli ve bir **tavan**: sabah kimse gelmediyse pay
  kaybolmuyor; kimse gelmezse hiçbir şey dağıtılmıyor.
  Günün onda biri ilk andan açık — sıfırdan başlasaydı sabahın ilk müşterisi
  eli boş dönerdi (E2).
  ⚠️ Dönem **günlük** (Ü45), haftalık değil — Ü78 yazılırken yanlış
  hatırlanmıştı; tempo bu yüzden gün *içinde* işliyor.
  ⚠️ Pencere saatleri bir tahmin: kafenin gerçek çalışma saatleri sistemde
  yok. Öngörü paneli (madde 16) gerçek veriyle bunu iyileştirecek.
  411 test · panelde "şu an dağıtılabilir" ayrı gösteriliyor.

- [x] **6 · Ödül motoru** ✅ **BİTTİ** — Ü88, 2026-09-02
  Üç girdi çalışıyor. Ölçüldü: eşikte %55 düşme / en pahalı ~%0; doyumda
  %90 / ~%9; doyumda iki kazanımdan sonra %45 / ~%1.
  En ucuz ödül her koşulda en olası kalıyor — sıralama ters çevrilmiyor.
  ⚠️ Göç `0024`: `coupons.play_session_id`. Azalan getirinin ihtiyaç duyduğu
  "hangi oyundan" bağı hiç yoktu; `kaynakId` alınıp hiçbir yere
  yazılmıyordu. Yan kazanç: "hangi oyun daha çok ödül dağıtıyor" sorulabilir.
  **Ü89 ile oranlar kısıldı** (ürün sahibi): düşme %50–75, en pahalı ödül
  %1,5, ortalama 26–27 TL. Ucuz ürünler her koşulda baskın.
  418 test.

- [x] **6b · Kafe kapalıyken ödül yok + panelde çalışma saatleri** ✅ **BİTTİ**
  — Ü90, 2026-09-03. Ü87 kapanıştan sonra bütçenin tamamını açıyordu; artık
  sıfır. Kapanışa yarım saatlik pay var (son masanın turu bitsin).
  Açılış/kapanış panelden seçiliyor, bütçenin hemen altında.

- [ ] **6c · Çalışma saati penceresi gece yarısını aşamıyor** ⚠️ *bilinen sınır*
  Gece 02:00'ye kadar açık bir kafe kapanışını 23 yazmak zorunda ve yarım
  geceden sonrası kapalı sayılıyor. Panel bunu açıkça reddediyor
  ("gece yarısını aşan saatler henüz desteklenmiyor").
  Gerçek gece kafeleri geldiğinde iş günü tanımıyla birlikte ele alınmalı.

- [x] **7 · Oyun içi ödül işareti + Yılan oyunu** ✅ **BİTTİ** — Ü91, 2026-09-03
  Yılan eklendi; elmanın bazısı **altın kupon**. İlk beş yemde çıkmıyor
  (öğrenme anı), sonra uygun yemlerin beşte biri.
  Oyun kupon üretmiyor, yalnızca sayıyor — sunucu replay'de aynı sayıyı
  buluyor. İşaret şansı yükseltiyor (%50→%70, %75→%95) ve **kupon eşiğini
  atlıyor**; tier'i açmıyor (bütçe, Ü89).
  ⚠️ Yılan ilk yön tuşuna kadar bekliyor — ilk sürümde oyuncu ekrana
  bakmadan üç saniyede duvara giriyordu.
  424 test · tarayıcıda oynandı.

- [x] **7c · Ödül yemden ayrıldı + oranlar düştü** ✅ **BİTTİ** — Ü92/Ü93
  Ödül artık yemin yerine değil **yanına** beliriyor ve 25 adım sonra
  kayboluyor: yakalamak bir karar. Kovalayan %21, görmezden gelen %3.
  Motor tabanı 0,50–0,75 → **0,22–0,45** (Blok %26 → %10).
  İşaret payı ters yönde arttı (0,20 → 0,35): yakalanan ödül %62 karşılık
  veriyor, yoksa görünen ödülü kaçırmak oyunu yalan çıkarırdı.
  Bütçe paneline **ödül dökümü** eklendi — hangi ödül, kaç açık, kaç kasada.

- [ ] **7b · Blok ve Düşen'e de ödül bloğu** *(isteğe bağlı)*
  Sözleşmedeki `odulIsareti` seamı hazır; Yılan'da ayrı nesne olarak
  çözüldü (Ü92), Blok/Düşen'de de aynı yaklaşım kurulabilir.

---

# DALGA 3 · ŞİMDİ — döngüyü güçlendiren ucuz işler ⬅️

- [x] **8 · Ödül ve ürün adını düzeltme** ✅ **BİTTİ** — Ü94, 2026-09-03
  Ödül ve ürün satırında "adı düzelt" kutusu. **Yalnızca ad ve açıklama**;
  değer, tip, fiyat ve kategori değişmiyor — verilen söz geri alınmaz.
  Kaç açık kuponun etkileneceği kutu açılır açılmaz yazıyor.
  Eski ad denetim izinde (`oncekiBaslik`) — Ü75'te ad izden çıkarılmıştı
  ama ad DEĞİŞİKLİĞİNDE eski ad başka hiçbir yerde kalmıyor.
  Demo verisindeki "ize amreicano" ve "çoklata" düzeltildi.
- [x] **8b · Girişli oyuncu karekodu okutunca masaya oturuyor** ✅ **BİTTİ** — Ü95
  🔴 Sahada bulunan hata: girişli oyuncu karekodu okutunca masa oturumu
  **hiç açılmıyordu** — "Kafe dışındasın" görüp ödül kazanamıyordu.
  İlk ziyarette çalışması (kayıt akışı oturumu kendisi açıyor) hatayı
  gizlemişti. `masayaOturt` ortak modüle taşındı, üç yol da çağırıyor.
  Ayrıca: "oturumun doldu" artık "kafe dışındasın"dan ayrı ve ne
  yapılacağını söylüyor; konumsuz kafede çalışmayan "Doğrula" düğmesi
  kaldırıldı.

- [x] **8c · Karekod doğrudan çarkla açılıyor** ✅ **BİTTİ** — Ü96, 2026-09-08
  Karekodu okutan çarkı tam ekran görüyor, çeviriyor, ödül çıkınca
  "kullanmak için hesabını aç" diyor. Girişli oyuncu da artık `/cark`'a
  gidiyor — eskiden `/oyna`'da bir kart olarak görüp çevirmiyordu.

- [x] **9 · Haftalık leaderboard sezonu + haftalık puan** ✅ **BİTTİ** — Ü105,
  2026-09-11
  `/liderlik`te üçüncü liste: **bu haftanın sezonu** (pazartesi–pazar) ·
  geri sayım · oyuncunun haftalık puanı · geçen sezonun birincisi.
  Ana ekrandaki liderlik kartının altında da tek satır özet.
  ⚠️ Sezon haftası **bütçe haftasıyla aynı** (`pazartesi()`, Ü25) — ayrı
  olsaydı kafenin raporundaki "bu hafta" ile oyuncunun sezonu farklı
  günleri kapsardı.
  ⚠️ **Sezonun ödülü yok** (E5 bozulmadı). Otomatik ödül, kafenin
  istemediği bir parayı bütçeden çıkarır ve S7'yi ağırlaştırırdı.
  ⚠️ Tüm zamanlar listesi kazanılamaz olduğu için var: aynı oyuncu
  tüm zamanlarda 7., sezonda 2. sırada çıkıyor.
  ⚠️ Yeni tablo yok — sezon `points_ledger`'dan türüyor; iki liste
  aynı sorgudan geçiyor.
- [x] **10 · Günün Challenge'ı rotasyonu** ✅ **BİTTİ** — Ü106, 2026-09-11
  Artık gerçek bir görev var: **skor** · **tur sayısı** · **oyun çeşidi**,
  beşli havuzdan dönüşümlü. Ana ekranda ilerleme çubuğu, oyun sonunda
  ayrı satır.
  ⚠️ Ödül **XP, puan değil**: günlük tavan 900 ve bonuslu oyun tek başına
  600 yazıyor — puan olsaydı görev yalnızca az oynayana öderdi.
  ⚠️ Havuz boyu (5) ile oyun sayısı (4) **aralarında asal olmak zorunda**;
  beşinci oyun eklenince sessizce bozulur, test onu bekliyor.
  ⚠️ Yarım tur ve kafe dışı tur saymıyor (Ü3).
  ⚠️ Günde bir kez **şemadan** (göç 0031 tekil indeks). Aynı açık
  Ü54'ün seri bonusunda da vardı, o da bu göçte kapandı.
- [x] **11 · Tekrar ziyaret metriği** ✅ **BİTTİ** — Ü102, 2026-09-10
  Raporda "Geri dönüş oranı": kohort · oran · ortanca dönüş süresi ·
  kaçıncı ziyaret dağılımı · kupon karşılaştırması.
  ⚠️ Kohorta **zaman tanınıyor** (`[D-42, D-14]`) — dün gelenin geri
  dönmeye zamanı olmadı, onu paydaya koymak oranı haksız düşürürdü.
  ⚠️ Kupon karşılaştırması **gözlem, kanıt değil** ve ekranda öyle yazıyor.
  ⚠️ Küçük kohortta oran da gizleniyor (Ü30).
- [x] **12 · Ödül başına günlük adet limiti + kupon kullanım günü ve saati**
  ✅ **BİTTİ** — Ü103, 2026-09-10
  Panelde her ödülün yanında "sınırlar" kutusu: günde en fazla kaç adet ·
  hangi günler · hangi saatler. Özet satırda görünüyor
  ("günde 5 · hafta içi 14:00–17:00 arası · bugün 0").
  ⚠️ Limit **seçimden önce** süzülüyor — sonra reddedilseydi düşme oranı
  sessizce azalırdı. Çarkın dilimlerinden de çıkıyor.
  ⚠️ Verilen kupon sayılıyor, kullanılan değil (Ü7).
  ⚠️ Kullanım penceresi **oyuncuya gösteriliyor** ve hem `coz` hem
  `onayla` içinde sınanıyor.
  ⚠️ Pencere gece yarısını aşamıyor — 6c ile aynı bilinen sınır.
- [x] **13c · Çark olasılıkları kafenin elinde** ✅ **BİTTİ** — Ü110,
  2026-09-13 *(ürün sahibinin yeni isteği, listede yoktu)*
  Ödül kataloğunda **Çark olasılıkları** bölümü: her ödülün çıkma
  ağırlığı ve yanında türetilmiş yüzdesi, toplam ağırlık, "otomatiğe dön".
  ⚠️ Yüzde değil **ağırlık** giriliyor; yüzde o anki toplamdan türüyor.
  Sabit yüzde olsaydı her ödül ekleme/çıkarma elle yeniden hesap demekti
  ve Ü103'le (günlük adedi dolan ödül çarktan düşüyor) çelişirdi.
  ⚠️ Paneli hiç açmayan kafede **Ü49'un dağılımı aynen** işliyor.
  İlk ağırlık yazıldığında kalanlar o anki değerlerden sabitleniyor ve
  bu, kimsenin payını değiştirmiyor.
  ⚠️ 0 = çarkta çıkmaz. Hepsi sıfır olamaz.
  ⚠️ Panel yalnızca çarka giren ödülleri gösteriyor; kalanlar sebebiyle
  ayrı listede (üst sınır · günlük adet · en ucuz sekizin dışında).
  ⚠️ Panelde yazan yüzde **çekilişle ölçülerek** sınandı (8.000 çevirme).
  🔵 **S7 bu maddeyle daha da acil** — kafe artık kendi olasılığını
  yazıyor, mevzuat görüşünün kapsamına açıkça girmeli.
- [x] **13 · Kasa, menü ve fiş karekodları + kafe oyun yönetimi** ✅ **BİTTİ**
  — Ü108 / Ü109, 2026-09-11
  **Karekodlar:** masa · kasa · menü · fiş. Panel türe göre gruplanıyor,
  yazdırma kartı türü ve nereye asılacağını taşıyor. Tohumda dördü de var.
  ⚠️ **Fiş karekodu bir SATIN ALMA KANITI DEĞİL.** E6'nın K4 kademesi
  (×2 çarpan, 51 TL+ ödül) bu değil — sabit bir koda K4 vermek, çarpanı
  kodu fotoğraflayan herkese açmak olurdu. K4 hâlâ hiçbir yerden
  verilmiyor ve ödül aralığı 25–50 TL olduğu için (Ü52) zararsız.
  Panel bunu açıkça yazıyor, bir test de koruyor.
  ⚠️ Ayrı tablo değil, `cafe_tables`a tür kolonu — dördü aynı işi yapıyor.
  **Oyun yönetimi:** kafe hangi oyunun açık olacağını seçiyor.
  ⚠️ Asıl iş **günün oyunu**: rotasyon artık kafenin açık listesi
  üzerinde dönüyor. Yoksa kapalı oyun "bugünün oyunu" çıkar, bonus ölür,
  liderlik boşalır ve günün görevi imkânsız olurdu.
  ⚠️ Süzgeç beş yerde: katalog · ana ekran · liderlik · oyun sayfası ·
  **misafir karekod ekranı** (bu sonuncusu tarayıcıda yakalandı).
  ⚠️ Kapı `basla`da, `bitir`de değil — süren tur bitirilip ödeniyor.
  ⚠️ Son açık oyun kapatılamıyor; üstüne bir savunma katmanı var.
- [x] **13b · 🔴 `happy_hour_plans`a RLS** ✅ **BİTTİ** — Ü107, 2026-09-11
  *(13'ü yazarken bulundu — Ü104'te açtığım göçte unutulmuştu)*
  Şemadaki cafe_id taşıyan tek RLS'siz tabloydu. Okuma **ve yazma**
  sızıntısı vardı: bir kafenin program kurması bütün kafelerin aynı gün
  programını kapatıyordu. Sızıntı önce testle gösterildi, sonra kapatıldı.
  ⚠️ Asıl düzeltme sınıfın kendisi: cafe_id taşıyan **her** tabloda
  RLS'yi sınayan test — yeni tabloları kendiliğinden kapsıyor.
- [x] **12b · Happy Hour: haftalık program + kendi bütçesi** ✅ **BİTTİ**
  — Ü104, 2026-09-10 *(ürün sahibinin yeni isteği, listede yoktu)*
  Panelde **haftalık program**: her güne ayrı başlangıç saati, süre ve
  havuz. Bugüne düşen program bakım köprüsünde kendiliğinden pencereye
  dönüyor — kafenin her sabah elle açması gerekmiyor.
  ⚠️ Havuz artık günlük bütçeye **ekleniyor**, ondan kesilmiyor: o günkü
  taahhüt `günlük bütçe + havuz` ve bütçe ekranı bu toplamı kırılımıyla
  yazıyor ("1.800 TL · 1.500 bütçe + 300 happy hour").
  ⚠️ Havuzu yalnızca **happy hour kuponu** harcayabiliyor — yoksa kafenin
  "bu saate ayırdım" dediği para başka saate akardı.
  ⚠️ Aynı gün ikinci kez açılmıyor (`plan_id, business_date` tekil);
  köprü dakikada bir koşuyor.
  ⚠️ Saati geçmiş program bugün için **atlanıyor**.
  ⚠️ Havuzu boş bırakmak = o gün happy hour yok. Satır silinmiyor,
  `active = false` oluyor (geçmiş pencereler ona bağlı, E3).
  ⚠️ Pencere gece yarısını aşamıyor — 6c ile aynı bilinen sınır.

---

# DALGA 3B · YENİ — 2026-09-08 belgelerinden çıkanlar

**Kaynaklar:** `cafe dashboard.txt` · `ödül açılma geyikleri.txt` ·
`looply cafeplay ilişkisi ve landing page dönüşümleri.txt` · panel görseli ·
ChatGPT analiz bağlantısı.

## ✅ Çatışma çözüldü — Ü97

- [x] **Ç1 · "50 TL kazandın" mı, ödülün adı mı?** ✅ **ÇÖZÜLDÜ** — Ü97
  Ürün sahibi: *"ödülü tabii ki bilecek, zamanı bilmeyecek."*
  Saklanacak şey tutar değil **saatmiş**. Çatışma kendiliğinden kalktı:
  ödülün adı en baştan görünüyor (hep görünüyordu), TL hiç görünmüyor
  (E9 duruyor), gizlenen tek şey açılma saati.
  Süre 24 → **12 saat**.

<details><summary>Çatışmanın özgün hâli</summary>
  `ödül açılma geyikleri.txt` açılma anında **tutarı** göstermek istiyor:
  *"50 TL kazandın. İşte burada rakam ilk defa ortaya çıkıyor."*
  **E9 + Ü76 bunu yasaklıyor** — oyuncu ekranında ödülün ADI durur, TL
  değeri durmaz; kasiyerin sistemi atlamasını tasarımla engelliyoruz ve
  ürün sahibi bunu *"bu konuda sen haklısın"* diyerek onaylamıştı.
  **Önerilen çözüm:** açılış anında ödülün **adı** açıklanır. Tutar
  ödülünse ad zaten sayı taşıyor ("50 TL indirim"), yani dramatik açılış
  bozulmadan çalışıyor; gizli kalan şey `cost_kurus` (kafenin maliyeti).
  ⚠️ Ürün sahibi onaylamadan mizah motoru yazılmamalı.
</details>

## Ödül bekleme mizahı (`ödül açılma geyikleri.txt`)

- [x] **24 · Bekleme mesajı motoru** ✅ **BİTTİ** — Ü97, 2026-09-08
  34 cümle · 4 havuz · saate duyarlı · kupona göre sabit (rastgele değil).
  Zaman ima eden cümleler yalnızca gerçekle uyuşuyorsa seçiliyor.
  Yalnızca oyuncu görüyor; kasiyer gerçek saati görüyor.

<details><summary>Özgün istek</summary>

- **Bekleme mesajı motoru**
  Dört havuz: standart · astronomi · astroloji · absürt Looply.
  30–50 mesaj, son gösterilenleri tekrar etmeyen seçim.
  Saate duyarlı (akşam / gece / sabah farklı konuşuyor).
  ⚠️ **Mizah değişir, aktivasyon kuralı değişmez** — `activates_at` neyse
  odur; metin onu ne öne alır ne erteler.
  ⚠️ Mizah **ödül tutarıyla ilişkilendirilmez** ("Jüpiter güçlü, 50 TL
  çıktı" gibi bir mekanik kurulmaz) — yoksa şaka, ödül algoritması sanılır.
  Altyapı hazır: Ü28 erteleme + `activates_at` zaten var, bugün metin düz.
</details>
- [x] **25 · Açılma bildirimi** ✅ **BİTTİ** — Ü98, 2026-09-08
  ⚠️ **SMS tarafı zaten çalışıyormuş** — "tetikleyici yok" demek yanlıştı.
  `bakim()` → `bekleyenleriAc()` → `activated` → `coupon_active` SMS.
  Eksik olan uygulama içindeki **an**dı: "Ödülün açıldı" şeridi eklendi,
  Ü97'nin `acilmaMetni`si nihayet kullanılıyor.
  Kutlama 24 saat duruyor, sonra kendiliğinden kalkıyor.

## Kafe paneli (panel görseli + `cafe dashboard.txt`)

- [x] **26 · Bugünün beş ana metriği** ✅ **BİTTİ** — Ü99, 2026-09-08
  Oynayan · kullanılan kupon (+dönüşüm) · verilen indirim (+kupon başına
  ortalama) · yeni müşteri · beklenen müşteri.
  Bugün panelde yalnızca "bugün ödediğin" var; kalanı rapor ekranında
  dağınık duruyor. 🟢 İlk üçü mevcut veriyle hesaplanıyor.
- [x] **27 · "Yeni müşteri" tanımı** ✅ **ZATEN VARDI** — `rapor.ozet.yeniOyuncu`
  kişi bazlı hesaplıyordu; çıkarma yöntemi hiç kullanılmadı. 🟡
  ⚠️ Çıkarma ile hesaplanmayacak (`oynayan − kupon kullanan` DEĞİL).
  Kişi bazlı geçmiş gerekiyor: *"bu kişinin bu işletmeyle Looply üzerinden
  ilk doğrulanmış etkileşimi mi?"* POS olmadığı için "işletmeye ilk
  ziyareti" diyemeyiz; tanımı dürüst tutmalıyız.
- [x] **28 · "Bugün beklenen müşteri"** ✅ **BİTTİ** — Ü99, kural tabanlı
  Son 28 günün dönüş oranı × bugünün açık kuponu, aynı haftagünü iki kat
  ağırlıkta. **Aralık** olarak gösteriliyor. Veri yetmezse tahmin yok.
  🔴 Hava durumu ve özel gün girdileri hâlâ eksik (Dalga 5 · madde 21).
  ⚠️ Açık kupon sayısı beklenen müşteri DEĞİLDİR. Kural tabanlı tahmin:
  kalan süre · ödül türü · gün · saat · geçmiş kullanım. MVP'de makine
  öğrenmesi yok. Kesin sayı değil **aralık** gösterilmeli.
- [x] **29 · Upsell hunisi** ✅ **BİTTİ** — Ü100, 2026-09-08
  Kampanyaya "bu ziyarette kullanılsın" kipi eklendi. Teklif oyun sonunda
  çıkıyor, oyuncu **kabul ederse** kupon oluşuyor (bütçe ve ölçüm).
  Kupon ertelenmiyor, saatlerle sınırlı.
  Panelde huni: gösterildi → aldı → kasada kullandı + dönüşüm.
  ⚠️ Son basamak "kullanıldı", "satıldı" değil — POS yok.

<details><summary>Özgün istek</summary>

- **Upsell hunisi (cheesecake)** 🔴
  Teklif gösterildi → kupon alındı → kullanıldı → dönüşüm → ek satış.
  ⚠️ POS yok: "müşteri cheesecake aldı" diyemeyiz. Ölçebildiğimiz kupon
  kullanımı; ötesi işletmecinin manuel beyanı ve **ayrı güven seviyesinde**
  tutulmalı. Bugün sistemde "upsell kampanyası" diye bir kavram yok.
- [x] **30 · Son 7 gün / Bu ay tabloları** ✅ **BİTTİ** — Ü99
  Yedi satır: oynayan · sayılan ziyaret · oyun · verilen kupon ·
  kullanılan kupon · indirim · yeni müşteri · tekrar gelen.
- [x] **31 · Panel kabuğu** ✅ **BİTTİ** — Ü101, 2026-09-10
  Şube seçici · gün gezinme (‹ dün ›) · uyarı çanı · durum/öneri kartları.
  🔴 Yol boyunca bir hata bulundu: `yoneticiBul` `db.one` kullanıyordu,
  iki şubeli sahip **rastgele** bir şubeye düşerdi. Şema da global tekildi;
  tekillik `(cafe_id, phone_index)`'e taşındı (göç 0026).
  ⚠️ Başvurudaki telefon bloğu **kaldırılmadı** — çok şube kontrollü
  yoldan (personel listesine ekleme) açılıyor, self-servis başvurudan değil.
  ⚠️ Uyarılar saklanmıyor, türetiliyor; öneriler sayıya dayanmadan
  yazılmıyor.
- [ ] **32 · Manuel indirim girişi?** ⚠️ *karar gerekiyor*
  ChatGPT analizi POS yerine işletmecinin tutarı manuel girmesini öneriyor.
  **Bizde gerek yok**: ödül değeri katalogda tanımlı ve kupon onaylanınca
  `committed_kurus` kendiliğinden yazılıyor — daha güvenilir. Yalnızca
  yüzde kampanyasında gerçek indirim değişken; oraya manuel giriş gerekebilir.
</details>

## Pazarlama mimarisi (`looply cafeplay ilişkisi...`)

Çoğu **kod dışı** iş; buraya yalnızca yazılıma dokunanları alıyorum.

- [ ] **33 · Kaynak takibi (attribution)** 🟢
  İşletme kaydında `source · sector · campaign · creative · landing`
  saklanmalı. Zincir: landing → kayıt → aktivasyon → QR → ilk oyuncu →
  ilk kupon → kullanım. Amaç *"en ucuz kaydı getiren reklam"* değil,
  **"en fazla değer üreten işletmeyi getiren reklam"**.
- [ ] **34 · Aktivasyon takibi / CRM** 🟡
  Kayıt olup kampanya açmayan, QR üretmeyen kafeye hatırlatma.
  Panelde "kafenizi 5 dakikada yayına alın" yönlendirmesi.
- [ ] **35 · Landing page'ler** *(kod dışı, ayrı proje)*
  `looplybusiness.com/tekrar-musteri` · `/ikinci-siparis` · `/musteri-sadakati`
  · `/yeni-musteri` · `/kampanya` · `/ek-satis`. Her biri ayrı ölçülür.

---

# DALGA 6 · YENİ — butik işletmeler + vitrin (Ü117) ⬅️

> Ürün sahibinin 2026-09-14 kararı. **Kapsamı genişletiyor ve yayın
> takvimini uzatıyor** — `docs/25`'teki A/B/C/E listesinden ayrı, ek iş.

- [x] **38 · Yeni giriş ekranı (vitrin)** ✅ **BİTTİ** — Ü118 + Ü119 + **Ü120**, 2026-09-15
  Ana sayfa artık bir vitrin: yalnızca **işletmeye** sesleniyor, iki kapı
  (**Giriş yap** · **Kayıt ol**) yapışkan üst şeritte. Geliştirme
  kısayolları `/gelistirme` altına taşındı.
  **Slogan kahraman:** `Oyna. Kazan. Eğlen.`
  ⚠️ **Beş tur sürdü**, her turun dersi karar defterinde:
  çark kondu → çıkarıldı (müşterinin ekranı, işletmenin sayfası değil) ·
  mekanik anlatım kondu → çıkarıldı (ikna aşamasının işi değil) ·
  mor gradyan + ışınlar kondu → çıkarıldı (örnek sitelerin hepsinde
  **düz zemin** var) · çizilmiş sahte ekranlar kondu → **ürünün gerçek
  ekran görüntüleriyle** değiştirildi.
  🔴 **Vitrin paleti:** beyaz · fildişi · mavi tonları · altın.
  **Siyah yok** — koyu bölümler lacivert. Jetonlar `globals.css`te ve
  yalnızca vitrinde kullanılıyor.
  🔴 **Logo** kuruldu (`components/logo.tsx`): `oo` → sonsuzluk ilmeği +
  oyun kolu tuşları + hediye. SVG; koyu zemin için beyaz sürümü var,
  hediye 30 pikselin altında kendiliğinden kapanıyor.
  ⚠️ **Lenis eklenmedi.** Ink Games'in akıcı kaydırması ondan geliyor ama
  tarayıcının kaydırmasını devralıyor; kazancın büyük kısmı kaydırmaya
  bağlı dönüşümlerden geliyor ve onlar bağımlılıksız yazıldı.
  🔴 **Kaydırmalı sahne** (`vitrin-yaklasma.tsx`) — ürün sahibinin tarifi:
  *"yavaş yavaş zoom, sonra QR'ın içine girer gibi, ardından oyuncu
  menüsüne girecek ve orada havadan ödüller yağacak."*
  Beş ekranlık bölüm, beş evre: **kafe karesi yaklaşır → karekodun yakın
  karesine geçer → perde kapanır (içeri giriş) → oyuncu menüsü açılır →
  ödüller yağar.** Taşıyıcı teknik Tinker'ınkiyle aynı (uzun bölüm +
  `sticky top-0 h-screen` + ilerleme 0→1), bağımlılık yok.
  ⚠️ **Yağmur artık yaklaşma sırasında değil, oyuncu ekranına girdikten
  sonra** — sıra anlam taşıyor: ödül karekodun ötesinde.
  🔴 **Üç boyutlu ürün kartları** (`Egik`): görseller `perspective`
  altında eğik duruyor, kaydırdıkça doğruluyor **ve fareyi takip
  ediyor** — Ink Games'in tekniği.
  ⚠️ İlk yazılışta yalnızca kaydırmaya bağlıydı; ürün sahibi düzeltti:
  *"görseller mouse hover efektiyle oynak olmalı."* Haklı ayrım —
  kaydırmaya bağlı giriş bir **animasyon**, fareyle eğilme bir
  **etkileşim**; istenen ikincisiydi.
  ⚠️ Yumuşatma (lerp) şart: açı doğrudan imlece yazılsaydı kart farenin
  her sıçramasını taklit eder, sinirli dururdu.
  ⚠️ Dokunmatikte dinleyici hiç kurulmuyor (`hover: none`) — telefonda
  hover yok, kurulsaydı kart ilk dokunuşta eğik kalırdı.
  ⚠️ Her görsel **kendi** kutusunda: iki telefon tek kutudayken birinin
  üstüne gelince ikisi birden eğiliyor, "oynama" hissi kayboluyordu.
  ⚠️ Lacivert bölümdeki telefon çerçevesi zemine karışıyordu (çerçeve de
  gölge de lacivert); koyu zeminde bir ton açılıyor + ışık halkası.
  ⚠️ **Tinker'ın yaklaşan telefonu CSS değil, bir Rive animasyonu**
  (`<canvas data-component-name="rive">`). Kalite farkı kodda değil
  **varlıkta** — sayfa bir daha zayıf bulunursa cevap kod değil, varlık.
  🔴 **Altı ekran görüntüsü gerçek** (`public/vitrin/`): işletme raporu ·
  çark · Yılan · oyuncu paneli · ödüller · kazanma anı. Playwright ile
  çalışan uygulamadan çekildi, geliştirme şeridi gizlenerek.
  ⚠️ **Sayılar da gerçek:** boş veritabanında çekilen ilk kare baştan
  sona sıfır gösteriyordu ve vitrinin tam tersini söylüyordu.
  `npm run db:simule` ile on dört günlük trafik ürünün kendi akışından
  geçirildi (bütçe rezervi, günlük tavan, kasada onay) — rapordaki
  tutarlar ürünün gerçekten üretebileceği tutarlar.
  ⚠️ **Dar ekran ayrı ele alındı:** kenar yazıları önce yalnızca `lg`
  üstünde vardı, telefondan giren ziyaretçi dört ekran boyunca tek
  kelime okumadan kaydırıyordu. Artık telefonun üstünde, fildişi
  zeminli (yağan kuponlar tam oradan geçiyor) ve teker teker.
  🔴 **Kafe fotoğrafları geldi** — `kafe-genis.jpg` (masadaki karekod
  görünen geniş kare) ve `kafe-karekod.jpg` (karekodun yakın çekimi).
  `vitrinKaresi()` dosyayı sistemden sorguluyor; yoksa sahne çizime
  düşüyor, yani dosya silinse de sayfa ayakta kalır.
  ⚠️ **1024 pikseldi, 2400'e çıkarıldı** (`sharp`, lanczos3 + hafif
  keskinleştirme): kare ekranı kaplıyor ve üstüne ~3 kat yakınlaşılıyor,
  1024 piksel sonda dağılıyordu. **Bu gerçek detay eklemez** — kareler
  daha büyük üretilebilirse sonuç belirgin biçimde daha iyi olur.
  ⚠️ Odak noktaları `ODAK_GENIS` / `ODAK_YAKIN` sabitlerinde, elimizdeki
  iki kareden ölçüldü — fotoğraf değişirse birlikte ayarlanmalı, yoksa
  kadraj karekodu ıskalıyor.
  ⚠️ **İki kare arası geçiş odak kaymasıyla:** uzun çapraz geçişte iki
  farklı kadraj üst üste binip çift pozlama gibi duruyordu. Pencere
  kısaldı, çıkan kare bulanıklaşarak gidiyor, giren kare netleşerek
  geliyor — "kamera odağı karekoda kaydı" gibi okunuyor.

- [x] **38b · 🔴 Başvuru sayfası yanlış şart vaat ediyordu** ✅ **BİTTİ** — Ü118
  Sayfa *"Haftada en az 1.500 TL"* diyordu; göç 0020 (Ü45) dönemi güne
  çevirmiş ve tabanı da güne bağlamıştı — **yedi kat fark.** İşletme
  başvururken haftada 1.500 TL'ye söz veriyor, paneli açınca günde
  1.500 TL'nin altına inemediğini görüyordu. Tam da ikna anında.
  Sayı artık `domain/butce.ts`'ten okunuyor; bir daha ayrışamaz.

- [x] **38c · 🔴 Kısayollar kod defterini öldürüyordu** ✅ **BİTTİ** — Ü118
  Kısayollar `/gelistirme`ye taşınırken sorgu sayfa gövdesine kondu ve
  sayfa veritabanına bağımlı hâle geldi. Veritabanı kapalıyken **defter
  de dahil sayfanın tamamı** boş geliyordu — yani "kod nereye gitti"
  sorusunun tek cevap yeri, tam da bir şeyler ters gittiğinde ölüyordu.
  Sorgu artık hata yutuyor: kaybedilen bir kolaylık, korunan teşhis aracı.
  (Elektrik kesintisinden sonra veritabanı gelmeyince ortaya çıktı.)

- [x] **38d · 🔴 Kırılgan test: gerçek trafik varken kırmızı yanıyordu** ✅ **BİTTİ** — Ü120
  `rapor.test.ts` → *"beş kişiden az içeren masa gizlenir"*. Test tohumdan
  bir masa **ödünç alıyor** ve "bu hafta bu masada yalnızca benim üç
  oyuncum var" varsayıyordu. Vitrin görselleri için `npm run db:simule`
  koşturulunca masa eşiğin üstüne çıktı: **ürün doğru çalışırken test
  düştü.** ⚠️ Testin kendi yorumu bir alt satırda zaten *"belirli bir
  satırı sınamak kırılgan"* diyordu — bilinen bir kırılganlıktı.
  Test artık **kendi masasını açıyor** ve sonunda siliyor. Gerçek bir
  kafenin masasında her zaman başka trafik olur; yalıtım testin işi.

- [ ] **39 · İşletme tipi: kafe | butik** — M
  Kiracıya tip kolonu, panelin tipe göre farklılaşması, terminoloji
  ("masa" butikte ne demek), tohum verisinde bir butik örneği.

- [ ] **40 · Butik akışı: oyun yok, doğrudan çark** — M
  🔴 **D1'i etkiliyor.** Kafede ödül kısmen beceriye bağlı (kupon eşiği
  500 puan); butikte beceri payı **tamamen kalkıyor**, ödül saf tesadüfe
  bağlanıyor. Şans mevzuatı görüşü **iki ayrı model** için sorulmalı.
  ⚠️ Çarkın misafir akışı (`cark.misafirCevir`) zaten var — temel duruyor.

- [ ] **41 · 🔴 İşletme müşterinin adını ve telefonunu görecek** — L
  **G1 kalkıyor.** Bugün işletmenin gördüğü tek kimlik kafe bazında
  farklı bir anonim kod; bundan sonra ad ve telefon da görünecek.
  ⚠️ **Aydınlatma metni ilk gerçek kullanıcıdan ÖNCE yeniden yazılmalı** —
  bugünkü metin "işletme göremez" diyor. Henüz gerçek kullanıcı yok, yani
  şimdi yapmak bedava.
  ⚠️ İşletme ayrı bir **veri sorumlusu** oluyor: sözleşme eki, kendi
  hukuki sebebi. `docs/08` §9.4 genişleyecek.
  ⚠️ `player_aliases` silinmiyor — kaldırmak geçmiş defter satırlarını
  bozar; anlamı değişiyor.

- [ ] **42 · Sipariş tutarı kasada girilecek** — M
  Kazanılan ödül girilen tutarla ilişkilenecek.
  ⚠️ Madde 32 bunu bir kez reddetmişti (*"ödül değeri katalogda tanımlı"*)
  ve o gerekçe **ödül tarafı için hâlâ geçerli**; yeniden açılan şey
  **ölçüm** tarafı.
  ⚠️ Tutar kasiyerin **beyanı**, ölçüm değil — raporda ayrı güven
  seviyesinde gösterilmeli (Ü100'ün "kullanıldı, satıldı değil" ayrımı).

---

# PANEL TURU · ✅ TAMAMLANDI — 2026-09-15

> Ürün sahibinin ara istekleri. Dalga 6'ya ait değil; panelin günlük
> kullanımdaki pürüzleri. Ayrıntısı karar defterinde **Ü123** ve **Ü124**.

- [x] **P1 · Geliştirme şeridi kaldırıldı** ✅ Ü123
  Köşedeki "Başlangıç · Kodlar · Çıkış". Kod zaten giriş formunun içinde,
  defter `/gelistirme`de, çıkış her panelde kendi yerinde.
- [x] **P2 · Çark kendi sayfasında** ✅ Ü123 — `/kafe/panel/cark`
  Ödüller sayfası **üç ayrı soruyu** aynı anda soruyordu: hangi ödüller
  var, ne zaman açılıyorlar, çarkta hangi sıklıkla çıkıyorlar.
- [x] **P3 · "Bugün" takvim oldu** ✅ Ü123
  Yerleşik `<input type="date">`, saydam biçimde düğmenin üstünde.
  Kütüphane yok: klavye, ekran okuyucu ve telefon seçicisi bedava geliyor.
- [x] **P4 · Doğrulama defteri sayfalandı** ✅ Ü123 — 10'ar kayıt
  200 kayıtta liste bitmiyordu. Yan kazanç: altındaki "Dışa aktar"
  bölümü artık bulunabiliyor. Sayfa numarası adreste (`?s=3`).
- [x] **P5 · Çark ödülleri günlük bütçeye dahil** ✅ Ü123
  Zaten doğruydu — kupon üreten tek bir yol var (`kuponUret`) ve bütçe
  rezervasyonu orada. **İki testle çivilendi**: biri yarın çark için
  ikinci bir INSERT yolu açarsa kırmızı yanar.
- [x] **P6 · Konum menüden çıktı** ✅ Ü123
  ⚠️ **Sayfa duruyor ve durmalı** — kafenin koordinatını yazan tek yer
  orası; koordinat yoksa o kafede **hiç kimse hiçbir şey kazanamıyor**.
  Panelin ana ekranı eksikse zaten uyarıyor ve kurulum listesinde satırı
  var.
- [x] **P7 · Katalog + kampanyalar + ürünler yeniden tasarlandı** ✅ Ü123 + Ü124
  🔴 **İki tur sürdü.** İlk turda renk ve düğme stiline dokunuldu, oysa
  sorun **düzendeydi**: 16 satırlık, her satırında üç eylem olan bir liste
  550 piksellik sütuna sıkışıyordu. İki kolon kaldırıldı, ayarlar üstte
  tek sıraya alındı, liste tam genişlikte **sütunlu tabloya** geçti.
  ⚠️ Yol boyunca: `lg:grid-cols-[minmax(0,1fr)_...]` sınıfı Tailwind
  tarafından üretilmiyordu (virgül) — tablo sessizce tek sütuna çöküyordu.
- [x] **P8 · Logo düzeltildi** ✅ Ü123
  Halkaların merkezleri 28 birim ayrık ama yarıçapları 19'du: birbirinin
  içine gömülüyorlardı. Tam teğet + `items-baseline`. Panelde de gerçek
  işaret var ve **ana panele dönüyor**.
- [x] **P9 · Çarkta ağırlık → yüzde** ✅ Ü124
  Kafe artık doğrudan yüzde yazıyor; kalan pay diğerlerinin oranı
  korunarak bölüşülüyor, **toplam her zaman 100**. Sıfır = çarkta çıkmaz.
  ⚠️ Bu D1'in (şans mevzuatı) kapsamını genişletiyor — bkz. `docs/25`.

---

# DALGA 4 · Ondan sonra — yeni yüzeyler

- [ ] **14 · Kafe keşif ekranı (yakındaki kafeler) + kafe vs kafe**
- [ ] **15 · Analitik / event pipeline**
  D1/D7/D30 retention buna bağlı.
- [ ] **16 · Öngörü paneli** (Ü80)
  Üç katman: geçmişi göster · kural tahmini · model.
  ⚠️ **Motor dürüst bozulmalı**: yeterli geçmiş yoksa sayı uydurmaz,
  "henüz yeterli veri yok" der.
- [ ] **17 · Platform dashboard**
- [ ] **18 · Kafeye özel tema** (Pizza Blocks / Burger Blocks)

---

# DALGA 5 · Demo için "varmış gibi" (Ü81)

Sahte **sağlayıcı** ve tohumlanmış **geçmiş** ile. Ekran taklidi yok —
gerçek kod, sahte veri. Canlıya geçerken atılacak kod olmayacak.

- [ ] **19 · Sahte sağlayıcı altyapısı**
  `SMS_PROVIDER=console` örüntüsü hava, ödeme ve reklam için tekrarlanıyor.
  🔴 **Sert kural:** `env.ts` canlı ortamda sahte sağlayıcıyı **reddeder** —
  uygulama başlamaz. Beyanla değil, başlatma hatasıyla.

- [ ] **20 · `npm run db:demo` tohumu**
  12 haftalık makul trafik + sahte reklamveren + kafe abonelikleri + hava
  geçmişi. 🔴 Canlı veritabanında çalışmayı reddeder.

- [ ] **21 · Hava durumu tetikleyicisi**
  Gerçek: kural motoru, havuz açma, panel, takvim (bayram/tatil statik liste).
  Sahte: panelden "bugün yağmurlu" seçimi.

- [ ] **22 · Abonelik ve finans**
  Gerçek: paketler (Starter/Pro/Business), abonelik durumu, süre takibi, panel.
  Sahte: "ödendi" adımı.

- [ ] **23 · Reklam sistemi + reklamveren rolü**
  Gerçek: 4. rol, 4. panel, kiracı izolasyonu, hedefleme, gösterim sayacı,
  oyun sonu reklam yüzeyi. Sahte: reklamveren ve kampanyalar tohumdan.
  ⚠️ Tek başına bir faz büyüklüğünde.

---

# 🔵 Kodla kapanmayan — bugün başlatılmalı

Bunlar yazılım işi değil; bekleme süreleri haftalarla ölçülüyor.

- [ ] **S7 · Şans mevzuatı görüşü** ⚠️ **EN RİSKLİ**
  Demoyu bloke etmiyor, **canlıyı bloke ediyor.** Şans artık çarkın köşesinde
  değil, ödül motorunun merkezinde (Ü77).
- [ ] **S20 · Aydınlatma metni hukuk incelemesi** — 1–2 hafta, pilotu bloke eder
  🟢 **Hazırlık bitti (Ü111):** `docs/24-veri-envanteri.md` — checklist koddan
  dolduruldu, avukata bu belge gidecek.
  ✅ **Karar verilenler:** barındırma **Türkiye** (md. 9 hiç devreye
  girmiyor) · kapsam **yalnızca Türkiye** (GDPR bölümü açılmıyor) ·
  yaş sınırı **18+** (zaten vardı, testi yazıldı).
  ✅ **Girildi:** veri sorumlusu **LOOPLY** · alan adı
  **looplybusiness.com** · başvuru adresi `kvkk@looplybusiness.com`.
  ⏳ **Kalan `[DOLDUR]`lar:** tüzel kişi **tam unvanı** (A.Ş./Ltd./şahıs) ·
  vergi dairesi + no · kayıtlı adres · MERSİS · KEP · ihlalde sorumlu
  kişi · VERBİS · barındırma sağlayıcısı · SMS sağlayıcısı seçimi.
  ⚠️ `kvkk@looplybusiness.com` kutusu **gerçekten açılmalı** — metinde
  30 gün taahhüdü verilen adres, kimse bakmıyorsa taahhüt baştan ihlal.
- [x] **S21 · Yaş sınırı** ✅ **ZATEN VARDI** — Ü2, testi Ü111'de yazıldı
  İlk bulgum yanlıştı: 18+ sınırı `lib/validate.ts` içinde ve kayıt
  şemasına bağlı. Gerçek eksik **testi olmamasıydı** — testsiz bir
  doğrulama sessizce gevşetilebilir ve gevşediği an ürün veli onayı
  rejiminin içine düşer. Beş test eklendi.
  ⚠️ Bilinen sınır: kontrol **yıl bazlı**, gün hassasiyeti yok. Tam tarih
  istemek daha fazla kişisel veri toplamak olurdu — bilinçli tercih.
- [ ] **36 · `/verilerim`e ad-soyad düzeltme** — Ü111'de bulundu
  Aydınlatma metni "düzeltme hakkını Verilerim'den kullanabilirsin"
  diyordu ama ekran yok, alan yalnızca gösteriliyor. Metin şimdilik
  gerçeğe uyduruldu (düzeltme e-posta ile, 30 gün). **Doğru çözüm metni
  değil ürünü düzeltmek.**
- [ ] **37 · `sms_outbox` saklama süresi** — Ü111'de bulundu
  Temizlik işi yok, gönderim kaydı süresiz birikiyor. Numara açık
  değil (maskeli + kör indeks) ama süre kararı gerekiyor.
  Öneri: **12 ay** (gönderim ispatı + itiraz penceresi), sonra silinsin.
- [ ] **SMS gönderici başlığı** — yeni isimle, operatör onayı birkaç iş günü
- [ ] **S17 · Kalan 7 oyunun listesi** → `18-oyun-adaylari.md`
- [ ] **S6 / H2** · Ad-soyad-telefon için hukuki sebep
- [ ] **Boost fiyatlandırması** — erişim seviyelerinin satılabilir hâli

---

# 🔒 Hâlâ açık iki tasarım kararı

- [ ] **Kafe Bakiyesi** — üçüncü ödül tipi (Ü18 v1'den çıkarmıştı)
  Kısmi kullanım gerekiyor ("125 TL bakiye, 200 TL hesap → 75 TL kalan");
  bugünkü kupon modelinde yok. ⚠️ Nakit çekim eklenirse KYC/AML doğuyor.
- [ ] **Çapraz kafe XP** — "A'da kazan, B'de kullan" (Ü15 + G12)
  Anonim oyuncu kodu kafe bazında farklı; kafeler aynı oyuncuyu eşleştiremiyor.
  Çözüm: platform seviyesinde ayrı XP havuzu.

---

# 🚀 Canlıya çıkış kontrol listesi

- [ ] `APP_ENV=staging` ile sunucuya çıkış (SMS beklemeden bugün mümkün)
- [ ] Kafe konumu panelden **bir kez** basılmalı — yoksa K2 düşer, kimse kazanamaz
- [ ] `npm run keys:generate` — 6 ayrı anahtar, `BACKUP_ENC_KEY` ayrı yerde
- [ ] Production Postgres + kısıtlı `cafeplay_app` rolü (RLS buna dayanıyor)
- [ ] Ters vekil + TLS (alan adı hazır)
- [ ] **G32 · Platform girişinde TOTP** — Faz 3'ten devreden açık madde
- [ ] Gerçek SMS sağlayıcısı (`production` sahte sağlayıcıyla açılmıyor)
- [ ] Yedekten geri dönüş tatbikatı
- [ ] Bağımsız güvenlik incelemesi / sızma testi

---

# ✅ Bitmiş olanlar — kayıt için

Çekirdek döngünün tamamı (16/16): masa QR'ı · kafe sayfası · konum
doğrulaması · 3 oyun · sunucu skor doğrulaması · ödül · 24 saat bekleme ·
kupon · atomik tek kullanım · 60 sn geri alma · süre dolumu iadesi · SMS
hatırlatma · append-only defter.

Kimlik: telefon + SMS OTP · parola · beni hatırla · önce oyna sonra kaydol.

Davet sistemi: 10 durumlu makine · nitelikli davetin 7 şartı · fraud motoru.

Kafe paneli: bütçe · ürün · kategori · ödül · kampanya (oluşturma) ·
Happy Hour · masa karekodları · personel · konum · raporlar.

Oyuncu: ödüller · kuponlar · profil · seviye · XP · rozet · günlük seri ·
çark · Masayı Fethet · kafe bazlı liderlik · fırsatlar.

Platform: kafe başvuru onayı · acil durdurma.
