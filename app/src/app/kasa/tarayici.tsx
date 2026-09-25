"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { cozEylemi, onaylaEylemi } from "./actions";
import type { KasaGorunumu, OnaySonucu } from "@/domain/kupon";

/**
 * Kasa ekranı — sahada üç saniyede bitmesi gereken akış.
 *
 * ── Ü19: iki yol, tek kupon ─────────────────────────────────
 *
 * QR birincil, 6 haneli kod her zaman yanında. `BarcodeDetector`
 * Chrome/Android'de var, Safari/iOS'te **yok** — Ü283'ten beri orada kare
 * jsQR ile çözülüyor (`lib/karekod-oku.ts`), iPhone da kamerayla okuyor.
 * Kameraya hiç erişilemeyen tarayıcıda ekran bunu söylüyor, sessizce
 * bozulmuş gibi durmuyor.
 *
 * ── Neden geçerlilik burada ─────────────────────────────────
 *
 * Oyuncunun ekranı "bu kupon geçerlidir" demiyor (E9). Geçerlilik ilk kez
 * burada, okutulduktan sonra ortaya çıkıyor. Süresi dolmuş, başka kafeye ait
 * veya zaten kullanılmış kupon burada **kırmızı** dönüyor — telefonda ise
 * geçerli olanla aynı görünüyordu.
 */

/**
 * Tarayıcı kameraya erişebiliyor mu?
 *
 * Ü283'e kadar soru "`BarcodeDetector` var mı" idi ve iPhone'da düğme hiç
 * çıkmıyordu. Okuyucu artık her tarayıcıda var (`okuyucuKur`); gereken
 * yalnızca kamera — o da güvenli bağlantıda (HTTPS) açılıyor.
 *
 * `useEffect` + `setState` yerine `useSyncExternalStore`: yetenek sorgusu
 * sunucuda cevaplanamıyor (orada `window` yok) ama bir *durum* da değil —
 * hiç değişmeyen bir gerçek. Efektle kurmak gereksiz bir render turu açardı.
 * `lib/cihaz.ts` aynı deseni kullanıyor.
 */
const aboneOl = () => () => {};
const istemcide = () => !!navigator.mediaDevices?.getUserMedia;
const sunucuda = () => false;

function useKameraDestegi(): boolean {
  return useSyncExternalStore(aboneOl, istemcide, sunucuda);
}

type Asama =
  | { tur: "bos" }
  | { tur: "bulundu"; gorunum: Extract<KasaGorunumu, { bulundu: true }> }
  | { tur: "hata"; mesaj: string }
  | { tur: "onaylandi"; baslik: string; kurus: number };

export function KasaTarayici() {
  const [asama, setAsama] = useState<Asama>({ tur: "bos" });
  const [girdi, setGirdi] = useState("");
  const [tutar, setTutar] = useState("");
  const [bekliyor, basla] = useTransition();
  const kameraVar = useKameraDestegi();

  const coz = useCallback((deger: string) => {
    if (!deger.trim()) return;
    basla(async () => {
      const g = await cozEylemi(deger);
      if (!g.bulundu) {
        setAsama({ tur: "hata", mesaj: g.sebep });
        return;
      }
      setAsama({ tur: "bulundu", gorunum: g });
      // Ü277: ürüne bağlı yüzdede indirim kesin — tutar sorulmuyor.
      setTutar(g.tip === "percent" && !g.urunAdi ? String(Math.round(g.tavanKurus / 100)) : "");
    });
    setGirdi("");
  }, []);

  const onayla = useCallback(
    (g: Extract<KasaGorunumu, { bulundu: true }>) => {
      basla(async () => {
        const sonuc: OnaySonucu = await onaylaEylemi(
          g.kuponId,
          g.tip === "percent" && !g.urunAdi ? Number(tutar) || 0 : undefined,
        );
        if (!sonuc.ok) {
          setAsama({ tur: "hata", mesaj: sonuc.hata });
          return;
        }
        setAsama({ tur: "onaylandi", baslik: g.baslik, kurus: sonuc.dusulenKurus });
      });
    },
    [tutar],
  );

  return (
    <div className="w-full max-w-md">
      {asama.tur === "bos" && (
        <Giris
          girdi={girdi}
          setGirdi={setGirdi}
          coz={coz}
          bekliyor={bekliyor}
          kameraVar={kameraVar}
        />
      )}

      {asama.tur === "bulundu" && (
        <Sonuc
          gorunum={asama.gorunum}
          tutar={tutar}
          setTutar={setTutar}
          onayla={() => onayla(asama.gorunum)}
          iptal={() => setAsama({ tur: "bos" })}
          bekliyor={bekliyor}
        />
      )}

      {asama.tur === "hata" && (
        <Kirmizi mesaj={asama.mesaj} kapat={() => setAsama({ tur: "bos" })} />
      )}

      {asama.tur === "onaylandi" && (
        <Onaylandi
          baslik={asama.baslik}
          kurus={asama.kurus}
          kapat={() => setAsama({ tur: "bos" })}
        />
      )}
    </div>
  );
}

