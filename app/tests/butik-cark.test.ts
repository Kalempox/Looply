import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as kosul from "@/domain/cark-kosul";
import * as hak from "@/domain/cark-hakki";
import { yoneticiSorgu } from "./_yardim";

/**
 * BUTİK ÇARKI — Ü137.
 *
 * Kafede çark hakkını oyun veriyor; butikte **kasiyer** veriyor,
 * alışveriş tutarına bakarak. Ürün sahibinin tarifi:
 *
 *   *"Müşteri aldığı kıyafetleri okutacak, 2500 TL tuttu diyelim; butik
 *   sahibi 3000 TL ve üzerine çark tanımlamış olacak. Kasiyer 2500
 *   olduğunu görünce diyecek ki '3000 ve üzerinde çark şansınız var,
 *   isterseniz tamamlayın.'"*
 *
 * Sınanan iddialar:
 *   1. Eşiğin altı hak vermiyor — ve **eksik tutarı** söylüyor
 *   2. Eşik tutunca hak doğuyor
 *   3. Koşullar VEYA ile bağlanıyor
 *   4. Hakta kişisel veri yok; `player_id` sahiplenince doluyor
 *   5. Aynı hak iki kişiye bağlanamıyor
 *   6. Süresi dolmuş / kullanılmış hak çözülmüyor
 *   7. Parametresiz koşul veritabanına giremiyor
 */

let butik = "";
let yonetici = "";
let kasiyer = "";
let oyuncu = "";
const acilanKosullar: string[] = [];

