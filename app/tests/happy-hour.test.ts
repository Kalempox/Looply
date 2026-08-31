import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import * as happy from "@/domain/happy";
import * as butce from "@/domain/butce";
import { isGunu } from "@/lib/tarih";
import { yoneticiSorgu } from "./_yardim";

/**
 * Ö3 · HAPPY HOUR HAVUZU.
 *
 * Asıl iddia tek cümlede: **havuz bir tavan, ayrı bir kese değil.**
 * Pencere açmak bütçeye dokunmuyor; kapanınca iade edilecek bir şey yok
 * çünkü hiçbir şey ayrılmadı. E10 ve E11'in dört sayılı formülü aynen
 * duruyor.
 *
 * Ayrıca spec'in dört kuralı: süre 1–4 saat, günde en fazla iki pencere,
 * pencereler çakışamaz, havuz bitince pencere kapanır.
 */

let kafeA = "";
let yoneticiA = "";
const bugun = isGunu();

/** Bugün İstanbul saatiyle verilen saatte bir an. */
function saat(h: number, dk = 0): Date {
  return new Date(`${bugun}T${String(h).padStart(2, "0")}:${String(dk).padStart(2, "0")}:00+03:00`);
}

async function temizle() {
  await yoneticiSorgu(`UPDATE coupons SET happy_hour_id = NULL WHERE happy_hour_id IS NOT NULL`);
  await yoneticiSorgu(`DELETE FROM audit_log WHERE target_type = 'happy_hour'`);
  await yoneticiSorgu(`DELETE FROM happy_hours WHERE cafe_id = $1`, [kafeA]);
}

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const y = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [a!.id],
    );
    return { a: a?.id, y: y?.id };
  });
  assert.ok(v.a && v.y, "Tohum verisi eksik — önce: npm run db:seed");
  kafeA = v.a;
  yoneticiA = v.y;

  await temizle();
});

after(async () => {
  await temizle();
  await closePools();
});

/* ═══════════════════════════════════════════════════════════
   1 · Spec'in dört kuralı
   ═══════════════════════════════════════════════════════════ */

