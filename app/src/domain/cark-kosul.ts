import { withCafe, withBypass, type Db } from "@/db/context";
import { newId } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { isGunu } from "@/lib/tarih";

/**
 * Çark koşulları — butiğin çark hakkını neye bağladığı (Ü137).
 *
 * ── Neden bir kural listesi ─────────────────────────────────
 *
 * Ürün sahibi tek bir kural istemedi: *"ister şu ürünü alana, ister şu
 * kadar harcama yapana, ister her gün, ister ilk gelen — nasıl isterse."*
 * Tek alanlı bir ayar bunların hiçbirini karşılamazdı.
 *
 * ── 🔴 Koşullar VEYA ile bağlanıyor ─────────────────────────
 *
 * Herhangi biri tutarsa hak doğuyor. VE olsaydı "3000 TL üstü **ve** şu
 * ürünü almış **ve** günün ilk beşinde" gibi hiç gerçekleşmeyen bir
 * kesişim kurulabilirdi ve butik bunu ancak haftalarca kimse çark
 * çeviremeyince fark ederdi.
 *
 * VEYA'nın bedeli de var ve açık: iki koşul birden tutarsa hak **bir
 * kez** doğuyor, iki kez değil. Hangi koşulun verdiği kayda geçiyor
 * (`cark_haklari.kosul_id`) — "bu hafta hangi kural işe yaradı"
 * sorusunun cevabı orada.
 *
 * ── Kafede kullanılmıyor ────────────────────────────────────
 *
 * Kafede çark hakkını oyun veriyor ve o yol hiç değişmedi
 * (`domain/cark.ts` → `durum`). Bu dosya yalnızca butik yolu. İkisini
 * tek motora sıkıştırmak, kafenin çalışan akışını butik için riske
 * atmak olurdu.
 */

export type KosulTuru = "tutar" | "urun" | "gunluk" | "ilk_gelen";

export type Kosul = {
  id: string;
  tur: KosulTuru;
  /** `tutar` için eşik (kuruş). */
  esikKurus: number | null;
  /** `urun` için ürün. */
  urunId: string | null;
  urunAdi: string | null;
  /** `ilk_gelen` için kişi sayısı. */
  adet: number | null;
  aktif: boolean;
};

export type KosulSonucu = { ok: true; id: string } | { ok: false; hata: string };

/** Tutar eşiğinin sınırları — sıfır "herkese" demek olurdu. */
export const EN_AZ_ESIK_KURUS = 50_00;
export const EN_COK_ESIK_KURUS = 100_000_00;

/** "İlk gelen" kaç kişiye kadar açılabilir. */
export const EN_COK_ADET = 100;

export function kosulMetni(k: Kosul): string {
  if (k.tur === "tutar") {
    return `${Math.round((k.esikKurus ?? 0) / 100).toLocaleString("tr-TR")} TL ve üzeri alışveriş`;
  }
  if (k.tur === "urun") return `${k.urunAdi ?? "Seçilen ürün"} alan müşteri`;
  if (k.tur === "gunluk") return "Her müşteri, günde bir kez";
  return `Günün ilk ${k.adet} müşterisi`;
}

/* ── Okuma ─────────────────────────────────────────────────── */

export async function listele(cafeId: string): Promise<Kosul[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{
      id: string;
      tur: KosulTuru;
      esik_kurus: string | null;
      product_id: string | null;
      urun_adi: string | null;
      adet: number | null;
      aktif: boolean;
    }>(
      `SELECT k.id, k.tur, k.esik_kurus, k.product_id, p.name AS urun_adi, k.adet, k.aktif
         FROM cark_kosullari k
         LEFT JOIN products p ON p.id = k.product_id
        ORDER BY k.aktif DESC, k.created_at`,
    ),
  );

  return satirlar.map((r) => ({
    id: r.id,
    tur: r.tur,
    esikKurus: r.esik_kurus === null ? null : Number(r.esik_kurus),
    urunId: r.product_id,
    urunAdi: r.urun_adi,
    adet: r.adet,
    aktif: r.aktif,
  }));
}

/* ── Değerlendirme — kasanın sorduğu soru ──────────────────── */

export type Degerlendirme =
  | { uygun: true; kosulId: string; sebep: string }
  | {
      uygun: false;
      /** Kasiyerin müşteriye söyleyeceği cümle. */
      sebep: string;
      /**
       * Ü137'nin çekirdeği: *"2500 olduğunu görünce diyecek ki 3000 ve
       * üzerinde çark şansınız var, isterseniz tamamlayın."*
       *
       * En yakın tutar koşuluna kaç kuruş kaldığı. Yalnızca **tutar**
       * koşulunda doluyor — "ürün alana" koşuluna 'tamamlama' diye bir
       * şey yok.
       */
      eksikKurus: number | null;
    };

