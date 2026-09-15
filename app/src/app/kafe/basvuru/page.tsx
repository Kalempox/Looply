import Link from "next/link";
import { IsletmeSayfa, IsletmeBaslik } from "@/components/isletme";
import { BasvuruFormu } from "./form";

export const metadata = { title: "İşletme başvurusu · Looply" };

/**
 * 🔴 "Katılım şartı" bloğu KALDIRILDI — ürün sahibinin kararı.
 *
 * Blok *"Günde en az 1.500 TL değerinde indirim bütçesi ayırman gerekiyor"*
 * diyordu ve sayıyı `domain/butce.ts`'ten okuyordu (Ü45'te haftalıktan güne
 * çevrilmişti; metin sabit yazılmış olsaydı yedi kat ayrışırdı).
 *
 * ⚠️ **Şart kalkmadı, yalnızca bu sayfadaki duyurusu kalktı.**
 * `GUNLUK_TABAN_KURUS` ve `budget_periods` kısıtı yerinde: kafe paneli
 * açtığında tabanın altına hâlâ inemiyor. Yani başvuran kişi sayıyı ilk
 * kez panelde görecek — Ü45'te tam olarak bu ayrışma sorun olmuştu.
 * Bütçe taban kuralı da kalkacaksa ayrı bir iş (`domain/butce.ts`).
 */
export default function BasvuruSayfasi() {
  return (
    <IsletmeSayfa>
      <IsletmeBaslik
        ust="Looply"
        alt="Karekodunu as, müşterin oynasın, kazandığı indirimi kasanda kullansın."
      >
        İşletme başvurusu
      </IsletmeBaslik>

      <BasvuruFormu />

      <nav className="mt-10 border-t border-cizgi pt-6 text-[14px]">
        <Link href="/kafe/giris" className="underline">
          Zaten başvurdun mu? Panele giriş yap
        </Link>
      </nav>
    </IsletmeSayfa>
  );
}
