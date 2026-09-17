"use client";

import { Children, useEffect, useRef, useState } from "react";

/**
 * Vitrinin kaydırma hareketleri — madde 38 (Ü120).
 *
 * ── Örnek sitelerde ne kullanılıyor ─────────────────────────
 *
 * Ürün sahibi *"oradaki kaydırma efektlerini beğendim"* dedi. İki örnek
 * sayfanın kaynağına bakıldı:
 *
 *   · **Ink Games** — `<html class="lenis">`: Lenis yumuşak kaydırma
 *     kütüphanesi. 160 geçişli öge, 125 `transform`, 44 `will-change`.
 *   · **Autonomous** — kütüphane yok. 49 CSS geçişi, muhtemelen
 *     IntersectionObserver ile tetikleniyor. 3 ögede `perspective`.
 *
 * ── Neden Lenis EKLENMEDİ ───────────────────────────────────
 *
 * Lenis tarayıcının kendi kaydırmasını devralıyor. Küçük bir kütüphane
 * ama bedeli var: dokunmatik cihazlarda his değişiyor, klavye ve ekran
 * okuyucu kaydırmasıyla uğraşmak gerekiyor ve `prefers-reduced-motion`
 * elle ele alınmazsa hareketi kapatmış kullanıcıya da uygulanıyor.
 * Ayrıca projenin bağımlılık listesi bilerek kısa (next, pg, react, zod).
 *
 * Görsel kazancın büyük kısmı yumuşak kaydırmadan değil **kaydırmaya
 * bağlı dönüşümlerden** geliyor; onlar burada, bağımlılıksız yazıldı.
 * Ürün sahibi isterse Lenis ayrıca takılabilir — arayüz değişmez.
 */

/* ── Belirme ───────────────────────────────────────────────── */

/**
 * Belirme yönleri — her birinin kendi dönüşümü ve **kendi süresi**.
 *
 * ── 🔴 Neden yön eklendi (Dalga 8) ──────────────────────────
 *
 * Ürün sahibi *"mobilimiz berbat kaldı"* dedi. Sayfa hareketsiz değildi:
 * `Beliren` on sekiz yerde kullanılıyordu ve **on sekizi de aynıydı** —
 * aynı 20 piksel, aynı 0,7 saniye, aynı eğri. Tekrarlanan tek bir geçiş
 * bir süre sonra hareket olarak okunmuyor; göz onu sayfanın yüklenme
 * gecikmesi sanıyor. Çeşit, hareketin miktarını değil **ritmini**
 * değiştiriyor.
 *
 * ── ⚠️ Yatay mesafe neden 16 piksel ─────────────────────────
 *
 * Sayfanın yan boşluğu `px-5` = 20 piksel; 16 piksellik kayma o boşluğun
 * içinde kalıyor ve taşma yaratmıyor.
 *
 * 🔴 **Ama bu yalnızca boşluğun içinde duran içerik için doğru.** İlk
 * yazılışta "16 < 20, taşma imkânsız" diye düşünülmüştü ve ölçüm bunu
 * yalanladı: `-mx-5` ile yan boşluğu aşan bir öge (vitrindeki telefon
 * sırası) zaten tam ekran genişliğinde, yani 16 piksel kayınca sağ kenar
 * ekranın dışına çıkıyor. 390 piksellik ekranda belge 406 piksel oldu ve
 * mobilde yatay kaydırma çubuğu doğdu.
 *
 * Kural: **tam genişlikteki bir bloğa `sol`/`sag` verilmez.** Onlara
 * `alt`, `yakin` ya da `olcek` veriliyor; hiçbiri yatay yer değiştirmiyor.
 */
const YONLER = {
  /** Varsayılan: alttan yukarı. */
  alt: { donusum: "translateY(20px)", sure: 0.7 },
  /** Soldan girer — ızgarada solda duran sütun için. */
  sol: { donusum: "translateX(-16px)", sure: 0.62 },
  /** Sağdan girer. */
  sag: { donusum: "translateX(16px)", sure: 0.62 },
  /** Uzaktan yaklaşır — başlıklarda ağır ve yavaş durur. */
  olcek: { donusum: "scale(0.955)", sure: 0.82 },
  /** Alttan gelirken bir yandan büyür — görseller için. */
  yakin: { donusum: "translateY(26px) scale(0.975)", sure: 0.75 },
} as const;

