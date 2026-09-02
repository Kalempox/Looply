import { randomInt } from "node:crypto";
import { KUPON_ESIGI, SKOR_ESIKLERI } from "./puan";

/**
 * Ödül motoru — Ü77.
 *
 * ── Ne karar veriyor ────────────────────────────────────────
 *
 * İki soru: **ödül çıkacak mı** ve **hangisi**. Üç girdiyle:
 *
 *   1. **Şans** — ödül garanti değil. Ürün sahibi: *"ödül şansa da bağlı
 *      olmalı."*
 *   2. **Skor ağırlığı** — *"skora göre daha yüksek ödül çıkma şansı da
 *      daha yüksek olmalı."* İyi oynamanın karşılığı sabit bir bonus
 *      değil, **daha iyi bir dağılım**.
 *   3. **Oyun başına azalan getiri** — aynı oyundan kazanmaya devam eden
 *      oyuncunun o oyundan gelen ödülü azalıyor.
 *
 * ── Üçüncüsü neden uyarlanan zorluktan iyi ──────────────────
 *
 * Alternatif, oyunu oyuncuya göre zorlaştırmaktı. O yol sunucunun replay
 * sırasında turun zorluk parametrelerini bilmesini gerektirirdi (S5) ve
 * oyun sözleşmesini kirletirdi. Azalan getiri **oyunun tamamen dışında**:
 * oyun herkes için birebir aynı kalıyor, `tekrarOyna` hiç değişmiyor,
 * tek girdi kupon defterinden okunan geçmiş.
 *
 * ── Bu dosyada rastgelelik var, oyunlarda yok ───────────────
 *
 * `src/oyunlar/` altında `Math.random` lint kuralıyla yasak, çünkü orası
 * replay edilmek zorunda. Burası **sunucunun kendi kararı**: replay'e
 * girmiyor, istemci görmüyor, tekrar oynatılmıyor. `randomInt`
 * kullanılıyor — sonuç para değerinde ve öngörülebilir bir üreteç, sırayı
 * tahmin etmeye çalışan biri için açık kapı olurdu (çarkla aynı gerekçe).
 *
 * ── ⚠️ S7 ──────────────────────────────────────────────────
 *
 * Şans artık çarkın köşesinde değil, ödül dağıtımının **merkezinde**.
 * Çekiliş/promosyon mevzuatı görüşü gelmeden canlıya çıkamaz.
 */

/**
 * Eşiği yeni geçen turun ödül düşürme şansı.
 *
 * ⚠️ İlk ayarda 0,55 ve 0,90'dı; ürün sahibi **düşürttü**: *"oranları daha
 * da düşür, düşük maliyetli ürünler daha sık çıksın, yoksa kafenin günlük
 * bütçesini çok zor yönetiriz."* Gerekçe doğru — bütçe tavanı (E10) ve
 * tempo (Ü87) üst sınırı zaten koruyor ama **harcamanın düzgün akması**
 * ayrı bir şey; sık düşen pahalı ödül günü dalgalı yapıyor.
 *
 * Taban 0,50'nin altına inmedi: eşiği geçen oyuncu hiç değilse yazı-tura
 * atmalı. E2'nin gerekçesi burada da geçerli — ilk kez oynayanın eli boş
 * çıkması, dönmemesi demek.
 */
const EN_AZ_SANS = 0.5;

/** Skorun şansı doyurduğu nokta — Ü48'in üst eşiği. */
const DOYUM_SKORU = SKOR_ESIKLERI[SKOR_ESIKLERI.length - 1].skor;

/** Doyum skorundaki şans. Bir tamamı hiç olmuyor: şans şans kalmalı. */
const EN_COK_SANS = 0.75;

/**
 * Ağırlık dikliği — çarkın `2` katsayısının değişkeni.
 *
 * `agirlikliSec` her basamakta ağırlığı bu katsayıya böler. 2 dik demek
 * (ucuz ödül baskın, çarkın karakteri), 1'e yaklaşmak düz demek (pahalı
 * ödülün gerçek şansı var).
 */
