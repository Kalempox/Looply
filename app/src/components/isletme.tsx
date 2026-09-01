/**
 * İşletme tarafı arayüz parçaları.
 *
 * Kaynak §31: "Kafe sahibi oyundan değil, sonuçtan etkilenmeli."
 *
 * Ü31 ile palet oyuncu tarafıyla **aynı** — ayrım artık renkte değil
 * yoğunlukta, süste ve tonda: tablo, hizalı sayı, ince çizgi, süs yok,
 * emoji yok. Buradaki her ekran iyi dizilmiş bir fatura gibi okunmalı.
 */

/**
 * İşletme sayfasının kabuğu.
 *
 * ── `genis` neden bu kadar genişledi (Ü58) ──────────────────
 *
 * Eskiden `max-w-4xl` (896px) idi ve panel yalnızca telefondan
 * bakılacak varsayımıyla tasarlanmıştı. Kafe sahibi paneli
 * **bilgisayardan da** açıyor: 2000 piksellik bir ekranda 896 piksellik
 * bir sütun, ekranın üçte ikisini boş bırakıyordu. Referans yönetim
 * panelleri içeriği tam genişliğe yayıyor.
 *
 * Üst sınır yine de var (`max-w-[1600px]`): sınırsız bırakılsaydı geniş
 * ekranda satırlar okunamayacak kadar uzardı.
 *
 * `genis` OLMAYAN sayfalar dar kalıyor — onlar form sayfaları ve bir
 * form ne kadar genişlerse o kadar zor doldurulur.
 */
export function IsletmeSayfa({
  children,
  genis,
}: {
  children: React.ReactNode;
  genis?: boolean;
}) {
  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <div
        className={`mx-auto w-full px-5 py-10 sm:px-8 lg:py-10 ${
          genis ? "max-w-[1600px] sm:py-10" : "max-w-lg sm:py-14"
        }`}
      >
        {children}
      </div>
    </main>
  );
}

export function IsletmeBaslik({
  ust,
  alt,
  children,
}: {
  ust?: string;
  alt?: string;
  children: React.ReactNode;
}) {
  return (
    <header className="mb-9 border-b border-cizgi pb-6">
      {ust && (
        <div className="mb-2 etiket-caps text-yazi-sonuk">
          {ust}
        </div>
      )}
      <h1 className="font-display text-3xl leading-tight font-bold tracking-tight">{children}</h1>
      {alt && <p className="mt-2.5 text-[15px] leading-relaxed text-yazi-sonuk">{alt}</p>}
    </header>
  );
}

export function IsletmeAlan({
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
      <span className="mb-1.5 block text-[13px] font-semibold text-yazi">{etiket}</span>
      {children}
      {hata ? (
        <span className="mt-1.5 block text-[13px] text-tehlike">{hata}</span>
      ) : ipucu ? (
        <span className="mt-1.5 block text-[12px] text-yazi-sonuk">{ipucu}</span>
      ) : null}
    </label>
  );
}

export const isletmeGirdi =
  "w-full rounded-lg border border-cizgi bg-yuzey px-3.5 py-3 text-[16px] text-yazi " +
  "placeholder:text-yazi-sonuk/60 focus:border-vurgu focus:outline-none";

export function IsletmeDugme({
  children,
  ikincil,
  tehlike,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { ikincil?: boolean; tehlike?: boolean }) {
  const temel =
    "rounded-lg px-5 py-3 font-display text-[15px] font-bold tracking-tight " +
    "transition-colors disabled:cursor-not-allowed disabled:opacity-45";
  const renk = tehlike
    ? "bg-tehlike text-white hover:bg-tehlike/90"
    : ikincil
      ? "border border-cizgi bg-yuzey text-yazi hover:border-yazi-sonuk"
      : "bg-vurgu text-white hover:bg-vurgu/90";
  return (
    <button className={`${temel} ${renk}`} {...props}>
      {children}
    </button>
  );
}

export function IsletmeUyari({
  tur = "hata",
  children,
}: {
  tur?: "hata" | "bilgi" | "bekle";
  children: React.ReactNode;
}) {
  const renk =
    tur === "hata"
      ? "border-tehlike/50 bg-tehlike/5 text-tehlike"
      : tur === "bekle"
        ? "border-odul/50 bg-odul/5 text-yazi"
        : "border-vurgu/50 bg-vurgu/5 text-yazi";
  return (
    <div
      className={`rounded-lg border ${renk} px-4 py-3 text-[14px] leading-relaxed`}
      role="alert"
    >
      {children}
    </div>
  );
}

export function Bolum({
  baslik,
  alt,
  children,
}: {
  baslik: string;
  alt?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="etiket-caps text-yazi-sonuk">{baslik}</h2>
      {alt && <p className="mt-1.5 mb-4 text-[13px] leading-relaxed text-yazi-sonuk">{alt}</p>}
      <div className={alt ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

export function Rozet({
  tur,
  children,
}: {
  tur: "bekliyor" | "onayli" | "red" | "pasif";
  children: React.ReactNode;
}) {
  const renk = {
    bekliyor: "border-odul text-odul-koyu",
    onayli: "border-vurgu text-vurgu",
    red: "border-tehlike text-tehlike",
    pasif: "border-cizgi text-yazi-sonuk",
  }[tur];
  return (
    <span className={`etiket-caps rounded border ${renk} px-2 py-0.5 text-[10px]`}>
      {children}
    </span>
  );
}

/**
 * İki kolonlu sayfa düzeni — Ü60.
 *
 * ── Neden var ───────────────────────────────────────────────
 *
 * Panelin alt sayfalarının çoğu aynı şekle sahip: bir **form** ve bir
 * **liste**. Telefonda alt alta doğru çalışıyorlar. Bilgisayarda aynı
 * dizilim, ekranın yarısı boşken kullanıcıyı iki üç ekran boyu
 * kaydırtıyordu.
 *
 * ── Kolonların işi ──────────────────────────────────────────
 *
 * Sol **yazma**, sağ **okuma**. Kafe sahibi bir şey eklerken mevcut
 * listeyi görüyor: eklediği şeyin zaten var olup olmadığını anlamak
 * için kaydırmak gerekmiyor.
 *
 * `items-start` şart: kolonlar farklı boyda ve varsayılan `stretch`
 * kısa olanı uzatıp içindeki kartı gereksiz yere geriyordu.
 */
export function IkiKolon({ sol, sag }: { sol: React.ReactNode; sag: React.ReactNode }) {
  return (
    <div className="grid items-start gap-x-8 lg:grid-cols-2">
      <div>{sol}</div>
      <div>{sag}</div>
    </div>
  );
}
