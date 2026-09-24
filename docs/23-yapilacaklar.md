# 23 — YAPILACAKLAR

> **Aradığın dosya bu.** Tek liste, sırayla, kutucuklu.
> Bir iş bitince kutusu işaretlenir ve karar defterine (`02`) girer.
>
> Yan dosyalar: neyin **var** olduğu → `21-looply-kapsam-haritasi.md` ·
> demoda neyin **yapılabildiği** → `22-demo-yapilabilirlik.md`

**Son güncelleme:** 2026-09-24 · **Kararlar:** Ü76 – Ü159, **Ü186 – Ü242**, **Ü259 – Ü274**

> ⚠️ **BU LİSTEDE İKİ BOŞLUK VAR.**
>
> **Ü243 – Ü258 yazılmadı.** O turlar commitlendi (2026-09-23) ama
> buraya dökülmedi; commit mesajlarında ve kod yorumlarında duruyorlar: Blok Kırıcı, oyun başına `gunlukHedef`,
> karekodun Loopy'si ve adlı kodlar, kafe değiştirince oturum hatası,
> giden kutusu saklama süresi, sessizce çalışmayan `qr_temizlik`, hata
> sınırları, `/firsatlar`ın kupon tasarımına taşınması, karusel
> taşması. Dökülmeleri ayrı bir iş.
>
> **Ü160 – Ü185 yazılmadı.**
> O turlar commit mesajlarında ve kod yorumlarında duruyor (oyun
> sahneleri, koyu kartlar, koşan Loopy, seri sahnesi, yuva). Buraya
> dökülmediler. Dökülmeleri ayrı bir iş ve karar sizin.

---

## 🔔 UNUTULMAYACAKLAR — ürün sahibinin 2026-09-23 hatırlatması

> *"iyzico linki, Resend API gerekecek, karekod linklerini de
> değiştireceğiz — onları da unutma."*

