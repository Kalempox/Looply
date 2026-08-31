"use server";

import { z } from "zod";
import { basvuruOlustur, belgeYukle } from "@/domain/cafe";
import { telefonSemasi, isimSemasi, dogrula } from "@/lib/validate";
import { normalizePhone } from "@/lib/crypto";
import { tuket } from "@/lib/ratelimit";
import { identifierHash } from "@/lib/crypto";
import { headers } from "next/headers";

/**
 * Kafe başvurusu.
 *
 * Başvuru kabul edilmek demek değil: kafe `pending` durumunda doğuyor ve
 * platform onaylayana kadar hiçbir şey yapamıyor (G5). Karekod üretilmiyor,
 * yönetici hesabı açılmıyor, panel görünmüyor.
 */

export type BasvuruDurumu = {
  asama: "form" | "alindi";
  hatalar?: Record<string, string>;
  genelHata?: string;
  degerler?: Record<string, string>;
};

const semasi = z.object({
  ad: z.string().trim().min(2, "En az 2 harf").max(80, "En fazla 80 harf"),
  yasalAd: z.string().trim().min(2, "Ticari unvanı yaz").max(120),
  vergiNo: z
    .string()
    .trim()
    .regex(/^\d{10,11}$/, "Vergi numarası 10 veya 11 rakamdır"),
  sehir: z.string().trim().min(2, "Şehir yaz").max(40),
  adres: z.string().trim().min(10, "Açık adres yaz").max(300),
  yetkiliAdi: isimSemasi,
  yetkiliTelefon: telefonSemasi,
});

export async function basvuruGonder(
  _onceki: BasvuruDurumu,
  form: FormData,
): Promise<BasvuruDurumu> {
  const degerler = Object.fromEntries(
    ["ad", "yasalAd", "vergiNo", "sehir", "adres", "yetkiliAdi", "yetkiliTelefon"].map((k) => [
      k,
      String(form.get(k) ?? ""),
    ]),
  );

  const sonuc = dogrula(semasi, degerler);
  if (!sonuc.ok) return { asama: "form", hatalar: sonuc.hatalar, degerler };

  // Sahte başvuru seli olmasın
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "bilinmeyen";
  const kota = await tuket("request_per_ip_minute", identifierHash(ip).subarray(0, 8).toString("hex"));
  if (!kota.izinli) {
    return { asama: "form", genelHata: "Çok fazla deneme. Biraz sonra tekrar dene.", degerler };
  }

  const belge = form.get("belge");
  if (!(belge instanceof File) || belge.size === 0) {
    return {
      asama: "form",
      hatalar: { belge: "Vergi levhası veya işletme belgesi yüklemen gerekiyor" },
      degerler,
    };
  }

  const telefon = normalizePhone(sonuc.veri.yetkiliTelefon);

  const olusan = await basvuruOlustur({
    ad: sonuc.veri.ad,
    yasalAd: sonuc.veri.yasalAd,
    vergiNo: sonuc.veri.vergiNo,
    sehir: sonuc.veri.sehir,
    adres: sonuc.veri.adres,
    yetkiliAdi: sonuc.veri.yetkiliAdi,
    yetkiliTelefon: telefon,
  });

  if ("hata" in olusan) {
    return {
      asama: "form",
      genelHata:
        olusan.hata === "telefon_kayitli"
          ? "Bu telefon numarası başka bir işletmede kayıtlı. Farklı bir yetkili numarası kullan."
          : "Başvuru oluşturulamadı. Biraz sonra tekrar dene.",
      degerler,
    };
  }

  const yukleme = await belgeYukle(olusan.cafeId, "tax_certificate", belge);
  if (!yukleme.ok) {
    return { asama: "form", hatalar: { belge: yukleme.hata }, degerler };
  }

  return { asama: "alindi" };
}
