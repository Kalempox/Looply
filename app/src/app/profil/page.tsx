import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { idIleBul, gorunum } from "@/domain/player";
import { degerlendir, type KazanilmisRozet } from "@/domain/rozet";
import { karne, type KafeKarnesi } from "@/domain/profil";
import { Sayfa, Baslik } from "@/components/ui";
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

  return (
    <Sayfa>
      <Baslik ust="Profil">{g.ad}</Baslik>

      {globalRozetler.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 etiket-caps text-yazi-sonuk">
            Rozetlerin
          </h2>
          <ul className="flex flex-wrap gap-2">
            {globalRozetler.map((r) => (
              <RozetPulu key={r.code} rozet={r} />
            ))}
          </ul>
        </section>
      )}

      {kafeler.length === 0 ? (
        <div className="rounded-2xl border border-cizgi bg-yuzey px-6 py-8">
          <div className="text-3xl leading-none" aria-hidden>
            🏅
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-yazi-sonuk">
            Henüz bir kafede ilerleme kaydetmedin. Seviye ve rozetler yalnızca kafede, masadaki
            karekodu okutup oynadığında birikir.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="etiket-caps text-yazi-sonuk">
            Kafelerin
          </h2>
          {kafeler.map((k) => (
            <KafeKarti key={k.cafeId} kafe={k} buradaMi={k.cafeId === masa?.cafeId} />
          ))}
        </div>
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
        buradaMi ? "border-vurgu" : "border-cizgi"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-xl leading-tight font-bold">{kafe.cafeAdi}</h3>
        {buradaMi && (
          <span className="etiket-caps text-vurgu">
            Buradasın
          </span>
        )}
      </div>

      {/* Seviye ve ilerleme */}
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="etiket-caps text-yazi-sonuk">
            Seviye
          </div>
          <div className="mt-1 font-data text-3xl leading-none font-bold text-vurgu tabular">
            {kafe.seviye}
          </div>
        </div>
        <div className="text-right">
          <div className="etiket-caps text-yazi-sonuk">XP</div>
          <div className="mt-1 font-data text-lg leading-none text-yazi tabular">
            {kafe.xp.toLocaleString("tr-TR")}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-1.5 w-full rounded-full bg-cukur">
          <div
            className="asil-serit h-full rounded-full bg-vurgu"
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

      {kafe.rozetler.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
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

function RozetPulu({ rozet }: { rozet: KazanilmisRozet }) {
  return (
    <li
      className="rounded border border-odul/45 bg-cukur px-3 py-1.5"
      title={rozet.aciklama}
    >
      <span className="etiket-caps text-[10px] text-odul-koyu">{rozet.baslik}</span>
    </li>
  );
}
