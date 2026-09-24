import { withCafe, type Db } from "@/db/context";
import { audit } from "@/lib/audit";
import { demoOrtami } from "@/lib/env";
import { decryptPII } from "@/lib/crypto";
import { isGunu, pazartesi, gunEkle, gunFarki } from "@/lib/tarih";

/**
 * Kafe raporları — Faz 8.
 *
 * ── Raporun işi ─────────────────────────────────────────────
 *
 * Kafeye gösterilen rapor, **satılan şeyin kanıtıdır**. Ü29 ile satılan birim
 * belli: **nitelikli oyuncu**. Bu yüzden raporun baş sayısı o; diğer sayılar
 * onu açıklamak için var.
 *
 * ── G1 · Kafe kişisel veri görmez ───────────────────────────
 *
 * Hiçbir sorgu `player_id` döndürmüyor. Kafenin gördüğü tek kimlik, o kafeye
 * özel anonim kod (`P-4F2A`). Kod kafe başına farklı olduğu için iki kafe
 * verisini birleştirip aynı kişiyi izleyemiyor.
 *
 * ── Ü30 · Mahremiyet eşiği ──────────────────────────────────
 *
 * Saat ve masa kırılımında **5 kişiden az** içeren gruplar sayı yerine `null`
 * dönüyor; ekran bunu `<5` olarak gösteriyor. Toplamlar yine doğru.
 *
 * Gerekçe: küçük bir kafede *"14:00–15:00 arası 2 oyuncu"* satırı, işletmecinin
 * o saatte kimin oturduğuna dair hafızasıyla birleşince kişiyi işaret eder.
 * Toplamı bozmadan tek satırı gizlemek, raporun işini görmesini engellemiyor.
 *
 * **Doğrulama defteri (S4) eşiğin dışında:** orada amaç kafenin sayımızı
 * denetleyebilmesi ve satırlar kafenin zaten fiziksel olarak gördüğü şeyi
 * tekrarlıyor. Eşik, dışarı çıkabilen **toplu** görünümleri koruyor.
 */

/** Ü30: bu sayıdan az kişi içeren grup gizlenir. */
export const GIZLEME_ESIGI = 5;

/**
 * Aralık **yarı açık**: `baslangic` dahil, `bitis` hariç. Her sorgu
 * `>= $1 AND < $2` yazıyor; "son gün dahil mi" tartışması tek yerde,
 * burada bitiyor.
 */
export type Aralik = { baslangic: string; bitis: string };

/** Bu haftanın aralığı — pazartesiden pazartesiye (Ü25 ile aynı takvim). */
export function buHafta(gun = isGunu()): Aralik {
  const bas = pazartesi(gun);
  return { baslangic: bas, bitis: gunEkle(bas, 7) };
}

export function gecenHafta(gun = isGunu()): Aralik {
  const bas = gunEkle(pazartesi(gun), -7);
  return { baslangic: bas, bitis: gunEkle(bas, 7) };
}

/* ── Tarih aralığı seçimi ──────────────────────────────────────
 *
 * Rapor önce "bu hafta / geçen hafta" iki sekmesiydi. Kafe sahibinin
 * sorduğu şeyler oraya sığmıyordu: *"geçen ay ne oldu"*, *"maç günü ne
 * oldu"*, *"kampanyayı açtığım haftadan beri"*. Şimdi hazır aralıklar
 * hızlı yol, serbest tarih ise asıl cevap.
 */

/** Hazır aralıklar — ekrandaki düğme sırası da bu. */
export const HAZIR_ARALIKLAR = [
  { ad: "bugun", etiket: "Bugün", gun: 1 },
  { ad: "7", etiket: "Son 7 gün", gun: 7 },
  { ad: "30", etiket: "Son 30 gün", gun: 30 },
] as const;

export type HazirAralik = (typeof HAZIR_ARALIKLAR)[number]["ad"];

/** Tek sorguda taranabilecek en uzun dönem. */
export const EN_UZUN_GUN = 366;

export type AralikSecimi = {
  aralik: Aralik;
  /** Hangi hazır düğme yanacak — serbest tarihte `null`. */
  hazir: HazirAralik | null;
  gunSayisi: number;
  /** Ekranda ve CSV adında görünen düz metin. */
  etiket: string;
};

/**
 * Adres çubuğundaki tarihi aralığa çevirir.
 *
 * Girdi **kullanıcıdan** geliyor (URL) ve doğrudan SQL parametresi olacak.
 * Tip zorlaması burada bitiyor: biçime uymayan, ters sıralı ya da çok uzun
 * her istek sessizce varsayılana düşüyor. Sayfanın hata göstermesi gereken
 * bir durum değil — bozuk bağlantıya tıklayan kafe sahibi raporu görsün.
 */
