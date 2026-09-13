import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import * as cark from "@/domain/cark";
import * as carkAgirlik from "@/domain/cark-agirlik";
import * as ayar from "@/domain/ayar";
import { newId } from "@/lib/ids";
import { yoneticiSorgu } from "./_yardim";

/**
 * Ü110 · ÇARK OLASILIKLARI KAFENİN ELİNDE.
 *
 * Sınanan iddialar:
 *
 *   1. **Panelde yazan yüzde, gerçek çekilişle tutuyor.** Ekrandaki sayı
 *      bir süs değilse bunun ölçülmesi gerekir.
 *   2. **Ağırlık 0 olan ödül asla çıkmıyor.**
 *   3. **Hepsi sıfır olamaz** — çark dönecek bir şey bulamaz.
 *   4. **Dokunulmamış kafede dağılım DEĞİŞMİYOR** (Ü49 regresyonu).
 *   5. **İlk yazım kalanları sabitliyor** ve o an dağılımı bozmuyor.
 */

let kafeId = "";
let yoneticiId = "";

/** Test ödülleri — kuruş değerleri artan sırada. */
const DEGERLER = [25_00, 30_00, 35_00, 40_00];
const odulIdler: string[] = [];
/** Testten önce açık olan ödüller — sonda birebir geri konuyor. */
let acikOlanlar: string[] = [];

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const c = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const y = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [c!.id],
    );
    return { c: c!.id, y: y!.id };
  });
  kafeId = v.c;
  yoneticiId = v.y;

  /**
   * Kafenin kendi ödülleri karışmasın diye hepsi kapatılıyor.
   *
   * ⚠️ Önce **hangileri açıktı** yazılıyor. İlk sürüm sonda `active = true`
   * diyordu ve bu, tohumda BİLEREK kapalı olan ödülleri de açıyordu —
   * sonraki dosyaların gördüğü kafe, testten önceki kafe olmuyordu.
   * Testin kendi bıraktığı iz, başka bir testi rastgele kırar.
   */
  acikOlanlar = (
    await withBypass("test: açık ödüller", (db) =>
      db.all<{ id: string }>(`SELECT id FROM rewards WHERE cafe_id = $1 AND active`, [kafeId]),
    )
  ).map((r) => r.id);

  await yoneticiSorgu(`UPDATE rewards SET active = false WHERE cafe_id = $1`, [kafeId]);

  for (const [i, kurus] of DEGERLER.entries()) {
    const id = `rwd_agirlik_${i}`;
    odulIdler.push(id);
    await yoneticiSorgu(
      `INSERT INTO rewards (id, cafe_id, kind, reward_type, title, cost_kurus, sort_order, active)
       VALUES ($1,$2,'instant','amount',$3,$4,$5,true)
       ON CONFLICT (id) DO UPDATE SET active = true, wheel_weight = NULL`,
      [id, kafeId, `Test ödülü ${i + 1}`, kurus, i],
    );
  }

  // Üst sınır en pahalı test ödülünü kapsasın.
  await ayar.sayiYaz({
    cafeId: kafeId,
    anahtar: ayar.ANAHTARLAR.carkUstSinir,
    deger: 50_00,
    aktorId: yoneticiId,
  });
});

after(async () => {
  await yoneticiSorgu(`DELETE FROM rewards WHERE id LIKE 'rwd_agirlik_%'`);
  // Yalnızca testten ÖNCE açık olanlar geri açılıyor.
  await yoneticiSorgu(`UPDATE rewards SET active = true WHERE id = ANY($1)`, [acikOlanlar]);
  await closePools();
});

async function otomatige() {
  await carkAgirlik.otomatigeDon({ cafeId: kafeId, aktorId: yoneticiId });
}

/** Çekilişi N kez koşturup her ödülün payını döndürür. */
function dagilim(oduller: cark.Dilim[], N = 8000): Map<string, number> {
  const sayim = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const id = oduller[cark.agirlikliSec(oduller)].odulId;
    sayim.set(id, (sayim.get(id) ?? 0) + 1);
  }
  return sayim;
}

