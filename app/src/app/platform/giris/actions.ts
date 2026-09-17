"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { kodIste, kodDogrula } from "@/domain/otp";
import { platformKullanicisiBul } from "@/domain/staff";
import * as oturum from "@/domain/session";
import { telefonSemasi, otpSemasi, dogrula } from "@/lib/validate";
import { normalizePhone } from "@/lib/crypto";
import type { GirisDurumu } from "@/components/otp-giris";
import { log } from "@/lib/log";
import { defteriYaz } from "@/sms/gelistirme-defteri";
import { maskele } from "@/sms";

/**
 * Platform girişi.
 *
 * ⚠️ **Eksik: ikinci faktör.** docs/08 §4.4 platform rolü için ikinci faktör
 * zorunlu diyor; şu an yalnızca telefon + SMS var, yani tek faktör.
 * TOTP eklenmesi Faz 10 sertleştirme kalemine yazıldı — canlıya bu hâliyle
 * çıkılmamalı.
 *
 * Kafe girişindeki gibi, hesabın var olup olmadığı kullanıcıya söylenmez.
 */

const KAYNAK = "Platform girişi";

export async function platformKodGonder(
  _onceki: GirisDurumu,
  form: FormData,
): Promise<GirisDurumu> {
  const ham = String(form.get("telefon") ?? "");
  const sonuc = dogrula(telefonSemasi, ham);
  if (!sonuc.ok) return { adim: "telefon", alanHatasi: "Geçerli bir cep telefonu yaz", telefon: ham };

  const telefon = normalizePhone(sonuc.veri);
  const kullanici = await platformKullanicisiBul(telefon);

  if (!kullanici) {
    log.warn("platform girisi: kayitsiz numara");
    defteriYaz({
      telefon: maskele(telefon),
      nereden: KAYNAK,
      olay: "Gönderilmedi — bu numara platform ekibinde değil",
      not: "Kullanıcıya bilerek söylenmiyor (G27)",
    });
    return { adim: "kod", telefon: ham };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? undefined;
  const istek = await kodIste({
    telefon,
    // Ü170: personelin kimliği `staff` tablosunda ve orada e-posta
    // kolonu yok. Kod e-postaya taşınırken bu iki giriş sessizce
    // kırılmıştı; kanal açıkça yazılıyor ki bir daha kaymasın.
    kanal: "sms",
    amac: "login",
    ip,
    kaynak: KAYNAK,
  });

  if (istek.durum !== "gonderildi") {
    return { adim: "telefon", hata: "Kod gönderilemedi. Biraz sonra tekrar dene.", telefon: ham };
  }

  return { adim: "kod", telefon: ham, gelistirmeKodu: istek.gelistirmeKodu };
}

export async function platformKodDogrula(
  _onceki: GirisDurumu,
  form: FormData,
): Promise<GirisDurumu> {
  const telefonHam = String(form.get("telefon") ?? "");
  const telefonAlani = dogrula(telefonSemasi, telefonHam);
  if (!telefonAlani.ok) return { adim: "telefon", hata: "Numara okunamadı" };

  const kodAlani = dogrula(otpSemasi, String(form.get("kod") ?? ""));
  if (!kodAlani.ok) {
    return { adim: "kod", alanHatasi: "Doğrulama kodu 6 rakamdır", telefon: telefonHam };
  }

  const telefon = normalizePhone(telefonAlani.veri);
  const kullanici = await platformKullanicisiBul(telefon);
  const sonuc = await kodDogrula({ telefon, kod: kodAlani.veri, amac: "login" });

  if (!kullanici || sonuc.durum !== "dogru") {
    if (sonuc.durum === "kilitlendi") {
      return { adim: "telefon", hata: "Çok fazla yanlış deneme. 15 dakika kilitlendi." };
    }
    if (sonuc.durum === "yanlis") {
      return {
        adim: "kod",
        alanHatasi: `Kod yanlış. ${sonuc.kalanDeneme} deneme hakkın kaldı.`,
        telefon: telefonHam,
      };
    }
    return { adim: "telefon", hata: "Giriş yapılamadı. Kodu tekrar iste." };
  }

  await oturum.olustur({
    ozneTipi: "platform",
    ozneId: kullanici.id,
    rol: kullanici.rol,
  });

  log.info("platform girisi", { rol: kullanici.rol });
  redirect("/platform/basvurular");
}
