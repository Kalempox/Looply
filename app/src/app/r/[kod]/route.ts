import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ziyaret, DAVET_COOKIE, DAVET_COOKIE_OMRU_SN } from "@/domain/davet";
import * as oturum from "@/domain/session";
import { identifierHash } from "@/lib/crypto";
import { log } from "@/lib/log";

/**
 * Davet bağlantısının gittiği adres — `/r/{kod}`.
 *
 * Ü20: davetin sahibi HTML değil **sunucu**. Bağlantıya gelindiğinde burada
 * bir "tıklandı" satırı açılıyor ve kimliği HttpOnly çerezle taşınıyor.
 * Kayıt anında (`giris/actions.ts`) hesaba bağlanıyor.
 *
 * Neden çerez, neden adres çubuğunda taşınan bir parametre değil:
 *   · Kayıt formu SMS adımından geçiyor; adres parametresi o iki adımda
 *     kaybolur ve atıf sessizce düşerdi
 *   · Kullanıcı bağlantıyı kopyalayıp yapıştırırsa parametre yayılır;
 *     çerez o cihazda kalıyor
 *   · HttpOnly olduğu için istemci betiği okuyup değiştiremiyor
 *
 * Geçersiz kod sessizce giriş ekranına gidiyor. "Bu kod yok" demek, geçerli
 * kod aramak isteyene bedava bir sonda vermek olurdu.
 */

export const dynamic = "force-dynamic";

export async function GET(istek: Request, ctx: { params: Promise<{ kod: string }> }) {
  const { kod } = await ctx.params;

  // Oturumu açık oyuncu davet edilemez — hesabı zaten var (Ü20: yalnızca
  // yeni kullanıcı). Satır açmak "açılan" sayacını şişirir ve çerez otuz gün
  // boyunca boşuna beklerdi; en olası tıklayan da davetin kendi sahibi.
  const mevcut = await oturum.oku();
  if (mevcut?.rol === "oyuncu") {
    return NextResponse.redirect(new URL("/oyna", istek.url));
  }

  const h = await headers();

  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? undefined;
  const ua = h.get("user-agent") ?? undefined;

  const referralId = await ziyaret({
    kod,
    ipHash: ip ? identifierHash(ip) : undefined,
    uaHash: ua ? identifierHash(ua) : undefined,
  });

  const cevap = NextResponse.redirect(new URL("/giris", istek.url));

  if (!referralId) {
    log.warn("gecersiz davet kodu");
    return cevap;
  }

  cevap.cookies.set(DAVET_COOKIE, referralId, {
    httpOnly: true,
    secure: process.env.APP_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAVET_COOKIE_OMRU_SN,
  });
  return cevap;
}
