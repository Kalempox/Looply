"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Kahraman başlığı — yazılan slogan ve yanan ödül etiketleri (Ü142).
 *
 * ── Referans ve nereden alındığı ────────────────────────────
 *
 * Ürün sahibinin örneği Diem'in kahraman bölümü: arama kutusuna örnek
 * terimler daktilo gibi yazılıyor ve arka plandaki eşleşen nesneler tam
 * o anda sırayla yanıyor.
 *
 * 🔴 **Bire bir alınamazdı:** oradaki animasyonun merkezi bir arama
 * kutusu ve bizim kahramanda kutu yok. Alınan şey efekt değil his —
 * *"bir şey yazılıyor ve etraf ona cevap veriyor"*. Ürün sahibi bu
 * okumayı onayladı: **"Geri gel."** daktilo gibi yazılıyor, arka
 * plandaki ödül etiketleri o sırada teker teker yanıyor.
 *
 * ── Neden yalnızca üçüncü satır yazılıyor ───────────────────
 *
 * "Oyna. Kazan." baştan duruyor; yazılan tek şey **"Geri gel."** Sebep
 * anlam: ürünün bütün iddiası o iki kelimede ve döngüyü kapatan şey o.
 * Üçü birden yazılsaydı ziyaretçi üç saniye boyunca yarım bir cümleye
 * bakardı ve en önemli kelime sıradanlaşırdı.
 *
 * ── Neden döngüye girmiyor ──────────────────────────────────
 *
 * Bir kez yazılıyor, sonra duruyor. Ü133'te aynı karar çağrı düğmesi
 * için verilmişti: *"sürekli atan bir düğme reklam bandı gibi okunuyor
 * ve tam da o yüzden tıklanmıyor."* Sürekli yazılıp silinen bir slogan
 * da okunmayı bırakır — gözün alıştığı hareket, hareket sayılmaz.
 *
 * ── Hareketi kapatan kullanıcı ──────────────────────────────
 *
 * `prefers-reduced-motion` açıksa yazma hiç başlamıyor: metin **tam**
 * hâliyle duruyor ve etiketler yanmış hâlde. İçerik hiçbir koşulda
 * animasyona bağlı değil — efekt çalışmasa da sayfa doğru okunuyor.
 * Sunucudan gelen ilk HTML de tam metni taşıyor, yani arama motoru ve
 * betik çalışmadan açılan tarayıcı sloganı eksiksiz görüyor.
 */

const SON_SATIR = "Geri gel.";

/** Harf başına süre. Yavaş yazmak "bekletiyor", hızlı yazmak "kaçıyor". */
const HARF_MS = 85;

/** İlk harf gelmeden önceki es — sayfa otursun, sonra yazsın. */
const BASLAMA_MS = 420;

/**
 * Arkadaki ödül etiketleri.
 *
 * Metinler vitrinin başka yerlerindeki ödül sözlüğüyle **aynı**
 * (`vitrin-yaklasma.tsx`): ziyaretçi aynı kafede iki ayrı ürün
 * görmemeli.
 *
 * ⚠️ Konumlar yüzde ve kutu `overflow-hidden`: Dalga 8'de tam
 * genişlikteki bir öge 16 piksel kayınca mobilde yatay kaydırma
 * doğurmuştu. Burada etiketler kutunun dışına taşabilir ama kutu onları
 * kırpıyor, sayfa genişlemiyor.
 *
 * ⚠️ Dar ekranda yalnızca ikisi görünüyor (`dar` bayrağı). Altı etiket
 * telefonda başlığın üstüne biner ve okunmaz hâle getirir; bunlar süs,
 * başlık ise sayfanın kendisi.
 */
