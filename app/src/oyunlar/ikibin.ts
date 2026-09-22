import { tohumla } from "./rastgele";
import { type Oyun } from "./sozlesme";
import { odulSirasiGeldi } from "./odul";

/**
 * 2048 — aynı sayıları birleştir (Ü259).
 *
 * ── Referans ────────────────────────────────────────────────
 *
 * Ürün sahibinin listesindeki *"2048"*. Tür tek anlamlı ve
 * `docs/18-oyun-adaylari.md`'de zaten aday: **#5 · Sayı birleştirme**.
 * *"Girdi dört değerden ibaret — kayıt çok küçük."*
 *
 * ── Üç şartı da geçiyor ─────────────────────────────────────
 *
 *   Ş1 · Kayan nokta yok. Tahtanın tamamı tam sayı; birleşme toplama.
 *   Ş2 · Zaman yok. Oyuncu istediği kadar düşünebiliyor, `gecenMs`
 *        tanımlı değil (Blok'la aynı).
 *   Ş3 · Tahtada gizli hiçbir şey yok — her karo görünüyor.
 *
 * ⚠️ `docs/18`in kendi uyarısı duruyor ve gizlenmiyor: *"yeni karo
 * tohumdan geldiği için ileri oyuncu diziyi önceden hesaplayabilir."*
 * Doğru — ama hafızadaki gibi **oyunu çözmüyor**. Sıradaki karoyu
 * bilmek iyi oynamanın yerine geçmiyor; tahta yine dolabiliyor ve
 * tur yine kaybedilerek bitiyor (Ü83).
 *
 * ── Girdi biçimi: `(yön)` — yedincisi ───────────────────────
 *
 * Ailenin en küçük girdisi: tek alan, dört değer. Ü21'in iddiası bir
 * kez daha sınanıyor ve bu sefer **en ucuz uçtan** — kayıt bir
 * turda birkaç yüz bayt.
 */

/** Izgaranın kenarı. */
export const IKIBIN_EN = 4;

const HUCRE = IKIBIN_EN * IKIBIN_EN;

/** Yeni karonun 4 çıkma olasılığı — yüzde. Klasikteki değer. */
const DORT_YUZDE = 10;

/**
 * 🔴 Klasik skor DÖRDE BÖLÜNÜYOR — ölçüm kararı.
 *
 * 2048'in kendi skoru (birleşen karoların toplamı) bu ailede çok
 * hızlı büyüyor. Ölçüldü (40 tur):
 *
 *     bot          skor ortanca   500 eşiğini geçen
 *     rastgele        1.104            %93
 *     orta            1.500           %100
 *     iyi             2.144           %100
 *
 * Yani **rastgele oynayan bile** neredeyse her turda kupon eşiğini
 * geçiyordu. Karşılaştırma: Bıçak'ta iyi oyuncu %47, Kırıcı'da %63.
 * Eşik (`ODUL_ESIGI`) bütün oyunlarda ortak (Ü234) ve bir oyunun
 * kuponu ötekilerden kolay olamaz — Ü201'de bir kez yaşandı,
 * kafenin günlük bütçesi günün ilk saatinde bitmişti.
 *
 * Dörde bölmek oyunun kendisine dokunmuyor: karo değerleri klasik
 * kalıyor (2, 4, 8… 2048), değişen yalnızca puanın ölçeği.
 *
 * ⚠️ Bölme `skor()`te yapılıyor, birleşme anında değil: her
 * birleşmede bölünseydi küçük karoların puanı yuvarlanarak kaybolur
 * ve toplam ham toplamın dörtte birinden sapardı.
 */
const SKOR_BOLEN = 4;

export type IkibinYonu = "yukari" | "asagi" | "sol" | "sag";

const YONLER: readonly IkibinYonu[] = ["yukari", "asagi", "sol", "sag"];

export type IkibinDurumu = {
  tohum: string;
  /** 16 hücre, satır satır. 0 = boş. */
  kareler: number[];
  /**
   * Ödül paketini taşıyan hücreler — Ü234.
   *
   * 🔴 Karolarla birlikte **kayıyor**, sabit bir hücrede durmuyor.
   * Sabit dursaydı paket oyuncunun kaydırdığı karodan ayrılır ve
   * ekranda paket bir karonun üstündeyken başka bir karo birleşince
   * teslim edilmiş görünürdü.
   */
  paket: boolean[];
  /**
   * Birleşen karoların HAM toplamı — klasik 2048 skoru.
   *
   * ⚠️ Oyuncunun gördüğü sayı bu değil; `skor()` bunu
   * `SKOR_BOLEN`e bölüyor. Gerekçesi orada yazılı. Ham değer
   * durumda kalıyor ki bölme her hamlede yuvarlanıp sapmasın.
   */
  hamSkor: number;
  /** Kaçıncı hamle — yeni karonun tohumu bundan türüyor. */
  hamle: number;
  bitti: boolean;
  odulVerildi: boolean;
};

