import Link from "next/link";
import { RENK, type OyuncuRengi } from "./oyuncu-renk";
import { Gorsel, type KuponGorseli } from "./oyuncu-gorsel";

/**
 * Kupon bileti — Ü70.
 *
 * ── Nasıl buraya gelindi ────────────────────────────────────
 *
 * Ü69'da dört stil denendi (aydınlık, koyu ışın, neon, koyu cam) ve
 * ürün sahibi ışın stilini seçti, iki düzeltmeyle:
 *
 * 1. *"Arka plan rengi mor olmasın, daha açık renk olsun."*
 * 2. *"Açık kalsın, ışımayı çok azaltalım."*
 *
 * İkisi de stilin zayıf yanlarını düzeltti. Koyu mor **sabit** bir
 * zemindi: üç kupon alt alta gelince üçü de aynı görünüyor, kuponun ne
 * olduğunu yalnızca arkadaki çizim söylüyordu. Zemin artık kuponun
 * kendi rengi (Ü69) — kahve kahverengi, tatlı pembe, tutar yeşil.
 *
 * Işınlar da koyu zeminde "sahne ışığı" gibi çalışıyordu; açık zeminde
 * aynı yoğunlukta bırakılınca kartı çizgili bir kumaşa çeviriyordu.
 * Şimdi neredeyse görünmez: kâğıt dokusu kadar, desen kadar değil.
 *
 * ── Işın neden tamamen kaldırılmadı ─────────────────────────
 *
 * Biletin ana ekrandaki durum kartıyla akrabalığını kuran tek detay o.
 * `ISIN_OPAKLIK` düşürülmesi kolay, kaldırılması ise bağı koparır —
 * o yüzden azaltıldı, silinmedi.
 *
 * Işınların merkezi kartın **dışında** (yukarıda): merkez içeride
 * kaldığında ışınların birleştiği nokta metnin üstüne denk geliyor ve
 * hedef tahtası gibi duruyor.
 *
 * ── Değişmeyen ──────────────────────────────────────────────
 *
 * TL değeri yok (E9), geçerlilik damgası yok. Bilet ne kadar "değerli"
 * görünürse görünsün kasada okutulmadan hiçbir şey ifade etmiyor.
 */

/**
 * Işın dokusu — 0.22'den indirildi (Ü70).
 *
 * İki değişken birden düştü, çünkü tek başına opaklık yetmedi: 0.08'de
 * bile ışınlar doygun bir zeminin üstünde **çizgili kumaş** gibi
 * okunuyordu. Işınlar seyreltilince (3° dolu, 17° boş) desen olmaktan
 * çıkıp yüzeye düşen ışığa dönüştü.
 */
const ISIN_OPAKLIK = 0.05;
const ISIN_DOKUSU =
  "repeating-conic-gradient(from 0deg, #fff 0deg 3deg, transparent 3deg 20deg)";

export type BiletVerisi = {
  href: string;
  kafe: string;
  baslik: string;
  gorsel: KuponGorseli;
  renk: OyuncuRengi;
  /** "8 Eyl" — biletin son kullanım günü. */
  son: string;
};

export function Bilet({ veri }: { veri: BiletVerisi }) {
  const r = RENK[veri.renk];

  return (
    <Link
      href={veri.href}
      className="kart-golge kart-gel parilti relative block overflow-hidden rounded-2xl transition-transform active:scale-[0.99]"
      style={{
        // Aynı hue üstünde iki durak: canlı tondan onun yarısına.
        // Ayrı bir "açık" paleti tutmaya gerek yok, parlaklık yetiyor.
        background: `linear-gradient(150deg, ${r.canli} 0%, ${r.canli}70 100%)`,
        border: `1px solid ${r.ana}40`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[240%] left-1/2 size-[300%] -translate-x-1/2"
        style={{ opacity: ISIN_OPAKLIK, background: ISIN_DOKUSU }}
      />

      {/* Kuponun çizimi — sağ kenardan taşıyor, dikeyde ortalı. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-6 -translate-y-1/2"
        style={{ color: r.koyu, opacity: 0.24 }}
      >
        <Gorsel ad={veri.gorsel} boy={118} />
      </span>

      <div className="relative flex items-stretch">
        {/* Koçan: biletin koparılan ucu. Yalnızca görsel — kupon tek
            parça, kod QR ekranında. */}
        <span aria-hidden className="w-2.5 shrink-0" style={{ background: r.koyu }} />

        <span className="min-w-0 flex-1 px-4 py-4">
          <span className="block etiket-caps" style={{ color: r.koyu }}>
            {veri.kafe}
          </span>
          <span className="mt-1 block font-display text-xl leading-tight font-bold text-yazi">
            {veri.baslik}
          </span>

          {/* Kesikli çizgi: biletin koparma yeri. */}
          <span
            className="mt-3 block border-t border-dashed pt-2.5"
            style={{ borderColor: `${r.koyu}55` }}
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="etiket-caps text-yazi">Kasada göster →</span>
              <span className="font-data text-[10px] tabular" style={{ color: r.koyu }}>
                son {veri.son}
              </span>
            </span>
          </span>
        </span>
      </div>

      {/*
        Zımba çentikleri **en üstte** ve `pointer-events-none`.

        İçerikten önce çizildiğinde soldaki çentik renkli koçanın altında
        kalıyor ve bilet tek taraftan çentikli görünüyordu.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 0 70%, var(--color-zemin) 8px, transparent 8px)," +
            "radial-gradient(circle at 100% 70%, var(--color-zemin) 8px, transparent 8px)",
        }}
      />
    </Link>
  );
}
