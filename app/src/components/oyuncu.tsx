import Link from "next/link";
import { RENK, type OyuncuRengi } from "./oyuncu-renk";
import { Gorsel, type GorselAdi } from "./oyuncu-gorsel";
import { OyuncuNav, NavBosluk, type Durak } from "./oyuncu-nav";

/**
 * Oyuncu tarafının ortak parçaları — Ü64, Ü65.
 *
 * ── İki dil, iki dosya ──────────────────────────────────────
 *
 * `components/gosterge.tsx` işletme panelinin dili: beyaz kart, alan
 * renkleri, sakin. Bu dosya oyuncunun dili: çarkın pastel renkleri,
 * renkli ikonlar, altın vurgu.
 *
 * Ürün sahibinin ayrımı: *"oyuncu ekranında çarktaki dil, panelde
 * panelin dili — çarktaki dilden kastım eğlenceli, canlı, uygulamanın
 * içine çeken, heyecanlı olması; panel daha resmî, net."*
 *
 * İki dosya olmasının sebebi bu: tek dosyada toplansalardı bir
 * ekranda yanlış dili kullanmak bir `import` kadar kolay olurdu.
 *
 * ── Koyu mor artık tek yerde (Ü65) ──────────────────────────
 *
 * Ü64'te koyu mor kart oyuncu tarafının **her** ekranına kondu ve ürün
 * sahibi haklı olarak *"her yere bu mor efekti koyma, daha renkli daha
 * eğlenceli olmalı"* dedi. Yanlış okuma bendeydi: çarkın kendisi
 * aydınlık ve altı renkli, koyu olan yalnızca üstünde durduğu sahne.
 *
 * Şimdi koyu kart iki yerde: **ana ekranın durum kartı** ve **çark
 * sahnesi**. Geri kalan her ekran `SayfaBasi` ile aydınlık ve renkli.
 */

/* ── Sayfa kabuğu ──────────────────────────────────────────── */

/**
 * Oyuncu tarafındaki her ekranın dış kabuğu — Ü66.
 *
 * ── Neden tek bileşen ───────────────────────────────────────
 *
 * Her ekran kendi `<Sayfa>`, `<NavBosluk>`, `<OyuncuNav>` üçlüsünü
 * elle diziyordu ve ürün sahibi sonucu net söyledi: *"genel olarak
 * tasarımsal bütünlük yok, her yer birbirinden bağımsız duruyor."*
 * Sekiz ekranda sekiz kopya varken bütünlük bir dikkat meselesi
 * oluyor; tek kabukta yapısal bir garanti.
 *
 * ── Geri düğmesi ────────────────────────────────────────────
 *
 * *"Sayfalara geri dönme butonları koymamışsın."* Alt şeritte üç
 * durak var ama şeridin götürmediği yerler de var: kupon detayı,
 * fırsatlar, sıralama, oyun, verilerim, davet. Oralarda tarayıcının
 * geri düğmesinden başka yol yoktu — uygulama gibi davranan bir
 * sayfada bu, çıkmaz sokak demek.
 *
 * Üç durağın kendisinde geri düğmesi **yok**: sekmenin kökünde "geri"
 * nereye gideceği belirsiz bir söz.
 */
export function OyuncuSayfa({
  geri,
  aktif,
  children,
}: {
  /** Üstteki geri bağlantısı. Sekme köklerinde verilmiyor. */
  geri?: { href: string; etiket: string };
  /** Alt şeritte hangi durak yanacak. */
  aktif: Durak;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <div className="mx-auto w-full max-w-md px-5 pt-6 pb-10 sm:pt-10">
        {geri && (
          <Link
            href={geri.href}
            className="mb-4 -ml-1 inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-1 text-[14px] font-semibold text-yazi-sonuk transition-colors hover:text-yazi"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 5 8 12l7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {geri.etiket}
          </Link>
        )}

        {children}

        <NavBosluk />
      </div>

      <OyuncuNav aktif={aktif} />
    </main>
  );
}

