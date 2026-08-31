import "../scripts/_env";
import { test, before, after, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kodIste, kodDogrula, MAX_DENEME } from "@/domain/otp";
import { masaCoz, basiliKod, biletUret, biletCoz, taramaKaydet } from "@/domain/qr";
import { kaydet, telefonlaBul, numaraDegistir, odulKilidiBitis, takmaAd } from "@/domain/player";
import {
  belirle as parolaBelirle,
  varMi as parolaVarMi,
  girisDene as parolaDene,
  gecerliMi as parolaGecerliMi,
  kurallar as parolaKurallari,
  hataMetni as parolaHataMetni,
} from "@/domain/parola";
import { omurSaniye } from "@/domain/oturum-omru";
import { tavanDurumu, GUNLUK_TAVAN } from "@/sms";
import { basvuruOlustur, basvurulariListele, telefonuAc, onayla, yoneticiBul } from "@/domain/cafe";
import { phoneIndex, normalizePhone, hashOtp } from "@/lib/crypto";
import { yoneticiSorgu } from "./_yardim";

/**
 * FAZ 3 GÜVENLİK KAPISI — kimlik.
 *
 * docs/07 Faz 3 kapısındaki her madde burada çalıştırılabilir hâlde.
 * Ön koşul: npm run db:up && npm run db:migrate && npm run db:seed
 */

let kafeA = "";
let kafeB = "";

/**
 * Her KOŞU kendi numara aralığını kullanır.
 *
 * Sabit numara üretmek testleri kırılgan yapıyordu: önceki koşudan kalan
 * oyuncular bulunuyor, `kaydet` yeni hesap açmıyor ve rıza testleri
 * eski veriyi görüyordu. Testin geçmişten bağımsız olması şart.
 */
