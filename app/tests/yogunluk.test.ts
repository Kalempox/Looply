import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import { newId } from "@/lib/ids";
import { gunEkle, isGunu } from "@/lib/tarih";
import * as yogunluk from "@/domain/yogunluk";
import * as butce from "@/domain/butce";
import * as motor from "@/domain/odul-motoru";
import { benzersizEposta, testKafeleriniSil, yoneticiSorgu } from "./_yardim";

/**
 * Kafenin yoğunluk profili ve bütçeyi kalabalığa göre dağıtan şans — Ü281.
 *
 * Ürün sahibi: *"kafe 9'da açılıp 23'te kapanıyor, en yoğun saat akşam 7
 * ile 10 — bu saatlere doğru miktarda bütçe kalmalı. Önceki saatlerde
 * bütçeyi her gelene ödül dağıtarak bitirirsek bu kalabalıkta doğru
 * bütçeyi dağıtamayız. Bu saat her kafede farklı; sistem bunu akıllıca
 * yapmalı."*
 *
 * Sınanan şey tek tek formüller değil, **bir günün sonucu**: üç farklı
 * kafe profilinde bütçe aşılmıyor, kullanılıyor, yoğun saate kalıyor ve
 * şans gün boyu dengeli.
 */

const GUN = "2026-09-24"; // perşembe — hafta içi
const an = (saat: number, dk = 0) =>
  new Date(`${GUN}T${String(saat).padStart(2, "0")}:${String(dk).padStart(2, "0")}:00+03:00`);

/** Saat → göreli kalabalık (09–23 açık kafe). */
const PROFILLER: Record<string, (h: number) => number> = {
  aksam: (h) => (h < 12 ? 0.5 : h < 14 ? 1.0 : h < 19 ? 0.7 : h < 22 ? 3.0 : 1.0),
  sabah: (h) => (h < 11 ? 3.0 : h < 14 ? 1.2 : h < 19 ? 0.6 : 0.4),
  ogle: (h) => (h < 12 ? 0.6 : h < 15 ? 3.0 : h < 19 ? 0.8 : 0.6),
};
const YOGUN: Record<string, [number, number]> = { aksam: [19, 22], sabah: [9, 11], ogle: [12, 15] };

type GunSonucu = {
  kullanilan: number;
  yogunPayi: number;
  beklenenYogunPayi: number;
  sansOrani: number;
  tavanAsildi: boolean;
  /** Tavan dolu olduğu için şansı SIFIR olan fırsatların oranı — "ilk gelen alır". */
  kapaliOran: number;
};

/**
 * Bir günü dakika dakika oynatır. `yontem`:
 *  - "yeni": profile göre açılan tavan + kalan bütçe ÷ kalan fırsat
 *  - "eski": düz tavan + sabit %33,5 (Ü275)
 */
