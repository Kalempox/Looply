# 12 — Yeni Kapsam: Davet, Ödül Tipleri, Kupon Kullanımı

**Kaynak:** `kaynak/03-davet-ve-fraud.txt` · `kaynak/04-kupon-kullanim-akisi.txt` · `kaynak/05-odul-tipleri.txt`
**Tarih:** 2026-08-24
**Durum:** ✅ **Karara bağlandı** (2026-08-24). Altı sorunun tamamı `02-karar-defteri.md`'ye Ü14–Ü20 olarak geçti. Bu dosya artık **arşiv**: çelişkilerin ne olduğunu ve nasıl çözüldüğünü saklıyor, bağlayıcı olan karar defteri.

---

## §1 · Ne geldi

### A · Davet (referral) sistemi

Kullanıcı benzersiz bir davet bağlantısı alıyor (`/r/8KX92A`), davet ettiği kişi zinciri tamamlayınca ödül kazanıyor.

**Davet durumları** — her biri kayıt altında, yönetici "bu davet neden ödül almadı" sorusunu cevaplayabiliyor:

```
CLICKED → REGISTERED → PHONE_VERIFIED → GAME_STARTED
        → GAME_COMPLETED → CAFE_VERIFIED → QUALIFIED → REWARDED
                                         ↘ REJECTED / EXPIRED
```

**Nitelikli davet (QUALIFIED) yedi şart:** telefon doğrulandı · yeni kullanıcı · davet bağlantısından geldi · oyunu gerçekten oynadı · tamamladı · asgari etkileşimi geçti · **kafe karekodu etkileşimi yaptı** · fraud kontrolünden geçti.

> **Önemli tasarım kararı:** telefon doğrulaması **tek başına** davet başarısı sayılmıyor. Sahte numarayla hesap üreten biri ödül alamıyor. Ödül ancak gerçek kafe etkileşimiyle geliyor.

**Fraud motoru** dört sinyal ailesi topluyor: kimlik · cihaz/oturum · ağ · davranış · davet deseni. Tek sinyal suçlu ilan etmiyor, **risk skoru** çıkarıyor.

> **Ayrım:** *Fraud davet ≠ fraud kullanıcı.* Şüpheli davet ödülü bekletilir/reddedilir ama kullanıcı platformdan atılmaz.

**İlk sürümde davet ödülü para değil**, XP/küçük ödül. Gerekçe: yeni kurulan davet sisteminde para değerli ödül fraud riskini gereksiz büyütür.

### B · Üç ödül tipi

Hepsinin ortak alanı: **Reward Value (TL)**.

| Tip | Örnek | Not |
|---|---|---|
| 🏆 Ürün ödülü | 1 Kahve · 80 TL | Kafenin kendi ürünü |
| 💰 Kafe bakiyesi | 50 TL | Kafede harcanabilir, kısmi ödeme yapılabilir |
| 🎟️ İndirim kuponu | %20 · **en fazla 100 TL** | Yüzde ama TL tavanlı |

**Ürün ödülü nakde çevrilemez:** 80 TL'lik kahve ödülü ≠ 80 TL nakit. Sistemde yalnızca *ekonomik değer* olarak tutulur.

**Nakit çekim v1'de YOK** — kaynak dokümanın kendisi ödeme mevzuatı, KYC/AML ve vergi yükümlülüklerini gerekçe gösteriyor. Doğru refleks.

**Kafe paneli ödül tanımlarken:** tip · ürün · TL değeri · günlük adet · kazanma koşulu (puan) · son kullanım süresi.

### C · Kupon kullanımı — QR ile

Oyuncu "Kuponumu Kullan" der, ekranda **QR** açılır. Kasiyer `/kasa` sayfasından kamerayı açıp okutur.

**Güvenlik kuralı:** QR'ın içinde ödül bilgisi **yok** — yalnızca tek kullanımlık rastgele bir jeton (`CP-X7K92...`). Gerçek ödül bilgisi sunucudan geliyor. Böylece oyuncu QR içeriğini değiştirip "100 TL yerine 1.000 TL" yapamıyor.

**Atomik kullanım:** iki telefon aynı anda okutursa kupon yalnızca bir kez kullanılabilmeli.

**Kasiyer kupon geçmişi:** *"Bugün 23 kupon: 8 kahve, 7 tatlı, 5 indirim, 3 diğer."*

---

## §2 · Mevcut kararlarla çelişenler — ✅ hepsi çözüldü

Aşağıdaki beş çelişki 2026-08-24'te karara bağlandı; her birinin altında verilen karar duruyor. Gerekçeler burada, bağlayıcı metin `02-karar-defteri.md`'de.

### Ç1 · Kupon kullanımı: kod mu, QR mı?

| | Mevcut karar (Ü9) | Yeni doküman |
|---|---|---|
| Yöntem | Kasiyer **6 haneli kodu** girer | Kasiyer **QR okutur** |

Ü9'u sen seçmiştin; alternatifi ("kasiyer müşterinin karekodunu okutur") o zaman da masadaydı ve *"loş kafede kamera yavaşlar"* diye elenmişti.

**Öneri: ikisi birden.** QR birincil (hızlı), kod yedek (kamera çalışmazsa, ışık kötüyse, ekran kırıksa). İkisi de aynı jetonu taşır, aynı atomik onaydan geçer. Ek maliyet küçük, saha dayanıklılığı büyük.

### Ç2 · XP geri mi geliyor?

