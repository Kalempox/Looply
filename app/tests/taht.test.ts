import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet, takmaAd } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as taht from "@/domain/taht";
import { isGunu, pazartesi, gunEkle } from "@/lib/tarih";
import { yoneticiSorgu, benzersizEposta } from "./_yardim";

/**
 * Ö1 · MASAYI FETHET — masa tahtı.
 *
 * Tahtın güvencesi tek cümlede: **taht bir sorgunun cevabı ve o sorgu
 * yalnızca gerçek, kafede yapılmış, doğrulanmış skorları görüyor.**
 *
 * Sınananlar:
 *   · Reddedilen oyun tahta giremez
 *   · Konumu doğrulanmamış oyun tahta giremez (Ü3)
 *   · Başka masanın / başka kafenin skoru sızmaz
 *   · Beraberlikte taht ilk yapanda kalır
 *   · Ad görünürlüğü kapalıyken ad sızmaz, soyad hiçbir koşulda görünmez
 *   · Taht hiçbir deftere yazmaz — ekonomik avantaj yok
 */

const OYUN = "blok";
const BASKA_OYUN = "kelime";

let kafeA = "";
let kafeB = "";
let masa1 = "";
let masa2 = "";
const oyuncular: string[] = [];
const bugun = isGunu();

const TABAN = 9_100_000 + randomInt(800_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0543${String(TABAN + sayac++).slice(-7)}`);

async function yeniOyuncu(ad: string) {
  const { oyuncu } = await kaydet({
    telefon: yeniTelefon(),
    eposta: benzersizEposta(),
    ad,
    soyad: "Kral",
    dogumYili: 1990,
    pazarlamaIzni: false,
  });
  oyuncular.push(oyuncu.id);
  await takmaAd(kafeA, oyuncu.id);
  return oyuncu.id;
}

/**
 * Oyun oturumu yazar.
 *
 * Motor üzerinden oynatmak yerine doğrudan satır: sınanan şey taht sorgusu ve
 * hangi skorun hangi koşulda tahta gireceğini kesin bilmek gerekiyor.
 */
async function oturumYaz(opts: {
  playerId: string;
  cafeId?: string;
  tableId: string | null;
  oyunId?: string;
  skor: number;
  durum?: string;
  /** K2 (konum doğrulandı) biti. Ü3: yoksa taht sorgusu görmemeli. */
  k2?: boolean;
  gun?: string;
  sira?: number;
}) {
  const id = `oyn_taht_${opts.playerId}_${opts.tableId ?? "yok"}_${opts.skor}_${opts.sira ?? 0}`;
  await yoneticiSorgu(
    `INSERT INTO play_sessions
       (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
        started_at, ended_at, server_score, proof_mask, proof_level,
        business_date, status, is_qualified)
     VALUES ($1,$2,$3,$4,decode(md5($4),'hex'),$5,'tohum',
             now() - interval '1 hour',
             now() - ($9 || ' minutes')::interval,
             $6, $7, 2, $8, $10, false)`,
    [
      id,
      opts.cafeId ?? kafeA,
      opts.tableId,
      opts.playerId,
      opts.oyunId ?? OYUN,
      opts.skor,
      opts.k2 === false ? 1 : 3,
      opts.gun ?? bugun,
      String(60 - (opts.sira ?? 0)),
      opts.durum ?? "completed",
    ],
  );
  return id;
}

function sor(tableId: string | null, bakan: string, oyunId = OYUN, cafeId?: string) {
  return taht.masaTahti({
    cafeId: cafeId ?? kafeA,
    tableId,
    masaAdi: "Masa 1",
    oyunId,
    oyunAdi: "Blok",
    bakanPlayerId: bakan,
  });
}

/**
 * Test kendi masalarını açıyor — tohumdakileri ödünç almıyor.
 *
 * Önceki hâli kafenin ilk iki masasını kullanıyordu ve "kimse oynamadıysa
 * taht boş" testi, o masada başka hiç kimsenin oynamamış olmasına
 * güveniyordu. Demo simülasyonu (`npm run db:simule`) masaları gerçek
 * trafikle doldurunca test kırıldı — tarayıcıda bir tur oynamak da aynı
 * sonucu verirdi. Taht, tanımı gereği masa başına tutuluyor; testin kendi
 * masasında çalışması onu ortamdaki veriden tamamen bağımsız yapıyor.
 */
const MASA_ONEKI = "tbl_taht_test";

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    return { a: a?.id, b: b?.id };
  });
  assert.ok(v.a && v.b, "Tohum verisi eksik — önce: npm run db:seed");
  kafeA = v.a;
  kafeB = v.b;

  await yoneticiSorgu(`DELETE FROM play_sessions WHERE id LIKE 'oyn_taht_%'`);
  await yoneticiSorgu(`DELETE FROM cafe_tables WHERE id LIKE '${MASA_ONEKI}%'`);

  masa1 = `${MASA_ONEKI}_1`;
  masa2 = `${MASA_ONEKI}_2`;
  for (const [i, id] of [masa1, masa2].entries()) {
    await yoneticiSorgu(
      `INSERT INTO cafe_tables (id, cafe_id, label, sort_order, qr_secret, active)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [id, kafeA, `Taht testi ${i + 1}`, 900 + i, randomBytes(16)],
    );
  }
});

