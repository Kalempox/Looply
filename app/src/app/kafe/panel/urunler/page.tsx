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
  IsletmeUyari,
} from "@/components/isletme";
import {
  UrunEkleme,
  DurumDugmesi,
  KategoriEkleme,
  KategoriDurumDugmesi,
} from "./kontroller";
import { AdDuzeltme } from "../ad-duzeltme";
import { adEylemi } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ürünler · Looply" };

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

  /**
   * 🔴 Menü kategoriye göre gruplanıyor — Ü123.
   *
   * Liste düz bir yığındı ve her satırda kategorinin **türü** rozet
   * olarak tekrar ediyordu; beş üründe "kategorisiz" yazıyordu. İki
   * sorun birden: kategoriler panelde tanımlanıyor ama menüde hiçbir
   * işe yaramıyor gibi duruyordu, ve tekrarlayan rozet satırın yarısını
   * yiyordu.
   *
   * Şimdi başlık kategoriyi söylüyor, satır yalnızca ürünü. Rozet
   * tamamen kalktı.
   *
   * ⚠️ Sıra bilerek: **dolu kategoriler → kategorisizler → kaldırılmış
   * ürünler.** Kafe sahibinin aradığı şey menüsü; kaldırdıkları en
   * sonda, soluk.
   */
  const gruplar = [
    ...kategoriler
      .filter((k) => k.aktif)
      .map((k) => ({
        anahtar: k.id,
        baslik: k.ad,
        alt: TUR_ETIKETI[k.tur],
        urunler: aktifUrun.filter((u) => u.kategoriId === k.id),
        sonuk: false,
      }))
      // Boş kategori listede yer kaplamasın; sol kolondaki kategori
      // listesinde zaten "0 ürün" diye duruyor.
      .filter((g) => g.urunler.length > 0),
    {
      anahtar: "kategorisiz",
      baslik: "Kategorisiz",
      alt: "kupon görseli adından tahmin ediliyor",
      urunler: aktifUrun.filter((u) => !u.kategoriId),
      sonuk: false,
    },
    {
      anahtar: "pasif",
      baslik: "Kullanımda değil",
      alt: "ödüle ve kampanyaya bağlanamaz",
      urunler: urunler.filter((u) => !u.aktif),
      sonuk: true,
    },
  ].filter((g) => g.urunler.length > 0);

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
          alt={
            urunler.length === aktifUrun.length
              ? "hepsi kullanımda"
              : `${urunler.length - aktifUrun.length} tanesi kaldırılmış`
          }
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
      </section>

      {/*
        🔴 Kategorisiz ürün: kart DEĞİL uyarı (Ü123).

        Dördüncü bir sayı kartıydı ve üç kartlık ızgarada tek başına alt
        satıra düşüp ekranın yarısını boş bırakıyordu. Daha önemlisi bir
        **sayı değil, yapılacak bir iş**: kategorisiz ürünün kuponunda
        görsel tahminle seçiliyor (Ü75 — "ize amreicano" yeşil para
        kartı olarak çıkmıştı). Sayı kartı bunu bildirmiyor, uyarı
        bildiriyor.

        Sıfırken hiç çizilmiyor: "sorun yok" mesajı da bir gürültü.
      */}
      {kategorisiz > 0 && (
        <div className="mb-7">
          <IsletmeUyari tur="bekle">
            <strong>{kategorisiz} ürünün kategorisi yok.</strong> Kupon
            kartındaki görsel bu ürünler için adından tahmin ediliyor ve
            tahmin tutmayabilir. Aşağıdaki listede &quot;Kategorisiz&quot;
            başlığı altındalar.
          </IsletmeUyari>
        </div>
      )}

      {/*
        🔴 İki kolon KALDIRILDI (Ü124) — katalogdakiyle aynı gerekçe.

        Menü listesi 550 piksellik sağ sütuna sıkışıyordu; ad, fiyat ve
        iki düğme aynı hizaya sığmayınca her satır kendi düzenini kuruyor
        ve liste okunmaz oluyordu. Sol kolon ise formların bitiminden
        sonra boş kalıyordu.

        Şimdi: iki form üstte yan yana kutularda, menü **tam genişlikte**
        ve sütunlu.
      */}
      <div className="mb-8 grid items-start gap-4 lg:grid-cols-2">
        <details
          open={urunler.length === 0}
          className="group rounded-2xl border border-cizgi bg-yuzey"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
            <span>
              <span className="block text-[15px] font-semibold">Yeni ürün</span>
              <span className="mt-0.5 block text-[12px] text-yazi-sonuk">
                Ödülün ve kampanyanın dayanağı
              </span>
            </span>
            <span
              aria-hidden
              className="text-yazi-sonuk transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="border-t border-cizgi px-5 py-5">
            <UrunEkleme kategoriler={kategoriler} />
          </div>
        </details>

        {/* Kategori formu ürünün YANINDA ve kapalı: kafe sahibinin ilk
            işi ürün girmek, kategori onun hizmetinde. Üste ya da açık
            konsaydı "önce kategori kurman lazım" gibi bir engel olurdu. */}
        <details className="group rounded-2xl border border-cizgi bg-yuzey">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
            <span>
              <span className="block text-[15px] font-semibold">
                Kategoriler
                <span className="ml-2 font-data text-[13px] font-bold text-yazi-sonuk tabular">
                  {kategoriler.filter((k) => k.aktif).length}
                </span>
              </span>
              <span className="mt-0.5 block text-[12px] text-yazi-sonuk">
                Kupon kartındaki çizimi kategori belirliyor
              </span>
            </span>
            <span
              aria-hidden
              className="text-yazi-sonuk transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="space-y-5 border-t border-cizgi px-5 py-5">
            <KategoriEkleme />

            {kategoriler.length > 0 && (
              <ul className="grid gap-2">
                {kategoriler.map((k) => (
                  <li
                    key={k.id}
                    className={`flex items-center gap-3 rounded-xl border border-cizgi px-4 py-3 ${
                      k.aktif ? "" : "opacity-55"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] leading-tight font-semibold">
                          {k.ad}
                        </span>
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
          </div>
        </details>
      </div>

      <Bolum baslik="Menü">
        {urunler.length === 0 ? (
          <p className="text-[14px] text-yazi-sonuk">
            Henüz ürün yok. Ödül tanımlayabilmek için önce menünü gir.
          </p>
        ) : (
          <div className="space-y-7">
            {gruplar.map((g) => (
              <UrunGrubu
                key={g.anahtar}
                baslik={g.baslik}
                alt={g.alt}
                urunler={g.urunler}
                sonuk={g.sonuk}
              />
            ))}
          </div>
        )}
      </Bolum>

    </IsletmeSayfa>
  );
}

/**
 * Menünün tek kategori bölümü — Ü123 gruplama, Ü124 sütun.
 *
 * Başlık kategoriyi ve türünü söylüyor; satırlar yalnızca ürünü. Tür
 * rozeti her satırda tekrar ettiğinde bilgi taşımıyor, yalnızca yer
 * kaplıyordu — özellikle "kategorisiz" beş üründe üst üste yazıyordu.
 *
 * ⚠️ `lg` altında ızgara kapanıyor: telefonda üç sütun okunmuyor, satır
 * kendi içinde alt alta diziliyor.
 */
function UrunGrubu({
  baslik,
  alt,
  urunler,
  sonuk,
}: {
  baslik: string;
  alt: string;
  urunler: urun.Urun[];
  sonuk: boolean;
}) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h3 className="etiket-caps text-yazi-sonuk">{baslik}</h3>
        <span className="font-data text-[12px] font-bold text-yazi-sonuk tabular">
          {urunler.length}
        </span>
        <span className="text-[12px] text-yazi-sonuk">· {alt}</span>
      </div>

      <div
        className={`overflow-hidden rounded-2xl border border-cizgi bg-yuzey ${
          sonuk ? "opacity-70" : ""
        }`}
      >
        <div className="hidden border-b border-cizgi bg-cukur px-4 py-2 lg:grid lg:grid-cols-[1fr_140px_auto] lg:items-center lg:gap-4">
          <span className="etiket-caps text-[9px] text-yazi-sonuk">Ürün</span>
          <span className="etiket-caps text-[9px] text-yazi-sonuk">Fiyat</span>
          <span className="etiket-caps text-[9px] text-yazi-sonuk">İşlem</span>
        </div>

        <ul className="divide-y divide-cizgi">
          {urunler.map((u) => (
            <li
              key={u.id}
              className="px-4 py-3.5 lg:grid lg:grid-cols-[1fr_140px_auto] lg:items-center lg:gap-4"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-urun-zemin text-urun"
                  aria-hidden
                >
                  {IKON.urun}
                </span>
                <span className="min-w-0 truncate text-[15px] leading-tight font-semibold">
                  {u.ad}
                </span>
              </span>

              <span className="mt-3 block lg:mt-0">
                <span className="inline-block rounded-full bg-urun-zemin px-2.5 py-0.5 font-data text-[12px] font-bold text-urun tabular">
                  {(u.fiyatKurus / 100).toLocaleString("tr-TR")} TL
                </span>
              </span>

              <span className="mt-3 flex flex-wrap items-start justify-start gap-1.5 lg:mt-0 lg:justify-end">
                {/* Ü94 — sahada yaşanan hata buydu: "ize amreicano". */}
                <AdDuzeltme
                  eylem={adEylemi}
                  kimlikAlani="urunId"
                  kimlik={u.id}
                  adAlani="ad"
                  mevcutAd={u.ad}
                  acikKupon={u.acikKupon}
                  etiket="Ürün adı"
                />
                <DurumDugmesi urunId={u.id} aktif={u.aktif} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
