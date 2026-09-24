# 28 — TEST · KAFE YÖNETİCİSİ (A'dan Z'ye)

> **Kim olduğun:** bir kafenin sahibi ya da yöneticisi. Elinde bilgisayar
> var, panelden işi kuruyorsun.
>
> **Önce oku:** `27-test-listesi.md` §0 — HTTPS, ağ ve konum hazırlığı.
> Bunlar olmadan aşağıdaki adımların yarısı test edilemez.

**Rol:** `kafe_yoneticisi` · **Giriş:** `/kafe/giris` · **Panel:** `/kafe/panel`

---

## A · Başvuru ve onay

### A.1 · Başvuruyu gönder

**Ne yaparsın:** `/kafe/basvuru` adresini aç, işletme bilgilerini doldur,
gönder.

**Ne görmelisin:** "başvurun alındı" ekranı. Panel **açılmaz** — onay
bekliyorsun.

🔴 **Hata sayılır:** başvurudan sonra doğrudan panele düşersen. Onaysız
işletme panele giremez.

### A.2 · Platform onaylasın

**Ne yaparsın:** ayrı bir tarayıcıda `/platform/giris` → `/platform/basvurular`,
başvuruyu onayla. *(Ayrıntı: `33-test-platform.md`)*

**Ne görmelisin:** başvuru listeden düşer, işletme "kafeler" listesine geçer.

🔴 **Hata sayılır:** onaydan sonra işletme hâlâ başvuru listesinde
görünüyorsa.

---

## B · İlk giriş

### B.1 · Yöneticiyle gir

**Ne yaparsın:** `/kafe/giris` → telefon + 6 haneli doğrulama kodu
(geliştirmede kod ekranda görünür).

**Ne görmelisin:** `/kafe/panel` açılır. Üstte **kurulum uyarıları**
görmelisin — konum girilmemiş, ödül yok, bütçe yok gibi.

🔴 **Hata sayılır:** panel "her şey hazır" diyorsa. Hiçbir şey
kurulmamışken hazır diyen panel, sonra neden kimsenin ödül kazanmadığını
da söylemez.

### B.2 · Menüyü tanı

**Ne görmelisin:** iki grup.

| Günlük | Kurulum |
|---|---|
| Panel · Ödüller · Rapor · Bütçe | Konum · Ürünler · Karekod · **Oyunlar** · Personel · Happy Hour · Şubeler |

⚠️ Geniş ekranda günlük gruba **Kampanyalar** ve **Çark** da ekleniyor;
dar ekranda dört durak görünür. İkisi de doğru.

🔴 **Hata sayılır:** butik işletmede "Oyunlar" durağını görüyorsan —
butikte oyun yok (bkz. `31-test-butik-isletme.md`).

---

## C · Kurulum — sıra önemli

> Bu sıra keyfi değil: her adım bir sonrakinin işe yaramasını sağlıyor.
> Sıra bozulursa ekranlar boş görünür ve sebebi anlaşılmaz.

### C.1 · Konum — 🔴 bunsuz kimse ödül kazanamaz

**Ne yaparsın:** `/kafe/panel/konum` → kafenin konumunu gir/işaretle.

**Ne görmelisin:** konum kaydedildi bilgisi.

🔴 **Hata sayılır:** konum girmeden oyuncu ödül kazanabiliyorsa. Kural
(K2): oyuncu **fiziksel olarak kafede** olmalı. Konum girilmemişse
karşılaştırılacak bir nokta yoktur ve kimse kazanamaz.

⚠️ Test ederken kafenin konumu **senin bulunduğun yer** olmalı, yoksa
kendi telefonunla ödül kazanamazsın.

### C.2 · Ürünler

**Ne yaparsın:** `/kafe/panel/urunler` → menüdeki ürünleri ve fiyatlarını gir.

**Ne görmelisin:** ürün listesi dolar.

🔴 **Hata sayılır:** ürün yokken ödül tanımlayabiliyorsan ve o ödül
"ürün" tipindeyse. Ödül bir ürüne bağlanıyor; ürün yoksa bağlanacak şey
de yok.

### C.3 · Ödüller ve kupon zamanlaması

