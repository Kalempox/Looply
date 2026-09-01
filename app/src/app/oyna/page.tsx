import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { idIleBul, gorunum } from "@/domain/player";
import { ozet } from "@/domain/puan";
import { kafeSeviyesi, type KafeSeviyesi } from "@/domain/xp";
import { OYUNLAR, gununOyunu, type HerhangiOyun } from "@/oyunlar";
import * as liderlik from "@/domain/liderlik";
import * as cark from "@/domain/cark";
import * as seri from "@/domain/seri";
import { withBypass } from "@/db/context";
import * as happy from "@/domain/happy";
import { isGunu } from "@/lib/tarih";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";
import { kodEkrandaGosterilir } from "@/sms";
import { DurumSeridi, type SeritDurumu } from "./durum-seridi";
import { cikisYap } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Oyuncu ana ekranı.
 *
 * Ekrandaki her sayı sunucudan geliyor — puan bakiyesi defterin toplamı,
 * kupon sayısı sorgunun sonucu. İstemcide hiçbir şey hesaplanmıyor
 * (Faz 4 güvenlik kapısı).
 *
 * Tasarım: ekranın tepesindeki durum şeridi oyuncunun tek gerçek sorusuna
 * cevap veriyor — "kazanabiliyor muyum?". Gerisi ona göre sıralanıyor.
 */
