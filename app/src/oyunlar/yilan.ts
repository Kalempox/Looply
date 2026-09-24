import { tohumla } from "./rastgele";
import { TICK_MS, type Oyun } from "./sozlesme";
import { odulSirasiGeldi } from "./odul";

/**
 * Yılan — yem topla, kendine ve duvara çarpma.
 *
 * ── Ü91: ödül, yemin yanında beliren ayrı bir şey ───────────
 *
 * Ürün sahibinin tarifi: *"yılan bazen şans eseri ama oyun başında değil,
 * genelde biraz ilerlerde elma yiyor ya — normalde elma yerine kupon veya
 * ödül çıksın."*
 *
 * Bu, ödül motorunun (Ü88) **görünen yüzü**. Motor bugüne kadar sessizce
 * arkada karar veriyordu ve oyuncu ödülü ancak sonuç ekranında görüyordu.
 * Burada ödül tahtanın üstünde duruyor.
 *
 * ── ⚠️ İlk sürüm yemin YERİNE koyuyordu (Ü92) ───────────────
 *
 * O tasarımda ödül bir seçim değildi: oyuncu zaten yeme gidiyor, yem de
 * ödül olunca kendiliğinden yiyordu. Ölçüldü — 200 turun 101'inde ödül
 * yakalanıyor ve yılan turlarının **%40'ı** kupon veriyordu (Blok'ta %21).
 * Ürün sahibi *"oyun çok fazla ödül dağıtıyor"* dedi ve haklıydı.
 *
 * Şimdi ödül **ayrı bir nesne**: normal yem yerinde duruyor, ödül başka
 * bir hücrede beliriyor ve **sayılı adım sonra kayboluyor**. Yakalamak
 * artık bir karar — güvenli yoldan sapmak, kuyruğu göze almak, yetişmek.
 *
 * ⚠️ **İlk yemlerde ödül çıkmıyor** (`ODUL_ILK_YEM`). Oyunun ilk yirmi
 * saniyesi öğrenme anı (docs/03); oraya ödül koymak hem çok kolay olur hem
 * de oyuncu daha kuralı anlamadan en değerli şeyi kaçırır.
 *
 * ── Ödülü kim veriyor ───────────────────────────────────────
 *
 * Yem **kuponu üretmiyor**. Durumda yalnızca "kaç ödül yemi yakalandı"
 * sayısı duruyor; sunucu turu yeniden oynatıp o sayıyı kendisi buluyor ve
 * ödül motoruna bir girdi olarak veriyor (`odulIsareti`). Değişmez kural
 * #4 böyle korunuyor: para değeri taşıyan hiçbir karar istemcide verilmiyor.
 *
 * ── Determinizm ─────────────────────────────────────────────
 *
 * Düşen'le aynı çözüm: zaman **tick sayacında**, her girdi kendi tick'ini
 * taşıyor. Yem konumu ve ödül olup olmadığı `(tohum, yenen)`'den türüyor.
 * Yılanın gövdesi hücre indekslerinden ibaret — kayan nokta yok.
 */

export const YILAN_EN = 15;
export const YILAN_BOY = 15;
const HUCRE = YILAN_EN * YILAN_BOY;

/**
 * Hız eğrisi: kaç tick'te bir adım.
 *
 * Başlangıçta 0,55 saniyede bir hücre; en hızlı hâlinde 0,15. Her üç yemde
 * bir hızlanıyor, yani eğri tek turda baştan sona yaşanıyor (Ü83).
 */
const BASLANGIC_TICK = 11;
const EN_HIZLI_TICK = 3;
const HIZLANMA_ARALIGI = 3;

export function adimTickiHesapla(yenen: number): number {
  return Math.max(EN_HIZLI_TICK, BASLANGIC_TICK - Math.floor(yenen / HIZLANMA_ARALIGI));
}

/** Kaçıncı yemden sonra ödül belirebiliyor. */
const ODUL_ILK_YEM = 5;

/** Uygun yemlerin yüzde kaçından sonra ödül beliriyor. */
const ODUL_YUZDE = 12;

/**
 * Ödül kaç adım tahtada kalıyor.
 *
 * Yirmi beş adım, tahtanın bir ucundan diğerine gitmeye **ancak** yetiyor
 * (15 hücre + dönüşler). Süresiz kalsaydı ödül bir karar olmaktan çıkar,
 * sıraya girip alınan bir şeye dönerdi.
 */
export const ODUL_OMRU_ADIM = 25;

export type Yon = "yukari" | "asagi" | "sol" | "sag";

const YONLER: readonly Yon[] = ["yukari", "asagi", "sol", "sag"];

