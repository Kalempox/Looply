import { tohumla } from "./rastgele";
import { TICK_MS, type Oyun } from "./sozlesme";

/**
 * Yılan — yem topla, kendine ve duvara çarpma.
 *
 * ── Ü91: yemin bazısı ödül ──────────────────────────────────
 *
 * Ürün sahibinin tarifi: *"yılan bazen şans eseri ama oyun başında değil,
 * genelde biraz ilerlerde elma yiyor ya — normalde elma yerine kupon veya
 * ödül çıksın."*
 *
 * Bu, ödül motorunun (Ü88) **görünen yüzü**. Motor bugüne kadar sessizce
 * arkada karar veriyordu ve oyuncu ödülü ancak sonuç ekranında görüyordu.
 * Burada ödül tahtanın üstünde duruyor, oyuncu ona doğru sürüyor ve
 * **yakalayamayabiliyor** — kaybetme ihtimali mekaniğin kendisi.
 *
 * ⚠️ **İlk yemlerde ödül çıkmıyor** (`ODUL_ILK_YEM`). Oyunun ilk yirmi
 * saniyesi öğrenme anı (docs/03); oraya ödül koymak hem çok kolay olur hem
 * de oyuncu daha kuralı anlamadan en değerli şeyi kaçırır.
 *
 * ── Ödülü kim veriyor ───────────────────────────────────────
 *
 * Yem **kuponu üretmiyor**. Durumda yalnızca "kaç ödül yemi yakalandı"
 * sayısı duruyor; sunucu turu yeniden oynatıp o sayıyı kendisi buluyor ve
 * ödül motoruna bir girdi olarak veriyor (`odulIsareti`). Değişmez kural
 * #4 böyle korunuyor: para değeri taşıyan hiçbir karar istemcide verilmiyor.
 *
 * ── Determinizm ─────────────────────────────────────────────
 *
 * Düşen'le aynı çözüm: zaman **tick sayacında**, her girdi kendi tick'ini
 * taşıyor. Yem konumu ve ödül olup olmadığı `(tohum, yenen)`'den türüyor.
 * Yılanın gövdesi hücre indekslerinden ibaret — kayan nokta yok.
 */

export const YILAN_EN = 15;
export const YILAN_BOY = 15;
const HUCRE = YILAN_EN * YILAN_BOY;

/**
 * Hız eğrisi: kaç tick'te bir adım.
 *
 * Başlangıçta 0,55 saniyede bir hücre; en hızlı hâlinde 0,15. Her üç yemde
 * bir hızlanıyor, yani eğri tek turda baştan sona yaşanıyor (Ü83).
 */
const BASLANGIC_TICK = 11;
const EN_HIZLI_TICK = 3;
const HIZLANMA_ARALIGI = 3;

export function adimTickiHesapla(yenen: number): number {
  return Math.max(EN_HIZLI_TICK, BASLANGIC_TICK - Math.floor(yenen / HIZLANMA_ARALIGI));
}

/** Kaçıncı yemden sonra ödül çıkabiliyor. */
const ODUL_ILK_YEM = 5;

/** Uygun yemlerin yüzde kaçı ödül. */
const ODUL_YUZDE = 22;

export type Yon = "yukari" | "asagi" | "sol" | "sag";

const YONLER: readonly Yon[] = ["yukari", "asagi", "sol", "sag"];

/** Yönün satır/sütun adımı. */
const ADIM: Record<Yon, readonly [number, number]> = {
  yukari: [-1, 0],
  asagi: [1, 0],
  sol: [0, -1],
  sag: [0, 1],
};

/** Ters yön — yılan kendi üstüne dönemiyor. */
const TERS: Record<Yon, Yon> = {
  yukari: "asagi",
  asagi: "yukari",
  sol: "sag",
  sag: "sol",
};

