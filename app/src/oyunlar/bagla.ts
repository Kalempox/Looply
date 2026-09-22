import { tohumla, type Rastgele } from "./rastgele";
import { odulSirasiGeldi } from "./odul";
import type { Oyun } from "./sozlesme";

/**
 * Bağla — aynı renkleri çakışmadan birleştirme bulmacası (Ü262).
 *
 * `docs/18`in aday listesinde **10 numara**: *"girdi bir yol — en zengin
 * girdi biçimi. Bölüm üretimi zor: her bölümün çözülebilir olduğu
 * garanti edilmeli."* Ü21'in istediği çeşitlilik burada en uçta:
 * öteki sekiz oyunun girdisi birkaç sayıdan ibaret, bunun ki
 * **değişken uzunlukta bir dizi**.
 *
 * ── Kaynak ve ondan ayrıldığımız yer ────────────────────────
 *
 * Ürün sahibi Yandex'teki **Flow Free**'yi gösterdi. Aynı mekaniğin
 * basitleştirilmiş bir sürümü de açılıp oynandı
 * (toytheater.com/color-link): orada yalnızca noktaları birleştirmek
 * yetiyor, tahtanın tamamını doldurmak gerekmiyor.
 *
 * 🔴 Biz **klasik kuralı** alıyoruz: bölüm, bütün renkler bağlandığında
 * **ve tahtadaki her kare bir yolun altında kaldığında** bitiyor. İki
 * sebep:
 *
 *   · Ürün sahibinin gösterdiği oyun bu — mağaza açıklaması bile
 *     *"tüm renkleri eşleştirin ve tüm tahtayı..."* diyor.
 *   · Doldurma şartı olmadan bulmacanın çoğu düz çizgiyle çözülüyor ve
 *     üretecin kurduğu zorluk buharlaşıyor.
 *
 * ── Ş1 · Belirlenim ─────────────────────────────────────────
 *
 * Durumun tamamı tam sayı; kayan nokta yok, saat yok.
 *
 * ── Ş3 · Tohumda gizli bilgi yok ────────────────────────────
 *
 * Tahtadaki her uç **görünür**. Tohum yalnızca uçların yerini kuruyor.
 * ⚠️ Çözüm yolu tohumdan türüyor ama o bir "gizli bilgi" değil: oyuncu
 * da aynı tahtaya bakıp aynı çözümü bulabiliyor — nitekim bulması
 * gereken şey o.
 */

/** En küçük ve en büyük tahta kenarı. */
export const EN_KUCUK_TAHTA = 4;
export const EN_BUYUK_TAHTA = 7;

/**
 * Turun çizim hakkı — **Ü83'ün duvarı bu.**
 *
 * Her yol çizimi bir hak yiyor ve hiçbir şey geri vermiyor. Kusursuz
 * oyuncu bir bölümü **renk sayısı kadar** çizimde bitiriyor; renk sayısı
 * bölümle büyüdüğü için biriken maliyet hızlanıyor ve sabit hak bir
 * yerde tükeniyor. Ayır'daki (Ü261) ispatın aynısı.
 *
 * ── Sayı ölçümle seçildi ────────────────────────────────────
 *
 * Dört oyuncu modeli (doğru yolu %0 / %50 / %80 / %100 olasılıkla bulan
 * botlar) beş ayrı hak değeriyle oynatıldı. Ortanca skor ve kupon
 * eşiğini geçme oranı:
 *
 *   hak         24        30        36        42        50
 *   acemi      210 %2    210 %5    210 %7    210 %7    210 %8
 *   iyi        360 %38   540 %68   540 %80   540 %88   750 %92
 *   usta       750 %97   990 %98   990 %98  1260 %98  1260 %98
 *   kusursuz   990 %100 1260 %100 1560 %100 1560 %100 2250 %100
 *
 * 36'da bölüm sayıları: acemi 2, iyi 4, usta 6, kusursuz 8 — dört
 * seviyenin dördü de ayrışıyor. 24'te usta ile kusursuz birbirine
 * yaklaşıyor, 50'de tur kafede oturulan süreyi aşıyor.
 *
 * ⚠️ Bot `q<1`'de **doğru yolu** bulamadığında rastgele geçerli bir yol
 * çiziyor; oysa insan üretecin yolunu değil, kendi bulduğu geçerli
 * çözümü çiziyor. Yani acemi ve iyi satırları gerçek insanın **alt
 * sınırı** — olduğundan kötü. Ayarlarken buna güvenilmedi, usta ve
 * kusursuz satırlarına bakıldı.
 */
