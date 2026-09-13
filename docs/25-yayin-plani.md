# 25 — YAYIN PLANI

> **Karar:** demo aşaması kapandı. Ürün doğrudan canlıya, profesyonel
> biçimde çıkacak. Öncelik sırası: **güvenlik → altyapı → mesajlaşma →
> hukuk → kalan ürün işleri.**

**Son güncelleme:** 2026-09-14 · **Durum:** A0 ✅ bitti — A1 sırada

---

## Nerede duruyoruz

Ürünün **döngüsü tamamlandı.** Dalga 1–3 kapandı; oyuncu tarafı, kafe
paneli, kupon ekonomisi, bütçe, raporlar, happy hour, karekodlar, oyun
yönetimi ve çark olasılıkları çalışıyor. 566 test geçiyor.

Kalan iş **özellik değil, üretime hazırlık.** Bu plan onu sıralıyor.

---

## ⚠️ Bu planı şekillendiren bir desen

Bu kod tabanında **dört kez** aynı arıza çıktı: bir iş yazıldı, hiçbir
yerden çağrılmadı, ve kimse fark etmedi.

| Ne | Nasıl bulundu |
|---|---|
| Kampanya kuponu üretimi | Ü82 — 403 ödül kuponuna karşı 0 kampanya kuponu |
| `bekleyenleriAc` / `sureDolanlariSupur` | Bakım köprüsü bunun için doğdu |
| `silmeleriUygula` (hesap silme) | Ü111 — KVKK envanteri çıkarılırken |
| `alarm.degerlendir` (saldırı alarmı) | Bu plan yazılırken |

Dördü de aynı imzayı taşıyor: **test fonksiyonu sınıyordu, bağlantıyı
sınamıyordu.** Sonuncusu özellikle kötü çünkü alarm dosyasının kendi
yorumu şunu diyor: *"Saldırı altında olduğumuzu fark etmek, saldırıyı
engellemek kadar önemli. Engelleme sessizce çalışır; kimse bakmazsa
saldırının sürdüğü anlaşılmaz."*

**A0 bu sınıfı kapatıyor** ve plandaki ilk iş o.

---

## 0 · Karar bekleyenler

Bunlar bende iş açmıyor ama yönü belirliyor.

| # | Karar | Durum | Neyi bekletiyor |
|---|---|---|---|
| K1 | Uygulama ve veritabanı **aynı sunucuda mı**, ayrı mı? | ⏳ | A3 (DB bağlantı TLS) |
| K2 | SMS sağlayıcısı: Netgsm mi, İletimerkezi mi? | ⏳ | C1, gönderici başlığı |
| K3 | Barındırma sağlayıcısı (Türkiye) | ⏳ | B1 |
| K4 | Tüzel kişi tam unvanı, vergi no, adres | ⏳ | D2 |
| ✅ | WhatsApp Business API kullanılacak | **Verildi** | C2, D3 |
| ✅ | Barındırma Türkiye | **Verildi** | — |
| ✅ | Kapsam yalnızca Türkiye (GDPR yok) | **Verildi** | — |

---

## A · Güvenlik sertleştirme — *bende*

| # | İş | Neden | Boyut |
|---|---|---|---|
| **A0** ✅ | **"Yazıldı ama bağlanmadı" sınıfını kapat** — Ü113 | Dört kez oldu. Arka plan işlerinin bir kaydı olacak ve her birinin çağıranı olduğu sınanacak. Alarm da bu turda köprüye bağlanacak. | S |
| **A1** | **Personel / yetkili adlarını şifrele** | Oyuncunun adı şifreli, personelinki **düz metin** — belgelenmiş gerekçesi yok. `staff.name`, `platform_users.name`, `cafes.contact_name`, `cafes.legal_name`, `cafes.address`. Şahıs şirketinde `legal_name` bir kişi adı, adres ev adresi. | M |
| **A2** | **Anahtar rotasyonu** | `docs/08` §5.3 rotasyonu anlatıyor, kodda yok: `KEY_VERSION = 1` sabit ve farklı sürüm **hata fırlatıyor**. Anahtar sızarsa döndüremiyoruz. | M |
| **A3** | **DB bağlantısında TLS** | `db/pool.ts` içinde `ssl` ayarı yok. Ayrı sunucudaysa ad-soyad ve telefon **ağdan şifresiz** geçer. → K1'e bağlı | S |
| **A4** | **CSP nonce'a geçiş** | Bugün `script-src` içinde `'unsafe-inline' 'unsafe-eval'` var; bu hâliyle CSP XSS'e karşı neredeyse hiçbir şey yapmıyor. Kodun kendi yorumu zaten "Faz 4'te nonce'a geçilecek" diyor. | M |
| **A5** | **G32 · Platform girişinde TOTP** | Platform yöneticisi **bütün kafelerin** verisine erişiyor ve tek koruma SMS. Oyuncu tarafında SIM swap'e karşı koruma yazdık (G16), platform tarafında yazmadık. | M |

---

## B · Altyapı — *ben + siz*

| # | İş | Not |
|---|---|---|
| **B1** | Canlı Postgres kurulumu | Kısıtlı `cafeplay_app` rolü (RLS buna dayanıyor), `pg_hba` kilidi, WAL arşivi + PITR, otomatik yedek zamanlaması. → K3'e bağlı |
| **B2** | Anahtar üretimi ve kasa | `npm run keys:generate` — altı anahtar. `BACKUP_ENC_KEY` **ayrı yerde** durmalı |
| **B3** | Ters vekil + TLS | Alan adı hazır: `looplybusiness.com` |
| **B4** | **Yedekten geri dönüş tatbikatı** | Betik var (`db:restore-drill`), hiç gerçek koşulmadı. "Yedekten dönebiliyoruz" ancak bir kez gerçekten dönülünce doğru |
| **B5** | Alarm hattı | A0'da köprüye bağlanacak; **nereye** düşeceği burada kurulur (e-posta/WhatsApp) |
| **B6** | Kafe konumlarının girilmesi | Girilmezse K2 düşer, **kimse ödül kazanamaz** |

