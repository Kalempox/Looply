"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  dusen,
  uygulaVeKilitler,
  hayaletSatiri,
  sigarMi,
  siradakiParcalar,
  PARCA_DONUSLERI,
  DUSEN_EN,
  DUSEN_BOY,
  type DusenDurumu,
  type DusenGirdisi,
  type DusenHareket,
  type Kilitlenme,
} from "../dusen";
import { TICK_MS } from "../sozlesme";
import {
  KUP_RENKLERI,
  kupRengi,
  dusenAktifHucre,
  dusenBosHucre,
  dusenCerceve,
  dusenDoluHucre,
  dusenHayaletHucre,
  dusenPanel,
  dusenSahnesi,
  dusenTahtasi,
  satirAdi,
} from "./dusen-yuzey";
import { useOyunSesi } from "./oyun-ses";
import type { OyunEkraniProps } from "./ortak";

/**
 * Düşen ekranı — Ü209'da baştan yazıldı.
 *
 * ── Girdi kaydının inceliği ─────────────────────────────────
 *
 * Ekran her tick'te yerçekimini yerel olarak ilerletiyor ama **bunları
 * kaydetmiyor**; yalnızca oyuncunun hareketleri kaydediliyor, sonuna da tek
 * bir `bekle` ekleniyor. Sunucu aynı sonuca varıyor çünkü yerçekimi
 * `zamaniIlerlet` içinde tick aralığına göre işliyor: 0→100 tek adımda da,
 * 0→50→100 iki adımda da aynı tahtayı veriyor. Kayıt böylece binlerce
 * satır yerine onlarca satır oluyor.
 *
 * ── Neden girdi kaydı da durumun içinde ─────────────────────
 *
 * Yerçekimi zamanlayıcısı ile oyuncunun dokunuşu aynı anda gelebiliyor.
 * Kayıt ayrı bir `ref`'te tutulsaydı, güncelleyicinin içinde ona yazmak
 * gerekirdi — ve React güncelleyiciyi iki kez çağırdığında (StrictMode)
 * aynı hamle iki kez kaydedilirdi. Sunucu o kaydı yeniden oynatınca tahta
 * ayrışır ve **dürüst oyuncunun skoru reddedilirdi.**
 *
 * Kayıt durumun parçası olunca güncelleyici saf kalıyor: aynı girdiden
 * aynı çıktı. Kaç kez çağrıldığı önemsiz. **Renk ızgarası ve efektler de
 * aynı sebeple `Yerel`in içinde.**
 *
 * ── Ü209: kendi sahnesi ─────────────────────────────────────
 *
 * Yüzey artık `dusen-yuzey.ts`ten: uzay sahnesi, neon çerçeve, camsı
 * küpler, köşeli HUD panelleri, hayalet parça, "SIRADAKİ". Ürün
 * sahibinin referansı `gamesvideos/tetris.png` (görünüm) ve
 * `tetris.mp4` (hayalet + dama deseni).
 *
 * ⚠️ Referanstaki **HOLD** paneli YOK ve bilerek yok: parça saklamak
 * bir mekanik, süs değil — motora ve replay sözleşmesine girer. Boş
 * duran bir HOLD kutusu çizmek oyuncuya verilmemiş bir söz olurdu.
 * Referanstaki **BEST** de yok: kişisel rekor bu ekrana gelmiyor,
 * uydurulmuş bir sayı yazmaktansa hiç yazmamak doğru.
 */

/**
 * ⚠️ Ü84: tick **duvar saatinden** hesaplanıyor, sayarak değil.
 *
 * Sayarak ilerletmek iki yerde bozuluyordu:
 *
 *   · Tarayıcı gizli sekmede `setInterval`i kısıyor (ölçüldü: saniyede 20
 *     yerine ~1,5 tick), yani yerçekimi fiilen duruyordu.
 *   · Oyuncu sekmeyi arkaya atıp parçayı istediği kadar havada tutabiliyordu.
 *
 * Ayrıca sunucunun saat kontrolü (Ü84) ancak dürüst istemci gerçek zamanı
 * bildirirse çalışır; sayan istemci meşru olarak geri kalır ve kontrolü
 * yanlış yere tetiklerdi.
 */

/** Silinen satırların patlaması — sadece görsel. */
type Patlama = {
  anahtar: number;
  /** Silinen satırların indeksleri (temizlikten önceki tahtada). */
  satirlar: number[];
  parcaciklar: Parcacik[];
  ad: { ad: string; renk: string } | null;
};

/** Tek parçacık — yönü ve mesafesi kare indeksinden türüyor. */
type Parcacik = {
  s: number;
  k: number;
  u: number;
  v: number;
  b: number;
  renk: string;
  gecikme: number;
};

type Yerel = {
  durum: DusenDurumu;
  girdiler: DusenGirdisi[];
  /**
   * Hücre renkleri — 0 boş, n>0 `KUP_RENKLERI[n-1]`.
   *
   * 🔴 Motorun durumunda DEĞİL (Ü202'nin kuralı): renk skora
   * dokunmuyor, replay sözleşmesinde işi yok.
   *
   * ⚠️ Ama Blok'takinden zor: orada hücreler yerinde boşalıyor, burada
   * satır silinince **üstündeki her şey bir satır kayıyor.** Kaymayı
   * ekranda yeniden yazmak `kilitle`nin ikizini üretirdi; motor bu
   * yüzden `uygulaVeKilitler` ile hangi satırların silindiğini kendisi
   * söylüyor ve ekran yalnızca uyguluyor.
   */
  renkler: Uint8Array;
  patlama: Patlama | null;
  /** Dört satır birden silinince tahta sarsılıyor. */
  sarsinti: number;
  /**
   * Teslim kartı ekranda mı (Ü207).
   *
   * ⚠️ Eskiden "kondugu tick" tutuluyor ve kart `tick - odulTicki`
   * karşılaştırmasıyla kayboluyordu. Ü214'te tick render'dan çıkınca
   * o hesap donacaktı; kartı artık bir zamanlayıcı kaldırıyor — Blok
   * da aynısını yapıyor.
   */
  odulKarti: boolean;
};

/**
 * Teslim kartı kaç ms duruyor.
 *
 * CSS'teki `.odul-karti` animasyonu 2.200 ms; 100 ms fazlası kartın
 * kaybolurken kesilmemesi için. Ayrışırlarsa kart ya erken kaybolur ya
 * da görünmez hâlde DOM'da kalır.
 */
