import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as qr from "@/domain/qr";
import * as masa from "@/domain/masa";
import * as masaYonetim from "@/domain/masa-yonetim";
import * as kupon from "@/domain/kupon";
import * as odul from "@/domain/odul";
import { yoneticiSorgu, benzersizEposta } from "./_yardim";

/**
 * KAREKOD ZİNCİRİ — uçtan uca (Ü132).
 *
 * ── Neden bu dosya var ──────────────────────────────────────
 *
 * Karekodun iki ucu ayrı ayrı sınanıyordu: kafe karekodunun çözülmesi
 * `kafe-paneli`de, kupon karekodunun kasada okunması `kupon-kasa`da.
 * İkisini **birbirine bağlayan** hiçbir test yoktu — yani "karekodu
 * okuttum, oynadım, kazandım, kasada kullandım" yolculuğunun tamamı
 * hiçbir zaman tek seferde koşmamıştı.
 *
 * Ürün sahibi tam olarak bunu sordu: *"qrları test etmemiz gerekiyor,
 * tüm qrlar çalışabilmeli."*
 *
 * ── Sistemde KAÇ karekod var ────────────────────────────────
 *
 * İki tane, ve bu sayı Ü127'den beri sabit:
 *
 *   1. **Kafe karekodu** — duvara asılan. `/m/{kod}` adresini taşıyor,
 *      `qr.masaCoz` ile kafeye çözülüyor. Kafe başına **bir** tane
 *      (`cafe_tables_tek_aktif`).
 *   2. **Kupon karekodu** — oyuncunun telefonunda, kasada okutulan.
 *      `coupons.qr_token` değerini taşıyor; `kupon.coz` ile açılıyor.
 *      Kamera çalışmazsa 6 haneli `code` aynı kuponu açıyor (Ü19).
 *
 * ⚠️ **"Ödeme karekodu" diye ayrı bir şey YOK** ve olmamalı: Looply
 * ödeme almıyor, indirim veriyor. Kasada okutulan karekod bir ödeme
 * aracı değil, kuponun kimliği — TL değerini yalnızca kasiyer görüyor
 * (E9) ve para kafenin kendi kasasında el değiştiriyor.
 */

/** Kafenin açık olduğu bir an — bütçe temposu kapalıyken kupon çıkmıyor (Ü90). */
const KAFE_ACIK = new Date(new Date().setHours(14, 0, 0, 0));

const KAFE_LAT = 41.0369;
const KAFE_LNG = 28.9838;

let kafeA = "";
let kafeB = "";
let kasiyerA = "";
let oyuncuId = "";
let odulId = "";

const TABAN = 4_000_000 + randomInt(4_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0557${String(TABAN + sayac++).slice(-7)}`);

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const y = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [a!.id],
    );
    const k = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'cashier' AND active LIMIT 1",
      [a!.id],
    );
    const o = await db.one<{ id: string }>(
      "SELECT id FROM rewards WHERE cafe_id = $1 AND active ORDER BY cost_kurus LIMIT 1",
      [a!.id],
    );
    return { a: a?.id, b: b?.id, y: y?.id, k: k?.id, o: o?.id };
  });
  assert.ok(v.a && v.b && v.y && v.k && v.o, "Tohum verisi yok — önce: npm run db:seed");
  kafeA = v.a;
  kafeB = v.b;
  kasiyerA = v.k;
  odulId = v.o;

  // Konum olmadan K2 hiç doğrulanamaz ve zincir ilk adımda kopar.
  await yoneticiSorgu(`UPDATE cafes SET lat = $2, lng = $3 WHERE id = $1`, [
    kafeA,
    KAFE_LAT,
    KAFE_LNG,
  ]);

  const p = await kaydet({
    telefon: yeniTelefon(),
    eposta: benzersizEposta(),
    ad: "Karekod",
    soyad: "Testi",
    dogumYili: 1995,
    pazarlamaIzni: false,
  });
  oyuncuId = p.oyuncu.id;
});

after(async () => {
  await yoneticiSorgu(`DELETE FROM coupon_events WHERE coupon_id IN
    (SELECT id FROM coupons WHERE player_id = $1)`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM coupons WHERE player_id = $1`, [oyuncuId]);
  await yoneticiSorgu(`DELETE FROM table_sessions WHERE player_id = $1`, [oyuncuId]);
  await closePools();
});

