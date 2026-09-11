import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { withCafe, withPlayer, withBypass } from "@/db/context";
import { appPool, closePools } from "@/db/pool";
import { normalizePhone, phoneIndex } from "@/lib/crypto";
import { yoneticiSorgu } from "./_yardim";

/**
 * FAZ 2 GÜVENLİK KAPISI — kiracı izolasyonu.
 *
 * "A kafesinin oturumuyla B kafesinin verisi istenirse ne olur?"
 * Cevabı burada, çalıştırılabilir biçimde duruyor.
 *
 * Testler UYGULAMA rolüyle (APP_DATABASE_URL) çalışır. Yönetici rolüyle
 * çalışsalardı süper kullanıcı RLS'yi atlar ve testler yalan söylerdi.
 *
 * Ön koşul:  npm run db:up && npm run db:migrate && npm run db:seed
 */

let kafeA = "";
let kafeB = "";
let oyuncu = "";

before(async () => {
  const veri = await withBypass("test hazırlığı", async (db) => {
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    // Tohumdaki gösteri oyuncusu — AÇIKÇA seçiliyor.
    //
    // Eskiden `LIMIT 1` yazıyordu ve doğru satırı ancak tesadüfen buluyordu:
    // aşağıdaki testler bu oyuncunun İKİ kafede takma adı ve kuponu olduğunu
    // varsayıyor, ama `LIMIT 1` sırasız — hangi satırın döneceği fiziksel
    // satır düzenine bağlı. Başka testler oyuncu üretip silince düzen değişti
    // ve iki test birden, kodda hiçbir şey bozulmadığı hâlde kırmızıya döndü.
    const p = await db.one<{ id: string }>(
      "SELECT id FROM players WHERE phone_index = $1",
      [phoneIndex(normalizePhone("05321234567"))],
    );
    return { a: a?.id, b: b?.id, p: p?.id };
  });

  assert.ok(veri.a && veri.b && veri.p, "Tohum verisi yok — önce: npm run db:seed");
  kafeA = veri.a;
  kafeB = veri.b;
  oyuncu = veri.p;
});

after(async () => {
  await closePools();
});

