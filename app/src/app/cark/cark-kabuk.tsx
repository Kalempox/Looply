"use client";

import Link from "next/link";
import { CarkSahnesi } from "@/components/cark-sahnesi";
import { beklemeMetni } from "@/domain/bekleme-metni";
import { konumuTazele } from "@/app/oyna/konum-takibi";
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
  konumTakibi = false,
}: {
  dilimler: { baslik: string }[];
  acik: boolean;
  kapaliMetin: string;
  /** Kafenin çevirme aralığı (Ü158) — sabit değil. */
  aralikSaat: number;
  /** Ü96: karekodu yeni okutan oyuncuda sahne kendiliğinden açılıyor. */
  otomatikAc?: boolean;
  /**
   * Ü279: kafede (masa oturumu, konumu işaretli kafe) — çevirmeden önce
   * "kafedesin" okuması taze değilse bir kez okunur. Butikte hak
   * kasiyerden geliyor, konum hiç sorulmuyor.
   */
  konumTakibi?: boolean;
}) {
  return (
    <CarkSahnesi
      dilimler={dilimler}
      cevir={async () => {
        if (konumTakibi) await konumuTazele({ sor: true, zamanAsimiMs: 5_000 });
        return carkiCevir();
      }}
      kilitli={!acik}
      kapaliMetin={kapaliMetin}
      otomatikAc={otomatikAc}
      davetBaslik={acik ? "Çarkın hazır" : "Çark kapalı"}
      davetMetin="Dokun, çark tam ekranda açılsın."
      /* ⚠️ "24 saatte bir" sabit yazılıydı; Ü158'den beri süre kafenin
         ayarı. Kafe 6 saat yazdığında ekran yalan söylüyordu. */
      altMetin={`Çark ${aralikSaat} saatte bir açılıyor. Çıkan ödül doğrudan hesabına işlenir.`}
      /* 🔴 Ü278: "Ödüllerim ekranından kasada gösterebilirsin" sabit
         yazılıydı. Ü269'dan beri her ödül kafenin aktivasyon süresi kadar
         bekliyor; ürün sahibi kuponu kasada gösterilebilirler arasında
         aradı ve "hesabıma gelmedi" dedi. Oyun ekranının dili: bekleme
         cümlesi (Ü97 — saat yazmadan) ve kuponun durduğu yer. */
      kazandiMetni={(kupon) =>
        kupon?.ertelendi ? (
          <>
            {beklemeMetni(kupon.id, new Date(kupon.aktiflesme))} Kuponun hesabında —{" "}
            <Link href="/oduller" className="font-semibold underline">
              Ödüllerim
            </Link>{" "}
            ekranında &ldquo;Yakında açılıyor&rdquo; altında.
          </>
        ) : (
          <>
            Ödülün hesabına işlendi.{" "}
            <Link href="/oduller" className="font-semibold underline">
              Ödüllerim
            </Link>{" "}
            ekranından kasada gösterebilirsin.
          </>
        )
      }
    />
  );
}
