import {
  bicak,
  CEMBER,
  GIRIS_ACISI,
  type BicakDurumu,
  type BicakGirdisi,
} from "@/oyunlar/bicak";
import { blok, type BlokDurumu, type BlokGirdisi } from "@/oyunlar/blok";
import { dusen, type DusenDurumu, type DusenGirdisi, type DusenHareket } from "@/oyunlar/dusen";
import { sekme, ACI_SAYISI, type SekmeDurumu, type SekmeGirdisi } from "@/oyunlar/sekme";
import {
  yilan,
  YILAN_EN,
  type YilanDurumu,
  type YilanGirdisi,
  type Yon,
} from "@/oyunlar/yilan";

/**
 * Simülasyon botları — oyunları GERÇEKTEN oynarlar.
 *
 * ── Neden bot gerekiyor ─────────────────────────────────────
 *
 * `oyun.bitir` girdi kaydını `tekrarOyna` ile yeniden oynatıp skoru kendisi
 * hesaplıyor (S5). Yani simülasyon "şu oyuncu 340 puan aldı" diye bir satır
 * yazamaz; **geçerli bir girdi kaydı** üretmek zorunda. Bot bunu üretiyor.
 *
 * ── Neden her zaman geçerli ─────────────────────────────────
 *
 * Bot hamleyi kendi kafasından uydurmuyor: adayı **motorun kendi `uygula`
 * fonksiyonuna** veriyor ve yalnızca `null` dönmeyeni kaydına yazıyor. Yani
 * kayıt, tanım gereği motorun kabul ettiği hamlelerden oluşuyor — sunucunun
 * doğrulaması da aynı fonksiyonla yapıldığı için ikisi ayrışamıyor.
 *
 * Botlar iyi oyuncu değil, **kurallara uyan** oyuncu. Amaç yüksek skor değil,
 * ekranları ve raporları gerçek veriyle doldurmak.
 */

export type BotSonucu = { girdiler: unknown[]; skor: number };

/** Deterministik rastgelelik — aynı tohum aynı simülasyonu versin. */
export function zar(tohum: number) {
  let s = tohum >>> 0;
  return () => {
    s = (s * 1_664_525 + 1_013_904_223) >>> 0;
    return s / 4_294_967_296;
  };
}

/* ── Blok ─────────────────────────────────────────────────── */

/**
 * Üç teklifi ve 64 köşeyi tarar, ilk sığan yere koyar.
 *
 * Açgözlü ve kısa görüşlü — tıkanana kadar oynuyor. Ü83'ten beri turun tek
 * bitişi zaten bu; skorun ne kadar olacağı botun ne kadar dayandığına bağlı
 * ve bu **isteniyor**: düşük skorlu turlar da raporda görünmeli, yoksa demo
 * herkesin iyi oynadığı bir dünyayı anlatır.
 */
function blokOyna(tohum: string, rnd: () => number): BotSonucu {
  let durum: BlokDurumu = blok.baslat(tohum);
  const girdiler: BlokGirdisi[] = [];

  for (let adim = 0; adim < 400 && !blok.bittiMi(durum); adim++) {
    // Başlangıç noktası rastgele: her oyun aynı köşeden başlamasın, yoksa
    // otuz oyuncunun otuz oyunu birbirinin kopyası olur.
    const kaydir = Math.floor(rnd() * 64);
    let kondu = false;

    for (let t = 0; t < 3 && !kondu; t++) {
      for (let i = 0; i < 64; i++) {
        const hucre = (i + kaydir) % 64;
        const girdi: BlokGirdisi = { t, s: Math.floor(hucre / 8), k: hucre % 8 };
        const sonraki = blok.uygula(durum, girdi);
        if (sonraki) {
          durum = sonraki;
          girdiler.push(girdi);
          kondu = true;
          break;
        }
      }
    }
    if (!kondu) break; // hiçbir parça sığmıyor — motor da bitmiş sayacak
  }

  return { girdiler, skor: blok.skor(durum) };
}

