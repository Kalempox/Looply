import Link from "next/link";
import { withBypass } from "@/db/context";
import * as oturum from "@/domain/session";
import { basiliKod } from "@/domain/qr";
import { kodEkrandaGosterilir } from "@/sms";

export const dynamic = "force-dynamic";

/**
 * Giriş noktası.
 *
 * Üç yüzeyin de kapısı burada: oyuncu (masa karekodu), işletme, platform.
 * Test sırasında karekodlar her tohumlamada değiştiği için elle adres
 * yazmak gerekiyordu — o iş burada bitiyor.
 *
 * Geliştirme kısayolları (masa karekodları, kayıtlı numaralar) yalnızca
 * `kodEkrandaGosterilir()` doğruyken görünür; canlıda bu sayfa yalnızca
 * genel kapıları gösterir.
 */

type Masa = { cafeAdi: string; masaAdi: string; kod: string };

export default async function GirisNoktasi() {
  const o = await oturum.oku();
  const gelistirme = kodEkrandaGosterilir();

  const veri = await withBypass("giriş noktası", async (db) => {
    const masalar = gelistirme
      ? await db.all<{ cafe_adi: string; masa_adi: string; qr_secret: Buffer }>(
          `SELECT c.name AS cafe_adi, t.label AS masa_adi, t.qr_secret
             FROM cafe_tables t JOIN cafes c ON c.id = t.cafe_id
            WHERE c.status = 'approved' AND t.active = true AND t.sort_order < 3
            ORDER BY c.name, t.sort_order`,
        )
      : [];

    const kafeler = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM cafes WHERE status = 'approved'`,
    );
    const bekleyen = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM cafes WHERE status = 'pending'`,
    );

    return {
      masalar: masalar.map((m) => ({
        cafeAdi: m.cafe_adi,
        masaAdi: m.masa_adi,
        kod: basiliKod(m.qr_secret),
      })) as Masa[],
      onayliKafe: Number(kafeler?.n ?? 0),
      bekleyenBasvuru: Number(bekleyen?.n ?? 0),
    };
  });

  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <div className="mx-auto w-full max-w-lg px-5 py-10 sm:py-14">
        <header className="mb-10">
          <h1 className="font-display text-5xl leading-none font-extrabold tracking-tight">
            Looply
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-yazi-sonuk">
            Masadaki karekodu okut, oyna, kazandığın indirimi kasada kullan.
          </p>
        </header>

        {o && <MevcutOturum rol={o.rol} />}

        {/* ── Oyuncu ─────────────────────────────────── */}
        <Bolum
          baslik="Oyuncu"
          alt={
            gelistirme
              ? "Gerçekte masadaki karekodu okutursun. Test için aşağıdan seç."
              : "Masadaki karekodu okutarak girilir."
          }
        >
          {gelistirme && veri.masalar.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2.5">
              {veri.masalar.map((m) => (
                <li key={m.kod}>
                  <Link
                    href={`/m/${m.kod}`}
                    className="block rounded-2xl border border-cizgi bg-yuzey px-4 py-4 hover:border-vurgu"
                  >
                    <span className="block etiket-caps text-yazi-sonuk">
                      {m.cafeAdi}
                    </span>
                    <span className="mt-1 block font-display text-lg font-bold">{m.masaAdi}</span>
                    <span className="etiket-caps mt-1 block text-[10px] text-vurgu">
                      karekodu okut →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Kapi href="/giris" baslik="Giriş yap" alt="Numaran kayıtlıysa doğrudan girersin" />
          )}

          <div className="mt-3">
            <Kapi href="/giris" baslik="Karekodsuz gir" alt="Kafe dışında: oynanır ama kazandırmaz" ikincil />
          </div>
        </Bolum>

        {/* ── İşletme ────────────────────────────────── */}
        <Bolum baslik="İşletme" alt={`${veri.onayliKafe} onaylı kafe`}>
          <div className="space-y-2.5">
            <Kapi href="/kafe/basvuru" baslik="Başvuru yap" alt="Vergi levhasıyla, ücretsiz" />
            <Kapi href="/kafe/giris" baslik="Panele gir" alt="Yetkili numarasıyla" ikincil />
          </div>
        </Bolum>

        {/* ── Platform ───────────────────────────────── */}
        <Bolum
          baslik="Platform"
          alt={
            veri.bekleyenBasvuru > 0
              ? `${veri.bekleyenBasvuru} başvuru onay bekliyor`
              : "Bekleyen başvuru yok"
          }
        >
          <Kapi
            href="/platform/giris"
            baslik="Platform girişi"
            alt="Başvuruları inceler ve onaylar"
            ikincil
          />
        </Bolum>

        {gelistirme && <GelistirmeKutusu />}
      </div>
    </main>
  );
}