/**
 * Bu alışveriş çark hakkı doğuruyor mu?
 *
 * ⚠️ Koşullar **VEYA**: ilk tutan kazanıyor ve fonksiyon orada duruyor.
 * Sıra `listele`nin sırası — işletmenin eklediği sıra. Hangi koşulun
 * verdiği kayda geçtiği için sıra sonradan denetlenebiliyor.
 *
 * ⚠️ Uygun değilse **en yakın tutar eşiği** hesaplanıyor. Birden çok
 * tutar koşulu varsa en düşük eksiği olan seçiliyor: müşteriye
 * söylenecek cümle "en kolay ulaşılan" olmalı.
 */
export async function degerlendir(opts: {
  cafeId: string;
  tutarKurus: number;
  /** Sepetteki ürünler — `urun` koşulu için. */
  urunIds?: string[];
}): Promise<Degerlendirme> {
  const kosullar = (await listele(opts.cafeId)).filter((k) => k.aktif);

  if (kosullar.length === 0) {
    return {
      uygun: false,
      sebep: "Bu işletmede tanımlı çark koşulu yok.",
      eksikKurus: null,
    };
  }

  const bugunVerilen = await gunlukSayim(opts.cafeId);

  for (const k of kosullar) {
    if (k.tur === "tutar" && opts.tutarKurus >= (k.esikKurus ?? Infinity)) {
      return { uygun: true, kosulId: k.id, sebep: kosulMetni(k) };
    }
    if (k.tur === "urun" && k.urunId && opts.urunIds?.includes(k.urunId)) {
      return { uygun: true, kosulId: k.id, sebep: kosulMetni(k) };
    }
    if (k.tur === "gunluk") {
      return { uygun: true, kosulId: k.id, sebep: kosulMetni(k) };
    }
    if (k.tur === "ilk_gelen" && bugunVerilen < (k.adet ?? 0)) {
      return { uygun: true, kosulId: k.id, sebep: kosulMetni(k) };
    }
  }

  /*
    Uygun değil. Kasiyere söyleyecek bir cümle veriyoruz — "olmadı"
    demek yetmez, satışı büyütebilecek olan bilgi eksik tutar.
  */
  const tutarKosullari = kosullar.filter(
    (k) => k.tur === "tutar" && k.esikKurus != null && k.esikKurus > opts.tutarKurus,
  );

  if (tutarKosullari.length > 0) {
    const enYakin = tutarKosullari.reduce((a, b) =>
      (a.esikKurus ?? 0) <= (b.esikKurus ?? 0) ? a : b,
    );
    const eksik = (enYakin.esikKurus ?? 0) - opts.tutarKurus;
    return {
      uygun: false,
      sebep: `${Math.round((enYakin.esikKurus ?? 0) / 100).toLocaleString("tr-TR")} TL ve üzeri alışverişte çark hakkı var.`,
      eksikKurus: eksik,
    };
  }

  const ilkGelen = kosullar.find((k) => k.tur === "ilk_gelen");
  if (ilkGelen) {
    return {
      uygun: false,
      sebep: `Bugünün ilk ${ilkGelen.adet} müşterisi hakkını kullandı.`,
      eksikKurus: null,
    };
  }

  return { uygun: false, sebep: "Bu alışveriş çark koşullarını karşılamıyor.", eksikKurus: null };
}

/**
 * Bugün bu işletmede kaç çark hakkı verildi.
 *
 * ⚠️ Gün başlangıcı **İstanbul gece yarısı**, sunucunun UTC günü değil —
 * 02:00'de kapanan bir butikte UTC günü sayarsa gece verilen haklar
 * ertesi güne yazılır ve "günün ilk beşi" beş olmaz.
 */
async function gunlukSayim(cafeId: string): Promise<number> {
  const r = await withCafe(cafeId, (db) =>
    db.one<{ n: string }>(
      `SELECT count(*) AS n FROM cark_haklari
        WHERE created_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul')`,
      [isGunu()],
    ),
  );
  return Number(r?.n ?? 0);
}

/* ── Yazma ─────────────────────────────────────────────────── */

