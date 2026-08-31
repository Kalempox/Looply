# 06 — Ödül Ekonomisi ve Doğrulama

> Bu doküman 2026-08-22 karar turunda **baştan yazıldı.** Önceki sürüm, oyuncunun anonim
> başladığı bir akışa göre kurulmuştu; kayıt artık oyundan önce ve kimlikli olduğu için
> ekonomi de değişti. Çelişkide `02-karar-defteri.md` kazanır.

**Son güncelleme:** 2026-08-22

---

## Değişen üç şey

| Konu | Eski varsayım | Yeni karar |
|---|---|---|
| Kayıt | Anonim başlar, ödül alırken hesap açar | **Karekod → telefon + ad + soyad → SMS doğrulama**, oyundan önce |
| Para birimi | XP (her yerde) + Puan (kafede) | **Tek birim: puan.** Sadece kafede, sadece kafe bazında |
| Kafe bütçesi | Günlük 1.500 TL tavan | **Haftalık 1.500 TL taban** — altına inilemez, üstüne çıkılabilir |

---

# §1 · Tek **harcanabilir** birim: puan

> **Güncelleme 2026-08-24 (Ü14):** Aşağıdaki "XP kaldırıldı" kararı **geri alındı** —
> ama XP para birimi olarak değil, **harcanmayan ilerleme sayacı** olarak döndü.
> Ayrım net durmalı: **puan harcanır, XP harcanmaz.** Ödül alan oyuncunun puanı
> düşer, seviyesi düşmez. Seviye kafe bazındadır (Ü15). Detay: §2.1.
>
> Bu bölümün geri kalanı **puan** hakkındadır ve geçerlidir.

XP ilk turda kaldırılmıştı. Gerekçesi: XP, "evde oynayan da bir şey kazansın" ihtiyacı için vardı. Evde oynamanın hiçbir şey kazandırmamasına karar verilince (Ü3) XP'nin işlevi kalmadı. Seviye ve rozet istendiğinde (S18, S19) ihtiyaç yeniden doğdu — çünkü harcanan bir sayı ilerleme ölçemez.

| | **Puan** |
|---|---|
| Nerede kazanılır | **Yalnızca doğrulanmış kafede** |
| Kapsam | **Kafe bazında ayrı** — A kafesinin puanı A'da harcanır |
| Ne satın alır | Kafenin ödül kataloğundaki her şey |
| Evde oynarken | ❌ Kazanılmaz. Oyun oynanır, hiçbir şey birikmez |
| Süre | 90 gün hareketsizlikte sıfırlanır |

**Puanın kafe bazında olması bir tasarım tercihi değil, bir zorunluluk:** global olsaydı A'da kazanılan puan B'de harcanır, B bedava değer vermiş olurdu. Kafeler arası mahsuplaşma mekanizması kurmadan hiçbir kafe bunu kabul etmez. Kafe bazlı puan, o sorunu şema düzeyinde doğmadan bitirir.

---

# §2 · Puan kazanımı

Tüm değerler **config**; kafe bazında ezilebilir.

| Olay | Puan |
|---|---|
| Oyun tamamlandı (doğrulanmış kafede) | **300** |
| Günün bonuslu oyunu | **×2** |
| Fiş / adisyon kodu girildi (K4) | **×2** |
| Kafe içi anket cevaplandı | +100 |

**Çarpanlar çarpışmaz — en yüksek olan uygulanır.** Bonuslu oyun ×2 ile fiş ×2 birleşip ×4 olmaz.

### 🔴 Günlük puan tavanı

> **900 puan / oyuncu / kafe / gün.**

Oyuncu istediği kadar oynar; puan günde 900'de durur. Tavan olmadan tek kişi bir günde katalogtaki en büyük ödüle ulaşır ve haftalık bütçe bir masada erir.

### Kalibrasyon

| | Günlük | 10.000 puanlık büyük ödüle |
|---|---|---|
| Bir oyun oynayan | 300 | ~33 gün |
| Bonuslu oyunu oynayan | 600 | ~17 gün |
| Tavanı dolduran | 900 | **~11 gün** |

## §2.1 · XP — ilerleme sayacı (Ü14)

