import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { durum, donemAraligi, tabanKurus, sonYediGun } from "@/domain/butce";
import { bakim } from "@/domain/bakim";
import { isGunu } from "@/lib/tarih";
import { IsletmeSayfa, IsletmeBaslik, Bolum } from "@/components/isletme";
import { SayiKarti, Halka, IKON } from "@/components/gosterge";
import { ButceFormu } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Günlük bütçe · CafePlay" };

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

  const [d, yedi] = await Promise.all([durum(o.cafeId), sonYediGun(o.cafeId)]);
  const aralik = donemAraligi(isGunu());
  const taban = d.donem?.tabanKurus ?? tabanKurus(aralik.gunSayisi);
  const gunSayisi = d.donem?.gunSayisi ?? aralik.gunSayisi;

  const taahhut = d.donem?.taahhutKurus ?? 0;
  const yuzde = (kurus: number) => (taahhut > 0 ? Math.round((kurus / taahhut) * 100) : 0);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="İşletme paneli" alt="Kullanılmayan kuponun maliyeti yok.">
        Günlük bütçe
      </IsletmeBaslik>

      {d.donem && (
        <>
          {/* Ü62: dört sayı artık gösterge kartı — kartlardan biri dolu
              renkli, harcananın altında son yedi günün kıvılcımı.
              Referans yönetim panellerinin dili. */}
          <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SayiKarti
              etiket="Dağıtılabilir"
              deger={`${tlYaz(d.dagitilabilirKurus)} TL`}
              alt="yeni kupon için kalan"
              ikon={IKON.para}
              vurgulu
            />
            <SayiKarti
              etiket="Açık kuponlarda"
              deger={`${tlYaz(d.rezerveKurus)} TL`}
              alt="verildi, kullanılmadı"
              ikon={IKON.kupon}
            />
            <SayiKarti
              etiket="Kasada harcanan"
              deger={`${tlYaz(d.harcananKurus)} TL`}
              alt="fiilen ödediğin"
              ikon={IKON.onay}
              seri={yedi.map((g) => g.harcananKurus)}
            />
            <SayiKarti
              etiket="Bütçeye dönen"
              deger={`${tlYaz(d.iadeKurus)} TL`}
              alt="süresi dolan kupondan"
              ikon={IKON.saat}
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
                  Bugünkü taahhüt <strong className="text-yazi">{tlYaz(taahhut)} TL</strong>
                </span>
                <span>
                  Alt sınır {tlYaz(taban)} TL
                  {gunSayisi !== 7 && " (orantılı)"}
                </span>
              </div>
            </div>
          </section>
        </>
      )}

      <Bolum
        baslik={d.donem ? "Bütçeyi güncelle" : "Bütçeyi belirle"}
        alt={
          d.donem
            ? "Dağıtılmış kuponların altına indirilemez — verilen söz geri alınmaz."
            : "Bütçe, sisteme yatırdığın para değil; dağıtacağını taahhüt ettiğin kendi ürününün değeri."
        }
      >
        <ButceFormu
          mevcutTl={d.donem ? Math.round(d.donem.taahhutKurus / 100) : null}
          tabanTl={Math.round(taban / 100)}
          gunSayisi={gunSayisi}
        />
      </Bolum>

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
