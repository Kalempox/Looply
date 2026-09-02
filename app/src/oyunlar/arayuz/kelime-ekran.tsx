"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  kelime,
  olasiKelimeler,
  turSuresi,
  type KelimeDurumu,
  type KelimeGirdisi,
} from "../kelime";
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
 *
 * ── Ü83: sayaç ekranın işi ──────────────────────────────────
 *
 * Motorun saati tick sayıyor; ekran o sayacı ilerletiyor ve her tick'i
 * **girdi kaydına yazmıyor** — yalnızca kelime gönderilirken ve oyun
 * biterken bir zaman işareti düşüyor. Her tick kaydedilseydi bir turluk
 * kayıt binlerce satır olurdu ve `EN_FAZLA_GIRDI` sınırına çarpardı.
 * Sunucu için önemli olan hamlenin **hangi tick'te** yapıldığı; aradaki
 * boşluğu `uygula` zaten kendisi geçiyor.
 */
const TICK_MS = 50;

/**
 * Oyun durumu tek bir nesnede.
 *
 * ⚠️ Saat ile durum ayrı `useState`lerde tutulduğunda sayaç **bir saniye
 * sonra donuyordu**: zamanlayıcı efekti `durum` ve `girdiler`e bağlıydı,
 * her tick bir render açıyor ve efekt kendini kurup yıkıyordu. Düşen
 * ekranı bu tuzağa düşmesin diye zaten tek nesne kullanıyor; burası da
 * aynı örüntüye taşındı. Efektin bağımlılığı artık boş: zamanlayıcı bir
 * kez kuruluyor ve güncelleyici saf kalıyor.
 */
type Yerel = {
  durum: KelimeDurumu;
  girdiler: KelimeGirdisi[];
  /** Ekranın saati. Motorun `durum.tick`i yalnızca hamlelerde ilerliyor. */
  tick: number;
};

