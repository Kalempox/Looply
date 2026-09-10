import { withCafe, withBypass, type Db } from "@/db/context";
import { newId } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { isGunu } from "@/lib/tarih";
import { log } from "@/lib/log";

/**
 * Happy Hour havuzu — Ö3.
 *
 * ── Kararın özeti: DÜMDÜZ ───────────────────────────────────
 *
 * Çarpan matematiği yok. Kafe günün bir aralığına **görünür bir TL havuzu**
 * ayırıyor; oyuncu "260 TL ödül kaldı · 1s 42dk" görüyor. Gerekçe kaynak
 * dokümanda: *"2x puan" oyuncuya hiçbir şey ifade etmez; kafe de bütçesini
 * hesaplayamaz. TL cinsinden havuz iki tarafın da anladığı tek dil.*
 *
 * ── Havuz bir kese değil, bir tavan ────────────────────────
 *
 * Pencere açılırken bütçeden para **ayrılmıyor**. Pencere içindeki kuponlar
 * her zamanki gibi bütçeden rezerve ediliyor, ayrıca pencereye
 * etiketleniyor. Kalan = havuz − etiketli kuponların rezervi.
 *
 * Bunun sonucu, spec'in *"pencere bitince kalan bakiye genel havuza geri
 * döner (kafe kaybetmez)"* kuralının **kendiliğinden** sağlanması: geri
 * dönecek bir şey yok, çünkü hiçbir şey ayrılmadı. Bütçe defterine yeni bir
 * hareket türü de girmiyor — E10 ve E11'in dört sayılı formülü aynen duruyor.
 *
 * ── Pencerede ne değişiyor ──────────────────────────────────
 *
 * Normalde anlık ödül günde bir kez düşüyor (docs/06 §3). Açık pencerede
 * oyuncu **ikinci bir anlık ödül** kazanabiliyor; maliyeti havuzdan sayılıyor.
 * Havuz bitince pencere kapanıyor — oyun oynanmaya devam ediyor, o pencereden
 * ödül düşmüyor.
 *
 * ── A7: açmak ücretsiz, duyurmak ücretli ───────────────────
 *
 * Bu dosya yalnızca **açma** tarafını yazıyor. Duyuru (yakındaki oyunculara
 * bildirim) Boost ürününün kendisi ve buraya hiç girmiyor.
 */

/** Ö3: pencere en az bu kadar sürer. */
export const EN_KISA_SAAT = 1;

/** Ö3: pencere en fazla bu kadar sürer. Tüm gün süren havuz, havuz değildir. */
export const EN_UZUN_SAAT = 4;

/** Ö3: günde en fazla bu kadar pencere. Fazlası "sürekli happy hour" olur. */
export const GUNLUK_EN_FAZLA = 2;

export type Pencere = {
  id: string;
  baslangic: Date;
  bitis: Date;
  havuzKurus: number;
  harcananKurus: number;
  kalanKurus: number;
  /** Şu anda açık mı — saat aralığında ve havuzu bitmemiş. */
  acikMi: boolean;
  /** Saati geçmiş mi. */
  bittiMi: boolean;
  /** Havuzu tükendiği için mi kapandı. */
  havuzBittiMi: boolean;
  iptalMi: boolean;
};

export type PencereSonucu = { ok: true; id: string } | { ok: false; hata: string };

/* ── Okuma ─────────────────────────────────────────────────── */

type HamPencere = {
  id: string;
  starts_at: Date;
  ends_at: Date;
  pool_kurus: string;
  harcanan: string;
  cancelled_at: Date | null;
};

const SORGU = `
  SELECT h.id, h.starts_at, h.ends_at, h.pool_kurus, h.cancelled_at,
         COALESCE((SELECT sum(c.reserved_kurus) FROM coupons c
                    WHERE c.happy_hour_id = h.id), 0) AS harcanan
    FROM happy_hours h`;

