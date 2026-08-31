-- 0013 · Bütçe defterine `undo` hareketi
--
-- Kasiyerin 60 saniye içinde geri aldığı kupon, bütçeye **tam olarak**
-- dönmeli. Defter append-only ve tutarlar negatif olamıyor; dolayısıyla
-- bir `commit` satırını geri çevirmenin tek dürüst yolu, onu iptal eden
-- ayrı bir satır yazmak.
--
-- Neden `release` yetmiyor: `release` rezervasyonu serbest bırakır,
-- harcamayı geri çevirmez. Geri alınan kuponda ikisi birden gerekiyor —
-- harcama iptal olacak VE rezervasyon çözülecek.
--
-- Geri alma iki satır yazar:
--   undo(gerçekleşen)    → harcamayı iptal eder
--   release(gerçekleşen) → kalan rezervasyonu çözer
--
-- Dört sayının formülü buna göre:
--   açık rezerve = Σreserve + Σundo − Σcommit − Σrelease
--   harcanan     = Σcommit − Σundo
--   iade         = Σrelease
--
-- Kupon ömrü boyunca doğrulama (tavan 100, gerçekleşen 80):
--   verildi   → açık 100, harcanan 0
--   onaylandı → açık   0, harcanan 80   (commit 80 + release 20)
--   geri alındı → açık 0, harcanan  0   (undo 80 + release 80)
--
-- G23: yalnızca kısıt gevşetme. Mevcut hiçbir satır ihlale düşmüyor.

ALTER TABLE budget_ledger DROP CONSTRAINT budget_ledger_kind_check;

ALTER TABLE budget_ledger ADD CONSTRAINT budget_ledger_kind_check
  CHECK (kind IN ('reserve', 'commit', 'release', 'undo'));

COMMENT ON COLUMN budget_ledger.kind IS
  'reserve: kupon verildi · commit: kasada onaylandı · release: rezervasyon çözüldü · undo: onay 60 saniye içinde geri alındı';
