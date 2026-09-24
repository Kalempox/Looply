"use client";

import { beklemeMetni } from "@/domain/bekleme-metni";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { OyunEkrani } from "@/oyunlar/arayuz";
import { BiletYuzeyi } from "@/components/oyuncu";
import { OyunSahnesi, sahneVarMi } from "@/components/oyun-sahnesi";
import { RENK, oyunRengi } from "@/components/oyuncu-renk";
import { OyunIkonu, HediyeIkonu, TacIkonu } from "@/components/oyuncu-ikon";
import { Gorsel, oyunGorseli } from "@/components/oyuncu-gorsel";
import { SeviyeKutlamasi } from "@/components/seviye-kutlamasi";
import { SeviyeSahnesi } from "@/components/seviye-sahnesi";
import { RozetKutlamasi } from "@/components/rozet-kutlamasi";
import { baslaEylemi, bitirEylemi, type BitirCevabi, teklifAlEylemi } from "./actions";

/**
 * Oyun kabuğu — oyna, sonucu gör.
 *
 * Kabuk **hangi oyunu gösterdiğini bilmiyor**: `ekranBul` ile bileşeni
 * alıyor, tohumu veriyor, girdi kaydını geri alıyor. Üç oyun da
 * bu kabuğun içinde çalışıyor ve kabuk hiçbirinin kurallarını tanımıyor.
 *
 * Tohum **sunucudan** geliyor. İstemci tohum seçebilseydi, kolay dizi veren
 * tohumu arayıp her seferinde onu oynardı.
 *
 * ── Renk oyunun kendi rengi (Ü65) ───────────────────────────
 *
 * Ü64'te kabuğun iki ekranı da koyu mordu ve oyunlar birbirinden
 * ayırt edilemiyordu. Şimdi her oyun kendi renginde — Blok gök, Düşen
 * pembe, Yılan yeşil — ve bu renk ana ekrandaki karodan başlayıp oyun
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

  /** Doğrulanmış masa oturumu var mı — kazanım buna bağlı (Ü3). */
  kazandirir: boolean;
  bonusMu: boolean;
  cafeAdi: string | null;
  /**
   * Kupon eşiği (Ü83) — sonuç ekranındaki cümle bunu söylüyor.
   *
   * ⚠️ Prop olarak geliyor, `@/domain/puan`dan import edilmiyor: o modül
   * `withPlayer` üzerinden `pg` sürücüsünü çekiyor ve bir istemci
   * bileşeninden import edilirse sayfa `Can't resolve 'dns'` ile 500
   * dönüyor. Aynı hata Ü75'te yaşandı.
   */
  kuponEsigi: number;
  /** Demo ipuçları görünsün mü — canlıda hep false. */
  demoKapisi?: boolean;
  /**
   * Sayfa açılır açılmaz tur başlasın mı.
   *
   * Ana ekrandaki "Oyna" düğmesi oyunu açtığını söylüyordu ama araya bir
   * tanıtım ekranı giriyordu; tek dokunuşla oynanması gereken yerde iki
   * adım vardı.
   */
  hemenBasla?: boolean;
};

type Durum =
  | { tur: "secim" }
  | { tur: "oynuyor"; oturumId: string; tohum: string }
  | { tur: "sonuc"; cevap: BitirCevabi };