export function araligiCoz(
  sp: { on?: string; bas?: string; bit?: string },
  bugun = isGunu(),
): AralikSecimi {
  if (gunMu(sp.bas) && gunMu(sp.bit)) {
    const gunSayisi = gunFarki(sp.bas, sp.bit) + 1; // bitiş günü dahil
    if (gunSayisi >= 1 && gunSayisi <= EN_UZUN_GUN) {
      return {
        aralik: { baslangic: sp.bas, bitis: gunEkle(sp.bit, 1) },
        hazir: null,
        gunSayisi,
        etiket:
          sp.bas === sp.bit ? gunYaz(sp.bas) : `${gunYaz(sp.bas)} – ${gunYaz(sp.bit)}`,
      };
    }
  }

  const secilen =
    HAZIR_ARALIKLAR.find((h) => h.ad === sp.on) ?? HAZIR_ARALIKLAR[1]; // varsayılan: son 7 gün

  return {
    aralik: { baslangic: gunEkle(bugun, -(secilen.gun - 1)), bitis: gunEkle(bugun, 1) },
    hazir: secilen.ad,
    gunSayisi: secilen.gun,
    etiket: secilen.etiket,
  };
}

/** `YYYY-MM-DD` mi — hem biçim hem takvim olarak geçerli mi? */
function gunMu(s: string | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function gunYaz(gun: string): string {
  const [y, a, g] = gun.split("-");
  return `${g}.${a}.${y}`;
}

/**
 * Eşik bu çağrıda uygulanacak mı?
 *
 * Demo ortamında kapalı. Sebebi mahremiyet kuralının gevşemesi değil, demo
 * verisinin küçük olması: on kişilik bir demo kafede her satır `<5` çıkıyor
 * ve rapor ekranı boş görünüyordu — düzeltilecek şeyin ne olduğu
 * anlaşılamıyordu. Canlıda `demoOrtami()` hiçbir koşulda true dönmez; eşik
 * orada aynen duruyor.
 *
 * ── Neden parametre, neden doğrudan env okumuyoruz ──────────
 *
 * Testler de demo ortamında koşuyor. Karar fonksiyonun içinde okunsaydı Ü30
 * sınamalarının hepsi eşik kapalıyken çalışır, yani **kuralı hiç sınamamış
 * olurduk** — mahremiyet güvencesinin sessizce çürüdüğü tam olarak böyle bir
 * yerdir. Karar dışarıdan verilebilir olunca testler üretim davranışını
 * zorlayabiliyor; ekran hiçbir şey geçmiyor ve varsayılanı alıyor.
 */
export const esikVarsayilan = () => !demoOrtami();

/** Eşiğin altındaki sayıyı gizler (Ü30). */
function gizle(sayi: number, esikAcik: boolean): number | null {
  if (!esikAcik) return sayi;
  return sayi > 0 && sayi < GIZLEME_ESIGI ? null : sayi;
}

/* ── Özet ──────────────────────────────────────────────────── */

export type RaporOzeti = {
  /**
   * Ü29: satılan birim. Raporun baş sayısı.
   *
   * ⚠️ Adı "oyuncu" ama **saydığı şey ziyaret**: benzersizlik indeksi
   * `(cafe_id, device_id_hash, business_date) WHERE is_qualified`, yani
   * kural "1 nitelikli oturum / cihaz / kafe / **gün**" (S3). Aynı kişi
   * ertesi gün geldiğinde yeniden sayılıyor — bu yüzden `tekilOyuncu`'dan
   * büyük olabilir ve ekranda "kişi" diye yazılamaz. Rapor bir dönem
   * boyunca tam tersini yazdı; fatura bu sayıdan kesildiği için yanlış
   * tanım doğrudan yanlış faturaya dönüşüyordu.
   */
  nitelikliOyuncu: number;
  /** Kaç farklı oyuncu geldi — nitelikli olmayanlar dahil. */
  tekilOyuncu: number;
  toplamOyun: number;
  /** Dağıtılan kuponların bütçeye bağladığı tutar. */
  kazanilanIndirimKurus: number;
  /** Kasada onaylanan tutar — **asıl sayı bu**. */
  kullanilanIndirimKurus: number;
  kuponVerilen: number;
  kuponKullanilan: number;
  /**
   * Bu dönemde **ilk kez** gelen oyuncu — daha önce bu kafede hiç oynamamış.
   *
   * Ü30 eşiği burada da geçerli: küçük bir kafede "bu hafta 2 yeni müşteri"
   * satırı, işletmecinin hafızasıyla birleşince kişiyi işaret eder.
   */
  yeniOyuncu: number | null;
  /** Bu dönemde gelen ve **daha önce de** gelmiş oyuncu. */
  tekrarGelenOyuncu: number | null;
};

export async function ozet(
  cafeId: string,
  aralik: Aralik,
  esikAcik = esikVarsayilan(),
): Promise<RaporOzeti> {
  return withCafe(cafeId, (db) => ozetIle(db, aralik, esikAcik));
}

/*
  🔴 Ü286: kupon zamanları (`issued_at`, `redeemed_at`) İSTANBUL gece
  yarısıyla gün gün ayrılıyor. Veritabanı oturumu UTC: yalnız `$1::date`
  günü 03:00'te başlatıyordu ve gece 00:00–03:00 arasında kasada onaylanan
  kupon bir önceki günün raporuna yazılıyordu. Oyunlar zaten İstanbul
  günüyle (`business_date`) sayılıyor; iki sayı artık aynı günü anlatıyor.
  Kasanın günlük özeti (`kupon.bugunkuOzet`) aynı ifadeyi kullanıyor.
*/
async function ozetIle(db: Db, aralik: Aralik, esikAcik: boolean): Promise<RaporOzeti> {
  const r = await db.one<{
    nitelikli: string;
    tekil: string;
    oyun: string;
    kupon_verilen: string;
    kupon_kullanilan: string;
    kazanilan: string;
    kullanilan: string;
    yeni: string;
    tekrar: string;
  }>(
    `SELECT
       (SELECT count(*) FROM play_sessions
         WHERE is_qualified AND business_date >= $1 AND business_date < $2)   AS nitelikli,
       (SELECT count(DISTINCT player_id) FROM play_sessions
         WHERE status = 'completed' AND business_date >= $1
           AND business_date < $2)                                            AS tekil,
       (SELECT count(*) FROM play_sessions
         WHERE status = 'completed' AND business_date >= $1
           AND business_date < $2)                                            AS oyun,
       -- ── Yeni ve tekrar gelen (Ü44)
       --
       -- Ayrım tek soruya iniyor: bu oyuncunun bu kafedeki İLK tamamlanmış
       -- oyunu bu dönemin içinde mi, öncesinde mi. min(business_date)
       -- oyuncu başına bir kez hesaplanıyor; dönem içinde iki kez gelen
       -- kişi iki kez sayılmıyor.
       --
       -- Kafe süzgeci sorguda yok çünkü withCafe RLS'i açık: bu sorgu
       -- yalnızca çağıran kafenin satırlarını görüyor. Yani "bu kafedeki
       -- ilk oyun" doğal olarak kafe bazında hesaplanıyor — oyuncunun
       -- başka kafedeki geçmişi buraya sızmıyor (G1).
       (SELECT count(*) FILTER (WHERE ilk >= $1::date)
          FROM (SELECT player_id, min(business_date) AS ilk
                  FROM play_sessions WHERE status = 'completed'
                 GROUP BY player_id) g
         WHERE g.ilk < $2::date)                                              AS yeni,
       (SELECT count(DISTINCT ps.player_id) FROM play_sessions ps
         WHERE ps.status = 'completed'
           AND ps.business_date >= $1 AND ps.business_date < $2
           AND EXISTS (SELECT 1 FROM play_sessions o
                        WHERE o.player_id = ps.player_id
                          AND o.status = 'completed'
                          AND o.business_date < $1))                          AS tekrar,
       (SELECT count(*) FROM coupons
         WHERE issued_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul') AND issued_at < ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul'))                AS kupon_verilen,
       (SELECT count(*) FROM coupons
         WHERE status = 'redeemed' AND redeemed_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul')
           AND redeemed_at < ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul'))                                        AS kupon_kullanilan,
       (SELECT COALESCE(sum(reserved_kurus), 0) FROM coupons
         WHERE issued_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul') AND issued_at < ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul'))                AS kazanilan,
       (SELECT COALESCE(sum(committed_kurus), 0) FROM coupons
         WHERE status = 'redeemed' AND redeemed_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul')
           AND redeemed_at < ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul'))                                        AS kullanilan`,
    [aralik.baslangic, aralik.bitis],
  );

  return {
    nitelikliOyuncu: Number(r?.nitelikli ?? 0),
    tekilOyuncu: Number(r?.tekil ?? 0),
    toplamOyun: Number(r?.oyun ?? 0),
    kuponVerilen: Number(r?.kupon_verilen ?? 0),
    kuponKullanilan: Number(r?.kupon_kullanilan ?? 0),
    kazanilanIndirimKurus: Number(r?.kazanilan ?? 0),
    kullanilanIndirimKurus: Number(r?.kullanilan ?? 0),
    yeniOyuncu: gizle(Number(r?.yeni ?? 0), esikAcik),
    tekrarGelenOyuncu: gizle(Number(r?.tekrar ?? 0), esikAcik),
  };
}

/* ── Doğrulama defteri (S4) ────────────────────────────────── */

export type ZiyaretSatiri = {
  /** G1: kafeye özel anonim kod. Ad, soyad, telefon hiçbir zaman yok. */
  kod: string;
  zaman: Date;
  masa: string | null;
  kanitSeviyesi: number;
  nitelikli: boolean;
  oyunSayisi: number;
};

/**
 * Gelen oyuncular defteri — S4.
 *
 * *"Sayacı kim denetliyor"* sorusunun cevabı: kafe kendi sayımızı satır satır
 * görebiliyor. Denetlenemeyen bir sayı, satış konuşmasında bir iddiadan
 * ibarettir.
 */
export async function ziyaretler(
  cafeId: string,
  aralik: Aralik,
  limit = 200,
): Promise<ZiyaretSatiri[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{
      kod: string | null;
      zaman: Date;
      masa: string | null;
      proof_level: number;
      is_qualified: boolean;
      oyun: string;
    }>(
      `SELECT a.code AS kod,
              min(ps.started_at) AS zaman,
              max(t.label) AS masa,
              max(ps.proof_level) AS proof_level,
              bool_or(ps.is_qualified) AS is_qualified,
              count(*) AS oyun
         FROM play_sessions ps
         LEFT JOIN player_aliases a
                ON a.cafe_id = ps.cafe_id AND a.player_id = ps.player_id
         LEFT JOIN cafe_tables t ON t.id = ps.table_id
        WHERE ps.status = 'completed'
          AND ps.business_date >= $1 AND ps.business_date < $2
        GROUP BY a.code, ps.player_id, ps.business_date
        ORDER BY min(ps.started_at) DESC
        LIMIT $3`,
      [aralik.baslangic, aralik.bitis, limit],
    ),
  );

  return satirlar.map((r) => ({
    // Takma adı olmayan satır olmamalı ama olursa kimlik sızdırmasın.
    kod: r.kod ?? "P-????",
    zaman: r.zaman,
    masa: r.masa,
    kanitSeviyesi: r.proof_level,
    nitelikli: r.is_qualified,
    oyunSayisi: Number(r.oyun),
  }));
}