/* ── Giriş ─────────────────────────────────────────────────── */

function Giris({
  girdi,
  setGirdi,
  coz,
  bekliyor,
  kameraVar,
}: {
  girdi: string;
  setGirdi: (s: string) => void;
  coz: (s: string) => void;
  bekliyor: boolean;
  kameraVar: boolean;
}) {
  const [kameraAcik, setKameraAcik] = useState(false);

  return (
    <div>
      {kameraAcik ? (
        <Kamera bulundu={(d) => { setKameraAcik(false); coz(d); }} kapat={() => setKameraAcik(false)} />
      ) : (
        kameraVar && (
          <button
            type="button"
            onClick={() => setKameraAcik(true)}
            className="mb-5 w-full rounded-lg bg-vurgu py-6 font-display text-[20px] font-bold text-white"
          >
            QR okut
          </button>
        )
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          coz(girdi);
        }}
      >
        <label className="block">
          <span className="mb-2 block etiket-caps text-yazi-sonuk">
            {kameraVar ? "veya kupon kodu" : "Kupon kodu"}
          </span>
          <input
            value={girdi}
            onChange={(e) => setGirdi(e.target.value.toUpperCase())}
            maxLength={32}
            autoFocus
            autoComplete="off"
            className="w-full rounded-lg border border-cizgi bg-cukur py-5 text-center font-data text-3xl tracking-[0.3em] text-yazi uppercase focus:border-vurgu focus:outline-none"
            placeholder="——————"
          />
        </label>

        <button
          type="submit"
          disabled={bekliyor || !girdi.trim()}
          className="mt-4 w-full rounded-lg border border-vurgu py-4 font-display text-[16px] font-bold text-vurgu disabled:opacity-40"
        >
          {bekliyor ? "Kontrol ediliyor…" : "Kontrol et"}
        </button>
      </form>

      {!kameraVar && (
        <p className="mt-5 text-center text-[12px] leading-relaxed text-yazi-sonuk">
          Bu tarayıcı kameraya erişemiyor. Müşterinin ekranındaki altı haneli kodu gir —
          aynı kuponu açar.
        </p>
      )}
    </div>
  );
}

/** Kameradan kaç milisaniyede bir kare okunuyor — saniyede ~7 kare. */
const TARAMA_ARALIGI_MS = 150;

/** Bir kareden karekodun değeri; okunamazsa `null`. */
type Okuyucu = (video: HTMLVideoElement) => Promise<string | null>;

type BarkodSinifi = {
  new (secenek: { formats: string[] }): {
    detect(kaynak: HTMLVideoElement): Promise<{ rawValue: string }[]>;
  };
  getSupportedFormats(): Promise<string[]>;
};

/**
 * Okuyucuyu kur — Ü283.
 *
 * Tarayıcının kendi dedektörü karekodu okuyabiliyorsa o (Chrome/Android).
 * Yoksa (Safari/iPhone) kamera karesinin ortası tuvale çizilip jsQR ile
 * çözülüyor; jsQR yalnızca burada, gerektiğinde yükleniyor.
 */
