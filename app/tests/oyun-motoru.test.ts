import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as masa from "@/domain/masa";
import * as oyunDomain from "@/domain/oyun";
import * as seri from "@/domain/seri";
import {
  GUNLUK_TAVAN,
  KATILIM_PUANI,
  OYUN_PUANI,
  SKOR_ESIKLERI,
  esikBul,
} from "@/domain/puan";
import { blok } from "@/oyunlar/blok";
import { kelime, kurulabilir, kucult } from "@/oyunlar/kelime";
import { dusen } from "@/oyunlar/dusen";
import { tekrarOyna, EN_FAZLA_GIRDI } from "@/oyunlar/sozlesme";
import { OYUNLAR, type HerhangiOyun } from "@/oyunlar";
import kelimeVerisi from "@/oyunlar/veri/kelimeler.json";
import { isGunu } from "@/lib/tarih";
import { yoneticiSorgu } from "./_yardim";

/**
 * FAZ 5 GÜVENLİK KAPISI — oyun motoru ve sunucu skor doğrulaması.
 *
 * Altı iddia sınanıyor:
 *   1. Aynı (tohum, girdi) her zaman aynı skoru verir — S5'in temeli
 *   2. Değiştirilmiş istemciyle yüksek skor gönderimi reddedilir
 *   3. Aynı oturum iki kez bitirilemez
 *   4. Günlük puan tavanı aşılamaz (E4)
 *   5. Kafe dışında ne puan ne XP yazılır (Ü3, Ü14)
 *   6. Girdi kaydı sınırsız uzayamaz
 */

const KAFE_LAT = 41.0369;
const KAFE_LNG = 28.9838;

let kafeA = "";
let masaA = "";
let oyuncuId = "";
let disaridakiId = "";