const TABAN = 6_000_000 + randomInt(3_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0559${String(TABAN + sayac++).slice(-7)}`);

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const c = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const y = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [c!.id],
    );
    const k = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'cashier' AND active LIMIT 1",
      [c!.id],
    );
    return { c: c?.id, y: y?.id, k: k?.id };
  });
  assert.ok(v.c && v.y && v.k, "Tohum verisi yok — önce: npm run db:seed");
  butik = v.c;
  yonetici = v.y;
  kasiyer = v.k;

  // Bu testin süresince Kafe B butik gibi davranıyor. Sonda geri alınıyor.
  await yoneticiSorgu(`UPDATE cafes SET isletme_turu = 'butik' WHERE id = $1`, [butik]);

  const p = await kaydet({
    telefon: yeniTelefon(),
    ad: "Butik",
    soyad: "Testi",
    dogumYili: 1990,
    pazarlamaIzni: false,
  });
  oyuncu = p.oyuncu.id;
});

after(async () => {
  await yoneticiSorgu(`DELETE FROM cark_haklari WHERE cafe_id = $1`, [butik]);
  await yoneticiSorgu(`DELETE FROM cark_kosullari WHERE cafe_id = $1`, [butik]);
  await yoneticiSorgu(`UPDATE cafes SET isletme_turu = 'kafe' WHERE id = $1`, [butik]);
  await closePools();
});

/**
 * Testler arasında koşulları sıfırla — VEYA mantığı birikmesin.
 *
 * ⚠️ **Sıra zorunlu: önce haklar, sonra koşullar.** `cark_haklari.kosul_id`
 * koşula bakıyor ve yabancı anahtar silmeyi reddediyor. Bu kısıt bilerek
 * var: ürün kodu koşulu **hiç silmiyor**, pasifleştiriyor
 * (`durumDegistir`) — silinseydi geçmiş haklar "hangi kural verdi"
 * sorusunu cevaplayamazdı. Yalnızca test temizliği gerçekten siliyor.
 */
async function kosullariTemizle() {
  await yoneticiSorgu(`DELETE FROM cark_haklari WHERE cafe_id = $1`, [butik]);
  await yoneticiSorgu(`DELETE FROM cark_kosullari WHERE cafe_id = $1`, [butik]);
  acilanKosullar.length = 0;
}

async function tutarKosulu(esikTl: number) {
  const s = await kosul.ekle({
    cafeId: butik,
    tur: "tutar",
    esikKurus: esikTl * 100,
    aktorId: yonetici,
  });
  assert.ok(s.ok, s.ok === false ? s.hata : "");
  if (s.ok) acilanKosullar.push(s.id);
  return s.ok ? s.id : "";
}

describe("butik çarkı (Ü137)", () => {
  test("🔴 eşiğin altı hak vermiyor ve EKSİK TUTARI söylüyor", async () => {
    await kosullariTemizle();
    await tutarKosulu(3000);

    // Ürün sahibinin senaryosu birebir: 2500 TL'lik alışveriş.
    const s = await kosul.degerlendir({ cafeId: butik, tutarKurus: 2500_00 });

    assert.equal(s.uygun, false, "eşiğin altı hak vermemeli");
    if (!s.uygun) {
      // Kasiyerin ağzına konacak cümlenin sayısı. Bu olmadan özelliğin
      // tamamı boşa gider — "olmadı" demek satışı büyütmüyor.
      assert.equal(s.eksikKurus, 500_00, "eksik tutar 500 TL olmalıydı");
      assert.match(s.sebep, /3\.000 TL/, "eşik cümlede geçmeli");
    }
  });

  test("eşik tutunca hak doğuyor", async () => {
    await kosullariTemizle();
    const kosulId = await tutarKosulu(3000);

    const s = await kosul.degerlendir({ cafeId: butik, tutarKurus: 3000_00 });
    assert.equal(s.uygun, true, "tam eşik hak vermeliydi");
    if (s.uygun) assert.equal(s.kosulId, kosulId, "hakkı veren koşul kayda geçmeli");

    const ustu = await kosul.degerlendir({ cafeId: butik, tutarKurus: 9999_00 });
    assert.equal(ustu.uygun, true);
  });

  test("koşullar VEYA ile bağlanıyor — herhangi biri yeter", async () => {
    await kosullariTemizle();
    await tutarKosulu(3000);

    // "Günün ilk 5 müşterisi" — tutardan bağımsız.
    const ilk = await kosul.ekle({
      cafeId: butik,
      tur: "ilk_gelen",
      adet: 5,
      aktorId: yonetici,
    });
    assert.ok(ilk.ok, ilk.ok === false ? ilk.hata : "");

    // 100 TL'lik alışveriş tutar eşiğini geçmiyor ama "ilk gelen" tutuyor.
    const s = await kosul.degerlendir({ cafeId: butik, tutarKurus: 100_00 });
    assert.equal(s.uygun, true, "ikinci koşul devreye girmeliydi");
  });

  test("🔴 hakta kişisel veri YOK — player_id sahiplenince doluyor", async () => {
    await kosullariTemizle();
    const kosulId = await tutarKosulu(1000);

    const h = await hak.ver({ cafeId: butik, staffId: kasiyer, kosulId });

    const satir = await withBypass("test: hak satırı", (db) =>
      db.one<Record<string, unknown>>(`SELECT * FROM cark_haklari WHERE id = $1`, [h.hakId]),
    );
    assert.ok(satir, "hak satırı yok");
    assert.equal(satir.player_id, null, "hak verilirken müşteri bilinmemeli");
    assert.equal(satir.claimed_at, null);

    // Satırda ad/telefon gibi bir alan olmamalı — kasiyer veri girmiyor.
    const alanlar = Object.keys(satir).join(" ");
    assert.ok(!/name|phone|ad_|telefon/i.test(alanlar), `hak satırında kişisel veri alanı: ${alanlar}`);

    // Ham jeton saklanmıyor, özeti saklanıyor.
    const govde = JSON.stringify(satir);
    assert.ok(!govde.includes(h.jeton), "ham jeton veritabanında duruyor");

    const sahip = await hak.sahiplen(h.hakId, oyuncu);
    assert.equal(sahip.ok, true, "sahiplenme geçmeliydi");

    const sonra = await withBypass("test: sahiplenmiş hak", (db) =>
      db.one<{ player_id: string | null }>(
        `SELECT player_id FROM cark_haklari WHERE id = $1`,
        [h.hakId],
      ),
    );
    assert.equal(sonra!.player_id, oyuncu, "sahiplenince player_id dolmalı");
  });

  test("🔴 aynı hak ikinci kişiye bağlanamıyor", async () => {
    await kosullariTemizle();
    const kosulId = await tutarKosulu(1000);
    const h = await hak.ver({ cafeId: butik, staffId: kasiyer, kosulId });

    const ikinci = await kaydet({
      telefon: yeniTelefon(),
      ad: "Araya",
      soyad: "Giren",
      dogumYili: 1992,
      pazarlamaIzni: false,
    });

    assert.equal((await hak.sahiplen(h.hakId, oyuncu)).ok, true);
    assert.equal(
      (await hak.sahiplen(h.hakId, ikinci.oyuncu.id)).ok,
      false,
      "aynı QR iki kişiye bağlandı",
    );
  });

  test("kullanılmış ve süresi dolmuş hak çözülmüyor", async () => {
    await kosullariTemizle();
    const kosulId = await tutarKosulu(1000);

    const kullanilan = await hak.ver({ cafeId: butik, staffId: kasiyer, kosulId });
    await hak.sahiplen(kullanilan.hakId, oyuncu);
    await hak.harca(kullanilan.hakId, oyuncu, "");
    assert.equal((await hak.coz(kullanilan.jeton)).durum, "kullanildi");

    const eski = await hak.ver({ cafeId: butik, staffId: kasiyer, kosulId });
    await yoneticiSorgu(
      `UPDATE cark_haklari SET expires_at = now() - interval '1 minute' WHERE id = $1`,
      [eski.hakId],
    );
    assert.equal((await hak.coz(eski.jeton)).durum, "suresi_doldu");

    assert.equal((await hak.coz("uydurma-jeton-degeri")).durum, "bulunamadi");
  });

  test("yanan hak geri açılıyor — kupon çıkmazsa", async () => {
    await kosullariTemizle();
    const kosulId = await tutarKosulu(1000);
    const h = await hak.ver({ cafeId: butik, staffId: kasiyer, kosulId });
    await hak.sahiplen(h.hakId, oyuncu);

    // Çark hakkı kupondan ÖNCE harcanıyor; kupon çıkmazsa geri açılmalı.
    // Aksi hâlde parasını harcamış müşteriden hakkı alınmış olurdu.
    assert.equal((await hak.harca(h.hakId, oyuncu, "")).ok, true);
    assert.equal(await hak.acikHak(oyuncu), null, "harcanmış hak açık görünmemeli");

    await hak.geriAc(h.hakId);
    const acik = await hak.acikHak(oyuncu);
    assert.equal(acik?.hakId, h.hakId, "geri açılan hak yeniden çevrilebilmeli");
  });

  test("🔴 parametresiz koşul veritabanına giremiyor", async () => {
    // Kısıt olmasaydı eşiksiz bir "tutar" koşulu kaydedilebilir ve
    // çalışma anında sessizce HERKESE hak verirdi — para dağıtan bir
    // sessiz arıza.
    await assert.rejects(
      () =>
        yoneticiSorgu(
          `INSERT INTO cark_kosullari (id, cafe_id, tur) VALUES ($1, $2, 'tutar')`,
          [`ksl_bozuk_${randomInt(100000)}`, butik],
        ),
      /kosul_parametresi/,
      "eşiksiz tutar koşulu kabul edildi",
    );

    await assert.rejects(
      () =>
        yoneticiSorgu(
          `INSERT INTO cark_kosullari (id, cafe_id, tur, adet) VALUES ($1, $2, 'ilk_gelen', 0)`,
          [`ksl_bozuk2_${randomInt(100000)}`, butik],
        ),
      /adet_check|kosul_parametresi/,
      "sıfır kişilik 'ilk gelen' kabul edildi",
    );
  });

  test("aynı türde ikinci açık koşul reddediliyor", async () => {
    await kosullariTemizle();
    await tutarKosulu(3000);

    const ikinci = await kosul.ekle({
      cafeId: butik,
      tur: "tutar",
      esikKurus: 5000_00,
      aktorId: yonetici,
    });
    assert.equal(ikinci.ok, false, "iki eşik hangisinin geçerli olduğunu belirsizleştirir");
  });

  test("koşul yoksa hiçbir tutar hak vermiyor", async () => {
    await kosullariTemizle();
    const s = await kosul.degerlendir({ cafeId: butik, tutarKurus: 999_999_00 });
    assert.equal(s.uygun, false, "koşulsuz işletmede hak doğmamalı");
  });
});
