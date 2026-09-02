import { tohumla } from "./rastgele";
import { TICK_MS, type Oyun } from "./sozlesme";
import veri from "./veri/kelimeler.json";

/**
 * Kelime — harf setinden kelime çıkarma.
 *
 * Her tur bir **kaynak kelimeyle** açılır; onun harfleri oyuncunun elidir.
 * Oyuncu bu harflerden kelime kurar. Hedef sayıda kelime bulununca yeni tur
 * açılır: yeni harfler, **daha kısa süre**.
 *
 * ── Ü83: süre bitene kadar ──────────────────────────────────
 *
 * Bölüm yok. Oyun **süre dolduğunda** biter ve tek kaybetme yolu bu.
 * Zorluğu taşıyan tek şey saat: ilk tur 45 saniye, onuncu tur 15 saniye.
 * Harf sayısı da büyüyor ama o zorluk değil **fırsat** — daha uzun kelime
 * daha çok puan demek.
 *
 * Ürün sahibinin seçimi bu oldu: *"tur başına süre sayacı."* Alternatif
 * (toplam süre) tek bir kötü turda oyunu bitiriyordu; tur başına sayaç her
 * turda temiz sayfa veriyor ve baskıyı kademeli kuruyor.
 *
 * ── Determinizm ─────────────────────────────────────────────
 *
 * Süre gerçek saniyeye değil **tick sayacına** bağlı (Düşen'le aynı çözüm,
 * bir tick 50 ms). Her girdi hangi tick'te yapıldığını taşıyor; sunucu aynı
 * saati kurup aynı sonucu buluyor. Kelimesiz girdi (`k: ""`) yalnızca zaman
 * işareti — istemci sayacı ilerletmek için gönderiyor.
 *
 * Harf setini tohum üretiyor, gönderilen her kelime iki soruyla
 * denetleniyor: *listede var mı* ve *bu harflerden kurulabiliyor mu*.
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
 * **her replay'de, her turda** çalışıyor.
 */
const ADAY_DENEME = 20;

/** Bir turda bulunması gereken kelime sayısı — turdan tura değişmiyor. */
const TUR_HEDEFI = 3;

/**
 * Tur süresi (tick). Bir tick 50 ms.
 *
 * İlk tur 45 saniye, her turda 3 saniye azalıyor, 15 saniyede taban
 * yapıyor. Onuncu turdan sonra süre sabit — oradan sonrasını hız değil
 * dayanıklılık ayırıyor.
 */
const ILK_SURE = 900;
const TUR_AZALMASI = 60;
const EN_KISA_SURE = 300;

export function turSuresi(tur: number): number {
  return Math.max(EN_KISA_SURE, ILK_SURE - tur * TUR_AZALMASI);
}

/**
 * Kaynak kelimenin harf sayısı — üç turda bir uzuyor, yedide duruyor.
 *
 * Uzun set **kolaylaştırıyor** (daha çok olası kelime) ama aynı zamanda
 * taramayı zorlaştırıyor ve uzun kelime kare artan puan getiriyor. Yani
 * bu bir zorluk kolu değil, bir ödül kolu.
 */
export function kaynakUzunluk(tur: number): number {
  return 5 + Math.min(Math.floor(tur / 3), 2);
}

/**
 * Tur tamamlama ödülü — turla birlikte büyüyor, sonra sabitleniyor.
 *
 * Ü83'ün skor ölçeği buna dayanıyor. Yalnızca kelime puanı olsaydı skor
 * turla **doğrusal** artardı ve 2500 eşiği ancak yorucu bir sürede
 * gelirdi; artan ödül eğriyi yukarı büküyor.
 *
 * ⚠️ **Tavan şart.** Sınırsız artan ödülle ölçüldüğünde sözlüğün tamamını
 * bilen bir bot 24.000 skor yapıyordu — Blok ve Düşen'in yirmi katı. Aynı
 * eşik üç oyunda aynı şeyi ifade etmeli; yoksa oyuncu en kolay oyunu bulup
 * yalnızca onu oynar. Yedinci turdan sonra ödül 200'de duruyor ve fark
 * kelime uzunluğundan geliyor.
 */
