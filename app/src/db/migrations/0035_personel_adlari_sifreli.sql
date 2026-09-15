-- ═══════════════════════════════════════════════════════════
-- Ü115 · A1 · Personel ve yetkili adları şifreleniyor
-- ═══════════════════════════════════════════════════════════
--
-- ── Sorun ───────────────────────────────────────────────────
--
-- `docs/08` §2 sınıflandırma tablosu şunu diyor:
--
--     | Ad, soyad | K | Şifreli | ❌ | ❌ | 🔍 kayıtlı |
--
-- Oyuncu tarafında bu uygulanmıştı (`players.first_name_enc`). İşletme
-- tarafında **uygulanmamıştı** ve tutarsızlık aynı satırın içindeydi:
--
--     staff           → telefon şifreli,  ad DÜZ METİN
--     platform_users  → telefon şifreli,  ad DÜZ METİN
--     cafes           → telefon şifreli,  yetkili adı DÜZ METİN
--
-- Aynı kişinin numarası anahtarsız okunamıyor, adı okunabiliyordu.
-- Şemada da `docs/08`'de de bunun gerekçesi aranıp bulunamadı — karar
-- değil, gözden kaçmış bir eksiklik.
--
-- ── `legal_name` ve `address` neden burada ──────────────────
--
-- Şahıs şirketinde ticari unvan **kişinin kendi adıdır** ("Ayşe Yılmaz
-- Kahve"), kayıtlı adres de çoğu zaman ev adresidir. Başvuran işletmenin
-- tüzel mi şahıs mı olduğunu sistem bilmiyor ve bilemez; ikisini ayırmaya
-- çalışmak, yanlış tahminde kişisel veriyi açıkta bırakmak demekti.
-- İkisi de şifreleniyor.
--
-- ⚠️ `cafes.name` (işletme adı), `cafes.slug`, `cafes.city` ve
-- `cafes.lat/lng` DÜZ KALIYOR. Bunlar işletme verisi: vitrindeki tabela,
-- oyuncunun gördüğü kafe adı ve geofence koordinatı. `docs/24` §1.2 zaten
-- "kafe konumu kişisel veri değil" diyor. Şifrelemek yalnızca oyuncu
-- ekranlarını yavaşlatır, hiçbir şeyi korumazdı.
--
-- ── Neden veri adımı var ────────────────────────────────────
--
-- `PII_ENC_KEY` bilerek veritabanının dışında. Postgres'in elinde anahtar
-- yok, yani bu dönüşüm saf SQL ile yazılamıyor. `-- @veri-adimi` satırı,
-- eşlikçi `0035_personel_adlari_sifreli.ts` dosyasının **bu işlemin
-- içinde** çalışacağı yeri işaretliyor (bkz. `db/migrate.ts`).
-- ═══════════════════════════════════════════════════════════

-- ── 1. Şifreli kolonlar (önce boş) ──────────────────────────
ALTER TABLE staff          ADD COLUMN name_enc bytea;
ALTER TABLE platform_users ADD COLUMN name_enc bytea;

ALTER TABLE cafes
  ADD COLUMN contact_name_enc bytea,
  ADD COLUMN legal_name_enc   bytea,
  ADD COLUMN address_enc      bytea;

-- ── 2. Var olan satırlar uygulama anahtarıyla şifreleniyor ──
-- @veri-adimi

-- ── 3. Düz metin kalkıyor ───────────────────────────────────
--
-- NOT NULL, veri adımından SONRA veriliyor: önce verilseydi kolon eklenen
-- anda mevcut satırlar kısıtı ihlal ederdi. Sıra bir tercih değil zorunluluk.
ALTER TABLE staff          ALTER COLUMN name_enc SET NOT NULL;
ALTER TABLE platform_users ALTER COLUMN name_enc SET NOT NULL;

ALTER TABLE staff          DROP COLUMN name;
ALTER TABLE platform_users DROP COLUMN name;

ALTER TABLE cafes
  DROP COLUMN contact_name,
  DROP COLUMN legal_name,
  DROP COLUMN address;

-- ── 4. Kuralı şemaya yaz ────────────────────────────────────
COMMENT ON COLUMN staff.name_enc IS
  'Ü115: AES-256-GCM (docs/08 §2 — "Ad, soyad → Şifreli"). Ada göre sıralama SQL''de değil, çözüldükten sonra uygulamada yapılır.';

COMMENT ON COLUMN platform_users.name_enc IS
  'Ü115: AES-256-GCM. Platform çalışanı da bir gerçek kişidir.';

COMMENT ON COLUMN cafes.contact_name_enc IS
  'Ü115: AES-256-GCM. Yetkilinin telefonu baştan beri şifreliydi, adı değildi.';

COMMENT ON COLUMN cafes.legal_name_enc IS
  'Ü115: AES-256-GCM. Şahıs şirketinde ticari unvan kişinin kendi adıdır.';

COMMENT ON COLUMN cafes.address_enc IS
  'Ü115: AES-256-GCM. Şahıs şirketinde kayıtlı adres ev adresi olabilir. cafes.lat/lng ayrıdır ve düz kalır — o işletme verisi (docs/24 §1.2).';
