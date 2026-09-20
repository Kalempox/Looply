import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass, withCafe, withPlayer } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as masa from "@/domain/masa";
import * as xp from "@/domain/xp";
import * as rozet from "@/domain/rozet";
import * as acil from "@/domain/acil";
import { envanter } from "@/domain/odul";
import { birlestir, karne, kafeDurumlari } from "@/domain/profil";
import { kafeBazli } from "@/domain/gecmis";
import { yoneticiSorgu, benzersizEposta } from "./_yardim";

/**
 * FAZ 4 GÜVENLİK KAPISI — XP, seviye ve rozetler.
 *
 * Beş iddia sınanıyor:
 *   1. Kafe dışı oturumda hiçbir kazanım kaydı oluşmaz — puan da XP de (Ü3)
 *   2. XP harcanamaz; defter append-only (Ü14, E3)
 *   3. Bir kafenin XP'si başka kafeden okunamaz (Ü15, G12)
 *   4. Rozet hiçbir kazanım defterine dokunmaz ve kafe rozet tanımlayamaz (Ü16)
 *   5. Oyuncu ekranına giden veride kuponun TL değeri yoktur (E9)
 *
 * Ayrıca acil durdurmanın (G18) gerçekten durdurduğu ve iz bıraktığı.
 */

const KAFE_LAT = 41.0369;
const KAFE_LNG = 28.9838;

let kafeA = "";
let kafeB = "";
let masaA = "";
let oyuncuId = "";
let digerOyuncuId = "";

const TABAN = 3_000_000 + randomInt(5_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0557${String(TABAN + sayac++).slice(-7)}`);

/** Doğrulanmış (K2) masa oturumu açar — XP yazılabilir hâle getirir. */
async function dogrulanmisOturum(playerId: string) {
  await masa.ac({ cafeId: kafeA, tableId: masaA, playerId });
  const sonuc = await masa.konumDogrula(playerId, KAFE_LAT, KAFE_LNG);
  assert.equal(sonuc.durum, "dogrulandi", "test kurulumu: konum doğrulanamadı");
}

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const t = await db.one<{ id: string }>(
      "SELECT id FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1",
      [a!.id],
    );
    return { a: a?.id, b: b?.id, t: t?.id };
  });
  assert.ok(v.a && v.b && v.t, "Tohum verisi yok — önce: npm run db:seed");
  kafeA = v.a;
  kafeB = v.b;
  masaA = v.t;

  await yoneticiSorgu(`UPDATE cafes SET lat = $2, lng = $3 WHERE id = $1`, [
    kafeA,
    KAFE_LAT,
    KAFE_LNG,
  ]);

  // Acil durdurma anahtarları bilinen bir noktadan başlasın: yarıda kalmış
  // bir çalışma açık bırakmışsa testler birbirine bağımlı hâle gelirdi.
  await yoneticiSorgu(
    `UPDATE platform_config SET value = 'false'::jsonb
      WHERE key IN ('kupon_dagitimi_durduruldu','sms_durduruldu','oyun_durduruldu')`,
  );

  const { oyuncu } = await kaydet({
    telefon: yeniTelefon(),
    eposta: benzersizEposta(),
    ad: "XP",
    soyad: "Testi",
    dogumYili: 1990,
    pazarlamaIzni: false,
  });
  oyuncuId = oyuncu.id;

  const { oyuncu: diger } = await kaydet({
    telefon: yeniTelefon(),
    eposta: benzersizEposta(),
    ad: "Diger",
    soyad: "Oyuncu",
    dogumYili: 1990,
    pazarlamaIzni: false,
  });
  digerOyuncuId = diger.id;
});

after(async () => {
  for (const id of [oyuncuId, digerOyuncuId]) {
    await yoneticiSorgu(`DELETE FROM xp_ledger WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM player_badges WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM table_sessions WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [id]);
  }
  await closePools();
});

/* ═══════════════════════════════════════════════════════════
   1 · Seviye hesabı — saf fonksiyonlar
   ═══════════════════════════════════════════════════════════ */