export type IkibinGirdisi = { y: IkibinYonu };

/**
 * Bir satırı SOLA kaydırıp birleştirir.
 *
 * Bütün yönler buna indirgeniyor: yukarı/aşağı/sağ, satırı ya da
 * sütunu doğru sırayla okuyup buraya veriyor. Dört ayrı kaydırma
 * yazmak dört ayrı hata yeri açardı.
 *
 * ⚠️ Bir karo **tek hamlede bir kez** birleşiyor: `4 4 4 4` sola
 * kaydırılınca `8 8` oluyor, `16` değil. Klasikteki kural bu ve
 * olmasaydı tahta tek hamlede boşalırdı.
 */
function satirKaydir(
  deger: number[],
  paket: boolean[],
): { deger: number[]; paket: boolean[]; skor: number; teslim: boolean } {
  const dolu: number[] = [];
  const doluPaket: boolean[] = [];
  for (let i = 0; i < deger.length; i++) {
    if (deger[i] !== 0) {
      dolu.push(deger[i]);
      doluPaket.push(paket[i]);
    }
  }

  const cikan: number[] = [];
  const cikanPaket: boolean[] = [];
  let skor = 0;
  let teslim = false;

  for (let i = 0; i < dolu.length; i++) {
    if (i + 1 < dolu.length && dolu[i] === dolu[i + 1]) {
      const yeni = dolu[i] * 2;
      cikan.push(yeni);
      skor += yeni;
      /* Paket birleşen iki karodan birindeyse teslim edildi. Yeni
         karo paketi TAŞIMIYOR — paket tur başına bir kez. */
      if (doluPaket[i] || doluPaket[i + 1]) teslim = true;
      cikanPaket.push(false);
      i++;
    } else {
      cikan.push(dolu[i]);
      cikanPaket.push(doluPaket[i]);
    }
  }

  while (cikan.length < deger.length) {
    cikan.push(0);
    cikanPaket.push(false);
  }

  return { deger: cikan, paket: cikanPaket, skor, teslim };
}

/** Bir yöne göre okunacak hücre sıraları. */
function siralar(yon: IkibinYonu): number[][] {
  const hepsi: number[][] = [];
  for (let n = 0; n < IKIBIN_EN; n++) {
    const sira: number[] = [];
    for (let i = 0; i < IKIBIN_EN; i++) {
      switch (yon) {
        case "sol":
          sira.push(n * IKIBIN_EN + i);
          break;
        case "sag":
          sira.push(n * IKIBIN_EN + (IKIBIN_EN - 1 - i));
          break;
        case "yukari":
          sira.push(i * IKIBIN_EN + n);
          break;
        case "asagi":
          sira.push((IKIBIN_EN - 1 - i) * IKIBIN_EN + n);
          break;
      }
    }
    hepsi.push(sira);
  }
  return hepsi;
}

/** Tahtayı bir yöne kaydırır. Hiçbir şey kıpırdamadıysa `null`. */
function tahtaKaydir(
  kareler: number[],
  paket: boolean[],
  yon: IkibinYonu,
): { kareler: number[]; paket: boolean[]; skor: number; teslim: boolean } | null {
  const yeni = [...kareler];
  const yeniPaket = [...paket];
  let skor = 0;
  let teslim = false;
  let kimildadi = false;

  for (const sira of siralar(yon)) {
    const d = sira.map((i) => kareler[i]);
    const p = sira.map((i) => paket[i]);
    const s = satirKaydir(d, p);
    skor += s.skor;
    if (s.teslim) teslim = true;
    for (let i = 0; i < sira.length; i++) {
      if (yeni[sira[i]] !== s.deger[i]) kimildadi = true;
      yeni[sira[i]] = s.deger[i];
      yeniPaket[sira[i]] = s.paket[i];
    }
  }

  /*
    🔴 Kıpırdamayan hamle KURALDIŞI, boş hamle değil.

    Kabul edilseydi oyuncu duvara yaslanıp aynı yöne basarak yeni
    karo doğurabilir ve tahta hiç dolmazdı — Ü83'ün duvarı ortadan
    kalkardı. `uygula` bu yüzden `null` dönüyor.
  */
  if (!kimildadi) return null;
  return { kareler: yeni, paket: yeniPaket, skor, teslim };
}

/** Boş bir hücreye yeni karo koyar. */
function karoDogur(durum: {
  tohum: string;
  hamle: number;
  kareler: number[];
}): { yer: number; deger: number } | null {
  const bos: number[] = [];
  for (let i = 0; i < HUCRE; i++) if (durum.kareler[i] === 0) bos.push(i);
  if (bos.length === 0) return null;

  const r = tohumla(`${durum.tohum}:2048:${durum.hamle}`);
  return {
    yer: bos[r.tamsayi(bos.length)],
    deger: r.tamsayi(100) < DORT_YUZDE ? 4 : 2,
  };
}

