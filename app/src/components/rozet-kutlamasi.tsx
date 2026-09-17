import { Avatar, type AvatarAksesuari } from "./avatar";
import type { OyuncuRengi } from "./oyuncu-renk";

/**
 * Başarım kutlaması — Loopy tebrik ediyor (Ü148).
 *
 * ── Ürün sahibinin isteği ───────────────────────────────────
 *
 * *"Bir başarım kazanınca burdaki gibi efekt olsun ama bizim oyuncunun
 * avatarı yapsın bunu."* Referans Duolingo'nun başarı ekranı.
 *
 * ── 🔴 Kutlayan şey oyuncunun KENDİ avatarı ─────────────────
 *
 * Sahnede duran Loopy genel bir maskot değil, oyuncunun profilde
 * seçtiği renk ve aksesuarla duruyor. Ürün sahibinin isteğinin özü bu:
 * tebrik eden karakter tanıdık olmalı. Sabit bir maskot koysaydık
 * kutlama "uygulamadan bir bildirim" gibi okunurdu.
 *
 * Bu yüzden bileşen seçimi **dışarıdan** alıyor: ekranın hangi
 * oyuncunun avatarını çizeceğini bilmek bu bileşenin işi değil.
 *
 * ── Seviye kutlamasından farkı ──────────────────────────────
 *
 * Seviye kutlaması (Ü146) bir **sayı** gösteriyor: ilerlemenin kendisi
 * ölçülebilir bir şey. Rozet ise ölçülemez, bir **an**: "ilk oyununu
 * oynadın". O yüzden burada rakam yok, kutlayan bir yüz var.
 *
 * ── Birden fazla rozet ──────────────────────────────────────
 *
 * Aynı turda iki rozet birden gelebiliyor (ilk oyun + ilk kupon).
 * Hepsi tek sahnede, alt alta listeleniyor — her biri için ayrı
 * kutlama açsaydık ekran üst üste binen üç tebrikle dolardı.
 */
export function RozetKutlamasi({
  rozetler,
  renk,
  aksesuar,
}: {
  /** Kazanılan rozetlerin **adları** (kod değil). */
  rozetler: string[];
  /**
   * Ü147: tek render varken yok sayılıyor ama **isteğe bağlı olarak
   * taşınmaya devam ediyor** — ürün sahibi diğer renkleri üretip
   * `COK_RENKLI` açılınca kutlama oyuncunun kendi rengiyle çalışsın
   * diye. Kaldırılsaydı o gün üç dosyada yeniden kurulması gerekirdi.
   */
  renk?: OyuncuRengi;
  aksesuar?: AvatarAksesuari;
}) {
  if (rozetler.length === 0) return null;

  return (
    <div className="rozet-sahne relative overflow-hidden rounded-3xl border border-odul bg-odul-zemin px-5 py-6 text-center">
      {/* Işıma — avatarın arkasından açılıyor. */}
      <span
        aria-hidden
        className="rozet-isima pointer-events-none absolute top-[78px] left-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, var(--color-odul) 0%, transparent 70%)",
        }}
      />

      <div className="relative">
        <div className="rozet-avatar mx-auto w-fit">
          <Avatar renk={renk} aksesuar={aksesuar} ifade="mutlu" boy={104} />
        </div>

        <div className="rozet-yazi mt-2">
          <div className="etiket-caps text-odul-koyu">
            {rozetler.length > 1 ? `${rozetler.length} yeni rozet` : "Yeni rozet"}
          </div>

          <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
            {rozetler.map((ad) => (
              <li
                key={ad}
                className="rounded-full border border-odul bg-yuzey px-3 py-1 font-display text-[14px] font-bold"
              >
                {ad}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
            {/* ⚠️ Ü16: rozetin ekonomik değeri yok ve ekran bunu ima
                etmemeli. Cümle bir kutlama, bir vaat değil. */}
            Loopy seninle gurur duyuyor.
          </p>
        </div>
      </div>
    </div>
  );
}
