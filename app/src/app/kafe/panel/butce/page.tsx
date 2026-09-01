import Link from "next/link";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { durum, donemAraligi, tabanKurus } from "@/domain/butce";
import { bakim } from "@/domain/bakim";
import { isGunu } from "@/lib/tarih";
import { IsletmeSayfa, IsletmeBaslik, Bolum } from "@/components/isletme";
import { ButceFormu } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Haftalık bütçe · CafePlay" };

/**
 * Haftalık bütçe ekranı.
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

  const d = await durum(o.cafeId);
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
        <Bolum
          baslik="Bu dönem"
          alt={`${bicimGun(d.donem.baslangic)} – ${bicimGun(d.donem.bitis, -1)} · ${gunSayisi} gün`}
        >
          <div className="overflow-hidden rounded-2xl border border-cizgi">
            <div className="grid grid-cols-2 gap-px bg-cizgi sm:grid-cols-4">
              <Sayi etiket="Dağıtılabilir" kurus={d.dagitilabilirKurus} vurgu />
              <Sayi etiket="Açık kuponlarda" kurus={d.rezerveKurus} />
              <Sayi etiket="Kasada harcanan" kurus={d.harcananKurus} />
              <Sayi etiket="Bütçeye dönen" kurus={d.iadeKurus} />
            </div>

            {/* Taahhüdün nasıl dağıldığı — tek bakışta */}
            <div className="flex h-2 w-full bg-cukur">
              <span
                className="bg-yazi"
                style={{ width: `${yuzde(d.harcananKurus)}%` }}
                title="Kasada harcanan"
              />
              <span
                className="bg-odul"
                style={{ width: `${yuzde(d.rezerveKurus)}%` }}
                title="Açık kuponlarda"
              />
            </div>

            <div className="flex items-baseline justify-between px-4 py-3 text-[13px] text-yazi-sonuk">
              <span>
                Taahhüt <strong className="text-yazi">{tlYaz(taahhut)} TL</strong>
              </span>
              <span>
                Alt sınır {tlYaz(taban)} TL
                {gunSayisi !== 7 && " (orantılı)"}
              </span>
            </div>
          </div>
        </Bolum>
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

      <Link href="/kafe/panel" className="text-[14px] text-yazi-sonuk underline">
        Panele dön
      </Link>
    </IsletmeSayfa>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

function tlYaz(kurus: number): string {
  return (kurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function bicimGun(iso: string, gunEkle = 0): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + gunEkle);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });
}

function Sayi({ etiket, kurus, vurgu }: { etiket: string; kurus: number; vurgu?: boolean }) {
  return (
    <div className="bg-yuzey px-4 py-5">
      <div className="etiket-caps text-yazi-sonuk">
        {etiket}
      </div>
      <div
        className={`mt-2 font-data text-2xl leading-none font-bold tabular ${
          vurgu ? "text-yazi" : "text-yazi-sonuk"
        }`}
      >
        {tlYaz(kurus)}
        <span className="ml-1 text-[11px] font-normal">TL</span>
      </div>
    </div>
  );
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
