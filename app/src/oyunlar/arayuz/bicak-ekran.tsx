"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  bicak,
  carpilanBicak,
  GIRIS_ACISI,
  type BicakDurumu,
  type BicakGirdisi,
} from "../bicak";
import { TICK_MS } from "../sozlesme";
import {
  BICAK_RENK,
  bicakAgzi,
  bicakBalcagi,
  bicakDamari,
  bicakElmasi,
  bicakGobegi,
  bicakKutugu,
  bicakOdulu,
  bicakPanel,
  bicakSapi,
  bicakSayaci,
  bicakSahnesi,
} from "./bicak-yuzey";
import { useOyunSesi } from "./oyun-ses";
import { useOdulPaketi, type OyunEkraniProps } from "./ortak";

/**
 * Bıçak ekranı — Ü235.
 *
 * ── 🔴 Kütük React'te dönmüyor ──────────────────────────────
 *
 * Ü214'ün dersi burada en sert hâliyle geçerli: motor yalnızca
 * **atış anlarını** biliyor, aradaki dönüş tamamen sunum. Kütüğün
 * açısı duruma yazılsaydı saniyede 60 render olur ve bunların
 * hepsinde motorun durumu aynı kalırdı.
 *
 * Çözüm: açı `requestAnimationFrame` içinde DOM'a doğrudan
 * yazılıyor (`kutukRef.current.style.transform`). React bu düğümün
 * `transform`unu hiç bilmiyor, o yüzden yeniden render onu
 * sıfırlamıyor. Durum yalnızca **atışta** değişiyor.
 *
 * ⚠️ 20 Hz değil, ekranın kendi hızında: tick'e yuvarlanmış bir açı
 * dönen bir diskte gözle görülür biçimde kesikli. Motorun tick'i
 * atışın **ne zaman** sayıldığını belirliyor, kütüğün nerede
 * çizildiğini değil.
 *
 * ── Açının ekrana çevrilmesi ────────────────────────────────
 *
 * Motorun tanımı: bıçak `GIRIS_ACISI`nde (1800 = tam alt) giriyor ve
 * kütüğe göre `yer = GIRIS_ACISI − açı` noktasına saplanıyor. Buradan
 * çıkan kural, ekranın tamamının dayandığı tek ilişki:
 *
 *   **ekran açısı(p) = p + açı**, 0 = saat 12, artı yön = saat yönü.
 *
 * Doğrulaması: saplanma anında `yer + açı = 1800` — yani bıçak tam
 * altta, girdiği yerde kalıyor. Kütük dönünce onunla dönüyor.
 *
 * ⚠️ Saplı bıçaklar katmanın **altına** çiziliyor, üstüne değil ve
 * bu matematiğin bir sonucu: bıçak ucu yukarı bakıyor, yani
 * katmanın alt ucunda durduğunda merkezi gösteriyor. Üste konsaydı
 * ters çevirmek gerekirdi. Katman dönüşü bu yüzden `(yer − 1800)`.
 *
 * ── Ölçüler kutunun yüzdesi ─────────────────────────────────
 *
 * Oyun alanı kare ve her şey onun yüzdesi: 320 piksellik telefonda
 * da 520 piksellik tablette de aynı oyun. Piksel verilseydi
 * bıçakların kütükten taşma oranı ekrana göre değişirdi ve oyun
 * dar ekranda daha kolay görünürdü.
 */

/** Kütüğün yarıçapı — kutunun yüzdesi. */
const KUTUK_R = 26;
/** Bıçağın boyu ve eni — kutunun yüzdesi. */
const BICAK_BOY = 21;
/**
 * 🔴 Bıçağın eni — motorun `CAKISMA` sabitiyle BAĞLI (Ü240).
 *
 * Ürün sahibi iki şey söyledi ve ikisi aynı sebebe çıktı:
 * *"bıçağa gönderecek gibi olmama rağmen çarpıyor"* ve
 * *"bıçaklarımız oyun için çok kalın."*
 *
 * Motor 20°'de çarpışma sayıyordu; bıçak ekranda 13,8° yer
 * kaplıyordu. Aradaki 6,2°, oyuncunun gördüğü boşluğun motorda
 * dolu olması demekti.
 *
 * En 6,4'ten 4,6'ya indi (açısal genişlik 9,96°) ve `CAKISMA`
 * ona eşitlendi (100 = 10,0°).
 *
 * ⚠️ Bu sayı değişirse `bicak.ts`teki `CAKISMA` da değişmeli.
 * Hesap orada yazılı; ikisi ayrışırsa oyun yine yalan söyler.
 */