export function OyunKabugu(ayar: Ayar) {
  const [durum, setDurum] = useState<Durum>({ tur: "secim" });
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();
  const router = useRouter();
  const otomatikBasladi = useRef(false);
  const r = RENK[oyunRengi(ayar.oyunId)];

  const turBaslat = useCallback(() => {
    setHata(null);
    basla(async () => {
      const cevap = await baslaEylemi(ayar.oyunId);
      if (!cevap.ok) {
        setHata(cevap.hata);
        return;
      }
      setDurum({ tur: "oynuyor", oturumId: cevap.oturumId, tohum: cevap.tohum });
    });
  }, [ayar.oyunId]);

  const oyunBitti = useCallback(
    (oturumId: string) => (girdiler: unknown[], istemciSkoru: number) => {
      basla(async () => {
        const cevap = await bitirEylemi(oturumId, girdiler, istemciSkoru);
        setDurum({ tur: "sonuc", cevap });
      });
    },
    [],
  );

  // "Oyna" düğmesi tek dokunuşta oynatmalı. Bir kez çalışıyor: oyuncu
  // tanıtım ekranına döndüğünde yeniden tetiklenip ekranı ele geçirmesin.
  useEffect(() => {
    if (!ayar.hemenBasla || otomatikBasladi.current) return;
    otomatikBasladi.current = true;
    turBaslat();
  }, [ayar.hemenBasla, turBaslat]);

  /*
    🔴 Ü274: oynarken sayfa KAYMIYOR ve aşağı çekince YENİLENMİYOR.

    Ürün sahibi: "parmağımla kaydırırken oynarken sayfa da yukarı kayıyor
    ve sayfa yenileniyor gibi oluyor." `touch-action: none` yalnızca oyun
    tahtasındaydı; nişan alırken parmak tahtanın dışına taşınca sayfa
    sürükleniyor, en üstteyse iOS "aşağı çek, yenile" hareketini
    başlatıyordu.

    Tur boyunca sayfa sabitleniyor (`position: fixed` — iOS'ta
    `overflow: hidden` tek başına yetmiyor) ve belgedeki dokunma
    kaydırması iptal ediliyor. Oyunlar işaretçi (pointer) olaylarını
    dinliyor; `touchmove`u iptal etmek onları etkilemiyor, yalnızca
    tarayıcının kaydırmasını durduruyor. Tur bitince her şey eski
    hâline ve sayfa aynı yere dönüyor.
  */
  useEffect(() => {
    if (durum.tur !== "oynuyor") return;
    const html = document.documentElement;
    const body = document.body;
    const y = window.scrollY;
    const onceki = {
      overflow: html.style.overflow,
      overscroll: html.style.overscrollBehavior,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    const kaydirmaYok = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener("touchmove", kaydirmaYok, { passive: false });
    return () => {
      document.removeEventListener("touchmove", kaydirmaYok);
      html.style.overflow = onceki.overflow;
      html.style.overscrollBehavior = onceki.overscroll;
      body.style.position = onceki.position;
      body.style.top = onceki.top;
      body.style.width = onceki.width;
      window.scrollTo(0, y);
    };
  }, [durum.tur]);

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
              {ayar.ad}
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
          demoKapisi={ayar.demoKapisi}
          kazandirir={ayar.kazandirir}
          /* Ü203: tam ekran oyunda sayfanın geri bağlantısı görünmüyor;
             çıkış oyuncuyu katalog karuseline götürüyor. */
          cik={() => router.push("/oyunlar")}
          bitti={oyunBitti(durum.oturumId)}
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
        cevap={durum.cevap}
        tekrar={turBaslat}
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

      {/* Uyarı renkli kartın ÜSTÜNDE: altına konsaydı oyuncu oyuna
          dokunduktan sonra okurdu. */}
      {!ayar.kazandirir && (
        <div className="mb-5 border-l-2 border-odul pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
          {ayar.cafeAdi
            ? "Konumun doğrulanmadığı için bu oyunlar puan ve XP kazandırmaz. Ana ekrandaki şeritten doğrulayabilirsin."
            : "Kafe dışındasın: oynayabilirsin ama puan, XP ve kupon kazanamazsın."}
        </div>
      )}

      {/*
        🔴 Ü191: kart pastelden KOYU BİLETE geçti.

        Ü71'de (Ağustos) bütün kartlar `kartStili()` ile pastel yapılmıştı.
        Ü171–Ü190 arasında ana ekran, katalog, profil ve Ödüllerim koyu
        bilet ailesine taşındı; bu iki kart (tanıtım ve sonuç) geride
        kaldı. Sonuç: oyuncu katalogdan KOYU bir karta basıyor, açılan
        ekranda PASTEL bir kart buluyordu — aynı yolculukta iki dil.

        ⚠️ Ürünün en çok bakılan iki kartı burası; en son taşınmaları
        sıralama hatasıydı, tercih değil.
      */}
      <BiletYuzeyi renk={oyunRengi(ayar.oyunId)} className="px-5 py-6">
        {/* Sahne sağdan ve üstten taşıyor — katalog kartıyla aynı kural
            (Ü181). Sahnesi olmayan oyunlar eski soluk çizimde kalıyor. */}
        {sahneVarMi(ayar.oyunId) ? (
          <span aria-hidden className="pointer-events-none absolute -top-8 -right-10">
            <OyunSahnesi oyun={ayar.oyunId} boy={210} />
          </span>
        ) : (
          <span
            aria-hidden
            className="pointer-events-none absolute -right-8 -bottom-6 text-white/15"
          >
            <Gorsel ad={oyunGorseli(ayar.oyunId)} boy={150} />
          </span>
        )}
        {/* Perde: sahne parlak ve metin onun üstünde. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-[88%]"
          style={{ background: `linear-gradient(to right, ${r.koyu} 44%, transparent 100%)` }}
        />

        <div className="relative flex max-w-[72%] items-start gap-3.5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-yuzey shadow-lg">
            <OyunIkonu oyunId={ayar.oyunId} boy={34} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl leading-tight font-extrabold tracking-tight text-white">
              {ayar.ad}
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed text-white/75">{ayar.ozet}</p>
          </div>
        </div>

        {ayar.bonusMu && ayar.kazandirir && (
          <div className="relative mt-4 inline-block rounded-full bg-yuzey px-3 py-1 etiket-caps text-[10px] text-odul-koyu shadow-lg">
            Bugünün oyunu · ×2 puan
          </div>
        )}

        {/* Ü83: bölüm seçici kalktı. Seçilecek bir şey yok — tek tur var
            ve kaybedene kadar sürüyor. Yerinde tek bir düğme duruyor. */}
        <button
          type="button"
          disabled={bekliyor}
          onClick={turBaslat}
          /* Ü191: hap biçimi ve altın gradyan — ana ekrandaki "Oyna"
             düğmesiyle aynı dil. Kartın tek sıcak rengi bu, yani
             bakılacak yer tartışmasız. */
          className="relative mt-6 flex w-full items-center justify-center gap-2.5 rounded-full py-4 font-display text-[18px] font-bold transition-transform active:scale-[0.99] disabled:opacity-40"
          style={{
            background: "linear-gradient(180deg, #ffd45e 0%, #f7b02a 100%)",
            color: "#4a2708",
            boxShadow: "0 5px 0 rgba(209,137,22,.5), 0 8px 16px -6px rgba(0,0,0,.35)",
          }}
        >
          {bekliyor ? "Basliyor" : <><span aria-hidden className="text-[15px]">▶</span> Oyna</>}
        </button>

        <p className="relative mt-3 text-center text-[12px] leading-relaxed text-white/65">
          Kaybedene kadar sürüyor. İlerledikçe zorlaşıyor.
        </p>
      </BiletYuzeyi>
    </div>
  );
}