---

## C · Mesajlaşma

| # | İş | Not |
|---|---|---|
| **C1** | SMS sağlayıcı entegrasyonu + gönderici başlığı | Arayüz hazır (`SmsSaglayici`), Netgsm sınıfı boş. Başlık onayı operatörde birkaç iş günü → K2'ye bağlı |
| **C2** | **WhatsApp Business API** | Aynı arayüzün arkasına takılacak. ⚠️ Şablon onayı Meta'da; 24 saat penceresi ve opt-in kuralları SMS'ten farklı |
| **C3** | **İYS entegrasyonu** | ⚠️ **Ticari ileti göndermek için Türkiye'de zorunlu.** Bugün yalnızca hizmet bildirimi gönderiyoruz (kupon açıldı/doluyor) ve onlar kapsam dışı — ama "direkt mesaj" başladığı an zorunlu. Kodda yalnızca `TODO(Faz 10)` var |

### ⚠️ WhatsApp'ın KVKK sonucu

Barındırmayı Türkiye seçtiniz ve **KVKK md. 9 tamamen devre dışı
kalmıştı** — belgenin en riskli bölümü boştu.

WhatsApp Business API ile telefon numaraları **Meta'ya** gidiyor. Meta bir
alt işlemci oluyor ve **md. 9 geri geliyor.** Türk bir BSP üzerinden
alınsa bile veri Meta altyapısına akıyor.

Bu, kararın yanlış olduğu anlamına gelmiyor — WhatsApp Türkiye'de SMS'ten
çok daha etkili bir kanal. Ama bedeli **bilinçli ödenmeli**: veri
envanterine alt işlemci olarak eklenecek, açık rıza metni değişecek,
avukata md. 9 mekanizması sorulacak (D3).

---

## D · Hukuk — *sizde*

| # | İş | Not |
|---|---|---|
| **D1** | **S7 · Şans mevzuatı görüşü** | 🔴 **Tek başına canlıya çıkışı durduruyor.** Şans, Ü77'den beri ödül motorunun merkezinde; Ü110 ile kafe **kendi olasılıklarını** da yazıyor |
| **D2** | **S20 · Aydınlatma metni incelemesi** | Hazırlık bitti: `docs/24-veri-envanteri.md`. Tüzel kişi tam unvanı eksik (K4) |
| **D3** | WhatsApp → md. 9 mekanizması | Açık rıza mı, taahhütname mi? D2 ile aynı görüşmede |
| **D4** | S6/H2 · Ad-soyad-telefon hukuki sebebi | D2 ile birlikte |

⚠️ **D1, D2 ve D3 aynı randevuda sorulmalı.** Üçü de aynı avukatın
bakacağı şeyler; ayrı ayrı gitmek hem zaman hem para kaybı.

---

## E · Kalan ürün işleri — *bende*

Hiçbiri canlıya çıkışı bloke etmiyor.

| # | İş | Not |
|---|---|---|
| **E1** | 6c · Gece yarısı sınırı | **Dört yerde** bindiriyor: çalışma saatleri, kupon penceresi, happy hour, görev. 02:00'de kapanan kafe hiçbirini doğru kullanamıyor |
| **E2** | 36 · `/verilerim`e ad-soyad düzeltme | Aydınlatma metni şimdilik "e-posta ile" diyor; doğrusu ürünü düzeltmek |
| **E3** | 37 · `sms_outbox` saklama süresi | Temizlik işi yok, süresiz birikiyor. Öneri **12 ay** |
| **E4** | 7b · Blok/Düşen ödül bloğu | İsteğe bağlı |

---

## F · Çıkış

| # | Adım | Not |
|---|---|---|
| **F1** | Saldırı denemesi — ben | Yetki sınırları, kiracı izolasyonu, para yolu, oturum. ⚠️ Yapısal sınırı var: bu kodu ben yazdım, kör noktalarını da paylaşıyorum |
| **F2** | **Bağımsız sızma testi** | F1'in yerine geçmez, tamamlar |
| **F3** | `APP_ENV=staging` ile sunucuya çıkış | SMS beklemeden yapılabilir |
| **F4** | Pilot kafe | Tohum verisi silinir, panel Ü80'in kuralına döner |
| **F5** | Yayın | — |

---

## Sıra

```
ŞİMDİ ──► A0 ──► A1 ──► A2 ──► A4 ──► A5 ──► E1,E2,E3
                                 │
K1 ──────────────► A3 ───────────┤
K3 ──────► B1,B2,B3,B4,B6 ───────┤
K2 ──────► C1 ───────────────────┤
           C2,C3 ────────────────┤
                                 ▼
                            F1 ──► F3 ──► F4 ──► F5
                                          ▲
D1,D2,D3 (paralel, sizde) ────────────────┘
```

**A0–A2, A4, A5 ve E hiçbir karara bağlı değil — bugün başlayabilirim.**
A3, B ve C blokları K1–K3 kararlarını bekliyor. D bloğu sizde ve paralel
ilerliyor; **D1 olmadan F5 olmaz.**

---

## Bu plan nasıl güncellenecek

Her iş bitince kutusu `docs/23-yapilacaklar.md`'de işaretlenir ve karar
defterine (`02`) girer — projenin baştan beri işleyen kuralı. Bu belge
yalnızca **sırayı** tutuyor; ayrıntı oraya yazılıyor.
