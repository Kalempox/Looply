"use client";

/**
 * Ödül açılışı — Ü56.
 *
 * ── Referans ve neden Lottie değil ──────────────────────────
 *
 * Ürün sahibinin verdiği örnek bir Lottie animasyonuydu: zıplayarak
 * açılan 3B hediye kutusu. Hareket alındı, dosya alınmadı.
 *
 * `lottie-web` ~250 KB, animasyon JSON'u 90–330 KB. Bu ekran kafede,
 * mobil veriyle, ödülün göründüğü an açılıyor — yarım megabaytlık bir
 * indirme "kazandın" yazısını geciktirmekten başka bir şey yapmazdı.
 * Aynı sıra CSS ile kuruluyor ve sıfır bayt indiriliyor.
 *
 * ── Sıra ────────────────────────────────────────────────────
 *
 *   0.0s  kutu titremeye başlar (iki kez)
 *   1.0s  kapak zıplayarak uçar, kutu esner
 *   1.1s  ışık halkası yayılır, konfeti dağılır
 *   1.5s  ödülün adı büyüyerek gelir
 *
 * Zamanlama `globals.css` içinde, gecikmeler olarak. Tek zaman
 * çizgisinin parçaları olduğu için hepsi bir arada duruyor; bileşene
 * dağıtılsaydı biri değiştiğinde diğerleri kayardı.
 *
 * ── Hareket azaltma ─────────────────────────────────────────
 *
 * `globals.css` içindeki `prefers-reduced-motion` bloğu bütün
 * animasyonları 0.01ms'ye indiriyor. Yani kutu anında açık, konfeti
 * anında bitmiş görünüyor ve **ödül yine okunuyor** — bu bileşen o
 * durumda bilgi kaybetmiyor.
 */

/**
 * Konfeti parçacıkları — yön, mesafe, dönüş, renk, boyut.
 *
 * Sabit dizi: `Math.random()` render sırasında çağrılsaydı sunucu ile
 * istemci farklı değer basar ve React hidrasyon uyarısı verirdi. Aynı
 * hatayı çarkın koordinatlarında bir kez yaptık.
 */
const KONFETI = [
  { u: -78, v: -54, d: 220, r: "vurgu", g: 7, y: 4 },
  { u: 72, v: -62, d: -190, r: "odul", g: 5, y: 9 },
  { u: -104, v: 14, d: 140, r: "odul", g: 8, y: 5 },
  { u: 96, v: 22, d: -260, r: "vurgu", g: 6, y: 6 },
  { u: -46, v: -92, d: 300, r: "odul", g: 5, y: 5 },
  { u: 40, v: -98, d: -120, r: "vurgu", g: 9, y: 4 },
  { u: -118, v: -20, d: 180, r: "vurgu", g: 4, y: 8 },
  { u: 112, v: -34, d: -210, r: "odul", g: 7, y: 4 },
  { u: -22, v: 62, d: 250, r: "odul", g: 6, y: 6 },
  { u: 30, v: 70, d: -160, r: "vurgu", g: 5, y: 7 },
  { u: -64, v: 44, d: 200, r: "vurgu", g: 8, y: 4 },
  { u: 60, v: 52, d: -230, r: "odul", g: 4, y: 8 },
] as const;

