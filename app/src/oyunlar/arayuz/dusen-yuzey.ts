import type { CSSProperties } from "react";

/**
 * Düşen'in yüzeyi — Ü209.
 *
 * ── Kaynak: ürün sahibinin iki referansı ────────────────────
 *
 * *"Tetris daha çok burdaki görsele benzesin: daha camsı ve parlak,
 * daha canlı renkteki parçalar/küpler, daha fütüristik bir scoreboard
 * ve next parçaların gösterimi."*
 *
 * İki kaynak var ve ikisi ayrı şey veriyor:
 *
 *   · **`tetris.png`** — tanıtım render'ı. Camsı küpler, neon çerçeve,
 *     uzay sahnesi, köşeli HUD panelleri. **Hedef görünüm bu.**
 *   · **`tetris.mp4`** — gerçek oyun kaydı. Görünüm daha düz ama iki
 *     mekanik ayrıntı veriyor: **hayalet parça** (nereye düşeceğini
 *     gösteren soluk gölge) ve zeminde **dama deseni**. İkisi de
 *     görselde de var ve ikisi de oynanışa yarıyor.
 *
 * ── Neden `tahta.tsx`ten ayrı ───────────────────────────────
 *
 * Blok Ü202'de kendi yüzeyine geçti ve gerekçe aynıydı: ortak dosyayı
 * değiştirmek diğer oyunları da sormadan değiştirmek olurdu. Düşen de
 * kendi dosyasına geçiyor; `tahta.tsx` artık yalnızca Yılan'ın.
 *
 * ── 🔴 Renk motorun durumunda DEĞİL ─────────────────────────
 *
 * Ü202'nin kuralı burada da geçerli: renk skora dokunmuyor, dolayısıyla
 * replay sözleşmesinde işi yok. Ekran kendi renk ızgarasını tutuyor.
 *
 * Düşen'de bunun bir bedeli var ve motorda karşılandı: satır silinince
 * üstündeki her şey bir satır kayıyor, yani renk ızgarası da kaymalı.
 * O kaymayı ekranda yeniden yazmak `kilitle`nin ikizini üretirdi —
 * motor bu yüzden `uygulaVeKilitler` ile hangi satırların silindiğini
 * **kendisi** söylüyor.
 */

/**
 * Bir küpün rengi.
 *
 * ⚠️ Kanallar `"34 211 238"` biçiminde ayrı ayrı duruyor, `#22D3EE`
 * diye değil. Sebep Ü210: küpler **saydam** ve saydamlık `rgb()`
 * değerine çalışma zamanında alfa eklemeyi gerektiriyor
 * (`rgb(34 211 238 / .55)`). Onaltılıya alfa eklemek dizgi
 * birleştirmekle olur (`#22D3EE8c`) ve okunmaz; ayrıca aynı rengin
 * altı farklı alfası altı ayrı sabit demek olurdu.
 */
export type KupRengi = {
  ad: string;
  /** Üst yüz — ışığın vurduğu yer. */
  ust: string;
  /** Gövde. */
  orta: string;
  /** Alt yüz — gölgede. */
  alt: string;
  /** Dışa taşan parıltı — opak, cam değil. */
  isik: string;
};

/** `rgb(r g b / a)` — saydam katmanları kurmanın tek yolu. */
function saydam(kanal: string, alfa: number): string {
  return `rgb(${kanal} / ${alfa})`;
}

/**
 * Yedi küp rengi — parça türü kadar.
 *
 * ⚠️ Blok'un altı rengiyle **aynı olmamaları** kasıtlı. İki oyun yan
 * yana duruyor ve aynı paleti paylaşsalardı ekran görüntüsünden hangi
 * oyun olduğu anlaşılmazdı. Burada tonlar daha soğuk ve daha doygun:
 * sahne uzay, referansın dili neon.
 *
 * ⚠️ Yedi renk, on iki parça var (Ü22'nin karışık seti). Parça türü
 * yedi ile modlanıyor; iki farklı biçim aynı rengi alabiliyor ve bu
 * sorun değil — oyuncu biçimi zaten görüyor, renk ayırt etmek için
 * değil **canlandırmak** için.
 */
