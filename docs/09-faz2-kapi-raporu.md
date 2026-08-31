# 09 — Faz 2 Güvenlik Kapısı Raporu

**Tarih:** 2026-08-23
**Sonuç:** ✅ Geçti

Faz 2'nin dört kapı şartı da karşılandı. Bu belge, iddiaların hangi testle kanıtlandığını kayda geçirir — sonradan "bunu doğrulamış mıydık" sorusu sorulmasın diye.

---

## Kapı şartları

| # | Şart | Sonuç |
|---|---|---|
| 1 | Çapraz kiracı erişim testi — her uç için "başkasının verisini iste" | ✅ 11 test |
| 2 | Log çıktısında kişisel veri taraması | ✅ 5 test, sıfır sızıntı |
| 3 | Yedekten geri yükleme **fiilen** yapılmış olmalı | ✅ Tatbikat başarılı |
| 4 | CI boru hattı bu testleri kendisi koşuyor | ✅ `.github/workflows/ci.yml` |

**Toplam: 25 test, 25 geçti, 0 başarısız.**

---

## Kanıtlanan iddialar

Aşağıdakilerin her biri artık beyan değil, çalıştırılabilir bir testin çıktısı.

### Kiracı izolasyonu

| İddia | Nasıl kanıtlandı |
|---|---|
| Kafe A, kafe B'nin masalarını göremiyor | Sorguda `cafe_id` süzgeci **yazılmadan** çalıştırıldı; yalnızca A'nın satırları döndü |
| Kafe A, B'nin kuponunu id'yle bile okuyamıyor | Kupon id'si doğrudan verildi, sıfır satır döndü |
| Kafe A, B adına satır yazamıyor | `INSERT` denendi, `WITH CHECK` politikası reddetti |
| Kafe oyuncunun kişisel verisine hiç erişemiyor | `players` tablosundan sıfır satır (G1) |
| Aynı oyuncunun kodu iki kafede farklı | İki kafedeki takma adlar karşılaştırıldı, farklı |
| Bağlam kurulmadan hiçbir satır dönmüyor | Oturum değişkeni olmadan sorgu → sıfır satır |

**Testler kısıtlı `cafeplay_app` rolüyle koşuyor.** Yönetici rolüyle koşsalardı süper kullanıcı RLS'yi atlar ve testler yalan söylerdi.

### Değiştirilemez defterler

| İddia | Nasıl kanıtlandı |
|---|---|
| Denetim izi güncellenemiyor | `UPDATE audit_log` → `permission denied` |
| Puan defteri güncellenemiyor | `UPDATE points_ledger` → `permission denied` |
| Bütçe defteri güncellenemiyor | `UPDATE budget_ledger` → `permission denied` |
| Kupon silinemiyor | `DELETE FROM coupons` → `permission denied` |

### İş kuralları veritabanı seviyesinde

| İddia | Nasıl kanıtlandı |
|---|---|
| Bütçe tabanın altına inemiyor (Ü6) | 1.000 TL'lik bütçe → `CHECK` kısıtı reddetti |
| Limitsiz kampanya kaydedilemiyor (Ü8) | `daily_limit = NULL` → `NOT NULL` reddetti |
| Kupon personel onayı olmadan kapanamıyor (A4) | `status='redeemed'` + boş personel → `CHECK` reddetti |

### Log koruması

| İddia | Nasıl kanıtlandı |
|---|---|
| Yasaklı alanlar loglanamıyor | 8 alan denendi, hepsi hata fırlattı |
| İç içe nesnelerde de yakalanıyor | 3 seviye derinlikte yasaklı alan yakalandı |
| Serbest metinde telefon maskeleniyor | 4 farklı yazım biçimi → `[telefon]` |
| Bayt dizileri içeriğiyle loglanmıyor | `[bayt:5]` olarak görünüyor |

---

## Yedekleme tatbikatı