Puandan tek farkı belirleyici: **XP harcanmaz.** Ödül almak bakiyeyi düşürmez, bu yüzden seviye geri gitmez. Kafe bazındadır (Ü15) ve Ü3'e sadıktır: kafe dışında oynamak XP de kazandırmaz.

| Olay | XP |
|---|---|
| Oyun tamamlandı (doğrulanmış kafede) | **50** |
| Günün bonuslu oyunu | **×2** |
| Davet niteliklendi (Faz 9, Ü20) | davet edene 100 · gelene 50 |

**Puanla aynı çarpan kuralı:** çarpanlar çarpışmaz, en yüksek olan uygulanır (E5).

**Günlük XP tavanı yok.** Puan tavanı (900) bütçeyi koruyor; XP hiçbir bütçeye dokunmadığı için aynı korumaya ihtiyacı yok. Seviye "çok oynayanı" ödüllendirir ve bu kasıtlıdır.

### Seviye eşikleri

| Seviye | Gereken toplam XP | Kaç oyun (bonussuz) |
|---|---|---|
| 1 | 0 | — |
| 2 | 100 | 2 |
| 3 | 300 | 6 |
| 4 | 700 | 14 |
| 5 | 1.500 | 30 |
| 6 | 3.000 | 60 |
| 7 | 5.500 | 110 |
| 8 | 9.000 | 180 |
| 9 | 14.000 | 280 |
| 10 | 21.000 | 420 |

Kalibrasyon fikri: günde iki oyun oynayan bir müdavim **ilk hafta 3. seviyeye**, ~bir ayda 5. seviyeye ulaşır. 10. seviye kasıtlı olarak uzun — kafenin gerçek müdavimini işaret etmeli.

**Karşılığı kod tarafında:** `src/domain/xp.ts` → `SEVIYE_ESIKLERI`.

Büyük ödülün on günün üzerinde olması kasıtlı: kahve günlük alışkanlık ürünü, ödül de o ritme oturmalı. Oyuncunun ilk ziyaretteki tatmini büyük ödülden değil, §3'teki **anlık indirimden** gelir.

---

# §3 · İki ödül tipi

Ödüller iki gruba ayrılır ve **bütçeyle ilişkileri farklıdır.** Ayrım, muhasebenin tamamını belirlediği için şemanın merkezinde durur.

## Tip A · TL değerli ödül → **bütçeden düşer**

Değeri önceden bilinen ödüller: bir ürün, sabit tutarlı indirim.

| Ödül | Puan | Bütçeden | Kanıt |
|---|---|---|---|
| +1 shot espresso | 1.500 | 15 TL | K2 |
| Ücretsiz kurabiye | 3.000 | 12 TL | K2 |
| Ücretsiz filtre kahve | 6.000 | 45 TL | K3 |
| Ücretsiz tatlı | 12.000 | 120 TL | K4 |

## Tip B · Yüzde indirimi → **TL tavanlı, bütçenin İÇİNDE**

> **Güncelleme 2026-08-24 (Ü17):** Bu bölüm "bütçe dışı" diyordu ve gerekçesi
> *"değeri adisyona bağlı, TL bütçesine yazılamaz"* idi. **TL tavanı zorunlu
> olunca o gerekçe kalktı:** tavandan rezerve edilir, kasada gerçekleşen tutar
> harcanan yazılır, aradaki fark bütçeye iade edilir. Tek bütçe defteri kalıyor.
>
> **Ü26 ile iki yerde birden var:**
> - **Katalogda** — TL tavanlı indirim kuponu, oyuncu puanıyla satın alır
> - **Kampanya olarak** — kafe ürün bazında tanımlar, puan istemez, otomatik düşer
>
> Aşağıdaki limit kuralları **ikisi için de** geçerli.

Kafenin kendi panelinden seçtiği ürünlere tanımladığı yüzdeli indirimler. Örnek: `%20 · en fazla 100 TL`.

> Kafede tiramisu satılmıyor. Kafe sahibi paneline girer, *"tiramisuda %10, günde en fazla 20 adet, 1 hafta"* der. Oyun sonunda oyuncuya bu indirim düşer.

### 🔴 Üç alan da zorunlu

Yüzde, tek başına bir taahhüt değil: `%20` demek, adisyon büyüdükçe büyüyen bir borç demek. Üstünü kapatan üç sınır var ve **üçü de zorunlu alandır**:

