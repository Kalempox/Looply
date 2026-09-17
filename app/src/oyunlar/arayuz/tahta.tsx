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

/**
 * Tahtanın kabı — kartların yüzey ailesinden, ama desensiz.
 *
 * ── 🔴 Tahta KOYULAŞTI, hücreler beyaza yaklaştı — Ü166 ─────
 *
 * Ürün sahibi *"oyunların arayüzleri çok çirkin"* dedi. Ölçüldü ve
 * tek bir sayı bütün izlenimi açıklıyordu: **boş hücre ile tahtanın
 * zemini arasındaki kontrast 1,10 : 1.** (1,00 iki rengin aynı olması
 * demek.) Yani ızgara ızgara değildi — üstünde hafif bir doku olan
 * düz bir levhaydı. Dört oyunda da aynı: blok 1,10 · düşen 1,13 ·
 * yılan 1,11 · kelime 1,12.
 *
 * İlginç olan, asıl şüphelinin masum çıkması: dolu-boş kontrastı
 * zaten 3,3–4,5 ile iyiydi. Parçalar görünüyordu; **görünmeyen şey
 * tahtaydı.**
 *
 * ── Neden ilişki ters çevrildi ──────────────────────────────
 *
 * Önceden zemin açık (`r.zemin`) ve hücre onun üstünde biraz koyuydu
 * (`ana` %8). İki açık ton yan yana duruyordu. Döşeme oyunlarının
 * kurduğu ilişki tersi: **tahta koyu bir tepsi, hücreler onun üstünde
 * duran açık karolar.** O zaman aradaki boşluk kendiliğinden ızgara
 * çizgisi oluyor ve hiçbir çizgi çizmeye gerek kalmıyor.
 *
 * Ölçülerek seçildi (`ana` %36 tepsi, hücre beyaz %82):
 * ızgara kontrastı 1,10 → **1,45–1,65**. Daha yükseği (%40+) denendi
 * ve ızgara parçalardan daha çok bağırmaya başlıyor.
 *
 * ⚠️ En zayıf halka gök (blok): `ana`sı diğerlerinden açık olduğu için
 * aynı alfada daha düşük kontrast veriyor. Eşik ona göre seçildi.
 */
export function tahtaStili(oyunId: string): CSSProperties {
  const r = RENK[oyunRengi(oyunId)];
  return {
    background: `${r.ana}5c`,
    border: `1px solid ${r.ana}70`,
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
      /*
        Beyazın kendisi değil, koyu tepsinin üstünde **beyaz %82**:
        kalan %18 tepsiden sızıyor ve hücre oyunun renginden bir
        parça taşıyor (Ü85'in kuralı duruyor — boş tahta bile hangi
        oyunda olduğunu söylüyor). Tam beyaz olsaydı dört oyunun boş
        tahtası birbirinin aynısı olurdu.

        ⚠️ Renk tepsiden TÜRETİLMİYOR, üstüne konuyor. `${"$"}{r.ana}0f` gibi
        bir değer tepsinin üstünde onu daha da koyulaştırırdı — hücre
        tepsiden açık olmalı ki aradaki boşluk ızgara çizgisi gibi
        okunsun.
      */
      return {
        background: "rgba(255,255,255,0.82)",
        boxShadow: `inset 0 1px 2px ${r.koyu}14`,
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