export const CIZIM_HAKKI = 36;

/** Bölümün tahta kenarı. */
export function tahtaEni(bolum: number): number {
  return Math.min(EN_BUYUK_TAHTA, EN_KUCUK_TAHTA + Math.floor((bolum - 1) / 2));
}

/**
 * En çok kaç renk — **palet sınırı**.
 *
 * ⚠️ Sekiz denendi ve renk körlüğü araması sekiz canlı ton bulamadı:
 * en iyi sekizli beyaz, gri ve kahve içeriyordu (en zayıf halka 32,8)
 * ve bulmaca oyununa göre cansızdı. Altı canlı tonda halka 36,2'ye
 * çıkıyor.
 *
 * ⚠️ Zorluk bundan kaybetmiyor: 36 çizim hakkıyla kusursuz oyuncu bile
 * 8. bölümü geçemiyor ve renk sayısı orada zaten 6. Sınır ancak hak
 * büyütülürse bağlayıcı olur.
 */
export const EN_FAZLA_RENK = 6;

/**
 * Bölümdeki renk sayısı.
 *
 * ── 🔴 İlk yazımda merdiven TERSİNE dönüyordu ──────────────
 *
 * Formül kenara bağlıydı (`en - 1 + bolum % 2`) ve ölçümde şu çıktı:
 * bölüm 1'de 4 renk, bölüm 2'de **3 renk**. Yani oyun ikinci bölümde
 * kolaylaşıyordu. Kırıcı'da (Ü244) da zorluk eğrisi bir kez tersine
 * dönmüştü ve ikisi de ancak ölçünce göründü.
 *
 * Şimdi tek yönlü: iki bölümde bir artıyor, tahta da iki bölümde bir
 * büyüyor. Tahta 7×7'de durunca renk artmaya devam ediyor — kare
 * sabitken renk artmak zorluğun tek kalan düğmesi.
 */
export function renkSayisi(bolum: number): number {
  return Math.min(EN_FAZLA_RENK, 3 + Math.floor((bolum - 1) / 2));
}

/**
 * Biten bölümün puanı.
 *
 * ⚠️ Ölçeği **kupon eşiği** (`ODUL_ESIGI` = 500) belirledi. Ölçümde 36
 * çizim hakkıyla oyuncular şu kadar bölüm bitiriyor: acemi 2, iyi 4,
 * usta 6, kusursuz 8. Eşiğin dördüncü bölümün hemen üstüne düşmesi
 * gerekiyordu — yani gerçekten oynayan biri geçsin, rastgele deneyen
 * geçmesin. Bu katsayılarla 3 bölüm 360, 4 bölüm 540 puan.
 */
export function bolumPuani(bolum: number): number {
  return 60 + 30 * bolum;
}

export type BaglaDurumu = {
  tohum: string;
  bolum: number;
  en: number;
  renk: number;
  /** Kare başına uç rengi; 0 = uç yok. Uzunluk `en * en`. */
  uclar: number[];
  /** Renk başına çizili yol (kare indisleri). Boş dizi = çizilmemiş. */
  yollar: number[][];
  /** Kalan çizim hakkı. */
  havuz: number;
  skor: number;
  /** Ödül paketini taşıyan kare (Ü234) — yoksa null. */
  paket: number | null;
  odulVerildi: boolean;
  bitti: boolean;
};

/** Girdi: bir yol. Ü21 — hiçbir oyunda dizi taşıyan girdi yoktu. */
export type BaglaGirdisi = { y: number[] };

/* ══════════════════════════════════════════════════════════
   Tahta yardımcıları
   ══════════════════════════════════════════════════════════ */

const komsuMu = (a: number, b: number, en: number): boolean => {
  const [ar, as] = [Math.floor(a / en), a % en];
  const [br, bs] = [Math.floor(b / en), b % en];
  return Math.abs(ar - br) + Math.abs(as - bs) === 1;
};

function komsular(k: number, en: number): number[] {
  const r = Math.floor(k / en);
  const s = k % en;
  const liste: number[] = [];
  if (r > 0) liste.push(k - en);
  if (r < en - 1) liste.push(k + en);
  if (s > 0) liste.push(k - 1);
  if (s < en - 1) liste.push(k + 1);
  return liste;
}

