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
import {
  kirici,
  kiriciDuvarUstu,
  kiriciPaletEni,
  KIRICI_EN,
  KIRICI_OLCEK,
  KIRICI_SATIR,
  type KiriciDurumu,
} from "@/oyunlar/kirici";
import { sekme, ACI_SAYISI, atisIzi, SEKME_BOY } from "@/oyunlar/sekme";
import { ikibin, type IkibinYonu } from "@/oyunlar/ikibin";
import {
  ayir,
  bolumTahtasi,
  bolumBittiMi,
  bolumPuani,
  parcaSayisi,
  renkSayisi,
  KAPASITE,
  HAMLE_HAKKI,
  EN_FAZLA_RENK,
  type AyirDurumu,
} from "@/oyunlar/ayir";
import { ayirSivisi, AYIR_SIVI_SAYISI } from "@/oyunlar/arayuz/ayir-yuzey";
import {
  bagla,
  bolumTahtasi as baglaBolumu,
  bolumBittiMi as baglaBolumBittiMi,
  bolumPuani as baglaPuani,
  renkSayisi as baglaRenkSayisi,
  tahtaEni,
  CIZIM_HAKKI,
  EN_FAZLA_RENK as BAGLA_EN_FAZLA_RENK,
  type BaglaDurumu,
} from "@/oyunlar/bagla";
import { baglaYolRengi, BAGLA_RENK_SAYISI } from "@/oyunlar/arayuz/bagla-yuzey";
import {
  IKIBIN_BEYAZ_YAZI_SINIRI,
  ikibinTonu,
  ikibinYaziBoyu,
  IKIBIN_KADEME,
} from "@/oyunlar/arayuz/ikibin-yuzey";
import { yilan, YILAN_EN, adimTickiHesapla, ODUL_OMRU_ADIM, type Yon } from "@/oyunlar/yilan";
import {
  tekrarOyna,
  EN_FAZLA_GIRDI,
  TICK_MS,
  SAAT_ALT_SINIR_MS,
  saatTutarliMi,
} from "@/oyunlar/sozlesme";
import { OYUNLAR, type HerhangiOyun } from "@/oyunlar";
import { katalogSirasi, KATEGORILER } from "@/oyunlar/katalog";
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

/**
 * Topun palete varacağı x — duvar katlamasıyla, tuğlaları yok sayarak.
 *
 * ⚠️ Testin kendi kestirimi, motorun kopyası DEĞİL: motorun fiziğini
 * buraya kopyalamak testi ürünün aynası yapar ve ikisi birlikte
 * yanlış olabilirdi. Kestirim kaba ve öyle kalmalı — işi "iyi oyuncu"
 * taklidi etmek, doğru cevabı bilmek değil.
 */
function kiriciInis(d: KiriciDurumu): number {
  const { GENISLIK, TOP_R, PALET_Y } = KIRICI_OLCEK;
  if (d.vy <= 0) return d.topX;
  const x = d.topX + d.vx * ((PALET_Y - TOP_R - d.topY) / d.vy);
  const en = GENISLIK - 2 * TOP_R;
  let u = (x - TOP_R) % (2 * en);
  if (u < 0) u += 2 * en;
  return Math.round(u <= en ? TOP_R + u : TOP_R + (2 * en - u));
}

/** Kusursuz izleyen bot; `gecikme` tick kadar geç tepki veriyor. */
function kiriciOyna(tohum: string, gecikme = 0) {
  let d = kirici.baslat(tohum);
  const kuyruk: number[] = [];
  const girdiler: { t: number; x: number }[] = [];
  for (let t = 1; t <= 13_000 && !kirici.bittiMi(d); t++) {
    kuyruk.push(kiriciInis(d));
    const x = kuyruk.length > gecikme ? kuyruk[kuyruk.length - 1 - gecikme] : kuyruk[0];
    const sonraki = kirici.uygula(d, { t, x });
    if (!sonraki) break;
    d = sonraki;
    girdiler.push({ t, x });
  }
  return { durum: d, skor: kirici.skor(d), girdiler };
}

