import { goreliYonlendir } from "@/lib/yonlendir";
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

// Ü273: göreli yönlendirme — `istek.url` sunucunun dinlediği adresi (0.0.0.0)
// taşıyabiliyor, kullanıcının geldiği adresi değil. Bkz. `lib/yonlendir.ts`.
export async function GET(_istek: Request, ctx: { params: Promise<{ kod: string }> }) {
  const { kod } = await ctx.params;
  const masa = await masaCoz(kod);

  if (!masa) {
    // Kodun neden geçersiz olduğunu söylemiyoruz — tarama yapan birine
    // "bu kafe var ama onaysız" bilgisini vermenin faydası yok.
    log.warn("gecersiz masa karekodu");
    return goreliYonlendir("/giris?hata=masa");
  }

  // Kafenin doğrulama defterine "bu masa okutuldu" satırı
  await taramaKaydet(masa.cafeId, masa.tableId);

  // Ü35: karekodu okutan kişi **önce oynuyor**. `/hemen` girişli oyuncuyu
  // zaten `/oyna`'ya yolluyor, bu yüzden burada oturum sorulmuyor — tek
  // yerde karar veriliyor.
  // Ü96: `?cark=1` — karekodu okutan doğrudan çarkla karşılaşıyor.
  // Bayrak adreste taşınıyor çünkü kararı **sunucu** vermeli: sahnenin
  // ilk render'ında açık olması gerekiyor ve tarayıcıya özel bir API
  // (sessionStorage) sunucuda okunamıyor.
  const cevap = goreliYonlendir("/hemen?cark=1");
  cevap.cookies.set(MASA_COOKIE, biletUret(masa.cafeId, masa.tableId), {
    httpOnly: true,
    secure: process.env.APP_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BILET_OMRU_SN,
  });
  return cevap;
}
