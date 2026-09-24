"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ayir, KAPASITE, type AyirDurumu, type AyirGirdisi } from "../ayir";
import {
  ayirCami,
  ayirHakRengi,
  ayirParilti,
  ayirSivi,
  ayirPaketi,
  ayirPanel,
  ayirSahnesi,
} from "./ayir-yuzey";
import { useOyunSesi } from "./oyun-ses";
import { useOdulPaketi, type OyunEkraniProps } from "./ortak";

/**
 * Ayır ekranı — Ü261.
 *
 * ── Ü214: zamansız oyun, boş render yok ────────────────────
 *
 * Bu ekranda saat yok. Durum **yalnızca** oyuncu iki tüpe dokununca
 * değişiyor; rAF döngüsüne de tick sayacına da gerek yok. Blok ve
 * 2048'le aynı aile — Ü214'ün "saniyede 20 boş render" tuzağı burada
 * hiç kurulmuyor.
 *
 * ── Seçim ekranda, motorda değil ───────────────────────────
 *
 * Girdi `(kaynak, hedef)` çifti; yani bir aktarım **tek** girdi.
 * "Hangi tüp seçili" bilgisi oyunun kuralı değil, arayüzün hâli — motora
 * girmiyor. Girseydi sunucu oyuncunun dokunma sırasını da yeniden
 * oynamak zorunda kalırdı ve kayıt iki katına çıkardı.
 */

type Yerel = {
  durum: AyirDurumu;
  girdiler: AyirGirdisi[];
};

export function AyirEkrani({ tohum, bitti, kazandirir, odul, cik }: OyunEkraniProps) {
  const [y, setY] = useState<Yerel>(() => ({ durum: ayir.baslat(tohum), girdiler: [] }));
  const [secili, setSecili] = useState<number | null>(null);
  const [sarsilan, setSarsilan] = useState<number | null>(null);
  const bildirildi = useRef(false);
  const ses = useOyunSesi();

  const durum = y.durum;
  // Ü275: ödül sesi yalnızca ödül varken — izinsiz paket sıradan parça.
  const odulIzinli = kazandirir === true && odul?.izin === true;
  // Ü275 · "görünürse kesin": paket ödül olarak yalnızca sunucu "evet"
  // dediyse çiziliyor; "hayır"da sıradan parça (Ü207'deki gibi).
  const paketVar = useOdulPaketi(odul, kazandirir, durum.paket !== null, () => y.girdiler);

  const dokun = useCallback(
    (i: number) => {
      if (ayir.bittiMi(durum)) return;

      if (secili === null) {
        /* Boş tüp seçilemiyor: ondan dökülecek bir şey yok. */
        if (durum.tupler[i].length === 0) return;
        setSecili(i);
        return;
      }
      if (secili === i) {
        setSecili(null);
        return;
      }

      const girdi: AyirGirdisi = { k: secili, h: i };
      const sonraki = ayir.uygula(durum, girdi);
      if (!sonraki) {
        /*
          ⚠️ Kuraldışı dokunuş **kayda yazılmıyor**: sunucu onu da
          reddederdi. Ekran yalnızca sarsıyor ve seçimi dokunulan tüpe
          taşıyor — oyuncu çoğu zaman fikrini değiştirmiş oluyor.
        */
        ses.cal("gecersiz");
        setSarsilan(i);
        window.setTimeout(() => setSarsilan(null), 220);
        setSecili(durum.tupler[i].length > 0 ? i : null);
        return;
      }

      const bolumAtladi = sonraki.bolum > durum.bolum;
      if (odulIzinli && sonraki.odulAlindi && !durum.odulAlindi) ses.cal("odul");
      else if (bolumAtladi) ses.cal("kombo");
      else ses.cal("yerlesti");

      setSecili(null);
      setY((p) => ({ durum: sonraki, girdiler: [...p.girdiler, girdi] }));
    },
    [durum, secili, odulIzinli, ses],
  );

  // ── Bitiş bildirimi ──────────────────────────────────
  useEffect(() => {
    if (bildirildi.current || !ayir.bittiMi(y.durum)) return;
    bildirildi.current = true;
    ses.cal("gecersiz");
    bitti(y.girdiler, ayir.skor(y.durum));
  }, [y, bitti, ses]);

  // ── Klavye: 1..7 tüpleri seçiyor ─────────────────────
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > durum.tupler.length) return;
      if ((e.target as HTMLElement | null)?.closest("button")) return;
      e.preventDefault();
      dokun(n - 1);
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [dokun, durum.tupler.length]);

  const skor = ayir.skor(durum);

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={ayirSahnesi()}>
      {/* ── Üst şerit ─────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-3 pb-1">
        <span className="flex items-center gap-2 px-3.5 py-1.5" style={ayirPanel()}>
          <span className="flex flex-col">
            <span className="font-display text-[8px] leading-none font-bold tracking-[0.16em] text-white/55 uppercase">
              Hak
            </span>
            <span
              key={durum.havuz}
              className="dusen-skor mt-0.5 font-display text-[18px] leading-none font-bold tabular"
              style={{ color: ayirHakRengi(durum.havuz) }}
            >
              {durum.havuz}
            </span>
          </span>
        </span>

        <span className="flex items-center gap-2 px-3.5 py-1.5" style={ayirPanel()}>
          <span className="font-display text-[8px] leading-none font-bold tracking-[0.16em] text-white/55 uppercase">
            Bölüm
          </span>
          <span className="font-display text-[18px] leading-none font-bold text-white tabular">
            {durum.bolum}
          </span>
        </span>

        <span className="flex items-center gap-2 px-3.5 py-1.5" style={ayirPanel()}>
          <span className="flex flex-col">
            <span className="font-display text-[8px] leading-none font-bold tracking-[0.16em] text-white/55 uppercase">
              Skor
            </span>
            <span
              key={skor}
              className="dusen-skor mt-0.5 font-display text-[18px] leading-none font-bold text-white tabular"
            >
              {skor.toLocaleString("tr-TR")}
            </span>
          </span>
        </span>

        <span className="flex items-center" style={ayirPanel()}>
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

      {/* ── Tüpler ──────────────────────────────────
          ⚠️ Sarmalayıcı `flex-wrap`: tüp sayısı bölümle 5'ten 7'ye
          çıkıyor ve dar telefonda yedi tüp tek sıraya sığmıyor. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-2">
        <div className="flex max-w-full flex-wrap items-end justify-center gap-x-3 gap-y-5">
          {durum.tupler.map((tup, i) => (
            <Tup
              key={i}
              tup={tup}
              secili={secili === i}
              sarsilan={sarsilan === i}
              paket={paketVar && durum.paket === i}
              sira={i + 1}
              dokun={() => dokun(i)}
            />
          ))}
        </div>
      </div>

      {/* ── Alt şerit ─────────────────────────────── */}
      <div className="flex h-[42px] shrink-0 items-center justify-center px-3 pb-1">
        <span className="text-center text-[12px] leading-none font-semibold text-white/70">
          {secili !== null
            ? "Şimdi dökeceğin tüpe dokun"
            : durum.havuz <= 10
              ? "Hakkın azalıyor"
              : "Bir tüpe dokun · üstteki renk aktarılır"}
        </span>
      </div>
    </div>
  );
}

