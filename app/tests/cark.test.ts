import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone, encryptPII } from "@/lib/crypto";
import * as cark from "@/domain/cark";
import * as ayar from "@/domain/ayar";
import { carkOduluVer } from "@/domain/kupon";
import { newId } from "@/lib/ids";

/**
 * Kafenin açık olduğu bir an (Ü90).
 *
 * Kapalıyken hiç ödül dağıtılmıyor; bu dosyanın konusu çarkın kendisi,
 * saat değil. Duvar saatine bırakılsaydı gece koşan CI'da hepsi düşerdi.
 */
const KAFE_ACIK = new Date("2026-09-02T20:00:00+03:00");
import { isGunu, gunEkle } from "@/lib/tarih";
import { benzersizEposta } from "./_yardim";

/**
 * ŞANS ÇARKI — Ü49.
 *
 * Çark para dağıtıyor. Sınanan dört iddia:
 *
 *   1. **Günde bir kez.** İkinci çevirme aynı gün ödül üretmiyor.
 *   2. **Ucuz ödül baskın.** Ağırlık gerçekten değere ters orantılı —
 *      "çok da yüksek ödüller vermeyen çark" tarifi kodda karşılığını
 *      buluyor mu.
 *   3. **Talep imzalı.** Misafirin elindeki çerez kurcalanınca çözülmüyor;
 *      aksi hâlde ziyaretçi kendi ödülünü yazardı.
 *   4. **Bütçe dışına çıkmıyor.** Bütçesi olmayan kafede çark ödül vermiyor.
 */