export type BelirmeYonu = keyof typeof YONLER;

/**
 * "Görüş alanına girdi mi" — tek yerde.
 *
 * Üç hareket de (`Beliren`, `Cizilen`, `Sirali`) aynı soruyu soruyor ve
 * aynı cevabı istiyor: **bir kez**, göründüğünde. Ayrı ayrı yazılsaydı
 * `rootMargin` üçünde ayrışır ve aynı bölümdeki iki hareket farklı
 * anlarda başlardı.
 *
 * ⚠️ Gözlemci kurulamazsa `true` dönüyor: bir efekt uğruna içeriği
 * kaybetmek kabul edilemez. Aynı sebeple `disconnect` ilk girişte —
 * hareket tekrar etmiyor (Ü133: tekrarlayan hareket hareket olarak
 * okunmuyor).
 */
function useGorunur<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [gorunur, setGorunur] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setGorunur(true);
      return;
    }

    /*
      🔴 Gözlemciyi beklemeden: öge zaten ekrandaysa hemen aç.

      `IntersectionObserver` geri çağrısını **arka plandaki sekmeye hiç
      teslim etmiyor** — sekme gizliyken `requestAnimationFrame` de
      duruyor ve gözlemci onunla aynı çizim döngüsüne bağlı. Sayfa
      arka planda açılırsa (bağlantıya orta tıkla, sekmeyi arkada aç,
      önden getirme) ekranın üstündeki içerik `opacity: 0`da kalıyor ve
      kullanıcı sekmeye geçene kadar **görünmüyor**.

      Bu ölçülerek bulundu: pane gizliyken 15 kartın 15'i saydamlıkta
      takılı kaldı ve elle kurulan bir gözlemci de ateşlemedi.

      Kutu okuması senkron — gizli sekmede de doğru cevap veriyor.
      Ekran dışındaki içerik yine gözlemciyi bekliyor, yani kaydırma
      hareketi kaybolmuyor; kapanan şey yalnızca "hiç görünmeme" hâli.
    */
    const kutu = el.getBoundingClientRect();
    if (kutu.top < window.innerHeight && kutu.bottom > 0) {
      setGorunur(true);
      return;
    }

    const gozlemci = new IntersectionObserver(
      ([giris]) => {
        if (giris.isIntersecting) {
          setGorunur(true);
          gozlemci.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    gozlemci.observe(el);
    return () => gozlemci.disconnect();
  }, []);

  return [ref, gorunur] as const;
}

/**
 * Görüş alanına girince beliren bölüm — Autonomous'ın tekniği.
 *
 * Gözlemci kurulamazsa içerik **görünür kalıyor**: bir efekt uğruna
 * içeriği kaybetmek kabul edilemez.
 */
