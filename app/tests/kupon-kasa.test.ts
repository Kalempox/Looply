import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass, withCafe } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as masa from "@/domain/masa";
import * as butce from "@/domain/butce";
import * as katalog from "@/domain/katalog";
import * as kupon from "@/domain/kupon";
import * as motor from "@/domain/odul-motoru";
import * as ayar from "@/domain/ayar";
import { kuponDetayi, envanter, YENI_ACILDI_SAAT } from "@/domain/odul";
import { yazIle as puanYaz } from "@/domain/puan";
import { isGunu } from "@/lib/tarih";
import { yoneticiSorgu, benzersizEposta } from "./_yardim";

/**
 * FAZ 7 GÜVENLİK KAPISI — kupon ve kasa onayı.
 *
 * Planın en sıkı fazı: para değeri burada gerçek dünyaya çıkıyor.
 *
 *   1. Aynı kupon iki kez onaylanamaz — EŞZAMANLI iki istekte bile
 *   2. Aynı kupon QR'dan ve koddan aynı anda gelirse yalnızca biri geçer
 *   3. Oyuncu kendi kuponunu "kullanıldı" yapamaz
 *   4. Başka kafenin kuponu kabul edilmez
 *   5. Tutar istemciden değil kayıttan düşer
 *   6. Bütçe negatife düşemez
 */

const KAFE_LAT = 41.0369;
const KAFE_LNG = 28.9838;

let kafeA = "";
let kafeB = "";
let masaA = "";
let yoneticiA = "";
let kasiyerA = "";
let oyuncuId = "";

let katalogOdulId = "";
let buyukOdulId = "";
let yuzdeOdulId = "";
let tutarOdulId = "";

const bugun = isGunu();
const TABAN = 3_000_000 + randomInt(5_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0559${String(TABAN + sayac++).slice(-7)}`);

/** Doğrulanmış (K2) masa oturumu — kazanım için şart. */
async function dogrulanmisOturum(playerId: string) {
  await masa.ac({ cafeId: kafeA, tableId: masaA, playerId });
  const s = await masa.konumDogrula(playerId, KAFE_LAT, KAFE_LNG);
  assert.equal(s.durum, "dogrulandi", "test kurulumu: konum doğrulanamadı");
}

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    // Bu dosya kafe-b üzerinde çalışıyor: `oyun-motoru.test.ts` kafe-a'yı
    // kullanıyor ve test dosyaları PARALEL koşuyor. Aynı kafenin bütçesini
    // iki dosyadan eşzamanlı değiştirmek, ikisini de rastgele düşürürdü.
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const t = await db.one<{ id: string }>(
      "SELECT id FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1",
      [a!.id],
    );
    const y = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [a!.id],
    );
    const k = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'cashier' LIMIT 1",
      [a!.id],
    );
    return { a: a?.id, b: b?.id, t: t?.id, y: y?.id, k: k?.id };
  });
  assert.ok(v.a && v.b && v.t && v.y && v.k, "Tohum verisi eksik — önce: npm run db:seed");
  kafeA = v.a;
  kafeB = v.b;
  masaA = v.t;
  yoneticiA = v.y;
  kasiyerA = v.k;

  await yoneticiSorgu(`UPDATE cafes SET lat = $2, lng = $3 WHERE id = $1`, [
    kafeA,
    KAFE_LAT,
    KAFE_LNG,
  ]);
  await yoneticiSorgu(
    `UPDATE platform_config SET value = 'false'::jsonb
      WHERE key IN ('kupon_dagitimi_durduruldu','oyun_durduruldu')`,
  );

  // Bol bütçe: testler bütçe sınırını ayrıca sınıyor.
  //
  // ⚠️ Ü87'den sonra taahhüt on katına çıkarıldı. Sebep tempo: günlük
  // bütçenin yalnızca onda biri gün açılmadan önce erişilebilir ve CI
  // gece yarısından sonra koştuğunda beşinci-altıncı kupon "bütçe doldu"
  // diye reddediliyordu. Konusu bütçe olmayan testlerin saate bağlı
  // düşmesi, hatayı yanlış yerde aratır.
  const b = await butce.donemBelirle({
    cafeId: kafeA,
    taahhutKurus: 5_000_000,
    aktorId: yoneticiA,
    gun: bugun,
  });
  assert.ok(b.ok, b.ok === false ? b.hata : "");

  const ekle = async (o: Parameters<typeof katalog.ekle>[0]) => {
    const s = await katalog.ekle(o);
    assert.ok(s.ok, s.ok === false ? s.hata : "");
    return s.ok ? s.id : "";
  };

  // Döngü testi için iki anlık ödül; kimlikleri gerekmiyor.
  await ekle({
    cafeId: kafeA,
    tip: "product",
    baslik: "KTEST Anlık kurabiye",
    maliyetKurus: 25_00,
    puanFiyati: 0,
    anlik: true,
    aktorId: yoneticiA,
  });
  await ekle({
    cafeId: kafeA,
    tip: "product",
    baslik: "KTEST Anlık çay",
    maliyetKurus: 30_00,
    puanFiyati: 0,
    anlik: true,
    aktorId: yoneticiA,
  });
  katalogOdulId = await ekle({
    cafeId: kafeA,
    tip: "product",
    baslik: "KTEST Küçük kahve",
    maliyetKurus: 25_00,
    puanFiyati: 10,
    anlik: false,
    aktorId: yoneticiA,
  });
  buyukOdulId = await ekle({
    cafeId: kafeA,
    tip: "product",
    baslik: "KTEST Büyük tatlı",
    maliyetKurus: 50_00,
    puanFiyati: 20,
    anlik: false,
    aktorId: yoneticiA,
  });
  tutarOdulId = await ekle({
    cafeId: kafeA,
    tip: "amount",
    baslik: "KTEST 40 TL indirim",
    maliyetKurus: 40_00,
    puanFiyati: 15,
    anlik: false,
    aktorId: yoneticiA,
  });
  yuzdeOdulId = await ekle({
    cafeId: kafeA,
    tip: "percent",
    baslik: "KTEST Yüzde indirim",
    maliyetKurus: 40_00,
    yuzde: 20,
    puanFiyati: 15,
    anlik: false,
    aktorId: yoneticiA,
  });

  oyuncuId = (
    await kaydet({
      telefon: yeniTelefon(),
      eposta: benzersizEposta(),
      ad: "Kupon",
      soyad: "Testi",
      dogumYili: 1990,
      pazarlamaIzni: false,
    })
  ).oyuncu.id;

  await dogrulanmisOturum(oyuncuId);

  // Puan artık ödül almıyor (Ü52) ama defterde bir hareket olsun: bazı
  // testler oyuncunun kafede geçmişi olduğunu varsayıyor.
  await withBypass("test: puan verme", (db) =>
    puanYaz(db, {
      playerId: oyuncuId,
      cafeId: kafeA,
      taban: 900,
      carpan: 1,
      sebep: "test",
      kanitSeviyesi: 2,
    }),
  );

  /**
   * Çark tavanını en üste çekiyoruz.
   *
   * Bu dosya kuponu `carkOduluVer` ile üretiyor ve o fonksiyon, çarkın
   * üst sınırının üstündeki ödülleri reddediyor (Ü49). Varsayılan tavan
   * 35 TL; testlerin 40 ve 50 TL'lik ödülleri onun üstünde kalıyor.
   * Sınanan şey tavan değil (o `tests/cark.test.ts` içinde) — bütçe,
   * kanıt kademesi ve erteleme.
   */
  await ayar.sayiYaz({
    cafeId: kafeA,
    anahtar: ayar.ANAHTARLAR.carkUstSinir,
    deger: 50_00,
    aktorId: kasiyerA,
  });

  /**
   * Erteleme eşiği TAVANA çekiliyor: hiçbir ödül ertelenmiyor.
   *
   * İki sebep. Birincisi, kasa testlerinin çoğu kuponun **aktif** olmasını
   * bekliyor; ertelenen kupon `pending` kalıyor ve kasiyer onaylayamıyor.
   * İkincisi, demo kafesinde `cafe_config` satırı kalmış olabiliyor ve
   * testler varsayılana güvenemez — bir tur tam olarak bu yüzden kırıldı,
   * kod değişmeden, veritabanında duran eski bir ayardan.
   *
   * Ertelemeyi sınayan testler eşiği kendileri indiriyor ve geri
   * yükseltiyor.
   */
  await ayar.sayiYaz({
    cafeId: kafeA,
    anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
    deger: 50_00,
    aktorId: kasiyerA,
  });
});

after(async () => {
  await yoneticiSorgu(`DELETE FROM coupon_events WHERE cafe_id = ANY($1)`, [[kafeA, kafeB]]);
  await yoneticiSorgu(
    `DELETE FROM coupons WHERE player_id = $1 OR reward_id IN
       (SELECT id FROM rewards WHERE title LIKE 'KTEST %')`,
    [oyuncuId],
  );
  await yoneticiSorgu(`DELETE FROM budget_ledger WHERE cafe_id = $1`, [kafeA]);
  await yoneticiSorgu(`DELETE FROM rewards WHERE title LIKE 'KTEST %'`);
  await yoneticiSorgu(`DELETE FROM points_ledger WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM xp_ledger WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM player_badges WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM play_sessions WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM table_sessions WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [oyuncuId]);
  await closePools();
});