let cafeId = "";
/** Ayar yazan çağrılar bir aktör istiyor (denetim izi) — kafenin yöneticisi. */
let yonetici = "";
let cafeId2 = "";
let oyuncu = "";
let oyuncu2 = "";
const TABAN = 4_000_000 + randomInt(3_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0535${String(TABAN + sayac++).slice(-7)}`);

async function kafeKur(ad: string, butceli: boolean): Promise<string> {
  const id = newId("cafe");
  await withBypass("test kafe", async (db) => {
    await db.query(
      `INSERT INTO cafes (id, name, slug, status, lat, lng)
       VALUES ($1,$2,$3,'approved',41.0,29.0)`,
      [id, ad, `${ad.toLowerCase()}-${id.slice(-6)}`],
    );

    for (const [baslik, kurus] of [
      ["Test ucuz", 25_00],
      ["Test orta", 35_00],
      ["Test pahali", 50_00],
    ] as const) {
      await db.query(
        `INSERT INTO rewards (id, cafe_id, kind, title, points_price, cost_kurus,
                              min_proof_level, reward_type, active)
         VALUES ($1,$2,'instant',$3,0,$4,0,'product',true)`,
        [newId("rwd"), id, baslik, kurus],
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
  return id;
}

before(async () => {
  cafeId = await kafeKur("CarkTest", true);
  cafeId2 = await kafeKur("CarkButcesiz", false);

  const a = await kaydet({ telefon: yeniTelefon(), eposta: benzersizEposta(), ad: "Deniz", soyad: "Aydın", dogumYili: 1990, pazarlamaIzni: false });
  const b = await kaydet({ telefon: yeniTelefon(), eposta: benzersizEposta(), ad: "Kerem", soyad: "Şahin", dogumYili: 1992, pazarlamaIzni: false });
  oyuncu = a.oyuncu.id;
  oyuncu2 = b.oyuncu.id;

  /*
    Ayar yazımı denetim izi için gerçek bir personel satırı istiyor
    (`ayar.sayiYaz` → `audit`). `kafeKur` personel kurmuyor, o yüzden
    testin kendi yöneticisi burada açılıyor.

    ⚠️ `name_enc` şifreli — A1/Ü115'ten beri personel adı da düz metin
    değil. Düz yazılsaydı kolonun tipine takılırdı.
  */
  yonetici = newId("stf");
  await withBypass("test: yönetici kurulumu", (db) =>
    db.query(
      `INSERT INTO staff (id, cafe_id, name_enc, pin_hash, role)
       VALUES ($1,$2,$3,'-','manager')`,
      [yonetici, cafeId, encryptPII("Çark Testi")],
    ),
  );
});

after(async () => {
  await closePools();
});

describe("çark · günlük sınır", () => {
  test("ilk çevirme ödül üretiyor", async () => {
    const durum = await cark.durum({ playerId: oyuncu, cafeId });
    assert.equal(durum.acik, true, "çark kapalı başladı");

    const secim = cark.sec(durum.acik ? durum.dilimler : []);
    assert.ok(secim);

    const s = await carkOduluVer({
      playerId: oyuncu,
      cafeId,
      odulId: secim.dilim.odulId,
      kanitSeviyesi: 2,
      an: KAFE_ACIK,
    });
    assert.equal(s.ok, true, s.ok ? "" : s.hata);
  });

  /**
   * ASIL GÜVENCE. Kilit `cark.durum()` ekranında da var ama orası yalnızca
   * ekranı kapatıyor; ödülü üreten fonksiyonun kendisi de reddetmeli —
   * yoksa doğrudan eylemi çağıran biri sınırsız ödül üretirdi.
   */
  test("aynı gün ikinci çevirme ödül üretmiyor — ASIL GÜVENCE", async () => {
    const s = await carkOduluVer({
      playerId: oyuncu,
      cafeId,
      odulId: (await ilkOdul(cafeId)).id,
      kanitSeviyesi: 2,
      an: KAFE_ACIK,
    });
    assert.equal(s.ok, false, "24 saat kilidi tutmadı — sınırsız ödül yolu açık");
  });

  test("çevirdikten sonra çark kapalı görünüyor", async () => {
    const durum = await cark.durum({ playerId: oyuncu, cafeId });
    assert.equal(durum.acik, false);
    assert.match(cark.durumMetni(durum), /saat/);
  });

  /**
   * 🔴 Aralık KAFENİN AYARI — Ü158.
   *
   * Önce `cark.ts`te `ARALIK_SAAT = 24` sabitti ve panelde yalnızca
   * okunuyordu. Ürün sahibi: *"süreyi kafe sahibi panelden belirlemeli."*
   *
   * ⚠️ Bu test **iki yeri birden** çiviliyor: ekranı kapatan
   * `cark.durum()` ve ödülü üreten `carkOduluVer()`. İkisi ayrı süre
   * okusaydı çark "açık" görünüp çevirmeyi reddederdi — panelde yazan
   * sayı ile ürünün davranışı ayrışırdı ve bu, bu deponun dört kez
   * düştüğü "yarısına bağlandı" sınıfı olurdu.
   */
  test("kafe aralığı ürünün davranışını gerçekten değiştiriyor", async () => {
    const saatSonra = (d: cark.CarkDurumu) =>
      d.acik === false && d.sebep === "sure"
        ? (d.sonrakiAn.getTime() - Date.now()) / 3_600_000
        : null;

    /*
      ⚠️ İlk yazılışta bu test **yeşil yanıyordu ama hiçbir şey
      sınamıyordu**: aralığı 1 saate çekip "çark hâlâ kapalı" diye
      bakıyordu. Çevirme saniyeler öncesindeydi, yani 1 saatte de 24
      saatte de kapalı — iddia iki hâli ayırt etmiyordu. Sabiti geri
      koyup denendi, test yine geçti.

      Ayırt eden şey **sonraki çevirme anı**: 24 saatlik varsayılanda
      ~24, 1 saatlik ayarda ~1 olmalı.
    */
    const varsayilan = saatSonra(await cark.durum({ playerId: oyuncu, cafeId }));
    assert.ok(varsayilan !== null, "ön koşul: çark süre yüzünden kapalı olmalıydı");
    assert.ok(
      varsayilan > 20 && varsayilan <= 24,
      `varsayılan 24 saat beklenirken ${varsayilan?.toFixed(1)} çıktı`,
    );

    const y = await ayar.sayiYaz({
      cafeId,
      anahtar: ayar.ANAHTARLAR.carkAralikSaat,
      deger: 1,
      aktorId: yonetici,
    });
    assert.equal(y.ok, true, y.ok ? "" : y.hata);

    const kisa = saatSonra(await cark.durum({ playerId: oyuncu, cafeId }));
    assert.ok(kisa !== null, "1 saat ayarında da süre kilidi sürmeliydi");
    assert.ok(
      kisa <= 1.05,
      `kafe 1 saat dedi ama ürün ${kisa?.toFixed(1)} saat bekletiyor — ayar okunmuyor`,
    );

    // Varsayılana dön — sonraki testler 24 saat bekliyor.
    await ayar.sayiYaz({
      cafeId,
      anahtar: ayar.ANAHTARLAR.carkAralikSaat,
      deger: 24,
      aktorId: yonetici,
    });
  });

  test("aralık sınırların dışına yazılamıyor", async () => {
    for (const deger of [0, 169]) {
      const r = await ayar.sayiYaz({
        cafeId,
        anahtar: ayar.ANAHTARLAR.carkAralikSaat,
        deger,
        aktorId: yonetici,
      });
      assert.equal(r.ok, false, `${deger} saat kabul edildi — sınır tutmuyor`);
    }
  });

  test("başka oyuncunun çarkı etkilenmiyor", async () => {
    const durum = await cark.durum({ playerId: oyuncu2, cafeId });
    assert.equal(durum.acik, true, "bir oyuncunun çevirmesi diğerini kilitledi");
  });

  test("bütçesi olmayan kafede ödül çıkmıyor", async () => {
    const s = await carkOduluVer({
      playerId: oyuncu2,
      cafeId: cafeId2,
      odulId: (await ilkOdul(cafeId2)).id,
      kanitSeviyesi: 2,
      an: KAFE_ACIK,
    });
    assert.equal(s.ok, false, "bütçesiz kafeden ödül çıktı — E10 delindi");
  });
});

/* ═══════════════════════════════════════════════════════════
   Çark ve günlük bütçe — Ü123
   ═══════════════════════════════════════════════════════════ */

/**
 * Çarkın ayrı bir havuzu olup olmadığı sorusu.
 *
 * Ürün sahibi: *"Bütçede çarktan çıkan ödüller günlük bütçeye dahil
 * olacak, onu da unutma."* Kod bunu zaten yapıyor — çünkü kupon üreten
 * **tek bir yol** var (`kuponUret`) ve bütçe rezervasyonu orada. Ama
 * "zaten yapıyor" bir test değil: birisi yarın çark için ikinci bir
 * INSERT yolu açarsa bu dosya kırmızı yanmalı.
 *
 * Ölçülen şey iddianın kendisi: çevirmeden önce ve sonra defterdeki
 * rezerve toplamı, kuponun tutarı kadar artmalı.
 */
describe("çark · günlük bütçeye dahil (Ü123)", () => {
  async function rezerveToplam(id: string): Promise<number> {
    return withBypass("test: bütçe defteri", async (db) => {
      const r = await db.one<{ toplam: string | null }>(
        `SELECT sum(amount_kurus) AS toplam
           FROM budget_ledger
          WHERE cafe_id = $1 AND kind = 'reserve'`,
        [id],
      );
      return Number(r?.toplam ?? 0);
    });
  }

  test("çark kuponu bütçe defterine rezerve yazıyor", async () => {
    const kafe = await kafeKur("CarkButce", true);
    const oyuncuId = (
      await kaydet({
        telefon: yeniTelefon(),
        eposta: benzersizEposta(),
        ad: "Selin",
        soyad: "Koç",
        dogumYili: 1994,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;

    const once = await rezerveToplam(kafe);
    const odul = await ilkOdul(kafe);

    const s = await carkOduluVer({
      playerId: oyuncuId,
      cafeId: kafe,
      odulId: odul.id,
      kanitSeviyesi: 2,
      an: KAFE_ACIK,
    });
    assert.equal(s.ok, true, s.ok ? "" : s.hata);

    const sonra = await rezerveToplam(kafe);
    assert.equal(
      sonra - once,
      odul.cost_kurus,
      "çark ödülü bütçeden düşmedi — çarkın ayrı bir havuzu oluşmuş",
    );
  });

  /**
   * Tersi de sınanıyor: bütçe dolduğunda çark **susuyor**.
   *
   * Taban 1.500 TL (şema kısıtı) ve tempo gün içinde kademeli açılıyor;
   * bu yüzden bütçeyi "doldurmak" için defterin kendisine rezerve
   * yazılıyor. Ödül üreterek doldurmaya çalışmak 24 saat kilidine takılır.
   */
  test("bütçe dolduğunda çark ödül veremiyor", async () => {
    const kafe = await kafeKur("CarkButceDolu", true);
    const oyuncuId = (
      await kaydet({
        telefon: yeniTelefon(),
        eposta: benzersizEposta(),
        ad: "Emre",
        soyad: "Tan",
        dogumYili: 1991,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;

    await withBypass("test: bütçeyi doldur", async (db) => {
      const d = await db.one<{ id: string; committed_kurus: string }>(
        `SELECT id, committed_kurus FROM budget_periods WHERE cafe_id = $1`,
        [kafe],
      );
      await db.query(
        `INSERT INTO budget_ledger (id, cafe_id, budget_period_id, kind, amount_kurus, note)
         VALUES ($1,$2,$3,'reserve',$4,'test: bütçeyi doldur')`,
        [newId("bl"), kafe, d!.id, Number(d!.committed_kurus)],
      );
    });

    const s = await carkOduluVer({
      playerId: oyuncuId,
      cafeId: kafe,
      odulId: (await ilkOdul(kafe)).id,
      kanitSeviyesi: 2,
      an: KAFE_ACIK,
    });
    assert.equal(s.ok, false, "bütçe doluyken çark ödül verdi — E10 delindi");
  });
});

describe("çark · üst sınır", () => {
  /**
   * Ürün sahibinin şartı: *"küçük ödüller dağıtacak."* Havuz (E10) tek bir
   * ödülün büyüklüğünü sınırlamıyor; sınırlayan şey bu ayar.
   *
   * Test kafesinde 5 / 15 / 45 TL var, varsayılan sınır 25 TL: 45 TL'lik
   * ödül çarkta hiç görünmemeli.
   */
  test("sınırın üstündeki ödül çarka girmiyor", async () => {
    const durum = await cark.durum({ playerId: oyuncu2, cafeId });
    assert.equal(durum.acik, true);
    if (!durum.acik) return;

    const tavan = ayar.SINIRLAR[ayar.ANAHTARLAR.carkUstSinir].varsayilan;
    assert.ok(
      durum.dilimler.every((d) => d.kurusDegeri <= tavan),
      `sınırın üstünde ödül çarkta: ${durum.dilimler.map((d) => d.kurusDegeri).join(", ")}`,
    );
    assert.ok(
      !durum.dilimler.some((d) => d.baslik === "Test pahali"),
      "50 TL'lik ödül çarkta göründü",
    );
  });

  /**
   * ASIL GÜVENCE. Seçim tarafındaki süzgeç ekranı düzeltir; parayı yazan
   * fonksiyonun da reddetmesi gerekiyor — yoksa doğrudan çağıran biri
   * (ya da kurcalanmış bir talep) sınırı atlardı.
   */
  test("sınır üstü ödül doğrudan çağrıyla da yazılamıyor — ASIL GÜVENCE", async () => {
    const pahali = await withBypass("test pahali odul", (db) =>
      db.one<{ id: string }>(
        `SELECT id FROM rewards WHERE cafe_id = $1 AND title = 'Test pahali'`,
        [cafeId],
      ),
    );
    assert.ok(pahali);

    const s = await carkOduluVer({
      playerId: oyuncu2,
      cafeId,
      odulId: pahali.id,
      kanitSeviyesi: 2,
    });
    assert.equal(s.ok, false, "sınır üstü ödül çarktan yazıldı");
  });
});

describe("çark · ağırlık", () => {
  /**
   * Ü110: `Dilim` artık `agirlik` de taşıyor. Testler `null` (otomatik)
   * kurarken her satıra elle yazmak yerine tek yerden geçiyor — alanı
   * isteğe bağlı yapmak, gerçek bir kod yolunda unutulmasına ve sessizce
   * otomatiğe düşmesine kapı açardı.
   */
  const dilim = (odulId: string, kurus: number, agirlik: number | null = null): cark.Dilim => ({
    odulId,
    baslik: String(kurus / 100),
    kurusDegeri: kurus,
    agirlik,
  });

  /**
   * "Çok da yüksek ödüller vermeyen bir çark" tarifi bir sayıya dönüşmeli.
   *
   * Ağırlık sıraya bağlı ve her basamakta yarıya iniyor. Üç ödülde
   * beklenen dağılım 4/7, 2/7, 1/7 — yani ~%57 / %29 / %14.
   */
  test("ucuz ödül belirgin biçimde daha sık çıkıyor", () => {
    const oduller: cark.Dilim[] = [
      dilim("ucuz", 25_00),
      dilim("orta", 35_00),
      dilim("pahali", 50_00),
    ];

    const sayim = { ucuz: 0, orta: 0, pahali: 0 };
    const N = 6000;
    for (let i = 0; i < N; i++) {
      sayim[oduller[cark.agirlikliSec(oduller)].odulId as keyof typeof sayim]++;
    }

    assert.ok(sayim.ucuz > sayim.orta, "ucuz ödül ortadan seyrek çıktı");
    assert.ok(sayim.orta > sayim.pahali, "orta ödül pahalıdan seyrek çıktı");
    // Sınırlar geniş: bu bir dağılım testi, tam sayı testi değil.
    assert.ok(sayim.ucuz > N * 0.5, `ucuz ödül beklenenden az: ${sayim.ucuz}/${N}`);
    assert.ok(sayim.pahali < N * 0.2, `pahalı ödül beklenenden sık: ${sayim.pahali}/${N}`);
  });

  /**
   * Ağırlık **değere** değil sıraya bakıyor. Aralık ne kadar daralırsa
   * daralsın karakter aynı kalmalı — Ü52 aralığı 25-50'ye indirdiğinde
   * eski formül tam olarak burada çökmüştü.
   */
  test("ödüller birbirine çok yakınken bile dağılım bozulmuyor", () => {
    const yakin: cark.Dilim[] = [dilim("a", 45_00), dilim("b", 50_00)];

    let a = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) if (yakin[cark.agirlikliSec(yakin)].odulId === "a") a++;

    // İki ödülde beklenen 2/3 - 1/3.
    assert.ok(a > N * 0.55 && a < N * 0.78, `beklenen ~%67, çıkan %${Math.round((a / N) * 100)}`);
  });

  test("tek ödüllü kafede çark tek dilim — sekiz kez tekrarlamıyor", () => {
    const tek: cark.Dilim[] = [dilim("a", 1000)];
    assert.equal(cark.dilimleriYay(tek).length, 1);
  });

  test("dört ve üstü ödülde her ödül bir kez görünüyor", () => {
    const dort: cark.Dilim[] = ["a", "b", "c", "d"].map((x, i) => dilim(x, (i + 1) * 1000));
    const yayilmis = cark.dilimleriYay(dort);
    assert.equal(yayilmis.length, 4);
    assert.equal(new Set(yayilmis.map((d) => d.odulId)).size, 4);
  });

  test("iki ödül eşit sayıda tekrarlanıyor — görünen sıklık yanıltmıyor", () => {
    const iki: cark.Dilim[] = [dilim("a", 1000), dilim("b", 2000)];
    const yayilmis = cark.dilimleriYay(iki);
    const a = yayilmis.filter((d) => d.odulId === "a").length;
    const b = yayilmis.filter((d) => d.odulId === "b").length;
    assert.equal(a, b, "bir ödül diğerinden fazla dilim kapladı");
  });
});

describe("çark · misafir talebi", () => {
  test("imzalı talep çözülüyor", async () => {
    const s = await cark.misafirCevir({ cafeId });
    assert.equal(s.ok, true);
    if (!s.ok) return;

    const t = cark.talepCoz(s.cerez);
    assert.ok(t, "kendi ürettiğimiz talep çözülemedi");
    assert.equal(t.cafeId, cafeId);
    assert.equal(t.baslik, s.baslik);
  });

  /**
   * Çerez oyuncunun elinde. Kurcalanabilseydi ziyaretçi, kafenin en pahalı
   * ödülünün kimliğini yazıp kaydolduğunda onu bozdururdu.
   */
  test("kurcalanmış talep çözülmüyor", async () => {
    const s = await cark.misafirCevir({ cafeId });
    assert.equal(s.ok, true);
    if (!s.ok) return;

    const [govde, imza] = s.cerez.split(".");
    const bozuk = Buffer.from(
      JSON.stringify({ ...cark.talepCoz(s.cerez), odulId: "rwd_baskasinin" }),
      "utf8",
    ).toString("base64url");

    assert.equal(cark.talepCoz(`${bozuk}.${imza}`), null, "gövde değişince imza tutmamalı");
    assert.equal(cark.talepCoz(`${govde}.deadbeef`), null, "imza değişince talep açılmamalı");
    assert.equal(cark.talepCoz("gecersiz"), null);
    assert.equal(cark.talepCoz(undefined), null);
  });

  test("misafir çevirmesi kupon üretmiyor — G13", async () => {
    const once = await carkKuponSayisi(cafeId);
    await cark.misafirCevir({ cafeId });
    const sonra = await carkKuponSayisi(cafeId);
    assert.equal(sonra, once, "kaydolmamış ziyaretçi için satır yazıldı");
  });
});

/** Kafenin en ucuz anlık ödülü. Tutar da dönüyor: bütçe testi onu ölçüyor. */
async function ilkOdul(id: string): Promise<{ id: string; cost_kurus: number }> {
  const r = await withBypass("test odul", (db) =>
    db.one<{ id: string; cost_kurus: string }>(
      `SELECT id, cost_kurus FROM rewards WHERE cafe_id = $1 AND kind = 'instant' ORDER BY cost_kurus LIMIT 1`,
      [id],
    ),
  );
  assert.ok(r);
  return { id: r.id, cost_kurus: Number(r.cost_kurus) };
}

async function carkKuponSayisi(id: string): Promise<number> {
  const r = await withBypass("test cark sayimi", (db) =>
    db.one<{ n: string }>(
      `SELECT count(*) AS n FROM coupons c
         JOIN coupon_events e ON e.coupon_id = c.id AND e.event = 'issued' AND e.reason = 'cark'
        WHERE c.cafe_id = $1`,
      [id],
    ),
  );
  return Number(r?.n ?? 0);
}
