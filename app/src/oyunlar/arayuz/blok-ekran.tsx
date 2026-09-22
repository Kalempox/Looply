"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  blok,
  kademe,
  temizlenecekler,
  type BlokDurumu,
  type BlokGirdisi,
  PARCA_HUCRELERI,
} from "../blok";
import {
  BLOK_RENKLERI,
  blokBosHucre,
  blokDoluHucre,
  blokHedefHucre,
  blokRengi,
  blokSahnesi,
  blokTahtasi,
  komboBul,
  type BlokRengi,
} from "./blok-yuzey";
import { useOyunSesi } from "./oyun-ses";
import type { OyunEkraniProps } from "./ortak";

/**
 * Blok ekranı — parçayı sürükle, nereye ineceğini gör, bırak.
 *
 * ── İki giriş yolu, tek kural ───────────────────────────────
 *
 * İlk sürüm yalnızca **dokunmayla** çalışıyordu: önce parça seç, sonra
 * ızgarada bir kareye dokun. Test eden ilk kişi oyunu açtı, parçayı
 * sürüklemeye çalıştı, hiçbir şey olmadı ve *"oyun açılmadı"* dedi —
 * blok oyunu denince insanın beklediği şey sürüklemek.
 *
 * Şimdi ikisi de var:
 *   · **Sürükle-bırak** — beklenen davranış, varsayılan yol.
 *   · **Dokun-dokun** — parçaya dokun, kareye dokun. Klavyeyle
 *     oynanabilen tek yol bu, o yüzden kaldırılmadı: ızgara hâlâ
 *     gerçek `<button>`lardan oluşuyor.
 *
 * ── İniş önizlemesi ─────────────────────────────────────────
 *
 * Sürüklerken **yalnızca parçanın kaplayacağı kareler** boyanıyor:
 * sığıyorsa vurgu rengi, sığmıyorsa tehlike.
 *
 * Bir ara sürüm parçanın sığdığı bütün köşeleri de ışıklandırıyordu.
 * Kaldırıldı: ızgaranın yarısı yanınca parçanın nereye **ineceği** değil
 * nereye **inebileceği** görünüyor ve oyuncunun sorduğu soru bu değil.
 *
 * Çapa: parçanın sol üst köşesi ───────────────────────────
 *
 * Parmağın altındaki kare, parçanın sol üst köşesi oluyor. Parmağın
 * ortaya denk gelmesi daha "doğal" görünürdü ama parçalar farklı
 * boyutta: kural her parçada değişirdi. Sabit çapa + görünür önizleme,
 * tahmin etmeyi tamamen gereksiz kılıyor.
 *
 * ── Ü202: kendi sahnesi, kendi paleti ───────────────────────
 *
 * Yüzey artık `blok-yuzey.ts`ten — koyu sahne, parlak panel, cam
 * hücreler, çok renkli şeker bloklar. Ü85'te tahta oyunun tek kimlik
 * rengini alıyordu; ürün sahibi beş renkli bir set isteyince o kural
 * Blok için bilerek kırıldı. Diğer üç oyun `tahta.tsx`te duruyor.
 */
/**
 * Ekranda beliren geçici efektler — Ü199.
 *
 * ⚠️ Hepsinde `anahtar` var ve React `key`i olarak kullanılıyor. CSS
 * animasyonu bir ögede **bir kez** koşuyor; aynı ögeye ikinci kez sınıf
 * vermek onu yeniden başlatmıyor. Anahtar değişince React ögeyi
 * değiştiriyor ve animasyon baştan koşuyor. Aynı numara `Sayaclar`daki
 * skorda da var (`key={durum.skor}`).
 */
type Patlama = {
  anahtar: number;
  /** Temizlenen hücrelerin ızgara sırası (0-63). */
  kareler: Set<number>;
  /** Bu hamlenin kazandırdığı puan. */
  puan: number;
  /** Puanın uçacağı nokta — temizlenen karelerin ağırlık merkezi. */
  s: number;
  k: number;
  /** Kaç çizgi birden. */
  cizgi: number;
  parcaciklar: Parcacik[];
  kombo: { ad: string; renk: string } | null;
};

/** Tek parçacık — yönü ve mesafesi kare indeksinden türüyor. */
type Parcacik = {
  s: number;
  k: number;
  /** Uçacağı yön (piksel). */
  u: number;
  v: number;
  /** Dönme açısı. */
  d: number;
  /** Kenar uzunluğu. */
  b: number;
  /** 0 kıvılcım · 1 mücevher (kare, 45°) · 2 toz */
  tur: number;
  renk: string;
  gecikme: number;
};

/** Yerleşen parça — sekme, darbe halkası ve 2 piksellik vuruş. */
type Vurus = {
  anahtar: number;
  /** Bu hamlede dolan kareler — sekme onlarda koşuyor. */
  kareler: number[];
  s: number;
  k: number;
};

/**
 * Temizlenen karelerden parçacık üretir.
 *
 * ⚠️ `Math.random()` YOK ve olmamalı: bileşen her yeniden çizildiğinde
 * yeni sayılar üretilir ve parçacıklar yerinden sıçrar. Yön, mesafe ve
 * gecikme kare indeksinden türüyor — aynı patlama her karede aynı.
 *
 * ⚠️ Toplam sayı 40'ta tutuluyor (ürün sahibinin aralığı 20-40). İki
 * satır birden temizlendiğinde 16 kare oluyor; kare başına üç parçacık
 * 48 ederdi ve telefonda kare atlatıyordu.
 */