| Zorunlu alan | Örnek | Neyi engeller |
|---|---|---|
| **TL tavanı** (Ü17) | En fazla 100 TL | Tek adisyonun sınırsız büyümesini |
| **Adet limiti** | En fazla 20 adet/gün | Toplam maruziyeti |
| **Süre** | 1 hafta | Unutulmuş kampanyanın süresiz akmasını |

Üçü de veritabanı düzeyinde `NOT NULL` — tavansız veya limitsiz kampanya **kaydedilemez**, kod hata yapsa bile.

Limit dolduğu anda kampanya otomatik kapanır. Kafe panelinde canlı sayaç görünür: *"14/20 kullanıldı."*

## Anlık indirim — puan istemez

Her iki tipte de kafe bir ödülü **anlık** olarak işaretleyebilir: puan istemez, ilk doğrulanmış oyundan sonra otomatik düşer, günde bir kez.

**Neden gerekli:** İlk kez oynayan oyuncunun puanı sıfırdır. Her ödül puanla alınıyor olsaydı eli boş çıkar ve bir daha gelmezdi.

---

# §4 · Kafe bütçesi

## Taban, tavan değil

| | |
|---|---|
| Dönem | **Haftalık — pazartesi başlar** (Ü25) |
| Alt sınır | **1.500 TL** — kafe bunun altına inemez |
| İlk dönem | Kafe hafta ortasında katılırsa dönem kısa olur ve **taban orantılı** uygulanır (Ü25) |
| Üst sınır | Yok — kafe istediği kadar yukarı çıkabilir |
| Kapsam | **Her iki tip** — Ü17 ile yüzdeli ödüller de bütçeye dahil |

Bütçe, kafenin sisteme yüklediği bir para değil; **dağıtacağını taahhüt ettiği kendi ürününün perakende değeri.** Sistemde hiçbir zaman gerçek para durmaz.

## Üç durumlu defter

```
   kupon verildi              kasiyer onayladı
        │                            │
        ▼                            ▼
   ┌─────────┐                 ┌───────────┐
   │ REZERVE │ ───────────────▶│ HARCANDI  │  ← bütçeden kalıcı düşer
   └─────────┘                 └───────────┘
        │
        │ süresi doldu / iptal
        ▼
   ┌─────────┐
   │ SERBEST │  ← bütçeye geri döner
   └─────────┘
```

| Durum | Ne zaman | Bütçeye etkisi |
|---|---|---|
| **REZERVE** | Kupon oyuncuya verildiği an | Kullanılabilir bütçe azalır |
| **HARCANDI** | **Kasiyer onayladığı an** | Kalıcı düşer |
| **SERBEST** | Süresi doldu / iptal / geri alındı | Bütçeye döner |

**Kafe yalnızca kasada onaylanan kuponun bedelini öder.** Verilip kullanılmayan kupon maliyet değildir. Satışta en güçlü cümle bu:

> *"Alt sınırı siz koyuyorsunuz. Kullanılmayan kuponun maliyeti yok."*

## Dağıtım hedefi ve limitin dolması

Bütçe, **dağıtılması hedeflenen tutar**. Sistem hafta boyunca kupon dağıtımını buna göre ayarlar: 3.000 TL bütçeli kafede toplamı 3.000 TL'yi bulacak kadar kupon üretilir — 15 TL'lik de olabilir, 120 TL'lik de.

İki sayaç var ve ikisi farklı işe yarar:

| Sayaç | Ne demek |
|---|---|
| **Rezerve** | Kupon verildi, henüz kullanılmadı — kafenin **açık riski** |
| **Harcanan** | Kasada onaylandı — kafenin **fiilen ödediği** |

### 🔴 Güvenlik kuralı

> **rezerve + harcanan ≤ bütçe**

Sistem, kalan bütçenin karşılayamayacağı kadar kupon dağıtmaz. Sonuç: kafe hiçbir senaryoda bütçesinin üstünü ödemez — dağıtılmış tüm kuponlar aynı anda kullanılsa bile.

### Süresi dolan kupon yerine yenisi çıkar