export function Beliren({
  children,
  gecikme = 0,
  yon = "alt",
  className,
}: {
  children: React.ReactNode;
  gecikme?: number;
  /** Nereden gireceği. Varsayılan alttan — eski çağrılar aynı kalıyor. */
  yon?: BelirmeYonu;
  className?: string;
}) {
  const [ref, beliren] = useGorunur<HTMLDivElement>();

  const { donusum, sure } = YONLER[yon];

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: beliren ? 1 : 0,
        transform: beliren ? "none" : donusum,
        transition: `opacity ${sure}s ease ${gecikme}ms, transform ${sure}s cubic-bezier(.2,.7,.3,1) ${gecikme}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Çizilen iz ────────────────────────────────────────────── */

/**
 * Görüş alanına girince **kendini çizen** SVG.
 *
 * ── Neden bu hareket eklendi ────────────────────────────────
 *
 * Ürün sahibi: *"mobil landing page için sana söylediğim hiçbir animasyon
 * gerçekleşmemiş."* Ölçüm onu doğruladı: 10.989 piksellik mobil vitrinin
 * 5.791'inci pikselinden aşağısında — sayfanın **%47'sinde** — hiçbir
 * keyframe animasyonu yoktu. Duran tek hareket `Beliren`'di ve o da tek
 * bir jest: yukarı doğru soluklaşma, 35 kez.
 *
 * 🔴 **Çözüm daha çok soluklaşma değil.** Dalga 8 aynı teşhisi koyup beş
 * *yön* eklemişti; aynı jestin beş yönü hâlâ aynı jest. Eksik olan şey
 * çeşit değil **anlam**: hareketin bölümün ne iddia ettiğini taşıması.
 * Çizilen bir iz, "bu oluyor" diyor; soluklaşan bir kutu yalnızca
 * "buradayım" diyor.
 *
 * ── `pathLength="1"` neden şart ─────────────────────────────
 *
 * `stroke-dashoffset` mutlak uzunluk istiyor ve her yolun uzunluğu
 * farklı — CSS'ten tek bir sayı veremezsin, JS ile `getTotalLength()`
 * okumak gerekirdi. `pathLength="1"` yolun uzunluğunu **1'e
 * normalleştiriyor**: dasharray da offset de 1, hangi yol olursa olsun.
 * Böylece hareketin tamamı CSS'te kalıyor.
 *
 * ── 🔴 Öznitelik neden ELLE bırakılmadı ─────────────────────
 *
 * İlk yazılışta kural "çocuk yollara `pathLength="1"` yaz" idi ve bir
 * test onu koruyacaktı. Test yazıldı, koştu, **yeşil yandı ve hiçbir
 * şey sınamıyordu**: `<Cizilen>` çoğu zaman bir *bileşen* sarıyor
 * (`<DonguIzi />`) ve SVG yolları o bileşenin içinde, yani `<Cizilen>`
 * bloğunun dışında kalıyor. Kaynak taraması onları hiç görmüyordu.
 *
 * Unutulduğunda sessizce çalışmayan bir kural, kuralın kendisi
 * yanlıştır. Öznitelik artık **burada** konuyor: yazarın hatırlaması
 * gereken bir şey kalmadı. Biçimlendirmede duranlar zararsız — zaten
 * aynı değer.
 */
export function Cizilen({
  children,
  gecikme = 0,
  sure = 1.1,
  className,
  style,
}: {
  children: React.ReactNode;
  gecikme?: number;
  /** Saniye. Uzun iz yavaş çizilmeli, yoksa çırpınmış gibi duruyor. */
  sure?: number;
  className?: string;
  /**
   * Ek satır içi stil — kabın kendisi de canlanacaksa (örn. mührün
   * basılması) onun değişkenleri buradan geliyor.
   *
   * ⚠️ İzin kendi değişkenlerinden **sonra** yayılıyor, yani dışarıdan
   * `--iz-sure` geçilirse o kazanıyor. Bilinçli: çağrı yeri istisna
   * yapabilmeli.
   */
  style?: React.CSSProperties;
}) {
  const [ref, gorunur] = useGorunur<HTMLDivElement>();

  /*
    Yolları normalleştir — biçimlendirmede unutulmuş olsa bile.

    ⚠️ `hasAttribute` kontrolü var: çağrı yeri bilerek başka bir değer
    vermişse (parçalı iz, ters yön) ona dokunulmuyor.
  */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll("path, circle, line, polyline").forEach((yol) => {
      if (!yol.hasAttribute("pathLength")) yol.setAttribute("pathLength", "1");
    });
  }, [ref]);

  return (
    <div
      ref={ref}
      className={`${gorunur ? "iz-cizilen" : "iz-bekliyor"} ${className ?? ""}`}
      style={
        {
          "--iz-sure": `${sure}s`,
          "--iz-gecikme": `${gecikme}ms`,
          ...style,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

/* ── Sıralı giriş ──────────────────────────────────────────── */

/**
 * Çocukları **teker teker** içeri alan kap.
 *
 * ── Neden `Beliren`in gecikmesi yetmiyordu ──────────────────
 *
 * Bugün sıralama elle yazılıyor: her kardeşe ayrı bir `<Beliren
 * gecikme={110}>`. Üç kutuda katlanılır, dört maddelik bir listede
 * değil — ve asıl sorun şu: elle yazılan gecikme **liste uzunluğundan
 * habersiz**. Bir madde eklendiğinde ritim bozuluyor ve kimse fark
 * etmiyor.
 *
 * Burada ritim kabın işi: çocuk sayısı ne olursa olsun `adim` kadar
 * arayla giriyorlar.
 *
 * ── ⚠️ Yatay kayma YOK ──────────────────────────────────────
 *
 * Dalga 8'in kuralı: tam genişlikteki bloğa yatay kayma verilmez, 390
 * piksellik ekranda belge 406 piksel oluyor. Bu kap nerede kullanılacağını
 * bilmediği için **hiç** yatay kaymıyor — yalnızca dikey ve ölçek.
 */
export function Sirali({
  children,
  adim = 90,
  gecikme = 0,
  className,
  cocukSinifi,
  etiket = "div",
  cocukEtiketi = "div",
}: {
  children: React.ReactNode;
  /** İki çocuk arasındaki milisaniye. */
  adim?: number;
  gecikme?: number;
  className?: string;
  /**
   * Sarmalayıcıya eklenen sınıf — ızgaralarda `h-full` için.
   *
   * ⚠️ Gerekli çünkü sarmalayıcı **araya giriyor**: `Kart`, `Kanit` ve
   * `Kayip` `h-full` taşıyor ve ızgarada eşit yükseklik bekliyorlar.
   * Sarmalayıcı ızgara ögesi olduğu için esneyen odur; içindeki kartın
   * ona yetişebilmesi için sarmalayıcının da yüksekliği geçirmesi
   * gerekiyor. Varsayılan olarak eklenmiyor — esnek ya da satır içi
   * kullanımda `h-full` kutuyu bozardı.
   */
  cocukSinifi?: string;
  /**
   * Kabın ve çocukların etiketi.
   *
   * ⚠️ Gerekli çünkü sarmalayıcı araya giriyor: bir listede
   * `<ul><div><li>` üretmek geçersiz HTML ve ekran okuyucu listeyi liste
   * olarak duyurmaz. Madde listelerinde `etiket="ul" cocukEtiketi="li"`
   * veriliyor, kartlarda varsayılan `div` kalıyor.
   */
  etiket?: "div" | "ul";
  cocukEtiketi?: "div" | "li";
}) {
  const [ref, gorunur] = useGorunur<HTMLDivElement>();
  const cocuklar = Children.toArray(children);
  /*
    ⚠️ `as "div"`: kap `div` ya da `ul` olabiliyor ve ikisinin ref tipi
    ayrı (`HTMLDivElement` / `HTMLUListElement`). Birleşim tipi ref'i
    kesişime düşürüyor ve hiçbir öge ikisini birden karşılamıyor.
    Gözlemcinin tek ihtiyacı `Element`, yani daralma zararsız.
  */
  const Kap = etiket as "div";
  const Cocuk = cocukEtiketi as "div";

  return (
    <Kap ref={ref} className={className}>
      {cocuklar.map((cocuk, i) => (
        <Cocuk
          key={i}
          className={`${gorunur ? "sirali-giren" : "sirali-bekliyor"} ${cocukSinifi ?? ""}`}
          style={
            { "--sira-gecikme": `${gecikme + i * adim}ms` } as React.CSSProperties
          }
        >
          {cocuk}
        </Cocuk>
      ))}
    </Kap>
  );
}

/* ── Kaydırmaya bağlı kayma (parallaks) ────────────────────── */

/**
 * Sayfa kaydıkça farklı hızda hareket eden katman.
 *
 * Ink Games'in derinlik hissi burada: ön plandaki nesneler arka plandan
 * daha hızlı kayıyor ve göz bunu derinlik olarak okuyor.
 *
 * ── Neden `requestAnimationFrame` ───────────────────────────
 *
 * Kaydırma olayı saniyede onlarca kez tetikleniyor; her seferinde DOM'a
 * yazmak kare atlatıyor. Değer olayda okunup **bir sonraki karede**
 * yazılıyor, arada birikirse tek yazma yapılıyor.
 *
 * ── Hareketi kapatan kullanıcı ──────────────────────────────
 *
 * `prefers-reduced-motion` açıksa efekt **hiç kurulmuyor**: öge yerinde
 * duruyor. Burada `globals.css`in süre sıfırlaması yetmezdi — bu hareket
 * CSS animasyonu değil, kaydırmaya bağlı canlı bir dönüşüm.
 */
export function Kayan({
  children,
  hiz = 0.12,
  className,
}: {
  children: React.ReactNode;
  /** Kaydırmanın kaçta kaçı kadar kaysın. Eksi değer ters yöne. */
  hiz?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let kare = 0;

    const yaz = () => {
      kare = 0;
      const kutu = el.getBoundingClientRect();
      // Ögenin ekran ortasına uzaklığı — ortadayken sıfır.
      const merkez = kutu.top + kutu.height / 2 - window.innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-merkez * hiz).toFixed(2)}px, 0)`;
    };

    const kaydir = () => {
      if (!kare) kare = requestAnimationFrame(yaz);
    };

    yaz();
    window.addEventListener("scroll", kaydir, { passive: true });
    window.addEventListener("resize", kaydir, { passive: true });
    return () => {
      if (kare) cancelAnimationFrame(kare);
      window.removeEventListener("scroll", kaydir);
      window.removeEventListener("resize", kaydir);
    };
  }, [hiz]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}

