"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as katalog from "@/domain/katalog";
import * as ayar from "@/domain/ayar";

export type OdulDurumu = { hata?: string; bilgi?: string };

function sayi(form: FormData, alan: string): number {
  return Number(String(form.get(alan) ?? "").replace(/[^\d]/g, ""));
}

export async function ekleEylemi(_onceki: OdulDurumu, form: FormData): Promise<OdulDurumu> {
  const o = await kafeYoneticisiGerekli();

  const tip = String(form.get("tip") ?? "product") as katalog.OdulTipi;
  if (tip !== "product" && tip !== "percent" && tip !== "amount") {
    return { hata: "Geçersiz ödül tipi." };
  }

  const anlik = form.get("anlik") === "evet";
  const urunId = String(form.get("urunId") ?? "") || undefined;

  const sonuc = await katalog.ekle({
    cafeId: o.cafeId,
    tip,
    baslik: String(form.get("baslik") ?? ""),
    aciklama: String(form.get("aciklama") ?? ""),
    // Ürün ödülünde TL değeri, yüzdelide TL TAVANI (Ü17), tutar indiriminde
    // indirimin kendisi — üçü de aynı alan.
    maliyetKurus: sayi(form, "tutar") * 100,
    yuzde: tip === "percent" ? sayi(form, "yuzde") : undefined,
    puanFiyati: sayi(form, "puan"),
    anlik,
    urunId,
    aktorId: o.ozneId,
  });

  revalidatePath("/kafe/panel/oduller");
  return sonuc.ok ? { bilgi: "Ödül kataloğa eklendi." } : { hata: sonuc.hata };
}

export async function durumEylemi(odulId: string, aktif: boolean): Promise<void> {
  const o = await kafeYoneticisiGerekli();
  await katalog.durumDegistir({ cafeId: o.cafeId, odulId, aktif, aktorId: o.ozneId });
  revalidatePath("/kafe/panel/oduller");
}

export type EsikDurumu = { hata?: string; bilgi?: string };

/**
 * Erteleme eşiği — bu tutarın üstündeki ödül 24 saat sonra açılır (Ü28).
 *
 * Kafenin ayarı, platformun değil: ödül ekonomisi kafeden kafeye değişiyor.
 * E6'nın kanıt kademesi buradan **etkilenmiyor** — kafe kendi ödülünün kanıt
 * şartını gevşetebilseydi, en pahalı ödülü en zayıf kanıtla vermenin yolu
 * açılırdı.
 */
export async function esikEylemi(_onceki: EsikDurumu, form: FormData): Promise<EsikDurumu> {
  const o = await kafeYoneticisiGerekli();

  const tl = sayi(form, "esik");
  const sonuc = await ayar.sayiYaz({
    cafeId: o.cafeId,
    anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
    deger: tl * 100,
    aktorId: o.ozneId,
  });

  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/oduller");
  return {
    bilgi:
      tl === 0
        ? "Artık her ödül 24 saat sonra açılıyor."
        : `${tl.toLocaleString("tr-TR")} TL üstündeki ödüller 24 saat sonra açılacak.`,
  };
}
