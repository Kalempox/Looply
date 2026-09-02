import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { KasaGirisFormu } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kasa · Looply" };

/**
 * Kasa girişi.
 *
 * Kasa ekranı koyu paletle çiziliyor — kafenin diğer panelleri kâğıt beyazı
 * ama kasa tezgâhı loş ve ekran uzaktan okunmalı. E7: kasiyer ekranı sonradan
 * eklenen bir panel değil, birinci sınıf bir yüzey. Kasiyer kullanmazsa
 * hiçbir rapor doğru olmaz.
 */
export default async function KasaGirisi() {
  const o = await oturum.oku();
  if (o?.rol === "kasiyer") redirect("/kasa");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-zemin px-6 text-yazi">
      <div className="mb-10 text-center">
        <div className="etiket-caps text-vurgu">
          Looply
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Kasa</h1>
        <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-yazi-sonuk">
          Kupon onaylamak için personel PIN&apos;inle gir. Oturum sekiz saat açık kalır.
        </p>
      </div>

      <KasaGirisFormu />

      <p className="mt-10 max-w-xs text-center text-[12px] leading-relaxed text-yazi-sonuk">
        PIN yalnızca işletme yöneticisinin kaydettiği cihazlarda çalışır.
      </p>
    </main>
  );
}
