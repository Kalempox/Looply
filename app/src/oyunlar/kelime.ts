import { tohumla } from "./rastgele";
import type { Oyun } from "./sozlesme";
import veri from "./veri/kelimeler.json";

/**
 * Kelime — harf setinden kelime çıkarma.
 *
 * Bölüm bir **kaynak kelimeyle** açılır; onun harfleri oyuncunun elidir.
 * Oyuncu bu harflerden kelime kurar. Hedef sayıda kelime bulununca bölüm biter.
 *
 * ── Doğrulaması en kolay oyun ───────────────────────────────
 *
 * Sunucunun yeniden oynatmak için simülasyon çalıştırmasına gerek yok:
 * harf setini tohumdan üretiyor, gönderilen her kelimeyi iki soruyla
 * denetliyor — *listede var mı* ve *bu harflerden kurulabiliyor mu*.
 * İstemcinin ne iddia ettiği hiç okunmuyor.
 *
 * Kelime listesi türetilmiş bir veri dosyası; kaynağı ve lisansı
 * `veri/LISANS.md` içinde (Ü23, MPL-2.0).
 */

const KELIMELER: readonly string[] = veri.kelimeler;
const KELIME_KUMESI = new Set(KELIMELER);

/** En kısa kabul edilen kelime. */
const EN_KISA = 3;

/**
 * Çözülebilir harf seti ararken kaç aday denenecek.
 *
 * Sınır var çünkü her aday 5.000 kelimelik listeyi tarıyor ve bu fonksiyon
 * **her replay'de** çalışıyor. Yirmi aday hem yeterli hem ucuz.
 */
const ADAY_DENEME = 20;

/** Bölüm ayarları: kaynak kelime uzunluğu ve bulunması gereken kelime sayısı. */
const BOLUMLER = [
  { kaynakUzunluk: 5, hedef: 4 },
  { kaynakUzunluk: 6, hedef: 5 },
  { kaynakUzunluk: 6, hedef: 6 },
  { kaynakUzunluk: 7, hedef: 7 },
  { kaynakUzunluk: 7, hedef: 8 },
];

export type KelimeDurumu = {
  /** Elin harfleri — kaynak kelimenin harfleri, karışık. */
  harfler: string[];
  /** Bulunması gereken kelime sayısı. */
  hedef: number;
  /** Bulunanlar, bulunma sırasıyla. */
  bulunan: string[];
  skor: number;
  /** Bu harflerden kurulabilecek geçerli kelime sayısı — bölüm çözülebilir mi? */
  olasi: number;
};

export type KelimeGirdisi = { k: string };

/** Türkçe küçük harf — JS'in varsayılanı `I`'yı `i` yapar, `ı` değil. */
export function kucult(s: string): string {
  return s.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
}

/** Harf sayımı — çoklu küme. */
function harfSayimi(harfler: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const h of harfler) m.set(h, (m.get(h) ?? 0) + 1);
  return m;
}

/** Kelime, eldeki harflerden kurulabiliyor mu? Her harf elde olduğu kadar kullanılır. */
export function kurulabilir(kelime: string, harfler: readonly string[]): boolean {
  const kalan = harfSayimi(harfler);
  for (const h of kelime) {
    const adet = kalan.get(h);
    if (!adet) return false;
    kalan.set(h, adet - 1);
  }
  return true;
}

/**
 * Bölümün harf seti — yalnızca (tohum, bölüm)'den türer.
 *
 * **Çözülebilirlik garantisi:** her kaynak kelime yeterli sayıda alt kelime
 * üretmez. "sakın" harfleri yalnızca altı kelime veriyor; hedefi sekiz olan
 * bir bölüm o harflerle **çözülemez** olurdu ve oyuncu bunu ancak deneyerek
 * anlardı. Bu yüzden adaylar tohumla karıştırılıp ilk yeterli olan seçiliyor.
 * Seçim yine tamamen deterministik — sunucu aynı harfleri buluyor.
 */