const TABAN = 3_000_000 + randomInt(5_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0558${String(TABAN + sayac++).slice(-7)}`);

/* ── Oyun oynayan yardımcılar ──────────────────────────── */

/** Blok'u kaba kuvvetle sonuna kadar oynar. */
function blokOyna(tohum: string, bolum: number) {
  let d = blok.baslat(tohum, bolum);
  const girdiler: unknown[] = [];

  for (let adim = 0; adim < 500 && !blok.bittiMi(d); adim++) {
    let kondu = false;
    for (let t = 0; t < 3 && !kondu; t++) {
      for (let s = 0; s < 8 && !kondu; s++) {
        for (let k = 0; k < 8 && !kondu; k++) {
          const y = blok.uygula(d, { t, s, k });
          if (y) {
            d = y;
            girdiler.push({ t, s, k });
            kondu = true;
          }
        }
      }
    }
    if (!kondu) break;
  }
  return { durum: d, girdiler, skor: blok.skor(d), basarili: blok.basarili(d) };
}

/** Kelime'yi listeden geçerli kelimeler göndererek oynar. */
function kelimeOyna(tohum: string, bolum: number) {
  let d = kelime.baslat(tohum, bolum);
  const girdiler: unknown[] = [];

  for (const w of kelimeVerisi.kelimeler) {
    if (kelime.bittiMi(d)) break;
    if (w.length < 3 || w.length > d.harfler.length) continue;
    if (!kurulabilir(kucult(w), d.harfler)) continue;
    const y = kelime.uygula(d, { k: w });
    if (y) {
      d = y;
      girdiler.push({ k: w });
    }
  }
  return { durum: d, girdiler, skor: kelime.skor(d), basarili: kelime.basarili(d) };
}

/** Düşen'i sürekli bırakarak oynar — tahta dolana veya hedefe varana kadar. */
function dusenOyna(tohum: string, bolum: number) {
  let d = dusen.baslat(tohum, bolum);
  const girdiler: unknown[] = [];
  let tick = 1;

  for (let adim = 0; adim < 300 && !dusen.bittiMi(d); adim++) {
    const hedefK = (adim * 3) % 8;
    for (let i = 0; i < 9 && d.k !== hedefK; i++) {
      const a = d.k < hedefK ? "sag" : "sol";
      const y = dusen.uygula(d, { tick, a });
      if (!y) break;
      d = y;
      girdiler.push({ tick, a });
      tick++;
      if (dusen.bittiMi(d)) break;
    }
    if (dusen.bittiMi(d)) break;

    const y = dusen.uygula(d, { tick, a: "birak" });
    if (!y) break;
    d = y;
    girdiler.push({ tick, a: "birak" });
    tick += 2;
  }

  girdiler.push({ tick, a: "bekle" });
  const son = dusen.uygula(d, { tick, a: "bekle" });
  if (son) d = son;

  return { durum: d, girdiler, skor: dusen.skor(d), basarili: dusen.basarili(d) };
}

/** Doğrulanmış (K2) masa oturumu açar. */
async function dogrulanmisOturum(playerId: string) {
  await masa.ac({ cafeId: kafeA, tableId: masaA, playerId });
  const s = await masa.konumDogrula(playerId, KAFE_LAT, KAFE_LNG);
  assert.equal(s.durum, "dogrulandi", "test kurulumu: konum doğrulanamadı");
}

/** Bir bölümü baştan sona oynar ve sunucuya gönderir. */
async function tamOyun(playerId: string, oyunId: string, bolum = 1, iddiaEdilenSkor?: number) {
  const baslangic = await oyunDomain.basla({ playerId, oyunId, bolum });
  assert.ok(baslangic.ok, "oturum açılamadı");

  const oyna = oyunId === "blok" ? blokOyna : oyunId === "kelime" ? kelimeOyna : dusenOyna;
  const sonuc = oyna(baslangic.tohum, bolum);

  const cevap = await oyunDomain.bitir({
    playerId,
    oturumId: baslangic.oturumId,
    girdiler: sonuc.girdiler,
    iddiaEdilenSkor: iddiaEdilenSkor ?? sonuc.skor,
  });

  return { baslangic, sonuc, cevap };
}

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const c = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const t = await db.one<{ id: string }>(
      "SELECT id FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1",
      [c!.id],
    );
    return { c: c?.id, t: t?.id };
  });
  assert.ok(v.c && v.t, "Tohum verisi yok — önce: npm run db:seed");
  kafeA = v.c;
  masaA = v.t;

  await yoneticiSorgu(`UPDATE cafes SET lat = $2, lng = $3 WHERE id = $1`, [
    kafeA,
    KAFE_LAT,
    KAFE_LNG,
  ]);
  await yoneticiSorgu(
    `UPDATE platform_config SET value = 'false'::jsonb
      WHERE key IN ('oyun_durduruldu','kupon_dagitimi_durduruldu')`,
  );

  oyuncuId = (
    await kaydet({
      telefon: yeniTelefon(),
      ad: "Oyun",
      soyad: "Testi",
      dogumYili: 1990,
      pazarlamaIzni: false,
    })
  ).oyuncu.id;

  disaridakiId = (
    await kaydet({
      telefon: yeniTelefon(),
      ad: "Disarida",
      soyad: "Oyuncu",
      dogumYili: 1990,
      pazarlamaIzni: false,
    })
  ).oyuncu.id;

  await dogrulanmisOturum(oyuncuId);
});

after(async () => {
  for (const id of [oyuncuId, disaridakiId]) {
    // Faz 7'den beri oyun bitişi anlık ödül kuponu üretebiliyor; kupon
    // oyuncuya bağlı olduğu için önce o temizlenmeli.
    await yoneticiSorgu(
      `DELETE FROM coupon_events WHERE coupon_id IN
         (SELECT id FROM coupons WHERE player_id = $1)`,
      [id],
    );
    await yoneticiSorgu(`DELETE FROM coupons WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM play_sessions WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM points_ledger WHERE player_id = $1`, [id]);
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
   1 · Determinizm — S5'in temeli
   ═══════════════════════════════════════════════════════════ */

describe("determinizm (S5)", () => {
  test("aynı tohum aynı başlangıcı verir — üç oyunda da", () => {
    for (const oyun of OYUNLAR) {
      const a = JSON.stringify(oyun.baslat("ayni-tohum", 1));
      const b = JSON.stringify(oyun.baslat("ayni-tohum", 1));
      assert.equal(a, b, `${oyun.id}: aynı tohum farklı başlangıç verdi`);
    }
  });

  test("farklı tohum farklı başlangıç verir", () => {
    for (const oyun of OYUNLAR) {
      const a = JSON.stringify(oyun.baslat("tohum-bir", 1));
      const b = JSON.stringify(oyun.baslat("tohum-iki", 1));
      assert.notEqual(a, b, `${oyun.id}: farklı tohum aynı başlangıcı verdi`);
    }
  });

  test("sunucu replay'i canlı oyunla birebir aynı skoru bulur", () => {
    const senaryolar: {
      oyun: HerhangiOyun;
      id: string;
      oyna: (tohum: string, bolum: number) => { girdiler: unknown[]; skor: number; basarili: boolean };
    }[] = [
      { oyun: blok, id: "blok", oyna: blokOyna },
      { oyun: kelime, id: "kelime", oyna: kelimeOyna },
      { oyun: dusen, id: "dusen", oyna: dusenOyna },
    ];

    for (const { oyun, id, oyna } of senaryolar) {
      for (const tohum of ["t-a", "t-b", "t-c"]) {
        const canli = oyna(tohum, 1);
        const sunucu = tekrarOyna(oyun, tohum, 1, canli.girdiler);

        assert.ok(sunucu.gecerli, `${id}/${tohum}: replay geçersiz — ${JSON.stringify(sunucu)}`);
        assert.equal(sunucu.skor, canli.skor, `${id}/${tohum}: skorlar ayrıştı`);
        assert.equal(sunucu.basarili, canli.basarili, `${id}/${tohum}: başarı durumu ayrıştı`);
      }
    }
  });

  test("her oyunun beş bölümü var ve hepsi oynanabiliyor (Ü21)", () => {
    for (const oyun of OYUNLAR) {
      assert.equal(oyun.bolumSayisi, 5, `${oyun.id}: bölüm sayısı beş değil`);
      for (let b = 1; b <= 5; b++) {
        assert.doesNotThrow(() => oyun.baslat("bolum-testi", b), `${oyun.id} bölüm ${b}`);
      }
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Girdi kaydı denetimi
   ═══════════════════════════════════════════════════════════ */

describe("girdi kaydı denetimi", () => {
  test("kuraldışı hamle reddedilir", () => {
    // Aynı teklifi iki kez kullanmak: ikincisi kuraldışı.
    const d = blok.baslat("kural", 1);
    let ilk: unknown = null;
    for (let s = 0; s < 8 && !ilk; s++) {
      for (let k = 0; k < 8 && !ilk; k++) {
        if (blok.uygula(d, { t: 0, s, k })) ilk = { t: 0, s, k };
      }
    }
    const sonuc = tekrarOyna(blok, "kural", 1, [ilk, ilk]);
    assert.equal(sonuc.gecerli, false);
  });

  test("bozuk girdi biçimi reddedilir", () => {
    for (const bozuk of [
      [{ t: "0", s: 0, k: 0 }],
      [{ t: 0.5, s: 0, k: 0 }],
      [{ t: 0, s: 99, k: 0 }],
      [null],
      ["hamle"],
      [{}],
    ]) {
      const sonuc = tekrarOyna(blok, "bozuk", 1, bozuk);
      assert.equal(sonuc.gecerli, false, `kabul edildi: ${JSON.stringify(bozuk)}`);
    }
  });

  test("girdi kaydı dizi değilse reddedilir", () => {
    for (const bozuk of [null, "abc", 42, { hamleler: [] }]) {
      assert.equal(tekrarOyna(blok, "t", 1, bozuk).gecerli, false);
    }
  });

  test("girdi kaydı sınırsız uzayamaz", () => {
    const cokUzun = new Array(EN_FAZLA_GIRDI + 1).fill({ t: 0, s: 0, k: 0 });
    const sonuc = tekrarOyna(blok, "t", 1, cokUzun);
    assert.equal(sonuc.gecerli, false);
    assert.match(sonuc.gecerli === false ? sonuc.sebep : "", /çok uzun/);
  });

  test("geçersiz bölüm reddedilir", () => {
    for (const bolum of [0, 6, -1, 1.5]) {
      assert.equal(tekrarOyna(blok, "t", bolum, []).gecerli, false, `bölüm ${bolum} kabul edildi`);
    }
  });

  test("bitmiş bölümden sonraki girdiler yok sayılır, skoru değiştirmez", () => {
    const canli = blokOyna("bitmis", 1);

    // Zaman tabanlı oyunlarda istemci sona bir zaman işareti koymak zorunda
    // ve o işaret çoğu zaman bölümü bitiren şey oluyor. Bu yüzden artık
    // girdiler reddedilmiyor — ama skora da dokunmuyorlar.
    const fazla = [...canli.girdiler, { t: 0, s: 0, k: 0 }, { t: 1, s: 1, k: 1 }];
    const sonuc = tekrarOyna(blok, "bitmis", 1, fazla);

    assert.ok(sonuc.gecerli, "artık girdi yüzünden kayıt reddedildi");
    assert.equal(sonuc.skor, canli.skor, "artık girdi skoru değiştirdi");
    assert.equal(sonuc.kullanilmayan, 2, "kullanılmayan girdi sayılmadı");
  });

  test("kayıt erken kesilirse skor düşer — uzatmak kazandırmıyor", () => {
    const canli = blokOyna("kesik", 1);
    const kesik = canli.girdiler.slice(0, Math.max(1, canli.girdiler.length - 3));
    const sonuc = tekrarOyna(blok, "kesik", 1, kesik);

    assert.ok(sonuc.gecerli);
    assert.ok(sonuc.skor <= canli.skor, "eksik kayıt daha yüksek skor verdi");
  });

  test("kelime: elde olmayan harflerle kelime kabul edilmez", () => {
    const d = kelime.baslat("harf", 1);
    // Listede olan ama bu harflerle kurulamayan bir kelime bul.
    const disarida = kelimeVerisi.kelimeler.find(
      (w) => w.length <= d.harfler.length && !kurulabilir(w, d.harfler),
    );
    assert.ok(disarida, "test kurulumu: uygun karşı örnek bulunamadı");
    assert.equal(kelime.uygula(d, { k: disarida }), null);
  });

  test("kelime: listede olmayan dizi kabul edilmez", () => {
    const d = kelime.baslat("harf", 1);
    assert.equal(kelime.uygula(d, { k: "zzzz" }), null);
  });

  test("düşen: zamanı geriye alan girdi reddedilir", () => {
    const d = dusen.baslat("zaman", 1);
    const ileri = dusen.uygula(d, { tick: 50, a: "sol" });
    assert.ok(ileri);
    assert.equal(dusen.uygula(ileri, { tick: 10, a: "sag" }), null);
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Sunucu doğrulaması — hile denemeleri
   ═══════════════════════════════════════════════════════════ */

describe("sunucu skoru yeniden hesaplar (S5)", () => {
  test("şişirilmiş skor iddiası ödülü değiştirmez", async () => {
    const { sonuc, cevap } = await tamOyun(oyuncuId, "blok", 1, 999_999);

    assert.ok(cevap.ok);
    assert.equal(cevap.skor, sonuc.skor, "sunucu istemcinin skorunu kabul etti");
    assert.notEqual(cevap.skor, 999_999);

    // Denetim için iddia da saklanmalı — fraud analizi buna bakacak (Faz 9).
    const satir = await withBypass("test: iddia edilen skor", (db) =>
      db.one<{ claimed_score: number; server_score: number }>(
        `SELECT claimed_score, server_score FROM play_sessions
          WHERE player_id = $1 AND game_id = 'blok'
          ORDER BY started_at DESC LIMIT 1`,
        [oyuncuId],
      ),
    );
    assert.equal(satir?.claimed_score, 999_999, "iddia edilen skor saklanmadı");
    assert.equal(satir?.server_score, sonuc.skor);
  });

  test("uydurma girdi kaydı reddedilir ve puan yazılmaz", async () => {
    const oncekiPuan = await gunlukPuan(oyuncuId);

    const baslangic = await oyunDomain.basla({ playerId: oyuncuId, oyunId: "blok", bolum: 1 });
    assert.ok(baslangic.ok);

    const cevap = await oyunDomain.bitir({
      playerId: oyuncuId,
      oturumId: baslangic.oturumId,
      girdiler: [{ t: 0, s: 99, k: 99 }],
      iddiaEdilenSkor: 5_000,
    });

    assert.equal(cevap.ok, false);
    assert.equal(cevap.ok === false ? cevap.reddedildi : undefined, true);
    assert.equal(await gunlukPuan(oyuncuId), oncekiPuan, "reddedilen oyun puan yazdı");

    const durum = await withBypass("test: reddedilen oturum", (db) =>
      db.one<{ status: string; reject_reason: string | null }>(
        `SELECT status, reject_reason FROM play_sessions WHERE id = $1`,
        [baslangic.oturumId],
      ),
    );
    assert.equal(durum?.status, "rejected");
    assert.ok(durum?.reject_reason, "ret gerekçesi yazılmadı");
  });

  test("aynı oturum iki kez bitirilemez", async () => {
    const baslangic = await oyunDomain.basla({ playerId: oyuncuId, oyunId: "kelime", bolum: 1 });
    assert.ok(baslangic.ok);
    const oynanan = kelimeOyna(baslangic.tohum, 1);

    const ilk = await oyunDomain.bitir({
      playerId: oyuncuId,
      oturumId: baslangic.oturumId,
      girdiler: oynanan.girdiler,
      iddiaEdilenSkor: oynanan.skor,
    });
    assert.ok(ilk.ok);

    const puanIlkten = await gunlukPuan(oyuncuId);

    const ikinci = await oyunDomain.bitir({
      playerId: oyuncuId,
      oturumId: baslangic.oturumId,
      girdiler: oynanan.girdiler,
      iddiaEdilenSkor: oynanan.skor,
    });
    assert.equal(ikinci.ok, false, "aynı oturum ikinci kez bitirildi");
    assert.equal(await gunlukPuan(oyuncuId), puanIlkten, "ikinci gönderim puan yazdı");
  });

  test("başkasının oturumu bitirilemez", async () => {
    const baslangic = await oyunDomain.basla({ playerId: oyuncuId, oyunId: "blok", bolum: 1 });
    assert.ok(baslangic.ok);

    const cevap = await oyunDomain.bitir({
      playerId: disaridakiId,
      oturumId: baslangic.oturumId,
      girdiler: [],
      iddiaEdilenSkor: 0,
    });
    assert.equal(cevap.ok, false, "başkasının oturumu kabul edildi");
  });
});

/* ═══════════════════════════════════════════════════════════
   4 · Ü3 — kafe dışında kazanım yok
   ═══════════════════════════════════════════════════════════ */

describe("kafe dışında kazanım yok (Ü3, Ü14)", () => {
  test("masa oturumu olmayan oyuncu oynayabilir ama kazanamaz", async () => {
    const baslangic = await oyunDomain.basla({
      playerId: disaridakiId,
      oyunId: "blok",
      bolum: 1,
    });
    assert.ok(baslangic.ok);
    assert.equal(baslangic.kazandirir, false, "kafe dışında kazandırır işaretlendi");

    const oynanan = blokOyna(baslangic.tohum, 1);
    const cevap = await oyunDomain.bitir({
      playerId: disaridakiId,
      oturumId: baslangic.oturumId,
      girdiler: oynanan.girdiler,
      iddiaEdilenSkor: oynanan.skor,
    });

    assert.ok(cevap.ok);
    assert.equal(cevap.kazandirir, false);
    assert.equal(cevap.puan, null, "kafe dışında puan yazıldı");
    assert.equal(cevap.xp, 0, "kafe dışında XP yazıldı");

    const sayilar = await withBypass("test: kafe dışı defter", (db) =>
      db.one<{ puan: string; xp: string }>(
        `SELECT (SELECT count(*) FROM points_ledger WHERE player_id = $1) AS puan,
                (SELECT count(*) FROM xp_ledger     WHERE player_id = $1) AS xp`,
        [disaridakiId],
      ),
    );
    assert.equal(Number(sayilar?.puan), 0, "kafe dışı oyuncunun puan satırı var");
    assert.equal(Number(sayilar?.xp), 0, "kafe dışı oyuncunun XP satırı var");
  });

  test("kafede oynayan puan ve XP kazanır", async () => {
    const oncekiPuan = await gunlukPuan(oyuncuId);
    const { cevap } = await tamOyun(oyuncuId, "kelime", 1);

    assert.ok(cevap.ok);
    assert.equal(cevap.kazandirir, true);
    assert.ok(cevap.basarili, "kelime bölümü tamamlanamadı — test kurulumu");
    assert.ok((cevap.puan?.yazilan ?? 0) > 0 || oncekiPuan >= GUNLUK_TAVAN);
    assert.ok(cevap.xp > 0);
  });
});

/* ═══════════════════════════════════════════════════════════
   5 · E4 — günlük puan tavanı
   ═══════════════════════════════════════════════════════════ */

describe("günlük puan tavanı (E4)", () => {
  test("tavan aşılamaz, kesilen miktar dürüstçe bildirilir", async () => {
    // Tavana ulaşana kadar oyna — her başarılı oyun 300 (bonuslu ise 600).
    let sonCevap: Awaited<ReturnType<typeof oyunDomain.bitir>> | null = null;

    for (let i = 0; i < 8; i++) {
      const { cevap } = await tamOyun(oyuncuId, "kelime", 1);
      if (cevap.ok) sonCevap = cevap;
      if ((await gunlukPuan(oyuncuId)) >= GUNLUK_TAVAN) break;
    }

    const toplam = await gunlukPuan(oyuncuId);
    assert.ok(toplam <= GUNLUK_TAVAN, `günlük toplam tavanı aştı: ${toplam}`);
    assert.equal(toplam, GUNLUK_TAVAN, `tavana ulaşılamadı: ${toplam}`);

    // Tavan dolduktan sonraki oyun puan yazmamalı ama XP yazmalı.
    const { cevap } = await tamOyun(oyuncuId, "kelime", 1);
    assert.ok(cevap.ok);
    assert.equal(cevap.puan?.yazilan, 0, "tavan dolu iken puan yazıldı");
    assert.ok((cevap.puan?.kesilen ?? 0) > 0, "kesilen miktar bildirilmedi");
    assert.ok(cevap.xp > 0, "tavan XP'yi de durdurdu — XP'nin tavanı yok");
    assert.ok(sonCevap);
  });
});

/* ── Yardımcı ──────────────────────────────────────────── */

async function gunlukPuan(playerId: string): Promise<number> {
  const r = await withBypass("test: günlük puan", (db) =>
    db.one<{ toplam: string }>(
      // `current_date` DEĞİL: o veritabanı sunucusunun (UTC) günü. Puanlar
      // İstanbul iş gününe yazılıyor ve ikisi gece 00:00–03:00 arasında
      // ayrışıyor — sayaç hep 0 görür, tavan testi hiç bitmez.
      `SELECT COALESCE(sum(delta), 0) AS toplam FROM points_ledger
        WHERE player_id = $1 AND cafe_id = $2 AND business_date = $3`,
      [playerId, kafeA, isGunu()],
    ),
  );
  return Number(r?.toplam ?? 0);
}

/* ══════════════════════════════════════════════════════════════
 * PUAN EKONOMİSİ — Ü48
 *
 * İki değişiklik sınanıyor: bölüm bitmese de puan yazılıyor (katılım) ve
 * yüksek skor ayrıca ödüllendiriliyor (eşik). İkisi de para değil ama ikisi
 * de ödüle giden yolu kısaltıyor; sessizce bozulmamalı.
 * ═════════════════════════════════════════════════════════════ */
describe("puan · katılım ve skor eşiği (Ü48)", () => {
  test("eşiğin altındaki skor bonus üretmiyor", () => {
    assert.equal(esikBul(0), null);
    assert.equal(esikBul(1_499), null);
  });

  test("eşiğe ulaşan skor kendi kademesini alıyor", () => {
    assert.equal(esikBul(1_500)?.bonus, 150);
    assert.equal(esikBul(2_499)?.bonus, 150);
  });

  /**
   * Kademeler toplanmıyor: 2500 yapan 150+300 değil, 300 alıyor.
   * Toplansaydı tek bir iyi oyun günlük tavanı tek başına doldururdu.
   */
  test("üst kademe alt kademeyle toplanmıyor", () => {
    assert.equal(esikBul(2_500)?.bonus, 300);
    assert.equal(esikBul(999_999)?.bonus, 300, "en üst kademe tavan olmalı");
  });

  test("katılım puanı oyun puanından belirgin biçimde küçük", () => {
    // Yarıda bırakıp yeniden başlamak, oynayarak puan toplamaktan
    // kârlı olmamalı — aradaki farkın korunması bunun güvencesi.
    assert.ok(KATILIM_PUANI * 4 < OYUN_PUANI, "katılım puanı çiftlik yapmaya değer hâle geldi");
  });

  test("eşikler artan sırada — sıra bozulursa esikBul yanlış kademe döner", () => {
    for (let i = 1; i < SKOR_ESIKLERI.length; i++) {
      assert.ok(
        SKOR_ESIKLERI[i].skor > SKOR_ESIKLERI[i - 1].skor,
        "eşik listesi artan sırada değil",
      );
      assert.ok(
        SKOR_ESIKLERI[i].bonus > SKOR_ESIKLERI[i - 1].bonus,
        "yüksek eşik daha az kazandırıyor",
      );
    }
  });
});

/* ══════════════════════════════════════════════════════════════
 * GÜNLÜK SERİ — Ü54
 *
 * Seri ayrı tablo tutmuyor, `play_sessions`'tan hesaplanıyor. Sınanan üç
 * iddia: arka arkaya günler doğru sayılıyor, bir gün atlanınca sıfırlanıyor
 * ve bonus günde bir kez yazılıyor.
 * ═════════════════════════════════════════════════════════════ */
describe("günlük seri (Ü54)", () => {
  test("bonus ilk günde yok, sonra artıyor ve tavanda duruyor", () => {
    assert.equal(seri.bonusPuani(0), 0);
    assert.equal(seri.bonusPuani(1), 0, "tek ziyaret henüz seri değil");
    assert.equal(seri.bonusPuani(2), 25);
    assert.equal(seri.bonusPuani(5), 100);
    assert.equal(seri.bonusPuani(9), 200);
    assert.equal(seri.bonusPuani(60), 200, "tavan aşılmamalı");
  });

  /**
   * Tavan, günlük puan tavanının (E4) dörtte birini geçmemeli: geçseydi
   * "oyna" yerine "sadece uğra" davranışını ödüllendirirdi.
   */
  test("seri bonusu günlük puan tavanının dörtte birini aşmıyor", () => {
    assert.ok(seri.bonusPuani(99) <= GUNLUK_TAVAN / 4);
  });

  test("arka arkaya günler sayılıyor, atlanan gün seriyi sıfırlıyor", async () => {
    const oyuncu = (
      await kaydet({
        telefon: yeniTelefon(),
        ad: "Seri",
        soyad: "Testi",
        dogumYili: 1990,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;

    const bugun = isGunu();
    const gunEkleIso = (g: number) => {
      const d = new Date(`${bugun}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + g);
      return d.toISOString().slice(0, 10);
    };

    // Bugün, dün, evvelsi gün → 3 günlük seri. Dört gün önce boş.
    for (const g of [0, -1, -2, -4]) {
      await yoneticiSorgu(
        `INSERT INTO play_sessions
           (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
            started_at, ended_at, server_score, proof_mask, proof_level,
            business_date, status, is_qualified)
         VALUES ($1,$2,NULL,$3,decode(md5($3),'hex'),'blok',$4,
                 now(), now(), 100, 3, 2, $5::date, 'completed', false)`,
        [`oyn_seri_${oyuncu}_${g}`, kafeA, oyuncu, `thm_seri_${g}`, gunEkleIso(g)],
      );
    }

    const d = await withBypass("test seri", (db) =>
      seri.hesapla(db, { playerId: oyuncu, cafeId: kafeA, bugun }),
    );
    assert.equal(d.gun, 3, "atlanan günün ötesi seriye katılmamalı");
    assert.equal(d.bugunOynadi, true);
    assert.equal(d.riskte, false);
  });

  /**
   * Bugün oynanmadıysa seri KIRILMIŞ sayılmıyor — gün henüz bitmedi.
   * Kırıldığını söylemek, akşam gelecek müşteriyi sabahtan kaybetmek olurdu.
   */
  test("bugün oynanmadıysa seri düne kadar sayılıyor ve riskte işaretleniyor", async () => {
    const oyuncu = (
      await kaydet({
        telefon: yeniTelefon(),
        ad: "Riskte",
        soyad: "Testi",
        dogumYili: 1990,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;

    const bugun = isGunu();
    const gunEkleIso = (g: number) => {
      const d = new Date(`${bugun}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + g);
      return d.toISOString().slice(0, 10);
    };

    for (const g of [-1, -2]) {
      await yoneticiSorgu(
        `INSERT INTO play_sessions
           (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
            started_at, ended_at, server_score, proof_mask, proof_level,
            business_date, status, is_qualified)
         VALUES ($1,$2,NULL,$3,decode(md5($3),'hex'),'blok',$4,
                 now(), now(), 100, 3, 2, $5::date, 'completed', false)`,
        [`oyn_risk_${oyuncu}_${g}`, kafeA, oyuncu, `thm_risk_${g}`, gunEkleIso(g)],
      );
    }

    const d = await withBypass("test seri riskte", (db) =>
      seri.hesapla(db, { playerId: oyuncu, cafeId: kafeA, bugun }),
    );
    assert.equal(d.gun, 2);
    assert.equal(d.bugunOynadi, false);
    assert.equal(d.riskte, true, "seri sıfırlanmış gibi gösterildi");
  });
});
