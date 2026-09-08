import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kampanyaKuponuVer, upsellKuponuVer } from "@/domain/kupon";
import * as upsell from "@/domain/upsell";
import * as odul from "@/domain/odul";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import { randomInt } from "node:crypto";
import { isGunu } from "@/lib/tarih";
import { yoneticiSorgu } from "./_yardim";

/**
 * KAMPANYA TESLİMİ — Ö4, Ü82.
 *
 * ── Bu testin var olma sebebi ───────────────────────────────
 *
 * Kampanya özelliği aylarca **yarım** durdu ve kimse fark etmedi: panel
 * kampanyayı oluşturuyor, listeliyor, limitlerini veritabanı düzeyinde
 * zorluyordu — ama `coupons.campaign_id` kolonuna **hiçbir kod yazmıyordu.**
 * Veritabanında 403 ödül kuponuna karşılık 0 kampanya kuponu vardı.
 *
 * Testler o gün "kampanya kaydedilebiliyor mu" sorusunu soruyordu;
 * "kampanya oyuncuya ulaşıyor mu" sorusunu kimse sormamıştı. Bu dosya
 * o soruyu soruyor.
 *
 * Sınanan altı iddia:
 *   1. Yayındaki kampanya kupon olarak düşüyor ve `campaign_id` doluyor
 *   2. Aynı oyuncu aynı kampanyadan günde bir kez alıyor
 *   3. Günlük limit dolunca kimseye düşmüyor
 *   4. Taslak ve durdurulmuş kampanya düşmüyor
 *   5. Bütçeden TL tavanı kadar rezerve ediliyor (Ü17)
 *   6. Kupon oyuncunun envanterinde doğru başlıkla görünüyor
 */

let kafeA = "";
let kampanyaId = "";
let oyuncu1 = "";
let oyuncu2 = "";
let yoneticiA = "";
let ilkTaahhut = 0;

const bugun = isGunu();

/** Kafenin açık olduğu bir an — Ü90'dan beri kapalıyken kupon çıkmıyor. */
const KAFE_ACIK = new Date("2026-09-02T20:00:00+03:00");

/** Ürün 100 TL, indirim %20 → tavan 20 TL. */
const URUN_KURUS = 100_00;
const YUZDE = 20;
const TAVAN_KURUS = 20_00;

async function yeniOyuncu(ad: string): Promise<string> {
  const o = await kaydet({
    telefon: normalizePhone(`0547${String(3_100_000 + randomInt(800_000)).slice(-7)}`),
    ad,
    soyad: "Kampanya",
    dogumYili: 1994,
    pazarlamaIzni: false,
  });
  assert.ok(o.yeni, "test için yeni oyuncu açılamadı — numara çakıştı");
  return o.oyuncu.id;
}

/** Kampanyanın durumunu ve limitlerini doğrudan yazar — panel yolunu tekrarlamadan. */
async function kampanyaAyarla(alanlar: Record<string, number | string>): Promise<void> {
  const anahtarlar = Object.keys(alanlar);
  const set = anahtarlar.map((a, i) => `${a} = $${i + 2}`).join(", ");
  await yoneticiSorgu(`UPDATE percentage_campaigns SET ${set} WHERE id = $1`, [
    kampanyaId,
    ...anahtarlar.map((a) => alanlar[a]),
  ]);
}

