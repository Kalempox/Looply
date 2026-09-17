"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, type AvatarIfadesi } from "./avatar";

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

/** Sevme için gereken toplam parmak yolu — Ü147'yle aynı (piksel). */
const SEVME_ESIGI = 90;

export function AvatarYuvasi({ ad }: { ad?: string }) {
  const [disarida, setDisarida] = useState(false);
  /** Yuvaya dönüş animasyonu sürerken panel hâlâ çizili durmalı. */
  const [donuyor, setDonuyor] = useState(false);
  const [ifade, setIfade] = useState<AvatarIfadesi>("sakin");

  const yolRef = useRef(0);
  const sonRef = useRef<{ x: number; y: number } | null>(null);
  const zamanRef = useRef<number | null>(null);

  // Sevilme birkaç saniye sonra geçiyor — kalıcı olsaydı tepki değil,
  // yeni bir duruş olurdu.
  useEffect(() => {
    if (ifade !== "keyifli") return;
    const t = window.setTimeout(() => setIfade("sakin"), 2600);
    return () => window.clearTimeout(t);
  }, [ifade]);

  useEffect(() => () => {
    if (zamanRef.current) window.clearTimeout(zamanRef.current);
  }, []);

  const surt = (e: React.PointerEvent) => {
    const son = sonRef.current;
    sonRef.current = { x: e.clientX, y: e.clientY };
    if (!son) return;
    yolRef.current += Math.hypot(e.clientX - son.x, e.clientY - son.y);
    if (yolRef.current >= SEVME_ESIGI) {
      yolRef.current = 0;
      setIfade("keyifli");
    }
  };

  const yuvayaGonder = () => {
    setDonuyor(true);
    setIfade("sakin");
    zamanRef.current = window.setTimeout(() => {
      setDisarida(false);
      setDonuyor(false);
    }, 420);
  };

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
            <Avatar boy={28} ifade="sakin" />
          </span>
        </button>
      )}

      {disarida && (
        <div className="fixed right-4 bottom-24 z-30 flex flex-col items-end gap-2">
          <div
            className={`${donuyor ? "avatar-yuvaya" : "avatar-firliyor"} rounded-3xl border border-cizgi bg-yuzey px-5 py-4 shadow-[0_18px_44px_-16px_rgba(16,32,77,0.5)]`}
          >
            <div
              onPointerMove={surt}
              onPointerLeave={() => {
                sonRef.current = null;
              }}
              className="flex justify-center"
            >
              <Avatar boy={96} ifade={ifade} ad={ad ?? "Arkadaşın"} />
            </div>

            <p className="mt-2 text-center text-[12px] leading-snug text-yazi-sonuk">
              {ifade === "keyifli" ? "Bayıldı." : "Parmağınla sürt, sevsin."}
            </p>

            <div className="mt-3 flex flex-col gap-1.5">
              <Link
                href="/profil"
                className="rounded-xl border border-cizgi px-4 py-2 text-center text-[13px] font-semibold"
              >
                Özelleştir
              </Link>
              <button
                type="button"
                onClick={yuvayaGonder}
                className="rounded-xl px-4 py-2 text-[13px] font-semibold text-yazi-sonuk"
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
