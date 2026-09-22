import { withBypass, type Db } from "@/db/context";
import { decryptPII } from "@/lib/crypto";
import { pazartesi, gunEkle, isGunu } from "@/lib/tarih";

/**
 * Masayı Fethet — masa tahtı (Ö1).
 *
 * ── Neden yeni tablo yok ────────────────────────────────────
 *
 * Taht bir **durum değil, bir sorgunun cevabı**: o masada, günün oyununda
 * yapılmış en yüksek doğrulanmış skor. `play_sessions` bunu zaten taşıyor.
 *
 * Ayrı bir "krallar" tablosu tutmak, aynı gerçeği iki yerde saklamak olurdu
 * ve iki yer er ya da geç ayrışır: bir oyun reddedilir (`status = 'rejected'`)
 * ama taht tablosunda kral olarak kalır. Sorgu, reddedilen oturumu
 * kendiliğinden dışarıda bırakıyor.
 *
 * ── Skor kaynağı: günün oyunu ───────────────────────────────
 *
 * Spec'in şartı: *"tek oyun — karşılaştırılabilir olması için"*. Blok'ta
 * 1.240, Düşen'de 1.240 aynı şey değil; farklı oyunları tek tahtta
 * yarıştırmak sıralamayı anlamsız kılardı. Çağıran hangi oyunu sorduğunu
 * söylüyor; ekran `gununOyunu()` ile çağırıyor.
 *
 * ── Ekonomik avantaj yok ────────────────────────────────────
 *
 * Taht sahibine puan, kupon veya çarpan **verilmiyor** (spec: "statü
 * yeterli"). Bu dosya hiçbir deftere yazmıyor — yalnızca okuyor. Havuz
 * kontrolü (E5) bu yüzden bozulmuyor ve taht yeni bir fraud yüzeyi açmıyor:
 * kazanılacak bir şey yok.
 *
 * ── Ad görünürlüğü ──────────────────────────────────────────
 *
 * Kralın **adı** görünüyor, soyadı asla. Oyuncu `/verilerim`den kapatabilir;
 * kapattığında kafeye özel anonim koduyla (`P-4F2A`) görünür — tahttan
 * düşmez, yalnızca adı gizlenir (göç 0015).
 */

export type Taht = {
  playerId: string;
  /** Ad veya — oyuncu kapattıysa — kafeye özel anonim kod. */
  gorunenAd: string;
  skor: number;
  tarih: Date;
  /** Bakan oyuncunun kendisi mi? */
  benMiyim: boolean;
};

export type MasaTahti = {
  /** Masa adı; masası olmayan kafede null — o zaman taht "Kafe Kralı". */
  masaAdi: string | null;
  oyunId: string;
  oyunAdi: string;
  /** Devrilene kadar süren taht. Kimse oynamadıysa null. */
  kalici: Taht | null;
  /** Pazartesi sıfırlanan taht. */
  haftalik: Taht | null;
  /** Tahtı devirmek için gereken skor. Taht boşsa 1. */
  devirmekIcin: number;
};

/* ── Sorgu ─────────────────────────────────────────────────── */

type HamTaht = {
  player_id: string;
  skor: number;
  tarih: Date;
  ad_gorunur: boolean;
  ad_enc: Buffer;
  takma_ad: string | null;
};

/**
 * En yüksek skoru bulur.
 *
 * `table_id IS NOT DISTINCT FROM $2` — masası olmayan kafede (kasa veya menü
 * karekodu) `table_id` null ve taht kafe düzeyinde tek oluyor. `= null` bunu
 * yakalayamazdı; `IS NOT DISTINCT FROM` null'ı da eşleştiriyor.
 *
 * `is_qualified` **aranmıyor**: nitelikli oturum günde bir kez sayılıyor
 * (S3), ama oyuncu aynı gün ikinci kez oynayıp daha yüksek skor yapabilir ve
 * o skor da gerçek. Aranan tek şey oturumun kafede, konumu doğrulanmış ve
 * tamamlanmış olması — Ü3'ün sınırı.
 */
async function enIyi(
  db: Db,
  opts: { cafeId: string; tableId: string | null; oyunId: string; baslangic?: string },
): Promise<HamTaht | null> {
  const r = await db.one<HamTaht>(
    `SELECT ps.player_id,
            ps.server_score AS skor,
            ps.ended_at     AS tarih,
            p.leaderboard_name_visible AS ad_gorunur,
            p.first_name_enc           AS ad_enc,
            (SELECT code FROM player_aliases a
              WHERE a.cafe_id = ps.cafe_id AND a.player_id = ps.player_id) AS takma_ad
       FROM play_sessions ps
       JOIN players p ON p.id = ps.player_id
      WHERE ps.cafe_id = $1
        AND ps.table_id IS NOT DISTINCT FROM $2
        AND ps.game_id = $3
        AND ps.status = 'completed'
        AND ps.server_score IS NOT NULL
        AND (ps.proof_mask & 2) <> 0
        AND ($4::date IS NULL OR ps.business_date >= $4::date)
        AND p.anonymized_at IS NULL
      ORDER BY ps.server_score DESC, ps.ended_at ASC
      LIMIT 1`,
    [opts.cafeId, opts.tableId, opts.oyunId, opts.baslangic ?? null],
  );
  return r ?? null;
}

