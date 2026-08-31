import { withCafe } from "@/db/context";
import { audit } from "@/lib/audit";

/**
 * Kafe ayarları — panelden değiştirilebilen değerler.
 *
 * ── Neden anahtar-değer ─────────────────────────────────────
 *
 * Her ayar için `cafes` tablosuna kolon açmak, on ayarda on göç demek ve
 * ayarların çoğu birkaç kafeyi ilgilendiriyor. `cafe_config` tablosu bu iş
 * için zaten vardı; bugüne kadar boştu.
 *
 * ── Buraya NE girmez ────────────────────────────────────────
 *
 * Platform kuralları. E6'nın kanıt kademesi (ödül değeri arttıkça daha
 * güçlü kanıt) ve E10'un bütçe tavanı kafenin seçimi değil: kafe kendi
 * ödülünün kanıt şartını gevşetebilseydi, en pahalı ödülü en zayıf kanıtla
 * vermenin yolu açılırdı. Buraya yalnızca kafenin **kendi ekonomisine**
 * ait tercihler giriyor.
 */

export const ANAHTARLAR = {
  /** Bu tutarın üstündeki ödül gecikmeli açılır (Ü28, kuruş). */
  ertelemeEsigi: "erteleme_esigi_kurus",
} as const;

export type Anahtar = (typeof ANAHTARLAR)[keyof typeof ANAHTARLAR];

/**
 * Sayısal ayarların sınırları.
 *
 * Sınırsız bırakılamaz: eşiği çok yükseğe çeken bir kafe ertelemeyi fiilen
 * kapatır ve Ü28'in getirdiği ertesi ziyaret döngüsü yok olur. Sıfıra
 * çekense her ödülü erteler — o da kafenin hakkı, ama kasada "kupon neden
 * açılmıyor" sorusunu çoğaltır. Aralık ikisini de görünür kılıyor.
 */
export const SINIRLAR: Record<Anahtar, { en_az: number; en_cok: number; varsayilan: number }> = {
  [ANAHTARLAR.ertelemeEsigi]: { en_az: 0, en_cok: 500_00, varsayilan: 50_00 },
};

export async function sayiOku(cafeId: string, anahtar: Anahtar): Promise<number> {
  const sinir = SINIRLAR[anahtar];

  const r = await withCafe(cafeId, (db) =>
    db.one<{ value: string }>(`SELECT value FROM cafe_config WHERE key = $1`, [anahtar]),
  );
  if (!r) return sinir.varsayilan;

  const n = Number(r.value);
  // Bozuk değer varsayılana düşüyor: ayar tablosu yüzünden ödül dağıtımı
  // durmamalı. Kayıt bozuksa görülmesi gereken yer panel, kasa değil.
  if (!Number.isFinite(n) || !Number.isInteger(n)) return sinir.varsayilan;
  return Math.min(sinir.en_cok, Math.max(sinir.en_az, n));
}

export type AyarSonucu = { ok: true } | { ok: false; hata: string };

export async function sayiYaz(opts: {
  cafeId: string;
  anahtar: Anahtar;
  deger: number;
  aktorId: string;
}): Promise<AyarSonucu> {
  const sinir = SINIRLAR[opts.anahtar];

  if (!Number.isInteger(opts.deger) || opts.deger < sinir.en_az || opts.deger > sinir.en_cok) {
    return {
      ok: false,
      hata: `Değer ${sinir.en_az / 100} ile ${sinir.en_cok / 100} TL arasında olmalı.`,
    };
  }

  await withCafe(opts.cafeId, async (db) => {
    await db.query(
      `INSERT INTO cafe_config (cafe_id, key, value) VALUES ($1,$2,$3)
       ON CONFLICT (cafe_id, key) DO UPDATE SET value = EXCLUDED.value`,
      [opts.cafeId, opts.anahtar, String(opts.deger)],
    );

    // Ödül ekonomisini değiştiren her işlem denetim izine düşüyor: "kupon
    // neden bugün açılmadı" sorusunun cevabı burada aranacak.
    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "cafe.config_update",
      targetType: "cafe",
      targetId: opts.cafeId,
      detail: { anahtar: opts.anahtar, deger: opts.deger },
    });
  });

  return { ok: true };
}
