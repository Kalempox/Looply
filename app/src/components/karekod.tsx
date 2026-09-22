import qrUret from "qrcode-generator";

/**
 * Karekod — sunucuda SVG olarak üretilir.
 *
 * İstemciye hiçbir JavaScript inmiyor: kod sunucuda hesaplanıp düz SVG
 * olarak gönderiliyor. Kupon ekranı zaten sunucudan geliyor; QR'ı istemcide
 * üretmek için kütüphane indirtmenin bir karşılığı yok.
 *
 * ── İçinde ne var ───────────────────────────────────────────
 *
 * **Yalnızca jeton.** Ödül adı, TL değeri, kafe bilgisi — hiçbiri yok
 * (Ü19, `04-kupon-kullanim-akisi.txt`). Oyuncu QR içeriğini değiştirip
 * "100 TL yerine 1.000 TL" yapamıyor, çünkü değer QR'da hiç durmuyor;
 * kasiyerin ekranındaki her şey sunucudan geliyor.
 *
 * ── Hata düzeltme seviyesi ──────────────────────────────────
 *
 * Ekrandaki kupon için `M` (~%15). Kafe ışığı loş, ekran parmak izli,
 * telefon titriyor — `L` bu koşullarda okunma oranını düşürürdü. `H`
 * ise kodu gereksiz yoğunlaştırıp küçük ekranda modülleri inceltirdi.
 *
 * `isaret` verildiğinde seviye **`H`**'ye çıkıyor; gerekçesi aşağıda.
 */

/** Sessiz alan — standart dört modül. Olmazsa okuyucu kodun nerede bittiğini anlayamıyor. */
const KENAR = 4;

/**
 * Rozetin içindeki Loopy'nin boyu — sembolün yüzdesi.
 *
 * ── 🔴 Neden bu kadar küçük ─────────────────────────────────
 *
 * Ortadaki her beyaz piksel **silinmiş modül** demek ve silinen modülü
 * geri getiren tek şey hata düzeltme. `H` seviyesi kod kelimelerinin
 * ~%30'unu kurtarabiliyor, ama bu bir bütçe — logoya harcanan pay,
 * baskıdaki çizikten, kahve lekesinden ve soluk mürekkepten geriye
 * kalmıyor. Etiket masada yıllarca duracak.
 *
 * Rozet sembolün **%7,1'ini** kapatıyor, yani bütçenin dörtte biri.
 * Kalanı sahaya kalıyor.
 *
 * ── 🔴 Büyütmek ÖLÇÜLDÜ ve reddedildi ───────────────────────
 *
 * Loopy %32'ye çıkarıldığında rozet %10,9 oluyor ve fark bir denge
 * meselesi değil, ölçülebilir bir kayıp (600 piksellik koda yerel
 * leke, 20 deneme):
 *
 *     leke yarıçapı      %7,1      %10,9     rozetsiz (M)
 *       4 modül          17/20     15/20        17/20
 *       5 modül          16/20     11/20        17/20
 *       8 modül           8/20      4/20         1/20
 *
 * %10,9'luk rozet orta hasarda **rozetsiz koddan bile kötü** —
 * yani `H`ye çıkmanın bütün kazancını yiyor ve üstüne biraz daha.
 * %7,1 ise her satırda rozetsiz koda eşit ya da üstün.
 *
 * ── ⚠️ Rozetin İÇİNDEKİ resim önemli değil, ALANI önemli ────
 *
 * İlk sürümde rozette Looply işareti vardı (ince mavi çizgi); şimdi
 * dolu ve koyu bir karakter var. Ölçüm ikisinde de **birebir aynı**
 * çıktı ve sebebi şu: bir kod kelimesi 8 modül ve içinden **biri**
 * bozuksa kelimenin tamamı gidiyor. Rozet ister beyaz ister dolu
 * olsun, dokunduğu kelimeleri zaten kaybediyor.
 *
 * Yani "logoyu açık renk yaparsak daha az zarar verir" doğru değil.
 * Tek kol rozetin boyu.
 *
 * ── ⚠️ Büyütülecekse ÖNCE ÖLÇÜLMELİ ────────────────────────
 *
 * Bu sayılar tahmin değil: bileşenin gerçek çıktısı tuvale basılıp
 * jsQR ile çözüldü. Ölçüm tablosu `tests/karekod.test.ts`in başında.
 * Sonuç beklenenin tersiydi — Loopy'li kod sade koddan **daha**
 * dayanıklı çıktı, çünkü seviye `M`den `H`ye çıkıyor.
 *
 * ⚠️ Testler ölçümü tekrarlamıyor (Node'da çözücü yok, yalnızca bunun
 * için bağımlılık eklenmedi); ölçümün geçerli kalmasının koşullarını
 * bekçiliyorlar. Rozet büyütülürse ölçüm **yeniden yapılmalı** —
 * gözle "hâlâ okunuyor" demek bir ölçüm değil.
 */
