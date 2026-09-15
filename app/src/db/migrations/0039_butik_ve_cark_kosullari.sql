-- ═══════════════════════════════════════════════════════════
-- Ü137 · Butik kipi ve çark koşulları
-- ═══════════════════════════════════════════════════════════
--
-- Ürün sahibi: *"butikte oyun olmayacak. Müşteri aldığı kıyafetleri
-- okutacak, 2500 TL tuttu diyelim; butik sahibi 3000 TL ve üzerine çark
-- tanımlamış olacak. Kasiyer 2500 olduğunu görünce diyecek ki '3000 ve
-- üzerinde çark şansınız var, isterseniz tamamlayın.' Tamamlanırsa
-- müşteriye QR okutulacak ve çark tanımlanacak."*
--
-- Ve koşul serbest: *"ister şu ürünü alana, ister şu kadar harcama
-- yapana, ister her gün, ister ilk gelen — nasıl isterse."*
--
-- ── Üç yeni kavram ──────────────────────────────────────────
--
--   1. `cafes.isletme_turu`  — kafe mi butik mi
--   2. `cark_kosullari`      — çark hakkını NE veriyor
--   3. `cark_haklari`        — kasiyerin verdiği tekil hak (jeton)
--
-- ── 🔴 Butikte K2 (konum) ARANMIYOR ─────────────────────────
--
-- Kafede oyuncunun kafede olduğunu konum kanıtlıyor. Butikte kanıt çok
-- daha güçlü: **kasiyer kendisi hakkı veriyor.** Kasada duran insanın
-- orada olduğunu GPS'ten daha iyi bilen bir tanık var.
--
-- Bu yüzden butik çarkı masa oturumu ve geofence aramıyor; hakkın
-- kendisi kanıt. `cark_haklari.staff_id` o tanığı kayda geçiriyor.
--
-- ── ⚠️ Kişisel veriyi KASİYER GİRMİYOR ──────────────────────
--
-- İlk tarifte "müşterinin adı ve telefonu kasaya girilecek" vardı ve bu
-- rıza zincirini kırıyordu: kasiyerin yazdığı veriye kim onay verdi?
-- Ürün sahibinin kararı: *"kasiyer kasadaki QR'ı gösterir, müşteri
-- oradan okutur, öyle girer."*
--
-- Yani `cark_haklari` satırında **hiç kişisel veri yok**: yalnızca bir
-- jeton. Müşteri jetonu okutup kendi telefonundan kaydoluyor, aydınlatma
-- metnini kendisi onaylıyor. `player_id` ancak o an doluyor.

/* ── 1. İşletme türü ───────────────────────────────────────── */

ALTER TABLE cafes ADD COLUMN isletme_turu text NOT NULL DEFAULT 'kafe'
  CHECK (isletme_turu IN ('kafe', 'butik'));

COMMENT ON COLUMN cafes.isletme_turu IS
  'Ü137: kafe oyun oynatıyor, butik alışverişe çark veriyor. Varsayılan kafe — mevcut bütün kayıtlar öyle.';

/* ── 2. Çark koşulları ─────────────────────────────────────── */

CREATE TABLE cark_kosullari (
  id          text PRIMARY KEY,
  cafe_id     text NOT NULL REFERENCES cafes(id),
  -- tutar     : alışveriş ≥ esik_kurus
  -- urun      : sepette product_id var
  -- gunluk    : günde bir kez, koşulsuz
  -- ilk_gelen : günün ilk `adet` müşterisi
  tur         text NOT NULL CHECK (tur IN ('tutar', 'urun', 'gunluk', 'ilk_gelen')),
  esik_kurus  bigint CHECK (esik_kurus IS NULL OR esik_kurus > 0),
  product_id  text REFERENCES products(id),
  adet        integer CHECK (adet IS NULL OR adet > 0),
  aktif       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,

  -- 🔴 Her türün kendi parametresi DOLU olmak zorunda. Kısıt olmasaydı
  -- parametresiz bir "tutar" koşulu kaydedilebilir ve çalışma anında
  -- sessizce herkese hak verirdi — para dağıtan bir sessiz arıza.
  CONSTRAINT kosul_parametresi CHECK (
    (tur = 'tutar'     AND esik_kurus IS NOT NULL AND product_id IS NULL AND adet IS NULL) OR
    (tur = 'urun'      AND product_id IS NOT NULL AND esik_kurus IS NULL AND adet IS NULL) OR
    (tur = 'gunluk'    AND esik_kurus IS NULL AND product_id IS NULL AND adet IS NULL) OR
    (tur = 'ilk_gelen' AND adet IS NOT NULL AND esik_kurus IS NULL AND product_id IS NULL)
  )
);

COMMENT ON TABLE cark_kosullari IS
  'Ü137: çark hakkını ne veriyor. Birden çok koşul olabilir ve HERHANGİ BİRİ yeterli (VEYA) — işletme "3000 TL üstü ya da şu ürünü alan" diyebilmeli.';

CREATE INDEX cark_kosullari_cafe ON cark_kosullari (cafe_id) WHERE aktif;

/* ── 3. Çark hakkı ─────────────────────────────────────────── */

CREATE TABLE cark_haklari (
  id          text PRIMARY KEY,
  cafe_id     text NOT NULL REFERENCES cafes(id),
  -- Kasada gösterilen QR'ın taşıdığı değer. Tahmin edilemez olmak
  -- zorunda: tahmin eden biri alışveriş yapmadan çark hakkı kazanırdı.
  jeton_hash  bytea NOT NULL UNIQUE,
  -- Hakkı veren kasiyer — "kasada duran insan" kanıtının tanığı.
  staff_id    text NOT NULL REFERENCES staff(id),
  -- Hangi koşul verdi. Koşul sonradan silinse bile hak sahipsiz kalmasın
  -- diye ON DELETE yok; koşul zaten silinmiyor, pasifleştiriliyor.
  kosul_id    text REFERENCES cark_kosullari(id),
  -- ⚠️ Adisyon tutarı SAKLANMIYOR: neyi aldığı butiğin kendi kaydı,
  -- bizim işimiz değil. Yalnızca hakkın doğduğu an ve kim verdiği.
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  -- Müşteri jetonu okutup kaydolunca doluyor. Öncesinde NULL ve bu
  -- kasıtlı: hak verilirken müşterinin kim olduğu bilinmiyor.
  player_id   text REFERENCES players(id),
  claimed_at  timestamptz,
  -- Çark çevrildiğinde doluyor. Üretilen kupon buradan izlenebiliyor.
  coupon_id   text REFERENCES coupons(id),
  used_at     timestamptz
);

COMMENT ON TABLE cark_haklari IS
  'Ü137: kasiyerin verdiği tekil çark hakkı. Satırda kişisel veri YOK — müşteri jetonu okutup kendi kaydoluyor, player_id ancak o an doluyor.';

COMMENT ON COLUMN cark_haklari.jeton_hash IS
  'Jetonun sha256''sı. Ham jeton yalnızca kasadaki QR''da ve müşterinin adres çubuğunda; veritabanında duran özet, sızsa bile QR üretilemez.';

CREATE INDEX cark_haklari_cafe ON cark_haklari (cafe_id, created_at DESC);
CREATE INDEX cark_haklari_player ON cark_haklari (player_id) WHERE player_id IS NOT NULL;

-- Günün ilk N müşterisi ve "günde bir" sayımları bu indeksten geçiyor.
CREATE INDEX cark_haklari_gun ON cark_haklari (cafe_id, created_at);
