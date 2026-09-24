"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  sekme,
  atisIzi,
  ACI_SAYISI,
  SEKME_EN,
  SEKME_BOY,
  SEKME_OLCEK,
  type AtisKaresi,
  type SekmeDurumu,
  type SekmeGirdisi,
  type SekmeNesnesi,
} from "../sekme";
import {
  SEKME_RENK,
  sekmeBloku,
  sekmeBlokYazisi,
  sekmeUcgenCercevesi,
  sekmeCerceve,
  sekmeHediyesi,
  sekmeOdulu,
  sekmePanel,
  sekmeSahnesi,
  sekmeTahtasi,
  sekmeTopu,
} from "./sekme-yuzey";
import { useOyunSesi } from "./oyun-ses";
import { Avatar } from "@/components/avatar";
import { useOdulPaketi, type OyunEkraniProps } from "./ortak";

/**
 * Sekme ekranı — Ü217.
 *
 * ── 🔴 Animasyon motordan geliyor, taklit edilmiyor ─────────
 *
 * Topun yolu `atisIzi` ile motordan alınıyor ve kare kare oynatılıyor.
 * Ekran kendi fiziğini yazsaydı — ki en kolay yol o olurdu — ekrandaki
 * top ile sunucunun hesapladığı top farklı yerlere giderdi: oyuncu
 * bloğu kırdığını görür, skoru tutmazdı. Motorda tek bir `simule`
 * gövdesi var; hem sonucu hem izi o üretiyor.
 *
 * ── Atışın üç hâli ──────────────────────────────────────────
 *
 *   **nişan**    — parmak tahtada, kılavuz çizgi görünüyor
 *   **uçuş**     — iz oynatılıyor, girdi kabul edilmiyor
 *   **bekliyor** — sıradaki atış
 *
 * ⚠️ Uçuş sırasında yeni atış YASAK. İzin verilseydi ekran bir izi
 * oynatırken motor başka bir duruma geçer, ikisi ayrışırdı.
 *
 * ── Fırlatıcı Loopy ─────────────────────────────────────────
 *
 * Ürün sahibi: *"bbtan oyununda topu fırlatan karakter bizim loopymiz
 * olsun."* Mevcut `<Avatar>` bileşeni kullanılıyor; yeni görsel
 * üretilmedi.
 */

type Ucus = {
  iz: AtisKaresi[];
  indeks: number;
  /** Uçuş bitince uygulanacak girdi. */
  girdi: SekmeGirdisi;
};

/**
 * Ekranın tuttuğu her şey **tek bir nesnede**.
 *
 * 🔴 Üç ayrı `useState` ile başlamıştı ve lint haklı olarak reddetti
 * (`react-hooks/set-state-in-effect`): uçuş bitince motoru ilerletmek
 * için bir efektin gövdesinde `setDurum` çağrılıyordu. Efekt içinde
 * durum yazmak fazladan bir render turu demek ve ilk karede tutarsız
 * değer görünüyor.
 *
 * Hepsi tek nesnede olunca uçuşun sonu **güncelleyicinin içinde**
 * çözülüyor: kare ilerlemesi de motorun ilerlemesi de aynı saf
 * fonksiyonda. `sekme.uygula` zaten saf, yani güncelleyici saf
 * kalıyor — StrictMode iki kez çağırsa da sonuç değişmiyor.
 */
type Yerel = {
  durum: SekmeDurumu;
  girdiler: SekmeGirdisi[];
  ucus: Ucus | null;
};

