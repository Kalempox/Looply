/**
 * Oyuncu tarafının ortak parçaları — Ü64.
 *
 * ── İki dil, iki dosya ──────────────────────────────────────
 *
 * `components/gosterge.tsx` işletme panelinin dili: beyaz kart, alan
 * renkleri, sakin. Bu dosya oyuncunun dili: koyu mor zemin, ışın
 * dokusu, cam kutucuk, altın vurgu — çarkın (Ü49) ve durum kartının
 * (Ü61) dili.
 *
 * Ürün sahibinin ayrımı: *"oyuncu ekranında çarktaki dil, panelde
 * panelin dili — çarktaki dilden kastım eğlenceli, canlı, uygulamanın
 * içine çeken, heyecanlı olması; panel daha resmî, net."*
 *
 * İki dosya olmasının sebebi bu: tek dosyada toplansalardı bir
 * ekranda yanlış dili kullanmak bir `import` kadar kolay olurdu.
 *
 * ── Alan renkleri buraya GİRMİYOR ───────────────────────────
 *
 * Ü63'ün yeşil/sarı/turuncu jetonları işletmeye ait. Oyuncu tarafında
 * tek vurgu altın: oyuncunun ekranında "para" ile "masa" ayrımı yok,
 * kazandığı şey var.
 */

/* ── Koyu kart ─────────────────────────────────────────────── */

/**
 * Oyuncu tarafının imza yüzeyi: koyu mor gradyan + ışın dokusu.
 *
 * Işınların merkezi kartın **dışında** (yukarıda). İlk denemede
 * merkez kartın ortasına denk geliyordu ve ışınların birleştiği nokta
 * içeriğin üstünde bir hedef tahtası gibi duruyordu.
 *
 * Doku dönmüyor: ana ekran her açılışta hareket etmemeli. Dönen tek
 * yüzey çark sahnesi ve orada hareket zaten olayın kendisi.
 */
export function KoyuKart({
  children,
  className = "",
  sikisik = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Dar kartlar için daha az iç boşluk. */
  sikisik?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl text-white ${
        sikisik ? "px-4 py-4" : "px-5 py-6"
      } ${className}`}
      style={{
        background: "linear-gradient(150deg, #4c2a8f 0%, #2a1450 55%, #1b0e38 100%)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[240%] left-1/2 size-[300%] -translate-x-1/2 opacity-[0.10]"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, #fff 0deg 4deg, transparent 4deg 14deg)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ── Cam kutucuk ───────────────────────────────────────────── */

/**
 * Koyu kartın içindeki tek sayı.
 *
 * Beyaz opaklık kullanılıyor, sabit renk değil: kartın gradyanı üstten
 * alta koyulaşıyor ve sabit bir gri, üstte açık altta koyu görünürdü.
 */
export function CamKutu({
  etiket,
  deger,
  alt,
  altin,
}: {
  etiket: string;
  deger: string;
  alt?: string;
  /** Kazanılmış bir şeyi gösteriyorsa altın. */
  altin?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-4">
      <div className="etiket-caps leading-tight text-white/60">{etiket}</div>
      <div
        className={`mt-2 font-data text-3xl leading-none font-bold tabular ${
          altin ? "text-odul" : "text-white"
        }`}
      >
        {deger}
      </div>
      {alt && <div className="mt-1.5 text-[11px] leading-snug text-white/55">{alt}</div>}
    </div>
  );
}

/* ── Altın pul ─────────────────────────────────────────────── */

/**
 * Koyu kartın üstünde duran küçük altın etiket — rozet, ödül, ünvan.
 *
 * Zemin dolu altın değil, altının %14'ü: koyu kartın üstünde dolu altın
 * bir sıra pul, kartın asıl sayısından daha çok bakılan bir şeye
 * dönüşüyordu. Çerçeve altın, yazı altın, zemin şeffaf — pul kendini
 * gösteriyor ama bağırmıyor.
 */
export function AltinPul({ baslik, aciklama }: { baslik: string; aciklama?: string }) {
  return (
    <span
      className="inline-block rounded-full border border-odul/50 bg-odul/[0.14] px-2.5 py-1 etiket-caps text-[10px] text-odul"
      title={aciklama}
    >
      {baslik}
    </span>
  );
}

/* ── Sıra jetonu ───────────────────────────────────────────── */

/**
 * Madalya renkleri — altın, gümüş, bronz.
 *
 * Palet jetonu değiller (Ü31): sıralamada üç ayrı basamağı ayırt eden
 * fiziksel bir gelenek bu, ürünün renk sistemi değil. Tek yerde
 * duruyorlar çünkü ana ekran ve `/liderlik` aynı listeyi gösteriyor —
 * birinci iki ekranda iki farklı renkte olsaydı iki farklı liste
 * sanılırdı.
 */
export const MADALYA = ["#ffcf3f", "#d8dde6", "#d9a06a"] as const;

/** Liderlik satırının başındaki sıra numarası. İlk üç madalya rengi. */
export function SiraJetonu({ sira, kucuk }: { sira: number; kucuk?: boolean }) {
  const madalya = sira <= 3;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-data font-bold tabular ${
        kucuk ? "size-6 text-[11px]" : "size-7 text-[12px]"
      } ${madalya ? "text-[#1b0e38]" : "bg-cukur text-yazi-sonuk"}`}
      style={madalya ? { background: MADALYA[sira - 1] } : undefined}
    >
      {sira}
    </span>
  );
}

/* ── Bölüm başlığı ─────────────────────────────────────────── */

/** Oyuncu ekranlarında bölüm başlığı — sağda isteğe bağlı bir not. */
export function OyuncuBolum({
  baslik,
  not,
  children,
}: {
  baslik: string;
  not?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-9">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="etiket-caps text-yazi-sonuk">{baslik}</h2>
        {not && <span className="font-data text-[10px] text-yazi-sonuk">{not}</span>}
      </div>
      {children}
    </section>
  );
}
