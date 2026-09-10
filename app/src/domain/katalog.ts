import * as pencere from "./kullanim-penceresi";
import { withCafe } from "@/db/context";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";

/**
 * Ödül kataloğu — kafenin oyuncuya sunduğu ödüller.
 *
 * ── Üç tip (Ü18, Ü26) ───────────────────────────────────────
 *
 *   🏆 Ürün ödülü      kafenin kendi ürünü; `maliyetKurus` perakende değeri
 *   🎟️ Yüzdeli indirim yüzde + **TL tavanı**; `maliyetKurus` TAVANDIR (Ü17)
 *   💸 Tutar indirimi  sabit TL; `maliyetKurus` tutarın kendisi
 *
 * Kafe **bakiyesi** hâlâ yok (Ü18): saklanan değer aracı v1 kapsamı dışında.
 * Tutar indirimi bakiye DEĞİL — tek kullanımlık bir kupon; adisyondan bir
 * kez düşülüyor, kalanı saklanmıyor, sonraki ziyarete devretmiyor. Bakiyenin
 * getirdiği kısmi kullanım, kalan takibi, iade/itiraz akışı ve ödeme
 * mevzuatı sınırı bu tipte hiç doğmuyor.
 *
 * Rezervasyon üç tipte de aynı: her zaman `maliyetKurus` bütçeden rezerve
 * edilir. Yalnızca **yüzdelide** kasada gerçekleşen tutar düşülür ve fark
 * iade edilir; diğer ikisinde gerçekleşen zaten tutarın kendisi.
 *
 * ── Kanıt seviyesi kafenin seçimi değil ─────────────────────
 *
 * E6 ödül değerine göre kanıt seviyesi istiyor: 1–15 TL → K2, 16–50 TL → K3,
 * 51 TL+ → K4. Bu bir **platform kuralı**; kafenin panelinden seçilemiyor,
 * tutardan hesaplanıyor. Kafe seçebilseydi, en pahalı ödülü en zayıf kanıtla
 * verip fraud'a kapı açabilirdi.
 */

export type OdulTipi = "product" | "percent" | "amount";

export type Odul = {
  id: string;
  tip: OdulTipi;
  baslik: string;
  aciklama: string | null;
  /** Ürün ödülünde perakende değeri, yüzdelide TL tavanı, tutar indiriminde tutarın kendisi (kuruş). */
  maliyetKurus: number;
  /** Yüzdeli ödülde indirim oranı; ürün ödülünde null. */
  yuzde: number | null;
  puanFiyati: number;
  /** E2: anlık ödül puan istemez. */
  anlik: boolean;
  kanitSeviyesi: number;
  urunId: string | null;
  urunAdi: string | null;
  aktif: boolean;
  /** Ü94: adı değiştirmenin kaç dolaşımdaki kuponu etkileyeceği. */
  acikKupon: number;
  /** Ü103: günde en fazla kaç kupon verilebilir. null = sınırsız. */
  gunlukLimit: number | null;
  /** Ü103: bugün bu ödülden kaç kupon verildi — limitin canlı sayacı. */
  bugunVerilen: number;
  /** Ü103: kullanım penceresi cümlesi — kısıt yoksa null. */
  pencereMetni: string | null;
  pencere: pencere.Pencere;
};

export type OdulSonucu = { ok: true; id: string } | { ok: false; hata: string };

/* ── Ödül değerleri (Ü52) ──────────────────────────────────────
 *
 * Ürün sahibinin kuralı: **en az 25 TL, 5'er artışla, en çok 50 TL.**
 * Serbest tutar yerine sabit basamak olmasının iki faydası var: kafe
 * "27,50 TL indirim" gibi anlamsız bir ödül tanımlayamıyor ve çarkın
 * ağırlık hesabı öngörülebilir kalıyor.
 */

export const ODUL_EN_AZ = 25_00;
export const ODUL_EN_COK = 50_00;
export const ODUL_ADIM = 5_00;

