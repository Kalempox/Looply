"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  kirici,
  kiriciDuvarUstu,
  kiriciPaletEni,
  KIRICI_EN,
  KIRICI_OLCEK,
  KIRICI_SATIR,
  type KiriciDurumu,
  type KiriciGirdisi,
} from "../kirici";
import { TICK_MS } from "../sozlesme";
import {
  kiriciCerceve,
  kiriciOdulu,
  kiriciPaleti,
  kiriciPanel,
  kiriciSahnesi,
  kiriciTehlike,
  kiriciTopu,
  kiriciTuglasi,
} from "./kirici-yuzey";
import { useOyunSesi } from "./oyun-ses";
import { useOdulPaketi, type OyunEkraniProps } from "./ortak";

const { GENISLIK, YUKSEKLIK, TOP_R, TUGLA_BOY, TUGLA_PAY, PALET_Y, PALET_BOY } =
  KIRICI_OLCEK;

/**
 * Blok Kırıcı ekranı — Ü244.
 *
 * ── 🔴 Motor ref'te, React'te değil ─────────────────────────
 *
 * Ü214'ün dersi burada ailenin en sert hâlinde: top saniyede 20 kez
 * yer değiştiriyor ve her tick bir `setState` olsaydı **saniyede 20
 * kez bütün tuğla duvarı** yeniden render edilirdi.
 *
 * Yetkili durum bir ref'te tutuluyor ve `requestAnimationFrame`
 * içinde ilerletiliyor. React'e yalnızca **görünen bir şey
 * değişince** haber veriliyor: tuğla kırıldı, skor arttı, bölüm
 * değişti, tur bitti. Topun ve paletin yeri DOM'a doğrudan
 * yazılıyor (`style.transform`), tıpkı Bıçak'ta kütüğün açısı gibi.
 *
 * ── 🔴 Girdi kaydı BİRLEŞTİRİLİYOR ──────────────────────────
 *
 * Motor her tick çağrılıyor ama kayda her tick yazılmıyor — yazılsa
 * saniyede 20 girdi olurdu ve `EN_FAZLA_GIRDI` (5.000) **dört
 * dakikada** dolardı. Ölçülen tur süresi 52–183 saniye, yani sınır
 * gerçekten bağlayıcı olurdu.
 *
 * Birleştirme şu değişmeze dayanıyor: `uygula`nın `{t, x}` anlamı
 * *"(sonTick, t] aralığındaki her tick'te hedef x"*. Parmak
 * kıpırdamadıysa aynı `x` ile n kez tek tick ilerletmekle bir kez n
 * tick ilerletmek **birebir aynı durumu** veriyor — döngü gövdesi
 * aynı, `hedef` aynı. Bu yüzden hedef değişmedikçe son girdinin `t`
 * değeri uzatılıyor, yeni girdi yazılmıyor.
 *
 * ⚠️ Uzatmanın bir tavanı var (`EN_UZUN_PARCA`): motor iki girdi
 * arasında `EN_FAZLA_BEKLEME`den uzun boşluk kabul etmiyor ve
 * parmağını hiç kıpırdatmayan oyuncunun kaydı sunucuda
 * reddedilirdi.
 *
 * ── 🔴 Motoru `setInterval` sürüyor, rAF DEĞİL ──────────────
 *
 * İlk yazımda ikisini de rAF yapıyordum ve **ölçüldü ki kırılıyor**:
 * önizleme sekmesi arkaya düşünce rAF tamamen durdu, 25 saniyelik
 * gerçek sürede yalnızca 38 tick işlendi ve sunucu turu reddetti —
 * *"Kayıt doğrulanamadı."*
 *
 * Sebep Ü84'ün saat denetimi ve denetim **doğru** çalışıyordu:
 * oyunun bildirdiği süre (1,9 sn) gerçek sürenin yarısının altında
 * kaldı, yani ağır çekim oynanmış gibi göründü. Aynı şey uygulamayı
 * arka plana atan gerçek bir oyuncunun başına da gelirdi.
 *
 * Fark şurada: tarayıcı gizli sekmede `setInterval`i **kısıyor**
 * (Düşen'de ölçülmüş: saniyede 20 yerine ~1,5) ama rAF'i tamamen
 * **durduruyor**. Kısılan sayaç `Date.now()`tan tick türettiği için
 * dönüşte kaldığı yeri yakalıyor; duran rAF hiç türetemiyor.
 *
 * ⚠️ Bıçak rAF kullanıyor ve etkilenmiyor: orada saat yalnızca
 * dokunuşta ilerliyor ve `sonTick` dokunuş anındaki `Date.now()`tan
 * geliyor, yani oyun saati duvar saatinden hiç ayrılmıyor. Burada
 * top kendi kendine gidiyor — saati yürüten şey döngünün kendisi.
 *
 * ── Çizim motorun bir tick gerisini yumuşatıyor ─────────────
 *
 * Top 20 Hz'de yer değiştiriyor; olduğu gibi çizilse ekranda
 * sıçrardı. rAF bu yüzden duruyor ama artık **yalnızca çiziyor**:
 * kare arasında hızla ara değer veriliyor ve sonuç duvarların içine
 * kırpılıyor — çarpışmanın tam anında topun duvarı bir tick aşmış
 * görünmesi tek görünür sapma olurdu.
 */

