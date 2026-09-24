import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import { newId } from "@/lib/ids";
import { isGunu, gunEkle } from "@/lib/tarih";
import * as kupon from "@/domain/kupon";
import * as motor from "@/domain/odul-motoru";
import * as oyun from "@/domain/oyun";
import * as misafir from "@/domain/misafir";
import * as masaOturumu from "@/domain/masa";
import { sekme, ACI_SAYISI, type SekmeDurumu, type SekmeGirdisi } from "@/oyunlar/sekme";
import { yoneticiSorgu, benzersizEposta, testKafeleriniSil } from "./_yardim";

/**
 * Ü275 — ödül paketi "görünürse kesin".
 *
 * Ürün sahibi Blok Kırıcı'da ödüllü bloğu kırdı ve hiçbir şey almadı. İki
 * ayrı sebep vardı ve ikisi de burada sınanıyor:
 *
 *   1. **Çark oyunun günlük hakkını tüketiyordu.** Çarktan kazanan oyuncu
 *      o gün hiçbir oyundan ödül alamıyordu. Kararı: *"ayrı olsun."*
 *   2. **Paket bir söz değildi.** 500'ü geçen her turda çıkıyor, kupon ise
 *      tur sonunda şansla veriliyordu. Kararı: *"görünürse kesin."*
 *
 * Kendi kafesini kuruyor (`cark.test.ts`teki kalıp): Kafe A ürün sahibinin
 * elle test ettiği kafe ve bu dosya onun ödüllerine, bütçesine dokunmuyor.
 */