function gunuOyna(tur: string, yontem: "yeni" | "eski", butceTl: number, gunlukFirsat: number): GunSonucu {
  const B = butceTl * 100;
  const ACILIS = 9;
  const KAPANIS = 23;
  const agirlik = PROFILLER[tur];

  // Kafenin "geçmişi": dört haftalık sayım, bugünkü kalabalıkla aynı şekil.
  const sayim = Array(24).fill(0) as number[];
  const toplamAgirlik = yogunluk.acikSaatler(ACILIS, KAPANIS).reduce((s, h) => s + agirlik(h), 0);
  for (const h of yogunluk.acikSaatler(ACILIS, KAPANIS)) {
    sayim[h] = Math.round((gunlukFirsat * 20 * agirlik(h)) / toplamAgirlik);
  }
  const profil = yogunluk.profilHesapla(sayim, 20, ACILIS, KAPANIS, "hafta_ici");

  let harcanan = 0;
  let yogunHarcanan = 0;
  let bugunSimdiye = 0;
  let tavanAsildi = false;
  let kapali = 0;
  let firsat = 0;
  const dilimSans: Record<string, { toplam: number; n: number }> = {};
  let r = 424242 >>> 0;
  const rnd = () => ((r = (r * 1103515245 + 12345) >>> 0) / 0x100000000);

  for (let dk = ACILIS * 60; dk < KAPANIS * 60; dk++) {
    const h = Math.floor(dk / 60);
    const simdi = an(h, dk % 60);
    let beklenen = (gunlukFirsat * agirlik(h)) / toplamAgirlik / 60;
    while (beklenen > 0) {
      if (rnd() < Math.min(1, beklenen)) {
        const oran =
          yontem === "yeni"
            ? butce.tempoOrani(simdi, ACILIS, KAPANIS, profil.paylar)
            : butce.tempoOrani(simdi, ACILIS, KAPANIS);
        const dagitilabilir = Math.min(B, Math.floor(B * oran)) - harcanan;
        let p: number;
        if (yontem === "yeni") {
          const kalanFirsat = yogunluk.kalanFirsat({
            profil,
            an: simdi,
            bugunSimdiye,
            acilis: ACILIS,
            kapanis: KAPANIS,
          });
          p = motor.paketSansi({
            kalanKurus: B - harcanan,
            kalanFirsat,
            ortalamaOdulKurus: 40_00,
            sonKazanim: 0,
          });
        } else {
          p = 0.335;
        }
        if (dagitilabilir < 20_00) {
          p = 0;
          kapali++;
        }
        firsat++;
        bugunSimdiye++;

        const dilim = h < 12 ? "sabah" : h < 17 ? "ogle" : "aksam";
        dilimSans[dilim] ??= { toplam: 0, n: 0 };
        dilimSans[dilim].toplam += p;
        dilimSans[dilim].n++;

        if (rnd() < p) {
          const deger = 20_00 + Math.floor(rnd() * 40_00);
          if (deger <= dagitilabilir) {
            harcanan += deger;
            if (harcanan > B || harcanan > Math.floor(B * oran)) tavanAsildi = true;
            const [ys, yb] = YOGUN[tur];
            if (h >= ys && h < yb) yogunHarcanan += deger;
          }
        }
      }
      beklenen -= 1;
    }
  }

  const [ys, yb] = YOGUN[tur];
  const beklenenYogunPayi = yogunluk.acikSaatler(ys, yb).reduce((s, h) => s + profil.paylar[h], 0);
  const ortalamalar = Object.values(dilimSans).map((d) => d.toplam / d.n);
  return {
    kullanilan: harcanan / B,
    yogunPayi: yogunHarcanan / Math.max(1, harcanan),
    beklenenYogunPayi,
    sansOrani: Math.max(...ortalamalar) / Math.max(1e-9, Math.min(...ortalamalar)),
    tavanAsildi,
    kapaliOran: kapali / Math.max(1, firsat),
  };
}

