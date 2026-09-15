"use server";

import { revalidatePath } from "next/cache";
import { platformGerekli } from "@/domain/yetki";
import * as ayar from "@/domain/ayar";
import { withBypass } from "@/db/context";
import { audit } from "@/lib/audit";

export type AyarDurumu = { hata?: string; bilgi?: string };

/**
 * Kafenin aktivasyon saatini platformdan değiştirir — Ü129 / Ü130.
 *
 * ── Neden platform da yazabiliyor ───────────────────────────
 *
 * Ürün sahibi: *"ödül aktivasyon saatini panelden ayarlayabilmeli, hem
 * cafe hem panel."* Kafe kendi panelinden yazıyor; platform destek
 * verirken buradan.
 *
 * ⚠️ **Yalnızca yönetici (G9).** Destek rolü kafenin ödül ekonomisine
 * dokunamaz — başvuru onaylayamadığı gibi. `platformGerekli(true)` bunu
 * zorluyor.
 *
 * ⚠️ Aynı doğrulamadan geçiyor (`ayar.sayiYaz` → `SINIRLAR`): platform
 * kafenin koyamayacağı bir değeri koyabilseydi, kafe panelinde sınır
 * dışı bir sayı görür ve kendi ekranında düzeltemezdi.
 *
 * ⚠️ Denetim izi `ayar.sayiYaz` içinde ve aktör **platform kullanıcısı**
 * olarak düşüyor — kafe sonradan "bunu ben yapmadım" derse kayıt onu
 * doğruluyor.
 */
export async function ayarEylemi(_onceki: AyarDurumu, form: FormData): Promise<AyarDurumu> {
  const o = await platformGerekli(true);

  const cafeId = String(form.get("cafeId") ?? "");
  const saat = Number(form.get("saat"));

  if (!cafeId) return { hata: "Kafe seçilmedi." };
  if (!Number.isInteger(saat)) return { hata: "Saat bir tam sayı olmalı." };

  const sonuc = await ayar.sayiYaz({
    cafeId,
    anahtar: ayar.ANAHTARLAR.ertelemeSaati,
    deger: saat,
    aktorId: o.ozneId,
  });

  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath(`/platform/kafeler/${cafeId}`);
  return { bilgi: `Aktivasyon saati ${saat} olarak kaydedildi.` };
}

export type TurDurumu = { hata?: string; bilgi?: string };

/**
 * İşletme türünü değiştirir — Ü137.
 *
 * ── Neden platform, neden işletme değil ─────────────────────
 *
 * Tür, ürünün hangi akışı çalıştıracağını belirliyor: kafede oyun,
 * butikte kasadan çark hakkı. İşletme kendi panelinden değiştirebilseydi
 * bir kafe "butik" olur, oyunları kaybolur ve neden olduğunu anlamazdı.
 *
 * Başvuru onaylanırken zaten platform bakıyor — türü de o an seçmek
 * doğru yer. Sonradan değişmesi ender bir iş ve destek işi.
 *
 * ⚠️ **Yalnızca yönetici** (G9). Destek rolü başvuru onaylayamıyor;
 * işletmenin akışını değiştirmesi hiç olmaz.
 */
export async function isletmeTuruEylemi(
  _onceki: TurDurumu,
  form: FormData,
): Promise<TurDurumu> {
  const o = await platformGerekli(true);

  const cafeId = String(form.get("cafeId") ?? "");
  const tur = String(form.get("tur") ?? "");

  if (!cafeId) return { hata: "Kafe seçilmedi." };
  if (tur !== "kafe" && tur !== "butik") return { hata: "Geçersiz işletme türü." };

  await withBypass("platform: işletme türü", async (db) => {
    await db.query(`UPDATE cafes SET isletme_turu = $2 WHERE id = $1`, [cafeId, tur]);
    await audit(db, {
      actorType: "platform",
      actorId: o.ozneId,
      cafeId,
      action: "cafe.config_update",
      targetType: "cafe",
      targetId: cafeId,
      detail: { alan: "isletme_turu", yeni: tur },
    });
  });

  revalidatePath(`/platform/kafeler/${cafeId}`);
  return { bilgi: tur === "butik" ? "İşletme artık butik." : "İşletme artık kafe." };
}
