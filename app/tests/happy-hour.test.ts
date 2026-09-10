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


/* ═══════════════════════════════════════════════════════════
   Haftalık program ve ayrı bütçe (Ü104)
   ═══════════════════════════════════════════════════════════ */

/**
 * Kafenin açık olduğu bir an (Ü90).
 *
 * Tempo, kafe kapalıyken hiç ödül dağıtmıyor ve testin koştuğu saat
 * belirsiz; sabit bir an vermezsek test gece koştuğunda "bütçe doldu"
 * diye düşer — yani sınadığı şeyi değil, günün saatini ölçer.
 */
const KAFE_ACIK = new Date("2026-09-10T20:00:00+03:00");

describe("haftalık program (Ü104)", () => {
  after(async () => {
    await yoneticiSorgu(`DELETE FROM happy_hours WHERE plan_id IS NOT NULL`);
    await yoneticiSorgu(`DELETE FROM happy_hour_plans WHERE cafe_id = $1`, [kafeA]);
  });

  test("her güne ayrı saat ve havuz kurulabiliyor", async () => {
    // ⚠️ Ürün sahibi: "ister haftanın her günü belirli saat, ister farklı
    // günlerde farklı saatler." Tek bir kalıp sorulanın yarısını
    // karşılardı — kafenin salı ve cumartesi boş saatleri aynı değil.
    const s1 = await happy.programKur({
      cafeId: kafeA,
      haftaGunu: 2,
      baslangicDakika: 14 * 60,
      sureDakika: 180,
      havuzKurus: 40000,
      aktorId: yoneticiA,
    });
    assert.ok(s1.ok, s1.ok === false ? s1.hata : "");

    const s2 = await happy.programKur({
      cafeId: kafeA,
      haftaGunu: 6,
      baslangicDakika: 10 * 60 + 30,
      sureDakika: 120,
      havuzKurus: 25000,
      aktorId: yoneticiA,
    });
    assert.ok(s2.ok, s2.ok === false ? s2.hata : "");

    const liste = await happy.programlar(kafeA);
    const sali = liste.find((p) => p.haftaGunu === 2);
    const cmt = liste.find((p) => p.haftaGunu === 6);
    assert.equal(sali?.baslangicDakika, 840);
    assert.equal(cmt?.baslangicDakika, 630, "cumartesi salının saatini aldı");
    assert.notEqual(sali?.havuzKurus, cmt?.havuzKurus);
  });

  test("aynı güne ikinci program kurmak öncekini değiştiriyor", async () => {
    // Haftagünü başına tek aktif program: iki program aynı güne düşseydi
    // hangisinin açılacağı belirsiz olurdu.
    await happy.programKur({
      cafeId: kafeA,
      haftaGunu: 3,
      baslangicDakika: 13 * 60,
      sureDakika: 60,
      havuzKurus: 10000,
      aktorId: yoneticiA,
    });
    await happy.programKur({
      cafeId: kafeA,
      haftaGunu: 3,
      baslangicDakika: 16 * 60,
      sureDakika: 120,
      havuzKurus: 30000,
      aktorId: yoneticiA,
    });

    const carsamba = (await happy.programlar(kafeA)).filter((p) => p.haftaGunu === 3);
    assert.equal(carsamba.length, 1, "aynı güne iki aktif program kaldı");
    assert.equal(carsamba[0].baslangicDakika, 960);
  });

  test("havuz boş bırakılınca o günün programı kalkıyor", async () => {
    await happy.programKur({
      cafeId: kafeA,
      haftaGunu: 4,
      baslangicDakika: 15 * 60,
      sureDakika: 60,
      havuzKurus: 10000,
      aktorId: yoneticiA,
    });
    await happy.programKur({
      cafeId: kafeA,
      haftaGunu: 4,
      baslangicDakika: null,
      sureDakika: null,
      havuzKurus: null,
      aktorId: yoneticiA,
    });

    const persembe = (await happy.programlar(kafeA)).filter((p) => p.haftaGunu === 4);
    assert.equal(persembe.length, 0, "program kalkmadı");
  });

  test("gece yarısını aşan program reddediliyor", async () => {
    // Ü90 ve Ü103'teki aynı bilinen sınır.
    const s = await happy.programKur({
      cafeId: kafeA,
      haftaGunu: 5,
      baslangicDakika: 23 * 60,
      sureDakika: 180,
      havuzKurus: 10000,
      aktorId: yoneticiA,
    });
    assert.equal(s.ok, false, "gece yarısını aşan program kabul edildi");
  });

  test("🔴 program bugüne pencere açıyor ve İKİNCİ KEZ açmıyor", async () => {
    /**
     * ⚠️ Bakım köprüsü dakikada bir koşuyor. Tekillik olmasaydı her dakika
     * yeni bir pencere doğar ve kafenin havuzu katlanarak açılırdı.
     */
    await yoneticiSorgu(`DELETE FROM happy_hours WHERE cafe_id = $1 AND business_date = $2`, [
      kafeA,
      isGunu(),
    ]);
    await yoneticiSorgu(`DELETE FROM happy_hour_plans WHERE cafe_id = $1`, [kafeA]);

    // Bugünün gününe, şu andan sonra biten bir pencere kur.
    const bugunHaftaGunu = happy.istanbulHaftaGunu(new Date());
    const s = await happy.programKur({
      cafeId: kafeA,
      haftaGunu: bugunHaftaGunu,
      baslangicDakika: 0,
      sureDakika: 240,
      havuzKurus: 20000,
      aktorId: yoneticiA,
    });
    assert.ok(s.ok, s.ok === false ? s.hata : "");

    const ilk = await happy.programlariUygula();
    const ikinci = await happy.programlariUygula();

    const sayi = await withBypass("test: bugünkü pencereler", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*)::text AS n FROM happy_hours
          WHERE cafe_id = $1 AND business_date = $2 AND plan_id IS NOT NULL`,
        [kafeA, isGunu()],
      ),
    );

    // İlk koşu açmış olabilir (saat penceresine bağlı); ikinci koşu ASLA
    // ikinci bir satır üretmemeli.
    assert.ok(Number(sayi?.n ?? 0) <= 1, `programdan ${sayi?.n} pencere açıldı`);
    assert.equal(ikinci, 0, "ikinci koşu yeni pencere açtı");
    assert.ok(ilk >= 0);
  });

  test("saati geçmiş program bugün için atlanıyor", async () => {
    // ⚠️ Akşam 20:00'de "öğlen 14:00'te happy hour vardı" diye pencere
    // açmak kimseye ödül dağıtmaz, yalnızca raporu kirletir.
    await yoneticiSorgu(`DELETE FROM happy_hours WHERE cafe_id = $1`, [kafeA]);
    await yoneticiSorgu(`DELETE FROM happy_hour_plans WHERE cafe_id = $1`, [kafeA]);

    const bugunHaftaGunu = happy.istanbulHaftaGunu(new Date());
    await happy.programKur({
      cafeId: kafeA,
      haftaGunu: bugunHaftaGunu,
      baslangicDakika: 0,
      sureDakika: 60,
      havuzKurus: 10000,
      aktorId: yoneticiA,
    });

    await happy.programlariUygula();

    const acilan = await withBypass("test: gece pencere", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*)::text AS n FROM happy_hours
          WHERE cafe_id = $1 AND plan_id IS NOT NULL AND ends_at <= now()`,
        [kafeA],
      ),
    );
    assert.equal(Number(acilan?.n ?? 0), 0, "saati geçmiş pencere açıldı");
  });
});

