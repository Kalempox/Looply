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

/* ── Karekod türleri ───────────────────────────────────────── */

describe("karekod türleri (Ü108)", () => {
  test("dört tür de eklenebiliyor ve listede türüyle dönüyor", async () => {
    const damga = Date.now().toString(36).slice(-5);

    for (const t of masaYonetim.TURLER) {
      const s = await masaYonetim.ekle({
        cafeId: kafeA,
        ad: `${masaYonetim.TUR_ADI[t].tekil} ${damga}`,
        tur: t,
        aktorId: yoneticiA,
      });
      assert.ok(s.ok, s.ok === false ? s.hata : "");
      // Test sonunda silinebilmesi için kimliği işaretle.
      if (s.ok) {
        await yoneticiSorgu(`UPDATE cafe_tables SET id = $2 WHERE id = $1`, [
          s.id,
          `tbl_tur_${t}_${damga}`,
        ]);
      }
    }

    const liste = await masaYonetim.listele(kafeA);
    for (const t of masaYonetim.TURLER) {
      assert.ok(
        liste.some((m) => m.tur === t && m.ad.endsWith(damga)),
        `${t} türü listede yok`,
      );
    }
  });

  /**
   * Göç 0033 `kind`i `DEFAULT 'masa'` ile ekledi: göçten önce yazılmış
   * bütün satırlar masa sayılıyor ve tür belirtmeyen her yeni satır da
   * öyle. Varsayılan başka bir şey olsaydı (ya da NULL kalsaydı) mevcut
   * masalar panelde yanlış grupta belirir, kafe onları kaybolmuş sanardı.
   *
   * ⚠️ Sınanan şey **şemanın varsayılanı**, mevcut satırların hâli değil:
   * "veritabanındaki her eski satır masa" diye yazılsaydı, panelden
   * eklenen tek bir kasa karekodu testi kırardı.
   */
  test("tür yazılmayan satır masa sayılıyor — şemanın varsayılanı", async () => {
    const id = `tbl_tur_vars_${newId("x").slice(-6)}`;
    await yoneticiSorgu(
      `INSERT INTO cafe_tables (id, cafe_id, label, sort_order, qr_secret)
       VALUES ($1,$2,$3,999,decode(md5($1),'hex'))`,
      [id, kafeA, `Varsayılan ${id.slice(-6)}`],
    );

    const r = await withBypass("test: varsayılan tür", (db) =>
      db.one<{ kind: string }>(`SELECT kind FROM cafe_tables WHERE id = $1`, [id]),
    );
    assert.equal(r?.kind, "masa", "tür verilmeyen satır masa sayılmadı");

    const liste = await masaYonetim.listele(kafeA);
    assert.equal(liste.find((m) => m.id === id)?.tur, "masa");
  });

  /**
   * 🔴 Fiş karekodu bir SATIN ALMA KANITI DEĞİL.
   *
   * E6'nın K4 kademesi (×2 çarpan, 51 TL+ ödül) sabit bir karekodla
   * verilemez: kodun fotoğrafı paylaşılabilir ve hiçbir satın almayı
   * kanıtlamaz. Bu test, ileride biri "fiş türüne K4 verelim" derse
   * gerekçeyi hatırlatıyor.
   */
  test("🔴 hiçbir karekod türü K4 (satın alma kanıtı) vermiyor", async () => {
    const maskeler = await withBypass("test: kanıt maskeleri", (db) =>
      db.all<{ proof_mask: number }>(
        `SELECT DISTINCT proof_mask FROM table_sessions
          WHERE proof_mask & 8 <> 0`,
      ),
    );
    assert.deepEqual(maskeler, [], "bir yerden K4 veriliyor — fiş karekodu kanıt sanılmış olabilir");
  });

  test("aynı adda ikinci karekod reddediliyor", async () => {
    const ad = `Çakışma ${newId("x").slice(-6)}`;
    const ilk = await masaYonetim.ekle({ cafeId: kafeA, ad, tur: "kasa", aktorId: yoneticiA });
    assert.ok(ilk.ok);
    if (ilk.ok) {
      await yoneticiSorgu(`UPDATE cafe_tables SET id = $2 WHERE id = $1`, [
        ilk.id,
        `tbl_tur_cakisma_${newId("x").slice(-6)}`,
      ]);
    }

    const ikinci = await masaYonetim.ekle({ cafeId: kafeA, ad, tur: "menu", aktorId: yoneticiA });
    assert.equal(ikinci.ok, false, "aynı ad ikinci kez kabul edildi");
  });
});
