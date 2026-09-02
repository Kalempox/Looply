"use client";

import { useEffect, useState } from "react";
import { AlevIkonu } from "./oyuncu-ikon";
import { KartDokusu, kartStili } from "./oyuncu";
import { RENK } from "./oyuncu-renk";

/**
 * Günlük seri sahnesi — Ü66.
 *
 * ── Neden tam ekran ─────────────────────────────────────────
 *
 * Ürün sahibi: *"günlük streakte ekrana animasyonlu tam ekran çark
 * animasyonundaki gibi streak animasyonu gelsin."* Çark sahnesiyle
 * (Ü59) aynı gerekçe: seri günde bir kez konuşulan bir şey ve ana
 * ekranda tek satırlık bir kart olarak durduğunda "kaybedecek bir
 * şeyin var" duygusunu hiç vermiyor.
 *
 * ── Kendiliğinden açılıyor, günde bir kez (Ü68) ─────────────
 *
 * İlk sürümde yalnızca dokununca açılıyordu; gerekçem "her açılışta
 * tam ekran kutlama, kutlamayı engele çevirir" idi. Ürün sahibi
 * düzeltti: *"streak animasyonu da bir anda ekrana gelmeli, girince
 * değil."*
 *
 * Haklı — seri, oyuncunun **fark etmesi gereken** şey; dokunmayı
 * bekleyen bir kutlama kutlama değil, bir bağlantı. Ama her açılışta
 * göstermek de yanlıştı, ikisi birden çözülüyor: sahne **günde bir
 * kez** kendiliğinden açılıyor, sonra kart olarak duruyor ve isteyen
 * yeniden açıyor.
 *
 * Gün damgası `localStorage`'da. Sunucuda tutmak daha sağlam olurdu
 * (cihaz değişince yeniden görünüyor) ama bunun için tek işi "kutlama
 * gösterildi mi" olan bir tablo ve her ana ekran açılışında bir yazma
 * gerekirdi; yanlış tarafa düşen maliyet.
 *
 * ⚠️ Açılış `useEffect` içinde: ilk render sunucuyla aynı (kapalı)
 * olmalı, yoksa hidrasyon uyuşmuyor.
 *
 * ── Katmanlar ───────────────────────────────────────────────
 *
 * Zemin, ışık ve içerik ayrı `absolute inset-0` katmanlar; negatif
 * z-index yok. Çark sahnesinde negatif değer, katmanı ebeveynin kendi
 * zemininin arkasına düşürüp sahneyi saydam bırakmıştı.
 */
