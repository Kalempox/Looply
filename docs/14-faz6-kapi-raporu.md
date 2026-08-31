# 14 — Faz 6 Güvenlik Kapısı Raporu

**Tarih:** 2026-08-25
**Sonuç:** ✅ Geçti — **157/157 test**, `npm run ci` temiz

Faz 6, kafenin **para değeri taahhüt ettiği** yer. Faz 5 değeri üretiyordu; burası o değerin sınırını koyuyor. Bu fazın tek gerçek sorusu şu — *kafe hiçbir senaryoda taahhüt ettiğinden fazlasını ödeyebilir mi?*

---

## §1 · Kapı şartları

| # | Şart | Sonuç |
|---|---|---|
| 1 | Her yazma işlemi denetim izine düşmeli | ✅ Bütçe, ürün, ödül ve kampanyanın tamamı; ayrı ayrı test |
| 2 | Bütçe alt sınırın altına indirilememeli | ✅ Kodda anlaşılır cümleyle, veritabanında kısıtla — **orantılı dönemde de** |
| 3 | Limitsiz yüzde kampanyası kaydedilememeli | ✅ Tavan, günlük adet ve süre; üçü de ayrı test |
| 4 | Başka kafenin ürünü veya kampanyası düzenlenememeli | ✅ Altı test: görme, düzenleme, başkasının ürünüyle kampanya açma |

**Ayrıca sınananlar:** E10 (bütçeyi aşan rezervasyon reddediliyor) · E11 (serbest kalan tutar yeniden dağıtılabiliyor) · E3 (defter append-only, uygulama rolü `UPDATE` edemiyor) · E6 (kanıt seviyesi tutardan hesaplanıyor) · E2 (anlık ödüle puan fiyatı yazılamıyor).

---

## §2 · Bütçe muhasebesi

Dört sayı ve hiçbiri kolon değil — hepsi `budget_ledger`'ın toplamı (E3):

| Sayı | Nereden |
|---|---|
| **Dağıtılabilir** | taahhüt − açık rezerve − harcanan |
| **Açık kuponlarda** | `reserve` − `commit` − `release` |
| **Kasada harcanan** | `commit` toplamı |
| **Bütçeye dönen** | `release` toplamı |

Kafenin bakması gereken tek sayı **dağıtılabilir**; diğer üçü onun nereden geldiğini açıklıyor.

**E10 iki katmanlı:** `rezerveEt` dağıtılabilir tutarı aşan isteği yazmadan reddediyor, ve taahhüt düşürülürken dağıtılmış kuponların altına inilemiyor. İkincisi olmasaydı kafe bütçeyi düşürüp negatife düşürebilirdi.

---

## §3 · Ü25 · Orantılı ilk dönem

Bütçe haftası **pazartesi** başlıyor — tüm kafeler aynı takvimde, raporlar karşılaştırılabilir. Kafe hafta ortasında katılırsa ilk dönem kısa oluyor ve **alt sınır da orantılı**: 5 günlük dönemde `5/7 × 1.500 = 1.072 TL`.

Bu, mevcut şema kısıtını **kırıyordu**: `committed_kurus >= 150000` orantılı ilk dönemi reddederdi ve kafe ya fazla taahhüt eder ya da sisteme giremezdi. Kısıt dönem uzunluğuna göre ölçeklendi:

```sql
CHECK (committed_kurus * 7 >= 150000 * (period_end - period_start))
```

Bölme yok — tamsayı aritmetiğinde yuvarlama tartışması bırakmıyor. Gevşetme olduğu için mevcut hiçbir satır ihlale düşmedi (G23).

---

## §4 · Ü26 · Yüzde indirim iki yerde

| | Katalogdaki yüzdeli ödül | Ürün kampanyası |
|---|---|---|
| Nasıl alınır | Oyuncu **puanıyla satın alır** | Kafe dağıtır, **puan istemez** |
| Kime hitap eder | Oyuncunun hedefi | Kafenin itmek istediği ürün (Ö4) |
| Tablo | `rewards` (`reward_type = 'percent'`) | `percentage_campaigns` |
| TL tavanı | `cost_kurus` | `max_discount_kurus` |

İkisinde de tavan zorunlu ve ikisi de bütçeden **tavan kadar** rezerve ediliyor (Ü17). Rezervasyon mantığı tek: her zaman `cost_kurus`.