/**
 * Kafenin **açık** olduğu bir an (Ü90).
 *
 * ⚠️ Ü90'dan beri kafe kapalıyken hiçbir ödül dağıtılmıyor ve tempo (Ü87)
 * gün içinde kademeli açılıyor. İkisi de duvar saatine bakıyor, yani kupon
 * üreten her test **saate mahkûm** olmuştu: gece koşan CI hiçbir kupon
 * üretemiyor ve konusu bütçe ya da kanıt kademesi olan testler sebepsiz
 * düşüyordu. Konusu saat olan testler kendi anlarını veriyor.
 */
const KAFE_ACIK = new Date("2026-09-02T20:00:00+03:00");

/**
 * Bir kupon üretir ve kimliğini döner.
 *
 * Ü52'ye kadar `katalogdanAl` kullanılıyordu; puanla satın alma kalkınca
 * o fonksiyon silindi. Yerine çark yolu geçti — **aynı `kuponUret`**
 * gövdesinden geçiyor: bütçe rezervi, kanıt kademesi, erteleme eşiği ve
 * denetim izi, bu testlerin sınadığı şeylerin hepsi orada.
 *
 * `ilkCevirme: true` — 24 saatlik çark kilidi bu testlerin konusu değil;
 * o kilit `tests/cark.test.ts` içinde ayrıca sınanıyor.
 */
async function kuponAl(odulId: string) {
  const s = await kupon.carkOduluVer({
    playerId: oyuncuId,
    cafeId: kafeA,
    odulId,
    kanitSeviyesi: 4,
    ilkCevirme: true,
    an: KAFE_ACIK,
  });
  assert.ok(s.ok, s.ok === false ? s.hata : "");
  return s.ok ? s : null!;
}

/* ═══════════════════════════════════════════════════════════
   1 · Kupon üretimi
   ═══════════════════════════════════════════════════════════ */

describe("kupon üretimi", () => {
  test("katalogdan alınan kupon bütçeden rezerve eder", async () => {
    const once = await butce.durum(kafeA, bugun);
    await kuponAl(katalogOdulId);
    const sonra = await butce.durum(kafeA, bugun);

    assert.equal(sonra.rezerveKurus, once.rezerveKurus + 25_00);
    assert.equal(sonra.dagitilabilirKurus, once.dagitilabilirKurus - 25_00);
  });

  test("eşiğin üstündeki ödül ertelenir (Ü28, süre Ü97'de 12 saate indi)", async () => {
    // Eşiği tabana indir: 50 TL'lik ödül artık üstünde kalıyor.
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 25_00,
      aktorId: kasiyerA,
    });

    const s = await kuponAl(buyukOdulId);
    assert.equal(s.ertelendi, true, "büyük ödül hemen aktif oldu");

    const detay = await kuponDetayi(oyuncuId, s.kuponId);
    assert.equal(detay?.durum, "beklemede");

    // Sabit süre: takvim gününe değil oyuncunun kendi saatine bağlı. "Yarın
    // 00:00" olsaydı sabah kazanan 15 saat, akşam kazanan 1 saat beklerdi.
    //
    // ⚠️ Süre SABİTTEN okunuyor. Önceki hâli 24'ü elle yazıyordu ve Ü97'de
    // süre 12'ye inince test kırıldı — sınanan şey sürenin kaç olduğu değil,
    // ertelemenin **sabit ve saate bağlı** olması.
    const saat = (detay!.aktiflesme.getTime() - Date.now()) / 3_600_000;
    assert.ok(
      saat > kupon.ERTELEME_SAAT - 0.5 && saat <= kupon.ERTELEME_SAAT,
      `açılma ${kupon.ERTELEME_SAAT} saat sonra olmalıydı (${saat.toFixed(1)} sa)`,
    );

    // Eşiği kurulum değerine geri çek: bırakılsaydı sonraki testlerin
    // kuponları da ertelenir ve kasiyer onaylayamazdı. Bir tur böyle
    // kırıldı — testin kendisi değil, ondan SONRAKİLER.
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 50_00,
      aktorId: kasiyerA,
    });
  });

  test("🔴 aktivasyon saati kafenin ayarı — kupona geçiyor (Ü129)", async () => {
    // Süre `kupon.ts`te `ERTELEME_SAAT = 12` diye SABİT yazılıydı ve iki kez
    // kod değiştirilerek ayarlanmıştı (Ü28: 24, Ü97: 12). Ü129 onu kafeye
    // verdi; bu test ayarın gerçekten kupona geçtiğini çiviliyor — panelde
    // yazan sayı ile kuponun açılma anı ayrışırsa kafe "6 yazdım, hâlâ 12
    // saat sonra açılıyor" der ve sayıya bir daha güvenmez.
    const AYARLANAN = 6;

    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 25_00,
      aktorId: kasiyerA,
    });
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeSaati,
      deger: AYARLANAN,
      aktorId: kasiyerA,
    });

    const s = await kuponAl(buyukOdulId);
    assert.equal(s.ertelendi, true, "büyük ödül hemen aktif oldu");

    const detay = await kuponDetayi(oyuncuId, s.kuponId);
    const saat = (detay!.aktiflesme.getTime() - Date.now()) / 3_600_000;
    assert.ok(
      saat > AYARLANAN - 0.5 && saat <= AYARLANAN,
      `açılma ${AYARLANAN} saat sonra olmalıydı (${saat.toFixed(1)} sa)`,
    );
    assert.ok(
      saat < kupon.ERTELEME_SAAT - 0.5,
      "ayar yok sayılıp sabit süre kullanılmış",
    );

    // ⚠️ Son kullanma da kaymalı: kupon 7 gün geçerli ve sayaç AÇILMA
    // anından değil veriliş anından işliyor. Kaymasaydı erteleme süresi
    // kadar kısa ömürlü bir kupon doğardı.
    const omur = (detay!.sonKullanim.getTime() - detay!.aktiflesme.getTime()) / 86_400_000;
    assert.ok(omur > kupon.GECERLILIK_GUN - 0.5, "ertelenen kuponun ömrü kısalmış");

    // Kurulum değerlerine geri dön — sonraki testler bunlara güveniyor.
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeSaati,
      deger: kupon.ERTELEME_SAAT,
      aktorId: kasiyerA,
    });
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 50_00,
      aktorId: kasiyerA,
    });
  });

  test("eşiğin altındaki ödül hemen aktif olur", async () => {
    const s = await kuponAl(katalogOdulId);
    assert.equal(s.ertelendi, false);

    const detay = await kuponDetayi(oyuncuId, s.kuponId);
    assert.equal(detay?.durum, "kullanilabilir");
  });

  /**
   * Eşik platform sabiti değil kafenin ayarı: 50 TL bir kafede büyük ödül,
   * başkasında sıradan. E6'nın kanıt kademesi bundan etkilenmiyor — o
   * ayrı bir kural ve `katalog.kanitSeviyesi` içinde duruyor.
   */
  /**
   * Ü52 sonrası eşik aralığı 25-50 TL (ödül aralığıyla aynı). "Eşiği
   * sıfıra çek, her ödül ertelensin" senaryosu artık kurulamıyor: en
   * küçük eşik en küçük ödüle eşit ve `tutar > esik` olduğu için 25 TL
   * hiçbir ayarla ertelenmiyor. Sınanan şey aynı kaldı — eşiği
   * oynatınca davranış değişiyor mu.
   */
  test("kafe eşiği değiştirince erteleme davranışı değişiyor", async () => {
    const varsayilan = await ayar.sayiOku(kafeA, ayar.ANAHTARLAR.ertelemeEsigi);
    assert.equal(varsayilan, 50_00, "kurulumda yazılan eşik 50 TL olmalı");

    // Eşiği tabana çek: üstündeki her ödül ertelenmeli
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 25_00,
      aktorId: kasiyerA,
    });
    assert.equal(
      (await kuponAl(buyukOdulId)).ertelendi,
      true,
      "eşik tabandayken 50 TL'lik ödül ertelenmeli",
    );

    // Eşiği tavana çek: artık büyük ödül de ertelenmemeli
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 50_00,
      aktorId: kasiyerA,
    });
    assert.equal((await kuponAl(buyukOdulId)).ertelendi, false, "eşik yüksekken erteleme olmamalı");

    // Kanıt kademesi ayardan ETKİLENMİYOR — platform kuralı
    assert.equal(katalog.kanitSeviyesi(60_00), 4, "51 TL+ hâlâ K4 istemeli");
    assert.equal(katalog.kanitSeviyesi(25_00), 2);

    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 50_00,
      aktorId: kasiyerA,
    });
  });

  /*
   * "Puan yetmezse kupon çıkmaz" testi Ü52 ile kalktı: puanla ödül alma
   * yolu silindi, sınanacak bir yetmezlik kalmadı. Yerini alan güvence,
   * ödülün ancak oyun sonunda (günde bir) ya da çarkta (24 saatte bir)
   * düşmesi — ikisi de kendi testlerinde.
   */

  test("kanıt seviyesi yetmezse ödül verilmez (E6)", async () => {
    // Büyük tatlı 50 TL → K3 istiyor (Ü52 bantları). K2 ile alınamamalı.
    const s = await kupon.carkOduluVer({
      playerId: oyuncuId,
      cafeId: kafeA,
      odulId: buyukOdulId,
      kanitSeviyesi: 2,
      ilkCevirme: true,
    });
    assert.equal(s.ok, false);
    assert.match(s.ok === false ? s.hata : "", /doğrulama/i);
  });

  test("bütçe yetmezse kupon çıkmaz — E10", async () => {
    const d = await butce.durum(kafeA, bugun);

    // Kalan bütçeyi doldur.
    await withCafe(kafeA, (db) =>
      butce.rezerveEt(db, {
        cafeId: kafeA,
        kurus: d.dagitilabilirKurus,
        not: "test-doldur",
        gun: bugun,
        // Ü87: tempo penceresi kapalıyken bu rezervasyon reddedilir ve
        // test "bütçe doldu" durumunu hiç kuramaz.
        an: new Date("2026-09-02T23:00:00+03:00"),
      }),
    );

    const s = await kupon.carkOduluVer({
      playerId: oyuncuId,
      cafeId: kafeA,
      odulId: katalogOdulId,
      kanitSeviyesi: 4,
      ilkCevirme: true,
      an: KAFE_ACIK,
    });
    assert.equal(s.ok, false, "bütçe dolu iken kupon üretildi");
    assert.match(s.ok === false ? s.hata : "", /bütçe/i);

    const sonra = await butce.durum(kafeA, bugun);
    assert.ok(sonra.dagitilabilirKurus >= 0, "bütçe negatife düştü");

    // Bütçeyi geri aç.
    await yoneticiSorgu(`DELETE FROM budget_ledger WHERE note = 'test-doldur'`);
  });
});

