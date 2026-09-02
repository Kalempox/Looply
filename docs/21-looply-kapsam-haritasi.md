# 21 — Looply Kapsam Haritası

> Ürün sahibinin 2026-09-02'de yazdığı tam kapsam belgesinin **koddaki
> karşılığı**. Her madde için tek soru soruldu: *bu bugün çalışıyor mu?*
>
> Durumlar: ✅ çalışıyor · 🟡 kısmen · ⬜ yok · 🔴 yazılı ama çalışmıyor
> · ⚠️ kilitli bir kararla çelişiyor

**Tarih:** 2026-09-02 · **Kaynak:** ürün sahibi kapsam belgesi + kod taraması

---

# 0 · İsim değişikliği: CafePlay → **Looply**

Taranan hâliyle:

| Nerede | Adet |
|---|---|
| Kod (`.ts`, `.tsx`, `.sql`, `.json`, `.css`) | 60 dosya, 113 geçiş |
| Doküman (`docs/*.md`) | 8 dosya, 27 geçiş |
| Altyapı (`docker-compose.yml`, `.env.example`) | veritabanı adı, rol adları, kap adı |

**Önerilen ayrım — hepsi aynı iş değil:**

| Katman | Ne yapılmalı | Gerekçe |
|---|---|---|
| Kullanıcıya görünen her yer | ✅ Değişsin | `layout.tsx` başlığı, ekran metinleri, SMS şablonları, aydınlatma metni |
| Depo, paket adı, alan adı | ✅ Değişsin | Yeni kimlik buradan başlar |
| Doküman | ✅ Değişsin | Karar defteri dahil |
| **Veritabanı rol adları** (`cafeplay_app`, `cafeplay_admin`) | ⚠️ **Dokunulmasın** | 10 ayrı göç dosyasında geçiyor. Göçler uygulanmış tarih — geriye dönük düzenlenmez. İstenirse tek bir yeni göçte `ALTER ROLE … RENAME TO` yapılır, ama kullanıcıya görünmeyen bir isim için şema geçmişini kalabalıklaştırmaya değmez |

⚠️ **SMS gönderici başlığı** de değişiyor. Operatör onayı birkaç iş günü —
isim kararı kesinleştiği gün başvurulmalı, yoksa canlıya çıkışı bloke eder.

---

# 1 · Çekirdek döngü — **tamamı çalışıyor**

Kapsam belgesindeki §30 döngüsü uçtan uca yazılı ve testli:

```
QR → kafe sayfası → oyun → skor → ödül → kupon → kafede kullanım → tekrar ziyaret
```

| Madde | Durum | Nerede |
|---|---|---|
| Masa QR'ı → "Cafe X'e hoş geldin" | ✅ | `/m/[kod]`, 90 sn tek kullanımlık jeton (K1) |
| Telefon + SMS OTP → doğrulanmış hesap | ✅ | Faz 3, `domain/otp.ts` |
| Parola + "beni hatırla" | ✅ | Ü36, `domain/parola.ts` |
| **Önce oyna, sonra kaydol** | ✅ | Ü35, `/hemen` — imzalı talep çerezi |
| Oyun → sunucuda skor doğrulama | ✅ | Aynı modül iki tarafta koşuyor; istemci skoru sadece denetimde |
| Ödül motoru | ✅ | `domain/oyun.ts` + `domain/kupon.ts` |
| **Kazanıldı → Beklemede → Aktif** | ✅ | A5 / Ü28 — eşiğin üstü 24 saat sonra açılıyor |
| Kupon hatırlatma SMS'i | ✅ | `domain/hatirlatma.ts` — kasıtlı olarak reklamsız (G7) |
| QR kupon, sadece jeton taşıyor | ✅ | Ü19 — içeriği değiştirmek işe yaramıyor |
| Yedek 6 haneli kod | ✅ | Kamera çalışmazsa |
| Kasada okutma, **atomik tek kullanım** | ✅ | Faz 7 — eşzamanlı iki istek testli |
| 60 sn geri alma | ✅ | Faz 7 |
| Süre dolumu → bütçeye iade | ✅ | Faz 7 |
| Uygulama yüklemeden çalışması (PWA/web) | ✅ | Zaten öyle — kasa da tarayıcıda |
| Append-only ödül defteri | ✅ | Değişmez kural #5 |