export type YilanDurumu = {
  tohum: string;
  /** Hücre indeksleri, **baş en başta**. */
  govde: number[];
  yon: Yon;
  /** Sıradaki adımda uygulanacak yön — dönüş hemen değil, adımda işliyor. */
  bekleyenYon: Yon;
  yem: number;
  /** Bu yem ödül mü? Ekran buna göre elma yerine kupon çiziyor. */
  yemOdulMu: boolean;
  yenen: number;
  /** Yakalanan ödül yemi sayısı — motorun okuduğu tek şey. */
  odulYakalanan: number;
  skor: number;
  tick: number;
  /** Son adımın atıldığı tick. */
  sonAdim: number;
  adimTicki: number;
  /**
   * Yılan yürümeye başladı mı? (Ü91)
   *
   * ⚠️ İlk sürümde tur açılır açılmaz sağa doğru yürüyordu ve oyuncu
   * ekrana daha bakmadan duvara giriyordu — tarayıcıda ölçüldü, üç
   * saniyede bitti. Artık **ilk yön tuşuna kadar** bekliyor; klasik yılan
   * oyunlarının davranışı da bu.
   *
   * Determinizmi bozmuyor: başlangıç anı girdi kaydındaki ilk yön
   * girdisinin tick'i, yani sunucu da aynı yerden başlatıyor.
   */
  basladi: boolean;
  /** Duvara ya da kendine çarptı — turun tek bitiş yolu. */
  carpti: boolean;
};

/**
 * Girdi: bir tick ve bir yön.
 *
 * `y: "bekle"` yalnızca zaman işareti — istemci sayacı ilerletmek için
 * gönderiyor. Olmasaydı sunucu son dönüşten sonra saati durdurur ve yılan
 * fiilen donardı.
 */
export type YilanGirdisi = { tick: number; y: Yon | "bekle" };

/** Yemin yeri ve türü — yalnızca (tohum, yenen)'den türüyor. */
function yemUret(tohum: string, yenen: number, dolu: readonly number[]): { yer: number; odul: boolean } {
  const r = tohumla(`${tohum}:yilan:${yenen}`);
  const bos: number[] = [];
  const doluKume = new Set(dolu);
  for (let i = 0; i < HUCRE; i++) if (!doluKume.has(i)) bos.push(i);

  // Tahta tamamen dolduysa (teorik) başı geri veriyoruz; bir sonraki adım
  // zaten çarpma ile bitiyor.
  const yer = bos.length === 0 ? dolu[0] : bos[r.tamsayi(bos.length)];

  // Ödül kararı yerden AYRI bir çekiliş: aynı çekilişten türeseydi yemin
  // konumu ödül olup olmadığını ele verirdi.
  const odul = yenen >= ODUL_ILK_YEM && tohumla(`${tohum}:yilan:odul:${yenen}`).tamsayi(100) < ODUL_YUZDE;

  return { yer, odul };
}

/** Yem puanı — uzadıkça artıyor, ödül yemi iki katı. */
function yemPuani(yenen: number, odulMu: boolean): number {
  const taban = 10 + Math.floor(yenen / 4) * 5;
  return odulMu ? taban * 2 : taban;
}

export const yilan: Oyun<YilanDurumu, YilanGirdisi> = {
  id: "yilan",
  ad: "Yılan",
  ozet: "Yem topla, ödülü yakala, çarpma",
  emoji: "🐍",

  baslat(tohum) {
    // Ortadan başlıyor, sağa bakıyor, üç hücre uzunluğunda.
    const orta = Math.floor(YILAN_BOY / 2) * YILAN_EN + Math.floor(YILAN_EN / 2);
    const govde = [orta, orta - 1, orta - 2];
    const { yer, odul } = yemUret(tohum, 0, govde);

    return {
      tohum,
      govde,
      yon: "sag",
      bekleyenYon: "sag",
      yem: yer,
      yemOdulMu: odul,
      yenen: 0,
      odulYakalanan: 0,
      skor: 0,
      tick: 0,
      sonAdim: 0,
      adimTicki: BASLANGIC_TICK,
      basladi: false,
      carpti: false,
    };
  },

  uygula(durum, girdi) {
    if (this.bittiMi(durum)) return null;
    // Zaman geriye akmaz — sıralaması bozuk girdi kaydı reddedilir.
    if (girdi.tick < durum.tick) return null;

    const d = zamaniIlerlet(durum, girdi.tick);
    if (this.bittiMi(d)) return d; // ilerletme sırasında çarptı; dönüş düşer

    if (girdi.y === "bekle") return d;

    // ⚠️ Dönüş **bekleyen yöne** yazılıyor, `yon`a değil. Doğrudan yazılsaydı
    // oyuncu tek bir adım içinde iki kez dönerek gövdesinin içinden
    // geçebilirdi: sağa giderken yukarı, sonra sola — yılan kendi boynuna
    // girer ve oyun haksız yere biterdi.
    if (girdi.y === TERS[d.yon]) return d; // geri dönüş yok; hamle düşer
    // İlk yön tuşu turu başlatıyor; ondan önce yılan yerinde duruyor.
    return { ...d, bekleyenYon: girdi.y, basladi: true };
  },

  bittiMi(durum) {
    return durum.carpti;
  },

  skor(durum) {
    return durum.skor;
  },

  gecenMs(durum) {
    return durum.tick * TICK_MS;
  },

  odulIsareti(durum) {
    return durum.odulYakalanan;
  },

  girdiOku(ham) {
    if (typeof ham !== "object" || ham === null) return null;
    const o = ham as Record<string, unknown>;
    if (typeof o.tick !== "number" || !Number.isInteger(o.tick) || o.tick < 0) return null;
    // Tick üst sınırı: 100.000 tick = 83 dakika. Sonsuz turda bile ulaşılmaz.
    if (o.tick > 100_000) return null;
    if (typeof o.y !== "string") return null;
    if (o.y !== "bekle" && !YONLER.includes(o.y as Yon)) return null;
    return { tick: o.tick, y: o.y as Yon | "bekle" };
  },
};

