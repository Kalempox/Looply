import type { CSSProperties } from "react";

/**
 * Yılan'ın yüzeyi — Ü215'te `gamesvideos/snake.png`ten ölçülerek.
 *
 * ── Referans üç kez değişti, sırayla ────────────────────────
 *
 * 1. **Ü212** — referansa BAKMADAN yapıldı: Düşen'in koyu/neon/cam
 *    dili buraya taşındı. Ürün sahibi yakaladı.
 * 2. **Ü213** — verilen link (Google'ın Yılan'ı) açıldı, canvas'ı
 *    piksel piksel ölçüldü, *"tamamen referans gibi"* kararıyla düz
 *    çimen + mavi yılan yapıldı.
 * 3. **Ü215** — ürün sahibi yeni bir görsel verdi (`snake.png`) ve
 *    *"tam burdaki gibi bir oyun arayüzü istiyorum"* dedi. Google'ın
 *    sadeliği kaldı; üstüne **taş duvar**, **ışıyan halkalı solucan**
 *    ve **koyu neon HUD hapları** geldi.
 *
 * **Ders kayıtlı:** referans bir dosya ya da link olarak verildiyse iş
 * o kaynak açılmadan başlamaz.
 *
 * ── Ölçümler (`snake.png`, 1024×1536) ───────────────────────
 *
 *   çimen açık / koyu   #88B64F / #7BAA48   · dama **tek hücre**
 *   duvar taşı ışık     #A4AAB2   · gölge #6F808E
 *   solucan gövde       #1E51FA   · baş #244DFD
 *   solucan üst parlama #69FCFD   · alt gölge #182344
 *   elma                #FE4D3A
 *   HUD hap içi         #2A4972 – #374466   · taç #FDDF3A
 *
 * ⚠️ Referansın **arka planı** (uçan adalar, şelaleler, bulutlar,
 * uzaktaki kaleler) CSS'le üretilebilecek bir şey değil; çizim işi.
 * Yerine yumuşak bir gökyüzü degradesi kondu — uydurma bir doku
 * koymaktansa sade bir gök dürüst.
 */

/** Referanstan okunan renkler. Tahmin yok — hepsi piksel ölçümü. */
export const SNAKE_RENK = {
  cimenAcik: "#88B64F",
  cimenKoyu: "#7BAA48",
  tasIsik: "#B6BCC4",
  tasOrta: "#8C97A3",
  tasGolge: "#5E6F7D",
  tasNeon: "#5FD8FF",
  gokUst: "#8FC7F2",
  gokAlt: "#BFE2F7",
  govde: "30 81 250",
  bas: "36 77 253",
  parlama: "#69FCFD",
  govdeGolge: "#182344",
  elma: "#FE4D3A",
  elmaKoyu: "#C62B1C",
  yaprak: "#3FA13A",
  hap: "#243E66",
  hapKenar: "#5FD8FF",
  tac: "#FDDF3A",
} as const;

/**
 * Gövde halkasının hücreye oranı.
 *
 * ⚠️ 1'in ÜSTÜNDE ve bu kasıtlı. Referanstaki solucan düz bir boru
 * değil, **birbirine geçmiş şişkin halkalar** zinciri.
 *
 * 🔴 İlk deneme 1,06'ydı ve 375×812'de ölçüldü: 21,7 piksellik hücrede
 * halkalar 23 piksel çapında oluyor, yani komşusuyla yalnızca 1,3
 * piksel örtüşüyordu — ekranda **boncuk dizisi** gibi, kopuk. 1,34'te
 * çap 29 piksel ve örtüşme 7,6 piksel (çapın ~%26'sı): halkalar
 * birleşiyor ama aradaki girinti duruyor.
 *
 * ⚠️ Daha yükseği (1,5+) girintiyi kapatıp gövdeyi düz bir boruya
 * çeviriyor — o Google referansının dili, bunun değil.
 */
const HALKA_ORANI = 1.34;

/** Gökyüzü — referansın arka planının dürüst karşılığı. */
export function yilanSahnesi(): CSSProperties {
  return {
    background: [
      "radial-gradient(ellipse 70% 40% at 78% 12%, rgba(255,255,255,.55) 0%, transparent 60%)",
      `linear-gradient(180deg, ${SNAKE_RENK.gokUst} 0%, ${SNAKE_RENK.gokAlt} 62%, #D8EEF9 100%)`,
    ].join(", "),
  };
}

