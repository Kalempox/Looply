import "../scripts/_env";
import { test, before, after, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kodIste, kodDogrula, MAX_DENEME } from "@/domain/otp";
import {
  masaCoz,
  basiliKod,
  biletUret,
  biletCoz,
  taramaKaydet,
  kodUret,
  EN_UZUN_KOD,
  basiliKoduTasi,
  basiliKodlar,
  hedefKafeler,
} from "@/domain/qr";
import {
  kaydet,
  telefonlaBul,
  epostaylaBul,
  numaraDegistir,
  odulKilidiBitis,
  takmaAd,
} from "@/domain/player";
import {
  belirle as parolaBelirle,
  varMi as parolaVarMi,
  girisDene as parolaDene,
  gecerliMi as parolaGecerliMi,
  kurallar as parolaKurallari,
  hataMetni as parolaHataMetni,
} from "@/domain/parola";
import { omurSaniye } from "@/domain/oturum-omru";
// Ü170: kod artık e-postadan gidiyor; tavan da oraya taşındı.
import {
  tavanDurumu as postaTavanDurumu,
  GUNLUK_TAVAN as POSTA_TAVANI,
} from "@/posta";
import { basvuruOlustur, basvurulariListele, telefonuAc, onayla, yoneticiBul } from "@/domain/cafe";
import {
  personelEkle,
  personelListele,
  pinGiris,
  platformKullanicisiBul,
  platformKullanicisiEkle,
} from "@/domain/staff";
import {
  phoneIndex,
  normalizePhone,
  normalizeEmail,
  emailIndex,
  encryptPII,
  decryptPII,
  hashOtp,
} from "@/lib/crypto";
import { yoneticiSorgu, benzersizEposta } from "./_yardim";

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
const yeniTelefon = () => normalizePhone(`0537${String(TABAN + sayac++).slice(-7)}`);

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
    eposta: benzersizEposta(),
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
    const istek = await kodIste({ telefon: tel, eposta: benzersizEposta(), amac: "register" });
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
    await kodIste({ telefon: tel, eposta: benzersizEposta(), amac: "register" });
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
    await kodIste({ telefon: tel, eposta: benzersizEposta(), amac: "register" });

    let sonuc;
    for (let i = 0; i < MAX_DENEME; i++) {
      sonuc = await kodDogrula({ telefon: tel, kod: "111111", amac: "register" });
    }
    assert.equal(sonuc?.durum, "kilitlendi", "5. yanlış denemede kilitlenmeliydi");

    // Kilitliyken yeni kod da istenemez
    assert.equal((await kodIste({ telefon: tel, eposta: benzersizEposta(), amac: "register" })).durum, "kilitli");

    await otpTemizle(tel);
  });

  test("süresi geçmiş kod reddedilir", async () => {
    const tel = yeniTelefon();
    await kodIste({ telefon: tel, eposta: benzersizEposta(), amac: "register" });
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
    assert.equal((await kodIste({ telefon: tel, eposta: benzersizEposta(), amac: "register" })).durum, "gonderildi");
    assert.equal(
      (await kodIste({ telefon: tel, eposta: benzersizEposta(), amac: "register" })).durum,
      "cok_sik",
      "dakikalık kota devreye girmeliydi",
    );
    await otpTemizle(tel);
  });

  test("düz kod hiçbir yerde saklanmıyor", async () => {
    const tel = yeniTelefon();
    const adres = benzersizEposta();
    await kodIste({ telefon: tel, eposta: adres, amac: "register" });

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

    /*
      Giden kutusunda ne kod ne de düz adres var (docs/08 §7.1).

      ⚠️ Ü170'te `sms_outbox`tan `email_outbox`a taşındı: kod artık
      e-postadan gidiyor ve eski tabloya bakan test, gerçekte hiç
      yazılmayan bir satırı arıyordu. Sınanan şey değişmedi — defterin
      bir TESLİMAT izi olması, mesajın kendisi olmaması.
    */
    const posta = await withBypass("test: eposta satırı", (db) =>
      db.one<Record<string, unknown>>(
        `SELECT * FROM email_outbox WHERE email_index = $1 ORDER BY created_at DESC LIMIT 1`,
        [emailIndex(adres)],
      ),
    );
    assert.ok(posta, "gönderim deftere yazılmalı");
    assert.ok(!("body" in posta), "giden kutusunda metin alanı olmamalı");
    for (const [alan, deger] of Object.entries(posta)) {
      if (typeof deger === "string") {
        assert.ok(!/^\d{6}$/.test(deger), `${alan} düz kod içeriyor olabilir`);
        assert.ok(deger !== adres, `${alan} düz e-posta adresi içeriyor`);
      }
    }

    await otpTemizle(tel);
  });
});

