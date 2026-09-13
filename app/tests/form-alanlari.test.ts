import "../scripts/_env";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * 🔴 SUNUCUNUN OKUDUĞU ALAN, FORMDA GERÇEKTEN VAR MI?
 *
 * Ü114'te bulunan hata: cihaz kaydı formunda girdinin adı `etiket-caps`
 * yazıyordu — bu bir **CSS sınıfı**, bir bul-değiştir turunda HTML `name`
 * özniteliğine bulaşmış. Sunucu eylemi `form.get("etiket")` okuyor, o alan
 * hiç gelmiyor, ve doğrulama her seferinde *"Cihaza bir ad ver"* diyordu.
 *
 * ⚠️ **Sonucu ürünün en kritik akışını kapatıyordu:** kasiyer PIN'i
 * yalnızca yöneticinin kaydettiği cihazda çalışıyor (G11). Cihaz hiç
 * kaydedilemediği için **hiçbir kasiyer giriş yapamıyordu** — ve derleyici
 * de testler de bunu görmüyordu, çünkü iki taraf da kendi başına geçerli.
 *
 * ── Kural neden bu kadar gevşek ─────────────────────────────
 *
 * "Aynı dizindeki formda `name=` olmalı" diye yazmak **dört yanlış pozitif**
 * üretiyordu ve gürültülü bir test, kapatılan bir testtir:
 *
 *   · `telefon`, `kod` → paylaşılan `components/otp-giris.tsx` içinde
 *   · `urunId`, `aciklama` → `ad-duzeltme.tsx` alan adlarını **prop olarak**
 *     alıyor (`kimlikAlani="urunId"`), yani `name` dinamik
 *
 * Bu yüzden kural şu: okunan alan adı, **kaynağın herhangi bir yerinde**
 * geçmeli. Dinamik de olsa, paylaşılan bileşende de olsa bir yerde yazılı
 * olmak zorunda. Hiçbir yerde geçmiyorsa o alan kimse tarafından
 * gönderilmiyor demektir — `etiket` tam olarak öyleydi.
 */

const KOK = path.join(process.cwd(), "src");

function tumDosyalar(): Map<string, string> {
  const m = new Map<string, string>();
  const gez = (d: string) => {
    for (const ad of readdirSync(d)) {
      const p = path.join(d, ad);
      if (statSync(p).isDirectory()) gez(p);
      else if (ad.endsWith(".ts") || ad.endsWith(".tsx")) {
        m.set(p.replace(/\\/g, "/"), readFileSync(p, "utf8"));
      }
    }
  };
  gez(KOK);
  return m;
}

/**
 * Okunduğu hâlde hiçbir yerde tanımlanmaması **meşru** olanlar.
 *
 * ⚠️ Boş kalmalı. Bir satır eklemek, "bu alan hiçbir formdan gelmiyor ama
 * sorun yok" iddiasıdır ve gerekçesiyle durmalı.
 */
const MUAF: Record<string, string> = {};

describe("form alanları sunucunun okuduğuyla uyuşuyor (Ü114)", () => {
  test("🔴 sunucunun okuduğu her alan bir yerde tanımlı", () => {
    const dosyalar = tumDosyalar();
    const okuDesen = /form\.get(?:All)?\("([^"]+)"\)/g;

    const eksikler: string[] = [];

    for (const [p, s] of dosyalar) {
      if (!p.endsWith("actions.ts")) continue;

      for (const m of s.matchAll(okuDesen)) {
        const alan = m[1];
        const etiket = `${p.slice(p.indexOf("/src/") + 5)}:${alan}`;
        if (MUAF[etiket]) continue;

        // Alan adı, okuyan dosyanın DIŞINDA bir yerde geçmeli.
        // `name="etiket"` (düz) ya da `kimlikAlani="urunId"` (dinamik) —
        // ikisi de sayılıyor; aranan şey adın hiç var olmaması.
        const gecen = [...dosyalar].some(
          ([baskaP, baskaS]) => baskaP !== p && baskaS.includes(`"${alan}"`),
        );

        if (!gecen) eksikler.push(etiket);
      }
    }

    assert.deepEqual(
      eksikler.sort(),
      [],
      "bu alanlar sunucuda okunuyor ama hiçbir formda tanımlı değil — " +
        "form alanının adı yanlış yazılmış olabilir",
    );
  });

  /**
   * Ü114'ün kendisi: `name` özniteliğine CSS sınıf adı kaçmış.
   *
   * `etiket-caps` bu projede çok kullanılan bir sınıf; bir daha bir
   * `name`/`id` özniteliğine bulaşırsa burada yakalanır.
   */
  test("🔴 form alanı adına CSS sınıfı kaçmamış", () => {
    const kacanlar: string[] = [];
    const desen = /\b(?:name|id|htmlFor)="([a-z]+-(?:caps|sonuk|koyu|zemin|golge))"/g;

    for (const [p, s] of tumDosyalar()) {
      for (const m of s.matchAll(desen)) {
        kacanlar.push(`${p.slice(p.indexOf("/src/") + 5)}: ${m[1]}`);
      }
    }

    assert.deepEqual(
      kacanlar.sort(),
      [],
      "bir CSS sınıf adı HTML name/id özniteliğine kaçmış",
    );
  });

  test("muafiyet listesindeki her satırın gerekçesi var", () => {
    for (const [etiket, gerekce] of Object.entries(MUAF)) {
      assert.ok(gerekce.length > 15, `${etiket}: gerekçe yetersiz`);
    }
  });
});
