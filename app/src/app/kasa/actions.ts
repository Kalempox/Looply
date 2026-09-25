"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { kasiyerGerekli } from "@/domain/yetki";
import * as kupon from "@/domain/kupon";

/**
 * Kasa eylemleri.
 *
 * İkisinde de `cafeId` **kasiyer oturumundan** geliyor (değişmez kural #3).
 * Formdan gelseydi, bir kasiyer başka kafenin kuponunu onaylayabilirdi.
 *
 * `staffId` de oturumdan: `redeemed_by_staff_id` NOT NULL ve o alan
 * "kim onayladı" sorusunun tek cevabı. İstemciden gelen bir personel
 * kimliği, o cevabı uydurulabilir kılardı.
 */

export async function cozEylemi(girdi: string): Promise<kupon.KasaGorunumu> {
  const o = await kasiyerGerekli();
  return kupon.coz(o.cafeId, girdi);
}

export async function onaylaEylemi(
  kuponId: string,
  gerceklesenTl?: number,
): Promise<kupon.OnaySonucu> {
  const o = await kasiyerGerekli();

  const sonuc = await kupon.onayla({
    cafeId: o.cafeId,
    kuponId,
    staffId: o.ozneId,
    gerceklesenKurus:
      gerceklesenTl != null && Number.isFinite(gerceklesenTl)
        ? Math.round(gerceklesenTl * 100)
        : undefined,
  });

  revalidatePath("/kasa");
  return sonuc;
}

export async function cikisEylemi(): Promise<void> {
  await oturum.kapat("kasiyer_cikisi");
  redirect("/kasa/giris");
}