export const KUP_RENKLERI: readonly KupRengi[] = [
  { ad: "camgöbeği", ust: "179 246 255", orta: "34 211 238", alt: "10 122 153", isik: "#5EE9FF" },
  { ad: "menekşe", ust: "217 196 255", orta: "168 85 247", alt: "91 33 182", isik: "#C084FC" },
  { ad: "limon", ust: "255 240 168", orta: "250 204 21", alt: "161 98 7", isik: "#FDE047" },
  { ad: "mercan", ust: "255 192 176", orta: "251 94 60", alt: "163 42 18", isik: "#FF8A6B" },
  { ad: "fuşya", ust: "255 194 228", orta: "236 72 153", alt: "157 23 77", isik: "#FB7BC0" },
  { ad: "gök", ust: "185 220 255", orta: "59 130 246", alt: "30 63 168", isik: "#7AB6FF" },
  { ad: "zümrüt", ust: "180 247 208", orta: "34 197 94", alt: "17 102 58", isik: "#5FE99C" },
];

/** Parçanın rengi — biçiminden türüyor, klasik Tetris'teki gibi. */
export function kupRengi(parca: number): number {
  return parca % KUP_RENKLERI.length;
}

/**
 * Sahne — uzay.
 *
 * Referanstaki derinlik tek bir düz renkten çıkmıyor: üstte mavi bir
 * aydınlık, ortada mor bir bulut, altta neredeyse siyah. Üç durak
 * üst üste bindirilmiş radyal katman.
 */
export function dusenSahnesi(): CSSProperties {
  return {
    background: [
      "radial-gradient(ellipse 90% 45% at 78% 22%, rgba(124,58,237,.38) 0%, transparent 62%)",
      "radial-gradient(ellipse 80% 40% at 18% 66%, rgba(14,165,233,.22) 0%, transparent 60%)",
      "radial-gradient(ellipse 130% 85% at 50% 6%, #1C2A6E 0%, #101744 40%, #05060F 100%)",
    ].join(", "),
  };
}

/**
 * Tahtanın neon çerçevesi.
 *
 * ⚠️ Çerçeve `border` DEĞİL, iki katmanlı bir kutu gölgesi + degrade
 * zemin. Sebep: referanstaki kenar tek renk değil, camgöbeğinden
 * fuşyaya dönüyor. `border-image` degrade alıyor ama köşe yarıçapıyla
 * birlikte çalışmıyor (yarıçap yok sayılıyor); degrade zeminli bir
 * sarmalayıcının içine koyu bir kutu koymak ikisini birden veriyor.
 */
export function dusenCerceve(): CSSProperties {
  return {
    /*
      ⚠️ 3 piksel, 2 değil. İlk deneme 2 pikseldi ve 375×812'de
      ölçüldü: tahta ekranın neredeyse tamamını kapladığı için dışa
      taşan parıltının yarısı ekranın dışında kalıyor, geriye ince ve
      sönük bir çizgi kalıyordu. Referansın en belirgin şeyi o çerçeve.
    */
    padding: 3,
    borderRadius: 18,
    background: "linear-gradient(150deg, #7DF2FF 0%, #8AA5FF 36%, #D09CFF 68%, #FF9AD0 100%)",
    boxShadow: [
      // İçe doğru bir parıltı da var: dışarıdaki ekranın dışına
      // taşabiliyor ama içerideki her zaman görünüyor.
      "inset 0 0 10px rgba(255,255,255,.55)",
      "0 0 14px rgba(125,242,255,.85)",
      "0 0 34px rgba(168,85,247,.55)",
      "0 0 70px rgba(94,233,255,.25)",
      "0 18px 40px -18px rgba(0,0,0,.9)",
    ].join(", "),
  };
}

/**
 * Tahtanın içi — koyu, ince ızgaralı, dama desenli.
 *
 * Dama deseni referans videodan: hücreler boşken bile tahta **ızgara**
 * gibi okunuyor, düz bir levha gibi değil. Ü166'nın dersi de buydu —
 * o zaman ölçülen boş hücre/zemin kontrastı 1,13 : 1'di ve tahta
 * görünmüyordu.
 *
 * ⚠️ Desen `background-size` ile hücre adımına bağlanıyor; ekran
 * genişliğine göre hücre boyu değiştiği için oran olarak veriliyor
 * (10 sütun → %20 bir dama karesi, yani iki hücre).
 */
