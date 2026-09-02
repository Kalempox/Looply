import type { KuponGorseli } from "./oyuncu-gorsel";

/**
 * Kupon kartının deseni ve sahnesi — Ü72.
 *
 * ── Ürün başına değil, kategori başına ──────────────────────
 *
 * Ürün sahibinin kuralı ve doğru olan: *"filtre kahve de çay da sıcak
 * içecek; ikisinde de kenardaki görsel aynı olmalı, yoksa her kafede
 * farklı sıcak içecekler olduğundan buraya sürekli görsel üretmek
 * zorunda kalırız."*
 *
 * Bu yüzden **üç sahne** var, üç yüz değil: sıcak içecek, tatlı, para.
 * Kafe menüsüne yeni bir şey eklediğinde burada yapılacak iş yok;
 * `gorselSec()` onu üç kategoriden birine düşürüyor.
 *
 * ── Neden çizim, stok görsel değil ──────────────────────────
 *
 * Üç görsel satın alınabilirdi ama üçü de kartın rengine uymak
 * zorunda ve kart rengi kupon cinsinden geliyor. Çizim `currentColor`
 * yerine kendi paletini taşıyor ama **kartın koyu zeminine göre**
 * seçilmiş tonlarla; hazır bir görsel her kartta ayrı ayrı
 * düzeltilirdi. Ayrıca lisans, dosya boyutu ve retina sorunu yok.
 *
 * ── Desen ayrı, sahne ayrı ──────────────────────────────────
 *
 * **Desen** kartın tamamına döşeniyor ve zenginliğin çoğunu o veriyor:
 * çekirdek, fincan, makaron, madeni para. CSS `background-image` +
 * veri URI'si olarak duruyor, SVG `<pattern>` olarak değil — `pattern`
 * bir `id` istiyor ve aynı kart sayfada beş kez çizildiğinde `id`
 * çakışıyor.
 *
 * **Sahne** sağ kenardan taşan tek büyük çizim. Kartın kimliği o.
 */

/* ── Desen ─────────────────────────────────────────────────── */

/**
 * Döşenen desen — 72×72'lik tek karo.
 *
 * Beyaz ve düşük opaklıkta: kartın kendi rengi neyse desen onun
 * üstünde açık bir doku olarak duruyor, ayrı bir renk getirmiyor.
 */