describe("bütçe kalabalığı izliyor — gün simülasyonu (Ü281)", () => {
  for (const tur of ["aksam", "sabah", "ogle"]) {
    test(`🔴 ${tur} yoğun kafe: bütçe aşılmıyor, kullanılıyor, yoğun saate kalıyor, şans dengeli`, () => {
      const yeni = gunuOyna(tur, "yeni", 10_000, 1_200);
      const eski = gunuOyna(tur, "eski", 10_000, 1_200);

      assert.equal(yeni.tavanAsildi, false, "günlük bütçe ya da saat tavanı aşıldı");
      assert.ok(yeni.kullanilan >= 0.9, `bütçenin yalnızca %${Math.round(yeni.kullanilan * 100)}'ı kullanıldı`);
      // Yoğun saatler kalabalıktaki paylarına yakın bütçe alıyor.
      assert.ok(
        yeni.yogunPayi >= yeni.beklenenYogunPayi - 0.1,
        `yoğun saate bütçenin %${Math.round(yeni.yogunPayi * 100)}'ı kaldı, beklenen ~%${Math.round(yeni.beklenenYogunPayi * 100)}`,
      );
      // Sabah gelen ile akşam kalabalığı benzer şans görüyor.
      assert.ok(yeni.sansOrani <= 1.6, `dilimler arası şans oranı ${yeni.sansOrani.toFixed(2)}`);
      // Eski yöntemden kötü değil: yoğun saate en az onun kadar kalıyor.
      assert.ok(yeni.yogunPayi >= eski.yogunPayi - 0.02, "yoğun saate eski yöntemden az kaldı");
    });
  }

  test("ürün sahibinin örneği: akşam 19–22'ye eski yöntemden çok daha fazla bütçe kalıyor", () => {
    const yeni = gunuOyna("aksam", "yeni", 10_000, 1_200);
    const eski = gunuOyna("aksam", "eski", 10_000, 1_200);
    assert.ok(yeni.yogunPayi > eski.yogunPayi + 0.15, `yeni %${Math.round(yeni.yogunPayi * 100)} · eski %${Math.round(eski.yogunPayi * 100)}`);
  });

  test("🔴 bol bütçe, tenha kafe: şans yükseliyor, bütçe kullanılıyor", () => {
    // Ürün sahibi: "günlük limit 10.000 ise farklı, 20.000 ise farklı."
    // Sabit şans (%33,5) bol bütçeyi kullanılmadan bırakıyordu.
    const yeni = gunuOyna("aksam", "yeni", 10_000, 150);
    const eski = gunuOyna("aksam", "eski", 10_000, 150);
    assert.equal(yeni.tavanAsildi, false);
    assert.ok(
      yeni.kullanilan > eski.kullanilan * 2,
      `yeni %${Math.round(yeni.kullanilan * 100)} · eski %${Math.round(eski.kullanilan * 100)}`,
    );
    // Oyuncu yoksa bütçe tükenmiyor — şans %90'da tavan yapıyor.
    assert.ok(gunuOyna("aksam", "yeni", 20_000, 150).kullanilan < 0.5);
  });

  test("🔴 dar bütçe, kalabalık kafe: şans eşit yayılıyor, 'ilk gelen alır' yok", () => {
    // Sabit şansta tavan açıldıkça ilk gelenler kazanıyor, sonrakiler sıfır
    // görüyordu. Kalan bütçe ÷ kalan kalabalık, şansı herkese eşit yayıyor.
    const yeni = gunuOyna("aksam", "yeni", 1_500, 1_200);
    const eski = gunuOyna("aksam", "eski", 1_500, 1_200);
    assert.ok(yeni.kapaliOran < 0.15, `yeni: turların %${Math.round(yeni.kapaliOran * 100)}'ında şans sıfır`);
    assert.ok(eski.kapaliOran > yeni.kapaliOran + 0.2, `eski %${Math.round(eski.kapaliOran * 100)} · yeni %${Math.round(yeni.kapaliOran * 100)}`);
    assert.ok(yeni.kullanilan >= 0.85, `dar bütçenin yalnızca %${Math.round(yeni.kullanilan * 100)}'ı kullanıldı`);
  });
});