/* ── Otomatik dağılım korunuyor ────────────────────────────── */

describe("otomatik dağılım (Ü49 regresyonu)", () => {
  test("hiç ağırlık yazılmamışsa panel 'otomatik' diyor", async () => {
    await otomatige();
    const d = await carkAgirlik.durum(kafeId);
    assert.equal(d.otomatikMi, true);
    assert.equal(d.satirlar.length, DEGERLER.length);
  });

  /**
   * ⚠️ Ü49'un karakteri: ucuz ödül belirgin biçimde daha sık. Ü110 bunu
   * yalnızca **yazılabilir** yaptı; dokunulmamış kafede değiştirmedi.
   */
  test("🔴 dokunulmamış kafede ucuz ödül hâlâ baskın", async () => {
    await otomatige();
    const d = await carkAgirlik.durum(kafeId);

    const enUcuz = d.satirlar[0];
    const enPahali = d.satirlar[d.satirlar.length - 1];
    assert.ok(
      enUcuz.yuzde > 40,
      `en ucuz ödül %${enUcuz.yuzde} — otomatik dağılım bozuldu`,
    );
    assert.ok(
      enPahali.yuzde < 10,
      `en pahalı ödül %${enPahali.yuzde} — otomatik dağılım bozuldu`,
    );
  });

  test("otomatik ağırlıklar yüzde ölçeğinde — toplam 100 civarı", async () => {
    await otomatige();
    const d = await carkAgirlik.durum(kafeId);
    assert.ok(
      d.toplam >= 95 && d.toplam <= 105,
      `toplam ${d.toplam} — yüzde ölçeğinden çıkmış`,
    );
  });
});

/* ── Kafenin yazdığı ağırlıklar ────────────────────────────── */

