import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as challenge from "@/domain/challenge";
import { OYUNLAR, gununOyunu } from "@/oyunlar";
import { newId } from "@/lib/ids";
import { isGunu, gunEkle } from "@/lib/tarih";
import { yoneticiSorgu } from "./_yardim";

/**
 * GÜNÜN GÖREVİ — Ü106.
 *
 * Sınanan iddialar:
 *
 *   1. **Rotasyon gerçekten dönüyor.** Görev havuzu ile oyun sayısı
 *      aralarında asal; değilse her oyuna hep aynı görev düşer.
 *   2. **Görev tarihten türüyor** — rastgelelik yok, aynı gün aynı görev.
 *   3. **Ü3 delinmiyor:** kafe dışı tur göreve saymıyor.
 *   4. **Yarım tur saymıyor** — üç kez başlayıp çıkmak görev tamamlamıyor.
 *   5. **Bonus günde bir kez** ve bu, koda değil şemaya dayanıyor.
 */

let cafeId = "";
let oyuncuId = "";
const bugun = isGunu();

const TABAN = 7_400_000 + randomInt(400_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0555${String(TABAN + sayac++).slice(-7)}`);

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

/** Doğrudan `play_sessions` yazıyor: sınanan şey oyun akışı değil, görev. */
async function turYaz(opts: {
  oyunId: string;
  skor: number;
  k2?: boolean;
  tamam?: boolean;
  gun?: string;
}): Promise<void> {
  await withBypass("test tur", (db) =>
    db.query(
      `INSERT INTO play_sessions
         (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
          started_at, ended_at, server_score, proof_mask, proof_level,
          business_date, status, is_qualified)
       VALUES ($1,$2,NULL,$3,decode(md5($4),'hex'),$5,$6,
               now(), now(), $7, $8, 2, $9::date, $10, false)`,
      [
        newId("oyn"),
        cafeId,
        oyuncuId,
        // Cihaz vekili her satırda farklı: nitelikli oturum tekilliği
        // (S3) bu teste karışmasın.
        newId("chz"),
        opts.oyunId,
        newId("thm"),
        opts.skor,
        opts.k2 === false ? 1 : 3,
        opts.gun ?? bugun,
        opts.tamam === false ? "open" : "completed",
      ],
    ),
  );
}

/**
 * Turları siler — YÖNETİCİ rolüyle.
 *
 * Uygulama rolünün `play_sessions` üzerinde silme yetkisi bilerek yok:
 * oynanmış bir tur geri alınamaz (E3). Test onu gevşetmiyor, `_yardim`in
 * yönetici yolundan geçiyor — sınadığımız güvence yerinde kalıyor.
 */
async function temizTurlar() {
  await yoneticiSorgu(`DELETE FROM play_sessions WHERE cafe_id = $1`, [cafeId]);
}

before(async () => {
  cafeId = await kafeKur("GorevTest");
  const r = await kaydet({
    telefon: yeniTelefon(),
    ad: "Görev",
    soyad: "Testçi",
    dogumYili: 1990,
    pazarlamaIzni: false,
  });
  oyuncuId = r.oyuncu.id;
});

after(async () => {
  await closePools();
});

/* ── Rotasyon ──────────────────────────────────────────────── */

function obeb(a: number, b: number): number {
  return b === 0 ? a : obeb(b, a % b);
}

describe("görev rotasyonu", () => {
  /**
   * 🔴 ASIL GÜVENCE.
   *
   * Günün oyunu ve günün görevi **aynı gün sayacından** türüyor. Boylar
   * ortak bir bölene sahip olsaydı her oyuna hep aynı görev düşerdi:
   * "Yılan günü" sonsuza kadar "1.200 skor" olur, iki rotasyon varmış gibi
   * görünen tek bir rotasyon kalırdı.
   *
   * Bu, beşinci oyun eklendiğinde **sessizce** bozulur — derleyici görmez,
   * ekran normal görünür. Testin varlık sebebi bu.
   */
  test("🔴 havuz boyu ile oyun sayısı aralarında asal", () => {
    assert.equal(
      obeb(challenge.HAVUZ_BOYU, challenge.OYUN_SAYISI),
      1,
      `havuz ${challenge.HAVUZ_BOYU}, oyun ${challenge.OYUN_SAYISI} — ` +
        `ortak bölen var, her oyuna hep aynı görev düşecek`,
    );
  });

  test("aynı gün her zaman aynı görev — rastgelelik yok", () => {
    for (const gun of ["2026-09-10", "2026-01-01", "2027-03-15"]) {
      assert.equal(challenge.gununGorevi(gun).id, challenge.gununGorevi(gun).id);
    }
  });

  test("görev günden güne değişiyor", () => {
    const g1 = challenge.gununGorevi("2026-09-10").id;
    const g2 = challenge.gununGorevi("2026-09-11").id;
    assert.notEqual(g1, g2, "arka arkaya iki gün aynı görev");
  });

  test("havuzdaki her görev bir tam turda en az bir kez çıkıyor", () => {
    const gorulen = new Set<string>();
    for (let i = 0; i < challenge.HAVUZ_BOYU; i++) {
      gorulen.add(challenge.gununGorevi(gunEkle("2026-09-10", i)).id);
    }
    assert.equal(gorulen.size, challenge.HAVUZ_BOYU, "bazı görevler hiç çıkmıyor");
  });

  test("oyun–görev eşleşmesi tam turda tekrar etmiyor", () => {
    // 5 × 4 = 20 günlük döngü. İlk 20 günde hiçbir (oyun, görev) çifti
    // iki kez görünmemeli — rotasyonun gerçekten iki boyutlu olduğu budur.
    const ciftler = new Set<string>();
    for (let i = 0; i < challenge.HAVUZ_BOYU * challenge.OYUN_SAYISI; i++) {
      const gun = gunEkle("2026-09-10", i);
      ciftler.add(`${gununOyunu(gun).id}|${challenge.gununGorevi(gun).id}`);
    }
    assert.equal(ciftler.size, challenge.HAVUZ_BOYU * challenge.OYUN_SAYISI);
  });

  test("skor görevi günün oyununa bağlanıyor", () => {
    for (let i = 0; i < 20; i++) {
      const gun = gunEkle("2026-09-10", i);
      const g = challenge.gununGorevi(gun);
      if (g.tur === "skor") {
        assert.equal(g.oyunId, gununOyunu(gun).id, `${gun}: skor görevi başka oyunu işaret etti`);
        assert.ok(g.baslik.includes(gununOyunu(gun).ad), "başlıkta oyun adı yok");
      } else {
        assert.equal(g.oyunId, null, "skor dışı görev bir oyuna bağlandı");
      }
    }
  });

  test("her görevin XP'si sıfırdan büyük ve makul", () => {
    for (let i = 0; i < challenge.HAVUZ_BOYU; i++) {
      const g = challenge.gununGorevi(gunEkle("2026-09-10", i));
      assert.ok(g.xp > 0, `${g.id}: XP yok`);
      // Bir oyun 50 XP (bonuslu 100). Görev bunun katı olmamalı, yoksa
      // oynamak yerine görevi beklemek daha kârlı olurdu.
      assert.ok(g.xp <= 100, `${g.id}: ${g.xp} XP — bir oyunun bonuslu değerinden fazla`);
    }
  });
});

/* ── İlerleme ──────────────────────────────────────────────── */

describe("görev ilerlemesi", () => {
  test("hiç oynamayanın ilerlemesi sıfır, görev tamam değil", async () => {
    await temizTurlar();
    const i = await withBypass("test", (db) =>
      challenge.ilerleme(db, { playerId: oyuncuId, cafeId }),
    );
    assert.equal(i.mevcut, 0);
    assert.equal(i.tamam, false);
  });

  test("tur sayan görev tamamlanıyor", async () => {
    // Görev türü tarihe bağlı; "tur" görevinin düştüğü bir gün seçiliyor.
    const gun = turGunuBul("tur");
    const g = challenge.gununGorevi(gun);
    await temizTurlar();

    for (let n = 0; n < g.hedef; n++) {
      await turYaz({ oyunId: OYUNLAR[n % OYUNLAR.length].id, skor: 10, gun });
    }

    const i = await withBypass("test", (db) =>
      challenge.ilerleme(db, { playerId: oyuncuId, cafeId, gun }),
    );
    assert.equal(i.mevcut, g.hedef);
    assert.equal(i.tamam, true);
  });

  /**
   * ⚠️ Yarım bırakılan tur sayılmasaydı "3 tur oyna" görevi, üç kez
   * başlayıp hemen çıkmakla tamamlanırdı — en ucuz çiftlik yolu görevin
   * kendisi olurdu.
   */
  test("🔴 yarım bırakılan tur göreve saymıyor", async () => {
    const gun = turGunuBul("tur");
    const g = challenge.gununGorevi(gun);
    await temizTurlar();

    for (let n = 0; n < g.hedef + 2; n++) {
      await turYaz({ oyunId: OYUNLAR[0].id, skor: 10, gun, tamam: false });
    }

    const i = await withBypass("test", (db) =>
      challenge.ilerleme(db, { playerId: oyuncuId, cafeId, gun }),
    );
    assert.equal(i.mevcut, 0, "açık oturum göreve sayıldı");
    assert.equal(i.tamam, false);
  });

  /** Ü3: kafe dışında oynanan tur hiçbir kazanım üretmiyor — görev de dahil. */
  test("🔴 kafe dışı tur göreve saymıyor", async () => {
    const gun = turGunuBul("tur");
    const g = challenge.gununGorevi(gun);
    await temizTurlar();

    for (let n = 0; n < g.hedef + 2; n++) {
      await turYaz({ oyunId: OYUNLAR[0].id, skor: 10, gun, k2: false });
    }

    const i = await withBypass("test", (db) =>
      challenge.ilerleme(db, { playerId: oyuncuId, cafeId, gun }),
    );
    assert.equal(i.mevcut, 0, "K2'siz tur göreve sayıldı — Ü3 delindi");
  });

  test("çeşit görevinde aynı oyunu tekrar oynamak ilerletmiyor", async () => {
    const gun = turGunuBul("cesit");
    await temizTurlar();

    for (let n = 0; n < 4; n++) {
      await turYaz({ oyunId: OYUNLAR[0].id, skor: 10, gun });
    }

    const i = await withBypass("test", (db) =>
      challenge.ilerleme(db, { playerId: oyuncuId, cafeId, gun }),
    );
    assert.equal(i.mevcut, 1, "aynı oyun birden çok çeşit sayıldı");
    assert.equal(i.tamam, false);
  });

  test("skor görevinde BAŞKA oyunun skoru sayılmıyor", async () => {
    const gun = turGunuBul("skor");
    const g = challenge.gununGorevi(gun);
    const baska = OYUNLAR.find((o) => o.id !== g.oyunId)!;
    await temizTurlar();

    await turYaz({ oyunId: baska.id, skor: g.hedef * 3, gun });

    const i = await withBypass("test", (db) =>
      challenge.ilerleme(db, { playerId: oyuncuId, cafeId, gun }),
    );
    assert.equal(i.mevcut, 0, "başka oyunun skoru göreve sayıldı");

    await turYaz({ oyunId: g.oyunId!, skor: g.hedef, gun });
    const i2 = await withBypass("test", (db) =>
      challenge.ilerleme(db, { playerId: oyuncuId, cafeId, gun }),
    );
    assert.equal(i2.tamam, true, "günün oyununda hedefe ulaşıldı ama görev tamam değil");
  });

  test("başka kafenin turu bu kafenin görevine saymıyor", async () => {
    const gun = turGunuBul("tur");
    await temizTurlar();
    const baskaKafe = await kafeKur("GorevBaska");

    await withBypass("test", (db) =>
      db.query(
        `INSERT INTO play_sessions
           (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
            started_at, ended_at, server_score, proof_mask, proof_level,
            business_date, status, is_qualified)
         VALUES ($1,$2,NULL,$3,decode(md5($1),'hex'),$4,$5,
                 now(), now(), 500, 3, 2, $6::date, 'completed', false)`,
        [newId("oyn"), baskaKafe, oyuncuId, OYUNLAR[0].id, newId("thm"), gun],
      ),
    );

    const i = await withBypass("test", (db) =>
      challenge.ilerleme(db, { playerId: oyuncuId, cafeId, gun }),
    );
    assert.equal(i.mevcut, 0, "başka kafenin turu sızdı");
  });
});

/* ── Günde bir kez ─────────────────────────────────────────── */

describe("görev bonusu günde bir kez", () => {
  async function xpYaz(gun: string) {
    await withBypass("test görev xp", (db) =>
      db.query(
        `INSERT INTO xp_ledger
           (id, cafe_id, player_id, business_date, delta, source_type, proof_level)
         VALUES ($1,$2,$3,$4::date,60,'CHALLENGE',2)`,
        [newId("xp"), cafeId, oyuncuId, gun],
      ),
    );
  }

  test("yazılmamışken bugunYazildiMi false", async () => {
    const gun = gunEkle(bugun, -40);
    const v = await withBypass("test", (db) =>
      challenge.bugunYazildiMi(db, { playerId: oyuncuId, cafeId, gun }),
    );
    assert.equal(v, false);
  });

  test("yazıldıktan sonra true", async () => {
    const gun = gunEkle(bugun, -41);
    await xpYaz(gun);
    const v = await withBypass("test", (db) =>
      challenge.bugunYazildiMi(db, { playerId: oyuncuId, cafeId, gun }),
    );
    assert.equal(v, true);
  });

  /**
   * 🔴 Kod kontrolü tek başına yeterli değil: aynı anda biten iki oyun iki
   * ayrı işlemde çalışır, ikisi de "yazılmamış" görür ve bonus iki kez
   * düşer. Asıl güvence göç 0031'deki tekil indeks — bu test onu sınıyor,
   * `bugunYazildiMi`'yi değil.
   */
  test("🔴 aynı güne ikinci görev XP'si ŞEMA tarafından reddediliyor", async () => {
    const gun = gunEkle(bugun, -42);
    await xpYaz(gun);
    await assert.rejects(
      () => xpYaz(gun),
      /duplicate key|unique/i,
      "aynı güne ikinci görev XP'si yazılabildi",
    );
  });

  test("farklı günlere ayrı ayrı yazılabiliyor", async () => {
    await xpYaz(gunEkle(bugun, -43));
    await xpYaz(gunEkle(bugun, -44));
    const r = await withBypass("test", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*)::text AS n FROM xp_ledger
          WHERE cafe_id = $1 AND player_id = $2 AND source_type = 'CHALLENGE'`,
        [cafeId, oyuncuId],
      ),
    );
    assert.ok(Number(r?.n ?? 0) >= 4, "farklı günler engellendi");
  });

  /** Ü3'ün şemadaki karşılığı `GAME` gibi `CHALLENGE` için de geçerli. */
  test("🔴 kanıtsız görev XP'si şema tarafından reddediliyor", async () => {
    await assert.rejects(
      () =>
        withBypass("test kanıtsız", (db) =>
          db.query(
            `INSERT INTO xp_ledger
               (id, cafe_id, player_id, business_date, delta, source_type, proof_level)
             VALUES ($1,$2,$3,$4::date,60,'CHALLENGE',0)`,
            [newId("xp"), cafeId, oyuncuId, gunEkle(bugun, -45)],
          ),
        ),
      /xp_oyun_kafede/i,
      "kafe dışında görev XP'si yazılabildi — Ü3 şemadan sızdı",
    );
  });
});

/* ── Yardımcı ──────────────────────────────────────────────── */

/** Verilen türdeki görevin düştüğü ilk günü bulur. */
function turGunuBul(tur: challenge.ChallengeTuru): string {
  for (let i = 0; i < challenge.HAVUZ_BOYU; i++) {
    const gun = gunEkle(bugun, i);
    if (challenge.gununGorevi(gun).tur === tur) return gun;
  }
  throw new Error(`havuzda '${tur}' türü yok`);
}