export default async function OynaSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const oyuncu = await idIleBul(o.ozneId);
  if (!oyuncu) redirect("/giris");

  const g = gorunum(oyuncu);
  const masa = await masaOturumu.aktif(o.ozneId);
  const sayilar = await ozet(o.ozneId, masa?.cafeId);
  // Ü15: seviye kafe bazında — kafe dışında gösterilecek bir seviye yok.
  const seviyeBilgisi = masa ? await kafeSeviyesi(o.ozneId, masa.cafeId) : null;
  const bonus = gununOyunu(isGunu());

  // Ö3: açık Happy Hour penceresi — yalnızca kafedeyken anlamlı.
  const pencere = masa ? await happy.acikPencere(masa.cafeId) : null;

  // Bugünün sıralaması — yalnızca kafedeyken anlamlı. Günün oyunu
  // üzerinden tutuluyor ki skorlar karşılaştırılabilir olsun.
  const lider = masa
    ? await liderlik.bugun({ cafeId: masa.cafeId, oyunId: bonus.id, bakanId: o.ozneId })
    : null;

  // Ü49: günlük çark — yalnızca kafedeyken, ödül kafenin bütçesinden çıkıyor.
  const carkDurumu = masa
    ? await cark.durum({ playerId: o.ozneId, cafeId: masa.cafeId })
    : null;

  // Ü54: günlük seri. Kafe başına — seri, o kafenin müşterisini geri
  // getirme aracı; kafeler arası ortak olsaydı A'da oynayıp B'de
  // ödüllenmek mümkün olurdu.
  const seriDurumu = masa
    ? await withBypass("günlük seri", (db) =>
        seri.hesapla(db, { playerId: o.ozneId, cafeId: masa.cafeId }),
      )
    : null;

  const seridDurumu = seridBelirle(masa);
  const kazanabilir = seridDurumu.tur === "dogrulandi";

  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <div className="mx-auto w-full max-w-md px-5 pb-16">
        <DurumSeridi durum={seridDurumu} demoKapisi={kodEkrandaGosterilir()} />

        {/* ── Kimlik ve sayılar ─────────────────────────── */}
        <section className="gir mb-10">
          <p className="etiket-caps text-yazi-sonuk">
            Merhaba
          </p>
          <h1 className="mt-1 font-display text-4xl leading-none font-extrabold tracking-tight">
            {g.ad}
          </h1>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <Sayi
              etiket={masa ? "Bu kafedeki puanın" : "Puan"}
              deger={sayilar.kafePuani ?? 0}
              sonek={masa ? undefined : "kafede kazanılır"}
              vurgu={masa ? "turkuaz" : undefined}
            />
            <Sayi
              etiket="Kullanılabilir kupon"
              deger={sayilar.aktifKupon}
              vurgu={sayilar.aktifKupon > 0 ? "pirinc" : undefined}
            />
          </div>

          {seviyeBilgisi && <SeviyeSeridi bilgi={seviyeBilgisi} />}
        </section>

        {g.odulKilidiBitis && (
          <div className="mb-10 rounded-lg border border-odul/50 bg-cukur px-4 py-3.5">
            <div className="etiket-caps text-odul-koyu">
              Ödüller geçici olarak kilitli
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-yazi-sonuk">
              Telefon numaran yakında değişti. Güvenlik için{" "}
              {g.odulKilidiBitis.toLocaleString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "long",
              })}
              &apos;a kadar kupon kullanılamıyor. Oynamaya devam edebilirsin, puanların birikir.
            </p>
          </div>
        )}

        {pencere && <HavuzKarti pencere={pencere} kafeAdi={masa!.cafeAdi} />}

        {seriDurumu && seriDurumu.gun > 0 && <SeriKarti seri={seriDurumu} />}

        {carkDurumu && <CarkKarti durum={carkDurumu} />}

        {lider && <LiderKarti liste={lider} oyunAdi={bonus.ad} />}

        {/* ── Günün oyunu ───────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="etiket-caps text-odul-koyu">
              Bugünün oyunu
            </h2>
            <span className="font-data text-[10px] tracking-[0.14em] text-odul-koyu">×2 PUAN</span>
          </div>

          <div className="rounded-2xl border border-odul bg-yuzey px-6 py-7">
            <div className="text-4xl leading-none" aria-hidden>
              {bonus.emoji}
            </div>
            <h3 className="mt-4 font-display text-2xl leading-tight font-extrabold tracking-tight">
              {bonus.ad}
            </h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-yazi-sonuk">{bonus.ozet}</p>

            <Link
              href={`/oyna/${bonus.id}?basla=1`}
              className="mt-5 block w-full rounded-lg border border-odul/60 py-3 text-center font-display text-[15px] font-bold text-odul-koyu"
            >
              Oyna
            </Link>
          </div>
        </section>

        {/* ── Oyun listesi ──────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-3 etiket-caps text-yazi-sonuk">
            Tüm oyunlar
          </h2>
          <ul className="grid grid-cols-2 gap-2.5">
            {OYUNLAR.filter((oyun) => oyun.id !== bonus.id).map((oyun) => (
              <OyunKarosu key={oyun.id} oyun={oyun} />
            ))}
          </ul>
        </section>

        {/* ── Buradaki fırsatlar ────────────────────────── */}
        {masa && (
          <Link
            href="/firsatlar"
            className="mb-10 block rounded-2xl border border-cizgi bg-yuzey px-5 py-4"
          >
            <div className="etiket-caps text-yazi-sonuk">
              {masa.cafeAdi}
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <span className="font-display text-lg leading-tight font-bold">
                Buradaki fırsatlar
              </span>
              <span className="text-[14px] text-vurgu">→</span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-yazi-sonuk">
              Bu kafenin ödül kataloğu ve ürün indirimleri
            </p>
          </Link>
        )}

        {!kazanabilir && (
          <p className="mb-10 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
            {masa
              ? "Konumunu doğrulayana kadar oyunlar puan kazandırmaz. Yukarıdaki şeritten doğrulayabilirsin."
              : "Puan ve kupon yalnızca bir CafePlay kafesinde, masadaki karekodu okutunca kazanılır."}
          </p>
        )}

        {/* ── Gezinme ───────────────────────────────────── */}
        <nav className="flex flex-col gap-3 border-t border-cizgi pt-6">
          <Link href="/davet" className="text-[14px] text-vurgu underline">
            Arkadaşını çağır
          </Link>
          <Link href="/verilerim" className="text-[14px] text-vurgu underline">
            Verilerim ve hesap ayarlarım
          </Link>
          <form action={cikisYap}>
            <button type="submit" className="text-[14px] text-yazi-sonuk underline">
              Çıkış yap
            </button>
          </form>
        </nav>

        <NavBosluk />
      </div>

      <OyuncuNav aktif="/oyna" />
    </main>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

