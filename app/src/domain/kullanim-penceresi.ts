import { istanbulDakikasi } from "@/lib/tarih";

/**
 * Kuponun kullanılabileceği gün ve saat penceresi (Ü103).
 *
 * ── Neden var ───────────────────────────────────────────────
 *
 * İşletmenin asıl derdi **boş saatler**. Yoğun saatte zaten dolu olan
 * kafeye indirimle müşteri çekmenin anlamı yok; *"ücretsiz filtre kahve,
 * yalnızca hafta içi 14:00–17:00"* diyebilmek ödülü bir trafik
 * yönlendirme aracına çeviriyor.
 *
 * ── ⚠️ Bu kısıt OYUNCUYA GÖSTERİLİYOR ───────────────────────
 *
 * E9 kuponun TL değerini saklıyor, Ü97 açılma saatini saklıyor — ama
 * ikisi de oyuncunun **elindeki şeyi kullanabilmesini** engellemiyor.
 * Kullanım penceresi o türden değil: bilinmezse oyuncu kasaya gidiyor,
 * reddediliyor ve suçu kafeye yüklüyor. Gizli kural, tutulmamış söz
 * demektir.
 *
 * Bu yüzden modül iki iş yapıyor: **kontrol** (kasa) ve **cümle**
 * (oyuncu ekranı). İkisi aynı yerde duruyor ki biri değişip diğeri
 * kalmasın — pencere metni ile pencere kuralı ayrışırsa oyuncuya yazan
 * cümle yalan olur.
 *
 * ── Gün numaraları ──────────────────────────────────────────
 *
 * Postgres `EXTRACT(dow)` düzeni: 0 = Pazar … 6 = Cumartesi. JavaScript
 * `getDay()` de aynı. İki taraf aynı sayıyı kullanıyor, çeviri yok.
 */

export type Pencere = {
  /** Kullanılabilir günler (0=Pazar…6=Cumartesi). Boş/null = her gün. */
  gunler: number[] | null;
  /** Başlangıç saati (0–23). null = her saat. */
  baslangicSaati: number | null;
  /** Bitiş saati (1–24). null = her saat. */
  bitisSaati: number | null;
};

const GUN_ADI = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const GUN_KISA = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

const HAFTA_ICI = [1, 2, 3, 4, 5];
const HAFTA_SONU = [0, 6];

/** Pencere hiç kısıt taşımıyor mu? */
export function serbestMi(p: Pencere): boolean {
  return (p.gunler == null || p.gunler.length === 7) && p.baslangicSaati == null;
}

/**
 * İstanbul saatiyle bu an pencerenin içinde mi?
 *
 * ⚠️ `getDay()` **kullanılmıyor**: sunucu UTC'de koşuyor ve gece yarısı
 * çevresinde gün üç saat kayıyor. Aynı hata `isGunu()`de bir kez yapıldı.
 */
export function icindeMi(p: Pencere, an: Date = new Date()): boolean {
  if (p.gunler != null && p.gunler.length > 0) {
    if (!p.gunler.includes(istanbulGunu(an))) return false;
  }

  if (p.baslangicSaati != null && p.bitisSaati != null) {
    const saat = istanbulDakikasi(an) / 60;
    if (saat < p.baslangicSaati || saat >= p.bitisSaati) return false;
  }

  return true;
}

/**
 * İstanbul saatiyle haftanın günü (0=Pazar…6=Cumartesi).
 *
 * `getDay()` DEĞİL: sunucu UTC'de koşuyor ve gece yarısı çevresinde gün
 * kayıyor — cumartesi 01:00'de UTC hâlâ cuma.
 */
const KISA_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function istanbulGunu(an: Date): number {
  const kisa = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
  }).format(an);
  return KISA_EN.indexOf(kisa);
}

/** Saat penceresini yazar: "14:00–17:00". */
function saatYaz(bas: number, bit: number): string {
  const iki = (n: number) => String(n).padStart(2, "0");
  return `${iki(bas)}:00–${iki(bit === 24 ? 0 : bit)}:00`;
}

/**
 * Günleri yazar.
 *
 * Hafta içi ve hafta sonu **özel olarak adlandırılıyor**: "Pzt, Sal, Çar,
 * Per, Cum" yerine "hafta içi" hem kısa hem de kafenin kafasındaki
 * kavramın kendisi.
 */
function gunYaz(gunler: number[]): string {
  const s = [...gunler].sort((a, b) => a - b);
  const esit = (a: number[]) => a.length === s.length && a.every((x, i) => x === s[i]);

  if (s.length === 7) return "her gün";
  if (esit(HAFTA_ICI)) return "hafta içi";
  if (esit(HAFTA_SONU)) return "hafta sonu";
  if (s.length === 1) return GUN_ADI[s[0]];
  return s.map((g) => GUN_KISA[g]).join(", ");
}

/**
 * Oyuncuya ve kasiyere gösterilen cümle. Kısıt yoksa `null`.
 *
 * Kısıt yokken cümle üretmiyoruz: *"her gün, her saat kullanılabilir"*
 * satırı ekranda yer kaplar ve hiçbir şey söylemez.
 */
export function pencereYaz(p: Pencere): string | null {
  if (serbestMi(p)) return null;

  const gun = p.gunler != null && p.gunler.length > 0 && p.gunler.length < 7 ? gunYaz(p.gunler) : null;
  const saat =
    p.baslangicSaati != null && p.bitisSaati != null
      ? saatYaz(p.baslangicSaati, p.bitisSaati)
      : null;

  if (gun && saat) return `${gun} ${saat} arası`;
  if (gun) return `Yalnızca ${gun}`;
  if (saat) return `Yalnızca ${saat} arası`;
  return null;
}

/**
 * Kasiyerin göreceği ret cümlesi.
 *
 * ⚠️ Kasiyere **ne zaman geçerli olduğu** söyleniyor, yalnızca "geçersiz"
 * değil. Kasiyer müşteriye bir şey söylemek zorunda; elinde cevap yoksa
 * "sistem kabul etmiyor" der ve suç ürüne kalır.
 */
export function retCumlesi(p: Pencere): string {
  const metin = pencereYaz(p);
  return metin
    ? `Bu kupon şu anda kullanılamıyor — ${metin.toLocaleLowerCase("tr-TR")} geçerli.`
    : "Bu kupon şu anda kullanılamıyor.";
}