```
1. Şifre çözülüyor…      ✓ 71.6 KB çözüldü — anahtar doğru
2. Tatbikat veritabanı…  ✓ cafeplay_tatbikat
3. Yedek geri yükleniyor ✓ yüklendi
4. Doğrulanıyor…
   ✓ cafes            2 satır
   ✓ players          1 satır
   ✓ cafe_tables     18 satır
   ✓ coupons          2 satır
   ✓ budget_periods   2 satır
5. Tatbikat veritabanı siliniyor ✓
```

Yedek **AES-256-GCM** ile şifreli ve anahtarı `PII_ENC_KEY`'den ayrı (G15). Saklama 30 gün; eski yedekler her alımda otomatik siliniyor.

> **Ayda bir tekrarlanmalı:** `npm run db:restore-drill`

---

## Çalışan uçlar

| Kontrol | Sonuç |
|---|---|
| Sağlık ucu `/api/saglik` | `200 {"durum":"iyi"}` — bilerek az bilgi döner |
| Güvenlik başlıkları | CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| Sunucu sürümü sızıntısı | `x-powered-by` yok |
| İstek kimliği | `x-request-id` her cevapta |
| CSRF koruması | Köken başlıksız `POST` → `403 kaynak_dogrulanamadi` |

---

## Kurulan sistem

| | |
|---|---|
| Göç | 5 |
| Tablo | 24 |
| RLS politikası | 47 |
| Tohum kafesi | 2 (izolasyon ancak "başkasının verisi" varken sınanabilir) |

---

## Faz 2'de verilen teknik kararlar

**`cafes` tablosu döngüye giremedi.** Kiracı anahtarı `cafe_id` değil `id` olduğu için RLS politikası elle yazıldı. Göç ilk denemede bu yüzden kırıldı; düzeltildi.

**Yedek betiklerinde `shell: true` kaldırıldı.** Node'un uyardığı gibi, kabuk üzerinden argüman geçirmek enjeksiyon yüzeyi açıyor. Argümanlar sabit olsa da alışkanlık haline gelmemeli.

**`schema_migrations` yetkisi eksik kalmıştı.** Göç çalıştırıcısı bu tabloyu, yetkileri veren `ALTER DEFAULT PRIVILEGES` satırından **önce** oluşturuyor; varsayılan yetkiler yalnızca sonradan oluşturulan tablolara işlediği için tablo yetkisiz kaldı. Sonuç: sistem durumu ekranı sessizce *"veritabanına bağlanılamadı"* gösterdi. `0005` göçüyle SELECT yetkisi verildi.

> **Bu hata nasıl gözden kaçtı:** Sağlık ucu ve güvenlik başlıkları doğrulandı, ama sayfanın **kendisi hiç açılıp okunmadı**. Uç nokta yalnızca `SELECT 1` çalıştırdığı için yeşil döndü; sayfanın dört sorgusundan biri patlıyordu. Ders: bir uç noktanın çalışması, o uca bağlı ekranın çalıştığı anlamına gelmiyor.

**İki yeni test eklendi.** Tek tabloyu düzeltmek yetmez; sorun sınıfı *"yeni tablo eklenir, yetkisi unutulur"*. Artık her tablo tek tek yoklanıyor ve append-only defterlerin yetki profili (`INSERT` var, `UPDATE`/`DELETE` yok) doğrudan `has_table_privilege` ile doğrulanıyor.

---

## Faz 3'e devredilen

- **Olay müdahale planı** — Faz 3 başlamadan yazılmalı (G17). Gerçek telefon numaraları o fazda giriyor
- **Acil durdurma ekranı** (G18) — Faz 3'te kimlik oluşunca anlamlı olur
- Alarm kuralları tanımlı ama bazıları henüz sıfır döner; ilgili tablolar Faz 3–7'de dolacak
- CI dosyası yazıldı, **henüz bir depoda koşmadı** (proje git deposu değil)
