import { ODUL_BONUSU, odulSirasiGeldi } from "./odul";
import { tohumla } from "./rastgele";
import { TICK_MS, type Oyun } from "./sozlesme";

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
 *
 * ── Ü83: tahta dolana kadar ─────────────────────────────────
 *
 * Tur yalnızca **tahta dolunca** bitiyor. Bölüm yok, hedef yok. Zorluk
 * turun içinde artıyor ve kaldıraç düşme hızı: her dört satırda bir parça
 * biraz daha hızlı iniyor.
 *
 * Eğri eskisinden hem daha **yumuşak başlıyor** (24 yerine 28 tick) hem
 * daha **yukarı çıkıyor** (7 yerine 5): beş sabit bölüme yayılan aralığın
 * tamamı artık tek turda yaşanıyor. İlk dakika öğrenme, sonrası sınav.
 */

export const DUSEN_EN = 10;
export const DUSEN_BOY = 16;

/**
 * Düşme hızı eğrisi (Ü83).
 *
 * Bir tick 50 ms. Başlangıçta parça 1,4 saniyede bir satır iniyor; en hızlı
 * hâlinde 0,25 saniyede. Arada kırk satır var — yani eğri tek bir turda
 * baştan sona yaşanıyor, oyuncu hızlanmayı hissediyor.
 */
const BASLANGIC_TICK = 28;
const EN_HIZLI_TICK = 5;
/** Kaç satırda bir hızlanma. */
const HIZLANMA_ARALIGI = 4;

/** Temizlenen satır sayısına göre düşme hızı. Ekran da okuyor. */
export function dusmeTickiHesapla(temizlenen: number): number {
  const adim = Math.floor(temizlenen / HIZLANMA_ARALIGI);
  return Math.max(EN_HIZLI_TICK, BASLANGIC_TICK - adim * 2);
}

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
  /** Şu anki düşme hızı — `temizlenen`den türüyor; ekranın okuması için durumda. */
  dusmeTicki: number;
  skor: number;
  temizlenen: number;
  /**
   * Şu an inen parça ödül paketi mi — Ü207.
   *
   * Ürün sahibinin isteği birebir buydu: *"tetriste mesela dışı ödül
   * paketli bir parça yukarıdan aşağıya düşsün."* Blok'ta paket üç
   * teklifin biri (oyuncu seçiyor); burada **inen parçanın kendisi**,
   * çünkü Düşen'de seçim yok. Reddedilemediği için teslim de garanti:
   * parça bir yere konuyor ve iş bitiyor.
   *
   * Kural (eşik geçilmiş + henüz teslim edilmemiş) `odul.ts`te; puan
   * vermediği, `odulIsareti`e bağlanmadığı ve kafe dışında gizlemenin
   * ekranın işi olduğu da orada yazıyor.
   */
  odulParcasi: boolean;
  /** Paket bu turda teslim edildi mi — tur başına bir kez. */
  odulVerildi: boolean;
  /** Yeni parça sığmadığı için bitti — turun tek bitiş yolu. */
  doldu: boolean;
};

export type DusenGirdisi = { tick: number; a: DusenHareket };

const HAREKETLER: readonly DusenHareket[] = ["sol", "sag", "don", "in", "birak", "bekle"];

function parcaSec(tohum: string, parcaNo: number): number {
  return tohumla(`${tohum}:dusen:${parcaNo}`).tamsayi(PARCA_DONUSLERI.length);
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
  const parca = parcaSec(durum.tohum, parcaNo);
  const genislik = Math.max(...PARCA_DONUSLERI[parca][0].map((h) => h[1])) + 1;
  const k = Math.floor((DUSEN_EN - genislik) / 2);
  const doldu = !sigar(durum.izgara, parca, 0, 0, k);

  return {
    ...durum,
    parca,
    donus: 0,
    s: 0,
    k,
    parcaNo,
    sonInis: durum.tick,
    /*
      Ü207: paket **parçanın biçimini değiştirmiyor**, yalnızca kaplıyor.
      Sıra bozulsaydı skor da değişirdi; oysa paketin tek işi kazanılmış
      ödülü göstermek (`odul.ts`).

      ⚠️ `doldu` ise paket yok: ölü tahtaya paket çizdirmenin anlamı yok
      ve oyuncu kazanamadığı bir şeyi görmüş olurdu.
    */
    odulParcasi: !doldu && odulSirasiGeldi(durum.skor, durum.odulVerildi),
    doldu,
  };
}

