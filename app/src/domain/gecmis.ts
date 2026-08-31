import { withBypass } from "@/db/context";
import { oyunBul } from "@/oyunlar";

/**
 * Kafe bazlı oyun geçmişi — "hangi kafede hangi oyunları oynadım".
 *
 * Yalnızca **tamamlanmış** oturumlar sayılıyor: yarıda bırakılan veya
 * reddedilen oyun geçmişte yer almaz, çünkü oyuncunun sorduğu soru
 * "ne oynadım" değil "ne bitirdim".
 *
 * Skor sunucunun hesapladığı skordur (`server_score`); istemciden gelen
 * `claimed_score` ekrana hiç çıkmaz — o yalnızca denetim için saklanıyor
 * (S5, Faz 5 güvenlik kapısı).
 *
 * `withBypass` gerekçesi `xp.tumKafeler` ile aynı: kafe adı `cafes`'ten
 * geliyor ve orada oyuncu politikası yok. Süzgeç SQL'de açık.
 */

/** Kafe başına listelenecek en fazla oyun. Geri kalanı sayıya dahil. */
const KAFE_BASINA = 10;

export type OyunKaydi = {
  oyunId: string;
  oyunAdi: string;
  emoji: string;
  tarih: Date;
  skor: number | null;
};

export type KafeGecmisi = {
  cafeId: string;
  cafeAdi: string;
  /** O kafede tamamlanan toplam oyun sayısı. */
  toplamOyun: number;
  /** En son oynanan `KAFE_BASINA` tanesi. */
  sonOyunlar: OyunKaydi[];
};

export async function kafeBazli(playerId: string): Promise<KafeGecmisi[]> {
  const satirlar = await withBypass("oyun geçmişi — kafe adları", (db) =>
    db.all<{
      cafe_id: string;
      cafe_adi: string;
      game_id: string;
      started_at: Date;
      server_score: number | null;
      kafe_toplam: string;
    }>(
      `SELECT cafe_id, cafe_adi, game_id, started_at, server_score, kafe_toplam
         FROM (
           SELECT ps.cafe_id, c.name AS cafe_adi, ps.game_id, ps.started_at,
                  ps.server_score,
                  count(*)     OVER (PARTITION BY ps.cafe_id) AS kafe_toplam,
                  row_number() OVER (PARTITION BY ps.cafe_id
                                     ORDER BY ps.started_at DESC) AS sira
             FROM play_sessions ps
             JOIN cafes c ON c.id = ps.cafe_id
            WHERE ps.player_id = $1 AND ps.status = 'completed'
         ) t
        WHERE sira <= $2
        ORDER BY started_at DESC`,
      [playerId, KAFE_BASINA],
    ),
  );

  const kafeler = new Map<string, KafeGecmisi>();

  for (const r of satirlar) {
    let kafe = kafeler.get(r.cafe_id);
    if (!kafe) {
      kafe = {
        cafeId: r.cafe_id,
        cafeAdi: r.cafe_adi,
        toplamOyun: Number(r.kafe_toplam),
        sonOyunlar: [],
      };
      kafeler.set(r.cafe_id, kafe);
    }

    const oyun = oyunBul(r.game_id);
    kafe.sonOyunlar.push({
      oyunId: r.game_id,
      // Listeden kaldırılmış bir oyunun geçmişteki kaydı kaybolmasın.
      oyunAdi: oyun?.ad ?? r.game_id,
      emoji: oyun?.emoji ?? "🎲",
      tarih: r.started_at,
      skor: r.server_score,
    });
  }

  return [...kafeler.values()].sort((a, b) => b.toplamOyun - a.toplamOyun);
}
