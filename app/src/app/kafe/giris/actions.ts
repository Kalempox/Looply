"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { kodIste, kodDogrula } from "@/domain/otp";
import { yoneticiBul } from "@/domain/cafe";
import * as oturum from "@/domain/session";
import { telefonSemasi, otpSemasi, dogrula } from "@/lib/validate";
import { normalizePhone } from "@/lib/crypto";
import type { GirisDurumu } from "@/components/otp-giris";
import { log } from "@/lib/log";
import { defteriYaz } from "@/sms/gelistirme-defteri";
import { maskele } from "@/sms";

/**
 * Kafe yöneticisi girişi — telefon + SMS (docs/08 §4.6).
 *
 * 🔴 Hesabın var olup olmadığı KULLANICIYA SÖYLENMEZ. Kayıtsız numaraya da
 * "kod gönderildi" denir (ama gönderilmez). Aksi halde bu ekran, hangi
 * numaraların sistemde kafe yöneticisi olduğunu sorgulamaya yarayan bir
 * araca dönüşürdü.
 */

const KAYNAK = "Kafe paneli girişi";

export async function yoneticiKodGonder(
  _onceki: GirisDurumu,
  form: FormData,
): Promise<GirisDurumu> {
  const ham = String(form.get("telefon") ?? "");
  const sonuc = dogrula(telefonSemasi, ham);
  if (!sonuc.ok) {
    return { adim: "telefon", alanHatasi: "Geçerli bir cep telefonu yaz", telefon: ham };
  }

  const telefon = normalizePhone(sonuc.veri);
  const yonetici = await yoneticiBul(telefon);

  if (!yonetici) {
    // Sessizce geç: kod istenmiş gibi davran, kod gönderme.
    log.warn("kafe girisi: kayitsiz numara");
    defteriYaz({
      telefon: maskele(telefon),
      nereden: KAYNAK,
      olay: "Gönderilmedi — bu numara onaylı bir kafenin yöneticisi değil",
      not: "Kullanıcıya bilerek söylenmiyor (G27)",
    });
    return {
      adim: "kod",
      telefon: ham,
    };
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
    const mesaj =
      istek.durum === "kilitli"
        ? "Bu numara geçici olarak kilitlendi. 15 dakika sonra tekrar dene."
        : istek.durum === "cok_sik"
          ? "Çok sık denendi, biraz sonra tekrar dene."
          : "Kod gönderilemedi. Biraz sonra tekrar dene.";
    return { adim: "telefon", hata: mesaj, telefon: ham };
  }

  return { adim: "kod", telefon: ham, gelistirmeKodu: istek.gelistirmeKodu };
}

export async function yoneticiKodDogrula(
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
  const yonetici = await yoneticiBul(telefon);

  const sonuc = await kodDogrula({ telefon, kod: kodAlani.veri, amac: "login" });

  // Kayıtsız numarada da doğrulama çalıştırılıyor ki cevap süresi
  // "hesap var mı" sorusunu ele vermesin.
  if (!yonetici || sonuc.durum !== "dogru") {
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
    ozneTipi: "staff",
    ozneId: yonetici.staffId,
    rol: "kafe_yoneticisi",
    cafeId: yonetici.cafeId,
  });

  log.info("kafe yoneticisi giris yapti");
  redirect("/kafe/panel");
}
