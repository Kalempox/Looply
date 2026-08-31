import Link from "next/link";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as urun from "@/domain/urun";
import { IsletmeSayfa, IsletmeBaslik, Bolum, Rozet } from "@/components/isletme";
import { UrunEkleme, DurumDugmesi } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ürünler · CafePlay" };

/**
 * Ürün listesi — kafenin menüsü.
 *
 * Ürünler tek başına ödül değil; ödülün ve kampanyanın dayanağı. Bu yüzden
 * panelde önce burası doldurulur: ödül kataloğu ve yüzde kampanyası buradaki
 * satırlara bağlanıyor.
 */
export default async function UrunlerSayfasi() {
  const o = await kafeYoneticisiGerekli();
  const urunler = await urun.listele(o.cafeId);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="İşletme paneli" alt="Ödüllerin ve kampanyaların dayanağı.">
        Ürünler
      </IsletmeBaslik>

      <Bolum baslik="Yeni ürün">
        <UrunEkleme />
      </Bolum>

      <Bolum baslik={`Menü · ${urunler.filter((u) => u.aktif).length} aktif`}>
        {urunler.length === 0 ? (
          <p className="text-[14px] text-yazi-sonuk">
            Henüz ürün yok. Ödül tanımlayabilmek için önce menünü gir.
          </p>
        ) : (
          <ul className="divide-y divide-cizgi border-y border-cizgi">
            {urunler.map((u) => (
              <li key={u.id} className={`flex items-center gap-4 py-3.5 ${u.aktif ? "" : "opacity-55"}`}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{u.ad}</span>
                  <span className="font-data text-[12px] text-yazi-sonuk tabular">
                    {(u.fiyatKurus / 100).toLocaleString("tr-TR")} TL
                  </span>
                </span>
                {!u.aktif && <Rozet tur="pasif">kullanımda değil</Rozet>}
                <DurumDugmesi urunId={u.id} aktif={u.aktif} />
              </li>
            ))}
          </ul>
        )}
      </Bolum>

      <Link href="/kafe/panel" className="text-[14px] text-yazi-sonuk underline">
        Panele dön
      </Link>
    </IsletmeSayfa>
  );
}