**Fraud ve doğrulama** (§27):

| Madde | Durum |
|---|---|
| Skor uydurmanın engellenmesi | ✅ Sunucu yeniden oynatıyor |
| Kupon tek kullanımlık | ✅ DB kısıtı + atomik işlem |
| Konum doğrulaması (K2, 150 m) | ✅ Ü3 — kafe dışında hiçbir kazanım yazılmıyor |
| Davet fraud motoru | ✅ Faz 9 — kimlik/cihaz/ağ/davranış/desen sinyalleri → risk skoru |
| Günlük puan tavanı | ✅ E4 — 900 puan/oyuncu/kafe/gün |

**Davet sistemi** (§ referral bölümünün tamamı) — belgede yazılanın hepsi var:
10 durumlu makine (`CLICKED → … → REWARDED / REJECTED / EXPIRED`), nitelikli
davetin yedi şartı, XP ödülü (para değil), ayrı defter. `19-faz9-davet-kapi-raporu.md`.

---

# 2 · Kafe paneli — çoğu çalışıyor

| Belgedeki madde | Durum | Not |
|---|---|---|
| §16 Dashboard (bugünkü oyun, aktif oyuncu, kupon) | ✅ | Faz 8 |
| §19 Ödül oluşturma — ürün + yüzde | ✅ | İki tip, TL değeriyle |
| §19 "Günde sadece 10 kişi kazanabilir" | ⬜ | Ödül başına **günlük adet limiti yok**. Kontrol yalnızca bütçe üzerinden |
| §20 Kupon yönetimi (aktif/kullanılan/süresi dolan) | ✅ | Faz 7 + kasiyer geçmişi |
| §18 Masa QR'ları | ✅ | D11 — yazdırılabilir |
| §18 Kasa / menü / fiş QR'ı | ⬜ | Yalnızca masa var |
| §21 Müşteriler (anonim) | 🟡 | Anonim kod bazlı defter var; **"tekrar gelen müşteri" metriği yok** |
| §23 İstatistikler | ✅ | Faz 8 |
| Haftalık bütçe (min 1.500 TL) | ✅ | Rezervasyon + iade + üç durumlu defter |
| Happy Hour havuzu | ✅ | Ö3 |
| Ürün ve kategori yönetimi | ✅ | Ü75 |
| Personel + PIN | ✅ | Faz 3 |
| Kafe konumu | ✅ | Panelden ayarlanıyor |
| §17 **Oyun yönetimi** — kafe hangi oyunu açar/kapatır | ⬜ | Hiç yok |
| §22 **Reklamlar** | ⬜ | Hiç yok |
| **Ödül/ürün adını düzeltme** | ⬜ | Yazım hatasının tek çaresi kaldırıp yeniden eklemek |

---

# 3 · Oyuncu tarafı

| Belgedeki madde | Durum | Not |
|---|---|---|
| §7 Hoş geldin | ✅ | |
| §7 Bugünkü puan | ✅ | |
| §7 Aktif ödüller | ✅ | `/oduller` |
| §10 Puanlarım (toplam, bugün, seviye, XP) | ✅ | **Haftalık puan yok** |
| §11 Ödüller | ✅ | |
| §12 Kuponlarım | ✅ | Belgede yazılan her alan var |
| §13 Leaderboard | 🟡 | **Yalnızca kafe bazlı** (bugün + tüm zamanlar). Şehir, haftalık, aylık, arkadaş, global ⬜ |
| §9 Günün Challenge'ı | 🟡 | `gununOyunu()` var ama yaptığı tek şey **2x puan çarpanı**. Belgedeki "Pazartesi hafıza, Salı hız…" rotasyonu ⬜ |
| §7/§14 **Yakınındaki kafeler** | ⬜ | Kafe keşif ekranı hiç yok |
| §15 Kampanyalar | 🔴 | **Aşağıya bakın** |
| Günlük seri | ✅ | Ü54 — tam ekran sahne |
| Rozetler | ✅ | Ü16 — yalnızca statü |
| Çark | ✅ | Ü49 |
| Masayı Fethet | ✅ | Ö1 |
| §31 İki ayrı tasarım dili | ✅ | Ü61 — oyuncu canlı, panel resmî |