export function dusenTahtasi(): CSSProperties {
  return {
    borderRadius: 16,
    background: [
      /* Dama: iki hücrede bir hafif açılma.
         ⚠️ 0,028'de ölçüldü ve ekranda GÖRÜNMÜYORDU — yazılmış ama
         işe yaramayan bir katmandı. 0,055 görünür eşiğin hemen
         üstünde: tahta düz bir levha değil, bir zemin gibi okunuyor. */
      "repeating-conic-gradient(rgba(148,197,255,.055) 0% 25%, transparent 0% 50%)",
      "linear-gradient(180deg, #0B1338 0%, #070C26 100%)",
    ].join(", "),
    backgroundSize: "20% 12.5%, auto",
    boxShadow: "inset 0 2px 14px rgba(0,0,0,.75), inset 0 0 0 1px rgba(148,197,255,.13)",
  };
}

/** Boş hücre — neredeyse görünmez bir çerçeve; ızgarayı o taşıyor. */
export function dusenBosHucre(): CSSProperties {
  return {
    background: "rgba(122,170,255,.045)",
    boxShadow: "inset 0 0 0 1px rgba(148,197,255,.07)",
  };
}

/**
 * Yerleşmiş küp — cam (Ü210).
 *
 * ── 🔴 Ü209'da yanlış yapıldı ───────────────────────────────
 *
 * Ürün sahibi *"camsı"* dedi, ben **opak şeker** yaptım: degrade gövde,
 * parlama, pah — hepsi vardı ama küpün ardı görünmüyordu. Parlak bir
 * plastik, cam değil. *"Bloklarımız daha şeffaf cam gibi olmalı,
 * unutma bunu yanlış yapmışsın."*
 *
 * ── 🔴 Düz saydamlık da yanlış — ÖLÇÜLDÜ ────────────────────
 *
 * İlk düzeltme gövdeyi düz %56 alfaya aldı ve renkler **soldu.**
 * Tahta neredeyse siyah (`#0B1338`) olduğu için saydamlık doğrudan
 * parlaklık yiyor. 375×812'de bileşik renk ölçüldü:
 *
 *              camgöbeği parlaklık   doygunluk
 *   opak            175                0,86
 *   düz %56         107  (−%39)        0,85
 *   açık ton %72    151                0,62  (−%28)
 *
 * Yani alfa **doygunluğu koruyup parlaklığı**, açık ton **parlaklığı
 * koruyup doygunluğu** öldürüyor. İkisi de ürün sahibinin diğer
 * isteğine — *"daha canlı renkteki küpler"* — aykırı.
 *
 * ── Çözüm: alfa DÜZ DEĞİL, merkezden kenara ─────────────────
 *
 * Üç aday yan yana çizilip bakıldı. Kazanan: merkezde neredeyse opak
 * (%92), kenara doğru saydam (%42). Böylece
 *
 *   · **renk merkezde** duruyor — canlılık kaybolmuyor,
 *   · **kenar saydam** — arkadaki ızgara küpün kenarından okunuyor ve
 *     göz onu cam olarak görüyor,
 *   · parlak iç kenar çizgisi cam levhanın kalınlığını veriyor.
 *
 * Camı cam yapan şey gövdenin tamamının soluk olması değil, **ardının
 * görünmesi ve kenarının ışığı kırması.**
 *
 * ⚠️ `backdrop-filter: blur()` denenmedi ve denenmeyecek: 160 hücrenin
 * her biri için arka planı bulanıklaştırmak telefonda her karede
 * yeniden hesaplanır.
 *
 * ⚠️ Parlama ayrı bir DOM ögesi DEĞİL, zeminin katmanı. 160 hücreye
 * çocuk eklemek 320 düğüm demekti.
 */
export function dusenDoluHucre(renk: KupRengi): CSSProperties {
  return {
    background: [
      // 1 · ışık yansıması
      "radial-gradient(circle at 30% 24%, rgba(255,255,255,.58) 0%, rgba(255,255,255,.12) 28%, transparent 56%)",
      // 2 · gövde: merkezde yoğun, kenarda saydam
      `radial-gradient(ellipse 88% 88% at 50% 52%, ${saydam(renk.orta, 0.92)} 0%, ${saydam(renk.orta, 0.8)} 48%, ${saydam(renk.alt, 0.42)} 100%)`,
      // 3 · üstten gelen açık ton — hacim
      `linear-gradient(168deg, ${saydam(renk.ust, 0.38)} 0%, transparent 60%)`,
    ].join(", "),
    boxShadow: [
      "inset 0 1.5px 0 rgba(255,255,255,.75)",
      "inset 0 0 0 1.5px rgba(255,255,255,.38)",
      `inset 0 -3px 5px ${saydam(renk.alt, 0.5)}`,
      `0 0 9px ${renk.isik}66`,
    ].join(", "),
  };
}

