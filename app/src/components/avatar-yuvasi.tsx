"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, DURUS, type AvatarIfadesi } from "./avatar";

/**
 * Avatarın yuvası — Ü159.
 *
 * ── Ürün sahibinin isteği ───────────────────────────────────
 *
 * *"Sağ alt kısımda küçük bir yuvarlak olmalı; kullanıcı ona tıklarsa
 * avatarımız fırlama animasyonuyla ekrana gelmeli ve öyle sevilmeli, ve
 * 'geri yuvasına gönder' seçeneğiyle de geri o dairenin içine
 * gönderilmeli."*
 *
 * ── Neden bir yuva, neden sürekli ekranda değil ─────────────
 *
 * Loopy her ekranda dolaşsaydı içeriğin üstünü kapatırdı ve bir süre
 * sonra kapatılacak bir şeye dönüşürdü. Yuvada dururken **davet**
 * ediyor; çağrıldığında geliyor, işi bitince geri dönüyor. Oyuncu onu
 * ne zaman göreceğine kendi karar veriyor.
 *
 * ── Sevme: Ü147'nin kuralı aynen geçerli ────────────────────
 *
 * Tek dokunuş yetmiyor, **sürtmek** gerekiyor. Dokunmayla tepki
 * verseydi ekranı kaydırmak için parmağını üstünden geçiren herkes
 * "sevmiş" olurdu ve tepki anlamını yitirirdi.
 *
 * ⚠️ `touch-action` kısıtlanmıyor ve `preventDefault` çağrılmıyor:
 * parmağını avatarın üstünden aşağı kaydıran oyuncunun sayfası normal
 * kayıyor (Ü143'ün karusel dersi).
 */

/**
 * Sevme için gereken toplam parmak yolu (piksel).
 *
 * 🔴 90'dan 260'a çıkarıldı — Ü183.
 *
 * 90, avatar 96 piksel genişken doğru sayıydı: onun üstünde bir yandan
 * bir yana iki geçiş demekti. Ü182'de avatar 220 piksele çıkınca aynı
 * sayı **tek hamlede** doluyor — ölçüldü, 100 piksellik tek sürükleme
 * doğrudan "Bayıldı."ya geçiyordu. Ürün sahibi *"dokunduğun anda
 * direkt sevme hâline geçmemeli"* dedi ve tarif ettiği şey buydu.
 *
 * 260 ≈ büyük avatarın üstünde bir buçuk geçiş.
 */
const SEVME_ESIGI = 260;

/**
 * Parmak durunca ilerleme bu sürede eriyor (ms).
 *
 * Kalıcı olsaydı ekranı açık unutan oyuncu geri döndüğünde tek
 * dokunuşla sevmiş olurdu; sıfırlansaydı da elini bir an dinlendiren
 * herkes baştan başlardı. Erime ikisinin arası.
 */
const ERIME = 1400;

