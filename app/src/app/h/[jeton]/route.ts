import { goreliYonlendir } from "@/lib/yonlendir";
import { coz, sahiplen, HAK_COOKIE, HAK_OMRU_DK } from "@/domain/cark-hakki";
import * as oturum from "@/domain/session";
import { log } from "@/lib/log";

/**
 * Çark hakkı karekodunun gittiği adres — Ü137.
 *
 * Kasadaki ekranda beliren QR bu adresi taşıyor. Müşteri kendi
 * telefonuyla okutuyor ve buraya düşüyor.
 *
 * ── İki yol ─────────────────────────────────────────────────
 *
 *   **Oturumu varsa**  → hak hemen sahipleniyor, çarka gidiyor
 *   **Oturumu yoksa**  → girişe gidiyor; jeton çerezde bekliyor ve
 *                        `/cark` dönüşte sahipleniyor
 *
 * ── 🔴 Neden çerez, neden `?devam=` değil ───────────────────
 *
 * Giriş akışında dönüş adresi taşıyan bir parametre **yok** ve eklemek
 * kayıt/giriş/OTP zincirinin tamamına dokunmak demekti — çalışan ve
 * güvenlik testleri olan bir akış. Jeton bunun yerine kısa ömürlü bir
 * HttpOnly çerezde bekliyor: giriş akışı hiç bilmiyor, `/cark` dönüşte
 * buluyor.
 *
 * Çerez `HAK_OMRU_DK` kadar yaşıyor — hakkın kendisiyle aynı. Daha uzun
 * olsaydı sönmüş bir hakkın jetonu ortalıkta kalırdı.
 *
 * ⚠️ Giriş akışı **değiştirilmedi**. Müşteri her zamanki gibi kaydoluyor
 * ya da giriş yapıyor; aydınlatma metnini kendisi onaylıyor. Kasiyerin
 * onun adına veri girmesi bu yüzden hiç gerekmiyor (Ü137'nin KVKK
 * gerekçesi).
 *
 * ⚠️ Jeton adres çubuğunda görünüyor ve bu kabul edilen bir bedel:
 * 15 dakika yaşıyor, tek kullanımlık ve okutulduğu anda sahipleniyor.
 * Ekran görüntüsünü paylaşan biri ancak o pencerede ve hak henüz
 * sahiplenilmemişse bir şey kazanabilir.
 */

export const dynamic = "force-dynamic";

// Ü273: göreli yönlendirme — `istek.url` sunucunun dinlediği adresi (0.0.0.0)
// taşıyabiliyor, kullanıcının geldiği adresi değil. Bkz. `lib/yonlendir.ts`.
export async function GET(_istek: Request, ctx: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await ctx.params;
  const hak = await coz(jeton);

  if (hak.durum !== "gecerli") {
    // Sebep adres satırında taşınıyor: müşteri "neden olmadı" sorusunun
    // cevabını görmeli — kasaya geri dönüp kasiyere soracak olan o.
    log.warn("gecersiz cark hakki", { durum: hak.durum });
    return goreliYonlendir(`/cark?hak=${hak.durum}`);
  }

  const o = await oturum.oku();

  if (o && o.rol === "oyuncu") {
    const sonuc = await sahiplen(hak.hakId, o.ozneId);
    if (!sonuc.ok) {
      // Araya biri girdi: aynı QR başka bir telefonda okutuldu.
      return goreliYonlendir("/cark?hak=kullanildi");
    }
    return goreliYonlendir("/cark?hak=hazir");
  }

  /*
    Oturum yok — girişe yolluyoruz, jeton çerezde bekliyor.

    ⚠️ Hak burada sahiplenilmiyor: kimin sahipleneceği henüz belli değil.
    Giriş yarıda bırakılırsa hak boşta kalıyor ve süresi dolunca
    kendiliğinden sönüyor.
  */
  const cevap = goreliYonlendir("/giris");
  cevap.cookies.set(HAK_COOKIE, jeton, {
    httpOnly: true,
    secure: process.env.APP_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HAK_OMRU_DK * 60,
  });
  return cevap;
}