/**
 * Arenayı çeviren taş duvar.
 *
 * Referansta alan çıplak değil; etrafında ışıklı bir taş duvar var ve
 * oyun alanını o duvar tanımlıyor. Üç katman: üstten gelen ışık, iç
 * kenarda koyu bir çizgi (duvarın kalınlığı) ve dışta yumuşak bir
 * zemin gölgesi.
 *
 * ⚠️ Neon şeritler buraya konmuyor, `yilanDuvarNeonu` ile ayrı ayrı
 * yerleştiriliyor: `box-shadow` kenarın tamamını boyar, referansta ise
 * şeritler kenarın ortasında **parça parça**.
 */
export function yilanDuvari(): CSSProperties {
  return {
    padding: 13,
    borderRadius: 22,
    background: `linear-gradient(180deg, ${SNAKE_RENK.tasIsik} 0%, ${SNAKE_RENK.tasOrta} 46%, ${SNAKE_RENK.tasGolge} 100%)`,
    boxShadow: [
      "inset 0 2px 0 rgba(255,255,255,.55)",
      "inset 0 -2px 0 rgba(20,34,48,.45)",
      "0 10px 26px -10px rgba(20,44,70,.55)",
    ].join(", "),
  };
}

/** Duvardaki ışıklı şerit — kenarların ortasına yerleşiyor. */
export function yilanDuvarNeonu(yatay: boolean): CSSProperties {
  return {
    position: "absolute",
    background: SNAKE_RENK.tasNeon,
    borderRadius: 9999,
    boxShadow: `0 0 8px ${SNAKE_RENK.tasNeon}, 0 0 16px ${SNAKE_RENK.tasNeon}88`,
    ...(yatay
      ? { height: 5, width: 54, left: "50%", transform: "translateX(-50%)" }
      : { width: 5, height: 54, top: "50%", transform: "translateY(-50%)" }),
  };
}

/**
 * Çimen — dama desenli.
 *
 * 🔴 Hücreler **DOM ögesi değil**: 15×15 = 225 `<span>` aynı görüntü
 * için 225 düğüm demekti. Tek bir `repeating-conic-gradient` yetiyor;
 * yılan, elma ve ödül zaten üstte ayrı katmanlarda.
 *
 * ⚠️ Dama karesi **tek hücre** — referansta ölçüldü.
 */
export function yilanTahtasi(): CSSProperties {
  const adim = 100 / 15;
  return {
    borderRadius: 10,
    background: `repeating-conic-gradient(${SNAKE_RENK.cimenKoyu} 0% 25%, ${SNAKE_RENK.cimenAcik} 0% 50%)`,
    backgroundSize: `${adim * 2}% ${adim * 2}%`,
    boxShadow: "inset 0 0 0 1px rgba(40,70,24,.22), inset 0 3px 10px rgba(30,56,18,.28)",
  };
}

/**
 * Bir gövde halkasının **taşıyıcısı** — tam bir hücre boyunda.
 *
 * ── 🔴 Neden `left/top` değil `transform` — Ü216 ────────────
 *
 * Ürün sahibi: *"daha akıcı ilerlemeli, çok takılarak ilerliyor."*
 * Haklıydı ve sebep kare hızı değildi: yılan hücreden hücreye
 * **ışınlanıyordu.** Adım aralığı başta 11 tick, yani 550 ms —
 * saniyede iki kez yer değiştiren bir şey tanım gereği takılır.
 *
 * Çözüm ara değerleme: motor ayrık kalıyor (replay bozulmasın), ekran
 * iki hücre arasını kaydırarak dolduruyor. Bunu **CSS geçişi**
 * yapıyor, React değil — React saniyede iki kez render ediyor,
 * tarayıcı aradaki 30 kareyi kendi çiziyor. Ü214'te kazanılan render
 * tasarrufu böylece korunuyor.
 *
 * ⚠️ `left/top` yerine `transform`: ikisi de animasyonlanabiliyor ama
 * `left/top` her karede **düzen** hesabı tetikliyor (160 ögeyi yeniden
 * yerleştirmek), `transform` yalnızca bileşikleştirme katmanında
 * çalışıyor. Akıcılığı isteyip düzeni her karede yeniden hesaplamak
 * kendi kendini yer.
 *
 * ⚠️ Taşıyıcı **tam hücre** boyunda, şişkin halka içeride: `translate`
 * yüzdesi ögenin kendi boyuna göre, yani 1,34 hücrelik bir kutuda
 * `translate(100%)` bir hücre etmezdi.
 */
export function yilanHalkaTasiyicisi(
  satir: number,
  sutun: number,
  gecisMs: number,
): CSSProperties {
  const adim = 100 / 15;
  return {
    position: "absolute",
    left: 0,
    top: 0,
    width: `${adim}%`,
    height: `${adim}%`,
    transform: `translate(${sutun * 100}%, ${satir * 100}%)`,
    transition: gecisMs > 0 ? `transform ${gecisMs}ms linear` : undefined,
    willChange: "transform",
  };
}

