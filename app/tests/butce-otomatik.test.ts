import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { newId } from "@/lib/ids";
import { gunEkle, isGunu } from "@/lib/tarih";
import * as ayar from "@/domain/ayar";
import * as butce from "@/domain/butce";
import { personelEkle } from "@/domain/staff";
import { testKafeleriniSil, yoneticiSorgu } from "./_yardim";

/**
 * Günlük bütçe kendiliğinden açılıyor (Ü286) ve haftalık plan (Ü287).
 *
 * Ü45 *"kafe günlük tutarını bir kez söyler, her günün dönemi ilk ihtiyaçta
 * o tutarla açılır"* dedi ama açan kod yoktu: kafe o gün panelden
 * kaydetmezse dönem yoktu ve hiçbir kupon verilemiyordu. Ürün sahibi:
 * *"her gün her gün bütçe belirlemek zorunda kalmasın; tüm hafta için
 * belirleme olsun, o günü özel olarak ya da tüm günleri değiştirebilsin."*
 * Kararı: bir gün "yalnızca bu tarih" ya da "her <gün>"; "Tüm günler"
 * özel günler dahil hepsini değiştirir.
 */

const olusanKafeler: string[] = [];
const bugun = isGunu();

async function kafeAc(gunlukTl: number): Promise<{ kafe: string; yonetici: string }> {
  const kafe = newId("cafe");
  await withBypass("test kafe — bütçe", (db) =>
    db.query(
      `INSERT INTO cafes (id, name, slug, status, lat, lng)
       VALUES ($1,'ButceTest',$2,'approved',41.0,29.0)`,
      [kafe, `butce-${kafe.slice(-8)}`],
    ),
  );
  olusanKafeler.push(kafe);
  const yonetici = await personelEkle({ cafeId: kafe, ad: "TEST Bütçe", pin: "6204", ekleyenId: "stf_test_u286" });
  const s = await ayar.sayiYaz({
    cafeId: kafe,
    anahtar: ayar.ANAHTARLAR.gunlukButce,
    deger: gunlukTl * 100,
    aktorId: yonetici,
  });
  assert.ok(s.ok);
  return { kafe, yonetici };
}

async function donemSayisi(kafe: string, gun: string): Promise<number> {
  const r = await withBypass("test: dönem sayısı", (db) =>
    db.one<{ n: string }>(
      `SELECT count(*) AS n FROM budget_periods WHERE cafe_id = $1 AND period_start = $2`,
      [kafe, gun],
    ),
  );
  return Number(r?.n ?? 0);
}

after(async () => {
  await testKafeleriniSil(olusanKafeler);
  await closePools();
});

describe("günlük bütçe kendiliğinden açılıyor (Ü286)", () => {
  test("🔴 kafe bugün kaydetmese de bütçe günlük tutarıyla açılıyor", async () => {
    const { kafe } = await kafeAc(2_000);
    assert.equal(await donemSayisi(kafe, bugun), 0, "hazırlıkta dönem açılmış");
    const d = await butce.durum(kafe);
    assert.equal(d.donem?.taahhutKurus, 2_000_00);
    // İkinci okuma ikinci dönem açmıyor.
    await butce.durum(kafe);
    assert.equal(await donemSayisi(kafe, bugun), 1);
  });

  test("🔴 kupon yolu da (kalan bütçe) dönemi açıyor", async () => {
    const { kafe } = await kafeAc(2_000);
    await withBypass("test: kalan", (db) => butce.dagitilabilirIle(db, { cafeId: kafe }));
    assert.equal(await donemSayisi(kafe, bugun), 1);
  });

  test("geçmiş ve gelecek güne dönem açılmıyor — plan o gün gelince uygulanır", async () => {
    const { kafe } = await kafeAc(2_000);
    for (const gun of [gunEkle(bugun, -1), gunEkle(bugun, 2)]) {
      assert.equal((await butce.durum(kafe, gun)).donem, null);
      assert.equal(await donemSayisi(kafe, gun), 0, gun);
    }
  });

  test("bugün açılan dönem planın tutarını alıyor: özel tarih, sonra haftanın günü", async () => {
    const a = await kafeAc(2_000);
    await yoneticiSorgu(
      `INSERT INTO butce_gun_ozel (cafe_id, gun, taahhut_kurus) VALUES ($1,$2,420000)`,
      [a.kafe, bugun],
    );
    assert.equal((await butce.durum(a.kafe)).donem?.taahhutKurus, 4_200_00, "özel tarih");

    const b = await kafeAc(2_000);
    const w = butce.haftaninGunu(bugun);
    const s = await ayar.sayiYaz({
      cafeId: b.kafe,
      anahtar: `gunluk_butce_gun_${w}` as ayar.Anahtar,
      deger: 3_100_00,
      aktorId: b.yonetici,
    });
    assert.ok(s.ok);
    assert.equal((await butce.durum(b.kafe)).donem?.taahhutKurus, 3_100_00, "haftanın günü");
  });
});

