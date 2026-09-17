"use client";

import Link from "next/link";
import { CarkSahnesi } from "@/components/cark-sahnesi";
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
  otomatikAc,
  aralikSaat,
}: {
  dilimler: { baslik: string }[];
  acik: boolean;
  kapaliMetin: string;
  /** Kafenin çevirme aralığı (Ü158) — sabit değil. */
  aralikSaat: number;
  /** Ü96: karekodu yeni okutan oyuncuda sahne kendiliğinden açılıyor. */
  otomatikAc?: boolean;
}) {
  return (
    <CarkSahnesi
      dilimler={dilimler}
      cevir={carkiCevir}
      kilitli={!acik}
      kapaliMetin={kapaliMetin}
      otomatikAc={otomatikAc}
      davetBaslik={acik ? "Çarkın hazır" : "Çark kapalı"}
      davetMetin="Dokun, çark tam ekranda açılsın."
      /* ⚠️ "24 saatte bir" sabit yazılıydı; Ü158'den beri süre kafenin
         ayarı. Kafe 6 saat yazdığında ekran yalan söylüyordu. */
      altMetin={`Çark ${aralikSaat} saatte bir açılıyor. Çıkan ödül doğrudan hesabına işlenir.`}
      kazandiMetni={
        <>
          Ödülün hesabına işlendi.{" "}
          <Link href="/oduller" className="font-semibold underline">
            Ödüllerim
          </Link>{" "}
          ekranından kasada gösterebilirsin.
        </>
      }
    />
  );
}
