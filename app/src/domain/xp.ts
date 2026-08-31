import { withBypass, type Db } from "@/db/context";
import { newId } from "@/lib/ids";
import { isGunu } from "@/lib/tarih";
import { log } from "@/lib/log";
import { K2 } from "./masa";

/**
 * XP — harcanmayan ilerleme sayacı (Ü14).
 *
 * Puandan farkı tek cümlede: **puan harcanır, XP harcanmaz.** Ödül alan
 * oyuncunun puanı düşer ama seviyesi düşmez. İkisi ayrı defterde duruyor
 * ki bu ayrım kod disiplinine değil şemaya dayansın (0009 göçü).
 *
 * Ü15: seviye **kafe bazında**. Oyuncunun global seviyesi yok — "bu kafede
 * 4. seviyeyim" der. Ü5'le aynı hat: A kafesinde kazanılan A'da kalır.
 *
 * Ü3: kafe dışında oynamak XP kazandırmaz. Bunu üç yerde birden koruyoruz —
 * burada (doğrulanmış masa oturumu aranır), şemada (`xp_oyun_kafede`
 * kısıtı) ve testte.
 */

/**
 * Seviye eşikleri — bir kafede kazanılan toplam XP.
 *
 * ⚠️ Bu sayılar **geçici**. Oyun motoru gerçek skor üretmeden (Faz 5)
 * kalibre edilemezler; oyun başına kaç XP düştüğü bilinmeden eşik koymak
 * tahmindir. Faz 5'te `06-ekonomi-ve-dogrulama.md`'ye bağlanacaklar.
 * Tablo burada tek yerde durduğu için değiştirmek göç gerektirmiyor.
 */
export const SEVIYE_ESIKLERI = [0, 100, 300, 700, 1_500, 3_000, 5_500, 9_000, 14_000, 21_000];

export type KaynakTipi = "GAME" | "BADGE" | "REFERRAL" | "ADJUSTMENT";

export type KafeSeviyesi = {
  cafeId: string;
  cafeAdi: string;
  xp: number;
  seviye: number;
  /** Bir sonraki seviyeye gereken toplam XP. En üst seviyedeyse null. */
  sonrakiEsik: number | null;
  /** Bu seviyenin içinde kat edilen yol — 0..100. En üst seviyede 100. */
  ilerlemeYuzde: number;
};

/** Toplam XP'den seviye. En düşük seviye 1'dir — sıfır XP'li oyuncu da bir yerdedir. */
export function seviye(xp: number): number {
  let s = 1;
  for (let i = 0; i < SEVIYE_ESIKLERI.length; i++) {
    if (xp >= SEVIYE_ESIKLERI[i]) s = i + 1;
    else break;
  }
  return s;
}

/** Bir sonraki seviyenin eşiği. En üst seviyedeyse null. */
export function sonrakiEsik(xp: number): number | null {
  const s = seviye(xp);
  return s >= SEVIYE_ESIKLERI.length ? null : SEVIYE_ESIKLERI[s];
}

/** Mevcut seviyenin içinde kat edilen yol — ilerleme çubuğu için. */
export function ilerlemeYuzde(xp: number): number {
  const s = seviye(xp);
  const alt = SEVIYE_ESIKLERI[s - 1];
  const ust = sonrakiEsik(xp);
  if (ust === null) return 100;
  const aralik = ust - alt;
  if (aralik <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(((xp - alt) / aralik) * 100)));
}

function ozetle(cafeId: string, cafeAdi: string, xp: number): KafeSeviyesi {
  return {
    cafeId,
    cafeAdi,
    xp,
    seviye: seviye(xp),
    sonrakiEsik: sonrakiEsik(xp),
    ilerlemeYuzde: ilerlemeYuzde(xp),
  };
}

/**
 * XP yazar. Yazıldıysa true, reddedildiyse false döner.
 *
 * `GAME` kaynağında kanıt seviyesi **çağırandan alınmaz**, masa oturumundan
 * okunur. İstemci "ben kafedeydim" diyemez; sunucu bakar. Doğrulanmış
 * oturum yoksa satır hiç yazılmaz (Ü3).
 */
export type XpYazim = {
  playerId: string;
  cafeId: string;
  delta: number;
  kaynak: KaynakTipi;
  kaynakId?: string;
};

