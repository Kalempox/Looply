import Image from "next/image";

/**
 * Kartların zemini ve illüstrasyonu — Ü189.
 *
 * ── Ürün sahibinin isteği ───────────────────────────────────
 *
 * Referans gönderdi ve iki şey istedi: kartın arkasında **organik dalga
 * şekilleri**, sağında da kartın konusunu anlatan **büyük bir 3B
 * illüstrasyon**.
 *
 * ── 🔴 Neden ışık değil, dalga ──────────────────────────────
 *
 * Ü188'de zemine sağ üstten gelen ışık hüzmeleri konmuştu ve ürün
 * sahibi *"her şeye sağ üstten parlaklık eklemişsin, ben bunu
 * istemiyorum, kötü duruyor"* dedi. İki ayrı hata vardı:
 *
 *   1. Doku 3:4 dikey çizilmişti ama her karta `100% 100%` ile
 *      GERİLİYORDU. 244×356'lık karusel kartında oturuyor, 335×96'lık
 *      yatay kartta aynı hüzmeler yassılıp geniş bir lekeye dönüyordu.
 *   2. İstenen şey ışık değildi; "arka plan tasarımını yenile" idi.
 *
 * Dalgalar ikisini de çözüyor: SVG olduğu için kart biçimi ne olursa
 * olsun eğriler bozulmuyor, rengini karttan alıyor ve dosya değil kod.
 */

/**
 * Kartın alt yarısındaki organik dalgalar.
 *
 * ⚠️ `preserveAspectRatio="none"` — yani eğriler karta YAYILIYOR. Işık
 * hüzmelerini bitiren şey buydu ama dalgalarda sorun değil: yumuşak bir
 * eğri gerildiğinde yine yumuşak bir eğri, yönü olan bir ışık huzmesi
 * ise gerildiğinde yönünü kaybediyor.
 *
 * ⚠️ Üç katman da kartın KENDİ renklerinden: ilk ikisi beyazın çok
 * düşük opaklığı (hangi renkte olursa olsun aynı işi görüyor), üçüncü
 * `vurgu` ile kartın ailesinden bir aksan.
 */
export function KartDalgalari({ vurgu }: { vurgu: string }) {
  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full"
    >
      <path
        d="M0,112 C60,88 118,146 190,126 C258,107 322,146 400,114 L400,200 L0,200 Z"
        fill="rgba(255,255,255,.085)"
      />
      <path
        d="M0,148 C70,128 140,176 215,156 C286,138 340,172 400,150 L400,200 L0,200 Z"
        fill="rgba(255,255,255,.065)"
      />
      <path
        d="M228,200 C246,148 298,122 360,129 C393,133 400,148 400,161 L400,200 Z"
        fill={vurgu}
      />
    </svg>
  );
}

/**
 * Kart illüstrasyonları.
 *
 * ⚠️ Hepsi KARE ve 512: kartta sabit bir kutuya oturuyorlar. Üretim ve
 * kesim `scripts/kart-gorsel-uret.py`de, oradaki iki turluk arayış da
 * (hamurumsu → parlak) orada yazılı.
 */
export type KartGorseli =
  | "cark"
  | "ates"
  | "tatli"
  | "yiyecek"
  | "sicak"
  | "kahve"
  | "hediye";

/**
 * Kupon türünden illüstrasyona — beş tür, beş ayrı görsel.
 *
 * 🔴 İlk hâlinde üç görsel vardı ve iki tür ikişer ikişer eşleşiyordu:
 * sıcak ile soğuk içecek aynı buzlu kahveyi, tatlı ile yiyecek aynı
 * cheesecake'i paylaşıyordu. Ürün sahibi *"soğuk içecek sıcak içecek
 * her türlü varyasyonu görmek istiyorum"* deyince gerekçe çöktü:
 * ekranda "her türü gör" denip iki türün aynı resmi göstermesi, türü
 * hiç göstermemekten farksız.
 *
 * ⚠️ `soguk` buzlu bardağa, `icecek` buharlı fincana bakıyor — ikisinin
 * ayrı olması Ü74 ve Ü75'ten beri ürünün kuralı ve `gorselSec` de
 * soğuğu sıcaktan önce arıyor.
 */
export const KUPON_GORSELI: Record<string, KartGorseli> = {
  icecek: "sicak",
  soguk: "kahve",
  tatli: "tatli",
  yiyecek: "yiyecek",
  para: "hediye",
};

export function KartResmi({
  ad,
  boy,
  className = "",
}: {
  ad: KartGorseli;
  /** Ekrandaki kenar uzunluğu (kare). */
  boy: number;
  className?: string;
}) {
  return (
    <Image
      src={`/kart/${ad}-512.webp`}
      alt=""
      aria-hidden
      width={512}
      height={512}
      className={className}
      style={{ width: boy, height: boy }}
    />
  );
}
