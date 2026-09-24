/**
 * Telefonda GERÇEK HIZLA test — Ü274.
 *
 * Ürün sahibi: *"site çok yavaş ve takılarak yükleniyor, sebebi ne?"*
 * Sebep geliştirme sunucusu (`next dev`): her sayfayı ilk açılışta
 * derliyor, kodu sıkıştırmıyor, React'ı geliştirme kipinde çalıştırıyor.
 * Canlıdaki hız bu değil. Bu betik **derlenmiş** uygulamayı (`next
 * build`) HTTPS ile açıyor — telefonda konum doğrulaması HTTPS istiyor
 * ve `next start`ın HTTPS seçeneği yok (yalnızca `next dev`te var).
 *
 *   npm run telefon          → derle + aç   (kod değiştiyse bu)
 *   npm run telefon:baslat   → yalnızca aç  (derleme güncelse)
 *
 * Adres: https://<bilgisayarın-ağ-adresi>:3001 — geliştirme sunucusu
 * 3000'de kalabiliyor, ikisi birbirine dokunmuyor.
 *
 * ⚠️ Sertifika geliştirme sunucusunun ürettiği (`certificates/`);
 * telefon yine "güvenli değil" uyarısı verir, beklenen.
 * ⚠️ Uygulama kipi `.env.local`teki `APP_ENV`ten geliyor (geliştirme):
 * doğrulama kodları yine ekranda. Değişen yalnızca hız.
 */
import { createServer } from "node:https";
import { readFileSync } from "node:fs";

// `next` içe aktarılmadan ÖNCE: React ve Next derleme kipini buradan okuyor.
process.env.NODE_ENV = "production";
const { default: next } = await import("next");

const port = Number(process.env.PORT ?? 3001);
const app = next({ dev: false, hostname: "0.0.0.0", port });
const handle = app.getRequestHandler();
await app.prepare();

createServer(
  {
    key: readFileSync("certificates/localhost-key.pem"),
    cert: readFileSync("certificates/localhost.pem"),
  },
  (req, res) => handle(req, res),
).listen(port, "0.0.0.0", () => {
  console.log(`> Looply · derlenmiş sürüm · https://0.0.0.0:${port}`);
});