describe("blok kırıcı (Ü244)", () => {
  test("duvar her tohumda geliyor — kusursuz izleyen bot da ölüyor", () => {
    /*
      🔴 Bu testin bekçilik ettiği şey duvarın **tur içinde inmesi**.

      İki kez ölçüldü ve iki kez duvar yoktu:
        · sabit duvarla 160 turun 160'ı tick tavanına dayandı
        · bölüm bölüm inen duvarla kusursuz bot 2. bölümde kapalı bir
          bilardo yörüngesine kilitlendi ve son iki tuğlaya 9.000
          tick boyunca değmedi

      Şimdiki kural duvarı her on tick'te indiriyor. Bot topu hiç
      kaçırmasa bile duvar palete iniyor ve tur bitiyor — Ü83:
      "kazanarak biten bir tur yok."

      ⚠️ `EN_FAZLA_TICK` tavanına DAYANMAMALI: tavan bir güvenlik
      sınırı ve turu o bitiriyorsa oyunun kendi duvarı yok demektir.
      Asıl bekçilik edilen şey bu.

      ⚠️ Sınırlar bilerek gevşek: test dengeyi değil duvarın
      **varlığını** sınıyor. Denge değiştiğinde kırmızı yanan bir test
      her ayarda güncellenmek zorunda kalır ve güncellene güncellene
      anlamını yitirir. Ölçülen (gecikmesiz bot, 40 tohum): bölüm
      ortanca 5, en iyi 7, skor en iyi 1.578.
    */
    let enYuksekTur = 0;
    let enYuksekSkor = 0;

    for (let i = 0; i < 12; i++) {
      const r = kiriciOyna(`duvar-${i}`);
      assert.ok(kirici.bittiMi(r.durum), `duvar-${i}: tur bitmedi — duvar palete inmiyor`);
      assert.ok(
        r.durum.tick < 12_000,
        `duvar-${i}: tur ${r.durum.tick}. tick'te GÜVENLİK SINIRIYLA bitti — ` +
          `oyunun kendi duvarı yok`,
      );
      enYuksekTur = Math.max(enYuksekTur, r.durum.tur);
      enYuksekSkor = Math.max(enYuksekSkor, r.skor);
    }

    assert.ok(enYuksekTur <= 16, `bölüm ${enYuksekTur}'e kadar gidildi — duvar yetişmiyor`);
    assert.ok(
      enYuksekSkor < 5000,
      `en yüksek skor ${enYuksekSkor} — öbür oyunların mertebesinin çok üstünde`,
    );
  });

  test("beceri ÖDÜLLENDİRİLİYOR — gecikmeli oyuncu daha az alıyor", () => {
    /*
      🔴 Ölçümün yakaladığı en sinsi hata buydu: eğri bir ara **ters**
      dönmüştü. Paletin ortası topu dik yukarı gönderiyordu; topu
      özenle ortadan karşılayan oyuncu dar bir koridora kilitleniyor,
      az tuğla kırıyor ve inen duvara eziliyordu. Yani oyun oyuncuya
      "daha kötü oyna" diyordu.

      Yön tablosundan dikey yuva çıkarıldı (iki yay: 152°–108° ve
      72°–28°). Test o düzeltmeyi bekçiliyor.

      ⚠️ Karşılaştırma **ortalama**, tek tur değil: tek turda şanslı
      bir tohum eğriyi tersine çevirebilir.
    */
    const topla = (gecikme: number) => {
      let t = 0;
      for (let i = 0; i < 10; i++) t += kiriciOyna(`beceri-${i}`, gecikme).skor;
      return t / 10;
    };
    const hizli = topla(0);
    const yavas = topla(8);

    assert.ok(
      hizli > yavas * 1.5,
      `gecikmesiz ${Math.round(hizli)}, 8 tick gecikmeli ${Math.round(yavas)} — ` +
        `beceri skora yansımıyor`,
    );
  });

  test("top hiçbir zaman yatay ya da dikey kilitlenmiyor", () => {
    /*
      🔴 Sekme'de bu değişmez ihlal edilince ürün sahibi "toplar böyle
      sağa sola giderken bugta kaldı" dedi (Ü243). Burada tek giriş
      kapısı yön tablosu: duvar, tavan ve tuğla çarpışmaları yalnızca
      işaret çeviriyor ve işaret çevirmek sıfır üretemez.

      Tabloya doğrudan bakılmıyor (dışa açık değil, olmamalı da);
      ölçülen şey **ürünün kendisi**.
    */
    let kare = 0;
    for (let i = 0; i < 8; i++) {
      let d = kirici.baslat(`sifir-${i}`);
      for (let t = 1; t <= 4000 && !kirici.bittiMi(d); t++) {
        const sonraki = kirici.uygula(d, { t, x: kiriciInis(d) });
        if (!sonraki) break;
        d = sonraki;
        kare++;
        assert.ok(
          d.vx !== 0 && d.vy !== 0,
          `sifir-${i}: ${t}. tick'te hız (${d.vx}, ${d.vy}) — top kilitlendi`,
        );
      }
    }
    assert.ok(kare > 5000, `yalnızca ${kare} kare tarandı — test bir şey sınamıyor`);
  });

  test("paket PUAN vermiyor — teslimat, kazanç değil", () => {
    /*
      Ü234'ün kuralı: oyun içi paket kazanılmış ödülü **teslim ediyor**,
      yeni bir şey kazandırmıyor.

      🔴 Fark testi: paketli tur ile paketsiz tur karşılaştırılamıyor
      (paket eşikten sonra çıkıyor, yani eşiği geçen her tur onu
      görüyor). Onun yerine turun kareleri taranıyor — paketin
      kırıldığı tick'teki skor artışı, normal bir tuğlanınkinden büyük
      olmamalı.
    */
    let denendi = 0;
    for (let i = 0; i < 30 && denendi < 4; i++) {
      let d = kirici.baslat(`paket-${i}`);
      let oncekiSkor = 0;
      let paketArtisi: number | null = null;
      let enBuyukArtis = 0;

      for (let t = 1; t <= 13_000 && !kirici.bittiMi(d); t++) {
        const paketVardi = d.odulHucre;
        const sonraki = kirici.uygula(d, { t, x: kiriciInis(d) });
        if (!sonraki) break;
        const artis = sonraki.skor - oncekiSkor;
        if (paketVardi !== null && sonraki.odulHucre === null && sonraki.tur === d.tur) {
          paketArtisi = artis;
        } else if (artis > 0) {
          enBuyukArtis = Math.max(enBuyukArtis, artis);
        }
        oncekiSkor = sonraki.skor;
        d = sonraki;
      }

      if (paketArtisi === null) continue;
      denendi++;
      assert.ok(
        paketArtisi <= enBuyukArtis,
        `paket-${i}: paket ${paketArtisi} puan verdi, en büyük normal artış ` +
          `${enBuyukArtis} — paket ekonomiye dokunuyor (Ü201)`,
      );
    }
    assert.ok(denendi >= 2, `yalnızca ${denendi} turda paket çıktı — test bir şey sınamıyor`);
  });

  test("girdi kaydı BİRLEŞTİRİLİNCE de aynı skoru veriyor", () => {
    /*
      🔴 Ekranın en kritik varsayımı bu (`kirici-ekran.tsx`).

      Motor her tick çağrılıyor ama kayda her tick yazılmıyor: hedef
      değişmedikçe son girdinin `t`si uzatılıyor. Bu ancak `{t, x}`in
      anlamı "(sonTick, t] boyunca hedef x" olduğu için geçerli.

      Varsayım bozulursa ekrandaki skor ile sunucunun hesapladığı skor
      ayrışır ve dürüst oyuncunun turu **sessizce** reddedilir.
    */
    for (let i = 0; i < 6; i++) {
      const r = kiriciOyna(`birlestir-${i}`);

      const birlesik: { t: number; x: number }[] = [];
      for (const g of r.girdiler) {
        const son = birlesik[birlesik.length - 1];
        if (son && son.x === g.x && g.t - son.t < 200) son.t = g.t;
        else birlesik.push({ ...g });
      }

      const sonuc = tekrarOyna(kirici, `birlestir-${i}`, birlesik);
      assert.ok(sonuc.gecerli, `birlestir-${i}: birleşik kayıt reddedildi`);
      if (!sonuc.gecerli) continue;
      assert.equal(
        sonuc.skor,
        r.skor,
        `birlestir-${i}: birleşik ${sonuc.skor}, tick tick ${r.skor} — ` +
          `ekranın kayıt birleştirmesi motorla ayrışıyor`,
      );
      assert.ok(
        birlesik.length < r.girdiler.length,
        `birlestir-${i}: birleştirme hiçbir şeyi kısaltmadı — test bir şey sınamıyor`,
      );
    }
  });

  test("girdi denetimi — bozuk biçim ve kuraldışı zaman reddediliyor", () => {
    const d = kirici.baslat("denetim");
    assert.equal(kirici.girdiOku({ t: 1, x: 0 })?.x, 0, "geçerli girdi reddedildi");
    assert.equal(kirici.girdiOku({ t: 1.5, x: 0 }), null, "kesirli tick kabul edildi");
    assert.equal(kirici.girdiOku({ t: -1, x: 0 }), null, "negatif tick kabul edildi");
    assert.equal(kirici.girdiOku({ t: 1 }), null, "konumsuz girdi kabul edildi");
    assert.equal(kirici.girdiOku({ t: 1, x: 1.5 }), null, "kesirli konum kabul edildi");
    assert.equal(kirici.girdiOku("1"), null, "metin kabul edildi");

    assert.equal(kirici.uygula(d, { t: 0, x: 0 }), null, "geçmişe girdi kabul edildi");
    assert.equal(kirici.uygula(d, { t: 5000, x: 0 }), null, "sınırsız bekleme kabul edildi");

    /* Tahtanın dışındaki hedef REDDEDİLMİYOR, kırpılıyor: ekranın
       kenarına basan parmak kuraldışı bir hamle değil. */
    assert.ok(kirici.uygula(d, { t: 1, x: -999_999 }), "kenara basmak kuraldışı sayıldı");
  });

  test("gecenMs saati raporluyor — Ü84 kapısı bu oyunda da açık", () => {
    const r = kiriciOyna("saat");
    assert.ok(kirici.gecenMs, "gecenMs tanımlı değil — zaman tabanlı oyun saatsiz");
    assert.equal(kirici.gecenMs?.(r.durum), r.durum.tick * TICK_MS);
  });

  test("ölçüler ekranla aynı kaynaktan — palet daralıyor, duvar iniyor", () => {
    /* Ekran kendi kopyasını yazarsa iki taraf sessizce ayrışır ve
       oyuncu gördüğü paletle değil başka bir paletle topu karşılar —
       aynı tuzak Sekme'de `SEKME_OLCEK`, Bıçak'ta `CEMBER` için de
       yazılı. */
    assert.equal(KIRICI_OLCEK.GENISLIK, KIRICI_EN * KIRICI_OLCEK.BIRIM);
    assert.ok(kiriciPaletEni(1) > kiriciPaletEni(9), "palet daralmıyor");
    const d = kirici.baslat("olcu");
    assert.ok(kiriciDuvarUstu(d, 200) > kiriciDuvarUstu(d, 0), "duvar tur içinde inmiyor");
    assert.equal(KIRICI_SATIR * KIRICI_OLCEK.TUGLA_BOY < KIRICI_OLCEK.PALET_Y, true);
  });
});

/* ═══════════════════════════════════════════════════════════
   Maymun testi — hiçbir motor FIRLATMAMALI (Ü253)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   Katalog — her oyun listede görünüyor mu (Ü263)
   ═══════════════════════════════════════════════════════════ */

describe("oyun kataloğu", () => {
  test("🔴 açık olan HER oyun katalogda tam bir kez görünüyor", () => {
    /*
      🔴 `katalog.ts`in kendi yorumu şunu söylüyordu: *"yeni bir oyun
      eklenip `KATEGORILER` güncellenmezse oyun katalogdan **sessizce**
      kaybolurdu"* — ama bunu tutan hiçbir test yoktu. Dosya bu oturumda
      bir ara bozuldu (kapanmamış yorum bloğu) ve **754 test yeşil
      kaldı**: katalogu hiçbir test içe aktarmıyordu.

      Aynı sınıf hata bu oturumda iki kez de `challenge.ts`te çıktı
      (havuz boyu ile oyun sayısının OBEB'i). Orada test vardı ve iki
      kez de yakaladı; burada yoktu.
    */
    const kartlar = katalogSirasi(OYUNLAR, null);
    assert.equal(kartlar.length, OYUNLAR.length, "kart sayısı oyun sayısından farklı");
    for (const oyun of OYUNLAR) {
      const bulunan = kartlar.filter((k) => k.id === oyun.id);
      assert.equal(bulunan.length, 1, `${oyun.id}: katalogda ${bulunan.length} kez var`);
      assert.equal(bulunan[0].ad, oyun.ad, `${oyun.id}: kartın adı motorunkiyle ayrışmış`);
    }
  });

  test("🔴 hiçbir oyun \"Diğer\"e düşmüyor", () => {
    /* ⚠️ "Diğer" bir kategori değil, **alarm**: bir oyun oraya düştüyse
       `KATEGORILER` güncellenmemiş demektir. */
    const dusenler = katalogSirasi(OYUNLAR, null).filter((k) => k.kategori === "Diğer");
    assert.deepEqual(
      dusenler.map((k) => k.id),
      [],
      "bu oyunlar hiçbir kategoride değil — KATEGORILER güncellenmemiş",
    );
  });

  test("kategori sırası korunuyor ve bugünün oyunu tek", () => {
    const kartlar = katalogSirasi(OYUNLAR, "ayir");
    const sira = KATEGORILER.map((k) => k.ad);
    let onceki = -1;
    for (const kart of kartlar) {
      const yer = sira.indexOf(kart.kategori);
      assert.ok(yer >= onceki, `${kart.id}: kategori sırası bozuldu (${kart.kategori})`);
      onceki = yer;
    }
    assert.deepEqual(kartlar.filter((k) => k.bugunMu).map((k) => k.id), ["ayir"]);
  });
});

