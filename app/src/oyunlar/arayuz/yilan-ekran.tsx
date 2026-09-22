"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  yilan,
  YILAN_EN,
  adimTickiHesapla,
  ODUL_OMRU_ADIM,
  type YilanDurumu,
  type YilanGirdisi,
  type Yon,
} from "../yilan";
import { TICK_MS } from "../sozlesme";
import {
  SNAKE_RENK,
  yilanDuvari,
  yilanDuvarNeonu,
  yilanElmasi,
  yilanGolgesi,
  yilanHalkaKutusu,
  yilanHalkaRengi,
  yilanHalkaTasiyicisi,
  yilanHapi,
  yilanOdulu,
  yilanSahnesi,
  yilanTahtasi,
} from "./yilan-yuzey";
import { useOyunSesi } from "./oyun-ses";
import type { OyunEkraniProps } from "./ortak";

/**
 * Yılan ekranı — Ü215'te `snake.png` referansına göre.
 *
 * ── 🔴 Neden Blok ve Düşen'e benzemiyor ─────────────────────
 *
 * Bilerek. Yılan'ın referansı ayrı bir görsel: parlak çimen, taş
 * duvarlı arena, ışıyan halkalı mavi bir solucan, koyu neon HUD
 * hapları. Blok ile Düşen'in koyu uzay/cam dili buraya gelmiyor.
 *
 * Ölçümler `yilan-yuzey.ts`te. Buradaki iş onları yerleştirmek.
 *
 * ── Ödül tahtanın üstünde (Ü91, Ü92) ────────────────────────
 *
 * Referansta ödül yok; bu bizim mekaniğimiz. Ödül **ayrı bir nesne**:
 * normal yem yerinde duruyor, altın kupon başka bir hücrede beliriyor
 * ve sayılı adım sonra kayboluyor. Ekranın iki işi var — onu ayırt
 * edilebilir kılmak ve **kaçtığını göstermek**.
 *
 * ⚠️ Bu ödül, Blok ve Düşen'deki **teslim paketinden farklı bir şey**
 * ve öyle kalmalı: burada ödül bir **hedef** (oyuncu ona ulaşmak için
 * yön değiştiriyor, `odulIsareti` kancasına bağlı), orada bir
 * **teslimat** (kancaya bağlı değil). İkisini tek kancada toplamak
 * kupon ekonomisini kaydırır (`odul.ts`).
 *
 * ── Saat duvar saatinden (Ü84) ──────────────────────────────
 *
 * Tick sayarak ilerletmek gizli sekmede tarayıcı kısıtlaması yüzünden
 * duruyor ve oyuncu sekmeyi arkaya atıp yılanı dondurabiliyordu.
 */

type Yerel = {
  durum: YilanDurumu;
  girdiler: YilanGirdisi[];
};

/**
 * Kaydırmanın yön sayması için gereken en az mesafe (piksel).
 *
 * ⚠️ Hücre genişliğinin yarısı kadar. Düşen'de eşik tam hücredi çünkü
 * orada her hücre bir hamle; burada kaydırma **yön** veriyor, mesafe
 * değil, o yüzden daha erken tepki vermeli — yılanda geç dönen duvara
 * çarpar.
 */
const KAYDIRMA_ESIGI = 11;

