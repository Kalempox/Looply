import { ODUL_BONUSU, odulSirasiGeldi } from "./odul";
import { tohumla } from "./rastgele";
import { TICK_MS, type Oyun } from "./sozlesme";

/**
 * Sekme — topu fırlat, blokları kır, satırlar üstünden insin.
 *
 * ── Ü217: neden "Sekme", neden "BBTan" değil ────────────────
 *
 * Ürün sahibi oyunu *"BBTan"* diye istedi ve mekaniği o oyundan
 * çıkardık (`gamesvideos/bbtan.mp4`). Ad Türkçe, çünkü Ü22'den beri
 * kuralımız bu: mekanik tanıdık olabilir, **kimlik bizim**. Blok,
 * Düşen, Yılan — dördüncüsü Sekme. Hem hukuki mesafe hem de ürünün
 * dili tek parça kalıyor.
 *
 * ── 🔴 En zor kısım: sekme fiziği DETERMİNİST olmalı ────────
 *
 * Sunucu turu aynı girdilerle yeniden oynatıp aynı skoru bulmak
 * zorunda (S5). Top sekmesi sürekli bir hareket; en ufak sayısal
 * ayrışma birkaç sekme sonra topu bambaşka yere götürür ve **dürüst
 * oyuncunun turu reddedilir.** Üç önlem:
 *
 * 1. **Kayan nokta yok — sabit noktalı tam sayı.** Konum ve hız
 *    `BIRIM` (1000) ölçekli tam sayılar. Toplama ve çarpma IEEE-754'te
 *    zaten bit düzeyinde belirli; tam sayıda hiç kuşku kalmıyor.
 *
 * 2. **🔴 `Math.cos`/`Math.sin` KULLANILMIYOR.** Bunlar standartta
 *    *"implementation-approximated"* — V8, JavaScriptCore ve SpiderMonkey
 *    son bitlerde ayrışabiliyor. Tarayıcı ile Node farklı sonuç
 *    verirse replay çöker. Yön tablosu bu yüzden **kaynağa gömülü
 *    tam sayı sabiti** (`YONLER`), çalışma zamanında hesaplanmıyor.
 *
 * 3. **Açı sürekli değil, ayrık.** Oyuncu 61 açıdan birini seçiyor;
 *    girdi kaydına giden şey bir tam sayı indeksi. Kayan noktalı bir
 *    açıyı kaydedip yeniden okumak, biçim dönüşümünde bile ayrışma
 *    riski taşırdı.
 *
 * ── Tur yapısı ──────────────────────────────────────────────
 *
 * Bir girdi = bir atış. Motor o atışın tamamını (bütün topların
 * fırlatılıp geri dönmesini) **tek `uygula` çağrısında** simüle
 * ediyor. Yarım kalmış bir atış diye bir durum yok; ekran animasyonu
 * ayrı bir iş (`sekme-ekran.tsx`) ve sonucu değiştirmiyor.
 *
 * Atış bitince her şey bir satır iniyor ve üstten yeni satır geliyor.
 * Tur, blok en alt sıraya değince bitiyor (Ü83: kaybedene kadar).
 */

/** Izgara — klasikteki gibi yedi sütun. */
export const SEKME_EN = 7;
/** Blokların indiği satır sayısı; altındaki şerit fırlatıcının. */
export const SEKME_BOY = 9;

/**
 * Bir hücre kaç birim — sabit noktalı ölçek.
 *
 * ⚠️ 1000 bilinçli: hız (220) ve top yarıçapı (120) buna göre
 * seçildi. Daha küçük bir ölçekte yuvarlama hataları sekme açısını
 * gözle görülür biçimde bozuyor; daha büyüğü 32 bitlik tam sayı
 * aralığına yaklaşmadan bir şey kazandırmıyor.
 */
const BIRIM = 1000;

const GENISLIK = SEKME_EN * BIRIM;
const YUKSEKLIK = SEKME_BOY * BIRIM;

/** Topun yarıçapı. */
const TOP_R = 120;

/**
 * Atışın açı sayısı — 15°'den 165°'ye.
 *
 * ⚠️ Yatayın altına inen açı YOK: top doğrudan yana gidip duvarlar
 * arasında sonsuza kadar sekerdi. 15°'lik pay, en yatay atışın bile
 * er geç tavana ulaşmasını garantiliyor.
 *
 * 🔴 Sayı Ü243'te 61'den 60'a indi ve bu bir denge ayarı DEĞİL.
 * 61 tek sayıydı, yani tablonun tam ortasında **90°** vardı:
 * `[0, -220]`. Sıfır bileşenli tek vektör oydu ve oyunu kilitliyordu
 * (aşağıya bakın). Çift sayıda açıyla 90°'ye hiç denk gelinmiyor;
 * en dikeye yakın iki açı `[5, -220]` ve `[-5, -220]`.
 */
