"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LooplyLogo } from "@/components/logo";
import { Beliren } from "./vitrin-hareket";

/**
 * Masadaki karekoda yaklaşıp telefona dönüşen sahne — madde 38 (Ü122).
 *
 * ── Ürün sahibinin tarifi ───────────────────────────────────
 *
 * *"Yavaş yavaş zoom, sonra QR'ın içine girer gibi olacak; ardından
 * oyuncu menüsünün olduğu ekrana girecek ve orada havadan ödüllerimiz
 * yağacak."*
 *
 * ── 🔴 Karekod fotoğrafın içinde DEĞİL ──────────────────────
 *
 * İlk iki denemede iki ayrı fotoğraf vardı ve basılı bir karekoda
 * yaklaşılıyordu. İki sorun birden: iki kare farklı çekimler olduğu için
 * zoom birinden diğerine devam edemiyordu, ve fotoğrafa basılı bir
 * karekoda yaklaşmanın matematiksel bir tavanı var — karekod karenin
 * %10'uysa ekranı doldurmak için ~12.000 piksellik bir kare gerekir.
 *
 * Çözüm fotoğrafı büyütmek değil, **karekodu fotoğraftan çıkarmak**:
 * kare yalnızca zemin (masa, akrilik ayaklık, **boş beyaz kart**);
 * karekod ise üstüne bizim tarafımızdan **vektör olarak** çiziliyor ve
 * fotoğrafla aynı `transform` içinde büyüyor.
 *
 *   · **Her ölçekte keskin** — SVG, pikseli yok.
 *   · **Geçiş yok** — tek fotoğraf, tek kesintisiz yaklaşma.
 *   · **Telefona dönüşebiliyor** — artık fotoğrafta bir desen değil,
 *     bizim DOM ögemiz.
 *
 * ⚠️ `KART_*` sabitleri fotoğraftan **piksel taramasıyla** ölçüldü (boş
 * kartın parlaklık sınırı). Gözle ayarlanan ilk değerler kartı yukarı ve
 * sola kaydırmış, altta kalan baskı sağdan sızmıştı. Fotoğraf değişirse
 * tarama tekrarlanmalı.
 *
 * ── 🔴 Dar ekranda kaydırmaya bağlı sahne YOK ───────────────
 *
 * Ürün sahibi: *"Mobilde bu efektler olmayacak şekilde yapalım, çünkü
 * parmakla kaydırırken de zor oluyor."* Haklı ve sebebi teknik:
 * kaydırmaya bağlı sahne beş ekran boyunca parmağın altındaki sayfayı
 * "yapışkan" gösteriyor — kullanıcı kaydırıyor ama sayfa ilerlemiyor
 * gibi hissediliyor. Masaüstünde tekerlek bunu tolere ediyor, dokunmatik
 * etmiyor.
 *
 * Dar ekran **ayrı bir ağaç** alıyor: aynı içerik, duran hâliyle — kare,
 * kartlar, telefon; alt alta, normal akışta. Tek ağaç olup CSS ile
 * kısılsaydı sahne yine kurulur, dinleyici yine çalışırdı.
 *
 * ── Evreler (yalnızca geniş ekran) ──────────────────────────
 *
 *   0.00–0.55  sahne karekoda yaklaşıyor, zemin bulanıklaşıyor
 *   0.52–0.78  kart telefona dönüşüyor
 *   0.74–1.00  ödüller havadan yağıyor
 *   0.04–1.00  yan kutular teker teker giriyor
 */

/** Bölümün ekran yüksekliği cinsinden boyu. Uzun = yavaş zoom. */
const EKRAN_SAYISI = 5;

/** Fotoğrafın en/boy oranı — sahne kutusu buna göre kuruluyor. */
const KARE_ORANI = 16 / 9;
/**
 * Sahne kutusunun genişliği, CSS ifadesi olarak.
 *
 * Perspektif uzaklığı buna oranlanıyor: sahne ekrandan geniş olduğu için
 * `vw` tek başına yetmiyor, kutunun gerçek genişliği `max(100vw, 178vh)`.
 */
const SAHNE_GEN = `max(100vw, ${(100 * KARE_ORANI).toFixed(2)}vh)`;

/**
 * Ayaklıktaki boş beyaz kartın fotoğraf içindeki yeri (yüzde).
 * `kafe-genis.jpg` (3840×2160) üzerinde piksel taramasıyla bulundu.
 */
const ODAK_X = 68.385;
const ODAK_Y = 53.194;
const KART_GEN = 20.53;
const KART_YUK = 53.24;
const KART_SOL = ODAK_X - KART_GEN / 2;
const KART_UST = ODAK_Y - KART_YUK / 2;

/**
 * 🔴 Kart düz bir dikdörtgen DEĞİL — perspektifi var.
 *
 * Ürün sahibi: *"Hâlâ QR kodumuz tam oturmamış, biraz açılı olmalı
 * köşelerinin oturması için."* Haklıydı ve sebebi ölçüldü: fotoğraftaki
 * kartın **sol kenarı 1103 piksel, sağ kenarı 1201 piksel** — sağ taraf
 * kameraya daha yakın, yani kart dikey ekseninde dönmüş. Düz bir
 * dikdörtgen bu dörtgene hiçbir konumda oturmuyor; köşelerden biri
 * mutlaka açıkta kalıyordu.
 *
 * Çözüm `perspective` + `rotateY`. Sayılar ölçümden türetildi:
 *
 *   boy oranı 1201/1103 = 1.0888
 *   (1+u)/(1−u) = 1.0888  →  u = 0.0425
 *   u = (en/2)·sin(açı) / uzaklık
 *
 * `DONUS_Y` 9° seçilip uzaklık ona göre çözüldü. ⚠️ **Uzaklık piksel
 * değil, sahne genişliğinin oranı**: kart da sahneyle birlikte
 * ölçeklendiği için sabit piksel verilseydi perspektif miktarı ekran
 * boyutuna göre değişirdi.
 *
 * `DONUS_Z` kartın kendi eğimi — iki kenarın orta noktalarını birleştiren
 * çizginin eğimi (0.66°).
 */
