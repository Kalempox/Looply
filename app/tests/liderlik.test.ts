import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as liderlik from "@/domain/liderlik";
import { adGorunurluguAyarla } from "@/domain/taht";
import { newId } from "@/lib/ids";
import { isGunu, pazartesi, gunEkle } from "@/lib/tarih";

/**
 * LİDERLİK TABLOSU.
 *
 * Bu ekran, oyuncunun adını **başka oyunculara** gösteren tek yer. Sınanan
 * üç iddia:
 *
 *   1. **Soyad tam olarak görünmüyor.** Ad + baş harf, gerisi yıldız.
 *   2. **Adını kapatan oyuncu kapalı kalıyor** — kapatınca anonim koduyla
 *      görünüyor, listeden düşmüyor.
 *   3. **Kafe sınırı tutuyor.** Başka kafenin skoru bu listeye girmiyor.
 */

let cafeId = "";
let cafeId2 = "";
const oyuncular: { id: string; ad: string; soyad: string }[] = [];

const TABAN = 7_000_000 + randomInt(2_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0534${String(TABAN + sayac++).slice(-7)}`);

const OYUN = "blok";

async function kafeKur(ad: string): Promise<string> {
  const id = newId("cafe");
  await withBypass("test kafe", (db) =>
    db.query(
      `INSERT INTO cafes (id, name, slug, status, lat, lng)
       VALUES ($1,$2,$3,'approved',41.0,29.0)`,
      [id, ad, `${ad.toLowerCase()}-${id.slice(-6)}`],
    ),
  );
  return id;
}

/** Doğrudan `play_sessions` yazıyor: sınanan şey oyun akışı değil, liste. */
async function skorYaz(opts: {
  playerId: string;
  cafeId: string;
  skor: number;
  k2?: boolean;
}): Promise<void> {
  await withBypass("test skor", (db) =>
    db.query(
      `INSERT INTO play_sessions
         (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
          started_at, ended_at, server_score, proof_mask, proof_level,
          business_date, status, is_qualified)
       VALUES ($1,$2,NULL,$3,decode(md5($3),'hex'),$4,$5,
               now(), now(), $6, $7, 2, $8::date, 'completed', false)`,
      [
        newId("oyn"),
        opts.cafeId,
        opts.playerId,
        OYUN,
        newId("thm"),
        opts.skor,
        opts.k2 === false ? 1 : 3,
        isGunu(),
      ],
    ),
  );
}

before(async () => {
  cafeId = await kafeKur("LiderTest");
  cafeId2 = await kafeKur("LiderTestB");

  for (const [ad, soyad] of [
    ["Mert", "Yılmaz"],
    ["Elif", "Demir"],
    ["Ahmet", "Çelik"],
  ] as const) {
    const r = await kaydet({ telefon: yeniTelefon(), ad, soyad, dogumYili: 1990, pazarlamaIzni: false });
    oyuncular.push({ id: r.oyuncu.id, ad, soyad });
  }

  await skorYaz({ playerId: oyuncular[0].id, cafeId, skor: 900 });
  await skorYaz({ playerId: oyuncular[1].id, cafeId, skor: 600 });
  await skorYaz({ playerId: oyuncular[2].id, cafeId, skor: 300 });
});

after(async () => {
  await closePools();
});

describe("liderlik · ad maskeleme", () => {
  test("soyadın yalnızca baş harfi görünüyor", async () => {
    const l = await liderlik.bugun({ cafeId, oyunId: OYUN, bakanId: null });
    const mert = l.satirlar.find((s) => s.gorunenAd.startsWith("Mert"));
    assert.ok(mert, "Mert listede yok");
    assert.equal(mert.gorunenAd, "Mert Y***");
  });

  /**
   * ASIL GÜVENCE. Tek bir satırı sınamak kırılgan; asıl iddia şu — dönen
   * hiçbir satırda tam soyad geçmiyor.
   */
  test("hiçbir satırda tam soyad geçmiyor — ASIL GÜVENCE", async () => {
    const l = await liderlik.bugun({ cafeId, oyunId: OYUN, bakanId: null });
    for (const s of l.satirlar) {
      for (const o of oyuncular) {
        assert.ok(
          !s.gorunenAd.includes(o.soyad),
          `tam soyad sızdı: ${s.gorunenAd} (${o.soyad})`,
        );
      }
    }
  });

  test("yıldız sayısı soyad uzunluğunu ele vermiyor", async () => {
    const l = await liderlik.bugun({ cafeId, oyunId: OYUN, bakanId: null });
    const yildizlar = l.satirlar
      .filter((s) => s.gorunenAd.includes("*"))
      .map((s) => s.gorunenAd.match(/\*+/)![0].length);

    assert.ok(yildizlar.length >= 2, "maskelenmiş satır bulunamadı");
    assert.equal(new Set(yildizlar).size, 1, "yıldız sayısı soyada göre değişiyor");
  });

  test("adını kapatan oyuncu anonim kodla görünüyor, listeden düşmüyor", async () => {
    await adGorunurluguAyarla(oyuncular[0].id, false);
    try {
      const l = await liderlik.bugun({ cafeId, oyunId: OYUN, bakanId: null });
      assert.equal(l.satirlar.length, 3, "adını kapatan oyuncu listeden düştü");
      assert.ok(
        !l.satirlar.some((s) => s.gorunenAd.startsWith("Mert")),
        "kapatılmış ad hâlâ görünüyor",
      );
    } finally {
      await adGorunurluguAyarla(oyuncular[0].id, true);
    }
  });
});

describe("liderlik · sıralama ve sınırlar", () => {
  test("skora göre azalan sıralanıyor", async () => {
    const l = await liderlik.bugun({ cafeId, oyunId: OYUN, bakanId: null });
    const degerler = l.satirlar.map((s) => s.deger);
    assert.deepEqual(degerler, [...degerler].sort((a, b) => b - a));
    assert.deepEqual(
      l.satirlar.map((s) => s.sira),
      [1, 2, 3],
    );
  });

  test("aynı oyuncu iki kez oynayınca tek satır — en iyi skoru", async () => {
    await skorYaz({ playerId: oyuncular[2].id, cafeId, skor: 1_200 });
    const l = await liderlik.bugun({ cafeId, oyunId: OYUN, bakanId: null });

    assert.equal(l.satirlar.length, 3, "aynı oyuncu listeyi iki kez doldurdu");
    assert.equal(l.satirlar[0].deger, 1_200, "en iyi skor öne geçmedi");
  });

  test("bakan oyuncu kendi satırında 'benMiyim' işaretli", async () => {
    const l = await liderlik.bugun({ cafeId, oyunId: OYUN, bakanId: oyuncular[1].id });
    const benim = l.satirlar.filter((s) => s.benMiyim);
    assert.equal(benim.length, 1, "tam olarak bir satır bakan oyuncuya ait olmalı");
  });

  /** Ü3: kafede olmayan skor sıralamaya girmiyor. */
  test("konumu doğrulanmamış oyun listeye girmiyor", async () => {
    const r = await kaydet({
      telefon: yeniTelefon(),
      ad: "Uzak",
      soyad: "Oyuncu",
      dogumYili: 1990,
      pazarlamaIzni: false,
    });
    await skorYaz({ playerId: r.oyuncu.id, cafeId, skor: 99_999, k2: false });

    const l = await liderlik.bugun({ cafeId, oyunId: OYUN, bakanId: null });
    assert.ok(
      !l.satirlar.some((s) => s.gorunenAd.startsWith("Uzak")),
      "K2'siz skor listeye girdi — Ü3 delindi",
    );
  });

  test("başka kafenin skoru bu listeye karışmıyor", async () => {
    await skorYaz({ playerId: oyuncular[0].id, cafeId: cafeId2, skor: 50_000 });
    const l = await liderlik.bugun({ cafeId, oyunId: OYUN, bakanId: null });
    assert.ok(
      l.satirlar.every((s) => s.deger < 50_000),
      "başka kafenin skoru sızdı",
    );
  });

  test("boş kafede liste boş — hata değil", async () => {
    const bos = await kafeKur("LiderBos");
    const l = await liderlik.bugun({ cafeId: bos, oyunId: OYUN, bakanId: null });
    assert.deepEqual(l.satirlar, []);
    assert.equal(l.benimSiram, null);
  });
});

/* ═══════════════════════════════════════════════════════════
   Haftalık sezon (Ü105)
   ═══════════════════════════════════════════════════════════ */

/** Doğrudan `points_ledger` yazıyor: sınanan şey puan motoru değil, sezon. */
async function puanYaz(opts: {
  playerId: string;
  cafeId: string;
  puan: number;
  gun: string;
}): Promise<void> {
  await withBypass("test puan", (db) =>
    db.query(
      `INSERT INTO points_ledger
         (id, cafe_id, player_id, business_date, delta, reason, proof_level)
       VALUES ($1,$2,$3,$4::date,$5,'test sezon',2)`,
      [newId("pnt"), opts.cafeId, opts.playerId, opts.gun, opts.puan],
    ),
  );
}

describe("haftalık sezon (Ü105)", () => {
  let sezonKafe = "";

  before(async () => {
    sezonKafe = await kafeKur("SezonTest");
  });

  test("sezon pazartesi başlıyor, pazar bitiyor", () => {
    const s = liderlik.sezon("2026-09-10"); // perşembe
    assert.equal(s.baslangic, "2026-09-07");
    assert.equal(s.bitis, "2026-09-13");
    assert.equal(s.kalanGun, 4, "perşembe dahil dört gün kalmalı");
  });

  test("pazar günü sezonun son günü — bir sonraki haftaya kaymıyor", () => {
    // JavaScript'te pazar 0; Türkiye'de hafta pazartesi başlıyor ve pazar
    // ÖNCEKİ haftanın son günü. `pazartesi()` bunu zaten çözüyor, sezon
    // kendi hesabını kurmadığı için hata da tekrarlanmıyor.
    const s = liderlik.sezon("2026-09-13");
    assert.equal(s.baslangic, "2026-09-07");
    assert.equal(s.kalanGun, 1, "pazar günü 'son gün' olmalı");
  });

  /**
   * ⚠️ Sezon haftası, BÜTÇE haftasıyla aynı olmak zorunda (Ü25).
   *
   * Ayrı olsaydı kafenin panelde gördüğü "bu hafta" ile oyuncunun gördüğü
   * sezon farklı günleri kapsardı; kafe sezon şampiyonunu kendi haftalık
   * raporunda bulamazdı.
   */
  test("🔴 sezon haftası bütçe haftasıyla aynı gün başlıyor", () => {
    for (const gun of ["2026-09-07", "2026-09-10", "2026-09-13", "2026-01-01"]) {
      assert.equal(
        liderlik.sezon(gun).baslangic,
        pazartesi(gun),
        `${gun}: sezon bütçe haftasından ayrıldı`,
      );
    }
  });

  test("🔴 geçen haftanın puanı bu sezona girmiyor", async () => {
    const buHafta = pazartesi(isGunu());
    const gecenHafta = gunEkle(buHafta, -3);

    await puanYaz({ playerId: oyuncular[0].id, cafeId: sezonKafe, puan: 5_000, gun: gecenHafta });
    await puanYaz({ playerId: oyuncular[0].id, cafeId: sezonKafe, puan: 120, gun: isGunu() });

    const l = await liderlik.hafta({ cafeId: sezonKafe, bakanId: null });
    const satir = l.satirlar.find((s) => s.deger > 0);

    assert.ok(satir, "sezon listesi boş");
    assert.equal(satir.deger, 120, "geçen haftanın puanı bu sezona sızdı");
  });

  test("tüm zamanlar listesi geçen haftayı SAYIYOR — iki liste ayrı sorulara cevap veriyor", async () => {
    const l = await liderlik.tumZamanlar({ cafeId: sezonKafe, bakanId: null });
    const satir = l.satirlar.find((s) => s.deger > 0);
    assert.equal(satir?.deger, 5_120, "tüm zamanlar toplamı haftaya kısıldı");
  });

  test("geçen sezonun şampiyonu geçen haftadan geliyor", async () => {
    const gecen = liderlik.oncekiSezon(isGunu());
    await puanYaz({
      playerId: oyuncular[1].id,
      cafeId: sezonKafe,
      puan: 9_000,
      gun: gecen.baslangic,
    });

    const s = await liderlik.gecenSezonunSampiyonu({ cafeId: sezonKafe, bakanId: null });
    assert.ok(s, "geçen sezonun şampiyonu bulunamadı");
    assert.equal(s.deger, 9_000);

    // Bu sezonun listesinde o puan yok — sezon gerçekten sıfırlanıyor.
    const bu = await liderlik.hafta({ cafeId: sezonKafe, bakanId: null });
    assert.ok(
      bu.satirlar.every((r) => r.deger !== 9_000),
      "geçen sezonun puanı bu sezonda duruyor",
    );
  });

  test("harcanan puan sezondaki sırayı düşürmüyor", async () => {
    // Ödülünü alan oyuncunun listede geriye düşmesi, ödül almayı
    // cezalandırmak olurdu. `GREATEST(delta, 0)` bunu koruyor.
    await puanYaz({ playerId: oyuncular[0].id, cafeId: sezonKafe, puan: -100, gun: isGunu() });

    const l = await liderlik.hafta({ cafeId: sezonKafe, bakanId: null });
    const satir = l.satirlar.find((s) => s.deger > 0);
    assert.equal(satir?.deger, 120, "harcama sezon puanını düşürdü");
  });

  test("sezon listesi de adı maskeliyor — ortak sorgu", async () => {
    const l = await liderlik.hafta({ cafeId: sezonKafe, bakanId: null });
    for (const s of l.satirlar) {
      for (const o of oyuncular) {
        assert.ok(!s.gorunenAd.includes(o.soyad), `tam soyad sızdı: ${s.gorunenAd}`);
      }
    }
  });

  test("boş kafede sezon boş — hata değil", async () => {
    const bos = await kafeKur("SezonBos");
    const l = await liderlik.hafta({ cafeId: bos, bakanId: null });
    assert.deepEqual(l.satirlar, []);
    assert.equal(await liderlik.gecenSezonunSampiyonu({ cafeId: bos, bakanId: null }), null);
  });
});
