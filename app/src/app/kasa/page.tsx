import Link from "next/link";
import { kasiyerGerekli } from "@/domain/yetki";
import { bugunkuOzet } from "@/domain/kupon";
import { isletmeTuru } from "@/domain/cark-kosul";
import { KasaTarayici } from "./tarayici";
import { cikisEylemi } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kasa · Looply" };

/**
 * Kasa ekranı — E7.
 *
 * *"Sistemin sahada ayakta kalıp kalmayacağını bu ekran belirler. Kasiyer
 * kullanmazsa hiçbir rapor doğru olmaz."*
 *
 * Bu yüzden ekranda başka hiçbir şey yok: tek giriş alanı, tek büyük düğme.
 * Menü yok, sekme yok, ayar yok. Altta günün özeti duruyor çünkü o, akışın
 * parçası değil sonucu — işletmecinin kasayla karşılaştıracağı sayı.
 */
export default async function KasaSayfasi() {
  const o = await kasiyerGerekli();
  const [ozet, turu] = await Promise.all([bugunkuOzet(o.cafeId), isletmeTuru(o.cafeId)]);

  return (
    <main className="flex min-h-dvh flex-col items-center bg-zemin px-5 py-8 text-yazi">
      <div className="mb-7 text-center">
        <div className="etiket-caps text-vurgu">
          Looply Kasa
        </div>
        <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight">
          Kupon onayı
        </h1>
      </div>

      <KasaTarayici />

      {/*
        ── Ü137: butikte ikinci iş ─────────────────────

        Kafede kasiyerin tek işi var: kupon onaylamak. Butikte ikinci bir
        iş daha var — alışverişe çark hakkı vermek.

        ⚠️ Bağlantı **yalnızca butikte** çiziliyor. Kafede de dursaydı
        kasiyer tutar girer, hiçbir koşul tutmaz ve sistemin bozuk
        olduğunu sanırdı: kafede kasa tutar girmiyor.

        ⚠️ Dosyanın kendi kuralı "ekranda başka hiçbir şey yok" diyor ve
        haklı — bu yüzden ikinci iş büyük bir düğme değil, tarayıcının
        altında duran tek satırlık bir bağlantı. Kasiyer kupon onaylamaya
        geldiğinde gözü takılmıyor.
      */}
      {turu === "butik" && (
        <Link
          href="/kasa/cark"
          className="mt-5 w-full max-w-md rounded-lg border border-cizgi py-3.5 text-center text-[15px] font-semibold text-yazi-sonuk transition-colors hover:border-vurgu hover:text-vurgu"
        >
          Alışverişe çark hakkı ver →
        </Link>
      )}

      {/* ── Günün özeti ────────────────────────────────── */}
      <section className="mt-12 w-full max-w-md border-t border-cizgi pt-6">
        <h2 className="etiket-caps text-yazi-sonuk">
          Bugün
        </h2>

        {ozet.toplamAdet === 0 ? (
          <p className="mt-3 text-[14px] text-yazi-sonuk">Bugün henüz kupon kullanılmadı.</p>
        ) : (
          <>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-data text-3xl leading-none font-bold text-vurgu tabular">
                {ozet.toplamAdet}
              </span>
              <span className="text-[14px] text-yazi-sonuk">
                kupon · {(ozet.toplamKurus / 100).toLocaleString("tr-TR")} TL
              </span>
            </div>

            <ul className="mt-4 flex flex-col gap-1.5">
              {ozet.kalemler.map((k) => (
                <li
                  key={k.baslik}
                  className="flex items-baseline justify-between text-[13px] text-yazi-sonuk"
                >
                  <span>{k.baslik}</span>
                  <span className="font-data tabular">{k.adet}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <form action={cikisEylemi} className="mt-10">
        <button type="submit" className="text-[13px] text-yazi-sonuk underline">
          Vardiyayı kapat
        </button>
      </form>
    </main>
  );
}
