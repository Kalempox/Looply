# 19 — Faz 9 · Davet ve fraud motoru kapı raporu

**Tarih:** 2026-08-27
**Sonuç:** ✅ Dört kapı şartı da geçti — **237/237 test**, `npm run ci` temiz
**Kapsam:** Faz 9'un **davet + fraud** bloğu. Kalan iki blok (7 oyun, masa
mekanikleri) yazılmadı — §7.

Faz 9 büyümenin fazı. Faz 7 döngüyü kapatmıştı, Faz 8 onu ölçülebilir yapmıştı;
burada döngü **kendini çoğaltıyor**. Ve tam da bu yüzden ilk kez sistemi
kandırmanın bir karşılığı var: davet ödülü, kimsenin kafeye gitmediği bir yerde
üretilebilseydi hem XP hem de raporlar anlamını yitirirdi.

---

## §1 · Kapı şartları

| # | Şart | Sonuç |
|---|---|---|
| 1 | Kendi kendini davet eden ödül alamamalı | ✅ Kaba hâli şemada (`referrals_kendini_davet`), incelikli hâli fraud motorunda — aynı cihaz + aynı ağ = 60 puan, eşiği geçiyor |
| 2 | Aynı cihaz/numara ikinci kez nitelikli davet üretememeli | ✅ Numara: `referrals_tek_davet` benzersizliği. Cihaz: `referrals_cihaz_tek_nitelik` kısmi benzersiz indeksi |
| 3 | Davet ödülü bütçeye veya puana dokunmamalı — yalnızca XP | ✅ Bütçenin üç sayısı da değişmiyor, puan defteri boş, `xp_ledger`'a tek satır: `source_type = REFERRAL` |
| 4 | Risk skoru ve reddetme gerekçesi denetim izine düşmeli | ✅ `referral.rejected` skoru ve sinyal adlarıyla; `referral.rewarded` de kayıtlı |

23 test yalnızca bu bloğa ait (`tests/davet-fraud.test.ts`).

---

## §2 · "Nitelikli davet" neye indirgendi

Kaynak doküman sekiz şart sayıyor. Kodda üçü **kurulum gereği** sağlanıyor:
davet yalnızca kayıt anında bağlanıyor, kayıt yalnızca OTP'den geçiyor, mevcut
hesap "yeni" sayılmıyor.

Ortadaki dördü — *oyunu oynadı · tamamladı · asgari etkileşimi geçti · kafe
karekodu etkileşimi yaptı* — tek bir şeye indi:

```
play_sessions.is_qualified
```

O bayrak zaten "kafeye yapılan sayılabilir ziyaret" demek: konumu doğrulanmış
(K2) masa oturumunda, başarıyla tamamlanmış, gün başına cihaz ve kafe bazında
tek (S3). Ayrı bir "asgari etkileşim" tanımı yazmak, aynı kuralın ikinci ve er
ya da geç ayrışacak bir kopyasını üretirdi.

Yan etkisi değerli: **davet, kafeye satılan birimle aynı dili konuşuyor.** Ü29
ile kafeye satılan şey nitelikli oyuncu; davet de ancak kafeye gerçek bir
müşteri getirdiyse sayılıyor. İki taraf aynı sayıya bakıyor.

---

## §3 · Fraud motorunun değişmez kuralı

Kaynak dokümanın açık şartı: *"Tek bir sinyal kullanıcıyı otomatik suçlu ilan
etmez."* Sebebi pratik — her sinyalin masum bir açıklaması var:

| Sinyal | Ağırlık | Masum açıklaması |
|---|---|---|
| Aynı IP | 30 | Karı koca, aynı evden |
| Aynı tarayıcı izi | 30 | Arkadaşına telefonunu uzatıp kaydettirmek |
| Tıklama davetçinin cihazından | 20 | Masada yan yana oturmak |
| Davet patlaması (24 saatte >4) | 25 | Gerçekten kalabalık bir masa |
| Karşılıklı davet | 40 | İki arkadaşın birbirini çağırması |
| Davetçi hesabı 24 saatten genç | 15 | Yeni ve hevesli kullanıcı |

