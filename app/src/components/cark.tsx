"use client";

import { useState, useTransition } from "react";

/**
 * Şans çarkı (Ü49) — animasyon burada, karar sunucuda.
 *
 * ── Bu bileşen sonucu BELİRLEMİYOR ──────────────────────────
 *
 * `cevir()` bir sunucu eylemi ve hangi dilimde durulacağını o söylüyor.
 * Bileşenin tek işi, gelen dilim numarasında durmak. Rastgeleliği
 * tarayıcıya bıraksaydık çark, oyuncunun konsoldan düzenleyebileceği bir
 * kazanç makinesi olurdu.
 *
 * ── Dilimler eşit görünüyor ─────────────────────────────────
 *
 * Görsel olarak hepsi aynı büyüklükte; arka taraftaki ağırlıklar değil.
 * Ürün sahibinin kararı bu. Ekranın hiçbir yerinde "her ödül eşit olası"
 * yazmıyor — göstermediğimiz şey ile söylediğimiz şey aynı olmak zorunda.
 */

export type CarkDilimi = { baslik: string };

export type CevirmeCevabi =
  | { ok: true; dilim: number; baslik: string }
  | { ok: false; hata: string };

export function Cark({
  dilimler,
  cevir,
  altMetin,
  kazandiMetni,
}: {
  dilimler: CarkDilimi[];
  cevir: () => Promise<CevirmeCevabi>;
  /** Çevirmeden önce altta duran açıklama. */
  altMetin: string;
  /** Kazandıktan sonra ne yapması gerektiği — misafirde "hesap aç". */
  kazandiMetni: React.ReactNode;
}) {
  const [aci, setAci] = useState(0);
  const [sonuc, setSonuc] = useState<{ baslik: string } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [donuyor, setDonuyor] = useState(false);
  const [bekliyor, basla] = useTransition();

  const n = Math.max(1, dilimler.length);
  const dilimAcisi = 360 / n;

  const cevirmeyeBasla = () =>
    basla(async () => {
      setHata(null);
      const c = await cevir();
      if (!c.ok) {
        setHata(c.hata);
        return;
      }

      /**
       * Hedef dilimi tepedeki işaretin altına getir.
       *
       * `aci` hiç azalmıyor, hep büyüyor: geriye dönen bir çark, CSS
       * geçişinde ters yönde dönüyor gibi görünür ve "hile yapıldı"
       * hissi verir. Beş tam tur her seferinde ekleniyor.
       */
      const hedef = c.dilim * dilimAcisi + dilimAcisi / 2;
      const suanki = ((aci % 360) + 360) % 360;
      const fark = ((360 - hedef - suanki) % 360 + 360) % 360;

      setDonuyor(true);
      setAci(aci + 360 * 5 + fark);

      // Sonucu animasyon bitmeden yazmıyoruz: yazsaydık çark hâlâ
      // dönerken "kazandın" görünür ve dönüşün bir anlamı kalmazdı.
      window.setTimeout(() => {
        setSonuc({ baslik: c.baslik });
        setDonuyor(false);
      }, 4200);
    });

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[300px]">
        {/* Tepedeki işaret — çarkın nerede durduğunu okuyan tek nokta. */}
        <div
          aria-hidden
          className="absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1"
          style={{
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "16px solid var(--color-yazi)",
          }}
        />

        <div
          className="aspect-square w-full"
          style={{
            transform: `rotate(${aci}deg)`,
            transition: donuyor ? "transform 4s cubic-bezier(0.17, 0.67, 0.16, 1)" : "none",
          }}
        >
          <Tekerlek dilimler={dilimler} />
        </div>
      </div>

      {hata && (
        <p className="mt-5 rounded-lg border border-tehlike/50 bg-cukur px-4 py-3 text-center text-[14px] text-tehlike">
          {hata}
        </p>
      )}

      {sonuc ? (
        <div className="mt-6 w-full rounded-2xl border border-odul bg-cukur px-5 py-5 text-center">
          <div className="etiket-caps text-odul-koyu">Kazandın</div>
          <div className="mt-2 font-display text-2xl leading-tight font-extrabold">
            {sonuc.baslik}
          </div>
          <div className="mt-3 text-[14px] leading-relaxed text-yazi-sonuk">{kazandiMetni}</div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={cevirmeyeBasla}
            disabled={bekliyor || donuyor}
            className="mt-7 w-full rounded-lg bg-vurgu px-5 py-4 font-display text-[17px] font-bold tracking-tight text-white transition-colors hover:bg-vurgu/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {donuyor ? "Dönüyor…" : bekliyor ? "…" : "Çarkı çevir"}
          </button>
          <p className="mt-3 text-center text-[13px] leading-relaxed text-yazi-sonuk">
            {altMetin}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Çarkın kendisi — tek SVG.
 *
 * Kütüphane yok: dilimler `path` ile çiziliyor. Bir çark için animasyon
 * kütüphanesi indirmek, kafede mobil veriyle açılan bir sayfada
 * ödeyeceğimiz en gereksiz bedel olurdu.
 */
function Tekerlek({ dilimler }: { dilimler: CarkDilimi[] }) {
  const n = Math.max(1, dilimler.length);
  const adim = 360 / n;
  const R = 50;

  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      {dilimler.map((d, i) => {
        const bas = i * adim - 90;
        const son = bas + adim;
        return (
          <path
            key={i}
            d={dilimYolu(50, 50, R, bas, son)}
            // Renkler paletten ve dönüşümlü: çark için yeni renk
            // tanımlanmadı (isletme tarafındaki palet disiplini).
            fill={i % 2 === 0 ? "var(--color-vurgu)" : "var(--color-yuzey)"}
            stroke="var(--color-cizgi)"
            strokeWidth="0.5"
          />
        );
      })}

      {dilimler.map((d, i) => {
        const ortaDeg = yuvarla(i * adim + adim / 2);
        const orta = (ortaDeg - 90) * (Math.PI / 180);
        const x = yuvarla(50 + Math.cos(orta) * 32);
        const y = yuvarla(50 + Math.sin(orta) * 32);
        // Alt yarıdaki dilimlerde yazı ters duruyordu: dilimle birlikte
        // döndüğü için saat 6 yönünde baş aşağı kalıyor. 180 derece daha
        // çevirince okunur hâle geliyor.
        const tersMi = ortaDeg > 90 && ortaDeg < 270;
        return (
          <text
            key={`y-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="4.2"
            fontWeight="700"
            fill={i % 2 === 0 ? "#fff" : "var(--color-yazi)"}
            transform={`rotate(${ortaDeg + (tersMi ? 180 : 0)} ${x} ${y})`}
          >
            {kisalt(d.baslik)}
          </text>
        );
      })}

      <circle cx="50" cy="50" r="7" fill="var(--color-yuzey)" stroke="var(--color-cizgi)" />
    </svg>
  );
}

function dilimYolu(cx: number, cy: number, r: number, basDeg: number, sonDeg: number): string {
  const bas = (basDeg * Math.PI) / 180;
  const son = (sonDeg * Math.PI) / 180;
  const x1 = yuvarla(cx + r * Math.cos(bas));
  const y1 = yuvarla(cy + r * Math.sin(bas));
  const x2 = yuvarla(cx + r * Math.cos(son));
  const y2 = yuvarla(cy + r * Math.sin(son));
  const buyuk = sonDeg - basDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${buyuk} 1 ${x2} ${y2} Z`;
}

/**
 * Koordinatları sabit hassasiyete indirir.
 *
 * Yuvarlanmadığında React hidrasyon uyarısı veriyordu: aynı hesap sunucuda
 * `22.28718707889797`, tarayıcıda `22.287187078897972` yazılıyor ve React
 * bunu "sunucu ile istemci farklı" sayıyor. Üç hane çarkı çizmeye fazlasıyla
 * yetiyor.
 */
function yuvarla(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Dilim dar; uzun başlık okunmuyor, taşıyor. */
function kisalt(s: string): string {
  return s.length > 14 ? `${s.slice(0, 13)}…` : s;
}