/** Seçilebilir bütün ödül değerleri — panelin listesi de bu. */
export const ODUL_DEGERLERI: number[] = Array.from(
  { length: (ODUL_EN_COK - ODUL_EN_AZ) / ODUL_ADIM + 1 },
  (_, i) => ODUL_EN_AZ + i * ODUL_ADIM,
);

export function odulDegeriGecerliMi(kurus: number): boolean {
  return ODUL_DEGERLERI.includes(kurus);
}

/**
 * E6: ödül değerine göre gereken kanıt seviyesi.
 *
 * ── Kademeler neden kaydı (Ü52) ─────────────────────────────
 *
 * E6 önce şöyleydi: 1–15 TL → K2, 16–50 TL → K3, 51+ → K4. Ödül tabanı
 * 25 TL'ye çıkınca **her ödül K3 oldu** ve bu, çarkın ilk karekod akışını
 * sessizce öldürdü: karekodu yeni okutmuş bir ziyaretçi K2'de oluyor,
 * masada beş dakika geçirmiş olamaz. Yani "çevir, kaydol, al" akışında
 * ödül hiçbir zaman verilemezdi.
 *
 * E6'nın **ilkesi korundu** — büyük ödül daha güçlü kanıt ister — ama
 * kademeler yeni aralığa taşındı:
 *
 *   · 25–35 TL → K2 (konum doğrulandı)
 *   · 40–50 TL → K3 (masada beş dakika)
 *   · 51 TL+   → K4 (fiş kodu) — aralık dışı, güvenlik payı olarak duruyor
 *
 * ⚠️ Bu, bir güvenlik kuralının gevşemesidir: 25 TL'lik ödül eskiden beş
 * dakika isterken artık istemiyor. Bilerek yapıldı ve karar defterinde
 * öyle yazıyor; ürün sahibi tersini isterse tek satır.
 */
export function kanitSeviyesi(maliyetKurus: number): number {
  if (maliyetKurus <= 35_00) return 2;
  if (maliyetKurus <= 50_00) return 3;
  return 4;
}

export async function listele(cafeId: string): Promise<Odul[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{
      id: string;
      reward_type: OdulTipi;
      title: string;
      description: string | null;
      cost_kurus: string;
      percent: number | null;
      points_price: number;
      kind: string;
      min_proof_level: number;
      product_id: string | null;
      urun_adi: string | null;
      active: boolean;
      acik_kupon: string;
      daily_limit: number | null;
      bugun_verilen: string;
      usable_days: number[] | null;
      usable_from_hour: number | null;
      usable_to_hour: number | null;
    }>(
      `SELECT r.id, r.reward_type, r.title, r.description, r.cost_kurus, r.percent,
              r.points_price, r.kind, r.min_proof_level, r.product_id,
              p.name AS urun_adi, r.active,
              (SELECT count(*) FROM coupons c
                WHERE c.reward_id = r.id AND c.status IN ('pending','active')) AS acik_kupon,
              r.daily_limit, r.usable_days, r.usable_from_hour, r.usable_to_hour,
              (SELECT count(*) FROM coupons c
                WHERE c.reward_id = r.id AND c.status <> 'undone'
                  AND c.issued_at >= ((now() AT TIME ZONE 'Europe/Istanbul')::date::timestamp
                                       AT TIME ZONE 'Europe/Istanbul')) AS bugun_verilen
         FROM rewards r
         LEFT JOIN products p ON p.id = r.product_id
        ORDER BY r.active DESC, r.kind DESC, r.sort_order, r.points_price`,
    ),
  );

  return satirlar.map((r) => ({
    id: r.id,
    tip: r.reward_type,
    baslik: r.title,
    aciklama: r.description,
    maliyetKurus: Number(r.cost_kurus),
    yuzde: r.percent,
    puanFiyati: r.points_price,
    anlik: r.kind === "instant",
    kanitSeviyesi: r.min_proof_level,
    urunId: r.product_id,
    urunAdi: r.urun_adi,
    aktif: r.active,
    acikKupon: Number(r.acik_kupon),
    gunlukLimit: r.daily_limit,
    bugunVerilen: Number(r.bugun_verilen),
    pencereMetni: pencere.pencereYaz({
      gunler: r.usable_days,
      baslangicSaati: r.usable_from_hour,
      bitisSaati: r.usable_to_hour,
    }),
    pencere: {
      gunler: r.usable_days,
      baslangicSaati: r.usable_from_hour,
      bitisSaati: r.usable_to_hour,
    },
  }));
}