function cevir(r: HamPencere, simdi = Date.now()): Pencere {
  const havuz = Number(r.pool_kurus);
  const harcanan = Number(r.harcanan);
  const kalan = Math.max(0, havuz - harcanan);

  return {
    id: r.id,
    baslangic: r.starts_at,
    bitis: r.ends_at,
    havuzKurus: havuz,
    harcananKurus: harcanan,
    kalanKurus: kalan,
    acikMi:
      !r.cancelled_at &&
      kalan > 0 &&
      r.starts_at.getTime() <= simdi &&
      r.ends_at.getTime() > simdi,
    bittiMi: r.ends_at.getTime() <= simdi,
    havuzBittiMi: kalan === 0,
    iptalMi: !!r.cancelled_at,
  };
}

/** Kafenin bugünkü pencereleri — iptal edilenler dahil. */
export async function bugunkuler(cafeId: string, gun = isGunu()): Promise<Pencere[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<HamPencere>(`${SORGU} WHERE h.business_date = $1 ORDER BY h.starts_at`, [gun]),
  );
  return satirlar.map((r) => cevir(r));
}

/**
 * Şu an açık pencere — yoksa null.
 *
 * `withBypass`: oyuncu bağlamından da çağrılıyor (ana ekran şeridi) ve
 * `happy_hours` üzerinde oyuncu politikası yok. Süzgeç SQL'de açıkça
 * `cafe_id = $1`; bağlam gevşedi diye sorgu gevşemiyor — `masa.aktif` ile
 * aynı gerekçe.
 */
export async function acikPencere(cafeId: string): Promise<Pencere | null> {
  return withBypass("açık happy hour", (db) => acikPencereIle(db, cafeId));
}

/** Var olan bir işlemin içinde sorar — kupon üretimi bunu kullanıyor. */
export async function acikPencereIle(db: Db, cafeId: string): Promise<Pencere | null> {
  const r = await db.one<HamPencere>(
    `${SORGU}
      WHERE h.cafe_id = $1 AND h.cancelled_at IS NULL
        AND h.starts_at <= now() AND h.ends_at > now()
      ORDER BY h.starts_at
      LIMIT 1`,
    [cafeId],
  );
  if (!r) return null;

  const p = cevir(r);
  // Havuzu bitmiş pencere "açık" sayılmıyor: oyun oynanır, o pencereden
  // ödül düşmez (Ö3).
  return p.acikMi ? p : null;
}

/* ── Yazma ─────────────────────────────────────────────────── */

/**
 * Pencere açar.
 *
 * Dört kural birden sınanıyor ve dördü de spec'ten geliyor: süre 1–4 saat,
 * günde en fazla iki pencere, havuz pozitif, pencereler çakışmıyor.
 *
 * Çakışma yasağı spec'te yazmıyor ama zorunlu: iki açık pencere olsaydı
 * `acikPencere` birini seçmek zorunda kalır, diğerinin havuzu sessizce
 * kullanılmazdı — kafe ayırdığı parayı neden dağıtamadığını anlayamazdı.
 */
