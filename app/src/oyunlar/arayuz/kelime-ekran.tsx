"use client";

import { useCallback, useState } from "react";
import { kelime, type KelimeDurumu, type KelimeGirdisi } from "../kelime";
import type { OyunEkraniProps } from "./ortak";

/**
 * Kelime ekranı — harflere dokunarak kelime kur.
 *
 * Harf **karolarına** dokunuluyor, klavye açılmıyor. İki sebebi var:
 * telefon klavyesi ekranın yarısını kapatıyor, ve klavye açık olsa oyuncu
 * eldeki harflerde olmayan kelimeler yazıp boşuna deneyecekti. Karo modeli
 * kuralı görünür kılıyor.
 *
 * Reddedilen kelime **sessizce yutulmuyor**: neden geçersiz olduğu
 * söyleniyor. "Denedim, olmadı, neden bilmiyorum" en sinir bozucu hâl.
 */
export function KelimeEkrani({ tohum, bolum, bitti }: OyunEkraniProps) {
  const [durum, setDurum] = useState<KelimeDurumu>(() => kelime.baslat(tohum, bolum));
  const [girdiler, setGirdiler] = useState<KelimeGirdisi[]>([]);
  /** Seçilen harflerin **indeksleri** — aynı harften iki tane varsa ayrışsın. */
  const [secim, setSecim] = useState<number[]>([]);
  const [uyari, setUyari] = useState<string | null>(null);

  const kurulan = secim.map((i) => durum.harfler[i]).join("");

  const harfeDokun = useCallback((i: number) => {
    setUyari(null);
    setSecim((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  }, []);

  const gonder = useCallback(() => {
    if (kurulan.length === 0) return;

    const girdi: KelimeGirdisi = { k: kurulan };
    const sonraki = kelime.uygula(durum, girdi);

    if (!sonraki) {
      // Motor tek bir `null` döndürüyor; sebebi burada ayrıştırıyoruz ki
      // oyuncuya ne olduğunu söyleyebilelim.
      setUyari(
        kurulan.length < 3
          ? "En az üç harf gerekiyor"
          : durum.bulunan.includes(kurulan)
            ? "Bu kelimeyi zaten buldun"
            : "Bu kelime listede yok",
      );
      setSecim([]);
      return;
    }

    const yeniGirdiler = [...girdiler, girdi];
    setDurum(sonraki);
    setGirdiler(yeniGirdiler);
    setSecim([]);
    setUyari(null);

    if (kelime.bittiMi(sonraki)) {
      bitti(yeniGirdiler, kelime.skor(sonraki));
    }
  }, [durum, girdiler, kurulan, bitti]);

  return (
    <div className="oyun-alani">
      <div className="flex items-baseline justify-between">
        <span className="etiket-caps text-yazi-sonuk">
          Kelime {durum.bulunan.length}/{durum.hedef}
        </span>
        <span className="font-data text-xl leading-none font-bold text-vurgu tabular">
          {durum.skor}
        </span>
      </div>

      {/* ── Kurulan kelime ─────────────────────────── */}
      <div className="mt-5 flex min-h-[52px] items-center justify-center rounded-lg border border-cizgi bg-cukur px-4">
        <span className="font-display text-2xl font-extrabold tracking-[0.18em] uppercase">
          {kurulan || <span className="text-yazi-sonuk/40">· · ·</span>}
        </span>
      </div>

      {uyari && <p className="mt-2 text-center text-[13px] text-tehlike">{uyari}</p>}

      {/* ── Harfler ────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {durum.harfler.map((h, i) => {
          const secili = secim.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => harfeDokun(i)}
              aria-pressed={secili}
              className={`h-14 w-14 rounded-lg border border-cizgi bg-yuzey font-display text-xl font-extrabold uppercase ${
                secili ? "text-odul-koyu ring-2 ring-odul" : "text-yazi"
              }`}
            >
              {h}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setSecim([]);
            setUyari(null);
          }}
          className="rounded-lg border border-cizgi py-3.5 font-display text-[15px] text-yazi-sonuk"
        >
          Temizle
        </button>
        <button
          type="button"
          onClick={gonder}
          disabled={kurulan.length === 0}
          className="rounded-lg bg-vurgu py-3.5 font-display text-[15px] font-bold text-white disabled:opacity-40"
        >
          Gönder
        </button>
      </div>

      {/* ── Bulunanlar ─────────────────────────────── */}
      {durum.bulunan.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2">
          {durum.bulunan.map((k) => (
            <li
              key={k}
              className="rounded border border-vurgu/45 bg-cukur px-3 py-1 font-data text-[12px] font-medium tracking-wide text-vurgu uppercase"
            >
              {k}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-[12px] leading-relaxed text-yazi-sonuk">
        Bu harflerden {durum.olasi} kelime çıkıyor
      </p>
    </div>
  );
}