| # | Ne | Durum | Neyi bekliyor |
|---|---|---|---|
| **U1** | **iyzico ödeme linki** `https://iyzi.link/AKvxUA` | ⬜ Üründe **hiçbir yerde yok** — yalnızca `docs/27`de not | Yer kararı. Öneri: kafe panelinde "Abonelik ödemesi" kartı (kafe aylık aboneliği Ü41'de kararlaştırıldı) |
| **U2** | **Resend API anahtarı** | ⬜ Canlı ortam e-posta sağlayıcısız **açılmıyor** (`env.ts`); doğrulama kodları e-postayla gidiyor | Hesap + anahtar (ürün sahibinde) · 🔴 D3: Resend ABD'de → KVKK md. 9 mekanizması + DPA + VERBİS |
| **U3** | **Karekod linkleri** | 🟡 Ü270: `KAREKOD_TABAN_ADRESI` ayarı geldi — **canlıda doldurulmalı**. Önce basılı karekodun alan adı **isteğin `Host` başlığından** türüyordu (`kafe/panel/karekod/page.tsx:33`). Paneli `192.168.1.x`'ten açıp yazdıran, LAN adresi taşıyan karekod basar | Toptan baskıdan **önce** taban adres sabit bir ayara (`KAREKOD_TABAN_ADRESI`) taşınmalı; geliştirmede istek adresine düşebilir ki LAN testi çalışsın. O zaman "linkleri değiştirmek" tek satır ayar olur |

⚠️ U3 test sırasında **bilerek** değiştirilmedi: yerel testte telefonla
okutulan karekodun LAN sunucusuna gitmesi tam da bu davranış sayesinde
çalışıyor.

## ⬅️ Ü274 · Telefon testinden on iki madde — 2026-09-24

✅ Commitlendi (2026-09-24).

Ürün sahibi ilk kez telefondan uçtan uca oynadı ve on iki şey bildirdi.
Sıra onun onayıyla: A (test engelleri) → B (ekran düzeni) → C (hız).

**A · Test engelleri**
1. 🔴 **Ödül gelmedi — ne çarktan ne oyundan.** Sebep: Kafe A 09–23
   açık, oyun 01:52–01:56'da oynandı; kapalıyken hiçbir ödül çıkmıyor
   (Ü90). Kural doğruydu, **ekran susuyordu**: çark "hazır" deyip
   kazandırmış gibi gösterdi, oyun ödüllü bloğu kırdırıp sessiz kaldı.
   Artık `butce.kafeAcikMi` tek kaynak; çark `sebep: "kapali"` dönüyor
   ("Kafe şu an kapalı — ödüller 09:00'da açılıyor"), misafire kapalı
   kafede çark gösterilmiyor ve çevirmesi sunucuda da reddediliyor, oyun
   sonu `odulYok` ile sebebi yazıyor. Çarka `an` dikişi eklendi — kural
   duvar saatine bakıyor ve çark testleri gece düşüyordu (ölçüldü). 3
   test; **A/B:** kontrol çıkarılınca "kapalı kafede çark açık göründü".
   Test için Kafe A'nın açılışı 00:00 yapıldı (ürün sahibinin onayıyla).
2. **"Kafeden 6494 m uzaktasın".** Konum bilgisayardan kaydedilmişti;
   masaüstü tarayıcı konumu Wi-Fi/IP'den tahmin ediyor. Konum ekranı
   artık `coords.accuracy`ye bakıyor: ±100 m'den kötü okuma
   kendiliğinden kaydedilmiyor, "telefondan kaydet" diyor ("yine de
   kaydet" duruyor).
3. **Ödüllü blok her atışta yeniden düşüyordu.** Anahtar hücreden
   türüyordu ve her atıştan sonra satırlar iniyor → eleman yeniden
   kuruluyor → düşme animasyonu baştan. Önceki not tersini iddia
   ediyordu ("bir kez koşuyor"). Artık yalnızca doğduğu satırda (s = 0).
4. **Oynarken sayfa kayıyor/yenileniyordu.** `touch-action: none`
   yalnızca tahtadaydı. Tur boyunca sayfa sabitleniyor (`position:
   fixed` + belgede `touchmove` iptali), tur bitince eski yerine dönüyor.
5. **Çarkta Loopy'nin arkası siyah (iPhone).** Safari VP9 alfayı
   çizmiyor — Ü197'nin notu bu riski yazmıştı. WebKit'te video yerine
   saydam **animasyonlu WebP** (52 kare, 4.583 ms, bir kez, 868 KB; bir
   kare mor zeminde kontrol edildi); her dönüşte yeni `blob:` adresi
   (ilk kareden başlasın diye). Ötekilerde video aynen.

**B · Ekran düzeni**
6. Üst kafe şeridi (`py-3`→`py-1.5`, 11 px, küçük avatar/düğmeler) ve
   alt menü (`py-3`→`py-1.5`, 10 px etiket, ev çizgisi payı) inceldi.
7. `/oyunlar` başlığı `kompakt` (sahne 190→112, `py-6`→`py-3`).
8. Geri bağlantısı: Çark, Davet, Loopy, Ödüllerim, Profil (ortak
   `GeriBaglanti`; sekme köklerinde olmaması kuralı ürün sahibinin
   isteğiyle bırakıldı).
9. Seviye atlama **tam ekran sahneyle** geliyor (seri sahnesinin dili:
   kıvılcım, rozet patlaması, koşan Loopy); kart kapanınca kaydı olarak
   sonuçlarda kalıyor.
10. **Tam ekran:** Safari'nin çubuğunu sayfa kapatamaz; tek yol "Ana
   Ekrana Ekle". `app/manifest.ts` (`standalone`, `/oyna` ile açılır) +
   iOS meta etiketleri + simgeler (mevcut `loopy-mutlu-512`den kırpıldı,
   üretilmedi).

**C · Hız**
11. Yavaşlığın sebebi geliştirme sunucusu: karekodla açılan ilk sayfada
   **4.835 KB** JavaScript (derlenmiş sürümde **741 KB**) ve her sayfa ilk
   açılışta derleniyor. `npm run telefon` derlenmiş sürümü HTTPS ile
   **3001**'de açıyor (`scripts/telefon-sunucu.mjs` — `next start`ın
   HTTPS seçeneği yok); geliştirme sunucusu 3000'de kalıyor.

**Doğrulama:** 777 test · 770 geçti · 0 düştü · 7 atlandı · tsc ·
eslint · `next build`. Derlenmiş sunucu: sayfalar 200, karekod zinciri
3001'de de `/hemen?cark=1`e gidiyor, manifest ve simge sunuluyor.
Uygulama içi tarayıcı kendi imzalı sertifikayı kabul etmediği için
ekranlar telefonda görülecek.

---

## ⬅️ Ü273 · Karekod telefonda 0.0.0.0'a yönleniyordu — göreli yönlendirme — 2026-09-24

✅ Commitlendi (2026-09-24).

Ürün sahibi Safari'de karekodu okuttu: adres `192.168.1.175` ile açıldı,
sonra `0.0.0.0`a yönlendi ve sayfa açılmadı. Ü270'in adres düzeltmesi
karekodun **içindeki** adresi düzeltmişti; bu, sunucunun **döndüğü**
adresti.

Sebep: `/m`, `/h` ve `/r` yönlendirmeyi `new URL(yol, istek.url)` ile
kuruyordu (Next belgesinin önerdiği biçim). Geliştirme sunucusu telefondan
ulaşılsın diye `-H 0.0.0.0` ile açılıyor ve `istek.url` o adresi
taşıyor — kullanıcının geldiği adresi değil.

Düzeltme `lib/yonlendir.ts · goreliYonlendir`: `Location: /hemen?cark=1`.
Tarayıcı göreli adresi geldiği adrese göre çözüyor; sunucunun kendi adını
bilmesi gerekmiyor — geliştirmede de vekil sunucu arkasında da aynı.
Yalnızca `/` ile başlayan site içi yol kabul ediliyor (`//evil.com` ve
`/\evil.com` açık yönlendirme olmasın diye reddediliyor).

Etkilenen üç uç: karekod (`/m`), butik çark hakkı (`/h`), davet (`/r`).

**Doğrulama:** test, isteği tam olarak `https://0.0.0.0:3000/m/<kod>`
diye kuruyor ve dönen yerin `/hemen?cark=1` olduğunu, masa biletinin
verildiğini sınıyor. **Canlı sunucu:**
`https://192.168.1.175:3000/m/kafe-a-y85kuahv` → 1 yönlendirme →
`https://192.168.1.175:3000/hemen?cark=1` · 200 · sayfada "Kafe A".
774 test · 767 geçti · 0 düştü · 7 atlandı · `next build`.

---

## ⬅️ Ü272 · Karekod kullanımı "yeni" ve "eski" — taşınan kod korunuyor · kayıtlardaki kimlik bozulması — 2026-09-24

✅ Commitlendi (2026-09-24).

**1 · Yeni / eski kullanım.** Ürün sahibi, taşınan kodun sayacı
sıfırlanınca: *"taşınınca eski ve yeni olarak ayrı ayrı tutulsun
kullanım kısmında."* Göç 0050: `print_code_history` kodun geçmiş
duraklarını tutuyor (masa, kafe, başlangıç, bitiş; yalnızca ekleme).
Kullanım tek bir veritabanı fonksiyonunda — `basili_kod_kullanimi`:
**yeni** = şu anki masada, oraya geldiği andan beri · **eski** = geçmiş
duraklarda, o aralıklarda. Liste, hedef seçici ve taşıma koruması aynı
fonksiyonu çağırıyor (Ü267'de üç ayrı hesap ayrışmıştı).

🔴 **Koruma bunun sonucu:** "kullanımda" artık yeni + eski. Taşınmış bir
kod "hiç okutulmadı" görünüp üstüne gelen ikinci kodla sessizce
silinemiyor. Test 2b/3: eski okutmalar görünüyor, üstüne taşıma
reddediliyor; 3b: gerçekten kullanılmamış kodun yerine geçme çalışıyor.
**A/B:** koruma yalnızca "yeni"ye indirilince test *"taşınmış kod
kullanılmamış sanılıyor"*da düştü.

Geçmiş taşımalar denetim izinden dolduruldu — kafe kimliği değil **masa
kimliği** üzerinden (kafe kimlikleri aşağıdaki hata yüzünden bozuk
olabiliyordu). ⚠️ Kafe A kodunun Boş Test Kafe durağı (01:26–01:35)
girmedi: o masa, ürün sahibinin istediği "boş kafe" için geçmiş
kurulmadan önce silinmişti. Bu yüzden ekranda geliş saati 01:26
görünüyor; aralıkta hiç oturum olmadığı için sayılar değişmiyor.

**2 · Kayıtlardaki kimlik bozulması.** `lib/log.ts`in telefon deseni
sınırsızdı: kimliklerin **ortasındaki** "5 ile başlayan on hane"yi numara
sanıyordu. `cafe_0mt68s475925084831c7311e9` denetim izine
`cafe_0mt68s47[telefon]c7311e9` olarak geçti. 2026-09-17'den beri 9 satır
(7 çark hakkı, 2 karekod taşıma) — geri getirilemiyor. Desen artık harf
ya da rakamla bitişik diziyi numara saymıyor; serbest metindeki numara
hâlâ maskeleniyor (test: dört kimlik bozulmuyor, ayrı yazılmış numara
maskeleniyor).

**Yol boyunca:** yönlendirme testinin "elle taşınmış kod" koruması
`db.one`ın satır yokken `undefined` döndüğünü hesaba katmıyordu —
koruma koşulsuz düşüyordu; yalnızca kod gerçekten test kafesindeyken
koşulduğu için görülmemişti. Düzeltildi.

**Doğrulama:** 771 test · 764 geçti · **0 düştü** · 7 atlandı · tsc ·
eslint · `next build`. Tam koşudan sonra kafe sayısı 12 — testler iz
bırakmıyor.

---

## ⬅️ Ü271 · 4.556 deneme kafesi silindi — testler artık iz bırakmıyor — 2026-09-24

✅ Commitlendi (2026-09-24).

Ürün sahibi 1.2b'de Kafe A'yı hedef listesinde bulamadı: liste **4.561
seçenekti** ve Kafe A **2.353.** sıradaydı. Sebep: `cark`, `challenge`,
`liderlik` testleri her koşuda yeni **onaylı** kafeler açıp hiç
silmiyordu. Ürün sahibinin onayıyla (*"sil"*) silindi.

**Nasıl:** hiçbir yabancı anahtar `CASCADE` değil (30 tablo) — silme
sırası kısıtlardan çıkarıldı ve tek işlemde yapıldı
(`tests/_yardim.ts · testKafeleriniSil`). Seçim ad listesi **ve**
testlerin slug kalıbı (`ad-<id son 6>`) birlikte tutarsa. Önce **prova**
(sil, say, geri al), sonra gerçek. Silinen: 4.556 kafe · 4.725 ödül ·
3.273 oyun turu · 1.556 XP · 1.496 puan · 1.358 bütçe defteri satırı ·
1.268 kupon olayı · 779 kupon · 443 denetim satırı · 222 personel.
Kalan 12 kafe: onaylı 6'sı (Kafe A, Kafe B, Kahve Durağı, Moda Butik,
Boş Test Kafe, Yonlendirme Test Hedefi) ve ürün sahibinin elle açtığı 6
başvuru — onlara dokunulmadı.

**Kalıcı düzeltme:** üç test dosyası açtığı kafeyi listeye yazıyor ve
`after`da siliyor. Ölçüldü: üç dosya koşmadan önce 12 kafe, sonra 12.

⚠️ Aynı testlerin açtığı **oyuncular** duruyor (kafeye bağlı değiller,
bu listeyi etkilemiyorlar). Platformun "Oyuncular" ekranını kalabalık
ediyorlarsa ayrı iş.

---

## ⬅️ Ü270 · Telefonda kayıt ve giriş: dört düzeltme — 2026-09-24

✅ Commitlendi (2026-09-24).

Ürün sahibi telefondan test ederken dört şey bildirdi:

**1 · Karekod "sunucuya bağlanılamadı" (Safari ve Chrome).** Karekodun
adresi paneli açan isteğin `Host`undan türüyordu; panel bilgisayarda
`localhost` ile açılınca karekod `https://localhost:3000/m/…` taşıdı —
telefonda "localhost" telefonun kendisi. Artık `lib/karekod-adresi.ts`:
`KAREKOD_TABAN_ADRESI` varsa o (canlı — **U3 bununla kapanıyor**, toptan
baskıdan önce doldurulmalı), yoksa istek adresi; yerel ad ise
geliştirmede bilgisayarın ağ adresi (`192.168.` önce — `172.31.x` sanal
bağdaştırıcı). Karekod sayfası ve yazdırma sayfası aynı kuralı kullanıyor.
6 test.

**2 · 🔴 "E-posta adresi eksik" — kodu doğru girse bile.** Kayıt
kodunun adımı (adım 2) adım 1'in alanlarını gizli girdi olarak taşıyor
ve sunucuda yeniden doğruluyor. Ü168'de e-posta zorunlu oldu ama gizli
girdilere **eklenmedi**: telefondan kayıt olmak imkânsızdı. Alanlar artık
tek listede (`giris/alanlar.ts`); gizli girdiler oradan üretiliyor ve şema
`satisfies Record<KayitAlani, …>` ile listeye bağlı. **A/B:** şemaya
listede olmayan bir alan eklenince derleme düştü.

**3 · Google / Apple düğmeleri kalktı.** Ürün sahibi: *"Google ve Apple
hesaplarını kaldıralım, e-postayı kendileri girsinler."* Düğmeler zaten
sağlayıcıya bağlı değildi, kayıt sekmesini açıyordu (Ü36).

**4 · Parolamı unuttum — kendi akışı.** Önce "Hesap aç" formunu
açıyordu: kayıtlı numarada parolayı yeniden yazıyordu ama ad, soyad,
doğum yılı ve onayı baştan istiyordu. Şimdi: **telefon → hesabın kayıtlı
e-postasına kod → kod + yeni parola → içeri**. Ayrıntı ve güvenlik
kararları `domain/parola-sifirlama.ts`: kod formdaki adrese değil
hesabın adresine gidiyor · kural dışı parola kodu yakmıyor · **parola
değişince bütün eski oturumlar kapanıyor** · kayıtlı olmayan numara
söyleniyor (kayıt akışı aynı bilgiyi zaten veriyor, Ü168). 6 test;
**A/B:** oturum kapatma çıkarılınca "eski oturum kapatılmadı"da düştü.

**Beni hatırla — değişmedi, bilerek.** Soruldu: varsayılan açık mı
gelsin? Ürün sahibi: **kapalı kalsın.** İşaretli 90 gün, işaretsiz 12
saat (Ü36). "Her seferinde giriş istiyor" şikâyetinin bir kısmı testte
**gizli sekme** kullanılmasındandı — orada oturum sekmeyle ölüyor.

⚠️ Kodun gerçekten e-postaya gitmesi hâlâ **Resend anahtarını** bekliyor
(U2). Geliştirmede kod ekranda görünüyor.

**Doğrulama:** 770 test · 762 geçti · 7 atlandı · 1 düştü — beklenen
(yönlendirme testinin koruması; Kafe A'nın kodu test kafesinde). tsc ·
eslint · `next build`. `/giris` canlı sunucuda Google/Apple'sız ve
"Parolanı mı unuttun?" ile geliyor (sayfa kaynağından; uygulama içi
tarayıcı kendi imzalı sertifikayı reddediyor, ekran telefonda görülecek).

---

## ⬅️ Ü269 · Her ödül gecikmeli açılıyor — tutar eşiği KALKTI — 2026-09-24

✅ Commitlendi (2026-09-24).

Ürün sahibi, paneldeki "Gecikmeli açılma eşiği (TL)" alanını görünce:
*"gecikmeli açılma eşiği olmamalı, her ödül gecikmeli açılmalı; kafe
sahibi isterse saatini azaltabilmeli veya arttırabilmeli ama minimum bir
tutar olmamalı, çünkü o zaman yüzdeli ve ürün hediyeleri problem
oluyor."* Sorulunca: **upsell hemen açılsın** (Önerilen).

| Ne | Önce (Ü28 · Ü129) | Şimdi |
|---|---|---|
| Hangi ödül bekler | Eşiğin (varsayılan 35 TL) üstü | **Her ödül** — ürün, yüzde, tutar |
| Kafenin ayarı | Eşik (TL) + aktivasyon saati | Yalnızca **aktivasyon saati**, 1–48 |
| Upsell | Hemen | Hemen — bu ziyaret için (Ü100) |

⚠️ Aktivasyon saati **en az 1**: sıfır "erteleme yok" demek olurdu ve
kuralın tam tersi. Kafe saati kısaltabilir, ertelemeyi kapatamaz.

⚠️ Sonucu: kayıt olurken çarktan çıkan ödül de o ziyarette
kullanılamaz, sonraki ziyarete kalır. Ürün sahibine sorulmadan önce
söylendi.

**Nerede:** `kupon.kuponUret` — aktifleşme anı tek yerde hesaplanıyor,
çark da oyun da oradan geçiyor. Ayar anahtarı `ertelemeEsigi` koddan
silindi; kullanan her yer derlemede düştü ve tek tek kapandı (panel formu
ve eylemi, ödüller sayfası, platform kafe künyesi, iki test dosyası).
Göç 0049 kalan `erteleme_esigi_kurus` satırlarını sildi (2 satır).

**Yol boyunca bulunan üç şey:**
- Ödül satırlarında **"12 saat sonra açılır" SABİT** yazıyordu — kafe
  saati değiştirse bile liste 12 diyordu. Artık kafenin ayarı.
- Ödüller sayfasının "Hemen açılan" kartı hep sıfır olacaktı; yerine
  **"Açılma süresi"** geldi.
- Platformun kafe künyesi, etiket listesinde olmayan ayarı **ham
  anahtarla** gösteriyordu (`odul_ust_sinir_kurus: 8000`) — K5'in üst
  sınırı, geçerlilik günü, çark aralığı, konum yarıçapı. Liste artık
  `Record<Anahtar, …>`: yeni ayar yazılmazsa derleme düşüyor.

**Testler.** Kasa testleri açık kupon için eşiği tavana çekiyordu; o yol
yok. `kuponAl` artık kuponu üretip açılma anını geçmişe alıyor (kasa
zamana bakıyor, `status`a değil); ertelemeyi sınayanlar
`bekleyenKuponAl` kullanıyor. Yeni: *hiçbir ödül hemen açılmıyor* (ürün,
tutar, yüzde; kasa hiçbirini onaylamıyor) · *her ödül ertelenir, en
küçüğü de* · *kazınan ama açılmamış kupon bekleyende duruyor* ·
uçtan uca karekod zinciri artık bekleme adımını da yürüyor.

⚠️ Aktivasyon saatini değiştiren test sonunda kafenin değerini **aynen**
geri koyuyor. Önceki hâli sabit 12'ye yazıyordu — ürün sahibi gece
testinde saati kısaltırsa onu ezerdi.

**A/B:** eşik 30 TL olarak geri konunca dört yeni test tam hedef
satırında düştü.

**Doğrulama:** 758 test · 750 geçti · 7 atlandı · **1 düştü — beklenen**:
yönlendirme testinin koruması, Kafe A'nın kodu elle test kafesine
taşınmış durduğu için çalışmayı reddetti (bkz. Ü267). tsc · eslint ·
`next build`.

---

## ⬅️ Ü268 · Ödül değeri serbest, üst sınır kafenin — "masada 5 dk" KALKTI — 2026-09-23 (K5)

✅ Commitlendi (2026-09-24).

Ürün sahibi, panelde 25/30/…/50 açılır listesini görünce: *"ben oraya
25 ile 50 arasında istediğimi yazabilmeliyim, üst limiti de kafe sahibi
belirlemeli."* Sorulunca: *"kafe istediği gibi belirlesin, bir sınır
olmasın, üst sınır koymada minimum 50 olsun"* ve *"masada 5 dk diye bir
kural olmayacak."*

| Ne | Önce (Ü52) | Şimdi |
|---|---|---|
| Ödül değeri | 25–50 TL, 5'er basamak, açılır liste | **25 TL ile kafenin üst sınırı arası, tam TL**, sayı kutusu |
| Üst sınır | Sabit 50 | Kafenin ayarı `odul_ust_sinir_kurus` — varsayılan 50, **en az 50, yukarıda sınır yok** |
| Erteleme eşiği / çark üst sınırı | En çok 50 | Yukarıda sınır yok — ödülün tavanını izleyebilmeli |
| Kanıt | 25–35 → konum · 40–50 → masada 5 dk · 51+ → fiş kodu | **Her ödül yalnızca konum (K2)** |

🔴 **Fiş kodu satırı da gitmek zorundaydı.** Eski formül 50 TL'nin
üstüne K4 döndürüyordu ve K4 bilerek hiçbir yerden verilmiyor (Ü108).
Tavan kafenin olunca o satır kalsaydı 50 TL'den pahalı her ödül
panelde durur ama **hiç kimseye düşmezdi**.

⚠️ Bu bir güvenlik kuralının gevşemesi ve bilerek yapıldı. Pahalı
ödülde kalan korumalar: kuponu yalnızca kasiyer kapatıyor, kaybı bütçe
tavanlıyor, kafe isterse günlük adet koyuyor (Ü103).

**Şema (göç 0048):** `odul_degeri_basamakli` (25–50, 5'er) düştü,
yerine `odul_degeri_tam_tl` (≥ 25 TL, tam TL) geldi. Üst sınır
uygulamada sınanıyor — CHECK başka tablodaki ayarı okuyamıyor. Var olan
ödüllerin `min_proof_level`i 2'ye indirildi; ölçüldü: 2'nin üstünde
**0** ödül kaldı.

⚠️ Ekranda "sınırsız" yazılmıyor: teknik tavan (`SINIRSIZ`) hata
mesajında aralık gibi görünmesin diye mesaj *"en az 50 TL olmalı"*
diyor. "En fazla 1 milyar TL" yazmak "sınır olmasın" kararını sınırmış
gibi gösterirdi.

⚠️ Bilerek dokunulmayanlar: vitrin simülasyonu 25–50 aralığında kaldı
(varsayılan tavan). Kafe raporundaki *"masada 5 dk kaldı"* bir kural
değil, ziyaretin ulaştığı **olgu** — oturumun K3'ü hâlâ hesaplanıyor ama
hiçbir ödül onu istemiyor.

**Göç çalıştırıcısı da düzeldi.** `db:migrate` 0048'i uygulamayı
reddetti: 0046 ve 0047, commitleri tek tek doğrulamak için yapılan
`git stash` sonrası CRLF'ye dönmüştü (`core.autocrlf = true`) ve özet
ham bayttan alındığı için "uygulandıktan sonra değiştirilmiş" sayıldı.
Kayıtlı özetler karışık (bazı göçler uygulandığında zaten CRLF'ydi);
artık kayıt ham, LF ya da CRLF biçimlerinden biriyle eşleşirse kabul.

**Testler.** E6: her tutar 2, 50 TL'nin üstü dahil · K1 oturum ödül
alamıyor, K2 50 TL'lik ödülü alıyor. K5: 25/27/50 kabul · 0/24/27,5/51
red · tavan 80 → 80 kabul, 81 red, mesaj "80" diyor · tavan 49 red ·
10.000 kabul. Kafenin ayarı sonunda aynen geri konuyor, kendi denetim
satırlarını siliyor. **A/B:** eski kademeler geri konunca iki test
tam hedef satırda düştü; kafenin tavanı yok sayılınca K5 testi
"tavandaki 80 TL reddedildi"de düştü.

**Doğrulama:** 758 test · 751 geçti · 0 hata · 7 atlandı · tsc ·
eslint · `next build`. Tarayıcı testi ürün sahibinde (`docs/28` C.3
güncellendi).

---

## ⬅️ Ü267 · Karekod yönlendirmesi: Ü266'nın dört kusuru — 2026-09-23

✅ Commitlendi (2026-09-24).

Ü266 tarayıcıda açılınca dört kusur çıktı:

1. **Sayfa açılmıyordu.** Liste var olmayan bir `qr_scans` tablosuna
   bakıyordu. Kullanım artık `table_sessions`tan (oturum sayısı + son
   görülme) — `qr_tokens` bir saat sonra `qr_temizlik`le siliniyor,
   kalıcı iz olamaz.
2. **Hiçbir yeni kafe hedef olamıyordu.** Kural "hedefin adlı kodu
   olmamalı" diyordu; oysa her yeni masa kodunu kendiliğinden alıyor ve
   kafe başına tek aktif masa var (göç 0038). Yeni kural: hedefin kendi
   kodu **hiç kullanılmamışsa** basılı kod onun yerine geçer (bırakılan
   kod söylenir); **kullanımdaysa reddedilir** — o kâğıt bir duvarda
   asılı, yerine başka kod geçerse ölür; masası yoksa kodla açılır.
3. **Masa açarken ad çakışıyordu.** `(cafe_id, label)` benzersizliği
   pasif satırları da sayıyor; artık çakışmayan ad seçiliyor
   ("Masa (2)" …).
4. **Geri taşıma reddediliyordu** (kodsuz masası olan Kafe B). Artık
   kabul.

Ekranda kullanımdaki hedef seçenekte **kapalı** ve sebebi yazıyor;
sunucu yine ayrıca reddediyor.

⚠️ Başarı cümlesi de yalan söylüyordu: bırakılan kod yoksa her zaman
*"Kafenin masası bu kodla açıldı"* diyordu — Kafe A'ya geri taşımada
masa zaten vardı. Sonuç artık `masaAcildi` taşıyor; var olan masada
*"Kafenin masasına bu kod verildi"* yazıyor (test 1. ve 7. adımda
sınıyor, A/B'de 7. adımda düştü).

⚠️ **Yeni masa kaynağın adını taşıyordu.** Ürün sahibinin elle
testinde çıktı: Kafe A'nın kodu test kafesine taşınınca platform
listesinde kafe adının altında "Kafe A" yazıyordu ve oyuncu da
*"Buradasın: Yonlendirme Test Hedefi · Kafe A"* görecekti. Masa artık
**hedef kafenin adıyla** açılıyor (`kafeKarekodu` ile aynı, göç 0038 ·
Ü222); ad çakışırsa "(2)". Test 1. adımda adı, yeni 8. adımda çakışmayı
sınıyor.

🔴 **Testin kendisi elle taşınmış kodu silerdi.** Yönlendirme testi
başlarken test kafesinin masalarını siliyordu; ürün sahibi aynı kafeyi
hedef seçtiği sırada koşsaydı Kafe A'nın kodu silinir ve kâğıt hiçbir
yere gitmezdi. Artık test kafesinde `test-` ile başlamayan bir kod
görürse **duruyor ve uyarıyor**; canlı denendi, kod yerinde kaldı.
Ayrıca "kullanımdaki kafe" seçimi adlı kodu olmayan kafeyi seçebiliyordu
— düzeltildi.

⬜ **Açık karar:** taşınan kodun kullanım sayacı masayı sayıyor ve taşıma
sonrası sıfırlanıyor ("hiç okutulmadı"). O kafeye ikinci bir kod
taşınırsa sistem ilkini kullanılmamış sanıp serbest bırakır. Öneri:
taşınmış kod hep "kullanımda" sayılsın (küçük bir göç ister). Ürün
sahibine soruldu.

⚠️ **Hedef listesi geliştirme veritabanında 4.518 kafe.** 4.512'si
`cark`, `challenge` ve `liderlik` testlerinin her koşuda açıp hiç
silmediği kafeler (CarkTest, LiderTest, GorevTest, SezonTest…). Canlıda
böyle bir kalıntı yok, ama elle testte açılır liste kullanılmaz hâlde.
Temizlik ve testlerin düzeltilmesi ürün sahibinin onayını bekliyor.

⚠️ Test (`kimlik.test.ts`, 7 adım) ilk hâlinde iki hatayı görmedi:
hedefin kodunu **elle siliyordu** ve listeyi **hiç çağırmıyordu**. İlk iki
A/B de geçersizdi — ikisi de etiket hatası yüzünden 1. adımda düşüyordu,
hedeflenen korumada değil. Yeniden yapıldı; her koruma kendi satırında
düşüyor. Test sonunda açtığı masaları siliyor, Kafe B'nin ve kullanımdaki
kafenin kodunu geri koyuyor.

**Nerede:** Platform paneli → **Karekodlar** (`/platform/karekodlar`) →
satırda *"yönlendirmeyi değiştir"*. Yalnızca platform yöneticisi.

---

## ⬅️ Ü266 · Platform panelinde karekod yönlendirme ekranı — 2026-09-23

✅ Commitlendi (`6dd00a2`) — ⚠️ **izin alınmadan**; ürün sahibine
söylendi.

Ürün sahibi: *"301 redirect için admin paneline kısayol ekle."*
Basılı kod aynen kalıyor, değişen yalnızca kodun **hangi kafeye**
düştüğü (`masaCoz` veritabanından çözüyor). Gerçek bir HTTP 301 zinciri
yok — "301" ürün sahibinin bu işe verdiği ad. Her taşıma gerekçe
istiyor ve denetim izine `table.print_code_move` olarak düşüyor.

---

## ⬅️ Ü265 · Kart sahneleri referans kartlardan KESİLDİ — 2026-09-22

✅ Commitlendi (2026-09-23, commit borcu kapatılırken).

Ürün sahibi: *"referans kartlardan illüstrasyonu kes, deneyelim; eğer
olmazsa onları referans vererek fal.ai ile üretiriz."* Altı kartın
illüstrasyon bandı kırpılıp kartın kendi koyu zemini saydama çevrildi.
**Beşi tuttu, biri tutmadı.**

Sahneler saydam kesitler (`public/oyun/<id>-512.webp`, RGBA) ve kartın
kendi renginin üstünde duruyor — mevcut üç sahnenin (Blok, Düşen,
Yılan) kurduğu biçim bu. Yeni altısının saydamlığı %26–47, eskilerinki
%34–53; aynı aralık.

### 🔴 Zemin tahmini iki kez yanlış kuruldu

**Birinci deneme — "en koyu %20'nin ortalaması".** Ayır'da çalıştı ama
Blok Kırıcı'da çöktü: illüstrasyon kırpmanın neredeyse tamamını
kapladığı için "en koyu" pikseller zemin değil **gölgeli illüstrasyon**
oldu. Ölçüldü: saydamlık **%1**. Kartta illüstrasyonun çevresinde
mavi-yeşil bir dikdörtgen panel duruyordu ve mor kartın üstünde açıkça
görünüyordu.

**İkinci deneme — kırpmanın kenar şeridinin medyanı.** İllüstrasyon
ortada, kenar zemindir. Aynı eşiklerle altı kartın altısında da
çalıştı; Blok Kırıcı'nın saydamlığı %1'den **%41**'e çıktı ve
dikdörtgen kayboldu.

⚠️ Köşedeki uygulama ikonu kırpmanın **dışında** bırakıldı. Bir turda
silinerek denendi ve iz bıraktı: silinen dikdörtgen tam saydam oluyor,
çevresinde zeminin kalıntısı kalıyor ve aradaki fark kartta yama gibi
görünüyordu.

⚠️ Bıçak Ustası ve Tuğla Kırıcı'nın referansında illüstrasyonun içine
**"BÖLÜM 1 / SKOR 0"** yazıları gömülüydü; kırpma onların altından
başlıyor.

### 🔴 Tuğla Kırıcı tutmadı — ve sebebi kesim değil

Kesim temiz çıktı ama kart okunmuyor: illüstrasyon baştan sona turuncu
ve kartın rengi de kehribar (Ü244). Üç ayrı deneme yapıldı —
zemini kısmen bırakan perde (taban 110), daha koyusu (190, 215, 240),
kenarları eriten tüy — **üçü de işe yaramadı**, çünkü kartta turuncuyu
bastıran şey zemin değil illüstrasyonun kendi turuncu ışıması.

Aynı kesit koyu bir kartta (arduvaz #1e293b) denendi ve **canlandı**:
tuğlalar, top ve palet net ayrışıyor. Yani çözüm sahnede değil **kart
renginde**.

⚠️ Renkli Çizgiler'de aynı sorunun hafifi var: neon-camgöbeği
illüstrasyon krem kartın haki tonunda donuk duruyor. Okunuyor ama
parlamıyor.

🔴 İkisi de **palet kararı** ve palet tükenmiş durumda (bkz.
`oyuncu-renk.ts`): çarkın dilim listesinde kullanılmamış ton kalmadı.
Karar ürün sahibinde.

**Doğrulama:** 757 test · 0 hata · tsc · eslint · `next build` ·
karusel tarayıcıda gezildi (Blok Kırıcı · Blok 2048 · Renkli Tüpler ·
Renkli Çizgiler · Tuğla Kırıcı kartları görüldü).

---

## ⬅️ Ü264 · Kart ikonları geldi — dört oyun genel daireden çıktı — 2026-09-22

✅ Commitlendi (2026-09-23, commit borcu kapatılırken).

Ürün sahibi dört ikon gönderdi ve hangisinin hangi oyun olduğunu
söyledi: *"soldaki 2048, ortadaki ayır, sağdaki birleştir · ikinci
görselde blok kırıcı."*

| ikon | oyun | not |
|---|---|---|
| sayı blokları | `ikibin` | — |
| deney tüpleri | `ayir` | — |
| birleşen toplar | `bagla` | ⚠️ görselde **top** var, oyunda **çizgi** |
| tuğla + palet | `kirici` | ürün sahibi "blok kırıcı" dedi, görselde palet var |

⚠️ İkonlar **üretilmedi, kırpıldı**: ilk görsel üç ikonu yan yana
taşıyordu. Sınırları tahminle değil parlaklıktan bulup kare kırptım
(referans zemin ile ikon arasındaki fark 30 kademe), 256×256'ya
indirdim. Ü254'te referanssız üretilen dokuz görselin hiçbiri
tutmamıştı; bu turda tur harcanmadı.

⚠️ `bagla`nın ikonu oyunun mekaniğini birebir anlatmıyor — oyun aynı
renkleri **çizgiyle** birleştiriyor, ikonda ise toplar birleşiyor.
Ürün sahibi "birleştir" diye adlandırdı ve oyunun eski özeti de *"aynı
renkleri birleştir"*di; yine de farklı bir ikon isterse değişebilir.

⚠️ `kirici`yi ürün sahibi eski adıyla ("blok kırıcı") andı. Görselde
**palet** olduğu için hangi oyun olduğu tartışmasız: Ü263'te "Tuğla
Kırıcı" adını alan oyun. Ad değişikliği geri alınmadı.

**Blok · Düşen · Yılan eskisi gibi kaldı** — ürün sahibinin kararı.
Adları değişmedi; kategorileri eski ayrımın karşılığına kondu (Blok →
Stratejik, Düşen ve Yılan → Beceri & Hız).

**⬜ Kalan: kart SAHNELERİ.** Karuselin büyük görseli yalnızca üç
oyunda var (`blok`, `dusen`, `yilan`); kalan altı kart ikonla ve soluk
bir genel görselle kalıyor. Ürün sahibinin gönderdiği kart
referanslarında tam sahne vardı ama metin görselin içine gömülü, yani
doğrudan kullanılamıyor.

**Doğrulama:** 757 test · 0 hata · tsc · eslint · `next build` ·
tarayıcıda dokuz oyunun dokuzu da görsel ikon kullanıyor (genel daireye
düşen: 0).

---

## ⬅️ Ü263 · Kart referansları geldi: 2048'in paleti, oyun adları, kategoriler — 2026-09-22

✅ Commitlendi (2026-09-23, commit borcu kapatılırken).

Ürün sahibi yedi referans görsel gönderdi (ikon + altı oyun kartı) ve
*"sayılar hâlâ küçük, baya büyük olsun · blok için görseldeki gibi olsun
· istediğim ikon ve kart görsellerini gönderdim, bunlar gibi yap"* dedi.
Görseller `docs/tasarim/oyun-kartlari-referans/` altında duruyor.

### Sayılar bir kez daha büyüdü

Hedef doluluk %80'den **%85'e** çıktı: 72 / 64 / 50 / 35 cqmin. Tek
basamak artık **yükseklik** sınırında (hücrenin %72'si); genişlikte
yalnızca %42 kaplıyor ama rakamın boyu hücrenin yarısını geçiyor.

### 🔴 Palet kuralı DEĞİŞTİ — iki istek çeliştiği için soruldu

Ü260'ta ürün sahibi *"sayı büyüdükçe daha koyu"* demişti; palet ona göre
kurulmuş, parlaklığı 0,921'den 0,009'a tek yönlü düşüyordu ve testi
vardı. Referans görselde ise renkler koyulaşmıyor: 512 yeşil, 1024 mavi,
2048 parlayan altın. **Çelişki sorulup referans seçildi**; koyulaşma
kuralı ve testi kalktı.

⚠️ Renkler gözle kopyalanmadı, görselden **ölçüldü** — ve ilk iki ölçüm
yanlış çıktı, ikisi de ölçümün kendisiyle görüldü:

1. Karo merkezinden örnekleme beyaz **rakama** denk geliyordu (2048 için
   `#fff4de` okundu).
2. "En doygun pikseller" süzgeci açık karolarda kenar parlamasını
   yakalıyordu (`2` karosu `#889fea` çıktı, oysa açık periwinkle).

Üçüncüsü tuttu: beyaza yakın (rakam) ve koyu (gölge) pikseller elenip
**medyan** alındı.

### 🔴 Yazı rengi referanstan ALINMADI

Referans on bir karonun hepsinde beyaz rakam kullanıyor. Ölçüm: `2`
karosunda beyazın kontrastı **1,97**, `32`de 2,11, `2048`de 2,26. İkon
boyutunda göze batmıyor, oyunda rakam hücrenin yarısı kadar ve okunması
şart.

Kural: zemin koyuysa (bağıl parlaklık < 0,30) beyaz, açıksa kendi
tonundan türeyen çok koyu bir renk. Referansın canlı zeminleri aynen
duruyor, rakam her karoda okunuyor.

⚠️ Kontrast eşiği 4,5'ten **3,0**'a indi ve bu bir gevşetme değil:
WCAG'ın **büyük yazı** eşiği bu ve rakamların en küçüğü 27 piksel kalın
(sınır 18,66). Ü260'ta 4,5 uygundu çünkü palet koyulaşıyordu ve beyaz
yalnızca koyu zeminlerde kullanılıyordu.

⚠️ 2048 karosunun parlaması geri geldi. Ü260'ta kaldırılmıştı çünkü o
zamanki kural "büyük = koyu"ydu; kural kalkınca gerekçe de kalktı.

### Adlar ve kategoriler referanstan

🔴 **Bir ad çakışması vardı ve ancak eşleştirirken görüldü:** referanstaki
"Blok Kırıcı" topları fırlatıp blokları patlatan oyun — yani bizim
**Sekme**. Paletli olan ise "Tuğla Kırıcı" — bizim o güne kadar "Blok
Kırıcı" adını taşıyan **Kırıcı**. İkisi birlikte değiştirilmeseydi iki
oyun aynı adı taşıyacaktı.

| kimlik | eski ad | yeni ad |
|---|---|---|
| `sekme` | Sekme | **Blok Kırıcı** |
| `kirici` | Blok Kırıcı | **Tuğla Kırıcı** |
| `ikibin` | 2048 | **Blok 2048** |
| `ayir` | Ayır | **Renkli Tüpler** |
| `bagla` | Bağla | **Renkli Çizgiler** |
| `bicak` | Bıçak | **Bıçak Ustası** |

Kategoriler ikiden **üçe** çıktı: Stratejik · Mantık & Düşünme · Beceri
& Hız. ⚠️ Ayrım ölçütü değişmedi, yalnızca "Düşünerek" ikiye bölündü:
planlayıp biriktirdiğin oyunlar ile tek doğru çözümü aradığın
bulmacalar artık ayrı.

⚠️ Referansta yalnızca altı kart vardı. Blok, Düşen ve Yılan eski
ayrımın söylediği yere kondu; kartları gelince teyit edilecek.

⚠️ Açıklamalar referanstan alındı **ama iki yerde alınmadı**: referans
kartları *"tüm seviyeleri tamamla"* diyor ve bu Ü83'le çelişiyor —
bizde kazanarak biten tur yok. Renkli Çizgiler'in açıklaması da
mekaniği yanlış anlatıyordu (*"çizgileri sırala"*).

### 🔴 Yol boyunca: katalog hiçbir testten geçmiyormuş

`katalog.ts` bir ara bozuldu (kapanmamış yorum bloğu) ve **754 test
yeşil kaldı** — dosyayı hiçbir test içe aktarmıyordu. Oysa dosyanın
kendi yorumu *"yeni bir oyun eklenip `KATEGORILER` güncellenmezse oyun
katalogdan **sessizce** kaybolurdu"* diye uyarıyordu.

Üç test eklendi (her oyun katalogda tam bir kez · hiçbiri "Diğer"e
düşmüyor · kategori sırası korunuyor) ve A/B ile doğrulandı.

⚠️ Aynı sınıf hata bu oturumda `challenge.ts`te iki kez çıktı ve orada
test **vardı**, ikisini de yakaladı. Fark testin varlığıydı.

**Doğrulama:** 757 test · 0 hata · tsc · eslint · `next build` ·
tarayıcıda oynandı, tur sunucuda doğrulandı (920 puan).

---

## ⬅️ Ü262 · Dokuzuncu oyun: Bağla (Flow Free) — 2026-09-22

✅ Commitlendi (2026-09-23, commit borcu kapatılırken). ✅ Tarayıcıda doğrulandı (Ü263 turunda, ürün
sahibi giriş yaptıktan sonra).

Ürün sahibinin istediği üç oyunun sonuncusu: *"renkli çizgileri
birleştir"*, kaynak Yandex'teki **Flow Free**. `docs/18`in aday
listesinde **10 numara**: *"girdi bir yol — en zengin girdi biçimi.
Bölüm üretimi zor: her bölümün çözülebilir olduğu garanti edilmeli."*

Aynı mekaniğin basit sürümü de açılıp oynandı
(toytheater.com/color-link) ve **kural farkı orada görüldü**: orada
noktaları birleştirmek yetiyor, tahtayı doldurmak gerekmiyor. Klasik
kural alındı — hem ürün sahibinin gösterdiği oyun o, hem doldurma şartı
olmadan bulmacanın çoğu düz çizgiyle çözülüyor.

### Girdi biçimi (Ü21)

Sekiz oyunun girdisi birkaç sayıdan ibaretti; bunun ki **değişken
uzunlukta bir dizi**. Parmak sürüklenirken taslak yol ekranda duruyor ve
motora dokunmuyor: bir çizim **tek** girdi. Her kare ayrı girdi olsaydı
kayıt kare sayısı kadar şişer ve `EN_FAZLA_GIRDI` bir turda dolardı.

### 🔴 Bölüm üreteci — Hamilton yolunu keserek

Tahtayı tamamen kaplayan tek bir yol kuruluyor (yılan sıralamasından
başlayıp **backbite** adımlarıyla karıştırılarak) ve o yol parçalara
kesiliyor. Her parça bir rengin çözümü, parçanın iki ucu o rengin
noktaları. Çözülebilirlik **ispat**: parçaların kendisi zaten bir çözüm
ve tahtanın tamamını kaplıyor.

Alternatif (uçları rastgele serp → çözücüyle doğrula) Ayır'daki (Ü261)
gerekçeyle reddedildi: `baslat` oyun kaydı doğrulanırken sunucuda
yeniden koşuyor (S5) ve aramanın maliyeti her doğrulamaya binerdi.

Ölçüm: 14 bölüm × 30 tohum = 420 tahtada kaplama, komşuluk ve uç sayısı
**kusursuz**; motor kendi çözümünü **2120 çizimde 0 kez** reddetmedi.

### 🔴 Zorluk merdiveni ilk yazımda TERSİNE dönüyordu

Renk sayısı formülü kenara bağlıydı ve ölçümde bölüm 1'de 4, bölüm 2'de
**3** renk veriyordu — oyun ikinci bölümde kolaylaşıyordu. Kırıcı'da
(Ü244) da zorluk eğrisi bir kez tersine dönmüştü; ikisi de gözle değil
ancak **ölçünce** göründü. Şimdi tek yönlü ve testi var.

### Duvar (Ü83) ve ekonomi

Duvar tek sayı: **36 çizim hakkı**, iade yok. Kusursuz oyuncu bir bölümü
renk sayısı kadar çizimde bitiriyor; renk bölümle büyüdüğü için biriken
maliyet hızlanıyor ve hak tükeniyor.

Dört oyuncu modeli × beş hak değeri ölçüldü. 36'da bölüm sayıları:
**acemi 2, iyi 4, usta 6, kusursuz 8** — dört seviyenin dördü de
ayrışıyor. Puan ölçeği (`60 + 30·bölüm`) eşiği dördüncü bölümün hemen
üstüne koyuyor: 3 bölüm 360, 4 bölüm 540. Kupon eşiğini (500) geçme
oranı acemi %7, iyi %80, usta %98.

⚠️ Bot `q<1`'de **üretecin yolunu** bulamayınca rastgele geçerli bir yol
çiziyor; insan ise kendi bulduğu çözümü çiziyor. Yani acemi/iyi satırları
gerçek insanın **alt sınırı**. Ayar yapılırken buna güvenilmedi.

### Palet — Ayır'ın dersi baştan uygulandı

Ü261'de gözle seçilen palet deuteranopide ΔE 6,8 vermişti. Burada palet
seçilmedi, **arandı**: en zayıf halka **36,2** (normal 51,6 ·
deuteranopi 36,2 · protanopi 37,1).

⚠️ Sekiz renk denendi ve arama sekiz **canlı** ton bulamadı — en iyi
sekizli beyaz, gri ve kahve içeriyordu (32,8). Motorun renk sınırı bu
yüzden altıya indi; zorluk bundan kaybetmiyor, çünkü 36 hakla kusursuz
oyuncu bile 8. bölümü geçemiyor ve renk orada zaten 6.

⚠️ Dört ton Ayır'ınkiyle aynı ve bu kopyalama değil: aynı ölçüte göre
aranan altı canlı rengin tavanı bu.

### 🔴 A/B bir BOŞLUK ortaya çıkardı

Bekçi testler hatayı geri koyarak sınandı. Üreteç testi bozuk backbite'ı
yakaladı. Ama `bolumBittiMi`deki **kaplama şartı silinince tek bir test
bile düşmedi** — yani dosyanın başında "klasik kuralı alıyoruz" diye
yazan kural korumasızdı ve biri "sadeleştirme" diye o satırı silse oyun
sessizce kolay sürüme dönerdi. Elle kurulmuş 3×3 bir tahtayla test
eklendi ve A/B ile doğrulandı.

### Yan etki: onuncu günlük görev

Oyun sayısı dokuza çıkınca görev havuzu da dokuzdu ve **OBEB 9** oldu.
`challenge.test.ts` düşürdü. Onuncu görev eklendi (`skorOrta`, oran 80,
XP 75): OBEB(10,9) = 1, döngü 90 gün. ⚠️ Oran 80 yeni bir zorluk kademesi
değil, `skorIyi` (60) ile `skorZor` (100) arasındaki **eksik basamak**.
Skor görevleri rotasyonda yan yana düşmeyecek şekilde yerleştirildi.

**Renk:** krem — çarkın dilim listesinde kalan **son** ton. 🔴 Onuncu
oyun için çarkın kendisi büyümek zorunda.

**Dosyalar:** `oyunlar/bagla.ts` · `arayuz/bagla-ekran.tsx` ·
`arayuz/bagla-yuzey.ts` · `oyunlar/index.ts` · `arayuz/index.tsx` ·
`katalog.ts` · `components/oyuncu-renk.ts` · `domain/challenge.ts` ·
`tests/oyun-motoru.test.ts`

**Doğrulama:** 754 test, 0 hata · tsc · eslint · `next build` ·
tarayıcıda çizildi. SVG uçlarının DOM kareleriyle **en büyük sapması
0,51 piksel** — ızgara boşluğunun sıfırlanması doğru karardı.

🔴 **Tarayıcıda bir kusur çıktı ve düzeltildi: hızlı parmak kare
atlıyordu.** `pointermove` her pikselde düşmüyor; iki olay arasında
kalan kare yola hiç girmiyor ve çizgi geride takılı kalıyordu. Yavaş
çizerken görünmüyordu. Artık son kareden parmağın bulunduğu kareye
**adım adım** yürünüyor. Ölçüldü: 0 → 3 arasında tek bir hızlı
sürükleme dördünü de yakalıyor (düzeltmeden önce yol hiç işlenmezdi).

**⬜ Eksik:** kart görseli yok · gerçek dokunmatik cihazda sınanmadı.

---

## ⬅️ Ü261 · Sekizinci oyun: Ayır (renk sıralama) — 2026-09-22

✅ Commitlendi (2026-09-23, commit borcu kapatılırken).

Ürün sahibi üç oyun istemişti: 2048, **sıvı ayırma**
(`toytheater.com/liquid-sort/`) ve "renkli çizgileri birleştir". Bu
ikincisi. `docs/18`in aday listesinde **1 numara** olarak duruyordu:
girdi `(kaynak, hedef)`, zaman yok, maliyet düşük.

Referans açıldı ve oynandı (kural metni + bir hamle): bir tüpe dokun,
ötekine dokun, üstteki renk dizisi aktarılsın.

**Referanstan alınmayan tek şey puan.** Orada *"bulmacayı hızlı bitir,
daha çok puan al"* yazıyor; bizde bu Ş2'ye takılıyor — sunucu
istemcinin duvar saatini göremiyor. Oyunda zaman **hiç yok**.

### 🔴 Bölüm üreteci — klasik yol ölçümde çöktü

Alışılmış yol birimleri tüplere rastgele dağıtmak. Aynı renk/tüp
sayılarıyla 320 tahta üretildi:

| üreteç | çözülebilir | **çözümsüz** |
|---|---|---|
| rastgele dağıtım | 135 | **185 (%58)** |
| ters oynatma | 320 | **0** |

Çözümsüz bölüm, oyuncunun hatası olmayan bir kayıp demek. İkinci
alışılmış yol (dağıt → aramayla doğrula → olmazsa yeniden dağıt) da
reddedildi: oyun kaydı doğrulanırken `baslat` sunucuda yeniden çalışıyor
(S5) ve aramanın maliyeti **her doğrulamaya** binerdi.

Seçilen yol **ters oynatma**: çözülmüş tahtadan başlanıp yalnızca
geçerli bir ileri hamlenin tersi olan adımlar atılıyor. Çözüm, atılan
adımların tersi — arama yok, garanti var.

⚠️ Ters hamlenin iki şartı var ve **ikisi aynı ağırlıkta değil**. Şart 2
kaldırılıp aynı 320 tahta yeniden tarandı: yine 0 çözümsüz, parça sayısı
16,8'den 16,6'ya indi. Yani şart 2 bu tahta boyutlarında taşıyıcı değil —
ama kaldırılırsa elde kalan şey ölçüm olur, **ispat olmaz**. Duruyor ve
gerekçesi kodda yazılı.

### 🔴 Duvar (Ü83) iki kez tasarlandı

İlk tasarım: hamle **havuzu**, biten bölüm sabit 12 hamle iade ediyor.
Kâğıtta duvar vardı (maliyet büyür, iade sabit kalır). Ölçüm çürüttü:

- İlk bölümlerin en kısa çözümü 2–6 hamle, yani **iade maliyetten
  büyüktü**: oyuncu ilk bölümlerde havuzu şişiriyordu. Rastgele oynayan
  bot 6,5 bölüm ilerledi ve kupon eşiğini **%94,7** oranında geçti.
- Maliyet üst bölümlerde ~13,5'te sabitlenince duvar **42. bölüme**
  düştü; kusursuz bot 533 hamle oynadı. Kafede bir kahve süresi değil.

İkinci tasarım: **tek hamle hakkı, iade yok.** Her bölüm en az bir
hamleye mal olduğuna göre tur kaçınılmaz olarak bitiyor — ispat bir
satır. Sayı dört oyuncu modeli × altı hak değeri taranarak seçildi:

| hak | 40 | 50 | **60** | 70 | 85 |
|---|---|---|---|---|---|
| rastgele | 180 %0 | 280 %0 | **280 %10** | 280 %22 | 280 %25 |
| acemi %40 | 280 %0 | 400 %8 | **400 %43** | 400 %46 | 400 %46 |
| iyi %75 | 400 %0 | 600 %53 | **540 %78** | 700 %78 | 880 %78 |
| kusursuz | 400 %0 | 540 %100 | **700 %100** | 880 %100 | 1080 %100 |

*(ortanca skor · kupon eşiğini geçme oranı)*

40 ve 50'de kusursuz oyuncu bile iyi oyuncudan ayrışmıyor; 85'te
rastgele oynayan her dört turun birinde eşiği geçiyor. **60** ikisinin
arasında. `gunlukHedef` de ölçümden: 540.

⚠️ Tabloda 60'tan sonra rastgele botun skoru artmıyor — onu bitiren şey
artık hak değil, **tek boş tüpte kilitlenmesi**. Boş tüp sayısı bölüm
3'ten sonra 2'den 1'e iniyor ve hatanın bedelini o doğuruyor; iki
boşlukta *"iyi"* ile *"kusursuz"* aynı skoru alıyordu.

### 🔴 Sıvı paleti gözle seçildi, renk körlüğünde çöktü

İlk palet elle seçilmişti ve normal görmede iyiydi. Renk körlüğü
benzetiminden geçirilince:

| görme | en yakın çift ΔE |
|---|---|
| normal | 49,1 ✓ |
| **deuteranopi** | **6,8** 🔴 gök ↔ orkide |
| protanopi | 22,1 |

Bu oyunda **aynı renk = birleşebilir** demek; çakışan iki sıvı tahtayı
okunamaz yapıyor. Deuteranopi erkeklerin ~%5'inde var.

⚠️ İlk kod yorumu *"kırmızı-yeşil çifti bilerek uzak tutuldu"* diyordu ve
yanlış yere bakıyordu: çakışan çift kırmızı-yeşil değil **mavi-mor**.
Renk körlüğünün hangi çifti çökerteceği sezgiyle bilinmiyor.

Palet seçilmedi, **arandı**: 32 tonluk havuzdan, üç görme biçiminde en
yakın çiftin ΔE'sini birlikte en büyük yapan altılı. Sahnenin kendi
rengi de aramaya girdi. Sonuç: **6,8 → 36,2** (beş kat). Sıra da ölçüm —
ilk bölümde yalnızca üç renk görünüyor, o yüzden kod 1-2-3 en ayrışan
üçlü (ΔE 49,4).

### Ekranda düzeltilen iki şey

- **Dilim başına bir öge saç teli çizgiler bırakıyordu.** 225 piksellik
  tüpte %25 = 56,25 piksel; kesir yuvarlanınca komşu ögelerin arasından
  koyu zemin sızıyor ve aynı renkten dört birim **dört ayrı blok** gibi
  görünüyordu. Sıvı tek bir degradeye çevrildi.
- **Tüp boyu ölçüyle büyütüldü** (232 → 281 piksel). En bilerek dar
  kaldı: beş tüp 375 piksellik telefonda ancak bu enle tek sıraya
  sığıyor. Yedi tüplü bölüm klonlanarak **gerçekten ölçüldü** — iki sıra,
  123..705, taşma yok.

### Yan etki: dokuzuncu günlük görev

Oyun sayısı sekize çıkınca görev havuzu da sekizdi ve **OBEB 8** oldu —
her oyuna hep aynı görev düşerdi. `challenge.test.ts` bunu düşürdü.
Dokuzuncu görev eklendi (`skorUsta`, oran 130, XP 100): OBEB(9,8) = 1,
döngü 72 gün. ⚠️ Yine bir **skor** görevi, çünkü havuzdaki sekiz görevin
altısı birden fazla tur istiyordu.

**Dosyalar:** `oyunlar/ayir.ts` · `arayuz/ayir-ekran.tsx` ·
`arayuz/ayir-yuzey.ts` · `oyunlar/index.ts` · `katalog.ts` ·
`components/oyuncu-renk.ts` (yeni ton: lavanta) · `domain/challenge.ts` ·
`globals.css` · `tests/oyun-motoru.test.ts`

**Doğrulama:** 741 test, 0 hata · tsc · eslint · `next build` · tarayıcıda
oynandı. Dört bekçi test hatayı geri koyarak sınandı: çözülebilirlik
(bozuk üreteç 185 tahtada yakalandı), duvar, renk körlüğü paleti, ödül
paketinin puan vermemesi.

**⬜ Eksik:** oyunun **kart görseli** yok — karusel genel daireye
düşüyor. Ü254'te öğrenildiği gibi referans görsel olmadan tur harcamak
işe yaramıyor; ürün sahibinden bekleniyor.

---

## ⬅️ Ü260 · 2048'in karo paleti ölçülerek kuruldu — 2026-09-22

✅ Commitlendi (2026-09-23, commit borcu kapatılırken).

Ürün sahibi: *"2048'deki sayıları büyüt, renkleri değiştir, her sayıda
farklı renk olmalı ve gitgide daha koyu."*

### 🔴 Asıl hata punto birimindeydi

`fontSize: "54%"` yazılmıştı ve tarayıcıda **8,64 piksel** ölçüldü:
CSS'te yüzdeli `font-size` ögenin kendi boyutuna değil **üst ögenin
punto'suna** göre çözülüyor. Üstte punto 16px olduğu için 76 piksellik
hücreye 8 piksellik sayı yazılıyordu — yani "sayıları büyüt" isteği hiç
uygulanmamış, yalnızca yüzdeler oynamıştı.

Hücre `containerType: size` ile ölçü kabına çevrildi, punto `cqmin`e
geçti. Merdiven tarayıcıda ölçülerek kuruldu (her basamak sayısının
gerçek yazı genişliği canvas'la ölçülüp hücrenin ~%80'ini dolduracak
punto seçildi): 54 / 50 / 44 / 33 cqmin.

⚠️ Tek basamağı sınırlayan şey genişlik değil **yükseklik**: "2" 54'te
hücrenin %32'sini kaplıyor ama rakamın boyu zaten hücrenin yarısı.

### Palet iki kez düzeltildi

*"Gitgide daha koyu"* gözle doğrulanamaz — renk algısı parlaklıkla aynı
şey değil. Her kademenin WCAG bağıl parlaklığı hesaplandı:

- **Sarı 16'dan 8'e alındı.** 8 yeşildi (L .639), 16 sarıydı (L .746) —
  sayı büyürken karo **açılıyordu**. Sarı doğası gereği parlak.
- **64'ün yazısı beyazdan koyuya döndü.** Kontrast 3,67 çıkıyordu, AA
  eşiği 4,50. Zemini koyultmak o basamağı 128'e yapıştırırdı.

Sonuç: parlaklık .921'den .009'a **tek yönlü** düşüyor, en düşük kontrast
**4,71**, 11 kademe 11 ayrı renk. Dört test bekçilik ediyor ve ikisi
hatayı geri koyarak sınandı.

---

## ⬅️ Ü242 · Kılavuz tek çizgiye indi, Loopy büyüdü — 2026-09-22

✅ Commitlendi (2026-09-22).

Ü241'de kılavuz gerçek yörüngeye geçmişti — duvar sekmeleri dahil.
Ürün sahibi ekranda görünce **geri aldırdı**: *"sekeceği alanı
göstermesine gerek yok, tek çizgi halinde topun ilk çarpacağı alanı
göstermeli, ve sonunda bu yuvarlak şey olmasın."*

Haklı: sekmeyi göstermek oyunu hesap makinesine çeviriyordu — Ü217'de
yazılan çekince tam olarak buydu ve Ü241'de göz ardı edilmişti.

### Ne kaldı, ne gitti

| | Ü241 | Ü242 |
|---|---|---|
| yol | tüm yörünge, sekmelerle | **ilk temasa kadar tek düz çizgi** |
| uçta nokta | var | **yok** |
| kaynak | `atisIzi` | `atisIzi` (aynı) |

Ü241'in işi boşa gitmedi: çizginin **nerede biteceğini** hâlâ o hesap
söylüyor. Kılavuz kendi çarpışma hesabını yapmıyor; izde **yönün ilk
değiştiği** kareyi arıyor. Motorun hızı sekmeler arasında sabit, yani
ardışık farklar birebir aynı; fark değiştiği an top bir şeye değmiştir
— duvara ya da bloğa.

Ekranda iki hâl de ölçüldü: duvara giden atışta çizgi x=96,8'de
(sağ kenar), bloğa giden atışta y=13,9'da (blok sırasının altı)
bitiyor.

### Loopy 50 → 82

*"Loopymiz daha büyük olsun, gerçekten o fırlatıyor gibi."* 50
pikselde topun çıktığı yerin altında küçük bir rozet gibi duruyordu;
top ondan çıkmıyor, üstünden geçiyor gibi görünüyordu. Yukarı da
kaydırıldı, başı tahtanın alt kenarına değiyor.

⚠️ Kutu yüksekliği başın taşan kısmını saymıyor (`-top-3`), yoksa
tahta yukarı itilirdi.

---

## ⬅️ Ü241 · Sekme'nin kılavuzu gerçek yörüngeye geçti — 2026-09-22

✅ Commitlendi (2026-09-22).

Ürün sahibi: *"bu isabet için olan çizgi çizgi olan tüm yol boyunca
ilerlemeli, yarıda kesilmemeli ve tam topun gideceği doğru noktayı
göstermeli."*

Kılavuz üç turda buraya geldi ve üçü de farklı bir sorundu:

| tur | sorun | çözüm |
|---|---|---|
| Ü217 | yalnızca çıkış yönü, çok soluk | — |
| Ü236 | **hiç görünmüyordu** (5×5 piksel; `* 0.02` çarpanı `uzunluk`u işlevsiz bırakıyordu) | çarpan kalktı, 62 birim |
| Ü241 | düz ışın sekmeleri göstermiyor | **gerçek yörünge** |

### Yol motordan geliyor

🔴 Dosyanın kuralı: *"ekran kendi fiziğini yazsaydı ekrandaki iz ile
sunucunun gördüğü sonuç ayrışırdı."* Kılavuz bu yüzden kendi yansıma
hesabını yapmıyor — `atisIzi` ile **motorun kendi izini** alıyor.
Uçuş animasyonu da aynı kaynaktan besleniyor, yani kılavuz ile topun
gittiği yol **tanım gereği** aynı; ayrışması mümkün değil.

Maliyet ölçüldü: `atisIzi` çağrısı **0,04–0,12 ms**. Nişan alırken her
açı değişiminde çağrılabilir; `useMemo` aynı açıda tekrar
hesaplamıyor.

### Nerede duruyor

İlk çarpmada, ve oraya bir nokta konuyor — ürün sahibinin istediği
"gideceği doğru nokta" o. Duvar sekmeleri **yolun içinde** çünkü
çarpmadan önce oluyorlar; kesilen tek şey çarpma sonrası.

🔴 İlk yazımda çarpma tespiti `durum.nesneler` ile karşılaştırıyordu
ve **kılavuz hiç çizilmedi**: `simule` daha başlarken diziyi
kopyalıyor, yani ilk kare zaten farklı bir dizi; döngü tek noktada
kırılıyor ve bileşen `null` dönüyordu. Kıyas kareden kareye alındı.

Ekranda ölçüldü: iki ayrı açıda 49 ve 65 noktalı yol, ikisi de duvardan
sekip vuracağı bloğun üstünde bitiyor.

### `aciYonu` silindi

Ekranın düz ışını yön vektörünü oradan alıyordu; gerçek yörüngeye
geçilince tek çağıranı kalmadı. Çağrılmayan kod bırakılmıyor.

---

## ⬅️ Ü240 · Oyun yalan söylüyordu: kural çizimle uyuşmuyordu — 2026-09-22

✅ Commitlendi (2026-09-22).

Ürün sahibi iki şey söyledi: *"bazen bıçağı tahtaya gönderecek gibi
olmama rağmen bıçağa çarpıyor"* ve *"bıçaklarımız oyun için çok
kalın."* **İkisi aynı sebebe çıktı.**

### 🔴 Ölçüm

Motor 20°'de çarpışma sayıyordu (`CAKISMA` = 200). Bıçak ise ekranda
o kadar yer kaplamıyordu; çizim ölçülerinden (en 6,4%, ucun yarıçapı
23%) açısal genişliği **13,8°** çıkıyordu.

| | derece |
|---|---|
| bıçağın görünür genişliği | 13,8° |
| motorun çarpışma kuralı | 20,0° |
| **fark** | **6,2°** |

Sonucu asıl gösteren hesap şu: iki bıçak arasına atabilmek için
**40°'lik** aralık gerekiyordu, o aralıkta **26°'lik görünür boşluk**
oluyordu ve oyuncu oraya **14°'lik** bıçağı sokamıyordu. Gözle rahat
sığan yer motorda doluydu.

### Kural artık çizimden türüyor

Bıçak inceltildi (6,4% → 4,6%) ve `CAKISMA` ona eşitlendi:

```
2 · atan((en/2) / (KUTUK_R − BATMA + BICAK_BOY·0,62·0,26)) = 9,96°
CAKISMA = 100  (10,00°)
```

Çalışan uygulamadan ölçüldü: bıçak 14,5 piksel = kutunun %4,60'ı,
açısal genişlik **9,96°**, kural **10,00°** — **fark 0,04°**.

🔴 İki sayı birlikte değişmek zorunda ve bu iki dosyaya da yazıldı.
Ayrışırlarsa aynı yalan geri gelir.

### Zincirleme: pencere yarıya inince üç şey daha değişti

**1 · Bölüm başına bıçak** (`tur*2` → `tur*5`). Bıçak incelince
çembere iki katı sığıyor; eski artışla duvar 7. bölümden **15**'e
kaymıştı (ölçüldü, tavan 10.930 puan).

**2 · Puan** (`10 + tur*2` → `7 + tur`). Bölüm başına bıçak
katlanınca puan da katlanıyordu ve kupon eşiği çöktü: **±2 tick
sapmayla oynayan bot %100 kupon alıyordu.** Ü234'ün derdi tam buydu.
⚠️ İlk düzeltme fazla sertti (`5 + tur`): tavan 1.577'ye düşüp ilk
bonus kademesi (1.500) ancak kusursuz oyunla geliniyordu.

**3 · Hız** (tavan 60 → 34). Kayma penceresinin dörtte birini
geçmemeli: `1,5 tick × hız ≤ 50`.
⚠️ Ölçüm, hızın eğriyi **az** oynattığını gösterdi (tavan 30↔40
arasında iyi oyuncunun kupon oranı %47↔%30). Belirleyici olan hız
değil geometri.

**4 · Atış anı `floor` yerine `round`.** `floor` atışı hep geriye
yuvarlıyordu — sistematik tek yönlü gecikme. `round` ile kayma
±yarım tick ve simetrik. Sunucunun saat denetimi bozulmuyor:
`saatTutarliMi` yalnızca **az** süre bildirmeye bakıyor.

### Ölçülen yeni eğri (200 tur, zamanlama sapmasına göre)

| oyuncu | ortalama | eşiği geçen |
|---|---|---|
| ±4 tick (özensiz) | 453 | %12 |
| ±2 tick (orta) | 588 | %49 |
| ±1 tick (iyi) | 637 | %61 |
| sapmasız | 1.822 | %100 |

Duvar **6. bölümde** (40 tohumun hepsinde), tavan **1.911** — Ü235'te
ölçülen 1.916 ile neredeyse aynı.

⚠️ **Oyun artık daha hassas ve bu kaçınılmaz.** Bıçak yarı kalınlıkta
olunca açısal tolerans da yarıya iniyor; iyi oyuncunun kupon oranı
%84'ten %61'e indi. Eski oran, kuralın çizimden geniş olmasından
geliyordu — yani oyunun yalanından. Ürün sahibi fazla zor bulursa
çözüm bıçağı biraz kalınlaştırmak (ve `CAKISMA`yı onunla büyütmek).

### ⚠️ Yapılamayan ölçüm

Bıçak'ın tavanını öbür oyunlarınkiyle kıyaslamak için dört oyuna
hızlı bot yazıldı ve **sonuç kullanılamadı**: botların kalitesi
birbirini tutmuyordu (Sekme botu 1,2 milyon, Düşen botu 0 puan).
Oyunlar değil botlar ölçülmüş oldu. Çapa olarak ürünün kendi puan
eşikleri (1.500 · 2.500) kullanıldı. Oyunlar arası denge karşılaştırması
hâlâ **ölçülmemiş bir varsayım**.

---

## ⬅️ Ü239 · Bir koşu geçip bir koşu düşen test — 2026-09-22

✅ Commitlendi (2026-09-22).

`hatirlatma.test.ts` · *"son kullanıma 24 saatten az kalınca ayrı bir
hatırlatma gidiyor"* dönüşümlü davranıyordu: bir tam koşu yeşil, bir
sonraki kırmızı. Ü230'da aynı dosyadaki bir belirsizlik SMS tavanına
bağlanmıştı; **bu ondan başka bir şey çıktı.**

### Mekanizma

Hatırlatma adayları şöyle seçiliyor (`domain/hatirlatma.ts`):

```
ORDER BY c.activates_at    -- en eski kupon önce
LIMIT 50                   -- KOSU_TAVANI
```

Fikstür kuponu `activates_at = now() - 1 dakika` ile yazılıyordu, yani
**sıranın en sonundaydı**. Testler ile uygulama aynı veritabanını
paylaşıyor; demo tohumu ve simülasyon bekleyen kupon biriktiriyor.
Kuyruk elliyi geçtiği anda testin kendi kuponuna sıra hiç gelmiyor ve
test 1 beklerken 0 buluyor — **koda hiç dokunulmadan.**

Dönüşümlü olmasının sebebi de bu: her koşu kuyruktan elli tane
eritiyor, kuyruk ellinin altına inince test yeşile dönüyordu.

Ölçüldü: kuyruk **340** kupondu, koşu tavanı 50.

### A/B ile kanıtlandı

Kuyruk 80'e sabitlenip iki fikstür de denendi:

| fikstür | kuyruk | sonuç |
|---|---|---|
| `now() - 1 dakika` (eski) | 80 | ✖ düştü |
| `now() - 90 gün` (yeni) | 80 | ✔ geçti |

Doksan gün önce açılmış, yarın süresi dolan bir kupon gerçekçi bir
satır ve sıralamada hep başta. Test artık veritabanındaki birikime
bakmıyor.

⚠️ **Ürün hatası değil.** Köprü dakikada bir koşuyor: 50/dk ile
340'lık kuyruk yedi dakikada eriyor ve sıralama doğru — en eski kupon
önce gider. Kırılgan olan testti.

⚠️ Aynı kırılganlığı taşıyan iki test daha var (`reminder_active` = 1
bekleyenler); fikstür ortak olduğu için onlar da düzeldi.

**Üç tam koşu üst üste yeşil: 690 test, 0 düşen, 0 atlanan.**

---

## ⬅️ Ü238 · İkonlar referanstan yeniden: neon karo — 2026-09-22

✅ Commitlendi (2026-09-22).

Ü237'nin altı turu ürün sahibini tatmin etmedi (*"hepsi berbat oldu"*).
Önce eskiye dönüldü — Blok Blast ve Tetris'in ikonları `git checkout`
ile geri alındı, yılan ve bıçak yeni hâliyle kaldı. Sonra ürün sahibi
bir **referans görsel** verdi ve iş oradan yürüdü.

### Referans zinciri ilk turda tuttu

Referans tek görselde beş ikon taşıyordu: koyu lacivert zemin, neon
çerçeveli yuvarlak kare karo, canlı renkler, hareket ve kıvılcım.
Karolar kesildi, kareye tamamlandı ve her biri fal'a **görsel
referans** olarak verildi (`flux/dev/image-to-image`, strength 0,42).

🔴 **Ders:** Ü237'de aynı iş metinle tarif edilerek altı tur denendi ve
tutmadı. Referans görselle **tek tur** yetti. [[gorsel-uretim-dersleri]]
bunu zaten yazıyordu; sıra ona en sonda geldi.

### ⚠️ `blok` iş ortasında krediye takıldı, sonra tamamlandı

`{"detail":"User is locked. Reason: TOP_UP."}` — dördü geçmiş,
beşincisi düşmüştü. Geçici çözüm olarak `blok` doğrudan referans
karosundan alındı (325→256, küçültme olduğu için kayıpsız). Ürün
sahibi kredi yükleyince öbür dördü gibi üretildi: **beşi de fal
çıktısı**, hiçbiri referansın kendisi değil.

### İkonların saydamlığı kalktı, kartın beyaz kutusu da

Her ikon artık kendi zemini ve çerçevesiyle gelen bir uygulama ikonu.
Kartta 64 piksellik **beyaz** kutunun ortasında 36 piksel duruyorlardı;
karo hem küçülüyor hem kendi neon çerçevesi beyazın içinde
kayboluyordu — kutunun içinde kutu. Beyaz zemin kaldırıldı, karo
kutunun kendisi oldu (`karusel.tsx`).

⚠️ `overflow-hidden` şart: karonun köşeleri görselin içinde yuvarlak
ama dışında koyu lacivert alan var; kırpılmazsa köşelerde o lacivert
görünür.

⚠️ Üretim betiği de ikiye ayrıldı: alfası olan kaynak eskisi gibi
kırpılıp paylanıyor, **tamamı opak** olan karo olduğu gibi
ölçekleniyor. Karoya pay eklenseydi çerçevesinin etrafında boşluk
kalırdı.

---

## ⬅️ Ü237 · Oyun ikonları tek dile geçti — 2026-09-22

✅ Commitlendi (2026-09-22).

*"Tüm oyun ikonlarını da fal ai'ye tasarlat, ortak bir dil olsun."*
`FAL_KEY` ortamda hazırdı. Beş oyunun beşi de artık üretilmiş ikonla
geliyor; elle çizilmiş SVG oyun ikonları silindi.

### 🔴 Altı tur boşa gitti, sonra yöntem değişti

| tur | model | sonuç |
|---|---|---|
| 1 | flux/dev | en tutarlı set; `dusen` bot, `sekme` ay gibi |
| 2 | flux/dev | beyaz çıkartma kenarı; `blok` artı işaretine döndü |
| 3 | flux/dev | 36 pikselde yalnızca `yilan` okunuyor |
| 4 | recraft · 2d_art_poster | ikon değil **poster** üretti |
| 5 | recraft · roundish_flat + handmade_3d | biri arka planlı illüstrasyon, diğeri oyun hamuru |
| 6 | flux/dev, 1. turun stili | 3/5 iyi; `sekme` ve `bicak` yine yanlış |

Ürün sahibi 6. turu görüp *"bıçak olmuş ancak bu iki ikon olmamış"*
dedi ve doğru iki ikonu işaret etti.

**Bulgu:** `sekme` ve `dusen` metinden üretime direniyor çünkü ikisi de
bir **uzamsal ilişki** anlatıyor — "topun üstünde tuğla sırası",
"duvarın üstünde düşen parça". Model nesneleri kusursuz çiziyor ama
ilişkiyi kurmuyor: tuğlalar topun tepesine taç oluyor, düşen parça
duvara karışıyordu. Kaç tur denenirse denensin aynı yere düşüyor.

**Çözüm — ilişkiyi model değil kod kuruyor.** Küp ve top *tek tek*
üretildi (aynı stil cümlesiyle, saydam zeminde), yerleşim Python'da
yapıldı. `bicak`ta gerekmedi: orada tek nesne var.

### 🔴 İlk dizilim de yetmedi — ürün sahibi haklıydı

*"Yine bu ikisi olmamış, berbat olmuş. Ne olduğunu bile anlamadım,
clock mu Tetris mi? Daha oyunu anlatan olmalı."*

Doğruydu. İlk dizilimde üç ikon da **aynı malzemeden** (tek renk küp
öbeği) kuruluyordu ve hiçbiri kendi oyununu söylemiyordu. Ürün sahibi
ne istediğini tarif etti ve birebir uygulandı:

| oyun | istenen | işareti |
|---|---|---|
| blok | *"renkli bloklar"* | dokuz tonlu küp kümesi |
| dusen | *"havadan gelen bir blok"* | havadaki tek parça + hız çizgileri |
| sekme | *"küpler ve top oraya gidiyor gibi"* | küp duvarı + top + topun yolu |

**Renkler üretilmedi, türetildi.** Dokuz küp tek bir küpün tonu
kaydırılarak yapıldı (`renkli-kup.py`): model her üretimde biraz başka
bir küp çiziyor ve beş ikonun küpleri birbirini tutmuyordu. Parlama
(düşük doygunluk) dokunulmadan bırakıldı — ton kaydırılsaydı beyaz
parlama da renklenir, küp plastik olmaktan çıkardı.

⚠️ Küpler arasındaki adım küpten **küçük**: bindirme olmadan ekranda
ayrı zarlar duruyordu, tek parça okunmuyordu.
🔴 Hız çizgileri ve topun yolu önce düz beyazdı ve **açık zeminde
kayboldu** — ikon kartta beyaz yuvarlak kutunun içinde duruyor.
Küpler iki zeminde de okunuyor çünkü koyu konturları var; çizgiler de
aynı reçeteye geçti: koyu kontur + nane çekirdek. İki zeminde de
ölçüldü.

### Ölçüm: 36 pikselde okunuyor mu

Asıl soru buydu ve her turda 36 piksele rasterlenip bakıldı. Ürünün
ikonu **en fazla 36 pikselde** çiziliyor; büyük boyda güzel duran
yumuşak 3B render orada lapa oluyor. Beş ikonun beşi de artık ayrı
siluete sahip: küme · parça+duvar · sıra+top · yılan+elma · bıçak+kütük.

### Elle çizilmiş ikonlar silindi

`oyuncu-ikon.tsx` içinde dört SVG bileşen duruyordu. Ü187'de ikisi
listeden çıkarılmış ama *"yeni bir oyunun ikonu üretilene kadar
gerekebilirler"* diye bırakılmıştı — ve Ü221'de bu sığınak gerçekten
işe yaradı. Artık beş oyunun beşinin de üretilmiş ikonu var: sığınağın
koruduğu durum yok, dördü de çağrılmıyordu. Depo kuralı gereği
silindiler (~5.000 karakter).

⚠️ `URETILMIS` kümesi kaldı ve yeni oyun eklenince **oraya da bir
satır** gerekiyor; Ü221'de unutulan yer orası.

---

## ⬅️ Ü236 · Bıçak elle oynandı, Sekme'nin kılavuzu bulundu — 2026-09-22

✅ Commitlendi (2026-09-22).

Ürün sahibi Bıçak'ı ilk kez ekranda görüp altı madde saydı. Beşi
yapıldı, biri açık kaldı.

### Bıçak — yerleşim baştan yanlıştı

*"Bıçaklar çok daha aşağıdan gelmeli, kullanıcı her ekrana
dokunduğunda bıçak fırlamalı."* Haklıydı: kutu ekranın ortasındaydı ve
sıradaki bıçak kütüğün **2 piksel** altında duruyordu. Fırlatma diye
bir şey görünmüyordu; üstte de dev bir boşluk vardı.

Referansın yerleşimine geçildi: kütük sahnenin %36'sında, bıçak
ekranın dibinde (`HAZIR_UZAK`), arada gerçek bir yol var. Uçuş mesafesi
**elle yazılmıyor**, yerleşim sabitlerinden türüyor (`UCUS`) — kütüğün
yeri değişirse bıçak yolun ortasında belirmesin.

⚠️ Uçan bıçak ayrı bir öge değil, **saplanan bıçağın kendisi**: ayrı
bir "uçan bıçak" ögesi motorun saplanma anı ile ekrandaki varış anını
iki ayrı gerçeğe bölerdi.

### Bıçak — bölüme göre malzeme

*"İleri bölümlerde tahta, bıçak türü değişmeli."* Dört kütük (meşe ·
ceviz · buz · obsidiyen) ve üç bıçak (çelik · bakır · gece). Döngüler
farklı uzunlukta, yani aynı ikili on iki bölümde bir tekrarlıyor.

⚠️ Tamamen sunum: motor bölümü biliyor, malzemeyi bilmiyor.
⚠️ Altın yok — ödül her yerde altın (Ü203 · Ü207) ve altın bir kütük
üstündeki paketi yutardı.
🔴 Buz kütüğü ekranda sınanıp **koyultuldu**: 7. bölümde çelik bıçakla
eşleşiyor (4 ve 3'lük döngülerin kesişimi) ve açık mavi kütükte açık
gri bıçak, tam duvarın geldiği bölümde okunmuyordu.

### Bıçak — hız rampası dikleştirildi

*"Zorluk arttıkça tahtanın dönme hızı da artmalı."* Artıyordu ama
hissedilmiyordu: `18 + tur*3` ile tur boyunca hız ancak bir buçuk
katına çıkıyordu. `20 + tur*4` oldu — iki katından fazla.
⚠️ Duvarı değiştirmiyor (hızın duvarla ilgisi olmadığı Ü235'te
ölçülmüştü); değişen şey turun hissi. Ölçüm tekrarlandı: duvar yine
7. bölümde, tavan yine ~2.270.

### 🔴 Sekme'nin nişan çizgisi hiç görünmüyordu

*"Kullanıcı parmağını geri çekerek yönünü belirtiyor ya, o çizgi çizgi
olacak şekilde belli olmalı."*

Kesik çizgi ilk günden beri vardı. Önce "ince" sanıldı: boy 44'ten
92'ye çıkarıldı, kalınlaştırıldı — **ekranda hiçbir şey değişmedi.**

DOM'dan ölçüldü: çizginin uzunluğu **1,84 viewBox birimi**, yani
ekranda **5×5 piksel**. Sebep hesapta duran bir `* 0.02` çarpanıydı;
`olcek` zaten vektörü `uzunluk` birime normalleştiriyor, sonraki
çarpan onu elliye bölüyordu. `uzunluk` sabiti **hiçbir zaman işe
yaramamıştı.**

Şimdi 62 birim, 2,4 px kalınlık, altında parıltı, ucunda nokta —
ölçüldü: 178×164 piksel.

**Ders: "ince duruyor" diye kalınlaştırmadan önce ölç. Sayıyı
büyütmek, sayının hiç kullanılmadığı bir hatayı gizler.**

---

## ⬅️ Ü235 · Beşinci oyun: Bıçak — 2026-09-22

✅ Commitlendi (2026-09-22).

Ürün sahibinin istediği beş oyunun ilki. Referans: Ketchapp'in **Knife
Hit**'i (`play.google.com/store/apps/details?id=com.ketchapp.knifehit`).
Sıra ürün sahibinin seçimi: *"Önce ödül, sonra teker teker."* Ödül
Ü234'te bitmişti.

### Neden bu oyun determinizme uygun

Sekme'de (Ü217) `Math.cos`/`sin` sorunu gömülü yön tablosuyla
çözülmüştü. Burada sorun hiç doğmuyor: oyunun tamamı **açı**. Kütüğün
yeri bir sayı, bıçakların yeri birer sayı, çarpışma iki açının farkı.
Trigonometri yalnızca **çizimde** var ve çizim tekrar oynatılmıyor.

Açı birimi **onda bir derece** (0–3599): saniyede 20 tick ve tur başına
900 birim hızda derece kesirli olurdu.

### Girdi: sözleşmenin beşinci biçimi

| oyun | girdi | zaman |
|---|---|---|
| blok | (teklif, satır, sütun) | yok |
| düşen | (tick, hareket) | var |
| sekme | (atış no, açı) | motorun içinde |
| yılan | (tick, yön) | var + ödül işareti |
| **bıçak** | **(tick)** | **girdinin tamamı zaman** |

Oyuncunun yaptığı tek şey *ne zaman* dokunduğu; nereye dokunduğu oyunda
yok. Sözleşmeye hiçbir şey eklenmedi.

### 🔴 Duvarın sebebi iki kez yanlış teşhis edildi

Ü83'ün kuralı: *"kazanarak biten bir tur yok."* İlk yazımda bölüm
başına bıçak `min(12, 4 + tur*2)` idi ve **mükemmel oynayan bot hiç
ölmüyordu** — 24–30 bin puan. Sebebi sırayla iki şeye yüklendi,
ikisi de ölçümle çürüdü:

| teşhis | ölçüm | sonuç |
|---|---|---|
| *"`CAKISMA` 130, kapasite 27"* | 130 ile de duvar **b7**'de | ✗ |
| *"hız büyüyor, tick ızgarası kabalaşıyor"* | `EN_HIZLI` 22 ile de **b7** | ✗ |
| **bölüm başına bıçak tavanı** | `min(12,…)` → bot **b68** | ✓ |

Bağlayıcı olan **paketleme**: bıçak dönen kütüğe tick ızgarasından
atılıyor, boşluğun tam ortasına konamıyor. Boşluklar her atışta biraz
daha bozuk bölünüyor; ölçülen pratik sınır **16–17 bıçak**. Tavan
(`KAPASITE` = 18) o sınırın üstünde kaldığı sürece duvar geliyor.

Ölçülen ritim (40 tohum, tam tur tarayan bot): duvar **7. bölümde**
(kırk tohumun kırkında da), tavan **~2.270 puan** — öbür oyunlarla aynı
mertebede. Kupon eşiği (500) 3. bölümün bitiş primiyle geçiliyor
(122 + 172 + 230 = 524), yani paket 4. bölümde beliriyor.

**Beceri eğrisi** (200 tur, zamanlama sapmasına göre eşiği geçen oran):

| oyuncu | ortalama | eşiği geçen |
|---|---|---|
| ±6 tick | 408 | %10 |
| ±3 tick | 538 | %30 |
| ±1 tick | 841 | %84 |
| sapmasız | 1.916 | %98 |

### 🔴 Test yanlış yeşil yandı — bekçi düzeltildi

İlk yazdığım duvar testi 30 tick ileri bakan bir botla çalışıyordu ve
bozuk sürümde de **geçti**: zayıf bot zaten 5. bölümde ölüyor, duvara
hiç varmıyordu. Bot bir **tam tura** (200 tick — en yavaş bölümde bir
devir) çıkarıldı; artık `min(12,…)` regresyonunda tur bitmiyor ve test
düşüyor. Doğrulandı: bozuk sürümde kırmızı, doğru sürümde yeşil.

### 🔴 Beşinci oyun görev rotasyonunu bozdu — test öngörmüştü

`challenge.ts`teki not aynen şunu diyordu: *"Beşinci oyun eklendiğinde
bu sessizce bozulur — `tests/challenge.test.ts` onu bekliyor."* Öyle
oldu: havuz 5, oyun 5, OBEB 5. Ekranda hiçbir şey görünmezdi; yalnızca
her oyun sonsuza kadar aynı görevle eşleşirdi.

Havuz altıya çıktı (`cesit3` · 100 XP): OBEB(6, 5) = 1, döngü 30 gün.

⚠️ **Kalan dört oyunda yeniden bakılacak:** 6 oyunda OBEB 6, 8'de 2,
9'da 3 — üçü de bozuk.

### Yan bulgu: "çeşit" görevi imkânsız olabiliyordu

Kafe oyun kapatabiliyor ve tek sınır *"en az bir oyun açık kalmalı"*.
İki oyun bırakan bir kafede *"3 farklı oyun"* tamamlanamazdı — ilerleme
2'de kalır, XP hiç yazılmazdı. Delik `cesit3` ile açılmadı, `cesit2`
ile zaten vardı (tek oyunlu kafede). Hedef artık kafenin **açık oyun
sayısıyla** sınırlanıyor.

### Dokunulan yüzeyler

| yüzey | ne oldu |
|---|---|
| `oyunlar/bicak.ts` | motor (yeni) |
| `arayuz/bicak-ekran.tsx` · `bicak-yuzey.ts` | ekran ve yüzey (yeni) |
| `oyunlar/index.ts` · `arayuz/index.tsx` | iki kayıt defteri |
| `oyunlar/katalog.ts` | "Yetişerek" kategorisi |
| `components/oyuncu-renk.ts` | palet **nane** ile genişledi |
| `components/oyuncu-ikon.tsx` · `oyuncu-gorsel.tsx` | ikon ve kart çizimi |
| `app/globals.css` | `bicak-sapla` · `bicak-hazir` |
| `domain/challenge.ts` | havuz 6, çeşit hedefi sınırlandı |
| `scripts/simulasyon-botlar.ts` | bot |
| `tests/oyun-motoru.test.ts` | duvar · paket · girdi · saat |

### Palet çarktan genişledi

Yedi tonun hepsi tutuluydu: beşi oyunlarda, ikisi (kahve, amber) kupon
kategorilerinde — `oyuncu-renk.ts` bunları oyun rengi olarak kullanmayı
açıkça yasaklıyor. Yeni ton uydurulmadı, **çarkın dilim listesinden**
alındı (nane `#5eead4`). Kalan dört oyun için çarkta krem, sarı ve
lavanta duruyor; beşincisi için çarkın kendisi büyümek zorunda.

### Açık kalanlar

- Ekran **hiç gerçek cihazda oynanmadı** ve tarayıcıda da görülmedi
  (oyun ekranı giriş istiyor). Dönüş geometrisi ölçülmedi.
- Katalog sahnesi (`public/oyun/bicak-512.webp`) yok — görsel üretimi
  ürün sahibinin onayına bağlı. Sekme'de de aynı boşluk duruyor.
- Sesler duyulmadı.

---

## ⬅️ Ü234 · Ödül dağıtımı tek kurala indi — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi beş yeni oyun isterken şunu ekledi: *"bunların da ödül
dağıtma algoritmasını tüm oyunlarla birlikte eksiksiz ve doğru
kurmalıyız."* Denetim **iki ayrı ekonomi** buldu.

### 🔴 Bulgu: Yılan ötekilerden kolay kupon veriyordu

| oyun | ödül yolu | eşiği atlıyor mu | düşme şansı payı |
|---|---|---|---|
| blok · dusen · sekme | paket (`odul.ts`) | hayır | — |
| **yilan** | `odulIsareti` (Ü91) | **evet** | **+0,35** |

Yani aynı kafede Yılan oynayan müşteri **480 puanla** kupon alabiliyor,
Blok oynayan 500'e ulaşmak zorunda kalıyordu. Üstüne düşme şansı 0,35
puan artıyordu.

### Karar: tek kural — eşik

- [x] **`basariliMi` kısayolu kalktı** ✅ — `odulIsareti` parametresi
  **silindi**, varsayılanla bırakılmadı: `basariliMi(skor, 1)` yazan
  bir çağrı sessizce eski davranışa dönerdi, şimdi derlenmiyor.
- [x] **`ODUL_ISARETI_PAYI` 0,35 → 0** ✅ — sabit kayıt için duruyor.
- [x] **🔴 Yılan'ın altın yemi artık EŞİKTEN SONRA beliriyor** ✅ —
  kapıyı kapatmak tek başına yetmezdi: eşiğin altında beliren ama
  hiçbir şey kazandırmayan bir altın yem **yalan söyleyen** bir nesne
  olurdu (Ü91'in *"mekaniği yalan çıkarır"* uyarısı bu kez ters
  yönden). Ötekilerle aynı: ödül bir **teslimat anı**, tur başına bir
  kez (`odulSirasiGeldi`).
  ⚠️ `ODUL_ILK_YEM` ve `ODUL_YUZDE` korundu: eşik geçilse bile ödül
  hemen çıkmıyor. Anında çıksaydı "teslimat" değil "otomatik ödeme"
  gibi okunurdu.

### Testler

- [x] **Dört oyun da kare kare sınanıyor** ✅ — her adımda "ekranda ödül
  varken skor eşiğin altında mı" sorusu. Tek kare bile öyleyse o oyun
  ötekilerden kolay demektir.
- [x] **Kaynak taraması** ✅ — `basariliMi`nin gövdesinde `odulIsareti`
  geçerse test düşüyor. Parametre silindiği için yanlış çağrı zaten
  derlenmiyor ama biri parametreyi geri koyarsa derleme yine geçerdi.
- [x] **`dusmeSansi` işareti görmüyor** ✅

⚠️ **Kendi testimde hata buldum ve düzelttim:** okuyucular `!= null`
ile yazılmıştı, oysa `odulParcasi` bir **boolean** — `false != null`
doğru döndüğü için her kare "ödül var" sayılıyordu. Test 1543 hatalı
kare bildirdi, ürün hatasızdı. Yanlış okuyucu yeşil yanan testten daha
kötü: var olmayan bir hatayı kovalatıyor.

**686 test · 686 geçti** (iki ardışık koşu) · tsc/eslint/derleme temiz.

### Beş yeni oyun — durum

Ürün sahibinin sırası: **önce ödül, sonra teker teker.**

- [x] **Balon patlatma** — referans açıldı
  (`sites.google.com/view/ooyna/oyun/balon-patlatma`): bubble shooter.
  ⚠️ Mekanik olarak **Sekme'ye çok yakın** — ikisinde de aşağıdan
  yukarı nişan alıp ızgaraya atılıyor; farkı, blok canı yerine üç aynı
  rengin patlaması. Katalogda yan yana "aynı oyun" gibi okunabilir.
- [x] **Hafıza oyunu** — ürün sahibinin gönderdiği karede duruyor
  (Google'ın hafıza oyunu, deniz canlıları).
- [ ] **Knife hit** — referans yok
- [ ] **Blok kırıcı** — referans yok
- [ ] **Bahçe cüceleri** — referans yok

⚠️ Verilen üç Google bağlantısı **birbirinin aynısı** ve Google bot
koruması veriyor (HTTP 429). CAPTCHA aşılmadı. Bu üç oyun için doğrudan
bağlantı gerekiyor.

---

## ⬅️ Ü233 · Damga ve itiraz bölümleri mobilde düzenlendi — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi: *"bu kısım mobilde çok düz duruyor, çok görselsiz, sadece
yazı ve karmaşık."* Ü232 bu iki bölüme masaüstünde görsel eklemişti;
**dar ekranda ikisi de hâlâ yazı duvarıydı.**

### Damga karşılaştırması · tekrar eden etiketler simgeye döndü

Dar ekranda her satır şuna dönüşüyordu: konu → **DAMGA KARTI** → cümle
→ ayraç → **LOOPLY** → cümle. Altı satır = on iki metin bloğu ve
aralarında yirmi dört kez tekrar eden iki etiket.

- [x] **Etiketler simgeye çevrildi** ✅ — kâğıt kart ve telefon. İkisi
  de bölümün başındaki görselde duran nesnelerin küçüğü; okuyucu
  bağlantıyı kendiliğinden kuruyor.
- [x] **Ayraç çizgisi kalktı** ✅ — iki simge zaten iki tarafı
  ayırıyordu; çizgi altı satırda tekrar eden fazladan bir yatay
  çizgiydi.
- [x] **🔴 ✓/− KULLANILMADI** ✅ — sayfanın reklam karşılaştırmasında o
  işaretler var ama orada iddia "öteki daha kötü". Burada bölümün
  kendi cümlesi *"doğru bir araç ve çalışıyor"*; kâğıt kartın yanına
  eksi koymak bölümü görselle yalanlamak olurdu. Simgeler **tarif
  ediyor**, hüküm vermiyor.
- [x] **Etiket metni `sr-only` olarak duruyor** ✅ — simge
  `aria-hidden` ve ekran okuyucuda iki cümlenin hangisine ait olduğu
  belli olmalı.

Ölçüldü: aynı ekranda önce iki satır görünüyordu, şimdi dört.

### Kafenin aklından geçenler · dev tırnak

- [x] **Her karta soluk dev tırnak** ✅ — altı kart tek sütuna dizilince
  hepsi birbirinin aynısıydı (beyaz kutu, kalın soru, gri cevap) ve göz
  tutunacak yer bulamıyordu.
- [x] ⚠️ Tırnak **süs değil işaret**: kartlardaki cümleler işletmecinin
  ağzından çıkan itirazlar ve metin zaten tırnak içinde yazılı.
- [x] ⚠️ İlk denemede %7'ydi ve ekranda görünmüyordu; %11'e çıkarıldı.
- [x] ⚠️ **İkon uydurulmadı** — altı itirazın her birine ayrı simge
  çizmek soruların kendisini süse çevirirdi.

**684 test · 684 geçti** · tsc/eslint/derleme temiz · 390 pikselde
yatay taşma yok.

---

## ⬅️ Ü232 · Orta bölümler görselleştirildi — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi *"Nasıl çalışır"*tan *"Ölçüm"*e kadarki bloğu gösterip
*"bu kısmı görselleştir"* dedi. Ortak kusur aynıydı: **hepsi yalnızca
yazıydı** ve birkaçı kendi iddiasını görselle çürütüyordu.

### Nasıl çalışır · yedi adım

- [x] **Her adıma kendi simgesi** ✅ — kartları ayırt eden tek şey
  numaraydı; göz bir duvar görüyordu.
- [x] Simgeler ürünün kendi setinden: gerçek karekod, kumanda, çark,
  bilet, hediye. **İkisi burada çizildi** çünkü sette yoktu —
  bekleme (kadran) ve hatırlatma (zil), aynı düz konturlu dilde.
- [x] ⚠️ Numara **kaldırılmadı**, simge yanına geldi: numara sırayı,
  simge adımın ne olduğunu söylüyor. Bölümün tek iddiası zaten o sıra.
- [x] ⚠️ Karekod 26 değil 30 piksel: yoğun bir desen, aynı boyda öbür
  simgelerden optik olarak küçük duruyordu.

### Damga kartı · iki araç yan yana

- [x] **Kâğıt damga kartı ile gerçek kupon kartı yan yana** ✅ — altı
  satır karşılaştırma yapan bölüm hiçbirini göstermiyordu.
- [x] ⚠️ Damga kartı **kötülenmedi**: dolu, düzgün, işleyen bir kart
  çizildi (on kutucuk, altısı damgalı). Yarım yamalak bir kart,
  bölümün *"doğru bir araç ve çalışıyor"* cümlesini görselle
  yalanlardı.
- [x] ⚠️ Kâğıt kart ürünün kart dilini (koyu zemin, desen,
  illüstrasyon) **kullanmıyor**: kâğıt kâğıt gibi duruyor. Damga
  simgesi ürünün kendi fincan çizimi (`Gorsel ad="icecek"`).

### Ek satış · üç gerçek kupon

- [x] **Üç kartın üçünde de ürünün gerçek kupon kartı** ✅ — metin
  *"ürün müşterinin baktığı ekranda duruyor"* diyordu ve o ekranı
  göstermiyordu.
- [x] ⚠️ Kupon türü uydurulmadı: cheesecake → `tatli`, yeni içecek →
  `soguk`, happy hour → `icecek`. Renk ve illüstrasyon türden türüyor.
- [x] ⚠️ Kart `scale` ile küçültülüyor, yükseklik zorlanarak değil:
  `Bilet` sabit 124 piksel ve illüstrasyonun taşma kadrajı ona ayarlı.

### Ölçüm · panelin kendisi

- [x] **Gerçek panel raporu, listeden ÖNCE** ✅ — *"cevabı panelde
  duruyor"* diyen bölüm paneli göstermiyordu. Önce "işte o panel",
  sonra "içinde şunlar var".
- [x] **🔴 Altın çerçeve ilk denemede BASILMADI** — `overflow-hidden`
  çocuğun gölgesini kırpıyor. Çerçeve dış kaba alındı. Aynı tuzağa
  Ü218'de üçgen bloklarda düşülmüştü (`clip-path` gölgeyi kırpar).

### Dokunulmayan

**"Kafenin aklından geçenler"** metin olarak bırakıldı: altı itirazın
her birine simge uydurmak, soruların kendisini süse çevirirdi. Cevaplar
zaten açıkta ve okunuyor.

**684 test · 684 geçti** · tsc/eslint/derleme temiz · 390 · 820 · 1440
piksellerde sayfa baştan sona gezildi, yatay taşma yok.

---

## ⬅️ Ü231 · "Dürüst olalım" bölümü tamamen kaldırıldı — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi: *"bu kısım hiç olmasın, kaldır bunu, bu çok saçma bir
başlık."*

- [x] **`vitrin-kanit.tsx` SİLİNDİ** ✅ — dosya bırakılmadı (deponun
  kuralı: çağrısız kod bırakılmıyor). Üç görsel — yelpaze ekranlar,
  simülasyon çubukları, dört alan → karekod → onay — git geçmişinde
  Ü229 turunda duruyor.
- [x] Üst menüde bu bölümün durağı zaten yoktu; **kırık çapa yok**
  (altı durağın hepsi DOM'dan doğrulandı).
- [x] **684 test · 684 geçti** · tsc/eslint/derleme temiz · yatay taşma
  yok.

### Bu bölümün geçmişi — üç turda üç karar

| tur | karar |
|---|---|
| Dalga 8 | sosyal kanıt yuvası olarak açıldı: gerçek müşteri yok, uydurma referans yerine "doğrulanabilir olan" üç madde |
| Ü228 | kaldırıldı |
| Ü229 | görselleştirilerek geri geldi |
| **Ü231** | **başlığı yüzünden tamamen çıktı** |

⚠️ **Yuva boş.** İlk gerçek kafeler geldiğinde asıl sosyal kanıt
buraya gelecek; uydurma referans / şişirilmiş sayı yasağı (Dalga 8) o
gün de geçerli.

⚠️ Bölümün taşıdığı **kural** kaldırılmadı: *"söylediğimiz her şey
üründe doğrulanabilir"* Ü228'de `vitrin-olcum.tsx`e taşınmıştı ve
orada duruyor. Sayfanın dört dosyası ona atıf yapıyor.

---

## ⬅️ Ü230 · Test paketi kendini zehirlemeyi bıraktı — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi: *"SMS tavanı dediğin ne? Biz SMS göndermeyeceğiz, artık
SMS sistemden kalktı."*

### 🔴 İki şey karışmıştı, ikisi de düzeltildi

**1 · SMS sistemden kalkmadı.** 2026-09-20'de ertelenen şey
**sağlayıcı bağlantısı** ve başlık başvurusuydu; altyapı (giden mesaj
defteri, hatırlatma seçimi, tavan) kodda duruyor ve SSS bunu vitrinde
açıkça söylüyor: *"Şu an hayır. Hatırlatma altyapısı üründe hazır ama
gönderim kanalı henüz açılmadı."*

**2 · "Tavan" bir ürün özelliği değil, emniyet.** G14: günde en fazla
2000 gönderim. Bir hata ya da saldırı binlerce mesaj attıramasın diye
var; %90'da yeni kayıt durur, giriş devam eder.

### Asıl kusur: testler kendi tavanlarını dolduruyordu

Tavan şunu sayıyor:

```sql
SELECT count(*) FROM sms_outbox
 WHERE status = 'sent' AND created_at > now() - interval '1 day'
```

Paketteki **her** giriş/kayıt testi gerçek bir satır yazıyor; tohum ve
simülasyon da yazıyor. `hatirlatma.test.ts` yalnızca kendi
satırlarını (`sms_htr_%`) siliyordu, geri kalanlar birikiyordu. Paket
birkaç kez koşturulunca sayaç 2000'e dayanıyor, hatırlatma
yazılamıyor ve testler 1 beklerken 0 buluyor — **koda hiç dokunmadan.**

- [x] **`beforeEach` artık sayılan pencereyi de sıfırlıyor** ✅ —
  yalnızca son bir günün `sent` satırları; tablo temizlenmiyor.
  Kapsam dışı satır silmek bu pakette zaten kurulu bir kalıp (bir
  satır yukarıda `rate_limits` tamamen siliniyor).
- [x] **İki ardışık tam koşu: 684/684 · 0 düştü** ✅ — önceki hâlinde
  ikinci koşu 3 düşüyordu.
- [x] Ü227'de açılan *"testler ayrı veritabanı istiyor"* maddesi
  **kapandı** — asıl sorun paylaşılan veritabanı değil, testin kendi
  bıraktığı artıktı.

⚠️ Madde 37 (`sms_outbox` saklama süresi) **açık kalıyor**: tabloda
7.500'den fazla satır var ve genel temizlik kararı hâlâ verilmedi. Bu
düzeltme yalnızca testin saydığı pencereyi ilgilendiriyor.

---

## ⬅️ Ü229 · "Dürüst olalım" görselleştirilerek geri geldi — 2026-09-21

> ⏸️ **Ü231'de GEÇERSİZ:** bölüm tamamen kaldırıldı. Aşağısı kayıt için duruyor.

✅ Commitlendi (2026-09-22).

Ürün sahibi bölümü tekrar göndererek *"bu kısmı da daha da
görselleştirmeliyiz"* dedi. Bölüm bir tur önce (Ü228) yine onun
kararıyla kaldırılmıştı; geri getirildi ve **kaldırılmadan önceki
hâlinden farklı** döndü.

### 🔴 Kanıt bölümünün kanıtı yoktu

Üç iddia ediyordu ve üçünü de yalnızca **yazıyordu** — yani
*"ekranlarımız gerçek"* diyen bir bölüm hiçbir ekran göstermiyordu.
Bir kanıt bölümünün kanıtsız olması, bölümün kendi iddiasına düşen en
kötü hata.

Her kartın üstünde artık iddiasının karşılığı duruyor
(`vitrin-kanit.tsx`):

- [x] **"Ekranların hepsi gerçek"** → yelpaze gibi açılmış üç gerçek
  ekran görüntüsü (çark · oyuncu paneli · Ödüllerim). Ü221'de hepsi
  çalışan uygulamadan yeniden çekilmişti; burada aynı dosyalar.
- [x] **"Hesabı sen yapıyorsun"** → simülasyonun **kendi** oynayan
  çubukları (`sim-cubuk`, `sim-yuzde`) ve kendi etiketleri. Yeni bir
  animasyon yazmak, aynı şeyin ikinci bir taklidini üretmek olurdu.
  ⚠️ Yüzde yerine *"•••"* duruyor ve bu tasarımın kendisi: rakam
  yazmama kararı Ü142'den geliyor.
- [x] **"Sözümüz dar"** → dört alan → **gerçek** karekod → kasada onay.
  Karekod `Karekod` bileşeninin ürettiği okunabilir bir kod, dokuz
  kutucuklu soyut desen değil (aynı karar Ü154'te kaydırmalı sahne
  için verilmişti).

⚠️ Görsel **kartın üstünde ve kendi bandında**: metnin yanına
sıkıştırılsaydı *"buraya bir ikon koyduk"* diye okunurdu (Ü181).
Bant sabit 132 piksel — üç kart farklı türde görsel taşıyor ve doğal
boyları tutmuyor.

⚠️ Bölüm `page.tsx`in içinden çıkıp **kendi dosyasına** taşındı; diğer
vitrin bölümleriyle aynı düzen.

⚠️ Ü228'de kural `vitrin-olcum.tsx`e taşınmıştı; orada kalıyor. İki
bölüm de aynı şeyi söylüyor ve tekrar değil: biri sayfanın söylediği
her şeyin doğrulanabilir olduğunu, öteki ürünün **ölçmediği** şeyi.

**684 test · 681 geçti · 3 düştü** — üçü de Ü227'de yazılı SMS tavanı
(kod değil, veritabanı durumu). Mobil ve masaüstünde yatay taşma yok.

---

## ⬅️ Ü228 · İki bölüm kaldırıldı — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi iki bölümü göstererek *"bunu kaldıralım / bunu da
kaldıralım"* dedi.

### 1 · *"Sorun — Kafenin müşterisi geliyor. Ama sonra ne oluyor?"*

- [x] **`vitrin-itiraz.tsx` SİLİNDİ** ✅ — dosya bırakılmadı. Bu deponun
  kendi kuralı: *"çağrısız kod bırakmak dört kez düşülen tuzağın ta
  kendisi — duruyor, derleniyor, kimse çalışmadığını fark etmiyor."*
  Geri gerekirse git geçmişinde duruyor.
- [x] **Üst menüden *"Sorun"* durağı çıktı** ✅ — hedefi olmayan bir
  bağlantı tıklayanı sayfanın ortasına atardı. Altı durak kaldı;
  hepsinin hedefi DOM'da doğrulandı (kırık çapa yok).
- [x] **Ü200'ün soru–cevap çifti kaygısı kendiliğinden çözüldü** ✅ —
  soru bölümü gidince `VitrinDongusu` havada kalan bir cevabı değil,
  kendi başına duran bir anlatıyı taşıyor. (Ü227'de maskot araya
  girdiği için bu kaygı açık bir bedeldi; artık yok.)
- [x] **Argüman tamamen kaybolmadı** ✅ — *"reklamdan sonra ne oluyor"*
  reklam karşılaştırması bölümünde, indirim ölçümü **Ölçüm**
  bölümünde duruyor.

### 2 · *"Dürüst olalım — Burada müşteri yorumu görmeyeceksin."*

- [x] **`SosyalKanit` ve `Kanit` `page.tsx`ten silindi** ✅
- [x] **🔴 Bölümün taşıdığı KURAL kaldırılmadı, taşındı** ✅ —
  *"söylediğimiz her şey üründe doğrulanabilir"* cümlesi Dalga 8'den
  beri o bölümün başındaydı ve sayfanın dört ayrı dosyası ona atıf
  yapıyordu (`vitrin-loopy`, `vitrin-itirazlar`, `vitrin-yaklasma`,
  `vitrin-olcum`). Kural artık `vitrin-olcum.tsx`te yazılı — ürünün
  sınırını (ciro ölçülmüyor) söyleyen bölüm, kuralın doğal evi.
  Dört atıf da güncellendi; silinen bir şeye işaret eden yorum
  kalmadı.
- [x] ~~**Sosyal kanıt yuvası boş kaldı**~~ — ⏸️ **Ü229'da GERİ ALINDI:**
  ürün sahibi bölümü görselleştirerek geri istedi. Uydurma
  referans/şişirilmiş sayı yasağı (Dalga 8) hâlâ geçerli; yuva ilk
  gerçek kafeler gelince asıl sosyal kanıtla dolacak.

⚠️ Referans dosyasında (`CafePlay_…_Final.html`) iki bölümün de
karşılığı vardı (`problem` ve `section dark`). Ü220'de içerik listesi
ona göre kurulmuştu; bu iki madde artık listeden ayrılıyor — sonraki
karar ürün sahibinin.

**684 test · 681 geçti · 3 düştü** — üçü de `hatirlatma` tarafında ve
sebebi Ü227'de yazılı SMS tavanı (kod değil, veritabanı durumu). tsc,
eslint ve derleme temiz.

---

## ⬅️ Ü227 · Maskot ile Sorun yer değiştirdi — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi: *"bunlar yer değiştirsin."* Yeni sıra:

> Bir kere gelen müşteri → **Sorun** → **Maskot** → Nasıl çalışır

- [x] **Takas uygulandı** ✅
- [x] **`VitrinItiraz` zemini fildişi → cukur** ✅ — üstündeki *"Bir kere
  gelen müşteri"* fildişi ve ikisi arka arkaya gelince tek bölüm gibi
  okunuyordu. (Ü219'da maskot tam bu ikisini ayırmak için oraya
  konmuştu; taşınınca ayırma işi zemine kaldı.) Kartları beyaz olduğu
  için bölüm renksiz zemine konamıyor.
- [x] Yeni ritim ölçüldü: `#f7f2e8` → `#f2f2f2` → beyaz → beyaz. Son iki
  beyaz yan yana ama maskot bölümünün içi kocaman bir lacivert kart,
  sınır görünüyor.

### ⚠️ Ü200'ün kuralı bilerek çiğnendi

Ü200 şunu yazmıştı: *"itiraz bölümü soruları soruyor, döngü bölümü
cevabı veriyor; araya başka bir şey girerse soru havada kalıyor."*
Yeni sırada maskot tam ikisinin arasında. Karar ürün sahibinin; bedeli
şu: *"Sorun her zaman kafenin kendisi değil…"* cümlesiyle biten bölümün
cevabı bir bölüm sonra geliyor.

### 🔴 Test paketi kendi veritabanını kirletiyor

Bu turda 3 test düştü ve **sebebi kod değil**:

```
"sms global tavan engeli","gonderilen":1800,"tavan":2000
```

Global günlük SMS tavanı (G14) `sms_outbox` içindeki son 24 saatlik
`sent` satırlarını sayıyor. Hatırlatma testleri gerçekten satır
yazıyor, yani **paketi her tam koşuş tavanı tüketiyor**; bugün beş kez
koşturuldu ve 1800/2000'e gelindi. Tavan dolunca hatırlatma
yazılamıyor, testler 1 beklerken 0 buluyor.

- [x] ~~**Testler ayrı veritabanı istiyor**~~ ✅ **Ü230'da ÇÖZÜLDÜ** —
  asıl sorun paylaşılan veritabanı değil, testin kendi bıraktığı
  artıktı. `hatirlatma.test.ts` artık sayılan pencereyi de
  sıfırlıyor; iki ardışık tam koşu 684/684.
- [ ] Madde 37 (`sms_outbox` saklama süresi) ile aynı tabloya bakıyor —
  tabloda 7.579 satır birikmiş.

---

## ⬅️ Ü226 · Sahne kutusuna altın çerçeve — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi: *"dışına çerçeve ekle ve daha dikkat çekici yap."*

- [x] **Çift katlı altın çerçeve** ✅ — 2,5 piksellik altın sınır ve onun
  **dışında** 11 piksellik soluk altın hale; altta derinleşen düşme
  gölgesi. Üçü de tek `box-shadow` zincirinde.
- [x] **🔴 `border` KULLANILMADI, `box-shadow` kullanıldı** ✅ — kenarlık
  kutunun ölçüsünü büyütür ve Ü225'te dört evrede ölçülen
  "telefonla çakışma yok" sonucu bozulurdu. Gölge yayılması düzeni hiç
  etkilemiyor; kutu 460×386'da kaldı.
- [x] **Altın tesadüf değil** ✅ — lacivert üstünde sayfanın kurulu
  eşleşmesi (`--color-odul`); üst etiketler, ölçüm kutusu ve maskot
  bölümü de bu çiftte.

İki zeminde de doğrulandı: bulanık kafe fotoğrafının üstünde (1. adım)
ve lacivert alanda (4. adım).

---

## ⬅️ Ü225 · Kaydırmalı sahne büyütüldü — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi: *"bu ekranlarda çıkan görseller ve bilgiler daha dikkat
çekici, daha büyük, daha müşteriyi okutacak şekilde olsun."*

### 🔴 Sorun boyut değil, KONTRAST'tı

Yan kutu `bg-vitrin-fildisi/95` idi ve sahnenin zemini de fildişi —
**kutu zeminle aynı renkteydi.** Arkadaki bulanık kafe fotoğrafı da açık
tonlu. Kutuyu büyütmek tek başına çözmezdi; görünmemesinin sebebi
kontrastın yokluğuydu.

- [x] **Kutu lacivert oldu** ✅ — hem fotoğrafın üstünde hem fildişi
  zeminde ayrılıyor. Sayfanın başka yerlerinde (simülasyon, maskot)
  zaten kullanılan cihaz; yeni bir dil icat edilmedi.
- [x] **Genişlik 370 → 460, dolgu 7/6 → 9/8** ✅ — 1440'ta telefonla
  çakışma yok (dört evrede de ölçüldü).
- [x] **Başlık 23 → 31, gövde 15 → 17 piksel** ✅ — üç kademeli
  (`sm`/`lg`), çünkü aynı bileşen mobildeki dar adım kartında da
  kullanılıyor.
- [x] **Adım numarası** ✅ — altın rozet. Numara boyut değil **beklenti**
  veriyor: *"dört tane var, biri bu"* diyen bir kutu bitirilmek
  isteniyor; numarasız kutu ne kadar büyük olursa olsun atlanabiliyor.
  ⚠️ Mobilde `sira` VERİLMİYOR: adım yolunun kendi rozeti zaten var ve
  ikisi birden basılınca aynı sayı kartta iki kez göründü (ilk denemede
  oldu, ekran görüntüsünde yakalandı).

### Mobildeki mini sahneler de büyüdü

Asıl küçük kalan yer orasıydı: 58 piksellik bantta telefonun içindeki
oyun ekranı seçilmiyordu.

- [x] **Bant 58 → 92 px** ✅
- [x] **Mini telefon 38×68 → 58×104 px** ✅
- [x] **Mini karekod 44 → 66 px** ✅
- [x] **Kazıma kartı 44×112 → 64×160 px** ✅ (içindeki "25 TL" 11 → 15 px)
- [x] **Sonsuz ilmeği 40×76 → 56×108 px** ✅

**684 test · 684 geçti** · tsc/eslint/derleme temiz · 390 · 820 · 1440
piksellerde sayfa baştan sona gezildi, yatay taşma yok.

---

## ⬅️ Ü224 · Seri kartı her zaman koyu — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi yeni çekilen vitrin karesine bakıp *"biz streak kartımızı da
güncellemiştik, neden eski duruyor"* dedi.

### 🔴 Kart eski değildi — YANLIŞ HÂLİ yakalanmıştı

Ü188'den beri kartın **iki hâli** var: bugün oynanmışsa sakin beyaz,
oynanmamışsa koyu kart + ateşte koşan Loopy (Ü189). Karede beyaz hâl
vardı.

⚠️ **Sebebi ölçüm hatası değil, benim hatam:** giriş yapmadan önce
misafir olarak Yılan ve Sekme oynadım; giriş yapınca o turlar hesaba
işlendi (*"kazandığın ödül sonucunla birlikte saklanır"*) ve seri bugüne
düştü, kart sakin hâle geçti. Demo tohumu zaten **bilerek** "bugün
oynanmamış" kuruyor (`tohum-demo-oyuncu.ts`: *"seri risk altında, bugün
oyna"*). `npm run db:demo` ile hesap tazelendi.

### Karar: *"her zaman böyle olsun"*

- [x] **Kart her iki hâlde de koyu** ✅ — Ü188'in *"sakin hâli beyaz
  KALIYOR"* kararı geri alındı. Gerekçe ürün sahibinin okuması: beyaz
  kart **güncellenmemiş** gibi görünüyor. Kullanıcının kartı nasıl
  okuduğu, bizim ona yüklediğimiz anlamdan önce gelir.
- [x] **Risk işareti silinmedi, TAŞINDI** ✅ — Ü188'in kaygısı
  (*"koyuya çevirmek 'bir şey yap' demenin tek işaretini silerdi"*)
  gerçekti. İşaret artık kartın renginde değil: **dalga vurgusu**
  (riskte kırmızı · sakinde altın), **cümle** ve **okun parlaklığı**
  söylüyor.
- [x] **Küçük alev simgesi kalktı** ✅ — kartta zaten kocaman bir alev
  var; Ü188'de yalnızca sakin hâlde duruyordu çünkü o hâlde büyük görsel
  yoktu.
- [x] **`oyuncu-panel.png` yeniden çekildi** ✅ — 14 günlük seri, risk
  hâli, ateşte koşan Loopy karede.

---

## ⬅️ Ü221–Ü223 · Vitrinin görselleri güncellendi — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi: *"sitemizde görseller hatalı, biz oyun kısmımızın
görsellerini arayüzünü falan güncelledik ya, şu an öyle değil… bu
landing page'de kullandığımız tüm görsellerden, havadan uçan kuponlar
falan da dahil."*

### Vitrindeki beş ekran görüntüsünün BEŞİ DE eskiydi

Hepsi 16 Eylül'den kalmaydı; aradaki turlar (Loopy'nin çarkı çevirmesi,
Yılan'ın baştan yazılması, Loopy'nin oyuncu ekranlarına girmesi) hiçbiri
vitrine yansımamıştı.

- [x] **`cark.png`** ✅ — Loopy çarkı itiyor (Ü193/197/198 vitrinde yoktu)
- [x] **`oyun-yilan.png`** ✅ — nane yeşili ızgara ve ok tuşları gitti;
  çim tahtası, mavi yılan, elma, neon duvarlar (Ü215)
- [x] **`oyuncu-panel.png`** ✅ — kalp tutan Loopy, konuşma balonu,
  avatar yuvası düğmesi
- [x] **`oduller.png`** ✅ — göz kırpan Loopy + iki gerçek kupon kartı
- [x] **`rapor.png`** ✅ — yeni menü (Kampanyalar · Çark · Şubeler) ve
  logo; eskisinde düz yazı "Looply" vardı

Beşi de **misafir akışından ya da gerçek oturumdan**, 390×844 (rapor
1320×880), geliştirme rozeti gizlenerek çekildi.

⚠️ **Ad "Buse" çıktı, "Abdulkadir" değil.** Vitrin görsellerinde
Abdulkadir kullanma kuralı var ama demo hesabının adı tohumda sabit
(`tohum-demo-oyuncu.ts` → `const AD = "Buse"`) ve üründe adı
değiştirecek bir ekran yok. Ürün sahibi isterse tohum adı değiştirilip
iki kare yeniden çekilir.

⚠️ **Çekim için demo hesabına giriş yapıldı** (ürün sahibi bu iş için
izin verdi). Oyuncu girişi telefon + **parola** istiyor; kafe yöneticisi
girişi telefon + tek kullanımlık kod (kod uygulamanın kendi geliştirme
defterinden okundu).

### 🔴 Bir tur, Next'in görsel önbelleğine gitti

Dosyalar değişti, ham `fetch` yeni baytları verdi, sayfa hâlâ eskisini
gösterdi. Sebep: **`.next/dev/cache/images`** — `.next/cache/images`
değil (Next 16 · Turbopack). Üstelik her genişlik varyantı ayrı anahtar:
`?w=640` bayatken `?w=750` yeni geliyordu, yani "ham dosya yeni" kanıt
değil.

### Ü221 · Sekme'nin hiç görseli yokmuş

- [x] **`sekme` çizimi** ✅ — Ü217'de oyun eklendi, çizimi eklenmedi ve
  `oyunGorseli` tanımadığı kimliği **sessizce `blok`a düşürüyor**:
  katalogda, oyun kabuğunda ve misafir ekranında Sekme **Blok'un
  çizimiyle** duruyordu. Üstte sıra + bir üçgen (Ü218), sağ duvardan
  sekerek çıkan top; sekme yönü gerçek yansıma.
- [x] **`SekmeIkonu`** ✅ — jenerik daireye düşüyordu. `OYUN_IKONU`
  haritası tam bu durum için duruyordu ve ilk kez gerçekten gerekti.
- [ ] **Sekme'nin üretilmiş sahnesi yok** — diğer üç oyunun katalog
  kartında parlak neon sahne var (`public/oyun/*-512.webp`), Sekme'de
  yok. Görsel üretimi ürün sahibinin onayına bağlı.

### Ü222 · "Kafe A · Kafe A"

- [x] **Künye kuralı tek yerde** ✅ — `masaKunyesi()`. Bu bir veri
  hatası değil: göç 0038 kafenin **kendi** karekodunun etiketini bilerek
  kafe adı yapıyor (`domain/masa-yonetim.ts`); ekran onu ikinci kez
  basıyordu. İki yerde geçiyordu: `/hemen` künyesi ve `/oyna` durum
  şeridi.

### Ü223 · Havada uçan kuponlar gerçek kupon kartı oldu

- [x] **`<Bilet sus>`** ✅ — kaydırmalı sahnedeki yağan kartlar biletin
  **taklidiydi**: beyaz kutu, altın simge, tek satır yazı. Ürünün
  gerçek kuponu Ü72'den beri koyu doygun zeminli, desenli ve üstünde
  **Loopy ödülü yaşıyor** (Ü189). Vitrin, sayfanın kendi kuralını
  çiğniyordu: *"ekranların hepsi gerçek"*.
- [x] **Süs kipi neden gerekti** ✅ — `Bilet` bir `<Link>`; yağmurda 14
  tıklanabilir bağlantı olurdu. `sonuk` kipi bağlantısız ama yanında
  siyah perde ve doygunluk düşüşü getiriyor — taze kuponu sönük
  göstermek yanlış olurdu.
- [x] **Kupon türü uydurulmadı** ✅ — her başlığa ürünün kendi beş
  türünden biri (`KuponGorseli`); renk ve illüstrasyon ondan türüyor.
- [x] **Uydurma kafe adı yok** ✅ — kartta "Kafende", tarih yerine
  "yarın kullan".

**684 test · 684 geçti · 0 düştü** · tsc/eslint temiz · mobil ve
masaüstünde yatay taşma yok (sayfa baştan sona gezilerek ölçüldü).

---

## ⬅️ Ü220 · Vitrinin içerik listesi referansa çekildi — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi kendi hazırladığı `CafePlay_Kafe_Landing_Page_Mobil_First_Final.html`
dosyasını verdi: *"landing pagemizdeki içerik listesi bunun gibi olsun,
başlıklar da böyle."*

Referansın yapısı çıkarıldı (13 bölüm, 28 başlık) ve bizimkiyle
karşılaştırıldı. **Omurga zaten aynı sıradaydı** — sorun → çözüm → merak
→ ek satış → sosyal kanıt → SSS → kapanış. Üç bölüm ve üst menü eksikti.

### Eklenenler

- [x] **Üst menüye bölüm bağlantıları** ✅ — `vitrin-ust.tsx`, yedi durak.
  ⚠️ Adresler `/#...` ile **mutlak**: şerit simülasyon sayfasında da
  duruyor ve oradaki `#sorun` hiçbir yere gitmez.
  ⚠️ Dar ekranda gizli (`hidden lg:flex`) — referansın mobil hâli de
  aynı kararı vermiş; 1024 pikselde ölçüldü, taşma yok.
- [x] **`vitrin-damga.tsx` · *"Biz zaten damga kartı veriyoruz."*** ✅ —
  altı satırlık karşılaştırma. Bizde **hiç yoktu** ve eksikliği ciddi:
  Türkiye'de kafenin sadakat aracı büyük ölçüde damga kartı, işletmeci
  Looply'yi elindeki kartla karşılaştırarak değerlendiriyor.
  ⚠️ Her satırın bir **konusu** var; referans iki sütunu yan yana dizip
  bırakıyordu ve konu yazılmayınca karşılaştırma iki ayrı iddia gibi
  okunuyordu.
  ⚠️ Sağ hücre **vurgulu değil** — birini kutulayıp öbürünü açıkta
  bırakmak, kararı bizim verdiğimizi söylerdi.
- [x] **`vitrin-itirazlar.tsx` · *"Peki bunu benim kafede kullanırlar
  mı?"*** ✅ — altı itiraz, cevapları açıkta.
  ⚠️ SSS ile **birleştirilmedi**: SSS bilgi sorusu soruyor ("POS
  gerekiyor mu"), burası satın alma itirazı ("kârım düşmez mi"). Ayrıca
  itiraz kapalı akordeonda dururken hiç açılmaz — okuyucu onu henüz
  dile getirmemiş.
- [x] **`vitrin-olcum.tsx` · *"Looply bana ne kazandırdı?"*** ✅ — altı
  ölçülen + **ölçmediğimiz şey** kutusu.
  🔴 Asıl mesele buydu: *"satışını otomatik ölçmüyoruz"* cümlesi SSS'in
  **kapalı** bir akordeonunun içindeydi. İşletmeci bunu bizden duymazsa
  ilk ay sonunda kendisi fark ediyor ve güven bir kez kırılıyor.

### Başlıklar referansın ifadesine çekildi

- [x] "Müşterin geliyor" → **"Kafenin müşterisi geliyor. Ama sonra ne
  oluyor?"** ✅
- [x] "…için sebep bırak" → **"…için bir sebep oluştur."** ✅ · etiket
  "Looply döngüsü" → **"Nasıl çalışır"** (menüyle aynı ad)
- [x] "Aklındaki soruyu şimdi" → **"Aklındaki itirazları daha baştan
  cevaplayalım."** ✅
- [x] Merak bölümüne kapanış cümlesi: **"Merak, müşterinin yarınını
  düşünmesini sağlar."** ✅ — referansta vardı, bizde mekanizma
  anlatılıyor ama **neden önemli olduğu** yazılmıyordu.

### Kahraman — ürün sahibi *"ikisi birden"* dedi

- [x] Dev başlık **"Oyna. Kazan. Geri gel."** kaldı; altına referansın
  H1'i ikinci satır olarak girdi ✅. Üçlü yapı:
  slogan (ne yapıyoruz) → **soru** (işletmecinin derdi) → cevap (nasıl
  çözüyoruz). Soru cevaptan **önce**: sloganın ardından vaat okumak,
  sorulmamış bir soruya cevap vermek olurdu.

### Değişmeyenler ve sebebi

Referansta olmayan bölümler **kaldı** (ürün sahibi: *"uygunluğa göre
ekleyelim veya bazılarıyla değiştirelim"*): kaydırmalı QR sahnesi,
simülasyon çağrısı (Ü156'da *"en önemli araçlarımızdan biri"*), "Kimler
için", reklam karşılaştırması, "Kullanmazsan ne kaybedersin" (Dalga 8'de
ürün sahibinin verdiği sıranın son maddesi).

Sosyal kanıt başlığı da bizimki kaldı: referanstaki *"Rakamları
kazandıkça buraya koy"* müşteriye değil kendine yazılmış bir not.

⚠️ **Damga kartı bölümünde hatırlatma satırı ürünün BUGÜNKÜ hâline göre
yazıldı.** Referans *"dijital hatırlatmalar gönderilebilir"* diyordu;
bizde altyapı hazır ama **kanal kapalı** (2026-09-20) ve SSS bunu açıkça
söylüyor. Vitrinde olmayan bir kanalı anlatmak, üç bölüm aşağıda SSS'in
"hayır" demesi demekti.

---

## ⬅️ Ü219 · Vitrine Loopy — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibinin sıralı planının son maddesi: *"landing pageye loopy
ekleyelim."* Vitrinde maskot **hiç yoktu** — altı ürün görüntüsü, iki
fotoğraf, bir logo; ürünün müşteriye gösterdiği tek yüz sayfanın
hiçbir yerinde görünmüyordu.

- [x] **`vitrin-loopy.tsx` · maskot bölümü** ✅ — *"Kafende bir de Loopy
  çalışıyor."* Üç karşılaşma anı (masada karşılar · çarkı o çeviriyor ·
  kuponu onun elinden alır) ve altısı farklı renkte Loopy şeridi.
  Üç iddia da üründe doğrulanabilir: `/hemen`, `components/cark.tsx`,
  `/oduller`.
- [x] **Kombinasyon sayısı SAYILIYOR, yazılmıyor** ✅ —
  `GOVDE_RENKLERI.size × SERIT_RENKLERI.size` = 1.452. Elle yazılan her
  sayı, palet büyüdüğü gün yalan oluyor.
- [x] **Kahramanda, kapanışta ve yapışkan şeritte Loopy** ✅
- [x] **Yeri iki fildişi bölümün arası** ✅ — *"Bir kere gelen müşteri"*
  ve `VitrinItiraz` arka arkaya fildişiydi; göz onları tek bölüm olarak
  okuyordu.
- [x] **🔴 Zemin lacivert KART** ✅ — karakterin buharı ve gölgesi koyu
  ekranlar için üretildi; `loopy-golge` tam olarak
  `--color-vitrin-lacivert` tonunda (rgba(16,32,77,.3)), yani koyu
  kartta kayboluyor ve karakter havada duruyor.

### Ürün sahibi: *"Loopy'mizin daha mutlu olması lazım, şu an hepsinde dümdüz duruyor"*

- [x] **Kareler değişti** ✅ — kusurun adı zaten kodda yazılıydı:
  `sakin`in **ağzı düz bir çizgi** (`loopy-sozu.tsx`). Kahraman ve
  kapanış artık `kuponlu` (göz kırpıyor, ağzı açık gülüyor, elinde
  yıldız), maskot portresi `keyifli`, küçükler `neseli`.
- [x] **⚠️ `mutlu` kullanılamadı ve sebebi ölçüldü** — kıvılcımları sabit
  piksel (±78) ve karakterin boyuyla ölçeklenmiyor; 104 pikselde
  karakterin iki katı uzağa saçılıyor. Kare ayrıca ~22° eğik ve sabit
  dururken devrilme okunuyor (Ü176).
- [x] **56 pikselde yalnızca `durgun` kareler** ✅ — aynı sebep.

### `Avatar`da iki düzeltme

- [x] **`oncelik` propu** ✅ — "büyükse ekranın üstündedir" tahmini
  vitrinde **iki yönden birden** yanılıyordu: kahramandaki 104 piksellik
  Loopy sayfanın ilk boyası, maskot bölümündeki 236 piksellik olan
  ekranlarca aşağıda.
- [x] **🔴 Buhar geometrisi — Ü182'den beri YANLIŞTI** ✅ — `buhar` propunu
  bugüne kadar hiçbir ekran açmamıştı, yani hiç görülmemişti. Yorumda
  *"karakterin tepesi karenin ~%17'sinde"* yazıyordu; alfa ölçüldü ve
  ilk dolu satır **%20,9**. Kutu ayrıca kareden uzun ve resim alta
  yaslı → kapak kutunun %25,4'ünde. Buhar 13 puan yukarıda doğuyordu:
  228 pikselde 31 piksel, bardakla arasında boşluk olan iki nokta gibi.
  `top: 12%` → `25%`.
- [x] **Buharın ölçüleri orana çevrildi** ✅ — 9px tutam, 2.5px
  bulanıklık, −34px yükseliş yalnızca ~228 pikselde doğruydu. Oranlar
  (0.04 · 0.011 · 0.15) o boyda birebir aynı pikselleri veriyor, yani
  görüntü değişmiyor; `--loopy-boy` ile ölçeklenebilir oluyor.
- [x] **Buhar tutamları yatayda 2,6 puan sağa kaçıyordu** ✅ — kapağın
  yatay ortası karenin %50'si değil **%47,4'ü** (ölçüldü).

⚠️ **Kıvılcım ve kalp ölçüleri BİLEREK ellenmedi.** Aynı sabit-piksel
kusuru onlarda da var ama `mutlu` ve `keyifli` oyuncu ekranlarında
**kullanımda**: oranlamak, ürün sahibinin onayladığı ekranları
görmeden değiştirmek olurdu. Hangi boya göre ayarlandıkları belli değil
ve bu ayrı bir iş.

---

## ⬅️ Ü218 · Sekme: geri çekme, üçgenler, tam cam — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi Sekme'yi görünce üç şey söyledi.

### 1 · *"Parmağıyla geri çekerek kullanıcı isabet almalı"*

- [x] **Nişan artık sürüklemenin TERSİ** ✅ — parmak aşağı çekildikçe
  top yukarı gidiyor. İlk sürüm "nereye dokunursan oraya gider"di ve
  iki sebeple yanlıştı: **sapan metaforu yok** (geri çekmek atışı
  bedende hissettiriyor) ve **parmak hedefi kapatıyor** (işaret
  ederken parmak tam nişan aldığın bloğun üstünde duruyor).

### 2 · *"Bazı küpler yarım olmalı üçgen şeklinde"*

- [x] **Üçgen bloklar** ✅ — hücrenin yarısını kaplıyor, dört yönde.
  Gerçek oyunda da var ve oyunun asıl derinliği orada: köşeye sıkışmış
  blokları ancak köşegenden sektirerek vurabiliyorsun.
- [x] **🔴 Yansıma bileşen takası** ✅ — `/` için `(vx,vy) → (−vy,−vx)`,
  `\` için `(vy,vx)`. 45°'lik bir yüzeyin yansıması tam olarak budur ve
  **saf tam sayı işlemi**; kök ya da trigonometri gerekmiyor,
  determinizm bozulmuyor (Ü217'nin kuralı).
- [x] **Hipotenüse uzaklık kök almadan** ✅ — `|d|/√2 ≤ TOP_R` yerine
  `d² ≤ 2·TOP_R²`. Tam sayıda birebir aynı karar.
- [x] **Boş yarıda çarpışma YOK** ✅ — üçgenin olmayan tarafından
  sektirmek oyunu yalan söylerdi.
- [x] **İlk üç turda üçgen yok** ✅ — öğrenme turu (docs/03). Oran
  sonra sabit %28; artan bir oran tahtayı köşegene çevirip nişan
  almayı kumara dönüştürürdü.
- [x] **Kırpma yolu motorun "dolu taraf" tanımıyla birebir** ✅ —
  ayrışsa oyuncu boşluğa vurur ya da görünmeyen yüzeyden sekerdi.

### 3 · *"Küp assetlerimiz tam camsı olmalı"*

- [x] **Ü210'un cam reçetesi uygulandı** ✅ — merkezde yoğun, kenarda
  saydam. Koyu zeminde düz düşük alfa rengi soldurur.
- [x] **🔴 Üçgene kenar çizgisi ayrı katmanla** ✅ — `clip-path`
  `box-shadow`u da kırpıyor, yani üçgene `inset` kenar verilemiyor;
  ilk sürümde üçgenler kare bloklardan gözle görülür biçimde **daha
  düz** duruyordu. İki kırpılmış katman: dışta parlak üçgen, içinde
  1,5 piksel içeri çekilmiş cam gövde.
- [x] **Sayı kırpılan kutunun dışında** ✅ — `clip-path` çocukları da
  kırpıyor, üçgenin dar köşesine düşen rakam yarım kalırdı. Üçgende
  sayı dik açının köşesine kayıyor: orası en geniş yer.

**Determinizm korundu:** 25 tohumda 0 ayrışma, 0 tekrar reddi, 0 skor
farkı. Tahtanın ~%25'i üçgen.

684 test · 677 geçti · 0 düştü. Derleme temiz.

---

## ⬅️ Ü217 · Dördüncü oyun: Sekme (BBTan) — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibinin istediği: *"bbtan oyununu da ekleyelim, topu fırlatan
karakter bizim loopymiz olsun, diğer oyunlardaki gibi ödül dağıtsın,
bbtanda [ödül] üstten düşsün."* Mekanik `gamesvideos/bbtan.mp4`ten
çıkarıldı — **video önce izlendi.**

### Ad: Sekme

Ü22'nin kuralı: mekanik tanıdık olabilir, **kimlik bizim.** Blok,
Düşen, Yılan — dördüncüsü Sekme. Hem hukuki mesafe hem de ürünün dili
tek parça kalıyor.

### 🔴 En zor kısım: sekme fiziği determinist olmalı

Sunucu turu yeniden oynatıp aynı skoru bulmak zorunda (S5). Top
sekmesi sürekli bir hareket; en ufak sayısal ayrışma birkaç sekme
sonra topu bambaşka yere götürür ve **dürüst oyuncunun turu
reddedilir.** Üç önlem:

- [x] **Kayan nokta yok — sabit noktalı tam sayı** ✅ (`BIRIM` 1000)
- [x] **🔴 `Math.cos`/`Math.sin` kullanılmıyor** ✅ — bunlar JS
  standardında *"implementation-approximated"*; V8, JavaScriptCore ve
  SpiderMonkey son bitlerde ayrışabiliyor. Yön tablosu **kaynağa
  gömülü tam sayı sabiti**, çalışma zamanında hesaplanmıyor. En büyük
  yuvarlama sapması %0,28.
- [x] **Açı ayrık** ✅ — 61 kademe; girdi kaydına giden şey bir indeks.
  `atan2` yalnızca ekranda nişan için, sonucu asla girdiye yazılmıyor.
- [x] **Adım sınırı** ✅ — top iki duvar arasında neredeyse yatay
  sekebiliyor; sınır olmasaydı **sunucu tek girdiyle sonsuz döngüye
  girerdi.**

**Ölçüldü:** 25 tohumda 0 ayrışma, 0 tekrar reddi, 0 skor farkı ·
atış başına **0,03 ms**.

### Fizik tek gövdede

- [x] **`simule` hem sonucu hem izi üretiyor** ✅ — ilk yazımda iki
  ayrı kopya vardı. Ekran kendi fiziğini oynatsaydı oyuncu bloğu
  kırdığını görür, skoru tutmazdı. Test bunu kilitliyor.

### Oyun

- [x] 7×9 ızgara, numaralı bloklar, `+` top hediyeleri ✅
- [x] **Ödül paketi üstten iniyor** ✅ — ürün sahibinin bu oyun için
  özel isteği ve burada bedava geliyor: zaten her şey üstten iniyor.
  Kural `odul.ts`te ortak — eşik geçilmeden çıkmıyor, sıfır puan,
  tur başına bir kez. **60 tohumda 0 erken çıkış, 0 çifte teslim.**
- [x] **Fırlatıcı Loopy** ✅ — mevcut `<Avatar>`, yeni görsel
  üretilmedi.
- [x] Kimlik rengi **menekşe** — Ü208'de Kelime'den boşalmıştı.
- [x] Kategori **"Düşünerek"** — önce yanlışlıkla "Yetişerek"e kondu;
  oyunda hiç zaman baskısı yok, zorluk açıyı kestirmekte.

### Yol boyunca yakalanan hata

- [x] **🔴 Yüzdeli dolgu blokları eziyordu** ✅ — `padding: 6%`,
  **kapsayan bloğun genişliğine** göre çözülüyor. Sarmalayıcı mutlak
  konumlu olduğu için kapsayan blok tahtanın kendisi: 6% × 353 = 21
  piksel, oysa hücre 50. İki yandan 42 piksel gidince bloktan geriye
  **8 piksel** kalıyor ve ekranda ince birer pil gibi duruyorlardı.
  `inset` yüzdesi doğru kapsayan bloğa bakıyor; ölçüldü, 43,4×43,5.

### Testler

- [x] **Altı yeni test** ✅ — en önemlisi **kaynağı okuyan** biri:
  `sekme.ts` içinde `Math.cos`/`sin`/`tan`/`atan`/`random` geçmiyor.
  Davranış testiyle yakalanamaz (aynı makinede iki koşu da aynı sonucu
  verir); yakalanacağı tek yer kaynak.

683 test · 676 geçti · 0 düştü. Derleme temiz.

> ⚠️ **Oynanmadı.** Nişan alma hissi, atış animasyonunun hızı ve
> zorluk eğrisi telefonda denenmeli. Rastgele açı atan bot ortanca
> 445 puan / 10 atış yapıyor; gerçek oyuncu çok daha iyisini yapmalı.

---

## ⬅️ Ü216 · Hareket akıcı oldu — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi: *"Daha akıcı ilerlemeli, çok takılarak ilerliyor, fps
düşük gibi."*

### 🔴 Bu FPS değildi

Ü214'te render sayısı zaten %91–96 düşürülmüştü. Kalan sorun başka:
oyunlar hücreden hücreye **ışınlanıyordu.**

| | adım aralığı (başlangıç) |
|---|---|
| Yılan | 11 tick = **550 ms** |
| Düşen | 28 tick = **1.400 ms** |

Saniyede bir-iki kez yer değiştiren bir şey, kare hızı ne olursa olsun
takılır. Eksik olan şey **ara değerleme**ydi.

### Çözüm: motor ayrık, ekran kayıyor

- [x] **CSS geçişi, React değil** ✅ — React yine saniyede bir-iki kez
  render ediyor; aradaki ~30 kareyi tarayıcı çiziyor. Ü214'te
  kazanılan render tasarrufu olduğu gibi duruyor.
- [x] **`transform`, `left/top` DEĞİL** ✅ — ikisi de animasyonlanıyor
  ama `left/top` her karede **düzen** hesabı tetikliyor. Akıcılığı
  isteyip 160 ögeyi her karede yeniden yerleştirmek kendi kendini yer.
- [x] **Yılan: anahtar `sira`, hücre değil** ✅ — hücre anahtarıyla
  React her adımda ögeleri yok edip yeniden yaratıyordu; yok edilen
  ögenin geçişi olmaz. Sıra anahtarıyla segment ömrü boyunca aynı DOM
  ögesi kalıyor.
- [x] **Düşen: parça ızgaradan çıkıp kendi katmanına geçti** ✅ —
  ızgara hücresinin içindeyken kayamıyordu.
- [x] **Yatay ve dikey AYRI katman** ✅ — iniş yerçekimi kadar yavaş
  (1,4 s), yana hamle parmak kadar hızlı (70 ms). Tek katmanda
  olsalardı sağa basmak parçayı 1,4 saniyede kaydırır, oyun cevapsız
  hissettirirdi.
- [x] **Katmanın `key`i `parcaNo`** ✅ — yoksa yeni parça, öncekinin
  kilitlendiği yerden yukarı doğru süzülürdü.

### Yol boyunca yakalanan hizalama hatası

- [x] **🔴 Izgara boşluğu hesaba katılmamıştı** ✅ — parça katmanı
  ızgaranın dışında ve hücre yerlerini kendi hesaplıyor. Boşluğu
  saymayınca hücre genişliğini `%100/10` sanıyordu; gerçeği
  `(%100 − 9×2px)/10`. Fark sütun başına ~1,8 piksel, onuncu sütunda
  **16 piksel** — parça ızgaradan kopardı. `calc` ile düzeltildi ve
  tarayıcıda ölçüldü: 7. sütun 11. satırda sapma **0,00 piksel**.

677 test · 670 geçti · 0 düştü. Derleme temiz.

> ⚠️ Akıcılığın kendisi **telefonda denenmeli** — hizalama ve süreler
> ölçüyle doğrulandı ama "akıcı hissettiriyor mu" sorusunu ancak sen
> cevaplayabilirsin.

---

## ⬅️ Ü214 – Ü215 · FPS düzeltildi, Yılan yeni referansa geçti — 2026-09-21

✅ Commitlendi (2026-09-22).

### 🔴 Ü214 · *"FPS çok düşük"* — sebebi ölçüldü

Ürün sahibi oynadı ve bildirdi. Tahmin etmek yerine sayıldı:

| | render | gerçek değişim | boşa |
|---|---|---|---|
| Yılan | 88 | 8 | **%91** |
| Düşen | 599 | 21 | **%96** |

Sebep: motor her `bekle` çağrısında **yeni bir durum nesnesi**
döndürüyor, yani saat her 50 ms'de render tetikliyor — ekranda hiçbir
şey değişmese bile. Düşen'de her boş render **160 hücrenin
uzlaştırılması** demek.

- [x] **Tick render'dan çıkarıldı** ✅ — artık `useRef`te. Girdi
  kaydının tick'e ihtiyacı var, render'ın yok.
- [x] **Sıradaki adım/iniş gelmediyse motor HİÇ çağrılmıyor** ✅ —
  güvenli, çünkü motor kaba tick'e göre tasarlandı: `zamaniIlerlet`
  0→100'ü tek adımda da aynı tahtaya götürüyor.
- [x] **Tick'ten türeyen efektler zamanlayıcıya geçti** ✅ — patlama ve
  ödül kartı. Tick donunca o hesaplar da donacaktı.

**Sonuç:** Yılan 88 → **8** render · Düşen 599 → **21**. Düşen'de öge
uzlaştırması 95.840 → **3.360** (%96,5 azalma).

### Ü215 · Yeni referans: `gamesvideos/snake.png`

Ürün sahibi *"tam burdaki gibi bir oyun arayüzü istiyorum"* dedi.
Görsel `sharp` ile piksel piksel ölçüldü:

çimen `#88B64F`/`#7BAA48` · taş `#A4AAB2`/`#6F808E` · gövde `#1E51FA` ·
parlama `#69FCFD` · elma `#FE4D3A` · HUD hapı `#2A4972` · taç `#FDDF3A`

- [x] **Taş duvarlı arena** ✅ — üstten ışık, altta gölge, kenarların
  ortasında ışıklı neon şeritler.
- [x] **Solucan halkalı oldu** ✅ — Google'ın düz borusu gitti.
  🔴 İlk deneme 1,06 örtüşmeyle yapıldı ve 21,7 piksellik hücrede
  halkalar yalnızca 1,3 piksel örtüşüyordu: ekranda **boncuk dizisi**
  gibi, kopuk. 1,34'te örtüşme 7,6 piksel ve zincir birleşiyor.
- [x] **HUD üç yuvarlak hap** ✅ — elma+sayı · taç+SKOR · ses/çıkış.
  ⚠️ Referanstaki **duraklat** düğmesi yok: duraklatma mekaniği yok ve
  olmayan bir düğme çizmek verilmemiş bir söz olurdu.
- [x] **Gökyüzü sade** ✅ — referansın uçan adaları, şelaleleri ve
  kaleleri CSS'le üretilebilecek şeyler değil, çizim işi. Uydurma bir
  doku koymaktansa yumuşak bir gök dürüst.

677 test · 670 geçti · 0 düştü. Derleme temiz.

> ⚠️ **Telefonda denenmedi.** FPS düzeltmesi sayıyla kanıtlı ama asıl
> kanıt senin ekranın.

---

## ⬅️ Ü212 – Ü213 · Yılan referanstan yeniden yazıldı — 2026-09-21

✅ Commitlendi (2026-09-22).

### 🔴 Ü212'de referansa BAKMADAN yaptım

Ürün sahibi *"referanstaki gibi snakeyi yap"* dedi. Yılan referansı
daha önce verilmiş bir linkti: **Google'ın Yılan oyunu**
(`google.com/search?q=snake+game`). Linke bakmadım; Düşen'e kurduğumuz
koyu/neon/cam dili buraya taşıdım. Ürün sahibi sordu: *"o linki mcp
ile bağlanıp bakacaktın, ona göre yapıyorsun değil mi?"* Cevap hayırdı.

**Ders:** referans bir link olarak verildiyse iş, o linki açmadan
başlamaz. Aynı hata Ü202'de `block blast.mp4` ile de yapılmıştı.

### Referans açıldı, oynandı, canvas'ı ölçüldü

Tarayıcıdan iframe'in canvas'ına erişilip piksel sayımı yapıldı —
tahmin yok:

| | |
|---|---|
| çimen açık / koyu | `#AAD751` (%41,1) · `#A2D149` (%40,6) |
| dış zemin | `#578A34` (%17,1) |
| elma | `#E7471D` · gövde `#426FE3` · baş `#4E7CF6` |
| gövde gölgesi | `#94BD46` (çimenin üstüne düşüyor) |
| hücre | 35 px · dama **tek hücre** |
| gövde kalınlığı | 25/35 = **%71** — hücreyi doldurmuyor |
| alan | **çerçevesiz**, dış zemin her yanda ~28 px |

Ürün sahibine iki yol sunuldu (karakteri al–paleti bizde kalsın ·
tamamen referans gibi); **"tamamen referans gibi"** seçildi. Yılan
artık Blok ve Düşen'den bilerek ayrı bir dilde.

### Yapılanlar

- [x] **`yilan-yuzey.ts` referans ölçüleriyle yeniden yazıldı** ✅ —
  parlak çimen, düz renkler, sıfır parıltı, neon çerçeve yok.
- [x] **Gövde tek dikdörtgenle çiziliyor** ✅ — segment hücrenin
  ortasında kalın bir şerit, komşusu olan yönde kenara kadar uzuyor.
  Dönüşte iki bandın birleşimi de bir dikdörtgen olduğu için üç parça
  çizmeye gerek yok. Serbest köşelere `9999px` veriliyor; tarayıcı onu
  kısa kenarın yarısına kırpıyor ve boru ucu çıkıyor.
- [x] **Gölge katmanın TAMAMINA** ✅ — segment başına verilseydi iç
  eklem yerlerinde de görünür, yılan ayrı parçalar gibi dururdu.
- [x] **Gözler** ✅ — referansın en karakterli detayı. Yöne göre yer
  değiştiriyor, bebekler ileri bakıyor.
- [x] **225 DOM ögesi silindi** ✅ — dama zemini tek bir
  `repeating-conic-gradient`; hücre başına `<span>` gereksizdi.
- [x] **Ödül altın kaldı** ✅ — referansta ödül yok, bu bizim
  mekaniğimiz ve ödül ürünün her yerinde altın.
- [x] **`tahta.tsx` SİLİNDİ** ✅ — son sakini de taşındığı için dosya
  tamamen ölü koda dönmüştü.

### Yol boyunca bulunan iki sessiz hata

- [x] **🔴 Aynı adla iki `@keyframes nabiz`** ✅ — CSS'te sonuncusu
  kazanıyor. `.nabiz` kullanan her öge (yem, ödül, misafir ekranındaki
  ipucu, konum bekleme noktası) opaklık nabzı yerine **mavi bir halka**
  koşuyordu ve animasyon `box-shadow`u sürdüğü için o ögelerin **kendi
  parıltısı siliniyordu.** Ölçüldü: `rgba(37,99,235,.18) 0 0 0 10px`.
  Düğmeninki `nabiz-halka` oldu.
- [x] **`drop-shadow(0 4% 0 …)`** ✅ — `drop-shadow()` yüzde kabul
  etmiyor; geçersiz değer filtrenin tamamını düşürüyor ve gölge hiç
  çıkmıyordu. Tarayıcı uyarmıyor.
- [x] **Kuyruk kontrastı 1,4** ✅ — Ü212'nin cam gövdesinde ölçüldü,
  Ü166'nın okunabilirlik sınırı olan 1,45'in altındaydı. Estetik değil
  **oynanış** hatası: yılanın tek ölüm sebebi kendine çarpmak. (Palet
  Ü213'te tamamen değiştiği için sorun kendiliğinden kalktı.)
- [x] **Ödülün beyaz halkası** ✅ — açık yeşil çimenin üstünde altın
  solgun bir noktaya dönüşüyordu. Halka koyulaştı.

677 test · 670 geçti · 0 düştü · 7 atlandı. Derleme temiz.

> ⚠️ **Gerçek ekranda oynanmadı** — oyun girişin arkasında. Görünüm,
> yüzey fonksiyonlarının gerçek çıktılarıyla kurulan birebir kopyayla
> 375×812'de doğrulandı. Kaydırma hissi telefonda denenmeli.

---

## ⬅️ Ü211 · HUD referanstaki düzene geçti — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi: *"Ekran ayarlaman yanlış, sıradakiler hiç belli değil,
referans görseldeki gibi de değil skor level ve sıradaki kısımları."*

Haklıydı, ikisi de. Ü209'da üç paneli üst şeride sıkıştırmıştım ve
gerekçem şuydu: *"375 pikselde yan sütuna yer yok."* Doğru olan, yerin
**nereden** açılacağıydı.

### Ne değişti

- [x] **SIRADAKİ tahtanın sağına, dikey sütuna taşındı** ✅ —
  referanstaki yer orası. Üst şeritte üç panel yan yana sıkışınca
  parçalara **7 piksellik hücre** kalıyordu; şimdi ilki 12, sonrakiler
  9 piksel ve dördü birden okunuyor.
- [x] **SKOR referanstaki gibi iki satırlı** ✅ — etiket, 28 piksellik
  rakam, altında ikinci bir sayı. ⚠️ O sayı referanstaki **BEST
  değil, SATIR**: kişisel rekor bu ekrana gelmiyor ve uydurulmuş bir
  sayı yazmaktansa gerçek bir sayı yazmak doğru.
- [x] **SEVİYE ayrı rozet** ✅ — 74 piksellik köşeli panel, sağ üstte.
- [x] **Önizlemeler tahtadaki camın küçük hâli** ✅ — aynı merkez-yoğun
  degrade. Düz renk olsaydı önizleme tahtadaki parçaya benzemez,
  oyuncu ikisini eşleştirmek için biçime bakmak zorunda kalırdı.

### Boşluk sorunu — üç düzen ölçüldü

Yan sütun tahtanın genişliğini kısıyor (359 → 287) ve genişlik
yüksekliği belirlediği için (oran 10/16) tahta 459 pikselde kalıyor;
orta banda ise 638 piksel düşüyor. **Aradaki 179 piksel bir yere gitmek
zorunda.**

| düzen | üst boşluk | alt boşluk | sonuç |
|---|---|---|---|
| `items-center` | 96 | 96 | HUD ile tahta arasında sebepsiz uçurum |
| `items-start` | 8 | 170 | tahta HUD'a yapışıyor, düğmeler dipte yalnız |
| **üçü tek grup, grup ortalı** | 82 | 91 | 10'ar piksel aralık, boşluk nefes payı |

- [x] **Sonuncusu seçildi** ✅ — HUD, tahta ve düğmeler birbirine ait
  görünüyor; artan boşluk ekranın üstüne ve altına dağılıyor.
- [x] **Sütun tahtanın üst kenarına hizalı** ✅ — ilk denemede
  `items-stretch` yüzünden sütun 622 piksele uzuyor, altında 176
  piksellik boş kutu kalıyordu. `items-start` ile satırın yüksekliğini
  tahta belirliyor, sütun kendi içeriği kadar oluyor.

> ⚠️ Boşluğun kendisi **kaçınılmaz**: tahta 10 hücre geniş ve hücre
> kare olmak zorunda. Ortadan kaldırmanın tek yolu yan sütunu silmek
> olurdu — o da istenen düzenin kendisi. Bedeli ölçüldü: hücre 35 → 29
> piksel (%18 küçülme).

677 test · 670 geçti · 0 düştü · 7 atlandı. Derleme temiz.

---

## ⬅️ Ü210 · Cam gerçekten cam oldu, kontroller parmağa geçti — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi Ü209'u gördü ve iki şey söyledi.

### 1 · *"Bloklarımız daha şeffaf cam gibi olmalı, bunu yanlış yapmışsın"*

Haklıydı. Ü209'da *"camsı"* isteğine **opak şeker** yapmıştım: degrade
gövde, parlama, pah — hepsi vardı ama küpün **ardı görünmüyordu.**
Parlak bir plastik, cam değil.

- [x] **🔴 Düz saydamlık da yanlış çıktı — ölçüldü** ✅ — gövdeyi düz
  %56 alfaya almak renkleri **soldurdu.** Tahta neredeyse siyah
  (`#0B1338`) olduğu için saydamlık doğrudan parlaklık yiyor.
  375×812'de bileşik renk ölçümü:

  | | camgöbeği parlaklık | doygunluk |
  |---|---|---|
  | opak (Ü209) | 175 | 0,86 |
  | düz %56 | **107 (−%39)** | 0,85 |
  | açık ton %72 | 151 | **0,62 (−%28)** |

  Yani alfa doygunluğu koruyup **parlaklığı**, açık ton parlaklığı
  koruyup **doygunluğu** öldürüyor. İkisi de ürün sahibinin önceki
  isteğine — *"daha canlı renkteki küpler"* — aykırı.

- [x] **Çözüm: alfa düz değil, merkezden kenara** ✅ — üç aday tahtada
  yan yana çizilip bakıldı. Kazanan: merkezde neredeyse opak (%92),
  kenara doğru saydam (%42). Renk merkezde duruyor, arkadaki ızgara
  küpün kenarından okunuyor, parlak iç kenar cam levhanın kalınlığını
  veriyor. **Camı cam yapan şey gövdenin soluk olması değil, ardının
  görünmesi ve kenarının ışığı kırması.**
- [x] **Renk sabitleri kanal kanal** ✅ — `"34 211 238"`, `#22D3EE`
  değil: saydamlık çalışma zamanında alfa eklemeyi gerektiriyor.

### 2 · *"Butonlar olmasın, parmakla oynansın"*

*"Kullanıcı parmağını basılı tuttuğunda daha hızlı aşağı insin,
parmağını sağa kaydırdığında sağa sola kaydırdığında sola gitsin;
sadece en aşağı bırak ve çevir butonları olsun."*

- [x] **◀ ↻ ▶ kalktı** ✅ — geriye iki düğme kaldı: **Çevir** (dar,
  solda) ve **Bırak** (geniş, sağda). Eşit olsalardı en sık basılan
  hangisi görünmezdi; ayrıca yanlışlıkla bırakmak turu bitirebilir,
  yanlışlıkla çevirmek bir hamle kaybettirir.
- [x] **Yana kaydırma** ✅ — parmağın gittiği yol **hücre genişliği**
  kadar olunca bir hamle. Sabit piksel eşiği dar ekranda aşırı hassas,
  geniş ekranda tembel olurdu. Çapa taşınıyor (sıfırlanmıyor), yani
  yavaş sürüklemede hareket birikerek doğru yere varıyor.
- [x] **🔴 Basılı tutunca hızlanma motorun `in` girdisiyle** ✅ —
  yerçekimini yerel olarak hızlandırarak DEĞİL. Düşme hızı durumdan
  türüyor ve sunucu onu kendisi hesaplıyor; istemci yerel hızlandırsa
  tekrar ayrışır ve **tur reddedilirdi.** Her iniş bir girdi, kayıtta
  duruyor.
- [x] **180 ms gecikme** ✅ — hızlı bir yana kaydırmada parmak da
  basılı oluyor; gecikme olmasaydı her kaydırma parçayı bir de aşağı
  indirirdi.
- [x] **Etkisiz `in` kaydedilmiyor** ✅ — parça dibe değdiğinde motor
  durumu aynen geri veriyor; o girdiler kayda hiçbir şey katmadan yer
  kaplardı ve sınır 5.000 (`EN_FAZLA_GIRDI`).
- [x] **Olaylar sabit kapsayıcıda** ✅ — tahtanın `key`i dört satır
  silinince değişiyor (sarsıntı için) ve React o anda ögeyi
  değiştiriyor: işaretçi yakalaması hamlenin ortasında kopardı.
- [x] **İlk turda tek satırlık ipucu** ✅ — parmakla oynanacağını kimse
  bilmiyor. Yalnızca hiç parça konmadıysa görünüyor; oynadıktan sonra
  kalıcı ipucu gürültü olurdu.

677 test · 670 geçti · 0 düştü · 7 atlandı. Derleme temiz.

> ⚠️ **Parmak hareketleri gerçek cihazda denenmedi** — oyun ekranı
> girişin arkasında. Görünüm birebir kopyayla 375×812'de doğrulandı
> ama *hissi* ancak sen söyleyebilirsin: kaydırma hassasiyeti
> (hücre genişliği), basılı tutma gecikmesi (180 ms) ve iniş hızı
> (140 ms/satır) ayarlanabilir sayılar.

---

## ⬅️ Ü209 · Düşen'in yüzeyi baştan yazıldı — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibi: *"Tetris daha çok burdaki görsele benzesin, daha camsı ve
parlak, daha canlı renkteki parçalar küpler, daha fütüristik bir
scoreboard ve next parçaların gösterimi."*

İki kaynak vardı ve **ikisine de bakıldı** — `tetris.png` (tanıtım
render'ı, hedef görünüm) ve `tetris.mp4` (gerçek oyun kaydı). Video iki
mekanik ayrıntı verdi: **hayalet parça** ve zeminde **dama deseni**.

### Yüzey

- [x] **`dusen-yuzey.ts`** ✅ — yedi camsı küp rengi, uzay sahnesi, neon
  degrade çerçeve, köşeli (`clip-path`) HUD panelleri, hayalet hücre.
  `tahta.tsx` artık **yalnızca Yılan'ın**.
- [x] **Camsı küp dört katmandan** ✅ — sol üstte noktasal parlama,
  degrade gövde, içeride pah, dışarıda renkli parıltı. Parlama ayrı bir
  DOM ögesi değil zeminin katmanı: 160 hücreye çocuk eklemek 320 düğüm
  demekti.
- [x] **İnen parça parıltıyla ayrılıyor** ✅ — eskiden inen parça altındı
  ve ayıran şey renkti; artık her parçanın kendi rengi var, o yüzden
  "elimdeki hangisi" sorusunu **parıltı** cevaplıyor.
- [x] **SKOR · SEVİYE · SIRADAKİ** ✅ — referansta tahtanın yanındalar;
  375 pikselde yan sütuna yer yok (tahta 10 hücre geniş, hücre kare
  olmak zorunda), üst şeride alındılar.

### Ölçülerek düzeltilenler (375×812, 1:1)

- [x] **Çerçeve 2→3 piksel** ✅ — tahta ekranı neredeyse doldurduğu için
  dışa taşan parıltının yarısı ekranın dışında kalıyordu; geriye ince,
  sönük bir çizgi kalmıştı. İçe doğru bir parıltı da eklendi.
- [x] **Hayalet belirginleşti** ✅ — ilk hâli koyu tahtanın üstünde
  **bir delik** gibi okunuyordu, "buraya düşecek" demiyordu.
- [x] **Dama deseni 0,028 → 0,055** ✅ — ilk değerde ekranda hiç
  görünmüyordu; yazılmış ama işe yaramayan bir katmandı.
- [x] **SIRADAKİ 5/4 → 7/5 piksel** ✅ — parçalar okunmuyordu, üç renkli
  leke gibi duruyorlardı. Yer SKOR panelinden alındı.

### Motor: arayüzün ihtiyaçları, durumu büyütmeden

- [x] **`sigarMi` · `hayaletSatiri` · `siradakiParcalar`** ✅ — üçü de
  saf, hiçbiri duruma bir şey eklemiyor. Arayüz kuralı **tahmin
  etmemeli**; Ü199'un `temizlenecekler`iyle aynı gerekçe.
- [x] **🔴 `uygulaVeKilitler`** ✅ — renk motorun durumunda değil
  (Ü202), ama Düşen'de satır silinince üstündeki her şey kayıyor ve
  renk ızgarası da kaymak zorunda. O kaymayı ekranda yeniden yazmak
  `kilitle`nin ikizini üretirdi; motor artık hangi karelerin dolduğunu
  ve hangi satırların silindiğini **kendisi** söylüyor.
- [x] **Kural tek gövdede** ✅ — `uygula` ve `uygulaVeKilitler` aynı
  `ilerlet`ten geçiyor. İki kopya olsaydı istemcinin gördüğü tahta ile
  sunucunun hesapladığı skor ayrışır ve **dürüst oyuncunun turu
  reddedilirdi.**

### Testler ve yol boyunca bulunanlar

- [x] **Dört yeni test** ✅ — iki giriş aynı durumu veriyor · renk
  ızgarası tahtadan ayrışmıyor (ekranın hesabının birebir aynısı) ·
  hayalet gerçekten en alta iniyor · SIRADAKİ'nin söylediği parça
  geliyor.
- [x] **🔴 Ü208'de kırılgan bıraktığım testi düzelttim** ✅ — DB
  testleri turun `basarili` olmasını şart koşuyor ve Kelime'nin yerine
  koyduğum bot **80 tohumun 14'ünde** eşiği geçemiyordu; test tohum
  piyangosuna bağlıydı. Sezgiye **delik** ve **doğum bölgesi** cezası
  eklendi: 200 tohumda 200 başarı, en düşük skor 525.
- [x] **Sentinel hatası** ✅ — yeni sezgi yalnızca ceza döndürüyor, yani
  puan hep negatif; `?? -1` ile karşılaştırınca hiçbir aday
  seçilemiyordu ve bot ilk parçada duruyordu.
- [x] **Hücre stilleri modül düzeyine alındı** ✅ — 160 hücre × saniyede
  20 çizim = saniyede 3.200 stil nesnesi kuruluyordu. Renk sayısı yedi.
- [x] **`blok-ses.ts` → `oyun-ses.ts`** ✅ — Düşen de aynı beş sesi
  kullanıyor. ⚠️ `localStorage` anahtarı **değişmedi**: değiştirmek
  sesi bir kez açmış her oyuncunun tercihini sıfırlardı.

### Bilerek yapılmayanlar

- **HOLD paneli yok** — parça saklamak bir mekanik, süs değil; motora ve
  replay sözleşmesine girer. Boş duran bir HOLD kutusu verilmemiş bir
  söz olurdu.
- **BEST (rekor) yok** — kişisel rekor bu ekrana gelmiyor; uydurulmuş
  bir sayı yazmaktansa hiç yazmamak doğru.

677 test · 670 geçti · 0 düştü · 7 atlandı. Derleme temiz.

> ⚠️ **Gerçek ekranda görülmedi.** Oyun ekranı girişin arkasında ve ben
> parola girmiyorum; doğrulama, yüzey fonksiyonlarının **gerçek
> çıktılarıyla** kurulan birebir bir kopyayla 375×812'de yapıldı.
> Telefonda bir kez bakılmalı.

---

## ⬅️ Ü208 · Kelime sistemden kaldırıldı — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibinin kararı. Sıra da onun: **önce Kelime kalkacak**, sonra
Düşen ve Yılan'ın arayüzü, sonra BBTan, en son vitrine Loopy.

### Kaldırılanlar

- [x] `oyunlar/kelime.ts` · `arayuz/kelime-ekran.tsx` ·
  `veri/kelimeler.json` + `LISANS.md` · `scripts/kelime-listesi-uret.ts`
  · `package.json`'daki `kelime:uret` ✅
- [x] İki kayıt defterinden birer satır ✅ — `OYUNLAR` dizisi ve ekran
  `switch`i. 🔴 **Faz 5'in sözü ters yönde de tuttu**: motor, oturum
  akışı, sunucu doğrulaması ve kabuk hiç değişmedi. Oyun eklemek kadar
  oyun çıkarmak da dosya işi.
- [x] Renk, ikon ve çizim defterleri ✅ — menekşe artık boşta.
  `OYUN_IKONU` haritası boşaldı ama **silinmedi**: yeni bir oyunun
  görseli üretilene kadar tek sığınak orası.
- [x] Simülasyon botu ve demo tohumu ✅

### Karar: geçmiş turlar SİLİNMEDİ

- [x] **352 tamamlanmış Kelime turu duruyor** ✅ — oyuncunun oynadığı
  tur, oyun listeden çıktı diye olmamış sayılamaz; skoru, XP'si ve
  kuponu gerçekti.
- [x] **Emekli oyun haritası** (`domain/gecmis.ts`) ✅ — `oyunBul` o
  kimliği artık tanımıyor ve yedek ham kimliğe düşüyordu: profil
  karnesinde oyunun adı **"kelime"** diye küçük harfle, ürünün dilinin
  dışında görünecekti. Harita o tek satırı kurtarıyor.

### Yan etki: testlerin "kesin başarılı" oyunu kayboldu

- [x] **🔴 Ölçüldü, tahmin edilmedi** ✅ — bazı DB testleri turun
  `basarili` olmasını (skor ≥ 500) şart koşuyor ve bunu hep Kelime
  botu sağlıyordu. Kalan botlar yetmedi: **Blok botu 60 tohumun
  yalnızca 26'sında** eşiği geçiyor (ortanca 430), Düşen'in basit botu
  on beş parçada tıkanıp 100'ün altında kalıyor. Biri seçilseydi
  testler tohum piyangosuna dönerdi.
- [x] **Ü207'nin açgözlü botu girdi kaydı da tutuyor** ✅ — 582–691
  arası bitiriyor, yani sunucuya gönderilebilir bir tur üretiyor.
  Testler ona bağlandı.

### Yol boyunca düzeltilenler

- [x] **Katalogda Yılan yerine oturdu** ✅ — Kelime çıkınca
  "Düşünerek" tek oyunla kalıyordu ve Yılan hâlâ "Diğer"deydi;
  `katalog.ts`in kendi notu bunu zaten bir gözden kaçma olarak
  yazıyordu. Yılan refleks oyunu → "Yetişerek". Artık "Diğer" boş.
- [x] **Kelime'den bahseden yorumlar** ✅ — kaldırılmış bir oyunu
  şimdiki zamanda anlatan on bir yorum düzeltildi; geçmişi doğru
  anlatanlar (Ü67 ikon dili, Ü84 saat dersi, Ü166 kontrast ölçümü)
  olduğu gibi bırakıldı.
- [x] **README'den bir yayın engeli kalktı** ✅ — *"kelime listesinin
  küfür süzgeci insan gözünden geçmeli"*. Çözülerek değil, konu
  ortadan kalkarak.
- [x] **Kelime'nin ikonu artık gerekmiyor** ✅ — Ü192'den beri açık
  duran madde kapandı.

**Ekranda doğrulandı** (`/hemen`, misafir katalogu): Düşünerek → Blok ·
Yetişerek → Düşen, Yılan. Kelime yok.

673 test · 666 geçti · 0 düştü · 7 atlandı. Derleme temiz.

> ⚠️ `docs/21`deki ölçüm tablosu ve `docs/22`deki demo listesi Kelime'yi
> hâlâ anıyor — onlar **o günün kaydı**, bilerek değiştirilmedi.

---

## ⬅️ Ü207 · Düşen'de de ödül bir nesne — 2026-09-21

✅ Commitlendi (2026-09-22).

Ürün sahibinin isteği Ü201'den beri duruyordu: *"tetriste mesela dışı
ödül paketli bir parça yukarıdan aşağıya düşsün."* Blok'ta yapılmıştı,
Düşen'de yapılmamıştı.

### Kural iki motorda ortaklaştı

- [x] **`oyunlar/odul.ts` açıldı** ✅ — eşik, sıfır bonus ve "sırası
  geldi mi" kuralı tek yerde. Blok sabitleri buradan dışa veriyor;
  ayrışmaları artık mümkün değil.
- [x] **🔴 `odulIsareti` kancasına BAĞLANMADI** ✅ — kasten. O kanca
  (Ü91, Yılan'ın altın kuponu) iki şey yapıyor: `basariliMi` eşiği
  **tamamen atlıyor** ve `dusmeSansi`ya pay ekliyor. Paket oraya
  takılsaydı Ü201'in ekonomi kayması ikinci kez, daha büyük ölçekte
  geri gelirdi. Paket eşik zaten geçildikten sonra çıktığı için
  kancaya ihtiyacı da yok.
- [x] **Motor: `odulParcasi` + `odulVerildi`** ✅ — Blok'ta paket üç
  teklifin biri (oyuncu seçiyor), Düşen'de **inen parçanın kendisi**
  (seçim yok, teslim garanti). Parçanın **biçimi değişmiyor**, yalnızca
  kaplanıyor: sıra bozulsaydı skor da değişirdi.
- [x] **Tahta doluysa paket yok** ✅ — ölü tahtaya paket çizmek,
  kazanılmayacak bir şeyi göstermek olurdu.

### Ekran

- [x] **Kafe dışında paket ÇİZİLMİYOR** ✅ — `kazandirir` false ise
  parça normal altın kalıyor. Motor paketi yine üretiyor ve üretmek
  zorunda (determinizm); gizleyen şey ekran. Aynı hatayı ürün sahibi
  Blok'ta yakalamıştı.
- [x] **Teslim kartı Blok'takiyle birebir aynı** ✅ — *"Ödülün
  kazanıldı · Tur bitince Ödüllerim'e düşecek."* İki oyunda aynı şey
  oluyor, farklı anlatmak iki ayrı kural varmış gibi gelirdi.
- [x] **Kart artık kendini KALDIRIYOR** ✅ — eskiden yalnızca animasyon
  onu görünmez yapıyordu ve bu yüzden `prefers-reduced-motion`da CSS
  kartı tamamen gizliyordu: o cihazlarda oyuncu **ödülünü kazandığını
  hiç görmüyordu.** Blok zamanlayıcıyla, Düşen tick sayacıyla kaldırıyor;
  gizleme kuralı kalktı.

### Görsel — ölçülerek elendi (375×812, 1:1)

- [x] **Çapraz kurdele şeridi + nabız** ✅ — Düşen'de inen parça zaten
  altın (`tahta.tsx` · "aktif"), paketi renkle ayırmak imkânsızdı.
  Ayıran şey doku.
- [x] **🎁 rozeti ELENDİ** ✅ — 13, 14 ve 17 pikselde de kırmızımsı bir
  lekeye dönüştü; koyu disk üstünde daha da kötü. 29 piksellik hücrede
  hediye emojisi çözünmüyor.
- [x] **Hücre başına kurdele haçı ELENDİ** ✅ — paketi hücrelerine
  ayırdı, beş hücreli parça beş ayrı kutu gibi okundu. Parçanın biçimi
  oyunun kendisi.

### Testler

- [x] **İki yeni test** ✅ — paket eşik altında çıkmıyor, tur başına bir
  kez teslim ediliyor, sıfır puan veriyor; ve **parça sırasını
  bozmuyor** (aynı tohum farklı oynanınca aynı sıradaki parça aynı
  biçim). İkincisinin karşılaştırması paketin düştüğü ana kadar
  uzanıyor — bunu da ayrı bir assert koruyor.
- [x] **Düşen için gerçek oynayan bot** ✅ — eski bot on beş parçada
  tıkanıyor ve skor 100'ü geçmiyordu; paket 500'den sonra çıktığı için
  **hiç görülemiyordu**. Yeni bot dört dönüş × on sütunu deniyor.

675 test · 668 geçti · 0 düştü · 7 atlandı. Derleme temiz.

---

## ⬅️ Ü203 – Ü205 · Ödül ekonomisi, tam ekran ve sesler — 2026-09-20

✅ Commitlendi (2026-09-20).

Ürün sahibi oynadı ve altı şey bildirdi; dördü gerçek hataydı.

### Ü203 · Ödül ekonomisi geri alındı

- [x] **🔴 Ü201 kuponun barını düşürmüş** ✅ — parça +120 puan verip
  eşiğin ALTINDA çıkıyordu; bar fiilen 500'den **380'e** inmişti. Bütçe
  motoru delinmemişti, delinen şey **eşiğe ulaşma zorluğuydu**.
  Yeni rol: parça ödül **üretmiyor**, kazanılmış ödülü **teslim
  ediyor** — eşik geçildikten sonra çıkıyor, **sıfır puan** veriyor,
  tur başına bir kez. Skor Ü201 öncesiyle birebir aynı.
  Test `ODUL_BONUSU === 0`'ı kilitliyor.
- [x] **Kafe dışında paket görünmüyor** ✅ — motor konumu bilemez
  (bilseydi replay sapardı); gizleyen ekran.
- [x] **Zorluk sertleşti** ✅ — kademe 8 → **5** turda bir, tavan 3 →
  **4**, üst kademelerde üç hücrelik parçalar da seyreltiliyor. Kaba
  kuvvet botuyla ölçüldü: **14–38 hamlede tıkanıyor**, ortanca skor
  497, 12 turun 5'i 500'ü geçiyor.
- [x] **Kupon yönlendirmesi** ✅ — *"Tur bitince Ödüllerim'e düşecek."*
  Gelecek zaman, çünkü kuponu sunucu tur bitiminde yazıyor.
- [x] **Oyun bitince katalog karuseli** ✅ — "Oyunlara dön" artık
  `/oyunlar`a gidiyor, bu oyunun tanıtım kartına değil.

### Ü204 · Tam ekran

- [x] **`fixed inset-0` + kaydırma kilidi + "‹ Çık"** ✅
- [x] **🔴 İki yanlış deneme** ✅ — (1) sabit genişlik: altta ~235
  piksel boş kaldı. (2) `h-full w-auto max-w-full`: **kare bozuldu**,
  çünkü `height` kesinleşince `max-width` genişliği kırpıyor ve
  `aspect-ratio` geri besleme yapmıyor.
  **Kabul edilen gerçek:** 8×8 kare tahta 375 piksellik telefonda en
  fazla ~359 olabilir; sınır yükseklik değil genişlik. Çözüm tahtayı
  büyütmek değil kalan yüksekliği **dağıtmak** — `flex-1` + ortalama,
  yan dolgu 16 → 8, teklifler kendi "el" panelinde.

### Ü205 · Sesler

- [x] **Dosyasız, WebAudio ile** ✅ — tok · buzz · whoosh · sparkle.
  Ürüne eklenen bayt **sıfır** (aynı gerekçe Ü56'da Lottie yerine CSS).
- [x] **🔴 SESSİZ başlıyor** ✅ — burası kafe; habersiz çıkan ses
  masadaki oyuncuyu da yanındakini de rahatsız eder. Tercih
  `localStorage`'da.
- [x] **Otomatik oynatma kısıtı kendiliğinden çözülüyor** ✅ — ses
  bağlamı oyuncu hoparlöre bastığında kuruluyor, yani zaten bir
  dokunuşun içinde.
- [x] **`useSyncExternalStore`** ✅ — `useState` başlatıcısı sunucuda da
  koşuyor (`localStorage` yok → hidrasyon yanlış değeri sabitliyor,
  Ü96'nın tuzağı); efekt içinde `setState` ise lint tarafından
  reddedildi. İkisini birden doğru yapan tek yol bu.

- [ ] **Seslerin kendisi dinlenmedi** — tarayıcıda bağlamın kurulduğu
  ve çaldığı doğrulandı ama tonları duyan olmadı. Ürün sahibinin
  kulağı gerekiyor.

---

## ⬅️ Ü202 · Blok'un yüzeyi baştan yazıldı — 2026-09-20

✅ Commitlendi (2026-09-20).

Ürün sahibi numaralı ve ölçülü bir tasarım verdi. Uygulananlar:

| İstenen | Yapılan |
|---|---|
| Koyu arka plan | Radial gradient, lacivert → mor → siyah; yavaş yıldızlar |
| Parlak panel | `#5ED6FF → #3A8BFF`, dış parıltı + iç gölge |
| Şeker bloklar | Altı renk; üstte highlight, ortada gradient, altta gölge, dışta hâle |
| Yerleştirme | 110% → 95% → 100%, **180 ms** + 2 piksel vuruş + darbe halkası |
| Satır silme | Önce soldan sağa ışık süpürgesi, **sonra** patlama |
| Parçacık | Kıvılcım · mücevher · toz; satır başına 20–40 |
| Kombo | GÜZEL · HARİKA · MUHTEŞEM · ÇILGIN · EFSANE |
| Sürükleme | `scale 1.15` + altında parıltı; hedef **yeşil hologram** |

- [x] **🔴 Tarifteki iki sayı birlikte çalışmıyordu** ✅ — *"parlak panel"*
  ve *"boş hücre `rgba(255,255,255,0.12)`"* aynı anda okunur bir ızgara
  veremiyor: parlak zemine beyazın %12'sini eklemek onu neredeyse hiç
  değiştirmiyor. Ekranda ölçüldü: **1.06 – 1.17**. Aynı sayı Ü166'da da
  çıkmıştı ve teşhis aynıydı — *"ızgara değil, üstünde doku olan düz
  bir levha."*
  Panel parlak **kaldı** (ürün sahibinin açık tercihi), hücre açık
  değil **koyu** oldu: `rgba(12,42,99,0.28)`, yani tepside açılmış bir
  çukur. Alfa ölçülerek seçildi → **1.45 / 1.56 / 1.64**, Ü166 bandının
  ortası.
- [x] **Beyaz teklif kartları kalktı** ✅ — referansta parçalar doğrudan
  sahnenin üstünde. Dokunma alanı korundu, yalnızca kutu görünmez oldu.
- [x] **HUD koyu sahneye taşındı** ✅ — `text-yazi-sonuk` ve `r.ana` açık
  zemin için seçilmişti, laciverte geçince ikisi de kayboluyordu.
- [x] **Sahne yuvarlak panel** ✅ — tam genişlik denendi ve başlık satırı
  beyazda kalınca ekranın ortasında sert bir sınır çıkıyordu.
- [x] **Renk motorun durumuna GİRMEDİ** ✅ — skora dokunmadığı için
  replay sözleşmesinde işi yok; istemcide `Uint8Array(64)`.
- [x] **Parçacıklarda `Math.random()` yok** ✅ — yön ve mesafe kare
  indeksinden. Rastgele olsaydı her yeniden çizimde yerinden sıçrardı.

- [x] **Sesler** ✅ — Ü205'te yapıldı; bkz. yukarıdaki bölüm. (Tonları
  hâlâ kimse **dinlemedi**, o madde açık.)
- [ ] **Diğer üç oyun** — Düşen, Yılan, Kelime hâlâ `tahta.tsx`te.

---

## ⬅️ Ü201 · Ödül bir nesne oldu — 2026-09-20

✅ Commitlendi (2026-09-20).

Ürün sahibi Ü199'un kutlamasını reddetti: *"eşik geçildi tarzı şeyler
yazmasın… block blastte ödül kaplı parça olsun, ekrana konunca ödül
kazanılsın."* Haklıydı — Ü199'daki şey oyunun **kenarında** bir
bildirimdi.

- [x] **🔴 Ödül parçası MOTORDA** ✅ — arayüzde olamazdı: parça puan
  kazandırıyor ve puanı sunucu aynı girdileri yeniden oynatarak
  hesaplıyor (S5). Yalnızca ekranda olsaydı istemcinin skoru sapar ve
  tur reddedilirdi. `blok.ts` · `odulTeklifi`, `ODUL_BONUSU = 120`.
- [x] **Paketin penceresi: 380 ≤ skor < 500** ✅ — parça **yalnızca
  eşiği geçirmeye tam yettiği** turda çıkıyor. Koyan oyuncu kuponu
  kesinlikle alıyor; erken çıksaydı kutlama görülür, sonuç ekranında
  "kazanım yok" yazardı.
- [x] **Motor konumu BİLMİYOR** ✅ — bilseydi aynı girdi kaydı iki farklı
  skor üretirdi. Paket her hâlde çıkıyor; konum doğrulanmamışsa ekran
  bilet göstermiyor, yalnızca puanı.
- [x] **Eşik çubuğu ve ortadaki kart kaldırıldı** ✅ — `kuponEsigi`
  propu da silindi, eşik artık motorun işi.
- [x] **İki test** ✅ — (a) motorun eşik kopyası `KUPON_ESIGI` ile
  ayrışmıyor, (b) paket çıktığında onu koymak eşiği **geçiriyor**,
  (c) paketin yeri tohumdan türüyor (sunucu tekrarında aynı).

- [x] **🔴 Yan etki yakalandı: bir test düştü** ✅ — *"eşiği geçmeyen
  tur seviye atlama bildirmiyor"*. Sebep: birinci seviye eşiği yalnızca
  **100 XP** ve testin kaba kuvvet botu zaten ona yakındı; ödül parçası
  turu "başarılı" yapınca XP çarpanı büyüdü ve eşik geçildi. Testin
  **iddiası** doğruydu, **kurulumu** kırılgandı — oyuncu artık 5.
  seviyenin tabanına konuyor (1.500) ve önünde tek turda kapanmayacak
  1.500 XP boşluk var. Test kurulumun hâlâ geçerli olduğunu da kendisi
  doğruluyor.

- [x] **Düşen** ✅ — Ü207'de yapıldı; kural `oyunlar/odul.ts`te
  ortaklaştı. (Bonus **yok**: Ü203 onu sıfırladı.)
- [x] **Yılan'da zaten VAR** ✅ — Ü91'den beri: yemin yerine gelen altın
  kupon, ömür çubuğuyla. ⚠️ Ama **başka bir mekanik** ve öyle kalmalı —
  orada ödül bir **hedef** (oyuncu ona ulaşmak için yön değiştiriyor,
  `odulIsareti` kancasına bağlı), Blok/Düşen'de bir **teslimat**
  (kazanılmış ödülü gösteriyor, kancaya bağlı değil). İkisini tek
  kancada toplamak kupon ekonomisini kaydırır.
- [ ] **Kelime'de ödül nesnesi yok** — istenmedi de. Karşılığı bir altın
  harf olurdu; **karar ürün sahibinde**.
- [ ] **🔴 Yeni oyun: BBTan** — üstten inen numaralı bloklar, alttan top
  fırlatan **Loopy**, ödül üstten düşüyor. Mekanik ürün sahibinin
  gönderdiği kayıttan (`Downloads/gamesvideos/bbtan.mp4`) çıkarıldı;
  görseller bizim olacak.
- [ ] **Vitrine daha çok Loopy** — referans HTML'deki gibi.

---

## ⬅️ Ü200 · Vitrine altı bölüm — 2026-09-20

✅ Commitlendi (2026-09-20).

Ürün sahibi bir örnek vitrin gönderdi (`CafePlay_Kafe_Landing_Page_example.html`)
ve *"eksiklerimiz nelerdir"* diye sordu. Metnimiz zayıf değildi —
simülasyon, dürüstlük bölümü, reklam karşılaştırması örnekte yok. Eksik
olan altı şeydi ve altısı da eklendi.

| # | Eklenen | Neden |
|---|---|---|
| 1 | **Yapışkan alt çağrı** (`vitrin-yapiskan.tsx`) | Sayfa uzun; ikna olan kişi düğmeyi aramak için kaydırıyordu |
| 2 | **Sorun bölümü** (`vitrin-itiraz.tsx`) | Argüman kafe sahibinin **kendi cevapsız sorularıyla** açılıyor |
| 3 | **Döngü çizimi** (`vitrin-dongu.tsx`) | Ürünün adı Looply ve döngüyü hiç çizmiyorduk |
| 4 | **SSS** (`vitrin-sss.tsx`) | Yedi soru, hepsi satış engeli |
| 5 | **Ek satış** (`vitrin-katmanlar.tsx`) | Ödül kataloğu/kampanya/Happy Hour üründe var, sayfada yoktu |
| 6 | **Gecikmeli açılış** (`vitrin-katmanlar.tsx`) | Ü97 üründe çalışıyor, sayfada hiç geçmiyordu |

- [x] **🔴 Örnekten bilerek AYRILDIK** ✅ — örnek *"ödül tutarı gizli
  tutulur"* diyor. Bizde öyle değil: oyuncu ne kazandığını baştan
  görüyor, TL'yi zaten hiç görmüyor (E9) ve saklanan şey **saat**
  (Ü97). Örneği kopyalamak yalan olurdu.
- [x] **🔴 SSS'te üç cevap açıkça "hayır"** ✅ — POS entegrasyonu yok,
  satış ölçümü yok, mesaj gönderimi şu an kapalı. "Evet" demek kolaydı;
  kasada karşılığı çıkmayan bir "evet" ilk kafede anlaşılır.
- [x] **Yapışkan çağrının üç kuralı** ✅ — kahramanda görünmüyor, son
  çağrıda kayboluyor (`IntersectionObserver`), girişli işletmeciye hiç
  çizilmiyor.
- [x] **🔴 `--color-vitrin-altin` jetonu YOKTU** ✅ — palet notu Ü117'den
  beri dördüncü rengin altın olduğunu yazıyor ama jeton hiç
  tanımlanmamış, sayfada tek yerde elle `rgba(214,178,94,…)` duruyordu.
  Tailwind `text-vitrin-altin` sınıfını **üretmiyor** ve yazı sessizce
  renksiz kalıyordu. Ekranda `rgb(214,178,94)` olarak doğrulandı.
- [x] **Yatay taşma yok** ✅ — 375 = 375 (Dalga 8'de 390 → 406 olmuştu).
- [x] **SSS akordeonu JavaScript'siz** ✅ — `<details>/<summary>`:
  klavye, ekran okuyucu ve arama motoru bedava geliyor.

---

## ⬅️ Ü198 – Ü199 · Çarkın zamanlaması ve Blok'un geri bildirimi — 2026-09-20

✅ Commitlendi (2026-09-20).

### Ü198 · Loopy artık doğru anda itiyor

Ürün sahibi: *"çark çevirme animasyonumuz tam oturmamış, Loopy doğru
zamanda çevirmiyor çarkı, uyuşmuyor."* Ölçüm iki ayrı sebep gösterdi:

| | |
|---|---|
| İtişin zirvesi | ham videonun **0.83. saniyesinde** |
| Çarkın o andaki hâli | dönüşün **%68'i bitmiş** (eğri çok öne yüklü) |
| Videonun son 1.2 sn'si | **ölü** — kare farkı sıfır, Loopy donuyor |

Baş, itişin hemen öncesinden kesildi ve ölü kuyruk atıldı. Kalan
malzeme 4.6'dan kısa olduğu için hafifçe **yavaşlatıldı** (hızlandırmak
değil — itiş daha ağır görünüyor).

- [x] **Zirve 830 ms → 48 ms** ✅ (çark %6'dayken), ölü kuyruk gitti:
  son yarım saniyede hareket 0.2 → 3.08.
- [x] **Duruş karesi ayrı** ✅ — video artık itişin içinden başlıyor,
  yani ilk karesi eğik bir Loopy. `<video poster>` nötr duruşu
  gösteriyor, dönüş bitince `load()` ona dönüyor.

### Ü199 · Blok'ta artık bir şey oluyor

Ürün sahibi: *"oyunlarımızda animasyon, efekt vb şeyler eksik ve blok
blastta sıra patlatılınca ödül kazanmalı, oyunla uyumlu animasyonla
verilmeli."*

- [x] **Satır patlaması** ✅ — temizlenen hücreler soldan sağa dalga
  hâlinde patlıyor (22 ms kademeli). ⚠️ Altın, beyaz değil: tahtanın boş
  hücreleri zaten `rgba(255,255,255,.82)` ve beyaz patlama
  görünmüyordu — Ü194'ün "ikon kendi renginde kartın üstünde" hatasının
  aynısı.
- [x] **Kazanılan puan uçuyor** ✅ — temizlenen karelerin ağırlık
  merkezinden yukarı. Koyu hapın içinde: çıplak beyaz metin soluk mavi
  tahtada okunmuyordu.
- [x] **Çoklu temizlik söyleniyor** ✅ — "ÇİFTE!", "3×!". Skor
  formülünde çizgi sayısının karesi var ama oyuncu neden büyük olduğunu
  göremiyordu.
- [x] **Geçersiz hamlede tahta titriyor** ✅ — eskiden hiçbir şey
  olmuyordu ve oyuncu "dokunmadı mı?" diye tekrar deniyordu.
- [x] **🔴 Ödül eşiği oyun içinde** ✅ — `puan.KUPON_ESIGI` ürünün en
  eski kurallarından biri ama yalnızca **tur bittikten sonra**
  söyleniyordu. Artık çubuk olarak duruyor ("ödüle kalan 497 puan") ve
  eşik geçildiği anda tahtanın ortasında kutlanıyor.
  ⚠️ **Uydurma ödül yok**: aynı sayı sunucuda kuponu açan sayı.
  ⚠️ Konum doğrulanmamışsa çubuk görünüyor ama **kutlama yok** — kupon
  açılmayacakken kutlamak verilmemiş bir söz olurdu.
- [x] **`temizlenecekler()` + regresyon testi** ✅ — `uygula` geri
  döndüğünde temizlenen hücreler çoktan boşalmış oluyor, patlatılacak
  kare kalmıyor. Motor hangi çizgilerin temizleneceğini önceden
  söylüyor; test iki fonksiyonun aynı şeyi söylediğini bir tur boyunca
  hamle hamle doğruluyor.
- [x] **🔴 `pg` istemci paketine sızdı** ✅ — `KUPON_ESIGI`yi istemci
  bileşenine import edince `fs`/`dns` çözülemedi ve derleme kırıldı
  (Ü75'in aynı tuzağı). Sayı sunucu bileşeninden prop olarak geçiyor.

- [ ] **Diğer üç oyun** — Düşen, Yılan, Kelime aynı dili almadı. Blok
  referans uygulama; beğenilirse taşınacak.

---

## ⬅️ Ü197 · Çarkı çeviren Loopy gerçek animasyon oldu — 2026-09-20

✅ Commitlendi (2026-09-20).

- [x] **Ü193'ün CSS itişi yerini videoya bıraktı** ✅ — ürün sahibi
  animasyonu kendisi ürettirdi. İlk deneme kullanılamadı (çark videonun
  içindeydi, dilim sayısı kare kare değişiyordu, alfa yoktu, karakterde
  turuncu şerit yoktu); ikincisi tuttu.
- [x] **Ham dosya üç adımda ürüne girdi** ✅ — betik
  `scripts/cark-video-isle.sh`, gerekçeler `cark.tsx`te:
  - süre **6.0 → 4.6 sn** (`DONUS_MS` ile aynı olmak zorunda),
  - alfa **luma anahtarıyla** üretildi — riskli görünüyor çünkü uzuvlar
    da siyah, ama ölçüm ayrımı gösterdi: zemin tam 0, uzuvlar luma 20+,
    arada boş bant,
  - kadraj **36 karenin birleşik kutusundan** — tek kareye göre
    kırpmak hareketin tepesinde kolu kesiyordu.
- [x] **Ölü CSS silindi** ✅ — `@keyframes cark-loopy-cevir` kaldırıldı,
  geriye yalnızca konum kaldı.
- [x] **Hareket kapalıysa video oynamıyor** ✅ — CSS ile yapılamıyor
  (bir `<video>`nun oynaması animasyon özelliği değil), karar
  `play()` öncesinde veriliyor.

- [ ] **🔴 iPhone'da DOĞRULANMALI** — VP9 + alfa WebM Chrome'da doğru
  çiziliyor (ekranda denendi). Safari alfayı yok sayarsa mor sahnenin
  üstünde **siyah bir kutu** çıkar. Ürün sahibi telefondan bakıyor.

---

## ⬅️ Ü196 · "Bir oyun seç" ana ekranın kartı oldu — 2026-09-19

✅ Commitlendi (2026-09-20).

Bu bölüm **üç turda** yerini buldu ve üçü de aynı dersi veriyor: ürün
sahibi ekranı gösteriyor, tarif etmiyor.

| Tur | Ne yapıldı | Cevap |
|---|---|---|
| Ü194 | Elle kurulmuş dört koyu satır | *"Birebir aynı olmalı"* |
| Ü195 | Katalogun karuseli | *"Hayır carousel şeklinde değil"* |
| Ü196 | `/oyna`daki yatay `GecisKarti` | ✅ gösterdiği kart buydu |

- [x] **`GecisKarti` ortak dosyaya çıktı** ✅ —
  `src/components/gecis-karti.tsx`. `app/oyna/page.tsx` içinde yerel bir
  fonksiyondu, yani yalnızca tek ekran kullanabiliyordu.
- [x] **Kart hem bağlantı hem düğme olabiliyor** ✅ — ana ekran `yol`
  veriyor (`<Link>`), misafir `oyna` veriyor (`<button>`;
  `misafirBasla` tohum üretiyor, oyun sayfada açılıyor).
- [x] **`BiletYuzeyi` artık `<span>` olarak da çizilebiliyor** ✅ —
  `govde` alanı. `<button>`ın içerik modeli phrasing içerik istiyor ve
  `<div>` orada geçersiz; alternatif kartın ikinci bir kopyasını
  yazmaktı.
- [x] **Karusel neden yanlıştı** ✅ — 244×356'lık kart tek seferde **bir**
  oyun gösteriyor, diğerleri için sürüklemek gerekiyor. Masaya yeni
  oturmuş misafir için "dört oyun var" ilk bakışta görünmeli; burası
  katalog değil, ilk karar ekranı.
- [x] **Ü195'in karusel eklentisi geri alındı** ✅ — tek çağıran
  `/oyunlar` kaldı ve o hep bağlantı. Kullanılmayan `oyna` eklentisi
  ölü kod olurdu.

⚠️ Ü195'te yapılan iki şey **kaldı** ve doğruydu: katalog sırası ve
kategoriler `src/oyunlar/katalog.ts`te, misafir de "Düşünerek /
Yetişerek" ayrımını ve bugünün oyununu görüyor.

---

## ⬅️ Ü195 · Misafir de katalogun kartını görüyor — 2026-09-19

✅ Commitlendi (2026-09-20).

- [x] **🔴 "Benzer" yetmedi, "aynı" gerekiyordu** ✅ — Ü194'te misafirin
  oyun listesi elle kurulmuş dört koyu satırdı. Ürün sahibi: *"birebir
  aynı olmalı."* Haklı: iki ayrı kart kodu ikinci turda yine ayrışır,
  bu ekranın o günkü hâli zaten kanıtıydı. Artık **aynı bileşen** —
  `OyunKaruseli` / `OyunKapagi`. Kart, sahne, ölçüler, kategori
  etiketi, "bugünün oyunu · ×2" rozeti hepsi tek yerden.
- [x] **Katalog sırası ortak dosyaya çıktı** ✅ —
  `src/oyunlar/katalog.ts`. `KATEGORILER` Ü66'dan beri
  `app/oyunlar/page.tsx`in içindeydi, yani yalnızca tek ekran
  kullanabiliyordu. Misafir şimdi "Düşünerek / Yetişerek" ayrımını ve
  bugünün oyununu da görüyor — Ü194'te hiçbiri yoktu.
- [x] **Kart iki farklı yolla oynatabiliyor** ✅ — `oyna` eylemi
  verilirse düğme (misafir, `misafirBasla` ile sayfada kalıyor),
  verilmezse bağlantı (`/oyna/<id>`). Biçim tek sabitten
  (`OYNA_SINIFI`), iki kopya değil.
- [x] **Ü194'ün kart denemesindeki iki hata** ✅ — `KartDalgalari` 400×200
  viewBox'ta ve 335×78'lik kartta **2.16 kat** yatay geriliyordu; köşe
  aksanı kartın yarısını kaplayan soluk banda dönüşüyordu (Ü188'in
  aynı tuzağı). Ve ikonun rengi kartın rengiyle aynı kaynaktan
  geldiği için ikon kartın üstünde kayboluyordu. İkisi de karusel
  kartına geçince kendiliğinden çözüldü — o kart ikonu **beyaz
  karoda** taşıyor.

⚠️ **Çark animasyonu ürün sahibinde.** Ona çarkın boş PNG'si verildi
(`gelen/cark/`, 2048², saydam, `cark.tsx`ten üretildi). İlk denemesi
kullanılamadı: çark videonun içindeydi ve dilim sayısı kare kare
değişiyordu, alfa kanalı yoktu, karakterde turuncu şerit yoktu.
Doğrusu **çarksız, saydam, yalnızca Loopy** — çünkü dilimde durma
kararını sunucu veriyor.

---

## ⬅️ Ü193 – Ü194 · Çarkta Loopy ve misafirin ilk ekranı — 2026-09-19

✅ Commitlendi (2026-09-20).

**Hangi ekranlara dokundu:**

| Ekran | Ne değişti |
|---|---|
| Çark sahnesi (`/cark` + `/hemen`) | Çevir'e basılınca Loopy çarkı itiyor, sonuçta zıplıyor · hata kutusunun **kopyası** silindi |
| `/cark` ve `/hemen` daveti | Pastel krem kutu → koyu bilet + çarkı çeviren Loopy; `MiniCark` silindi |
| `/hemen` (karekodu okutanın ilk ekranı) | Başlık koyu karta geçti, masa künyesi içine girdi, Loopy geldi · oyun satırları koyu bilete ve üretilmiş ikonlara geçti (emoji gitti) · konum şeridi tek sütuna indi · sonuç kartı koyu bilete geçti |

- [x] **🔴 Çarkı Loopy çeviriyor (Ü193)** ✅ — `/oyna`daki çark kartında
  bu zaten vardı ama duran bir illüstrasyondu; sahnedeki gerçek çark
  kendi kendine dönüyordu. Yeni görsel **üretilmedi**: elde uzanan kollu
  kare yok, illüstrasyondaki Loopy de kendi çarkıyla tek karede pişmiş.
  İtiş gövde diliyle anlatılıyor (yaylan → savrul → geri tep → heyecan),
  süre `DONUS_MS` ile aynı.
- [x] **🔴 Misafir ekranı işletme panelinin takımıyla yazılmıştı** ✅ —
  `Sayfa`, `Baslik`, `MasaKunyesi` hepsi `components/ui`den geliyordu;
  oyuncu tarafının kabuğu (`KoyuKart`, `BiletYuzeyi`) burada hiç
  kullanılmamıştı. **Karekodu okutan müşterinin ürünle ilk karşılaştığı
  ekran burası.**
- [x] **🔴 Oyunlar emoji olarak gösteriliyordu** ✅ — 🟦 🐍 🧱. Ü182'de üç
  oyunun kendi illüstrasyonu üretilmişti ve `OyunIkonu` her ekranda onu
  kullanıyor; misafir ekranı `oyun.emoji` basıyordu.
- [x] **Konum şeridi ölçülerek tek sütuna indi** ✅ — başlık, açıklama ve
  iki düğme aynı satırdaydı; 375 pikselde düğmeler ~190, boşluklar ~30
  alıyor, metne 110 kalıyordu. Başlık iki, cümle üç satıra bölünüyordu.
- [x] **Altın düğmenin kontrastı** ✅ — beyaz yazı `--color-odul` üstünde
  **2.1:1** çıkıyordu (benim koyduğum düğme). Ü191'in altın gradyanı +
  koyu kahve yazıya çevrildi: 7.07–9.36.
- [x] **🔴 Hata kutusu iki kez basılıyordu** ✅ — `cark.tsx`te blok
  kopyalanmış; çevirme reddedildiğinde aynı uyarı alt alta iki kutuda.

- [ ] **⚠️ Demo verisinde masa adı kafe adına eşit** — `/hemen` başlığı
  *"Kafe A · Kafe A"*, *"Moda Butik · Moda Butik"* yazıyor. Kod doğru
  basıyor; tohumda `cafe_tables.label` bazı satırlarda kafe adı. Tohum
  düzeltilmeli.
- [ ] **⚠️ Kelime'nin ikonu hâlâ üretilmemiş** — Ü192'den devrediyor;
  burada dört kartın üçü parlak, Kelime düz SVG.

---

## ⬅️ Ü191 – Ü192 · Kalan iki pastel yüzey ve profilin içeriği — 2026-09-19

✅ Commitlendi (2026-09-20). Ü191 ve Ü192 birlikte duruyor.

**Hangi ekranlara dokundu:**

| Ekran | Ne değişti |
|---|---|
| `/oyna/[oyunId]` | Tanıtım ve sonuç kartları `kartStili()`ten koyu bilete geçti · oyunun sahnesi sağ üstten taşıyor · altın hap "▶ Oyna" düğmesi · skor başarılıyken kuşağın canlı tonunda |
| `/profil` | Kafe kartının altındaki **beyaz kütük kalktı**, kartın tamamı tek koyu yüzey · son 10 oturum listesi **oyun karnesine** döndü (oyun başına kaç kez · rekor · son tarih) · sayaç ve satır zeminleri `white/10` → `black/25` |

- [x] **🔴 Oyun kabuğundaki iki kart Ağustos'tan beri pastelde kalmıştı**
  ✅ — ürünün en çok bakılan iki kartıydı: oyuncu katalogdan koyu bir
  karta basıyor, açılan ekranda pastel bir kart buluyordu. Sonuç
  kartındaki skor `--color-yazi` idi ve koyu zeminde hiç okunmuyordu.
- [x] **🔴 Profil "ne oynadım" değil "ne kadar iyiyim" diyor artık** ✅ —
  18 oyunun 10 satırlık kütüğü kafe kartından uzundu, dördü aynı oyunun
  tekrarıydı ve oyuncunun bilmediği bir şey söylemiyordu (kendi
  oynadığı oyunun tarihini zaten biliyor). Aynı 18 oturum oyun başına
  toplanınca **dört satır** kalıyor: kaç kez, **rekor kaç**, son ne
  zaman. Gruplama SQL'de (`domain/gecmis.ts`), `KAFE_BASINA = 10`
  limiti kalktı — karnenin satır sayısını katalog sınırlıyor.
- [x] **🔴 Satır zeminleri ölçülerek koyulaştırıldı** ✅ — `bg-white/10`
  **eklemeli**: kart karne satırlarıyla uzayınca `KartDalgalari`nin
  sağ alt aksanı rekor sütununun altına düştü ve alt iki satırın sayısı
  gözle görülür soluklaştı. Beyaz metnin kontrastı aynı kart içinde
  3.17 ↔ 5.79 arasında geziyordu; `black/25` ile taban **5.95**,
  yayılma kapandı.
- [x] **Rekor rengi** ✅ — önce kuşağın `canli` tonu denendi, dört
  kuşakta da kalıyor (2.13–3.06). Altın gök ve amberde kalıyor. Beyaz
  dördünde de geçiyor.
- [x] **Regresyon testi** ✅ — `GROUP BY`ın iki tuzağı: rekor `max()`
  yerine son skor olursa, ve kafe toplamı `count(*) OVER` olursa
  ("5 oturum" yerine "2 oyun"). İkisi de mutasyonla doğrulandı.

- [ ] **⚠️ Kelime'nin ikonu üretilmemiş** — satırlardaki ikon 18'den
  30 piksele çıktı ve üç oyunun (Düşen, Blok, Yılan) üretilmiş parlak
  ikonu var, Kelime'ninki elle çizilmiş düz SVG. 30 pikselde fark
  görünüyor. **Görsel üretmeden önce sorulacak.**

---

## ⬅️ Ü187 – Ü190 · Kartlar referans tasarıma geçti — 2026-09-19

✅ **Commitlendi** — `68e0e74`, 30 dosya.

**Hangi ekranlara dokundu:**

| Ekran | Ne değişti |
|---|---|
| `/oyna` | Bugünün oyunu kartı yeniden dizildi (Loopy kalktı) · çark kartı koyu bilete geçti ve çarkı çeviren Loopy geldi · seri kartına ateşte koşan Loopy · karşılama kartına bulutlu zemin |
| `/oyunlar` | Sahneler 215 → 290 taban · katalog başlığına `tum-oyunlar` sahnesi (Ü180'de üretilmiş ama hiç bağlanmamıştı) |
| `/oduller` | Kupon kartlarında ödül türüne göre Loopy — beş tür, beş görsel |
| `/profil` | Kafe kartına puan/kupon/seri sayaçları · üst döşeme dörde çıktı · bulutlu zemin, Loopy bulutun üstünde |
| Her yerde | Üç oyun ikonu üretildi (Yılan'ın ikonu **hiç yoktu**) |

- [x] **Yedi illüstrasyon üretildi** ✅ — hepsi tek Loopy referansından
  türedi, karakter değişmedi. Çark bizim çarkımız (ahududu çerçeve,
  altı pastel dilim) — referanstaki mor-altın çark değil.
- [x] **🔴 "Ice Americano" SICAK içecek görünüyordu** ✅ — Türkçede `I`nin
  küçüğü noktasız `ı`, listedeki `ice` hiç tutmuyordu. Koddaki yorum bu
  sonuçtan korkup sırayı ona göre kurmuştu ama kelime hiç eşleşmediği
  için sıra da işe yaramıyordu: **doğru sıra, yanlış karşılaştırma.**
- [x] **🔴 `yiyecek` türü metinden ulaşılamıyordu** ✅ — listede o satır
  yoktu; poğaça, börek ve simit `tatli` listesindeydi.
- [x] **Profil "elimde ne var" da diyor** ✅ — puan yalnızca ana ekranda,
  kupon yalnızca Ödüllerim'de, seri yalnızca kafedeydi. *"B kafesinde ne
  kadar puanım var"* sorusunun cevabı üründe hiçbir yerde yoktu.
- [x] **Demo verisi her kupon türünü gösteriyor** ✅ — ödüller kategoriye
  göre seçiliyor, kazınacak kupon 5 → 3.

⚠️ **İki tur boşa gitti ve ikisinin de dersi aynı:** Ü188'de zemine
sağ üstten ışık hüzmeleri kondu, ürün sahibi *"her şeye parlaklık
eklemişsin, kötü duruyor"* dedi ve geri alındı. Doku dikey çizilip yatay
karta **gerildiği** için yassılıyordu. İlk illüstrasyon partisi de
hamurumsu geldi çünkü prompt'ta **negatif liste** yoktu — oyun
sahnelerinin ilk turundaki hatanın aynısı.

⚠️ **Kalan:** `/oyna/[oyunId]` tanıtım ve sonuç kartları hâlâ Ağustos'tan
kalma pastel `kartStili()`de — ürünün en çok bakılan iki kartı. Ayrıca
çarkın dilim renkleri ve ateş karesindeki Loopy'nin kol rengi biraz
kaydı (bilerek kabul edildi).

🧪 **Doğrulama:** 668 test ✅ · tip ✅ · lint ✅ · build ✅. Ölçüler
tarayıcıda DOM'dan: kalem–balon çakışması 22×16,5 piksel, kart 244×356
ile 335×96, ikonlar 16–64 piksel aralığında.

---

## ⬅️ Ü186 · Loopy'nin rengi oyuncunun oldu — 2026-09-18

**Hangi ekranlara dokundu** (bu satır olmadan liste yanıltır):

| Ekran | Ne değişti |
|---|---|
| **`/loopy` — YENİ** | Özelleştirme ekranı. Yapışkan önizleme + 66 bardak, 22 şerit rengi |
| `/profil` | "Hesabın" listesinin başına *"Loopy'i özelleştir"* satırı |
| Yuva (tam ekran) | *"Özelleştir"* düğmesi `/profil` yerine `/loopy`ye gidiyor |
| `/oyna` · `/oduller` · `/oyna/[oyunId]` | Oyuncunun rengi sayfaya basılıyor; oradaki her Loopy o renkte |

- [x] **İki eksen bağımsız** ✅ — göç 0045
  `avatar_renk` düştü, yerine `avatar_govde` + `avatar_serit`.
  Ürün sahibinin üç isteği (*"çizgi sabit bardak her renkte · bardak
  sabit çizgi her renkte · ikisi de ayrı"*) tek arayüzle karşılanıyor:
  birini değiştirip diğerine dokunmamak zaten o üç hâli veriyor.
- [x] **Renk dosya olarak ÜRETİLMİYOR** ✅
  Her kare üç katmana bölündü (`scripts/avatar-katman-uret.py`): sabit
  (kapak, kol, bacak, yüz) + gövde + şerit. Son ikisi **gri parlaklık**
  ve renk tarayıcıda `multiply` ile biniyor.
  🔴 Alternatifi 5 kare × 81 renk = **405 dosya, ~6 MB** idi. Üç katman
  kare başına ~15 KB — bugünkü tek karenin bile altında.
  ⚠️ Gölgeler korunuyor: `rgb(h,s,v) = v · rgb(h,s,1)`, yani çarpma
  matematiksel olarak "her pikseli kendi parlaklığıyla çarp" demek.
- [x] **Renk prop olarak taşınmıyor** ✅
  Loopy on beş yerde çiziliyordu; hepsine iki alan eklemek yerine
  oyuncuyu bilen sayfa bir CSS değişkeni basıyor, altındakiler miras
  alıyor. Bilmeyen yüzeyler (kafe paneli, vitrin) özgün renge düşüyor.
- [x] **Maske üç kuralda oturdu** ✅
  "En büyük parça" ve "gövdeye en çok değen" kuralları ikisi de KALBİ
  seçti (`keyifli` karesinde tutulan kalp şeride değiyor, tek bileşen
  oluyorlar). Tutan kural **ton penceresi**: şerit 0,061 · kalp 0,034 ·
  altın 0,111.
- [x] **Kayıt ekranı bekletmiyor ama sessiz de değil** ✅
  Renge dokunan sonucu anında görüyor; kayıt düşerse seçim **geri
  alınıyor** ve uyarı çıkıyor.

⚠️ **Aksesuar (bere/gözlük/fular) hâlâ KAPALI** ve bayrağın adı değişti:
`COK_RENKLI` → `AKSESUARLI`. Sebep değişmedi — 3B gövdeye düz vektör
bere ikisini de bozar; her kare farklı açıda olduğu için ayrı render
gerekiyor (~15 üretim). Kolon, doğrulama ve testler yerinde bekliyor.

⚠️ **Koşan Loopy (`kacan`) varsayılan renginde kalıyor** — o 100 karelik
tek bir animasyon dosyası, gövdeyle şerit iç içe. Seri sahnesinde
oyuncunun rengi geçerli değil.

🧪 **Doğrulama:** 664 test ✅ · tip ✅ · lint ✅ · göç 0045 uygulandı.
Üç katmanın çarpma/maske/izolasyon zinciri tarayıcıda DOM'dan ölçüldü.
⚠️ **`/loopy` ekranına gözle BAKILMADI** — oturum kapalıydı ve parola
girilmedi. Telefonda bir kez bakılmalı.

---

> ⬅️ **DALGA 10 bitti** (Ü151) — mobil vitrinin hareketsiz alt yarısı
> dolduruldu. ⚠️ **Referans linkleri hâlâ bekleniyor**, aşağıya bak.
>
> Önceki turlar: Dalga 9 commitlendi (`da11163`) · Dalga 6'nın iki işi
> commitlendi (`91ee2ed` — Ü149 tohum kapısı, Ü150 panel işletme
> türüne göre). **Dalga 6'da kalan:** madde 41 (müşteri adı/telefonu,
> L — aydınlatma metnini yeniden yazdırıyor) ve madde 42 (sipariş
> tutarı, M). Ondan sonra **K5**.
>
> 🧪 **Elle denemek için:** `npm run db:demo` → `05320000099` /
> `Deneme1234`. Oturum dolarsa komutu tekrar çalıştır.

> 🚀 **Yayına çıkış işleri ayrı bir listede:** `docs/25-yayin-plani.md`
> (güvenlik → altyapı → mesajlaşma → hukuk). Orası **sırayı** tutuyor,
> burası ürün işlerini. Şu an orada: A0 ✅ · A1 ✅ · **sıradaki A2**.

---

# DALGA 7 · ✅ TAMAMLANDI — 2026-09-16

> Tek oturumda on üç iş. Ayrıntı karar defterinde (`02`), Ü125–Ü139.
> ✅ **Commitlendi ve push edildi** — `ecd8543`, 138 dosya.
> Depo `github.com/Kalempox/Looply` ile senkron.

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

# DALGA 10 · mobil vitrinin alt yarısı ⬅️

> Ürün sahibi 2026-09-17: *"mobil landing page için sana söylediğim
> hiçbir animasyon gerçekleşmemiş, sana hepsinin linkini de vermiştim."*
>
> **Ölçüldü ve haklıydı.** 375 pikselde sayfa 10.989 piksel; on iki
> örnekleme noktasından **sekizi sıfır animasyon** gösterdi. 5.791'inci
> pikselden aşağısı — sayfanın **%47'si**, yedi bölümün beşi — yalnızca
> `Beliren`in tek jestini taşıyordu (35 kez, hep aynı).

## 🔴 Neden "dokuz işin dokuzu bitti" ile çelişmiyor

Dalga 9'un dokuz işi gerçekten bitti. Ama **sekizi oyuncu tarafına**
gitti (kazıma, karusel, avatar, seviye, rozet); vitrine düşen tek iş
Ü145'ti ve o sayfanın en üstünde. Belge bu ayrımı hiç yazmadı — liste
"bitti" derken ürün sahibi mobilde hiçbir şey görmüyordu. **Ders: bir
işin hangi yüzeye düştüğü, bittiği kadar önemli.**

## ✅ ÇÖZÜLDÜ · Kazıma açılmıyordu — Ü160, 2026-09-17

- [x] **🔴 Kazıma oranı ölçülüyordu ama ölçüm hiç koşmuyordu.**
  Ürün sahibi **üç kez** *"kuponumu kazıyamıyorum"* dedi. Kazıma
  çalışıyordu, yüzey siliniyordu, oran eşiği geçiyordu — kart yine
  açılmıyordu.

  **Sebep:** ölçüm yalnızca `kimilda` içinde ve `sayac % 9 === 0`
  koşuluyla yapılıyordu. Dokuzda bir örnekleme maliyeti düşürüyor ama
  bir **varsayıma** dayanıyor: *"kazıyan parmak bol bol `pointermove`
  üretir."* Parmak öyle yapıyor; **fare yapmıyor.** DevTools'un mobil
  görünümünde bir sürükleme iki üç olay üretiyor, sayaç dokuzun katına
  hiç denk gelmiyor ve ölçüm hiç koşmuyor.

  **Ölçüm:** dört geçişten sonra silinen oran **0,469**, eşik 0,30 —
  kart hâlâ kapalıydı. Parmak kalkışına (`birak`) tek bir ölçüm eklendi;
  aynı dört geçişte kart açıldı.

  ⚠️ Eşik de 0,50'den **0,30**'a indirildi: üç tam geçiş yalnızca 0,235
  yapıyor, yani 0,50 için altı yedi geçiş gerekiyordu. O kadar
  uğraşmadan önce herkes bırakır ve karta "bozuk" der.

- [x] **Oyun karuseli — ARIZA YOK, teşhisim yanlıştı.**
  Ürün sahibi *"kaydıramıyorum"* dedi ve ben iki kez yanlış cevap
  verdim, üçüncüde de yanlış yöne gittim (*"gerçekten bozuk"*).
  `console.log` ile bakıldığında karusel **çalışıyor**:

  ```
  [KRS] bas mouse 180
  [KRS] yon karari yatayMi= true dx= -63.5 dy= 0
  [KRS] payYaz 0.420 → 0.840
  [KRS] birak basiliMi= true pay= 0.840 aktif= 1
  [KRS] dinleyiciler kuruldu, aktif= 2      ← ilerledi
  ```

  Ekranda da kart "Blok"tan "Düşen"e geçti.

  🔴 **Yanılmamın sebebi ölçüt seçimiydi ve üç kez tekrarlandı:**
  önce `innerHTML.length` (sayfadaki avatar animasyonu yüzünden zaten
  değişiyordu), sonra DOM sırası (kartlar `transform` ile kayıyor, sıra
  sabit), sonra ilk kartın `transform`'u (aktif kart o değil).
  **Ders: "çalışıyor mu" sorusunu, o şeyin gerçekten değiştirdiği
  değeri okuyarak sor.** Ölçüt yanlışsa hem "çalışıyor" hem "bozuk"
  sonucu üretilebiliyor — bu oturumda ikisi de üretildi.

  ⚠️ Ürün sahibinin yaşadığı şeyin kalan açıklaması **avatar yuvası**:
  `fixed` ve köşede duruyor, dar ekranda karuselin sağ kenarını
  kapatıyor. Ölçümde imlecin altındaki öge karusel değil yuva çıktı.

- [x] **Avatar yuvası içeriğin üstüne biniyordu** ✅ **ÇÖZÜLDÜ** — Ü161
  🔴 **Küçültmek çözüm değildi ve denendi:** 56'dan 48 piksele indirildi,
  `z-30`dan `z-20`ye çekildi — çakışma azaldı ama kalmadı. Dar ekranda
  köşede duran bir şeyin içeriğin üstüne binmemesi mümkün değil.
  ➜ **Doğru çözüm nerede DURMAYACAĞINA karar vermek:** sürükleme yüzeyi
  olan ekranlarda yuva yok. `/oyunlar` (karusel), `/oduller` ve detayı
  (kazı-kazan), `/oyna/[oyunId]` (oyun tahtası), `/profil` (avatar zaten
  orada). Kural ve gerekçeleri `components/oyuncu.tsx`te yazılı.
  Doğrulandı: karuselin üstündeki öge artık kartın kendisi.

- [x] **Çevir düğmesi ara ekrana götürüyordu** ✅ **ÇÖZÜLDÜ** — Ü161
  Düğmenin adı "Çevir" ama vardığı yer bir **davet kartıydı**
  (*"Dokun, çark tam ekranda açılsın"*); oyuncu aynı şeye ikinci kez
  basmak zorundaydı. ⚠️ Yeni yol açılmadı: Ü96 karekodu yeni okutan
  oyuncu için `?cark=1` mekanizmasını zaten kurmuştu. Adres çubuğundan
  `/cark`e giden hâlâ daveti görüyor — oraya niyetle gelen, çevirmeden
  önce dilimlere bakabilmeli.

---

## 🔴 Karusel "kaydıramıyorum" — üç turda öğrenilenler (Ü162–Ü163)

Ürün sahibi **üç kez** bildirdi. Üç tur sürdü çünkü her turda başka bir
şey yanlıştı ve ikisi bendeydi.

**Tur 1–2 · Ölçütüm yanlıştı.** Sentetik olaylarla test edip iki kez
*"çalışıyor"*, bir kez *"bozuk"* dedim. Üçünde de hata aynı yerdeydi:
`innerHTML.length` (avatar animasyonu yüzünden zaten değişiyordu), DOM
sırası (kartlar `transform` ile kayıyor), ilk kartın `transform`'u
(aktif kart o değil). **Ölçüt yanlışsa hem "çalışıyor" hem "bozuk"
üretilebiliyor.**

**Tur 3 · İki gerçek kusur bulundu.**

- [x] **İşaretçi yakalama eklendi** (Ü162). Fare girdisiyle karusel
  çalışıyor ama ürün sahibi DevTools'un **mobil görünümünde** deniyor ve
  orada dokunma taklidi açık. Dokunmada tarayıcı jestin kaydırma mı
  sürükleme mi olduğuna kendi karar veriyor ve kaydırma derse akışı
  `pointercancel` ile kesiyor. `setPointerCapture` kararı bize alıyor.
  ⚠️ `pointerleave` bağı da kalktı: dar ekranda kenara yaklaşan parmak
  sürüklemeyi bitiriyordu.
  ⚠️ **Ölçülerek değil teşhisle yapıldı** — dokunma taklidi bu panelde
  üretilemedi.

- [x] **Noktaların dokunma alanı 8 → 44 piksel** (Ü163). Sürükleme
  dışında bir yol vardı ama kullanılamaz hâldeydi: ölçüldüğünde
  noktalar **8×8 piksel** çıktı. Parmak ucu ~44 piksel; 8 piksellik
  hedefe basmak şansa kalıyor. Görünen nokta aynı kaldı, büyüyen yalnızca
  basılabilir alan.
  ⚠️ Yan kartlar zaten 189×297 ve dokununca öne geliyor — o yol
  baştan beri çalışıyordu.

**Tur 4 · Asıl sebep hiç kodda değildi: kökeni engellenen LAN adresi.**

Ürün sahibi dördüncü kez bildirdi, bu kez *"problem bende mi acaba,
çünkü burada çalışıyor"* diye sordu — ve konsol ekran görüntüsünü
gönderdi. Cevap oradaydı:

```
Failed to load resource: the server responded with a status of 403 (Forbidden)
WebSocket connection to 'ws://192.168.1.3:3000/_next/hmr?id=...' failed:
```

Ekranı **`http://192.168.1.3:3000`** üzerinden açıyordu, `localhost`
üzerinden değil (telefondan da bakabilmek için). Next 16'nın geliştirme
sunucusu, **başlatıldığı adresten** farklı bir kökenden gelen istekleri
varsayılan olarak engelliyor:

`server/lib/router-utils/block-cross-site-dev.js` → `/_next` altındaki
her şeye `403 Unauthorized`, HMR websocket'ine ret.

🔴 **Ölçüldü** (`curl`, aynı sunucu):

| İstek | Yanıt |
|---|---|
| `Origin` başlıksız | 404 (dosya yok — kapıdan geçti) |
| `Origin: http://192.168.1.3:3000` | **403 `Unauthorized`** |

Belirtisi bir yapılandırma hatasına hiç benzemiyor: **sayfa açılıyor,
ekran doğru görünüyor**, ama JavaScript'in bir kısmı hiç gelmiyor ve
sıcak güncelleme ölü. Yani her turda kodu düzelttim, her turda onun
sekmesi eski/eksik paketi çalıştırmaya devam etti. Üç turun da tek
başına açıklaması bu.

- [x] **`allowedDevOrigins` eklendi** (`next.config.ts`, Ü164). Sabit IP
  yazılmadı: DHCP adresi değiştirdiği gün aynı tuzağı yeniden kurardı ve
  belirtisi yine bu kadar dolaylı olurdu. `os.networkInterfaces()` ile
  makinenin kendi IPv4 adresleri bulunuyor, üretimde liste boş.

✅ **Uçtan uca doğrulandı — `http://192.168.1.3:3000`, 375 piksel:**
0 hatalı istek, konsol temiz, iki sürüklemede kupon **açıldı**, karusel
üç ardışık sürüklemede üç kez tek kart ilerledi.

---

### Yol boyunca bulunan gerçek kusur: bırakma noktası çöpe atılıyordu

Ölçerken `pointermove` sayıldı: tek bir sürükleme **iki** olay
üretiyor. Sıfıra çok yakın. Sıfır olduğunda ne oluyor diye denendi:

```
150 piksellik jest, hiç pointermove yok → aktif 1 → 1   (hiç kıpırdamadı)
```

- [x] **`birak` artık bırakma olayının konumunu okuyor** (Ü164). Önceki
  hâli yalnızca son `pointermove`un yazdığı payı okuyordu, yani
  *"sürükleyen parmak yolda bol bol olay üretir"* varsayımına
  dayanıyordu — kazımadaki `sayac % 9` hatasının aynısı, başka yerde.
  ⚠️ Yön kararı korundu: dikey jest yatay sayılmıyor.

  Doğrulama (aynı ekran, düzeltmeden sonra):

  | Jest | Sonuç |
  |---|---|
  | Sıfır hareketli yatay fiske | 1 → **2** ✓ |
  | Sıfır hareketli dikey jest | 2 → 2 ✓ |
  | 5 piksellik titreme | 2 → 2 ✓ |

⚠️ Hâlâ ölçülemeyen: **gerçek dokunma**. Panelde dokunma taklidi
üretilemiyor. Sorun sürerse sıradaki adım `touch-action`: bugün `pan-y`.
Yatay jest için `none`a geçmek gerekebilir — ama o zaman karuselin
üstünden sayfayı dikey kaydırmak bozulur, bedeli ölçülmeden yapılmamalı.

🔴 **İki ders:**

1. *"Bende çalışıyor, sende çalışmıyor"* denildiğinde sorulacak ilk şey
   kodun ne yaptığı değil, **karşı tarafa kodun ulaşıp ulaşmadığı.**
   Dört tur boyunca yanlış katmana baktım.
2. **"Olay bol gelir" varsayımı bu projede iki kez yanlış çıktı** —
   kazımada (`sayac % 9`) ve karuselde (bırakma noktası). Bir jestin
   sonucu, kaç olay geldiğine bağlı olmamalı.

---

## 🔴 Oyunlar "oynanabilir değil" — iki arıza, ikisi de bizim (Ü166–Ü167)

Ürün sahibi *"oyunların arayüzleri de çok çirkin, oynanışları da çok
kötü, hiç oynanabilir durumda değil"* dedi. Dördünü de oynadım. İki
gerçek arıza çıktı ve ikisi de **kendi eklediğimiz** şeylerdi.

- [x] **🔴 Karuselden hiçbir oyun açılamıyormuş (Ü167).** "Oyna →"ya
  basmak hiçbir şey yapmıyordu. Sebep Ü162'de sürüklemeyi düzeltmek
  için eklenen `setPointerCapture`: işaretçi `pointerdown`da
  yakalanınca tarayıcı `click` hedefini yakalayan ögeye kaydırıyor ve
  bağlantı hiç tetiklenmiyor.

  A/B ölçüldü — aynı sayfa, bağlantının tam ortasına aynı tıklama:

  | Davranış | Tıklama hedefi | Sonuç |
  |---|---|---|
  | `pointerdown`da yakala (Ü162) | `DIV` | gitmedi |
  | Yön kararında yakala (Ü167) | `A` → `/oyna/kelime` | **gitti** |

  Yakalama kaldırılmadı, **geciktirildi**: jestin sürükleme olduğu
  anlaşılınca yakalanıyor. Dokunup bırakan parmak hiç yakalamıyor.
  Sürüklemenin bozulmadığı da ölçüldü (`aktif` 2 → 3, sayfa değişmedi).

  🔴 **Ders:** yakalama ucuz bir sigorta gibi duruyor ama bedeli var ve
  bedeli **başka bir etkileşimde** ödeniyor. Bir jesti kurtarmak için
  konan şey, aynı yüzeydeki başka bir jesti sessizce kapatabiliyor.

- [x] **🔴 Düşen'de "Bırak" düğmesi alt şeridin altında kalıyormuş
  (Ü166).** Ölçüldü: düğme 748–803, şerit 743'ten başlıyor
  (`fixed`, `z-20`). Düğmenin tam ortasında `elementFromPoint`
  **şeridin ikonunu** döndürüyordu — yani parçayı bırakmak için
  basılan yer oyundan çıkarıyordu.
  ➜ Oyun oynanırken şerit yok (`menu={false}`). Üstteki `‹ Oyunlar`
  duruyor, yol kapanmıyor.

- [x] **Tahtalar "çirkin"in tek sayısı (Ü166):** boş hücre ile tahtanın
  zemini arasındaki kontrast **1,10 : 1** (1,00 = aynı renk).

  | | blok | düşen | yılan | kelime |
  |---|---|---|---|---|
  | önce | 1,10 | 1,13 | 1,11 | 1,12 |
  | sonra | 1,45 | 1,65 | 1,50 | 1,56 |

  ⚠️ Asıl şüpheli masum çıktı: dolu-boş kontrastı zaten 3,3–4,5'ti.
  Parçalar görünüyordu, **görünmeyen tahtaydı.** İlişki ters çevrildi:
  tahta koyu tepsi, hücreler açık karo — aradaki boşluk kendiliğinden
  ızgara çizgisi oluyor.

- [x] **"Oyna"dan sonra ikinci bir "Oyna" ekranı yok (Ü167).**
  ⚠️ Bedeli: sayfaya gelmek artık günlük hakkı harcıyor. "Kazandırmaz"
  uyarısı kaybolmadı, oynarken başlıkta duruyor.

🔴 **Ölçüm aracının kendisi de yanılttı:** tarayıcı paneli tıklama
koordinatlarını **1,345** ile ölçekliyor — istenen (133, 581) sayfaya
(179, 781) gidiyor. İlk teşhisler bu yüzden hedefi kaçırmış
tıklamalara dayanıyordu. Fark edilince A/B baştan kuruldu ve sonuç
değişmedi, ama **önceki sayılara güvenilmezdi.**
➜ Panelde koordinatla tıklamadan önce bir `pointerdown` dinleyicisiyle
oranı ölç; `ref` ile tıklamak da aynı ölçeklemeye giriyor.

➜ **Kalan (sıradaki tur):** skor küçük gri ve değişince hiçbir şey
olmuyor; tahta büyüyebilir (şerit kalkınca alan açıldı); Blok'ta bütün
parçalar aynı renk.

---

## 🔴 Doğrulama kodu SMS'ten e-postaya taşındı (Ü170)

Ürün sahibi: *"kod sms gelmeyecek ama kod gmaile gidecek."*

Taşımanın kendisi küçüktü (tek çağrı yeri). Asıl iş, **o kanala bağlı
olan şeyleri bulmaktı** — ve üçü ancak arandığında çıktı.

- [x] **Küresel tavan kaybolmuştu.** G14 (`sms_outbox`, 2.000/gün) OTP
  isteklerini de sınırlıyordu; e-postaya geçince o yol tavanın dışında
  kaldı. Kişi ve IP başına sınırlar duruyordu ama **sistem çapında
  durdurucu yoktu.** Testler yakaladı (`kapasite_dolu` artık hiç
  dönmüyordu). Tavan e-posta tarafına taşındı: 5.000/gün, aynı kademe
  (%90'da kayıt durur, giriş devam eder).

- [x] **🔴 Kafe ve platform girişi kırılmıştı.** `kodIste`yi onlar da
  çağırıyor ama kimlikleri `staff` tablosunda ve orada **e-posta kolonu
  yok**. Varsayılan e-posta olunca ikisi de sessizce `eposta_yok`
  dönmeye başladı — kafe sahibi paneline hiç giremez olmuştu.
  Fark edilmedi çünkü **o yolun testi yoktu**; şimdi var.
  ➜ `kanal: "eposta" | "sms"` parametresi eklendi, personel SMS'te
  kaldı. "Kullanıcı" oyuncu demekti, personel değil.

- [x] **Ekranın dört ayrı yerinde yalan vardı.** Telefon alanının
  ipucu ("kod bu numaraya gelecek"), kod ekranının ipucu ("… numarasına
  gönderildi"), "Parolanı mı unuttun? SMS ile gir" ve geliştirme
  kutusunun başlığı. Hepsi kullanıcıyı telefonuna bakmaya gönderiyordu.

➜ **Açık kalanlar:**

- [ ] **Tavan sayısı sağlayıcı planına göre gözden geçirilmeli.**
  5.000/gün seçildi ama Resend'in ücretsiz katmanı **aylık** 3.000 —
  yani bu tavan orada tek günde aşılabilir.
- [ ] **`kodEkrandaGosterilir` adı `sms/index.ts`te duruyor** ama artık
  e-postayı anlatıyor. Adını taşımak çağıranların hepsine dokunmayı
  gerektiriyor.
- [ ] **Ü169 öncesi hesapların e-postası yok** (5.767'nin 87'si hariç).
  Onlar kodla giremiyor, yalnızca parolayla. Ekran doğru cümleyi
  kuruyor ama kalıcı çözüm bir "e-posta ekle" akışı.
- [ ] **`RESEND_API_KEY` henüz yok.** `EPOSTA_SAGLAYICI=console` ile
  kod ekranda görünüyor; gerçek gönderim denenmedi.

---

## 🔴 Test yığını kendi kendini zehirliyor — 2026-09-17'de bulundu

- [ ] **`sms_outbox` testler arasında temizlenmiyor.** Günlük SMS tavanı
  (G14, `sms/index.ts`) **kayan 24 saat** penceresinde `status = 'sent'`
  satırlarını sayıyor ve 2.000'de doluyor; %90'da yeni kayıt kapanıyor.
  Testler kendi SMS'lerini yazıyor ama silmiyor.
  ➜ Bir günde yeterince çok koşarsan yığın **kendi kendini düşürüyor**:
  bugün sekizinci koşuda 1.803 'sent' satır birikti ve beş test
  `kapasite_dolu` ile kırmızı yandı. Ürün doğru çalışıyordu.
  ⚠️ **Arıza testte değil izolasyonda:** beş testin beşi de doğru şeyi
  sınıyor, yalnızca paylaşılan bir sayaç üzerinden. Bu, `rapor.test.ts`te
  Ü120'de çıkan kırılganlığın (*"gerçek trafik varken kırmızı yanıyordu"*)
  aynı ailesi — o da tohumdan ödünç aldığı masa yüzünden düşmüştü.
  ➜ **Çözüm:** SMS yazan testler kendi satırlarını sonda silsin, ya da
  `_yardim.ts`e `smsDefteriniTemizle()` konup `before` içinde çağrılsın.
  ⚠️ Elle temizlemek geçici: `DELETE FROM sms_outbox WHERE created_at >
  now() - interval '2 days'` yığını yeşile döndürüyor ama ertesi gün
  aynı yerden düşüyor.

- [x] **İkinci vaka — test ödülü DEMO EKRANINA sızdı (Ü165).** İlk vaka
  yalnızca yığını düşürüyordu; bu, ürün sahibinin ekranına çıktı.

  `kupon-kazima.test.ts` `before` içinde **tohum kafesine** (Kafe A)
  `"KAZIMA Filtre Kahve"` adında bir ödül ekliyor ve silmiyordu. Ürün
  sahibi *"bu kazıma filtre kahve ne alaka"* diye sordu. Sayıldı:

  | Nerede | Ne bulundu |
  |---|---|
  | Kafe A | **46** kopya "KAZIMA Filtre Kahve" (gerçek ödüller birer tane), 528 kupon |
  | `rewards` tablosu | 2.388 satırın **2.296'sı** test kalıntısı (%96) |
  | `cafes` | 750 test kafesi — `CarkTest` ×283, `CarkButcesiz` ×283, `CarkButce` ×92, `CarkButceDolu` ×92 |

  🔴 **Bedeli görüntü değildi.** Çark kafenin bütün aktif anlık
  ödüllerini dilim yapıyor (`domain/cark.ts` → `odulleriOku`), yani
  çarkın neredeyse her dilimi test ödülüydü: *"çarkta neden hepsinde
  kazıma yazıyor"*.

  ➜ Test artık `after` içinde kendi ödülünü ve kuponlarını siliyor.
  ⚠️ Temizlik **yönetici rolüyle** yapılıyor; ilk yazılışta `withBypass`
  denendi ve `aclcheck_error` ile düştü — uygulama rolünün bu tablolarda
  silme yetkisi bilerek yok (`_yardim.ts` başlığı bunu anlatıyor).

  ✅ Ölçüldü: temizlikten sonra Kafe A'da 16 ödül; tam koşudan sonra
  **yine 16**, `KAZIMA` kalıntısı **0**. 649 test, 0 hata.

- [ ] **Yedi test geceleri sessizce atlanıyor.** `hatirlatma.test.ts`
  sessiz saatte kendini `SKIP` ediyor (`# SKIP sessiz saatte
  koşuluyor`). Gündüz 649/649 geçiyor, akşam 642 geçip 7 atlanıyor.
  ⚠️ Tehlikesi yeşil ekranın anlamının **saate göre değişmesi**: gece
  koşan bir CI, hatırlatma yolunu hiç sınamadan yeşil yanıyor.
  ➜ Sessiz saati testte sabitlemek (enjekte edilen saat) doğru çözüm;
  koşuyu saate bırakmak değil.

- [ ] **750 test kafesi hâlâ duruyor.** `cark.test.ts` her koşuda dört
  yeni kafe açıyor (`kafeKur`) ve hiçbiri silinmiyor. Demo ekranında
  görünmüyorlar ama tablo şişiyor ve platform tarafında kafe listesi
  gören bir ekran olursa oraya düşerler.
  ➜ Ya `kafeKur` kendi kafesini `after`da silmeli, ya da testler ortak
  bir "test kiracısı" altında toplanıp toplu temizlenmeli.

- [ ] **Asıl yapısal iş: `kupon-kazima.test.ts` tohum kafesine hiç
  yazmamalı.** Bugünkü temizlik kirlenmeyi durduruyor ama testin
  demo verisiyle aynı kafeyi paylaşması kırılgan. Kendi kafesini
  kurmak, tohumdan aldığı personel ve bütçe kurulumunu taşımayı
  gerektiriyor.

---

## 📌 REFERANS LİNKLERİ — buraya yazılıyor, bir daha kaybolmasın

> 🔴 Bu tablo **Ü151'de açıldı** çünkü linkler hiçbir yere yazılmamıştı:
> `docs/02` ve `docs/23`'te sıfır URL vardı, yalnızca uygulama adları
> duruyordu. Ürün sahibi *"sana hepsinin linkini de vermiştim"* dedi ve
> haklıydı — verilmişti, **kaydedilmemişti.**
>
> **Kural: yeni bir referans geldiğinde önce buraya yazılır, sonra
> koda geçilir.**

| # | Link | İstenen | Nereye düşüyor | Durum |
|---|---|---|---|---|
| R1 | [X Money · Card Envelop Reveal](https://60fps.design/appsites/x-money-card-envelop-reveal-animation) | *"Bu animasyonda kutu açılıyor, kart oluyor ya — bizde de mobil cihaz içinden kupon çıksın. Üstte de 'kuponlar para kaybı değil müşteri kazanımı' gibi bir slogan yazsın."* | Mobil vitrin · `vitrin-yaklasma.tsx` → `TelefondanKupon` | ✅ Ü152 — gözle doğrulandı |

## 🔴 R1 · "gerçekleşmiyor" dedi, ölçüm başka bir şey söyledi — Ü152

Ürün sahibi F12 → mobil görünümde bakıp *"bu gerçekleşmiyor mobilde"*
dedi. Ölçüm onu doğruladı **ama beklenmedik biçimde**: kupon çıkıyordu,
animasyon durumu `finished` dönüyordu — yani hareket olmuş, bitmiş,
kupon telefonun üstünde park etmişti. Ekranda görülen şey hiç
kımıldamayan bir karttı.

**Sebep gözlemcinin yanlış ögeyi izlemesiydi.** Gözlemci **kapsayıcıya**
bağlıydı ve kapsayıcı telefondan çok daha uzun (~700 px: kupon alanı +
144 px üst boşluk + 513 px telefon). Üst kenarı ekranın altından girer
girmez hareket başlıyordu — o anda telefon hâlâ ekranın **altındaydı**.

⚠️ `-18%` alt kenar payı bunu çözmüyordu çünkü sorun paydan değil,
**uzun bir kutunun görünmesini içindeki nesnenin görünmesi sanmaktan**
geliyordu. Gözlemci artık **telefonun kendisine** bağlı, alt payı %40:
telefon ekranın üst üçte ikisine girmeden hareket başlamıyor.

- [x] **Slogan her genişlikte görünüyor** ✅ — Ü152
  🔴 İlk yazılışta `DuranSahne`nin içine kondu ve o blok `lg:hidden`:
  bilgisayardan landing page'e bakan biri **hiç göremiyordu**. Ürün
  sahibi bildirdi: *"ben bunu landing page için istemiştim ancak
  gözükmüyor hiçbir şekilde."*
  ⚠️ **Ayrım:** animasyonun mobile özel olması bir karar; slogan ise bir
  efekt değil **içerik**. Değer önermesini ekran genişliğine göre
  saklamak kararın değil yerleştirmenin hatasıydı.
- [x] **Döngü okunun ucu yaya değmiyordu** ✅ — Ü152
  Ok ucu x=21'deydi, yay x=26'da başlıyordu; gözle bakınca ok ayrı bir
  işaret gibi duruyordu. Aynı noktaya hizalandı.
  ⚠️ Bu kusur **yalnızca ekran görüntüsüyle** görüldü — DOM ölçümü
  "animasyon çalışıyor" diyordu ve doğruydu.

- [ ] **Kalan linkler bekleniyor.** Ürün sahibi *"ben sana bulup
  göstereyim"* dedi; geldikçe bu tabloya eklenecek.
- [ ] **Zarfın açılma hareketi hâlâ karşılaştırılmadı.** Bizdeki kart
  telefonun arkasından yukarı süzülüyor (`kupon-cik`, 1,25 sn). Referansın
  adı *"Card **Envelop** Reveal"* — kapağın açılması hareketin parçası
  olabilir. Videoyu kare kare incelemek için indirme izni gerekiyor.

## Biten işler — Ü151

- [x] **Kapanan döngü izi** ✅ — "Bir kere gelen müşteri, bir daha
  gelsin" başlığının altında ok kafeden çıkıp dolanıyor ve başladığı
  yere dönüyor. Logo ile aynı dil (`oo` sonsuzluk ilmeği, Ü118).
- [x] **Kanıtlar teker teker mühürleniyor** ✅ — sosyal kanıttaki üç
  kart sırayla giriyor, her birine onay işareti **çiziliyor**.
  ⚠️ Mühür bir sayı ya da referans değil, kendi iddiamızı işaretliyor —
  uydurma yorum / şişirilmiş sayı yasağı (Dalga 8) bozulmadı.
- [x] **Reklam karşılaştırmasında asimetri** ✅ — sol sütun dört maddeyi
  **birden** gösteriyor (gösterim toptan satılır), sağ sütun **teker
  teker sayıyor**. Bölümün cümlesi artık ekranda da duruyor.
- [x] **"Kimler için" iki kart ayrıldı** ✅ — başlıkla birlikte tek blok
  hâlinde beliriyorlardı; iki ayrı kitlenin farkı da aynı anda yutuluyordu.
- [x] **Lacivert kapanışa gezen ışık** ✅ — sayfanın son ekranıydı ve
  duran bir duvardı. Altın tonunda, 18 saniyelik; fark edilmesi değil
  ekranın ölü durmaması amaçlanıyor.
- [x] **Üç kayıp teker teker sayılıyor** ✅ — kayıp bir liste değil,
  birikiyor.

⚠️ **Kaydırmaya bağlı hiçbir şey yok.** Ürün sahibinin kuralı iki kez
doğrulandı: *"mobilde bu efektler olmayacak şekilde yapalım"* ve
2026-09-17'de *"o sadece masaüstünde olsun mobilde olmasın."* Hepsi
görüş alanına girince **bir kez** oynuyor (Ü133'ün gerekçesi).

## 🔴 Yol boyunca bulunan iki şey

- [x] **Arka plandaki sekmede içerik hiç görünmüyordu** ✅
  Ölçüm sırasında 15 kartın 15'i `opacity: 0`da takıldı ve elle kurulan
  bir gözlemci de ateşlemedi. Sebep: sekme **gizliyken**
  `requestAnimationFrame` duruyor ve `IntersectionObserver` onunla aynı
  çizim döngüsüne bağlı — geri çağrıyı hiç teslim etmiyor. Sayfa arka
  planda açılırsa (bağlantıya orta tıkla, önden getirme) ekranın
  üstündeki içerik görünmüyordu. **`Beliren` dahil, yani bu arıza Dalga
  8'den beri duruyordu.** `useGorunur` artık monte olurken senkron bir
  kutu okuması yapıyor.
- [x] **Yeşil yanan ama hiçbir şey sınamayan bir test silindi** ✅
  *"Her `<Cizilen>` içindeki yol `pathLength="1"` taşıyor"* testi
  yazıldı, koştu, geçti — ve `pathLength` elle silinip sınandığında
  **yine geçti**. `<Cizilen>` çoğu zaman bir bileşen sarıyor
  (`<DonguIzi />`) ve yollar o bileşenin gövdesinde, bloğun dışında.
  Koruma olmadığı hâlde koruma hissi veren test, testsizlikten kötü.
  Test silindi, **tuzak kaldırıldı**: `Cizilen` özniteliği artık kendisi
  koyuyor.

## Doğrulama

- `npm run ci` — **647 test, 0 hata**; tip ve lint temiz
- 375 pikselde beş bölümün beşi de hareket taşıyor, **yatay taşma 0**
- Üç animasyon uçtan uca ölçüldü: `iz-ciz` dashoffset 1→0 (1.500 ms),
  `sira-gir` opaklık 0→1 (550 ms), `muhur-bas` 0→1 (500 ms)
- Sıralama gecikmeleri kademeli: kartlarda 0 · 110 · 220 ms, reklam
  sütununda 240 · 410 · 580 · 750 ms
- `prefers-reduced-motion` altı yeni sınıfın altısını da kapatıyor
- ⚠️ **Gözle görülmedi:** tarayıcı paneli bu oturumda gizliydi, ekran
  görüntüsü boş dönüyordu. Ölçümler DOM ve animasyon zaman çizelgesi
  üzerinden yapıldı. **Telefonda bir kez gözle bakılmalı.**

---

# DALGA 9 · ✅ TAMAMLANDI — hareket turu

> Ürün sahibi 2026-09-16'da dokuz iş verdi ve her biri için **gerçek
> uygulama kaydı** referansı gösterdi (60fps.design · ripplix.com).
>
> ⚠️ Kural değişmedi: **sıfır animasyon kütüphanesi.** Referanslardan
> alınan şey efekt değil his; hepsi saf CSS + canvas'a çevriliyor.
>
> 🔴 **Bu dalga MOBİL VİTRİNE dokunmadı — Dalga 10'da anlaşıldı.**
> Dokuz işin **sekizi oyuncu tarafına** gitti (kazıma, karusel, avatar,
> seviye, rozet); vitrine düşen tek iş **Ü145** ve o sayfanın en
> üstünde. Liste "dokuzu da bitti" derken doğru söylüyordu ama ürün
> sahibi mobil landing page'de hiçbir şey görmüyordu ve haklıydı.
> ⚠️ **Ders:** bir işin hangi **yüzeye** düştüğü, bittiği kadar önemli;
> madde başlığı bunu söylemiyorsa liste yanıltıyor.

## Biten üç iş

- [x] **Kazı-kazan kupon** ✅ — Ü141 · göç 0041
  Oyun ödülü **kapalı** doğuyor, Ödüllerim'de kazınarak açılıyor.
  🔴 Asıl iş görünmeyen yerde: ödülün adı kazımadan önce istemciye
  **hiç gönderilmiyor** — üç yolda birden kapatıldı (envanter, detay
  sayfası, veritabanı kısıtı).
  🔴 Ölçmeden görünmeyen hata: yüzey doğru görünüyordu ama hiç
  silinmiyordu (fırça %16 opaklıkla çiziyordu). 9 yeni test.
  ⚠️ Hukuk notu ürün sahibine iletildi, *"sadece animasyon"* diyerek
  devam kararı verdi.
- [x] **Simülasyon kendi sayfasına çıktı** ✅ — Ü142 · `/simulasyon`
  Ana sayfanın en uzun bölümüydü; yerinde birkaç satırlık çağrı kaldı.
  Üst şerit `vitrin-ust.tsx`e çıkarıldı (iki sayfa paylaşıyor).
- [x] **Kahraman başlığı yazılıyor** ✅ — Ü142
  *"Geri gel."* daktilo gibi yazılıyor, arkadaki ödül etiketleri sırayla
  yanıyor. Bir kez — döngüye girmiyor (Ü133'ün gerekçesi).

- [x] **3B oyun karuseli** ✅ — Ü143 · `/oyunlar`
  Öndeki net ve açıklamalı, yanlar geriye kaçıp bulanıklaşıyor;
  sürükleme parmağı takip ediyor. Kategoriler kart üstüne taşındı.
  🔴 Üç hata yalnızca **gerçek fare girdisiyle** göründü — en ağırı:
  kart bağlantı olduğu için her kaydırma oyun açıyordu. Çözüm kartı
  bağlantı olmaktan çıkarmak oldu.
- [x] **Elle denemek için hazır hesap** ✅ — Ü144 · `npm run db:demo`
  `05320000099` / `Deneme1234` — açık masa oturumu, çark hakkı, 3 günlük
  seri, kazınacak kupon + karşılaştırma kuponu.
  🔴 Ürün sahibi ekran görüntüsünden bir uyuşmazlık yakaladı: ana ekran
  "2 kupon", Ödüllerim "1" diyordu. Kazınmamış kupon ana ekranın
  sayacına giriyordu; düzeltildi ve teste bağlandı.

- [x] **Mobil sahnede telefondan kupon çıkıyor** ✅ — Ü145
  Kart telefonun arkasından yukarı süzülüp öne yatıyor. Görüş alanına
  girince bir kez; telefona dokunmak tekrar oynatıyor.
  🔴 Ölçümle bulundu: ilk mesafede kartın alt yarısı telefonun ardında
  kalıyor, "Kasada göster" satırı hiç görünmüyordu.
- [x] **Seviye atlama kutlaması** ✅ — Ü146
  🔴 Asıl iş animasyon değil **tespit**: üründe seviye atlama anı hiç
  yoktu (seviye, XP defterinin toplamından türeyen bir sayı). Artık
  oyun bitişinin aynı işleminde öncesi/sonrası karşılaştırılıyor.
  `/gelistirme`'ye gözle bakmak için önizleme kondu.

- [x] **Maskot İlmek** ✅ — Ü147 · göç 0042
  Ürün sahibinin kendi 3B render'ı; arka planı kesilip WebP'ye çevrildi.
  🔴 **Üç çizim denemesi elendi** (düz vektör · clay gövde · clay küp).
  Ders: referans varken elle çizmeye çalışmak üç tur harcadı.
  ⚠️ Gölge görselden çıkarıldı — zıplarken ayrı oynaması gerekiyor.
  ⚠️ Tek render olduğu için renk ve aksesuar seçicileri **kapalı**;
  kolonlar, doğrulama ve testler duruyor, `COK_RENKLI` ile açılıyor.
- [x] **Profilde avatarı sevme** ✅ — Ü147
  Tek dokunuş yetmiyor, sürtmek gerekiyor (90 piksel): yoksa ekranı
  kaydıran herkes "sevmiş" olurdu. Yüz sabit olduğu için tepki
  **hareketten** geliyor: ezilip yaylanıyor, yanına kalpler süzülüyor.
- [x] **Başarım kutlaması** ✅ — Ü148
  Kutlayan yüz oyuncunun **kendi** avatarı. Rozet artık adıyla
  kutlanıyor (eylem kod değil başlık taşıyor).

## Dalga 9 kapandı — dokuz işin dokuzu

✅ **Commitlendi** — `da11163`, 39 dosya, 2026-09-17.
Doğrulama: `npm run ci` → **629 test, 0 hata**, tip ve lint temiz.

### Küçük açık uçlar

- [x] 🔴 **Tohum betiklerinde canlı ortam kilidi** ✅ **BİTTİ** — Ü149,
  2026-09-17 *(Dalga 9 commit edilirken bulundu)*
  `db:demo` (Ü144) bilinen paroladan hesap açıyordu ve `APP_ENV`'a **hiç
  bakmıyordu**; `db:butik` ve `db:seed` de bakmıyordu. Ortak
  `tohumKapisi()` `scripts/_env.ts`e kondu, dördü de çağırıyor.
  ⚠️ **Bu, bu listenin kendi kuralının çiğnenmesiydi:** Dalga 5'in madde
  20'si tam bu adı (`npm run db:demo`) *"🔴 Canlı veritabanında
  çalışmayı reddeder"* şartıyla ayırmıştı; Ü144 adı aldı, şartı almadı.
  ⚠️ Kapı import anında değil **çağrıyla** kapanıyor: `_env.ts`i göç ve
  yedek betikleri de import ediyor ve onların canlıda çalışması gerekiyor.
  🔴 Test **sınıfı** kapatıyor: `scripts/tohum-*.ts` kalıbının tamamı
  taranıyor, beşinci tohum betiği kapıyı unutursa kırmızı yanıyor.
  Kapısız sahte bir betikle **kırmızı yandığı doğrulandı**. 6 test.
- [ ] **İlmek'in diğer renkleri.** Bugün tek render var ve renk/aksesuar
  seçicileri gizli. Ürün sahibi altı rengi üretip
  `app/public/avatar/ilmek-<renk>.webp` olarak koyunca
  `components/avatar.tsx` içindeki `COK_RENKLI` **tek satırla**
  açılıyor; seçiciler, kayıt, doğrulama ve testler zaten yazılı.
- [ ] **Kaynak kareler duruyor.** `kahraman.jpg` ve `kahraman-kesik.png`
  — İlmek'in kesildiği ham dosyalar. Ürün sahibine silinsin mi diye
  soruldu, cevap beklemede.
  ⚠️ **Commit'e alınmadılar** (2,2 MB) ve **iki yerde birden duruyorlar**:
  `app/public/` ve `app/public/avatar/`, ikisi de birebir aynı. Diskte
  duruyorlar, git geçmişine girmediler — `git clean` çalıştırılırsa
  giderler. Cevap "silinsin" ise iki kopya da silinecek; "kalsın" ise
  tek kopyaya inip commit edilecekler.

## Ölü çıkan referans siteleri (bir daha önerilmesin)

Mobbin ücretsizde boş · Screenlane ve UI Movement → `pageflows.com`,
ücretsiz katmanı yok · `mobile-patterns.com` 404 · UI Garage kapandı.
Çalışanlar: **60fps.design** (yazılı animasyon tarifi de veriyor),
**ripplix.com**, **tympanus.net/codrops**.

---

# DALGA 8 · ✅ TAMAMLANDI — 2026-09-16 · Ü140

> Ürün sahibi 2026-09-16'da mobil ana sayfanın **bölüm sırasını** verdi.
> Bu dalga o sırayı kurmakla ilgiliydi; tek tek efekt eklemekle değil.
>
> Tetikleyen cümle: *"mobilimiz berbat kaldı."*
>
> ✅ **Commitlendi** — `13971a3`.

## İstenen sıra (ürün sahibinin kendi ağzından)

1. **Header** — ne iş yaptığımız + bizi açıklayan metin + slogan
   ✅ *Zaten böyle* — "Kafeler ve butik işletmeler için" / "Oyna. Kazan. Geri Gel."
2. **Nasıl yapıyoruz + avantajlarımız** — 🔴 **görseller ve animasyonlarla
   desteklenerek**
3. **Generatörümüz** — çift yönlü değer simülasyonu
4. **Sosyal kanıtlar**
5. **Lead toplama** — "hemen dene / kayıt ol" siteye serpiştirilmiş
6. **En altta: "kullanmazsan ne kaybedersin"**

## Son sıra (`app/src/app/page.tsx`) — ✅ istenen sıraya oturdu

| # | Bölüm | İstenen sıradaki karşılığı |
|---|---|---|
| 1 | `<header>` + Kahraman | 1 · header + slogan |
| 2 | `YaklasanSahne` — karekod → telefon | 2 · nasıl yapıyoruz |
| 3 | "Neden Looply" (lacivert) + 4 telefon | 2 · avantajlar |
| 4 | "Ne kazandırıyor" (krem) | 2 · avantajlar |
| 5 | "Kimler için" — kafeler / butikler | 2 · avantajlar |
| 6 | Lead şeridi — "karekod beş dakikada" | 5 · serpiştirilmiş lead |
| 7 | **Generatör** — çift yönlü simülasyon | 3 · generatör |
| 8 | **Sosyal kanıt** — "Dürüst olalım" | 4 · sosyal kanıt |
| 9 | "Nereye para veriyorsun" — reklam | 2 · avantajlar |
| 10 | **Kapanış** — "Kullanmazsan ne kaybedersin?" | 6 · en alt |

Lead üç noktada: kahraman, 6. bölümdeki şerit, kapanış.

## Aradaki fark — hepsi kapandı

- [x] **Sosyal kanıt bölümü yazıldı** ✅ — dürüst erken dönem çerçevesi.
  Ürün sahibi üç seçenek arasından bunu seçti. Bölüm açıkça *"burada
  müşteri yorumu görmeyeceksin"* diyor; yerine kanıtlanabilir üç şey
  koyuyor. ⚠️ **Canlı sayı elendi** (kaç kafe başvurdu): bugün sıfıra
  yakın, tohumla şişirilse yalan olur, vitrinin *"sayı göstermiyoruz"*
  kararıyla da çelişirdi.
- [x] **"Kullanmazsan ne kaybedersin" en alta indi** ✅
  🔴 Yol boyunca çıkan asıl bulgu: bunlar **iki ayrı soru.** Ürün
  sahibinin cümlesi *hareketsizliğin* bedelini soruyordu, sayfadaki tek
  cümle ise *denemenin* bedelini. Yalnızca ikincisi yazılı olduğu sürece
  birincisi hiç sorulmuyordu. Artık ikisi arka arkaya.
- [x] **Generatör "nasıl yapıyoruz"un altına indi** ✅
- [x] **Mobil görsel desteği geldi** ✅ — aşağıya bak.

## Mobil hareket — düzeltildi

Mobil **hareketsiz değildi, tek düzeydi.** Doğrulanan sayım: `<Beliren`
18 kullanım (belgedeki eski "38" ham kelime sayımıydı) ve **18'i de
aynı**: aynı 20 piksel, aynı süre, aynı eğri.

- [x] **`Beliren`e beş yön geldi** ✅ — `alt` · `sol` · `sag` · `olcek` ·
  `yakin`, her birinin kendi süresi. Varsayılan `alt`, yani eski
  çağrılar aynı kaldı.
- [x] **Kayan şerit artık mobilde de var** ✅ — `DuranSahne`'ye kendi
  kopyası. Sayfa dururken de yaşayan tek hareket.
- [x] **Telefonlar kaydırmalı sıraya geçti** ✅ — her satırda ikinci
  ekran görüntüsü `hidden sm:block`'tu; 640 pikselin altında dört
  üründen ikisi **hiç görünmüyordu**. Küçültmek yerine kaydırılabilir
  yapıldı: tam boyut, kenardan görünen ikinci telefon, parmakla çekme.
- [x] **Bölüm girişlerine ritim geldi** ✅

### 🔴 Ölçümle bulunan iki hata

- [x] **Yatay belirme mobilde yatay kaydırma doğuruyordu** ✅
  *"16 piksel < 20 piksellik yan boşluk, taşma imkânsız"* diye
  düşünülmüştü. `-mx-5` ile yan boşluğu **aşan** telefon sırası zaten
  tam ekran genişliğinde: 390 piksellik ekranda belge 406 oldu.
  **Kural:** tam genişlikteki bloğa `sol`/`sag` verilmez.
- [x] **Ü133'ün şerit düzeltmesi yarım kalmıştı** ✅
  Kopyalara `w-1/2` verilmişti — kutu genişliği metnin genişliği değil.
  Ölçüldü: **kutu 1440, metin 3287 piksel.** İki kopyanın metni üst üste
  biniyordu ve döngü dikişsiz değildi. `w-max` ikisini de çözdü;
  kaydırma çarpanı %25 → %12 (kutu genişlediği için, ekrandaki hız aynı).

## Doğrulama

- `npm run ci` — **611 test, 0 hata**; tip ve lint temiz
- Yatay taşma **390 / 768 / 1440** pikselde ayrı ayrı ölçüldü: belge
  genişliği = ekran genişliği, üçünde de
- Şeridin iki kopyası ölçüldü: bitişik, üst üste binme yok, boşluk yok
- Sosyal kanıt, kapanış, mobil şerit ve telefon sırası telefonda görüldü

## Bu dalgada sorulan son soru — cevaplandı

- [x] **Vitrindeki butik "yakında" rozeti kalıyor** ✅ — ürün sahibinin
  kararı, 2026-09-16. Butik kipi Ü137'de yazıldı (göç 0039 + 0040) ve
  platform panelinden açılıyor; yani ürün bunu **yapabiliyor**. Ama
  başvuru formunda butik seçeneği yok (butik de aynı formdan başvurup
  platform tarafından kipe alınıyor) ve akış **sahada hiç denenmedi**.
  Rozet bugün hâlâ dürüst.
  ➜ **Kaldırma şartı:** Dalga 7'den kalan *"butik akışı sahada
  denenmedi"* maddesi kapanınca yeniden bakılacak.

## Referans siteler (2026-09-16'da doğrulandı)

Mobil animasyon için, **gerçek uygulamaların video kayıtları**:

- **[60fps.design](https://60fps.design/)** — 2.080 animasyon / 487 uygulama, iOS ağırlıklı
- **[ripplix.com](https://www.ripplix.com/)** — 7.000+ animasyon, "Mobile App" filtresi
- **[tympanus.net/codrops](https://tympanus.net/codrops)** — çalışan demo, telefonda denenebilir

🔴 **Ölü çıkanlar** (bir daha önerilmesin): Mobbin ücretsizde boş ·
Screenlane ve UI Movement → `pageflows.com`'a yönleniyor, Page Flows'un
ücretsiz katmanı **yok** · `mobile-patterns.com` 404 · UI Garage kapandı.

⚠️ Bu sitelerdeki işlerin çoğu Framer Motion / Lottie / native iOS.
Projede **sıfır animasyon kütüphanesi** var (saf CSS) — oradan alınan
şey "efekt" değil "his" olmalı, CSS'e çevrilerek.

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

- [x] **39 · İşletme tipi: kafe | butik** ✅ **BÜYÜK ÖLÇÜDE BİTTİ** — Ü137,
  göç 0039 · *(2026-09-17'de doğrulandı — Dalga 7'de yapılmış, bu
  listede işaretsiz kalmıştı)*
  `cafes.isletme_turu` kolonu (`CHECK IN ('kafe','butik')`, varsayılan
  kafe), platform panelinden kipe alma, tohum örneği (`npm run db:butik`).
  ⚠️ Terminoloji sorusu (*"masa butikte ne demek"*) **kendiliğinden
  düştü**: Ü127 masa kavramını üründen tamamen kaldırdı, kafe başına tek
  karekod kaldı.
  - [x] 🔴 **Panel artık tipe göre farklılaşıyor** ✅ **BİTTİ** — Ü150,
    2026-09-17. Butiğin menüsünde "Oyunlar" durağı yok; duraklar ortak
    bir tabloya çıktı (`panel/duraklar.ts`), çerçeve türü okuyup
    gezinmeye veriyor.
    🔴 **Asıl kapı menüde değil sunucuda:** `oyun-secimi.degistir` butik
    için oyun ayarını **reddediyor**. Menüden gizlemek bir denetim değil
    — yolu elle yazan biri formu görür, kaydettiği ayar hiçbir şeyi
    etkilemez ve işletme oyun açtığını sanardı. Sayfa da türü kendi
    soruyor ve **nedenini açıklıyor** (sessiz yönlendirme değil).
    ⚠️ Şube değiştirme çerçeveyi açıkça tazeliyor: Next çerçeveleri
    gezinmede yeniden çalıştırmıyor, kafe şubesinden butik şubesine
    geçen yönetici eski menüyle devam ederdi.
  - [x] 🔴 **Yol boyunca bulundu: iki durak telefondan HİÇ açılamıyordu**
    ✅ **BİTTİ** — Ü150. `Oyunlar` ve `Şubeler` yalnızca kenar
    çubuğundaydı; kenar çubuğu `lg:flex`, yani 1024 pikselin altında hiç
    çizilmiyor. Alt şeritte dört ikon var, ana ekrandaki kurulum
    kartlarında bu ikisi yoktu. Gezinmenin **kendi yorumu** *"telefondan
    ana ekrandaki kurulum listesinden gidiliyor"* diyordu ve doğru
    değildi — Ü125'in şube açma yolu tam bu yüzden kurulmuştu ve
    telefondan kimse ona ulaşamıyordu.
    İki kart eklendi, bağlantı **testle çivilendi**: alt şeritte olmayan
    her durağın gezinme dışında bir bağlantısı olmak zorunda. Kart
    kaldırılarak **kırmızı yandığı doğrulandı**.

- [x] **40 · Butik akışı: oyun yok, doğrudan çark** ✅ **BİTTİ** — Ü137,
  göç 0039 + 0040 · *(2026-09-17'de doğrulandı)*
  Kasiyer alışverişe bakıp hak veriyor → ekranda QR → müşteri kendi
  telefonuyla okutup kaydoluyor → çarkı çeviriyor. Dört koşul türü
  (`tutar` · `urun` · `gunluk` · `ilk_gelen`), VEYA ile bağlı.
  🔴 **Rıza zinciri bilerek böyle:** ilk tarifte kasiyer müşterinin adını
  ve telefonunu yazacaktı; o kurgu *"kasiyerin girdiği veriye kim onay
  verdi"* sorusunu doğuruyordu. QR'a çevrildi — hak verilirken müşterinin
  kim olduğu **bilinmiyor**, `player_id` müşteri kendi kaydolunca doluyor.
  🔴 **D1'i etkiliyor.** Kafede ödül kısmen beceriye bağlı (kupon eşiği
  500 puan); butikte beceri payı **tamamen kalkıyor**, ödül saf tesadüfe
  bağlanıyor. Şans mevzuatı görüşü **iki ayrı model** için sorulmalı.
  - [ ] ⚠️ **Sahada denenmedi** — uçtan uca testler geçiyor ama gerçek
    telefonla kasa→QR→çark yolculuğu henüz yapılmadı (Dalga 7'den devreden
    madde; vitrindeki butik "yakında" rozetinin kaldırılma şartı da bu).

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
  🔴 **Bu madde Ü137'nin yazılı bir kararını geri alıyor.** Butikte
  kasiyer tutarı **zaten giriyor** (`tur = 'tutar'`, `esik_kurus`) ama
  göç 0039 onu bilerek **saklamıyor**: *"Adisyon tutarı SAKLANMIYOR:
  neyi aldığı butiğin kendi kaydı, bizim işimiz değil. Yalnızca hakkın
  doğduğu an ve kim verdiği."* Yani iş "tutarı girdir" değil,
  **"o kararı tersine çevir"** — ve girildiği anda satır, bugün
  taşımadığı bir ticari bilgiyi taşımaya başlıyor.
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
- [ ] ~~**SMS gönderici başlığı**~~ — ⏸️ **2026-09-20: SMS'ten şimdilik
  vazgeçildi** (ürün sahibi). Altyapı duruyor ve çalışıyor; sağlayıcı
  bağlantısı ve başlık başvurusu ertelendi. Buna bağlı maddeler
  (37 · `sms_outbox` saklama, tavan testleri) da beklemede.
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
