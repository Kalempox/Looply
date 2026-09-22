import { tohumla, type Rastgele } from "./rastgele";
import { odulSirasiGeldi } from "./odul";
import type { Oyun } from "./sozlesme";

/**
 * Ayır — renkleri kendi tüpüne ayırma bulmacası (Ü261).
 *
 * `docs/18`in aday listesinde **1 numara**: girdi biçimi `(kaynak, hedef)`,
 * zaman yok, maliyet düşük. Ürün sahibinin verdiği referans
 * (toytheater.com/liquid-sort) açılıp oynandı; mekanik oradaki gibi:
 * bir tüpe dokun, sonra ötekine dokun, üstteki renk aktarılsın.
 *
 * ── 🔴 Referanstan alınmayan tek şey: PUAN ──────────────────
 *
 * Referans *"bulmacayı hızlı bitir, daha çok puan al"* diyor. Bizde bu
 * yasak — `docs/18` Ş2: sunucu istemcinin duvar saatini göremiyor, o
 * yüzden skoru zamana bağlamak *"200 ms'de bastım"* iddiasına inanmak
 * demek. Burada zaman **hiç yok**; skorun kaynağı kaç bölüm bitirildiği
 * ve bunun kaç hamleye mal olduğu.
 *
 * ── Ş1 · Belirlenim ─────────────────────────────────────────
 *
 * Durumun tamamı tam sayı. Kayan nokta yok, saat yok, `Math.cos` yok —
 * Kırıcı'daki (Ü244) tuzak buraya hiç girmiyor.
 *
 * ── Ş3 · Tohumda gizli bilgi yok ────────────────────────────
 *
 * Tahtadaki her birim **görünür**. Tohum yalnızca başlangıç dağılımını
 * kuruyor ve o dağılım zaten oyuncunun gözünün önünde. `docs/18`de
 * adayların yarısını eleyen şart (hafıza, mayın, iskambil) burada
 * kendiliğinden sağlanıyor.
 */

/** Bir tüp kaç birim alır. */
export const KAPASITE = 4;

/**
 * Bölümde kaç boş tüp var — **hatanın bedelini belirleyen sayı.**
 *
 * İki boş tüple yanlış hamle neredeyse bedava: renk yanlış yere
 * döküldüyse öteki boşluk kurtarıyor. Tek boş tüple aynı hamle turu
 * bitirebiliyor. Ölçümde iki boşlukta *"iyi"* ve *"kusursuz"* oyuncu
 * aynı skoru alıyordu — beceri ayrışmıyordu.
 *
 * ⚠️ İlk iki bölüm iki boşlukla: oyun kendini anlatmadan önce
 * cezalandırmamalı.
 */
export function bosTup(bolum: number): number {
  return bolum <= 2 ? 2 : 1;
}

/** En çok kaç renk. Ekran sınırı: renk + boş = tüp sayısı, 8 tüp iki sıra. */
export const EN_FAZLA_RENK = 6;

