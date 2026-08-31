import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { withCafe, withPlayer, withBypass } from "@/db/context";
import { appPool, closePools } from "@/db/pool";
import { normalizePhone, phoneIndex } from "@/lib/crypto";

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
  test("kendi masalarını görür", async () => {
    const satirlar = await withCafe(kafeA, (db) => db.all("SELECT id FROM cafe_tables"));
    assert.equal(satirlar.length, 9, "8 masa + kasa beklenir");
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
             VALUES ('bgt_dusuk', $1, '2030-01-07', '2030-01-14', 100000)`,
            [kafeA],
          ),
        ),
      // Kısıt Ü25 ile yeniden adlandırıldı (`butce_tabani_orantili`, göç 0011):
      // taban artık dönem uzunluğuna göre ölçekleniyor. Tam haftalık dönem
      // için beklenen davranış değişmedi — 1.000 TL yine reddediliyor.
      /butce_tabani_orantili|committed_kurus/i,
      "1.000 TL'lik bütçe kabul edilmemeliydi — tam haftada taban 1.500 TL",
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
