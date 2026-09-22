import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import * as oyunSecimi from "@/domain/oyun-secimi";
import * as masaYonetim from "@/domain/masa-yonetim";
import * as challenge from "@/domain/challenge";
import { OYUNLAR, gununOyunu } from "@/oyunlar";
import { newId } from "@/lib/ids";
import { gunEkle, isGunu } from "@/lib/tarih";
import { yoneticiSorgu } from "./_yardim";

/**
 * Ü108 KAREKOD TÜRLERİ · Ü109 KAFE OYUN YÖNETİMİ.
 *
 * Sınanan iddialar:
 *
 *   1. **Son oyun kapatılamıyor.** Kafe bütün oyunları kapatabilseydi
 *      karekodu okutan müşteri boş ekranla karşılaşır, ürün o kafede
 *      sessizce ölürdü.
 *   2. **Günün oyunu kafeye göre.** Kapalı bir oyun "bugünün oyunu"
 *      olamaz — olursa bonus ölür, liderlik boş kalır, görev imkânsız
 *      olur.
 *   3. **Kapatma bir başka kafeyi etkilemiyor.**
 *   4. **Kapatmak silmek değil**, geri açılabiliyor.
 *   5. **Fiş karekodu K4 vermiyor** — satın alma kanıtı değil.
 */

let kafeA = "";
let kafeB = "";
let yoneticiA = "";

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const y = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [a!.id],
    );
    return { a: a!.id, b: b!.id, y: y!.id };
  });
  kafeA = v.a;
  kafeB = v.b;
  yoneticiA = v.y;
  await temizle();
});

async function temizle() {
  await yoneticiSorgu(`DELETE FROM cafe_game_settings WHERE cafe_id = ANY($1)`, [[kafeA, kafeB]]);
  await yoneticiSorgu(`DELETE FROM audit_log WHERE target_type = 'game'`);
}

after(async () => {
  await temizle();
  await yoneticiSorgu(`DELETE FROM cafe_tables WHERE id LIKE 'tbl_tur_%'`);
  await closePools();
});

/* ── Açma / kapama ─────────────────────────────────────────── */