export async function ekle(opts: {
  cafeId: string;
  tip: OdulTipi;
  baslik: string;
  aciklama?: string;
  maliyetKurus: number;
  yuzde?: number;
  puanFiyati: number;
  anlik: boolean;
  urunId?: string;
  aktorId: string;
}): Promise<OdulSonucu> {
  const baslik = opts.baslik.trim();

  if (baslik.length < 2) return { ok: false, hata: "Ödül adı en az iki harf olmalı." };
  if (baslik.length > 60) return { ok: false, hata: "Ödül adı en fazla 60 karakter." };

  // Ü52: sabit basamak. Serbest tutar kabul edilmiyor.
  if (!odulDegeriGecerliMi(opts.maliyetKurus)) {
    return {
      ok: false,
      hata: `Ödül değeri ${ODUL_EN_AZ / 100} ile ${ODUL_EN_COK / 100} TL arasında ve ${
        ODUL_ADIM / 100
      }'er artışlarla olmalı.`,
    };
  }

  if (opts.tip === "percent") {
    if (!Number.isInteger(opts.yuzde) || (opts.yuzde ?? 0) < 1 || (opts.yuzde ?? 0) > 100) {
      return { ok: false, hata: "İndirim oranı 1 ile 100 arasında olmalı." };
    }
  } else if (opts.yuzde != null) {
    return {
      ok: false,
      hata:
        opts.tip === "amount"
          ? "Tutar indiriminde oran olmaz — tutarın kendisi giriliyor."
          : "Ürün ödülünde indirim oranı olmaz.",
    };
  }

  /**
   * Ü52: puanla ödül alma kalktı; her ödül **oyunlardan ve çarktan
   * düşebilen** ödül. Bu yüzden `kind` her zaman `instant` ve puan
   * fiyatı her zaman sıfır.
   *
   * `points_price` kolonu şemada duruyor ve sıfır yazılıyor: kolonu
   * düşürmek eski kuponların bağlı olduğu satırları yeniden yazmayı
   * gerektirirdi ve kazancı yok. Kimse okumuyor.
   */
  const puanFiyati = 0;

  return withCafe(opts.cafeId, async (db) => {
    if (opts.urunId) {
      const urun = await db.one(`SELECT 1 FROM products WHERE id = $1 AND active`, [opts.urunId]);
      if (!urun) return { ok: false as const, hata: "Seçilen ürün bulunamadı." };
    }

    const id = newId("rwd");
    await db.query(
      `INSERT INTO rewards
         (id, cafe_id, kind, reward_type, title, description, points_price, cost_kurus,
          percent, product_id, min_proof_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        opts.cafeId,
        "instant",
        opts.tip,
        baslik,
        opts.aciklama?.trim() || null,
        puanFiyati,
        opts.maliyetKurus,
        opts.tip === "percent" ? opts.yuzde : null,
        opts.urunId ?? null,
        kanitSeviyesi(opts.maliyetKurus),
      ],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.create",
      targetType: "reward",
      targetId: id,
      detail: {
        tip: opts.tip,
        maliyetKurus: opts.maliyetKurus,
        puanFiyati,
        anlik: opts.anlik,
        yuzde: opts.yuzde ?? null,
      },
    });

    return { ok: true as const, id };
  });
}

export type AdSonucu =
  | { ok: true; etkilenenKupon: number }
  | { ok: false; hata: string };

/**
 * Ödülün adını ve açıklamasını düzeltir (Ü94).
 *
 * ⚠️ Bugüne kadar tek çare ödülü yayından kaldırıp yenisini eklemekti ve
 * hata sahada zaten yaşandı: kafe "Ice Americano" yerine **"ize amreicano"**
 * yazdı (Ü75). Yazım hatasının bedeli, ödülün geçmişini kaybetmek olmamalı.
 *
 * ── Neden yalnızca ad ve açıklama ────────────────────────────
 *
 * Değer, tip ve oran **değişmiyor**. Bunlar değişebilseydi kafe 30 TL'lik
 * bir ödülün adını "Ücretsiz çay" yapar, dolaşımdaki kuponu elinde tutan
 * oyuncu kasada 8 TL'lik bir şey alırdı. Bütçe ekranındaki söz burada da
 * geçerli: *"verilen söz geri alınmaz."* Değerin değişmesi ayrıca E10'un
 * rezerve hesabını da bozardı — kupon 30 TL bağlamışken ödül 8 TL olamaz.
 *
 * ⚠️ **Ad değişikliği dolaşımdaki kuponlara da yansıyor.** Kupon kartı adı
 * `rewards` satırından okuyor, kopyasını tutmuyor. Yazım hatası düzeltmesi
 * için doğru davranış bu — "ize amreicano" yazan kuponlar da düzeliyor.
 * Ama kötüye kullanılabilir bir kapı, o yüzden:
 *   1. kaç açık kuponun etkileneceği geri dönülüyor ve panelde **önceden**
 *      gösteriliyor — kafe sonucu görmeden değiştirmiyor,
 *   2. eski ve yeni ad denetim izine yazılıyor.
 *
 * ⚠️ Ü75'te ad denetim ayrıntısından **çıkarılmıştı**; gerekçe "ad zaten
 * targetId'nin işaret ettiği satırda duruyor" idi. Burada o gerekçe
 * geçmiyor: değişiklikten sonra eski ad hiçbir yerde kalmıyor. Yasak
 * anahtar listesi kişi adı içindir (`ad`, `name`, `first_name`); menü
 * metnini `oncekiBaslik` diye ayrı ve açık bir anahtarla yazıyoruz.
 */
export async function adDegistir(opts: {
  cafeId: string;
  odulId: string;
  baslik: string;
  aciklama?: string | null;
  aktorId: string;
}): Promise<AdSonucu> {
  const baslik = opts.baslik.trim();
  const aciklama = opts.aciklama?.trim() || null;

  if (baslik.length < 2) return { ok: false, hata: "Ödül adı en az iki harf olmalı." };
  if (baslik.length > 60) return { ok: false, hata: "Ödül adı en fazla 60 karakter." };

  return withCafe(opts.cafeId, async (db) => {
    const onceki = await db.one<{ title: string; description: string | null }>(
      `SELECT title, description FROM rewards WHERE id = $1`,
      [opts.odulId],
    );
    if (!onceki) return { ok: false as const, hata: "Ödül bulunamadı." };

    if (onceki.title === baslik && (onceki.description ?? null) === aciklama) {
      return { ok: false as const, hata: "Ad ve açıklama zaten böyle." };
    }

    const etkilenen = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM coupons
        WHERE reward_id = $1 AND status IN ('pending','active')`,
      [opts.odulId],
    );

    await db.query(`UPDATE rewards SET title = $2, description = $3 WHERE id = $1`, [
      opts.odulId,
      baslik,
      aciklama,
    ]);

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.rename",
      targetType: "reward",
      targetId: opts.odulId,
      detail: {
        oncekiBaslik: onceki.title,
        yeniBaslik: baslik,
        aciklamaDegisti: (onceki.description ?? null) !== aciklama,
        etkilenenAcikKupon: Number(etkilenen?.n ?? 0),
      },
    });

    return { ok: true as const, etkilenenKupon: Number(etkilenen?.n ?? 0) };
  });
}

