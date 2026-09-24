"use client";

import { useEffect } from "react";

/**
 * Aşağı kaydırınca şeritler çekiliyor, yukarı kaydırınca geri geliyor — Ü275.
 *
 * Ürün sahibi: *"parmağımı yukarı kaydırıp sayfayı aşağı kaydırırken
 * [alttaki Oyna/Ödüllerim şeridi] yok olsun; alttaki link göstergesi de
 * olduğu için hâlâ çok alan kaplıyor. Üstte de saat, Wi-Fi, şarjın
 * olduğu ada var; ekran üstten alttan çok kısalıyor."* Safari'nin kendi
 * çubuğunun yaptığını yapıyoruz: okurken çekil, geri dönerken gel.
 *
 * ── Neden React durumu değil ────────────────────────────────
 *
 * Kaydırma saniyede onlarca olay. Durumda tutulsaydı her olay ana ekranın
 * tamamını yeniden çizdirirdi. Tek bir `data-` özniteliği yazılıyor ve
 * şeritler CSS'le kayıyor (`globals.css` · `.serit-alt`, `.serit-ust`);
 * React hiçbir şey çizmiyor.
 *
 * ⚠️ Tepeye yakınken şeritler HEP görünür: sayfanın başında gizli bir
 * menü, "menü nerede" sorusudur.
 */
const TEPE_PAYI = 48;
const ESIK = 8;

export function SeritGizleyici() {
  useEffect(() => {
    const kok = document.documentElement;
    let son = window.scrollY;
    let bekliyor = false;

    const bak = () => {
      bekliyor = false;
      const y = window.scrollY;
      if (y < TEPE_PAYI) {
        delete kok.dataset.seritGizli;
        son = y;
        return;
      }
      const fark = y - son;
      // Küçük kıpırtılar birikiyor; yön ancak eşiği aşınca değişiyor.
      if (fark > ESIK) {
        kok.dataset.seritGizli = "";
        son = y;
      } else if (fark < -ESIK) {
        delete kok.dataset.seritGizli;
        son = y;
      }
    };

    const kaydir = () => {
      if (bekliyor) return;
      bekliyor = true;
      requestAnimationFrame(bak);
    };

    window.addEventListener("scroll", kaydir, { passive: true });
    return () => {
      window.removeEventListener("scroll", kaydir);
      delete kok.dataset.seritGizli;
    };
  }, []);

  return null;
}
