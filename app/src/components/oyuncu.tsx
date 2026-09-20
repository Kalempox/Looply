import Link from "next/link";
import { AvatarYuvasi } from "./avatar-yuvasi";
import {
  RENK,
  kartZemin,
  kartKenar,
  ISIN_OPAKLIK,
  ISIN_DOKUSU,
  type OyuncuRengi,
} from "./oyuncu-renk";
import { Gorsel, type GorselAdi } from "./oyuncu-gorsel";
import { OyunSahnesi, sahneVarMi } from "./oyun-sahnesi";
import { KartDalgalari } from "./kart-gorseli";
import { OyuncuNav, NavBosluk, type Durak } from "./oyuncu-nav";

/**
 * Oyuncu tarafının ortak parçaları — Ü64, Ü65.
 *
 * ── İki dil, iki dosya ──────────────────────────────────────
 *
 * `components/gosterge.tsx` işletme panelinin dili: beyaz kart, alan
 * renkleri, sakin. Bu dosya oyuncunun dili: çarkın pastel renkleri,
 * renkli ikonlar, altın vurgu.
 *
 * Ürün sahibinin ayrımı: *"oyuncu ekranında çarktaki dil, panelde
 * panelin dili — çarktaki dilden kastım eğlenceli, canlı, uygulamanın
 * içine çeken, heyecanlı olması; panel daha resmî, net."*
 *
 * İki dosya olmasının sebebi bu: tek dosyada toplansalardı bir
 * ekranda yanlış dili kullanmak bir `import` kadar kolay olurdu.
 *
 * ── Koyu mor artık tek yerde (Ü65) ──────────────────────────
 *
 * Ü64'te koyu mor kart oyuncu tarafının **her** ekranına kondu ve ürün
 * sahibi haklı olarak *"her yere bu mor efekti koyma, daha renkli daha
 * eğlenceli olmalı"* dedi. Yanlış okuma bendeydi: çarkın kendisi
 * aydınlık ve altı renkli, koyu olan yalnızca üstünde durduğu sahne.
 *
 * Şimdi koyu kart iki yerde: **ana ekranın durum kartı** ve **çark
 * sahnesi**. Geri kalan her ekran `SayfaBasi` ile aydınlık ve renkli.
 */

/* ── Sayfa kabuğu ──────────────────────────────────────────── */

/**
 * Oyuncu tarafındaki her ekranın dış kabuğu — Ü66.
 *
 * ── Neden tek bileşen ───────────────────────────────────────
 *
 * Her ekran kendi `<Sayfa>`, `<NavBosluk>`, `<OyuncuNav>` üçlüsünü
 * elle diziyordu ve ürün sahibi sonucu net söyledi: *"genel olarak
 * tasarımsal bütünlük yok, her yer birbirinden bağımsız duruyor."*
 * Sekiz ekranda sekiz kopya varken bütünlük bir dikkat meselesi
 * oluyor; tek kabukta yapısal bir garanti.
 *
 * ── Geri düğmesi ────────────────────────────────────────────
 *
 * *"Sayfalara geri dönme butonları koymamışsın."* Alt şeritte üç
 * durak var ama şeridin götürmediği yerler de var: kupon detayı,
 * fırsatlar, sıralama, oyun, verilerim, davet. Oralarda tarayıcının
 * geri düğmesinden başka yol yoktu — uygulama gibi davranan bir
 * sayfada bu, çıkmaz sokak demek.
 *
 * Üç durağın kendisinde geri düğmesi **yok**: sekmenin kökünde "geri"
 * nereye gideceği belirsiz bir söz.
 */
