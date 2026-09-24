"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  bagla,
  ucNoktalari,
  EN_BUYUK_TAHTA,
  type BaglaDurumu,
  type BaglaGirdisi,
} from "../bagla";
import {
  baglaHakRengi,
  baglaKaresi,
  baglaPanel,
  baglaSahnesi,
  baglaTahtasi,
  baglaYolRengi,
} from "./bagla-yuzey";
import { useOyunSesi } from "./oyun-ses";
import { useOdulPaketi, type OyunEkraniProps } from "./ortak";

/**
 * Bağla ekranı — Ü262.
 *
 * ── Ü214: zamansız oyun, boş render yok ────────────────────
 *
 * Saat yok; durum yalnızca oyuncu bir yol çizince değişiyor. Parmak
 * sürüklenirken **taslak** yol yerel bir state'te duruyor ve motora
 * dokunmuyor — motor ancak parmak kalkınca tek bir girdi alıyor.
 *
 * ── 🔴 Neden taslak motora girmiyor ─────────────────────────
 *
 * Girdi biçimi `(yol)` ve bir çizim **tek** girdi. Sürükleme sırasında
 * her kare motora gitseydi kayıt kare sayısı kadar şişer, sunucu her
 * kareyi ayrı ayrı yeniden oynar ve `EN_FAZLA_GIRDI` sınırı bir turda
 * dolardı.
 *
 * ── Vuruş testi `elementFromPoint` ile ─────────────────────
 *
 * ⚠️ Kare başına `onPointerEnter` çalışmıyor: dokunmatikte parmak
 * basıldığı ögeyi **yakalıyor** (implicit pointer capture) ve komşu
 * karelere `enter` olayı hiç düşmüyor. Sürükleme bu yüzden tahtanın
 * üstünde tek bir dinleyiciyle izleniyor ve altındaki kare koordinattan
 * bulunuyor.
 */

type Taslak = { renk: number; yol: number[] };

