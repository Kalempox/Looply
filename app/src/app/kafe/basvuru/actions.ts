"use server";

import { z } from "zod";
import { basvuruOlustur } from "@/domain/cafe";
import { telefonSemasi, isletmeTelefonSemasi, isimSemasi, dogrula } from "@/lib/validate";
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

/**
 * Ü126: dört alan + şehir.
 *
 * Kalkanlar: ticari unvan, vergi numarası, açık adres, vergi levhası.
 * Kafenin yeri onay sonrası konum ekranında koordinatla belirleniyor —
 * K2'yi doğrulayan o, serbest metin adres değil.
 */
const semasi = z.object({
  ad: z.string().trim().min(2, "En az 2 harf").max(80, "En fazla 80 harf"),
  sehir: z.string().trim().min(2, "Şehir yaz").max(40),
  yetkiliAdi: isimSemasi,
  isletmeTelefonu: isletmeTelefonSemasi,
  yetkiliTelefon: telefonSemasi,
});

export async function basvuruGonder(
  _onceki: BasvuruDurumu,
  form: FormData,
): Promise<BasvuruDurumu> {
  const degerler = Object.fromEntries(
    ["ad", "sehir", "yetkiliAdi", "isletmeTelefonu", "yetkiliTelefon"].map((k) => [
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

  const telefon = normalizePhone(sonuc.veri.yetkiliTelefon);

  const olusan = await basvuruOlustur({
    ad: sonuc.veri.ad,
    sehir: sonuc.veri.sehir,
    yetkiliAdi: sonuc.veri.yetkiliAdi,
    isletmeTelefonu: sonuc.veri.isletmeTelefonu,
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

  return { asama: "alindi" };
}