export async function yaz(opts: XpYazim): Promise<boolean> {
  return withBypass("xp defterine yazma", (db) => yazIle(db, opts));
}

/**
 * Var olan bir işlemin içinde XP yazar.
 *
 * Oyun bitişinde puan, XP ve oturum güncellemesi **aynı işlemde** olmalı:
 * ayrı işlemler olsaydı puanı yazılmış ama XP'si yazılmamış bir oyuncu
 * mümkün olurdu. Defter bütünlüğü buna izin vermez (E3).
 */
export async function yazIle(db: Db, opts: XpYazim): Promise<boolean> {
  const { playerId, cafeId, delta, kaynak, kaynakId } = opts;

  if (delta === 0) return false;
  if (delta < 0 && kaynak !== "ADJUSTMENT") {
    // Şema da reddederdi; buraya düşmek bir kod hatasıdır, sessiz kalmasın.
    throw new Error("xp.yaz: negatif XP yalnızca ADJUSTMENT ile yazılabilir (Ü14)");
  }

  let kanit = 0;

  if (kaynak === "GAME") {
      // Ü3'ün kapısı: doğrulanmış (K2) ve süresi geçmemiş masa oturumu şart.
    const oturum = await db.one<{ proof_mask: number; proof_level: number }>(
      `SELECT proof_mask, proof_level FROM table_sessions
        WHERE player_id = $1 AND cafe_id = $2 AND expires_at > now()
        ORDER BY started_at DESC LIMIT 1`,
      [playerId, cafeId],
    );

    if (!oturum || !(oturum.proof_mask & K2)) {
      log.info("xp reddedildi: dogrulanmis masa oturumu yok", { cafeId, kaynak });
      return false;
    }
    kanit = Math.max(2, oturum.proof_level);
  }

  await db.query(
    `INSERT INTO xp_ledger
       (id, cafe_id, player_id, business_date, delta, source_type, source_id, proof_level)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [newId("xp"), cafeId, playerId, isGunu(), delta, kaynak, kaynakId ?? null, kanit],
  );

  return true;
}

/** Bir kafedeki XP ve seviye. Oyuncu o kafede hiç oynamadıysa sıfırdan başlar. */
export async function kafeSeviyesi(playerId: string, cafeId: string): Promise<KafeSeviyesi> {
  return withBypass("oyuncu kafe seviyesi", async (db) => {
    const r = await db.one<{ toplam: string; cafe_adi: string | null }>(
      `SELECT COALESCE((SELECT sum(delta) FROM xp_ledger
                         WHERE player_id = $1 AND cafe_id = $2), 0) AS toplam,
              (SELECT name FROM cafes WHERE id = $2) AS cafe_adi`,
      [playerId, cafeId],
    );
    return ozetle(cafeId, r?.cafe_adi ?? "", Number(r?.toplam ?? 0));
  });
}

/**
 * Oyuncunun XP kazandığı tüm kafeler — profil ekranının omurgası.
 *
 * Kafe adı için `cafes` tablosuna bakmak gerekiyor ve oyuncu bağlamında
 * `cafes` üzerinde politika yok (0003: yalnızca bypass ve tenant). Bu yüzden
 * `withBypass` — `masa.aktif()` ile aynı gerekçe. Süzgeç SQL'de açıkça
 * `player_id = $1`; bağlam gevşedi diye sorgu gevşemiyor.
 */
export async function tumKafeler(playerId: string): Promise<KafeSeviyesi[]> {
  const satirlar = await withBypass("oyuncu profili — kafe adları", (db) =>
    db.all<{ cafe_id: string; cafe_adi: string; toplam: string }>(
      `SELECT x.cafe_id, c.name AS cafe_adi, sum(x.delta) AS toplam
         FROM xp_ledger x JOIN cafes c ON c.id = x.cafe_id
        WHERE x.player_id = $1
        GROUP BY x.cafe_id, c.name
        HAVING sum(x.delta) > 0
        ORDER BY sum(x.delta) DESC`,
      [playerId],
    ),
  );

  return satirlar.map((r) => ozetle(r.cafe_id, r.cafe_adi, Number(r.toplam)));
}