export const ACI_SAYISI = 60;

/**
 * Yön tablosu — **kaynağa gömülü**, çalışma zamanında hesaplanmıyor.
 *
 * 🔴 `Math.cos(aci) * HIZ` yazmak en doğal yol olurdu ve replay'i
 * kırardı: trigonometrik fonksiyonlar JS standardında bit düzeyinde
 * tanımlı değil. Tablo bir kez üretilip buraya yazıldı; hız 220
 * birim/adım, en büyük yuvarlama sapması %0,28.
 *
 * ⚠️ Bu diziye elle dokunulmamalı. Değiştirilecekse yeniden üretilip
 * **tamamı** değişmeli, yoksa açılar arasında hız farkı oluşur ve
 * oyuncu bazı açıların daha hızlı olduğunu fark eder. Ü243'te tam da
 * öyle yapıldı: tablo 60 açıyla baştan üretildi, hız sapması %0,28'den
 * %0,24'e indi.
 *
 * ── 🔴 DEĞİŞMEZ: hiçbir vektörün bileşeni SIFIR olamaz ──────
 *
 * Ürün sahibi *"toplar böyle sağa sola giderken bugta kaldı"* dedi ve
 * sebebi ölçüldü: sınıra dayanan dokuz atışın dokuzu da **açı 30**,
 * yani eski tablodaki tam dikey `[0, -220]`.
 *
 * Mekanizma: 45°'lik üçgen yüzey bileşenleri **takas ediyor**
 * (`[-vy, -vx]`). Dikey bir top (vx = 0) üçgene çarpınca
 * `vy = -vx = 0` oluyor. Yansıma fiziksel olarak DOĞRU — hata
 * oyunda yerçekimi olmamasında: `vy = 0` olan top eve dönemiyor,
 * iki duvar arasında `EN_FAZLA_ADIM`a kadar sekiyor. Oyuncunun
 * gördüğü şey ortada asılı kalmış toplar.
 *
 * Değişmez kendini koruyor: duvar ve eksen çarpışmaları yalnızca
 * işaret çeviriyor (sıfır üretemez), takas ise bir bileşeni
 * ötekinden alıyor — ikisi de sıfırdan farklıysa sonuç da öyle.
 * Tek giriş kapısı bu tablo, o yüzden bekçilik `tests`te tabloya
 * bakıyor.
 */
const YONLER: readonly (readonly [number, number])[] = [
  [213, -57], [210, -66], [207, -76], [203, -85], [199, -94],
  [195, -102], [190, -111], [185, -119], [179, -127], [174, -135],
  [167, -143], [161, -150], [154, -157], [147, -164], [140, -170],
  [132, -176], [124, -182], [116, -187], [107, -192], [99, -197],
  [90, -201], [81, -205], [72, -208], [63, -211], [53, -213],
  [44, -216], [34, -217], [24, -219], [15, -220], [5, -220],
  [-5, -220], [-15, -220], [-24, -219], [-34, -217], [-44, -216],
  [-53, -213], [-63, -211], [-72, -208], [-81, -205], [-90, -201],
  [-99, -197], [-107, -192], [-116, -187], [-124, -182], [-132, -176],
  [-140, -170], [-147, -164], [-154, -157], [-161, -150], [-167, -143],
  [-174, -135], [-179, -127], [-185, -119], [-190, -111], [-195, -102],
  [-199, -94], [-203, -85], [-207, -76], [-210, -66], [-213, -57],
];

/**
 * Bir atışın en fazla kaç adım sürebileceği.
 *
 * 🔴 Güvenlik sınırı, denge ayarı değil. Top teorik olarak iki duvar
 * arasında neredeyse yatay sekip çok uzun süre dönebiliyor; sınır
 * olmasaydı **sunucu tek bir girdiyle sonsuz döngüye girerdi.**
 * Sınıra dayanan toplar zorla eve çağrılıyor — oyuncu bir şey
 * kaybetmiyor, atış bitmiş sayılıyor.
 */
const EN_FAZLA_ADIM = 4000;

/** Toplar arasındaki fırlatma gecikmesi (adım). */
const ATIS_ARALIGI = 6;