/**
 * Yerçekimini hedef tick'e kadar ilerletir.
 *
 * Her `dusmeTicki` tick'te parça bir satır iner. İnemiyorsa kilitlenir ve
 * yeni parça gelir. Tek bir `uygula` çağrısı birden çok inişi kapsayabilir —
 * oyuncu bekleyip sonra hamle yaptıysa aradaki zaman burada işlenir.
 */
function zamaniIlerlet(
  durum: DusenDurumu,
  hedefTick: number,
  kayit: Kilitlenme[] | null,
): DusenDurumu {
  let d = durum;

  while (d.tick < hedefTick && !d.doldu) {
    const sonrakiInis = d.sonInis + d.dusmeTicki;
    if (sonrakiInis > hedefTick) {
      d = { ...d, tick: hedefTick };
      break;
    }

    d = { ...d, tick: sonrakiInis };

    if (sigar(d.izgara, d.parca, d.donus, d.s + 1, d.k)) {
      d = { ...d, s: d.s + 1, sonInis: sonrakiInis };
    } else {
      if (kayit) kayit.push(kilitKaydi(d.izgara, d.parca, d.donus, d.s, d.k));
      const izgara = d.izgara.slice();
      const silinen = kilitle(izgara, d.parca, d.donus, d.s, d.k);
      const temizlenen = d.temizlenen + silinen;
      d = {
        ...d,
        izgara,
        // ⚠️ `ODUL_BONUSU` sıfır (odul.ts). Toplamada duruyor çünkü
        // sıfır olduğu görünür olmalı — sessizce yeniden puan vermeye
        // başlaması Ü201'in ekonomi kaymasını geri getirir.
        skor: d.skor + 4 + silinen * silinen * 35 + (d.odulParcasi ? ODUL_BONUSU : 0),
        temizlenen,
        dusmeTicki: dusmeTickiHesapla(temizlenen),
        odulVerildi: d.odulVerildi || d.odulParcasi,
      };
      d = yeniParca(d);
    }
  }

  return d;
}

/* ═══════════════════════════════════════════════════════════
   Arayüz için saf yardımcılar — Ü209

   🔴 Üçü de motorun **durumuna hiçbir şey eklemiyor.** Ekranın
   ihtiyacı olan şeyler skoru etkilemediği için sözleşmeye girmemeli;
   ama hesapları burada, kuralın yanında durmalı. Aynı gerekçe Blok'ta
   `temizlenecekler` için de yazılmıştı (Ü199): arayüz motorun kuralını
   **tahmin etmeye** kalkarsa er geç ayrışır ve hata görünmez olur —
   ekran yanlış kareyi çizer, kimse "yanlış hücre parladı" demez.
   ═══════════════════════════════════════════════════════════ */

/**
 * Parça verilen konuma sığıyor mu — hayalet parça için.
 *
 * Referans videoda ve görselde parçanın **nereye düşeceği** tahtada
 * soluk bir gölgeyle gösteriliyor. Onu çizebilmek için ekranın çarpışma
 * kuralını sorması gerekiyor; kopyalaması değil.
 */
export function sigarMi(
  izgara: readonly number[],
  parca: number,
  donus: number,
  s: number,
  k: number,
): boolean {
  return sigar(izgara as number[], parca, donus, s, k);
}

