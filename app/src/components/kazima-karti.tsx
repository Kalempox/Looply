"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bilet } from "./bilet";
import { cizLooplyKilidi } from "./logo";
import { GORSEL_RENGI, gorselSec } from "./oyuncu-gorsel";
import type { KuponTuru } from "@/domain/odul";
import type { KategoriTuru } from "@/domain/kategori-tur";

/**
 * Kazınarak açılan kupon — Ü141.
 *
 * ── Referans ────────────────────────────────────────────────
 *
 * Ürün sahibinin verdiği örnek Bread'in günlük puan kartı: dokulu yüzey
 * parmakla silindikçe altındaki ödül açılıyor ve kazınan izin ucundan
 * küçük parçacıklar kopup kartın dışına saçılıyor.
 *
 * ── 🔴 Altında ne var? Hiçbir şey ───────────────────────────
 *
 * Bu bileşenin en önemli yanı ekranda görünmüyor: **kazımadan önce ödül
 * istemcide yok.** Sunucu kapalı kuponun adını, cinsini, kategorisini ve
 * kasada okutulacak jetonunu göndermiyor (`domain/odul.ts`). Yaygın
 * kazıma uygulamalarının çoğu ödülü altına yazıp üstünü örter; orada
 * kazıma bir **perde**dir ve sayfanın kaynağına bakan onu kaldırır.
 * Burada kazıma bir **kapı**: ad ancak sunucu defteri yazdıktan sonra,
 * açma çağrısının yanıtında geliyor.
 *
 * Bunun bedeli var ve kabul edildi: açılış anında ağ gecikmesi kadar
 * bir bekleme oluyor. Perde yaklaşımı anında açardı ama açtığı şey
 * gerçek bir sır olmazdı.
 *
 * ── Neden canvas, neden CSS maskesi değil ───────────────────
 *
 * Kazıma serbest çizgi: parmağın gittiği yer siliniyor, önceden
 * belirlenmiş bir şekil değil. CSS `mask-image` ile yapılsaydı her
 * fırça darbesi için maskeye yeni bir gradyan eklemek ve stili her
 * karede yeniden yazmak gerekirdi. Canvas'ta aynı iş tek bir
 * `destination-out` çizgisi.
 *
 * ── Parmak kaydırmayı bozmuyor mu ───────────────────────────
 *
 * `touch-action: none` yalnızca **yüzeyin üstünde** ve kart 124 piksel
 * yüksekliğinde: oyuncu listeyi kartın dışından kaydırıyor. Yüzeyin
 * üstünde kaydırma kilitlenmeseydi tarayıcı ilk dikey harekette
 * kaydırmaya başlar ve kazıma hiç çalışmazdı.
 *
 * ── Klavye ve hareket azaltma ───────────────────────────────
 *
 * Kazıma bir **jest** ve jest tek yol olamaz: ekran okuyucu kullanan ya
 * da fare/parmak yerine klavye kullanan oyuncu ödülünü açamazdı.
 * Kartın kendisi bir düğme; Enter/Boşluk kazımadan açıyor.
 * `prefers-reduced-motion` açıkken yüzey hiç kurulmuyor ve düğme tek
 * yol oluyor — kazıma sürekli hareket eden bir etkileşim.
 */

/** Yüzeyin ne kadarı silinince kupon kendiliğinden açılsın. */
/*
  Eşik 0,50 — yarısı. Ü165'te 0,30'dan geri alındı.

  🔴 Bu değer bir tur aşağı inip geri çıktı ve sebebi öğreticiydi.

  Ü160'ta 0,50'den 0,30'a indirilmişti, çünkü kart bir türlü
  açılmıyordu ve "eşik yüksek" sanılmıştı. Asıl arıza eşikte değildi:
  ölçüm `sayac % 9` koşuluyla yapılıyor ve fare o kadar olay
  üretmediği için **hiç koşmuyordu**. Parmak kalkışına ölçüm eklenince
  gerçek sebep kapandı — ama indirilen eşik öylece kaldı.

  Sonuç: kart yarısına gelmeden açılıyordu. Ürün sahibi *"yarısına
  gelince açılsın"* dedi ve haklı: kazınacak yüzeyin yarısı hâlâ
  duruyorken ödülün çıkması, jesti yarıda kesip sürprizi ucuzlatıyor.

  ⚠️ **Ders:** bir belirtiyi iki kapıdan birden düzeltince, hangi
  kapının işe yaradığı belirsiz kalıyor. Gerçek sebep bulunduğunda
  diğer değişikliği geri almak gerekiyordu; gerekmedi çünkü unutuldu.

  Ölçüldü: kartı boydan boya kat eden bir geçiş ~0,233 siliyor, yani
  0,50 iki-üç geçişe denk geliyor. Sabır sınavı değil, jest.
*/
const ACILMA_ORANI = 0.5;

