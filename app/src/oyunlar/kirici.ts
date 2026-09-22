import { tohumla } from "./rastgele";
import { TICK_MS, type Oyun } from "./sozlesme";
import { odulSirasiGeldi } from "./odul";

/**
 * Blok Kırıcı — paletle topu tut, tuğla duvarını yık (Ü244).
 *
 * ── Referans ────────────────────────────────────────────────
 *
 * Ürün sahibinin listesindeki *"blok kırıcı"*. Doğrudan bağlantı
 * gelmedi (verilen üç Google bağlantısı aynı siteye çıkıyor ve o
 * sitede blok kırıcı yok), tür ise tek anlamlı: Breakout/Arkanoid.
 * Alınan şey: altta yatay palet, sekerek yükselen top, üstte tuğla
 * duvarı, topu kaçırınca kaybetme, bölüm bölüm hızlanma.
 *
 * ── 🔴 Neden Sekme'nin KOPYASI DEĞİL ────────────────────────
 *
 * İkisinde de bir top sekiyor ve katalogda yan yana duracaklar; bu
 * soru sorulmalı. Fark mekanikte değil **oyuncunun ne yaptığında**:
 *
 *   Sekme  → nişan al, bırak, izle. Karar **atış başına bir tane**
 *            ve top havadayken yapılacak bir şey yok.
 *   Kırıcı → top hiç durmuyor, oyuncu **sürekli** müdahale ediyor.
 *            Tek bir "karar anı" yok; oyun baştan sona elinde.
 *
 * Katalog ayrımı bunu zaten söylüyor: Sekme "Düşünerek", Kırıcı
 * "Yetişerek" (`katalog.ts`).
 *
 * ── Girdi biçimi: `(tick, konum)` — altıncı biçim ───────────
 *
 * Ü21'in iddiası her yeni oyunda bir kez daha sınanıyor. Buradaki
 * yenilik girdinin bir **örnekleme** olması: ne bir hamle
 * (blok/sekme), ne bir yön (düşen/yılan), ne de yalnız zaman
 * (bıçak) — parmağın o tick'teki **yeri**.
 *
 * 🔴 `x` bir HEDEF, emir değil. Palet ona doğru tick başına en
 * fazla `PALET_HIZ` yaklaşıyor. İki sebebi var ve ikincisi kritik:
 *
 *   · Kuraldışı girdi diye reddetmek, parmağını hızlı kaydıran
 *     dürüst oyuncunun **bütün turunu** çöpe atardı.
 *   · Paletin hızı sınırlı olmazsa oyun kaybedilemez: ışınlanan
 *     bir palet her topu yakalar ve Ü83 ("kazanarak biten tur
 *     yok") ihlal edilir. Duvar bu sabitten doğuyor.
 *
 * ⚠️ Ekran paletin **motordaki** yerini çiziyor, parmağın yerini
 * değil. Aksi hâlde oyuncunun gördüğü palet ile topu karşılayan
 * palet iki ayrı gerçek olurdu — aynı kural Sekme'de `atisIzi`
 * için de yazılı.
 *
 * ── 🔴 Fizik determinizmi ───────────────────────────────────
 *
 * Ü217'nin kuralı burada da geçerli: `Math.cos`/`sin` JS
 * standardında *"implementation-approximated"* ve motorlar son
 * bitlerde ayrışıyor. Yön tablosu (`YONLER`) bir kez üretilip
 * kaynağa gömüldü.
 *
 * ⚠️ Bölüm başına hız değiştiği için tablo **ölçekleniyor**:
 * `Math.round(v * hiz / TABAN_HIZ)`. Bu güvenli — çarpma, bölme ve
 * `Math.round` IEEE 754'te tam belirli ve her motorda aynı biti
 * veriyor. Belirsiz olan yalnızca trigonometri; aynı ayrım
 * `sekme.ts`te `Math.sqrt` için de yazılı.
 */

/** Izgaranın sütun sayısı. */
export const KIRICI_EN = 9;
/**
 * Duvarın en fazla kaç satır olabileceği.
 *
 * ⚠️ Beş, sekiz değil — ölçüm kararı. Sekiz satırla bir bölüm
 * ortalama 170 saniye sürüyordu ve kafede oynanan bir tur o kadar
 * uzun olamaz (ailenin geri kalanı 1–3 dakika). Beş satırda bölüm
 * ~55 saniye.
 */
export const KIRICI_SATIR = 4;

