import type { CSSProperties } from "react";

/**
 * Bıçak'ın yüzeyi — Ü235.
 *
 * ── Hangi dil ───────────────────────────────────────────────
 *
 * Koyu arcade ailesi: Blok, Düşen, Sekme. Referans (Knife Hit) da
 * koyu zeminde duruyor ve tek parlak nesne kütük. Yılan'ın parlak
 * çimen dili buraya gelmiyor — o ayrık kalmaya devam ediyor (Ü215).
 *
 * ── 🔴 Kimlik rengi kütükte DEĞİL, bıçakta ──────────────────
 *
 * Oyunun kimlik rengi nane (Ü235, `oyuncu-renk.ts`) ama kütük
 * kahverengi: kütük **ahşap** ve nane bir ahşaba boyandığında ne
 * kütük kalıyor ne nane. Renk bıçağın çeliğine kondu — oyunun adı
 * zaten o ve ekranda gözün takıldığı şey bıçakların parıltısı.
 *
 * Aynı karar Sekme'de tersine verilmişti: orada kimlik rengi
 * blokların kendisindeydi çünkü bloklar soyut. Burada nesne gerçek.
 */

export const BICAK_RENK = {
  /** Kimlik — nane. `RENK.nane.canli` ile aynı değer. */
  ana: "#5EEAD4",
  koyu: "#0F766E",
  /** Çeliğin gövdesi. */
  celik: "#E2E8F0",
  celikKoyu: "#64748B",
  /** Sapın ahşabı — kütükten koyu ki üstünde kaybolmasın. */
  sap: "#2B1D14",
  elma: "#EF4444",
  yaprak: "#4ADE80",
} as const;

/**
 * Sahne — aileyle aynı derinlik, naneye kayan bulut.
 *
 * ⚠️ Yeşil bulut **üstte ve solda**: kütük ortada duruyor ve parlak
 * leke onun arkasına denk gelirse kütüğün kenarı eriyor. Sekme'de
 * bulut sağ üstte çünkü orada tahta ekranı dolduruyor, kaçacak yer
 * yok; burada var.
 */
export function bicakSahnesi(): CSSProperties {
  return {
    background: [
      "radial-gradient(ellipse 80% 38% at 22% 12%, rgba(94,234,212,.26) 0%, transparent 62%)",
      "radial-gradient(ellipse 70% 34% at 84% 78%, rgba(15,118,110,.30) 0%, transparent 60%)",
      "radial-gradient(ellipse 130% 85% at 50% 4%, #0D3B38 0%, #0A2220 44%, #05090F 100%)",
    ].join(", "),
  };
}

/**
 * Kütük temaları — bölüme göre değişiyor (Ü236).
 *
 * ── 🔴 Neden gerekliydi ─────────────────────────────────────
 *
 * Ürün sahibi: *"ileri bölümlerde tahta, bıçak türü değişmeli."*
 * İlk sürümde 7 bölümün yedisi de aynı meşe kütüktü ve oyuncunun
 * ilerlediğini söyleyen tek şey HUD'daki sayıydı — okunması
 * gereken bir bilgi. Malzeme değişince ilerleme **görülüyor**.
 *
 * ⚠️ Tema tamamen **sunum**: motor bölümü biliyor, malzemeyi
 * bilmiyor. Renk bir kuralı değiştirseydi (örneğin buz kütükte
 * bıçak kayacak olsaydı) sunucunun yeniden oynatmasıyla ayrışırdı.
 *
 * ⚠️ Altın YOK. Ödül ürünün her yerinde altın (Ü203 · Ü207) ve
 * altın bir kütük, üstündeki altın paketi yutardı.
 *
 * ⚠️ Dört kütük, üç bıçak: bölüm döngüsü 12 oluyor ve aynı ikili
 * ancak on iki bölümde bir tekrarlıyor. Eşit uzunlukta olsalardı
 * kütük ile bıçak hep birlikte değişir, tek bir tema gibi
 * okunurdu.
 */
type KutukTemasi = {
  ad: string;
  /** Gövde degradesinin üç durağı — merkezden kenara. */
  govde: [string, string, string];
  /** Yıl halkalarının rengi. */
  halka: string;
  /** Damar ve iç kenar çizgisi. */
  damar: string;
  /** Göbeğin iki durağı. */
  gobek: [string, string];
};

