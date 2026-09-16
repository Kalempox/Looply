import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import * as oyunSecimi from "@/domain/oyun-secimi";
import { GUNLUK, GUNLUK_GENIS, KURULUM, duraklar } from "@/app/kafe/panel/duraklar";
import { yoneticiSorgu } from "./_yardim";

/**
 * BUTİK PANELİ — işletme türüne göre farklılaşma.
 *
 * ── Kapatılan arıza ─────────────────────────────────────────
 *
 * Ü137 butik kipini açtı: butikte **oyun yok**, çark hakkını kasiyer
 * alışverişe bakarak veriyor. Ama panelin gezinmesi sabit bir listeydi ve
 * `isletme_turu`ya hiç bakmıyordu — oyunu olmayan işletme menüsünde
 * "Oyunlar" durağı görüyor, açıyor, ve yönetecek bir şey bulamıyordu.
 *
 * Bu, bu depoda dört kez çıkan *"yazıldı ama yarısına bağlandı"*
 * sınıfının aynısı: butik kipi yazıldı, panel ona bağlanmadı.
 *
 * ── Sınanan iddialar ────────────────────────────────────────
 *
 *   1. Butiğin menüsünde oyun durağı yok, kafeninkinde var
 *   2. 🔴 Menü bir denetim değil: butik için oyun ayarı **sunucuda**
 *      reddediliyor
 *   3. Kafede aynı çağrı çalışmaya devam ediyor (gate fazla kapatmıyor)
 *   4. 🔴 Kenar çubuğundaki her durak telefondan da açılabiliyor
 *   5. Her durağın bir ikonu var
 */

let butik = "";
let kafe = "";
let butikYonetici = "";
let kafeYonetici = "";

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const k = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const by = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [b!.id],
    );
    const ky = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [k!.id],
    );
    return { b: b?.id, k: k?.id, by: by?.id, ky: ky?.id };
  });
  assert.ok(v.b && v.k && v.by && v.ky, "Tohum verisi yok — önce: npm run db:seed");
  butik = v.b;
  kafe = v.k;
  butikYonetici = v.by;
  kafeYonetici = v.ky;

  // Bu testin süresince Kafe B butik gibi davranıyor. Sonda geri alınıyor.
  await yoneticiSorgu(`UPDATE cafes SET isletme_turu = 'butik' WHERE id = $1`, [butik]);
});

after(async () => {
  await yoneticiSorgu(`UPDATE cafes SET isletme_turu = 'kafe' WHERE id = $1`, [butik]);
  await closePools();
});

describe("butik paneli — menü", () => {
  test("butiğin kurulum menüsünde oyun durağı yok", () => {
    const yollar = duraklar(KURULUM, "butik").map((d) => d.yol);
    assert.ok(
      !yollar.includes("/kafe/panel/oyunlar"),
      "butikte oyun yok — menüde yönetilecek bir oyun durağı da olmamalı",
    );
  });

  test("kafenin kurulum menüsünde oyun durağı duruyor", () => {
    const yollar = duraklar(KURULUM, "kafe").map((d) => d.yol);
    assert.ok(yollar.includes("/kafe/panel/oyunlar"), "kafede oyun yönetimi kaldırılmamalı");
  });

  test("süzgeç yalnızca işaretli durağı eliyor", () => {
    const kafede = duraklar(KURULUM, "kafe").length;
    const butikte = duraklar(KURULUM, "butik").length;
    assert.equal(
      kafede - butikte,
      1,
      "bugün türe bağlı tek durak var; ikincisi eklenirse bu testin sayısı da gerekçesiyle güncellenmeli",
    );
  });
});

