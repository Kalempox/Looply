/**
 * Oyun kartlarının sahne çizimi — Ü176.
 *
 * ── Neden çizildi, üretilmedi ───────────────────────────────
 *
 * Ürün sahibinin tasarımında Düşen kartının ortasında renkli, hacimli
 * bir blok yığını var ve *"özellikle düşen ne kadar güzel"* dedi.
 * Loopy gibi bir 3B render istemek akla geliyor ama gerekmiyor:
 * **blok zaten geometri.** Yuvarlak köşeli bir kare, üstte açık bir
 * yüz, altta koyu bir yüz — SVG'de tam olarak bu.
 *
 * Karakter için render şart (yüz, kumaş, ışık), blok için değil.
 * Çizilen bir sahne dosya indirmiyor, her ölçekte keskin ve rengi
 * ürünün paletinden geliyor — üretilen bir görselde üçü de olmazdı.
 *
 * ── Küp nasıl hacim kazanıyor ───────────────────────────────
 *
 * Üç katman, üçü de tek bir renkten türüyor:
 *
 *   1. gövde   — dikey gradyan (açıktan koyuya)
 *   2. üst yüz — üstte beyaz bir şerit, kübün ışık alan yüzü
 *   3. iç gölge— alt kenarda koyu bir çizgi, oturduğu yer
 *
 * Ü68'in bulgusu burada da geçerli: *"üstten içeriye düşen beyaz bir
 * çizgi, tek başına en çok derinlik veren detay."*
 */

/** Küplerin rengi — ürünün kendi paletinden, rastgele değil. */
const KUP_RENKLERI = {
  turuncu: { acik: "#fdba74", ana: "#f97316", koyu: "#c2410c" },
  mavi: { acik: "#7dd3fc", ana: "#0ea5e9", koyu: "#0369a1" },
  mor: { acik: "#c4b5fd", ana: "#8b5cf6", koyu: "#6d28d9" },
  pembe: { acik: "#f9a8d4", ana: "#ec4899", koyu: "#be185d" },
} as const;

type KupRengi = keyof typeof KUP_RENKLERI;

/**
 * Düşen'in blok yığını.
 *
 * Dizilim tasarımdaki gibi: sağ üstte ayrı duran bir çift, ortada
 * inen bir merdiven, altta dolmuş bir sıra. Rastgele değil — **oyunun
 * kendisini** anlatıyor: parçalar düşüyor, satır doluyor.
 */
const DUSEN_KUPLERI: { x: number; y: number; renk: KupRengi }[] = [
  // Sağ üstte, henüz inmekte olan çift
  { x: 4, y: 0, renk: "turuncu" },
  { x: 4, y: 1, renk: "turuncu" },

  // Ortadaki merdiven
  { x: 2, y: 1, renk: "mavi" },
  { x: 2, y: 2, renk: "mavi" },
  { x: 3, y: 2, renk: "mor" },

  // Dolmakta olan alt sıra
  { x: 1, y: 3, renk: "turuncu" },
  { x: 2, y: 3, renk: "mavi" },
  { x: 3, y: 3, renk: "mor" },
  { x: 4, y: 3, renk: "pembe" },
];

function Kup({ x, y, renk, k }: { x: number; y: number; renk: KupRengi; k: number }) {
  const r = KUP_RENKLERI[renk];
  const px = x * k;
  const py = y * k;
  const kenar = k * 0.9;
  const id = `kup-${renk}-${x}-${y}`;

  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={r.acik} />
          <stop offset="55%" stopColor={r.ana} />
          <stop offset="100%" stopColor={r.koyu} />
        </linearGradient>
      </defs>

      {/* Gövde */}
      <rect x={px} y={py} width={kenar} height={kenar} rx={kenar * 0.26} fill={`url(#${id})`} />

      {/*
        Üst yüz: küpün ışık alan tarafı. Ü68 — üstten içeriye düşen
        beyaz şerit, tek başına en çok derinlik veren detay.
      */}
      <rect
        x={px + kenar * 0.14}
        y={py + kenar * 0.11}
        width={kenar * 0.72}
        height={kenar * 0.2}
        rx={kenar * 0.1}
        fill="#fff"
        opacity="0.42"
      />

      {/* Oturduğu yer: alt kenarda koyu bir çizgi. */}
      <rect
        x={px + kenar * 0.12}
        y={py + kenar * 0.78}
        width={kenar * 0.76}
        height={kenar * 0.1}
        rx={kenar * 0.05}
        fill={r.koyu}
        opacity="0.45"
      />
    </g>
  );
}

/**
 * Düşen'in sahnesi.
 *
 * ⚠️ `aria-hidden`: sahne bir süs, bilgiyi kartın metni taşıyor.
 * Ekran okuyucuya "beş turuncu kare" diye okunması kimseye bir şey
 * anlatmazdı.
 */
export function DusenSahnesi({ boy = 160 }: { boy?: number }) {
  // 5 sütun × 4 satır, aralarında pay: kutu 5k × 4k.
  const k = boy / 4;

  return (
    <svg
      width={k * 5}
      height={boy}
      viewBox={`0 0 ${k * 5} ${boy}`}
      fill="none"
      aria-hidden
      className="overflow-visible"
    >
      {DUSEN_KUPLERI.map((kup) => (
        <Kup key={`${kup.x}-${kup.y}`} {...kup} k={k} />
      ))}
    </svg>
  );
}