export function SekmeEkrani({ tohum, bitti, kazandirir, odul, cik }: OyunEkraniProps) {
  const [y, setY] = useState<Yerel>(() => ({
    durum: sekme.baslat(tohum),
    girdiler: [],
    ucus: null,
  }));
  const bildirildi = useRef(false);
  const ses = useOyunSesi();
  const tahtaRef = useRef<HTMLDivElement>(null);
  const [nisan, setNisan] = useState<number | null>(null);

  const durum = y.durum;
  const ucus = y.ucus;

  // Ü275 · "görünürse kesin": paket ödül olarak yalnızca sunucu "evet"
  // dediyse çiziliyor; "hayır"da sıradan parça (Ü207'deki gibi).
  const paketGorunur = useOdulPaketi(
    odul,
    kazandirir,
    sekme.odulVar?.(durum) ?? false,
    () => y.girdiler,
  );

  // ── Bitiş bildirimi ──────────────────────────────────
  useEffect(() => {
    if (bildirildi.current || !sekme.bittiMi(y.durum) || y.ucus) return;
    bildirildi.current = true;
    bitti(y.girdiler, sekme.skor(y.durum));
  }, [y, bitti]);

  /*
    Sesler efektten, güncelleyicinin içinden DEĞİL.

    ⚠️ Güncelleyici saf kalmak zorunda: React onu StrictMode'da iki kez
    çağırıyor ve içine ses koymak her sesi ikiye katlardı.
  */
  const sonTur = useRef(0);
  useEffect(() => {
    if (durum.tur === sonTur.current) return;
    sonTur.current = durum.tur;
    ses.cal("temizlik");
  }, [durum.tur, ses]);

  /*
    ── Uçuşun oynatılması ────────────────────────────────

    `requestAnimationFrame` kullanılıyor, `setInterval` değil: ekranın
    yenileme hızına kilitleniyor ve sekme akıcı görünüyor. Ü216'nın
    dersi burada baştan uygulandı.

    ⚠️ Her karede render oluyor ve bu **doğru**: burada gerçekten her
    karede bir şey değişiyor (topun yeri). Ü214'te kesilen şey hiçbir
    şeyin değişmediği render'lardı.

    ⚠️ Uçuşun **sonu da burada** çözülüyor, ayrı bir efektte değil:
    motoru ilerletmek için efekt gövdesinde durum yazmak lint tarafından
    reddedildi ve haklıydı.
  */
  const ucusVar = y.ucus !== null;
  useEffect(() => {
    if (!ucusVar) return;
    let id = 0;

    const kare = () => {
      setY((p) => {
        if (!p.ucus) return p;
        const sonraki = p.ucus.indeks + 1;
        if (sonraki < p.ucus.iz.length) {
          return { ...p, ucus: { ...p.ucus, indeks: sonraki } };
        }
        // Uçuş bitti — motoru ilerlet. `uygula` saf, güncelleyici saf kalıyor.
        const yeniDurum = sekme.uygula(p.durum, p.ucus.girdi);
        if (!yeniDurum) return { ...p, ucus: null };
        return {
          durum: yeniDurum,
          girdiler: [...p.girdiler, p.ucus.girdi],
          ucus: null,
        };
      });
      id = requestAnimationFrame(kare);
    };
    id = requestAnimationFrame(kare);
    return () => cancelAnimationFrame(id);
  }, [ucusVar]);

  const firlat = useCallback(
    (aci: number) => {
      setY((p) => {
        if (p.ucus || sekme.bittiMi(p.durum)) return p;
        const iz = atisIzi(p.durum, aci);
        if (iz.length === 0) return p;
        return { ...p, ucus: { iz, indeks: 0, girdi: { t: p.durum.tur, a: aci } } };
      });
      ses.cal("yerlesti");
    },
    [ses],
  );

  /*
    ── Nişan: GERİ ÇEKEREK ───────────────────────────────

    Ürün sahibi: *"parmağıyla geri çekerek kullanıcı isabet almalı."*

    🔴 İlk sürüm "nereye dokunursan oraya gider" idi ve iki sebeple
    yanlıştı:

    · **Sapan metaforu yok.** Geri çekmek, atışın gücünü ve yönünü
      bedende hissettiriyor; işaret etmek yalnızca bir koordinat
      veriyor.
    · **Parmak hedefi kapatıyor.** İşaret ederken parmak tam nişan
      aldığın bloğun üstünde duruyor ve neyi vurmaya çalıştığını
      göremiyorsun. Geri çekerken parmak aşağıda, tahta açıkta.

    Artık nişan **sürüklemenin tersi**: parmak aşağı çekildikçe top
    yukarı gidiyor. Dokunuşun başladığı yer çapa, bulunduğu yer ok
    ucunun tersi.

    ⚠️ Açı **ayrık** (61 kademe) çünkü girdi kaydına giden şey bir
    indeks (`sekme.ts`in determinizm notu). `atan2` yalnızca burada,
    nişan için; sonucu asla girdiye yazılmıyor.
  */
  const cekme = useRef<{ x: number; y: number } | null>(null);

  /** Geri çekme sayılması için gereken en az mesafe (piksel). */
  const ESIK = 18;

  const aciHesapla = useCallback((bx: number, by: number, x: number, yy: number): number | null => {
    // Atış yönü = çekmenin TERSİ.
    const dx = bx - x;
    const dy = by - yy;
    if (dx * dx + dy * dy < ESIK * ESIK) return null;
    // Yukarı gitmeyen atış yok: oyuncu yukarı sürüklerse nişan almıyor.
    if (dy >= 0) return null;
    const derece = (Math.atan2(-dy, dx) * 180) / Math.PI;
    const oran = (derece - 15) / 150;
    return Math.max(0, Math.min(ACI_SAYISI - 1, Math.round(oran * (ACI_SAYISI - 1))));
  }, []);

  const bitti_ = sekme.bittiMi(durum);
  const gorunen = ucus ? ucus.iz[Math.min(ucus.indeks, ucus.iz.length - 1)] : null;
  const nesneler: readonly SekmeNesnesi[] = gorunen ? gorunen.nesneler : durum.nesneler;
  const hucreG = 100 / SEKME_EN;
  const hucreY = 100 / SEKME_BOY;

  return (
    <div className="fixed inset-0 z-40 flex flex-col px-2 pb-3" style={sekmeSahnesi()}>
      <span aria-hidden className="dusen-yildiz pointer-events-none absolute inset-0" />

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

        {/* HUD + tahta tek grup, grup dikey ortalı — Ü211'in dersi. */}
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5">
          <div className="flex shrink-0 items-stretch gap-2">
            <div
              className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-2"
              style={sekmePanel()}
            >
              <span className="font-data text-[9px] leading-none font-bold tracking-[0.2em] text-[#C084FC]">
                SKOR
              </span>
              <span
                key={durum.skor}
                className="dusen-skor mt-1 font-data text-[28px] leading-none font-black tabular text-white"
                style={{ textShadow: "0 0 12px rgba(192,132,252,.75)" }}
              >
                {durum.skor.toLocaleString("tr-TR")}
              </span>
              <span className="mt-1.5 font-data text-[10px] leading-none font-bold tracking-[0.1em] text-white/45">
                ATIŞ <span className="tabular text-white/75">{durum.tur}</span>
              </span>
            </div>

            <div
              className="flex w-[78px] shrink-0 flex-col items-center justify-center px-2 py-2"
              style={sekmePanel("#93C5FD")}
            >
              <span className="font-data text-[9px] leading-none font-bold tracking-[0.14em] text-[#93C5FD]">
                TOP
              </span>
              <span className="mt-1 font-data text-[26px] leading-none font-black tabular text-white">
                {durum.top}
              </span>
            </div>
          </div>

          {/* ── Tahta ─────────────────────────────── */}
          <div className="flex min-h-0 items-center justify-center">
            <div
              className="aspect-[7/9] h-auto max-h-full w-full max-w-[min(100%,calc((100dvh-300px)*0.777))]"
              style={sekmeCerceve()}
            >
              <div
                ref={tahtaRef}
                className="relative h-full w-full overflow-hidden"
                style={{ ...sekmeTahtasi(SEKME_EN), touchAction: "none" }}
                onPointerDown={(e) => {
                  if (ucus || bitti_) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  cekme.current = { x: e.clientX, y: e.clientY };
                }}
                onPointerMove={(e) => {
                  const b = cekme.current;
                  if (ucus || bitti_ || !b) return;
                  setNisan(aciHesapla(b.x, b.y, e.clientX, e.clientY));
                }}
                onPointerUp={() => {
                  cekme.current = null;
                  if (nisan !== null) firlat(nisan);
                  setNisan(null);
                }}
                onPointerCancel={() => {
                  cekme.current = null;
                  setNisan(null);
                }}
              >
                {/* Nesneler */}
                {nesneler.map((n, i) => {
                  const ortak = {
                    left: `${n.k * hucreG}%`,
                    top: `${n.s * hucreY}%`,
                    width: `${hucreG}%`,
                    height: `${hucreY}%`,
                  };

                  if (n.tur === "blok") {
                    return (
                      /*
                        🔴 İç kutu `inset` ile küçülüyor, `padding: 6%`
                        ile DEĞİL — Ü217'de ölçülerek bulundu.

                        Yüzdeli dolgu, **kapsayan bloğun genişliğine**
                        göre çözülüyor. Sarmalayıcı mutlak konumlu
                        olduğu için kapsayan blok tahtanın kendisi:
                        `6%` → 6 × 353 / 100 = **21 piksel**, oysa
                        hücre 50 piksel. İki yandan 42 piksel gidince
                        bloktan geriye 8 piksel kalıyor ve ekranda ince
                        birer pil gibi duruyorlardı.

                        `inset` yüzdesi ise mutlak konumlu çocuğun
                        kapsayan bloğuna — yani sarmalayıcıya — göre
                        çözülüyor, istenen davranış bu.
                      */
                      <span key={`b-${n.k}-${n.s}-${i}`} className="absolute" style={ortak}>
                        {n.ucgen !== undefined ? (
                          /* İki kırpılmış katman: dışta kenar, içinde
                             cam gövde. Tek katmanla üçgene kenar
                             çizgisi verilemiyor (`clip-path`
                             `box-shadow`u da kırpıyor). */
                          <span
                            className="absolute inset-[7%]"
                            style={sekmeUcgenCercevesi(n.can, n.ucgen)}
                          >
                            <span
                              className="absolute inset-[1.5px]"
                              style={sekmeBloku(n.can, n.ucgen)}
                            />
                          </span>
                        ) : (
                          <span className="absolute inset-[7%]" style={sekmeBloku(n.can)} />
                        )}
                        {/* ⚠️ Sayı kırpılan kutunun DIŞINDA, ayrı bir
                            katmanda: `clip-path` çocukları da kırpıyor
                            ve üçgenin dar köşesine düşen rakam yarım
                            kalırdı. Üçgende sayı dik açının olduğu
                            köşeye kayıyor — orası en geniş yer. */}
                        <span
                          className="absolute grid place-items-center font-data text-[13px] font-black tabular"
                          style={{
                            ...sayiYeri(n.ucgen),
                            color: sekmeBlokYazisi(n.can),
                            textShadow: "0 1px 3px rgba(0,0,0,.7)",
                          }}
                        >
                          {n.can}
                        </span>
                      </span>
                    );
                  }

                  if (n.tur === "top") {
                    return (
                      <span
                        key={`h-${n.k}-${n.s}-${i}`}
                        className="absolute grid place-items-center"
                        style={ortak}
                      >
                        <span
                          className="grid size-[48%] place-items-center font-data text-[13px] font-black text-[#0B3C1E]"
                          style={sekmeHediyesi()}
                        >
                          +
                        </span>
                      </span>
                    );
                  }

                  /*
                    🔴 İzin yoksa paket ÇİZİLMİYOR — Ü207 · Ü275.

                    Motor paketi yine üretiyor ve üretmek zorunda
                    (konumu bilseydi replay sapardı); gizleyen ekran.
                    Ürün sahibi bu hatayı Blok'ta yakalamıştı.
                  */
                  if (!paketGorunur) return null;
                  return (
                    <span key={`o-${n.k}-${n.s}-${i}`} className="absolute" style={ortak}>
                      {/* `inset`, `padding` değil — yukarıdaki nota bak.

                          Ü251: ödül havadan düşüyor. 🔴 Ü274: YALNIZCA
                          doğduğu satırda (s = 0). Önceki not "`key`
                          hücreden türediği için animasyon bir kez
                          koşuyor" diyordu — yanlıştı: her atıştan sonra
                          bütün satırlar bir iniyor, hücre değişiyor,
                          `key` değişiyor ve eleman yeniden kuruluyordu.
                          Ürün sahibi: "ödüllü blok her atışımda üstten
                          yeniden düşüp oyuna yeniden geldi gibi oldu."
                          Motor yeni satırı her zaman s = 0'a koyuyor. */}
                      <span
                        className={`${n.s === 0 ? "sekme-odul-dus " : ""}absolute inset-[9%]`}
                        style={sekmeOdulu()}
                      />
                    </span>
                  );
                })}

                {/*
                  Uçan toplar — 🔴 Ü275: her top KENDİ KATMANINDA.

                  Ürün sahibi: *"tüm oyunlar çok takılıyor, donuyor."*
                  Toplar `left/top` ile tahtanın içinde taşınıyordu; her
                  karede tahtanın o bölgesi, blokların degradeleri ve
                  gölgeleriyle birlikte yeniden boyanıyordu. Bilgisayar
                  tarayıcısı bunu ekran kartında yaptığı için fark
                  edilmiyor (4 kat yavaşlatılmış işlemcide bile 60 kare);
                  iPhone Safari aynı işi işlemcide yapıyor.

                  Artık top sol-üst köşede duruyor ve `transform` ile
                  taşınıyor (`will-change` → ayrı katman). Kaydırma yüzdesi
                  topun KENDİ boyuna göre: top 2R birim, yani `x / 2R`
                  kat kadar kaydırmak onu x birimine götürüyor. Ölçüm
                  gerekmiyor; tahta 7:9 olduğu için iki eksende birim aynı.
                */}
                {gorunen?.toplar.map((t, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="pointer-events-none absolute top-0 left-0"
                    style={{
                      ...sekmeTopu(),
                      width: `${(SEKME_OLCEK.TOP_R * 2 / SEKME_OLCEK.GENISLIK) * 100}%`,
                      height: `${(SEKME_OLCEK.TOP_R * 2 / SEKME_OLCEK.YUKSEKLIK) * 100}%`,
                      transform: `translate3d(${(t.x / (SEKME_OLCEK.TOP_R * 2) - 0.5) * 100}%, ${(t.y / (SEKME_OLCEK.TOP_R * 2) - 0.5) * 100}%, 0)`,
                      willChange: "transform",
                    }}
                  />
                ))}

                {/* Nişan kılavuzu — noktalı çizgi. Ü275: kendi katmanında;
                    parmak her kıpırdadığında çizgi yeniden çiziliyor ve
                    altındaki bloklar bununla birlikte boyanmamalı. */}
                {nisan !== null && !ucus && (
                  <div className="pointer-events-none absolute inset-0" style={{ willChange: "transform" }}>
                    <Kilavuz durum={durum} aci={nisan} />
                  </div>
                )}

                {/* Kaybetme çizgisi — blok buraya değince tur biter. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 w-full"
                  style={{
                    top: `${(SEKME_BOY - 1) * hucreY}%`,
                    height: 2,
                    background:
                      "repeating-linear-gradient(90deg, rgba(251,113,133,.85) 0 8px, transparent 8px 16px)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Fırlatıcı: Loopy ───────────────────
              Ürün sahibi: *"topu fırlatan karakter bizim loopymiz
              olsun."* Mevcut `<Avatar>` kullanılıyor, yeni görsel
              üretilmedi.

              ⚠️ Loopy tahtanın DIŞINDA, altında duruyor: içeride
              olsaydı topların yoluna girer ve oyuncu neyi vurduğunu
              göremezdi. Yatayda fırlatıcının konumunu izliyor.

              🔴 Ü242'de büyüdü: 50 → 82. Ürün sahibi *"loopymiz
              daha büyük olsun, gerçekten o fırlatıyor gibi"* dedi.
              50 pikselde topun çıktığı yerin altında küçük bir
              rozet gibi duruyordu; top ondan çıkmıyor, onun
              üstünden geçiyor gibi görünüyordu.

              ⚠️ Yukarı kaydırıldı (`-top`): Loopy'nin başı tahtanın
              alt kenarına değiyor ve top tam oradan çıkıyor. Kutu
              yüksekliği başın taşan kısmını saymıyor, yoksa tahta
              yukarı itilirdi. */}
          {/* 🔴 Ü275: Loopy `left` geçişiyle değil `transform`la kayıyor
              (tam genişlikte taşıyıcı, yüzde onun boyuna göre) ve atış
              sırasında YÜZ DEĞİŞTİRMİYOR. Her atışta "neşeli"ye geçip
              geri dönmek, üç katmanlı görseli iki kez yeniden çözdürüp
              boyatıyordu — atışın başında ve sonunda takılmanın kaynağı. */}
          <div className="relative h-[62px] shrink-0">
            <div
              className="absolute inset-x-0 -top-3 transition-transform duration-200 ease-out"
              style={{
                transform: `translateX(${(durum.firlatici / SEKME_OLCEK.GENISLIK) * 100}%)`,
                willChange: "transform",
              }}
            >
              <div className="w-fit -translate-x-1/2">
                <Avatar ifade={bitti_ ? "sakin" : "mutlu"} boy={82} />
              </div>
            </div>
          </div>

          <p className="shrink-0 text-center text-[12px] text-white/45">
            {bitti_
              ? "Bloklar en alta indi"
              : ucus
                ? "Toplar dönüyor…"
                : "Tahtaya parmağını bas, nişan al, bırak"}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Üçgende sayının nereye yazılacağı.
 *
 * Dik açının köşesi üçgenin en geniş yeri; rakam oraya yakın durmalı,
 * yoksa dar uçta yarım kalır. Düz blokta tam ortada.
 */
function sayiYeri(ucgen?: number): { inset: string } {
  if (ucgen === undefined) return { inset: "7%" };
  // 0 sol-üst · 1 sağ-üst · 2 sağ-alt · 3 sol-alt
  const yer = ["10% 34% 34% 10%", "10% 10% 34% 34%", "34% 10% 10% 34%", "34% 34% 10% 10%"];
  return { inset: yer[ucgen] };
}

/**
 * Nişan kılavuzu — topun İLK ÇARPACAĞI yere kadar tek düz çizgi.
 *
 * ── 🔴 Dört turda buraya gelindi ────────────────────────────
 *
 * 1. Ü217: kısa, düz, çok soluk bir ışın; yalnızca çıkış yönü.
 * 2. Ü236: ürün sahibi *"çizgi çizgi olacak şekilde belli
 *    olmalı"* dedi. Önce "ince" sanıldı, kalınlaştırıldı —
 *    ekranda hiçbir şey değişmedi. DOM'dan ölçüldü: çizgi 1,84
 *    viewBox birimiydi (5×5 piksel); hesaptaki bir `* 0.02`
 *    çarpanı `uzunluk` sabitini işlevsiz bırakıyordu.
 * 3. Ü241: *"tüm yol boyunca ilerlemeli"* dendi, kılavuz gerçek
 *    yörüngeye geçti — duvar sekmeleri dahil.
 * 4. Ü242: ürün sahibi sekmeleri görünce *"sekeceği alanı
 *    göstermesine gerek yok, tek çizgi halinde topun ilk
 *    çarpacağı alanı göstermeli"* dedi. **Sekme geri alındı.**
 *
 * Ü241'in yörünge işi boşa gitmedi: çizginin nerede biteceğini
 * hâlâ o hesap söylüyor. Değişen şey, ilk temastan sonrasının
 * çizilmemesi.
 *
 * ── Bitiş noktası motordan geliyor, buradan DEĞİL ───────────
 *
 * 🔴 Dosyanın kuralı: *"ekran kendi fiziğini yazsaydı ekrandaki
 * iz ile sunucunun gördüğü sonuç ayrışırdı."* Kılavuz kendi
 * çarpışma hesabını yapmıyor; `atisIzi` ile motorun izini alıyor
 * ve **yönün ilk değiştiği** kareyi arıyor. Top orada bir şeye
 * değmiştir — duvara ya da bloğa.
 *
 * Uçuş animasyonu da aynı kaynaktan besleniyor, yani çizginin
 * bittiği yer ile topun gerçekten değdiği yer tanım gereği aynı.
 *
 * Ölçüldü: `atisIzi` çağrısı 0,04–0,12 ms; `useMemo` aynı açıda
 * tekrar hesaplamıyor.
 *
 * ⚠️ Uçta nokta YOK — ürün sahibi *"sonunda bu yuvarlak şey
 * olmasın"* dedi. Çizginin bittiği yer zaten çarpma noktası;
 * nokta onu tekrar söylüyordu.
 */
function Kilavuz({
  durum,
  aci,
}: {
  durum: SekmeDurumu;
  aci: number;
}) {
  const uc = useMemo(() => {
    const iz = atisIzi(durum, aci);
    const ilk = iz[0]?.toplar[0];
    if (!ilk) return null;

    /*
      İlk TEMAS aranıyor: yönün değiştiği ya da nesnelerin
      değiştiği ilk kare. Motorun hızı sekmeler arasında sabit,
      yani ardışık farklar birebir aynı; fark değiştiği an top bir
      şeye değmiştir.

      ⚠️ Nesne kıyası kareden kareye, `durum.nesneler` ile değil:
      `simule` daha başlarken diziyi kopyalıyor ve ilk kare zaten
      farklı bir dizi olurdu (Ü241'de bu hata yapıldı, kılavuz hiç
      çizilmedi).
    */
    let onceki = ilk;
    let dx: number | null = null;
    let dy: number | null = null;
    let oncekiNesneler: readonly unknown[] | null = null;

    for (const kare of iz) {
      const top = kare.toplar[0];
      if (!top) break;
      if (oncekiNesneler !== null && kare.nesneler !== oncekiNesneler) break;
      oncekiNesneler = kare.nesneler;

      const adx = top.x - onceki.x;
      const ady = top.y - onceki.y;
      if (adx !== 0 || ady !== 0) {
        if (dx === null) {
          dx = adx;
          dy = ady;
        } else if (adx !== dx || ady !== dy) {
          break;
        }
      }
      onceki = top;
    }

    return {
      x0: (ilk.x / SEKME_OLCEK.GENISLIK) * 100,
      y0: (ilk.y / SEKME_OLCEK.YUKSEKLIK) * 100,
      x1: (onceki.x / SEKME_OLCEK.GENISLIK) * 100,
      y1: (onceki.y / SEKME_OLCEK.YUKSEKLIK) * 100,
    };
  }, [durum, aci]);

  if (!uc) return null;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Parıltı — çizginin koyu tahtadan ayrılmasını sağlıyor. */}
      <line
        x1={uc.x0}
        y1={uc.y0}
        x2={uc.x1}
        y2={uc.y1}
        stroke={SEKME_RENK.isik}
        strokeWidth="7"
        strokeDasharray="5 3.5"
        strokeLinecap="round"
        opacity="0.22"
        vectorEffect="non-scaling-stroke"
      />
      {/* Çizginin kendisi. */}
      <line
        x1={uc.x0}
        y1={uc.y0}
        x2={uc.x1}
        y2={uc.y1}
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeDasharray="5 3.5"
        strokeLinecap="round"
        opacity="0.95"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Hoparlör — Ü205'te eklendi, Ü206'da belirginleşti.
 *
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
          ? { background: `linear-gradient(180deg, #E9D5FF 0%, ${SEKME_RENK.isik} 100%)`, color: "#22103f" }
          : { boxShadow: `inset 0 0 0 1.5px ${SEKME_RENK.isik}8c`, color: "rgba(255,255,255,.72)" }
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
