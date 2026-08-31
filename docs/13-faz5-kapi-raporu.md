# 13 — Faz 5 Güvenlik Kapısı Raporu

**Tarih:** 2026-08-25
**Sonuç:** ✅ Geçti — **121/121 test**, `npm run ci` temiz

Faz 5, para değerinin **üretildiği** yer: skor puana, puan ödüle dönüşüyor. Bu fazın tek gerçek sorusu şu — *sunucu, istemcinin ne yaptığını bağımsız olarak doğrulayabiliyor mu?* Bu belge cevabı kayda geçirir.

---

## §1 · Kapı şartları

| # | Şart | Sonuç |
|---|---|---|
| 1 | Değiştirilmiş istemciyle yüksek skor gönderimi → reddedilmeli | ✅ 999.999 iddia edildi, sunucu kendi skorunu yazdı; iddia denetim için saklandı |
| 2 | Aynı oturumun tekrar gönderimi → reddedilmeli | ✅ İkinci gönderim reddediliyor, puan iki kez yazılmıyor |
| 3 | Günlük puan tavanı aşılamamalı | ✅ Tavana dayanıp durdu; kesilen miktar oyuncuya bildiriliyor |
| 4 | Kafe dışında ne puan ne XP yazılmamalı (Ü3, Ü14) | ✅ Defterde tek satır oluşmuyor |
| 5 | Başkasına ait / süresi geçmiş oturum kabul edilmemeli | ✅ İkisi de ayrı test |
| 6 | Girdi kaydına boyut sınırı | ✅ 5.000 girdi üstü reddediliyor |

**Ayrıca sınananlar:** aynı tohum aynı başlangıcı veriyor · sunucu replay'i canlı oyunla birebir aynı skoru buluyor (3 oyun × 3 tohum) · kuraldışı hamle, bozuk biçim ve geçersiz bölüm reddediliyor · zamanı geriye alan girdi reddediliyor.

---

## §2 · Doğrulamanın mimarisi

Sunucu ayrı bir "kontrol kodu" çalıştırmıyor — **oyunun kendisini** çalıştırıyor:

```
durum = girdiler.reduce(uygula, baslat(tohum, bolum))
skor  = skor(durum)
```

Aynı modül hem istemcide hem sunucuda. İki kod yolu ayrışamaz, çünkü tek yol var.

**Tohum sunucuda üretiliyor.** İstemci seçebilseydi, oyuncu kolay parça dizisi veren tohumu arar ve her seferinde onu oynardı.

**`Math.random()` oyun modüllerinde yasak** — lint kuralıyla değil, mimariyle: rastgeleliğin tek kaynağı tohumlu PRNG. Tüm işlemler 32-bit tamsayı; kayan nokta sapması ihtimali sıfır.

**İstemcinin skoru hiçbir hesaba girmiyor.** `claimed_score` sütununa yazılıyor ve tek işi, sunucununkiyle karşılaştırıldığında hile denemesini görünür kılmak (Faz 9 fraud motoruna girdi).

---

## §3 · Test sırasında bulunan üç hata

### 3.1 · Replay, dürüst oyuncuyu reddediyordu 🔴

**Bulgu:** Zaman tabanlı oyunda istemci, kaydın sonuna bir zaman işareti koymak zorunda — yoksa sunucu yerçekimini son hamlede durdurur ve skoru düşük hesaplar. Ama o işaret çoğu zaman bölümü **bitiren** şeyin ta kendisi oluyordu ve `tekrarOyna` "bölüm bitmişti, girdi devam ediyor" diyerek reddediyordu.

**Etkisi:** Her gerçek düşen-blok oyunu reddedilirdi. Testler değil, **test yazarken kurulan gerçek oynanış** yakaladı.

**Düzeltme:** Bölüm bittikten sonraki girdiler artık **yok sayılıyor**, reddedilmiyor. Güvenli: durum değişmediği için kaydı uzatarak kazanılacak bir şey yok. Artık girdi sayısı geri dönüyor ve ikiden fazlaysa denetim kaydına düşüyor.

### 3.2 · `is_qualified` yanlış anlamda kullanılmıştı 🟠

**Bulgu:** Kod `is_qualified = bölüm tamamlandı` yazıyordu. Oysa alan, kafenin metriğindeki **nitelikli ziyaret** demek ve şemada benzersizlik indeksi var: `(cafe_id, device_id_hash, business_date) WHERE is_qualified` — "1 nitelikli oturum / cihaz / kafe / gün" (docs/06 §5, S3).

**Nasıl bulundu:** Veritabanı, günün ikinci başarılı oyununda benzersizlik ihlali fırlattı. **Şema, kodun anlamadığı kuralı hatırlattı.**