const DONUS_Y = -9;
const DONUS_Z = 0.66;
const PERSPEKTIF_ORANI = 0.374;

/**
 * Yaklaşmanın sonundaki ölçek.
 *
 * 🔴 İlk fotoğrafta **3.25** gerekiyordu; bu karede **1.55** yetiyor ve
 * tek başına en büyük kalite sıçraması bu. Sebep: eski karede kart
 * yüksekliğin %26'sıydı, bunda %55'i. **Doğru çözüm daha büyük dosya
 * değil, kadrajda daha büyük kart.**
 */
const SON_OLCEK = 1.55;

function evre(p: number, a: number, b: number): number {
  return Math.max(0, Math.min(1, (p - a) / (b - a)));
}

function ara(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** İki renk arasında ara değer — kartın beyazdan lacivert çerçeveye geçişi. */
function renkAra(a: number[], b: number[], t: number): string {
  const k = a.map((deger, i) => Math.round(ara(deger, b[i], t)));
  return `rgb(${k[0]} ${k[1]} ${k[2]})`;
}

/**
 * Yan kutular — reklam metni, yalnızca başlık değil.
 *
 * 🔴 İlk sürümde tek cümlelik etiketlerdi. Ürün sahibi: *"Metinler daha
 * reklama uygun ve daha uzun mesajlar olsun, kutular daha dolu olsun."*
 * Haklı: sahne boyunca ziyaretçinin okuyacağı tek metin bunlar.
 *
 * Her kutu üç parçalı: **iddia** · **gerekçe** · **tek satırlık kanıt**.
 * Sıra bir hikâye: kurulum → müşterinin yaşadığı an → işletmenin
 * kontrolü → geri dönüş.
 *
 * `basla`/`bit` aralıkları birbirine **değmiyor**: her kutu bir sonraki
 * girmeden tamamen çıkıyor. Dar ekranda bu sıra alt alta diziliyor.
 */
const KENAR_YAZILARI = [
  {
    baslik: "Masaya bir karekod koy, gerisini biz yapalım",
    metin:
      "Kurulumun tamamı bu. Karekodunu panelden yazdırıyorsun, masaya koyuyorsun ve sistem o an çalışmaya başlıyor. Cihaz almıyorsun, kablo çekmiyorsun, personeline yeni bir program öğretmiyorsun.",
    alt: "Kurulum birkaç dakika · donanım yok",
    basla: 0.04,
    bit: 0.26,
    yan: "sol",
  },
  {
    baslik: "Müşterin beklerken sıkılmasın",
    metin:
      "Siparişini bekleyen müşteri zaten telefonuna bakacak. O dakikalar senin kafende geçsin: karekodu okutuyor, uygulama indirmeden ve hesap açmadan oynamaya başlıyor. Bekleme şikâyet olmaktan çıkıp kafenin bir parçası oluyor.",
    alt: "Uygulama yok · üyelik zorunluluğu yok",
    basla: 0.28,
    bit: 0.5,
    yan: "sag",
  },
  {
    baslik: "Ne kadar indirim vereceğine sen karar ver",
    metin:
      "Hangi ödülün çıkacağını, ne sıklıkla çıkacağını ve günde kaç adet verileceğini panelden sen belirliyorsun. Günlük indirim bütçeni aşan tek bir kupon bile üretilmiyor — sürpriz masraf diye bir şey yok.",
    alt: "Günlük bütçe tavanı · ödül başına adet limiti",
    basla: 0.52,
    bit: 0.72,
    yan: "sol",
  },
  {
    baslik: "Ve yarın seni tekrar görsün",
    metin:
      "Kazandığı indirim telefonunda duruyor ve kullanmanın tek bir yolu var: geri gelmek. Yeni müşteri bulmanın maliyetini düşün — eldeki müşteriyi ikinci kez kapından sokmak çok daha ucuz.",
    alt: "İkinci ziyaretin garantisi değil, sebebi",
    basla: 0.76,
    bit: 1.3,
    yan: "sag",
  },
] as const;

export function YaklasanSahne({
  karekod,
  karesi,
}: {
  /** Gerçek karekod — fotoğrafın üstüne vektör olarak biniyor. */
  karekod: React.ReactNode;
  /** Kafe karesi. Yoksa kart düz zeminde durur; sahne yine çalışır. */
  karesi: string | null;
}) {
  return (
    <section aria-label="Karekoddan ödüle: kafe masasından oyuncunun ekranına">
      {/* Geniş ekran — kaydırmaya bağlı sahne */}
      <KaydirmaSahnesi karekod={karekod} karesi={karesi} />
      {/* Dar ekran — aynı içerik, duran hâli */}
      <DuranSahne karekod={karekod} karesi={karesi} />
    </section>
  );
}

/* ── Geniş ekran: kaydırmalı ───────────────────────────────── */

function KaydirmaSahnesi({
  karekod,
  karesi,
}: {
  karekod: React.ReactNode;
  karesi: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    // Hareketi kapatan kullanıcıda dinleyici kurulmuyor; durdurulmuş hâli
    // CSS toparlıyor. Efekt gövdesinde `setState` çağırmak zincirleme
    // render tetiklerdi (`react-hooks/set-state-in-effect`).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = ref.current;
    if (!el) return;
    let kare = 0;

    const yaz = () => {
      kare = 0;
      // Dar ekranda bu ağaç `display:none` — ölçüm yapmanın anlamı yok.
      if (!el.offsetParent) return;
      const kutu = el.getBoundingClientRect();
      const yol = kutu.height - window.innerHeight;
      if (yol <= 0) return;
      setP(Math.max(0, Math.min(1, -kutu.top / yol)));
    };

    const kaydir = () => {
      if (!kare) kare = requestAnimationFrame(yaz);
    };

    // İlk ölçüm de kareye bırakılıyor: efekt gövdesinde `setState` yok.
    kare = requestAnimationFrame(yaz);
    window.addEventListener("scroll", kaydir, { passive: true });
    window.addEventListener("resize", kaydir, { passive: true });
    return () => {
      if (kare) cancelAnimationFrame(kare);
      window.removeEventListener("scroll", kaydir);
      window.removeEventListener("resize", kaydir);
    };
  }, []);

  const yakin = evre(p, 0, 0.55);
  const donus = evre(p, 0.52, 0.78);
  const yagmur = evre(p, 0.74, 1);

  const olcek = ara(1, SON_OLCEK, yakin);

  /**
   * Zeminin dağılması.
   *
   * Yaklaşırken az (alan derinliği), **dönüşürken çok**: kart telefona
   * dönüşürken inceliyor ve altındaki boş beyaz kart iki yandan
   * sırıtıyordu. Bulanıklık artınca o kart kenarını kaybedip arka
   * plandaki ışık lekesine dönüşüyor.
   */
  const zeminBulanik = yakin * 5 + donus * 20;

  /**
   * Sahne kartı ortaya alıyor — "kamera özneye kayıyor".
   *
   * Kart karenin sağında (%68). Yaklaşma odağı orası olduğu için ölçek
   * büyüdükçe kart ekranın sağında kalıyordu. Kayma `yakin`e bağlı:
   * kamera bir yandan yaklaşıp bir yandan özneye kayıyor.
   *
   * Yüzde ögenin kendi boyuna göre; `translate` `transform`tan önce
   * uygulandığı için ölçekle çarpılmıyor.
   */
  const yatayKayma = -50 - yakin * (ODAK_X - 50);
  const dikeyKayma = -50 - yakin * (ODAK_Y - 50);

  // Kart → telefon. Ölçüler sahnenin kendi birimlerinde; sahne zaten
  // `scale` ile büyüdüğü için hepsi birlikte büyüyor.
  const kartGen = ara(KART_GEN, 12.6, donus);
  const kartYuk = ara(KART_YUK, 48.4, donus);
  const kartYuvarlak = ara(7, 25, donus);
  const cerceve = ara(0, 6.5, donus);
  // Telefona dönüşürken kart dikleşiyor: elde tutulan telefon yamuk durmaz.
  const donY = ara(DONUS_Y, 0, donus);
  const donZ = ara(DONUS_Z, 0, donus);
  const karekodGorunur = 1 - evre(donus, 0, 0.42);
  const ekranGorunur = evre(donus, 0.34, 0.9);

  /**
   * 🔴 Kart gerçekten telefona benzemeli.
   *
   * İlk denemede kart yalnızca incelip köşelenmişti; ürün sahibi haklı
   * olarak *"bu yeni telefon kötü oldu, eskisi iyiydi"* dedi. Telefonu
   * telefon yapan üç şey eksikti: **çentik**, **derin gölge**, **kalın
   * çerçeve**. Renk de sert takasla değil ara değerle koyulaşıyor.
   */
  const cerceveRengi = renkAra([255, 255, 255], [16, 32, 77], evre(donus, 0.22, 0.72));
  const golge = ara(0.35, 0.8, donus);
  const golgeYayilma = ara(14, 40, donus);

  return (
    <div
      ref={ref}
      className="yaklasma-bolum hidden lg:block"
      style={{ height: `${EKRAN_SAYISI * 100}vh` }}
    >
      <div className="sticky top-0 flex h-dvh w-full items-center justify-center overflow-hidden bg-vitrin-fildisi">
        {/*
          ── Sahne ────────────────────────────────────
          Fotoğrafın oranında, ekranı kaplayacak kadar büyük bir kutu.
          `object-cover` ile yapılmıyor: o kırpma yüzdeleri kaydırır ve
          vektör kart boş kartın üstüne oturmaz.
        */}
        <div
          className="yaklasma-sahne absolute top-1/2 left-1/2"
          style={{
            width: `max(100vw, calc(100dvh * ${KARE_ORANI}))`,
            aspectRatio: `${KARE_ORANI}`,
            translate: `${yatayKayma.toFixed(2)}% ${dikeyKayma.toFixed(2)}%`,
            transform: `scale(${olcek.toFixed(3)})`,
            transformOrigin: `${ODAK_X}% ${ODAK_Y}%`,
          }}
        >
          {karesi && (
            <Image
              src={karesi}
              alt=""
              fill
              /*
                🔴 `100vw` yanlıştı: sahne kutusu ekrandan geniş, dolayısıyla
                tarayıcı olduğundan küçük kareyi indirip bulanık açıyordu.
              */
              sizes="(max-width: 1280px) 130vw, 110vw"
              className="object-cover"
              style={{ filter: `blur(${zeminBulanik.toFixed(1)}px)` }}
            />
          )}

          {/* Fildişi tül — dönüşürken zemin bir tık daha geri çekiliyor. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-vitrin-fildisi"
            style={{ opacity: donus * 0.45 }}
          />

          {/* ── Kart: karekod → telefon ──────────────── */}
          <div
            className="absolute"
            style={{
              left: `${ODAK_X}%`,
              top: `${ODAK_Y}%`,
              width: `${kartGen}%`,
              height: `${kartYuk}%`,
              translate: "-50% -50%",
              transform: `perspective(calc(${PERSPEKTIF_ORANI} * ${SAHNE_GEN})) rotateZ(${donZ.toFixed(2)}deg) rotateY(${donY.toFixed(2)}deg)`,
              padding: `${cerceve.toFixed(2)}px`,
              borderRadius: `${kartYuvarlak.toFixed(1)}px`,
              backgroundColor: cerceveRengi,
              boxShadow: `0 ${(golgeYayilma * 0.35).toFixed(1)}px ${golgeYayilma.toFixed(1)}px -${(golgeYayilma * 0.3).toFixed(1)}px rgba(0,0,0,${golge.toFixed(2)})`,
            }}
          >
            <div
              className="relative h-full w-full overflow-hidden bg-white"
              style={{ borderRadius: `${Math.max(2, kartYuvarlak - cerceve).toFixed(1)}px` }}
            >
              {/* Çentik — telefonu telefon yapan en küçük ayrıntı. */}
              <span
                aria-hidden
                className="absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/20"
                style={{
                  top: `${(cerceve * 0.6).toFixed(2)}px`,
                  width: "26%",
                  height: `${(cerceve * 0.5).toFixed(2)}px`,
                  opacity: evre(donus, 0.55, 0.95),
                }}
              />

              <div style={{ opacity: karekodGorunur }}>
                <KartYuzu karekod={karekod} />
              </div>

              {/* Telefon yüzü — oyuncunun gerçek menüsü */}
              <div className="absolute inset-0" style={{ opacity: ekranGorunur }}>
                <Image
                  src="/vitrin/oyuncu-panel.png"
                  alt="Oyuncunun menüsü — puanı, günün görevi ve kuponları"
                  width={390}
                  height={844}
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </div>
          </div>
        </div>

        {/*
          ── Ödül yağmuru ─────────────────────────────
          Sahnenin ÜSTÜNDE (z-20) ve ancak telefon belirdikten sonra:
          ödül karekodun ötesinde, önünde değil.
        */}
        <div
          aria-hidden
          className="yaklasma-yagmur pointer-events-none absolute inset-0 z-20"
        >
          {YAGAN.map((k, i) => {
            const kendi = Math.max(0, Math.min(1, (yagmur - k.basla) / 0.6));
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${k.x}%`,
                  top: "-16%",
                  transform: `translateY(${kendi * 132}vh) rotate(${k.egim + kendi * k.donus}deg)`,
                  opacity: kendi > 0 && kendi < 0.95 ? 1 : 0,
                }}
              >
                <KuponRozeti baslik={k.baslik} />
              </div>
            );
          })}
        </div>

        {/* ── Yan kutular ────────────────────────────── */}
        {KENAR_YAZILARI.map((y) => {
          const goster =
            evre(p, y.basla, y.basla + 0.05) * (1 - evre(p, y.bit - 0.05, y.bit));
          return (
            <div
              key={y.baslik}
              className={`yaklasma-yazi pointer-events-none absolute z-40 max-w-[370px] rounded-2xl bg-vitrin-fildisi/95 px-7 py-6 shadow-[0_22px_55px_-18px_rgba(16,32,77,0.5)] ring-1 ring-vitrin-lacivert/10 backdrop-blur-[3px] ${
                y.yan === "sol" ? "top-[18%] left-[3.5%]" : "top-[46%] right-[3.5%]"
              }`}
              style={{
                opacity: goster,
                transform: `translateX(${(1 - goster) * (y.yan === "sol" ? -34 : 34)}px)`,
              }}
            >
              <KutuIcerigi baslik={y.baslik} metin={y.metin} alt={y.alt} />
            </div>
          );
        })}

        {/*
          ── Yan kayan şerit ─────────────────────────

          🔴 **Kaymayı düzelten şey: metnin iki kez basılması.**

          Önceki hâli tek bir metni yüzdeyle kaydırıyordu
          (`translateX(18% - p*36%)`). Metin sonlu, kutu ise tam genişlik:
          kaydırmanın belirli noktalarında şerit ekranı dolduramıyor,
          solda kesik bir kelime, sağda boşluk kalıyordu. Ürün sahibinin
          ekran görüntüsündeki "kaymış" görüntü tam olarak buydu.

          Şimdi iki kopya yan yana ve her biri **kendi içeriği kadar
          geniş**: `.serit-akis` her kopyayı tam kendi genişliği kadar
          kaydırıyor, ikinci kopya birincinin yerine oturuyor ve dikiş
          hiçbir zaman görünmüyor. Klasik kesintisiz şerit.

          ── 🔴 Ü133 bunu yarım bırakmıştı (Dalga 8'de ölçüldü) ────

          Kopyalara `w-1/2` verilmişti, yani **kutu genişliği %50** —
          ama kutu genişliği metnin genişliği değil. 1440 piksellik
          ekranda ölçüldü: kutu 1440 piksel, metin **3287 piksel**.
          Metin kutusundan 1847 piksel taşıyor ve doğrudan ikinci
          kopyanın üstüne biniyordu; üstelik kayma metnin tekrar
          aralığına (3287) değil kutuya (1440) göre yapıldığı için
          döngü de dikişsiz değildi.

          `w-max` ikisini birden çözüyor: kutu tam metin kadar, kayma
          tam bir tekrar. Genişlik artık yazı boyuna göre kendiliğinden
          değişiyor, `clamp` değiştiğinde elle ayar gerekmiyor.

          ⚠️ Kaydırmaya bağlı kayma **%25'ten %12'ye** indi. Yüzde
          kutunun kendi genişliğine göre ve kutu artık iki katından
          fazla geniş; eski çarpan bırakılsaydı şerit sayfa boyunca iki
          kopyanın toplamından fazla kayar, sağ tarafta boşluk açılırdı.
          Ekranda görünen hız eskisiyle aynı (~790 piksel).

          ── İki kaynaktan hareket ────────────────────

          Şerit artık hem **kendiliğinden** akıyor (CSS animasyonu) hem de
          kaydırmayla hızlanıyor. Yalnızca kaydırmaya bağlıyken durduğun
          anda ölüyordu; ürün sahibi "daha animasyonlu, daha eğlenceli"
          derken kastettiği canlılık buydu.

          ⚠️ Büyüdü: `clamp(38px…110px)` → `clamp(54px…150px)` ve opaklık
          0.06 → 0.10. Eskisi o kadar soluktu ki hareket ettiği fark
          edilmiyordu — var olduğu bile zor seçiliyordu.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-6 left-0 z-[6] w-full overflow-hidden"
          style={{ opacity: donus }}
        >
          <div
            className="yaklasma-serit flex w-max whitespace-nowrap"
            style={{ transform: `translateX(${-p * 12}%)` }}
          >
            {[0, 1].map((i) => (
              <span
                key={i}
                className="serit-akis w-max shrink-0 font-display text-[clamp(54px,11vw,150px)] leading-none font-extrabold text-yazi/[0.10]"
              >
                Oyna · Kazan · Geri Gel · Oyna · Kazan · Geri Gel ·{" "}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Dar ekran: duran sürüm ────────────────────────────────── */

/**
 * Aynı hikâye, hareketsiz.
 *
 * Dokunmatikte kaydırmaya bağlı sahne sayfayı yapışkan gösteriyor
 * (bkz. dosya başı). Burada aynı üç şey duruyor — masadaki kart, dört
 * mesaj, telefon — ama normal akışta, parmağın beklediği gibi.
 */
function DuranSahne({
  karekod,
  karesi,
}: {
  karekod: React.ReactNode;
  karesi: string | null;
}) {
  return (
    <div className="bg-vitrin-fildisi px-5 py-16 lg:hidden">
      <div className="mx-auto w-full max-w-lg">
        {karesi && (
          /*
            Dar ekranda kadraj **karta yakınlaştırılmış** duruyor.

            İlk denemede kare 16:9 hâliyle konmuştu ve kart ekranda 73
            piksele düşüyordu: logo kartın yarısını kaplıyor, karekod
            kesiliyordu. Kutu 4:5'e alınıp içine geniş ekrandakinin
            aynısı bir "sahne" konuldu — fotoğrafın oranını koruyan,
            kutuyu kaplayan ve kartı ortalayan bir kat. Kart artık
            kutunun yarısı kadar; karekod okunuyor.
          */
          <div
            className="relative overflow-hidden rounded-3xl shadow-[0_28px_60px_-28px_rgba(16,32,77,0.5)]"
            style={{ aspectRatio: "4 / 5" }}
          >
            <div
              className="absolute top-1/2 left-1/2"
              style={{
                // Kutu yüksekliği × kare oranı = sahne genişliği.
                width: `${((5 / 4) * KARE_ORANI * 100).toFixed(2)}%`,
                aspectRatio: `${KARE_ORANI}`,
                translate: `${(-50 - (ODAK_X - 50)).toFixed(2)}% ${(-50 - (ODAK_Y - 50)).toFixed(2)}%`,
              }}
            >
              <Image
                src={karesi}
                alt="Kafe masasında Looply karekodu"
                fill
                sizes="(max-width: 640px) 230vw, 120vw"
                className="object-cover"
              />
              {/* Vektör kart — geniş ekrandakiyle aynı ölçüler. */}
              <div
                className="absolute overflow-hidden bg-white"
                style={{
                  left: `${KART_SOL}%`,
                  top: `${KART_UST}%`,
                  width: `${KART_GEN}%`,
                  height: `${KART_YUK}%`,
                  /*
                    ⚠️ `perspective()` yüzde kabul etmiyor, uzunluk
                    istiyor. Dar ekranda sahne genişliği = kutu genişliği
                    × 2.222 ve kutu `max-w-lg` + `px-5` ile sınırlı;
                    uzaklık da o zincirden türetiliyor.
                  */
                  transform: `perspective(calc(${(PERSPEKTIF_ORANI * (5 / 4) * KARE_ORANI).toFixed(4)} * min(512px, 100vw - 40px))) rotateZ(${DONUS_Z}deg) rotateY(${DONUS_Y}deg)`,
                  borderRadius: "3px",
                }}
              >
                <KartYuzu karekod={karekod} logoBoyut={22} altVar={false} />
              </div>
            </div>
          </div>
        )}

        {/* Ü133: kartlar sırayla beliriyor. Üçü birden duruyordu ve
            kaydırırken hiçbir şey olmuyordu.

            Dalga 8: dördü de aynı yönden geliyordu. Artık dönüşümlü —
            sıradaki kartın nereden geleceği kestirilemiyor ve liste
            "tek bir geçişin dört kez tekrarı" gibi okunmuyor. */}
        <ol className="mt-10 space-y-4">
          {KENAR_YAZILARI.map((y, i) => (
            <Beliren
              key={y.baslik}
              gecikme={i * 90}
              yon={i % 2 === 0 ? "sag" : "sol"}
            >
              <li className="rounded-2xl bg-yuzey px-6 py-6 shadow-[0_16px_40px_-24px_rgba(16,32,77,0.45)] ring-1 ring-vitrin-lacivert/10">
                <KutuIcerigi baslik={y.baslik} metin={y.metin} alt={y.alt} />
              </li>
            </Beliren>
          ))}
        </ol>

        {/*
          ── Telefon + kupon yağmuru ──────────────────

          Geniş ekranda kuponlar kaydırdıkça yağıyor; mobilde o sahne
          hiç yok ve ekran tamamen duruyordu. Burada aynı fikir CSS
          anahtar karesiyle: kuponlar telefonun ardından süzülüyor,
          sonsuz döngüde, kaydırmadan bağımsız.

          ⚠️ `overflow-hidden` şart: kuponlar kutunun dışına taşarsa
          sayfada yatay kaydırma çubuğu doğuyor — mobilde en kötü hata.

          ⚠️ Kuponlar telefonun ARKASINDA (`-z-0` / telefon `z-10`):
          önünde olsalardı ürünün ekranını kapatırlardı ve gösterilmek
          istenen şey tam olarak o ekran.
        */}
        <div className="relative mt-12 flex justify-center overflow-hidden pt-36 pb-4">
          <div
            aria-hidden
            className="mobil-yagmur pointer-events-none absolute inset-0 z-0"
          >
            {MOBIL_YAGAN.map((k, i) => (
              <span
                key={i}
                className="absolute top-0 block"
                style={
                  {
                    left: `${k.x}%`,
                    "--egim": `${k.egim}deg`,
                    "--donus": `${k.donus}deg`,
                    "--sure": `${k.sure}s`,
                    "--gecikme": `${k.gecikme}s`,
                  } as React.CSSProperties
                }
              >
                <span className="block rounded-full bg-yuzey/90 px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap text-vitrin-lacivert shadow-[0_8px_20px_-10px_rgba(16,32,77,0.5)] ring-1 ring-vitrin-lacivert/10">
                  {k.baslik}
                </span>
              </span>
            ))}
          </div>

          <TelefondanKupon />
        </div>
      </div>

      {/*
        ── Akan şerit — mobilde ilk kez (Dalga 8) ───

        🔴 Şerit vardı ama mobilde **hiç görünmüyordu**: Ü133'te
        büyütülüp hizalandığı yer bu dosyanın `hidden lg:block` olan
        geniş ekran bloğunun içi. Yani dar ekranda sayfanın
        kendiliğinden hareket eden tek ögesi yoktu — kupon yağmuru
        dışında her şey kaydırmayı bekliyordu.

        Sayfa dururken de yaşayan bir hareket, "bu sayfa çalışıyor"
        hissinin en ucuz kaynağı: tek CSS anahtar karesi, ana iş
        parçacığına hiç dokunmuyor.

        ⚠️ `-mx-5` ile yan boşluğun dışına taşıyor — şerit kenardan
        kenara akmalı, ortada bir kutunun içinde değil. Dıştaki
        `overflow-hidden` şart: onsuz sayfada yatay kaydırma doğar.

        ⚠️ İki kopya ve her biri **kendi içeriği kadar geniş**
        (`w-max`): `.serit-akis` her kopyayı kendi genişliği kadar
        kaydırıyor, yani ikincisi tam birincinin yerine oturuyor ve
        dikiş hiç görünmüyor. Kutuya sabit bir genişlik verilseydi
        (örneğin yarı yarıya) metin kutudan taşar ve iki kopya üst üste
        binerdi.
      */}
      <div aria-hidden className="pointer-events-none -mx-5 mt-16 overflow-hidden">
        <div className="flex w-max">
          {[0, 1].map((i) => (
            <span
              key={i}
              className="serit-akis w-max shrink-0 font-display text-[clamp(44px,13vw,78px)] leading-none font-extrabold whitespace-nowrap text-yazi/[0.10]"
            >
              Oyna · Kazan · Geri Gel ·{" "}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Ortak parçalar ────────────────────────────────────────── */

function KutuIcerigi({
  baslik,
  metin,
  alt,
}: {
  baslik: string;
  metin: string;
  alt: string;
}) {
  return (
    <>
      <p className="font-display text-[20px] leading-[1.15] font-extrabold tracking-tight sm:text-[23px]">
        {baslik}
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-yazi-sonuk sm:text-[15px]">
        {metin}
      </p>
      <p className="mt-4 border-t border-vitrin-lacivert/10 pt-3 etiket-caps text-[10px] text-vurgu">
        {alt}
      </p>
    </>
  );
}

/**
 * Kartın basılı yüzü — ayaklığa konan şeyin birebir kendisi.
 *
 * ⚠️ Logo **düz yazı değil**: `LooplyLogo` çiziyor. Önce `font-display`
 * ile "Looply" yazılmıştı ve ürün sahibi *"logomuz da hatalı"* dedi —
 * haklıydı, işaretin kendisi (ilmek + tuşlar + hediye) eksikti ve kart
 * markanın olmadığı bir kart gibi duruyordu.
 *
 * `logoBoyut` sabit piksel ve bu bilerek: geniş ekranda kart sahnenin
 * içinde ve sahne `scale` ile büyüdüğü için logo da onunla büyüyor,
 * oran her ölçekte aynı kalıyor. Dar ekranda sahne büyümediği için
 * daha küçük bir değer geçiliyor ve alt şerit kapatılıyor — 6 piksellik
 * bir şerit okunmuyor, yalnızca kirletiyor.
 */
function KartYuzu({
  karekod,
  logoBoyut = 44,
  altVar = true,
}: {
  karekod: React.ReactNode;
  logoBoyut?: number;
  altVar?: boolean;
}) {
  return (
    // 🔴 Boşluklar daraltıldı: ürün sahibi *"hem logo hem QR daha çok
    // alan kaplamalı"* dedi. Önce kartın kenarlarında %9 boşluk ve
    // aralarda %6 vardı; kart yarı yarıya boş duruyordu. Basılı bir masa
    // kartında da logo ile karekod kâğıdı doldurur.
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3.5%] px-[6%]">
      <LooplyLogo boyut={logoBoyut} />
      <div className="w-[88%] [&>svg]:h-auto [&>svg]:w-full">{karekod}</div>
      {altVar && (
        <span className="font-display text-[10px] leading-none font-bold tracking-[0.16em] text-yazi-sonuk uppercase">
          Okut · Oyna · Kazan
        </span>
      )}
    </div>
  );
}

/** Telefon çerçevesi — içinde ürünün gerçek ekran görüntüsü. */
export function TelefonCercevesi({
  kaynak,
  alt,
  genislik = 252,
  koyuZemin = false,
}: {
  kaynak: string;
  alt: string;
  /** Sayı ya da CSS uzunluğu. */
  genislik?: number | string;
  /**
   * Lacivert bölümde mi duruyor.
   *
   * Çerçeve de gölge de lacivert; lacivert zeminin üstünde ikisi de
   * kayboluyor ve ekran görüntüsü telefon değil, havada duran bir
   * dikdörtgen gibi görünüyordu.
   */
  koyuZemin?: boolean;
}) {
  return (
    <div
      className={
        koyuZemin
          ? "rounded-[38px] border-[10px] border-vitrin-lacivert-acik bg-vitrin-lacivert-acik ring-1 shadow-[0_34px_80px_-24px_rgba(0,0,0,0.8)] ring-white/15"
          : "rounded-[38px] border-[10px] border-vitrin-lacivert bg-vitrin-lacivert shadow-[0_34px_80px_-24px_rgba(16,32,77,0.6)]"
      }
      style={{ width: genislik }}
    >
      <div className="relative overflow-hidden rounded-[28px] bg-white">
        <span
          aria-hidden
          className="absolute top-2.5 left-1/2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black/15"
        />
        <Image
          src={kaynak}
          alt={alt}
          width={390}
          height={844}
          className="h-auto w-full"
          priority={false}
        />
      </div>
    </div>
  );
}

/**
 * Yağan kupon rozeti.
 *
 * Ürün sahibi: *"Yağan ödüllerin boyutu daha büyük olsun."* Küçük
 * hâlinde ne yazdığı okunmuyordu; ekranda yalnızca beyaz lekeler
 * uçuyordu ve yağan şeyin **ödül** olduğu anlaşılmıyordu.
 */
/**
 * Telefon ve içinden çıkan kupon — Ü145.
 *
 * ── Ürün sahibinin isteği ───────────────────────────────────
 *
 * *"Masaüstünde scroll ile QR'ın içine girip telefonu gösterme
 * muhabbeti var ya, o kısma da mobil için bu animasyonu ekleyelim:
 * telefonun içine girsin ve telefondan kupon çıksın — burada kart
 * çıkıyor ya."* Referans X Money'nin zarftan çıkan kartı.
 *
 * ── 🔴 Kaydırmaya bağlanamaz ────────────────────────────────
 *
 * Geniş ekrandaki sahne kaydırma ilerlemesiyle çalışıyor ama mobilde o
 * yol kapalı — ürün sahibinin kendi kuralı: *"mobilde bu efektler
 * olmayacak şekilde yapalım, çünkü parmakla kaydırırken de zor
 * oluyor."* Bu yüzden hareket **görüş alanına girince bir kez**
 * oynuyor. Tek seferlik olması ayrıca Ü133'ün gerekçesi: sürekli
 * tekrarlayan bir hareket bir süre sonra hareket olarak okunmuyor.
 *
 * Kaçıran için telefona dokunmak hareketi yeniden başlatıyor — sonsuz
 * döngüye girmeden ikinci bir şans.
 *
 * ── Katman sırası hikâyeyi anlatıyor ────────────────────────
 *
 *   yağmur (z-0)  →  çıkan kupon (z-5)  →  telefon (z-10)
 *
 * Kupon telefonun **arkasında** başlıyor ve yukarı çıkarken üst
 * kenarın ardından beliriyor; ürünün ekranını hiçbir an kapatmıyor.
 * Önde olsaydı gösterilmek istenen şeyin — oyuncunun menüsünün —
 * üstüne otururdu.
 */
function TelefondanKupon() {
  const ref = useRef<HTMLDivElement>(null);
  /** Kaçıncı oynatma — artınca kart yeniden monte olup baştan oynuyor. */
  const [tur, setTur] = useState(0);
  const [gorundu, setGorundu] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setGorundu(true);
      return;
    }
    const gozlemci = new IntersectionObserver(
      ([giris]) => {
        if (giris.isIntersecting) {
          setGorundu(true);
          gozlemci.disconnect();
        }
      },
      { rootMargin: "0px 0px -18% 0px" },
    );
    gozlemci.observe(el);
    return () => gozlemci.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Çıkan kupon — telefonun arkasında, yukarı süzülüyor. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex justify-center"
      >
        {gorundu && (
          <div key={tur} className="kupon-cikiyor">
            <CikanKupon />
          </div>
        )}
      </div>

      {/*
        Telefonun kendisi. `salinan` nefes alma hareketi duruyor (Ü133):
        duran bir ekran görüntüsü ile çalışan bir ürün arasındaki fark
        o kadar küçük bir salınım.

        ⚠️ Düğme değil: burada "tıklanacak bir şey" yok, dokunmak
        yalnızca hareketi tekrar oynatıyor. Düğme yapılsaydı ekran
        okuyucu kullanıcıya olmayan bir eylem vaat ederdi; o yüzden
        hareketin tamamı `aria-hidden` ve dokunma isteğe bağlı bir
        süs.
      */}
      <div
        className="salinan relative z-10"
        onClick={() => setTur((t) => t + 1)}
      >
        <TelefonCercevesi
          kaynak="/vitrin/oyuncu-panel.png"
          alt="Oyuncunun menüsü — puanı, günün görevi ve kuponları"
          genislik="min(248px, 68vw)"
        />
      </div>
    </div>
  );
}

/**
 * Telefondan çıkan kuponun kendisi.
 *
 * ⚠️ Üstünde **kupon kodu yok.** Gerçek kuponda var ama vitrinde
 * uydurma bir kod basmak, ekranın geri kalanı gerçek ürün görüntüsüyken
 * tek sahte ayrıntı olurdu. Kart ne olduğunu söylüyor, kimliğini değil.
 */
function CikanKupon() {
  return (
    <div className="w-[228px] rounded-2xl bg-white px-5 py-4 shadow-[0_26px_50px_-18px_rgba(16,32,77,0.55)] ring-1 ring-vitrin-lacivert/10">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-odul">
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 5.5A1.5 1.5 0 013.5 4h9A1.5 1.5 0 0114 5.5v1a1.5 1.5 0 000 3v1A1.5 1.5 0 0112.5 12h-9A1.5 1.5 0 012 10.5v-1a1.5 1.5 0 000-3v-1z"
              fill="#10204d"
            />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block etiket-caps text-[9px] text-yazi-sonuk">Kazandın</span>
          <span className="mt-0.5 block font-display text-[15px] leading-tight font-extrabold">
            Ücretsiz filtre kahve
          </span>
        </span>
      </div>
      {/* Koparma çizgisi — biletin ürün içindeki dili (Ü72). */}
      <div className="mt-3 border-t border-dashed border-cizgi pt-2.5">
        <span className="etiket-caps text-[9px] text-vurgu">Kasada göster</span>
      </div>
    </div>
  );
}

function KuponRozeti({ baslik }: { baslik: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-cizgi bg-white px-6 py-4 shadow-[0_18px_40px_-14px_rgba(16,32,77,0.5)]">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-odul">
        <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 5.5A1.5 1.5 0 013.5 4h9A1.5 1.5 0 0114 5.5v1a1.5 1.5 0 000 3v1A1.5 1.5 0 0112.5 12h-9A1.5 1.5 0 012 10.5v-1a1.5 1.5 0 000-3v-1z"
            fill="#10204d"
          />
        </svg>
      </span>
      <span className="text-[17px] font-bold whitespace-nowrap">{baslik}</span>
    </div>
  );
}

/**
 * Mobildeki süzülen kuponlar — Ü133.
 *
 * Geniş ekrandakinden **ayrı ve daha az**: dar ekranda on dört kupon
 * telefonun üstünü kalabalığa çeviriyor ve ürünün ekranı kayboluyor.
 * Altı tane, farklı süre ve gecikmeyle — aynı anda başlasalardı
 * "yağmur" değil "sıra" gibi görünürdü.
 */
const MOBIL_YAGAN = [
  { baslik: "Ücretsiz filtre kahve", x: 2, egim: -8, donus: 16, sure: 9, gecikme: 0 },
  { baslik: "Tatlıda %20", x: 66, egim: 7, donus: -14, sure: 11, gecikme: 1.6 },
  { baslik: "+1 shot espresso", x: 12, egim: 5, donus: 12, sure: 10, gecikme: 3.4 },
  { baslik: "25 TL indirim", x: 72, egim: -6, donus: -10, sure: 12, gecikme: 5.1 },
  { baslik: "İkinci kahve yarı fiyat", x: 4, egim: 6, donus: 14, sure: 10.5, gecikme: 6.8 },
  { baslik: "Cheesecake %25", x: 58, egim: -5, donus: -12, sure: 11.5, gecikme: 8.2 },
];

/**
 * Yağan kuponlar — konum ve zamanlama **sabit**.
 *
 * ⚠️ Rastgele üretilmiyor ve üretilemez: sunucuda bir değer, istemcide
 * başka bir değer çıkar ve React hidrasyonda uyuşmazlık verir.
 *
 * ── Neden altı değil on dört (Ü133) ─────────────────────────
 *
 * Ürün sahibi: *"efektteki ödüller daha çok olmalı, daha anlaşılır
 * olsun diye."* Altı kupon seyrek düşüyordu ve sahne "ödül yağıyor"
 * yerine "birkaç kart geçti" gibi okunuyordu — anlatmak istediği şey
 * bolluk, seyreklik değil.
 *
 * ── Metinler neden bu kadar somut ───────────────────────────
 *
 * Panel **kafelere ve butik işletmelere** gidiyor; "%20 indirim" gibi
 * soyut bir kupon hiçbir şey anlatmıyor. "Tatlıda %20", "İkinci kahve
 * yarı fiyat", "Kruvasan + filtre kahve" — işletmecinin kendi menüsünde
 * göreceği cümleler. Kuponun ne olduğunu tarif etmiyoruz, tanıdık
 * geliyor.
 */
const YAGAN = [
  { baslik: "Ücretsiz filtre kahve", x: 7, basla: 0.0, egim: -8, donus: 14 },
  { baslik: "Tatlıda %20", x: 70, basla: 0.04, egim: 6, donus: -12 },
  { baslik: "+1 shot espresso", x: 28, basla: 0.08, egim: 4, donus: 10 },
  { baslik: "25 TL indirim", x: 84, basla: 0.12, egim: -5, donus: -9 },
  { baslik: "Ice Americano", x: 15, basla: 0.16, egim: 7, donus: 12 },
  { baslik: "İkinci kahve yarı fiyat", x: 50, basla: 0.2, egim: -6, donus: -14 },
  { baslik: "Kruvasan + filtre kahve", x: 38, basla: 0.24, egim: 5, donus: 11 },
  { baslik: "Cheesecake %25", x: 92, basla: 0.28, egim: -7, donus: -10 },
  { baslik: "Limonatada %15", x: 3, basla: 0.32, egim: 8, donus: 13 },
  { baslik: "Ücretsiz sürahi çay", x: 62, basla: 0.36, egim: -4, donus: -11 },
  { baslik: "Kahve yanına kurabiye", x: 22, basla: 0.4, egim: 6, donus: 9 },
  { baslik: "30 TL indirim", x: 77, basla: 0.44, egim: -8, donus: -13 },
  { baslik: "Sahlepte %20", x: 45, basla: 0.48, egim: 5, donus: 12 },
  { baslik: "Brunch'ta %15", x: 88, basla: 0.52, egim: -6, donus: -8 },
];