function seridBelirle(masa: Awaited<ReturnType<typeof masaOturumu.aktif>>): SeritDurumu {
  if (!masa) return { tur: "disarida" };

  const ortak = { kafe: masa.cafeAdi, masa: masa.masaAdi };

  if (masa.kanitMaskesi & masaOturumu.K2) {
    return { tur: "dogrulandi", ...ortak, mesafeM: masa.mesafeM };
  }
  if (masa.mesafeM != null) {
    return { tur: "uzak", ...ortak, mesafeM: masa.mesafeM };
  }
  if (masa.konumReddedildi) {
    return { tur: "konum_kapali", ...ortak };
  }
  return { tur: "konum_bekliyor", ...ortak };
}

/**
 * Seviye şeridi — Ü14 ve Ü15'in ana ekrandaki yüzü.
 *
 * Puanın yanında değil altında duruyor: puan harcanan şey, seviye biriken
 * şey. Yan yana konsalardı aynı cinsten iki sayı gibi okunurlardı.
 */
function SeviyeSeridi({ bilgi }: { bilgi: KafeSeviyesi }) {
  return (
    <Link
      href="/profil"
      className="mt-2.5 block rounded-lg border border-cizgi bg-cukur px-4 py-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="etiket-caps text-yazi-sonuk">
          Bu kafedeki seviyen
        </span>
        <span className="font-data text-lg leading-none font-bold text-vurgu tabular">
          {bilgi.seviye}
        </span>
      </div>

      <div className="mt-2.5 h-1 w-full rounded-full bg-cizgi">
        <div
          className="asil-serit h-full rounded-full bg-vurgu"
          style={{ width: `${bilgi.ilerlemeYuzde}%` }}
          role="progressbar"
          aria-valuenow={bilgi.ilerlemeYuzde}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Seviye ilerlemesi"
        />
      </div>

      <div className="mt-1.5 font-data text-[9px] text-yazi-sonuk">
        {bilgi.sonrakiEsik === null
          ? "En üst seviyedesin"
          : `Sonraki seviyeye ${(bilgi.sonrakiEsik - bilgi.xp).toLocaleString("tr-TR")} XP`}
      </div>
    </Link>
  );
}

/**
 * Happy Hour havuzu (Ö3).
 *
 * Kaynak dokümanın kararı **dümdüz**: çarpan yok, görünür TL havuzu var.
 * *"2x puan" oyuncuya hiçbir şey ifade etmez.* Havuz eridikçe aciliyet
 * kendiliğinden doğuyor — ayrı bir "acele et" mekaniği kurmaya gerek yok.
 *
 * Buradaki TL, E9'u ihlal etmiyor: E9 **kuponun** değerini gizliyor, çünkü
 * kasiyerin telefona bakıp ürün vermesi sistemi kör eder. Havuz bir kuponun
 * değeri değil, kafenin o saate ayırdığı bütçe — kasada hiçbir şeyin yerine
 * geçmiyor.
 */