const KUTUKLER: readonly KutukTemasi[] = [
  {
    ad: "meşe",
    govde: ["#8A5527", "#63391A", "#3B2110"],
    halka: "255,214,160",
    damar: "255,214,160",
    gobek: ["#6B3E1D", "#341C0D"],
  },
  {
    ad: "ceviz",
    govde: ["#6E3B2E", "#4A2319", "#2A120C"],
    halka: "255,186,150",
    damar: "255,186,150",
    gobek: ["#57291F", "#25100A"],
  },
  {
    /*
      Buz — tek soğuk malzeme. Sahne nane olduğu için akraba
      duruyor ama halkalar mavi, ahşapla karışmıyor.

      🔴 İlk tonları açıktı (#7FC7DE merkez) ve ekranda sınandı:
      7. bölümde bu kütük **çelik** bıçakla eşleşiyor (4'lük ve
      3'lük döngülerin kesişimi) — açık mavi kütükte açık gri
      bıçak. Tam da duvarın geldiği, çemberin en kalabalık olduğu
      bölüm; okunmayan bir bıçak orada turu haksız yere bitirir.
      Gövde koyultuldu, halkalar açık kaldı.
    */
    ad: "buz",
    govde: ["#5FA8C4", "#2F6A85", "#123243"],
    halka: "226,248,255",
    damar: "226,248,255",
    gobek: ["#3D7B94", "#102C3B"],
  },
  {
    /* Obsidiyen — en zor bölümlerin malzemesi. Koyu zeminde
       kaybolmasın diye kenarı belirgin. */
    ad: "obsidiyen",
    govde: ["#3C3548", "#241F2E", "#100D16"],
    halka: "190,175,220",
    damar: "190,175,220",
    gobek: ["#302A3C", "#0C0A11"],
  },
];

export function kutukTemasi(tur: number): KutukTemasi {
  return KUTUKLER[(tur - 1) % KUTUKLER.length];
}

/**
 * Kütük — disk, yıl halkalı.
 *
 * ── Katmanlar ───────────────────────────────────────────────
 *
 * 1. Sol üstten ışık — diskin yuvarlaklığını veren tek şey.
 * 2. Yıl halkaları (`repeating-radial-gradient`) — malzemeyi
 *    söyleyen doku.
 * 3. Gövde: merkezde açık, kenarda koyu.
 *
 * 🔴 Halkalar **düzenli aralıklı değil** görünmeli ama
 * `repeating-radial-gradient` düzenli: ikinci bir halka katmanı
 * farklı periyotla üstüne biniyor ve ikisi birbirini bozuyor.
 * Tek periyotla denendi ve ekranda **nişan tahtası** çıktı —
 * oyuncu ortayı hedef sandı, oysa oyunda merkeze vurmak diye bir
 * şey yok.
 *
 * ⚠️ Dönüşü **görünür** kılmak zorunda: tek renk bir disk dönerken
 * duruyor gibi görünür ve oyunun tek bilgisi kütüğün hızı.
 * Halkalar tek başına yetmiyor (merkeze simetrikler, dönerken
 * kıpırdamıyorlar) — dönüşü asıl gösteren şey saplı bıçaklar ve
 * `bicakDamari`.
 */
export function bicakKutugu(tur: number): CSSProperties {
  const t = kutukTemasi(tur);
  return {
    borderRadius: "9999px",
    background: [
      `radial-gradient(circle at 34% 26%, rgba(${t.halka},.22) 0%, transparent 46%)`,
      "repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,.20) 0 5px, transparent 5px 13px)",
      `repeating-radial-gradient(circle at 50% 50%, rgba(${t.halka},.07) 0 3px, transparent 3px 19px)`,
      `radial-gradient(circle at 50% 50%, ${t.govde[0]} 0%, ${t.govde[1]} 56%, ${t.govde[2]} 100%)`,
    ].join(", "),
    boxShadow: [
      `inset 0 0 0 3px rgba(${t.halka},.16)`,
      "inset 0 -14px 26px rgba(0,0,0,.55)",
      "0 0 26px rgba(94,234,212,.20)",
      "0 22px 48px -18px rgba(0,0,0,.9)",
    ].join(", "),
  };
}

