# 03 — Özellik Spec'leri

Bu doküman `02-karar-defteri.md` içinde **KABUL** almış özelliklerin uygulama detayını içerir.

**Son güncelleme:** 2026-08-22

---

## Bağımlılık haritası

```
        ┌─────────────────────────────────┐
        │  DOĞRULAMA ALTYAPISI (K1–K5)    │  ← önce bu
        │  Dönen QR · Geofence · Fiş/Kod  │
        └────────────┬────────────────────┘
                     │
     ┌───────────────┼───────────────┬──────────────┐
     ▼               ▼               ▼              ▼
  Ö1 Masayı      Ö2 Masa        Ö3 Happy      Ö4 Ürün İtme
  Fethet         Oyunu          Hour Havuzu   Kampanyası
     │               │               │              │
     └───── İKİ PARA BİRİMİ (XP / Puan) ────────────┘
                     │
              ÖDÜL ZAMANLAMASI
           (anlık küçük + ertelenmiş büyük)
```

**Kritik:** Doğrulama altyapısı kurulmadan hiçbir özellik çalışmaz.

---

# ALTYAPI

## AL-1 · İki Para Birimi

Evde oynamak **sorun değil** — evde *kazanmak* sorun. Havuz kanepede boşalırsa kafe hiçbir ayak trafiği görmez ve sistemi kapatır. Ama evde oynamayı tamamen yasaklamak da hata: uygulama unutulur, alışkanlık ölür, Boost'un ihtiyaç duyduğu oyuncu tabanı büyümez.

| | **Evde / her yerde** | **Kafede (doğrulanmış)** |
|---|---|---|
| Oynayabilir mi | ✅ Sınırsız | ✅ Sınırsız |
| Kazandığı | **XP · Seviye · Sıralama · Seri** | **Puan · Kupon · Ödül** |
| Ne işe yarar | Statü, rozet, leaderboard | Gerçek para değeri |
| Ne kazanmaz | ❌ Kupon · ❌ Ödül | — |

**Yan etki (istenen):** Evde oynayan oyuncu sıralamada yükselir ama ödül alamaz → *"bunun karşılığını almak için bir kafeye gitmem lazım"*. Ev oyunu bir kayıp değil, **kafeye itici kuvvet**.

---

## AL-2 · Kanıt Seviyeleri

Tek yöntem yeterli değil. Ödülün değerine göre kademelendir:

| Seviye | Yöntem | Neyi kırar | Hangi ödül için |
|---|---|---|---|
| **K1** | **Dönen QR** — masadaki QR sunucudan 90 sn'lik tek kullanımlık token alır | Ekran görüntüsü paylaşımı | Her şeyin tabanı |
| **K2** | **Geofence (GPS)** — 100–150 m yarıçap | Uzaktan katılım (spoof edilebilir ama maliyeti yükseltir) | K1 + küçük ödül |
| **K3** | **Oturum süresi** — QR sonrası min. 5–10 dk canlı oturum | "Kapıdan geçip taradı" | Orta ödül |
| **K4** | **Fiş / adisyon kodu** | Varlık **ve satın alma** kanıtı | Büyük ödül, ücretsiz ürün |
| **K5** | **Kasiyer onayı** | Sahte redemption | **Kupon kullanımının tamamı** |

### 🔴 Değişmez kural
> **Kuponu "kullanıldı" işaretleme yetkisi asla oyuncunun telefonunda olamaz.**
> Kasiyer onaylar (K5). Bu yanlış tasarlanırsa hem kafenin güveni hem tüm istatistikler çöker.

---

## AL-3 · Ödül Zamanlaması

> **Aynı gün kullanılan kupon = İNDİRİM (maliyet).**
> **Sonraki gün kullanılan kupon = TEKRAR ZİYARET (gelir).**

Aynı oturumda kullanılan kupon yeni müşteri getirmez — zaten oradaki müşteriye indirim yapılmış olur. **Aradaki fark, Looply'in bir indirim aracı mı yoksa bir büyüme aracı mı olduğudur.**

### Çift katmanlı ödül

| | Anlık ödül | Ertelenmiş ödül |
|---|---|---|
| Ne zaman | Oyun biter bitmez | **Yarından itibaren** |
| Değer | Düşük (topping, +1 shot, %10) | Yüksek (ücretsiz tatlı, 2. içecek bedava) |
| Amaç | Tatmin — döngü ödülsüz hissettirmesin | Geri getirme |
| Geçerlilik | O oturum | Aktifleşince **5–7 gün** |

