import "../scripts/_env";
import { test, before, after, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as misafir from "@/domain/misafir";
import * as masaOturumu from "@/domain/masa";
import { K2 } from "@/domain/masa";
import { misafirOyunuYaz } from "@/domain/oyun";
import { biletUret, biletCoz } from "@/domain/qr";
import { yoneticiSorgu } from "./_yardim";

/**
 * FAZ 2 GÜVENLİK KAPISI — misafir oyun akışı (Ü35).
 *
 * Ü35'in tamamı tek bir cümleye dayanıyor: *"kayıt öncesi oynanan oyun
 * hiçbir deftere yazılmaz; sunucu sonucu imzalar, oyuncu kaydolunca o talep
 * normal yoldan bozdurulur."* Bu blok o cümlenin her parçasını çalıştırıyor:
 * imza kurcalanamıyor mu, talep tek kullanımlık mı, başka kafenin bütçesine
 * yazabiliyor mu, K2 olmadan ödül açılıyor mu.
 *
 * Ön koşul: npm run db:up && npm run db:migrate && npm run db:seed
 */

let kafeA = "";
let kafeB = "";
let masaA = "";
let masaB = "";

const TABAN = 2_000_000 + randomInt(6_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0555${String(TABAN + sayac++).slice(-7)}`);

const olusturulanOyuncular: string[] = [];

async function testOyuncu() {
  const { oyuncu } = await kaydet({
    telefon: yeniTelefon(),
    ad: "Buse",
    soyad: "Misafir",
    dogumYili: 1994,
    pazarlamaIzni: false,
  });
  olusturulanOyuncular.push(oyuncu.id);
  return oyuncu;
}

/** Misafir gibi oyna: başla → bitir. Gerçek girdi kaydı üretilmiyor. */
async function misafirOyna(opts: {
  cafeId: string;
  tableId: string;
  konumCerezi?: string;
  girdiler?: unknown;
}) {
  const baslangic = await misafir.basla({
    oyunId: "blok",
    bolum: 1,
    cafeId: opts.cafeId,
    tableId: opts.tableId,
  });
  assert.ok(baslangic.ok, "misafir oyunu başlamalıydı");

  return misafir.bitir({
    acikOyunCerezi: baslangic.cerez,
    konumCerezi: opts.konumCerezi,
    // Boş girdi kaydı geçerli: hiç hamle yapmadan biten bir bölüm.
    girdiler: opts.girdiler ?? [],
    iddiaEdilenSkor: 0,
  });
}

/** Oyuncuyu masaya oturt; istenirse K2'yi de işle (misafir konumu gibi). */
async function masayaOturt(playerId: string, cafeId: string, tableId: string, k2 = false) {
  await masaOturumu.ac({ cafeId, tableId, playerId });
  if (k2) {
    await masaOturumu.konumuUygula({ playerId, cafeId, tableId, k2: true, mesafeM: 20 });
  }
}

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const ma = await db.one<{ id: string }>(
      "SELECT id FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1",
      [a?.id],
    );
    const mb = await db.one<{ id: string }>(
      "SELECT id FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1",
      [b?.id],
    );
    return { a: a?.id, b: b?.id, ma: ma?.id, mb: mb?.id };
  });
  assert.ok(v.a && v.b && v.ma && v.mb, "Tohum verisi yok — önce: npm run db:seed");
  kafeA = v.a;
  kafeB = v.b;
  masaA = v.ma;
  masaB = v.mb;
});

beforeEach(async () => {
  await withBypass("test: kota sıfırlama", (db) => db.query("DELETE FROM rate_limits"));
});

after(async () => {
  for (const id of olusturulanOyuncular) {
    await yoneticiSorgu(
      `DELETE FROM coupon_events WHERE coupon_id IN (SELECT id FROM coupons WHERE player_id = $1)`,
      [id],
    );
    await yoneticiSorgu(`DELETE FROM coupons WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM points_ledger WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM xp_ledger WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM player_badges WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM play_sessions WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM table_sessions WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [id]);
  }
  await closePools();
});

