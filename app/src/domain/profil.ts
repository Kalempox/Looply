import { withBypass } from "@/db/context";
import { tumKafeler, seviye, sonrakiEsik, ilerlemeYuzde, type KafeSeviyesi } from "./xp";
import { oyuncununRozetleri, type KazanilmisRozet } from "./rozet";
import { kafeBazli, type KafeGecmisi } from "./gecmis";
import { seriyiSay, EN_UZUN_BAKIS, type Seri } from "./seri";
import { isGunu } from "@/lib/tarih";

/**
 * Profil karnesi — seviye, rozet ve oyun geçmişini tek görünümde birleştirir.
 *
 * Ü15: kafe kartlarından oluşuyor, tepede tek bir global seviye yok.
 *
 * Birleştirme sayfada değil burada, çünkü asıl kural burada: **üç kaynağın
 * da kafe kartı açabilmesi gerekir.** Hiçbiri diğerini gerektirmiyor —
 *
 *   · XP var, oyun geçmişi yok  → davet (Faz 9) veya düzeltme XP'si
 *   · Oyun geçmişi var, XP yok  → XP defteri Faz 4'te açıldı; oyun
 *     oturumları ondan önce de oluşabiliyordu
 *   · Yalnızca rozet var        → ilk ziyaretini yapmış, henüz oynamamış
 *
 * Üçüncüsü ilk yazımda gözden kaçtı: rozet yalnızca hazır bir karta
 * iliştiriliyordu ve ilk ziyaret rozeti kazanan oyuncunun profili boş
 * görünüyordu. Kazanılmış bir şeyin ekranda kaybolması, kazanılmamış
 * olmasından daha kötü.
 */

/**
 * Oyuncunun bir kafedeki ANLIK durumu — Ü188.
 *
 * ── Neden profile girdi ─────────────────────────────────────
 *
 * Profil Ü15'ten beri *"ne kadar ilerledim"* diyordu: seviye, XP, rozet,
 * oynadıkların. Ürün sahibi *"profil kısmını tam işimize yarayacak
 * şekilde yenileyelim"* dedi ve eksik olan ikinci soruydu — **"elimde ne
 * var, nerede duruyorum."** Puan bakiyesi yalnızca ana ekranda, kupon
 * sayısı yalnızca Ödüllerim'de, seri yalnızca kafedeyken görünüyordu.
 * Oyuncu üç ekran gezmeden kendi durumunu göremiyordu.
 */
export type KafeDurumu = {
  /** Bu kafedeki puan bakiyesi — defterin toplamı. */
  puan: number;
  /** Bugüne kadar bu kafede kazanılan toplam kupon. */
  kuponToplam: number;
  /** Elde duran: penceresi açık ve süresi geçmemiş. */
  kuponElde: number;
  /** Kasada gösterilip kullanılmış. */
  kuponKullanilan: number;
  seri: Seri;
};

export type KafeKarnesi = KafeSeviyesi &
  KafeDurumu & {
    toplamOyun: number;
    oyunlar: KafeGecmisi["oyunlar"];
    rozetler: KazanilmisRozet[];
  };

/** Hiç kaydı olmayan kafenin durumu. */
const BOS_DURUM: KafeDurumu = {
  puan: 0,
  kuponToplam: 0,
  kuponElde: 0,
  kuponKullanilan: 0,
  seri: { gun: 0, bugunOynadi: false, riskte: false },
};

export type Karne = {
  kafeler: KafeKarnesi[];
  /** Kafeye bağlı olmayan rozetler — profilin tepesinde. */
  globalRozetler: KazanilmisRozet[];
};

export function birlestir(
  seviyeler: KafeSeviyesi[],
  gecmis: KafeGecmisi[],
  rozetler: KazanilmisRozet[],
  durumlar: Map<string, KafeDurumu> = new Map(),
): KafeKarnesi[] {
  const harita = new Map<string, KafeKarnesi>();

  /**
   * Kartı yoksa boş bir karne açar.
   *
   * Sıfır XP'nin seviye değerleri **hesaplanıyor**, elle yazılmıyor:
   * `sonrakiEsik: null` yazmak, arayüzde "en üst seviyedesin" demek —
   * henüz hiç XP kazanmamış oyuncuya söylenecek en yanlış cümle.
   */
  const kart = (cafeId: string, cafeAdi: string): KafeKarnesi => {
    let k = harita.get(cafeId);
    if (!k) {
      k = {
        cafeId,
        cafeAdi,
        xp: 0,
        seviye: seviye(0),
        sonrakiEsik: sonrakiEsik(0),
        ilerlemeYuzde: ilerlemeYuzde(0),
        toplamOyun: 0,
        oyunlar: [],
        rozetler: [],
        ...BOS_DURUM,
      };
      harita.set(cafeId, k);
    }
    return k;
  };

  for (const s of seviyeler) Object.assign(kart(s.cafeId, s.cafeAdi), s);

  for (const g of gecmis) {
    const k = kart(g.cafeId, g.cafeAdi);
    k.toplamOyun = g.toplamOyun;
    k.oyunlar = g.oyunlar;
  }

  for (const r of rozetler) {
    if (!r.cafeId) continue;
    kart(r.cafeId, r.cafeAdi ?? "").rozetler.push(r);
  }

  /*
    ⚠️ Durum kart AÇMIYOR, yalnızca var olanı dolduruyor. Puanı olup
    seviyesi, geçmişi ve rozeti olmayan bir kafe olamaz: puan da XP de
    aynı oyun turundan doğuyor. Buradan kart açmak, olmayan bir hâli
    kurtarmaya çalışan ölü kod olurdu.
  */
  for (const [cafeId, d] of durumlar) {
    const k = harita.get(cafeId);
    if (k) Object.assign(k, d);
  }

  return [...harita.values()].sort(
    (a, b) => b.xp - a.xp || b.toplamOyun - a.toplamOyun || b.rozetler.length - a.rozetler.length,
  );
}

