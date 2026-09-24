-- 0056 · Güne özel bütçe — Ü287
--
-- Ürün sahibi: *"her gün her gün bütçe belirlemek zorunda kalmasın; tüm
-- hafta için bütçe belirleme olsun, otomatik. O günü özel olarak
-- değiştirebilsin ya da tüm günlerin bütçesini."* Karar: bir günü
-- değiştirirken **"yalnızca bu tarih"** ya da **"her <haftanın günü>"**
-- seçilebiliyor; "Tüm günler" özel günler dahil hepsini değiştiriyor.
--
-- Bir günün tutarı, en özelden en genele:
--   1. bu tablodaki o tarihe özel kayıt
--   2. haftanın o gününün tutarı (`cafe_config` · `gunluk_butce_gun_N`)
--   3. her günün tutarı (`cafe_config` · `gunluk_butce_kurus`)
--
-- Neden `budget_periods`'a gelecek satır yazılmıyor: dönem o gün gelince
-- açılıyor (`butce.gununDonemiIle`). Önceden açılmış bir dönem, sonradan
-- değişen haftalık planı o güne yansıtmazdı. Dönem taahhüdü, bu tablo ise
-- plan — ikisi ayrı.
--
-- Taban günlük 1.500 TL — `budget_periods`'taki kısıtın aynısı (Ü45).

CREATE TABLE butce_gun_ozel (
  cafe_id        text        NOT NULL REFERENCES cafes(id),
  gun            date        NOT NULL,
  taahhut_kurus  bigint      NOT NULL CHECK (taahhut_kurus >= 150000),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cafe_id, gun)
);

COMMENT ON TABLE butce_gun_ozel IS
  'Ü287: kafenin bir TARİHE özel bütçe planı. O gün gelince dönem bu tutarla açılır.';

ALTER TABLE butce_gun_ozel ENABLE ROW LEVEL SECURITY;
ALTER TABLE butce_gun_ozel FORCE ROW LEVEL SECURITY;

CREATE POLICY bypass ON butce_gun_ozel
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

CREATE POLICY tenant ON butce_gun_ozel
  USING (cafe_id = current_setting('app.cafe_id', true))
  WITH CHECK (cafe_id = current_setting('app.cafe_id', true));

-- Varsayılan yetki okuma/ekleme/güncelleme (0001). "Tüm günler" özel
-- günleri temizliyor; silme bu tabloya özel olarak veriliyor.
GRANT DELETE ON butce_gun_ozel TO cafeplay_app;