/* ── Masa hareketi ─────────────────────────────────────────── */

export type MasaSatiri = {
  masa: string;
  /** Ü30: eşiğin altındaysa null — ekran `<5` gösterir. */
  oyuncu: number | null;
  oyun: number;
};

export async function masaHareketi(
  cafeId: string,
  aralik: Aralik,
  esikAcik = esikVarsayilan(),
): Promise<MasaSatiri[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{ masa: string; oyuncu: string; oyun: string }>(
      `SELECT t.label AS masa,
              count(DISTINCT ps.player_id) AS oyuncu,
              count(*) AS oyun
         FROM play_sessions ps
         JOIN cafe_tables t ON t.id = ps.table_id
        WHERE ps.status = 'completed'
          AND ps.business_date >= $1 AND ps.business_date < $2
        GROUP BY t.label
        ORDER BY count(*) DESC`,
      [aralik.baslangic, aralik.bitis],
    ),
  );

  return satirlar.map((r) => ({
    masa: r.masa,
    oyuncu: gizle(Number(r.oyuncu), esikAcik),
    oyun: Number(r.oyun),
  }));
}

/* ── Saatlik dağılım ───────────────────────────────────────── */

export type SaatSatiri = {
  saat: number;
  oyuncu: number | null;
  /**
   * O saatte dolan masa oranı — 0 ile 1 arası.
   *
   * Payda, dönemdeki **gün sayısı × açık masa sayısı**: "saat 14'te üç
   * masam doluydu" ile "on dört gün boyunca her gün saat 14'te üç masam
   * doluydu" aynı şey değil. Gün sayısına bölünmezse iki haftalık rapor,
   * bir günlük rapordan on dört kat "dolu" görünürdü.
   */
  oran: number;
};