const BICAK_EN = 4.6;
/** Bıçağın ucunun kütüğe girdiği derinlik. */
const BATMA = 3;
/** Elma ve paketin çapı. */
const NESNE = 10;

/**
 * Saplı bıçağın alt kenarının katmanın dibinden uzaklığı.
 *
 * Ucu `50 − KUTUK_R + BATMA` yüzdesinde olmalı; alt kenar ondan
 * `BICAK_BOY` aşağıda. Elle yazılmıyor, türüyor: `KUTUK_R`
 * değişince bıçaklar kütükten kopmasın.
 */
const SAPLI_DIP = 100 - (50 + KUTUK_R - BATMA) - BICAK_BOY;

/**
 * Sıradaki bıçağın kutunun ALTINDAN uzaklığı — kutunun yüzdesi.
 *
 * ── 🔴 Ürün sahibi: *"bıçaklar çok daha aşağıdan gelmeli"* ───
 *
 * İlk yerleşimde kutu ekranın ortasındaydı ve sıradaki bıçak
 * kütüğün 2 piksel altında duruyordu: ekranda hiç yol almıyor,
 * "fırlatıldığı" görülmüyordu. Üstte de dev bir boşluk kalıyordu.
 *
 * Referansın (Knife Hit) yerleşimi başka: kütük üst üçte birde,
 * bıçak **ekranın dibinde**, arada gerçek bir mesafe var. Kutu
 * artık sahnenin %36'sına oturuyor (`KUTUK_YERI`) ve bıçak kutunun
 * %70 altında — yani telefonda kütüğün epey aşağısında.
 */
const HAZIR_UZAK = 70;

/** Kütük kutusunun merkezinin sahnedeki dikey yeri. */
const KUTUK_YERI = 36;

/**
 * Bıçağın uçtuğu mesafe — **kendi boyunun** yüzdesi.
 *
 * ⚠️ Elle yazılmıyor. `translateY` yüzdesi ögenin kendi boyuna
 * göre ve iki konum da kutunun yüzdesi; oran sabit çıkıyor.
 * Yukarıdaki sayılardan biri değişirse uçuş onunla birlikte
 * değişmeli, yoksa bıçak yolun ortasında belirir.
 */
const UCUS = Math.round(((HAZIR_UZAK + SAPLI_DIP) / BICAK_BOY) * 100);

type Yerel = {
  durum: BicakDurumu;
  girdiler: BicakGirdisi[];
};