/* ── Parçalar ──────────────────────────────────────── */

const ROL_ADLARI: Record<string, string> = {
  oyuncu: "Oyuncu",
  kasiyer: "Kasiyer",
  kafe_yoneticisi: "Kafe yöneticisi",
  platform_destek: "Platform desteği",
  platform_admin: "Platform yöneticisi",
};

function MevcutOturum({ rol }: { rol: string }) {
  const hedef =
    rol === "oyuncu"
      ? "/oyna"
      : rol === "kafe_yoneticisi"
        ? "/kafe/panel"
        : rol.startsWith("platform")
          ? "/platform/basvurular"
          : "/";

  return (
    <div className="mb-10 flex items-center gap-4 rounded-2xl border border-vurgu bg-yuzey px-4 py-3.5">
      <span className="min-w-0 flex-1">
        <span className="block etiket-caps text-yazi-sonuk">
          Açık oturum
        </span>
        <span className="mt-0.5 block text-[15px] font-semibold">{ROL_ADLARI[rol] ?? rol}</span>
      </span>
      <Link
        href={hedef}
        className="shrink-0 rounded border border-vurgu/60 px-3 py-1.5 etiket-caps text-vurgu"
      >
        Devam et
      </Link>
      <Link
        href="/cikis"
        className="shrink-0 etiket-caps text-yazi-sonuk underline"
      >
        Çıkış
      </Link>
    </div>
  );
}

function Bolum({
  baslik,
  alt,
  children,
}: {
  baslik: string;
  alt: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-9">
      <div className="mb-3">
        <h2 className="etiket-caps text-yazi-sonuk">
          {baslik}
        </h2>
        <p className="mt-1 text-[13px] text-yazi-sonuk">{alt}</p>
      </div>
      {children}
    </section>
  );
}

function Kapi({
  href,
  baslik,
  alt,
  ikincil,
}: {
  href: string;
  baslik: string;
  alt: string;
  ikincil?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 border px-4 py-3.5 transition-colors ${
        ikincil
          ? "border-cizgi hover:border-yazi-sonuk"
          : "border-vurgu/50 hover:border-vurgu"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-semibold ${ikincil ? "" : "text-vurgu"}`}>
          {baslik}
        </span>
        <span className="block text-[13px] text-yazi-sonuk">{alt}</span>
      </span>
      <span className={ikincil ? "text-yazi-sonuk" : "text-vurgu"} aria-hidden>
        →
      </span>
    </Link>
  );
}

/**
 * Test kısayolları. Canlıda bu blok hiç render edilmez.
 *
 * Kayıtlı numaralar burada duruyor çünkü ilgili ekranda "kayıtsız numara"
 * bilerek sessizce geçiliyor (G27) ve test ederken bu kafa karıştırıyor.
 */
function GelistirmeKutusu() {
  return (
    <section className="mt-12 border-t border-cizgi pt-7">
      <h2 className="mb-3 etiket-caps text-odul-koyu">
        Geliştirme
      </h2>

      <div className="mb-5 grid grid-cols-2 gap-2.5">
        <a
          href="/gelistirme"
          className="rounded-lg border border-odul/50 px-4 py-3 text-center etiket-caps text-odul-koyu"
        >
          Kodlar defteri
        </a>
        <a
          href="/cikis"
          className="rounded-lg border border-cizgi px-4 py-3 text-center etiket-caps text-yazi-sonuk"
        >
          Oturumu kapat
        </a>
      </div>

      <div className="rounded-lg border border-cizgi bg-cukur px-4 py-3.5">
        <p className="mb-2.5 etiket-caps text-yazi-sonuk">
          Kayıtlı numaralar
        </p>
        <dl className="space-y-1.5 font-data text-[11px]">
          <Numara k="Kafe A yöneticisi" v="0532 000 00 01" />
          <Numara k="Kafe B yöneticisi" v="0532 000 00 02" />
          <Numara k="Platform yöneticisi" v="0531 000 00 01" />
          <Numara k="Platform desteği" v="0531 000 00 02" />
          <Numara k="Kasiyer PIN" v="1234" />
        </dl>
        <p className="mt-3 text-[12px] leading-relaxed text-yazi-sonuk">
          Bunların dışındaki numaralar işletme ve platform ekranlarında{" "}
          <strong className="text-yazi">kayıtsız</strong> sayılır ve kod gönderilmez. Oyuncu
          tarafında her numara kaydolabilir.
        </p>
      </div>
    </section>
  );
}

function Numara({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-yazi-sonuk">{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
}
