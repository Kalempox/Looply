import Link from "next/link";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as kampanya from "@/domain/kampanya";
import * as urun from "@/domain/urun";
import { IsletmeSayfa, IsletmeBaslik, Bolum, Rozet } from "@/components/isletme";
import { KampanyaOlusturma, DurumDugmeleri } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kampanyalar · CafePlay" };

/**
 * Ürün bazlı yüzde kampanyaları — Ö4.
 *
 * Katalogdaki yüzdeli ödülden farkı: bu **puan istemez** ve kafenin itmek
 * istediği ürüne bağlıdır. *"Kafede tiramisu satılmıyor — tiramisuda %10,
 * günde en fazla 20 adet, bir hafta."*
 *
 * Canlı sayaç her satırda: kampanyanın ne kadarının kullanıldığı görünmeden
 * limit koymanın anlamı olmaz.
 */
export default async function KampanyalarSayfasi() {
  const o = await kafeYoneticisiGerekli();
  const [kampanyalar, urunler] = await Promise.all([
    kampanya.listele(o.cafeId),
    urun.listele(o.cafeId, false),
  ]);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="İşletme paneli" alt="Boş saatini doldur, istediğin ürünü sattır.">
        Ürün kampanyaları
      </IsletmeBaslik>

      <Bolum
        baslik="Yeni kampanya"
        alt="TL tavanı, günlük adet ve süre — üçü de zorunlu. Yüzde tek başına açık uçlu bir borçtur."
      >
        <KampanyaOlusturma
          urunler={urunler.map((u) => ({ id: u.id, ad: u.ad, fiyatKurus: u.fiyatKurus }))}
        />
      </Bolum>

      <Bolum baslik={`Kampanyalar · ${kampanyalar.filter((k) => k.durum === "active").length} yayında`}>
        {kampanyalar.length === 0 ? (
          <p className="text-[14px] text-yazi-sonuk">Henüz kampanya yok.</p>
        ) : (
          <ul className="divide-y divide-cizgi border-y border-cizgi">
            {kampanyalar.map((k) => {
              const doluluk = Math.min(100, Math.round((k.bugunKullanilan / k.gunlukLimit) * 100));
              return (
                <li key={k.id} className={`py-4 ${k.durum === "ended" ? "opacity-55" : ""}`}>
                  <div className="flex items-start gap-4">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold">
                          {k.urunAdi} · %{k.yuzde}
                        </span>
                        <DurumRozeti durum={k.durum} />
                      </span>

                      <span className="mt-1 block font-data text-[12px] text-yazi-sonuk tabular">
                        en fazla {(k.tavanKurus / 100).toLocaleString("tr-TR")} TL · günde{" "}
                        {k.gunlukLimit} adet
                        {k.toplamLimit ? ` · toplam ${k.toplamLimit}` : ""} ·{" "}
                        {k.bitis.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}{" "}
                        tarihine kadar
                      </span>

                      {/* Canlı sayaç */}
                      <span className="mt-2 block">
                        <span className="flex items-baseline justify-between font-data text-[11px] text-yazi-sonuk">
                          <span>
                            Bugün {k.bugunKullanilan}/{k.gunlukLimit}
                          </span>
                          <span>toplam {k.toplamKullanilan}</span>
                        </span>
                        <span className="mt-1 block h-1 w-full bg-cukur">
                          <span
                            className="block h-full bg-yazi"
                            style={{ width: `${doluluk}%` }}
                          />
                        </span>
                      </span>
                    </span>

                    <DurumDugmeleri kampanyaId={k.id} durum={k.durum} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Bolum>

      <Link href="/kafe/panel" className="text-[14px] text-yazi-sonuk underline">
        Panele dön
      </Link>
    </IsletmeSayfa>
  );
}

function DurumRozeti({ durum }: { durum: kampanya.KampanyaDurumu }) {
  if (durum === "active") return <Rozet tur="onayli">yayında</Rozet>;
  if (durum === "paused") return <Rozet tur="bekliyor">duraklatıldı</Rozet>;
  if (durum === "draft") return <Rozet tur="pasif">taslak</Rozet>;
  return <Rozet tur="pasif">bitti</Rozet>;
}
