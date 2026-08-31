import Link from "next/link";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as happy from "@/domain/happy";
import { durum as butceDurumu } from "@/domain/butce";
import { IsletmeSayfa, IsletmeBaslik, Bolum, Rozet } from "@/components/isletme";
import { PencereFormu, KapatDugmesi } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Happy Hour · CafePlay" };

/**
 * Ö3 · Happy Hour havuzu.
 *
 * ── Ekranın taşıdığı satış cümlesi ──────────────────────────
 *
 * *"Boş saatimi doldurmak için 400 TL ayırdım."* Kafe sahibi çarpan
 * matematiği değil, TL görüyor — kaynak dokümanın kararı: *"2x puan"
 * oyuncuya hiçbir şey ifade etmez; kafe de bütçesini hesaplayamaz.*
 *
 * ── Havuz bütçeden düşmüyor ─────────────────────────────────
 *
 * Pencere bir tavan ve bir saat, ayrı bir kese değil. Kuponlar her zamanki
 * gibi bütçeden rezerve ediliyor; havuz yalnızca "bu saatte en fazla şu
 * kadar dağıt" diyor. Bu yüzden pencere bitince iade satırı yazılmıyor —
 * kalan zaten genel bütçede duruyor.
 */
export default async function HappyHourSayfasi() {
  const o = await kafeYoneticisiGerekli();
  const [pencereler, butce] = await Promise.all([
    happy.bugunkuler(o.cafeId),
    butceDurumu(o.cafeId),
  ]);

  const acik = pencereler.filter((p) => !p.iptalMi).length;

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik
        ust="İşletme paneli"
        alt="Günün bir aralığına görünür bir TL havuzu ayır. Oyuncu havuzun eridiğini görür."
      >
        Happy Hour
      </IsletmeBaslik>

      <Bolum
        baslik="Bugünün pencereleri"
        alt={`Günde en fazla ${happy.GUNLUK_EN_FAZLA} pencere. Fazlası "sürekli happy hour" olur ve değer sıfırlanır.`}
      >
        {pencereler.length === 0 ? (
          <p className="text-[14px] text-yazi-sonuk">Bugün pencere açılmadı.</p>
        ) : (
          <ul className="divide-y divide-cizgi border-y border-cizgi">
            {pencereler.map((p) => (
              <li key={p.id} className={`py-4 ${p.iptalMi ? "opacity-55" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="flex-1 font-data text-[15px] font-semibold tabular">
                    {saat(p.baslangic)} – {saat(p.bitis)}
                  </span>
                  {p.iptalMi ? (
                    <Rozet tur="pasif">kapatıldı</Rozet>
                  ) : p.acikMi ? (
                    <Rozet tur="onayli">açık</Rozet>
                  ) : p.havuzBittiMi ? (
                    <Rozet tur="bekliyor">havuz bitti</Rozet>
                  ) : (
                    <Rozet tur="pasif">{p.bittiMi ? "bitti" : "sırada"}</Rozet>
                  )}
                  {!p.iptalMi && !p.bittiMi && <KapatDugmesi pencereId={p.id} />}
                </div>

                {/* Havuz doluluğu — kafe panelinde canlı (Ö3). */}
                <div className="mt-2.5">
                  <div className="h-2 w-full overflow-hidden rounded-sm bg-cukur">
                    <div
                      className="asil-serit h-full rounded-sm bg-odul"
                      style={{
                        width: `${Math.min(100, Math.round((p.harcananKurus / p.havuzKurus) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1.5 font-data text-[11px] text-yazi-sonuk tabular">
                    {tl(p.harcananKurus)} / {tl(p.havuzKurus)} TL dağıtıldı ·{" "}
                    <strong className="text-yazi">{tl(p.kalanKurus)} TL kaldı</strong>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Bolum>

      {acik < happy.GUNLUK_EN_FAZLA && (
        <Bolum
          baslik="Yeni pencere"
          alt={`Dağıtılabilir bütçen ${tl(butce.dagitilabilirKurus)} TL. Havuz bundan büyük olamaz.`}
        >
          <PencereFormu enKisaSaat={happy.EN_KISA_SAAT} enUzunSaat={happy.EN_UZUN_SAAT} />
        </Bolum>
      )}

      <Bolum baslik="Nasıl çalışıyor">
        <ul className="flex flex-col gap-2 text-[14px] leading-relaxed text-yazi-sonuk">
          <Madde>
            Pencere açıkken oyuncu <strong className="text-yazi">ikinci bir ödül</strong>{" "}
            kazanabilir; maliyeti bu havuzdan sayılır.
          </Madde>
          <Madde>
            Havuz bitince pencere kapanır. Oyun oynanmaya devam eder, o pencereden ödül çıkmaz.
          </Madde>
          <Madde>
            Pencere bitince <strong className="text-yazi">kalan kaybolmaz</strong> — havuz
            bütçenden ayrı bir kese değil, yalnızca bir tavan. Dağıtılmayan para bütçende durur.
          </Madde>
          <Madde>
            Kupon kasada onaylanana kadar hiçbir şey harcanmış sayılmaz (Ü7) — burada da aynı.
          </Madde>
        </ul>
      </Bolum>

      <Link href="/kafe/panel" className="text-[14px] text-yazi-sonuk underline">
        Panele dön
      </Link>
    </IsletmeSayfa>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

function tl(kurus: number): string {
  return (kurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function saat(d: Date): string {
  return d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
}

function Madde({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-yazi-sonuk" aria-hidden />
      <span>{children}</span>
    </li>
  );
}
