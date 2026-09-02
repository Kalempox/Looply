"use client";

import { useState } from "react";

/**
 * Davet bağlantısını paylaşma.
 *
 * Üç yol birden var çünkü sahada üçü de gerekiyor:
 *   · **Paylaş** — Web Share API. Telefonda tek dokunuşla WhatsApp'a gider,
 *     ama masaüstü tarayıcıların çoğunda yok; varsa gösteriliyor.
 *   · **Kopyala** — her yerde çalışan yol.
 *   · **Bağlantının kendisi** — okunur hâlde duruyor. Kopyalama izni
 *     reddedilse bile kullanıcı elle seçip alabilir; sessiz çıkmaz sokak yok.
 */
export function BaglantiKopyala({ baglanti }: { baglanti: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const [paylasilabilir] = useState(() => typeof navigator !== "undefined" && !!navigator.share);

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(baglanti);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      // İzin reddedildi veya güvensiz bağlam. Bağlantı zaten ekranda —
      // kullanıcı elle seçebilir, bu yüzden hata kutusu açmıyoruz.
      setKopyalandi(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="rounded-lg border border-cizgi bg-cukur px-3 py-2.5 font-data text-[12px] break-all text-yazi-sonuk">
        {baglanti}
      </div>

      <div className="mt-2.5 flex gap-2.5">
        <button
          type="button"
          onClick={kopyala}
          className="flex-1 rounded-lg border border-vurgu py-3 font-display text-[15px] font-bold text-vurgu"
        >
          {kopyalandi ? "Kopyalandı" : "Bağlantıyı kopyala"}
        </button>

        {paylasilabilir && (
          <button
            type="button"
            onClick={() =>
              navigator
                .share({ title: "Looply", text: "Looply'de oyna, kafede indirim kazan.", url: baglanti })
                .catch(() => {})
            }
            className="flex-1 rounded-lg bg-vurgu py-3 font-display text-[15px] font-bold text-white"
          >
            Paylaş
          </button>
        )}
      </div>
    </div>
  );
}