/** Bu kampanyadan çıkmış kuponları siler — her testin temiz başlaması için. */
async function kuponlariTemizle(): Promise<void> {
  await yoneticiSorgu(
    `DELETE FROM budget_ledger WHERE coupon_id IN
       (SELECT id FROM coupons WHERE campaign_id = $1)`,
    [kampanyaId],
  );
  await yoneticiSorgu(
    `DELETE FROM coupon_events WHERE coupon_id IN
       (SELECT id FROM coupons WHERE campaign_id = $1)`,
    [kampanyaId],
  );
  await yoneticiSorgu(`DELETE FROM coupons WHERE campaign_id = $1`, [kampanyaId]);
}

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const y = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [a!.id],
    );
    return { a: a?.id, y: y?.id };
  });
  assert.ok(v.a && v.y, "Tohum verisi yok — önce: npm run db:seed");
  kafeA = v.a;
  yoneticiA = v.y;

  // Bütçe dönemi tohumdan geliyor; taahhüdü yükseltiyoruz ki testin
  // kuponları "bütçe doldu" diye reddedilmesin. Sonda geri konuyor.
  const donem = await withBypass("test: dönem", (db) =>
    db.one<{ id: string; committed_kurus: string }>(
      `SELECT id, committed_kurus FROM budget_periods
        WHERE cafe_id = $1 AND period_start <= $2 AND period_end > $2`,
      [kafeA, bugun],
    ),
  );
  assert.ok(donem, "kafe A'nın bu haftaya ait bütçe dönemi yok");
  ilkTaahhut = Number(donem.committed_kurus);
  await yoneticiSorgu(`UPDATE budget_periods SET committed_kurus = $2 WHERE id = $1`, [
    donem.id,
    ilkTaahhut + 500_00,
  ]);

  await yoneticiSorgu(
    `INSERT INTO products (id, cafe_id, name, price_kurus, active)
     VALUES ('prd_test_kmp', $1, 'TEST KMP Latte', $2, true)`,
    [kafeA, URUN_KURUS],
  );

  // Kampanya doğrudan yayında açılıyor: `olustur` taslak üretiyor ve bu
  // dosyanın konusu oluşturma değil, teslim.
  await yoneticiSorgu(
    `INSERT INTO percentage_campaigns
       (id, cafe_id, product_id, percent, max_discount_kurus, daily_limit, total_limit,
        starts_at, ends_at, status, created_by)
     VALUES ('cmp_test_teslim', $1, 'prd_test_kmp', $2, $3, 50, NULL,
             now() - interval '1 hour', now() + interval '7 days', 'active', $4)`,
    [kafeA, YUZDE, TAVAN_KURUS, yoneticiA],
  );
  kampanyaId = "cmp_test_teslim";

  // Tohumda da yayında bir kampanya var (Ü82). Bu dosya "hangi kampanya
  // seçiliyor" sorusunu değil "teslim çalışıyor mu" sorusunu sınıyor;
  // diğerleri sahneden çekiliyor, sonda geri açılıyor.
  await yoneticiSorgu(
    `UPDATE percentage_campaigns SET status = 'paused'
      WHERE cafe_id = $1 AND id <> $2 AND status = 'active'`,
    [kafeA, kampanyaId],
  );

  oyuncu1 = await yeniOyuncu("Kampanyalı");
  oyuncu2 = await yeniOyuncu("İkinci");
});

after(async () => {
  await kuponlariTemizle();
  await yoneticiSorgu(
    `UPDATE percentage_campaigns SET status = 'active'
      WHERE cafe_id = $1 AND id <> $2 AND status = 'paused'`,
    [kafeA, kampanyaId],
  );
  await yoneticiSorgu(`DELETE FROM percentage_campaigns WHERE id = $1`, [kampanyaId]);
  await yoneticiSorgu(`DELETE FROM products WHERE id = 'prd_test_kmp'`);
  // Sıra önemli: oyuncuya bağlı satırlar önce. Kayıt akışı rıza kaydı
  // da yazıyor (G7) ve yabancı anahtar oyuncunun silinmesini engelliyor.
  const oyuncular = [oyuncu1, oyuncu2];
  await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = ANY($1)`, [oyuncular]);
  await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = ANY($1)`, [oyuncular]);
  await yoneticiSorgu(`DELETE FROM players WHERE id = ANY($1)`, [oyuncular]);
  await yoneticiSorgu(`UPDATE budget_periods SET committed_kurus = $2 WHERE cafe_id = $1
                        AND period_start <= $3 AND period_end > $3`, [
    kafeA,
    ilkTaahhut,
    bugun,
  ]);
  await closePools();
});

/* ═══════════════════════════════════════════════════════════
   1 · Kampanya gerçekten teslim ediliyor
   ═══════════════════════════════════════════════════════════ */

