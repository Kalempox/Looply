"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { OyunEkrani } from "@/oyunlar/arayuz";
import { ArkaCizim } from "@/components/oyuncu";
import { RENK, oyunRengi, kartZemin } from "@/components/oyuncu-renk";
import { oyunGorseli } from "@/components/oyuncu-gorsel";
import { OyunIkonu, HediyeIkonu, TacIkonu } from "@/components/oyuncu-ikon";
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
 *
 * ── Renk oyunun kendi rengi (Ü65) ───────────────────────────
 *
 * Ü64'te kabuğun iki ekranı da koyu mordu ve üç oyun birbirinden
 * ayırt edilemiyordu. Şimdi her oyun kendi renginde — Blok gök, Kelime
 * menekşe, Düşen gül — ve bu renk ana ekrandaki karodan başlayıp oyun
 * sonu ekranına kadar sürüyor.
 *
 * Aradaki **oyun alanı** renklenmiyor: oyunun kendi görünümü var ve
 * kabuk onun üstüne renk basmıyor.
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
  const r = RENK[oyunRengi(ayar.oyunId)];

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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{ background: r.zemin }}
          >
            <OyunIkonu oyunId={ayar.oyunId} boy={16} />
            <span className="etiket-caps" style={{ color: r.koyu }}>
              {ayar.ad} · {durum.bolum}. bölüm
            </span>
          </h1>
          {!ayar.kazandirir && (
            <span className="etiket-caps text-odul-koyu">Kazandırmaz</span>
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

      {/* Uyarı renkli kartın ÜSTÜNDE: altına konsaydı oyuncu bölüme
          dokunduktan sonra okurdu. */}
      {!ayar.kazandirir && (
        <div className="mb-5 border-l-2 border-odul pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
          {ayar.cafeAdi
            ? "Konumun doğrulanmadığı için bu oyunlar puan ve XP kazandırmaz. Ana ekrandaki şeritten doğrulayabilirsin."
            : "Kafe dışındasın: oynayabilirsin ama puan, XP ve kupon kazanamazsın."}
        </div>
      )}

      <div
        className="relative overflow-hidden rounded-3xl px-5 py-6"
        style={{ background: kartZemin(oyunRengi(ayar.oyunId)), border: `1px solid ${r.canli}` }}
      >
        <ArkaCizim renk={oyunRengi(ayar.oyunId)} gorsel={oyunGorseli(ayar.oyunId)} />

        <div className="relative flex items-start gap-3.5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-yuzey shadow-sm">
            <OyunIkonu oyunId={ayar.oyunId} boy={34} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl leading-tight font-extrabold tracking-tight">
              {ayar.ad}
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: r.koyu }}>
              {ayar.ozet}
            </p>
          </div>
        </div>

        {ayar.bonusMu && ayar.kazandirir && (
          <div className="relative mt-4 inline-block rounded-full border border-odul bg-yuzey px-3 py-1 etiket-caps text-[10px] text-odul-koyu">
            Bugünün oyunu · ×2 puan
          </div>
        )}

        <div className="relative mt-6">
          <div className="etiket-caps" style={{ color: r.koyu }}>
            Bölüm seç
          </div>
          <ul className="mt-2.5 grid grid-cols-3 gap-2.5">
            {Array.from({ length: ayar.bolumSayisi }, (_, i) => i + 1).map((bolum) => (
              <li key={bolum}>
                <BolumKutusu
                  bolum={bolum}
                  bekliyor={bekliyor}
                  oyunId={ayar.oyunId}
                  onSec={() => bolumBaslat(bolum)}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Tek bölüm kutusu.
 *
 * Eskiden her bölüm tam genişlikte bir satırdı ve altında oyunun özeti
 * tekrar ediyordu — beş bölümde aynı cümle beş kez. Özet artık tek
 * yerde, başlıkta; bölümler kare kutulara indi ve hepsi tek bakışta
 * görünüyor.
 *
 * Bölümler kilitli değil: oyuncu istediğinden başlayabiliyor. Kilit
 * koymak sırayla ilerlemeyi zorunlu kılardı ve kafede on beş dakikası
 * olan birine göre bir ürün değil bu.
 */
function BolumKutusu({
  bolum,
  bekliyor,
  oyunId,
  onSec,
}: {
  bolum: number;
  bekliyor: boolean;
  oyunId: string;
  onSec: () => void;
}) {
  const r = RENK[oyunRengi(oyunId)];

  return (
    <button
      type="button"
      disabled={bekliyor}
      onClick={onSec}
      className="flex aspect-square w-full flex-col items-center justify-center rounded-2xl bg-yuzey shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 disabled:opacity-40"
      style={{ border: `1px solid ${r.canli}` }}
    >
      <span className="font-data text-2xl leading-none font-bold tabular" style={{ color: r.ana }}>
        {bolum}
      </span>
      <span className="mt-1 etiket-caps text-[9px] text-yazi-sonuk">bölüm</span>
    </button>
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
        <div className="rounded-2xl border border-tehlike/60 bg-yuzey px-6 py-7">
          <h1 className="font-display text-2xl font-extrabold">Kayıt doğrulanamadı</h1>
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
        <Dugmeler tekrar={tekrar} geri={geri} oyunId={ayar.oyunId} />
      </div>
    );
  }

  const { skor, basarili, puan, esik, seri, xp, kazandirir, yeniRozetler, kupon, taht } = cevap;

  /*
   * Kazanım satırları önce diziye toplanıyor, sonra çiziliyor.
   *
   * Sebebi giriş animasyonunun **kademesi**: her satır bir öncekinden
   * 90 ms sonra beliriyor ve bunun için satırın kaçıncı olduğunu bilmek
   * gerek. JSX'in içine serpiştirilmiş koşullarla bu sayı bilinmiyordu.
   */
  const satirlar: { baslik: string; aciklama: string; vurgu?: boolean }[] = [];

  if (!kazandirir) {
    satirlar.push({
      baslik: "Kazanım yok",
      aciklama:
        "Puan ve XP yalnızca bir CafePlay kafesinde, konumun doğrulandığında kazanılır.",
    });
  } else {
    // Ü48: bölüm bitmese de puan yazılıyor. Eski ekran burada "Kazanım
    // yok" diyordu ve ilk kez oynayan, ilk denemesinde eli boş çıkıyordu.
    satirlar.push({
      baslik: `+${(puan?.yazilan ?? 0).toLocaleString("tr-TR")} puan`,
      aciklama:
        puan && puan.kesilen > 0
          ? `Günlük 900 puan sınırına ulaştın; ${puan.kesilen.toLocaleString("tr-TR")} puan yazılmadı. Oynamaya devam edebilirsin, XP birikiyor.`
          : basarili
            ? "Bu kafede harcanabilir."
            : "Bölümü bitirmedin ama denemenin de karşılığı var. Bitirirsen çok daha fazlası.",
      vurgu: true,
    });

    if (esik && esik.puan.yazilan > 0) {
      satirlar.push({
        baslik: `+${esik.puan.yazilan.toLocaleString("tr-TR")} puan · skor bonusu`,
        aciklama: `${esik.skor.toLocaleString("tr-TR")} skoru geçtin.`,
        vurgu: true,
      });
    }

    // Ü54: günlük seri. Gün sayısı burada söyleniyor çünkü oyuncunun
    // seriyi fark ettiği tek an bu — ana ekrandaki kart onu ancak ertesi
    // gün hatırlatıyor.
    if (seri && seri.puan.yazilan > 0) {
      satirlar.push({
        baslik: `+${seri.puan.yazilan.toLocaleString("tr-TR")} puan · ${seri.gun} günlük seri`,
        aciklama: "Yarın da gelirsen seri büyür. Bir gün atlarsan sıfırlanır.",
        vurgu: true,
      });
    }

    satirlar.push({
      baslik: `+${xp} XP`,
      aciklama: "Seviyen bu kafede ilerledi. XP harcanmaz.",
      vurgu: true,
    });
  }

  if (yeniRozetler.length > 0) {
    satirlar.push({
      baslik: `${yeniRozetler.length} yeni rozet`,
      aciklama: "Profilinde görebilirsin.",
      vurgu: true,
    });
  }

  const r = RENK[oyunRengi(ayar.oyunId)];

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-3xl px-5 py-6"
        style={{ background: kartZemin(oyunRengi(ayar.oyunId)), border: `1px solid ${r.canli}` }}
      >
        <ArkaCizim renk={oyunRengi(ayar.oyunId)} gorsel={oyunGorseli(ayar.oyunId)} />

        <div className="relative flex items-center gap-2">
          <OyunIkonu oyunId={ayar.oyunId} boy={16} />
          <span className="etiket-caps" style={{ color: r.koyu }}>
            {ayar.ad} · {bolum}. bölüm
          </span>
        </div>
        <h1 className="relative mt-1.5 font-display text-3xl leading-none font-extrabold tracking-tight">
          {basarili ? "Bölüm tamam" : "Bölüm bitti"}
        </h1>

        {/* Skor tek başına ortada: ekranın tek büyük sayısı o. */}
        <div className="relative mt-6 text-center">
          <div className="etiket-caps text-yazi-sonuk">Skor</div>
          <div
            className="patla mt-1 font-data text-6xl leading-none font-bold tabular"
            style={{ color: basarili ? r.ana : "var(--color-yazi)" }}
          >
            {skor.toLocaleString("tr-TR")}
          </div>
          <div className="mt-2 font-data text-[9px] text-yazi-sonuk">sunucuda doğrulandı</div>
        </div>

        <div className="relative mt-6 flex flex-col gap-2">
          {/* Ö1: taht statüden ibaret — puan, kupon veya çarpan
              vermiyor. Ama ekranın en gurur verici satırı o, bu yüzden
              diğer kazanımların üstünde ve tek başına duruyor. */}
          {taht?.devirdi && (
            <div
              className="gir flex items-center gap-3 rounded-2xl bg-yuzey px-4 py-3.5 shadow-sm"
              style={{ animationDelay: "100ms", border: "1px solid var(--color-odul)" }}
            >
              <TacIkonu boy={30} />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[16px] leading-tight font-bold text-odul-koyu">
                  {taht.eskiSkor === null ? "Tahta oturdun" : "Tahtı devirdin"}
                </span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-yazi-sonuk">
                  {taht.eskiSkor === null
                    ? "Bu masada ilk skoru sen yazdın. Devrilene kadar kral sensin."
                    : `Önceki kral ${taht.eskiSkor.toLocaleString("tr-TR")} yapmıştı. Adın bu masada kalıyor.`}
                </span>
              </span>
            </div>
          )}

          {satirlar.map((s, i) => (
            <KazanimSatiri key={s.baslik} {...s} renk={r.ana} gecikme={190 + i * 90} />
          ))}

          {/* E2: anlık ödül. Oyuncuya ödülün ADI söyleniyor, TL değeri
              değil (E9). Kupon en sonda ve en görünür: bu ekranda
              kazanılan başka her şey puan, bu ise kasada gösterilecek
              gerçek bir şey. */}
          {kupon && (
            <Link
              href="/oduller"
              className="gir flex items-center gap-3 rounded-2xl bg-odul-zemin px-4 py-4 transition-colors hover:brightness-95"
              style={{
                animationDelay: `${190 + satirlar.length * 90}ms`,
                border: "1px solid var(--color-odul)",
              }}
            >
              <HediyeIkonu boy={36} />
              <span className="min-w-0 flex-1">
                <span className="block etiket-caps text-odul-koyu">Ödül kazandın</span>
                <span className="mt-1 block font-display text-lg leading-tight font-bold">
                  {kupon.baslik}
                </span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-yazi-sonuk">
                  {kupon.ertelendi
                    ? "24 saat sonra açılıyor. Ödüllerim ekranından takip edebilirsin."
                    : "Ödüllerim ekranından kasada gösterebilirsin."}
                </span>
              </span>
            </Link>
          )}
        </div>
      </div>

      <Dugmeler
        tekrar={tekrar}
        sonraki={basarili ? sonraki : undefined}
        geri={geri}
        oyunId={ayar.oyunId}
      />
    </div>
  );
}

function KazanimSatiri({
  baslik,
  aciklama,
  vurgu,
  renk,
  gecikme,
}: {
  baslik: string;
  aciklama: string;
  vurgu?: boolean;
  renk: string;
  gecikme: number;
}) {
  return (
    <div
      className="gir rounded-2xl bg-yuzey px-4 py-3 shadow-sm"
      style={{ animationDelay: `${gecikme}ms` }}
    >
      <div
        className="font-display text-[16px] leading-tight font-bold"
        style={{ color: vurgu ? renk : "var(--color-yazi-sonuk)" }}
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
  oyunId,
}: {
  tekrar: () => void;
  sonraki?: () => void;
  geri: () => void;
  oyunId: string;
}) {
  const r = RENK[oyunRengi(oyunId)];

  return (
    <div className="mt-6 flex flex-col gap-2.5">
      {sonraki && (
        <button
          type="button"
          onClick={sonraki}
          className="rounded-xl py-4 font-display text-[16px] font-bold text-white transition-transform active:scale-[0.99]"
          style={{ background: r.ana }}
        >
          Sonraki bölüm
        </button>
      )}
      <button
        type="button"
        onClick={tekrar}
        className="rounded-xl border border-cizgi py-4 font-display text-[16px] text-yazi"
      >
        Tekrar oyna
      </button>
      <button type="button" onClick={geri} className="py-2 text-[14px] text-yazi-sonuk underline">
        Bölümlere dön
      </button>
    </div>
  );
}