/** Yönün satır/sütun adımı. */
const ADIM: Record<Yon, readonly [number, number]> = {
  yukari: [-1, 0],
  asagi: [1, 0],
  sol: [0, -1],
  sag: [0, 1],
};

/** Ters yön — yılan kendi üstüne dönemiyor. */
const TERS: Record<Yon, Yon> = {
  yukari: "asagi",
  asagi: "yukari",
  sol: "sag",
  sag: "sol",
};

export type YilanDurumu = {
  tohum: string;
  /** Hücre indeksleri, **baş en başta**. */
  govde: number[];
  yon: Yon;
  /** Sıradaki adımda uygulanacak yön — dönüş hemen değil, adımda işliyor. */
  bekleyenYon: Yon;
  yem: number;
  /**
   * Ödül hücresi — yoksa `null`.
   *
   * Normal yemden **ayrı** duruyor (Ü92): yerine geçseydi yakalamak bir
   * karar olmaz, yem yiyen otomatik alırdı.
   */
  odul: number | null;
  /** Ödül kaç adım sonra kaybolacak. */
  odulKalanAdim: number;
  yenen: number;
  /** Yakalanan ödül yemi sayısı — motorun okuduğu tek şey. */
  odulYakalanan: number;
  skor: number;
  tick: number;
  /** Son adımın atıldığı tick. */
  sonAdim: number;
  adimTicki: number;
  /**
   * Yılan yürümeye başladı mı? (Ü91)
   *
   * ⚠️ İlk sürümde tur açılır açılmaz sağa doğru yürüyordu ve oyuncu
   * ekrana daha bakmadan duvara giriyordu — tarayıcıda ölçüldü, üç
   * saniyede bitti. Artık **ilk yön tuşuna kadar** bekliyor; klasik yılan
   * oyunlarının davranışı da bu.
   *
   * Determinizmi bozmuyor: başlangıç anı girdi kaydındaki ilk yön
   * girdisinin tick'i, yani sunucu da aynı yerden başlatıyor.
   */
  basladi: boolean;
  /** Duvara ya da kendine çarptı — turun tek bitiş yolu. */
  carpti: boolean;
};

/**
 * Girdi: bir tick ve bir yön.
 *
 * `y: "bekle"` yalnızca zaman işareti — istemci sayacı ilerletmek için
 * gönderiyor. Olmasaydı sunucu son dönüşten sonra saati durdurur ve yılan
 * fiilen donardı.
 */
export type YilanGirdisi = { tick: number; y: Yon | "bekle" };

/** Boş bir hücre seçer — yalnızca verilen tohum dizisinden türüyor. */
function bosHucre(anahtar: string, dolu: readonly number[]): number {
  const r = tohumla(anahtar);
  const doluKume = new Set(dolu);
  const bos: number[] = [];
  for (let i = 0; i < HUCRE; i++) if (!doluKume.has(i)) bos.push(i);

  // Tahta tamamen dolduysa (teorik) başı geri veriyoruz; bir sonraki adım
  // zaten çarpma ile bitiyor.
  return bos.length === 0 ? dolu[0] : bos[r.tamsayi(bos.length)];
}

/**
 * Bu yemden sonra ödül belirecek mi?
 *
 * ── 🔴 Ü234 · ÖDÜL ARTIK EŞİKTEN SONRA BELİRİYOR ────────────
 *
 * Ü91'den beri altın yem skordan bağımsız çıkıyordu ve yakalamak
 * `basariliMi`de eşiği **tamamen atlıyordu**. Sonucu şuydu: aynı
 * kafede Yılan oynayan bir müşteri 480 puanla kupon alıyor, Blok
 * oynayan 500'e ulaşmak zorunda kalıyordu. Ürün sahibi bunu
 * *"eksiksiz ve doğru kurmalıyız"* diye işaretledi ve **tek kural:
 * eşik** dedi.
 *
 * Kapıyı kapatmak tek başına yetmezdi: eşiğin altında beliren ama
 * artık hiçbir şey kazandırmayan bir altın yem, **yalan söyleyen** bir
 * nesne olurdu — Ü91'in *"mekaniği yalan çıkarır"* uyarısı bu kez ters
 * yönden geçerli olurdu.
 *
 * Çözüm ötekilerle aynı: ödül bir **teslimat anı**. Blok, Düşen ve
 * Sekme'de paket nasıl eşik geçildikten sonra düşüyorsa, burada da
 * altın yem eşik geçildikten sonra beliriyor ve tur başına **bir kez**
 * çıkıyor (`odulSirasiGeldi`).
 *
 * ⚠️ `ODUL_ILK_YEM` (öğrenme turu) ve `ODUL_YUZDE` korunuyor: eşik
 * geçilse bile ödül hemen çıkmıyor, birkaç yem sürebiliyor. Anında
 * çıksaydı "teslimat" değil "otomatik ödeme" gibi okunurdu.
 */