const DIK_TABAN = 2.0;

/**
 * En düz hâl — yani en yüksek skorun gördüğü dağılım.
 *
 * ⚠️ Önce 1,2 idi ve on ödüllü bir kafede en pahalısı %9'a çıkıyordu;
 * ortalama ödül maliyeti 26 TL'den 32 TL'ye, yani **dörtte bir** artıyordu.
 * Ürün sahibi bunu fazla buldu. 1,6'da aynı dağılımda en pahalı ~%1'de
 * kalıyor ve ortalama 27 TL — artış yirmide bir.
 *
 * Düzleşme **kaldırılmadı, kısıldı**: iyi oynamanın pahalı ödülü
 * yakınlaştırması hâlâ beş kat. Sıfırlansaydı skorun ödüle etkisi kalmaz
 * ve Ü77'nin ikinci girdisi ölü olurdu.
 */
const DUZ_TABAN = 1.6;

/**
 * Her kazanımın azalan getiriye katkısı.
 *
 * `katsayi = 1 / (1 + kazanim * BIKKINLIK)`. Yarım seçildi: aynı oyundan
 * bir kez kazanan üçte iki, iki kez kazanan yarı, üç kez kazanan beşte iki
 * şansla devam ediyor. Sıfıra gitmiyor — oyuncunun sevdiği oyunu
 * oynamasını **cezalandırmak** değil, tek oyunla ekonomiyi sömürmesini
 * engellemek istiyoruz.
 */
const BIKKINLIK = 0.5;

/**
 * Ödül işareti yakalamanın şansa kattığı pay (Ü91).
 *
 * Oyuncu ödülü **ekranda gördü ve ona ulaştı**; eli boş dönmesi mekaniği
 * yalan çıkarır. Yine de garanti değil: azalan getiri (Ü77) bu payın da
 * üstünde çalışıyor, yoksa tek oyunu öğrenip ekonomiyi sömürmek serbest
 * kalırdı.
 *
 * ⚠️ İşaret **hangi ödülün** çıkacağını değiştirmiyor, yalnızca çıkma
 * şansını yükseltiyor. Tier'i de açsaydı pahalı ödül yakalanabilir bir
 * hedefe dönerdi ve kafenin günlük bütçesi yönetilemez olurdu (Ü89).
 */
const ODUL_ISARETI_PAYI = 0.2;

/** Şans hiçbir koşulda bunun üstüne çıkmıyor. */
const MUTLAK_TAVAN = 0.95;

/** Azalan getiri kaç güne bakıyor. */
export const BAKILAN_GUN = 7;

/** 0 ile 1 arasına sıkıştırır. */
function sikistir(x: number, en_az: number, en_cok: number): number {
  return Math.max(en_az, Math.min(en_cok, x));
}

/**
 * Skorun eşikten doyuma kadar aldığı yol (0..1).
 *
 * Eşiğin altı buraya hiç gelmiyor — çağıran zaten `basariliMi()` ile
 * eliyor (Ü83).
 */
function skorPayi(skor: number): number {
  if (DOYUM_SKORU <= KUPON_ESIGI) return 1;
  return sikistir((skor - KUPON_ESIGI) / (DOYUM_SKORU - KUPON_ESIGI), 0, 1);
}

/** Aynı oyundan son kazanımların şansı ne kadar kıstığı (0..1]. */
export function bikkinlikKatsayisi(sonKazanim: number): number {
  return 1 / (1 + Math.max(0, sonKazanim) * BIKKINLIK);
}

/**
 * Ödülün hiç düşme şansı.
 *
 * Eşiği yeni geçen turda %50, doyum skorunda %75; aynı oyundan gelen
 * kazanımlar bunu kısıyor.
 */
export function dusmeSansi(skor: number, sonKazanim: number, odulIsareti = 0): number {
  const taban = EN_AZ_SANS + (EN_COK_SANS - EN_AZ_SANS) * skorPayi(skor);
  const isaretli = odulIsareti > 0 ? taban + ODUL_ISARETI_PAYI : taban;
  return Math.min(MUTLAK_TAVAN, isaretli) * bikkinlikKatsayisi(sonKazanim);
}