Rezerve, kupon kapanana kadar kilitli kalır. Kupon kullanılmadan süresi dolarsa rezerve **serbest bırakılır** ve o tutar kadar **yeni kupon üretilebilir hâle gelir.** Bütçe böylece hafta boyunca döner.

3.000 TL bütçeli bir kafenin haftası:

| An | Rezerve | Harcanan | Yeni kupon çıkabilir mi |
|---|---|---|---|
| Pazartesi — 40 kupon verildi | 900 TL | 0 | ✅ 2.100 TL'lik daha |
| Çarşamba — 22'si kasada onaylandı | 420 TL | 480 TL | ✅ 2.100 TL'lik |
| Cuma — kalan 18'inin süresi doldu | 0 TL | 480 TL | ✅ 2.520 TL'lik |
| rezerve + harcanan = 3.000 olursa | — | — | ⛔ dağıtım durur |

**"Limit doldu" durumu**, ancak gerçekten 3.000 TL'lik değer dağıtıldığında oluşur — verilip kullanılmayan kuponlar bütçeyi kalıcı olarak yakmaz.

**Hafta sonunda kullanılmayan bakiye:** devretmez, yanar. Devretseydi kafe bir hafta hiç dağıtmayıp sonraki hafta iki katıyla karşılaşırdı.

## Kafe panelinde görünen dört sayı

| Sayı | Örnek | Anlamı |
|---|---|---|
| Haftalık bütçe | 3.000 TL | Kafenin taahhüdü |
| Dağıtılabilir kalan | 1.840 TL | Bütçe − rezerve |
| Açık kupon | 620 TL | Verilmiş, henüz kullanılmamış |
| **Bu hafta fiilen harcanan** | **540 TL** | Kasada onaylanan — **asıl sayı** |

---

# §5 · Nitelikli oturum

Faturalama birimi değil (platform gelir modeli henüz kapalı — bkz. §11), ama **limitlerin ve fraud korumasının** dayandığı olay bu.

Bir oturum, aşağıdaki **altı koşulun tamamı** sağlandığında nitelikli sayılır:

| # | Koşul |
|---|---|
| 1 | Kayıtlı ve doğrulanmış hesap (telefon onaylı) |
| 2 | Geçerli masa karekodu ile başladı — token 90 sn içinde, tek kullanım (K1) |
| 3 | Konum doğrulandı (K2) **veya** fiş kodu girildi (K4) |
| 4 | Oyun başlatıldı **ve** tamamlandı; skoru sunucu doğruladı |
| 5 | Oturum süresi ≥ 45 saniye |
| 6 | Fraud bayrağı yok |

**Aynı cihaz, aynı kafe, aynı gün:** ilk nitelikli oturum sayılır. Sonraki oyunlar oynanır ve puan kazandırır (tavana kadar) ama nitelikli sayılmaz.

---

# §6 · Fraud

| Kural | Değer |
|---|---|
| Cihaz başına oturum | 6 / saat |
| Aynı masada eşzamanlı aktif oturum | 4 |
| Aynı cihazda hesap | 30 günde 2 |
| Işık hızı kontrolü | 10 dk içinde 50 km uzakta ikinci oturum → bayrak |
| Emülatör / headless tarayıcı | Oturum reddedilir |

**Kupon ve ödül kayıtları append-only.** Güncellenmez, yeni satır yazılır. Kafeye gösterilen her rapor bu defterden türer; geçmişe dönük düzeltme yapılamaz.

Kafe panelinde **anonim doğrulama defteri** durur — kafe kendi gözüyle karşılaştırabilsin diye:

| Saat | Masa | Oyuncu | Kanıt | Sonuç |
|---|---|---|---|---|
| 14:32 | Masa 7 | P-4F2A | K1+K2+K3 | ✅ Nitelikli |
| 14:41 | Masa 3 | P-4F2A | K1+K2 | ⚪ Tekrar |
| 15:02 | Masa 11 | P-77E0 | K1 | ❌ Konum doğrulanmadı |

Kafe hiçbir ekranda ad, soyad veya telefon görmez (G1).

---

# §7 · Kupon ve kasa akışı

## Durum makinesi

