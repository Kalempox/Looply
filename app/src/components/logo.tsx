/**
 * Looply işareti.
 *
 * ── Fikir ───────────────────────────────────────────────────
 *
 * Kelimenin ortasındaki **`oo` bir sonsuzluk ilmeğine** dönüşüyor ve
 * ilmeğin iki gözü bir oyun kolunun tuşlarını taşıyor: solda yön tuşu,
 * sağda dört düğme. Üstünde bir hediye.
 *
 * Üç şey aynı anda söyleniyor ve üçü de ürünün kendisi:
 *   · ilmek   → "loop" · geri dönen müşteri
 *   · tuşlar  → oyun
 *   · hediye  → ödül
 *
 * ── Neden SVG, neden PNG değil ──────────────────────────────
 *
 * Favicon 32 piksel, karekod kartı bir A5 çıktı, vitrin başlığı ise
 * ekranda 20 piksel. Tek bir PNG üçünde de ya bulanık ya şişkin olurdu.
 * SVG her boyutta keskin, birkaç kilobayt ve **rengi dışarıdan
 * verilebiliyor** — koyu zeminde beyaz, açık zeminde mavi.
 *
 * ── Harfler neden çizilmedi ─────────────────────────────────
 *
 * `L`, `p`, `l`, `y` ürünün kendi yazı tipiyle (Outfit ExtraBold)
 * diziliyor, elle çizilmiyor. Çizilseydi yazı tipi güncellendiğinde
 * logo geride kalır ve başlıkla logo aynı sayfada iki farklı harf
 * biçimi gösterirdi. Çizilen tek şey ilmek — asıl işaret o.
 */

/* ── Loopy: işaretin kendisi ───────────────────────────────── */

/**
 * Yalnız başına kullanılabilen kompakt işaret.
 *
 * Favicon, uygulama simgesi, dar başlık — kelimenin sığmadığı her yer.
 *
 * ── Geometri ────────────────────────────────────────────────
 *
 * 🔴 Geometri yeniden kuruldu (Ü123).
 *
 * İlk çizimde halkaların merkezleri 28 birim ayrıktı ama dış yarıçapları
 * 19'du: yani halkalar **birbirinin 10 birim içine giriyordu**. Altı kat
 * büyütülüp bakıldığında sonuç "iki halka" değil tek bir leke — ne
 * sonsuzluk okunuyordu ne de içindeki tuşlar.
 *
 * İkinci denemede merkez uzaklığı `2R − çizgi` yapıldı: halkalar
 * ayrıştı ama birleştikleri yer hâlâ kalın bir blok bırakıyordu.
 *
 * Son hâl **tam teğet**: merkez uzaklığı = `2R`, yani halkalar tek bir
 * noktada değiyor. Kritik olan şu — işaret `oo` harflerinin **yerine**
 * geçiyor, dolayısıyla iki ayrı halka gibi okunmalı. Birbirine geçmiş
 * iki halka "sonsuzluk" der ama "oo" demez; kelimeyi okunmaz yapan da
 * buydu.
 *
 *   R (dış) = 20.5   ·   çizgi = 7   ·   merkez arası = 41
 *   viewBox = 82 × 41
 */
const KUTU_EN = 82;
const KUTU_BOY = 41;

export function LooplyIsaret({
  boyut = 32,
  beyaz = false,
  className,
}: {
  /** İşaretin genişliği (piksel). Yükseklik orandan türüyor. */
  boyut?: number;
  /**
   * Koyu zeminde tek renk beyaz.
   *
   * Çark sahnesinin moru üzerinde mavi gradyan okunmuyor. Ayrı bir dosya
   * yazmak yerine tek bayrak — iki kopya olsaydı biri güncellenmeden
   * kalırdı (`cark.tsx`in `koyuZemin` bayrağıyla aynı gerekçe).
   */
  beyaz?: boolean;
  className?: string;
}) {
  const boya = beyaz ? "#ffffff" : "url(#looply-ilmek)";

  return (
    <svg
      width={boyut}
      height={(boyut * KUTU_BOY) / KUTU_EN}
      viewBox={`0 0 ${KUTU_EN} ${KUTU_BOY}`}
      fill="none"
      className={className}
      role="img"
      aria-label="Looply"
    >
      <defs>
        <linearGradient id="looply-ilmek" x1="0" y1="0" x2={KUTU_EN} y2={KUTU_BOY}>
          <stop offset="0%" stopColor="#1b6ef3" />
          <stop offset="100%" stopColor="#0b3fb8" />
        </linearGradient>
      </defs>

      {/* Sol göz — yön tuşu */}
      <circle cx="20.5" cy="20.5" r="17" stroke={boya} strokeWidth="7" />
      <path
        d="M20.5 12.5v16M12.5 20.5h16"
        stroke={boya}
        strokeWidth="4.4"
        strokeLinecap="round"
      />

      {/* Sağ göz — dört düğme */}
      <circle cx="61.5" cy="20.5" r="17" stroke={boya} strokeWidth="7" />
      <g fill={boya}>
        <circle cx="61.5" cy="13.5" r="2.8" />
        <circle cx="61.5" cy="27.5" r="2.8" />
        <circle cx="54.5" cy="20.5" r="2.8" />
        <circle cx="68.5" cy="20.5" r="2.8" />
      </g>
    </svg>
  );
}

