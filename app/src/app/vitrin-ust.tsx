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
 *
 * ── Bölüm menüsü — Ü220 ─────────────────────────────────────
 *
 * Ürün sahibinin içerik listesinde üst menü vardı ve bizde yoktu.
 * Sayfa yirmi bine yakın piksel: ziyaretçinin "damga kartı ne oluyor"
 * ya da "ölçüm nasıl" sorusuyla gelip ilgili bölümü **kaydırarak**
 * araması gerekiyordu.
 *
 * ⚠️ Adresler `/#...` ile **mutlak**, `#...` ile değil: bu şerit
 * simülasyon sayfasında da duruyor ve oradaki `#damga` hiçbir yere
 * gitmez. Mutlak adres iki sayfada da doğru çalışıyor.
 *
 * ⚠️ Ü228: *"Sorun"* durağı çıktı çünkü bölümün kendisi kaldırıldı.
 * Hedefi olmayan bir menü bağlantısı, tıklayanı sayfanın ortasına
 * atardı — kırık bağlantıdan daha kötü, çünkü kırıldığı belli olmuyor.
 *
 * ⚠️ Menü dar ekranda GİZLİ (`hidden lg:flex`). Altı bağlantı 375
 * pikselde ya ikinci satıra sarkar ya da okunmaz hâle gelir; şeridin
 * asıl işi iki kapıyı (giriş · kayıt) her an açık tutmak. Referansın
 * mobil hâli de aynı kararı vermiş.
 */

/** Menüdeki duraklar — hedefleri bölümlerin `id`'leri. */
const DURAKLAR = [
  { ad: "Nasıl çalışır?", hedef: "/#nasil-calisir" },
  { ad: "Damga kartı", hedef: "/#damga" },
  { ad: "Aklından geçenler", hedef: "/#itirazlar" },
  { ad: "Ek satış", hedef: "/#ek-satis" },
  { ad: "Ölçüm", hedef: "/#olcum" },
  { ad: "SSS", hedef: "/#sss" },
];

export function VitrinUstSerit() {
  return (
    <header className="sticky top-0 z-40 border-b border-cizgi bg-yuzey/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" aria-label="Looply ana sayfa">
          <LooplyLogo boyut={21} hediye={false} />
        </Link>
        <span className="sr-only">Looply</span>

        <nav
          aria-label="Bölümler"
          className="hidden min-w-0 flex-1 items-center justify-center gap-4 lg:flex xl:gap-6"
        >
          {DURAKLAR.map((d) => (
            <Link
              key={d.hedef}
              href={d.hedef}
              className="shrink-0 text-[13px] font-medium whitespace-nowrap text-yazi-sonuk transition-colors hover:text-yazi xl:text-[14px]"
            >
              {d.ad}
            </Link>
          ))}
        </nav>

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