function HavuzKarti({ pencere, kafeAdi }: { pencere: happy.Pencere; kafeAdi: string }) {
  const yuzde = Math.max(
    2,
    Math.min(100, Math.round((pencere.kalanKurus / pencere.havuzKurus) * 100)),
  );

  return (
    <section className="mb-10 rounded-2xl border border-odul bg-yuzey px-5 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="etiket-caps text-odul-koyu">Havuz açık</span>
        <span className="font-data text-[10px] text-yazi-sonuk tabular">
          {saatBicim(pencere.bitis)}&apos;a kadar
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-data text-3xl leading-none font-bold text-odul-koyu tabular">
          {(pencere.kalanKurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL
        </span>
        <span className="text-[14px] text-yazi-sonuk">ödül kaldı</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cukur">
        <div className="asil-serit h-full rounded-full bg-odul" style={{ width: `${yuzde}%` }} />
      </div>

      <p className="mt-2.5 text-[13px] leading-relaxed text-yazi-sonuk">
        {kafeAdi} bu saate ödül ayırdı. Havuz bitmeden oynarsan bugün{" "}
        <strong className="text-yazi">ikinci bir ödül</strong> daha kazanabilirsin.
      </p>
    </section>
  );
}

/**
 * Günlük seri kartı (Ü54).
 *
 * ── Neden yalnızca seri varken görünüyor ────────────────────
 *
 * "0 günlük serin var" diye bir şey yok: ilk gün gelen için seri henüz
 * bir şey ifade etmiyor ve boş bir sayaç ekranı doldurmaktan başka iş
 * yapmıyor. Kart, kaybedilecek bir şey olduğunda çıkıyor.
 *
 * ── Riskteyken dili değişiyor ───────────────────────────────
 *
 * Bugün oynanmadıysa seri **kırılmış sayılmıyor** — gün henüz bitmedi.
 * Kart o zaman hatırlatıyor; kırıldığını söylemek, akşam gelecek
 * müşteriyi sabahtan kaybetmek olurdu.
 */
function SeriKarti({ seri: s }: { seri: seri.Seri }) {
  const bonus = seri.bonusPuani(s.gun + (s.bugunOynadi ? 1 : 0));

  return (
    <section className="mb-10">
      <h2 className="etiket-caps mb-3 text-yazi-sonuk">Günlük seri</h2>

      <div
        className={`rounded-2xl border px-5 py-5 ${
          s.riskte ? "border-odul bg-cukur" : "border-cizgi bg-yuzey"
        }`}
      >
        <div className="flex items-center gap-4">
          <span className="text-3xl leading-none" aria-hidden>
            🔥
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg leading-tight font-bold">
              {s.gun} gün üst üste
            </span>
            <span className="mt-1 block text-[13px] leading-relaxed text-yazi-sonuk">
              {s.riskte
                ? `Bugün oynamazsan seri sıfırlanır. Oynarsan ${bonus} puan bonus.`
                : `Bugün sayıldı. Yarın da gelirsen ${bonus} puan bonus.`}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * Günlük çark kartı (Ü49).
 *
 * Kart çarkın kendisini göstermiyor, yalnızca durumunu: çarkın SVG'si ve
 * animasyonu bu ekranı ikiye katlardı. Kapalıyken de duruyor — kaybolan
 * bir kart "özellik kaldırıldı" diye okunuyor.
 */
function CarkKarti({ durum }: { durum: cark.CarkDurumu }) {
  const acik = durum.acik;

  return (
    <section className="mb-10">
      <h2 className="etiket-caps mb-3 text-yazi-sonuk">Şans çarkı</h2>

      <Link
        href="/cark"
        className={`block rounded-2xl border px-5 py-5 transition-colors ${
          acik ? "border-odul bg-cukur" : "border-cizgi bg-yuzey"
        }`}
      >
        <div className="flex items-center gap-4">
          <span className="text-3xl leading-none" aria-hidden>
            🎡
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg leading-tight font-bold">
              {acik ? "Çarkın hazır" : "Çark kapalı"}
            </span>
            <span className="mt-1 block text-[13px] leading-relaxed text-yazi-sonuk">
              {acik
                ? "Günde bir kez çevirebilirsin. Çıkan ödül hesabına işlenir."
                : cark.durumMetni(durum)}
            </span>
          </span>
          <span aria-hidden className="text-yazi-sonuk">
            →
          </span>
        </div>
      </Link>
    </section>
  );
}

/**
 * Bugünün liderlik tablosu.
 *
 * ── Neden masa tahtının yerine geçti ────────────────────────
 *
 * Kart önce "Masa 3 tahtı" diyordu ve tek kişi gösteriyordu. İki şey
 * yanlıştı: oyuncu hangi masada oturduğunu zaten biliyor (masa bilgisi ona
 * bir şey söylemiyor) ve tek satırlık bir sıralamada yarışacak bir şey yok
 * — ikinci sıradaki kendini göremiyordu.
 *
 * ── Ad neden maskeli ────────────────────────────────────────
 *
 * Ad + soyadın baş harfi: `Mert Y***`. Kafedeki bir başkasının ekranında
 * tam ad görünmesi, oyuncunun kabul ettiği bir şey değil; sıralamanın işe
 * yaraması için de gerekmiyor.
 *
 * Kart tıklanınca tüm zamanlar listesine gidiyor — bugünün ilk üçüne
 * giremeyen için "hiç yokum" demek yerine gidilecek bir yer kalıyor.
 */
function LiderKarti({ liste, oyunAdi }: { liste: liderlik.Liste; oyunAdi: string }) {
  const bos = liste.satirlar.length === 0;

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="etiket-caps text-yazi-sonuk">Bugünün liderleri</h2>
        <span className="font-data text-[10px] text-yazi-sonuk">{oyunAdi}</span>
      </div>

      <Link
        href="/liderlik"
        className="block rounded-2xl border border-cizgi bg-yuzey px-5 py-5 transition-colors hover:border-yazi-sonuk"
      >
        {bos ? (
          <>
            <div className="font-display text-lg leading-tight font-bold">Liste boş</div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-yazi-sonuk">
              Bugün bu kafede henüz kimse oynamadı. İlk skoru sen yaz.
            </p>
          </>
        ) : (
          <ol className="space-y-2.5">
            {liste.satirlar.slice(0, 3).map((s) => (
              <KucukSatir key={s.sira} satir={s} />
            ))}
          </ol>
        )}

        {liste.benimSiram && (
          <ol className="mt-3 border-t border-cizgi pt-3">
            <KucukSatir satir={liste.benimSiram} />
          </ol>
        )}

        <p className="mt-4 font-data text-[10px] tracking-wide text-yazi-sonuk">
          TÜM ZAMANLAR SIRALAMASI →
        </p>
      </Link>
    </section>
  );
}

function KucukSatir({ satir }: { satir: liderlik.LiderSatiri }) {
  return (
    <li className={`flex items-baseline gap-3 ${satir.benMiyim ? "text-odul-koyu" : ""}`}>
      <span className="w-5 shrink-0 font-data text-[12px] text-yazi-sonuk tabular">
        {satir.sira}
      </span>
      <span className="min-w-0 flex-1 truncate font-display text-[15px] font-bold">
        {satir.benMiyim ? "Sen" : satir.gorunenAd}
      </span>
      <span
        className={`font-data text-[15px] leading-none font-bold tabular ${
          satir.benMiyim ? "text-odul-koyu" : "text-vurgu"
        }`}
      >
        {satir.deger.toLocaleString("tr-TR")}
      </span>
    </li>
  );
}

function saatBicim(d: Date): string {
  return d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
}

function Sayi({
  etiket,
  deger,
  sonek,
  vurgu,
}: {
  etiket: string;
  deger: number;
  sonek?: string;
  vurgu?: "turkuaz" | "pirinc";
}) {
  const renk =
    vurgu === "turkuaz" ? "text-vurgu" : vurgu === "pirinc" ? "text-odul-koyu" : "text-yazi";
  const cerceve =
    vurgu === "turkuaz" ? "border-vurgu" : vurgu === "pirinc" ? "border-odul" : "border-cizgi";
  return (
    <div className={`rounded-2xl border ${cerceve} bg-yuzey px-4 py-5`}>
      <div className="etiket-caps leading-tight text-yazi-sonuk">
        {etiket}
      </div>
      <div className={`mt-2.5 font-data text-3xl leading-none font-bold tabular ${renk}`}>
        {deger.toLocaleString("tr-TR")}
      </div>
      {sonek && (
        <div className="mt-1.5 font-data text-[9px] tracking-wide text-yazi-sonuk">{sonek}</div>
      )}
    </div>
  );
}

function OyunKarosu({ oyun }: { oyun: HerhangiOyun }) {
  return (
    <li>
      <Link
        href={`/oyna/${oyun.id}`}
        className="flex aspect-[4/3] flex-col justify-between rounded-2xl border border-cizgi bg-yuzey px-4 py-4"
      >
        <span className="text-2xl leading-none" aria-hidden>
          {oyun.emoji}
        </span>
        <span>
          <span className="block text-[15px] leading-tight font-semibold">{oyun.ad}</span>
          <span className="mt-1 block etiket-caps text-yazi-sonuk">
            {oyun.bolumSayisi} bölüm
          </span>
        </span>
      </Link>
    </li>
  );
}