export function AvatarYuvasi({ ad }: { ad?: string }) {
  const [disarida, setDisarida] = useState(false);
  /** Yuvaya dönüş animasyonu sürerken panel hâlâ çizili durmalı. */
  const [donuyor, setDonuyor] = useState(false);
  const [ifade, setIfade] = useState<AvatarIfadesi>(DURUS);

  const yolRef = useRef(0);
  const sonRef = useRef<{ x: number; y: number } | null>(null);
  const zamanRef = useRef<number | null>(null);
  const erimeRef = useRef<number | null>(null);
  const govdeRef = useRef<HTMLDivElement>(null);

  // Sevilme birkaç saniye sonra geçiyor — kalıcı olsaydı tepki değil,
  // yeni bir duruş olurdu.
  useEffect(() => {
    if (ifade !== "keyifli") return;
    const t = window.setTimeout(() => setIfade(DURUS), 2600);
    return () => window.clearTimeout(t);
  }, [ifade]);

  useEffect(() => () => {
    if (zamanRef.current) window.clearTimeout(zamanRef.current);
  }, []);


  /**
   * 🔴 Parmağa CANLI tepki — Ü183.
   *
   * Ürün sahibi *"parmağa duyarlı tepki vermeli"* dedi ve eksik olan
   * buydu: eşiğe kadar hiçbir şey olmuyor, sonra bir anda ifade
   * değişiyordu. Aradaki okşama sessizdi.
   *
   * Şimdi her hareket iki şey yapıyor:
   *   · gövde parmağın gittiği YÖNE eğiliyor (dx ile orantılı)
   *   · ilerleme dolduça hafifçe yayılıp basıklaşıyor — okşanan bir
   *     şeyin altına verişi
   *
   * ⚠️ Dönüşüm React durumuna YAZILMIYOR, doğrudan DOM'a. `pointermove`
   * saniyede onlarca kez geliyor ve her birinde yeniden çizim, okşamayı
   * takılmalı gösterirdi (parçacıklarda öğrenilen ders, Ü141).
   *
   * ⚠️ Geçiş sürerken KAPALI: sürtme sırasında `transition` olsaydı
   * gövde parmağın arkasından gecikmeli gelir, "duyarlı" olmazdı.
   * Yalnızca parmak kalkınca açılıyor.
   */
  const surt = (e: React.PointerEvent) => {
    const son = sonRef.current;
    sonRef.current = { x: e.clientX, y: e.clientY };
    if (erimeRef.current) {
      window.clearTimeout(erimeRef.current);
      erimeRef.current = null;
    }
    if (!son) return;

    const dx = e.clientX - son.x;
    yolRef.current += Math.hypot(dx, e.clientY - son.y);
    const oran = Math.min(1, yolRef.current / SEVME_ESIGI);

    const govde = govdeRef.current;
    if (govde) {
      const egim = Math.max(-10, Math.min(10, dx * 0.7));
      govde.style.transition = "none";
      govde.style.transform =
        `rotate(${egim.toFixed(1)}deg) scale(${(1 + oran * 0.07).toFixed(3)}, ${(1 - oran * 0.05).toFixed(3)})`;
    }

    if (yolRef.current >= SEVME_ESIGI) {
      yolRef.current = 0;
      birak();
      setIfade("keyifli");
    }
  };

  /** Parmak kalkınca: gövde yerine dönüyor, ilerleme erimeye başlıyor. */
  const birak = () => {
    sonRef.current = null;
    const govde = govdeRef.current;
    if (govde) {
      govde.style.transition = "transform 420ms cubic-bezier(0.2, 0.9, 0.3, 1)";
      govde.style.transform = "";
    }
    if (erimeRef.current) window.clearTimeout(erimeRef.current);
    erimeRef.current = window.setTimeout(() => {
      yolRef.current = 0;
    }, ERIME);
  };

  const yuvayaGonder = useCallback(() => {
    setDonuyor(true);
    setIfade(DURUS);
    zamanRef.current = window.setTimeout(() => {
      setDisarida(false);
      setDonuyor(false);
    }, 420);
  }, []);

  // Tam ekran bir katman Escape ile kapanmalı — klavye kullanan oyuncu
  // için tek çıkış yolu perdeye dokunmak olamaz.
  useEffect(() => {
    if (!disarida) return;
    const tus = (e: KeyboardEvent) => {
      if (e.key === "Escape") yuvayaGonder();
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [disarida, yuvayaGonder]);

  return (
    <>
      {/*
        Yuva — sağ altta, alt gezinme şeridinin üstünde.

        ⚠️ `bottom-24`: alt şerit 4,5rem yüksekliğinde ve yuva onun
        üstünde durmalı. Şeridin arkasında kalsaydı dokunulamazdı.
      */}
      {!disarida && (
        <button
          type="button"
          onClick={() => setDisarida(true)}
          aria-label={ad ? `${ad} adlı arkadaşını çağır` : "Arkadaşını çağır"}
          className="avatar-yuva fixed right-3 bottom-[4.75rem] z-20 grid size-12 place-items-center rounded-full border border-cizgi bg-yuzey/95 shadow-[0_10px_26px_-10px_rgba(16,32,77,0.55)] backdrop-blur active:scale-95"
        >
          <span aria-hidden className="block">
            <Avatar boy={28} ifade={DURUS} />
          </span>
        </button>
      )}

      {/*
        🔴 Panel değil TAM EKRAN — Ü182.

        Ürün sahibi: *"sağ alttaki yuvarlağa bastığımızda bu şekilde
        değil, gerçekten ekranın önüne gelmeli ve insanlar parmağıyla
        onu kaydırma yapar gibi sevebilmeli."*

        Haklıydı ve sebebi ölçüye dayanıyor: sevme eşiği 90 piksellik
        parmak yolu, köşedeki panelde avatarın kapladığı alan ise 96
        pikseldi. Yani sevmek için parmağı avatarın **üstünde bir
        yandan bir yana** iki kez geçirmek gerekiyordu — okşamak değil,
        nişan almak. Tam ekranda avatar 3 katı büyük ve ekranın
        ortasında; jest kendiliğinden oluyor.

        ⚠️ Perde `pointer-events` alıyor ve dokununca kapanıyor, ama
        sevme alanı onun ÜSTÜNDE: yoksa okşamak için yapılan her
        hareket perdeye düşüp paneli kapatırdı.
      */}
      {disarida && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ad ? `${ad} adlı arkadaşın` : "Arkadaşın"}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6"
        >
          <button
            type="button"
            aria-label="Kapat"
            onClick={yuvayaGonder}
            className="absolute inset-0 bg-yazi/45 backdrop-blur-sm"
          />

          <div
            className={`relative flex flex-col items-center ${
              donuyor ? "avatar-yuvaya" : "avatar-firliyor"
            }`}
          >
            {/*
              ⚠️ `touch-none` YALNIZCA burada: okşarken sayfanın altta
              kayması jesti bozuyordu. Panelin geri kalanında kısıt yok
              (Ü143'ün karusel dersi) ama bu alan zaten tam ekran ve
              altında kaydırılacak bir şey kalmıyor.
            */}
            <div
              ref={govdeRef}
              onPointerMove={surt}
              onPointerLeave={birak}
              onPointerUp={birak}
              onPointerCancel={birak}
              className="touch-none px-10 py-6"
              style={{ transformOrigin: "50% 85%" }}
            >
              <Avatar boy={220} ifade={ifade} ad={ad ?? "Arkadaşın"} />
            </div>

            <p className="mt-2 text-center text-[15px] leading-snug font-semibold text-yuzey">
              {ifade === "keyifli" ? "Bayıldı." : "Parmağınla sürt, sevsin."}
            </p>

            <div className="mt-6 flex flex-col items-stretch gap-2">
              {/* Ü186: `/profil` değil `/loopy`. Ü172'de özelleştirme
                  profilden kalkmıştı ve bu düğme o günden beri
                  tutmadığı bir söz veriyordu. */}
              <Link
                href="/loopy"
                className="rounded-2xl bg-yuzey px-8 py-3 text-center text-[15px] font-bold text-yazi"
              >
                Özelleştir
              </Link>
              <button
                type="button"
                onClick={yuvayaGonder}
                className="rounded-2xl px-8 py-3 text-[14px] font-semibold text-yuzey/75"
              >
                Yuvasına gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