/**
 * Anlık ödül düşene kadar dener.
 *
 * ⚠️ Ü77'den beri ödül **şansa** bağlı ve tek çağrının düşeceği garanti
 * değil. Konusu şans olmayan testler (pencere etiketi, günlük sınır, bütçe
 * rezervi…) düşene kadar denemeli; aksi hâlde onda bir koşuda kırılırlar ve
 * kırılgan bir test olmayandan kötüdür. Şansın kendisi ayrı sınanıyor.
 *
 * Yalnızca `null` dönüşünde tekrar deniyor: `{ ok: false }` gerçek bir ret
 * (bütçe, kanıt kademesi) ve tekrar denemek onu değiştirmez.
 */
async function odulDus(playerId: string, cafeId: string) {
  for (let i = 0; i < 40; i++) {
    const s = await withBypass("test: anlık ödül", (db) =>
      kupon.anlikOdulVer(db, {
        playerId,
        cafeId,
        kanitSeviyesi: 4,
        skor: 9999,
        oyunId: "blok",
        an: KAFE_ACIK,
      }),
    );
    if (s !== null) return s;
  }
  throw new Error("anlık ödül kırk denemede düşmedi — motor bozuk olabilir");
}

/* ═══════════════════════════════════════════════════════════
   1.5 · Ödül motoru (Ü77) — şans, skor ağırlığı, azalan getiri
   ═══════════════════════════════════════════════════════════ */

