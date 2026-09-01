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
  /** Bu tutarın üstündeki ödül 24 saat sonra açılır (Ü28, kuruş). */
  ertelemeEsigi: "erteleme_esigi_kurus",
  /**
   * Kafenin bir günde dağıtmayı taahhüt ettiği ödül değeri (Ü45, kuruş).
   *
   * Her sabah yeniden bütçe girmek zorunda kalmasın diye burada duruyor:
   * o günün dönemi ilk ihtiyaç anında bu tutarla açılıyor. Kafe istediği
   * günü ayrıca değiştirebiliyor — "yarın maç var, havuzu artırayım".
   */
  gunlukButce: "gunluk_butce_kurus",
  /**
   * Bir müşterinin ortalama hesabı (kuruş).
   *
   * Yalnızca **raporun getiri tahmininde** kullanılıyor: "bu kadar ziyaret
   * geldi" sayısını kafenin anladığı birime, paraya çevirmek için. Ödül
   * dağıtımına, bütçeye, kupon tutarına hiç girmiyor — yanlış girilmesi
   * kimseye para kaybettirmez, yalnızca tahmini bozar.
   *
   * Varsayılanı biz uyduramayız; kafeden başka kimse bilmiyor. O yüzden
   * rapor, tahmini gösterirken hangi tutarı kullandığını da yazıyor.
   */
  ortalamaAdisyon: "ortalama_adisyon_kurus",
  /**
   * Çarkta çıkabilecek en büyük ödül (Ü49, kuruş).
   *
   * Çark ödülleri kafenin **günlük havuzundan** çıkıyor (E10) ama havuzun
   * kendisi tek bir ödülün büyüklüğünü sınırlamıyor: 1.500 TL'lik havuzdan
   * tek seferde 300 TL'lik bir ödül de çıkabilir. Ürün sahibinin tarifi
   * bunun tersi — *"çok da yüksek ödüller vermeyen bir çark."*
   *
   * Bu yüzden ayrı bir tavan: bu tutarın üstündeki anlık ödüller çarka
   * hiç girmiyor. Katalogda durmaya devam ediyorlar, oyun içi anlık ödül
   * olarak çıkabiliyorlar — yalnızca çarkın listesinde yoklar.
   */
  carkUstSinir: "cark_ust_sinir_kurus",
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
  // Alt sınır Ü45'in günlük tabanı; üst sınır yok denecek kadar yüksek
  // tutuluyor — kafenin ne kadar dağıtacağı bizim kararımız değil.
  [ANAHTARLAR.gunlukButce]: { en_az: 1_500_00, en_cok: 100_000_00, varsayilan: 1_500_00 },
  // Bir kahveden ucuz olamaz, bir masanın toplam hesabından pahalı olmasın.
  [ANAHTARLAR.ortalamaAdisyon]: { en_az: 20_00, en_cok: 5_000_00, varsayilan: 150_00 },
  // Varsayılan 25 TL: bir kahvenin altında, "küçük ödül" tarifine uyuyor.
  // Üst sınır 200 TL — kafe isterse çarkı büyütebilir ama sınırsız değil.
  [ANAHTARLAR.carkUstSinir]: { en_az: 5_00, en_cok: 200_00, varsayilan: 25_00 },
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
