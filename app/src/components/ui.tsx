/**
 * Oyuncu tarafı arayüz parçaları — "Açık ve Asil" (Ü31).
 *
 * Yazı kuralı: etiket etiketler, örnek örnekler, hata ne olduğunu ve nasıl
 * düzeltileceğini söyler. Hiçbiri iki iş birden yapmaz.
 *
 * Şekil: kart 16px, düğme ve girdi 8px, çip 4px. Derinlik gölgeyle değil
 * tonlamayla veriliyor — beyaz kart, açık gri zemin, 1px saç teli çizgi.
 */

export function Alan({
  etiket,
  ipucu,
  hata,
  children,
}: {
  etiket: string;
  ipucu?: string;
  hata?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="etiket-caps mb-1.5 block text-yazi-sonuk">{etiket}</span>
      {children}
      {hata ? (
        <span className="mt-1.5 block text-[13px] text-tehlike">{hata}</span>
      ) : ipucu ? (
        <span className="mt-1.5 block text-[12px] text-yazi-sonuk">{ipucu}</span>
      ) : null}
    </label>
  );
}

/**
 * Girdi — 16px şart.
 *
 * Daha küçüğü iOS Safari'de odaklanınca sayfayı zumluyor ve oyuncu formun
 * geri kalanını kaydırarak arıyor.
 */
export const girdiSinifi =
  "w-full rounded-lg border border-cizgi bg-cukur px-4 py-3.5 text-[16px] text-yazi " +
  "placeholder:text-yazi-sonuk/60 focus:border-vurgu focus:outline-none";

export function Dugme({
  children,
  ikincil,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { ikincil?: boolean }) {
  const temel =
    "w-full rounded-lg px-5 py-4 font-display text-[16px] font-bold tracking-tight " +
    "transition-colors disabled:cursor-not-allowed disabled:opacity-45";
  const renk = ikincil
    ? "border border-cizgi bg-yuzey text-yazi hover:border-yazi-sonuk"
    : "bg-vurgu text-white hover:bg-vurgu/90";
  return (
    <button className={`${temel} ${renk}`} {...props}>
      {children}
    </button>
  );
}

/**
 * Uyarı — ikonsuz.
 *
 * Renk tek başına anlam taşımıyor: her renkli hâlin yanında metin var,
 * zaten uyarının kendisi metin.
 */
export function Uyari({
  tur = "hata",
  children,
}: {
  tur?: "hata" | "bilgi" | "bekle";
  children: React.ReactNode;
}) {
  // Zemin bilerek `bg-yuzey`: tehlike kırmızısı çukur zeminde 4.26:1'de
  // kalıyor, beyazda 4.77'ye çıkıyor. Uyarı, okunamayacaksa uyarı değildir.
  const renk =
    tur === "hata"
      ? "border-tehlike/60 text-tehlike"
      : tur === "bekle"
        ? "border-odul/70 text-yazi"
        : "border-vurgu/60 text-vurgu";
  return (
    <div
      className={`rounded-lg border ${renk} bg-yuzey px-4 py-3 text-[14px] leading-relaxed`}
      role="alert"
    >
      {children}
    </div>
  );
}

/** Masa künyesi — hangi kafede, hangi masada olduğun her ekranda görünür. */
export function MasaKunyesi({ kafe, masa }: { kafe: string; masa: string }) {
  return (
    <div className="mb-8 rounded-2xl border border-vurgu bg-yuzey px-4 py-3.5">
      <div className="etiket-caps text-yazi-sonuk">Buradasın</div>
      <div className="mt-1 font-display text-lg font-bold">
        {kafe} <span className="text-yazi-sonuk">·</span> {masa}
      </div>
    </div>
  );
}

export function Baslik({ ust, children }: { ust?: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      {ust && <div className="etiket-caps mb-2 text-vurgu">{ust}</div>}
      <h1 className="font-display text-3xl leading-tight font-extrabold tracking-[-0.02em]">
        {children}
      </h1>
    </div>
  );
}

export function Sayfa({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <div className="mx-auto w-full max-w-md px-5 py-10 sm:py-14">{children}</div>
    </main>
  );
}
