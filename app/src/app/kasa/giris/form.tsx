"use client";

import { useActionState } from "react";
import { girisEylemi, type KasaGirisDurumu } from "./actions";
import { useCihazId } from "@/lib/cihaz";

const BOS: KasaGirisDurumu = {};

type Konum = { ok: true; lat: number; lng: number; dogrulukM: number } | { ok: false; hata: string };

/**
 * Tarayıcıdan tek bir taze konum — Ü285.
 *
 * İzin reddi ayrı söyleniyor: kasiyerin yapabileceği tek şey izni vermek,
 * "tekrar dene" onu hiçbir yere götürmez.
 */
function konumAl(): Promise<Konum> {
  return new Promise((coz) => {
    if (!("geolocation" in navigator)) {
      coz({ ok: false, hata: "Bu tarayıcı konum veremiyor. Kasayı telefondan ya da tabletten aç." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => coz({ ok: true, lat: p.coords.latitude, lng: p.coords.longitude, dogrulukM: p.coords.accuracy }),
      (e) =>
        coz({
          ok: false,
          hata:
            e.code === e.PERMISSION_DENIED
              ? "Kasaya girmek için konum izni gerekli. Tarayıcının ayarlarından bu siteye konum izni ver."
              : "Konumun alınamadı. Kafenin içinde tekrar dene.",
        }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  });
}

/**
 * Kasiyer PIN formu.
 *
 * Ü285: kasiyer hiçbir şey seçmiyor ve cihaz kaydı yok — dört hane girip
 * "Giriş"e basıyor; konum o an bir kez okunup PIN'le birlikte gidiyor ve
 * sunucu kafeyi konumdan çözüyor. Cihaz kimliği yalnızca oturumun
 * kaydında (hangi cihazdan açıldı), bir kapı değil.
 *
 * Tasarım kasa tezgâhına göre: büyük rakamlar, geniş dokunma alanı, tek
 * elle erişilebilir. Loş kafede, kalabalık kasada, üç saniyede.
 */
export function KasaGirisFormu() {
  const cihazId = useCihazId();
  const [durum, action, bekliyor] = useActionState(
    async (onceki: KasaGirisDurumu, form: FormData): Promise<KasaGirisDurumu> => {
      // Eksik PIN'de konum boşuna sorulmasın; sunucu da aynı kuralı sınıyor.
      if (String(form.get("pin") ?? "").replace(/\D/g, "").length !== 4) {
        return { hata: "PIN dört haneli olmalı." };
      }
      const k = await konumAl();
      if (!k.ok) return { hata: k.hata };
      form.set("lat", String(k.lat));
      form.set("lng", String(k.lng));
      form.set("dogruluk", String(k.dogrulukM));
      return girisEylemi(onceki, form);
    },
    BOS,
  );

  return (
    <form action={action} className="w-full max-w-xs">
      <input type="hidden" name="cihazId" value={cihazId} />

      {durum.hata && (
        <div className="mb-5 rounded-lg border border-tehlike/60 bg-yuzey px-4 py-3 text-center text-[14px] text-tehlike">
          {durum.hata}
        </div>
      )}

      <label className="block">
        <span className="mb-3 block text-center etiket-caps text-yazi-sonuk">
          Personel PIN&apos;i
        </span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          autoFocus
          className="w-full rounded-lg border border-cizgi bg-cukur py-6 text-center font-data text-4xl tracking-[0.5em] text-yazi focus:border-vurgu focus:outline-none"
          placeholder="••••"
        />
      </label>

      <button
        type="submit"
        disabled={bekliyor}
        className="mt-5 w-full rounded-lg bg-vurgu py-5 font-display text-[18px] font-bold text-white disabled:opacity-45"
      >
        {bekliyor ? "Konum ve PIN kontrol ediliyor…" : "Giriş"}
      </button>
    </form>
  );
}
