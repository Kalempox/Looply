import os from "node:os";
import type { NextConfig } from "next";

/**
 * Geliştirme sunucusuna LAN üzerinden bakılabilsin — Ü164.
 *
 * ── Neden gerekti ───────────────────────────────────────────
 *
 * Ürün sahibi ekranı `http://192.168.1.3:3000` üzerinden açıyordu
 * (telefonla da bakabilmek için). Next 16'nın geliştirme sunucusu
 * **başlatıldığı adresten** (`localhost`) farklı bir kökenden gelen
 * istekleri varsayılan olarak engelliyor: `/_next` altındaki her şeye
 * `403 Unauthorized` dönüyor ve HMR websocket'ini reddediyor
 * (`server/lib/router-utils/block-cross-site-dev.js`).
 *
 * 🔴 Belirtisi bir yapılandırma hatasına hiç benzemiyordu: sayfa
 * açılıyor, ekran doğru görünüyor, ama JavaScript'in bir kısmı hiç
 * gelmiyor ve sıcak güncelleme ölü. Kazıma ve karusel **dört tur**
 * boyunca "bozuk" diye bildirildi; her turda kodu düzelttim, her turda
 * onun sekmesi eski paketi çalıştırmaya devam etti. Kod baştan beri
 * doğruydu, ulaşmıyordu.
 *
 * ── Neden sabit IP yazılmıyor ───────────────────────────────
 *
 * `allowedDevOrigins: ["192.168.1.3"]` bugünü çözer, DHCP adresi
 * değiştirdiği gün aynı tuzağı yeniden kurar — ve belirtisi yine bu
 * kadar dolaylı olur. Makine kendi adreslerini zaten biliyor.
 *
 * ── Güvenlik ────────────────────────────────────────────────
 *
 * Bu kapı yalnızca geliştirmede var; üretimde `blockCrossSiteDEV` hiç
 * çağrılmıyor. Yine de üretimde liste **boş** bırakılıyor: yayın
 * yapılandırmasının geliştirme kolaylığı taşımaması gerekir.
 *
 * ⚠️ Korumanın asıl hedefi başka bir sitenin tarayıcıya geliştirme
 * varlıklarını çektirmesi. Öyle bir isteğin kökeni `https://kotu.site`
 * olur, makinenin kendi LAN adresi değil — yani buraya eklenen adresler
 * o korumayı zayıflatmıyor.
 */
function yerelAdresler(): string[] {
  if (process.env.NODE_ENV === "production") return [];
  return Object.values(os.networkInterfaces())
    .flatMap((arayuz) => arayuz ?? [])
    .filter((adres) => adres.family === "IPv4" && !adres.internal)
    .map((adres) => adres.address);
}

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
  /**
   * Sunucuya tek parça çıkmak için (F3).
   *
   * `.next/standalone` altında, çalışması için gereken node_modules
   * dosyalarıyla birlikte küçük bir sunucu üretiliyor. Kapta `npm install`
   * koşmuyoruz — yani kapta duran bağımlılık, derlemede sınananın aynısı.
   *
   * ⚠️ `public` ve `.next/static` bu klasöre KENDİLİĞİNDEN kopyalanmıyor;
   * Dockerfile ikisini de elle kopyalıyor. Kopyalanmazsa sayfa açılır ama
   * CSS ve görseller 404 döner.
   */
  output: "standalone",

  // pg yerel bağlantı kullanır; bundler'a değil Node'a bırakılmalı
  serverExternalPackages: ["pg"],

  // Sunucu sürümü bilgisi dışarı sızmasın
  poweredByHeader: false,

  // Geliştirmede LAN üzerinden bakılabilsin — bkz. `yerelAdresler`.
  allowedDevOrigins: yerelAdresler(),

  async headers() {
    return [{ source: "/:path*", headers: guvenlikBasliklari }];
  },
};

export default nextConfig;
