import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as avatar from "@/domain/avatar";
import { AVATAR_RENKLERI, AVATAR_AKSESUARLARI } from "@/components/avatar";
import { yoneticiSorgu, benzersizEposta } from "./_yardim";

/**
 * İlmek'in özelleştirmesi — Ü147.
 *
 * ── Sınanan şey bir çizim değil ─────────────────────────────
 *
 * Maskotun nasıl göründüğü testin işi değil; sınanan şey **seçimin
 * kapalı listeye uyması**. Renk ve aksesuar üç yerde birden yazılı:
 * arayüzde (`AVATAR_RENKLERI`), sunucu doğrulamasında ve veritabanı
 * kısıtında. Üçü ayrışırsa oyuncu seçebildiği bir rengi kaydedemez ya
 * da ekran bilmediği bir değeri çizmeye çalışır.
 *
 * Testler tam olarak o üç katmanın aynı şeyi söylediğini çiviliyor.
 */

const TABAN = 3_000_000 + randomInt(5_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0557${String(TABAN + sayac++).slice(-7)}`);

async function yeniOyuncu(): Promise<string> {
  const s = await kaydet({
    telefon: yeniTelefon(),
    eposta: benzersizEposta(),
    ad: "Avatar",
    soyad: "Testi",
    dogumYili: 1990,
    pazarlamaIzni: false,
  });
  return s.oyuncu.id;
}

before(async () => {
  // Bu dosyanın veritabanı dışında kurulumu yok.
});

after(async () => {
  await closePools();
});

describe("avatar seçimi", () => {
  test("yeni oyuncunun avatarı varsayılan geliyor", async () => {
    const p = await yeniOyuncu();
    const secim = await avatar.oku(p);

    assert.equal(secim.renk, avatar.VARSAYILAN_AVATAR.renk);
    assert.equal(secim.aksesuar, avatar.VARSAYILAN_AVATAR.aksesuar);
  });

  test("geçerli seçim kaydediliyor ve geri okunuyor", async () => {
    const p = await yeniOyuncu();

    const yazildi = await avatar.yaz(p, { renk: "pembe", aksesuar: "bere" });
    assert.equal(yazildi, true);

    const secim = await avatar.oku(p);
    assert.equal(secim.renk, "pembe");
    assert.equal(secim.aksesuar, "bere");
  });

  test("listede olmayan değer REDDEDİLİYOR, sessizce düzeltilmiyor", async () => {
    const p = await yeniOyuncu();
    await avatar.yaz(p, { renk: "yesil", aksesuar: "fular" });

    // @ts-expect-error — arayüzün üretemeyeceği bir değer bilerek gönderiliyor.
    const yazildi = await avatar.yaz(p, { renk: "mavu", aksesuar: "fular" });
    assert.equal(yazildi, false, "bilinmeyen renk kabul edildi");

    /*
      ⚠️ Reddetmek yetmiyor: var olan seçimin **bozulmamış** olması da
      gerekiyor. Doğrulama yazmadan sonra yapılsaydı satır yarım
      güncellenmiş olurdu.
    */
    const secim = await avatar.oku(p);
    assert.equal(secim.renk, "yesil");
    assert.equal(secim.aksesuar, "fular");
  });

  test("veritabanı kısıtı da bilinmeyen rengi reddediyor", async () => {
    const p = await yeniOyuncu();

    /*
      Uygulama yolu zaten reddediyor; bu test **kısıtın kendisini**
      sınıyor. İkisi ayrı savunma: bir gün başka bir yol açılırsa
      (betik, göç, yeni bir ekran) kısıt ayakta kalır.
    */
    await assert.rejects(
      () => yoneticiSorgu("UPDATE players SET avatar_renk = $2 WHERE id = $1", [p, "mavu"]),
      /avatar_renk/,
      "veritabanı bilinmeyen rengi kabul etti",
    );
  });

  test("arayüzdeki liste ile veritabanı kısıtı aynı değerleri taşıyor", async () => {
    /*
      🔴 Bu testin varlık sebebi: listeler üç yerde yazılı ve biri
      güncellenip diğeri unutulabilir. Arayüzde görünen her renk
      gerçekten kaydedilebilmeli — yoksa oyuncu bir rengi seçer,
      ekranda görür, sayfayı yeniler ve seçimi kaybolur.
    */
    const p = await yeniOyuncu();

    for (const renk of AVATAR_RENKLERI) {
      const ok = await avatar.yaz(p, { renk, aksesuar: "yok" });
      assert.equal(ok, true, `arayüzdeki ${renk} kaydedilemedi`);
    }

    for (const a of AVATAR_AKSESUARLARI) {
      const ok = await avatar.yaz(p, { renk: "gok", aksesuar: a.deger });
      assert.equal(ok, true, `arayüzdeki ${a.deger} kaydedilemedi`);
    }
  });
});
