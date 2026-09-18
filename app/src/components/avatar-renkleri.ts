import palet from "./avatar-paleti.json";

/**
 * Loopy'nin özelleştirme renkleri — Ü186.
 *
 * ── 🔴 Renk üretilmiyor, HESAPLANIYOR ───────────────────────
 *
 * Her renk bir ton (`h`), bir doygunluk (`s`) ve bir parlaklık çarpanı
 * (`v`) üçlüsü. Bunlardan tek bir CSS rengi türüyor ve tarayıcı onu
 * gri katmanın üstüne **çarpma kipinde** basıyor.
 *
 * Çarpma tesadüf değil: sabit bir ton ve doygunlukta RGB, parlaklıkla
 * **doğrusal** değişiyor —
 *
 *     rgb(h, s, v) = v · rgb(h, s, 1)
 *
 * yani "her pikseli kendi parlaklığıyla çarp" demek, tam olarak
 * `mix-blend-mode: multiply`. Gölgeler bu yüzden korunuyor; renk
 * boyanmış gibi değil, o renkte üretilmiş gibi duruyor.
 *
 * Sonuç: 66 gövde × 22 şerit = 1452 kombinasyon ve **tek bir dosya bile
 * üretilmiyor**. Yeni bir renk eklemek `avatar-paleti.json`a bir satır.
 */

type Uclu = { ad: string; etiket: string; h: number; s: number; v: number };

/** Seçicinin çizdiği tek bir örnek. */
export type RenkSecenegi = { ad: string; etiket: string; hex: string };

/** Seçicide bir başlık altında duran öbek — "Açık", "Koyu", "Nötr"… */
export type RenkKumesi = { baslik: string; renkler: RenkSecenegi[] };

function hsvdenHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h * 6) % 6;
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

/**
 * Paletten hem doğrulama tablosunu hem seçicinin öbeklerini kurar.
 *
 * ⚠️ İkisi TEK geçişten çıkıyor: ayrı ayrı yazılsaydı seçicide görünen
 * bir renk doğrulamada olmayabilir ve oyuncu seçtiği rengi
 * kaydedemezdi. Testte de tam bu çiviliyor.
 *
 * ⚠️ Nötrler ÖNDE: "Krem" karakterin özgün gövdesi ve oyuncunun geri
 * dönmek isteyeceği ilk şey o. Listenin sonunda olsaydı 66 örneğin
 * altında kalırdı.
 */
function uret(
  tonlar: { ad: string; etiket: string; h: number }[],
  kademeler: { ad: string; etiket: string; s: number; v: number }[],
  notrler: Uclu[],
): { tablo: Map<string, string>; kumeler: RenkKumesi[] } {
  const tablo = new Map<string, string>();
  const kumeler: RenkKumesi[] = [];

  const notrKume: RenkSecenegi[] = [];
  for (const n of notrler) {
    const hex = hsvdenHex(n.h, n.s, n.v);
    tablo.set(n.ad, hex);
    notrKume.push({ ad: n.ad, etiket: n.etiket, hex });
  }
  kumeler.push({ baslik: "Sade", renkler: notrKume });

  for (const k of kademeler) {
    const renkler: RenkSecenegi[] = [];
    for (const t of tonlar) {
      // Kademe ada giriyor: tek kademeli şeritte `turuncu` demek daha
      // okunur olurdu ama gövdeye kademe eklendiğinde adlar çakışırdı.
      const ad = `${t.ad}-${k.ad}`;
      const hex = hsvdenHex(t.h, k.s, k.v);
      tablo.set(ad, hex);
      renkler.push({ ad, etiket: `${t.etiket} · ${k.etiket}`, hex });
    }
    kumeler.push({ baslik: k.etiket, renkler });
  }

  return { tablo, kumeler };
}

const govde = uret(palet.tonlar, palet.govdeKademeleri, palet.govdeNotrleri);
const serit = uret(palet.tonlar, palet.seritKademeleri, palet.seritNotrleri);

/** Doğrulama tabloları — `domain/avatar.ts` bunlara bakıyor. */
export const GOVDE_RENKLERI = govde.tablo;
export const SERIT_RENKLERI = serit.tablo;

/** Seçicinin çizdiği öbekler. */
export const GOVDE_KUMELERI = govde.kumeler;
export const SERIT_KUMELERI = serit.kumeler;

export const VARSAYILAN_GOVDE = palet.varsayilanGovde;
export const VARSAYILAN_SERIT = palet.varsayilanSerit;

/**
 * Bilinmeyen ad varsayılana düşüyor.
 *
 * ⚠️ Sessizce düşmek burada DOĞRU, `domain/avatar.ts`teki
 * doğrulamanın aksine: orası yazma yolu ve yanlış değeri reddetmesi
 * gerekiyor, burası çizim yolu. Elde eski bir değer kalmışsa oyuncuya
 * bozuk bir avatar göstermektense varsayılanı göstermek daha iyi.
 */
export function govdeRengi(ad: string | undefined): string {
  return GOVDE_RENKLERI.get(ad ?? "") ?? GOVDE_RENKLERI.get(VARSAYILAN_GOVDE)!;
}

export function seritRengi(ad: string | undefined): string {
  return SERIT_RENKLERI.get(ad ?? "") ?? SERIT_RENKLERI.get(VARSAYILAN_SERIT)!;
}

/**
 * Renk verilmeyen her avatarın düştüğü CSS değeri.
 *
 * ── 🔴 Neden prop değil de CSS değişkeni ────────────────────
 *
 * Loopy on beş ayrı yerde çiziliyor: yuvada, balonda, kartlarda,
 * kutlamada, durum şeridinde, katalogda. Rengi prop olarak taşımak, o
 * on beş yerin arasındaki her bileşene (`LoopySozu`, `LoopyOdullu`,
 * `AvatarYuvasi`, `RozetKutlamasi`…) iki alan daha eklemek ve birkaç
 * sunucu sayfasında bir sorgu daha açmak demekti.
 *
 * CSS özel değişkenleri **miras alınıyor**: oyuncuyu bilen sayfa bir
 * kez `<LoopyRenkleri>` basıyor, altındaki bütün avatarlar o rengi
 * görüyor. Bilmeyen yüzeyler (kafe paneli, vitrin) değişkeni hiç
 * görmüyor ve yedek değere — karakterin özgün hâline — düşüyor.
 *
 * ⚠️ Yedek değer burada HESAPLANIYOR, CSS'e elle yazılmıyor: iki yere
 * yazılsaydı palet değişince biri geride kalırdı.
 */
export const GOVDE_DEGISKENI = `var(--loopy-govde, ${govdeRengi(undefined)})`;
export const SERIT_DEGISKENI = `var(--loopy-serit, ${seritRengi(undefined)})`;
