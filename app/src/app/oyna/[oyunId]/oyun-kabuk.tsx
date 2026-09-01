"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { OyunEkrani } from "@/oyunlar/arayuz";
import { baslaEylemi, bitirEylemi, type BitirCevabi } from "./actions";

/**
 * Oyun kabuğu — bölüm seç, oyna, sonucu gör.
 *
 * Kabuk **hangi oyunu gösterdiğini bilmiyor**: `ekranBul` ile bileşeni
 * alıyor, tohumu ve bölümü veriyor, girdi kaydını geri alıyor. Üç oyun da
 * bu kabuğun içinde çalışıyor ve kabuk hiçbirinin kurallarını tanımıyor.
 *
 * Tohum **sunucudan** geliyor. İstemci tohum seçebilseydi, kolay dizi veren
 * tohumu arayıp her seferinde onu oynardı.
 */

type Ayar = {
  oyunId: string;
  ad: string;
  ozet: string;
  emoji: string;
  bolumSayisi: number;
  /** Doğrulanmış masa oturumu var mı — kazanım buna bağlı (Ü3). */
  kazandirir: boolean;
  bonusMu: boolean;
  cafeAdi: string | null;
  /** Demo ipuçları görünsün mü — canlıda hep false. */
  demoKapisi?: boolean;
  /**
   * Sayfa açılır açılmaz 1. bölüm başlasın mı.
   *
   * Ana ekrandaki "Oyna" düğmesi oyunu açtığını söylüyordu ama bölüm
   * listesine düşürüyordu; tek dokunuşla oynanması gereken yerde iki adım
   * vardı. Liste hâlâ duruyor — "Bölümlere dön" ile ulaşılıyor.
   */
  hemenBasla?: boolean;
};

type Durum =
  | { tur: "secim" }
  | { tur: "oynuyor"; oturumId: string; tohum: string; bolum: number }
  | { tur: "sonuc"; bolum: number; cevap: BitirCevabi };