function karo(icerik: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'>${icerik}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const AK = "rgba(255,255,255,0.10)";
const AK_KOYU = "rgba(255,255,255,0.07)";

export const DESEN: Record<KuponGorseli, string> = {
  /* Kahve çekirdeği ve fincan. */
  icecek: karo(
    `<g fill='none' stroke='${AK}' stroke-width='2.4'>
       <ellipse cx='18' cy='16' rx='7' ry='10' transform='rotate(-25 18 16)'/>
       <path d='M18 7c-4 5-4 13 0 18' />
       <ellipse cx='54' cy='52' rx='7' ry='10' transform='rotate(20 54 52)'/>
       <path d='M54 43c-4 5-4 13 0 18' />
       <path d='M42 12h14v8a7 7 0 0 1-7 7 7 7 0 0 1-7-7z'/>
       <path d='M56 15h4a3.5 3.5 0 0 1 0 7h-4'/>
       <path d='M8 56h16v6a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z'/>
     </g>`,
  ),

  /* Makaron ve kiraz. */
  tatli: karo(
    `<g fill='none' stroke='${AK}' stroke-width='2.4'>
       <ellipse cx='18' cy='14' rx='11' ry='6'/>
       <path d='M7 14v4a11 6 0 0 0 22 0v-4'/>
       <path d='M7 18a11 6 0 0 0 22 0'/>
       <circle cx='50' cy='52' r='7'/>
       <circle cx='62' cy='58' r='7'/>
       <path d='M50 45c2-8 8-11 13-10'/>
       <path d='M40 20c6 0 6 6 12 6s6-6 12-6'/>
     </g>`,
  ),

  /* Madeni para ve banknot. */
  para: karo(
    `<g fill='none' stroke='${AK}' stroke-width='2.4'>
       <ellipse cx='17' cy='16' rx='11' ry='5'/>
       <path d='M6 16v6a11 5 0 0 0 22 0v-6'/>
       <rect x='40' y='44' width='26' height='16' rx='2'/>
       <circle cx='53' cy='52' r='4'/>
       <ellipse cx='55' cy='16' rx='9' ry='9'/>
       <path d='M55 11v10M52 14h6M52 18h6' stroke='${AK_KOYU}'/>
       <rect x='6' y='46' width='22' height='14' rx='2' stroke='${AK_KOYU}'/>
     </g>`,
  ),
};

/* ── Sahne ─────────────────────────────────────────────────── */

/**
 * Kartın sağ kenarından taşan büyük çizim.
 *
 * Dolgulu ve çok tonlu — desenin tersi. Desen dokuyu, sahne kimliği
 * taşıyor; ikisi de tek renkli olsaydı kart düz bir leke olurdu.
 *
 * Gradyan yok: SVG gradyanı `id` istiyor ve aynı sahne sayfada beş kez
 * çizildiğinde `id` çakışıyor. Renk geçişi yerine düz katmanlar var.
 */
export function Sahne({ ad, boy = 150 }: { ad: KuponGorseli; boy?: number }) {
  return (
    <svg width={boy} height={boy} viewBox="0 0 200 200" fill="none" aria-hidden>
      {SAHNE[ad]}
    </svg>
  );
}

const SAHNE: Record<KuponGorseli, React.ReactElement> = {
  /** Sıcak içecek — fincan, tabak, buhar, çekirdekler. */
  icecek: (
    <g>
      {/* Buhar */}
      <g stroke="#ffffff" strokeOpacity="0.5" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M74 46c-9-10 9-16 0-26" />
        <path d="M100 38c-9-10 9-16 0-26" />
        <path d="M126 46c-9-10 9-16 0-26" />
      </g>

      {/* Tabak */}
      <ellipse cx="100" cy="166" rx="76" ry="16" fill="#c9a882" />
      <ellipse cx="100" cy="162" rx="76" ry="16" fill="#e8d3ba" />

      {/* Kulp */}
      <path
        d="M146 78h18a26 26 0 0 1 0 52h-14v-14h14a12 12 0 0 0 0-24h-18Z"
        fill="#e8d3ba"
      />

      {/* Fincan gövdesi */}
      <path d="M36 72h114v50a50 50 0 0 1-50 50h-14a50 50 0 0 1-50-50V72Z" fill="#faf1e6" />
      <path d="M36 72h114v50a50 50 0 0 1-50 50h-6c22-16 30-42 30-78Z" fill="#e2cdb2" />

      {/* Kahve yüzeyi */}
      <ellipse cx="93" cy="72" rx="57" ry="14" fill="#43220f" />
      <ellipse cx="93" cy="70" rx="45" ry="9" fill="#5c3520" />

      {/* Çekirdekler */}
      <g>
        <ellipse cx="34" cy="150" rx="14" ry="19" transform="rotate(-28 34 150)" fill="#43220f" />
        <path
          d="M34 133c-7 10-7 24 0 34"
          stroke="#8a5a33"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="170" cy="146" rx="12" ry="17" transform="rotate(22 170 146)" fill="#43220f" />
        <path
          d="M170 131c-6 9-6 21 0 30"
          stroke="#8a5a33"
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </g>
  ),

  /** Tatlı — kremalı tart, kiraz, makaron. */
  tatli: (
    <g>
      {/* Tabak */}
      <ellipse cx="100" cy="172" rx="80" ry="16" fill="#f4c9d9" />

      {/* Tart kabuğu */}
      <path d="M28 118h144l-10 44a12 12 0 0 1-12 10H50a12 12 0 0 1-12-10l-10-44Z" fill="#c98a4b" />
      <path d="M28 112h144v14H28z" fill="#e0a765" />
      <g fill="#c98a4b">
        <rect x="34" y="112" width="10" height="14" rx="3" />
        <rect x="60" y="112" width="10" height="14" rx="3" />
        <rect x="86" y="112" width="10" height="14" rx="3" />
        <rect x="112" y="112" width="10" height="14" rx="3" />
        <rect x="138" y="112" width="10" height="14" rx="3" />
        <rect x="160" y="112" width="10" height="14" rx="3" />
      </g>

      {/* Krema */}
      <path
        d="M34 116c14 0 14-16 33-16s19 16 33 16 14-16 33-16 19 16 33 16v-6c0-18-30-32-66-32S34 92 34 110Z"
        fill="#fff6fa"
      />
      <path
        d="M52 92c10-8 28-13 48-13s38 5 48 13c-14-6-30-9-48-9s-34 3-48 9Z"
        fill="#ffe3ee"
      />

      {/* Kiraz */}
      <circle cx="100" cy="60" r="20" fill="#d81e4a" />
      <circle cx="93" cy="53" r="6" fill="#f0577c" />
      <path
        d="M100 40c2-16 12-22 24-21"
        stroke="#5f8f36"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />

      {/* Makaron */}
      <g>
        <ellipse cx="36" cy="150" rx="24" ry="13" fill="#ffc2d6" />
        <ellipse cx="36" cy="142" rx="24" ry="13" fill="#ffd9e6" />
        <ellipse cx="36" cy="134" rx="24" ry="13" fill="#ffc2d6" />
      </g>
    </g>
  ),

  /** Para — banknot destesi ve madeni paralar. */
  para: (
    <g>
      {/* Banknot destesi */}
      <g>
        <rect x="18" y="96" width="150" height="76" rx="8" fill="#0f4a28" />
        <rect x="18" y="86" width="150" height="76" rx="8" fill="#1c7a44" />
        <rect x="18" y="76" width="150" height="76" rx="8" fill="#34a35f" />
        <rect x="30" y="88" width="126" height="52" rx="5" fill="none" stroke="#0f4a28" strokeWidth="4" />
        <circle cx="93" cy="114" r="20" fill="#0f4a28" />
        <circle cx="93" cy="114" r="13" fill="#34a35f" />
        <path
          d="M93 104v20M87 109h12M87 116h12"
          stroke="#0f4a28"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>

      {/* Madeni para yığını */}
      <g>
        <ellipse cx="156" cy="158" rx="38" ry="15" fill="#c08a08" />
        <rect x="118" y="132" width="76" height="26" fill="#e0a800" />
        <ellipse cx="156" cy="132" rx="38" ry="15" fill="#ffd24a" />
        <ellipse cx="156" cy="132" rx="26" ry="10" fill="#e0a800" />
        <path
          d="M156 122v20M148 128h16M148 136h16"
          stroke="#a97a06"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    </g>
  ),
};
