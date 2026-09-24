import "../scripts/_env";
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { belirle, girisDene } from "@/domain/parola";
import { sifirlamaKoduIste, sifirla, adresMaskele } from "@/domain/parola-sifirlama";
import { normalizePhone, phoneIndex, hashOtp } from "@/lib/crypto";
import { yoneticiSorgu, benzersizEposta } from "./_yardim";

/**
 * Parolamı unuttum — Ü270.
 *
 * Ürün sahibi: *"parolamı unuttum da doğru çalışmalı, maile kod gitmeli."*
 * Önceki yol parolasını unutanı "Hesap aç" formuna gönderiyordu.
 *
 * ⚠️ Numaralar her koşuda rastgele: sabit numara önceki koşunun
 * oyuncusunu bulur ve test geçmişe bağımlı olur (kimlik testindeki ders).
 */

const TABAN = 3_000_000 + randomInt(6_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0538${String(TABAN + sayac++).slice(-7)}`);

const ESKI = "Eski-Parola-2026";
const YENI = "Yeni-Parola-2026";

const olusanlar: { id: string; telefon: string }[] = [];

async function oyuncuKur(opts: { eposta?: string | null } = {}) {
  const telefon = yeniTelefon();
  const eposta = opts.eposta === undefined ? benzersizEposta() : opts.eposta;
  const s = await kaydet({
    telefon,
    eposta: eposta ?? benzersizEposta(),
    ad: "Sifir",
    soyad: "Lama",
    dogumYili: 1992,
    pazarlamaIzni: false,
  });
  olusanlar.push({ id: s.oyuncu.id, telefon });
  if (opts.eposta === null) {
    // Ü169 öncesi açılmış hesap: e-postası yok.
    await yoneticiSorgu(`UPDATE players SET email_enc = NULL, email_index = NULL WHERE id = $1`, [
      s.oyuncu.id,
    ]);
  }
  assert.ok((await belirle({ playerId: s.oyuncu.id, parola: ESKI })).ok);
  return { id: s.oyuncu.id, telefon, eposta };
}

/** Son istenen kodu bilinen bir değere çevirir — kod hiçbir yerde düz saklanmıyor. */
async function koduBil(telefon: string, kod = "123456") {
  await withBypass("test: bilinen kod", (db) =>
    db.query(
      `UPDATE otp_challenges SET code_hmac = $2
        WHERE phone_index = $1 AND purpose = 'login' AND consumed_at IS NULL`,
      [phoneIndex(telefon), hashOtp(kod)],
    ),
  );
  return kod;
}

const dene = (playerId: string, parola: string) =>
  girisDene({ playerId, parola, limitAnahtari: `test-sifirlama-${randomBytes(6).toString("hex")}` });

after(async () => {
  for (const o of olusanlar) {
    await yoneticiSorgu(`DELETE FROM otp_challenges WHERE phone_index = $1`, [phoneIndex(o.telefon)]);
    await yoneticiSorgu(`DELETE FROM sessions WHERE subject_id = $1`, [o.id]);
    await yoneticiSorgu(
      `DELETE FROM email_outbox WHERE email_index IN (SELECT email_index FROM players WHERE id = $1)`,
      [o.id],
    );
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [o.id]);
    await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1 OR actor_id = $1`, [o.id]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [o.id]);
  }
  await closePools();
});