/** Parçanın hemen altına düşeceği satır — hayaletin yeri. */
export function hayaletSatiri(durum: DusenDurumu): number {
  let s = durum.s;
  while (sigar(durum.izgara, durum.parca, durum.donus, s + 1, durum.k)) s++;
  return s;
}

/**
 * Sıradaki parçalar — "SIRADAKİ" paneli için.
 *
 * Parça dizisi `(tohum, parcaNo)`den türediği için gelecek serbestçe
 * okunabiliyor; durumda saklanmasına gerek yok.
 *
 * ⚠️ Yalnızca **biçimi** söylüyor, konumu değil: parça tahtaya girene
 * kadar nereye geleceği kuralın işi.
 */
export function siradakiParcalar(durum: DusenDurumu, adet: number): number[] {
  return Array.from({ length: adet }, (_, i) => parcaSec(durum.tohum, durum.parcaNo + 1 + i));
}

/**
 * Bu girdide kilitlenen parçalar — hücre renklerini taşımak için.
 *
 * ── 🔴 Neden gerekiyor ──────────────────────────────────────
 *
 * Referans görselde her parça kendi renginde ve yerleştikten sonra da
 * o rengi koruyor. Renk **motorun durumunda değil** (Ü202'nin kuralı):
 * ekran kendi renk ızgarasını tutuyor.
 *
 * Blok'ta bu kolaydı — orada hücreler yerinde boşalıyor. Düşen'de satır
 * silinince **üstündeki her şey bir satır aşağı kayıyor**, yani ekranın
 * renk ızgarası da aynı kaymayı yapmak zorunda. O kaymayı ekranda
 * yeniden yazmak `kilitle`nin ikizini üretirdi ve iki kopya er geç
 * ayrışırdı.
 *
 * Bu fonksiyon kararı **motorun kendi kodundan** veriyor: hangi kareler
 * doldu, hangi satırlar silindi. Ekran yalnızca uyguluyor.
 *
 * ⚠️ Dizi dönüyor, tek kayıt değil: tarayıcı sekmesi arkada kalıp geri
 * geldiğinde tek bir `bekle` girdisi birden çok parçayı kilitleyebilir.
 */
export type Kilitlenme = {
  /** Kilitlenen parçanın türü — rengi bundan türüyor. */
  parca: number;
  /** Doldurduğu kareler (`satır * DUSEN_EN + sütun`), temizlikten ÖNCE. */
  kareler: number[];
  /** Silinen satırların indeksleri, temizlikten ÖNCE. */
  silinen: number[];
};

/**
 * Kuralın tek gövdesi — `uygula` da, `uygulaVeKilitler` de buradan geçiyor.
 *
 * 🔴 İki ayrı kopya OLMAMALI. Sunucu `uygula`yı, ekran
 * `uygulaVeKilitler`i çağırıyor; ikisi ayrışsaydı istemcinin gördüğü
 * tahta ile sunucunun hesapladığı skor birbirini tutmaz ve **dürüst
 * oyuncunun turu reddedilirdi.** `kayit` yalnızca bir dinleyici: kural
 * onun varlığından habersiz.
 */
function ilerlet(
  durum: DusenDurumu,
  girdi: DusenGirdisi,
  kayit: Kilitlenme[] | null,
): DusenDurumu | null {
  if (durum.doldu) return null;
  // Zaman geriye akmaz — sıralaması bozuk girdi kaydı reddedilir.
  if (girdi.tick < durum.tick) return null;

  let d = zamaniIlerlet(durum, girdi.tick, kayit);
  if (d.doldu) return d; // ilerletme sırasında bitti; hareket düşer

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

      if (kayit) kayit.push(kilitKaydi(d.izgara, d.parca, d.donus, s, d.k));
      const izgara = d.izgara.slice();
      const silinen = kilitle(izgara, d.parca, d.donus, s, d.k);
      const temizlenen = d.temizlenen + silinen;
      d = {
        ...d,
        izgara,
        s,
        // Paketin payı sıfır — bkz. yerçekimi kolundaki not.
        skor:
          d.skor + 4 + silinen * silinen * 35 + (s - d.s) + (d.odulParcasi ? ODUL_BONUSU : 0),
        temizlenen,
        dusmeTicki: dusmeTickiHesapla(temizlenen),
        odulVerildi: d.odulVerildi || d.odulParcasi,
      };
      return yeniParca(d);
    }
  }
}

