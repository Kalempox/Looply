import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone } from "@/lib/crypto";
import * as avatar from "@/domain/avatar";
import { AVATAR_AKSESUARLARI } from "@/components/avatar";
import { GOVDE_RENKLERI, SERIT_RENKLERI } from "@/components/avatar-renkleri";
import { yoneticiSorgu, benzersizEposta } from "./_yardim";

/**
 * Loopy'nin özelleştirmesi — Ü147, Ü186'da iki renge çıktı.
 *
 * ── Sınanan şey bir çizim değil ─────────────────────────────
 *
 * Maskotun nasıl göründüğü testin işi değil; sınanan şey **seçimin
 * palete uyması**. Palet iki yerde birden okunuyor: arayüzde
 * (`avatar-paleti.json` → `GOVDE_RENKLERI`) ve sunucu doğrulamasında.
 * İkisi ayrışırsa oyuncu seçebildiği bir rengi kaydedemez ya da ekran
 * bilmediği bir değeri çizmeye çalışır.
 *
 * ── 🔴 Kısıt artık listeye değil BİÇİME bakıyor ─────────────
 *
 * Ü147'de `avatar_renk` kolonunun CHECK'i altı rengi tek tek sayıyordu
 * ve bir test o listenin arayüzle aynı kaldığını çiviliyordu. Palet 990
 * kombinasyona çıkınca o kısıt taşınamaz oldu: her yeni renk bir göç
 * demekti (göç 0045'te yazılı).
 *
 * Kısıt duruyor ama işi değişti — çöp veriyi (boşluk, noktalama, uzun
 * metin) satıra sokmuyor. **Bilinen renk listesi** artık tek başına
 * uygulamanın sorumluluğu ve aşağıdaki son test tam onu sınıyor.
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

    assert.equal(secim.govde, avatar.VARSAYILAN_AVATAR.govde);
    assert.equal(secim.serit, avatar.VARSAYILAN_AVATAR.serit);
    assert.equal(secim.aksesuar, avatar.VARSAYILAN_AVATAR.aksesuar);
  });

  test("geçerli seçim kaydediliyor ve geri okunuyor", async () => {
    const p = await yeniOyuncu();

    const yazildi = await avatar.yaz(p, {
      govde: "menekse-koyu",
      serit: "limon-canli",
      aksesuar: "yok",
    });
    assert.equal(yazildi, true);

    const secim = await avatar.oku(p);
    assert.equal(secim.govde, "menekse-koyu");
    assert.equal(secim.serit, "limon-canli");
  });

  test("iki eksen BAĞIMSIZ: biri değişirken diğeri yerinde kalıyor", async () => {
    /*
      🔴 Ürün sahibinin isteğinin özü buydu: *"kahve bardağı sabit çizgi
      her renkte, ve kahve bardağı ayrı çizgi ayrı her renkte
      seçeneklerimiz olmalı."* Tek kolonla saklansaydı iki eksen
      birbirine bağlı kalırdı.
    */
    const p = await yeniOyuncu();
    await avatar.yaz(p, { govde: "gok-orta", serit: "kar", aksesuar: "yok" });
    await avatar.yaz(p, { govde: "gok-orta", serit: "fusya-canli", aksesuar: "yok" });

    const secim = await avatar.oku(p);
    assert.equal(secim.govde, "gok-orta", "şerit değişince gövde kaydı");
    assert.equal(secim.serit, "fusya-canli");
  });

  test("palette olmayan değer REDDEDİLİYOR, sessizce düzeltilmiyor", async () => {
    const p = await yeniOyuncu();
    await avatar.yaz(p, { govde: "yesil-acik", serit: "komur", aksesuar: "yok" });

    const yazildi = await avatar.yaz(p, {
      govde: "mavu-acik",
      serit: "komur",
      aksesuar: "yok",
    });
    assert.equal(yazildi, false, "bilinmeyen gövde rengi kabul edildi");

    /*
      ⚠️ Şerit paletinin gövde paletiyle aynı OLMADIĞI da burada
      çiviliyor: `yesil-acik` gövdede geçerli, şeritte değil. Tek bir
      liste kullanılsaydı ince şerit gövdenin soluk tonlarında
      kaybolurdu (bkz. `avatar-paleti.json`).
    */
    const seritte = await avatar.yaz(p, {
      govde: "yesil-acik",
      serit: "yesil-acik",
      aksesuar: "yok",
    });
    assert.equal(seritte, false, "gövde kademesi şeritte kabul edildi");

    /*
      ⚠️ Reddetmek yetmiyor: var olan seçimin **bozulmamış** olması da
      gerekiyor. Doğrulama yazmadan sonra yapılsaydı satır yarım
      güncellenmiş olurdu.
    */
    const secim = await avatar.oku(p);
    assert.equal(secim.govde, "yesil-acik");
    assert.equal(secim.serit, "komur");
  });

  test("veritabanı kısıtı biçimsiz değeri reddediyor", async () => {
    const p = await yeniOyuncu();

    /*
      Uygulama yolu zaten reddediyor; bu test **kısıtın kendisini**
      sınıyor. İkisi ayrı savunma: bir gün başka bir yol açılırsa
      (betik, göç, yeni bir ekran) kısıt ayakta kalır.
    */
    await assert.rejects(
      () =>
        yoneticiSorgu("UPDATE players SET avatar_govde = $2 WHERE id = $1", [
          p,
          "'; DROP TABLE players; --",
        ]),
      /avatar_govde/,
      "veritabanı biçimsiz değeri kabul etti",
    );
  });

  test("paletteki HER renk gerçekten kaydedilebiliyor", async () => {
    /*
      🔴 Bu testin varlık sebebi: arayüzde görünen her renk
      kaydedilebilmeli — yoksa oyuncu bir rengi seçer, ekranda görür,
      sayfayı yeniler ve seçimi kaybolur.

      ⚠️ Doğrulama listeyi zaten aynı kaynaktan okuyor, yani bu test
      kendi kendini onaylıyor gibi görünebilir. Onaylamıyor: yazma
      gerçekten VERİTABANINA gidiyor ve kolon kısıdından geçiyor. Bir
      gün palete tire içermeyen ya da 24 karakterden uzun bir ad
      eklenirse arayüz onu gösterir, kısıt reddeder ve bu test düşer.
    */
    const p = await yeniOyuncu();

    for (const govde of GOVDE_RENKLERI.keys()) {
      const ok = await avatar.yaz(p, { govde, serit: "kar", aksesuar: "yok" });
      assert.equal(ok, true, `paletteki gövde rengi ${govde} kaydedilemedi`);
    }

    for (const serit of SERIT_RENKLERI.keys()) {
      const ok = await avatar.yaz(p, { govde: "krem", serit, aksesuar: "yok" });
      assert.equal(ok, true, `paletteki şerit rengi ${serit} kaydedilemedi`);
    }

    for (const a of AVATAR_AKSESUARLARI) {
      const ok = await avatar.yaz(p, {
        govde: "krem",
        serit: "turuncu-canli",
        aksesuar: a.deger,
      });
      assert.equal(ok, true, `arayüzdeki ${a.deger} kaydedilemedi`);
    }
  });
});