function parcacikUret(kareler: Set<number>, renk: BlokRengi): Parcacik[] {
  const liste = [...kareler];
  const kareBasina = Math.max(1, Math.min(3, Math.floor(40 / liste.length)));
  const out: Parcacik[] = [];

  for (const i of liste) {
    for (let n = 0; n < kareBasina; n++) {
      const aci = (((i * 47 + n * 113) % 360) * Math.PI) / 180;
      const mesafe = 22 + ((i * 17 + n * 31) % 26);
      out.push({
        s: Math.floor(i / 8),
        k: i % 8,
        u: Math.round(Math.cos(aci) * mesafe),
        // Yerçekimi yerine hafif yukarı: aşağı düşen parçacık
        // "döküldü" gibi duruyor, yukarı savrulan "patladı".
        v: Math.round(Math.sin(aci) * mesafe) - 10,
        d: (i * 71 + n * 23) % 360,
        b: n === 0 ? 6 : n === 1 ? 5 : 3,
        tur: n % 3,
        renk: n === 0 ? "#FFE680" : n === 1 ? renk.isik : "rgba(255,255,255,.92)",
        gecikme: 60 + (i % 8) * 24 + n * 40,
      });
    }
  }
  return out;
}

/*
  ⚠️ `oyunId` ARTIK OKUNMUYOR ve bu bilinçli. Ü85'ten Ü201'e kadar
  tahtanın rengi ondan türüyordu; Ü202'de Blok kendi şeker paletine
  geçti (`blok-yuzey.ts`). Oyunun kimlik rengi kaybolmadı — kart,
  ikon ve başlık hâlâ `oyunRengi`den geliyor, tahta gelmiyor.
*/
export function BlokEkrani({ tohum, bitti, kazandirir = true, cik }: OyunEkraniProps) {
  const [durum, setDurum] = useState<BlokDurumu>(() => blok.baslat(tohum));
  const [girdiler, setGirdiler] = useState<BlokGirdisi[]>([]);
  const [secili, setSecili] = useState<number | null>(null);
  const [patlama, setPatlama] = useState<Patlama | null>(null);
  /** Son yerleşme — sekme, halka ve 2 piksellik vuruş buradan. */
  const [vurus, setVurus] = useState<Vurus | null>(null);
  /**
   * Hücre renkleri — 0 boş, n>0 `BLOK_RENKLERI[n-1]`.
   *
   * 🔴 Motorun durumunda DEĞİL ve olmamalı. Motor skoru hesaplıyor,
   * sunucu aynı girdileri tekrar oynatıyor; renk skora dokunmuyor.
   * Oraya konsaydı sunum katmanı replay sözleşmesine sızardı.
   */
  const [renkler, setRenkler] = useState<Uint8Array>(() => new Uint8Array(64));
  /** Sığmayan yere bırakıldı — tahta titriyor. */
  const [sarsinti, setSarsinti] = useState(0);
  /**
   * Açılan ödül paketi — Ü201.
   *
   * Konum taşıyor çünkü kutlama ekranın ortasında değil, parçanın
   * **konduğu yerde** açılıyor. Ü199'daki ortadaki kart ürün sahibi
   * tarafından reddedildi: ödül oyunun içinde bir nesne olmalı.
   */
  const [odul, setOdul] = useState<{ anahtar: number; s: number; k: number } | null>(
    null,
  );
  /*
    Kartı ekrandan KALDIRAN zamanlayıcı — Ü207.

    Önce yoktu: kart mount kalıyor, yalnızca animasyonun son karesi onu
    görünmez yapıyordu. Bunun bedeli `prefers-reduced-motion`da
    görünüyordu — animasyon kapalıyken kart asılı kalmasın diye CSS onu
    tamamen gizliyordu ve o cihazlarda oyuncu **ödülünü kazandığını hiç
    görmüyordu.** Kaldırma işi DOM'a geçince o gizleme gereksiz kaldı.

    ⚠️ Süre animasyondan 100 ms uzun: kart kaybolurken kesilmesin.
  */
  useEffect(() => {
    if (!odul) return;
    const zamanlayici = window.setTimeout(() => setOdul(null), 2300);
    return () => window.clearTimeout(zamanlayici);
  }, [odul]);

  /** Sürükleme sırasında parmağın altındaki kare. */
  const [hedef, setHedef] = useState<{ t: number; s: number; k: number } | null>(null);
  /**
   * Basılı tutulan parça ve basma anındaki seçim.
   *
   * State yerine ref: `onPointerDown` içinde `setSecili` çağrıldığı için
   * `onPointerUp` yeni render'ın kapanışını görüyor ve "zaten seçili
   * miydi" sorusu state'ten okunamıyor — ilk dokunuş kendini iptal
   * ederdi. Ref, basma anındaki gerçeği taşıyor.
   */
  const basili = useRef<{ t: number; oncekiSecili: number | null } | null>(null);
  /** Parmak ızgaranın üstüne hiç geldi mi — gelmediyse bu bir dokunuş. */
  const suruklendi = useRef(false);

  /**
   * Sesler — Ü205. Sessiz başlıyor; kafede varsayılan açık ses
   * masadaki oyuncuyu da yanındakini de rahatsız eder.
   */
  const ses = useOyunSesi();

  /**
   * Tam ekranda arka plan kaymıyor — Ü203.
   *
   * Kilitlenmezse parmak hareketi tahtanın altındaki sayfayı kaydırıyor
   * ve oyundan çıkıldığında oyuncu bambaşka bir yerde buluyor kendini.
   * Aynı kilit çark sahnesinde de var (`cark-sahnesi.tsx`).
   */
  useEffect(() => {
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = onceki;
    };
  }, []);

  /**
   * Seçili parça ızgaraya hiç sığıyor mu?
   *
   * Önceki sürüm sığdığı **bütün** köşeleri ışıklandırıyordu. Ürün sahibi
   * kaldırılmasını istedi ve haklı: ızgaranın yarısı yanıp sönünce parçanın
   * nereye ineceği değil, nereye inebileceği görünüyor — oyuncunun sorduğu
   * soru bu değil. Artık yalnızca sürüklenen parçanın kaplayacağı kareler
   * boyanıyor.
   *
   * Sayı yine de hesaplanıyor ama tek bir soru için: hiçbir yere sığmayan
   * parçada oyuncu boşuna uğraşmasın diye. İlk sığan köşede duruyoruz —
   * 64 karenin tamamını taramaya gerek yok.
   */
  const sigiyorMu = useMemo(() => {
    if (secili === null) return true;
    for (let s = 0; s < 8; s++) {
      for (let k = 0; k < 8; k++) {
        if (blok.uygula(durum, { t: secili, s, k })) return true;
      }
    }
    return false;
  }, [durum, secili]);

  /**
   * Parçanın ineceği kareler.
   *
   * Izgara dışına taşan kareler listeye **girmiyor**: `(s + ds) * 8 + k`
   * hesabı taşan bir kareyi bir alt satırın başına sarardı ve önizleme
   * oyuncuya yalan söylerdi. Taşma zaten `gecerli`yi false yapıyor.
   */
  const onizleme = useMemo(() => {
    if (!hedef) return null;
    const parca = durum.teklifler[hedef.t];
    if (parca < 0) return null;

    const kareler = new Set<number>();
    for (const [ds, dk] of PARCA_HUCRELERI[parca]) {
      const s = hedef.s + ds;
      const k = hedef.k + dk;
      if (s < 8 && k < 8) kareler.add(s * 8 + k);
    }

    return {
      kareler,
      gecerli: !!blok.uygula(durum, { t: hedef.t, s: hedef.s, k: hedef.k }),
    };
  }, [hedef, durum]);

  const koy = useCallback(
    (s: number, k: number, t: number | null = secili) => {
      if (t === null) return;
      const girdi: BlokGirdisi = { t, s, k };

      /*
        🔴 Temizlenecekler `uygula`dan ÖNCE soruluyor — Ü199.

        `uygula` geri döndüğünde o hücreler çoktan boşalmış oluyor;
        patlatılacak kare kalmıyor. Motor bunu `temizlenecekler` ile
        söylüyor ve kendi kuralını kullanıyor, ekran hesap yapmıyor.
      */
      const temizlik = temizlenecekler(durum, girdi);

      const sonraki = blok.uygula(durum, girdi);
      if (!sonraki) {
        // Sığmayan yere bırakıldı: tahta titriyor. Ü199'a kadar hiçbir
        // şey olmuyordu ve oyuncu "dokunmadı mı?" diye tekrar deniyordu.
        setSarsinti((n) => n + 1);
        ses.cal("gecersiz");
        return;
      }

      const yeniGirdiler = [...girdiler, girdi];

      /*
        Renk haritası: önce konan kareler boyanıyor, sonra temizlenen
        satır ve sütunlar siliniyor. Sıra önemli — ters olsaydı aynı
        hamlede hem dolan hem temizlenen kare renkli kalırdı.
      */
      const parcaNo = durum.teklifler[t];
      const renkNo = blokRengi(durum.tur, t) + 1;
      const yeniRenkler = Uint8Array.from(renkler);
      const konan: number[] = [];
      if (parcaNo >= 0) {
        for (const [ds, dk] of PARCA_HUCRELERI[parcaNo]) {
          const i = (s + ds) * 8 + (k + dk);
          yeniRenkler[i] = renkNo;
          konan.push(i);
        }
      }
      if (temizlik) {
        for (const sa of temizlik.satirlar) for (let x = 0; x < 8; x++) yeniRenkler[sa * 8 + x] = 0;
        for (const su of temizlik.sutunlar) for (let y = 0; y < 8; y++) yeniRenkler[y * 8 + su] = 0;
      }

      setDurum(sonraki);
      setGirdiler(yeniGirdiler);
      setSecili(null);
      setRenkler(yeniRenkler);
      setVurus({ anahtar: yeniGirdiler.length, kareler: konan, s, k });
      ses.cal("yerlesti");

      if (temizlik && (temizlik.satirlar.length || temizlik.sutunlar.length)) {
        const kareler = new Set<number>();
        for (const sa of temizlik.satirlar) for (let x = 0; x < 8; x++) kareler.add(sa * 8 + x);
        for (const su of temizlik.sutunlar) for (let y = 0; y < 8; y++) kareler.add(y * 8 + su);

        // Ağırlık merkezi: iki satır birden temizlenirse puan ikisinin
        // ortasından çıkıyor, ilkinden değil.
        let ts = 0;
        let tk = 0;
        for (const i of kareler) {
          ts += Math.floor(i / 8);
          tk += i % 8;
        }

        const cizgi = temizlik.satirlar.length + temizlik.sutunlar.length;
        /* Kombonun gücü: aynı anda kaç çizgi VEYA arka arkaya kaçıncı
           temizlik — hangisi büyükse. İkisi de ustalık ama farklı
           türden; birini yok saymak öbürünü ödülsüz bırakırdı. */
        const guc = Math.max(cizgi, sonraki.zincir);

        setPatlama({
          anahtar: yeniGirdiler.length,
          kareler,
          puan: sonraki.skor - durum.skor,
          s: ts / kareler.size,
          k: tk / kareler.size,
          cizgi,
          parcaciklar: parcacikUret(kareler, BLOK_RENKLERI[renkNo - 1]),
          kombo: komboBul(guc),
        });

        /* ⚠️ Süpürge sesi ekrandaki ışıkla aynı anda; kombo sesi
           **sonra** geliyor (`komboBul` 2'den başlıyor). İkisi üst üste
           binseydi kombo süpürgenin içinde kaybolurdu — aynı gerekçe
           görselde de var. */
        ses.cal("temizlik");
        if (komboBul(guc)) window.setTimeout(() => ses.cal("kombo"), 220);
      }

      /*
        🔴 Paket konuldu mu — Ü201.

        Kutlamayı tetikleyen şey artık bir skor eşiği değil, oyuncunun
        **paketli parçayı tahtaya koyması**. Hangi parçanın paketli
        olduğuna motor karar veriyor (`durum.odulTeklifi`) ve motor onu
        yalnızca eşiği geçirmeye yettiği anda teklif ediyor — yani
        buradaki kutlama gerçekten kazanılmış bir kuponu anlatıyor.
      */
      // ⚠️ Kutlama da yalnızca kazandıran turda: paket kafe dışında
      // sessizce kullanılıyor, çünkü kupon açılmayacak.
      if (durum.odulTeklifi === t && kazandirir) {
        setOdul({ anahtar: yeniGirdiler.length, s, k });
        ses.cal("odul");
      }

      if (blok.bittiMi(sonraki)) {
        bitti(yeniGirdiler, blok.skor(sonraki));
      }
    },
    [durum, girdiler, secili, bitti, renkler, kazandirir, ses],
  );

  /**
   * Ekran koordinatını ızgara karesine çevirir.
   *
   * `elementFromPoint` kullanılıyor, ızgaranın dikdörtgeninden hesap
   * yapılmıyor: aradaki boşluklar ve kenar payı hesaba katılmazsa parmak
   * sınıra yaklaştıkça bir kare kayıyor. Tarayıcı zaten tam isabet
   * biliyor — ona sormak, aynı geometriyi ikinci kez yazmaktan doğru.
   */
  const kareBul = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    const kare = el instanceof Element ? el.closest("[data-kare]") : null;
    if (!(kare instanceof HTMLElement)) return null;
    const i = Number(kare.dataset.kare);
    return { s: Math.floor(i / 8), k: i % 8 };
  };

  return (
    /*
      🔴 Oyun kendi SAHNESİNE oturdu — Ü202.

      Ürün sahibi: *"düz griyi tamamen at… radial gradient, lacivert →
      mor → siyah."* Gerekçe yalnızca estetik değil, ölçülebilir:
      Ü199'da patlamayı beyaz yapmıştım ve GÖRÜNMEMİŞTİ, çünkü boş
      hücreler zaten beyaza yakındı. Işık, üstünde duracağı karanlık
      olmadan patlama olmuyor.

      ⚠️ Sahne YUVARLAK bir panel, tam genişlik değil. İlk denemede
      `-mx-5` ile sayfanın kenarına taşıyordu ve üstündeki başlık
      satırı beyaz zeminde kalıyordu: ekranın ortasında sert bir
      beyaz-lacivert sınırı çıkıyor, oyun yarım kalmış gibi duruyordu.
      Yuvarlak panel o sınırı bilinçli bir kenara çeviriyor ve ürünün
      geri kalanıyla (koyu bilet kartları) aynı dili konuşuyor.
    */
    <div
      className="oyun-alani fixed inset-0 z-40 flex flex-col overflow-hidden px-2 pb-3"
      style={{ ...blokSahnesi(), paddingTop: "max(12px, env(safe-area-inset-top))" }}
    >
      {/* Yavaş yıldızlar — sahnenin ölü durmaması için. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {YILDIZLAR.map((y, i) => (
          <span
            key={i}
            className="blok-yildiz absolute rounded-full bg-white"
            style={{
              left: `${y.x}%`,
              top: `${y.y}%`,
              width: y.b,
              height: y.b,
              animationDelay: `${y.g}ms`,
            }}
          />
        ))}
      </div>

      {/*
        ⚠️ Üst şerit: çıkış + sayaçlar. Tam ekranda sayfanın kendi geri
        bağlantısı görünmüyor; oyuncunun turu bitirmeden çıkabileceği
        tek yer burası. Çıkışın nereye gittiğine kabuk karar veriyor.
      */}
      {/* ⚠️ `min-h-0`: dıştaki `fixed` kutunun içinde bu kolon da
          küçülebilmeli, yoksa tahta taşıyor. */}
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-md flex-col">
        <div className="mb-1 flex items-center justify-between">
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

          {/*
            🔴 Hoparlör — Ü205, SESSİZ başlıyor.

            Ürün sahibinin kararı: *"sesleri yap, dediğin gibi sessiz
            başlasın."* Burası kafe; habersiz çıkan bir ses masadaki
            oyuncuyu da yanındakini de rahatsız eder.

            ⚠️ Düğme ses bağlamını da kuruyor. Tarayıcılar kullanıcı
            hareketi olmadan ses başlatmıyor; sessiz başlamak bunu
            kendiliğinden çözüyor çünkü açma anı zaten bir dokunuş.

            🔴 **Etiketli hap, çıplak ikon değil** — Ü206. İlk hâli
            yalnızca bir hoparlör simgesiydi ve ürün sahibi
            *"ses açıp kapatma kısmı daha belirgin olmalı"* dedi.
            Haklıydı: ses varsayılan KAPALI olduğu için oyuncunun onu
            **bulması** gerekiyor. Kapalı bir özelliğin düğmesi,
            açık bir özelliğinkinden daha görünür olmak zorunda —
            yoksa özellik yok sayılır.

            ⚠️ Açıkken dolu ve altın, kapalıyken çerçeveli ve sönük:
            durum renkten de okunuyor, yalnızca simgeden değil.
          */}
          <button
            type="button"
            onClick={ses.degistir}
            aria-pressed={ses.acik}
            aria-label={ses.acik ? "Sesi kapat" : "Sesi aç"}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold tracking-wide uppercase transition-colors"
            style={
              ses.acik
                ? {
                    background: "var(--color-odul)",
                    borderColor: "var(--color-odul)",
                    color: "#2b1b33",
                  }
                : {
                    background: "rgba(255,255,255,.06)",
                    borderColor: "rgba(255,255,255,.28)",
                    color: "rgba(255,255,255,.75)",
                  }
            }
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z" fill="currentColor" />
              {ses.acik ? (
                <>
                  <path
                    d="M15.6 9.2a4 4 0 0 1 0 5.6"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18.1 6.8a7.5 7.5 0 0 1 0 10.4"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <path
                  d="m16 9.5 5 5m0-5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              )}
            </svg>
            {ses.acik ? "Ses açık" : "Ses kapalı"}
          </button>
        </div>
        <Sayaclar durum={durum} />

        {/*
          ── Izgara ──────────────────────────────────

          Sarmalayıcı `relative`: süpürge, patlama, parçacıklar, uçan
          puan, kombo ve ödül hepsi ızgaranın ÜSTÜNE çiziliyor.

          ⚠️ İki ayrı sarsıntı var: `blok-sars` geçersiz hamlede
          (geniş, yatay), `blok-vurus` yerleşmede (2 piksel, dikey).
          Ayrı olmaları şart — biri "olmadı", öteki "oldu" diyor.
        */}
        {/*
          🔴 Tahta kalan yüksekliği DOLDURUYOR — Ü204.

          Ürün sahibi: *"tam ekran ama hâlâ oynanabilir alan yarım, her
          şeyiyle tam ekran olmalı."* Ölçüldü ve haklıydı: tahta karesini
          **genişlikten** alıyordu (375 piksel ekranda ~343), altında
          ~300 piksel boş lacivert kalıyordu. Tam ekran olan şey sahneydi,
          oyun değil.

          Şimdi üç katlı esnek kolon: başlık (sabit) · tahta (`flex-1`,
          kalanı alıyor) · teklifler (sabit). Tahta kare kalmak zorunda
          olduğu için kısa kenar neyse o: dar ekranda genişlik, uzun
          ekranda yükseklik sınırlıyor.

          ⚠️ `min-h-0` ŞART. Esnek bir çocuk varsayılan olarak
          içeriğinden küçülemiyor (`min-height: auto`); onsuz tahta
          taşıyor ve teklifler ekranın altından çıkıyor.
        */}
        {/*
          🔴 Tahta KARE kalıyor, boşluk ortaya dağılıyor — Ü204.

          İki yanlış deneme oldu ve ikisi de öğretici:

            1. Sabit genişlik → tahta 343 pikselde kaldı, altta ~235
               piksel boş lacivert. Ürün sahibi: *"oynanabilir alan
               yarım."*
            2. `h-full w-auto max-w-full` → tahta yüksekliği doldurdu
               ama **kare bozuldu**: `height` kesin bir değer aldı,
               `max-width` genişliği kırptı ve `aspect-ratio` geri
               besleme yapmıyor. Hücreler dikdörtgen oldu.

          Asıl gerçek şu: 8×8 **kare** bir tahta 375 piksellik telefonda
          en fazla ~355 piksel olabilir — sınır yükseklik değil
          genişlik. Yapılacak şey tahtayı büyütmek değil, kalan
          yüksekliği **dağıtmak**: `flex-1` + ortalama ile boşluk
          tahtanın altına yığılmak yerine üstüne ve altına bölünüyor,
          teklifler de ekranın altına oturuyor.

          ⚠️ Yan dolgu `px-2`: her piksel tahtaya gidiyor.
        */}
        <div className="flex min-h-0 flex-1 items-center justify-center py-2">
        <div
          key={`sars-${sarsinti}`}
          className={`relative aspect-square w-full max-h-full ${
            sarsinti > 0 ? "blok-sars" : ""
          }`}
        >
          <div
            key={`vurus-${vurus?.anahtar ?? 0}`}
            className={`h-full w-full ${vurus ? "blok-vurus" : ""}`}
          >
            <div
              className="grid h-full w-full gap-[3px] rounded-3xl p-2.5"
              style={{
                ...blokTahtasi(),
                // ⚠️ Satır ve sütun ELLE: `grid-rows-8` Tailwind'in
                // varsayılan ölçeğinde yok ve hücreler `aspect-square`
                // ile boyutlanırsa tahta `h-full` içinde taşıyor.
                gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
                gridTemplateRows: "repeat(8, minmax(0, 1fr))",
              }}
            >
              {Array.from({ length: 64 }, (_, i) => {
                const s = Math.floor(i / 8);
                const k = i % 8;
                const dolu = (durum.izgara[s] & (1 << k)) !== 0;
                const inecek = onizleme?.kareler.has(i) ?? false;
                const renkNo = renkler[i];
                const yeniOturdu = vurus?.kareler.includes(i) ?? false;

                return (
                  <button
                    key={i}
                    type="button"
                    data-kare={i}
                    onClick={() => koy(s, k)}
                    disabled={secili === null}
                    aria-label={`${s + 1}. satır ${k + 1}. sütun`}
                    className={`h-full w-full rounded-[6px] transition-[background,box-shadow] duration-150 ${
                      yeniOturdu ? "blok-otur" : ""
                    }`}
                    style={
                      inecek
                        ? blokHedefHucre(onizleme!.gecerli)
                        : dolu
                          ? blokDoluHucre(BLOK_RENKLERI[Math.max(0, renkNo - 1)])
                          : blokBosHucre()
                    }
                  />
                );
              })}
            </div>
          </div>

          {/*
            Süpürge — temizlikte soldan sağa geçen ışık.

            ⚠️ Patlamadan ÖNCE bitiyor (süpürge 300 ms, patlama 60 ms
            gecikmeli). Ürün sahibinin sırası bu: *"sweep ışık geçsin,
            sonra bloklar patlasın."* Aynı anda olsalardı ışık
            patlamanın içinde kaybolurdu.
          */}
          {patlama && (
            <div
              key={`sup-${patlama.anahtar}`}
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
            >
              <span
                className="blok-supurge absolute inset-y-0 w-1/3"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,.85) 50%, transparent 100%)",
                  filter: "blur(2px)",
                }}
              />
            </div>
          )}

          {/*
            Patlama katmanı — ızgaranın BİREBİR kopyası, yalnızca
            temizlenen kareler dolu.

            ⚠️ Geometri ölçülmüyor, aynı ızgara sınıflarıyla yeniden
            kuruluyor. Hücre boyutunu hesaplayıp mutlak konumlandırmak,
            dolgu ve boşluk değiştiği gün sessizce kayardı.
          */}
          {patlama && (
            <div
              key={`pat-${patlama.anahtar}`}
              aria-hidden
              className="pointer-events-none absolute inset-0 grid gap-[3px] rounded-3xl p-2.5"
              style={{
                gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
                gridTemplateRows: "repeat(8, minmax(0, 1fr))",
              }}
            >
              {Array.from({ length: 64 }, (_, i) =>
                patlama.kareler.has(i) ? (
                  <span
                    key={i}
                    className="blok-patla h-full w-full rounded-[6px]"
                    style={{
                      background:
                        "radial-gradient(circle, #ffffff 0%, #ffe680 42%, #f7b02a 100%)",
                      boxShadow: "0 0 18px 5px rgba(255,230,128,.9), 0 0 6px 2px #fff",
                      animationDelay: `${60 + (i % 8) * 24}ms`,
                    }}
                  />
                ) : (
                  <span key={i} />
                ),
              )}
            </div>
          )}

          {/*
            Parçacıklar — kıvılcım, mücevher, toz.

            ⚠️ Yönleri ve mesafeleri kare indeksinden TÜRETİLİYOR,
            `Math.random()` ile değil. Rastgele olsaydı bileşen her
            yeniden çizildiğinde parçacıklar yerinden sıçrardı.
          */}
          {patlama && (
            <div aria-hidden className="pointer-events-none absolute inset-2.5">
              {patlama.parcaciklar.map((pc, n) => (
                <span
                  key={`${patlama.anahtar}-${n}`}
                  className="blok-parcacik absolute"
                  style={
                    {
                      left: `${((pc.k + 0.5) / 8) * 100}%`,
                      top: `${((pc.s + 0.5) / 8) * 100}%`,
                      width: pc.b,
                      height: pc.b,
                      marginLeft: -pc.b / 2,
                      marginTop: -pc.b / 2,
                      borderRadius: pc.tur === 1 ? "2px" : "999px",
                      background: pc.renk,
                      boxShadow: `0 0 8px 1px ${pc.renk}`,
                      animationDelay: `${pc.gecikme}ms`,
                      "--u": `${pc.u}px`,
                      "--v": `${pc.v}px`,
                      "--d": `${pc.d}deg`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          )}

          {/* Darbe halkası — bloğun düştüğü yerden yayılıyor. */}
          {vurus && (
            <div aria-hidden className="pointer-events-none absolute inset-2.5">
              <span
                key={`halka-${vurus.anahtar}`}
                className="blok-halka absolute rounded-full"
                style={{
                  left: `${((vurus.k + 0.5) / 8) * 100}%`,
                  top: `${((vurus.s + 0.5) / 8) * 100}%`,
                  width: 54,
                  height: 54,
                  border: "2px solid rgba(255,255,255,.8)",
                }}
              />
            </div>
          )}

          {/* Kazanılan puan temizliğin ortasından uçuyor. */}
          {patlama && (
            <div aria-hidden className="pointer-events-none absolute inset-2.5">
              <span
                key={`puan-${patlama.anahtar}`}
                className="blok-puan absolute rounded-full px-3 py-1.5 font-data text-[20px] leading-none font-extrabold whitespace-nowrap text-white tabular"
                style={{
                  left: `${((patlama.k + 0.5) / 8) * 100}%`,
                  top: `${((patlama.s + 0.5) / 8) * 100}%`,
                  background: "rgba(11,16,32,.88)",
                  boxShadow:
                    "0 4px 14px -2px rgba(0,0,0,.6), 0 0 0 2px rgba(255,255,255,.28)",
                }}
              >
                +{patlama.puan}
              </span>
            </div>
          )}

          {/*
            Kombo — ekranın ortasında, tek kelime.

            ⚠️ Tek satır temizlikte YOK (`komboBul` 2'den başlıyor).
            Her temizlikte bağıran bir ekran bir süre sonra okunmuyor.
          */}
          {patlama?.kombo && (
            <span
              key={`kombo-${patlama.anahtar}`}
              aria-hidden
              className="blok-kombo pointer-events-none absolute top-1/2 left-1/2 font-display text-[34px] leading-none font-extrabold tracking-tight whitespace-nowrap"
              style={{
                color: patlama.kombo.renk,
                textShadow: `0 3px 0 rgba(11,16,32,.85), 0 0 24px ${patlama.kombo.renk}`,
              }}
            >
              {patlama.kombo.ad}
            </span>
          )}

          {/*
            🔴 Paket KONULDUĞU YERDE açılıyor — Ü201.

            Ü199'da bu tahtanın ortasında "kupon eşiğini geçtin" yazan
            bir karttı. Ürün sahibi reddetti: ödül oyunun kenarında bir
            bildirim değil, içinde bir nesne olmalı.

            ⚠️ `kazandirir` false ise bilet YOK, yalnızca puan. Paket
            yine çıkıyor (motor konumu bilmiyor, bilemez) ama kupon
            açılmayacakken bilet göstermek verilmemiş bir söz olurdu.
          */}
          {odul && (
            <div aria-hidden className="pointer-events-none absolute inset-2.5">
              <div
                key={`odul-${odul.anahtar}`}
                className="odul-karti absolute flex flex-col items-center gap-1 rounded-2xl px-4 py-3 text-center whitespace-nowrap"
                style={{
                  left: `${((odul.k + 0.5) / 8) * 100}%`,
                  top: `${((odul.s + 0.5) / 8) * 100}%`,
                  background: "linear-gradient(160deg, #101a3d 0%, #1e2a6b 100%)",
                  boxShadow:
                    "0 0 0 3px var(--color-odul), 0 14px 30px -10px rgba(0,0,0,.8)",
                }}
              >
                {/*
                  ⚠️ Puan YAZMIYOR: paket Ü203'ten beri sıfır puan
                  veriyor. "+0" göstermek saçma olurdu.

                  ⚠️ Nereye gittiği söyleniyor — ürün sahibi sordu:
                  *"ödül kuponlarım ekranıma mı düşüyor, bunun
                  yönlendirmesi de olmalı."* Kupon tur BİTİNCE sunucu
                  tarafından yazılıyor, o yüzden cümle gelecek zamanda.
                */}
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

        {/*
          ── Teklifler ───────────────────────────────

          🔴 Beyaz kartlar KALKTI — Ü202.

          Üç teklif beyaz, çerçeveli kutuların içindeydi ve referansta
          öyle değil: parçalar doğrudan sahnenin üstünde duruyor. Beyaz
          kutular oyunu bir forma benzetiyordu.

          ⚠️ Dokunma hedefi küçülmedi: kutu görünmez oldu, alanı duruyor
          (`min-h-[92px]` + dolgu). Görünürlüğü kaldırmak, basılabilir
          alanı kaldırmak değil.
        */}
        {/*
          🔴 Teklifler bir "EL" bölgesi — Ü204.

          Kare tahta 375 piksellik telefonda en fazla ~359 olabiliyor ve
          geriye ~250 piksel dikey boşluk kalıyor. O boşluk lacivert bir
          hiçlik olarak dururken ekran yarım görünüyordu; parçaları
          büyütüp altlarına hafif bir panel koymak boşluğu oyunun
          parçası yapıyor.

          ⚠️ Panel tahtadan AÇIK değil koyu: ikisi aynı parlaklıkta
          olsaydı göz hangisinin oynanan yüzey olduğunu seçemezdi.
        */}
        <div
          className="grid shrink-0 grid-cols-3 items-center gap-2 rounded-3xl px-2 py-3"
          style={{
            background: "rgba(255,255,255,.045)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.10)",
          }}
        >
          {durum.teklifler.map((parca, t) => {
            /*
              🔴 Paket kafe DIŞINDA gösterilmiyor — Ü203.

              Ürün sahibi: *"şu an kafe dışında olduğum için ödül
              kazanamamama rağmen ödüllü blok geldi, o ne için?"*
              Haklı — açılmayacak bir ödülü paketleyip göstermek
              verilmemiş bir söz.

              ⚠️ Motor paketi yine üretiyor ve üretmek zorunda: konumu
              bilseydi aynı girdi kaydı iki farklı durum üretir ve
              sunucunun tekrarı sapardı. Gizleyen şey ekran.
            */
            const paketli = durum.odulTeklifi === t && parca >= 0 && kazandirir;
            const renk = BLOK_RENKLERI[blokRengi(durum.tur, t)];
            return (
              <button
                key={t}
                type="button"
                disabled={parca < 0}
                aria-pressed={secili === t}
                onPointerDown={(e) => {
                  if (parca < 0) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  basili.current = { t, oncekiSecili: secili };
                  suruklendi.current = false;
                  setSecili(t);
                  setHedef(null);
                }}
                onPointerMove={(e) => {
                  if (basili.current?.t !== t) return;
                  const kare = kareBul(e.clientX, e.clientY);
                  if (kare) suruklendi.current = true;
                  setHedef(kare ? { t, ...kare } : null);
                }}
                onPointerUp={() => {
                  if (basili.current?.t !== t) return;
                  const onceki = basili.current.oncekiSecili;
                  basili.current = null;

                  if (hedef?.t === t) {
                    koy(hedef.s, hedef.k, t);
                  } else if (!suruklendi.current && onceki === t) {
                    // Aynı parçaya ikinci kez dokunuldu — seçim kalkıyor.
                    setSecili(null);
                  }
                  setHedef(null);
                }}
                onPointerCancel={() => {
                  basili.current = null;
                  setHedef(null);
                }}
                className="relative flex min-h-[104px] items-center justify-center rounded-2xl px-1 py-2 transition-transform duration-150 disabled:opacity-15"
                style={{
                  // touch-action: parmak sürüklerken sayfa kaymasın.
                  touchAction: "none",
                  /* ⚠️ Seçili parça 1.15 büyüyor — ürün sahibinin
                     ölçüsü. Altındaki parıltı da onunla geliyor:
                     *"gölgeden ayrılmalı, altında glow."* */
                  transform: secili === t ? "scale(1.15)" : undefined,
                  filter:
                    secili === t
                      ? `drop-shadow(0 6px 18px ${renk.isik}) drop-shadow(0 0 10px ${renk.isik})`
                      : undefined,
                }}
              >
                {paketli && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{
                      background:
                        "repeating-linear-gradient(135deg, rgba(212,175,55,.22) 0 10px, transparent 10px 22px)",
                      boxShadow: "inset 0 0 0 2px var(--color-odul)",
                    }}
                  />
                )}
                {paketli && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full bg-odul text-[14px] shadow-md"
                  >
                    🎁
                  </span>
                )}
                {parca >= 0 ? (
                  <ParcaOnizleme parca={parca} renk={paketli ? PAKET_RENGI : renk} />
                ) : null}
              </button>
            );
          })}
        </div>

        <p className="mt-3 shrink-0 text-center text-[13px] text-white/55">
          {secili === null
            ? "Bir parçayı ızgaraya sürükle"
            : !sigiyorMu
              ? "Bu parça hiçbir yere sığmıyor — başka parça dene"
              : hedef
                ? onizleme?.gecerli
                  ? "Bırak"
                  : "Buraya sığmıyor"
                : "Izgaranın üstüne sürükle — parçanın ineceği yer görünecek"}
        </p>
      </div>
    </div>
  );
}

/**
 * Sahnedeki yıldızlar — SABİT dizi.
 *
 * ⚠️ Rastgele üretilmiyor: sunucuda ve tarayıcıda farklı sayılar
 * çıkarsa React hidrasyon uyarısı veriyor. Aynı tuzak `cark.tsx`te
 * SVG koordinatlarında da yaşandı (`yuvarla`).
 */
const YILDIZLAR = [
  { x: 8, y: 12, b: 3, g: 0 },
  { x: 22, y: 34, b: 2, g: 900 },
  { x: 41, y: 8, b: 2, g: 1800 },
  { x: 63, y: 22, b: 3, g: 600 },
  { x: 79, y: 44, b: 2, g: 2400 },
  { x: 91, y: 15, b: 2, g: 1200 },
  { x: 14, y: 66, b: 2, g: 3000 },
  { x: 35, y: 88, b: 3, g: 1500 },
  { x: 58, y: 74, b: 2, g: 2100 },
  { x: 86, y: 82, b: 2, g: 300 },
];

/** Paketli parçanın rengi — altın, kendi şeker tonu değil. */
const PAKET_RENGI: BlokRengi = {
  ad: "paket",
  ust: "#FFE9A8",
  orta: "#D4AF37",
  alt: "#8A6206",
  isik: "#FFD75E",
};

/**
 * Üst şerit — temizlenen, zorluk kademesi, zincir ve skor.
 *
 * Ü83'te ilerleme çubuğu kaldırıldı: hedef yok, doldurulacak bir şey yok.
 * Yerine **zorluk kademesi** kondu — oyuncu parçaların neden büyüdüğünü
 * görmeli, yoksa oyun haksız hissettirir.
 */
function Sayaclar({ durum }: { durum: BlokDurumu }) {
  const zorluk = kademe(durum.tur);

  /*
    🔴 Renkler KOYU SAHNEYE göre — Ü202.

    Bu şerit `text-yazi-sonuk` (koyu gri) ve `r.ana` (oyunun orta tonu)
    kullanıyordu; ikisi de açık sayfa zemini için seçilmişti. Sahne
    laciverte dönünce ikisi de kayboldu — tahtayı koyuya taşıyıp HUD'u
    unutmak, Ü166'da ölçülen "boş hücre ile tepsi arasında 1,10
    kontrast" hatasının aynısı olurdu.

    Skor beyaz: sahnedeki en büyük sayı ve rengin taşıyacağı bir bilgi
    yok. Zorluk noktaları turkuaz — paletin en açık tonu.
  */
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="etiket-caps text-white/55">
          {durum.temizlenen} temizlendi
        </span>
        <span className="flex items-baseline gap-2.5">
          {/* Zorluk kademesi noktalarla: "zorluk 3" okunması gereken bir
              sayı, üç dolu nokta bir bakışta görülen bir şey. */}
          <ZorlukNoktalari kademe={zorluk} renk="#5EE7DC" />
          {/* `key` skorla değişiyor ki her artışta animasyon yeniden
              koşsun — sabit anahtarda CSS bir kez oynayıp susuyor. */}
          <span
            key={durum.skor}
            className="patla font-data text-2xl leading-none font-bold text-white tabular"
            style={{ textShadow: "0 0 18px rgba(94,214,255,.6)" }}
          >
            {durum.skor}
          </span>
        </span>
      </div>

      {/* Zincir yalnızca yanarken görünüyor: sürekli duran bir "0" gürültü. */}
      {durum.zincir > 1 && (
        <p
          key={durum.zincir}
          className="patla mt-1.5 inline-block rounded-full border border-odul px-2.5 py-0.5 font-data text-[11px] font-bold tracking-wide text-odul uppercase"
          style={{ background: "rgba(212,175,55,.14)" }}
        >
          {durum.zincir}× zincir
        </p>
      )}

    </div>
  );
}

/** Zorluk kademesi — dört nokta, dolu olanlar kadar zor. */
function ZorlukNoktalari({ kademe, renk }: { kademe: number; renk: string }) {
  return (
    <span className="flex items-center gap-1" aria-label={`Zorluk ${kademe + 1}`}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full transition-colors"
          style={{ background: i <= kademe ? renk : `${renk}2e` }}
        />
      ))}
    </span>
  );
}