export function uygulaVeKilitler(
  durum: DusenDurumu,
  girdi: DusenGirdisi,
): { durum: DusenDurumu; kilitler: Kilitlenme[] } | null {
  const kilitler: Kilitlenme[] = [];
  const sonuc = ilerlet(durum, girdi, kilitler);
  return sonuc === null ? null : { durum: sonuc, kilitler };
}

/** Kilitlenen parçanın kaplayacağı kareleri ve silinecek satırları çıkarır. */
function kilitKaydi(
  izgara: readonly number[],
  parca: number,
  donus: number,
  s: number,
  k: number,
): Kilitlenme {
  const kareler: number[] = [];
  const kopya = izgara.slice();
  for (const [ds, dk] of PARCA_DONUSLERI[parca][donus]) {
    const satir = s + ds;
    if (satir < 0) continue;
    kareler.push(satir * DUSEN_EN + (k + dk));
    kopya[satir] |= 1 << (k + dk);
  }

  const silinen: number[] = [];
  for (let satir = 0; satir < DUSEN_BOY; satir++) {
    if (kopya[satir] === DOLU_SATIR) silinen.push(satir);
  }
  return { parca, kareler, silinen };
}

export const dusen: Oyun<DusenDurumu, DusenGirdisi> = {
  id: "dusen",
  ad: "Düşen",
  ozet: "İnen parçalarla satır doldur",
  emoji: "🧱",

  baslat(tohum) {
    const parca = parcaSec(tohum, 0);
    const genislik = Math.max(...PARCA_DONUSLERI[parca][0].map((h) => h[1])) + 1;

    return {
      tohum,
      izgara: new Array(DUSEN_BOY).fill(0),
      parca,
      donus: 0,
      s: 0,
      k: Math.floor((DUSEN_EN - genislik) / 2),
      parcaNo: 0,
      tick: 0,
      sonInis: 0,
      dusmeTicki: BASLANGIC_TICK,
      skor: 0,
      temizlenen: 0,
      // Skor sıfır; paket ancak eşik geçildikten sonra gelebilir.
      odulParcasi: false,
      odulVerildi: false,
      doldu: false,
    };
  },

  uygula(durum, girdi) {
    return ilerlet(durum, girdi, null);
  },

  bittiMi(durum) {
    return durum.doldu;
  },

  skor(durum) {
    return durum.skor;
  },
  /* Ü275 · "görünürse kesin": sunucu paketin gerçekten tahtada olduğunu
     ve oyuncuya ulaştığını bu ikisiyle görüyor (sözleşmedeki not). */
  odulVar(durum) {
    return durum.odulParcasi;
  },
  odulTeslim(durum) {
    return durum.odulVerildi;
  },

  gecenMs(durum) {
    return durum.tick * TICK_MS;
  },

  girdiOku(ham) {
    if (typeof ham !== "object" || ham === null) return null;
    const o = ham as Record<string, unknown>;
    if (typeof o.tick !== "number" || !Number.isInteger(o.tick) || o.tick < 0) return null;
    // Tick üst sınırı: 100.000 tick = 83 dakika. Sonsuz turda bile ulaşılmaz.
    if (o.tick > 100_000) return null;
    if (typeof o.a !== "string" || !HAREKETLER.includes(o.a as DusenHareket)) return null;
    return { tick: o.tick, a: o.a as DusenHareket };
  },
};
