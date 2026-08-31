"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { defteriTemizleEylemi } from "./actions";

/** Üç saniyede bir sunucudan yeniden çeker — yan sekmede açık bırakmak için. */
export function Yenileyici() {
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [router]);

  return null;
}

export function TemizleDugmesi() {
  const [bekliyor, basla] = useTransition();

  return (
    <button
      type="button"
      disabled={bekliyor}
      onClick={() => basla(() => defteriTemizleEylemi())}
      className="rounded-lg border border-cizgi px-4 py-2 etiket-caps text-yazi-sonuk disabled:opacity-50"
    >
      {bekliyor ? "Temizleniyor…" : "Defteri temizle"}
    </button>
  );
}
