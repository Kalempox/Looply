import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import * as liderlik from "@/domain/liderlik";
import { gununOyunu } from "@/oyunlar";
import { isGunu } from "@/lib/tarih";
import { Sayfa, Baslik } from "@/components/ui";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Liderlik · CafePlay" };

/**
 * Tüm zamanlar liderlik tablosu.
 *
 * ── Neden ayrı sayfa ────────────────────────────────────────
 *
 * `/oyna` kartı bugünün ilk üçünü gösteriyor. Oraya on satır sığdırmak
 * ana ekranın asıl işini (oyna, kupon kullan) bastırırdı; buraya
 * tıklayan kişi ise zaten sıralamaya bakmaya gelmiş.
 *
 * ── İki liste, iki soru ─────────────────────────────────────
 *
 * **Bugün** en yüksek skoru soruyor, **tüm zamanlar** en çok puanı. Aynı
 * listenin uzunu ve kısası olsalardı ikinci sayfaya gelmenin anlamı
 * olmazdı — burada gerçekten başka bir şey görünüyor: bir günün şampiyonu
 * değil, kafenin en düzenli müşterisi.
 *
 * ── Kafe dışında ────────────────────────────────────────────
 *
 * Sıralama kafeye ait. Masası olmayan oyuncuya gösterilecek bir liste yok
 * — hangi kafenin sıralaması olduğu belirsiz kalırdı.
 */
export default async function LiderlikSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const masa = await masaOturumu.aktif(o.ozneId);
  if (!masa) {
    return (
      <Sayfa>
        <Baslik ust="Liderlik">Sıralama</Baslik>
        <p className="text-[15px] leading-relaxed text-yazi-sonuk">
          Sıralama kafeye ait. Masadaki karekodu okuttuğunda bu kafenin listesini görürsün.
        </p>
        <Link href="/oyna" className="mt-6 inline-block text-[15px] font-semibold underline">
          Ana ekrana dön
        </Link>
        <NavBosluk />
        <OyuncuNav aktif="/oyna" />
      </Sayfa>
    );
  }

  const oyun = gununOyunu(isGunu());
  const [bugun, tum] = await Promise.all([
    liderlik.bugun({ cafeId: masa.cafeId, oyunId: oyun.id, bakanId: o.ozneId }),
    liderlik.tumZamanlar({ cafeId: masa.cafeId, bakanId: o.ozneId }),
  ]);

  return (
    <Sayfa>
      <Baslik ust={masa.cafeAdi}>Sıralama</Baslik>

      <p className="-mt-4 mb-8 text-[13px] leading-relaxed text-yazi-sonuk">
        Adlar kısaltılmış gösterilir — soyadın yalnızca baş harfi görünür. Kendi adını{" "}
        <Link href="/verilerim" className="underline">
          verilerim
        </Link>{" "}
        sayfasından tamamen gizleyebilirsin.
      </p>

      <Liste
        baslik="Bugün"
        alt={`${oyun.ad} · en yüksek skor`}
        liste={bugun}
        birim="puan"
        bosMetin="Bugün bu kafede henüz kimse oynamadı."
      />

      <Liste
        baslik="Tüm zamanlar"
        alt="Bu kafede toplanan puan"
        liste={tum}
        birim="puan"
        bosMetin="Bu kafede henüz puan toplanmamış."
      />

      <NavBosluk />
      <OyuncuNav aktif="/oyna" />
    </Sayfa>
  );
}

function Liste({
  baslik,
  alt,
  liste,
  birim,
  bosMetin,
}: {
  baslik: string;
  alt: string;
  liste: liderlik.Liste;
  birim: string;
  bosMetin: string;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="etiket-caps text-yazi-sonuk">{baslik}</h2>
        <span className="font-data text-[10px] text-yazi-sonuk">{alt}</span>
      </div>

      {liste.satirlar.length === 0 ? (
        <p className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5 text-[14px] text-yazi-sonuk">
          {bosMetin}
        </p>
      ) : (
        <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-4">
          <ol className="divide-y divide-cizgi">
            {liste.satirlar.map((s) => (
              <Satir key={s.sira} satir={s} birim={birim} />
            ))}
          </ol>

          {/* Listeye giremeyen kişiye "yoksun" demek yerine kaçıncı
              olduğunu söylüyoruz — sıralama ancak insan kendini
              görebildiğinde bir hedef oluyor. */}
          {liste.benimSiram ? (
            <div className="mt-1 border-t-2 border-cizgi pt-1">
              <ol>
                <Satir satir={liste.benimSiram} birim={birim} />
              </ol>
            </div>
          ) : (
            // Listede hiç yoksa sessiz kalmak, "buraya giremem" gibi
            // okunuyor. Nedenini söylemek hedefi görünür kılıyor.
            !liste.satirlar.some((s) => s.benMiyim) && (
              <p className="mt-1 border-t-2 border-cizgi pt-3 text-[13px] text-yazi-sonuk">
                Henüz bu listede değilsin — oynadığında burada görünürsün.
              </p>
            )
          )}
        </div>
      )}
    </section>
  );
}

function Satir({ satir, birim }: { satir: liderlik.LiderSatiri; birim: string }) {
  return (
    <li
      className={`flex items-baseline gap-3 py-2.5 ${
        satir.benMiyim ? "text-odul-koyu" : ""
      }`}
    >
      <span
        className={`w-6 shrink-0 font-data text-[13px] tabular ${
          satir.sira <= 3 ? "font-bold text-yazi" : "text-yazi-sonuk"
        } ${satir.benMiyim ? "text-odul-koyu" : ""}`}
      >
        {satir.sira}
      </span>
      <span className="min-w-0 flex-1 truncate font-display text-[15px] font-bold">
        {satir.benMiyim ? "Sen" : satir.gorunenAd}
      </span>
      <span
        className={`font-data text-[15px] leading-none font-bold tabular ${
          satir.benMiyim ? "text-odul-koyu" : "text-vurgu"
        }`}
      >
        {satir.deger.toLocaleString("tr-TR")}
        <span className="ml-1 text-[10px] font-normal text-yazi-sonuk">{birim}</span>
      </span>
    </li>
  );
}