/**
 * Parçanın küçük önizlemesi — hangi biçimi seçtiğin görünsün.
 *
 * Ü85: parça artık ızgaradaki hâliyle aynı renkte. Altın duruyordu ve
 * oyuncu yerleştirdiğinde renk değişiyordu — teklif ile sonuç aynı şey
 * olmalı.
 */
function ParcaOnizleme({ parca, renk }: { parca: number; renk: BlokRengi }) {
  const hucreler = PARCA_HUCRELERI[parca];
  const enS = Math.max(...hucreler.map((h) => h[0])) + 1;
  const enK = Math.max(...hucreler.map((h) => h[1])) + 1;
  const dolu = new Set(hucreler.map(([s, k]) => s * enK + k));

  /*
    ⚠️ Ü202: önizleme hücresi 12'den 15'e çıktı ve tahtadaki blokla
    AYNI stili kullanıyor (`blokDoluHucre`). Eskiden düz renk bir
    kareydi; tahta şeker bloğa geçince teklifle sonuç birbirini
    tutmuyordu — oyuncu düz bir kare seçip parlak bir blok koyuyordu.

    ⚠️ Ü204'te 15 → 19'a çıktı: tam ekranda alt bant büyüdü ve küçük
    parçalar o boşlukta kaybolmuştu. Geniş parçalarda hâlâ küçülüyor
    (4 hücre ve üstü 14'e) ki üç teklif aynı yükseklikte kalsın.
  */
  const boy = enK >= 4 || enS >= 4 ? 14 : 19;

  return (
    <div
      className="relative grid gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${enK}, ${boy}px)` }}
      aria-hidden
    >
      {Array.from({ length: enS * enK }, (_, i) => (
        <span
          key={i}
          className="rounded-[3px]"
          style={{
            width: boy,
            height: boy,
            ...(dolu.has(i) ? blokDoluHucre(renk) : { background: "transparent" }),
          }}
        />
      ))}
    </div>
  );
}