/**
 * Topun koruduğu en az dikey hız — Ü243.
 *
 * ── 🔴 15°'lik yatay payı ÇARPIŞMA SONRASI da geçerli ───────
 *
 * `ACI_SAYISI` notu şunu söylüyor: *"yatayın altına inen açı yok,
 * 15°'lik pay en yatay atışın bile er geç tavana ulaşmasını
 * garantiliyor."* O kural **fırlatma anında** uygulanıyordu ama
 * çarpışmadan sonra değil.
 *
 * 45°'lik üçgen yüzey bileşenleri takas ediyor, yani çarpışmadan
 * sonraki dikey hız **çarpışmadan önceki yatay hıza** eşit oluyor.
 * Dikeye yakın bir atış (`[5, -220]`) üçgene çarpınca `[220, -5]`
 * oluyor: neredeyse yatay. Yerçekimi olmadığı için o top eve
 * dönemiyor, `EN_FAZLA_ADIM`a kadar duvarlar arasında sekiyor ve
 * oyuncu ortada asılı kalmış toplar görüyor.
 *
 * Ölçüldü: tablodaki tam dikey kaldırıldıktan sonra bile 9.720
 * atışın 2'si sınıra dayanıyordu ve ikisi de en dikeye yakın
 * açılardı.
 *
 * Kural artık her adımda geçerli: dikey hız 57'nin altına düşerse
 * 57'ye çekiliyor ve yatay hız 213 oluyor — yani **tablonun en
 * yatay vektörü**. Hız 220'de kalıyor, yeni bir sayı uydurulmuyor.
 *
 * ⚠️ Fizik açısından bir düzeltme, bir "fudge" değil: oyunun
 * kutusunda yerçekimi yok ve yatay kalan top tanımsız süre yaşıyor.
 * Aynı gerekçe fırlatma açısını da 15°'de sınırlıyor.
 */
const EN_AZ_DIKEY = 57;
/** `EN_AZ_DIKEY`in eşi — `213² + 57² ≈ 220²`, tablonun ilk satırı. */
const DIKEY_ESI_YATAY = 213;

/**
 * Dikey hızı en az `EN_AZ_DIKEY` yapar — saf tam sayı.
 *
 * ⚠️ İşaret korunuyor: top yukarı gidiyorsa yukarı gitmeye devam
 * ediyor, yalnızca eğimi dikleşiyor. `vy` sıfırsa aşağı seçiliyor;
 * yön tablosunda sıfır bileşen olmadığı için buraya gelinmemeli ama
 * gelinirse eve gitmek güvenli taraf.
 */
function dikeyKoru(t: Top): void {
  if (t.vy >= EN_AZ_DIKEY || t.vy <= -EN_AZ_DIKEY) return;
  t.vy = t.vy < 0 ? -EN_AZ_DIKEY : EN_AZ_DIKEY;
  t.vx = t.vx < 0 ? -DIKEY_ESI_YATAY : DIKEY_ESI_YATAY;
}

/**
 * Bir adımın kaç parçada yürüneceği — Ü280.
 *
 * 🔴 Ürün sahibi: *"sekme oyununda top arada blokların içinden geçiyor."*
 * Ölçüldü: 300 rastgele oyunun 345.199 karesinin 111'inde topun merkezi
 * bloğun dolu kısmına 100 birimden (tek adımın olağan payı) derin
 * giriyordu, en derini 222 — yarısından çoğu üçgende, örnekler duvar
 * dibindeki bloklarda. Top adımda 220 birim ilerliyor; çarpışma ancak
 * iç içe geçtikten sonra görülüyor ve eski çözüm topu "hızı kadar geri"
 * itiyordu. Duvar yansıması ya da yanlış seçilen eksen topu bir bloğun
 * içine geri bırakabiliyordu.
 *
 * Adım dört parçada yürünüyor (her parça ≤ 55 birim) ve çarpışan top
 * **parçanın başına dönüyor** — hiç içeri girmeden yansıyor. Dört, ikinin
 * kuvveti: `v · j / 4` ikili kayan noktada TAM, determinizm bozulmuyor.
 * Kare sayısı değişmiyor (kayıt adım başına bir kare).
 */
const ALT_ADIM = 4;

/** `v`nin `j`. parçası — parçaların toplamı tam olarak `v`. Saf tam sayı. */
function parca(v: number, j: number): number {
  return Math.trunc((v * j) / ALT_ADIM) - Math.trunc((v * (j - 1)) / ALT_ADIM);
}

/** Hücrenin içinde bloğun kapladığı pay — kenarda boşluk kalıyor. */
const BLOK_PAY = 60;

