"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Platform panelinin gezinmesi — Ü130.
 *
 * ── Neden şimdi gerekti ─────────────────────────────────────
 *
 * Platform tarafı üç ekrandan ibaretti (başvurular, acil durdurma, giriş)
 * ve her biri kendi altındaki bağlantılarla birbirine bağlanıyordu.
 * Ü130 ile ekran sayısı ikiye katlandı; "hangi ekranlar var" sorusunun
 * tek bir cevabı olmalı.
 *
 * ⚠️ **Kafe panelinin kenar çubuğu DEĞİL, üst şerit.** İki panel
 * birbirine benzemesin: platform tarafında çalışan kişi aynı anda kafe
 * panelini de açıyor ve ikisi aynı görünseydi hangi taraftaki veriye
 * baktığını karıştırırdı. Bu ekranlarda bütün kafelerin verisi var —
 * karıştırmanın bedeli yüksek.
 */

const DURAKLAR = [
  { yol: "/platform/basvurular", ad: "Başvurular" },
  { yol: "/platform/kafeler", ad: "Kafeler" },
  { yol: "/platform/karekodlar", ad: "Karekodlar" },
  { yol: "/platform/oyuncular", ad: "Oyuncular" },
  { yol: "/platform/mesaj", ad: "Mesaj" },
  { yol: "/platform/acil", ad: "Acil durdurma" },
] as const;

export function PlatformGezinme() {
  const yol = usePathname();

  return (
    <nav
      aria-label="Platform paneli"
      className="mb-8 flex flex-wrap gap-1 border-b border-cizgi pb-px"
    >
      {DURAKLAR.map((d) => {
        const aktif = yol.startsWith(d.yol);
        return (
          <Link
            key={d.yol}
            href={d.yol}
            aria-current={aktif ? "page" : undefined}
            className={`border-b-2 px-3 py-2.5 text-[14px] transition-colors ${
              aktif
                ? "border-yazi font-semibold text-yazi"
                : "border-transparent text-yazi-sonuk hover:text-yazi"
            }`}
          >
            {d.ad}
          </Link>
        );
      })}
    </nav>
  );
}