Ü4 ile XP kaldırılmıştı (evde oynama hiçbir şey kazandırmadığı için işlevi kalmamıştı). Yeni doküman davet ödülü olarak **XP** veriyor, ayrıca dün gece seviye/rozet istenmişti (S18).

Üç istek de aynı şeye işaret ediyor: **harcanmayan bir ilerleme sayacı** gerekiyor. Puan harcanıyor, ilerleme sayacı olamaz.

**Öneri:** XP'yi geri getir — ama Ü3'e sadık kalarak **yalnızca kafede** kazanılsın. Böylece hem seviye, hem rozet, hem davet ödülü tek kavramla çözülür.

### Ç3 · Bütçe: günlük mü haftalık mı?

Ü6: **haftalık** taban 1.500 TL. Yeni doküman: **günlük** 1.500 TL bütçe.

Aradaki fark yedi kat. Ü6 senin kararındı, muhtemelen yeni doküman eski varsayımla yazılmış. **Ü6 geçerli sayılıyor**, aksini söylemezsen.

### Ç4 · Yüzde indirimler bütçenin içinde mi dışında mı?

Ü8: yüzde indirimler **bütçe dışı**, ürün bazlı, adet+süre limitli.
Yeni doküman: yüzde indirim **TL tavanlı** (`%20 · en fazla 100 TL`) ve bütçeye dahil.

TL tavanı olunca yüzde indirim bütçeye yazılabilir hâle geliyor — bu, Ü8'i gereksiz kılıyor ve muhasebeyi **basitleştiriyor**. Ü8, tavan olmadığı için bütçe dışına alınmıştı.

**Öneri: Ü8'i değiştir.** Yüzdeli ödüller TL tavanıyla bütçeye girsin; tavandan rezerve edilsin, kasada gerçekleşen tutar düşülsün, fark iade edilsin. Tek bir bütçe defteri kalır.

### Ç5 · Kafe bakiyesi — yeni ve ağır bir araç

"Kafe bakiyesi" (oyuncu 125 TL biriktirir, 200 TL'lik hesabın 125 TL'sini öder) mevcut modelde **yok**.

Bu bir **saklanan değer** aracı. Kupon tek seferlik ve kafeye bağlıyken, bakiye birikiyor ve kısmi harcanıyor. Getirdikleri:

- Kısmi kullanım → bakiye defteri, bakiye iadesi, kalan takibi
- Oyuncunun "param var" algısı → iade/itiraz talepleri
- Ödeme mevzuatı sınırına yaklaşma (kaynak dokümanın kendisi uyarıyor)

**Öneri: v1'de yok.** Ürün ödülü + TL tavanlı indirim kuponu, aynı ekonomik işi görüyor ve çok daha basit. Bakiye, pilot verisi görüldükten sonra tartışılsın.

---

## §3 · Verilen kararlar — 2026-08-24

| # | Soru | Karar | Nereye geçti |
|---|---|---|---|
| Ç1 | Kupon: kod, QR, yoksa ikisi birden? | **İkisi birden** — QR birincil, 6 haneli kod yedek; aynı jeton, aynı atomik onay | Ü19 |
| Ç2 | XP geri gelsin mi? | **Evet** — harcanmayan ilerleme sayacı, yalnızca kafede kazanılır | Ü14 |
| Ç3 | Bütçe haftalık mı günlük mü? | **Haftalık** — Ü6 aynen geçerli, yeni dokümanın "günlük" ifadesi geçersiz | Ü6 teyit |
| Ç4 | Yüzde indirimler bütçeye girsin mi? | **Evet** — TL tavanlı, tavandan rezerve, gerçekleşen düşülür, fark iade | Ü17 (Ü8 değişti) |
| Ç5 | Kafe bakiyesi v1'de olsun mu? | **Hayır** — saklanan değer aracı v1 dışı, pilot sonrası tartışılır | Ü18 |
| Ç6 | Davet sistemi hangi faza? | **Faz 9** — çekirdek döngü kapandıktan sonra; ilk sürümde ödülü XP | Ü20 |

Aynı turda `05-acik-sorular.md`'deki S18 (seviye) ve S19 (rozet) de kapandı → Ü15, Ü16.

---

## §4 · Doğrulanan kararlar

Yeni dokümanlar mevcut mimariyle **çelişmeyen**, aksine doğrulayan noktalar da içeriyor:

- **KVKK 2025/1072 ilke kararı** — SMS doğrulama kodu farklı amaçları tek işlemde birleştirmek için kullanılamaz. G7 zaten böyle: pazarlama izni ayrı kutu, ayrı rıza satırı. ✅
- **Skor doğrulama sunucuda** — "999.999 puan aldım" diyen tarayıcı ödül alamaz. S5 ve Faz 5 kapısı zaten bu. ✅
- **QR içinde ödül bilgisi yok** — yalnızca jeton. Mevcut masa karekodu tasarımı da böyle. ✅
- **Atomik kullanım** — iki eşzamanlı okutmada tek kullanım. E9 ve koşullu UPDATE zaten var. ✅
- **Uygulama gerekmez, PWA yeterli** — Ü12 ile aynı. ✅
- **Reward Ledger, kaynak alanıyla** (`GAME` / `REFERRAL` / `CAMPAIGN`) — "bu değer nereden geldi" sorusunu cevaplıyor. Mevcut `points_ledger` ve `budget_ledger`'a `source_type` eklenerek karşılanabilir. ✅
