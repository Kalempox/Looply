"use client";

import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";
import { LooplyLogo } from "@/components/logo";
/*
  ⚠️ Ü75 denetimi yapıldı: `Bilet` → `oyuncu-renk` · `oyuncu-sahne` ·
  `kart-gorseli` · `oyuncu-gorsel`. Zincirin hiçbir halkası
  `@/domain/*` çekmiyor, yani bu `"use client"` dosyasına girmesi
  güvenli (domain → `@/db/context` → `pg` → `fs`/`dns`).
*/
import { Bilet } from "@/components/bilet";
import { GORSEL_RENGI, type KuponGorseli } from "@/components/oyuncu-gorsel";
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
/*
  ⚠️ `KART_SOL` / `KART_UST` Ü153'te KALDIRILDI. Yalnızca dar ekrandaki
  duran fotoğraf kopyası kullanıyordu; o blok kalkınca kullanılan yer
  kalmadı. Kaydırmalı sahne kartı kendi `donus` değerinden türetiyor
  (`kartGen` / `kartYuk`), sabit köşeden değil.
*/

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
      <DuranSahne karekod={karekod} />

      {/*
        🔴 Slogan Ü155'te KALDIRILDI — "Kupon bir gider değil, geri
        gelen müşteri."

        Ü152'de eklenmişti ve doğru bir cümleydi; kusuru **yeri**.
        Hemen altındaki bölümün başlığı zaten *"Müşterini elinde tutmak
        indirim yapmaktan ucuz"* diyor — aynı iddia, iki kez, art arda.
        Ürün sahibi ekranda görünce fark etti: *"bu yazıyı kaldıralım…
        masaüstü görünümünde de sadece kupon gider değil yazısı kalksın."*

        ⚠️ Mobilde de masaüstünde de kalktı: cümle bir efekt değil içerik
        olduğu için ekran genişliğine göre farklı davranması anlamsız
        olurdu (Ü152'nin kendi dersi).
      */}
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
                <KuponRozeti baslik={k.baslik} gorsel={k.gorsel} />
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
              /*
                🔴 Ü225 · kutu KOYU oldu ve büyüdü.

                Eski hâli `bg-vitrin-fildisi/95` idi ve sahnenin zemini
                de fildişi: kutu **zeminle aynı renkteydi.** Arkadaki
                bulanık kafe fotoğrafı da açık tonlu, yani kutunun
                dikkat çekmemesinin sebebi boyutu değil, kontrastın
                yokluğuydu.

                Lacivert kart hem fotoğrafın üstünde hem fildişi
                zeminde ayrılıyor ve sayfanın başka yerlerinde
                (simülasyon, maskot) zaten kullanılan cihaz — yeni bir
                dil icat edilmiyor.

                ⚠️ Genişlik 370 → 460: telefon sahnenin ortasında ve
                yan kutu 1280 pikselde ona değmiyor (ölçüldü).
              */
              className={`yaklasma-yazi pointer-events-none absolute z-40 max-w-[460px] rounded-3xl bg-vitrin-lacivert/95 px-9 py-8 backdrop-blur-[3px] ${
                y.yan === "sol" ? "top-[15%] left-[3.5%]" : "top-[44%] right-[3.5%]"
              }`}
              style={{
                opacity: goster,
                transform: `translateX(${(1 - goster) * (y.yan === "sol" ? -34 : 34)}px)`,
                /*
                  🔴 Ü226 · dış çerçeve — ürün sahibi: *"dışına çerçeve
                  ekle ve daha dikkat çekici yap."*

                  Üç `box-shadow` katmanı, üçü de aynı gölge
                  özelliğinden çıkıyor — `border` kullanılmadı çünkü
                  kenarlık kutunun ÖLÇÜSÜNÜ büyütür ve dört evrede
                  ölçülmüş çakışmasızlık bozulurdu. Gölge yayılması
                  düzeni hiç etkilemiyor.

                    1 · 2 piksel altın çerçeve — kartın kendi sınırı
                    2 · 9 piksel soluk altın hale — çerçevenin DIŞINDA
                        duran ikinci bir çerçeve; kartı fotoğraftan
                        koparan şey bu
                    3 · zeminden kalkış gölgesi

                  ⚠️ Altın tesadüf değil: lacivert üstünde sayfanın
                  kurulu eşleşmesi (`--color-odul`, üst etiketler ve
                  ölçüm kutusu da bu çiftte).
                */
                boxShadow: [
                  "0 0 0 2.5px rgba(212,175,55,0.72)",
                  "0 0 0 11px rgba(212,175,55,0.18)",
                  "0 40px 90px -20px rgba(16,32,77,0.82)",
                ].join(", "),
              }}
            >
              <KutuIcerigi
                sira={KENAR_YAZILARI.indexOf(y) + 1}
                baslik={y.baslik}
                metin={y.metin}
                alt={y.alt}
                koyu
              />
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
function DuranSahne({ karekod }: { karekod: React.ReactNode }) {
  return (
    <div className="bg-vitrin-fildisi px-5 py-16 lg:hidden">
      <div className="mx-auto w-full max-w-lg">
        {/*
          🔴 Masadaki karekod fotoğrafı buradan KALDIRILDI — Ü153.

          Ürün sahibi: *"mobilde bu kısım çok alakasız ve seyrek,
          bunu kaldıralım."* Dar ekranda kare 4:5'e kırpılıyor, kart
          kutunun yarısı kadar kalıyor; ekranın üçte birini bir
          fotoğrafa verip altına dört düz yazı kutusu dizmek sahneyi
          seyrek gösteriyordu.

          ⚠️ Fotoğraf **silinmedi**: masaüstündeki kaydırmalı sahne
          onun üstüne kurulu (`KaydirmaSahnesi`) ve karekoda
          yaklaşmanın tek zemini o. Kalkan şey yalnızca dar ekrandaki
          duran kopyası — bu yüzden `karesi` artık DuranSahne'ye hiç
          geçmiyor.

          ⚠️ Bedeli bilinçli: "masaya bir karekod koy" cümlesinin
          kanıtı mobilde artık yalnızca yazıda. Ürün sahibine söylendi,
          kaldırma kararı onun.
        */}

        {/*
          Kurulum adımları — Ü153'te görselleştirildi.

          Ürün sahibi: *"burdaki yazıların arası da görselleştirilmeli."*
          İki yol birden yazıldı ve **seçimi ürün sahibi yapacak**
          (*"ben hangisinin daha iyi olduğuna karar vereyim"*):

            `yol`  — adımları birleştiren, kendini çizen dikey hat
            `mini` — her adımın kutusunda kendi küçük sahnesi

          ⚠️ Kaybeden sürüm **silinecek**; ikisini birden taşımak
          "iki tasarım da yarım" demek olurdu.
        */}
        <AdimlarYol karekod={karekod} />

        {/*
          🔴 Telefon + kupon yağmuru mobilden KALDIRILDI — Ü154.

          Ürün sahibi: *"mobilde bu telefon kısmının gözükmesine gerek
          yok."* Sebep adımlar görselleşince ortaya çıktı: 2. kartın
          içinde zaten bir telefon var ve oyunu o gösteriyor, 3. kartta
          da kupon kazınarak açılıyor. Aşağıdaki dev telefon aynı iki
          şeyi ikinci kez, daha yer kaplayarak anlatıyordu.

          ⚠️ **Bedeli var ve bilinçli:** X Money referansından gelen
          "cihazdan kupon çıkıyor" hareketi (Ü145, Ü152'de zamanlaması
          düzeltilmişti) mobilde artık yok. Kupon hikâyesini 3. kartın
          kazıma sahnesi taşıyor. Masaüstünde kaydırmalı sahne aynen
          duruyor.
        */}
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

/* ── Ü154 · Kurulum adımları: yılankavi iz + yanlarda kartlar ─ */

/**
 * Adımlar, aralarından geçen kesikli bir izle.
 *
 * ── Ürün sahibinin tarifi ───────────────────────────────────
 *
 * *"Kesikli çizgi düz değil, bir sağa bir sola doğru ilerlesin; kart
 * yolun bir sağında bir solunda olsun. İlla aşırı simetrik olmasına
 * gerek yok, biraz dağınık olabilir."* Ayrıca her kutunun içinde kendi
 * mini sahnesi duruyor — iki ayrı denemeydi, tek tasarımda birleşti.
 *
 * ── 🔴 İz neden TEK bir SVG, parça parça değil ──────────────
 *
 * İlk denemede her boşluğa kendi 40 piksellik parçası konmuştu ve
 * **düz göründü**: kutu 40 piksel genişken eğrinin yanal sapması en
 * fazla 12 piksel oluyor, üstelik yükseklik 200 piksele uzayınca o
 * sapma göze tamamen düzleşiyor.
 *
 * Şimdi iz **tam genişlikte tek bir yol** ve arkada duruyor. `viewBox`
 * 100 birim geniş, `preserveAspectRatio="none"` ile kutuya yayılıyor:
 * x=22 → genişliğin %22'si. 375 piksellik ekranda sapma ~100 piksele
 * çıkıyor, yani gerçekten kıvrılıyor.
 *
 * ── Dağınıklık kasıtlı ──────────────────────────────────────
 *
 * Kartların yan payları ve eğimleri birbirinin aynısı değil
 * (`YERLESIM`). Tam simetri bir çizelge gibi duruyordu; ürün sahibi
 * *"biraz dağınık olabilir"* dedi ve elle çizilmiş iz zaten onu
 * söylüyor.
 */
/*
  🔴 Genişlikler ölçümle indirildi.

  İlk denemede kartlar %80–84'tü ve iki şey birden bozuldu:

    1. **1 piksel yatay taşma.** Sağdaki kartın sağ kenarı 387'ye
       gidiyordu, ekran 375. Dalga 8'in dersi: mobilde yatay kaydırma
       en kötü hata ve her zaman böyle, "bir piksel" diye başlıyor.
       Eğim de payını ekliyor — 1,5° dönen 420 piksellik bir kartın
       köşesi ~5 piksel dışarı çıkıyor.
    2. **İz görünmüyordu.** Kart 335 piksellik alanın 290'ını kaplayınca
       arkadaki yoldan geriye kıvrımın göründüğü bir şerit kalmıyordu.

  %72 civarı ikisini birden çözüyor: kenarda eğimin payı kadar boşluk
  kalıyor ve karşı yanda iz için ~90 piksellik bir şerit açılıyor.
*/
const YERLESIM = [
  { yan: "sol", genislik: "72%", egim: "-1deg" },
  { yan: "sag", genislik: "74%", egim: "1.2deg" },
  { yan: "sol", genislik: "71%", egim: "0.9deg" },
  { yan: "sag", genislik: "75%", egim: "-1.3deg" },
] as const;

/**
 * İki kart arasını geçen kesikli iz — Ü154.
 *
 * Ürün sahibi: *"Kesikli çizgi düz değil, bir sağa bir sola doğru
 * ilerlesin; kart yolun bir sağında bir solunda olsun."*
 *
 * ── 🔴 İki deneme elendi, ikisi de ölçümle ──────────────────
 *
 * **1 · 40 piksellik dikey parçalar.** Eğri o dar kutuya sığdığı için
 * yanal sapma en fazla 12 piksel oluyordu; yükseklik 200 piksele
 * uzayınca göze tamamen **düz** görünüyordu.
 *
 * **2 · Kartların arkasında tam boy tek SVG.** Kartlar alanın çoğunu
 * kaplıyor ve aralarında yalnızca 28 piksellik boşluk vardı; izden
 * geriye birkaç nokta kalıyordu. Üstelik tek uzun yolun kıvrımlarını
 * kart sıralarıyla hizalamak, kart yüksekliklerini — yani metni, yazı
 * tipini, ekran genişliğini — bilmeyi gerektiriyordu.
 *
 * **Çalışan hâli:** iz kartların arkasında değil **arasında**. Her
 * boşluk tam genişlikte ve 72 piksel yüksekliğinde; iz bir kartın
 * yanından çıkıp öbürünün öteki yanına geçiyor. Yanal yolculuk gerçek
 * ve hiçbir yerde kartın altında kaybolmuyor.
 *
 * ⚠️ `stroke-dashoffset` ile "çizilmiyor": kesikleri `stroke-dasharray`
 * yapıyor ve offset'i oynatmak izi çizmez, kesikleri **yürütür** —
 * "yükleniyor" gibi okunur. İz duruyor, üstünden aşağı inen bir kırpma
 * açılıyor (`.adim-iz`).
 *
 * ⚠️ `vectorEffect="non-scaling-stroke"`: kutu yayılırken kesikler de
 * yayılıp ezilmesin diye.
 */
function IzParcasi({ soldanSaga }: { soldanSaga: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  /**
   * 🔴 İz artık **kaydırmayla** çiziliyor — Ü155.
   *
   * Ürün sahibi: *"yol biz ekranı kaydırdıkça oluşmalı."* Önceki hâlinde
   * görüş alanına girince bir kez oynuyordu; yani parmağın hızından
   * bağımsızdı ve "ben çizdirdim" hissi yoktu.
   *
   * ⚠️ Mobilde kaydırmaya bağlı efekt kuralı (*"parmakla kaydırırken zor
   * oluyor"*) bunu **kapsamıyor**: o kural beş ekranlık `sticky` sahne
   * içindi — sayfa ilerlemiyormuş gibi hissettiren şey oydu. Burada sayfa
   * normal akıyor, yalnızca 84 piksellik bir kutunun kırpması değişiyor.
   *
   * ⚠️ Okuma ve yazma ayrı karelerde: `scroll` saniyede onlarca kez
   * tetikleniyor, her seferinde DOM'a yazmak kare atlatır (Ü120'nin
   * `Kayan` bileşeninde öğrenilmişti).
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--iz", "1");
      return;
    }

    let kare = 0;
    const olc = () => {
      kare = 0;
      const k = el.getBoundingClientRect();
      // Kutunun altı ekranın %85'ine geldiğinde 0, üstü %35'e çıkınca 1.
      const bas = window.innerHeight * 0.85;
      const son = window.innerHeight * 0.35;
      const p = (bas - k.top) / (bas - son + k.height);
      el.style.setProperty("--iz", String(Math.max(0, Math.min(1, p))));
    };
    const istek = () => {
      if (!kare) kare = requestAnimationFrame(olc);
    };

    olc();
    window.addEventListener("scroll", istek, { passive: true });
    window.addEventListener("resize", istek);
    return () => {
      window.removeEventListener("scroll", istek);
      window.removeEventListener("resize", istek);
      if (kare) cancelAnimationFrame(kare);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="adim-iz-kaydirmali h-[84px] w-full">
      <svg
        viewBox="0 0 100 84"
        preserveAspectRatio="none"
        className="h-full w-full text-vurgu"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      >
        <path
          d={soldanSaga ? "M22 0C22 30 78 26 78 84" : "M78 0C78 30 22 26 22 84"}
          strokeDasharray="7 9"
        />
      </svg>
    </div>
  );
}

function AdimlarYol({ karekod }: { karekod: React.ReactNode }) {
  const SAHNELER = [
    () => <MiniKarekod karekod={karekod} />,
    MiniOyun,
    MiniKazima,
    MiniDonus,
  ];

  return (
    <div className="relative mt-10">
      <ol className="relative z-[1] px-1">
        {KENAR_YAZILARI.map((y, i) => {
          const Sahne = SAHNELER[i];
          const yer = YERLESIM[i];
          return (
            <Fragment key={y.baslik}>
              <Beliren gecikme={i * 140} yon={yer.yan === "sol" ? "sol" : "sag"}>
                <li
                className={`relative rounded-2xl bg-yuzey px-5 py-5 shadow-[0_16px_40px_-24px_rgba(16,32,77,0.45)] ring-1 ring-vitrin-lacivert/10 ${
                  yer.yan === "sol" ? "mr-auto" : "ml-auto"
                }`}
                style={{ width: yer.genislik, transform: `rotate(${yer.egim})` }}
              >
                {/* Adım numarası — izin üstüne oturan düğüm. */}
                <span
                  aria-hidden
                  className={`adim-dugum absolute -top-3 grid size-8 place-items-center rounded-full bg-vurgu font-data text-[13px] font-bold text-yuzey shadow-[0_6px_14px_-6px_rgba(16,32,77,0.6)] ${
                    yer.yan === "sol" ? "-right-3" : "-left-3"
                  }`}
                  style={{ "--adim-gecikme": `${i * 140 + 140}ms` } as React.CSSProperties}
                >
                  {i + 1}
                </span>

                <span
                  aria-hidden
                  /* ⚠️ Ü225: bant 58 → 92 piksel. Ürün sahibi
                     *"görseller daha büyük olsun"* dedi ve mobilde
                     asıl küçük kalan yer burasıydı — 58 pikselde
                     telefonun içindeki oyun ekranı seçilmiyordu. */
                  className="mb-4 flex h-[92px] items-center justify-center rounded-lg bg-vitrin-fildisi"
                  style={{ "--adim-gecikme": `${i * 140 + 240}ms` } as React.CSSProperties}
                >
                  <Sahne />
                </span>
                  {/* ⚠️ `sira` VERİLMİYOR: bu yolun kendi numara rozeti
                      zaten var (yukarıda, izin üstünde duruyor) ve
                      ikisi birden basılınca kartta aynı sayı iki kez
                      görünüyordu. Numara yalnızca masaüstü sahnesinin
                      yan kutusunda — orada başka bir işaret yok. */}
                  <KutuIcerigi baslik={y.baslik} metin={y.metin} />
                </li>
              </Beliren>
              {i < KENAR_YAZILARI.length - 1 && (
                <IzParcasi soldanSaga={yer.yan === "sol"} />
              )}
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * 1 · Masaya karekod konuyor — **gerçek** karekod (Ü154).
 *
 * Ürün sahibi: *"masaya qr koyda gerçek qr olsun."* Haklı ve bu sayfanın
 * kendi kuralı: vitrindeki her şey gerçek (Ü120'de ekran görüntüleri de
 * çizimden gerçeğe çevrilmişti). Dokuz kutucuklu soyut desen "karekod
 * gibi bir şey" diyordu; bu, okutulabilir bir karekod.
 *
 * Kart ayaklığa oturur gibi hafif eğik giriyor ve düzeliyor.
 */
function MiniKarekod({ karekod }: { karekod: React.ReactNode }) {
  return (
    <span className="mini-karekod block rounded-md bg-white p-1.5 shadow-[0_6px_16px_-8px_rgba(16,32,77,0.5)] ring-1 ring-vitrin-lacivert/15">
      <span className="block [&_svg]:block [&_svg]:size-[66px]">{karekod}</span>
    </span>
  );
}

/**
 * 2 · Müşteri beklerken oynuyor — telefon zıplıyor, içinde Yılan (Ü154).
 *
 * Ürün sahibi: *"yukarı aşağı zıplayan telefon, telefonun içinde bizim
 * oyunlarımızdan biri."*
 *
 * ⚠️ Görsel **gerçek oyundan**: `public/vitrin/oyun-yilan.png`, çalışan
 * uygulamadan Playwright ile çekilmişti (Ü120). Çizilmiş bir oyun ekranı
 * koymak, sayfanın "ekranların hepsi gerçek" iddiasını bozardı.
 */
function MiniOyun() {
  return (
    <span className="mini-telefon relative block h-[104px] w-[58px] overflow-hidden rounded-[10px] bg-vitrin-lacivert p-[3px] shadow-[0_10px_22px_-8px_rgba(16,32,77,0.6)]">
      <span className="relative block h-full w-full overflow-hidden rounded-[7px]">
        <Image
          src="/vitrin/oyun-yilan.png"
          alt=""
          fill
          sizes="40px"
          className="object-cover object-top"
        />
      </span>
    </span>
  );
}

/**
 * 3 · Kupon kazınarak açılıyor (Ü154).
 *
 * Ürün sahibi: *"ne kadar indirim vereceğin kısmında kazıyarak açılan
 * kupon animasyonu."* Ürünün kendi dili: kazı-kazan Ü141'de yazıldı ve
 * oyuncu tarafında gerçekten böyle çalışıyor.
 *
 * ⚠️ Burada kazıma **etkileşimli değil**: gerçek kartta parmakla
 * siliniyor (`kazima-karti.tsx`), burada kendiliğinden açılıyor. Vitrinde
 * ziyaretçiden bir iş beklenmiyor; gösterilen şey mekanizma.
 */
function MiniKazima() {
  return (
    /* ⚠️ Ü225: 44×112 → 64×160. Bant büyüdü, kart onunla ölçeklendi;
       eski boyda "25 TL" yazısı ve kazınan yüzey seçilmiyordu. */
    <span className="relative block h-16 w-40 overflow-visible">
      <span className="absolute inset-0 overflow-hidden rounded-lg bg-white shadow-[0_6px_16px_-8px_rgba(16,32,77,0.5)] ring-1 ring-vitrin-lacivert/15">
        {/* Altta duran ödül */}
        <span className="absolute inset-0 flex items-center justify-center gap-1.5">
          <span className="size-5 rounded bg-odul" />
          <span className="font-display text-[15px] font-extrabold text-vitrin-lacivert">
            25 TL
          </span>
        </span>

        {/*
          Kazınan yüzey — gümüş kaplama.

          🔴 Ürün sahibi: *"burada gerçek kazıma animasyonu olmalı."*
          Önceki hâli düz bir renkti ve düz bir kenarla siliniyordu;
          o "perde açıldı" gibi okunuyordu, kazıma gibi değil.

          Kaplamanın dokusu iki çapraz gradyandan geliyor (Ü141'in
          gerçek kartındaki dokulu yüzeyin ucuz karşılığı) ve sıyrılma
          kenarı **düzensiz**: çok noktalı bir `polygon` tırtıklı bir
          sınır çiziyor, parmağın bıraktığı iz gibi.
        */}
        <span className="mini-kaplama absolute inset-0" />
      </span>

      {/*
        Kopan parçacıklar — Ü141'in kazı kartındaki `kazinti-uc`
        fikrinin küçüğü. ⚠️ Kartın DIŞINA taşıyorlar (`overflow-visible`
        dıştaki kapta): kenarda duran bir parça kopmuş gibi durmuyor.
      */}
      {[0, 1, 2, 3].map((n) => (
        <span key={n} className="mini-kirinti" style={{ "--n": n } as React.CSSProperties} />
      ))}
    </span>
  );
}

/**
 * Sonsuzluk işareti — üstünde sonsuza kadar dönen bir iz (Ü155).
 *
 * ── 🔴 İki deneme elendi ────────────────────────────────────
 *
 * **1 · İç içe iki halka.** Tek `C` zinciriyle yazılmıştı; eğri ortadan
 * geçmediği için sekiz rakamı değil, üst üste binmiş iki daire çıktı.
 * Ürün sahibi: *"bu da sonsuzluk olmamış."*
 *
 * **2 · Kendini çizen ilmek.** Şekil düzeldi ama hareket yanlıştı:
 * `stroke-dasharray` ile çizilirken her döngüde **yarım şekiller**
 * görünüyordu — ürün sahibinin ekran görüntüsünde yolun yuvarlak uç
 * kapağı ok gibi duruyordu ve şekil kopuk okunuyordu.
 *
 * ── Doğru hareket: çizmek değil, DÖNMEK ─────────────────────
 *
 * Sonsuzluğun anlattığı şey bir başlangıç-bitiş değil, **bitmeyen
 * dolaşma**. Şekil bu yüzden hep tam duruyor (soluk zemin yolu) ve
 * üstünde parlak bir parça sonsuza kadar dolanıyor. Hiçbir karede
 * yarım görünmüyor.
 *
 * ⚠️ `pathLength="240"` dikişsiz döngünün anahtarı: yolun gerçek
 * uzunluğu ne olursa olsun 240'a normalleşiyor, `dasharray` 40+200=240
 * ve offset tam bir tur olan −240'a gidiyor. Gerçek uzunluk ölçülseydi
 * (JS ile `getTotalLength`) yol her değiştiğinde sayı bayatlardı.
 */
const SONSUZ_YOLU =
  "M38 20C33 6 14 6 14 20C14 34 33 34 38 20C43 6 62 6 62 20C62 34 43 34 38 20Z";

function MiniDonus() {
  return (
    <svg
      viewBox="0 0 76 40"
      aria-hidden
      className="h-14 w-[108px] text-vurgu"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Zemin — şekil her an tam görünüyor. */}
      <path d={SONSUZ_YOLU} className="opacity-20" />
      {/* Dönen parça. */}
      <path d={SONSUZ_YOLU} pathLength="240" className="mini-sonsuz" />
    </svg>
  );
}

function KutuIcerigi({
  sira,
  baslik,
  metin,
  alt,
  koyu = false,
}: {
  /** Kaçıncı adım — verilirse başlığın üstünde altın rozet. */
  sira?: number;
  baslik: string;
  metin: string;
  alt?: string;
  /** Koyu zeminde mi duruyor — metin renkleri buna göre. */
  koyu?: boolean;
}) {
  return (
    <>
      {/*
        Adım numarası — Ü225.

        Ürün sahibi: *"daha dikkat çekici, daha büyük, daha müşteriyi
        okutacak şekilde olsun."* Numara boyut değil **beklenti**
        veriyor: okuyan kişi "dört tane var, biri bu" diyor ve
        başlayınca bitirme eğilimi doğuyor. Numarasız bir kutu, ne
        kadar büyük olursa olsun, atlanabilir bir kutu.
      */}
      {sira !== undefined && (
        <span
          className={`mb-4 inline-flex size-9 items-center justify-center rounded-full font-data text-[16px] font-bold ${
            koyu ? "bg-odul text-vitrin-lacivert" : "bg-vurgu-zemin text-vurgu"
          }`}
        >
          {sira}
        </span>
      )}
      {/* ⚠️ Üç kademeli boy: mobilde `AdimlarYol` kartı dar (375
          piksel), masaüstünde sahnenin yan kutusu geniş. Tek boy
          verilirse biri taşar, öteki kaybolur. */}
      <p
        className={`font-display text-[21px] leading-[1.08] font-extrabold tracking-[-0.025em] sm:text-[25px] lg:text-[31px] ${
          koyu ? "text-yuzey" : ""
        }`}
      >
        {baslik}
      </p>
      <p
        className={`mt-3.5 text-[15px] leading-relaxed sm:text-[16px] lg:text-[17px] ${
          koyu ? "text-white/70" : "text-yazi-sonuk"
        }`}
      >
        {metin}
      </p>
      {alt && (
        <p
          className={`mt-5 border-t pt-3.5 etiket-caps text-[11px] ${
            koyu ? "border-white/15 text-odul" : "border-vitrin-lacivert/10 text-vurgu"
          }`}
        >
          {alt}
        </p>
      )}
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
 * Kaydırmalı sahnede yağan kupon — Ü223'te GERÇEK bilete bağlandı.
 *
 * ── 🔴 Önceki hâli biletin taklidiydi ───────────────────────
 *
 * Beyaz bir kutu, altın bir bilet simgesi ve tek satır yazı. Ürünün
 * gerçek kuponu ise Ü72'den beri koyu doygun zeminli, kartın tamamına
 * döşenmiş desenli ve sağ kenarından taşan illüstrasyonlu — Ü189'dan
 * beri o illüstrasyonda **Loopy ödülü yaşıyor** (kahve içiyor, tatlı
 * yiyor, para ödülünü açıyor).
 *
 * Yani vitrin, sayfanın kendi kuralını çiğniyordu: *"ekranların hepsi
 * gerçek, çizim yok, sahte ekran yok"* (bkz. `vitrin-olcum.tsx`). Ziyaretçi
 * burada bir kupon görüp ürüne girince başka bir kupon buluyordu.
 *
 * Artık `<Bilet sus>` — aynı bileşen, aynı yüzey. Bilet değişirse
 * vitrin de kendiliğinden değişiyor.
 *
 * ── Genişlik neden ELLE veriliyor ───────────────────────────
 *
 * `Bilet` `block h-[124px]` ve kendi genişliği yok; ekranlarda kolonu
 * dolduruyor. Burada taşıyıcı `absolute` ve genişliği içerikten
 * geliyor — kart yazısı kadar daralıp okunmaz hâle gelirdi.
 *
 * ⚠️ Silinenler listesinde DEĞİL: mobildeki yağmur Ü154'te kalktı ama
 * masaüstündeki kaydırmalı sahne bunu hâlâ kullanıyor (`YAGAN`).
 */
function KuponRozeti({ baslik, gorsel }: { baslik: string; gorsel: KuponGorseli }) {
  return (
    <div className="w-[310px]">
      <Bilet
        sus
        veri={{
          /* ⚠️ `href` süs kipinde hiç kullanılmıyor (bağlantı
             üretilmiyor) ama tip zorunlu tutuyor — doğru olan boş
             bırakmak değil, gerçek adresi yazmak. */
          href: "/oduller",
          /*
            ⚠️ Uydurma bir kafe adı YAZILMIYOR. Gerçek kartta orada
            kuponun ait olduğu kafenin adı var; vitrinde "Kafe A" gibi
            bir ad koymak, sayfanın hiçbir yerinde olmayan bir işletme
            uydurmak olurdu (aynı kural `vitrin-olcum.tsx`te yazılı).
            "Kafende" hem doğru hem de okuyanın kendi kafesini
            işaret ediyor.

            ⚠️ Tarih yerine "yarın kullan": gerçek kartta son kullanım
            günü yazıyor ve burada bir tarih uydurulamaz. Yazan şey
            ürünün sözünün kendisi — ödül 24 saat sonra açılıyor.
          */
          kafe: "Kafende",
          baslik,
          gorsel,
          /* Renk kupon türünden türüyor: eşleme `GORSEL_RENGI`de ve
             ürünün her yerinde aynı (Ü65). */
          renk: GORSEL_RENGI[gorsel],
          son: "yarın kullan",
          tarihOneki: "",
        }}
      />
    </div>
  );
}

/*
  🔴 Ü154'te SİLİNENLER — kaydı için.

  `TelefondanKupon`, `CikanKupon`, `KuponRozeti` ve `MOBIL_YAGAN`
  (mobildeki kupon yağmuru) buradaydı. Ürün sahibi *"mobilde bu telefon
  kısmının gözükmesine gerek yok"* deyince dördü birden çağrısız kaldı.

  ⚠️ Çağrısız kod bırakmak bu deponun dört kez düştüğü tuzağın ta
  kendisi ("yazıldı ama bağlanmadı"): duruyor, derleniyor, kimse
  çalışmadığını fark etmiyor. Silindiler; geri gerekirse git geçmişinde
  Ü152 commit'inde duruyorlar.

  ⚠️ Kaydırmalı sahnenin (masaüstü) kupon yağmuru **ayrı** ve duruyor —
  bu silinen, yalnızca dar ekran için yazılmış kopyaydı.
*/


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
/*
  ⚠️ `gorsel` Ü223'te eklendi ve **uydurulmadı**: kupon türü ürünün
  kendi beş türünden biri (`KuponGorseli`) ve kartın rengi ile
  illüstrasyonu ondan türüyor. Yanlış tür seçmek, sıcak kahve
  kuponunun üstüne buzlu bardak çizdirmek olurdu.
*/
const YAGAN: {
  baslik: string;
  gorsel: KuponGorseli;
  x: number;
  basla: number;
  egim: number;
  donus: number;
}[] = [
  { baslik: "Ücretsiz filtre kahve", gorsel: "icecek", x: 7, basla: 0.0, egim: -8, donus: 14 },
  { baslik: "Tatlıda %20", gorsel: "tatli", x: 70, basla: 0.04, egim: 6, donus: -12 },
  { baslik: "+1 shot espresso", gorsel: "icecek", x: 28, basla: 0.08, egim: 4, donus: 10 },
  { baslik: "25 TL indirim", gorsel: "para", x: 84, basla: 0.12, egim: -5, donus: -9 },
  { baslik: "Ice Americano", gorsel: "soguk", x: 15, basla: 0.16, egim: 7, donus: 12 },
  { baslik: "İkinci kahve yarı fiyat", gorsel: "icecek", x: 50, basla: 0.2, egim: -6, donus: -14 },
  { baslik: "Kruvasan + filtre kahve", gorsel: "yiyecek", x: 38, basla: 0.24, egim: 5, donus: 11 },
  { baslik: "Cheesecake %25", gorsel: "tatli", x: 92, basla: 0.28, egim: -7, donus: -10 },
  { baslik: "Limonatada %15", gorsel: "soguk", x: 3, basla: 0.32, egim: 8, donus: 13 },
  { baslik: "Ücretsiz sürahi çay", gorsel: "icecek", x: 62, basla: 0.36, egim: -4, donus: -11 },
  { baslik: "Kahve yanına kurabiye", gorsel: "yiyecek", x: 22, basla: 0.4, egim: 6, donus: 9 },
  { baslik: "30 TL indirim", gorsel: "para", x: 77, basla: 0.44, egim: -8, donus: -13 },
  { baslik: "Sahlepte %20", gorsel: "icecek", x: 45, basla: 0.48, egim: 5, donus: 12 },
  { baslik: "Brunch'ta %15", gorsel: "yiyecek", x: 88, basla: 0.52, egim: -6, donus: -8 },
];
