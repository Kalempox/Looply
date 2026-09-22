import { tohumla } from "./rastgele";
import { TICK_MS, type Oyun } from "./sozlesme";
import { odulSirasiGeldi } from "./odul";

/**
 * Bıçak — dönen kütüğe sapla, saplı bıçağa değme (Ü235).
 *
 * ── Referans ────────────────────────────────────────────────
 *
 * Ürün sahibinin verdiği bağlantı: Ketchapp'in **Knife Hit**'i
 * (`play.google.com/store/apps/details?id=com.ketchapp.knifehit`).
 * Sayfadaki tarif: *"Throw the knives into the logs to break them.
 * Slash the apples… Be careful to not hit the knives."* Her beşinci
 * bölüm bir boss.
 *
 * Alınan şey: dönen kütük, aşağıdan atılan bıçak, saplı bıçağa değince
 * kaybetme, elma bonusu, bölüm bölüm hızlanma.
 *
 * ── 🔴 Neden bu oyun determinizme UYGUN ─────────────────────
 *
 * Ü217'de Sekme için kurulan kural şuydu: `Math.cos`/`sin` JS
 * standardında *"implementation-approximated"* ve motorlar son
 * bitlerde ayrışıyor; sunucu turu yeniden oynattığında başka sonuç
 * bulursa **dürüst oyuncunun turu reddediliyor.** Sekme'de bu, gömülü
 * yön tablosuyla çözülmüştü.
 *
 * Burada o soruna hiç girilmiyor: oyunun tamamı **açı**. Kütüğün yeri
 * bir sayı, bıçakların yeri birer sayı, çarpışma iki açının farkı.
 * Trigonometri yalnızca **çizimde** gerekiyor ve çizim tekrar
 * oynatılmıyor.
 *
 * ⚠️ Açı birimi **onda bir derece** (0–3599), derece değil: tam sayıda
 * kalabilmek için. Saniyede 20 tick ve tur başına 900 birim hızda
 * derece kesirli olurdu.
 *
 * ── Zaman istemcide, tıpkı Düşen'de olduğu gibi ─────────────
 *
 * Girdi `{ t }` — bıçağın atıldığı **tick**. Kütüğün açısı
 * `(baslangic + hiz × geçenTick)` ile analitik hesaplanıyor, tick tick
 * ilerlenmiyor: oyuncu iki atış arasında bin tick bekleyebilir ve
 * döngü sunucuda boşa dönerdi.
 *
 * ⚠️ `gecenMs` bu yüzden şart (Ü84): az tick bildiren oyuncu kütüğü
 * yavaşlatır. Sunucu gerçek süreyi biliyor ve karşılaştırıyor.
 */

/**
 * Tam çember — onda bir derece.
 *
 * ⚠️ Dışa açık: ekran kütüğün açısını her karede kendisi hesaplıyor
 * (motor yalnızca atış anlarını biliyor) ve bunu yaparken **motorla
 * aynı birimi** kullanmak zorunda. Ekranın kendi çember sabitini
 * yazması, iki tarafın sessizce ayrışmasına açık kapı bırakırdı —
 * aynı tuzak Sekme'de `carpismaEkseni` için de yazılı.
 */
export const CEMBER = 3600;

/**
 * Bıçağın kütüğe girdiği ekran açısı — tam alt.
 *
 * ⚠️ Sabit: bıçak her zaman aşağıdan geliyor. Değişen şey kütüğün
 * açısı, bıçağın yolu değil. Oyunun bütün zorluğu bu tek sabitten
 * doğuyor — nereye saplanacağını kütüğün o andaki yeri belirliyor.
 */
export const GIRIS_ACISI = 1800;

