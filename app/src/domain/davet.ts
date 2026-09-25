import { withBypass, type Db } from "@/db/context";
import { newId, safeCode } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";
import * as fraud from "./fraud";
import { yazIle as xpYaz } from "./xp";

/**
 * Davet sistemi — Faz 9, Ü20.
 *
 * ── Zincirin tamamı ─────────────────────────────────────────
 *
 *   A "Arkadaşını davet et" → sunucu koda çevirir → /r/{kod}
 *   B tıklar               → clicked
 *   B kaydolur             → registered      (telefon zaten doğrulanmış)
 *   B oyun açar            → game_started
 *   B bölümü bitirir       → game_completed
 *   B kafede niteliklenir  → cafe_verified → fraud → qualified | rejected
 *   XP yazılır             → rewarded
 *
 * ── "Nitelikli davet" neyi bekliyor ─────────────────────────
 *
 * Kaynak doküman sekiz şart sayıyor: telefon doğrulandı · yeni kullanıcı ·
 * davet bağlantısından geldi · oyunu oynadı · tamamladı · asgari etkileşimi
 * geçti · kafe karekodu etkileşimi yaptı · fraud kontrolünden geçti.
 *
 * Bunların ilk üçü **kurulum gereği** sağlanıyor: davet yalnızca kayıt
 * anında bağlanıyor (`bagla`), kayıt yalnızca OTP'den geçiyor ve mevcut
 * hesap "yeni" sayılmıyor.
 *
 * Ortadaki dördü tek bir şarta indi: **kafede (K2) eşiği geçen, tamamlanmış
 * oyun** (`oyun.davetNiteliginde`). Ü292'ye kadar bu şart
 * `play_sessions.is_qualified`in kendisiydi — o bayrak "kafeye yapılan
 * sayılabilir ziyaret" demekti ve başarılı oyun istiyordu. Ürün sahibi
 * ziyareti "1 sn bile oynasa" diye genişletince iki kural ayrıldı: ziyaret
 * oyun başlarken sayılıyor, davet hâlâ asgari etkileşim istiyor. Aksi hâlde
 * bir saniyelik oyun davet edene XP yazdırırdı.
 *
 * **Davet ancak kafeye gerçek bir müşteri getirdiyse sayılıyor.**
 *
 * ── Ödül: XP, kafe bazında ──────────────────────────────────
 *
 * Ü20 para değerli ödülü reddediyor. Geriye XP kalıyor ve XP kafe bazında
 * (Ü15) — yani "hangi kafe" sorusunun cevaplanması gerekiyor.
 *
 * **Karar: niteliklenmenin gerçekleştiği kafe.** Değer orada üretildi; davet
 * edenin o kafedeki durumu da orada yükseliyor. Alternatifler tutmuyordu:
 * global XP Ü15'i bozardı, davet edenin "kendi kafesi" ise tanımsız — çoğu
 * oyuncunun tek kafesi yok.
 *
 * ⚠️ Bu bir varsayım; `docs/02` Ü32 olarak ürün sahibinin onayına açık.
 */

/** Davet bağlantısının ömrü. Süresi dolan davet niteliklenmez. */
export const OMUR_GUN = 30;

/**
 * Tıklamayı kayda taşıyan çerez.
 *
 * Adres çubuğunda taşınmıyor: kayıt iki adım (telefon → SMS kodu) ve
 * parametre o adımlarda kaybolurdu. HttpOnly — istemci betiği okuyamıyor,
 * başka birinin davet kimliğini yazamıyor.
 */
export const DAVET_COOKIE = "cp_davet";
export const DAVET_COOKIE_OMRU_SN = OMUR_GUN * 24 * 3600;

/** Davet edene yazılan XP. */
export const DAVETCI_XP = 100;

/** Davet edilene yazılan XP — hoş geldin. */
export const DAVETLI_XP = 50;

export type Durum =
  | "clicked"
  | "registered"
  | "game_started"
  | "game_completed"
  | "cafe_verified"
  | "qualified"
  | "rewarded"
  | "rejected"
  | "expired";

/**
 * Durumların sırası — geriye gidiş yok.
 *
 * Oyuncu ikinci oyununu bitirdiğinde durum `game_completed`ten geriye
 * `game_started`a düşmemeli. Sıra numarası bunu tek karşılaştırmayla
 * garantiliyor.
 */