describe("misafir oyunu — kayıt öncesi hiçbir iz kalmıyor (G13)", () => {
  test("oyun oynandı ama veritabanında satır yok", async () => {
    const once = await withBypass("test: oturum sayısı", (db) =>
      db.one<{ n: string }>(`SELECT count(*) AS n FROM play_sessions`),
    );

    const sonuc = await misafirOyna({ cafeId: kafeA, tableId: masaA });
    assert.ok(sonuc.ok, "misafir oyunu bitmeliydi");

    const sonra = await withBypass("test: oturum sayısı", (db) =>
      db.one<{ n: string }>(`SELECT count(*) AS n FROM play_sessions`),
    );
    assert.equal(
      Number(sonra!.n),
      Number(once!.n),
      "kayıt öncesi oynanan oyun hiçbir deftere yazılmamalı (Ü35)",
    );
  });

  test("skoru sunucu hesaplıyor — istemcinin iddiası taşınmıyor", async () => {
    const baslangic = await misafir.basla({
      oyunId: "blok",
      bolum: 1,
      cafeId: kafeA,
      tableId: masaA,
    });
    assert.ok(baslangic.ok);

    const sonuc = misafir.bitir({
      acikOyunCerezi: baslangic.cerez,
      konumCerezi: undefined,
      girdiler: [],
      iddiaEdilenSkor: 999_999, // hile denemesi
    });

    assert.ok(sonuc.ok);
    assert.equal(sonuc.skor, 0, "sunucu kendi hesabını kullanmalı");

    const talep = misafir.talepCoz(sonuc.cerez);
    assert.ok(talep);
    assert.equal(talep.skor, 0);
    assert.equal(talep.iddia, 999_999, "iddia yalnızca denetim için taşınmalı (S5)");
  });

  test("geçersiz girdi kaydı reddediliyor", async () => {
    const sonuc = await misafirOyna({
      cafeId: kafeA,
      tableId: masaA,
      girdiler: [{ saçma: true }],
    });
    assert.equal(sonuc.ok, false);
    if (!sonuc.ok) assert.equal(sonuc.reddedildi, true);
  });
});

describe("talep imzası", () => {
  async function gecerliTalep() {
    const sonuc = await misafirOyna({ cafeId: kafeA, tableId: masaA });
    assert.ok(sonuc.ok);
    return sonuc.cerez;
  }

  test("üretilen talep çözülüyor", async () => {
    const talep = misafir.talepCoz(await gecerliTalep());
    assert.ok(talep);
    assert.equal(talep.cafeId, kafeA);
    assert.equal(talep.tableId, masaA);
    assert.equal(talep.oyunId, "blok");
  });

  /**
   * Bu testin varlık sebebi doğrudan: talep oyuncunun kendi çerezinde
   * duruyor. İmza olmasaydı skoru da kafeyi de kendisi yazardı.
   */
  test("kurcalanmış talep reddediliyor", async () => {
    const cerez = await gecerliTalep();
    const [govde, imza] = [cerez.slice(0, cerez.lastIndexOf(".")), cerez.slice(cerez.lastIndexOf(".") + 1)];

    // Skoru yükseltmeyi dene — imza tutmamalı
    const veri = JSON.parse(Buffer.from(govde, "base64url").toString("utf8"));
    veri.skor = 100_000;
    const sisirilmis = Buffer.from(JSON.stringify(veri), "utf8").toString("base64url");
    assert.equal(misafir.talepCoz(`${sisirilmis}.${imza}`), null, "şişirilmiş skor geçmemeli");

    // Kafeyi değiştirmeyi dene
    veri.skor = 0;
    veri.cafeId = kafeB;
    const baskaKafe = Buffer.from(JSON.stringify(veri), "utf8").toString("base64url");
    assert.equal(misafir.talepCoz(`${baskaKafe}.${imza}`), null, "kafe değişikliği geçmemeli");

    // Uydurma imza
    assert.equal(misafir.talepCoz(`${govde}.${"0".repeat(64)}`), null);
    // Bozuk biçimler
    assert.equal(misafir.talepCoz("saçma"), null);
    assert.equal(misafir.talepCoz(""), null);
    assert.equal(misafir.talepCoz(undefined), null);
  });

  test("süresi geçmiş talep sessizce düşüyor", async () => {
    const cerez = await gecerliTalep();
    const nokta = cerez.lastIndexOf(".");
    const veri = JSON.parse(Buffer.from(cerez.slice(0, nokta), "base64url").toString("utf8"));

    // Süreyi geçmişe çekmek imzayı bozar — ama imzayı bozmadan da süresi
    // dolabilir. İkinci durumu doğrudan sınamak için taze bir talep üretip
    // saatini geriye alamıyoruz; burada sınanan, kurcalamanın da işe
    // yaramadığı.
    veri.son = Date.now() - 1000;
    const gecmis = Buffer.from(JSON.stringify(veri), "utf8").toString("base64url");
    assert.equal(misafir.talepCoz(`${gecmis}.${cerez.slice(nokta + 1)}`), null);
  });

  /**
   * Masa bileti ve misafir talebi aynı anahtarla imzalanıyor. Amaç imzaya
   * karışmasaydı biri diğerinin yerine geçebilirdi.
   */
  test("masa bileti, talep diye geri gönderilemiyor", () => {
    const bilet = biletUret(kafeA, masaA);
    assert.ok(biletCoz(bilet), "bilet kendi yerinde çalışmalı");
    assert.equal(misafir.talepCoz(bilet), null, "bilet talep olarak kabul edilmemeli");
  });
});

