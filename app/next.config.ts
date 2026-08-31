import type { NextConfig } from "next";

/**
 * Güvenlik başlıkları — docs/07 §2.5.
 * Statik oldukları için proxy.ts'te değil burada duruyorlar.
 */
const guvenlikBasliklari = [
  // Tarayıcı, içerik türünü tahmin etmeye çalışmasın
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Başka sitelere giderken tam adres sızmasın
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Kullanılmayan tarayıcı yetenekleri kapalı.
  // Konum ve kamera açık: K2 doğrulaması ve karekod okuma bunlara dayanıyor.
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()",
  },

  // Sayfa başka bir sitenin içine gömülemez (tıklama hırsızlığı)
  { key: "X-Frame-Options", value: "DENY" },

  // HTTPS zorunlu. Konum izni de zaten HTTPS istiyor.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },

  // İçerik güvenliği. Faz 4'te satır içi script'ler için nonce'a geçilecek.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // pg yerel bağlantı kullanır; bundler'a değil Node'a bırakılmalı
  serverExternalPackages: ["pg"],

  // Sunucu sürümü bilgisi dışarı sızmasın
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: guvenlikBasliklari }];
  },
};

export default nextConfig;