/**
 * İnen parça — aynı cam, daha güçlü parıltı.
 *
 * 🔴 Ayrılması ŞART. Her parçanın kendi rengi var, dolayısıyla
 * "elimdeki hangisi" sorusunu renk cevaplayamıyor. Cevabı **dışa taşan
 * parıltı** veriyor; yerleşmiş küpler ışımıyor.
 *
 * ⚠️ Gövde yerleşmişle aynı bırakıldı. Daha opak yapmak denenebilirdi
 * ama o zaman inen parça camdan çıkar, tahtadaki tek plastik nesne
 * olurdu — ayrım parıltıyla yapılınca cam dili bozulmuyor.
 */
export function dusenAktifHucre(renk: KupRengi): CSSProperties {
  return {
    ...dusenDoluHucre(renk),
    boxShadow: [
      "inset 0 1.5px 0 rgba(255,255,255,.9)",
      "inset 0 0 0 1.5px rgba(255,255,255,.55)",
      `inset 0 -3px 5px ${saydam(renk.alt, 0.5)}`,
      `0 0 10px ${renk.isik}`,
      `0 0 24px ${renk.isik}90`,
    ].join(", "),
  };
}

/**
 * Hayalet — parçanın düşeceği yer.
 *
 * Referans videoda tahtanın dibinde soluk, çerçeveli kareler duruyor ve
 * işi oynanışa dokunuyor: hızlanan bir oyunda "bu sütun hangisiydi"
 * sorusu en çok hata yaptıran şey.
 *
 * ⚠️ İçi DOLU değil. Dolu olsaydı gerçek parçayla karışırdı ve tahta
 * iki kez dolu görünürdü.
 */
export function dusenHayaletHucre(renk: KupRengi): CSSProperties {
  /*
    ⚠️ İlk deneme (`${renk.isik}12` + %40 çerçeve) 375×812'de ölçüldü
    ve hayalet **koyu bir delik** gibi okunuyordu: koyu tahtanın
    üstünde soluk bir çerçeve, "buraya düşecek" demiyor, "burada bir
    boşluk var" diyor. Çizgi kalınlaştı ve parladı.
  */
  return {
    background: `${renk.isik}1f`,
    boxShadow: `inset 0 0 0 2px ${renk.isik}b0, 0 0 8px ${renk.isik}40`,
  };
}

/**
 * Fütüristik HUD paneli — köşeleri kesik.
 *
 * Referanstaki paneller dikdörtgen değil; sağ üst ve sol alt köşeleri
 * pahlı. `clip-path` bunu tek satırda veriyor.
 *
 * ⚠️ `clip-path` dış gölgeyi de kesiyor, yani panelin dışına parıltı
 * konamıyor. Parıltı bu yüzden **içeride** (`inset`) ve kenar çizgisi
 * de öyle — dışarıdan gelen bir `box-shadow` görünmezdi.
 */
export function dusenPanel(vurgu = "#5EE9FF"): CSSProperties {
  return {
    clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
    background: "linear-gradient(160deg, rgba(16,26,66,.92) 0%, rgba(8,13,38,.92) 100%)",
    boxShadow: `inset 0 0 0 1.5px ${vurgu}66, inset 0 0 14px ${vurgu}22`,
  };
}

/**
 * Aynı anda silinen satır sayısının adı.
 *
 * ⚠️ Blok'un `KOMBOLAR`ından ayrı bir liste ve olması gereken de bu:
 * orada ölçü **temizlenen çizgi sayısı**, burada **aynı anda silinen
 * satır**. Dördü birden silmek Düşen'in en zor şeyi; referanstaki
 * *"PERFECT!"* tam olarak onun karşılığı.
 */
export const SATIR_ADLARI: readonly { esik: number; ad: string; renk: string }[] = [
  { esik: 4, ad: "MÜKEMMEL!", renk: "#FB7BC0" },
  { esik: 3, ad: "ÜÇLÜ!", renk: "#C084FC" },
  { esik: 2, ad: "İKİLİ!", renk: "#5EE9FF" },
];

export function satirAdi(silinen: number): (typeof SATIR_ADLARI)[number] | null {
  return SATIR_ADLARI.find((s) => silinen >= s.esik) ?? null;
}