describe("ödül motoru (Ü77)", () => {
  /**
   * ⚠️ Ü27'nin "döngüsel sıra" testi buradaydı ve **kaldırıldı**: sıradaki
   * ödülü vermek Ü77 ile bitti. Onun yerine motorun üç girdisi ayrı ayrı
   * sınanıyor.
   *
   * Motor rastgele; bu yüzden testler tek bir çağrının sonucuna değil
   * **dağılıma** bakıyor. Örneklem büyük tutuldu ki eşikler dar olmasın —
   * kırılgan bir test, olmayan bir testten kötüdür.
   */

  test("yüksek skor ödül düşme şansını artırıyor", () => {
    const dusuk = motor.dusmeSansi(500, 0);
    const yuksek = motor.dusmeSansi(2500, 0);

    assert.ok(dusuk > 0 && dusuk < 1, `eşikteki şans aralık dışı: ${dusuk}`);
    assert.ok(yuksek > dusuk, "yüksek skor şansı artırmıyor");
    assert.ok(yuksek < 1, "şans garantiye dönüşmüş — şans şans kalmalı");
  });

  test("aynı oyundan gelen kazanımlar şansı kısıyor", () => {
    const temiz = motor.dusmeSansi(2500, 0);
    const bir = motor.dusmeSansi(2500, 1);
    const uc = motor.dusmeSansi(2500, 3);

    assert.ok(bir < temiz, "ilk kazanımdan sonra şans azalmıyor");
    assert.ok(uc < bir, "kazanım arttıkça şans azalmıyor");
    assert.ok(uc > 0, "şans sıfıra inmiş — oyuncu sevdiği oyunu oynayabilmeli");
  });

  test("yüksek skor pahalı ödülü gerçekten yakınlaştırıyor", () => {
    // Beş ödül, en pahalısı sonuncu. Düşük skorda listenin ucu neredeyse
    // hiç çıkmamalı; yüksek skorda belirgin biçimde artmalı.
    const degerler = [25_00, 30_00, 35_00, 40_00, 50_00];
    const TUR = 4000;

    const sayEnPahali = (skor: number) => {
      const taban = motor.agirlikTabani(skor, 0);
      let n = 0;
      for (let i = 0; i < TUR; i++) {
        if (motor.agirlikliSec(degerler, taban) === degerler.length - 1) n++;
      }
      return n / TUR;
    };

    const dusuk = sayEnPahali(500);
    const yuksek = sayEnPahali(2500);

    assert.ok(dusuk < 0.06, `düşük skorda en pahalı ödül çok sık: %${(dusuk * 100).toFixed(1)}`);
    assert.ok(
      yuksek > dusuk * 1.4,
      `yüksek skor pahalıyı yakınlaştırmıyor: %${(dusuk * 100).toFixed(1)} → %${(yuksek * 100).toFixed(1)}`,
    );

    // ⚠️ Ve **yakınlaştırma sınırlı kalmalı**: ürün sahibi düzleşmeyi
    // kıstırdı çünkü sık düşen pahalı ödül kafenin günlük bütçesini
    // yönetilemez yapıyor. Beş ödüllü listede en pahalısı onda birin
    // altında kalıyor; on ödüllü gerçek katalogda ~%1.
    assert.ok(
      yuksek < 0.12,
      `yüksek skorda en pahalı ödül çok sık: %${(yuksek * 100).toFixed(1)} — bütçe dalgalanır`,
    );
  });

  test("ucuz ödül her koşulda en olası kalıyor", () => {
    // Motor pahalıyı yakınlaştırıyor ama sıralamayı ters çevirmiyor:
    // en yüksek skorda bile en ucuz ödül en olası olan. Aksi hâlde kafenin
    // bütçesi tek turda erirdi.
    const degerler = [25_00, 30_00, 35_00, 40_00, 50_00];
    const taban = motor.agirlikTabani(9999, 0);
    const sayac = new Array(degerler.length).fill(0);
    for (let i = 0; i < 4000; i++) sayac[motor.agirlikliSec(degerler, taban)]++;

    assert.ok(
      sayac[0] > sayac[degerler.length - 1],
      `en ucuz en olası değil: ${sayac.join(", ")}`,
    );
  });

  test("tek ödülü olan kafede seçim hep onu buluyor", () => {
    assert.equal(motor.agirlikliSec([30_00], motor.agirlikTabani(1000, 0)), 0);
  });

  test("ödülü olmayan kafede motor sessizce geri dönüyor", () => {
    const k = motor.karar({ skor: 2500, sonKazanim: 0, kurusDegerleri: [] });
    assert.equal(k.dusuyor, false);
    assert.equal(k.dusuyor === false && k.sebep, "odul_yok");
  });

  test("kupon hangi oyundan çıktığını taşıyor (Ü88)", async () => {
    // Ü88 öncesinde `kaynakId` alınıyor ama hiçbir yere yazılmıyordu.
    // Azalan getiri hesabı (Ü77) tam olarak bu bağdan geçiyor: bağ
    // yazılmazsa "bu oyuncu bu oyundan ne kazandı" sorusu cevapsız kalır
    // ve motorun üçüncü girdisi sessizce sıfır olur.
    const p = (
      await kaydet({
        telefon: yeniTelefon(),
        eposta: benzersizEposta(),
        ad: "Bag",
        soyad: "Testi",
        dogumYili: 1990,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;

    const oturumId = `ps_test_${randomInt(1_000_000)}`;
    await yoneticiSorgu(
      `INSERT INTO play_sessions
         (id, cafe_id, player_id, device_id_hash, game_id, seed, business_date, status)
       VALUES ($1,$2,$3,$4,'blok','tohum',$5,'completed')`,
      [oturumId, kafeA, p, Buffer.from("test-cihaz-motor"), bugun],
    );

    let sonuc = null;
    for (let i = 0; i < 40 && sonuc === null; i++) {
      sonuc = await withBypass("test: oyun bağı", (db) =>
        kupon.anlikOdulVer(db, {
          playerId: p,
          cafeId: kafeA,
          kanitSeviyesi: 4,
          skor: 9999,
          oyunId: "blok",
          kaynakId: oturumId,
          an: KAFE_ACIK,
        }),
      );
    }
    assert.ok(sonuc?.ok, "ödül düşmedi");

    const satir = await withBypass("test: bağ okuma", (db) =>
      db.one<{ play_session_id: string | null }>(
        `SELECT play_session_id FROM coupons WHERE id = $1`,
        [sonuc.kuponId],
      ),
    );
    assert.equal(satir?.play_session_id, oturumId, "kupon oyun oturumuna bağlanmadı");

    await yoneticiSorgu(
      `DELETE FROM coupon_events WHERE coupon_id IN (SELECT id FROM coupons WHERE player_id = $1)`,
      [p],
    );
    await yoneticiSorgu(`DELETE FROM coupons WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM play_sessions WHERE id = $1`, [oturumId]);
    await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [p]);
  });

  test("ödül her zaman düşmüyor — şans gerçekten çalışıyor", async () => {
    // Uçtan uca: eşiği yeni geçmiş skorla art arda oyuncular. Şans ~%55
    // olduğu için yirmi oyuncunun hepsinin ödül alması ya da hiçbirinin
    // alamaması pratikte imkânsız.
    const oyuncular: string[] = [];
    let dusen = 0;

    for (let i = 0; i < 20; i++) {
      const p = (
        await kaydet({
          telefon: yeniTelefon(),
          eposta: benzersizEposta(),
          ad: "Motor",
          soyad: "Testi",
          dogumYili: 1990,
          pazarlamaIzni: false,
        })
      ).oyuncu.id;
      oyuncular.push(p);

      const s = await withBypass("test: motor", (db) =>
        kupon.anlikOdulVer(db, {
          playerId: p,
          cafeId: kafeA,
          kanitSeviyesi: 4,
          skor: 500,
          oyunId: "blok",
          an: KAFE_ACIK,
        }),
      );
      if (s?.ok) dusen++;
    }

    assert.ok(dusen > 0, "yirmi oyuncunun hiçbirine ödül düşmedi");
    assert.ok(dusen < 20, "yirmi oyuncunun hepsine düştü — şans hiç işlemiyor");

    for (const p of oyuncular) {
      await yoneticiSorgu(
        `DELETE FROM coupon_events WHERE coupon_id IN (SELECT id FROM coupons WHERE player_id = $1)`,
        [p],
      );
      await yoneticiSorgu(`DELETE FROM coupons WHERE player_id = $1`, [p]);
      await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [p]);
      await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [p]);
      await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [p]);
    }
  });

  test("aynı oyuncu günde iki anlık ödül alamaz", async () => {
    const p = (
      await kaydet({
        telefon: yeniTelefon(),
        eposta: benzersizEposta(),
        ad: "Tekrar",
        soyad: "Testi",
        dogumYili: 1990,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;

    const ilk = await odulDus(p, kafeA);
    assert.ok(ilk?.ok);

    const ikinci = await withBypass("test: ikinci anlık ödül", (db) =>
      kupon.anlikOdulVer(db, {
        playerId: p,
        cafeId: kafeA,
        kanitSeviyesi: 4,
        skor: 9999,
        oyunId: "blok",
        an: KAFE_ACIK,
      }),
    );
    assert.equal(ikinci, null, "aynı gün ikinci anlık ödül verildi");

    await yoneticiSorgu(
      `DELETE FROM coupon_events WHERE coupon_id IN (SELECT id FROM coupons WHERE player_id = $1)`,
      [p],
    );
    await yoneticiSorgu(`DELETE FROM coupons WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [p]);
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · E9 — oyuncu ekranında TL yok
   ═══════════════════════════════════════════════════════════ */

describe("oyuncu kuponu TL değeri taşımaz (E9)", () => {
  test("kupon detayında para alanı yok", async () => {
    const s = await kuponAl(katalogOdulId);
    const detay = await kuponDetayi(oyuncuId, s.kuponId);
    assert.ok(detay);

    for (const alan of Object.keys(detay)) {
      assert.ok(
        !/kurus|tutar|deger|fiyat|price|amount/i.test(alan),
        `kupon detayında para alanı var: ${alan}`,
      );
    }
  });

  test("başkasının kuponu okunamaz", async () => {
    const s = await kuponAl(katalogOdulId);
    const baskasi = await kuponDetayi("oyuncu_baska", s.kuponId);
    assert.equal(baskasi, null);
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Kasiyer çözümlemesi
   ═══════════════════════════════════════════════════════════ */

describe("kasiyer kuponu çözer", () => {
  test("QR jetonu ve 6 haneli kod aynı kuponu açar (Ü19)", async () => {
    const s = await kuponAl(katalogOdulId);
    const detay = await kuponDetayi(oyuncuId, s.kuponId);
    assert.ok(detay);

    const jetonla = await kupon.coz(kafeA, detay.jeton);
    const kodla = await kupon.coz(kafeA, detay.kod);

    assert.ok(jetonla.bulundu && kodla.bulundu);
    assert.equal(jetonla.kuponId, kodla.kuponId, "iki yol farklı kupon açtı");
    assert.equal(jetonla.kuponId, s.kuponId);
  });

  test("kasiyer TL değerini GÖRÜR", async () => {
    const s = await kuponAl(katalogOdulId);
    const g = await kupon.coz(kafeA, s.kod);
    assert.ok(g.bulundu);
    assert.equal(g.tutarKurus, 25_00);
    assert.equal(g.gecerli, true);
  });

  test("başka kafenin kuponu bulunamaz", async () => {
    const s = await kuponAl(katalogOdulId);
    const g = await kupon.coz(kafeB, s.kod);
    assert.equal(g.bulundu, false, "kafe B, kafe A'nın kuponunu gördü");
  });

  test("ertelenmiş kupon geçersiz döner ve sebebi söylenir", async () => {
    // Eşiği tabana indir ki 50 TL'lik ödül ertelensin; kurulumda eşik
    // tavanda (hiçbir ödül ertelenmiyor) çünkü kasa testlerinin çoğu
    // aktif kupon bekliyor.
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 25_00,
      aktorId: kasiyerA,
    });
    const s = await kuponAl(buyukOdulId);
    const g = await kupon.coz(kafeA, s.kod);
    assert.ok(g.bulundu);
    assert.equal(g.gecerli, false);
    assert.match(g.sebep ?? "", /açılıyor/);

    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 50_00,
      aktorId: kasiyerA,
    });
  });

  test("kafe kodu, müşterinin anonim kodunu gösterir — ad soyad değil (G1)", async () => {
    const s = await kuponAl(katalogOdulId);
    const g = await kupon.coz(kafeA, s.kod);
    assert.ok(g.bulundu);
    assert.match(g.oyuncuKodu, /^P-/, `anonim kod beklenirken: ${g.oyuncuKodu}`);
  });
});

/* ═══════════════════════════════════════════════════════════
   4 · Onay — atomiklik
   ═══════════════════════════════════════════════════════════ */

describe("onay atomik (Faz 7 güvenlik kapısı)", () => {
  test("onay bütçeden kalıcı düşer", async () => {
    const s = await kuponAl(katalogOdulId);
    const once = await butce.durum(kafeA, bugun);

    const sonuc = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.ok(sonuc.ok, sonuc.ok === false ? sonuc.hata : "");
    assert.equal(sonuc.dusulenKurus, 25_00);

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(sonra.harcananKurus, once.harcananKurus + 25_00);
    assert.equal(sonra.rezerveKurus, once.rezerveKurus - 25_00);
  });

  test("aynı kupon iki kez onaylanamaz", async () => {
    const s = await kuponAl(katalogOdulId);

    const ilk = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.ok(ilk.ok);

    const ikinci = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(ikinci.ok, false, "aynı kupon ikinci kez onaylandı");
  });

  test("EŞZAMANLI iki onay isteğinde yalnızca biri geçer", async () => {
    const s = await kuponAl(katalogOdulId);
    const once = await butce.durum(kafeA, bugun);

    // İki telefon aynı anda okutuyor.
    const [a, b] = await Promise.all([
      kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA }),
      kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA }),
    ]);

    const basarili = [a, b].filter((x) => x.ok).length;
    assert.equal(basarili, 1, `eşzamanlı onayda ${basarili} istek geçti`);

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(
      sonra.harcananKurus,
      once.harcananKurus + 25_00,
      "bütçeden iki kez düşüldü",
    );
  });

  test("aynı kupon QR'dan ve koddan aynı anda gelirse yalnızca biri geçer (Ü19)", async () => {
    const s = await kuponAl(katalogOdulId);
    const detay = await kuponDetayi(oyuncuId, s.kuponId);
    assert.ok(detay);

    // İki farklı yol, aynı kupon.
    const [jetonla, kodla] = await Promise.all([
      kupon.coz(kafeA, detay.jeton).then((g) =>
        g.bulundu
          ? kupon.onayla({ cafeId: kafeA, kuponId: g.kuponId, staffId: kasiyerA })
          : { ok: false as const, hata: "bulunamadı" },
      ),
      kupon.coz(kafeA, detay.kod).then((g) =>
        g.bulundu
          ? kupon.onayla({ cafeId: kafeA, kuponId: g.kuponId, staffId: kasiyerA })
          : { ok: false as const, hata: "bulunamadı" },
      ),
    ]);

    assert.equal([jetonla, kodla].filter((x) => x.ok).length, 1, "iki yol da geçti");
  });

  test("başka kafenin kasiyeri onaylayamaz", async () => {
    const s = await kuponAl(katalogOdulId);
    const sonuc = await kupon.onayla({ cafeId: kafeB, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(sonuc.ok, false, "kafe B, kafe A'nın kuponunu onayladı");

    // Kupon hâlâ kullanılabilir olmalı.
    const g = await kupon.coz(kafeA, s.kod);
    assert.ok(g.bulundu && g.gecerli);
  });

  test("ertelenmiş kupon onaylanamaz", async () => {
    // Eşiği tabana indir ki 50 TL'lik ödül ertelensin; kurulumda eşik
    // tavanda (hiçbir ödül ertelenmiyor) çünkü kasa testlerinin çoğu
    // aktif kupon bekliyor.
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 25_00,
      aktorId: kasiyerA,
    });
    const s = await kuponAl(buyukOdulId);
    const sonuc = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(sonuc.ok, false);

    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 50_00,
      aktorId: kasiyerA,
    });
  });

  test("onaylayan personel kayda geçer — kupon oyuncu tarafından kapatılamaz (A4)", async () => {
    const s = await kuponAl(katalogOdulId);
    await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });

    const satir = await withBypass("test: onaylayan", (db) =>
      db.one<{ redeemed_by_staff_id: string | null }>(
        `SELECT redeemed_by_staff_id FROM coupons WHERE id = $1`,
        [s.kuponId],
      ),
    );
    assert.equal(satir?.redeemed_by_staff_id, kasiyerA);
  });
});

/* ═══════════════════════════════════════════════════════════
   5 · Yüzdeli kupon — tutar kayıttan (Ü17)
   ═══════════════════════════════════════════════════════════ */

describe("yüzdeli kuponda tutar kayıttan sınırlanır (Ü17)", () => {
  test("gerçekleşen tutar tavandan küçükse fark bütçeye döner", async () => {
    const s = await kuponAl(yuzdeOdulId);
    const once = await butce.durum(kafeA, bugun);

    // Tavan 40 TL, adisyondaki indirim 25 TL.
    const sonuc = await kupon.onayla({
      cafeId: kafeA,
      kuponId: s.kuponId,
      staffId: kasiyerA,
      gerceklesenKurus: 25_00,
    });
    assert.ok(sonuc.ok);
    assert.equal(sonuc.dusulenKurus, 25_00);

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(sonra.harcananKurus, once.harcananKurus + 25_00);
    // Rezerve edilen 40 TL'nin tamamı çözülmeli: 25 TL harcandı, 15 TL iade.
    assert.equal(sonra.rezerveKurus, once.rezerveKurus - 40_00);
    assert.equal(sonra.iadeKurus, once.iadeKurus + 15_00);
  });

  test("tavanın üstünde tutar iddiası tavana kırpılır", async () => {
    const s = await kuponAl(yuzdeOdulId);

    // Kasiyer 500 TL girmeye çalışıyor; tavan 40 TL.
    const sonuc = await kupon.onayla({
      cafeId: kafeA,
      kuponId: s.kuponId,
      staffId: kasiyerA,
      gerceklesenKurus: 50_000,
    });
    assert.ok(sonuc.ok);
    assert.equal(sonuc.dusulenKurus, 40_00, "tavanın üstü kabul edildi");
  });

  test("ürün ödülünde girilen tutar dikkate alınmaz — değer kayıttan gelir", async () => {
    const s = await kuponAl(katalogOdulId);

    const sonuc = await kupon.onayla({
      cafeId: kafeA,
      kuponId: s.kuponId,
      staffId: kasiyerA,
      gerceklesenKurus: 99_999,
    });
    assert.ok(sonuc.ok);
    assert.equal(sonuc.dusulenKurus, 25_00, "ürün ödülünde istemci tutarı kullanıldı");
  });
});

/* ═══════════════════════════════════════════════════════════
   6 · Geri alma ve süre dolumu
   ═══════════════════════════════════════════════════════════ */

describe("geri alma ve süre dolumu (E11)", () => {
  test("60 saniye içinde geri alma bütçeyi tam iade eder", async () => {
    const s = await kuponAl(katalogOdulId);
    const baslangic = await butce.durum(kafeA, bugun);

    await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    const geri = await kupon.geriAl({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.ok(geri.ok, geri.ok === false ? geri.hata : "");

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(sonra.harcananKurus, baslangic.harcananKurus, "harcama iptal edilmedi");
    assert.equal(
      sonra.dagitilabilirKurus,
      baslangic.dagitilabilirKurus + 25_00,
      "rezervasyon çözülmedi — kupon üretiminde bağlanan tutar geri dönmeliydi",
    );
  });

  test("geri alma süresi dolduysa reddedilir", async () => {
    const s = await kuponAl(katalogOdulId);
    await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });

    // Süreyi geçmişe çek.
    await yoneticiSorgu(
      `UPDATE coupons SET undo_deadline_at = now() - interval '1 minute' WHERE id = $1`,
      [s.kuponId],
    );

    const geri = await kupon.geriAl({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(geri.ok, false);
    assert.match(geri.ok === false ? geri.hata : "", /süre/i);
  });

  test("geri alınan kupon yeniden onaylanamaz", async () => {
    const s = await kuponAl(katalogOdulId);
    await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    await kupon.geriAl({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });

    const tekrar = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(tekrar.ok, false);
  });

  test("süresi dolan kupon rezervasyonu bütçeye iade eder", async () => {
    const s = await kuponAl(katalogOdulId);
    const once = await butce.durum(kafeA, bugun);

    // `coupons_check4` son kullanımın veriliş tarihinden sonra olmasını
    // istiyor — kısıt haklı. Kuponu bütünüyle geçmişe taşıyoruz.
    await yoneticiSorgu(
      `UPDATE coupons SET issued_at = now() - interval '10 days',
                          activates_at = now() - interval '10 days',
                          expires_at = now() - interval '1 day'
        WHERE id = $1`,
      [s.kuponId],
    );

    const adet = await kupon.sureDolanlariSupur();
    assert.ok(adet >= 1);

    const sonra = await butce.durum(kafeA, bugun);
    assert.equal(
      sonra.dagitilabilirKurus,
      once.dagitilabilirKurus + 25_00,
      "süresi dolan kuponun tutarı bütçeye dönmedi",
    );
  });

  test("süresi dolan kupon onaylanamaz", async () => {
    const s = await kuponAl(katalogOdulId);
    await yoneticiSorgu(
      `UPDATE coupons SET issued_at = now() - interval '10 days',
                          activates_at = now() - interval '10 days',
                          expires_at = now() - interval '1 day'
        WHERE id = $1`,
      [s.kuponId],
    );

    const sonuc = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(sonuc.ok, false);

    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 50_00,
      aktorId: kasiyerA,
    });
  });
});

/* ═══════════════════════════════════════════════════════════
   6b · Ertelenmiş kupon — bakım gecikse bile açılır (Ü28)
   ═══════════════════════════════════════════════════════════

   Gerçekleşen arıza: `bekleyenleriAc` yazılmıştı ama hiçbir yerden
   çağrılmıyordu. Satır sonsuza kadar `pending` kaldığı için hem oyuncunun
   ekranı "yarın açılıyor" demeye devam ediyor, hem de kasa kuponu
   reddediyordu. Ödül kazanılıyor ama asla kullanılamıyordu.

   Düzeltme: kuponun hâline **zaman** karar veriyor, `status` kolonu değil.
   ═══════════════════════════════════════════════════════════ */

describe("ertelenmiş kupon (Ü28)", () => {
  /** Açılma zamanı geçmiş ama süpürülmemiş kupon üretir. */
  async function gecmisteAcilanBekleyen() {
    const s = await kuponAl(katalogOdulId);
    await yoneticiSorgu(
      `UPDATE coupons SET status = 'pending',
                          issued_at = now() - interval '2 days',
                          activates_at = now() - interval '1 day'
        WHERE id = $1`,
      [s.kuponId],
    );
    return s;
  }

  test("bakım geç kalsa da kasa kuponu geçerli görür — REGRESYON", async () => {
    const s = await gecmisteAcilanBekleyen();

    const gorunum = await kupon.coz(kafeA, s.kod);
    assert.equal(gorunum.bulundu, true);
    assert.equal(
      gorunum.bulundu === true ? gorunum.gecerli : null,
      true,
      "açılma zamanı geçmiş kupon hâlâ 'yarın açılıyor' diyor",
    );
  });

  test("bakım geç kalsa da kupon onaylanabilir — REGRESYON", async () => {
    const s = await gecmisteAcilanBekleyen();

    const sonuc = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(sonuc.ok, true, "kazanılmış ödül kasada kullanılamıyor");
  });

  test("açılma zamanı GELMEMİŞ kupon hâlâ reddediliyor", async () => {
    const s = await kuponAl(katalogOdulId);
    await yoneticiSorgu(
      `UPDATE coupons SET status = 'pending', activates_at = now() + interval '1 day'
        WHERE id = $1`,
      [s.kuponId],
    );

    const gorunum = await kupon.coz(kafeA, s.kod);
    assert.equal(gorunum.bulundu === true ? gorunum.gecerli : null, false);

    const sonuc = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.equal(sonuc.ok, false, "erken kupon onaylandı — A5 kırıldı");
  });

  test("bakım çağrısı bekleyeni aktifleştiriyor", async () => {
    const s = await gecmisteAcilanBekleyen();

    await kupon.bekleyenleriAc();

    const satir = await withBypass("test: kupon durumu", (db) =>
      db.one<{ status: string }>(`SELECT status FROM coupons WHERE id = $1`, [s.kuponId]),
    );
    assert.equal(satir?.status, "active", "bakım kuponu açmadı");
  });
});

/* ═══════════════════════════════════════════════════════════
   7 · Defter ve izler
   ═══════════════════════════════════════════════════════════ */

describe("kupon defteri append-only", () => {
  test("her durum geçişi deftere düşer", async () => {
    const s = await kuponAl(katalogOdulId);
    await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    await kupon.geriAl({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });

    const olaylar = await withCafe(kafeA, (db) =>
      db.all<{ event: string }>(
        `SELECT event FROM coupon_events WHERE coupon_id = $1 ORDER BY created_at`,
        [s.kuponId],
      ),
    );

    assert.deepEqual(
      olaylar.map((o) => o.event),
      ["issued", "redeemed", "undone"],
      "kuponun hikâyesi eksik",
    );
  });

  test("defter satırı güncellenemez", async () => {
    await assert.rejects(
      withCafe(kafeA, (db) => db.query(`UPDATE coupon_events SET event = 'redeemed'`)),
      /permission denied/i,
    );
  });

  test("diğer kafe, bu kafenin kupon defterini göremez", async () => {
    // İddia "diğer kafenin hiç defteri yok" DEĞİL — o kafede gerçek kuponlar
    // olabilir. Mesele, BU testin ürettiği satırların oradan görünmemesi.
    const s = await kuponAl(katalogOdulId);

    const digerinde = await withCafe(kafeB, (db) =>
      db.all(`SELECT id FROM coupon_events WHERE coupon_id = $1`, [s.kuponId]),
    );
    assert.equal(digerinde.length, 0, "diğer kafe bu kuponun defterini gördü");

    const kendinde = await withCafe(kafeA, (db) =>
      db.all(`SELECT id FROM coupon_events WHERE coupon_id = $1`, [s.kuponId]),
    );
    assert.ok(kendinde.length > 0, "kafe kendi kupon defterini göremiyor");
  });
});

/* ═══════════════════════════════════════════════════════════
   8 · Ö3 · Happy Hour penceresinde ikinci ödül
   ═══════════════════════════════════════════════════════════

   Pencerede değişen tek şey: günlük "bir anlık ödül" sınırı bir kez daha
   açılıyor ve o ödülün maliyeti pencerenin havuzundan sayılıyor. Havuz
   bitince pencere kapanıyor — oyun oynanır, o pencereden ödül çıkmaz.
   ═══════════════════════════════════════════════════════════ */

describe("Happy Hour penceresi (Ö3)", () => {
  /** Şu an süren, verilen havuzlu bir pencere açar. */
  async function acikPencereYaz(havuzKurus: number) {
    const id = `hh_kupon_${randomInt(1_000_000)}`;
    await yoneticiSorgu(
      `INSERT INTO happy_hours (id, cafe_id, business_date, starts_at, ends_at, pool_kurus, created_by)
       VALUES ($1,$2,$3, now() - interval '10 minutes', now() + interval '110 minutes', $4, $5)`,
      [id, kafeA, bugun, havuzKurus, yoneticiA],
    );
    return id;
  }

  async function pencereleriSil() {
    await yoneticiSorgu(`UPDATE coupons SET happy_hour_id = NULL WHERE cafe_id = $1`, [kafeA]);
    await yoneticiSorgu(`DELETE FROM happy_hours WHERE cafe_id = $1`, [kafeA]);
  }

  async function yeniOyuncuId() {
    return (
      await kaydet({
        telefon: yeniTelefon(),
        eposta: benzersizEposta(),
        ad: "Havuz",
        soyad: "Testi",
        dogumYili: 1990,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;
  }

  test("pencere açıkken ikinci ödül düşüyor ve pencereye etiketleniyor", async () => {
    await pencereleriSil();
    const p = await yeniOyuncuId();

    // Pencere YOKKEN birinci ödül.
    const ilk = await odulDus(p, kafeA);
    assert.ok(ilk?.ok, "ilk ödül düşmedi");

    const hhId = await acikPencereYaz(100_000);

    const ikinci = await odulDus(p, kafeA);
    assert.ok(ikinci?.ok, "pencere açıkken ikinci ödül düşmedi");

    const etiket = await withBypass("test: etiket", (db) =>
      db.one<{ happy_hour_id: string | null }>(
        `SELECT happy_hour_id FROM coupons WHERE id = $1`,
        [ikinci.ok ? ikinci.kuponId : ""],
      ),
    );
    assert.equal(etiket?.happy_hour_id, hhId, "ikinci ödül pencereye etiketlenmedi");

    // Birinci ödül pencereye ait DEĞİL — havuzu eritmemeli.
    const ilkEtiket = await withBypass("test: ilk etiket", (db) =>
      db.one<{ happy_hour_id: string | null }>(
        `SELECT happy_hour_id FROM coupons WHERE id = $1`,
        [ilk.ok ? ilk.kuponId : ""],
      ),
    );
    assert.equal(ilkEtiket?.happy_hour_id, null, "normal günlük ödül havuzu eritti");

    await pencereleriSil();
  });

  test("pencerede üçüncü ödül yok — sınır 'günde bir + pencerede bir'", async () => {
    await pencereleriSil();
    const p = await yeniOyuncuId();
    await acikPencereYaz(100_000);

    const a = await odulDus(p, kafeA);
    const b = await odulDus(p, kafeA);
    const c = await withBypass("test: 3", (db) =>
      kupon.anlikOdulVer(db, {
        playerId: p,
        cafeId: kafeA,
        kanitSeviyesi: 4,
        skor: 9999,
        oyunId: "blok",
        an: KAFE_ACIK,
      }),
    );

    assert.ok(a?.ok && b?.ok, "iki ödül düşmeliydi");
    assert.equal(c, null, "pencerede üçüncü ödül düştü — sınır sınırsıza döndü");

    await pencereleriSil();
  });

  test("havuza sığmayan ödül verilmiyor — ekrandaki sayı yalan söylemez", async () => {
    await pencereleriSil();
    const p = await yeniOyuncuId();

    await odulDus(p, kafeA);

    // Havuz, en ucuz ödülden de küçük.
    await acikPencereYaz(1);

    const pencereden = await withBypass("test: pencere ödülü", (db) =>
      kupon.anlikOdulVer(db, {
        playerId: p,
        cafeId: kafeA,
        kanitSeviyesi: 4,
        skor: 9999,
        oyunId: "blok",
        an: KAFE_ACIK,
      }),
    );
    assert.equal(pencereden, null, "havuza sığmayan ödül verildi");

    await pencereleriSil();
  });

  test("pencere ödülü bütçeden normal şekilde rezerve ediliyor", async () => {
    // Havuz bir tavan, ayrı bir kese değil: kupon yine bütçeden düşüyor.
    await pencereleriSil();
    const p = await yeniOyuncuId();
    await odulDus(p, kafeA);
    await acikPencereYaz(100_000);

    const once = await butce.durum(kafeA, bugun);
    const s = await odulDus(p, kafeA);
    assert.ok(s?.ok);
    const sonra = await butce.durum(kafeA, bugun);

    assert.ok(
      sonra.rezerveKurus > once.rezerveKurus,
      "pencere ödülü bütçeden rezerve edilmedi — havuz kese gibi davranıyor",
    );

    await pencereleriSil();
  });
});

/* ═══════════════════════════════════════════════════════════
   Sabit tutarlı indirim ödülü (Ü18 yanına eklenen üçüncü tip)
   ═══════════════════════════════════════════════════════════ */

describe("tutar indirimi ödülü", () => {
  test("tutarın kendisi rezerve edilir ve kasada tamamı düşer", async () => {
    const once = await butce.durum(kafeA, bugun);
    const s = await kuponAl(tutarOdulId);
    const sonra = await butce.durum(kafeA, bugun);

    assert.equal(sonra.rezerveKurus, once.rezerveKurus + 40_00, "tutar kadar rezerve edilmeliydi");

    // Kasiyer tutar GİRMİYOR: yüzdelide gerçekleşen sorulur, sabit tutarda
    // gerçekleşen zaten tutarın kendisi.
    const onay = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
    assert.ok(onay.ok, onay.ok === false ? onay.hata : "");
    assert.equal(onay.ok && onay.dusulenKurus, 40_00);

    const bitti = await butce.durum(kafeA, bugun);
    assert.equal(bitti.harcananKurus, once.harcananKurus + 40_00);
    assert.equal(bitti.rezerveKurus, once.rezerveKurus, "rezervasyon harcamaya dönmeliydi");
  });

  /**
   * Bu ödül bir **bakiye değil** (Ü18). Kasiyerin girdiği tutar dikkate
   * alınmıyor: kupon tek kullanımlık ve tam tutarla kapanıyor. Kısmen
   * kullanılıp kalanı devretseydi saklanan değer aracı olurdu.
   */
  test("kasiyer daha düşük tutar girse bile tamamı düşer — bakiye değil", async () => {
    const s = await kuponAl(tutarOdulId);
    const onay = await kupon.onayla({
      cafeId: kafeA,
      kuponId: s.kuponId,
      staffId: kasiyerA,
      gerceklesenKurus: 500, // yok sayılmalı
    });
    assert.ok(onay.ok);
    assert.equal(onay.ok && onay.dusulenKurus, 40_00, "sabit tutarda kısmi kullanım yok");
  });

  test("kasa ekranı ödülü tutar indirimi olarak gösteriyor", async () => {
    const s = await kuponAl(tutarOdulId);
    const gorunum = await kupon.coz(kafeA, s.kod);
    assert.ok(gorunum.bulundu);
    assert.equal(gorunum.bulundu && gorunum.tip, "amount");
    assert.equal(gorunum.bulundu && gorunum.yuzde, null);
    assert.equal(gorunum.bulundu && gorunum.tutarKurus, 40_00);
  });

  test("tutar ödülünde oran verilemez", async () => {
    const sonuc = await katalog.ekle({
      cafeId: kafeA,
      tip: "amount",
      baslik: "KTEST Hatalı",
      maliyetKurus: 25_00,
      yuzde: 20,
      puanFiyati: 10,
      anlik: false,
      aktorId: yoneticiA,
    });
    assert.equal(sonuc.ok, false);
  });
});

/* ═══════════════════════════════════════════════════════════
   Açılma anı (Ü98)
   ═══════════════════════════════════════════════════════════ */

describe("açılma anı oyuncuya gösteriliyor (Ü98)", () => {
  test("bekleyen kupon açılınca 'yeni açılan' listesine giriyor", async () => {
    // Eşiği tabana indir ki büyük ödül ertelensin.
    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
      deger: 25_00,
      aktorId: kasiyerA,
    });

    try {
      const s = await kuponAl(buyukOdulId);
      assert.equal(s.ertelendi, true, "test kurulumu: ödül ertelenmedi");

      // Henüz açılmadı: ne kullanılabilirde ne yeni açılanda.
      const once = await envanter(oyuncuId);
      assert.ok(!once.yeniAcilan.some((k) => k.id === s.kuponId), "açılmadan kutlandı");
      assert.ok(once.bekleyen.some((k) => k.id === s.kuponId), "bekleyende değil");

      // Zamanı geldi.
      await yoneticiSorgu(
        `UPDATE coupons SET activates_at = now() - interval '1 minute' WHERE id = $1`,
        [s.kuponId],
      );
      await kupon.bekleyenleriAc();

      const sonra = await envanter(oyuncuId);
      assert.ok(
        sonra.yeniAcilan.some((k) => k.id === s.kuponId),
        "açılan kupon kutlanmadı — Ü97 'zamanı gelince' diyor, karşılığı burası",
      );
      // ⚠️ Alt küme: aynı kupon alışık olunan yerde de duruyor.
      assert.ok(
        sonra.kullanilabilir.some((k) => k.id === s.kuponId),
        "kutlama kuponu asıl listesinden çaldı",
      );
    } finally {
      await ayar.sayiYaz({
        cafeId: kafeA,
        anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
        deger: 50_00,
        aktorId: kasiyerA,
      });
    }
  });

  test("kutlama penceresi geçince kalkıyor, ödül kalıyor", async () => {
    // Kutlama süresiz kalsaydı "yeni açıldı" hiçbir şey anlatmaz olurdu.
    const acik = await withBypass("test: açık kupon", (db) =>
      db.one<{ id: string }>(
        `SELECT c.id FROM coupons c
          JOIN coupon_events ce ON ce.coupon_id = c.id AND ce.event = 'activated'
         WHERE c.player_id = $1 AND c.status = 'active' LIMIT 1`,
        [oyuncuId],
      ),
    );
    if (!acik) return;

    await yoneticiSorgu(
      `UPDATE coupon_events SET created_at = now() - ($2 || ' hours')::interval
        WHERE coupon_id = $1 AND event = 'activated'`,
      [acik.id, YENI_ACILDI_SAAT + 1],
    );

    const e = await envanter(oyuncuId);
    assert.ok(!e.yeniAcilan.some((k) => k.id === acik.id), "eski açılma hâlâ kutlanıyor");
    assert.ok(e.kullanilabilir.some((k) => k.id === acik.id), "ödül listeden düştü");
  });

  test("ertelenmeyen kupon hiç kutlanmıyor", async () => {
    // Kazanıldığı anda kullanıma hazır kuponun "açılma" anı yok; defterde
    // `activated` satırı da yok. Kutlanacak bir şey yok.
    const s = await kuponAl(katalogOdulId);
    assert.equal(s.ertelendi, false, "test kurulumu: küçük ödül ertelendi");

    const e = await envanter(oyuncuId);
    assert.ok(!e.yeniAcilan.some((k) => k.id === s.kuponId), "ertelenmeyen kupon kutlandı");
  });
});

/* ═══════════════════════════════════════════════════════════
   Günlük adet limiti ve kullanım penceresi (Ü103)
   ═══════════════════════════════════════════════════════════ */

describe("ödül sınırları (Ü103)", () => {
  after(async () => {
    await yoneticiSorgu(
      `UPDATE rewards SET daily_limit = NULL, usable_days = NULL,
              usable_from_hour = NULL, usable_to_hour = NULL
        WHERE cafe_id = $1`,
      [kafeA],
    );
  });

  test("🔴 günlük adedi dolan ödül ADAY LİSTESİNE hiç girmiyor", async () => {
    /**
     * ⚠️ Süzgeç seçimden ÖNCE olmak zorunda. Motor limiti dolmuş bir ödülü
     * seçip sonra reddedilseydi tur boşa gider ve düşme oranı sessizce
     * azalırdı: oyuncu "şansım tuttu ama ödül gelmedi" derdi.
     *
     * Sınama: katalogdaki TEK ödül bırakılıp limiti 1 yapılıyor, bir kupon
     * veriliyor ve ikinci denemede hiç aday kalmadığı için `null` dönüyor.
     */
    await yoneticiSorgu(`UPDATE rewards SET active = false WHERE cafe_id = $1`, [kafeA]);
    await yoneticiSorgu(
      `UPDATE rewards SET active = true, daily_limit = 1 WHERE id = $1`,
      [katalogOdulId],
    );

    try {
      const ilk = await kuponAl(katalogOdulId);
      assert.ok(ilk.ok);

      const ikinci = await withBypass("test: limit sonrası", (db) =>
        kupon.anlikOdulVer(db, {
          playerId: oyuncuId,
          cafeId: kafeA,
          kanitSeviyesi: 3,
          skor: 5000,
          oyunId: "blok",
          an: KAFE_ACIK,
        }),
      );
      assert.equal(ikinci, null, "günlük adedi dolan ödül yine verildi");
    } finally {
      await yoneticiSorgu(`UPDATE rewards SET active = true, daily_limit = NULL WHERE cafe_id = $1`, [kafeA]);
    }
  });

  test("🔴 pencere dışındaki kupon kasada ONAYLANMIYOR", async () => {
    /**
     * ⚠️ Kontrol yalnızca `coz`'de (ekran) olsaydı, arayüzü atlayıp
     * doğrudan onay isteği gönderen biri pencerenin dışında kuponu
     * bozdurabilirdi. Görünen kural ile uygulanan kural aynı olmalı.
     */
    const s = await kuponAl(katalogOdulId);
    assert.ok(s.ok);

    // Bu ödülü "yalnızca pazar 03:00–04:00" yap: şu an neredeyse kesin dışarıda.
    await yoneticiSorgu(
      `UPDATE rewards SET usable_days = ARRAY[0], usable_from_hour = 3, usable_to_hour = 4
        WHERE id = $1`,
      [katalogOdulId],
    );

    try {
      const onay = await kupon.onayla({
        cafeId: kafeA,
        kuponId: s.kuponId,
        staffId: kasiyerA,
      });
      assert.equal(onay.ok, false, "pencere dışında onaylandı");
      if (!onay.ok) {
        assert.ok(/kullanılamıyor/i.test(onay.hata), `ret cümlesi beklenmedik: ${onay.hata}`);
      }

      // Ret deftere geçmeli: kafe "neden kullanılamadı" sorabilmeli.
      const iz = await withCafe(kafeA, (db) =>
        db.all(`SELECT 1 FROM coupon_events WHERE coupon_id = $1 AND event = 'rejected'`, [
          s.kuponId,
        ]),
      );
      assert.ok(iz.length > 0, "ret defterine yazılmadı");
    } finally {
      await yoneticiSorgu(
        `UPDATE rewards SET usable_days = NULL, usable_from_hour = NULL, usable_to_hour = NULL
          WHERE id = $1`,
        [katalogOdulId],
      );
    }
  });

  test("pencere içindeki kupon normal onaylanıyor", async () => {
    const s = await kuponAl(katalogOdulId);
    assert.ok(s.ok);

    // Her gün, 00–24: kısıt var ama her zaman geçerli.
    await yoneticiSorgu(
      `UPDATE rewards SET usable_from_hour = 0, usable_to_hour = 24 WHERE id = $1`,
      [katalogOdulId],
    );

    try {
      const onay = await kupon.onayla({ cafeId: kafeA, kuponId: s.kuponId, staffId: kasiyerA });
      assert.equal(onay.ok, true, onay.ok === false ? onay.hata : "");
    } finally {
      await yoneticiSorgu(
        `UPDATE rewards SET usable_from_hour = NULL, usable_to_hour = NULL WHERE id = $1`,
        [katalogOdulId],
      );
    }
  });

  test("pencere oyuncunun kupon ekranında YAZIYOR", async () => {
    // ⚠️ Gizli kural, tutulmamış söz demektir: oyuncu kasaya gidiyor,
    // reddediliyor ve suçu kafeye yüklüyor.
    const s = await kuponAl(katalogOdulId);
    assert.ok(s.ok);

    await yoneticiSorgu(
      `UPDATE rewards SET usable_days = ARRAY[1,2,3,4,5], usable_from_hour = 14, usable_to_hour = 17
        WHERE id = $1`,
      [katalogOdulId],
    );

    try {
      const detay = await kuponDetayi(oyuncuId, s.kuponId);
      assert.ok(detay?.pencereMetni, "kullanım penceresi oyuncuya gösterilmiyor");
      assert.ok(/hafta içi/i.test(detay.pencereMetni), detay.pencereMetni);
      assert.ok(/14:00/.test(detay.pencereMetni), detay.pencereMetni);
    } finally {
      await yoneticiSorgu(
        `UPDATE rewards SET usable_days = NULL, usable_from_hour = NULL, usable_to_hour = NULL
          WHERE id = $1`,
        [katalogOdulId],
      );
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   Kupon ömrü kafenin ayarı — Ü250
   ═══════════════════════════════════════════════════════════ */

describe("kupon geçerlilik süresi (Ü250)", () => {
  async function yeniOyuncuId() {
    return (
      await kaydet({
        telefon: yeniTelefon(),
        eposta: benzersizEposta(),
        ad: "Sure",
        soyad: "Testi",
        dogumYili: 1990,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;
  }

  test("🔴 kuponun ömrü panelden ayarlanan gün sayısı kadar", async () => {
    /*
      🔴 Ürün sahibi: *"kupon geçerlilik süresi yani kaç gün süreceği ...
      cafe sahibi panelden ayarlayabilmeli."*

      Süre `kupon.GECERLILIK_GUN`de sabitti. Sabit kaldığı sürece panele
      bir alan koymak işe yaramazdı — alan kaydeder, kupon eski süreyi
      kullanırdı ve bu **hiçbir yerde görünmezdi**: kupon yine üretilir,
      yine çalışır, yalnızca yanlış günde ölürdü.

      Bu yüzden test sabitin değerini değil, **ayarın etkisini** sınıyor:
      alışılmadık bir sayı yazılıyor ve kuponun son kullanımı ona göre
      çıkıyor mu diye bakılıyor.
    */
    /*
      🔴 Önce BÜTÇE TAZELENİYOR ve bu bir kolaylık değil, zorunluluk.

      Ölçüldü: bu test süitin sonunda koşuyor ve o noktada `before`ta
      açılan bütçenin çoğu önceki testlerce harcanmış oluyor.
      `anlikOdulVer` o zaman `{ ok: false, hata: "bütçe doldu" }`
      dönüyor ve test **kuponun ömrüyle hiç ilgisi olmayan** bir
      sebeple düşüyor. Bir koşuda düştü, ikincisinde geçti — dosyanın
      kendi uyarısı tam bunu söylüyor: *"kırılgan bir test olmayandan
      kötüdür."*

      ⚠️ Tempo tavanı da var (Ü87): günün erken saatinde taahhüdün
      yalnızca bir kısmı erişilebilir. Taahhüt bol tutuluyor ki
      testin koştuğu saat sonucu belirlemesin.
    */
    const butceSonucu = await butce.donemBelirle({
      cafeId: kafeA,
      taahhutKurus: 50_000_000,
      aktorId: yoneticiA,
      gun: bugun,
    });
    assert.ok(butceSonucu.ok, "test için bütçe tazelenemedi");

    const ONCEKI = await ayar.sayiOku(kafeA, ayar.ANAHTARLAR.gecerlilikGunu);
    const DENEME = 3; // varsayılan 7 değil — varsayılana düşerse yakalansın

    await ayar.sayiYaz({
      cafeId: kafeA,
      anahtar: ayar.ANAHTARLAR.gecerlilikGunu,
      deger: DENEME,
      aktorId: yoneticiA,
    });

    try {
      const p = await yeniOyuncuId();
      const sonuc = await odulDus(p, kafeA);
      assert.ok(sonuc?.ok, "ödül düşmedi — test bir şey sınamıyor");
      if (!sonuc.ok) return;

      const k = await withBypass("test: kupon ömrü", (db) =>
        db.one<{ activates_at: Date; expires_at: Date }>(
          `SELECT activates_at, expires_at FROM coupons WHERE id = $1`,
          [sonuc.kuponId],
        ),
      );
      assert.ok(k, "kupon bulunamadı");
      if (!k) return;

      /*
        Ömür **açılıştan** sayılıyor, üretimden değil: son kullanım
        `şimdi + erteleme + süre`. Ertelenmiş kuponda `activates_at`
        ertelemeyi taşıyor, yani ikisinin farkı tam olarak süre.
      */
      const gun = (k.expires_at.getTime() - k.activates_at.getTime()) / 86_400_000;
      assert.ok(
        Math.abs(gun - DENEME) < 0.01,
        `kupon ${gun.toFixed(2)} gün geçerli, ayar ${DENEME} — ayar kupona ulaşmıyor`,
      );
      assert.notEqual(
        Math.round(gun),
        kupon.GECERLILIK_GUN,
        "kupon varsayılana düşmüş — panel alanı kaydediyor ama motor okumuyor",
      );
    } finally {
      await ayar.sayiYaz({
        cafeId: kafeA,
        anahtar: ayar.ANAHTARLAR.gecerlilikGunu,
        deger: ONCEKI,
        aktorId: yoneticiA,
      });
    }
  });

  test("sınırların dışındaki gün reddediliyor", async () => {
    /*
      Üst sınır bütçeden geliyor: kullanılmamış kupon kafenin parasını
      rezerve tutuyor ve ancak süresi dolunca iade ediliyor (E11).
      Bir yıllık kupon o parayı bir yıl kilitlerdi.
    */
    for (const gun of [0, 31, -5]) {
      const r = await ayar.sayiYaz({
        cafeId: kafeA,
        anahtar: ayar.ANAHTARLAR.gecerlilikGunu,
        deger: gun,
        aktorId: yoneticiA,
      });
      assert.equal(r.ok, false, `${gun} gün kabul edildi`);
    }
  });
});