/**
 * Ağırlık dikliği.
 *
 * Yüksek skor listeyi düzleştiriyor (pahalı ödülün şansı artıyor), aynı
 * oyundan gelen kazanımlar geri dikleştiriyor.
 */
export function agirlikTabani(skor: number, sonKazanim: number): number {
  const duzluk = skorPayi(skor) * bikkinlikKatsayisi(sonKazanim);
  return DIK_TABAN - (DIK_TABAN - DUZ_TABAN) * duzluk;
}

/**
 * Ağırlıklı seçim — değere göre **sıraya** bakıyor, değerin kendisine değil.
 *
 * Çarkın Ü49'daki bulgusu burada da geçerli: `1 / değer²` formülü ödül
 * aralığı daraldığında (Ü52 ile 25–50 TL) anlamını yitiriyordu — en ucuz
 * ile en pahalı arasında iki kat varken kare almak bile ayrımı kuramıyor.
 * Sıra tabanlı ağırlık aralıktan bağımsız: kafenin tutarları ne olursa
 * olsun dağılım aynı karakterde kalıyor.
 *
 * Fark şu: çarkın katsayısı sabit (2), buradaki **skora göre değişiyor**.
 */
export function agirlikliSec(kurusDegerleri: readonly number[], taban: number): number {
  if (kurusDegerleri.length === 0) return -1;
  if (kurusDegerleri.length === 1) return 0;

  const sira = kurusDegerleri
    .map((kurus, i) => ({ i, kurus }))
    .sort((a, b) => a.kurus - b.kurus || a.i - b.i);

  // Ağırlıklar tam sayıya ölçekleniyor: `randomInt` tam sayı istiyor ve
  // kayan noktayla eşik karşılaştırması yapmak, dağılımı sessizce
  // kaydıracak bir hassasiyet oyunu olurdu.
  const OLCEK = 1_000;
  const n = sira.length;
  const kovalar = new Array<number>(n).fill(0);
  sira.forEach((o, basamak) => {
    const us = Math.min(30, n - 1 - basamak);
    kovalar[o.i] = Math.max(1, Math.round(taban ** us * OLCEK));
  });

  const tam = kovalar.reduce((t, k) => t + k, 0);
  let atis = randomInt(tam);
  for (let i = 0; i < kovalar.length; i++) {
    atis -= kovalar[i];
    if (atis < 0) return i;
  }
  return kovalar.length - 1;
}

export type MotorKarari =
  | { dusuyor: true; indeks: number }
  | { dusuyor: false; sebep: "sans" | "odul_yok" };

/**
 * Motorun tek kapısı: bu turda ödül çıkacak mı, hangisi?
 *
 * `kurusDegerleri` kafenin yayındaki anlık ödüllerinin TL değerleri;
 * dönen indeks o listeye ait.
 */
export function karar(opts: {
  skor: number;
  /** Bu oyuncunun **bu oyundan** son `BAKILAN_GUN` gündeki kazanımı. */
  sonKazanim: number;
  /** Ü91: turda yakalanan ödül işareti sayısı. Oyunda yoksa 0. */
  odulIsareti?: number;
  kurusDegerleri: readonly number[];
}): MotorKarari {
  if (opts.kurusDegerleri.length === 0) return { dusuyor: false, sebep: "odul_yok" };

  // Şans on binde bir çözünürlükle atılıyor: yüzde tek başına
  // %55,5 gibi bir değeri yuvarlayıp dağılımı kaydırırdı.
  const sans = dusmeSansi(opts.skor, opts.sonKazanim, opts.odulIsareti ?? 0);
  if (randomInt(10_000) >= Math.round(sans * 10_000)) {
    return { dusuyor: false, sebep: "sans" };
  }

  const taban = agirlikTabani(opts.skor, opts.sonKazanim);
  return { dusuyor: true, indeks: agirlikliSec(opts.kurusDegerleri, taban) };
}
