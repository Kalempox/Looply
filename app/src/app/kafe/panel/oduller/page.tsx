import Link from "next/link";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as katalog from "@/domain/katalog";
import * as urun from "@/domain/urun";
import * as ayar from "@/domain/ayar";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  IsletmeUyari,
} from "@/components/isletme";
import { OdulEkleme, DurumDugmesi, EsikAyari } from "./kontroller";
import { AdDuzeltme } from "../ad-duzeltme";
import { SinirKutusu } from "./sinir-kutusu";
import { adEylemi } from "./actions";
import { FarkNotu } from "../fark-notu";
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
  const [oduller, urunler, esikKurus, carkSinirKurus, ertelemeSaat] = await Promise.all([
    katalog.listele(o.cafeId),
    urun.listele(o.cafeId, false),
    ayar.sayiOku(o.cafeId, ayar.ANAHTARLAR.ertelemeEsigi),
    // Çarkın ayarları `/kafe/panel/cark`ta; buradaki tek ihtiyaç "kaç ödül
    // çarka giriyor" sayısı ve o da sınırı bilmeyi gerektiriyor.
    ayar.sayiOku(o.cafeId, ayar.ANAHTARLAR.carkUstSinir),
    // Ü129: aktivasyon saati artık kafenin ayarı, `kupon.ts`teki sabit değil.
    ayar.sayiOku(o.cafeId, ayar.ANAHTARLAR.ertelemeSaati),
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
        alt="Oyun sonunda ve şans çarkında düşen ödüller — kişiye özel, tek kullanımlık."
      >
        Ödüller
      </IsletmeBaslik>

      <FarkNotu taraf="odul" />

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
          alt={`üstü ${ertelemeSaat} saat bekliyor`}
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
        🔴 İki kolon KALDIRILDI (Ü124).

        Ü58'de sol kolon "yazma", sağ kolon "okuma" olsun diye ikiye
        bölünmüştü. Doğru fikirdi ama sonucu şuydu: on altı satırlık,
        her satırında üç eylem olan bir liste **550 piksellik** bir
        sütuna sıkıştı. Ad, değer ve üç düğme aynı satıra sığmayınca
        satırlar iki üç kata çıktı; sol kolon ise formun bitiminden
        sonra bomboş kaldı. Ürün sahibi iki kez "çok kullanışsız ve
        karmaşık" dedi ve haklıydı — sorun renk ya da yazı tipi değil,
        **yer** idi.

        Şimdi: ayarlar üstte tek sıra, katalog **tam genişlikte**.
        Liste 1150 piksele yayılınca satır gerçekten tek satır oluyor
        ve sütunlar hizalanabiliyor.
      */}
      <div className="mb-8 grid items-start gap-4 lg:grid-cols-3">
        {/*
          Form artık açılır kapanır. Kafe sahibi bu sayfaya günde birkaç
          kez "ne var" diye bakıyor, ödül eklemek ise haftada bir iş;
          sürekli açık duran bir form ekranın üçte birini o nadir iş için
          harcıyordu. Katalog boşken açık geliyor — o zaman yapılacak tek
          şey zaten ödül eklemek.
        */}
        <details
          open={oduller.length === 0}
          className="group rounded-2xl border border-cizgi bg-yuzey"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
            <span>
              <span className="block text-[15px] font-semibold">Yeni ödül</span>
              <span className="mt-0.5 block text-[12px] text-yazi-sonuk">
                Oyun sonunda ve çarkta çıkacak
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
            <OdulEkleme urunler={urunler.map((u) => ({ id: u.id, ad: u.ad }))} />
          </div>
        </details>

        <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
          <div className="text-[15px] font-semibold">Gecikmeli açılma</div>
          <p className="mt-0.5 mb-4 text-[12px] leading-relaxed text-yazi-sonuk">
            Bu tutarın üstündeki ödül {ertelemeSaat} saat sonra açılır —
            müşteriyi ertesi gün geri getiren mekanik bu. Çark ödülü ve oyun
            ödülü aynı kuralı paylaşıyor.
          </p>
          <EsikAyari mevcutTl={Math.round(esikKurus / 100)} mevcutSaat={ertelemeSaat} />
        </div>

        <Link
          href="/kafe/panel/cark"
          className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-cizgi bg-yuzey px-5 py-5 transition-colors hover:border-vurgu"
        >
          <span>
            <span className="block text-[15px] font-semibold">Şans çarkı</span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-yazi-sonuk">
              Hangi ödül çarkta olacak ve yüzde kaç ihtimalle çıkacak —
              hepsi çarkın kendi sayfasında.
            </span>
          </span>
          <span className="flex items-center justify-between gap-3">
            <span className="font-data text-[13px] font-bold tabular">
              {carkaUygun} ödül çarkta
            </span>
            <span aria-hidden className="text-yazi-sonuk">
              →
            </span>
          </span>
        </Link>
      </div>

      {/*
        🔴 Katalog tam genişlikte ve **sütunlu** (Ü124).

        Önceki hâli kart yığınıydı, sonra satır listesine çevrildi ama
        yarım sütunda kaldığı için hâlâ okunmuyordu. Şimdi başlık satırı
        olan bir tablo düzeni: göz aşağı inerken değer değerin, koşul
        koşulun altında. On altı ödülü karşılaştırmanın tek yolu bu.
      */}
      <Bolum baslik="Katalog">
        {oduller.length === 0 ? (
          <p className="text-[14px] text-yazi-sonuk">
            Katalog boş. Oyuncu oyunu bitiriyor ama kazanacağı bir şey yok —
            yukarıdaki formdan ilk ödülünü ekle.
          </p>
        ) : (
          <div className="space-y-7">
            <OdulGrubu
              baslik="Yayında"
              bos="Yayında hiç ödül yok — oyuncular şu an hiçbir şey kazanamıyor."
              oduller={yayinda}
              esikKurus={esikKurus}
            />
            <OdulGrubu
              baslik="Yayında değil"
              bos="Yayından kaldırılmış ödülün yok."
              oduller={oduller.filter((x) => !x.aktif)}
              esikKurus={esikKurus}
              sonuk
            />
          </div>
        )}
      </Bolum>

    </IsletmeSayfa>
  );
}

