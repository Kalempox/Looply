import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import * as cafe from "@/domain/cafe";
import { decryptPII, phoneIndex } from "@/lib/crypto";
import { yoneticiSorgu } from "./_yardim";

/**
 * Ü125 — panelden şube başvurusu.
 *
 * Sınanan iddialar:
 *   1. Şube `pending` doğuyor — G5 kapısı panelden delinemiyor
 *   2. Tüzel kişi ve yetkili ana şubeden devralınıyor
 *   3. Menü ve ödül kataloğu kopyalanıyor, **kimlikler yeniden üretiliyor**
 *   4. Kopyalanan ödülün ürün bağı YENİ şubenin ürününe gidiyor (izolasyon)
 *   5. Bütçe ve konum kopyalanmıyor
 *   6. Başka kafenin yöneticisi adına şube açılamıyor (Değişmez kural #3)
 *   7. Onaydan sonra şube seçicide beliriyor — telefon üzerinden bağlanıyor
 */

let kafeA = "";
let yoneticiA = "";
let yoneticiB = "";
const acilanlar: string[] = [];

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const ya = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [a!.id],
    );
    const yb = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [b!.id],
    );
    return { a: a?.id, b: b?.id, ya: ya?.id, yb: yb?.id };
  });
  assert.ok(v.a && v.b && v.ya && v.yb, "Tohum verisi yok — önce: npm run db:seed");
  kafeA = v.a;
  yoneticiA = v.ya;
  yoneticiB = v.yb;
});

after(async () => {
  // Bu testin açtığı şubeler ve onların devraldığı satırlar. Sıra zorunlu:
  // ödüller ürüne, ürünler kategoriye bakıyor.
  for (const id of acilanlar) {
    await yoneticiSorgu("DELETE FROM rewards WHERE cafe_id = $1", [id]);
    await yoneticiSorgu("DELETE FROM products WHERE cafe_id = $1", [id]);
    await yoneticiSorgu("DELETE FROM product_categories WHERE cafe_id = $1", [id]);
    await yoneticiSorgu("DELETE FROM staff WHERE cafe_id = $1", [id]);
    await yoneticiSorgu("DELETE FROM audit_log WHERE target_id = $1", [id]);
    await yoneticiSorgu("DELETE FROM cafes WHERE id = $1", [id]);
  }
  await closePools();
});

async function subeAc(ad: string) {
  const sonuc = await cafe.subeBasvurusu({
    cafeId: kafeA,
    staffId: yoneticiA,
    ad,
    sehir: "Ankara",
  });
  assert.ok(sonuc.ok, `şube açılmalıydı: ${sonuc.ok ? "" : sonuc.hata}`);
  acilanlar.push(sonuc.cafeId);
  return sonuc.cafeId;
}