/** Bir rengin iki ucu. */
export function ucNoktalari(uclar: readonly number[], renk: number): number[] {
  const bulunan: number[] = [];
  for (let i = 0; i < uclar.length; i++) if (uclar[i] === renk) bulunan.push(i);
  return bulunan;
}

/** Yol iki ucu da tutuyor mu — yani o renk bağlanmış mı. */
function bagliMi(yol: readonly number[], uclar: readonly number[], renk: number): boolean {
  if (yol.length < 2) return false;
  const uc = ucNoktalari(uclar, renk);
  if (uc.length !== 2) return false;
  const bas = yol[0];
  const son = yol[yol.length - 1];
  return (bas === uc[0] && son === uc[1]) || (bas === uc[1] && son === uc[0]);
}

/**
 * Bölüm bitti mi: bütün renkler bağlı **ve** her kare dolu.
 *
 * ⚠️ İkinci şart klasik kural ve bilerek burada — bkz. dosya başı.
 */
export function bolumBittiMi(durum: {
  en: number;
  renk: number;
  uclar: number[];
  yollar: number[][];
}): boolean {
  const dolu = new Set<number>();
  for (let c = 1; c <= durum.renk; c++) {
    const yol = durum.yollar[c - 1] ?? [];
    if (!bagliMi(yol, durum.uclar, c)) return false;
    for (const k of yol) dolu.add(k);
  }
  return dolu.size === durum.en * durum.en;
}

/* ══════════════════════════════════════════════════════════
   Bölüm üreteci — HAMİLTON YOLUNU KESEREK
   ══════════════════════════════════════════════════════════ */

/**
 * Bölüm, tahtayı **tamamen kaplayan tek bir yol** kurulup o yol parçalara
 * kesilerek üretiliyor. Her parça bir rengin çözümü, parçanın iki ucu da
 * o rengin noktaları.
 *
 * ── 🔴 Neden arama değil ────────────────────────────────────
 *
 * `docs/18` bu adayın yanına *"her bölümün çözülebilir olduğu garanti
 * edilmeli"* diye yazmıştı ve haklıydı: uçları rastgele serpip sonra bir
 * çözücüyle doğrulamak, oyun kaydı doğrulanırken `baslat` sunucuda
 * yeniden koştuğu için (S5) **her doğrulamaya** aramanın maliyetini
 * bindirirdi. Ayır'da (Ü261) aynı gerekçeyle aynı yol seçilmişti.
 *
 * Kesilen Hamilton yolunda çözülebilirlik **ispat**: parçaların kendisi
 * zaten bir çözüm ve tahtanın tamamını kaplıyor.
 *
 * ── Yol nasıl rastgeleleşiyor ───────────────────────────────
 *
 * Yılan gibi sıralı bir Hamilton yolu her bölümde aynı görünürdü.
 * **Backbite**: yolun bir ucunu al, ızgarada komşusu olan ama yolda
 * komşusu olmayan bir kare seç, aradaki parçayı ters çevir. Sonuç yine
 * Hamilton yolu — ama karışmış.
 *
 * ⚠️ Ters çevirme her seferinde geçerli: `p0` ile `p_i` ızgara komşusu
 * seçiliyor, ters çevrilen parçanın içindeki komşuluklar da bozulmuyor.
 */
function hamiltonYolu(en: number, r: Rastgele): number[] {
  /* Yılan sıralaması — başlangıç. */
  const yol: number[] = [];
  for (let satir = 0; satir < en; satir++) {
    for (let i = 0; i < en; i++) {
      const sutun = satir % 2 === 0 ? i : en - 1 - i;
      yol.push(satir * en + sutun);
    }
  }

  const yer = new Array<number>(en * en);
  const yerleriKur = () => {
    for (let i = 0; i < yol.length; i++) yer[yol[i]] = i;
  };
  yerleriKur();

  /* Karıştırma sayısı kare sayısıyla ölçekleniyor: küçük tahtada az
     adım yetiyor, büyük tahtada yetmiyor. */
  const adim = en * en * 12;
  for (let n = 0; n < adim; n++) {
    const bastan = r.tamsayi(2) === 0;
    const uc = bastan ? yol[0] : yol[yol.length - 1];
    const secenek = komsular(uc, en).filter((k) => {
      const i = yer[k];
      return bastan ? i >= 2 : i <= yol.length - 3;
    });
    if (secenek.length === 0) continue;
    const hedef = r.sec(secenek);
    const i = yer[hedef];
    if (bastan) {
      /* [p0..p_{i-1}] ters çevriliyor; p_{i-1} yeni baş oluyor. */
      const bas = yol.slice(0, i).reverse();
      yol.splice(0, i, ...bas);
    } else {
      const kuyruk = yol.slice(i + 1).reverse();
      yol.splice(i + 1, kuyruk.length, ...kuyruk);
    }
    yerleriKur();
  }
  return yol;
}

