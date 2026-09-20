"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Blok'un sesleri — Ü205.
 *
 * ── 🔴 Neden dosya yok ──────────────────────────────────────
 *
 * Dört kısa ses için dört dosya indirmek, kafede mobil veriyle açılan
 * bir sayfada gereksiz bir bedel. Hepsi WebAudio ile **çalışma
 * zamanında üretiliyor**: osilatör, gürültü tamponu ve filtre. Ürüne
 * eklenen bayt sayısı sıfır.
 *
 * Aynı gerekçe ödül açılışında da kullanılmıştı (Ü56): Lottie yerine
 * CSS. Kütüphane ve varlık, ancak kendi ağırlığını hak ettiğinde
 * geliyor.
 *
 * ── 🔴 Neden SESSİZ başlıyor ────────────────────────────────
 *
 * Ürün sahibi *"sesleri yap, dediğin gibi sessiz başlasın"* dedi ve
 * gerekçe ürünün kendisinde: burası bir **kafe**. Masada oturan biri
 * karekodu okutuyor ve telefonundan habersizce "tok–whoosh" sesleri
 * çıkıyor; yanındaki masa da duyuyor. Varsayılan açık olsaydı ilk
 * yaptığı şey oyunu kapatmak olurdu.
 *
 * Tercih tarayıcıda saklanıyor: bir kez açan oyuncu her turda yeniden
 * açmak zorunda kalmıyor.
 *
 * ── ⚠️ AudioContext ancak DOKUNUŞTAN SONRA kurulabiliyor ────
 *
 * Tarayıcılar kullanıcı hareketi olmadan ses bağlamı başlatmıyor
 * (otomatik oynatma kısıtı). Sessiz başlamak bunu kendiliğinden
 * çözüyor: bağlam, oyuncu hoparlör düğmesine bastığında kuruluyor —
 * yani zaten bir dokunuş var. iOS'ta ayrıca `resume()` gerekiyor.
 */

export type SesAdi = "yerlesti" | "gecersiz" | "temizlik" | "kombo" | "odul";

const ANAHTAR = "looply:blok-ses";

/**
 * Ana ses seviyesi.
 *
 * ⚠️ Kasten düşük. Burası kafe; sesin işi oyuncuya dokunuşunun
 * karşılığını vermek, masaya duyurmak değil.
 */
const SES_SEVIYESI = 0.16;

/** Gürültü tamponu — "whoosh" bundan süzülüyor. Bir kez üretiliyor. */
function gurultuTamponu(ctx: AudioContext): AudioBuffer {
  const uzunluk = Math.floor(ctx.sampleRate * 0.4);
  const tampon = ctx.createBuffer(1, uzunluk, ctx.sampleRate);
  const veri = tampon.getChannelData(0);
  for (let i = 0; i < uzunluk; i++) {
    // Sönümlü beyaz gürültü: sonu kendiliğinden kısılıyor.
    veri[i] = (Math.random() * 2 - 1) * (1 - i / uzunluk);
  }
  return tampon;
}

/** Tek bir ton — biçim, frekans, süre ve zarf. */
function ton(
  ctx: AudioContext,
  cikis: GainNode,
  opts: {
    tip: OscillatorType;
    hz: number;
    /** Varsa sonunda bu frekansa kayıyor. */
    hzSon?: number;
    baslangic: number;
    sure: number;
    seviye: number;
  },
) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = opts.tip;
  o.frequency.setValueAtTime(opts.hz, opts.baslangic);
  if (opts.hzSon !== undefined) {
    o.frequency.exponentialRampToValueAtTime(opts.hzSon, opts.baslangic + opts.sure);
  }

  /*
    ⚠️ Zarf şart. Ham bir osilatörü açıp kapatmak "tık" sesi üretiyor
    (dalga sıfırdan başlamıyor, aniden kesiliyor). Hızlı bir yükseliş
    ve üstel bir sönüm o tıkı kaldırıyor.
  */
  g.gain.setValueAtTime(0.0001, opts.baslangic);
  g.gain.exponentialRampToValueAtTime(opts.seviye, opts.baslangic + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, opts.baslangic + opts.sure);

  o.connect(g).connect(cikis);
  o.start(opts.baslangic);
  o.stop(opts.baslangic + opts.sure + 0.02);
}

/** Süzülmüş gürültü — süpürge sesi. */
function gurultu(
  ctx: AudioContext,
  cikis: GainNode,
  tampon: AudioBuffer,
  opts: { baslangic: number; sure: number; hzBas: number; hzSon: number; seviye: number },
) {
  const k = ctx.createBufferSource();
  k.buffer = tampon;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 1.1;
  f.frequency.setValueAtTime(opts.hzBas, opts.baslangic);
  f.frequency.exponentialRampToValueAtTime(opts.hzSon, opts.baslangic + opts.sure);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, opts.baslangic);
  g.gain.exponentialRampToValueAtTime(opts.seviye, opts.baslangic + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, opts.baslangic + opts.sure);

  k.connect(f).connect(g).connect(cikis);
  k.start(opts.baslangic);
  k.stop(opts.baslangic + opts.sure + 0.02);
}