const ODUL_KARTI_MS = 2300;

/** Patlama kaç ms duruyor — CSS'teki en uzun efektle aynı. */
const PATLAMA_MS = 700;

/**
 * Yana hamlenin kayma süresi (Ü216).
 *
 * ⚠️ Düşme süresiyle AYNI OLAMAZ. Yerçekimi başta 1,4 saniyede bir
 * satır iniyor; yana hamle oyuncunun parmağına cevap ve o kadar
 * beklerse oyun bozuk hissettirir. 70 ms gözün "anında" saydığı
 * sınırın hemen altında ama ışınlanmayı da yumuşatıyor.
 */
const YATAY_GECIS_MS = 70;

/**
 * Izgaradaki hücre boşluğu (piksel) — `gap-[2px]` ile aynı olmalı.
 *
 * 🔴 İnen parça katmanı ızgaranın DIŞINDA duruyor ve hücrelerin yerini
 * kendisi hesaplıyor. Boşluğu saymazsa hücre genişliğini `%100/10`
 * sanar; oysa gerçek genişlik `(%100 − 9×2px)/10`. Fark sütun başına
 * ~1,8 piksel, yani onuncu sütunda **16 piksel kayma** — parça
 * ızgaradan kopar.
 */
const IZGARA_BOSLUGU = 2;

/** Bir sütunun/satırın adımı — hücre genişliği + boşluk. */
function hucreAdimi(adet: number): string {
  const toplamBosluk = (adet - 1) * IZGARA_BOSLUGU;
  return `((100% - ${toplamBosluk}px) / ${adet} + ${IZGARA_BOSLUGU}px)`;
}

/** Bir hücrenin genişliği/yüksekliği. */
function hucreBoyu(adet: number): string {
  return `((100% - ${(adet - 1) * IZGARA_BOSLUGU}px) / ${adet})`;
}

/*
  Hücre stilleri MODÜL DÜZEYİNDE, bir kez.

  ⚠️ Önce her hücre için `dusenDoluHucre(renk)` çağrılıyordu. Tahtada
  160 hücre var ve yerçekimi saniyede 20 kez yeniden çiziyor: saniyede
  3.200 nesne ve o nesnelerin içinde birleştirilen degrade/gölge
  dizgileri. Renk sayısı yedi, yani üretilebilecek stil de yedi —
  hepsini önceden kurmak aynı görüntüyü bedava veriyor.
*/
const BOS_STILI = dusenBosHucre();
const DOLU_STILLERI = KUP_RENKLERI.map(dusenDoluHucre);
const AKTIF_STILLERI = KUP_RENKLERI.map(dusenAktifHucre);
const HAYALET_STILLERI = KUP_RENKLERI.map(dusenHayaletHucre);

/**
 * "SIRADAKİ" sütununda kaç parça görünüyor.
 *
 * ⚠️ Referansta beş var; burada dört. Sütun tahtanın yüksekliği kadar
 * ve her önizleme ~42 piksel: beşincisi sığıyor ama sütunu tahtadan
 * uzun yapıyor ve hizayı bozuyordu. Dört, oyuncunun planlayabileceğinden
 * zaten fazla.
 */
const SIRADAKI_ADET = 4;

/**
 * Parmak ne kadar basılı kalınca yumuşak iniş başlıyor (Ü210).
 *
 * Hızlı bir yana kaydırma sırasında parmak da basılı oluyor; gecikme
 * olmasaydı her kaydırma parçayı bir de aşağı indirirdi.
 */
const BASILI_ESIK_MS = 180;

/**
 * Yumuşak inişte satır aralığı — saniyede ~7 satır.
 *
 * ⚠️ Her iniş bir **girdi** ve kayıt sınırı 5.000 (`EN_FAZLA_GIRDI`).
 * Daha hızlısı (ör. 50 ms) uzun bir turda sınırı yiyip skoru kırpardı;
 * daha yavaşı "hızlandı" hissi vermiyor. En yüksek yerçekimi hızı 5
 * tick (250 ms), yani bu onun yaklaşık iki katı.
 */
const YUMUSAK_INIS_MS = 140;

