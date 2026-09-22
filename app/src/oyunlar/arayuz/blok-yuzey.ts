import type { CSSProperties } from "react";

/**
 * Blok'un kendi yüzeyi — Ü202.
 *
 * ── Neden `tahta.tsx`ten ayrı ───────────────────────────────
 *
 * `tahta.tsx` oyunların ortak yüzeyi (Ü208'den beri düşen ve yılan;
 * Blok kendi yüzeyine geçti, Kelime sistemden çıktı).
 * Ürün sahibi Blok için ayrıntılı bir tasarım verdi — koyu sahne, parlak
 * panel, cam hücreler, şeker gibi çok renkli bloklar. Ortak dosyayı
 * değiştirmek diğer üç oyunu da sormadan değiştirmek olurdu.
 *
 * Blok referans uygulama: burada oturursa aynı dil ötekilere taşınır.
 * O güne kadar `tahta.tsx` olduğu gibi duruyor.
 *
 * ── Ürün sahibinin tarifi ───────────────────────────────────
 *
 * Numaralı ve ölçülü geldi, uygulanan da o:
 *
 *   arka plan   → radial gradient, lacivert → mor → siyah
 *   panel       → `#5ED6FF → #3A8BFF`, dış parıltı + iç gölge
 *   boş hücre   → `rgba(255,255,255,0.12)` — tam beyaz değil, cam
 *   dolu blok   → çok renkli; üstte highlight, ortada gradient,
 *                 altta gölge — "tıpkı şeker gibi"
 *
 * ── 🔴 Renk oyunun renginden GELMİYOR ───────────────────────
 *
 * Ü85'te tahta oyunun kimlik rengini alıyordu (blok = gök). Bu dosya
 * o kuralı Blok için **bilerek** kırıyor: ürün sahibi beş renkli bir
 * set istedi ve tek renkli bir tahta o seti veremez. Kimlik rengi
 * kaybolmuyor — panel hâlâ mavi ailede ve kartlar, ikon, başlık
 * `oyunRengi`den geliyor.
 */

/** Bir şeker bloğunun üç durağı. */
export type BlokRengi = {
  ad: string;
  ust: string;
  orta: string;
  alt: string;
  /** Parıltı — patlama ve seçim gölgesinde kullanılıyor. */
  isik: string;
};

/**
 * Şeker paleti.
 *
 * ⚠️ Altı renk, beş değil: ürün sahibinin listesi (turkuaz, mor, sarı,
 * turuncu, pembe) beş tondu ama parçalar sırayla renk alıyor ve beş
 * renk üç teklifle çakışık bir döngü kuruyor — her turda aynı üçlü
 * geliyordu. Altı renk üçe bölündüğü için de aynı sorun var; yedinci
 * renk yerine **sıra tur ve teklif indeksinden** türüyor (bkz.
 * `blokRengi`) ve çakışma kalkıyor.
 */
export const BLOK_RENKLERI: readonly BlokRengi[] = [
  { ad: "turkuaz", ust: "#7BF0E4", orta: "#22C3B8", alt: "#0C8078", isik: "#5EE7DC" },
  { ad: "mor", ust: "#C4B0FF", orta: "#7C4DEF", alt: "#4C1FAE", isik: "#A78BFA" },
  { ad: "sari", ust: "#FFE68F", orta: "#F5B31B", alt: "#B87C06", isik: "#FFD75E" },
  { ad: "turuncu", ust: "#FFBC8A", orta: "#F97316", alt: "#B34706", isik: "#FFA25E" },
  { ad: "pembe", ust: "#FFB3D4", orta: "#EC4899", alt: "#A81B60", isik: "#FF8FC0" },
  { ad: "mavi", ust: "#9BD8FF", orta: "#2F8FF5", alt: "#14509F", isik: "#6FC4FF" },
];

/**
 * Bir parçanın rengi — tur ve teklif sırasından.
 *
 * ⚠️ Rastgele DEĞİL: aynı tur aynı rengi veriyor. Rastgele olsaydı her
 * yeniden çizimde blok rengi değişirdi (React bileşeni tekrar
 * çalıştığında `Math.random()` yeni sayı üretir).
 *
 * ⚠️ Renk motorun durumuna GİRMİYOR. Motor skoru hesaplıyor ve sunucu
 * aynı girdileri tekrar oynatıyor; renk skora dokunmadığı için orada
 * işi yok. Sunum burada kalıyor.
 */
export function blokRengi(tur: number, teklif: number): number {
  return (tur * 5 + teklif * 2) % BLOK_RENKLERI.length;
}

/** Sahnenin zemini — oyun kendi karanlığında duruyor. */
export function blokSahnesi(): CSSProperties {
  return {
    background:
      "radial-gradient(ellipse 120% 80% at 50% 14%, #23306F 0%, #161E52 42%, #0B1020 100%)",
  };
}

/**
 * Tahtanın paneli — parlak mavi, dışı parıldıyor, içi gölgeli.
 *
 * ⚠️ İç gölge ŞART: onsuz panel sahnenin üstünde duran düz bir
 * dikdörtgen. İçeri düşen gölge onu bir **tepsi** yapıyor ve hücreler
 * o tepsinin içine oturuyor.
 */
export function blokTahtasi(): CSSProperties {
  return {
    background: "linear-gradient(180deg, #5ED6FF 0%, #3A8BFF 100%)",
    boxShadow: [
      "0 0 34px rgba(94,214,255,.34)",
      "0 14px 34px -12px rgba(7,20,60,.75)",
      "inset 0 5px 14px rgba(8,28,74,.38)",
      "inset 0 -2px 0 rgba(255,255,255,.22)",
    ].join(", "),
  };
}