describe("kampanya teslimi (Ö4, Ü82)", () => {
  test("yayındaki kampanya kupon olarak düşüyor ve campaign_id doluyor", async () => {
    await kuponlariTemizle();

    const sonuc = await withBypass("test: kampanya kuponu", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu1, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );

    assert.ok(sonuc, "kampanya kuponu hiç düşmedi");
    assert.ok(sonuc.ok, `kupon üretilemedi: ${sonuc.ok ? "" : sonuc.hata}`);

    const satir = await withBypass("test: kupon satırı", (db) =>
      db.one<{ campaign_id: string | null; reward_id: string | null; reserved_kurus: string }>(
        `SELECT campaign_id, reward_id, reserved_kurus FROM coupons WHERE id = $1`,
        [sonuc.kuponId],
      ),
    );

    assert.equal(satir?.campaign_id, kampanyaId, "campaign_id yazılmadı — eski hatanın ta kendisi");
    assert.equal(satir?.reward_id, null, "kampanya kuponunda reward_id dolu olmamalı");
  });

  test("bütçeden TL tavanı kadar rezerve ediliyor (Ü17)", async () => {
    await kuponlariTemizle();

    const sonuc = await withBypass("test: rezervasyon", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu1, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );
    assert.ok(sonuc?.ok, "kupon üretilemedi");

    const satir = await withBypass("test: rezerve", (db) =>
      db.one<{ reserved_kurus: string }>(`SELECT reserved_kurus FROM coupons WHERE id = $1`, [
        sonuc.kuponId,
      ]),
    );

    // Ürünün tamamı değil, yüzdenin tavanı: 100 TL'lik latte için 20 TL.
    assert.equal(
      Number(satir?.reserved_kurus),
      TAVAN_KURUS,
      "rezervasyon TL tavanı kadar olmalı — ürünün tam fiyatı kadar değil",
    );
  });

  test("oyuncu aynı kampanyadan günde ikinci kez alamıyor", async () => {
    await kuponlariTemizle();

    const ilk = await withBypass("test: ilk", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu1, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );
    assert.ok(ilk?.ok, "ilk kupon düşmedi");

    const ikinci = await withBypass("test: ikinci", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu1, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );

    assert.equal(ikinci, null, "aynı oyuncu aynı gün ikinci kuponu aldı — beş oyun = beş kupon");
  });

  test("başka oyuncu aynı gün alabiliyor — sınır oyuncu başına", async () => {
    await kuponlariTemizle();

    const a = await withBypass("test: oyuncu 1", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu1, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );
    const b = await withBypass("test: oyuncu 2", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu2, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );

    assert.ok(a?.ok && b?.ok, "iki farklı oyuncu aynı kampanyadan alamadı");
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Limitler gerçekten tutuyor
   ═══════════════════════════════════════════════════════════ */

describe("kampanya limitleri (Ü8)", () => {
  test("günlük limit dolunca kimseye düşmüyor", async () => {
    await kuponlariTemizle();
    await kampanyaAyarla({ daily_limit: 1 });

    const ilk = await withBypass("test: limit ilk", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu1, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );
    assert.ok(ilk?.ok, "günlük limitin ilk kuponu düşmedi");

    // Limit doldu: farklı oyuncu bile alamamalı.
    const ikinci = await withBypass("test: limit ikinci", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu2, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );
    assert.equal(ikinci, null, "günlük limit aşıldı");

    await kampanyaAyarla({ daily_limit: 50 });
  });

  test("toplam limit dolunca düşmüyor", async () => {
    await kuponlariTemizle();
    await kampanyaAyarla({ total_limit: 1 });

    const ilk = await withBypass("test: toplam ilk", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu1, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );
    assert.ok(ilk?.ok, "toplam limitin ilk kuponu düşmedi");

    const ikinci = await withBypass("test: toplam ikinci", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu2, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );
    assert.equal(ikinci, null, "toplam limit aşıldı");

    await yoneticiSorgu(`UPDATE percentage_campaigns SET total_limit = NULL WHERE id = $1`, [
      kampanyaId,
    ]);
  });

  test("taslak kampanya düşmüyor", async () => {
    await kuponlariTemizle();
    await kampanyaAyarla({ status: "draft" });

    const sonuc = await withBypass("test: taslak", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu1, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );
    assert.equal(sonuc, null, "yayına alınmamış kampanya oyuncuya ulaştı");

    await kampanyaAyarla({ status: "active" });
  });

  test("durdurulmuş kampanya düşmüyor", async () => {
    await kuponlariTemizle();
    await kampanyaAyarla({ status: "paused" });

    const sonuc = await withBypass("test: durdurulmuş", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu1, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );
    assert.equal(sonuc, null, "durdurulmuş kampanya hâlâ dağıtıyor");

    await kampanyaAyarla({ status: "active" });
  });

  test("süresi geçmiş kampanya düşmüyor", async () => {
    await kuponlariTemizle();
    await yoneticiSorgu(
      `UPDATE percentage_campaigns SET ends_at = now() - interval '1 hour' WHERE id = $1`,
      [kampanyaId],
    );

    const sonuc = await withBypass("test: süresi geçmiş", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu1, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );
    assert.equal(sonuc, null, "süresi dolmuş kampanya hâlâ dağıtıyor");

    await yoneticiSorgu(
      `UPDATE percentage_campaigns SET ends_at = now() + interval '7 days' WHERE id = $1`,
      [kampanyaId],
    );
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Oyuncunun gördüğü şey
   ═══════════════════════════════════════════════════════════ */

describe("kampanya kuponu envanterde", () => {
  test("başlık yüzde ve ürün adıyla görünüyor, TL görünmüyor (E9)", async () => {
    await kuponlariTemizle();

    const sonuc = await withBypass("test: envanter", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu1, cafeId: kafeA, kanitSeviyesi: 2, an: KAFE_ACIK }),
    );
    assert.ok(sonuc?.ok, "kupon üretilemedi");

    const env = await odul.envanter(oyuncu1);
    const hepsi = [...env.kullanilabilir, ...env.bekleyen, ...env.gecmis];
    const kupon = hepsi.find((k) => k.id === sonuc.kuponId);

    assert.ok(kupon, "kampanya kuponu envanterde görünmüyor");
    assert.equal(kupon.baslik, `%${YUZDE} · TEST KMP Latte`);
    assert.equal(kupon.tur, "yuzde", "kampanya kuponunun cinsi yüzde olmalı");

    // E9: envanter tipinde TL taşıyan bir alan olmamalı — ekran isteseydi
    // bile basamaz. Bu kontrol tipi değil, çıktıyı sınıyor.
    assert.ok(
      !JSON.stringify(kupon).includes(String(TAVAN_KURUS)),
      "kupon çıktısında TL değeri sızmış (E9)",
    );
  });
});

/* ═══════════════════════════════════════════════════════════
   Upsell — bu ziyarette kullanılan teklif (Ü100)
   ═══════════════════════════════════════════════════════════ */

describe("upsell teklifi (Ü100)", () => {
  const UPSELL_ID = "cmp_test_upsell";
  const UPSELL_URUN = "prd_test_upsell";

  /**
   * ⚠️ **Kendi ürünü**, dıştaki suite'inkini paylaşmıyor.
   *
   * İlk hâli `prd_test_kmp`'yi kullanıyordu ve dosya çöktüğünde temizlik
   * sırası kilitleniyordu: dış `after` ürünü silmeye çalışıyor, bu
   * kampanya hâlâ ona bağlı olduğu için yabancı anahtar engelliyor, artık
   * satır kalıyor ve BİR SONRAKİ koşu "duplicate key" ile açılışta
   * ölüyordu. Testler birbirinin kurulumuna dayanmamalı.
   */
  before(async () => {
    await yoneticiSorgu(
      `INSERT INTO products (id, cafe_id, name, price_kurus, active)
       VALUES ($1, $2, 'TEST UPS Cheesecake', 10000, true)
       ON CONFLICT (id) DO NOTHING`,
      [UPSELL_URUN, kafeA],
    );
    await yoneticiSorgu(
      `INSERT INTO percentage_campaigns
         (id, cafe_id, product_id, percent, max_discount_kurus, daily_limit, total_limit,
          starts_at, ends_at, status, created_by, instant, offer_hours)
       VALUES ($1, $2, $4, 25, 2500, 50, NULL,
               now() - interval '1 hour', now() + interval '7 days', 'active', $3, true, 3)
       ON CONFLICT (id) DO NOTHING`,
      [UPSELL_ID, kafeA, yoneticiA, UPSELL_URUN],
    );
  });

  after(async () => {
    await yoneticiSorgu(`DELETE FROM campaign_offers WHERE campaign_id = $1`, [UPSELL_ID]);
    await yoneticiSorgu(
      `DELETE FROM coupon_events WHERE coupon_id IN (SELECT id FROM coupons WHERE campaign_id = $1)`,
      [UPSELL_ID],
    );
    await yoneticiSorgu(`DELETE FROM coupons WHERE campaign_id = $1`, [UPSELL_ID]);
    await yoneticiSorgu(`DELETE FROM percentage_campaigns WHERE id = $1`, [UPSELL_ID]);
    await yoneticiSorgu(`DELETE FROM products WHERE id = $1`, [UPSELL_URUN]);
  });

  test("🔴 upsell kampanyası oyun sonunda KENDİLİĞİNDEN kupona dönmüyor", async () => {
    // ⚠️ Dönseydi teklif mekaniği anlamsız olurdu: teklifi görmezden
    // geçecek oyuncuya da kupon basılır ve kafenin bütçesi
    // kullanılmayacak sözlere bağlanırdı (Ü7).
    const s = await withBypass("test: normal kampanya yolu", (db) =>
      kampanyaKuponuVer(db, { playerId: oyuncu2, cafeId: kafeA, kanitSeviyesi: 2 }),
    );
    // Normal kampanya gelebilir ama upsell'inki ASLA.
    if (s?.ok) {
      const k = await withBypass("test: kuponun kampanyası", (db) =>
        db.one<{ campaign_id: string }>(`SELECT campaign_id FROM coupons WHERE id = $1`, [s.kuponId]),
      );
      assert.notEqual(k?.campaign_id, UPSELL_ID, "upsell kuponu otomatik verildi");
    }
  });

  test("teklif gösteriliyor ve deftere yazılıyor", async () => {
    const t = await withBypass("test: teklif", (db) =>
      upsell.uygunTeklif(db, { cafeId: kafeA, playerId: oyuncu1 }),
    );
    assert.ok(t, "upsell teklifi gelmedi");
    assert.equal(t.yuzde, 25);
    assert.equal(t.gecerliSaat, 3);

    const satir = await withBypass("test: teklif satırı", (db) =>
      db.one<{ taken_at: Date | null }>(`SELECT taken_at FROM campaign_offers WHERE id = $1`, [
        t.teklifId,
      ]),
    );
    // Gösterildi ama alınmadı: huninin kaybı burada görünüyor.
    assert.equal(satir?.taken_at, null, "gösterim kabul sayıldı");
  });

  test("🔴 kabul edilen teklif ERTELENMİYOR ve saatlerle sınırlı", async () => {
    // ⚠️ Upsell'in tek ayırt edici özelliği bu. 12 saat beklerse müşteri
    // çoktan kalkmış olur ve kupon upsell olmaktan çıkar.
    const t = await withBypass("test: teklif", (db) =>
      upsell.uygunTeklif(db, { cafeId: kafeA, playerId: oyuncu2 }),
    );
    assert.ok(t);

    /**
     * Eşiği tabana indir: normal yolda bu tutar KESİN ertelenirdi.
     *
     * ⚠️ Sonunda **geri alınıyor**. İlk hâli almıyordu ve ayar dosyadan
     * dosyaya sızıyordu: bu test tek başına geçiyor, bütün takımla
     * koşarken bütçe temposu testini düşürüyordu. Testin bıraktığı ayar,
     * başka bir testin sessizce yanlış sebeple kırılması demek.
     */
    const oncekiEsik = await withBypass("test: mevcut eşik", (db) =>
      db.one<{ value: string }>(
        `SELECT value::text FROM cafe_config WHERE cafe_id = $1 AND key = 'erteleme_esigi_kurus'`,
        [kafeA],
      ),
    );

    await yoneticiSorgu(
      `INSERT INTO cafe_config (cafe_id, key, value) VALUES ($1,'erteleme_esigi_kurus','2000')
       ON CONFLICT (cafe_id, key) DO UPDATE SET value = EXCLUDED.value`,
      [kafeA],
    );

    try {
    const s = await upsell.teklifiAl({
      playerId: oyuncu2,
      teklifId: t.teklifId,
      kanitSeviyesi: 2,
      kuponVer: (db, g) =>
        upsellKuponuVer(db, {
          playerId: oyuncu2,
          cafeId: g.cafeId,
          kampanyaId: g.kampanyaId,
          baslik: g.baslik,
          tavanKurus: g.tavanKurus,
          gecerliSaat: g.gecerliSaat,
          kanitSeviyesi: 2,
        }),
    });
    assert.ok(s.ok, s.ok === false ? s.hata : "");

    const k = await withBypass("test: upsell kuponu", (db) =>
      db.one<{ status: string; activates_at: Date; expires_at: Date }>(
        `SELECT status, activates_at, expires_at FROM coupons WHERE id = $1`,
        [s.kuponId],
      ),
    );
    assert.equal(k?.status, "active", "upsell kuponu ertelendi — upsell olmaktan çıkar");
    assert.ok(k!.activates_at.getTime() <= Date.now() + 1000, "aktifleşme ileri atıldı");

    const saat = (k!.expires_at.getTime() - Date.now()) / 3_600_000;
    assert.ok(saat > 2.5 && saat <= 3.1, `süre 3 saat olmalıydı (${saat.toFixed(1)} sa)`);
    } finally {
      if (oncekiEsik) {
        await yoneticiSorgu(
          `UPDATE cafe_config SET value = $2::jsonb WHERE cafe_id = $1 AND key = 'erteleme_esigi_kurus'`,
          [kafeA, oncekiEsik.value],
        );
      } else {
        await yoneticiSorgu(
          `DELETE FROM cafe_config WHERE cafe_id = $1 AND key = 'erteleme_esigi_kurus'`,
          [kafeA],
        );
      }
    }
  });

  test("aynı teklif iki kez alınamıyor", async () => {
    const t = await withBypass("test: teklif satırı", (db) =>
      db.one<{ id: string }>(
        `SELECT id FROM campaign_offers WHERE campaign_id = $1 AND taken_at IS NOT NULL LIMIT 1`,
        [UPSELL_ID],
      ),
    );
    assert.ok(t, "kabul edilmiş teklif yok");

    const s = await upsell.teklifiAl({
      playerId: oyuncu2,
      teklifId: t.id,
      kanitSeviyesi: 2,
      kuponVer: async () => ({ ok: true as const, kuponId: "x", kod: "x" }),
    });
    assert.equal(s.ok, false, "aynı teklif ikinci kez alındı");
  });

  test("başkasının teklifi alınamıyor", async () => {
    // Değişmez kural #3'ün buradaki karşılığı: istemciden gelen tek şey
    // teklif kimliği ve o kimlik başkasının satırını açamıyor.
    const t = await withBypass("test: oyuncu1'in teklifi", (db) =>
      db.one<{ id: string }>(
        `SELECT id FROM campaign_offers WHERE campaign_id = $1 AND player_id = $2 LIMIT 1`,
        [UPSELL_ID, oyuncu1],
      ),
    );
    if (!t) return;

    const s = await upsell.teklifiAl({
      playerId: oyuncu2,
      teklifId: t.id,
      kanitSeviyesi: 2,
      kuponVer: async () => ({ ok: true as const, kuponId: "x", kod: "x" }),
    });
    assert.equal(s.ok, false, "başkasının teklifi alındı");
  });

  test("huni gösterildi / alındı / kullanıldı sayıyor", async () => {
    const h = await upsell.huni(kafeA, { baslangic: bugun, bitis: isGunu(new Date(Date.now() + 86_400_000)) });
    const satir = h.find((x) => x.kampanyaId === UPSELL_ID);
    assert.ok(satir, "huni satırı yok");
    assert.ok(satir.gosterildi >= satir.alindi, "alınan gösterilenden çok");
    assert.ok(satir.alindi >= satir.kullanildi, "kullanılan alınandan çok");
    assert.ok(satir.gosterildi >= 2, `gösterim az: ${satir.gosterildi}`);
  });
});
