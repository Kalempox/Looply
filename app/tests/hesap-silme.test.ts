import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet, silmeleriUygula, silmeTalebiOlustur } from "@/domain/player";
import * as parola from "@/domain/parola";
import { normalizePhone } from "@/lib/crypto";
import { dogumYiliSemasi } from "@/lib/validate";
import { yoneticiSorgu } from "./_yardim";

/**
 * 🔴 HESAP SİLME — AYDINLATMA METNİNDE VERİLEN SÖZ.
 *
 * Metin şunu diyor: *"hesabını silmenden 30 gün sonra geri döndürülemez
 * şekilde silinir."* Bu bir özellik değil, bir **taahhüt**; sınanmadığı
 * sürece sözün tutulup tutulmadığı bilinmiyor.
 *
 * Bu dosya KVKK veri envanteri çıkarılırken yazıldı ve iki gerçek arıza
 * buldu (`docs/24-veri-envanteri.md`):
 *
 *   1. `silmeleriUygula` **hiçbir yerden çağrılmıyordu** — iş yazılmıştı
 *      ama hiç koşmuyordu, yani hiçbir hesap silinmiyordu.
 *   2. Silme, `password_hash`i **temizlemiyordu** — "geri döndürülemez
 *      şekilde silindi" denen hesapta, kullanıcının başka yerlerde de
 *      kullandığı bir paroladan türeyen kayıt kalıyordu.
 */

/**
 * ⚠️ Önek **0544** — bu dosyaya özel.
 *
 * `0555` önekini yedi test dosyası paylaşıyor ve aralıkları üst üste
 * biniyor (kimlik 2–8M, misafir 2–8M, rapor 3–8M, liderlik 7–9M…). Aynı
 * numara iki dosyada üretildiğinde `kaydet` benzersizlik kısıtına takılır
 * ve **kodda hiçbir şey bozulmadığı hâlde** rastgele bir test kırılır.
 * Kullanılmayan bir önek, bu dosyayı o kuyruğun tamamen dışına çıkarıyor.
 */
