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
 * ── Neden hiç sökülmüyor ────────────────────────────────────
 *
 * İlk sürümde çark, sunucu "artık kapalı" dediği anda başka bir bileşenle
 * değiştiriliyordu. Çevirme anında tam olarak bu oluyordu: kupon
 * yazılıyor, sayfa tazeleniyor, çark sökülüyor ve oyuncu ne dönüşü ne de
 * ödülünü görüyordu. Artık kilitli hâl de aynı bileşende — `kilitli`
 * yalnızca düğmeyi kapatıyor, bileşeni değiştirmiyor.
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

/** Dönüş süresi (ms) — animasyon ve sonucun açılması bu süreye bağlı. */
const DONUS_MS = 4600;

/** Kaç tam tur atsın — az turda çark "kaydı" gibi duruyor. */
const TUR = 6;

export function Cark({
  dilimler,
  cevir,
  kilitli = false,
  altMetin,
  kazandiMetni,
}: {
  dilimler: CarkDilimi[];
  cevir: () => Promise<CevirmeCevabi>;
  /** Kapalı çark: düğme çalışmıyor ama çark yerinde duruyor. */
  kilitli?: boolean;
  /** Çevirmeden önce altta duran açıklama. */
  altMetin: string;
  /** Kazandıktan sonra ne yapması gerektiği — misafirde "hesap aç". */
  kazandiMetni: React.ReactNode;
}) {
  const [aci, setAci] = useState(0);
  const [sonuc, setSonuc] = useState<{ baslik: string; dilim: number } | null>(null);
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
       * hissi verir.
       */
      const hedef = c.dilim * dilimAcisi + dilimAcisi / 2;
      const suanki = ((aci % 360) + 360) % 360;
      const fark = (((360 - hedef - suanki) % 360) + 360) % 360;

      setDonuyor(true);
      setAci(aci + 360 * TUR + fark);

      // Sonucu animasyon bitmeden yazmıyoruz: yazsaydık çark hâlâ
      // dönerken "kazandın" görünür ve dönüşün bir anlamı kalmazdı.
      window.setTimeout(() => {
        setSonuc({ baslik: c.baslik, dilim: c.dilim });
        setDonuyor(false);
      }, DONUS_MS);
    });

  const dugmeKapali = kilitli || bekliyor || donuyor || !!sonuc;

  return (
    <div className="flex flex-col items-center">
      <div className={`relative w-full max-w-[320px] ${kilitli && !sonuc ? "opacity-45" : ""}`}>
        {/* Tepedeki işaret — çarkın nerede durduğunu okuyan tek nokta. */}
        <div
          aria-hidden
          className="absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-[3px] drop-shadow"
          style={{
            width: 0,
            height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "20px solid var(--color-yazi)",
          }}
        />

        <div
          className="aspect-square w-full"
          style={{
            transform: `rotate(${aci}deg)`,
            // Yavaşlayarak duran eğri: çarkın son yarım turu belirgin
            // biçimde ağırlaşıyor, gerçek bir çark gibi.
            transition: donuyor
              ? `transform ${DONUS_MS}ms cubic-bezier(0.12, 0.68, 0.06, 1)`
              : "none",
          }}
        >
          <Tekerlek dilimler={dilimler} kazanan={sonuc?.dilim ?? null} />
        </div>

        {/* Ortadaki çevir düğmesi — gerçek çarklarda göbek basılır. */}
        <button
          type="button"
          onClick={cevirmeyeBasla}
          disabled={dugmeKapali}
          aria-label="Çarkı çevir"
          className={`absolute top-1/2 left-1/2 z-10 flex size-[21%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-yuzey font-display text-[13px] font-extrabold tracking-tight text-white shadow-lg transition-transform ${
            dugmeKapali ? "bg-yazi-sonuk" : "bg-yazi hover:scale-105 active:scale-95"
          }`}
        >
          {donuyor ? "…" : sonuc ? "✓" : "ÇEVİR"}
        </button>
      </div>

      {hata && (
        <p className="mt-5 rounded-lg border border-tehlike/50 bg-cukur px-4 py-3 text-center text-[14px] text-tehlike">
          {hata}
        </p>
      )}

      {sonuc ? (
        <div className="mt-6 w-full overflow-hidden rounded-2xl border border-odul bg-cukur px-5 py-6 text-center">
          <div className="text-3xl leading-none" aria-hidden>
            🎉
          </div>
          <div className="etiket-caps mt-3 text-odul-koyu">Kazandın</div>
          <div className="mt-1.5 font-display text-2xl leading-tight font-extrabold">
            {sonuc.baslik}
          </div>
          <div className="mt-3 text-[14px] leading-relaxed text-yazi-sonuk">{kazandiMetni}</div>
        </div>
      ) : (
        <p className="mt-5 max-w-[300px] text-center text-[13px] leading-relaxed text-yazi-sonuk">
          {donuyor ? "Çark dönüyor…" : altMetin}
        </p>
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
function Tekerlek({ dilimler, kazanan }: { dilimler: CarkDilimi[]; kazanan: number | null }) {
  const n = Math.max(1, dilimler.length);
  const adim = 360 / n;
  const R = 47;

  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      {/* Dış çember — çarkın kasası. */}
      <circle cx="50" cy="50" r="49" fill="var(--color-yazi)" />

      {dilimler.map((d, i) => {
        const bas = i * adim - 90;
        const son = bas + adim;
        const kazandi = kazanan === i;
        return (
          <path
            key={i}
            d={dilimYolu(50, 50, R, bas, son)}
            fill={kazandi ? "var(--color-odul)" : DOLGULAR[i % DOLGULAR.length]}
            stroke="var(--color-yazi)"
            strokeWidth="0.6"
            style={{ transition: "fill 400ms" }}
          />
        );
      })}

      {/*
        Yazılar **ışınsal**: merkezden dışa doğru okunuyor.

        Bir ara sürüm yazıyı dilime teğet koyuyor ve alt yarıdakileri 180
        derece çevirerek düzeltiyordu. O düzeltme yalnızca çark hiç
        dönmemişken doğruydu: çark 2370 derecede durunca "alt yarı"
        başka bir yere kayıyor ve altı dilimin beşi baş aşağı kalıyordu.

        Işınsal yerleşimde yazının yönü dilime bağlı, çarkın konumuna
        değil — nerede durursa dursun aynı görünüyor. Gerçek çarklar da
        böyle yazıyor.
      */}
      {dilimler.map((d, i) => {
        const ortaDeg = yuvarla(i * adim + adim / 2);
        const orta = (ortaDeg - 90) * (Math.PI / 180);
        const x = yuvarla(50 + Math.cos(orta) * 29);
        const y = yuvarla(50 + Math.sin(orta) * 29);
        return (
          <text
            key={`y-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="4.4"
            fontWeight="800"
            fill={YAZI_RENKLERI[i % DOLGULAR.length]}
            transform={`rotate(${yuvarla(ortaDeg - 90)} ${x} ${y})`}
          >
            {kisalt(d.baslik)}
          </text>
        );
      })}

      {/* Kasadaki ışıklar — çarkın "eğlenceli" duran tek süsü. */}
      {Array.from({ length: n * 2 }, (_, i) => {
        const a = ((i * (360 / (n * 2)) - 90) * Math.PI) / 180;
        return (
          <circle
            key={`i-${i}`}
            cx={yuvarla(50 + Math.cos(a) * 48)}
            cy={yuvarla(50 + Math.sin(a) * 48)}
            r="1.1"
            fill="var(--color-odul)"
          />
        );
      })}
    </svg>
  );
}

/**
 * Dilim renkleri.
 *
 * Palet disiplini korunuyor: yeni renk tanımlanmadı, mevcut iki jeton
 * (vurgu ve ödül) ve yüzey dönüşümlü kullanılıyor. Dördüncü bir renk
 * uydurmak yerine tekrar etmeyi tercih ettik — çark, paleti bozmak için
 * yeterli bir gerekçe değil.
 */
const DOLGULAR = [
  "var(--color-vurgu)",
  "var(--color-yuzey)",
  "var(--color-odul)",
  "var(--color-yuzey)",
];

/** Her dolgunun üstünde okunan yazı rengi. */
const YAZI_RENKLERI = ["#ffffff", "var(--color-yazi)", "var(--color-yazi)", "var(--color-yazi)"];

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

/**
 * Dilim dar; uzun başlık okunmuyor, taşıyor.
 *
 * Işınsal yerleşimde yazı yarıçap boyunca uzuyor, yani sınır dilim
 * sayısına değil çarkın yarıçapına bağlı — on beş karakter altı dilimde
 * de sekiz dilimde de sığıyor.
 */
function kisalt(s: string): string {
  return s.length > 15 ? `${s.slice(0, 14)}…` : s;
}