const TABAN = 4_000_000 + randomInt(5_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0557${String(TABAN + sayac++).slice(-7)}`);

/** Kafenin açık olduğu bir an — `kupon-kazima.test.ts`teki gerekçe. */
const KAFE_ACIK = new Date();
KAFE_ACIK.setHours(14, 0, 0, 0);

/** Kafenin kapalı olduğu bir an (varsayılan saatler 09–23). */
const KAFE_KAPALI = new Date();
KAFE_KAPALI.setHours(4, 0, 0, 0);

const olusanKafeler: string[] = [];
let kafe = "";
let masa = "";
let butcesizKafe = "";
let odulId = "";

async function kafeKur(ad: string, butceli: boolean): Promise<{ id: string; masa: string; odul: string }> {
  const id = newId("cafe");
  olusanKafeler.push(id);
  const masaId = newId("tbl");
  let ilkOdul = "";
  await withBypass("test kafe — paket", async (db) => {
    await db.query(
      `INSERT INTO cafes (id, name, slug, status, lat, lng)
       VALUES ($1,$2,$3,'approved',41.0,29.0)`,
      [id, ad, `${ad.toLowerCase()}-${id.slice(-6)}`],
    );
    await db.query(
      `INSERT INTO cafe_tables (id, cafe_id, label, qr_secret)
       VALUES ($1,$2,'Masa 1',decode('00','hex'))`,
      [masaId, id],
    );
    for (const [baslik, kurus] of [
      ["Paket ucuz", 25_00],
      ["Paket pahalı", 40_00],
    ] as const) {
      const rid = newId("rwd");
      if (!ilkOdul) ilkOdul = rid;
      await db.query(
        `INSERT INTO rewards (id, cafe_id, kind, title, points_price, cost_kurus,
                              min_proof_level, reward_type, active)
         VALUES ($1,$2,'instant',$3,0,$4,2,'product',true)`,
        [rid, id, baslik, kurus],
      );
    }
    if (butceli) {
      const gun = isGunu();
      await db.query(
        `INSERT INTO budget_periods (id, cafe_id, period_start, period_end, committed_kurus)
         VALUES ($1,$2,$3,$4,$5)`,
        [newId("bp"), id, gun, gunEkle(gun, 1), 5_000_00],
      );
    }
  });
  return { id, masa: masaId, odul: ilkOdul };
}

/** Kafede, konumu doğrulanmış (K2) bir oyuncu. */
async function masadakiOyuncu(): Promise<string> {
  const { oyuncu } = await kaydet({
    telefon: yeniTelefon(),
    eposta: benzersizEposta(),
    ad: "Paket",
    soyad: "Testi",
    dogumYili: 1991,
    pazarlamaIzni: false,
  });
  await masaOturumu.ac({ cafeId: kafe, tableId: masa, playerId: oyuncu.id });
  await masaOturumu.konumuUygula({
    playerId: oyuncu.id,
    cafeId: kafe,
    tableId: masa,
    k2: true,
    mesafeM: 20,
  });
  return oyuncu.id;
}

/**
 * Blok Kırıcı'yı (sekme) oynayan küçük bot.
 *
 * Her atışta açıları dener: paket tahtadaysa onu alan açıyı, değilse en
 * çok skoru getireni seçiyor. `dur` doğru dönünce kaydı ve durumu veriyor.
 */
function sekmeOyna(
  tohum: string,
  dur: (d: SekmeDurumu) => boolean,
  basla?: { durum: SekmeDurumu; girdiler: SekmeGirdisi[] },
): { durum: SekmeDurumu; girdiler: SekmeGirdisi[] } {
  let d = basla?.durum ?? sekme.baslat(tohum);
  const girdiler = [...(basla?.girdiler ?? [])];
  for (let i = 0; i < 120 && !sekme.bittiMi(d) && !dur(d); i++) {
    let enIyi: { a: number; s: SekmeDurumu; puan: number } | null = null;
    for (let a = 0; a < ACI_SAYISI; a += 2) {
      const s = sekme.uygula(d, { t: d.tur, a });
      if (!s) continue;
      const teslim = s.odulVerildi && !d.odulVerildi ? 1_000_000 : 0;
      const puan = teslim + s.skor - (sekme.bittiMi(s) ? 500_000 : 0);
      if (!enIyi || puan > enIyi.puan) enIyi = { a, s, puan };
    }
    if (!enIyi) break;
    girdiler.push({ t: d.tur, a: enIyi.a });
    d = enIyi.s;
  }
  return { durum: d, girdiler };
}

const odulVar = (d: SekmeDurumu) => sekme.odulVar!(d);
const odulTeslim = (d: SekmeDurumu) => sekme.odulTeslim!(d);

/** Zarı "evet" çıkan bir tohum — sert şartları ayrı sınamak için. */
function sansliTohum(): string {
  for (let i = 0; i < 10_000; i++) {
    const t = `paket-tohum-${TABAN}-${i}`;
    if (kupon.paketZari(t) < motor.paketSansi(0)) return t;
  }
  throw new Error("şanslı tohum bulunamadı");
}

async function sozuOku(oturumId: string): Promise<boolean | null> {
  const r = await withBypass("test: söz", (db) =>
    db.one<{ odul_sozu: boolean | null }>(`SELECT odul_sozu FROM play_sessions WHERE id = $1`, [
      oturumId,
    ]),
  );
  return r?.odul_sozu ?? null;
}

before(async () => {
  await yoneticiSorgu(
    `UPDATE platform_config SET value = 'false'::jsonb
      WHERE key IN ('kupon_dagitimi_durduruldu','oyun_durduruldu')`,
  );
  const a = await kafeKur("PaketTest", true);
  kafe = a.id;
  masa = a.masa;
  odulId = a.odul;
  butcesizKafe = (await kafeKur("PaketButcesiz", false)).id;
});

after(async () => {
  await testKafeleriniSil(olusanKafeler);
  await closePools();
});

/* ═══════════════════════════════════════════════════════════
   1 · Çark ile oyun ayrı haklar
   ═══════════════════════════════════════════════════════════ */

describe("çark ve oyun ayrı günlük haklar (Ü275)", () => {
  test("🔴 çarktan kazanan oyuncu aynı gün oyundan da kazanabiliyor", async () => {
    const p = await masadakiOyuncu();

    const cark = await kupon.carkOduluVer({
      playerId: p,
      cafeId: kafe,
      odulId,
      kanitSeviyesi: 2,
      ilkCevirme: true,
      an: KAFE_ACIK,
    });
    assert.ok(cark.ok, cark.ok === false ? cark.hata : "");

    // Ürün sahibinin yaşadığı: çark kuponu oyunun hakkını yiyordu.
    const tohum = sansliTohum();
    const soz = await withBypass("test: söz", (db) =>
      kupon.odulSozuVer(db, {
        playerId: p,
        cafeId: kafe,
        oyunId: "sekme",
        kanitSeviyesi: 2,
        tohum,
        an: KAFE_ACIK,
      }),
    );
    assert.equal(soz, true, "çark kuponu oyunun günlük hakkını tüketti");

    const oyundan = await withBypass("test: oyun ödülü", (db) =>
      kupon.anlikOdulVer(db, {
        playerId: p,
        cafeId: kafe,
        kanitSeviyesi: 2,
        skor: 800,
        oyunId: "sekme",
        garanti: true,
        an: KAFE_ACIK,
      }),
    );
    assert.ok(oyundan?.ok, "çarktan sonra oyun ödülü verilmedi");
  });

  test("oyunun kendi sınırı duruyor — günde bir oyun ödülü", async () => {
    const p = await masadakiOyuncu();
    const ver = () =>
      withBypass("test: oyun ödülü", (db) =>
        kupon.anlikOdulVer(db, {
          playerId: p,
          cafeId: kafe,
          kanitSeviyesi: 2,
          skor: 800,
          oyunId: "sekme",
          garanti: true,
          an: KAFE_ACIK,
        }),
      );
    const ilk = await ver();
    assert.ok(ilk?.ok, "ilk oyun ödülü verilmedi");
    assert.equal(await ver(), null, "ikinci oyun ödülü verildi — sınır kalktı");

    // Paket de artık görünmüyor: söz verilemeyecek bir ödül için paket yok.
    const soz = await withBypass("test: söz", (db) =>
      kupon.odulSozuVer(db, {
        playerId: p,
        cafeId: kafe,
        oyunId: "sekme",
        kanitSeviyesi: 2,
        tohum: sansliTohum(),
        an: KAFE_ACIK,
      }),
    );
    assert.equal(soz, false, "günlük hakkı dolan oyuncuya paket gösterildi");
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Paket kararı — sert şartlar ve zar
   ═══════════════════════════════════════════════════════════ */

describe("paket kararı (odulSozuVer)", () => {
  const karar = (opts: { playerId: string | null; cafeId?: string; an?: Date; tohum?: string }) =>
    withBypass("test: paket kararı", (db) =>
      kupon.odulSozuVer(db, {
        playerId: opts.playerId,
        cafeId: opts.cafeId ?? kafe,
        oyunId: "sekme",
        kanitSeviyesi: 2,
        tohum: opts.tohum ?? sansliTohum(),
        an: opts.an ?? KAFE_ACIK,
      }),
    );

  test("şanslı zar + açık kafe + hak + bütçe → evet", async () => {
    assert.equal(await karar({ playerId: await masadakiOyuncu() }), true);
  });

  test("kafe kapalıyken paket yok", async () => {
    assert.equal(await karar({ playerId: await masadakiOyuncu(), an: KAFE_KAPALI }), false);
  });

  test("bütçe en ucuz ödüle yetmiyorsa paket yok", async () => {
    // Bütçe dönemi hiç açılmamış kafe: dağıtılabilir tutar sıfır.
    assert.equal(await karar({ playerId: null, cafeId: butcesizKafe }), false);
  });

  test("kupon dağıtımı acil durdurulduysa paket yok", async () => {
    await yoneticiSorgu(
      `UPDATE platform_config SET value = 'true'::jsonb WHERE key = 'kupon_dagitimi_durduruldu'`,
    );
    try {
      assert.equal(await karar({ playerId: await masadakiOyuncu() }), false);
    } finally {
      await yoneticiSorgu(
        `UPDATE platform_config SET value = 'false'::jsonb WHERE key = 'kupon_dagitimi_durduruldu'`,
      );
    }
  });

  test("zar tohumdan anahtarlı: aynı tur hep aynı cevap, oran paketSansi", () => {
    const t = `sabit-${TABAN}`;
    assert.equal(kupon.paketZari(t), kupon.paketZari(t), "aynı tohum farklı zar verdi");

    const N = 4_000;
    let evet = 0;
    for (let i = 0; i < N; i++) if (kupon.paketZari(`oran-${TABAN}-${i}`) < motor.paketSansi(0)) evet++;
    const oran = evet / N;
    assert.ok(
      Math.abs(oran - motor.paketSansi(0)) < 0.03,
      `zar oranı ${oran.toFixed(3)}, beklenen ${motor.paketSansi(0).toFixed(3)}`,
    );
  });

  test("bıkkınlık paketin şansını kısıyor", () => {
    assert.ok(motor.paketSansi(2) < motor.paketSansi(0));
    assert.ok(motor.paketSansi(0) > 0.3 && motor.paketSansi(0) < 0.4, "oran bugünkü aralığın ortası değil");
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Uçtan uca — girişli oyuncu
   ═══════════════════════════════════════════════════════════ */

describe("girişli oyuncu: paket → karar → kesin kupon", () => {
  test("erken soru kararı yakmıyor; karar bir kez veriliyor ve zarla aynı", async () => {
    const p = await masadakiOyuncu();
    const b = await oyun.basla({ playerId: p, oyunId: "sekme" });
    assert.ok(b.ok, b.ok === false ? b.hata : "");
    if (!b.ok) return;

    const tur = sekmeOyna(b.tohum, odulVar);
    assert.ok(odulVar(tur.durum), "bot paketi çıkaramadı");

    // Paket daha yokken sorulan soru reddediliyor ve KARAR YAZILMIYOR.
    const erken = await oyun.odulSor({
      playerId: p,
      oturumId: b.oturumId,
      girdiler: tur.girdiler.slice(0, -1),
      an: KAFE_ACIK,
    });
    assert.equal(erken.izin, false);
    assert.equal(await sozuOku(b.oturumId), null, "doğrulanamayan soru turun şansını yaktı");

    const ilk = await oyun.odulSor({
      playerId: p,
      oturumId: b.oturumId,
      girdiler: tur.girdiler,
      an: KAFE_ACIK,
    });
    assert.equal(ilk.izin, kupon.paketZari(b.tohum) < motor.paketSansi(0), "karar zardan gelmiyor");
    assert.equal(await sozuOku(b.oturumId), ilk.izin, "karar yazılmadı");

    const ikinci = await oyun.odulSor({
      playerId: p,
      oturumId: b.oturumId,
      girdiler: tur.girdiler,
      an: KAFE_ACIK,
    });
    assert.equal(ikinci.izin, ilk.izin, "ikinci soru farklı cevap aldı");
  });

  test("🔴 söz + teslim → kupon KESİN", async () => {
    const p = await masadakiOyuncu();
    const b = await oyun.basla({ playerId: p, oyunId: "sekme" });
    assert.ok(b.ok);
    if (!b.ok) return;

    const gorundu = sekmeOyna(b.tohum, odulVar);
    assert.ok(odulVar(gorundu.durum), "bot paketi çıkaramadı");
    // Zar bu turda ne derse desin sözü "evet"e sabitle: kesinliği sınıyoruz.
    await yoneticiSorgu(`UPDATE play_sessions SET odul_sozu = true WHERE id = $1`, [b.oturumId]);

    const alindi = sekmeOyna(b.tohum, odulTeslim, gorundu);
    assert.ok(odulTeslim(alindi.durum), "bot paketi alamadı");

    const cevap = await oyun.bitir({
      playerId: p,
      oturumId: b.oturumId,
      girdiler: alindi.girdiler,
      iddiaEdilenSkor: sekme.skor(alindi.durum),
      an: KAFE_ACIK,
    });
    assert.ok(cevap.ok, cevap.ok === false ? cevap.hata : "");
    if (!cevap.ok) return;
    assert.ok(cevap.kupon, "söz verilen ve alınan paket kupona dönmedi");
    assert.equal(cevap.odulYok, null);
  });

  test("söz yoksa paket alınsa da kupon yok — zar tur sonunda atılmıyor", async () => {
    const p = await masadakiOyuncu();
    const b = await oyun.basla({ playerId: p, oyunId: "sekme" });
    assert.ok(b.ok);
    if (!b.ok) return;

    const alindi = sekmeOyna(b.tohum, odulTeslim);
    assert.ok(odulTeslim(alindi.durum), "bot paketi alamadı");

    const cevap = await oyun.bitir({
      playerId: p,
      oturumId: b.oturumId,
      girdiler: alindi.girdiler,
      iddiaEdilenSkor: sekme.skor(alindi.durum),
      an: KAFE_ACIK,
    });
    assert.ok(cevap.ok);
    if (!cevap.ok) return;
    assert.equal(cevap.kupon, null, "görünmeyen paket için kupon verildi");
  });

  test("söz var ama paket alınmadı → kupon yok", async () => {
    const p = await masadakiOyuncu();
    const b = await oyun.basla({ playerId: p, oyunId: "sekme" });
    assert.ok(b.ok);
    if (!b.ok) return;

    const gorundu = sekmeOyna(b.tohum, odulVar);
    await yoneticiSorgu(`UPDATE play_sessions SET odul_sozu = true WHERE id = $1`, [b.oturumId]);

    const cevap = await oyun.bitir({
      playerId: p,
      oturumId: b.oturumId,
      girdiler: gorundu.girdiler,
      iddiaEdilenSkor: sekme.skor(gorundu.durum),
      an: KAFE_ACIK,
    });
    assert.ok(cevap.ok);
    if (!cevap.ok) return;
    assert.equal(cevap.kupon, null, "alınmayan paket için kupon verildi");
  });
});

/* ═══════════════════════════════════════════════════════════
   4 · Misafir — karar imzalı çerezde
   ═══════════════════════════════════════════════════════════ */

describe("misafir: paket kararı çerezde, zar yenilenemiyor", () => {
  test("karar çereze yazılıyor; eski çerezle yeniden sormak aynı cevabı veriyor", async () => {
    const bas = await misafir.basla({ oyunId: "sekme", cafeId: kafe, tableId: masa });
    assert.ok(bas.ok);
    if (!bas.ok) return;
    const konum = await misafir.konumDogrula({ cafeId: kafe, lat: 41.0, lng: 29.0 });
    assert.equal(konum.durum, "dogrulandi");
    const konumCerezi = konum.durum === "dogrulandi" ? konum.cerez : undefined;

    const tur = sekmeOyna(bas.tohum, odulVar);
    assert.ok(odulVar(tur.durum));

    const ilk = await misafir.odulSor({
      acikOyunCerezi: bas.cerez,
      konumCerezi,
      girdiler: tur.girdiler,
      an: KAFE_ACIK,
    });
    assert.equal(ilk.izin, kupon.paketZari(bas.tohum) < motor.paketSansi(0));
    assert.ok(ilk.cerez, "karar çereze yazılmadı");

    // Yeni çerezle: karar okunuyor, yeni çerez yok.
    const yeni = await misafir.odulSor({
      acikOyunCerezi: ilk.cerez ?? undefined,
      konumCerezi,
      girdiler: tur.girdiler,
      an: KAFE_ACIK,
    });
    assert.equal(yeni.izin, ilk.izin);
    assert.equal(yeni.cerez, null);

    // ESKİ çerezle (kararsız): zar tohumdan, aynı cevap — yenilenemiyor.
    const eski = await misafir.odulSor({
      acikOyunCerezi: bas.cerez,
      konumCerezi,
      girdiler: tur.girdiler,
      an: KAFE_ACIK,
    });
    assert.equal(eski.izin, ilk.izin, "eski çereze dönmek zarı yeniledi");
  });

  test("konum doğrulanmadıysa soru karar yazmıyor", async () => {
    const bas = await misafir.basla({ oyunId: "sekme", cafeId: kafe, tableId: masa });
    assert.ok(bas.ok);
    if (!bas.ok) return;
    const tur = sekmeOyna(bas.tohum, odulVar);

    const s = await misafir.odulSor({
      acikOyunCerezi: bas.cerez,
      konumCerezi: undefined,
      girdiler: tur.girdiler,
      an: KAFE_ACIK,
    });
    assert.equal(s.izin, false);
    assert.equal(s.cerez, null, "K2'siz soru kararı yaktı");
  });
});