const EN_YUKSEK_ODUL_TURU = 6;

function turOdulu(tur: number): number {
  return 50 + Math.min(tur, EN_YUKSEK_ODUL_TURU) * 25;
}

/**
 * Tur üst sınırı — oyun kuralı değil, **replay maliyeti sınırı.**
 *
 * Her yeni tur harf seti arıyor ve bu arama 5.000 kelimelik listeyi 20 kez
 * tarıyor. Girdi kaydı üst sınırı 5.000; her üç kelimede bir tur açılsaydı
 * saldırgan tek istekle 1.600 tur açtırıp sunucuyu yorabilirdi.
 *
 * Kırk tur, en kısa sürede bile on dakikadan uzun — gerçek bir oyuncunun
 * ulaşamayacağı yer. Ulaşan olursa tur orada dürüstçe bitiyor.
 */
const EN_COK_TUR = 40;

export type KelimeDurumu = {
  tohum: string;
  /** Kaçıncı tur — harfler, süre ve ödül bundan türüyor. */
  tur: number;
  /** Elin harfleri — kaynak kelimenin harfleri, karışık. */
  harfler: string[];
  /** Bu turda bulunması gereken kelime sayısı. */
  hedef: number;
  /** Bu turda bulunanlar, bulunma sırasıyla. */
  bulunan: string[];
  /** Turun tamamı boyunca bulunan kelime sayısı — ekran için. */
  toplamKelime: number;
  skor: number;
  /** Bu harflerden kurulabilecek geçerli kelime sayısı — tur çözülebilir mi? */
  olasi: number;
  /** Şu anki tick. */
  tick: number;
  /** Bu turun süresi dolduğunda hangi tick olacak. */
  bitisTicki: number;
  /** Süre dolduğu için bitti — turun tek bitiş yolu. */
  sureBitti: boolean;
};

/**
 * Girdi: bir tick ve isteğe bağlı bir kelime.
 *
 * `k` boşsa yalnızca zaman işareti. İstemci sayacı ilerletmek için düzenli
 * olarak gönderiyor; olmasaydı sunucu son kelimeden sonra saati durdurur
 * ve süre dolmasına rağmen turu açık sayardı.
 */
export type KelimeGirdisi = { tick: number; k: string };

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
 * Turun harf seti — yalnızca (tohum, tur)'dan türer.
 *
 * **Çözülebilirlik garantisi:** her kaynak kelime yeterli sayıda alt kelime
 * üretmez. "sakın" harfleri yalnızca altı kelime veriyor; hedefi sekiz olan
 * bir tur o harflerle **çözülemez** olurdu ve oyuncu bunu ancak süresini
 * harcayarak anlardı. Bu yüzden adaylar tohumla karıştırılıp ilk yeterli
 * olan seçiliyor. Seçim yine tamamen deterministik.
 */
