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
 * Döşenen desen — 96×96'lık tek karo.
 *
 * ── Neden dolgu, kontur değil (Ü73) ─────────────────────────
 *
 * İlk sürüm ince çizgili konturlardı ve ürün sahibi *"küçük emojileri
 * beğenmedim"* dedi. Sebep ölçek: 20 pikselde 2,4 birimlik bir kontur,
 * silik ve tanınmaz bir tel örgüye dönüşüyor. Dolgu siluetler o boyutta
 * hâlâ okunuyor — kiraz kiraz, makaron makaron.
 *
 * Biçimler ürün sahibinin indirdiği ikonlardan alındı (`Downloads/icons`:
 * cherry, macaron, donut, cupcake, cheesecake, money, coffee-cup,
 * cold-coffee). **Dosyalar kullanılmadı, siluetleri örnek alındı** —
 * ürün sahibinin bir önceki turdaki kuralı: *"örnek al diye gönderdim,
 * direkt kullan diye değil."* Ayrıca hazır ikon setleri atıf ya da
 * ücretli lisans istiyor; ticari bir üründe bu ayrı bir yük.
 *
 * ── Neden beyaz ─────────────────────────────────────────────
 *
 * Desen kartın kendi rengini bozmuyor, üstünde açık bir doku olarak
 * duruyor. Renkli olsaydı her kart için ayrı desen gerekirdi.
 */