**Ne yaparsın:** `/kafe/panel/oduller` → en az iki ödül tanımla. Her ödül için:

| Alan | Ne yapar | Test et |
|---|---|---|
| Tip | ürün · yüzde indirim · tutar indirimi | Üçünü de dene |
| **Değer (TL)** | 25 TL ile kafenin üst sınırı arası, tam TL (Ü268) | 27 yaz → kaydedilir · 24, 27,5 ve üst sınırın 1 fazlası → kaydedilmez (tarayıcı kutunun yanında uyarır) |
| Günlük adet | Günde en fazla kaç kez verilecek | 1 yaz, ikincisinin çıkmadığını gör |
| Kullanım penceresi | Kuponun bozdurulabileceği saatler | Dar bir pencere yaz |
| **Kaç gün geçerli** | Kupon açıldıktan sonraki ömrü | 1 gün yaz |
| Çıkma olasılığı | Yüzde | İki ödüle farklı yüzde ver |

**Ne görmelisin:** ödül listesi, her satırda yazdıklarının özeti.

**Ödül üst sınırı (Ü268):** aynı sayfada **"Açılma ve geçerlilik"**
kutusunda **"Ödül üst sınırı (TL)"**. Varsayılan 50. 80 yaz → Kaydet →
"Yeni ödül"ü aç: kutunun altı "25 ile 80 TL arası" demeli; 80 TL'lik ödül
kaydedilmeli, 81 kaydedilmemeli. 49 yazınca üst sınır kaydedilmemeli
(tarayıcı "en az 50" diye uyarır). Yukarıda sınır yok — 10.000 de
kaydedilir.

🔴 **Hata sayılır:**
- Herhangi bir ödül satırında ya da oyuncunun `/firsatlar` ekranında
  **"Masada 5 dakika"** yazıyorsa. Bu kural Ü268'de kalktı; her ödül
  yalnızca konum doğrulaması ister.
- Kafenin yazdığı üst sınırın üstünde bir ödül kaydedilebiliyorsa.
- Günlük adedi dolan ödül hâlâ çıkıyorsa. Süzgeç **seçimden önce**
  çalışmalı; dolmuş ödül aday listesine hiç girmemeli.
- Kullanım penceresi dışında kupon bozdurulabiliyorsa.
- Geçerlilik süresini **kısalttığında** elindeki eski kuponun ömrü de
  kısalıyorsa. Kupon **açıldığı** andaki ayarla yaşar, bozdurulduğu
  andakiyle değil.

⚠️ Pencere gece yarısını aşamıyor (bilinen sınır): 02:00'de kapanan
kafe bunu doğru kuramaz.

### C.4 · Bütçe

**Ne yaparsın:** `/kafe/panel/butce` → günlük ödül bütçesini gir.

**Ne görmelisin:** bütçe ve bugün ne kadarının harcandığı.

🔴 **Hata sayılır:** *"ödül havuzumuz 2 saatte boşalmamalı"* — bütçe
gün boyuna yayılmalı. Sabah ilk saatte bütçenin tamamı dağıtılabiliyorsa
tempo bozuktur. Ayrıntılı senaryo: `27-test-listesi.md` §5.3.

⚠️ Kapanıştan sonra bütçe sıfırlanır (30 dakikalık tolerans hariç).

### C.5 · Karekod

**Ne yaparsın:** `/kafe/panel/karekod` → masaları gör, `/kafe/panel/karekod/yazdir`
ile yazdırma sayfasını aç.

**Ne görmelisin:**
- Her masanın kendi karekodu, ortasında **Loopy** duruyor.
- Karekodun altında basılı kod: `kafe-a-7f3k9x2m` gibi ad + rastgele ek.

🔴 **Hata sayılır:**
- Karekod telefonla okunmuyorsa. Loopy rozeti modüllerin üstünü
  kapatıyor; okunmuyorsa düzeltme payı yetmiyor demektir.
- Var olan bir masanın basılı kodu **kendiliğinden değişiyorsa**.
  Değişirse elindeki basılı kâğıt geçersiz olur.

⚠️ Eskiden basılmış 16 haneli kodlar da çalışmaya devam etmeli.

### C.6 · Oyunlar

