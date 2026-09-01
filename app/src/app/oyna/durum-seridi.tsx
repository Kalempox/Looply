"use client";

import { useState, useTransition } from "react";
import { konumBildir, konumReddedildi, demoKafedeSay } from "./actions";

/**
 * Durum şeridi — ekranın en üstünde, her zaman görünür.
 *
 * Oyuncunun tek merak ettiği şey burada: "kazanabiliyor muyum?"
 * Beş durumu var ve her biri farklı renkte; renk tek başına anlam taşımasın
 * diye metin de her durumda açıkça yazıyor.
 *
 * Konum reddi bir HATA gibi gösterilmiyor. Tarayıcıda konum kullanıcı
 * onayına bağlı; reddetmek normal bir tercih. Akış çökmüyor, yalnızca
 * büyük ödüller kilitli kalıyor (docs/07 §3).
 */

export type SeritDurumu =
  | { tur: "disarida" }
  | { tur: "konum_bekliyor"; kafe: string; masa: string }
  | { tur: "dogrulandi"; kafe: string; masa: string; mesafeM: number | null }
  | { tur: "uzak"; kafe: string; masa: string; mesafeM: number }
  | { tur: "konum_kapali"; kafe: string; masa: string };

export function DurumSeridi({
  durum,
  demoKapisi,
}: {
  durum: SeritDurumu;
  /** Demo kısayolu görünsün mü — sunucu karar veriyor, canlıda hep false. */
  demoKapisi?: boolean;
}) {
  const [bekliyor, basla] = useTransition();
  const [gecici, setGecici] = useState<string | null>(null);

  function konumIste() {
    if (!navigator.geolocation) {
      basla(() => konumReddedildi());
      return;
    }
    setGecici("Konum alınıyor…");
    navigator.geolocation.getCurrentPosition(
      (p) =>
        basla(async () => {
          const c = await konumBildir(p.coords.latitude, p.coords.longitude);
          setGecici(
            c.durum === "uzak"
              ? `Kafeden ${c.mesafeM} metre uzaktasın`
              : c.durum === "kafe_konumu_yok"
                ? "Bu kafe konumunu henüz işaretlememiş — kazanım açılamıyor"
                : c.durum === "olmadi"
                  ? "Konum doğrulanamadı"
                  : null,
          );
        }),
      () => {
        setGecici(null);
        basla(() => konumReddedildi());
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const stil = {
    disarida: "border-cizgi text-yazi-sonuk",
    konum_bekliyor: "border-odul/50 text-odul-koyu",
    dogrulandi: "border-vurgu/50 text-vurgu",
    uzak: "border-tehlike/60 text-tehlike",
    konum_kapali: "border-odul/50 text-odul-koyu",
  }[durum.tur];

  return (
    <div className={`sticky top-0 z-10 -mx-5 mb-8 border-b bg-yuzey/90 px-5 py-3 backdrop-blur ${stil}`}>
      <div className="flex items-center gap-3">
        <Nokta tur={durum.tur} />

        <div className="min-w-0 flex-1">
          {durum.tur === "disarida" ? (
            <>
              <div className="etiket-caps">Kafe dışındasın</div>
              <div className="text-[12px] text-yazi-sonuk">
                Oynayabilirsin ama puan ve kupon kazanamazsın
              </div>
            </>
          ) : (
            <>
              <div className="etiket-caps truncate">
                {durum.kafe} · {durum.masa}
              </div>
              <div className="text-[12px] text-yazi-sonuk">
                {gecici ??
                  {
                    konum_bekliyor: "Kazanabilmek için konumunu doğrula",
                    dogrulandi:
                      durum.tur === "dogrulandi" && durum.mesafeM != null
                        ? `Doğrulandı · ${durum.mesafeM} m`
                        : "Doğrulandı",
                    uzak: durum.tur === "uzak" ? `Kafeden ${durum.mesafeM} m uzaktasın` : "",
                    konum_kapali: "Konum kapalı — büyük ödüller kilitli",
                  }[durum.tur]}
              </div>
            </>
          )}
        </div>

        {(durum.tur === "konum_bekliyor" || durum.tur === "konum_kapali" || durum.tur === "uzak") && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={konumIste}
              disabled={bekliyor}
              className="etiket-caps rounded border border-current px-3 py-1.5 disabled:opacity-50"
            >
              {bekliyor ? "…" : durum.tur === "konum_bekliyor" ? "Doğrula" : "Tekrar"}
            </button>

            {/* Demo kısayolu — kafenin kendi koordinatını kullanır, kural
                gevşemez. Canlıda hiç render edilmiyor. */}
            {demoKapisi && (
              <button
                type="button"
                onClick={() =>
                  basla(async () => {
                    const c = await demoKafedeSay();
                    setGecici(
                      c.durum === "dogrulandi" ? null : "Demo konumu uygulanamadı",
                    );
                  })
                }
                disabled={bekliyor}
                className="etiket-caps rounded border border-odul px-2.5 py-1.5 text-odul-koyu disabled:opacity-50"
                title="Yalnızca geliştirmede görünür"
              >
                Kafedeyim
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Nokta({ tur }: { tur: SeritDurumu["tur"] }) {
  const dolu = tur === "dogrulandi";
  const nabiz = tur === "konum_bekliyor";
  return (
    <span
      aria-hidden
      className={`size-2.5 shrink-0 rounded-full border border-current ${dolu ? "bg-current" : ""} ${nabiz ? "nabiz" : ""}`}
    />
  );
}
