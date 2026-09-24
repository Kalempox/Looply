"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { tumGunleriBelirle, gunuBelirle, GUN_ADLARI, haftaninGunu } from "@/domain/butce";
import * as ayar from "@/domain/ayar";

export type ButceDurumu = { hata?: string; bilgi?: string };

/**
 * Kafenin çalışma saatlerini kaydeder (Ü90).
 *
 * ── Neden bütçe sayfasında ──────────────────────────────────
 *
 * Saatler bir "işletme bilgisi" gibi görünüyor ama işlevi tamamen bütçeyle
 * ilgili: günlük bütçe açılıştan kapanışa kademeli açılıyor (Ü87) ve kafe
 * kapalıyken hiç ödül dağıtılmıyor (Ü90). Ayrı bir sayfaya konsaydı, kafe
 * "bütçem duruyor ama kupon çıkmıyor" dediğinde bakacağı yer başka bir
 * ekran olurdu.
 */
export async function saatEylemi(_onceki: ButceDurumu, form: FormData): Promise<ButceDurumu> {
  const o = await kafeYoneticisiGerekli();

  const acilis = Number(String(form.get("acilis") ?? ""));
  const kapanis = Number(String(form.get("kapanis") ?? ""));

  if (!Number.isInteger(acilis) || !Number.isInteger(kapanis)) {
    return { hata: "Saatleri tam sayı olarak gir." };
  }
  if (kapanis <= acilis) {
    // Gece yarısını aşan pencere desteklenmiyor; kafe kapanışını 23
    // yazmak zorunda. Bilinen sınır, docs/23'te duruyor.
    return { hata: "Kapanış saati açılıştan sonra olmalı. Gece yarısını aşan saatler henüz desteklenmiyor." };
  }

  const a = await ayar.sayiYaz({
    cafeId: o.cafeId,
    anahtar: ayar.ANAHTARLAR.acilisSaati,
    deger: acilis,
    aktorId: o.ozneId,
  });
  if (!a.ok) return { hata: a.hata };

  const k = await ayar.sayiYaz({
    cafeId: o.cafeId,
    anahtar: ayar.ANAHTARLAR.kapanisSaati,
    deger: kapanis,
    aktorId: o.ozneId,
  });
  if (!k.ok) return { hata: k.hata };

  revalidatePath("/kafe/panel/butce");
  revalidatePath("/kafe/panel");
  return { bilgi: `Çalışma saatleri ${acilis}:00–${kapanis}:00 olarak kaydedildi.` };
}

/**
 * Bütün günlerin bütçesi — Ü287.
 *
 * Ürün sahibi: *"her gün her gün bütçe belirlemek zorunda kalmasın; tüm
 * hafta için bütçe belirleme olsun."* Girilen tutar her günün tutarı olur
 * ve **özel ayarlanmış günler dahil** bütün günler ona döner (kararı). Bugün
 * de hemen değişiyor; dağıtılmış kuponların altına inilemiyor.
 *
 * Kafe kimliği ve aktör oturumdan — formdan gelseydi bir kafe yöneticisi
 * başka kafenin bütçesini değiştirebilirdi.
 */
export async function tumGunlerEylemi(_onceki: ButceDurumu, form: FormData): Promise<ButceDurumu> {
  const o = await kafeYoneticisiGerekli();
  const tutarTl = tlOku(form);
  if (tutarTl === null) return { hata: "Geçerli bir tutar gir." };

  const s = await tumGunleriBelirle({ cafeId: o.cafeId, tutarKurus: tutarTl * 100, aktorId: o.ozneId });
  if (!s.ok) return { hata: s.hata };

  revalidatePath("/kafe/panel/butce");
  revalidatePath("/kafe/panel");
  return {
    bilgi: `Bütün günler ${tutarTl.toLocaleString("tr-TR")} TL. Her gün kendiliğinden açılır — yalnızca kasada onaylanan kupon düşer.`,
  };
}

/**
 * Tek bir günün bütçesi — "yalnızca bu tarih" ya da "her <gün>" (Ü287).
 */
export async function gunEylemi(_onceki: ButceDurumu, form: FormData): Promise<ButceDurumu> {
  const o = await kafeYoneticisiGerekli();
  const tutarTl = tlOku(form);
  if (tutarTl === null) return { hata: "Geçerli bir tutar gir." };

  const gun = String(form.get("gun") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gun)) return { hata: "Gün okunamadı. Sayfayı yenile." };
  const kapsam = form.get("kapsam") === "hafta" ? "hafta" : "tarih";

  const s = await gunuBelirle({ cafeId: o.cafeId, gun, tutarKurus: tutarTl * 100, kapsam, aktorId: o.ozneId });
  if (!s.ok) return { hata: s.hata };

  revalidatePath("/kafe/panel/butce");
  revalidatePath("/kafe/panel");
  const tl = tutarTl.toLocaleString("tr-TR");
  return {
    bilgi:
      kapsam === "hafta"
        ? `Her ${GUN_ADLARI[haftaninGunu(gun) - 1]} ${tl} TL.`
        : `${gun.split("-").reverse().join(".")} için ${tl} TL — yalnızca o gün.`,
  };
}

function tlOku(form: FormData): number | null {
  const ham = String(form.get("tutar") ?? "").replace(/[^\d]/g, "");
  const tutarTl = Number(ham);
  if (!ham || !Number.isFinite(tutarTl) || tutarTl <= 0 || tutarTl > 1_000_000) return null;
  return tutarTl;
}