---

# 4 · 🔴 Yazılı ama çalışmayan iki şey

### 4.1 · Kampanyalar hiç kimseye ulaşmıyor

Panelde kampanya oluşturuluyor, kaydediliyor, listede görünüyor, limitleri
zorunlu (Ü8) — ve **hiçbir oyuncuya düşmüyor.**

`domain/kupon.ts`'teki `INSERT INTO coupons` `campaign_id` kolonuna hiç
yazmıyor; sütun yalnızca okunuyor. Veritabanında **403 ödül kuponu, 0
kampanya kuponu.**

Demoda paneldeki bir özelliği gösterip karşılığının olmadığını söylemek
gerekiyor. **Teslim yolu yazılacak** (ürün sahibi kararı, 2026-09-02).

### 4.2 · Skor eşiği bonusu bugüne kadar bir kez bile ödenmedi

Ü48 ile eklendi ve doğru yazıldı: 1500 → +150 puan, 2500 → +300 puan;
kademeler birikmiyor; başarılı/başarısız ayrımının dışında.

Ama oyunlar **hedefe ulaşınca duruyor**:

```
blok.ts:212   bittiMi = tikandi || temizlenen >= hedef
dusen.ts:277  bittiMi = doldu   || temizlenen >= hedef
```

Gerçek oynanan turlardan ölçüldü:

| Oyun | Tur | En yüksek skor | 1500'ü geçen |
|---|---|---|---|
| blok | 611 | 1200 | 0 |
| dusen | 186 | 246 | 0 |
| kelime | 187 | 143 | 0 |

Blok 12 satırda duruyor, 12 satır ≈ 1200 puan. Oyun oyuncuyu eşiğe
varmadan durduruyor. **Sonsuz moda geçmek bu sistemi ölü koddan
çıkarıyor** — ikisi ayrı iş değil, aynı iş.

⚠️ Kritik bağ: kupon düşüşü `oyun.ts:164`'te `if (opts.basarili)` içinde.
Sonsuz oyunda herkes kaybederek bittiği için `basarili` hep `false` olur
ve **hiç kupon düşmez.** `basarili()` bir skor eşiğine bağlanmalı.

---

# 5 · ⚠️ Kilitli kararlarla çelişen maddeler

Bunlar "yapılmamış" değil, **kasıtlı olarak yapılmamış**. Değiştirmek
mümkün ama kararın neden verildiği bilinerek değiştirilmeli.

### 5.1 · "CafePlay Kazançlarım — Toplam değer: 430 TL" ⚠️ **E9**

Belge oyuncuya ödüllerinin TL toplamını gösteriyor. **E9 tam olarak bunu
yasaklıyor.**

Gerekçe projenin en büyük sessiz ölüm riski: oyuncunun telefonunda
"80 TL" yazarsa kasiyer ekrana bakıp ürünü verir, sistemi hiç okutmaz.
O zaman sistem hiçbir şey görmez, kafenin bütçesi dolu görünür ve bütün
raporlar yalan söyler. Kafeye sattığımız şey rapordur.

**Ara yol var:** ödülün TL değeri **kafe tarafında** ekonomik birim olarak
zaten tutuluyor ("bugün 1.240 TL değerinde ödül dağıtıldı" kafe panelinde
gösterilebilir ve gösterilmeli). Oyuncu tarafında ise TL yerine ödülün
**adı** duruyor. Belgedeki "Reward Value (TL)" fikri doğru — yalnızca
kimin göreceği farklı.

### 5.2 · Kafe Bakiyesi / Looply Bakiye ⚠️ **Ü18**

Belge üçüncü bir ödül tipi istiyor: "50 TL kafede harcanabilir bakiye".
Ü18 bunu v1'den **çıkardı**. Şemada `reward_type` yalnızca
`('product', 'percent')`.

