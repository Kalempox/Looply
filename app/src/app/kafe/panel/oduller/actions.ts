"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as katalog from "@/domain/katalog";
import * as carkAgirlik from "@/domain/cark-agirlik";
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
 * Erteleme eşiği — bu tutarın üstündeki ödül 12 saat sonra açılır (Ü28, Ü97).
 *
 * Kafenin ayarı, platformun değil: ödül ekonomisi kafeden kafeye değişiyor.
 * E6'nın kanıt kademesi buradan **etkilenmiyor** — kafe kendi ödülünün kanıt
 * şartını gevşetebilseydi, en pahalı ödülü en zayıf kanıtla vermenin yolu
 * açılırdı.
 */
export async function esikEylemi(_onceki: EsikDurumu, form: FormData): Promise<EsikDurumu> {
  const o = await kafeYoneticisiGerekli();

  const tl = sayi(form, "esik");
  const saat = sayi(form, "saat");

  const esikSonucu = await ayar.sayiYaz({
    cafeId: o.cafeId,
    anahtar: ayar.ANAHTARLAR.ertelemeEsigi,
    deger: tl * 100,
    aktorId: o.ozneId,
  });
  if (!esikSonucu.ok) return { hata: esikSonucu.hata };

  // Ü129: aktivasyon saati de kafenin ayarı. İki alan **tek formda ve tek
  // eylemde**: ayrı kaydedilselerdi kafe eşiği değiştirip saati eski
  // bırakabilir ve panelde gördüğü cümle ("35 TL üstü 12 saat sonra")
  // yarısı yeni yarısı eski bir kural anlatırdı.
  const saatSonucu = await ayar.sayiYaz({
    cafeId: o.cafeId,
    anahtar: ayar.ANAHTARLAR.ertelemeSaati,
    deger: saat,
    aktorId: o.ozneId,
  });
  if (!saatSonucu.ok) return { hata: saatSonucu.hata };

  revalidatePath("/kafe/panel/oduller");
  return {
    bilgi:
      tl === 0
        ? `Artık her ödül ${saat} saat sonra açılıyor.`
        : `${tl.toLocaleString("tr-TR")} TL üstündeki ödüller ${saat} saat sonra açılacak.`,
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

/**
 * Günlük adet limiti ve kullanım penceresi (Ü103).
 *
 * ⚠️ Boş alan **sınırsız** demek, sıfır değil. Sıfır kabul etseydik
 * "günde 0 kupon" diye bir ödül kurulabilir, ödül sessizce ölürdü ve kafe
 * neden hiç çıkmadığını aramakla uğraşırdı.
 */
export async function sinirEylemi(onceki: OdulDurumu, form: FormData): Promise<OdulDurumu> {
  const o = await kafeYoneticisiGerekli();

  const ham = (alan: string) => String(form.get(alan) ?? "").replace(/[^\d]/g, "");
  const sayiVeyaBos = (alan: string) => (ham(alan) ? Number(ham(alan)) : null);

  // Seçilmemiş gün kutusu = o gün kapalı. Hiç kutu yoksa kısıt yok.
  const gunler = form.getAll("gun").map((g) => Number(String(g)));

  const sonuc = await katalog.siniriDegistir({
    cafeId: o.cafeId,
    odulId: String(form.get("odulId") ?? ""),
    gunlukLimit: sayiVeyaBos("gunlukLimit"),
    gunler: gunler.length > 0 && gunler.length < 7 ? gunler : null,
    baslangicSaati: sayiVeyaBos("baslangicSaati"),
    bitisSaati: sayiVeyaBos("bitisSaati"),
    aktorId: o.ozneId,
  });

  if (!sonuc.ok) return { hata: sonuc.hata, sira: onceki.sira };

  revalidatePath("/kafe/panel/oduller");
  return { sira: (onceki.sira ?? 0) + 1, bilgi: "Sınırlar kaydedildi." };
}

/* ── Çark olasılıkları (Ü110) ──────────────────────────────── */

export type AgirlikDurumu = { hata?: string };

/**
 * Bir ödülün çarkta çıkma **yüzdesini** yazar (Ü124).
 *
 * `cafeId` **oturumdan** (değişmez kural #3). Yüzde istemciden geliyor
 * ve gelmeli — para değeri taşımıyor, yalnızca dağılımı belirliyor ve
 * aralık dışı değer domain tarafından reddediliyor.
 *
 * ⚠️ Yolu iki sayfa kullanıyor: ayar `/kafe/panel/cark`ta ama ödül
 * listesi `/kafe/panel/oduller`daki sayacı da besliyor — ikisi birden
 * tazeleniyor.
 */
export async function agirlikEylemi(
  _onceki: AgirlikDurumu,
  form: FormData,
): Promise<AgirlikDurumu> {
  const o = await kafeYoneticisiGerekli();

  const ham = String(form.get("agirlik") ?? "").replace(/[^\d]/g, "");
  if (ham === "") return { hata: "Bir yüzde yaz — 0 yazarsan bu ödül çarkta çıkmaz." };

  const sonuc = await carkAgirlik.yaz({
    cafeId: o.cafeId,
    odulId: String(form.get("odulId") ?? ""),
    yuzde: Number(ham),
    aktorId: o.ozneId,
  });

  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/cark");
  revalidatePath("/kafe/panel/oduller");
  return {};
}

/** Bütün yüzdeleri otomatiğe döndürür. */
export async function otomatikEylemi(): Promise<AgirlikDurumu> {
  const o = await kafeYoneticisiGerekli();
  const sonuc = await carkAgirlik.otomatigeDon({ cafeId: o.cafeId, aktorId: o.ozneId });
  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/cark");
  revalidatePath("/kafe/panel/oduller");
  return {};
}
