"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { cozEylemi, onaylaEylemi, geriAlEylemi } from "./actions";
import type { KasaGorunumu, OnaySonucu } from "@/domain/kupon";

/**
 * Kasa ekranı — sahada üç saniyede bitmesi gereken akış.
 *
 * ── Ü19: iki yol, tek kupon ─────────────────────────────────
 *
 * QR birincil. Ama tarayıcıda kamera ile QR okuma her yerde yok:
 * `BarcodeDetector` Chrome/Android'de var, Safari/iOS'te **yok**. Bu yüzden
 * 6 haneli kod bir "yedek" değil, bazı cihazlarda **tek yol**. İkisi de
 * eşit görünürlükte duruyor; kamera yoksa ekran bunu söylüyor, sessizce
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
 * Tarayıcı kamerayla QR okuyabiliyor mu?
 *
 * `useEffect` + `setState` yerine `useSyncExternalStore`: yetenek sorgusu
 * sunucuda cevaplanamıyor (orada `window` yok) ama bir *durum* da değil —
 * hiç değişmeyen bir gerçek. Efektle kurmak gereksiz bir render turu açardı.
 * `lib/cihaz.ts` aynı deseni kullanıyor.
 */
const aboneOl = () => () => {};
const istemcide = () => "BarcodeDetector" in window;
const sunucuda = () => false;

function useKameraDestegi(): boolean {
  return useSyncExternalStore(aboneOl, istemcide, sunucuda);
}

type Asama =
  | { tur: "bos" }
  | { tur: "bulundu"; gorunum: Extract<KasaGorunumu, { bulundu: true }> }
  | { tur: "hata"; mesaj: string }
  | { tur: "onaylandi"; kuponId: string; baslik: string; kurus: number; bitis: number };

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
      setTutar(g.tip === "percent" ? String(Math.round(g.tavanKurus / 100)) : "");
    });
    setGirdi("");
  }, []);

  const onayla = useCallback(
    (g: Extract<KasaGorunumu, { bulundu: true }>) => {
      basla(async () => {
        const sonuc: OnaySonucu = await onaylaEylemi(
          g.kuponId,
          g.tip === "percent" ? Number(tutar) || 0 : undefined,
        );
        if (!sonuc.ok) {
          setAsama({ tur: "hata", mesaj: sonuc.hata });
          return;
        }
        setAsama({
          tur: "onaylandi",
          kuponId: g.kuponId,
          baslik: g.baslik,
          kurus: sonuc.dusulenKurus,
          bitis: sonuc.geriAlmaBitis.getTime(),
        });
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
          bitis={asama.bitis}
          geriAl={() =>
            basla(async () => {
              const c = await geriAlEylemi(asama.kuponId);
              setAsama(
                c.ok
                  ? { tur: "hata", mesaj: "Onay geri alındı. Kupon kullanılmadı sayılıyor." }
                  : { tur: "hata", mesaj: c.hata ?? "Geri alınamadı." },
              );
            })
          }
          kapat={() => setAsama({ tur: "bos" })}
          bekliyor={bekliyor}
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
          Bu tarayıcı kamerayla QR okuyamıyor. Müşterinin ekranındaki altı haneli kodu gir —
          aynı kuponu açar.
        </p>
      )}
    </div>
  );
}

/**
 * Kamera ile QR okuma.
 *
 * `BarcodeDetector` yalnızca destekleyen tarayıcılarda çağrılıyor; burası
 * hiç açılmıyorsa kod girişi zaten tek yol olarak duruyor.
 */
function Kamera({ bulundu, kapat }: { bulundu: (d: string) => void; kapat: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let durduruldu = false;
    let akis: MediaStream | null = null;

    (async () => {
      try {
        akis = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (durduruldu) return;
        if (videoRef.current) {
          videoRef.current.srcObject = akis;
          await videoRef.current.play();
        }

        // @ts-expect-error — BarcodeDetector henüz standart tiplerde yok
        const dedektor = new window.BarcodeDetector({ formats: ["qr_code"] });

        const tara = async () => {
          if (durduruldu || !videoRef.current) return;
          try {
            const kodlar = await dedektor.detect(videoRef.current);
            if (kodlar.length > 0 && kodlar[0].rawValue) {
              bulundu(kodlar[0].rawValue);
              return;
            }
          } catch {
            // Tek karede okuyamamak normal — döngü devam ediyor.
          }
          requestAnimationFrame(tara);
        };
        requestAnimationFrame(tara);
      } catch {
        setHata("Kameraya erişilemedi. Kodu elle girebilirsin.");
      }
    })();

    return () => {
      durduruldu = true;
      akis?.getTracks().forEach((t) => t.stop());
    };
  }, [bulundu]);

  return (
    <div className="mb-5">
      {hata ? (
        <p className="rounded-lg border border-tehlike/60 bg-yuzey px-4 py-3 text-[14px] text-tehlike">{hata}</p>
      ) : (
        <video
          ref={videoRef}
          className="w-full rounded-lg border border-cizgi bg-cukur"
          playsInline
          muted
        />
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
          {gorunum.tip === "percent" ? `%${gorunum.yuzde} · en fazla` : "Değer"}
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

      {gorunum.tip === "percent" && (
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

/* ── Onaylandı + geri alma ─────────────────────────────────── */

function Onaylandi({
  baslik,
  kurus,
  bitis,
  geriAl,
  kapat,
  bekliyor,
}: {
  baslik: string;
  kurus: number;
  bitis: number;
  geriAl: () => void;
  kapat: () => void;
  bekliyor: boolean;
}) {
  const [kalan, setKalan] = useState(() => Math.max(0, Math.round((bitis - Date.now()) / 1000)));

  useEffect(() => {
    const t = setInterval(() => {
      setKalan(Math.max(0, Math.round((bitis - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(t);
  }, [bitis]);

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

      {kalan > 0 ? (
        <button
          type="button"
          onClick={geriAl}
          disabled={bekliyor}
          className="mt-6 w-full rounded-lg border border-tehlike py-4 font-display text-[16px] text-tehlike disabled:opacity-45"
        >
          Geri al · {kalan} sn
        </button>
      ) : (
        <p className="mt-6 font-data text-[11px] text-yazi-sonuk">
          Geri alma süresi doldu
        </p>
      )}

      <button
        type="button"
        onClick={kapat}
        className="mt-3 w-full rounded-lg bg-vurgu py-5 font-display text-[18px] font-bold text-white"
      >
        Sıradaki
      </button>
    </div>
  );
}