function turunHarfleri(tohum: string, tur: number): string[] {
  const uzunluk = kaynakUzunluk(tur);
  const r = tohumla(`${tohum}:kelime:${tur}`);

  const adaylar = r.karistir(KELIMELER.filter((k) => k.length === uzunluk));
  // Hedefin biraz üstünü arıyoruz: tam hedef kadar kelime çıkan tur
  // teknik olarak çözülebilir ama oyuncuya nefes bırakmaz.
  const gereken = TUR_HEDEFI + 2;

  for (const aday of adaylar.slice(0, ADAY_DENEME)) {
    const harfler = r.karistir([...aday]);
    if (olasiKelimeSayisi(harfler) >= gereken) return harfler;
  }

  // Hiçbir aday yetmediyse en çok kelime üreteni seç — tur yine çözülebilir
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

/** Bu harflerden kaç geçerli kelime çıkar? Turun çözülebilir olduğunu doğrular. */
function olasiKelimeSayisi(harfler: readonly string[]): number {
  let n = 0;
  for (const k of KELIMELER) {
    if (k.length < EN_KISA || k.length > harfler.length) continue;
    if (kurulabilir(k, harfler)) n++;
  }
  return n;
}

/** Yeni turu kurar — harfler, süre ve sayaçlar sıfırlanır. */
function turaGec(durum: KelimeDurumu, tur: number): KelimeDurumu {
  if (tur >= EN_COK_TUR) return { ...durum, sureBitti: true };

  const harfler = turunHarfleri(durum.tohum, tur);
  return {
    ...durum,
    tur,
    harfler,
    bulunan: [],
    olasi: olasiKelimeSayisi(harfler),
    bitisTicki: durum.tick + turSuresi(tur),
  };
}

export const kelime: Oyun<KelimeDurumu, KelimeGirdisi> = {
  id: "kelime",
  ad: "Kelime",
  ozet: "Harflerden kelime çıkar, süre dolmadan yetiş",
  emoji: "🔤",

  baslat(tohum) {
    const harfler = turunHarfleri(tohum, 0);
    return {
      tohum,
      tur: 0,
      harfler,
      hedef: TUR_HEDEFI,
      bulunan: [],
      toplamKelime: 0,
      skor: 0,
      olasi: olasiKelimeSayisi(harfler),
      tick: 0,
      bitisTicki: turSuresi(0),
      sureBitti: false,
    };
  },

  uygula(durum, girdi) {
    if (this.bittiMi(durum)) return null;
    // Zaman geriye akmaz — sıralaması bozuk girdi kaydı reddedilir.
    if (girdi.tick < durum.tick) return null;

    // Önce saat ilerliyor. Süre dolduysa hamle **düşer**: geç gelen kelime
    // sayılmaz, tur biter. Sıra önemli — sonra ilerletseydik son saniyede
    // gönderilen kelime her zaman kabul edilirdi.
    const d: KelimeDurumu = { ...durum, tick: girdi.tick };
    if (d.tick >= d.bitisTicki) return { ...d, sureBitti: true };

    // Zaman işareti: kelime yok, yalnızca saat ilerledi.
    if (girdi.k.length === 0) return d;

    const k = kucult(girdi.k.trim());

    if (k.length < EN_KISA) return null;
    if (k.length > d.harfler.length) return null;
    if (d.bulunan.includes(k)) return null; // aynı turda aynı kelime iki kez sayılmaz
    if (!KELIME_KUMESI.has(k)) return null; // listede yok
    if (!kurulabilir(k, d.harfler)) return null; // elde bu harfler yok

    // Uzun kelime kare artan puan getirir: 3 harf 9, 7 harf 49.
    const bulunan = [...d.bulunan, k];
    const sonraki: KelimeDurumu = {
      ...d,
      bulunan,
      toplamKelime: d.toplamKelime + 1,
      skor: d.skor + k.length * k.length,
    };

    if (bulunan.length < sonraki.hedef) return sonraki;

    // Tur tamam: ödül yazılıyor, yeni harfler ve daha kısa süre geliyor.
    return turaGec({ ...sonraki, skor: sonraki.skor + turOdulu(sonraki.tur) }, sonraki.tur + 1);
  },

  bittiMi(durum) {
    return durum.sureBitti;
  },

  skor(durum) {
    return durum.skor;
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
    if (typeof o.k !== "string") return null;
    // Uzunluk sınırı biçim denetiminde: 64 karakterlik bir "kelime" hiçbir
    // durumda geçerli olamaz, kural katmanına kadar taşımaya gerek yok.
    if (o.k.length > 32) return null;
    return { tick: o.tick, k: o.k };
  },
};
