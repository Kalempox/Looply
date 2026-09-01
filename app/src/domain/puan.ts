import { withPlayer, type Db } from "@/db/context";
import { newId } from "@/lib/ids";
import { isGunu } from "@/lib/tarih";
import { log } from "@/lib/log";

/**
 * Puan ve kupon özeti.
 *
 * E3: bakiye kolonu yok — bakiye hareketlerin toplamı. Ekranda görünen her
 * sayı bu toplamdan geliyor, istemcide hiçbir şey hesaplanmıyor
 * (Faz 4 güvenlik kapısı).
 *
 * E2: puan kafe bazında. Oyuncunun "toplam puanı" diye bir şey yok;
 * her kafede ayrı bakiyesi var.
 */

export type OyuncuOzeti = {
  /** Aktif kafedeki puan. Kafe dışındaysa null. */
  kafePuani: number | null;
  /** Kullanılabilir kupon sayısı — tüm kafelerde */
  aktifKupon: number;
  /** Bugüne kadar kasada onaylanmış indirim (kuruş) */
  kullanilanIndirimKurus: number;
};

export async function ozet(playerId: string, cafeId?: string): Promise<OyuncuOzeti> {
  return withPlayer(playerId, async (db) => {
    let kafePuani: number | null = null;
    if (cafeId) {
      const r = await db.one<{ toplam: string }>(
        `SELECT COALESCE(sum(delta), 0) AS toplam FROM points_ledger WHERE cafe_id = $1`,
        [cafeId],
      );
      kafePuani = Number(r?.toplam ?? 0);
    }

    // Zaman karar veriyor, `status` kolonu değil: açılma saati geçmiş ama
    // bakım işi henüz dokunmamış (`pending`) kupon da kullanılabilir. Kolona
    // bakılsaydı ana ekran "1 kupon", Ödüllerim ekranı "2 kupon" derdi.
    const kupon = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM coupons
        WHERE status IN ('active', 'pending')
          AND activates_at <= now() AND expires_at > now()`,
    );

    const indirim = await db.one<{ toplam: string }>(
      `SELECT COALESCE(sum(committed_kurus), 0) AS toplam FROM coupons WHERE status = 'redeemed'`,
    );

    return {
      kafePuani,
      aktifKupon: Number(kupon?.n ?? 0),
      kullanilanIndirimKurus: Number(indirim?.toplam ?? 0),
    };
  });
}

/* ── Puan yazımı ─────────────────────────────────────────── */

/** Bir oyun tamamlandığında yazılan taban puan (docs/06 §2). */
export const OYUN_PUANI = 300;

/** Günün bonuslu oyunu çarpanı. */
export const BONUS_CARPANI = 2;

/**
 * Bölüm tamamlanmasa da yazılan katılım puanı (Ü48).
 *
 * ── Neden var ───────────────────────────────────────────────
 *
 * Önce yalnızca **başarılı** bölüm puan yazıyordu ve gerekçesi sağlamdı:
 * bölümü yarıda bırakıp yeniden başlamak en ucuz çiftlik yolu olmasın.
 * Ama sonuç şuydu — ilk kez oynayan, oyunu bitiremeyince ekranda
 * *"Kazanım yok"* görüyordu. Sadakat ürününde ilk deneyimin cezayla
 * bitmesi, tam da istemediğimiz şey.
 *
 * ── Çiftlik neden açılmıyor ─────────────────────────────────
 *
 * Üç kilit birden duruyor: puan **günlük tavana** (E4) tabi, kafede ve
 * konumu doğrulanmış olmayı gerektiriyor (Ü3), ve tutar başarılı bölümün
 * altıda biri. Yarıda bırakarak tavanı doldurmak, oynayarak doldurmaktan
 * yavaş — yani suistimalin ödülü yok.
 */
export const KATILIM_PUANI = 50;

/**
 * Skor eşikleri (Ü48) — yüksek skor doğrudan puan kazandırır.
 *
 * Ürün sahibinin örneği: *"1500, 2500"*. Bölümü bitirmek tek başarı ölçüsü
 * değil; iyi oynamanın da karşılığı olmalı.
 *
 * **Kademeler birikmiyor**: 2500 yapan oyuncu 150 + 300 değil, yalnızca
 * 300 alıyor. Toplasaydık eşikler arası fark yükseldikçe ödül katlanır,
 * tek bir iyi oyun günlük tavanı tek başına doldururdu.
 */
export const SKOR_ESIKLERI = [
  { skor: 1500, bonus: 150 },
  { skor: 2500, bonus: 300 },
] as const;

export type SkorEsigi = (typeof SKOR_ESIKLERI)[number];

/** Ulaşılan en yüksek kademe — hiçbirine ulaşılmadıysa null. */
export function esikBul(skor: number): SkorEsigi | null {
  let bulunan: SkorEsigi | null = null;
  for (const e of SKOR_ESIKLERI) if (skor >= e.skor) bulunan = e;
  return bulunan;
}

/** E4: günlük puan tavanı — oyuncu / kafe / gün. */
export const GUNLUK_TAVAN = 900;

export type PuanYazim = {
  playerId: string;
  cafeId: string;
  /** Çarpan uygulanmamış taban puan. */
  taban: number;
  /** E5: çarpanlar çarpışmaz — burada zaten en yükseği geliyor olmalı. */
  carpan: number;
  sebep: string;
  refTipi?: string;
  refId?: string;
  kanitSeviyesi: number;
};

export type PuanSonucu = {
  /** Fiilen yazılan puan. Tavan yüzünden istenenden az olabilir. */
  yazilan: number;
  /** Tavan yüzünden kesilen puan — ekranda dürüstçe söylenecek. */
  kesilen: number;
  /** Bu yazımdan sonra günün toplamı. */
  gunlukToplam: number;
};

/**
 * Puan yazar — günlük tavanı gözeterek (E4).
 *
 * Tavan sessizce uygulanmıyor: kesilen miktar geri dönüyor ki ekran
 * "bugünlük doldu" diyebilsin. Oyuncunun 300 puan beklerken 50 alması
 * ve nedenini bilmemesi, tavanın kendisinden daha çok zarar verir.
 *
 * **Var olan bir işlemin içinde çalışır.** Oyun bitişinde puan, XP ve oturum
 * güncellemesi aynı işlemde olmalı (E3).
 */
export async function yazIle(db: Db, opts: PuanYazim): Promise<PuanSonucu> {
  const gun = isGunu();

  const mevcut = await db.one<{ toplam: string }>(
    `SELECT COALESCE(sum(delta), 0) AS toplam FROM points_ledger
      WHERE player_id = $1 AND cafe_id = $2 AND business_date = $3 AND delta > 0`,
    [opts.playerId, opts.cafeId, gun],
  );

  const bugun = Number(mevcut?.toplam ?? 0);
  const istenen = opts.taban * opts.carpan;
  const yazilan = Math.max(0, Math.min(istenen, GUNLUK_TAVAN - bugun));

  if (yazilan > 0) {
    await db.query(
      `INSERT INTO points_ledger
         (id, cafe_id, player_id, business_date, delta, reason, multiplier, ref_type, ref_id, proof_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        newId("pnt"),
        opts.cafeId,
        opts.playerId,
        gun,
        yazilan,
        opts.sebep,
        opts.carpan,
        opts.refTipi ?? null,
        opts.refId ?? null,
        opts.kanitSeviyesi,
      ],
    );
  } else {
    log.info("puan yazilmadi: gunluk tavan dolu", { bugun });
  }

  return { yazilan, kesilen: istenen - yazilan, gunlukToplam: bugun + yazilan };
}