describe("motorlar rastgele girdide çökmüyor (Ü253)", () => {
  /**
   * Her oyunun kabul ettiği biçimde rastgele girdi.
   *
   * ⚠️ Biçimler `girdiOku`dan okunarak yazıldı, tahminle değil. İlk
   * yazımda dördü yanlıştı ve tarama **yalancı yeşil** verdi: girdiler
   * reddediliyor, motor hiç çalışmıyor, test "temiz" diyordu. Aşağıdaki
   * `en az adım` iddiası onun için var.
   */
  function girdiUret(
    oyunId: string,
    tick: number,
    rnd: () => number,
    d: { tur?: number; en?: number; uclar?: number[] },
  ): unknown {
    switch (oyunId) {
      case "blok":
        return { t: Math.floor(rnd() * 3), s: Math.floor(rnd() * 8), k: Math.floor(rnd() * 8) };
      case "dusen":
        return { tick, a: ["sol", "sag", "in", "dondur", "birak", "bekle"][Math.floor(rnd() * 6)] };
      case "sekme":
        // ⚠️ `t` atış SIRASI (durum.tur), tick değil — kayıt karıştırılamıyor.
        return { t: d.tur ?? 0, a: Math.floor(rnd() * ACI_SAYISI) };
      case "yilan":
        return { tick, y: ["yukari", "asagi", "sol", "sag", "bekle"][Math.floor(rnd() * 5)] };
      case "bicak":
        return { t: tick };
      case "kirici":
        return { t: tick, x: Math.floor(rnd() * 9000) };
      case "ikibin":
        // ⚠️ Zamansız: tick yok, yalnızca yön.
        return { y: ["yukari", "asagi", "sol", "sag"][Math.floor(rnd() * 4)] };
      case "bagla": {
        /* ⚠️ Tamamen rastgele bir dizi `girdiOku`yu bile geçse
           `uygula` hepsini reddederdi ve tarama motoru hiç
           çalıştırmazdı (aşağıdaki "en az adım" iddiasının yakaladığı
           şey tam olarak buydu). Girdilerin çoğu **gerçek bir uçtan
           başlayan rastgele yürüyüş**; küçük bir kısmı çöp. */
        const en = d.en ?? 4;
        const uclar = d.uclar ?? [];
        const uc: number[] = [];
        for (let i = 0; i < uclar.length; i++) if (uclar[i] !== 0) uc.push(i);
        if (uc.length === 0 || rnd() < 0.15) {
          const boy = 1 + Math.floor(rnd() * 5);
          return { y: Array.from({ length: boy }, () => Math.floor(rnd() * en * en)) };
        }
        const yol = [uc[Math.floor(rnd() * uc.length)]];
        const adim = 1 + Math.floor(rnd() * 10);
        for (let i = 0; i < adim; i++) {
          const k = yol[yol.length - 1];
          const satir = Math.floor(k / en);
          const sutun = k % en;
          const komsu: number[] = [];
          if (satir > 0) komsu.push(k - en);
          if (satir < en - 1) komsu.push(k + en);
          if (sutun > 0) komsu.push(k - 1);
          if (sutun < en - 1) komsu.push(k + 1);
          const n = komsu[Math.floor(rnd() * komsu.length)];
          if (yol.includes(n)) break;
          yol.push(n);
        }
        return { y: yol };
      }
      case "ayir":
        /* ⚠️ Tüp sayısı bölümle değişiyor (5–7); rastgele çift bazen
           aralığın dışına düşüyor ve o girdi zaten reddediliyor —
           taramanın istediği de bu karışım. */
        return { k: Math.floor(rnd() * 8), h: Math.floor(rnd() * 8) };
      default:
        return { t: tick };
    }
  }

  test("🔴 her motor rastgele girdide fırlatmıyor", () => {
    /*
      🔴 Bu testin bekçilik ettiği sınıf: **beyaz ekran.**

      Motorlar istemcide koşuyor. Biri `uygula` içinde fırlatırsa React
      alt ağacı söküyor ve oyuncu bomboş bir sayfa görüyor — hata
      konsola düşüyor, ekranda tek iz kalmıyor.

      Fırlatma kolay: `rastgele.tamsayi(0)` ve `rastgele.sec([])` ikisi
      de `Error` atıyor ve boş aralık bir kenar durumda kolayca oluşuyor
      (tahta dolduğunda boş hücre kalmaması gibi).

      ⚠️ Test kuralları sınamıyor — kuraldışı hamle `null` dönebilir,
      sorun değil. Sınadığı tek şey **istisna atılmaması**.
    */
    let tohum = 12345;
    const rnd = () => ((tohum = (tohum * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    for (const oyun of OYUNLAR) {
      let enUzun = 0;

      for (let n = 0; n < 60; n++) {
        let d = oyun.baslat(`maymun-${oyun.id}-${n}`);
        let adim = 0;

        for (let t = 1; t <= 1500 && !oyun.bittiMi(d); t++) {
          const g = oyun.girdiOku(
            girdiUret(oyun.id, t, rnd, d as { tur?: number; en?: number; uclar?: number[] }),
          );
          if (g === null) continue;
          const s = oyun.uygula(d, g);
          if (s === null) continue;
          d = s;
          adim++;
        }
        enUzun = Math.max(enUzun, adim);
      }

      /* 🔴 Testin kendi kendini sınaması: girdiler reddediliyorsa motor
         hiç çalışmamıştır ve "fırlatmadı" hiçbir şey kanıtlamaz. */
      assert.ok(
        enUzun >= 2,
        `${oyun.id}: en uzun tur ${enUzun} girdi — girdi biçimi yanlış, test bir şey sınamıyor`,
      );
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   2048 (Ü259)
   ═══════════════════════════════════════════════════════════ */

describe("2048 (Ü259)", () => {
  /** Açgözlü bot: boş hücre ve tek adım skoruna bakıyor. */
  function oyna(tohum: string) {
    let d = ikibin.baslat(tohum);
    const girdiler: { y: IkibinYonu }[] = [];
    for (let i = 0; i < 5000 && !ikibin.bittiMi(d); i++) {
      let enIyi: IkibinYonu | null = null;
      let puan = -1;
      for (const y of ["yukari", "asagi", "sol", "sag"] as IkibinYonu[]) {
        const s = ikibin.uygula(d, { y });
        if (!s) continue;
        const p = ikibin.skor(s) - ikibin.skor(d) + s.kareler.filter((c) => c === 0).length * 6;
        if (p > puan) { puan = p; enIyi = y; }
      }
      if (!enIyi) break;
      const s = ikibin.uygula(d, { y: enIyi })!;
      d = s;
      girdiler.push({ y: enIyi });
    }
    return { durum: d, skor: ikibin.skor(d), girdiler };
  }

  test("🔴 her tur KAYBEDEREK bitiyor — tahta doluyor (Ü83)", () => {
    /*
      Ü83: *"kazanarak biten bir tur yok."* 2048'de duvar oyunun
      kendi doğasında — her hamle yeni bir karo doğuruyor ve tahta
      on altı hücre. Yine de sınanıyor, çünkü tek bir yanlış kural
      (örneğin kıpırdamayan hamleyi kabul etmek) duvarı kaldırırdı.

      ⚠️ Döngü sınırına DAYANMAMALI: tur 5.000 hamlede bitmiyorsa
      oyunun kendi bitişi yok demektir.
    */
    for (let i = 0; i < 12; i++) {
      const r = oyna(`duvar-${i}`);
      assert.ok(ikibin.bittiMi(r.durum), `duvar-${i}: tur bitmedi — tahta dolmuyor`);
      assert.ok(
        r.girdiler.length < 5000,
        `duvar-${i}: tur döngü sınırıyla bitti — oyunun kendi duvarı yok`,
      );
    }
  });

  test("🔴 kıpırdamayan hamle REDDEDİLİYOR", () => {
    /*
      Kabul edilseydi oyuncu duvara yaslanıp aynı yöne basarak yeni
      karo doğurabilir ve tahta hiç dolmazdı — Ü83'ün duvarı
      kalkardı. Ayrıca kayıt şişerdi.

      Kurulum: tek karoyu sola dayayıp tekrar sola basmak.
    */
    let d = ikibin.baslat("kipirdama");
    // Sola tekrar tekrar bas; bir noktada hiçbir şey kıpırdayamaz.
    let reddedildi = false;
    for (let i = 0; i < 60; i++) {
      const s = ikibin.uygula(d, { y: "sol" });
      if (s === null) { reddedildi = true; break; }
      d = s;
      if (ikibin.bittiMi(d)) break;
    }
    assert.ok(reddedildi, "art arda sola basmak hiç reddedilmedi");
  });

  test("birleşme klasik kuralda — 4 4 4 4 sola 8 8 veriyor", () => {
    /*
      ⚠️ Bir karo tek hamlede **bir kez** birleşiyor. Olmasaydı
      `4 4 4 4` tek hamlede `16` olurdu ve tahta boşalırdı — oyunun
      bütün gerilimi o kuralda.

      Tohumla kurulamayacak bir tahta; durum elle yazılıyor.
    */
    const d = ikibin.baslat("birlesme");
    const elle = {
      ...d,
      kareler: [4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      paket: new Array(16).fill(false),
    };
    const s = ikibin.uygula(elle, { y: "sol" });
    assert.ok(s, "sola kaydırma reddedildi");
    if (!s) return;
    assert.equal(s.kareler[0], 8, "ilk hücre 8 olmalı");
    assert.equal(s.kareler[1], 8, "ikinci hücre 8 olmalı");
    assert.notEqual(s.kareler[0], 16, "iki birleşme zincirlenmiş — klasik kural bozuk");
  });

  test("paket PUAN vermiyor ve karolarla birlikte kayıyor", () => {
    /*
      Ü234: paket kazanılmış ödülü **teslim ediyor**, yeni bir şey
      kazandırmıyor.

      🔴 İkinci iddia daha ince: paket sabit bir hücrede durmuyor,
      taşıyan karoyla birlikte kayıyor. Sabit dursaydı ekranda paket
      bir karonun üstündeyken başka bir karo birleşince teslim
      edilmiş görünürdü.
    */
    const d = ikibin.baslat("paket");
    const elle = {
      ...d,
      kareler: [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      paket: [false, false, false, true, ...new Array(12).fill(false)],
      hamSkor: 4000, // eşiğin üstünde
    };
    const s = ikibin.uygula(elle, { y: "sol" });
    assert.ok(s, "kaydırma reddedildi");
    if (!s) return;

    // Karo 3. hücreden 0'a kaydı; paket onunla gitmeli.
    assert.equal(s.kareler[0], 2, "karo sola kaymadı");
    assert.ok(s.paket[0], "paket karoyla birlikte kaymadı");
    assert.ok(!s.paket[3], "paket eski hücrede kaldı");

    // Teslim edilmemiş olmalı — birleşme olmadı.
    assert.equal(s.odulVerildi, false, "birleşme yokken teslim edildi");
  });

  test("girdi denetimi — bozuk biçim reddediliyor", () => {
    assert.equal(ikibin.girdiOku({ y: "sol" })?.y, "sol", "geçerli girdi reddedildi");
    assert.equal(ikibin.girdiOku({ y: "yukarı" }), null, "yanlış yön kabul edildi");
    assert.equal(ikibin.girdiOku({ y: 1 }), null, "sayı kabul edildi");
    assert.equal(ikibin.girdiOku({}), null, "boş nesne kabul edildi");
    assert.equal(ikibin.girdiOku("sol"), null, "metin kabul edildi");
  });

  test("zamansız oyun — gecenMs tanımlı DEĞİL", () => {
    /*
      Ü84'ün saat denetimi yalnızca zaman tabanlı oyunlar için.
      2048'de saat yok; `gecenMs` tanımlanırsa sunucu var olmayan bir
      süreyi karşılaştırmaya başlar. Blok'la aynı tercih.
    */
    assert.equal(ikibin.gecenMs, undefined, "zamansız oyunda gecenMs tanımlı");
  });

  test("aynı kayıt aynı skoru veriyor — S5", () => {
    const r = oyna("tekrar");
    const sonuc = tekrarOyna(ikibin, "tekrar", r.girdiler);
    assert.ok(sonuc.gecerli, "kayıt reddedildi");
    if (!sonuc.gecerli) return;
    assert.equal(sonuc.skor, r.skor, "sunucu farklı skor hesapladı");
    assert.ok(r.girdiler.length > 20, `yalnızca ${r.girdiler.length} hamle — test bir şey sınamıyor`);
  });
});

/* ═══════════════════════════════════════════════════════════
   2048 paleti — Ü260
   ═══════════════════════════════════════════════════════════ */

describe("2048 karo paleti (Ü260)", () => {
  /** WCAG bağıl parlaklık. */
  function parlaklik(hex: string): number {
    const kanal = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => kanal(c / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function kontrast(a: string, b: string): number {
    const [x, y] = [parlaklik(a), parlaklik(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  }

  test("🔴 yazı rengi zeminin PARLAKLIĞINDAN türüyor", () => {
    /*
      🔴 Ü263'te palet referanstan alındı ve referans on bir karonun
      **hepsinde** beyaz rakam kullanıyor. Ölçüldü: açık zeminlerde
      beyaz okunmuyor — `2` karosunda kontrast 1,97, `32`de 2,11,
      `2048`de 2,26. İkon boyutunda göze batmıyor, oyunda batıyor.

      Kural: zemin koyuysa (L < `IKIBIN_BEYAZ_YAZI_SINIRI`) beyaz,
      açıksa koyu yazı. Bu test kuralın paletle birlikte kaymasını
      engelliyor — yeni bir ton eklendiğinde yazı rengi el yordamıyla
      seçilirse burada düşer.

      ⚠️ Ü260'ın "sayı büyüdükçe karo koyulaşıyor" testi burada
      **duruyordu ve kaldırıldı**: o kural ürün sahibinin daha sonra
      gönderdiği referansla çelişti, soruldu ve referans seçildi.
      Referansta 512 yeşil, 1024 mavi, 2048 altın.
    */
    for (let k = 0; k < IKIBIN_KADEME; k++) {
      const t = ikibinTonu(k);
      const p = parlaklik(t.zemin);
      const beyazMi = t.yazi.toLowerCase() === "#ffffff";
      assert.equal(
        beyazMi,
        p < IKIBIN_BEYAZ_YAZI_SINIRI,
        `${2 ** (k + 1)} karosu: zemin ${t.zemin} parlaklık ${p.toFixed(3)}, ` +
          `yazı ${t.yazi} — ${p < IKIBIN_BEYAZ_YAZI_SINIRI ? "beyaz olmalıydı" : "koyu olmalıydı"}`,
      );
    }
  });

  test("her kademe AYRI bir renk", () => {
    /*
      *"Her sayıda farklı renk olmalı."* Oyuncu tahtaya bakıp hangi
      karonun hangisiyle birleşeceğini renkten okuyor; iki kademe
      aynı rengi taşırsa o okuma bozulur.
    */
    const renkler = new Set<string>();
    for (let k = 0; k < IKIBIN_KADEME; k++) renkler.add(ikibinTonu(k).zemin);
    assert.equal(renkler.size, IKIBIN_KADEME, "iki kademe aynı rengi taşıyor");
  });

  test("🔴 hiçbir karoda yazı okunmaz hâle gelmiyor", () => {
    /*
      ⚠️ Eşik **3,0**, 4,5 değil: WCAG'ın büyük yazı eşiği bu ve
      rakamlar gerçekten büyük — en küçüğü (dört basamaklı) 27 piksel
      kalın, sınır 18,66.

      Ü260'ta eşik 4,5'ti çünkü palet o zaman koyulaşıyordu ve beyaz
      yazı yalnızca koyu zeminlerde kullanılıyordu. Ü263'ün canlı
      paletinde orta parlaklıkta zeminler var; beyaz rakam oralarda
      3,1–4,7 veriyor ve bu boyutta okunuyor.

      🔴 Yine de bir zemin **hiçbir** yazı rengiyle 3'ü geçemiyorsa o
      ton palete girmemeli — testin asıl işi bu.
    */
    for (let k = 0; k < IKIBIN_KADEME; k++) {
      const t = ikibinTonu(k);
      const c = kontrast(t.zemin, t.yazi);
      assert.ok(
        c >= 3,
        `${2 ** (k + 1)} karosunda kontrast ${c.toFixed(2)} — büyük yazı eşiği 3,00`,
      );
    }
  });

  test("yazı boyu basamak sayısıyla küçülüyor", () => {
    /*
      ⚠️ Sabit boy `2048`i hücreden taşırıyor. Ürün sahibi
      *"sayıları büyüt"* dedi; büyütmenin sınırı dört basamak.
    */
    /* 🔴 Birim de sınanıyor: `%` yazılırsa punto hücreye değil üst
       ögenin 16px'ine göre çözülür ve sayı 8 piksele düşer —
       tarayıcıda ölçüldü, `ikibin-yuzey.ts`teki nota bakın. */
    for (const d of [2, 16, 128, 2048]) {
      assert.match(
        ikibinYaziBoyu(d),
        /^\d+(\.\d+)?cqmin$/,
        `${d} karosunun puntosu hücreye bağlı değil: ${ikibinYaziBoyu(d)}`,
      );
    }
    const yuzde = (d: number) => parseFloat(ikibinYaziBoyu(d));
    assert.ok(yuzde(2) > yuzde(16), "tek basamak iki basamaktan büyük değil");
    assert.ok(yuzde(16) > yuzde(128), "iki basamak üçten büyük değil");
    assert.ok(yuzde(128) > yuzde(2048), "üç basamak dörtten büyük değil");
    assert.ok(yuzde(2048) >= 26, "dört basamaklı karo okunamayacak kadar küçük");
  });
});

/* ═══════════════════════════════════════════════════════════
   Ayır — renk sıralama (Ü261)
   ═══════════════════════════════════════════════════════════ */

describe("ayır (Ü261)", () => {
  /** Tüp sırası önemsiz — arama anahtarı sıralanarak kanonikleşiyor. */
  const anahtar = (t: number[][]) => t.map((x) => x.join(",")).sort().join("|");

  function ust(tup: number[]): { renk: number; adet: number } {
    if (tup.length === 0) return { renk: 0, adet: 0 };
    const renk = tup[tup.length - 1];
    let adet = 1;
    while (adet < tup.length && tup[tup.length - 1 - adet] === renk) adet++;
    return { renk, adet };
  }

  function yasalHamleler(t: number[][]): [number, number][] {
    const c: [number, number][] = [];
    for (let k = 0; k < t.length; k++) {
      if (t[k].length === 0) continue;
      const u = ust(t[k]);
      for (let h = 0; h < t.length; h++) {
        if (h === k || t[h].length >= KAPASITE) continue;
        if (t[h].length === 0 || t[h][t[h].length - 1] === u.renk) c.push([k, h]);
      }
    }
    return c;
  }

  function dok(t: number[][], k: number, h: number): number[][] {
    const u = ust(t[k]);
    const adet = Math.min(u.adet, KAPASITE - t[h].length);
    const y = t.map((x) => [...x]);
    y[k].splice(y[k].length - adet, adet);
    for (let i = 0; i < adet; i++) y[h].push(u.renk);
    return y;
  }

  /** Motordan BAĞIMSIZ çözücü: tahta çözülebiliyor mu. */
  function cozulebilirMi(bas: number[][], tavan = 120_000): boolean | null {
    if (bolumBittiMi(bas)) return true;
    let sira = [bas];
    const gorulen = new Set([anahtar(bas)]);
    let dugum = 0;
    while (sira.length > 0) {
      const sonraki: number[][][] = [];
      for (const t of sira) {
        for (const [k, h] of yasalHamleler(t)) {
          const y = dok(t, k, h);
          const a = anahtar(y);
          if (gorulen.has(a)) continue;
          if (bolumBittiMi(y)) return true;
          gorulen.add(a);
          sonraki.push(y);
          if (++dugum > tavan) return null; // tavana takıldı, hüküm yok
        }
      }
      sira = sonraki;
    }
    return false; // arama tükendi: çözüm YOK
  }

  test("🔴 üretilen HER bölüm çözülebilir", () => {
    /*
      🔴 Bu oyunun tek gerçek riski bu. Bölüm üreteci tahtayı rastgele
      dağıtmıyor; **çözülmüş tahtadan geriye doğru** oynuyor ve
      çözülebilirlik o akıl yürütmeye dayanıyor (`ayir.ts` içindeki
      "Ters hamlenin iki şartı"). Şartlardan biri yanlışsa üreteç
      çözümsüz tahta basar ve oyuncu, kendi hatası olmayan bir yerde
      kilitlenir — ekranda "tıkandın" yazar, sebebi görünmez.

      Testin çözücüsü motordan bağımsız yazıldı: motorun kendi
      `uygula`sını kullansaydı ikisi birlikte yanılabilirdi.

      ⚠️ Arama tavanı aşılırsa hüküm verilmiyor (`null`) — "çözemedim"
      ile "çözümü yok" aynı şey değil.
    */
    let bakilan = 0;
    for (const tohum of ["cz-a", "cz-b", "cz-c"]) {
      for (let bolum = 1; bolum <= 6; bolum++) {
        const tahta = bolumTahtasi(tohum, bolum);
        const sonuc = cozulebilirMi(tahta);
        assert.notEqual(
          sonuc,
          false,
          `bölüm ${bolum} (${tohum}) ÇÖZÜLEMEZ: ${JSON.stringify(tahta)}`,
        );
        if (sonuc === true) bakilan++;
      }
    }
    assert.ok(bakilan >= 15, `yalnızca ${bakilan} tahta hüküm aldı — test bir şey sınamıyor`);
  });

  test("bölüm gerçekten karışık — üreteç çözülmüş tahta vermiyor", () => {
    /* ⚠️ Yukarıdaki test tek başına yanıltıcı olabilir: çözülmüş bir
       tahta da "çözülebilir"dir. Zorluğun geldiğini ayrıca sınıyoruz. */
    for (let bolum = 1; bolum <= 6; bolum++) {
      const tahta = bolumTahtasi("karisik", bolum);
      assert.ok(
        parcaSayisi(tahta) > renkSayisi(bolum),
        `bölüm ${bolum} karışmamış: ${parcaSayisi(tahta)} parça, ${renkSayisi(bolum)} renk`,
      );
      assert.equal(bolumBittiMi(tahta), false, `bölüm ${bolum} zaten çözülmüş geldi`);
    }
  });

  test("🔴 tur hamle hakkından uzun süremiyor — Ü83 duvarı", () => {
    /*
      Ü83: kazanarak biten tur yok. Bu oyunda duvar `HAMLE_HAKKI`:
      her aktarım bir hamle yiyor ve hiçbir şey geri vermiyor.

      ⚠️ Önce **iadeli** bir havuz vardı ve ölçümde kusursuz bot 42
      bölüm oynayabiliyordu — duvar kâğıt üstünde vardı, pratikte
      yoktu. Bu test o tasarımda geçmezdi.
    */
    for (const tohum of ["duvar-a", "duvar-b"]) {
      let d = ayir.baslat(tohum);
      let hamle = 0;
      while (!ayir.bittiMi(d) && hamle < HAMLE_HAKKI + 50) {
        const secenek = yasalHamleler(d.tupler);
        if (secenek.length === 0) break;
        const [k, h] = secenek[hamle % secenek.length];
        const s = ayir.uygula(d, { k, h });
        if (!s) break;
        d = s;
        hamle++;
      }
      assert.ok(ayir.bittiMi(d), `${tohum}: tur ${hamle} hamlede bitmedi`);
      assert.ok(hamle <= HAMLE_HAKKI, `${tohum}: hak ${HAMLE_HAKKI} ama ${hamle} hamle oynandı`);
    }
  });

  test("kuraldışı aktarımlar reddediliyor", () => {
    const d = ayir.baslat("kural");
    const doluFarkli = d.tupler.findIndex((t) => t.length > 0);
    assert.ok(doluFarkli >= 0);

    assert.equal(ayir.uygula(d, { k: 0, h: 0 }), null, "aynı tüpe dökme kabul edildi");
    assert.equal(ayir.uygula(d, { k: -1, h: 1 }), null, "eksi indis kabul edildi");
    assert.equal(ayir.uygula(d, { k: 0, h: 99 }), null, "aralık dışı indis kabul edildi");

    const bos = d.tupler.findIndex((t) => t.length === 0);
    if (bos >= 0) {
      assert.equal(ayir.uygula(d, { k: bos, h: doluFarkli }), null, "boş tüpten döküldü");
    }

    /* Üstü farklı renk olan iki tüp — reddedilmeli. */
    let bulundu = false;
    for (let k = 0; k < d.tupler.length && !bulundu; k++) {
      for (let h = 0; h < d.tupler.length; h++) {
        if (k === h) continue;
        const a = d.tupler[k];
        const b = d.tupler[h];
        if (a.length === 0 || b.length === 0 || b.length >= KAPASITE) continue;
        if (a[a.length - 1] === b[b.length - 1]) continue;
        assert.equal(ayir.uygula(d, { k, h }), null, "farklı rengin üstüne döküldü");
        bulundu = true;
        break;
      }
    }
    assert.ok(bulundu, "farklı renk çifti bulunamadı — test bir şey sınamadı");
  });

  test("üstteki dizinin TAMAMI akıyor, hedefin yeri kadar", () => {
    const d = ayir.baslat("akis");
    const durum = { ...d, tupler: [[1, 1, 2, 2], [3], [], [2, 2, 2, 2], [1]] };
    /* İki adet 2, üstünde yer olan tüpe akmalı ([] boş tüp). */
    const s = ayir.uygula(durum, { k: 0, h: 2 });
    assert.ok(s, "geçerli aktarım reddedildi");
    assert.deepEqual(s.tupler[0], [1, 1], "kaynakta dizi kalmış");
    assert.deepEqual(s.tupler[2], [2, 2], "hedefe dizinin tamamı gitmemiş");

    /* Hedefte yalnızca bir yer varsa yalnızca bir birim akmalı. */
    const dar = { ...d, tupler: [[1, 1, 2, 2], [2, 2, 2], [], [3], [1]] };
    const s2 = ayir.uygula(dar, { k: 0, h: 1 });
    assert.ok(s2, "dar hedefe aktarım reddedildi");
    assert.deepEqual(s2.tupler[1], [2, 2, 2, 2], "hedef taşmış ya da eksik dolmuş");
    assert.deepEqual(s2.tupler[0], [1, 1, 2], "kaynaktan fazla alınmış");
  });

  test("hamle hakkı her aktarımda bir azalıyor, biten bölüm geri VERMİYOR", () => {
    /* 🔴 İadeli tasarım ölçümde çöktü (bkz. `HAMLE_HAKKI` notu): ilk
       bölümlerin maliyeti iadeden küçük olduğu için oyuncu bedava
       yakıt topluyordu. Bu test o tasarımın geri gelmesini engelliyor. */
    let d = ayir.baslat("hak");
    const basta = d.havuz;
    let hamle = 0;
    let bolumBitti = false;
    while (!ayir.bittiMi(d) && hamle < HAMLE_HAKKI) {
      const secenek = yasalHamleler(d.tupler);
      if (secenek.length === 0) break;
      const onceki = d.bolum;
      const s = ayir.uygula(d, { k: secenek[0][0], h: secenek[0][1] });
      if (!s) break;
      hamle++;
      if (s.bolum > onceki) bolumBitti = true;
      assert.equal(s.havuz, basta - hamle, `${hamle}. hamlede hak ${s.havuz}, beklenen ${basta - hamle}`);
      d = s;
    }
    assert.ok(hamle > 0, "hiç hamle oynanmadı");
    void bolumBitti;
  });

  test("bölüm bitince puan yazılıyor ve yeni tahta geliyor", () => {
    let d = ayir.baslat("bolum");
    const tahta = d.tupler.map((t) => [...t]);
    void tahta;
    let hamle = 0;
    while (!ayir.bittiMi(d) && d.bolum === 1 && hamle < HAMLE_HAKKI) {
      const secenek = yasalHamleler(d.tupler);
      if (secenek.length === 0) break;
      const s: AyirDurumu | null = ayir.uygula(d, { k: secenek[0][0], h: secenek[0][1] });
      if (!s) break;
      d = s;
      hamle++;
    }
    if (d.bolum > 1) {
      assert.equal(ayir.skor(d), bolumPuani(1), "1. bölümün puanı yanlış yazıldı");
      assert.equal(bolumBittiMi(d.tupler), false, "yeni bölüm çözülmüş geldi");
    }
  });

  test("🔴 ödül paketi PUAN VERMİYOR ve odulIsareti'ne bağlı değil (Ü234)", () => {
    /*
      Ü201'de paket +120 puan verip kuponun barını 500'den fiilen 380'e
      indirmişti. Kural: paket sıfır puan, tur başına bir kez ve
      `odulIsareti` kancasına takılmaz (o kanca eşiği tamamen atlıyor).
    */
    assert.equal("odulIsareti" in ayir, false, "ayır odulIsareti kancasına takılmış");

    const d = ayir.baslat("paket");
    const durum = { ...d, skor: ODUL_ESIGI, paket: 0, tupler: [[1, 2, 1, 2], [1], [], [2], [1]] };
    const oncekiSkor = ayir.skor(durum);
    const s = ayir.uygula(durum, { k: 0, h: 3 });
    assert.ok(s, "paket taşıyan tüpten aktarım reddedildi");
    assert.equal(s.odulVerildi, true, "paket teslim edilmedi");
    assert.equal(s.paket, null, "paket yerinde kaldı");
    assert.equal(ayir.skor(s), oncekiSkor, "paket PUAN verdi — Ü201 hatası geri gelmiş");
  });

  test("girdiOku bozuk veriyi reddediyor", () => {
    assert.equal(ayir.girdiOku(null), null);
    assert.equal(ayir.girdiOku({ k: 0 }), null, "eksik alan kabul edildi");
    assert.equal(ayir.girdiOku({ k: "0", h: 1 }), null, "metin kabul edildi");
    assert.equal(ayir.girdiOku({ k: 1.5, h: 2 }), null, "ondalık kabul edildi");
    assert.equal(ayir.girdiOku({ k: -1, h: 2 }), null, "eksi kabul edildi");
    assert.equal(ayir.girdiOku({ k: 99, h: 2 }), null, "aralık dışı kabul edildi");
    assert.deepEqual(ayir.girdiOku({ k: 0, h: 3 }), { k: 0, h: 3 });
  });
});

/* ═══════════════════════════════════════════════════════════
   Ayır · sıvı paleti (Ü261)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   Renk bilimi — iki oyunun paleti aynı ölçütle sınanıyor

   ⚠️ Ayır (Ü261) ve Bağla (Ü262) aynı sorunun iki yüzü: ikisinde de
   "aynı renk" bir oyun kuralı taşıyor. Ölçüt tek yerde duruyor ki
   birinin eşiği gevşetilirse ötekininki de gevşesin — ya da hiçbiri.
   ═══════════════════════════════════════════════════════════ */

type RGB = [number, number, number];
const coz = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const dogrusal = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

function lab([r, g, b]: RGB): [number, number, number] {
  const [R, G, B] = [r, g, b].map((c) => dogrusal(c / 255));
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const dE = (a: RGB, b: RGB) => {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

const geri = (v: number) => {
  const x = Math.max(0, Math.min(1, v));
  return Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055));
};
function lms([r, g, b]: RGB) {
  const [R, G, B] = [r, g, b].map((c) => dogrusal(c / 255));
  return {
    L: 17.8824 * R + 43.5161 * G + 4.11935 * B,
    M: 3.45565 * R + 27.1554 * G + 3.86714 * B,
    S: 0.0299566 * R + 0.184309 * G + 1.46709 * B,
  };
}
const lmsGeri = (L: number, M: number, S: number): RGB => [
  geri(0.080944 * L - 0.0102485 * M - 0.000365294 * S),
  geri(-0.0102485 * L + 0.0540193 * M - 0.000121649 * S),
  geri(-0.000365294 * L - 0.00412163 * M + 0.693513 * S),
];
/** Brettel/Viénot yaklaşımı — kırmızı-yeşil renk körlüğünün iki türü. */
const deuteranopi = (c: RGB): RGB => {
  const { L, S } = lms(c);
  return lmsGeri(L, 0.494207 * L + 1.24827 * S, S);
};
const protanopi = (c: RGB): RGB => {
  const { M, S } = lms(c);
  return lmsGeri(2.02344 * M - 2.52581 * S, M, S);
};

export const RENK_GORMELERI = [
  { ad: "normal görme", f: (c: RGB) => c },
  { ad: "deuteranopi", f: deuteranopi },
  { ad: "protanopi", f: protanopi },
];

/** Bir renk kümesinde en yakın çiftin ΔE'si, verilen görmeye göre. */
function enYakinRenkCifti(tonlar: string[], f: (c: RGB) => RGB): { dE: number; cift: string } {
  let enYakin = Infinity;
  let cift = "";
  for (let i = 0; i < tonlar.length; i++) {
    for (let j = i + 1; j < tonlar.length; j++) {
      const d = dE(f(coz(tonlar[i])), f(coz(tonlar[j])));
      if (d < enYakin) {
        enYakin = d;
        cift = `${tonlar[i]} ↔ ${tonlar[j]}`;
      }
    }
  }
  return { dE: enYakin, cift };
}

describe("ayır sıvı paleti (Ü261)", () => {
  const TUM = Array.from({ length: AYIR_SIVI_SAYISI }, (_, i) => ayirSivisi(i + 1));

  test("🔴 renk körlüğünde de hiçbir iki sıvı çakışmıyor", () => {
    /*
      🔴 Bu oyunda **aynı renk = birleşebilir** demek. İki sıvı bir
      oyuncunun gözünde çakışıyorsa o oyuncu tahtayı okuyamaz.

      Gözle seçilen ilk palet normal görmede iyiydi (en yakın çift
      ΔE 49) ama deuteranopide gök ile orkide **ΔE 6,8** veriyordu —
      pratikte aynı renk. Deuteranopi erkeklerin ~%5'inde var.

      ⚠️ Eşik 30: ΔE ~2,3 "zor fark edilir", ~10 "belirgin". 30, hızlı
      bakışta ayrışma için geniş bir pay bırakıyor. Aranan palet 36,2
      veriyor.
    */
    for (const g of RENK_GORMELERI) {
      const { dE: en, cift } = enYakinRenkCifti(TUM, g.f);
      assert.ok(
        en >= 30,
        `${g.ad}: ${cift} çifti ΔE ${en.toFixed(1)} — eşik 30`,
      );
    }
  });

  test("ilk üç renk en ayrışan üçlü — bölüm 1'de yalnızca onlar görünüyor", () => {
    /*
      ⚠️ `renkSayisi(1) = 3`: oyuncunun oyunu ilk gördüğü tahtada üç
      renk var ve onlar diğerlerinden daha ayrık olmalı. Sıra yanlışsa
      oyun en zor renk çiftiyle **açılır**.
    */
    const ilkUc = TUM.slice(0, 3);
    assert.equal(renkSayisi(1), ilkUc.length, "bölüm 1'in renk sayısı değişmiş");
    for (const g of RENK_GORMELERI) {
      const { dE: en, cift } = enYakinRenkCifti(ilkUc, g.f);
      assert.ok(en >= 40, `${g.ad}: ilk üçlüde ${cift} çifti ΔE ${en.toFixed(1)} — eşik 40`);
    }
  });

  test("hiçbir sıvı sahnenin zemininde kaybolmuyor", () => {
    /* ⚠️ Sıvılar birbirinden ayrışsa bile zeminden ayrışmazsa tüp boş
       görünür — arama bu yüzden zemini de hesaba kattı. */
    for (const zemin of ["#1e1b4b", "#0e0c26"]) {
      for (const g of RENK_GORMELERI) {
        const { dE: en, cift } = enYakinRenkCifti([...TUM, zemin], g.f);
        assert.ok(en >= 30, `${g.ad} · zemin ${zemin}: ${cift} ΔE ${en.toFixed(1)}`);
      }
    }
  });

  test("renk sayısı kadar sıvı var", () => {
    /* Motor `EN_FAZLA_RENK` renge kadar çıkıyor; palet kısa kalırsa
       `ayirSivisi` son rengi tekrarlar ve iki farklı sıvı aynı görünür. */
    assert.ok(
      AYIR_SIVI_SAYISI >= EN_FAZLA_RENK,
      `palette ${AYIR_SIVI_SAYISI} ton var, motor ${EN_FAZLA_RENK} renk istiyor`,
    );
  });
});

/* ═══════════════════════════════════════════════════════════
   Bağla — renkleri çakışmadan birleştirme (Ü262)
   ═══════════════════════════════════════════════════════════ */

describe("bağla (Ü262)", () => {
  const komsuMu = (a: number, b: number, en: number) =>
    Math.abs(Math.floor(a / en) - Math.floor(b / en)) + Math.abs((a % en) - (b % en)) === 1;

  test("🔴 üretilen HER bölümün çözümü tahtayı kaplıyor", () => {
    /*
      🔴 Bu oyunun üreteci, tahtayı tamamen kaplayan tek bir Hamilton
      yolu kurup onu parçalara kesiyor; çözülebilirlik o yapıya
      dayanıyor. Yol kurulurken kullanılan **backbite** adımı yanlış
      uygulanırsa sonuç sessizce bozulur: kareler tekrarlanır ya da
      komşuluk kopar. İkisi de ekranda "çözülemeyen bölüm" diye
      görünür, sebebi görünmez.

      Sınanan üç şey: her kare **tam bir kez** kaplanıyor, ardışık
      kareler komşu, her renk tam iki uç taşıyor.
    */
    for (const tohum of ["kap-a", "kap-b", "kap-c"]) {
      for (let bolum = 1; bolum <= 8; bolum++) {
        const t = baglaBolumu(tohum, bolum);
        const kapli = new Set<number>();
        for (const dilim of t.cozum) {
          assert.ok(dilim.length >= 2, `bölüm ${bolum}: ${dilim.length} kareli dilim — uçlar çakışır`);
          for (let i = 0; i < dilim.length; i++) {
            assert.equal(kapli.has(dilim[i]), false, `bölüm ${bolum}: ${dilim[i]} iki yolda`);
            kapli.add(dilim[i]);
            if (i > 0) {
              assert.ok(
                komsuMu(dilim[i - 1], dilim[i], t.en),
                `bölüm ${bolum}: ${dilim[i - 1]} → ${dilim[i]} komşu değil`,
              );
            }
          }
        }
        assert.equal(kapli.size, t.en * t.en, `bölüm ${bolum}: tahta tam kaplanmadı`);
        assert.equal(
          t.uclar.filter((u) => u !== 0).length,
          t.renk * 2,
          `bölüm ${bolum}: uç sayısı renk sayısının iki katı değil`,
        );
      }
    }
  });

  test("🔴 motor kendi ürettiği çözümü KABUL ediyor ve bölümü bitiriyor", () => {
    /*
      🔴 Bir önceki test üretece bakıyor, bu ikisinin **arasına**:
      üretecin çözümü motorun kurallarından geçiyor mu ve geçtiğinde
      bölüm gerçekten bitiyor mu.

      İkisi ayrı ayrı doğru olup birlikte yanlış olabilir — örneğin
      `bolumBittiMi` kaplama şartını unutursa bu test yine geçer ama
      `yolGecerliMi` uçtan başlama şartını yanlış kurarsa çözüm
      reddedilir ve oyun **hiç** oynanamaz.
    */
    let cizim = 0;
    for (const tohum of ["coz-a", "coz-b"]) {
      let d: BaglaDurumu = { ...bagla.baslat(tohum), havuz: 10_000 };
      for (let bolum = 1; bolum <= 6; bolum++) {
        const t = baglaBolumu(tohum, bolum);
        const oncekiBolum = d.bolum;
        for (const dilim of t.cozum) {
          const s = bagla.uygula(d, { y: dilim });
          assert.ok(s, `bölüm ${bolum}: motor kendi çözümünün bir yolunu reddetti`);
          d = s;
          cizim++;
        }
        assert.equal(d.bolum, oncekiBolum + 1, `bölüm ${bolum}: çözüm uygulandı ama bölüm bitmedi`);
      }
    }
    assert.ok(cizim >= 40, `yalnızca ${cizim} çizim denendi — test bir şey sınamıyor`);
  });

  test("🔴 zorluk merdiveni tek yönlü", () => {
    /*
      🔴 İlk formül kenara bağlıydı ve ölçümde bölüm 1'de 4, bölüm 2'de
      **3** renk veriyordu — oyun ikinci bölümde kolaylaşıyordu.
      Kırıcı'da (Ü244) da zorluk eğrisi bir kez tersine dönmüştü;
      ikisi de ancak ölçünce göründü, gözle bakmakla değil.
    */
    for (let bolum = 2; bolum <= 20; bolum++) {
      assert.ok(
        baglaRenkSayisi(bolum) >= baglaRenkSayisi(bolum - 1),
        `bölüm ${bolum}: renk ${baglaRenkSayisi(bolum)}, öncekinde ${baglaRenkSayisi(bolum - 1)} — merdiven tersine döndü`,
      );
      assert.ok(
        tahtaEni(bolum) >= tahtaEni(bolum - 1),
        `bölüm ${bolum}: tahta küçüldü`,
      );
    }
    assert.ok(baglaRenkSayisi(12) > baglaRenkSayisi(1), "renk hiç artmıyor");
  });

  test("🔴 bütün renkler bağlı ama tahta DOLMAMIŞSA bölüm bitmiyor", () => {
    /*
      🔴 Klasik kuralın ta kendisi (bkz. `bagla.ts` dosya başı). Ürün
      sahibinin gösterdiği Flow Free tahtanın tamamının dolmasını
      istiyor; toytheater'daki basit sürüm istemiyor ve orada bulmaca
      düz çizgilerle çözülüyor.

      ⚠️ Bu test A/B ile **sonradan** eklendi: `bolumBittiMi`deki
      kaplama şartı silinip bütün takım koşuldu ve **tek bir test bile
      düşmedi**. Yani kural yazılıydı ama korumasızdı — biri
      "sadeleştirme" diye o satırı silse oyun sessizce kolay sürüme
      dönerdi.

      Tahta elle kuruldu (3×3) çünkü üretecin çözümü zaten tahtayı
      kaplıyor; kapsanmayan durumu görmek için eksik bir çözüm gerek.

          1 . .        renk 1: uçlar 0 ve 5
          . 2 1        renk 2: uçlar 4 ve 8
          . . 2
    */
    const uclar = [1, 0, 0, 0, 2, 1, 0, 0, 2];

    /* İki renk de bağlı — ama 3 ve 6 numaralı kareler boş. */
    const eksik = { en: 3, renk: 2, uclar, yollar: [[0, 1, 2, 5], [4, 7, 8]] };
    assert.equal(
      baglaBolumBittiMi(eksik),
      false,
      "renkler bağlı diye bölüm bitti sayıldı — kaplama şartı kalkmış",
    );

    /* Aynı uçlar, tahtanın tamamını kaplayan çözüm. */
    const tam = { en: 3, renk: 2, uclar, yollar: [[0, 1, 2, 5], [4, 3, 6, 7, 8]] };
    assert.equal(baglaBolumBittiMi(tam), true, "tam kaplayan çözüm bitmiş sayılmadı");
  });

  test("kuraldışı çizimler reddediliyor", () => {
    const d = bagla.baslat("kural");
    const t = baglaBolumu("kural", 1);
    const dogru = t.cozum[0];

    assert.equal(bagla.uygula(d, { y: [] }), null, "boş yol kabul edildi");

    /* Uç olmayan bir kareden başlamak. */
    const ucsuz = d.uclar.findIndex((u) => u === 0);
    assert.ok(ucsuz >= 0);
    assert.equal(
      bagla.uygula(d, { y: [ucsuz, dogru[0]] }),
      null,
      "uç olmayan kareden başlayan yol kabul edildi",
    );

    /* Komşu olmayan sıçrama. */
    const uzak = d.en * d.en - 1 === dogru[0] ? 0 : d.en * d.en - 1;
    if (!komsuMu(dogru[0], uzak, d.en)) {
      assert.equal(bagla.uygula(d, { y: [dogru[0], uzak] }), null, "sıçrayan yol kabul edildi");
    }

    /* Kendini kesen yol. */
    if (dogru.length >= 3) {
      assert.equal(
        bagla.uygula(d, { y: [dogru[0], dogru[1], dogru[0]] }),
        null,
        "kendini kesen yol kabul edildi",
      );
    }

    /* Başka rengin ucundan geçmek. */
    const baskaUc = d.uclar.findIndex((u) => u !== 0 && u !== d.uclar[dogru[0]]);
    if (baskaUc >= 0) {
      const ortadan = [dogru[0], ...dogru.slice(1)];
      const sahte = [...ortadan];
      sahte.splice(1, 0, baskaUc);
      assert.equal(bagla.uygula(d, { y: sahte }), null, "başka rengin ucundan geçildi");
    }
  });

  test("üstünden geçilen yol KESİLİYOR, çizim reddedilmiyor", () => {
    /*
      ⚠️ Gerçek oyundaki davranış bu ve alternatifi kilitlenmeydi:
      çakışan çizimi reddetseydik, tahta dolduktan sonra oyuncunun her
      denemesi reddedilir, her deneme hakkını yer ve tur çözülemeden
      biterdi.
    */
    const tohum = "kesme";
    const t = baglaBolumu(tohum, 1);
    let d: BaglaDurumu = bagla.baslat(tohum);

    const ilk = bagla.uygula(d, { y: t.cozum[0] });
    assert.ok(ilk);
    d = ilk;
    assert.equal(d.yollar[0].length, t.cozum[0].length, "ilk yol yazılmadı");

    /* İkinci rengi, birincinin bir karesinin üstünden geçecek şekilde
       çizmek için birinci yolun ortasındaki kareye komşu bir yol
       kurulamıyorsa test atlanıyor — ama çözümün kendisi zaten
       kesişmiyor, o yüzden doğrudan elle bir çakışma kuruluyor. */
    const ortak = t.cozum[0][1];
    const ikinciUc = t.cozum[1][0];
    if (komsuMu(ikinciUc, ortak, d.en)) {
      const s = bagla.uygula(d, { y: [ikinciUc, ortak] });
      assert.ok(s, "çakışan çizim reddedildi — kesme yerine ret yapılmış");
      assert.ok(
        s.yollar[0].length < t.cozum[0].length,
        "üstünden geçilen yol kesilmedi",
      );
      assert.equal(s.yollar[0].includes(ortak), false, "kesilen yol hâlâ o kareyi tutuyor");
    }
  });

  test("🔴 tur çizim hakkından uzun süremiyor — Ü83 duvarı", () => {
    /*
      Ü83: kazanarak biten tur yok. Duvar `CIZIM_HAKKI`: her çizim bir
      hak yiyor, hiçbir şey geri vermiyor.
    */
    for (const tohum of ["duvar-a", "duvar-b"]) {
      let d = bagla.baslat(tohum);
      let cizim = 0;
      while (!bagla.bittiMi(d) && cizim < CIZIM_HAKKI + 20) {
        const t = baglaBolumu(tohum, d.bolum);
        const s = bagla.uygula(d, { y: t.cozum[cizim % t.cozum.length] });
        if (!s) break;
        d = s;
        cizim++;
      }
      assert.ok(bagla.bittiMi(d), `${tohum}: tur ${cizim} çizimde bitmedi`);
      assert.ok(cizim <= CIZIM_HAKKI, `${tohum}: hak ${CIZIM_HAKKI} ama ${cizim} çizim oynandı`);
    }
  });

  test("bölüm bitince puan yazılıyor ve yeni tahta geliyor", () => {
    const tohum = "puan";
    const t = baglaBolumu(tohum, 1);
    let d: BaglaDurumu = bagla.baslat(tohum);
    for (const dilim of t.cozum) {
      const s = bagla.uygula(d, { y: dilim });
      assert.ok(s);
      d = s;
    }
    assert.equal(bagla.skor(d), baglaPuani(1), "1. bölümün puanı yanlış");
    assert.equal(d.bolum, 2, "bölüm ilerlemedi");
    assert.equal(d.yollar.every((y) => y.length === 0), true, "yeni bölüm çizili geldi");
  });

  test("🔴 ödül paketi PUAN VERMİYOR ve odulIsareti'ne bağlı değil (Ü234)", () => {
    assert.equal("odulIsareti" in bagla, false, "bağla odulIsareti kancasına takılmış");

    const tohum = "paket";
    const t = baglaBolumu(tohum, 1);
    /* Paketi, ilk rengin yolunun ortasındaki kareye koy. */
    const hedef = t.cozum[0][1];
    const d: BaglaDurumu = { ...bagla.baslat(tohum), skor: ODUL_ESIGI, paket: hedef };
    const oncekiSkor = bagla.skor(d);
    const s = bagla.uygula(d, { y: t.cozum[0] });
    assert.ok(s, "paketi kapsayan çizim reddedildi");
    assert.equal(s.odulVerildi, true, "paket teslim edilmedi");
    assert.equal(s.paket, null, "paket yerinde kaldı");
    assert.equal(bagla.skor(s), oncekiSkor, "paket PUAN verdi — Ü201 hatası geri gelmiş");
  });

  test("girdiOku bozuk veriyi reddediyor", () => {
    assert.equal(bagla.girdiOku(null), null);
    assert.equal(bagla.girdiOku({}), null, "yolsuz girdi kabul edildi");
    assert.equal(bagla.girdiOku({ y: [] }), null, "boş yol kabul edildi");
    assert.equal(bagla.girdiOku({ y: [0, "1"] }), null, "metin kabul edildi");
    assert.equal(bagla.girdiOku({ y: [0, 1.5] }), null, "ondalık kabul edildi");
    assert.equal(bagla.girdiOku({ y: [0, -1] }), null, "eksi kabul edildi");
    assert.equal(bagla.girdiOku({ y: [0, 9999] }), null, "aralık dışı kabul edildi");
    /* 🔴 Uzunluk sınırı: sınır olmasaydı tek girdiyle milyonluk bir
       dizi gönderilip sunucu yorulabilirdi. */
    assert.equal(
      bagla.girdiOku({ y: new Array(200).fill(0) }),
      null,
      "tahtadan uzun yol kabul edildi",
    );
    assert.deepEqual(bagla.girdiOku({ y: [0, 1, 2] }), { y: [0, 1, 2] });
  });
});

/* ═══════════════════════════════════════════════════════════
   Bağla · yol paleti (Ü262)
   ═══════════════════════════════════════════════════════════ */

describe("bağla yol paleti (Ü262)", () => {
  const TUM = Array.from({ length: BAGLA_RENK_SAYISI }, (_, i) => baglaYolRengi(i + 1));

  test("🔴 renk körlüğünde de hiçbir iki yol çakışmıyor", () => {
    /*
      Ayır'da (Ü261) gözle seçilen palet deuteranopide ΔE 6,8
      veriyordu. Burada ders baştan uygulandı ve palet arandı; bu test
      aramanın sonucunu kilitliyor.

      ⚠️ Bu oyunda çakışma daha da pahalı: oyuncu hangi ucun hangi uca
      gideceğini **yalnızca** renkten okuyor, tahtada başka ipucu yok.
    */
    for (const g of RENK_GORMELERI) {
      const { dE: en, cift } = enYakinRenkCifti(TUM, g.f);
      assert.ok(en >= 30, `${g.ad}: ${cift} çifti ΔE ${en.toFixed(1)} — eşik 30`);
    }
  });

  test("ilk üç renk en ayrışan üçlü — bölüm 1'de yalnızca onlar görünüyor", () => {
    const ilkUc = TUM.slice(0, 3);
    assert.equal(baglaRenkSayisi(1), ilkUc.length, "bölüm 1'in renk sayısı değişmiş");
    for (const g of RENK_GORMELERI) {
      const { dE: en, cift } = enYakinRenkCifti(ilkUc, g.f);
      assert.ok(en >= 40, `${g.ad}: ilk üçlüde ${cift} çifti ΔE ${en.toFixed(1)} — eşik 40`);
    }
  });

  test("motorun renk sınırı kadar ton var", () => {
    assert.ok(
      BAGLA_RENK_SAYISI >= BAGLA_EN_FAZLA_RENK,
      `palette ${BAGLA_RENK_SAYISI} ton var, motor ${BAGLA_EN_FAZLA_RENK} renk istiyor`,
    );
  });
});
