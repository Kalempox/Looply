import type { CSSProperties } from "react";

/**
 * Blok Kırıcı'nın yüzeyleri — Ü244.
 *
 * Aile koyu arcade sahnesinde (Blok · Düşen · Sekme · Bıçak) ve bu
 * dosya aynı derinliği kuruyor. Ayırt edici renk **kehribar**:
 * `oyuncu-renk.ts`'te oyunun kimliği o ve tahtanın da o olması
 * gerekiyor, yoksa karo ile tahta ayrı iki oyun gibi okunuyor (Ü85).
 *
 * ⚠️ Tuğla tonları **cana göre**, rastgele değil: oyuncu bir tuğlanın
 * kaç vuruş daha istediğini rengine bakıp bilmeli. Ş3'ün (`docs/18`)
 * istediği açıklık bu — tahtada gizli hiçbir şey yok.
 */

export const KIRICI_RENK = {
  isik: "#fbbf24",
  derin: "#78350f",
  top: "#fef3c7",
  palet: "#fbbf24",
} as const;

/**
 * Tuğla tonları — dizinin sırası **kalan can**.
 *
 * İki canlı tuğla koyu ve çerçeveli, tek canlı açık ve düz. Tek fark
 * parlaklık değil **doku**: renk körü bir oyuncu da çerçeveden
 * ayırt edebiliyor.
 */
const TUGLA_TONU: readonly { zemin: string; kenar: string }[] = [
  { zemin: "#f59e0b", kenar: "#fcd34d" },
  { zemin: "#b45309", kenar: "#f59e0b" },
];

/** Sahne — ailenin koyu zemini, kehribara kayan bulut. */
export function kiriciSahnesi(): CSSProperties {
  return {
    background:
      "radial-gradient(120% 80% at 50% -10%, #452406 0%, #2a1505 45%, #1a0d03 100%)",
  };
}

/**
 * Oyun alanının çerçevesi.
 *
 * ⚠️ Alt kenar yok: taban topun **çıktığı** yer ve orada bir çizgi,
 * topun geri sekeceğini söyleyen bir yalan olurdu.
 */
export function kiriciCerceve(): CSSProperties {
  return {
    background: "rgb(0 0 0 / .26)",
    borderLeft: "2px solid rgb(251 191 36 / .30)",
    borderRight: "2px solid rgb(251 191 36 / .30)",
    borderTop: "2px solid rgb(251 191 36 / .30)",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    boxShadow: "inset 0 0 40px rgb(0 0 0 / .45)",
  };
}

/** Tuğla — kalan canına göre. */
export function kiriciTuglasi(can: number): CSSProperties {
  const t = TUGLA_TONU[Math.min(TUGLA_TONU.length, Math.max(1, can)) - 1];
  return {
    background: `linear-gradient(160deg, ${t.kenar} 0%, ${t.zemin} 62%)`,
    borderRadius: 4,
    boxShadow:
      can > 1
        ? `inset 0 0 0 2px ${t.kenar}, 0 2px 0 rgb(0 0 0 / .30)`
        : "0 2px 0 rgb(0 0 0 / .26)",
  };
}

/**
 * Ödül paketini taşıyan tuğla — Ü207: yalnızca `kazandirir` ise
 * çiziliyor.
 *
 * ⚠️ Aileden farklı bir renk (nane) kullanılıyor ve kasten: paket
 * kehribar tonlarından biri olsaydı "üç canlı tuğla" diye okunurdu.
 */
export function kiriciOdulu(): CSSProperties {
  return {
    background: "linear-gradient(160deg, #a7f3d0 0%, #10b981 70%)",
    borderRadius: 4,
    boxShadow: "inset 0 0 0 2px #ecfdf5, 0 0 14px rgb(16 185 129 / .55)",
  };
}

/** Palet. */
export function kiriciPaleti(): CSSProperties {
  return {
    background: `linear-gradient(180deg, #fde68a 0%, ${KIRICI_RENK.palet} 55%, #b45309 100%)`,
    borderRadius: 999,
    boxShadow: "0 0 18px rgb(251 191 36 / .45), inset 0 -2px 0 rgb(0 0 0 / .25)",
  };
}

/** Top. */
export function kiriciTopu(): CSSProperties {
  return {
    background: `radial-gradient(circle at 34% 30%, #fff 0%, ${KIRICI_RENK.top} 45%, #f59e0b 100%)`,
    borderRadius: "50%",
    boxShadow: "0 0 14px rgb(254 243 199 / .70)",
  };
}

/**
 * İnen duvarın altındaki uyarı çizgisi.
 *
 * Duvar palete yaklaştıkça beliriyor — turun ikinci bitiş sebebi
 * (`kiriciEzildi`) oyuncuya ancak böyle görünür oluyor. Sayı ya da
 * yazı değil, çünkü oyuncunun gözü zaten tahtada.
 */
export function kiriciTehlike(yakinlik: number): CSSProperties {
  return {
    background: `linear-gradient(180deg, rgb(239 68 68 / 0) 0%, rgb(239 68 68 / ${(
      yakinlik * 0.5
    ).toFixed(2)}) 100%)`,
  };
}

/** HUD hapı — ailenin öteki ekranlarıyla aynı. */
export function kiriciPanel(): CSSProperties {
  return {
    background: "rgb(0 0 0 / .32)",
    border: "1px solid rgb(251 191 36 / .22)",
    borderRadius: 999,
  };
}
