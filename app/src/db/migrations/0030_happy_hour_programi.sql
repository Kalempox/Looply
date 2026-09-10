-- ═══════════════════════════════════════════════════════════
-- Ü104 · Happy Hour: haftalık program + kendi bütçesi
-- ═══════════════════════════════════════════════════════════
--
-- Ö3'te Happy Hour zaten vardı: kafe saat aralığını ve havuzu panelden
-- giriyor, pencerede oyuncu ikinci ödülünü de alabiliyor, havuzun erimesi
-- ekranda görünüyor. İki eksik vardı ve ürün sahibi ikisini de kapattı.
--
-- ── 1. "İstediği gün" ───────────────────────────────────────
--
-- Pencere **yalnızca bugün** açılabiliyordu (`gun = isGunu()`). Kafenin her
-- sabah panele girip elle pencere açması gerekiyordu — ve sebebi *"normalde
-- az müşteri olan saat"*, yani her hafta tekrarlayan bir şey. Elle
-- girilmesi gereken tekrarlayan iş, bir süre sonra hiç yapılmaz.
--
-- Ürün sahibi: *"kafe istediği gibi günü ve saati seçer; ister haftanın her
-- günü belirli saat, ister farklı günlerde farklı saatler."*
--
-- Bu yüzden program **haftagünü başına bir satır**: pazartesi 14:00–17:00,
-- salı hiç, çarşamba 15:00–18:00 kurulabiliyor. Tek bir "her gün şu saat"
-- kalıbı, sorulan şeyin yalnızca yarısını karşılardı.
--
-- ── 2. ⚠️ Happy Hour'un KENDİ bütçesi ───────────────────────
--
-- Ürün sahibi: *"happy hour'a özel bütçe olacak ve sistem ona göre
-- dağıtacak."*
--
-- Bugüne kadar havuz günlük bütçenin **içinden** ayrılıyordu ve panel
-- "havuz dağıtılabilir bütçeden büyük olamaz" diyordu. Artık havuz ayrı
-- para: o pencerede günlük tavanın ÜSTÜNE çıkılabiliyor.
--
-- ⚠️ Bu, E10'un ("kafe taahhüdünün üstünü ödemez") gevşemesi **değil**,
-- taahhüdün büyümesi. Kafenin o günkü toplam taahhüdü artık
-- `günlük bütçe + o günün happy hour havuzu`. Panel bu toplamı **yazmak
-- zorunda**: 1.500 TL taahhüt ettiğini sanan kafe gerçekte 1.900 TL
-- taahhüt etmiş olur ve bunu ay sonunda öğrenmesi kabul edilemez.
--
-- ⚠️ Happy Hour parasını yalnızca **happy hour kuponu** harcayabiliyor.
-- Tavanı koşulsuz yükseltseydik, pencere açıkken üretilen sıradan bir
-- kupon da o parayı yiyebilirdi ve kafenin "bu saate ayırdım" dediği bütçe
-- başka saate akardı.

-- ── Haftalık program ───────────────────────────────────────

CREATE TABLE happy_hour_plans (
  id            text PRIMARY KEY,
  cafe_id       text NOT NULL REFERENCES cafes(id),

  -- Postgres EXTRACT(dow) düzeni: 0 = Pazar … 6 = Cumartesi.
  -- Kullanım penceresiyle (Ü103) aynı numaralar; iki yerde iki ayrı
  -- düzen olsaydı biri bir gün ötelenirdi.
  weekday       int NOT NULL CHECK (weekday BETWEEN 0 AND 6),

  -- Gün içindeki dakika (0–1439). Saat yerine dakika: 14:30 gibi bir
  -- başlangıç kafenin gerçek boş saatine denk gelebilir.
  start_minute  int NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  duration_min  int NOT NULL CHECK (duration_min BETWEEN 60 AND 240),

  -- Bu pencereye ayrılan ek bütçe. Günlük bütçeden düşmüyor, ona ekleniyor.
  pool_kurus    bigint NOT NULL CHECK (pool_kurus > 0),

  active        boolean NOT NULL DEFAULT true,
  created_by    text NOT NULL REFERENCES staff(id),
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Gece yarısını aşan pencere yok — Ü90 ve Ü103'teki aynı bilinen sınır.
  CHECK (start_minute + duration_min <= 1440)
);

-- Haftagünü başına tek program. İki program aynı güne düşseydi hangisinin
-- açılacağı belirsiz olurdu; kafe de neden öbürünün havuzunun hiç
-- dağıtılmadığını anlayamazdı (Ö3'teki çakışma yasağının aynısı).
CREATE UNIQUE INDEX happy_hour_plans_gun_idx
  ON happy_hour_plans (cafe_id, weekday)
  WHERE active;

COMMENT ON TABLE happy_hour_plans IS
  'Ü104: haftalık Happy Hour programı. Haftagünü başına bir satır — farklı günlerde farklı saatler kurulabiliyor.';

-- ── Pencere hangi programdan doğdu ─────────────────────────
--
-- Elle açılan pencere ile programın açtığı pencere aynı tabloda duruyor;
-- ikisi de aynı şey, tek fark kimin açtığı. `plan_id` dolu olan satır
-- programdan geldi ve aynı gün ikinci kez üretilmemeli.

ALTER TABLE happy_hours ADD COLUMN plan_id text REFERENCES happy_hour_plans(id);

CREATE UNIQUE INDEX happy_hours_plan_gun_idx
  ON happy_hours (plan_id, business_date)
  WHERE plan_id IS NOT NULL;

COMMENT ON COLUMN happy_hours.plan_id IS
  'Ü104: pencereyi haftalık program açtıysa o programın kimliği. Elle açılanda NULL.';
