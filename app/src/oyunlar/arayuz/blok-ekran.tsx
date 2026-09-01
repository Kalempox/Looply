"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { blok, type BlokDurumu, type BlokGirdisi, PARCA_HUCRELERI } from "../blok";
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
 * ── Çapa: parçanın sol üst köşesi ───────────────────────────
 *
 * Parmağın altındaki kare, parçanın sol üst köşesi oluyor. Parmağın
 * ortaya denk gelmesi daha "doğal" görünürdü ama parçalar farklı
 * boyutta: kural her parçada değişirdi. Sabit çapa + görünür önizleme,
 * tahmin etmeyi tamamen gereksiz kılıyor.
 */
export function BlokEkrani({ tohum, bolum, bitti }: OyunEkraniProps) {
  const [durum, setDurum] = useState<BlokDurumu>(() => blok.baslat(tohum, bolum));
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
      <Sayaclar durum={durum} />

      {/* ── Izgara ─────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-8 gap-[3px] rounded-lg border border-cizgi bg-yuzey p-[3px]">
        {Array.from({ length: 64 }, (_, i) => {
          const s = Math.floor(i / 8);
          const k = i % 8;
          const dolu = (durum.izgara[s] & (1 << k)) !== 0;
          const inecek = onizleme?.kareler.has(i) ?? false;

          return (
            <button
              key={i}
              type="button"
              data-kare={i}
              onClick={() => koy(s, k)}
              disabled={secili === null}
              aria-label={`${s + 1}. satır ${k + 1}. sütun`}
              className={`aspect-square transition-colors ${
                inecek
                  ? onizleme!.gecerli
                    ? "bg-vurgu/70 ring-1 ring-vurgu"
                    : "bg-tehlike/40 ring-1 ring-tehlike/70"
                  : dolu
                    ? "bg-vurgu"
                    : "bg-cukur"
              }`}
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
            // touch-action: parmak sürüklerken sayfa kaymasın — yoksa
            // sürükleme hareketi kaydırma olarak yorumlanıyor ve oyun
            // hiç tepki vermemiş gibi görünüyor.
            style={{ touchAction: "none" }}
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
            className={`flex min-h-[84px] items-center justify-center rounded-2xl border border-cizgi bg-yuzey px-2 py-3 disabled:opacity-25 ${
              secili === t ? "ring-2 ring-vurgu" : ""
            }`}
          >
            {parca >= 0 ? <ParcaOnizleme parca={parca} /> : null}
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

function Sayaclar({ durum }: { durum: BlokDurumu }) {
  const yuzde = Math.min(100, Math.round((durum.temizlenen / durum.hedef) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="etiket-caps text-yazi-sonuk">
          Temizlenen {durum.temizlenen}/{durum.hedef}
        </span>
        <span className="font-data text-xl leading-none font-bold text-vurgu tabular">
          {durum.skor}
        </span>
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-cukur">
        <div className="asil-serit h-full rounded-full bg-vurgu" style={{ width: `${yuzde}%` }} />
      </div>
    </div>
  );
}

/** Parçanın küçük önizlemesi — hangi biçimi seçtiğin görünsün. */
function ParcaOnizleme({ parca }: { parca: number }) {
  const hucreler = PARCA_HUCRELERI[parca];
  const enS = Math.max(...hucreler.map((h) => h[0])) + 1;
  const enK = Math.max(...hucreler.map((h) => h[1])) + 1;
  const dolu = new Set(hucreler.map(([s, k]) => s * enK + k));

  return (
    <div
      className="grid gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${enK}, 12px)` }}
      aria-hidden
    >
      {Array.from({ length: enS * enK }, (_, i) => (
        <span
          key={i}
          className={`h-3 w-3 ${dolu.has(i) ? "bg-odul" : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}