describe("şube başvurusu (Ü125)", () => {
  test("şube 'pending' doğuyor — G5 panelden delinmiyor", async () => {
    const subeId = await subeAc("Test Şube Onay");

    const satir = await withBypass("test: şube durumu", (db) =>
      db.one<{ status: string; parent_cafe_id: string | null }>(
        "SELECT status, parent_cafe_id FROM cafes WHERE id = $1",
        [subeId],
      ),
    );

    assert.equal(satir!.status, "pending", "şube onaysız açılamaz");
    assert.equal(satir!.parent_cafe_id, kafeA, "ana şubeye bağlanmalı");
  });

  test("tüzel kişi ve yetkili ana şubeden devralınıyor", async () => {
    const subeId = await subeAc("Test Şube Devir");

    type Kunye = {
      legal_name_enc: Buffer | null;
      tax_no_enc: Buffer | null;
      contact_phone_enc: Buffer;
    };
    const [ana, sube] = await withBypass("test: devir", (db) =>
      Promise.all([
        db.one<Kunye>(
          "SELECT legal_name_enc, tax_no_enc, contact_phone_enc FROM cafes WHERE id = $1",
          [kafeA],
        ),
        db.one<Kunye>(
          "SELECT legal_name_enc, tax_no_enc, contact_phone_enc FROM cafes WHERE id = $1",
          [subeId],
        ),
      ]),
    );

    // ⚠️ Blob eşitliği aranmıyor: her şifreleme yeni IV üretiyor, aynı metin
    // iki farklı blob veriyor. Çözülmüş değer karşılaştırılıyor.
    //
    // ⚠️ `null` da geçerli bir devir: tohumdaki kafenin ticari unvanı ve
    // vergi numarası boş (başvuru akışından değil, tohumdan doğdu). Sınanan
    // şey "dolu" olması değil, şubenin ana şubeyle **aynı** olması.
    const coz = (b: Buffer | null) => (b === null ? null : decryptPII(b));
    assert.equal(coz(sube!.legal_name_enc), coz(ana!.legal_name_enc), "ticari unvan devralınmalı");
    assert.equal(coz(sube!.tax_no_enc), coz(ana!.tax_no_enc), "vergi numarası devralınmalı");

    // Yetkili telefonu: onay anında yönetici satırını bu alan üretecek.
    // Ana şubenin YÖNETİCİSİNİN numarası olmalı — şube bağı buradan kuruluyor.
    const yonetici = await withBypass("test: yönetici telefonu", (db) =>
      db.one<{ phone_enc: Buffer }>("SELECT phone_enc FROM staff WHERE id = $1", [yoneticiA]),
    );
    assert.equal(
      decryptPII(sube!.contact_phone_enc),
      decryptPII(yonetici!.phone_enc),
      "şubenin yetkili numarası, sahibin kendi numarası olmalı",
    );
  });

  test("menü ve ödül kataloğu kopyalanıyor — kimlikler yeniden üretiliyor", async () => {
    const subeId = await subeAc("Test Şube Kopya");

    const sayim = await withBypass("test: kopya sayımı", async (db) => {
      const say = async (tablo: string, id: string) =>
        Number(
          (await db.one<{ n: string }>(`SELECT count(*) AS n FROM ${tablo} WHERE cafe_id = $1`, [
            id,
          ]))!.n,
        );
      return {
        anaKategori: await say("product_categories", kafeA),
        subeKategori: await say("product_categories", subeId),
        anaUrun: await say("products", kafeA),
        subeUrun: await say("products", subeId),
        anaOdul: await say("rewards", kafeA),
        subeOdul: await say("rewards", subeId),
      };
    });

    assert.equal(sayim.subeKategori, sayim.anaKategori, "kategoriler kopyalanmalı");
    assert.equal(sayim.subeUrun, sayim.anaUrun, "ürünler kopyalanmalı");
    assert.equal(sayim.subeOdul, sayim.anaOdul, "ödüller kopyalanmalı");
    assert.ok(sayim.anaUrun > 0, "tohumda ürün olmalı — yoksa test bir şey sınamıyor");

    // Kimlik çakışması olsaydı INSERT zaten patlardı; burada aranan şey
    // satırların gerçekten AYRI olması.
    const ortak = await withBypass("test: kimlik çakışması", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*) AS n FROM products p
          WHERE p.cafe_id = $1
            AND EXISTS (SELECT 1 FROM products q WHERE q.cafe_id = $2 AND q.id = p.id)`,
        [subeId, kafeA],
      ),
    );
    assert.equal(Number(ortak!.n), 0, "şube ürünleri ana şubeninkilerle aynı satır olamaz");
  });

  test("🔴 kopyalanan ödülün ürün bağı YENİ şubenin ürününe gidiyor", async () => {
    const subeId = await subeAc("Test Şube Bag");

    // Bağ çevrilmeseydi şubenin ödülü ana şubenin ürününe işaret ederdi —
    // kiracı izolasyonunu satır düzeyinde delen bir bağ.
    const kacak = await withBypass("test: ürün bağı", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*) AS n
           FROM rewards r JOIN products p ON p.id = r.product_id
          WHERE r.cafe_id = $1 AND p.cafe_id <> $1`,
        [subeId],
      ),
    );
    assert.equal(Number(kacak!.n), 0, "şubenin ödülü başka kafenin ürününe bağlanamaz");

    const kategoriKacak = await withBypass("test: kategori bağı", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*) AS n
           FROM products p JOIN product_categories k ON k.id = p.category_id
          WHERE p.cafe_id = $1 AND k.cafe_id <> $1`,
        [subeId],
      ),
    );
    assert.equal(Number(kategoriKacak!.n), 0, "şubenin ürünü başka kafenin kategorisine bağlanamaz");
  });

  test("bütçe ve konum kopyalanmıyor", async () => {
    const subeId = await subeAc("Test Şube Butce");

    const d = await withBypass("test: bütçe ve konum", async (db) => ({
      butce: Number(
        (await db.one<{ n: string }>(
          "SELECT count(*) AS n FROM budget_periods WHERE cafe_id = $1",
          [subeId],
        ))!.n,
      ),
      konum: await db.one<{ lat: number | null; lng: number | null }>(
        "SELECT lat, lng FROM cafes WHERE id = $1",
        [subeId],
      ),
    }));

    assert.equal(d.butce, 0, "bütçe devralınmamalı — ayrı bir para taahhüdü");
    assert.equal(d.konum!.lat, null, "konum devralınmamalı — K2'nin dayanağı şubeye özel");
    assert.equal(d.konum!.lng, null);
  });

  test("🔴 başka kafenin yöneticisi adına şube açılamaz", async () => {
    // B'nin yöneticisi, A'nın kimliğiyle şube açmaya çalışıyor.
    const sonuc = await cafe.subeBasvurusu({
      cafeId: kafeA,
      staffId: yoneticiB,
      ad: "Sızma Şubesi",
      sehir: "İzmir",
    });

    assert.equal(sonuc.ok, false, "eşleşmeyen personel/kafe çifti reddedilmeli");

    const kacak = await withBypass("test: sızma kontrolü", (db) =>
      db.one<{ n: string }>("SELECT count(*) AS n FROM cafes WHERE name = $1", ["Sızma Şubesi"]),
    );
    assert.equal(Number(kacak!.n), 0, "reddedilen başvuru satır bırakmamalı");
  });

  test("geçersiz alanlar reddediliyor", async () => {
    // Ü126: adres alanı kalktı — kafenin yeri onay sonrası konum
    // ekranında koordinatla belirleniyor.
    for (const [alan, opts] of [
      ["ad (kısa)", { ad: "X", sehir: "Ankara" }],
      ["ad (uzun)", { ad: "Ş".repeat(81), sehir: "Ankara" }],
      ["şehir (kısa)", { ad: "Şube", sehir: "A" }],
      ["şehir (uzun)", { ad: "Şube", sehir: "A".repeat(41) }],
    ] as const) {
      const sonuc = await cafe.subeBasvurusu({ cafeId: kafeA, staffId: yoneticiA, ...opts });
      assert.equal(sonuc.ok, false, `${alan} doğrulaması geçilmemeli`);
    }
  });

  test("onaydan sonra şube seçicide beliriyor — bağ telefondan kuruluyor", async () => {
    const subeId = await subeAc("Test Şube Secici");

    const oncesi = await cafe.subeler(yoneticiA);
    assert.ok(
      !oncesi.some((s) => s.cafeId === subeId),
      "onaysız şube seçicide görünmemeli — G5",
    );

    // Platformun mevcut onay akışı; şube için değiştirilmedi.
    const platformcu = await withBypass("test: platform kullanıcısı", (db) =>
      db.one<{ id: string }>("SELECT id FROM platform_users LIMIT 1"),
    );
    assert.ok(platformcu, "tohumda platform kullanıcısı yok");
    const onay = await cafe.onayla(subeId, platformcu.id);
    assert.ok(onay.ok, "şube onaylanabilmeli");

    const sonrasi = await cafe.subeler(yoneticiA);
    assert.ok(
      sonrasi.some((s) => s.cafeId === subeId),
      "onaylı şube seçicide görünmeli",
    );

    // Bağın telefondan kurulduğunun kanıtı: yeni yönetici satırının
    // phone_index'i ana şubenin yöneticisiyle aynı (0026).
    const eslesme = await withBypass("test: telefon bağı", async (db) => {
      const ana = await db.one<{ phone_index: Buffer }>(
        "SELECT phone_index FROM staff WHERE id = $1",
        [yoneticiA],
      );
      const yeni = await db.one<{ phone_index: Buffer; role: string }>(
        "SELECT phone_index, role FROM staff WHERE cafe_id = $1",
        [subeId],
      );
      return { ana: ana!.phone_index, yeni: yeni!.phone_index, rol: yeni!.role };
    });

    assert.equal(eslesme.rol, "manager", "onay yönetici satırı üretmeli");
    assert.ok(
      eslesme.ana.equals(eslesme.yeni),
      "şube bağı phone_index üzerinden kurulmalı (0026)",
    );
    // phoneIndex deterministik olmasaydı bağ hiç kurulamazdı — yukarıdaki
    // eşitlik onu da sınıyor; import boşa durmasın diye açıkça yazılıyor.
    assert.equal(typeof phoneIndex, "function");
  });

  test("onay ekranı şubeyi şube olarak görüyor — belge satırı yanıltmıyor", async () => {
    const subeId = await subeAc("Test Şube Onaycı");

    const bekleyenler = await cafe.basvurulariListele("pending");
    const kayit = bekleyenler.find((b) => b.id === subeId);
    assert.ok(kayit, "şube başvurusu onay listesine düşmeli");

    // Onaycının bağlamı: sıfırdan işletme mi, onaylanmış birinin şubesi mi.
    assert.equal(kayit.anaSubeAdi, "Kafe A", "ana işletmenin adı görünmeli");

    // ⚠️ Şubenin kendi belgesi YOK ve olmaması doğru — vergi levhası ana
    // işletmenin dosyasında. Ekran bu durumda "yüklenmemiş" yazsaydı
    // onaycı eksik evrak sanıp reddederdi; ayrımı `anaSubeAdi` sağlıyor.
    assert.equal(kayit.belgeler.length, 0, "şube ayrı belge vermiyor");

    // Kök kafe bu alanı boş bırakmalı, yoksa her başvuru şube görünürdü.
    const kokKayit = bekleyenler.find((b) => b.anaSubeAdi === null);
    assert.ok(
      kokKayit === undefined || kokKayit.id !== subeId,
      "şube kaydı kök gibi görünmemeli",
    );
  });

  test("şube listesi onay bekleyeni de gösteriyor", async () => {
    const subeId = await subeAc("Test Şube Liste");
    const liste = await cafe.subeDurumlari(yoneticiA, kafeA);

    const yeni = liste.find((s) => s.cafeId === subeId);
    assert.ok(yeni, "bekleyen şube listede olmalı — yoksa sahibi formu ikinci kez doldurur");
    assert.equal(yeni.durum, "pending");

    const acik = liste.find((s) => s.acikOlan);
    assert.equal(acik?.cafeId, kafeA, "açık şube işaretlenmeli");
  });
});
