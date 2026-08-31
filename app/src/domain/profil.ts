import { tumKafeler, seviye, sonrakiEsik, ilerlemeYuzde, type KafeSeviyesi } from "./xp";
import { oyuncununRozetleri, type KazanilmisRozet } from "./rozet";
import { kafeBazli, type KafeGecmisi } from "./gecmis";

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

export type KafeKarnesi = KafeSeviyesi & {
  toplamOyun: number;
  sonOyunlar: KafeGecmisi["sonOyunlar"];
  rozetler: KazanilmisRozet[];
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
        sonOyunlar: [],
        rozetler: [],
      };
      harita.set(cafeId, k);
    }
    return k;
  };

  for (const s of seviyeler) Object.assign(kart(s.cafeId, s.cafeAdi), s);

  for (const g of gecmis) {
    const k = kart(g.cafeId, g.cafeAdi);
    k.toplamOyun = g.toplamOyun;
    k.sonOyunlar = g.sonOyunlar;
  }

  for (const r of rozetler) {
    if (!r.cafeId) continue;
    kart(r.cafeId, r.cafeAdi ?? "").rozetler.push(r);
  }

  return [...harita.values()].sort(
    (a, b) => b.xp - a.xp || b.toplamOyun - a.toplamOyun || b.rozetler.length - a.rozetler.length,
  );
}

export async function karne(playerId: string): Promise<Karne> {
  const [seviyeler, rozetler, gecmis] = await Promise.all([
    tumKafeler(playerId),
    oyuncununRozetleri(playerId),
    kafeBazli(playerId),
  ]);

  return {
    kafeler: birlestir(seviyeler, gecmis, rozetler),
    globalRozetler: rozetler.filter((r) => r.kapsam === "global"),
  };
}
