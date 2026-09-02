import { tohumla } from "./rastgele";
import type { Oyun } from "./sozlesme";

/**
 * Blok — 8×8 ızgaraya parça yerleştirme.
 *
 * Üç parça teklif edilir, oyuncu birini seçip ızgaraya koyar. Dolan satır
 * ve sütunlar temizlenir. Üç parça da kullanılınca yeni üçlü gelir.
 *
 * ── Ü83: hiçbir parça sığmayana kadar ───────────────────────
 *
 * Tur **yalnızca tıkanınca** biter. Hedef yok, bölüm yok, kazanarak biten
 * bir tur yok — oyuncu ne kadar dayanırsa o kadar skor.
 *
 * Zorluk turun içinde artıyor ve kaldıraç **küçük parçalar**: oyunun kilit
 * açıcısı onlar, çünkü dolmuş bir tahtada hep bir yere sığıyorlar. Tur
 * ilerledikçe seyreliyorlar ve tahta kaçınılmaz olarak doluyor. Izgara
 * büyümüyor, hız yok, kural değişmiyor — değişen tek şey elinize gelen
 * parçalar. Böylece oyun **öğrenilebilir** kalıyor: kaybettiğinde neden
 * kaybettiğini görüyorsun.
 *
 * ── Neden bu oyun motorun referansı ─────────────────────────
 *
 * İçinde **hiç zaman yok.** Girdi kaydı `(teklif, satır, sütun)`
 * üçlülerinden ibaret; sunucu tohumdan aynı parçaları üretip hamleleri
 * tekrar oynuyor ve skoru birebir buluyor. S5'in en temiz hâli.
 *
 * Izgara **bit maskesi** olarak tutuluyor: her satır 8 bitlik bir sayı.
 * Kayan nokta yok, dizi kopyalama yok — replay'de sapma ihtimali sıfır.
 */

const EN = 8;
const TEKLIF = 3;

/**
 * Parça biçimleri — `[satır, sütun]` göreli hücreler.
 *
 * Ekran da bunu okuyor (önizleme çizmek için), o yüzden dışa açık.
 */
export const PARCA_HUCRELERI: readonly (readonly (readonly [number, number])[])[] = [
  [[0, 0]], // tek
  [[0, 0], [0, 1]], // yatay 2
  [[0, 0], [0, 1], [0, 2]], // yatay 3
  [[0, 0], [0, 1], [0, 2], [0, 3]], // yatay 4
  [[0, 0], [1, 0]], // dikey 2
  [[0, 0], [1, 0], [2, 0]], // dikey 3
  [[0, 0], [1, 0], [2, 0], [3, 0]], // dikey 4
  [[0, 0], [0, 1], [1, 0], [1, 1]], // kare 2×2
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], // kare 3×3
  [[0, 0], [1, 0], [1, 1]], // L küçük
  [[0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]], // L büyük
  [[0, 1], [1, 1], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 1]], // T
  [[0, 1], [1, 0], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [1, 2]], // S / Z
  [[0, 1], [0, 2], [1, 0], [1, 1]],
];

/**
 * Kaç teklif turunda bir zorluk kademesi artıyor.
 *
 * Bir tur üç parça demek, yani her kademe ~24 yerleştirme sürüyor. Daha
 * sık artırmak ilk dakikayı cezalandırırdı: yeni oyuncunun ilk turu
 * öğrenme turu (docs/03 · *"ilk oyun kesinlikle kolay olmalı"*).
 */
const KADEME_TUR = 8;

/** Zorluk en fazla bu kademeye çıkıyor. */
const EN_YUKSEK_KADEME = 3;

/**
 * Kolay parçalar — iki hücre ve altı.
 *
 * Bunlar tahtayı doldurmuyor, tıkanmayı açıyor. Zorluk kademesi tam
 * olarak bunların ne sıklıkta geleceğini kısıyor.
 */
const KOLAY = PARCA_HUCRELERI.map((h) => h.length <= 2);