function karo(icerik: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>${icerik}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Ana siluet ve üstündeki vurgu — iki opaklık, tek renk. */
const AK = "rgba(255,255,255,0.11)";
const AK_VURGU = "rgba(255,255,255,0.17)";

export const DESEN: Record<KuponGorseli, string> = {
  /* Fincan, çekirdek, buzlu bardak. */
  icecek: karo(
    `<g fill='${AK}'>
       <path d='M8 14h26v13a13 13 0 0 1-26 0z'/>
       <path d='M34 17h6a6 6 0 0 1 0 12h-6z'/>
       <rect x='4' y='42' width='34' height='4' rx='2'/>
       <ellipse cx='72' cy='22' rx='9' ry='13' transform='rotate(-28 72 22)'/>
       <path d='M56 60h20l-3 30a5 5 0 0 1-5 4h-4a5 5 0 0 1-5-4z'/>
       <rect x='53' y='55' width='26' height='6' rx='3'/>
       <ellipse cx='26' cy='74' rx='9' ry='13' transform='rotate(24 26 74)'/>
     </g>
     <g fill='${AK_VURGU}'>
       <path d='M72 11c-5 7-5 15 0 22' opacity='0.9'/>
       <rect x='60' y='68' width='7' height='7' rx='2'/>
       <rect x='67' y='79' width='7' height='7' rx='2'/>
       <path d='M26 63c-5 7-5 15 0 22'/>
     </g>`,
  ),

  /* Kiraz, makaron, donut, cupcake. */
  tatli: karo(
    `<g fill='${AK}'>
       <circle cx='16' cy='24' r='8'/>
       <circle cx='30' cy='28' r='8'/>
       <path d='M16 16c1-9 8-13 16-12l-2 5c-6-1-10 3-10 8z'/>
       <ellipse cx='72' cy='18' rx='14' ry='6'/>
       <ellipse cx='72' cy='28' rx='14' ry='6'/>
       <rect x='58' y='20' width='28' height='7'/>
       <path d='M50 62h24l-3 26a5 5 0 0 1-5 4h-8a5 5 0 0 1-5-4z'/>
       <path d='M48 62c0-12 6-20 14-20s14 8 14 20z'/>
       <circle cx='20' cy='72' r='16'/>
     </g>
     <g fill='${AK_VURGU}'>
       <circle cx='20' cy='72' r='6'/>
       <path d='M6 68c2-8 8-13 14-13s12 5 14 13z'/>
       <rect x='58' y='22' width='28' height='3'/>
     </g>`,
  ),

  /* Banknot ve madeni para. */
  para: karo(
    `<g fill='${AK}'>
       <rect x='6' y='14' width='40' height='24' rx='4'/>
       <ellipse cx='72' cy='24' rx='15' ry='7'/>
       <path d='M57 24v9a15 7 0 0 0 30 0v-9z'/>
       <rect x='52' y='62' width='38' height='24' rx='4'/>
       <ellipse cx='22' cy='70' rx='15' ry='7'/>
       <path d='M7 70v9a15 7 0 0 0 30 0v-9z'/>
     </g>
     <g fill='${AK_VURGU}'>
       <circle cx='26' cy='26' r='7'/>
       <circle cx='71' cy='74' r='7'/>
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
  /**
   * Sıcak içecek — `coffee-cup.png`.
   *
   * Krem fincan, sağda halka kulp, geniş tabak, üstte üç buhar kıvrımı,
   * sol altta iki turuncu çekirdek. Referansın düzeni birebir; tek
   * fark ölçek (200'lük kutu) ve koyu kart zeminine göre bir tık
   * açılmış tonlar.
   */
  icecek: (
    <g>
      {/* Buhar — açık uçlu üç kıvrım */}
      {/* Buhar ince: 9 birimlik çizgide üç kıvrım kalın parantezlere
          dönüşüyor ve fincanla ilgisi kopuyordu. */}
      <g stroke="#fbd9b6" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M80 66c-9-6-9-19 0-25" />
        <path d="M104 58c-9-6-9-19 0-25" />
        <path d="M128 66c-9-6-9-19 0-25" />
      </g>

      {/* Kulp — halka */}
      <path
        d="M148 92h10a30 30 0 0 1 0 60h-12v-18h12a12 12 0 0 0 0-24h-10Z"
        fill="#fbdcb9"
      />

      {/* Fincan gövdesi */}
      <path d="M38 88h114v34a48 48 0 0 1-48 48H86a48 48 0 0 1-48-48V88Z" fill="#fdf0e0" />
      <path d="M120 88h32v34a48 48 0 0 1-48 48h-14c30-6 30-46 30-82Z" fill="#fbdcb9" />
      <rect x="38" y="88" width="114" height="12" fill="#f9cfa0" />

      {/* Tabak */}
      <path d="M18 168h164a14 14 0 0 1-14 14H32a14 14 0 0 1-14-14Z" fill="#f9cfa0" />
      <rect x="14" y="160" width="172" height="10" rx="5" fill="#fdf0e0" />

      {/* Çekirdekler */}
      <g>
        <ellipse cx="46" cy="150" rx="19" ry="15" transform="rotate(-24 46 150)" fill="#e2801e" />
        <path
          d="M38 141c6 6 10 12 12 20"
          stroke="#b85c14"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="76" cy="158" rx="19" ry="15" transform="rotate(12 76 158)" fill="#c1611a" />
        <path
          d="M66 152c8 3 14 8 18 15"
          stroke="#94470d"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </g>
  ),

  /**
   * Tatlı — `icons8-cheesecake-96.png`.
   *
   * Ürün sahibinin düzeltmesi: *"tatlı için de bir cheesecake
   * koymalıydın."* Önceki tart çizimi kendi uydurmamdı; bu dilim
   * referanstaki gibi — kremalı dalga katmanları, macenta gövde,
   * üstte koyu böğürtlenler.
   */
  tatli: (
    <g>
      {/* Dilim gövdesi — sol üst köşe kesik (dilimin kesildiği yer) */}
      <path d="M26 158V100L92 52h76a10 10 0 0 1 10 10v96a10 10 0 0 1-10 10H36a10 10 0 0 1-10-10Z" fill="#f0567f" />

      {/* Sağ yüz koyu: dilime hacim veren tek detay */}
      <path d="M152 52h16a10 10 0 0 1 10 10v96a10 10 0 0 1-10 10h-16Z" fill="#d8386a" />

      {/* Üst yüzey */}
      <path d="M92 52h76a10 10 0 0 1 10 10v10H70l22-20Z" fill="#e11d55" />

      {/* Kremalı dalga katmanları */}
      <path d="M26 106c13 0 13-9 26-9s13 9 26 9 13-9 26-9 13 9 26 9 13-9 26-9 13 9 22 9v18c-9 0-9-9-22-9s-13 9-26 9-13-9-26-9-13 9-26 9-13-9-26-9-13 9-26 9Z" fill="#fde3c8" />
      <path d="M26 140c13 0 13-9 26-9s13 9 26 9 13-9 26-9 13 9 26 9 13-9 26-9 13 9 22 9v18c-9 0-9-9-22-9s-13 9-26 9-13-9-26-9-13 9-26 9-13-9-26-9-13 9-26 9Z" fill="#fde3c8" />

      {/* Böğürtlenler */}
      <g fill="#4b3f72">
        <circle cx="112" cy="46" r="15" />
        <circle cx="140" cy="38" r="15" />
        <circle cx="166" cy="46" r="13" />
      </g>
      <g fill="#6a5c96">
        <circle cx="107" cy="41" r="5" />
        <circle cx="135" cy="33" r="5" />
        <circle cx="162" cy="42" r="4" />
      </g>
    </g>
  ),

  /**
   * Para — `icons8-money-64.png`.
   *
   * Yeşil banknot destesi: arkada hafif dönük iki not, önde tam
   * hizalı bir not ve ortasında koyu daire. Kartın zemini koyu yeşil
   * olduğu için notlar referanstaki sarımsı yeşilde bırakıldı —
   * kartın kendi yeşiliyle aynı ton olsalardı kaybolurlardı.
   */
  para: (
    <g>
      {/* Arkadaki notlar — desteyi anlatan tek şey, hafif dönük */}
      <rect
        x="34"
        y="52"
        width="140"
        height="80"
        rx="10"
        fill="#3f7522"
        transform="rotate(-8 104 92)"
      />
      <rect
        x="32"
        y="62"
        width="142"
        height="80"
        rx="10"
        fill="#5f9e33"
        transform="rotate(-4 103 102)"
      />

      {/* Öndeki not */}
      <rect x="30" y="74" width="146" height="82" rx="10" fill="#8cc63e" />
      <rect x="30" y="74" width="146" height="15" rx="7" fill="#a5d65c" />
      <rect
        x="42"
        y="97"
        width="122"
        height="47"
        rx="6"
        fill="none"
        stroke="#5f9e33"
        strokeWidth="5"
      />

      {/* Ortadaki daire ve tutar işareti */}
      <circle cx="103" cy="120" r="22" fill="#4f8a2b" />
      <path
        d="M103 107v27M93 114h20M93 124h20"
        stroke="#a5d65c"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </g>
  ),
};