describe("kafe bağlamı", () => {
  /**
   * ⚠️ Sabit sayı değil, **gerçek sayıyla** karşılaştırılıyor.
   *
   * Burada önce `assert.equal(satirlar.length, 9)` yazıyordu ve sayı
   * tohumun o günkü hâlini çiviliyordu: Ü108'de tohuma menü ve fiş
   * karekodu eklenince test, güvenlikte hiçbir şey bozulmadığı hâlde
   * kırmızıya döndü. Sayının kendisi zaten bir şey kanıtlamıyor —
   * kanıtlayan şey, kafenin gördüğü satır sayısının **ona ait olan**
   * satır sayısına eşit olması: ne eksik, ne fazla.
   */
  test("kendi masalarını görür — hepsini ve yalnızca onları", async () => {
    const gorulen = await withCafe(kafeA, (db) => db.all("SELECT id FROM cafe_tables"));
    const gercek = await withBypass("test: kafe a masaları", (db) =>
      db.one<{ n: string }>(`SELECT count(*)::text AS n FROM cafe_tables WHERE cafe_id = $1`, [
        kafeA,
      ]),
    );

    assert.ok(gorulen.length > 0, "test kurulumu: kafenin hiç masası yok");
    assert.equal(gorulen.length, Number(gercek?.n), "kafe kendi satırlarının hepsini görmüyor");
  });

  test("WHERE yazılmasa bile başka kafenin masalarını GÖRMEZ", async () => {
    // Dikkat: sorguda cafe_id süzgeci YOK. Satırları süzen şey RLS.
    const satirlar = await withCafe(kafeA, (db) =>
      db.all<{ cafe_id: string }>("SELECT cafe_id FROM cafe_tables"),
    );
    assert.ok(satirlar.length > 0);
    assert.ok(
      satirlar.every((r) => r.cafe_id === kafeA),
      "başka kafenin satırı sızdı",
    );
  });

  /**
   * 🔴 Ü104'te açılan gerçek sızıntı — soyut değil, `happy.programlar`
   * ve `happy.programKur` üzerinden.
   *
   * Göç 0030 tabloyu RLS'siz açmıştı. `programKur` içindeki
   * `UPDATE ... WHERE weekday = $1 AND active` ev usulü `cafe_id` süzgeci
   * yazmıyor; politika yokken bu, **bir kafenin bütün kafelerin aynı gün
   * programını kapatması** demekti. Okuma tarafı da aynı: Kafe A'nın
   * paneli Kafe B'nin havuz tutarlarını gösterirdi.
   */
  test("🔴 happy hour programında okuma ve YAZMA sızıntısı yok", async () => {
    await withBypass("test: program kurulumu", (db) =>
      db.query(
        `INSERT INTO happy_hour_plans
           (id, cafe_id, weekday, start_minute, duration_min, pool_kurus, created_by)
         SELECT 'hhp_izole_' || c.slug, c.id, 2, 840, 120, 50000,
                (SELECT id FROM staff WHERE cafe_id = c.id LIMIT 1)
           FROM cafes c WHERE c.slug IN ('kafe-a','kafe-b')
         ON CONFLICT (id) DO NOTHING`,
      ),
    );

    try {
      // Okuma: sorguda cafe_id süzgeci YOK, süzen şey RLS.
      const gorulen = await withCafe(kafeA, (db) =>
        db.all<{ cafe_id: string }>(`SELECT cafe_id FROM happy_hour_plans WHERE active`),
      );
      assert.ok(gorulen.length > 0, "test kurulumu: Kafe A'nın programı yok");
      assert.ok(
        gorulen.every((r) => r.cafe_id === kafeA),
        "başka kafenin happy hour programı sızdı",
      );

      // Yazma: Kafe A salıyı kapatıyor. Kafe B'nin salısı AÇIK kalmalı.
      await withCafe(kafeA, (db) =>
        db.query(`UPDATE happy_hour_plans SET active = false WHERE weekday = 2 AND active`),
      );

      const bDurumu = await withBypass("test: kafe b programı", (db) =>
        db.one<{ active: boolean }>(
          `SELECT active FROM happy_hour_plans WHERE id = 'hhp_izole_kafe-b'`,
        ),
      );
      assert.equal(
        bDurumu?.active,
        true,
        "Kafe A'nın yazması Kafe B'nin programını kapattı",
      );
    } finally {
      await yoneticiSorgu(`DELETE FROM happy_hour_plans WHERE id LIKE 'hhp_izole_%'`);
    }
  });

  test("başka kafenin kuponunu id ile bile okuyamaz", async () => {
    const kuponB = await withBypass("test", (db) =>
      db.one<{ id: string }>("SELECT id FROM coupons WHERE cafe_id = $1", [kafeB]),
    );
    assert.ok(kuponB);

    const bulunan = await withCafe(kafeA, (db) =>
      db.all("SELECT id FROM coupons WHERE id = $1", [kuponB.id]),
    );
    assert.equal(bulunan.length, 0, "id doğrudan verilse bile satır dönmemeli");
  });

  test("başka kafenin bütçe defterini okuyamaz", async () => {
    const satirlar = await withCafe(kafeA, (db) =>
      db.all("SELECT id FROM budget_ledger WHERE cafe_id = $1", [kafeB]),
    );
    assert.equal(satirlar.length, 0);
  });

  test("başka kafe adına satır YAZAMAZ", async () => {
    await assert.rejects(
      () =>
        withCafe(kafeA, (db) =>
          db.query(
            `INSERT INTO products (id, cafe_id, name, price_kurus)
             VALUES ('prd_sizinti', $1, 'Sızıntı', 100)`,
            [kafeB],
          ),
        ),
      /row-level security|policy/i,
      "WITH CHECK politikası bu eklemeyi reddetmeliydi",
    );
  });

  test("oyuncunun kişisel verisine hiç erişemez (G1)", async () => {
    const satirlar = await withCafe(kafeA, (db) => db.all("SELECT id FROM players"));
    assert.equal(satirlar.length, 0, "kafe players tablosundan tek satır bile görmemeli");
  });

  test("gördüğü tek kimlik anonim koddur ve kafeye özeldir", async () => {
    const a = await withCafe(kafeA, (db) =>
      db.one<{ code: string }>("SELECT code FROM player_aliases WHERE player_id = $1", [oyuncu]),
    );
    const b = await withCafe(kafeB, (db) =>
      db.one<{ code: string }>("SELECT code FROM player_aliases WHERE player_id = $1", [oyuncu]),
    );
    assert.ok(a?.code && b?.code);
    assert.notEqual(a.code, b.code, "aynı oyuncunun kodu iki kafede AYNI olmamalı");
  });
});

