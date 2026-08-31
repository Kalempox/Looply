import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { IsletmeSayfa, IsletmeBaslik, IsletmeUyari } from "@/components/isletme";
import { OtpGirisFormu } from "@/components/otp-giris";
import { platformKodGonder, platformKodDogrula } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Platform · CafePlay" };

export default async function PlatformGiris() {
  const o = await oturum.oku();
  if (o?.rol === "platform_admin" || o?.rol === "platform_destek") {
    redirect("/platform/basvurular");
  }

  return (
    <IsletmeSayfa>
      <IsletmeBaslik ust="CafePlay" alt="Yalnızca platform ekibi.">
        Platform girişi
      </IsletmeBaslik>

      <div className="mb-6">
        <IsletmeUyari tur="bekle">
          <strong>Eksik: ikinci faktör.</strong> Bu ekran şu an yalnızca telefon + SMS ile
          çalışıyor. Platform rolü için ikinci faktör zorunlu (docs/08 §4.4); TOTP eklenmeden
          canlıya çıkılmamalı.
        </IsletmeUyari>
      </div>

      <OtpGirisFormu kodGonder={platformKodGonder} kodDogrula={platformKodDogrula} />
    </IsletmeSayfa>
  );
}