**Düzeltme:** Nitelikli işaretlemesi artık günde bir kez, cihaz ve kafe başına. Sonraki oyunlar oynanıyor ve puan kazandırıyor ama ziyaret tekrar sayılmıyor.

### 3.3 · İki yarış koşulu 🟠

`device_id_hash` boş bırakılmıştı — **bütün oyuncular aynı cihaz sayılıyordu**; kafedeki ilk oyuncudan sonra kimse nitelikli oturum üretemezdi. Ayrıca günlük tavan okuma-yazma arası kilitsizdi: iki eşzamanlı bitiş "bugün 600" okuyup ikisi de 300 yazabilir, tavan aşılabilirdi.

**Düzeltme:** Oyun bitişi işlemin başında **oyuncu satırını kilitliyor** (`SELECT … FROM players … FOR UPDATE`). Aynı oyuncunun bitirmeleri sıraya giriyor; her iki yarış da kapanıyor. Cihaz kimliği yerine oyuncu kimliğinin hash'i kullanılıyor — gerçek cihaz parmak izi Faz 9'da gelecek.

---

## §4 · Uçtan uca doğrulama — gerçek tarayıcıda

Testler alan katmanını doğrudan çağırıyor; girdi kaydının **sunucu eylemi sınırından** doğru geçtiğini kanıtlamıyorlar. Bu yüzden akış tarayıcıda da oynandı:

| Ne yapıldı | Sonuç |
|---|---|
| Blok, 1. bölüm — tahta tıkandı | `server_score = 60`, `claimed_score = 60`, `is_qualified = false` |
| Kelime, 1. bölüm — 4/4 kelime | `server_score = 73` = iddia; **+300 puan**, **+50 XP** defterde |
| Profil ekranı | Seviye 1 · 50 XP · "sonraki seviyeye 50 XP" · İLK OYUN rozeti · iki oyunluk geçmiş |

Sunucunun bağımsız hesabı istemcininkiyle birebir tuttu. S5 gerçek HTTP yolunda kanıtlandı.

---

## §5 · Kelime listesi — kaynak ve lisans

Liste elle yazılmadı, üretildi: `scripts/kelime-listesi-uret.ts`.

| Kaynak | Lisans | Rolü |
|---|---|---|
| tdd-ai/hunspell-tr | **MPL-2.0** | Kelimelerin geldiği yer |
| hermitdave/FrequencyWords | MIT | Yalnızca süzgeç — "bu dizi gerçek metinde geçiyor mu?" |

75.909 kökten 5.000 kelime kaldı. Elenenler: uzunluk 28.382 · sözlükte yok 11.326 · çekimli 2.554 · yasaklı 45.

**Lisans sonucu:** çıktı dosyası MPL-2.0 (dosya düzeyinde copyleft), uygulama koduna dokunmuyor. Ayrıntı: `src/oyunlar/veri/LISANS.md`. Karar: Ü23.

TDK'dan bot ile kazınmış listeler **kullanılmadı** — TDK açık lisans vermiyor.

---

## §6 · Açık maddeler

| # | Konu | Nereye |
|---|---|---|
| ⚠️ | **Küfür süzgeci otomatik.** Hiçbir dilde otomatik süzgeç tam değildir; listenin bir insan tarafından gözden geçirilmesi gerekiyor. Ekran kafede görünür yerde. | Faz 10, canlı öncesi |
| ⚠️ | **Düşen-blok mekaniğinin hukuki sınırı.** Ad ve görsel dil bizim (Ü22), ama mekaniğin ne kadarının serbest olduğu avukata sorulmalı. | `08` §10, G6 |
| — | S15: bonuslu oyunu platform seçiyor ve her gün değişiyor. Kafenin seçmesi istenirse ayrı karar. | S15 |
| — | Kalan 7 oyun. Her aday S5 süzgecinden geçmeli. | S17 |
| — | XP miktarı (50) ve seviye eşikleri ilk kalibrasyon. Saha verisiyle ayarlanacak. | `06` §2.1 |
| ⚠️ | **G32 devrede:** platform girişinde ikinci faktör hâlâ yok. | Faz 10 |

---

## §7 · Faz 5 neyi kanıtladı

Motorun **takılabilir** olduğu iddiası, üç oyunun kasıtlı olarak farklı girdi biçimi üretmesiyle sınandı:

| Oyun | Girdi | Zaman |
|---|---|---|
| Blok | `(teklif, satır, sütun)` | yok |
| Kelime | gönderilen kelime | yok |
| Düşen | `(tick, hareket)` | **var** |

Tek bir girdi biçimine göre yazılmış bir motor "takılabilir" değildir. Üçü de aynı sözleşmeyle, aynı kabukla ve aynı doğrulama yoluyla çalışıyor; yeni oyun eklemek bir motor modülü, bir ekran bileşeni ve iki deftere birer satır demek.
