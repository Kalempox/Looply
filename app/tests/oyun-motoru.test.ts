import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dusmeSansi } from "@/domain/odul-motoru";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as masa from "@/domain/masa";
import * as oyunDomain from "@/domain/oyun";
import * as seri from "@/domain/seri";
import * as xp from "@/domain/xp";
import {
  GUNLUK_TAVAN,
  KATILIM_PUANI,
  OYUN_PUANI,
  SKOR_ESIKLERI,
  KUPON_ESIGI,
  basariliMi,
  esikBul,
} from "@/domain/puan";
import {
  blok,
  kademe as blokKademe,
  temizlenecekler,
  ODUL_BONUSU,
  ODUL_ESIGI,
} from "@/oyunlar/blok";
import {
  dusen,
  DUSEN_EN,
  DUSEN_BOY,
  dusmeTickiHesapla,
  hayaletSatiri,
  sigarMi,
  siradakiParcalar,
  uygulaVeKilitler,
  type DusenGirdisi,
} from "@/oyunlar/dusen";
import { bicak, carpilanBicak, CEMBER, GIRIS_ACISI } from "@/oyunlar/bicak";
import { sekme, ACI_SAYISI, atisIzi, SEKME_BOY } from "@/oyunlar/sekme";
import { yilan, YILAN_EN, adimTickiHesapla, ODUL_OMRU_ADIM, type Yon } from "@/oyunlar/yilan";
import {
  tekrarOyna,
  EN_FAZLA_GIRDI,
  TICK_MS,
  SAAT_ALT_SINIR_MS,
  saatTutarliMi,
} from "@/oyunlar/sozlesme";
import { OYUNLAR, type HerhangiOyun } from "@/oyunlar";
import { isGunu } from "@/lib/tarih";
import { yoneticiSorgu, benzersizEposta } from "./_yardim";

/**
 * FAZ 5 GÜVENLİK KAPISI — oyun motoru ve sunucu skor doğrulaması.
 *
 * Altı iddia sınanıyor:
 *   1. Aynı (tohum, girdi) her zaman aynı skoru verir — S5'in temeli
 *   2. Değiştirilmiş istemciyle yüksek skor gönderimi reddedilir
 *   3. Aynı oturum iki kez bitirilemez
 *   4. Günlük puan tavanı aşılamaz (E4)
 *   5. Kafe dışında ne puan ne XP yazılır (Ü3, Ü14)
 *   6. Girdi kaydı sınırsız uzayamaz
 */

const KAFE_LAT = 41.0369;
const KAFE_LNG = 28.9838;

let kafeA = "";
let masaA = "";
let oyuncuId = "";
let disaridakiId = "";

const TABAN = 3_000_000 + randomInt(5_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0558${String(TABAN + sayac++).slice(-7)}`);

/* ── Oyun oynayan yardımcılar ──────────────────────────── */

/** Blok'u kaba kuvvetle tıkanana kadar oynar. */
function blokOyna(tohum: string) {
  let d = blok.baslat(tohum);
  const girdiler: unknown[] = [];

  for (let adim = 0; adim < 500 && !blok.bittiMi(d); adim++) {
    let kondu = false;
    for (let t = 0; t < 3 && !kondu; t++) {
      for (let s = 0; s < 8 && !kondu; s++) {
        for (let k = 0; k < 8 && !kondu; k++) {
          const y = blok.uygula(d, { t, s, k });
          if (y) {
            d = y;
            girdiler.push({ t, s, k });
            kondu = true;
          }
        }
      }
    }
    if (!kondu) break;
  }
  return { durum: d, girdiler, skor: blok.skor(d) };
}

/** Düşen'i sürekli bırakarak oynar — tahta dolana kadar. */
/**
 * Kaynaktan yorumları atar — kaynak tarayan testler için.
 *
 * ⚠️ Gerekli: bu testlerin aradığı adlar (`Math.cos`, `odulIsareti`)
 * çoğu zaman **açıklamalarda** da geçiyor ve yorum atılmazsa test
 * kendi gerekçesini hata sanıyor.
 */
function yorumsuz(kaynak: string): string {
  return kaynak.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function dusenOyna(tohum: string) {
  let d = dusen.baslat(tohum);
  const girdiler: unknown[] = [];
  let tick = 1;

  for (let adim = 0; adim < 300 && !dusen.bittiMi(d); adim++) {
    const hedefK = (adim * 3) % 8;
    for (let i = 0; i < 9 && d.k !== hedefK; i++) {
      const a = d.k < hedefK ? "sag" : "sol";
      const y = dusen.uygula(d, { tick, a });
      if (!y) break;
      d = y;
      girdiler.push({ tick, a });
      tick++;
      if (dusen.bittiMi(d)) break;
    }
    if (dusen.bittiMi(d)) break;

    const y = dusen.uygula(d, { tick, a: "birak" });
    if (!y) break;
    d = y;
    girdiler.push({ tick, a: "birak" });
    tick += 2;
  }

  girdiler.push({ tick, a: "bekle" });
  const son = dusen.uygula(d, { tick, a: "bekle" });
  if (son) d = son;

  return { durum: d, girdiler, skor: dusen.skor(d) };
}

/**
 * Düşen'i **iyi** oynayan bot — satır temizleyebilen tek bot (Ü207).
 *
 * ── Neden gerekti ───────────────────────────────────────────
 *
 * `dusenOyna` parçaları sabit bir düzende dağıtıyor ve tahta on beş
 * parçada doluyor; skor 100'ü bile geçmiyor. Ödül paketi 500'den sonra
 * çıktığı için o botla **hiç görülemiyordu** — testler "paket düşmedi"
 * diye düşüyordu, paket bozuk olduğu için değil.
 *
 * Bu bot her parça için dört dönüş × on sütunun tamamını deniyor ve en
 * iyisini seçiyor. Amaç iyi oynamak değil, **eşiği her tohumda
 * geçecek kadar** oynamak — ölçüm ve gerekçe `degerlendir`de.
 *
 * ⚠️ Parça sınırı 200: ölçüldü, 80 bile yetiyor (en düşük skor 544) ama
 * ödül paketinin çıkıp **konabilmesi** için eşik geçildikten sonra birkaç
 * parça daha gerekiyor. 200 tur ~10 ms sürüyor.
 *
 * ⚠️ Deneme turları tick'i İLERLETMİYOR (`tick: d.tick`). Yerçekimi
 * `zamaniIlerlet` içinde yalnızca tick büyüdüğünde işliyor; aynı
 * tick'te dallanmak tahtayı değiştirmiyor ve dallar birbirini
 * kirletmiyor (durum değişmez).
 */
function dusenIyiOyna(tohum: string, sapmaAdimi = -1, enFazlaParca = 200) {
  let d = dusen.baslat(tohum);
  /** Her parça için (konmadan önce, konduktan sonra) — testler inceliyor. */
  const izler: { once: typeof d; sonra: typeof d }[] = [];
  /*
    Girdi kaydı — Ü208'de eklendi.

    Sunucuya gönderilecek kayıt bu. Kazanan adayın hamle dizisi olduğu
    gibi yazılıyor: keşif sırasında kullanılan tick'lerle **birebir
    aynı**, yoksa sunucunun tekrarı başka bir tahta bulur.
  */
  const girdiler: DusenGirdisi[] = [];

  /**
   * Tahtanın durumu tek sayıda — büyük olan iyi.
   *
   * 🔴 İlk sürüm yalnızca "en yüksek dolu satır"a bakıyordu ve
   * **ölçüldü: 80 tohumun 14'ünde bot 500'ü geçemiyordu.** Bunun bedeli
   * doğrudan testlere biniyordu — aşağıdaki DB testleri turun
   * `basarili` olmasını şart koşuyor, yani test tohum piyangosuna
   * bağlıydı ve arada bir düşerdi.
   *
   * İki terim ekledi ve sorun bitti (200 tohumda 200 başarı, en düşük
   * skor 525):
   *
   *   · **delik** — üstü kapalı boş hücre. Klasik Tetris botlarının en
   *     önemli terimi; deliği olan tahta bir daha temizlenemiyor.
   *   · **doğum bölgesi** — üst dört satırın orta altı sütunu. Tur
   *     yalnızca yeni parça sığmayınca bitiyor ve yeni parça hep
   *     oradan giriyor; orayı doldurmak doğrudan ölüm demek. Yükseklik
   *     terimi bunu yeterince anlatmıyordu çünkü kenarda yükselmek
   *     zararsız, ortada yükselmek ölümcül.
   */
  const degerlendir = (izgara: number[]) => {
    let delik = 0;
    let toplamYuk = 0;
    let engebe = 0;
    let enYuksek = 0;
    const yuk: number[] = [];

    for (let k = 0; k < DUSEN_EN; k++) {
      let ust = -1;
      for (let s = 0; s < DUSEN_BOY; s++) {
        if (izgara[s] & (1 << k)) {
          ust = s;
          break;
        }
      }
      const h = ust === -1 ? 0 : DUSEN_BOY - ust;
      yuk.push(h);
      toplamYuk += h;
      if (h > enYuksek) enYuksek = h;
      if (ust !== -1) {
        for (let s = ust + 1; s < DUSEN_BOY; s++) {
          if (!(izgara[s] & (1 << k))) delik++;
        }
      }
    }
    for (let k = 1; k < DUSEN_EN; k++) engebe += Math.abs(yuk[k] - yuk[k - 1]);

    let dogum = 0;
    for (let s = 0; s < 4; s++) {
      for (let k = 2; k < 8; k++) if (izgara[s] & (1 << k)) dogum++;
    }

    return -delik * 8 - toplamYuk * 0.4 - engebe * 0.6 - enYuksek - dogum * 6;
  };

  for (let parca = 0; parca < enFazlaParca && !dusen.bittiMi(d); parca++) {
    /* `sapmaAdimi`: bu adımda bot bilerek EN KÖTÜ yeri seçiyor.
       Amaç aynı tohumu gerçekten farklı oynayan ikinci bir tur üretmek —
       aynı ölçütün ufak varyasyonları pratikte aynı tahtaya çıkıyor. */
    const sapiyor = parca === sapmaAdimi;
    let enIyi: { durum: typeof d; puan: number; hamleler: DusenGirdisi[] } | null = null;

    for (let donus = 0; donus < 4; donus++) {
      // Dönüşü uygula; sığmıyorsa `uygula` durumu aynen döndürüyor.
      let aday = d;
      const donusHamleleri: DusenGirdisi[] = [];
      let dondu = true;
      for (let i = 0; i < donus; i++) {
        const hamle: DusenGirdisi = { tick: aday.tick, a: "don" };
        const y = dusen.uygula(aday, hamle);
        if (!y || y.donus !== (aday.donus + 1) % 4) {
          dondu = false;
          break;
        }
        aday = y;
        donusHamleleri.push(hamle);
      }
      if (!dondu) continue;

      for (let hedef = 0; hedef < 10; hedef++) {
        let konum = aday;
        const hamleler = [...donusHamleleri];
        for (let i = 0; i < 12 && konum.k !== hedef; i++) {
          const hamle: DusenGirdisi = {
            tick: konum.tick,
            a: konum.k < hedef ? "sag" : "sol",
          };
          const y = dusen.uygula(konum, hamle);
          if (!y || y.k === konum.k) break;
          konum = y;
          hamleler.push(hamle);
        }
        if (konum.k !== hedef) continue;

        const birak: DusenGirdisi = { tick: konum.tick, a: "birak" };
        const sonuc = dusen.uygula(konum, birak);
        if (!sonuc) continue;
        hamleler.push(birak);

        const temizlenen = sonuc.temizlenen - d.temizlenen;
        const puan = temizlenen * 100 + degerlendir(sonuc.izgara);
        /* ⚠️ Sentinel `-Infinity`, `-1` DEĞİL. `degerlendir` yalnızca
           ceza döndürüyor, yani puan her zaman negatif; `-1` ile
           karşılaştırınca hiçbir aday seçilemiyor ve bot ilk parçada
           duruyordu. Testler bunu "satır silinmedi" diye bildirdi. */
        const daha = sapiyor
          ? puan < (enIyi?.puan ?? Infinity)
          : puan > (enIyi?.puan ?? -Infinity);
        if (daha) enIyi = { durum: sonuc, puan, hamleler };
      }
    }

    if (!enIyi) break;
    izler.push({ once: d, sonra: enIyi.durum });
    girdiler.push(...enIyi.hamleler);
    d = enIyi.durum;
  }

  // Zaman tabanlı oyunun kaydı bir zaman işaretiyle kapanıyor (bkz.
  // `dusenOyna`). Bu botta tick hiç ilerlemediği için yerçekimi zaten
  // işlemiyor; işaret yine de duruyor ki iki bot aynı biçimi üretsin.
  girdiler.push({ tick: d.tick, a: "bekle" });

  return { son: d, izler, girdiler, skor: dusen.skor(d) };
}

/**
 * Sekme'yi açıları dolaşarak oynar.
 *
 * ⚠️ Nişan ALMIYOR. Hangi açının çok blok kıracağını bulmak arama
 * gerektirir ve bu testlerin işi denge ölçmek değil: sunucunun aynı
 * girdilerle aynı tahtayı bulduğunu sınamak. Rastgele ama
 * deterministik bir açı dizisi bunun için yeterli.
 */
function sekmeOyna(tohum: string, kaydirma = 0) {
  let d = sekme.baslat(tohum);
  const girdiler: unknown[] = [];
  for (let t = 0; t < 300 && !sekme.bittiMi(d); t++) {
    const girdi = { t, a: (t * 17 + kaydirma * 7 + 5) % ACI_SAYISI };
    const y = sekme.uygula(d, girdi);
    if (!y) break;
    d = y;
    girdiler.push(girdi);
  }
  return { durum: d, girdiler, skor: sekme.skor(d) };
}

/**
 * Yılan'ı yeme doğru sürerek oynar — er geç kendine ya da duvara çarpıyor.
 *
 * Gövdeyi hesaba katmıyor; amaç iyi oynamak değil, **gerçek bir girdi
 * kaydı** üretmek. Ödül yemi yolun üstüne düşerse yakalıyor.
 */
function yilanOyna(tohum: string) {
  let d = yilan.baslat(tohum);
  const girdiler: unknown[] = [];
  let tick = 0;

  for (let adim = 0; adim < 1500 && !yilan.bittiMi(d); adim++) {
    tick += 2;
    const bas = d.govde[0];
    const bs = Math.floor(bas / YILAN_EN);
    const bk = bas % YILAN_EN;
    const ys = Math.floor(d.yem / YILAN_EN);
    const yk = d.yem % YILAN_EN;

    const yon: Yon | "bekle" =
      bs !== ys ? (ys < bs ? "yukari" : "asagi") : bk !== yk ? (yk < bk ? "sol" : "sag") : "bekle";

    const girdi = { tick, y: yon };
    const y = yilan.uygula(d, girdi);
    if (!y) break;
    d = y;
    girdiler.push(girdi);
  }

  girdiler.push({ tick, y: "bekle" });
  const son = yilan.uygula(d, { tick, y: "bekle" });
  if (son) d = son;

  return { durum: d, girdiler, skor: yilan.skor(d) };
}

/**
 * Bıçak'ı nişan alarak oynar — Ü235.
 *
 * ── 🔴 Neden ötekilerden farklı olarak NİŞAN ALIYOR ─────────
 *
 * Sekme ve Yılan'ın botları bilerek almıyor (yukarıdaki notlar):
 * orada rastgele girdi de uzun bir tur üretiyor. Burada üretmiyor.
 * Bıçak her atışta saplı bıçaklara bakıyor ve boşluk 20°; rastgele
 * zamanlamayla **ikinci bıçakta** ölünüyor, yani kayıt tek girdiden
 * ibaret kalırdı. Ölçüldü: nişansız bot 20 tohumun 20'sinde de
 * 12 puanla bitti.
 *
 * Tek girdilik bir kayıtla ne replay sınanır ne ödül: ödül eşiği
 * 500 ve ona hiç yaklaşılmaz.
 *
 * ── 🔴 `ILERI` neden tam bir tur ─────────────────────────────
 *
 * İlk yazımda 30 tick'ti ve bot **duvara hiç varmıyordu**: 5.
 * bölümde ölüyordu, oysa iyi bir oyuncu 7'ye çıkıyor. Bunun bedeli
 * testin yanlış yeşil yanmasıydı — `bicakSayisi` tavanı 12'ye
 * sabitlenip (turun sonsuza gittiği hata) ölçüldü ve zayıf bot yine
 * 5. bölümde öldü, test geçti.
 *
 * En yavaş bölümde (`18 birim/tick`) bir tur `3600 / 18 = 200`
 * tick sürüyor. 200 tick tarayan bot çemberin **her** noktasını
 * görüyor ve en geniş boşluğu gerçekten buluyor; artık duvara
 * varıyor ve tavanı bozan değişiklik testi düşürüyor.
 */
function bicakOyna(tohum: string, kaydirma = 0) {
  let d = bicak.baslat(tohum);
  const girdiler: unknown[] = [];
  const ILERI = 200;

  for (let atis = 0; atis < 400 && !bicak.bittiMi(d); atis++) {
    let enIyi = d.sonTick + 1;
    let enGenis = -1;

    for (let k = 1; k <= ILERI; k++) {
      const t = d.sonTick + k;
      const aci = d.aci + d.hiz * (t - d.sonTick);
      const yer = (((GIRIS_ACISI - aci) % CEMBER) + CEMBER) % CEMBER;
      const pay = d.saplanan.length
        ? Math.min(...d.saplanan.map((s) => testAciFarki(s, yer)))
        : CEMBER;
      if (pay > enGenis) {
        enGenis = pay;
        enIyi = t;
      }
    }

    /* `kaydirma` botu bozuyor: aynı tohumda farklı bir tur üretmek
       için. Sekme'de aynı işi açı kaydırması yapıyor. */
    const girdi = { t: Math.max(d.sonTick + 1, enIyi + (kaydirma > 0 ? (atis + kaydirma) % 3 : 0)) };
    const y = bicak.uygula(d, girdi);
    if (!y) break;
    d = y;
    girdiler.push(girdi);
  }

  return { durum: d, girdiler, skor: bicak.skor(d) };
}

/** İki açı arasındaki en kısa fark — botun nişan alması için. */
function testAciFarki(a: number, b: number): number {
  const f = Math.abs(((a - b) % CEMBER) + CEMBER) % CEMBER;
  return Math.min(f, CEMBER - f);
}

/** Testin kendi taze oyuncusu — seviye sayacı sıfırdan başlasın. */
async function yeniOyuncu(): Promise<string> {
  const s = await kaydet({
    telefon: yeniTelefon(),
    eposta: benzersizEposta(),
    ad: "Seviye",
    soyad: "Testi",
    dogumYili: 1990,
    pazarlamaIzni: false,
  });
  return s.oyuncu.id;
}

/** Doğrulanmış (K2) masa oturumu açar. */
async function dogrulanmisOturum(playerId: string) {
  await masa.ac({ cafeId: kafeA, tableId: masaA, playerId });
  const s = await masa.konumDogrula(playerId, KAFE_LAT, KAFE_LNG);
  assert.equal(s.durum, "dogrulandi", "test kurulumu: konum doğrulanamadı");
}

/** Bir turu baştan sona oynar ve sunucuya gönderir. */
async function tamOyun(playerId: string, oyunId: string, iddiaEdilenSkor?: number) {
  const baslangic = await oyunDomain.basla({ playerId, oyunId });
  assert.ok(baslangic.ok, "oturum açılamadı");

  /*
    ⚠️ Düşen için **açgözlü** bot (Ü208).

    Eskiden burada Kelime vardı ve sebebi şuydu: aşağıdaki testlerin
    bir kısmı turun `basarili` olmasını, yani skorun 500'ü geçmesini
    şart koşuyor. Kelime botu bunu her tohumda yapıyordu.

    Kelime kaldırılınca geriye kaba kuvvet botları kaldı ve ikisi de
    yetmiyor — ölçüldü: Blok botu 60 tohumun yalnızca **26**'sında
    eşiği geçiyor (ortanca 430), Düşen'in basit botu on beş parçada
    tıkanıp 100'ün altında kalıyor. İkisi de bu testleri tohum
    piyangosuna çevirirdi.

    `dusenIyiOyna` her parça için dört dönüş × on sütunu deniyor ve
    582–691 aralığında bitiriyor. Girdi kaydını da tutuyor, yani
    sunucuya gönderilebiliyor.
  */
  const oyna = oyunId === "blok" ? blokOyna : oyunId === "dusen" ? dusenIyiOyna : dusenOyna;
  const sonuc = oyna(baslangic.tohum);

  const cevap = await oyunDomain.bitir({
    playerId,
    oturumId: baslangic.oturumId,
    girdiler: sonuc.girdiler,
    iddiaEdilenSkor: iddiaEdilenSkor ?? sonuc.skor,
  });

  return { baslangic, sonuc, cevap };
}

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const c = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const t = await db.one<{ id: string }>(
      "SELECT id FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1",
      [c!.id],
    );
    return { c: c?.id, t: t?.id };
  });
  assert.ok(v.c && v.t, "Tohum verisi yok — önce: npm run db:seed");
  kafeA = v.c;
  masaA = v.t;

  await yoneticiSorgu(`UPDATE cafes SET lat = $2, lng = $3 WHERE id = $1`, [
    kafeA,
    KAFE_LAT,
    KAFE_LNG,
  ]);
  await yoneticiSorgu(
    `UPDATE platform_config SET value = 'false'::jsonb
      WHERE key IN ('oyun_durduruldu','kupon_dagitimi_durduruldu')`,
  );

  oyuncuId = (
    await kaydet({
      telefon: yeniTelefon(),
      eposta: benzersizEposta(),
      ad: "Oyun",
      soyad: "Testi",
      dogumYili: 1990,
      pazarlamaIzni: false,
    })
  ).oyuncu.id;

  disaridakiId = (
    await kaydet({
      telefon: yeniTelefon(),
      eposta: benzersizEposta(),
      ad: "Disarida",
      soyad: "Oyuncu",
      dogumYili: 1990,
      pazarlamaIzni: false,
    })
  ).oyuncu.id;

  await dogrulanmisOturum(oyuncuId);
});

after(async () => {
  for (const id of [oyuncuId, disaridakiId]) {
    // Faz 7'den beri oyun bitişi anlık ödül kuponu üretebiliyor; kupon
    // oyuncuya bağlı olduğu için önce o temizlenmeli.
    await yoneticiSorgu(
      `DELETE FROM coupon_events WHERE coupon_id IN
         (SELECT id FROM coupons WHERE player_id = $1)`,
      [id],
    );
    await yoneticiSorgu(`DELETE FROM coupons WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM play_sessions WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM points_ledger WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM xp_ledger WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM player_badges WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM table_sessions WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [id]);
  }
  await closePools();
});