export async function ekle(opts: {
  cafeId: string;
  tur: KosulTuru;
  esikKurus?: number;
  urunId?: string;
  adet?: number;
  aktorId: string;
}): Promise<KosulSonucu> {
  if (opts.tur === "tutar") {
    const e = opts.esikKurus ?? 0;
    if (!Number.isInteger(e) || e < EN_AZ_ESIK_KURUS || e > EN_COK_ESIK_KURUS) {
      return {
        ok: false,
        hata: `Eşik ${EN_AZ_ESIK_KURUS / 100} ile ${EN_COK_ESIK_KURUS / 100} TL arasında olmalı.`,
      };
    }
  }
  if (opts.tur === "urun" && !opts.urunId) {
    return { ok: false, hata: "Ürün seç." };
  }
  if (opts.tur === "ilk_gelen") {
    const a = opts.adet ?? 0;
    if (!Number.isInteger(a) || a < 1 || a > EN_COK_ADET) {
      return { ok: false, hata: `Kişi sayısı 1 ile ${EN_COK_ADET} arasında olmalı.` };
    }
  }

  return withCafe(opts.cafeId, async (db) => {
    if (opts.tur === "urun") {
      const urun = await db.one(`SELECT 1 FROM products WHERE id = $1 AND active`, [opts.urunId]);
      if (!urun) return { ok: false as const, hata: "Seçilen ürün bulunamadı." };
    }

    // ⚠️ Aynı türden ikinci bir aktif koşul engelleniyor (ürün hariç):
    // iki "günlük" koşulu ya da iki farklı eşik, hangisinin geçerli
    // olduğunu belirsizleştirir. Farklı ürünler için birden çok `urun`
    // koşulu anlamlı, o yüzden orası serbest.
    if (opts.tur !== "urun") {
      const varOlan = await db.one(
        `SELECT 1 FROM cark_kosullari WHERE tur = $1 AND aktif`,
        [opts.tur],
      );
      if (varOlan) {
        return { ok: false as const, hata: "Bu türde zaten açık bir koşul var. Önce onu kapat." };
      }
    }

    const id = newId("ksl");
    await db.query(
      `INSERT INTO cark_kosullari (id, cafe_id, tur, esik_kurus, product_id, adet, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        id,
        opts.cafeId,
        opts.tur,
        opts.tur === "tutar" ? (opts.esikKurus ?? null) : null,
        opts.tur === "urun" ? (opts.urunId ?? null) : null,
        opts.tur === "ilk_gelen" ? (opts.adet ?? null) : null,
        opts.aktorId,
      ],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "cark.kosul_ekle",
      targetType: "cark_kosul",
      targetId: id,
      detail: { tur: opts.tur, esikKurus: opts.esikKurus, adet: opts.adet },
    });

    return { ok: true as const, id };
  });
}

export async function durumDegistir(opts: {
  cafeId: string;
  kosulId: string;
  aktif: boolean;
  aktorId: string;
}): Promise<{ ok: true } | { ok: false; hata: string }> {
  return withCafe(opts.cafeId, async (db) => {
    const r = await db.query(`UPDATE cark_kosullari SET aktif = $2 WHERE id = $1`, [
      opts.kosulId,
      opts.aktif,
    ]);
    // RLS başka işletmenin koşulunu zaten göstermiyor; sıfır satır
    // "bu koşul senin değil" demek.
    if (!r.rowCount) return { ok: false as const, hata: "Koşul bulunamadı." };

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: opts.aktif ? "cark.kosul_ac" : "cark.kosul_kapat",
      targetType: "cark_kosul",
      targetId: opts.kosulId,
    });

    return { ok: true as const };
  });
}

/* ── İşletme türü ──────────────────────────────────────────── */

export type IsletmeTuru = "kafe" | "butik";

export async function isletmeTuru(cafeId: string): Promise<IsletmeTuru> {
  const r = await withBypass("işletme türü", (db) =>
    db.one<{ isletme_turu: IsletmeTuru }>(`SELECT isletme_turu FROM cafes WHERE id = $1`, [
      cafeId,
    ]),
  );
  return r?.isletme_turu ?? "kafe";
}

/** Bir işlemin içinden okuyanlar için — ayrı bağlantı açmadan. */
export async function isletmeTuruDb(db: Db, cafeId: string): Promise<IsletmeTuru> {
  const r = await db.one<{ isletme_turu: IsletmeTuru }>(
    `SELECT isletme_turu FROM cafes WHERE id = $1`,
    [cafeId],
  );
  return r?.isletme_turu ?? "kafe";
}
