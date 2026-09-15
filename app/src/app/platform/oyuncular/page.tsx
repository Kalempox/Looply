import { platformGerekli } from "@/domain/yetki";
import { oyuncular } from "@/domain/platform";
import { IsletmeSayfa, IsletmeBaslik, Rozet, isletmeGirdi } from "@/components/isletme";
import { PlatformGezinme } from "../gezinme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Oyuncular · Looply" };

const SAYFA = 50;

/**
 * Oyuncular — Ü130.
 *
 * ── 🔴 Telefon MASKELİ ──────────────────────────────────────
 *
 * docs/08 §3: liste ekranı hiçbir role tam numara göstermiyor. Burada da
 * göstermiyor ve bu, "admin paneli" olmasına rağmen böyle. Gerekçesi
 * basit: bir listeyi açmak bir karar değil, tek bir numarayı açmak
 * karardır — ve kayıtta görünmesi gereken şey o karar.
 *
 * Pazarlama gönderimi için tam numara gerekiyor ama listeden geçmiyor:
 * `pazarlamaKitlesi()` onu doğrudan gönderim yoluna veriyor ve kendi
 * denetim izini yazıyor.
 *
 * ── Arama neden yalnızca açık sayfada ───────────────────────
 *
 * Ad ve telefon şifreli; her şifreleme farklı blob üretiyor, yani `LIKE`
 * hiçbir şey bulmaz. Süzgeç çözdükten sonra bellekte çalışıyor ve
 * dolayısıyla **yalnızca açık sayfayı** süzüyor. Ekran bunu saklamıyor —
 * saklasaydı "aradım, bulamadım, demek ki yok" diye yanlış sonuca
 * varılırdı.
 */
export default async function OyuncularSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; s?: string }>;
}) {
  await platformGerekli();
  const sp = await searchParams;
  const sayfa = Math.max(Number(sp.s ?? 1) || 1, 1);
  const arama = sp.q ?? "";

  const { satirlar, toplam } = await oyuncular({
    arama,
    limit: SAYFA,
    offset: (sayfa - 1) * SAYFA,
  });

  const sonSayfa = Math.max(Math.ceil(toplam / SAYFA), 1);
  const rizali = satirlar.filter((o) => o.ticariIletiRizasi).length;

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="Platform" alt={`${toplam.toLocaleString("tr-TR")} kayıtlı oyuncu.`}>
        Oyuncular
      </IsletmeBaslik>

      <PlatformGezinme />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1.5 block text-[13px] font-semibold">Ara</span>
          <input
            name="q"
            defaultValue={arama}
            placeholder="Ad ya da maskeli numara"
            className={isletmeGirdi}
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-vurgu px-5 py-3 font-display text-[15px] font-bold text-white"
        >
          Ara
        </button>
      </form>

      {arama && (
        <p className="mb-5 rounded-lg border border-cizgi bg-cukur px-4 py-3 text-[13px] leading-relaxed text-yazi-sonuk">
          ⚠️ Arama yalnızca <strong className="text-yazi">açık sayfadaki</strong> {SAYFA}{" "}
          kayıtta çalışıyor. Ad ve telefon şifreli saklandığı için veritabanında
          aranamıyorlar — bulunamaması &ldquo;kayıtlı değil&rdquo; demek değil.
        </p>
      )}

      <p className="mb-4 text-[13px] text-yazi-sonuk">
        Bu sayfada <strong className="text-yazi">{rizali}</strong> kişinin ticari ileti
        rızası açık.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-cizgi text-left">
              <Th>Oyuncu</Th>
              <Th>Telefon</Th>
              <Th>Ticari ileti</Th>
              <Th sagda>Oyun</Th>
              <Th sagda>Kupon</Th>
              <Th sagda>Kafe</Th>
              <Th sagda>Son görülme</Th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((o) => (
              <tr key={o.playerId} className="border-b border-cizgi last:border-0">
                <td className="py-3 pr-4">
                  <span className="block">{o.ad ?? "—"}</span>
                  {o.silindi && (
                    <span className="mt-0.5 block text-[12px] text-yazi-sonuk">
                      silinmiş / silme talebi var
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 font-data tabular">
                  {o.telefonMaskeli}
                  <span className="mt-0.5 block font-sans text-[10px] text-yazi-sonuk">
                    tam numara gönderim yolunda açılıyor
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {o.ticariIletiRizasi ? (
                    <Rozet tur="onayli">rıza var</Rozet>
                  ) : (
                    <Rozet tur="pasif">yok</Rozet>
                  )}
                </td>
                <Td>{o.oyun}</Td>
                <Td>{o.kupon}</Td>
                <Td>{o.kafe}</Td>
                <Td>{o.sonGorulme?.toLocaleDateString("tr-TR") ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="mt-6 flex items-center justify-between gap-4 border-t border-cizgi pt-5 text-[14px]">
        <span className="text-yazi-sonuk">
          Sayfa {sayfa} / {sonSayfa}
        </span>
        <span className="flex gap-4">
          {sayfa > 1 && (
            <a href={`/platform/oyuncular?s=${sayfa - 1}`} className="text-vurgu underline">
              ← Önceki
            </a>
          )}
          {sayfa < sonSayfa && (
            <a href={`/platform/oyuncular?s=${sayfa + 1}`} className="text-vurgu underline">
              Sonraki →
            </a>
          )}
        </span>
      </nav>
    </IsletmeSayfa>
  );
}

function Th({ children, sagda }: { children: React.ReactNode; sagda?: boolean }) {
  return (
    <th
      className={`etiket-caps pb-2.5 text-[10px] font-normal text-yazi-sonuk ${
        sagda ? "pl-3 text-right" : "pr-4"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-3 pl-3 text-right font-data tabular">{children}</td>;
}
