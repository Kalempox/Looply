/**
 * Deterministik rastgelelik — S5'in temeli.
 *
 * Sunucunun skoru yeniden hesaplayabilmesi için oyunun durumu
 * `(tohum, girdi olayları)` fonksiyonu olmak zorunda. Bu da rastgeleliğin
 * **tohumdan türemesi** demek: `Math.random()` kullanan bir oyun asla
 * doğrulanamaz, çünkü sunucu aynı parçaları üretemez.
 *
 * Bu yüzden `Math.random()` `src/oyunlar/` altında lint kuralıyla yasak.
 *
 * ── Neden mulberry32 ────────────────────────────────────────
 *
 * Tüm işlemler 32-bit tamsayı (`|0`, `>>>0`). Kayan nokta yok, yani
 * istemci ve sunucu — farklı JS motorları olsalar bile — birebir aynı
 * diziyi üretir. Kriptografik değil; olması da gerekmiyor. Oyuncunun
 * sıradaki parçayı tahmin etmesi bir güvenlik açığı değil, çünkü ödül
 * skordan değil **sunucunun doğruladığı** skordan geliyor.
 */

export type Rastgele = {
  /** 0 ile n-1 arası tamsayı. */
  tamsayi(n: number): number;
  /** Diziden bir eleman seçer. */
  sec<T>(dizi: readonly T[]): T;
  /** Diziyi yerinde karıştırır (Fisher–Yates) ve döndürür. */
  karistir<T>(dizi: T[]): T[];
};

/**
 * Metin tohumu 32-bit sayıya indirir (FNV-1a).
 *
 * Tohum sunucuda üretilip istemciye metin olarak gidiyor; iki taraf da
 * aynı sayıya inmeli.
 */
function tohumSayisi(tohum: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < tohum.length; i++) {
    h ^= tohum.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tohumla(tohum: string): Rastgele {
  let durum = tohumSayisi(tohum);

  /** mulberry32 — sonraki 32-bit değer. */
  const sonraki = (): number => {
    durum = (durum + 0x6d2b79f5) >>> 0;
    let t = durum;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };

  const tamsayi = (n: number): number => {
    if (n <= 0) throw new Error("rastgele.tamsayi: n > 0 olmalı");
    // Modulo sapması: 2^32 tam bölünmediğinde büyük değerler biraz daha
    // olası olur. Oyun için önemsiz ama düzeltmesi ucuz — reddet ve yeniden çek.
    const sinir = Math.floor(0x100000000 / n) * n;
    let d = sonraki();
    while (d >= sinir) d = sonraki();
    return d % n;
  };

  return {
    tamsayi,
    sec: <T>(dizi: readonly T[]): T => {
      if (dizi.length === 0) throw new Error("rastgele.sec: dizi boş");
      return dizi[tamsayi(dizi.length)];
    },
    karistir: <T>(dizi: T[]): T[] => {
      for (let i = dizi.length - 1; i > 0; i--) {
        const j = tamsayi(i + 1);
        [dizi[i], dizi[j]] = [dizi[j], dizi[i]];
      }
      return dizi;
    },
  };
}