describe("happy hour'un kendi bütçesi (Ü104)", () => {
  /**
   * ⚠️ Bu blok kafenin günlük bütçesini bilerek **tüketiyor** ve bütçe
   * defteri append-only (E3) — yani domain üzerinden geri alınamıyor.
   * Temizlemeseydik test dosyası kendi başına geçer, bütün takımla
   * koşarken kupon üreten her dosyayı düşürürdü: "bütçe doldu".
   *
   * Kendi yazdığı satırları `note` ile bulup siliyor; başkasının satırına
   * dokunmuyor.
   */
  after(async () => {
    await yoneticiSorgu(
      `DELETE FROM budget_ledger WHERE cafe_id = $1 AND note LIKE 'test %'`,
      [kafeA],
    );
  });

  test("🔴 havuz günlük bütçeye EKLENİYOR, ondan kesilmiyor", async () => {
    /**
     * Ürün sahibi: *"happy hour'a özel bütçe olacak ve sistem ona göre
     * dağıtacak."*
     *
     * Sınama: günlük bütçe tamamen tüketiliyor, sonra `ekHavuzKurus` ile
     * bir rezervasyon deneniyor. Havuz ayrı para olduğu için geçmeli.
     */
    const d = await butce.durum(kafeA);
    assert.ok(d.donem, "test kurulumu: dönem yok");

    /**
     * Günlük payı tüket.
     *
     * ⚠️ `dagitilabilirKurus` **günlük** kalanı söylüyor ama rezervasyon
     * tempo tavanına da bakıyor (Ü87) ve o, günün saatine bağlı. Tek
     * seferde o tutarı rezerve etmeye çalışan ilk sürüm bu yüzden düştü —
     * sınadığı şeyi değil, günün saatini ölçüyordu.
     *
     * Onun yerine reddedilene kadar küçülterek doldur: kaç kuruş kaldığını
     * bilmemize gerek yok, "artık yer yok" durumuna ulaşmamız yeterli.
     */
    let adim = Math.max(1000, Math.floor(d.dagitilabilirKurus / 4));
    for (let i = 0; i < 40 && adim >= 1000; i++) {
      const ok = await withBypass("test: günlük payı doldur", (db) =>
        butce.rezerveEt(db, {
          cafeId: kafeA,
          kurus: adim,
          not: "test hh doldur",
          an: KAFE_ACIK,
        }),
      );
      if (!ok) adim = Math.floor(adim / 2);
    }

    // Artık günlük bütçe bitti: eksiz rezervasyon reddedilmeli.
    const eksiz = await withBypass("test: eksiz", (db) =>
      butce.rezerveEt(db, { cafeId: kafeA, kurus: 5000, not: "test eksiz", an: KAFE_ACIK }),
    );
    assert.equal(eksiz, false, "günlük bütçe bittiği hâlde rezervasyon geçti");

    // Happy hour havuzuyla aynı tutar geçmeli — ayrı para.
    const ekli = await withBypass("test: havuzla", (db) =>
      butce.rezerveEt(db, {
        cafeId: kafeA,
        kurus: 5000,
        not: "test havuzla",
        an: KAFE_ACIK,
        ekHavuzKurus: 10000,
      }),
    );
    assert.equal(ekli, true, "happy hour havuzu günlük bütçeye eklenmedi");
  });

  test("havuz sınırsız değil — havuzdan büyük tutar yine reddediliyor", async () => {
    // Havuz ayrı para ama sonsuz değil: kendi tavanı var.
    const asiri = await withBypass("test: havuzu aşan", (db) =>
      butce.rezerveEt(db, {
        cafeId: kafeA,
        kurus: 90000,
        not: "test asiri",
        an: KAFE_ACIK,
        ekHavuzKurus: 10000,
      }),
    );
    assert.equal(asiri, false, "havuzdan büyük tutar geçti");
  });
});