/**
 * Aynı işaretin canvas'a çizilen hâli — Ü178.
 *
 * ── Neden burada, ayrı bir dosyada değil ────────────────────
 *
 * Kazıma yüzeyi (`kazima-karti.tsx`) bir canvas ve üstüne Looply
 * işareti basılıyor — gerçek kazı kartlarında da marka folyonun üstünde
 * durur ve kazındıkça kaybolur. İşaretin ölçüleri iki yerde ayrı ayrı
 * yazılsaydı biri güncellenmeden kalırdı; bu projede o hatanın adı var
 * (Ü71).
 *
 * ── 🔴 Neden yalnızca işaret, kelime yok ────────────────────
 *
 * `LooplyLogo`daki "looply" kelimesi ürünün yazı tipiyle (Outfit
 * ExtraBold) diziliyor. Canvas yazısı yazı tipinin **yüklenmiş
 * olmasını** bekler: web yazı tipi geç gelirse metin ilk karede yedek
 * yazı tipiyle çizilir ve bir daha güncellenmez. Yeniden çizmek de
 * çözüm değil — oyuncu o sırada kazımaya başlamışsa `kur()` yüzeyi
 * sıfırlar ve **kazıdığı yer geri gelir.**
 *
 * İşaretin kendisi saf geometri: iki halka, bir artı, dört nokta.
 * Yazı tipi gerektirmiyor ve zaten logonun *"kelimenin sığmadığı her
 * yer"* için olan kompakt hâli.
 *
 * @param x    çizim kutusunun sol üst köşesi
 * @param en   işaretin genişliği; yükseklik orandan türüyor (82:41)
 * @param boya tek renk — gradyan yok, altın folyonun üstünde okunmalı
 */