describe("seviye hesabı", () => {
  test("sıfır XP birinci seviyedir — kimse sıfırıncı seviyede olmaz", () => {
    assert.equal(xp.seviye(0), 1);
  });

  test("eşiğe tam basmak seviyeyi yükseltir", () => {
    const esik = xp.SEVIYE_ESIKLERI[1];
    assert.equal(xp.seviye(esik - 1), 1);
    assert.equal(xp.seviye(esik), 2);
  });

  test("en üst seviyenin üstünde seviye artmaz", () => {
    const enUst = xp.SEVIYE_ESIKLERI.length;
    assert.equal(xp.seviye(9_999_999), enUst);
    assert.equal(xp.sonrakiEsik(9_999_999), null);
    assert.equal(xp.ilerlemeYuzde(9_999_999), 100);
  });

  test("ilerleme yüzdesi 0 ile 100 arasında kalır", () => {
    for (const deger of [0, 1, 99, 100, 299, 300, 21_000, 50_000]) {
      const y = xp.ilerlemeYuzde(deger);
      assert.ok(y >= 0 && y <= 100, `${deger} XP için ilerleme ${y}`);
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Ü3 — kafe dışında kazanım yok
   ═══════════════════════════════════════════════════════════ */

describe("XP yalnızca kafede kazanılır (Ü3)", () => {
  test("masa oturumu yokken oyundan XP yazılmaz", async () => {
    const yazildi = await xp.yaz({
      playerId: oyuncuId,
      cafeId: kafeA,
      delta: 50,
      kaynak: "GAME",
    });
    assert.equal(yazildi, false);

    const o = await xp.kafeSeviyesi(oyuncuId, kafeA);
    assert.equal(o.xp, 0, "kafe dışında yazılan XP defterde görünüyor");
  });

  test("konum doğrulanmamış oturumda da XP yazılmaz — K1 yetmez", async () => {
    await masa.ac({ cafeId: kafeA, tableId: masaA, playerId: digerOyuncuId });

    const yazildi = await xp.yaz({
      playerId: digerOyuncuId,
      cafeId: kafeA,
      delta: 50,
      kaynak: "GAME",
    });
    assert.equal(yazildi, false);
  });

  test("K2 doğrulanmış oturumda XP yazılır", async () => {
    await dogrulanmisOturum(oyuncuId);

    const yazildi = await xp.yaz({
      playerId: oyuncuId,
      cafeId: kafeA,
      delta: 120,
      kaynak: "GAME",
    });
    assert.equal(yazildi, true);

    const o = await xp.kafeSeviyesi(oyuncuId, kafeA);
    assert.equal(o.xp, 120);
    assert.equal(o.seviye, 2, "120 XP ikinci seviye olmalı");
  });

  test("başka kafede oturum varken o kafeye XP yazılamaz", async () => {
    // Oturum kafe A'da; kafe B için kazanım yazılmaya çalışılıyor.
    const yazildi = await xp.yaz({
      playerId: oyuncuId,
      cafeId: kafeB,
      delta: 500,
      kaynak: "GAME",
    });
    assert.equal(yazildi, false);

    const b = await xp.kafeSeviyesi(oyuncuId, kafeB);
    assert.equal(b.xp, 0);
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Ü14 / E3 — XP harcanmaz, defter append-only
   ═══════════════════════════════════════════════════════════ */

describe("XP harcanamaz (Ü14)", () => {
  test("negatif XP oyun kaynağıyla yazılamaz", async () => {
    await assert.rejects(
      () => xp.yaz({ playerId: oyuncuId, cafeId: kafeA, delta: -50, kaynak: "GAME" }),
      /ADJUSTMENT/,
    );
  });

  test("veritabanı da reddeder — kod atlansa bile", async () => {
    await assert.rejects(
      withBypass("test: doğrudan negatif satır", (db) =>
        db.query(
          `INSERT INTO xp_ledger
             (id, cafe_id, player_id, business_date, delta, source_type, proof_level)
           VALUES ('xp_test_negatif', $1, $2, current_date, -100, 'GAME', 2)`,
          [kafeA, oyuncuId],
        ),
      ),
      /xp_harcanmaz|xp_oyun_kafede|violates check constraint/i,
    );
  });

  test("kanıtsız oyun satırı veritabanı seviyesinde reddedilir (Ü3)", async () => {
    await assert.rejects(
      withBypass("test: kanıtsız oyun satırı", (db) =>
        db.query(
          `INSERT INTO xp_ledger
             (id, cafe_id, player_id, business_date, delta, source_type, proof_level)
           VALUES ('xp_test_kanitsiz', $1, $2, current_date, 100, 'GAME', 1)`,
          [kafeA, oyuncuId],
        ),
      ),
      /xp_oyun_kafede|violates check constraint/i,
    );
  });

  test("defter satırı güncellenemez — uygulama rolünde UPDATE yok (E3)", async () => {
    await assert.rejects(
      withBypass("test: defter güncelleme", (db) =>
        db.query(`UPDATE xp_ledger SET delta = 9999 WHERE player_id = $1`, [oyuncuId]),
      ),
      /permission denied/i,
    );
  });

  test("düzeltme ters satırla yapılır ve bakiyeye yansır", async () => {
    const once = await xp.kafeSeviyesi(oyuncuId, kafeA);

    const yazildi = await xp.yaz({
      playerId: oyuncuId,
      cafeId: kafeA,
      delta: -20,
      kaynak: "ADJUSTMENT",
      kaynakId: "test-duzeltme",
    });
    assert.equal(yazildi, true);

    const sonra = await xp.kafeSeviyesi(oyuncuId, kafeA);
    assert.equal(sonra.xp, once.xp - 20);
  });
});

/* ═══════════════════════════════════════════════════════════
   4 · Ü15 / G12 — kafe izolasyonu
   ═══════════════════════════════════════════════════════════ */

describe("XP kafe bazında izole (Ü15, G12)", () => {
  test("kafe A'nın XP satırı kafe B bağlamında görünmez", async () => {
    const bDeki = await withCafe(kafeB, (db) =>
      db.all(`SELECT id FROM xp_ledger WHERE player_id = $1`, [oyuncuId]),
    );
    assert.equal(bDeki.length, 0, "kafe B, kafe A'nın XP satırlarını görüyor");
  });

  test("kafe A bağlamında kendi satırları görünür", async () => {
    const aDaki = await withCafe(kafeA, (db) =>
      db.all(`SELECT id FROM xp_ledger WHERE player_id = $1`, [oyuncuId]),
    );
    assert.ok(aDaki.length > 0, "kafe kendi XP satırlarını göremiyor");
  });

  test("oyuncu başkasının XP satırını göremez", async () => {
    const baskasinin = await withPlayer(digerOyuncuId, (db) =>
      db.all(`SELECT id FROM xp_ledger WHERE player_id = $1`, [oyuncuId]),
    );
    assert.equal(baskasinin.length, 0, "oyuncu başkasının XP'sini görüyor");
  });

  test("bir kafedeki seviye diğerine taşınmaz", async () => {
    const a = await xp.kafeSeviyesi(oyuncuId, kafeA);
    const b = await xp.kafeSeviyesi(oyuncuId, kafeB);
    assert.ok(a.xp > 0);
    assert.equal(b.xp, 0);
    assert.equal(b.seviye, 1);
  });
});

/* ═══════════════════════════════════════════════════════════
   5 · Ü16 — rozetin ekonomik değeri yok
   ═══════════════════════════════════════════════════════════ */

describe("rozetler yalnızca statü (Ü16)", () => {
  test("rozet kazanmak hiçbir kazanım defterine satır yazmaz", async () => {
    const say = () =>
      withBypass("test: defter sayımı", async (db) => {
        const r = await db.one<{ puan: string; xp: string; butce: string }>(
          `SELECT (SELECT count(*) FROM points_ledger WHERE player_id = $1) AS puan,
                  (SELECT count(*) FROM xp_ledger     WHERE player_id = $1) AS xp,
                  (SELECT count(*) FROM budget_ledger WHERE cafe_id  = $2) AS butce`,
          [oyuncuId, kafeA],
        );
        return { puan: Number(r?.puan), xp: Number(r?.xp), butce: Number(r?.butce) };
      });

    const once = await say();
    const yeniler = await rozet.degerlendir(oyuncuId, kafeA);
    const sonra = await say();

    assert.ok(yeniler.length > 0, "ziyaret rozeti kazanılmalıydı — kurulum hatalı olabilir");
    assert.deepEqual(sonra, once, "rozet kazanımı bir kazanım defterine dokundu");
  });

  test("aynı rozet ikinci kez kazanılmaz", async () => {
    const ikinci = await rozet.degerlendir(oyuncuId, kafeA);
    assert.equal(ikinci.length, 0, "aynı rozet tekrar yazıldı");
  });

  test("kazanılan rozet profilde görünür ve kafesine bağlıdır", async () => {
    const hepsi = await rozet.oyuncununRozetleri(oyuncuId);
    const ziyaret = hepsi.find((r) => r.code === "ilk_ziyaret");
    assert.ok(ziyaret, "ilk ziyaret rozeti bulunamadı");
    assert.equal(ziyaret.kapsam, "cafe");
    assert.equal(ziyaret.cafeId, kafeA);
  });

  test("kafe kendi rozetini tanımlayamaz — uygulama rolü yazamaz", async () => {
    await assert.rejects(
      withCafe(kafeA, (db) =>
        db.query(
          `INSERT INTO badges (code, title, description, scope, rule_key)
           VALUES ('kafe_kendi_rozeti', 'Bizim Müdavim', 'Kafenin kendi rozeti', 'cafe', 'ziyaret_sayisi')`,
        ),
      ),
      /permission denied/i,
    );
  });

  test("kazanılmış rozet güncellenemez", async () => {
    await assert.rejects(
      withBypass("test: rozet güncelleme", (db) =>
        db.query(`UPDATE player_badges SET badge_code = 'mudavim' WHERE player_id = $1`, [
          oyuncuId,
        ]),
      ),
      /permission denied/i,
    );
  });

  test("kafe rozeti, kafe bilinmeden değerlendirilmez", async () => {
    // Kafe dışındaki oyuncu için yalnızca global rozetler bakılır;
    // kafe rozeti yazılmamalı.
    const once = await rozet.oyuncununRozetleri(digerOyuncuId);
    await rozet.degerlendir(digerOyuncuId);
    const sonra = await rozet.oyuncununRozetleri(digerOyuncuId);

    assert.equal(
      sonra.filter((r) => r.kapsam === "cafe").length,
      once.filter((r) => r.kapsam === "cafe").length,
      "kafe bilinmeden kafe rozeti yazıldı",
    );
  });
});

/* ═══════════════════════════════════════════════════════════
   6 · E9 — oyuncu ekranında TL yok
   ═══════════════════════════════════════════════════════════ */

describe("ödül envanteri TL değeri taşımaz (E9)", () => {
  test("envanter kaydında para alanı bulunmuyor", async () => {
    const e = await envanter(oyuncuId);
    const hepsi = [...e.kullanilabilir, ...e.bekleyen, ...e.kullanilan, ...e.kacirilan];

    // Oyuncusu olmayan bir ortamda liste boş olabilir; iddia yine de
    // anlamlı: dönen her kayıt için alan adları denetleniyor.
    for (const k of hepsi) {
      for (const alan of Object.keys(k)) {
        assert.ok(
          !/kurus|tutar|deger|fiyat|price|amount/i.test(alan),
          `envanterde para alanı var: ${alan}`,
        );
      }
    }
  });

  test("başka oyuncunun kuponu envanterde görünmez", async () => {
    const e = await envanter(digerOyuncuId);
    const kimlikler = [...e.kullanilabilir, ...e.bekleyen, ...e.kullanilan, ...e.kacirilan].map((k) => k.id);

    const benimkiler = await withBypass("test: kupon sahipliği", (db) =>
      db.all<{ id: string }>(`SELECT id FROM coupons WHERE player_id = $1`, [oyuncuId]),
    );

    for (const b of benimkiler) {
      assert.ok(!kimlikler.includes(b.id), "başka oyuncunun kuponu sızdı");
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   7 · G18 — acil durdurma
   ═══════════════════════════════════════════════════════════ */

describe("acil durdurma (G18)", () => {
  test("üç anahtar da tanımlı ve varsayılanı açık", async () => {
    const d = await acil.durum();
    assert.equal(d.kuponDurduruldu, false);
    assert.equal(d.smsDurduruldu, false);
    assert.equal(d.oyunDurduruldu, false);
  });

  test("anahtar çevrilince durum yansır ve geri alınabilir", async () => {
    await acil.cevir(acil.ANAHTARLAR.kupon, true, "test-yonetici");
    assert.equal(await acil.durduruldu(acil.ANAHTARLAR.kupon), true);

    const acikken = await acil.durum();
    assert.equal(acikken.kuponDurduruldu, true);

    await acil.cevir(acil.ANAHTARLAR.kupon, false, "test-yonetici");
    assert.equal(await acil.durduruldu(acil.ANAHTARLAR.kupon), false);
  });

  test("her durdurma denetim izine düşer", async () => {
    await acil.cevir(acil.ANAHTARLAR.sms, true, "test-yonetici");

    const iz = await withBypass("test: denetim izi", (db) =>
      db.all<{ action: string }>(
        `SELECT action FROM audit_log
          WHERE action = 'emergency.toggle' AND target_id = $1
          ORDER BY created_at DESC LIMIT 1`,
        [acil.ANAHTARLAR.sms],
      ),
    );
    assert.equal(iz.length, 1, "acil durdurma denetim izine düşmedi");

    await acil.cevir(acil.ANAHTARLAR.sms, false, "test-yonetici");
    await yoneticiSorgu(`DELETE FROM audit_log WHERE action = 'emergency.toggle'`);
  });

  test("tanınmayan anahtar reddedilir — platform_config'e satır eklenmez", async () => {
    const ok = await acil.cevir("her_seyi_durdur", true, "test-yonetici");
    assert.equal(ok, false);

    const satir = await withBypass("test: uydurma anahtar", (db) =>
      db.one(`SELECT 1 FROM platform_config WHERE key = 'her_seyi_durdur'`),
    );
    assert.equal(satir, undefined, "uydurma anahtar yazıldı");
  });
});

/* ═══════════════════════════════════════════════════════════
   8 · Profil karnesi — üç kaynağın birleşmesi
   ═══════════════════════════════════════════════════════════ */

describe("profil karnesi", () => {
  const sahteRozet = (cafeId: string | null, cafeAdi: string | null) => ({
    code: "ilk_ziyaret",
    baslik: "İlk Ziyaret",
    aciklama: "",
    kapsam: (cafeId ? "cafe" : "global") as "cafe" | "global",
    cafeId,
    cafeAdi,
    kazanildi: new Date(),
  });

  test("yalnızca rozeti olan kafe de kart açar — REGRESYON", () => {
    // Tarayıcıda yakalanan hata: ilk ziyaret rozeti kazanan ama henüz
    // oynamamış oyuncunun profili bomboş görünüyordu. Rozet veritabanında
    // duruyordu, ekranda yoktu.
    const kartlar = birlestir([], [], [sahteRozet("cafe_x", "Kafe X")]);

    assert.equal(kartlar.length, 1, "rozet tek başına kafe kartı açmalı");
    assert.equal(kartlar[0].cafeAdi, "Kafe X");
    assert.equal(kartlar[0].rozetler.length, 1);
    assert.equal(kartlar[0].xp, 0);
    assert.equal(kartlar[0].seviye, 1);
  });

  test("sıfır XP'li kart 'en üst seviye' demez — REGRESYON", () => {
    // `sonrakiEsik: null` arayüzde "En üst seviyedesin" anlamına geliyor.
    // Hiç XP kazanmamış oyuncuya söylenecek en yanlış cümle bu.
    const kartlar = birlestir([], [], [sahteRozet("cafe_x", "Kafe X")]);

    assert.notEqual(kartlar[0].sonrakiEsik, null, "sıfır XP en üst seviye sayıldı");
    assert.equal(kartlar[0].sonrakiEsik, xp.SEVIYE_ESIKLERI[1]);
    assert.equal(kartlar[0].ilerlemeYuzde, 0);
  });

  test("durum kart AÇMIYOR, yalnızca var olanı dolduruyor", () => {
    /*
      Ü188. Puanı olup seviyesi, geçmişi ve rozeti olmayan bir kafe
      olamaz — puan da XP de aynı oyun turundan doğuyor. Durumdan kart
      açmak, olmayan bir hâli kurtaran ölü kod olurdu ve yanlışlıkla
      "adı boş" bir kafe kartı doğururdu.
    */
    const yalnizDurum = birlestir(
      [],
      [],
      [],
      new Map([
        [
          "cafe_x",
          {
            puan: 500,
            kuponToplam: 2,
            kuponElde: 1,
            kuponKullanilan: 1,
            seri: { gun: 3, bugunOynadi: true, riskte: false },
          },
        ],
      ]),
    );
    assert.equal(yalnizDurum.length, 0, "durum tek başına kafe kartı açtı");

    // Kartı olan kafeye ise işliyor.
    const dolu = birlestir(
      [],
      [{ cafeId: "cafe_x", cafeAdi: "Kafe X", toplamOyun: 4, oyunlar: [] }],
      [],
      new Map([
        [
          "cafe_x",
          {
            puan: 500,
            kuponToplam: 2,
            kuponElde: 1,
            kuponKullanilan: 1,
            seri: { gun: 3, bugunOynadi: true, riskte: false },
          },
        ],
      ]),
    );
    assert.equal(dolu[0].puan, 500);
    assert.equal(dolu[0].kuponElde, 1);
    assert.equal(dolu[0].seri.gun, 3);
  });

  test("durum verilmeyen kart sıfırlarla doluyor, undefined kalmıyor", () => {
    /*
      Ekran `kafe.puan.toLocaleString()` çağırıyor; alan `undefined`
      kalsaydı profil çökerdi. Boş kart da tam bir `KafeDurumu` taşımalı.
    */
    const k = birlestir([], [], [sahteRozet("cafe_x", "Kafe X")])[0];
    assert.equal(k.puan, 0);
    assert.equal(k.kuponElde, 0);
    assert.equal(k.kuponToplam, 0);
    assert.equal(k.seri.gun, 0);
    assert.equal(k.seri.riskte, false);
  });

  test("global rozet kafe kartı açmaz", () => {
    const kartlar = birlestir([], [], [sahteRozet(null, null)]);
    assert.equal(kartlar.length, 0);
  });

  test("üç kaynak aynı kafede tek kartta birleşir", () => {
    const kartlar = birlestir(
      [
        {
          cafeId: "cafe_x",
          cafeAdi: "Kafe X",
          xp: 300,
          seviye: 3,
          sonrakiEsik: 700,
          ilerlemeYuzde: 0,
        },
      ],
      [{ cafeId: "cafe_x", cafeAdi: "Kafe X", toplamOyun: 7, oyunlar: [] }],
      [sahteRozet("cafe_x", "Kafe X")],
    );

    assert.equal(kartlar.length, 1, "aynı kafe için iki kart açıldı");
    assert.equal(kartlar[0].xp, 300);
    assert.equal(kartlar[0].toplamOyun, 7);
    assert.equal(kartlar[0].rozetler.length, 1);
  });

  test("kafeDurumlari puanı kafeye göre AYIRIYOR — VERİTABANI", async () => {
    /*
      Ü188. Bu testin işi SQL'i sınamak: sorgu üç tabloya birden bakıyor
      ve hiçbiri tip denetiminden geçmiyor.

      🔴 Veriyi test KENDİSİ kuruyor. İlk yazımda bu dosyadaki oyuncunun
      mevcut puanına güvenmiştim ve test düştü — haklı olarak: bu dosya
      *"kafe dışı oturumda hiçbir kazanım kaydı oluşmaz"* kuralını
      sınıyor (Ü3), yani oyuncunun defteri BİLEREK boş. Var olan veriye
      yaslanan test, başka bir testin kurduğu duruma bağımlı olur.

      🔴 İki kafeye birden yazılıyor çünkü asıl risk toplamada değil
      GRUPLAMADA: `GROUP BY cafe_id` unutulsaydı tek bir toplam dönerdi
      ve iki kafe aynı sayıyı gösterirdi (Ü15, G12'nin ekrandaki
      karşılığı).
    */
    await yoneticiSorgu(
      `INSERT INTO points_ledger (id, cafe_id, player_id, business_date, delta, reason)
       VALUES ($1, $2, $3, current_date, 70, 'test'),
              ($4, $5, $3, current_date, 30, 'test'),
              ($6, $7, $3, current_date, 11, 'test')`,
      [
        `pl_t_${Date.now()}_a`,
        kafeA,
        oyuncuId,
        `pl_t_${Date.now()}_b`,
        kafeA,
        `pl_t_${Date.now()}_c`,
        kafeB,
      ],
    );

    const durumlar = await kafeDurumlari(oyuncuId);

    assert.equal(durumlar.get(kafeA)?.puan, 100, "aynı kafenin satırları toplanmadı");
    assert.equal(durumlar.get(kafeB)?.puan, 11, "kafe B'nin puanı A'ya karıştı");

    /*
      ⚠️ Kendi çöpünü topluyor. İlk yazımda toplamıyordu ve testler
      geçtiği hâlde DOSYA düşüyordu: `after` kancası oyuncuyu siliyor,
      defter satırı yabancı anahtarla buna engel oluyordu. Hata testte
      değil temizlikte görünüyordu — veri kuran her testin sorumluluğu.
    */
    await yoneticiSorgu(`DELETE FROM points_ledger WHERE player_id = $1 AND reason = 'test'`, [
      oyuncuId,
    ]);
  });

  test("oyun karnesi oyunu TEKLİYOR, kafe toplamı oturum sayısı kalıyor — VERİTABANI", async () => {
    /*
      Ü192. Bu sorgu Ü20'den beri son on oturumu satır satır döndürüyordu
      ve ekran onu kütük gibi basıyordu; artık `GROUP BY game_id` ile
      oyun başına tek satır dönüyor. Testin işi iki ayrı tuzağı sınamak:

      🔴 1. Rekor SON oyun değil EN İYİ oyun. Gruplama `max()` yerine
      son satırı alsaydı ekranda "en iyi" yazıp son skoru gösterirdi —
      oyuncunun rekorunu her kötü turda silen bir sayı.

      🔴 2. Kafe toplamı `sum(count(*)) OVER`, `count(*) OVER` DEĞİL.
      Gruplamadan sonra ikincisi "kaç FARKLI oyun" der: beş oturum
      oynamış oyuncuya "burada oynadıkların · 2" yazardı. Bu yüzden
      aşağıda oyun sayısı (2) ile oturum sayısı (5) bilerek farklı.
    */
    const gun = new Date().toISOString().slice(0, 10);
    const skorlar: Array<[string, number]> = [
      ["blok", 120],
      ["blok", 940], // ← rekor ortada, sonda değil
      ["blok", 310],
      ["dusen", 70],
      ["dusen", 55],
    ];

    for (const [oyunId, skor] of skorlar) {
      await yoneticiSorgu(
        `INSERT INTO play_sessions
           (id, cafe_id, player_id, device_id_hash, game_id, seed,
            started_at, ended_at, server_score, business_date, status)
         VALUES ($1,$2,$3,decode(md5($1),'hex'),$4,'tohum',
                 now(), now(), $5, $6::date, 'completed')`,
        [`oyn_karne_${sayac++}_${Date.now()}`, kafeA, oyuncuId, oyunId, skor, gun],
      );
    }

    const kafeler = await kafeBazli(oyuncuId);
    const kart = kafeler.find((k) => k.cafeId === kafeA);
    assert.ok(kart, "oyun oynanan kafe karnede yok");

    assert.equal(kart.oyunlar.length, 2, "aynı oyun birden fazla satır açtı");
    assert.equal(kart.toplamOyun, 5, "kafe toplamı oturum değil oyun sayısını saydı");

    const blok = kart.oyunlar.find((o) => o.oyunId === "blok");
    assert.ok(blok, "blok satırı yok");
    assert.equal(blok.kez, 3);
    assert.equal(blok.enIyi, 940, "rekor en yüksek skor değil");

    // Çok oynanan önce: ekran sıralamayı SQL'den alıyor.
    assert.equal(kart.oyunlar[0].oyunId, "blok", "sıralama çok oynanandan aza değil");

    /* ⚠️ Kendi çöpünü topluyor — `after` oyuncuyu siliyor ve yabancı
       anahtar buna engel olurdu (aynı tuzak Ü188 testinde yaşandı). */
    await yoneticiSorgu(`DELETE FROM play_sessions WHERE id LIKE 'oyn_karne_%'`);
  });

  test("XP'si olmayan ama rozeti olan oyuncunun karnesi gerçekten doluyor", async () => {
    // digerOyuncuId'nin masa oturumu var, XP'si yok.
    await rozet.degerlendir(digerOyuncuId, kafeA);
    const k = await karne(digerOyuncuId);

    const kart = k.kafeler.find((x) => x.cafeId === kafeA);
    assert.ok(kart, "rozet kazanılmış kafe karnede yok");
    assert.equal(kart.xp, 0);
    assert.ok(
      kart.rozetler.some((r) => r.code === "ilk_ziyaret"),
      "kazanılan rozet karnede görünmüyor",
    );
  });
});