/**
 * Puan harcar — katalog ödülü satın alırken.
 *
 * Bakiye yetmiyorsa **yazmaz ve false döner**. Bakiye kolonu olmadığı için
 * (E3) toplam her seferinde defterden hesaplanıyor; çağıran taraf işlemi
 * kilitlemiş olmalı, yoksa iki eşzamanlı satın alma aynı bakiyeyi iki kez
 * harcayabilir.
 */
export async function harcaIle(
  db: Db,
  opts: {
    playerId: string;
    cafeId: string;
    puan: number;
    sebep: string;
    refTipi?: string;
    refId?: string;
  },
): Promise<boolean> {
  if (!Number.isInteger(opts.puan) || opts.puan <= 0) return false;

  const r = await db.one<{ toplam: string }>(
    `SELECT COALESCE(sum(delta), 0) AS toplam FROM points_ledger
      WHERE player_id = $1 AND cafe_id = $2`,
    [opts.playerId, opts.cafeId],
  );

  const bakiye = Number(r?.toplam ?? 0);
  if (bakiye < opts.puan) {
    log.info("puan harcanmadi: bakiye yetmiyor", { bakiye, istenen: opts.puan });
    return false;
  }

  await db.query(
    `INSERT INTO points_ledger
       (id, cafe_id, player_id, business_date, delta, reason, ref_type, ref_id, proof_level)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0)`,
    [
      newId("pnt"),
      opts.cafeId,
      opts.playerId,
      isGunu(),
      -opts.puan,
      opts.sebep,
      opts.refTipi ?? null,
      opts.refId ?? null,
    ],
  );

  return true;
}

/** Oyuncunun bir kafedeki puan bakiyesi. */
export async function bakiyeIle(db: Db, playerId: string, cafeId: string): Promise<number> {
  const r = await db.one<{ toplam: string }>(
    `SELECT COALESCE(sum(delta), 0) AS toplam FROM points_ledger
      WHERE player_id = $1 AND cafe_id = $2`,
    [playerId, cafeId],
  );
  return Number(r?.toplam ?? 0);
}
