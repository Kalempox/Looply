import type { CSSProperties } from "react";

/**
 * Ayır'ın yüzeyleri — Ü261.
 *
 * Aile koyu arcade sahnesinde (Blok · Düşen · Sekme · Yılan · Bıçak ·
 * Kırıcı · 2048) ve bu dosya aynı derinliği kuruyor. Ayırt edici renk
 * **lavanta**: `oyuncu-renk.ts`'te oyunun kimliği o, tahtanın da o
 * olması gerekiyor (Ü85).
 *
 * ── 🔴 Sıvı renkleri oyunun DİLİ ────────────────────────────
 *
 * Oyuncu tahtayı renkten okuyor: hangi iki tüpün birleşebileceği
 * **yalnızca** renkten anlaşılıyor. 2048'de (Ü260) karonun üstünde sayı
 * da yazıyordu; burada yazmıyor, o yüzden kural daha sert.
 */

export const AYIR_RENK = {
  isik: "#a5b4fc",
  derin: "#1e1b4b",
} as const;

/**
 * Sıvı renkleri — kod 1..6, dizinin 0. elemanı 1 numaralı renk.
 *
 * ── 🔴 Gözle seçilen palet ÖLÇÜMDE çöktü ───────────────────
 *
 * İlk palet elle seçilmişti (mercan · kehribar · zümrüt · gök · orkide ·
 * kum) ve normal görmede gayet iyiydi. Sonra **renk körlüğü
 * benzetiminden** geçirildi:
 *
 *   normal görme   en yakın çift ΔE 49,1  ✓
 *   deuteranopi    en yakın çift ΔE  6,8  🔴 gök ↔ orkide
 *   protanopi      en yakın çift ΔE 22,1
 *
 * Yani kırmızı-yeşil renk körü bir oyuncu için gök ile orkide **aynı
 * renkti** — ve bu oyunda aynı renk demek, birleşebilir demek.
 * Deuteranopi erkeklerin yaklaşık %5'inde var.
 *
 * ⚠️ İlk yorum *"kırmızı-yeşil çifti bilerek uzak tutuldu"* diyordu ve
 * yanlış yere bakıyordu: çakışan çift kırmızı-yeşil değil **mavi-mor**.
 * Renk körlüğünün hangi çifti çökerteceği sezgiyle bilinmiyor.
 *
 * ── Palet seçilmedi, ARANDI ─────────────────────────────────
 *
 * 32 tonluk havuzdan, üç görme biçiminde (normal · deuteranopi ·
 * protanopi) **en yakın çiftin ΔE'sini birlikte en büyük yapan** altılı
 * arandı. Sahnenin kendi rengi de aramaya girdi: sıvı öteki sıvılardan
 * ayrışsa bile zeminden ayrışmazsa tüp boş görünür.
 *
 *   en zayıf halka:  6,8  →  36,2   (beş kat)
 *
 * ⚠️ Sıra da ölçüm sonucu: ilk bölümlerde yalnızca **üç** renk
 * görünüyor, o yüzden kod 1-2-3 en ayrışan üçlü (ΔE 49,4). Dördüncü
 * renk girince en zayıf halka 37,4'e, beşincide 36,2'ye iniyor.
 *
 * Test `oyun-motoru.test.ts` içinde ve palet değişirse düşer.
 */
const SIVILAR = [
  "#34d399", // 1 zümrüt  ┐
  "#6d28d9", // 2 mor     ├ ilk üç: en ayrışan üçlü (ΔE 49,4)
  "#f97316", // 3 turuncu ┘
  "#be123c", // 4 vişne
  "#fde047", // 5 sarı
  "#38bdf8", // 6 gök
] as const;

export const AYIR_SIVI_SAYISI = SIVILAR.length;

/** Bir renk kodunun tonu. Kod 1'den başlıyor. */
export function ayirSivisi(kod: number): string {
  return SIVILAR[Math.min(SIVILAR.length, Math.max(1, kod)) - 1];
}

/** Sahne — ailenin koyu zemini, lavantaya kayan bulut. */
export function ayirSahnesi(): CSSProperties {
  return {
    background:
      "radial-gradient(120% 80% at 50% -10%, #2e2a6e 0%, #1e1b4b 45%, #0e0c26 100%)",
  };
}

/**
 * Tüpün camı.
 *
 * ── 🔴 Düz alfa DEĞİL, kenardan kenara degrade ──────────────
 *
 * Koyu zeminde düz alfa daha önce ölçülmüştü (Düşen'in tahtasında):
 * gövde %56 alfayla parlaklığın %39'unu kaybediyor, açık tonla
 * doygunluğun %28'ini. İkisi de "canlı sıvı" isteğiyle çakışıyor.
 *
 * Camı cam yapan şey gövdenin soluk olması değil, **ardının görünmesi ve
 * kenarının ışığı kırması**: gövde ortada neredeyse saydam, iki kenarda
 * hafifçe parlıyor.
 *
 * ⚠️ `backdrop-filter: blur()` kullanılmadı — yedi tüp her dokunuşta
 * yeniden çizilir ve telefonda bedeli görünür.
 */