**Eşik 60 ve en ağır tek sinyal 40.** Yani ret için en az iki bağımsız sinyal
gerekiyor. Bu bir yorum değil, **testte sınanan bir iddia**:

```
enAgirSinyal() < RET_ESIGI
```

Biri ağırlıkları kalibre ederken "aynı IP zaten yeterli" deyip 30'u 60 yaparsa
o test kırmızıya döner. Kural koda gömülü, yoruma bırakılmadı.

### Fraud davet ≠ fraud kullanıcı

Motorun verdiği tek karar davetin ödül alıp almayacağı. Reddedilen davetin
edileni normal oyuncu olarak kalıyor: hesabı kapanmıyor, puanı silinmiyor,
oynamaya devam ediyor. Test bunu açıkça sınıyor.

Gerekçe ticari olduğu kadar ahlaki: yanlış pozitif bir risk skoru yüzünden
gerçek müşteriyi kapıdan çevirmek, kaçırılan bir sahte davetten pahalıdır.

---

## §4 · Şema mı, skor mu — nerede hangisi

Ayrım bilinçli:

| Kural | Nerede | Neden |
|---|---|---|
| Aynı hesap kendini davet edemez | **Şema** (`CHECK`) | Bu bir yasak, yargı değil. Kod hatası bile üretemesin |
| Bir kişi bir kez davet edilir | **Şema** (`UNIQUE`) | Atıf tektir ve kalıcıdır |
| Aynı cihaz ikinci kez niteliklenemez | **Şema** (kısmi `UNIQUE`) | Kapı şartı; skorla değil kısıtla |
| "Bu davet şüpheli" | **Skor** | Yargı — kalibre edilebilir olmalı |

### Postgres dersi: kısıtı yakalamak yetmiyor

İlk uygulamada benzersizlik ihlali `try/catch` ile yakalanıp ret sebebi deftere
yazılıyordu. Çalışmadı: **Postgres'te işlem içinde patlayan bir sorgu işlemin
tamamını iptal ediyor**, `catch` bloğundaki `INSERT` de reddediliyor —
`current transaction is aborted`.

Çözüm, kısıtı kaldırmak değil **önceden sormak**: uygulama kontrolü sebebi
yazabilmek için, kısıt yarış koşulunda son sözü söylemek için. İkisi birden
duruyor. G12'nin ("uygulama süzgeci **ve** RLS") aynı desendeki karşılığı.

---

## §5 · Ödül: XP, niteliklenen kafede

Ü20 para değerli ödülü reddediyor, geriye XP kalıyor. Ama XP kafe bazında
(Ü15) — "hangi kafe" sorusu cevaplanmak zorundaydı.

**Karar: niteliklenmenin gerçekleştiği kafe.** Değer orada üretildi; davet
edenin o kafedeki durumu da orada yükseliyor. Alternatifler tutmadı: global XP
Ü15'i bozardı, davet edenin "kendi kafesi" tanımsız — çoğu oyuncunun tek
kafesi yok.

Davet eden **+100 XP**, davet edilen **+50 XP**. Sayılar kaynak dokümandan;
seviye eşikleri gibi onlar da kalibrasyon bekliyor (docs/06).

> ⚠️ Bu bir varsayım, ürün kararı değil. `docs/02` **Ü32** olarak ürün
> sahibinin onayına açık.

`xp_ledger`'ın `source_type` kümesinde `REFERRAL` Faz 5'ten beri ayrılmıştı
(0009 göçü) — bu faz oraya yeni bir yol açmadı, hazır olanı kullandı. Aynı
göçteki `xp_oyun_kafede` kısıtı yalnızca `GAME` satırlarına baktığı için davet
XP'si masada olmak zorunda değil; davet edenin o sırada kafede olması
beklenmiyor.

---

## §6 · Mahremiyet — davet bir izleme aracı değil