/** Yolu `parca` adet, her biri en az 2 kare olan dilime böler. */
function yoluKes(yol: number[], parca: number, r: Rastgele): number[][] {
  const n = yol.length;
  /* Her parçaya önce 2 kare, kalanı rastgele dağıtılıyor. */
  const boy = new Array<number>(parca).fill(2);
  let kalan = n - 2 * parca;
  while (kalan > 0) {
    boy[r.tamsayi(parca)]++;
    kalan--;
  }
  const dilimler: number[][] = [];
  let i = 0;
  for (const b of boy) {
    dilimler.push(yol.slice(i, i + b));
    i += b;
  }
  return dilimler;
}

export type BaglaTahtasi = { en: number; renk: number; uclar: number[]; cozum: number[][] };

/**
 * Bir bölümün tahtası.
 *
 * ⚠️ `cozum` dışa veriliyor ama **motor onu kullanmıyor**: oyun bitişi
 * yalnızca oyuncunun çizdiği yollara bakıyor. Test ve ölçüm için var —
 * "üretilen her bölüm çözülebilir" iddiasını sınayan şey o.
 */
export function bolumTahtasi(tohum: string, bolum: number): BaglaTahtasi {
  const r = tohumla(`${tohum}:bagla:${bolum}`);
  const en = tahtaEni(bolum);
  const renk = Math.min(renkSayisi(bolum), Math.floor((en * en) / 2));
  const dilimler = yoluKes(hamiltonYolu(en, r), renk, r);

  const uclar = new Array<number>(en * en).fill(0);
  dilimler.forEach((dilim, i) => {
    uclar[dilim[0]] = i + 1;
    uclar[dilim[dilim.length - 1]] = i + 1;
  });
  return { en, renk, uclar, cozum: dilimler };
}

/**
 * Ödül paketini bir kareye koyar — Ü234.
 *
 * ⚠️ **Uç olmayan** bir kare seçiliyor: uçtaki paket oyuncu o rengi
 * çizmeden de görünür durur ve "dokunulmadan alınmış" gibi olurdu.
 * Tahtanın tamamı dolmak zorunda olduğu için (klasik kural) boş kare
 * mutlaka bir yolun altında kalıyor, yani paket kesinlikle toplanıyor.
 */
function paketYerlestir(uclar: readonly number[], r: Rastgele): number | null {
  const adaylar: number[] = [];
  for (let i = 0; i < uclar.length; i++) if (uclar[i] === 0) adaylar.push(i);
  if (adaylar.length === 0) return null;
  return r.sec(adaylar);
}

/* ══════════════════════════════════════════════════════════
   Motor
   ══════════════════════════════════════════════════════════ */

function tahtayiKur(tohum: string, bolum: number) {
  const t = bolumTahtasi(tohum, bolum);
  return {
    en: t.en,
    renk: t.renk,
    uclar: t.uclar,
    yollar: Array.from({ length: t.renk }, () => [] as number[]),
  };
}

/**
 * Bir yolun kurallara uygunluğu.
 *
 * ⚠️ Kural denetimi `girdiOku`dan **ayrı**: biri "bu veri doğru biçimde
 * mi", öteki "bu hamle oyunun kurallarına uyuyor mu" (sözleşme notu).
 */