export function ayirCami(secili: boolean): CSSProperties {
  return {
    background:
      "linear-gradient(100deg, rgb(255 255 255 / .14) 0%, rgb(255 255 255 / .03) 38%, " +
      "rgb(255 255 255 / .03) 62%, rgb(255 255 255 / .12) 100%)",
    border: `1.5px solid ${secili ? "rgb(165 180 252 / .95)" : "rgb(165 180 252 / .3)"}`,
    borderRadius: "10px 10px 26px 26px",
    boxShadow: secili
      ? "0 0 0 3px rgb(165 180 252 / .28), 0 8px 26px rgb(0 0 0 / .45)"
      : "inset 0 -10px 22px rgb(0 0 0 / .32)",
  };
}

/**
 * Tüpün içindeki sıvının tamamı — **tek** bir degrade.
 *
 * ── 🔴 Dilim başına bir öge denendi ve tarayıcıda çizgi bıraktı ──
 *
 * İlk yazımda her birim ayrı bir `<span>`di ve yüksekliği `%25`ti.
 * 225 piksellik tüpte bu 56,25 piksel ediyor; kesir yuvarlanınca iki
 * komşu ögenin arasında saç teli kadar bir boşluk kalıyor ve arkadaki
 * koyu tüp oradan sızıyordu. Ekranda **aynı renkten dört birim, dört
 * ayrı blok** gibi görünüyordu.
 *
 * Bu oyunda o çizgi süs meselesi değil: oyuncu "kaç birim üst üste"
 * sorusunu renkten okuyor ve bitişik aynı renk **tek parça** demek.
 *
 * Tek degrade ikisini birden çözüyor: kesir kalmıyor ve aynı renk iki
 * durak yan yana gelince sınır kendiliğinden kayboluyor.
 *
 * @param tup Dipten üste renk kodları.
 */
export function ayirSivi(tup: readonly number[], kapasite: number): CSSProperties {
  if (tup.length === 0) return { background: "transparent" };
  const pay = 100 / kapasite;
  const duraklar = tup.map((kod, i) => {
    const ton = ayirSivisi(kod);
    return `${ton} ${(i * pay).toFixed(4)}% ${((i + 1) * pay).toFixed(4)}%`;
  });
  /* Son durağın üstü saydam: tüpün boş kalan kısmı cam. */
  return {
    background: `linear-gradient(to top, ${duraklar.join(", ")}, transparent ${(tup.length * pay).toFixed(4)}%)`,
  };
}

/**
 * Camın parıltısı — sıvının **üstünde** duran ayrı bir katman.
 *
 * ⚠️ Parıltı sıvıya değil cama ait: dilimlerin üstüne tek tek
 * konsaydı sıvı seviyesi değiştikçe parıltı da kırılırdı.
 */
export function ayirParilti(): CSSProperties {
  return {
    background:
      "linear-gradient(90deg, rgb(0 0 0 / .20) 0%, rgb(255 255 255 / .18) 26%, " +
      "rgb(255 255 255 / .04) 46%, rgb(0 0 0 / .10) 78%, rgb(0 0 0 / .26) 100%)",
  };
}

/** HUD hapı — ailenin öteki ekranlarıyla aynı. */
export function ayirPanel(): CSSProperties {
  return {
    background: "rgb(0 0 0 / .32)",
    border: "1px solid rgb(165 180 252 / .22)",
    borderRadius: 999,
  };
}

/**
 * Ödül paketini taşıyan tüpün halkası — Ü207/Ü234.
 *
 * ⚠️ Tüpün rengini değiştirmiyor, çevresine halka koyuyor: renk sıvının
 * bilgisi ve onu ezmek oyuncunun tahtayı okumasını bozardı.
 */
export function ayirPaketi(): CSSProperties {
  return {
    borderRadius: "10px 10px 26px 26px",
    boxShadow: "inset 0 0 0 3px #a7f3d0, 0 0 18px rgb(16 185 129 / .75)",
  };
}

/**
 * Kalan hak göstergesi — azaldıkça ısınıyor.
 *
 * ⚠️ Sayı tek başına yetmiyor: hak turun tek kaynağı ve oyuncunun ona
 * bakmadan da azaldığını hissetmesi gerekiyor.
 */
export function ayirHakRengi(kalan: number): string {
  if (kalan <= 5) return "#fb7185";
  if (kalan <= 10) return "#fbbf24";
  return "#ffffff";
}
