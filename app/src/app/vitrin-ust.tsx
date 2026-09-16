import Link from "next/link";
import { LooplyLogo } from "@/components/logo";

/**
 * Vitrinin üst şeridi — Ü142.
 *
 * ── Neden ayrı dosya ────────────────────────────────────────
 *
 * Şerit önce yalnızca ana sayfadaydı. Simülasyon kendi sayfasına
 * çıkınca ikinci bir yere gerekti ve kopyalanması **iki başlı bir
 * marka** yaratırdı: birinde düğme metni değişir, ötekinde kalır.
 * Aynı sınıf hata Ü71'de kart yüzeyinde altı dosyaya dağılmış hâlde
 * yaşandı ve her turda bir kart geride kaldı.
 *
 * Açık oturum bandı (`MevcutOturum`) buraya **girmiyor**: o, ana
 * sayfaya özgü — oturumu olan ziyaretçiyi vitrini gezmeye zorlamamak
 * için var. Simülasyon sayfasında kimse "kaldığın yere dön" demiyor,
 * orada zaten bir hesap yapılıyor.
 */
export function VitrinUstSerit() {
  return (
    <header className="sticky top-0 z-40 border-b border-cizgi bg-yuzey/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" aria-label="Looply ana sayfa">
          <LooplyLogo boyut={21} hediye={false} />
        </Link>
        <span className="sr-only">Looply</span>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/kafe/giris"
            className="rounded-full px-3 py-2 text-[14px] font-semibold text-yazi-sonuk transition-colors hover:text-yazi sm:px-4"
          >
            Giriş yap
          </Link>
          <Link
            href="/kafe/basvuru"
            className="rounded-full bg-vurgu px-4 py-2 text-[14px] font-semibold text-yuzey transition-opacity hover:opacity-90 sm:px-5"
          >
            Kayıt ol
          </Link>
        </nav>
      </div>
    </header>
  );
}
