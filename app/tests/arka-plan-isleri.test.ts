import "../scripts/_env";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { ISLER, type Is } from "@/domain/isler";
import { bakim, sifirla } from "@/domain/bakim";

/**
 * 🔴 "YAZILDI AMA BAĞLANMADI" SINIFI.
 *
 * Bu kod tabanında **dört kez** aynı arıza çıktı: bir iş yazıldı, hiçbir
 * yerden çağrılmadı, ve kimse fark etmedi.
 *
 *   · Kampanya kuponu üretimi (Ü82) — 403 ödüle karşı 0 kampanya kuponu
 *   · `bekleyenleriAc` / `sureDolanlariSupur` — bakım köprüsü bunun için doğdu
 *   · `silmeleriUygula` (Ü111) — KVKK envanteri çıkarılırken bulundu
 *   · `alarm.degerlendir` + üç temizlik işi (Ü113) — yayın planı yazılırken
 *
 * Dördü de aynı imzayı taşıyor: **testler fonksiyonu sınıyordu,
 * bağlantıyı sınamıyordu.** Fonksiyon doğru çalışıyordu; yalnızca hiç
 * çağrılmıyordu.
 *
 * Bu dosya o sınıfı kapatıyor. Tek tek işleri değil, **boşluğu** arıyor.
 */

const KOK = path.join(process.cwd(), "src");

/**
 * Taranan dizinler.
 *
 * `src/app` dışarıda: orada Next.js'in kendi giriş noktaları var
 * (`GET`, `POST`, sunucu eylemleri) ve onları çerçeve çağırıyor, kod değil.
 */
const DIZINLER = ["domain", "lib", "db"];

/**
 * Dış çağıranı olmaması **meşru** olanlar.
 *
 * ⚠️ Bu liste kısa kalmalı. Her satır, "bu iş bağlı değil ama sorun yok"
 * iddiasıdır ve gerekçesiyle birlikte durur. Gerekçesiz satır eklemek,
 * testin tamamını anlamsız kılar.
 */
const MUAF: Record<string, string> = {
  "db/migrate.ts:migrate": "scripts/goc.ts çağırıyor — src dışında",
};

function dosyalar(dizin: string): string[] {
  const tam = path.join(KOK, dizin);
  const cikti: string[] = [];
  const gez = (d: string) => {
    for (const ad of readdirSync(d)) {
      const p = path.join(d, ad);
      if (statSync(p).isDirectory()) gez(p);
      else if (ad.endsWith(".ts") || ad.endsWith(".tsx")) cikti.push(p);
    }
  };
  gez(tam);
  return cikti;
}