export type SaatlikDagilim = {
  saatler: SaatSatiri[];
  /** Oranın paydası — ekran "3/9 masa" diye yazabilsin diye ayrıca duruyor. */
  masaSayisi: number;
  gunSayisi: number;
};

/**
 * Hangi saat doluyor.
 *
 * Satış konuşmasının en güçlü cümlesi buna dayanıyor: *"boş saatini
 * dolduruyorum."* İddiayı kanıtlayan tek şey bu dağılım.
 *
 * ── Neden sayı değil de oran ────────────────────────────────
 *
 * "Saat 15'te 4 oyuncu" cümlesi kafe sahibine bir şey söylemiyordu: dört
 * çok mu az mı, kafenin kaç masası olduğuna bağlı. Oran ikisini birden
 * cevaplıyor ve iki farklı büyüklükteki kafe aynı ölçekte konuşuyor.
 *
 * ── Neyin oranı olduğu ──────────────────────────────────────
 *
 * **Kafenin doluluğu değil**, Looply üzerinden dolan masa oranı. Oyun
 * oynamadan oturan müşteriyi biz görmüyoruz; ekranın da öyle yazması
 * gerekiyor, yoksa rapor kafenin kendi kasa verisiyle çelişir ve güveni
 * ilk çelişkide kaybederiz.
 */