/**
 * Üçgen bloğun **dik açısının** hangi köşede olduğu.
 *
 * Hipotenüs, dik açının karşısındaki köşegen: 0 ve 2 ters köşegende
 * (`/`), 1 ve 3 ana köşegende (`\\`). Sekme yönü yalnızca buna bağlı.
 */
export type UcgenYonu = 0 | 1 | 2 | 3;

export type SekmeNesnesi =
  /**
   * Numaralı blok; `can` vurulunca azalıyor.
   *
   * `ucgen` verilirse hücrenin **yarısını** kaplıyor ve topu 45°
   * saptırıyor — ürün sahibi: *"bazı küpler yarım olmalı üçgen
   * şeklinde."* Gerçek oyunda da böyle ve oyunun asıl derinliği
   * orada: köşeye sıkışmış blokları ancak üçgenden sektirerek
   * vurabiliyorsun.
   */
  | { tur: "blok"; s: number; k: number; can: number; ucgen?: UcgenYonu }
  /** Toplanınca top sayısını bir artırıyor. */
  | { tur: "top"; s: number; k: number }
  /**
   * Ödül paketi — Ü207'nin kuralı, Ü217'de bu oyuna taşındı.
   *
   * Ürün sahibi bu oyun için özellikle *"üstten düşsün"* dedi ve
   * burada bedava geliyor: zaten her şey üstten iniyor. Paket yeni
   * satırla birlikte doğuyor ve oyuncuya doğru süzülüyor.
   */
  | { tur: "odul"; s: number; k: number };

export type SekmeDurumu = {
  tohum: string;
  nesneler: SekmeNesnesi[];
  /** Kaç atış yapıldı — yeni satır bundan türüyor. */
  tur: number;
  /** Eldeki top sayısı. */
  top: number;
  /** Fırlatıcının yatay konumu (birim). */
  firlatici: number;
  skor: number;
  tick: number;
  /** Ödül paketi bu turda teslim edildi mi (Ü203). */
  odulVerildi: boolean;
  /** Blok en alta değdi — turun tek bitiş yolu. */
  doldu: boolean;
};

export type SekmeGirdisi = {
  /** Kaçıncı atış — sıra denetimi için. */
  t: number;
  /** Açı indeksi (0..ACI_SAYISI-1). */
  a: number;
};

/* ═══════════════════════════════════════════════════════════
   Yeni satır
   ═══════════════════════════════════════════════════════════ */

/**
 * Bir turda kaç can veriliyor — zorluk eğrisi (Ü83).
 *
 * Blok canı tur sayısıyla artıyor, yani aynı blok gitgide daha çok
 * atış istiyor. Izgara büyümüyor, hız değişmiyor; artan tek şey
 * dayanıklılık. Oyun böylece **öğrenilebilir** kalıyor.
 */
function turunCani(tur: number): number {
  return 1 + Math.floor(tur / 2);
}

/**
 * Üstten gelen yeni satır.
 *
 * ⚠️ Tamamen `(tohum, tur)`dan türüyor — sunucu aynı satırı buluyor.
 *
 * ⚠️ En az bir hücre BOŞ bırakılıyor: tam dolu bir satır, topun
 * yukarı çıkıp arkadan vurmasını imkânsız kılar ve oyunu sıkıcı bir
 * duvar dövmeye çevirir.
 */
function yeniSatir(tohum: string, tur: number): SekmeNesnesi[] {
  const r = tohumla(`${tohum}:sekme:${tur}`);
  const can = turunCani(tur);
  const out: SekmeNesnesi[] = [];

  /** Bu satırda kaç hücre dolacak — hiç değilse biri boş kalıyor. */
  const dolu = 2 + r.tamsayi(SEKME_EN - 2);
  const sira = [...Array(SEKME_EN).keys()];
  // Fisher–Yates, tohumdan: hangi sütunların dolacağını seçiyor.
  for (let i = sira.length - 1; i > 0; i--) {
    const j = r.tamsayi(i + 1);
    [sira[i], sira[j]] = [sira[j], sira[i]];
  }

  for (let i = 0; i < dolu; i++) {
    /*
      Üçgen olasılığı — Ü218.

      ⚠️ İlk turlarda YOK ve bu bilinçli: oyuncu önce düz sekmeyi
      öğrenmeli (docs/03'ün öğrenme turu). Üçüncü turdan sonra
      görünüyor ve oranı sabit kalıyor; artan bir oran, ileri turlarda
      tahtayı baştan başa köşegene çevirir ve nişan almayı kumara
      dönüştürürdü.
    */
    const ucgenMi = tur >= 3 && r.tamsayi(100) < 28;
    out.push(
      ucgenMi
        ? { tur: "blok", s: 0, k: sira[i], can, ucgen: r.tamsayi(4) as UcgenYonu }
        : { tur: "blok", s: 0, k: sira[i], can },
    );
  }

  /*
    Top hediyesi — boş kalan sütunlardan birine.

    ⚠️ Her turda değil: her turda gelseydi top sayısı doğrusal artar
    ve oyun otuzuncu turdan sonra kendi kendini oynardı.
  */
  if (dolu < SEKME_EN && r.tamsayi(100) < 45) {
    out.push({ tur: "top", s: 0, k: sira[dolu] });
  }

  return out;
}