```
VERİLDİ ──(ertelenmişse ertesi gün)──▶ AKTİF ──(kasiyer onayı)──▶ KULLANILDI
   │                                     │                            │
   ▼                                     ▼                            ▼
BEKLEMEDE                          SÜRESİ_DOLDU                  GERİ_ALINDI
                                   (bütçeye iade)                (bütçeye iade)
```

Veritabanı kısıtları — uygulama mantığına bırakılmaz:
- `UNIQUE(kupon_kodu)`
- KULLANILDI'ya geçiş tek yönlü, tek seferlik, koşullu UPDATE ile
- `onaylayan_personel_id` **NOT NULL** — kupon oyuncu tarafından kapatılamaz

## 🔴 Değişmez kural

> **Kuponu "kullanıldı" işaretleme yetkisi hiçbir zaman oyuncunun telefonunda olamaz.**

Şema karşılığı: oyuncu oturumunun `kuponlar.durum` kolonuna yazma yetkisi yoktur. Tek yazma yolu personel oturumundan geçer.

## 🔴 İkinci değişmez kural — geçerlilik yalnızca kasiyer ekranında

Kasiyerin sistemi kullanmaması, projenin **en büyük sessiz ölüm riski**. Kasiyer kodu girmeden indirimi elle yaparsa sistem hiçbir şey görmez: kafe gerçekte ürün vermiş olur ama panelde bütçe dolu görünür ve o kafeye ait bütün raporlar yalan söyler.

Bu risk teşvikle değil, **tasarımla** kapatılır:

> **Oyuncunun ekranı hiçbir zaman "bu kupon geçerlidir" demez.**
> Geçerlilik yalnızca kasiyer ekranında, kod girildikten sonra ortaya çıkar.

Uygulama şartları:

| Nerede | Görünür | Görünmez |
|---|---|---|
| **Oyuncu ekranı** | Ödülün adı *(kazandığını bilmeli — motivasyon)* · 6 haneli kod · "Kasada okutulmadan geçerli değil" | ❌ Geçerlilik damgası · ❌ "onaylandı" durumu · ❌ TL değeri |
| **Kasiyer ekranı** | Ödül adı · **TL değeri** · geçerlilik · son kullanma · ONAYLA | — |

**Neden bu işe yarıyor:** Süresi dolmuş, başka kafeye ait ya da **zaten kullanılmış** bir kupon, telefonda geçerli olanla birebir aynı görünür. Kasiyer telefona bakıp ürün verirse er ya da geç kullanılmış bir kuponu ikinci kez onurlandırır — ve bu, günlük mutabakatta ortaya çıkar. Kod girmek, kasiyer için fazladan bir "kayıt tutma" işi değil, **kendini koruma yolu** olur.

**Destekleyici üç önlem:**
- **Kasiyer teşviki** — onay veren personel de puan kazanır *(`04-fikir-havuzu.md` F14, karara bağlanmadı)*
- **Günlük mutabakat** — panelde "bugün 14 kupon · 340 TL"; işletmeci kasayla karşılaştırır
- **Anomali uyarısı** — kupon veriliyor ama onaylanmıyorsa sistem işaretler: ya kasiyerler kullanmıyordur, ya kuponlar cazip değildir

POS entegrasyonu bu riski tamamen ortadan kaldırır ama zincirler dışında gerçekçi değil — MVP'de kasiyer kodu, V2'de POS (Karar A6).

## Kasiyer ekranı — üç saniyede biten akış

Sistemin sahada ayakta kalıp kalmayacağını bu ekran belirler. Kasiyer kullanmazsa hiçbir rapor doğru olmaz.

**Giriş:** `/kasa` → 4 haneli personel PIN'i, oturum 8 saat.

