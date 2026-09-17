-- ═══════════════════════════════════════════════════════════
-- Ü170 · E-posta giden kutusu — doğrulama kodu artık buradan
-- ═══════════════════════════════════════════════════════════
--
-- Ürün sahibi: *"kod sms gelmeyecek ama kod gmaile gidecek."*
--
-- ── Neden AYRI tablo, neden sms_outbox'a eklenmedi ──────────
--
-- `sms_outbox`ın her satırı bir telefon numarasına ait:
-- `phone_masked` ve `phone_index` **NOT NULL**. E-posta satırlarını
-- oraya koymak için ikisini de gevşetmek gerekirdi ve o an tablo
-- "gönderilen mesajlar" diye bulanık bir şeye dönüşürdü — hangi
-- satırın hangi kanaldan gittiğini bir `channel` kolonundan okumak
-- zorunda kalırdık ve `NOT NULL` güvencesi iki kanalın hiçbirinde
-- kalmazdı.
--
-- Ayrıca G14 günlük tavanı `sms_outbox` üzerinden sayılıyor
-- (`status = 'sent'`, kayan 24 saat). E-posta satırları oraya
-- karışsaydı **SMS tavanını e-postalar doldururdu**; iki kanalın
-- maliyeti ve limitleri birbirinden tamamen farklı.
--
-- ── Düz metin adres YOK ─────────────────────────────────────
--
-- `sms_outbox`ın kalıbının aynısı: maskelenmiş görünüm + kör indeks.
-- Giden kutusu bir teslimat defteri, adres defteri değil. Sızması
-- hâlinde kimin ne zaman kod istediği görülür ama **adresler
-- okunamaz**.
--
-- ── Şablon listesi neden tek elemanlı ───────────────────────
--
-- Bugün e-postaya giden tek şey doğrulama kodu; öbür sekiz bildirim
-- SMS iskeletinde kalıyor (ürün sahibinin kararı). Liste kapalı
-- tutuldu ki yeni bir şablon eklemek **göç gerektirsin** — aynı kural
-- `sms_outbox`ta da var ve orada da kasıtlı.

CREATE TABLE email_outbox (
  id            text PRIMARY KEY,
  -- "b***@ornek.com" — insanın tanıyacağı kadar, kimsenin
  -- kullanamayacağı kadar.
  email_masked  text NOT NULL,
  -- HMAC (EMAIL_INDEX_KEY) — aynı adrese ne gittiğini saymak için.
  email_index   bytea NOT NULL,
  template      text NOT NULL CHECK (template IN ('otp')),
  provider      text NOT NULL,
  status        text NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'sent', 'failed', 'blocked')),
  block_reason  text,
  provider_ref  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz
);

-- Aynı adrese giden son kayıtlar — tekrar isteme sıklığını görmek için.
CREATE INDEX email_outbox_adres_idx ON email_outbox (email_index, created_at DESC);

-- Kayan pencerede sayım — ileride e-posta tarafına da bir tavan
-- konulursa bu indeks onu taşıyacak (SMS'te `sms_outbox_gunluk_idx`).
CREATE INDEX email_outbox_gunluk_idx ON email_outbox (created_at) WHERE status = 'sent';

ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_outbox FORCE ROW LEVEL SECURITY;

-- `sms_outbox` ile aynı: yalnızca bypass bağlamı görüyor. Bu tablo
-- hiçbir kiracıya ait değil, oyuncuya da gösterilmiyor.
CREATE POLICY bypass ON email_outbox
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

-- ⚠️ DELETE verilmiyor — giden kutusu append-only. Uygulama rolü
-- kendi teslimat izini silememeli (aynı kural `sms_outbox`ta da var).
GRANT SELECT, INSERT, UPDATE ON email_outbox TO cafeplay_app;