/**
 * Kafe başına puan, kupon ve seri — hepsi ÜÇ sorguda.
 *
 * ⚠️ Kafe başına döngü YOK ve bu ölçülebilir bir tercih: oyuncunun on
 * kafesi varsa döngü otuz gidiş-dönüş, bu üç. Profil tek ekranda bütün
 * kafeleri gösteriyor, yani en kötü hâl olağan hâl.
 *
 * ⚠️ Seri kuralı burada YENİDEN YAZILMIYOR — günler çekiliyor ve
 * `seri.seriyiSay` çağrılıyor. Kuralın ikinci bir kopyası olsaydı ana
 * ekran ile profil farklı seri gösterebilirdi (Ü144'ün aynısı).
 *
 * `withBypass`: üç sorgu da `player_id` ile açıkça süzülüyor ve profil
 * kafe panelinden de okunabiliyor — orada bağlam oyuncu değil.
 */
export async function kafeDurumlari(playerId: string): Promise<Map<string, KafeDurumu>> {
  const bugun = isGunu();

  /*
    🔴 Üç sorgu SIRAYLA, `Promise.all` ile DEĞİL.

    İlk yazılışta üçü `Promise.all` içindeydi ve `pg` uyardı: *"calling
    client.query() when the client is already executing a query."* Tek
    bir bağlantı üzerinde eşzamanlı sorgu güvenli değil — aynı soket
    üzerinden ikinci istek birincinin cevabına karışabiliyor.

    ⚠️ Paralel istenecekse üç AYRI `withBypass` gerekir, yani üç
    bağlantı ve üç bağlam kurulumu. Sorgular zaten indeksli ve küçük;
    sıralı gitmek, havuzdan iki bağlantı daha almaktan ucuz.
  */
  const { puanlar, kuponlar, gunler } = await withBypass("profil — kafe durumu", async (db) => {
    const puanlar = await db.all<{ cafe_id: string; toplam: string }>(
      `SELECT cafe_id, COALESCE(sum(delta), 0) AS toplam
         FROM points_ledger WHERE player_id = $1 GROUP BY cafe_id`,
      [playerId],
    );
      /*
        ⚠️ "Elde duran" ZAMANA bakıyor, yalnızca `status`e değil — Ü144.
        Penceresi açılmış ama bakım işi henüz dokunmamış (`pending`)
        kupon da kullanılabilir; kolona bakılsaydı profil ile Ödüllerim
        farklı sayı gösterirdi.

        ⚠️ `undone` (geri alınmış) hiçbir sayıya girmiyor: kazanılmamış
        sayılıyor, çünkü işlem iptal edilmiş.
      */
    const kuponlar = await db.all<{
      cafe_id: string;
      toplam: string;
      elde: string;
      kullanilan: string;
    }>(
      `SELECT cafe_id,
              count(*) FILTER (WHERE status <> 'undone')            AS toplam,
              count(*) FILTER (WHERE status IN ('pending','active')
                                 AND activates_at <= now()
                                 AND expires_at   >  now())          AS elde,
              count(*) FILTER (WHERE status = 'redeemed')            AS kullanilan
         FROM coupons WHERE player_id = $1 GROUP BY cafe_id`,
      [playerId],
    );

    const gunler = await db.all<{ cafe_id: string; gun: string }>(
      `SELECT cafe_id, gun FROM (
         SELECT DISTINCT cafe_id, business_date::text AS gun,
                row_number() OVER (PARTITION BY cafe_id
                                   ORDER BY business_date DESC) AS sira
           FROM play_sessions
          WHERE player_id = $1 AND status = 'completed'
            AND business_date <= $2::date
       ) t WHERE sira <= $3`,
      [playerId, bugun, EN_UZUN_BAKIS],
    );

    return { puanlar, kuponlar, gunler };
  });

  const harita = new Map<string, KafeDurumu>();
  const al = (cafeId: string) => {
    let d = harita.get(cafeId);
    if (!d) {
      d = { ...BOS_DURUM };
      harita.set(cafeId, d);
    }
    return d;
  };

  for (const r of puanlar) al(r.cafe_id).puan = Number(r.toplam);
  for (const r of kuponlar) {
    const d = al(r.cafe_id);
    d.kuponToplam = Number(r.toplam);
    d.kuponElde = Number(r.elde);
    d.kuponKullanilan = Number(r.kullanilan);
  }

  const gunKumeleri = new Map<string, Set<string>>();
  for (const r of gunler) {
    let k = gunKumeleri.get(r.cafe_id);
    if (!k) gunKumeleri.set(r.cafe_id, (k = new Set()));
    k.add(r.gun);
  }
  for (const [cafeId, k] of gunKumeleri) al(cafeId).seri = seriyiSay(k, bugun);

  return harita;
}

export async function karne(playerId: string): Promise<Karne> {
  const [seviyeler, rozetler, gecmis, durumlar] = await Promise.all([
    tumKafeler(playerId),
    oyuncununRozetleri(playerId),
    kafeBazli(playerId),
    kafeDurumlari(playerId),
  ]);

  return {
    kafeler: birlestir(seviyeler, gecmis, rozetler, durumlar),
    globalRozetler: rozetler.filter((r) => r.kapsam === "global"),
  };
}