describe("profil (Ü281)", () => {
  test("paylar yalnızca açık saatlerde ve toplamı 1", () => {
    const sayim = Array(24).fill(0);
    sayim[20] = 30;
    const p = yogunluk.profilHesapla(sayim, 10, 9, 23, "hafta_ici");
    const toplam = p.paylar.reduce((s, x) => s + x, 0);
    assert.ok(Math.abs(toplam - 1) < 1e-9);
    assert.equal(p.paylar[8], 0, "açılıştan önce pay var");
    assert.equal(p.paylar[23], 0, "kapanıştan sonra pay var");
    assert.ok(p.paylar[20] > p.paylar[10], "yoğun saat payı öne çıkmıyor");
    assert.equal(p.gunlukOrtalama, 3);
  });

  test("veri yokken profil düz ve bütçe eski düz çizgiyle açılıyor", () => {
    const p = yogunluk.profilHesapla(Array(24).fill(0), 0, 9, 23, "hafta_ici");
    assert.equal(p.gunlukOrtalama, null);
    for (const [s, d] of [[10, 0], [12, 30], [16, 45], [22, 15]]) {
      const eski = butce.tempoOrani(an(s, d), 9, 23);
      const yeni = butce.tempoOrani(an(s, d), 9, 23, p.paylar);
      assert.ok(Math.abs(eski - yeni) < 1e-9, `${s}:${d} eski ${eski} · yeni ${yeni}`);
    }
  });

  test("kapalıyken hâlâ sıfır, kapanış payı hâlâ tam (Ü90)", () => {
    const sayim = Array(24).fill(0);
    sayim[20] = 50;
    const p = yogunluk.profilHesapla(sayim, 10, 9, 23, "hafta_ici");
    assert.equal(butce.tempoOrani(an(8), 9, 23, p.paylar), 0);
    assert.equal(butce.tempoOrani(an(23, 10), 9, 23, p.paylar), 1);
    assert.equal(butce.tempoOrani(an(23, 40), 9, 23, p.paylar), 0);
  });

  test("akşam yoğun profilde öğlen açılan pay düz çizgiden az", () => {
    const sayim = Array(24).fill(0);
    for (const h of [19, 20, 21]) sayim[h] = 100;
    for (const h of [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 22]) sayim[h] = 10;
    const p = yogunluk.profilHesapla(sayim, 20, 9, 23, "hafta_ici");
    assert.ok(butce.tempoOrani(an(15), 9, 23, p.paylar) < butce.tempoOrani(an(15), 9, 23));
  });

  test("en yoğun aralık bulunuyor", () => {
    const sayim = Array(24).fill(1);
    for (const h of [19, 20, 21]) sayim[h] = 40;
    const p = yogunluk.profilHesapla(sayim, 7, 9, 23, "hafta_ici");
    assert.deepEqual(
      (({ bas, bit }) => ({ bas, bit }))(yogunluk.enYogunAralik(p.paylar, 9, 23)),
      { bas: 19, bit: 22 },
    );
  });

  test("kalan fırsat: bugün beklenenden kalabalıksa tahmin yarı güvenle artıyor", () => {
    const sayim = Array(24).fill(0);
    for (const h of yogunluk.acikSaatler(9, 23)) sayim[h] = 20; // günde 14 × 20 / 20 gün = 14
    const p = yogunluk.profilHesapla(sayim, 20, 9, 23, "hafta_ici");
    const normal = yogunluk.kalanFirsat({ profil: p, an: an(16), bugunSimdiye: 7, acilis: 9, kapanis: 23 });
    const kalabalik = yogunluk.kalanFirsat({ profil: p, an: an(16), bugunSimdiye: 14, acilis: 9, kapanis: 23 });
    assert.ok(kalabalik > normal, "kalabalık gün tahmini artırmıyor");
    assert.ok(kalabalik < normal * 2, "tek günün temposuna tamamen güvenildi");
  });

  test("🔴 az geçmişte de bugünkü kalabalık görülüyor; tahmin gelenin altına inmiyor", () => {
    // Kafe A'da görüldü: günde 9 fırsat öğrenmiş, 16:00'da 13 gelmiş —
    // beklenen (4,5) 5'in altında diye tahmin 9'da kalıyordu.
    const sayim = Array(24).fill(0);
    for (const h of yogunluk.acikSaatler(9, 23)) sayim[h] = 9; // 14 gün × günde 9
    const p = yogunluk.profilHesapla(sayim, 14, 9, 23, "hafta_ici");
    const S = yogunluk.birikimliPay(p.paylar, an(16));
    const tahmin = (gelen: number) =>
      yogunluk.gunlukTahmin({ profil: p, bugunSimdiye: gelen, acilis: 9, kapanis: 23 }, S);
    assert.ok(tahmin(13) > 13, `tahmin ${tahmin(13)}`);
    assert.equal(tahmin(3), 9, "birkaç fırsat tahmini oynattı");
    assert.equal(tahmin(40), 40, "gelen fırsat tahminin üstünde kaldı");
  });

  test("hafta sonu ve hafta içi ayrı", () => {
    assert.equal(yogunluk.gunTuru("2026-09-26"), "hafta_sonu"); // cumartesi
    assert.equal(yogunluk.gunTuru("2026-09-27"), "hafta_sonu"); // pazar
    assert.equal(yogunluk.gunTuru("2026-09-28"), "hafta_ici"); // pazartesi
  });
});

