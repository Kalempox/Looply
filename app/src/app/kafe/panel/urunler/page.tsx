import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as urun from "@/domain/urun";
import * as kategori from "@/domain/kategori";
import { TUR_ETIKETI } from "@/domain/kategori-tur";
import { SayiKarti, IKON } from "@/components/gosterge";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  Rozet,
  IkiKolon,
} from "@/components/isletme";
import {
  UrunEkleme,
  DurumDugmesi,
  KategoriEkleme,
  KategoriDurumDugmesi,
} from "./kontroller";

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
  const [urunler, kategoriler] = await Promise.all([
    urun.listele(o.cafeId),
    kategori.listele(o.cafeId),
  ]);

  /**
   * Ü62: ürünler ödülün dayanağı — ortalama fiyat, ödül değerlerinin
   * mantıklı olup olmadığını söyleyen tek sayı. 25 TL'lik ödül, 30
   * TL'lik ortalama adisyonu olan bir kafede cömert; 200 TL'lik
   * ortalaması olan bir kafede görünmez.
   */
  const aktifUrun = urunler.filter((u) => u.aktif);
  const ortalamaFiyat =
    aktifUrun.length > 0
      ? Math.round(
          aktifUrun.reduce((t, u) => t + u.fiyatKurus, 0) / aktifUrun.length,
        )
      : 0;
  const enPahali = aktifUrun.reduce<(typeof aktifUrun)[number] | null>(
    (en, u) => (en === null || u.fiyatKurus > en.fiyatKurus ? u : en),
    null,
  );
  const kategorisiz = aktifUrun.filter((u) => !u.kategoriId).length;

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik
        ust="İşletme paneli"
        alt="Ödüllerin ve kampanyaların dayanağı."
      >
        Ürünler
      </IsletmeBaslik>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <SayiKarti
          etiket="Menüdeki ürün"
          deger={String(aktifUrun.length)}
          alt={`${urunler.length} tanımlı`}
          ikon={IKON.urun}
          alan="urun"
          vurgulu
        />
        <SayiKarti
          etiket="Ortalama fiyat"
          deger={`${Math.round(ortalamaFiyat / 100)} TL`}
          alt="ödül değerinin dayanağı"
          ikon={IKON.para}
          alan="para"
        />
        <SayiKarti
          etiket="En pahalı"
          deger={enPahali ? `${Math.round(enPahali.fiyatKurus / 100)} TL` : "—"}
          alt={enPahali ? enPahali.ad : "ürün girilmedi"}
          ikon={IKON.odul}
          alan="urun"
        />
        {/* Ü75: kategorisiz ürün, kuponunda yanlış görsel çıkma
            riski demek. Sayı sıfır olduğunda kart görünmüyor —
            "sorun yok" mesajı da bir gürültü. */}
        {kategorisiz > 0 && (
          <SayiKarti
            etiket="Kategorisiz ürün"
            deger={String(kategorisiz)}
            alt="kupon görseli tahmine kalıyor"
            ikon={IKON.urun}
            alan="kampanya"
          />
        )}
      </section>

      <IkiKolon
        sol={
          <>
            <Bolum baslik="Yeni ürün">
              <UrunEkleme kategoriler={kategoriler} />
            </Bolum>

            {/* Kategori formu ürünün ALTINDA: kafe sahibinin ilk işi
                ürün girmek, kategori onun hizmetinde. Üste konsaydı
                "önce kategori kurman lazım" gibi bir engel olurdu. */}
            <Bolum baslik={`Kategoriler · ${kategoriler.filter((k) => k.aktif).length}`}>
              <KategoriEkleme />

              {kategoriler.length > 0 && (
                <ul className="mt-5 grid gap-2">
                  {kategoriler.map((k) => (
                    <li
                      key={k.id}
                      className={`flex items-center gap-3 rounded-xl border border-cizgi bg-yuzey px-4 py-3 ${
                        k.aktif ? "" : "opacity-55"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] leading-tight font-semibold">{k.ad}</span>
                          {!k.aktif && <Rozet tur="pasif">kaldırıldı</Rozet>}
                        </span>
                        <span className="mt-1 block text-[12px] text-yazi-sonuk">
                          {TUR_ETIKETI[k.tur]} · {k.urunSayisi} ürün
                        </span>
                      </span>
                      <KategoriDurumDugmesi kategoriId={k.id} aktif={k.aktif} />
                    </li>
                  ))}
                </ul>
              )}
            </Bolum>
          </>
        }
        sag={
          <Bolum
            baslik={`Menü · ${urunler.filter((u) => u.aktif).length} aktif`}
          >
            {urunler.length === 0 ? (
              <p className="text-[14px] text-yazi-sonuk">
                Henüz ürün yok. Ödül tanımlayabilmek için önce menünü gir.
              </p>
            ) : (
              <ul className="grid gap-2.5">
                {urunler.map((u) => (
                  <li
                    key={u.id}
                    className={`flex items-center gap-3.5 rounded-2xl border border-cizgi bg-yuzey p-4 transition-all hover:-translate-y-0.5 hover:border-urun hover:shadow-md ${
                      u.aktif ? "" : "opacity-55"
                    }`}
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-urun-zemin text-urun"
                      aria-hidden
                    >
                      {IKON.urun}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] leading-tight font-semibold">
                          {u.ad}
                        </span>
                        {!u.aktif && (
                          <Rozet tur="pasif">kullanımda değil</Rozet>
                        )}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-urun-zemin px-2 py-0.5 font-data text-[11px] font-bold text-urun tabular">
                          {(u.fiyatKurus / 100).toLocaleString("tr-TR")} TL
                        </span>
                        {u.kategoriTuru ? (
                          <span className="rounded-full bg-cukur px-2 py-0.5 text-[11px] text-yazi-sonuk">
                            {TUR_ETIKETI[u.kategoriTuru]}
                          </span>
                        ) : (
                          <span className="rounded-full bg-kampanya-zemin px-2 py-0.5 text-[11px] text-kampanya">
                            kategorisiz
                          </span>
                        )}
                      </span>
                    </span>
                    <DurumDugmesi urunId={u.id} aktif={u.aktif} />
                  </li>
                ))}
              </ul>
            )}
          </Bolum>
        }
      />
    </IsletmeSayfa>
  );
}