export function YilanEkrani({ tohum, bitti, cik }: OyunEkraniProps) {
  const [y, setY] = useState<Yerel>(() => ({
    durum: yilan.baslat(tohum),
    girdiler: [],
  }));
  const bildirildi = useRef(false);
  /**
   * Şu anki tick — **durumun içinde değil**, Ü214.
   *
   * Durumda dursaydı her 50 ms'de yeni bir durum nesnesi doğar ve
   * ekranda hiçbir şey değişmese bile render tetiklenirdi. Girdi
   * kaydının tick'e ihtiyacı var, render'ın yok.
   */
  const tickRef = useRef(0);
  const ses = useOyunSesi();

  // ── Saat ─────────────────────────────────────────────
  useEffect(() => {
    const baslangic = Date.now();
    const zamanlayici = setInterval(() => {
      const tick = Math.floor((Date.now() - baslangic) / TICK_MS);
      if (tick <= tickRef.current) return;
      tickRef.current = tick;

      setY((p) => {
        if (yilan.bittiMi(p.durum)) return p;
        /*
          🔴 Sıradaki adım bu tick'e gelmediyse motoru HİÇ ÇAĞIRMA —
          Ü214.

          Ölçüldü: motor her `bekle` çağrısında yeni bir durum nesnesi
          döndürüyordu, yani saniyede 20 render oluyor ama bunların
          **%91'inde ekranda hiçbir şey değişmiyordu.** Ürün sahibi
          *"fps çok düşük"* dedi.

          ⚠️ Atlamak güvenli: motorun saati tick aralığına göre
          işliyor, araya girmemek sonucu değiştirmiyor.

          ⚠️ Yılan ilk yön tuşuna kadar yerinde duruyor (Ü91), o
          yüzden `basladi` değilken saatin hiç işi yok.
        */
        if (!p.durum.basladi) return p;
        if (tick < p.durum.sonAdim + p.durum.adimTicki) return p;
        const sonraki = yilan.uygula(p.durum, { tick, y: "bekle" });
        return sonraki ? { ...p, durum: sonraki } : p;
      });
    }, TICK_MS);

    return () => clearInterval(zamanlayici);
  }, []);

  // ── Bitiş bildirimi ──────────────────────────────────
  useEffect(() => {
    if (bildirildi.current || !yilan.bittiMi(y.durum)) return;
    bildirildi.current = true;
    bitti([...y.girdiler, { tick: tickRef.current, y: "bekle" }], yilan.skor(y.durum));
  }, [y, bitti]);

  const cevir = useCallback((yon: Yon) => {
    setY((p) => {
      if (yilan.bittiMi(p.durum)) return p;
      const girdi: YilanGirdisi = { tick: tickRef.current, y: yon };
      const sonraki = yilan.uygula(p.durum, girdi);
      if (!sonraki) return p;
      return { ...p, durum: sonraki, girdiler: [...p.girdiler, girdi] };
    });
  }, []);

  /*
    Sesler efektten, güncelleyicinin içinden DEĞİL.

    ⚠️ Güncelleyici saf kalmak zorunda: React onu StrictMode'da iki kez
    çağırıyor ve içine ses koymak her sesi ikiye katlardı.
  */
  const sonYenen = useRef(0);
  const sonOdul = useRef(0);
  useEffect(() => {
    if (y.durum.odulYakalanan !== sonOdul.current) {
      sonOdul.current = y.durum.odulYakalanan;
      ses.cal("odul");
    } else if (y.durum.yenen !== sonYenen.current) {
      sonYenen.current = y.durum.yenen;
      ses.cal("yerlesti");
    }
  }, [y.durum.yenen, y.durum.odulYakalanan, ses]);

  // ── Klavye (masaüstünde test için) ───────────────────
  useEffect(() => {
    const eslesme: Record<string, Yon> = {
      ArrowUp: "yukari",
      ArrowDown: "asagi",
      ArrowLeft: "sol",
      ArrowRight: "sag",
    };
    const tus = (e: KeyboardEvent) => {
      const yon = eslesme[e.key];
      if (!yon) return;
      e.preventDefault();
      cevir(yon);
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [cevir]);

  /* Parmakla yön — referansın kontrolü de bu (oyun açılışta bir el
     çizip sağa-sola kaydırmayı gösteriyor).

     ⚠️ Çapa her yönde sıfırlanıyor: yılanda arka arkaya iki dönüş
     (sağ→yukarı) sık ve aralarındaki mesafe kısa. Çapa taşınsaydı
     ikinci dönüş için parmağı iki kat uzağa götürmek gerekirdi. */
  const parmak = useRef<{ x: number; y: number } | null>(null);

  const durum = y.durum;
  const kacisi = durum.odulKalanAdim <= 6;
  const adim = 100 / YILAN_EN;

  /*
    Kaydırmanın süresi = bir adımın süresi — Ü216.

    Halka, bir sonraki adım tam geldiğinde hedefine varıyor; ne erken
    durup bekliyor ne de geç kalıp kesiliyor.

    ⚠️ Yılan daha yürümediyse geçiş YOK: ilk yön tuşuna basılana kadar
    duruyor (Ü91) ve o an başlangıç hücresinden kaymaması gerekiyor.
  */
  const gecisMs = durum.basladi ? durum.adimTicki * TICK_MS : 0;

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={yilanSahnesi()}>
      {/* ── Üst şerit ───────────────────────────────
          Referansın HUD'u üç yuvarlak hap: solda elma + sayı, ortada
          taç + skor, sağda duraklat. Bizde "duraklat" yerine çıkış ve
          ses var — duraklatma mekaniği yok ve olmayan bir düğme
          çizmek verilmemiş bir söz olurdu. */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-3 pb-1">
        <span className="flex items-center gap-2 py-1.5 pr-4 pl-2" style={yilanHapi()}>
          <span className="block size-[20px]" style={yilanElmasi()} />
          <span className="font-display text-[18px] leading-none font-bold text-white tabular">
            {durum.yenen}
          </span>
        </span>

        <span className="flex items-center gap-2 py-1.5 pr-4 pl-2.5" style={yilanHapi()}>
          <svg width="20" height="16" viewBox="0 0 24 19" aria-hidden>
            <path
              d="M2 5.5 6.5 9 12 1.5 17.5 9 22 5.5 20 17H4L2 5.5Z"
              fill={SNAKE_RENK.tac}
              stroke="#C99A0B"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
          <span className="flex flex-col">
            <span className="font-display text-[8px] leading-none font-bold tracking-[0.16em] text-white/55 uppercase">
              Skor
            </span>
            {/* `key` skorla değişiyor ki her artışta animasyon koşsun. */}
            <span
              key={durum.skor}
              className="dusen-skor mt-0.5 font-display text-[18px] leading-none font-bold text-white tabular"
            >
              {durum.skor.toLocaleString("tr-TR")}
            </span>
          </span>
        </span>

        <span className="flex items-center" style={yilanHapi()}>
          <SesDugmesi acik={ses.acik} degistir={ses.degistir} />
          {cik && (
            <button
              type="button"
              onClick={cik}
              aria-label="Çık"
              className="flex size-9 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </span>
      </div>

      {/* ── Tahta ───────────────────────────────────
          Kare ve genişlikten boyutlanıyor; referansta da alan
          çerçevesiz, etrafı sadece dış zemin. */}
      <div
        className="flex min-h-0 flex-1 items-center justify-center p-3"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          parmak.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const p = parmak.current;
          if (!p) return;
          const dx = e.clientX - p.x;
          const dy = e.clientY - p.y;
          if (Math.abs(dx) < KAYDIRMA_ESIGI && Math.abs(dy) < KAYDIRMA_ESIGI) return;
          // Baskın eksen kazanıyor: çapraz kaydırmada iki yön birden
          // göndermek yılanı ters çevirmeye çalışmak olurdu.
          cevir(
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0
                ? "sag"
                : "sol"
              : dy > 0
                ? "asagi"
                : "yukari",
          );
          parmak.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => {
          parmak.current = null;
        }}
        onPointerCancel={() => {
          parmak.current = null;
        }}
      >
        <div
          className="relative aspect-square h-auto max-h-full w-full max-w-[min(100%,calc(100dvh-240px))]"
          style={yilanDuvari()}
        >
          {/* Duvardaki ışıklı şeritler — dört kenarın ortasında. */}
          <span aria-hidden style={{ ...yilanDuvarNeonu(true), top: 4 }} />
          <span aria-hidden style={{ ...yilanDuvarNeonu(true), bottom: 4 }} />
          <span aria-hidden style={{ ...yilanDuvarNeonu(false), left: 4 }} />
          <span aria-hidden style={{ ...yilanDuvarNeonu(false), right: 4 }} />

          <div className="relative h-full w-full overflow-hidden" style={yilanTahtasi()}>
            {/* Elma */}
            <span
              aria-hidden
              className="absolute"
              style={{
                ...yilanElmasi(),
                left: `${((durum.yem % YILAN_EN) + 0.5) * adim}%`,
                top: `${(Math.floor(durum.yem / YILAN_EN) + 0.5) * adim}%`,
                width: `${adim * 0.78}%`,
                height: `${adim * 0.78}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Yaprak — elmayı meyveye çeviren tek detay. */}
              <span
                className="absolute"
                style={{
                  left: "60%",
                  top: "-20%",
                  width: "48%",
                  height: "32%",
                  background: SNAKE_RENK.yaprak,
                  borderRadius: "0 100% 0 100%",
                  transform: "rotate(-18deg)",
                }}
              />
            </span>

            {/* Ödül kuponu */}
            {durum.odul !== null && (
              <span
                aria-hidden
                className="nabiz absolute"
                style={{
                  ...yilanOdulu(kacisi),
                  left: `${((durum.odul % YILAN_EN) + 0.5) * adim}%`,
                  top: `${(Math.floor(durum.odul / YILAN_EN) + 0.5) * adim}%`,
                  width: `${adim * 0.88}%`,
                  height: `${adim * 0.88}%`,
                  transform: "translate(-50%, -50%)",
                  opacity: kacisi ? 0.45 + durum.odulKalanAdim * 0.09 : 1,
                }}
              />
            )}

            {/* ── Solucan ───────────────────────────
                🔴 Tek katman, tek `drop-shadow`. Halka başına gölge
                verilseydi örtüşen yerlerde de görünür ve zincir kirli
                dururdu.

                ⚠️ Halkalar **ters sırada** çiziliyor: kuyruk önce, baş
                en sonra. Böylece baş üstte kalıyor ve gözler boyun
                halkasının altında kaybolmuyor. */}
            <div aria-hidden className="absolute inset-0" style={yilanGolgesi()}>
              {[...durum.govde].reverse().map((hucre, tersSira) => {
                const sira = durum.govde.length - 1 - tersSira;
                return (
                  /*
                    🔴 Anahtar **SIRA**, hücre değil — Ü216.

                    Hücre anahtarıyla her adımda React ögeleri yok edip
                    yeniden yaratıyordu; yok edilen bir ögenin geçişi
                    olmaz, yılan ışınlanırdı. Sıra anahtarıyla segment
                    ömrü boyunca **aynı DOM ögesi** kalıyor ve yalnızca
                    `transform`u değişiyor — tarayıcı arayı dolduruyor.

                    ⚠️ Baş EN SONRA çiziliyor (dizi ters), yoksa boyun
                    halkası gözlerin üstüne biner.
                  */
                  <span
                    key={sira}
                    style={yilanHalkaTasiyicisi(
                      Math.floor(hucre / YILAN_EN),
                      hucre % YILAN_EN,
                      gecisMs,
                    )}
                  >
                    <span
                      style={{ ...yilanHalkaKutusu(), ...yilanHalkaRengi(sira === 0) }}
                    >
                      {sira === 0 && <Gozler yon={durum.yon} />}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Alt şerit ───────────────────────────────
          Üç hâlden biri; üçü de aynı yüksekliği kaplıyor ki biri
          diğerine dönünce tahta zıplamasın. Yer değiştiren bir tahta
          oyuncunun hamlesini kaçırtır. */}
      <div className="flex h-[52px] shrink-0 items-center justify-center px-3 pb-1">
        {!durum.basladi ? (
          <span className="px-4 py-2 text-center text-[13px] font-semibold text-white" style={yilanHapi()}>
            Başlamak için parmağını bir yöne kaydır
          </span>
        ) : durum.odul !== null ? (
          <div
            className="flex w-full items-center gap-3 px-3.5 py-2"
            style={yilanHapi()}
          >
            <span className="text-[18px] leading-none">🎟️</span>
            <span className="flex-1">
              <span className="block font-display text-[12px] leading-none font-bold tracking-wide text-white uppercase">
                Ödül tahtada · yetiş
              </span>
              <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full bg-black/25">
                <span
                  className="block h-full rounded-full transition-[width] duration-150 ease-linear"
                  style={{
                    width: `${(durum.odulKalanAdim / ODUL_OMRU_ADIM) * 100}%`,
                    background: kacisi ? "#FF9A5A" : "#FFD75E",
                  }}
                />
              </span>
            </span>
          </div>
        ) : (
          <span className="px-4 py-2 text-center text-[13px] font-semibold text-white/80" style={yilanHapi()}>
            Parmağını kaydır · elmayı ye, uza
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Başın gözleri — referansın en karakterli detayı.
 *
 * Google'ın yılanının yüzü iki iri beyaz göz ve koyu bebeklerden
 * ibaret. Onsuz gövde bir şerit, onunla bir canlı.
 *
 * ⚠️ Gözler yöne göre yer değiştiriyor: baş hangi yöne gidiyorsa
 * gözler o kenara kayıyor ve bebekler bir tık daha ileri bakıyor.
 * Sabit dursalardı yılan yan yan yürüyormuş gibi görünürdü.
 *
 * ⚠️ Göz başın %34'ü, bebek gözün %46'sı. Daha küçüğü 24 piksellik
 * hücrede lekeye dönüşüyor — aynı sınır Düşen'in 🎁 rozetinde de
 * ölçülmüştü (Ü209).
 */
function Gozler({ yon }: { yon: Yon }) {
  /** [göz1 x, y, göz2 x, y, bebeğin kayması x, y] — yüzde. */
  const yer: Record<Yon, [number, number, number, number, number, number]> = {
    sag: [66, 28, 66, 72, 16, 0],
    sol: [34, 28, 34, 72, -16, 0],
    yukari: [28, 34, 72, 34, 0, -16],
    asagi: [28, 66, 72, 66, 0, 16],
  };
  const [x1, y1, x2, y2, bx, by] = yer[yon];

  return (
    <>
      {[
        [x1, y1],
        [x2, y2],
      ].map(([x, yz], i) => (
        <span
          key={i}
          className="absolute grid place-items-center rounded-full bg-white"
          style={{
            left: `${x}%`,
            top: `${yz}%`,
            width: "34%",
            height: "34%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            className="block rounded-full"
            style={{
              width: "46%",
              height: "46%",
              background: "#17255A",
              transform: `translate(${bx}%, ${by}%)`,
            }}
          />
        </span>
      ))}
    </>
  );
}

/**
 * Hoparlör — Ü205'te eklendi, Ü206'da belirginleşti.
 *
 * ⚠️ Referansın dilinde: düz beyaz simge, panel yok. Blok ve
 * Düşen'deki neon çerçeveli hap buraya gelseydi iki dil aynı ekranda
 * çarpışırdı.
 */
function SesDugmesi({ acik, degistir }: { acik: boolean; degistir: () => void }) {
  return (
    <button
      type="button"
      onClick={degistir}
      aria-pressed={acik}
      aria-label={acik ? "Sesi kapat" : "Sesi aç"}
      className="flex size-9 items-center justify-center rounded-full transition-colors"
      style={{
        background: acik ? "rgba(95,216,255,.28)" : "transparent",
        color: acik ? "#fff" : "rgba(255,255,255,.62)",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z" fill="currentColor" />
        {acik ? (
          <>
            <path d="M15.6 9.2a4 4 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            <path d="M18.1 6.8a7.5 7.5 0 0 1 0 10.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </>
        ) : (
          <path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}

export { adimTickiHesapla };