/* ── Sonuç ─────────────────────────────────────────────── */

function SonucEkrani({
  ayar,
  cevap,
  tekrar,
}: {
  ayar: Ayar;
  cevap: BitirCevabi;
  tekrar: () => void;
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
        <Dugmeler tekrar={tekrar} oyunId={ayar.oyunId} />
      </div>
    );
  }

  const { skor, basarili, puan, esik, seri, challenge, xp, kazandirir, yeniRozetler, kupon, taht, kampanya, teklif, seviye, odulYok } =
    cevap;

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
        "Puan ve XP yalnızca bir Looply kafesinde, konumun doğrulandığında kazanılır.",
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
            : `${ayar.kuponEsigi.toLocaleString("tr-TR")} skoru geçemedin ama denemenin de karşılığı var. Geçersen çok daha fazlası.`,
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

    // Ü106: görev XP'si `xp` toplamının içinde geliyor; ayrı satır olarak
    // gösterilip taban satırından düşülüyor. Puan tarafında eşik ve seri
    // bonusları da böyle — toplamı tek satırda göstermek "neden bu kadar
    // çok" sorusunu cevapsız bırakırdı.
    const gorevXp = challenge?.xp ?? 0;

    satirlar.push({
      baslik: `+${xp - gorevXp} XP`,
      aciklama: "Seviyen bu kafede ilerledi. XP harcanmaz.",
      vurgu: true,
    });

    if (challenge) {
      satirlar.push({
        baslik: `+${challenge.xp} XP · günün görevi`,
        aciklama: `"${challenge.baslik}" tamamlandı. Yarın yeni bir görev geliyor.`,
        vurgu: true,
      });
    }
  }

  /* ⚠️ Ü148: "N yeni rozet" satırı KALDIRILDI. Rozet artık ekranın
     başındaki kutlamada, adıyla birlikte duruyor; satır da kalsaydı
     aynı şey iki kez söylenir ve ikisi de zayıflardı. */

  const r = RENK[oyunRengi(ayar.oyunId)];

  return (
    <div>
      {/*
        Ü146: seviye atlama kutlaması, skor kartının ÜSTÜNDE.

        Sıralama bir karar: seviye atlamak turun en büyük haberi ve
        oyuncu ekranı açtığı anda görmeli. Kazanım satırlarının arasına
        konsaydı "300 puan, 50 XP, bir de seviye" gibi okunurdu — oysa
        diğerleri her turda oluyor, bu on turda bir.
      */}
      {/* Ü274: seviye atlama önce TAM EKRAN sahneyle geliyor (seri gibi);
          kart kapanınca sonuçların arasında kaydı olarak duruyor. */}
      {seviye && <SeviyeSahnesi seviye={seviye.yeni} />}
      {seviye && <SeviyeKutlamasi seviye={seviye.yeni} />}

      {/*
        Ü148: rozet kutlaması. Kazanım satırlarındaki "N yeni rozet"
        kaldırıldı — aynı şeyi iki kez söylemek kutlamayı da satırı da
        zayıflatıyordu.
      */}
      {yeniRozetler.length > 0 && (
        <div className={seviye ? "mt-3" : ""}>
          {/* Ü186: renk artık prop değil — sayfanın bastığı CSS
              değişkeninden miras alınıyor (`LoopyRenkleri`). */}
          <RozetKutlamasi rozetler={yeniRozetler} />
        </div>
      )}

      {/* Ü191: sonuç kartı da koyu bilete geçti — tanıtım kartıyla aynı
          gerekçe. Aynı turun iki ekranı farklı dil konuşamaz. */}
      <BiletYuzeyi renk={oyunRengi(ayar.oyunId)} className="parilti mt-3 px-5 py-6">
        <div className="relative flex items-center gap-2">
          <OyunIkonu oyunId={ayar.oyunId} boy={18} />
          <span className="etiket-caps" style={{ color: r.canli }}>
            {ayar.ad}
          </span>
        </div>
        {/* Ü83: her tur kaybederek bitiyor, o yüzden başlık "bitti mi" değil
            **ne kadar iyi bitti** diyor. Eşiği geçen tur kupon düşürüyor
            (puan.KUPON_ESIGI) ve ekranın dili bunu yansıtıyor. */}
        <h1 className="relative mt-1.5 font-display text-3xl leading-none font-extrabold tracking-tight text-white">
          {basarili ? "İyi tur" : "Tur bitti"}
        </h1>

        {/* Skor tek başına ortada: ekranın tek büyük sayısı o. */}
        <div className="relative mt-6 text-center">
          <div className="etiket-caps text-white/55">Skor</div>
          {/* ⚠️ Başarılı tur `canli` ile parlıyor, başarısız beyaz kalıyor.
              Koyu zeminde `ana` tonu zeminden ayrılmıyor (Ü171) ve
              `--color-yazi` (koyu gri) hiç okunmuyordu. */}
          <div
            className="patla mt-1 font-data text-6xl leading-none font-bold tabular"
            style={{ color: basarili ? r.canli : "#ffffff" }}
          >
            {skor.toLocaleString("tr-TR")}
          </div>
          <div className="mt-2 font-data text-[9px] text-white/45">sunucuda doğrulandı</div>
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

          {/* E2: anlık ödül. Kupon en sonda ve en görünür: bu ekranda
              kazanılan başka her şey puan, bu ise kasada gösterilecek
              gerçek bir şey.

              🔴 Ü141: ödülün **adı burada artık yazmıyor.** Ürün sahibi
              "kazıma tek açılış olsun" dedi; ad ilk kez Ödüllerim
              ekranında, kupon kazınınca görünüyor. Sunucu zaten adı
              göndermiyor (`DusenOdul.baslik` kapalı kuponda null), yani
              burada yanlışlıkla yazılması da mümkün değil.

              ⚠️ TL değeri hâlâ yok ve olmayacak (E9). Değişen şey
              sürprizin süresi, gizlenen bilgi değil. */}
          {/* 🔴 Ü274: kafe kapalıyken ödül çıkmıyor ve ekran bunu SÖYLÜYOR.
              Önce susuyordu: ürün sahibi gece ödüllü bloğu kırdı, tur
              bitti, hiçbir şey olmadı ve sebebini bilemedi. */}
          {!kupon && odulYok?.sebep === "kafe_kapali" && (
            <p
              className="gir rounded-2xl border border-cizgi bg-yuzey px-4 py-3.5 text-[13px] leading-relaxed text-yazi-sonuk"
              style={{ animationDelay: `${190 + satirlar.length * 90}ms` }}
            >
              <strong className="text-yazi">Kafe şu an kapalı</strong>, bu turda ödül
              çıkmadı. Ödüller {String(odulYok.acilis).padStart(2, "0")}:00&apos;da açılıyor;
              puanın ve XP&apos;n yazıldı.
            </p>
          )}
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
                  {kupon.kapali ? "Kapalı bir kupon" : kupon.baslik}
                </span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-yazi-sonuk">
                  {/* ⚠️ Ü97: kaç saat sonra açılacağı YAZMIYOR — bekleme
                      metni ne zaman olduğunu söylemeden söylüyor.
                      Ü141'den beri ödülün adı da burada yok; iki sürpriz
                      üst üste binmiyor, çünkü ikisi farklı soruların
                      cevabı: biri "ne", öbürü "ne zaman". */}
                  {kupon.kapali
                    ? kupon.ertelendi
                      ? `${beklemeMetni(kupon.kuponId, new Date(kupon.aktiflesme))} Ödüllerim ekranından kazıyıp görebilirsin.`
                      : "Ödüllerim ekranından kazıyıp aç."
                    : kupon.ertelendi
                      ? `${beklemeMetni(kupon.kuponId, new Date(kupon.aktiflesme))} Ödüllerim ekranından takip edebilirsin.`
                      : "Ödüllerim ekranından kasada gösterebilirsin."}
                </span>
              </span>
            </Link>
          )}

          {/* Ö4 · kampanya kuponu (Ü82). Ödülden AYRI kart ve altında:
              ödül oynamanın karşılığı, bu kafenin ikramı. Aynı görünseler
              oyuncu "iki ödül kazandım" sanır ve ikincisi kazanılmış bir
              şey değil. Sakin çerçeve, altın yok. */}
          {kampanya && (
            <Link
              href="/oduller"
              className="gir flex items-center gap-3 rounded-2xl border border-cizgi bg-yuzey px-4 py-3.5 transition-colors hover:border-yazi-sonuk/40"
              style={{ animationDelay: `${240 + satirlar.length * 90}ms` }}
            >
              <span className="flex-none text-yazi-sonuk">
                <Gorsel ad="etiket" boy={30} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block etiket-caps text-yazi-sonuk">Kafeden indirim</span>
                <span className="mt-1 block font-display text-[16px] leading-tight font-bold">
                  {kampanya.baslik}
                </span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-yazi-sonuk">
                  {kampanya.ertelendi
                    ? beklemeMetni(kampanya.kuponId, new Date(kampanya.aktiflesme))
                    : "Kuponlarının arasında, kasada gösterebilirsin."}
                </span>
              </span>
            </Link>
          )}
          {/* ── Upsell teklifi (Ü100) ─────────────────────
              ⚠️ Bu bir kupon DEĞİL, bir teklif. "Al" denene kadar hiçbir
              kupon üretilmiyor ve kafenin bütçesinden hiçbir şey
              bağlanmıyor (Ü7). Teklifi görmezden geçen oyuncu kafeye
              hiçbir şeye mal olmuyor.

              ⚠️ Ödül ve kampanya kartlarından **sonra** duruyor: ödül
              oynamanın karşılığı, teklif kafenin satmak istediği şey.
              Sıralama ikisini karıştırmamalı. */}
          {teklif && (
            <TeklifKarti teklif={teklif} gecikme={290 + satirlar.length * 90} />
          )}
        </div>
      </BiletYuzeyi>

      <Dugmeler tekrar={tekrar} oyunId={ayar.oyunId} />
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

