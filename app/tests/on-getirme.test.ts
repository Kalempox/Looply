import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * 🔴 "ÖN GETİRME YAN ETKİYİ TETİKLİYOR" SINIFI.
 *
 * ── Yaşanan arıza ───────────────────────────────────────────
 *
 * `/cikis` bir GET route'u ve oturumu kapatıyor. Panelin menüsünde ve
 * oyuncunun ana ekranında ona `<Link>` ile bağlanılıyordu. Next, `<Link>`
 * hedeflerini **üretim derlemesinde** görünür olur olmaz önceden getiriyor:
 * kullanıcı paneli açıyor, kimse hiçbir şeye tıklamadan oturumu kapanıyordu.
 *
 * ⚠️ **`npm run dev` bu arızayı göstermiyor** — geliştirme sunucusu ön
 * getirme yapmıyor. Yani hata, yerelde ne kadar denenirse denensin
 * görünmüyor ve ilk sunucuya çıkışta ortaya çıkıyor. Demo kabı kurulurken
 * (F3) böyle bulundu.
 *
 * ── Neden iki katman ────────────────────────────────────────
 *
 * `app/cikis/route.ts` artık ön getirme isteklerini yok sayıyor; bu, asıl
 * koruma. Bu test ikinci katman: yan etkisi olan bir adrese `<Link>` ile
 * bağlanmayı en baştan engelliyor. Yalnızca route'taki kapı olsaydı,
 * ileride yan etkili ikinci bir GET adresi yazıldığında kimse hatırlamazdı.
 *
 * Tarama `src/app` altındaki bütün `.tsx` dosyalarında `<Link ... href="…">`
 * arıyor ve hedefi yan etkili listedeyse kırılıyor.
 */

const KOK = path.join(process.cwd(), "src/app");

/**
 * GET ile çağrıldığında durum değiştiren adresler.
 *
 * ⚠️ Bu listeye ekleme yapmak yerine, mümkünse adresi yan etkisiz hâle
 * getirin. Yan etkili GET'in kendisi bir tasarım borcu; liste onu
 * görünür tutuyor, meşrulaştırmıyor.
 */
const YAN_ETKILI: Record<string, string> = {
  "/cikis": "oturumu kapatıyor (app/cikis/route.ts)",
};

function tsxDosyalari(dizin: string): string[] {
  const cikti: string[] = [];
  const gez = (d: string) => {
    for (const ad of readdirSync(d)) {
      const p = path.join(d, ad);
      if (statSync(p).isDirectory()) gez(p);
      else if (ad.endsWith(".tsx")) cikti.push(p);
    }
  };
  gez(dizin);
  return cikti;
}

describe("ön getirme yan etki tetiklemiyor", () => {
  test("🔴 yan etkili adrese <Link> ile bağlanılmıyor", () => {
    // `<Link` ile başlayıp ilk `>`e kadar olan blokta href arıyoruz.
    // `[^>]` zaten satır sonlarını da kapsıyor, yani prop'ları alt alta
    // yazılmış çok satırlı `<Link>`ler de yakalanıyor — `s` bayrağına
    // gerek yok (tsconfig hedefi onu kabul etmiyor).
    const linkDeseni = /<Link\b[^>]*?href=["'{]([^"'}]+)["'}]/g;
    const bulunanlar: string[] = [];

    for (const dosya of tsxDosyalari(KOK)) {
      const icerik = readFileSync(dosya, "utf8");
      for (const m of icerik.matchAll(linkDeseni)) {
        const hedef = m[1].split("?")[0];
        if (YAN_ETKILI[hedef]) {
          const goreli = dosya.slice(dosya.indexOf("src/app")).replace(/\\/g, "/");
          bulunanlar.push(`${goreli} → ${hedef}`);
        }
      }
    }

    assert.deepEqual(
      bulunanlar.sort(),
      [],
      "bu adresler GET ile durum değiştiriyor ve <Link> onları ÖNCEDEN GETİRİYOR — " +
        "sade <a> kullan (çıkış zaten tam sayfa geçiştir)",
    );
  });

  test("yan etkili adres listesindeki her satırın gerekçesi var", () => {
    for (const [yol, gerekce] of Object.entries(YAN_ETKILI)) {
      assert.ok(gerekce.length > 15, `${yol}: gerekçe yetersiz`);
    }
  });
});
