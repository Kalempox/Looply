import { NextResponse } from "next/server";

/**
 * Site içi GÖRELİ yönlendirme — Ü273.
 *
 * ── 🔴 Neden `new URL(yol, istek.url)` değil ─────────────────
 *
 * Next'in belgesi route handler'da yönlendirmeyi `request.url` üstüne
 * kurmayı öneriyor. Ama `request.url` sunucunun **dinlediği** adresi
 * taşıyabiliyor, kullanıcının **geldiği** adresi değil: geliştirme
 * sunucusu `-H 0.0.0.0` ile açılınca (telefondan erişilsin diye) ürün
 * sahibi karekodu `https://192.168.1.175:3000/m/…` ile okuttu ve
 * `https://0.0.0.0:3000/hemen?cark=1`e yönlendirildi — Safari açamadı.
 *
 * Göreli `Location` başlığını tarayıcı geldiği adrese göre çözüyor
 * (RFC 9110 §10.2.2). Sunucunun kendi adını hiç bilmesi gerekmiyor:
 * geliştirmede de, bir vekil sunucunun arkasında da aynı çalışıyor.
 *
 * ⚠️ Yalnızca `/` ile başlayan site içi yol. `//evil.com` tarayıcıda
 * başka bir siteye gider (protokole göreli adres) — açık yönlendirme
 * olmasın diye reddediliyor.
 */
export function goreliYonlendir(yol: string): NextResponse {
  if (!yol.startsWith("/") || yol.startsWith("//") || yol.startsWith("/\\")) {
    throw new Error(`goreliYonlendir: yalnızca site içi yol (${yol})`);
  }
  // 307: `NextResponse.redirect`in varsayılanı — yöntem korunuyor.
  return new NextResponse(null, { status: 307, headers: { Location: yol } });
}
