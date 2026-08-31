import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { IsletmeSayfa, IsletmeBaslik } from "@/components/isletme";
import { OtpGirisFormu } from "@/components/otp-giris";
import { yoneticiKodGonder, yoneticiKodDogrula } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "İşletme girişi · CafePlay" };

export default async function KafeGiris() {
  const o = await oturum.oku();
  if (o?.rol === "kafe_yoneticisi") redirect("/kafe/panel");

  return (
    <IsletmeSayfa>
      <IsletmeBaslik ust="CafePlay" alt="Başvuru sırasında verdiğin yetkili numarasıyla gir.">
        İşletme girişi
      </IsletmeBaslik>

      <OtpGirisFormu
        kodGonder={yoneticiKodGonder}
        kodDogrula={yoneticiKodDogrula}
        etiket="Yetkili cep telefonu"
        ipucu="Başvuruda bildirdiğin numara"
      />

      <nav className="mt-10 border-t border-cizgi pt-6 text-[14px]">
        <Link href="/kafe/basvuru" className="underline">
          Henüz başvurmadın mı? İşletme başvurusu
        </Link>
      </nav>
    </IsletmeSayfa>
  );
}