export function OyuncuSayfa({
  geri,
  aktif,
  children,
  yuva = true,
  menu = true,
}: {
  /** Üstteki geri bağlantısı. Sekme köklerinde verilmiyor. */
  geri?: { href: string; etiket: string };
  /** Alt şeritte hangi durak yanacak. */
  aktif: Durak;
  children: React.ReactNode;
  /**
   * Alttaki üç duraklı şerit.
   *
   * ── 🔴 Oyun oynanırken şerit YOK — Ü166 ─────────────────────
   *
   * Ürün sahibi *"oynanışları çok kötü, hiç oynanabilir durumda
   * değil"* dedi. Düşen'de sebebi ölçüldü ve bir his meselesi
   * değildi:
   *
   *   Bırak düğmesi   748 – 803 piksel
   *   Alt şerit       743'ten başlıyor (`fixed`, `z-20`)
   *
   * Düğmenin tam ortasındaki (188, 775) noktada `elementFromPoint`
   * **şeridin içindeki bir ikonu** döndürüyordu. Yani düşen bloğu
   * bırakmak için basılan yer parçayı bırakmıyor, **oyundan
   * çıkarıyordu.**
   *
   * `NavBosluk` (80 piksel) zaten vardı ama yetmiyor: oyun ekranı
   * 923 piksel, görünen alan 812. Sayfa kayıyor ve varsayılan kaydırma
   * konumunda asıl kontrol şeridin altında kalıyor.
   *
   * ⚠️ Şeridi gizlemek yolu kapatmıyor: oyun ekranında üstte
   * `‹ Oyunlar` bağlantısı duruyor. Kapatan şey şeritti — oyunun
   * ortasında yanlışlıkla basılan bir sekme turu bitiriyordu.
   */
  menu?: boolean;
  /**
   * Sağ alttaki avatar yuvası (Ü159).
   *
   * ── 🔴 Kural: SÜRÜKLEME yüzeyi olan ekranda yuva YOK (Ü161) ─
   *
   * Yuva `fixed` ve köşede duruyor; dar ekranda köşe her zaman bir
   * şeyin üstündedir. Ölçüldü: `/oyunlar`ta imlecin altındaki öge
   * karusel değil **yuva** çıkıyordu — yani kullanıcı kaydırmak
   * isterken yuvaya basıyordu.
   *
   * Kapalı olduğu yerler ve sebepleri:
   *
   *   · `/oyunlar`           — karusel parmakla sürükleniyor
   *   · `/oduller` ve detayı — kazı-kazan kartı parmakla siliniyor
   *   · `/oyna/[oyunId]`     — oyun tahtası parmakla oynanıyor
   *   · `/profil`            — avatar orada zaten büyük duruyor ve
   *                            okşanıyor (Ü147); ikisi aynı karakterin
   *                            iki kopyası olurdu
   *
   * ⚠️ Küçültmek çözüm değildi ve denendi: 56'dan 48 piksele indirildi,
   * `z-30`dan `z-20`ye çekildi — çakışma azaldı ama kalmadı. Köşede
   * duran bir şeyin dar ekranda içeriğin üstüne binmemesi mümkün değil;
   * doğru çözüm **nerede durmayacağına** karar vermek.
   *
   * ⚠️ Yeni bir ekran sürükleme içeriyorsa buraya da yazılmalı: liste
   * gerekçesiyle duruyor, çünkü gerekçesiz bir istisna sonraki
   * okuyucuya "unutulmuş" gibi görünür.
   */
  yuva?: boolean;
}) {
  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <div className="mx-auto w-full max-w-md px-5 pt-6 pb-10 sm:pt-10">
        {geri && (
          <Link
            href={geri.href}
            className="mb-4 -ml-1 inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-1 text-[14px] font-semibold text-yazi-sonuk transition-colors hover:text-yazi"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 5 8 12l7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {geri.etiket}
          </Link>
        )}

        {children}

        {/* Boşluk da şeride bağlı: şerit yoksa altında kalınacak bir
            şey de yok ve o 80 piksel tahtadan çalınmış olur. */}
        {menu && <NavBosluk />}
      </div>

      {yuva && <AvatarYuvasi />}
      {menu && <OyuncuNav aktif={aktif} />}
    </main>
  );
}

/* ── Koyu kart ─────────────────────────────────────────────── */

/**
 * Uygulamanın imza yüzeyi: koyu mor gradyan + ışın dokusu.
 *
 * **Oyuncunun "ben" kartı.** İki ekranda var ve ikisi de aynı şeyi
 * söylüyor: ana ekranın karşılama kartı ve profilin başlığı. Başka bir
 * ekran bunu kullanmak isterse önce şu soruyu cevaplasın — ürünün
 * ikinci bir imza yüzeyine ihtiyacı var mı? Ü65'in cevabı hayır:
 * ekranlar birbirinden renkle ayrılıyor, aynı koyu zeminle değil.
 *
 * ── 🔴 İki kart neden tek bileşen (Ü177) ────────────────────
 *
 * Ü175'te profil başlığı bu gradyanı **elle yazmıştı** ve tonları
 * tutmuyordu: profil #6d28d9 ile açılıyor, bu kart #4c2a8f ile.
 * Ürün sahibi yan yana görüp *"renk olarak aynı olmasını istiyorum"*
 * dedi. İki yerde de elle düzeltmek aynı çatlağı bir tur sonraya
 * ertelemek olurdu — Ü71'in dersi: *"yüzey tek yerden gelmezse her
 * turda bir ekran geride kalıyor."* Artık gradyan, doku ve gölge tek
 * yerde; ikisi **yapı gereği** aynı, tesadüfen değil.
 *
 * ⚠️ Kazanan ton profilinki (daha canlı mor). Sebebi keyfi değil:
 * ürün sahibinin gönderdiği tasarımda kart o tonda ve profil için
 * *"güzel olmuş"* dedi. Bu kart ona uyduruldu, tersi değil.
 *
 * Işınların merkezi kartın **dışında** (yukarıda). İlk denemede merkez
 * kartın ortasına denk geliyordu ve ışınların birleştiği nokta içeriğin
 * üstünde bir hedef tahtası gibi duruyordu.
 *
 * Doku dönmüyor: ana ekran her açılışta hareket etmemeli. Dönen tek
 * yüzey çark sahnesi ve orada hareket zaten olayın kendisi.
 */