export async function pencereAc(opts: {
  cafeId: string;
  baslangic: Date;
  bitis: Date;
  havuzKurus: number;
  aktorId: string;
  gun?: string;
}): Promise<PencereSonucu> {
  const { baslangic, bitis, havuzKurus } = opts;
  const gun = opts.gun ?? isGunu();

  if (!Number.isFinite(havuzKurus) || havuzKurus <= 0) {
    return { ok: false, hata: "Havuz tutarı sıfırdan büyük olmalı." };
  }

  const sureSaat = (bitis.getTime() - baslangic.getTime()) / 3_600_000;
  if (!Number.isFinite(sureSaat) || sureSaat < EN_KISA_SAAT) {
    return { ok: false, hata: `Pencere en az ${EN_KISA_SAAT} saat sürmeli.` };
  }
  if (sureSaat > EN_UZUN_SAAT) {
    return { ok: false, hata: `Pencere en fazla ${EN_UZUN_SAAT} saat sürebilir.` };
  }

  return withCafe(opts.cafeId, async (db) => {
    const bugunkuler = await db.all<{ id: string; starts_at: Date; ends_at: Date }>(
      `SELECT id, starts_at, ends_at FROM happy_hours
        WHERE business_date = $1 AND cancelled_at IS NULL`,
      [gun],
    );

    if (bugunkuler.length >= GUNLUK_EN_FAZLA) {
      return {
        ok: false as const,
        hata: `Günde en fazla ${GUNLUK_EN_FAZLA} pencere açabilirsin. Sürekli happy hour, happy hour değildir.`,
      };
    }

    const cakisan = bugunkuler.some(
      (p) => p.starts_at.getTime() < bitis.getTime() && p.ends_at.getTime() > baslangic.getTime(),
    );
    if (cakisan) {
      return { ok: false as const, hata: "Bu saatler bugünkü başka bir pencereyle çakışıyor." };
    }

    const id = newId("hh");
    await db.query(
      `INSERT INTO happy_hours
         (id, cafe_id, business_date, starts_at, ends_at, pool_kurus, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, opts.cafeId, gun, baslangic, bitis, havuzKurus, opts.aktorId],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "happyhour.open",
      targetType: "happy_hour",
      targetId: id,
      detail: { havuzKurus, sureSaat },
    });

    log.info("happy hour acildi", { havuzKurus, sureSaat });
    return { ok: true as const, id };
  });
}

/**
 * Pencereyi erken kapatır.
 *
 * Satır silinmiyor: pencerede dağıtılmış kuponlar ona etiketli ve geçmiş
 * bozulmamalı. Kapatmak yalnızca "bundan sonra bu havuzdan ödül çıkmasın"
 * demek.
 */
export async function pencereKapat(opts: {
  cafeId: string;
  pencereId: string;
  aktorId: string;
}): Promise<PencereSonucu> {
  return withCafe(opts.cafeId, async (db) => {
    const r = await db.query(
      `UPDATE happy_hours SET cancelled_at = now()
        WHERE id = $1 AND cancelled_at IS NULL`,
      [opts.pencereId],
    );
    if (!r.rowCount) return { ok: false as const, hata: "Pencere bulunamadı." };

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "happyhour.close",
      targetType: "happy_hour",
      targetId: opts.pencereId,
    });

    return { ok: true as const, id: opts.pencereId };
  });
}


/* ── Haftalık program (Ü104) ────────────────────────────────
 *
 * Ürün sahibi: *"kafe istediği gibi günü ve saati seçer; ister haftanın
 * her günü belirli saat, ister farklı günlerde farklı saatler."*
 *
 * Program **haftagünü başına bir satır**. Tek bir "her gün şu saat" kalıbı
 * sorulanın yarısını karşılardı; kafenin salı ve cumartesi boş saatleri
 * aynı değil.
 *
 * ⚠️ Program pencereyi kendisi açmıyor — `programlariUygula` açıyor ve o da
 * bakım köprüsünden (dakikada bir) çağrılıyor. Program satırı bir **niyet**;
 * pencere ise gerçekleşmiş olan şey ve havuzu erimeye başlıyor. İkisini
 * ayırmasaydık "bugün ne kadar dağıtıldı" sorusunun cevabı programın içinde
 * kaybolurdu.
 */

export type Program = {
  id: string;
  haftaGunu: number;
  baslangicDakika: number;
  sureDakika: number;
  havuzKurus: number;
};

type HamProgram = {
  id: string;
  weekday: number;
  start_minute: number;
  duration_min: number;
  pool_kurus: string;
};

function programCevir(r: HamProgram): Program {
  return {
    id: r.id,
    haftaGunu: r.weekday,
    baslangicDakika: r.start_minute,
    sureDakika: r.duration_min,
    havuzKurus: Number(r.pool_kurus),
  };
}

/** Kafenin haftalık programı — panel için, gün sırasıyla. */
export async function programlar(cafeId: string): Promise<Program[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<HamProgram>(
      `SELECT id, weekday, start_minute, duration_min, pool_kurus
         FROM happy_hour_plans
        WHERE active
        ORDER BY weekday`,
    ),
  );
  return satirlar.map(programCevir);
}

/**
 * Bir haftagününün programını kurar ya da kaldırır.
 *
 * `havuzKurus` null geldiğinde o günün programı **kapatılıyor** — satır
 * silinmiyor, `active = false` oluyor: geçmişte o programdan açılmış
 * pencereler `plan_id` ile ona bağlı ve geçmiş bozulmamalı (E3).
 */
export async function programKur(opts: {
  cafeId: string;
  haftaGunu: number;
  baslangicDakika: number | null;
  sureDakika: number | null;
  havuzKurus: number | null;
  aktorId: string;
}): Promise<PencereSonucu> {
  if (!Number.isInteger(opts.haftaGunu) || opts.haftaGunu < 0 || opts.haftaGunu > 6) {
    return { ok: false, hata: "Geçersiz gün." };
  }

  const kaldir = opts.havuzKurus == null;

  if (!kaldir) {
    if (!Number.isFinite(opts.havuzKurus) || (opts.havuzKurus ?? 0) <= 0) {
      return { ok: false, hata: "Havuz tutarı sıfırdan büyük olmalı." };
    }
    const bas = opts.baslangicDakika;
    if (bas == null || !Number.isInteger(bas) || bas < 0 || bas > 1439) {
      return { ok: false, hata: "Başlangıç saati geçersiz." };
    }
    const sure = opts.sureDakika ?? 0;
    if (sure < EN_KISA_SAAT * 60 || sure > EN_UZUN_SAAT * 60) {
      return { ok: false, hata: `Pencere ${EN_KISA_SAAT}–${EN_UZUN_SAAT} saat arası olmalı.` };
    }
    // Ü90 ve Ü103'teki aynı bilinen sınır: pencere gece yarısını aşamıyor.
    if (bas + sure > 1440) {
      return { ok: false, hata: "Pencere gece yarısını aşamıyor." };
    }
  }

  return withCafe(opts.cafeId, async (db) => {
    // Haftagünü başına tek aktif program (tekil indeks): varsa önce kapat.
    await db.query(
      `UPDATE happy_hour_plans SET active = false WHERE weekday = $1 AND active`,
      [opts.haftaGunu],
    );

    if (kaldir) {
      await audit(db, {
        actorType: "staff",
        actorId: opts.aktorId,
        cafeId: opts.cafeId,
        action: "happyhour.open",
        targetType: "happy_hour",
        detail: { program: "kaldirildi", haftaGunu: opts.haftaGunu },
      });
      return { ok: true as const, id: "" };
    }

    const id = newId("hhp");
    await db.query(
      `INSERT INTO happy_hour_plans
         (id, cafe_id, weekday, start_minute, duration_min, pool_kurus, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        id,
        opts.cafeId,
        opts.haftaGunu,
        opts.baslangicDakika,
        opts.sureDakika,
        opts.havuzKurus,
        opts.aktorId,
      ],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "happyhour.open",
      targetType: "happy_hour",
      targetId: id,
      detail: {
        program: "kuruldu",
        haftaGunu: opts.haftaGunu,
        baslangicDakika: opts.baslangicDakika,
        sureDakika: opts.sureDakika,
        havuzKurus: opts.havuzKurus,
      },
    });

    return { ok: true as const, id };
  });
}

