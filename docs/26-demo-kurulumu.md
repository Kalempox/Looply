# 26 — DEMO KURULUMU (F3)

> **Amaç:** `demo.looplybusiness.com` üzerinde, canlıya benzeyen bir sürüm.
> Patron bir hafta test edecek. Satış yok, gerçek müşteri yok.
>
> Buradaki bütün komutlar geliştirme makinesinde **gerçekten koşturuldu**;
> yol boyunca çıkan dört arıza düzeltildi (en altta).

**Son güncelleme:** 2026-09-14

---

## Önce bilinmesi gerekenler

### 🔴 HTTPS zorunlu — tercih değil

Konum doğrulaması `navigator.geolocation` ile yapılıyor ve tarayıcılar bunu
**yalnızca güvenli bağlamda** çalıştırıyor. HTTPS yoksa:

- Oyuncu konumunu doğrulayamaz → **hiç kimse ödül kazanamaz**
- Kafe panelden konumunu işaretleyemez
- Karekod için kamera da aynı kapıya bağlı

Yani HTTP bir demo, çekirdek döngüsü kapalı bir demodur. Caddy sertifikayı
kendisi alıyor; sizin yapmanız gereken tek şey **DNS kaydını önceden
yaymak**.

### SMS yok — kod ekranda

`APP_ENV=staging` + `SMS_PROVIDER=console` ile doğrulama kodu **giriş
ekranında** görünüyor. Gerçek SMS sağlayıcısı (K2) beklenmiyor.

⚠️ **Bunun bedeli:** adresi bilen herkes istediği numarayla hesap açabilir.
Demo süresince adresi dar tutun. Gerçek müşteriye açılacaksa önce SMS
sağlayıcısı gelmeli.

Köşedeki geliştirme rozeti **kapalı** (yalnızca `APP_ENV=development`'ta
çıkıyor) — patron ürünü görüyor, iskeleyi değil.

### Veritabanı dışarı açılmıyor (K1)

`docker-compose.demo.yml` içinde `db` servisinin `ports:` satırı **yok**.
Veritabanı yalnızca kapların paylaştığı iç ağda görünüyor: dışarıdan
erişilecek port yok, kırılacak parola yok, taranacak yüzey yok.

`ports: - "5432:5432"` eklemek bu kararı sessizce geri alır. **Eklemeyin.**

---

## Sunucu gereksinimi

- Ubuntu 24.04 LTS · **2 vCPU / 4 GB RAM / 40 GB disk** · genel IPv4
- 4 GB istenmesinin sebebi Next derlemesi; 2 GB'da takılabilir
- Docker + Docker Compose kurulu
- **80 ve 443 dışarıdan erişilebilir** (sertifika bunun üzerinden alınıyor)
- DNS: `demo.looplybusiness.com` → sunucunun IP'si (A kaydı), **önceden yayılmış**

DNS yayılmadan başlarsanız Let's Encrypt sertifika vermez ve Caddy yeniden
dener; art arda denemeler hız sınırına takılabilir. Önce `dig` ile doğrulayın.

---

## Kurulum

### 1 · Dosyaları sunucuya al

```bash
git clone <depo-adresi> looply && cd looply/app
```

### 2 · Ortam dosyasını hazırla

```bash
cp .env.demo.ornek .env.demo
```

Anahtarları üret (geliştirme makinesinde de olur, çıktısını yapıştırın):

```bash
npm run keys:generate
```

⚠️ **Demo anahtarları geliştirme makinenizdekilerle AYNI OLMASIN.** Aynı
olursa demo veritabanının dökümü yerel anahtarlarla da çözülür.

Doldurulacaklar: `ALAN_ADI`, `ACME_EPOSTA`, `POSTGRES_PASSWORD`,
`DATABASE_URL` (aynı parola), `APP_DATABASE_URL` (ayrı parola), altı anahtar.

```bash
chmod 600 .env.demo
```

### 3 · Veritabanını başlat ve göçleri koş

```bash
docker compose --env-file .env.demo -f docker-compose.demo.yml up -d db
```

```bash
docker compose --env-file .env.demo -f docker-compose.demo.yml run --rm araclar npm run db:migrate
```

