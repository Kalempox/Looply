import { withCafe, type Db } from "@/db/context";
import { audit } from "@/lib/audit";
import { isGunu, pazartesi, gunEkle } from "@/lib/tarih";

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

/** Eşiğin altındaki sayıyı gizler. */
function gizle(sayi: number): number | null {
  return sayi > 0 && sayi < GIZLEME_ESIGI ? null : sayi;
}

/* ── Özet ──────────────────────────────────────────────────── */

export type RaporOzeti = {
  /** Ü29: satılan birim. Raporun baş sayısı. */
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
};

export async function ozet(cafeId: string, aralik: Aralik): Promise<RaporOzeti> {
  return withCafe(cafeId, (db) => ozetIle(db, aralik));
}

async function ozetIle(db: Db, aralik: Aralik): Promise<RaporOzeti> {
  const r = await db.one<{
    nitelikli: string;
    tekil: string;
    oyun: string;
    kupon_verilen: string;
    kupon_kullanilan: string;
    kazanilan: string;
    kullanilan: string;
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
       (SELECT count(*) FROM coupons
         WHERE issued_at >= $1::date AND issued_at < $2::date)                AS kupon_verilen,
       (SELECT count(*) FROM coupons
         WHERE status = 'redeemed' AND redeemed_at >= $1::date
           AND redeemed_at < $2::date)                                        AS kupon_kullanilan,
       (SELECT COALESCE(sum(reserved_kurus), 0) FROM coupons
         WHERE issued_at >= $1::date AND issued_at < $2::date)                AS kazanilan,
       (SELECT COALESCE(sum(committed_kurus), 0) FROM coupons
         WHERE status = 'redeemed' AND redeemed_at >= $1::date
           AND redeemed_at < $2::date)                                        AS kullanilan`,
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

export async function masaHareketi(cafeId: string, aralik: Aralik): Promise<MasaSatiri[]> {
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
    oyuncu: gizle(Number(r.oyuncu)),
    oyun: Number(r.oyun),
  }));
}

/* ── Saatlik dağılım ───────────────────────────────────────── */

export type SaatSatiri = { saat: number; oyuncu: number | null };

/**
 * Hangi saat doluyor.
 *
 * Satış konuşmasının en güçlü cümlesi buna dayanıyor: *"boş saatini
 * dolduruyorum."* İddiayı kanıtlayan tek şey bu dağılım.
 */
export async function saatlikDagilim(cafeId: string, aralik: Aralik): Promise<SaatSatiri[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{ saat: string; oyuncu: string }>(
      `SELECT extract(hour FROM ps.started_at AT TIME ZONE 'Europe/Istanbul')::int AS saat,
              count(DISTINCT ps.player_id) AS oyuncu
         FROM play_sessions ps
        WHERE ps.status = 'completed'
          AND ps.business_date >= $1 AND ps.business_date < $2
        GROUP BY 1 ORDER BY 1`,
      [aralik.baslangic, aralik.bitis],
    ),
  );

  const harita = new Map(satirlar.map((r) => [Number(r.saat), Number(r.oyuncu)]));
  // Boş saatler de görünmeli — "burası hiç dolmuyor" da bir bilgi.
  return Array.from({ length: 24 }, (_, saat) => ({
    saat,
    oyuncu: gizle(harita.get(saat) ?? 0),
  }));
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
              count(k.id) FILTER (WHERE k.issued_at >= $1::date
                                    AND k.issued_at < $2::date) AS verilen,
              count(k.id) FILTER (WHERE k.status = 'redeemed'
                                    AND k.redeemed_at >= $1::date
                                    AND k.redeemed_at < $2::date) AS kullanilan,
              COALESCE(sum(k.committed_kurus) FILTER (WHERE k.status = 'redeemed'
                                    AND k.redeemed_at >= $1::date
                                    AND k.redeemed_at < $2::date), 0) AS tutar
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
export async function disaAktar(cafeId: string, aralik: Aralik): Promise<string> {
  const [o, masalar, saatler, kampanyalar, defter] = await Promise.all([
    ozet(cafeId, aralik),
    masaHareketi(cafeId, aralik),
    saatlikDagilim(cafeId, aralik),
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
    ["CafePlay raporu", `${aralik.baslangic} — ${aralik.bitis}`],
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
    ["Saat", "Oyuncu"],
    ...saatler.filter((s) => s.oyuncu !== 0).map((s) => [`${s.saat}:00`, say(s.oyuncu)]),
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