/**
 * Bir hücre kaç birim — sabit noktalı ölçek.
 *
 * Sekme ile aynı sayı ve aynı gerekçe: daha küçüğünde yuvarlama
 * sekme açısını gözle görülür biçimde bozuyor, daha büyüğü 32 bitlik
 * aralığa yaklaşmadan bir şey kazandırmıyor.
 */
const BIRIM = 1000;

const GENISLIK = KIRICI_EN * BIRIM;
/**
 * Tahtanın boyu — tuğla alanı, boşluk ve palet şeridi birlikte.
 *
 * ⚠️ 14'ten 10'a indi. Uzun tahta oyunu yavaşlatmakla kalmıyordu,
 * **kaybedilemez** de yapıyordu: top ile palet arasındaki boş koridor
 * ne kadar uzunsa palete o kadar çok tepki tick'i kalıyor
 * (`duvarUstu`).
 */
const YUKSEKLIK = 10 * BIRIM;

/** Topun yarıçapı. */
const TOP_R = 130;

/** Tuğla satırının yüksekliği — hücrenin yarısı; klasik oranı bu. */
const TUGLA_BOY = BIRIM / 2;
/** İlk bölümde duvarın üst kenarı. */
const TUGLA_UST = 1000;
/** Hücrenin içinde tuğlanın bıraktığı kenar boşluğu. */
const TUGLA_PAY = 50;

/**
 * 🔴 Duvar **tur boyunca iniyor** — Ü83'ün duvarı bu.
 *
 * ── İki ölçüm, iki yanlış teşhis ────────────────────────────
 *
 * İlk yazımda duvar sabitti ve kusursuz oynayan bot **hiç
 * kaybetmiyordu**: 160 turun 160'ı `EN_FAZLA_TICK` tavanına dayandı.
 * Sözleşmenin kuralı ise net — *"kazanarak biten bir tur yok."*
 *
 *   · *"Top yavaş, palet hızlı."* Hız 620 → 760, palet 1100 → 800
 *     denendi: duvar **gelmedi**. Bağlayıcı olan tepki mesafesiydi —
 *     duvarın altı ile palet arasındaki boş koridor palete topun
 *     yönü belli olduktan sonra onlarca tick bırakıyor.
 *   · *"Duvarı bölüm bölüm indir."* İndirildi ve yine **gelmedi**,
 *     ama bu kez sebep başkaydı ve tanı çıktı: kusursuz bot topu hep
 *     paletin **ortasından** karşılıyor, yansıma hep aynı yuvadan
 *     geliyor ve top kapalı bir bilardo yörüngesine kilitleniyor.
 *     Ölçüm: 2. bölümde son iki tuğlaya **9.000 tick** boyunca hiç
 *     değmedi. Breakout'un klasik "son tuğla" kilidi.
 *
 * ── Çözüm: geometri duruyorsa kilit açılmaz ─────────────────
 *
 * Kapalı bir yörünge ancak tahta sabitse kapalı kalır. Duvar her on
 * tick'te biraz inince hiçbir yörünge kalıcı olamıyor ve son tuğla
 * er geç topun yoluna giriyor.
 *
 * Asıl kazanç ayrı: bu, **paletle savuşturulamayan** bir kaybetme
 * sebebi. Ne kadar iyi tutarsan tut duvar iniyor; hayatta kalmanın
 * tek yolu tuğlaları yeterince hızlı kırmak. Ü83'ün istediği "duvar"
 * artık palet becerisinden bağımsız.
 *
 * ⚠️ Kural ailede yeni değil: Sekme'de bloklar iniyor ve tabana
 * ulaşınca tur bitiyor. Kırıcı'nın tabanı palet.
 */
function duvarUstu(tur: number, turTick: number, tick: number): number {
  return TUGLA_UST + Math.floor((tick - turTick) / INIS_ARA) * inisAdimi(tur);
}

/** Duvar kaç tick'te bir adım iniyor. */
const INIS_ARA = 10;

/**
 * Bir inişin boyu — bölüm ilerledikçe büyüyor.
 *
 * ⚠️ Zorluğun asıl kolu bu, top hızı değil. Ölçüm: hız eğriyi az
 * oynatıyor (Bıçak'ta da öyleydi), iniş hızı ise bölümün
 * tamamlanabilir olup olmadığını doğrudan belirliyor.
 */
function inisAdimi(tur: number): number {
  return 45 + tur * 7;
}

/** Paletin üst kenarı ve kalınlığı. */
const PALET_Y = 9000;
const PALET_BOY = 280;