**Şemada eksik olan neydi:** `rewards.kind` ödülün *nasıl* verildiğini söylüyordu ('instant'/'catalog'), *ne olduğunu* değil. `reward_type` ve `percent` kolonları eklendi; `odul_tipi_tutarli` kısıtı yarım tanımlı ödülü reddediyor — yüzdeli ödülün yüzdesi olmak zorunda, ürün ödülünün olmamak zorunda.

---

## §5 · Kanıt seviyesi kafenin seçimi değil

E6 ödül değerine göre kanıt istiyor: 1–15 TL → K2, 16–50 TL → K3, 51 TL+ → K4. Panelde bu alan **yok**; tutardan hesaplanıyor. Kafe seçebilseydi en pahalı ödülü en zayıf kanıtla verip fraud'a kapı açabilirdi.

Ekranda "K3" de yazmıyor — hiçbir kafe sahibine bir şey söylemez. Onun yerine düz cümle: *"Masada en az beş dakika kalmış oyunculara verilir."*

---

## §6 · Uçtan uca doğrulama — gerçek tarayıcıda

Kafe yöneticisi olarak giriş yapılıp panel baştan sona gezildi:

| Ne yapıldı | Sonuç |
|---|---|
| 800 TL bütçe denendi | ✅ Reddedildi: *"Haftalık bütçe en az 1.500 TL olmalı."* |
| 3.000 TL bütçe | ✅ Kaydedildi, dört sayı yansıdı |
| Var olan isimle ürün eklendi | ✅ Reddedildi: *"Bu isimde bir ürün zaten var."* |
| Katalog: %20 · en fazla 36 TL · 4.000 puan | ✅ Eklendi, kanıt seviyesi **otomatik K3** |
| Kampanya: 180 TL ürüne 500 TL tavan | ✅ Reddedildi: *"…en fazla 36 TL eder. Tavanı bunun üstüne koymak anlamsız."* |
| Kampanya: %20 · 36 TL · günde 20 · 7 gün | ✅ Taslak → yayına alındı, canlı sayaç `Bugün 0/20` |

Sonra **oyuncu tarafına** geçildi:

> `/firsatlar` → ÜRÜN İNDİRİMLERİ: Tiramisu %20 · 1 Eylül'e kadar
> ÖDÜL KATALOĞU: +1 shot espresso (puan istemez) · Tatlıda %20 indirim (4.000 puan) · Ücretsiz filtre kahve (6.000 puan)

**E9 korundu:** oyuncu ekranında yüzde ve puan fiyatı var, **TL tavanı yok**. 36 TL hiçbir oyuncu ekranında geçmiyor — değeri yalnızca kasa görecek (Faz 7).

---

## §7 · Açık maddeler

| # | Konu | Nereye |
|---|---|---|
| — | **S12:** anlık ödül birden fazlaysa hangisi düşecek? Katalog artık birden fazla anlık ödül tutabiliyor. | Faz 7 |
| — | **S15:** kafe kendi bonuslu oyununu seçebilmeli mi? Seçebilirse ×2 çarpanla bütçesini daha hızlı eritir — bütçe ekranıyla birlikte düşünülmeli. | Faz 6 sonrası |
| — | **S14:** platform geliri hâlâ ürün sahibinde. Faz 8'den (raporlar) önce netleşmeli. | Faz 8 |
| ⚠️ | Kelime listesinin küfür süzgeci insan gözünden geçmeli | Faz 10 |
| ⚠️ | Düşen-blok mekaniğinin hukuki sınırı avukata sorulmalı | G6 |
| ⚠️ | **G32:** platform girişinde ikinci faktör yok | Faz 10 |

---

## §8 · Faz 6 neyi kanıtladı

Kafe artık **kendi sözünü kendisi kuruyor**: bütçesini, menüsünü, ödüllerini ve kampanyalarını. Sistemin buradaki işi sözü kaydetmek değil, **sözün tutulabilir olduğunu garanti etmek** —

- Taahhüdün altına inilemiyor
- Taahhüdün üstü ödenemiyor (E10)
- Limitsiz veya tavansız hiçbir araç kaydedilemiyor
- Her karar denetim izinde

Bunların hiçbiri yalnızca kodda durmuyor; dördü de veritabanı kısıtıyla ikinci kez korunuyor. Kod hata yaparsa şema durduruyor.
