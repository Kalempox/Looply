-- 0018 · Sabit tutarlı indirim ödülü + kafenin erteleme eşiği
--
-- ═══════════════════════════════════════════════════════════
-- 1) Üçüncü ödül tipi: sabit TL indirimi
-- ═══════════════════════════════════════════════════════════
--
-- Bugüne kadar iki tip vardı: ürün ödülü ve **yüzdeli** indirim (TL tavanlı).
-- Eksik olan, kafenin doğrudan "20 TL indirim" diyebilmesiydi.
--
-- ── Neden yeni bir tip, neden hack değil ────────────────────
--
-- Teknik olarak bugün de yapılabiliyordu: `percent = 100` + `cost_kurus =
-- 2000` "20 TL tavanlı %100 indirim" demek ve kasada sonuç aynı çıkıyor.
-- Ama oyuncunun ekranında **"%100 indirim"** yazıyor ve bu "bedava" diye
-- okunuyor. Ödülün adı, ödülün ne olduğunu söylemek zorunda.
--
-- ── Neden bu, kafe bakiyesi DEĞİL ───────────────────────────
--
-- Ü18 kafe bakiyesini v1 dışında bırakmıştı: saklanan değer aracı, kısmi
-- kullanım, kalan takibi, iade/itiraz akışı ve ödeme mevzuatı sınırı.
-- Sabit tutarlı indirim bunların hiçbirini doğurmuyor — tek kullanımlık bir
-- kupon; adisyondan bir kez düşülüyor, kalanı saklanmıyor, devretmiyor.
-- Ü18 bu yüzden değişmiyor, yanına bir tip ekleniyor.
--
-- Muhasebe tarafı ürün ödülüyle birebir aynı: `cost_kurus` hem rezerve
-- edilen hem de kasada düşülen tutar. Yüzdelideki "tavan − gerçekleşen =
-- iade" hesabı burada yok, çünkü gerçekleşen zaten tavanın kendisi.

ALTER TABLE rewards DROP CONSTRAINT IF EXISTS rewards_reward_type_check;
ALTER TABLE rewards ADD CONSTRAINT rewards_reward_type_check
  CHECK (reward_type IN ('product', 'percent', 'amount'));

COMMENT ON COLUMN rewards.reward_type IS
  'product: kafenin ürünü · percent: yüzdeli indirim, cost_kurus TAVAN (Ü17) · amount: sabit TL indirimi, cost_kurus tutarın kendisi. Hiçbiri saklanan değer değil (Ü18).';

-- ═══════════════════════════════════════════════════════════
-- 2) Erteleme eşiği artık kafenin ayarı
-- ═══════════════════════════════════════════════════════════
--
-- Ü28 "51 TL üstü ödül ertesi gün aktifleşir" diyordu ve eşik platform
-- sabitiydi. İki şey değişiyor:
--
--   · Süre: "ertesi gün 00:00" yerine **12 saat**. Akşam kazanan ertesi
--     sabah, sabah kazanan aynı akşam kullanabiliyor — dönüş penceresi
--     takvim gününe değil oyuncunun kendi saatine bağlanıyor.
--   · Eşik: platform sabiti değil, **kafenin panelden değiştirdiği** değer.
--     Ödül ekonomisi kafeden kafeye değişiyor; 50 TL bir kafede büyük ödül,
--     başkasında sıradan.
--
-- E6'nın kanıt kademesi (1–15 TL → K2, 16–50 TL → K3, 51 TL+ → K4) bu
-- ayardan ETKİLENMİYOR. O bir fraud kuralı ve platforma ait; kafenin
-- kendi ödülünün kanıt şartını gevşetebilmesi, en pahalı ödülü en zayıf
-- kanıtla vermenin yolu olurdu.
--
-- Ayar `cafe_config` içinde tutuluyor: tablo zaten vardı ve boştu. Her
-- ayar için yeni kolon açmak, on ayarda on göç demek.

COMMENT ON TABLE cafe_config IS
  'Kafenin panelden değiştirebildiği ayarlar. Anahtar-değer: her ayar için yeni kolon açmamak için. Platform kuralları (E6 kanıt kademesi, E10 bütçe tavanı) buraya GİRMEZ — onlar kafenin seçimi değil.';
