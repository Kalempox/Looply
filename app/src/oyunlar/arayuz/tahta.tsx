"use client";

import type { CSSProperties } from "react";
import { RENK, oyunRengi, type OyuncuRengi } from "@/components/oyuncu-renk";

/**
 * Oyun tahtalarının ortak yüzeyi — Ü85.
 *
 * ── Neden ortak bir dosya ───────────────────────────────────
 *
 * Ü71'in dersi: yüzey tek yerden gelmezse her turda bir ekran geride
 * kalıyor. Bilet, fırsat kartı ve oyun kartı o yüzden `kartStili()`ye
 * bağlandı; tahtalar bağlanmamıştı ve Ü83'e kadar `bg-vurgu` / `bg-cukur`
 * ile — yani **panelin resmî paletiyle** — çiziliyorlardı.
 *
 * ── Neden oyunun kendi rengi ────────────────────────────────
 *
 * Ü61 iki dil kurdu: oyuncu canlı, panel resmî. Tahta oyuncunun en uzun
 * baktığı yüzey ve tek mavi vurguyla çiziliyordu; üstündeki kart Blok'ta
 * gök mavisi, Düşen'de pembeydi ve tahtaya girince renk kayboluyordu.
 * Artık `OYUN_RENGI` tahtanın içine kadar iniyor.
 *
 * ── Hücreler neden gradyanlı ────────────────────────────────
 *
 * Ü68'in bulgusu: üstten içeriye düşen beyaz bir çizgi, tek başına en çok
 * derinlik veren detay. Dolu hücre bir **nesne** gibi duruyor, boyanmış
 * bir kare gibi değil. Boş hücre tersi — çukur, hafif içe gölgeli.
 */

/** Bir tahta hücresinin hangi durumda olduğu. */
export type HucreDurumu =
  | "bos"
  | "dolu"
  /** Düşen'de inmekte olan parça — yerleşmişten ayrı görünmeli. */
  | "aktif"
  /** Blok'ta parçanın ineceği yer, sığıyor. */
  | "onizleme"
  /** Blok'ta parçanın ineceği yer, sığmıyor. */
  | "gecersiz";

/** Tahtanın kabı — kartların yüzey ailesinden, ama desensiz. */
export function tahtaStili(oyunId: string): CSSProperties {
  const r = RENK[oyunRengi(oyunId)];
  return {
    background: r.zemin,
    border: `1px solid ${r.ana}33`,
  };
}

/**
 * Tek hücrenin stili.
 *
 * ⚠️ Renkler satır içi `style` ile veriliyor, Tailwind sınıfıyla değil:
 * oyunun rengi çalışma zamanında belli oluyor ve Tailwind'in tarayıcısı
 * `bg-[${r.canli}]` gibi bir şeyi göremez — sınıf üretilmez, hücre
 * renksiz kalır.
 */
export function hucreStili(oyunId: string, durum: HucreDurumu): CSSProperties {
  const r = RENK[oyunRengi(oyunId)];

  switch (durum) {
    case "bos":
      // Nötr gri değil, oyunun renginin çok soluk hâli: boş tahta bile
      // hangi oyunda olduğunu söylüyor.
      return {
        background: `${r.ana}14`,
        boxShadow: `inset 0 1px 2px ${r.koyu}1a`,
      };

    case "dolu":
      return {
        background: `linear-gradient(180deg, ${r.canli} 0%, ${r.ana} 100%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 1px ${r.koyu}33`,
      };

    case "aktif":
      // Düşen'de inen parça altın: yerleşmiş bloklardan ayrılması şart,
      // yoksa oyuncu hangisinin kendi elinde olduğunu göremez.
      return {
        background: "linear-gradient(180deg, #f5cf5e 0%, #d4af37 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 2px rgba(122,86,10,0.35)",
      };

    case "onizleme":
      return {
        background: `${r.canli}88`,
        boxShadow: `inset 0 0 0 1.5px ${r.ana}`,
      };

    case "gecersiz":
      return {
        background: "rgba(190,18,60,0.28)",
        boxShadow: "inset 0 0 0 1.5px rgba(190,18,60,0.7)",
      };
  }
}

/** Oyunun rengini okumak isteyen ekranlar için kısayol. */
export function oyunTonu(oyunId: string): (typeof RENK)[OyuncuRengi] {
  return RENK[oyunRengi(oyunId)];
}