describe("oyuncu bağlamı", () => {
  test("kendi kuponlarını görür", async () => {
    const satirlar = await withPlayer(oyuncu, (db) =>
      db.all<{ player_id: string }>("SELECT player_id FROM coupons"),
    );
    assert.ok(satirlar.length > 0);
    assert.ok(satirlar.every((r) => r.player_id === oyuncu));
  });

  test("kafe personelini göremez", async () => {
    const satirlar = await withPlayer(oyuncu, (db) => db.all("SELECT id FROM staff"));
    assert.equal(satirlar.length, 0);
  });

  test("başka kafenin ürün listesini göremez", async () => {
    const satirlar = await withPlayer(oyuncu, (db) => db.all("SELECT id FROM products"));
    assert.equal(satirlar.length, 0, "ürünler kafe bağlamına aittir");
  });
});

describe("bağlamsız erişim", () => {
  test("hiçbir oturum değişkeni kurulmadan satır dönmez", async () => {
    // Güvenli varsayılan: bağlam yoksa veri yok.
    const client = await appPool().connect();
    try {
      const r = await client.query("SELECT id FROM cafe_tables");
      assert.equal(r.rowCount, 0, "bağlamsız sorgu satır döndürdü — RLS açık değil");
    } finally {
      client.release();
    }
  });
});

describe("değiştirilemez defterler", () => {
  test("uygulama rolü denetim izini güncelleyemez", async () => {
    await assert.rejects(
      () => withBypass("test", (db) => db.query("UPDATE audit_log SET action = 'sahte'")),
      /permission denied/i,
    );
  });

  test("uygulama rolü puan defterini güncelleyemez", async () => {
    await assert.rejects(
      () => withBypass("test", (db) => db.query("UPDATE points_ledger SET delta = 999999")),
      /permission denied/i,
    );
  });

  test("uygulama rolü bütçe defterini güncelleyemez", async () => {
    await assert.rejects(
      () => withBypass("test", (db) => db.query("UPDATE budget_ledger SET amount_kurus = 0")),
      /permission denied/i,
    );
  });

  test("uygulama rolü kupon silemez", async () => {
    await assert.rejects(
      () => withBypass("test", (db) => db.query("DELETE FROM coupons")),
      /permission denied/i,
    );
  });
});

