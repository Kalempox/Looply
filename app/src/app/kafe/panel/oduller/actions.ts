"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as katalog from "@/domain/katalog";
import * as ayar from "@/domain/ayar";

/**
 * `sira`: her BAŞARILI kaydetmede artan sayaç (Ü94).
 *
 * Ad düzeltme kutusunun kapanma anını buradan okuyor. Mesaj metnine
 * bakmak yetmezdi — arka arkaya iki düzeltmede metin aynı çıkıyor ve
 * kutu ikincisinde kapanmıyordu.
 */
export type OdulDurumu = { hata?: string; bilgi?: string; sira?: number };

function sayi(form: FormData, alan: string): number {
  return Number(String(form.get(alan) ?? "").replace(/[^\d]/g, ""));
}

export async function ekleEylemi(_onceki: OdulDurumu, form: FormData): Promise<OdulDurumu> {
  const o = await kafeYoneticisiGerekli();

  const tip = String(form.get("tip") ?? "product") as katalog.OdulTipi;
  if (tip !== "product" && tip !== "percent" && tip !== "amount") {
    return { hata: "Geçersiz ödül tipi." };
  }

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
    // Ü52: puanla satın alma kalktı, her ödül oyunlardan/çarktan düşüyor.
    // İkisi de artık sabit; `katalog.ekle` zaten yok sayıyor ama imza
    // korunuyor.
    puanFiyati: 0,
    anlik: true,
    urunId,
    aktorId: o.ozneId,
  });

  revalidatePath("/kafe/panel/oduller");
  return sonuc.ok ? { bilgi: "Ödül eklendi. Oyun sonunda ve çarkta çıkabilir." } : { hata: sonuc.hata };
}

/**
 * Ödülün adını düzeltir (Ü94).
 *
 * Yazım hatasının bedeli ödülün geçmişini kaybetmek olmamalı — bugüne kadar
 * tek çare ödülü yayından kaldırıp yenisini eklemekti ve hata sahada zaten
 * yaşandı ("ize amreicano", Ü75). Değer ve tip burada değişmiyor; yalnızca
 * ad ve açıklama.
 */
export async function adEylemi(onceki: OdulDurumu, form: FormData): Promise<OdulDurumu> {
  const o = await kafeYoneticisiGerekli();

  const sonuc = await katalog.adDegistir({
    cafeId: o.cafeId,
    odulId: String(form.get("odulId") ?? ""),
    baslik: String(form.get("baslik") ?? ""),
    aciklama: String(form.get("aciklama") ?? ""),
    aktorId: o.ozneId,
  });

  if (!sonuc.ok) return { hata: sonuc.hata, sira: onceki.sira };

  revalidatePath("/kafe/panel/oduller");
  return {
    sira: (onceki.sira ?? 0) + 1,
    bilgi: sonuc.etkilenenKupon
      ? `Ad düzeltildi. Dolaşımdaki ${sonuc.etkilenenKupon} kupon da yeni adı gösteriyor.`
      : "Ad düzeltildi.",
  };
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

/**
 * Çarkın üst sınırı (Ü49).
 *
 * Çark ödülleri kafenin günlük havuzundan çıkıyor ama havuz **tek bir
 * ödülün** büyüklüğünü sınırlamıyor. Bu ayar onu sınırlıyor: üstündeki
 * anlık ödüller katalogda kalıyor ve oyun içi anlık ödül olarak çıkmaya
 * devam ediyor, yalnızca çarkın listesine girmiyorlar.
 */
export async function carkSiniriEylemi(
  _onceki: EsikDurumu,
  form: FormData,
): Promise<EsikDurumu> {
  const o = await kafeYoneticisiGerekli();

  const tl = sayi(form, "sinir");
  const sonuc = await ayar.sayiYaz({
    cafeId: o.cafeId,
    anahtar: ayar.ANAHTARLAR.carkUstSinir,
    deger: tl * 100,
    aktorId: o.ozneId,
  });

  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/oduller");
  return { bilgi: `Çarkta en fazla ${tl.toLocaleString("tr-TR")} TL değerinde ödül çıkacak.` };
}
