"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RENK, oyunRengi, ISIN_DOKUSU } from "@/components/oyuncu-renk";
import { Gorsel, oyunGorseli } from "@/components/oyuncu-gorsel";
import { OyunSahnesi, sahneVarMi } from "@/components/oyun-sahnesi";
import { OyunIkonu } from "@/components/oyuncu-ikon";
import { type KatalogKarti } from "@/oyunlar/katalog";

/**
 * Oyun karuseli — üç boyutlu, parmakla çevrilen katalog (Ü143).
 *
 * ── Ürün sahibinin tarifi ───────────────────────────────────
 *
 * *"Kullanıcı oyunlarıma girince oyunlar carousel efektiyle olsun ama
 * 3D biçimde; parmağını sağa veya sola kaydırınca o oyunun önizlemesi
 * ve açıklaması olacak, o oyun en öne gelmiş olacak, diğer oyunlar
 * sırada gibi olacak ama arkada blurlu görünecek; oynaya tıklayıp
 * oynayabilecek."*
 *
 * ── Kategoriler kaybolmadı, karta taşındı ───────────────────
 *
 * Önceki ekran oyunları **kategori başlıkları** altında listeliyordu
 * (Ü66: "düşünerek" / "yetişerek"). Karusel tek bir halka olduğu için
 * o başlıklar duramazdı; kategori adı kartın üstüne, oyunun adının
 * hemen üzerine taşındı. Bilgi yerinde duruyor, yalnızca sıralayıcı
 * olmaktan çıkıp **etiket** oldu.
 *
 * ── Neden sürükleme "takip ediyor" ──────────────────────────
 *
 * Kaydırma bittiğinde kartları atlatmak (yalnızca `pointerup`ta karar
 * vermek) teknik olarak daha kolaydı. Ama parmağın altındaki şey
 * hareket etmiyorsa dokunmatikte ekran **bozuk** hissettiriyor: kullanıcı
 * çekiyor, hiçbir şey olmuyor, sonra bir anda zıplıyor. Burada konum
 * kesirli tutuluyor (`aktif` + sürükleme payı) ve kartlar parmakla
 * birlikte dönüyor; bırakınca en yakın orta noktaya oturuyor.
 *
 * ── Erişilebilirlik: karusel klavyeyi hapsetmemeli ──────────
 *
 * Her kart **gerçek bir bağlantı** ve hiçbiri `aria-hidden` değil.
 * Odak bir karta geldiğinde karusel o kartı öne getiriyor (`onFocus`),
 * yani klavyeyle gezen kullanıcı da parmakla gezenle aynı şeyi görüyor.
 * Kartları gizleseydik ekran okuyucu kullanan oyuncu kataloğun yalnızca
 * bir oyununu bulabilirdi.
 *
 * Ayrıca sol/sağ ok tuşları çalışıyor ve altta hangi kartta olunduğunu
 * söyleyen noktalar var.
 *
 * ── Hareketi kapatan kullanıcı ──────────────────────────────
 *
 * `prefers-reduced-motion` açıkken geçiş süreleri sıfırlanıyor
 * (`globals.css` genel kuralı) — kartlar yine yan yana duruyor ve
 * kaydırma çalışıyor, ama aradaki animasyon yok. Bulanıklık duruyor:
 * o bir hareket değil, derinlik işareti.
 */

export type KarusellOyun = KatalogKarti;

/**
 * Kartın genişliği (piksel). Yan kartların payı buna oranlı.
 *
 * ⚠️ Ü255'te 244'ten 288'e, Ü258'de 312'ye çıktı — ürün sahibi iki kez
 * *"kartlarımız daha büyümeli"* dedi. Büyütmenin bedeli yok: kartlar
 * zaten kırpılıyor ve ekrana sığma işi `max-w`ye değil kırpmaya bağlı.
 *
 * 🔴 Üst sınır komşu kartlardan geliyor, ekrandan değil. 375 piksellik
 * telefonda kapsayıcı 335 ve kart 312 olunca komşudan iki yanda 12'şer
 * piksel görünüyor — halka hissi orada bitiyor. Daha genişi karuseli
 * tek kartlık bir listeye çevirir.
 */