/**
 * İki bıçağın çakıştığı sayılacağı açı farkı.
 *
 * ── 🔴 Ürün sahibi: *"tahtaya gönderecek gibi olmama rağmen
 *    bıçağa çarpıyor"* ─────────────────────────────────────
 *
 * Haklıydı ve sebebi ölçüldü. Bu sabit **200 (20°)** idi ama bıçak
 * ekranda o kadar yer kaplamıyordu: `bicak-ekran.tsx`teki çizim
 * ölçülerinden (en 6,4%, ucun yarıçapı 23%) bıçağın en geniş
 * yerindeki açısal genişliği **13,8°** çıkıyordu.
 *
 * Sonuç, oyuncunun gördüğüyle motorun uyguladığı kuralın ayrışması:
 *
 *   · motor, bıçaklar değmesine **6,2° kala** reddediyordu
 *   · iki bıçak arasına atabilmek için 40°'lik aralık gerekiyordu
 *   · o aralıkta **26°'lik görünür boşluk** oluyordu
 *   · oyuncu 26°'lik boşluğa 14°'lik bıçağı sokamıyordu
 *
 * Yani gözle rahat sığan yer motorda doluydu. Oyun yalan söylüyordu.
 *
 * ── Kural artık ÇİZİMDEN türüyor ────────────────────────────
 *
 * Bıçak inceltildi (ürün sahibi *"çok kalın"* dedi): en 4,6%, açısal
 * genişlik **9,96°**. Sabit ona eşitlendi: 100 = 10,0°.
 *
 * 🔴 İkisi birlikte değişmek zorunda. `bicak-ekran.tsx`te en
 * değişirse buradaki sayı da değişmeli, yoksa aynı yalan geri gelir.
 * Hesap: `2 · atan((en/2) / (KUTUK_R − BATMA + BICAK_BOY·0,62·0,26))`.
 *
 * ⚠️ Eşitlik tam: iki bıçak ancak **değecek kadar** yaklaşınca
 * çarpışıyor. Karşılaştırma `<` olduğu için tam temas hâlâ geçerli
 * atış — oyuncu kılpayı sığdırabiliyor ve bunu görüyor.
 */
const CAKISMA = 100;

/**
 * Çemberin geometrik kapasitesi — `CAKISMA`dan türüyor.
 *
 * `3600 / 100 = 36`: bıçaklar tam 100 aralıkla dizilebilseydi
 * çembere 36 tane sığardı. **Erişilebilir değil, üst sınır** —
 * ölçülen pratik sınır 32 (aşağıya bakın).
 *
 * ⚠️ Ü240'ta ikiye katlandı (18 → 36) çünkü bıçak inceldi. Bölüm
 * başına bıçak da onunla katlandı, yoksa tur iki katı uzardı:
 * ölçüldü, eski artışla duvar 7. bölümden 15'e kaymıştı.
 */
const KAPASITE = Math.floor(CEMBER / CAKISMA);

/** Elmanın yakalanma yarıçapı — bıçaktan geniş, vurulabilir olmalı. */
const ELMA_YARICAP = 150;

/**
 * Bölüm başına bıçak — bölüm ilerledikçe artıyor ve **duvara çarpıyor**.
 *
 * ── 🔴 Ü83'ün duvarını getiren şey BU FONKSİYON ─────────────
 *
 * İlk yazımda `Math.min(12, 4 + tur * 2)` yazıyordu ve mükemmel
 * oynayan bir bot **hiç ölmüyordu**. Sebebi basit: her bölüm en
 * fazla 12 bıçak istiyorsa ve 12 bıçak çembere rahatça sığıyorsa,
 * tamamlanamayacak bölüm hiç gelmiyor. Sözleşmenin kuralı ise net —
 * *"kazanarak biten bir tur yok."*
 *
 * ── ⚠️ İki yanlış teşhis ────────────────────────────────────
 *
 * Aynı hata sırayla iki şeye yüklendi ve **ikisi de ölçümle
 * çürüdü**; not burada duruyor ki üçüncüsü denenmesin:
 *
 *   · *"`CAKISMA` 130'du, kapasite 27 çıkıyordu."* Ölçüm: 130 ile de
 *     duvar **aynı bölümde** geliyor (b7, 16 bıçak). Kapasite bağlayıcı
 *     değil.
 *   · *"Hız büyüyor, tick ızgarası kabalaşıyor."* Ölçüm: `EN_HIZLI`
 *     22'ye indirildiğinde de duvar **aynı bölümde** geliyor.
 *
 * Bağlayıcı olan şey **paketleme**: bıçak dönen bir kütüğe tick
 * ızgarasından atılıyor, yani boşluğun tam ortasına konamıyor.
 * Boşluklar her atışta biraz daha bozuk bölünüyor ve ölçülen pratik
 * sınır **32 bıçak** — geometrik 36'nın altında.
 *
 * Duvarın tek koşulu şu: `bicakSayisi` o sınırın **üstüne çıkmaya
 * devam etmeli**. `KAPASITE` (36) tavanı orada tutuyor.
 *
 * ⚠️ Artış Ü240'ta `tur*2`'den `tur*5`'e çıktı. Sebep aritmetik:
 * bıçak incelince çembere iki katı sığıyor, eski artışla duvar
 * 15. bölüme kayıyordu (ölçüldü: tavan 10.930 puan).
 *
 * Ölçülen ritim (40 tohum, tam tur tarayan bot): duvar **6.
 * bölümde**, tavan ~1.910 puan. Kupon eşiği (500) ortalama **3,5.
 * bölümde** geçiliyor.
 *
 * 🔴 Tavan `KAPASITE`den küçük bir sayıya sabitlenirse tur sonsuza
 * gider. Ölçüldü: `min(12, …)` ile bot **68. bölüme** çıktı.
 * `tests/oyun-motoru.test.ts` bunu bekçiliyor.
 */
