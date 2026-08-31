import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";

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

  if (rol === "kafe_yoneticisi" || rol === "kasiyer") redirect("/kafe/giris");
  if (rol === "platform_admin" || rol === "platform_destek") redirect("/platform/giris");
  redirect("/giris");
}