export function DusenEkrani({ tohum, bitti, kazandirir, cik }: OyunEkraniProps) {
  const [y, setY] = useState<Yerel>(() => ({
    durum: dusen.baslat(tohum),
    girdiler: [],
    tick: 0,
    renkler: new Uint8Array(DUSEN_EN * DUSEN_BOY),
    patlama: null,
    sarsinti: 0,
    odulKarti: false,
  }));
  const bildirildi = useRef(false);
  /**
   * Şu anki tick — **durumun içinde değil**, Ü214.
   *
   * Durumda dursaydı her 50 ms'de yeni bir durum nesnesi doğar ve
   * ekranda hiçbir şey değişmese bile render tetiklenirdi. Girdi
   * kaydının tick'e ihtiyacı var ama render'ın yok.
   */
  const tickRef = useRef(0);
  const ses = useOyunSesi();

  /*
    Sesler efektten DEĞİL, güncelleyicinin dışından çalınıyor.

    ⚠️ Güncelleyici saf kalmak zorunda (yukarıdaki not): StrictMode onu
    iki kez çağırıyor ve içine ses koymak her sesi ikiye katlardı. Bu
    yüzden ne olduğu `Yerel`e yazılıyor, ses ise o değişimi **izleyen**
    bir efektten çalıyor.
  */
  const sonPatlama = useRef(0);
  const sonParcaNo = useRef(0);
  useEffect(() => {
    if (y.patlama && y.patlama.anahtar !== sonPatlama.current) {
      sonPatlama.current = y.patlama.anahtar;
      ses.cal("temizlik");
      if (y.patlama.ad) window.setTimeout(() => ses.cal("kombo"), 200);
    } else if (y.durum.parcaNo !== sonParcaNo.current) {
      sonParcaNo.current = y.durum.parcaNo;
      ses.cal("yerlesti");
    }
  }, [y.patlama, y.durum.parcaNo, ses]);

  /*
    Efektleri ekrandan KALDIRAN zamanlayıcılar — Ü214.

    Eskiden ikisi de `tick` farkından türüyordu ve tick her 50 ms'de
    render tetikliyordu. Tick render'dan çıkınca o hesap donacaktı;
    zamanlayıcı her efekt için **tek bir** render üretiyor.
  */
  useEffect(() => {
    if (!y.patlama) return;
    const z = window.setTimeout(() => setY((p) => ({ ...p, patlama: null })), PATLAMA_MS);
    return () => window.clearTimeout(z);
  }, [y.patlama]);

  useEffect(() => {
    if (!y.odulKarti) return;
    const z = window.setTimeout(() => setY((p) => ({ ...p, odulKarti: false })), ODUL_KARTI_MS);
    return () => window.clearTimeout(z);
  }, [y.odulKarti]);

  // ── Yerçekimi ────────────────────────────────────────
  useEffect(() => {
    const baslangic = Date.now();
    const zamanlayici = setInterval(() => {
      const tick = Math.floor((Date.now() - baslangic) / TICK_MS);
      if (tick <= tickRef.current) return;
      tickRef.current = tick;

      setY((p) => {
        if (dusen.bittiMi(p.durum)) return p;
        /*
          🔴 Sıradaki iniş bu tick'e gelmediyse motoru HİÇ ÇAĞIRMA — Ü214.

          Ölçüldü: motor her `bekle` çağrısında yeni bir durum nesnesi
          döndürüyor, yani saniyede 20 render oluyordu ama bunların
          **%96'sında ekranda hiçbir şey değişmiyordu.** Her boş render
          160 hücrenin uzlaştırılması demek — saniyede 3.200 öge.
          Ürün sahibi *"fps çok düşük"* dedi.

          ⚠️ Atlamak güvenli çünkü motor kaba tick'e göre tasarlandı:
          `zamaniIlerlet` 0→100'ü tek adımda da, 0→50→100'ü iki adımda
          da aynı tahtaya götürüyor (bu dosyanın en üstündeki not).
          Yani araya girmemek sonucu değiştirmiyor.

          ⚠️ `p`yi aynen döndürmek React'in render'ı atlamasını
          sağlıyor; `setY` yine çağrılıyor ama bedeli bir karşılaştırma.
        */
        if (tick < p.durum.sonInis + p.durum.dusmeTicki) return p;
        return ilerle(p, { tick, a: "bekle" }, tick, false);
      });
    }, TICK_MS);

    return () => clearInterval(zamanlayici);
  }, []);

  // ── Bitiş bildirimi ──────────────────────────────────
  // Render sırasında değil, efektte: `bitti` üst bileşende durum değiştiriyor.
  useEffect(() => {
    if (bildirildi.current || !dusen.bittiMi(y.durum)) return;
    bildirildi.current = true;

    // Sunucunun yerçekimini aynı noktaya kadar ilerletmesi için son bir
    // zaman işareti. Bu olmadan sunucu son hamlede durur ve tahta ayrışır.
    bitti([...y.girdiler, { tick: tickRef.current, a: "bekle" }], dusen.skor(y.durum));
  }, [y, bitti]);

  const hareket = useCallback((a: DusenHareket) => {
    setY((p) => {
      if (dusen.bittiMi(p.durum)) return p;
      /*
        ⚠️ Etkisiz `in` KAYDEDİLMİYOR. Parmak basılı tutulduğu sürece
        yumuşak iniş saniyede ~7 girdi üretiyor; parça dibe değdiğinde
        motor durumu aynen geri veriyor ve o girdiler kayda hiçbir şey
        katmadan yer kaplardı. Kayıt sınırı 5.000 (`EN_FAZLA_GIRDI`) ve
        uzun bir turda bu fark ediyor.
      */
      if (a === "in" && !sigarMi(p.durum.izgara, p.durum.parca, p.durum.donus, p.durum.s + 1, p.durum.k)) {
        return p;
      }
      return ilerle(p, { tick: tickRef.current, a }, tickRef.current, true);
    });
  }, []);

  /* ── Parmakla oynanış — Ü210 ──────────────────────────

     Ürün sahibi: *"kullanıcı parmağını basılı tuttuğunda daha hızlı
     aşağı insin, parmağını sağa kaydırdığında sağa sola kaydırdığında
     sola gitsin; butonlar olmasın, sadece en aşağı bırak ve çevir
     butonları olsun."*

     🔴 Yumuşak iniş motorun `in` girdisiyle yapılıyor, yerçekimini
     hızlandırarak DEĞİL. Düşme hızı (`dusmeTicki`) durumdan türüyor ve
     sunucu onu kendisi hesaplıyor; istemci yerel olarak hızlandırsaydı
     tekrar ayrışır ve tur reddedilirdi. Her iniş bir girdi, kayıtta
     duruyor, sunucu aynısını buluyor.

     ⚠️ Yatay hareket **parmağın gittiği yol** kadar: her hücre
     genişliği kadar kayınca bir hamle. Sabit bir eşik (ör. 30 piksel)
     dar ekranda çok hassas, geniş ekranda tembel olurdu. */
  const tahtaRef = useRef<HTMLDivElement>(null);
  /** Basılı parmağın son çapası ve basma anı. */
  const parmak = useRef<{ x: number; baslangic: number } | null>(null);
  const [basili, setBasili] = useState(false);
  const inisSayaci = useRef<number | null>(null);

  useEffect(() => {
    if (!basili) return;
    /*
      ⚠️ Gecikme sonra başlıyor: hızlı bir kaydırma sırasında parmak
      da basılı oluyor ve gecikme olmasaydı her yana kaydırma parçayı
      bir de aşağı indirirdi. 180 ms, "dokundum" ile "basılı tutuyorum"
      arasındaki sınır.
    */
    const baslat = window.setTimeout(() => {
      hareket("in");
      const sayac = window.setInterval(() => hareket("in"), YUMUSAK_INIS_MS);
      inisSayaci.current = sayac;
    }, BASILI_ESIK_MS);

    return () => {
      window.clearTimeout(baslat);
      if (inisSayaci.current) window.clearInterval(inisSayaci.current);
      inisSayaci.current = null;
    };
  }, [basili, hareket]);

  // ── Klavye (masaüstünde test için) ───────────────────
  useEffect(() => {
    const eslesme: Record<string, DusenHareket> = {
      ArrowLeft: "sol",
      ArrowRight: "sag",
      ArrowUp: "don",
      ArrowDown: "in",
      " ": "birak",
    };
    const tus = (e: KeyboardEvent) => {
      const a = eslesme[e.key];
      if (!a) return;
      e.preventDefault();
      hareket(a);
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [hareket]);

  const durum = y.durum;
  const renkNo = kupRengi(durum.parca);

  /**
   * Hayaletin kapladığı kareler.
   *
   * ⚠️ Parçanın kendisiyle **çakışan** kareler çıkarılıyor: parça zaten
   * dibe yakınken hayalet onun altında kalır ve iki katman üst üste
   * binerek tek bir bulanık şekle dönerdi.
   */
  const hayaletKareler = useMemo(() => {
    const hs = hayaletSatiri(durum);
    if (hs === durum.s) return new Set<number>();
    const out = new Set<number>();
    for (const [ds, dk] of PARCA_DONUSLERI[durum.parca][durum.donus]) {
      const s = hs + ds;
      if (s >= 0) out.add(s * DUSEN_EN + (durum.k + dk));
    }
    return out;
  }, [durum]);

  const siradaki = useMemo(() => siradakiParcalar(durum, SIRADAKI_ADET), [durum]);

  /*
    ── Paket görünür mü — Ü207 ─────────────────────────────────

    🔴 `kazandirir` false ise paket ÇİZİLMİYOR. Ürün sahibi Blok'ta
    yakalamıştı: *"kafe dışında olduğum için ödül kazanamamama rağmen
    ödüllü blok geldi, o ne için?"* Motor paketi yine üretiyor ve
    üretmek zorunda (konumu bilseydi replay sapardı); gizleyen ekran.
  */
  const paketDusuyor = durum.odulParcasi && kazandirir === true;
  const patlama = y.patlama;
  const patlayanSatirlar = new Set(patlama?.satirlar ?? []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col px-2 pb-3" style={dusenSahnesi()}>
      {/* Yıldızlar — sahnenin derinliği. Tek öge, animasyon CSS'te. */}
      <span aria-hidden className="dusen-yildiz pointer-events-none absolute inset-0" />

      {/* ⚠️ `min-h-0`: esnek kolon içeriğinden küçülebilmeli, yoksa
          tahta taşıyor ve düğmeler ekranın altından çıkıyor (Ü204). */}
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-md flex-col">
        <div className="mb-1.5 flex items-center justify-between">
          {cik ? (
            <button
              type="button"
              onClick={cik}
              className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-full py-1.5 pr-3 pl-1 text-[14px] font-semibold text-white/60 transition-colors hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 5 8 12l7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Çık
            </button>
          ) : (
            <span />
          )}
          <SesDugmesi acik={ses.acik} degistir={ses.degistir} />
        </div>

        {/* 🔴 HUD + tahta + düğmeler TEK GRUP ve grup dikey ortalı — Ü211.

            Yan sütun tahtanın genişliğini kısıyor (359 → 287) ve
            genişlik yüksekliği belirlediği için (oran 10/16) tahta
            459 pikselde kalıyor; oysa orta banda 638 piksel düşüyor.
            Ölçüldü: aradaki 179 piksel bir yere gitmek zorunda.

            · `items-center` → 96 üstte, 96 altta: HUD ile tahta
              arasında sebepsiz bir uçurum.
            · `items-start` → 8 üstte, 170 altta: tahta HUD'a yapışıyor,
              düğmeler ekranın dibinde yalnız kalıyor.
            · **Üçü tek grup, grup ortalı** → aralarında 10'ar piksel,
              artan boşluk ekranın üstüne ve altına dağılıyor. Üç öge
              birbirine ait görünüyor ve boşluk nefes payı oluyor.

            ⚠️ Boşluğun kendisi kaçınılmaz: tahta 10 hücre geniş ve
            hücre kare olmak zorunda. Ortadan kaldırmanın tek yolu yan
            sütunu silmek olurdu — o da ürün sahibinin istediği düzen. */}
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5">
        {/* ── Üst HUD: SKOR ve SEVİYE ───────────────
            Referanstaki düzen: SKOR solda büyük ve iki satırlı
            (etiket + rakam + altında ikinci bir sayı), SEVİYE ayrı bir
            rozet.

            🔴 SIRADAKİ buradan ÇIKTI — Ü211. Üç panel yan yana
            sıkışınca sıradaki parçalara 7 piksellik hücre kalıyordu ve
            ürün sahibi *"sıradakiler hiç belli değil"* dedi. Haklıydı:
            okunmayan bir gösterim yok sayılır. Referansta da zaten
            tahtanın **yanında dikey bir sütun**; oraya taşındı.

            ⚠️ Alt satır "SATIR", referanstaki "BEST" değil. Kişisel
            rekor bu ekrana gelmiyor ve uydurulmuş bir sayı yazmaktansa
            gerçek bir sayı yazmak doğru — temizlenen satır hem gerçek
            hem oyuncunun umursadığı şey. */}
        <div className="flex shrink-0 items-stretch gap-2">
          <div className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-2" style={dusenPanel()}>
            <span className="font-data text-[9px] leading-none font-bold tracking-[0.2em] text-[#5EE9FF]">
              SKOR
            </span>
            {/* `key` skorla değişiyor ki her artışta animasyon koşsun. */}
            <span
              key={durum.skor}
              className="dusen-skor mt-1 font-data text-[28px] leading-none font-black tabular text-white"
              style={{ textShadow: "0 0 12px rgba(94,233,255,.75)" }}
            >
              {durum.skor.toLocaleString("tr-TR")}
            </span>
            <span className="mt-1.5 font-data text-[10px] leading-none font-bold tracking-[0.1em] text-white/45">
              SATIR{" "}
              <span className="tabular text-white/75">{durum.temizlenen}</span>
            </span>
          </div>

          <div
            className="flex w-[74px] shrink-0 flex-col items-center justify-center px-2 py-2"
            style={dusenPanel("#C084FC")}
          >
            <span className="font-data text-[9px] leading-none font-bold tracking-[0.14em] text-[#C084FC]">
              SEVİYE
            </span>
            <span className="mt-1 font-data text-[26px] leading-none font-black tabular text-white">
              {hizKademesi(durum.dusmeTicki)}
            </span>
          </div>
        </div>

        {/* ── Tahta ─────────────────────────────────
            🔴 Genişlik SÜRÜCÜ, yükseklik ondan türüyor (Ü204). Tersi
            denendi ve kırıldı: `aspect-ratio`, `max-width` kısıtını
            yüksekliğe geri beslemiyor, dar ekranda oran bozuluyordu.
            Üst sınır kalan yükseklikten hesaplanıyor (16/10 = 0,625). */}
        {/* 🔴 Parmak olayları BU kapsayıcıda, tahtanın kendisinde değil.

            Tahtanın `key`i dört satır silinince değişiyor (sarsıntı
            animasyonu yeniden koşsun diye) ve React o anda ögeyi
            değiştiriyor: işaretçi yakalaması (`setPointerCapture`) ve
            olay dinleyicileri hamlenin ortasında kopardı. Bu kutu hiç
            değişmiyor.

            Yan faydası: dokunma alanı tahtanın iki yanındaki boşluğu
            da kapsıyor, yani kenar sütuna hamle yapmak için parmağı
            tam tahtanın üstünde tutmak gerekmiyor. */}
        <div
          className="flex min-h-0 items-start justify-center"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            parmak.current = { x: e.clientX, baslangic: Date.now() };
            setBasili(true);
          }}
          onPointerMove={(e) => {
            const p = parmak.current;
            const kutu = tahtaRef.current?.getBoundingClientRect();
            if (!p || !kutu) return;
            /* Hücre genişliği kadar kayınca bir hamle. Sabit bir
               piksel eşiği dar ekranda aşırı hassas, geniş ekranda
               tembel olurdu. */
            const hucre = kutu.width / DUSEN_EN;
            const adim = Math.trunc((e.clientX - p.x) / hucre);
            if (adim === 0) return;
            for (let i = 0; i < Math.abs(adim); i++) hareket(adim > 0 ? "sag" : "sol");
            // Çapa taşınıyor, sıfırlanmıyor: kalan kesir korunuyor ve
            // yavaş sürüklemede hareket birikerek doğru yere varıyor.
            p.x += adim * hucre;
          }}
          onPointerUp={() => {
            parmak.current = null;
            setBasili(false);
          }}
          onPointerCancel={() => {
            parmak.current = null;
            setBasili(false);
          }}
        >
          {/* 🔴 Satırın yüksekliğini TAHTA belirliyor, kapsayıcı değil.

              İlk deneme `items-stretch`ti ve ölçüldü: SIRADAKİ sütunu
              622 piksele uzuyordu, tahta ise 446 — sütunun altında
              176 piksel boş kutu kalıyor ve ikisi hizasız duruyordu.

              `items-start` ile satırın yüksekliği en uzun ögeden
              (tahta) geliyor ve sütun kendi içeriği kadar olup tahtanın
              üst kenarına hizalanıyor. Referanstaki düzen de bu. */}
          <div className="flex w-full max-h-full items-start justify-center gap-2">
          <div className="flex min-w-0 flex-1 items-center justify-end">
          <div
            key={`sars-${y.sarsinti}`}
            ref={tahtaRef}
            className={`aspect-[10/16] h-auto max-h-full w-full max-w-[min(100%,calc((100dvh-320px)*0.625))] ${
              y.sarsinti > 0 ? "dusen-sars" : ""
            }`}
            style={dusenCerceve()}
          >
            <div className="relative h-full w-full overflow-hidden" style={dusenTahtasi()}>
              <div
                className="grid h-full w-full gap-[2px] p-[3px]"
                style={{
                  // ⚠️ Satır ve sütun ELLE: Tailwind'in varsayılan
                  // ölçeğinde `grid-rows-16` yok ve hücreler
                  // `aspect-square` ile boyutlanırsa tahta taşıyor.
                  gridTemplateColumns: `repeat(${DUSEN_EN}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${DUSEN_BOY}, minmax(0, 1fr))`,
                }}
              >
                {/* 🔴 İnen parça bu ızgarada DEĞİL — Ü216. Ayrı bir
                    katmanda ve kayarak iniyor; gerekçe aşağıda. */}
                {Array.from({ length: DUSEN_EN * DUSEN_BOY }, (_, i) => {
                  const s = Math.floor(i / DUSEN_EN);
                  const hucreRenkNo = y.renkler[i];
                  const yerlesik = (durum.izgara[s] & (1 << i % DUSEN_EN)) !== 0;
                  const patliyor = patlayanSatirlar.has(s);

                  if (yerlesik) {
                    return (
                      <span
                        key={i}
                        className={`h-full w-full rounded-[4px] ${patliyor ? "dusen-patla" : ""}`}
                        style={DOLU_STILLERI[hucreRenkNo > 0 ? hucreRenkNo - 1 : 0]}
                      />
                    );
                  }
                  if (hayaletKareler.has(i)) {
                    return (
                      <span
                        key={i}
                        className="h-full w-full rounded-[4px]"
                        style={HAYALET_STILLERI[renkNo]}
                      />
                    );
                  }
                  return <span key={i} className="h-full w-full rounded-[4px]" style={BOS_STILI} />;
                })}
              </div>

              {/* ── İnen parça — Ü216 ─────────────────
                  Ürün sahibi: *"daha akıcı ilerlemeli, çok takılarak
                  ilerliyor."* Parça ızgaranın içindeyken hücreden
                  hücreye **ışınlanıyordu** ve başlangıçta düşme
                  aralığı 28 tick, yani **1,4 saniye** — saniyede bir
                  kez yer değiştiren bir şey tanım gereği takılır.

                  Çözüm ara değerleme: motor ayrık kalıyor (replay
                  bozulmasın), aradaki kareleri **CSS geçişi**
                  dolduruyor. React saniyede bir kez render ediyor,
                  tarayıcı arada 30 kare çiziyor — Ü214'te kazanılan
                  render tasarrufu duruyor.

                  ⚠️ Yatay ve dikey AYRI katmanlarda ve süreleri
                  farklı: aşağı iniş yerçekimi kadar yavaş (1,4 s),
                  yana hamle ise oyuncunun parmağı kadar hızlı olmalı.
                  Tek katmanda olsalardı sağa basmak parçayı 1,4
                  saniyede kaydırırdı ve oyun cevapsız hissettirirdi.

                  ⚠️ Dış katmanın `key`i `parcaNo`: yeni parça taze bir
                  öge olarak doğuyor. Aynı öge kalsaydı yeni parça,
                  öncekinin kilitlendiği yerden yukarı doğru süzülürdü.

                  ⚠️ `transform` kullanılıyor, `left/top` değil: ikisi
                  de animasyonlanıyor ama `left/top` her karede düzen
                  hesabı tetikliyor. */}
              <div
                key={`parca-${durum.parcaNo}`}
                aria-hidden
                className="pointer-events-none absolute inset-0 p-[3px]"
              >
                <div
                  className="relative h-full w-full"
                  style={{
                    transform: `translateX(calc(${durum.k} * ${hucreAdimi(DUSEN_EN)}))`,
                    transition: `transform ${YATAY_GECIS_MS}ms ease-out`,
                    willChange: "transform",
                  }}
                >
                  <div
                    className="relative h-full w-full"
                    style={{
                      transform: `translateY(calc(${durum.s} * ${hucreAdimi(DUSEN_BOY)}))`,
                      transition: `transform ${durum.dusmeTicki * TICK_MS}ms linear`,
                      willChange: "transform",
                    }}
                  >
                    {PARCA_DONUSLERI[durum.parca][durum.donus].map(([ds, dk], n) => (
                      <span
                        key={n}
                        className="absolute rounded-[4px]"
                        style={{
                          left: `calc(${dk} * ${hucreAdimi(DUSEN_EN)})`,
                          top: `calc(${ds} * ${hucreAdimi(DUSEN_BOY)})`,
                          width: `calc(${hucreBoyu(DUSEN_EN)})`,
                          height: `calc(${hucreBoyu(DUSEN_BOY)})`,
                          ...(paketDusuyor ? PAKET_HUCRESI : AKTIF_STILLERI[renkNo]),
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Silinen satırda soldan sağa geçen ışık. */}
              {patlama?.satirlar.map((s) => (
                <span
                  key={`sup-${patlama.anahtar}-${s}`}
                  aria-hidden
                  className="dusen-supurge pointer-events-none absolute left-0"
                  style={{
                    top: `${(s / DUSEN_BOY) * 100}%`,
                    height: `${(1 / DUSEN_BOY) * 100}%`,
                    width: "100%",
                  }}
                />
              ))}

              {/* Parçacıklar. */}
              {patlama && (
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  {patlama.parcaciklar.map((p, i) => (
                    <span
                      key={`${patlama.anahtar}-${i}`}
                      className="dusen-parcacik absolute rounded-[1px]"
                      style={
                        {
                          left: `${((p.k + 0.5) / DUSEN_EN) * 100}%`,
                          top: `${((p.s + 0.5) / DUSEN_BOY) * 100}%`,
                          width: p.b,
                          height: p.b,
                          background: p.renk,
                          boxShadow: `0 0 6px ${p.renk}`,
                          animationDelay: `${p.gecikme}ms`,
                          "--u": `${p.u}px`,
                          "--v": `${p.v}px`,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
              )}

              {/* İKİLİ / ÜÇLÜ / MÜKEMMEL! */}
              {patlama?.ad && (
                <span
                  key={`ad-${patlama.anahtar}`}
                  aria-hidden
                  className="dusen-kombo pointer-events-none absolute left-1/2 top-[38%] font-display text-[26px] leading-none font-black tracking-tight italic whitespace-nowrap"
                  style={{
                    color: patlama.ad.renk,
                    textShadow: `0 0 14px ${patlama.ad.renk}, 0 2px 0 rgba(0,0,0,.45)`,
                  }}
                >
                  {patlama.ad.ad}
                </span>
              )}

              {/*
                Teslim kartı — Ü207. Blok'takiyle birebir aynı cümleler:
                iki oyunda da aynı şey oluyor, farklı anlatmak oyuncuya
                iki ayrı kural varmış gibi gelirdi.

                ⚠️ "Eşiği geçtin" YAZMIYOR — ürün sahibi *"eşik geçildi
                tarzı şeyler yazmasın"* dedi. Yazan şey ödülün nereye
                gideceği; onu da kendisi sordu.
              */}
              {y.odulKarti && (
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div
                    className="odul-karti absolute flex flex-col items-center gap-1 rounded-2xl px-4 py-3 text-center whitespace-nowrap"
                    style={{
                      left: "50%",
                      top: "44%",
                      background: "linear-gradient(160deg, #101a3d 0%, #1e2a6b 100%)",
                      boxShadow: "0 0 0 3px var(--color-odul), 0 14px 30px -10px rgba(0,0,0,.8)",
                    }}
                  >
                    <span className="text-[30px] leading-none">🎟️</span>
                    <span className="font-display text-[15px] leading-tight font-bold text-white">
                      Ödülün kazanıldı
                    </span>
                    <span className="text-[11px] leading-snug text-white/70">
                      Tur bitince Ödüllerim&apos;e düşecek
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* ── SIRADAKİ sütunu — Ü211 ────────────────
              🔴 Üst şeritten buraya taşındı. Orada üç panel yan yana
              sıkışıyordu ve parçalara 7 piksellik hücre kalıyordu;
              ürün sahibi *"sıradakiler hiç belli değil"* dedi.
              Referansta da zaten tahtanın sağında dikey bir sütun.

              ⚠️ Sütun sabit genişlikte, tahta kalanı alıyor. Tersi
              (tahta sabit, sütun kalan) denenebilirdi ama o zaman
              sütunun genişliği ekrandan ekrana değişir ve parça
              önizlemesi bazı telefonlarda yine okunmaz hâle gelirdi.
              Okunurluk sabit, tahta esnek.

              ⚠️ İlk parça tam opak ve büyük, sonrakiler küçülerek
              soluyor: "sıra" bir liste değil, bir **öncelik**. Hepsi
              aynı görünseydi oyuncu hangisinin bir sonraki olduğunu
              her seferinde okumak zorunda kalırdı. */}
          <div
            className="flex w-[64px] shrink-0 flex-col items-center gap-1.5 py-2.5"
            style={dusenPanel("#FB7BC0")}
          >
            <span className="font-data text-[8px] leading-none font-bold tracking-[0.12em] text-[#FB7BC0]">
              SIRADAKİ
            </span>
            {siradaki.map((parca, i) => (
              <span
                key={i}
                className="flex h-[42px] w-full items-center justify-center"
                style={{ opacity: i === 0 ? 1 : 0.55 }}
              >
                <Onizleme parca={parca} boy={i === 0 ? 12 : 9} />
              </span>
            ))}
          </div>
          </div>
        </div>

        {/* ── İki düğme — Ü210 ──────────────────────────
            Yön tuşları KALKTI: yana hareket artık parmakla, aşağı
            hareket parmağı basılı tutarak yapılıyor. Geriye motorun
            parmakla anlatılamayan iki hamlesi kaldı.

            ⚠️ "Çevir" solda ve daha dar, "Bırak" sağda ve geniş.
            İkisi eşit olsaydı en sık basılan tuşun hangisi olduğu
            görünmezdi; ayrıca yanlışlıkla bırakmak turu bitirebilir,
            yanlışlıkla çevirmek bir hamle kaybettirir. Büyük olan,
            oyuncunun kasten bastığı olmalı.

            ⚠️ Tahtanın hemen altındalar ve yükseklikleri aynı:
            başparmak ikisi arasında gidip gelirken hedef değiştirmiyor. */}
        <div className="grid shrink-0 grid-cols-[1fr_1.7fr] gap-2">
          <button
            type="button"
            onClick={() => hareket("don")}
            aria-label="Çevir"
            className="flex items-center justify-center gap-1.5 rounded-2xl py-3.5 font-display text-[14px] font-bold tracking-wide text-[#BFE9FF] uppercase transition-transform select-none active:scale-95"
            style={{
              background: "linear-gradient(170deg, rgba(24,38,92,.9) 0%, rgba(11,18,52,.9) 100%)",
              boxShadow:
                "inset 0 0 0 1.5px rgba(94,233,255,.45), inset 0 1px 0 rgba(255,255,255,.12)",
            }}
          >
            <span className="font-data text-[20px] leading-none">↻</span>
            Çevir
          </button>
          <button
            type="button"
            onClick={() => hareket("birak")}
            aria-label="En aşağı bırak"
            className="rounded-2xl py-3.5 font-display text-[15px] font-bold tracking-wide text-[#04121f] uppercase transition-transform select-none active:scale-[0.98]"
            style={{
              background: "linear-gradient(180deg, #8DF3FF 0%, #22D3EE 55%, #0EA5C9 100%)",
              boxShadow: "0 0 18px rgba(34,211,238,.5), inset 0 1px 0 rgba(255,255,255,.7)",
            }}
          >
            Bırak ▼
          </button>
        </div>

        {/* İpucu — ilk turda kimse parmakla oynanacağını bilmiyor.
            ⚠️ Yalnızca parça henüz hiç konmadıysa: oyuncu bir kez
            oynadıysa öğrenmiştir ve kalıcı bir ipucu gürültüdür. */}
        {durum.parcaNo === 0 && (
          <p className="shrink-0 text-center text-[12px] text-white/45">
            Tahtada parmağını kaydır · basılı tut, hızlansın
          </p>
        )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Durum ilerletme — tek yerde
   ═══════════════════════════════════════════════════════════ */

/**
 * Bir girdiyi uygular ve `Yerel`in tamamını günceller.
 *
 * 🔴 **Saf.** Yerçekimi zamanlayıcısı da dokunuş da buradan geçiyor ve
 * React güncelleyiciyi iki kez çağırabiliyor (StrictMode). İçinde bir
 * yan etki olsaydı girdi kaydı ikilenir, sunucunun tekrarı sapar ve
 * dürüst oyuncunun turu reddedilirdi — bu dosyanın en üstündeki not.
 *
 * @param kaydet Oyuncunun hamlesi mi (kaydedilecek) yoksa yerçekimi mi.
 */
function ilerle(p: Yerel, girdi: DusenGirdisi, tick: number, kaydet: boolean): Yerel {
  const sonuc = uygulaVeKilitler(p.durum, girdi);
  if (!sonuc) return p;

  const { durum, kilitler } = sonuc;
  const renkler = renkleriIsle(p.renkler, kilitler);
  const silinen = kilitler.flatMap((k) => k.silinen);

  return {
    ...p,
    durum,
    girdiler: kaydet ? [...p.girdiler, girdi] : p.girdiler,
    renkler,
    patlama:
      silinen.length > 0
        ? {
            anahtar: tick,
            satirlar: silinen,
            parcaciklar: parcacikUret(silinen, kilitler),
            ad: satirAdi(silinen.length),
          }
        : p.patlama,
    // Dört satır birden: tahta sarsılıyor. Ü202'de Blok'ta ürün
    // sahibinin ölçüsü 2 pikseldi; aynı ölçü burada da.
    sarsinti: silinen.length >= 4 ? p.sarsinti + 1 : p.sarsinti,
    odulKarti: p.odulKarti || (!p.durum.odulVerildi && durum.odulVerildi),
  };
}

/**
 * Renk ızgarasını kilitlenmelere göre günceller.
 *
 * ⚠️ Silinen satırlar **küçükten büyüğe** işleniyor ve bu şart:
 * bir satır çıkarılınca üstündekiler bir aşağı kayıyor, altındakilerin
 * indeksi değişmiyor. Ters sırada işlenseydi ikinci silme yanlış satırı
 * götürürdü. `kilitKaydi` diziyi zaten artan sırada veriyor.
 */
function renkleriIsle(onceki: Uint8Array, kilitler: Kilitlenme[]): Uint8Array {
  if (kilitler.length === 0) return onceki;

  const satirlar: number[][] = [];
  for (let s = 0; s < DUSEN_BOY; s++) {
    satirlar.push(Array.from(onceki.subarray(s * DUSEN_EN, (s + 1) * DUSEN_EN)));
  }

  for (const kilit of kilitler) {
    const renkNo = kupRengi(kilit.parca) + 1;
    for (const kare of kilit.kareler) {
      satirlar[Math.floor(kare / DUSEN_EN)][kare % DUSEN_EN] = renkNo;
    }
    for (const satir of kilit.silinen) {
      satirlar.splice(satir, 1);
      satirlar.unshift(new Array(DUSEN_EN).fill(0));
    }
  }

  const yeni = new Uint8Array(DUSEN_EN * DUSEN_BOY);
  satirlar.forEach((satir, s) =>
    satir.forEach((v, k) => {
      yeni[s * DUSEN_EN + k] = v;
    }),
  );
  return yeni;
}

/**
 * Silinen satırlardan parçacık üretir.
 *
 * ⚠️ `Math.random()` YOK ve olmamalı: bileşen her yeniden çizildiğinde
 * yeni sayılar üretilir ve parçacıklar yerinden sıçrar. Yön, mesafe ve
 * gecikme kare indeksinden türüyor.
 *
 * ⚠️ Toplam 40'ta tutuluyor (ürün sahibinin Blok için verdiği 20–40
 * aralığı). Dört satır 40 hücre demek; hücre başına üç parçacık 120
 * ederdi ve telefonda kare atlatırdı.
 */
function parcacikUret(satirlar: number[], kilitler: Kilitlenme[]): Parcacik[] {
  const renk = KUP_RENKLERI[kupRengi(kilitler[0]?.parca ?? 0)];
  const hucre = satirlar.length * DUSEN_EN;
  const basina = Math.max(1, Math.floor(40 / Math.max(1, hucre)));
  const out: Parcacik[] = [];

  for (const s of satirlar) {
    for (let k = 0; k < DUSEN_EN; k++) {
      for (let n = 0; n < basina; n++) {
        const i = s * DUSEN_EN + k;
        const aci = (((i * 47 + n * 113) % 360) * Math.PI) / 180;
        const mesafe = 16 + ((i * 17 + n * 31) % 22);
        out.push({
          s,
          k,
          u: Math.round(Math.cos(aci) * mesafe),
          // Yerçekimi yerine hafif yukarı: aşağı düşen parçacık
          // "döküldü" gibi duruyor, yukarı savrulan "patladı".
          v: Math.round(Math.sin(aci) * mesafe) - 8,
          b: n === 0 ? 5 : 3,
          renk: n === 0 ? renk.isik : "rgba(255,255,255,.95)",
          gecikme: (k % DUSEN_EN) * 16 + n * 30,
        });
      }
    }
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════
   Küçük parçalar
   ═══════════════════════════════════════════════════════════ */

/**
 * Ödül paketinin zemini — Ü207.
 *
 * 🔴 Ü209'da gerekçesi DEĞİŞTİ ama sonucu değişmedi. Eskiden inen parça
 * hep altındı ve paket ondan ayrılamıyordu. Artık her parçanın kendi
 * rengi var; paket yine de altın kalıyor çünkü ödül ürünün her yerinde
 * altın (`--color-odul`) ve bir kupon bir küp gibi görünmemeli.
 *
 * Ayıran şey doku: çapraz kurdele şeritleri. 375×812'de ölçüldü —
 * 🎁 rozeti 29 piksellik hücrede çözünmüyor, hücre başına kurdele haçı
 * ise parçayı hücrelerine ayırıyor.
 */
const PAKET_HUCRESI: React.CSSProperties = {
  background: [
    "repeating-linear-gradient(135deg, rgba(255,252,235,.85) 0 4px, rgba(255,255,255,0) 4px 11px)",
    "linear-gradient(180deg, #e8b93c 0%, #a9781a 100%)",
  ].join(", "),
  boxShadow: "inset 0 0 0 1.5px rgba(255,248,214,.95), 0 0 12px rgba(255,215,94,.9)",
};

/**
 * "SIRADAKİ" panelindeki tek parça önizlemesi.
 *
 * ⚠️ Parça kendi kutusuna **sığdırılıyor**, sabit bir ızgaraya değil:
 * set 3, 4 ve 5 hücreli karışık parçalardan oluşuyor (Ü22) ve sabit
 * 4×4 bir kutuda üçlü parça kutunun köşesinde küçücük kalırdı.
 */
function Onizleme({ parca, boy }: { parca: number; boy: number }) {
  const hucreler = PARCA_DONUSLERI[parca][0];
  const enCokS = Math.max(...hucreler.map((h) => h[0])) + 1;
  const enCokK = Math.max(...hucreler.map((h) => h[1])) + 1;
  const renk = KUP_RENKLERI[kupRengi(parca)];

  return (
    <span
      className="grid gap-[1.5px]"
      style={{
        gridTemplateColumns: `repeat(${enCokK}, ${boy}px)`,
        gridTemplateRows: `repeat(${enCokS}, ${boy}px)`,
      }}
      aria-hidden
    >
      {Array.from({ length: enCokS * enCokK }, (_, i) => {
        const s = Math.floor(i / enCokK);
        const k = i % enCokK;
        const dolu = hucreler.some(([a, b]) => a === s && b === k);
        return (
          <span
            key={i}
            className="rounded-[2px]"
            style={
              dolu
                ? {
                    /* Tahtadaki camın küçük hâli: aynı merkez-yoğun
                       degrade. Düz renk olsaydı önizleme tahtadaki
                       parçaya benzemez, oyuncu ikisini eşleştirmek için
                       biçime bakmak zorunda kalırdı. */
                    background: `radial-gradient(ellipse 90% 90% at 50% 45%, rgb(${renk.orta}) 0%, rgb(${renk.alt}) 100%)`,
                    boxShadow: `inset 0 1px 0 rgb(${renk.ust} / .85), 0 0 5px ${renk.isik}80`,
                  }
                : undefined
            }
          />
        );
      })}
    </span>
  );
}

/**
 * Hoparlör — Ü205'te eklendi, Ü206'da belirginleşti.
 *
 * Ürün sahibi *"ses açıp kapatma kısmı daha belirgin olmalı"* dedi.
 * Kapalı bir özelliğin düğmesi, açık olanınkinden daha görünür olmak
 * zorunda: oyuncu sesi açabileceğini bilmiyorsa özellik yok demektir.
 */
function SesDugmesi({ acik, degistir }: { acik: boolean; degistir: () => void }) {
  return (
    <button
      type="button"
      onClick={degistir}
      aria-pressed={acik}
      className="inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-2 font-data text-[11px] font-bold tracking-wide uppercase transition-colors"
      style={
        acik
          ? {
              background: "linear-gradient(180deg, #8DF3FF 0%, #22D3EE 100%)",
              color: "#04121f",
            }
          : {
              boxShadow: "inset 0 0 0 1.5px rgba(94,233,255,.55)",
              color: "rgba(255,255,255,.72)",
            }
      }
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z" fill="currentColor" />
        {acik ? (
          <>
            <path d="M15.6 9.2a4 4 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M18.1 6.8a7.5 7.5 0 0 1 0 10.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </>
        ) : (
          <path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
      {acik ? "Ses açık" : "Ses kapalı"}
    </button>
  );
}

/**
 * Düşme hızını okunur bir kademeye çevirir.
 *
 * Tick sayısı oyuncuya bir şey söylemiyor (üstelik ters yönde artıyor);
 * "seviye 4" söylüyor. 28 tick → 1, 5 tick → 12.
 */
function hizKademesi(dusmeTicki: number): number {
  return Math.max(1, Math.round((28 - dusmeTicki) / 2) + 1);
}