describe("konum (K2) — koordinat saklanmıyor (G10)", () => {
  test("uzak konum K2 vermiyor, yakın konum veriyor", async () => {
    const kafe = await withBypass("test: kafe koordinatı", (db) =>
      db.one<{ lat: number | null; lng: number | null }>(
        `SELECT lat, lng FROM cafes WHERE id = $1`,
        [kafeA],
      ),
    );
    assert.ok(kafe?.lat != null && kafe.lng != null, "kafe A'nın konumu tohumda olmalı");

    const yakin = await misafir.konumDogrula({ cafeId: kafeA, lat: kafe.lat, lng: kafe.lng });
    assert.equal(yakin.durum, "dogrulandi");

    const uzak = await misafir.konumDogrula({
      cafeId: kafeA,
      lat: kafe.lat + 1, // ~111 km
      lng: kafe.lng,
    });
    assert.equal(uzak.durum, "uzak");

    // Çerezde koordinat YOK — yalnızca mesafe ve "yakın mı"
    assert.ok(yakin.durum === "dogrulandi");
    const govde = JSON.parse(
      Buffer.from(yakin.cerez.slice(0, yakin.cerez.lastIndexOf(".")), "base64url").toString("utf8"),
    );
    assert.deepEqual(Object.keys(govde).sort(), ["cafeId", "k2", "mesafeM", "son"]);
    assert.equal(String(govde.mesafeM).includes("."), false, "yalnızca tam metre saklanmalı");
  });

  test("başka kafede ölçülen konum burada geçmiyor", async () => {
    const kafe = await withBypass("test: kafe koordinatı", (db) =>
      db.one<{ lat: number | null; lng: number | null }>(
        `SELECT lat, lng FROM cafes WHERE id = $1`,
        [kafeA],
      ),
    );
    const olcum = await misafir.konumDogrula({ cafeId: kafeA, lat: kafe!.lat!, lng: kafe!.lng! });
    assert.ok(olcum.durum === "dogrulandi");

    assert.ok(misafir.konumOku(olcum.cerez, kafeA), "kendi kafesinde okunmalı");
    assert.equal(misafir.konumOku(olcum.cerez, kafeB), null, "başka kafede okunmamalı");
  });
});