/**
 * Turun hamle hakkı — **Ü83'ün duvarı bu.**
 *
 * ── Neden bir duvar gerekiyor ───────────────────────────────
 *
 * Ü83: *"kazanarak biten tur yok"* — her oyunun, kusursuz oyuncunun bile
 * geçemeyeceği bir duvarı olmalı. Renk ayırma bulmacası kendi başına
 * bunu sağlamıyor: yeterli boş tüp varsa her bölüm çözülebilir ve
 * kusursuz oyuncu sonsuza kadar oynar.
 *
 * Duvar tek bir sayı: **tur boyunca toplam hamle hakkı.** Her aktarım
 * bir hamle yiyor, hiçbir şey hakkı geri vermiyor. Her bölüm en az bir
 * hamleye mal olduğuna göre tur kaçınılmaz olarak bitiyor — ispat bir
 * satır.
 *
 * ── 🔴 Önce İADELİ bir havuz denendi ve ÖLÇÜMDE çöktü ───────
 *
 * İlk tasarımda havuz vardı ve biten bölüm sabit 12 hamle iade
 * ediyordu. Ölçüm iki şeyi gösterdi:
 *
 *   · İlk bölümlerin en kısa çözümü **2–6 hamle**, yani iade
 *     maliyetten büyüktü: oyuncu ilk bölümlerde havuzu **şişiriyordu**.
 *     Rastgele oynayan bir bot bile 6,5 bölüm ilerleyip kupon eşiğini
 *     **%94,7** oranında geçti.
 *   · Maliyet üst bölümlerde ~13,5'te sabitlenince duvar 42. bölüme
 *     düştü: kusursuz bot 533 hamle oynadı. Kafede bir kahve süresi
 *     değil.
 *
 * Tek hak bunların ikisini birden kapatıyor: bedava yakıt evresi yok ve
 * duvarın yeri doğrudan bu sayıyla ayarlanıyor.
 *
 * ── Sayı ölçümle seçildi ────────────────────────────────────
 *
 * Dört oyuncu modeli (kusursuz hamleyi %0 / %40 / %75 / %100
 * olasılıkla oynayan botlar) altı ayrı hak değeriyle oynatıldı.
 * Ortanca skor ve kupon eşiğini (500) geçme oranı:
 *
 *   hak        40        50        60        70        85
 *   rastgele  180 %0    280 %0    280 %10   280 %22   280 %25
 *   acemi     280 %0    400 %8    400 %43   400 %46   400 %46
 *   iyi       400 %0    540 %53   540 %78   700 %78   880 %78
 *   kusursuz  400 %0    540 %100  700 %100  880 %100 1080 %100
 *
 * 40 ve 50'de **kusursuz oyuncu bile** iyi oyuncudan ayrışmıyor; 85'te
 * rastgele oynayan her dört turun birinde kupon eşiğini geçiyor.
 * 60 ikisinin arasında duruyor.
 *
 * ⚠️ Tabloda 60'tan sonra rastgele botun skoru **artmıyor** — onu
 * bitiren şey artık hak değil, tek boş tüpte **kilitlenmesi**
 * (`hamleVarMi`). Yani üst bölümlerde sınır bütçe değil beceri.
 */
export const HAMLE_HAKKI = 60;

/** Bölümdeki renk sayısı. */
export function renkSayisi(bolum: number): number {
  return Math.min(EN_FAZLA_RENK, 3 + Math.floor(bolum / 2));
}

/**
 * Bölümün hedeflediği parça sayısı — zorluğun tek düğmesi.
 *
 * ⚠️ Üst sınır tahtanın kendisi: parça sayısı toplam birim sayısını
 * geçemiyor. Üreteç hedefe ulaşamazsa ulaştığı yerde duruyor — sonsuz
 * döngü yok.
 */
export function hedefParca(bolum: number): number {
  return renkSayisi(bolum) + 2 * bolum + 2;
}

/**
 * Biten bölümün puanı.
 *
 * ⚠️ Ölçeği **kupon eşiği** (`ODUL_ESIGI` = 500) belirledi, estetik
 * değil: eşik, rastgele oynayanın ulaşabildiği yerin **üstünde**
 * durmalı. Ölçümde rastgele bot tek boş tüpte ortanca 4 bölümde
 * kilitleniyor; 6 bölümü ancak gerçekten oynayan biri görüyor. Bu
 * katsayılarla 5 bölüm 400, 6 bölüm 540 puan — eşik tam aralarında.
 */
export function bolumPuani(bolum: number): number {
  return 20 + 20 * bolum;
}

export type AyirDurumu = {
  tohum: string;
  /** Her tüp dipten üste renk kodları; 1..renk. Boş tüp `[]`. */
  tupler: number[][];
  bolum: number;
  /** Kalan hamle — tükenince tur biter, hiçbir şey geri vermiyor. */
  havuz: number;
  skor: number;
  /** Ödül paketini taşıyan tüp (Ü234) — yoksa null. */
  paket: number | null;
  odulVerildi: boolean;
  bitti: boolean;
};

/** Girdi: hangi tüpten hangi tüpe. Ü21 — bu biçim hiçbir oyunda yok. */
export type AyirGirdisi = { k: number; h: number };