export type BlokDurumu = {
  /**
   * Tohum durumda duruyor çünkü yeni teklif turu ondan türemek zorunda ve
   * `uygula` başka türlü tohuma erişemez. Durum yine `(tohum, girdiler)`
   * fonksiyonu — tohumu içinde taşıması bunu bozmuyor.
   */
  tohum: string;
  /** 8 satır, her biri 8 bitlik dolu-boş maskesi. */
  izgara: number[];
  /** Teklif edilen parça indeksleri; kullanılan `-1` olur. */
  teklifler: number[];
  /** Kaçıncı teklif turu — yeni üçlü ve zorluk kademesi bundan türüyor. */
  tur: number;
  skor: number;
  temizlenen: number;
  /**
   * Aralıksız temizlik zinciri — temizlik yapan her yerleştirmede büyüyor,
   * yapmayanda sıfırlanıyor.
   *
   * Ü83'ün skor ölçeği buna dayanıyor: sonsuz bir turda tek tek satır
   * temizlemek kaçınılmaz, ama **arka arkaya** temizlemek ustalık.
   * 500/1500/2500 eşiklerini ayıran şey bu.
   */
  zincir: number;
  /** Hiçbir parça sığmadığı için bitti — turun tek bitiş yolu. */
  tikandi: boolean;
};

export type BlokGirdisi = {
  /** Hangi teklif — 0, 1 veya 2. */
  t: number;
  /** Sol üst köşenin satırı. */
  s: number;
  /** Sol üst köşenin sütunu. */
  k: number;
};

/** Bu turda kaçıncı zorluk kademesindeyiz — 0 en kolay. Ekran da okuyor. */
export function kademe(tur: number): number {
  return Math.min(Math.floor(tur / KADEME_TUR), EN_YUKSEK_KADEME);
}

/**
 * Turun üç parçası — yalnızca (tohum, tur)'dan türer.
 *
 * Zorluk kademesi küçük parçayı **eleyerek değil, yeniden çekerek**
 * seyreltiyor: kademe kadar kez daha çekiliyor ve küçük parça ancak
 * hepsinde küçük çıkarsa hayatta kalıyor.
 *
 * ⚠️ Tamamen elenseydi dolmuş tahta kurtarılamaz olurdu ve oyun beceriyi
 * değil sabrı ölçerdi. Kademe 3'te tek hücrelik parça dört bağımsız
 * çekilişin dördünde de küçük çıkmayı gerektiriyor — nadir ama mümkün.
 */
function turunParcalari(tohum: string, tur: number): number[] {
  const r = tohumla(`${tohum}:blok:${tur}`);
  const zorluk = kademe(tur);
  const out: number[] = [];

  for (let i = 0; i < TEKLIF; i++) {
    let p = r.tamsayi(PARCA_HUCRELERI.length);
    for (let d = 0; d < zorluk && KOLAY[p]; d++) {
      p = r.tamsayi(PARCA_HUCRELERI.length);
    }
    out.push(p);
  }
  return out;
}

/** Parça verilen köşeye sığıyor mu? */
function sigar(izgara: number[], parca: number, s: number, k: number): boolean {
  for (const [ds, dk] of PARCA_HUCRELERI[parca]) {
    const satir = s + ds;
    const sutun = k + dk;
    if (satir < 0 || satir >= EN || sutun < 0 || sutun >= EN) return false;
    if (izgara[satir] & (1 << sutun)) return false;
  }
  return true;
}

/** Elde kalan parçalardan herhangi biri ızgaraya sığıyor mu? */
function hamleVarMi(durum: BlokDurumu): boolean {
  for (const parca of durum.teklifler) {
    if (parca < 0) continue;
    for (let s = 0; s < EN; s++) {
      for (let k = 0; k < EN; k++) {
        if (sigar(durum.izgara, parca, s, k)) return true;
      }
    }
  }
  return false;
}

const DOLU_SATIR = (1 << EN) - 1;