/**
 * Kütüğün göbeği — merkezdeki koyu halka.
 *
 * ⚠️ İşi süs değil: dönüşün merkezi burası ve oyuncunun bıçakların
 * hangi noktanın etrafında döndüğünü görmesi gerekiyor. Göbeksiz
 * denendi, bıçaklar havada dönüyormuş gibi durdu.
 */
export function bicakGobegi(tur: number): CSSProperties {
  const t = kutukTemasi(tur);
  return {
    borderRadius: "9999px",
    background: `radial-gradient(circle at 40% 32%, ${t.gobek[0]} 0%, ${t.gobek[1]} 70%, #0C0A11 100%)`,
    boxShadow: `inset 0 2px 6px rgba(0,0,0,.7), 0 0 0 2px rgba(${t.halka},.12)`,
  };
}

/**
 * Kütükteki tek bir damar — dönüşü görünür kılan işaret.
 *
 * Merkezden kenara giden ince bir çizgi. Halkalar dönüşte
 * kıpırdamıyor (merkeze simetrikler), damar kıpırdıyor.
 *
 * ⚠️ Bir tane, üç tane değil: birkaç damar çizildiğinde disk
 * **pizza dilimi** gibi bölündü ve oyuncu dilimleri hedef sandı.
 */
export function bicakDamari(tur: number): CSSProperties {
  const t = kutukTemasi(tur);
  return {
    background: `linear-gradient(180deg, rgba(${t.damar},.24) 0%, rgba(${t.damar},.05) 70%, transparent 100%)`,
    borderRadius: "9999px",
  };
}

/**
 * Bıçak temaları — bölüme göre değişiyor (Ü236).
 *
 * ⚠️ Üç tane ve altın yok; gerekçesi `KUTUKLER`in başında.
 *
 * ⚠️ Hepsinde ağzın ortasında **beyaz bir parıltı durağı** var:
 * bıçağı bıçak yapan şey o keskin yansıma. Bakırda ve gecede
 * kaldırılıp denendi, ikisi de düz bir çubuğa dönüştü.
 */
type BicakTemasi = {
  ad: string;
  /** Ağzın kenar ve orta tonu. */
  agiz: [string, string];
  /** Balçağın üç durağı. */
  balcak: [string, string, string];
  /** Sapın üç durağı. */
  sap: [string, string, string];
  /** Parıltının rengi. */
  isik: string;
};

const BICAKLAR: readonly BicakTemasi[] = [
  {
    ad: "çelik",
    agiz: ["#64748B", "#E2E8F0"],
    balcak: ["#8A6A2E", "#E8CE86", "#8A6A2E"],
    sap: ["#180F09", "#2B1D14", "#4A3122"],
    isik: "94,234,212",
  },
  {
    ad: "bakır",
    agiz: ["#7C3E22", "#E8A87C"],
    balcak: ["#4A3122", "#8A6A4E", "#4A3122"],
    sap: ["#16100C", "#33241C", "#54402F"],
    isik: "232,168,124",
  },
  {
    /* Gece — koyu çelik, nane keskinlikte. Obsidiyen kütükle
       çakışmasın diye ağzı kütükten açık. */
    ad: "gece",
    agiz: ["#1E2A33", "#7E98A8"],
    balcak: ["#255E58", "#5EEAD4", "#255E58"],
    sap: ["#0B0F12", "#18222A", "#2C3A45"],
    isik: "94,234,212",
  },
];

export function bicakTemasi(tur: number): BicakTemasi {
  return BICAKLAR[(tur - 1) % BICAKLAR.length];
}

/**
 * Bıçağın ağzı.
 *
 * `carpan` saplanmış bıçakla uçan bıçağı ayırmıyor (ikisi de aynı
 * bıçak) ama **ölüm anında** kırmızıya çeviriyor: oyuncu hangi
 * bıçağa değdiğini görmeli, yoksa tur "sebepsiz" bitmiş olur.
 *
 * ⚠️ Kırmızı temanın ÜSTÜNDE: hangi bölümde olunursa olunsun ölüm
 * aynı renkte. Tema başına ayrı bir ölüm rengi, oyuncuya her
 * bölümde yeniden öğrenilecek bir şey verirdi.
 */