/**
 * 🔴 Paletin tick başına gidebileceği en fazla yol — **duvarın
 * kendisi**.
 *
 * Ü83 her oyundan tek bir şey istiyor: kusursuz oynayan biri de er
 * geç kaybetmeli. Breakout'ta bunu veren tek şey paletin **insan
 * eli kadar yavaş** olması. Sınırsız hızlı bir palet her topu
 * yakalar ve tur sonsuza gider — Bıçak'ta `min(12, …)` ile ölçülen
 * aynı hata (bot 68. bölüme çıkmıştı).
 *
 * ⚠️ Bölümden bölüme **değişmiyor**: bu sayı oyuncunun elinin hızı
 * ve el bölüm ilerledikçe hızlanmıyor. Artan şey topun hızı; duvar
 * ikisinin makaslamasından doğuyor.
 *
 * 520 birim/tick = saniyede 10,4 hücre. Tahtanın bir ucundan
 * ötekine 0,9 saniye — telefonda parmağın gerçekten gidebileceği
 * hız. Daha yavaşı paleti oyuncunun elinden koparır ve kaybetmek
 * beceriksizlik değil kader olurdu.
 */
const PALET_HIZ = 520;

/**
 * Yön tablosunun taban hızı — bölüm hızı buna göre ölçekleniyor.
 */
const TABAN_HIZ = 1000;

/** Palet yansıma yuvası sayısı — sekiz sol, sekiz sağ. */
const YUVA = 16;

/**
 * Yön tablosu — **kaynağa gömülü**, iki yay hâlinde.
 *
 * Sol yarı 152°→108°, sağ yarı 72°→28°. Taban hız 1000, en büyük
 * yuvarlama sapması %0,038, |vy| 469–951.
 *
 * ── 🔴 Ortada dikey YOK ve bu bir denge kararı ──────────────
 *
 * Klasik Arkanoid'de paletin ortası topu dik yukarı gönderir. Burada
 * o yuva **kasten yok** ve sebebi ölçüldü: duvar inen bir oyunda
 * dikey top ölümcül. Ölçüm, eğriyi tam tersine çevirmişti —
 *
 *   kusursuz (sapmasız) bot · bölüm ortanca 2 · skor ortanca 468
 *   zayıf    (±700 sapma)   · bölüm ortanca 4 · skor ortanca 1500
 *
 * Yani **özenli oynamak cezalandırılıyordu.** Sebep: topu hep
 * paletin ortasından karşılayan oyuncu dikey bir top alıyor, dikey
 * top dar bir koridorda kalıyor, dar koridor az tuğla kırıyor ve
 * inen duvar onu eziyor. Oyun, oyuncuya "kötü oyna" diyordu.
 *
 * İki yay bunu kapatıyor: en dik yuva 72°, yani her top yana yol
 * alıyor. Paletin ortası artık ölü bölge değil, **yön ayracı** —
 * solundan vurursan sola, sağından vurursan sağa.
 *
 * ── 🔴 DEĞİŞMEZ: hiçbir bileşen sıfır olamaz ────────────────
 *
 * Sekme'de bu değişmez ihlal edildiğinde ürün sahibi *"toplar böyle
 * sağa sola giderken bugta kaldı"* dedi (Ü243). Burada korunması
 * daha kolay: oyunda çapraz yüzey yok, yani bileşen **takası** da
 * yok. Duvar, tavan ve tuğla çarpışmaları yalnızca işaret çeviriyor
 * ve işaret çevirmek sıfır üretemez.
 *
 * ⚠️ Tablo ayna simetrik (`i` ↔ `YUVA-1-i`): yan duvardan sekmek
 * `vx`i çeviriyor ve sonuç yine tablonun bir satırı. Simetri
 * bozulursa duvardan sekmiş top tablonun dışına düşer ve bazı
 * açılar ötekilerden hızlı olur.
 */
const YONLER: readonly (readonly [number, number])[] = [
  [-883, -469], [-826, -563], [-760, -650], [-684, -730],
  [-600, -800], [-509, -861], [-411, -912], [-309, -951],
  [309, -951], [411, -912], [509, -861], [600, -800],
  [684, -730], [760, -650], [826, -563], [883, -469],
];