function bicakSayisi(tur: number): number {
  return Math.min(KAPASITE, 4 + tur * 5);
}

/**
 * Bölümün dönüş hızı — birim/tick, işaretli.
 *
 * 🔴 Tavan, çakışma penceresine bağlı ve Ü240'ta penceresiyle
 * birlikte indi (60 → 34).
 *
 * Oyuncunun gördüğü kare ile atışın işlendiği tick arasında kayma
 * var. Ekran atış anını **yuvarlıyor** (`bicak-ekran.tsx`), yani
 * kayma en fazla yarım tick. İnsanın kendi zamanlama hatası da
 * yaklaşık bir tick; toplam ~1,5 tick.
 *
 * Pencere artık 10° (`CAKISMA` = 100), yarısı ±5°. 1,5 tick'lik
 * kaymanın o yarıyı yememesi için `1,5 × hız ≤ 50`, yani
 * **hız ≤ 33**. Tavan 34'te duruyor.
 *
 * ⚠️ Ölçüm, hızın eğriyi az oynattığını gösterdi: tavan 30 ile 40
 * arasında iyi oyuncunun kupon oranı %47–%30 arasında değişti.
 * Belirleyici olan hız değil **geometri** — bıçak yarı kalınlıkta
 * olunca açısal tolerans da yarıya iniyor. Tavan yine de pencereye
 * göre seçildi; adaletin sayısal karşılığı bu.
 */
const EN_HIZLI = 34;

function donusHizi(tohum: string, tur: number): number {
  const r = tohumla(`${tohum}:bicak:hiz:${tur}`);
  /*
    Rampa Ü236'da dikleştirilmişti (`18 + tur*3` → `20 + tur*4`);
    ürün sahibi *"zorluk arttıkça dönme hızı da artmalı"* demişti ve
    hız tur boyunca ancak bir buçuk katına çıkıyordu.

    Ü240'ta pencere 20°'den 10°'ye inince tavan da indi ve rampa
    ona göre yeniden kuruldu: 19–25 → 34, yani yine iki kattan
    fazla. Oyunun **hissi** korundu, ölçek pencereyle birlikte
    küçüldü.

    ⚠️ Duvarı bu değiştirmiyor — hızın duvarla ilgisi olmadığı
    `bicakSayisi`de ölçülerek yazılı.
  */
  const taban = Math.min(EN_HIZLI, 16 + tur * 3);
  const oynak = taban + r.tamsayi(7);
  /* Yön bölümden bölüme değişiyor — hep aynı yöne dönen bir kütük
     birkaç bölüm sonra ezberleniyor. */
  return r.tamsayi(2) === 0 ? oynak : -oynak;
}

/**
 * Bölümün elmaları — kütüğe göre açılar.
 *
 * ⚠️ İlk iki bölümde elma YOK: oyunun ilk saniyeleri öğrenme anı
 * (docs/03) ve orada bonus, kuralı anlamadan kaçırılan bir şey olurdu.
 * Aynı gerekçe Yılan'ın `ODUL_ILK_YEM`inde de yazılı.
 */
function elmalar(tohum: string, tur: number): number[] {
  if (tur < 3) return [];
  const r = tohumla(`${tohum}:bicak:elma:${tur}`);
  const adet = 1 + r.tamsayi(2);
  const cikan: number[] = [];
  for (let i = 0; i < adet; i++) {
    const a = r.tamsayi(CEMBER);
    /* Üst üste binen iki elma tek elma gibi görünür ve oyuncu ikisini
       birden aldığını sanır. */
    if (cikan.every((b) => aciFarki(a, b) > ELMA_YARICAP * 2)) cikan.push(a);
  }
  return cikan;
}

/** İki açı arasındaki en kısa fark (0..1800). */
function aciFarki(a: number, b: number): number {
  const d = Math.abs(((a - b) % CEMBER) + CEMBER) % CEMBER;
  return Math.min(d, CEMBER - d);
}

/** Açıyı 0..3599 aralığına indirir — negatif hız için de doğru. */
function normal(a: number): number {
  return ((a % CEMBER) + CEMBER) % CEMBER;
}

