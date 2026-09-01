import Link from "next/link";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as katalog from "@/domain/katalog";
import * as urun from "@/domain/urun";
import * as ayar from "@/domain/ayar";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  Rozet,
  IsletmeUyari,
} from "@/components/isletme";
import { OdulEkleme, DurumDugmesi, EsikAyari, CarkSiniri } from "./kontroller";
import { OdulSekmeleri } from "../odul-sekmeleri";
import { SayiKarti, IKON } from "@/components/gosterge";

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
  const [oduller, urunler, esikKurus, carkSinirKurus] = await Promise.all([
    katalog.listele(o.cafeId),
    urun.listele(o.cafeId, false),
    ayar.sayiOku(o.cafeId, ayar.ANAHTARLAR.ertelemeEsigi),
    ayar.sayiOku(o.cafeId, ayar.ANAHTARLAR.carkUstSinir),
  ]);

  // Çarkın dönebilmesi için sınırın altında en az bir anlık ödül gerekiyor;
  // kafe sayıyı görmeden "çark neden dönmüyor" sorusunu çözemez.
  const carkaUygun = oduller.filter(
    (od) => od.aktif && od.anlik && od.maliyetKurus <= carkSinirKurus,
  ).length;

  /**
   * Ü62: kafe sahibinin bu ekranda sorduğu üç şey.
   *
   * "Kaç ödülüm var" listeden sayılabiliyordu ama "ortalama kaç TL" ve
   * "kaçı hemen açılıyor" sayılamıyordu — ikisi de ödül ekonomisinin
   * karakterini belirliyor. Ortalama yüksekse bütçe hızlı eriyor;
   * ertelenen oran yüksekse oyuncu ödülünü hemen kullanamıyor.
   */
  const yayinda = oduller.filter((od) => od.aktif);
  const ortalamaKurus =
    yayinda.length > 0
      ? Math.round(
          yayinda.reduce((t, od) => t + od.maliyetKurus, 0) / yayinda.length,
        )
      : 0;
  const hemenAcilan = yayinda.filter(
    (od) => od.maliyetKurus <= esikKurus,
  ).length;

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik
        ust="İşletme paneli"
        alt="Müşteriye ne veriyorsun — kazanılan ödüller ve herkese açık indirimler."
      >
        Ödüller ve kampanyalar
      </IsletmeBaslik>

      <OdulSekmeleri aktif="odul" />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SayiKarti
          etiket="Yayındaki ödül"
          deger={String(yayinda.length)}
          alt={`${oduller.length} tanımlı`}
          ikon={IKON.odul}
        />
        <SayiKarti
          etiket="Çarka giren"
          deger={String(carkaUygun)}
          alt={`${Math.round(carkSinirKurus / 100)} TL sınırının altında`}
          ikon={IKON.kupon}
          vurgulu
        />
        <SayiKarti
          etiket="Ortalama değer"
          deger={`${Math.round(ortalamaKurus / 100)} TL`}
          alt="bütçe bu hızda eriyor"
          ikon={IKON.para}
        />
        <SayiKarti
          etiket="Hemen açılan"
          deger={String(hemenAcilan)}
          alt={`üstü 24 saat bekliyor`}
          ikon={IKON.saat}
        />
      </section>

      {urunler.length === 0 && (
        <div className="mb-7">
          <IsletmeUyari tur="bekle">
            Henüz ürün girmemişsin. Ödül tanımlayabilirsin ama ürüne bağlamak
            raporları çok daha anlamlı yapar.{" "}
            <Link href="/kafe/panel/urunler" className="underline">
              Ürünler
            </Link>
          </IsletmeUyari>
        </div>
      )}

      {/*
        Bilgisayarda iki kolon (Ü58).

        Bu sayfa tek sütundu ve telefonda doğru çalışıyordu: form, ayar,
        ayar, liste — hepsi alt alta. Bilgisayarda aynı dizilim, ekranın
        yarısı boşken kullanıcıyı üç ekran boyu kaydırtıyordu.
        Sol kolon **yazma** işleri (yeni ödül, ayarlar), sağ kolon
        **okuma** işi (mevcut liste). Kafe sahibi ödül eklerken listeyi
        görebiliyor — eklediği şeyin zaten var olup olmadığını anlamak
        için kaydırmak gerekmiyor.
      */}
      <div className="grid items-start gap-x-8 lg:grid-cols-2">
        <div>
          <Bolum baslik="Yeni ödül">
            <OdulEkleme
              urunler={urunler.map((u) => ({ id: u.id, ad: u.ad }))}
            />
          </Bolum>

          <Bolum baslik="Gecikmeli açılma">
            <EsikAyari mevcutTl={Math.round(esikKurus / 100)} />
          </Bolum>

          <Bolum baslik="Şans çarkı">
            <CarkSiniri
              mevcutTl={Math.round(carkSinirKurus / 100)}
              uygunSayisi={carkaUygun}
            />
          </Bolum>
        </div>

        <div>
          <Bolum
            baslik={`Katalog · ${oduller.filter((x) => x.aktif).length} yayında`}
          >
            {oduller.length === 0 ? (
              <p className="text-[14px] text-yazi-sonuk">
                Katalog boş. Oyuncular puan biriktiriyor ama harcayacakları bir
                şey yok.
              </p>
            ) : (
              <ul className="divide-y divide-cizgi border-y border-cizgi">
                {oduller.map((od) => (
                  <li
                    key={od.id}
                    className={`py-4 ${od.aktif ? "" : "opacity-55"}`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold">
                            {od.tip === "percent"
                              ? "🎟️"
                              : od.tip === "amount"
                                ? "💸"
                                : "🏆"}{" "}
                            {od.baslik}
                          </span>
                          {od.anlik && <Rozet tur="onayli">anlık</Rozet>}
                          {!od.aktif && (
                            <Rozet tur="pasif">yayında değil</Rozet>
                          )}
                        </span>

                        <span className="mt-1 block font-data text-[12px] text-yazi-sonuk tabular">
                          {od.tip === "percent"
                            ? `%${od.yuzde} · en fazla ${tlYaz(od.maliyetKurus)} TL`
                            : od.tip === "amount"
                              ? `${tlYaz(od.maliyetKurus)} TL indirim`
                              : `${tlYaz(od.maliyetKurus)} TL`}
                          {od.anlik
                            ? " · puan istemez"
                            : ` · ${od.puanFiyati.toLocaleString("tr-TR")} puan`}
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
        </div>
      </div>
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