/**
 * Turun toplam tick tavanı — **güvenlik sınırı, denge ayarı değil.**
 *
 * `uygula` iki girdi arasını tick tick ilerletiyor. Sınır olmasaydı
 * saldırgan tek bir `{t: 2_000_000_000}` gönderip sunucuyu iki
 * milyar tur döndürürdü. 12.000 tick = 10 dakika oyun; kimsenin
 * kafede bir turda geçirmeyeceği süre.
 *
 * ⚠️ Sınıra dayanan tur **bitmiş** sayılıyor, reddedilmiyor: skor o
 * ana kadarki hâliyle geçerli. Aynı tercih Sekme'de `EN_FAZLA_ADIM`
 * için de yapıldı.
 */
const EN_FAZLA_TICK = 12_000;

/** İki girdi arasında kabul edilen en uzun boşluk (tick). */
const EN_FAZLA_BEKLEME = 600;

/** Bölümün top hızı — birim/tick. */
function topHizi(tur: number): number {
  return Math.min(1000, 420 + (tur - 1) * 55);
}

/**
 * Bölümün palet genişliği.
 *
 * 🔴 Daralıyor ve duvarın ikinci yarısı bu. Hız tek başına yetmiyor:
 * ölçümde sabit genişlikli paletle bot 40. bölümü geçiyordu, çünkü
 * topun nereye düşeceği hesaplanabilir ve geniş palet hesap hatasını
 * affediyor. Dar palet affetmiyor.
 *
 * 2000 (2 hücre) → 1100 (1,1 hücre). Alt sınır topun çapından
 * (260) hâlâ epey geniş; daha darı paleti "nişan alınan" bir şeye
 * çevirir ve oyun refleks olmaktan çıkardı.
 */
function paletEni(tur: number): number {
  return Math.max(1100, 2100 - (tur - 1) * 110);
}

/** Bölümün tuğla satırı sayısı. */
function satirSayisi(tur: number): number {
  return Math.min(KIRICI_SATIR, 2 + Math.floor(tur / 3));
}

/** Bir tuğlanın en fazla kaç canı olabilir. */
function enFazlaCan(tur: number): number {
  return Math.min(2, 1 + Math.floor(tur / 4));
}

/** Tuğlaya vurma puanı. */
function vurusPuani(tur: number): number {
  return 1 + Math.floor(tur / 3);
}

/** Tuğlayı kırma puanı. */
function kirmaPuani(tur: number): number {
  return 3 + Math.floor(tur / 2);
}

/** Bölümü bitirme puanı. */
function bolumPuani(tur: number): number {
  return 25 + tur * 6;
}

export type KiriciDurumu = {
  tohum: string;
  /** Kaçıncı bölüm — 1'den başlıyor. */
  tur: number;
  /**
   * Bölümün başladığı tick — duvarın indiği yer bundan türüyor.
   *
   * ⚠️ Duvarın yeri duruma **yazılmıyor**, `duvarUstu(tur, turTick,
   * tick)` ile türüyor. Yazılsaydı iki gerçek olurdu (kayıtlı sayı ve
   * hesaplanan sayı) ve biri güncellenmediği gün çarpışma çizimden
   * ayrışırdı.
   */
  turTick: number;
  /**
   * Tuğlaların kalan canı — `satir * KIRICI_EN + sutun`, 0 = yok.
   *
   * Düz dizi, nesne listesi değil: çarpışma her alt adımda topun
   * kapladığı en fazla dört hücreye bakıyor ve o arama dizide O(1).
   * Liste olsaydı her alt adım bütün tuğlaları tarardı.
   */
  tuglalar: number[];
  /** Kalan tuğla sayısı — her adımda diziyi saymamak için. */
  kalan: number;
  /** Paletin merkezi. */
  palet: number;
  /** Paletin izlediği hedef — son girdinin `x`i. */
  hedef: number;
  topX: number;
  topY: number;
  vx: number;
  vy: number;
  tick: number;
  skor: number;
  bitti: boolean;
  /** Ödül paketini taşıyan tuğlanın hücresi — Ü234. */
  odulHucre: number | null;
  odulVerildi: boolean;
};

export type KiriciGirdisi = {
  /** Örneklemenin alındığı tick. */
  t: number;
  /** Paletin merkezinin gitmesi istenen yer. */
  x: number;
};

/**
 * Tuğlanın sabit noktalı kutusu.
 *
 * ⚠️ `ust` dışarıdan geliyor: duvar tur boyunca iniyor (`duvarUstu`)
 * ve sabit bir kutu, çarpışmanın çizimden ayrışması demekti.
 */