Beklenen son satır: `35 göç uygulandı.` — 0035 satırında `(+ veri adımı)`
yazmalı (Ü115'in ad şifreleme adımı).

### 4 · 🔴 Kısıtlı rolün parolasını ata

Göç `cafeplay_app` rolünü **geliştirme parolasıyla** açıyor. Bu adım
atlanırsa uygulama bağlanamaz.

```bash
docker compose --env-file .env.demo -f docker-compose.demo.yml exec -T db psql -U cafeplay_admin -d cafeplay -c "ALTER ROLE cafeplay_app LOGIN PASSWORD 'APP_DATABASE_URL_ICINDEKI_PAROLA';"
```

⚠️ **Buraya yönetici parolasını yazmayın.** Uygulama tablo sahibi rolle
bağlanırsa satır düzeyi güvenliği (RLS) devre dışı kalır ve kiracı
izolasyonunun ikinci katmanı yok olur — demo gerçeği göstermez.

### 5 · Tohum verisini kur

```bash
docker compose --env-file .env.demo -f docker-compose.demo.yml run --rm araclar npm run db:seed
```

İki kafe (Kafe A / Kafe B), bir oyuncu, ürün, ödül, kampanya ve karekodlar.
Çıktıda giriş numaraları yazıyor.

### 6 · Uygulamayı ve vekili başlat

```bash
docker compose --env-file .env.demo -f docker-compose.demo.yml up -d --build
```

İlk derleme birkaç dakika sürer. Caddy sertifikayı açılışta alır.

### 7 · Doğrula

```bash
curl -sI https://demo.looplybusiness.com/kafe/giris | head -3
```

`200` dönmeli ve sertifika geçerli olmalı.

---

## 🔴 Kurulum sonrası ilk iş: kafe konumu

**Girilmezse hiç kimse ödül kazanamaz.** Tohumdaki iki kafenin koordinatı
var ama patronun kuracağı kafede yok.

Panel → **Konum** → kafenin içinde "Konumu işaretle".

---

## Patron için ilk on dakika

Tohum verisi dolu ekranları göstermek, kurulum akışı ürünün gerçek ilk
gününü göstermek için. İkisi birlikte anlamlı.

**A · Dolu bir işletme neye benziyor** — `/kafe/giris` → `05320000001` →
kod ekranda → panel. Rapor, bütçe, ödüller, karekodlar gezilir.

**B · Kendi kafesini kurar** — `/kafe/basvuru` → başvuru → platform
girişiyle (`05310000001`) onay → panel → **konum** → ürün → ödül → karekod.

**C · Oyuncu tarafı** — telefondan karekodu okutur, oynar, ödül kazanır,
kasada kullanır. Kasa: `/kasa/giris`, PIN `1234` (önce panelden **cihaz
kaydı** gerekiyor — G11).

⚠️ Kasiyer PIN'i yalnızca **panelden kaydedilmiş cihazda** çalışır. Kayıt
yapılmadan kasaya girilemez.

---

## Bakım

**Logları izle**

```bash
docker compose --env-file .env.demo -f docker-compose.demo.yml logs -f uygulama
```

**Doğrulama kodunu logdan oku** (ekranda da görünüyor)

```bash
docker compose --env-file .env.demo -f docker-compose.demo.yml logs --tail=40 uygulama | grep "dogrulama kodunuz"
```

**Yeni sürüm çık**

```bash
git pull && docker compose --env-file .env.demo -f docker-compose.demo.yml up -d --build
```

**Demoyu tamamen kaldır** (⚠️ veri dahil)

```bash
docker compose --env-file .env.demo -f docker-compose.demo.yml down -v
```

---

## ⚠️ Bu demo neyi KAPSAMIYOR

Canlıya çıkış bunlarla tamam olmuyor — `docs/25-yayin-plani.md`:

| Eksik | Sonucu |
|---|---|
| **D1 · Şans mevzuatı görüşü** | 🔴 Gerçek müşteriye açılamaz |
| **Gerçek SMS (K2)** | Kod ekranda; adresi bilen herkes kayıt olabilir |
| Yedekleme ve geri dönüş tatbikatı (B4) | Veri kaybı riski — demo verisi feda edilebilir |
| A2 anahtar rotasyonu | Anahtar sızarsa döndürülemez |
| A4 CSP nonce · A5 platform TOTP | Bilinen açık maddeler |
| Bağımsız sızma testi (F2) | Yapılmadı |

---

## Kurulum sırasında bulunan dört arıza

Hepsi **yalnızca sıfırdan bir sunucuda** ortaya çıkan türdendi; geliştirme
makinesinde ne kadar denenirse denensin görünmüyorlardı.

### 1 · 🔴 Panel açılınca oturum kapanıyordu

`/cikis` bir GET route'u ve oturumu kapatıyor. Panelin menüsünde ve
oyuncunun ana ekranında ona `<Link>` ile bağlanılıyordu. Next, `<Link>`
hedeflerini **üretim derlemesinde** önceden getiriyor — kullanıcı paneli
açıyor, yarım saniye sonra giriş ekranına düşüyordu.

**`npm run dev` bunu göstermiyor**: geliştirme sunucusu ön getirme yapmıyor.
Arıza ilk sunucuya çıkışta ortaya çıkardı.

İki katman: bağlantılar sade `<a>` oldu **ve** route ön getirme isteklerini
yok sayıyor. Sınıf `tests/on-getirme.test.ts` ile kapatıldı — yan etkili bir
adrese `<Link>` ile bağlanmak artık testi kırıyor.

### 2 · Tohum sıfırdan bir veritabanında hiç çalışmıyordu

Göç 0020 (Ü45) bütçe dönemini haftalıktan güne çevirdi ve tabanı güne
bağladı. Tohum hâlâ 7 günlük aralığa 1.500 TL yazıyordu — 10.500 TL gereken
yere; `butce_tabani_gunluk` reddediyordu. Ayrıca `rewards` satırları Ü52
öncesinden kalmıştı (`kind='catalog'`, `points_price=6000`, aralık dışı
`cost_kurus`) ve `coupons.qr_token` hiç yazılmıyordu.

Görünmemesinin sebebi: eldeki geliştirme veritabanı 0020'den **önce**
tohumlanmıştı ve bir daha sıfırdan kurulmadı.

### 3 · `npm ci` Linux'ta reddediyordu

`package-lock.json` Windows'ta üretilmişti ve `sharp`'ın Linux/wasm
türevlerinin istediği `@emnapi/*` girdilerini taşımıyordu. Lockfile Linux
kabında yenilendi; her iki platformda da geçerli.

### 4 · Derleme ortam değişkeni istiyordu

Next, hata sayfasını (`/_not-found`) derleme sırasında önceden üretiyor ve
kök `layout.tsx`i render ediyor; o da `env()`e gidiyor. Kapta `.env.local`
olmadığı için derleme patlıyordu. Dockerfile'ın derleme katmanına **açıkça
sahte** değerler konuldu; bu değerler çalışan imaja taşınmıyor (ayrı `FROM`).

⚠️ Ayrıca `app/hemen/actions.ts` içinde modül seviyesinde `env()` çağıran
bir sabit vardı — fonksiyona çevrildi. Modül yüklenirken ortam değişkeni
okumak, ortamın hazır olmadığı her yerde patlar.
