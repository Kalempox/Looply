import "../scripts/_env";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * VİTRİN HAREKETLERİ — sessizce bozulan iki şeyi çiviliyor.
 *
 * ── Neden bu dosya var ──────────────────────────────────────
 *
 * Ürün sahibi: *"mobil landing page için sana söylediğim hiçbir animasyon
 * gerçekleşmemiş."* Ölçüm onu doğruladı: 10.989 piksellik mobil vitrinin
 * %47'sinde tek bir keyframe animasyonu yoktu.
 *
 * Dalga 10 o boşluğu doldurdu ama iki hareket **sessizce** bozulabilir
 * cinsten — ekranda hata vermiyor, yalnızca olmuyorlar:
 *
 *   1. `Cizilen` yolu `pathLength="1"` taşımazsa iz **hiç çizilmez**.
 *      Kutu görünür, SVG görünür, animasyon bile "çalışıyor" görünür;
 *      yalnızca dasharray yanlış ölçekte olduğu için gözle bir şey
 *      olmaz. Tam da bu deponun dört kez düştüğü sınıf.
 *   2. Yeni bir hareket `prefers-reduced-motion` bloğuna eklenmezse,
 *      hareketi kapatmış kullanıcı onu yine görür. Bu bir tercih değil
 *      erişilebilirlik ayarı; sessizce çiğnenmesi kabul edilemez.
 */

const APP = path.join(process.cwd(), "src", "app");

/**
 * 🔴 BURADA BİR TEST SİLİNDİ — kaydı için duruyor.
 *
 * İlk yazılışta buraya *"her `<Cizilen>` içindeki yol `pathLength="1"`
 * taşıyor"* diye bir kaynak taraması kondu. Koştu, **yeşil yandı ve
 * hiçbir şey sınamıyordu**: `<Cizilen>` çoğu zaman bir bileşen sarıyor
 * (`<DonguIzi />`) ve SVG yolları o bileşenin gövdesinde, yani
 * `<Cizilen>…</Cizilen>` bloğunun dışında kalıyor. Tarama onları hiç
 * görmedi; `pathLength` elle silinip sınandı, test yine geçti.
 *
 * Yeşil yanan ama bir şey kanıtlamayan bir test, testsizlikten **daha
 * kötü**: koruma olmadığı hâlde koruma varmış hissi veriyor.
 *
 * Tuzağın kendisi kaldırıldı: `Cizilen` özniteliği artık monte olurken
 * kendisi koyuyor (`vitrin-hareket.tsx`), yani yazarın hatırlaması
 * gereken bir kural kalmadı. Kuralı olmayan şeyin testi de olmuyor.
 */

describe("çizilen iz — tuzak bileşende kapatıldı", () => {
  test("Cizilen pathLength'i kendisi koyuyor", () => {
    const kaynak = readFileSync(path.join(APP, "vitrin-hareket.tsx"), "utf8");
    assert.match(
      kaynak,
      /setAttribute\(\s*["']pathLength["']\s*,\s*["']1["']\s*\)/,
      "Cizilen artık pathLength'i kendisi koymuyor — biçimlendirmede " +
        "unutulan her yol sessizce çizilmeden kalır.",
    );
  });

  test("CSS izi 1 birim üzerinden çiziyor — normalleştirmenin karşılığı", () => {
    const css = readFileSync(path.join(APP, "globals.css"), "utf8");
    assert.match(css, /\.iz-bekliyor[\s\S]{0,200}stroke-dasharray:\s*1;/);
    assert.match(css, /@keyframes iz-ciz[\s\S]{0,160}stroke-dashoffset:\s*0;/);
  });
});

describe("hareketi kapatmış kullanıcı", () => {
  /**
   * Dalga 10'un eklediği sınıflar.
   *
   * ⚠️ Yeni bir hareket sınıfı eklendiğinde buraya da eklenmeli. Liste
   * elle duruyor çünkü asıl soru "sınıf var mı" değil, **"kapatılması
   * gerekiyor mu"** — ve buna yalnızca yazan karar verebilir.
   */
  const SINIFLAR = [
    "sirali-giren",
    "sirali-bekliyor",
    "iz-cizilen",
    "iz-bekliyor",
    "muhur-basan",
    "lacivert-isik",
  ];

  /** `@media (prefers-reduced-motion: reduce) { … }` bloklarının gövdesi. */
  function azaltmaBloklari(css: string): string {
    let toplam = "";
    let i = 0;
    while ((i = css.indexOf("prefers-reduced-motion", i)) !== -1) {
      const acilis = css.indexOf("{", i);
      if (acilis === -1) break;
      let derinlik = 0;
      let j = acilis;
      for (; j < css.length; j++) {
        if (css[j] === "{") derinlik++;
        else if (css[j] === "}") {
          derinlik--;
          if (derinlik === 0) break;
        }
      }
      toplam += css.slice(acilis, j);
      i = j;
    }
    return toplam;
  }

  test("her yeni hareket sınıfı hareket-azaltma bloğunda kapatılıyor", () => {
    const css = readFileSync(path.join(APP, "globals.css"), "utf8");
    const bloklar = azaltmaBloklari(css);

    assert.ok(bloklar.length > 0, "globals.css'te prefers-reduced-motion bloğu bulunamadı");

    const kapatilmayan = SINIFLAR.filter((s) => !bloklar.includes(s));
    assert.deepEqual(
      kapatilmayan,
      [],
      `Hareket-azaltma bloğunda kapatılmayan sınıf: ${kapatilmayan.join(", ")}. ` +
        `Hareketi kapatmış kullanıcı bunları yine görür.`,
    );
  });

  test("sınıfların hepsi CSS'te gerçekten tanımlı — liste bayatlamasın", () => {
    const css = readFileSync(path.join(APP, "globals.css"), "utf8");
    const tanimsiz = SINIFLAR.filter((s) => !css.includes(`.${s}`));
    assert.deepEqual(
      tanimsiz,
      [],
      `Listede olup CSS'te olmayan sınıf: ${tanimsiz.join(", ")}`,
    );
  });
});