export function KoyuKart({
  children,
  className = "",
  sikisik = false,
}: {
  children: React.ReactNode;
  /**
   * Ek sınıflar — dolgu da buradan geçilebiliyor (`pt-5 pb-12`).
   *
   * Tailwind `pt`/`pb`yi `py`den sonra basıyor, yani sınıf listesindeki
   * sıra değil **özgüllük** kazanıyor; iki çağıran da bunu kullanıyor.
   */
  className?: string;
  /** Dar kartlar için daha az iç boşluk. */
  sikisik?: boolean;
}) {
  return (
    <div
      className={`kart-golge relative overflow-hidden rounded-3xl text-white ${
        sikisik ? "px-4 py-4" : "px-5 py-6"
      } ${className}`}
      style={{
        background: "linear-gradient(150deg, #6d28d9 0%, #4c1d95 55%, #3b0f70 100%)",
      }}
    >
      {/*
        🔴 Bulutlar ÜRETİLMİŞ görsel — Ü190.

        Ü189'da bunlar SVG ile çizilmişti (üç eğri) ve ürün sahibi
        *"olmadı, onu da fal ai ile yapalım"* dedi. Haklıydı: referansta
        bulutlar katmanlı, gölgeli ve iki renk ailesi taşıyor; üç düz
        eğri onu vermiyor.

        ⚠️ `cover` + `bottom` — GERİLMİYOR, kırpılıyor. Ü188'de ışık
        hüzmeleri `100% 100%` ile gerildiği için yatay kartlarda
        yassılıp lekeye dönmüştü. Görsel geniş (16:9) üretildi ve
        kompozisyonu bulutlar ALTA toplanacak şekilde kuruldu; kart
        hangi yükseklikte olursa olsun kırpma bulutu altta bırakıyor.

        ⚠️ Gradyan ALTTA DURUYOR ve silinmedi: görsel yüklenmezse kart
        yine kendi morunda kalıyor, beyaz bir dikdörtgen olmuyor.

        ⚠️ Yalnızca BU kartta. `BiletYuzeyi` kafe kartında seviye
        kuşağının rengini taşıyor (Ü65: nane/gök/menekşe/altın) ve mor
        bir bulut görseli oraya konsaydı rengin taşıdığı bilgi
        silinirdi. Orada dalgalar SVG olarak kalıyor — renge uyum
        sağlaması gereken tek şey o.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-bottom"
        style={{ backgroundImage: "url(/kart/zemin-mor.webp)" }}
      />

      {/* Doku da ortak sabitten: iki kart aynı sıklıkta ışınlanmalı. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[240%] left-1/2 size-[300%] -translate-x-1/2"
        style={{ opacity: 0.08, background: ISIN_DOKUSU }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * Koyu kartın içindeki tek sayı.
 *
 * Beyaz opaklık kullanılıyor, sabit renk değil: kartın gradyanı üstten
 * alta koyulaşıyor ve sabit bir gri, üstte açık altta koyu görünürdü.
 */
export function CamKutu({
  etiket,
  deger,
  alt,
  altin,
}: {
  etiket: string;
  deger: string;
  alt?: string;
  /** Kazanılmış bir şeyi gösteriyorsa altın. */
  altin?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-4">
      <div className="etiket-caps leading-tight text-white/60">{etiket}</div>
      <div
        className={`mt-2 font-data text-3xl leading-none font-bold tabular ${
          altin ? "text-odul" : "text-white"
        }`}
      >
        {deger}
      </div>
      {alt && <div className="mt-1.5 text-[11px] leading-snug text-white/55">{alt}</div>}
    </div>
  );
}

/* ── Sayfa başı ────────────────────────────────────────────── */

/**
 * Oyuncu ekranlarının aydınlık başlığı — Ü65.
 *
 * Koyu kartın yerini alıyor. Her ekran kendi renginde: ödüller amber,
 * profil menekşe, sıralama gök. Aynı sayfada iki kez kullanılmıyor —
 * ekranın tek başlığı.
 *
 * ── Çizim neden taşıyor ─────────────────────────────────────
 *
 * Çizim sağ üstten dışarı taşıyor ve kırpılıyor. Kutuya sığdırılmış
 * bir çizim "buraya bir ikon koyduk" diye okunuyordu; taşan çizim
 * kartın kendisini bir nesneye çeviriyor. `overflow-hidden` şart.
 */
export function SayfaBasi({
  ust,
  baslik,
  renk,
  gorsel,
  sahne,
  karakter,
  koyu = false,
  children,
}: {
  ust: string;
  baslik: string;
  renk: OyuncuRengi;
  gorsel?: GorselAdi;
  /**
   * Başlığın sağında duran karakter — Ü178.
   *
   * ⚠️ İsteğe bağlı ve bilerek öyle: `SayfaBasi` altı ekranın ortak
   * başlığı ve karakteri içine gömmek, istenmeyen beş ekrana da
   * koymak olurdu. Bugün yalnızca Ödüllerim veriyor.
   *
   * ⚠️ Karakter varken arka çizim küçülüyor ve soluyor — ikisi aynı
   * köşede duruyor ve tam boyda çizim karakterin arkasından
   * taşıyordu.
   */
  karakter?: React.ReactNode;
  /**
   * Koyu yüzey — Ü182.
   *
   * ⚠️ Varsayılan AÇIK ve öyle kalıyor: başlık altı ekranda ortak ve
   * hepsini koyuya çevirmek ürünün aydınlık tarafını (profil, ödüller,
   * liderlik, fırsatlar) tek kararda değiştirirdi.
   *
   * Bugün yalnızca `/oyunlar` koyu istiyor ve sebebi ölçülebilir:
   * altındaki karusel kartları Ü181'de koyuya geçti, pastel başlık
   * onların üstünde yabancı kaldı. Başlık ile içerik aynı ekranda iki
   * ayrı dil konuşuyordu.
   */
  koyu?: boolean;
  /**
   * Üretilmiş sahne — Ü187.
   *
   * 🔴 Ü180'de dört sahne üretildi, kesildi ve `public/oyun/`a kondu ama
   * `tum-oyunlar` yalnızca ana ekrandaki geçiş kartına bağlandı;
   * kataloğun KENDİ başlığı Ü71'den kalma soluk kumanda çizimiyle kaldı.
   * Ürün sahibi *"burdaki oyunlar kısmını düzeltmeyi unutmuşsun"* dedi
   * ve haklıydı — altındaki karusel kartları neon, başlık silik bir
   * harita deseni.
   *
   * ⚠️ `gorsel` ile birlikte kullanılmıyor: `gorsel` kartın arkasında
   * %15–24 opaklıkta **fısıldayan** bir çizim, sahne ise tam renkte
   * duruyor. İkisi aynı köşede olsaydı biri diğerinin altında gürültü
   * bırakırdı (`GecisKarti`de aynı kural yazılı).
   */
  sahne?: string;
  /** Başlığın altındaki sayaçlar. */
  children?: React.ReactNode;
}) {
  const r = RENK[renk];

  return (
    <header
      /*
        ⚠️ Sahne varken SAĞ DOLGU büyüyor (`pr-28`) ve sebebi ölçüldü.
        Kart 335 piksel, sahne sağdan taşıyor ve sol kenarı 217'de
        başlıyor; altyazı ise 20 piksel dolguyla 315'e kadar uzanıyordu,
        yani son 98 piksel neonun üstünde kalıyordu. Perdeyi
        güçlendirmek çözüm değil — o zaman da sahne sönüyor. Metni
        sahnenin başladığı yerde durdurmak ikisini birden koruyor.
      */
      className={`kart-golge kart-gel relative mb-8 overflow-hidden rounded-3xl py-6 ${
        sahne ? "pr-28 pl-5" : "px-5"
      } ${koyu ? "text-white" : ""}`}
      style={
        koyu
          ? { background: `linear-gradient(115deg, ${r.koyu} 0%, ${r.ana} 100%)` }
          : kartStili(renk)
      }
    >
      {koyu ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-[240%] left-1/2 size-[300%] -translate-x-1/2"
          style={{ opacity: 0.08, background: ISIN_DOKUSU }}
        />
      ) : (
        <KartDokusu renk={renk} />
      )}
      {/*
        Sahne sağdan ve üstten taşıyor — karusel kartlarıyla aynı kural
        (Ü181): kutuya sığdırılmış çizim "buraya bir ikon koyduk" diye
        okunuyor, taşan çizim kartı bir nesneye çeviriyor.

        ⚠️ Perde burada SOLDAN SAĞA, karusel kartındaki gibi aşağıdan
        yukarı değil. Sebep kartın biçimi: başlık kartı yatık ve geniş,
        metin solda duruyor. Aşağıdan gelen bir perde başlığın altını
        temizlerdi ama "Oyunlar" yazısı sahnenin tam yanında.
      */}
      {sahne && sahneVarMi(sahne) ? (
        <>
          <span aria-hidden className="pointer-events-none absolute -top-6 -right-11">
            <OyunSahnesi oyun={sahne} boy={190} />
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-3/4"
            style={{
              background: `linear-gradient(to right, ${koyu ? r.koyu : "transparent"} 40%, transparent 100%)`,
            }}
          />
        </>
      ) : null}
      {/*
        Çizim sağ kenarın dışına taşıyor: yalnızca sol yarısı görünüyor
        ve başlığın altına girmiyor. Daha içeride çizildiğinde biletin
        dairesi tam "Ödüllerim" yazısının üstüne oturuyor ve rakam gibi
        okunuyordu.
      */}
      {!sahne && gorsel && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 -right-16"
          style={{
            // ⚠️ Koyuda çizim BEYAZ: `koyu` tonu koyu zeminde
            // kayboluyor — koyu rengin üstüne koyu renk (Ü171).
            color: koyu ? "#fff" : r.koyu,
            opacity: koyu ? 0.15 : karakter ? 0.14 : 0.24,
            transform: "rotate(-8deg)",
          }}
        >
          <Gorsel ad={gorsel} boy={karakter ? 132 : 172} />
        </span>
      )}

      <div className="relative flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="etiket-caps" style={{ color: koyu ? r.canli : r.koyu }}>
            {ust}
          </p>
          <h1 className="mt-1 font-display text-3xl leading-none font-extrabold tracking-tight">
            {baslik}
          </h1>
        </div>

        {/*
          ⚠️ Kolon SABİT genişlikte — Ü174'ün dersi: esnek kolonda
          karakter metnin yerini yiyor ve 375 pikselde başlık
          bölünüyor. `-mr-2` ile karakter kartın kendi iç dolgusuna
          taşıyor, o yer metinden alınmıyor.
        */}
        {karakter && <div className="-mr-4 w-[8.5rem] shrink-0">{karakter}</div>}
      </div>

      {children && <div className="relative mt-5">{children}</div>}
    </header>
  );
}

/**
 * Aydınlık başlıktaki tek sayı.
 *
 * Zemin beyaz, kartın pastelinin üstünde: pastel üstüne pastel
 * koyduğumuzda kutunun kenarı kayboluyordu.
 */
export function Sayac({
  etiket,
  deger,
  alt,
  renk,
}: {
  etiket: string;
  deger: string;
  alt?: string;
  /** Verilmezse sayı nötr siyah — "önemli olan bu değil" demek. */
  renk?: OyuncuRengi;
}) {
  const r = renk ? RENK[renk] : null;
  return (
    <div className="kart-golge rounded-2xl bg-yuzey px-4 py-3.5">
      <div className="etiket-caps leading-tight text-yazi-sonuk">{etiket}</div>
      <div
        className="mt-1.5 font-data text-2xl leading-none font-bold tabular"
        style={r ? { color: r.ana } : undefined}
      >
        {deger}
      </div>
      {alt && <div className="mt-1 text-[11px] leading-snug text-yazi-sonuk">{alt}</div>}
    </div>
  );
}

/* ── Görselli kart ─────────────────────────────────────────── */

/**
 * Arkasında soluk bir çizim taşıyan kart — Ü66.
 *
 * Ürün sahibinin isteği: *"indirim ne ile alakalıysa arka planda
 * şeffaf biçimde o görünsün."* Aynı düzen oyun kartlarında da
 * kullanılıyor.
 *
 * Çizim **sağ alt köşeden taşıyor** ve `overflow-hidden` onu
 * kırpıyor. Kutuya sığdırılmış bir çizim "ikon" gibi okunuyordu;
 * taşan çizim arka plan oluyor.
 *
 * Saydamlık 0.16: 0.30'da metnin altında desen görünüyor ve başlık
 * okunmuyordu, 0.08'de çizim hiç fark edilmiyordu.
 */
export function GorselKart({
  renk,
  gorsel,
  className = "",
  children,
}: {
  renk: OyuncuRengi;
  gorsel: GorselAdi;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`kart-golge kart-gel relative overflow-hidden rounded-3xl ${className}`}
      style={kartStili(renk)}
    >
      <KartDokusu renk={renk} gorsel={gorsel} />
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * Biletin yüzeyi, kupon OLMAYAN kartlar için (Ü171).
 *
 * ⚠️ `KoyuKart` DEĞİL ve olamaz: o, ana ekranın sabit mor imza yüzeyi
 * ve kendi dokümanı *"yalnızca ana ekranın durum kartı için"* diyor.
 * Bu ise kartın **kendi rengini** alıyor — oyun mavi, fırsat yeşil.
 * İkisini tek isim altında toplamak, Ü65'in "ekranlar renkle ayrılır"
 * kuralını sessizce bozardı.
 *
 * ── Neden doğdu ─────────────────────────────────────────────
 *
 * Ürün sahibi `/oyna` ekranına bakıp *"burdaki kart tasarımını
 * beğenmedim, ödüllerim kısmındakiler daha güzel, ona göre uyumlu
 * yapmalıyız"* dedi.
 *
 * Haklıydı ve sebebi tek bir şey: aynı üründe **iki ayrı kart dili**
 * vardı. Bilet (Ü72) koyu doygun zemin + döşeli desen + taşan çizim;
 * `GorselKart` ise pastel zemin + soluk ışın + soluk çizim. Yan yana
 * gelmedikleri için fark edilmemişti ama oyuncu ikisini aynı gezinti
 * içinde görüyor.
 *
 * ── Biletin kopyası değil, aynı ailenin üyesi ───────────────
 *
 * `Bilet` doğrudan kullanılamıyor: onun deseni ve sahnesi **kupon
 * kategorisine** bağlı (`KuponGorseli` — sıcak/tatlı/para/soğuk).
 * Oyun ve geçiş kartlarının anlatacak bir kategorisi yok, onların
 * çizimi `GorselAdi` ailesinden (kumanda, etiket, oyun çizimleri).
 *
 * O yüzden desen yerine **ışın** kalıyor — Ü72'nin kendi notu da bunu
 * söylüyordu: *"Diğer kartlar hâlâ ışın dokusunda; orada anlatacak bir
 * desen yok."* Değişen şey ışının artık koyu zeminde görünür olması:
 * pastelde %5'te kayboluyordu.
 *
 * ── Perde neden var ─────────────────────────────────────────
 *
 * Biletteki gerekçenin aynısı: taşan çizim metnin sağ ucuna değiyor.
 * Soldan sağa açılan perde metni okunur bırakıyor, çizimi kapatmıyor.
 */
export function BiletYuzeyi({
  renk,
  gorsel,
  className = "",
  yuvarlak = true,
  govde = "div",
  children,
}: {
  renk: OyuncuRengi;
  gorsel?: GorselAdi;
  className?: string;
  /**
   * Köşeler ve gölge — Ü172.
   *
   * Yüzey her zaman kartın tamamı olmuyor: yuvarlağı ve gölgeyi dıştaki
   * bir kap veriyorsa (profildeki kafe kartında `<section>`, çünkü
   * "buradasın" çerçevesi ona ait) yüzeyin kendi yuvarlağını taşıması
   * köşelerde iki kat eğri bırakır, kendi gölgesi de kartın içinde ikinci
   * bir kart varmış gibi okunur.
   *
   * ⚠️ Ü192'ye kadar buradaki gerekçe farklıydı: kafe kartının ALT
   * yarısı beyaz bir liste olduğu için yüzey yalnızca üst şeritti. O
   * liste kalktı (bkz. `profil/page.tsx`), kartın tamamı bu yüzey —
   * ama dıştaki kap durduğu için bayrak da duruyor.
   */
  yuvarlak?: boolean;
  /**
   * Dış etiket — Ü196.
   *
   * ⚠️ Varsayılan `div` ve öyle kalıyor; `span` yalnızca yüzey bir
   * `<button>`ın İÇİNE giriyorsa gerekiyor. `<button>`ın içerik modeli
   * **phrasing** içerik istiyor ve `<div>` orada geçersiz. Aynı kartın
   * bir ekranda bağlantı, başka ekranda düğme olması gerektiğinde
   * (misafirin oyun seçimi) tek çıkış yolu bu — alternatifi kartın
   * ikinci bir kopyasını yazmaktı.
   */
  govde?: "div" | "span";
  children: React.ReactNode;
}) {
  const r = RENK[renk];
  const Govde = govde;

  return (
    <Govde
      className={`relative block overflow-hidden ${yuvarlak ? "kart-golge kart-gel rounded-3xl" : ""} ${className}`}
      style={{ background: `linear-gradient(115deg, ${r.koyu} 0%, ${r.ana} 100%)` }}
    >
      {/* Ü189: dalgalar artık koyu yüzey ailesinin parçası. Tek tek
          kartlara eklenseydi biri unutulur ve o kart geride kalırdı —
          Ü71'in dersi: *"yüzey tek yerden gelmezse her turda bir ekran
          geride kalıyor."* */}
      <KartDalgalari vurgu={`${r.canli}38`} />

      {/* Işın: pastelde %5'te kayboluyordu, koyu zeminde %8 yetiyor. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[240%] left-1/2 size-[300%] -translate-x-1/2"
        style={{ opacity: 0.08, background: ISIN_DOKUSU }}
      />

      {/*
        Çizim beyaz ve büyük — `ArkaCizim` DEĞİL.
        O, `koyu` tonu %24 opaklıkla çiziyor ve koyu zeminde kayboluyor:
        koyu rengin üstüne koyu renk. Burada beyaz, açık zeminde
        yapamayacağı kadar büyük durabiliyor.
      */}
      {gorsel && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 -right-7 -translate-y-1/2 text-white"
          style={{ opacity: 0.17 }}
        >
          <Gorsel ad={gorsel} boy={150} />
        </span>
      )}

      {/* Perde: çizimin metne değdiği yerde zemin koyulaşıyor. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(100deg, ${r.koyu} 24%, ${r.koyu}cc 44%, transparent 68%)`,
        }}
      />

      {/* ⚠️ İç sarmalayıcı da dış etiketi takip ediyor: `<span>` gövdenin
          içinde `<div>` kalsaydı geçersizlik bir katman aşağı kayardı. */}
      <Govde className="relative block">{children}</Govde>
    </Govde>
  );
}

/**
 * Kartın satır içi stili — zemin ve çerçeve.
 *
 * Bileşene sarılamayan kartlar da var (bir `<Link>`, bir `<section>`,
 * oyun kabuğundaki `<div>`); onlar bu nesneyi doğrudan `style`'a
 * veriyor. Yüzey yine tek yerden geliyor.
 */
export function kartStili(renk: OyuncuRengi): React.CSSProperties {
  return { background: kartZemin(renk), border: `1px solid ${kartKenar(renk)}` };
}

/**
 * Kartın iki dokusu: ışın ve arka çizim — Ü71.
 *
 * İkisi birlikte duruyor çünkü ikisi de kartın **yüzeyi**, içeriği
 * değil. Ayrı ayrı çağrıldıklarında bir kartta ışın unutuluyor,
 * diğerinde çizim yanlış tarafa düşüyordu.
 *
 * `gorsel` isteğe bağlı: bazı kartların (profildeki hesap satırı gibi)
 * anlatacak bir çizimi yok ama yüzeyi aynı kalmalı.
 */
export function KartDokusu({ renk, gorsel }: { renk: OyuncuRengi; gorsel?: GorselAdi }) {
  return (
    <>
      {/*
        Işınların merkezi kartın **dışında** (yukarıda). Merkez içeride
        kaldığında ışınların birleştiği nokta metnin üstüne denk geliyor
        ve hedef tahtası gibi duruyor.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[240%] left-1/2 size-[300%] -translate-x-1/2"
        style={{ opacity: ISIN_OPAKLIK, background: ISIN_DOKUSU }}
      />
      {gorsel && <ArkaCizim renk={renk} gorsel={gorsel} />}
    </>
  );
}

/**
 * Kartın sağındaki soluk çizim.
 *
 * Sağ kenardan taşıyor ve dikeyde ortalı. Önceki hâli sağ **alt**
 * köşedeydi ve kısa kartlarda çizimin yalnızca üst şeridi görünüyordu.
 *
 * Renk `koyu`: açık zeminde `ana` tonu yeterince ayrılmıyordu.
 */
export function ArkaCizim({ renk, gorsel }: { renk: OyuncuRengi; gorsel: GorselAdi }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-1/2 -right-6 -translate-y-1/2"
      style={{ color: RENK[renk].koyu, opacity: 0.24 }}
    >
      <Gorsel ad={gorsel} boy={118} />
    </span>
  );
}

/* ── Renkli kart ───────────────────────────────────────────── */

/**
 * Oyuncu tarafının gövde kartı — pastel zemin, renkli çerçeve.
 *
 * `dolu` ile doygun hâle geçiyor: ekranda **yapılacak tek şeyi**
 * gösteren kart (çark hazırsa çark, değilse günün oyunu) dolu, geri
 * kalanı pastel. İki dolu kart yan yana gelirse hangisine dokunulacağı
 * belirsizleşir.
 */
/**
 * ⚠️ Ü188'den beri KULLANILMIYOR.
 *
 * Son çağıranı ana ekrandaki çark kartıydı; o da koyu bilet yüzeyine
 * geçti. Silinmedi çünkü "dolu/sakin" iki durumlu renkli kart fikri
 * ürünün dilinde duruyor ve pastel bir yüzey gerektiren bir ekran
 * çıkarsa buradan devam edilir. Bir tur daha kimse çağırmazsa silinmeli.
 */
export function RenkliKart({
  renk,
  dolu,
  className = "",
  children,
}: {
  renk: OyuncuRengi;
  dolu?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const r = RENK[renk];
  return (
    <div
      className={`relative overflow-hidden rounded-3xl px-5 py-5 ${className}`}
      style={{
        background: dolu
          ? `linear-gradient(140deg, ${r.canli} 0%, ${r.ana} 100%)`
          : r.zemin,
        border: `1px solid ${dolu ? r.ana : r.canli}`,
        color: dolu ? "#ffffff" : undefined,
      }}
    >
      {children}
    </div>
  );
}

/* ── Renkli pul ────────────────────────────────────────────── */

/**
 * Rozet, ünvan, küçük etiket.
 *
 * Zemin **beyaz**, rengin pastel tonu değil: pullar çoğunlukla zaten
 * pastel bir kartın üstünde duruyor (profildeki kafe kartı) ve pastel
 * üstüne pastel konduğunda pulun kenarı kayboluyordu. Beyaz zemin her
 * iki yüzeyde de okunuyor.
 */
export function Pul({
  baslik,
  aciklama,
  renk = "amber",
}: {
  baslik: string;
  aciklama?: string;
  renk?: OyuncuRengi;
}) {
  const r = RENK[renk];
  return (
    <span
      className="inline-block rounded-full bg-yuzey px-2.5 py-1 etiket-caps text-[10px]"
      style={{ color: r.koyu, border: `1px solid ${r.canli}` }}
      title={aciklama}
    >
      {baslik}
    </span>
  );
}

/* ── Sıra jetonu ───────────────────────────────────────────── */

/**
 * Madalya renkleri — altın, gümüş, bronz.
 *
 * Palet jetonu değiller (Ü31): sıralamada üç ayrı basamağı ayırt eden
 * fiziksel bir gelenek bu, ürünün renk sistemi değil. Tek yerde
 * duruyorlar çünkü ana ekran ve `/liderlik` aynı listeyi gösteriyor —
 * birinci iki ekranda iki farklı renkte olsaydı iki farklı liste
 * sanılırdı.
 */
export const MADALYA = ["#ffcf3f", "#d8dde6", "#d9a06a"] as const;

/** Liderlik satırının başındaki sıra numarası. İlk üç madalya rengi. */
export function SiraJetonu({ sira, kucuk }: { sira: number; kucuk?: boolean }) {
  const madalya = sira <= 3;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-data font-bold tabular ${
        kucuk ? "size-6 text-[11px]" : "size-7 text-[12px]"
      } ${madalya ? "text-[#1b0e38]" : "bg-cukur text-yazi-sonuk"}`}
      style={madalya ? { background: MADALYA[sira - 1] } : undefined}
    >
      {sira}
    </span>
  );
}

/* ── Bölüm başlığı ─────────────────────────────────────────── */

/** Oyuncu ekranlarında bölüm başlığı — sağda isteğe bağlı bir not. */
export function OyuncuBolum({
  baslik,
  not,
  renk,
  children,
}: {
  baslik: string;
  not?: string;
  /** Başlığı bölümün rengine boyar; verilmezse nötr gri. */
  renk?: OyuncuRengi;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-9">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="etiket-caps" style={renk ? { color: RENK[renk].ana } : undefined}>
          <span className={renk ? "" : "text-yazi-sonuk"}>{baslik}</span>
        </h2>
        {not && <span className="font-data text-[10px] text-yazi-sonuk">{not}</span>}
      </div>
      {children}
    </section>
  );
}