function bolumunHarfleri(tohum: string, bolum: number): string[] {
  const ayar = BOLUMLER[bolum - 1];
  const r = tohumla(`${tohum}:kelime:${bolum}`);

  const adaylar = r.karistir(KELIMELER.filter((k) => k.length === ayar.kaynakUzunluk));
  // Hedefin biraz üstünü arıyoruz: tam hedef kadar kelime çıkan bölüm
  // teknik olarak çözülebilir ama oyuncuya nefes bırakmaz.
  const gereken = ayar.hedef + 2;

  for (const aday of adaylar.slice(0, ADAY_DENEME)) {
    const harfler = r.karistir([...aday]);
    if (olasiKelimeSayisi(harfler) >= gereken) return harfler;
  }

  // Hiçbir aday yetmediyse en çok kelime üreteni seç — bölüm yine çözülebilir
  // olmalı, çünkü kaynak kelimenin kendisi her zaman geçerli bir cevaptır.
  let enIyi = [...adaylar[0]];
  let enIyiSayi = -1;
  for (const aday of adaylar.slice(0, ADAY_DENEME)) {
    const harfler = [...aday];
    const sayi = olasiKelimeSayisi(harfler);
    if (sayi > enIyiSayi) {
      enIyiSayi = sayi;
      enIyi = harfler;
    }
  }
  return r.karistir(enIyi);
}

/**
 * Bu harflerden çıkan tüm geçerli kelimeler.
 *
 * Ekranın **demo ipucu** bunu kullanıyor: oyunu tanıtırken hangi kelimelerin
 * kabul edildiğini bilmek gerekiyor, yoksa tanıtan kişi rastgele deneyip
 * "kabul etmiyor" izlenimi bırakıyor. Liste yalnızca demo kapısının
 * arkasında gösteriliyor; oyunun kendisi bundan etkilenmiyor.
 */
export function olasiKelimeler(harfler: readonly string[]): string[] {
  const out: string[] = [];
  for (const k of KELIMELER) {
    if (k.length < EN_KISA || k.length > harfler.length) continue;
    if (kurulabilir(k, harfler)) out.push(k);
  }
  return out;
}

/** Bu harflerden kaç geçerli kelime çıkar? Bölümün çözülebilir olduğunu doğrular. */
function olasiKelimeSayisi(harfler: readonly string[]): number {
  let n = 0;
  for (const k of KELIMELER) {
    if (k.length < EN_KISA || k.length > harfler.length) continue;
    if (kurulabilir(k, harfler)) n++;
  }
  return n;
}

export const kelime: Oyun<KelimeDurumu, KelimeGirdisi> = {
  id: "kelime",
  ad: "Kelime",
  ozet: "Harflerden kelime çıkar",
  emoji: "🔤",
  bolumSayisi: BOLUMLER.length,

  baslat(tohum, bolum) {
    const harfler = bolumunHarfleri(tohum, bolum);
    return {
      harfler,
      hedef: BOLUMLER[bolum - 1].hedef,
      bulunan: [],
      skor: 0,
      olasi: olasiKelimeSayisi(harfler),
    };
  },

  uygula(durum, girdi) {
    if (this.bittiMi(durum)) return null;

    const k = kucult(girdi.k.trim());

    if (k.length < EN_KISA) return null;
    if (k.length > durum.harfler.length) return null;
    if (durum.bulunan.includes(k)) return null; // aynı kelime iki kez sayılmaz
    if (!KELIME_KUMESI.has(k)) return null; // listede yok
    if (!kurulabilir(k, durum.harfler)) return null; // elde bu harfler yok

    // Uzun kelime kare artan puan getirir: 3 harf 9, 7 harf 49.
    return {
      ...durum,
      bulunan: [...durum.bulunan, k],
      skor: durum.skor + k.length * k.length,
    };
  },

  bittiMi(durum) {
    return durum.bulunan.length >= durum.hedef;
  },

  skor(durum) {
    return durum.skor;
  },

  basarili(durum) {
    return durum.bulunan.length >= durum.hedef;
  },

  girdiOku(ham) {
    if (typeof ham !== "object" || ham === null) return null;
    const o = ham as Record<string, unknown>;
    if (typeof o.k !== "string") return null;
    // Uzunluk sınırı biçim denetiminde: 64 karakterlik bir "kelime" hiçbir
    // durumda geçerli olamaz, kural katmanına kadar taşımaya gerek yok.
    if (o.k.length === 0 || o.k.length > 32) return null;
    return { k: o.k };
  },
};