function tuglaKutusu(hucre: number, ust: number) {
  const satir = Math.floor(hucre / KIRICI_EN);
  const sutun = hucre % KIRICI_EN;
  return {
    sol: sutun * BIRIM + TUGLA_PAY,
    sag: (sutun + 1) * BIRIM - TUGLA_PAY,
    ust: ust + satir * TUGLA_BOY + TUGLA_PAY / 2,
    alt: ust + (satir + 1) * TUGLA_BOY - TUGLA_PAY / 2,
  };
}

/**
 * Bölümün tuğla duvarı.
 *
 * ⚠️ Tohum yalnızca **görünen** şeyi belirliyor: hangi tuğlanın kaç
 * canı olduğu ekranda rengiyle yazıyor. Ş3'ün (`docs/18`) istediği
 * tam olarak bu — tahtada gizli hiçbir şey yok, tohumu okumak
 * oyuncuya bir şey kazandırmıyor.
 */
function duvarKur(tohum: string, tur: number): { tuglalar: number[]; kalan: number } {
  const r = tohumla(`${tohum}:kirici:duvar:${tur}`);
  const tuglalar = new Array<number>(KIRICI_SATIR * KIRICI_EN).fill(0);
  const satir = satirSayisi(tur);
  const tavan = enFazlaCan(tur);
  let kalan = 0;
  for (let s = 0; s < satir; s++) {
    for (let k = 0; k < KIRICI_EN; k++) {
      /* Her satırda birkaç boşluk: dümdüz dolu bir duvar topu hep
         aynı biçimde geri gönderiyor ve bölümler birbirine benziyor. */
      if (r.tamsayi(10) === 0) continue;
      /* Üst satırlar daha sert — top oraya ulaşmak için duvarı
         delmek zorunda ve ödül oradaki derinlikte. */
      const can = 1 + r.tamsayi(Math.min(tavan, 1 + Math.floor((satir - s) / 2)));
      tuglalar[s * KIRICI_EN + k] = can;
      kalan++;
    }
  }
  return { tuglalar, kalan };
}

function bolumKur(
  tohum: string,
  tur: number,
  skor: number,
  odulVerildi: boolean,
): Pick<KiriciDurumu, "tuglalar" | "kalan" | "palet" | "hedef" | "topX" | "topY" | "vx" | "vy" | "odulHucre"> {
  const { tuglalar, kalan } = duvarKur(tohum, tur);
  const r = tohumla(`${tohum}:kirici:servis:${tur}`);

  /*
    🔴 Ü234 · paket EŞİKTEN SONRA, tur başına bir kez.

    Blok'ta parça teklifi, Düşen'de kaplı parça, Sekme'de düşen kutu,
    Yılan'da altın yem, Bıçak'ta kütükteki hedef. Burada duvardaki
    bir tuğla. Altısında da kural aynı: `odulSirasiGeldi`.

    ⚠️ Paket **hangi tuğlada** olduğu ekranda görünüyor; gizli bir
    şey taşımıyor. Kırılınca teslim ediliyor, puan vermiyor.
  */
  let odulHucre: number | null = null;
  if (odulSirasiGeldi(skor, odulVerildi) && kalan > 0) {
    const dolu: number[] = [];
    tuglalar.forEach((c, i) => {
      if (c > 0) dolu.push(i);
    });
    odulHucre = r.sec(dolu);
  }

  /* Servis paletin ortasından, tablodan seçilen bir yuvayla.
     ⚠️ En uçtaki iki yuva dışarıda: duvara paralel bir servis
     oyuncuya ilk saniyede yapacak bir şey bırakmazdı. */
  const yuva = 2 + r.tamsayi(YUVA - 4);
  const hiz = topHizi(tur);
  const orta = Math.floor(GENISLIK / 2);

  return {
    tuglalar,
    kalan,
    palet: orta,
    hedef: orta,
    topX: orta,
    topY: PALET_Y - TOP_R,
    vx: Math.round((YONLER[yuva][0] * hiz) / TABAN_HIZ),
    vy: Math.round((YONLER[yuva][1] * hiz) / TABAN_HIZ),
    odulHucre,
  };
}

/** Bir tick'lik ilerleme sonucunda olup bitenler. */
type Adim = {
  skor: number;
  /** Paket bu adımda kırıldı mı? */
  odul: boolean;
  /** Top tabandan çıktı mı? */
  dustu: boolean;
};