/**
 * İki atış arasında kabul edilen en uzun bekleme (tick).
 *
 * ⚠️ Üst sınır gerekli: `hiz × dt` çarpımı güvenli tam sayı aralığını
 * aşmamalı ve bin saniye bekleyen bir "atış" zaten oyun değil. 20 000
 * tick = 1000 saniye.
 */
const EN_FAZLA_BEKLEME = 20_000;

export type BicakDurumu = {
  tohum: string;
  /** Kaçıncı bölüm — 1'den başlıyor. */
  tur: number;
  /** Kütüğün son işlenen tick'teki açısı. */
  aci: number;
  /** Birim/tick, işaretli. */
  hiz: number;
  sonTick: number;
  /** Saplı bıçakların KÜTÜĞE GÖRE açıları. */
  saplanan: number[];
  /** Elmaların kütüğe göre açıları. */
  elma: number[];
  /** Bu bölümde kalan bıçak. */
  kalan: number;
  skor: number;
  bitti: boolean;
  /**
   * Teslimat paketinin kütüğe göre açısı — Ü234'ün kuralı.
   *
   * Eşik geçilince beliriyor, vurulunca teslim ediliyor. Puan
   * vermiyor, eşiği düşürmüyor (`odul.ts`).
   */
  odulAcisi: number | null;
  odulVerildi: boolean;
};

export type BicakGirdisi = {
  /** Bıçağın atıldığı tick. */
  t: number;
};

/** Bıçağın saplanma puanı — bölüm ilerledikçe artıyor. */
function saplamaPuani(tur: number): number {
  /*
    🔴 Ü240'ta indirildi (`10 + tur*2` → `7 + tur`).

    Bölüm başına bıçak ikiye katlanınca puan da kendiliğinden
    katlanıyordu ve ölçüm bunu gösterdi: kupon eşiği (500) o kadar
    kolaylaştı ki **±2 tick sapmayla oynayan bot bile %100** kupon
    alıyordu. Ü234'ün derdi tam buydu — bir oyunun kuponu ötekilerden
    kolay olmamalı.

    İlk düzeltme fazla sertti (`5 + tur`): tavan 1.577'ye düştü,
    yani ilk bonus kademesi (1.500) bile ancak kusursuz oyunla
    geliniyordu. Ortası tutturuldu; ölçülen tavan 1.911 ve bu,
    Ü235'teki 1.916 ile neredeyse aynı.
  */
  return 7 + tur;
}

/** Bölümü bitirme puanı. */
function bolumPuani(tur: number): number {
  return 30 + tur * 7;
}

/** Elma puanı. */
const ELMA_PUANI = 30;

function bolumKur(tohum: string, tur: number, skor: number, odulVerildi: boolean): {
  hiz: number;
  elma: number[];
  kalan: number;
  odulAcisi: number | null;
} {
  const elmaListesi = elmalar(tohum, tur);

  /*
    🔴 Ü234 · paket EŞİKTEN SONRA, tur başına bir kez.

    Blok'ta ödül bir parça teklifi, Düşen'de kaplı bir parça, Sekme'de
    düşen bir kutu, Yılan'da altın yem. Burada kütükteki bir hedef.
    Dördünde de kural aynı: `odulSirasiGeldi`.
  */
  let odulAcisi: number | null = null;
  if (odulSirasiGeldi(skor, odulVerildi)) {
    const r = tohumla(`${tohum}:bicak:odul:${tur}`);
    for (let i = 0; i < 12 && odulAcisi === null; i++) {
      const a = r.tamsayi(CEMBER);
      if (elmaListesi.every((e) => aciFarki(a, e) > ELMA_YARICAP * 2)) odulAcisi = a;
    }
  }

  return {
    hiz: donusHizi(tohum, tur),
    elma: elmaListesi,
    kalan: bicakSayisi(tur),
    odulAcisi,
  };
}

