import Link from "next/link";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { durum, sonYediGun, haftalikPlan, GUN_ADLARI, saatYaz } from "@/domain/butce";
import { odulDokumu, acikKuponYuku } from "@/domain/kupon";
import { kasaOnaylari } from "@/domain/rapor";
import * as happy from "@/domain/happy";
import { bakim } from "@/domain/bakim";
import { dagitimPlani, type DagitimPlani } from "@/domain/dagitim-plani";
import { istanbulDakikasi, isGunu, gunEkle } from "@/lib/tarih";
import { IsletmeSayfa, IsletmeBaslik, Bolum } from "@/components/isletme";
import { SayiKarti, Halka, IKON } from "@/components/gosterge";
import { TumGunlerFormu, HaftalikPlan, type PlanSatiri } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Günlük bütçe · Looply" };

/**
 * Günlük bütçe ekranı (Ü45).
 *
 * Dört sayı gösteriliyor ve dördü de **defterin toplamı**, kolon değil (E3).
 * Kafenin bakması gereken tek sayı `dağıtılabilir`; diğer üçü onun nereden
 * geldiğini açıklıyor.
 *
 * Ekranın taşıdığı satış cümlesi: *"Alt sınırı siz koyuyorsunuz. Kullanılmayan
 * kuponun maliyeti yok."* Bu bir slogan değil, muhasebenin doğrudan sonucu —
 * kupon kasada onaylanana kadar HARCANDI'ya geçmiyor (Ü7).
 */
