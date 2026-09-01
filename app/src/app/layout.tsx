import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { kodEkrandaGosterilir } from "@/sms";

/**
 * İki aile, altı stil (Ü31).
 *
 * `latin-ext` alt kümesi şart: onsuz İ ı Ğ ğ Ş ş yedek fonta düşer ve
 * Türkçe metin ekranın ortasında aile değiştirir.
 *
 * `next/font/google` fontu derleme sırasında indirip kendi sunucumuzdan
 * servis ediyor — canlıda `fonts.googleapis.com`'a istek gitmiyor. Bu bir
 * hız tercihi değil: kimin hangi sayfayı ne zaman açtığı üçüncü tarafa
 * sızmasın diye.
 */
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CafePlay",
  description: "Masadaki karekodu okut, oyna, kazan.",
};

export const viewport: Viewport = {
  themeColor: "#FAFAFA",
  width: "device-width",
  initialScale: 1,
  // `maximumScale` bilerek yok: parmakla büyütmeyi kapatmak erişilebilirliği
  // kırıyor ve iOS Safari'de zaten yok sayılıyor.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Font değişkenleri `<html>`de: Tailwind'in `@theme` bloğu `--font-body`yi
    // `:root` üstünde tanımlıyor ve orada `var(--font-outfit)` çözülebilmeli.
    // Değişkenler `<body>`de kalırsa zincir `:root`ta kopuyor ve **bütün metin**
    // tarayıcı varsayılanına (Times) düşüyor.
    <html lang="tr" className={`${outfit.variable} ${mono.variable}`}>
      <body>
        {children}
        <GelistirmeRozeti />
      </body>
    </html>
  );
}

/**
 * Geliştirme rozeti — her ekranın köşesinde, doğrulama kodlarına kısayol.
 *
 * Canlıda hiç render edilmez: `kodEkrandaGosterilir()` iki şart birden arıyor
 * (APP_ENV canlı değil **ve** sahte SMS sağlayıcısı) ve canlıda ikisi
 * birlikte sağlanamıyor. Bilerek ürün paletinin biraz dışında duruyor —
 * kimse onu arayüzün parçası sanmasın.
 */
function GelistirmeRozeti() {
  if (!kodEkrandaGosterilir()) return null;

  return (
    <nav
      aria-label="Geliştirme araçları"
      /* Alt gezinme şeridinin ÜSTÜNDE duruyor. Oyuncu ve işletme
         taraflarının ikisinde de sabit bir şerit var (`bottom-0`,
         yaklaşık 64px) ve rozet `bottom-3` iken onları kapatıyordu. */
      className="fixed right-3 bottom-20 z-50 flex gap-1.5 etiket-caps"
    >
      <Link
        href="/"
        className="rounded border border-vurgu/40 bg-yuzey/95 px-2.5 py-1.5 text-vurgu backdrop-blur"
      >
        Başlangıç
      </Link>
      <Link
        href="/gelistirme"
        className="rounded border border-odul/50 bg-yuzey/95 px-2.5 py-1.5 text-odul-koyu backdrop-blur"
      >
        Kodlar
      </Link>
      <a
        href="/cikis"
        className="rounded border border-cizgi bg-yuzey/95 px-2.5 py-1.5 text-yazi-sonuk backdrop-blur"
      >
        Çıkış
      </a>
    </nav>
  );
}
