"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  dusen,
  PARCA_DONUSLERI,
  DUSEN_EN,
  DUSEN_BOY,
  type DusenDurumu,
  type DusenGirdisi,
  type DusenHareket,
} from "../dusen";
import { TICK_MS } from "../sozlesme";
import { hucreStili, oyunTonu, tahtaStili } from "./tahta";
import type { OyunEkraniProps } from "./ortak";

/**
 * Düşen ekranı.
 *
 * ── Girdi kaydının inceliği ─────────────────────────────────
 *
 * Ekran her tick'te yerçekimini yerel olarak ilerletiyor ama **bunları
 * kaydetmiyor**; yalnızca oyuncunun hareketleri kaydediliyor, sonuna da tek
 * bir `bekle` ekleniyor. Sunucu aynı sonuca varıyor çünkü yerçekimi
 * `zamaniIlerlet` içinde tick aralığına göre işliyor: 0→100 tek adımda da,
 * 0→50→100 iki adımda da aynı tahtayı veriyor. Kayıt böylece binlerce
 * satır yerine onlarca satır oluyor.
 *
 * ── Neden girdi kaydı da durumun içinde ─────────────────────
 *
 * Yerçekimi zamanlayıcısı ile oyuncunun dokunuşu aynı anda gelebiliyor.
 * Kayıt ayrı bir `ref`'te tutulsaydı, güncelleyicinin içinde ona yazmak
 * gerekirdi — ve React güncelleyiciyi iki kez çağırdığında (StrictMode)
 * aynı hamle iki kez kaydedilirdi. Sunucu o kaydı yeniden oynatınca tahta
 * ayrışır ve **dürüst oyuncunun skoru reddedilirdi.**
 *
 * Kayıt durumun parçası olunca güncelleyici saf kalıyor: aynı girdiden
 * aynı çıktı. Kaç kez çağrıldığı önemsiz.
 */

/**
 * ⚠️ Ü84: tick **duvar saatinden** hesaplanıyor, sayarak değil.
 *
 * Sayarak ilerletmek iki yerde bozuluyordu — Kelime'de de aynısı yaşandı:
 *
 *   · Tarayıcı gizli sekmede `setInterval`i kısıyor (ölçüldü: saniyede 20
 *     yerine ~1,5 tick), yani yerçekimi fiilen duruyordu.
 *   · Oyuncu sekmeyi arkaya atıp parçayı istediği kadar havada tutabiliyordu.
 *
 * Ayrıca sunucunun saat kontrolü (Ü84) ancak dürüst istemci gerçek zamanı
 * bildirirse çalışır; sayan istemci meşru olarak geri kalır ve kontrolü
 * yanlış yere tetiklerdi.
 */

type Yerel = {
  durum: DusenDurumu;
  girdiler: DusenGirdisi[];
  tick: number;
};

