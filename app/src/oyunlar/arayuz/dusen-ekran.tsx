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

export function DusenEkrani({ tohum, bitti }: OyunEkraniProps) {
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
  const aktifHucreler = new Set(
    PARCA_DONUSLERI[durum.parca][durum.donus].map(
      ([ds, dk]) => (durum.s + ds) * DUSEN_EN + (durum.k + dk),
    ),
  );

  return (
    <div className="oyun-alani">
      <div className="flex items-baseline justify-between">
        {/* Ü83: hedef yok — gösterilen şey ilerleme, kalan değil. Hız
            göstergesi zorluğun arttığını görünür kılıyor; oyuncu neden
            zorlandığını bilmeli. */}
        <span className="etiket-caps text-yazi-sonuk">
          {durum.temizlenen} satır · hız {hizKademesi(durum.dusmeTicki)}
        </span>
        <span className="font-data text-xl leading-none font-bold text-vurgu tabular">
          {durum.skor}
        </span>
      </div>

      <div
        className="mx-auto mt-4 grid gap-[2px] rounded-lg border border-cizgi bg-yuzey p-[2px]"
        style={{ gridTemplateColumns: `repeat(${DUSEN_EN}, minmax(0, 1fr))`, maxWidth: 320 }}
      >
        {Array.from({ length: DUSEN_EN * DUSEN_BOY }, (_, i) => {
          const s = Math.floor(i / DUSEN_EN);
          const k = i % DUSEN_EN;
          const yerlesik = (durum.izgara[s] & (1 << k)) !== 0;
          const aktif = aktifHucreler.has(i);

          return (
            <span
              key={i}
              className={`aspect-square ${
                aktif ? "bg-odul" : yerlesik ? "bg-vurgu" : "bg-cukur"
              }`}
            />
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        <Dugme etiket="◀" adi="Sola" onBas={() => hareket("sol")} />
        <Dugme etiket="↻" adi="Döndür" onBas={() => hareket("don")} />
        <Dugme etiket="▶" adi="Sağa" onBas={() => hareket("sag")} />
        <Dugme etiket="▼" adi="Bırak" onBas={() => hareket("birak")} vurgu />
      </div>
    </div>
  );
}

function Dugme({
  etiket,
  adi,
  onBas,
  vurgu,
}: {
  etiket: string;
  adi: string;
  onBas: () => void;
  vurgu?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onBas}
      aria-label={adi}
      className={`rounded-lg border border-cizgi bg-yuzey py-4 font-data text-xl select-none ${vurgu ? "text-odul-koyu" : "text-yazi"}`}
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