/** Hedef bu kadar birimlik kovalara yuvarlanıyor — kayıt için. */
const KOVA = 50;

/**
 * Tek bir girdinin kapsayabileceği en fazla tick.
 *
 * ⚠️ Motorun `EN_FAZLA_BEKLEME` sınırının (600) altında olmalı,
 * yoksa hiç kıpırdamayan parmağın kaydı sunucuda reddedilir. 200
 * tick = 10 saniye; güvenli pay.
 */
const EN_UZUN_PARCA = 200;

type Yerel = {
  durum: KiriciDurumu;
  /** Ekranın yeniden çizilmesini gerektiren şeylerin imzası. */
  imza: string;
};

/** React'in görmesi gereken her şey — değişmediyse render yok. */
function imzala(d: KiriciDurumu): string {
  return `${d.tur}|${d.skor}|${d.kalan}|${d.bitti}|${d.odulHucre}|${d.tuglalar.join("")}`;
}

export function KiriciEkrani({ tohum, bitti, kazandirir, odul, cik }: OyunEkraniProps) {
  const [y, setY] = useState<Yerel>(() => {
    const durum = kirici.baslat(tohum);
    return { durum, imza: imzala(durum) };
  });
  const ses = useOyunSesi();
  const bildirildi = useRef(false);

  /** Yetkili durum — rAF bunu ilerletiyor, React yalnızca izliyor. */
  const motor = useRef<KiriciDurumu>(y.durum);
  const girdiler = useRef<KiriciGirdisi[]>([]);
  /** Parmağın istediği yer, tahta birimiyle. */
  const hedef = useRef(Math.floor(GENISLIK / 2));
  const baslangic = useRef(0);

  const topRef = useRef<HTMLSpanElement>(null);
  const paletRef = useRef<HTMLSpanElement>(null);
  const duvarRef = useRef<HTMLDivElement>(null);
  const tehlikeRef = useRef<HTMLSpanElement>(null);
  const alanRef = useRef<HTMLDivElement>(null);

  /** Girdiyi kaydeder — değişmediyse son parçayı uzatır. */
  const kaydet = useCallback((t: number, x: number) => {
    const kayit = girdiler.current;
    const son = kayit[kayit.length - 1];
    if (son && son.x === x && t - son.t < EN_UZUN_PARCA) {
      son.t = t;
      return;
    }
    kayit.push({ t, x });
  }, []);

  // ── Motor: tick sayacı ───────────────────────────────
  useEffect(() => {
    baslangic.current = Date.now();
    const sayac = setInterval(() => {
      const d = motor.current;
      if (d.bitti) return;
      const t = Math.floor((Date.now() - baslangic.current) / TICK_MS);
      /* ⚠️ Tick tick ilerletiliyor, tek hamlede değil: kayıt
         birleştirmesinin geçerli olması için istemcinin de sunucunun
         da aynı adımları atması gerekiyor. Sekme arkaya düşüp geri
         gelirse buradaki döngü aradaki tick'leri **yakalıyor** ve
         oyun saati duvar saatine yetişiyor. */
      for (let n = d.tick; n < t; n++) {
        const x = Math.round(hedef.current / KOVA) * KOVA;
        const sonraki = kirici.uygula(motor.current, { t: n + 1, x });
        if (!sonraki) break;
        motor.current = sonraki;
        kaydet(n + 1, x);
        if (sonraki.bitti) break;
      }
      const s = motor.current;
      if (s !== d) {
        const yeni = imzala(s);
        setY((p) => (p.imza === yeni ? p : { durum: s, imza: yeni }));
      }
    }, TICK_MS);
    return () => clearInterval(sayac);
  }, [kaydet]);

  // ── Çizim ────────────────────────────────────────────
  useEffect(() => {
    let kare = 0;
    const ciz = () => {
      kare = requestAnimationFrame(ciz);
      const gecen = (Date.now() - baslangic.current) / TICK_MS;

      const s = motor.current;

      /*
        🔴 Yerler **yüzde**, piksel değil.

        İlk yazımda rAF `clientWidth`/`clientHeight` okuyup piksel
        yazıyordu ve iki şeyi birden bozuyordu:

          · Ölçüm: ilk boyamada palet **sıfır genişlikte ve sol
            kenarda** duruyordu, çünkü genişliği de yerini de yalnızca
            rAF veriyordu ve ilk kare henüz koşmamıştı.
          · Her karede düzen okumak tarayıcıyı yeniden hesap yapmaya
            zorluyordu.

        Yüzdeyle ikisi de kalkıyor: React aynı değeri ilk render'da
        yazabiliyor (kare kaçırılsa bile ekran doğru) ve rAF hiçbir
        düzen okumuyor.

        ⚠️ `translateY` yüzdesi **ögenin kendi boyuna** göre; duvar
        katmanı `inset-0` olduğu için boyu tahtanın boyu ve oran
        tutuyor.
      */
      const pay = s.bitti ? 0 : Math.max(0, Math.min(1, gecen - s.tick));
      const tx = Math.max(TOP_R, Math.min(GENISLIK - TOP_R, s.topX + s.vx * pay));
      const ty = Math.max(TOP_R, Math.min(YUKSEKLIK, s.topY + s.vy * pay));

      /*
        🔴 Ü275: `left/top` DEĞİL, `transform` — ürün sahibi *"tüm
        oyunlar takılıyor, donuyor."* `left/top` her karede düzen ve
        boyama demekti; iPhone Safari boyamayı işlemcide yapıyor ve
        tuğla duvarı topun geçtiği her karede yeniden çiziliyordu.
        `transform` yalnızca katmanı kaydırıyor (bkz. `topYeri`).
      */
      if (topRef.current) topRef.current.style.transform = topYeri(tx, ty);
      if (paletRef.current) {
        paletRef.current.style.transform = paletYeri(s.palet, kiriciPaletEni(s.tur));
      }
      const duvar = kiriciDuvarUstu(s, s.tick);
      if (duvarRef.current) {
        duvarRef.current.style.transform = `translateY(${(duvar / YUKSEKLIK) * 100}%)`;
      }
      if (tehlikeRef.current) {
        /* Duvarın altı palete ne kadar yaklaştı — 0'dan 1'e. */
        const dip = duvar + KIRICI_SATIR * TUGLA_BOY;
        const yakin = Math.max(0, Math.min(1, (dip - (PALET_Y - 3500)) / 3500));
        tehlikeRef.current.style.opacity = `${yakin}`;
      }
    };
    kare = requestAnimationFrame(ciz);
    return () => cancelAnimationFrame(kare);
  }, []);

  // ── Bitiş bildirimi ──────────────────────────────────
  useEffect(() => {
    if (bildirildi.current || !kirici.bittiMi(y.durum)) return;
    bildirildi.current = true;
    bitti(girdiler.current, kirici.skor(y.durum));
  }, [y, bitti]);

  // ── Sesler ───────────────────────────────────────────
  const sonKalan = useRef(y.durum.kalan);
  const sonTur = useRef(1);
  // Ü275: ödül sesi yalnızca ödül varken — izinsiz paket sıradan parça.
  const odulIzinli = kazandirir === true && odul?.izin === true;
  const sonOdul = useRef(false);
  useEffect(() => {
    const d = y.durum;
    if (d.bitti) {
      ses.cal("gecersiz");
      return;
    }
    if (d.odulVerildi && !sonOdul.current) {
      sonOdul.current = true;
      ses.cal(odulIzinli ? "odul" : "yerlesti");
    } else if (d.tur !== sonTur.current) {
      sonTur.current = d.tur;
      ses.cal("temizlik");
    } else if (d.kalan !== sonKalan.current) {
      ses.cal("yerlesti");
    }
    sonKalan.current = d.kalan;
  }, [y.durum, odulIzinli, ses]);

  /** Parmağın ekrandaki yerini tahta birimine çevirir. */
  const nokta = useCallback((istemciX: number) => {
    const alan = alanRef.current;
    if (!alan) return;
    const kutu = alan.getBoundingClientRect();
    if (kutu.width === 0) return;
    hedef.current = Math.round(((istemciX - kutu.left) / kutu.width) * GENISLIK);
  }, []);

  // ── Klavye (masaüstünde test için) ───────────────────
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if ((e.target as HTMLElement | null)?.closest("button")) return;
      e.preventDefault();
      const adim = e.key === "ArrowLeft" ? -700 : 700;
      hedef.current = Math.max(0, Math.min(GENISLIK, hedef.current + adim));
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, []);

  const durum = y.durum;
  // Ü275 · "görünürse kesin": paket ödül olarak yalnızca sunucu "evet"
  // dediyse çiziliyor; "hayır"da sıradan parça (Ü207'deki gibi).
  const paketVar = useOdulPaketi(
    odul,
    kazandirir,
    durum.odulHucre !== null,
    () => girdiler.current,
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={kiriciSahnesi()}>
      {/* ── Üst şerit — ailenin HUD'u ──────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-3 pb-1">
        <span className="flex items-center gap-2 px-3.5 py-1.5" style={kiriciPanel()}>
          <span className="font-display text-[8px] leading-none font-bold tracking-[0.16em] text-white/55 uppercase">
            Bölüm
          </span>
          <span className="font-display text-[18px] leading-none font-bold text-white tabular">
            {durum.tur}
          </span>
        </span>

        <span className="flex items-center gap-2 px-3.5 py-1.5" style={kiriciPanel()}>
          <span className="flex flex-col">
            <span className="font-display text-[8px] leading-none font-bold tracking-[0.16em] text-white/55 uppercase">
              Skor
            </span>
            <span
              key={durum.skor}
              className="dusen-skor mt-0.5 font-display text-[18px] leading-none font-bold text-white tabular"
            >
              {durum.skor.toLocaleString("tr-TR")}
            </span>
          </span>
        </span>

        <span className="flex items-center" style={kiriciPanel()}>
          <SesDugmesi acik={ses.acik} degistir={ses.degistir} />
          {cik && (
            <button
              type="button"
              onClick={cik}
              aria-label="Çık"
              className="flex size-9 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </span>
      </div>

      {/* ── Oyun alanı ─────────────────────────────
          ⚠️ `<button>` DEĞİL, `role="button"`: düğmenin içerik modeli
          yalnızca metin düzeyi öge kabul ediyor ve alanın içinde
          konumlandırılmış onlarca katman var. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 py-1">
        <div
          ref={alanRef}
          role="button"
          tabIndex={0}
          aria-label="Paleti kaydır"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            nokta(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0 && e.pointerType === "mouse") return;
            nokta(e.clientX);
          }}
          className="relative cursor-pointer overflow-hidden select-none"
          /*
            🔴 `aspect-ratio` DEĞİL, iki `min()` — ve sebebi ölçüldü.

            İlk yazımda `aspectRatio: "9 / 10"` + `height: 100%` +
            `maxWidth: 100%` vardı. Telefonda tahta 360×730 çıktı,
            yani oran 0,49 — hedefin yarısı. CSS'in kuralı gereği
            yükseklik kesinken `max-width` genişliği kırpıyor ve oran
            sessizce iptal oluyor.

            İki `min()` bunu kapatıyor: hangi terim bağlarsa bağlasın
            genişlik/yükseklik = 9/10 kalıyor (106,67vw = 96vw × 10/9,
            84,44dvh = 76dvh × 10/9). Aynı desen Bıçak'ta da var.

            ⚠️ Oran bozulursa oyun bozulur, yalnızca çirkinleşmez:
            top yüzdeyle çiziliyor ve dikdörtgen bir kutuda daire
            elips olur, tuğla ile top ölçüleri ayrışır.
          */
          style={{
            ...kiriciCerceve(),
            width: "min(96vw, 76dvh)",
            height: "min(106.67vw, 84.44dvh)",
            touchAction: "none",
          }}
        >
          {/* Tuğla duvarı — tek katman, rAF `translateY` yazıyor.
              ⚠️ İçindeki tuğlalar duvara GÖRE konumlanıyor; duvar
              indiğinde React'in hiçbir şeyi yeniden çizmesi gerekmiyor. */}
          {/* ⚠️ `inset-0`, `top-0` DEĞİL: içindeki tuğlalar yüzdeyle
              konumlanıyor ve yüzde **kapsayıcının boyuna** göre
              hesaplanıyor. Boysuz bir kapsayıcıda her tuğla
              `top: 0`da toplanıyordu — ilk denemede duvar ekranda
              hiç görünmedi. */}
          <div
            ref={duvarRef}
            className="absolute inset-0"
            style={{
              transform: `translateY(${(kiriciDuvarUstu(durum, durum.tick) / YUKSEKLIK) * 100}%)`,
              /* Ü275: duvar her karede iniyor — kendi katmanında,
                 tuğlalar bir kez boyanıp katmanla birlikte kayıyor. */
              willChange: "transform",
            }}
          >
            {durum.tuglalar.map((can, hucre) =>
              can <= 0 ? null : (
                <span
                  key={hucre}
                  aria-hidden
                  className="absolute"
                  style={{
                    ...(paketVar && durum.odulHucre === hucre
                      ? kiriciOdulu()
                      : kiriciTuglasi(can)),
                    left: `${((hucre % KIRICI_EN) * KIRICI_OLCEK.BIRIM + TUGLA_PAY) / GENISLIK * 100}%`,
                    width: `${((KIRICI_OLCEK.BIRIM - TUGLA_PAY * 2) / GENISLIK) * 100}%`,
                    top: `${(Math.floor(hucre / KIRICI_EN) * TUGLA_BOY + TUGLA_PAY / 2) / YUKSEKLIK * 100}%`,
                    height: `${((TUGLA_BOY - TUGLA_PAY) / YUKSEKLIK) * 100}%`,
                  }}
                />
              ),
            )}
          </div>

          {/* Tehlike perdesi — duvar palete yaklaştıkça beliriyor. */}
          <span
            ref={tehlikeRef}
            aria-hidden
            className="pointer-events-none absolute inset-x-0"
            style={{
              ...kiriciTehlike(1),
              top: `${((PALET_Y - 3500) / YUKSEKLIK) * 100}%`,
              height: `${(3500 / YUKSEKLIK) * 100}%`,
              opacity: 0,
              willChange: "opacity",
            }}
          />

          {/* Top — ilk yeri React'ten, sonrası rAF'ten. */}
          <span
            ref={topRef}
            aria-hidden
            className="absolute"
            style={{
              ...kiriciTopu(),
              width: `${((TOP_R * 2) / GENISLIK) * 100}%`,
              aspectRatio: "1",
              left: 0,
              top: 0,
              transform: topYeri(durum.topX, durum.topY),
              willChange: "transform",
            }}
          />

          {/* Palet — genişliği React'ten (bölümde bir kez değişiyor),
              yeri rAF'ten. */}
          <span
            ref={paletRef}
            aria-hidden
            className="absolute"
            style={{
              ...kiriciPaleti(),
              top: `${(PALET_Y / YUKSEKLIK) * 100}%`,
              height: `${(PALET_BOY / YUKSEKLIK) * 100}%`,
              width: `${(kiriciPaletEni(durum.tur) / GENISLIK) * 100}%`,
              left: 0,
              transform: paletYeri(durum.palet, kiriciPaletEni(durum.tur)),
              willChange: "transform",
            }}
          />
        </div>
      </div>

      {/* ── Alt şerit ───────────────────────────────
          Tek satırlık yönerge; iki hâl de aynı yüksekliği kaplıyor ki
          biri diğerine dönünce alan zıplamasın. */}
      <div className="flex h-[42px] shrink-0 items-center justify-center px-3 pb-1">
        <span className="text-[12px] leading-none font-semibold text-white/70">
          {durum.tur === 1 && durum.skor === 0
            ? "Parmağını kaydır · topu tut"
            : "Duvar iniyor — tuğlaları hızlı kır"}
        </span>
      </div>
    </div>
  );
}

