import Link from "next/link";
import { BiletYuzeyi } from "./oyuncu";
import { RENK, type OyuncuRengi } from "./oyuncu-renk";
import { type GorselAdi } from "./oyuncu-gorsel";
import { OyunSahnesi } from "./oyun-sahnesi";

/**
 * Yatay geçiş kartı — Ü66, Ü171, **Ü196'da ortak dosyaya çıktı**.
 *
 * Ana ekranda "Tüm oyunlar" ve "Buradaki fırsatlar" bu kart. Ürün sahibi
 * misafirin oyun seçimi için karuseli reddetti — *"hayır carousel
 * şeklinde değil, burdaki gibi olacak bir oyun seç kısmı"* — ve
 * gösterdiği şey tam olarak bu kart.
 *
 * ── 🔴 Neden `/oyna/page.tsx`ten çıktı ──────────────────────
 *
 * Orada yerel bir fonksiyondu, yani yalnızca tek ekran kullanabiliyordu.
 * Misafir ekranına kopyalansaydı iki kart kodu olurdu ve ikinci turda
 * ayrışırlardı — bu projede iki kez yaşanmış bir hata (Ü71, Ü194).
 *
 * ── Bağlantı mı düğme mi ────────────────────────────────────
 *
 * İki çağıranın oyunu açma yolu farklı:
 *
 *   ana ekran / katalog → `yol` verilir, kart bir `<Link>`
 *   misafir (`/hemen`)  → `oyna` verilir, kart bir `<button>`;
 *                         `misafirBasla` tohum üretiyor ve oyun
 *                         sayfada açılıyor
 *
 * ⚠️ Düğme hâlinde yüzey `govde="span"` ile çiziliyor: `<button>`ın
 * içerik modeli phrasing içerik istiyor ve `<div>` orada geçersiz.
 * Metin satırları da bu yüzden `<span className="block">` — iki hâlde
 * de aynı işaretleme, tek kod.
 */
export function GecisKarti({
  yol,
  oyna,
  bekliyor,
  ust,
  ustVurgulu = false,
  baslik,
  alt,
  renk,
  gorsel,
  sahne,
}: {
  /** Kart bir yere gidiyorsa adres. `oyna` ile birlikte verilmiyor. */
  yol?: string;
  /** Kart bir eylem çalıştırıyorsa. `yol` ile birlikte verilmiyor. */
  oyna?: () => void;
  /** Sunucu cevabı beklenirken düğme kapanıyor. */
  bekliyor?: boolean;
  ust: string;
  /**
   * Üst etiket altın mı?
   *
   * Ü196: misafir ekranında bugünün oyunu bu etiketle işaretleniyor
   * (*"Bugünün oyunu · ×2"*). Ana ekranın kendi hero kartındaki altın
   * etiketle aynı dil; kategori etiketleri sönük kalıyor.
   */
  ustVurgulu?: boolean;
  baslik: string;
  alt: string;
  renk: OyuncuRengi;
  gorsel?: GorselAdi;
  /**
   * Üretilmiş sahne — Ü180.
   *
   * ⚠️ `gorsel` ile birlikte kullanılmıyor: `gorsel` kartın arkasında
   * %24 opaklıkta **fısıldayan** bir çizim, sahne ise tam renkte
   * duruyor. İkisi aynı köşede olsaydı biri diğerinin altında gürültü
   * bırakırdı.
   */
  sahne?: string;
}) {
  const r = RENK[renk];
  const dugme = !!oyna;

  const govde = (
    <BiletYuzeyi
      renk={renk}
      gorsel={gorsel}
      govde={dugme ? "span" : "div"}
      className="px-5 py-4"
    >
      {/*
        Sahne sağ kenardan taşıyor ve kırpılıyor — biletin kendi
        diliyle aynı (Ü72): kutuya sığdırılmış çizim "buraya bir ikon
        koyduk" diye okunuyor, taşan çizim kartı bir nesneye çeviriyor.

        ⚠️ Metnin sağ ucuna değmemesi için sağa YASLI ve dar: kart
        iki satır yazı taşıyor ve sahne onların üstüne binerse başlık
        okunmaz oluyor.
      */}
      {sahne && (
        <span aria-hidden className="pointer-events-none absolute -top-2 -right-5">
          <OyunSahnesi oyun={sahne} boy={104} />
        </span>
      )}

      <span
        className={`relative block etiket-caps ${ustVurgulu ? "text-odul" : "text-white/55"}`}
      >
        {ust}
      </span>
      <span className="relative mt-1 flex items-baseline justify-between gap-3">
        <span className="font-display text-lg leading-tight font-bold text-white">{baslik}</span>
        {/* Ok biletteki "Kasada göster →"in karşılığı: bu kart da bir
            yere gitmeyi vaat ediyor. Rengi `canli` — koyu zeminde
            beyazdan ayrılıyor ama başlığı bastırmıyor. */}
        <span aria-hidden className="shrink-0 text-[15px]" style={{ color: r.canli }}>
          →
        </span>
      </span>
      {/* ⚠️ Sahne varken metin dar: tam genişlikte alt satır sahnenin
          altına giriyor ve iki katman üst üste okunmaz oluyor. */}
      <span
        className={`relative mt-1 block text-[13px] leading-relaxed text-white/65 ${
          sahne ? "max-w-[62%]" : ""
        }`}
      >
        {bekliyor ? "Başlıyor…" : alt}
      </span>
    </BiletYuzeyi>
  );

  /*
    ⚠️ `BiletYuzeyi` sarılıyor, içine girilmiyor: kartın kendi
    `overflow-hidden`ı ve yuvarlak köşeleri sarmalayıcının dışında
    kalırsa tıklama alanı köşelerden taşıyor.
  */
  if (dugme) {
    return (
      <button
        type="button"
        onClick={oyna}
        disabled={bekliyor}
        className="block w-full text-left transition-transform hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100"
      >
        {govde}
      </button>
    );
  }

  return (
    <Link
      href={yol ?? "#"}
      className="block transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
    >
      {govde}
    </Link>
  );
}