/* ── Düşen ────────────────────────────────────────────────── */

const DUSEN_HAREKETLER: DusenHareket[] = ["sol", "sag", "don", "birak", "bekle"];

/**
 * Zaman tabanlı oyun: hamleler tick taşıyor.
 *
 * Bot birkaç yön hamlesi yapıp parçayı bırakıyor. Hangi hamlenin geçerli
 * olduğunu yine motor söylüyor — `uygula` null dönerse sıradaki denenir.
 */
function dusenOyna(tohum: string, rnd: () => number): BotSonucu {
  let durum: DusenDurumu = dusen.baslat(tohum);
  const girdiler: DusenGirdisi[] = [];
  let tick = durum.tick;

  for (let adim = 0; adim < 900 && !dusen.bittiMi(durum); adim++) {
    tick += 1 + Math.floor(rnd() * 3);

    // Çoğunlukla bırak; arada bir yana kaydır veya döndür.
    const hareket: DusenHareket =
      rnd() < 0.55 ? "birak" : DUSEN_HAREKETLER[Math.floor(rnd() * DUSEN_HAREKETLER.length)];

    let kondu = false;
    for (const a of [hareket, ...DUSEN_HAREKETLER]) {
      const girdi: DusenGirdisi = { tick, a };
      const sonraki = dusen.uygula(durum, girdi);
      if (sonraki) {
        durum = sonraki;
        girdiler.push(girdi);
        kondu = true;
        break;
      }
    }
    if (!kondu) break;
  }

  return { girdiler, skor: dusen.skor(durum) };
}

/* ── Yılan ────────────────────────────────────────────────── */

/**
 * Yeme doğru dönen, duvara çarpınca kaybeden bot.
 *
 * Açgözlü: başın yemle arasındaki farkı kapatmaya çalışıyor, gövdeyi hiç
 * hesaba katmıyor. Yani er geç kendine çarpıyor — turun bitiş yolu bu.
 */
function yilanOyna(tohum: string, rnd: () => number): BotSonucu {
  let durum: YilanDurumu = yilan.baslat(tohum);
  const girdiler: YilanGirdisi[] = [];
  let tick = 0;

  for (let adim = 0; adim < 1200 && !yilan.bittiMi(durum); adim++) {
    tick += 1 + Math.floor(rnd() * 2);

    const bas = durum.govde[0];
    const bs = Math.floor(bas / YILAN_EN);
    const bk = bas % YILAN_EN;
    const ys = Math.floor(durum.yem / YILAN_EN);
    const yk = durum.yem % YILAN_EN;

    // Önce dikey, sonra yatay hizala — sıra basit ve deterministik.
    const yon: Yon | "bekle" =
      bs !== ys ? (ys < bs ? "yukari" : "asagi") : bk !== yk ? (yk < bk ? "sol" : "sag") : "bekle";

    const girdi: YilanGirdisi = { tick, y: yon };
    const sonraki = yilan.uygula(durum, girdi);
    if (!sonraki) break;
    durum = sonraki;
    girdiler.push(girdi);
  }

  return { girdiler, skor: yilan.skor(durum) };
}

/* ── Sekme ────────────────────────────────────────────────── */

/**
 * Açıyı tohumdan seçen bot.
 *
 * ⚠️ Nişan almıyor, alamaz da: hangi açının çok blok kıracağını
 * bulmak arama gerektirir ve simülasyonun işi denge ölçmek değil
 * **gerçek girdi kaydı üretmek**. Rastgele açı, sunucunun tekrarını
 * sınamak için yeterli.
 */