export function SeriSahnesi({
  gun,
  riskte,
  bonus,
}: {
  gun: number;
  /** Bugün henüz oynanmadı — seri bugün kırılabilir. */
  riskte: boolean;
  /** Bir sonraki oyunun getireceği seri bonusu. */
  bonus: number;
}) {
  const [acik, setAcik] = useState(false);
  const r = RENK.amber;

  /*
    Günde bir kez kendiliğinden açılış.

    Anahtarda seri günü de var: aynı gün içinde seri büyüyemez ama
    kafe değiştiğinde büyüyebilir ve o zaman kutlama yeniden hak
    edilmiş olur.

    Yarım saniyelik gecikme bilerek: sayfa daha çizilirken açılan bir
    tam ekran, "bir şey ters gitti" gibi duruyor. Kısa bir bekleme onu
    gelen bir kutlamaya çeviriyor.

    ⚠️ **Damga sahne açılırken yazılıyor, kontrol edilirken değil.**

    İlk yazımda okuma ve yazma birlikteydi ve sahne hiç açılmadı.
    Sebep React'ın geliştirme kipindeki çift çağrısı: efekt çalışıyor
    (damga yazılıyor, sayaç kuruluyor) → temizlik çalışıyor (sayaç
    iptal) → efekt yeniden çalışıyor ve bu kez damgayı **kendi
    yazdığını** görüp erken dönüyor. Yazma açılış anına alınınca ikinci
    çağrı da damgayı bulamıyor ve sahne açılıyor; canlıda tek çağrı
    olduğu için davranış aynı.
  */
  useEffect(() => {
    const anahtar = "looply:seri-gosterildi";
    const damga = `${new Date().toDateString()}:${gun}`;

    try {
      if (window.localStorage.getItem(anahtar) === damga) return;
    } catch {
      // Gizli sekmede depolama okunamıyor. Kutlama yine de açılsın:
      // sessizce hiç göstermemek, hatanın oyuncuya yansıması olurdu.
    }

    const zamanlayici = window.setTimeout(() => {
      setAcik(true);
      try {
        window.localStorage.setItem(anahtar, damga);
      } catch {
        // Yazılamadıysa yarın yine açılır — kabul edilebilir.
      }
    }, 500);

    return () => window.clearTimeout(zamanlayici);
  }, [gun]);

  // Sahne açıkken arka plan kaymasın: parmak hareketi altındaki sayfayı
  // kaydırırsa oyuncu sahne kapanınca bambaşka bir yerde buluyor kendini.
  useEffect(() => {
    if (!acik) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = onceki;
    };
  }, [acik]);

  useEffect(() => {
    if (!acik) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcik(false);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [acik]);

  return (
    <>
      {/* ── Sayfadaki kart ────────────────────────────── */}
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="kart-golge kart-gel relative w-full overflow-hidden rounded-3xl px-5 py-5 text-left transition-transform hover:-translate-y-0.5"
        style={
          // Riskteyken kartın kendisi renkleniyor, değilken sakin
          // beyaz kalıyor: rengin işi burada "bugün bir şey yapman
          // gerekiyor" demek, süs değil.
          riskte
            ? kartStili("amber")
            : { background: "var(--color-yuzey)", border: "1px solid var(--color-cizgi)" }
        }
      >
        {riskte && <KartDokusu renk="amber" gorsel="alev" />}

        <span className="relative flex items-center gap-4">
          <span className="shrink-0">
            <AlevIkonu boy={40} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg leading-tight font-bold">
              {gun} gün üst üste
            </span>
            <span
              className="mt-1 block text-[13px] leading-relaxed"
              style={{ color: riskte ? r.koyu : "var(--color-yazi-sonuk)" }}
            >
              {riskte
                ? `Bugün oynamazsan seri sıfırlanır. Oynarsan ${bonus} puan bonus.`
                : `Bugün sayıldı. Yarın da gelirsen ${bonus} puan bonus.`}
            </span>
          </span>
          <span aria-hidden className="text-[18px] text-yazi-sonuk">
            →
          </span>
        </span>
      </button>

      {/* ── Sahne ─────────────────────────────────────── */}
      {acik && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Günlük seri"
          className="sahne-ac fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto px-6 py-8"
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 62%, #7c2d12 0%, #4a1408 48%, #1c0803 100%)",
            }}
          />

          {/* Kıvılcımlar kırpma katmanının içinde: 150 pikselik yükseliş
              sahnenin kaydırma alanını büyütüp içeriği ortadan kaydırıyordu. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {KIVILCIMLAR.map((k, i) => (
              <span
                key={i}
                className="seri-kivilcim absolute rounded-full"
                style={{
                  left: `${k.x}%`,
                  bottom: `${k.alt}%`,
                  width: k.boy,
                  height: k.boy,
                  background: k.renk,
                  animationDelay: `${k.gecikme}ms`,
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAcik(false)}
            aria-label="Kapat"
            className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/12 text-[20px] text-white transition-colors hover:bg-white/22"
          >
            ×
          </button>

          <div className="sahne-cark-gel relative z-10 w-full max-w-[380px] text-center text-white">
            <div className="alev-titre mx-auto w-fit">
              <AlevIkonu boy={124} />
            </div>

            <div className="seri-sayi mt-2">
              <div className="font-data text-7xl leading-none font-bold tabular text-[#fde68a]">
                {gun}
              </div>
              <div className="mt-2 etiket-caps text-white/70">gün üst üste</div>
            </div>

            <Takvim gun={gun} riskte={riskte} />

            <p className="mt-7 text-[15px] leading-relaxed text-white/80">
              {riskte
                ? `Bugün oynamazsan seri sıfırlanır. Bir oyun yeter — üstelik ${bonus} puan bonus.`
                : `Bugün sayıldı. Yarın da gelirsen ${bonus} puan bonus kazanırsın.`}
            </p>

            <button
              type="button"
              onClick={() => setAcik(false)}
              className="mt-7 w-full rounded-xl bg-[#fde68a] py-3.5 font-display text-[16px] font-bold text-[#4a1408]"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Son yedi günün şeridi.
 *
 * Yalnızca sayı göstermek "5 gün" diyor; şerit **kaç gün daha
 * gidebileceğini** de gösteriyor. Yediden uzun seriler yedide
 * kırpılıyor ve başına "+N" konuyor — otuz noktalı bir şerit telefona
 * sığmıyor ve zaten sayılmıyor.
 *
 * Riskteki gün dolu değil, çerçeveli: "bugün henüz yazılmadı".
 */
function Takvim({ gun, riskte }: { gun: number; riskte: boolean }) {
  const gosterilen = Math.min(gun, 7);
  const fazla = gun - gosterilen;

  return (
    <div className="mt-6 flex items-center justify-center gap-1.5">
      {fazla > 0 && (
        <span className="mr-1 font-data text-[12px] font-bold text-white/60 tabular">
          +{fazla}
        </span>
      )}
      {Array.from({ length: gosterilen }, (_, i) => (
        <span
          key={i}
          className="size-3 rounded-full"
          style={{ background: "#fbbf24" }}
        />
      ))}
      {/* Bugünkü boşluk — yalnızca risk varken çiziliyor. */}
      {riskte && (
        <span className="size-3 rounded-full border-2 border-dashed border-white/45" />
      )}
    </div>
  );
}

/**
 * Kıvılcım konumları — sabit.
 *
 * `Math.random()` sunucu ile istemcide farklı değer üretiyor ve React
 * hidrasyonda uyuşmazlık bildiriyor. Aynı hata konfetide de çıkmıştı.
 */
const KIVILCIMLAR = [
  { x: 18, alt: 22, boy: 6, gecikme: 0, renk: "#fbbf24" },
  { x: 30, alt: 16, boy: 4, gecikme: 620, renk: "#fde68a" },
  { x: 44, alt: 26, boy: 5, gecikme: 1180, renk: "#fb923c" },
  { x: 57, alt: 14, boy: 4, gecikme: 340, renk: "#fde68a" },
  { x: 68, alt: 24, boy: 6, gecikme: 1620, renk: "#fbbf24" },
  { x: 80, alt: 18, boy: 4, gecikme: 900, renk: "#fb923c" },
  { x: 12, alt: 30, boy: 3, gecikme: 2040, renk: "#fde68a" },
  { x: 88, alt: 28, boy: 5, gecikme: 1400, renk: "#fbbf24" },
];
