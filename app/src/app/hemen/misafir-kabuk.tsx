"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { OyunEkrani } from "@/oyunlar/arayuz";
import {
  misafirBasla,
  misafirBitir,
  konumBildir,
  type BitirCevabi,
  type KonumCevabi,
} from "./actions";

/**
 * Misafir kabuğu — oyun seç, oyna, sonucu gör, hesabına geç (Ü35).
 *
 * `/oyna` kabuğuyla aynı iskelet ve **aynı** `OyunEkrani`. Ayrıldığı tek yer
 * sonuç ekranı: burada kazanım gösterilmiyor çünkü henüz yazılmadı. Onun
 * yerine talebin ne olduğu dürüstçe söyleniyor — "sonucun saklandı, hesabına
 * geçince işlenecek."
 */

export type Oyun = { id: string; ad: string; ozet: string; emoji: string; bolumSayisi: number };

type Durum =
  | { tur: "secim" }
  | { tur: "oynuyor"; oyun: Oyun; tohum: string; bolum: number }
  | { tur: "sonuc"; oyun: Oyun; bolum: number; cevap: BitirCevabi };

export function MisafirKabugu({
  oyunlar,
  kafeAdi,
  konumBaslangic,
}: {
  oyunlar: Oyun[];
  kafeAdi: string;
  /** Sunucunun çerezden okuduğu konum durumu — sayfa yenilense de kaybolmasın. */
  konumBaslangic: { dogrulandi: boolean; mesafeM: number | null } | null;
}) {
  const [durum, setDurum] = useState<Durum>({ tur: "secim" });
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();
  const [konum, setKonum] = useState(konumBaslangic);
  const [konumNotu, setKonumNotu] = useState<string | null>(null);

  const bolumBaslat = useCallback(
    (oyun: Oyun, bolum: number) => {
      setHata(null);
      basla(async () => {
        const cevap = await misafirBasla(oyun.id, bolum);
        if (!cevap.ok) {
          setHata(cevap.hata);
          return;
        }
        setDurum({ tur: "oynuyor", oyun, tohum: cevap.tohum, bolum });
      });
    },
    [],
  );

  const oyunBitti = useCallback(
    (oyun: Oyun, bolum: number) => (girdiler: unknown[], istemciSkoru: number) => {
      basla(async () => {
        const cevap = await misafirBitir(girdiler, istemciSkoru);
        setDurum({ tur: "sonuc", oyun, bolum, cevap });
      });
    },
    [],
  );

  const konumIste = useCallback(() => {
    if (!navigator.geolocation) {
      setKonumNotu("Bu tarayıcı konum vermiyor");
      return;
    }
    setKonumNotu("Konum alınıyor…");
    navigator.geolocation.getCurrentPosition(
      (p) =>
        basla(async () => {
          const c: KonumCevabi = await konumBildir(p.coords.latitude, p.coords.longitude);
          if (c.durum === "dogrulandi") {
            setKonum({ dogrulandi: true, mesafeM: c.mesafeM });
            setKonumNotu(null);
          } else if (c.durum === "uzak") {
            setKonum({ dogrulandi: false, mesafeM: c.mesafeM });
            setKonumNotu(`Kafeden ${c.mesafeM} metre uzaktasın`);
          } else if (c.durum === "kafe_konumu_yok") {
            setKonumNotu("Bu kafe konumunu henüz işaretlememiş — ödül açılamıyor");
          } else {
            setKonumNotu("Konum doğrulanamadı");
          }
        }),
      () => setKonumNotu("Konum izni verilmedi — ödül kilitli kalır"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  if (durum.tur === "oynuyor") {
    return (
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <span className="etiket-caps text-yazi-sonuk">
            {durum.oyun.ad} · {durum.bolum}. bölüm
          </span>
          <span className="etiket-caps text-odul-koyu">Misafir</span>
        </div>

        <OyunEkrani
          key={durum.tohum}
          oyunId={durum.oyun.id}
          tohum={durum.tohum}
          bolum={durum.bolum}
          bitti={oyunBitti(durum.oyun, durum.bolum)}
        />

        {bekliyor && (
          <p className="mt-5 text-center font-data text-[11px] text-yazi-sonuk nabiz">
            Sunucu skorunu doğruluyor…
          </p>
        )}
      </div>
    );
  }

  if (durum.tur === "sonuc") {
    return (
      <SonucEkrani
        oyun={durum.oyun}
        bolum={durum.bolum}
        cevap={durum.cevap}
        tekrar={() => bolumBaslat(durum.oyun, durum.bolum)}
        geri={() => setDurum({ tur: "secim" })}
      />
    );
  }

  return (
    <div>
      {hata && (
        <div className="mb-6 rounded-lg border border-tehlike/60 bg-yuzey px-4 py-3 text-[14px] text-tehlike">
          {hata}
        </div>
      )}

      <KonumSeridi
        kafeAdi={kafeAdi}
        konum={konum}
        not={konumNotu}
        bekliyor={bekliyor}
        iste={konumIste}
      />

      <h2 className="mt-8 mb-3 etiket-caps text-yazi-sonuk">Bir oyun seç</h2>

      <ul className="flex flex-col gap-2.5">
        {oyunlar.map((oyun) => (
          <li key={oyun.id}>
            <button
              type="button"
              disabled={bekliyor}
              onClick={() => bolumBaslat(oyun, 1)}
              className="flex w-full items-center gap-4 rounded-2xl border border-cizgi bg-yuzey px-5 py-4 text-left disabled:opacity-50"
            >
              <span aria-hidden className="text-2xl">
                {oyun.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-bold">{oyun.ad}</span>
                <span className="mt-0.5 block text-[13px] text-yazi-sonuk">{oyun.ozet}</span>
              </span>
              <span className="font-data text-vurgu">→</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-[13px] leading-relaxed text-yazi-sonuk">
        Hesabın zaten var mı?{" "}
        <Link href="/giris" className="text-vurgu underline">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}

/* ── Konum şeridi ─────────────────────────────────────────── */

/**
 * Konum kayıttan ÖNCE soruluyor.
 *
 * Ödülün açılma şartı K2 ve o kanıt oyunun oynandığı anda toplanmalı: sonradan
 * sorulan konum, oyunun kafede oynandığını söylemez. Reddetmek bir hata değil,
 * normal bir tercih — akış çökmüyor, yalnızca ödül kilitli kalıyor.
 */
function KonumSeridi({
  kafeAdi,
  konum,
  not,
  bekliyor,
  iste,
}: {
  kafeAdi: string;
  konum: { dogrulandi: boolean; mesafeM: number | null } | null;
  not: string | null;
  bekliyor: boolean;
  iste: () => void;
}) {
  const dogrulandi = !!konum?.dogrulandi;

  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        dogrulandi ? "border-vurgu bg-cukur" : "border-odul/60 bg-yuzey"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`size-2.5 shrink-0 rounded-full border ${
            dogrulandi ? "border-vurgu bg-vurgu" : "border-odul nabiz"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className={`etiket-caps ${dogrulandi ? "text-vurgu" : "text-odul-koyu"}`}>
            {dogrulandi ? "Konum doğrulandı" : "Ödül için konum gerekiyor"}
          </div>
          <div className="mt-0.5 text-[12px] leading-relaxed text-yazi-sonuk">
            {not ??
              (dogrulandi
                ? `${kafeAdi}${konum?.mesafeM != null ? ` · ${konum.mesafeM} m` : ""} — kazandığın ödül hesabına işlenecek`
                : "Doğrulamazsan oynayabilirsin ama ödül açılmaz")}
          </div>
        </div>
        {!dogrulandi && (
          <button
            type="button"
            onClick={iste}
            disabled={bekliyor}
            className="etiket-caps shrink-0 rounded border border-current px-3 py-1.5 text-odul-koyu disabled:opacity-50"
          >
            {bekliyor ? "…" : "Doğrula"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Sonuç ────────────────────────────────────────────────── */

function SonucEkrani({
  oyun,
  bolum,
  cevap,
  tekrar,
  geri,
}: {
  oyun: Oyun;
  bolum: number;
  cevap: BitirCevabi;
  tekrar: () => void;
  geri: () => void;
}) {
  if (!cevap.ok) {
    return (
      <div>
        <div className="rounded-2xl border border-odul bg-yuzey px-6 py-7">
          <h2 className="font-display text-2xl font-extrabold">Kayıt doğrulanamadı</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-yazi-sonuk">
            {cevap.hata}
            {cevap.reddedildi && " Bu oyunun sonucu geçersiz sayıldı. Yeniden dene."}
          </p>
        </div>
        <Dugmeler tekrar={tekrar} geri={geri} />
      </div>
    );
  }

  return (
    <div>
      <div
        className={`rounded-2xl border bg-yuzey px-6 py-7 ${
          cevap.basarili ? "border-vurgu" : "border-cizgi"
        }`}
      >
        <div className="etiket-caps text-yazi-sonuk">
          {oyun.ad} · {bolum}. bölüm
        </div>
        <h2 className="mt-2 font-display text-3xl leading-none font-extrabold">
          {cevap.basarili ? "Bölüm tamam" : "Bölüm bitti"}
        </h2>

        <div className="mt-6">
          <div className="etiket-caps text-yazi-sonuk">Skor</div>
          <div className="mt-1 font-data text-4xl leading-none font-bold text-vurgu tabular">
            {cevap.skor.toLocaleString("tr-TR")}
          </div>
          <div className="mt-1.5 font-data text-[9px] text-yazi-sonuk">sunucuda doğrulandı</div>
        </div>
      </div>

      {/*
        Buradaki söz dikkatle kuruluyor: ödül HENÜZ YOK. Sunucu yalnızca
        sonucu imzalayıp sakladı; gerçek satır ve gerçek ödül hesap açıldığı
        anda, normal kurallardan geçerek üretilecek. Fazlasını vaat etmek,
        oyuncuyu kaydolduktan sonra hayal kırıklığına uğratırdı.
      */}
      <div className="mt-4 rounded-2xl border border-odul bg-cukur px-5 py-5">
        <div className="etiket-caps text-odul-koyu">🎟️ Sonucun saklandı</div>
        <p className="mt-2 text-[14px] leading-relaxed text-yazi-sonuk">
          {cevap.basarili && cevap.k2
            ? "Hesabına girdiğin anda bu oyun hesabına işlenecek: puan, XP ve varsa ödül birlikte gelecek."
            : cevap.basarili
              ? "Hesabına girdiğin anda bu oyun hesabına işlenecek. Konumun doğrulanmadığı için puan ve ödül açılmayacak — istersen geri dönüp konumunu doğrula ve tekrar oyna."
              : "Hesabına girdiğin anda bu oyun hesabına işlenecek. Puan bölümü tamamlayınca yazılıyor; tekrar denemek istersen sonucun yenisiyle değişir."}
        </p>
        <Link
          href="/giris"
          className="mt-4 block rounded-lg bg-vurgu px-5 py-4 text-center font-display text-[16px] font-bold text-white"
        >
          Ödülünü almak için hesabına gir
        </Link>
        <p className="mt-2.5 text-center font-data text-[10px] tracking-wide text-yazi-sonuk">
          Sonucun 30 dakika saklanıyor
        </p>
      </div>

      <Dugmeler tekrar={tekrar} geri={geri} />
    </div>
  );
}

function Dugmeler({ tekrar, geri }: { tekrar: () => void; geri: () => void }) {
  return (
    <div className="mt-6 flex flex-col gap-2.5">
      <button
        type="button"
        onClick={tekrar}
        className="rounded-lg border border-cizgi py-4 font-display text-[16px] text-yazi"
      >
        Tekrar oyna
      </button>
      <button type="button" onClick={geri} className="py-2 text-[14px] text-yazi-sonuk underline">
        Oyunlara dön
      </button>
    </div>
  );
}
