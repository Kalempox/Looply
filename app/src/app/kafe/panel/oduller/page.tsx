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
import { AdDuzeltme } from "../ad-duzeltme";
import { adEylemi } from "./actions";
import { OdulSekmeleri } from "../odul-sekmeleri";
import { SayiKarti, IKON } from "@/components/gosterge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ödül kataloğu · Looply" };

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
          alan="odul"
        />
        <SayiKarti
          etiket="Çarka giren"
          deger={String(carkaUygun)}
          alt={`${Math.round(carkSinirKurus / 100)} TL sınırının altında`}
          ikon={IKON.kupon}
          alan="odul"
          vurgulu
        />
        <SayiKarti
          etiket="Ortalama değer"
          deger={`${Math.round(ortalamaKurus / 100)} TL`}
          alt="bütçe bu hızda eriyor"
          ikon={IKON.para}
          alan="para"
        />
        <SayiKarti
          etiket="Hemen açılan"
          deger={String(hemenAcilan)}
          alt={`üstü 12 saat bekliyor`}
          ikon={IKON.saat}
          alan="genel"
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
              <ul className="grid gap-2.5">
                {oduller.map((od) => (
                  <li key={od.id}>
                    <OdulKarti odul={od} />
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

/**
 * Katalogdaki tek ödül — Ü63.
 *
 * ── Neden satır değil kart ──────────────────────────────────
 *
 * Liste düz satırlardı: emoji + başlık + tek satır gri metin. Ürün
 * sahibinin deyimiyle "çok çirkin" ve daha önemlisi **okunmuyordu** —
 * tip, değer, kanıt ve durum aynı gri cümlenin içinde eriyordu.
 *
 * Şimdi her bilgi kendi yerinde: solda tipin renkli ikonu, üstte ad ve
 * durum, altta değer ile kanıt ayrı rozetlerde. Emoji yok (Ü31).
 *
 * ── Renk tipten geliyor ─────────────────────────────────────
 *
 * Ürün turuncu, yüzde mor, tutar yeşil (Ü63). Kafe sahibi listeyi
 * okumadan da hangi tipten kaç tane olduğunu görüyor.
 */
function OdulKarti({ odul }: { odul: katalog.Odul }) {
  const t = TIP_GORUNUM[odul.tip];

  return (
    <div
      className={`flex flex-wrap items-start gap-3.5 rounded-2xl border bg-yuzey p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        odul.aktif ? `${t.kenar} border-cizgi` : "border-cizgi opacity-55"
      }`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${t.kutu}`}
        aria-hidden
      >
        {t.ikon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] leading-tight font-semibold">
            {odul.baslik}
          </span>
          {!odul.aktif && <Rozet tur="pasif">yayında değil</Rozet>}
        </span>

        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 font-data text-[11px] font-bold tabular ${t.kutu}`}
          >
            {odul.tip === "percent"
              ? `%${odul.yuzde} · en fazla ${tlYaz(odul.maliyetKurus)} TL`
              : `${tlYaz(odul.maliyetKurus)} TL`}
          </span>
          <span className="rounded-full bg-cukur px-2 py-0.5 text-[11px] text-yazi-sonuk">
            {kanitCumlesi(odul.kanitSeviyesi)}
          </span>
          {odul.urunAdi && (
            <span className="rounded-full bg-cukur px-2 py-0.5 text-[11px] text-yazi-sonuk">
              {odul.urunAdi}
            </span>
          )}
        </span>
      </span>

      {/* Ü94: ad düzeltmesi durum düğmesinin yanında. Bugüne kadar yazım
          hatasının tek çaresi ödülü kaldırıp yenisini eklemekti — yani
          geçmişini kaybetmek ("ize amreicano", Ü75). */}
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <DurumDugmesi odulId={odul.id} aktif={odul.aktif} />
        <AdDuzeltme
          eylem={adEylemi}
          kimlikAlani="odulId"
          kimlik={odul.id}
          adAlani="baslik"
          mevcutAd={odul.baslik}
          aciklamaAlani="aciklama"
          mevcutAciklama={odul.aciklama}
          acikKupon={odul.acikKupon}
          etiket="Ödül adı"
        />
      </span>
    </div>
  );
}

/**
 * Ödül tipinin görünümü — ikon, renk, çerçeve.
 *
 * Tek yerde: kart, form düğmesi ve ileride rapor aynı tipe aynı rengi
 * vermek zorunda. İki yerde tanımlansaydı biri değişir, diğeri kalırdı.
 */
const TIP_GORUNUM = {
  product: {
    kutu: "bg-urun-zemin text-urun",
    kenar: "hover:border-urun",
    ikon: <UrunSimgesi />,
  },
  percent: {
    kutu: "bg-kampanya-zemin text-kampanya",
    kenar: "hover:border-kampanya",
    ikon: <YuzdeSimgesi />,
  },
  amount: {
    kutu: "bg-para-zemin text-para",
    kenar: "hover:border-para",
    ikon: <TutarSimgesi />,
  },
} as const;

const SIMGE = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function UrunSimgesi() {
  return (
    <svg {...SIMGE}>
      <path d="M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
      <path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7 4.5v1.5M11 3.5v2.5" />
    </svg>
  );
}

function YuzdeSimgesi() {
  return (
    <svg {...SIMGE}>
      <path d="M19 5 5 19" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  );
}

function TutarSimgesi() {
  return (
    <svg {...SIMGE}>
      <path d="M12.6 3H20a1 1 0 0 1 1 1v7.4a2 2 0 0 1-.6 1.4l-7.6 7.6a2 2 0 0 1-2.8 0l-6.4-6.4a2 2 0 0 1 0-2.8l7.6-7.6a2 2 0 0 1 1.4-.6Z" />
      <circle cx="16.5" cy="7.5" r="1.4" />
    </svg>
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