function sekmeOyna(tohum: string, rnd: () => number): BotSonucu {
  let durum: SekmeDurumu = sekme.baslat(tohum);
  const girdiler: SekmeGirdisi[] = [];

  for (let t = 0; t < 200 && !sekme.bittiMi(durum); t++) {
    const girdi: SekmeGirdisi = { t, a: Math.floor(rnd() * ACI_SAYISI) };
    const sonraki = sekme.uygula(durum, girdi);
    if (!sonraki) break;
    durum = sonraki;
    girdiler.push(girdi);
  }

  return { girdiler, skor: sekme.skor(durum) };
}

/* ── Bıçak ────────────────────────────────────────────────── */

/**
 * Kütüğe bakıp boşluğa atan bot — Ü235.
 *
 * ── Neden bu bot nişan ALIYOR ───────────────────────────────
 *
 * Sekme'nin botu bilerek nişan almıyor (yukarıdaki not): orada
 * rastgele açı da uzun bir tur üretiyor. Burada üretmiyor —
 * rastgele zamanlama **ikinci bıçakta** ölüyor ve simülasyon
 * her turu 12 puanla kapatırdı. Tek bıçaklık bir kayıt, sunucunun
 * tekrarını sınamaz.
 *
 * Bot ileriye birkaç tick bakıp saplı bıçaklardan en uzak anı
 * seçiyor. Mükemmel değil: pencere kısa (`ILERI`) ve bölüm
 * doldukça hiçbir an güvenli olmuyor — tur yine kaybederek
 * bitiyor (Ü83).
 */
function bicakOyna(tohum: string, rnd: () => number): BotSonucu {
  let durum: BicakDurumu = bicak.baslat(tohum);
  const girdiler: BicakGirdisi[] = [];

  /** Kaç tick ileriye bakılıyor — yarım tur bile değil. */
  const ILERI = 24;

  for (let atis = 0; atis < 400 && !bicak.bittiMi(durum); atis++) {
    let enIyi = durum.sonTick + 1;
    let enGenis = -1;

    for (let k = 1; k <= ILERI; k++) {
      const t = durum.sonTick + k;
      const yer = bicakYeri(durum, t);
      const pay = durum.saplanan.length
        ? Math.min(...durum.saplanan.map((s) => bicakAciFarki(s, yer)))
        : CEMBER;
      if (pay > enGenis) {
        enGenis = pay;
        enIyi = t;
      }
    }

    /* Elle oynanan bir turda zamanlama tam tutmaz; bir tick'lik
       kayma botu insana yaklaştırıyor ve kaydı tekdüze olmaktan
       çıkarıyor. */
    const girdi: BicakGirdisi = { t: Math.max(durum.sonTick + 1, enIyi + (rnd() < 0.3 ? 1 : 0)) };
    const sonraki = bicak.uygula(durum, girdi);
    if (!sonraki) break;
    durum = sonraki;
    girdiler.push(girdi);
  }

  return { girdiler, skor: bicak.skor(durum) };
}

/** Bıçağın `t` tick'inde saplanacağı yer — motorun kendi tanımı. */
function bicakYeri(durum: BicakDurumu, t: number): number {
  const aci = durum.aci + durum.hiz * (t - durum.sonTick);
  return (((GIRIS_ACISI - aci) % CEMBER) + CEMBER) % CEMBER;
}

function bicakAciFarki(a: number, b: number): number {
  const d = Math.abs(((a - b) % CEMBER) + CEMBER) % CEMBER;
  return Math.min(d, CEMBER - d);
}

/* ── Seçici ───────────────────────────────────────────────── */

export function botOyna(oyunId: string, tohum: string, rnd: () => number): BotSonucu {
  if (oyunId === "blok") return blokOyna(tohum, rnd);
  if (oyunId === "dusen") return dusenOyna(tohum, rnd);
  if (oyunId === "sekme") return sekmeOyna(tohum, rnd);
  if (oyunId === "yilan") return yilanOyna(tohum, rnd);
  if (oyunId === "bicak") return bicakOyna(tohum, rnd);
  throw new Error(`Bot yok: ${oyunId}`);
}