/* ═══════════════════════════════════════════════════════════
   Çarpışma
   ═══════════════════════════════════════════════════════════ */

/** Bir bloğun sabit noktalı kutusu. */
function blokKutusu(n: SekmeNesnesi) {
  return {
    sol: n.k * BIRIM + BLOK_PAY,
    sag: (n.k + 1) * BIRIM - BLOK_PAY,
    ust: n.s * BIRIM + BLOK_PAY,
    alt: (n.s + 1) * BIRIM - BLOK_PAY,
  };
}

/** Toplanabilir nesnenin merkezi ve yarıçapı. */
function nesneMerkezi(n: SekmeNesnesi) {
  return { x: n.k * BIRIM + BIRIM / 2, y: n.s * BIRIM + BIRIM / 2, r: 260 };
}

/**
 * Topun bir blokla çarpışması — nasıl sekeceği.
 *
 * ⚠️ Dikdörtgende eksen, **girişin derinliğine** göre seçiliyor: top
 * kutuya hangi yönden daha az girdiyse o yüzden girmiştir. Saf "hıza
 * bak" kuralı köşe vuruşlarında yanlış eksen seçip topu bloğun içine
 * sokuyordu.
 *
 * 🔴 Üçgende hipotenüs sekmesi **bileşen takası**: `/` için
 * `(vx,vy) → (−vy,−vx)`, `\\` için `(vx,vy) → (vy,vx)`. 45°'lik bir
 * yüzeyin yansıması tam olarak budur ve **saf tam sayı işlemi** —
 * kök ya da trigonometri gerekmiyor, determinizm bozulmuyor.
 *
 * @returns `null` çarpışma yok · `"x"` · `"y"` · `"/"` · `"\\"`
 */
type Sekme = "x" | "y" | "/" | "\\";

function carpismaEkseni(x: number, y: number, n: SekmeNesnesi): Sekme | null {
  const k = blokKutusu(n);
  // En yakın nokta — daire/dikdörtgen testi.
  const yx = Math.max(k.sol, Math.min(x, k.sag));
  const yy = Math.max(k.ust, Math.min(y, k.alt));
  const dx = x - yx;
  const dy = y - yy;
  if (dx * dx + dy * dy > TOP_R * TOP_R) return null;

  const ucgen = n.tur === "blok" ? n.ucgen : undefined;
  if (ucgen !== undefined) {
    /*
      Hipotenüse uzaklık — **kök YOK.**

      Köşegene dik uzaklık `|d| / √2`; bunu `TOP_R` ile karşılaştırmak
      yerine iki tarafın karesi alınıyor: `d² ≤ 2·TOP_R²`. Tam sayıda
      birebir aynı karar, kayan nokta hiç girmiyor.
    */
    const anaKosegen = ucgen === 1 || ucgen === 3;
    const d = anaKosegen
      ? y - k.ust - (x - k.sol)
      : x - k.sol + (y - k.ust) - (k.sag - k.sol);

    if (d * d <= 2 * TOP_R * TOP_R) return anaKosegen ? "\\" : "/";

    /*
      Hipotenüsten uzaktaysa top ya dik kenarlardan birine vurdu ya da
      üçgenin boş yarısında. ⚠️ Boş yarıda **çarpışma yok**: üçgenin
      olmayan tarafından sektirmek oyunu yalan söyler.
    */
    const doluTaraf = anaKosegen ? (ucgen === 3 ? d > 0 : d < 0) : ucgen === 2 ? d > 0 : d < 0;
    if (!doluTaraf) return null;
  }

  // Kutunun içindeysek ya da kenarındaysak: hangi yüzden çıkmak daha yakın?
  const solaCikis = x - k.sol + TOP_R;
  const sagaCikis = k.sag - x + TOP_R;
  const ustCikis = y - k.ust + TOP_R;
  const altCikis = k.alt - y + TOP_R;
  const yatay = Math.min(solaCikis, sagaCikis);
  const dikey = Math.min(ustCikis, altCikis);
  return yatay < dikey ? "x" : "y";
}

