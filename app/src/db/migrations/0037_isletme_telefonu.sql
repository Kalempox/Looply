-- ═══════════════════════════════════════════════════════════
-- Ü126 · Başvuru dört alana indi
-- ═══════════════════════════════════════════════════════════
--
-- Ürün sahibi: *"işletme başvurusunda işletme adı, insan adı soyadı,
-- telefon numarası ve cep telefonu gereksin sadece."* Şehir de kalıyor
-- (panelin başlığında ve platform listesinde görünüyor).
--
-- ── Kalkan alanlar ──────────────────────────────────────────
--
--   ticari unvan · vergi numarası · açık adres · vergi levhası belgesi
--
-- 🔴 **Kolonlar SİLİNMİYOR.** `legal_name_enc`, `tax_no_enc` ve
-- `address_enc` yerinde kalıyor: bugüne kadar başvurmuş kafelerin verisi
-- orada ve silmek geri alınamaz. Yeni başvurular bu kolonları boş
-- bırakıyor; okuyan her yer zaten `null` kaldırıyor (tipler `| null`).
--
-- ⚠️ **G5'in kanıt tabanı değişti.** Karar defteri G5'i *"sahte kafe
-- kaydı, sisteme kupon üretebilecek yeni bir taraf sokmanın en ucuz yolu"*
-- diye tanımlıyor ve elle onayın dayanağı vergi levhasıydı. Elle onay
-- duruyor, belge durmuyor — onaycının önünde artık yalnızca işletme adı,
-- şehir ve iki telefon var. Bu bilinçli bir gevşetme.
--
-- ── Neden ikinci telefon ────────────────────────────────────
--
-- `contact_phone_enc` yetkilinin **cebi** ve aynı zamanda panele giriş
-- kimliği — `staff.phone_index` ondan türüyor ve şube bağı da onun
-- üzerinden kuruluyor (0026, 0036). İşletmenin sabit hattı ayrı bir şey:
-- aranacak numara, giriş kimliği değil.
--
-- Aynı kolona yazılsaydı sabit hat `normalizePhone`'dan geçemezdi
-- (`telefonSemasi` cep şartı koşuyor) ve kafe sahibi sabit hattını
-- yazarsa giriş kimliği bozulurdu.

ALTER TABLE cafes ADD COLUMN business_phone_enc bytea;

COMMENT ON COLUMN cafes.business_phone_enc IS
  'Ü126: işletmenin aranacak telefonu (sabit hat olabilir). Giriş kimliği DEĞİL — o contact_phone_enc ve yetkilinin cebi olmak zorunda.';

COMMENT ON COLUMN cafes.legal_name_enc IS
  'Ü126 ile başvuruda sorulmuyor; eski kayıtlarda dolu. Yeni başvurularda NULL.';
COMMENT ON COLUMN cafes.tax_no_enc IS
  'Ü126 ile başvuruda sorulmuyor; eski kayıtlarda dolu. Yeni başvurularda NULL.';
COMMENT ON COLUMN cafes.address_enc IS
  'Ü126 ile başvuruda sorulmuyor; eski kayıtlarda dolu. Kafenin yeri onay sonrası konum ekranında koordinatla belirleniyor (K2) — asıl işi gören o.';
