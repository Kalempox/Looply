# 18 — S17 · Kalan yedi oyun için aday liste

> Ürün sahibinin seçmesi için hazırlandı. **Karar verilmedi.**
> Ü21 ile ilk üç oyun seçilmişti: Blok · Kelime · Düşen. Bu belge kalan yediyi
> seçmek için adayları ve elenenleri gerekçeleriyle sıralıyor.

**Tarih:** 2026-08-26 · **Kaynak:** `src/oyunlar/sozlesme.ts`, `docs/05` S5 ve S17

---

## 1 · Süzgeç — bir oyun listeye neden girer

Motor sözleşmesi dört fonksiyon istiyor: `baslat(tohum, bolum)`, `uygula`,
`bittiMi`, `skor`. Sunucu oyunu **aynı modülle yeniden oynuyor**; istemcinin
iddia ettiği skor hesaba hiç girmiyor.

Bu üç şartı doğuruyor. İlk ikisi zaten biliniyordu; **üçüncüsü bu incelemede
çıktı ve tek başına adayların yarısını eliyor.**

### Ş1 · Durum, `(tohum, girdiler)` fonksiyonu olmalı

Aynı tohum ve aynı girdi dizisi her zaman aynı duruma varmalı. Kayan noktalı
fizik motorları burada kırılgan: aynı hesap farklı cihazda farklı bit üretebilir
ve dürüst oyuncunun skoru reddedilir.

### Ş2 · Skor, oyuncunun ölçtüğü gerçek zamana dayanmamalı

Sunucu istemcinin duvar saatini göremez. Tepki süresi ödüllendiren bir oyunda
sunucu, istemcinin *"200 ms'de bastım"* iddiasına inanmak zorunda kalır.

**Zamanın kendisi yasak değil** — Düşen bunu çözdü: zaman gerçek saniyeye değil
**tick sayacına** bağlı ve her girdi hangi tick'te yapıldığını taşıyor. Sunucu
yerçekimini o tick'e kadar deterministik olarak ilerletiyor.

> ⚠️ **Bu çözümün bilinen bedeli:** tick'leri istemci sayıyor. Kötü niyetli
> oyuncu tick aralığını gerçeğinden küçük göndererek oyunu ağır çekimde
> oynayabilir. Sunucu bunu tek başına oyun kaydından ayırt edemez; ancak
> **oturum süresiyle tick sayısını karşılaştırarak** yakalar (`started_at` ve
> `ended_at` sunucuda). Bu, Faz 9 fraud motorunun "oyun süresi / skor davranışı"
> sinyaline giriyor — tick tabanlı her yeni oyun aynı kontrole tabi.

### Ş3 · Tohum, oyuncudan gizlenen bilgi taşımamalı

**En çok aday bu şartta eleniyor.** Modül istemcide de çalıştığı için tohum
oyuncunun elinde. Tohum gizli bir düzeni kodluyorsa (kapalı kartların yeri,
mayınların yeri, destenin sırası) oyuncu o düzeni kendi tarayıcısında
hesaplayabilir ve oyunu **hiç oynamadan** çözebilir.

Mevcut üç oyun bu yüzden geçiyor: üçünde de tahtadaki her şey açık. Tohum
yalnızca *hangi parçalar teklif edilecek* veya *hangi harfler verilecek* gibi
zaten görünen şeyleri belirliyor.

Bir oyunda gizli bilgi olacaksa tek çözüm, o bilgiyi **sunucuda tutup adım adım
açmak** — ama bu "aynı modül iki tarafta" ilkesini bozar ve her hamlede sunucu
turu gerektirir. Kafede, zayıf bağlantıda oynanan bir oyun için pahalı.

---

## 2 · Geçen adaylar

Girdi biçimi sütunu önemli: Ü21'in mantığı, motorun **tek bir girdi biçimine
göre yazılmadığını kanıtlamak.** Mevcut üçü `(teklif, satır, sütun)`,
`kelime` ve `(tick, hareket)` üretiyor.