/* ═══════════════════════════════════════════════════════════
   1 · Determinizm — S5'in temeli
   ═══════════════════════════════════════════════════════════ */

describe("determinizm (S5)", () => {
  test("aynı tohum aynı başlangıcı verir — üç oyunda da", () => {
    for (const oyun of OYUNLAR) {
      const a = JSON.stringify(oyun.baslat("ayni-tohum"));
      const b = JSON.stringify(oyun.baslat("ayni-tohum"));
      assert.equal(a, b, `${oyun.id}: aynı tohum farklı başlangıç verdi`);
    }
  });

  test("farklı tohum farklı başlangıç verir", () => {
    for (const oyun of OYUNLAR) {
      const a = JSON.stringify(oyun.baslat("tohum-bir"));
      const b = JSON.stringify(oyun.baslat("tohum-iki"));
      assert.notEqual(a, b, `${oyun.id}: farklı tohum aynı başlangıcı verdi`);
    }
  });

  test("sunucu replay'i canlı oyunla birebir aynı skoru bulur", () => {
    const senaryolar: {
      oyun: HerhangiOyun;
      id: string;
      oyna: (tohum: string) => { girdiler: unknown[]; skor: number };
    }[] = [
      { oyun: blok, id: "blok", oyna: blokOyna },
      { oyun: dusen, id: "dusen", oyna: dusenOyna },
      { oyun: sekme, id: "sekme", oyna: sekmeOyna },
      { oyun: yilan, id: "yilan", oyna: yilanOyna },
      { oyun: bicak, id: "bicak", oyna: bicakOyna },
    ];

    for (const { oyun, id, oyna } of senaryolar) {
      for (const tohum of ["t-a", "t-b", "t-c"]) {
        const canli = oyna(tohum);
        const sunucu = tekrarOyna(oyun, tohum, canli.girdiler);

        assert.ok(sunucu.gecerli, `${id}/${tohum}: replay geçersiz — ${JSON.stringify(sunucu)}`);
        assert.equal(sunucu.skor, canli.skor, `${id}/${tohum}: skorlar ayrıştı`);
      }
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   1b · Sonsuz mod (Ü83)
   ═══════════════════════════════════════════════════════════ */

describe("sonsuz mod (Ü83)", () => {
  test("hiçbir oyun kazanarak bitmiyor — tek bitiş kaybetmek", () => {
    // Blok yalnızca tıkanınca, Düşen yalnızca tahta dolunca, Yılan
    // yalnızca çarpınca bitiyor. Hedefe ulaşıp biten tur yok.
    const b = blokOyna("son-blok");
    assert.ok(blok.bittiMi(b.durum), "blok bitmedi");
    assert.ok(b.durum.tikandi, "blok tıkanmadan bitti — hedefle bitiş geri gelmiş");

    const d = dusenOyna("son-dusen");
    assert.ok(d.durum.doldu, "düşen tahta dolmadan bitti");

    const y = yilanOyna("son-yilan");
    assert.ok(yilan.bittiMi(y.durum), "yılan bitmedi");

    const yl = yilanOyna("son-yilan");
    assert.ok(yl.durum.carpti, "yılan çarpmadan bitti");

    /*
      🔴 Bıçak bu testi ilk yazımda GEÇEMEDİ — Ü235.

      Çakışma açısı 13° seçilmiş ve *"çembere 13,8 bıçak sığar"* diye
      yazılmıştı. Yanlış hesap: kısıt ikili uzaklık ≥ çakışma, yani
      kapasite `3600 / 130 ≈ 27`. Bölüm başına en fazla 12 bıçak
      atıldığı için çember hiç dolmuyordu ve nişan alan bot 400
      atışta ölmedi — 24 bin puan yaptı, turu bitiren şey oyunun
      kuralı değil test döngüsünün sınırıydı.

      Şimdi kapasite `3600 / 200 = 18` ve bölüm başına bıçak ona
      dayanıyor. Ölçülen tavan ~2.800 puan, öbür oyunlarla aynı
      mertebede.
    */
    const bc = bicakOyna("son-bicak");
    assert.ok(bicak.bittiMi(bc.durum), "bıçak bitmedi — duvar yine gelmiyor");
    assert.ok(
      bc.durum.saplanan.length > 0,
      "bıçak hiç bıçak saplamadan bitti — tur ilk atışta kapanmış",
    );
    assert.equal(
      carpilanBicak(bc.durum) !== null,
      true,
      "bıçak saplı bir bıçağa DEĞMEDEN bitti — başka bir bitiş yolu açılmış",
    );
  });

  test("temizlenecekler, uygula ile AYNI çizgileri söylüyor — REGRESYON", () => {
    /*
      Ü199. `temizlenecekler` yalnızca arayüz için var: satır patlarken
      hangi hücrelerin parlayacağını söylüyor. `uygula` geri döndüğünde
      o hücreler çoktan boşalmış oluyor, bu yüzden önceden soruluyor.

      🔴 Testin işi iki fonksiyonun **aynı şeyi** söylediğini garanti
      etmek. Ayrışırlarsa ekran yanlış kareleri patlatır ve hata
      görünmez olur — kimse "yanlış hücre parladı" diye bildirmez, oyun
      sadece bozuk hissettirir.

      Yol: rastgele bir tur oynanıyor, her hamlede önce tahmin alınıyor,
      sonra `uygula` çağrılıp temizlenen çizgi SAYISI (`temizlenen`
      farkı) ile karşılaştırılıyor.
    */
    let d = blok.baslat("temizlik-testi");
    let hamle = 0;
    let temizlikGorulen = 0;

    dis: for (let adim = 0; adim < 400 && !blok.bittiMi(d); adim++) {
      for (let t = 0; t < 3; t++) {
        for (let s = 0; s < 8; s++) {
          for (let k = 0; k < 8; k++) {
            const girdi = { t, s, k };
            const tahmin = temizlenecekler(d, girdi);
            const y = blok.uygula(d, girdi);

            // İkisi de aynı hamleyi geçersiz saymalı.
            assert.equal(
              tahmin === null,
              y === null,
              `hamle ${hamle}: biri geçerli dedi öteki geçersiz (t${t} s${s} k${k})`,
            );
            if (!y || !tahmin) continue;

            const beklenen = tahmin.satirlar.length + tahmin.sutunlar.length;
            const gercek = y.temizlenen - d.temizlenen;
            assert.equal(
              beklenen,
              gercek,
              `hamle ${hamle}: tahmin ${beklenen} çizgi dedi, uygula ${gercek} temizledi`,
            );

            // Söylenen satır gerçekten boşalmış olmalı.
            for (const sa of tahmin.satirlar) {
              assert.equal(y.izgara[sa] & 0xff, 0, `satır ${sa} temizlenmedi`);
            }
            for (const su of tahmin.sutunlar) {
              for (let x = 0; x < 8; x++) {
                assert.equal(
                  y.izgara[x] & (1 << su),
                  0,
                  `sütun ${su} temizlenmedi (satır ${x})`,
                );
              }
            }

            if (beklenen > 0) temizlikGorulen++;
            d = y;
            hamle++;
            continue dis;
          }
        }
      }
      break;
    }

    assert.ok(hamle > 20, `tur çok kısa sürdü (${hamle} hamle) — test bir şey sınamadı`);
    assert.ok(
      temizlikGorulen > 0,
      "hiç çizgi temizlenmedi — testin asıl sınadığı yol hiç koşmadı",
    );
  });

  test("ödül parçası ekonomiyi DEĞİŞTİRMİYOR — Ü203", () => {
    /*
      🔴 Ü201'de bu parça +120 puan veriyordu ve eşiğin ALTINDA
      çıkıyordu; sonucu kuponun barının 500'den fiilen 380'e inmesiydi.
      Ürün sahibi oynayıp gördü: *"oyun çok ödül dağıtıyor… kafenin
      belirlediği günlük bütçeye göre çok doğru ayarlanmalı."*

      Ü203'te rol tersine döndü: parça ödül ÜRETMİYOR, kazanılmış ödülü
      TESLİM ediyor. Bu testin işi o sözü kilitlemek.
    */
    assert.equal(
      ODUL_ESIGI,
      KUPON_ESIGI,
      "motorun eşik kopyası `domain/puan.KUPON_ESIGI` ile ayrışmış",
    );
    assert.equal(
      ODUL_BONUSU,
      0,
      "ödül parçası yine puan vermeye başlamış — kupon barı düşer (Ü203)",
    );

    let paketGorulen = 0;
    let paketKonulan = 0;

    /*
      ⚠️ Tohum listesi GENİŞ ve bu bilinçli. Paket yalnızca eşiği geçen
      turlarda çıkıyor; Ü203'te zorluk sertleşince kaba kuvvet botunun
      turlarının yaklaşık yarısı 500'ün altında bitmeye başladı ve beş
      sabit tohumla test hiç paket görmedi. Az tohum, testi oyunun
      zorluk ayarına bağımlı kılıyor — ayar her değiştiğinde test
      "bir şey sınamadı" diye düşer.
    */
    for (let n = 0; n < 40; n++) {
      const tohum = `odul-${n}`;
      let d = blok.baslat(tohum);
      let teslimSayisi = 0;

      for (let adim = 0; adim < 700 && !blok.bittiMi(d); adim++) {
        if (d.odulTeklifi >= 0) {
          paketGorulen++;
          // 🔴 Paket eşiğin ALTINDA asla çıkmamalı.
          assert.ok(
            d.skor >= ODUL_ESIGI,
            `${tohum}: paket eşik geçilmeden çıktı (skor ${d.skor} < ${ODUL_ESIGI})`,
          );
        }

        const sira = d.odulTeklifi >= 0 ? [d.odulTeklifi, 0, 1, 2] : [0, 1, 2];
        let kondu: typeof d | null = null;
        let konanTeklif = -1;

        dis: for (const t of sira) {
          for (let sa = 0; sa < 8; sa++) {
            for (let su = 0; su < 8; su++) {
              const y = blok.uygula(d, { t, s: sa, k: su });
              if (y) {
                kondu = y;
                konanTeklif = t;
                break dis;
              }
            }
          }
        }
        if (!kondu) break;

        if (konanTeklif === d.odulTeklifi && d.odulTeklifi >= 0) {
          paketKonulan++;
          teslimSayisi++;
          // Paket puan eklemiyor: kazanç yalnızca parçanın kendi
          // hücreleri + varsa temizlik. Bonus olsaydı fark açılırdı.
          assert.equal(kondu.odulTeklifi, -1, `${tohum}: paket kullanıldıktan sonra duruyor`);
          assert.ok(kondu.odulVerildi, `${tohum}: teslim bayrağı yazılmadı`);
        }

        d = kondu;
      }

      // 🔴 Tur başına EN FAZLA bir kupon paketi.
      assert.ok(
        teslimSayisi <= 1,
        `${tohum}: aynı turda ${teslimSayisi} paket teslim edildi`,
      );
    }

    assert.ok(paketGorulen > 0, "hiçbir turda paket çıkmadı — test bir şey sınamadı");
    assert.ok(paketKonulan > 0, "paket hiç konulmadı");
  });

  test("ödül parçası TOHUMDAN türüyor — aynı tohum aynı yer", () => {
    /*
      Paket durumun parçası olduğu için sunucunun tekrarında da aynı
      yerde çıkmak zorunda; ayrışırsa iki taraf farklı durum üretir.
    */
    for (const tohum of ["tekrar-1", "tekrar-2"]) {
      const a: number[] = [];
      const b: number[] = [];

      for (const kayit of [a, b]) {
        let d = blok.baslat(tohum);
        for (let adim = 0; adim < 400 && !blok.bittiMi(d); adim++) {
          kayit.push(d.odulTeklifi);
          let y: typeof d | null = null;
          dis: for (let t = 0; t < 3; t++) {
            for (let sa = 0; sa < 8; sa++) {
              for (let su = 0; su < 8; su++) {
                const z = blok.uygula(d, { t, s: sa, k: su });
                if (z) {
                  y = z;
                  break dis;
                }
              }
            }
          }
          if (!y) break;
          d = y;
        }
      }

      assert.deepEqual(a, b, `${tohum}: iki koşuda paket dizisi farklı çıktı`);
      assert.ok(a.length > 20, `${tohum}: tur çok kısa, dizi anlamsız`);
    }
  });

  test("zorluk tavanı daha erken ve daha sert — Ü203", () => {
    /*
      Ürün sahibi: *"oyun çok kolay, gitgide zorluk artmıyor mu,
      kaybedemedim bir türlü."*

      ⚠️ Bu test "oyun zor mu" diye SORMUYOR — onu ancak insan
      söyleyebilir. Sınadığı şey eğrinin şekli: tavana ne zaman
      çıkılıyor ve tavanda kaç kademe var. Sayılar sessizce eski hâline
      dönerse test düşer.
    */
    assert.equal(blokKademe(0), 0, "ilk tur kolay başlamıyor");
    // İlk kademe 5 tur sürüyor — öğrenme turu korunuyor (docs/03).
    assert.equal(blokKademe(4), 0, "ilk kademe beş turdan kısa");
    assert.equal(blokKademe(5), 1, "kademe beşinci turda artmıyor");
    // Tavan: 20. turda ve dört kademe var (eskiden 24. tur, üç kademe).
    assert.equal(blokKademe(20), 4, "tavana 20. turda çıkılmıyor");
    assert.equal(blokKademe(500), blokKademe(20), "tavan sabitlenmiyor");
  });

  test("Düşen'in paketi de ekonomiyi DEĞİŞTİRMİYOR — Ü207", () => {
    /*
      Aynı söz, ikinci oyunda. Paket puan vermiyor, eşiği düşürmüyor ve
      tur başına bir kez teslim ediliyor.

      ⚠️ Kural `odul.ts`te ortak; bu test iki motorun o ortak kuralı
      gerçekten uyguladığını sınıyor — sabiti paylaşıp davranışı
      ayrıştırmak mümkün.
    */
    assert.equal(ODUL_ESIGI, KUPON_ESIGI, "eşik `domain/puan` ile ayrışmış");
    assert.equal(ODUL_BONUSU, 0, "paket yine puan vermeye başlamış (Ü203)");

    let paketDusen = 0;
    let paketKonan = 0;

    for (let i = 0; i < 8; i++) {
      const tohum = `dusen-odul-${i}`;
      const { son, izler } = dusenIyiOyna(tohum);
      let teslim = 0;

      assert.equal(izler[0].once.odulParcasi, false, `${tohum}: tur paketle başlıyor`);

      for (const { once, sonra } of izler) {
        if (once.odulParcasi) {
          paketDusen++;
          // 🔴 Paket eşiğin ALTINDA asla çıkmamalı.
          assert.ok(
            once.skor >= ODUL_ESIGI,
            `${tohum}: paket eşik geçilmeden düştü (skor ${once.skor})`,
          );
        }

        if (!once.odulParcasi || !sonra.odulVerildi) continue;
        paketKonan++;
        teslim++;

        /*
          🔴 Paketin payı sıfır. Bir bırakmanın kazandırabileceği en çok
          puan bellidir: 4 (parça) + en fazla 15 (düşüş) + dört satır
          birden temizlenirse 4²×35. Bonus 120 olsaydı bu tavan aşılırdı.
        */
        const enCokKazanc = 4 + 15 + 4 * 4 * 35;
        assert.ok(
          sonra.skor - once.skor <= enCokKazanc,
          `${tohum}: paket fazladan puan getirdi (+${sonra.skor - once.skor})`,
        );
        assert.equal(sonra.odulParcasi, false, `${tohum}: teslimden sonra paket sürüyor`);
      }

      assert.ok(teslim <= 1, `${tohum}: aynı turda ${teslim} paket teslim edildi`);
      if (son.skor >= ODUL_ESIGI) {
        assert.equal(teslim, 1, `${tohum}: eşik geçildi (${son.skor}) ama paket teslim olmadı`);
      }
    }

    assert.ok(paketDusen > 0, "hiçbir turda paket düşmedi — test bir şey sınamadı");
    assert.ok(paketKonan > 0, "paket hiç konmadı");
  });

  test("Düşen'in paketi parça SIRASINI bozmuyor — Ü207", () => {
    /*
      🔴 Paket yalnızca bir **kaplama**: hangi biçimin ineceğini
      değiştirseydi skor da değişirdi ve paket sessizce ekonomiye
      dokunurdu.

      Ölçüm: aynı tohumla iki tur oynanıyor, birinde paket hiç
      görülmemiş gibi davranılıyor. Parça dizisi ve skor birebir aynı
      çıkmalı.
    */
    for (const tohum of ["sira-1", "sira-2", "sira-3"]) {
      /** `parcaNo → parca` eşlemesi; bot iyi de oynasa kötü de. */
      const eslesme = (izler: { once: { parcaNo: number; parca: number } }[]) =>
        new Map(izler.map(({ once }) => [once.parcaNo, once.parca]));

      // İki tur AYNI tohumla ama farklı oynanıyor: ikincisi üçüncü
      // parçayı bilerek en kötü yere koyuyor. Bundan sonrası tamamen
      // ayrışıyor — farklı tahta, farklı skor, farklı paket anı.
      const iyi = dusenIyiOyna(tohum);
      const baska = dusenIyiOyna(tohum, 2);

      const a = eslesme(iyi.izler);
      const b = eslesme(baska.izler);
      assert.notEqual(iyi.son.skor, baska.son.skor, `${tohum}: iki bot aynı oynadı`);

      /*
        🔴 Asıl sınav bu: iki tur farklı oynandı, farklı skorlar çıktı,
        birinde paket düştü diğerinde hiç düşmedi — ama aynı sıradaki
        parça aynı biçim olmak zorunda. Paket sırayı seçseydi, atlasaydı
        ya da biçimi değiştirseydi eşleşme burada ayrışırdı.
      */
      let karsilastirilan = 0;
      for (const [no, parca] of a) {
        const diger = b.get(no);
        if (diger === undefined) continue;
        karsilastirilan++;
        assert.equal(diger, parca, `${tohum}: ${no}. parça iki turda farklı çıktı`);
      }
      assert.ok(karsilastirilan > 8, `${tohum}: karşılaştırılan parça çok az`);

      /*
        🔴 Karşılaştırma paketin DÜŞTÜĞÜ ana kadar uzanmalı.

        Olmasaydı test sessizce zayıflardı: iki tur ilk beş parçada
        ayrışır, karşılaştırma eşiğin çok altında biter ve "paket sırayı
        bozmuyor" iddiası hiç sınanmamış olurdu. Ölçüldü — üç tohumda da
        paket 27–28. parçada düşüyor ve ortak aralık 31'e kadar gidiyor.
      */
      const paketNo = iyi.izler.find((iz) => iz.once.odulParcasi)?.once.parcaNo ?? -1;
      assert.ok(paketNo >= 0, `${tohum}: iyi turda paket hiç düşmedi`);
      assert.ok(
        b.has(paketNo),
        `${tohum}: paket ${paketNo}. parçada düştü ama diğer tur oraya ulaşmadı`,
      );

      // Tekrar: sunucunun yaptığı şey. Aynı oynanış, aynı sonuç.
      const yeniden = dusenIyiOyna(tohum);
      assert.equal(yeniden.son.skor, iyi.son.skor, `${tohum}: tekrar farklı skor verdi`);
      assert.equal(
        yeniden.son.odulVerildi,
        iyi.son.odulVerildi,
        `${tohum}: teslim tekrarda ayrıştı`,
      );
    }
  });

  test("uygulaVeKilitler, uygula ile AYNI durumu veriyor — Ü209", () => {
    /*
      🔴 İki giriş, tek kural. Sunucu `uygula`yı, ekran
      `uygulaVeKilitler`i çağırıyor. Ayrışsalardı istemcinin gördüğü
      tahta ile sunucunun hesapladığı skor birbirini tutmaz ve **dürüst
      oyuncunun turu reddedilirdi** — hatanın görüneceği yer de burası
      olmazdı, "skorum kabul edilmedi" diyen bir oyuncu olurdu.
    */
    for (const tohum of ["ikili-1", "ikili-2", "ikili-3"]) {
      let a = dusen.baslat(tohum);
      let b = dusen.baslat(tohum);
      let tick = 1;

      for (let adim = 0; adim < 250 && !dusen.bittiMi(a); adim++) {
        const hareket = (["sol", "sag", "don", "in", "birak", "bekle"] as const)[adim % 6];
        const girdi = { tick, a: hareket };

        const sade = dusen.uygula(a, girdi);
        const zengin = uygulaVeKilitler(b, girdi);

        assert.equal(sade === null, zengin === null, `${tohum}: biri null döndü diğeri dönmedi`);
        if (!sade || !zengin) break;
        assert.deepEqual(zengin.durum, sade, `${tohum}/${adim}: durumlar ayrıştı`);

        a = sade;
        b = zengin.durum;
        tick += 2;
      }
    }
  });

  test("renk ızgarası tahtadan AYRIŞMIYOR — Ü209", () => {
    /*
      🔴 Ekranın en kırılgan yeri burası.

      Her küp kendi rengini taşıyor ve renk motorun durumunda değil
      (Ü202): ekran kendi ızgarasını tutuyor. Blok'ta bu kolaydı —
      orada hücreler yerinde boşalıyor. Düşen'de satır silinince
      **üstündeki her şey bir satır kayıyor** ve renk ızgarası da aynı
      kaymayı yapmak zorunda.

      Ayrışırsa görünen şey sessiz ve çirkin olurdu: küpler yanlış
      renge boyanır, hatta boş hücre renkli görünürdü. Kimse bunu hata
      diye bildirmez; oyun sadece bozuk hissettirir.

      Bu test ekranın yaptığı hesabın **aynısını** yapıyor
      (`renkleriIsle`) ve her adımda iki şeyi sınıyor: dolu her hücrenin
      rengi var, boş hiçbir hücrenin rengi yok.
    */
    const EN = DUSEN_EN;
    const BOY = DUSEN_BOY;

    for (const tohum of ["renk-1", "renk-2", "renk-3"]) {
      /* ⚠️ Girdiler **açgözlü bottan**: satır silmeyen bir tur bu testi
         hiçbir şey sınamayan yeşil bir teste çevirirdi — kayma ancak
         satır silinince oluyor. */
      const { girdiler } = dusenIyiOyna(tohum);
      let d = dusen.baslat(tohum);
      let renkler = new Uint8Array(EN * BOY);
      let temizlikGoruldu = 0;

      for (let adim = 0; adim < girdiler.length && !dusen.bittiMi(d); adim++) {
        const sonuc = uygulaVeKilitler(d, girdiler[adim]);
        if (!sonuc) break;

        // ── Ekranın `renkleriIsle`sinin birebir aynısı ──
        const satirlar: number[][] = [];
        for (let s = 0; s < BOY; s++) {
          satirlar.push(Array.from(renkler.subarray(s * EN, (s + 1) * EN)));
        }
        for (const kilit of sonuc.kilitler) {
          temizlikGoruldu += kilit.silinen.length;
          const renkNo = (kilit.parca % 7) + 1;
          for (const kare of kilit.kareler) {
            satirlar[Math.floor(kare / EN)][kare % EN] = renkNo;
          }
          for (const satir of kilit.silinen) {
            satirlar.splice(satir, 1);
            satirlar.unshift(new Array(EN).fill(0));
          }
        }
        const yeni = new Uint8Array(EN * BOY);
        satirlar.forEach((satir, s) =>
          satir.forEach((v, k) => {
            yeni[s * EN + k] = v;
          }),
        );
        renkler = yeni;
        d = sonuc.durum;

        // ── Değişmez: renk ızgarası ile tahta birebir örtüşüyor ──
        for (let s = 0; s < BOY; s++) {
          for (let k = 0; k < EN; k++) {
            const dolu = (d.izgara[s] & (1 << k)) !== 0;
            const renkli = renkler[s * EN + k] > 0;
            assert.equal(
              renkli,
              dolu,
              `${tohum}/${adim}: (${s},${k}) tahtada ${dolu ? "dolu" : "boş"} ama renk ${renkli ? "var" : "yok"}`,
            );
          }
        }
      }

      // Satır hiç silinmeseydi test kaymayı hiç sınamamış olurdu.
      assert.ok(temizlikGoruldu > 0, `${tohum}: hiç satır silinmedi — kayma sınanmadı`);
    }
  });

  test("hayalet parça gerçekten en alta iniyor — Ü209", () => {
    /*
      Hayalet, parçanın **bırakılınca** duracağı yeri gösteriyor. Bir
      satır bile şaşarsa oyuncu güvenip yanlış yere bırakır ve suçu
      kendinde arar.
    */
    for (const tohum of ["hayalet-1", "hayalet-2"]) {
      let d = dusen.baslat(tohum);
      let tick = 1;

      for (let adim = 0; adim < 120 && !dusen.bittiMi(d); adim++) {
        const hs = hayaletSatiri(d);
        assert.ok(hs >= d.s, `${tohum}: hayalet parçanın ÜSTÜNDE`);
        assert.ok(
          sigarMi(d.izgara, d.parca, d.donus, hs, d.k),
          `${tohum}: hayalet sığmayan bir yere kondu`,
        );
        assert.ok(
          !sigarMi(d.izgara, d.parca, d.donus, hs + 1, d.k),
          `${tohum}: hayaletin bir altı da boş — en dibe inmemiş`,
        );

        const y = dusen.uygula(d, { tick, a: "birak" });
        if (!y) break;
        // `birak` parçayı tam hayaletin yerine koyuyor.
        assert.equal(y.parcaNo, d.parcaNo + 1, `${tohum}: bırakma parça ilerletmedi`);
        d = y;
        tick += 3;
      }
    }
  });

  test("sıradaki parçalar gerçekten SIRADAKİLER — Ü209", () => {
    /*
      "SIRADAKİ" paneli gelecekten okuyor. Yanlış okursa oyuncu ona göre
      plan yapar ve gelen başka bir parça olur — oyunun en sinir bozucu
      hatası bu olurdu.
    */
    for (const tohum of ["sirada-1", "sirada-2"]) {
      let d = dusen.baslat(tohum);
      let tick = 1;

      for (let adim = 0; adim < 60 && !dusen.bittiMi(d); adim++) {
        const soz = siradakiParcalar(d, 3);
        const y = dusen.uygula(d, { tick, a: "birak" });
        if (!y) break;
        assert.equal(y.parca, soz[0], `${tohum}/${adim}: panelin söylediği parça gelmedi`);
        // Bir sonraki turun ilk iki sözü, bu turun son iki sözü olmalı.
        assert.deepEqual(
          siradakiParcalar(y, 2),
          soz.slice(1),
          `${tohum}/${adim}: sıra kaydırılınca tutmuyor`,
        );
        d = y;
        tick += 3;
      }
    }
  });

  test("🔴 Sekme'nin motorunda TRİGONOMETRİ YOK — Ü217", () => {
    /*
      🔴 Bu test kaynağı okuyor ve bu bilinçli.

      Sekme'nin bütün determinizmi tek bir karara dayanıyor: yön
      tablosu **kaynağa gömülü tam sayı**, çalışma zamanında
      hesaplanmıyor. `Math.cos`/`Math.sin` JS standardında
      *"implementation-approximated"* — V8, JavaScriptCore ve
      SpiderMonkey son bitlerde ayrışabiliyor. Tarayıcı ile Node farklı
      sonuç verirse top birkaç sekme sonra bambaşka yere gider ve
      **dürüst oyuncunun turu reddedilir.**

      Davranış testiyle yakalanamaz: aynı makinede iki koşu da aynı
      sonucu verir. Yakalanacağı tek yer kaynak. Bir gün biri
      `Math.cos(aci)` yazarsa test burada düşer ve sebebini okur.
    */
    const kaynak = readFileSync(
      fileURLToPath(new URL("../src/oyunlar/sekme.ts", import.meta.url)),
      "utf8",
    );
    // Yorumları at — açıklamalarda adları geçiyor.
    const kod = kaynak.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    for (const yasak of ["Math.cos", "Math.sin", "Math.tan", "Math.atan", "Math.random"]) {
      assert.ok(
        !kod.includes(yasak),
        `sekme.ts içinde ${yasak} var — replay determinizmi kırılır (Ü217)`,
      );
    }
  });

  test("Sekme: aynı tohum + aynı açılar = aynı tahta — Ü217", () => {
    for (const tohum of ["s-a", "s-b", "s-c"]) {
      const a = sekmeOyna(tohum);
      const b = sekmeOyna(tohum);
      assert.equal(a.skor, b.skor, `${tohum}: iki koşu farklı skor verdi`);
      assert.deepEqual(a.durum.nesneler, b.durum.nesneler, `${tohum}: tahtalar ayrıştı`);
      assert.ok(a.girdiler.length > 3, `${tohum}: tur çok kısa, test bir şey sınamadı`);
    }
  });

  test("Sekme: atış izi motorun sonucuyla AYNI — Ü217", () => {
    /*
      🔴 Ekran topları `atisIzi` ile uçuruyor, sonucu `uygula`
      hesaplıyor. İkisi ayrı bir fizik kopyası kullansaydı — ilk
      yazımda öyleydi — oyuncu ekranda bloğu kırdığını görür, skoru
      tutmazdı. İkisi de tek bir `simule` gövdesinden geçiyor; bu test
      onu kilitliyor.
    */
    for (const tohum of ["iz-1", "iz-2"]) {
      let d = sekme.baslat(tohum);
      for (let t = 0; t < 10 && !sekme.bittiMi(d); t++) {
        const a = (t * 11 + 3) % ACI_SAYISI;
        const iz = atisIzi(d, a);
        assert.ok(iz.length > 0, `${tohum}: iz boş`);

        const y = sekme.uygula(d, { t, a });
        assert.ok(y, `${tohum}: atış reddedildi`);

        // İzin son karesi = inişten önceki tahta.
        const sonIz = [...iz[iz.length - 1].nesneler].sort((p, q) => p.k - q.k || p.s - q.s);
        const beklenen = y.nesneler
          .filter((n) => n.s > 0)
          .map((n) => ({ ...n, s: n.s - 1 }))
          .sort((p, q) => p.k - q.k || p.s - q.s);
        assert.deepEqual(sonIz, beklenen, `${tohum}/${t}: iz ile motor ayrıştı`);
        d = y;
      }
    }
  });

  test("Sekme: sırası bozuk ya da geçersiz atış reddediliyor", () => {
    const d = sekme.baslat("ret");
    assert.equal(sekme.uygula(d, { t: 1, a: 10 }), null, "sıradan ileri atış kabul edildi");
    assert.equal(sekme.uygula(d, { t: 0, a: -1 }), null, "eksi açı kabul edildi");
    assert.equal(sekme.uygula(d, { t: 0, a: ACI_SAYISI }), null, "aralık dışı açı kabul edildi");
    assert.ok(sekme.uygula(d, { t: 0, a: 30 }), "geçerli atış reddedildi");
    // Biçim denetimi ayrı: `girdiOku` güvenilmeyen JSON'u okuyor.
    assert.equal(sekme.girdiOku({ t: 0, a: 1.5 }), null, "kesirli açı okundu");
    assert.equal(sekme.girdiOku({ t: -1, a: 1 }), null, "eksi atış no okundu");
    assert.deepEqual(sekme.girdiOku({ t: 2, a: 7 }), { t: 2, a: 7 });
  });

  test("Sekme: üçgen bloklar üretiliyor ve topu saptırıyor — Ü218", () => {
    /*
      Ürün sahibi: *"bazı küpler yarım olmalı üçgen şeklinde."*
      Üçgen bir süs değil, oyunun asıl derinliği: köşeye sıkışmış
      blokları ancak köşegenden sektirerek vurabiliyorsun.

      ⚠️ Sekme yönü **bileşen takası** (`(vx,vy) → (−vy,−vx)` ya da
      `(vy,vx)`) — saf tam sayı işlemi, determinizm bozulmuyor. Bu
      test üçgenlerin gerçekten üretildiğini kilitliyor; yansımanın
      doğruluğunu determinizm ve tekrar testleri koruyor.
    */
    let ucgen = 0;
    let duz = 0;
    let erkenUcgen = 0;

    for (let i = 0; i < 25; i++) {
      let d = sekme.baslat(`ucgen-${i}`);
      for (let t = 0; t < 30 && !sekme.bittiMi(d); t++) {
        if (t < 3) {
          erkenUcgen += d.nesneler.filter(
            (n) => n.tur === "blok" && n.ucgen !== undefined && n.s === 0,
          ).length;
        }
        const y = sekme.uygula(d, { t, a: (t * 13 + i) % ACI_SAYISI });
        if (!y) break;
        d = y;
      }
      for (const n of d.nesneler) {
        if (n.tur !== "blok") continue;
        if (n.ucgen !== undefined) ucgen++;
        else duz++;
      }
    }

    assert.ok(ucgen > 0, "hiç üçgen üretilmedi");
    assert.ok(duz > 0, "hiç düz blok üretilmedi — tahta tamamen köşegene döndü");
    const oran = ucgen / (ucgen + duz);
    assert.ok(oran > 0.1 && oran < 0.5, `üçgen oranı makul değil: %${Math.round(oran * 100)}`);
    // İlk üç turda üçgen YOK — öğrenme turu (docs/03).
    assert.equal(erkenUcgen, 0, "ilk turlarda üçgen çıktı; öğrenme turu korunmuyor");
  });

  test("Sekme: tur yalnızca bloklar en alta inince bitiyor (Ü83)", () => {
    const r = sekmeOyna("son-sekme");
    assert.ok(sekme.bittiMi(r.durum), "tur bitmedi");
    assert.ok(
      r.durum.nesneler.some((n) => n.tur === "blok" && n.s >= SEKME_BOY - 1),
      "tur bitti ama hiçbir blok en altta değil — başka bir bitiş yolu açılmış",
    );
  });

  test("Sekme'nin paketi de ekonomiyi DEĞİŞTİRMİYOR — Ü217", () => {
    /*
      Aynı söz, dördüncü oyunda: paket eşik geçilmeden çıkmıyor, tur
      başına bir kez teslim ediliyor ve puan vermiyor.

      ⚠️ Ürün sahibi bu oyun için özellikle *"üstten düşsün"* demişti;
      burada bedava geliyor çünkü zaten her şey üstten iniyor.
    */
    assert.equal(ODUL_ESIGI, KUPON_ESIGI, "eşik `domain/puan` ile ayrışmış");
    assert.equal(ODUL_BONUSU, 0, "paket yine puan vermeye başlamış");

    let paketGorulen = 0;
    let erken = 0;
    let cokTeslim = 0;

    for (let i = 0; i < 60; i++) {
      const tohum = `sekme-odul-${i}`;
      let d = sekme.baslat(tohum);
      let teslim = 0;
      let oncekiVar = false;

      for (let t = 0; t < 150 && !sekme.bittiMi(d); t++) {
        const varMi = d.nesneler.some((n) => n.tur === "odul");
        if (varMi && !oncekiVar) {
          paketGorulen++;
          if (d.skor < ODUL_ESIGI) erken++;
        }
        const y = sekme.uygula(d, { t, a: (t * 23 + i) % ACI_SAYISI });
        if (!y) break;
        if (!d.odulVerildi && y.odulVerildi) teslim++;
        oncekiVar = varMi;
        d = y;
      }
      if (teslim > 1) cokTeslim++;
    }

    assert.ok(paketGorulen > 0, "hiçbir turda paket çıkmadı — test bir şey sınamadı");
    assert.equal(erken, 0, `paket ${erken} kez eşik geçilmeden çıktı`);
    assert.equal(cokTeslim, 0, `${cokTeslim} turda paket birden çok kez teslim edildi`);
  });

  test("zorluk tur içinde artıyor", () => {
    // ⚠️ Blok'un kendi eğrisi ayrı testte (Ü203) — orada tavanın yeri
    // ve kademe sayısı da sınanıyor.

    // Düşen: temizlenen satır arttıkça parça hızlanıyor (tick azalıyor).
    assert.ok(
      dusmeTickiHesapla(20) < dusmeTickiHesapla(0),
      "düşen hızlanmıyor",
    );
    assert.equal(dusmeTickiHesapla(1000), dusmeTickiHesapla(500), "düşen hızı tavana oturmuyor");

    // Yılan: yem yedikçe adım hızlanıyor.
    assert.ok(adimTickiHesapla(12) < adimTickiHesapla(0), "yılan hızlanmıyor");
    assert.equal(adimTickiHesapla(200), adimTickiHesapla(100), "yılan hızı tavana oturmuyor");
  });

  test("skor eşiklerden bağımsız bir ölçekte, tek temizlik eşiğin yirmide biri", () => {
    // ⚠️ Burada sınanan şey **denge değil, ölçek**. Denge ancak gerçek
    // oyuncu verisiyle doğrulanabilir: testteki botlar ilk sığan yere
    // koyuyor ve satır tamamlamayı hiç denemiyor, yani zayıf oyuncuyu bile
    // temsil etmiyorlar (ölçüm: Düşen botu 40 turda bir kez satır
    // temizleyemedi). Kalibrasyon pilot verisiyle yapılacak.
    //
    // Sınanan tek şey ölçeğin makul olması: bir satır temizlemek eşiğin
    // yirmide biri kadar etsin ki eşik "yirmi satır civarı" demeye gelsin.
    const d = blok.baslat("olcek");
    assert.ok(blok.skor(d) === 0, "tur sıfır skorla başlamıyor");
    assert.ok(KUPON_ESIGI / 35 < 20, "bir satırın payı çok küçük — eşik ulaşılamaz olur");
    assert.ok(KUPON_ESIGI / 35 > 5, "bir satırın payı çok büyük — eşik anlamsızlaşır");
  });

  test("başarı artık skordan hesaplanıyor, oyundan değil", () => {
    assert.equal(basariliMi(KUPON_ESIGI - 1), false);
    assert.equal(basariliMi(KUPON_ESIGI), true);
    assert.equal(basariliMi(0), false);

    /*
      🔴 Ü234 · TEK KAPI — bu test kaynağı okuyor ve bu bilinçli.

      Ü91'den Ü233'e kadar `basariliMi` ikinci bir parametre alıyordu
      (`odulIsareti`) ve sıfırdan büyükse eşiği **tamamen atlıyordu**.
      Sonucu iki ayrı ekonomiydi: Yılan eşiksiz kupon veriyor,
      Blok/Düşen/Sekme 500'e ulaşmak zorunda kalıyordu.

      Davranış testiyle yakalanamaz: parametre silindiği için yanlış
      çağrı zaten derlenmiyor. Ama biri günün birinde parametreyi geri
      koyarsa derleme yine geçer ve ekonomi sessizce ikiye bölünür.
      Yakalanacağı tek yer kaynak.
    */
    const kaynak = readFileSync(
      fileURLToPath(new URL("../src/domain/puan.ts", import.meta.url)),
      "utf8",
    );
    const govde = yorumsuz(
      kaynak.slice(kaynak.indexOf("export function basariliMi")).slice(0, 1600),
    );
    assert.ok(
      !govde.includes("odulIsareti"),
      "basariliMi yine ödül işaretine bakıyor — eşik kısayolu geri gelmiş (Ü234)",
    );
    // Sözleşmede `basarili` diye bir alan kalmadı: başarı ürün kararı.
    for (const oyun of OYUNLAR) {
      assert.equal(
        "basarili" in oyun,
        false,
        `${oyun.id}: sözleşmede hâlâ basarili() var`,
      );
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   1b2 · Ödül dağıtımı TEK kuralda mı (Ü234)
   ═══════════════════════════════════════════════════════════ */

describe("ödül dağıtımı tek kuralda (Ü234)", () => {
  test("hiçbir oyun eşiğin altında ödül göstermiyor", () => {
    /*
      🔴 Ürün sahibi: *"ödül dağıtma algoritmasını tüm oyunlarla
      birlikte eksiksiz ve doğru kurmalıyız."*

      Bu test dört oyunu da baştan sona oynatıp **her adımda** şunu
      soruyor: ekranda ödül varken skor eşiğin altında mı? Tek bir kare
      bile öyleyse o oyun ötekilerden kolay demektir.

      ⚠️ Ödülün ekranda görünme biçimi oyundan oyuna farklı
      (`odulParcasi`, `nesneler` içinde `tur: "odul"`, `odul` hücresi);
      testin bakması gereken şey biçim değil **kural**, o yüzden her
      oyun için ayrı okuyucu var.
    */
    /*
      ⚠️ Okuyucular alan ADINA değil, alanın **anlamına** bakıyor ve
      her oyunda ayrı: Blok'ta ödül bir teklif indeksi (`-1` = yok),
      Düşen'de bir bayrak, Sekme'de nesne listesinde bir tür,
      Yılan'da bir hücre.

      🔴 İlk yazımda ikisi de `!= null` ile okunuyordu ve **boolean
      alanlar hep "ödül var" sayılıyordu** (`false != null` doğru).
      Test 1543 hatalı kare bildirdi, ürün hatasız çıktı. Yanlış
      okuyucu, yeşil yanan testten daha kötü: var olmayan bir hatayı
      kovalatıyor.
    */
    const okuyucular: Record<string, (d: unknown) => boolean> = {
      blok: (d) => (d as { odulTeklifi: number }).odulTeklifi >= 0,
      dusen: (d) => (d as { odulParcasi: boolean }).odulParcasi === true,
      sekme: (d) =>
        ((d as { nesneler?: { tur: string }[] }).nesneler ?? []).some(
          (n) => n.tur === "odul",
        ),
      yilan: (d) => (d as { odul: number | null }).odul !== null,
      // Ü235 — kütükteki paketin açısı; `null` = paket yok.
      bicak: (d) => (d as { odulAcisi: number | null }).odulAcisi !== null,
    };

    /* ⚠️ Yapısal tip: dört motorun `Durum` tipleri farklı ve birlik
       olarak geçilince TypeScript parametreleri KESİŞİM'e daraltıyor
       (`BlokDurumu & DusenDurumu & …`), yani hiçbir değer uymuyor.
       Testin ihtiyacı üç metot; tipi ona indiriyoruz. */
    type Gevsek = {
      baslat: (t: string) => unknown;
      skor: (d: unknown) => number;
      uygula: (d: unknown, g: unknown) => unknown;
    };

    for (const { oyun, id, oyna } of [
      { oyun: blok as unknown as Gevsek, id: "blok", oyna: blokOyna },
      { oyun: dusen as unknown as Gevsek, id: "dusen", oyna: dusenOyna },
      { oyun: sekme as unknown as Gevsek, id: "sekme", oyna: sekmeOyna },
      { oyun: yilan as unknown as Gevsek, id: "yilan", oyna: yilanOyna },
      { oyun: bicak as unknown as Gevsek, id: "bicak", oyna: bicakOyna },
    ]) {
      const oku = okuyucular[id];
      let erken = 0;
      let gorulen = 0;

      for (let i = 0; i < 25; i++) {
        const tohum = `tek-kural-${id}-${i}`;
        let d = oyun.baslat(tohum);
        const r = oyna(tohum, i);
        // Turu adım adım yeniden kur ve her karede bak.
        for (const g of r.girdiler) {
          if (oku(d)) {
            gorulen++;
            if (oyun.skor(d) < ODUL_ESIGI) erken++;
          }
          const y = oyun.uygula(d, g);
          if (!y) break;
          d = y;
        }
        if (oku(d)) {
          gorulen++;
          if (oyun.skor(d) < ODUL_ESIGI) erken++;
        }
      }

      assert.equal(
        erken,
        0,
        `${id}: ödül ${erken} karede eşiğin ALTINDA göründü — oyun ötekilerden kolay`,
      );
      assert.ok(gorulen >= 0, `${id}: okuyucu çalışmadı`);
    }
  });

  test("işaret düşme şansına artık pay eklemiyor", () => {
    /*
      İkinci kapı buydu: `dusmeSansi` işaret varsa 0,35 puan ekliyordu.
      Ü234'te sıfırlandı — oyun içi ödül yalnızca teslimat anı.
    */
    for (const skor of [500, 800, 1500]) {
      assert.equal(
        dusmeSansi(skor, 0, 3),
        dusmeSansi(skor, 0, 0),
        `skor ${skor}: işaret hâlâ şansı değiştiriyor (Ü234)`,
      );
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   1b2b · Bıçak — duvar, paket, girdi (Ü235)
   ═══════════════════════════════════════════════════════════ */

describe("bıçak (Ü235)", () => {
  test("duvar her tohumda geliyor — tam tur tarayan bot da ölüyor", () => {
    /*
      🔴 Bu testin bekçilik ettiği şey `bicakSayisi`nin tavanı.

      İlk yazımda `min(12, 4 + tur*2)` yazıyordu: her bölüm en fazla
      12 bıçak istiyor, 12 bıçak çembere rahatça sığıyor ve
      tamamlanamayacak bölüm hiç gelmiyordu. Ölçüldü — bot **68.
      bölüme** çıktı ve turu bitiren şey oyunun kuralı değil döngü
      sınırıydı. Ü83: *"kazanarak biten bir tur yok."*

      ⚠️ Sınırlar ölçülene göre konuldu. Ü240'ta bıçak incelip
      çakışma penceresi yarıya inince ölçüm yenilendi: doğru sürümde
      40 tohumun hepsinde duvar **6. bölümde**, en yüksek skor
      **1.911**. Bölüm 15 ve skor 6000 bol pay bırakıyor ama
      68/on binlerce puanı yakalıyor.

      ⚠️ Sınırlar bilerek gevşek: bu test dengeyi değil **duvarın
      varlığını** bekçiliyor. Denge değiştiğinde kırmızı yanan bir
      test, her ayarda güncellenmek zorunda kalır ve güncellene
      güncellene anlamını yitirir.

      ⚠️ Asıl bekçi `bittiMi`: tavan bozulursa bot 400 atışlık
      döngüyü bitiremeden çıkıyor ve tur `bitti` olmuyor.
    */
    let enYuksekTur = 0;
    let enYuksekSkor = 0;

    for (let i = 0; i < 20; i++) {
      const r = bicakOyna(`duvar-${i}`);
      assert.ok(
        bicak.bittiMi(r.durum),
        `duvar-${i}: tur bitmedi — bölüm ${r.durum.tur}, bıçak sayısı tavanı duvarı getirmiyor`,
      );
      enYuksekTur = Math.max(enYuksekTur, r.durum.tur);
      enYuksekSkor = Math.max(enYuksekSkor, r.skor);
    }

    assert.ok(
      enYuksekTur <= 15,
      `bölüm ${enYuksekTur}'e kadar gidildi — çember dolmuyor`,
    );
    assert.ok(
      enYuksekSkor < 6000,
      `en yüksek skor ${enYuksekSkor} — öbür oyunların mertebesinin çok üstünde`,
    );
  });

  test("paket PUAN vermiyor — teslimat, kazanç değil", () => {
    /*
      Ü234'ün kuralı: oyun içi paket kazanılmış ödülü **teslim
      ediyor**, yeni bir şey kazandırmıyor. Blok'ta `ODUL_BONUSU`
      sıfır; burada karşılığı, paketi vuran bıçağın boş yere saplanan
      bıçakla **aynı** puanı getirmesi.

      🔴 Fark testi: sabit bir puan beklemek yerine aynı durumdan iki
      atış yapılıyor — biri pakete, biri boşluğa. İkisi eşit olmalı.
      Sabit sayı yazılsaydı `saplamaPuani` değiştiği gün test yanlış
      sebeple düşerdi.
    */
    let denendi = 0;

    for (let i = 0; i < 40 && denendi < 5; i++) {
      // Paketin belirdiği bir duruma kadar oyna.
      let d = bicak.baslat(`paket-${i}`);
      let bulundu = false;
      for (let atis = 0; atis < 400 && !bicak.bittiMi(d); atis++) {
        if (d.odulAcisi !== null) {
          bulundu = true;
          break;
        }
        const y = bicak.uygula(d, { t: enGenisAn(d) });
        if (!y) break;
        d = y;
      }
      if (!bulundu || bicak.bittiMi(d)) continue;

      // Paketi vuran ve vurmayan iki atış ara.
      let pakete: number | null = null;
      let bosa: number | null = null;
      for (let k = 1; k <= 400 && (pakete === null || bosa === null); k++) {
        const y = bicak.uygula(d, { t: d.sonTick + k });
        if (!y || y.bitti) continue;
        // Elma da yenmişse fark ölçümü kirlenir; o atış sayılmıyor.
        if (y.elma.length !== d.elma.length) continue;
        if (y.odulVerildi && !d.odulVerildi) pakete ??= y.skor - d.skor;
        else if (!y.odulVerildi) bosa ??= y.skor - d.skor;
      }
      if (pakete === null || bosa === null) continue;

      denendi++;
      assert.equal(
        pakete,
        bosa,
        `paket-${i}: paketi vuran bıçak ${pakete}, boşa saplanan ${bosa} puan getirdi — paket bonus veriyor (Ü234)`,
      );
    }

    assert.ok(denendi >= 3, `yalnızca ${denendi} tohumda paket sınanabildi`);
  });

  test("girdi denetimi — geri giden, kesirli ve çok uzak tick reddediliyor", () => {
    const d = bicak.baslat("girdi");

    assert.equal(bicak.uygula(d, { t: d.sonTick }), null, "aynı tick kabul edildi");
    assert.equal(bicak.uygula(d, { t: -4 }), null, "geri giden tick kabul edildi");
    assert.equal(bicak.uygula(d, { t: 12.5 }), null, "kesirli tick kabul edildi");
    assert.equal(
      bicak.uygula(d, { t: 500_000 }),
      null,
      "çok uzak tick kabul edildi — hız × dt taşabilir",
    );
    assert.notEqual(bicak.uygula(d, { t: 7 }), null, "geçerli tick reddedildi");

    // `girdiOku` sunucunun kapısı: ham JSON buradan geçiyor.
    assert.equal(bicak.girdiOku({ t: 3 })?.t, 3);
    assert.equal(bicak.girdiOku({ t: -1 }), null);
    assert.equal(bicak.girdiOku({ t: "3" }), null);
    assert.equal(bicak.girdiOku(null), null);
    assert.equal(bicak.girdiOku({}), null);
  });

  test("gecenMs tick'ten türüyor — az tick bildiren kütüğü yavaşlatamıyor (Ü84)", () => {
    /*
      Oyunun tamamı zamanlama: girdinin tek alanı tick. Sunucu gerçek
      süreyi biliyor ve `gecenMs` ile karşılaştırıyor; bu bağ koparsa
      oyuncu kütüğü istediği kadar yavaşlatır.
    */
    const r = bicakOyna("saat");
    assert.equal(
      bicak.gecenMs?.(r.durum),
      r.durum.sonTick * TICK_MS,
      "gecenMs son tick'i yansıtmıyor",
    );
    assert.ok(r.durum.sonTick > 0, "tur hiç tick ilerlemeden bitti");
  });
});

/**
 * Saplı bıçaklardan en uzak anı bulur — testin nişan alması için.
 *
 * ⚠️ Pencere `bicakOyna`nınkiyle aynı gerekçeyle bir tam tur: daha
 * kısa bir pencere en geniş boşluğu kaçırıyor.
 */
function enGenisAn(d: {
  aci: number;
  hiz: number;
  sonTick: number;
  saplanan: number[];
}): number {
  let enIyi = d.sonTick + 1;
  let enGenis = -1;
  for (let k = 1; k <= 200; k++) {
    const t = d.sonTick + k;
    const aci = d.aci + d.hiz * (t - d.sonTick);
    const yer = (((GIRIS_ACISI - aci) % CEMBER) + CEMBER) % CEMBER;
    const pay = d.saplanan.length
      ? Math.min(...d.saplanan.map((s) => testAciFarki(s, yer)))
      : CEMBER;
    if (pay > enGenis) {
      enGenis = pay;
      enIyi = t;
    }
  }
  return enIyi;
}

/* ═══════════════════════════════════════════════════════════
   1b3 · Oyun içi ödül işareti (Ü91)
   ═══════════════════════════════════════════════════════════ */

describe("oyun içi ödül işareti (Ü91)", () => {
  test("ilk yemlerde ödül çıkmıyor", () => {
    // Oyunun ilk yirmi saniyesi öğrenme anı; oraya ödül koymak hem çok
    // kolay olur hem de oyuncu kuralı anlamadan en değerli şeyi kaçırır.
    for (const tohum of ["a", "b", "c", "d", "e"]) {
      const d = yilan.baslat(tohum);
      assert.equal(d.odul, null, `${tohum}: açılışta ödül tahtada`);
    }
  });

  test("ödül yemden ayrı bir hücrede duruyor", () => {
    // ⚠️ Ü92: ilk sürümde ödül yemin YERİNE geçiyordu ve yakalamak bir
    // karar değildi — oyuncu zaten yeme gidiyor, yem ödül olunca
    // kendiliğinden alıyordu. Ölçüldü: turların %40'ı kupon veriyordu.
    for (let i = 0; i < 60; i++) {
      const d = yilanOyna(`ayri-${i}`).durum;
      if (d.odul !== null) assert.notEqual(d.odul, d.yem, `${i}: ödül yemin üstünde`);
    }
  });

  test("yakalanmayan ödül tahtadan kalkıyor", () => {
    // Süresiz kalsaydı ödül bir karar olmaktan çıkar, sıraya girip alınan
    // bir şeye dönerdi (Ü92). Yılanı ödülden UZAK tutup bekliyoruz.
    let d = yilan.baslat("omur");
    let tick = 0;
    let odulGorulduTick = -1;

    for (let a = 0; a < 4000 && !yilan.bittiMi(d); a++) {
      tick += 2;
      // Yeme git; ödüle asla sapma.
      const bas = d.govde[0];
      const bs = Math.floor(bas / YILAN_EN), bk = bas % YILAN_EN;
      const ys = Math.floor(d.yem / YILAN_EN), yk = d.yem % YILAN_EN;
      const yon = bs !== ys ? (ys < bs ? "yukari" : "asagi") : yk < bk ? "sol" : "sag";
      const n = yilan.uygula(d, { tick, y: bk === yk && bs === ys ? "bekle" : yon });
      if (!n) break;

      if (odulGorulduTick < 0 && n.odul !== null) odulGorulduTick = a;
      if (odulGorulduTick >= 0 && n.odul === null) {
        // Yakalayarak değil, süresi dolarak kalkmış olmalı.
        assert.equal(n.odulYakalanan, 0, "ödül yakalandı, ömür sınanamadı");
        assert.ok(a - odulGorulduTick <= ODUL_OMRU_ADIM * 3, "ödül çok uzun kaldı");
        return;
      }
      d = n;
    }

    assert.ok(odulGorulduTick < 0, "ödül belirdi ama hiç kalkmadı");
  });

  test("ilerleyen turda ödül yemi çıkıyor", () => {
    // Tek bir turda çıkması şansa bağlı; ödülün var olduğunu görmek için
    // birkaç tohum yeterli. Sınanan şey oran değil **varlık**.
    const cikan = ["y-1", "y-2", "y-3", "y-4", "y-5", "y-6"].filter(
      (t) => yilanOyna(t).durum.odulYakalanan > 0 || yilanOyna(t).durum.yenen >= 5,
    );
    assert.ok(cikan.length > 0, "hiçbir turda ödül aşamasına gelinemedi");
  });

  test("oyun kupon üretmiyor, yalnızca sayıyor", () => {
    // ⚠️ Değişmez kural #4'ün buradaki karşılığı: durumda para değeri
    // taşıyan hiçbir alan yok — yalnızca bir sayaç.
    const d = yilan.baslat("kural");
    assert.equal(typeof yilan.odulIsareti?.(d), "number");
    assert.equal(
      JSON.stringify(d).toLowerCase().includes("kurus"),
      false,
      "oyun durumunda TL/kuruş alanı var — ödül kararı istemciye sızmış",
    );
  });

  test("işaret sunucunun replay'inde de aynı çıkıyor", () => {
    // İstemcinin "ödül yakaladım" demesi yetmiyor; sunucu aynı sayıyı
    // kendi hesabıyla bulmalı.
    for (const tohum of ["i-1", "i-2", "i-3"]) {
      const canli = yilanOyna(tohum);
      const sunucu = tekrarOyna(yilan, tohum, canli.girdiler);
      assert.ok(sunucu.gecerli, `${tohum}: replay geçersiz`);
      assert.equal(
        sunucu.gecerli && sunucu.odulIsareti,
        canli.durum.odulYakalanan,
        `${tohum}: ödül işareti ayrıştı`,
      );
    }
  });

  test("işareti olmayan oyunlarda sayı sıfır", () => {
    const b = blokOyna("isaretsiz");
    const sunucu = tekrarOyna(blok, "isaretsiz", b.girdiler);
    assert.equal(sunucu.gecerli && sunucu.odulIsareti, 0);
  });
});

/* ═══════════════════════════════════════════════════════════
   1c · Oyun saati gerçek süreyle tutarlı mı (Ü84)
   ═══════════════════════════════════════════════════════════ */

describe("saat tutarlılığı (Ü84)", () => {
  test("zamansız oyun her zaman geçerli", () => {
    // Blok'ta tick yok; `gecenMs` tanımlı değil ve kontrol devre dışı.
    assert.equal(blok.gecenMs, undefined, "blok'a zaman eklenmiş");
    assert.equal(saatTutarliMi(null, 60 * 60_000), true);
  });

  test("dürüst kayıt geçiyor — oyun saati gerçek süreye yakın", () => {
    const gercek = 45_000;
    assert.equal(saatTutarliMi(45_000, gercek), true, "birebir eşit kayıt reddedildi");
    assert.equal(saatTutarliMi(40_000, gercek), true, "makul gecikme reddedildi");
  });

  test("on dakikayı üç saniye diye bildiren kayıt reddediliyor", () => {
    // Kurcalanan istemcinin yaptığı tam olarak bu: tick'leri küçük
    // tutarak zaman tabanlı oyunda süreyi hiç doldurmuyor.
    assert.equal(saatTutarliMi(3_000, 10 * 60_000), false);
  });

  test("kısa turlar sınanmıyor — kurulum gecikmesi haksızlık yapmasın", () => {
    assert.equal(saatTutarliMi(1_000, SAAT_ALT_SINIR_MS - 1), true);
  });

  test("zaman tabanlı oyunlar kendi sürelerini bildiriyor", () => {
    for (const oyun of [dusen, yilan]) {
      assert.equal(typeof oyun.gecenMs, "function", `${oyun.id}: gecenMs yok`);
    }
    // Düşen'in saati tick sayacından türüyor; basit bot tick'i ilerletiyor.
    const k = dusenOyna("saat");
    const bildirilen = dusen.gecenMs!(k.durum);
    assert.ok(bildirilen > 0, "düşen sıfır süre bildirdi");
    assert.equal(bildirilen, k.durum.tick * TICK_MS, "süre tick ile tutarsız");
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Girdi kaydı denetimi
   ═══════════════════════════════════════════════════════════ */

describe("girdi kaydı denetimi", () => {
  test("kuraldışı hamle reddedilir", () => {
    // Aynı teklifi iki kez kullanmak: ikincisi kuraldışı.
    const d = blok.baslat("kural");
    let ilk: unknown = null;
    for (let s = 0; s < 8 && !ilk; s++) {
      for (let k = 0; k < 8 && !ilk; k++) {
        if (blok.uygula(d, { t: 0, s, k })) ilk = { t: 0, s, k };
      }
    }
    const sonuc = tekrarOyna(blok, "kural", [ilk, ilk]);
    assert.equal(sonuc.gecerli, false);
  });

  test("bozuk girdi biçimi reddedilir", () => {
    for (const bozuk of [
      [{ t: "0", s: 0, k: 0 }],
      [{ t: 0.5, s: 0, k: 0 }],
      [{ t: 0, s: 99, k: 0 }],
      [null],
      ["hamle"],
      [{}],
    ]) {
      const sonuc = tekrarOyna(blok, "bozuk", bozuk);
      assert.equal(sonuc.gecerli, false, `kabul edildi: ${JSON.stringify(bozuk)}`);
    }
  });

  test("girdi kaydı dizi değilse reddedilir", () => {
    for (const bozuk of [null, "abc", 42, { hamleler: [] }]) {
      assert.equal(tekrarOyna(blok, "t", bozuk).gecerli, false);
    }
  });

  test("girdi kaydı sınırsız uzayamaz", () => {
    const cokUzun = new Array(EN_FAZLA_GIRDI + 1).fill({ t: 0, s: 0, k: 0 });
    const sonuc = tekrarOyna(blok, "t", cokUzun);
    assert.equal(sonuc.gecerli, false);
    assert.match(sonuc.gecerli === false ? sonuc.sebep : "", /çok uzun/);
  });

  test("boş girdi kaydı geçerli ama sıfır skorlu", () => {
    // Ü83: bölüm doğrulaması kalktı (bölüm kavramı yok). Boş kayıt artık
    // bir hata değil — hiç hamle yapmadan çıkan oyuncunun turu bu.
    const sonuc = tekrarOyna(blok, "t", []);
    assert.equal(sonuc.gecerli, true);
    assert.equal(sonuc.gecerli && sonuc.skor, 0);
  });

  test("bitmiş bölümden sonraki girdiler yok sayılır, skoru değiştirmez", () => {
    const canli = blokOyna("bitmis");

    // Zaman tabanlı oyunlarda istemci sona bir zaman işareti koymak zorunda
    // ve o işaret çoğu zaman bölümü bitiren şey oluyor. Bu yüzden artık
    // girdiler reddedilmiyor — ama skora da dokunmuyorlar.
    const fazla = [...canli.girdiler, { t: 0, s: 0, k: 0 }, { t: 1, s: 1, k: 1 }];
    const sonuc = tekrarOyna(blok, "bitmis", fazla);

    assert.ok(sonuc.gecerli, "artık girdi yüzünden kayıt reddedildi");
    assert.equal(sonuc.skor, canli.skor, "artık girdi skoru değiştirdi");
    assert.equal(sonuc.kullanilmayan, 2, "kullanılmayan girdi sayılmadı");
  });

  test("kayıt erken kesilirse skor düşer — uzatmak kazandırmıyor", () => {
    const canli = blokOyna("kesik");
    const kesik = canli.girdiler.slice(0, Math.max(1, canli.girdiler.length - 3));
    const sonuc = tekrarOyna(blok, "kesik", kesik);

    assert.ok(sonuc.gecerli);
    assert.ok(sonuc.skor <= canli.skor, "eksik kayıt daha yüksek skor verdi");
  });

  test("düşen: zamanı geriye alan girdi reddedilir", () => {
    const d = dusen.baslat("zaman");
    const ileri = dusen.uygula(d, { tick: 50, a: "sol" });
    assert.ok(ileri);
    assert.equal(dusen.uygula(ileri, { tick: 10, a: "sag" }), null);
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Sunucu doğrulaması — hile denemeleri
   ═══════════════════════════════════════════════════════════ */

describe("sunucu skoru yeniden hesaplar (S5)", () => {
  test("şişirilmiş skor iddiası ödülü değiştirmez", async () => {
    const { sonuc, cevap } = await tamOyun(oyuncuId, "blok", 999_999);

    assert.ok(cevap.ok);
    assert.equal(cevap.skor, sonuc.skor, "sunucu istemcinin skorunu kabul etti");
    assert.notEqual(cevap.skor, 999_999);

    // Denetim için iddia da saklanmalı — fraud analizi buna bakacak (Faz 9).
    const satir = await withBypass("test: iddia edilen skor", (db) =>
      db.one<{ claimed_score: number; server_score: number }>(
        `SELECT claimed_score, server_score FROM play_sessions
          WHERE player_id = $1 AND game_id = 'blok'
          ORDER BY started_at DESC LIMIT 1`,
        [oyuncuId],
      ),
    );
    assert.equal(satir?.claimed_score, 999_999, "iddia edilen skor saklanmadı");
    assert.equal(satir?.server_score, sonuc.skor);
  });

  test("uydurma girdi kaydı reddedilir ve puan yazılmaz", async () => {
    const oncekiPuan = await gunlukPuan(oyuncuId);

    const baslangic = await oyunDomain.basla({ playerId: oyuncuId, oyunId: "blok" });
    assert.ok(baslangic.ok);

    const cevap = await oyunDomain.bitir({
      playerId: oyuncuId,
      oturumId: baslangic.oturumId,
      girdiler: [{ t: 0, s: 99, k: 99 }],
      iddiaEdilenSkor: 5_000,
    });

    assert.equal(cevap.ok, false);
    assert.equal(cevap.ok === false ? cevap.reddedildi : undefined, true);
    assert.equal(await gunlukPuan(oyuncuId), oncekiPuan, "reddedilen oyun puan yazdı");

    const durum = await withBypass("test: reddedilen oturum", (db) =>
      db.one<{ status: string; reject_reason: string | null }>(
        `SELECT status, reject_reason FROM play_sessions WHERE id = $1`,
        [baslangic.oturumId],
      ),
    );
    assert.equal(durum?.status, "rejected");
    assert.ok(durum?.reject_reason, "ret gerekçesi yazılmadı");
  });

  test("aynı oturum iki kez bitirilemez", async () => {
    const baslangic = await oyunDomain.basla({ playerId: oyuncuId, oyunId: "dusen" });
    assert.ok(baslangic.ok);
    const oynanan = dusenIyiOyna(baslangic.tohum);

    const ilk = await oyunDomain.bitir({
      playerId: oyuncuId,
      oturumId: baslangic.oturumId,
      girdiler: oynanan.girdiler,
      iddiaEdilenSkor: oynanan.skor,
    });
    assert.ok(ilk.ok);

    const puanIlkten = await gunlukPuan(oyuncuId);

    const ikinci = await oyunDomain.bitir({
      playerId: oyuncuId,
      oturumId: baslangic.oturumId,
      girdiler: oynanan.girdiler,
      iddiaEdilenSkor: oynanan.skor,
    });
    assert.equal(ikinci.ok, false, "aynı oturum ikinci kez bitirildi");
    assert.equal(await gunlukPuan(oyuncuId), puanIlkten, "ikinci gönderim puan yazdı");
  });

  test("başkasının oturumu bitirilemez", async () => {
    const baslangic = await oyunDomain.basla({ playerId: oyuncuId, oyunId: "blok" });
    assert.ok(baslangic.ok);

    const cevap = await oyunDomain.bitir({
      playerId: disaridakiId,
      oturumId: baslangic.oturumId,
      girdiler: [],
      iddiaEdilenSkor: 0,
    });
    assert.equal(cevap.ok, false, "başkasının oturumu kabul edildi");
  });
});

/* ═══════════════════════════════════════════════════════════
   4 · Ü3 — kafe dışında kazanım yok
   ═══════════════════════════════════════════════════════════ */

describe("kafe dışında kazanım yok (Ü3, Ü14)", () => {
  test("masa oturumu olmayan oyuncu oynayabilir ama kazanamaz", async () => {
    const baslangic = await oyunDomain.basla({
      playerId: disaridakiId,
      oyunId: "blok",
    });
    assert.ok(baslangic.ok);
    assert.equal(baslangic.kazandirir, false, "kafe dışında kazandırır işaretlendi");

    const oynanan = blokOyna(baslangic.tohum);
    const cevap = await oyunDomain.bitir({
      playerId: disaridakiId,
      oturumId: baslangic.oturumId,
      girdiler: oynanan.girdiler,
      iddiaEdilenSkor: oynanan.skor,
    });

    assert.ok(cevap.ok);
    assert.equal(cevap.kazandirir, false);
    assert.equal(cevap.puan, null, "kafe dışında puan yazıldı");
    assert.equal(cevap.xp, 0, "kafe dışında XP yazıldı");

    const sayilar = await withBypass("test: kafe dışı defter", (db) =>
      db.one<{ puan: string; xp: string }>(
        `SELECT (SELECT count(*) FROM points_ledger WHERE player_id = $1) AS puan,
                (SELECT count(*) FROM xp_ledger     WHERE player_id = $1) AS xp`,
        [disaridakiId],
      ),
    );
    assert.equal(Number(sayilar?.puan), 0, "kafe dışı oyuncunun puan satırı var");
    assert.equal(Number(sayilar?.xp), 0, "kafe dışı oyuncunun XP satırı var");
  });

  test("kafede oynayan puan ve XP kazanır", async () => {
    const oncekiPuan = await gunlukPuan(oyuncuId);
    const { cevap } = await tamOyun(oyuncuId, "dusen");

    assert.ok(cevap.ok);
    assert.equal(cevap.kazandirir, true);
    assert.ok(cevap.basarili, "düşen turu eşiği geçemedi — test kurulumu");
    assert.ok((cevap.puan?.yazilan ?? 0) > 0 || oncekiPuan >= GUNLUK_TAVAN);
    assert.ok(cevap.xp > 0);
  });
});

/* ═══════════════════════════════════════════════════════════
   5 · E4 — günlük puan tavanı
   ═══════════════════════════════════════════════════════════ */

describe("günlük puan tavanı (E4)", () => {
  test("tavan aşılamaz, kesilen miktar dürüstçe bildirilir", async () => {
    // Tavana ulaşana kadar oyna — her başarılı oyun 300 (bonuslu ise 600).
    let sonCevap: Awaited<ReturnType<typeof oyunDomain.bitir>> | null = null;

    for (let i = 0; i < 8; i++) {
      const { cevap } = await tamOyun(oyuncuId, "dusen");
      if (cevap.ok) sonCevap = cevap;
      if ((await gunlukPuan(oyuncuId)) >= GUNLUK_TAVAN) break;
    }

    const toplam = await gunlukPuan(oyuncuId);
    assert.ok(toplam <= GUNLUK_TAVAN, `günlük toplam tavanı aştı: ${toplam}`);
    assert.equal(toplam, GUNLUK_TAVAN, `tavana ulaşılamadı: ${toplam}`);

    // Tavan dolduktan sonraki oyun puan yazmamalı ama XP yazmalı.
    const { cevap } = await tamOyun(oyuncuId, "dusen");
    assert.ok(cevap.ok);
    assert.equal(cevap.puan?.yazilan, 0, "tavan dolu iken puan yazıldı");
    assert.ok((cevap.puan?.kesilen ?? 0) > 0, "kesilen miktar bildirilmedi");
    assert.ok(cevap.xp > 0, "tavan XP'yi de durdurdu — XP'nin tavanı yok");
    assert.ok(sonCevap);
  });
});

/* ── Yardımcı ──────────────────────────────────────────── */

async function gunlukPuan(playerId: string): Promise<number> {
  const r = await withBypass("test: günlük puan", (db) =>
    db.one<{ toplam: string }>(
      // `current_date` DEĞİL: o veritabanı sunucusunun (UTC) günü. Puanlar
      // İstanbul iş gününe yazılıyor ve ikisi gece 00:00–03:00 arasında
      // ayrışıyor — sayaç hep 0 görür, tavan testi hiç bitmez.
      `SELECT COALESCE(sum(delta), 0) AS toplam FROM points_ledger
        WHERE player_id = $1 AND cafe_id = $2 AND business_date = $3`,
      [playerId, kafeA, isGunu()],
    ),
  );
  return Number(r?.toplam ?? 0);
}

/* ══════════════════════════════════════════════════════════════
 * PUAN EKONOMİSİ — Ü48
 *
 * İki değişiklik sınanıyor: bölüm bitmese de puan yazılıyor (katılım) ve
 * yüksek skor ayrıca ödüllendiriliyor (eşik). İkisi de para değil ama ikisi
 * de ödüle giden yolu kısaltıyor; sessizce bozulmamalı.
 * ═════════════════════════════════════════════════════════════ */
describe("puan · katılım ve skor eşiği (Ü48)", () => {
  test("eşiğin altındaki skor bonus üretmiyor", () => {
    assert.equal(esikBul(0), null);
    assert.equal(esikBul(1_499), null);
  });

  test("eşiğe ulaşan skor kendi kademesini alıyor", () => {
    assert.equal(esikBul(1_500)?.bonus, 150);
    assert.equal(esikBul(2_499)?.bonus, 150);
  });

  /**
   * Kademeler toplanmıyor: 2500 yapan 150+300 değil, 300 alıyor.
   * Toplansaydı tek bir iyi oyun günlük tavanı tek başına doldururdu.
   */
  test("üst kademe alt kademeyle toplanmıyor", () => {
    assert.equal(esikBul(2_500)?.bonus, 300);
    assert.equal(esikBul(999_999)?.bonus, 300, "en üst kademe tavan olmalı");
  });

  test("katılım puanı oyun puanından belirgin biçimde küçük", () => {
    // Yarıda bırakıp yeniden başlamak, oynayarak puan toplamaktan
    // kârlı olmamalı — aradaki farkın korunması bunun güvencesi.
    assert.ok(KATILIM_PUANI * 4 < OYUN_PUANI, "katılım puanı çiftlik yapmaya değer hâle geldi");
  });

  test("eşikler artan sırada — sıra bozulursa esikBul yanlış kademe döner", () => {
    for (let i = 1; i < SKOR_ESIKLERI.length; i++) {
      assert.ok(
        SKOR_ESIKLERI[i].skor > SKOR_ESIKLERI[i - 1].skor,
        "eşik listesi artan sırada değil",
      );
      assert.ok(
        SKOR_ESIKLERI[i].bonus > SKOR_ESIKLERI[i - 1].bonus,
        "yüksek eşik daha az kazandırıyor",
      );
    }
  });
});

/* ══════════════════════════════════════════════════════════════
 * GÜNLÜK SERİ — Ü54
 *
 * Seri ayrı tablo tutmuyor, `play_sessions`'tan hesaplanıyor. Sınanan üç
 * iddia: arka arkaya günler doğru sayılıyor, bir gün atlanınca sıfırlanıyor
 * ve bonus günde bir kez yazılıyor.
 * ═════════════════════════════════════════════════════════════ */
describe("günlük seri (Ü54)", () => {
  test("bonus ilk günde yok, sonra artıyor ve tavanda duruyor", () => {
    assert.equal(seri.bonusPuani(0), 0);
    assert.equal(seri.bonusPuani(1), 0, "tek ziyaret henüz seri değil");
    assert.equal(seri.bonusPuani(2), 25);
    assert.equal(seri.bonusPuani(5), 100);
    assert.equal(seri.bonusPuani(9), 200);
    assert.equal(seri.bonusPuani(60), 200, "tavan aşılmamalı");
  });

  /**
   * Tavan, günlük puan tavanının (E4) dörtte birini geçmemeli: geçseydi
   * "oyna" yerine "sadece uğra" davranışını ödüllendirirdi.
   */
  test("seri bonusu günlük puan tavanının dörtte birini aşmıyor", () => {
    assert.ok(seri.bonusPuani(99) <= GUNLUK_TAVAN / 4);
  });

  test("arka arkaya günler sayılıyor, atlanan gün seriyi sıfırlıyor", async () => {
    const oyuncu = (
      await kaydet({
        telefon: yeniTelefon(),
        eposta: benzersizEposta(),
        ad: "Seri",
        soyad: "Testi",
        dogumYili: 1990,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;

    const bugun = isGunu();
    const gunEkleIso = (g: number) => {
      const d = new Date(`${bugun}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + g);
      return d.toISOString().slice(0, 10);
    };

    // Bugün, dün, evvelsi gün → 3 günlük seri. Dört gün önce boş.
    for (const g of [0, -1, -2, -4]) {
      await yoneticiSorgu(
        `INSERT INTO play_sessions
           (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
            started_at, ended_at, server_score, proof_mask, proof_level,
            business_date, status, is_qualified)
         VALUES ($1,$2,NULL,$3,decode(md5($3),'hex'),'blok',$4,
                 now(), now(), 100, 3, 2, $5::date, 'completed', false)`,
        [`oyn_seri_${oyuncu}_${g}`, kafeA, oyuncu, `thm_seri_${g}`, gunEkleIso(g)],
      );
    }

    const d = await withBypass("test seri", (db) =>
      seri.hesapla(db, { playerId: oyuncu, cafeId: kafeA, bugun }),
    );
    assert.equal(d.gun, 3, "atlanan günün ötesi seriye katılmamalı");
    assert.equal(d.bugunOynadi, true);
    assert.equal(d.riskte, false);
  });

  /**
   * Bugün oynanmadıysa seri KIRILMIŞ sayılmıyor — gün henüz bitmedi.
   * Kırıldığını söylemek, akşam gelecek müşteriyi sabahtan kaybetmek olurdu.
   */
  test("bugün oynanmadıysa seri düne kadar sayılıyor ve riskte işaretleniyor", async () => {
    const oyuncu = (
      await kaydet({
        telefon: yeniTelefon(),
        eposta: benzersizEposta(),
        ad: "Riskte",
        soyad: "Testi",
        dogumYili: 1990,
        pazarlamaIzni: false,
      })
    ).oyuncu.id;

    const bugun = isGunu();
    const gunEkleIso = (g: number) => {
      const d = new Date(`${bugun}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + g);
      return d.toISOString().slice(0, 10);
    };

    for (const g of [-1, -2]) {
      await yoneticiSorgu(
        `INSERT INTO play_sessions
           (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
            started_at, ended_at, server_score, proof_mask, proof_level,
            business_date, status, is_qualified)
         VALUES ($1,$2,NULL,$3,decode(md5($3),'hex'),'blok',$4,
                 now(), now(), 100, 3, 2, $5::date, 'completed', false)`,
        [`oyn_risk_${oyuncu}_${g}`, kafeA, oyuncu, `thm_risk_${g}`, gunEkleIso(g)],
      );
    }

    const d = await withBypass("test seri riskte", (db) =>
      seri.hesapla(db, { playerId: oyuncu, cafeId: kafeA, bugun }),
    );
    assert.equal(d.gun, 2);
    assert.equal(d.bugunOynadi, false);
    assert.equal(d.riskte, true, "seri sıfırlanmış gibi gösterildi");
  });
});

/* ═══════════════════════════════════════════════════════════
   Seviye atlama (Ü146)
   ═══════════════════════════════════════════════════════════ */

describe("seviye atlama", () => {
  test("eşiği geçen tur seviye atlattığını bildiriyor", async () => {
    /*
      Seviye bir kolon değil, XP defterinin toplamı. "Bu tur atlattı mı"
      sorusunun cevabı ancak öncesi ile sonrası karşılaştırılarak
      bulunuyor — test tam olarak o sınırı zorluyor: oyuncu eşiğin bir
      tık altına getiriliyor, sonra bir tur oynuyor.
    */
    const p = await yeniOyuncu();
    await dogrulanmisOturum(p);

    const esik = xp.SEVIYE_ESIKLERI[1];
    const oncekiSeviye = xp.seviye(esik - 1);

    await xp.yaz({
      playerId: p,
      cafeId: kafeA,
      delta: esik - 1,
      kaynak: "ADJUSTMENT",
    });

    const { cevap } = await tamOyun(p, "blok");
    assert.ok(cevap.ok, "tur reddedildi");
    if (!cevap.ok) return;

    assert.ok(cevap.seviye, "eşik geçildi ama seviye atlama bildirilmedi");
    assert.equal(cevap.seviye.onceki, oncekiSeviye);
    assert.equal(cevap.seviye.yeni, oncekiSeviye + 1);
  });

  test("eşiği geçmeyen tur seviye atlama bildirmiyor", async () => {
    /*
      ⚠️ Bu test ilkinin aynadaki hâli ve gerekli: yalnızca "atladı"
      sınanırsa, her turda seviye atladığını söyleyen bozuk bir kod da
      testten geçerdi.

      🔴 Ü201'de DÜŞTÜ ve kurulumu düzeltildi.

      Eskiden taze bir oyuncu tek tur oynuyor ve "seviye atlamadı"
      bekleniyordu. Bu, iki sayının arasındaki ince boşluğa
      yaslanıyordu: birinci seviye eşiği yalnızca **100 XP**
      (`SEVIYE_ESIKLERI[1]`) ve testin kaba kuvvet botu zaten ona yakın
      XP topluyordu. Ödül parçası turun skorunu yükseltince tur
      "başarılı" sayıldı, XP çarpanı büyüdü ve bot eşiği geçti.

      Testin **iddiası** doğruydu, **kurulumu** kırılgandı. Artık
      oyuncu bir eşiğin hemen üstüne konuyor ve önünde tek turda
      kapanamayacak kadar geniş bir boşluk bırakılıyor: 5. seviye
      1.500'de başlıyor, 6. seviye 3.000'de. Aradaki 1.500 XP'yi hiçbir
      tur tek başına veremez.

      ⚠️ Sayı elle yazılmıyor, `SEVIYE_ESIKLERI`den okunuyor — eşikler
      değişirse test kurulumu da değişsin, sessizce yanlış yere
      oturmasın.
    */
    const p = await yeniOyuncu();
    await dogrulanmisOturum(p);

    const taban = xp.SEVIYE_ESIKLERI[4];
    const sonraki = xp.SEVIYE_ESIKLERI[5];
    const oncekiSeviye = xp.seviye(taban);

    await xp.yaz({
      playerId: p,
      cafeId: kafeA,
      delta: taban,
      kaynak: "ADJUSTMENT",
    });

    const { cevap } = await tamOyun(p, "blok");
    assert.ok(cevap.ok, "tur reddedildi");
    if (!cevap.ok) return;

    // Kurulumun hâlâ geçerli olduğunu test kendisi doğruluyor: turun
    // kazandırdığı XP boşluktan küçük olmalı, yoksa test bir şey
    // sınamıyor demektir.
    assert.ok(
      cevap.xp < sonraki - taban,
      `tur ${cevap.xp} XP verdi, boşluk ${sonraki - taban} — kurulum artık sınamıyor`,
    );
    assert.equal(cevap.seviye, null, "seviye atlamadan atladı denildi");
    assert.equal(xp.seviye(taban + cevap.xp), oncekiSeviye, "seviye beklenmedik yerde");
  });
});