describe("pencere kuralları (Ö3)", () => {
  test("normal pencere açılıyor", async () => {
    const s = await happy.pencereAc({
      cafeId: kafeA,
      baslangic: saat(14),
      bitis: saat(17),
      havuzKurus: 40_000,
      aktorId: yoneticiA,
      gun: bugun,
    });
    assert.ok(s.ok, s.ok === false ? s.hata : "");
    await temizle();
  });

  test("1 saatten kısa pencere reddediliyor", async () => {
    const s = await happy.pencereAc({
      cafeId: kafeA,
      baslangic: saat(14),
      bitis: saat(14, 30),
      havuzKurus: 40_000,
      aktorId: yoneticiA,
      gun: bugun,
    });
    assert.equal(s.ok, false, "yarım saatlik pencere kabul edildi");
  });

  test("4 saatten uzun pencere reddediliyor — tüm gün süren havuz havuz değildir", async () => {
    const s = await happy.pencereAc({
      cafeId: kafeA,
      baslangic: saat(9),
      bitis: saat(20),
      havuzKurus: 40_000,
      aktorId: yoneticiA,
      gun: bugun,
    });
    assert.equal(s.ok, false);
  });

  test("sıfır havuz reddediliyor", async () => {
    const s = await happy.pencereAc({
      cafeId: kafeA,
      baslangic: saat(14),
      bitis: saat(17),
      havuzKurus: 0,
      aktorId: yoneticiA,
      gun: bugun,
    });
    assert.equal(s.ok, false);
  });

  test("günde en fazla iki pencere", async () => {
    await temizle();
    const a = await happy.pencereAc({
      cafeId: kafeA, baslangic: saat(9), bitis: saat(11),
      havuzKurus: 10_000, aktorId: yoneticiA, gun: bugun,
    });
    const b = await happy.pencereAc({
      cafeId: kafeA, baslangic: saat(14), bitis: saat(16),
      havuzKurus: 10_000, aktorId: yoneticiA, gun: bugun,
    });
    const c = await happy.pencereAc({
      cafeId: kafeA, baslangic: saat(18), bitis: saat(20),
      havuzKurus: 10_000, aktorId: yoneticiA, gun: bugun,
    });

    assert.ok(a.ok && b.ok, "ilk iki pencere açılmadı");
    assert.equal(c.ok, false, "üçüncü pencere açıldı — 'sürekli happy hour' kapısı");
    await temizle();
  });

  test("çakışan pencere reddediliyor", async () => {
    // Spec'te yazmıyor ama zorunlu: iki açık pencere olsaydı biri sessizce
    // kullanılmaz, kafe ayırdığı parayı neden dağıtamadığını anlayamazdı.
    await temizle();
    const a = await happy.pencereAc({
      cafeId: kafeA, baslangic: saat(14), bitis: saat(17),
      havuzKurus: 10_000, aktorId: yoneticiA, gun: bugun,
    });
    assert.ok(a.ok);

    const b = await happy.pencereAc({
      cafeId: kafeA, baslangic: saat(16), bitis: saat(18),
      havuzKurus: 10_000, aktorId: yoneticiA, gun: bugun,
    });
    assert.equal(b.ok, false, "çakışan pencere açıldı");
    await temizle();
  });

  test("kapatılan pencere kotadan düşüyor ama satırı duruyor", async () => {
    await temizle();
    const a = await happy.pencereAc({
      cafeId: kafeA, baslangic: saat(9), bitis: saat(11),
      havuzKurus: 10_000, aktorId: yoneticiA, gun: bugun,
    });
    assert.ok(a.ok);

    await happy.pencereKapat({ cafeId: kafeA, pencereId: a.ok ? a.id : "", aktorId: yoneticiA });

    const liste = await happy.bugunkuler(kafeA, bugun);
    assert.equal(liste.length, 1, "kapatılan pencere listeden silindi");
    assert.equal(liste[0].iptalMi, true);

    // Kapatılan pencere kotayı işgal etmiyor: iki yeni pencere daha açılabilmeli.
    const b = await happy.pencereAc({
      cafeId: kafeA, baslangic: saat(14), bitis: saat(16),
      havuzKurus: 10_000, aktorId: yoneticiA, gun: bugun,
    });
    assert.ok(b.ok, "kapatılan pencere kotayı işgal etti");
    await temizle();
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Havuz bütçeye dokunmuyor — asıl iddia
   ═══════════════════════════════════════════════════════════ */

describe("havuz bir tavan, kese değil", () => {
  test("pencere açmak bütçenin hiçbir sayısını değiştirmiyor", async () => {
    await temizle();
    const once = await butce.durum(kafeA, bugun);

    const s = await happy.pencereAc({
      cafeId: kafeA, baslangic: saat(14), bitis: saat(17),
      havuzKurus: 40_000, aktorId: yoneticiA, gun: bugun,
    });
    assert.ok(s.ok);

    const sonra = await butce.durum(kafeA, bugun);
    assert.deepEqual(
      {
        d: sonra.dagitilabilirKurus,
        r: sonra.rezerveKurus,
        h: sonra.harcananKurus,
        i: sonra.iadeKurus,
      },
      {
        d: once.dagitilabilirKurus,
        r: once.rezerveKurus,
        h: once.harcananKurus,
        i: once.iadeKurus,
      },
      "pencere açmak bütçeye dokundu — havuz kese gibi davranıyor",
    );
    await temizle();
  });

  test("pencere kapatmak da bütçeye dokunmuyor — iade edilecek bir şey yok", async () => {
    await temizle();
    const s = await happy.pencereAc({
      cafeId: kafeA, baslangic: saat(14), bitis: saat(17),
      havuzKurus: 40_000, aktorId: yoneticiA, gun: bugun,
    });
    assert.ok(s.ok);

    const once = await butce.durum(kafeA, bugun);
    await happy.pencereKapat({ cafeId: kafeA, pencereId: s.ok ? s.id : "", aktorId: yoneticiA });
    const sonra = await butce.durum(kafeA, bugun);

    assert.equal(sonra.dagitilabilirKurus, once.dagitilabilirKurus);
    assert.equal(sonra.iadeKurus, once.iadeKurus, "kapanışta iade satırı yazıldı");
    await temizle();
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Açıklık ve havuzun erimesi
   ═══════════════════════════════════════════════════════════ */

describe("pencerenin açıklığı", () => {
  test("saati gelmemiş pencere açık değil", async () => {
    await temizle();
    // Gelecekte bir pencere: bugünün son saatlerine koyuyoruz.
    await yoneticiSorgu(
      `INSERT INTO happy_hours (id, cafe_id, business_date, starts_at, ends_at, pool_kurus, created_by)
       VALUES ($1,$2,$3, now() + interval '2 hours', now() + interval '4 hours', 40000, $4)`,
      [`hh_test_${randomInt(100000)}`, kafeA, bugun, yoneticiA],
    );

    assert.equal(await happy.acikPencere(kafeA), null, "saati gelmemiş pencere açık göründü");
    await temizle();
  });

  test("saati geçmiş pencere açık değil", async () => {
    await temizle();
    await yoneticiSorgu(
      `INSERT INTO happy_hours (id, cafe_id, business_date, starts_at, ends_at, pool_kurus, created_by)
       VALUES ($1,$2,$3, now() - interval '4 hours', now() - interval '2 hours', 40000, $4)`,
      [`hh_test_${randomInt(100000)}`, kafeA, bugun, yoneticiA],
    );

    assert.equal(await happy.acikPencere(kafeA), null);
    await temizle();
  });

  test("şu an süren pencere açık", async () => {
    await temizle();
    const id = `hh_test_${randomInt(100000)}`;
    await yoneticiSorgu(
      `INSERT INTO happy_hours (id, cafe_id, business_date, starts_at, ends_at, pool_kurus, created_by)
       VALUES ($1,$2,$3, now() - interval '30 minutes', now() + interval '90 minutes', 40000, $4)`,
      [id, kafeA, bugun, yoneticiA],
    );

    const p = await happy.acikPencere(kafeA);
    assert.ok(p, "süren pencere açık görünmedi");
    assert.equal(p.id, id);
    assert.equal(p.kalanKurus, 40_000, "hiç ödül verilmeden havuz eridi");
    await temizle();
  });

  test("havuzu biten pencere açık sayılmıyor — oyun oynanır, ödül çıkmaz", async () => {
    await temizle();
    const id = `hh_test_${randomInt(100000)}`;
    await yoneticiSorgu(
      `INSERT INTO happy_hours (id, cafe_id, business_date, starts_at, ends_at, pool_kurus, created_by)
       VALUES ($1,$2,$3, now() - interval '30 minutes', now() + interval '90 minutes', 1000, $4)`,
      [id, kafeA, bugun, yoneticiA],
    );

    // Havuzu tüketen bir kupon etiketle.
    const kupon = await withBypass("test: kupon", (db) =>
      db.one<{ id: string }>(
        `SELECT id FROM coupons WHERE cafe_id = $1 ORDER BY issued_at DESC LIMIT 1`,
        [kafeA],
      ),
    );

    if (kupon) {
      await yoneticiSorgu(
        `UPDATE coupons SET happy_hour_id = $1, reserved_kurus = 1000 WHERE id = $2`,
        [id, kupon.id],
      );

      assert.equal(await happy.acikPencere(kafeA), null, "havuzu biten pencere açık kaldı");

      const liste = await happy.bugunkuler(kafeA, bugun);
      assert.equal(liste[0].kalanKurus, 0);
      assert.equal(liste[0].havuzBittiMi, true);
    }
    await temizle();
  });

  test("başka kafenin penceresi görünmüyor", async () => {
    await temizle();
    const digeri = await withBypass("test: diğer kafe", (db) =>
      db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'"),
    );

    await yoneticiSorgu(
      `INSERT INTO happy_hours (id, cafe_id, business_date, starts_at, ends_at, pool_kurus, created_by)
       VALUES ($1,$2,$3, now() - interval '30 minutes', now() + interval '90 minutes', 40000,
               (SELECT id FROM staff WHERE cafe_id = $2 AND role = 'manager' LIMIT 1))`,
      [`hh_test_${randomInt(100000)}`, digeri!.id, bugun],
    );

    assert.equal(await happy.acikPencere(kafeA), null, "başka kafenin penceresi sızdı");

    await yoneticiSorgu(`DELETE FROM happy_hours WHERE cafe_id = $1`, [digeri!.id]);
    await temizle();
  });
});

/* ═══════════════════════════════════════════════════════════
   4 · Denetim izi
   ═══════════════════════════════════════════════════════════ */

describe("denetim izi", () => {
  test("pencere açma ve kapatma kayda geçiyor", async () => {
    await temizle();
    const s = await happy.pencereAc({
      cafeId: kafeA, baslangic: saat(14), bitis: saat(17),
      havuzKurus: 40_000, aktorId: yoneticiA, gun: bugun,
    });
    assert.ok(s.ok);
    await happy.pencereKapat({ cafeId: kafeA, pencereId: s.ok ? s.id : "", aktorId: yoneticiA });

    const izler = await withBypass("test: denetim", (db) =>
      db.all<{ action: string }>(
        `SELECT action FROM audit_log WHERE target_id = $1 ORDER BY created_at`,
        [s.ok ? s.id : ""],
      ),
    );
    assert.deepEqual(
      izler.map((i) => i.action),
      ["happyhour.open", "happyhour.close"],
    );
    await temizle();
  });
});