/*
  ⚠️ `geri` propu Ü203'te KALKTI. İkinci düğme artık bir davranış
  değil bir adres (`/oyunlar`); kabuğun "turu sıfırla" işlevine
  ihtiyacı kalmadı. Prop bırakılsaydı hiçbir şey yapmayan bir alan
  olurdu.
*/
function Dugmeler({ tekrar, oyunId }: { tekrar: () => void; oyunId: string }) {
  const r = RENK[oyunRengi(oyunId)];

  return (
    <div className="mt-6 flex flex-col gap-2.5">
      {/* Ü83: "sonraki bölüm" kalktı, tekrar oynamak birincil eylem oldu —
          sonsuz oyunda yapılacak tek şey daha iyisini denemek. */}
      <button
        type="button"
        onClick={tekrar}
        className="rounded-xl py-4 font-display text-[16px] font-bold text-white transition-transform active:scale-[0.99]"
        style={{ background: r.ana }}
      >
        Tekrar oyna
      </button>
      {/*
        🔴 Katalog KARUSELİNE gidiyor — Ü203.

        Ürün sahibi: *"oyun bitince bu ekran açılmamalı, oyunlar
        ekranımız açılmalı, carousel'li olan."* Eskiden `geri` turu
        sıfırlayıp bu oyunun tanıtım kartını gösteriyordu; oyuncu
        başka bir oyuna geçmek isterse bir tık daha atmak zorundaydı.
        Tur bitti demek "bu oyunla işim bitti" demeye en yakın an.
      */}
      <Link
        href="/oyunlar"
        className="py-2 text-center text-[14px] text-yazi-sonuk underline"
      >
        Oyunlara dön
      </Link>
    </div>
  );
}