/** Dolan satır ve sütunları temizler, kaç tanesinin temizlendiğini döner. */
function temizle(izgara: number[]): number {
  const satirlar: number[] = [];
  const sutunlar: number[] = [];

  for (let s = 0; s < EN; s++) {
    if (izgara[s] === DOLU_SATIR) satirlar.push(s);
  }
  for (let k = 0; k < EN; k++) {
    let dolu = true;
    for (let s = 0; s < EN; s++) {
      if (!(izgara[s] & (1 << k))) {
        dolu = false;
        break;
      }
    }
    if (dolu) sutunlar.push(k);
  }

  for (const s of satirlar) izgara[s] = 0;
  for (const k of sutunlar) {
    for (let s = 0; s < EN; s++) izgara[s] &= ~(1 << k);
  }

  return satirlar.length + sutunlar.length;
}

export const blok: Oyun<BlokDurumu, BlokGirdisi> = {
  id: "blok",
  ad: "Blok",
  ozet: "Parçaları yerleştir, tıkanana kadar dayan",
  emoji: "🟦",

  baslat(tohum) {
    return {
      tohum,
      izgara: new Array(EN).fill(0),
      teklifler: turunParcalari(tohum, 0),
      tur: 0,
      skor: 0,
      temizlenen: 0,
      zincir: 0,
      tikandi: false,
    };
  },

  uygula(durum, girdi) {
    if (this.bittiMi(durum)) return null;

    const { t, s, k } = girdi;
    if (t < 0 || t >= TEKLIF) return null;

    const parca = durum.teklifler[t];
    if (parca < 0) return null; // bu teklif zaten kullanılmış
    if (!sigar(durum.izgara, parca, s, k)) return null;

    const izgara = durum.izgara.slice();
    for (const [ds, dk] of PARCA_HUCRELERI[parca]) {
      izgara[s + ds] |= 1 << (k + dk);
    }

    const cizgi = temizle(izgara);
    const zincir = cizgi > 0 ? durum.zincir + 1 : 0;

    // Skor üç parçadan (Ü83 ölçeği):
    //   · yerleştirme — parça hücre sayısı; sürekli ama küçük
    //   · temizlik    — çizgi sayısının karesi × 25; ikisini aynı anda
    //                   temizlemek ayrı ayrı temizlemekten değerli
    //   · zincir      — arka arkaya temizlemenin ödülü, üçte doyuyor
    //
    // Ölçek eskisinin yaklaşık iki buçuk katı ve bu kasıtlı: bölümlü
    // oyunda tur 12 satırda kesiliyordu ve Ü48'in 1500/2500 eşiklerine
    // hiç ulaşılamıyordu — 611 gerçek turda en yüksek skor 1200'dü.
    const zincirCarpani = Math.min(zincir, 3);
    const kazanc =
      PARCA_HUCRELERI[parca].length + cizgi * cizgi * 35 + (cizgi > 0 ? zincirCarpani * 20 : 0);

    const teklifler = durum.teklifler.slice();
    teklifler[t] = -1;

    const bittiTeklif = teklifler.every((p) => p < 0);
    const tur = bittiTeklif ? durum.tur + 1 : durum.tur;

    const sonraki: BlokDurumu = {
      tohum: durum.tohum,
      izgara,
      teklifler: bittiTeklif ? turunParcalari(durum.tohum, tur) : teklifler,
      tur,
      skor: durum.skor + kazanc,
      temizlenen: durum.temizlenen + cizgi,
      zincir,
      tikandi: false,
    };

    // Turun tek bitiş yolu: elde sığacak parça kalmaması.
    if (!hamleVarMi(sonraki)) sonraki.tikandi = true;

    return sonraki;
  },

  bittiMi(durum) {
    return durum.tikandi;
  },

  skor(durum) {
    return durum.skor;
  },

  girdiOku(ham) {
    if (typeof ham !== "object" || ham === null) return null;
    const o = ham as Record<string, unknown>;
    if (typeof o.t !== "number" || typeof o.s !== "number" || typeof o.k !== "number") return null;
    if (!Number.isInteger(o.t) || !Number.isInteger(o.s) || !Number.isInteger(o.k)) return null;
    if (o.s < 0 || o.s >= EN || o.k < 0 || o.k >= EN) return null;
    return { t: o.t, s: o.s, k: o.k };
  },
};
