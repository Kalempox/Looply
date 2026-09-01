import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { idIleBul, gorunum } from "@/domain/player";
import { degerlendir, type KazanilmisRozet } from "@/domain/rozet";
import { karne, type KafeKarnesi } from "@/domain/profil";
import { Sayfa } from "@/components/ui";
import { SayfaBasi, Sayac, OyuncuBolum, Pul } from "@/components/oyuncu";
import { RENK, type OyuncuRengi } from "@/components/oyuncu-renk";
import { MadalyaIkonu, OyunIkonu } from "@/components/oyuncu-ikon";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";

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
    <Sayfa>
      <SayfaBasi
        ust="Profil"
        baslik={g.ad}
        renk="menekse"
        ikon={<MadalyaIkonu boy={130} />}
      >
        <div className="grid grid-cols-3 gap-2">
          <Sayac etiket="Kafe" deger={String(kafeler.length)} renk="gok" />
          <Sayac etiket="Oyun" deger={toplamOyun.toLocaleString("tr-TR")} renk="nane" />
          <Sayac
            etiket="Rozet"
            deger={String(rozetSayisi)}
            renk={rozetSayisi > 0 ? "amber" : undefined}
          />
        </div>

        {globalRozetler.length > 0 && (
          <div className="mt-4">
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
      </SayfaBasi>

      {kafeler.length === 0 ? (
        <div className="rounded-3xl border border-cizgi bg-yuzey px-6 py-8 text-center">
          <div className="flex justify-center">
            <MadalyaIkonu boy={64} />
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-yazi-sonuk">
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

      <p className="mt-10 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Seviye her kafede ayrı tutulur — bir kafedeki ilerlemen diğerine taşınmaz.
      </p>

      <NavBosluk />
      <OyuncuNav aktif="/profil" />
    </Sayfa>
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
  return "nane";
}

function KafeKarti({ kafe, buradaMi }: { kafe: KafeKarnesi; buradaMi: boolean }) {
  const renk = seviyeRengi(kafe.seviye);
  const r = RENK[renk];

  return (
    <section
      className="overflow-hidden rounded-3xl bg-yuzey"
      style={{ border: `1px solid ${buradaMi ? r.ana : "var(--color-cizgi)"}` }}
    >
      {/* Üst şerit kuşağın renginde: kart açılmadan hangi seviyede
          olduğun görünüyor. */}
      <div className="px-5 py-5" style={{ background: r.zemin }}>
        <div className="flex items-start gap-4">
          <SeviyeHalkasi seviye={kafe.seviye} yuzde={kafe.ilerlemeYuzde} renk={renk} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl leading-tight font-bold">{kafe.cafeAdi}</h3>
              {buradaMi && <Pul baslik="Buradasın" renk={renk} />}
            </div>

            <div className="mt-2 font-data text-[13px] tabular" style={{ color: r.koyu }}>
              {kafe.xp.toLocaleString("tr-TR")} XP
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
              <div
                className="asil-serit h-full rounded-full"
                style={{ width: `${kafe.ilerlemeYuzde}%`, background: r.ana }}
                role="progressbar"
                aria-valuenow={kafe.ilerlemeYuzde}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${kafe.cafeAdi} seviye ilerlemesi`}
              />
            </div>
            <div className="mt-1.5 font-data text-[10px]" style={{ color: r.koyu }}>
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
      </div>

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
