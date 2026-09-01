import Link from "next/link";
import { redirect } from "next/navigation";
import { withCafe } from "@/db/context";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as oturum from "@/domain/session";
import { durum as butceDurumu } from "@/domain/butce";
import * as panel from "@/domain/panel";
import { IsletmeSayfa, IsletmeBaslik, Bolum, Rozet, IsletmeUyari } from "@/components/isletme";

export const dynamic = "force-dynamic";
export const metadata = { title: "İşletme paneli · CafePlay" };

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
    const masa = await db.one<{ n: string }>(`SELECT count(*) AS n FROM cafe_tables`);
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
            <strong>Kafenin konumu belirlenmemiş.</strong> Oyuncular konumlarını doğrulayamıyor;
            puan, ödül ve kupon hiç kazanılmıyor.{" "}
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
          deger={String(gosterge.ziyaret)}
          alt="sayılan ziyaret"
          renk="vurgu"
          ikon="kisi"
        />
        <Gosterge
          etiket="Verilen kupon"
          deger={String(gosterge.kuponVerilen)}
          alt="kazanıldı"
          renk="odul"
          ikon="kupon"
        />
        <Gosterge
          etiket="Kullanılan"
          deger={String(gosterge.kuponKullanilan)}
          alt="kasada onaylandı"
          renk="yazi"
          ikon="onay"
        />
        <Gosterge
          etiket="Bugün ödediğin"
          deger={`${(gosterge.kullanilanKurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL`}
          alt="gerçekleşen indirim"
          renk="vurgu"
          ikon="para"
        />
      </section>

      <section className="mb-9">
        <YediGunGrafigi gunler={gosterge.sonYedi} />
      </section>

      <section className="mb-9 grid gap-3 sm:grid-cols-2">
        <ButceKarti butce={butce} />
        <div className="grid grid-cols-3 gap-3">
          <KucukKart etiket="Masa" deger={veri.masa} yol="/kafe/panel/masalar" eksik={veri.masa === 0} />
          <KucukKart etiket="Personel" deger={veri.personel} yol="/kafe/panel/personel" />
          <KucukKart etiket="Cihaz" deger={veri.cihaz} yol="/kafe/panel/personel" />
        </div>
      </section>

      <Bolum baslik="Kurulum ve yönetim">
        <div className="grid gap-3 sm:grid-cols-2">
          <Kart
            baslik="Kafe konumu"
            aciklama="Oyuncunun kafede olduğunu doğrulamanın tek yolu"
            yol="/kafe/panel/konum"
            eksik={!veri.konumVar}
            ikon="konum"
          />
          <Kart
            baslik="Günlük bütçe"
            aciklama="En az 1.500 TL — kullanılmayan kuponun maliyeti yok"
            yol="/kafe/panel/butce"
            eksik={!butce.donem}
            ikon="butce"
          />
          <Kart
            baslik="Ödüller ve kampanyalar"
            aciklama="Oyuncunun kazandığı ödüller ve herkese açık yüzde indirimleri"
            yol="/kafe/panel/oduller"
            ikon="odul"
          />
          <Kart
            baslik="Ürünler"
            aciklama="Menün — ödüllerin ve kampanyaların dayanağı"
            yol="/kafe/panel/urunler"
            ikon="urun"
          />
          <Kart
            baslik="Masa karekodları"
            aciklama="Ekle, yazdır, masaya yapıştır"
            yol="/kafe/panel/masalar"
            eksik={veri.masa === 0}
            ikon="karekod"
          />
          <Kart
            baslik="Personel ve PIN"
            aciklama="Kasiyer hesabı aç, PIN ver, kasa cihazını kaydet"
            yol="/kafe/panel/personel"
            ikon="personel"
          />
          <Kart
            baslik="Happy Hour"
            aciklama="Boş saatine görünür bir TL havuzu ayır"
            yol="/kafe/panel/happy-hour"
            ikon="saat"
          />
          <Kart
            baslik="Rapor"
            aciklama="Gelen müşteri, tekrar gelen, kullanılan indirim, dolu saatler"
            yol="/kafe/panel/rapor"
            ikon="rapor"
          />
        </div>
      </Bolum>

      <nav className="mt-10 flex items-center gap-5 border-t border-cizgi pt-6 text-[14px]">
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
 * Gösterge kutusu — panelin üstündeki dört sayı.
 *
 * ── Renk neden var ──────────────────────────────────────────
 *
 * İşletme tarafı bugüne kadar tek renkli ve bilerek sakindi. Ürün sahibi
 * paneli "daha görsel ve kullanıcı dostu" istedi ve örnek olarak yönetim
 * paneli şablonları verdi; oradaki ortak öge, sayıyı renkli bir ikon
 * kutusuyla eşleştirmek.
 *
 * Palet **genişlemedi**: mevcut üç jeton (vurgu, ödül, yazı) dönüşümlü
 * kullanılıyor. Renk burada bir anlam taşımıyor, yalnızca dört kutuyu
 * birbirinden ayırıyor — anlam taşısaydı (kırmızı = kötü) sayıların
 * yorumunu ekrana gömmüş olurduk ve "bugün 0 kupon" iyi mi kötü mü
 * sorusunun cevabı kafeye göre değişir.
 */