export async function saatlikDagilim(
  cafeId: string,
  aralik: Aralik,
  esikAcik = esikVarsayilan(),
): Promise<SaatlikDagilim> {
  const [satirlar, masa] = await withCafe(cafeId, async (db) => {
    const s = await db.all<{ saat: string; oyuncu: string; masa: string }>(
      `SELECT extract(hour FROM ps.started_at AT TIME ZONE 'Europe/Istanbul')::int AS saat,
              count(DISTINCT ps.player_id) AS oyuncu,
              count(DISTINCT (ps.table_id, ps.business_date)) AS masa
         FROM play_sessions ps
        WHERE ps.status = 'completed'
          AND ps.business_date >= $1 AND ps.business_date < $2
        GROUP BY 1 ORDER BY 1`,
      [aralik.baslangic, aralik.bitis],
    );
    const m = await db.one<{ n: string }>(`SELECT count(*) AS n FROM cafe_tables WHERE active`);
    return [s, m] as const;
  });

  const masaSayisi = Number(masa?.n ?? 0);
  const gunSayisi = Math.max(1, gunFarki(aralik.baslangic, aralik.bitis));
  const payda = masaSayisi * gunSayisi;

  const harita = new Map(
    satirlar.map((r) => [Number(r.saat), { oyuncu: Number(r.oyuncu), masa: Number(r.masa) }]),
  );

  // Boş saatler de görünmeli — "burası hiç dolmuyor" da bir bilgi.
  return {
    saatler: Array.from({ length: 24 }, (_, saat) => {
      const v = harita.get(saat);
      return {
        saat,
        oyuncu: gizle(v?.oyuncu ?? 0, esikAcik),
        // Masası olmayan kafede oran hesaplanamaz; sıfır göstermek
        // "hiç dolmadı" demek olurdu, oysa ölçü yok.
        oran: payda === 0 ? 0 : Math.min(1, (v?.masa ?? 0) / payda),
      };
    }),
    masaSayisi,
    gunSayisi,
  };
}

/**
 * Dönem gerçekten boş mu?
 *
 * `null` **"veri yok" değil, "var ama gizlendi"** demek. İkisi karıştırılırsa
 * rapor, üç oyunun oynandığı bir haftada *"bu dönemde henüz oyun oynanmadı"*
 * der; satılan şeyin kanıtı olmaktan çıkıp yanlış beyan hâline gelir.
 *
 * Bu ayrımı ekranın koşuluna gömmek yerine buraya koyduk: aynı hatayı
 * yapabilecek her yüzey (ekran, CSV, ileride e-posta özeti) aynı cevabı
 * okusun.
 */
export function donemBos(saatler: SaatSatiri[]): boolean {
  return saatler.every((s) => s.oyuncu === 0);
}

/* ── Kampanya sonuçları ────────────────────────────────────── */

export type KampanyaSonucu = {
  urunAdi: string;
  yuzde: number;
  durum: string;
  verilen: number;
  kullanilan: number;
  kullanilanKurus: number;
};

export async function kampanyaSonuclari(
  cafeId: string,
  aralik: Aralik,
): Promise<KampanyaSonucu[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{
      urun_adi: string;
      percent: number;
      status: string;
      verilen: string;
      kullanilan: string;
      tutar: string;
    }>(
      `SELECT p.name AS urun_adi, pc.percent, pc.status,
              count(k.id) FILTER (WHERE k.issued_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul')
                                    AND k.issued_at < ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul')) AS verilen,
              count(k.id) FILTER (WHERE k.status = 'redeemed'
                                    AND k.redeemed_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul')
                                    AND k.redeemed_at < ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul')) AS kullanilan,
              COALESCE(sum(k.committed_kurus) FILTER (WHERE k.status = 'redeemed'
                                    AND k.redeemed_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul')
                                    AND k.redeemed_at < ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul')), 0) AS tutar
         FROM percentage_campaigns pc
         JOIN products p ON p.id = pc.product_id
         LEFT JOIN coupons k ON k.campaign_id = pc.id
        GROUP BY pc.id, p.name, pc.percent, pc.status
        ORDER BY count(k.id) DESC`,
      [aralik.baslangic, aralik.bitis],
    ),
  );

  return satirlar.map((r) => ({
    urunAdi: r.urun_adi,
    yuzde: r.percent,
    durum: r.status,
    verilen: Number(r.verilen),
    kullanilan: Number(r.kullanilan),
    kullanilanKurus: Number(r.tutar),
  }));
}

/* ── Ödül dağılımı ─────────────────────────────────────────── */

export type DagilimDilimi = { etiket: string; adet: number; kurus: number };

/**
 * Kullanılan kuponların ne olduğu — daire grafiğin verisi.
 *
 * Kafe sahibinin sorduğu şey: *"param nereye gidiyor?"* Toplam indirim
 * tutarı bunu söylemiyor; ürün mü verildi, yüzde indirimi mi yapıldı,
 * TL indirimi mi — üçünün maliyeti de aynı defterden çıkıyor ama üçü
 * farklı karar.
 */
