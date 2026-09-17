import "../scripts/_env";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone, identifierHash } from "@/lib/crypto";
import * as davet from "@/domain/davet";
import * as fraud from "@/domain/fraud";
import * as butce from "@/domain/butce";
import { kafeSeviyesi } from "@/domain/xp";
import { isGunu } from "@/lib/tarih";
import { yoneticiSorgu, benzersizEposta } from "./_yardim";

/**
 * FAZ 9 GÜVENLİK KAPISI — davet sistemi ve fraud motoru.
 *
 * Dört şart sınanıyor (docs/07 · Faz 9):
 *   1. Kendi kendini davet eden ödül alamamalı
 *   2. Aynı cihaz/numara ikinci kez nitelikli davet üretememeli
 *   3. Davet ödülü bütçeye veya puana dokunmamalı — yalnızca XP yazmalı
 *   4. Risk skoru ve reddetme gerekçesi denetim izine düşmeli
 *
 * Ayrıca durum makinesinin kendisi: geriye gidiş yok, her geçiş deftere
 * düşüyor, süresi dolan davet niteliklenmiyor.
 */

let kafeA = "";
const oyuncular: string[] = [];
const bugun = isGunu();

const TABAN = 6_000_000 + randomInt(3_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0557${String(TABAN + sayac++).slice(-7)}`);

/** Kayıt izi verilebilen oyuncu — fraud sinyalleri bu ize bakıyor. */
async function yeniOyuncu(iz?: { ip?: string; ua?: string }) {
  const { oyuncu, yeni } = await kaydet({
    telefon: yeniTelefon(),
    eposta: benzersizEposta(),
    ad: "Davet",
    soyad: "Testi",
    dogumYili: 1990,
    pazarlamaIzni: false,
    ip: iz?.ip,
    ua: iz?.ua,
  });
  assert.equal(yeni, true, "test kurulumu: oyuncu yeni değil");
  oyuncular.push(oyuncu.id);
  return oyuncu.id;
}

/** Davet zincirini niteliklenme kapısına kadar getirir. */
async function daveteHazirla(opts: {
  davetci: string;
  davetli: string;
  ziyaretIp?: string;
  ziyaretUa?: string;
}) {
  const kod = await davet.kodAl(opts.davetci);
  const refId = await davet.ziyaret({
    kod,
    ipHash: opts.ziyaretIp ? identifierHash(opts.ziyaretIp) : undefined,
    uaHash: opts.ziyaretUa ? identifierHash(opts.ziyaretUa) : undefined,
  });
  assert.ok(refId, "ziyaret kaydedilmedi");
  const bagli = await davet.bagla({
    referralId: refId,
    inviteeId: opts.davetli,
    yeniHesap: true,
  });
  assert.equal(bagli, true, "davet bağlanmadı");
  await davet.ilerlet(opts.davetli, "game_completed");
  return refId;
}

async function davetDurumu(id: string) {
  return withBypass("test: davet durumu", (db) =>
    db.one<{ status: string; risk_score: number; risk_reasons: unknown; reward_xp: number }>(
      `SELECT status, risk_score, risk_reasons, reward_xp FROM referrals WHERE id = $1`,
      [id],
    ),
  );
}

before(async () => {
  const v = await withBypass("test hazırlığı", (db) =>
    db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'"),
  );
  assert.ok(v, "Tohum verisi eksik — önce: npm run db:seed");
  kafeA = v.id;
});

after(async () => {
  for (const p of oyuncular) {
    await yoneticiSorgu(
      `DELETE FROM referral_events WHERE referral_id IN
         (SELECT id FROM referrals WHERE referrer_id = $1 OR invitee_id = $1)`,
      [p],
    );
    await yoneticiSorgu(`DELETE FROM referrals WHERE referrer_id = $1 OR invitee_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM referral_codes WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM xp_ledger WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [p]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [p]);
  }
  await yoneticiSorgu(
    `DELETE FROM audit_log WHERE action IN ('referral.rewarded','referral.rejected')`,
  );
  await closePools();
});

/* ═══════════════════════════════════════════════════════════
   1 · Fraud motorunun değişmez kuralı
   ═══════════════════════════════════════════════════════════ */