export function BaglaEkrani({ tohum, bitti, kazandirir, odul, cik }: OyunEkraniProps) {
  const [durum, setDurum] = useState<BaglaDurumu>(() => bagla.baslat(tohum));
  const [girdiler, setGirdiler] = useState<BaglaGirdisi[]>([]);
  const [taslak, setTaslak] = useState<Taslak | null>(null);
  const bildirildi = useRef(false);
  const ses = useOyunSesi();
  const tahtaRef = useRef<HTMLDivElement | null>(null);

  const en = durum.en;
  // Ü275: ödül sesi yalnızca ödül varken — izinsiz paket sıradan parça.
  const odulIzinli = kazandirir === true && odul?.izin === true;
  // Ü275 · "görünürse kesin": paket ödül olarak yalnızca sunucu "evet"
  // dediyse çiziliyor; "hayır"da sıradan parça (Ü207'deki gibi).
  const paketVar = useOdulPaketi(odul, kazandirir, durum.paket !== null, () => girdiler);

  /** Koordinatın altındaki karenin indisi. */
  const kareBul = useCallback((x: number, y: number): number | null => {
    const oge = document.elementFromPoint(x, y);
    const kare = (oge as HTMLElement | null)?.closest<HTMLElement>("[data-kare]");
    if (!kare) return null;
    const k = Number(kare.dataset.kare);
    return Number.isInteger(k) ? k : null;
  }, []);

  const komsuMu = useCallback(
    (a: number, b: number) =>
      Math.abs(Math.floor(a / en) - Math.floor(b / en)) + Math.abs((a % en) - (b % en)) === 1,
    [en],
  );

  const basla = useCallback(
    (e: React.PointerEvent) => {
      if (bagla.bittiMi(durum)) return;
      const k = kareBul(e.clientX, e.clientY);
      if (k === null) return;
      const renk = durum.uclar[k];
      if (renk === 0) return; // çizim yalnızca uçtan başlıyor
      e.currentTarget.setPointerCapture(e.pointerId);
      setTaslak({ renk, yol: [k] });
    },
    [durum, kareBul],
  );

  /**
   * Yola bir kare eklemeyi dener. Kuraldışıysa yol olduğu gibi kalıyor.
   *
   * `null` = eklenemedi (çağıran ara kare döngüsünü orada kesiyor).
   */
  const kareEkle = useCallback(
    (yol: number[], renk: number, k: number): number[] | null => {
      const son = yol[yol.length - 1];
      if (k === son) return yol;
      /* Geri sarma: bir önceki kareye dönüldüyse son adım siliniyor. */
      if (yol.length >= 2 && k === yol[yol.length - 2]) return yol.slice(0, -1);
      if (!komsuMu(son, k) || yol.includes(k)) return null;
      /* Başka rengin ucundan geçilemiyor. */
      const uc = durum.uclar[k];
      if (uc !== 0 && uc !== renk) return null;
      /* Kendi ucuna varılabilir ama yalnızca ÖTEKİ uca. */
      if (uc === renk && k === yol[0]) return null;
      return [...yol, k];
    },
    [komsuMu, durum.uclar],
  );

  const surukle = useCallback(
    (e: React.PointerEvent) => {
      if (!taslak) return;
      const k = kareBul(e.clientX, e.clientY);
      if (k === null) return;
      setTaslak((t) => {
        if (!t) return t;
        let yol = t.yol;
        /*
          🔴 Parmak iki kare arasında **atlayabiliyor.** `pointermove`
          her pikselde düşmüyor; hızlı kayan parmakta iki olay arasında
          bir kare kalıyor ve o kare yola hiç girmiyordu. Sonuç:
          oyuncunun parmağı ilerliyor ama çizgi geride takılı kalıyor —
          "oyun beni dinlemiyor" hissi. Yavaş çizince görünmüyordu,
          onun için gözden kaçması kolay.

          Çözüm: son kareden parmağın bulunduğu kareye doğru **adım
          adım** yürünüyor. Her adımda büyük olan eksen seçiliyor;
          böylece çapraz kayan parmak da makul bir yol bırakıyor.

          ⚠️ Tavan var: tahta en çok 7×7 ve bir yol her kareden bir kez
          geçiyor, yani döngü kendiliğinden bitiyor — ama bozuk bir
          durumda sonsuza dönmesin diye sayaç konuldu.
        */
        for (let adim = 0; adim < EN_BUYUK_TAHTA * EN_BUYUK_TAHTA; adim++) {
          const son = yol[yol.length - 1];
          if (son === k) break;
          const dSatir = Math.floor(k / en) - Math.floor(son / en);
          const dSutun = (k % en) - (son % en);
          const yatay = Math.abs(dSutun) >= Math.abs(dSatir);
          const hedef = yatay ? son + Math.sign(dSutun) : son + Math.sign(dSatir) * en;
          const sonraki = kareEkle(yol, t.renk, hedef);
          if (sonraki === null) break;
          if (sonraki === yol) break;
          yol = sonraki;
        }
        return yol === t.yol ? t : { ...t, yol };
      });
    },
    [taslak, kareBul, kareEkle, en],
  );

  const birak = useCallback(() => {
    if (!taslak) return;
    const yol = taslak.yol;
    setTaslak(null);
    /* ⚠️ Tek kareye dokunmak hak YEMİYOR: yanlışlıkla dokunuş oyuncunun
       en kıt kaynağını harcamamalı. */
    if (yol.length < 2) return;

    const girdi: BaglaGirdisi = { y: yol };
    const sonraki = bagla.uygula(durum, girdi);
    if (!sonraki) {
      ses.cal("gecersiz");
      return;
    }
    if (odulIzinli && sonraki.odulAlindi && !durum.odulAlindi) ses.cal("odul");
    else if (sonraki.bolum > durum.bolum) ses.cal("kombo");
    else ses.cal("yerlesti");
    setDurum(sonraki);
    setGirdiler((p) => [...p, girdi]);
  }, [taslak, durum, odulIzinli, ses]);

  // ── Bitiş bildirimi ──────────────────────────────────
  useEffect(() => {
    if (bildirildi.current || !bagla.bittiMi(durum)) return;
    bildirildi.current = true;
    ses.cal("gecersiz");
    bitti(girdiler, bagla.skor(durum));
  }, [durum, girdiler, bitti, ses]);

  const skor = bagla.skor(durum);
  const merkez = (k: number): [number, number] => [(k % en) + 0.5, Math.floor(k / en) + 0.5];

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={baglaSahnesi()}>
      {/* ── Üst şerit ─────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-3 pb-1">
        <span className="flex items-center gap-2 px-3.5 py-1.5" style={baglaPanel()}>
          <span className="flex flex-col">
            <span className="font-display text-[8px] leading-none font-bold tracking-[0.16em] text-white/55 uppercase">
              Hak
            </span>
            <span
              key={durum.havuz}
              className="dusen-skor mt-0.5 font-display text-[18px] leading-none font-bold tabular"
              style={{ color: baglaHakRengi(durum.havuz) }}
            >
              {durum.havuz}
            </span>
          </span>
        </span>

        <span className="flex items-center gap-2 px-3.5 py-1.5" style={baglaPanel()}>
          <span className="font-display text-[8px] leading-none font-bold tracking-[0.16em] text-white/55 uppercase">
            Bölüm
          </span>
          <span className="font-display text-[18px] leading-none font-bold text-white tabular">
            {durum.bolum}
          </span>
        </span>

        <span className="flex items-center gap-2 px-3.5 py-1.5" style={baglaPanel()}>
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

        <span className="flex items-center" style={baglaPanel()}>
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

      {/* ── Tahta ───────────────────────────────── */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-2">
        <div
          ref={tahtaRef}
          onPointerDown={basla}
          onPointerMove={surukle}
          onPointerUp={birak}
          onPointerCancel={birak}
          className="relative select-none"
          style={{
            ...baglaTahtasi(),
            /* Bıçak/2048'deki desen: iki `min()` oranı her ekranda
               koruyor. `aspect-ratio` + `max-width` birlikte oranı
               sessizce iptal ediyor (Ü255). */
            width: "min(94vw, 64dvh)",
            height: "min(94vw, 64dvh)",
            padding: "2%",
            touchAction: "none",
          }}
        >
          {/* Kareler — yalnızca vuruş testi ve soluk ızgara. */}
          <div
            /* ⚠️ Boşluk YOK: SVG'deki yol koordinatları kare
               merkezlerini `(sütun + 0,5)` diye hesaplıyor ve ızgarada
               boşluk olsaydı o merkezler gerçek karelerden kayardı —
               sapma kenara doğru büyüyordu. Kareleri ayıran şey boşluk
               değil, kendi kenarlıkları. */
            className="grid h-full w-full gap-0"
            style={{
              gridTemplateColumns: `repeat(${en}, 1fr)`,
              gridTemplateRows: `repeat(${en}, 1fr)`,
            }}
          >
            {Array.from({ length: en * en }, (_, i) => (
              <div key={i} data-kare={i} style={baglaKaresi()} />
            ))}
          </div>

          {/* Yollar ve uçlar — SVG, çünkü kalın yuvarlak uçlu çizgi
              `div`lerle taklit edilince köşelerde kırılıyor. */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${en} ${en}`}
            style={{ padding: "2%" }}
            aria-hidden
          >
            {durum.yollar.map((yol, i) =>
              yol.length >= 2 ? (
                <polyline
                  key={`y${i}`}
                  points={yol.map((k) => merkez(k).join(",")).join(" ")}
                  fill="none"
                  stroke={baglaYolRengi(i + 1)}
                  strokeWidth={0.42}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.95}
                />
              ) : null,
            )}

            {taslak && taslak.yol.length >= 2 && (
              <polyline
                points={taslak.yol.map((k) => merkez(k).join(",")).join(" ")}
                fill="none"
                stroke={baglaYolRengi(taslak.renk)}
                strokeWidth={0.42}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.65}
              />
            )}

            {Array.from({ length: durum.renk }, (_, i) => i + 1).map((renk) =>
              ucNoktalari(durum.uclar, renk).map((k) => {
                const [x, y] = merkez(k);
                return (
                  <circle
                    key={`u${renk}-${k}`}
                    cx={x}
                    cy={y}
                    r={0.3}
                    fill={baglaYolRengi(renk)}
                    stroke="rgb(255 255 255 / .55)"
                    strokeWidth={0.035}
                  />
                );
              }),
            )}

            {/* Ödül paketi — Ü207: `kazandirir` false ise çizilmiyor. */}
            {paketVar && durum.paket !== null && (
              <circle
                className="nabiz"
                cx={merkez(durum.paket)[0]}
                cy={merkez(durum.paket)[1]}
                r={0.34}
                fill="none"
                stroke="#a7f3d0"
                strokeWidth={0.1}
              />
            )}
          </svg>
        </div>
      </div>

      {/* ── Alt şerit ─────────────────────────────── */}
      <div className="flex h-[42px] shrink-0 items-center justify-center px-3 pb-1">
        <span className="text-center text-[12px] leading-none font-semibold text-white/70">
          {taslak
            ? "Parmağını aynı renkteki öbür noktaya götür"
            : durum.havuz <= 8
              ? "Hakkın azalıyor"
              : "Noktadan başla · tahtanın tamamı dolmalı"}
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
        background: acik ? "rgba(240,217,168,.20)" : "transparent",
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