export async function odulDagilimi(cafeId: string, aralik: Aralik): Promise<DagilimDilimi[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{ tip: string; adet: string; kurus: string }>(
      `SELECT COALESCE(r.reward_type, 'campaign') AS tip,
              count(*) AS adet,
              COALESCE(sum(k.committed_kurus), 0) AS kurus
         FROM coupons k
         LEFT JOIN rewards r ON r.id = k.reward_id
        WHERE k.status = 'redeemed'
          AND k.redeemed_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul') AND k.redeemed_at < ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul')
        GROUP BY 1
        ORDER BY sum(k.committed_kurus) DESC`,
      [aralik.baslangic, aralik.bitis],
    ),
  );

  const ETIKET: Record<string, string> = {
    product: "Ürün ödülü",
    percent: "Yüzde indirimi",
    amount: "TL indirimi",
    campaign: "Ürün kampanyası",
  };

  return satirlar.map((r) => ({
    etiket: ETIKET[r.tip] ?? r.tip,
    adet: Number(r.adet),
    kurus: Number(r.kurus),
  }));
}

/* ── Kim ne kullandı ───────────────────────────────────────── */

export type KullanimSatiri = {
  /** G1: kafeye özel anonim kod — ad, soyad, telefon yok. */
  kod: string;
  adet: number;
  kurus: number;
  sonKullanim: Date;
};

/**
 * Kupon kullanımının kişi kırılımı.
 *
 * Kafe sahibi *"kim kaç kere kullanmış"* diye soruyor ve sorusu meşru: aynı
 * kişinin on kuponu, on kişinin birer kuponundan çok farklı bir tablo. Ama
 * cevabın adla verilmesi G1'i deler — kafe, kendi anonim koduyla görüyor.
 *
 * Eşik burada **uygulanmıyor**: satır zaten tek kişiyi gösteriyor, gizlenecek
 * bir grup yok. Ü30 toplu görünümleri koruyor; bu defter kafenin kendi
 * kasasında olan biteni denetlemesi için (S4 ile aynı gerekçe).
 */
export async function kuponKullanimi(
  cafeId: string,
  aralik: Aralik,
  limit = 50,
): Promise<KullanimSatiri[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{ kod: string | null; adet: string; kurus: string; son: Date }>(
      `SELECT a.code AS kod,
              count(*) AS adet,
              COALESCE(sum(k.committed_kurus), 0) AS kurus,
              max(k.redeemed_at) AS son
         FROM coupons k
         LEFT JOIN player_aliases a
                ON a.cafe_id = k.cafe_id AND a.player_id = k.player_id
        WHERE k.status = 'redeemed'
          AND k.redeemed_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul') AND k.redeemed_at < ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul')
        GROUP BY a.code
        ORDER BY count(*) DESC, sum(k.committed_kurus) DESC
        LIMIT $3`,
      [aralik.baslangic, aralik.bitis, limit],
    ),
  );

  return satirlar.map((r) => ({
    kod: r.kod ?? "P-????",
    adet: Number(r.adet),
    kurus: Number(r.kurus),
    sonKullanim: r.son,
  }));
}

/* ── Kasa onayları (Ü289) ─────────────────────────────────── */

export type KasaOnayi = {
  kuponId: string;
  zaman: Date;
  odul: string;
  /** Ödül bir ürüne bağlıysa ürünün adı. */
  urun: string | null;
  kasiyer: string;
  tutarKurus: number;
  /** Müşterinin bu kafeye özel anonim kodu. */
  musteri: string;
};

/**
 * Kasada onaylanan her kupon — ürün, saat-dakika, kasiyer.
 *
 * Ürün sahibi: *"tüm onaylarda ürün, saat, dakika ve hangi kasiyer olduğu
 * yazmalı."* Bilgi zaten kuponun kendi satırında (`redeemed_at`,
 * `redeemed_by_staff_id` — A4: onaylayan NULL olamaz); eksik olan ekrandı.
 * Kasiyerin adı şifreli (Ü115) ve yalnızca bu listede çözülüyor.
 */
export async function kasaOnaylari(cafeId: string, aralik: Aralik, limit = 200): Promise<KasaOnayi[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{
      kupon_id: string;
      zaman: Date;
      odul: string;
      urun: string | null;
      kasiyer_enc: Buffer | null;
      kurus: string;
      kod: string | null;
    }>(
      `SELECT k.id AS kupon_id,
              k.redeemed_at AS zaman,
              COALESCE(r.title, '%' || kmp.percent || ' indirim', 'Diğer') AS odul,
              COALESCE(ru.name, ku.name) AS urun,
              s.name_enc AS kasiyer_enc,
              k.committed_kurus AS kurus,
              a.code AS kod
         FROM coupons k
         LEFT JOIN rewards r ON r.id = k.reward_id
         LEFT JOIN products ru ON ru.id = r.product_id
         LEFT JOIN percentage_campaigns kmp ON kmp.id = k.campaign_id
         LEFT JOIN products ku ON ku.id = kmp.product_id
         LEFT JOIN staff s ON s.id = k.redeemed_by_staff_id
         LEFT JOIN player_aliases a ON a.cafe_id = k.cafe_id AND a.player_id = k.player_id
        WHERE k.status = 'redeemed'
          AND k.redeemed_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul')
          AND k.redeemed_at < ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul')
        ORDER BY k.redeemed_at DESC
        LIMIT $3`,
      [aralik.baslangic, aralik.bitis, limit],
    ),
  );

  return satirlar.map((r) => ({
    kuponId: r.kupon_id,
    zaman: r.zaman,
    odul: r.odul,
    urun: r.urun,
    kasiyer: r.kasiyer_enc ? decryptPII(r.kasiyer_enc) : "—",
    tutarKurus: Number(r.kurus),
    musteri: r.kod ?? "P-????",
  }));
}

