-- 0050 · Basılı kodun geçmişi — kullanım "yeni" ve "eski" olarak (Ü272)
--
-- Ürün sahibi, taşınan kodun kullanım sayacı sıfırlanınca:
--   "taşınınca eski ve yeni olarak ayrı ayrı tutulsun kullanım kısmında."
--
-- ── Sorun ────────────────────────────────────────────────────
--
-- Kod bir masaya (`cafe_tables.print_code`) bağlı ve kullanımı o masanın
-- oturumlarından sayılıyordu. Kod başka kafeye taşınınca yeni masada
-- oturum yok: sayaç 0'a düşüyor ve platform "hiç okutulmadı" diyordu —
-- Kafe A'da 659 kez okutulmuş kod için.
--
-- 🔴 Bu yalnızca görüntü değildi. Taşıma kuralı, hedef kafenin kendi
-- kodu "hiç kullanılmamışsa" onu serbest bırakıyor (siliyor). Taşınmış
-- bir kod sıfır göründüğü için o kafeye ikinci bir kod taşınınca
-- sessizce silinirdi — ve kâğıdı bir duvarda asılıydı.
--
-- ── Çözüm ────────────────────────────────────────────────────
--
-- Kodun geçmiş DURAKLARI: hangi masada, hangi aralıkta durduğu. Yalnızca
-- kapanmış duraklar yazılıyor; kodun şu anki durağı son durağın
-- bittiği anda başlıyor. Kullanım, o aralıklardaki oturumlar.
CREATE TABLE print_code_history (
  id          bigserial PRIMARY KEY,
  print_code  text        NOT NULL,
  table_id    text        NOT NULL REFERENCES cafe_tables(id) ON DELETE CASCADE,
  cafe_id     text        NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  started_at  timestamptz NOT NULL,
  ended_at    timestamptz NOT NULL,
  CHECK (ended_at >= started_at)
);

CREATE INDEX print_code_history_kod_idx ON print_code_history (print_code, ended_at DESC);

COMMENT ON TABLE print_code_history IS
  'Ü272: basılı kodun geçmiş durakları. Kodun şu anki durağı max(ended_at) anında başlıyor.';

ALTER TABLE print_code_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_code_history FORCE ROW LEVEL SECURITY;

-- Platform verisi: hiçbir kiracıya ait değil, yalnızca bypass görüyor.
CREATE POLICY bypass ON print_code_history
  USING (current_setting('app.bypass', true) = 'on')
  WITH CHECK (current_setting('app.bypass', true) = 'on');

-- ⚠️ Yalnızca okuma ve ekleme: geçmiş sonradan değiştirilmez.
GRANT SELECT, INSERT ON print_code_history TO cafeplay_app;
GRANT USAGE ON SEQUENCE print_code_history_id_seq TO cafeplay_app;

-- ── Kullanım: TEK hesap ─────────────────────────────────────
--
-- Liste, hedef seçici ve taşıma koruması aynı fonksiyonu çağırıyor.
-- Üç yerde ayrı ayrı yazılsaydı birinin "kullanımda" dediğine öbürü
-- "boş" diyebilirdi — Ü267'de tam bu yüzden hata yaşandı.
--
--   yeni  = kodun şu anki masasında, oraya geldiği andan beri
--   eski  = geçmiş duraklarında, o aralıklarda
--   gelis = şu anki durağa geldiği an (hiç taşınmadıysa NULL)
CREATE FUNCTION basili_kod_kullanimi(p_kod text, p_masa text)
RETURNS TABLE (yeni bigint, eski bigint, gelis timestamptz)
LANGUAGE sql STABLE AS $$
  WITH g AS (
    SELECT max(ended_at) AS gelis FROM print_code_history WHERE print_code = p_kod
  )
  SELECT
    (SELECT count(*) FROM table_sessions ts, g
      WHERE ts.table_id = p_masa AND ts.started_at >= coalesce(g.gelis, '-infinity')),
    (SELECT count(*) FROM print_code_history h
       JOIN table_sessions ts
         ON ts.table_id = h.table_id AND ts.started_at >= h.started_at AND ts.started_at < h.ended_at
      WHERE h.print_code = p_kod),
    (SELECT gelis FROM g)
$$;

-- ── Geçmiş taşımalar denetim izinden ─────────────────────────
--
-- Her taşıma satırı bir durağın kapanışı: kaynak masa, taşıma anına
-- kadar. Durağın başı bir önceki taşıma (ya da masanın açılışı).
--
-- ⚠️ Kafe KİMLİĞİ değil MASA kimliği kullanılıyor ve kafe masadan
-- okunuyor: denetim izindeki kafe kimlikleri bir log hatası yüzünden
-- bozulmuş olabilir (Ü272 — `[telefon]` maskesi). Silinmiş masaların
-- durakları eşleşmiyor ve düşüyor; geri getirilecek bir şeyleri yok.
INSERT INTO print_code_history (print_code, table_id, cafe_id, started_at, ended_at)
SELECT h.kod, t.id, t.cafe_id, coalesce(h.onceki, t.created_at), h.zaman
  FROM (
    SELECT a.detail->>'kod'        AS kod,
           a.detail->>'kaynakMasa' AS kaynak_masa,
           a.created_at            AS zaman,
           lag(a.created_at) OVER (PARTITION BY a.detail->>'kod' ORDER BY a.created_at, a.id) AS onceki
      FROM audit_log a
     WHERE a.action = 'table.print_code_move'
  ) h
  JOIN cafe_tables t ON t.id = h.kaynak_masa
 WHERE h.kod IS NOT NULL
   AND coalesce(h.onceki, t.created_at) <= h.zaman;
