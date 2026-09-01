import Link from "next/link";

/**
 * Ödüller ve kampanyalar — tek başlık, iki sekme.
 *
 * ── Neden birleşti ──────────────────────────────────────────
 *
 * İkisi panelde ayrı satırlardı ve kafe sahibi hangisinin ne olduğunu
 * karıştırıyordu. Şimdi tek başlık altında iki sekme: aradığı şey
 * "müşteriye ne veriyorum" ve o soru tek yerde cevaplanıyor.
 *
 * ── Ama kavramlar birleşmedi ────────────────────────────────
 *
 * Ekran birleşti, mekanizma değil — birleşemez de:
 *
 *   **Ödül**     oyuncunun puanıyla aldığı ya da oyunda kazandığı şey.
 *                Tek kullanımlık kupon üretiyor, kişiye özel.
 *   **Kampanya** kafenin herkese açtığı yüzde indirimi. Kupona bağlı
 *                değil, oyun oynamayı gerektirmiyor.
 *
 * İkisi tek tabloya konsaydı "bu indirim puanla mı alınıyor, herkese mi
 * açık" sorusu kayıt düzeyinde belirsizleşirdi.
 */
export function OdulSekmeleri({ aktif }: { aktif: "odul" | "kampanya" }) {
  const sekmeler = [
    { ad: "odul", etiket: "Ödüller", yol: "/kafe/panel/oduller" },
    { ad: "kampanya", etiket: "Kampanyalar", yol: "/kafe/panel/kampanyalar" },
  ] as const;

  return (
    <div
      role="tablist"
      aria-label="Ödüller ve kampanyalar"
      className="mb-8 grid grid-cols-2 gap-1 rounded-lg border border-cizgi bg-cukur p-1"
    >
      {sekmeler.map((s) => (
        <Link
          key={s.ad}
          href={s.yol}
          role="tab"
          aria-selected={aktif === s.ad}
          className={`rounded-md px-4 py-2.5 text-center text-[15px] font-semibold transition-colors ${
            aktif === s.ad ? "bg-yuzey text-yazi shadow-sm" : "text-yazi-sonuk hover:text-yazi"
          }`}
        >
          {s.etiket}
        </Link>
      ))}
    </div>
  );
}