/** Halkanın kendisi — taşıyıcıdan taşan şişkin yuvarlak. */
export function yilanHalkaKutusu(): CSSProperties {
  const tasma = `${((HALKA_ORANI - 1) / 2) * 100}%`;
  return {
    position: "absolute",
    inset: `-${tasma}`,
    borderRadius: "46%",
  };
}

/**
 * Halkanın rengi — referanstaki parlak mavi.
 *
 * Üç durak: üstte camgöbeği parlama (`#69FCFD`), gövdede canlı mavi,
 * altta koyu gölge. Referansta solucan ışıyor, o yüzden dışa da bir
 * parıltı var.
 *
 * ⚠️ Baş **rengiyle** ayrılıyor, boyuyla değil: farklı boy verseydi
 * komşusuyla örtüşmesini kaybeder ve boyundan kopmuş gibi dururdu.
 */
export function yilanHalkaRengi(basMi: boolean): CSSProperties {
  return {
    background: [
      `radial-gradient(circle at 34% 24%, ${SNAKE_RENK.parlama} 0%, rgba(105,252,253,.35) 24%, transparent 52%)`,
      `linear-gradient(165deg, rgb(${SNAKE_RENK.bas}) 0%, rgb(${SNAKE_RENK.govde}) 52%, ${SNAKE_RENK.govdeGolge} 100%)`,
    ].join(", "),
    boxShadow: basMi
      ? `inset 0 1.5px 0 rgba(255,255,255,.7), 0 0 12px ${SNAKE_RENK.parlama}bb`
      : `inset 0 1px 0 rgba(255,255,255,.45), 0 0 8px ${SNAKE_RENK.parlama}66`,
  };
}

/**
 * Yılanın çimene düşürdüğü gölge.
 *
 * 🔴 Katmanın **tamamına** uygulanıyor, halka başına değil. Halka
 * başına verilseydi gölge örtüşen yerlerde de görünür ve zincir kirli
 * dururdu.
 *
 * ⚠️ Kaydırma **piksel**, yüzde DEĞİL. Ü213'te `0 4% 0` yazılmıştı ve
 * hiç gölge çıkmadı: `drop-shadow()` yüzde kabul etmiyor, geçersiz
 * değer filtrenin tamamını sessizce düşürüyor.
 */
export function yilanGolgesi(): CSSProperties {
  return { filter: "drop-shadow(0 3px 2px rgba(30,56,18,.45))" };
}

/** Elma — referansın kırmızısı, ışıyan. */
export function yilanElmasi(): CSSProperties {
  return {
    background: `radial-gradient(circle at 34% 28%, #FF9A7A 0%, ${SNAKE_RENK.elma} 46%, ${SNAKE_RENK.elmaKoyu} 100%)`,
    borderRadius: "9999px",
    boxShadow: `0 0 10px ${SNAKE_RENK.elma}aa, 0 2px 3px rgba(30,56,18,.4)`,
  };
}

/**
 * Ödül kuponu — altın (Ü91).
 *
 * ⚠️ Referansta ödül YOK; bu bizim mekaniğimiz. Rengi paletin dışında
 * ve öyle kalmalı: ödül ürünün her yerinde altın (`--color-odul`).
 *
 * ⚠️ Çevresi koyu, beyaz değil: açık yeşil çimenin üstünde beyaz halka
 * altını solgun bir noktaya çeviriyordu (Ü213'te ölçüldü).
 */
export function yilanOdulu(kacisi: boolean): CSSProperties {
  return {
    background: "radial-gradient(circle at 34% 28%, #FFF6D0 0%, #FFD75E 45%, #C79412 100%)",
    borderRadius: "9999px",
    boxShadow: kacisi
      ? "0 2px 3px rgba(30,56,18,.4)"
      : "0 0 0 2.5px rgba(40,70,24,.55), 0 0 14px rgba(255,215,94,.9)",
  };
}

/**
 * HUD hapı — referansın koyu, neon çerçeveli yuvarlak kutusu.
 *
 * ⚠️ Kesik köşe YOK. Düşen'in `dusenPanel`i köşeleri pahlı fütüristik
 * bir panel; buradakiler tamamen yuvarlak haplar. İki oyun, iki dil.
 */
export function yilanHapi(): CSSProperties {
  return {
    borderRadius: 9999,
    background: `linear-gradient(180deg, #2E4E7C 0%, ${SNAKE_RENK.hap} 100%)`,
    boxShadow: [
      `inset 0 0 0 2px ${SNAKE_RENK.hapKenar}88`,
      "inset 0 1px 0 rgba(255,255,255,.22)",
      "0 3px 10px -3px rgba(16,40,66,.6)",
    ].join(", "),
  };
}