export function DusenEkrani({ oyunId, tohum, bitti }: OyunEkraniProps) {
  const [y, setY] = useState<Yerel>(() => ({
    durum: dusen.baslat(tohum),
    girdiler: [],
    tick: 0,
  }));
  const bildirildi = useRef(false);

  // ── Yerçekimi ────────────────────────────────────────
  useEffect(() => {
    const baslangic = Date.now();
    const zamanlayici = setInterval(() => {
      setY((p) => {
        if (dusen.bittiMi(p.durum)) return p;
        const tick = Math.floor((Date.now() - baslangic) / TICK_MS);
        if (tick <= p.tick) return p;
        const sonraki = dusen.uygula(p.durum, { tick, a: "bekle" });
        return { ...p, tick, durum: sonraki ?? p.durum };
      });
    }, TICK_MS);

    return () => clearInterval(zamanlayici);
  }, []);

  // ── Bitiş bildirimi ──────────────────────────────────
  // Render sırasında değil, efektte: `bitti` üst bileşende durum değiştiriyor.
  useEffect(() => {
    if (bildirildi.current || !dusen.bittiMi(y.durum)) return;
    bildirildi.current = true;

    // Sunucunun yerçekimini aynı noktaya kadar ilerletmesi için son bir
    // zaman işareti. Bu olmadan sunucu son hamlede durur ve tahta ayrışır.
    bitti([...y.girdiler, { tick: y.tick, a: "bekle" }], dusen.skor(y.durum));
  }, [y, bitti]);

  const hareket = useCallback((a: DusenHareket) => {
    setY((p) => {
      if (dusen.bittiMi(p.durum)) return p;
      const girdi: DusenGirdisi = { tick: p.tick, a };
      const sonraki = dusen.uygula(p.durum, girdi);
      if (!sonraki) return p;
      return { ...p, durum: sonraki, girdiler: [...p.girdiler, girdi] };
    });
  }, []);

  // ── Klavye (masaüstünde test için) ───────────────────
  useEffect(() => {
    const eslesme: Record<string, DusenHareket> = {
      ArrowLeft: "sol",
      ArrowRight: "sag",
      ArrowUp: "don",
      ArrowDown: "in",
      " ": "birak",
    };
    const tus = (e: KeyboardEvent) => {
      const a = eslesme[e.key];
      if (!a) return;
      e.preventDefault();
      hareket(a);
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [hareket]);

  const durum = y.durum;
  const r = oyunTonu(oyunId);
  const aktifHucreler = new Set(
    PARCA_DONUSLERI[durum.parca][durum.donus].map(
      ([ds, dk]) => (durum.s + ds) * DUSEN_EN + (durum.k + dk),
    ),
  );

  return (
    <div className="oyun-alani">
      <div className="flex items-baseline justify-between gap-3">
        {/* Ü83: hedef yok — gösterilen şey ilerleme, kalan değil. */}
        <span className="etiket-caps text-yazi-sonuk">{durum.temizlenen} satır</span>
        <span className="flex items-baseline gap-2.5">
          {/* Hız göstergesi zorluğun arttığını görünür kılıyor: oyuncu
              neden zorlandığını bilmeli, yoksa oyun haksız hissettirir. */}
          <HizSeridi kademe={hizKademesi(durum.dusmeTicki)} renk={r.ana} />
          {/* `key` skorla değişiyor ki her artışta animasyon yeniden koşsun. */}
          <span
            key={durum.skor}
            className="patla font-data text-2xl leading-none font-bold tabular"
            style={{ color: r.ana }}
          >
            {durum.skor}
          </span>
        </span>
      </div>

      <div
        className="kart-golge mx-auto mt-4 grid gap-[2px] rounded-2xl p-1.5"
        style={{
          ...tahtaStili(oyunId),
          gridTemplateColumns: `repeat(${DUSEN_EN}, minmax(0, 1fr))`,
          maxWidth: 320,
        }}
      >
        {Array.from({ length: DUSEN_EN * DUSEN_BOY }, (_, i) => {
          const s = Math.floor(i / DUSEN_EN);
          const k = i % DUSEN_EN;
          const yerlesik = (durum.izgara[s] & (1 << k)) !== 0;
          const aktif = aktifHucreler.has(i);

          return (
            <span
              key={i}
              className="aspect-square rounded-[3px]"
              style={hucreStili(oyunId, aktif ? "aktif" : yerlesik ? "dolu" : "bos")}
            />
          );
        })}
      </div>

      {/* Bırak düğmesi tam genişlikte ve altta: en sık basılan tuş o ve
          başparmağın doğal olarak durduğu yer orası. Yön tuşları üstte
          üçe bölünüyor — dört eşit kutuda "bırak" diğerleriyle
          karışıyordu ve oyuncu yanlışlıkla parçayı düşürüyordu. */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Dugme etiket="◀" adi="Sola" onBas={() => hareket("sol")} renk={r.ana} />
        <Dugme etiket="↻" adi="Döndür" onBas={() => hareket("don")} renk={r.ana} />
        <Dugme etiket="▶" adi="Sağa" onBas={() => hareket("sag")} renk={r.ana} />
      </div>
      <button
        type="button"
        onClick={() => hareket("birak")}
        aria-label="Bırak"
        className="mt-2 w-full rounded-2xl py-4 font-display text-[15px] font-bold tracking-wide text-white uppercase transition-transform active:scale-[0.98]"
        style={{ background: r.ana, boxShadow: `0 4px 12px -4px ${r.koyu}66` }}
      >
        Bırak ▼
      </button>
    </div>
  );
}

/**
 * Hız kademesi — on iki çubuk, dolu olanlar kadar hızlı.
 *
 * Sayı yerine çubuk: "hız 7" okunması gereken bir şey, dolan bir şerit
 * bir bakışta görülüyor. Ü83'te hız turun içinde arttığı için bu şerit
 * oyun boyunca doluyor ve oyuncu zorluğun kendisini izliyor.
 */
function HizSeridi({ kademe, renk }: { kademe: number; renk: string }) {
  const EN_COK = 12;
  return (
    <span className="flex items-center gap-[3px]" aria-label={`Hız ${kademe}`}>
      {Array.from({ length: EN_COK }, (_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full transition-[height,background] duration-200"
          style={{
            height: 6 + Math.min(i, EN_COK - 1) * 0.5,
            background: i < kademe ? renk : `${renk}2e`,
          }}
        />
      ))}
    </span>
  );
}

function Dugme({
  etiket,
  adi,
  onBas,
  renk,
}: {
  etiket: string;
  adi: string;
  onBas: () => void;
  renk: string;
}) {
  return (
    <button
      type="button"
      onClick={onBas}
      aria-label={adi}
      className="rounded-2xl bg-yuzey py-4 font-data text-2xl leading-none select-none transition-transform active:scale-95"
      style={{ border: `1px solid ${renk}40`, color: renk, boxShadow: `0 1px 2px ${renk}1a` }}
    >
      {etiket}
    </button>
  );
}

/**
 * Düşme hızını okunur bir kademeye çevirir.
 *
 * Tick sayısı oyuncuya bir şey söylemiyor (üstelik ters yönde artıyor);
 * "hız 4" söylüyor. 28 tick → 1, 5 tick → 12.
 */
function hizKademesi(dusmeTicki: number): number {
  return Math.max(1, Math.round((28 - dusmeTicki) / 2) + 1);
}