async function okuyucuKur(): Promise<Okuyucu> {
  const Dedektor = (window as unknown as { BarcodeDetector?: BarkodSinifi }).BarcodeDetector;
  if (Dedektor) {
    try {
      if ((await Dedektor.getSupportedFormats()).includes("qr_code")) {
        const dedektor = new Dedektor({ formats: ["qr_code"] });
        return async (video) => (await dedektor.detect(video))[0]?.rawValue || null;
      }
    } catch {
      // Dedektör var ama çalışmıyor — yedek okuyucuya geçiliyor.
    }
  }

  const { kareCoz, ortaKare } = await import("@/lib/karekod-oku");
  const tuval = document.createElement("canvas");
  const baglam = tuval.getContext("2d", { willReadFrequently: true });
  if (!baglam) throw new Error("tuval açılamadı");

  return async (video) => {
    if (!video.videoWidth || !video.videoHeight) return null;
    const k = ortaKare(video.videoWidth, video.videoHeight);
    if (tuval.width !== k.hedef) {
      tuval.width = k.hedef;
      tuval.height = k.hedef;
    }
    baglam.drawImage(video, k.sx, k.sy, k.kenar, k.kenar, 0, 0, k.hedef, k.hedef);
    return kareCoz(baglam.getImageData(0, 0, k.hedef, k.hedef).data, k.hedef, k.hedef);
  };
}

/**
 * Kamera ile QR okuma — okuyucu tarayıcıya göre seçiliyor (`okuyucuKur`).
 * Kamera hiç açılmıyorsa kod girişi zaten tek yol olarak duruyor.
 */
function Kamera({ bulundu, kapat }: { bulundu: (d: string) => void; kapat: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hata, setHata] = useState<string | null>(null);
  // Üst bileşen her çizimde yeni `bulundu` veriyor. Efekt ona bağlıyken
  // kasiyer kod kutusuna her harf yazdığında kamera kapanıp yeniden
  // açılıyordu (Ü283).
  const bul = useEffectEvent((deger: string) => bulundu(deger));

  useEffect(() => {
    let durduruldu = false;
    let akis: MediaStream | null = null;
    let zamanlayici: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        akis = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        // İzin beklenirken ekran kapandıysa kamera açık kalmasın.
        if (durduruldu) {
          akis.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = akis;
        await video.play();
        const oku = await okuyucuKur();

        const tara = async () => {
          if (durduruldu) return;
          try {
            const deger = await oku(video);
            if (deger && !durduruldu) {
              bul(deger);
              return;
            }
          } catch {
            // Tek karede okuyamamak normal — döngü devam ediyor.
          }
          zamanlayici = setTimeout(tara, TARAMA_ARALIGI_MS);
        };
        tara();
      } catch {
        if (!durduruldu) setHata("Kameraya erişilemedi. Kodu elle girebilirsin.");
      }
    })();

    return () => {
      durduruldu = true;
      clearTimeout(zamanlayici);
      akis?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="mb-5">
      {hata ? (
        <p className="rounded-lg border border-tehlike/60 bg-yuzey px-4 py-3 text-[14px] text-tehlike">{hata}</p>
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full rounded-lg border border-cizgi bg-cukur"
            playsInline
            muted
          />
          <p className="mt-2 text-center text-[12px] text-yazi-sonuk">
            Karekodu görüntünün ortasına getir.
          </p>
        </>
      )}
      <button
        type="button"
        onClick={kapat}
        className="mt-3 w-full rounded-lg border border-cizgi py-3 text-[14px] text-yazi-sonuk"
      >
        Kamerayı kapat
      </button>
    </div>
  );
}

/* ── Sonuç ─────────────────────────────────────────────────── */