/** Hoparlör — ailenin koyu arcade ekranlarıyla aynı hap içinde. */
function SesDugmesi({ acik, degistir }: { acik: boolean; degistir: () => void }) {
  return (
    <button
      type="button"
      onClick={degistir}
      aria-pressed={acik}
      aria-label={acik ? "Sesi kapat" : "Sesi aç"}
      className="flex size-9 items-center justify-center rounded-full transition-colors"
      style={{
        background: acik ? "rgba(251,191,36,.20)" : "transparent",
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

/**
 * Topun yeri — `transform` olarak (Ü275).
 *
 * Top tahtanın sol-üst köşesinde duruyor ve kendi boyuna göre yüzdeyle
 * kaydırılıyor: top 2R birim, `x / 2R` kat kaydırmak onu x birimine
 * götürüyor; `- 0.5` merkezini oraya oturtuyor. Tahta 9:10 ve birimler
 * iki eksende aynı piksele denk geliyor (yukarıdaki oran notu).
 */
function topYeri(x: number, y: number): string {
  return `translate3d(${(x / (TOP_R * 2) - 0.5) * 100}%, ${(y / (TOP_R * 2) - 0.5) * 100}%, 0)`;
}

/** Paletin yeri — merkezi `x`te, genişliği `en` birim (Ü275). */
function paletYeri(x: number, en: number): string {
  return `translate3d(${(x / en - 0.5) * 100}%, 0, 0)`;
}
