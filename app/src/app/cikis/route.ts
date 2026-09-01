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

export async function GET() {
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