/* ── Koyu kart ─────────────────────────────────────────────── */

/**
 * Uygulamanın imza yüzeyi: koyu mor gradyan + ışın dokusu.
 *
 * **Yalnızca ana ekranın durum kartı için.** Yeni bir ekran bunu
 * kullanmak isterse önce şu soruyu cevaplasın: ürünün ikinci bir imza
 * yüzeyine ihtiyacı var mı? Ü65'in cevabı hayır — ekranlar birbirinden
 * renkle ayrılıyor, aynı koyu zeminle değil.
 *
 * Işınların merkezi kartın **dışında** (yukarıda). İlk denemede merkez
 * kartın ortasına denk geliyordu ve ışınların birleştiği nokta içeriğin
 * üstünde bir hedef tahtası gibi duruyordu.
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

/* ── Sayfa başı ────────────────────────────────────────────── */

/**
 * Oyuncu ekranlarının aydınlık başlığı — Ü65.
 *
 * Koyu kartın yerini alıyor. Her ekran kendi renginde: ödüller amber,
 * profil menekşe, sıralama gök. Aynı sayfada iki kez kullanılmıyor —
 * ekranın tek başlığı.
 *
 * ── Çizim neden taşıyor ─────────────────────────────────────
 *
 * Çizim sağ üstten dışarı taşıyor ve kırpılıyor. Kutuya sığdırılmış
 * bir çizim "buraya bir ikon koyduk" diye okunuyordu; taşan çizim
 * kartın kendisini bir nesneye çeviriyor. `overflow-hidden` şart.
 */
export function SayfaBasi({
  ust,
  baslik,
  renk,
  gorsel,
  children,
}: {
  ust: string;
  baslik: string;
  renk: OyuncuRengi;
  gorsel?: GorselAdi;
  /** Başlığın altındaki sayaçlar. */
  children?: React.ReactNode;
}) {
  const r = RENK[renk];

  return (
    <header
      className="relative mb-8 overflow-hidden rounded-3xl px-5 py-6"
      style={{
        background: `linear-gradient(140deg, ${r.zemin} 0%, #ffffff 85%)`,
        border: `1px solid ${r.canli}`,
      }}
    >
      {gorsel && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 -right-7"
          style={{ color: r.ana, opacity: 0.18, transform: "rotate(-10deg)" }}
        >
          <Gorsel ad={gorsel} boy={150} />
        </span>
      )}

      <p className="etiket-caps" style={{ color: r.ana }}>
        {ust}
      </p>
      <h1 className="mt-1 font-display text-3xl leading-none font-extrabold tracking-tight">
        {baslik}
      </h1>

      {children && <div className="relative mt-5">{children}</div>}
    </header>
  );
}

/**
 * Aydınlık başlıktaki tek sayı.
 *
 * Zemin beyaz, kartın pastelinin üstünde: pastel üstüne pastel
 * koyduğumuzda kutunun kenarı kayboluyordu.
 */
export function Sayac({
  etiket,
  deger,
  alt,
  renk,
}: {
  etiket: string;
  deger: string;
  alt?: string;
  /** Verilmezse sayı nötr siyah — "önemli olan bu değil" demek. */
  renk?: OyuncuRengi;
}) {
  const r = renk ? RENK[renk] : null;
  return (
    <div className="rounded-2xl bg-yuzey px-4 py-3.5 shadow-sm">
      <div className="etiket-caps leading-tight text-yazi-sonuk">{etiket}</div>
      <div
        className="mt-1.5 font-data text-2xl leading-none font-bold tabular"
        style={r ? { color: r.ana } : undefined}
      >
        {deger}
      </div>
      {alt && <div className="mt-1 text-[11px] leading-snug text-yazi-sonuk">{alt}</div>}
    </div>
  );
}

/* ── Görselli kart ─────────────────────────────────────────── */

