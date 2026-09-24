"use client";

import { useEffect, useEffectEvent } from "react";
import { konumTazeleEylemi, type KonumCevabi } from "./actions";

/**
 * Konum takibi — Ü279.
 *
 * Ürün sahibi: *"oturum dolmamalı, orada konum hep takip edilmeli,
 * insanları tekrar karekod okutmaya zorlamamalıyız."* Masa oturumu artık
 * gün boyu açık; "hâlâ kafede mi" sorusunu taze konum cevaplıyor
 * (`masa.KONUM_TAZE_DAKIKA`). Bu dosya o konumu taze tutuyor:
 *
 * - `KonumTakibi`: sayfa açıkken birkaç dakikada bir ve uygulamaya
 *   dönülünce, **yalnızca izin daha önce verildiyse** sessizce okur.
 *   İzin sorusu kendiliğinden hiç çıkmıyor.
 * - `konumuTazele({ sor: true })`: oyun ve çark başlamadan hemen önce.
 *   Oyuncu o an bir şey başlatıyor; izin sorulacaksa bağlamı belli.
 *
 * ⚠️ Tarayıcı arka planda konum vermiyor; takip yalnızca uygulama
 * açıkken. Ödül anı zaten uygulama açıkken — yetiyor.
 *
 * ⚠️ Koordinat istemcide kalmıyor, sunucuda da saklanmıyor: yalnızca
 * kafeye mesafe yazılıyor (G10).
 */

/** Bu kadar yeni bir "kafedesin" okuması varken yeniden okunmuyor. */
const TAZELEME_ARALIGI_MS = 4 * 60_000;
/** Açık sayfada sessiz okuma aralığı. Sunucunun tazelik sınırı 15 dk. */
const TAKIP_ARALIGI_MS = 5 * 60_000;

const SON_ANAHTAR = "looply:konum-son";
const IZIN_ANAHTAR = "looply:konum-izni";

function oku(anahtar: string): string | null {
  try {
    return window.sessionStorage.getItem(anahtar);
  } catch {
    return null;
  }
}

function yaz(anahtar: string, deger: string): void {
  try {
    window.sessionStorage.setItem(anahtar, deger);
  } catch {
    // Gizli sekmede depolama yazılamayabilir — yalnızca daha sık okunur.
  }
}

/**
 * İzin verilmiş mi — sormadan.
 *
 * Safari izin durumunu çoğu zaman "prompt" diye bildiriyor, izin o
 * oturumda verilmiş olsa bile. Bu sekmede bir okuma başarıldıysa
 * (`IZIN_ANAHTAR`) izin var sayılıyor.
 */
async function izinVarMi(): Promise<boolean> {
  if (oku(IZIN_ANAHTAR) === "1") return true;
  try {
    const s = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    return s?.state === "granted";
  } catch {
    return false;
  }
}

function konumOku(zamanAsimiMs: number): Promise<GeolocationPosition | null> {
  return new Promise((coz) => {
    if (!("geolocation" in navigator)) {
      coz(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => coz(p),
      () => coz(null),
      { enableHighAccuracy: true, timeout: zamanAsimiMs, maximumAge: 60_000 },
    );
  });
}

/**
 * Konumu okuyup sunucuya bildirir. Son "kafedesin" okuması yeniyse hiç
 * okumaz; `sor: false` iken izin yoksa hiç sormaz.
 *
 * Sonuç `null`: okunmadı (yeni okuma vardı, izin yok ya da tarayıcı
 * veremedi). Çağıran için bu bir hata değil — tur yine başlar, sunucu
 * elindeki okumaya göre karar verir.
 */
export async function konumuTazele(opts: {
  sor: boolean;
  zamanAsimiMs?: number;
}): Promise<KonumCevabi | null> {
  const son = Number(oku(SON_ANAHTAR) ?? 0);
  if (Date.now() - son < TAZELEME_ARALIGI_MS) return null;
  if (!opts.sor && !(await izinVarMi())) return null;

  const p = await konumOku(opts.zamanAsimiMs ?? 8_000);
  if (!p) return null;
  yaz(IZIN_ANAHTAR, "1");

  const c = await konumTazeleEylemi(p.coords.latitude, p.coords.longitude, p.coords.accuracy);
  // Yalnızca "kafedesin" kısaltıyor: uzakta çıkan oyuncu masaya dönünce
  // bir sonraki oyun yeniden baksın.
  if (c.durum === "dogrulandi") yaz(SON_ANAHTAR, String(Date.now()));
  return c;
}

/**
 * Sayfa açıkken konumu sessizce taze tutar. Görünmez bileşen.
 *
 * `degisti`: okuma sonucu geldiğinde çağrılır — ana ekran şeridi
 * değiştiyse sayfayı tazeliyor. Oyun ekranı vermiyor: tur sırasında
 * sayfanın yeniden çizilmesi istenmiyor.
 */
export function KonumTakibi({ degisti }: { degisti?: (c: KonumCevabi) => void }) {
  const bildir = useEffectEvent((c: KonumCevabi) => degisti?.(c));

  useEffect(() => {
    let bitti = false;
    const calis = async () => {
      if (document.visibilityState !== "visible") return;
      const c = await konumuTazele({ sor: false });
      if (!bitti && c) bildir(c);
    };

    void calis();
    const zamanlayici = window.setInterval(() => void calis(), TAKIP_ARALIGI_MS);
    const gorunur = () => {
      if (document.visibilityState === "visible") void calis();
    };
    document.addEventListener("visibilitychange", gorunur);

    return () => {
      bitti = true;
      window.clearInterval(zamanlayici);
      document.removeEventListener("visibilitychange", gorunur);
    };
  }, []);

  return null;
}
