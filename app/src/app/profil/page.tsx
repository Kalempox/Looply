import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { idIleBul, gorunum } from "@/domain/player";
import { degerlendir, type KazanilmisRozet } from "@/domain/rozet";
import { karne, type KafeKarnesi } from "@/domain/profil";
import Link from "next/link";
import {
  OyuncuSayfa,
  OyuncuBolum,
  Pul,
  BiletYuzeyi,
} from "@/components/oyuncu";
import { RENK, ISIN_DOKUSU, type OyuncuRengi } from "@/components/oyuncu-renk";
import { MadalyaIkonu, OyunIkonu, KupaIkonu } from "@/components/oyuncu-ikon";
import { LooplyLogo } from "@/components/logo";
import { LoopySozu } from "@/components/loopy-sozu";
import { Gorsel } from "@/components/oyuncu-gorsel";
import { cikisYap } from "../oyna/actions";

export const dynamic = "force-dynamic";

/**
 * "Profilim" — kafe bazlı seviye, rozetler ve oyun geçmişi.
 *
 * Ü15: **global seviye yok.** Oyuncu "ben 4. seviyeyim" demiyor, "bu
 * kafede 4. seviyeyim" diyor. Ekran da bu yüzden kafe kartlarından
 * oluşuyor — tepede tek bir büyük sayı yok. Ü5'in (puan kafe bazında)
 * profil tarafındaki karşılığı.
 *
 * Ü14: ilerlemenin ölçüsü XP, puan değil. Ödül alan oyuncunun puanı
 * düşer ama seviyesi düşmez.
 *
 * Ü16: rozetlerin ekonomik değeri yok. Bu ekran hiçbir bakiye
 * değiştirmiyor — `degerlendir()` yalnızca `player_badges` tablosuna
 * yazıyor, üstelik idempotent (aynı rozet ikinci kez yazılamıyor).
 *
 * ── Renk seviyeden geliyor (Ü65) ────────────────────────────
 *
 * Kafe kartları birbirinin kopyasıydı. Artık her kart **seviye
 * kuşağının** renginde: 1-2 nane, 3-4 gök, 5-6 menekşe, 7+ altın.
 * Renk süs değil, ilerlemenin kendisi — oyuncu iki kafeyi yan yana
 * görünce hangisinde daha ileride olduğunu sayıya bakmadan anlıyor.
 */