Sadece ertelenmiş verilirse oyun "boşuna oynadım" hissi verir ve ilk kullanımda kopma olur. Sadece anlık verilirse tekrar ziyaret üretmez. **İkisi birden gerekli.**

### Kurallar
- **Soğuma:** Aynı kafede **günde 1 ödül kazanma hakkı**. Oyuncu istediği kadar oynasın, ödül günde bir. Yoksa tek kişi havuzu boşaltır.
- **Uyandırma bildirimi:** *"Kuponun aktif oldu — 3 gün geçerli 🎁"* → Ertelenmiş kupon modelinin **motoru budur**. Asıl geri getiren şey kupon değil, bu bildirim.
- **Seri (streak):** Ardışık gün gelen oyuncuya artan ödül — 3. gün ×1.5, 5. gün ×2, 7. gün büyük ödül. Kırılırsa sıfırlanır. *Kahve zaten günlük alışkanlık ürünü; streak'in en iyi çalıştığı kategori.*
- **Devredilemezlik:** Kupon hesaba bağlı, tek kullanım, transfer edilemez.
- **Havuz tüketimi:** Günlük havuz bittiğinde o gün büyük ödül düşmez, sadece XP/puan kazanılır. **Kafe asla taahhüdünün üstüne çıkmaz** — satışta en çok güven veren cümle bu olacak.

---

# ÖZELLİKLER

## Ö1 · Masayı Fethet 👑

### Mekanik
Her masanın bir **kralı** var: o masada yapılan en yüksek skor. Oyuncu masaya bağlandığında görür:

> **Masa 7**
> 👑 Kral: **Mert** — 8.420
> Devirmek için: **8.421**

Skoru geçersen taht senin olur, ismin o masada kalır. Ertesi gün başkası gelip devirir.

### Neden güçlü
Kalıcı, sıfır maliyetli, sonsuz tekrar oynanabilir ve **masaya kimlik** verir. İnsanlar "benim masam" der. Geliştirmesi en ucuz, etkisi en yüksek mekanik.

