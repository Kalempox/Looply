import { withBypass } from "@/db/context";
import { newId } from "@/lib/ids";
import { log } from "@/lib/log";
import { seviye } from "./xp";

/**
 * Rozetler — yalnızca statü (Ü16).
 *
 * Rozetin **ekonomik değeri yoktur**: puan, kupon, bütçe ve XP defterlerine
 * tek satır yazmaz. Havuz muhasebesine dokunmadığı için E5'i (çarpanlar
 * çarpışmaz) bozmaz ve yeni bir fraud yüzeyi açmaz. Kazanmanın tek sonucu
 * profil ekranında bir rozetin görünmesidir.
 *
 * Liste **platformun**: `badges` tablosuna uygulama rolünün yazma yetkisi
 * yok (0009). Kafe kendi rozetini tanımlayamaz — yeni rozet yeni göç demek.
 *
 * Kapsam iki türlü:
 *   global → oyuncu başına bir kez  ("İlk Oyun")
 *   cafe   → her kafede ayrı        ("Müdavim")
 *
 * Ü15 ile aynı mantık: ilerleme kafeye bağlı, çünkü değer üreten şey
 * mekândaki varlık.
 */

export type Kapsam = "global" | "cafe";

export type RozetTanim = {
  code: string;
  baslik: string;
  aciklama: string;
  kapsam: Kapsam;
  kuralAnahtari: string;
  esik: number | null;
  sira: number;
};

export type KazanilmisRozet = {
  code: string;
  baslik: string;
  aciklama: string;
  kapsam: Kapsam;
  cafeId: string | null;
  /** Kafe rozetinde kafenin adı; global rozette null. */
  cafeAdi: string | null;
  kazanildi: Date;
};

/**
 * Değerlendirmede kullanılan ölçüler.
 *
 * Hepsi tek sorguda toplanıyor: rozet değerlendirmesi profil ekranı her
 * açıldığında çalışıyor ve altı ayrı gidiş dönüş olmamalı.
 */
type Olculer = {
  ziyaret_sayisi: number;
  ziyaret_gunu: number;
  oyun_sayisi: number;
  kafe_oyun_sayisi: number;
  kupon_sayisi: number;
  seviye: number;
};

/** Etkin rozet tanımları. */
export async function tanimlar(): Promise<RozetTanim[]> {
  const satirlar = await withBypass("rozet tanımları", (db) =>
    db.all<{
      code: string;
      title: string;
      description: string;
      scope: Kapsam;
      rule_key: string;
      threshold: number | null;
      sort_order: number;
    }>(
      `SELECT code, title, description, scope, rule_key, threshold, sort_order
         FROM badges WHERE active ORDER BY sort_order`,
    ),
  );

  return satirlar.map((r) => ({
    code: r.code,
    baslik: r.title,
    aciklama: r.description,
    kapsam: r.scope,
    kuralAnahtari: r.rule_key,
    esik: r.threshold,
    sira: r.sort_order,
  }));
}

/**
 * Oyuncunun kazandığı rozetleri değerlendirir ve yenilerini yazar.
 *
 * `cafeId` verilmezse yalnızca global rozetler değerlendirilir — oyuncu
 * kafe dışındaysa "bu kafede" diye bir şey yok.
 *
 * Yazma **birikimli değil, idempotent**: aynı rozet ikinci kez yazılmaya
 * çalışılırsa benzersiz indeks (0009) sessizce reddeder. Bu yüzden ekran
 * her açıldığında çağrılabilir.
 *
 * Dönen değer, bu çağrıda **yeni** kazanılanların kodları — ekranda
 * "yeni rozet kazandın" demek için.
 */
