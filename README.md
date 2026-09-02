# Looply

> Kafedeki müşterinin masadaki karekodu okutup kısa bir oyun oynadığı; puan, ödül ve indirim kuponu kazanıp bunu kasada kullandığı; kafenin de bu sayede müşteri trafiği, ürün satışı ve tekrar ziyaret elde ettiği **oyunlaştırılmış müşteri kazanım ve sadakat ağı**.

**Durum:** **Demo çekirdeği tam**, kimlik ve "önce oyna" akışı sırada. 286/286 test geçiyor, `npm run ci` temiz.

- ✅ Kararlar: **Ü29** (satılan birim = nitelikli oyuncu, S14 kapandı) · **Ü30** (rapor mahremiyet eşiği 5)
- ✅ `src/domain/rapor.ts` — özet, doğrulama defteri, masa hareketi, saatlik dağılım, kampanya sonuçları, CSV, denetim izi
- ✅ `/kafe/panel/rapor` ekranı + panelden bağlantı · `tests/rapor.test.ts` (20 test)
- ✅ Kapı: raporda kişisel veri yok · eşik ekranda ve dosyada · görüntüleme ve indirme denetim izinde
- ✅ Düzeltme turu: ertelenmiş kuponun hiç açılmaması (🔴) · palet kontrastı · eskimiş faz etiketleri
- ✅ **Faz 9 · davet + fraud:** `/r/{kod}` · sekiz duraklı davet durum makinesi · risk skorlu fraud motoru · XP ödülü · `/davet` ekranı (`19-faz9-davet-kapi-raporu.md`)
- ✅ **Faz 9 · Ö1 Masayı Fethet:** masa tahtı, haftanın kralı, tahtta ad görünürlüğü anahtarı (Ü33)
- ✅ **Kafe konumu paneli** — 🔴 onaylı kafelerin koordinatı yoktu ve ürün orada sessizce çalışmıyordu
- ✅ **Ö3 Happy Hour havuzu** — görünür TL havuzu, canlı doluluk, pencerede ikinci ödül (Ü34)
- ✅ **D11 masa karekodları** — masa ekle/kapat + yazdırılabilir kart sayfası

**Arayüz Ü31'e taşındı.** Koyu çini paleti bırakıldı; yerinde *Açık ve Asil* var:
Outfit + JetBrains Mono, beyaz zemin, tek mavi vurgu (`#0B57D0`), altın ödül rengi
(`#D4AF37`), 1px saç teli çizgiler, gölge yerine tonlama, yuvarlatılmış köşeler.
49 dosya değişti; `/aydinlatma` ekranı da yazıldı — kayıt formundaki zorunlu onay
kutusu o güne kadar 404'e bakıyordu.

Tasarımın kendisi hâlâ `docs/tasarim/index.html` altında, 40 ekran birbirine bağlı:

```bash
python -m http.server 4173 --directory docs/tasarim
```

Faz 8 kapı raporu: `docs/16-faz8-kapi-raporu.md` — geçişte bulunan hatalar §3 ve §7'de.
**Son güncelleme:** 2026-08-26

> **Çalışma biçimi:** Kod, mimari ve güvenlik ilk günden **gerçek**. Yalnızca dışarıya
> açılan uçlar (SMS gönderimi vb.) arayüz arkasında sahtelenir ve sırası gelince
> tek dosyayla gerçeğine bağlanır. Atılacak bir prototip yok (Ü13).

---

## Ne inşa ediliyor

**Oyuncu**
```
Masadaki karekod → telefon + ad + soyad → SMS doğrulama → kayıt
   → 10 oyunluk liste + günün bonuslu oyunu
   → oyna → puan, XP ve/veya indirim kuponu
   → kasada kasiyer QR'ı okutur (yedek: 6 haneli kod) ve onaylar
```

**Kafe**
```
Başvuru → belge → platform onayı → panel
   → haftalık bütçe (min 1.500 TL) → ödül kataloğu → ürün bazlı yüzde kampanyaları
   → gelen oyuncular (anonim), masa hareketi, kazanılan ve kullanılan indirim
```

---

## Stratejik çekirdek

Looply'in merkezi **oyun değil**.

| Katman | Rolü |
|---|---|
| Oyun | Motor |
| Ödül | Teşvik |
| Kupon | Gerçek dünyadaki sonuç |
| Kafe | Müşteri (ödeyen taraf) |
| Kafe ağı | Uzun vadeli değer |

Bir oyun şirketi kurulmuyor — **oyun kullanan bir pazarlama altyapısı** kuruluyor.

Teknik olarak bakıldığında ise bu, **kişisel veri işleyen ve para değeri taşıyan bir platform**: telefon numarası, ad, soyad ve kafe tarafında bütçe/ciro verisi tutuluyor. Bu yüzden güvenlik ayrı bir faz değil, her fazın geçme şartı.

---

## Klasör haritası