const SIRA: Record<Durum, number> = {
  clicked: 0,
  registered: 1,
  game_started: 2,
  game_completed: 3,
  cafe_verified: 4,
  qualified: 5,
  rewarded: 6,
  rejected: 7,
  expired: 7,
};

/** Kapanmış davet — artık ilerlemiyor. */
function kapandi(durum: Durum): boolean {
  return durum === "rewarded" || durum === "rejected" || durum === "expired";
}

/* ── Kod ───────────────────────────────────────────────────── */

/**
 * Oyuncunun davet kodu — yoksa üretilir.
 *
 * Kupon koduyla aynı alfabe: karışan harfler (0/O, 1/I/L) yok. Davet kodu
 * ekrandan okunup elle yazılabilmeli — bağlantıya tıklayamayan, ekran
 * görüntüsüne bakan kullanıcı var.
 */
export async function kodAl(playerId: string): Promise<string> {
  return withBypass("davet kodu", async (db) => {
    const mevcut = await db.one<{ code: string }>(
      `SELECT code FROM referral_codes WHERE player_id = $1`,
      [playerId],
    );
    if (mevcut) return mevcut.code;

    // Çakışma ihtimali 31^6'da bir; yine de tekrar deniyoruz çünkü
    // "kod üretilemedi" hatası kullanıcıya açıklanamaz bir şey.
    for (let deneme = 0; deneme < 5; deneme++) {
      const kod = safeCode(6);
      const r = await db.query(
        `INSERT INTO referral_codes (player_id, code) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [playerId, kod],
      );
      if (r.rowCount) return kod;

      // Araya başka bir istek girip kodu üretmiş olabilir.
      const tekrar = await db.one<{ code: string }>(
        `SELECT code FROM referral_codes WHERE player_id = $1`,
        [playerId],
      );
      if (tekrar) return tekrar.code;
    }
    throw new Error("davet kodu üretilemedi");
  });
}

/* ── Tıklama ───────────────────────────────────────────────── */

/**
 * Davet bağlantısına gelindi.
 *
 * Henüz hiçbir şey vaat edilmiyor — yalnızca "A'nın bağlantısından bir
 * ziyaret geldi" yazılıyor. Dönen kimlik çerezde taşınıyor ve kayıt anında
 * `bagla` ile hesaba bağlanıyor.
 *
 * Bilinmeyen kod sessizce `null` dönüyor: kodun var olup olmadığını
 * söylemek, geçerli kod aramak için ucuz bir sonda verirdi.
 */
export async function ziyaret(opts: {
  kod: string;
  ipHash?: Buffer;
  uaHash?: Buffer;
}): Promise<string | null> {
  const kod = opts.kod.trim().toUpperCase();
  if (kod.length !== 6) return null;

  return withBypass("davet ziyareti", async (db) => {
    const sahip = await db.one<{ player_id: string }>(
      `SELECT player_id FROM referral_codes WHERE code = $1`,
      [kod],
    );
    if (!sahip) return null;

    const id = newId("ref");
    await db.query(
      `INSERT INTO referrals
         (id, referrer_id, code, status, visit_ip_hash, visit_ua_hash, expires_at)
       VALUES ($1,$2,$3,'clicked',$4,$5, now() + ($6 || ' days')::interval)`,
      [id, sahip.player_id, kod, opts.ipHash ?? null, opts.uaHash ?? null, String(OMUR_GUN)],
    );
    await olayYaz(db, { referralId: id, oncekiDurum: null, durum: "clicked" });

    return id;
  });
}

/* ── Kayıt bağlama ─────────────────────────────────────────── */

/**
 * Davet edilen hesabını açtı.
 *
 * Üç şart burada birden kapanıyor:
 *   · **yeni kullanıcı** — `yeniHesap` false ise davet bağlanmıyor. Mevcut
 *     müşteriyi "davet" diye ikinci kez ödüllendirmek, ödülü hiçe indirir.
 *   · **davet bağlantısından geldi** — çağıran yalnızca çerezdeki kimlikle
 *     buraya gelebiliyor.
 *   · **telefon doğrulandı** — kayıt zaten OTP'den geçiyor.
 *
 * Aynı kişi ikinci kez bağlanamıyor: `referrals_tek_davet` benzersizliği
 * veritabanı seviyesinde reddediyor. Atıf tektir ve kalıcıdır.
 */
export async function bagla(opts: {
  referralId: string;
  inviteeId: string;
  yeniHesap: boolean;
}): Promise<boolean> {
  return withBypass("davet bağlama", async (db) => {
    const r = await db.one<{ status: string; referrer_id: string; expires_at: Date }>(
      `SELECT status, referrer_id, expires_at FROM referrals WHERE id = $1 FOR UPDATE`,
      [opts.referralId],
    );
    if (!r || r.status !== "clicked") return false;

    if (r.expires_at.getTime() <= Date.now()) {
      await gecir(db, opts.referralId, "clicked", "expired", "davet süresi doldu");
      return false;
    }

    if (!opts.yeniHesap) {
      await gecir(db, opts.referralId, "clicked", "rejected", "mevcut hesap — yeni kullanıcı değil");
      return false;
    }

    if (r.referrer_id === opts.inviteeId) {
      // Şema da reddederdi; buraya düşmek sinyal değil, kayıt sebebi.
      await gecir(db, opts.referralId, "clicked", "rejected", "kendi kendini davet");
      return false;
    }

    // `referrals_tek_davet` benzersizliğini **önceden** soruyoruz.
    //
    // Kısıtı yakalamak çekici ama Postgres'te işe yaramıyor: işlem içinde
    // patlayan bir sorgu işlemin tamamını iptal ediyor ve `catch` içinde
    // yazacağımız ret satırı da reddediliyor. Kısıt yine de yerinde duruyor —
    // yarış koşulunda son sözü o söylüyor; buradaki kontrol yalnızca ret
    // sebebini deftere yazabilmek için.
    const zatenDavetli = await db.one(
      `SELECT 1 FROM referrals WHERE invitee_id = $1 LIMIT 1`,
      [opts.inviteeId],
    );
    if (zatenDavetli) {
      await gecir(db, opts.referralId, "clicked", "rejected", "bu kişi zaten davet edilmiş");
      return false;
    }

    await db.query(
      `UPDATE referrals SET invitee_id = $2, status = 'registered', updated_at = now()
        WHERE id = $1 AND status = 'clicked'`,
      [opts.referralId, opts.inviteeId],
    );

    await olayYaz(db, {
      referralId: opts.referralId,
      oncekiDurum: "clicked",
      durum: "registered",
    });
    return true;
  });
}

/* ── İlerleme ──────────────────────────────────────────────── */

/**
 * Davet edilenin açık davetini ilerletir.
 *
 * `inviteeId` üzerinden çalışıyor: oyun akışının davet kimliğini taşıması
 * gerekmesin. Daveti olmayan oyuncuda sessizce hiçbir şey yapmıyor — bu
 * yolun her çağrısı davetli oyuncu için değil, **her oyuncu** için geçiyor.
 */
export async function ilerlet(inviteeId: string, hedef: Durum): Promise<void> {
  await withBypass("davet ilerletme", async (db) => {
    const r = await db.one<{ id: string; status: Durum }>(
      `SELECT id, status FROM referrals WHERE invitee_id = $1 FOR UPDATE`,
      [inviteeId],
    );
    if (!r || kapandi(r.status)) return;
    if (SIRA[hedef] <= SIRA[r.status]) return;

    await gecir(db, r.id, r.status, hedef);
  });
}

/* ── Niteliklendirme ───────────────────────────────────────── */

export type NitelikSonucu =
  | { sonuc: "yok" }
  | { sonuc: "odullendi"; xp: number }
  | { sonuc: "reddedildi"; skor: number; sebepler: fraud.Sinyal[] };

/**
 * Davet edilen kafede niteliklendi — davetin kaderi burada belirleniyor.
 *
 * Oyun bitişinde, kafede eşiği geçen oyunda çağrılıyor (Ü292 —
 * `is_qualified` artık ziyaret, davet şartı değil). Sinyaller
 * toplanıyor, fraud motoru karar veriyor, XP yazılıyor ya da ret gerekçesi
 * deftere düşüyor.
 *
 * **Ödül yalnızca XP.** Bu fonksiyon bütçe, puan ve kupon tablolarına hiç
 * dokunmuyor — Ü20'nin kapı şartı bu ve testte de böyle sınanıyor.
 */
export async function niteliklendir(opts: {
  inviteeId: string;
  cafeId: string;
}): Promise<NitelikSonucu> {
  return withBypass("davet niteliklendirme", async (db) => {
    const r = await db.one<{
      id: string;
      status: Durum;
      referrer_id: string;
      expires_at: Date;
      visit_ip_hash: Buffer | null;
      visit_ua_hash: Buffer | null;
    }>(
      `SELECT id, status, referrer_id, expires_at, visit_ip_hash, visit_ua_hash
         FROM referrals WHERE invitee_id = $1 FOR UPDATE`,
      [opts.inviteeId],
    );
    if (!r || kapandi(r.status) || r.status === "clicked") return { sonuc: "yok" as const };

    if (r.expires_at.getTime() <= Date.now()) {
      await gecir(db, r.id, r.status, "expired", "davet süresi doldu");
      return { sonuc: "yok" as const };
    }

    await gecir(db, r.id, r.status, "cafe_verified");

    const girdi = await sinyalleriTopla(db, {
      referralId: r.id,
      referrerId: r.referrer_id,
      inviteeId: opts.inviteeId,
      ziyaretIp: r.visit_ip_hash,
      ziyaretUa: r.visit_ua_hash,
    });
    const risk = fraud.degerlendir(girdi);

    // Davet edilenin kayıt parmak izi: "aynı cihaz ikinci kez nitelikli
    // davet üretemez" kısıtının dayanağı (0014).
    const iz = await kayitIzi(db, opts.inviteeId);

    if (risk.reddedildi) {
      await db.query(
        `UPDATE referrals SET risk_score = $2, risk_reasons = $3::jsonb, updated_at = now()
          WHERE id = $1`,
        [r.id, risk.skor, JSON.stringify(risk.sebepler)],
      );
      await gecir(db, r.id, "cafe_verified", "rejected", "fraud kontrolü", {
        skor: risk.skor,
        sebepler: risk.sebepler.map((s) => s.ad),
      });

      // Kapı şartı: risk skoru ve gerekçe denetim izine düşer.
      await audit(db, {
        actorType: "system",
        actorId: "fraud",
        cafeId: opts.cafeId,
        action: "referral.rejected",
        targetType: "referral",
        targetId: r.id,
        detail: { skor: risk.skor, sebepler: risk.sebepler.map((s) => s.ad) },
      });

      log.warn("davet reddedildi", { skor: risk.skor, sebep: risk.sebepler.length });
      return { sonuc: "reddedildi" as const, skor: risk.skor, sebepler: risk.sebepler };
    }

    // "Aynı cihaz ikinci kez nitelikli davet üretemez" — kapı şartı.
    //
    // Kısıt `referrals_cihaz_tek_nitelik` indeksinde duruyor ve yarış
    // koşulunda son sözü o söylüyor. Burada önceden soruyoruz çünkü ret
    // sebebini deftere yazabilmek gerekiyor: patlayan sorgu işlemi iptal
    // ederdi ve gerekçe hiç yazılamazdı.
    const cihazTekrari = iz.uaHash
      ? await db.one(
          `SELECT 1 FROM referrals
            WHERE referrer_id = $1 AND invitee_device_hash = $2
              AND status IN ('qualified','rewarded') LIMIT 1`,
          [r.referrer_id, iz.uaHash],
        )
      : null;

    if (cihazTekrari) {
      await db.query(
        `UPDATE referrals SET risk_score = $2, risk_reasons = $3::jsonb, updated_at = now()
          WHERE id = $1`,
        [r.id, risk.skor, JSON.stringify(risk.sebepler)],
      );
      await gecir(db, r.id, "cafe_verified", "rejected", "bu cihazdan zaten nitelikli davet var");
      await audit(db, {
        actorType: "system",
        actorId: "fraud",
        cafeId: opts.cafeId,
        action: "referral.rejected",
        targetType: "referral",
        targetId: r.id,
        detail: { skor: risk.skor, sebepler: ["cihaz_tekrari"] },
      });
      return { sonuc: "reddedildi" as const, skor: risk.skor, sebepler: risk.sebepler };
    }

    await db.query(
      `UPDATE referrals
          SET status = 'qualified', cafe_id = $2, risk_score = $3,
              risk_reasons = $4::jsonb, invitee_device_hash = $5, updated_at = now()
        WHERE id = $1`,
      [r.id, opts.cafeId, risk.skor, JSON.stringify(risk.sebepler), iz.uaHash],
    );

    await olayYaz(db, { referralId: r.id, oncekiDurum: "cafe_verified", durum: "qualified" });

    // Ü20: yalnızca XP. Bütçe, puan ve kupon tablolarına dokunulmuyor.
    await xpYaz(db, {
      playerId: r.referrer_id,
      cafeId: opts.cafeId,
      delta: DAVETCI_XP,
      kaynak: "REFERRAL",
      kaynakId: r.id,
    });
    await xpYaz(db, {
      playerId: opts.inviteeId,
      cafeId: opts.cafeId,
      delta: DAVETLI_XP,
      kaynak: "REFERRAL",
      kaynakId: r.id,
    });

    await db.query(
      `UPDATE referrals SET status = 'rewarded', reward_xp = $2, updated_at = now()
        WHERE id = $1`,
      [r.id, DAVETCI_XP],
    );
    await olayYaz(db, {
      referralId: r.id,
      oncekiDurum: "qualified",
      durum: "rewarded",
      detay: { davetciXp: DAVETCI_XP, davetliXp: DAVETLI_XP },
    });

    await audit(db, {
      actorType: "system",
      actorId: "referral",
      cafeId: opts.cafeId,
      action: "referral.rewarded",
      targetType: "referral",
      targetId: r.id,
      detail: { skor: risk.skor, davetciXp: DAVETCI_XP, davetliXp: DAVETLI_XP },
    });

    log.info("davet odullendi", { skor: risk.skor });
    return { sonuc: "odullendi" as const, xp: DAVETCI_XP };
  });
}

/* ── Sinyal toplama ────────────────────────────────────────── */

type KayitIzi = { ipHash: Buffer | null; uaHash: Buffer | null; kayitZamani: Date | null };

/**
 * Oyuncunun kayıt anındaki parmak izi.
 *
 * `player_consents`ten okunuyor: aydınlatma rızası kayıt anında ve tam olarak
 * bir kez yazılıyor, yani kaydın zaman damgası ve izi orada duruyor. Ayrı bir
 * kolon açmak aynı veriyi ikinci kez saklamak olurdu.
 */
async function kayitIzi(db: Db, playerId: string): Promise<KayitIzi> {
  const r = await db.one<{ ip_hash: Buffer | null; ua_hash: Buffer | null; granted_at: Date }>(
    `SELECT ip_hash, ua_hash, granted_at FROM player_consents
      WHERE player_id = $1 AND kind = 'privacy_notice'
      ORDER BY granted_at LIMIT 1`,
    [playerId],
  );
  return {
    ipHash: r?.ip_hash ?? null,
    uaHash: r?.ua_hash ?? null,
    kayitZamani: r?.granted_at ?? null,
  };
}

function ayni(a: Buffer | null, b: Buffer | null): boolean {
  return !!a && !!b && a.equals(b);
}

async function sinyalleriTopla(
  db: Db,
  opts: {
    referralId: string;
    referrerId: string;
    inviteeId: string;
    ziyaretIp: Buffer | null;
    ziyaretUa: Buffer | null;
  },
): Promise<fraud.FraudGirdisi> {
  const [davetci, davetli] = await Promise.all([
    kayitIzi(db, opts.referrerId),
    kayitIzi(db, opts.inviteeId),
  ]);

  const patlama = await db.one<{ n: string }>(
    `SELECT count(*) AS n FROM referrals
      WHERE referrer_id = $1 AND status IN ('qualified','rewarded')
        AND updated_at > now() - interval '24 hours'`,
    [opts.referrerId],
  );

  const karsilikli = await db.one(
    `SELECT 1 FROM referrals
      WHERE referrer_id = $1 AND invitee_id = $2
        AND status <> 'rejected' LIMIT 1`,
    [opts.inviteeId, opts.referrerId],
  );

  const yasSaat = davetci.kayitZamani
    ? (Date.now() - davetci.kayitZamani.getTime()) / 3_600_000
    : 999;

  return {
    ayniIp: ayni(davetci.ipHash, davetli.ipHash),
    ayniTarayici: ayni(davetci.uaHash, davetli.uaHash),
    tiklamaDavetciden:
      ayni(opts.ziyaretUa, davetci.uaHash) && ayni(opts.ziyaretIp, davetci.ipHash),
    sonGunNitelikSayisi: Number(patlama?.n ?? 0),
    karsilikliDavet: !!karsilikli,
    davetciHesapYasiSaat: yasSaat,
  };
}

/* ── Defter ────────────────────────────────────────────────── */

async function olayYaz(
  db: Db,
  opts: {
    referralId: string;
    oncekiDurum: Durum | null;
    durum: Durum;
    sebep?: string;
    detay?: unknown;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO referral_events (id, referral_id, from_status, to_status, reason, detail)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      newId("rev"),
      opts.referralId,
      opts.oncekiDurum,
      opts.durum,
      opts.sebep ?? null,
      opts.detay ? JSON.stringify(opts.detay) : null,
    ],
  );
}

/** Durumu ilerletir ve deftere yazar — ikisi hep birlikte. */
async function gecir(
  db: Db,
  referralId: string,
  onceki: Durum,
  yeni: Durum,
  sebep?: string,
  detay?: unknown,
): Promise<void> {
  await db.query(`UPDATE referrals SET status = $2, updated_at = now() WHERE id = $1`, [
    referralId,
    yeni,
  ]);
  await olayYaz(db, { referralId, oncekiDurum: onceki, durum: yeni, sebep, detay });
}

/* ── Okuma ─────────────────────────────────────────────────── */

export type DavetSatiri = {
  id: string;
  durum: Durum;
  /** Davet edilenin kimliği ekrana **hiç** çıkmıyor — yalnızca durumu. */
  tarih: Date;
  kazanilanXp: number;
  cafeAdi: string | null;
};

export type DavetOzeti = {
  kod: string;
  toplamTiklama: number;
  bekleyen: number;
  odullenen: number;
  toplamXp: number;
  satirlar: DavetSatiri[];
};

/**
 * "Davetlerim" ekranının kaynağı.
 *
 * Davet edilenin adı, telefonu, kodu — hiçbiri dönmüyor. Davet eden yalnızca
 * *bir* davetin hangi aşamada olduğunu görüyor. Aksi hâlde davet, tanıdığın
 * birinin Looply'de ne yaptığını izleme aracına dönerdi.
 */
export async function ozet(playerId: string): Promise<DavetOzeti> {
  const kod = await kodAl(playerId);

  return withBypass("davet özeti", async (db) => {
    const satirlar = await db.all<{
      id: string;
      status: Durum;
      created_at: Date;
      reward_xp: number;
      cafe_adi: string | null;
    }>(
      `SELECT r.id, r.status, r.created_at, r.reward_xp,
              (SELECT name FROM cafes c WHERE c.id = r.cafe_id) AS cafe_adi
         FROM referrals r
        WHERE r.referrer_id = $1
        ORDER BY r.created_at DESC
        LIMIT 100`,
      [playerId],
    );

    const toplamXp = await db.one<{ toplam: string }>(
      `SELECT COALESCE(sum(delta), 0) AS toplam FROM xp_ledger
        WHERE player_id = $1 AND source_type = 'REFERRAL'`,
      [playerId],
    );

    return {
      kod,
      toplamTiklama: satirlar.length,
      bekleyen: satirlar.filter((s) => !kapandi(s.status)).length,
      odullenen: satirlar.filter((s) => s.status === "rewarded").length,
      toplamXp: Number(toplamXp?.toplam ?? 0),
      satirlar: satirlar.map((s) => ({
        id: s.id,
        durum: s.status,
        tarih: s.created_at,
        kazanilanXp: s.reward_xp,
        cafeAdi: s.cafe_adi,
      })),
    };
  });
}

/**
 * Süresi dolan davetleri kapatır.
 *
 * Kupon bakımıyla aynı gerekçe: açık kalan davet, "bekliyor" sayısını
 * sonsuza kadar şişirir ve ekran yalan söyler.
 */
export async function sureDolanlariKapat(): Promise<number> {
  return withBypass("süresi dolan davetler", async (db) => {
    const dolanlar = await db.all<{ id: string; status: Durum }>(
      `SELECT id, status FROM referrals
        WHERE expires_at <= now()
          AND status NOT IN ('qualified','rewarded','rejected','expired')
        LIMIT 500`,
    );
    for (const d of dolanlar) {
      await gecir(db, d.id, d.status, "expired", "davet süresi doldu");
    }
    return dolanlar.length;
  });
}