function yolGecerliMi(yol: number[], durum: BaglaDurumu): number | null {
  const kare = durum.en * durum.en;
  if (yol.length === 0) return null;
  for (const k of yol) if (!Number.isInteger(k) || k < 0 || k >= kare) return null;

  const renk = durum.uclar[yol[0]];
  if (renk === 0) return null; // yol bir uçtan başlamak zorunda

  const gorulen = new Set<number>();
  for (let i = 0; i < yol.length; i++) {
    if (gorulen.has(yol[i])) return null; // kendini kesen yol
    gorulen.add(yol[i]);
    if (i > 0 && !komsuMu(yol[i - 1], yol[i], durum.en)) return null;
    /* Başka bir rengin ucundan geçilemiyor. Kendi öteki ucu yalnızca
       yolun sonunda olabilir. */
    const uc = durum.uclar[yol[i]];
    if (uc !== 0) {
      if (uc !== renk) return null;
      if (i > 0 && i < yol.length - 1) return null;
    }
  }
  return renk;
}

export const bagla: Oyun<BaglaDurumu, BaglaGirdisi> = {
  id: "bagla",
  ad: "Renkli Çizgiler",
  ozet: "Aynı renkleri birleştir, tahtayı doldur",
  emoji: "🔗",

  /* ⚠️ Ölçümle konacak. */
  gunlukHedef: 540,

  baslat(tohum) {
    return {
      tohum,
      bolum: 1,
      ...tahtayiKur(tohum, 1),
      havuz: CIZIM_HAKKI,
      skor: 0,
      paket: null,
      odulVerildi: false,
      bitti: false,
    };
  },

  uygula(durum, girdi) {
    if (durum.bitti) return null;
    const renk = yolGecerliMi(girdi.y, durum);
    if (renk === null) return null;

    /*
      Yeni yol, başka renklerin yollarını **kesiyor** — gerçek oyundaki
      davranış: üstünden geçilen yol o kareden itibaren siliniyor.

      ⚠️ Reddetmek yerine kesmek bilerek: reddetseydik oyuncu dolu bir
      tahtada hiçbir şey çizemez, her denemesi hakkını yer ve oyun
      kilitlenirdi.
    */
    const yollar = durum.yollar.map((y) => [...y]);
    yollar[renk - 1] = [...girdi.y];
    const yeniKareler = new Set(girdi.y);
    for (let c = 1; c <= durum.renk; c++) {
      if (c === renk) continue;
      const y = yollar[c - 1];
      const kesik = y.findIndex((k) => yeniKareler.has(k));
      if (kesik >= 0) yollar[c - 1] = y.slice(0, kesik);
    }

    const havuz = durum.havuz - 1;
    let skor = durum.skor;
    let bolum = durum.bolum;
    let tahta = { en: durum.en, renk: durum.renk, uclar: durum.uclar, yollar };

    /* 🔴 Paket çizilen yolun altında kalınca teslim — PUAN VERMİYOR. */
    let paket = durum.paket;
    let odulVerildi = durum.odulVerildi;
    if (paket !== null && yeniKareler.has(paket)) {
      paket = null;
      odulVerildi = true;
    }

    if (bolumBittiMi(tahta)) {
      skor += bolumPuani(bolum);
      bolum += 1;
      tahta = { ...tahtayiKur(durum.tohum, bolum) };
      if (paket !== null) {
        paket = null;
        odulVerildi = true;
      }
    }

    if (paket === null && odulSirasiGeldi(skor, odulVerildi)) {
      paket = paketYerlestir(tahta.uclar, tohumla(`${durum.tohum}:paket:${bolum}`));
    }

    return {
      ...durum,
      ...tahta,
      bolum,
      havuz,
      skor,
      paket,
      odulVerildi,
      bitti: havuz <= 0,
    };
  },

  bittiMi(durum) {
    return durum.bitti;
  },

  skor(durum) {
    return durum.skor;
  },

  girdiOku(ham) {
    if (typeof ham !== "object" || ham === null) return null;
    const o = ham as Record<string, unknown>;
    if (!Array.isArray(o.y)) return null;
    /* ⚠️ Uzunluk sınırı: en büyük tahta 7×7 = 49 kare ve bir yol her
       kareden en çok bir kez geçiyor. Sınır olmasaydı tek girdiyle
       milyonluk bir dizi gönderilebilirdi. */
    if (o.y.length === 0 || o.y.length > EN_BUYUK_TAHTA * EN_BUYUK_TAHTA) return null;
    const yol: number[] = [];
    for (const k of o.y) {
      if (typeof k !== "number" || !Number.isInteger(k) || k < 0) return null;
      if (k >= EN_BUYUK_TAHTA * EN_BUYUK_TAHTA) return null;
      yol.push(k);
    }
    return { y: yol };
  },
};
