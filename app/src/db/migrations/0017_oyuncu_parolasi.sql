-- 0017 · Oyuncu parolası ve "beni hatırla"
--
-- ── Neden parola eklendi ────────────────────────────────────
--
-- Ü1 kimliği telefon + SMS OTP olarak kurmuştu ve bu **değişmiyor**: numara
-- hâlâ doğrulanıyor, hesap hâlâ doğrulanmış numaraya bağlı. Parola bunun
-- yerine geçmiyor, **yanına** geliyor.
--
-- Gerekçesi ürün sahibinin isteği ve pratik bir gerçek: her girişte SMS
-- beklemek hem yavaş hem maliyetli (docs/07 §2.3 — OTP aynı zamanda bir
-- maliyet kapısı). Parolayla giriş, SMS'i ilk kayıt ve kurtarma anına
-- indiriyor.
--
-- ── Neden NULL olabiliyor ───────────────────────────────────
--
-- Parola **zorunlu değil**: mevcut hesapların parolası yok ve olmayacak.
-- SMS ile giriş yolu kapanmıyor; ikisi yan yana duruyor. Zorunlu kılmak,
-- bugün kayıtlı herkesi kilitlerdi.
--
-- ── Kurtarma yolu ───────────────────────────────────────────
--
-- "Şifremi unuttum" için ayrı bir akış YAZILMIYOR: numara zaten doğrulanmış
-- ve SMS ile giriş açık. Parolasını unutan SMS ile girer, isterse yeni
-- parola belirler. Ayrı bir sıfırlama jetonu, ayrı bir e-posta kanalı ve
-- ayrı bir saldırı yüzeyi doğmuyor.
--
-- ── Hash ────────────────────────────────────────────────────
--
-- `staff.pin_hash` ile aynı biçim: `scrypt$tuz$hash`. Aynı fonksiyonlar
-- kullanılıyor — ikinci bir hash uygulaması yazmak, iki uygulamanın
-- ayrışması demektir (Faz 7'de tohum betiğinin kendi PIN hash kopyası
-- yüzünden kasiyer hiç giriş yapamamıştı).
--
-- G23: yalnızca ekleme, ikisi de NULL kabul ediyor.

ALTER TABLE players ADD COLUMN password_hash text;
ALTER TABLE players ADD COLUMN password_set_at timestamptz;

COMMENT ON COLUMN players.password_hash IS
  'scrypt$tuz$hash — staff.pin_hash ile aynı biçim ve aynı fonksiyonlar. NULL: bu hesap yalnızca SMS ile giriyor.';

-- ═══════════════════════════════════════════════════════════
-- "Beni hatırla"
-- ═══════════════════════════════════════════════════════════
--
-- Oturum süresi zaten 90 gün (docs/07 §2.4). Kutu işaretlenmezse oturum
-- **kısa** olacak — ortak bir cihazda (kafenin tableti, arkadaşın telefonu)
-- giriş yapan kişi üç ay boyunca açık kalmamalı.
--
-- Süre `sessions.expires_at`te zaten tutuluyor; bu kolon yalnızca "kullanıcı
-- ne istedi" bilgisini saklıyor — oturum yenilenirken aynı tercih uygulansın
-- diye.

ALTER TABLE sessions ADD COLUMN remember_me boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN sessions.remember_me IS
  'Kullanıcı "beni hatırla" dedi mi. İşaretlenmezse oturum kısa; ortak cihazda üç ay açık kalmasın.';