/* ── Getiri ────────────────────────────────────────────────── */

export type Getiri = {
  /** Kaç kere masaya oturuldu — aynı kişinin iki günü iki ziyaret. */
  ziyaret: number;
  /** Kupon karşılığı kasadan çıkan ürün adedi. */
  urun: number;
  /** Ziyaret × ortalama adisyon. **Tahmin.** */
  tahminiCiroKurus: number;
  /** Kasada onaylanan indirim. **Kesin.** */
  indirimKurus: number;
  /** Tahmini ciro − indirim. */
  netKurus: number;
  /** Tahminin dayandığı tek varsayım — ekranda yazılı duruyor. */
  ortalamaAdisyonKurus: number;
};

/**
 * Sistemin kafeye kazandırdığı — tahmini.
 *
 * ── Neden gerekiyor ─────────────────────────────────────────
 *
 * Kafe sahibi aboneliği yenilerken tek soru soruyor: *"bu bana ne
 * kazandırdı?"* Rapor bugüne kadar bunu ziyaret ve kupon sayısıyla
 * cevaplıyordu; ikisi de onun konuştuğu birim değil. Konuştuğu birim para.
 *
 * ── Neyin tahmin olduğu ─────────────────────────────────────
 *
 * Üç sayının ikisi sayılıyor, biri varsayılıyor:
 *
 *   · **ziyaret** ve **ürün** — defterden geliyor, kesin.
 *   · **tahmini ciro** — ziyaret × kafenin girdiği ortalama adisyon.
 *
 * İkisi karıştırılmamalı. Ekranda "tahmin" etiketi kozmetik değil: kafe bu
 * sayıyı kendi kasa raporuyla karşılaştıracak ve tutmadığında hangi sayıya
 * güveneceğini bilmesi gerekiyor.
 *
 * ── Ne İDDİA ETMİYORUZ ──────────────────────────────────────
 *
 * "Bu ziyaretlerin hepsini biz getirdik" demiyoruz — o müşterilerin bir
 * kısmı zaten gelecekti ve bunu ölçmenin yolu yok. Ekran da bu cümleyi
 * kuruyor. Ölçemediğimiz şeyi ölçmüş gibi göstermek, ilk kasa
 * karşılaştırmasında raporun tamamının güvenilirliğini götürür.
 */
export async function getiri(
  cafeId: string,
  aralik: Aralik,
  ortalamaAdisyonKurus: number,
): Promise<Getiri> {
  const r = await withCafe(cafeId, (db) =>
    db.one<{ ziyaret: string; urun: string; indirim: string }>(
      `SELECT
         (SELECT count(DISTINCT (player_id, business_date)) FROM play_sessions
           WHERE is_qualified
             AND business_date >= $1 AND business_date < $2)          AS ziyaret,
         (SELECT count(*) FROM coupons k
            JOIN rewards r ON r.id = k.reward_id
           WHERE k.status = 'redeemed' AND r.product_id IS NOT NULL
             AND k.redeemed_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul') AND k.redeemed_at < ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul')) AS urun,
         (SELECT COALESCE(sum(committed_kurus), 0) FROM coupons
           WHERE status = 'redeemed'
             AND redeemed_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul') AND redeemed_at < ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul'))  AS indirim`,
      [aralik.baslangic, aralik.bitis],
    ),
  );

  const ziyaret = Number(r?.ziyaret ?? 0);
  const indirimKurus = Number(r?.indirim ?? 0);
  const tahminiCiroKurus = ziyaret * ortalamaAdisyonKurus;

  return {
    ziyaret,
    urun: Number(r?.urun ?? 0),
    tahminiCiroKurus,
    indirimKurus,
    netKurus: tahminiCiroKurus - indirimKurus,
    ortalamaAdisyonKurus,
  };
}

/* ── Denetim izi ───────────────────────────────────────────── */

/**
 * Rapor görüntülemesini kayda geçirir.
 *
 * Faz 8 güvenlik kapısı: *"rapor görüntüleme denetim izine düşmeli."* Rapor
 * kişisel veri içermiyor ama davranış verisi içeriyor; kimin ne zaman baktığı
 * bilinmeden "bu veriyi kim gördü" sorusu cevaplanamaz.
 */
export async function goruntulemeyiKaydet(opts: {
  cafeId: string;
  aktorId: string;
  aralik: Aralik;
  disaAktarma?: boolean;
}): Promise<void> {
  await withCafe(opts.cafeId, (db) =>
    audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: opts.disaAktarma ? "report.export" : "report.view",
      targetType: "report",
      detail: { baslangic: opts.aralik.baslangic, bitis: opts.aralik.bitis },
    }),
  );
}