/**
 * Bugüne düşen programları pencereye çevirir (Ü104).
 *
 * Bakım köprüsünden dakikada bir çağrılıyor.
 *
 * ⚠️ **Aynı gün ikinci kez açılmıyor**: `(plan_id, business_date)` tekil.
 * Köprü dakikada bir koştuğu için bu şart — yoksa her dakika yeni bir
 * pencere doğar ve kafenin havuzu katlanarak açılırdı.
 *
 * ⚠️ **Geçmişe dönük açılmıyor.** Bitiş saati geçmişse o gün atlanıyor:
 * akşam 20:00'de "öğlen 14:00'te happy hour vardı" diye pencere açmak
 * kimseye ödül dağıtmaz, yalnızca raporu kirletir.
 *
 * ⚠️ Bütçe kontrolü **burada yok**. Havuz artık günlük bütçeden ayrı bir
 * para (ürün sahibi: *"happy hour'a özel bütçe olacak"*); pencerenin
 * açılması günlük bütçenin durumuna bağlı değil.
 */
export async function programlariUygula(): Promise<number> {
  const gun = isGunu();
  const simdi = new Date();
  const haftaGunu = istanbulHaftaGunu(simdi);

  return withBypass("happy hour programlarını uygula", async (db) => {
    const adaylar = await db.all<HamProgram & { cafe_id: string; created_by: string }>(
      `SELECT p.id, p.cafe_id, p.weekday, p.start_minute, p.duration_min,
              p.pool_kurus, p.created_by
         FROM happy_hour_plans p
        WHERE p.active AND p.weekday = $2
          AND NOT EXISTS (
            SELECT 1 FROM happy_hours h
             WHERE h.plan_id = p.id AND h.business_date = $1
          )`,
      [gun, haftaGunu],
    );

    let acilan = 0;

    for (const a of adaylar) {
      const baslangic = istanbulAn(gun, a.start_minute);
      const bitis = new Date(baslangic.getTime() + a.duration_min * 60_000);

      // Saati geçmişse bugün için atlanıyor — yarın tekrar denenir.
      if (bitis <= simdi) continue;

      await db.query(
        `INSERT INTO happy_hours
           (id, cafe_id, business_date, starts_at, ends_at, pool_kurus, created_by, plan_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT DO NOTHING`,
        [
          newId("hh"),
          a.cafe_id,
          gun,
          baslangic,
          bitis,
          Number(a.pool_kurus),
          a.created_by,
          a.id,
        ],
      );
      acilan++;
    }

    if (acilan) log.info("happy hour programdan acildi", { adet: acilan });
    return acilan;
  });
}

