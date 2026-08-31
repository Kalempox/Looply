import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass, withCafe } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet, takmaAd } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as rapor from "@/domain/rapor";
import { isGunu, pazartesi } from "@/lib/tarih";
import { yoneticiSorgu } from "./_yardim";

/**
 * FAZ 8 GÜVENLİK KAPISI — kafe raporları.
 *
 * Üç iddia sınanıyor:
 *   1. Rapor çıktısında hiçbir kişisel veri bulunmaz (G1)
 *   2. Az kişilik istatistikten kimlik çıkarımı yapılamaz (Ü30, eşik 5)
 *   3. Her rapor görüntüleme denetim izine düşer
 *
 * Ayrıca Ü29'un baş sayısı — nitelikli oyuncu — doğru sayılıyor mu.
 */

let kafeA = "";
let kafeB = "";
let yoneticiA = "";
let azMasa = "";
let azMasaAdi = "";
let cokMasa = "";
const oyuncular: string[] = [];

const aralik = rapor.buHafta();
const bugun = isGunu();

const TABAN = 3_000_000 + randomInt(5_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0555${String(TABAN + sayac++).slice(-7)}`);

/**
 * Rapor için kontrollü veri üretir.
 *
 * Oyun motoru üzerinden oynatmak yerine doğrudan `play_sessions` yazılıyor:
 * sınanan şey raporlama katmanı ve eşiğin **kaç kişide** devreye girdiğini
 * kesin bilmek gerekiyor.
 */
async function oturumYaz(playerId: string, tableId: string, nitelikli: boolean, saat: number) {
  await yoneticiSorgu(
    `INSERT INTO play_sessions
       (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
        started_at, ended_at, server_score, proof_mask, proof_level,
        business_date, status, is_qualified)
     VALUES ($1,$2,$3,$4,decode(md5($4),'hex'),'blok','tohum',
             ($5::date + ($6 || ' hours')::interval) AT TIME ZONE 'Europe/Istanbul',
             now(), 100, 3, 2, $5, 'completed', $7)`,
    [`oyn_rapor_${playerId}_${tableId}_${saat}`, kafeA, tableId, playerId, bugun, String(saat), nitelikli],
  );
}

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const a = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const b = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-b'");
    const y = await db.one<{ id: string }>(
      "SELECT id FROM staff WHERE cafe_id = $1 AND role = 'manager' LIMIT 1",
      [a!.id],
    );
    const t = await db.all<{ id: string; label: string }>(
      "SELECT id, label FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order DESC LIMIT 2",
      [a!.id],
    );
    return { a: a?.id, b: b?.id, y: y?.id, t };
  });
  assert.ok(v.a && v.b && v.y && v.t.length === 2, "Tohum verisi eksik");
  kafeA = v.a;
  kafeB = v.b;
  yoneticiA = v.y;
  azMasa = v.t[0].id;
  cokMasa = v.t[1].id;
  azMasaAdi = v.t[0].label;

  // Önceki koşudan kalan test satırları bu haftanın sayılarını bozmasın.
  await yoneticiSorgu(`DELETE FROM play_sessions WHERE id LIKE 'oyn_rapor_%'`);

  // Üç oyuncu az kullanılan masada (eşiğin ALTINDA), altı oyuncu çok
  // kullanılan masada (eşiğin ÜSTÜNDE). Eşik tam burada sınanıyor.
  for (let i = 0; i < 9; i++) {
    const p = (
      await kaydet({
        telefon: yeniTelefon(),
        ad: `Rapor${i}`,
        soyad: "Testi",
        dogumYili: 1990,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;
    oyuncular.push(p);
    await takmaAd(kafeA, p);

    const azMi = i < 3;
    // Saat de aynı mantıkla ayrılıyor: 9'da üç kişi, 15'te altı kişi.
    await oturumYaz(p, azMi ? azMasa : cokMasa, true, azMi ? 9 : 15);
  }
});

after(async () => {
  await yoneticiSorgu(`DELETE FROM play_sessions WHERE id LIKE 'oyn_rapor_%'`);
  for (const p of oyuncular) {
    await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [p]);
  }
  await yoneticiSorgu(
    `DELETE FROM audit_log WHERE cafe_id = $1 AND action IN ('report.view','report.export')`,
    [kafeA],
  );
  await closePools();
});

/* ═══════════════════════════════════════════════════════════
   1 · Ü29 — baş sayı doğru
   ═══════════════════════════════════════════════════════════ */

describe("nitelikli oyuncu sayımı (Ü29)", () => {
  test("dokuz nitelikli oturum dokuz oyuncu olarak sayılır", async () => {
    const o = await rapor.ozet(kafeA, aralik);
    assert.ok(o.nitelikliOyuncu >= 9, `beklenen ≥9, bulunan ${o.nitelikliOyuncu}`);
    assert.ok(o.tekilOyuncu >= 9);
  });

  test("kazanılan ve kullanılan indirim ayrı sayılır", async () => {
    const o = await rapor.ozet(kafeA, aralik);
    // Kullanılan, kazanılanı aşamaz — kasada onaylanan her kupon önce verilmiş olmalı.
    assert.ok(
      o.kullanilanIndirimKurus <= o.kazanilanIndirimKurus,
      "kullanılan indirim kazanılanı aştı",
    );
  });

  test("hafta aralığı pazartesiden pazartesiye (Ü25 ile aynı takvim)", () => {
    assert.equal(aralik.baslangic, pazartesi(bugun));
    const gecen = rapor.gecenHafta(bugun);
    assert.equal(gecen.bitis, aralik.baslangic);
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Ü30 — mahremiyet eşiği
   ═══════════════════════════════════════════════════════════ */

describe("mahremiyet eşiği (Ü30)", () => {
  test("beş kişiden az içeren masa gizlenir", async () => {
    const masalar = await rapor.masaHareketi(kafeA, aralik);

    const az = masalar.find((m) => m.masa === azMasaAdi);
    assert.ok(az, `${azMasaAdi} raporda yok`);
    assert.equal(az.oyuncu, null, "üç kişilik masa açıkta gösterildi");
  });

  test("hiçbir satır eşiğin altında sayı göstermiyor — asıl güvence", async () => {
    // Belirli bir satırı sınamak kırılgan: masada başka trafik olabilir.
    // Asıl iddia şu — dönen HİÇBİR satırda 1..4 arası bir sayı görünmemeli.
    const masalar = await rapor.masaHareketi(kafeA, aralik);
    const saatler = await rapor.saatlikDagilim(kafeA, aralik);

    for (const m of masalar) {
      assert.ok(
        m.oyuncu === null || m.oyuncu === 0 || m.oyuncu >= rapor.GIZLEME_ESIGI,
        `${m.masa} eşiğin altında sayı gösterdi: ${m.oyuncu}`,
      );
    }
    for (const s of saatler) {
      assert.ok(
        s.oyuncu === null || s.oyuncu === 0 || s.oyuncu >= rapor.GIZLEME_ESIGI,
        `${s.saat}:00 eşiğin altında sayı gösterdi: ${s.oyuncu}`,
      );
    }
  });

  test("eşiğin üstündeki masa gerçek sayıyı gösterir", async () => {
    const masalar = await rapor.masaHareketi(kafeA, aralik);
    const cok = masalar.find((m) => (m.oyuncu ?? 0) >= rapor.GIZLEME_ESIGI);
    assert.ok(cok, "eşiğin üstünde masa bulunamadı");
    assert.ok(cok.oyuncu !== null);
  });

  test("beş kişiden az içeren saat gizlenir", async () => {
    const saatler = await rapor.saatlikDagilim(kafeA, aralik);

    const dokuz = saatler.find((s) => s.saat === 9);
    const onbes = saatler.find((s) => s.saat === 15);
    assert.ok(dokuz && onbes);
    assert.equal(dokuz.oyuncu, null, "üç kişilik saat açıkta gösterildi");
    assert.ok((onbes.oyuncu ?? 0) >= rapor.GIZLEME_ESIGI, "altı kişilik saat gizlendi");
  });

  test("gizleme toplamı bozmuyor", async () => {
    const o = await rapor.ozet(kafeA, aralik);
    // Özet gizlemeye tabi değil: tek satır kişiyi işaret etmez, toplam etmez.
    assert.ok(o.tekilOyuncu >= 9, "toplam sayı gizlendi — eşik yanlış yere uygulanmış");
  });

  test("sıfır olan grup gizlenmiş sayılmaz", async () => {
    const saatler = await rapor.saatlikDagilim(kafeA, aralik);
    const bos = saatler.find((s) => s.saat === 4);
    assert.equal(bos?.oyuncu, 0, "boş saat `<5` gibi gösterildi — bilgi kaybı");
  });

  test("gizlenmiş dönem 'boş dönem' sayılmaz — REGRESYON", () => {
    // Gerçekleşen hata: ekran `s.oyuncu ?? 0` ile baktığı için gizlenmiş
    // saatleri sıfır sayıyor ve üç oyunun oynandığı haftada "bu dönemde
    // henüz oyun oynanmadı" yazıyordu. Rapor satılan şeyin kanıtı; boş
    // olmadığı hâlde boş demesi yanlış beyandır.
    const hepsiBos = Array.from({ length: 24 }, (_, saat) => ({ saat, oyuncu: 0 }));
    const biriGizli = hepsiBos.map((s) => (s.saat === 21 ? { ...s, oyuncu: null } : s));

    assert.equal(rapor.donemBos(hepsiBos), true);
    assert.equal(rapor.donemBos(biriGizli), false, "gizlenmiş saat boş dönem sayıldı");
  });

  test("dışa aktarmada da eşik geçerli", async () => {
    const csv = await rapor.disaAktar(kafeA, aralik);
    assert.match(csv, new RegExp(`<${rapor.GIZLEME_ESIGI}`), "CSV'de gizleme uygulanmamış");
    assert.match(csv, /mahremiyet için gizlenmiştir/);
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · G1 — kişisel veri yok
   ═══════════════════════════════════════════════════════════ */

describe("raporda kişisel veri yok (G1)", () => {
  test("doğrulama defteri yalnızca anonim kod taşır", async () => {
    const z = await rapor.ziyaretler(kafeA, aralik);
    assert.ok(z.length >= 9, "defter boş");

    for (const satir of z) {
      assert.match(satir.kod, /^P-/, `anonim kod beklenirken: ${satir.kod}`);

      for (const alan of Object.keys(satir)) {
        assert.ok(
          !/player|telefon|phone|ad$|soyad|isim|name|mail/i.test(alan),
          `defterde kişisel veri alanı var: ${alan}`,
        );
      }
    }
  });

  test("defterde oyuncu kimliği geçmiyor", async () => {
    const z = await rapor.ziyaretler(kafeA, aralik);
    const metin = JSON.stringify(z);

    for (const p of oyuncular) {
      assert.ok(!metin.includes(p), "defterde oyuncu kimliği sızdı");
    }
  });

  test("dışa aktarılan dosyada kişisel veri yok", async () => {
    const csv = await rapor.disaAktar(kafeA, aralik);
    for (const p of oyuncular) {
      assert.ok(!csv.includes(p), "CSV'de oyuncu kimliği sızdı");
    }
    assert.ok(!/05\d{9}/.test(csv), "CSV'de telefon numarası var");
    assert.ok(!/Rapor\d/.test(csv), "CSV'de oyuncu adı var");
    assert.ok(!/Testi/.test(csv), "CSV'de oyuncu soyadı var");
  });

  test("dosya ekranın gösterdiği her bölümü taşıyor", async () => {
    // Ekranda olup dosyada olmayan bölüm, "denetleyebilirsin" sözünü yarım
    // bırakır: denetim ancak dosya muhasebeciye gidebildiğinde denetimdir.
    const csv = await rapor.disaAktar(kafeA, aralik);
    for (const bolum of [
      "ÖZET",
      "MASA HAREKETİ",
      "SAATLİK DAĞILIM",
      "KAMPANYA SONUÇLARI",
      "DOĞRULAMA DEFTERİ",
    ]) {
      assert.ok(csv.includes(bolum), `CSV'de ${bolum} bölümü yok`);
    }
    // Defter satırı anonim kodla geliyor.
    assert.match(csv, /P-[A-Z0-9]+;/, "defter satırı anonim kod taşımıyor");
  });

  test("anonim kod kafeye özel — başka kafede aynı kod çıkmaz", async () => {
    const p = oyuncular[0];
    const kodA = await takmaAd(kafeA, p);
    const kodB = await takmaAd(kafeB, p);
    assert.notEqual(kodA, kodB, "aynı oyuncu iki kafede aynı kodla görünüyor");

    await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1 AND cafe_id = $2`, [
      p,
      kafeB,
    ]);
  });
});

/* ═══════════════════════════════════════════════════════════
   4 · Denetim izi ve izolasyon
   ═══════════════════════════════════════════════════════════ */

describe("denetim izi ve kiracı izolasyonu", () => {
  test("rapor görüntüleme denetim izine düşer", async () => {
    await rapor.goruntulemeyiKaydet({ cafeId: kafeA, aktorId: yoneticiA, aralik });

    const iz = await withCafe(kafeA, (db) =>
      db.all<{ action: string }>(
        `SELECT action FROM audit_log WHERE action = 'report.view' ORDER BY created_at DESC LIMIT 1`,
      ),
    );
    assert.equal(iz.length, 1, "rapor görüntüleme kayda geçmedi");
  });

  test("dışa aktarma ayrı bir işlem olarak kaydedilir", async () => {
    await rapor.goruntulemeyiKaydet({
      cafeId: kafeA,
      aktorId: yoneticiA,
      aralik,
      disaAktarma: true,
    });

    const iz = await withCafe(kafeA, (db) =>
      db.all(`SELECT 1 FROM audit_log WHERE action = 'report.export'`),
    );
    assert.ok(iz.length >= 1, "dışa aktarma kayda geçmedi");
  });

  test("başka kafe bu kafenin raporunu göremez", async () => {
    const digerinde = await rapor.ozet(kafeB, aralik);
    const kendinde = await rapor.ozet(kafeA, aralik);

    assert.ok(kendinde.nitelikliOyuncu >= 9);
    assert.notEqual(
      digerinde.nitelikliOyuncu,
      kendinde.nitelikliOyuncu,
      "iki kafe aynı sayıyı görüyor — kiracı süzgeci çalışmıyor",
    );
  });

  test("başka kafe bu kafenin defterini göremez", async () => {
    const z = await rapor.ziyaretler(kafeB, aralik);
    const kodlar = z.map((x) => x.kod);

    const bizimKodlar = await withCafe(kafeA, (db) =>
      db.all<{ code: string }>(`SELECT code FROM player_aliases`),
    );

    for (const k of bizimKodlar) {
      assert.ok(!kodlar.includes(k.code), "başka kafe bizim anonim kodlarımızı gördü");
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   Ü44 · Yeni ve tekrar gelen müşteri
   ═══════════════════════════════════════════════════════════

   Raporun en çok satış değeri taşıyan iki sayısı. Yanlış hesaplanırsa
   kafeye olmayan bir şey satılmış olur, o yüzden ayrı ayrı sınanıyor.
*/

describe("yeni ve tekrar gelen müşteri (Ü44)", () => {
  /** Bu blok kendi oyuncularını ve kendi geçmişini kuruyor. */
  const kendiOyuncular: string[] = [];

  async function gecmisliOyuncu(gunler: number[]) {
    const { oyuncu } = await kaydet({
      telefon: yeniTelefon(),
      ad: "Buse",
      soyad: "Tekrar",
      dogumYili: 1992,
      pazarlamaIzni: false,
    });
    kendiOyuncular.push(oyuncu.id);
    oyuncular.push(oyuncu.id);

    for (const gun of gunler) {
      await yoneticiSorgu(
        `INSERT INTO play_sessions
           (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
            started_at, ended_at, server_score, proof_mask, proof_level,
            business_date, status, is_qualified)
         VALUES ($1,$2,NULL,$3,decode(md5($3),'hex'),'blok','tohum',
                 now(), now(), 100, 3, 2,
                 ($4::date + $5::int), 'completed', false)`,
        [`oyn_tekrar_${oyuncu.id}_${gun}`, kafeA, oyuncu.id, aralik.baslangic, String(gun)],
      );
    }
    return oyuncu.id;
  }

  after(async () => {
    for (const id of kendiOyuncular) {
      await yoneticiSorgu(`DELETE FROM play_sessions WHERE player_id = $1`, [id]);
    }
  });

  test("ilk oyununu bu dönemde oynayan YENİ, önceden geleni TEKRAR sayılıyor", async () => {
    const once = await rapor.ozet(kafeA, aralik);

    // Beşer kişi: eşiğin (Ü30) altında kalıp gizlenmesinler
    for (let i = 0; i < 5; i++) await gecmisliOyuncu([1]); // yalnızca bu dönem → yeni
    for (let i = 0; i < 5; i++) await gecmisliOyuncu([-9, 1]); // önce de gelmiş → tekrar

    const sonra = await rapor.ozet(kafeA, aralik);

    assert.equal(
      (sonra.yeniOyuncu ?? 0) - (once.yeniOyuncu ?? 0),
      5,
      "ilk oyununu bu dönemde oynayan beş kişi yeni sayılmalıydı",
    );
    assert.equal(
      (sonra.tekrarGelenOyuncu ?? 0) - (once.tekrarGelenOyuncu ?? 0),
      5,
      "önceden de gelmiş beş kişi tekrar gelen sayılmalıydı",
    );
  });

  /**
   * Dönem içinde iki kez gelen kişi **iki kez sayılmamalı**: bu sayı ziyaret
   * değil kişi sayıyor. Aksi hâlde kafeye "40 tekrar gelen" denip aslında
   * 20 kişinin ikişer kez geldiği bir tablo gösterilirdi.
   */
  test("aynı kişi dönemde iki kez geldiyse bir kez sayılıyor", async () => {
    const once = await rapor.ozet(kafeA, aralik);
    for (let i = 0; i < 5; i++) await gecmisliOyuncu([1, 2, 3]);
    const sonra = await rapor.ozet(kafeA, aralik);

    assert.equal(
      (sonra.yeniOyuncu ?? 0) - (once.yeniOyuncu ?? 0),
      5,
      "üç kez gelen beş kişi on beş değil beş sayılmalıydı",
    );
  });

  /**
   * Ü30: beşten az kişi içeren kırılım gizleniyor. Küçük bir kafede
   * "bu hafta 2 yeni müşteri" satırı, işletmecinin hafızasıyla birleşince
   * kişiyi işaret eder.
   */
  test("mahremiyet eşiği bu sayılarda da geçerli", async () => {
    const bosAralik = { baslangic: "2019-01-07", bitis: "2019-01-14" };
    const o = await rapor.ozet(kafeA, bosAralik);
    assert.equal(o.yeniOyuncu, 0, "hiç kimse yoksa sıfır görünmeli, gizlenmemeli");
    assert.equal(o.tekrarGelenOyuncu, 0);
  });

  /**
   * G1: "bu kafedeki ilk oyun" hesabı kafe bazında. Oyuncunun başka
   * kafedeki geçmişi buraya sızarsa, kafeler veriyi birleştirmiş olur.
   */
  test("başka kafedeki geçmiş bu kafenin sayısına karışmıyor", async () => {
    const oyuncu = await gecmisliOyuncu([1]);

    // Aynı oyuncu B kafesinde çok daha önce oynamış olsun
    await yoneticiSorgu(
      `INSERT INTO play_sessions
         (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
          started_at, ended_at, server_score, proof_mask, proof_level,
          business_date, status, is_qualified)
       VALUES ($1,$2,NULL,$3,decode(md5($3),'hex'),'blok','tohum',
               now(), now(), 100, 3, 2, ($4::date - 60), 'completed', false)`,
      [`oyn_tekrar_b_${oyuncu}`, kafeB, oyuncu, aralik.baslangic],
    );

    const a = await rapor.ozet(kafeA, aralik);
    assert.ok(
      (a.yeniOyuncu ?? 0) > 0,
      "B kafesindeki geçmiş, A kafesinde bu kişiyi 'tekrar gelen' yapmamalı",
    );
  });
});
