/**
 * İş günü.
 *
 * Defterlerdeki `business_date` takvim günü değil, kafenin iş günü olmalı —
 * gece 01:00'de oynanan oyun, kafenin bakışında hâlâ önceki günün cirosu.
 * Şimdilik Europe/Istanbul takvim günü kullanılıyor; iş gününün kaçta
 * döndüğü S13 ile birlikte karara bağlanacak (bütçe haftasının başlangıcı
 * aynı sorunun haftalık hâli).
 *
 * Sunucunun saat dilimi ne olursa olsun aynı sonucu verir — bu yüzden
 * `toISOString().slice(0,10)` kullanılmıyor: o UTC gününü verir ve
 * Türkiye'de gece yarısından sonra üç saat boyunca yanlış olur.
 */
const BICIM = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD — Türkiye takvim günü. */
export function isGunu(an: Date = new Date()): string {
  return BICIM.format(an);
}

/**
 * İstanbul saatiyle şu an kaçıncı dakikadayız (0–1439).
 *
 * `getHours()` DEĞİL: sunucu UTC'de koşuyor ve gece yarısı çevresinde üç
 * saat kayıyor. Aynı hata `isGunu()`de bir kez yapıldı, ikinci kez
 * yapılmıyor.
 *
 * Ü97'de `butce.ts`'ten buraya taşındı: bekleme metni de gün dilimini
 * (sabah/gündüz/akşam/gece) bilmek zorunda ve iki modülün aynı saat
 * hesabını ayrı ayrı yazması, birinin bir gün yanlış düzeltilmesi demek.
 */
export function istanbulDakikasi(an: Date): number {
  const [saat, dakika] = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(an)
    .split(":")
    .map(Number);
  return saat * 60 + dakika;
}

/**
 * `YYYY-MM-DD` → "10 Eylül" (Ü101).
 *
 * ⚠️ Burada duruyor, panelin istemci bileşeninde değil: hem sunucu
 * (başlık) hem istemci (gün gezinme) yazıyor. İstemci dosyasında
 * kalınca sunucu onu çağıramadı — *"Attempted to call gunYaz() from the
 * server but gunYaz is on the client"* — ve panel geçmiş günde 500 döndü.
 *
 * `timeZone: "UTC"` ve öğlen saati: tarih dizgisi zaten gün, saat dilimi
 * kayması bir gün öncesine düşürmesin.
 */
export function gunYaz(gun: string): string {
  return new Date(`${gun}T12:00:00Z`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** `YYYY-MM-DD` + gün. UTC üzerinden: saat dilimi kayması olmasın. */
export function gunKaydir(gun: string, fark: number): string {
  const d = new Date(`${gun}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + fark);
  return d.toISOString().slice(0, 10);
}

/* ── Hafta hesapları — bütçe dönemi (Ü25) ────────────────── */

/** `YYYY-MM-DD` → UTC gün başlangıcı. Saat dilimi kayması olmasın diye UTC. */
function coz(gunIso: string): Date {
  return new Date(`${gunIso}T00:00:00Z`);
}

const GUN_MS = 86_400_000;

/** Günü `YYYY-MM-DD` biçimine döndürür. */
function yaz(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Günün içinde bulunduğu haftanın pazartesisi.
 *
 * Ü25: bütçe dönemi pazartesi başlar. Tüm kafelerin aynı takvimde olması
 * raporların karşılaştırılabilir kalmasını sağlıyor.
 *
 * JavaScript'te `getUTCDay()` pazar için 0 döner; Türkiye'de hafta pazartesi
 * başladığı için pazar, **önceki** haftanın son günü sayılıyor.
 */
export function pazartesi(gunIso: string): string {
  const d = coz(gunIso);
  const gun = d.getUTCDay();
  const geriGit = gun === 0 ? 6 : gun - 1;
  return yaz(new Date(d.getTime() - geriGit * GUN_MS));
}

export function gunEkle(gunIso: string, gun: number): string {
  return yaz(new Date(coz(gunIso).getTime() + gun * GUN_MS));
}

/** İki gün arasındaki tam gün farkı (b - a). */
export function gunFarki(a: string, b: string): number {
  return Math.round((coz(b).getTime() - coz(a).getTime()) / GUN_MS);
}