function odulBelirirMi(
  tohum: string,
  yenen: number,
  skor: number,
  verildi: boolean,
): boolean {
  if (!odulSirasiGeldi(skor, verildi)) return false;
  return (
    yenen >= ODUL_ILK_YEM && tohumla(`${tohum}:yilan:odul:${yenen}`).tamsayi(100) < ODUL_YUZDE
  );
}

/** Yem puanı — uzadıkça artıyor. */
function yemPuani(yenen: number): number {
  return 10 + Math.floor(yenen / 4) * 5;
}

/** Ödülü yakalamanın puanı — yem puanının iki katı. */
function odulPuani(yenen: number): number {
  return yemPuani(yenen) * 2;
}

export const yilan: Oyun<YilanDurumu, YilanGirdisi> = {
  id: "yilan",
  ad: "Yılan",
  ozet: "Yem topla, ödülü yakala, çarpma",
  emoji: "🐍",

  baslat(tohum) {
    // Ortadan başlıyor, sağa bakıyor, üç hücre uzunluğunda.
    const orta = Math.floor(YILAN_BOY / 2) * YILAN_EN + Math.floor(YILAN_EN / 2);
    const govde = [orta, orta - 1, orta - 2];

    return {
      tohum,
      govde,
      yon: "sag",
      bekleyenYon: "sag",
      yem: bosHucre(`${tohum}:yilan:0`, govde),
      odul: null,
      odulKalanAdim: 0,
      yenen: 0,
      odulYakalanan: 0,
      skor: 0,
      tick: 0,
      sonAdim: 0,
      adimTicki: BASLANGIC_TICK,
      basladi: false,
      carpti: false,
    };
  },

  uygula(durum, girdi) {
    if (this.bittiMi(durum)) return null;
    // Zaman geriye akmaz — sıralaması bozuk girdi kaydı reddedilir.
    if (girdi.tick < durum.tick) return null;

    const d = zamaniIlerlet(durum, girdi.tick);
    if (this.bittiMi(d)) return d; // ilerletme sırasında çarptı; dönüş düşer

    if (girdi.y === "bekle") return d;

    // ⚠️ Dönüş **bekleyen yöne** yazılıyor, `yon`a değil. Doğrudan yazılsaydı
    // oyuncu tek bir adım içinde iki kez dönerek gövdesinin içinden
    // geçebilirdi: sağa giderken yukarı, sonra sola — yılan kendi boynuna
    // girer ve oyun haksız yere biterdi.
    if (girdi.y === TERS[d.yon]) return d; // geri dönüş yok; hamle düşer
    // İlk yön tuşu turu başlatıyor; ondan önce yılan yerinde duruyor.
    return { ...d, bekleyenYon: girdi.y, basladi: true };
  },

  bittiMi(durum) {
    return durum.carpti;
  },

  skor(durum) {
    return durum.skor;
  },
  /* Ü275 · "görünürse kesin": sunucu paketin gerçekten tahtada olduğunu
     ve oyuncuya ulaştığını bu ikisiyle görüyor (sözleşmedeki not).
     Altın yem süresi dolunca kaçıyor; yalnızca YENEN sayılıyor. */
  odulVar(durum) {
    return durum.odul !== null;
  },
  odulTeslim(durum) {
    return durum.odulYakalanan > 0;
  },

  gecenMs(durum) {
    return durum.tick * TICK_MS;
  },

  odulIsareti(durum) {
    return durum.odulYakalanan;
  },

  girdiOku(ham) {
    if (typeof ham !== "object" || ham === null) return null;
    const o = ham as Record<string, unknown>;
    if (typeof o.tick !== "number" || !Number.isInteger(o.tick) || o.tick < 0) return null;
    // Tick üst sınırı: 100.000 tick = 83 dakika. Sonsuz turda bile ulaşılmaz.
    if (o.tick > 100_000) return null;
    if (typeof o.y !== "string") return null;
    if (o.y !== "bekle" && !YONLER.includes(o.y as Yon)) return null;
    return { tick: o.tick, y: o.y as Yon | "bekle" };
  },
};

/**
 * Yılanı hedef tick'e kadar yürütür.
 *
 * Her `adimTicki` tick'te bir hücre ilerliyor. Tek bir `uygula` çağrısı
 * birden çok adımı kapsayabilir — oyuncu bekleyip sonra döndüyse aradaki
 * zaman burada işleniyor.
 */