export default async function ButceSayfasi() {
  const o = await kafeYoneticisiGerekli();

  // E11: süresi dolan kuponun rezervasyonu bütçeye döner. Bu ekran o sayıyı
  // gösterdiği için iadeyi okumadan önce çalıştırıyoruz.
  await bakim();

  const bugun = isGunu();
  const [d, yedi, dagitim, hhHavuz, plan, hafta, acikYuk, onaylar] = await Promise.all([
    durum(o.cafeId),
    sonYediGun(o.cafeId),
    odulDokumu(o.cafeId),
    happy.bugunkuHavuzKurus(o.cafeId),
    // Ü281: bütçe kafenin kalabalığına göre dağıtılıyor — ekran bunu gösteriyor.
    dagitimPlani(o.cafeId),
    // Ü287: bugün ve önümüzdeki altı gün — her gün kendiliğinden açılıyor.
    haftalikPlan(o.cafeId),
    // Ü289: önceki günlerden açık kuponlar ve bugünün onay defteri.
    acikKuponYuku(o.cafeId),
    kasaOnaylari(o.cafeId, { baslangic: bugun, bitis: gunEkle(bugun, 1) }, 100),
  ]);
  const gunMetni = (gun: string) =>
    gun === bugun
      ? "Bugün"
      : new Date(`${gun}T12:00:00Z`).toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
          weekday: "short",
          timeZone: "Europe/Istanbul",
        });
  const planSatirlari: PlanSatiri[] = hafta.gunler.map((g) => ({
    gun: g.gun,
    gunAdi: GUN_ADLARI[g.haftaninGunu - 1],
    // 12:00 UTC: gün sınırından uzak, saat dilimi günü kaydırmıyor.
    tarihMetni: new Date(`${g.gun}T12:00:00Z`).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      timeZone: "Europe/Istanbul",
    }),
    tutarTl: Math.round(g.tutarKurus / 100),
    kaynak: g.kaynak,
    bugunMu: g.bugunMu,
  }));

  const taahhut = d.donem?.taahhutKurus ?? 0;
  const yuzde = (kurus: number) => (taahhut > 0 ? Math.round((kurus / taahhut) * 100) : 0);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="İşletme paneli" alt="Kullanılmayan kuponun maliyeti yok.">
        Günlük bütçe
      </IsletmeBaslik>

      {/* Ü287: bütçe her gün kendiliğinden açılıyor; kafe bir kez "bütün
          günler" der, istediği günü "yalnızca o tarih" ya da "her <gün>"
          olarak değiştirir. Önce kaydetmeyen kafenin hiç bütçesi yoktu. */}
      <Bolum
        baslik="Haftalık bütçe"
        alt="Her gün kendiliğinden açılır — her gün kaydetmen gerekmez. Bugünün bütçesi dağıtılmış kuponların altına indirilemez."
      >
        <TumGunlerFormu herGunTl={Math.round(hafta.herGunKurus / 100)} />
        <div className="mt-6">
          <HaftalikPlan satirlar={planSatirlari} />
        </div>
        {/* Ü288: çalışma saatleri Panel'de — ürün sahibi: "açılış saati panel
            kısmında olmalı, bu temel bir şey". Burada yalnızca hatırlatma:
            bütçe bu saatlerde açılıyor. */}
        <p className="mt-4 text-[13px] text-yazi-sonuk">
          Bütçe çalışma saatlerinde ({saatYaz(d.pencere.baslangic)}–{saatYaz(d.pencere.bitis)}) kalabalığa göre
          açılır.{" "}
          <Link href="/kafe/panel#calisma-saatleri" className="underline">
            Saatleri Panel&apos;den değiştir
          </Link>
        </p>
      </Bolum>

      {d.donem && (
        <>
          {/* Ü62: dört sayı artık gösterge kartı — kartlardan biri dolu
              renkli, harcananın altında son yedi günün kıvılcımı.
              Referans yönetim panellerinin dili. */}
          <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* Ü87: gösterilen sayı **şu anda** dağıtılabilecek olan.
                Günün kalanı altta duruyor: ikisi ayrışabiliyor ve kafe
                sebebini görmeden "1.200 TL kaldı ama kupon çıkmıyor" diye
                arıyor. Tempo bir tavan; gün ilerledikçe kendiliğinden
                açılıyor. */}
            {/* Ü288: ürün sahibi "bütçe 2.000, bugün bir şey harcanmadı —
                neden 572 dağıtılabilir?" diye sordu. Sayı doğruydu, ad
                yanıltıyordu: bu, bütçenin ŞU ANA KADAR AÇILAN kısmı. */}
            <SayiKarti
              etiket="Şu ana kadar açılan"
              deger={`${tlYaz(d.simdiKurus)} TL`}
              alt={
                !d.acikMi
                  ? `kafe kapalı · ${saatYaz(d.pencere.baslangic)}'da açılıyor`
                  : d.simdiKurus < d.dagitilabilirKurus
                    ? `bugün kalan ${tlYaz(d.dagitilabilirKurus)} TL · ${saatYaz(d.pencere.bitis)}'a kadar kalabalığa göre açılıyor`
                    : "yeni kupon için kalan"
              }
              ikon={IKON.para}
              alan="para"
              vurgulu
            />
            <SayiKarti
              etiket="Açık kuponlarda"
              deger={`${tlYaz(d.rezerveKurus)} TL`}
              alt="bugün verilen, kullanılmayan"
              ikon={IKON.kupon}
              alan="odul"
            />
            <SayiKarti
              etiket="Kasada harcanan"
              deger={`${tlYaz(d.harcananKurus)} TL`}
              alt="bugünün bütçesinden verilenlerden"
              ikon={IKON.onay}
              alan="para"
              seri={yedi.map((g) => g.harcananKurus)}
            />
            <SayiKarti
              etiket="Bütçeye dönen"
              deger={`${tlYaz(d.iadeKurus)} TL`}
              alt="süresi dolan kupondan"
              ikon={IKON.saat}
              alan="genel"
            />
          </section>

          <section className="mb-9 grid gap-3 lg:grid-cols-[280px_1fr]">
            {/* Halka: taahhüdün ne kadarı bağlandı — kafe sahibinin
                günde bir kez sorduğu soru. */}
            <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
              <div className="etiket-caps text-yazi-sonuk">Taahhüdün kullanımı</div>
              <div className="mt-4">
                <Halka
                  yuzde={yuzde(d.harcananKurus + d.rezerveKurus)}
                  ortaUst={`%${yuzde(d.harcananKurus + d.rezerveKurus)}`}
                  ortaAlt="bağlandı"
                />
              </div>
              <div className="mt-4 space-y-1.5 text-[12px] text-yazi-sonuk">
                <p className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm bg-yazi" /> Kasada harcanan
                  </span>
                  <span className="font-data tabular">%{yuzde(d.harcananKurus)}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm bg-odul" /> Açık kuponlarda
                  </span>
                  <span className="font-data tabular">%{yuzde(d.rezerveKurus)}</span>
                </p>
              </div>
            </div>

            {/* ⚠️ Ü93 · "Kazanılan ödüllerin ne olduğu gözükmeli." Ü289:
                yalnızca BUGÜN — önceki günlerin açık kuponları aşağıda,
                verildikleri güne göre ayrı tabloda. İkisi bir aradayken
                ürün sahibi "bunlar bugün çıkan ödüller değil ki" dedi. */}
            <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="etiket-caps text-yazi-sonuk">Bugün çıkan ödüller</span>
                <span className="font-data text-[11px] text-yazi-sonuk">
                  {dagitim.reduce((t, x) => t + x.bugunVerilen, 0)} kupon ·{" "}
                  {tlYaz(dagitim.reduce((t, x) => t + x.bugunVerilenKurus, 0))} TL bugünün bütçesinden
                </span>
              </div>

              {dagitim.length === 0 ? (
                <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
                  Bugün henüz kupon verilmedi ve kasada kupon onaylanmadı.
                </p>
              ) : (
                <table className="mt-3 w-full text-[13px]">
                  <thead>
                    <tr className="etiket-caps text-yazi-sonuk">
                      <th className="pb-2 text-left font-normal">Ödül</th>
                      <th className="pb-2 text-right font-normal">Bugün verilen</th>
                      <th className="pb-2 text-right font-normal">Bugün kasada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dagitim.map((x) => (
                      <tr key={x.baslik} className="border-t border-cizgi align-top">
                        <td className="py-2 pr-2 leading-tight">{x.baslik}</td>
                        <td className="py-2 text-right font-data tabular text-odul-koyu">
                          {x.bugunVerilen ? (
                            <>
                              {x.bugunVerilen}
                              <span className="block text-[11px] opacity-70">
                                {tlYaz(x.bugunVerilenKurus)} TL
                              </span>
                            </>
                          ) : (
                            "–"
                          )}
                        </td>
                        <td className="py-2 text-right font-data tabular">
                          {x.bugunOnaylanan ? (
                            <>
                              {x.bugunOnaylanan}
                              <span className="block text-[11px] opacity-70">
                                {tlYaz(x.bugunKurus)} TL
                              </span>
                            </>
                          ) : (
                            "–"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-3 border-t border-cizgi pt-3 text-[12px] leading-relaxed text-yazi-sonuk">
                <strong className="text-odul-koyu">Bugün verilen</strong> — bugünün bütçesinden
                düştü, kasaya sonraki günlerde de gelebilir.{" "}
                <strong className="text-yazi">Bugün kasada</strong> — bugün fiilen ödediğin; kupon
                önceki bir günün bütçesinden de gelmiş olabilir.
              </p>
            </div>

            <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="etiket-caps text-yazi-sonuk">Son 7 gün</span>
                <span className="font-data text-[11px] text-yazi-sonuk">
                  soluk: taahhüt · dolu: harcanan
                </span>
              </div>
              <YediGunButce gunler={yedi} />
              <div className="mt-4 flex items-baseline justify-between border-t border-cizgi pt-3 text-[13px] text-yazi-sonuk">
                <span>
                  Bugünkü taahhüt{" "}
                  <strong className="text-yazi">{tlYaz(taahhut + hhHavuz)} TL</strong>
                  {/* ⚠️ Ü104: Happy Hour havuzu günlük bütçeden AYRI bir para
                      ve o günkü taahhüdü büyütüyor. Ayrı ayrı gösterip
                      toplamı yazmasaydık, 1.500 TL taahhüt ettiğini sanan
                      kafe gerçekte 1.900 TL taahhüt etmiş olurdu — ve bunu
                      ay sonunda öğrenirdi. */}
                  {hhHavuz > 0 && (
                    <span className="block text-[11px] text-yazi-sonuk">
                      {tlYaz(taahhut)} bütçe + {tlYaz(hhHavuz)} happy hour
                    </span>
                  )}
                </span>
                <span>Alt sınır {tlYaz(d.donem.tabanKurus)} TL</span>
              </div>
            </div>
          </section>

          {/* ── Ü289: açık kupon yükü ve bugünün onay defteri ─────
              Ürün sahibi: "kuponlar 12 saat sonra açılıp 7 gün sürdüğü için
              2–3 gün sonra aşırı yüklenebilir — ya hepsi bir güne gelirse?"
              ve "tüm onaylarda ürün, saat, dakika, kasiyer yazmalı". */}
          <section className="mb-9 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="etiket-caps text-yazi-sonuk">Açık kupon yükü</span>
                <span className="font-data text-[11px] text-yazi-sonuk">
                  {acikYuk.reduce((t, g) => t + g.adet, 0)} kupon ·{" "}
                  {tlYaz(acikYuk.reduce((t, g) => t + g.kurus, 0))} TL
                </span>
              </div>
              {acikYuk.length === 0 ? (
                <p className="mt-3 text-[13px] text-yazi-sonuk">Açık kupon yok.</p>
              ) : (
                <table className="mt-3 w-full text-[13px]">
                  <thead>
                    <tr className="etiket-caps text-yazi-sonuk">
                      <th className="pb-2 text-left font-normal">Verildiği gün</th>
                      <th className="pb-2 text-right font-normal">Kupon</th>
                      <th className="pb-2 text-right font-normal">Tutar</th>
                      <th className="pb-2 text-right font-normal">Son kullanım</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acikYuk.map((g) => (
                      <tr key={g.gun} className="border-t border-cizgi">
                        <td className="py-2">{gunMetni(g.gun)}</td>
                        <td className="py-2 text-right font-data tabular">{g.adet}</td>
                        <td className="py-2 text-right font-data tabular">{tlYaz(g.kurus)} TL</td>
                        <td className="py-2 text-right font-data tabular text-yazi-sonuk">
                          {g.sonKullanim.toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            timeZone: "Europe/Istanbul",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-3 border-t border-cizgi pt-3 text-[12px] leading-relaxed text-yazi-sonuk">
                Her kupon <strong className="text-yazi">verildiği günün</strong> bütçesinden düşer;
                günlük bütçe bir günde verilebilecek en yüksek tutardır. Kuponlar son kullanımlarına
                kadar kasaya gelebildiği için birkaç günün kuponu aynı güne yığılabilir:{" "}
                <strong className="text-yazi">
                  en kötü durumda bir günde kasadan çıkabilecek tutar{" "}
                  {tlYaz(acikYuk.reduce((t, g) => t + g.kurus, 0))} TL
                </strong>
                . Bu yükü küçültmek istersen Ödüller sayfasındaki geçerlilik süresini kısalt.
              </p>
            </div>

            <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="etiket-caps text-yazi-sonuk">Bugün kasada onaylananlar</span>
                <span className="font-data text-[11px] text-yazi-sonuk">
                  {onaylar.length} onay · {tlYaz(onaylar.reduce((t, x) => t + x.tutarKurus, 0))} TL
                </span>
              </div>
              {onaylar.length === 0 ? (
                <p className="mt-3 text-[13px] text-yazi-sonuk">Bugün kasada onay yok.</p>
              ) : (
                <ul className="mt-3 divide-y divide-cizgi border-y border-cizgi">
                  {onaylar.map((x, i) => (
                    <li key={i} className="flex items-baseline gap-3 py-2 text-[13px]">
                      <span className="w-12 font-data tabular text-yazi-sonuk">
                        {x.zaman.toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Europe/Istanbul",
                        })}
                      </span>
                      <span className="flex-1 leading-tight">
                        {x.odul}
                        {x.urun && <span className="block text-[11px] text-yazi-sonuk">{x.urun}</span>}
                      </span>
                      <span className="text-right text-[12px] text-yazi-sonuk">{x.kasiyer}</span>
                      <span className="w-16 text-right font-data tabular">{tlYaz(x.tutarKurus)} TL</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[12px] text-yazi-sonuk">
                Geçmiş günlerin onayları{" "}
                <Link href="/kafe/panel/rapor" className="underline">
                  Rapor
                </Link>
                &apos;da, seçtiğin tarih aralığıyla.
              </p>
            </div>
          </section>

          <YogunlukBolumu
            plan={plan}
            taahhutKurus={taahhut}
            baglananKurus={d.harcananKurus + d.rezerveKurus}
            simdikiSaat={Math.floor(istanbulDakikasi(new Date()) / 60)}
          />
        </>
      )}

      <Bolum baslik="Nasıl işliyor">
        <ol className="space-y-2.5 text-[14px] leading-relaxed text-yazi-sonuk">
          <Adim n="1" baslik="Kupon verildi">
            Tutar <strong className="text-yazi">açık kuponlara</strong> geçer, dağıtılabilir
            bütçe azalır. Henüz hiçbir şey ödemedin.
          </Adim>
          <Adim n="2" baslik="Kasiyer onayladı">
            Tutar <strong className="text-yazi">kasada harcanana</strong> geçer. Ödediğin an
            burasıdır.
          </Adim>
          <Adim n="3" baslik="Süresi doldu ya da iptal edildi">
            Tutar <strong className="text-yazi">bütçeye döner</strong> ve o kadar yeni kupon
            çıkabilir.
          </Adim>
        </ol>
      </Bolum>

    </IsletmeSayfa>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

/**
 * Son yedi günün taahhüt/harcama çubukları.
 *
 * İki seri iç içe: soluk çubuk o günün taahhüdü, dolu çubuk o gün
 * fiilen harcanan. Ayrı iki çubuk olsaydı okuyucu ikisini gözüyle
 * eşlemek zorunda kalırdı; iç içe olunca "ne kadarını kullandım"
 * doğrudan görünüyor.
 *
 * Ölçek en yüksek TAAHHÜDE göre. Harcamaya göre olsaydı az harcanan
 * bir haftada çubuklar tavana dayanır ve "bütçem doldu" izlenimi
 * verirdi — tam tersi doğruyken.
 */
function YediGunButce({
  gunler,
}: {
  gunler: { gun: string; taahhutKurus: number; harcananKurus: number }[];
}) {
  const enYuksek = Math.max(1, ...gunler.map((g) => g.taahhutKurus));

  return (
    <div className="mt-4 flex h-28 gap-1.5">
      {gunler.map((g, i) => {
        const bugunMu = i === gunler.length - 1;
        return (
          <div key={g.gun} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="font-data text-[10px] text-yazi-sonuk tabular">
              {g.harcananKurus > 0 ? Math.round(g.harcananKurus / 100) : ""}
            </span>
            <span className="relative flex w-full flex-1 items-end">
              <span
                className="absolute inset-x-0 bottom-0 rounded-t-sm bg-cukur"
                style={{ height: `${Math.max(3, (g.taahhutKurus / enYuksek) * 100)}%` }}
              />
              <span
                className={`relative w-full rounded-t-sm ${bugunMu ? "bg-vurgu" : "bg-yazi/70"}`}
                style={{ height: `${Math.max(2, (g.harcananKurus / enYuksek) * 100)}%` }}
              />
            </span>
            <span className="etiket-caps text-[9px] text-yazi-sonuk">{gunKisa(g.gun)}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Yoğun saatler ve bugünkü dağıtım — Ü281.
 *
 * Ürün sahibi: *"en yoğun saatlere doğru miktarda bütçe kalmalı; bu her
 * kafede farklı, sistem bunu akıllıca yapmalı"* ve *"panelde de göster."*
 * Kafe sahibi sistemin kafesi hakkında ne öğrendiğini (grafik), bugün
 * bütçenin ne kadarının açıldığını ve bir oyuncunun şu anki şansını
 * görüyor. Şans, kararı veren fonksiyonun kendisinden (`dagitim-plani`).
 */
function YogunlukBolumu({
  plan,
  taahhutKurus,
  baglananKurus,
  simdikiSaat,
}: {
  plan: DagitimPlani;
  taahhutKurus: number;
  baglananKurus: number;
  simdikiSaat: number;
}) {
  const saatYaz = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const yuzde = (x: number) => `%${Math.round(x * 100)}`;
  const acik = [...Array(Math.max(0, plan.kapanis - plan.acilis)).keys()].map(
    (i) => plan.acilis + i,
  );
  const enYuksek = Math.max(1e-9, ...acik.map((h) => plan.paylar[h]));
  const yogunMu = (h: number) => plan.ogrenildi && h >= plan.enYogun.bas && h < plan.enYogun.bit;

  return (
    <section className="mb-9 rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="etiket-caps text-yazi-sonuk">Yoğun saatlerin ve bugünkü dağıtım</span>
        <span className="font-data text-[11px] text-yazi-sonuk">
          {plan.ogrenildi
            ? `son 4 haftanın ${plan.gunTuru === "hafta_sonu" ? "hafta sonları" : "hafta içi günleri"} · ${plan.gunSayisi} gün`
            : `öğreniliyor · ${plan.gunSayisi} günlük veri`}
        </span>
      </div>

      {acik.length > 0 && (
        <div className="mt-4 flex h-24 items-end gap-1" aria-hidden>
          {acik.map((h) => (
            <div key={h} className="flex flex-1 flex-col items-center gap-1">
              <span className="relative flex w-full flex-1 items-end">
                <span
                  className={`w-full rounded-t-sm ${
                    yogunMu(h) ? "bg-vurgu" : h === simdikiSaat ? "bg-odul" : "bg-yazi/35"
                  }`}
                  style={{ height: `${Math.max(4, (plan.paylar[h] / enYuksek) * 100)}%` }}
                />
              </span>
              <span
                className={`font-data text-[9px] tabular ${
                  h === simdikiSaat ? "font-bold text-yazi" : "text-yazi-sonuk"
                }`}
              >
                {String(h).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
        {plan.ogrenildi ? (
          <>
            En yoğun saatlerin{" "}
            <strong className="text-yazi">
              {saatYaz(plan.enYogun.bas)}–{saatYaz(plan.enYogun.bit)}
            </strong>{" "}
            — günün kalabalığının <strong className="text-yazi">{yuzde(plan.enYogun.pay)}</strong>&apos;i.
            Bütçe bu saatlere göre açılıyor: kalabalık gelmeden dağıtılıp bitmiyor.
          </>
        ) : (
          <>
            Henüz yeterli veri yok, bütçe gün boyuna eşit açılıyor. Sistem kafenin yoğun
            saatlerini oynanan oyunlardan öğreniyor ve birkaç hafta içinde bütçeyi o saatlere
            göre dağıtıyor.
          </>
        )}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniSayi
          etiket="Bu saate kadar açılan"
          deger={yuzde(plan.acilanOran)}
          alt={`${tlYaz(Math.floor(taahhutKurus * plan.acilanOran))} TL`}
        />
        <MiniSayi
          etiket="Dağıtılan"
          deger={taahhutKurus > 0 ? yuzde(baglananKurus / taahhutKurus) : "–"}
          alt={`${tlYaz(baglananKurus)} TL`}
        />
        <MiniSayi
          etiket="Bugün 500'ü geçen tur"
          deger={String(plan.bugunSimdiye)}
          alt={`bugün beklenen ~${plan.bugunBeklenen}`}
        />
        <MiniSayi
          etiket="Şu an paket şansı"
          deger={yuzde(plan.sans)}
          alt="500'ü geçen bir tur için"
        />
      </div>

      <p className="mt-3 border-t border-cizgi pt-3 text-[12px] leading-relaxed text-yazi-sonuk">
        Şans = kalan bütçe ÷ (günün kalanında beklenen tur × ortalama ödül). Bütçen büyüdükçe
        ya da kafe tenhalaştıkça artar, kalabalıkta düşer; sabah gelen de akşam kalabalığı da
        eşit şans görür. Oyuncu başına günde bir oyun ödülü kuralı değişmez.
      </p>
    </section>
  );
}

function MiniSayi({ etiket, deger, alt }: { etiket: string; deger: string; alt: string }) {
  return (
    <div className="rounded-xl border border-cizgi px-3.5 py-3">
      <div className="etiket-caps text-[10px] text-yazi-sonuk">{etiket}</div>
      <div className="mt-1 font-data text-[20px] font-bold tabular">{deger}</div>
      <div className="text-[11px] text-yazi-sonuk">{alt}</div>
    </div>
  );
}

function gunKisa(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("tr-TR", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function tlYaz(kurus: number): string {
  return (kurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function Adim({
  n,
  baslik,
  children,
}: {
  n: string;
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="font-data text-[11px] text-yazi-sonuk">{n}</span>
      <span>
        <strong className="block text-[14px] text-yazi">{baslik}</strong>
        {children}
      </span>
    </li>
  );
}
