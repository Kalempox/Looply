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
 */
export const ACI_SAYISI = 61;

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
 * oyuncu bazı açıların daha hızlı olduğunu fark eder.
 */
const YONLER: readonly (readonly [number, number])[] = [
  [213, -57], [210, -66], [207, -75], [203, -84], [199, -93],
  [195, -102], [191, -110], [186, -118], [180, -126], [175, -134],
  [169, -141], [162, -149], [156, -156], [149, -162], [141, -169],
  [134, -175], [126, -180], [118, -186], [110, -191], [102, -195],
  [93, -199], [84, -203], [75, -207], [66, -210], [57, -213],
  [48, -215], [38, -217], [29, -218], [19, -219], [10, -220],
  [0, -220], [-10, -220], [-19, -219], [-29, -218], [-38, -217],
  [-48, -215], [-57, -213], [-66, -210], [-75, -207], [-84, -203],
  [-93, -199], [-102, -195], [-110, -191], [-118, -186], [-126, -180],
  [-134, -175], [-141, -169], [-149, -162], [-156, -156], [-162, -149],
  [-169, -141], [-175, -134], [-180, -126], [-186, -118], [-191, -110],
  [-195, -102], [-199, -93], [-203, -84], [-207, -75], [-210, -66],
  [-213, -57],
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

      t.x += t.vx;
      t.y += t.vy;

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
        continue;
      }

      for (let i = 0; i < nesneler.length; i++) {
        const n = nesneler[i];

        if (n.tur === "blok") {
          const eksen = carpismaEkseni(t.x, t.y, n);
          if (!eksen) continue;
          if (eksen === "x") {
            t.vx = -t.vx;
            t.x += t.vx;
          } else if (eksen === "y") {
            t.vy = -t.vy;
            t.y += t.vy;
          } else {
            // 45°'lik yüzey: bileşen takası. Saf tam sayı.
            const [nvx, nvy] = eksen === "/" ? [-t.vy, -t.vx] : [t.vy, t.vx];
            t.vx = nvx;
            t.vy = nvy;
            t.x += t.vx;
            t.y += t.vy;
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
  ad: "Sekme",
  ozet: "Topu fırlat, blokları kır",
  emoji: "🎯",

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
