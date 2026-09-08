import "../scripts/_env";
import { test, before, after, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { kaydet } from "@/domain/player";
import { normalizePhone, phoneIndex } from "@/lib/crypto";
import { newId } from "@/lib/ids";
import * as hatirlatma from "@/domain/hatirlatma";
import { sablonMetni, GUNLUK_TAVAN, tavanDurumu } from "@/sms";
import { yoneticiSorgu } from "./_yardim";

/**
 * FAZ 4 GÜVENLİK KAPISI — kupon hatırlatması.
 *
 * Bu bildirim **hizmet bildirimi** olarak sınıflandırıldı: oyuncunun kendi
 * kazandığı kuponun durumunu söylüyor, ticari ileti izni (G7) ve İYS kaydı
 * gerektirmiyor. Sınıflandırmayı ayakta tutan şey iyi niyet değil, bu
 * dosyadaki kısıtlar:
 *
 *   · Metin promosyon, kafe adı, ürün veya link içermiyor
 *   · Kapatan oyuncuya gitmiyor ve kapatma anı deftere düşüyor
 *   · Silinmiş hesaba gitmiyor
 *   · Aynı kupona iki kez gitmiyor
 *   · Sessiz saatte gitmiyor
 *   · SMS tavanı dolmaya başlayınca **girişten önce** kesiliyor
 *
 * Ön koşul: npm run db:up && npm run db:migrate && npm run db:seed
 */

let kafeId = "";
let masaId = "";
let odulId = "";

const olusturulanOyuncular: string[] = [];
const olusturulanKuponlar: string[] = [];

const TABAN = 4_000_000 + randomInt(4_000_000);
let sayac = 0;
const yeniTelefon = () => normalizePhone(`0557${String(TABAN + sayac++).slice(-7)}`);

async function testOyuncu() {
  const { oyuncu } = await kaydet({
    telefon: yeniTelefon(),
    ad: "Buse",
    soyad: "Hatirlatma",
    dogumYili: 1993,
    pazarlamaIzni: false,
  });
  olusturulanOyuncular.push(oyuncu.id);
  return oyuncu.id;
}

/**
 * Açılmış bir kupon yazar.
 *
 * Motor üzerinden üretmek yerine doğrudan satır: sınanan şey hatırlatma
 * seçimi ve kuponun hangi durumda olduğunu kesin bilmek gerekiyor.
 */
async function kuponYaz(opts: {
  playerId: string;
  /** `activated` olayı yazılsın mı — ertelenmiş kuponun açılmış olması. */
  acildi?: boolean;
  /** Son kullanıma kaç saat kaldı. */
  kalanSaat?: number;
}): Promise<string> {
  const id = newId("kpn");
  await yoneticiSorgu(
    // Dönem alt sorgudan geliyor: 0023'ten beri rezerve eden kupon
    // hangi dönemden ayırdığını söylemek zorunda (Ü17 + Ü82). Bu test
    // bütçeyi sınamıyor ama gerçek bir kupon satırına benzemek zorunda.
    `INSERT INTO coupons
       (id, cafe_id, player_id, reward_id, code, qr_token, status,
        issued_at, activates_at, expires_at, reserved_kurus, proof_level,
        budget_period_id)
     VALUES ($1,$2,$3,$4,$5,$6,'active',
             now() - interval '1 hour', now() - interval '1 minute',
             now() + ($7 || ' hours')::interval, 2000, 3,
             (SELECT id FROM budget_periods
               WHERE cafe_id = $2 ORDER BY period_start DESC LIMIT 1))`,
    [id, kafeId, opts.playerId, odulId, `H${sayac++}${randomInt(90000) + 10000}`.slice(0, 6), newId("qrt"), String(opts.kalanSaat ?? 120)],
  );
  olusturulanKuponlar.push(id);

  if (opts.acildi !== false) {
    await yoneticiSorgu(
      `INSERT INTO coupon_events (id, coupon_id, cafe_id, event) VALUES ($1,$2,$3,'activated')`,
      [newId("cev"), id, kafeId],
    );
  }
  return id;
}

async function olaySayisi(kuponId: string, olay: string): Promise<number> {
  const r = await withBypass("test: olay sayısı", (db) =>
    db.one<{ n: string }>(
      `SELECT count(*) AS n FROM coupon_events WHERE coupon_id = $1 AND event = $2`,
      [kuponId, olay],
    ),
  );
  return Number(r?.n ?? 0);
}

before(async () => {
  const v = await withBypass("test hazırlığı", async (db) => {
    const c = await db.one<{ id: string }>("SELECT id FROM cafes WHERE slug = 'kafe-a'");
    const t = await db.one<{ id: string }>(
      "SELECT id FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1",
      [c?.id],
    );
    const r = await db.one<{ id: string }>(
      "SELECT id FROM rewards WHERE cafe_id = $1 AND active LIMIT 1",
      [c?.id],
    );
    return { c: c?.id, t: t?.id, r: r?.id };
  });
  assert.ok(v.c && v.t && v.r, "Tohum verisi yok — önce: npm run db:seed");
  kafeId = v.c;
  masaId = v.t;
  odulId = v.r;
});

beforeEach(async () => {
  await withBypass("test: kota sıfırlama", (db) => db.query("DELETE FROM rate_limits"));
  await yoneticiSorgu(`DELETE FROM sms_outbox WHERE id LIKE 'sms_htr_%'`);
});

after(async () => {
  await yoneticiSorgu(`DELETE FROM sms_outbox WHERE id LIKE 'sms_htr_%'`);
  for (const id of olusturulanKuponlar) {
    await yoneticiSorgu(`DELETE FROM coupon_events WHERE coupon_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM coupons WHERE id = $1`, [id]);
  }
  for (const id of olusturulanOyuncular) {
    await yoneticiSorgu(
      `DELETE FROM sms_outbox WHERE phone_index IN (SELECT phone_index FROM players WHERE id = $1)`,
      [id],
    );
    await yoneticiSorgu(`DELETE FROM player_consents WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM player_aliases WHERE player_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM audit_log WHERE target_id = $1`, [id]);
    await yoneticiSorgu(`DELETE FROM players WHERE id = $1`, [id]);
  }
  await closePools();
});

/* ═══════════════════════════════════════════════════════════
   1 · Metin disiplini — sınıflandırmayı ayakta tutan şey
   ═══════════════════════════════════════════════════════════ */

describe("hatırlatma metni hizmet bildirimi kalıyor", () => {
  /**
   * Bu testin varlık sebebi doğrudan: metin bir gün "yeni tatlımızı dene"
   * eklenerek zenginleştirilirse mesaj **ticari iletiye** döner ve G7'nin
   * izin + İYS kaydı şartı doğar. O gün CI kırılsın.
   */
  test("promosyon, çağrı ve link içermiyor", () => {
    const YASAKLI = [
      "indirim", "kampanya", "firsat", "fırsat", "yeni", "dene", "hemen",
      "http", "www", ".com", "tikla", "tıkla", "ozel", "özel", "sadece",
      "kacirma", "kaçırma", "bedava", "hediye",
    ];

    for (const sablon of ["coupon_active", "coupon_expiring"] as const) {
      const metin = sablonMetni(sablon).toLowerCase();
      for (const kelime of YASAKLI) {
        assert.ok(
          !metin.includes(kelime),
          `${sablon} metninde "${kelime}" geçiyor — bu mesajı ticari iletiye çevirir`,
        );
      }
      assert.ok(metin.startsWith("looply"), `${sablon} gönderen kimliğiyle başlamalı`);
      assert.ok(metin.length <= 160, `${sablon} tek SMS'e sığmalı (${metin.length})`);
    }
  });

  test("kafe adı ve ürün adı taşımıyor", () => {
    // Şablonlar hiç değer almıyor: alsalardı kafe adı geçirilebilirdi.
    assert.equal(sablonMetni("coupon_active"), sablonMetni("coupon_active", { kafe: "Kafe A" }));
    assert.equal(sablonMetni("coupon_expiring"), sablonMetni("coupon_expiring", { urun: "Latte" }));
  });
});

/* ═══════════════════════════════════════════════════════════
   2 · Sessiz saat
   ═══════════════════════════════════════════════════════════ */

describe("sessiz saat", () => {
  test("pencere 09:00–21:00 arası", () => {
    const saat = (s: number) => new Date(`2026-08-31T${String(s).padStart(2, "0")}:30:00+03:00`);

    assert.equal(hatirlatma.pencereAcikMi(saat(2)), false, "gece 02:00'de SMS gitmemeli");
    assert.equal(hatirlatma.pencereAcikMi(saat(8)), false);
    assert.equal(hatirlatma.pencereAcikMi(saat(9)), true);
    assert.equal(hatirlatma.pencereAcikMi(saat(20)), true);
    assert.equal(hatirlatma.pencereAcikMi(saat(21)), false);
    assert.equal(hatirlatma.pencereAcikMi(saat(23)), false);
  });

  /**
   * Ü39'un doğrudan yan etkisi: 14:00'te kazanılan ödül 02:00'de açılıyor.
   * Sessiz saat olmasaydı bildirim gece yarısı giderdi.
   */
  test("saat hesabı sunucunun saat diliminden bağımsız", () => {
    // Aynı an, iki farklı yazımla — ikisi de İstanbul'da 10:00
    assert.equal(hatirlatma.istanbulSaati(new Date("2026-08-31T07:00:00Z")), 10);
    assert.equal(hatirlatma.istanbulSaati(new Date("2026-08-31T10:00:00+03:00")), 10);
  });
});

/* ═══════════════════════════════════════════════════════════
   3 · Kime gidiyor, kime gitmiyor
   ═══════════════════════════════════════════════════════════ */

describe("hatırlatma seçimi", () => {
  test("açılan kupona bir kez gidiyor, ikinci koşuda tekrar gitmiyor", async (t) => {
    if (!hatirlatma.pencereAcikMi()) return t.skip("sessiz saatte koşuluyor");

    const oyuncu = await testOyuncu();
    const kuponId = await kuponYaz({ playerId: oyuncu });

    await hatirlatma.gonderilecekleriGonder();
    assert.equal(await olaySayisi(kuponId, "reminder_active"), 1, "bir hatırlatma yazılmalıydı");

    // Bakım köprüsü dakikada bir koşuyor — ikinci koşu ikinci SMS üretmemeli
    await hatirlatma.gonderilecekleriGonder();
    assert.equal(await olaySayisi(kuponId, "reminder_active"), 1, "ikinci koşu tekrar gönderdi");
  });

  test("hatırlatmayı kapatan oyuncuya gitmiyor", async (t) => {
    if (!hatirlatma.pencereAcikMi()) return t.skip("sessiz saatte koşuluyor");

    const oyuncu = await testOyuncu();
    await yoneticiSorgu(
      `UPDATE player_consents SET revoked_at = now()
        WHERE player_id = $1 AND kind = 'service_reminder'`,
      [oyuncu],
    );
    const kuponId = await kuponYaz({ playerId: oyuncu });

    await hatirlatma.gonderilecekleriGonder();
    assert.equal(await olaySayisi(kuponId, "reminder_active"), 0, "kapatan oyuncuya gitti");
  });

  test("silinmiş hesaba gitmiyor", async (t) => {
    if (!hatirlatma.pencereAcikMi()) return t.skip("sessiz saatte koşuluyor");

    const oyuncu = await testOyuncu();
    const kuponId = await kuponYaz({ playerId: oyuncu });
    await yoneticiSorgu(`UPDATE players SET anonymized_at = now() WHERE id = $1`, [oyuncu]);

    await hatirlatma.gonderilecekleriGonder();
    assert.equal(await olaySayisi(kuponId, "reminder_active"), 0, "silinmiş hesaba gitti");

    await yoneticiSorgu(`UPDATE players SET anonymized_at = NULL WHERE id = $1`, [oyuncu]);
  });

  /**
   * Hiç ertelenmemiş kupon "açıldı" bildirimi almamalı: o kupon zaten
   * kazanıldığı anda kullanılabilirdi, açılan bir şey yok.
   */
  test("hiç ertelenmemiş kupona 'açıldı' bildirimi gitmiyor", async (t) => {
    if (!hatirlatma.pencereAcikMi()) return t.skip("sessiz saatte koşuluyor");

    const oyuncu = await testOyuncu();
    const kuponId = await kuponYaz({ playerId: oyuncu, acildi: false });

    await hatirlatma.gonderilecekleriGonder();
    assert.equal(await olaySayisi(kuponId, "reminder_active"), 0);
  });

  test("son kullanıma 24 saatten az kalınca ayrı bir hatırlatma gidiyor", async (t) => {
    if (!hatirlatma.pencereAcikMi()) return t.skip("sessiz saatte koşuluyor");

    const oyuncu = await testOyuncu();
    const kuponId = await kuponYaz({ playerId: oyuncu, kalanSaat: 12 });

    await hatirlatma.gonderilecekleriGonder();
    assert.equal(await olaySayisi(kuponId, "reminder_expiring"), 1);

    await hatirlatma.gonderilecekleriGonder();
    assert.equal(await olaySayisi(kuponId, "reminder_expiring"), 1, "ikinci koşu tekrar gönderdi");
  });
});

/* ═══════════════════════════════════════════════════════════
   4 · SMS tavanı — hatırlatma girişten önce kesilir
   ═══════════════════════════════════════════════════════════ */

describe("global SMS tavanı (G14)", () => {
  /**
   * Günün SMS sayacını hedeflenen orana **kurar** — üstüne eklemez.
   *
   * ⚠️ İlk hâli günün sayacının sıfıra yakın başladığını varsayıyordu ve o
   * varsayım bir gün bozuldu: tarayıcıda elle yapılan denemeler 216 gerçek
   * satır üretti, test %92 sanarak %106'ya çıktı ve "giriş açık kalmalı"
   * beklentisi düştü. Sınanan şey kademelerin çalışması; sayacın nereden
   * başladığı değil.
   */
  async function tavanKur(oran: number): Promise<boolean> {
    await yoneticiSorgu(`DELETE FROM sms_outbox WHERE id LIKE 'sms_htr_%'`);

    const mevcut = await withBypass("test: günün sms sayısı", (db) =>
      db.one<{ n: string }>(
        // ⚠️ Üretimin saydığı ÖLÇÜNÜN AYNISI (`sms/index.ts`): son 24 saat
        // ve yalnızca `sent`. İlk hâli takvim günü sayıyordu ve status
        // süzmüyordu; sayı tutmayınca test hedeflediği oranı hiç
        // kuramıyordu. Test, üretimin ölçtüğü şeyi ölçmeli.
        `SELECT count(*)::text AS n FROM sms_outbox
          WHERE status = 'sent' AND created_at > now() - interval '1 day'`,
      ),
    );
    const eksik = Math.ceil(GUNLUK_TAVAN * oran) - Number(mevcut?.n ?? 0);
    if (eksik <= 0) return false;

    await yoneticiSorgu(
      `INSERT INTO sms_outbox (id, phone_masked, phone_index, template, provider, status)
       SELECT 'sms_htr_' || g, '0557 *** ** 00', $1, 'otp', 'console', 'sent'
         FROM generate_series(1, $2) g`,
      [phoneIndex(yeniTelefon()), eksik],
    );
    return true;
  }

  /**
   * Öncelik sırası: giriş SMS'i kapıda bekleyen bir insan, hatırlatma ise
   * bir gün sonra da gidebilecek bir bilgi. Hatırlatmalar `bildirim`
   * seviyesinde kalsaydı tavanı yiyip **girişleri kilitleyebilirlerdi**.
   */
  test("%90'da hatırlatma durur, giriş devam eder", async (t) => {
    if (!hatirlatma.pencereAcikMi()) return t.skip("sessiz saatte koşuluyor");

    if (!(await tavanKur(0.92))) return t.skip("günün gerçek SMS trafiği hedefi aşmış");
    const d = await tavanDurumu();
    assert.equal(d.kayitAcik, false, "%90 üstünde kayıt kademesi kapanmalı");
    assert.equal(d.girisAcik, true, "giriş açık kalmalı");

    const oyuncu = await testOyuncu();
    const kuponId = await kuponYaz({ playerId: oyuncu });

    await hatirlatma.gonderilecekleriGonder();
    assert.equal(
      await olaySayisi(kuponId, "reminder_active"),
      0,
      "tavan %90'ı geçmişken hatırlatma gönderildi — giriş SMS'ini kilitleyebilirdi",
    );

    await yoneticiSorgu(`DELETE FROM sms_outbox WHERE id LIKE 'sms_htr_%'`);
  });

  /**
   * Gönderilemeyen hatırlatma **işaretlenmiyor**: tavan boşalınca bir
   * sonraki koşuda gitmeli. İşaretlenseydi mesaj sessizce kaybolurdu.
   */
  test("engellenen hatırlatma kaybolmuyor, sonraki koşuda gidiyor", async (t) => {
    if (!hatirlatma.pencereAcikMi()) return t.skip("sessiz saatte koşuluyor");

    if (!(await tavanKur(0.92))) return t.skip("günün gerçek SMS trafiği hedefi aşmış");
    const oyuncu = await testOyuncu();
    const kuponId = await kuponYaz({ playerId: oyuncu });

    await hatirlatma.gonderilecekleriGonder();
    assert.equal(await olaySayisi(kuponId, "reminder_active"), 0);

    await yoneticiSorgu(`DELETE FROM sms_outbox WHERE id LIKE 'sms_htr_%'`);

    await hatirlatma.gonderilecekleriGonder();
    assert.equal(await olaySayisi(kuponId, "reminder_active"), 1, "tavan boşalınca gitmeliydi");
  });
});

/* Masa kimliği yalnızca tohumun eksiksizliğini doğrulamak için okundu. */
void masaId;