/** Hamle kaldı mı — boş hücre ya da birleşebilecek komşu. */
function hamleVarMi(kareler: number[]): boolean {
  for (let i = 0; i < HUCRE; i++) if (kareler[i] === 0) return true;
  for (let s = 0; s < IKIBIN_EN; s++) {
    for (let k = 0; k < IKIBIN_EN; k++) {
      const d = kareler[s * IKIBIN_EN + k];
      if (k + 1 < IKIBIN_EN && d === kareler[s * IKIBIN_EN + k + 1]) return true;
      if (s + 1 < IKIBIN_EN && d === kareler[(s + 1) * IKIBIN_EN + k]) return true;
    }
  }
  return false;
}

/**
 * Paketi tahtadaki bir karoya yerleştirir — Ü234.
 *
 * ⚠️ **Dolu** bir karoya konuyor, boş hücreye değil: paket
 * birleşmeyle teslim ediliyor ve boş hücrede birleşecek bir şey yok.
 * En küçük değerli karo seçiliyor — o en kolay birleşen, yani paket
 * ulaşılabilir kalıyor.
 */
function paketYerlestir(durum: IkibinDurumu): boolean[] {
  const paket = new Array<boolean>(HUCRE).fill(false);
  let enIyi = -1;
  for (let i = 0; i < HUCRE; i++) {
    if (durum.kareler[i] === 0) continue;
    if (enIyi === -1 || durum.kareler[i] < durum.kareler[enIyi]) enIyi = i;
  }
  if (enIyi >= 0) paket[enIyi] = true;
  return paket;
}

export const ikibin: Oyun<IkibinDurumu, IkibinGirdisi> = {
  id: "ikibin",
  ad: "Blok 2048",
  ozet: "Blokları birleştir, en yüksek skora ulaş",
  emoji: "🔢",
  /* Ölçüldü (40 tur, açgözlü bot): ortanca 552, tavan 1.318. Bıçak
     1.200/1.911 ve Kırıcı 900/1.578 ile aynı oran. */
  gunlukHedef: 750,

  baslat(tohum) {
    let durum: IkibinDurumu = {
      tohum,
      kareler: new Array<number>(HUCRE).fill(0),
      paket: new Array<boolean>(HUCRE).fill(false),
      hamSkor: 0,
      hamle: 0,
      bitti: false,
      odulVerildi: false,
    };
    // Klasikteki gibi iki karoyla başlıyor.
    for (let n = 0; n < 2; n++) {
      const yeni = karoDogur(durum);
      if (!yeni) break;
      const kareler = [...durum.kareler];
      kareler[yeni.yer] = yeni.deger;
      durum = { ...durum, kareler, hamle: durum.hamle + 1 };
    }
    return { ...durum, hamle: 0 };
  },

  uygula(durum, girdi) {
    if (durum.bitti) return null;
    if (!YONLER.includes(girdi.y)) return null;

    const sonuc = tahtaKaydir(durum.kareler, durum.paket, girdi.y);
    if (!sonuc) return null;

    const hamle = durum.hamle + 1;
    const hamSkor = durum.hamSkor + sonuc.skor;
    const skor = Math.floor(hamSkor / SKOR_BOLEN);
    const odulVerildi = durum.odulVerildi || sonuc.teslim;

    const kareler = [...sonuc.kareler];
    let paket = [...sonuc.paket];

    const yeni = karoDogur({ tohum: durum.tohum, hamle, kareler });
    if (yeni) kareler[yeni.yer] = yeni.deger;

    /* 🔴 Ü234 · paket EŞİKTEN SONRA, tur başına bir kez. Blok'ta
       parça teklifi, Düşen'de kaplı parça, Sekme'de düşen kutu,
       Yılan'da altın yem, Bıçak'ta kütükteki hedef, Kırıcı'da
       duvardaki tuğla. Burada tahtadaki bir karo. */
    if (odulSirasiGeldi(skor, odulVerildi) && !paket.some(Boolean)) {
      paket = paketYerlestir({ ...durum, kareler });
    }

    return {
      ...durum,
      kareler,
      paket,
      hamSkor,
      hamle,
      odulVerildi,
      bitti: !hamleVarMi(kareler),
    };
  },

  bittiMi(durum) {
    return durum.bitti;
  },

  skor(durum) {
    return Math.floor(durum.hamSkor / SKOR_BOLEN);
  },

  girdiOku(ham) {
    if (typeof ham !== "object" || ham === null) return null;
    const y = (ham as { y?: unknown }).y;
    if (typeof y !== "string" || !YONLER.includes(y as IkibinYonu)) return null;
    return { y: y as IkibinYonu };
  },
};

/** Tahtadaki en büyük karo — ekran başlıkta gösteriyor. */
export function enBuyukKaro(durum: IkibinDurumu): number {
  return durum.kareler.reduce((a, b) => (b > a ? b : a), 0);
}