/**
 * Upsell teklifi kartı (Ü100).
 *
 * ── Neden bir düğme, neden hazır kupon değil ────────────────
 *
 * Kupon üretmek kafenin bütçesini bağlıyor. Teklifi görmezden geçecek on
 * kişiye kupon basmak, o bütçeyi kullanılmayacak sözlere harcar. Bir de
 * ölçüm: "gösterildi" ile "aldı" ayrı olmazsa teklifin ilgi çekip
 * çekmediği hiç öğrenilemez.
 *
 * ⚠️ Süre **açıkça yazıyor** — Ü97'nin tersine. Orada saklanan şey
 * ödülün ne zaman AÇILACAĞIydı ve mizah beklemeyi keyifli kılıyordu;
 * burada süre teklifin kendisi: "şimdi kullan" demezsek upsell çalışmaz.
 */
function TeklifKarti({
  teklif,
  gecikme,
}: {
  teklif: { teklifId: string; yuzde: number; urunAdi: string; gecerliSaat: number };
  gecikme: number;
}) {
  const [bekliyor, basla] = useTransition();
  const [sonuc, setSonuc] = useState<{ ok: boolean; mesaj: string } | null>(null);

  if (sonuc?.ok) {
    return (
      <Link
        href="/oduller"
        className="gir flex items-center gap-3 rounded-2xl border border-vurgu bg-cukur px-4 py-3.5"
      >
        <span className="min-w-0 flex-1">
          <span className="block etiket-caps text-vurgu">Teklifi aldın</span>
          <span className="mt-1 block font-display text-[16px] leading-tight font-bold">
            {sonuc.mesaj}
          </span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-yazi-sonuk">
            Kuponlarının arasında. Şimdi, bu ziyarette kasada göster.
          </span>
        </span>
      </Link>
    );
  }

  return (
    <div
      className="gir rounded-2xl border border-kampanya bg-kampanya-zemin px-4 py-3.5"
      style={{ animationDelay: `${gecikme}ms` }}
    >
      <div className="etiket-caps text-kampanya">Sana özel · bugüne</div>
      <div className="mt-1 font-display text-[17px] leading-tight font-bold">
        %{teklif.yuzde} · {teklif.urunAdi}
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-yazi-sonuk">
        {teklif.gecerliSaat} saat geçerli — masadan kalkmadan kullanabilirsin.
      </p>

      {sonuc && !sonuc.ok && (
        <p className="mt-2 text-[13px] text-tehlike">{sonuc.mesaj}</p>
      )}

      <button
        type="button"
        disabled={bekliyor}
        onClick={() =>
          basla(async () => {
            const c = await teklifAlEylemi(teklif.teklifId);
            setSonuc(c.ok ? { ok: true, mesaj: c.baslik } : { ok: false, mesaj: c.hata });
          })
        }
        className="mt-3 w-full rounded-xl bg-kampanya px-5 py-3 font-display text-[15px] font-bold tracking-tight text-white disabled:opacity-50"
      >
        {bekliyor ? "…" : "Teklifi al"}
      </button>
    </div>
  );
}