describe("talebin bozdurulması", () => {
  async function yakinKonumCerezi(cafeId: string) {
    const kafe = await withBypass("test: kafe koordinatı", (db) =>
      db.one<{ lat: number | null; lng: number | null }>(
        `SELECT lat, lng FROM cafes WHERE id = $1`,
        [cafeId],
      ),
    );
    const olcum = await misafir.konumDogrula({ cafeId, lat: kafe!.lat!, lng: kafe!.lng! });
    assert.ok(olcum.durum === "dogrulandi");
    return olcum.cerez;
  }

  async function bozdur(playerId: string, talepCerezi: string) {
    const talep = misafir.talepCoz(talepCerezi);
    assert.ok(talep);
    return misafirOyunuYaz({
      playerId,
      cafeId: talep.cafeId,
      tableId: talep.tableId,
      oyunId: talep.oyunId,
      bolum: talep.bolum,
      tohum: talep.tohum,
      skor: talep.skor,
      basarili: talep.basarili,
      iddia: talep.iddia,
      sureMs: talep.sureMs,
    });
  }

  test("bozdurulan talep GERÇEK bir play_sessions satırı üretiyor", async () => {
    const oyuncu = await testOyuncu();
    const sonuc = await misafirOyna({ cafeId: kafeA, tableId: masaA });
    assert.ok(sonuc.ok);

    await masayaOturt(oyuncu.id, kafeA, masaA, true);
    const yazim = await bozdur(oyuncu.id, sonuc.cerez);
    assert.ok(yazim.ok, "talep bozdurulmalıydı");

    const satir = await withBypass("test: üretilen satır", (db) =>
      db.one<{
        status: string;
        server_score: number;
        game_id: string;
        cafe_id: string;
        input_log: unknown;
        proof_mask: number;
      }>(
        `SELECT status, server_score, game_id, cafe_id, input_log, proof_mask
           FROM play_sessions WHERE id = $1`,
        [yazim.oturumId],
      ),
    );
    assert.ok(satir);
    assert.equal(satir.status, "completed");
    assert.equal(satir.game_id, "blok");
    assert.equal(satir.cafe_id, kafeA);
    assert.equal(satir.server_score, 0);
    assert.equal(satir.input_log, null, "girdi kaydı taşınmıyor — Ü35 gereği");
    assert.ok((satir.proof_mask & K2) !== 0, "misafirken ölçülen konum masaya işlenmeliydi");
  });

  /**
   * Çerezi silmek yetmiyor: talep taşıyıcı bir jeton ve oyuncunun kendi
   * tarayıcısında duruyor. Değerini kaydedip girişten sonra geri koyan biri
   * aynı oyunu ikinci kez bozdurabilirdi.
   */
  test("aynı talep iki kez bozdurulamıyor", async () => {
    const oyuncu = await testOyuncu();
    const sonuc = await misafirOyna({ cafeId: kafeA, tableId: masaA });
    assert.ok(sonuc.ok);

    await masayaOturt(oyuncu.id, kafeA, masaA, true);
    assert.equal((await bozdur(oyuncu.id, sonuc.cerez)).ok, true);

    const ikinci = await bozdur(oyuncu.id, sonuc.cerez);
    assert.equal(ikinci.ok, false, "ikinci bozdurma reddedilmeliydi");
  });

  test("başka bir oyuncu, çalınan talebi bozduramıyor", async () => {
    const oynayan = await testOyuncu();
    const baskasi = await testOyuncu();

    const sonuc = await misafirOyna({ cafeId: kafeA, tableId: masaA });
    assert.ok(sonuc.ok);

    await masayaOturt(oynayan.id, kafeA, masaA, true);
    assert.equal((await bozdur(oynayan.id, sonuc.cerez)).ok, true);

    await masayaOturt(baskasi.id, kafeA, masaA, true);
    assert.equal(
      (await bozdur(baskasi.id, sonuc.cerez)).ok,
      false,
      "tohum zaten kullanılmış — kim denerse denesin geçmemeli",
    );
  });

  test("A kafesinde oynanan oyun B kafesinin bütçesine yazamıyor", async () => {
    const oyuncu = await testOyuncu();
    const sonuc = await misafirOyna({ cafeId: kafeA, tableId: masaA });
    assert.ok(sonuc.ok);

    // Oyuncu B kafesinin masasına oturuyor ve A'nın talebini bozdurmaya çalışıyor
    await masayaOturt(oyuncu.id, kafeB, masaB, true);
    const yazim = await bozdur(oyuncu.id, sonuc.cerez);
    assert.equal(yazim.ok, false, "talep başka kafenin masasında bozdurulmamalı");
  });

  test("K2 olmadan satır yazılıyor ama ödül açılmıyor (Ü3)", async () => {
    const oyuncu = await testOyuncu();
    const sonuc = await misafirOyna({ cafeId: kafeA, tableId: masaA });
    assert.ok(sonuc.ok);

    // Konum doğrulanmadan masaya otur — yalnızca K1
    await masayaOturt(oyuncu.id, kafeA, masaA, false);
    const yazim = await bozdur(oyuncu.id, sonuc.cerez);

    assert.ok(yazim.ok);
    assert.equal(yazim.kazandirir, false, "K2 yokken kazanım açılmamalı");
    assert.equal(yazim.puan, null);
    assert.equal(yazim.xp, 0);
    assert.equal(yazim.kupon, null);
  });

  test("masa oturumu hiç yoksa talep bozdurulmuyor", async () => {
    const oyuncu = await testOyuncu();
    const sonuc = await misafirOyna({ cafeId: kafeA, tableId: masaA });
    assert.ok(sonuc.ok);

    const yazim = await bozdur(oyuncu.id, sonuc.cerez);
    assert.equal(yazim.ok, false, "masaya oturmamış oyuncunun talebi bozdurulmamalı");
  });

  /**
   * Ü35'in manşet vaadi: *"önce oynasın, **ödül kazansın**."*
   *
   * Yukarıdaki testler talebin doğruluğunu sınıyor; bu test sözün kendisini
   * sınıyor. Talep doğrudan üretiliyor — imzanın kurcalanamazlığı ayrı
   * testlerde kanıtlandı, burada sınanan bozdurmanın **gerçek** puan, XP ve
   * defter satırı ürettiği.
   */
  test("başarılı ve konumu doğrulanmış talep GERÇEK puan ve XP yazıyor", async () => {
    const oyuncu = await testOyuncu();
    await masayaOturt(oyuncu.id, kafeA, masaA, true);

    const baslangic = await misafir.basla({
      oyunId: "blok",
      bolum: 1,
      cafeId: kafeA,
      tableId: masaA,
    });
    assert.ok(baslangic.ok);

    const yazim = await misafirOyunuYaz({
      playerId: oyuncu.id,
      cafeId: kafeA,
      tableId: masaA,
      oyunId: "blok",
      bolum: 1,
      tohum: baslangic.tohum,
      skor: 120,
      basarili: true,
      iddia: 120,
      sureMs: 45_000,
    });

    assert.ok(yazim.ok, "talep bozdurulmalıydı");
    assert.equal(yazim.kazandirir, true);
    assert.ok(yazim.puan, "puan yazılmalıydı");
    assert.ok(yazim.puan.yazilan > 0, `puan sıfır kalmamalı (${yazim.puan.yazilan})`);
    assert.ok(yazim.xp > 0, "XP yazılmalıydı");
    assert.equal(yazim.nitelikliOldu, true, "ilk başarılı ziyaret nitelikli sayılmalı");

    // Defterler gerçekten yazıldı mı — dönen nesneye değil, veritabanına bak
    const defter = await withBypass("test: puan defteri", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*) AS n FROM points_ledger
          WHERE player_id = $1 AND ref_id = $2`,
        [oyuncu.id, yazim.oturumId],
      ),
    );
    assert.equal(Number(defter!.n), 1, "puan defterine tam bir satır düşmeliydi");

    const xpDefter = await withBypass("test: xp defteri", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*) AS n FROM xp_ledger WHERE player_id = $1 AND source_id = $2`,
        [oyuncu.id, yazim.oturumId],
      ),
    );
    assert.equal(Number(xpDefter!.n), 1, "XP defterine tam bir satır düşmeliydi");
  });

  test("konum misafirken ölçülmüşse ödül gerçekten açılıyor", async () => {
    const oyuncu = await testOyuncu();
    const konumCerezi = await yakinKonumCerezi(kafeA);

    const sonuc = await misafirOyna({ cafeId: kafeA, tableId: masaA, konumCerezi });
    assert.ok(sonuc.ok);
    assert.equal(sonuc.k2, true, "yakın konum talebe işlenmeliydi");

    // Kayıt sırasında masaya oturuluyor; K2 talepten geliyor
    await masaOturumu.ac({ cafeId: kafeA, tableId: masaA, playerId: oyuncu.id });
    const talep = misafir.talepCoz(sonuc.cerez);
    assert.ok(talep);
    await masaOturumu.konumuUygula({
      playerId: oyuncu.id,
      cafeId: talep.cafeId,
      tableId: talep.tableId,
      k2: talep.k2,
      mesafeM: talep.mesafeM,
    });

    const yazim = await bozdur(oyuncu.id, sonuc.cerez);
    assert.ok(yazim.ok);
    assert.equal(
      yazim.kazandirir,
      true,
      "misafirken doğrulanan konum, kayıttan sonra kazanımı açmalı — Ü35'in vaadi bu",
    );
  });
});
