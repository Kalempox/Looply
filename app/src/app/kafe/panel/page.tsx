import Link from "next/link";
import { redirect } from "next/navigation";
import { withCafe } from "@/db/context";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as oturum from "@/domain/session";
import { durum as butceDurumu } from "@/domain/butce";
import * as panel from "@/domain/panel";
import { SayiKarti, IKON, type Alan } from "@/components/gosterge";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  Rozet,
  IsletmeUyari,
} from "@/components/isletme";

export const dynamic = "force-dynamic";
export const metadata = { title: "İşletme paneli · Looply" };

/**
 * Kafe paneli.
 *
 * ── Neden liste değil kart ──────────────────────────────────
 *
 * Önceki hâli her şeyi satır satır yazıyordu ve dokuz satırın dokuzunda da
 * yeşil "açık" rozeti vardı: eksik olan iki madde o yeşilliğin arasında
 * kayboluyordu. Panel okunacak bir belge değil, **bakılacak bir gösterge** —
 * kafe sahibinin ilk sorusu "bugün ne durumdayım".
 *
 * Şimdi eksik olan kendini kırmızı kenarla gösteriyor, tamam olan sessiz
 * kalıyor. Bütçe tek bakışta okunan bir çubuğa dönüştü.
 *
 * Her sorgu `withCafe` bağlamından geçiyor; `cafe_id` oturumdan geliyor ve
 * satırları RLS süzüyor.
 */