describe("küresel e-posta tavanı (G14'ün yeni kanaldaki hâli)", () => {
  /*
    🔴 Bu blok Ü170'te yeniden yazıldı ve sebebi öğreticiydi.

    Önce `sms_outbox` üzerinden G14 tavanını sınıyordu ve kod SMS'ten
    e-postaya taşınınca **sessizce anlamsızlaştı**: testler `kapasite_dolu`
    bekliyordu, üretim artık hiç öyle dönmüyordu. Yani testler bir
    korumanın kaybolduğunu haber verdi — tavan e-posta tarafına kendi
    sayısıyla taşındı (`posta/index.ts`).

    ⚠️ Ders: bir kanal değiştirilirken o kanala bağlı korumaların
    listesi çıkarılmalı. Burada listeyi çıkaran şey testlerdi; sessiz
    kalsalardı sistem çapındaki tek durdurucu kaybolmuş olacaktı.
  */

  /**
   * Günün e-posta sayacını **hedeflenen orana kurar** — üstüne eklemez.
   *
   * Gerekçe SMS'teki hâlinden devralındı: körlemesine ekleme, sayacın
   * sıfırdan başladığını varsayıyor ve elle yapılan gerçek denemeler o
   * varsayımı bozuyor. Kendi satırlarını önce siliyor, sonra eksiği
   * tamamlıyor; gerçek trafik hedefi aşmışsa test atlanıyor — sessizce
   * yanlış ölçmektense hiç ölçmemek dürüst.
   */
  async function tavanKur(hedef: number, onek: string): Promise<boolean> {
    await yoneticiSorgu(`DELETE FROM email_outbox WHERE id LIKE $1`, [`${onek}%`]);

    const mevcut = await withBypass("test: günün eposta sayısı", (db) =>
      db.one<{ n: string }>(
        // ⚠️ Üretimin saydığı ÖLÇÜNÜN AYNISI (`posta/index.ts`): son 24
        // saat ve yalnızca `sent`. Test, üretimin ölçtüğü şeyi ölçmeli.
        `SELECT count(*)::text AS n FROM email_outbox
          WHERE status = 'sent' AND created_at > now() - interval '1 day'`,
      ),
    );
    const eksik = hedef - Number(mevcut?.n ?? 0);
    if (eksik <= 0) return false;

    await yoneticiSorgu(
      `INSERT INTO email_outbox (id, email_masked, email_index, template, provider, status)
       SELECT $3 || g, 't***t@ornek.test', $1, 'otp', 'console', 'sent'
         FROM generate_series(1, $2) g`,
      [emailIndex(benzersizEposta()), eksik, onek],
    );
    return true;
  }

  test("%90'da kayıt durur, giriş devam eder", async (t) => {
    if (!(await tavanKur(Math.ceil(POSTA_TAVANI * 0.92), "eml_test_")))
      return t.skip("günün gerçek e-posta trafiği hedefi aşmış");

    const d = await postaTavanDurumu();
    assert.equal(d.kayitAcik, false, "%90 üstünde yeni kayıt durmalıydı");
    assert.equal(d.girisAcik, true, "mevcut kullanıcının girişi devam etmeliydi");

    assert.equal(
      (await kodIste({ telefon: yeniTelefon(), eposta: benzersizEposta(), amac: "register" })).durum,
      "kapasite_dolu",
    );

    /*
      Giriş dalı için hesabın GERÇEKTEN var olması gerekiyor: `kodIste`
      artık adresi hesaptan okuyor (Ü170, `hedefAdres`) ve hesapsız bir
      numara `eposta_yok` döner — tavanla ilgisi olmayan bir sebeple.
    */
    const telefon = yeniTelefon();
    await kaydet({
      telefon,
      eposta: benzersizEposta(),
      ad: "Tavan",
      soyad: "Testi",
      dogumYili: 1990,
      pazarlamaIzni: false,
    });
    assert.equal(
      (await kodIste({ telefon, amac: "login" })).durum,
      "gonderildi",
      "giriş kapatılmamalıydı — saldırganın işini görmüş oluruz",
    );

    await yoneticiSorgu(`DELETE FROM email_outbox WHERE id LIKE 'eml_test_%'`);
  });

  test("%100'de her şey durur", async (t) => {
    if (!(await tavanKur(POSTA_TAVANI + 10, "eml_test_")))
      return t.skip("günün gerçek e-posta trafiği hedefi aşmış");

    assert.equal((await postaTavanDurumu()).girisAcik, false);

    const telefon = yeniTelefon();
    await kaydet({
      telefon,
      eposta: benzersizEposta(),
      ad: "Tavan",
      soyad: "Dolu",
      dogumYili: 1990,
      pazarlamaIzni: false,
    });
    assert.equal((await kodIste({ telefon, amac: "login" })).durum, "kapasite_dolu");

    await yoneticiSorgu(`DELETE FROM email_outbox WHERE id LIKE 'eml_test_%'`);
  });
});