describe("uygulama rolü yetkileri", () => {
  /**
   * Bu test bir hatadan doğdu: `schema_migrations` tablosu, yetkileri veren
   * göçten ÖNCE oluşturulduğu için uygulama rolü onu okuyamıyordu ve sistem
   * durumu ekranı sessizce "veritabanına bağlanılamadı" gösteriyordu.
   *
   * Tek tablo düzeltmek yetmez — sorun sınıfı şu: "yeni bir tablo eklenir,
   * yetkisi unutulur, hata ancak o tabloya dokunulduğunda ortaya çıkar."
   * Bu test her tabloyu tek tek yoklayarak o sınıfı kapatıyor.
   */
  test("her tabloyu okuyabiliyor", async () => {
    const tablolar = await withBypass("test: tablo listesi", (db) =>
      db.all<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          ORDER BY table_name`,
      ),
    );

    assert.ok(tablolar.length >= 20, `beklenenden az tablo: ${tablolar.length}`);

    const okunamayan: string[] = [];
    for (const { table_name } of tablolar) {
      try {
        await withBypass("test: okuma yetkisi", (db) =>
          db.query(`SELECT 1 FROM ${table_name} LIMIT 1`),
        );
      } catch (err) {
        okunamayan.push(`${table_name} (${(err as Error).message})`);
      }
    }

    assert.deepEqual(okunamayan, [], "uygulama rolü bu tabloları okuyamıyor");
  });

  /**
   * 🔴 Bu test de bir hatadan doğdu ve yukarıdakiyle aynı sınıfı kapatıyor.
   *
   * Göç 0030 `happy_hour_plans` tablosunu açtı ve **RLS kurmayı atladı.**
   * Şemadaki `cafe_id` taşıyan diğer bütün tablolarda politikalar vardı;
   * bu tek tablo dışarıda kalmıştı ve kimse fark etmedi.
   *
   * Sonucu okuma değil **yazma** sızıntısıydı: `programKur` içindeki
   * `UPDATE ... WHERE weekday = $1 AND active` — ev usulü `cafe_id`
   * süzgeci yazmıyor, izolasyonu politikaya bırakıyor — salıya program
   * kuran kafenin bütün kafelerin salı programını kapatması demekti.
   *
   * Tek tabloyu düzeltmek yetmez. Sorun sınıfı şu: **"cafe_id taşıyan
   * yeni bir tablo eklenir, RLS unutulur, sızıntı ancak ikinci kafe o
   * özelliği kullanınca görünür."** Bu test her yeni tabloyu
   * kendiliğinden kapsıyor.
   */
  test("🔴 cafe_id taşıyan HER tabloda RLS açık ve zorunlu", async () => {
    const acik = await withBypass("test: rls durumu", (db) =>
      db.all<{ tablo: string; rls: boolean; zorunlu: boolean }>(
        `SELECT c.relname AS tablo,
                c.relrowsecurity      AS rls,
                c.relforcerowsecurity AS zorunlu
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relkind = 'r'
            AND EXISTS (
              SELECT 1 FROM information_schema.columns col
               WHERE col.table_schema = 'public'
                 AND col.table_name = c.relname
                 AND col.column_name = 'cafe_id'
            )
          ORDER BY c.relname`,
      ),
    );

    assert.ok(acik.length >= 15, `beklenenden az kiracı tablosu: ${acik.length}`);

    const korumasiz = acik
      .filter((t) => !t.rls || !t.zorunlu)
      .map((t) => `${t.tablo} (rls=${t.rls}, zorunlu=${t.zorunlu})`);

    assert.deepEqual(korumasiz, [], "bu kiracı tablolarında RLS eksik");
  });

  /**
   * RLS açık olmak tek başına yetmiyor: politikası **hiç olmayan** tablo,
   * açık RLS ile kimseye satır göstermez ve özellik sessizce ölür.
   * `happy_hour_plans` tam olarak bu durumdaydı — sıfır politika.
   *
   * ⚠️ Politikaların **adı** sınanmıyor, yalnızca varlığı. `fraud_flags`
   * bilerek yalnızca `bypass` taşıyor (platform tablosu, kafe görmemeli),
   * `player_badges` ise `owner` politikası kullanıyor. Şablona uymayan bu
   * tercihler doğru; testin işi kuralı değil **boşluğu** yakalamak.
   */
  test("🔴 RLS açık olan her kiracı tablosunun en az bir politikası var", async () => {
    const politikasiz = await withBypass("test: politika sayımı", (db) =>
      db.all<{ tablo: string }>(
        `SELECT c.relname AS tablo
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relkind = 'r'
            AND c.relrowsecurity
            AND EXISTS (
              SELECT 1 FROM information_schema.columns col
               WHERE col.table_schema = 'public'
                 AND col.table_name = c.relname
                 AND col.column_name = 'cafe_id'
            )
            AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
          ORDER BY c.relname`,
      ),
    );

    assert.deepEqual(
      politikasiz.map((e) => e.tablo),
      [],
      "bu tablolarda RLS açık ama hiç politika yok — kimse satır göremez",
    );
  });

  test("append-only defterlere yazabiliyor ama değiştiremiyor", async () => {
    // Yalnızca INSERT yetkisi olmalı; UPDATE yetkisi 0004'te alındı.
    for (const tablo of ["audit_log", "points_ledger", "budget_ledger"]) {
      const yetki = await withBypass("test: yetki kontrolü", (db) =>
        db.one<{ ins: boolean; upd: boolean; del: boolean }>(
          `SELECT has_table_privilege('cafeplay_app', $1, 'INSERT') AS ins,
                  has_table_privilege('cafeplay_app', $1, 'UPDATE') AS upd,
                  has_table_privilege('cafeplay_app', $1, 'DELETE') AS del`,
          [tablo],
        ),
      );
      assert.equal(yetki?.ins, true, `${tablo}: INSERT yetkisi olmalı`);
      assert.equal(yetki?.upd, false, `${tablo}: UPDATE yetkisi OLMAMALI`);
      assert.equal(yetki?.del, false, `${tablo}: DELETE yetkisi OLMAMALI`);
    }
  });
});

describe("iş kuralları veritabanı seviyesinde", () => {
  test("bütçe tabanın altına inemez (Ü6)", async () => {
    await assert.rejects(
      () =>
        withBypass("test", (db) =>
          db.query(
            `INSERT INTO budget_periods (id, cafe_id, period_start, period_end, committed_kurus)
             VALUES ('bgt_dusuk', $1, '2030-01-07', '2030-01-08', 100000)`,
            [kafeA],
          ),
        ),
      // Ü45 ile dönem günlük oldu ve kısıt `butce_tabani_gunluk` adını aldı
      // (göç 0020): taban artık gün başına 1.500 TL. Sınanan güvence
      // değişmedi — kod atlansa bile şema düşük taahhüdü reddediyor.
      /butce_tabani_gunluk|committed_kurus/i,
      "1.000 TL'lik günlük bütçe kabul edilmemeliydi — taban 1.500 TL",
    );
  });

  test("limitsiz yüzde kampanyası kaydedilemez (Ü8)", async () => {
    const urun = await withBypass("test", (db) =>
      db.one<{ id: string }>("SELECT id FROM products WHERE cafe_id = $1", [kafeA]),
    );
    const personel = await withBypass("test", (db) =>
      db.one<{ id: string }>("SELECT id FROM staff WHERE cafe_id = $1", [kafeA]),
    );

    await assert.rejects(
      () =>
        withBypass("test", (db) =>
          db.query(
            `INSERT INTO percentage_campaigns
               (id, cafe_id, product_id, percent, daily_limit, starts_at, ends_at, created_by)
             VALUES ('cmp_limitsiz', $1, $2, 50, NULL, now(), now() + interval '7 days', $3)`,
            [kafeA, urun!.id, personel!.id],
          ),
        ),
      /daily_limit|null/i,
      "adet limiti olmayan kampanya kabul edilmemeliydi",
    );
  });

  test("kupon personel onayı olmadan kullanıldı işaretlenemez (A4)", async () => {
    await assert.rejects(
      () =>
        withBypass("test", (db) =>
          db.query(
            `UPDATE coupons SET status = 'redeemed', redeemed_at = now()
              WHERE cafe_id = $1`,
            [kafeA],
          ),
        ),
      /check|constraint/i,
      "redeemed_by_staff_id boşken durum redeemed olamamalı",
    );
  });
});
