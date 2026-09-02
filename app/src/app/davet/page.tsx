import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as davet from "@/domain/davet";
import { Sayfa, Baslik } from "@/components/ui";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";
import { bakim } from "@/domain/bakim";
import { BaglantiKopyala } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Arkadaşını çağır · Looply" };

/**
 * "Arkadaşını çağır" — davet ekranı (Faz 9, Ü20).
 *
 * ── Ekranın söylemediği şey ─────────────────────────────────
 *
 * Davet edilenlerin adı, telefonu, kodu **hiç yok**. Davet eden yalnızca bir
 * davetin hangi aşamada olduğunu görüyor. Aksi hâlde davet bağlantısı,
 * tanıdığın birinin Looply'de ne yaptığını izleme aracına dönerdi —
 * G1'in oyuncular arası karşılığı.
 *
 * ── Neden alt gezinmede değil ───────────────────────────────
 *
 * Alt şerit üç durak (kırmızı çizgi #7). Davet, gündelik bir eylem değil;
 * ana ekranın altındaki bağlantıdan açılıyor — "Verilerim" ile aynı yerden,
 * aynı gerekçeyle.
 */
export default async function DavetSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  // Süresi dolan davetleri kapat — yoksa "sürüyor" sayacı hiç düşmez.
  await bakim();

  const [ozet, h] = await Promise.all([davet.ozet(o.ozneId), headers()]);

  // Paylaşılabilir bağlantı istekten türüyor: ortam değişkeni eklemek,
  // hazırlık ve canlı arasında sessizce yanlış adres üretme riskini getirirdi.
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "looply";
  const sema = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baglanti = `${sema}://${host}/r/${ozet.kod}`;

  return (
    <Sayfa>
      <Baslik ust="Davet">Arkadaşını çağır</Baslik>

      <p className="mb-8 text-[15px] leading-relaxed text-yazi-sonuk">
        Çağırdığın arkadaşın bir Looply kafesinde oynadığında ikiniz de XP
        kazanırsınız. XP harcanmaz — seviyeni yükseltir.
      </p>

      {/* ── Bağlantı ve kod ────────────────────────────── */}
      <div className="rounded-2xl border border-vurgu bg-yuzey px-5 py-5">
        <div className="etiket-caps text-yazi-sonuk">Davet kodun</div>
        <div className="mt-2 font-data text-3xl leading-none font-bold tracking-[0.3em] text-vurgu tabular">
          {ozet.kod}
        </div>
        <BaglantiKopyala baglanti={baglanti} />
      </div>

      {/* ── Sayılar ────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Sayi etiket="Açılan" deger={ozet.toplamTiklama} />
        <Sayi etiket="Sürüyor" deger={ozet.bekleyen} />
        <Sayi etiket="Tamamlanan" deger={ozet.odullenen} vurgulu />
      </div>

      {ozet.toplamXp > 0 && (
        <div className="mt-2.5 rounded-lg border border-odul/50 bg-cukur px-4 py-3">
          <span className="etiket-caps text-odul-koyu">Davetten kazandığın</span>
          <span className="ml-2 font-data text-[15px] font-bold text-odul-koyu tabular">
            {ozet.toplamXp.toLocaleString("tr-TR")} XP
          </span>
        </div>
      )}

      {/* ── Davetler ───────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="etiket-caps mb-3 text-yazi-sonuk">Davetlerin</h2>

        {ozet.satirlar.length === 0 ? (
          <div className="rounded-2xl border border-cizgi bg-yuzey px-6 py-8">
            <p className="text-[15px] leading-relaxed text-yazi-sonuk">
              Henüz kimse bağlantını açmadı. Kodu paylaş — arkadaşın kafede oynayınca
              burada görünür.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-cizgi border-y border-cizgi">
            {ozet.satirlar.map((d) => (
              <li key={d.id} className="flex items-baseline justify-between gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{DURUM_ADI[d.durum]}</span>
                  {d.cafeAdi && (
                    <span className="block text-[13px] text-yazi-sonuk">{d.cafeAdi}</span>
                  )}
                </span>
                {d.kazanilanXp > 0 ? (
                  <span className="font-data text-[13px] font-bold text-odul-koyu tabular">
                    +{d.kazanilanXp} XP
                  </span>
                ) : (
                  <span className="font-data text-[11px] text-yazi-sonuk tabular">
                    {d.tarih.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ödülün ne zaman geldiğini söylemek, gelmediğinde sorulacak soruyu
          önceden cevaplıyor. */}
      <p className="mt-8 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Davet, arkadaşın bir Looply kafesinde masadaki karekodu okutup oyunu
        tamamladığında sayılır. Yalnızca hesap açmak yetmez — ödül gerçek bir kafe
        ziyaretine bağlı.
      </p>

      <Link href="/oyna" className="mt-8 inline-block text-[14px] text-vurgu underline">
        Ana ekrana dön
      </Link>

      <NavBosluk />
      {/* Davet üç duraktan biri değil (kırmızı çizgi #7). `/firsatlar` ile aynı
          örüntü: ana ekrandan gelinen ekran, aktif durak "Oyna" kalıyor —
          "Profilim"i yakmak, bulunmadığın yeri işaretlemek olurdu. */}
      <OyuncuNav aktif="/oyna" />
    </Sayfa>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

const DURUM_ADI: Record<davet.Durum, string> = {
  clicked: "Bağlantı açıldı",
  registered: "Hesap açtı",
  game_started: "Oyuna başladı",
  game_completed: "Oyunu bitirdi",
  cafe_verified: "Kafede doğrulandı",
  qualified: "Niteliklendi",
  rewarded: "Tamamlandı",
  rejected: "Sayılmadı",
  expired: "Süresi doldu",
};

function Sayi({
  etiket,
  deger,
  vurgulu,
}: {
  etiket: string;
  deger: number;
  vurgulu?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-yuzey px-4 py-4 ${
        vurgulu ? "border-vurgu" : "border-cizgi"
      }`}
    >
      <div className="etiket-caps text-[10px] leading-tight text-yazi-sonuk">{etiket}</div>
      <div
        className={`mt-2 font-data text-2xl leading-none font-bold tabular ${
          vurgulu ? "text-vurgu" : "text-yazi"
        }`}
      >
        {deger}
      </div>
    </div>
  );
}
