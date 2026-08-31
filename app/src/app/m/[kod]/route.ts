import { NextResponse } from "next/server";
import { masaCoz, taramaKaydet, biletUret, MASA_COOKIE, BILET_OMRU_SN } from "@/domain/qr";
import { log } from "@/lib/log";

/**
 * Masadaki karekodun gittiği adres.
 *
 * Basılı kod sabit ve tahmin edilemez (`qr_secret`'tan türüyor). Burada
 * masa çözümlenip **imzalı masa bileti** HttpOnly çerezle veriliyor.
 *
 * Neden çerez, neden adres çubuğu değil:
 *   · Adres paylaşmakla taşınmıyor — ekran görüntüsü işe yaramıyor
 *   · Sayfa iki kez yüklense de bozulmuyor (tek kullanımlık jetonun sorunu buydu)
 *   · İmzalı olduğu için kurcalanamıyor — başka kafenin kimliği yazılamıyor
 *
 * Basılı karekodun fotoğrafını paylaşmayı bu katman durdurmaz;
 * onu konum doğrulaması (K2) karşılıyor.
 */

export const dynamic = "force-dynamic";

export async function GET(istek: Request, ctx: { params: Promise<{ kod: string }> }) {
  const { kod } = await ctx.params;
  const masa = await masaCoz(kod);

  if (!masa) {
    // Kodun neden geçersiz olduğunu söylemiyoruz — tarama yapan birine
    // "bu kafe var ama onaysız" bilgisini vermenin faydası yok.
    log.warn("gecersiz masa karekodu");
    return NextResponse.redirect(new URL("/giris?hata=masa", istek.url));
  }

  // Kafenin doğrulama defterine "bu masa okutuldu" satırı
  await taramaKaydet(masa.cafeId, masa.tableId);

  // Ü35: karekodu okutan kişi **önce oynuyor**. `/hemen` girişli oyuncuyu
  // zaten `/oyna`'ya yolluyor, bu yüzden burada oturum sorulmuyor — tek
  // yerde karar veriliyor.
  const cevap = NextResponse.redirect(new URL("/hemen", istek.url));
  cevap.cookies.set(MASA_COOKIE, biletUret(masa.cafeId, masa.tableId), {
    httpOnly: true,
    secure: process.env.APP_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BILET_OMRU_SN,
  });
  return cevap;
}
