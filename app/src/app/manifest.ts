import type { MetadataRoute } from "next";

/**
 * Web uygulaması bildirimi — Ü274.
 *
 * Ürün sahibi: *"ekranda altta hep linki gösteren kısım oluyor, tam
 * sayfa olmuyor, bunun da sebebi ne?"* Sebep tarayıcının kendisi:
 * Safari adres çubuğunu sayfanın içinde gösteriyor ve bir web sayfası
 * onu kapatamıyor. Tam ekranın tek yolu siteyi **Ana Ekrana eklemek** —
 * bu dosya o zaman uygulamanın Safari çubukları olmadan, kendi başına
 * (`standalone`) açılmasını sağlıyor.
 *
 * `start_url` `/oyna`: ana ekrandan açan kişi oyuncudur; vitrine
 * düşmesinin anlamı yok. Girişli değilse oradan zaten girişe gidiyor.
 *
 * ⚠️ Simgeler üretilmedi, mevcut `avatar/loopy-mutlu-512.webp`den
 * kırpıldı (altın zemin). Marka simgesi gelirse `public/simge-*.png` ve
 * `app/apple-icon.png` değiştirilecek.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Looply",
    short_name: "Looply",
    description: "Masadaki karekodu okut, oyna, kazan.",
    start_url: "/oyna",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#FAFAFA",
    icons: [
      { src: "/simge-192.png", sizes: "192x192", type: "image/png" },
      { src: "/simge-512.png", sizes: "512x512", type: "image/png" },
      { src: "/simge-maskeli-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
