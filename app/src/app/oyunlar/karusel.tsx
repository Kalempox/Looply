"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RENK, oyunRengi } from "@/components/oyuncu-renk";
import { Gorsel, oyunGorseli } from "@/components/oyuncu-gorsel";
import { OyunIkonu } from "@/components/oyuncu-ikon";

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

export type KarusellOyun = {
  id: string;
  ad: string;
  ozet: string;
  /** "Düşünerek" · "Yetişerek" · "Diğer" */
  kategori: string;
  bugunMu: boolean;
};

/** Kartın genişliği (piksel). Yan kartların payı buna oranlı. */
const KART_EN = 244;

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
        🔴 İşaretçi YAKALANIYOR — Ü162.

        Ürün sahibi karuseli üç kez *"kaydıramıyorum"* diye bildirdi.
        Fare girdisiyle ölçüldüğünde çalışıyor (`pointerType: mouse`),
        ama o DevTools'un **mobil görünümünde** deniyor ve orada
        dokunma taklidi açık: olaylar `pointerType: touch` geliyor.

        Dokunmada tarayıcı jestin kaydırma mı sürükleme mi olduğuna
        **kendi** karar veriyor ve kaydırma derse akışı `pointercancel`
        ile kesiyor — parmak hâlâ ekrandayken sürükleme ölüyor.
        `setPointerCapture` bu kararı bize alıyor: işaretçi bu ögeye
        bağlanıyor ve sonraki olaylar buraya geliyor.

        ⚠️ Yan kazanç: parmak kutunun dışına çıktığında da sürükleme
        sürüyor. Öncesinde `pointerleave` sürüklemeyi kesiyordu ve dar
        ekranda kutunun kenarına yaklaşmak bile hareketi bitiriyordu.

        ⚠️ `try` içinde: yakalama başarısız olursa (bazı tarayıcılar
        belirli koşullarda atıyor) sürükleme eski yoluyla devam etmeli,
        hata yüzünden hiç başlamaması değil.
      */
      try {
        kutu.setPointerCapture(e.pointerId);
      } catch {
        // Yakalanamadı — eski davranışla devam.
      }
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
        if (yatayMi) setSurukleniyor(true);
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
      <div
        ref={kutuRef}
        className="relative mx-auto h-[356px] w-full max-w-md touch-pan-y select-none"
        style={{ perspective: "1100px" }}
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
      className="kart-golge relative h-[356px] overflow-hidden rounded-3xl"
      style={{
        // Kartın yüzeyi listedeki hâliyle aynı aileden: açık zeminden
        // canlı tona. `kartStili` doğrudan kullanılmadı çünkü orada
        // yükseklik ve köşe yarıçapı listeye göre ayarlı; kapak dikey.
        background: `linear-gradient(150deg, ${r.zemin} 0%, ${r.canli} 100%)`,
        border: `1px solid ${r.canli}`,
      }}
    >
      {/* Kapak görseli — oyunun kendi çizimi, büyük ve soluk. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -bottom-2 opacity-[0.18]"
        style={{ color: r.koyu }}
      >
        <Gorsel ad={oyunGorseli(oyun.id)} boy={190} />
      </span>

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
        <span className="flex size-16 items-center justify-center rounded-2xl bg-yuzey shadow-sm">
          <OyunIkonu oyunId={oyun.id} boy={36} />
        </span>

        <div className="mt-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span className="etiket-caps text-[10px]" style={{ color: r.koyu }}>
              {oyun.kategori}
            </span>
            {oyun.bugunMu && (
              <span className="rounded-full border border-odul bg-yuzey px-2 py-0.5 etiket-caps text-[9px] text-odul-koyu">
                Bugünün oyunu · ×2
              </span>
            )}
          </div>

          <p className="mt-1.5 font-display text-[27px] leading-tight font-extrabold">
            {oyun.ad}
          </p>

          {/* Açıklama ve düğme yalnızca öndeki kartta. */}
          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: onde ? 140 : 0, opacity: onde ? 1 : 0 }}
          >
            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: r.koyu }}>
              {oyun.ozet}
            </p>

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
