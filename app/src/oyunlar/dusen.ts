import { tohumla } from "./rastgele";
import type { Oyun } from "./sozlesme";

/**
 * Düşen — yukarıdan inen parçalarla satır doldurma.
 *
 * ── Ü22: kendi kimliğimizle ─────────────────────────────────
 *
 * Mekanik tanıdık, **parça seti bizim**: 3, 4 ve 5 hücreli karışık parçalar
 * kullanılıyor. Tetris'in yalnızca dört hücreli yedi parçalık seti bilerek
 * alınmadı — hem hukuki mesafe için hem de oyun gerçekten farklı oynansın
 * diye. Beş hücreli parçalar tahtayı hızlı doldurur, bu yüzden tahta da
 * standarttan geniş: 10×16.
 *
 * ── Determinizm ─────────────────────────────────────────────
 *
 * Motorun en zor sınavı bu oyun: içinde **zaman var.** Çözüm, zamanı gerçek
 * saniyeye değil **tick sayacına** bağlamak. Her girdi hangi tick'te
 * yapıldığını taşıyor; `uygula` önce yerçekimini o tick'e kadar ilerletiyor,
 * sonra hareketi işliyor. Sunucu aynı döngüyü çalıştırınca aynı tahtayı buluyor.
 *
 * Kilit gecikmesi (lock delay) **yok**: parça inemediği anda kilitlenir.
 * Sahada bir esneklik kaybı, replay'de bir belirsizlik kaynağının yok olması.
 */

export const DUSEN_EN = 10;
export const DUSEN_BOY = 16;

/** Kaç tick'te bir parça bir satır iner — bölüm zorlaştıkça azalır. */
const BOLUMLER = [
  { dusmeTicki: 24, hedef: 4 },
  { dusmeTicki: 18, hedef: 6 },
  { dusmeTicki: 14, hedef: 8 },
  { dusmeTicki: 10, hedef: 10 },
  { dusmeTicki: 7, hedef: 12 },
];

type Hucre = readonly [number, number];

/** Ham parça biçimleri — 3, 4 ve 5 hücreli karışık set (Ü22). */
const HAM_PARCALAR: readonly Hucre[][] = [
  [[0, 0], [0, 1], [0, 2]], // üçlü çizgi
  [[0, 0], [0, 1], [1, 0]], // üçlü köşe
  [[0, 0], [0, 1], [1, 0], [1, 1]], // kare
  [[0, 0], [0, 1], [0, 2], [0, 3]], // dörtlü çizgi
  [[0, 0], [0, 1], [0, 2], [1, 1]], // T
  [[0, 0], [0, 1], [0, 2], [1, 2]], // J
  [[0, 0], [0, 1], [0, 2], [1, 0]], // L
  [[0, 1], [0, 2], [1, 0], [1, 1]], // S
  [[0, 0], [0, 1], [1, 1], [1, 2]], // Z
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1]], // P (beşli)
  [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]], // artı-benzeri (beşli)
  [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]], // W (beşli)
];