describe("kafe kendi olasılığını yazıyor", () => {
  /**
   * 🔴 ASIL GÜVENCE.
   *
   * Panelde yazan yüzde bir süs değil: çekiliş gerçekten o dağılımı
   * üretmeli. İkisi ayrışsaydı kafe kendi parasını sandığından başka bir
   * oranda dağıtıyor olurdu ve bunu fark etmesinin hiçbir yolu olmazdı.
   */
  test("🔴 panelde yazan yüzde gerçek çekilişle tutuyor", async () => {
    await otomatige();

    // En pahalı ödülü baskın yap — otomatiğin tam tersi bir dağılım.
    const s = await carkAgirlik.yaz({
      cafeId: kafeId,
      odulId: odulIdler[3],
      agirlik: 70,
      aktorId: yoneticiId,
    });
    assert.ok(s.ok, s.ok === false ? s.hata : "");

    const d = await carkAgirlik.durum(kafeId);
    const beklenen = new Map(d.satirlar.map((r) => [r.odulId, r.yuzde]));

    const oduller = await withBypass("test: dilimler", (db) =>
      cark.odulleriOku(db, kafeId, 50_00),
    );
    const N = 8000;
    const sayim = dagilim(oduller, N);

    for (const [odulId, yuzde] of beklenen) {
      const gercek = ((sayim.get(odulId) ?? 0) / N) * 100;
      assert.ok(
        Math.abs(gercek - yuzde) < 4,
        `${odulId}: panel %${yuzde}, çekiliş %${gercek.toFixed(1)}`,
      );
    }
  });

  /**
   * ⚠️ Ağırlık **göreli**, yüzde değil: 70 yazan kafe %70 almıyor, 70'in
   * toplam içindeki payını alıyor (burada ~%43). Panel bu yüzden yüzdeyi
   * girdinin hemen yanında gösteriyor — kafe yazdığı sayının karşılığını
   * anında görüyor ve gerekirse büyütüyor.
   *
   * Sınanan şey sayının kendisi değil, **kararın uygulanması**: otomatikte
   * en seyrek olan ödül artık en sık çıkan.
   */
  test("en pahalı ödül artık en sık çıkan — kafenin kararı uygulanıyor", async () => {
    const d = await carkAgirlik.durum(kafeId);
    const enPahali = d.satirlar.find((r) => r.odulId === odulIdler[3]);
    assert.ok(enPahali, "en pahalı ödül listede yok");

    const enYuksek = Math.max(...d.satirlar.map((r) => r.yuzde));
    assert.equal(enPahali.yuzde, enYuksek, "en pahalı ödül en sık çıkan olmadı");
    // Otomatikte %10'un altındaydı (yukarıdaki regresyon testi).
    assert.ok(enPahali.yuzde > 30, `yalnızca %${enPahali.yuzde}'e çıktı`);
  });

  /**
   * ⚠️ İlk yazım kalanları sabitliyor ve bunu yaparken **o anki dağılımı
   * koruyor**: kafe tek bir satıra dokunduğunda diğerlerinin olasılığı
   * kendiliğinden değişmemeli.
   */
  test("🔴 ilk yazım diğer ödüllerin payını bozmuyor", async () => {
    await otomatige();
    const once = await carkAgirlik.durum(kafeId);
    const oncekiPaylar = new Map(once.satirlar.map((r) => [r.odulId, r.yuzde]));

    // Dokunulan ödül, zaten sahip olduğu ağırlıkla yeniden yazılıyor:
    // sabitleme dışında hiçbir şey değişmemeli.
    const hedef = once.satirlar[1];
    await carkAgirlik.yaz({
      cafeId: kafeId,
      odulId: hedef.odulId,
      agirlik: hedef.etkin,
      aktorId: yoneticiId,
    });

    const sonra = await carkAgirlik.durum(kafeId);
    assert.equal(sonra.otomatikMi, false, "sabitleme olmadı");

    for (const r of sonra.satirlar) {
      assert.equal(
        r.yuzde,
        oncekiPaylar.get(r.odulId),
        `${r.odulId}: sabitleme payı değiştirdi`,
      );
      assert.notEqual(r.agirlik, null, `${r.odulId}: sabitlenmemiş satır kaldı`);
    }
  });

  test("🔴 ağırlığı sıfır olan ödül hiç çıkmıyor", async () => {
    await otomatige();
    await carkAgirlik.yaz({
      cafeId: kafeId,
      odulId: odulIdler[0],
      agirlik: 0,
      aktorId: yoneticiId,
    });

    const oduller = await withBypass("test: dilimler", (db) =>
      cark.odulleriOku(db, kafeId, 50_00),
    );
    const sayim = dagilim(oduller, 5000);
    assert.equal(sayim.get(odulIdler[0]) ?? 0, 0, "sıfır ağırlıklı ödül çarktan çıktı");
  });

  test("sıfır ağırlıklı ödül panelde 'çarkta çıkmaz' olarak görünüyor", async () => {
    const d = await carkAgirlik.durum(kafeId);
    const satir = d.satirlar.find((r) => r.odulId === odulIdler[0]);
    assert.equal(satir?.etkin, 0);
    assert.equal(satir?.yuzde, 0);
  });

  /**
   * 🔴 "Çarkta hiçbir ödül çıkmasın" geçerli bir yapılandırma değil:
   * çark dönecek bir şey bulamaz ve oyuncuya boş ekran kalır.
   */
  test("🔴 son ödülün de ağırlığı sıfırlanamıyor", async () => {
    await otomatige();
    for (const id of odulIdler.slice(0, -1)) {
      const s = await carkAgirlik.yaz({
        cafeId: kafeId,
        odulId: id,
        agirlik: 0,
        aktorId: yoneticiId,
      });
      assert.ok(s.ok, s.ok === false ? s.hata : "");
    }

    const son = await carkAgirlik.yaz({
      cafeId: kafeId,
      odulId: odulIdler[odulIdler.length - 1],
      agirlik: 0,
      aktorId: yoneticiId,
    });
    assert.equal(son.ok, false, "bütün ödüllerin ağırlığı sıfırlanabildi");
  });

  /** Veri elle bozulsa bile çark boş dönmemeli — okuma tarafı savunması. */
  test("hepsi elle sıfırlansa bile çekiliş otomatiğe düşüyor", async () => {
    await yoneticiSorgu(`UPDATE rewards SET wheel_weight = 0 WHERE id LIKE 'rwd_agirlik_%'`);

    const oduller = await withBypass("test: dilimler", (db) =>
      cark.odulleriOku(db, kafeId, 50_00),
    );
    const kovalar = cark.agirliklar(oduller);
    assert.ok(
      kovalar.some((k) => k > 0),
      "bütün ağırlıklar sıfır kaldı — çark dönemez",
    );
    await otomatige();
  });

  test("aralık dışı ağırlık reddediliyor", async () => {
    for (const deger of [-1, 101, 1.5]) {
      const s = await carkAgirlik.yaz({
        cafeId: kafeId,
        odulId: odulIdler[0],
        agirlik: deger,
        aktorId: yoneticiId,
      });
      assert.equal(s.ok, false, `${deger} kabul edildi`);
    }
  });

  test("çarkta olmayan ödüle ağırlık yazılamıyor", async () => {
    const s = await carkAgirlik.yaz({
      cafeId: kafeId,
      odulId: newId("rwd"),
      agirlik: 10,
      aktorId: yoneticiId,
    });
    assert.equal(s.ok, false);
  });

  test("otomatiğe dön hepsini NULL yapıyor", async () => {
    await carkAgirlik.yaz({
      cafeId: kafeId,
      odulId: odulIdler[0],
      agirlik: 10,
      aktorId: yoneticiId,
    });
    await otomatige();

    const d = await carkAgirlik.durum(kafeId);
    assert.equal(d.otomatikMi, true);
    assert.ok(d.satirlar.every((r) => r.agirlik === null), "geride yazılı ağırlık kaldı");
  });
});

