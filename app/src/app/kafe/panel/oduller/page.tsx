import Link from "next/link";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as katalog from "@/domain/katalog";
import * as urun from "@/domain/urun";
import * as ayar from "@/domain/ayar";
import { IsletmeSayfa, IsletmeBaslik, Bolum, Rozet, IsletmeUyari } from "@/components/isletme";
import { OdulEkleme, DurumDugmesi, EsikAyari } from "./kontroller";
import { OdulSekmeleri } from "../odul-sekmeleri";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ödül kataloğu · CafePlay" };

/**
 * Ödül kataloğu.
 *
 * Üç tip var (Ü18, Ü26): ürün ödülü, TL tavanlı yüzde indirimi ve sabit
 * tutarlı indirim. Kafe **bakiyesi** yok — saklanan değer aracı v1 kapsamı
 * dışında; sabit tutarlı indirim bakiye değil, tek kullanımlık kupon.
 *
 * Her ödülün yanında **kanıt seviyesi** görünüyor ve düzenlenemiyor: E6 onu
 * tutardan hesaplıyor. Kafenin bilmesi gereken şey seviyenin ne olduğu değil,
 * ne anlama geldiği — o yüzden yanında düz cümleyle yazıyor.
 */
export default async function OdullerSayfasi() {
  const o = await kafeYoneticisiGerekli();
  const [oduller, urunler, esikKurus] = await Promise.all([
    katalog.listele(o.cafeId),
    urun.listele(o.cafeId, false),
    ayar.sayiOku(o.cafeId, ayar.ANAHTARLAR.ertelemeEsigi),
  ]);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="İşletme paneli" alt="Müşteriye ne veriyorsun — kazanılan ödüller ve herkese açık indirimler.">
        Ödüller ve kampanyalar
      </IsletmeBaslik>

      <OdulSekmeleri aktif="odul" />

      {urunler.length === 0 && (
        <div className="mb-7">
          <IsletmeUyari tur="bekle">
            Henüz ürün girmemişsin. Ödül tanımlayabilirsin ama ürüne bağlamak raporları çok daha
            anlamlı yapar. <Link href="/kafe/panel/urunler" className="underline">Ürünler</Link>
          </IsletmeUyari>
        </div>
      )}

      <Bolum baslik="Yeni ödül">
        <OdulEkleme urunler={urunler.map((u) => ({ id: u.id, ad: u.ad }))} />
      </Bolum>

      <Bolum baslik="Gecikmeli açılma">
        <EsikAyari mevcutTl={Math.round(esikKurus / 100)} />
      </Bolum>

      <Bolum baslik={`Katalog · ${oduller.filter((x) => x.aktif).length} yayında`}>
        {oduller.length === 0 ? (
          <p className="text-[14px] text-yazi-sonuk">
            Katalog boş. Oyuncular puan biriktiriyor ama harcayacakları bir şey yok.
          </p>
        ) : (
          <ul className="divide-y divide-cizgi border-y border-cizgi">
            {oduller.map((od) => (
              <li key={od.id} className={`py-4 ${od.aktif ? "" : "opacity-55"}`}>
                <div className="flex items-start gap-4">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold">
                        {od.tip === "percent" ? "🎟️" : od.tip === "amount" ? "💸" : "🏆"} {od.baslik}
                      </span>
                      {od.anlik && <Rozet tur="onayli">anlık</Rozet>}
                      {!od.aktif && <Rozet tur="pasif">yayında değil</Rozet>}
                    </span>

                    <span className="mt-1 block font-data text-[12px] text-yazi-sonuk tabular">
                      {od.tip === "percent"
                        ? `%${od.yuzde} · en fazla ${tlYaz(od.maliyetKurus)} TL`
                        : od.tip === "amount"
                          ? `${tlYaz(od.maliyetKurus)} TL indirim`
                          : `${tlYaz(od.maliyetKurus)} TL`}
                      {od.anlik ? " · puan istemez" : ` · ${od.puanFiyati.toLocaleString("tr-TR")} puan`}
                      {od.urunAdi && ` · ${od.urunAdi}`}
                    </span>

                    <span className="mt-1 block text-[12px] text-yazi-sonuk">
                      {kanitCumlesi(od.kanitSeviyesi)}
                    </span>
                  </span>

                  <DurumDugmesi odulId={od.id} aktif={od.aktif} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Bolum>

    </IsletmeSayfa>
  );
}

function tlYaz(kurus: number): string {
  return (kurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

/** E6'yı kafenin diliyle anlatır — "K3" hiçbir kafe sahibine bir şey söylemez. */
function kanitCumlesi(seviye: number): string {
  if (seviye >= 4) return "Fiş kodu girilmiş oyunculara verilir";
  if (seviye === 3) return "Masada en az beş dakika kalmış oyunculara verilir";
  return "Konumu doğrulanmış oyunculara verilir";
}
