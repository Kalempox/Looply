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
        <Gosterge etiket="Bugün gelen" alt="sayılan ziyaret" olcu={gosterge.ziyaret} ikon="kisi" />
        <Gosterge etiket="Verilen kupon" alt="kazanıldı" olcu={gosterge.kuponVerilen} ikon="kupon" />
        <Gosterge
          etiket="Kullanılan"
          alt="kasada onaylandı"
          olcu={gosterge.kuponKullanilan}
          ikon="onay"
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
          vurgulu
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
 * Gösterge kutusu — panelin üstündeki dört sayı.
 *
 * ── Referanstan alınan üç parça ─────────────────────────────
 *
 * Ürün sahibinin verdiği yönetim paneli şablonlarında (Orchid, Valex)
 * gösterge kartı hep aynı üç parçadan kuruluyor:
 *
 *   1. Küçük etiket + sağ üstte renkli ikon kutusu
 *   2. Büyük sayı
 *   3. **Düne göre değişim rozeti** (↑ %12) ve kartın altına yayılan
 *      **kıvılcım grafik**
 *
 * İlk sürümde yalnızca birincisi vardı; sayı tek başına "iyi mi kötü mü"
 * sorusunu cevaplamıyordu. Rozet ve kıvılcım, aynı sayıya yön veriyor.
 *
 * ── Renk anlam taşımıyor, YÖN taşıyor ───────────────────────
 *
 * Kartların dolgusu tek renk (beyaz) ve yalnızca biri vurgulu. Rozetin
 * rengi ise **yönü** söylüyor: artış yeşil değil vurgu mavisi, azalış
 * tehlike kırmızısı değil sönük gri. Sebep: "bugün 2 kupon az verildi"
 * kafe için kötü bir haber değil — bütçe korunuyor demek. Kırmızı
 * boyamak, yorumu ekrana gömmek olurdu ve o yorum kafeye göre değişir.
 */
function Gosterge({
  etiket,
  alt,
  olcu,
  ikon,
  birim,
  kurus = false,
  vurgulu = false,
}: {
  etiket: string;
  alt: string;
  olcu: panel.Olcu;
  ikon: keyof typeof GOSTERGE_IKONLARI;
  birim?: string;
  /** Değer kuruş cinsindense TL'ye çevrilip yazılıyor. */
  kurus?: boolean;
  /** Dolu renkli kart — panelde yalnızca bir tane olmalı. */
  vurgulu?: boolean;
}) {
  const deger = kurus ? Math.round(olcu.bugun / 100) : olcu.bugun;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-4 pt-4 pb-8 ${
        vurgulu ? "border-vurgu bg-vurgu text-white" : "border-cizgi bg-yuzey"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`etiket-caps text-[10px] ${vurgulu ? "text-white/75" : "text-yazi-sonuk"}`}
        >
          {etiket}
        </span>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
            vurgulu ? "bg-white/20 text-white" : "bg-cukur text-yazi"
          }`}
        >
          {GOSTERGE_IKONLARI[ikon]}
        </span>
      </div>

      <div className="mt-2.5 font-data text-2xl leading-none font-bold tabular">
        {deger.toLocaleString("tr-TR")}
        {birim && <span className="ml-1 text-[13px] font-semibold">{birim}</span>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {olcu.degisim !== null && (
          <span
            className={`rounded-full px-1.5 py-0.5 font-data text-[10px] font-bold tabular ${
              vurgulu
                ? "bg-white/20 text-white"
                : olcu.degisim >= 0
                  ? "bg-vurgu/10 text-vurgu"
                  : "bg-cukur text-yazi-sonuk"
            }`}
          >
            {olcu.degisim >= 0 ? "↑" : "↓"} %{Math.abs(olcu.degisim)}
          </span>
        )}
        <span className={`text-[11px] ${vurgulu ? "text-white/75" : "text-yazi-sonuk"}`}>
          {olcu.degisim !== null ? "düne göre" : alt}
        </span>
      </div>

      {/* Kıvılcım grafik kartın alt kenarına yapışıyor: referans
          panellerde de kartın içinde yüzen değil, tabanını oluşturan
          bir şerit. */}
      <Kivilcim seri={olcu.seri} vurgulu={vurgulu} />
    </div>
  );
}

/**
 * Kıvılcım grafik — yedi günün şekli, eksensiz.
 *
 * Sayı yok, ızgara yok, etiket yok: kart zaten sayıyı yazıyor. Buranın
 * tek işi "yükseliyor mu düşüyor mu" sorusunu bir bakışta cevaplamak.
 *
 * Tek nokta varsa (ya da hepsi eşitse) düz bir çizgi çiziliyor — bölme
 * sıfıra düşmesin diye aralık en az bir kabul ediliyor.
 */
function Kivilcim({ seri, vurgulu }: { seri: number[]; vurgulu: boolean }) {
  if (seri.length < 2) return null;

  const enAz = Math.min(...seri);
  const enCok = Math.max(...seri);
  const aralik = Math.max(1, enCok - enAz);

  const nokta = seri.map((v, i) => {
    const x = (i / (seri.length - 1)) * 100;
    const y = 24 - ((v - enAz) / aralik) * 20;
    return `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
  });

  const cizgi = `M ${nokta.join(" L ")}`;
  const dolgu = `${cizgi} L 100,26 L 0,26 Z`;
  const renk = vurgulu ? "#ffffff" : "var(--color-vurgu)";

  return (
    <svg
      viewBox="0 0 100 26"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-7 w-full"
      aria-hidden
    >
      <path d={dolgu} fill={renk} opacity={vurgulu ? 0.22 : 0.1} />
      <path d={cizgi} fill="none" stroke={renk} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
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
      className={`group flex flex-col rounded-2xl border bg-yuzey p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        eksik ? "border-tehlike/60" : "border-cizgi hover:border-yazi-sonuk/40"
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        {/* İkon artık çıplak değil, kutunun içinde: gösterge kartlarıyla
            aynı dil. Eksik olan kart kırmızı zeminle kendini söylüyor. */}
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
            eksik ? "bg-tehlike/10 text-tehlike" : "bg-cukur text-yazi"
          }`}
        >
          {IKONLAR[ikon]}
        </span>
        {eksik ? (
          <Rozet tur="red">eksik</Rozet>
        ) : (
          <span
            aria-hidden
            className="text-[15px] text-yazi-sonuk/40 transition-colors group-hover:text-yazi-sonuk"
          >
            →
          </span>
        )}
      </span>

      <span className="mt-3 block text-[15px] leading-tight font-semibold">{baslik}</span>
      <span className="mt-1.5 block text-[13px] leading-relaxed text-yazi-sonuk">{aciklama}</span>
    </Link>
  );
}

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