/**
 * Arkasında soluk bir çizim taşıyan kart — Ü66.
 *
 * Ürün sahibinin isteği: *"indirim ne ile alakalıysa arka planda
 * şeffaf biçimde o görünsün."* Aynı düzen oyun kartlarında da
 * kullanılıyor.
 *
 * Çizim **sağ alt köşeden taşıyor** ve `overflow-hidden` onu
 * kırpıyor. Kutuya sığdırılmış bir çizim "ikon" gibi okunuyordu;
 * taşan çizim arka plan oluyor.
 *
 * Saydamlık 0.16: 0.30'da metnin altında desen görünüyor ve başlık
 * okunmuyordu, 0.08'de çizim hiç fark edilmiyordu.
 */
export function GorselKart({
  renk,
  gorsel,
  className = "",
  children,
}: {
  renk: OyuncuRengi;
  gorsel: GorselAdi;
  className?: string;
  children: React.ReactNode;
}) {
  const r = RENK[renk];
  return (
    <div
      className={`relative overflow-hidden rounded-3xl ${className}`}
      style={{
        background: `linear-gradient(135deg, ${r.zemin} 0%, #ffffff 92%)`,
        border: `1px solid ${r.canli}`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-5 -bottom-7"
        style={{ color: r.ana, opacity: 0.16 }}
      >
        <Gorsel ad={gorsel} boy={132} />
      </span>
      <div className="relative">{children}</div>
    </div>
  );
}

/* ── Renkli kart ───────────────────────────────────────────── */

/**
 * Oyuncu tarafının gövde kartı — pastel zemin, renkli çerçeve.
 *
 * `dolu` ile doygun hâle geçiyor: ekranda **yapılacak tek şeyi**
 * gösteren kart (çark hazırsa çark, değilse günün oyunu) dolu, geri
 * kalanı pastel. İki dolu kart yan yana gelirse hangisine dokunulacağı
 * belirsizleşir.
 */
export function RenkliKart({
  renk,
  dolu,
  className = "",
  children,
}: {
  renk: OyuncuRengi;
  dolu?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const r = RENK[renk];
  return (
    <div
      className={`relative overflow-hidden rounded-3xl px-5 py-5 ${className}`}
      style={{
        background: dolu
          ? `linear-gradient(140deg, ${r.canli} 0%, ${r.ana} 100%)`
          : r.zemin,
        border: `1px solid ${dolu ? r.ana : r.canli}`,
        color: dolu ? "#ffffff" : undefined,
      }}
    >
      {children}
    </div>
  );
}

/* ── Renkli pul ────────────────────────────────────────────── */

/**
 * Rozet, ünvan, küçük etiket.
 *
 * Zemin **beyaz**, rengin pastel tonu değil: pullar çoğunlukla zaten
 * pastel bir kartın üstünde duruyor (profildeki kafe kartı) ve pastel
 * üstüne pastel konduğunda pulun kenarı kayboluyordu. Beyaz zemin her
 * iki yüzeyde de okunuyor.
 */
export function Pul({
  baslik,
  aciklama,
  renk = "amber",
}: {
  baslik: string;
  aciklama?: string;
  renk?: OyuncuRengi;
}) {
  const r = RENK[renk];
  return (
    <span
      className="inline-block rounded-full bg-yuzey px-2.5 py-1 etiket-caps text-[10px]"
      style={{ color: r.koyu, border: `1px solid ${r.canli}` }}
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
  renk,
  children,
}: {
  baslik: string;
  not?: string;
  /** Başlığı bölümün rengine boyar; verilmezse nötr gri. */
  renk?: OyuncuRengi;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-9">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="etiket-caps" style={renk ? { color: RENK[renk].ana } : undefined}>
          <span className={renk ? "" : "text-yazi-sonuk"}>{baslik}</span>
        </h2>
        {not && <span className="font-data text-[10px] text-yazi-sonuk">{not}</span>}
      </div>
      {children}
    </section>
  );
}