const ETIKETLER = [
  { metin: "Ücretsiz filtre kahve", x: 4, y: 12, egim: -7, dar: true },
  { metin: "Tatlıda %20", x: 74, y: 20, egim: 6, dar: true },
  { metin: "+1 shot espresso", x: 12, y: 74, egim: 5, dar: false },
  { metin: "25 TL indirim", x: 79, y: 68, egim: -5, dar: false },
  { metin: "İkinci kahve yarı fiyat", x: 58, y: 88, egim: 4, dar: false },
] as const;

export function KahramanBaslik() {
  /** Kaç harf yazıldı. `-1` = hiç başlamadı, metin tam duruyor. */
  const [harf, setHarf] = useState(-1);
  const bittiRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (bittiRef.current) return;

    setHarf(0);
    let i = 0;
    let zamanlayici = 0;

    const yaz = () => {
      i++;
      setHarf(i);
      if (i < SON_SATIR.length) {
        zamanlayici = window.setTimeout(yaz, HARF_MS);
      } else {
        bittiRef.current = true;
      }
    };

    zamanlayici = window.setTimeout(yaz, BASLAMA_MS);
    return () => window.clearTimeout(zamanlayici);
  }, []);

  const yaziliyor = harf >= 0 && harf < SON_SATIR.length;
  const gorunen = harf < 0 ? SON_SATIR : SON_SATIR.slice(0, harf);

  /**
   * Etiketin yanma anı.
   *
   * Yazma ilerlemesine bağlı: ilk etiket ilk harfte, sonuncusu son
   * harfte yanıyor. Sabit gecikmelerle yapılsaydı iki zaman çizgisi
   * olurdu ve harf süresi değiştiğinde ikisi birbirinden kopardı.
   */
  const ilerleme = harf < 0 ? 1 : harf / SON_SATIR.length;

  return (
    <div className="relative">
      {/* ── Arkadaki ödül etiketleri ──────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 -bottom-6 overflow-hidden"
      >
        {ETIKETLER.map((e, i) => {
          const yandi = ilerleme >= (i + 1) / (ETIKETLER.length + 1);
          return (
            <span
              key={e.metin}
              className={`absolute rounded-full border px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-all duration-500 sm:text-[12px] ${
                e.dar ? "" : "hidden sm:block"
              } ${
                yandi
                  ? "border-odul bg-odul-zemin text-odul-koyu opacity-100"
                  : "border-cizgi bg-yuzey text-yazi-sonuk opacity-35"
              }`}
              style={{
                left: `${e.x}%`,
                top: `${e.y}%`,
                transform: `rotate(${e.egim}deg) scale(${yandi ? 1 : 0.94})`,
              }}
            >
              {e.metin}
            </span>
          );
        })}
      </div>

      <h1 className="relative mx-auto mt-6 max-w-5xl font-display text-[clamp(46px,10.5vw,118px)] leading-[0.92] font-extrabold tracking-[-0.045em]">
        Oyna. Kazan.
        <br />
        {/*
          ⚠️ Görünen metin `aria-hidden`, tam metin `sr-only` olarak
          ayrıca duruyor. İkisi de okunur olsaydı ekran okuyucu sloganı
          iki kez söylerdi; yalnızca görünen metin okunsaydı yazma
          sırasında yarım bir cümle okunurdu.
        */}
        <span className="text-vurgu" aria-hidden>
          {gorunen}
          {/*
            İmleç yalnızca yazarken. Yazma bittiğinde kaldırılıyor:
            duran bir metnin sonunda yanıp sönen çubuk, cümleyi
            bitmemiş gösteriyor.

            ⚠️ Genişlik ayrılmıyor (`absolute` değil, akışta): imleç
            kalkınca son nokta yerinden oynamasın diye satır sonunda
            duruyor ve `inline-block` genişliği 3 piksel.
          */}
          {yaziliyor && (
            <span
              aria-hidden
              className="imlec ml-1 inline-block w-[3px] align-baseline"
              style={{ height: "0.78em", background: "currentColor" }}
            />
          )}
        </span>
        <span className="sr-only">{SON_SATIR}</span>
      </h1>
    </div>
  );
}