/**
 * Tek tüp.
 *
 * ⚠️ Sıvı **dipten** doluyor ve tek bir degrade olarak çiziliyor
 * (`ayirSivi`): dilim başına bir öge kesirli yükseklikte saç teli
 * boşluklar bırakıyordu ve aynı renkten dört birim dört ayrı blok gibi
 * görünüyordu. Motor da tüpü dipten üste tutuyor; ikisi ayrışsaydı
 * ekran doğru tahtayı ters gösterirdi.
 */
function Tup({
  tup,
  secili,
  sarsilan,
  paket,
  sira,
  dokun,
}: {
  tup: number[];
  secili: boolean;
  sarsilan: boolean;
  paket: boolean;
  sira: number;
  dokun: () => void;
}) {
  return (
    <button
      type="button"
      onClick={dokun}
      aria-label={`${sira}. tüp, ${tup.length} birim dolu`}
      className={`relative overflow-hidden transition-transform duration-150 ${
        sarsilan ? "ayir-sarsinti" : ""
      }`}
      style={{
        ...ayirCami(secili),
        /* İki `min()`: oran her ekranda korunuyor. `aspect-ratio` +
           `max-width` birlikte oranı sessizce iptal ediyor (Ü255). */
        /*
          ⚠️ En bilerek dar tutuldu: 375 piksellik telefonda beş tüp
          **tek sıraya** ancak bu enle sığıyor (5×56 + 4×12 = 328).
          Biraz genişletmek bölüm 1'i 4+1 diye iki sıraya bölüyordu ve
          tek başına kalan tüp tahtayı yamuk gösteriyordu.

          ⚠️ Boy ölçülerek büyütüldü: 232 pikselde tahta 812 piksellik
          ekranın ortasında küçük bir şerit gibi duruyordu. Yedi tüplü
          bölümde iki sıra 2×281 + 20 = 582 piksel ediyor ve üst şeritle
          alt şeritten artan ~704 piksele sığıyor.
        */
        width: "min(15vw, 56px)",
        height: "min(75vw, 281px)",
        transform: secili ? "translateY(-14px)" : "none",
      }}
    >
      <span aria-hidden className="absolute inset-0" style={ayirSivi(tup, KAPASITE)} />
      <span aria-hidden className="pointer-events-none absolute inset-0" style={ayirParilti()} />
      {paket && (
        <span aria-hidden className="nabiz pointer-events-none absolute inset-0" style={ayirPaketi()} />
      )}
    </button>
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
        background: acik ? "rgba(165,180,252,.20)" : "transparent",
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