function Gosterge({
  etiket,
  deger,
  alt,
  renk,
  ikon,
}: {
  etiket: string;
  deger: string;
  alt: string;
  renk: "vurgu" | "odul" | "yazi";
  ikon: keyof typeof GOSTERGE_IKONLARI;
}) {
  const zemin =
    renk === "vurgu" ? "bg-vurgu/10 text-vurgu" : renk === "odul" ? "bg-odul/15 text-odul-koyu" : "bg-cukur text-yazi";

  return (
    <div className="rounded-2xl border border-cizgi bg-yuzey px-4 py-4">
      <span className={`flex size-9 items-center justify-center rounded-xl ${zemin}`}>
        {GOSTERGE_IKONLARI[ikon]}
      </span>
      <div className="mt-3 font-data text-2xl leading-none font-bold tabular">{deger}</div>
      <div className="etiket-caps mt-2 text-[10px] text-yazi-sonuk">{etiket}</div>
      <div className="mt-0.5 text-[11px] leading-snug text-yazi-sonuk">{alt}</div>
    </div>
  );
}

const IKON_ORTAK = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const GOSTERGE_IKONLARI = {
  kisi: (
    <svg {...IKON_ORTAK}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  ),
  kupon: (
    <svg {...IKON_ORTAK}>
      <path d="M3 9V6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5V9a3 3 0 0 0 0 6v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V15a3 3 0 0 0 0-6Z" />
      <path d="M14 5v14" strokeDasharray="2 2.5" />
    </svg>
  ),
  onay: (
    <svg {...IKON_ORTAK}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </svg>
  ),
  para: (
    <svg {...IKON_ORTAK}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
} as const;

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
function YediGunGrafigi({ gunler }: { gunler: { gun: string; ziyaret: number }[] }) {
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
            <div key={g.gun} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="font-data text-[10px] text-yazi-sonuk tabular">
                {g.ziyaret > 0 ? g.ziyaret : ""}
              </span>
              <span className="flex w-full flex-1 items-end">
                <span
                  className={`w-full rounded-t-sm ${bugunMu ? "bg-vurgu" : "bg-cukur"}`}
                  style={{ height: `${Math.max(4, (g.ziyaret / enYuksek) * 100)}%` }}
                />
              </span>
              <span className="etiket-caps text-[9px] text-yazi-sonuk">{gunAdi(g.gun)}</span>
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
function ButceKarti({ butce }: { butce: Awaited<ReturnType<typeof butceDurumu>> }) {
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
  const oran = (k: number) => (taahhut > 0 ? Math.min(100, Math.round((k / taahhut) * 100)) : 0);

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
        <span className="bg-vurgu" style={{ width: `${oran(butce.harcananKurus)}%` }} />
        <span className="bg-odul" style={{ width: `${oran(butce.rezerveKurus)}%` }} />
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
function Kart({
  baslik,
  aciklama,
  yol,
  eksik,
  ikon,
}: {
  baslik: string;
  aciklama: string;
  yol: string;
  eksik?: boolean;
  ikon: keyof typeof IKONLAR;
}) {
  return (
    <Link
      href={yol}
      className={`flex gap-3.5 rounded-2xl border bg-yuzey p-4 transition-colors hover:bg-cukur ${
        eksik ? "border-tehlike/60" : "border-cizgi"
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${eksik ? "text-tehlike" : "text-yazi-sonuk"}`}>
        {IKONLAR[ikon]}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold">{baslik}</span>
          {eksik && <Rozet tur="red">eksik</Rozet>}
        </span>
        <span className="mt-1 block text-[13px] leading-relaxed text-yazi-sonuk">{aciklama}</span>
      </span>
    </Link>
  );
}

/* Satır içi SVG — işletme tarafında emoji yok (Ü31) ve dış kaynak da yok. */
const cizgi = {
  width: 22,
  height: 22,
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
