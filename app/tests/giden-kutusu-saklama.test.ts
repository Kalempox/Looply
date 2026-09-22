import "../scripts/_env";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { newId } from "@/lib/ids";
import { GIDEN_KUTUSU_GUN } from "@/domain/saklama";
import { temizle as smsTemizle } from "@/sms";
import { temizle as epostaTemizle } from "@/posta";
import { ISLER } from "@/domain/isler";

/**
 * GİDEN KUTUSU SAKLAMA SÜRESİ — madde 37.
 *
 * ── Neden bir test gerekiyor ────────────────────────────────
 *
 * `docs/24-veri-envanteri.md` §6 bir süre **beyan ediyor** (12 ay). Beyan
 * ile uygulama ayrışırsa belge yalan söyler ve bunu kimse fark etmez:
 * silinmeyen satırlar ekranda görünmüyor, kimse şikâyet etmiyor,
 * hiçbir test kırılmıyor.
 *
 * Bu tam olarak projedeki "yazıldı ama bağlanmadı" sınıfının sessiz
 * hâli — orada iş hiç koşmuyordu, burada iş yanlış eşikle koşabilir.
 *
 * ── Sınanan üç şey ──────────────────────────────────────────
 *
 *   1. Eşiği geçen kayıt **siliniyor**
 *   2. Eşiğin içindeki kayıt **duruyor** (silme çok agresif değil)
 *   3. İki kutu da kayıt defterinde, yani gerçekten koşuyor
 */

const ESKI = GIDEN_KUTUSU_GUN + 5;
const YENI = GIDEN_KUTUSU_GUN - 5;

/** Test satırlarını işaretlemek için — gerçek veriye dokunulmuyor. */
const IZ = `saklama-${Date.now()}`;

async function smsYaz(gunOnce: number): Promise<string> {
  const id = newId("smo");
  await withBypass("test: sms satırı", (db) =>
    db.query(
      `INSERT INTO sms_outbox (id, phone_masked, phone_index, template, provider, created_at)
       VALUES ($1, $2, $3, 'otp', 'console', now() - ($4 || ' days')::interval)`,
      [id, IZ, Buffer.from(id.slice(-16)), String(gunOnce)],
    ),
  );
  return id;
}

async function epostaYaz(gunOnce: number): Promise<string> {
  const id = newId("emo");
  await withBypass("test: eposta satırı", (db) =>
    db.query(
      `INSERT INTO email_outbox (id, email_masked, email_index, template, provider, created_at)
       VALUES ($1, $2, $3, 'otp', 'console', now() - ($4 || ' days')::interval)`,
      [id, IZ, Buffer.from(id.slice(-16)), String(gunOnce)],
    ),
  );
  return id;
}

async function varMi(tablo: "sms_outbox" | "email_outbox", id: string): Promise<boolean> {
  const r = await withBypass("test: satır var mı", (db) =>
    db.one(`SELECT 1 FROM ${tablo} WHERE id = $1`, [id]),
  );
  return !!r;
}

after(async () => {
  for (const t of ["sms_outbox", "email_outbox"] as const) {
    const sutun = t === "sms_outbox" ? "phone_masked" : "email_masked";
    await withBypass("test: temizlik", (db) =>
      db.query(`DELETE FROM ${t} WHERE ${sutun} = $1`, [IZ]),
    );
  }
  await closePools();
});

describe("giden kutusu saklama süresi (madde 37)", () => {
  test("beyan edilen süre ile uygulanan süre aynı", () => {
    /*
      🔴 `docs/24` §6 "12 ay" diyor. Sayı burada da yazılı olsaydı iki
      kopya olurdu; tek kopya `domain/saklama.ts`te ve bu test yalnızca
      **makul bir aralıkta** olduğunu sınıyor.

      ⚠️ Kasten gevşek: süreyi ürün sahibi/avukat değiştirebilir ve her
      değişiklikte kırmızı yanan bir test, güncellene güncellene
      anlamını yitirir. Yakaladığı şey kazara sıfırlanması ya da
      anlamsız bir değere kayması.
    */
    assert.ok(
      GIDEN_KUTUSU_GUN >= 30 && GIDEN_KUTUSU_GUN <= 3650,
      `saklama süresi ${GIDEN_KUTUSU_GUN} gün — 30 gün ile 10 yıl arasında olmalı`,
    );
  });

  test("süresi dolan SMS kaydı siliniyor, dolmayan duruyor", async () => {
    const eski = await smsYaz(ESKI);
    const yeni = await smsYaz(YENI);

    await smsTemizle();

    assert.equal(await varMi("sms_outbox", eski), false, `${ESKI} günlük kayıt silinmedi`);
    assert.equal(await varMi("sms_outbox", yeni), true, `${YENI} günlük kayıt silindi — eşik çok dar`);
  });

  test("süresi dolan e-posta kaydı siliniyor, dolmayan duruyor", async () => {
    const eski = await epostaYaz(ESKI);
    const yeni = await epostaYaz(YENI);

    await epostaTemizle();

    assert.equal(await varMi("email_outbox", eski), false, `${ESKI} günlük kayıt silinmedi`);
    assert.equal(await varMi("email_outbox", yeni), true, `${YENI} günlük kayıt silindi — eşik çok dar`);
  });

  test("🔴 iki kutu da arka plan kayıt defterinde", () => {
    /*
      Silme fonksiyonunun doğru çalışması yetmiyor; **çağrılıyor**
      olması gerekiyor. Bu projede dört kez yazılıp bağlanmamış iş
      çıktı (Ü113) ve ikisi tam olarak temizlik işiydi.
    */
    const adlar = new Set(ISLER.map((i) => i.ad));
    assert.ok(adlar.has("sms_giden_temizlik"), "SMS temizliği kayıt defterinde yok");
    assert.ok(adlar.has("eposta_giden_temizlik"), "e-posta temizliği kayıt defterinde yok");
  });
});