/* ── Üç boyutlu eğilme: fare + kaydırma ────────────────────── */

/**
 * Fareyle oynayan, kaydırdıkça doğrulan eğik kart — Ink Games'in tekniği.
 *
 * Ürün sahibi: *"Görseller mouse hover efektiyle oynak olmalı, Ink
 * Games'teki gibi."*
 *
 * ── 🔴 İlk sürümde eksik olan şey ───────────────────────────
 *
 * İlk yazılışta eğilme **yalnızca kaydırmaya** bağlıydı: kart görüş
 * alanına girerken doğruluyor, sonra donuyordu. Ink Games'te asıl his
 * oradan gelmiyor — kart **imleci takip ediyor**, yani ziyaretçi
 * görselle oynayabiliyor. Kaydırmaya bağlı giriş bir animasyon, fareyle
 * eğilme ise bir **etkileşim**; ikisi farklı şeyler ve istenen ikincisi.
 *
 * ── İki kaynak tek dönüşümde toplanıyor ─────────────────────
 *
 *   · **Giriş (kaydırma):** kart alttan girerken yatık ve küçük,
 *     yükseldikçe doğruluyor. Dinlenme hâlinde 2 derecelik kalıntı açı
 *     bırakılıyor — sıfırlansaydı hareket bitince yine sıradan bir
 *     dikdörtgen olurdu.
 *   · **Etkileşim (fare):** imlecin kart üstündeki konumu −1..1'e
 *     çevriliyor; kart imlece doğru dönüyor ve hafifçe öne geliyor.
 *
 * ── Neden yumuşatma (lerp) var ──────────────────────────────
 *
 * Açı doğrudan imlece yazılsaydı kart farenin her sıçramasını birebir
 * taklit ederdi — sinirli ve ucuz durur. Her karede hedefe **%12**
 * yaklaşılıyor: imleç durunca kart yumuşakça yerine oturuyor, imleç
 * çıkınca da geri dönüş aynı yumuşamayı kullanıyor. Ayrı bir CSS
 * `transition` gerekmiyor (zaten kaydırmayla çakışırdı).
 *
 * ── Döngü ne zaman koşuyor ──────────────────────────────────
 *
 * Kart görüş alanındayken sürekli, dışına çıkınca hiç. Yalnızca
 * `scroll`/`pointermove` olaylarına bağlansaydı yumuşatmanın son
 * kareleri yazılamaz, kart yolun ortasında donardı.
 *
 * ── Dokunmatik ve hareketi kapatan kullanıcı ────────────────
 *
 * `(hover: none)` cihazlarda fare dinleyicileri hiç kurulmuyor: telefonda
 * "hover" diye bir şey yok, kurulsaydı ilk dokunuşta kart eğik kalırdı.
 * `prefers-reduced-motion` açıksa efektin tamamı kurulmuyor — kart düz ve
 * tam boyutta duruyor. Başlangıç dönüşümü satır içi stilde **değil**;
 * efekt hiç çalışmasa da görsel doğru görünmeli.
 */