export default async function KafePaneli() {
  const o = await kafeYoneticisiGerekli();

  const veri = await withCafe(o.cafeId, async (db) => {
    // Dikkat: sorgularda cafe_id süzgeci YOK. Satırları RLS süzüyor.
    const kafe = await db.one<{
      name: string;
      city: string | null;
      slug: string;
      lat: number | null;
      lng: number | null;
    }>(`SELECT name, city, slug, lat, lng FROM cafes`);
    const masa = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM cafe_tables`,
    );
    const personel = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM staff WHERE active = true`,
    );
    const cihaz = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM cafe_devices WHERE active = true`,
    );
    return {
      kafe,
      konumVar: kafe?.lat != null && kafe?.lng != null,
      masa: Number(masa?.n ?? 0),
      personel: Number(personel?.n ?? 0),
      cihaz: Number(cihaz?.n ?? 0),
    };
  });

  const [butce, gosterge] = await Promise.all([
    butceDurumu(o.cafeId),
    panel.ozet(o.cafeId),
  ]);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="İşletme paneli" alt={veri.kafe?.city ?? undefined}>
        {veri.kafe?.name ?? "İşletme"}
      </IsletmeBaslik>

      {/* Kurulumun geri kalanı doğru olsa bile konum yoksa hiçbir şey
          kazanılmıyor. Bu yüzden uyarı listenin içinde değil, en üstte. */}
      {!veri.konumVar && (
        <div className="mb-8">
          <IsletmeUyari>
            <strong>Kafenin konumu belirlenmemiş.</strong> Oyuncular konumlarını
            doğrulayamıyor; puan, ödül ve kupon hiç kazanılmıyor.{" "}
            <Link href="/kafe/panel/konum" className="underline">
              Konumu işaretle
            </Link>
          </IsletmeUyari>
        </div>
      )}

      {/* ── Bugünün göstergesi ───────────────────────────
          Vardiya arasında iki saniye bakılan yer. Dört sayı ve bir
          grafik; karar vermek için rapora gidiliyor. */}
      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Gosterge
          etiket="Bugün gelen"
          alt="sayılan ziyaret"
          olcu={gosterge.ziyaret}
          ikon="kisi"
          alan="kisi"
          yol="/kafe/panel/rapor"
        />
        <Gosterge
          etiket="Verilen kupon"
          alt="kazanıldı"
          olcu={gosterge.kuponVerilen}
          ikon="kupon"
          alan="odul"
          yol="/kafe/panel/oduller"
        />
        <Gosterge
          etiket="Kullanılan"
          alt="kasada onaylandı"
          olcu={gosterge.kuponKullanilan}
          ikon="onay"
          alan="kampanya"
          yol="/kafe/panel/rapor"
        />
        {/* Vurgu kartı: kafenin cebinden çıkan tek sayı. Referans
            panellerde de kartlardan biri dolu renkli — göz önce oraya
            gidiyor ve gitmesi gereken yer burası. */}
        <Gosterge
          etiket="Bugün ödediğin"
          alt="gerçekleşen indirim"
          olcu={gosterge.kullanilanKurus}
          ikon="para"
          birim="TL"
          kurus
          alan="para"
          yol="/kafe/panel/butce"
          vurgulu
        />
      </section>

      <section className="mb-9">
        <YediGunGrafigi gunler={gosterge.sonYedi} />
      </section>

      <section className="mb-9 grid gap-3 sm:grid-cols-2">
        <ButceKarti butce={butce} />
        <div className="grid grid-cols-3 gap-3">
          <KucukKart
            etiket="Masa"
            deger={veri.masa}
            yol="/kafe/panel/masalar"
            eksik={veri.masa === 0}
          />
          <KucukKart
            etiket="Personel"
            deger={veri.personel}
            yol="/kafe/panel/personel"
          />
          <KucukKart
            etiket="Cihaz"
            deger={veri.cihaz}
            yol="/kafe/panel/personel"
          />
        </div>
      </section>

      <Bolum baslik="Kurulum ve yönetim">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kart
            baslik="Kafe konumu"
            aciklama="Oyuncunun kafede olduğunu doğrulamanın tek yolu"
            yol="/kafe/panel/konum"
            eksik={!veri.konumVar}
            ikon="konum"
            alan="masa"
          />
          <Kart
            baslik="Günlük bütçe"
            aciklama="En az 1.500 TL — kullanılmayan kuponun maliyeti yok"
            yol="/kafe/panel/butce"
            eksik={!butce.donem}
            ikon="butce"
            alan="para"
          />
          <Kart
            baslik="Ödüller ve kampanyalar"
            aciklama="Oyuncunun kazandığı ödüller ve herkese açık yüzde indirimleri"
            yol="/kafe/panel/oduller"
            ikon="odul"
            alan="odul"
          />
          <Kart
            baslik="Ürünler"
            aciklama="Menün — ödüllerin ve kampanyaların dayanağı"
            yol="/kafe/panel/urunler"
            ikon="urun"
            alan="urun"
          />
          <Kart
            baslik="Masa karekodları"
            aciklama="Ekle, yazdır, masaya yapıştır"
            yol="/kafe/panel/masalar"
            eksik={veri.masa === 0}
            ikon="karekod"
            alan="masa"
          />
          <Kart
            baslik="Personel ve PIN"
            aciklama="Kasiyer hesabı aç, PIN ver, kasa cihazını kaydet"
            yol="/kafe/panel/personel"
            ikon="personel"
            alan="kisi"
          />
          <Kart
            baslik="Happy Hour"
            aciklama="Boş saatine görünür bir TL havuzu ayır"
            yol="/kafe/panel/happy-hour"
            ikon="saat"
            alan="kampanya"
          />
          <Kart
            baslik="Rapor"
            aciklama="Gelen müşteri, tekrar gelen, kullanılan indirim, dolu saatler"
            yol="/kafe/panel/rapor"
            ikon="rapor"
            alan="genel"
          />
        </div>
      </Bolum>

      {/* Bilgisayarda çıkış kenar çubuğunun altında duruyor; burada
          tekrar etmesi gereksiz. Telefonda kenar çubuğu yok, o yüzden
          bu satır orada kalıyor. */}
      <nav className="mt-10 flex items-center gap-5 border-t border-cizgi pt-6 text-[14px] lg:hidden">
        <form action={cikisYap}>
          <button type="submit" className="text-yazi-sonuk underline">
            Çıkış yap
          </button>
        </form>
      </nav>
    </IsletmeSayfa>
  );
}

/**
 * Panelin gösterge kutusu — ortak karta ince sarmalayıcı.
 *
 * Kartın kendisi `components/gosterge.tsx`'te (Ü62): panel bir belge
 * değil gösterge takımı ve sekiz sayfada aynı kartın sekiz kopyası
 * olmamalı. Burada kalan tek iş, `Olcu` tipini karta çevirmek —
 * kuruşu TL'ye bölmek ve "düne göre" cümlesini kurmak.
 */
function Gosterge({
  etiket,
  alt,
  olcu,
  ikon,
  birim,
  kurus = false,
  vurgulu = false,
  alan = "genel",
  yol,
}: {
  etiket: string;
  alt: string;
  olcu: panel.Olcu;
  ikon: keyof typeof IKON;
  birim?: string;
  /** Değer kuruş cinsindense TL'ye çevrilip yazılıyor. */
  kurus?: boolean;
  vurgulu?: boolean;
  alan?: Alan;
  yol?: string;
}) {
  const deger = kurus ? Math.round(olcu.bugun / 100) : olcu.bugun;

  return (
    <SayiKarti
      etiket={etiket}
      deger={`${deger.toLocaleString("tr-TR")}${birim ? ` ${birim}` : ""}`}
      alt={olcu.degisim !== null ? "düne göre" : alt}
      degisim={olcu.degisim}
      seri={olcu.seri}
      ikon={IKON[ikon]}
      vurgulu={vurgulu}
      alan={alan}
      yol={yol}
    />
  );
}

/**
 * Son yedi günün ziyaret grafiği.
 *
 * ── Neden çubuk, neden yedi ─────────────────────────────────
 *
 * Kafe sahibinin panelde sorduğu ikinci soru: *"bu hafta nasıl gidiyor?"*
 * Tek sayı bunu söylemiyor, tam rapor ise fazla. Yedi çubuk, haftanın
 * şeklini bir bakışta veriyor ve bugünü ayrı renkle işaretliyor.
 *
 * Boş günler de çiziliyor: eksik sütun, o günü hiç olmamış gibi gösterip
 * grafiği yanıltırdı.
 */
function YediGunGrafigi({
  gunler,
}: {
  gunler: { gun: string; ziyaret: number }[];
}) {
  const enYuksek = Math.max(1, ...gunler.map((g) => g.ziyaret));
  const toplam = gunler.reduce((t, g) => t + g.ziyaret, 0);

  return (
    <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
      <div className="flex items-baseline justify-between">
        <span className="etiket-caps text-yazi-sonuk">Son 7 gün</span>
        <span className="font-data text-[13px] tabular">
          <strong className="text-[15px]">{toplam}</strong>{" "}
          <span className="text-yazi-sonuk">ziyaret</span>
        </span>
      </div>

      {/*
        Çubuğun yüzde yüksekliği, yüksekliği ÇÖZÜLMÜŞ bir kapsayıcı ister.
        Bir tur çubuklar hiç görünmedi: sütun `flex-col` idi ve yüksekliği
        içeriğinden geliyordu, yani `height: 60%` sıfıra çözülüyordu.
        Aradaki `flex-1` kutu bu yüzden var — ölçüyü o veriyor.
      */}
      <div className="mt-4 flex h-28 gap-1.5">
        {gunler.map((g, i) => {
          const bugunMu = i === gunler.length - 1;
          return (
            <div
              key={g.gun}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <span className="font-data text-[10px] text-yazi-sonuk tabular">
                {g.ziyaret > 0 ? g.ziyaret : ""}
              </span>
              <span className="flex w-full flex-1 items-end">
                <span
                  className={`w-full rounded-t-sm ${bugunMu ? "bg-vurgu" : "bg-cukur"}`}
                  style={{
                    height: `${Math.max(4, (g.ziyaret / enYuksek) * 100)}%`,
                  }}
                />
              </span>
              <span className="etiket-caps text-[9px] text-yazi-sonuk">
                {gunAdi(g.gun)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Grafik ekseni için kısa gün adı — "Pzt", "Sal"… */
function gunAdi(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("tr-TR", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function tlYaz(kurus: number): string {
  return (kurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

/**
 * Bütçe kartı — panelin en çok bakılan sayısı.
 *
 * Çubuk üç değeri tek bakışta veriyor: kasada harcanan, açık kuponlarda
 * bağlı olan, kalan. Sayıları okumadan da "bugün ne kadar yerim var"
 * sorusu cevaplanıyor.
 */
function ButceKarti({
  butce,
}: {
  butce: Awaited<ReturnType<typeof butceDurumu>>;
}) {
  if (!butce.donem) {
    return (
      <Link
        href="/kafe/panel/butce"
        className="flex flex-col justify-between rounded-2xl border-2 border-tehlike/70 bg-yuzey p-5 transition-colors hover:bg-cukur"
      >
        <div className="etiket-caps text-tehlike">Bugünün bütçesi yok</div>
        <div className="mt-3 text-[14px] leading-relaxed text-yazi-sonuk">
          Bütçe belirlenmeden hiçbir ödül dağıtılamaz.
        </div>
        <div className="mt-3 etiket-caps text-vurgu">Bütçeyi belirle →</div>
      </Link>
    );
  }

  const taahhut = butce.donem.taahhutKurus;
  const oran = (k: number) =>
    taahhut > 0 ? Math.min(100, Math.round((k / taahhut) * 100)) : 0;

  return (
    <Link
      href="/kafe/panel/butce"
      className="rounded-2xl border border-cizgi bg-yuzey p-5 transition-colors hover:bg-cukur"
    >
      <div className="flex items-baseline justify-between">
        <span className="etiket-caps text-yazi-sonuk">Bugün dağıtılabilir</span>
        <span className="font-data text-[11px] text-yazi-sonuk tabular">
          {tlYaz(taahhut)} TL taahhüt
        </span>
      </div>

      <div className="mt-2 font-data text-4xl leading-none font-bold tabular">
        {tlYaz(butce.dagitilabilirKurus)}
        <span className="ml-1 text-[14px] font-normal text-yazi-sonuk">TL</span>
      </div>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-cukur">
        <span
          className="bg-vurgu"
          style={{ width: `${oran(butce.harcananKurus)}%` }}
        />
        <span
          className="bg-odul"
          style={{ width: `${oran(butce.rezerveKurus)}%` }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 font-data text-[11px] text-yazi-sonuk tabular">
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-vurgu align-middle" />
          {tlYaz(butce.harcananKurus)} TL kasada
        </span>
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-odul align-middle" />
          {tlYaz(butce.rezerveKurus)} TL açık kuponlarda
        </span>
      </div>
    </Link>
  );
}

function KucukKart({
  etiket,
  deger,
  yol,
  eksik,
}: {
  etiket: string;
  deger: number;
  yol: string;
  eksik?: boolean;
}) {
  return (
    <Link
      href={yol}
      className={`flex flex-col justify-between rounded-2xl border bg-yuzey p-4 transition-colors hover:bg-cukur ${
        eksik ? "border-tehlike/60" : "border-cizgi"
      }`}
    >
      <span className="etiket-caps text-[10px] text-yazi-sonuk">{etiket}</span>
      <span
        className={`mt-3 font-data text-2xl leading-none font-bold tabular ${
          eksik ? "text-tehlike" : ""
        }`}
      >
        {deger}
      </span>
    </Link>
  );
}

/**
 * Kurulum kartı.
 *
 * Eksik olan kırmızı kenarla kendini gösteriyor; tamam olan sessiz kalıyor.
 * Önceki hâli her satıra yeşil "açık" rozeti koyuyordu ve iki kırmızı, yedi
 * yeşilin arasında kayboluyordu.
 */
/**
 * Kurulum kartı — Ü63.
 *
 * ── Renk neden alandan geliyor ──────────────────────────────
 *
 * Sekiz kartın sekizi de gri ikon kutusuyla duruyordu ve ürün sahibi
 * "çok basit" dedi. Doğru teşhis: kutular birbirinden ayrılmıyordu, göz
 * sekiz kez aynı şeyi okuyup başlığa inmek zorunda kalıyordu.
 *
 * Artık her kart kendi alanının renginde (Ü63): bütçe yeşil, masa sarı,
 * ürün turuncu, personel turkuaz, ödül altın, kampanya mor. Renk süs
 * değil — kafe sahibi ikinci gelişinde başlığı okumadan gideceği kartı
 * buluyor.
 *
 * ── Üstüne gelince ──────────────────────────────────────────
 *
 * Çerçeve alanın rengine dönüyor ve ikon kutusu koyulaşıyor. Gri
 * çerçeve "tıklanabilir" diyordu ama "neye tıklıyorsun" demiyordu.
 *
 * ── Eksik olan rengini kaybediyor ───────────────────────────
 *
 * Eksik kart kırmızıya dönüyor ve alan rengini bırakıyor: o an
 * söylenmesi gereken tek şey eksikliğin kendisi.
 */
function Kart({
  baslik,
  aciklama,
  yol,
  eksik,
  ikon,
  alan,
}: {
  baslik: string;
  aciklama: string;
  yol: string;
  eksik?: boolean;
  ikon: keyof typeof IKONLAR;
  alan: Alan;
}) {
  const renk = KART_RENGI[alan];

  return (
    <Link
      href={yol}
      className={`group flex flex-col rounded-2xl border bg-yuzey p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        eksik ? "border-tehlike/60" : `border-cizgi ${renk.kenar}`
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
            eksik ? "bg-tehlike/10 text-tehlike" : renk.kutu
          }`}
        >
          {IKONLAR[ikon]}
        </span>
        {eksik ? (
          <Rozet tur="red">eksik</Rozet>
        ) : (
          <span
            aria-hidden
            className={`text-[15px] text-yazi-sonuk/35 transition-colors ${renk.ok}`}
          >
            →
          </span>
        )}
      </span>

      <span className="mt-3 block text-[15px] leading-tight font-semibold">
        {baslik}
      </span>
      <span className="mt-1.5 block text-[13px] leading-relaxed text-yazi-sonuk">
        {aciklama}
      </span>
    </Link>
  );
}

/**
 * Kurulum kartının alan renkleri.
 *
 * Tailwind sınıfları **tam yazılmak zorunda**: `hover:border-${x}` gibi
 * bir birleştirme derleme sırasında taranamıyor ve sınıf üretilmiyor.
 * Bu yüzden harita, kısaltma değil.
 */
const KART_RENGI: Record<Alan, { kutu: string; kenar: string; ok: string }> = {
  genel: {
    kutu: "bg-vurgu-zemin text-vurgu",
    kenar: "hover:border-vurgu",
    ok: "group-hover:text-vurgu",
  },
  para: {
    kutu: "bg-para-zemin text-para",
    kenar: "hover:border-para",
    ok: "group-hover:text-para",
  },
  masa: {
    kutu: "bg-masa-zemin text-masa",
    kenar: "hover:border-masa",
    ok: "group-hover:text-masa",
  },
  urun: {
    kutu: "bg-urun-zemin text-urun",
    kenar: "hover:border-urun",
    ok: "group-hover:text-urun",
  },
  kisi: {
    kutu: "bg-kisi-zemin text-kisi",
    kenar: "hover:border-kisi",
    ok: "group-hover:text-kisi",
  },
  odul: {
    kutu: "bg-odul-zemin text-odul-koyu",
    kenar: "hover:border-odul",
    ok: "group-hover:text-odul-koyu",
  },
  kampanya: {
    kutu: "bg-kampanya-zemin text-kampanya",
    kenar: "hover:border-kampanya",
    ok: "group-hover:text-kampanya",
  },
};

/* Satır içi SVG — işletme tarafında emoji yok (Ü31) ve dış kaynak da yok. */
const cizgi = {
  width: 19,
  height: 19,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const IKONLAR = {
  konum: (
    <svg {...cizgi} aria-hidden>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  ),
  butce: (
    <svg {...cizgi} aria-hidden>
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <path d="M2.5 10.5h19" />
    </svg>
  ),
  odul: (
    <svg {...cizgi} aria-hidden>
      <path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Z" />
      <path d="M3 5.5h18V9H3zM12 5.5V21" />
    </svg>
  ),
  urun: (
    <svg {...cizgi} aria-hidden>
      <path d="M6 8h10v6a5 5 0 0 1-10 0V8Z" />
      <path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M4 21h14" />
    </svg>
  ),
  karekod: (
    <svg {...cizgi} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v3M14 20h6" />
    </svg>
  ),
  personel: (
    <svg {...cizgi} aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 11a3 3 0 1 0 0-6M18 20a6 6 0 0 0-3-5.2" />
    </svg>
  ),
  saat: (
    <svg {...cizgi} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  rapor: (
    <svg {...cizgi} aria-hidden>
      <path d="M3 21h18" />
      <rect x="5" y="12" width="4" height="7" rx="1" />
      <rect x="10" y="7" width="4" height="12" rx="1" />
      <rect x="15" y="14" width="4" height="5" rx="1" />
    </svg>
  ),
} as const;

async function cikisYap() {
  "use server";
  await oturum.kapat("kullanici_cikisi");
  redirect("/kafe/giris");
}