/* ── Dışa aktarma ──────────────────────────────────────────── */

/**
 * CSV çıktısı.
 *
 * **Eşik burada da geçerli** (Ü30) ve burada daha da önemli: dışa aktarılan
 * dosya binadan çıkıyor, e-postayla dolaşıyor, muhasebeciye gidiyor. Ekranda
 * gizlenip dosyada açılan bir sayı, eşiği anlamsız kılardı.
 *
 * Satır sonu `\r\n`: Excel Türkçe yerelde CSV'yi böyle bekliyor. Ayraç da
 * noktalı virgül — virgül ondalık ayracı olduğu için sütunlar kayardı.
 *
 * **Ekranda ne varsa dosyada da var** (docs/17 · D10 §8): özet, saatlik
 * dağılım, masa hareketi, kampanya sonuçları ve doğrulama defteri. Defteri
 * dışarıda bırakmak "sayımızı satır satır denetleyebilirsin" cümlesini yarım
 * bırakırdı — denetim, ancak dosyayı muhasebeciye götürebildiğinde denetimdir.
 * Defterde kimlik yok: kafeye özel anonim kod, saat ve masa (G1).
 *
 * Alan içindeki `;` ve satır sonu kaçırılıyor — kafenin yazdığı masa veya
 * ürün adı noktalı virgül içerirse sütunlar kayar.
 */
export async function disaAktar(
  cafeId: string,
  aralik: Aralik,
  esikAcik = esikVarsayilan(),
): Promise<string> {
  const [o, masalar, saatler, kampanyalar, defter] = await Promise.all([
    ozet(cafeId, aralik, esikAcik),
    masaHareketi(cafeId, aralik, esikAcik),
    saatlikDagilim(cafeId, aralik, esikAcik),
    kampanyaSonuclari(cafeId, aralik),
    ziyaretler(cafeId, aralik),
  ]);

  const tl = (kurus: number) => (kurus / 100).toFixed(2).replace(".", ",");
  const say = (n: number | null) => (n === null ? `<${GIZLEME_ESIGI}` : String(n));
  const zaman = (d: Date) =>
    d.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Istanbul",
    });

  const satirlar: (string[] | never[])[] = [
    ["Looply raporu", `${aralik.baslangic} — ${aralik.bitis}`],
    [],
    ["ÖZET"],
    ["Nitelikli oyuncu", String(o.nitelikliOyuncu)],
    ["Tekil oyuncu", String(o.tekilOyuncu)],
    ["Tamamlanan oyun", String(o.toplamOyun)],
    ["Verilen kupon", String(o.kuponVerilen)],
    ["Kasada kullanılan kupon", String(o.kuponKullanilan)],
    ["Kazanılan indirim (TL)", tl(o.kazanilanIndirimKurus)],
    ["Fiilen kullanılan indirim (TL)", tl(o.kullanilanIndirimKurus)],
    [],
    ["MASA HAREKETİ"],
    ["Masa", "Oyuncu", "Oyun"],
    ...masalar.map((m) => [m.masa, say(m.oyuncu), String(m.oyun)]),
    [],
    ["SAATLİK DAĞILIM"],
    // Oran ekranla aynı paydadan çıkıyor (masa × gün); CSV'yi açan kişi
    // yüzdeyi ekranda gördüğüyle karşılaştıracak.
    ["Saat", "Oyuncu", "Doluluk %"],
    ...saatler.saatler
      .filter((s) => s.oyuncu !== 0)
      .map((s) => [`${s.saat}:00`, say(s.oyuncu), String(Math.round(s.oran * 100))]),
    [],
    ["KAMPANYA SONUÇLARI"],
    ["Ürün", "Yüzde", "Durum", "Verilen", "Kullanılan", "Kasada (TL)"],
    ...kampanyalar.map((k) => [
      k.urunAdi,
      `%${k.yuzde}`,
      k.durum,
      String(k.verilen),
      String(k.kullanilan),
      tl(k.kullanilanKurus),
    ]),
    [],
    ["DOĞRULAMA DEFTERİ"],
    ["Müşteri", "Zaman", "Masa", "Kanıt", "Oyun"],
    ...defter.map((z) => [
      z.kod,
      zaman(z.zaman),
      z.masa ?? "—",
      z.nitelikli ? "nitelikli" : `K${z.kanitSeviyesi}`,
      String(z.oyunSayisi),
    ]),
    [],
    [`${GIZLEME_ESIGI} kişiden az içeren gruplar mahremiyet için gizlenmiştir.`],
    ["Müşteriler işletmeye özel anonim kodla görünür; ad, soyad ve telefon yer almaz."],
  ];

  return satirlar.map((s) => s.map(hucre).join(";")).join("\r\n");
}

/** CSV hücresi — ayraç, tırnak veya satır sonu içeriyorsa tırnaklanır. */
function hucre(deger: string): string {
  return /[";\r\n]/.test(deger) ? `"${deger.replaceAll('"', '""')}"` : deger;
}