export function OdulAcilisi({
  baslik,
  ustEtiket = "Kazandın",
  altMetin,
  koyuZemin = false,
}: {
  baslik: string;
  ustEtiket?: string;
  altMetin?: React.ReactNode;
  /**
   * Tam ekran sahnede mi (Ü59)?
   *
   * Sahnenin zemini koyu mor; açık renkli kart orada yamalı duruyor ve
   * yazılar okunmuyor. Ayrı bileşen yerine tek bayrak — iki kopya
   * olsaydı biri güncellenmeden kalırdı.
   */
  koyuZemin?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col items-center overflow-hidden rounded-2xl border px-5 py-5 text-center ${
        koyuZemin ? "border-white/20 bg-white/10 backdrop-blur-sm" : "border-odul bg-cukur"
      }`}
    >
      {/* Işık halkası — kutu açıldığı anda dışa doğru yayılıyor. */}
      <span
        aria-hidden
        className="isik-yayil pointer-events-none absolute top-[78px] left-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--color-odul) 0%, transparent 70%)",
        }}
      />

      {/* Kutu ve konfeti aynı kutuda: konfeti kutunun merkezinden dağılıyor. */}
      <div className="relative">
        <HediyeKutusu />

        {KONFETI.map((k, i) => (
          <span
            key={i}
            aria-hidden
            className="konfeti pointer-events-none absolute top-10 left-1/2 rounded-[1px]"
            style={
              {
                width: k.g,
                height: k.y,
                background: `var(--color-${k.r})`,
                "--u": `${k.u}px`,
                "--v": `${k.v}px`,
                "--d": `${k.d}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="odul-gel mt-2">
        <div className={`etiket-caps ${koyuZemin ? "text-odul" : "text-odul-koyu"}`}>
          {ustEtiket}
        </div>
        <div
          className={`mt-1.5 font-display text-2xl leading-tight font-extrabold ${
            koyuZemin ? "text-white" : ""
          }`}
        >
          {baslik}
        </div>
        {altMetin && (
          <div
            className={`mt-2.5 text-[14px] leading-relaxed ${
              koyuZemin ? "text-white/75" : "text-yazi-sonuk"
            }`}
          >
            {altMetin}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hediye kutusu — kapak ayrı bir grup.
 *
 * ── Neden gövdede karanlık bir ağız var ─────────────────────
 *
 * İlk çizimde gövde düz bir dikdörtgendi. Kapak uçup gidince geriye
 * **kapalı görünen** bir kutu kalıyordu: animasyon "açıldı" değil
 * "üstünden bir şey geçti" gibi okunuyordu. Ağız, kapağın altında
 * duruyor ve ancak kapak çekilince ortaya çıkıyor — açılmayı anlatan
 * şey o.
 *
 * ── Kapak neden ayrı ────────────────────────────────────────
 *
 * Uçan parça o. Tek parça çizilseydi kutu bütün hâlde havalanır ve
 * "açıldı" değil "zıpladı" görünürdü.
 */
function HediyeKutusu() {
  return (
    <svg width="112" height="102" viewBox="0 0 120 110" aria-hidden>
      {/* Zemin gölgesi — kutuyu havada bırakmıyor. */}
      <ellipse cx="60" cy="99" rx="34" ry="5" fill="#000" opacity="0.1" />

      <g className="kutu-titre">
        <g className="kutu-zipla" style={{ transformOrigin: "60px 96px" }}>
          {/* Ağız: kapak uçunca görünen karanlık iç. */}
          <rect x="24" y="40" width="72" height="12" rx="3" fill="#1b2a6b" />

          {/* Gövde */}
          <rect x="24" y="46" width="72" height="50" rx="5" fill="var(--color-vurgu)" />
          {/* Gövdenin sol yüzü — hacim için bir ton koyu. */}
          <path d="M24 51a5 5 0 0 1 5-5h9v50h-9a5 5 0 0 1-5-5Z" fill="#0a47ab" opacity="0.35" />
          {/* Dikey kurdele */}
          <rect x="52" y="46" width="16" height="50" fill="var(--color-odul)" />
          <rect x="52" y="46" width="4" height="50" fill="#fff" opacity="0.25" />
        </g>
      </g>

      {/* Kapak: uçan parça */}
      <g className="kapak-uc" style={{ transformOrigin: "60px 34px" }}>
        <rect x="18" y="32" width="84" height="18" rx="5" fill="var(--color-vurgu)" />
        <rect x="18" y="32" width="84" height="6" rx="3" fill="#fff" opacity="0.22" />
        <rect x="52" y="32" width="16" height="18" fill="var(--color-odul)" />

        {/* Fiyonk: iki ilmek ve bir düğüm */}
        <path
          d="M60 32c-9 0-17-4-17-11a6 6 0 0 1 11-3c2.5 3.5 5 9 6 14Z"
          fill="var(--color-odul)"
        />
        <path
          d="M60 32c9 0 17-4 17-11a6 6 0 0 0-11-3c-2.5 3.5-5 9-6 14Z"
          fill="var(--color-odul)"
        />
        <circle cx="60" cy="30" r="4.5" fill="#b8901f" />
      </g>
    </svg>
  );
}