export type SinirSonucu = { ok: true } | { ok: false; hata: string };

/**
 * Günlük adet limiti ve kullanım penceresi (Ü103).
 *
 * ── Neden ad düzeltmesinden AYRI ────────────────────────────
 *
 * Ü94 ad kutusunu bilerek dar tutmuştu: değer ve tip orada değişmiyor.
 * Bu ayar da oraya sığmıyor ama sebebi farklı — burada değişen şey ödülün
 * **ne olduğu** değil, **ne kadar ve ne zaman** dağıtıldığı. İkisi ayrı
 * karar, ayrı form.
 *
 * ⚠️ **Dolaşımdaki kuponları etkilemiyor mu?** Etkiliyor: pencere kupon
 * satırından değil ödül satırından okunuyor. Kafe pencereyi daraltırsa
 * elinde kupon olan oyuncu dünkü kuralla değil bugünkü kuralla karşılaşır.
 * Bu bilerek böyle: kafenin mutfağı akşam 17'de kapanıyorsa, dün verilmiş
 * kupon o gerçeği değiştirmiyor. Panel kaç kuponun etkileneceğini
 * **önceden** söylüyor (Ü94'teki aynı kural).
 */
export async function siniriDegistir(opts: {
  cafeId: string;
  odulId: string;
  gunlukLimit: number | null;
  gunler: number[] | null;
  baslangicSaati: number | null;
  bitisSaati: number | null;
  aktorId: string;
}): Promise<SinirSonucu> {
  if (opts.gunlukLimit != null && (!Number.isInteger(opts.gunlukLimit) || opts.gunlukLimit < 1)) {
    return { ok: false, hata: "Günlük adet en az 1 olmalı. Sınırsız için boş bırak." };
  }

  const saatVar = opts.baslangicSaati != null || opts.bitisSaati != null;
  if (saatVar && (opts.baslangicSaati == null || opts.bitisSaati == null)) {
    return { ok: false, hata: "Saat aralığının iki ucu da girilmeli." };
  }
  if (saatVar && opts.bitisSaati! <= opts.baslangicSaati!) {
    // Ü90'daki aynı bilinen sınır: pencere gece yarısını aşamıyor.
    return { ok: false, hata: "Bitiş saati başlangıçtan sonra olmalı. Pencere gece yarısını aşamıyor." };
  }
  if (opts.gunler != null && (opts.gunler.length === 0 || opts.gunler.some((g) => g < 0 || g > 6))) {
    return { ok: false, hata: "En az bir gün seçilmeli. Hepsi geçerliyse gün seçme." };
  }

  return withCafe(opts.cafeId, async (db) => {
    const etkilenen = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM coupons
        WHERE reward_id = $1 AND status IN ('pending','active')`,
      [opts.odulId],
    );

    const r = await db.query(
      `UPDATE rewards
          SET daily_limit = $2, usable_days = $3,
              usable_from_hour = $4, usable_to_hour = $5
        WHERE id = $1`,
      [
        opts.odulId,
        opts.gunlukLimit,
        opts.gunler != null && opts.gunler.length === 7 ? null : opts.gunler,
        opts.baslangicSaati,
        opts.bitisSaati,
      ],
    );
    if (!r.rowCount) return { ok: false as const, hata: "Ödül bulunamadı." };

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.update",
      targetType: "reward",
      targetId: opts.odulId,
      detail: {
        gunlukLimit: opts.gunlukLimit,
        gunler: opts.gunler,
        baslangicSaati: opts.baslangicSaati,
        bitisSaati: opts.bitisSaati,
        etkilenenAcikKupon: Number(etkilenen?.n ?? 0),
      },
    });

    return { ok: true as const };
  });
}

/** Ödülü yayından kaldırır veya geri açar. Silinmiyor — geçmiş kuponlar bağlı. */
export async function durumDegistir(opts: {
  cafeId: string;
  odulId: string;
  aktif: boolean;
  aktorId: string;
}): Promise<boolean> {
  return withCafe(opts.cafeId, async (db) => {
    const r = await db.query(`UPDATE rewards SET active = $2 WHERE id = $1`, [
      opts.odulId,
      opts.aktif,
    ]);
    if (!r.rowCount) return false;

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.update",
      targetType: "reward",
      targetId: opts.odulId,
      detail: { aktif: opts.aktif },
    });
    return true;
  });
}
