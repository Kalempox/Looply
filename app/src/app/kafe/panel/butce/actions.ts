"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { donemBelirle } from "@/domain/butce";
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
  return { bilgi: `Çalışma saatleri ${acilis}:00–${kapanis}:00 olarak kaydedildi.` };
}

/**
 * Haftalık bütçeyi belirler.
 *
 * `cafeId` **oturumdan** geliyor (değişmez kural #3). Form alanından gelseydi,
 * bir kafe yöneticisi başka kafenin bütçesini değiştirebilirdi.
 *
 * Kafenin onay tarihi de sunucuda okunuyor: orantılı ilk dönemin (Ü25)
 * dayanağı o tarih ve istemciden gelmemeli.
 */
export async function butceEylemi(_onceki: ButceDurumu, form: FormData): Promise<ButceDurumu> {
  const o = await kafeYoneticisiGerekli();

  const ham = String(form.get("tutar") ?? "").replace(/[^\d]/g, "");
  if (!ham) return { hata: "Bir tutar gir." };

  const tutarTl = Number(ham);
  if (!Number.isFinite(tutarTl) || tutarTl <= 0) return { hata: "Geçerli bir tutar gir." };
  if (tutarTl > 1_000_000) return { hata: "Bu tutar fazla yüksek görünüyor — kontrol et." };

  // Ü45: girilen tutar hem BUGÜNÜN dönemine yazılıyor hem de kafenin
  // varsayılan günlük bütçesi olarak saklanıyor. İkincisi olmasa kafe her
  // sabah yeniden bütçe girmek zorunda kalırdı.
  const sonuc = await donemBelirle({
    cafeId: o.cafeId,
    taahhutKurus: tutarTl * 100,
    aktorId: o.ozneId,
  });

  if (sonuc.ok) {
    await ayar.sayiYaz({
      cafeId: o.cafeId,
      anahtar: ayar.ANAHTARLAR.gunlukButce,
      deger: tutarTl * 100,
      aktorId: o.ozneId,
    });
  }

  revalidatePath("/kafe/panel/butce");
  revalidatePath("/kafe/panel");

  return sonuc.ok
    ? { bilgi: "Günlük bütçe kaydedildi. Kullanılmayan kuponun maliyeti yok — yalnızca kasada onaylanan düşer." }
    : { hata: sonuc.hata };
}