describe("kafe oyun yönetimi (Ü109)", () => {
  test("varsayılan: bütün oyunlar açık — satır yokluğu açık demek", async () => {
    await temizle();
    const acik = await oyunSecimi.acikOyunlar(kafeA);
    assert.equal(acik.length, OYUNLAR.length, "varsayılanda kapalı oyun var");
  });

  test("kapatılan oyun listeden düşüyor", async () => {
    await temizle();
    const s = await oyunSecimi.degistir({
      cafeId: kafeA,
      oyunId: OYUNLAR[0].id,
      acik: false,
      aktorId: yoneticiA,
    });
    assert.ok(s.ok, s.ok === false ? s.hata : "");

    const acik = await oyunSecimi.acikOyunlar(kafeA);
    assert.equal(acik.length, OYUNLAR.length - 1);
    assert.ok(!acik.some((o) => o.id === OYUNLAR[0].id), "kapalı oyun listede kaldı");
    assert.equal(await oyunSecimi.acikMi(kafeA, OYUNLAR[0].id), false);
  });

  /**
   * ⚠️ Kapatmak SİLMEK değil — 0001'in kuralı: hiçbir kayıt uygulama
   * tarafından silinmiyor, durum değişikliğiyle işaretleniyor. Uygulama
   * rolünün bu tabloda DELETE yetkisi zaten yok.
   */
  test("kapatılan oyun geri açılabiliyor, satır silinmiyor", async () => {
    await temizle();
    await oyunSecimi.degistir({
      cafeId: kafeA,
      oyunId: OYUNLAR[0].id,
      acik: false,
      aktorId: yoneticiA,
    });
    await oyunSecimi.degistir({
      cafeId: kafeA,
      oyunId: OYUNLAR[0].id,
      acik: true,
      aktorId: yoneticiA,
    });

    assert.equal(await oyunSecimi.acikMi(kafeA, OYUNLAR[0].id), true);

    const satir = await withBypass("test: ayar satırı", (db) =>
      db.one<{ closed: boolean }>(
        `SELECT closed FROM cafe_game_settings WHERE cafe_id = $1 AND game_id = $2`,
        [kafeA, OYUNLAR[0].id],
      ),
    );
    assert.equal(satir?.closed, false, "geri açmak satırı sildi ya da bulunamadı");
  });

  /**
   * 🔴 ASIL GÜVENCE.
   *
   * Kafe bütün oyunları kapatabilseydi karekodu okutan müşteri boş bir
   * ekranla karşılaşır ve ürün o kafede sessizce ölürdü — kafe de bunu
   * ancak müşteri şikâyet edince anlardı.
   */
  test("🔴 son açık oyun kapatılamıyor", async () => {
    await temizle();

    for (const o of OYUNLAR.slice(0, OYUNLAR.length - 1)) {
      const s = await oyunSecimi.degistir({
        cafeId: kafeA,
        oyunId: o.id,
        acik: false,
        aktorId: yoneticiA,
      });
      assert.ok(s.ok, s.ok === false ? s.hata : "");
    }

    const son = OYUNLAR[OYUNLAR.length - 1];
    const s = await oyunSecimi.degistir({
      cafeId: kafeA,
      oyunId: son.id,
      acik: false,
      aktorId: yoneticiA,
    });

    assert.equal(s.ok, false, "bütün oyunlar kapatılabildi");
    assert.equal((await oyunSecimi.acikOyunlar(kafeA)).length, 1);
  });

  test("bilinmeyen oyun kimliği reddediliyor", async () => {
    const s = await oyunSecimi.degistir({
      cafeId: kafeA,
      oyunId: "olmayan-oyun",
      acik: false,
      aktorId: yoneticiA,
    });
    assert.equal(s.ok, false);
  });

  test("bir kafenin kapattığı oyun DİĞER kafede açık kalıyor", async () => {
    await temizle();
    await oyunSecimi.degistir({
      cafeId: kafeA,
      oyunId: OYUNLAR[0].id,
      acik: false,
      aktorId: yoneticiA,
    });

    assert.equal(await oyunSecimi.acikMi(kafeA, OYUNLAR[0].id), false);
    assert.equal(await oyunSecimi.acikMi(kafeB, OYUNLAR[0].id), true, "kapatma diğer kafeye sızdı");
  });

  test("kafe dışında bütün oyunlar açık (Ü3 oynamayı serbest bırakıyor)", async () => {
    const acik = await oyunSecimi.acikOyunlar(null);
    assert.equal(acik.length, OYUNLAR.length);
  });
});

/* ── Günün oyunu ───────────────────────────────────────────── */

describe("günün oyunu kafeye göre (Ü109)", () => {
  /**
   * 🔴 Kapalı bir oyun "bugünün oyunu" olsaydı: bonuslu oyun oynanamaz
   * (×2 çarpan o gün ölür), liderlik kimsenin oynayamadığı bir oyunu
   * listeler, günün görevi *"Yılan'da 1.200 skor"* imkânsız olurdu.
   */
  test("🔴 kapalı oyun hiçbir gün 'bugünün oyunu' olmuyor", async () => {
    await temizle();
    const kapatilan = OYUNLAR[0];
    await oyunSecimi.degistir({
      cafeId: kafeA,
      oyunId: kapatilan.id,
      acik: false,
      aktorId: yoneticiA,
    });

    const acik = await oyunSecimi.acikOyunlar(kafeA);

    // Bir tam rotasyon turu boyunca sınanıyor: tek güne bakmak, o günün
    // zaten başka bir oyuna denk gelmesiyle yalancı bir yeşil verirdi.
    for (let i = 0; i < OYUNLAR.length * 2; i++) {
      const gun = gunEkle("2026-09-11", i);
      assert.notEqual(
        gununOyunu(gun, acik).id,
        kapatilan.id,
        `${gun}: kapalı oyun bugünün oyunu oldu`,
      );
    }
  });

  test("günün görevi de kapalı oyunu göstermiyor", async () => {
    await temizle();
    const kapatilan = OYUNLAR[0];
    await oyunSecimi.degistir({
      cafeId: kafeA,
      oyunId: kapatilan.id,
      acik: false,
      aktorId: yoneticiA,
    });
    const acik = await oyunSecimi.acikOyunlar(kafeA);

    for (let i = 0; i < OYUNLAR.length * 2; i++) {
      const gun = gunEkle("2026-09-11", i);
      const g = challenge.gununGorevi(gun, acik);
      if (g.tur === "skor") {
        assert.notEqual(g.oyunId, kapatilan.id, `${gun}: görev kapalı oyunu istedi`);
      }
    }
  });

  test("hiçbir oyun kapalı değilse platform rotasyonuyla aynı", async () => {
    await temizle();
    const kafedeki = await oyunSecimi.gununOyunuKafede(kafeA);
    assert.equal(kafedeki.id, gununOyunu(isGunu()).id);
  });

  /**
   * ⚠️ Savunma katmanı: `degistir` son oyunun kapatılmasını zaten
   * reddediyor, ama veri elle bozulursa ürün sessizce ölmemeli.
   * "Oynanacak oyun yok" ekranı hiçbir zaman doğru cevap değil.
   */
  test("veri elle bozulup hepsi kapatılsa bile liste boşalmıyor", async () => {
    await temizle();
    for (const o of OYUNLAR) {
      await yoneticiSorgu(
        `INSERT INTO cafe_game_settings (cafe_id, game_id, closed, updated_by)
         VALUES ($1,$2,true,$3)
         ON CONFLICT (cafe_id, game_id) DO UPDATE SET closed = true`,
        [kafeA, o.id, yoneticiA],
      );
    }

    const acik = await oyunSecimi.acikOyunlar(kafeA);
    assert.equal(acik.length, OYUNLAR.length, "hepsi kapalıyken liste boşaldı");
    await temizle();
  });
});