/** Bütün kaynak — çağrı aramak için `src/app` de dahil. */
function tumKaynak(): Map<string, string> {
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

/** `@/lib/alarm` ya da `./kupon` → gerçek dosya yolu. */
function coz(kaynak: string, yol: string, varMi: (p: string) => boolean): string | null {
  let taban: string;
  if (yol.startsWith("@/")) taban = path.join(KOK, yol.slice(2));
  else if (yol.startsWith(".")) taban = path.resolve(path.dirname(kaynak), yol);
  else return null;

  for (const ek of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const aday = (taban + ek).replace(/\\/g, "/");
    if (varMi(aday)) return aday;
  }
  return null;
}

describe("arka plan işleri kayıt defteri (Ü113)", () => {
  test("kayıt boş değil ve her işin adı benzersiz", () => {
    assert.ok(ISLER.length >= 8, `beklenenden az iş: ${ISLER.length}`);
    const adlar = ISLER.map((i) => i.ad);
    assert.equal(new Set(adlar).size, adlar.length, "aynı adla iki iş var");
  });

  test("her işin aralığı ve açıklaması var", () => {
    for (const i of ISLER) {
      assert.ok(i.aralikDk >= 1, `${i.ad}: aralık geçersiz`);
      assert.ok(i.aciklama.length > 15, `${i.ad}: açıklama yok`);
      assert.equal(typeof i.calistir, "function", `${i.ad}: çalıştırılabilir değil`);
    }
  });

  /**
   * ⚠️ SIRA BİR TERCİH, KAZA DEĞİL.
   *
   *   1. Happy Hour penceresi, kupon açılmadan ÖNCE — pencere açılmadan
   *      üretilen kupon o pencerenin havuzundan sayılmaz.
   *   2. Hatırlatma, kupon açıldıktan SONRA — ters olsaydı aynı koşuda
   *      açılan kupon bir sonraki koşuyu bekler ve mesaj gecikirdi.
   */
  test("🔴 sıra korunuyor: happy hour → kupon açma → hatırlatma", () => {
    const sira = (ad: string) => ISLER.findIndex((i) => i.ad === ad);
    assert.ok(sira("happy_hour_program") < sira("kupon_ac"), "happy hour kupon açmadan sonraya düştü");
    assert.ok(sira("kupon_ac") < sira("hatirlatma"), "hatırlatma kupon açmadan önceye düştü");
  });

  /**
   * 🔴 ASIL GÜVENCE.
   *
   * `src/domain`, `src/lib` ve `src/db` içindeki **sıfır parametreli, dışa
   * aktarılmış async** fonksiyonlar arka plan işi imzası taşıyor. Her
   * birinin kendi dosyası dışında bir kullanıcısı olmalı: ya kayıt
   * defterinde, ya bir ekranda, ya başka bir modülde.
   *
   * Hiçbiri yoksa o fonksiyon **hiç koşmuyor** demektir — ve bu dört kez
   * yaşandı. Tarama içe aktarmaları izliyor, yalnızca ada bakmıyor: iki
   * modül de `degerlendir` adında fonksiyon dışa aktarıyor (`alarm` ve
   * `rozet`) ve ada bakan bir tarama, bağlanmamış olanı bağlı sanıyordu.
   */
  test("🔴 bağlanmamış arka plan işi yok", () => {
    const kaynak = tumKaynak();
    const varMi = (p: string) => kaynak.has(p);

    // (tanımDosyası, ad) → dışarıdan kullanılıyor
    const kullanim = new Set<string>();
    const impDesen = /import\s+(?:\*\s+as\s+(\w+)|\{([^}]*)\})\s+from\s+"([^"]+)"/g;

    for (const [p, s] of kaynak) {
      for (const m of s.matchAll(impDesen)) {
        const [, ns, adlar, yol] = m;
        const hedef = coz(p, yol, varMi);
        if (!hedef) continue;

        if (ns) {
          for (const mm of s.matchAll(new RegExp(`\\b${ns}\\.(\\w+)\\b`, "g"))) {
            kullanim.add(`${hedef}::${mm[1]}`);
          }
        } else {
          for (const parca of adlar.split(",")) {
            const asil = parca.trim().split(" as ")[0].trim().replace(/^type\s+/, "");
            if (asil) kullanim.add(`${hedef}::${asil}`);
          }
        }
      }
    }

    const tanimDesen = /export\s+async\s+function\s+(\w+)\s*\(\s*\)/g;
    const bagsiz: string[] = [];

    for (const dizin of DIZINLER) {
      for (const p of dosyalar(dizin)) {
        const duz = p.replace(/\\/g, "/");
        const icerik = kaynak.get(duz) ?? readFileSync(p, "utf8");

        for (const m of icerik.matchAll(tanimDesen)) {
          const ad = m[1];
          const etiket = `${duz.slice(duz.indexOf("/src/") + 5)}:${ad}`;
          if (MUAF[etiket]) continue;

          // Kendi dosyasında da kullanılıyorsa (yardımcı fonksiyon) sorun yok.
          const kendiIcinde = new RegExp(`\\b${ad}\\s*\\(`, "g");
          const kendiSayisi = [...icerik.matchAll(kendiIcinde)].length;

          if (!kullanim.has(`${duz}::${ad}`) && kendiSayisi <= 1) {
            bagsiz.push(etiket);
          }
        }
      }
    }

    assert.deepEqual(
      bagsiz.sort(),
      [],
      "bu işler yazılmış ama hiçbir yerden çağrılmıyor — kayıt defterine ekle " +
        "(src/domain/isler.ts) ya da gerekçesiyle MUAF listesine",
    );
  });

  test("🔴 her temizlik işi GERÇEKTEN koşuyor — yalnızca çağrılmıyor", async () => {
    /*
      🔴 Ü249'da bulunan sınıf: **yazıldı, bağlandı, sessizce patlıyor.**

      Yukarıdaki testler bir işin kayıt defterinde olduğunu ve
      çağrıldığını sınıyor. İkisi de doğruyken `qr_temizlik` her
      koşuda `permission denied for table qr_tokens` alıyordu:
      uygulama rolünde DELETE yetkisi yoktu (göç 0001 yalnızca
      SELECT/INSERT/UPDATE veriyor).

      Hata `bakim.ts:60`ta yakalanıp `log.warn`a yazılıyor ve sonraki
      iş koşmaya devam ediyor — yalıtım doğru çalıştığı için kimse
      fark etmedi. Karekod tarama kayıtları "1 saat" diye beyan
      edilmişken süresiz birikmişti; yetki verilince **1.117 satır**
      silindi.

      ⚠️ Yalnızca `_temizlik` ile biten işler koşturuluyor. Ötekiler
      (kupon açma, hatırlatma gönderme) yan etkili; testte koşturmak
      gerçek kupon açar, gerçek mesaj kuyruğa alır.

      ⚠️ Silinen satır sayısı sınanmıyor, yalnızca **patlamadığı**.
      Sayıya bakan bir test veritabanının o anki hâline bağlı olurdu.
    */
    const temizlikler = ISLER.filter((i) => i.ad.endsWith("_temizlik"));
    assert.ok(temizlikler.length >= 3, `yalnızca ${temizlikler.length} temizlik işi bulundu`);

    for (const is of temizlikler) {
      await assert.doesNotReject(
        () => Promise.resolve(is.calistir()),
        `${is.ad} patlıyor — muhtemelen sildiği tabloda DELETE yetkisi yok (göç 0047)`,
      );
    }
  });

  test("muafiyet listesindeki her satırın gerekçesi var", () => {
    for (const [etiket, gerekce] of Object.entries(MUAF)) {
      assert.ok(gerekce.length > 15, `${etiket}: gerekçe yetersiz`);
    }
  });
});

