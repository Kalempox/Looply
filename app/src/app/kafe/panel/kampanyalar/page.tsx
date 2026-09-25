import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as kampanya from "@/domain/kampanya";
import * as urun from "@/domain/urun";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  Rozet,
  IkiKolon,
} from "@/components/isletme";
import { FarkNotu } from "../fark-notu";
import { KampanyaOlusturma, DurumDugmeleri } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kampanyalar · Looply" };

/**
 * Ürün bazlı yüzde kampanyaları — Ö4.
 *
 * Katalogdaki yüzdeli ödülden farkı: bu **kazanılmıyor** — kafenin itmek
 * istediği ürüne bağlı ve oynamak yetiyor. *"Kafede tiramisu satılmıyor —
 * tiramisuda %10, günde en fazla 20 adet, bir hafta."*
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
      <IsletmeBaslik
        ust="İşletme paneli"
        alt="Öne çıkarmak istediğin ürüne bağlı yüzde indirimi — puan istemez."
      >
        Kampanyalar
      </IsletmeBaslik>

      <FarkNotu taraf="kampanya" />

      <IkiKolon
        sol={
          <Bolum
            baslik="Yeni kampanya"
            alt="TL tavanı, günlük adet ve süre — üçü de zorunlu. Yüzde tek başına açık uçlu bir borçtur."
          >
            <KampanyaOlusturma
              urunler={urunler.map((u) => ({
                id: u.id,
                ad: u.ad,
                fiyatKurus: u.fiyatKurus,
              }))}
            />
          </Bolum>
        }
        sag={
          <Bolum
            baslik={`Kampanyalar · ${kampanyalar.filter((k) => k.durum === "active").length} yayında`}
          >
            {kampanyalar.length === 0 ? (
              <p className="text-[14px] text-yazi-sonuk">Henüz kampanya yok.</p>
            ) : (
              <ul className="divide-y divide-cizgi border-y border-cizgi">
                {kampanyalar.map((k) => {
                  const doluluk = Math.min(
                    100,
                    Math.round((k.bugunKullanilan / k.gunlukLimit) * 100),
                  );
                  return (
                    <li
                      key={k.id}
                      className={`py-4 ${k.durum === "ended" ? "opacity-55" : ""}`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[15px] font-semibold">
                              {k.urunAdi} · %{k.yuzde}
                            </span>
                            <DurumRozeti durum={k.durum} />
                          </span>

                          {/*
                            🔴 Tek satırlık monospace dizi yerine etiketli
                            rozetler (Ü123).

                            Eskiden "en fazla 25 TL · günde 50 adet ·
                            15 Eylül tarihine kadar" tek bir gri şerit
                            hâlinde yazıyordu: hangi sayının ne olduğunu
                            anlamak için cümleyi okumak gerekiyordu.
                            Rozetlerde sayı önde, ne olduğu altında.
                          */}
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            {/* Ü292: aynı ürüne iki kampanya aynı adla
                                görünüyordu — upsell ayrı işaretleniyor. */}
                            {k.hemen && <Kunye deger="upsell" etiket={`${k.gecerliSaat} saat`} />}
                            <Kunye
                              deger={`${(k.tavanKurus / 100).toLocaleString("tr-TR")} TL`}
                              etiket="en fazla"
                            />
                            <Kunye
                              deger={`${k.gunlukLimit}`}
                              etiket="günde"
                            />
                            {k.toplamLimit != null && (
                              <Kunye
                                deger={`${k.toplamLimit}`}
                                etiket="toplam"
                              />
                            )}
                            <Kunye
                              deger={k.bitis.toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "short",
                              })}
                              etiket="bitiş"
                            />
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
        }
      />
    </IsletmeSayfa>
  );
}

/**
 * Sayı + etiketi olan küçük künye — Ü123.
 *
 * Sayıyı `font-data` ile büyütüp ne olduğunu altına küçük yazmak,
 * "günde 50 adet" cümlesinden hızlı okunuyor: göz önce rakamı buluyor.
 */
function Kunye({ deger, etiket }: { deger: string; etiket: string }) {
  return (
    <span className="rounded-lg bg-cukur px-2.5 py-1 text-center">
      <span className="block font-data text-[13px] leading-none font-bold tabular">
        {deger}
      </span>
      <span className="etiket-caps mt-0.5 block text-[9px] text-yazi-sonuk">
        {etiket}
      </span>
    </span>
  );
}

function DurumRozeti({ durum }: { durum: kampanya.KampanyaDurumu }) {
  if (durum === "active") return <Rozet tur="onayli">yayında</Rozet>;
  if (durum === "paused") return <Rozet tur="bekliyor">duraklatıldı</Rozet>;
  if (durum === "draft") return <Rozet tur="pasif">taslak</Rozet>;
  return <Rozet tur="pasif">bitti</Rozet>;
}