export async function degerlendir(playerId: string, cafeId?: string): Promise<string[]> {
  const tumTanimlar = await tanimlar();
  if (tumTanimlar.length === 0) return [];

  return withBypass("rozet değerlendirme", async (db) => {
    const r = await db.one<{
      ziyaret_sayisi: string;
      ziyaret_gunu: string;
      oyun_sayisi: string;
      kafe_oyun_sayisi: string;
      kupon_sayisi: string;
      kafe_xp: string;
    }>(
      `SELECT
         (SELECT count(*) FROM table_sessions
           WHERE player_id = $1 AND cafe_id = $2)                       AS ziyaret_sayisi,
         (SELECT count(DISTINCT (started_at AT TIME ZONE 'Europe/Istanbul')::date)
            FROM table_sessions
           WHERE player_id = $1 AND cafe_id = $2)                       AS ziyaret_gunu,
         (SELECT count(*) FROM play_sessions
           WHERE player_id = $1 AND status = 'completed')               AS oyun_sayisi,
         (SELECT count(*) FROM play_sessions
           WHERE player_id = $1 AND cafe_id = $2
             AND status = 'completed')                                  AS kafe_oyun_sayisi,
         (SELECT count(*) FROM coupons
           WHERE player_id = $1 AND status = 'redeemed')                AS kupon_sayisi,
         (SELECT COALESCE(sum(delta), 0) FROM xp_ledger
           WHERE player_id = $1 AND cafe_id = $2)                       AS kafe_xp`,
      [playerId, cafeId ?? null],
    );

    const olculer: Olculer = {
      ziyaret_sayisi: Number(r?.ziyaret_sayisi ?? 0),
      ziyaret_gunu: Number(r?.ziyaret_gunu ?? 0),
      oyun_sayisi: Number(r?.oyun_sayisi ?? 0),
      kafe_oyun_sayisi: Number(r?.kafe_oyun_sayisi ?? 0),
      kupon_sayisi: Number(r?.kupon_sayisi ?? 0),
      seviye: seviye(Number(r?.kafe_xp ?? 0)),
    };

    const yeniler: string[] = [];

    for (const t of tumTanimlar) {
      // Kafe rozeti, kafe bilinmeden değerlendirilemez.
      if (t.kapsam === "cafe" && !cafeId) continue;

      const olculen = olculer[t.kuralAnahtari as keyof Olculer];
      if (olculen === undefined) {
        // Tanımda olup karşılığı yazılmamış kural — sessiz geçmek yanlış olur.
        log.warn("rozet kurali taninmiyor", { code: t.code, kural: t.kuralAnahtari });
        continue;
      }
      if (olculen < (t.esik ?? 1)) continue;

      // Benzersiz indeksler (0009) ikinci kaydı reddeder; çakışma normal akış.
      const sonuc = await db.query(
        `INSERT INTO player_badges (id, player_id, badge_code, cafe_id)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING`,
        [newId("roz"), playerId, t.code, t.kapsam === "cafe" ? cafeId : null],
      );

      if (sonuc.rowCount) yeniler.push(t.code);
    }

    // Ü16'nın tek cümlelik kanıtı: bu fonksiyon `player_badges` dışında
    // hiçbir tabloya yazmıyor. Rozet kazanmak bakiye değiştirmiyor.
    if (yeniler.length) log.info("rozet kazanildi", { adet: yeniler.length });

    return yeniler;
  });
}

/**
 * Oyuncunun kazandığı tüm rozetler — global ve kafe bazlı birlikte.
 *
 * Kafe adı da geliyor: rozet, o kafede henüz XP kazanılmamış olsa bile
 * profilde gösterilebilmeli. İlk ziyaretini yapıp henüz oynamamış oyuncunun
 * tek kazanımı bu rozet oluyor ve kaybolmamalı.
 */
export async function oyuncununRozetleri(playerId: string): Promise<KazanilmisRozet[]> {
  const satirlar = await withBypass("oyuncu rozetleri", (db) =>
    db.all<{
      code: string;
      title: string;
      description: string;
      scope: Kapsam;
      cafe_id: string | null;
      cafe_adi: string | null;
      earned_at: Date;
    }>(
      `SELECT b.code, b.title, b.description, b.scope,
              pb.cafe_id, c.name AS cafe_adi, pb.earned_at
         FROM player_badges pb
         JOIN badges b ON b.code = pb.badge_code
         LEFT JOIN cafes c ON c.id = pb.cafe_id
        WHERE pb.player_id = $1
        ORDER BY pb.earned_at DESC`,
      [playerId],
    ),
  );

  return satirlar.map((r) => ({
    code: r.code,
    baslik: r.title,
    aciklama: r.description,
    kapsam: r.scope,
    cafeId: r.cafe_id,
    cafeAdi: r.cafe_adi,
    kazanildi: r.earned_at,
  }));
}