/* ═══════════════════════════════════════════════════════════
   Atış
   ═══════════════════════════════════════════════════════════ */

type Top = { x: number; y: number; vx: number; vy: number; canli: boolean };

/** Ekranın oynatacağı tek kare: topların yeri ve o andaki nesneler. */
export type AtisKaresi = {
  toplar: readonly { x: number; y: number }[];
  /**
   * O karedeki nesneler.
   *
   * ⚠️ Değişmediği karelerde **aynı dizi paylaşılıyor**, kopyalanmıyor.
   * Bir atış binlerce kare sürebiliyor ve her karede yirmi nesneyi
   * kopyalamak boşuna bellek olurdu.
   */
  nesneler: readonly SekmeNesnesi[];
};

type AtisSonucu = {
  nesneler: SekmeNesnesi[];
  skor: number;
  top: number;
  firlatici: number;
  adim: number;
};

/**
 * Bir atışın tamamını simüle eder.
 *
 * 🔴 **Fiziğin TEK gövdesi.** Motor sonucu buradan, ekran animasyonu
 * da buradan alıyor. İki ayrı kopya olsaydı — ki ilk yazımda öyleydi —
 * biri diğerinden ayrışır ve ekranda kırılan blok sunucuda sağlam
 * kalırdı. `kayit` yalnızca bir dinleyici: fizik onun varlığından
 * habersiz.
 *
 * 🔴 **Saf.** Aynı durum + aynı açı her yerde aynı sonucu veriyor:
 * tam sayı aritmetiği, gömülü yön tablosu, sınırlı adım sayısı.
 *
 * @param kayit Verilirse her adımın karesi buraya yazılıyor.
 */