/* ═══════════════════════════════════════════════════════════
   Veritabanından öğrenme — kendi test kafesinde
   ═══════════════════════════════════════════════════════════ */

const TABAN = 5_000_000 + randomInt(4_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0558${String(TABAN + sayac++).slice(-7)}`);
const olusanKafeler: string[] = [];
let kafe = "";
let masaId = "";
let oyuncu = "";

before(async () => {
  kafe = newId("cafe");
  olusanKafeler.push(kafe);
  masaId = newId("tbl");
  await withBypass("test kafe — yoğunluk", async (db) => {
    await db.query(
      `INSERT INTO cafes (id, name, slug, status, lat, lng)
       VALUES ($1,'YogunlukTest',$2,'approved',41.0,29.0)`,
      [kafe, `yogunluk-${kafe.slice(-6)}`],
    );
    await db.query(
      `INSERT INTO cafe_tables (id, cafe_id, label, qr_secret)
       VALUES ($1,$2,'Masa 1',decode('00','hex'))`,
      [masaId, kafe],
    );
  });
  oyuncu = (
    await kaydet({
      telefon: yeniTelefon(),
      eposta: benzersizEposta(),
      ad: "Yogun",
      soyad: "Testi",
      dogumYili: 1990,
      pazarlamaIzni: false,
    })
  ).oyuncu.id;
});

after(async () => {
  // Uygulama rolünün silme yetkisi yok (bilerek) — yönetici bağlantısı.
  await yoneticiSorgu(`DELETE FROM play_sessions WHERE player_id = $1`, [oyuncu]);
  await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [oyuncu]);
  await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [oyuncu]);
  await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [oyuncu]);
  await testKafeleriniSil(olusanKafeler);
  await closePools();
});

/** Geçmiş bir günün belirli saatine tamamlanmış tur yazar. */
async function turYaz(gun: string, saat: number, skor = 600, kanit = 2): Promise<string> {
  const id = newId("oyn");
  await withBypass("test: geçmiş tur", (db) =>
    db.query(
      `INSERT INTO play_sessions
         (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
          proof_mask, proof_level, business_date, status, started_at, ended_at, server_score)
       VALUES ($1,$2,$3,$4,'x','sekme','t',$5,$6,$7,'completed',
               ($7::date + make_interval(hours => $8)) AT TIME ZONE 'Europe/Istanbul',
               ($7::date + make_interval(hours => $8, mins => 5)) AT TIME ZONE 'Europe/Istanbul',
               $9)`,
      [id, kafe, masaId, oyuncu, kanit >= 2 ? 3 : 1, kanit, gun, saat, skor],
    ),
  );
  return id;
}

describe("profil kafenin kendi geçmişinden öğreniliyor (Ü281)", () => {
  test("🔴 en yoğun saat geçmişten bulunuyor; eşiğin altı ve konumsuz tur sayılmıyor", async () => {
    // Bugünle AYNI gün türünden iki geçmiş gün.
    const bugun = isGunu();
    const tur = yogunluk.gunTuru(bugun);
    const gunler: string[] = [];
    for (let i = 1; gunler.length < 2 && i < 15; i++) {
      const g = gunEkle(bugun, -i);
      if (yogunluk.gunTuru(g) === tur) gunler.push(g);
    }
    for (const g of gunler) {
      for (let k = 0; k < 6; k++) await turYaz(g, 20);
      await turYaz(g, 11);
      await turYaz(g, 20, 300); // eşiğin altı — sayılmamalı
      await turYaz(g, 20, 700, 1); // konumsuz — sayılmamalı
    }

    const p = await withBypass("test: profil", (db) =>
      yogunluk.profilIle(db, { cafeId: kafe, acilis: 9, kapanis: 23 }),
    );
    assert.equal(p.gunSayisi, 2);
    assert.equal(p.gunlukOrtalama, 7, "eşik altı ya da konumsuz tur sayıldı");
    assert.equal(yogunluk.enYogunAralik(p.paylar, 9, 23, 1).bas, 20);
  });
});