export const bicak: Oyun<BicakDurumu, BicakGirdisi> = {
  id: "bicak",
  ad: "Bıçak",
  ozet: "Dönen kütüğe sapla, bıçağa değme",
  emoji: "🔪",

  baslat(tohum) {
    const kurulum = bolumKur(tohum, 1, 0, false);
    return {
      tohum,
      tur: 1,
      aci: 0,
      hiz: kurulum.hiz,
      sonTick: 0,
      saplanan: [],
      elma: kurulum.elma,
      kalan: kurulum.kalan,
      skor: 0,
      bitti: false,
      odulAcisi: kurulum.odulAcisi,
      odulVerildi: false,
    };
  },

  uygula(durum, girdi) {
    if (durum.bitti) return null;

    const dt = girdi.t - durum.sonTick;
    if (!Number.isInteger(girdi.t) || dt <= 0 || dt > EN_FAZLA_BEKLEME) return null;

    const aci = normal(durum.aci + durum.hiz * dt);

    /*
      Bıçağın kütüğe göre saplandığı yer.

      ⚠️ Kütüğün açısı ÇIKARILIYOR: bıçak ekranda hep aynı yerden
      giriyor, dönen şey kütük. Toplansaydı bıçaklar kütükle birlikte
      dönmez, ekranda sabit kalırdı.
    */
    const yer = normal(GIRIS_ACISI - aci);

    // Saplı bıçağa değdi mi — tur biter.
    if (durum.saplanan.some((s) => aciFarki(s, yer) < CAKISMA)) {
      return { ...durum, aci, sonTick: girdi.t, bitti: true };
    }

    let skor = durum.skor + saplamaPuani(durum.tur);

    // Elma vurulduysa listeden çıkıyor.
    const elma = durum.elma.filter((e) => aciFarki(e, yer) >= ELMA_YARICAP);
    skor += (durum.elma.length - elma.length) * ELMA_PUANI;

    /* Paket vurulduysa teslim edildi. ⚠️ Puan YOK (`ODUL_BONUSU`
       sıfır, `odul.ts`): paket kazanılmış ödülü gösteriyor, yeni bir
       şey kazandırmıyor. */
    let odulAcisi = durum.odulAcisi;
    let odulVerildi = durum.odulVerildi;
    if (odulAcisi !== null && aciFarki(odulAcisi, yer) < ELMA_YARICAP) {
      odulAcisi = null;
      odulVerildi = true;
    }

    const saplanan = [...durum.saplanan, yer];
    const kalan = durum.kalan - 1;

    if (kalan > 0) {
      return {
        ...durum,
        aci,
        sonTick: girdi.t,
        saplanan,
        elma,
        kalan,
        skor,
        odulAcisi,
        odulVerildi,
      };
    }

    // Bölüm bitti — kütük temizleniyor, yenisi kuruluyor.
    const tur = durum.tur + 1;
    skor += bolumPuani(durum.tur);
    const kurulum = bolumKur(durum.tohum, tur, skor, odulVerildi);

    return {
      ...durum,
      tur,
      aci,
      hiz: kurulum.hiz,
      sonTick: girdi.t,
      saplanan: [],
      elma: kurulum.elma,
      kalan: kurulum.kalan,
      skor,
      odulAcisi: kurulum.odulAcisi,
      odulVerildi,
    };
  },

  bittiMi(durum) {
    return durum.bitti;
  },

  skor(durum) {
    return durum.skor;
  },

  gecenMs(durum) {
    return durum.sonTick * TICK_MS;
  },

  girdiOku(ham) {
    if (typeof ham !== "object" || ham === null) return null;
    const t = (ham as { t?: unknown }).t;
    if (typeof t !== "number" || !Number.isInteger(t) || t < 0) return null;
    return { t };
  },
};

/**
 * Turu bitiren bıçağın sırası — yoksa `null`.
 *
 * ── 🔴 Neden motorda, ekranda değil ─────────────────────────
 *
 * Ekranın bu bilgiye ihtiyacı var: oyuncu **hangi** bıçağa değdiğini
 * görmeli, yoksa tur sebepsiz bitmiş olur. Ama hesabı ekranda
 * yapmak, `aciFarki` ile `CAKISMA`yı ikinci bir yere kopyalamak
 * demekti ve o iki tanım sessizce ayrıştığı gün ekran **yanlış
 * bıçağı** kırmızıya boyardı.
 *
 * ⚠️ Puanı ya da bitişi etkilemiyor, yalnızca anlatıyor. Bu yüzden
 * `uygula`nın döndürdüğü duruma yazılmadı — sunucunun yeniden
 * oynattığı şeye katkısı olmayan bir alan, kaydın boyunu büyütür ve
 * "bu neye yarıyor" sorusunu her okuyana bir kez sordurur.
 */
export function carpilanBicak(durum: BicakDurumu): number | null {
  if (!durum.bitti) return null;
  const yer = normal(GIRIS_ACISI - durum.aci);
  let sira = -1;
  let enYakin = CEMBER;
  durum.saplanan.forEach((s, i) => {
    const fark = aciFarki(s, yer);
    if (fark < enYakin) {
      enYakin = fark;
      sira = i;
    }
  });
  return enYakin < CAKISMA ? sira : null;
}
