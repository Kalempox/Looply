# 15 — Faz 7 Güvenlik Kapısı Raporu

**Tarih:** 2026-08-25
**Sonuç:** ✅ Geçti — **190/190 test**, `npm run ci` temiz

Faz 7, para değerinin **gerçek dünyaya çıktığı** yer. Faz 5 değeri üretiyordu, Faz 6 sınırını koyuyordu; burası değerin kahveye dönüştüğü an. Planın en sıkı fazı.

---

## §1 · Kapı şartları

| # | Şart | Sonuç |
|---|---|---|
| 1 | Aynı kupon iki kez onaylanamamalı — **eşzamanlı** iki istekte bile | ✅ `Promise.all` ile iki paralel onay: biri geçti, bütçeden bir kez düşüldü |
| 2 | Aynı jeton QR'dan ve koddan aynı anda gelirse yalnızca biri geçmeli | ✅ İki yol paralel denendi, tek onay |
| 3 | Oyuncu kendi kuponunu "kullanıldı" yapamamalı | ✅ `redeemed_by_staff_id` NOT NULL; tek yazma yolu kasiyer oturumu |
| 4 | Başka kafenin kuponu kabul edilmemeli | ✅ Çözümlemede bulunmuyor, onayda reddediliyor |
| 5 | Tutar istemciden değil kayıttan düşmeli | ✅ Ürün ödülünde istemci tutarı yok sayılıyor; yüzdelide tavana kırpılıyor |
| 6 | Değiştirilmiş QR ödül değerini değiştirememeli | ✅ QR yalnızca jeton taşıyor; değer sunucudan geliyor |
| 7 | Bütçe negatife düşememeli | ✅ Bütçe dolduğunda kupon hiç üretilmiyor (E10) |

---

## §2 · Atomikliğin dayandığı yer

Onay **koşullu UPDATE** ile yapılıyor:

```sql
UPDATE coupons SET status = 'redeemed', … WHERE id = $1 AND status = 'active'
```

İkinci istek sıfır satır günceller ve reddedilir. Satır ayrıca `FOR UPDATE` ile kilitleniyor, yani iki istek sıraya giriyor.

QR ve kod **aynı kupon satırını** gösterdiği için iki yoldan gelen istek de aynı kilide çarpıyor (Ü19). "İki telefon aynı anda okutursa kupon yalnızca bir kez kullanılabilmeli" şartının karşılığı bu — ve test bunu gerçekten paralel çağırarak sınıyor, sırayla değil.

---

## §3 · Ü19 · İki yol, tek kupon

`coupons.qr_token` **ayrı bir kolon** olarak eklendi. Tek koda bağlanabilirdi ama:

> 6 haneli kod **konuşulmak** için var — kasiyer sesli okuyabilmeli, müşteri yazabilmeli. Bu yüzden kısa olmak zorunda ve entropisi 31⁶ ≈ 887 milyonla sınırlı. QR'ın böyle bir kısıtı yok; yüksek entropiyi bedavaya taşıyor. Tek koda bağlansaydı QR yolu, kodun güvenlik tavanını miras alırdı.

QR'ın içinde **ödül bilgisi yok** — yalnızca jeton. Oyuncu QR içeriğini değiştirip "100 TL yerine 1.000 TL" yapamıyor çünkü değer QR'da hiç durmuyor.

### ⚠️ Sahadaki gerçek: iOS'te kamera yok

Tarayıcıda kamerayla QR okuma her yerde yok. `BarcodeDetector` Chrome/Android'de var, **Safari/iOS'te yok**. Yani "QR birincil" kararı, iPhone kullanan kafelerde pratikte **koda düşüyor**.

Ekran bunu sessizce yaşamıyor: kamera desteklenmiyorsa düğme hiç görünmüyor ve altta şu yazıyor — *"Bu tarayıcı kamerayla QR okuyamıyor. Müşterinin ekranındaki altı haneli kodu gir — aynı kuponu açar."*

Ü19'un yedek yolu bu yüzden bir "kolaylık" değil, bazı cihazlarda **tek yol**. Kararın kendisi doğru çıktı; yedeksiz QR sahada kırılırdı.

---

## §4 · E9 — geçerlilik yalnızca kasiyer ekranında

Projenin en büyük sessiz ölüm riski: kasiyerin sistemi kullanmaması. Kasiyer kodu girmeden indirimi elle yaparsa sistem hiçbir şey görmez — kafenin bütçesi dolu görünür ve bütün raporlar yalan söyler.

Bu risk teşvikle değil **tasarımla** kapatılıyor:

| | Oyuncu ekranı | Kasiyer ekranı |
|---|---|---|
| Ödülün adı | ✅ | ✅ |
| QR + 6 haneli kod | ✅ | — |
| **TL değeri** | ❌ | ✅ |
| **Geçerlilik damgası** | ❌ | ✅ |
| Müşteri kimliği | — | Anonim kod (G1) |

Tarayıcıda doğrulandı: oyuncunun kupon ekranında **"TL" dizisi hiç geçmiyor**. Kasiyer ekranında "DEĞER 15 TL" ve "Müşteri P-FB4V" görünüyor — ad soyad değil.

Süresi dolmuş, başka kafeye ait veya zaten kullanılmış bir kupon telefonda geçerli olanla neredeyse aynı görünüyor. Kasiyer telefona bakıp ürün verirse er ya da geç kullanılmış bir kuponu ikinci kez onurlandırır — ve bu günlük mutabakatta ortaya çıkar.

---

## §5 · Test sırasında bulunan üç hata

### 5.1 · Bypass bağlamında bütçe sorgusunda kiracı süzgeci yoktu 🔴