function tahtaCevir(r: HamTaht | null, bakan: string): Taht | null {
  if (!r) return null;
  return {
    playerId: r.player_id,
    // Soyad hiçbir koşulda çözülmüyor — bu satırda ona erişim bile yok.
    gorunenAd: r.ad_gorunur ? decryptPII(r.ad_enc) : (r.takma_ad ?? "Bir oyuncu"),
    skor: r.skor,
    tarih: r.tarih,
    benMiyim: r.player_id === bakan,
  };
}

/**
 * Bir masanın tahtı — kalıcı ve haftalık.
 *
 * `withBypass`: sorgu iki kiracıyı birden ilgilendiriyor (oyuncu bağlamında
 * `players` üzerinde politika yok) ve süzgeç SQL'de açıkça yazılı. `masa.aktif`
 * ile aynı gerekçe.
 */
export async function masaTahti(opts: {
  cafeId: string;
  tableId: string | null;
  masaAdi: string | null;
  oyunId: string;
  oyunAdi: string;
  bakanPlayerId: string;
  gun?: string;
}): Promise<MasaTahti> {
  const haftaBasi = pazartesi(opts.gun ?? isGunu());

  const { kalici, haftalik } = await withBypass("masa tahtı", async (db) => ({
    kalici: await enIyi(db, opts),
    haftalik: await enIyi(db, { ...opts, baslangic: haftaBasi }),
  }));

  const k = tahtaCevir(kalici, opts.bakanPlayerId);

  return {
    masaAdi: opts.masaAdi,
    oyunId: opts.oyunId,
    oyunAdi: opts.oyunAdi,
    kalici: k,
    haftalik: tahtaCevir(haftalik, opts.bakanPlayerId),
    devirmekIcin: (k?.skor ?? 0) + 1,
  };
}

/* ── Devirme ───────────────────────────────────────────────── */

export type DevirmeSonucu =
  | { devirdi: false }
  | { devirdi: true; eskiSkor: number | null; yeniSkor: number; haftalikMi: boolean };

/**
 * Biten oyun tahtı devirdi mi?
 *
 * Sonuç ekranında gösterilecek cümleyi üretiyor. Oyun **bittikten sonra**
 * çağrılıyor, yani biten oturum da sorguya dahil — bu yüzden "yeni kral
 * benim" karşılaştırması skora değil **oyuncu kimliğine** bakıyor. Aynı
 * skoru başkası daha önce yapmışsa taht onda kalıyor (`ORDER BY ... ended_at
 * ASC`): berabere kalan tahtı devirmez, ilk yapan kral kalır.
 */
export async function devirdiMi(opts: {
  cafeId: string;
  tableId: string | null;
  oyunId: string;
  playerId: string;
  skor: number;
  gun?: string;
}): Promise<DevirmeSonucu> {
  return withBypass("taht devirme", (db) => devirdiMiIle(db, opts));
}

/**
 * Var olan bir işlemin içinde sorar.
 *
 * Oyun bitişinde **aynı işlemde** çağrılıyor: biten oturumun `UPDATE`'i o
 * işlemde yazıldı ve henüz commit edilmedi. Ayrı bağlantıdan sorulsaydı
 * sorgu biten oyunu göremez, oyuncu tahtı devirdiği hâlde "devirmedin"
 * cevabı alırdı. `xp.yazIle` ile aynı gerekçe.
 */
export async function devirdiMiIle(
  db: Db,
  opts: {
    cafeId: string;
    tableId: string | null;
    oyunId: string;
    playerId: string;
    skor: number;
    gun?: string;
  },
): Promise<DevirmeSonucu> {
  const haftaBasi = pazartesi(opts.gun ?? isGunu());

  {
    const kalici = await enIyi(db, opts);
    if (!kalici || kalici.player_id !== opts.playerId || kalici.skor !== opts.skor) {
      return { devirdi: false as const };
    }

    // Bu oturumdan öncekilerin en iyisi — devrilen skor.
    const onceki = await db.one<{ skor: number }>(
      `SELECT max(server_score) AS skor
         FROM play_sessions
        WHERE cafe_id = $1 AND table_id IS NOT DISTINCT FROM $2 AND game_id = $3
          AND status = 'completed' AND server_score IS NOT NULL
          AND (proof_mask & 2) <> 0
          AND player_id <> $4`,
      [opts.cafeId, opts.tableId, opts.oyunId, opts.playerId],
    );

    const haftalik = await enIyi(db, { ...opts, baslangic: haftaBasi });

    return {
      devirdi: true as const,
      eskiSkor: onceki?.skor ?? null,
      yeniSkor: opts.skor,
      haftalikMi: haftalik?.player_id === opts.playerId,
    };
  }
}

/* ── Görünürlük tercihi ────────────────────────────────────── */

export async function adGorunurMu(playerId: string): Promise<boolean> {
  const r = await withBypass("ad görünürlüğü", (db) =>
    db.one<{ v: boolean }>(
      `SELECT leaderboard_name_visible AS v FROM players WHERE id = $1`,
      [playerId],
    ),
  );
  return r?.v ?? true;
}

export async function adGorunurluguAyarla(playerId: string, acik: boolean): Promise<void> {
  await withBypass("ad görünürlüğü değişikliği", (db) =>
    db.query(`UPDATE players SET leaderboard_name_visible = $2 WHERE id = $1`, [playerId, acik]),
  );
}

/* ── Hafta ─────────────────────────────────────────────────── */

/** Haftalık tahtın sıfırlanacağı an — ekranda "pazartesi sıfırlanır" demek için. */
export function haftaSonu(gun = isGunu()): string {
  return gunEkle(pazartesi(gun), 7);
}
