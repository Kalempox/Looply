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

/**
 * Kafenin bugünkü pencereleri — iptal edilenler dahil.
 *
 * Ü277: önce bugünün programı uygulanıyor — panel, programdan doğacak
 * pencereyi bakım işini beklemeden göstersin.
 */
export async function bugunkuler(cafeId: string, gun = isGunu()): Promise<Pencere[]> {
  const satirlar = await withCafe(cafeId, async (db) => {
    if (gun === isGunu()) await programlariUygulaIle(db, { cafeId });
    return db.all<HamPencere>(`${SORGU} WHERE h.business_date = $1 ORDER BY h.starts_at`, [gun]);
  });
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

/**
 * Var olan bir işlemin içinde sorar — kupon üretimi bunu kullanıyor.
 *
 * 🔴 Ü277: önce bugünün programı uygulanıyor. Program pencereyi yalnızca
 * bakım köprüsü açıyordu ve köprü yalnızca Ödüllerim/Davet/Bütçe/Rapor
 * ekranları açılınca koşuyordu: kimse o ekranları açmazsa haftalık happy
 * hour **hiç başlamıyordu**. Ürün sahibi: *"panel göstermelik mi, gerçekten
 * oyunculara yansıyor mu?"* Artık ödül kararının kendisi programa bakıyor —
 * para yolundaki doğruluk arka plan işine bağlanmıyor (`bakim.ts`'in
 * kuralı).
 */
export async function acikPencereIle(db: Db, cafeId: string): Promise<Pencere | null> {
  await programlariUygulaIle(db, { cafeId });
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


/* ── Haftalık program (Ü104 · Ü277) ─────────────────────────
 *
 * Ürün sahibi: *"kafe istediği gibi günü ve saati seçer; ister haftanın
 * her günü belirli saat, ister farklı günlerde farklı saatler."*
 *
 * Program **haftagünü başına bir satır**. Tek bir "her gün şu saat" kalıbı
 * sorulanın yarısını karşılardı; kafenin salı ve cumartesi boş saatleri
 * aynı değil.
 *
 * ⚠️ Program pencereyi kendisi açmıyor — `programlariUygula` açıyor. Ü277'ye
 * kadar yalnızca bakım köprüsünden çağrılıyordu ve köprü ancak belli
 * ekranlar açılınca koşuyordu; artık ödül kararı, panel ve program kaydı da
 * kendi kafesi için çağırıyor (`programlariUygulaIle`). Program satırı bir **niyet**;
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
/**
 * Ü279: bugünün programı kaydedilince BUGÜN ne oldu — panel bunu söylüyor.
 *
 * - `acildi`: bugünün penceresi açıldı (saati gelince başlar ya da şu an açık).
 * - `ikinci`: bugün zaten bir happy hour yapılmıştı ya da sürüyordu; yeni
 *   saat onun yanına ikinci pencere olarak açıldı.
 * - `gecti`: yeni saatin bitişi bugün için geçmiş — gelecek haftadan.
 * - `sinir`: bugün `GUNLUK_EN_FAZLA` pencere dolu — gelecek haftadan.
 * - `cakisiyor`: süren pencereyle çakışıyor — gelecek haftadan.
 */
export type BugunSonucu = "acildi" | "ikinci" | "gecti" | "sinir" | "cakisiyor";

export type ProgramSonucu =
  | {
      ok: true;
      id: string;
      /** Program bugünün değilse (ya da kaldırıldıysa) `null`. */
      bugun: BugunSonucu | null;
      /** Bugün programdan açılmış bir pencere şu an sürüyor mu — kaldırma mesajı için. */
      bugunSuruyor: boolean;
    }
  | { ok: false; hata: string };

export async function programKur(opts: {
  cafeId: string;
  haftaGunu: number;
  baslangicDakika: number | null;
  sureDakika: number | null;
  havuzKurus: number | null;
  aktorId: string;
}): Promise<ProgramSonucu> {
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

    /*
      Ü277: program BUGÜNÜN ise bugünkü pencere hemen etkileniyor.

      · Henüz başlamamış program penceresi iptal — yeni program onun yerine
        geçiyor (eski saatte ikinci bir pencere açılmasın).
      · Sürmekte olan pencereye dokunulmuyor: oyuncular o an ödül
        kazanıyor olabilir.

      🔴 Ü279: Ü278'deki "günde bir program penceresi" kuralı KALKTI.
      Ürün sahibi Perşembe 14:43'te Perşembe satırına 14:00–17:00 yazdı;
      sabahki pencere yapılmış olduğu için yeni saat bugün açılmadı ve
      "neden açılmadı" dedi. Karar: **kafenin son kaydı geçerli** — bugünün
      satırına yazılan saat bugün de açılıyor. Kalan korumalar: günde en
      fazla `GUNLUK_EN_FAZLA` pencere ve süren pencereyle çakışmama.
    */
    const bugunMu = opts.haftaGunu === istanbulHaftaGunu(new Date());
    let bugunSuruyor = false;
    let oncekiVar = false;
    if (bugunMu) {
      await db.query(
        `UPDATE happy_hours SET cancelled_at = now()
          WHERE cafe_id = $1 AND business_date = $2 AND plan_id IS NOT NULL
            AND cancelled_at IS NULL AND starts_at > now()`,
        [opts.cafeId, isGunu()],
      );
      // Bugün başlamış (süren ya da bitmiş) bir happy hour var mı —
      // programdan ya da elle. Varsa yeni pencere "ikinci" oluyor.
      const bugunku = await db.one<{ suruyor: boolean; baslamis: boolean }>(
        `SELECT bool_or(plan_id IS NOT NULL AND ends_at > now()) AS suruyor,
                bool_or(starts_at <= now()) AS baslamis
           FROM happy_hours
          WHERE cafe_id = $1 AND business_date = $2 AND cancelled_at IS NULL`,
        [opts.cafeId, isGunu()],
      );
      bugunSuruyor = bugunku?.suruyor === true;
      oncekiVar = bugunku?.baslamis === true;
    }

    if (kaldir) {
      await audit(db, {
        actorType: "staff",
        actorId: opts.aktorId,
        cafeId: opts.cafeId,
        action: "happyhour.open",
        targetType: "happy_hour",
        detail: { program: "kaldirildi", haftaGunu: opts.haftaGunu },
      });
      return { ok: true as const, id: "", bugun: null, bugunSuruyor };
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

    // Ü277: bugünün programıysa pencere bakım işini beklemeden açılıyor.
    if (!bugunMu) return { ok: true as const, id, bugun: null, bugunSuruyor };

    const acilan = await programlariUygulaIle(db, { cafeId: opts.cafeId });
    if (acilan > 0) {
      return { ok: true as const, id, bugun: oncekiVar ? "ikinci" : "acildi", bugunSuruyor };
    }

    // Açılmadı — panel nedenini söylesin (Ü279).
    const baslangic = istanbulAn(isGunu(), opts.baslangicDakika!);
    const bitis = new Date(baslangic.getTime() + opts.sureDakika! * 60_000);
    if (bitis <= new Date()) {
      return { ok: true as const, id, bugun: "gecti", bugunSuruyor };
    }
    const canli = await db.one<{ n: string }>(
      `SELECT count(*)::text AS n FROM happy_hours
        WHERE cafe_id = $1 AND business_date = $2 AND cancelled_at IS NULL`,
      [opts.cafeId, isGunu()],
    );
    return {
      ok: true as const,
      id,
      bugun: Number(canli?.n ?? 0) >= GUNLUK_EN_FAZLA ? "sinir" : "cakisiyor",
      bugunSuruyor,
    };
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
  return withBypass("happy hour programlarını uygula", (db) => programlariUygulaIle(db));
}

/**
 * `programlariUygula`nın işlem içi hâli — Ü277.
 *
 * Ödül kararı (`acikPencereIle`), panel (`bugunkuler`) ve program kaydı
 * (`programKur`) bunu kendi işleminin içinden, yalnızca kendi kafesi için
 * çağırıyor. Bakım köprüsü hepsini birden.
 *
 * ⚠️ Kafenin **elle kapattığı** pencere yeniden açılmıyor: tekillik
 * `(plan_id, business_date)` — iptal edilmiş satır da sayılıyor.
 * ⚠️ Aynı saatlerde süren canlı bir pencere varsa açılmıyor: program
 * yeniden kaydedildiğinde eskisinin sürmekte olan penceresi ile yenisi üst
 * üste binmesin.
 * ⚠️ **Günde en fazla `GUNLUK_EN_FAZLA` pencere** — elle açılanlar dahil,
 * elle pencere açmanın kuralıyla aynı sayım (iptal edilen sayılmıyor).
 * Ü278'deki "günde bir program penceresi" kuralı Ü279'da kalktı: ürün
 * sahibinin kararıyla bugünün satırına yazılan yeni saat bugün de açılıyor.
 */
async function programlariUygulaIle(db: Db, opts: { cafeId?: string } = {}): Promise<number> {
  const gun = isGunu();
  const simdi = new Date();
  const haftaGunu = istanbulHaftaGunu(simdi);

  const adaylar = await db.all<HamProgram & { cafe_id: string; created_by: string }>(
    `SELECT p.id, p.cafe_id, p.weekday, p.start_minute, p.duration_min,
            p.pool_kurus, p.created_by
       FROM happy_hour_plans p
      WHERE p.active AND p.weekday = $2
        AND ($3::text IS NULL OR p.cafe_id = $3)
        AND NOT EXISTS (
          SELECT 1 FROM happy_hours h
           WHERE h.plan_id = p.id AND h.business_date = $1
        )
        AND (
          SELECT count(*) FROM happy_hours h
           WHERE h.cafe_id = p.cafe_id AND h.business_date = $1 AND h.cancelled_at IS NULL
        ) < $4`,
    [gun, haftaGunu, opts.cafeId ?? null, GUNLUK_EN_FAZLA],
  );

  let acilan = 0;

  for (const a of adaylar) {
    const baslangic = istanbulAn(gun, a.start_minute);
    const bitis = new Date(baslangic.getTime() + a.duration_min * 60_000);

    // Saati geçmişse bugün için atlanıyor — yarın tekrar denenir.
    if (bitis <= simdi) continue;

    const cakisan = await db.one(
      `SELECT 1 FROM happy_hours
        WHERE cafe_id = $1 AND business_date = $2 AND cancelled_at IS NULL
          AND starts_at < $4 AND ends_at > $3
        LIMIT 1`,
      [a.cafe_id, gun, baslangic, bitis],
    );
    if (cakisan) continue;

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
