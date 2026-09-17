-- ═══════════════════════════════════════════════════════════
-- Ü168 · Oyuncunun e-postası — doğrulama kodu buradan gidecek
-- ═══════════════════════════════════════════════════════════
--
-- Ürün sahibi: *"kullanıcılara sms göndermek yerine mail göndereceğiz
-- başlangıçta doğrulama kodunu, ondan dolayı başlangıçta mail de
-- istemeliyiz."*
--
-- Kararlar (ürün sahibine soruldu, 2026-09-17):
--   · telefon ve e-posta **ikisi de zorunlu**, giriş ikisiyle de
--   · e-postaya yalnızca **doğrulama kodu** gidiyor; öbür sekiz
--     bildirim SMS iskeletinde kalıyor
--
-- ── Neden iki kolon: şifreli alan + kör indeks ──────────────
--
-- Telefonun kalıbının aynısı (`docs/08 §5`) ve gerekçesi de aynı:
-- e-posta adresi **okunabilmeli** (kod oraya gidecek) ama
-- **aranabilmeli** de (giriş, tekillik). Tek kolon ikisini birden
-- yapamaz:
--
--   · `email_enc`   → AES-256-GCM, geri çevrilebilir, okumak için
--   · `email_index` → HMAC-SHA256, geri çevrilemez, aramak için
--
-- Anahtarları ayrı (`EMAIL_INDEX_KEY` ≠ `PII_ENC_KEY`): indeks
-- anahtarı sızarsa saldırgan elindeki adresin sistemde olup
-- olmadığını öğrenir ama **adresi okuyamaz**. Bu ayrım telefonda da
-- böyle ve gevşetilmedi.
--
-- ⚠️ Düz metin e-posta **hiçbir yerde durmuyor** — ne burada, ne
-- günlüklerde (`log-pii.test.ts` bunu sınıyor).
--
-- ── Neden NOT NULL değil ────────────────────────────────────
--
-- Ürün kuralı "zorunlu" ama şema kuralı değil ve bu bilinçli:
--
--   1. Tabloda **bugün e-postasız satırlar var** (tohum ve testlerin
--      açtığı oyuncular). NOT NULL, geri doldurulamayan bir alan için
--      göçü baştan düşürürdü — uydurma adres yazmak ise PII tablosuna
--      sahte veri koymak olurdu.
--   2. Zorunluluk bir **akış** kuralı: kayıt ekranı e-postasız hesap
--      açtırmıyor (`domain/player.ts`). Kural değişirse şema göçü
--      gerekmemeli.
--
-- Tekillik yine de korunuyor: aşağıdaki indeks **kısmi** — dolu olan
-- her adres benzersiz, boş olanlar birbirini engellemiyor.

ALTER TABLE players
  ADD COLUMN email_enc   bytea,
  ADD COLUMN email_index bytea;

-- Aynı adresle iki hesap açılamaz. `WHERE ... IS NOT NULL` olmasaydı
-- e-postasız ikinci oyuncu "aynı NULL" diye reddedilirdi (Postgres'te
-- NULL'lar eşit sayılmaz ama niyet açıkça yazılsın).
CREATE UNIQUE INDEX players_email_index_uq
  ON players (email_index)
  WHERE email_index IS NOT NULL;

-- İkisi birlikte yazılıyor ya da ikisi birden boş: yalnız `email_enc`
-- yazılmış bir satır okunabilir ama aranamaz olurdu ve giriş akışı
-- onu **yok** sayardı. Sessiz "hesabım kayboldu" arızası.
ALTER TABLE players
  ADD CONSTRAINT players_email_ikisi_birden
  CHECK ((email_enc IS NULL) = (email_index IS NULL));

COMMENT ON COLUMN players.email_enc IS
  'E-posta adresi — AES-256-GCM (PII_ENC_KEY). Doğrulama kodu buraya gidiyor.';
COMMENT ON COLUMN players.email_index IS
  'E-posta kör indeksi — HMAC (EMAIL_INDEX_KEY). Aramak için, çözülemez.';