export function cizLooplyIsareti(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  en: number,
  boya: string,
) {
  const k = en / KUTU_EN;
  const K = (n: number) => n * k;

  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = boya;
  ctx.fillStyle = boya;

  // İki göz — tam teğet iki halka (Ü123: merkez arası = 2R).
  ctx.lineWidth = K(7);
  for (const cx of [20.5, 61.5]) {
    ctx.beginPath();
    ctx.arc(K(cx), K(20.5), K(17), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Sol göz: yön tuşu.
  ctx.lineWidth = K(4.4);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(K(20.5), K(12.5));
  ctx.lineTo(K(20.5), K(28.5));
  ctx.moveTo(K(12.5), K(20.5));
  ctx.lineTo(K(28.5), K(20.5));
  ctx.stroke();

  // Sağ göz: dört düğme.
  for (const [dx, dy] of [
    [61.5, 13.5],
    [61.5, 27.5],
    [54.5, 20.5],
    [68.5, 20.5],
  ]) {
    ctx.beginPath();
    ctx.arc(K(dx), K(dy), K(2.8), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** İşaretin en/boy oranı — çağıranın yer ayırması için. */
export const ISARET_ORANI = KUTU_BOY / KUTU_EN;

/**
 * Tam kilit canvas'ta: `L` + işaret + `ply` — Ü179.
 *
 * Ürün sahibi kazıma kartı için *"altında looply yazılı logomuz
 * olmalı"* dedi. Ü178'de yalnızca işaret çizilmişti çünkü canvas'ta
 * yazı tipi bir tuzak; tuzak burada **çözülüyor**, atlanmıyor.
 *
 * ── 🔴 Yazı tipi tuzağı ve çözümü ───────────────────────────
 *
 * Canvas metni, çizildiği anda yüklü olan yazı tipiyle **bir kez**
 * boyanıyor. Outfit geç gelirse kelime yedek yazı tipiyle çizilir ve
 * bir daha kendiliğinden düzelmez. Çözüm yüzeyi yeniden çizmek ama
 * bunun bir bedeli var: yeniden çizim oyuncunun **kazıdığı yeri geri
 * getirir.**
 *
 * O yüzden çağıran taraf iki şeyi birden yapıyor (`kazima-karti.tsx`):
 * `document.fonts.ready`i bekliyor ve yeniden çizmeden önce yüzeye
 * dokunulup dokunulmadığına bakıyor. Dokunulduysa çizmiyor — kelimenin
 * doğru yazı tipinde olması, kazınmış bir yüzeyi sıfırlamaktan önemli
 * değil.
 *
 * ⚠️ Aile adı SABİT YAZILMIYOR: `next/font` gerçek aile adını
 * (`__Outfit_abc123` gibi) derleme sırasında üretiyor. Çağıran onu
 * `--font-outfit` değişkeninden okuyup veriyor.
 *
 * ── Ölçüler `LooplyLogo` ile aynı ───────────────────────────
 *
 * İşaretin boyu büyük harf yüksekliği kadar (0,72 em), iki yanında
 * 0,045 em pay, harf aralığı −0,04 em. Aynı sayılar iki yerde ayrı
 * yazılsaydı biri güncellenmeden kalırdı (Ü71).
 *
 * @param merkezX kilidin yatay ortası
 * @param tabanY  harflerin taban çizgisi
 * @param boyut   kelimenin piksel yüksekliği (font-size)
 */
export function cizLooplyKilidi(
  ctx: CanvasRenderingContext2D,
  merkezX: number,
  tabanY: number,
  boyut: number,
  boya: string,
  aile: string,
) {
  ctx.save();
  ctx.font = `800 ${boyut}px ${aile}, ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.letterSpacing = `${-0.04 * boyut}px`;
  ctx.fillStyle = boya;
  ctx.strokeStyle = boya;

  const isaretBoy = boyut * 0.72;
  const isaretEn = isaretBoy / ISARET_ORANI;
  const pay = boyut * 0.045;

  const lEn = ctx.measureText("L").width;
  const plyEn = ctx.measureText("ply").width;
  const toplam = lEn + pay + isaretEn + pay + plyEn;

  let x = merkezX - toplam / 2;
  ctx.fillText("L", x, tabanY);
  x += lEn + pay;
  // İşaret taban çizgisine basıyor — tıpkı bir `o` gibi (Ü123).
  cizLooplyIsareti(ctx, x, tabanY - isaretBoy, isaretEn, boya);
  x += isaretEn + pay;
  ctx.fillText("ply", x, tabanY);

  ctx.letterSpacing = "0px";
  ctx.restore();
}

/* ── Hediye ────────────────────────────────────────────────── */

/**
 * Kelimenin üstünde duran hediye ve kıvılcımlar.
 *
 * ⚠️ Küçük boyutta **bilerek gizleniyor** (`tamLockup` içindeki kural).
 * Referans görseldeki 3B kutu 32 pikselde mürekkep lekesine dönüyordu;
 * burada düz çizim ve yine de 24 pikselin altında kaldırılıyor. Bir
 * işaretin en küçük hâli, en az parçalı hâlidir.
 */
function Hediye({ boyut = 34 }: { boyut?: number }) {
  return (
    <svg
      width={boyut}
      height={boyut}
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="looply-kutu" x1="10" y1="18" x2="34" y2="40">
          <stop offset="0%" stopColor="#3b86ff" />
          <stop offset="100%" stopColor="#0b57d0" />
        </linearGradient>
      </defs>

      {/* Kıvılcımlar — ödülün "açıldı" anındaki ışın diline selam */}
      <g stroke="#3b86ff" strokeWidth="2.2" strokeLinecap="round" opacity="0.9">
        <path d="M6 12l4 4M38 12l-4 4M3 23h4M41 23h-4" />
      </g>
      <g fill="#1b6ef3">
        <path d="M22 0l1.5 3.2L27 4.7l-3.5 1.5L22 9.4l-1.5-3.2L17 4.7l3.5-1.5z" />
        <circle cx="8.5" cy="5.5" r="1.9" />
        <circle cx="36" cy="7" r="1.5" />
      </g>

      {/*
        Kutu BEYAZ, kurdele mavi — referanstaki gibi.
        İlk denemede kutu da maviydi ve işaret tek renkli bir lekeye
        dönüşüyordu: kurdele kutudan ayrılmıyordu. Beyaz gövde, mavi
        kurdeleye kontrast veriyor ve hediye küçük boyutta da okunuyor.
      */}
      <rect x="9" y="22" width="26" height="17" rx="2.6" fill="#e3eeff" stroke="#8ab4ff" strokeWidth="1.6" />
      <rect x="8" y="17.6" width="28" height="6.8" rx="2.2" fill="#f5f9ff" stroke="#8ab4ff" strokeWidth="1.6" />

      {/* Dikey kurdele — kapağın üstünden kutunun altına kesintisiz */}
      <rect x="19.4" y="18" width="5.2" height="21" fill="url(#looply-kutu)" />

      {/* Fiyonk */}
      <path
        d="M22 18c-3.4-1-6-2.4-6-4.6 0-1.7 1.3-2.9 3-2.9 2.4 0 3 2.6 3 7.5zM22 18c3.4-1 6-2.4 6-4.6 0-1.7-1.3-2.9-3-2.9-2.4 0-3 2.6-3 7.5z"
        fill="url(#looply-kutu)"
      />
    </svg>
  );
}

/* ── Tam kilit ─────────────────────────────────────────────── */

/**
 * Tam logo: hediye + `L` + ilmek + `ply`.
 *
 * `boyut` kelimenin piksel yüksekliği; her şey ona göre ölçekleniyor.
 * Harfler ürünün yazı tipinden geldiği için tek bir sayı yetiyor.
 */
export function LooplyLogo({
  boyut = 34,
  hediye = true,
  beyaz = false,
  className,
}: {
  boyut?: number;
  /** 30 pikselin altında kendiliğinden kapanıyor — bkz. `Hediye`. */
  hediye?: boolean;
  /** Koyu zeminde beyaz — çark sahnesinin moru gibi. */
  beyaz?: boolean;
  className?: string;
}) {
  // Eşik 24'ten 30'a çıkarıldı: 26 pikselde hediye hâlâ okunmuyor,
  // yalnızca kelimenin üstünde bir gürültü lekesi bırakıyordu.
  const hediyeVar = hediye && boyut >= 30;

  return (
    <span className={`inline-flex flex-col items-center ${className ?? ""}`}>
      {hediyeVar && (
        <span style={{ marginBottom: -boyut * 0.18 }}>
          <Hediye boyut={boyut * 1.15} />
        </span>
      )}

      {/*
        🔴 `items-center` DEĞİL `items-baseline` (Ü123).

        Ortalama, işareti satır kutusunun ortasına koyuyordu; `p` ve `y`nin
        alt uzantıları kutuyu aşağı çektiği için halkalar hem `L`nin
        üstünden taşıyor hem taban çizgisinin altına sarkıyordu — kelime
        bir çizgiye oturmuyordu. Taban hizasında işaret, tıpkı bir `o`
        gibi, taban çizgisine basıyor.
      */}
      <span
        className={`inline-flex items-baseline font-display font-extrabold tracking-[-0.04em] ${
          beyaz ? "text-white" : "text-vurgu"
        }`}
        style={{ fontSize: boyut, lineHeight: 1 }}
      >
        <span>L</span>
        {/*
          Loopy `oo`nun YERİNE geçiyor, yanına eklenmiyor.

          Ölçü **yükseklikten** türüyor: işaretin boyu büyük harf
          yüksekliği kadar (0.72 em) olsun isteniyor, genişlik oradan
          hesaplanıyor. Genişlikten gidilseydi kutu oranı her
          değiştiğinde işaret harflerden taşar ya da cüce kalırdı.
        */}
        <LooplyIsaret
          boyut={(boyut * 0.72 * KUTU_EN) / KUTU_BOY}
          beyaz={beyaz}
          className="mx-[0.045em]"
        />
        <span>ply</span>
      </span>
    </span>
  );
}