describe("fraud motoru — ağırlıklar", () => {
  test("hiçbir sinyal tek başına reddetmiyor", () => {
    // Kaynak dokümanın açık şartı: "Tek bir sinyal kullanıcıyı otomatik
    // suçlu ilan etmez." Her sinyalin masum bir açıklaması var — aynı IP
    // karı kocadır, aynı tarayıcı telefonu uzatmaktır.
    assert.ok(
      fraud.enAgirSinyal() < fraud.RET_ESIGI,
      `en ağır tek sinyal eşiği geçiyor: ${fraud.enAgirSinyal()} >= ${fraud.RET_ESIGI}`,
    );
  });

  test("iki bağımsız sinyal reddetmeye yetiyor", () => {
    const r = fraud.degerlendir({ ...fraud.BOS, ayniIp: true, ayniTarayici: true });
    assert.equal(r.reddedildi, true);
    assert.ok(r.sebepler.length >= 2);
  });

  test("temiz girdi sıfır risk", () => {
    const r = fraud.degerlendir(fraud.BOS);
    assert.equal(r.skor, 0);
    assert.equal(r.reddedildi, false);
    assert.equal(r.sebepler.length, 0);
  });

  test("skor 100'ü aşmıyor — şema o aralığı bekliyor", () => {
    const r = fraud.degerlendir({
      ayniIp: true,
      ayniTarayici: true,
      tiklamaDavetciden: true,
      sonGunNitelikSayisi: 99,
      karsilikliDavet: true,
      davetciHesapYasiSaat: 0,
    });
    assert.equal(r.skor, 100);
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Kapı: kendi kendini davet eden ödül alamaz
   ═══════════════════════════════════════════════════════════ */

describe("kendi kendini davet (kapı §1)", () => {
  test("aynı hesap kendi bağlantısına bağlanamaz", async () => {
    const a = await yeniOyuncu();
    const kod = await davet.kodAl(a);
    const refId = await davet.ziyaret({ kod });
    assert.ok(refId);

    const bagli = await davet.bagla({ referralId: refId, inviteeId: a, yeniHesap: true });
    assert.equal(bagli, false, "oyuncu kendini davet edebildi");

    const d = await davetDurumu(refId);
    assert.equal(d?.status, "rejected");
  });

  test("şema da reddediyor — kod hatası bile üretemez", async () => {
    const a = await yeniOyuncu();
    const kod = await davet.kodAl(a);
    const refId = await davet.ziyaret({ kod });

    await assert.rejects(
      () => yoneticiSorgu(`UPDATE referrals SET invitee_id = $2 WHERE id = $1`, [refId, a]),
      /referrals_kendini_davet/,
      "şema kısıtı kendi kendini daveti geçirdi",
    );
  });

  test("aynı cihaz + aynı ağdan açılan ikinci hesap ödül almıyor", async () => {
    // Gerçek senaryo: A, kendi telefonundan yeni numarayla B hesabı açıyor.
    // Şema bunu göremez — iki ayrı hesap. Fraud motorunun işi.
    const iz = { ip: "203.0.113.7", ua: "Mozilla/5.0 (test cihazı)" };
    const a = await yeniOyuncu(iz);
    const b = await yeniOyuncu(iz);

    const refId = await daveteHazirla({ davetci: a, davetli: b, ...{} });
    const sonuc = await davet.niteliklendir({ inviteeId: b, cafeId: kafeA });

    assert.equal(sonuc.sonuc, "reddedildi", "aynı cihazdan açılan hesap ödüllendi");
    const d = await davetDurumu(refId);
    assert.equal(d?.status, "rejected");
    assert.ok((d?.risk_score ?? 0) >= fraud.RET_ESIGI);

    // Ödül yazılmadı.
    const xp = await kafeSeviyesi(a, kafeA);
    assert.equal(xp.xp, 0, "reddedilen davet XP yazdı");
  });

  test("reddedilen davetin edileni normal oyuncu olarak kalıyor", async () => {
    // "Fraud davet ≠ fraud kullanıcı" — kaynak dokümanın açık ayrımı.
    const iz = { ip: "203.0.113.9", ua: "Mozilla/5.0 (test cihazı 2)" };
    const a = await yeniOyuncu(iz);
    const b = await yeniOyuncu(iz);
    await daveteHazirla({ davetci: a, davetli: b });
    await davet.niteliklendir({ inviteeId: b, cafeId: kafeA });

    const hesap = await withBypass("test: hesap", (db) =>
      db.one<{ deletion_requested_at: Date | null; anonymized_at: Date | null }>(
        `SELECT deletion_requested_at, anonymized_at FROM players WHERE id = $1`,
        [b],
      ),
    );
    assert.ok(hesap, "hesap silinmiş");
    assert.equal(hesap.deletion_requested_at, null, "reddedilen davet hesabı silmeye işaretledi");
    assert.equal(hesap.anonymized_at, null, "reddedilen davet hesabı anonimleştirdi");
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Kapı: aynı cihaz/numara ikinci kez nitelikli davet üretemez
   ═══════════════════════════════════════════════════════════ */

describe("tekrar daveti (kapı §2)", () => {
  test("aynı kişi ikinci kez davet edilemez", async () => {
    const a = await yeniOyuncu();
    const b = await yeniOyuncu();
    const c = await yeniOyuncu();

    await daveteHazirla({ davetci: a, davetli: b });

    // C, aynı kişiyi (B) kendi bağlantısından sahiplenmeye çalışıyor.
    const kodC = await davet.kodAl(c);
    const ikinci = await davet.ziyaret({ kod: kodC });
    assert.ok(ikinci);
    const bagli = await davet.bagla({ referralId: ikinci, inviteeId: b, yeniHesap: true });

    assert.equal(bagli, false, "aynı kişi iki kez davet edildi");
    const d = await davetDurumu(ikinci);
    assert.equal(d?.status, "rejected");
  });

  test("aynı cihazdan ikinci nitelikli davet reddediliyor", async () => {
    // İki farklı numara, aynı tarayıcı izi. Birincisi geçse bile
    // ikincisi veritabanı kısıtına çarpıyor.
    const a = await yeniOyuncu({ ip: "198.51.100.1", ua: "davetci-cihazi" });
    const b = await yeniOyuncu({ ip: "198.51.100.20", ua: "ortak-misafir-cihazi" });
    const c = await yeniOyuncu({ ip: "198.51.100.30", ua: "ortak-misafir-cihazi" });

    await daveteHazirla({ davetci: a, davetli: b });
    const ilk = await davet.niteliklendir({ inviteeId: b, cafeId: kafeA });
    assert.equal(ilk.sonuc, "odullendi", "ilk davet ödüllenmedi");

    const refC = await daveteHazirla({ davetci: a, davetli: c });
    const ikinci = await davet.niteliklendir({ inviteeId: c, cafeId: kafeA });

    assert.equal(ikinci.sonuc, "reddedildi", "aynı cihazdan ikinci nitelikli davet geçti");
    const d = await davetDurumu(refC);
    assert.equal(d?.status, "rejected");
  });

  test("mevcut hesap davet edilmiş sayılmıyor", async () => {
    const a = await yeniOyuncu();
    const b = await yeniOyuncu();
    const kod = await davet.kodAl(a);
    const refId = await davet.ziyaret({ kod });
    assert.ok(refId);

    const bagli = await davet.bagla({ referralId: refId, inviteeId: b, yeniHesap: false });
    assert.equal(bagli, false, "mevcut hesap davet olarak sayıldı");

    const d = await davetDurumu(refId);
    assert.equal(d?.status, "rejected");
  });
});

/* ═══════════════════════════════════════════════════════════
   4 · Kapı: ödül yalnızca XP — bütçeye ve puana dokunmaz
   ═══════════════════════════════════════════════════════════ */

describe("ödül yalnızca XP (kapı §3)", () => {
  test("niteliklenme bütçeye ve puana dokunmuyor, XP yazıyor", async () => {
    const a = await yeniOyuncu({ ip: "192.0.2.10", ua: "davetci-A" });
    const b = await yeniOyuncu({ ip: "192.0.2.99", ua: "davetli-B" });
    await daveteHazirla({ davetci: a, davetli: b });

    const butceOnce = await butce.durum(kafeA, bugun);
    const puanOnce = await puanToplami(a);

    const sonuc = await davet.niteliklendir({ inviteeId: b, cafeId: kafeA });
    assert.equal(sonuc.sonuc, "odullendi");

    const butceSonra = await butce.durum(kafeA, bugun);
    assert.deepEqual(
      {
        d: butceSonra.dagitilabilirKurus,
        r: butceSonra.rezerveKurus,
        h: butceSonra.harcananKurus,
      },
      {
        d: butceOnce.dagitilabilirKurus,
        r: butceOnce.rezerveKurus,
        h: butceOnce.harcananKurus,
      },
      "davet ödülü bütçeye dokundu",
    );

    assert.equal(await puanToplami(a), puanOnce, "davet ödülü puan yazdı");

    const xpA = await kafeSeviyesi(a, kafeA);
    const xpB = await kafeSeviyesi(b, kafeA);
    assert.equal(xpA.xp, davet.DAVETCI_XP, "davet edene XP yazılmadı");
    assert.equal(xpB.xp, davet.DAVETLI_XP, "davet edilene XP yazılmadı");
  });

  test("davet XP'si REFERRAL kaynağıyla yazılıyor — GAME değil", async () => {
    const a = await yeniOyuncu({ ip: "192.0.2.20", ua: "davetci-C" });
    const b = await yeniOyuncu({ ip: "192.0.2.98", ua: "davetli-D" });
    await daveteHazirla({ davetci: a, davetli: b });
    await davet.niteliklendir({ inviteeId: b, cafeId: kafeA });

    const satirlar = await withBypass("test: xp kaynakları", (db) =>
      db.all<{ source_type: string; proof_level: number }>(
        `SELECT source_type, proof_level FROM xp_ledger WHERE player_id = $1`,
        [a],
      ),
    );
    assert.equal(satirlar.length, 1);
    assert.equal(satirlar[0].source_type, "REFERRAL");
    // Davet XP'si masada gerçekleşmiyor: `xp_oyun_kafede` kısıtı yalnızca
    // GAME satırlarına bakıyor ve bu satır ondan muaf (0009).
    assert.equal(satirlar[0].proof_level, 0);
  });

  test("davet hiç kupon üretmiyor", async () => {
    const a = await yeniOyuncu({ ip: "192.0.2.30", ua: "davetci-E" });
    const b = await yeniOyuncu({ ip: "192.0.2.97", ua: "davetli-F" });
    await daveteHazirla({ davetci: a, davetli: b });
    await davet.niteliklendir({ inviteeId: b, cafeId: kafeA });

    const kupon = await withBypass("test: kupon", (db) =>
      db.all(`SELECT 1 FROM coupons WHERE player_id = $1 OR player_id = $2`, [a, b]),
    );
    assert.equal(kupon.length, 0, "davet kupon üretti — Ü20 ihlali");
  });
});

/* ═══════════════════════════════════════════════════════════
   5 · Kapı: risk skoru ve gerekçe denetim izinde
   ═══════════════════════════════════════════════════════════ */

describe("denetim izi (kapı §4)", () => {
  test("reddetme gerekçesiyle birlikte kayda geçiyor", async () => {
    const iz = { ip: "203.0.113.55", ua: "tek-cihaz" };
    const a = await yeniOyuncu(iz);
    const b = await yeniOyuncu(iz);
    const refId = await daveteHazirla({ davetci: a, davetli: b });
    await davet.niteliklendir({ inviteeId: b, cafeId: kafeA });

    const iz2 = await withBypass("test: denetim", (db) =>
      db.one<{ action: string; detail: { skor: number; sebepler: string[] } }>(
        `SELECT action, detail FROM audit_log
          WHERE action = 'referral.rejected' AND target_id = $1`,
        [refId],
      ),
    );
    assert.ok(iz2, "ret denetim izine düşmedi");
    assert.ok(iz2.detail.skor >= fraud.RET_ESIGI, "denetim izinde risk skoru yok");
    assert.ok(iz2.detail.sebepler.length > 0, "denetim izinde gerekçe yok");
  });

  test("ödüllenen davet de kayda geçiyor", async () => {
    const a = await yeniOyuncu({ ip: "192.0.2.40", ua: "davetci-G" });
    const b = await yeniOyuncu({ ip: "192.0.2.96", ua: "davetli-H" });
    const refId = await daveteHazirla({ davetci: a, davetli: b });
    await davet.niteliklendir({ inviteeId: b, cafeId: kafeA });

    const kayit = await withBypass("test: denetim", (db) =>
      db.one(`SELECT 1 FROM audit_log WHERE action = 'referral.rewarded' AND target_id = $1`, [
        refId,
      ]),
    );
    assert.ok(kayit, "ödüllenen davet kayda geçmedi");
  });

  test("her durum geçişi olay defterine düşüyor", async () => {
    const a = await yeniOyuncu({ ip: "192.0.2.50", ua: "davetci-I" });
    const b = await yeniOyuncu({ ip: "192.0.2.95", ua: "davetli-J" });
    const refId = await daveteHazirla({ davetci: a, davetli: b });
    await davet.niteliklendir({ inviteeId: b, cafeId: kafeA });

    const olaylar = await withBypass("test: davet defteri", (db) =>
      db.all<{ to_status: string }>(
        `SELECT to_status FROM referral_events WHERE referral_id = $1 ORDER BY created_at`,
        [refId],
      ),
    );
    const durumlar = olaylar.map((o) => o.to_status);
    assert.deepEqual(durumlar, [
      "clicked",
      "registered",
      "game_completed",
      "cafe_verified",
      "qualified",
      "rewarded",
    ]);
  });
});

/* ═══════════════════════════════════════════════════════════
   6 · Durum makinesi
   ═══════════════════════════════════════════════════════════ */

describe("davet durum makinesi", () => {
  test("geriye gidiş yok", async () => {
    const a = await yeniOyuncu();
    const b = await yeniOyuncu();
    const refId = await daveteHazirla({ davetci: a, davetli: b });

    // İkinci oyunu bitirdi — durum `game_started`a düşmemeli.
    await davet.ilerlet(b, "game_started");

    const d = await davetDurumu(refId);
    assert.equal(d?.status, "game_completed", "durum geriye düştü");
  });

  test("kapanmış davet ilerlemiyor", async () => {
    const iz = { ip: "203.0.113.77", ua: "kapali-cihaz" };
    const a = await yeniOyuncu(iz);
    const b = await yeniOyuncu(iz);
    const refId = await daveteHazirla({ davetci: a, davetli: b });
    await davet.niteliklendir({ inviteeId: b, cafeId: kafeA });

    await davet.ilerlet(b, "cafe_verified");
    const d = await davetDurumu(refId);
    assert.equal(d?.status, "rejected", "reddedilen davet yeniden ilerledi");
  });

  test("süresi dolan davet niteliklenmiyor", async () => {
    const a = await yeniOyuncu({ ip: "192.0.2.60", ua: "davetci-K" });
    const b = await yeniOyuncu({ ip: "192.0.2.94", ua: "davetli-L" });
    const refId = await daveteHazirla({ davetci: a, davetli: b });

    await yoneticiSorgu(`UPDATE referrals SET expires_at = now() - interval '1 day' WHERE id = $1`, [
      refId,
    ]);

    const sonuc = await davet.niteliklendir({ inviteeId: b, cafeId: kafeA });
    assert.equal(sonuc.sonuc, "yok");
    const d = await davetDurumu(refId);
    assert.equal(d?.status, "expired");

    const xp = await kafeSeviyesi(a, kafeA);
    assert.equal(xp.xp, 0, "süresi dolmuş davet XP yazdı");
  });

  test("bilinmeyen kod sessizce düşüyor", async () => {
    const r = await davet.ziyaret({ kod: "ZZZZZZ" });
    assert.equal(r, null);
  });

  test("daveti olmayan oyuncuda ilerletme sessiz", async () => {
    const a = await yeniOyuncu();
    await davet.ilerlet(a, "game_completed");
    await davet.niteliklendir({ inviteeId: a, cafeId: kafeA });
    // Hata fırlatmadıysa geçti — davet zinciri her oyuncu için çağrılıyor.
  });

  test("aynı oyuncunun kodu değişmiyor", async () => {
    const a = await yeniOyuncu();
    const k1 = await davet.kodAl(a);
    const k2 = await davet.kodAl(a);
    assert.equal(k1, k2);
    assert.equal(k1.length, 6);
  });
});

/* ── Yardımcı ──────────────────────────────────────────── */

async function puanToplami(playerId: string): Promise<number> {
  const r = await withBypass("test: puan toplamı", (db) =>
    db.one<{ toplam: string }>(
      `SELECT COALESCE(sum(delta), 0) AS toplam FROM points_ledger WHERE player_id = $1`,
      [playerId],
    ),
  );
  return Number(r?.toplam ?? 0);
}
