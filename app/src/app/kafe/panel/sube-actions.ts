"use server";

import { redirect } from "next/navigation";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { subeyeGecebilirMi } from "@/domain/cafe";
import * as oturum from "@/domain/session";
import { log } from "@/lib/log";

/**
 * Şube değiştirme (Ü101).
 *
 * ⚠️ İstemciden gelen kafe kimliği **doğrulanmadan** oturuma yazılmıyor.
 * Yazılsaydı herhangi bir yönetici, formdaki gizli alanı değiştirip başka
 * bir işletmenin paneline girerdi — Değişmez kural #3 ("cafe_id oturumdan
 * gelir") tam olarak bunu engellemek için var ve oturuma **girerken** de
 * geçerli.
 *
 * ⚠️ `staffId` de değişiyor: her şubede ayrı bir personel satırı var ve
 * denetim izi doğru satıra bağlanmalı. Yalnızca `cafeId`'yi değiştirip
 * eski `staffId`'yi bırakmak, A şubesinin personeli B şubesinde işlem
 * yapmış gibi görünmesine yol açardı.
 */
export async function subeDegistir(hedefCafeId: string): Promise<void> {
  const o = await kafeYoneticisiGerekli();

  const hedef = await subeyeGecebilirMi(o.ozneId, hedefCafeId);
  if (!hedef) {
    log.warn("yetkisiz sube degistirme denemesi");
    redirect("/kafe/panel");
  }

  await oturum.olustur({
    ozneTipi: "staff",
    ozneId: hedef.staffId,
    rol: "kafe_yoneticisi",
    cafeId: hedef.cafeId,
  });

  redirect("/kafe/panel");
}
