-- ═══════════════════════════════════════════════════════════
-- Ü108 · Karekod türleri  ·  Ü109 · Kafe oyun yönetimi
-- ═══════════════════════════════════════════════════════════
--
-- Dalga 3'ün 13. maddesi iki iş: kafenin masa dışında da karekod
-- basabilmesi, ve hangi oyunların açık olacağını seçebilmesi.

-- ── 1 · Karekod türleri ────────────────────────────────────
--
-- Bugüne kadar tek giriş kapısı vardı: masaya yapıştırılan karekod.
-- Kafenin gerçek hayatta karekod koyacağı başka yerler de var — kasa
-- önü, menü, fiş.
--
-- ⚠️ **Ayrı tablo açılmadı, `cafe_tables`a tür eklendi.** Kasa karekodu
-- ile masa karekodu aynı şeyi yapıyor: okutulunca oturum açıyor, kanıt
-- topluyor, oyun oturumuna bağlanıyor. Ayrı tabloya koysaydık
-- `play_sessions.table_id`, `table_sessions.table_id`, raporlar ve masa
-- kullanım ekranı ikinci bir yol öğrenmek zorunda kalırdı — ve o ikinci
-- yol er ya da geç birincisinden ayrışırdı (Ü35'in "iki yol aynı koddan
-- geçmeli" gerekçesi).
--
-- ⚠️ **FİŞ KAREKODU BİR SATIN ALMA KANITI DEĞİLDİR.**
--
-- E6'nın K4 kademesi ("fiş / adisyon kodu", ×2 çarpan, 51 TL+ ödül)
-- **bu değil.** Buradaki fiş karekodu, kafenin fişine bastırdığı sabit
-- bir koddur; fotoğrafı paylaşılabilir ve hiçbir satın almayı kanıtlamaz.
-- Bir dağıtım kanalı — "müşteri fişi alırken bizi görsün" — o kadar.
--
-- K4 hâlâ hiçbir yerden verilmiyor ve verilmemeli: gerçek bir adisyon
-- kanıtı ya POS entegrasyonu ya da kasiyerin tek kullanımlık ürettiği bir
-- kod ister. Bugün ödül aralığı 25–50 TL (Ü52), yani 51 TL+ kademesi
-- zaten aralık dışı ve K4'ün boş kalması **bilinen ve zararsız**.
-- Sabit bir karekoda K4 vermek, ×2 çarpanı ve en üst ödül kademesini
-- kodu fotoğraflayan herkese açmak olurdu.

ALTER TABLE cafe_tables ADD COLUMN kind text NOT NULL DEFAULT 'masa'
  CHECK (kind IN ('masa', 'kasa', 'menu', 'fis'));

COMMENT ON COLUMN cafe_tables.kind IS
  'Ü108: karekodun nereye asıldığı. masa | kasa | menu | fis. Hiçbiri K4 (satın alma kanıtı) vermez.';

-- Masa dışı noktalar sıralamada masaların ARDINDAN gelsin diye ayrı
-- indeks yok: `sort_order` zaten var ve panel türe göre gruplayarak
-- gösteriyor.

-- ── 2 · Kafe oyun yönetimi ─────────────────────────────────
--
-- Kafe hangi oyunların açık olacağını seçebiliyor. Tablo **kapalı**
-- oyunları tutuyor, açıkları değil.
--
-- ⚠️ **Satırın yokluğu = oyun açık.** Tersi olsaydı (açıkları listeleyen
-- tablo) yeni bir oyun eklendiğinde **hiçbir kafede görünmezdi** ve her
-- kafenin panele girip onu açması gerekirdi. Oyun eklemek "dosya eklemek"
-- olarak tasarlandı (Faz 5); kayıt defterine satır eklemenin 500 kafeye
-- iş çıkarması bu tasarımı bozardı.
--
-- ⚠️ **Oyun yeniden açılırken satır SİLİNMİYOR, `closed` false oluyor.**
-- 0001'in kuralı: *"Silme yetkisi bilerek verilmiyor: hiçbir kayıt
-- uygulama tarafından silinmez, durum değişikliğiyle işaretlenir."*
-- Uygulama rolünün bu tabloda da DELETE yetkisi yok; kural bu tablo için
-- gevşetilmiyor.

CREATE TABLE cafe_game_settings (
  cafe_id    text NOT NULL REFERENCES cafes(id),

  -- FK YOK ve olamaz: oyunlar veritabanında değil, kodda yaşıyor
  -- (`src/oyunlar/index.ts`). Kayıt defterinden kalkan bir oyunun burada
  -- artık satırı olması zararsız — okuma tarafı yalnızca defterdeki
  -- oyunları süzüyor.
  game_id    text NOT NULL,

  closed     boolean NOT NULL DEFAULT true,

  updated_by text NOT NULL REFERENCES staff(id),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (cafe_id, game_id)
);

COMMENT ON TABLE cafe_game_settings IS
  'Ü109: kafenin oyun tercihleri. Satırı olmayan oyun AÇIKTIR — yeni oyun her kafede kendiliğinden görünsün diye. Kapatma silme değil, closed=true.';

ALTER TABLE cafe_game_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_game_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON cafe_game_settings
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON cafe_game_settings
  USING (cafe_id = current_setting('app.cafe_id', true))
  WITH CHECK (cafe_id = current_setting('app.cafe_id', true));