describe("parolamı unuttum (Ü270)", () => {
  test("kayıtlı olmayan numaraya kod gitmiyor", async () => {
    const telefon = yeniTelefon();
    const s = await sifirlamaKoduIste({ telefon });
    assert.equal(s.durum, "hesap_yok");

    const kayit = await withBypass("test: kod var mı", (db) =>
      db.one<{ n: number }>(`SELECT count(*)::int AS n FROM otp_challenges WHERE phone_index = $1`, [
        phoneIndex(telefon),
      ]),
    );
    assert.equal(kayit?.n, 0, "hesabı olmayan numaraya kod üretildi");
  });

  test("kod hesabın KENDİ e-postasına gidiyor — ekranda maskeli", async () => {
    const o = await oyuncuKur();
    const s = await sifirlamaKoduIste({ telefon: o.telefon });
    assert.equal(s.durum, "gonderildi");
    assert.equal(s.durum === "gonderildi" ? s.adres : null, adresMaskele(o.eposta!));
    assert.doesNotMatch(s.durum === "gonderildi" ? (s.adres ?? "") : "", new RegExp(o.eposta!.split("@")[0]));
  });

  test("e-postası olmayan hesap açıkça söyleniyor", async () => {
    const o = await oyuncuKur({ eposta: null });
    const s = await sifirlamaKoduIste({ telefon: o.telefon });
    assert.equal(s.durum, "eposta_yok");
  });

  test("🔴 kural dışı yeni parola kodu YAKMIYOR", async () => {
    const o = await oyuncuKur();
    await sifirlamaKoduIste({ telefon: o.telefon });
    const kod = await koduBil(o.telefon);

    const zayif = await sifirla({ telefon: o.telefon, kod, yeniParola: "kisa" });
    assert.equal(zayif.ok, false);
    assert.equal(zayif.ok === false ? zayif.alan : null, "parola");

    // Aynı kod hâlâ geçerli olmalı.
    const guclu = await sifirla({ telefon: o.telefon, kod, yeniParola: YENI });
    assert.ok(guclu.ok, `kural hatası kodu yakmış: ${JSON.stringify(guclu)}`);
  });

  test("yanlış kod parolayı değiştirmiyor", async () => {
    const o = await oyuncuKur();
    await sifirlamaKoduIste({ telefon: o.telefon });
    await koduBil(o.telefon, "123456");

    const s = await sifirla({ telefon: o.telefon, kod: "654321", yeniParola: YENI });
    assert.equal(s.ok, false);
    assert.equal(s.ok === false ? s.alan : null, "kod");

    assert.ok((await dene(o.id, ESKI)).ok, "yanlış kodla parola değişti");
    assert.equal((await dene(o.id, YENI)).ok, false);
  });

  test("🔴 doğru kod: yeni parola çalışıyor, eskisi çalışmıyor, eski oturumlar kapanıyor", async () => {
    const o = await oyuncuKur();

    // Hesabı ele geçirilmiş gibi: açık bir oturum var.
    await yoneticiSorgu(
      `INSERT INTO sessions (id, subject_type, subject_id, role, token_hash, expires_at)
       VALUES ($1, 'player', $2, 'oyuncu', $3, now() + interval '1 day')`,
      [`ses_test_${randomBytes(6).toString("hex")}`, o.id, randomBytes(32)],
    );

    await sifirlamaKoduIste({ telefon: o.telefon });
    const kod = await koduBil(o.telefon);
    const s = await sifirla({ telefon: o.telefon, kod, yeniParola: YENI });
    assert.ok(s.ok, JSON.stringify(s));
    assert.ok(s.ok && s.kapatilanOturum >= 1, "eski oturum kapatılmadı");

    const acik = await withBypass("test: açık oturum", (db) =>
      db.one<{ n: number }>(
        `SELECT count(*)::int AS n FROM sessions WHERE subject_id = $1 AND revoked_at IS NULL`,
        [o.id],
      ),
    );
    assert.equal(acik?.n, 0, "parola sıfırlandı ama eski oturum açık kaldı");

    assert.ok((await dene(o.id, YENI)).ok, "yeni parola çalışmıyor");
    assert.equal((await dene(o.id, ESKI)).ok, false, "eski parola hâlâ çalışıyor");

    // Kod tek kullanımlık.
    const tekrar = await sifirla({ telefon: o.telefon, kod, yeniParola: "Baska-Parola-2026" });
    assert.equal(tekrar.ok, false, "aynı kodla ikinci kez parola değişti");
  });
});