const TABAN = 2_000_000 + randomInt(6_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0555${String(TABAN + sayac++).slice(-7)}`);

/** Bu koşuda oluşturulanlar — sonunda temizlenir. */
const olusturulanOyuncular: string[] = [];
const olusturulanKafeler: string[] = [];

async function testOyuncu(opts: {
  telefon: string;
  ad?: string;
  soyad?: string;
  pazarlamaIzni?: boolean;
}) {
  const sonuc = await kaydet({
    telefon: opts.telefon,
    ad: opts.ad ?? "Test",
    soyad: opts.soyad ?? "Oyuncu",
    dogumYili: 1990,
    pazarlamaIzni: opts.pazarlamaIzni ?? false,
  });
  if (sonuc.yeni) olusturulanOyuncular.push(sonuc.oyuncu.id);
  return sonuc;
}

async function otpTemizle(telefon: string) {
  const ix = phoneIndex(telefon);
  await withBypass("test temizliği", (db) =>
    db.query(`DELETE FROM otp_challenges WHERE phone_index = $1`, [ix]),
  );
  // sms_outbox append-only: uygulama rolünde silme yetkisi yok
  await yoneticiSorgu(`DELETE FROM sms_outbox WHERE phone_index = $1`, [ix]);
}

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    return { a: a?.id, b: b?.id };
  });
  assert.ok(v.a && v.b, "Tohum verisi yok — önce: npm run db:seed");
  kafeA = v.a;
  kafeB = v.b;

  // Önceki koşudan kalıntı varsa temizle
  await yoneticiSorgu(`DELETE FROM sms_outbox WHERE id LIKE 'sms_test_%'`);
});

beforeEach(async () => {
  // Kota sayaçları testler arasında sıfırlanır; aksi halde testlerin
  // sırası sonucu belirler ve testler kırılgan olur.
  await withBypass("test: kota sıfırlama", (db) => db.query("DELETE FROM rate_limits"));
});

after(async () => {
  await yoneticiSorgu(`DELETE FROM sms_outbox WHERE id LIKE 'sms_test_%'`);
  for (const id of olusturulanKafeler) {
    await yoneticiSorgu(`DELETE FROM audit_log WHERE cafe_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM cafe_documents WHERE cafe_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM staff WHERE cafe_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM cafes WHERE id = $1`, [id]);
  }
  for (const id of olusturulanOyuncular) {
    await yoneticiSorgu(`DELETE FROM sms_outbox WHERE phone_index IN (SELECT phone_index FROM players WHERE id = $1)`, [id]);
    await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [id]);
  }
  await closePools();
});

describe("doğrulama kodu", () => {
  test("doğru kod kabul edilir ve tek kullanımlıktır", async () => {
    const tel = yeniTelefon();
    const istek = await kodIste({ telefon: tel, amac: "register" });
    assert.equal(istek.durum, "gonderildi");

    // Üretilen kod hiçbir yerde saklanmadığı için testte okunamıyor.
    // Bilinen bir kodun HMAC'ini yerleştirip doğrulama yolunu sınıyoruz.
    await withBypass("test: bilinen kod", (db) =>
      db.query(`UPDATE otp_challenges SET code_hmac = $2 WHERE phone_index = $1`, [
        phoneIndex(tel),
        hashOtp("123456"),
      ]),
    );

    assert.equal((await kodDogrula({ telefon: tel, kod: "123456", amac: "register" })).durum, "dogru");

    // Aynı kod ikinci kez çalışmamalı — doğrulanan kayıt anında silinir
    assert.equal((await kodDogrula({ telefon: tel, kod: "123456", amac: "register" })).durum, "yok");

    await otpTemizle(tel);
  });

  test("yanlış kod kalan deneme sayısını düşürür", async () => {
    const tel = yeniTelefon();
    await kodIste({ telefon: tel, amac: "register" });
    await withBypass("test: bilinen kod", (db) =>
      db.query(`UPDATE otp_challenges SET code_hmac = $2 WHERE phone_index = $1`, [
        phoneIndex(tel),
        hashOtp("123456"),
      ]),
    );

    const sonuc = await kodDogrula({ telefon: tel, kod: "999999", amac: "register" });
    assert.equal(sonuc.durum, "yanlis");
    if (sonuc.durum === "yanlis") assert.equal(sonuc.kalanDeneme, MAX_DENEME - 1);

    await otpTemizle(tel);
  });

  test("5 yanlış denemede numara kilitlenir", async () => {
    const tel = yeniTelefon();
    await kodIste({ telefon: tel, amac: "register" });

    let sonuc;
    for (let i = 0; i < MAX_DENEME; i++) {
      sonuc = await kodDogrula({ telefon: tel, kod: "111111", amac: "register" });
    }
    assert.equal(sonuc?.durum, "kilitlendi", "5. yanlış denemede kilitlenmeliydi");

    // Kilitliyken yeni kod da istenemez
    assert.equal((await kodIste({ telefon: tel, amac: "register" })).durum, "kilitli");

    await otpTemizle(tel);
  });

  test("süresi geçmiş kod reddedilir", async () => {
    const tel = yeniTelefon();
    await kodIste({ telefon: tel, amac: "register" });
    await withBypass("test: süre geçirme", (db) =>
      db.query(
        `UPDATE otp_challenges SET expires_at = now() - interval '1 minute' WHERE phone_index = $1`,
        [phoneIndex(tel)],
      ),
    );

    assert.equal((await kodDogrula({ telefon: tel, kod: "123456", amac: "register" })).durum, "sure_doldu");
    await otpTemizle(tel);
  });

  test("hiç kod istenmemişse doğrulama reddedilir", async () => {
    assert.equal(
      (await kodDogrula({ telefon: yeniTelefon(), kod: "123456", amac: "register" })).durum,
      "yok",
    );
  });

  test("aynı numaraya dakikada birden fazla SMS gitmez", async () => {
    const tel = yeniTelefon();
    assert.equal((await kodIste({ telefon: tel, amac: "register" })).durum, "gonderildi");
    assert.equal(
      (await kodIste({ telefon: tel, amac: "register" })).durum,
      "cok_sik",
      "dakikalık kota devreye girmeliydi",
    );
    await otpTemizle(tel);
  });

  test("düz kod hiçbir yerde saklanmıyor", async () => {
    const tel = yeniTelefon();
    await kodIste({ telefon: tel, amac: "register" });

    const kayit = await withBypass("test: otp satırı", (db) =>
      db.one<Record<string, unknown>>(`SELECT * FROM otp_challenges WHERE phone_index = $1`, [
        phoneIndex(tel),
      ]),
    );
    assert.ok(kayit);
    for (const [alan, deger] of Object.entries(kayit)) {
      if (typeof deger === "string") {
        assert.ok(!/^\d{6}$/.test(deger), `${alan} düz kod içeriyor olabilir`);
      }
    }

    // Mesaj defterinde de metin alanı yok (docs/08 §7.1)
    const sms = await withBypass("test: sms satırı", (db) =>
      db.one<Record<string, unknown>>(
        `SELECT * FROM sms_outbox WHERE phone_index = $1 ORDER BY created_at DESC LIMIT 1`,
        [phoneIndex(tel)],
      ),
    );
    assert.ok(sms, "gönderim deftere yazılmalı");
    assert.ok(!("body" in sms), "mesaj defterinde metin alanı olmamalı");

    await otpTemizle(tel);
  });
});

describe("global SMS tavanı (G14)", () => {
  async function tavanDoldur(adet: number) {
    await yoneticiSorgu(
      `INSERT INTO sms_outbox (id, phone_masked, phone_index, template, provider, status)
       SELECT 'sms_test_' || g, '0555 *** ** 00', $1, 'otp', 'console', 'sent'
         FROM generate_series(1, $2) g`,
      [phoneIndex(yeniTelefon()), adet],
    );
  }

  test("%90'da kayıt durur, giriş devam eder", async () => {
    await tavanDoldur(Math.ceil(GUNLUK_TAVAN * 0.92));

    const d = await tavanDurumu();
    assert.equal(d.kayitAcik, false, "%90 üstünde yeni kayıt durmalıydı");
    assert.equal(d.girisAcik, true, "mevcut kullanıcının girişi devam etmeliydi");

    assert.equal((await kodIste({ telefon: yeniTelefon(), amac: "register" })).durum, "kapasite_dolu");
    assert.equal(
      (await kodIste({ telefon: yeniTelefon(), amac: "login" })).durum,
      "gonderildi",
      "giriş kapatılmamalıydı — saldırganın işini görmüş oluruz",
    );

    await yoneticiSorgu(`DELETE FROM sms_outbox WHERE id LIKE 'sms_test_%'`);
  });

  test("%100'de her şey durur", async () => {
    await tavanDoldur(GUNLUK_TAVAN + 10);

    assert.equal((await tavanDurumu()).girisAcik, false);
    assert.equal((await kodIste({ telefon: yeniTelefon(), amac: "login" })).durum, "kapasite_dolu");

    await yoneticiSorgu(`DELETE FROM sms_outbox WHERE id LIKE 'sms_test_%'`);
  });
});

describe("masa karekodu (K1)", () => {
  async function masaAl(cafeId: string) {
    return withBypass("test: masa", (db) =>
      db.one<{ id: string; qr_secret: Buffer; label: string }>(
        `SELECT id, qr_secret, label FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1`,
        [cafeId],
      ),
    );
  }

  test("basılı kod masaya çözülüyor", async () => {
    const masa = await masaAl(kafeA);
    assert.ok(masa);
    const cozum = await masaCoz(basiliKod(masa.qr_secret));
    assert.ok(cozum, "geçerli kod çözülmeliydi");
    assert.equal(cozum.cafeId, kafeA);
    assert.equal(cozum.masaAdi, masa.label);
  });

  test("uydurma kod çözülmüyor", async () => {
    assert.equal(await masaCoz("0000000000000000"), null);
    assert.equal(await masaCoz("kisa"), null);
  });

  test("onaysız kafenin karekodu çalışmıyor (G5)", async () => {
    const masa = await masaAl(kafeB);
    const kod = basiliKod(masa!.qr_secret);
    assert.ok(await masaCoz(kod), "kafe onaylıyken çalışmalı");

    await yoneticiSorgu(`UPDATE cafes SET status = 'pending' WHERE id = $1`, [kafeB]);
    assert.equal(await masaCoz(kod), null, "onaysız kafede karekod çalışmamalı");
    await yoneticiSorgu(`UPDATE cafes SET status = 'approved' WHERE id = $1`, [kafeB]);
  });

  test("karekod okutma kaydı düşüyor", async () => {
    const masa = await masaAl(kafeA);
    const once = await withBypass("test: tarama sayısı", (db) =>
      db.one<{ n: string }>(`SELECT count(*) AS n FROM qr_tokens WHERE table_id = $1`, [masa!.id]),
    );

    await taramaKaydet(kafeA, masa!.id);

    const sonra = await withBypass("test: tarama sayısı", (db) =>
      db.one<{ n: string }>(`SELECT count(*) AS n FROM qr_tokens WHERE table_id = $1`, [masa!.id]),
    );
    assert.equal(Number(sonra!.n), Number(once!.n) + 1, "tarama kafenin defterine yazılmalı");
  });
});

describe("masa bileti", () => {
  /**
   * Bilet, karekod okutulduğunda HttpOnly çerezle veriliyor. İçeriği açık
   * ama imzasız üretilemiyor — bu yüzden kurcalama denemesi test ediliyor.
   */
  test("üretilen bilet çözülüyor", async () => {
    const bilet = biletUret(kafeA, "tbl_test");
    assert.deepEqual(biletCoz(bilet), { cafeId: kafeA, tableId: "tbl_test" });
  });

  test("kurcalanmış bilet reddediliyor", async () => {
    const bilet = biletUret(kafeA, "tbl_test");
    const [, tableId, son, imza] = bilet.split(".");

    // Başka kafenin kimliğini yazmayı dene — imza tutmamalı
    assert.equal(biletCoz(`${kafeB}.${tableId}.${son}.${imza}`), null);

    // Süreyi uzatmayı dene — imza tutmamalı
    assert.equal(biletCoz(`${kafeA}.${tableId}.${Number(son) + 3_600_000}.${imza}`), null);

    // Uydurma imza
    assert.equal(biletCoz(`${kafeA}.${tableId}.${son}.${"0".repeat(64)}`), null);
  });

  test("süresi geçmiş bilet reddediliyor", async () => {
    const govde = `${kafeA}.tbl_test.${Date.now() - 1000}`;
    // Geçerli imzayla ama süresi dolmuş: yine de reddedilmeli
    const gecerli = biletUret(kafeA, "tbl_test");
    const imza = gecerli.split(".")[3];
    assert.equal(biletCoz(`${govde}.${imza}`), null);
  });

  test("bozuk biçimli bilet reddediliyor", () => {
    assert.equal(biletCoz("saçma"), null);
    assert.equal(biletCoz("a.b.c"), null);
    assert.equal(biletCoz(""), null);
  });
});

describe("oyuncu hesabı", () => {
  test("telefon ve isim veritabanında düz metin durmuyor", async () => {
    const tel = yeniTelefon();
    const { oyuncu } = await testOyuncu({ telefon: tel, ad: "Ahmet", soyad: "Yılmaz" });

    const ham = await withBypass("test: ham satır", (db) =>
      db.one<Record<string, unknown>>(
        `SELECT id, phone_enc::text AS p, first_name_enc::text AS a, last_name_enc::text AS s
           FROM players WHERE id = $1`,
        [oyuncu.id],
      ),
    );

    const govde = JSON.stringify(ham);
    assert.ok(!govde.includes(tel.replace(/\D/g, "")), "telefon düz metin görünüyor");
    assert.ok(!govde.includes("Ahmet"), "ad düz metin görünüyor");
    assert.ok(!govde.includes("Yılmaz"), "soyad düz metin görünüyor");
  });

  test("aynı numarayla ikinci kayıt yeni hesap açmıyor", async () => {
    const tel = yeniTelefon();
    const ilk = await testOyuncu({ telefon: tel, ad: "A", soyad: "B" });
    const ikinci = await testOyuncu({ telefon: tel, ad: "C", soyad: "D" });

    assert.equal(ilk.yeni, true);
    assert.equal(ikinci.yeni, false);
    assert.equal(ilk.oyuncu.id, ikinci.oyuncu.id);
  });

  test("pazarlama izni ayrı rıza satırı olarak yazılıyor (G7)", async () => {
    const { oyuncu } = await testOyuncu({ telefon: yeniTelefon(), pazarlamaIzni: true });
    const rizalar = await withBypass("test: rızalar", (db) =>
      db.all<{ kind: string }>(`SELECT kind FROM player_consents WHERE player_id = $1`, [oyuncu.id]),
    );
    assert.deepEqual(rizalar.map((r) => r.kind).sort(), ["commercial_message", "privacy_notice"]);
  });

  test("izin verilmediğinde ticari ileti satırı yazılmıyor", async () => {
    const { oyuncu } = await testOyuncu({ telefon: yeniTelefon(), pazarlamaIzni: false });
    const rizalar = await withBypass("test: rızalar", (db) =>
      db.all<{ kind: string }>(`SELECT kind FROM player_consents WHERE player_id = $1`, [oyuncu.id]),
    );
    assert.deepEqual(rizalar.map((r) => r.kind), ["privacy_notice"]);
  });

  test("anonim kod her kafede farklı (G1)", async () => {
    const { oyuncu } = await testOyuncu({ telefon: yeniTelefon() });

    const a = await takmaAd(kafeA, oyuncu.id);
    const b = await takmaAd(kafeB, oyuncu.id);
    assert.notEqual(a, b, "aynı oyuncunun kodu iki kafede aynı olmamalı");

    // İkinci çağrı aynı kodu döndürmeli — her seferinde yeni üretmemeli
    assert.equal(await takmaAd(kafeA, oyuncu.id), a);
  });
});

describe("kafe başvurusu ve onayı", () => {
  /**
   * Bu test bir açıktan doğdu: başvuru listesi yetkilinin TAM telefon
   * numarasını dönüyordu ve `platform_destek` rolü de onu görüyordu.
   * G9 tam olarak bunu engellemek için vardı. Artık liste hiçbir role
   * tam numara vermiyor; açmak ayrı bir işlem ve denetim izine düşüyor.
   */
  test("başvuru listesi tam telefon numarası sızdırmıyor (G9)", async () => {
    const telefon = yeniTelefon();
    const olusan = await basvuruOlustur({
      ad: "Test Kafe",
      yasalAd: "Test Kafe Ltd.",
      vergiNo: "1234567890",
      sehir: "Ankara",
      adres: "Test adresi, no 1",
      yetkiliAdi: "Test Yetkili",
      yetkiliTelefon: telefon,
    });
    assert.ok("cafeId" in olusan, "başvuru oluşmalıydı");
    olusturulanKafeler.push(olusan.cafeId);

    const liste = await basvurulariListele("pending");
    const kayit = liste.find((b) => b.id === olusan.cafeId);
    assert.ok(kayit);

    const rakamlar = telefon.replace(/\D/g, "");
    const govde = JSON.stringify(kayit);
    assert.ok(!govde.includes(rakamlar), "listede tam telefon numarası görünüyor");
    assert.ok(kayit.yetkiliTelefonMaskeli?.includes("***"), "maskeli numara beklenirdi");
  });

  test("telefonu açmak denetim izine düşüyor", async () => {
    const telefon = yeniTelefon();
    const olusan = await basvuruOlustur({
      ad: "Denetim Kafe",
      yasalAd: "Denetim Ltd.",
      vergiNo: "9876543210",
      sehir: "İzmir",
      adres: "Denetim adresi, no 2",
      yetkiliAdi: "Denetim Yetkili",
      yetkiliTelefon: telefon,
    });
    assert.ok("cafeId" in olusan);
    olusturulanKafeler.push(olusan.cafeId);

    const acilan = await telefonuAc(olusan.cafeId, "pu_test", "test gerekçesi");
    assert.equal(acilan, telefon, "yönetici tam numarayı görebilmeli");

    const kayit = await withBypass("test: denetim izi", (db) =>
      db.one<{ action: string }>(
        `SELECT action FROM audit_log WHERE target_id = $1 AND action = 'pii.view'`,
        [olusan.cafeId],
      ),
    );
    assert.ok(kayit, "telefon görüntüleme denetim izine düşmeliydi");
  });

  test("aynı telefonla ikinci başvuru reddediliyor", async () => {
    const telefon = yeniTelefon();
    const ortak = {
      yasalAd: "Çakışma Ltd.",
      vergiNo: "1112223334",
      sehir: "Bursa",
      adres: "Çakışma adresi, no 3",
      yetkiliAdi: "Çakışma Yetkili",
      yetkiliTelefon: telefon,
    };

    const ilk = await basvuruOlustur({ ad: "Çakışma A", ...ortak });
    assert.ok("cafeId" in ilk);
    olusturulanKafeler.push(ilk.cafeId);

    // Onaylanınca yönetici hesabı açılır; aynı numara ikinci kez kullanılamaz
    await onayla(ilk.cafeId, "pu_test");

    const ikinci = await basvuruOlustur({ ad: "Çakışma B", ...ortak });
    assert.deepEqual(ikinci, { hata: "telefon_kayitli" });
  });

  test("onaysız kafenin yöneticisi giriş yapamıyor (G5)", async () => {
    const telefon = yeniTelefon();
    const olusan = await basvuruOlustur({
      ad: "Onaysız Kafe",
      yasalAd: "Onaysız Ltd.",
      vergiNo: "5556667778",
      sehir: "Antalya",
      adres: "Onaysız adresi, no 4",
      yetkiliAdi: "Onaysız Yetkili",
      yetkiliTelefon: telefon,
    });
    assert.ok("cafeId" in olusan);
    olusturulanKafeler.push(olusan.cafeId);

    assert.equal(await yoneticiBul(telefon), null, "onay öncesi yönetici bulunmamalı");

    await onayla(olusan.cafeId, "pu_test");
    const yonetici = await yoneticiBul(telefon);
    assert.ok(yonetici, "onaydan sonra yönetici hesabı açılmalı");
    assert.equal(yonetici.cafeId, olusan.cafeId);

    // Kafe askıya alınırsa yönetici de giremez
    await yoneticiSorgu(`UPDATE cafes SET status = 'suspended' WHERE id = $1`, [olusan.cafeId]);
    assert.equal(await yoneticiBul(telefon), null, "askıya alınmış kafede giriş olmamalı");
  });
});

describe("SIM swap koruması (G16)", () => {
  test("numara değişince 24 saat ödül kilidi açılıyor", async () => {
    const eskiTel = yeniTelefon();
    const { oyuncu } = await testOyuncu({ telefon: eskiTel, ad: "Swap", soyad: "Test" });
    assert.equal(odulKilidiBitis(oyuncu), null, "yeni hesapta kilit olmamalı");

    const yeniTel = yeniTelefon();
    await numaraDegistir(oyuncu.id, yeniTel);

    const guncel = await telefonlaBul(yeniTel);
    assert.ok(guncel, "yeni numarayla bulunabilmeli");

    const kilit = odulKilidiBitis(guncel);
    assert.ok(kilit, "numara değişikliğinden sonra kilit olmalı");
    assert.ok(kilit.getTime() - Date.now() > 23 * 3_600_000, "kilit yaklaşık 24 saat olmalı");

    assert.equal(await telefonlaBul(eskiTel), null, "eski numarayla bulunmamalı");
  });
});

/**
 * Ü36 · parola, SMS'in YERİNE değil YANINA.
 *
 * Ü1 değişmedi: kimlik hâlâ doğrulanmış telefon numarası ve hesap yalnızca
 * OTP'den geçtikten sonra açılıyor (G13). Parola o hesabın üstüne ikinci bir
 * kapı koyuyor — bu blok o kapının menteşelerini sınıyor.
 */
describe("oyuncu parolası (Ü36)", () => {
  const GECERLI = "Kahve123";

  test("kurallar: 8 karakter, büyük harf, küçük harf, rakam", () => {
    assert.equal(parolaGecerliMi(GECERLI), true);
    assert.equal(parolaGecerliMi("kahve123"), false, "büyük harf yok");
    assert.equal(parolaGecerliMi("KAHVE123"), false, "küçük harf yok");
    assert.equal(parolaGecerliMi("KahveKahve"), false, "rakam yok");
    assert.equal(parolaGecerliMi("Kahve1"), false, "8 karakterden kısa");
  });

  test("üst sınır var — sınırsız parola bedava CPU tüketme yolu olurdu", () => {
    assert.equal(parolaGecerliMi("Ka1" + "a".repeat(197)), true, "200 karakter kabul edilmeli");
    assert.equal(parolaGecerliMi("Ka1" + "a".repeat(198)), false, "201 karakter reddedilmeli");
  });

  test("ekranın gördüğü liste ile sunucunun kararı aynı kaynaktan geliyor", () => {
    const bos = parolaKurallari("");
    assert.deepEqual(
      bos.map((k) => k.ad),
      ["uzunluk", "buyuk", "kucuk", "rakam"],
    );
    assert.equal(bos.every((k) => !k.gecti), true, "boş parolada hiçbir kural geçmemeli");
    assert.equal(parolaKurallari(GECERLI).every((k) => k.gecti), true);
  });

  test("doğru parola giriyor, yanlış parola girmiyor", async () => {
    const { oyuncu } = await testOyuncu({ telefon: yeniTelefon() });
    assert.equal(await parolaVarMi(oyuncu.id), false, "yeni hesabın parolası olmamalı");

    assert.deepEqual(await parolaBelirle({ playerId: oyuncu.id, parola: GECERLI }), { ok: true });
    assert.equal(await parolaVarMi(oyuncu.id), true);

    const dogru = await parolaDene({
      playerId: oyuncu.id,
      parola: GECERLI,
      limitAnahtari: "test-dogru",
    });
    assert.deepEqual(dogru, { ok: true, playerId: oyuncu.id });

    const yanlis = await parolaDene({
      playerId: oyuncu.id,
      parola: "Kahve124",
      limitAnahtari: "test-yanlis",
    });
    assert.deepEqual(yanlis, { ok: false, durum: "yanlis" });
  });

  test("kurallara uymayan parola yazılmıyor", async () => {
    const { oyuncu } = await testOyuncu({ telefon: yeniTelefon() });
    const r = await parolaBelirle({ playerId: oyuncu.id, parola: "kisa" });
    assert.equal(r.ok, false);
    assert.equal(await parolaVarMi(oyuncu.id), false, "reddedilen parola kayda geçmemeli");
  });

  /**
   * Bu testin varlık sebebi bir sızıntı: "numara kayıtlı değil" ile "parola
   * yanlış" ayrı ayrı söylenirse, saldırgan hangi numaraların CafePlay'de
   * olduğunu tek tek öğrenir. Üç başarısız durum da aynı cümleyi görüyor.
   */
  test("tek hata mesajı — kayıtsız numara, yanlış parola ve parolasız hesap ayırt edilemiyor", async () => {
    assert.equal(parolaHataMetni("yanlis"), parolaHataMetni("parola_yok"));

    const { oyuncu } = await testOyuncu({ telefon: yeniTelefon() });
    const parolasiz = await parolaDene({
      playerId: oyuncu.id,
      parola: GECERLI,
      limitAnahtari: "test-parolasiz",
    });
    const kayitsiz = await parolaDene({
      playerId: null,
      parola: GECERLI,
      limitAnahtari: "test-kayitsiz",
    });

    assert.deepEqual(parolasiz, { ok: false, durum: "parola_yok" });
    assert.deepEqual(kayitsiz, { ok: false, durum: "yanlis" });
    assert.equal(
      parolaHataMetni("parola_yok"),
      parolaHataMetni("yanlis"),
      "iki durum ekranda ayrışırsa numara ifşası doğar",
    );
  });

  /**
   * Aynı cevabı vermek yetmiyor, aynı sürede vermek de gerekiyor.
   *
   * Düzeltmeden önce kayıtsız numara ~5 ms'de dönüyor, parolalı hesap scrypt
   * yüzünden ~55 ms sürüyordu: saldırgan mesajı hiç okumadan, kronometreyle
   * hangi numaraların CafePlay'de olduğunu öğrenebiliyordu.
   *
   * Ölçüm kaba bilerek — makine hızından bağımsız olsun diye üç koşunun **en
   * küçüğü** alınıyor (en küçük değer, zamanlayıcı gürültüsünden en az
   * etkilenen). Eşik de bol: gerileme hâlinde oran ~0.1'e düşer, buradaki
   * 0.5 sınırına yaklaşmaz bile.
   */
  test("kayıtsız numara ile yanlış parola aynı SÜREDE cevaplanıyor", async () => {
    const { oyuncu } = await testOyuncu({ telefon: yeniTelefon() });
    await parolaBelirle({ playerId: oyuncu.id, parola: GECERLI });

    const olc = async (playerId: string | null, etiket: string) => {
      const sureler: number[] = [];
      for (let i = 0; i < 3; i++) {
        const basla = performance.now();
        await parolaDene({ playerId, parola: "Yanlis123", limitAnahtari: `${etiket}-${i}` });
        sureler.push(performance.now() - basla);
      }
      return Math.min(...sureler);
    };

    const parolaliHesap = await olc(oyuncu.id, "sure-parolali");
    const kayitsiz = await olc(null, "sure-kayitsiz");

    assert.ok(
      kayitsiz >= parolaliHesap * 0.5,
      `kayıtsız numara çok hızlı dönüyor (${kayitsiz.toFixed(0)}ms / ${parolaliHesap.toFixed(0)}ms) — ` +
        "süre farkı, tek hata mesajının gizlediği şeyi ele veriyor",
    );
  });

  test("hız sınırı: 5 denemeden sonra doğru parola bile girmiyor", async () => {
    const { oyuncu } = await testOyuncu({ telefon: yeniTelefon() });
    await parolaBelirle({ playerId: oyuncu.id, parola: GECERLI });

    const anahtar = "test-kilit";
    for (let i = 0; i < 5; i++) {
      const r = await parolaDene({ playerId: oyuncu.id, parola: "Yanlis123", limitAnahtari: anahtar });
      assert.deepEqual(r, { ok: false, durum: "yanlis" }, `${i + 1}. deneme geçmeliydi`);
    }

    const altinci = await parolaDene({ playerId: oyuncu.id, parola: GECERLI, limitAnahtari: anahtar });
    assert.deepEqual(
      altinci,
      { ok: false, durum: "cok_sik" },
      "kilit sonrası doğru parola da reddedilmeli — sözlük saldırısı bedava olmasın",
    );
    assert.notEqual(parolaHataMetni("cok_sik"), parolaHataMetni("yanlis"));
  });

  test("anonimleştirilmiş hesap parolayla giremiyor", async () => {
    const { oyuncu } = await testOyuncu({ telefon: yeniTelefon() });
    await parolaBelirle({ playerId: oyuncu.id, parola: GECERLI });
    await yoneticiSorgu(`UPDATE players SET anonymized_at = now() WHERE id = $1`, [oyuncu.id]);

    const r = await parolaDene({ playerId: oyuncu.id, parola: GECERLI, limitAnahtari: "test-anon" });
    assert.equal(r.ok, false, "silinmiş hesabın parolası çalışmamalı");

    await yoneticiSorgu(`UPDATE players SET anonymized_at = NULL WHERE id = $1`, [oyuncu.id]);
  });

  test("parola düz metin saklanmıyor, biçim staff.pin_hash ile aynı", async () => {
    const { oyuncu } = await testOyuncu({ telefon: yeniTelefon() });
    await parolaBelirle({ playerId: oyuncu.id, parola: GECERLI });

    const r = await withBypass("test: parola satırı", (db) =>
      db.one<{ password_hash: string; password_set_at: Date | null }>(
        `SELECT password_hash, password_set_at FROM players WHERE id = $1`,
        [oyuncu.id],
      ),
    );
    assert.ok(r);
    assert.ok(r.password_hash.startsWith("scrypt$"), "scrypt$tuz$hash bekleniyordu");
    assert.ok(!r.password_hash.includes(GECERLI), "düz parola saklanmış");
    assert.ok(r.password_set_at, "belirlenme anı yazılmalı");
  });

  test("aynı parola iki hesapta aynı hash'e düşmüyor", async () => {
    const a = await testOyuncu({ telefon: yeniTelefon() });
    const b = await testOyuncu({ telefon: yeniTelefon() });
    await parolaBelirle({ playerId: a.oyuncu.id, parola: GECERLI });
    await parolaBelirle({ playerId: b.oyuncu.id, parola: GECERLI });

    const hashler = await withBypass("test: hash karşılaştırma", (db) =>
      db.all<{ password_hash: string }>(
        `SELECT password_hash FROM players WHERE id IN ($1, $2)`,
        [a.oyuncu.id, b.oyuncu.id],
      ),
    );
    assert.equal(hashler.length, 2);
    assert.notEqual(
      hashler[0].password_hash,
      hashler[1].password_hash,
      "tuz kullanılmamış — bir hash tablosu iki hesabı birden açardı",
    );
  });

  test("parola belirleme denetim izine düşüyor", async () => {
    const { oyuncu } = await testOyuncu({ telefon: yeniTelefon() });
    await parolaBelirle({ playerId: oyuncu.id, parola: GECERLI });

    const kayit = await withBypass("test: denetim izi", (db) =>
      db.one<{ action: string }>(
        `SELECT action FROM audit_log WHERE target_id = $1 AND action = 'player.password_set'`,
        [oyuncu.id],
      ),
    );
    assert.ok(kayit, "player.password_set denetim izine düşmeliydi");
  });
});

describe("beni hatırla (Ü36)", () => {
  test("işaretlenmezse oturum 12 saat, işaretlenirse 90 gün", () => {
    assert.equal(omurSaniye("oyuncu", false), 12 * 3600, "ortak cihazda üç ay açık kalmamalı");
    assert.equal(omurSaniye("oyuncu", true), 90 * 86_400);
  });

  test("tercih belirtilmezse rolün tam ömrü uygulanıyor", () => {
    assert.equal(omurSaniye("oyuncu"), 90 * 86_400);
  });

  test("tercih yalnızca oyuncuyu ilgilendiriyor", () => {
    // Kasiyer ve panel oturumlarının süresi güvenlik kararı (docs/08 §4.4),
    // kullanıcı tercihi değil — kutu işaretlenmese de kısalmaz.
    for (const rol of ["kasiyer", "kafe_yoneticisi", "platform_admin"] as const) {
      assert.equal(omurSaniye(rol, false), omurSaniye(rol, true), `${rol} tercihe göre değişmemeli`);
    }
  });
});