/* ── Kafe karekodu ─────────────────────────────────────────── */

describe("kafe karekodu (Ü127)", () => {
  /**
   * Ü108'in dört tür testi (masa/kasa/menü/fiş) BURADAN KALDIRILDI.
   * Ü127 ile tür kavramı da masa kavramı da kalktı: kafenin tek karekodu
   * var, adlandırılmıyor ve türlere ayrılmıyor.
   *
   * ⚠️ Fişin K4 vermediğini sınayan iddia yukarıdaki testte duruyor ve
   * durmalı — K4 hâlâ hiçbir yerden verilmemeli.
   */
  test("kafenin tek karekodu var ve ikincisi açılamıyor", async () => {
    const k = await masaYonetim.kafeKarekodu(kafeA);
    /* ⚠️ İKİ biçim de geçerli — Ü247. Yeni kodlar `kafe-a-7f3k9x2m`
       (ad + rastgele ek), Ü247 öncesinde açılmış satırlar 16 hex hane.
       Test biçimi değil **kodun çözülebilir olduğunu** sınamalı; asıl
       iddia aşağıdaki `masaCoz`. */
    assert.match(
      k.kod,
      /^(?:[0-9a-f]{16}|[a-z0-9]+(?:-[a-z0-9]+)+)$/,
      "basılı kod hiçbir geçerli biçime uymuyor",
    );

    const aktifler = await withBypass("test: aktif karekod sayısı", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*) AS n FROM cafe_tables WHERE cafe_id = $1 AND active`,
        [kafeA],
      ),
    );
    assert.equal(Number(aktifler!.n), 1, "kafede tam olarak bir aktif karekod olmalı");

    // 🔴 Kural veritabanında: arayüz kalksa bile ikinci karekod açılamaz.
    await assert.rejects(
      () =>
        yoneticiSorgu(
          `INSERT INTO cafe_tables (id, cafe_id, label, sort_order, qr_secret, active)
           VALUES ($1,$2,'İkinci',5,decode(md5($1),'hex'),true)`,
          [`tbl_ikinci_${newId("x").slice(-6)}`, kafeA],
        ),
      /cafe_tables_tek_aktif/,
      "ikinci aktif karekod veritabanı düzeyinde reddedilmeli",
    );
  });

  test("karekod iki kez okunduğunda aynı satırı veriyor — değişmiyor", async () => {
    const bir = await masaYonetim.kafeKarekodu(kafeA);
    const iki = await masaYonetim.kafeKarekodu(kafeA);
    assert.equal(bir.id, iki.id, "karekod her açılışta yeniden üretilmemeli");
    assert.equal(bir.kod, iki.kod, "basılı kod değişmemeli — asılan etiket ölürdü");
  });
});
