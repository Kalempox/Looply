"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { OdulAcilisi } from "./odul-acilisi";

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
  koyuZemin = false,
  donusBildir,
}: {
  dilimler: CarkDilimi[];
  cevir: () => Promise<CevirmeCevabi>;
  /** Kapalı çark: düğme çalışmıyor ama çark yerinde duruyor. */
  kilitli?: boolean;
  /** Çevirmeden önce altta duran açıklama. */
  altMetin: string;
  /** Kazandıktan sonra ne yapması gerektiği — misafirde "hesap aç". */
  kazandiMetni: React.ReactNode;
  /**
   * Sahnede mi çiziliyor (Ü59)?
   *
   * Tam ekran sahnenin zemini koyu mor; oradaki yazılar açık renk
   * olmak zorunda. Ayrı bir bileşen yazmak yerine tek bayrak: iki
   * kopya, biri güncellenmeden kalır.
   */
  koyuZemin?: boolean;
  /** Dönüş başladı/bitti — sahne bunu bilip kapatmayı kilitliyor. */
  donusBildir?: (donuyor: boolean) => void;
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
      donusBildir?.(true);
      setAci(aci + 360 * TUR + fark);

      // Sonucu animasyon bitmeden yazmıyoruz: yazsaydık çark hâlâ
      // dönerken "kazandın" görünür ve dönüşün bir anlamı kalmazdı.
      window.setTimeout(() => {
        setSonuc({ baslik: c.baslik, dilim: c.dilim });
        setDonuyor(false);
        donusBildir?.(false);
      }, DONUS_MS);
    });

  const dugmeKapali = kilitli || bekliyor || donuyor || !!sonuc;

  /**
   * Sonuç göründüğünde onu ekrana getir.
   *
   * Tam ekran sahnede çark + sonuç kartı toplamı 1200 pikseli geçiyor,
   * telefon ekranı 812. Kazanma anında oyuncu ödülü görmüyor, aşağı
   * kaydırması gerekiyordu — dönüşün bütün etkisini yiyen bir kusur.
   *
   * İki şey birden: çark küçülüyor (aşağıda `max-w`) ve sonuç ekranın
   * ortasına kaydırılıyor. Yalnızca küçültmek yetmiyordu, yalnızca
   * kaydırmak da — ikisi birlikte sonucu ilk bakışta görünür yapıyor.
   */
  const sonucRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sonuc) return;
    sonucRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [sonuc]);

  return (
    <div className="flex flex-col items-center">
      <div
        // Kazanıldığında çark küçülüyor: sahnenin yıldızı artık ödül.
        className={`relative mx-auto w-full transition-[max-width] duration-500 ${
          sonuc
            ? "max-w-[190px]"
            : koyuZemin
              ? "max-w-[400px]"
              : "max-w-[320px]"
        } ${kilitli && !sonuc ? "opacity-45" : ""}`}
      >
        {/*
          Tepedeki işaret — çarkın nerede durduğunu okuyan tek nokta.

          Damla biçimi: referанс çarklarda ok sivri üçgen değil, ucu
          aşağı bakan yuvarlak bir damla. Üçgen sert duruyordu ve
          çarkın yumuşak hatlarıyla çelişiyordu.
        */}
        <svg
          aria-hidden
          viewBox="0 0 24 34"
          className="absolute top-0 left-1/2 z-20 w-7 -translate-x-1/2 translate-y-1 drop-shadow-md"
        >
          <path
            d="M12 34C12 34 2 20.5 2 12a10 10 0 1 1 20 0c0 8.5-10 22-10 22Z"
            fill="var(--color-odul)"
            stroke="#fff"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="3.4" fill="#fff" />
        </svg>

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
          // Göbek koyu değil sıcak: siyah bir daire, pastel çarkın
          // ortasında delik gibi duruyordu. Referans çarklarda göbek
          // kasayla aynı aileden ve çarkın parçası gibi görünüyor.
          className={`absolute top-1/2 left-1/2 z-10 flex size-[23%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[5px] border-white font-display text-[12px] font-extrabold tracking-tight shadow-lg transition-transform ${
            dugmeKapali
              ? "bg-[#f0d9a8] text-[#8a7145]"
              : "bg-[#ffcf3f] text-[#2b1b33] hover:scale-105 active:scale-95"
          }`}
        >
          {donuyor ? "…" : sonuc ? "✓" : "ÇEVİR"}
        </button>
      </div>

      {hata && (
        <p
          className={`mt-5 rounded-lg border px-4 py-3 text-center text-[14px] ${
            koyuZemin
              ? "border-white/25 bg-white/10 text-white"
              : "border-tehlike/50 bg-cukur text-tehlike"
          }`}
        >
          {hata}
        </p>
      )}

      {sonuc ? (
        <div ref={sonucRef} className="mt-5 w-full scroll-mt-6">
          {/* Ü56: emoji yerine açılan hediye kutusu. Ürün sahibinin
              verdiği Lottie örneğindeki hareket, kütüphanesiz. */}
          <OdulAcilisi baslik={sonuc.baslik} altMetin={kazandiMetni} koyuZemin={koyuZemin} />
        </div>
      ) : (
        <p
          className={`mt-5 max-w-[320px] text-center text-[13px] leading-relaxed ${
            koyuZemin ? "text-white/70" : "text-yazi-sonuk"
          }`}
        >
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
  const R = 43;

  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      <defs>
        {/* Kasanın hafif hacmi — düz renk çemberi yassı duruyordu. */}
        <linearGradient id="cark-kasa" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff7a9c" />
          <stop offset="100%" stopColor="#e5316b" />
        </linearGradient>
      </defs>

      {/* Dış kasa — ampullerin oturduğu renkli halka. */}
      <circle cx="50" cy="50" r="48.5" fill="url(#cark-kasa)" />
      <circle cx="50" cy="50" r="44.5" fill="#fff" />

      {dilimler.map((d, i) => {
        const dilimBas = i * adim - 90;
        const dilimSon = dilimBas + adim;
        const kazandi = kazanan === i;
        return (
          <path
            key={i}
            d={dilimYolu(50, 50, R, dilimBas, dilimSon)}
            fill={kazandi ? KAZANAN_DOLGU : DOLGULAR[i % DOLGULAR.length]}
            stroke="#fff"
            strokeWidth="1"
            style={{ transition: "fill 400ms" }}
          />
        );
      })}

      {/*
        Yazılar **ışınsal**: merkezden dışa doğru okunuyor.

        Bir ara sürüm yazıyı dilime teğet koyuyor ve alt yarıdakileri 180
        derece çevirerek düzeltiyordu. O düzeltme yalnızca çark hiç
        dönmemişken doğruydu: çark 2490 derecede durunca "alt yarı"
        başka bir yere kayıyor ve altı dilimin beşi baş aşağı kalıyordu.

        Işınsal yerleşimde yazının yönü dilime bağlı, çarkın konumuna
        değil — nerede durursa dursun aynı görünüyor.

        Tek yazı rengi: dilimler pastel ve hepsi açık, koyu mor her
        birinde okunuyor. Dolguya göre değişen renk listesi, dilim sayısı
        ile renk sayısı bölünmediğinde yanlış eşleşiyordu.
      */}
      {dilimler.map((d, i) => {
        const ortaDeg = yuvarla(i * adim + adim / 2);
        const orta = (ortaDeg - 90) * (Math.PI / 180);
        const x = yuvarla(50 + Math.cos(orta) * 27);
        const y = yuvarla(50 + Math.sin(orta) * 27);
        return (
          <text
            key={`y-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="4.2"
            fontWeight="800"
            fill="#2b1b33"
            transform={`rotate(${yuvarla(ortaDeg - 90)} ${x} ${y})`}
          >
            {kisalt(d.baslik)}
          </text>
        );
      })}

      {/*
        Kasadaki ampuller.

        Sayı dilim sayısından **bağımsız** ve sabit on altı: dilim başına
        iki ampul konsaydı üç ödüllü bir kafede altı ampullü seyrek bir
        çember çıkardı. Sabit sayı her boyutta dolu duruyor.
      */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = ((i * (360 / 16) - 90) * Math.PI) / 180;
        return (
          <circle
            key={`a-${i}`}
            cx={yuvarla(50 + Math.cos(a) * 46.4)}
            cy={yuvarla(50 + Math.sin(a) * 46.4)}
            r="1.5"
            fill="#fff2b8"
            stroke="#ffd24a"
            strokeWidth="0.5"
          />
        );
      })}
    </svg>
  );
}

/**
 * Dilim renkleri — **paletin bilinçli istisnası**.
 *
 * ── Neden istisna ───────────────────────────────────────────
 *
 * Ürünün paleti dört jetonla sınırlı ve işletme tarafında bu disiplin
 * aynen korunuyor. Çark tek renk ailesiyle çizildiğinde (mavi/beyaz/
 * altın) ürün sahibinin deyimiyle *"ucuz ve kalitesiz"* duruyordu ve
 * haklıydı: bir şans çarkı anlamını renk çeşitliliğinden alıyor.
 * Referans çarkların hepsi altı yedi pastel tonla çiziliyor.
 *
 * ── Neden burada, globals.css'te değil ──────────────────────
 *
 * Bu renkler **yalnızca çarkta** geçerli. `globals.css` içine jeton
 * olarak konsalardı ürünün her yerinden erişilebilir olur ve palet
 * fiilen genişlerdi — bir sonraki ekranda "bu mor da var madem" denirdi.
 * Burada durdukları sürece kapsam tek bileşen.
 *
 * Tonlar bilerek pastel: ekranın geri kalanı sakin kalıyor, çark tek
 * başına parlıyor.
 */
const DOLGULAR = [
  "#8b7cf6", // menekşe
  "#fef3c7", // krem
  "#5eead4", // nane
  "#fecdd3", // pembe
  "#fde68a", // sarı
  "#a5b4fc", // lavanta
];

/** Kazanan dilim — kasanın rengiyle aynı aileden, en doygun ton. */
const KAZANAN_DOLGU = "#ffcf3f";

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