/* ══════════════════════════════════════════════════════════
   Tahta yardımcıları
   ══════════════════════════════════════════════════════════ */

/** Tüpün üstündeki rengin kaç birimi üst üste duruyor. */
function ustDizi(tup: readonly number[]): { renk: number; adet: number } {
  if (tup.length === 0) return { renk: 0, adet: 0 };
  const renk = tup[tup.length - 1];
  let adet = 1;
  while (adet < tup.length && tup[tup.length - 1 - adet] === renk) adet++;
  return { renk, adet };
}

/** Tahtadaki bitişik aynı renk dizilerinin sayısı. */
export function parcaSayisi(tupler: readonly (readonly number[])[]): number {
  let n = 0;
  for (const tup of tupler) {
    for (let i = 0; i < tup.length; i++) if (i === 0 || tup[i] !== tup[i - 1]) n++;
  }
  return n;
}

/** Bölüm bitti mi: her rengin bütün birimleri tek tüpte mi. */
export function bolumBittiMi(tupler: readonly (readonly number[])[]): boolean {
  for (const tup of tupler) {
    if (tup.length === 0) continue;
    if (tup.length !== KAPASITE) return false;
    for (const birim of tup) if (birim !== tup[0]) return false;
  }
  return true;
}

/** Bu tahtada kuralına uygun tek bir aktarım var mı. */
export function hamleVarMi(tupler: readonly (readonly number[])[]): boolean {
  for (let k = 0; k < tupler.length; k++) {
    const kaynak = tupler[k];
    if (kaynak.length === 0) continue;
    const ust = ustDizi(kaynak);
    for (let h = 0; h < tupler.length; h++) {
      if (h === k) continue;
      const hedef = tupler[h];
      if (hedef.length >= KAPASITE) continue;
      if (hedef.length === 0 || hedef[hedef.length - 1] === ust.renk) return true;
    }
  }
  return false;
}

/* ══════════════════════════════════════════════════════════
   Bölüm üreteci — TERS OYNAYARAK
   ══════════════════════════════════════════════════════════ */

/**
 * Bölüm, çözülmüş tahtadan **geriye doğru** oynanarak kuruluyor.
 *
 * ── 🔴 Neden rastgele dağıtım DEĞİL ────────────────────────
 *
 * Alışılmış yol birimleri tüplere rastgele dağıtmak. Ölçüldü ve bu
 * oyunda **çalışmıyor**: aynı renk/tüp sayılarıyla 320 tahta üretildi,
 * **185'i (%58) çözümsüz** çıktı. Tek boş tüple oran daha da kötü.
 * Çözümsüz bölüm, oyuncunun hatası olmayan bir kayıp demek — ekranda
 * "tıkandın" yazar, sebebi görünmez.
 *
 * İkinci alışılmış yol: rastgele dağıt, sonra bir arama (BFS/DFS) ile
 * çözülebilirliği doğrula, olmazsa yeniden dağıt. O da reddedildi:
 * oyun kaydı doğrulanırken `baslat` sunucuda yeniden çalışıyor (S5) ve
 * aramanın maliyeti **her doğrulamaya** binerdi.
 *
 * Ters oynama ikisini de çözüyor: çözülmüş tahtadan başlanıp yalnızca
 * **geçerli bir ileri hamlenin tersi** olan adımlar atılıyor. Sonuç
 * yapısı gereği çözülebilir — çözüm, atılan adımların tersi. Aynı
 * tarama bu üreteçte 320 tahtada **0** çözümsüz veriyor.
 *
 * ── Ters hamlenin iki şartı ─────────────────────────────────
 *
 * İleri hamle `A→B`: A'nın üstündeki dizi B'ye geçiyor, B ya boş ya da
 * üstü aynı renk. Tersine çevirirken:
 *
 *   1. B'den alınan `adet` ya üst dizinin **tamamından az** olmalı
 *      (renk B'nin üstünde kalsın) ya da B **tamamen** boşalmalı.
 *      Aksi hâlde ileri durumda B'nin üstünde başka bir renk kalır ve
 *      o hamle kuraldışı olurdu — zincir orada kopar.
 *   2. Birimlerin konduğu A'nın üstü **farklı** renk olmalı. Yoksa
 *      A'daki dizi `adet`ten uzar ve ileri hamlede olması gerekenden
 *      fazla birim akar; zincir yine tam ters olmaktan çıkar.
 *
 * ⚠️ İkisi aynı ağırlıkta değil ve bu ölçüldü: şart 2 kaldırılıp aynı
 * 320 tahta yeniden tarandığında **yine 0 çözümsüz** çıktı (parça
 * sayısı da 16,8'den 16,6'ya düştü, yani zorluk bile aynı kaldı).
 * Yani şart 2 bu tahta boyutlarında taşıyıcı değil — ama kaldırılırsa
 * elde kalan şey ölçüm olur, **ispat olmaz**. Duruyor.
 *
 * ⚠️ Parça sayısı yalnızca birinci şıkta (dizinin bir kısmı) artıyor;
 * tüpü tamamen boşaltan adım parçayı taşıyor, çoğaltmıyor. Üreteç bu
 * yüzden önce çoğaltan adımları deniyor.
 */