function simule(durum: SekmeDurumu, aci: number, kayit: AtisKaresi[] | null): AtisSonucu {
  const [vx0, vy0] = YONLER[aci];
  let nesneler = durum.nesneler.map((n) => ({ ...n }));
  const toplar: Top[] = Array.from({ length: durum.top }, () => ({
    x: durum.firlatici,
    y: YUKSEKLIK - TOP_R,
    vx: vx0,
    vy: vy0,
    canli: false,
  }));

  let skor = durum.skor;
  let kazanilanTop = 0;
  /** İlk yere düşen topun yeri — sıradaki atışın çıkış noktası. */
  let yeniFirlatici = -1;
  let adim = 0;
  /** Nesne listesi bu adımda değişti mi — kayıt paylaşımı için. */
  let degisti = true;

  for (; adim < EN_FAZLA_ADIM; adim++) {
    const firlatilacak = Math.floor(adim / ATIS_ARALIGI);
    if (firlatilacak < toplar.length && adim % ATIS_ARALIGI === 0) {
      toplar[firlatilacak].canli = true;
    }

    let hareketli = false;
    const kare: { x: number; y: number }[] | null = kayit ? [] : null;

    for (const t of toplar) {
      if (!t.canli) {
        if (adim < toplar.length * ATIS_ARALIGI) hareketli = true;
        continue;
      }
      hareketli = true;

      // Ü280: adım `ALT_ADIM` parçada yürünüyor — bkz. sabitin notu.
      for (let j = 1; j <= ALT_ADIM; j++) {
        /** Parçanın başı — hiçbir blokla iç içe olmadığı bilinen yer. */
        const oncekiX = t.x;
        const oncekiY = t.y;
        t.x += parca(t.vx, j);
        t.y += parca(t.vy, j);

        // Duvarlar — yansıma, aşan mesafe geri veriliyor.
        if (t.x < TOP_R) {
          t.x = TOP_R + (TOP_R - t.x);
          t.vx = -t.vx;
        } else if (t.x > GENISLIK - TOP_R) {
          t.x = GENISLIK - TOP_R - (t.x - (GENISLIK - TOP_R));
          t.vx = -t.vx;
        }
        // Tavan.
        if (t.y < TOP_R) {
          t.y = TOP_R + (TOP_R - t.y);
          t.vy = -t.vy;
        }

        // Zemin — top eve döndü.
        if (t.y >= YUKSEKLIK - TOP_R) {
          t.canli = false;
          if (yeniFirlatici < 0) yeniFirlatici = t.x;
          break;
        }

        for (let i = 0; i < nesneler.length; i++) {
          const n = nesneler[i];

          if (n.tur === "blok") {
            const eksen = carpismaEkseni(t.x, t.y, n);
            if (!eksen) continue;
            /*
              🔴 Ü280: top parçanın BAŞINA dönüyor, sonra yansıyor.

              Eskiden hız çevrilip top "hızı kadar geri" itiliyordu; iç
              içe geçmiş top bu itmeyle başka bir bloğun ya da aynı bloğun
              içine düşebiliyordu. Parçanın başı hiçbir blokla iç içe
              değil (bir önceki parça ya çarpışmasızdı ya da aynı yolla
              geri alındı) — top ekranda bloğa hiç girmiyor.
            */
            t.x = oncekiX;
            t.y = oncekiY;
            if (eksen === "x") {
              t.vx = -t.vx;
            } else if (eksen === "y") {
              t.vy = -t.vy;
            } else {
              // 45°'lik yüzey: bileşen takası. Saf tam sayı.
              const [nvx, nvy] = eksen === "/" ? [-t.vy, -t.vx] : [t.vy, t.vx];
              t.vx = nvx;
              t.vy = nvy;
            }
            if (!degisti) {
              nesneler = nesneler.map((m) => ({ ...m }));
              degisti = true;
            }
            // ⚠️ Kopyalamadan SONRA okunuyor: `n` kopyalamadan önceki
            // diziye bakıyor ve ona yazmak kaydedilmiş kareyi bozardı.
            const vurulan = nesneler[i];
            if (vurulan.tur !== "blok") break;
            vurulan.can -= 1;
            skor += 5;
            if (vurulan.can <= 0) {
              nesneler.splice(i, 1);
              skor += 15;
              i--;
            }
            break;
          }

          const m = nesneMerkezi(n);
          const dx = t.x - m.x;
          const dy = t.y - m.y;
          if (dx * dx + dy * dy > m.r * m.r) continue;

          if (n.tur === "top") {
            if (!degisti) {
              nesneler = nesneler.map((q) => ({ ...q }));
              degisti = true;
            }
            kazanilanTop += 1;
            nesneler.splice(i, 1);
            i--;
          } else {
            // Ödül paketi — dokunmak topluyor, sekme YOK.
            if (!degisti) {
              nesneler = nesneler.map((q) => ({ ...q }));
              degisti = true;
            }
            nesneler.splice(i, 1);
            i--;
          }
        }

        /* Ü243: 15°'lik pay çarpışmadan sonra da korunuyor.
           Tablodan gelen hızlar zaten sınırın üstünde, yani bu çağrı
           yalnızca çarpışma bileşenleri takas ettiğinde iş yapıyor. */
        dikeyKoru(t);
      }

      // Eve dönen top bu karede çizilmiyor (eskisi gibi).
      if (!t.canli) continue;
      if (kare) kare.push({ x: t.x, y: t.y });
    }

    if (kayit && kare) {
      kayit.push({ toplar: kare, nesneler });
      degisti = false;
    }

    if (!hareketli) break;
  }

  if (yeniFirlatici < 0) yeniFirlatici = durum.firlatici;

  return {
    nesneler,
    skor,
    top: durum.top + kazanilanTop,
    firlatici: Math.max(TOP_R, Math.min(GENISLIK - TOP_R, yeniFirlatici)),
    adim,
  };
}

/* ═══════════════════════════════════════════════════════════
   Arayüz için saf yardımcılar
   ═══════════════════════════════════════════════════════════ */

/*
 * `aciYonu` Ü241'de SİLİNDİ.
 *
 * Nişan çizgisini ekran düz bir ışın olarak çiziyordu ve yön
 * vektörünü buradan alıyordu. Ü241'de kılavuz gerçek yörüngeye
 * geçti (`atisIzi`), yani ekranın tek bir açının yönüne ihtiyacı
 * kalmadı. Çağrılmayan kod bırakılmıyor; git geçmişi saklıyor.
 */

/** Ölçek sabitleri — ekran yüzdeye çevirirken kullanıyor. */
export const SEKME_OLCEK = { BIRIM, GENISLIK, YUKSEKLIK, TOP_R } as const;

/**
 * Atışın kare kare izi — ekran topları buradan oynatıyor.
 *
 * ⚠️ Motor **animasyon üretmiyor**, sonucu hesaplıyor; iz, aynı
 * hesabın yol boyunca kaydedilmiş hâli. Ayrı bir animasyon kodu
 * yazılsaydı ekrandaki top ile sunucudaki top farklı yerlere giderdi.
 */
export function atisIzi(durum: SekmeDurumu, aci: number): AtisKaresi[] {
  const kayit: AtisKaresi[] = [];
  simule(durum, aci, kayit);
  return kayit;
}

/* ═══════════════════════════════════════════════════════════
   Oyun
   ═══════════════════════════════════════════════════════════ */