/**
 * Duruma göre ödül grubu — Ü123, Ü124'te sütunlandı.
 *
 * ⚠️ Boş grup **gizlenmiyor**, cümlesiyle duruyor. "Yayında hiç ödül
 * yok" görünmezse kafe sahibi listeyi boş sanır ve asıl sorunu —
 * oyuncuların hiçbir şey kazanamadığını — hiç okumaz.
 */
function OdulGrubu({
  baslik,
  bos,
  oduller,
  esikKurus,
  sonuk = false,
}: {
  baslik: string;
  bos: string;
  oduller: katalog.Odul[];
  /** Gecikme eşiği — satırda "hemen mi açılıyor" bunu gerektiriyor. */
  esikKurus: number;
  /** Yayında olmayanlar soluk: göz önce yayındakine gitmeli. */
  sonuk?: boolean;
}) {
  if (oduller.length === 0) {
    return (
      <section>
        <GrupBasligi baslik={baslik} sayi={0} />
        <p className="rounded-xl border border-dashed border-cizgi px-4 py-3.5 text-[13px] text-yazi-sonuk">
          {bos}
        </p>
      </section>
    );
  }

  return (
    <section>
      <GrupBasligi baslik={baslik} sayi={oduller.length} />

      <div
        className={`overflow-hidden rounded-2xl border border-cizgi bg-yuzey ${
          sonuk ? "opacity-70" : ""
        }`}
      >
        {/*
          Başlık satırı yalnızca geniş ekranda. Dar ekranda sütun yok —
          satırlar kendi içinde alt alta diziliyor ve başlık orada
          karşılıksız kalırdı.
        */}
        <div className="hidden border-b border-cizgi bg-cukur px-4 py-2 lg:grid lg:grid-cols-[1fr_120px_190px_auto] lg:items-center lg:gap-4">
          <span className="etiket-caps text-[9px] text-yazi-sonuk">Ödül</span>
          <span className="etiket-caps text-[9px] text-yazi-sonuk">Değer</span>
          <span className="etiket-caps text-[9px] text-yazi-sonuk">Koşul</span>
          <span className="etiket-caps text-[9px] text-yazi-sonuk">İşlem</span>
        </div>

        <ul className="divide-y divide-cizgi">
          {oduller.map((od) => (
            <li key={od.id}>
              <OdulSatiri odul={od} esikKurus={esikKurus} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GrupBasligi({ baslik, sayi }: { baslik: string; sayi: number }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <h3 className="etiket-caps text-yazi-sonuk">{baslik}</h3>
      <span className="font-data text-[12px] font-bold text-yazi-sonuk tabular">
        {sayi}
      </span>
    </div>
  );
}

/**
 * Katalogdaki tek ödül — Ü63 kart, Ü123 satır, Ü124 sütun.
 *
 * ── Neden sütun ─────────────────────────────────────────────
 *
 * Satır düzeni yarım sütunda çalışmıyordu: ad, değer ve üç düğme aynı
 * hizaya sığmayınca her satır kendi iç düzenini kuruyor ve on altı
 * satır on altı farklı biçim alıyordu. Karşılaştırma imkânsızdı —
 * "hangisi daha pahalı" sorusu için tek tek okumak gerekiyordu.
 *
 * Sütunlu düzende değer değerin, koşul koşulun altında. Göz aşağı
 * inerken tek bir hat izliyor.
 *
 * ⚠️ `lg` altında ızgara **kapanıyor**: telefonda dört sütun 90 piksere
 * düşer ve hiçbiri okunmaz. Orada satır kendi içinde alt alta diziliyor.
 */
function OdulSatiri({
  odul,
  esikKurus,
}: {
  odul: katalog.Odul;
  esikKurus: number;
}) {
  const t = TIP_GORUNUM[odul.tip];
  const kanit = kanitCumlesi(odul.kanitSeviyesi);
  const gecikiyor = odul.maliyetKurus > esikKurus;

  return (
    <div className="px-4 py-3.5 lg:grid lg:grid-cols-[1fr_120px_190px_auto] lg:items-center lg:gap-4">
      {/* ── Ödül ── */}
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${t.kutu}`}
          aria-hidden
        >
          {t.ikon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] leading-tight font-semibold">
            {odul.baslik}
          </span>
          {odul.urunAdi && (
            <span className="mt-0.5 block truncate text-[12px] text-yazi-sonuk">
              {odul.urunAdi}
            </span>
          )}
        </span>
      </div>

      {/* ── Değer ── */}
      <div className="mt-3 lg:mt-0">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 font-data text-[12px] font-bold tabular ${t.kutu}`}
        >
          {odul.tip === "percent"
            ? `%${odul.yuzde} · ↑${tlYaz(odul.maliyetKurus)} TL`
            : `${tlYaz(odul.maliyetKurus)} TL`}
        </span>
      </div>

      {/* ── Koşul ── */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-yazi-sonuk lg:mt-0">
        {/*
          Gecikme her ödülde geçerli bir bilgi ve eşikten türüyor —
          kafe sahibinin "bu ödül hemen mi kullanılır" sorusu, ödül
          eklerken değil listeye bakarken aklına geliyor.
        */}
        <span>{gecikiyor ? "12 saat sonra açılır" : "Hemen kullanılır"}</span>
        {kanit && <span className="text-odul-koyu">{kanit}</span>}
      </div>

      {/* ── İşlem ── */}
      <div className="mt-3 flex flex-wrap items-start justify-start gap-1.5 lg:mt-0 lg:justify-end">
        <SinirKutusu
          odulId={odul.id}
          gunlukLimit={odul.gunlukLimit}
          bugunVerilen={odul.bugunVerilen}
          gunler={odul.pencere.gunler}
          baslangicSaati={odul.pencere.baslangicSaati}
          bitisSaati={odul.pencere.bitisSaati}
          pencereMetni={odul.pencereMetni}
          acikKupon={odul.acikKupon}
        />
        {/* Ü94: ad düzeltmesi. Bugüne kadar yazım hatasının tek çaresi
            ödülü kaldırıp yenisini eklemekti — yani geçmişini kaybetmek
            ("ize amreicano", Ü75). */}
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
        <DurumDugmesi odulId={odul.id} aktif={odul.aktif} />
      </div>
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

/**
 * E6'yı kafenin diliyle anlatır — "K3" hiçbir kafe sahibine bir şey
 * söylemez.
 *
 * ⚠️ Taban seviyede **boş** dönüyor (Ü123). "Konumu doğrulanmış
 * oyunculara verilir" ödüllerin çoğu için geçerli; her satırda
 * tekrarlandığında bilgi değil gürültü oluyordu. Bir istisna
 * olduğunda — masada beklemek ya da fiş kodu — o zaman yazıyor.
 */
function kanitCumlesi(seviye: number): string {
  // Kısa tutuluyor: satırın ikinci kolonunda duruyor ve uzun cümle iki
  // satıra taşıp bütün listeyi yükseltiyordu.
  if (seviye >= 4) return "Fiş kodu gerekiyor";
  if (seviye === 3) return "Masada 5 dakika gerekiyor";
  return "";
}