/* ── Tercihin saklandığı yer ─────────────────────────────────
   🔴 `useState` + `useEffect` DEĞİL, `useSyncExternalStore`.

   İlk yazımda tercih bir efektin içinde okunup `setAcik` ile
   yazılıyordu ve lint haklı olarak reddetti
   (`react-hooks/set-state-in-effect`): efekt içinde durum yazmak fazladan
   bir render turu demek ve ilk karede yanlış değer görünüyor.

   `useState` başlatıcısında okumak da olmuyor: başlatıcı **sunucuda da**
   koşuyor, orada `localStorage` yok, `false` dönüyor ve hidrasyon o
   yanlış değeri sabitliyor. Aynı tuzak Ü96'da `sessionStorage` ile
   yaşanmıştı.

   `useSyncExternalStore`un sunucu için ayrı bir anlık görüntüsü var;
   ikisini birden doğru yapan tek yol bu. */
const dinleyiciler = new Set<() => void>();

function abone(f: () => void) {
  dinleyiciler.add(f);
  return () => {
    dinleyiciler.delete(f);
  };
}

function oku(): boolean {
  try {
    return localStorage.getItem(ANAHTAR) === "1";
  } catch {
    // Gizli sekmede erişim atabiliyor — sessizce kapalı kalıyor.
    return false;
  }
}

/** Sunucuda ses tercihi diye bir şey yok. */
const sunucudaOku = () => false;

/** Sesleri çalan kanca. */
export function useBlokSesi() {
  const acik = useSyncExternalStore(abone, oku, sunucudaOku);
  const ctxRef = useRef<AudioContext | null>(null);
  const anaRef = useRef<GainNode | null>(null);
  const gurultuRef = useRef<AudioBuffer | null>(null);

  /** Bağlamı ilk gerektiğinde kuruyor; kurulmuşsa uyandırıyor. */
  const baglam = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      const ana = ctx.createGain();
      ana.gain.value = SES_SEVIYESI;
      ana.connect(ctx.destination);
      ctxRef.current = ctx;
      anaRef.current = ana;
      gurultuRef.current = gurultuTamponu(ctx);
    }
    // iOS: sekme arkaya alınıp dönüldüğünde bağlam askıya alınıyor.
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const degistir = useCallback(() => {
    const yeni = !oku();
    try {
      localStorage.setItem(ANAHTAR, yeni ? "1" : "0");
    } catch {
      // Saklanamadıysa bu tur boyunca da açılamıyor; sessiz kalıyor.
    }
    // Açarken bağlamı HEMEN kur: bu çağrı bir dokunuşun içinde ve
    // tarayıcının ses başlatmaya izin verdiği tek an burası.
    if (yeni) baglam();
    dinleyiciler.forEach((f) => f());
  }, [baglam]);

  const cal = useCallback(
    (ad: SesAdi) => {
      if (!acik) return;
      const ctx = baglam();
      const ana = anaRef.current;
      if (!ctx || !ana) return;
      const t = ctx.currentTime;

      switch (ad) {
        /* Yerleştirme — tahta bir "tok". Kısa, alçak, tek vuruş. */
        case "yerlesti":
          ton(ctx, ana, { tip: "triangle", hz: 210, hzSon: 120, baslangic: t, sure: 0.09, seviye: 0.5 });
          break;

        /* Hata — kısa, pürüzlü bir "buzz". Kare dalga bilerek: temiz
           bir ton ödül gibi duyuluyor, pürüzlü olan uyarı gibi. */
        case "gecersiz":
          ton(ctx, ana, { tip: "square", hz: 104, baslangic: t, sure: 0.13, seviye: 0.22 });
          ton(ctx, ana, { tip: "square", hz: 98, baslangic: t + 0.01, sure: 0.12, seviye: 0.18 });
          break;

        /* Satır silme — süzgeci yukarı kayan gürültü. Ekrandaki
           soldan sağa ışık süpürgesiyle aynı süre (300 ms). */
        case "temizlik": {
          const tam = gurultuRef.current;
          if (tam) {
            gurultu(ctx, ana, tam, {
              baslangic: t,
              sure: 0.3,
              hzBas: 420,
              hzSon: 3200,
              seviye: 0.34,
            });
          }
          break;
        }

        /* Kombo — yükselen üç blip. */
        case "kombo":
          [880, 1174.7, 1568].forEach((hz, i) => {
            ton(ctx, ana, {
              tip: "sine",
              hz,
              baslangic: t + i * 0.06,
              sure: 0.14,
              seviye: 0.34,
            });
          });
          break;

        /* Ödül — kombonun daha uzun ve parlak hâli. Turun en büyük
           anı; diğerlerinden ayrılması gerekiyor. */
        case "odul":
          [659.3, 880, 1174.7, 1568, 2093].forEach((hz, i) => {
            ton(ctx, ana, {
              tip: "sine",
              hz,
              baslangic: t + i * 0.075,
              sure: 0.26,
              seviye: 0.3,
            });
          });
          break;
      }
    },
    [acik, baglam],
  );

  /* Ekrandan çıkarken bağlamı kapat: açık kalan bir AudioContext
     telefonda ses donanımını meşgul tutuyor. */
  useEffect(() => {
    return () => {
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  return { acik, degistir, cal };
}
