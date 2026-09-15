import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
  title: "Looply",
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

/*
 * ── Köşedeki geliştirme rozeti KALDIRILDI (Ü123) ────────────
 *
 * Her ekranın sağ alt köşesinde "Başlangıç · Kodlar · Çıkış" şeridi
 * duruyordu. Ürün sahibi kaldırılmasını istedi ve kimseyi ortada
 * bırakmıyor: doğrulama kodu zaten giriş formunun içinde görünüyor
 * (`components/otp-giris.tsx`), kod defterinin kendisi `/gelistirme`
 * adresinde duruyor ve çıkış her panelde kendi yerinde.
 *
 * Şerit geliştirirken kolaylıktı ama ürünü değerlendiren birinin
 * ekranında iskele gibi duruyordu — üstelik panelin alt gezinme
 * şeridiyle sürekli yer kavgası ediyordu.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Font değişkenleri `<html>`de: Tailwind'in `@theme` bloğu `--font-body`yi
    // `:root` üstünde tanımlıyor ve orada `var(--font-outfit)` çözülebilmeli.
    // Değişkenler `<body>`de kalırsa zincir `:root`ta kopuyor ve **bütün metin**
    // tarayıcı varsayılanına (Times) düşüyor.
    <html lang="tr" className={`${outfit.variable} ${mono.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