/**
 * Topu bir tick ilerletir ve çarpışmaları uygular — **durumu yerinde
 * değiştiriyor**.
 *
 * ⚠️ Saf değil ve kasten öyle: `uygula` iki girdi arasında yüzlerce
 * tick dönebiliyor ve her tick'te yeni bir durum nesnesi üretmek
 * sunucunun tekrar maliyetini birkaç katına çıkarırdı. Nesne
 * `uygula`nın içinde bir kez kopyalanıyor, döngü kopyanın üstünde
 * çalışıyor.
 *
 * ── Alt adım: tünelleme yok ──────────────────────────────────
 *
 * Top tick başına 620 birime kadar gidiyor, tuğlanın boyu ise 500.
 * Tek hamlede ilerletilse top bir tuğlanın içinden **geçip
 * gidebilirdi**. Hareket yarıçaptan (`TOP_R`) küçük parçalara
 * bölünüyor; ilerleme tam sayı kalsın diye parça sınırları
 * `trunc(v*k/n)` farkından türüyor — toplamı tam olarak `v`.
 */
function topAdimi(d: KiriciDurumu, tur: number, duvar: number): Adim {
  const sonuc: Adim = { skor: 0, odul: false, dustu: false };
  const buyuk = Math.max(Math.abs(d.vx), Math.abs(d.vy));
  const n = Math.max(1, Math.ceil(buyuk / TOP_R));

  for (let k = 1; k <= n; k++) {
    const dx = Math.trunc((d.vx * k) / n) - Math.trunc((d.vx * (k - 1)) / n);
    const dy = Math.trunc((d.vy * k) / n) - Math.trunc((d.vy * (k - 1)) / n);
    const oncekiX = d.topX;
    const oncekiY = d.topY;
    d.topX += dx;
    d.topY += dy;

    // ── Yan duvarlar ve tavan: yalnızca işaret ─────────
    if (d.topX < TOP_R) {
      d.topX = TOP_R + (TOP_R - d.topX);
      d.vx = -d.vx;
    } else if (d.topX > GENISLIK - TOP_R) {
      d.topX = GENISLIK - TOP_R - (d.topX - (GENISLIK - TOP_R));
      d.vx = -d.vx;
    }
    if (d.topY < TOP_R) {
      d.topY = TOP_R + (TOP_R - d.topY);
      d.vy = -d.vy;
    }

    // ── Tuğlalar ──────────────────────────────────────
    if (d.kalan > 0 && d.topY - TOP_R < duvar + KIRICI_SATIR * TUGLA_BOY) {
      const vurulan = tuglaAra(d, duvar, oncekiX, oncekiY);
      if (vurulan !== null) {
        const { hucre, eksen } = vurulan;
        if (eksen === "x" || eksen === "xy") d.vx = -d.vx;
        if (eksen === "y" || eksen === "xy") d.vy = -d.vy;

        const kalanCan = d.tuglalar[hucre] - 1;
        d.tuglalar[hucre] = kalanCan;
        sonuc.skor += vurusPuani(tur);
        if (kalanCan === 0) {
          d.kalan--;
          sonuc.skor += kirmaPuani(tur);
          if (d.odulHucre === hucre) {
            d.odulHucre = null;
            sonuc.odul = true;
          }
        }
      }
    }

    // ── Palet ─────────────────────────────────────────
    const yariEn = Math.floor(paletEni(tur) / 2);
    if (
      d.vy > 0 &&
      d.topY + TOP_R >= PALET_Y &&
      d.topY - TOP_R <= PALET_Y + PALET_BOY &&
      d.topX >= d.palet - yariEn - TOP_R &&
      d.topX <= d.palet + yariEn + TOP_R
    ) {
      /*
        Yansıma açısı **vuruş yerinden** türüyor — klasikteki tek
        kural bu ve paleti bir "duvar" olmaktan çıkarıp oyuncunun
        nişan aracı yapan şey o.

        ⚠️ `(sapma + yariEn)` payı 0..2·yariEn aralığında, yani
        bölme her zaman 0..YUVA aralığında bir sayı veriyor; uçtaki
        eşitlik için `min` ile kırpılıyor. Bölme IEEE'de tam belirli
        (trigonometri değil), yani `Math.floor` her motorda aynı
        yuvayı seçiyor.
      */
      const sapma = Math.max(-yariEn, Math.min(yariEn, d.topX - d.palet));
      const yuva = Math.min(
        YUVA - 1,
        Math.floor(((sapma + yariEn) * YUVA) / (yariEn * 2)),
      );
      const hiz = topHizi(tur);
      /* Yuva 0 paletin en solu ve tablonun 0. satırı en şaşı sol —
         ikisi aynı sırada, çevirmeye gerek yok. */
      const yon = YONLER[yuva];
      d.vx = Math.round((yon[0] * hiz) / TABAN_HIZ);
      d.vy = Math.round((yon[1] * hiz) / TABAN_HIZ);
      d.topY = PALET_Y - TOP_R;
    }

    // ── Taban ─────────────────────────────────────────
    if (d.topY - TOP_R > YUKSEKLIK) {
      sonuc.dustu = true;
      return sonuc;
    }
  }
  return sonuc;
}