describe("masa karekodu (K1)", () => {
  async function masaAl(cafeId: string) {
    return withBypass("test: masa", (db) =>
      db.one<{ id: string; qr_secret: Buffer; label: string; print_code: string | null }>(
        `SELECT id, qr_secret, label, print_code FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1`,
        [cafeId],
      ),
    );
  }

  test("🔴 basılı kodun yönlendirmesi başka KAFEYE taşınıyor (Ü266/Ü267)", async () => {
    /*
      🔴 Ürün sahibinin "301 redirect" dediği şey: toptan basılan
      karekod aynen kalıyor, değişen tek şey o kodun hangi **kafeye**
      düştüğü. İşlem kiracı sınırını aşıyor; yanlış çalışırsa bir
      kafenin müşterisi sessizce başka kafeye gider.

      ⚠️ Bu testin ilk hâli iki hatayı görmedi ve ikisi de tarayıcıda
      çıktı:
        · hedef masanın kodunu testin içinde **elle siliyordu** — oysa
          gerçekte yeni masa kodunu kendiliğinden alıyor, yani hiçbir
          yeni kafe hedef olamıyordu;
        · listeyi (`basiliKodlar`) **hiç çağırmıyordu** — liste var
          olmayan bir tabloya bakıyordu ve sayfa açılınca çöküyordu.
      Şimdi ikisi de sınanıyor.

      ⚠️ Değişen her satır `finally` içinde GERİ KONUYOR. Bu depoda
      testler geliştirme veritabanını paylaşıyor ve bir test daha önce
      bağlı bir kodu silip bırakmıştı.
    */
    const aktifMasa = (cafeId: string) =>
      withBypass("test: aktif masa", (db) =>
        db.one<{ id: string; print_code: string | null; label: string }>(
          `SELECT id, print_code, label FROM cafe_tables WHERE cafe_id = $1 AND active`,
          [cafeId],
        ),
      );

    // Hedef: kendi test kafemiz — bul ya da kur (her koşuda aynı kafe,
    // birikmesin diye).
    let hedefKafe = await withBypass("test: hedef kafe", (db) =>
      db.one<{ id: string }>(`SELECT id FROM cafes WHERE slug LIKE 'yonlendirme-test-hedefi%' LIMIT 1`),
    ).then((r) => r?.id);
    if (!hedefKafe) {
      const admin = await withBypass("test: platform yöneticisi", (db) =>
        db.one<{ id: string }>(`SELECT id FROM platform_users WHERE role = 'platform_admin' LIMIT 1`),
      );
      assert.ok(admin, "önkoşul: platform yöneticisi yok (npm run db:seed)");
      const b = await basvuruOlustur({
        ad: "Yonlendirme Test Hedefi",
        sehir: "İstanbul",
        yetkiliAdi: "Test",
        isletmeTelefonu: normalizePhone("05320000065"),
        yetkiliTelefon: normalizePhone("05320000066"),
      });
      assert.ok(!("hata" in b), `önkoşul: test kafesi açılamadı ${JSON.stringify(b)}`);
      const onay = await onayla(b.cafeId, admin.id);
      assert.ok(onay.ok, "önkoşul: test kafesi onaylanamadı");
      hedefKafe = b.cafeId;
    }

    // Kaynak: Kafe B'nin aktif masası.
    const kaynak = await aktifMasa(kafeB);
    assert.ok(kaynak, "önkoşul: Kafe B'nin aktif masası yok");
    const oncekiKaynakKodu = kaynak.print_code;

    /* 🔴 Test kafesinde testin BİLMEDİĞİ bir basılı kod varsa DUR.
       Ürün sahibi aynı kafeyi platform panelinden elle hedef seçiyor
       (docs/27 · 1.2b). Aşağıdaki temizlik o kafenin masalarını
       siliyor; elle taşınmış bir kod o sırada oradaysa silinir ve
       kâğıdı hiçbir yere gitmez. Testin kendi kodları `test-` ile
       başlıyor. */
    const yabanci = await withBypass("test: elle taşınmış kod", (db) =>
      db.one<{ print_code: string }>(
        `SELECT print_code FROM cafe_tables
          WHERE cafe_id = $1 AND print_code IS NOT NULL AND print_code NOT LIKE 'test-%'
          LIMIT 1`,
        [hedefKafe],
      ),
    );
    // `db.one` satır yoksa `undefined` dönüyor, `null` değil.
    assert.ok(
      !yabanci,
      `önkoşul: test kafesinde elle taşınmış "${yabanci?.print_code}" kodu duruyor — ` +
        "önce panelden geri taşı. Test onu silmez.",
    );

    const hedefAdi = await withBypass("test: hedef kafe adı", (db) =>
      db.one<{ name: string }>(`SELECT name FROM cafes WHERE id = $1`, [hedefKafe]),
    ).then((r) => r!.name);

    /* Kullanımda olan bir hedef: ADLI kodu olan ve oturum açılmış aktif
       masası olan kafe. ⚠️ "Adlı kodu olan" şartı koruma kuralının
       kendisi — adlı kodu olmayan masaya taşıma serbest. Şart yokken
       kodu elle taşınmış bir kafe (masası adsız ama oturumlu) seçilir
       ve 4. adım ona gerçekten kod taşırdı. */
    const kullanimdaki = await withBypass("test: kullanımda kafe", (db) =>
      db.one<{ cafe_id: string }>(
        `SELECT t.cafe_id FROM cafe_tables t
          WHERE t.active AND t.print_code IS NOT NULL
            AND t.cafe_id <> $1 AND t.cafe_id <> $2
            AND EXISTS (SELECT 1 FROM table_sessions ts WHERE ts.table_id = t.id)
          LIMIT 1`,
        [kafeB, hedefKafe],
      ),
    );
    assert.ok(kullanimdaki, "önkoşul: oturumu olan hiçbir kafe yok (npm run db:demo)");
    /* ⚠️ Kullanımdaki kafenin kodu da saklanıyor: koruma bir gün
       gerilerse 4. adım o kodu gerçekten ezer. Düşen bir test ortak
       veritabanına zarar vermemeli. */
    const kullanimdakiMasa = await aktifMasa(kullanimdaki.cafe_id);
    assert.ok(kullanimdakiMasa);

    const x = kodUret("Test X");
    const y = kodUret("Test Y");
    const z = kodUret("Test Z");

    /* Hedefin masası başlangıçta YOK. Ad çakışması (pasif masa) 8.
       adımda ayrıca kuruluyor. */
    await yoneticiSorgu(`DELETE FROM cafe_tables WHERE cafe_id = $1`, [hedefKafe]);

    try {
      /* ── 1 · Masası olmayan kafeye taşı → masa kodla açılıyor ── */
      await yoneticiSorgu(`UPDATE cafe_tables SET print_code = $2 WHERE id = $1`, [kaynak.id, x]);
      const s1 = await basiliKoduTasi({
        kod: x,
        hedefCafeId: hedefKafe,
        bakanId: "plt_test",
        gerekce: "test taşıması",
      });
      assert.ok(s1.ok, `masası olmayan kafeye taşıma reddedildi: ${JSON.stringify(s1)}`);
      assert.equal(s1.birakilanKod, null);
      assert.equal(s1.masaAcildi, true, "masa açıldığı bildirilmedi");
      assert.equal((await masaCoz(x))?.cafeId, hedefKafe, "kod yeni kafeye gitmiyor");
      assert.equal((await aktifMasa(kafeB))?.print_code, null, "kaynak masa kodu bırakmadı");
      const acilan = await withBypass("test: açılan masa", (db) =>
        db.one<{ label: string }>(`SELECT label FROM cafe_tables WHERE cafe_id = $1 AND active`, [
          hedefKafe,
        ]),
      );
      assert.ok(acilan, "hedef kafede aktif masa açılmadı");
      /* 🔴 Masa HEDEF kafenin adını almalı. İlk yazımda kaynağın adı
         kopyalanıyordu ve oyuncu "Buradasın: <yeni kafe> · Kafe A"
         görüyordu — ürün sahibinin elle testinde çıktı. */
      assert.equal(acilan.label, hedefAdi, "yeni masa başka kafenin adını taşıyor — oyuncu yanlış yeri görür");

      /* ── 2 · Liste ve hedef listesi GERÇEKTEN çalışıyor ── */
      const liste = await basiliKodlar();
      const satir = liste.find((k) => k.kod === x);
      assert.ok(satir, "taşınan kod listede yok");
      assert.equal(satir.cafeId, hedefKafe);
      const hedefler = await hedefKafeler();
      const h = hedefler.find((k) => k.cafeId === hedefKafe);
      assert.ok(h, "test kafesi hedef listesinde yok");
      assert.equal(h.mevcutKod, x);

      /* ── 2b · 🔴 Taşınan kodun ESKİ okutmaları sayılıyor — Ü272 ──
         x, oturumu olan Kafe B masasından geldi. Önce kullanım yalnızca
         yeni masadan sayılıyordu: x "hiç okutulmadı" görünüyordu ve üstüne
         gelen ikinci kod onu sessizce silebilirdi. Ürün sahibi: "eski ve
         yeni olarak ayrı ayrı tutulsun." */
      assert.equal(satir.yeni, 0, "yeni kafede hiç okutulmadı");
      const eskiB = satir.eski.find((d) => d.oturum > 0);
      assert.ok(eskiB, `eski kafedeki okutmalar görünmüyor: ${JSON.stringify(satir.eski)}`);
      assert.ok(satir.kullanim > 0, "toplam kullanım eski okutmaları saymıyor");
      assert.equal(h.kullanimda, true, "taşınmış kod kullanılmamış sanılıyor — üstüne kod yazılabilir");

      /* ── 3 · 🔴 Taşınmış kodun ÜSTÜNE ikinci kod REDDEDİLİYOR ──
         Ürün sahibinin sorduğu senaryonun ta kendisi. */
      await yoneticiSorgu(`UPDATE cafe_tables SET print_code = $2 WHERE id = $1`, [kaynak.id, y]);
      const s3 = await basiliKoduTasi({
        kod: y,
        hedefCafeId: hedefKafe,
        bakanId: "plt_test",
        gerekce: "olmaması gereken taşıma",
      });
      assert.equal(s3.ok, false, "taşınmış kodun üstüne kod yazıldı — kâğıdı ölürdü");
      assert.equal((await masaCoz(x))?.cafeId, hedefKafe, "ret sonrası taşınmış kod yerinden oynadı");

      /* ── 3b · GERÇEKTEN kullanılmamış kodu olan kafeye taşı → yerine geçiyor ──
         Toptan baskı akışının kendisi: yeni kafenin kendi kodu hiç
         basılmamış, hiç okutulmamış, hiç taşınmamış. */
      const hedefMasa = await aktifMasa(hedefKafe);
      assert.ok(hedefMasa);
      await yoneticiSorgu(`UPDATE cafe_tables SET print_code = $2 WHERE id = $1`, [hedefMasa.id, z]);
      const s3b = await basiliKoduTasi({
        kod: y,
        hedefCafeId: hedefKafe,
        bakanId: "plt_test",
        gerekce: "toptan baskı devri",
      });
      assert.ok(s3b.ok, `kullanılmamış koda taşıma reddedildi: ${JSON.stringify(s3b)}`);
      assert.equal(s3b.birakilanKod, z, "serbest bırakılan kod bildirilmedi");
      assert.equal((await masaCoz(y))?.cafeId, hedefKafe);
      assert.equal(await masaCoz(z), null, "serbest bırakılan kod hâlâ çözülüyor");

      /* ── 4 · 🔴 KULLANIMDAKİ kodu olan kafeye taşıma REDDEDİLİYOR ──
         O kod bir duvarda asılı; yerine başka kod geçerse kâğıt ölür. */
      const s4 = await basiliKoduTasi({
        kod: y,
        hedefCafeId: kullanimdaki.cafe_id,
        bakanId: "plt_test",
        gerekce: "olmaması gereken taşıma",
      });
      assert.equal(s4.ok, false, "kullanımdaki kodun üstüne taşıma yapıldı — kâğıt ölürdü");
      assert.equal((await masaCoz(y))?.cafeId, hedefKafe, "ret sonrası kod yerinden oynadı");

      /* ── 5 · Gerekçesiz ve aynı kafeye taşıma reddediliyor ── */
      const bosGerekce = await basiliKoduTasi({
        kod: y,
        hedefCafeId: kafeB,
        bakanId: "plt_test",
        gerekce: "  ",
      });
      assert.equal(bosGerekce.ok, false, "gerekçesiz taşıma kabul edildi");
      const ayniKafe = await basiliKoduTasi({
        kod: y,
        hedefCafeId: hedefKafe,
        bakanId: "plt_test",
        gerekce: "aynı kafe",
      });
      assert.equal(ayniKafe.ok, false, "aynı kafeye taşıma kabul edildi");

      /* ── 6 · Denetim izi ── */
      const iz = await withBypass("test: denetim", (db) =>
        db.one<{ detail: Record<string, unknown> }>(
          `SELECT detail FROM audit_log
            WHERE action = 'table.print_code_move' AND actor_id = 'plt_test'
            ORDER BY id DESC LIMIT 1`,
        ),
      );
      assert.ok(iz, "taşıma denetim izine yazılmadı");
      assert.equal(iz.detail.kod, y);
      assert.equal(iz.detail.birakilanKod, z);
      assert.equal(iz.detail.gerekce, "toptan baskı devri");

      /* ── 7 · GERİ ALMA: adlı kodu olmayan ama oturumu olan kafeye ──
         Kafe B'nin masası 3. adımdan beri adlı kodsuz, ama oturumları
         duruyor. İlk yazımda koruma yalnızca oturum sayısına bakıyordu
         ve bu taşıma reddediliyordu — yani bir kodu taşıyıp geri almak
         mümkün değildi. Ezilecek adlı kod yoksa kaybedilecek şey de yok:
         eski 16 haneli kod `qr_secret`ten türüyor ve çözülmeye devam
         ediyor. */
      const s7 = await basiliKoduTasi({
        kod: y,
        hedefCafeId: kafeB,
        bakanId: "plt_test",
        gerekce: "geri alma",
      });
      assert.ok(s7.ok, `adlı kodsuz kafeye geri taşıma reddedildi: ${JSON.stringify(s7)}`);
      assert.equal((await masaCoz(y))?.cafeId, kafeB, "geri alınan kod eski kafesine dönmedi");
      // Kafe B'nin masası zaten vardı — ekran "masa açıldı" dememeli.
      assert.equal(s7.masaAcildi, false, "var olan masaya verilen kod 'masa açıldı' diye bildirildi");

      /* ── 8 · Ad çakışması: kafenin adını taşıyan PASİF masa varken ──
         `(cafe_id, label)` benzersiz ve pasif masaları da sayıyor.
         Eski masasını kapatmış bir kafede yeni masa kafenin adıyla
         açılamaz; taşıma çökmemeli, "(2)" eklemeli. Bu çöküş bir kez
         yaşandı ve o sırada iki A/B denemesi de amaçladıkları yerde değil
         burada düştüğü için **hiçbir şey kanıtlamamıştı.** */
      await yoneticiSorgu(`UPDATE cafe_tables SET active = false WHERE cafe_id = $1`, [hedefKafe]);
      const s8 = await basiliKoduTasi({
        kod: y,
        hedefCafeId: hedefKafe,
        bakanId: "plt_test",
        gerekce: "ad çakışması",
      });
      assert.ok(s8.ok, `pasif masası olan kafeye taşıma çöktü: ${JSON.stringify(s8)}`);
      assert.equal(s8.masaAcildi, true);
      const ikinci = await withBypass("test: ikinci masa", (db) =>
        db.one<{ label: string }>(`SELECT label FROM cafe_tables WHERE cafe_id = $1 AND active`, [
          hedefKafe,
        ]),
      );
      assert.equal(ikinci?.label, `${hedefAdi} (2)`, "çakışan ada ek konmadı");
      assert.equal((await masaCoz(y))?.cafeId, hedefKafe);
    } finally {
      /* ⚠️ Pasifleştirmek değil SİLMEK: pasif bırakılan masa bir sonraki
         koşuyu zehirliyordu (yukarıdaki nota bakın). */
      await yoneticiSorgu(`DELETE FROM cafe_tables WHERE cafe_id = $1`, [hedefKafe]);
      await yoneticiSorgu(`UPDATE cafe_tables SET print_code = $2 WHERE id = $1`, [
        kaynak.id,
        oncekiKaynakKodu,
      ]);
      await yoneticiSorgu(`UPDATE cafe_tables SET print_code = $2 WHERE id = $1`, [
        kullanimdakiMasa.id,
        kullanimdakiMasa.print_code,
      ]);
      await yoneticiSorgu(`DELETE FROM audit_log WHERE actor_id = 'plt_test'`);
      // Ü272: testin kodlarının durakları — Kafe B'nin masasına bağlı olanlar
      // masa silinmediği için kendiliğinden gitmiyor.
      await yoneticiSorgu(`DELETE FROM print_code_history WHERE print_code = ANY($1)`, [[x, y, z]]);
    }
  });

  test("basılı kod masaya çözülüyor", async () => {
    const masa = await masaAl(kafeA);
    assert.ok(masa);
    const cozum = await masaCoz(basiliKod(masa));
    assert.ok(cozum, "geçerli kod çözülmeliydi");
    assert.equal(cozum.cafeId, kafeA);
    assert.equal(cozum.masaAdi, masa.label);
  });

  test("uydurma kod çözülmüyor", async () => {
    assert.equal(await masaCoz("0000000000000000"), null, "olmayan hex kod");
    assert.equal(await masaCoz("kisa"), null, "tiresiz — yeni biçime uymuyor");
    assert.equal(await masaCoz("yok-boyle-bir-kod"), null, "biçimi doğru ama kayıtsız");
    assert.equal(await masaCoz("-kafe-a"), null, "baştaki tire");
    assert.equal(await masaCoz("kafe--a"), null, "ardışık tire");
    assert.equal(await masaCoz("a".repeat(40) + "-ek"), null, "sınırdan uzun");
  });

  test("adlı kod da eski hex kod da aynı masaya çözülüyor (Ü247)", async () => {
    /*
      🔴 Bu testin bekçilik ettiği şey **geriye dönük uyum**.

      Ü247'de basılı kod biçimi değişti: `ec3ebc4b9c1d3931` yerine
      `kafe-a-7f3k9x2m`. Daha önce basılmış hiçbir karekod ölmemeli —
      duvardaki etiket sunucu güncellendi diye çalışmayı bırakırsa
      kimse fark etmez, müşteri "okutamadım" der ve gider.

      İkisi aynı anda geçerli: yeni kod `print_code` kolonunda, eski
      kod `qr_secret`in ilk 8 baytında.
    */
    const masa = await masaAl(kafeA);
    assert.ok(masa);

    const hexKod = masa.qr_secret.subarray(0, 8).toString("hex");
    const adliKod = kodUret("Kafe A");

    /*
      🔴 Önceki değer saklanıyor ve sonunda GERİ KONUYOR, `NULL`a
      çekilmiyor.

      İlk yazımda `finally` bloğu `print_code = NULL` yapıyordu ve
      ölçüldü: geliştirme veritabanında elle bağlanmış bir kodu
      **test silmişti.** Testin paylaşılan tohum verisini bozması,
      düştüğünde değil *geçtiğinde* zarar veren bir hata — kimse
      bakmıyor.
    */
    const onceki = masa.print_code;
    await yoneticiSorgu(`UPDATE cafe_tables SET print_code = $2 WHERE id = $1`, [
      masa.id,
      adliKod,
    ]);

    try {
      const yeni = await masaCoz(adliKod);
      assert.ok(yeni, `adlı kod çözülmeliydi: ${adliKod}`);
      assert.equal(yeni.cafeId, kafeA);

      const eski = await masaCoz(hexKod);
      assert.ok(eski, "eski hex kod ölmüş — basılmış etiketler çalışmaz");
      assert.equal(eski.cafeId, kafeA);

      // Kâğıttan elle girilen kod büyük harfle yazılabiliyor.
      assert.ok(await masaCoz(adliKod.toUpperCase()), "büyük harfli kod çözülmedi");

      // `basiliKod` artık adlı kodu tercih ediyor.
      assert.equal(basiliKod({ print_code: adliKod, qr_secret: masa.qr_secret }), adliKod);
      assert.equal(basiliKod({ print_code: null, qr_secret: masa.qr_secret }), hexKod);
    } finally {
      await yoneticiSorgu(`UPDATE cafe_tables SET print_code = $2 WHERE id = $1`, [
        masa.id,
        onceki,
      ]);
    }
  });

  test("üretilen kod basılabilir sınırların içinde (Ü247)", () => {
    /*
      ⚠️ Sınır karekodun geometrisinden geliyor: 29 karakteri aşan kod
      karekodu 7. sürüme taşıyor ve orada hizalama deseni sembolün tam
      merkezine — Loopy rozetinin altına — düşüyor. O desen hata
      düzeltmeyle kurtarılmıyor, yani kod hiç okunmaz. Basıldıktan
      sonra anlaşılır.
    */
    for (const ad of [
      "Kafe A",
      "Kahve Durağı",
      "ÇOK UZUN BİR KAFE ADI OLABİLİR BELKİ DE DAHA UZUN",
      "☕",
      "   ",
    ]) {
      const kod = kodUret(ad);
      assert.ok(kod.length <= EN_UZUN_KOD, `"${ad}" -> ${kod} (${kod.length} > ${EN_UZUN_KOD})`);
      assert.match(kod, /^[a-z0-9]+(?:-[a-z0-9]+)+$/, `"${ad}" -> ${kod} biçimi bozuk`);
    }

    // Rastgele ek gerçekten rastgele: aynı ad iki kez aynı kodu vermemeli.
    const kumes = new Set(Array.from({ length: 200 }, () => kodUret("Kafe A")));
    assert.equal(kumes.size, 200, "aynı ad aynı kodu üretti — ek rastgele değil");
  });

  test("onaysız kafenin karekodu çalışmıyor (G5)", async () => {
    const masa = await masaAl(kafeB);
    const kod = basiliKod(masa!);
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
    // `service_reminder` rıza DEĞİL, hizmete ait bildirim tercihi — kayıtta
    // açık başlıyor. Ticari ileti izninin AYRI satır olması G7'nin şartı ve
    // sınanan şey o: ikisi tek satırda birleşmiyor.
    assert.deepEqual(rizalar.map((r) => r.kind).sort(), [
      "commercial_message",
      "privacy_notice",
      "service_reminder",
    ]);
  });

  test("izin verilmediğinde ticari ileti satırı yazılmıyor", async () => {
    const { oyuncu } = await testOyuncu({ telefon: yeniTelefon(), pazarlamaIzni: false });
    const rizalar = await withBypass("test: rızalar", (db) =>
      db.all<{ kind: string }>(`SELECT kind FROM player_consents WHERE player_id = $1`, [oyuncu.id]),
    );
    // Ticari ileti satırı YOK — izin verilmedi. Hizmet bildirimi tercihi ise
    // var: o bir rıza değil ve kampanya izniyle hiçbir ilişkisi yok.
    assert.deepEqual(rizalar.map((r) => r.kind).sort(), ["privacy_notice", "service_reminder"]);
    assert.ok(
      !rizalar.some((r) => r.kind === "commercial_message"),
      "izin verilmediği hâlde ticari ileti satırı yazılmış",
    );
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
      sehir: "Ankara",
      yetkiliAdi: "Test Yetkili",
      isletmeTelefonu: "0212 123 45 67",
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
      sehir: "İzmir",
      yetkiliAdi: "Denetim Yetkili",
      isletmeTelefonu: "0212 123 45 67",
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
      sehir: "Bursa",
      yetkiliAdi: "Çakışma Yetkili",
      isletmeTelefonu: "0212 123 45 67",
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
      sehir: "Antalya",
      yetkiliAdi: "Onaysız Yetkili",
      isletmeTelefonu: "0212 123 45 67",
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
   * yanlış" ayrı ayrı söylenirse, saldırgan hangi numaraların Looply'de
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
   * hangi numaraların Looply'de olduğunu öğrenebiliyordu.
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

/* ═══════════════════════════════════════════════════════════
   İşletme tarafında ad şifreleme (Ü115 · A1)
   ═══════════════════════════════════════════════════════════

   Oyuncunun adı baştan beri şifreliydi (`docs/08` §2: "Ad, soyad →
   Şifreli"). İşletme tarafında aynı kural uygulanmamıştı ve tutarsızlık
   tek bir satırın içindeydi: personelin TELEFONU şifreli, ADI düz metin.

   Aşağıdaki testler üç somut kaydı sınıyor; sonuncusu **sınıfı** sınıyor
   — yeni bir göç düz metin bir ad kolonu geri getirirse orada kırılır. */

describe("ad şifreleme — işletme tarafı (Ü115)", () => {
  const olusturulanPersonel: string[] = [];
  const olusturulanPlatform: string[] = [];

  after(async () => {
    for (const id of olusturulanPersonel) {
      await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [id]);
      await yoneticiSorgu(`DELETE FROM staff WHERE id = $1`, [id]);
    }
    for (const id of olusturulanPlatform) {
      await yoneticiSorgu(`DELETE FROM platform_users WHERE id = $1`, [id]);
    }
  });

  test("🔴 personelin adı veritabanında düz metin durmuyor", async () => {
    const ad = `TEST Kasiyer ${randomInt(100000)}`;
    const staffId = await personelEkle({
      cafeId: kafeA,
      ad,
      pin: "4321",
      ekleyenId: "stf_test_u115",
    });
    olusturulanPersonel.push(staffId);

    const ham = await withBypass("test: ham personel satırı", (db) =>
      db.one<Record<string, unknown>>(
        `SELECT id, name_enc::text AS a FROM staff WHERE id = $1`,
        [staffId],
      ),
    );
    assert.ok(!JSON.stringify(ham).includes(ad), "personel adı düz metin görünüyor");

    // Şifrelemek işe yaramazsa panel de boşalır: okuma yolu da sınanıyor.
    const liste = await personelListele(kafeA);
    assert.ok(
      liste.some((p) => p.id === staffId && p.ad === ad),
      "panel listesi adı geri veremedi",
    );
  });

  /**
   * 🔴 Kasa girişi — Ü115'te değişen tek "sıcak yol".
   *
   * `pinGiris` artık adı çözüyor ve bu fonksiyonun **hiç testi yoktu**.
   * Ü114 tam burada yaşandı: cihaz kaydı bozulmuştu, hiçbir kasiyer
   * giremiyordu ve kimse fark etmedi. Aynı yolu ikinci kez testsiz
   * bırakmıyoruz.
   */
  test("🔴 kasiyer PIN'le girebiliyor ve adı doğru çözülüyor", async () => {
    const ad = `TEST Kasa ${randomInt(100000)}`;
    const pin = "8642"; // tohumdaki 1234/9999 ile çakışmasın
    // Ü285: kapı artık cihaz değil konum (`konumdakiKafe`, tests/kasa-giris);
    // burada yalnızca PIN'in ve adın yolu.
    const ipAnahtari = `test-ip-${randomInt(1_000_000)}`;

    const staffId = await personelEkle({
      cafeId: kafeA,
      ad,
      pin,
      ekleyenId: "stf_test_u115",
    });
    olusturulanPersonel.push(staffId);

    const sonuc = await pinGiris({ cafeIdler: [kafeA], pin, ipAnahtari });
    assert.equal(sonuc.durum, "gecerli", "doğru PIN'le giriş reddedildi");
    assert.equal(sonuc.durum === "gecerli" && sonuc.ad, ad, "kasa ekranına yanlış ad gitti");

    const yanlis = await pinGiris({ cafeIdler: [kafeA], pin: "8643", ipAnahtari });
    assert.equal(yanlis.durum, "yanlis");
  });

  test("platform çalışanının adı da şifreli", async () => {
    // G9 platform ekibini ikiye ayırıyor ama ikisi de gerçek kişi.
    const ad = `TEST Platformcu ${randomInt(100000)}`;
    const telefon = yeniTelefon();
    const id = await platformKullanicisiEkle({ ad, telefon, rol: "platform_destek" });
    olusturulanPlatform.push(id);

    const ham = await withBypass("test: ham platform satırı", (db) =>
      db.one<Record<string, unknown>>(
        `SELECT id, name_enc::text AS a FROM platform_users WHERE phone_index = $1`,
        [phoneIndex(telefon)],
      ),
    );
    assert.ok(!JSON.stringify(ham).includes(ad), "platform kullanıcısının adı düz metin");

    const bulunan = await platformKullanicisiBul(telefon);
    assert.equal(bulunan?.ad, ad, "giriş akışı adı geri veremedi");
  });

  test("🔴 yetkili adı ve iki telefon şifreli", async () => {
    // Şahıs şirketinde yetkilinin adı ve işletmenin numarası aynı kişiye
    // ait olabilir; başvuranın tüzel mi şahıs mı olduğunu sistem bilemez.
    //
    // ⚠️ Ü126: ticari unvan ve adres artık başvuruda sorulmuyor, bu yüzden
    // burada da sınanmıyorlar. Kolonlar duruyor (eski kayıtlarda dolu) ve
    // okuyan taraf `null` kaldırıyor.
    const yetkili = `TEST Yetkili ${randomInt(100000)}`;
    const isletmeTel = `0212 ${randomInt(100, 999)} ${randomInt(10, 99)} ${randomInt(10, 99)}`;
    const cep = yeniTelefon();

    const olusan = await basvuruOlustur({
      ad: "Şifreli Başvuru",
      sehir: "Ankara",
      yetkiliAdi: yetkili,
      isletmeTelefonu: isletmeTel,
      yetkiliTelefon: cep,
    });
    assert.ok("cafeId" in olusan, "başvuru oluşmalıydı");
    olusturulanKafeler.push(olusan.cafeId);

    const ham = await withBypass("test: ham kafe satırı", (db) =>
      db.one<Record<string, unknown>>(
        `SELECT id, name, city, contact_name_enc::text AS y,
                contact_phone_enc::text AS c, business_phone_enc::text AS i
           FROM cafes WHERE id = $1`,
        [olusan.cafeId],
      ),
    );
    assert.ok(ham, "kafe satırı okunamadı");
    const govde = JSON.stringify(ham);
    assert.ok(!govde.includes(yetkili), "yetkili adı düz metin görünüyor");
    assert.ok(!govde.includes(isletmeTel), "işletme telefonu düz metin görünüyor");
    assert.ok(!govde.includes(cep), "yetkili cebi düz metin görünüyor");

    // ⚠️ İşletme adı ve şehir BİLEREK düz: vitrindeki tabela ve oyuncunun
    // gördüğü kafe. Şifrelemek hiçbir şeyi korumaz, ekranları yavaşlatırdı.
    assert.equal(ham.name, "Şifreli Başvuru", "işletme adı şifrelenmemeliydi");
    assert.equal(ham.city, "Ankara", "şehir şifrelenmemeliydi");

    const kayit = (await basvurulariListele("pending")).find((b) => b.id === olusan.cafeId);
    assert.equal(kayit?.yetkiliAdi, yetkili, "inceleme ekranı yetkili adını veremedi");

    // ⚠️ İşletme telefonu MASKESİZ dönüyor (Ü126): müşteriye zaten duyurulan
    // numara. Yetkilinin cebi ise maskeli — tam hâli `telefonuAc` ile ve
    // denetim izine düşerek açılıyor.
    assert.equal(kayit?.isletmeTelefonu, isletmeTel, "işletme telefonu maskesiz dönmeli");
    assert.ok(
      kayit?.yetkiliTelefonMaskeli?.includes("*"),
      "yetkilinin cebi listede maskeli dönmeli",
    );
  });

  test("onay, yetkilinin adını yöneticiye şifreli taşıyor", async () => {
    // Kafe onaylanınca yönetici personel kaydı doğuyor; adı `cafes`'ten
    // geliyor. Blob kopyalanmıyor, çözülüp yeniden şifreleniyor —
    // kopyalansaydı A2'de (anahtar rotasyonu) sessizce eski sürümde kalırdı.
    const yetkili = `TEST Onay Yetkili ${randomInt(100000)}`;
    const telefon = yeniTelefon();

    const olusan = await basvuruOlustur({
      ad: "Onay Şifre",
      sehir: "Bursa",
      yetkiliAdi: yetkili,
      isletmeTelefonu: "0212 123 45 67",
      yetkiliTelefon: telefon,
    });
    assert.ok("cafeId" in olusan);
    olusturulanKafeler.push(olusan.cafeId);

    await onayla(olusan.cafeId, "pu_test");

    const yonetici = await yoneticiBul(telefon);
    assert.equal(yonetici?.ad, yetkili, "yönetici kaydına ad taşınmadı");

    const ham = await withBypass("test: ham yönetici satırı", (db) =>
      db.one<Record<string, unknown>>(
        `SELECT id, name_enc::text AS a FROM staff WHERE cafe_id = $1`,
        [olusan.cafeId],
      ),
    );
    assert.ok(!JSON.stringify(ham).includes(yetkili), "yönetici adı düz metin görünüyor");
  });

  /**
   * 🔴 ASIL GÜVENCE — tek tek kayıtları değil SINIFI sınıyor.
   *
   * Ü107'de aynı şey RLS için yapılmıştı: "cafe_id taşıyan her tabloda
   * RLS" testi, o günün açığını değil, açığın **türünü** kapattı ve sonra
   * eklenen tabloları kendiliğinden kapsadı.
   *
   * Buradaki karşılığı: kimlik taşıyan dört tabloda ada/adrese benzeyen
   * hiçbir metin kolonu olamaz. Yarın bir göç `staff.display_name text`
   * eklerse bu test kırılır — kimsenin hatırlamasına gerek kalmadan.
   *
   * Muafiyet listesi kısa kalmalı; her satır bir iddiadır ve gerekçesiyle
   * birlikte durur.
   */
  const AD_BENZERI = /(^|_)(name|ad|adi|soyad|surname|fullname|address|adres)(_|$)/i;

  const DUZ_KALABILIR: Record<string, string> = {
    "cafes.name": "işletme adı — vitrindeki tabela. Oyuncu ekranlarında, liderlikte ve karekodda görünüyor; kişisel veri değil (docs/24 §1.2)",
  };

  test("🔴 kimlik tablolarında düz metin ad kolonu yok", async () => {
    const kolonlar = await withBypass("test: şema taraması", (db) =>
      db.all<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name IN ('players','staff','platform_users','cafes')
            AND data_type IN ('text','character varying','character')`,
      ),
    );

    const duzKalanlar = kolonlar
      .map((k) => `${k.table_name}.${k.column_name}`)
      .filter((t) => AD_BENZERI.test(t.split(".")[1]))
      .filter((t) => !DUZ_KALABILIR[t])
      .sort();

    assert.deepEqual(
      duzKalanlar,
      [],
      "bu kolonlar ad/adres taşıyor ve düz metin duruyor — şifrele (lib/crypto.ts) " +
        "ya da gerekçesiyle DUZ_KALABILIR listesine ekle (docs/08 §2)",
    );
  });

  test("muafiyet listesindeki her satırın gerekçesi var", () => {
    for (const [kolon, gerekce] of Object.entries(DUZ_KALABILIR)) {
      assert.ok(gerekce.length > 15, `${kolon}: gerekçe yetersiz`);
    }
  });
});

/* ── E-posta normalizasyonu ve kör indeksi (Ü168) ──────────── */

describe("e-posta adresi", () => {
  test("büyük harf ve boşluk aynı adrese iner", () => {
    assert.equal(normalizeEmail("  Buse@Ornek.COM "), "buse@ornek.com");
  });

  test("🔴 nokta ve +etiket KIRPILMIYOR — sağlayıcıya özel kurallar", () => {
    /*
      `b.u.s.e@gmail.com` → `buse@gmail.com` dönüşümü yalnızca bazı
      sağlayıcılarda doğru. Genel kural sanıp uygulamak, başka bir
      sağlayıcıda iki ayrı insanın adresini aynı hesaba bağlar —
      yani hesabı yanlış kişiye açar.
    */
    assert.equal(normalizeEmail("b.u.s.e@ornek.com"), "b.u.s.e@ornek.com");
    assert.equal(normalizeEmail("buse+kafe@ornek.com"), "buse+kafe@ornek.com");
  });

  test("bozuk adresler reddediliyor, sessizce düzeltilmiyor", () => {
    for (const bozuk of [
      "buse",
      "buse@",
      "@ornek.com",
      "buse@ornek",
      "buse@@ornek.com",
      "bu se@ornek.com",
      "buse@.com",
      "buse@ornek.",
      `${"u".repeat(65)}@ornek.com`,
    ]) {
      assert.throws(() => normalizeEmail(bozuk), /Geçersiz e-posta/, `kabul edildi: ${bozuk}`);
    }
  });

  test("kör indeks kararlı ve farklı adresler farklı indeks üretiyor", () => {
    assert.deepEqual(emailIndex("buse@ornek.com"), emailIndex("buse@ornek.com"));
    assert.notDeepEqual(emailIndex("buse@ornek.com"), emailIndex("ayse@ornek.com"));
  });

  test("🔴 e-posta indeksi TELEFON indeksinden farklı anahtarla üretiliyor", () => {
    /*
      Aynı girdi iki indeksleyiciye verildiğinde aynı çıktı gelirse,
      anahtarlar aynı demektir ve ayrı şifrelemenin anlamı kalmaz:
      telefon indeksi anahtarı sızdığında e-posta indeksi de çözülür.
    */
    const ayni = "buse@ornek.com";
    assert.notDeepEqual(emailIndex(ayni), phoneIndex(ayni));
  });

  test("düz metin adres şifreli alandan geri okunuyor", () => {
    const adres = normalizeEmail("Buse@Ornek.com");
    assert.equal(decryptPII(encryptPII(adres)), "buse@ornek.com");
  });
});

/* ── Kayıtta e-posta (Ü168) ────────────────────────────────── */

describe("kayıtta e-posta", () => {
  test("adres şifreli yazılıyor ve geri okunuyor", async () => {
    const adres = benzersizEposta();
    const { oyuncu } = await kaydet({
      telefon: yeniTelefon(),
      eposta: adres,
      ad: "Eposta",
      soyad: "Testi",
      dogumYili: 1990,
      pazarlamaIzni: false,
    });
    assert.equal(oyuncu.eposta, adres);
  });

  test("büyük harfle yazılan adres normalize edilerek saklanıyor", async () => {
    /*
      Normalize edilmeseydi `Buse@X.com` ile `buse@x.com` iki ayrı
      hesap olurdu ve "bu adres kayıtlı" kontrolü delinirdi.
    */
    const adres = benzersizEposta();
    const { oyuncu } = await kaydet({
      telefon: yeniTelefon(),
      eposta: adres.toUpperCase(),
      ad: "Buyuk",
      soyad: "Harf",
      dogumYili: 1990,
      pazarlamaIzni: false,
    });
    assert.equal(oyuncu.eposta, adres.toLowerCase());
  });

  test("e-postayla aranınca aynı hesap bulunuyor", async () => {
    const adres = benzersizEposta();
    const { oyuncu } = await kaydet({
      telefon: yeniTelefon(),
      eposta: adres,
      ad: "Arama",
      soyad: "Testi",
      dogumYili: 1990,
      pazarlamaIzni: false,
    });
    const bulunan = await epostaylaBul(adres);
    assert.equal(bulunan?.id, oyuncu.id);
  });

  test("🔴 aynı adresle BAŞKA numaraya hesap açılamıyor", async () => {
    const adres = benzersizEposta();
    await kaydet({
      telefon: yeniTelefon(),
      eposta: adres,
      ad: "Ilk",
      soyad: "Sahip",
      dogumYili: 1990,
      pazarlamaIzni: false,
    });

    await assert.rejects(
      kaydet({
        telefon: yeniTelefon(),
        eposta: adres,
        ad: "Ikinci",
        soyad: "Kisi",
        dogumYili: 1990,
        pazarlamaIzni: false,
      }),
      /başka bir hesapta kayıtlı/,
    );
  });

  test("aynı NUMARAYLA ikinci kayıt mevcut hesabı döndürüyor, e-posta çakıştırmıyor", async () => {
    /*
      G13'ün davranışı korunuyor: numara zaten kayıtlıysa yeni hesap
      açılmıyor, mevcut hesap dönüyor. O dalda e-posta hiç sınanmıyor —
      kimliği numara kurmuş durumda. Sınansaydı, e-postasını değiştirmek
      isteyen oyuncu kendi hesabına giremezdi.
    */
    const telefon = yeniTelefon();
    const ilk = await kaydet({
      telefon,
      eposta: benzersizEposta(),
      ad: "Ayni",
      soyad: "Numara",
      dogumYili: 1990,
      pazarlamaIzni: false,
    });

    const ikinci = await kaydet({
      telefon,
      eposta: benzersizEposta(),
      ad: "Ayni",
      soyad: "Numara",
      dogumYili: 1990,
      pazarlamaIzni: false,
    });

    assert.equal(ikinci.yeni, false);
    assert.equal(ikinci.oyuncu.id, ilk.oyuncu.id);
    assert.equal(ikinci.oyuncu.eposta, ilk.oyuncu.eposta, "e-posta değişmiş");
  });
});

/* ── Kanal seçimi (Ü170) ───────────────────────────────────── */

describe("doğrulama kodunun kanalı", () => {
  /*
    🔴 Bu blok bir REGRESYONUN üstüne yazıldı.

    Kod e-postaya taşınırken yalnızca oyuncular düşünüldü. Ama
    `kodIste`yi kafe paneli ve platform girişi de çağırıyor ve onların
    kimliği `staff` tablosunda — orada e-posta kolonu yok. Varsayılan
    e-posta olunca o iki giriş sessizce `eposta_yok` dönmeye başladı:
    kafe sahibi paneline hiç giremez olmuştu.

    Kimse fark etmedi çünkü **o yolun testi yoktu.** Şimdi var.
  */

  test("🔴 personel kanalı (SMS) oyuncu kaydı olmadan da çalışıyor", async () => {
    const tel = yeniTelefon();
    // Bu numaranın `players` içinde karşılığı YOK — personel böyle.
    const istek = await kodIste({ telefon: tel, kanal: "sms", amac: "login" });
    assert.equal(
      istek.durum,
      "gonderildi",
      "personel girişi e-posta aramamalı — kimliği staff tablosunda",
    );
    await otpTemizle(tel);
  });

  test("oyuncu kanalı e-postasız hesapta kod göndermiyor", async () => {
    /*
      Aynı numara, kanal e-posta: bu kez `eposta_yok` dönmeli. İki
      testin farkı yalnızca `kanal` — yani dallanmanın gerçekten
      kanala baktığını gösteriyor, başka bir şeye değil.
    */
    const tel = yeniTelefon();
    const istek = await kodIste({ telefon: tel, kanal: "eposta", amac: "login" });
    assert.equal(istek.durum, "eposta_yok");
  });

  test("🔴 GİRİŞTE adres formdan değil HESAPTAN okunuyor", async () => {
    /*
      Saldırı: formda başkasının numarası, e-posta alanında kendi
      adresim. Adres olduğu gibi kullanılsaydı başkasının hesabına
      giriş kodu alırdım — parolayı bilmeden, telefona dokunmadan.
    */
    const kurbanTelefon = yeniTelefon();
    const kurbanAdres = benzersizEposta();
    await kaydet({
      telefon: kurbanTelefon,
      eposta: kurbanAdres,
      ad: "Kurban",
      soyad: "Hesap",
      dogumYili: 1990,
      pazarlamaIzni: false,
    });

    const saldirganAdresi = benzersizEposta();
    const istek = await kodIste({
      telefon: kurbanTelefon,
      eposta: saldirganAdresi,
      amac: "login",
    });
    assert.equal(istek.durum, "gonderildi");

    // Kod kurbanın adresine gitti, saldırganınkine değil.
    const saldirgana = await withBypass("test: saldırgan adresine giden", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*)::text AS n FROM email_outbox WHERE email_index = $1`,
        [emailIndex(saldirganAdresi)],
      ),
    );
    assert.equal(Number(saldirgana?.n ?? 0), 0, "kod SALDIRGANIN adresine gitmiş");

    const kurbana = await withBypass("test: kurban adresine giden", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*)::text AS n FROM email_outbox WHERE email_index = $1`,
        [emailIndex(kurbanAdres)],
      ),
    );
    assert.ok(Number(kurbana?.n ?? 0) > 0, "kod hesabın kendi adresine gitmeliydi");

    await otpTemizle(kurbanTelefon);
  });
});