```
cafemasa/
├── README.md                        ← buradasın
├── docs/
│   ├── 01-proje-analizi.md          Kaynak dokümanların analizi + bulgular
│   ├── 02-karar-defteri.md          Tüm kararlar + gerekçeleri (CANLI)
│   ├── 03-ozellikler.md             Kabul edilen özelliklerin spec'i
│   ├── 04-fikir-havuzu.md           Karara bağlanmamış fikirler
│   ├── 05-acik-sorular.md           Çözülmesi gereken konular (CANLI)
│   ├── 06-ekonomi-ve-dogrulama.md   Puan, bütçe, kupon, doğrulama
│   ├── 07-uretim-plani.md           Tehdit modeli, güvenlik temelleri, 10 faz
│   ├── 08-guvenlik-ve-veri-modeli.md  Yetki matrisi, şifreleme, şema, KVKK
│   ├── 09-faz2-kapi-raporu.md       Faz 2 güvenlik kapısı — neyin nasıl kanıtlandığı
│   ├── 10-olay-mudahale-plani.md    İhlal anında kim ne yapar (CANLI)
│   ├── 11-faz3-kapi-raporu.md       Faz 3 güvenlik kapısı + bulunan açık
│   ├── 12-yeni-kapsam.md            Davet, ödül tipleri, kupon QR — çelişkiler çözüldü (arşiv)
│   ├── 13-faz5-kapi-raporu.md       Faz 5 güvenlik kapısı — skor doğrulaması + bulunan üç hata
│   ├── 14-faz6-kapi-raporu.md       Faz 6 güvenlik kapısı — bütçe muhasebesi ve limitler
│   ├── 15-faz7-kapi-raporu.md       Faz 7 güvenlik kapısı — kupon, kasa onayı, atomiklik
│   ├── 16-faz8-kapi-raporu.md       Faz 8 güvenlik kapısı — rapor mahremiyeti + Ü31 geçişi
│   ├── 17-stitch-arayuz-promptu.md  Arayüz prompt seti, denetim ve koda taşıma (Ü31)
│   ├── 18-oyun-adaylari.md          S17 · kalan 7 oyun için aday liste (karar bekliyor)
│   ├── 19-faz9-davet-kapi-raporu.md Faz 9 davet bloğu kapısı — fraud motoru, XP ödülü
│   ├── 20-demo-plani.md             Demo kararları ve devir notu (CANLI) — önce bunu oku
│   └── tasarim/                     40 ekranın HTML tasarımı — index.html ile gezilir
├── kaynak/
│   ├── looply-urun-tanimi.txt      Orijinal ürün tanımı (31 bölüm)
│   ├── buyume-ve-gelir-modeli.txt    Orijinal gelir modeli (17 bölüm)
│   ├── 03-davet-ve-fraud.txt         Davet sistemi + fraud motoru
│   ├── 04-kupon-kullanim-akisi.txt   Kuponun QR ile kasada kullanımı
│   └── 05-odul-tipleri.txt           Üç ödül tipi + kafe bakiyesi
└── app/                              Uygulama — Next.js + PostgreSQL
```

## Çalıştırma

```bash
npm run db:up && npm run db:migrate && npm run db:seed && npm run dev
```

| Komut | Ne yapar |
|---|---|
| `npm run test` | Kiracı izolasyonu + log koruması — **güvenlik kapısı** |
| `npm run db:backup` | Şifreli yedek alır |
| `npm run db:restore-drill` | Yedeği gerçekten geri yükler ve doğrular — **ayda bir** |
| `npm run ci` | Tip kontrolü + lint + testler |
| `npm run keys:generate` | Yeni anahtar üretir |

---

## Doküman hiyerarşisi — çelişkide kim kazanır

1. `docs/02-karar-defteri.md` — en güncel kararlar, **her şeyin üstünde**
2. `docs/07-uretim-plani.md` — güvenlik ve üretim sırasının tek kaynağı
3. `docs/06-ekonomi-ve-dogrulama.md` — sayıların tek kaynağı
4. `docs/03-ozellikler.md` — kabul edilmiş özellik spec'i
5. `kaynak/*.txt` — orijinal metinler; yukarıdakilerle çeliştiği yerde geçersiz

**Not:** Kaynak dokümanlar ve `03` hâlâ eski varsayımları (anonim giriş, XP, günlük havuz) içeriyor. Bunlar `02`'deki Ü1–Ü12 kararlarıyla geçersiz kılındı.

---

## Sıradaki iş

> **Yeni oturum buradan başlasın:** `docs/20-demo-plani.md` — demo kararları,
> oyunların durumu, konum kapısı ve sıradaki iş orada.

**Demo tamam — uçtan uca çalışıyor.** Karekod → kayıt → oyun → taht → Happy Hour →
kupon → kasa onayı → rapor → davet. Kurulumdaki çıkmaz sokaklar da kapandı: kafe artık
kendi konumunu işaretliyor ve kendi masa karekodlarını yazdırıyor.

Sırada:

1. **A'dan Z'ye simülasyon** — gerçekçi veriyle tam tur.
2. **Ö2 · Masa oyunu (takım modu)** — Faz 9'un kalan tek bloğu: lobi, ortak skor,
   grup ödülü. Oyun sözleşmesi bugün tek kişilik.
3. **Kalan 7 oyun** — **S17 kararı bekliyor.** 11 aday ve elenenler
   `docs/18-oyun-adaylari.md`'de. Süzgecin en keskin şartı beklenenden farklı çıktı:
   tohum, oyuncudan gizlenen bilgi taşımamalı — hafıza, mayın tarlası ve solitaire
   bu yüzden eleniyor.

Ayrıca **Ü32 onaylanmadı:** davet XP'si niteliklenen kafeye yazılıyor.

> Her fazın başında ayrıca onay alınır (G8).

**Devreden açık maddeler — hiçbiri kodla kapatılamıyor:** S20 (aydınlatma metni hukuk
incelemesi) · G32 (platform ikinci faktör) · iOS'te tarayıcıdan QR okunamıyor, akış koda
düşüyor · kupon bakımı için gerçek zamanlanmış iş (köprü çalışıyor) · kelime listesinin
küfür süzgeci insan gözünden geçmeli · düşen-blok mekaniğinin hukuki sınırı (G6) · D11
masa karekodları ekranı yazılmadı.

Kod dışı bekleme süreleri: `docs/07` BÖLÜM 4.

Her fazın başında ayrıca onay alınır (G8).