/**
 * Yılanı hedef tick'e kadar yürütür.
 *
 * Her `adimTicki` tick'te bir hücre ilerliyor. Tek bir `uygula` çağrısı
 * birden çok adımı kapsayabilir — oyuncu bekleyip sonra döndüyse aradaki
 * zaman burada işleniyor.
 */
function zamaniIlerlet(durum: YilanDurumu, hedefTick: number): YilanDurumu {
  // Henüz başlamadıysa saat ilerliyor ama yılan duruyor. `sonAdim` de
  // ilerliyor ki ilk adım, başlangıçtan tam bir aralık sonra atılsın —
  // aksi hâlde bekleyen oyuncu ilk tuşa bastığı anda arka arkaya birkaç
  // adım birden yer ve doğrudan duvara girer.
  if (!durum.basladi) return { ...durum, tick: hedefTick, sonAdim: hedefTick };

  let d = durum;

  while (d.tick < hedefTick && !d.carpti) {
    const sonraki = d.sonAdim + d.adimTicki;
    if (sonraki > hedefTick) {
      d = { ...d, tick: hedefTick };
      break;
    }

    d = { ...d, tick: sonraki, sonAdim: sonraki, yon: d.bekleyenYon };
    d = adimAt(d);
  }

  return d;
}

/** Tek adım: başı ilerlet, çarpışmayı ve yemi çöz. */
function adimAt(durum: YilanDurumu): YilanDurumu {
  const bas = durum.govde[0];
  const satir = Math.floor(bas / YILAN_EN);
  const sutun = bas % YILAN_EN;
  const [ds, dk] = ADIM[durum.yon];
  const yeniSatir = satir + ds;
  const yeniSutun = sutun + dk;

  // Duvar.
  if (yeniSatir < 0 || yeniSatir >= YILAN_BOY || yeniSutun < 0 || yeniSutun >= YILAN_EN) {
    return { ...durum, carpti: true };
  }

  const yeniBas = yeniSatir * YILAN_EN + yeniSutun;
  const yedi = yeniBas === durum.yem;

  // ⚠️ Kuyruk kontrolü: yemediyse kuyruk aynı adımda boşalıyor, yani
  // kuyruğun bulunduğu hücreye girmek çarpma DEĞİL. Kontrol edilecek gövde
  // bu yüzden kuyruksuz hâli.
  const carpilacak = yedi ? durum.govde : durum.govde.slice(0, -1);
  if (carpilacak.includes(yeniBas)) {
    return { ...durum, carpti: true };
  }

  const govde = [yeniBas, ...(yedi ? durum.govde : durum.govde.slice(0, -1))];

  if (!yedi) return { ...durum, govde };

  const yenen = durum.yenen + 1;
  const { yer, odul } = yemUret(durum.tohum, yenen, govde);

  return {
    ...durum,
    govde,
    yem: yer,
    yemOdulMu: odul,
    yenen,
    odulYakalanan: durum.odulYakalanan + (durum.yemOdulMu ? 1 : 0),
    skor: durum.skor + yemPuani(durum.yenen, durum.yemOdulMu),
    adimTicki: adimTickiHesapla(yenen),
  };
}
