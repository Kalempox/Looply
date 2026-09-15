import Link from "next/link";
import { kasiyerGerekli } from "@/domain/yetki";
import * as kosul from "@/domain/cark-kosul";
import { CarkHakkiFormu } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Çark hakkı · Looply" };

/**
 * Kasada çark hakkı verme — Ü137.
 *
 * ── Butik akışının kasa tarafı ──────────────────────────────
 *
 * Kafede çark hakkını oyun veriyor. Butikte oyun yok: hakkı **kasiyer**
 * veriyor, alışveriş tutarına bakarak.
 *
 * ⚠️ Bu ekran kasiyerin **ikinci** ekranı. Birincisi kupon onaylama
 * (`/kasa`) ve o değişmedi — biri hak veriyor, öbürü kupon harcıyor.
 * Tek ekrana sıkıştırmak, kuyruğun ortasındaki kasiyere iki farklı işi
 * aynı yerde sordurmak olurdu.
 *
 * ── Koşul yoksa ekran dürüst davranıyor ─────────────────────
 *
 * İşletme hiç koşul tanımlamadıysa form gösterilmiyor: girilen her tutar
 * "hakkı yok" dönerdi ve kasiyer sistemin bozuk olduğunu sanırdı. Yerine
 * yöneticinin ne yapması gerektiği yazıyor.
 */
export default async function KasaCarkSayfasi() {
  const o = await kasiyerGerekli();
  const kosullar = (await kosul.listele(o.cafeId)).filter((k) => k.aktif);

  return (
    <main className="mx-auto w-full max-w-md px-5 py-10">
      <header className="mb-8">
        <p className="etiket-caps text-yazi-sonuk">Kasa</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
          Çark hakkı
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-yazi-sonuk">
          Alışveriş tutarını gir. Koşul tutuyorsa müşteriye okutacağı karekod
          çıkıyor.
        </p>
      </header>

      {kosullar.length === 0 ? (
        <div className="rounded-2xl border border-odul/60 bg-odul-zemin px-5 py-6">
          <p className="text-[15px] leading-relaxed">
            Bu işletmede tanımlı <strong>çark koşulu yok</strong> — hiçbir tutar hak
            kazandırmaz.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
            İşletme yöneticisi panelden <strong>Çark → Koşullar</strong> bölümünden
            tanımlamalı.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 rounded-2xl border border-cizgi bg-cukur px-5 py-4">
            <p className="etiket-caps text-[10px] text-yazi-sonuk">Açık koşullar</p>
            <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed">
              {kosullar.map((k) => (
                <li key={k.id} className="flex gap-2">
                  <span aria-hidden className="text-vurgu">
                    ·
                  </span>
                  {kosul.kosulMetni(k)}
                </li>
              ))}
            </ul>
            {kosullar.length > 1 && (
              <p className="mt-2.5 border-t border-cizgi pt-2.5 text-[12px] text-yazi-sonuk">
                Herhangi biri tutarsa hak doğuyor.
              </p>
            )}
          </div>

          <CarkHakkiFormu />
        </>
      )}

      <nav className="mt-10 border-t border-cizgi pt-6 text-[14px]">
        <Link href="/kasa" className="text-vurgu underline">
          ← Kupon onaylama ekranı
        </Link>
      </nav>
    </main>
  );
}