/**
 * Kalan tuğlaların en alt kenarı — duvar yoksa 0.
 *
 * ⚠️ **Kalan** tuğlalara bakıyor, satır sayısına değil: alt satırı
 * temizleyen oyuncu kendine zaman kazanıyor ve bunu ekranda görüyor.
 * Satır sayısına bakılsaydı temizlenmiş bir satır da baskı yapmaya
 * devam ederdi — oyuncunun yaptığı işi görmezden gelen bir kural.
 */
function duvarDibi(d: KiriciDurumu, duvar: number): number {
  for (let s = KIRICI_SATIR - 1; s >= 0; s--) {
    for (let k = 0; k < KIRICI_EN; k++) {
      if (d.tuglalar[s * KIRICI_EN + k] > 0) {
        return duvar + (s + 1) * TUGLA_BOY - TUGLA_PAY / 2;
      }
    }
  }
  return 0;
}

/**
 * Topun o anda içine girdiği tuğla ve hangi eksende döneceği.
 *
 * Top kare gibi ele alınıyor (kenarı `2·TOP_R`). Daireyle kutu
 * arasındaki tam köşe testi burada bir şey kazandırmıyor: alt adım
 * yarıçaptan küçük, yani top bir tuğlanın içine en fazla birkaç
 * birim giriyor ve köşeye teğet geçen durum ekranda görünmüyor.
 *
 * Eksen **önceki kareden** türüyor, girme derinliğinden değil: hangi
 * kenardan geldiği tek doğru bilgi. Derinliğe bakan yaygın çözüm,
 * yan yana iki tuğlanın arasına giren topu yanlış eksende çeviriyor.
 */
function tuglaAra(
  d: KiriciDurumu,
  duvar: number,
  oncekiX: number,
  oncekiY: number,
): { hucre: number; eksen: "x" | "y" | "xy" } | null {
  const sol = d.topX - TOP_R;
  const sag = d.topX + TOP_R;
  const ust = d.topY - TOP_R;
  const alt = d.topY + TOP_R;

  const ilkSatir = Math.max(0, Math.floor((ust - duvar) / TUGLA_BOY));
  const sonSatir = Math.min(KIRICI_SATIR - 1, Math.floor((alt - duvar) / TUGLA_BOY));
  const ilkSutun = Math.max(0, Math.floor(sol / BIRIM));
  const sonSutun = Math.min(KIRICI_EN - 1, Math.floor(sag / BIRIM));

  for (let s = ilkSatir; s <= sonSatir; s++) {
    for (let k = ilkSutun; k <= sonSutun; k++) {
      const hucre = s * KIRICI_EN + k;
      if (d.tuglalar[hucre] <= 0) continue;
      const kutu = tuglaKutusu(hucre, duvar);
      if (sag <= kutu.sol || sol >= kutu.sag || alt <= kutu.ust || ust >= kutu.alt) continue;

      /* Önceki karede hangi eksende zaten örtüşüyorduk: örtüşen
         eksen "geldiğimiz yön" değil, öteki eksen o. */
      const xVardi = oncekiX + TOP_R > kutu.sol && oncekiX - TOP_R < kutu.sag;
      const yVardi = oncekiY + TOP_R > kutu.ust && oncekiY - TOP_R < kutu.alt;
      const eksen = xVardi && !yVardi ? "y" : yVardi && !xVardi ? "x" : "xy";
      return { hucre, eksen };
    }
  }
  return null;
}