**Bulgu:** `katalogdanAl` kimlik öncesi akışlarla aynı işlemde koştuğu için `withBypass` kullanıyor — orada RLS **kapalı**. Bütçe dönemi sorgusunda `cafe_id` süzgeci yoktu ve süzgeç yalnızca RLS politikasında duruyordu.

**Sonucu:** Kupon **başka kafenin bütçesinden** rezerve edilebiliyordu. Kafe A'da alınan ödül, Kafe B'nin parasını bağlayabilirdi.

**Nasıl bulundu:** Test dosyalarını iki farklı kafeye ayırdığımda bütçe sayıları tutmadı. Tek kafede çalışırken hata görünmüyordu.

**Düzeltme:** Bütçe sorgularının tamamına `cafe_id` süzgeci **açıkça** eklendi. G12'nin iki katmanı burada da geçerli: uygulama süzgeci **ve** RLS. Bypass bağlamı ikincisini kapatıyorsa, birincisi tek başına doğru olmak zorunda.

### 5.2 · Tohumdaki kasiyer hiçbir zaman giriş yapamıyordu 🟠

**Bulgu:** Tohum betiğinin kendi PIN hash'leme kopyası vardı: `salt:hash` biçimi ve varsayılan scrypt parametreleri. Doğrulayıcı ise `scrypt$salt$hash` ve `N=32768` bekliyor.

**Nasıl bulundu:** Kasa ekranında PIN 1234 ile giriş denendi, "PIN yanlış" döndü. Faz 7'ye kadar kasa ekranı olmadığı için kimse fark etmemişti.

**Düzeltme:** Tohum artık `domain/staff.ts`'in `pinHashle` fonksiyonunu **doğrudan kullanıyor**. Kopya uygulamalar böyle ayrışır; tek kaynak kaldı.

### 5.3 · Kazanılan ödül oyuncuya söylenmiyordu 🟠

**Bulgu:** Alan katmanı anlık ödülü üretip sonuçta döndürüyordu ama oyun sonuç ekranı bu alanı hiç okumuyordu. Oyuncu ödül kazanıyor ve **haberi olmuyordu**.

**Nasıl bulundu:** Tarayıcıda oyun oynandı, ekranda kupon görünmedi; veritabanında kupon duruyordu.

**Düzeltme:** Sonuç ekranına ödül kartı eklendi — ödülün adı ve "Ödüllerim"e bağlantı. TL değeri yok (E9).

---

## §6 · Uçtan uca doğrulama — gerçek tarayıcıda

Testler alan katmanını çağırıyor; sunucu eylemi sınırını ve iki ayrı oturumu kapsamıyorlar. Bu yüzden döngü tarayıcıda da oynandı:

| Adım | Sonuç |
|---|---|
| Oyuncu kelime bölümünü tamamladı | +300 puan, +50 XP, **🎟️ +1 shot espresso** |
| Ödüllerim → kupon açıldı | QR (gerçek SVG) + yedek kod `EAC9HM` · **hiçbir yerde TL yok** |
| Kasiyer PIN 1234 ile girdi | Cihaz tanındı, oturum açıldı |
| Kod girildi | **GEÇERLİ KUPON · DEĞER 15 TL · Müşteri P-FB4V** |
| ONAYLA | ✅ onaylandı, **Geri al · 56 sn** sayacı çalıştı |
| Defter | `commit = 1500` · kupon `redeemed` · onaylayan "Kafe A kasiyeri" |
| Kupon olayları | `issued → redeemed` |

---

## §7 · Açık maddeler

| # | Konu | Nereye |
|---|---|---|
| ⚠️ | **iOS'te tarayıcıdan QR okunamıyor.** Kasa telefonu iPhone ise akış koda düşüyor. Ekran bunu söylüyor ama saha pilotunda ölçülmeli: kasiyerler kodu gerçekten kullanıyor mu? | Faz 10 pilot |
| — | **Süre dolumu ve bekleyen kupon açma elle çağrılıyor.** `sureDolanlariSupur` ve `bekleyenleriAc` yazıldı ama zamanlanmış bir iş yok. Bütçe iadesi bu yüzden gecikebilir. | Faz 10 |
| — | **Kasiyer teşviki** (F14) karara bağlanmadı. Kasiyerin sistemi kullanma motivasyonu şu an yalnızca kendini koruma. | Fikir havuzu |
| — | **S14:** platform geliri hâlâ ürün sahibinde; Faz 8'den önce netleşmeli. | Faz 8 |
| ⚠️ | Kelime listesinin küfür süzgeci insan gözünden geçmeli | Faz 10 |
| ⚠️ | Düşen-blok mekaniğinin hukuki sınırı avukata sorulmalı | G6 |
| ⚠️ | **G32:** platform girişinde ikinci faktör yok | Faz 10 |

---

## §8 · Faz 7 neyi kapattı

Çekirdek döngü artık **uçtan uca çalışıyor**:

```
oyna → skor sunucuda doğrulanır → puan ve XP yazılır → anlık ödül düşer
     → kupon QR olarak açılır → kasiyer okutur → sunucu doğrular
     → bütçeden düşer → defterlere yazılır
```

Bu zincirin her halkasında değer üretiliyor veya harcanıyor ve hiçbir halkada istemciye güvenilmiyor: skor sunucuda yeniden hesaplanıyor, ödül sunucuda seçiliyor, tutar kayıttan okunuyor, onay yalnızca kasiyer oturumundan geçiyor.

Kalan fazlar bu döngünün **üstüne** kuruluyor — raporlar (Faz 8) onun ürettiği veriyi okuyor, davet (Faz 9) onu büyütüyor.