export function bicakAgzi(tur: number, carpan = false): CSSProperties {
  const t = bicakTemasi(tur);
  const koyu = carpan ? "#B91C1C" : t.agiz[0];
  const ana = carpan ? "#FCA5A5" : t.agiz[1];
  return {
    background: `linear-gradient(100deg, ${koyu} 0%, ${ana} 38%, #FFFFFF 52%, ${ana} 64%, ${koyu} 100%)`,
    clipPath: "polygon(50% 0, 100% 26%, 100% 100%, 0 100%, 0 26%)",
    filter: `drop-shadow(0 0 5px ${carpan ? "rgba(248,113,113,.9)" : `rgba(${t.isik},.55)`})`,
  };
}

/** Bıçağın sapı. */
export function bicakSapi(tur: number): CSSProperties {
  const s = bicakTemasi(tur).sap;
  return {
    borderRadius: "0 0 40% 40%",
    background: `linear-gradient(100deg, ${s[0]} 0%, ${s[1]} 42%, ${s[2]} 60%, ${s[0]} 100%)`,
    boxShadow: "inset 0 -2px 4px rgba(0,0,0,.6)",
  };
}

/** Balçak — ağızla sapın arasındaki ince şerit. */
export function bicakBalcagi(tur: number): CSSProperties {
  const b = bicakTemasi(tur).balcak;
  return {
    borderRadius: 2,
    background: `linear-gradient(100deg, ${b[0]} 0%, ${b[1]} 50%, ${b[2]} 100%)`,
  };
}

/**
 * Elma — bonus.
 *
 * ⚠️ Kırmızı ve paletin dışında, tıpkı ödülün altını gibi. Nane bir
 * elma kütükte kaybolurdu; kırmızı ahşabın üstünde tek başına
 * duruyor.
 */
export function bicakElmasi(): CSSProperties {
  return {
    borderRadius: "9999px",
    background: `radial-gradient(circle at 34% 28%, #FCA5A5 0%, ${BICAK_RENK.elma} 48%, #991B1B 100%)`,
    boxShadow: "0 0 10px rgba(239,68,68,.65), inset 0 -3px 6px rgba(0,0,0,.35)",
  };
}

/**
 * Ödül paketi — altın (Ü203 · Ü207 · Ü234).
 *
 * ⚠️ Sekme'dekiyle aynı reçete ve öyle kalmalı: ödül ürünün her
 * yerinde altın ve oyuncunun bunu her oyunda yeniden öğrenmesi
 * gerekmiyor.
 */
export function bicakOdulu(): CSSProperties {
  return {
    borderRadius: 7,
    background: [
      "repeating-linear-gradient(135deg, rgba(255,252,235,.85) 0 4px, rgba(255,255,255,0) 4px 11px)",
      "linear-gradient(180deg, #e8b93c 0%, #a9781a 100%)",
    ].join(", "),
    boxShadow: "inset 0 0 0 1.5px rgba(255,248,214,.95), 0 0 14px rgba(255,215,94,.9)",
  };
}

/**
 * HUD paneli — Düşen ve Sekme'dekiyle aynı kesik köşe.
 *
 * ⚠️ Aynı olması gerekiyor: üçü de aynı ailede ve oyuncu oyunlar
 * arasında geçerken arayüzün dilini yeniden öğrenmemeli.
 */
export function bicakPanel(vurgu: string = BICAK_RENK.ana): CSSProperties {
  return {
    clipPath:
      "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
    background: "linear-gradient(160deg, rgba(9,42,40,.92) 0%, rgba(4,16,20,.92) 100%)",
    boxShadow: `inset 0 0 0 1.5px ${vurgu}55, inset 0 0 14px ${vurgu}1f`,
  };
}

/**
 * Alt şeritteki kalan bıçak sayacı — tek bir çizgi.
 *
 * ⚠️ Rakam değil çizgi: referansta da kalan bıçaklar altta sıra
 * hâlinde duruyor ve oyuncu **saymadan** kaç tane kaldığını
 * görüyor. "4/6" yazsaydı gözün okuması gerekirdi.
 */
export function bicakSayaci(dolu: boolean): CSSProperties {
  return {
    borderRadius: 2,
    background: dolu
      ? `linear-gradient(180deg, ${BICAK_RENK.celik} 0%, ${BICAK_RENK.celikKoyu} 100%)`
      : "rgba(255,255,255,.12)",
    boxShadow: dolu ? `0 0 6px ${BICAK_RENK.ana}66` : undefined,
  };
}
