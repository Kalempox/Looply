import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as butce from "@/domain/butce";
import * as katalog from "@/domain/katalog";
import * as kupon from "@/domain/kupon";
import * as puan from "@/domain/puan";
import { envanter, kuponDetayi, kaz } from "@/domain/odul";
import { isGunu } from "@/lib/tarih";
import { yoneticiSorgu, benzersizEposta } from "./_yardim";
import { gorselSec } from "@/components/oyuncu-gorsel";

/**
 * Ü141 — kupon kazınarak açılıyor.
 *
 * ── Asıl sınanan şey bir GÖRÜNTÜ değil ──────────────────────
 *
 * Kazıma yüzeyi tarayıcıda; buradaki testlerin hiçbiri onu görmüyor.
 * Sınanan şey sözün kendisi: **kapalı kuponun ödülü istemciye
 * gönderilmiyor.** Yaygın kazıma uygulamalarında ödül altta yazılı
 * durur ve üstü örtülür — orada kazıma bir perdedir ve sayfanın
 * kaynağına bakan onu kaldırır. Aşağıdaki testler perdenin değil
 * kapının test edilmesini sağlıyor.
 *
 * Kapatılan yollar tek tek sayılı:
 *
 *   1. Envanterde ad, cins, kategori ve kullanım penceresi yok
 *   2. Kupon detayında da yok — ve kasada okutulacak jeton da yok
 *   3. Kazıma adı veriyor, ikinci kez kazımak kırılmıyor
 *   4. Başkasının kuponu kazınamıyor
 *   5. Kapalı kupon veritabanı düzeyinde "kullanıldı" olamıyor
 *   6. Kapalılık yalnızca OYUN ödülünde — çark kuponu açık doğuyor
 *
 * ⚠️ 6. madde "yazıldı ama bağlanmadı" sınıfına karşı (Ü113): kapalı
 * doğurma yeteneği `kuponUret`e eklenip oyun yolundan çağrılmasaydı
 * bütün özellik sessizce ölü kalırdı ve ekranda hiçbir şey değişmezdi.
 */

let kafeId = "";
let yoneticiId = "";
let oyuncuId = "";
let baskaOyuncuId = "";
let odulId = "";

