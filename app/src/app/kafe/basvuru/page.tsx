import Link from "next/link";
import { IsletmeSayfa, IsletmeBaslik } from "@/components/isletme";
import { BasvuruFormu } from "./form";

export const metadata = { title: "İşletme başvurusu · Looply" };

export default function BasvuruSayfasi() {
  return (
    <IsletmeSayfa>
      <IsletmeBaslik
        ust="Looply"
        alt="Masalarına karekod koy, müşterin oynasın, kazandığı indirimi kasanda kullansın. Katılım ücretsiz."
      >
        İşletme başvurusu
      </IsletmeBaslik>

      <div className="mb-8 rounded-2xl border border-cizgi bg-yuzey p-5">
        <h2 className="mb-3 etiket-caps text-yazi-sonuk">
          Katılım şartı
        </h2>
        <p className="text-[15px] leading-relaxed">
          Haftada <strong>en az 1.500 TL</strong> değerinde indirim bütçesi ayırman gerekiyor.
        </p>
        <p className="mt-2.5 text-[14px] leading-relaxed text-yazi-sonuk">
          Bu bir ödeme değil, bir üst sınır: bütçeden yalnızca{" "}
          <strong className="text-yazi">kasada onaylanan</strong> kuponlar düşer. Dağıtılıp
          kullanılmayan kuponun sana maliyeti yoktur.
        </p>
      </div>

      <BasvuruFormu />

      <nav className="mt-10 border-t border-cizgi pt-6 text-[14px]">
        <Link href="/kafe/giris" className="underline">
          Zaten başvurdun mu? Panele giriş yap
        </Link>
      </nav>
    </IsletmeSayfa>
  );
}