export function BicakEkrani({ tohum, bitti, kazandirir, odul, cik }: OyunEkraniProps) {
  const [y, setY] = useState<Yerel>(() => ({
    durum: bicak.baslat(tohum),
    girdiler: [],
  }));
  const bildirildi = useRef(false);
  const ses = useOyunSesi();

  /** Turun başladığı duvar saati — tick'in tek kaynağı (Ü84). */
  const baslangic = useRef(0);

  /**
   * rAF döngüsünün okuduğu güncel durum — render arası köprü.
   *
   * ⚠️ Render **sırasında** değil, efektte yazılıyor: React'in kuralı
   * bu (`react-hooks/refs`) ve ihlali derlemede yakalanıyor. Bedeli
   * çizimin bir kare geride kalması; 60 Hz'de 16 ms ve kütüğün açısı
   * zaten duvar saatinden türüyor, durumdan değil — gecikme
   * yalnızca bölüm değişiminde hızın bir kare eski kalması demek.
   */
  const durumRef = useRef(y.durum);
  useEffect(() => {
    durumRef.current = y.durum;
  }, [y.durum]);

  const kutukRef = useRef<HTMLDivElement>(null);

  // ── Dönüş ────────────────────────────────────────────
  useEffect(() => {
    baslangic.current = Date.now();
    let kare = 0;
    const ciz = () => {
      kare = requestAnimationFrame(ciz);
      const el = kutukRef.current;
      if (!el) return;
      const d = durumRef.current;
      /* Tur bitince kütük **son açısında donuyor**: ölüm karesi
         oyuncunun neye çarptığını gösteren tek kare ve dönmeye
         devam eden bir kütük onu süpürürdü. */
      const aci = d.bitti
        ? d.aci
        : d.aci + d.hiz * ((Date.now() - baslangic.current) / TICK_MS - d.sonTick);
      el.style.transform = `rotate(${aci / 10}deg)`;
    };
    kare = requestAnimationFrame(ciz);
    return () => cancelAnimationFrame(kare);
  }, []);

  // ── Bitiş bildirimi ──────────────────────────────────
  useEffect(() => {
    if (bildirildi.current || !bicak.bittiMi(y.durum)) return;
    bildirildi.current = true;
    bitti(y.girdiler, bicak.skor(y.durum));
  }, [y, bitti]);

  const at = useCallback(() => {
    setY((p) => {
      if (bicak.bittiMi(p.durum)) return p;
      /*
        🔴 `round`, `floor` DEĞİL — Ü240.

        Oyuncu sürekli dönen bir kütük görüyor (rAF), motor ise
        tick'lerle çalışıyor. `floor` ile atış **hep geriye**
        yuvarlanıyordu: sistematik olarak 0–1 tick'lik gecikme, yani
        hızlı bölümde 5°'ye varan tek yönlü kayma.

        `round` ile kayma ±yarım tick ve **simetrik** — ne erken ne
        geç. Çakışma penceresi 10°'ye indiği için bu şart oldu;
        `EN_HIZLI` de aynı hesaptan türüyor (`bicak.ts`).

        ⚠️ Yukarı yuvarlama sunucunun saat denetimini bozmuyor:
        `saatTutarliMi` oyunun gerçekten geçenden **az** süre
        bildirmesine bakıyor, fazlasına değil.
      */
      const t = Math.round((Date.now() - baslangic.current) / TICK_MS);
      /* ⚠️ Aynı tick'e ikinci atış YOK. Motor `dt <= 0`ı zaten
         reddediyor; burada susturulmasa her reddedilen dokunuş boş
         bir render olurdu. Saniyede 20 bıçak zaten oyunun üstünde. */
      if (t <= p.durum.sonTick) return p;
      const girdi: BicakGirdisi = { t };
      const sonraki = bicak.uygula(p.durum, girdi);
      if (!sonraki) return p;
      return { durum: sonraki, girdiler: [...p.girdiler, girdi] };
    });
  }, []);

  /* Sesler efektten — güncelleyici saf kalmalı (StrictMode onu iki
     kez çağırıyor ve içine ses konsa her ses ikiye katlanırdı). */
  const sonSaplanan = useRef(0);
  const sonTur = useRef(1);
  // Ü275: ödül sesi yalnızca ödül varken — izinsiz paket sıradan parça.
  const odulIzinli = kazandirir === true && odul?.izin === true;
  const sonOdul = useRef(false);
  useEffect(() => {
    const d = y.durum;
    if (d.bitti) {
      ses.cal("gecersiz");
      return;
    }
    if (d.odulVerildi && !sonOdul.current) {
      sonOdul.current = true;
      ses.cal(odulIzinli ? "odul" : "yerlesti");
    } else if (d.tur !== sonTur.current) {
      sonTur.current = d.tur;
      ses.cal("temizlik");
    } else if (d.saplanan.length !== sonSaplanan.current) {
      ses.cal("yerlesti");
    }
    sonSaplanan.current = d.saplanan.length;
  }, [y.durum, odulIzinli, ses]);

  // ── Klavye (masaüstünde test için) ───────────────────
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      /* ⚠️ Odak ses ya da çıkış düğmesindeyse boşluk ONA ait: dinleyici
         pencerede olduğu için aksi hâlde tek basış hem sesi kapatır
         hem bıçak atardı. */
      if ((e.target as HTMLElement | null)?.closest("button")) return;
      e.preventDefault();
      at();
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [at]);

  const durum = y.durum;
  const carpan = carpilanBicak(durum);
  // Ü275 · "görünürse kesin": paket ödül olarak yalnızca sunucu "evet"
  // dediyse çiziliyor; "hayır"da sıradan parça (Ü207'deki gibi).
  const paketVar = useOdulPaketi(odul, kazandirir, durum.odulAcisi !== null, () => y.girdiler);

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={bicakSahnesi()}>
      {/* ── Üst şerit ───────────────────────────────
          Ailenin HUD'u: solda bölüm, ortada skor, sağda ses ve
          çıkış. Yılan'daki gibi "duraklat" yok — duraklatma
          mekaniği olmadığı için düğmesi de yok. */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-3 pb-1">
        <span
          className="flex items-center gap-2 px-3.5 py-1.5"
          style={bicakPanel()}
        >
          <span className="font-display text-[8px] leading-none font-bold tracking-[0.16em] text-white/55 uppercase">
            Bölüm
          </span>
          <span className="font-display text-[18px] leading-none font-bold text-white tabular">
            {durum.tur}
          </span>
        </span>

        <span className="flex items-center gap-2 px-3.5 py-1.5" style={bicakPanel()}>
          <span className="flex flex-col">
            <span className="font-display text-[8px] leading-none font-bold tracking-[0.16em] text-white/55 uppercase">
              Skor
            </span>
            {/* `key` skorla değişiyor ki her artışta animasyon koşsun. */}
            <span
              key={durum.skor}
              className="dusen-skor mt-0.5 font-display text-[18px] leading-none font-bold text-white tabular"
            >
              {durum.skor.toLocaleString("tr-TR")}
            </span>
          </span>
        </span>

        <span className="flex items-center" style={bicakPanel()}>
          <SesDugmesi acik={ses.acik} degistir={ses.degistir} />
          {cik && (
            <button
              type="button"
              onClick={cik}
              aria-label="Çık"
              className="flex size-9 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </span>
      </div>

      {/* ── Oyun alanı ──────────────────────────────
          🔴 Dokunma yüzeyi **bütün alan**, kütük değil: oyuncunun
          nereye dokunduğu oyunda yok, yalnızca ne zaman dokunduğu
          var. Kütüğe nişan alınan bir yüzey, olmayan bir mekaniği
          vaat ederdi. */}
      {/* ⚠️ `<button>` DEĞİL, `role="button"`: düğmenin içerik modeli
          yalnızca metin düzeyi öge kabul ediyor ve alanın içinde
          konumlandırılmış onlarca katman var. Klavye karşılığını
          yukarıdaki pencere dinleyicisi veriyor. */}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={(e) => {
          e.preventDefault();
          at();
        }}
        aria-label="Bıçağı at"
        className="relative min-h-0 flex-1 cursor-pointer select-none"
        style={{ touchAction: "manipulation" }}
      >
        {/*
          Kütük kutusu — sahnenin %36'sında, kare.

          ⚠️ Boyu `min(84vw, 40dvh)`: dar telefonda genişlik, kısa ve
          geniş ekranda yükseklik sınırlıyor. Kare olmak zorunda
          çünkü içindeki her şey dönüyor ve dikdörtgen bir kutuda
          dönen bir daire elips çizerdi.
        */}
        <div
          className="absolute left-1/2"
          style={{
            top: `${KUTUK_YERI}%`,
            width: "min(84vw, 40dvh)",
            height: "min(84vw, 40dvh)",
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* Kütükle birlikte dönen her şey. */}
          {/* 🔴 Ü275: kütük her karede dönüyor — `will-change` ile KENDİ
              KATMANINDA. Yoksa iPhone Safari kütüğü, saplı bıçakları ve
              onların ışıma filtrelerini her karede işlemcide yeniden
              boyuyordu. Katmanda bir kez boyanıyor, dönüşü ekran kartı
              yapıyor; yalnızca yeni bıçak saplanınca yeniden boyanıyor. */}
          <div ref={kutukRef} className="absolute inset-0" style={{ willChange: "transform" }}>
            <span
              aria-hidden
              className="absolute"
              style={{ ...bicakKutugu(durum.tur), inset: `${50 - KUTUK_R}%` }}
            />

            {/* Damar — dönüşü görünür kılan işaret. */}
            <span
              aria-hidden
              className="absolute"
              style={{
                ...bicakDamari(durum.tur),
                left: "49.4%",
                top: `${50 - KUTUK_R + 2}%`,
                width: "1.2%",
                height: `${KUTUK_R - 8}%`,
              }}
            />

            <span
              aria-hidden
              className="absolute"
              style={{ ...bicakGobegi(durum.tur), inset: "43%" }}
            />

            {/* Saplı bıçaklar. */}
            {durum.saplanan.map((yer, i) => (
              <span
                key={i}
                aria-hidden
                className="absolute inset-0"
                style={{ transform: `rotate(${(yer - GIRIS_ACISI) / 10}deg)` }}
              >
                <span
                  /*
                    Son bıçak **uçarak** geliyor; eski bıçaklar
                    durgun. Hepsine verilseydi her atışta tahtadaki
                    bütün bıçaklar birden zıplardı.

                    🔴 Uçuş ayrı bir öge DEĞİL, saplanan bıçağın
                    kendisi: `bicak-sapla` onu `UCUS` kadar aşağıdan,
                    yani sıradaki bıçağın durduğu yerden getiriyor.
                    Ayrı bir "uçan bıçak" ögesi kullanılsaydı motorun
                    saplanma anı ile ekrandaki varış anı iki ayrı
                    gerçek olurdu.

                    ⚠️ Uçuş kütükle **birlikte dönen** katmanın
                    içinde: bıçak 130 ms boyunca hafifçe yay çiziyor.
                    Doğrusu da bu — bıçak saplandı, kütük dönmeye
                    devam ediyor.
                  */
                  className={i === durum.saplanan.length - 1 ? "bicak-sapla" : undefined}
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: `${SAPLI_DIP}%`,
                    width: `${BICAK_EN}%`,
                    height: `${BICAK_BOY}%`,
                    transform: "translateX(-50%)",
                    ["--bicak-ucus" as string]: `${UCUS}%`,
                  }}
                >
                  <Bicak tur={durum.tur} carpan={carpan === i} />
                </span>
              </span>
            ))}

            {/* Elmalar. */}
            {durum.elma.map((e) => (
              <span
                key={e}
                aria-hidden
                className="absolute inset-0"
                style={{ transform: `rotate(${e / 10}deg)` }}
              >
                <span
                  className="absolute"
                  style={{
                    ...bicakElmasi(),
                    left: "50%",
                    top: `${50 - KUTUK_R - NESNE / 2}%`,
                    width: `${NESNE}%`,
                    height: `${NESNE}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {/* Sap — elmayı meyveye çeviren tek detay, aynı
                      karar Yılan'da da verilmişti. */}
                  <span
                    className="absolute"
                    style={{
                      left: "58%",
                      top: "-16%",
                      width: "42%",
                      height: "30%",
                      background: BICAK_RENK.yaprak,
                      borderRadius: "0 100% 0 100%",
                      transform: "rotate(-18deg)",
                    }}
                  />
                </span>
              </span>
            ))}

            {/* Ödül paketi — Ü207: `kazandirir` false ise çizilmiyor. */}
            {paketVar && (
              <span
                aria-hidden
                className="absolute inset-0"
                style={{ transform: `rotate(${(durum.odulAcisi as number) / 10}deg)` }}
              >
                <span
                  className="nabiz absolute"
                  style={{
                    ...bicakOdulu(),
                    left: "50%",
                    top: `${50 - KUTUK_R - NESNE / 2}%`,
                    width: `${NESNE}%`,
                    height: `${NESNE}%`,
                    transform: "translateX(-50%)",
                  }}
                />
              </span>
            )}
          </div>

          {/* ── Sıradaki bıçak ────────────────────
              Dönmeyen katmanda: bıçak kütüğe ait değil, oyuncuya
              ait. Kutunun epey altında — fırlayınca gerçekten yol
              alsın (`HAZIR_UZAK`).

              ⚠️ Gecikmeli beliriyor (`bicak-hazir`in `animation-
              delay`i): uçan bıçak bu noktadan kalkıyor ve yenisi
              aynı anda belirseydi bir kare boyunca iki bıçak üst
              üste dururdu. */}
          {!durum.bitti && (
            <span
              key={durum.saplanan.length + durum.tur * 100}
              aria-hidden
              className="bicak-hazir absolute"
              style={{
                left: "50%",
                bottom: `${-HAZIR_UZAK}%`,
                width: `${BICAK_EN}%`,
                height: `${BICAK_BOY}%`,
                transform: "translateX(-50%)",
              }}
            >
              <Bicak tur={durum.tur} />
            </span>
          )}
        </div>
      </div>

      {/* ── Alt şerit ───────────────────────────────
          Kalan bıçaklar ve tek satırlık yönerge. İki hâl de aynı
          yüksekliği kaplıyor ki biri diğerine dönünce alan
          zıplamasın — Yılan'da da aynı kural. */}
      <div className="flex h-[58px] shrink-0 flex-col items-center justify-center gap-2 px-3 pb-1">
        <span className="flex items-end gap-[3px]" aria-label={`${durum.kalan} bıçak kaldı`}>
          {Array.from({ length: durum.kalan + durum.saplanan.length }, (_, i) => (
            <span
              key={i}
              aria-hidden
              style={{
                ...bicakSayaci(i < durum.kalan),
                width: 4,
                height: i < durum.kalan ? 18 : 12,
              }}
            />
          ))}
        </span>
        <span className="text-[12px] leading-none font-semibold text-white/70">
          {durum.saplanan.length === 0 && durum.tur === 1
            ? "Dokun · bıçağı at"
            : "Saplı bıçağa değme"}
        </span>
      </div>
    </div>
  );
}

/**
 * Tek bıçak — ucu yukarı.
 *
 * Üç parça: ağız, balçak, sap. Balçak 1 pikselden ince olamıyor ve
 * o yüzden yüzde değil piksel — 6 piksellik bir bıçakta yüzdeyle
 * verilse tarayıcı onu yuvarlayıp tamamen yok ediyordu.
 */
function Bicak({ tur, carpan = false }: { tur: number; carpan?: boolean }) {
  return (
    <span className="absolute inset-0 flex flex-col">
      <span aria-hidden style={{ ...bicakAgzi(tur, carpan), flex: "0 0 62%" }} />
      <span aria-hidden style={{ ...bicakBalcagi(tur), flex: "0 0 3px" }} />
      <span aria-hidden style={{ ...bicakSapi(tur), flex: "1 1 auto" }} />
    </span>
  );
}

/**
 * Hoparlör — Düşen ve Sekme'dekiyle aynı hap içinde.
 *
 * ⚠️ Yılan'ın panelsiz beyaz simgesi buraya gelmiyor: bu ekran koyu
 * arcade ailesinde ve HUD'u panelli.
 */
function SesDugmesi({ acik, degistir }: { acik: boolean; degistir: () => void }) {
  return (
    <button
      type="button"
      onClick={degistir}
      aria-pressed={acik}
      aria-label={acik ? "Sesi kapat" : "Sesi aç"}
      className="flex size-9 items-center justify-center rounded-full transition-colors"
      style={{
        background: acik ? "rgba(94,234,212,.20)" : "transparent",
        color: acik ? "#fff" : "rgba(255,255,255,.62)",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z" fill="currentColor" />
        {acik ? (
          <>
            <path d="M15.6 9.2a4 4 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            <path d="M18.1 6.8a7.5 7.5 0 0 1 0 10.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </>
        ) : (
          <path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
