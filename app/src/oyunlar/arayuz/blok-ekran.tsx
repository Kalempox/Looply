"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { blok, kademe, type BlokDurumu, type BlokGirdisi, PARCA_HUCRELERI } from "../blok";
import { hucreStili, oyunTonu, tahtaStili } from "./tahta";
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
 * ── Ü85: tahta oyunun rengine geçti ─────────────────────────
 *
 * Yüzey `tahta.tsx`ten geliyor; bu dosya artık renk seçmiyor. Hücreler
 * gradyanlı ve üstten ışık alıyor (Ü68), boş hücreler oyunun renginin
 * çok soluk hâli — boş tahta bile hangi oyunda olduğunu söylüyor.
 */
export function BlokEkrani({ oyunId, tohum, bitti }: OyunEkraniProps) {
  const r = oyunTonu(oyunId);
  const [durum, setDurum] = useState<BlokDurumu>(() => blok.baslat(tohum));
  const [girdiler, setGirdiler] = useState<BlokGirdisi[]>([]);
  const [secili, setSecili] = useState<number | null>(null);
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
      const sonraki = blok.uygula(durum, girdi);
      if (!sonraki) return;

      const yeniGirdiler = [...girdiler, girdi];
      setDurum(sonraki);
      setGirdiler(yeniGirdiler);
      setSecili(null);

      if (blok.bittiMi(sonraki)) {
        bitti(yeniGirdiler, blok.skor(sonraki));
      }
    },
    [durum, girdiler, secili, bitti],
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
    <div className="oyun-alani">
      <Sayaclar durum={durum} oyunId={oyunId} />

      {/* ── Izgara ─────────────────────────────────── */}
      <div
        className="kart-golge mt-5 grid grid-cols-8 gap-[3px] rounded-2xl p-2"
        style={tahtaStili(oyunId)}
      >
        {Array.from({ length: 64 }, (_, i) => {
          const s = Math.floor(i / 8);
          const k = i % 8;
          const dolu = (durum.izgara[s] & (1 << k)) !== 0;
          const inecek = onizleme?.kareler.has(i) ?? false;

          const hal = inecek
            ? onizleme!.gecerli
              ? "onizleme"
              : "gecersiz"
            : dolu
              ? "dolu"
              : "bos";

          return (
            <button
              key={i}
              type="button"
              data-kare={i}
              onClick={() => koy(s, k)}
              disabled={secili === null}
              aria-label={`${s + 1}. satır ${k + 1}. sütun`}
              className="aspect-square rounded-[5px] transition-[background,box-shadow] duration-150"
              style={hucreStili(oyunId, hal)}
            />
          );
        })}
      </div>

      {/* ── Teklifler ──────────────────────────────── */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {durum.teklifler.map((parca, t) => (
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
            // Seçili teklif yükseliyor: hangi parçanın elinde olduğu
            // yalnızca çerçeveyle söylenirse küçük ekranda kaçıyor.
            className="flex min-h-[88px] items-center justify-center rounded-2xl px-2 py-3 transition-transform duration-150 disabled:opacity-20"
            style={{
              // touch-action: parmak sürüklerken sayfa kaymasın — yoksa
              // sürükleme hareketi kaydırma olarak yorumlanıyor ve oyun
              // hiç tepki vermemiş gibi görünüyor.
              touchAction: "none",
              background: "var(--color-yuzey)",
              border: `1px solid ${secili === t ? r.ana : "var(--color-cizgi)"}`,
              boxShadow:
                secili === t
                  ? `0 0 0 3px ${r.ana}33, 0 6px 14px -6px ${r.koyu}59`
                  : `0 1px 2px ${r.koyu}14`,
              transform: secili === t ? "translateY(-3px)" : undefined,
            }}
          >
            {parca >= 0 ? <ParcaOnizleme parca={parca} renk={r.canli} /> : null}
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-[13px] text-yazi-sonuk">
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
  );
}

/**
 * Üst şerit — temizlenen, zorluk kademesi, zincir ve skor.
 *
 * Ü83'te ilerleme çubuğu kaldırıldı: hedef yok, doldurulacak bir şey yok.
 * Yerine **zorluk kademesi** kondu — oyuncu parçaların neden büyüdüğünü
 * görmeli, yoksa oyun haksız hissettirir.
 */
function Sayaclar({ durum, oyunId }: { durum: BlokDurumu; oyunId: string }) {
  const zorluk = kademe(durum.tur);
  const r = oyunTonu(oyunId);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="etiket-caps text-yazi-sonuk">
          {durum.temizlenen} temizlendi
        </span>
        <span className="flex items-baseline gap-2.5">
          {/* Zorluk kademesi noktalarla: "zorluk 3" okunması gereken bir
              sayı, üç dolu nokta bir bakışta görülen bir şey. */}
          <ZorlukNoktalari kademe={zorluk} renk={r.ana} />
          {/* `key` skorla değişiyor ki her artışta animasyon yeniden
              koşsun — sabit anahtarda CSS bir kez oynayıp susuyor. */}
          <span
            key={durum.skor}
            className="patla font-data text-2xl leading-none font-bold tabular"
            style={{ color: r.ana }}
          >
            {durum.skor}
          </span>
        </span>
      </div>

      {/* Zincir yalnızca yanarken görünüyor: sürekli duran bir "0" gürültü. */}
      {durum.zincir > 1 && (
        <p
          key={durum.zincir}
          className="patla mt-1.5 inline-block rounded-full border border-odul bg-odul-zemin px-2.5 py-0.5 font-data text-[11px] font-bold tracking-wide text-odul-koyu uppercase"
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
function ParcaOnizleme({ parca, renk }: { parca: number; renk: string }) {
  const hucreler = PARCA_HUCRELERI[parca];
  const enS = Math.max(...hucreler.map((h) => h[0])) + 1;
  const enK = Math.max(...hucreler.map((h) => h[1])) + 1;
  const dolu = new Set(hucreler.map(([s, k]) => s * enK + k));

  // 3×3 kare 12 pikselde kutuyu taşırıyordu; en geniş parçaya göre
  // küçülüyor ki üç teklif de aynı yüksekliğte dursun.
  const boy = enK >= 4 || enS >= 4 ? 10 : 12;

  return (
    <div
      className="grid gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${enK}, ${boy}px)` }}
      aria-hidden
    >
      {Array.from({ length: enS * enK }, (_, i) => (
        <span
          key={i}
          className="rounded-[2px]"
          style={{
            width: boy,
            height: boy,
            background: dolu.has(i) ? renk : "transparent",
            boxShadow: dolu.has(i) ? "inset 0 1px 0 rgba(255,255,255,0.4)" : undefined,
          }}
        />
      ))}
    </div>
  );
}