export default async function ProfilSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const oyuncu = await idIleBul(o.ozneId);
  if (!oyuncu) redirect("/giris");
  const g = gorunum(oyuncu);

  // Rozet değerlendirmesi ekran açılırken çalışıyor. Yazma işlemi ama
  // idempotent: benzersiz indeksler ikinci kaydı reddediyor (0009), yani
  // sayfayı yenilemek yeni rozet üretmiyor.
  const masa = await masaOturumu.aktif(o.ozneId);
  await degerlendir(o.ozneId, masa?.cafeId);

  const { kafeler, globalRozetler } = await karne(o.ozneId);

  const rozetSayisi =
    globalRozetler.length + kafeler.reduce((t, k) => t + k.rozetler.length, 0);
  const toplamOyun = kafeler.reduce((t, k) => t + k.toplamOyun, 0);

  return (
    // `yuva` AÇIK (Ü172): kapalı olmasının tek sebebi sayfanın
    // ortasındaki avatar kopyasıydı, o kalktı.
    <OyuncuSayfa aktif="/profil">
      {/*
        🔴 Profil başlığı `SayfaBasi` DEĞİL — Ü175.

        Ürün sahibinin gönderdiği tasarım bu ekrana özel: üstte logo,
        sağ üstte kalem, kalp yapan Loopy, ve karta **binen** üç
        döşeme. `SayfaBasi` ürünün ortak başlığı ve beş ekranda
        kullanılıyor; bu tasarımı oraya koymak öbür dördünü de
        değiştirirdi.

        ⚠️ Üç döşeme kartın alt kenarına **biniyor** (`-mt-12`).
        Tasarımdaki hâli bu ve ucuz bir süs değil: kart ile içerik
        arasındaki sınırı yumuşatıp sayıları "kartın bir parçası"
        olmaktan çıkarıp "kartın taşıdığı şey" yapıyor.
      */}
      <div className="mb-8">
        <div className="kart-golge relative overflow-hidden rounded-3xl px-5 pt-5 pb-12" style={{ background: "linear-gradient(150deg, #6d28d9 0%, #4c1d95 55%, #3b0f70 100%)" }}>
          <span
            aria-hidden
            className="pointer-events-none absolute -top-[240%] left-1/2 size-[300%] -translate-x-1/2"
            style={{ opacity: 0.08, background: ISIN_DOKUSU }}
          />

          <div className="relative flex items-start justify-between gap-3">
            <LooplyLogo boyut={30} beyaz />
            {/*
              Kalem `/verilerim`e gidiyor: hesabın düzenlenebilir tek
              yeri orası (ad, bildirim tercihi, veri indirme, silme).
              Tasarımda bir kalem var ve gideceği yer olmayan bir
              düğme koymak, verilmemiş bir söz olurdu.
            */}
            <Link
              href="/verilerim"
              aria-label="Hesabını düzenle"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 20h4L19 9a2.8 2.8 0 10-4-4L4 16v4z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          <div className="relative mt-4 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="etiket-caps text-white/60">Profil</p>
              <h1 className="mt-1 font-display text-3xl leading-none font-extrabold tracking-tight text-white">
                {g.ad}
              </h1>
              <p className="mt-2 text-[13px] leading-snug text-white/70">
                Kahveyle daha güzel oyunlar!
              </p>
            </div>

            <div className="w-[7.5rem] shrink-0">
              <LoopySozu soz="İyi ki buradasın!" ifade="keyifli" boy={86} />
            </div>
          </div>
        </div>

        {/*
          🔴 `relative` ŞART, süs değil.

          İlk denemede yoktu ve döşemelerin üstü kartın ALTINDA kaldı:
          ikonlar ve etiketler görünmüyordu, yalnızca sayılar
          çıkıyordu. Sebep yığın sırası — kart `relative`, yani
          konumlandırılmış; döşemeler değildi ve konumlandırılmış öge
          konumlandırılmamış kardeşinin üstüne boyanıyor. Sonra
          gelmek yetmiyor.

          ⚠️ Binme `-mt-8`: `-mt-12` denendi ve fazlaydı, döşemenin
          yarısından çoğu kartın altına giriyordu.
        */}
        <div className="relative -mt-8 grid grid-cols-3 gap-2 px-2">
          <ProfilDosem ikon={<Gorsel ad="icecek" boy={22} />} etiket="Kafe" deger={String(kafeler.length)} />
          <ProfilDosem ikon={<Gorsel ad="kumanda" boy={22} />} etiket="Oyun" deger={toplamOyun.toLocaleString("tr-TR")} />
          <ProfilDosem ikon={<KupaIkonu boy={22} />} etiket="Rozet" deger={String(rozetSayisi)} vurgu={rozetSayisi > 0} />
        </div>

        {globalRozetler.length > 0 && (
          <div className="mt-5">
            <div className="etiket-caps text-yazi-sonuk">Rozetlerin</div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {globalRozetler.map((r) => (
                <li key={r.code}>
                  <Pul baslik={r.baslik} aciklama={r.aciklama} renk="amber" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/*
        🔴 Loopy profilin ORTASINDAN kalktı — Ü172.

        Ü147'de buraya konmuştu: *"profil kısmına tatlı avatarımızı
        ekleyelim, parmağımızla kaydırarak sevme olsun."* Ürün sahibi
        şimdi kaldırılmasını istedi ve profilin yeniden tasarlanacağını
        söyledi.

        ⚠️ Kaldırırken bir şey geri veriliyor: `yuva` bu sayfada
        **açıldı**. Kapalı olmasının tek sebebi buradaki kopyaydı —
        *"ikisi bir arada aynı karakterin iki kopyası olurdu"*. Kopya
        gidince yuvanın kapalı kalması için sebep kalmıyor ve Loopy
        profilde de ulaşılabilir oluyor.

        ⚠️ Özelleştirme bu sayfadan çıktı ama **hiçbir şey
        kaybedilmedi**: renk ve aksesuar seçicileri zaten `COK_RENKLI`
        bayrağının arkasında kapalı (`components/avatar.tsx`) — elde
        Loopy'in tek 3B karesi var. Bayrak açıldığında seçicilerin
        nereye gideceği yeniden kararlaştırılacak.
      */}

      {kafeler.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-cizgi bg-yuzey px-6 py-8 text-center">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -bottom-8 text-yazi-sonuk opacity-[0.10]"
          >
            <Gorsel ad="madalya" boy={140} />
          </span>
          <div className="relative flex justify-center">
            <MadalyaIkonu boy={64} />
          </div>
          <p className="relative mt-4 text-[15px] leading-relaxed text-yazi-sonuk">
            Henüz bir kafede ilerleme kaydetmedin. Seviye ve rozetler yalnızca kafede, masadaki
            karekodu okutup oynadığında birikir.
          </p>
        </div>
      ) : (
        <OyuncuBolum baslik="Kafelerin" not={`${kafeler.length} kafe`}>
          <div className="flex flex-col gap-3">
            {kafeler.map((k) => (
              <KafeKarti key={k.cafeId} kafe={k} buradaMi={k.cafeId === masa?.cafeId} />
            ))}
          </div>
        </OyuncuBolum>
      )}

      <p className="mb-9 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Seviye her kafede ayrı tutulur — bir kafedeki ilerlemen diğerine taşınmaz.
      </p>

      {/*
        Hesap bölümü — Ü66.

        Ana ekranın en altında üç çıplak alt çizgili bağlantı olarak
        duruyordu ve ürün sahibi *"sayfamızın yapısıyla alakasız
        olmuş"* dedi. Doğru yeri burası: ana ekran oynanacak yer,
        hesap ayarları profilin işi.

        Çıkış ayrı ve en altta, kırmızı değil sönük: yıkıcı bir işlem
        değil, oturumu kapatmak. Kırmızı olsaydı "hesabımı siliyorum"
        gibi okunurdu.
      */}
      <OyuncuBolum baslik="Hesabın">
        <div className="grid gap-2.5">
          <HesapSatiri
            yol="/davet"
            baslik="Arkadaşını çağır"
            alt="Davet kodunu paylaş, ikiniz de kazanın"
            renk="yesil"
          />
          <HesapSatiri
            yol="/verilerim"
            baslik="Verilerim ve hesap ayarlarım"
            alt="Adının görünürlüğü, telefonun, hesabını kapatma"
            renk="gok"
          />
          <form action={cikisYap}>
            <button
              type="submit"
              className="w-full rounded-2xl border border-cizgi bg-yuzey px-5 py-4 text-left text-[15px] font-semibold text-yazi-sonuk transition-colors hover:border-yazi-sonuk/40 hover:text-yazi"
            >
              Çıkış yap
            </button>
          </form>
        </div>
      </OyuncuBolum>
    </OyuncuSayfa>
  );
}

function HesapSatiri({
  yol,
  baslik,
  alt,
  renk,
}: {
  yol: string;
  baslik: string;
  alt: string;
  renk: OyuncuRengi;
}) {
  const r = RENK[renk];
  return (
    <Link
      href={yol}
      className="block rounded-2xl border border-cizgi border-l-4 bg-yuzey px-5 py-4 transition-colors hover:border-yazi-sonuk/40"
      style={{ borderLeftColor: r.canli }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] leading-tight font-semibold">{baslik}</span>
        <span aria-hidden className="text-[14px]" style={{ color: r.ana }}>
          →
        </span>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-yazi-sonuk">{alt}</p>
    </Link>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

/**
 * Seviye kuşağı.
 *
 * Dört kuşak var çünkü beş renk sığdırılabilirdi ama ayırt edilemezdi:
 * oyuncunun iki kafe arasındaki farkı görmesi için üç dört basamak
 * yeter, yedi basamak yeniden "hepsi aynı" demek olurdu.
 */
function seviyeRengi(seviye: number): OyuncuRengi {
  if (seviye >= 7) return "amber";
  if (seviye >= 5) return "menekse";
  if (seviye >= 3) return "gok";
  return "yesil";
}

function KafeKarti({ kafe, buradaMi }: { kafe: KafeKarnesi; buradaMi: boolean }) {
  const renk = seviyeRengi(kafe.seviye);
  const r = RENK[renk];

  return (
    <section
      className="kart-golge kart-gel overflow-hidden rounded-3xl bg-yuzey"
      style={{ border: `1px solid ${buradaMi ? r.ana : "var(--color-cizgi)"}` }}
    >
      {/*
        Üst şerit biletin yüzeyinde — Ü172.

        Ü67'de pastel zemindi ve ürün sahibi o zaman da *"profil kısmı
        yine çok sönük"* demişti; gradyan eklenmişti. Şimdi aynı
        şikâyetin kökü kapandı: ekranın geri kalanıyla (bilet, oyun
        kartları) aynı koyu yüzey.

        ⚠️ `yuvarlak={false}`: altındaki "burada oynadıkların" listesi
        beyaz devam ediyor ve şerit kendi yuvarlağını taşısaydı
        birleşme yerinde iki boş köşe kalırdı.
      */}
      <BiletYuzeyi renk={renk} gorsel="icecek" yuvarlak={false} className="px-5 py-5">
        <div className="flex items-start gap-4">
          <SeviyeHalkasi seviye={kafe.seviye} yuzde={kafe.ilerlemeYuzde} renk={renk} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl leading-tight font-bold text-white">
                {kafe.cafeAdi}
              </h3>
              {buradaMi && <Pul baslik="Buradasın" renk={renk} />}
            </div>

            <div className="mt-2 font-data text-[13px] text-white/70 tabular">
              {kafe.xp.toLocaleString("tr-TR")} XP
            </div>

            {/* Oluk koyu zeminde beyaz/%20; dolgu `canli` — koyu
                zeminde `ana` tonu zeminden ayrılmıyordu. */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="asil-serit h-full rounded-full"
                style={{ width: `${kafe.ilerlemeYuzde}%`, background: r.canli }}
                role="progressbar"
                aria-valuenow={kafe.ilerlemeYuzde}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${kafe.cafeAdi} seviye ilerlemesi`}
              />
            </div>
            <div className="mt-1.5 font-data text-[10px] text-white/55">
              {kafe.sonrakiEsik === null
                ? "En üst seviyedesin"
                : `Sonraki seviyeye ${(kafe.sonrakiEsik - kafe.xp).toLocaleString("tr-TR")} XP`}
            </div>
          </div>
        </div>

        {kafe.rozetler.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {kafe.rozetler.map((rz) => (
              <RozetPulu key={rz.code} rozet={rz} renk={renk} />
            ))}
          </ul>
        )}
      </BiletYuzeyi>

      {kafe.sonOyunlar.length > 0 && (
        <div className="px-5 py-4">
          <div className="etiket-caps text-yazi-sonuk">
            Burada oynadıkların · {kafe.toplamOyun}
          </div>
          <ul className="mt-2.5 flex flex-col gap-2">
            {kafe.sonOyunlar.map((oyun, i) => (
              <li
                key={`${oyun.oyunId}-${i}`}
                className="flex items-center justify-between gap-3 text-[13px]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <OyunIkonu oyunId={oyun.oyunId} boy={18} />
                  <span className="truncate text-yazi">{oyun.oyunAdi}</span>
                </span>
                <span className="shrink-0 font-data text-[10px] text-yazi-sonuk tabular">
                  {oyun.tarih.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                  {oyun.skor != null && ` · ${oyun.skor}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * Seviye halkası — sayı ve ilerleme tek nesnede.
 *
 * Eskiden seviye solda büyük bir sayı, XP sağda küçük bir sayı, ilerleme
 * altta ayrı bir şeritti; üç ayrı yerde okunan tek bir şey. Halka
 * seviyeyi ortada tutup ilerlemeyi çevresine sarıyor.
 *
 * Yay `stroke-dasharray` ile çiziliyor ve **çevre üç haneye
 * yuvarlanıyor**: sunucu ile tarayıcının aynı ondalığı basmaması
 * hidrasyon uyarısı üretiyordu (aynı hata SVG'lerde daha önce de çıktı).
 */
function SeviyeHalkasi({
  seviye,
  yuzde,
  renk,
}: {
  seviye: number;
  yuzde: number;
  renk: OyuncuRengi;
}) {
  const r = RENK[renk];
  const yaricap = 24;
  const cevre = Math.round(2 * Math.PI * yaricap * 1000) / 1000;
  const dolu =
    Math.round(((cevre * Math.min(100, Math.max(0, yuzde))) / 100) * 1000) / 1000;

  return (
    <div className="relative size-14 shrink-0">
      <svg viewBox="0 0 56 56" className="size-full -rotate-90" aria-hidden>
        {/*
          Yatak görünür bir gri.

          İlk denemede yatak da beyazdı ve seviyeye yeni geçmiş bir
          oyuncuda (ilerleme %0) halka tamamen kayboluyordu — ekranda
          bir daire değil, boş bir beyaz leke duruyordu. Yatak
          görününce boş halka da bir halka.
        */}
        <circle cx="28" cy="28" r={yaricap} fill="#ffffff" stroke="#ffffff" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={yaricap}
          fill="none"
          stroke="rgba(0,0,0,0.10)"
          strokeWidth="4"
        />
        <circle
          cx="28"
          cy="28"
          r={yaricap}
          fill="none"
          stroke={r.ana}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dolu} ${cevre}`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="etiket-caps text-[8px] leading-none" style={{ color: r.ana }}>
          SV
        </span>
        <span className="font-data text-lg leading-none font-bold tabular">{seviye}</span>
      </span>
    </div>
  );
}

function RozetPulu({ rozet, renk }: { rozet: KazanilmisRozet; renk: OyuncuRengi }) {
  return (
    <li>
      <Pul baslik={rozet.baslik} aciklama={rozet.aciklama} renk={renk} />
    </li>
  );
}

/**
 * Profil başlığındaki beyaz döşeme — Ü175.
 *
 * `/oyna`daki kardeşiyle (`Dosem`) aynı biçim ama ayrı duruyor:
 * ikisini paylaştırmak, iki ekranın birbirine bağlanması demekti ve
 * tasarımları birlikte değişmiyor. Kopya üç satır; bağ kalıcı olurdu.
 */
function ProfilDosem({
  ikon,
  etiket,
  deger,
  vurgu,
}: {
  ikon: React.ReactNode;
  etiket: string;
  deger: string;
  vurgu?: boolean;
}) {
  return (
    <div className="kart-golge rounded-2xl bg-yuzey px-2 py-3 text-center">
      <span className="flex justify-center text-odul-koyu">{ikon}</span>
      <span className="mt-1.5 block text-[11px] leading-tight font-semibold text-yazi-sonuk">
        {etiket}
      </span>
      <span
        className={`mt-0.5 block font-data text-xl leading-none font-bold tabular ${
          vurgu ? "text-odul-koyu" : "text-yazi"
        }`}
      >
        {deger}
      </span>
    </div>
  );
}