function tersHamleler(
  tupler: readonly number[][],
  cogaltan: boolean,
): { k: number; h: number; adet: number }[] {
  const liste: { k: number; h: number; adet: number }[] = [];
  for (let b = 0; b < tupler.length; b++) {
    const kaynak = tupler[b];
    if (kaynak.length === 0) continue;
    const ust = ustDizi(kaynak);
    for (let adet = 1; adet <= ust.adet; adet++) {
      const tamami = adet === ust.adet;
      const bosalir = tamami && adet === kaynak.length;
      if (tamami && !bosalir) continue; // şart 1
      if (cogaltan === tamami) continue; // çoğaltan = dizinin bir kısmı
      for (let a = 0; a < tupler.length; a++) {
        if (a === b) continue;
        const hedef = tupler[a];
        if (KAPASITE - hedef.length < adet) continue;
        if (hedef.length > 0 && hedef[hedef.length - 1] === ust.renk) continue; // şart 2
        liste.push({ k: b, h: a, adet });
      }
    }
  }
  return liste;
}

/** Üreteç sonsuza kadar denemesin — hedefe ulaşılamayan tahtalar var. */
const EN_FAZLA_DENEME = 400;

function bolumKur(bolum: number, r: Rastgele): number[][] {
  const renk = renkSayisi(bolum);
  const tupler: number[][] = [];
  for (let c = 1; c <= renk; c++) tupler.push(new Array<number>(KAPASITE).fill(c));
  for (let i = 0; i < bosTup(bolum); i++) tupler.push([]);

  const hedef = hedefParca(bolum);
  for (let deneme = 0; deneme < EN_FAZLA_DENEME; deneme++) {
    if (parcaSayisi(tupler) >= hedef) break;
    let secenek = tersHamleler(tupler, true);
    if (secenek.length === 0) secenek = tersHamleler(tupler, false);
    if (secenek.length === 0) break;
    const h = r.sec(secenek);
    const tasinan = tupler[h.k].splice(tupler[h.k].length - h.adet, h.adet);
    tupler[h.h].push(...tasinan);
  }

  /* ⚠️ Tüp sırası karıştırılıyor: karıştırılmazsa dolu tüpler hep solda,
     boşlar hep sağda dururdu ve oyuncu tahtaya bakmadan "sağdakiler boş"
     diye oynardı. Sıra permütasyonu çözülebilirliği değiştirmiyor. */
  return r.karistir(tupler);
}

/**
 * Ödül paketini bir tüpe koyar — Ü234.
 *
 * ⚠️ **Karışık** bir tüp seçiliyor: paket tek renk olmuş bir tüpe
 * konsaydı oyuncu ona hiç dokunmadan bölümü bitirebilir ve paket turun
 * sonuna kadar orada kalırdı.
 */