/**
 * Bugünün Happy Hour havuzu toplamı (Ü104).
 *
 * Bütçe ekranı toplam taahhüdü yazabilsin diye var: kafenin o günkü
 * taahhüdü artık `günlük bütçe + happy hour havuzu` ve ikisini ayrı ayrı
 * göstermek, kafenin gerçekte ne kadar söz verdiğini gizlemek olurdu.
 */
export async function bugunkuHavuzKurus(cafeId: string, gun = isGunu()): Promise<number> {
  const r = await withCafe(cafeId, (db) =>
    db.one<{ toplam: string }>(
      `SELECT COALESCE(sum(pool_kurus), 0) AS toplam FROM happy_hours
        WHERE business_date = $1 AND cancelled_at IS NULL`,
      [gun],
    ),
  );
  return Number(r?.toplam ?? 0);
}

const KISA_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * İstanbul saatiyle haftanın günü (0=Pazar…6=Cumartesi).
 *
 * `getDay()` DEĞİL: sunucu UTC'de koşuyor ve gece yarısı çevresinde gün
 * kayıyor. Ü103'teki aynı gerekçe, aynı numaralandırma.
 */
export function istanbulHaftaGunu(an: Date): number {
  const kisa = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
  }).format(an);
  return KISA_EN.indexOf(kisa);
}

/**
 * `YYYY-MM-DD` + gün içi dakika → gerçek an (İstanbul).
 *
 * Dizgiden kuruluyor: `setHours` sunucunun yerel saatini kullanır ve
 * sunucu UTC'de koştuğu için üç saat kayardı.
 */
function istanbulAn(gunIso: string, dakika: number): Date {
  const saat = String(Math.floor(dakika / 60)).padStart(2, "0");
  const dk = String(dakika % 60).padStart(2, "0");
  return new Date(`${gunIso}T${saat}:${dk}:00+03:00`);
}
