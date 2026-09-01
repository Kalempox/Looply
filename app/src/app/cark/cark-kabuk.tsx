"use client";

import Link from "next/link";
import { Cark } from "@/components/cark";
import { carkiCevir } from "./actions";

/**
 * Günlük çarkın istemci sarmalayıcısı.
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
  if (!acik) {
    return (
      <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-7">
        <div className="pointer-events-none opacity-40">
          <Cark
            dilimler={dilimler}
            cevir={async () => ({ ok: false as const, hata: kapaliMetin })}
            altMetin=""
            kazandiMetni=""
          />
        </div>
        <p className="mt-5 text-center text-[14px] leading-relaxed text-yazi-sonuk">
          {kapaliMetin}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-7">
      <Cark
        dilimler={dilimler}
        cevir={carkiCevir}
        altMetin="Çark 24 saatte bir açılıyor. Çıkan ödül doğrudan hesabına işlenir."
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
