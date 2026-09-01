"use client";

import Link from "next/link";
import { Cark } from "@/components/cark";
import { carkiCevir } from "./actions";

/**
 * Günlük çarkın istemci sarmalayıcısı.
 *
 * ── Kapalıyken de aynı bileşen ──────────────────────────────
 *
 * Önceki sürüm çarkı kapalıyken **başka bir ağaçla** değiştiriyordu ve
 * çevirme anında tam olarak bu oluyordu: kupon yazılıyor, sunucu "artık
 * kapalı" diyor, çark sökülüyor. Oyuncu ne dönüşü ne ödülünü görüyordu.
 * Şimdi tek bir `Cark` var; `kilitli` yalnızca düğmeyi kapatıyor.
 *
 * Çark kapalıyken de **dilimler gösteriliyor**: oyuncu neyi kaçırdığını
 * değil, yarın neyin döneceğini görüyor. Boş bir ekran "çark kaldırıldı"
 * diye okunurdu.
 */
export function GunlukCark({
  dilimler,
  acik,
  kapaliMetin,
}: {
  dilimler: { baslik: string }[];
  acik: boolean;
  kapaliMetin: string;
}) {
  return (
    <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-7">
      <Cark
        dilimler={dilimler}
        cevir={acik ? carkiCevir : async () => ({ ok: false as const, hata: kapaliMetin })}
        kilitli={!acik}
        altMetin={
          acik ? "Çark 24 saatte bir açılıyor. Çıkan ödül doğrudan hesabına işlenir." : kapaliMetin
        }
        kazandiMetni={
          <>
            Ödülün hesabına işlendi.{" "}
            <Link href="/oduller" className="font-semibold text-yazi underline">
              Ödüllerim
            </Link>{" "}
            ekranından kasada gösterebilirsin.
          </>
        }
      />
    </div>
  );
}