const LOOPY_BOY = 0.25;
/** Karakterin her yanında bırakılan beyaz pay. */
const ROZET_PAY = 0.02;

/**
 * Maskotun en/boy oranı — `scripts/loopy-karekod-uret.py` çıktısı.
 *
 * 🔴 Dosyayla BAĞLI. Script karakteri alfa sınırına kırpıyor ve oranı
 * o kırpım belirliyor (546 × 667). Kare değiştirilirse script yeniden
 * koşmalı ve bu sayı onun bildirdiği oran olmalı; ayrışırsa karakter
 * rozetin içinde eziliyor ya da taşıyor.
 */
const LOOPY_ORANI = 546 / 667;

/**
 * Maskotun dosyası.
 *
 * ── ⚠️ Neden `loopy-mutlu-512.webp` DEĞİL ───────────────────
 *
 * Yayındaki kare 512×512'lik bir tuvalde duruyor ve karakter onun
 * yalnızca 276×336'sını kaplıyor. Rozete konsaydı **aynı hasar
 * bedeline yarı boyda** görünürdü: rozetin içindeki her şeffaf piksel
 * de silinmiş bir modül.
 *
 * Bu dosya alfa sınırına kırpılmış hâli ve 1024'lük kaynaktan geliyor
 * (baskı 300 dpi istiyor).
 */
const LOOPY_KARE = "/avatar/loopy-mutlu-karekod.webp";

