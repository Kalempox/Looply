"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";

/** Hareketi azalt tercihi — `useSyncExternalStore` için kaynak. */
const SORGU = "(prefers-reduced-motion: reduce)";

function abone(yenile: () => void) {
  const s = window.matchMedia(SORGU);
  s.addEventListener("change", yenile);
  return () => s.removeEventListener("change", yenile);
}

/**
 * Yanıyor sanıp sağdan sola kaçan Loopy — Ü183.
 *
 * ── 🔴 CSS değil, ürün sahibinin videosu ────────────────────
 *
 * İlk sürüm iki duruş karesini CSS'te değiştirip gövdeyi `translateX`
 * ile kaydırıyordu. Ürün sahibi *"sen CSS ile berbat yapıyorsun, hiç
 * olmuyor"* dedi ve haklıydı: iki karenin arası koşu döngüsü için
 * yetmiyor, kaydırma da koşuyu değil kaymayı anlatıyordu.
 *
 * Şimdi hareket ürün sahibinin ürettiği **yeşil ekran videosundan**
 * geliyor: 100 kare, gerçek koşu döngüsü, kapaktan çıkan duman ve
 * sırttaki alev dahil. Yeşil kesilip hareketli WebP'ye çevrildi
 * (`scripts/loopy-kacan-uret.py`).
 *
 * ── Neden `<img>` ve hareketli WebP ─────────────────────────
 *
 * Karakter sahnenin üstünde koşuyor, alfa şart. MP4'te alfa yok,
 * WebM/VP9'un alfası Safari'de çalışmıyor (Ü173). Hareketli WebP
 * alfalı, tek dosya ve sıradan bir `<img>`.
 *
 * ⚠️ Bedeli: hızı koddan ayarlanamıyor ve **hareketi azalt** ayarı onu
 * durduramıyor — CSS animasyonu değil, görselin kendi içinde. O yüzden
 * `prefers-reduced-motion` burada elle sorgulanıyor ve hareketli görsel
 * hiç basılmıyor.
 */
export function LoopyKosan() {
  /*
    ⚠️ `useSyncExternalStore`, efekt içinde `setState` DEĞİL.

    İlk yazımda efekt içinde durum güncelleniyordu ve lint haklı olarak
    itiraz etti: o kalıp ilk çizimden sonra ikinci bir çizim tetikliyor
    ve tercihini "hareketi azalt" yapmış olan kişi animasyonu bir kare
    boyunca görüyor — tam da kaçınmak istediğimiz şey.

    Sunucu anlık görüntüsü `true`: sunucuda medya sorgusu yok ve
    varsayılan davranış animasyonun olması. Tercihini değiştirmiş olan
    için istemci ilk çizimde zaten `false` döndürüyor.
  */
  const hareketVar = useSyncExternalStore(
    abone,
    () => !window.matchMedia(SORGU).matches,
    () => true,
  );

  if (!hareketVar) return null;

  /*
    🔴 Genişlik ekranın TAMAMI ve boyut ayarı yok.

    Karakter sağ kenardan girip sol kenardan çıkıyor ve bu hareket
    videonun İÇİNDE — konumu da, hızı da orada. Bileşene "şu kadar
    büyük olsun" demek, geçişin nereden başlayıp nerede biteceğini
    bozardı: dar bir kutuda karakter ekranın ortasında belirip ortasında
    kaybolurdu.

    ⚠️ `width`/`height` öznitelikleri oranı (480×248) baştan veriyor:
    olmasalardı görsel inene kadar satır yer kaplamaz ve indiği anda
    sahne zıplardı.
  */
  return (
    <Image
      src="/avatar/loopy-kacan.webp"
      alt=""
      aria-hidden
      width={480}
      height={248}
      /*
        🔴 `unoptimized` ŞART: görsel iyileştirici hareketli WebP'yi
        yeniden kodlarken **tek kareye düşürüyor**. Optimize edilmiş
        hâli 437 KB yerine 20 KB olurdu ama duran bir resim olurdu.
      */
      unoptimized
      className="pointer-events-none h-auto w-full select-none"
    />
  );
}