const TABAN = 1_000_000 + randomInt(8_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0544${String(TABAN + sayac++).slice(-7)}`);

const uretilenler: string[] = [];

async function oyuncuKur(parolaliMi = true): Promise<string> {
  const r = await kaydet({
    telefon: yeniTelefon(),
    ad: "Silme",
    soyad: "Testçi",
    dogumYili: 1990,
    pazarlamaIzni: false,
  });
  uretilenler.push(r.oyuncu.id);
  if (parolaliMi) {
    await parola.belirle({ playerId: r.oyuncu.id, parola: "Looply.2026!sil" });
  }
  return r.oyuncu.id;
}

/** Silme talebini geçmişe çeker — 30 günü doldurmuş sayılsın. */
async function gunGeriCek(playerId: string, gun: number) {
  await yoneticiSorgu(
    `UPDATE players SET deletion_requested_at = now() - ($2 || ' days')::interval
      WHERE id = $1`,
    [playerId, String(gun)],
  );
}

type Satir = {
  anonymized_at: Date | null;
  password_hash: string | null;
  password_set_at: Date | null;
};

async function oku(playerId: string): Promise<Satir | undefined> {
  return withBypass("test: oyuncu satırı", (db) =>
    db.one<Satir>(
      `SELECT anonymized_at, password_hash, password_set_at FROM players WHERE id = $1`,
      [playerId],
    ),
  );
}

before(async () => {});

after(async () => {
  if (uretilenler.length) {
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = ANY($1)`, [uretilenler]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = ANY($1)`, [uretilenler]);
  }
  await closePools();
});

describe("30 günlük silme penceresi", () => {
  test("silme talebi yokken hiçbir şey olmuyor", async () => {
    const id = await oyuncuKur();
    await silmeleriUygula();

    const r = await oku(id);
    assert.equal(r?.anonymized_at, null, "talep yokken hesap silindi");
  });

  /**
   * ⚠️ Pencere gerçekten bekliyor: 29. günde silinen bir hesap,
   * kullanıcının "vazgeçtim" deme hakkını elinden alırdı.
   */
  test("🔴 29 gün dolmadan silinmiyor", async () => {
    const id = await oyuncuKur();
    await silmeTalebiOlustur(id);
    await gunGeriCek(id, 29);

    await silmeleriUygula();

    const r = await oku(id);
    assert.equal(r?.anonymized_at, null, "30 gün dolmadan silindi");
  });

  test("🔴 30 gün dolunca kimlik alanları boşalıyor", async () => {
    const id = await oyuncuKur();
    await silmeTalebiOlustur(id);
    await gunGeriCek(id, 31);

    const adet = await silmeleriUygula();
    assert.ok(adet >= 1, "süresi dolan hesap silinmedi");

    const r = await oku(id);
    assert.notEqual(r?.anonymized_at, null, "hesap anonimleştirilmedi");
  });

  /**
   * 🔴 BU TESTİN VARLIK SEBEBİ.
   *
   * İlk sürüm ad, soyad, telefon ve doğum yılını boşaltıyor ama parola
   * özetini bırakıyordu. scrypt geri çevrilemez; yine de saklamanın bir
   * gerekçesi yok ve kullanıcı aynı parolayı başka yerlerde de kullanıyor
   * olabilir. "Geri döndürülemez şekilde silindi" sözü bunu da kapsıyor.
   */
  test("🔴 parola özeti de siliniyor", async () => {
    const id = await oyuncuKur(true);

    const once = await oku(id);
    assert.notEqual(once?.password_hash, null, "test kurulumu: parola kurulmadı");

    await silmeTalebiOlustur(id);
    await gunGeriCek(id, 31);
    await silmeleriUygula();

    const sonra = await oku(id);
    assert.equal(sonra?.password_hash, null, "silinen hesapta parola özeti kaldı");
    assert.equal(sonra?.password_set_at, null, "parola tarihi kaldı");
  });

  test("aynı hesap ikinci kez silinmeye çalışılmıyor", async () => {
    const id = await oyuncuKur();
    await silmeTalebiOlustur(id);
    await gunGeriCek(id, 31);

    await silmeleriUygula();
    const ikinci = await silmeleriUygula();

    // İkinci koşu bu hesabı görmemeli (`anonymized_at IS NULL` süzgeci).
    const r = await withBypass("test: ikinci koşu", (db) =>
      db.one<{ n: string }>(
        `SELECT count(*)::text AS n FROM players
          WHERE id = $1 AND anonymized_at IS NOT NULL`,
        [id],
      ),
    );
    assert.equal(Number(r?.n), 1);
    assert.ok(ikinci >= 0);
  });
});

/* ── Köprüye bağlı mı ──────────────────────────────────────── */

describe("silme işi gerçekten koşuyor", () => {
  /**
   * 🔴 ASIL GÜVENCE.
   *
   * `silmeleriUygula` yazıldığı günden beri **hiçbir yerden
   * çağrılmıyordu** — tıpkı bu köprüyü doğuran `bekleyenleriAc` gibi.
   * Farkı şu: o bir özellik gecikmesiydi, bu aydınlatma metninde verilmiş
   * bir söz. Bu test, işin bir çağıranı olduğunu çiviliyor; fonksiyonun
   * kendisini değil **bağlı olduğunu** sınıyor.
   */
  test("🔴 bakım köprüsü silme işini çağırıyor", async () => {
    const id = await oyuncuKur();
    await silmeTalebiOlustur(id);
    await gunGeriCek(id, 31);

    // Köprü dakikada bir koşuyor; modülü taze yükleyerek sayacı sıfırlıyoruz.
    const { bakim } = await import(`@/domain/bakim?silme=${Date.now()}`);
    await bakim();

    const r = await oku(id);
    assert.notEqual(
      r?.anonymized_at,
      null,
      "bakım koştu ama hesap silinmedi — iş köprüye bağlı değil",
    );
  });
});

/* ── Yaş sınırı (Ü2) ───────────────────────────────────────── */

describe("18 yaş sınırı", () => {
  /**
   * 🔴 Ü2: *"18+ zorunlu. Çocuk verisi hiç işlenmez; KVKK'nın veli onayı
   * rejimi devreye girmez."*
   *
   * Kural `lib/validate.ts` içinde yaşıyordu ve **hiçbir testi yoktu.**
   * KVKK veri envanteri çıkarılırken fark edildi (Ü111). Testi olmayan bir
   * doğrulama, bir gün "şu alan fazla kısıtlıyor" diye sessizce
   * gevşetilebilir — ve gevşediği an ürün, veli onayı rejiminin içine
   * düşer. Sınırın kendisi değil, **kaybolmaması** sınanıyor.
   */
  const buYil = new Date().getFullYear();

  test("🔴 18 yaşından küçük kaydolamıyor", () => {
    for (const yas of [0, 5, 13, 17]) {
      const s = dogumYiliSemasi.safeParse(buYil - yas);
      assert.equal(s.success, false, `${yas} yaşındaki kabul edildi`);
    }
  });

  test("tam 18 kaydolabiliyor — sınır dışlamıyor", () => {
    const s = dogumYiliSemasi.safeParse(buYil - 18);
    assert.equal(s.success, true, "18 yaşındaki reddedildi");
  });

  test("yetişkin yaşlar kabul ediliyor", () => {
    for (const yas of [19, 35, 70, 100]) {
      assert.equal(dogumYiliSemasi.safeParse(buYil - yas).success, true, `${yas} reddedildi`);
    }
  });

  /**
   * ⚠️ **Bilinen sınır: kontrol YIL bazlı, gün hassasiyeti yok.**
   *
   * Yalnızca doğum yılı toplanıyor, tam tarih değil. Bu yüzden 18'ine o yıl
   * içinde girecek biri, doğum gününden önce de kaydolabiliyor.
   *
   * Tam tarih istemek bunu kapatırdı ama **daha fazla kişisel veri**
   * toplamak demekti; veri minimizasyonu ile kesinlik arasında yıl bazlı
   * kontrol bilinçli tercih. Aydınlatma metninde böyle anlatılıyor.
   */
  test("120 yaşından büyük değer reddediliyor — bozuk giriş", () => {
    assert.equal(dogumYiliSemasi.safeParse(buYil - 121).success, false);
    assert.equal(dogumYiliSemasi.safeParse(1800).success, false);
  });

  test("gelecek yıl doğumlu reddediliyor", () => {
    assert.equal(dogumYiliSemasi.safeParse(buYil + 1).success, false);
  });
});