function paketYerlestir(tupler: readonly number[][], r: Rastgele): number | null {
  const adaylar: number[] = [];
  for (let i = 0; i < tupler.length; i++) {
    const tup = tupler[i];
    if (tup.length === 0) continue;
    if (tup.some((b) => b !== tup[0])) adaylar.push(i);
  }
  if (adaylar.length === 0) return null;
  return r.sec(adaylar);
}

/* ══════════════════════════════════════════════════════════
   Motor
   ══════════════════════════════════════════════════════════ */

/**
 * Bir bölümün başlangıç tahtası.
 *
 * ⚠️ Dışa veriliyor çünkü **çözülebilirlik testi** üst bölümlere
 * oynayarak değil doğrudan bakabilmeli: 6. bölümü görmek için beş
 * bölüm çözmek gerekseydi test hem yavaş hem de çözücünün kendi
 * doğruluğuna bağımlı olurdu.
 */
export function bolumTahtasi(tohum: string, bolum: number): number[][] {
  return bolumKur(bolum, tohumla(`${tohum}:ayir:${bolum}`));
}

export const ayir: Oyun<AyirDurumu, AyirGirdisi> = {
  id: "ayir",
  ad: "Renkli Tüpler",
  ozet: "Tüpleri sırala, renkleri eşleştir",
  emoji: "🧪",

  /* İyi oyuncunun (kusursuz hamleyi %75 oynayan bot) ortanca turu —
     ölçüldü, tahmin değil. 6 bölüm bitirmeye karşılık geliyor. */
  gunlukHedef: 540,

  baslat(tohum) {
    return {
      tohum,
      tupler: bolumTahtasi(tohum, 1),
      bolum: 1,
      havuz: HAMLE_HAKKI,
      skor: 0,
      paket: null,
      odulVerildi: false,
      bitti: false,
    };
  },

  uygula(durum, girdi) {
    if (durum.bitti) return null;
    const { k, h } = girdi;
    const n = durum.tupler.length;
    if (!Number.isInteger(k) || !Number.isInteger(h)) return null;
    if (k < 0 || h < 0 || k >= n || h >= n || k === h) return null;

    const kaynak = durum.tupler[k];
    const hedef = durum.tupler[h];
    if (kaynak.length === 0) return null;
    if (hedef.length >= KAPASITE) return null;
    const ust = ustDizi(kaynak);
    if (hedef.length > 0 && hedef[hedef.length - 1] !== ust.renk) return null;

    const adet = Math.min(ust.adet, KAPASITE - hedef.length);
    const tupler = durum.tupler.map((t) => [...t]);
    tupler[k].splice(tupler[k].length - adet, adet);
    tupler[h].push(...new Array<number>(adet).fill(ust.renk));

    /* İade yok — `HAMLE_HAKKI` notuna bakın. */
    const havuz = durum.havuz - 1;
    let skor = durum.skor;
    let bolum = durum.bolum;
    let sonraki = tupler;

    /* 🔴 Paket kaynak tüpten alınıyor ve PUAN VERMİYOR (Ü234). */
    let paket = durum.paket;
    let odulVerildi = durum.odulVerildi;
    if (paket === k) {
      paket = null;
      odulVerildi = true;
    }

    if (bolumBittiMi(tupler)) {
      skor += bolumPuani(bolum);
      bolum += 1;
      sonraki = bolumTahtasi(durum.tohum, bolum);
      /* Paket bölümle birlikte gitmiyor: yeni tahtada yeri yok. */
      if (paket !== null) {
        paket = null;
        odulVerildi = true;
      }
    }

    if (paket === null && odulSirasiGeldi(skor, odulVerildi)) {
      paket = paketYerlestir(sonraki, tohumla(`${durum.tohum}:paket:${bolum}`));
    }

    const bitti = havuz <= 0 || !hamleVarMi(sonraki);

    return { ...durum, tupler: sonraki, bolum, havuz, skor, paket, odulVerildi, bitti };
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
    if (typeof o.k !== "number" || typeof o.h !== "number") return null;
    if (!Number.isInteger(o.k) || !Number.isInteger(o.h)) return null;
    if (o.k < 0 || o.h < 0 || o.k > 16 || o.h > 16) return null;
    return { k: o.k, h: o.h };
  },
};