export function KelimeEkrani({ tohum, bitti, demoKapisi }: OyunEkraniProps) {
  const [y, setY] = useState<Yerel>(() => ({
    durum: kelime.baslat(tohum),
    girdiler: [],
    tick: 0,
  }));
  /** Seçilen harflerin **indeksleri** — aynı harften iki tane varsa ayrışsın. */
  const [secim, setSecim] = useState<number[]>([]);
  const [uyari, setUyari] = useState<string | null>(null);
  const bildirildi = useRef(false);

  const durum = y.durum;
  const kurulan = secim.map((i) => durum.harfler[i]).join("");
  const kalanTick = Math.max(0, durum.bitisTicki - y.tick);

  // ── Sayaç ────────────────────────────────────────────
  //
  // Zamanlayıcı **bir kez** kuruluyor ve durumu yalnızca güncelleyiciden
  // okuyor; bağımlılık listesi bu yüzden boş.
  //
  // ⚠️ Tick **duvar saatinden** hesaplanıyor, `p.tick + 1` ile sayılmıyor.
  // Sayarak ilerletmek iki yerde bozuluyordu:
  //
  //   · Tarayıcı gizli sekmede `setInterval`i kısıyor (ölçüldü: saniyede
  //     20 yerine ~1,5 tick). Süre fiilen duruyordu.
  //   · Oyuncu sekmeyi arkaya atıp istediği kadar düşünebiliyordu — turun
  //     tek zorluk kolu süre olduğu için bu, oyunu tamamen açıyordu.
  //
  // Duvar saati ikisini birden kapatıyor: geri dönen oyuncu geçen zamanı
  // olduğu gibi buluyor.
  useEffect(() => {
    const baslangic = Date.now();
    const zamanlayici = setInterval(() => {
      setY((p) => {
        if (kelime.bittiMi(p.durum)) return p;

        const tick = Math.floor((Date.now() - baslangic) / TICK_MS);
        if (tick <= p.tick) return p;
        if (tick < p.durum.bitisTicki) return { ...p, tick };

        // Süre doldu: motora bir zaman işareti düşüyoruz (`k: ""`) ki
        // sunucu da aynı sonuca varsın. Ekranda "bitti" deyip kayda hiçbir
        // şey koymamak skoru sunucuda açık bırakırdı.
        const girdi: KelimeGirdisi = { tick, k: "" };
        const sonraki = kelime.uygula(p.durum, girdi);
        if (!sonraki) return { ...p, tick };
        return { durum: sonraki, girdiler: [...p.girdiler, girdi], tick };
      });
    }, TICK_MS);

    return () => clearInterval(zamanlayici);
  }, []);

  // ── Bitiş bildirimi ──────────────────────────────────
  // Güncelleyicinin içinde değil, ayrı efektte: `bitti` üst bileşende
  // durum değiştiriyor ve `setY`nin güncelleyicisi saf kalmalı.
  useEffect(() => {
    if (bildirildi.current || !kelime.bittiMi(y.durum)) return;
    bildirildi.current = true;
    bitti(y.girdiler, kelime.skor(y.durum));
  }, [y, bitti]);

  const harfeDokun = useCallback((i: number) => {
    setUyari(null);
    setSecim((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  }, []);

  const gonder = useCallback(() => {
    if (kurulan.length === 0) return;

    setSecim([]);

    // Kabul edilip edilmediğine bu render'ın durumundan karar veriliyor;
    // uyarı metni buna bağlı. ⚠️ Kararı `setY`nin güncelleyicisinden
    // okumaya çalışmak işe yaramaz: güncelleyici sonraki render'da
    // çalışıyor, buradaki kod ise hemen — bayrak her zaman eski değerde
    // kalırdı.
    if (!kelime.uygula(y.durum, { tick: y.tick, k: kurulan })) {
      // Motor tek bir `null` döndürüyor; sebebi burada ayrıştırıyoruz ki
      // oyuncuya ne olduğunu söyleyebilelim.
      setUyari(
        kurulan.length < 3
          ? "En az üç harf gerekiyor"
          : durum.bulunan.includes(kurulan)
            ? "Bu kelimeyi zaten buldun"
            : "Bu kelime listede yok",
      );
      return;
    }

    setUyari(null);
    // Yazma yine güncelleyicinin içinde ve orada **yeniden** hesaplanıyor:
    // sayaç bu arada turu bitirmiş olabilir.
    setY((p) => {
      const girdi: KelimeGirdisi = { tick: p.tick, k: kurulan };
      const sonraki = kelime.uygula(p.durum, girdi);
      if (!sonraki) return p;
      return { ...p, durum: sonraki, girdiler: [...p.girdiler, girdi] };
    });
  }, [y, durum, kurulan]);

  return (
    <div className="oyun-alani">
      <div className="flex items-baseline justify-between">
        <span className="etiket-caps text-yazi-sonuk">
          {durum.tur + 1}. tur · {durum.bulunan.length}/{durum.hedef}
        </span>
        <span className="font-data text-xl leading-none font-bold text-vurgu tabular">
          {durum.skor}
        </span>
      </div>

      {/* Süre şeridi — turun tek zorluk kolu bu, o yüzden en görünür yerde.
          Son beş saniyede renk değişiyor; sayı okumak yerine görmek yeterli. */}
      <Sure kalanTick={kalanTick} toplamTick={turSuresi(durum.tur)} />

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
        Bu harflerden {durum.olasi} kelime çıkıyor · toplam {durum.toplamKelime} buldun
      </p>

      {/* Demo ipucu — yalnızca geliştirmede. Oyunu tanıtan kişinin hangi
          kelimelerin kabul edildiğini bilmesi gerekiyor; yoksa rastgele
          deneyip "kabul etmiyor" izlenimi bırakıyor. */}
      {demoKapisi && <CevapIpucu harfler={durum.harfler} bulunan={durum.bulunan} />}
    </div>
  );
}

/* ── Süre şeridi ──────────────────────────────────────────── */

function Sure({ kalanTick, toplamTick }: { kalanTick: number; toplamTick: number }) {
  const yuzde = Math.max(0, Math.min(100, Math.round((kalanTick / toplamTick) * 100)));
  const saniye = Math.ceil(kalanTick / 20);
  const az = saniye <= 5;

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <span className="etiket-caps text-yazi-sonuk">Süre</span>
        <span
          className={`font-data text-[13px] font-bold tabular ${az ? "text-tehlike" : "text-yazi-sonuk"}`}
        >
          {saniye} sn
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-cukur">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${az ? "bg-tehlike" : "bg-vurgu"}`}
          style={{ width: `${yuzde}%` }}
        />
      </div>
    </div>
  );
}

/* ── Demo ipucu ───────────────────────────────────────────── */

/**
 * Kabul edilen kelimelerin listesi.
 *
 * Kapalı başlıyor: açık dursaydı oyunun kendisi anlamsızlaşırdı. Canlıda
 * hiç render edilmiyor — `demoKapisi` sunucudan geliyor ve orada hep false.
 */
function CevapIpucu({ harfler, bulunan }: { harfler: string[]; bulunan: string[] }) {
  const [acik, setAcik] = useState(false);
  const liste = useMemo(() => olasiKelimeler(harfler), [harfler]);
  const kalan = liste.filter((k) => !bulunan.includes(k));

  return (
    <div className="mt-3 rounded-lg border border-odul/50 bg-cukur px-3 py-2.5">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        className="etiket-caps w-full text-left text-odul-koyu"
      >
        Geliştirme · kabul edilen kelimeler ({kalan.length}) {acik ? "▾" : "▸"}
      </button>
      {acik && (
        <p className="mt-2 font-data text-[11px] leading-relaxed break-words text-yazi-sonuk">
          {kalan.join(" · ")}
        </p>
      )}
    </div>
  );
}
