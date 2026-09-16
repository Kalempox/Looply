import "../scripts/_env";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { tohumKapisi } from "../scripts/_env";

/**
 * 🔴 TOHUM BETİKLERİNİN CANLI ORTAM KİLİDİ.
 *
 * ── Neyi kapatıyor ──────────────────────────────────────────
 *
 * `db:demo` bilinen bir paroladan hesap açıyor (`05320000099`), `db:butik`
 * ve `db:seed` sahte işletme ve sahte oyuncu yazıyor. Üçü de bir süre
 * `APP_ENV`'a **hiç bakmadı**: canlı bağlantı açıkken çalıştırılan tek
 * komut canlı veritabanına parolası herkesçe bilinen bir hesap düşürürdü.
 *
 * ⚠️ Arıza tek bir betiğin unutkanlığı değil, bir **sınıf**: `db:simule`
 * kapıyı baştan doğru kurmuştu, üç kardeşi kurmadı. Aynı şey beşinci tohum
 * betiği yazıldığında tekrar olur — bu yüzden test tek tek betiği değil,
 * `scripts/tohum-*.ts` **kalıbının tamamını** tarıyor. Yeni tohum betiği
 * kapıyı unutursa bu dosya kırmızı yanıyor.
 *
 * ── Neden kaynak metni okunuyor ─────────────────────────────
 *
 * Kapıyı davranışla sınamak betiği gerçekten çalıştırmak demekti — yani
 * test veritabanına tohum atmak. Aranan şey zaten çalışma anında değil
 * **yazıda**: çağrının orada olup olmadığı. Bir satırın varlığını sınamak
 * için o satırı okumak yeterli.
 */

const BETIKLER = path.join(process.cwd(), "scripts");

/**
 * Kapıyı taşımak **zorunda** olan betikler.
 *
 * Kalıp (`tohum-*.ts`) kendiliğinden kapsıyor; `simulasyon.ts` adı kalıba
 * uymadığı için elle duruyor.
 */
function kapiliOlmasiGerekenler(): string[] {
  const kalip = readdirSync(BETIKLER).filter(
    (d) => d.startsWith("tohum-") && d.endsWith(".ts"),
  );
  return [...kalip, "simulasyon.ts"];
}

/**
 * Canlıda çalışması **gereken** betikler.
 *
 * ⚠️ Bu liste kapıyı taşımayanların gerekçesini tutuyor. Göç ve yedek
 * canlıda çalışmazsa ürün kurulamaz ve yedeklenemez — onlara kapı koymak
 * aracı bozmak olurdu.
 */
const MUAF: Record<string, string> = {
  "goc.ts": "db:migrate — canlıda çalışmak zorunda, şemayı o kuruyor",
  "yedek-al.ts": "db:backup — canlıda çalışmak zorunda",
  "yedek-tatbikat.ts": "db:restore-drill — yedekten dönüşü canlıda da sınar",
  "_env.ts": "kapının kendisi burada tanımlı",
};

describe("tohum kapısı — canlı ortam kilidi", () => {
  test("APP_ENV=production ise hata fırlatıyor", () => {
    const onceki = process.env.APP_ENV;
    try {
      process.env.APP_ENV = "production";
      assert.throws(() => tohumKapisi("Test tohumu"), /canlı ortamda çalıştırılamaz/);
    } finally {
      if (onceki === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = onceki;
    }
  });

  test("hata mesajı hangi betiğin durdurulduğunu söylüyor", () => {
    const onceki = process.env.APP_ENV;
    try {
      process.env.APP_ENV = "production";
      assert.throws(() => tohumKapisi("Butik tohumu"), /Butik tohumu/);
    } finally {
      if (onceki === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = onceki;
    }
  });

  test("production dışındaki ortamlarda sessizce geçiyor", () => {
    const onceki = process.env.APP_ENV;
    try {
      for (const ortam of ["development", "staging", "test", undefined]) {
        if (ortam === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = ortam;
        // Fırlatmamalı — geliştirici makinesinde ve demoda çalışması gerekiyor.
        tohumKapisi("Test tohumu");
      }
    } finally {
      if (onceki === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = onceki;
    }
  });

  /**
   * 🔴 Asıl test bu: sınıfı kapatan tarama.
   *
   * Tek tek betiği değil kalıbı arıyor — yarın eklenen `tohum-pilot.ts`
   * kapıyı unutursa burada düşer.
   */
  test("her tohum betiği kapıyı çağırıyor", () => {
    const eksik: string[] = [];

    for (const dosya of kapiliOlmasiGerekenler()) {
      const kaynak = readFileSync(path.join(BETIKLER, dosya), "utf8");
      if (!kaynak.includes("tohumKapisi(")) eksik.push(dosya);
    }

    assert.deepEqual(
      eksik,
      [],
      `Kapısız tohum betiği: ${eksik.join(", ")}. ` +
        `main()'in ilk satırına tohumKapisi("<ad>") ekle — yoksa canlı ` +
        `bağlantı açıkken çalıştırıldığında canlı veritabanına sahte veri yazar.`,
    );
  });

  /**
   * Kapı doğru yerde mi: `main()` gerçekten çağırıyor mu, yoksa yalnızca
   * import mu edilmiş?
   *
   * Import'u sayan bir test, kapıyı import edip hiç çağırmayan bir betiği
   * geçirirdi — bu deponun dört kez düştüğü tuzağın aynısı.
   */
  test("kapı yalnızca import edilmiyor, çağrılıyor", () => {
    const yalnizcaImport: string[] = [];

    for (const dosya of kapiliOlmasiGerekenler()) {
      const kaynak = readFileSync(path.join(BETIKLER, dosya), "utf8");
      // Import satırını çıkardıktan sonra hâlâ bir çağrı kalmalı.
      const govde = kaynak
        .split("\n")
        .filter((s) => !s.trimStart().startsWith("import"))
        .join("\n");
      if (!govde.includes("tohumKapisi(")) yalnizcaImport.push(dosya);
    }

    assert.deepEqual(
      yalnizcaImport,
      [],
      `Kapı import edilmiş ama çağrılmamış: ${yalnizcaImport.join(", ")}`,
    );
  });

  /**
   * Muafiyet listesi dürüst mü?
   *
   * ⚠️ Bu test muafların kapısız olduğunu değil, **listenin bayatlamadığını**
   * sınıyor: adı değişen ya da silinen bir betik listede kalırsa muafiyet
   * sessizce anlamsızlaşır ve bir sonraki okuyucu onu gerçek sanır.
   */
  test("muafiyet listesindeki her betik hâlâ var", () => {
    const mevcut = new Set(readdirSync(BETIKLER));
    const hayalet = Object.keys(MUAF).filter((d) => !mevcut.has(d));
    assert.deepEqual(hayalet, [], `Muafiyet listesinde olmayan betik: ${hayalet.join(", ")}`);
  });
});