function zamaniIlerlet(durum: YilanDurumu, hedefTick: number): YilanDurumu {
  // Henüz başlamadıysa saat ilerliyor ama yılan duruyor. `sonAdim` de
  // ilerliyor ki ilk adım, başlangıçtan tam bir aralık sonra atılsın —
  // aksi hâlde bekleyen oyuncu ilk tuşa bastığı anda arka arkaya birkaç
  // adım birden yer ve doğrudan duvara girer.
  if (!durum.basladi) return { ...durum, tick: hedefTick, sonAdim: hedefTick };

  let d = durum;

  while (d.tick < hedefTick && !d.carpti) {
    const sonraki = d.sonAdim + d.adimTicki;
    if (sonraki > hedefTick) {
      d = { ...d, tick: hedefTick };
      break;
    }

    d = { ...d, tick: sonraki, sonAdim: sonraki, yon: d.bekleyenYon };
    d = adimAt(d);
  }

  return d;
}

/** Tek adım: başı ilerlet, çarpışmayı, yemi ve ödülü çöz. */
function adimAt(durum: YilanDurumu): YilanDurumu {
  const bas = durum.govde[0];
  const satir = Math.floor(bas / YILAN_EN);
  const sutun = bas % YILAN_EN;
  const [ds, dk] = ADIM[durum.yon];
  const yeniSatir = satir + ds;
  const yeniSutun = sutun + dk;

  // Duvar.
  if (yeniSatir < 0 || yeniSatir >= YILAN_BOY || yeniSutun < 0 || yeniSutun >= YILAN_EN) {
    return { ...durum, carpti: true };
  }

  const yeniBas = yeniSatir * YILAN_EN + yeniSutun;
  const yedi = yeniBas === durum.yem;
  const odulAldi = durum.odul !== null && yeniBas === durum.odul;

  // ⚠️ Kuyruk kontrolü: büyümüyorsa kuyruk aynı adımda boşalıyor, yani
  // kuyruğun bulunduğu hücreye girmek çarpma DEĞİL. Kontrol edilecek gövde
  // bu yüzden kuyruksuz hâli. Ödül de büyütüyor — yem gibi.
  const buyuyor = yedi || odulAldi;
  const carpilacak = buyuyor ? durum.govde : durum.govde.slice(0, -1);
  if (carpilacak.includes(yeniBas)) {
    return { ...durum, carpti: true };
  }

  const govde = [yeniBas, ...(buyuyor ? durum.govde : durum.govde.slice(0, -1))];

  // Ödülün ömrü her adımda eriyor; yakalandıysa ya da süresi dolduysa
  // tahtadan kalkıyor.
  let odul = durum.odul;
  let kalan = durum.odulKalanAdim;
  let yakalanan = durum.odulYakalanan;
  let skor = durum.skor;

  if (odulAldi) {
    yakalanan += 1;
    skor += odulPuani(durum.yenen);
    odul = null;
    kalan = 0;
  } else if (odul !== null) {
    kalan -= 1;
    if (kalan <= 0) {
      odul = null;
      kalan = 0;
    }
  }

  if (!yedi) return { ...durum, govde, odul, odulKalanAdim: kalan, odulYakalanan: yakalanan, skor };

  const yenen = durum.yenen + 1;
  const yem = bosHucre(`${durum.tohum}:yilan:${yenen}`, [...govde, ...(odul === null ? [] : [odul])]);

  // Ödül yalnızca tahtada başkası yokken beliriyor: iki ödül aynı anda
  // durursa oyuncu birini kaçırdığına üzülmek yerine ikisini birden
  // toplamaya çalışır ve mekanik "karar" olmaktan çıkar.
  /* ⚠️ Skor bu satırda HENÜZ yemin puanını almadı (aşağıda ekleniyor);
     eşik kontrolü yemle birlikte yapılmalı ki oyuncu 500'ü geçtiği
     yemde ödülü bekletmeden görebilsin. */
  const skorSimdi = skor + yemPuani(durum.yenen);
  if (odul === null && odulBelirirMi(durum.tohum, yenen, skorSimdi, yakalanan > 0)) {
    odul = bosHucre(`${durum.tohum}:yilan:odulyer:${yenen}`, [...govde, yem]);
    kalan = ODUL_OMRU_ADIM;
  }

  return {
    ...durum,
    govde,
    yem,
    odul,
    odulKalanAdim: kalan,
    yenen,
    odulYakalanan: yakalanan,
    skor: skor + yemPuani(durum.yenen),
    adimTicki: adimTickiHesapla(yenen),
  };
}