const KART_EN = 312;

/**
 * Kartın yüksekliği (piksel).
 *
 * ⚠️ Sabit oldu — önce üç yerde elle `356` yazılıydı (kutu, kart ve
 * rozetin yüzde hesabı). Biri büyütülüp öteki unutulsaydı rozet kartın
 * dışına taşardı.
 */
const KART_BOY = 444;

/** Komşu kartın yatay kayması — kart genişliğinin oranı. */
const ADIM_ORANI = 0.62;

/** Kaç kart derinliğe kadar çiziliyor. Ötesi DOM'da ama görünmüyor. */
const GORUNUR_DERINLIK = 2;

export function OyunKaruseli({ oyunlar }: { oyunlar: KarusellOyun[] }) {
  /** Öndeki kartın sırası. Bugünün oyunu varsa oradan başlıyor. */
  const [aktif, setAktif] = useState(() => {
    const i = oyunlar.findIndex((o) => o.bugunMu);
    return i >= 0 ? i : 0;
  });
  /**
   * Parmağın o anki payı — kart genişliği cinsinden kesir.
   *
   * 🔴 Hem durumda hem `ref`te tutuluyor ve bu **bilerek**: durum
   * ekranı çiziyor, `ref` ise olay dinleyicisinin o anki değeri
   * okumasını sağlıyor. İlk yazılışta bırakma anı payı
   * `setPay(p => { git(...); return 0; })` ile okuyordu — yani bir
   * durum güncelleyicisinin içinden başka bir durum yazılıyordu.
   * React bunu işlemiyor: karusel parmağı takip ediyor, bırakınca
   * **hiçbir zaman** yeni karta geçmiyordu. Ekranda hata yok, sadece
   * çalışmıyordu.
   */
  const [pay, setPay] = useState(0);
  const payRef = useRef(0);
  const payYaz = useCallback((k: number) => {
    payRef.current = k;
    setPay(k);
  }, []);
  const [suruklenıyor, setSurukleniyor] = useState(false);

  const kutuRef = useRef<HTMLDivElement>(null);

  /**
   * 🔴 Bu sürükleme bir tıklamaya dönüşmemeli.
   *
   * Kart bir bağlantı ve `pointerup`tan hemen sonra tarayıcı `click`
   * üretiyor: kaydırma biter bitmez öne gelen oyun **açılıyordu**. Yani
   * karusel çalışıyordu ama kullanılamıyordu — her kaydırma bir oyun
   * başlatıyordu.
   *
   * ⚠️ Bastırma denemeleri (yakalama evresi, zaman damgası) ölçümde
   * tutmadı; çözüm kartı bağlantı olmaktan çıkarmak oldu — bkz.
   * `OyunKapagi`.
   */

  const git = useCallback(
    (hedef: number) => {
      setAktif(Math.max(0, Math.min(oyunlar.length - 1, hedef)));
    },
    [oyunlar.length],
  );

  /* ── Sürükleme ────────────────────────────────────────── */
  useEffect(() => {
    const kutu = kutuRef.current;
    if (!kutu) return;

    let basiliMi = false;
    let baslangicX = 0;
    let baslangicY = 0;
    /** Yatay mı dikey mi olduğuna karar verildi mi? */
    let yonBelli = false;
    let yatayMi = false;

    const adim = () => KART_EN * ADIM_ORANI;

    const bas = (e: PointerEvent) => {
      /*
        🔴 BURADA YAKALAMA YOK — ve bu bir düzeltme, eksiklik değil.

        Ü162'de `setPointerCapture` tam buraya, `pointerdown`a
        konmuştu: sürükleme dokunmada `pointercancel` ile ölüyordu ve
        yakalama kararı bize alıyor. Sürükleme düzeldi. Karşılığında
        **oyun başlatmak öldü.**

        Ü167'de A/B ölçüldü — aynı sayfa, "Oyna →" bağlantısının tam
        ortasına aynı tıklama:

          pointerdown'da yakala (eski)  → click hedefi DIV, gitmedi
          yön kararında yakala (yeni)   → click hedefi A,   /oyna/<oyun>

        Yakalanan işaretçide tarayıcı `click` hedefini yakalayan ögeye
        kaydırıyor; bağlantı hiç tetiklenmiyor. Yani Ü162'den beri
        karuselden hiçbir oyun açılamıyordu — ürün sahibinin *"oyunlar
        oynanabilir durumda değil"* dediği tabloya bu da dâhil.

        ⚠️ **Ders:** yakalama ucuz bir sigorta gibi duruyor ama bedeli
        var ve bedeli başka bir etkileşimde ödeniyor. Bir jesti
        kurtarmak için konan şey, aynı yüzeydeki başka bir jesti
        sessizce kapatabiliyor.

        Çözüm yakalamayı kaldırmak değil, **geciktirmek**: jestin
        sürükleme olduğu anlaşılınca yakalanıyor (bkz. `kimilda`).
        Dokunup bırakan parmak hiç yakalamıyor, tıklaması bağlantıya
        ulaşıyor; sürükleyen parmak yakalıyor ve hem sürüklemesi
        sürüyor hem de tıklaması bastırılmış oluyor — sürükledikten
        sonra oyunun açılmaması zaten istenen şey.
      */
      basiliMi = true;
      yonBelli = false;
      yatayMi = false;
      baslangicX = e.clientX;
      baslangicY = e.clientY;
    };

    /**
     * Parmağın başlangıca göre payı — uçlardaki direnç uygulanmış.
     *
     * Sürüklerken de bırakırken de aynı hesap kullanılıyor: iki kopya
     * olsaydı biri düzeltilip öteki unutulabilirdi.
     *
     * Uçlarda direnç: ilk kartın solunda ya da son kartın sağında
     * parmak hareketi üçte bire iniyor. Sınırsız bırakılsaydı karusel
     * boşluğa açılır, oyuncu "bozuldu" sanırdı; sert durdurulsaydı
     * parmağın altındaki şey donar ve dokunmatik ölü hissederdi.
     */
    const payHesapla = (clientX: number) => {
      let k = -(clientX - baslangicX) / adim();
      const hedef = aktif + k;
      if (hedef < 0) k = -aktif + (hedef * 1) / 3;
      else if (hedef > oyunlar.length - 1) {
        k = oyunlar.length - 1 - aktif + ((hedef - (oyunlar.length - 1)) * 1) / 3;
      }
      return k;
    };

    /**
     * Jest yatay sayılacak kadar belirgin mi.
     *
     * Yalnızca **hiç hareket olayı gelmediğinde** kullanılıyor; akan
     * bir sürüklemede kararı `kimilda` veriyor ve orada eşik iki
     * adımlı (önce 8 piksel bekle, sonra ekseni seç).
     */
    const yatayJest = (dx: number, dy: number) =>
      Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2;

    const kimilda = (e: PointerEvent) => {
      if (!basiliMi) return;
      const dx = e.clientX - baslangicX;
      const dy = e.clientY - baslangicY;

      /*
        🔴 İlk birkaç pikselde yön kararı veriliyor.

        Karar verilmeseydi karusel **sayfanın dikey kaydırmasını
        yerdi**: oyuncu listeyi aşağı kaydırmak isterken kartlar yana
        dönerdi. Şimdi yatay hareket dikeyden belirgin biçimde
        büyükse karusel devralıyor, değilse hiç karışmıyor ve sayfa
        normal kayıyor.
      */
      if (!yonBelli) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        yatayMi = Math.abs(dx) > Math.abs(dy) * 1.2;
        yonBelli = true;
        if (yatayMi) {
          setSurukleniyor(true);
          /*
            İşaretçi ANCAK ŞİMDİ yakalanıyor — Ü167.

            Jestin sürükleme olduğu bu satırda belli oluyor. Daha
            erken yakalamak (Ü162'de `pointerdown`daydı) dokunup
            bırakan parmağın tıklamasını da yutuyordu.

            Yakalamanın işi buradan sonrası: parmak kutunun dışına
            taşsa bile olaylar buraya gelsin, tarayıcı jesti
            `pointercancel` ile elimizden almasın.

            ⚠️ `try` içinde: yakalama bazı ortamlarda atıyor
            (otomasyonla üretilmiş olay, etkin olmayan `pointerId`).
            Atan çağrı yakalanmasaydı sürükleme burada kesilir ve
            düzeltmeye çalıştığımız şey geri gelirdi.
          */
          try {
            kutu.setPointerCapture(e.pointerId);
          } catch {
            // Yakalanamadı — sürükleme yakalamasız da yürüyor.
          }
        }
      }
      if (!yatayMi) return;

      e.preventDefault();
      payYaz(payHesapla(e.clientX));
    };

    const birak = (e?: PointerEvent) => {
      if (!basiliMi) return;
      basiliMi = false;
      if (e) {
        try {
          kutu.releasePointerCapture(e.pointerId);
        } catch {
          // Zaten bırakılmış olabilir.
        }
      }
      setSurukleniyor(false);

      /*
        🔴 BIRAKMA NOKTASI da okunuyor — Ü164.

        Önceden yalnızca son `pointermove`un yazdığı pay okunuyordu.
        Bu bir varsayıma dayanıyordu: *"sürükleyen parmak yolda bol bol
        hareket olayı üretir."* Ölçüldü ve varsayım zayıf çıktı: bu
        ekranda tek bir sürükleme **iki** `pointermove` üretiyor.
        Sıfır ürettiği durum denendiğinde karusel hiç kıpırdamadı —
        150 piksellik bir jestten sonra `aktif` 1 → 1.

        Bırakma olayı gerçek son konumu zaten taşıyor; onu okumak
        bedava ve jestin taşıdığı bilgiyi çöpe atmayı bitiriyor.

        ⚠️ Yön kararı korunuyor: dikey bir kaydırma yatay sayılmamalı.
        Karar verilmişse ona uyuluyor, hiç hareket gelmediyse karar
        burada bırakma noktasından veriliyor.
      */
      let k = payRef.current;
      if (e) {
        const yatay = yatayJest(e.clientX - baslangicX, e.clientY - baslangicY);
        if (yonBelli ? yatayMi : yatay) k = payHesapla(e.clientX);
      }

      // Yarım kartı geçen hareket bir sonrakine oturuyor.
      git(Math.round(aktif + k));
      payYaz(0);
    };

    /**
     * İptal edilen jest — bırakma noktası anlamlı değil.
     *
     * `pointercancel`de tarayıcı jesti devralmış oluyor ve olayın
     * koordinatı "kullanıcının bıraktığı yer" demek değil. Son
     * yazılan pay neyse ona oturuluyor.
     */
    const iptal = () => birak();

    kutu.addEventListener("pointerdown", bas);
    kutu.addEventListener("pointermove", kimilda, { passive: false });
    kutu.addEventListener("pointerup", birak);
    kutu.addEventListener("pointercancel", iptal);
    /*
      ⚠️ `pointerleave` ARTIK BAĞLI DEĞİL (Ü162). İşaretçi yakalandığı
      için kutudan çıkmak sürüklemeyi bitirmemeli; bağlı kalsaydı dar
      ekranda kenara yaklaşan parmak hareketi öldürürdü.
    */

    return () => {
      kutu.removeEventListener("pointerdown", bas);
      kutu.removeEventListener("pointermove", kimilda);
      kutu.removeEventListener("pointerup", birak);
      kutu.removeEventListener("pointercancel", iptal);

    };
  }, [aktif, git, payYaz, oyunlar.length]);

  const konum = aktif + pay;

  return (
    <div>
      {/*
        🔴 YATAY KIRPMA — Ü255. Bu sarmalayıcı olmadan sayfa bozuluyordu.

        Kartlar `left-1/2` + `translateX` ile yerleşiyor ve halkanın
        dış kartları kutunun dışına taşıyor. Kırpma olmayınca taşan
        kartlar **belgeyi genişletiyordu**: ölçüldü, `/oyunlar`
        sayfasında `scrollWidth` 797, ekran 375 — 422 piksel taşma.

        Bedeli üç ayrı belirti olarak göründü ve üçü de aynı sebepti:

          1. Sayfa yana kaydırılabiliyordu
          2. Karoseli yana sürüklerken sayfa dikey de kayıyordu
             (`touch-action: pan-y` dikeyi tarayıcıya bırakıyor ve
             belge yatay kaydırılabilir olunca çapraz jest sayfayı
             sürüklüyor)
          3. 🔴 **Oyun ekranı bomboş görünüyordu.** Oyun kabuğu
             `fixed inset-0` ve `fixed` düzen görüş alanına çapalı;
             sayfa sağa kaydırılmışken katman ekranın dışında kalıyor
             ve oyuncu beyaz bir sayfa görüyordu. Bu hata dört tur
             boyunca yanlış yerlerde arandı.

        ⚠️ `overflow-x: clip`, `hidden` DEĞİL. `hidden` bir kaydırma
        kapsayıcısı üretiyor ve `overflow-y`yi de `auto`ya zorluyor;
        `clip` yalnızca kırpıyor, dikey görünür kalıyor (kartın gölgesi
        ve rozeti yukarı taşabiliyor).
      */}
      <div className="overflow-x-clip">
      <div
        ref={kutuRef}
        className="relative mx-auto w-full max-w-md touch-pan-y select-none"
        style={{ perspective: "1100px", height: KART_BOY }}
        role="group"
        aria-roledescription="oyun karuseli"
        aria-label="Oyunlar"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            git(aktif - 1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            git(aktif + 1);
          }
        }}
      >
        {oyunlar.map((oy, i) => {
          const t = i - konum;
          const uzaklik = Math.min(Math.abs(t), GORUNUR_DERINLIK);
          const onde = Math.abs(t) < 0.5;

          return (
            <div
              key={oy.id}
              className="absolute top-0 left-1/2"
              style={{
                width: KART_EN,
                marginLeft: -KART_EN / 2,
                zIndex: 100 - Math.round(Math.abs(t) * 10),
                transform:
                  `translateX(${(t * KART_EN * ADIM_ORANI).toFixed(1)}px) ` +
                  `translateZ(${(-uzaklik * 150).toFixed(0)}px) ` +
                  `rotateY(${(-t * 24).toFixed(1)}deg) ` +
                  `scale(${(1 - uzaklik * 0.08).toFixed(3)})`,
                filter: uzaklik > 0.02 ? `blur(${(uzaklik * 2.4).toFixed(1)}px)` : undefined,
                opacity: Math.abs(t) > GORUNUR_DERINLIK + 0.4 ? 0 : 1 - uzaklik * 0.3,
                pointerEvents: Math.abs(t) > GORUNUR_DERINLIK + 0.4 ? "none" : undefined,
                // Sürüklenirken geçiş yok: parmak zaten konumu yazıyor.
                transition: suruklenıyor
                  ? "none"
                  : "transform .42s cubic-bezier(.2,.7,.3,1), filter .42s ease, opacity .42s ease",
              }}
            >
              <OyunKapagi
                oyun={oy}
                onde={onde}
                odakta={() => git(i)}
                tiklandi={() => {
                  // Yandaki karta dokunmak onu öne getiriyor, oyunu
                  // açmıyor: yanlışlıkla oyun başlatmak, seçmeye
                  // çalışan oyuncuyu cezalandırırdı.
                  if (!onde) git(i);
                }}
              />
            </div>
          );
        })}
      </div>
      </div>

      {/*
        ── Nerede olduğunu söyleyen noktalar ───────────

        🔴 Dokunma alanı 8 pikselden 44'e çıkarıldı — Ü163.

        Ürün sahibi karuseli **üç kez** *"kaydıramıyorum"* diye bildirdi.
        Sürükleme dışında bir yol vardı ama kullanılamaz hâldeydi:
        noktalar ölçüldüğünde **8×8 piksel** çıktı. Parmak ucunun
        ortalaması ~9 mm, yani yaklaşık 44 piksel; 8 piksellik bir
        hedefe basmak şansa kalıyor.

        Görünen nokta aynı boyutta kaldı — büyütülseydi gösterge
        olmaktan çıkıp düğme sırasına dönerdi. Büyüyen şey yalnızca
        **basılabilir alan**: düğme 44 piksel yüksekliğinde, nokta
        ortasında.

        ⚠️ `-my-4` ile dikey büyüme yerleşimi itmiyor: alan büyüyor,
        boşluk aynı kalıyor.
      */}
      <div className="mt-5 flex items-center justify-center gap-1">
        {oyunlar.map((oy, i) => (
          <button
            key={oy.id}
            type="button"
            onClick={() => git(i)}
            aria-label={`${oy.ad} oyununu öne getir`}
            aria-current={i === aktif}
            className="-my-4 grid h-11 w-8 place-items-center"
          >
            <span
              aria-hidden
              className={`block h-2 rounded-full transition-all ${
                i === aktif ? "w-6 bg-vurgu" : "w-2 bg-cizgi"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Tek oyunun kapağı.
 *
 * Öndeki kart açıklamasını ve "Oyna" düğmesini taşıyor; arkadakiler
 * yalnızca kapak. Arkadakilerde de metin dursaydı bulanık bir yazı
 * yığını olurdu ve okunacak bir şey varmış gibi durup okunamazdı.
 */
function OyunKapagi({
  oyun,
  onde,
  odakta,
  tiklandi,
}: {
  oyun: KarusellOyun;
  onde: boolean;
  odakta: () => void;
  tiklandi: () => void;
}) {
  const renk = oyunRengi(oyun.id);
  const r = RENK[renk];

  return (
    <div
      className="kart-golge relative overflow-hidden rounded-3xl"
      style={{
        height: KART_BOY,
        /*
          🔴 Kart PASTELDEN KOYUYA geçti — Ü181.

          Ürün sahibi: *"kartlarımızın arka planları da çok kötü,
          kartlarımız da benzer temada olmalı."* Haklıydı ve sebebi
          ölçülebilir: sahneler neon ve neon **toplamalı ışık**. Açık
          pastel zeminde parlamanın ekleyecek bir şeyi yok, blok
          yalnızca renkli bir kare olarak duruyor. Koyu zeminde aynı
          blok ışık saçıyor.

          Yüzey `BiletYuzeyi` ile aynı formül — ürünün koyu kart dili
          tek yerden geliyor (Ü171).
        */
        background: `linear-gradient(115deg, ${r.koyu} 0%, ${r.ana} 100%)`,
      }}
    >
      {/* Işın dokusu — koyu zeminde %8 yetiyor (Ü171). */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[240%] left-1/2 size-[300%] -translate-x-1/2"
        style={{ opacity: 0.08, background: ISIN_DOKUSU }}
      />
      {/*
        Kapak görseli.

        Ü176: Düşen'in kendi SAHNESİ var — renkli blok yığını
        (`components/oyun-sahnesi.tsx`). Ürün sahibi *"hem oyunlar
        kısmındaki kartını hem de ana sayfadaki kartını bu görseldeki
        gibi"* dedi; iki kartın aynı sahneyi paylaşması da onu
        sağlıyor.

        ⚠️ Sahne SOLUK DEĞİL, tam renkte: çizim soluk duruyordu çünkü
        tek renkli bir kontur ve kartın metniyle yarışmaması
        gerekiyordu. Sahne ise kendi renklerini taşıyor ve kartın alt
        köşesinde duruyor — metinle çakışmıyor, o yüzden bastırmaya
        gerek yok.

        Öbür oyunlar kendi sahneleri üretilene kadar eski soluk
        çizimde kalıyor.

        ⚠️ Sahne kartın ÜST yarısında: alt yarıda denendi ve metinle
        çakıştı — "İnen parçalarla satır doldur" blokların altında
        kaldı. Karusel kartı dikey ve metin alt yarıyı dolduruyor;
        sahneye kalan tek boş alan ikonun sağı.
      */}
      {sahneVarMi(oyun.id) ? (
        /*
          🔴 Sahne BÜYÜDÜ ve ÜSTTEN TAŞIYOR — Ü181, Ü187'de bir kez daha.

          Ürün sahibi üç turda aynı şeyi söyledi: *"sadece simge değil
          kartta yerleşimi de önemli"* · *"kartlarda yeterli alanı
          kaplamıyor"* · ve Ü187'de *"Düşen ve Yılan'ın kartlarındaki
          oyun görselimiz daha büyük olmalı."*

            132 → kartın (KART_BOY) %32'si, sağ üstte duran bir rozet
            215 → üst yarı; ama dar çizimler yine kartın solunu boş
                  bırakıyordu
            290 → taban; sahnenin kendi `olcek`i ile Düşen 325'e çıkıyor
            300 → Ü258'de kart 444'e çıkınca oranı korumak için

          Üstten ve sağdan taşması hareketin kaynağını kartın DIŞINA
          koyuyor — parçalar bir yerden geliyormuş gibi duruyor.

          🔴 ÜST KAYMA metinle ÇAKIŞMAYI belirliyor — Ü258.

          Ölçüldü: `-top-9` (−36) ve 290 boyla sahnenin dibi kartın
          254. pikselindeydi, kategori etiketi ise 221–237 arasında —
          yani sahne yazının üstüne biniyordu ve Blok'un beyaz
          patlaması etiketi yutuyordu. Ü187'nin güçlendirdiği perde
          bunu tam kapatamıyor.

          Kart 444'e çıkınca metin bloğu aşağı iniyor (250) ve sahne
          `-top-14` (−56) ile 244'te bitiyor: aralarında 6 piksel var.

          ⚠️ İkisi BAĞLI. `KART_BOY`, sahne boyu ya da bu kayma
          değişirse üçünü birlikte hesapla; metin bloğu `mt-auto` ile
          alta yapışık ve yüksekliği ~194 piksel.
        */
        <span aria-hidden className="pointer-events-none absolute -top-14 -right-8">
          <OyunSahnesi oyun={oyun.id} boy={300} />
        </span>
      ) : (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-2 text-white opacity-[0.17]"
        >
          <Gorsel ad={oyunGorseli(oyun.id)} boy={190} />
        </span>
      )}

      {/*
        Perde: aşağıdan yukarı açılan koyu geçiş, metnin arkasını
        temizliyor.

        🔴 Ü187'de GÜÇLENDİ ve sebebi ölçüldü. Sahne 215'teyken alt
        kenarı y=195'te bitiyordu, metin ise 240'ta başlıyor — araları
        vardı ve %50/%10'luk perde yetiyordu. 290'da sahne 254'e iniyor
        ve **kategori etiketinin üstüne** geliyor.

        Blok'ta ölçüldü: etiket `canli` (#38bdf8) ve arkasına patlamanın
        beyaz çekirdeği düşüyor. Eski perdede o noktada örtme %44'te
        kalıyor, bileşik zemin (146,182,201) çıkıyor ve kontrast
        **1,01 : 1** — yani etiket görünmüyor.

        %64/%52 ile perde metin bloğunun başladığı yerde TAM kapalı:
        etiket yine düz `koyu` zeminin üstünde ve kontrast 3,52 : 1,
        sahne büyümeden önceki değerin aynısı. Üstündeki 110 piksellik
        geçiş de sahneyi kesmiyor, karta gömüyor.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[64%]"
        style={{ background: `linear-gradient(to top, ${r.koyu} 52%, transparent 100%)` }}
      />

      {/*
        Arkadaki kartın tamamı bir düğme: dokununca öne geliyor, oyunu
        açmıyor. Seçmeye çalışan oyuncuya yanlışlıkla oyun başlatmak
        ceza olurdu. Öndeki kartta bu katman hiç yok.
      */}
      {!onde && (
        <button
          type="button"
          onClick={tiklandi}
          onFocus={odakta}
          aria-label={`${oyun.ad} oyununu öne getir`}
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}

      <div className="pointer-events-none relative flex h-full flex-col p-5">
        {/*
          🔴 Ü238: beyaz kutu KALKTI.

          İkonlar ürün sahibinin referansına göre **karo** oldu: her
          biri kendi koyu zemini ve neon çerçevesiyle gelen bir
          uygulama ikonu. 36 pikselde beyaz bir kutunun ortasına
          konunca karo küçülüyor, kendi çerçevesi de beyazın içinde
          kayboluyordu — kutunun içinde kutu.

          ⚠️ `overflow-hidden` şart: karonun köşeleri görselin
          kendisinde yuvarlak ama dışında koyu lacivert alan var;
          kırpılmazsa kutunun köşelerinde o lacivert görünür.
        */}
        <span className="flex size-16 overflow-hidden rounded-2xl shadow-sm">
          <OyunIkonu oyunId={oyun.id} boy={64} />
        </span>

        <div className="mt-auto">
          <div className="flex flex-wrap items-center gap-2">
            {/* ⚠️ Etiket `koyu` DEĞİL `canli`: zemin artık koyu ve koyu
                tonun üstüne koyu ton okunmuyor (Ü171'in aynı dersi). */}
            <span className="etiket-caps text-[10px]" style={{ color: r.canli }}>
              {oyun.kategori}
            </span>
            {oyun.bugunMu && (
              <span className="rounded-full border border-odul bg-yuzey px-2 py-0.5 etiket-caps text-[9px] text-odul-koyu">
                Bugünün oyunu · ×2
              </span>
            )}
          </div>

          <p className="mt-1.5 font-display text-[27px] leading-tight font-extrabold text-white">
            {oyun.ad}
          </p>

          {/* Açıklama ve düğme yalnızca öndeki kartta. */}
          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: onde ? 140 : 0, opacity: onde ? 1 : 0 }}
          >
            <p className="mt-2 text-[14px] leading-relaxed text-white/80">{oyun.ozet}</p>

            {/*
              🔴 Oyunu açan tek şey BU düğme — kartın kendisi bağlantı
              değil.

              Kart bir `<a>` iken kaydırma bittiğinde tarayıcı tıklama
              üretiyor ve oyun kendiliğinden açılıyordu. İki ayrı
              bastırma denendi (yakalama evresinde durdurma, sonra zaman
              damgası) ve ikisi de ölçümde tutmadı. Sorunun kaynağı
              bastırmanın nasıl yapıldığı değil, **kartın bağlantı
              olması**: kaydırılan yüzeyle tıklanan hedef aynı şeydi.
              Ayrıldıklarında hata sınıfı tamamen kalkıyor.

              `pointer-events-none` üst katmanda, burada geri açılıyor:
              kartın gövdesi parmağı karusele bırakıyor, yalnızca bu
              düğme tıklamayı topluyor.
            */}
            <Link
              href={`/oyna/${oyun.id}`}
              onFocus={odakta}
              tabIndex={onde ? 0 : -1}
              draggable={false}
              className="pointer-events-auto mt-4 inline-flex items-center gap-2 rounded-full bg-yuzey px-5 py-2.5 font-display text-[15px] font-bold tracking-tight text-yazi shadow-sm"
            >
              Oyna →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
