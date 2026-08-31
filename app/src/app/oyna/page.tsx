import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { idIleBul, gorunum } from "@/domain/player";
import { ozet } from "@/domain/puan";
import { kafeSeviyesi, type KafeSeviyesi } from "@/domain/xp";
import { OYUNLAR, gununOyunu, type HerhangiOyun } from "@/oyunlar";
import * as tahtDomain from "@/domain/taht";
import * as happy from "@/domain/happy";
import { isGunu } from "@/lib/tarih";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";
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

  // Ö1: masanın tahtı — yalnızca masadayken anlamlı. Günün oyunu üzerinden
  // tutuluyor ki skorlar karşılaştırılabilir olsun.
  const taht = masa
    ? await tahtDomain.masaTahti({
        cafeId: masa.cafeId,
        tableId: masa.tableId,
        masaAdi: masa.masaAdi,
        oyunId: bonus.id,
        oyunAdi: bonus.ad,
        bakanPlayerId: o.ozneId,
      })
    : null;

  const seridDurumu = seridBelirle(masa);
  const kazanabilir = seridDurumu.tur === "dogrulandi";

  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <div className="mx-auto w-full max-w-md px-5 pb-16">
        <DurumSeridi durum={seridDurumu} />

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

        {taht && <TahtKarti taht={taht} />}

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
              href={`/oyna/${bonus.id}`}
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
 * Masa tahtı (Ö1).
 *
 * Ekranın söylediği tek şey: *bu masada kim kral ve onu devirmek için kaç
 * lazım.* Taht statüden ibaret — puan, kupon veya çarpan vermiyor, bu yüzden
 * kart da kazanım vaat etmiyor.
 */
function TahtKarti({ taht }: { taht: tahtDomain.MasaTahti }) {
  const bos = !taht.kalici;

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="etiket-caps text-yazi-sonuk">
          {taht.masaAdi ? `${taht.masaAdi} tahtı` : "Kafe tahtı"}
        </h2>
        <span className="font-data text-[10px] text-yazi-sonuk">{taht.oyunAdi}</span>
      </div>

      <Link
        href={`/oyna/${taht.oyunId}`}
        className={`block rounded-2xl border bg-yuzey px-5 py-5 ${
          taht.kalici?.benMiyim ? "border-odul" : "border-cizgi"
        }`}
      >
        {bos ? (
          <>
            <div className="font-display text-lg leading-tight font-bold">Taht boş</div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-yazi-sonuk">
              Bu masada henüz kimse oynamadı. İlk skoru sen yaz, taht senin olsun.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 flex-1 truncate font-display text-lg leading-tight font-bold">
                <span aria-hidden>👑</span>{" "}
                {taht.kalici!.benMiyim ? "Taht senin" : taht.kalici!.gorunenAd}
              </span>
              <span className="font-data text-xl leading-none font-bold text-vurgu tabular">
                {taht.kalici!.skor.toLocaleString("tr-TR")}
              </span>
            </div>
            <p className="mt-2 text-[13px] text-yazi-sonuk">
              {taht.kalici!.benMiyim
                ? "Devrilene kadar senin. Skorunu yükseltirsen fark açılır."
                : `Devirmek için ${taht.devirmekIcin.toLocaleString("tr-TR")}`}
            </p>
          </>
        )}

        {taht.haftalik && !taht.haftalik.benMiyim && (
          <p className="mt-3 border-t border-cizgi pt-3 font-data text-[10px] text-yazi-sonuk">
            Bu haftanın kralı: {taht.haftalik.gorunenAd} ·{" "}
            {taht.haftalik.skor.toLocaleString("tr-TR")}
          </p>
        )}
        {taht.haftalik?.benMiyim && (
          <p className="mt-3 border-t border-cizgi pt-3 font-data text-[10px] text-odul-koyu">
            Bu haftanın kralı sensin
          </p>
        )}
      </Link>
    </section>
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