export const sekme: Oyun<SekmeDurumu, SekmeGirdisi> = {
  id: "sekme",
  ad: "Blok Kırıcı",
  ozet: "Topları fırlat, blokları patlat",
  emoji: "🎯",
  /* Ölçüm (25 tur, iyi oyuncu botu): tur ortanca 161, skor ortanca
     139.945. Ailenin en yüksek ölçeği — burada 2.000 görev değil,
     ilk yarım dakika. */
  gunlukHedef: 20_000,

  baslat(tohum) {
    return {
      tohum,
      nesneler: yeniSatir(tohum, 0),
      tur: 0,
      top: 1,
      firlatici: GENISLIK / 2,
      skor: 0,
      tick: 0,
      odulVerildi: false,
      doldu: false,
    };
  },

  uygula(durum, girdi) {
    if (durum.doldu) return null;
    // Atışlar sırayla: kayıt karıştırılamaz.
    if (girdi.t !== durum.tur) return null;
    if (!Number.isInteger(girdi.a) || girdi.a < 0 || girdi.a >= ACI_SAYISI) return null;

    const sonuc = simule(durum, girdi.a, null);
    const tur = durum.tur + 1;

    /*
      Ödül paketi teslim edildi mi — Ü203'ün kuralı.

      Paket, topların dokunduğu bir nesne değil: atış bitince
      kaldırılmış olup olmadığına bakılıyor. ⚠️ **Sıfır puan** veriyor
      (`ODUL_BONUSU`); toplamada duruyor çünkü sıfır olduğu görünür
      olmalı — sessizce puana bağlanması Ü201'in ekonomi kaymasını
      geri getirir.
    */
    const oncekiOdul = durum.nesneler.some((n) => n.tur === "odul");
    const kalanOdul = sonuc.nesneler.some((n) => n.tur === "odul");
    const teslim = oncekiOdul && !kalanOdul;

    // Her şey bir satır iniyor.
    const inen = sonuc.nesneler.map((n) => ({ ...n, s: n.s + 1 }));
    const doldu = inen.some((n) => n.tur === "blok" && n.s >= SEKME_BOY - 1);

    const yeniSkor = sonuc.skor + (teslim ? ODUL_BONUSU : 0);
    const yeni = yeniSatir(durum.tohum, tur);

    /*
      Paket yeni satırla birlikte doğuyor — ürün sahibi bu oyun için
      özellikle *"üstten düşsün"* dedi ve burada bedava geliyor.

      ⚠️ Kural `odul.ts`te ortak: eşik geçilmiş olacak ve paket bu
      turda henüz teslim edilmemiş olacak. Motor konumu (kafede mi)
      bilmiyor ve bilmemeli; gizlemek ekranın işi.
    */
    const verildi = durum.odulVerildi || teslim;
    if (odulSirasiGeldi(yeniSkor, verildi) && !kalanOdul) {
      const bos = [...Array(SEKME_EN).keys()].filter(
        (k) => !yeni.some((n) => n.k === k),
      );
      if (bos.length > 0) {
        const r = tohumla(`${durum.tohum}:sekme-odul:${tur}`);
        yeni.push({ tur: "odul", s: 0, k: bos[r.tamsayi(bos.length)] });
      }
    }

    return {
      ...durum,
      nesneler: doldu ? inen : [...inen, ...yeni],
      tur,
      top: sonuc.top,
      firlatici: sonuc.firlatici,
      skor: yeniSkor,
      tick: durum.tick + sonuc.adim,
      odulVerildi: verildi,
      doldu,
    };
  },

  bittiMi(durum) {
    return durum.doldu;
  },

  skor(durum) {
    return durum.skor;
  },
  /* Ü275 · "görünürse kesin": sunucu paketin gerçekten tahtada olduğunu
     ve oyuncuya ulaştığını bu ikisiyle görüyor (sözleşmedeki not). */
  odulVar(durum) {
    return durum.nesneler.some((n) => n.tur === "odul");
  },
  odulTeslim(durum) {
    return durum.odulVerildi;
  },

  gecenMs(durum) {
    return durum.tick * TICK_MS;
  },

  girdiOku(ham) {
    if (typeof ham !== "object" || ham === null) return null;
    const o = ham as Record<string, unknown>;
    if (typeof o.t !== "number" || !Number.isInteger(o.t) || o.t < 0 || o.t > 10_000) return null;
    if (typeof o.a !== "number" || !Number.isInteger(o.a) || o.a < 0 || o.a >= ACI_SAYISI) {
      return null;
    }
    return { t: o.t, a: o.a };
  },
};