/** Fırça kalınlığı (CSS pikseli). Parmak ucu kadar. */
const FIRCA = 30;

/** Aynı anda ekranda duran en fazla parçacık. */
const EN_COK_PARCACIK = 28;

export type KazinanOdul = {
  baslik: string;
  tur: KuponTuru;
  kategoriTuru: KategoriTuru | null;
};

export function KazimaKarti({
  kuponId,
  cafeAdi,
  son,
  bekliyor,
  ac,
}: {
  kuponId: string;
  cafeAdi: string;
  /** "8 Eyl" — biletin son kullanım günü. */
  son: string;
  /** Ü97: kupon henüz aktifleşmediyse. Kazınabilir ama kasada gösterilemez. */
  bekliyor: boolean;
  ac: (kuponId: string) => Promise<{ ok: true } & KazinanOdul | { ok: false }>;
}) {
  const tuvalRef = useRef<HTMLCanvasElement>(null);
  const parcacikKatiRef = useRef<HTMLDivElement>(null);
  const [odul, setOdul] = useState<KazinanOdul | null>(null);
  const [aciliyor, setAciliyor] = useState(false);
  const [hata, setHata] = useState(false);

  /** Açma çağrısı bir kez gitsin — kazıma bitişi ile düğme yarışabilir. */
  const istendiRef = useRef(false);

  const acmayiIste = useCallback(async () => {
    if (istendiRef.current) return;
    istendiRef.current = true;
    setAciliyor(true);
    const sonuc = await ac(kuponId);
    setAciliyor(false);
    if (sonuc.ok) {
      setOdul({ baslik: sonuc.baslik, tur: sonuc.tur, kategoriTuru: sonuc.kategoriTuru });
    } else {
      // Açılamadıysa yüzey yerinde kalmalı ve tekrar denenebilmeli:
      // kilit açılıyor, yoksa oyuncu kuponunu bir daha hiç açamazdı.
      istendiRef.current = false;
      setHata(true);
    }
  }, [ac, kuponId]);

  /* ── Yüzeyi çiz ve kazımayı bağla ─────────────────────── */
  useEffect(() => {
    const tuval = tuvalRef.current;
    if (!tuval || odul) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = tuval.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    /**
     * Yüzeye dokunuldu mu — logonun yazı tipi için (Ü179).
     *
     * 🔴 `kur()` yüzeyi **sıfırlıyor**: kazınmış bir kartta çağrılırsa
     * oyuncunun sildiği yer geri gelir. Yazı tipi geç yüklendiğinde
     * yeniden çizmek gerekiyor ama yalnızca hiç dokunulmamışken.
     */
    let dokunuldu = false;

    /**
     * Outfit'in gerçek aile adı.
     *
     * ⚠️ Sabit yazılamıyor: `next/font` adı derleme sırasında üretiyor
     * (`__Outfit_abc123` gibi). Değişken okunamazsa sistem yazı tipine
     * düşüyor — logo yanlış yazı tipiyle de olsa çiziliyor.
     */
    const yaziAilesi = () =>
      getComputedStyle(document.body).getPropertyValue("--font-outfit").trim() ||
      "ui-sans-serif";

    /*
      Tuval iki ölçü taşıyor: CSS boyu (ekranda kapladığı yer) ve piksel
      boyu (çizim çözünürlüğü). Cihaz piksel oranıyla çarpılmazsa yüzey
      retina ekranda bulanık çıkar ve kazınan kenar "merdiven" olur.
    */
    const kur = () => {
      const kutu = tuval.getBoundingClientRect();
      if (!kutu.width || !kutu.height) return;
      const oran = Math.min(window.devicePixelRatio || 1, 2);
      tuval.width = Math.round(kutu.width * oran);
      tuval.height = Math.round(kutu.height * oran);
      ctx.setTransform(oran, 0, 0, oran, 0, 0);

      // Altın zemin — kart hangi kategoriden olursa olsun aynı, çünkü
      // kategoriyi bilmiyoruz. Ödül rengi (Ü56'dan beri altın) burada
      // "içinde bir ödül var" demenin tek dürüst yolu.
      const dolgu = ctx.createLinearGradient(0, 0, kutu.width, kutu.height);
      dolgu.addColorStop(0, "#c9a227");
      dolgu.addColorStop(0.55, "#e6c757");
      dolgu.addColorStop(1, "#b8901c");
      ctx.fillStyle = dolgu;
      ctx.fillRect(0, 0, kutu.width, kutu.height);

      /*
        Doku: eğik çizgiler. Düz bir altın dikdörtgen "kazınacak bir
        yüzey" gibi durmuyor — gerçek kazı kartlarında da metalik bir
        tarama var ve parmağın ne yaptığını görünür kılan şey o.

        ⚠️ Desen `globals.css`teki `asil-serit` ile aynı açıda (-45°):
        ürünün tek imza dokusu o ve burada ikinci bir dil açmıyoruz.
      */
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 8;
      for (let x = -kutu.height; x < kutu.width + kutu.height; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + kutu.height, kutu.height);
        ctx.stroke();
      }

      /*
        🔴 Talimat **yüzeyin üstüne** yazılıyor, altına değil.

        İlk sürümde "Kazı ve gör" alttaki katmandaydı ve yüzey onu
        tamamen örtüyordu: kazımadan önce ekranda ne yapılacağını söyleyen
        hiçbir şey yoktu, kazıdıktan sonra ise oyuncu "kazı" talimatını
        kazıyarak buluyordu. Gerçek kazı kartlarında da yazı yüzeyin
        üstündedir ve kazındıkça kaybolur.

        ⚠️ Sistem yazı tipi kullanılıyor, ürünün `font-display`i değil:
        canvas yazısı yazı tipinin **yüklenmiş olmasını** bekler; web
        yazı tipi geç gelirse metin ilk karede yedek yazı tipiyle çizilir
        ve bir daha güncellenmez. Altın yüzeydeki üç kelime için bu riske
        girmeye değmez.
      */
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 15px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.letterSpacing = "0.18em";
      ctx.fillText("KAZI VE GÖR", kutu.width / 2, kutu.height / 2 - 9);
      ctx.fillStyle = "rgba(61,44,4,0.62)";
      ctx.font = "600 11px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.letterSpacing = "0.04em";
      ctx.fillText("parmağınla sürt", kutu.width / 2, kutu.height / 2 + 13);
      ctx.letterSpacing = "0em";

      /*
        Looply logosu — yüzeyin altında, folyonun ÜSTÜNDE (Ü178/Ü179).

        Ürün sahibi: *"kazı ve gör kısmının alt kısmında Looply logosu
        olmalı"* ve sonra *"altında looply yazılı logomuz olmalı"* —
        yani işaret değil tam kilit. Gerçek kazı kartlarında da marka
        folyonun üstünde basılıdır ve kazındıkça kaybolur: ödülün
        kendisi değil, ödülü veren.

        ⚠️ Sağ alttaki "Kazımadan aç" düğmesiyle çakışmıyor: o düğme
        sağa yaslı, kilit ortada ve ~50 piksel geniş.
      */
      cizLooplyKilidi(
        ctx,
        kutu.width / 2,
        kutu.height - 13,
        15,
        "rgba(61,44,4,0.45)",
        yaziAilesi(),
      );
    };

    kur();

    /*
      🔴 Yazı tipi gelince BİR KEZ yeniden çiz — Ü179.

      Canvas metni çizildiği anda yüklü olan yazı tipiyle boyanıyor ve
      bir daha kendiliğinden düzelmiyor. Outfit `display: "swap"` ile
      geliyor, yani ilk karede hazır olmayabilir.

      ⚠️ `dokunuldu` kontrolü ŞART: `kur()` yüzeyi sıfırlıyor. Oyuncu
      bu arada kazımaya başladıysa yeniden çizmek sildiği yeri geri
      getirirdi — doğru yazı tipi, kazınmış bir yüzeyden önemli değil.
    */
    void document.fonts?.ready.then(() => {
      if (!dokunuldu && !istendiRef.current) kur();
    });

    /* ── Kazıma ───────────────────────────────────────── */

    let basiliMi = false;
    let sonX = 0;
    let sonY = 0;
    /** Kaç hareketten bir ilerleme ölçülüyor — `getImageData` pahalı. */
    let sayac = 0;

    const yer = (e: PointerEvent) => {
      const kutu = tuval.getBoundingClientRect();
      return { x: e.clientX - kutu.left, y: e.clientY - kutu.top };
    };

    const bas = (e: PointerEvent) => {
      if (istendiRef.current) return;
      basiliMi = true;
      // Bundan sonra yüzey yeniden çizilemez — bkz. `dokunuldu`.
      dokunuldu = true;
      /*
        İşaretçi yakalanıyor: parmak kartın dışına taşsa da kazıma
        sürüyor. Yakalanmasaydı kenara gelince çizgi kopardı.

        ⚠️ `try` içinde: yakalama bazı ortamlarda atıyor (etkin olmayan
        bir `pointerId`, otomasyonla üretilmiş olay). Atan çağrı
        yakalanmasaydı `bas` orada kesilir ve kazıma **hiç
        başlamazdı** — süslemesi olmayan bir kolaylık için asıl
        etkileşimi kaybetmek olurdu.
      */
      try {
        tuval.setPointerCapture(e.pointerId);
      } catch {
        /* yakalama olmadan da kazınıyor, yalnızca kenarda kopuyor */
      }
      const p = yer(e);
      sonX = p.x;
      sonY = p.y;
      // Tek dokunuş da iz bıraksın: hareketsiz bir basış hiçbir şey
      // silmezse oyuncu yüzeyi "tıklanmıyor" sanıyor.
      sil(p.x, p.y, p.x, p.y);
      parcacikSac(p.x, p.y);
    };

    const sil = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.globalCompositeOperation = "destination-out";
      /*
        🔴 Fırça rengi AÇIKÇA tam opak yazılıyor.

        `destination-out` altında silinen miktar, çizilen şeyin **alfası**
        kadar. İlk sürümde burada renk hiç ayarlanmıyordu ve bağlamda
        yüzeyin dokusundan kalan `rgba(255,255,255,0.16)` duruyordu: her
        fırça darbesi alfanın yalnızca %16'sını götürüyor, aynı yerden
        on dört kez geçmek gerekiyordu. Ekranda yüzey doğru görünüyordu,
        kazıma çalışmıyordu — ölçmeden fark edilmezdi (silinen oran
        gerçek fare hareketinden sonra 0,000 çıktı).
      */
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = FIRCA;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    };

    const kimilda = (e: PointerEvent) => {
      if (!basiliMi || istendiRef.current) return;
      const p = yer(e);
      sil(sonX, sonY, p.x, p.y);
      sonX = p.x;
      sonY = p.y;

      if (++sayac % 3 === 0) parcacikSac(p.x, p.y);
      if (sayac % 9 === 0 && oranOlc() >= ACILMA_ORANI) void acmayiIste();
    };

    const birak = () => {
      if (!basiliMi) return;
      basiliMi = false;

      /*
        🔴 Parmak kalkınca da ÖLÇÜLÜYOR — Ü160.

        Ürün sahibi üç kez *"kuponumu kazıyamıyorum"* dedi. Kazıma
        çalışıyordu, yüzey siliniyordu, oran eşiği geçiyordu — kart yine
        açılmıyordu. Sebep ölçümün **yalnızca** `kimilda` içinde ve
        `sayac % 9 === 0` koşuluyla yapılmasıydı.

        Dokuzda bir örnekleme maliyeti düşürüyor ama bir varsayıma
        dayanıyor: "kazıyan parmak bol bol `pointermove` üretir."
        Parmak öyle yapıyor; **fare yapmıyor.** DevTools'un mobil
        görünümünde bir sürükleme iki üç olay üretiyor, sayaç dokuzun
        katına hiç denk gelmiyor ve ölçüm **hiç koşmuyor**. Ölçüldü:
        dört geçişten sonra silinen oran 0,469 (eşik 0,30) ve kart hâlâ
        kapalıydı.

        Parmak kalkışı doğal bir kontrol noktası: kullanıcı bir hamleyi
        bitirmiştir ve tek bir ölçüm maliyeti sıfıra yakındır.
      */
      if (!istendiRef.current && oranOlc() >= ACILMA_ORANI) void acmayiIste();
    };

    /**
     * Silinen oran.
     *
     * Her pikseli okumak gerekmiyor: 16 pikselde bir örnek alınıyor.
     * Kazıma kaba bir jest ve aradığımız sayı "yarısı gitti mi" —
     * örnekleme hatası yüzde birin altında kalıyor, maliyeti ise
     * tam taramanın on altıda biri.
     */
    const oranOlc = () => {
      const veri = ctx.getImageData(0, 0, tuval.width, tuval.height).data;
      let saydam = 0;
      let bakilan = 0;
      for (let i = 3; i < veri.length; i += 4 * 16) {
        if (veri[i] < 24) saydam++;
        bakilan++;
      }
      return bakilan ? saydam / bakilan : 0;
    };

    /**
     * Kazınan izden kopan parçacıklar.
     *
     * React durumuna yazılmıyor, DOM'a doğrudan ekleniyor: `pointermove`
     * saniyede onlarca kez tetikleniyor ve her birinde yeniden çizim
     * yapmak kazımanın kendisini takılmalı gösterirdi. Parçacık kendi
     * animasyonu bitince kendini siliyor.
     */
    const parcacikSac = (x: number, y: number) => {
      const kat = parcacikKatiRef.current;
      if (!kat || kat.childElementCount > EN_COK_PARCACIK) return;
      for (let i = 0; i < 2; i++) {
        const s = document.createElement("span");
        const aci = Math.random() * Math.PI * 2;
        const uzaklik = 16 + Math.random() * 26;
        s.className = "kazinti";
        s.style.left = `${x}px`;
        s.style.top = `${y}px`;
        s.style.setProperty("--u", `${Math.cos(aci) * uzaklik}px`);
        s.style.setProperty("--v", `${Math.sin(aci) * uzaklik - 10}px`);
        s.style.setProperty("--d", `${Math.round(Math.random() * 360 - 180)}deg`);
        s.style.width = `${3 + Math.round(Math.random() * 3)}px`;
        s.style.height = `${3 + Math.round(Math.random() * 3)}px`;
        s.addEventListener("animationend", () => s.remove());
        kat.appendChild(s);
      }
    };

    tuval.addEventListener("pointerdown", bas);
    tuval.addEventListener("pointermove", kimilda);
    tuval.addEventListener("pointerup", birak);
    tuval.addEventListener("pointercancel", birak);
    window.addEventListener("resize", kur);

    return () => {
      tuval.removeEventListener("pointerdown", bas);
      tuval.removeEventListener("pointermove", kimilda);
      tuval.removeEventListener("pointerup", birak);
      tuval.removeEventListener("pointercancel", birak);
      window.removeEventListener("resize", kur);
    };
  }, [acmayiIste, odul]);

  /* ── Açıldı: gerçek bilet ─────────────────────────────── */

  if (odul) {
    const gorsel = gorselSec(odul.baslik, odul.tur, odul.kategoriTuru);
    return (
      <div className="kupon-acildi">
        <Bilet
          veri={{
            href: `/oduller/${kuponId}`,
            kafe: cafeAdi,
            baslik: odul.baslik,
            gorsel,
            renk: GORSEL_RENGI[gorsel],
            son,
          }}
        />
      </div>
    );
  }

  /* ── Kapalı: kazınacak yüzey ──────────────────────────── */

  return (
    <div className="relative h-[124px] overflow-hidden rounded-2xl bg-vitrin-lacivert">
      {/*
        Yüzeyin ALTINDA duran kat — kazıdıkça ortaya çıkan şey.

        Burada ödül **yok** ve olamaz: bu cihaz ödülün ne olduğunu
        bilmiyor. Kazıyan kişi bir ödül değil, bir **kart** buluyor;
        ödülün adı yüzey yeterince silinince sunucudan geliyor.

        Talimat bu katta değil, yüzeyin üstünde (bkz. `kur`): kazımadan
        önce görünmesi gereken şey talimat, kazıyınca görünmesi gereken
        şey karttır.
      */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-5 text-center text-yuzey">
        <span aria-hidden className="opacity-40">
          <HediyeCizimi />
        </span>
        <span className="etiket-caps text-white/45">
          {cafeAdi} · son {son}
        </span>
        {(aciliyor || bekliyor) && (
          <span className="text-[12px] text-white/60">
            {aciliyor ? "Açılıyor…" : "Açılışını bekliyor"}
          </span>
        )}
      </div>

      {/* Kazınan parçacıklar — yüzeyin üstünde, tıklamayı engellemeden. */}
      <div
        ref={parcacikKatiRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 overflow-visible"
      />

      {/*
        Açma çağrısı giderken yüzey siliniyor: ağ gecikmesi boyunca
        oyuncu yarı kazınmış bir altın yüzeye bakmak yerine "Açılıyor…"
        yazan kartı görüyor. Yüzey `pointer-events-none` oluyor ki o
        sırada kazımaya devam edilmesin.
      */}
      <canvas
        ref={tuvalRef}
        aria-hidden
        className={`absolute inset-0 z-10 h-full w-full touch-none transition-opacity duration-300 ${
          aciliyor ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      />

      {/*
        Erişilebilir yol — jestin yerine geçen düğme.

        Yüzeyin ÜSTÜNDE ve saydam değil: sağ alt köşede küçük bir etiket.
        Görünür olması şart, çünkü kazımayı beceremeyen (titremesi olan,
        tek eli dolu, ekranı çatlak) oyuncunun da bir yolu olmalı.
        Ekran okuyucuya kartın tamamı bu düğme olarak görünüyor.
      */}
      <button
        type="button"
        onClick={() => void acmayiIste()}
        disabled={aciliyor}
        className="absolute right-2.5 bottom-2.5 z-30 rounded-full bg-black/50 px-3 py-1.5 etiket-caps text-[10px] text-white transition-colors hover:bg-black/55 disabled:opacity-60"
      >
        {aciliyor ? "Açılıyor" : "Kazımadan aç"}
      </button>

      {hata && (
        <p
          role="status"
          className="absolute inset-x-0 bottom-0 z-30 bg-black/60 px-3 py-1 text-center text-[11px] text-white"
        >
          Açılamadı, tekrar dene.
        </p>
      )}
    </div>
  );
}

/**
 * Kapalı kartın altındaki çizim — kapalı bir hediye.
 *
 * ⚠️ Kategori çizimlerinden (`oyuncu-gorsel`) biri **kullanılamaz**:
 * onlar fincan, pasta, banknot diyor, yani ödülün ne olduğunu söylüyor.
 * Buradaki tek doğru resim, içinde ne olduğu belli olmayan bir şey.
 */
function HediyeCizimi() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10.5h18M12 10.5V21M4.5 10.5V19a2 2 0 002 2h11a2 2 0 002-2v-8.5M3.5 7h17a1 1 0 011 1v1.5a1 1 0 01-1 1h-17a1 1 0 01-1-1V8a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7c-1.2-2.4-2.3-3.5-3.6-3.5A1.9 1.9 0 006.5 5.4C6.5 6.6 7.6 7 12 7zm0 0c1.2-2.4 2.3-3.5 3.6-3.5a1.9 1.9 0 011.9 1.9C17.5 6.6 16.4 7 12 7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