**Ne yaparsın:** `/kafe/panel/oyunlar` → hangi oyunların açık olduğunu seç.

**Ne görmelisin:** dokuz oyun listesi, açık/kapalı durumları.

🔴 **Hata sayılır:** hepsini kapatabiliyorsan. Oyuncunun oynayacak bir
şeyi kalmaz.

⚠️ Çok oyun kapatırsan "günün görevi" içindeki *"N farklı oyun oyna"*
hedefi açık oyun sayısını geçebilir; o zaman görev tamamlanamaz hâle
gelir. Bir oyun kapatıp görevin hâlâ yapılabilir olduğunu kontrol et.

### C.7 · Personel

**Ne yaparsın:** `/kafe/panel/personel` → bir **kasiyer** hesabı aç.

**Ne görmelisin:** personel listesinde yeni satır.

🔴 **Hata sayılır:** kasiyer hesabıyla `/kafe/panel`e girebiliyorsan.
Kasiyerin yetkisi yalnızca `/kasa`.

Devamı: `30-test-barista-kasiyer.md`

### C.8 · Happy Hour

**Ne yaparsın:** `/kafe/panel/happy-hour` → bir saat aralığı tanımla.

**Ne görmelisin:** pencere kaydedilir.

🔴 **Hata sayılır:** pencere dışında happy hour ödülleri çıkıyorsa.

⚠️ Bu pencere de gece yarısını aşamıyor.

---

## D · Günlük kullanım

### D.1 · Panel özeti

**Ne yaparsın:** `/kafe/panel`.

**Ne görmelisin:** bugünün sayıları — kaç oyun oynandı, kaç kupon
verildi, bütçenin ne kadarı gitti.

🔴 **Hata sayılır:** oyuncu oynadıktan sonra sayılar değişmiyorsa.

### D.2 · Rapor

**Ne yaparsın:** `/kafe/panel/rapor`.

**Ne görmelisin:** 30 günlük eğilim.

🔴 **Hata sayılır:** rapor bugünkü oyunları hiç saymıyorsa.

### D.3 · Kampanyalar

**Ne yaparsın:** `/kafe/panel/kampanyalar` → bir kampanya oluştur.

**Ne görmelisin:** kampanya oyuncunun `/firsatlar` ekranında görünür.

🔴 **Hata sayılır:** kampanya oluşturdun ama `/firsatlar`da yoksa.

### D.4 · Çark

**Ne yaparsın:** `/kafe/panel/cark` → dilimleri ve **yüzdeleri** ayarla.

**Ne görmelisin:** dilim listesi ve her birinin çıkma olasılığı.

🔴 **Hata sayılır:** çarkta görünen ama asla çıkmayan bir dilim varsa —
günlük adedi dolmuş ödül çarktan da düşmeli, yoksa çark yalan söyler.

---

## E · Şubeler

**Ne yaparsın:** `/kafe/panel/subeler` → ikinci bir şube aç.

**Ne görmelisin:** üst şeritte şube seçici belirir.

🔴 **Hata sayılır:**
- Tek şubeliyken şube seçici görünüyorsa (gereksiz).
- İki şube açtıktan sonra seçici **görünmüyorsa** — o zaman ikinci
  şubeye hiç geçilemez.
- Bir şubenin bütçesi/ödülü öteki şubede görünüyorsa.

---

## F · Telefondan da aç

**Ne yaparsın:** aynı paneli telefondan aç.

**Ne görmelisin:** bütün duraklar telefonda da açılabilmeli.

🔴 **Hata sayılır:** bir durak telefondan hiç açılamıyorsa. Bu daha önce
oldu: kenar çubuğu dar ekranda çizilmiyordu ve "Oyunlar" ile "Şubeler"
telefondan **hiç** açılamıyordu.

---

## Bittiğinde elinde ne olmalı

- [ ] Onaylanmış bir işletme
- [ ] Konumu girilmiş
- [ ] En az iki ödül, biri günlük adet sınırlı
- [ ] Günlük bütçe
- [ ] Yazdırılabilir masa karekodları
- [ ] Bir kasiyer hesabı
- [ ] Açık oyunlar

Bu yedisi tamamsa oyuncu akışına geçebilirsin: `29-test-oyuncu.md`