export const kirici: Oyun<KiriciDurumu, KiriciGirdisi> = {
  id: "kirici",
  ad: "Tuğla Kırıcı",
  ozet: "Duvarı indir, tuğlaları hızlı kır",
  emoji: "🧱",
  /* Ölçülen tavan 1.578 (gecikmesiz bot); 4 tick gecikmeli "iyi"
     oyuncunun ortancası 540. 900 iyi bir turun karşılığı. */
  gunlukHedef: 900,

  baslat(tohum) {
    return {
      tohum,
      tur: 1,
      tick: 0,
      turTick: 0,
      skor: 0,
      bitti: false,
      odulVerildi: false,
      ...bolumKur(tohum, 1, 0, false),
    };
  },

  uygula(durum, girdi) {
    if (durum.bitti) return null;

    const dt = girdi.t - durum.tick;
    if (!Number.isInteger(girdi.t) || dt <= 0 || dt > EN_FAZLA_BEKLEME) return null;
    if (!Number.isInteger(girdi.x)) return null;

    const d: KiriciDurumu = { ...durum, tuglalar: [...durum.tuglalar] };
    /* Hedef tahtanın içine kırpılıyor, reddedilmiyor: ekranın kenarına
       basan parmak kuraldışı bir hamle değil. */
    d.hedef = Math.max(0, Math.min(GENISLIK, girdi.x));

    for (let i = 0; i < dt; i++) {
      const tick = durum.tick + i + 1;
      const duvar = duvarUstu(d.tur, d.turTick, tick);

      // ── Palet hedefe doğru, en fazla PALET_HIZ ───────
      const yariEn = Math.floor(paletEni(d.tur) / 2);
      const fark = d.hedef - d.palet;
      const adim = Math.max(-PALET_HIZ, Math.min(PALET_HIZ, fark));
      d.palet = Math.max(yariEn, Math.min(GENISLIK - yariEn, d.palet + adim));

      const sonuc = topAdimi(d, d.tur, duvar);
      d.skor += sonuc.skor;
      if (sonuc.odul) d.odulVerildi = true;

      /*
        Turun iki bitiş sebebi var ve ikisi de gerçek:
          · top tabandan çıktı — beceri
          · duvar palete ulaştı — hız

        ⚠️ İkincisi olmadan oyun kaybedilemiyordu (ölçüldü, 160/160
        tavana dayandı). Paletle savuşturulamayan tek sebep bu.
      */
      if (sonuc.dustu || duvarDibi(d, duvar) >= PALET_Y || tick >= EN_FAZLA_TICK) {
        d.tick = tick;
        d.bitti = true;
        return d;
      }

      // ── Bölüm temizlendi mi ──────────────────────────
      if (d.kalan === 0) {
        d.skor += bolumPuani(d.tur);
        d.tur += 1;
        d.turTick = tick;
        Object.assign(d, bolumKur(d.tohum, d.tur, d.skor, d.odulVerildi));
      }
    }

    d.tick = girdi.t;
    return d;
  },

  bittiMi(durum) {
    return durum.bitti;
  },

  skor(durum) {
    return durum.skor;
  },

  gecenMs(durum) {
    return durum.tick * TICK_MS;
  },

  girdiOku(ham) {
    if (typeof ham !== "object" || ham === null) return null;
    const { t, x } = ham as { t?: unknown; x?: unknown };
    if (typeof t !== "number" || !Number.isInteger(t) || t < 0) return null;
    if (typeof x !== "number" || !Number.isInteger(x)) return null;
    return { t, x };
  },
};

/**
 * Ölçek sabitleri — ekran yüzdeye çevirirken kullanıyor.
 *
 * ⚠️ Ekranın kendi kopyasını yazması, iki tarafın sessizce
 * ayrışmasına açık kapı bırakırdı; aynı tuzak Sekme'de
 * `SEKME_OLCEK`, Bıçak'ta `CEMBER` için de yazılı.
 */
export const KIRICI_OLCEK = {
  BIRIM,
  GENISLIK,
  YUKSEKLIK,
  TOP_R,
  TUGLA_BOY,
  TUGLA_PAY,
  PALET_Y,
  PALET_BOY,
} as const;

/** Bölümün palet genişliği — ekran paleti bununla çiziyor. */
export function kiriciPaletEni(tur: number): number {
  return paletEni(tur);
}

/**
 * Duvarın o andaki üst kenarı — ekran tuğlaları bununla yerleştiriyor.
 *
 * ⚠️ Ekran bunu **her karede** çağırıyor, motorun tick'inde değil
 * kendi saatinde: duvar 20 Hz'de inseydi kayarak değil zıplayarak
 * inerdi. Aynı ayrım Bıçak'ta kütüğün dönüşü için de yazılı.
 */
export function kiriciDuvarUstu(durum: KiriciDurumu, tick: number): number {
  return duvarUstu(durum.tur, durum.turTick, tick);
}

