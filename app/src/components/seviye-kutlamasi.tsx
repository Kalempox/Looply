/**
 * Seviye atlama kutlaması — Ü146.
 *
 * ── Referans ────────────────────────────────────────────────
 *
 * Ürün sahibinin örneği Waterllama'nın başarı döngüsü: yumuşak bir
 * yaylanma, dışa açılan bir halka ve etrafa saçılan küçük parçalar.
 * Hareket "patlama" değil **kabarma** — kutlama bağırmıyor, seviniyor.
 *
 * ── Neden ödül açılışından ayrı bir sahne ───────────────────
 *
 * Elde `OdulAcilisi` var (hediye kutusu, konfeti) ve aynı sahne burada
 * da kullanılabilirdi. Kullanılmadı çünkü ikisi **farklı şeyler**
 * söylüyor: ödül açılışı *"elinde bir şey var"*, seviye atlama
 * *"sen ilerledin"*. Kutu açılsaydı oyuncu kasada gösterebileceği bir
 * şey kazandığını sanır, seviye ise kasada hiçbir şey ifade etmiyor.
 *
 * Bu yüzden sahnenin merkezinde bir nesne değil **sayı** var: yeni
 * seviyenin kendisi.
 *
 * ── Hareketi kapatan kullanıcı ──────────────────────────────
 *
 * `globals.css` bütün süreleri sıfırlıyor: halka anında açılmış,
 * parçalar dağılmış, sayı yerinde. Kutlama bilgi taşımıyor — bilgi
 * metinde ve o her koşulda okunuyor.
 */

/**
 * Saçılan parçalar — yön ve uzaklık.
 *
 * Sabit dizi: `Math.random()` render sırasında çağrılsaydı sunucu ile
 * istemci farklı değer basar ve React hidrasyon uyarısı verirdi. Aynı
 * hata çarkın koordinatlarında ve konfetide bir kez yapıldı.
 */
const PARCALAR = [
  { u: -62, v: -38, d: 180, g: 6, gecikme: 0 },
  { u: 58, v: -46, d: -150, g: 5, gecikme: 60 },
  { u: -80, v: 10, d: 120, g: 4, gecikme: 110 },
  { u: 74, v: 18, d: -200, g: 6, gecikme: 40 },
  { u: -34, v: -68, d: 220, g: 5, gecikme: 150 },
  { u: 30, v: -72, d: -110, g: 4, gecikme: 90 },
  { u: -50, v: 44, d: 160, g: 5, gecikme: 180 },
  { u: 46, v: 50, d: -170, g: 4, gecikme: 130 },
] as const;

export function SeviyeKutlamasi({
  seviye,
  kafeAdi,
}: {
  seviye: number;
  /** Seviye kafeye ait (Ü15) — hangi kafede atlandığı yazılmalı. */
  kafeAdi?: string;
}) {
  return (
    <div className="seviye-sahne relative overflow-hidden rounded-3xl bg-vitrin-lacivert px-5 py-7 text-center text-yuzey">
      {/* Dışa açılan halka — sahnenin "kabarma" hissi buradan geliyor. */}
      <span
        aria-hidden
        className="seviye-halka pointer-events-none absolute top-[74px] left-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, var(--color-odul) 0%, transparent 68%)",
        }}
      />

      <div className="relative">
        <div className="relative mx-auto w-fit">
          {/* Rozet: sayı sahnenin merkezinde. */}
          <div className="seviye-rozet grid size-[86px] place-items-center rounded-full border-[3px] border-odul bg-vitrin-lacivert-acik">
            <span className="font-data text-[34px] leading-none font-bold text-odul tabular">
              {seviye}
            </span>
          </div>

          {PARCALAR.map((p, i) => (
            <span
              key={i}
              aria-hidden
              className="seviye-parca pointer-events-none absolute top-1/2 left-1/2 rounded-[1px] bg-odul"
              style={
                {
                  width: p.g,
                  height: p.g,
                  "--u": `${p.u}px`,
                  "--v": `${p.v}px`,
                  "--d": `${p.d}deg`,
                  animationDelay: `${p.gecikme}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <div className="seviye-yazi mt-4">
          <div className="etiket-caps text-odul">Seviye atladın</div>
          <div className="mt-1 font-display text-2xl leading-tight font-extrabold">
            {seviye}. seviyedesin
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60">
            {/* ⚠️ "Sen" dili: ürünün oyuncu tarafı baştan sona senli ve
                bir cümlede "seviyeniz" demek kulakta tökezliyor. */}
            {kafeAdi
              ? `${kafeAdi} seviyen yükseldi. Her kafede ayrı ilerliyorsun.`
              : "Bu kafedeki seviyen yükseldi. Her kafede ayrı ilerliyorsun."}
          </p>
        </div>
      </div>
    </div>
  );
}
