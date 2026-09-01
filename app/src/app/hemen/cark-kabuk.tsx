"use client";

import { useState } from "react";
import Link from "next/link";
import { Cark } from "@/components/cark";
import { carkiCevir } from "./actions";

/**
 * Misafirin çarkı (Ü49).
 *
 * Sayfayı yenileyen ziyaretçi çarkı ikinci kez çeviremiyor: kazandığı ödül
 * imzalı çerezde duruyor ve burada sonuç ekranı olarak geri geliyor. Aksi
 * hâlde "beğenmediğim ödülü yenileyip değiştiririm" yolu açık kalırdı.
 *
 * ── Neden `useState` ile dondurulmuş bir kopya ──────────────
 *
 * `kazanilan` sunucudan, çerezden okunuyor. Çevirme eylemi çerezi yazınca
 * Next sunucu bileşenlerini yeniden çiziyor ve prop **çevirme anında**
 * doluyordu: çark daha dönerken yerini "kazandın" kutusuna bırakıyordu.
 * Animasyon hiç görülmüyordu.
 *
 * `useState` başlangıç değeri yalnızca ilk render'da hesaplanıyor. Yani
 * karar "sayfa açıldığında elinde ödül var mıydı" sorusuna göre veriliyor;
 * sonradan gelen prop değişimi ağacı değiştiremiyor. Kazandığını çeviren
 * oyuncuya `Cark` kendi sonuç ekranını gösteriyor — animasyondan sonra.
 */
export function MisafirCarki({
  dilimler,
  kazanilan,
}: {
  dilimler: { baslik: string }[];
  kazanilan: string | null;
}) {
  const [acilistakiOdul] = useState(kazanilan);

  if (acilistakiOdul) {
    return (
      <div className="text-center">
        <div className="etiket-caps text-odul-koyu">Çarktan çıkan ödülün</div>
        <div className="mt-2 font-display text-2xl leading-tight font-extrabold">{acilistakiOdul}</div>
        <p className="mt-3 text-[14px] leading-relaxed text-yazi-sonuk">
          Kullanmak için hesabını aç — ödül hesabına işlenecek.
        </p>
        <Link
          href="/giris"
          className="mt-5 inline-block rounded-lg bg-vurgu px-6 py-3.5 font-display text-[16px] font-bold tracking-tight text-white"
        >
          Hesap aç ve al
        </Link>
      </div>
    );
  }

  return (
    <Cark
      dilimler={dilimler}
      cevir={carkiCevir}
      altMetin="Bir kez çevir. Çıkan ödülü kullanmak için hesap açman gerekiyor."
      kazandiMetni={
        <>
          Kullanmak için hesabını aç.{" "}
          <Link href="/giris" className="font-semibold text-yazi underline">
            Hesap aç
          </Link>
        </>
      }
    />
  );
}