/* ── Çarkta olmayanlar ─────────────────────────────────────── */

describe("çarkta olmayan ödüller sebebiyle listeleniyor", () => {
  /**
   * ⚠️ Ü103'te kapatılan "çarkta görünen ama asla çıkmayan dilim"
   * probleminin panel tarafı: kafe bir ödüle ağırlık verip onun hiç
   * çıkmadığını görmemelidir.
   */
  test("üst sınırın üstündeki ödül sebebiyle ayrı listede", async () => {
    await otomatige();
    await ayar.sayiYaz({
      cafeId: kafeId,
      anahtar: ayar.ANAHTARLAR.carkUstSinir,
      deger: 32_00,
      aktorId: yoneticiId,
    });

    try {
      const d = await carkAgirlik.durum(kafeId);
      const disarida = d.disarida.filter((x) => x.odulId.startsWith("rwd_agirlik_"));
      assert.ok(disarida.length >= 2, "üst sınırın üstündekiler listeye düşmedi");
      assert.ok(
        disarida.every((x) => x.sebep === "ust_sinir"),
        `beklenmeyen sebep: ${disarida.map((x) => x.sebep).join(", ")}`,
      );
      assert.ok(
        d.satirlar.every((r) => r.kurusDegeri <= 32_00),
        "sınırın üstündeki ödül çark listesinde kaldı",
      );
    } finally {
      await ayar.sayiYaz({
        cafeId: kafeId,
        anahtar: ayar.ANAHTARLAR.carkUstSinir,
        deger: 50_00,
        aktorId: yoneticiId,
      });
    }
  });

  test("her sebebin kafeye söylenecek bir cümlesi var", () => {
    for (const s of ["ust_sinir", "gunluk_doldu", "dilim_disi"] as const) {
      const metin = carkAgirlik.sebepMetni(s, 35_00);
      assert.ok(metin.length > 20, `${s} için cümle yok`);
    }
  });
});