function Sonuc({
  gorunum,
  tutar,
  setTutar,
  onayla,
  iptal,
  bekliyor,
}: {
  gorunum: Extract<KasaGorunumu, { bulundu: true }>;
  tutar: string;
  setTutar: (s: string) => void;
  onayla: () => void;
  iptal: () => void;
  bekliyor: boolean;
}) {
  if (!gorunum.gecerli) {
    return <Kirmizi mesaj={gorunum.sebep ?? "Bu kupon kullanılamaz."} kapat={iptal} />;
  }

  return (
    <div className="rounded-2xl border-2 border-vurgu bg-cukur px-6 py-7">
      <div className="etiket-caps text-vurgu">
        Geçerli kupon
      </div>

      <h2 className="mt-2 font-display text-3xl leading-tight font-extrabold">{gorunum.baslik}</h2>

      {/* Kasiyer TL değerini GÖRÜR — oyuncu görmez (E9). */}
      <div className="mt-5 flex items-baseline justify-between border-t border-cizgi pt-4">
        <span className="etiket-caps text-yazi-sonuk">
          {/* Ü292: kampanya kuponunun başlığı ürünü zaten söylüyor. */}
          {gorunum.kampanyaMi
            ? `Kampanya · %${gorunum.yuzde}`
            : gorunum.tip === "percent"
              ? gorunum.urunAdi
                ? `%${gorunum.yuzde} · ${gorunum.urunAdi}`
                : `%${gorunum.yuzde} · en fazla`
              : "Değer"}
        </span>
        <span className="font-data text-2xl font-bold text-odul-koyu tabular">
          {(gorunum.tavanKurus / 100).toLocaleString("tr-TR")} TL
        </span>
      </div>

      <div className="mt-2 flex items-baseline justify-between font-data text-[11px] text-yazi-sonuk">
        <span>Müşteri {gorunum.oyuncuKodu}</span>
        <span>
          son kullanım{" "}
          {gorunum.sonKullanim.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
        </span>
      </div>

      {/* Ü277: yalnızca ürünsüz ESKİ yüzde ödülünde tutar soruluyor; ürüne
          bağlı yüzdede indirim kesin, yukarıda yazıyor. */}
      {gorunum.tip === "percent" && !gorunum.urunAdi && (
        <label className="mt-5 block">
          <span className="mb-2 block etiket-caps text-yazi-sonuk">
            Adisyondaki indirim (TL)
          </span>
          <input
            value={tutar}
            onChange={(e) => setTutar(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            className="w-full rounded-lg border border-cizgi bg-yuzey py-3 text-center font-data text-2xl text-yazi focus:border-vurgu focus:outline-none"
          />
          <span className="mt-1.5 block text-[12px] text-yazi-sonuk">
            Tavanın üstü kabul edilmez. Aradaki fark bütçeye geri döner.
          </span>
        </label>
      )}

      <button
        type="button"
        onClick={onayla}
        disabled={bekliyor}
        className="mt-6 w-full rounded-lg bg-vurgu py-6 font-display text-[20px] font-bold text-white disabled:opacity-45"
      >
        {bekliyor ? "…" : "ONAYLA"}
      </button>

      <button
        type="button"
        onClick={iptal}
        className="mt-3 w-full py-3 text-[14px] text-yazi-sonuk underline"
      >
        Vazgeç
      </button>
    </div>
  );
}

function Kirmizi({ mesaj, kapat }: { mesaj: string; kapat: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-tehlike bg-yuzey px-6 py-8 text-center">
      <div className="text-4xl leading-none" aria-hidden>
        ⛔
      </div>
      <p className="mt-4 font-display text-xl leading-snug font-bold text-tehlike">{mesaj}</p>
      <button
        type="button"
        onClick={kapat}
        className="mt-6 w-full rounded-lg border border-cizgi py-4 font-display text-[16px] text-yazi"
      >
        Tamam
      </button>
    </div>
  );
}

/* ── Onaylandı ─────────────────────────────────────────────── */

/**
 * Onay kesin — Ü290. Ürün sahibi: *"geri alma olmamalı."* Önce 60 saniyelik
 * bir "Geri al" vardı ve geri alınan kupon iptal oluyordu; kasa ise
 * "kullanılmadı sayılıyor" diyordu.
 */
function Onaylandi({
  baslik,
  kurus,
  kapat,
}: {
  baslik: string;
  kurus: number;
  kapat: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-vurgu bg-cukur px-6 py-8 text-center">
      <div className="text-4xl leading-none" aria-hidden>
        ✅
      </div>
      <p className="mt-4 font-display text-2xl leading-snug font-extrabold">Kupon onaylandı</p>
      <p className="mt-2 text-[15px] text-yazi-sonuk">{baslik}</p>
      <p className="mt-1 font-data text-xl font-bold text-odul-koyu tabular">
        {(kurus / 100).toLocaleString("tr-TR")} TL
      </p>

      <button
        type="button"
        onClick={kapat}
        className="mt-6 w-full rounded-lg bg-vurgu py-5 font-display text-[18px] font-bold text-white"
      >
        Sıradaki
      </button>
    </div>
  );
}