"Davetlerin" ekranında davet edilenlerin **adı, telefonu, anonim kodu yok**.
Davet eden yalnızca bir davetin hangi aşamada olduğunu görüyor: *Bağlantı
açıldı · Hesap açtı · Oyuna başladı · Tamamlandı*.

Aksi hâlde davet bağlantısı, tanıdığın birinin Looply'de ne yaptığını izleme
aracına dönerdi. G1'in kafe tarafındaki karşılığı neyse, bu da oyuncular
arasındaki karşılığı.

Şema da aynı yerde duruyor: `referrals` üzerindeki `owner` politikası yalnızca
**davet edene** okuma veriyor. Davet edilen kendi satırını görmüyor — "seni kim
davet etti" bilgisi onun ekranında işi olan bir şey değil ve göstermek iki
hesabı birbirine bağlardı.

---

## §7 · Tarayıcıda uçtan uca

| Adım | Sonuç |
|---|---|
| A `/davet` açtı | Kod `F7TB3N` üretildi, bağlantı ve sayaçlar göründü |
| A kendi bağlantısını açtı | Satır **açılmadı** — oturumu açık oyuncu davet edilemez |
| Oturum kapatıldı, `/r/F7TB3N` açıldı | `clicked` satırı + HttpOnly çerez |
| Kayıtlı numarayla kaydolundu | `rejected` · *"mevcut hesap — yeni kullanıcı değil"* |
| Yeni numarayla kaydolundu | `clicked → registered` |
| Olay defteri | Her geçiş gerekçesiyle yazılı |

Niteliklenme adımı tarayıcıda oynanmadı — konum izni gerektiriyor. O adım
alan katmanında 23 testle kapsanıyor: ödüllenme, ret, cihaz tekrarı, süre
dolumu, geriye gidiş.

---

## §8 · Faz 9'un kalanı

Bu rapor Faz 9'un **bir bloğunu** kapatıyor. Plandaki diğer ikisi duruyor:

| Blok | Durum |
|---|---|
| Davet sistemi + fraud motoru (Ü20) | ✅ bitti — bu rapor |
| Kalan 7 oyun | ⬜ **S17 kararı bekliyor** → aday liste `18-oyun-adaylari.md` |
| Masa mekanikleri (Ö1–Ö4) | ⬜ yazılmadı |

Faz 9'un güvenlik kapısındaki dört şartın dördü de davet bloğuna ait olduğu
için kapı bu blokla birlikte geçildi. Kalan iki bloğun kendi kapı şartı yok;
oyunlar Faz 5'in motor sözleşmesine, masa mekanikleri Faz 6–7'nin bütçe ve
kupon kurallarına tabi.

---

## §9 · Açık maddeler

| # | Konu | Nereye |
|---|---|---|
| ⚠️ | **Ü32 onaylanmadı:** davet XP'si niteliklenen kafeye yazılıyor — varsayım | Ürün sahibi |
| — | Davet XP miktarları (100/50) kalibre edilmedi; seviye eşikleriyle aynı kovada | Pilot sonrası |
| — | Fraud ağırlıkları **gerçek veriyle** kalibre edilmedi. Bugünkü değerler makul tahmin; pilotta yanlış pozitif oranı ölçülmeli | Faz 10 pilot |
| — | Cihaz sinyali bugün tarayıcı `user-agent` hash'i. Gerçek cihaz parmak izi yok — aynı telefon farklı tarayıcıda ayrı görünür | Faz 10 |
| — | `play_sessions.device_id_hash` hâlâ oyuncu kimliğinin vekili; "1 nitelikli / cihaz / gün" kuralı pratikte "1 / oyuncu / gün" | Faz 10 |
| ⚠️ | Tick tabanlı oyunlarda ağır çekim oynama sinyali (oturum süresi ↔ tick sayısı) fraud motoruna **eklenmedi** — bugün böyle bir oyun yalnızca "Düşen" | Yeni tick oyunu eklenirse |
| — | Davet bakımı köprüde (`domain/bakim.ts`); gerçek zamanlanmış iş yok | Faz 10 |