export function Egik({
  children,
  yon = "sag",
  guc = 1,
  className,
}: {
  children: React.ReactNode;
  /** Kartın hangi yana yatarak gireceği. */
  yon?: "sol" | "sag";
  /** Açıların çarpanı — 0 kapalı, 1 varsayılan. */
  guc?: number;
  className?: string;
}) {
  const disRef = useRef<HTMLDivElement>(null);
  const icRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dis = disRef.current;
    const ic = icRef.current;
    if (!dis || !ic) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /*
      🔴 Dar ekranda efekt hiç kurulmuyor.

      Ürün sahibi: *"Mobilde bu efektler olmayacak şekilde yapalım, çünkü
      parmakla kaydırırken de zor oluyor."* Fare kısmı dokunmatikte zaten
      anlamsız; geriye kalan kaydırmaya bağlı eğilme ise her kaydırma
      karesinde `getBoundingClientRect` okuyup dönüşüm yazıyor ve
      dokunmatik kaydırmanın akıcılığını bozuyor. Kart düz ve tam
      boyutta duruyor — başlangıç dönüşümü satır içi stilde olmadığı
      için efekt hiç çalışmasa da görsel doğru.
    */
    if (window.matchMedia("(max-width: 1023px)").matches) return;

    const isaret = yon === "sag" ? 1 : -1;
    /** İmlecin hedeflediği yer ve yakınlık (0 dışarıda, 1 üstünde). */
    const hedef = { x: 0, y: 0, yakin: 0 };
    /** Ekrana yazılan, hedefe yumuşayarak yaklaşan değer. */
    const simdi = { x: 0, y: 0, yakin: 0 };

    let kare = 0;
    let calisiyor = false;

    const adim = () => {
      simdi.x += (hedef.x - simdi.x) * 0.12;
      simdi.y += (hedef.y - simdi.y) * 0.12;
      simdi.yakin += (hedef.yakin - simdi.yakin) * 0.12;

      const kutu = dis.getBoundingClientRect();
      const pencere = window.innerHeight;
      // Kartın üstü ekranın %90'ındayken 0, tepeye vardığında 1.
      const g = Math.max(0, Math.min(1, (pencere * 0.9 - kutu.top) / (pencere * 0.9)));
      const kalan = 1 - g;

      const donY = (isaret * (2 + kalan * 14) + simdi.x * 13) * guc;
      const donX = (kalan * 7 - simdi.y * 10) * guc;
      const olcek = 0.93 + g * 0.07 + simdi.yakin * 0.035;
      const kay = kalan * 26 - simdi.yakin * 8;

      ic.style.transform =
        `translate3d(0, ${kay.toFixed(1)}px, 0) ` +
        `rotateX(${donX.toFixed(2)}deg) rotateY(${donY.toFixed(2)}deg) ` +
        `scale(${olcek.toFixed(3)})`;

      kare = calisiyor ? requestAnimationFrame(adim) : 0;
    };

    const basla = () => {
      if (calisiyor) return;
      calisiyor = true;
      kare = requestAnimationFrame(adim);
    };
    const dur = () => {
      calisiyor = false;
      if (kare) cancelAnimationFrame(kare);
      kare = 0;
    };

    const kimildat = (e: PointerEvent) => {
      const k = dis.getBoundingClientRect();
      hedef.x = ((e.clientX - k.left) / k.width - 0.5) * 2;
      hedef.y = ((e.clientY - k.top) / k.height - 0.5) * 2;
      hedef.yakin = 1;
    };
    const birak = () => {
      hedef.x = 0;
      hedef.y = 0;
      hedef.yakin = 0;
    };

    // Dokunmatikte hover yok: kurulsaydı kart ilk dokunuşta eğik kalırdı.
    const fareVar = !window.matchMedia("(hover: none)").matches;
    if (fareVar) {
      dis.addEventListener("pointermove", kimildat);
      dis.addEventListener("pointerleave", birak);
    }

    // Görüş alanı dışındayken kare harcamanın anlamı yok.
    let gozlemci: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      gozlemci = new IntersectionObserver(
        ([giris]) => (giris.isIntersecting ? basla() : dur()),
        { rootMargin: "25% 0px" },
      );
      gozlemci.observe(dis);
    } else {
      basla();
    }

    return () => {
      dur();
      gozlemci?.disconnect();
      if (fareVar) {
        dis.removeEventListener("pointermove", kimildat);
        dis.removeEventListener("pointerleave", birak);
      }
    };
  }, [yon, guc]);

  return (
    // Dış kutu perspektifi taşıyor; dönüş iç kutuda. Perspektif dönen
    // ögenin KENDİSİNDE olursa derinlik hissi oluşmuyor.
    <div ref={disRef} className={className} style={{ perspective: "1100px" }}>
      <div ref={icRef} style={{ willChange: "transform", transformStyle: "preserve-3d" }}>
        {children}
      </div>
    </div>
  );
}
