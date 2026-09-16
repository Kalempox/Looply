-- ═══════════════════════════════════════════════════════════
-- Ü147 · İlmek — oyuncunun avatarı ve özelleştirmesi
-- ═══════════════════════════════════════════════════════════
--
-- Ürün sahibi: *"tatlı ve cana yakın olması, insanların hoşuna gitmesi
-- önemli; ve renk vb. şekilde özelleştirilebilmeli, basit şekillerde."*
--
-- ── Neden iki kolon, neden jsonb değil ──────────────────────
--
-- Seçenekler **kapalı iki liste**: altı renk, dört aksesuar. `jsonb`
-- olsaydı şema hiçbir şeyi doğrulamaz, arayüzde bir yazım hatası
-- veritabanına "mavu" diye bir renk yazar ve ekran sessizce
-- varsayılana düşerdi. İki `text` kolon + CHECK, aynı işi yapıp yanlış
-- değeri **doğduğu anda** reddediyor.
--
-- Aynı gerekçe `product_categories.kind` ve `xp_ledger.source_type`
-- için de geçerliydi (0022, 0009): bu şemada kapalı listeler kısıtla
-- tutuluyor.
--
-- ⚠️ Yeni bir renk eklemek **göç gerektiriyor** ve bu bilinçli: renk
-- listesi arayüzde `AVATAR_RENKLERI` ile de yazılı, ikisi ayrışırsa
-- oyuncu seçebildiği bir rengi kaydedemez. Kısıt, o ayrışmayı sessiz
-- bir hata olmaktan çıkarıp görünür bir göç işine çeviriyor.
--
-- ── Varsayılan NULL değil ───────────────────────────────────
--
-- Her oyuncunun bir avatarı var; "avatarı yok" diye bir hâl yok.
-- NULL bırakılsaydı okuyan her yer varsayılanı ayrıca hesaplamak
-- zorunda kalırdı ve biri unuturdu.
--
-- ── 🔴 Kişisel veri DEĞİL, o yüzden şifrelenmiyor ───────────
--
-- `players` tablosundaki ad, soyad ve telefon şifreli (docs/08).
-- Avatar seçimi kişiyi tanımlamıyor: "gök rengi, bereli" milyonlarca
-- kişi için doğru. Şifrelenseydi kafe panelinde avatar gösterebilmek
-- için her satırda çözme maliyeti doğardı ve karşılığında hiçbir şey
-- korunmuş olmazdı.

ALTER TABLE players
  ADD COLUMN avatar_renk text NOT NULL DEFAULT 'gok'
    CHECK (avatar_renk IN ('gok', 'menekse', 'pembe', 'amber', 'yesil', 'buz'));

ALTER TABLE players
  ADD COLUMN avatar_aksesuar text NOT NULL DEFAULT 'yok'
    CHECK (avatar_aksesuar IN ('yok', 'bere', 'gozluk', 'fular'));

COMMENT ON COLUMN players.avatar_renk IS
  'Ü147: İlmek''in rengi. Kapalı liste — arayüzdeki AVATAR_RENKLERI ile aynı kalmalı. Kişisel veri değil, şifrelenmiyor.';

COMMENT ON COLUMN players.avatar_aksesuar IS
  'Ü147: İlmek''in aksesuarı. Kapalı liste — arayüzdeki AVATAR_AKSESUARLARI ile aynı kalmalı.';