export function OyunKabugu(ayar: Ayar) {
  const [durum, setDurum] = useState<Durum>({ tur: "secim" });
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();
  const otomatikBasladi = useRef(false);

  const bolumBaslat = useCallback(
    (bolum: number) => {
      setHata(null);
      basla(async () => {
        const cevap = await baslaEylemi(ayar.oyunId, bolum);
        if (!cevap.ok) {
          setHata(cevap.hata);
          return;
        }
        setDurum({ tur: "oynuyor", oturumId: cevap.oturumId, tohum: cevap.tohum, bolum });
      });
    },
    [ayar.oyunId],
  );

  const oyunBitti = useCallback(
    (oturumId: string, bolum: number) => (girdiler: unknown[], istemciSkoru: number) => {
      basla(async () => {
        const cevap = await bitirEylemi(oturumId, girdiler, istemciSkoru);
        setDurum({ tur: "sonuc", bolum, cevap });
      });
    },
    [],
  );

  // "Oyna" düğmesi tek dokunuşta oynatmalı. Bir kez çalışıyor: oyuncu
  // bölümlere döndüğünde yeniden tetiklenip listeyi ele geçirmesin.
  useEffect(() => {
    if (!ayar.hemenBasla || otomatikBasladi.current) return;
    otomatikBasladi.current = true;
    bolumBaslat(1);
  }, [ayar.hemenBasla, bolumBaslat]);

  if (durum.tur === "oynuyor") {
    return (
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <span className="etiket-caps text-yazi-sonuk">
            {ayar.ad} · {durum.bolum}. bölüm
          </span>
          {!ayar.kazandirir && (
            <span className="etiket-caps text-odul-koyu">
              Kazandırmaz
            </span>
          )}
        </div>

        <OyunEkrani
          key={durum.oturumId}
          oyunId={ayar.oyunId}
          tohum={durum.tohum}
          bolum={durum.bolum}
          demoKapisi={ayar.demoKapisi}
          bitti={oyunBitti(durum.oturumId, durum.bolum)}
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
        ayar={ayar}
        bolum={durum.bolum}
        cevap={durum.cevap}
        tekrar={() => bolumBaslat(durum.bolum)}
        sonraki={
          durum.bolum < ayar.bolumSayisi ? () => bolumBaslat(durum.bolum + 1) : undefined
        }
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

      {!ayar.kazandirir && (
        <div className="mb-6 border-l-2 border-odul pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
          {ayar.cafeAdi
            ? "Konumun doğrulanmadığı için bu oyunlar puan ve XP kazandırmaz. Ana ekrandaki şeritten doğrulayabilirsin."
            : "Kafe dışındasın: oynayabilirsin ama puan, XP ve kupon kazanamazsın."}
        </div>
      )}

      {ayar.bonusMu && ayar.kazandirir && (
        <div className="mb-6 rounded-lg border border-odul/50 bg-cukur px-4 py-3">
          <span className="etiket-caps text-odul-koyu">
            Bugünün oyunu · ×2 puan
          </span>
        </div>
      )}

      <h2 className="mb-3 etiket-caps text-yazi-sonuk">
        Bölümler
      </h2>

      <ul className="flex flex-col gap-2.5">
        {Array.from({ length: ayar.bolumSayisi }, (_, i) => i + 1).map((bolum) => (
          <li key={bolum}>
            <button
              type="button"
              disabled={bekliyor}
              onClick={() => bolumBaslat(bolum)}
              className="flex w-full items-center justify-between rounded-2xl border border-cizgi bg-yuzey px-5 py-4 text-left disabled:opacity-50"
            >
              <span>
                <span className="block font-display text-lg font-bold">{bolum}. bölüm</span>
                <span className="mt-0.5 block text-[13px] text-yazi-sonuk">{ayar.ozet}</span>
              </span>
              <span className="font-data text-vurgu">→</span>
            </button>
          </li>
        ))}
      </ul>

      <Link href="/oyna" className="mt-8 inline-block text-[14px] text-vurgu underline">
        Ana ekrana dön
      </Link>
    </div>
  );
}

/* ── Sonuç ─────────────────────────────────────────────── */

function SonucEkrani({
  ayar,
  bolum,
  cevap,
  tekrar,
  sonraki,
  geri,
}: {
  ayar: Ayar;
  bolum: number;
  cevap: BitirCevabi;
  tekrar: () => void;
  sonraki?: () => void;
  geri: () => void;
}) {
  if (!cevap.ok) {
    return (
      <div>
        <div className="rounded-2xl border border-odul bg-yuzey px-6 py-7">
          <h2 className="font-display text-2xl font-extrabold">Kayıt doğrulanamadı</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-yazi-sonuk">
            {cevap.hata}
            {cevap.reddedildi && (
              <>
                {" "}
                Bu oyunun sonucu geçersiz sayıldı ve puan yazılmadı. Bağlantın koptuysa
                yeniden dene.
              </>
            )}
          </p>
        </div>
        <Dugmeler tekrar={tekrar} geri={geri} />
      </div>
    );
  }

  const { skor, basarili, puan, esik, xp, kazandirir, yeniRozetler, kupon, taht } = cevap;

  return (
    <div>
      <div
        className={`rounded-2xl border bg-yuzey px-6 py-7 ${
          basarili ? "border-vurgu" : "border-cizgi"
        }`}
      >
        <div className="etiket-caps text-yazi-sonuk">
          {ayar.ad} · {bolum}. bölüm
        </div>
        <h2 className="mt-2 font-display text-3xl leading-none font-extrabold">
          {basarili ? "Bölüm tamam" : "Bölüm bitti"}
        </h2>

        <div className="mt-6">
          <div className="etiket-caps text-yazi-sonuk">
            Skor
          </div>
          <div className="mt-1 font-data text-4xl leading-none font-bold text-vurgu tabular">
            {skor.toLocaleString("tr-TR")}
          </div>
          <div className="mt-1.5 font-data text-[9px] text-yazi-sonuk">
            sunucuda doğrulandı
          </div>
        </div>
      </div>

      {/* ── Kazanım ────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-2.5">
        {!kazandirir ? (
          <Satir
            baslik="Kazanım yok"
            aciklama="Puan ve XP yalnızca bir CafePlay kafesinde, konumun doğrulandığında kazanılır."
          />
        ) : (
          <>
            {/* Ü48: bölüm bitmese de puan yazılıyor. Eski ekran burada
                "Kazanım yok" diyordu ve ilk kez oynayan, ilk denemesinde
                eli boş çıkıyordu. */}
            <Satir
              baslik={`+${(puan?.yazilan ?? 0).toLocaleString("tr-TR")} puan`}
              aciklama={
                puan && puan.kesilen > 0
                  ? `Günlük 900 puan sınırına ulaştın; ${puan.kesilen.toLocaleString("tr-TR")} puan yazılmadı. Oynamaya devam edebilirsin, XP birikiyor.`
                  : basarili
                    ? "Bu kafede harcanabilir."
                    : "Bölümü bitirmedin ama denemenin de karşılığı var. Bitirirsen çok daha fazlası."
              }
              vurgu
            />

            {esik && esik.puan.yazilan > 0 && (
              <Satir
                baslik={`+${esik.puan.yazilan.toLocaleString("tr-TR")} puan · skor bonusu`}
                aciklama={`${esik.skor.toLocaleString("tr-TR")} skoru geçtin.`}
                vurgu
              />
            )}

            <Satir
              baslik={`+${xp} XP`}
              aciklama="Seviyen bu kafede ilerledi. XP harcanmaz."
              vurgu
            />
          </>
        )}

        {/* E2: anlık ödül. Oyuncuya ödülün ADI söyleniyor, TL değeri değil (E9). */}
        {kupon && (
          <Link
            href="/oduller"
            className="block rounded-2xl border border-odul bg-cukur px-4 py-4 transition-colors hover:border-odul/70"
          >
            <div className="etiket-caps text-odul-koyu">
              🎟️ Ödül kazandın
            </div>
            <div className="mt-1.5 font-display text-lg font-bold">{kupon.baslik}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-yazi-sonuk">
              {kupon.ertelendi
                ? "24 saat sonra açılıyor. Ödüllerim ekranından takip edebilirsin."
                : "Ödüllerim ekranından kasada gösterebilirsin."}
            </p>
          </Link>
        )}

        {/* Ö1: taht statüden ibaret — puan, kupon veya çarpan vermiyor.
            Satır bu yüzden bir kazanım değil, bir haber. */}
        {taht?.devirdi && (
          <Satir
            baslik={taht.eskiSkor === null ? "Tahta oturdun" : "Tahtı devirdin"}
            aciklama={
              taht.eskiSkor === null
                ? "Bu masada ilk skoru sen yazdın. Devrilene kadar kral sensin."
                : `Önceki kral ${taht.eskiSkor.toLocaleString("tr-TR")} yapmıştı. Adın bu masada kalıyor.`
            }
            vurgu
          />
        )}

        {yeniRozetler.length > 0 && (
          <Satir
            baslik={`${yeniRozetler.length} yeni rozet`}
            aciklama="Profilinde görebilirsin."
            vurgu
          />
        )}
      </div>

      <Dugmeler tekrar={tekrar} sonraki={basarili ? sonraki : undefined} geri={geri} />
    </div>
  );
}

function Satir({
  baslik,
  aciklama,
  vurgu,
}: {
  baslik: string;
  aciklama: string;
  vurgu?: boolean;
}) {
  return (
    <div className="rounded-lg border border-cizgi bg-cukur px-4 py-3.5">
      <div
        className={`font-display text-[16px] font-bold ${vurgu ? "text-odul-koyu" : "text-yazi-sonuk"}`}
      >
        {baslik}
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-yazi-sonuk">{aciklama}</p>
    </div>
  );
}

function Dugmeler({
  tekrar,
  sonraki,
  geri,
}: {
  tekrar: () => void;
  sonraki?: () => void;
  geri: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-2.5">
      {sonraki && (
        <button
          type="button"
          onClick={sonraki}
          className="rounded-lg bg-vurgu py-4 font-display text-[16px] font-bold text-white"
        >
          Sonraki bölüm
        </button>
      )}
      <button
        type="button"
        onClick={tekrar}
        className="rounded-lg border border-cizgi py-4 font-display text-[16px] text-yazi"
      >
        Tekrar oyna
      </button>
      <button type="button" onClick={geri} className="py-2 text-[14px] text-yazi-sonuk underline">
        Bölümlere dön
      </button>
    </div>
  );
}