```
┌──────────────────────────────┐
│   KUPON KODU                 │
│   ┌────────────────────┐     │
│   │  _ _ _ _ _ _       │     │
│   └────────────────────┘     │
└──────────────────────────────┘
          ↓ kod girilir
┌──────────────────────────────┐
│  ✅ GEÇERLİ                  │
│  Ücretsiz filtre kahve       │
│  Değer: 45 TL                │
│  Son geçerlilik: 26 Ağustos  │
│  ┌────────────────────────┐  │
│  │       ONAYLA           │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

Onaydan sonra **60 saniye** boyunca `[GERİ AL]` görünür — yanlış onay kurtarma. Sonra kilitlenir.

**Hata durumları — kasiyerin göreceği tek satır:**

| Durum | Ekran |
|---|---|
| Zaten kullanılmış | 🔴 Bu kupon 14:22'de kullanıldı |
| Süresi dolmuş | 🔴 Süresi 20 Ağustos'ta doldu |
| Yarın aktifleşecek | 🟡 Bu kupon yarın geçerli olacak |
| Başka kafenin kuponu | 🔴 Bu kupon bu kafeye ait değil |
| Bulunamadı | 🔴 Böyle bir kupon yok |

---

# §8 · Kanıt seviyeleri

| Seviye | Yöntem | Neyi kırar |
|---|---|---|
| **K1** | Dönen karekod — masadaki QR sunucudan 90 sn'lik tek kullanımlık token alır | Ekran görüntüsü paylaşımı |
| **K2** | Konum — 150 m yarıçap | Uzaktan katılım |
| **K3** | Oturum süresi — en az 5 dk | "Kapıdan geçip taradı" |
| **K4** | Fiş / adisyon kodu | Satın alma kanıtı |
| **K5** | **Kasiyer onayı** | Sahte kupon kullanımı |

### Ödül değeri ↔ gereken kanıt

| TL değeri | Kanıt |
|---|---|
| 1–15 TL | K1 + K2 |
| 16–50 TL | K1 + K2 + K3 |
| 51 TL ve üzeri | **K4** |
| **Her kupon kullanımı** | **K5** — istisnasız |

---

# §9 · Limitler

| Limit | Değer |
|---|---|
| Anlık ödül | 1 / oyuncu / kafe / gün |
| Katalog ödülü | 1 / oyuncu / kafe / gün |
| Puan tavanı | 900 / oyuncu / kafe / gün |
| Nitelikli oturum | 1 / cihaz / kafe / gün |
| Bonuslu oyun | 1 / oyuncu / gün |
| Yüzde kampanyası | Kafenin girdiği adet limiti — zorunlu |
| Karekod token ömrü | 90 saniye |
| Ertelenmiş kupon geçerliliği | 7 gün |
| Kasiyer geri alma | 60 saniye |
| Puan hareketsizlik | 90 gün |
| Yaş | **18+** |

---

# §10 · Config

Hiçbiri koda gömülmez.

```jsonc
{
  // Bütçe
  "weekly_budget_min_try": 1500,
  "budget_period": "weekly",
  "budget_carryover": false,

  // Puan
  "points_game_complete": 300,
  "points_daily_cap": 900,
  "points_inactivity_days": 90,
  "multiplier_bonus_game": 2.0,
  "multiplier_receipt_k4": 2.0,

  // Doğrulama
  "qr_token_ttl_seconds": 90,
  "geofence_radius_m": 150,
  "min_session_seconds": 45,
  "k3_dwell_minutes": 5,

  // Kupon
  "deferred_coupon_valid_days": 7,
  "cashier_undo_seconds": 60,

  // Fraud
  "max_sessions_per_device_hour": 6,
  "max_concurrent_sessions_per_table": 4,
  "max_accounts_per_device_30d": 2,

  // Yaş
  "min_age": 18
}
```

---

# §11 · Açık kalanlar

| Konu | Durum |
|---|---|
| **Platform geliri** | ✅ **Karara bağlandı (2026-08-31, Ü41): kafeden abonelik.** Kafe bütçesi kafenin kendi ürünü olmaya devam ediyor; platform ondan pay almıyor, kafeden abonelik alıyor. Fiyat ve faturalama akışı ayrı bir faz — `cafes` tablosunda abonelik durumu henüz yok. |
| **Anlık ödül seçimi** | Kafenin sıraladığı listeden döngüsel mi, kafe mi seçiyor? Rastgelelik önerilmiyor — bütçe öngörülebilirliğini bozar |
| **Bonuslu oyun** | Günlük mü haftalık mı rotasyon, kafe mi platform mu belirliyor |
| **Skor doğrulama** | Deterministik replay mimari şart; oyun bazlı tasarım Faz 5'te |
| **Yüzde kampanyası ile katalog ilişkisi** | Yüzde indirimi puanla da alınabilir mi, yoksa yalnızca kafe mi doğrudan veriyor |