export function Karekod({
  deger,
  boyut = 220,
  etiket,
  isaret = false,
}: {
  deger: string;
  /** Kenar uzunluğu (piksel). */
  boyut?: number;
  etiket: string;
  /**
   * Ortaya Loopy konsun mu — Ü246.
   *
   * ⚠️ Yalnızca **basılı** kodlar için. Ekrandaki kupon karekodu
   * olabildiğince seyrek kalmalı (kasiyer telefonu tarıyor, ekran
   * küçük); rozet oraya bir şey katmadan modülleri inceltir.
   */
  isaret?: boolean;
}) {
  /*
    🔴 Seviye rozete BAĞLI, ayrı bir seçenek değil.

    İkisi ayrı verilebilseydi biri "logo koy ama L kalsın" diyebilirdi
    ve ortaya okunmayan bir kod çıkardı — üstelik ekranda değil,
    **basıldıktan sonra** anlaşılırdı. Bağlı olunca o hâl mümkün değil.
  */
  const qr = qrUret(0, isaret ? "H" : "M");
  qr.addData(deger);
  qr.make();

  const modul = qr.getModuleCount();
  const toplam = modul + KENAR * 2;

  const kareler: string[] = [];
  for (let s = 0; s < modul; s++) {
    for (let k = 0; k < modul; k++) {
      if (qr.isDark(s, k)) {
        kareler.push(`M${k + KENAR},${s + KENAR}h1v1h-1z`);
      }
    }
  }

  // Karakter önce, rozet onun çevresine: pay her yanda eşit olsun.
  const lBoy = toplam * LOOPY_BOY;
  const lEn = lBoy * LOOPY_ORANI;
  const pay = toplam * ROZET_PAY;
  const rEn = lEn + pay * 2;
  const rBoy = lBoy + pay * 2;
  const rX = (toplam - rEn) / 2;
  const rY = (toplam - rBoy) / 2;

  return (
    <svg
      /* ⚠️ `xmlns` şart: satır içi HTML'de gereksiz ama kod SVG dosyası
         olarak kaydedilince (kafe matbaaya gönderiyor) olmadan hiçbir
         görüntüleyici açmıyor. Ölçüldü — `<img>` yüklemeyi reddetti. */
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${toplam} ${toplam}`}
      width={boyut}
      height={boyut}
      role="img"
      aria-label={etiket}
      shapeRendering="crispEdges"
    >
      {/* Beyaz zemin şart: sayfa zemini açık gri olduğu için kodun kendi
          sessiz alanı olmadan okuyucu kenarı bulamıyor. */}
      <rect width={toplam} height={toplam} fill="#ffffff" />
      <path d={kareler.join("")} fill="#000000" />

      {isaret && (
        /*
          ⚠️ Modüllerin ÜSTÜNE çiziliyor, kodun içinden çıkarılmıyor.
          Çözücü için ikisi aynı (o bölgeyi beyaz görüyor), ama üstüne
          çizmek kodun kendi yapısına hiç dokunmuyor — maskeleme,
          biçim bilgisi ve hizalama desenleri olduğu gibi kalıyor.
        */
        <g shapeRendering="geometricPrecision">
          <rect
            x={rX}
            y={rY}
            width={rEn}
            height={rBoy}
            rx={pay * 2.6}
            fill="#ffffff"
          />
          {/*
            Maskot Loopy, mutlu hâli — ürün sahibinin kararı:
            *"loopy karakterimiz olsun looply logosu değil ve
            mutluykenki hali olsun."*

            ⚠️ Adres göreli: sayfa bunu tarayıcıya yükletiyor. Kod tek
            parça bir SVG dosyası olarak dışarı verilecekse (matbaa)
            bu adresin base64 veri adresiyle değiştirilmesi gerekiyor —
            yoksa dosya karaktersiz açılır.
          */}
          <image
            href={LOOPY_KARE}
            x={(toplam - lEn) / 2}
            y={(toplam - lBoy) / 2}
            width={lEn}
            height={lBoy}
          />
        </g>
      )}
    </svg>
  );
}

/**
 * Karekodun sürümü (1–40) — testin bekçilik ettiği sayı.
 *
 * ── 🔴 Neden dışa açık ──────────────────────────────────────
 *
 * Sürüm, kodun kaç modül olduğunu belirliyor: 5. sürüm 37×37, 7. sürüm
 * 45×45. Adres uzadıkça sürüm yükseliyor ve iki şey birden bozuluyor:
 *
 *   · Modüller incelir — uzaktan ve hasarlıyken okunmaz.
 *   · 7. sürümden itibaren **hizalama desenleri ortaya yaklaşır** ve
 *     rozetin altında kalabilir. Hizalama deseni hata düzeltmeyle
 *     kurtarılmıyor; kaybolursa çözücü kodun geometrisini hiç
 *     oturtamıyor.
 *
 * İkisi de basıldıktan sonra anlaşılırdı. Test sürümü sabitliyor: alan
 * adı uzatılırsa derleme değil **test** düşüyor ve sebebi yazılı.
 */
export function karekodSurumu(deger: string, isaret = false): number {
  const qr = qrUret(0, isaret ? "H" : "M");
  qr.addData(deger);
  qr.make();
  return (qr.getModuleCount() - 17) / 4;
}
