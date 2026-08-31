import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy — her istek render edilmeden önce çalışır.
 * (Next.js 16'da `middleware` bu ada taşındı.)
 *
 * İki iş yapar:
 *   1. İstek kimliği üretir — bir isteği loglarda baştan sona izleyebilmek için
 *   2. CSRF için köken (origin) kontrolü — SameSite çerezinin ikinci katmanı
 *
 * Güvenlik başlıkları burada değil, next.config.ts içinde: statik oldukları
 * için her istekte yeniden üretilmelerine gerek yok.
 */

const GUVENLI_METOTLAR = new Set(["GET", "HEAD", "OPTIONS"]);

export function proxy(request: NextRequest) {
  // Durum değiştiren isteklerde köken aynı olmalı
  if (!GUVENLI_METOTLAR.has(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    // Köken başlığı yoksa istek tarayıcıdan gelmiyordur (curl, sunucu-sunucu).
    // Çerezle kimliklenen bir uçta bunu kabul etmiyoruz.
    if (!origin || !host) {
      return NextResponse.json({ hata: "kaynak_dogrulanamadi" }, { status: 403 });
    }

    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return NextResponse.json({ hata: "kaynak_dogrulanamadi" }, { status: 403 });
    }

    if (originHost !== host) {
      return NextResponse.json({ hata: "kaynak_dogrulanamadi" }, { status: 403 });
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-request-id", crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