### Kurallar
- Skor kaynağı: **Günün Challenge'ı** (tek oyun — karşılaştırılabilir olması için)
- Taht **kalıcı**, devrilene kadar sürer
- Ayrıca **"Bu Haftanın Kralı"** — pazartesi sıfırlanır, haftalık tahta ertelenmiş kupon ödülü
- Taht sahibine kalıcı ekonomik avantaj **verilmez** (statü yeterli) — havuz kontrolü bozulmasın
- Masa numarası olmayan kafede (kasa/menü QR'ı) → **"Kafe Kralı"** olarak tek taht

### Gereksinimler
- Masa bazlı QR *(kaynak dokümanda zaten var — §18)*
- K1 (dönen QR) + K2 (geofence)
- Sunucu tarafı skor doğrulama → `05-acik-sorular.md` S5

---

## Ö2 · Masa Oyunu (Takım Modu) 👥

### Mekanik
2–4 kişi aynı masadan aynı oturuma girer, **birlikte** oynar.

**Katılım akışı:**
1. İlk kişi QR'ı okutur → *"Masa oturumu aç"*
2. Diğerleri aynı QR'ı okutur → *"Masa 7'deki oyuna katıl"* seçeneğini görür
3. Lobi: kimler var, hazır mı
4. Başlat

### Mod: KOOPERATİF (rekabetçi değil)
Ortak skor havuzu — herkesin katkısı toplanır, masa tek bir sonuç üretir.

> **Neden kooperatif:** Masa-içi rekabet, reddedilen *Masa vs Masa Düellosu* (bkz. `02-karar-defteri.md` Ö5) ile aynı rahatsızlık riskini taşır. Ortak hedef sosyal enerjiyi pozitif tarafta tutar.

### Kurallar
- Min 2, max 4 kişi
- Herkes K1+K2 doğrulamasından geçmeli (aynı masa, aynı token)
- **Grup ödülü havuzdan TEK SEFER düşer**, kişi başı değil — ekonomi korunur
- Ödül dağıtımı: masaya tek büyük kupon (kim kullanacaksa) **veya** herkese eşit küçük pay → kafe seçer
- Takım modu, kişisel günlük ödül soğumasından ayrı sayılır (günde 1 bireysel + 1 takım)

### Kafe kazancı
Grup > birey. Adisyon 3–4 katı, doğal viralite ("arkadaşını çağır"), masadaki ölü sohbet anını doldurur.

---

## Ö3 · Happy Hour Havuzu ☕

**Karar: DÜMDÜZ.** Çarpan matematiği yok — sadece görünür bir TL havuzu ve bir saat aralığı.

### Mekanik
Kafe günlük havuzunun bir kısmını bir pencereye ayırır:

> Günlük havuz **1.500 TL** → *"400 TL'si 14:00–17:00 arası"*

Oyuncu kafe sayfasında görür:

> ☕ **Cafe X — Havuz Açık**
> **260 TL** ödül kaldı · ⏱ 1s 42dk

### Neden "dümdüz" daha iyi
- "2x puan" oyuncuya hiçbir şey ifade etmez; kafe de bütçesini hesaplayamaz
- **TL cinsinden havuz iki tarafın da anladığı tek dil**
- Havuz eridikçe **kendiliğinden aciliyet** yaratır → ayrı bir flash/duyuru mekaniği kurmaya gerek kalmaz

### Kurallar
- Havuz bitince pencere kapanır — oyun oynanır, o pencereden ödül düşmez
- Pencere bitince **kalan bakiye günün genel havuzuna geri döner** (kafe kaybetmez)
- Pencere süresi: **min 1 saat, max 4 saat**
- **Günde en fazla 2 pencere** — yoksa "sürekli happy hour" olur, değer sıfırlanır
- Havuz doluluğu kafe panelinde canlı

### 💡 Gelir bağı — Karar A7

> **Havuzu AÇMAK ücretsiz. Havuzu DUYURMAK ücretli.**

Kafe pencereyi bedava kurar — kendi ürünü, kendi bütçesi. Ama *"yakındaki oyunculara bildirim gönder"* dediği an senin ürününü satın alıyor.

Bu, gelir modelindeki **Organic vs Boost** ayrımının somut ve satılabilir hâli. Kafe ne aldığını tam olarak anlıyor: **erişim**. Ayrıca `01-proje-analizi.md` §7'de tespit edilen "Boost'un yönlendirme kanalı yok" eksiğini kapatır.

---

## Ö4 · Ürün İtme Kampanyası 🍰

### Kafe paneli — 5 adım, 5 dakika

| Adım | Seçim |
|---|---|
| 1. Ürün | Cheesecake |
| 2. Ödül | +3 çevirme hakkı · özel oyun erişimi · garantili kupon |
| 3. Süre | Bugün · Bu hafta · 14:00–18:00 |
| 4. Limit | Max 30 kişi **veya** max 500 TL kampanya bütçesi |
| 5. Yayınla | — |

### Oyuncu tarafı
Kafe sayfasında rozet: **🍰 Bugün cheesecake alana +3 çevirme hakkı**
Oyun sonunda: *"Cheesecake aldın mı? Kodu gir, hakkını al."*

### ⚠️ Kritik karar: ürün nasıl doğrulanır — **Karar A6**

| Yöntem | Ne verir | Karar |
|---|---|---|
| Fiş no + tutar | Ürün **doğrulanamaz** — sadece harcama | ❌ Kampanya için yetersiz |
| **Kasiyer kodu** | Kasiyer kampanya ürününü satınca 4 haneli kod verir | ✅ **MVP** |
| POS entegrasyonu | Ürün kalemi otomatik gelir, sıfır sürtünme | ⏳ V2 (zincirler) |

Kupon doğrulaması için kasiyer zaten sisteme sokuluyor (K5) — aynı akış kullanılır, ek operasyonel yük çıkmaz.

### Kurallar
- Kampanya ödülü **ayrı bir alt bütçeden** düşer, günlük havuzu kemirmez
- Kod tek kullanımlık, fiş numarası tekil
- Aynı oyuncu aynı kampanyadan **günde 1 kez**
- Limit dolunca kampanya otomatik kapanır

### Kafenin göreceği rapor — asıl satılan şey bu

> **Cheesecake Kampanyası — 3 gün**
> Kampanya öncesi ortalama: **14 adet/gün**
> Kampanya sırasında: **21 adet/gün → +50%**
> Ek satış: **47 adet — 3.290 TL**
> Kampanya maliyeti: **380 TL**

Bu tabloyu gören kafe sahibi bir daha "Looply ne işe yarıyor" diye sormaz.

---

## Bu dört özelliğin kafeye söylettiği cümle

> ❌ "Sana müşteri getiriyorum."
> ✅ **"Boş saatini dolduruyorum ve istediğin ürünü sattırıyorum."**

İkinci cümle fatura kesilebilir bir cümledir.