/** Hücreleri sol üste yaslar — dönüşten sonra koordinatlar kaymasın. */
function yasla(hucreler: Hucre[]): Hucre[] {
  const enAzS = Math.min(...hucreler.map((h) => h[0]));
  const enAzK = Math.min(...hucreler.map((h) => h[1]));
  return hucreler
    .map(([s, k]) => [s - enAzS, k - enAzK] as Hucre)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** 90° saat yönünde döndürür. */
function dondur(hucreler: Hucre[]): Hucre[] {
  const enCokS = Math.max(...hucreler.map((h) => h[0]));
  return yasla(hucreler.map(([s, k]) => [k, enCokS - s] as Hucre));
}

/** Her parçanın dört dönüşü — açılışta bir kez hesaplanır. */
export const PARCA_DONUSLERI: readonly (readonly Hucre[])[][] = HAM_PARCALAR.map((ham) => {
  const donusler = [yasla([...ham])];
  for (let i = 1; i < 4; i++) donusler.push(dondur([...donusler[i - 1]]));
  return donusler;
});

export type DusenHareket = "sol" | "sag" | "don" | "in" | "birak" | "bekle";

export type DusenDurumu = {
  tohum: string;
  bolum: number;
  /** 16 satır, her biri 10 bitlik maske. */
  izgara: number[];
  parca: number;
  donus: number;
  s: number;
  k: number;
  /** Kaç parça düştü — sıradaki parça bundan türüyor. */
  parcaNo: number;
  tick: number;
  /** Parçanın son indiği tick. */
  sonInis: number;
  dusmeTicki: number;
  skor: number;
  temizlenen: number;
  hedef: number;
  /** Yeni parça sığmadığı için mi bitti? */
  doldu: boolean;
};

export type DusenGirdisi = { tick: number; a: DusenHareket };

const HAREKETLER: readonly DusenHareket[] = ["sol", "sag", "don", "in", "birak", "bekle"];

function parcaSec(tohum: string, bolum: number, parcaNo: number): number {
  return tohumla(`${tohum}:dusen:${bolum}:${parcaNo}`).tamsayi(PARCA_DONUSLERI.length);
}

/** Parça verilen konumda tahtaya sığıyor mu? */
function sigar(izgara: number[], parca: number, donus: number, s: number, k: number): boolean {
  for (const [ds, dk] of PARCA_DONUSLERI[parca][donus]) {
    const satir = s + ds;
    const sutun = k + dk;
    if (sutun < 0 || sutun >= DUSEN_EN || satir >= DUSEN_BOY) return false;
    if (satir < 0) continue; // tavanın üstü serbest — parça oradan iniyor
    if (izgara[satir] & (1 << sutun)) return false;
  }
  return true;
}

const DOLU_SATIR = (1 << DUSEN_EN) - 1;

/** Parçayı tahtaya işler, dolan satırları siler, silinen sayısını döner. */
function kilitle(izgara: number[], parca: number, donus: number, s: number, k: number): number {
  for (const [ds, dk] of PARCA_DONUSLERI[parca][donus]) {
    const satir = s + ds;
    if (satir >= 0) izgara[satir] |= 1 << (k + dk);
  }

  let silinen = 0;
  for (let satir = DUSEN_BOY - 1; satir >= 0; satir--) {
    if (izgara[satir] !== DOLU_SATIR) continue;
    izgara.splice(satir, 1);
    izgara.unshift(0);
    silinen++;
    satir++; // aynı satırı yeniden incele — üstteki aşağı kaydı
  }
  return silinen;
}

/** Yeni parçayı tahtanın üstüne koyar. Sığmıyorsa tahta dolmuştur. */
function yeniParca(durum: DusenDurumu): DusenDurumu {
  const parcaNo = durum.parcaNo + 1;
  const parca = parcaSec(durum.tohum, durum.bolum, parcaNo);
  const genislik = Math.max(...PARCA_DONUSLERI[parca][0].map((h) => h[1])) + 1;
  const k = Math.floor((DUSEN_EN - genislik) / 2);

  return {
    ...durum,
    parca,
    donus: 0,
    s: 0,
    k,
    parcaNo,
    sonInis: durum.tick,
    doldu: !sigar(durum.izgara, parca, 0, 0, k),
  };
}

/**
 * Yerçekimini hedef tick'e kadar ilerletir.
 *
 * Her `dusmeTicki` tick'te parça bir satır iner. İnemiyorsa kilitlenir ve
 * yeni parça gelir. Tek bir `uygula` çağrısı birden çok inişi kapsayabilir —
 * oyuncu bekleyip sonra hamle yaptıysa aradaki zaman burada işlenir.
 */
function zamaniIlerlet(durum: DusenDurumu, hedefTick: number): DusenDurumu {
  let d = durum;

  while (d.tick < hedefTick && !d.doldu && d.temizlenen < d.hedef) {
    const sonrakiInis = d.sonInis + d.dusmeTicki;
    if (sonrakiInis > hedefTick) {
      d = { ...d, tick: hedefTick };
      break;
    }

    d = { ...d, tick: sonrakiInis };

    if (sigar(d.izgara, d.parca, d.donus, d.s + 1, d.k)) {
      d = { ...d, s: d.s + 1, sonInis: sonrakiInis };
    } else {
      const izgara = d.izgara.slice();
      const silinen = kilitle(izgara, d.parca, d.donus, d.s, d.k);
      d = {
        ...d,
        izgara,
        skor: d.skor + 4 + silinen * silinen * 25,
        temizlenen: d.temizlenen + silinen,
      };
      if (d.temizlenen < d.hedef) d = yeniParca(d);
    }
  }

  return d;
}

export const dusen: Oyun<DusenDurumu, DusenGirdisi> = {
  id: "dusen",
  ad: "Düşen",
  ozet: "İnen parçalarla satır doldur",
  emoji: "🧱",
  bolumSayisi: BOLUMLER.length,

  baslat(tohum, bolum) {
    const ayar = BOLUMLER[bolum - 1];
    const parca = parcaSec(tohum, bolum, 0);
    const genislik = Math.max(...PARCA_DONUSLERI[parca][0].map((h) => h[1])) + 1;

    return {
      tohum,
      bolum,
      izgara: new Array(DUSEN_BOY).fill(0),
      parca,
      donus: 0,
      s: 0,
      k: Math.floor((DUSEN_EN - genislik) / 2),
      parcaNo: 0,
      tick: 0,
      sonInis: 0,
      dusmeTicki: ayar.dusmeTicki,
      skor: 0,
      temizlenen: 0,
      hedef: ayar.hedef,
      doldu: false,
    };
  },

  uygula(durum, girdi) {
    if (this.bittiMi(durum)) return null;
    // Zaman geriye akmaz — sıralaması bozuk girdi kaydı reddedilir.
    if (girdi.tick < durum.tick) return null;

    let d = zamaniIlerlet(durum, girdi.tick);
    if (this.bittiMi(d)) return d; // ilerletme sırasında bitti; hareket düşer

    switch (girdi.a) {
      case "bekle":
        return d;

      case "sol":
        return sigar(d.izgara, d.parca, d.donus, d.s, d.k - 1) ? { ...d, k: d.k - 1 } : d;

      case "sag":
        return sigar(d.izgara, d.parca, d.donus, d.s, d.k + 1) ? { ...d, k: d.k + 1 } : d;

      case "don": {
        // Duvar itmesi (wall kick) yok: dönüş çarpıyorsa reddedilir.
        // Basit ve belirsizliksiz — replay'de tartışılacak bir kural kalmıyor.
        const yeni = (d.donus + 1) % 4;
        return sigar(d.izgara, d.parca, yeni, d.s, d.k) ? { ...d, donus: yeni } : d;
      }

      case "in":
        return sigar(d.izgara, d.parca, d.donus, d.s + 1, d.k)
          ? { ...d, s: d.s + 1, sonInis: d.tick }
          : d;

      case "birak": {
        let s = d.s;
        while (sigar(d.izgara, d.parca, d.donus, s + 1, d.k)) s++;

        const izgara = d.izgara.slice();
        const silinen = kilitle(izgara, d.parca, d.donus, s, d.k);
        d = {
          ...d,
          izgara,
          s,
          skor: d.skor + 4 + silinen * silinen * 25 + (s - d.s),
          temizlenen: d.temizlenen + silinen,
        };
        return d.temizlenen >= d.hedef ? d : yeniParca(d);
      }
    }
  },

  bittiMi(durum) {
    return durum.doldu || durum.temizlenen >= durum.hedef;
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
    if (typeof o.tick !== "number" || !Number.isInteger(o.tick) || o.tick < 0) return null;
    // Tick üst sınırı: 100.000 tick, en yavaş bölümde bile bir saatten uzun.
    if (o.tick > 100_000) return null;
    if (typeof o.a !== "string" || !HAREKETLER.includes(o.a as DusenHareket)) return null;
    return { tick: o.tick, a: o.a as DusenHareket };
  },
};