after(async () => {
  await yoneticiSorgu(`DELETE FROM play_sessions WHERE id LIKE 'oyn_taht_%'`);
  await yoneticiSorgu(`DELETE FROM cafe_tables WHERE id LIKE '${MASA_ONEKI}%'`);
  for (const p of oyuncular) {
    await yoneticiSorgu(`DELETE FROM xp_ledger WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [p]);
  }
  await closePools();
});

/* ═══════════════════════════════════════════════════════════
   1 · Taht kimde
   ═══════════════════════════════════════════════════════════ */

describe("taht kimde", () => {
  test("kimse oynamadıysa taht boş, devirmek için 1 yeter", async () => {
    const a = await yeniOyuncu("Bos");
    const t = await sor(masa2, a);
    assert.equal(t.kalici, null);
    assert.equal(t.devirmekIcin, 1);
  });

  test("en yüksek skor kral olur", async () => {
    const a = await yeniOyuncu("Mert");
    const b = await yeniOyuncu("Zeynep");
    await oturumYaz({ playerId: a, tableId: masa1, skor: 8_420, sira: 1 });
    await oturumYaz({ playerId: b, tableId: masa1, skor: 5_100, sira: 2 });

    const t = await sor(masa1, b);
    assert.equal(t.kalici?.playerId, a);
    assert.equal(t.kalici?.skor, 8_420);
    assert.equal(t.devirmekIcin, 8_421);
    assert.equal(t.kalici?.benMiyim, false);
  });

  test("beraberlikte taht ilk yapanda kalır", async () => {
    const a = await yeniOyuncu("Once");
    const b = await yeniOyuncu("Sonra");
    // `sira` küçükse `ended_at` daha eski — yani önce bitirmiş.
    await oturumYaz({ playerId: a, tableId: masa2, skor: 4_000, sira: 1 });
    await oturumYaz({ playerId: b, tableId: masa2, skor: 4_000, sira: 5 });

    const t = await sor(masa2, b);
    assert.equal(t.kalici?.playerId, a, "berabere kalan tahtı devirdi");
  });

  test("kendi tahtını benMiyim ile tanıyor", async () => {
    const a = await yeniOyuncu("Ben");
    await oturumYaz({ playerId: a, tableId: masa1, skor: 99_000, sira: 3 });
    const t = await sor(masa1, a);
    assert.equal(t.kalici?.benMiyim, true);
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Sorgunun görmediği skorlar
   ═══════════════════════════════════════════════════════════ */

describe("tahta giremeyen skorlar", () => {
  test("reddedilen oyun tahta girmez", async () => {
    const a = await yeniOyuncu("Reddedilen");
    await oturumYaz({ playerId: a, tableId: masa2, skor: 500_000, durum: "rejected", sira: 2 });

    const t = await sor(masa2, a);
    assert.notEqual(t.kalici?.playerId, a, "reddedilen oyun tahta oturdu");
  });

  test("yarım kalan oyun tahta girmez", async () => {
    const a = await yeniOyuncu("Yarim");
    await oturumYaz({ playerId: a, tableId: masa2, skor: 600_000, durum: "abandoned", sira: 3 });

    const t = await sor(masa2, a);
    assert.notEqual(t.kalici?.playerId, a);
  });

  test("konumu doğrulanmamış oyun tahta girmez (Ü3)", async () => {
    // Kafe dışında veya konum reddedilmişken oynanan oyun kazandırmıyor;
    // taht da kazanım değil ama aynı sınırın içinde — masaya oturmayan
    // birinin o masanın kralı olması saçma olurdu.
    const a = await yeniOyuncu("Konumsuz");
    await oturumYaz({ playerId: a, tableId: masa2, skor: 700_000, k2: false, sira: 4 });

    const t = await sor(masa2, a);
    assert.notEqual(t.kalici?.playerId, a, "konumu doğrulanmamış skor tahta oturdu");
  });

  test("başka masanın skoru bu masaya sızmaz", async () => {
    const a = await yeniOyuncu("Masa1de");
    await oturumYaz({ playerId: a, tableId: masa1, skor: 800_000, sira: 4 });

    const t = await sor(masa2, a);
    assert.notEqual(t.kalici?.playerId, a, "masa sınırı geçirgen");
  });

  test("başka kafenin skoru sızmaz", async () => {
    const a = await yeniOyuncu("KafeBde");
    await oturumYaz({ playerId: a, cafeId: kafeB, tableId: null, skor: 900_000, sira: 5 });

    const t = await sor(null, a);
    assert.notEqual(t.kalici?.playerId, a, "kafe sınırı geçirgen");
  });

  test("başka oyunun skoru bu tahta girmez", async () => {
    // Spec: taht TEK oyun üzerinden — Blok'ta 1.240 ile Kelime'de 1.240
    // aynı şey değil.
    const a = await yeniOyuncu("BaskaOyun");
    await oturumYaz({
      playerId: a,
      tableId: masa2,
      oyunId: BASKA_OYUN,
      skor: 950_000,
      sira: 6,
    });

    const t = await sor(masa2, a, OYUN);
    assert.notEqual(t.kalici?.playerId, a, "oyunlar tek tahtta karıştı");
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Masası olmayan kafe — "Kafe Kralı"
   ═══════════════════════════════════════════════════════════ */

describe("kafe tahtı (masasız)", () => {
  test("masasız oturumlar tek tahtta toplanır", async () => {
    const a = await yeniOyuncu("Kafesiz");
    await oturumYaz({ playerId: a, tableId: null, skor: 3_300, sira: 7 });

    const t = await sor(null, a);
    assert.equal(t.kalici?.playerId, a, "masasız oturum kafe tahtına girmedi");
  });

  test("masalı oturum kafe tahtına karışmaz", async () => {
    const a = await yeniOyuncu("Masali");
    await oturumYaz({ playerId: a, tableId: masa1, skor: 3_400, sira: 8 });

    const t = await sor(null, a);
    assert.notEqual(t.kalici?.playerId, a);
  });
});

/* ═══════════════════════════════════════════════════════════
   4 · Haftalık taht
   ═══════════════════════════════════════════════════════════ */

describe("haftanın kralı", () => {
  test("geçen haftanın skoru haftalık tahtta görünmez", async () => {
    const a = await yeniOyuncu("GecenHafta");
    const b = await yeniOyuncu("BuHafta");

    await oturumYaz({
      playerId: a,
      tableId: masa2,
      skor: 40_000,
      gun: gunEkle(pazartesi(bugun), -3),
      sira: 9,
    });
    await oturumYaz({ playerId: b, tableId: masa2, skor: 10_000, sira: 10 });

    const t = await sor(masa2, b);
    assert.equal(t.kalici?.playerId, a, "kalıcı taht geçen haftayı unuttu");
    assert.equal(t.haftalik?.playerId, b, "haftalık taht geçen haftayı sayıyor");
  });
});

/* ═══════════════════════════════════════════════════════════
   5 · Ad görünürlüğü
   ═══════════════════════════════════════════════════════════ */

describe("ad görünürlüğü", () => {
  test("varsayılan açık — ad görünüyor, soyad hiçbir yerde yok", async () => {
    const a = await yeniOyuncu("Gorunur");
    await oturumYaz({ playerId: a, tableId: masa2, skor: 120_000, sira: 11 });

    const t = await sor(masa2, a);
    assert.equal(t.kalici?.gorunenAd, "Gorunur");
    assert.ok(!JSON.stringify(t).includes("Kral"), "soyad tahtta sızdı");
  });

  test("kapatılınca anonim kod görünüyor, taht kaybolmuyor", async () => {
    const a = await yeniOyuncu("Gizli");
    await oturumYaz({ playerId: a, tableId: masa2, skor: 130_000, sira: 12 });

    await taht.adGorunurluguAyarla(a, false);
    assert.equal(await taht.adGorunurMu(a), false);

    const t = await sor(masa2, a);
    assert.equal(t.kalici?.playerId, a, "ad kapatınca taht düştü");
    assert.match(t.kalici!.gorunenAd, /^P-/, "ad kapalıyken anonim kod gelmedi");
    assert.ok(!JSON.stringify(t).includes("Gizli"), "kapalı olmasına rağmen ad sızdı");

    await taht.adGorunurluguAyarla(a, true);
    const t2 = await sor(masa2, a);
    assert.equal(t2.kalici?.gorunenAd, "Gizli", "geri açılınca ad dönmedi");
  });
});

/* ═══════════════════════════════════════════════════════════
   6 · Devirme ve ekonomik etkisizlik
   ═══════════════════════════════════════════════════════════ */

describe("devirme", () => {
  test("yeni en yüksek skor devirdi cevabı veriyor", async () => {
    const a = await yeniOyuncu("Eski");
    const b = await yeniOyuncu("Yeni");
    await oturumYaz({ playerId: a, tableId: masa2, skor: 200_000, sira: 13 });
    await oturumYaz({ playerId: b, tableId: masa2, skor: 250_000, sira: 14 });

    const s = await taht.devirdiMi({
      cafeId: kafeA,
      tableId: masa2,
      oyunId: OYUN,
      playerId: b,
      skor: 250_000,
    });
    assert.equal(s.devirdi, true);
    assert.equal(s.devirdi === true ? s.eskiSkor : null, 200_000);
  });

  test("düşük skor devirmedi cevabı veriyor", async () => {
    const a = await yeniOyuncu("Dusuk");
    await oturumYaz({ playerId: a, tableId: masa2, skor: 10, sira: 15 });

    const s = await taht.devirdiMi({
      cafeId: kafeA,
      tableId: masa2,
      oyunId: OYUN,
      playerId: a,
      skor: 10,
    });
    assert.equal(s.devirdi, false);
  });

  test("taht hiçbir deftere dokunmuyor — ekonomik avantaj yok", async () => {
    // Spec: "Taht sahibine kalıcı ekonomik avantaj verilmez (statü yeterli)."
    // Havuz kontrolü (E5) bu yüzden bozulmuyor.
    const a = await yeniOyuncu("Bedava");
    await oturumYaz({ playerId: a, tableId: masa2, skor: 300_000, sira: 16 });

    await sor(masa2, a);
    await taht.devirdiMi({
      cafeId: kafeA,
      tableId: masa2,
      oyunId: OYUN,
      playerId: a,
      skor: 300_000,
    });

    const yazilan = await withBypass("test: defterler", async (db) => ({
      puan: await db.all(`SELECT 1 FROM points_ledger WHERE player_id = $1`, [a]),
      xp: await db.all(`SELECT 1 FROM xp_ledger WHERE player_id = $1`, [a]),
      kupon: await db.all(`SELECT 1 FROM coupons WHERE player_id = $1`, [a]),
    }));

    assert.equal(yazilan.puan.length, 0, "taht puan yazdı");
    assert.equal(yazilan.xp.length, 0, "taht XP yazdı");
    assert.equal(yazilan.kupon.length, 0, "taht kupon üretti");
  });
});
