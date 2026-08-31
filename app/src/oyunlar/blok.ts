import { tohumla } from "./rastgele";
import type { Oyun } from "./sozlesme";

/**
 * Blok — 8×8 ızgaraya parça yerleştirme.
 *
 * Üç parça teklif edilir, oyuncu birini seçip ızgaraya koyar. Dolan satır
 * ve sütunlar temizlenir. Üç parça da kullanılınca yeni üçlü gelir.
 * Bölüm, hedef kadar satır temizlenince biter; hiçbir parça sığmıyorsa
 * başarısız biter.
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

/** Bölüm hedefleri — kaç satır/sütun temizlenecek. */
const HEDEFLER = [4, 6, 8, 10, 12];

export type BlokDurumu = {
  /**
   * Bölümün kimliği. Durumda duruyor çünkü yeni teklif turu tohumdan
   * türemek zorunda ve `uygula` başka türlü tohuma erişemez. Durum yine
   * `(tohum, girdiler)` fonksiyonu — tohumu içinde taşıması bunu bozmuyor.
   */
  tohum: string;
  bolum: number;
  /** 8 satır, her biri 8 bitlik dolu-boş maskesi. */
  izgara: number[];
  /** Teklif edilen parça indeksleri; kullanılan `-1` olur. */
  teklifler: number[];
  /** Kaçıncı teklif turu — yeni üçlü bundan türüyor. */
  tur: number;
  skor: number;
  temizlenen: number;
  hedef: number;
  /** Hiçbir parça sığmadığı için mi bitti? */
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

/** Turun üç parçası — yalnızca (tohum, bölüm, tur)'dan türer. */
function turunParcalari(tohum: string, bolum: number, tur: number): number[] {
  const r = tohumla(`${tohum}:blok:${bolum}:${tur}`);
  return [r.tamsayi(PARCA_HUCRELERI.length), r.tamsayi(PARCA_HUCRELERI.length), r.tamsayi(PARCA_HUCRELERI.length)];
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
  ozet: "Parçaları yerleştir, satırları temizle",
  emoji: "🟦",
  bolumSayisi: HEDEFLER.length,

  baslat(tohum, bolum) {
    return {
      tohum,
      bolum,
      izgara: new Array(EN).fill(0),
      teklifler: turunParcalari(tohum, bolum, 0),
      tur: 0,
      skor: 0,
      temizlenen: 0,
      hedef: HEDEFLER[bolum - 1],
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

    // Yerleştirme parça büyüklüğü kadar; temizlik kare artan bonusla
    // (iki çizgiyi aynı anda temizlemek ikisini ayrı ayrı temizlemekten
    // değerli olsun — oyuncuyu kurmaya iter).
    const cizgi = temizle(izgara);
    const kazanc = PARCA_HUCRELERI[parca].length + cizgi * cizgi * 10;

    const teklifler = durum.teklifler.slice();
    teklifler[t] = -1;

    const bittiTeklif = teklifler.every((p) => p < 0);
    const tur = bittiTeklif ? durum.tur + 1 : durum.tur;

    const sonraki: BlokDurumu = {
      tohum: durum.tohum,
      bolum: durum.bolum,
      izgara,
      teklifler: bittiTeklif ? turunParcalari(durum.tohum, durum.bolum, tur) : teklifler,
      tur,
      skor: durum.skor + kazanc,
      temizlenen: durum.temizlenen + cizgi,
      hedef: durum.hedef,
      tikandi: false,
    };

    // Hedefe ulaşılmadıysa ve elde sığacak parça kalmadıysa bölüm tıkandı.
    if (sonraki.temizlenen < sonraki.hedef && !hamleVarMi(sonraki)) {
      sonraki.tikandi = true;
    }

    return sonraki;
  },

  bittiMi(durum) {
    return durum.tikandi || durum.temizlenen >= durum.hedef;
  },

  skor(durum) {
    return durum.skor;
  },

  basarili(durum) {
    return durum.temizlenen >= durum.hedef;
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