| # | Oyun | Girdi biçimi | Zaman | Maliyet | Not |
|---|---|---|---|---|---|
| 1 | **Renk sıralama** (şişelere top ayırma) | `(kaynak, hedef)` | yok | düşük | Tür olarak en yaygın gündelik bulmaca. Tahta tamamen açık, tohum yalnızca başlangıç dağılımını kuruyor. Yeni bir girdi biçimi: iki kap arasında aktarım |
| 2 | **Blok kaydırma** (çıkışa götür) | `(parça, yön, adım)` | yok | düşük | Tahta açık, çözüm tek. Kısa bölüm süresi kafe masasına çok uygun |
| 3 | **Boru döşeme** (parça döndür, akışı bağla) | `(satır, sütun)` — her dokunuş 90° | yok | düşük | Girdi tek hücre; en ucuz oyunlardan biri. Görsel dili "asil şerit"le iyi anlaşır |
| 4 | **Işık söndürme** | `(satır, sütun)` | yok | çok düşük | Matematiği bir sayfa; bölüm üretimi tohumdan tamamen çözülebilir. Hızlı kazanım |
| 5 | **Sayı birleştirme** (2048 tarzı) | `(yön)` | yok | düşük | Girdi dört değerden ibaret — kayıt çok küçük. ⚠️ Yeni karo tohumdan geldiği için ileri oyuncu diziyi önceden hesaplayabilir; skor tavanı bölüm hedefiyle sınırlanarak etkisi kısılır |
| 6 | **Nonogram** (sayılarla resim) | `(satır, sütun, işaret)` | yok | orta | Açık bilgi, tek çözüm, doğrulaması kolay. Daha uzun oturum — "kahve bitene kadar" oynanan tek aday |
| 7 | **Mini sudoku (6×6)** | `(hücre, değer)` | yok | orta | Klasik; 9×9 kafede uzun, 6×6 doğru ölçek. Bölüm üretimi (tek çözümlü ızgara) işin asıl maliyeti |
| 8 | **Kelime avı** (ızgarada kelime bul) | `(başlangıç, bitiş)` | yok | düşük | Sözlük altyapısı **zaten var** (hunspell-tr, Ü23) — en ucuz ikinci kelime oyunu. Girdi biçimi Kelime'den farklı: koordinat çifti |
| 9 | **Yılan** | `(tick, yön)` | tick | orta | Düşen'le aynı zaman modeli, aynı fraud kontrolü. Ekliyorsa Düşen'le birlikte düşünülmeli — ikisi de tick sayıyor |
| 10 | **Bağla** (aynı renkleri çakışmadan birleştir) | `(yol: hücre dizisi)` | yok | orta | Girdi bir yol — en zengin girdi biçimi. Bölüm üretimi zor: her bölümün çözülebilir olduğu garanti edilmeli |
| 11 | **Sayı zinciri** (1'den N'e komşu adımlarla) | `(hücre)` | yok | orta | Nonogram ve sudokuyla aynı ailede; üçünden ikisini almak muhtemelen yeter |

### Seçim yaparken bakılabilecek üç eksen

**Girdi çeşitliliği.** 1, 5, 10 ve 8 birbirinden gerçekten farklı kayıt
üretiyor; 3, 4, 7, 11 aynı `(hücre)` biçimine yakın. Motorun genelliğini
kanıtlamak için ilk gruptan en az ikisi.

**Oturum süresi.** 2, 3, 4, 5 bir-iki dakika; 6, 7, 10 daha uzun. Kafede
telefona bakılan süre kısa — uzun olanlardan **en fazla ikisi**.

**Maliyet.** 1–5 ve 8 düşük; 6, 7, 10, 11'de asıl iş oyun değil **bölüm
üretimi** (her bölümün çözülebilir ve tek çözümlü olduğunu garanti etmek).

> Sıralamayı ben yapsaydım: **1, 2, 3, 8** (ucuz, kısa, farklı girdi) +
> **5** (en küçük kayıt) + **6 veya 7** (uzun oturum için biri) + **10** (girdi
> zenginliği için). Ama bu bir ürün kararı — oyuncunun ne oynamak isteyeceğini
> sen benden iyi biliyorsun.

---

## 3 · Elenenler ve gerekçeleri

| Oyun | Hangi şart | Neden |
|---|---|---|
| **Hafıza / eşleştirme** | Ş3 | Kapalı kartların yeri tohumda. Oyuncu tarayıcısında düzeni hesaplayıp her çifti ilk denemede açar — sunucu bunu kuraldışı sayamaz, çünkü hamleler kurallara uygun |
| **Mayın tarlası** | Ş3 | Aynı sebep: mayınların yeri tohumda. "Şanslı oyuncu" ile "tohumu okuyan oyuncu" ayırt edilemez |
| **İskambil / solitaire** | Ş3 | Kapalı destenin sırası tohumda |
| **Refleks / tepki süresi** | Ş2 | Sunucu istemcinin duvar saatine inanmak zorunda. `lib/games.ts`'teki eski liste bu yüzden Ü21'e uymuyordu |
| **Ritim / tempo** | Ş2 | Skorun tamamı zamanlama hassasiyeti; tick'e indirgenirse oyun ortadan kalkıyor |
| **Fizik tabanlı denge / atış** | Ş1 | Kayan nokta belirlenimi cihazdan cihaza değişebilir; dürüst oyuncunun skoru reddedilir. Sabit noktalı aritmetikle çözülebilir ama maliyeti oyunun kendisinden büyük |
| **Çok oyunculu / gerçek zamanlı düello** | Ş1 + Ö5 | Ö5 zaten reddedildi (kafede rahatsızlık). Ayrıca iki istemcinin durumu tek kayda indirgenemiyor |

---

## 4 · Karar verilince ne oluyor

Seçilen her oyun için sırayla:

1. `src/oyunlar/<ad>.ts` — dört fonksiyon + `girdiOku`
2. `src/oyunlar/arayuz/<ad>-ekran.tsx` — ekran
3. `src/oyunlar/index.ts` içindeki diziye bir satır
4. `tests/oyun-motoru.test.ts` — deterministik tekrar, kuraldışı hamle reddi,
   girdi kaydı sınırı

Motor, oturum akışı, sunucu doğrulaması ve mevcut ekranlar **değişmiyor** —
Faz 5'in "yeni oyun eklemek dosya eklemektir" sözünün karşılığı bu.

Tick kullanan oyun seçilirse (9) fraud motoruna **süre/tick tutarlılık
kontrolü** eklenmeli; §1 Ş2'deki uyarı.
