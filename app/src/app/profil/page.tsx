import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { idIleBul, gorunum } from "@/domain/player";
import { degerlendir, type KazanilmisRozet } from "@/domain/rozet";
import { karne, type KafeKarnesi } from "@/domain/profil";
import { Sayfa } from "@/components/ui";
import { KoyuKart, CamKutu, OyuncuBolum, AltinPul } from "@/components/oyuncu";
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
 * ── Görsel dil (Ü64) ────────────────────────────────────────
 *
 * Üstü koyu, altı beyaz. Tepedeki kart oyuncunun kim olduğunu ve neyi
 * biriktirdiğini söylüyor — orada canlılık işe yarıyor. Altındaki kafe
 * kartları uzun okunuyor (XP, ilerleme, oyun geçmişi); onları da koyu
 * yapmak ekranı okunmaz hâle getirirdi.
 *
 * Tek istisna: **şu an oturduğun kafe** altın çerçeveyle ayrılıyor. Bu
 * ekranda tek bir "şimdi" var ve o da bulunduğun masa.
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
      <section className="mb-9">
        <KoyuKart>
          <p className="etiket-caps text-white/60">Profil</p>
          <h1 className="mt-1 font-display text-3xl leading-none font-extrabold tracking-tight">
            {g.ad}
          </h1>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <CamKutu etiket="Kafe" deger={String(kafeler.length)} />
            <CamKutu etiket="Oyun" deger={toplamOyun.toLocaleString("tr-TR")} />
            <CamKutu etiket="Rozet" deger={String(rozetSayisi)} altin={rozetSayisi > 0} />
          </div>

          {globalRozetler.length > 0 && (
            <div className="mt-5 border-t border-white/15 pt-4">
              <div className="etiket-caps text-white/55">Rozetlerin</div>
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {globalRozetler.map((r) => (
                  <li key={r.code}>
                    <AltinPul baslik={r.baslik} aciklama={r.aciklama} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </KoyuKart>
      </section>

      {kafeler.length === 0 ? (
        <div className="rounded-2xl border border-cizgi bg-yuzey px-6 py-8 text-center">
          <div className="text-4xl leading-none" aria-hidden>
            🏅
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

function KafeKarti({ kafe, buradaMi }: { kafe: KafeKarnesi; buradaMi: boolean }) {
  return (
    <section
      className={`rounded-2xl border bg-yuzey px-5 py-5 ${
        buradaMi ? "border-odul shadow-sm" : "border-cizgi"
      }`}
    >
      <div className="flex items-start gap-4">
        <SeviyeHalkasi seviye={kafe.seviye} yuzde={kafe.ilerlemeYuzde} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl leading-tight font-bold">{kafe.cafeAdi}</h3>
            {buradaMi && (
              <span className="rounded-full bg-odul-zemin px-2 py-0.5 etiket-caps text-[10px] text-odul-koyu">
                Buradasın
              </span>
            )}
          </div>

          <div className="mt-2 font-data text-[13px] text-yazi-sonuk tabular">
            {kafe.xp.toLocaleString("tr-TR")} XP
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cukur">
            <div
              className="asil-serit h-full rounded-full bg-odul"
              style={{ width: `${kafe.ilerlemeYuzde}%` }}
              role="progressbar"
              aria-valuenow={kafe.ilerlemeYuzde}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${kafe.cafeAdi} seviye ilerlemesi`}
            />
          </div>
          <div className="mt-1.5 font-data text-[10px] text-yazi-sonuk">
            {kafe.sonrakiEsik === null
              ? "En üst seviyedesin"
              : `Sonraki seviyeye ${(kafe.sonrakiEsik - kafe.xp).toLocaleString("tr-TR")} XP`}
          </div>
        </div>
      </div>

      {kafe.rozetler.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {kafe.rozetler.map((r) => (
            <RozetPulu key={r.code} rozet={r} />
          ))}
        </ul>
      )}

      {kafe.sonOyunlar.length > 0 && (
        <div className="mt-5 border-t border-cizgi pt-4">
          <div className="etiket-caps text-yazi-sonuk">
            Burada oynadıkların · {kafe.toplamOyun}
          </div>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {kafe.sonOyunlar.map((oyun, i) => (
              <li
                key={`${oyun.oyunId}-${i}`}
                className="flex items-baseline justify-between gap-3 text-[13px]"
              >
                <span className="text-yazi">
                  <span aria-hidden>{oyun.emoji}</span> {oyun.oyunAdi}
                </span>
                <span className="font-data text-[10px] text-yazi-sonuk tabular">
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
function SeviyeHalkasi({ seviye, yuzde }: { seviye: number; yuzde: number }) {
  const r = 24;
  const cevre = Math.round(2 * Math.PI * r * 1000) / 1000;
  const dolu = Math.round((cevre * Math.min(100, Math.max(0, yuzde))) / 100 * 1000) / 1000;

  return (
    <div className="relative size-14 shrink-0">
      <svg viewBox="0 0 56 56" className="size-full -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-cukur)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="var(--color-odul)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dolu} ${cevre}`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="etiket-caps text-[8px] leading-none text-yazi-sonuk">SV</span>
        <span className="font-data text-lg leading-none font-bold tabular">{seviye}</span>
      </span>
    </div>
  );
}

function RozetPulu({ rozet }: { rozet: KazanilmisRozet }) {
  return (
    <li
      className="rounded-full border border-odul/45 bg-odul-zemin px-2.5 py-1"
      title={rozet.aciklama}
    >
      <span className="etiket-caps text-[10px] text-odul-koyu">{rozet.baslik}</span>
    </li>
  );
}
