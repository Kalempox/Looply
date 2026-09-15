"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

/**
 * Gün seçici — takvimden geçmiş günlere gitmek (Ü123).
 *
 * ── Neden gerekti ───────────────────────────────────────────
 *
 * Gün gezinmesi yalnızca `‹` ve `›` idi: bir ay öncesine bakmak için
 * otuz kez tıklamak gerekiyordu. Ürün sahibi: *"Bugüne basınca takvim
 * açılmalı ve oradan geçmiş raporları görebilmeliyim."*
 *
 * ── Neden takvim kütüphanesi yok ────────────────────────────
 *
 * `<input type="date">` her tarayıcıda yerleşik bir takvim açıyor,
 * klavyeyle kullanılabiliyor, ekran okuyucu tanıyor ve telefonda
 * işletim sisteminin kendi seçicisi çıkıyor. Kendi takvimimizi çizmek
 * bunların üçünü de elle yeniden yazmak demekti.
 *
 * ── 🔴 `showPicker()` ŞART — tıklama tek başına yetmiyor (Ü139) ─
 *
 * Bu bileşen önce *"girdiyi etiketin üstüne saydam ser, tıklamak takvimi
 * her yerde açar"* diye yazılmıştı. **Açmıyor.** Chrome ve Edge'de
 * `<input type="date">` gövdesine tıklamak yalnızca bir tarih
 * **parçasına** odaklanıyor (gün/ay/yıl); takvimi açan tek yer sağ
 * kenardaki takvim simgesi ve `opacity-0` onu da görünmez yapıyordu.
 * Sonuç: "Bugün"e basılıyor, hiçbir şey olmuyordu — ürün sahibi bunu
 * arızayla aynı anda bildirdi.
 *
 * `showPicker()` desteklenmediği yerlerde (Safari 16 öncesi, eski
 * Firefox) ya da kullanıcı hareketi olmadan çağrılırsa hata fırlatıyor.
 * Bu yüzden `try/catch` ve bu yüzden girdi hâlâ **üstte ve tıklanabilir**
 * duruyor: yöntem yoksa girdinin kendi davranışı devrede kalıyor ve
 * takvim simgesi yine çalışıyor. Düğmeye çevirip girdiyi arkaya alsaydık,
 * desteklemeyen tarayıcıda hiçbir yol kalmazdı.
 *
 * ── Takvim simgesi neden görünür ────────────────────────────
 *
 * Arıza yalnızca teknik değildi: etiket tıklanabilir görünmüyordu. Düz
 * bir "Bugün" yazısına kimse basmayı denemez. Simge, basılacak bir şey
 * olduğunu söylüyor.
 *
 * ⚠️ `max` bugün: gelecek gün seçilebilseydi panel boş sayılarla "yarın
 * hiç müşteri gelmedi" der gibi görünürdü. Olmamış bir günü sıfır diye
 * göstermek, veriyi yanlış okutmanın en kolay yolu (`GunGezinme`nin
 * ileri düğmesindeki kuralla aynı).
 */
export function GunSecici({
  gun,
  bugun,
  etiket,
}: {
  /** Seçili gün, `YYYY-MM-DD`. */
  gun: string;
  bugun: string;
  /** Ekranda görünen metin — bugünse "Bugün", değilse tarih. */
  etiket: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);

  function takvimiAc() {
    try {
      ref.current?.showPicker();
    } catch {
      // Tarayıcı desteklemiyor ya da hareket bağlamı düştü. Girdi üstte
      // ve tıklanabilir: kendi takvim simgesi ve klavye girişi duruyor.
    }
  }

  return (
    <span className="group relative inline-flex">
      <span
        className={`flex min-w-[116px] items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-center font-data text-[12px] tabular transition-colors group-hover:bg-cukur group-focus-within:ring-2 group-focus-within:ring-vurgu ${
          gun === bugun ? "" : "bg-cukur"
        }`}
      >
        <TakvimIkonu />
        {etiket}
      </span>
      <input
        ref={ref}
        type="date"
        value={gun}
        max={bugun}
        aria-label="Takvimden gün seç"
        onClick={takvimiAc}
        onChange={(e) => {
          const secilen = e.target.value;
          // Boş değer: kullanıcı takvimi temizledi. Bugüne dönülüyor —
          // adres `gun` olmadan da geçerli ve bugünü gösteriyor.
          router.push(secilen ? `/kafe/panel?gun=${secilen}` : "/kafe/panel");
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </span>
  );
}

/** Takvim — "buraya basılır" işareti. Emoji yok (işletme tarafının kuralı). */
function TakvimIkonu() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-yazi-sonuk"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