const bugun = isGunu();
const TABAN = 3_000_000 + randomInt(5_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0558${String(TABAN + sayac++).slice(-7)}`);

/**
 * Kafenin açık olduğu bir an.
 *
 * Ü90'dan beri kapalı kafede hiç ödül çıkmıyor ve bütçe temposu gün
 * içinde kademeli açılıyor; sabitlenmezse gece koşan test sebepsiz
 * düşer (aynı dikiş `kupon-kasa.test.ts`te de var).
 */
const KAFE_ACIK = new Date();
KAFE_ACIK.setHours(14, 0, 0, 0);

async function yeniOyuncu(): Promise<string> {
  const s = await kaydet({
    telefon: yeniTelefon(),
    eposta: benzersizEposta(),
    ad: "Kazıma",
    soyad: "Testi",
    dogumYili: 1990,
    pazarlamaIzni: false,
  });
  return s.oyuncu.id;
}

before(async () => {
  const v = await withBypass("test hazırlığı — kazıma", async (db) => {
    const k = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const y = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [k!.id],
    );
    return { k: k?.id, y: y?.id };
  });
  assert.ok(v.k && v.y, "Tohum verisi eksik — önce: npm run db:seed");
  kafeId = v.k;
  yoneticiId = v.y;

  await yoneticiSorgu(
    `UPDATE platform_config SET value = 'false'::jsonb
      WHERE key IN ('kupon_dagitimi_durduruldu','oyun_durduruldu')`,
  );

  const b = await butce.donemBelirle({
    cafeId: kafeId,
    taahhutKurus: 5_000_000,
    aktorId: yoneticiId,
    gun: bugun,
  });
  assert.ok(b.ok, b.ok === false ? b.hata : "");

  const o = await katalog.ekle({
    cafeId: kafeId,
    tip: "product",
    baslik: "KAZIMA Filtre Kahve",
    // Ü89: ödül değeri 25–50 TL arası ve beşer artışlarla; katalog
    // bunu reddediyor, test de o kurala uymak zorunda.
    maliyetKurus: 25_00,
    puanFiyati: 0,
    anlik: true,
    aktorId: yoneticiId,
  });
  assert.ok(o.ok, o.ok === false ? o.hata : "");
  odulId = o.ok ? o.id : "";

  oyuncuId = await yeniOyuncu();
  baskaOyuncuId = await yeniOyuncu();
});

after(async () => {
  /*
    🔴 Test kendi ödülünü SİLİYOR — Ü165.

    Bu dosya `before` içinde **tohum kafesine** (Kafe A) bir ödül
    ekliyor ve eklediği şey demo ekranında görünen bir şey. Temizlik
    olmadığı için her koşu bir kopya daha bırakmış: ürün sahibi
    ekranına baktığında Kafe A'da **46 tane** "KAZIMA Filtre Kahve"
    vardı, gerçek ödüllerin her biri birer tane.

    Bedeli yalnızca çirkinlik değildi: çark kafenin bütün aktif anlık
    ödüllerini dilim yapıyor (`domain/cark.ts` → `odulleriOku`), yani
    çarkın neredeyse her dilimi bu test ödülüydü. Ürün sahibi
    *"çarkta neden hepsinde kazıma yazıyor"* diye sordu ve haklıydı.

    ⚠️ Kuponlar önce siliniyor: `coupons.reward_id` bu satıra bakıyor
    (`0002_cekirdek.sql`) ve `ON DELETE` kuralı yok. `coupon_events` de
    kupona bakıyor, o daha da önce siliniyor.

    ⚠️ Temizlik `withBypass` ile DEĞİL, **yönetici rolüyle** yapılıyor.
    İlk yazılışında `withBypass` kullanıldı ve koşu `aclcheck_error`
    ile düştü: uygulama rolünün bu tablolarda silme yetkisi **bilerek**
    yok (bkz. `_yardim.ts` başlığı). Yetkiyi gevşetmek, sınadığımız
    güvenceyi bozmak olurdu.

    ⚠️ Asıl doğru olan, testin tohum kafesine hiç yazmaması. Kendi
    kafesini kurmak (`cark.test.ts`teki `kafeKur` gibi) bu dosyanın
    tohumdan aldığı personel ve bütçe kurulumunu da taşımayı
    gerektiriyor; o iş `docs/23`te açık duruyor. Bu temizlik demoyu
    kirletmeyi **bugün** durduruyor.
  */
  if (odulId) {
    // Kupona bakan üç tablo (`information_schema` ile sayıldı).
    const kupon = "SELECT id FROM coupons WHERE reward_id = $1";
    await yoneticiSorgu(`DELETE FROM coupon_events   WHERE coupon_id IN (${kupon})`, [odulId]);
    await yoneticiSorgu(`DELETE FROM campaign_offers WHERE coupon_id IN (${kupon})`, [odulId]);
    await yoneticiSorgu(`DELETE FROM cark_haklari    WHERE coupon_id IN (${kupon})`, [odulId]);
    await yoneticiSorgu("DELETE FROM coupons WHERE reward_id = $1", [odulId]);
    await yoneticiSorgu("DELETE FROM rewards WHERE id = $1", [odulId]);
  }
  await closePools();
});

/**
 * Kapalı bir kupon üretir.
 *
 * ⚠️ `anlikOdulVer` DEĞİL: o şansa bağlı ve bazen hiç kupon çıkmıyor —
 * kazımayı sınayan bir test ödül motorunun rastgeleliğine takılıp
 * rastgele kırılmamalı (aynı gerekçe `karekod-uctan-uca.test.ts`te de
 * yazılı). Burada kupon `carkOduluVer` ile **belirli** olarak üretiliyor
 * ve kapatma tek satırla yapılıyor.
 *
 * Kapalı DOĞMANIN gerçekten oyun yolundan geldiği ayrıca sınanıyor
 * (aşağıda, 6. bölüm) — bu yardımcı onun yerine geçmiyor.
 */
async function kapaliKupon(playerId: string): Promise<string> {
  const s = await kupon.carkOduluVer({
    playerId,
    cafeId: kafeId,
    odulId,
    kanitSeviyesi: 4,
    ilkCevirme: true,
    an: KAFE_ACIK,
  });
  assert.ok(s.ok, s.ok === false ? s.hata : "");
  const kuponId = s.ok ? s.kuponId : "";
  await yoneticiSorgu(`UPDATE coupons SET revealed_at = NULL WHERE id = $1`, [kuponId]);
  return kuponId;
}

/* ═══════════════════════════════════════════════════════════
   1 · Kapalı kupon hiçbir şey sızdırmıyor
   ═══════════════════════════════════════════════════════════ */

describe("kapalı kupon", () => {
  test("envanterde ad, cins ve kategori GÖNDERİLMİYOR", async () => {
    const p = await yeniOyuncu();
    const kuponId = await kapaliKupon(p);

    const e = await envanter(p);
    const k = e.kazinacak.find((x) => x.id === kuponId);

    assert.ok(k, "kapalı kupon `kazinacak` listesinde yok");
    assert.equal(k.kapali, true);
    assert.equal(k.baslik, null, "ödülün adı istemciye gitmiş");
    assert.equal(k.kategoriTuru, null, "kategori ödülü ele veriyor");
    assert.equal(k.pencereMetni, null, "kullanım penceresi ödülü ele veriyor");
  });

  test("kapalı kupon kullanılabilirler listesine ve sayaca girmiyor", async () => {
    const p = await yeniOyuncu();
    const kuponId = await kapaliKupon(p);

    const e = await envanter(p);
    assert.equal(
      e.kullanilabilir.some((x) => x.id === kuponId),
      false,
      "kazınmamış kupon 'kasada gösterebilirsin' sayısına girmiş — oyuncu kasaya boşuna gider",
    );
    assert.equal(e.bekleyen.some((x) => x.id === kuponId), false);
  });

  test("ana ekranın kupon sayacına GİRMİYOR — iki ekran aynı şeyi söylemeli", async () => {
    /*
      🔴 Sahada görülen hata: ana ekran "2 kupon" derken Ödüllerim "1"
      diyordu. Kazınmamış kupon `active` ve penceresi açık olduğu için
      sayaca giriyordu, oysa kasada gösterilemiyor.

      Sayılan şey **kasada gösterilebilen** şey olmalı; testin çivilediği
      kural bu.
    */
    const p = await yeniOyuncu();
    const kuponId = await kapaliKupon(p);

    const kapaliyken = (await puan.ozet(p, kafeId)).aktifKupon;
    await kaz(p, kuponId);
    const acikken = (await puan.ozet(p, kafeId)).aktifKupon;

    assert.equal(
      acikken - kapaliyken,
      1,
      "kazınmamış kupon ana ekran sayacına giriyor (ya da kazınan girmiyor)",
    );
  });

  test("kupon detayında ad da jeton da yok", async () => {
    const p = await yeniOyuncu();
    const kuponId = await kapaliKupon(p);

    const d = await kuponDetayi(p, kuponId);
    assert.ok(d);
    assert.equal(d.kapali, true);
    assert.equal(d.baslik, null, "detay sayfası adı sızdırıyor");
    assert.equal(d.jeton, "", "kapalı kupon kasada okutulabilir durumda");
    assert.equal(d.kod, "", "kapalı kuponun yedek kodu verilmiş");
  });

  test("veritabanı kapalı kuponun kullanılmasını reddediyor", async () => {
    const p = await yeniOyuncu();
    const kuponId = await kapaliKupon(p);

    /*
      Uygulama yolu zaten jeton vermiyor; bu test **kısıtın kendisini**
      sınıyor. İkisi ayrı savunma: uygulamada bir gün başka bir yol
      açılırsa (yeni bir kasa ekranı, bir betik) kısıt ayakta kalır.
    */
    await assert.rejects(
      () =>
        yoneticiSorgu(
          `UPDATE coupons SET status = 'redeemed', committed_kurus = 0,
                  redeemed_by_staff_id = (SELECT id FROM staff WHERE cafe_id = $2 LIMIT 1)
            WHERE id = $1`,
          [kuponId, kafeId],
        ),
      /coupons_kapali_kupon_kullanilamaz/,
      "kapalı kupon veritabanı düzeyinde kullanılabildi",
    );
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Kazıma
   ═══════════════════════════════════════════════════════════ */

describe("kazıma", () => {
  test("kazıyınca ad geliyor ve kupon olağan yerine dönüyor", async () => {
    const p = await yeniOyuncu();
    const kuponId = await kapaliKupon(p);

    const sonuc = await kaz(p, kuponId);
    assert.ok(sonuc.ok, "kazıma başarısız");
    assert.equal(sonuc.baslik, "KAZIMA Filtre Kahve");

    const e = await envanter(p);
    assert.equal(e.kazinacak.some((x) => x.id === kuponId), false, "kupon hâlâ kazınacaklarda");
    const acik = e.kullanilabilir.find((x) => x.id === kuponId);
    assert.ok(acik, "açılan kupon kullanılabilirlere geçmedi");
    assert.equal(acik.kapali, false);
    assert.equal(acik.baslik, "KAZIMA Filtre Kahve");

    const d = await kuponDetayi(p, kuponId);
    assert.ok(d!.jeton.length > 0, "açılan kuponun jetonu hâlâ boş — kasada gösterilemez");
  });

  test("kupon çizimi Türkçe küçük harfte KAYMIYOR — REGRESYON", () => {
    /*
      🔴 Ü189'da ekranda yakalandı: "Ice Americano" kuponu buharlı
      fincanla, yani SICAK içecek olarak çıkıyordu.

      Sebep dil: Türkçede `I`nin küçüğü noktasız `ı`.

          "Ice Americano".toLocaleLowerCase("tr") === "ıce americano"

      Listedeki noktalı `ice` hiç tutmuyor, kupon `soguk`u atlayıp
      `americano` üzerinden `icecek`e düşüyordu.

      ⚠️ Koddaki sıralama notu bu ihtimali öngörmüştü (soğuk, sıcaktan
      ÖNCE bakılıyor) ama kelime hiç eşleşmediği için sıra da işe
      yaramıyordu — doğru sıra, yanlış karşılaştırma. Bu yüzden test
      sıralamayı değil, İKİ YÖNLÜ eşleşmeyi çiviliyor.
    */
    // Türkçe küçük harfin bozduğu hâl — asıl regresyon.
    assert.equal(gorselSec("Ice Americano", "urun"), "soguk");
    assert.equal(gorselSec("ICE LATTE", "urun"), "soguk");

    // Değişmez küçük harfin bozacağı hâl — diğer yön de korunmalı.
    // ("TATLI".toLowerCase() === "tatli", listedeki "tatlı" tutmaz.)
    assert.equal(gorselSec("TATLIDA %10 İNDİRİM", "yuzde"), "tatli");

    // Sıcak, soğuk ve para olağan hâllerinde kalıyor.
    assert.equal(gorselSec("Ücretsiz filtre kahve", "urun"), "icecek");
    assert.equal(gorselSec("Buzlu Kahve", "urun"), "soguk");
    assert.equal(gorselSec("40 TL indirim", "tutar"), "para");
  });

  test("kazınan kupon, hiç kapanmamış kuponla BİREBİR aynı görünüyor", async () => {
    /*
      Ürün sahibinin sorusu: *"kazınıp kazanılan ödüller eskisi gibi
      renklendirmesi, kart gösterimi falan eskisi gibi olmalı."*

      Kartın rengini ve çizimini seçen şey üç alan: `baslik`, `tur` ve
      `kategoriTuru` (`gorselSec` → `GORSEL_RENGI`). Ekranı gözle
      karşılaştırmak bir tur sonra unutulur; burada **girdiler**
      çivileniyor: aynı ödülden gelen iki kupondan biri kazınarak, biri
      olağan yoldan açılmışsa üçü de aynı olmalı.
    */
    const p = await yeniOyuncu();

    const kazinan = await kapaliKupon(p);
    await kaz(p, kazinan);

    const q = await yeniOyuncu();
    const olagan = await kupon.carkOduluVer({
      playerId: q,
      cafeId: kafeId,
      odulId,
      kanitSeviyesi: 4,
      ilkCevirme: true,
      an: KAFE_ACIK,
    });
    assert.ok(olagan.ok, olagan.ok === false ? olagan.hata : "");

    const a = await kuponDetayi(p, kazinan);
    const b = await kuponDetayi(q, olagan.ok ? olagan.kuponId : "");

    assert.equal(a!.baslik, b!.baslik, "başlık farklı — kart başka görünür");
    assert.equal(a!.tur, b!.tur, "tür farklı — kartın rengi değişir");
    assert.equal(a!.kategoriTuru, b!.kategoriTuru, "kategori farklı — kartın çizimi değişir");
    assert.equal(a!.kapali, false);
    assert.equal(b!.kapali, false);
  });

  test("ikinci kez kazımak kırılmıyor ve defterde tek satır bırakıyor", async () => {
    const p = await yeniOyuncu();
    const kuponId = await kapaliKupon(p);

    const bir = await kaz(p, kuponId);
    const iki = await kaz(p, kuponId);

    assert.ok(bir.ok && iki.ok, "tekrar kazımak hata verdi");
    assert.equal(iki.baslik, bir.baslik);

    /*
      Kazıma yarıda kesilip yeniden denenebiliyor (ağ koptu, sekme
      kapandı): ikinci çağrı oyuncu için aynı sonucu vermeli. Ama
      kuponun hikâyesine iki açılış satırı düşmemeli — `revealed_at IS
      NULL` koşulu güncellemenin kendisinde, o yüzden ikinci çağrı sıfır
      satır güncelliyor ve defter satırı yazılmıyor.
    */
    const n = await withBypass("test: açılış olayı sayısı", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*) AS n FROM coupon_events WHERE coupon_id = $1 AND event = 'revealed'`,
        [kuponId],
      ),
    );
    assert.equal(Number(n!.n), 1, "aynı kupon için iki açılış satırı yazılmış");
  });

  test("başkasının kuponu kazınamıyor ve adı öğrenilemiyor", async () => {
    const kuponId = await kapaliKupon(oyuncuId);

    const sonuc = await kaz(baskaOyuncuId, kuponId);
    assert.equal(sonuc.ok, false, "başka oyuncu kuponu açabildi");

    // Ve kupon gerçekten kapalı kalmalı — reddedilen çağrı onu açmış
    // olsaydı sahibi de ödülünü kazımadan bulurdu.
    const d = await kuponDetayi(oyuncuId, kuponId);
    assert.equal(d!.kapali, true, "reddedilen çağrı kuponu yine de açmış");
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Kapalılık yalnızca oyun ödülünde
   ═══════════════════════════════════════════════════════════ */

describe("hangi kupon kapalı doğuyor", () => {
  test("çark kuponu AÇIK doğuyor — kendi tören sahnesi var", async () => {
    const p = await yeniOyuncu();
    const s = await kupon.carkOduluVer({
      playerId: p,
      cafeId: kafeId,
      odulId,
      kanitSeviyesi: 4,
      ilkCevirme: true,
      an: KAFE_ACIK,
    });
    assert.ok(s.ok, s.ok === false ? s.hata : "");

    const d = await kuponDetayi(p, s.ok ? s.kuponId : "");
    assert.equal(d!.kapali, false, "çark kuponu kapalı doğmuş — ödül iki kez açılırdı");
    assert.equal(d!.baslik, "KAZIMA Filtre Kahve");
  });

  test("oyun ödülü KAPALI doğuyor", async () => {
    /*
      ⚠️ `anlikOdulVer` şansa bağlı: tek çağrı bazen hiç kupon vermiyor
      (Ü92'de oranlar bilerek düşürüldü). Bu yüzden taze oyuncularla
      sınırlı sayıda deneniyor — günlük "bir anlık ödül" sınırı oyuncu
      ve kafe başına olduğu için aynı oyuncuyla tekrar denemek işe
      yaramaz.

      Şans 0.5 civarında; on iki denemede hiç düşmeme olasılığı yüz
      binde birin altında. Hiç düşmezse test ATLAMIYOR, düşüyor:
      sessizce geçen bir test, ölü bir özelliği canlı gösterir.
    */
    let kuponId = "";
    for (let i = 0; i < 12 && !kuponId; i++) {
      const p = await yeniOyuncu();
      const s = await withBypass("test: oyun ödülü", (db) =>
        kupon.anlikOdulVer(db, {
          playerId: p,
          cafeId: kafeId,
          kanitSeviyesi: 4,
          skor: 2500,
          oyunId: "yilan",
          odulIsareti: 3,
          // `oyun.ts` bu bayrağı gönderiyor; testin sınadığı şey de o.
          kapali: true,
          an: KAFE_ACIK,
        }),
      );
      if (s?.ok) kuponId = s.kuponId;
    }
    assert.ok(kuponId, "on iki denemede hiç anlık ödül düşmedi — motor ya da kurulum bozuk");

    const kapaliMi = await withBypass("test: kupon kapalı mı", (db) =>
      db.one<{ revealed_at: Date | null }>(
        "SELECT revealed_at FROM coupons WHERE id = $1",
        [kuponId],
      ),
    );
    assert.equal(
      kapaliMi!.revealed_at,
      null,
      "oyun ödülü AÇIK doğmuş — kazıma özelliği yazıldı ama oyun yoluna bağlanmamış",
    );
  });
});