/**
 * Belirli bir ödülden kupon üretir.
 *
 * ⚠️ `anlikOdulVer` DEĞİL: o şansa bağlı ve hangi ödülün çıkacağını motor
 * seçiyor — bazen hiç çıkmıyor. Karekod zincirini sınayan bir test, ödül
 * motorunun rastgeleliğine takılıp rastgele kırılmamalı. `carkOduluVer`
 * verilen ödülü veriyor.
 */
async function kuponUret() {
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

describe("karekod zinciri — uçtan uca (Ü132)", () => {
  test("🔴 TAM YOLCULUK: kafe karekodu → oturum → konum → kupon → kasa", async () => {
    /* ── 1. Duvardaki karekod okutuluyor ─────────────────── */
    const karekod = await masaYonetim.kafeKarekodu(kafeA);
    const cozum = await qr.masaCoz(karekod.kod);
    assert.ok(cozum, "duvardaki karekod çözülemedi — zincirin ilk halkası kopuk");
    assert.equal(cozum.cafeId, kafeA, "karekod başka kafeye çözüldü");

    await qr.taramaKaydet(cozum.cafeId, cozum.tableId);

    /* ── 2. Oturum açılıyor, K1 baştan var ───────────────── */
    await masa.ac({ cafeId: cozum.cafeId, tableId: cozum.tableId, playerId: oyuncuId });
    const oturum = await masa.aktif(oyuncuId);
    assert.ok(oturum, "karekod okutuldu ama oturum açılmadı");
    assert.equal(oturum.kanitMaskesi & masa.K1, masa.K1, "karekod K1 vermeliydi");

    /* ── 3. Konum doğrulanıyor → K2 ──────────────────────── */
    // ~40 metre kuzey; varsayılan yarıçap 150 m.
    const konum = await masa.konumDogrula(oyuncuId, KAFE_LAT + 0.00036, KAFE_LNG);
    assert.equal(konum.durum, "dogrulandi", "kafenin dibindeki oyuncu doğrulanamadı");

    const k2li = await masa.aktif(oyuncuId);
    assert.equal(k2li!.kanitMaskesi & masa.K2, masa.K2, "konum K2 vermeliydi");

    /* ── 4. Kupon üretiliyor — ve BEKLİYOR (Ü269) ───────────── */
    const sonuc = await kuponUret();
    assert.ok(sonuc?.ok, "kanıtı tam oyuncuya kupon çıkmadı");

    /*
      Ü269: her ödül kafenin aktivasyon saati kadar sonra açılıyor. Burada
      önce eşik tavana çekilip erteleme kapatılıyordu — zincir artık
      gerçek yolculuğu izliyor: kupon bekliyor, kasa onu henüz kabul
      etmiyor, saat gelince açılıyor.
    */
    const bekleyen = await odul.kuponDetayi(oyuncuId, sonuc.kuponId);
    assert.equal(bekleyen?.durum, "beklemede", "kupon hemen açıldı — Ü269 her ödülü erteliyor");
    const erken = await kupon.coz(kafeA, sonuc.kod);
    assert.equal(
      erken.bulundu === true ? erken.gecerli : null,
      false,
      "açılmamış kupon kasada geçerli göründü",
    );

    // Saat geldi. Kuponun hâline `status` değil ZAMAN karar veriyor
    // (kupon-kasa · "ertelenmiş kupon"); açılma anını geçmişe almak yetiyor.
    await yoneticiSorgu(
      `UPDATE coupons SET activates_at = now() - interval '1 minute' WHERE id = $1`,
      [sonuc.kuponId],
    );

    /* ── 5. Kuponun karekodu oyuncunun telefonunda ───────── */
    const detay = await odul.kuponDetayi(oyuncuId, sonuc.kuponId);
    assert.ok(detay, "kupon oyuncunun envanterinde görünmüyor");
    assert.equal(detay.durum, "kullanilabilir", "kupon kasada gösterilebilir olmalıydı");
    assert.ok(detay.jeton.length > 10, "kupon karekodunun taşıyacağı jeton yok");
    assert.match(detay.kod, /^[A-Z0-9]{4,8}$/, "yedek kod beklenen biçimde değil");

    // ⚠️ E9: oyuncunun gördüğü kayıtta TL yok. Karekod zinciri boyunca
    // değer sızmamalı — kasiyerin ekranı ayrı bir yol.
    for (const alan of Object.keys(detay)) {
      assert.ok(
        !/kurus|tutar|deger|fiyat|price|amount/i.test(alan),
        `kupon detayında para alanı sızmış: ${alan}`,
      );
    }

    /* ── 6. Kasiyer karekodu okutuyor ────────────────────── */
    const kasada = await kupon.coz(kafeA, detay.jeton);
    assert.ok(kasada.bulundu, "kupon karekodu kasada okunamadı");
    assert.ok(kasada.gecerli, `kasada geçersiz göründü: ${kasada.sebep ?? ""}`);


    /* ── 7. Onaylanıyor ──────────────────────────────────── */
    const onay = await kupon.onayla({
      cafeId: kafeA,
      kuponId: sonuc.kuponId,
      staffId: kasiyerA,
    });
    assert.ok(onay.ok, `onay geçmedi: ${onay.ok ? "" : onay.hata}`);

    /* ── 8. Zincir kapandı: kupon artık kullanılmış ──────── */
    const sonra = await kupon.coz(kafeA, detay.jeton);
    assert.ok(sonra.bulundu, "kupon kayboldu");
    assert.equal(sonra.gecerli, false, "kullanılmış kupon hâlâ geçerli görünüyor");

    const envanter = await odul.envanter(oyuncuId);
    assert.ok(
      envanter.kullanilan.some((k) => k.id === sonuc.kuponId),
      "kullanılan kupon 'Kullandıkların' listesine düşmedi",
    );
  });

  test("kupon karekodu ve yedek kod aynı kuponu açıyor — ikisi de çalışır", async () => {
    const sonuc = await kuponUret();
    assert.ok(sonuc?.ok, "kupon üretilemedi");

    const detay = await odul.kuponDetayi(oyuncuId, sonuc.kuponId);
    const jetonla = await kupon.coz(kafeA, detay!.jeton);
    const kodla = await kupon.coz(kafeA, detay!.kod);

    assert.ok(jetonla.bulundu, "kupon karekodundan bulunamadı");
    assert.ok(kodla.bulundu, "kupon yedek koddan bulunamadı");
    assert.equal(
      jetonla.kuponId,
      kodla.kuponId,
      "karekod ve yedek kod farklı kuponlara çözülüyor",
    );

    // Küçük harf yazan kasiyer de bulabilmeli — kod büyük harf basılıyor.
    const kucukle = await kupon.coz(kafeA, detay!.kod.toLowerCase());
    assert.ok(kucukle.bulundu, "yedek kod büyük/küçük harfe takılıyor");
  });

  test("🔴 kupon karekodu BAŞKA kafede okunmuyor (G12)", async () => {
    const sonuc = await kuponUret();
    assert.ok(sonuc?.ok);

    const detay = await odul.kuponDetayi(oyuncuId, sonuc.kuponId);

    // A'nın kuponu B'nin kasasında: bulunmamalı. Bulunsaydı bir kafenin
    // bütçesinden çıkan indirim başka kafede kullanılırdı.
    const bKasasi = await kupon.coz(kafeB, detay!.jeton);
    assert.equal(bKasasi.bulundu, false, "başka kafenin kuponu okundu");

    const bKodla = await kupon.coz(kafeB, detay!.kod);
    assert.equal(bKodla.bulundu, false, "başka kafenin kuponu yedek koddan okundu");
  });

  test("🔴 kafe karekodu kapatılınca çözülmüyor — ölü etiket kabul edilmiyor", async () => {
    const karekod = await masaYonetim.kafeKarekodu(kafeA);
    assert.ok(await qr.masaCoz(karekod.kod), "kurulum: karekod açıkken çözülmüyor");

    await yoneticiSorgu(`UPDATE cafe_tables SET active = false WHERE id = $1`, [karekod.id]);
    assert.equal(await qr.masaCoz(karekod.kod), null, "kapalı karekod hâlâ çözülüyor");

    // Geri aç — sonraki testler ve tohum verisi buna güveniyor.
    await yoneticiSorgu(`UPDATE cafe_tables SET active = true WHERE id = $1`, [karekod.id]);
  });

  test("uydurma karekod ve bozuk biçim reddediliyor", async () => {
    // Biçim tutuyor ama böyle bir kod yok.
    assert.equal(await qr.masaCoz("0".repeat(16)), null, "uydurma kod çözüldü");
    // Biçim hiç tutmuyor — SQL'e gitmeden elenmeli.
    assert.equal(await qr.masaCoz("kisa"), null);
    assert.equal(await qr.masaCoz("ZZZZZZZZZZZZZZZZ"), null, "hex olmayan kod çözüldü");
    assert.equal(await qr.masaCoz("'; DROP TABLE cafes;--"), null);

    // Kasa tarafı da aynı şekilde: kısa girdi sorguya hiç gitmiyor.
    const bos = await kupon.coz(kafeA, "ab");
    assert.equal(bos.bulundu, false, "kısa girdi kupon arayışına girdi");
  });
});
