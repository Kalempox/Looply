-- 0048 · Ödül aralığı kafenin, "masada 5 dk" kuralı kalktı — Ü268 · K5
--
-- Ürün sahibi:
--   "25 ile üst sınır arasında istediğimi yazabilmeliyim; üst sınırı kafe
--    belirlesin, bir sınır olmasın, en az 50 olsun."
--   "Masada 5 dk diye bir kural olmayacak."
--
-- ── 1. Değer kısıtı: basamak kalktı, tavan kafenin ────────────
--
-- Göç 0021 değeri şemaya yazmıştı: 25–50 TL, 5'er artışla. Tavan artık
-- kafenin ayarı (`cafe_config.odul_ust_sinir_kurus`) ve bir CHECK kısıtı
-- başka bir tablodaki ayarı okuyamaz — üst sınır uygulamada
-- (`katalog.ekle`) sınanıyor.
--
-- ⚠️ Taban ve "tam TL" kuralı yine şemada: kural yalnızca uygulamada
-- dursaydı doğrudan SQL ile ya da ileride yazılacak bir betikle 3 TL'lik
-- ya da 27,50 TL'lik ödül girilebilirdi. 0021'in gerekçesi bu yarısı
-- için hâlâ geçerli.
ALTER TABLE rewards DROP CONSTRAINT IF EXISTS odul_degeri_basamakli;
ALTER TABLE rewards ADD CONSTRAINT odul_degeri_tam_tl
  CHECK (cost_kurus >= 2500 AND cost_kurus % 100 = 0);

COMMENT ON CONSTRAINT odul_degeri_tam_tl ON rewards IS
  'Ü268: ödül değeri en az 25 TL ve tam TL. Üst sınır kafenin ayarı, uygulamada sınanıyor.';

-- ── 2. "Masada 5 dk" şartı var olan ödüllerden de kalkıyor ────
--
-- `katalog.kanitSeviyesi` artık her ödül için 2 (konum doğrulaması)
-- döndürüyor, ama o fonksiyon yalnızca YENİ ödülde çağrılıyor. Var olan
-- ödüllerin `min_proof_level`i satırda saklı; güncellenmezse eski
-- ödüller 5 dakika istemeye devam eder ve panelde gördüğü kural ile
-- uygulanan kural ayrışırdı.
UPDATE rewards SET min_proof_level = 2 WHERE min_proof_level > 2;