describe("butik paneli — asıl kapı sunucuda", () => {
  /**
   * 🔴 Menüden gizlemek bir denetim değil.
   *
   * Adres çubuğuna `/kafe/panel/oyunlar` yazan bir butik yöneticisi formu
   * görebilirdi. Ayarın kaydedilmesi **yanıltıcı** olurdu: satır yazılır,
   * hiçbir şeyi etkilemez, işletme oyun açtığını sanır.
   */
  test("butik için oyun ayarı reddediliyor", async () => {
    const sonuc = await oyunSecimi.degistir({
      cafeId: butik,
      oyunId: "yilan",
      acik: false,
      aktorId: butikYonetici,
    });

    assert.equal(sonuc.ok, false, "butikte oyun ayarı kaydedilmemeli");
    if (!sonuc.ok) assert.match(sonuc.hata, /[Bb]utik/, "hata neden reddedildiğini söylemeli");
  });

  test("reddedilen çağrı veritabanına satır yazmıyor", async () => {
    await oyunSecimi.degistir({
      cafeId: butik,
      oyunId: "kelime",
      acik: false,
      aktorId: butikYonetici,
    });

    const n = await withBypass("test doğrulaması", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*) AS n FROM cafe_game_settings WHERE cafe_id = $1 AND game_id = 'kelime'`,
        [butik],
      ),
    );
    assert.equal(Number(n?.n ?? 0), 0, "reddedilen ayar yine de yazılmış");
  });

  /** Kapı fazla kapatmasın: kafede oyun yönetimi aynen çalışmalı. */
  test("kafede oyun ayarı çalışmaya devam ediyor", async () => {
    const kapat = await oyunSecimi.degistir({
      cafeId: kafe,
      oyunId: "yilan",
      acik: false,
      aktorId: kafeYonetici,
    });
    assert.equal(kapat.ok, true, "kafenin oyun yönetimi bozulmuş");

    // Bıraktığımız gibi bulunsun — başka testler bu kafede oynuyor.
    const ac = await oyunSecimi.degistir({
      cafeId: kafe,
      oyunId: "yilan",
      acik: true,
      aktorId: kafeYonetici,
    });
    assert.equal(ac.ok, true, "geri açma başarısız — test verisi bozuk kaldı");
  });
});

/**
 * 🔴 KENAR ÇUBUĞU TELEFONDA YOK.
 *
 * Kenar çubuğu `lg:flex` — 1024 pikselin altında hiç çizilmiyor. Telefonda
 * yalnızca dört ikonluk alt şerit var, kalan duraklara ana ekrandaki
 * "Kurulum ve yönetim" kartlarından gidiliyor.
 *
 * Bu test o bağlantıyı sınıyor çünkü **bir kez koptu**: `Oyunlar` ve
 * `Şubeler` kenar çubuğuna eklendi, kartlara eklenmedi ve telefondan
 * hiçbir yoldan açılamaz hâle geldiler. Ü125'in şube açma yolu tam bu
 * yüzden kurulmuştu ve telefondan kimse ona ulaşamıyordu.
 */
describe("her durak telefondan da açılabiliyor", () => {
  const PANEL_KOK = path.join(process.cwd(), "src", "app", "kafe", "panel");

  /** Gezinmenin kendisi sayılmıyor — aranan şey gezinme DIŞINDAKİ yol. */
  const HARIC = new Set(["gezinme.tsx", "duraklar.ts"]);

  function panelKaynaklari(dizin: string): string[] {
    const cikti: string[] = [];
    for (const girdi of readdirSync(dizin, { withFileTypes: true })) {
      const tam = path.join(dizin, girdi.name);
      if (girdi.isDirectory()) cikti.push(...panelKaynaklari(tam));
      else if (/\.tsx?$/.test(girdi.name) && !HARIC.has(girdi.name)) cikti.push(tam);
    }
    return cikti;
  }

  test("alt şeritte olmayan her durağın bir bağlantısı var", () => {
    const altSerit = new Set(GUNLUK.map((d) => d.yol));
    const aranacak = [...GUNLUK_GENIS, ...KURULUM].filter((d) => !altSerit.has(d.yol));

    const kaynaklar = panelKaynaklari(PANEL_KOK).map((d) => readFileSync(d, "utf8"));
    const ulasilmaz: string[] = [];

    for (const durak of aranacak) {
      // `href="..."` ya da `yol="..."` — `revalidatePath("...")` sayılmasın:
      // o bir tazeleme çağrısı, tıklanacak bir bağlantı değil.
      const kalip = new RegExp(`(href|yol)=\\{?["']${durak.yol}["']`);
      if (!kaynaklar.some((k) => kalip.test(k))) ulasilmaz.push(`${durak.ad} (${durak.yol})`);
    }

    assert.deepEqual(
      ulasilmaz,
      [],
      `Telefondan açılamayan durak: ${ulasilmaz.join(", ")}. ` +
        `Kenar çubuğu 1024 pikselin altında hiç çizilmiyor — bu durağa ` +
        `ana ekrandaki kurulum kartlarından da bir yol açılmalı.`,
    );
  });

  test("her durağın bir ikonu var", () => {
    const gezinme = readFileSync(path.join(PANEL_KOK, "gezinme.tsx"), "utf8");
    const ikonsuz = [...GUNLUK, ...GUNLUK_GENIS, ...KURULUM]
      .filter((d) => !new RegExp(`["']${d.yol}["']\\s*:`).test(gezinme))
      .map((d) => d.yol);

    assert.deepEqual(
      [...new Set(ikonsuz)],
      [],
      `İkonu olmayan durak: ${ikonsuz.join(", ")} — gezinme.tsx içindeki IKONLAR haritasına ekle.`,
    );
  });
});