describe("haftalık plan (Ü287)", () => {
  let kafe = "";
  let yonetici = "";
  const plan = async () => (await butce.haftalikPlan(kafe)).gunler;

  before(async () => {
    ({ kafe, yonetici } = await kafeAc(2_000));
  });

  test("her günün tutarı önümüzdeki yedi güne yayılıyor", async () => {
    const g = await plan();
    assert.equal(g.length, 7);
    assert.ok(g.every((x) => x.tutarKurus === 2_000_00 && x.kaynak === "her_gun"), JSON.stringify(g));
    assert.equal(g[0].gun, bugun);
    assert.ok(g[0].bugunMu);
  });

  test("🔴 'yalnızca bu tarih' yalnızca o günü değiştiriyor", async () => {
    const gun = gunEkle(bugun, 2);
    const s = await butce.gunuBelirle({ cafeId: kafe, gun, tutarKurus: 3_000_00, kapsam: "tarih", aktorId: yonetici });
    assert.ok(s.ok, s.ok ? "" : s.hata);
    const g = await plan();
    assert.deepEqual([g[2].tutarKurus, g[2].kaynak], [3_000_00, "ozel"]);
    assert.equal(g[1].tutarKurus, 2_000_00, "komşu gün değişti");
  });

  test("🔴 'her <gün>' haftanın o gününü değiştiriyor ve o satırın özel kaydını kaldırıyor", async () => {
    const gun = gunEkle(bugun, 2); // az önce "yalnızca bu tarih" yapılan gün
    const s = await butce.gunuBelirle({ cafeId: kafe, gun, tutarKurus: 4_000_00, kapsam: "hafta", aktorId: yonetici });
    assert.ok(s.ok, s.ok ? "" : s.hata);
    const g = await plan();
    assert.deepEqual([g[2].tutarKurus, g[2].kaynak], [4_000_00, "haftanin_gunu"]);
    const w = butce.haftaninGunu(gun);
    assert.equal(await ayar.varsaOku(kafe, `gunluk_butce_gun_${w}` as ayar.Anahtar), 4_000_00);
  });

  test("bugünü değiştirmek bugünün dönemini de değiştiriyor", async () => {
    const s = await butce.gunuBelirle({ cafeId: kafe, gun: bugun, tutarKurus: 2_500_00, kapsam: "tarih", aktorId: yonetici });
    assert.ok(s.ok, s.ok ? "" : s.hata);
    assert.equal((await butce.durum(kafe)).donem?.taahhutKurus, 2_500_00);
    assert.equal((await plan())[0].tutarKurus, 2_500_00);
  });

  test("🔴 'Tüm günler' özel günler dahil hepsini değiştiriyor — bugün de", async () => {
    const s = await butce.tumGunleriBelirle({ cafeId: kafe, tutarKurus: 1_800_00, aktorId: yonetici });
    assert.ok(s.ok, s.ok ? "" : s.hata);
    const g = await plan();
    assert.ok(g.every((x) => x.tutarKurus === 1_800_00 && x.kaynak === "her_gun"), JSON.stringify(g));
    assert.equal((await butce.durum(kafe)).donem?.taahhutKurus, 1_800_00);
  });

  test("🔴 bugün dağıtılmış kuponun altına inilemiyor ve plan yarım kalmıyor", async () => {
    const d = await butce.durum(kafe);
    assert.ok(d.donem);
    await yoneticiSorgu(
      `INSERT INTO budget_ledger (id, cafe_id, budget_period_id, kind, amount_kurus, note)
       VALUES ($1,$2,$3,'reserve',170000,'test: dağıtılmış')`,
      [newId("bl"), kafe, d.donem!.id],
    );
    const tum = await butce.tumGunleriBelirle({ cafeId: kafe, tutarKurus: 1_500_00, aktorId: yonetici });
    assert.equal(tum.ok, false);
    const tek = await butce.gunuBelirle({ cafeId: kafe, gun: bugun, tutarKurus: 1_500_00, kapsam: "tarih", aktorId: yonetici });
    assert.equal(tek.ok, false);
    assert.equal((await butce.haftalikPlan(kafe)).herGunKurus, 1_800_00, "reddedilen istek planı değiştirdi");
  });

  test("sınırlar: 1.500 TL'nin altı, geçmiş gün ve yedi günden uzağı reddediliyor", async () => {
    const dene = (gun: string, tutarKurus: number) =>
      butce.gunuBelirle({ cafeId: kafe, gun, tutarKurus, kapsam: "tarih", aktorId: yonetici });
    assert.equal((await dene(gunEkle(bugun, 1), 1_000_00)).ok, false);
    assert.equal((await dene(gunEkle(bugun, -1), 2_000_00)).ok, false);
    assert.equal((await dene(gunEkle(bugun, 7), 2_000_00)).ok, false);
  });
});