Eklenebilir ve belgedeki tasarım sağlam (nakit çekim yok, yalnızca kafe
içi harcama, ürün ödülü nakde çevrilemez). Ama:
- Yeni bir defter, yeni bir durum makinesi, kısmi kullanım ("125 TL
  bakiye, 200 TL hesap → 75 TL kalan") gerekiyor
- Kısmi kullanım bugünkü kupon modelinde yok — kupon ya kullanılır ya
  kullanılmaz
- Belgenin kendi uyarısı yerinde: nakit çekim eklendiği an KYC/AML ve
  ödeme mevzuatı doğuyor. Kafe içi bakiye bu çizginin doğru tarafında

### 5.3 · Çapraz kafe XP ⚠️ **Ü15 + G12**

*"Cafe A'da kazandığın 2.000 XP ile Cafe B'de ödül aç."*

Ü15 seviyeyi **kafe bazında** tanımladı, global profil seviyesi yok. Daha
sert engel şu: anonim oyuncu kodu **kafe bazında farklı** (docs/08 §2.1) —
kafeler kendi aralarında aynı oyuncuyu eşleştiremiyor. Bu bir uygulama
detayı değil, veri modelinin taşıyıcı kolonu.

Çapraz kullanım istenirse platform seviyesinde ayrı bir XP havuzu açmak
gerekir; kafelerin birbirinin oyuncusunu görmesi **yine olmamalı**.

### 5.4 · Şansa dayalı ödül ⚠️ **S7 — hâlâ açık**

Belgenin en önemli mekaniği: *"Puan eşikleri ödülü garanti etmesin, ödül
olayı açsın."* Yani ödül şansa bağlanıyor. Aynı şey çarkta da var (Ü49).

**S7 kayıtta "v1'den çıkarıldı" diye duruyor ama çark geri geldi ve bu
belge şansı çekirdeğe koyuyor.** Ödül dağıtan bir şans mekaniği canlıya
çıkmadan önce çekiliş/promosyon mevzuatı açısından hukuki görüş şart. Bu
**en riskli açık madde** ve kodla kapanmıyor.

### 5.5 · Oyuncuya göre uyarlanan zorluk ⚠️ **S5 ile gerilim**

*"Sistem oyuncunun başarı oranını öğrenir, oyun zorlaşır."*

Sunucu skoru **yeniden oynatarak** doğruluyor. Zorluk oyuncuya göre
değişiyorsa sunucunun o turdaki zorluk parametrelerini bilmesi gerekir —
yoksa dürüst oyuncunun skoru reddedilir. Çözülebilir (zorluk parametreleri
oturum satırına yazılır, replay onu okur) ama **oyun sözleşmesine
dokunuyor** ve sonsuz mod işiyle birlikte tasarlanmalı.

---

# 6 · ⬜ Hiç başlanmamış bloklar

Büyükten küçüğe, tahmini büyüklükle:

| # | Blok | Belge § | Büyüklük | Not |
|---|---|---|---|---|
| 1 | **Reklam sistemi + reklamveren rolü** | 6, 22 | Çok büyük | Dördüncü bir rol ve dördüncü bir panel. Kiracı izolasyonu, envanter, hedefleme, gösterim sayacı, faturalama. Tek başına bir faz |
| 2 | **Analitik / event pipeline** | 26 | Büyük | "oyunu açtı → başlattı → 20 sn oynadı → kaybetti → reklam gördü → kupon kazandı" zinciri. D1/D7/D30 retention buna bağlı |
| 3 | **Sonsuz oyun + oyun içi ödül bloğu** | Tetris bölümü | Orta-büyük | Ödül bloğunun oyuna düşmesi belgedeki **en özgün fikir** — ödülü popup olmaktan çıkarıp mekaniğin parçası yapıyor |
| 4 | **Kafe keşif / yakındaki kafeler** | 7, 14 | Orta | Oyuncuyu tek kafeye bağlı olmaktan çıkarır. Ağ etkisinin ilk adımı |
| 5 | **Günün Challenge'ı (rotasyon)** | 9 | Orta | Bugün yalnızca 2x çarpan var. "Bugün ne var?" merakı bundan doğuyor |
| 6 | **Leaderboard genişletme** | 13 | Orta | Haftalık sezon + şehir + arkadaş. Haftalık sıfırlama tek başına retention'a en çok dokunan ucuz iş |
| 7 | **Platform Dashboard** | 24 | Orta | Sistem geneli sayılar. Bugün yalnızca kafe onayı ve acil durdurma var |
| 8 | **Kafe oyun yönetimi** | 17 | Küçük | Hangi oyun açık/kapalı |
| 9 | **Kupon kullanım günü/saati kısıtı** | Kafe şartları | Küçük | "Pzt–Cuma, 14:00–18:00". Happy Hour kazanma tarafında var, **kullanma tarafında yok** |
| 10 | **Ödül başına günlük adet limiti** | 19 | Küçük | Bugün kontrol yalnızca bütçede |
| 11 | **Tekrar ziyaret metriği** | 4, 21, 31 | Küçük-orta | Belgenin *"en kritik metrik"* dediği şey. Veri var, hesap yok |
| 12 | **Kafe vs kafe** | 20 | Orta | Fikir havuzunda F9 |
| 13 | **Saat bazlı challenge** | 23 | Küçük | Happy Hour altyapısı kısmen taşır |
| 14 | **Hava / mevsim / takvim tetikleyicileri** | 24, 25 | Orta | Fikir havuzunda F4. Dış veri bağımlılığı |
| 15 | **Tahmin motoru + dinamik bütçe önerisi** | 26, 27, 28 | Büyük | En az 2–3 aylık gerçek veri ister. Veri olmadan yazılamaz |
| 16 | **Erişim seviyeleri / Boost** | 30 | Orta | Gelir modeli |
| 17 | **Abonelik + finans** | 25, 28 | Büyük | Belgede zaten "ilk sürümde çalıştırmayacağız" |
| 18 | **Kafeye özel tema** (Pizza Blocks) | 21 | Küçük-orta | Tek motor, çok tema |
| 19 | **Kafede kalma süresine göre oyun** | 22 | Orta | `k3_dwell_minutes` config'de var, kodda yok |

---

# 7 · Devam eden karar noktaları

Kapsam belgesi bunları çözmüyor, hâlâ açık:

| # | Konu | Neden bloke |
|---|---|---|
| **S7** | Çark ve şansa dayalı ödülün mevzuatı | ⚠️ **En riskli.** Canlıya çıkışı bloke eder |
| **S20** | Aydınlatma metni hukuk incelemesi | Pilotu bloke eder, 1–2 hafta |
| **S17** | Kalan 7 oyunun listesi | `18-oyun-adaylari.md` |
| **S6/H2** | Ad-soyad-telefon için hukuki sebep | Açık rıza mı, sözleşmenin ifası mı |
| **G32** | Platform girişinde TOTP | Faz 3'ten devreden açık madde |
| — | SMS gönderici başlığı (yeni isimle) | Birkaç iş günü |

---

# 8 · Önerilen sıra

Kural: **önce yalanı kapat, sonra döngüyü güçlendir, sonra genişlet.**

**Şimdi — ürün bugün söylediğini yapmıyor**
1. Kampanya teslim yolu (§4.1)
2. Sonsuz oyun + `basarili()` kararı (§4.2) — 1500/2500'ü canlandırır
3. Blok ve Düşen'in oyun tahtası görünümü
4. İsim değişikliği (§0) — SMS başlığı başvurusu bununla başlıyor

**Sonra — döngüyü güçlendiren en ucuz işler**
5. Haftalık leaderboard sezonu
6. Günün Challenge'ı rotasyonu
7. Tekrar ziyaret metriği (kafeye sattığımız cümle bu)
8. Ödül başına günlük adet limiti + kullanım günü/saati

**Ondan sonra — yeni yüzeyler**
9. Oyun içi ödül bloğu (S7 cevabı geldikten sonra)
10. Kafe keşif ekranı
11. Analitik event pipeline
12. Platform dashboard

**En son — ayrı fazlar**
13. Reklam sistemi + reklamveren paneli
14. Abonelik ve finans
15. Tahmin motoru (yeterli veri biriktikten sonra)