/* ── Köprü kaydı geziyor mu ────────────────────────────────── */

/**
 * ⚠️ `ISLER` doğrudan içe aktarılıyor, sorgu parametreli `import()` ile
 * değil.
 *
 * İlk sürüm `import("@/domain/isler?x=...")` kullanıyordu ve iki test
 * yanlış sebeple kırıldı: sorgu parametresi **ayrı bir modül kopyası**
 * üretiyor, bakım ise kendi içinde sade `./isler`i alıyor. Yamalanan
 * nesneler bakımın gördüğü nesneler değildi.
 *
 * Üçüncü test bu yüzden **yanlış sebeple yeşildi**: yama hiç işlemediği
 * için sayaç iki koşuda da sıfır kalıyordu ve eşitlik kendiliğinden
 * sağlanıyordu. Artık sayacın gerçekten arttığı da sınanıyor.
 */
describe("bakım köprüsü kayıt defterini geziyor", () => {
  /** İşleri geçici olarak yamalar, sonunda aynen geri koyar. */
  async function yamaliKos(
    yama: (i: Is, n: number) => () => Promise<number>,
    calistir: () => Promise<void>,
  ) {
    const asillar = ISLER.map((i) => i.calistir);
    ISLER.forEach((i, n) => {
      (i as { calistir: () => Promise<number> }).calistir = yama(i, n);
    });
    try {
      sifirla();
      await calistir();
    } finally {
      ISLER.forEach((i, n) => {
        (i as { calistir: () => Promise<number> }).calistir = asillar[n];
      });
      sifirla();
    }
  }

  /**
   * 🔴 Kayıt defteri tek başına bir şey çözmüyor — köprü onu gezmezse
   * liste yalnızca bir belge olur.
   */
  test("🔴 bakım, kayıttaki BÜTÜN işleri çağırıyor", async () => {
    const cagrilanlar: string[] = [];

    await yamaliKos(
      (i) => async () => {
        cagrilanlar.push(i.ad);
        return 0;
      },
      async () => {
        await bakim();
      },
    );

    assert.deepEqual(
      cagrilanlar.sort(),
      ISLER.map((i) => i.ad).sort(),
      "bazı işler bakım koşusunda çağrılmadı",
    );
  });

  /**
   * 🔴 Eskiden bütün işler TEK bir `try` bloğundaydı: ilk patlayan iş,
   * sonrakilerin hepsini durduruyordu. Happy Hour programı hata verdiğinde
   * bütçe iadesi de, hatırlatma da hiç koşmuyordu.
   */
  test("🔴 bir iş patlarsa sonrakiler yine koşuyor", async () => {
    const kosanlar: string[] = [];

    await yamaliKos(
      (i, n) => async () => {
        if (n === 0) throw new Error("test: ilk iş bilerek patlıyor");
        kosanlar.push(i.ad);
        return 0;
      },
      async () => {
        await bakim();
      },
    );

    assert.equal(
      kosanlar.length,
      ISLER.length - 1,
      "ilk iş patlayınca sonrakiler de durdu",
    );
  });

  /**
   * Aralık gerçekten bekliyor: temizlik işleri saatlik/günlük ve her
   * dakika `DELETE` taramanın kimseye faydası yok.
   */
  test("aralığı dolmayan iş ikinci koşuda atlanıyor", async () => {
    let sayac = 0;
    let ilk = 0;

    await yamaliKos(
      () => async () => {
        sayac++;
        return 0;
      },
      async () => {
        await bakim();
        ilk = sayac;
        await bakim(); // hemen ardından — hiçbir aralık dolmadı
      },
    );

    // ⚠️ Yamanın gerçekten işlediğini de sınıyoruz: ilk sürümde yama
    // başka bir modül kopyasına gidiyordu ve sayaç iki koşuda da sıfır
    // kaldığı için test yanlış sebeple yeşil görünüyordu.
    assert.ok(ilk > 0, "yama işlemedi — işler hiç çağrılmamış");
    assert.equal(sayac, ilk, "aralık dolmadan işler ikinci kez koştu");
  });
});
