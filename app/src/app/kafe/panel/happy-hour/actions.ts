"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as happy from "@/domain/happy";
import { durum as butceDurumu } from "@/domain/butce";

export type HappyDurumu = { hata?: string; bilgi?: string };

/**
 * İstanbul saatiyle "bugün saat HH:MM" anını üretir.
 *
 * `new Date("2026-08-27T14:00")` sunucunun saat dilimini kullanır ve sunucu
 * UTC'de çalıştığı için pencere üç saat kayardı. Kafe "14:00" dediğinde
 * İstanbul'da 14:00 kastediyor.
 */
function istanbulSaati(gunIso: string, saat: number, dakika: number): Date {
  // Türkiye yıl boyu UTC+3; yaz saati uygulaması 2016'da kaldırıldı.
  const iso = `${gunIso}T${String(saat).padStart(2, "0")}:${String(dakika).padStart(2, "0")}:00+03:00`;
  return new Date(iso);
}

/**
 * Happy Hour penceresi açar.
 *
 * `cafeId` **oturumdan** (değişmez kural #3). Havuz tavanı kafenin
 * dağıtılabilir bütçesini aşamaz — aşsaydı ekranda duran sayı gerçekte
 * dağıtılamayacak bir vaat olurdu.
 */
export async function pencereAc(_onceki: HappyDurumu, form: FormData): Promise<HappyDurumu> {
  const o = await kafeYoneticisiGerekli();

  const baslangicHam = String(form.get("baslangic") ?? "");
  const sureHam = String(form.get("sure") ?? "");
  const havuzHam = String(form.get("havuz") ?? "").replace(/[^\d]/g, "");

  const m = /^(\d{1,2}):(\d{2})$/.exec(baslangicHam);
  if (!m) return { hata: "Başlangıç saatini seç." };

  const saat = Number(m[1]);
  const dakika = Number(m[2]);
  if (saat > 23 || dakika > 59) return { hata: "Geçerli bir saat seç." };

  const sureSaat = Number(sureHam);
  if (!Number.isFinite(sureSaat) || sureSaat < happy.EN_KISA_SAAT || sureSaat > happy.EN_UZUN_SAAT) {
    return { hata: `Süre ${happy.EN_KISA_SAAT}–${happy.EN_UZUN_SAAT} saat arasında olmalı.` };
  }

  const havuzTl = Number(havuzHam);
  if (!Number.isFinite(havuzTl) || havuzTl <= 0) return { hata: "Havuz tutarını gir." };

  const havuzKurus = Math.round(havuzTl * 100);

  const butce = await butceDurumu(o.cafeId);
  if (havuzKurus > butce.dagitilabilirKurus) {
    return {
      hata: `Havuz, dağıtılabilir bütçenden büyük olamaz (${Math.floor(
        butce.dagitilabilirKurus / 100,
      ).toLocaleString("tr-TR")} TL).`,
    };
  }

  const gun = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  const baslangic = istanbulSaati(gun, saat, dakika);
  const bitis = new Date(baslangic.getTime() + sureSaat * 3_600_000);

  const sonuc = await happy.pencereAc({
    cafeId: o.cafeId,
    baslangic,
    bitis,
    havuzKurus,
    aktorId: o.ozneId,
    gun,
  });

  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/happy-hour");
  revalidatePath("/kafe/panel");
  return { bilgi: "Pencere açıldı. Oyuncular kafedeyken havuzu görüyor." };
}

export async function pencereKapat(pencereId: string): Promise<HappyDurumu> {
  const o = await kafeYoneticisiGerekli();

  const sonuc = await happy.pencereKapat({
    cafeId: o.cafeId,
    pencereId,
    aktorId: o.ozneId,
  });
  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/happy-hour");
  return { bilgi: "Pencere kapatıldı. Kalan havuz genel bütçende — hiçbir şey kaybolmadı." };
}