/**
 * Boş hücre — parlak tepsiye GÖMÜLÜ cam.
 *
 * ── 🔴 Tarifteki sayı tutmadı, ölçüldü ──────────────────────
 *
 * Ürün sahibinin tarifi *"boş hücreler `rgba(255,255,255,0.12)`, tam
 * beyaz değil, biraz cam görünümü"* diyordu ve ilk sürüm harfi harfine
 * öyleydi. Ekranda ölçülünce ızgara kontrastı **1.06 – 1.17** çıktı.
 *
 * O sayı bu projede bir kez daha görüldü: Ü166'da aynı ölçüm 1.10
 * vermişti ve teşhis şuydu — *"ızgara ızgara değildi, üstünde hafif
 * bir doku olan düz bir levhaydı."* Ürün sahibi o gün de
 * *"oyunların arayüzleri çok çirkin"* demişti.
 *
 * Sebep tarifin içinde ve matematik: parlak bir zemine beyazın %12'sini
 * eklemek onu neredeyse hiç değiştirmiyor. İki istek (parlak panel +
 * açık hücre) aynı anda okunur bir ızgara veremez.
 *
 * Çözüm isteğin **hangisinden** vazgeçileceği: panel parlak KALIYOR
 * (ürün sahibinin açık tercihi), hücre açık değil **koyu** oluyor.
 * Cam hissi kaybolmuyor — camın rengi değişiyor, buzlu beyazdan
 * lacivert tonluya. Hücre artık tepside açılmış bir çukur.
 *
 * ⚠️ Alfa ölçülerek seçildi. Gradyanın üç noktasında kontrast:
 *
 *     alfa    alt    orta   üst
 *     0.14    1.20   1.24   1.27
 *     0.22    1.33   1.41   1.46
 *     **0.28  1.45   1.55   1.64**   ← Ü166 bandı (1.45–1.65)
 *     0.34    1.57   1.72   1.83     ← ızgara parçalardan çok bağırıyor
 */
export function blokBosHucre(): CSSProperties {
  return {
    background: "rgba(12,42,99,0.28)",
    boxShadow: [
      // İçeri düşen gölge: hücre tepsinin yüzeyinde değil, içinde.
      "inset 0 2px 3px rgba(6,22,58,.32)",
      // Alt kenardaki ince ışık — camın kalınlığı.
      "inset 0 -1px 0 rgba(255,255,255,.16)",
    ].join(", "),
  };
}

/**
 * Dolu blok — şeker.
 *
 * Üç katman tek `boxShadow`da:
 *   · üstte içeriden beyaz çizgi   → ışığın vurduğu yüz
 *   · altta içeriden koyu çizgi    → bloğun kalınlığı
 *   · dışarıda renkli hâle         → cam gibi parlaması
 */
export function blokDoluHucre(renk: BlokRengi): CSSProperties {
  return {
    background: `linear-gradient(180deg, ${renk.ust} 0%, ${renk.orta} 52%, ${renk.alt} 100%)`,
    boxShadow: [
      "inset 0 2px 0 rgba(255,255,255,.55)",
      `inset 0 -3px 0 ${renk.alt}`,
      "inset 0 0 0 1px rgba(255,255,255,.18)",
      `0 2px 6px -1px rgba(6,18,50,.5)`,
      `0 0 10px -2px ${renk.isik}`,
    ].join(", "),
  };
}

/**
 * Parçanın ineceği yer — sığıyorsa **yeşil hologram**, sığmıyorsa kırmızı.
 *
 * Ürün sahibinin tarifi: *"yerleşeceği yer yeşil hologram gibi
 * görünmeli."* Hologram hissi dolgudan değil **çerçeveden** geliyor:
 * içi yarı saydam, kenarı parlak ve keskin.
 */
export function blokHedefHucre(gecerli: boolean): CSSProperties {
  return gecerli
    ? {
        background: "rgba(74,222,128,.30)",
        boxShadow:
          "inset 0 0 0 2px rgba(134,239,172,.95), 0 0 14px rgba(74,222,128,.55)",
      }
    : {
        background: "rgba(244,63,94,.28)",
        boxShadow: "inset 0 0 0 2px rgba(253,164,175,.9)",
      };
}

/**
 * Kombo basamakları.
 *
 * ⚠️ Türkçe. Ürün sahibi örnekleri İngilizce yazdı (NICE, GREAT…) ama
 * ürünün tamamı Türkçe ve oyunun ortasında beliren tek kelime en çok
 * okunan kelime.
 *
 * ⚠️ Tek satır temizlikte kombo YOK: her temizlikte bağıran bir ekran
 * bir süre sonra okunmuyor. Kombo, olağanın üstündeki için.
 */
export const KOMBOLAR: readonly { esik: number; ad: string; renk: string }[] = [
  { esik: 2, ad: "GÜZEL", renk: "#5EE7DC" },
  { esik: 3, ad: "HARİKA", renk: "#FFD75E" },
  { esik: 4, ad: "MUHTEŞEM", renk: "#FFA25E" },
  { esik: 5, ad: "ÇILGIN", renk: "#FF8FC0" },
  { esik: 6, ad: "EFSANE", renk: "#C4B0FF" },
];

/** Bu temizliğin kombosu — yoksa `null`. */
export function komboBul(guc: number): (typeof KOMBOLAR)[number] | null {
  let bulunan: (typeof KOMBOLAR)[number] | null = null;
  for (const k of KOMBOLAR) if (guc >= k.esik) bulunan = k;
  return bulunan;
}
