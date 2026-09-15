import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import * as oturum from "@/domain/session";
import * as misafir from "@/domain/misafir";
import * as cark from "@/domain/cark";
import { demoOrtami } from "@/lib/env";

/**
 * Genel çıkış.
 *
 * Her panelin kendi çıkış düğmesi var ama rol değiştirirken ortak bir adres
 * gerekiyordu — özellikle test sırasında. Oturumu kapatır ve rolüne göre
 * doğru giriş ekranına gönderir.
 */

export const dynamic = "force-dynamic";

/**
 * 🔴 Ön getirme (prefetch) isteği mi?
 *
 * ── Yaşanan arıza ───────────────────────────────────────────
 *
 * Panelin menüsünde ve oyuncunun ana ekranında `<Link href="/cikis">`
 * duruyordu. Next, `<Link>` hedeflerini **üretim derlemesinde** görünür
 * olur olmaz önceden getiriyor — ve bu adres bir GET route'u, yani
 * getirilmesi doğrudan oturumu kapatıyordu. Kullanıcı paneli açıyor,
 * yarım saniye sonra giriş ekranına düşüyordu.
 *
 * ⚠️ **`npm run dev` bunu göstermiyor**: geliştirme sunucusu `<Link>`
 * hedeflerini önceden getirmiyor. Arıza yalnızca derlenmiş sürümde,
 * yani ilk sunucuya çıkışta ortaya çıkıyor. Kapta bulundu (F3).
 *
 * İki taraf birden düzeltildi: bağlantılar sade `<a>` oldu (çıkış zaten
 * istemci içi bir geçiş değil) ve burada bu kapı eklendi. Yalnızca biri
 * yapılsaydı, ileride yazılacak ilk `<Link href="/cikis">` aynı arızayı
 * geri getirirdi.
 *
 * Yalnızca **açık ön getirme işaretlerine** bakıyor. `RSC` başlığına
 * BAKMIYOR: o başlık istemci içi her geçişte var ve gerçek bir tıklamayı
 * da engellerdi.
 */
function onGetirme(h: Headers): boolean {
  if (h.get("next-router-prefetch")) return true;
  const amac = `${h.get("purpose") ?? ""} ${h.get("sec-purpose") ?? ""}`;
  return amac.includes("prefetch");
}

export async function GET(istek: Request) {
  // Ön getirme oturuma dokunmuyor ve hiçbir yere yönlendirmiyor.
  if (onGetirme(istek.headers)) return new Response(null, { status: 204 });

  const o = await oturum.oku();
  const rol = o?.rol;

  await oturum.kapat("kullanici_cikisi");

  /**
   * Demoda misafir çerezleri de siliniyor.
   *
   * Misafirin çarktan kazandığı ödül imzalı bir çerezde bekliyor ve
   * bilerek oturumdan bağımsız: kaydolmadan çıkış yapan biri ödülünü
   * kaybetmemeli. Ama test ederken bu, çarkı bir daha hiç çeviremiyor
   * demek — çerez otuz dakika duruyor ve HttpOnly olduğu için konsoldan
   * da silinemiyor.
   *
   * Kapı `demoOrtami()`: canlıda bu blok hiç çalışmıyor, gerçek bir
   * misafirin ödülü çıkışta silinmiyor.
   */
  if (demoOrtami()) {
    const c = await cookies();
    c.delete(cark.TALEP_COOKIE);
    c.delete(misafir.TALEP_COOKIE);
    c.delete(misafir.OYUN_COOKIE);
    c.delete(misafir.KONUM_COOKIE);
  }

  if (rol === "kafe_yoneticisi" || rol === "kasiyer") redirect("/kafe/giris");
  if (rol === "platform_admin" || rol === "platform_destek") redirect("/platform/giris");
  redirect("/giris");
}
