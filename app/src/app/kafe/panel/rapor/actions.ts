"use server";

import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { disaAktar, goruntulemeyiKaydet, buHafta, gecenHafta } from "@/domain/rapor";

/**
 * Rapor dışa aktarma.
 *
 * Dosya binadan çıkıyor — e-postayla dolaşıyor, muhasebeciye gidiyor. Bu
 * yüzden iki şey birden yapılıyor: mahremiyet eşiği çıktıda da uygulanıyor
 * (Ü30, `disaAktar` içinde) ve **her dışa aktarma denetim izine düşüyor**.
 */
export async function disaAktarEylemi(hafta: "bu" | "gecen"): Promise<string> {
  const o = await kafeYoneticisiGerekli();
  const aralik = hafta === "gecen" ? gecenHafta() : buHafta();

  await goruntulemeyiKaydet({
    cafeId: o.cafeId,
    aktorId: o.ozneId,
    aralik,
    disaAktarma: true,
  });

  return disaAktar(o.cafeId, aralik);
}
