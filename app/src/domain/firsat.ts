import { withCafe } from "@/db/context";

/**
 * "Buradaki fırsatlar" — oyuncunun **şu an bulunduğu** kafenin aktif
 * ödül kataloğu ve yüzde kampanyaları.
 *
 * `cafeId` her zaman doğrulanmış masa oturumundan gelir, istekten değil
 * (07-uretim-plani.md değişmez kural #3). Bu yüzden burada `withCafe`
 * kullanılabiliyor: kiracı süzgeci gerçek RLS politikasıyla çalışıyor,
 * bypass'a gerek kalmıyor.
 *
 * **Gösterilmeyenler:**
 * - Ödülün kafeye maliyeti (`cost_kurus`) — kafenin ticari verisi
 * - Yüzde kampanyasının TL tavanı (Ü17) — E9: oyuncu TL değeri görmez
 *
 * Gösterilen puan fiyatı ise oyuncunun ödeyeceği şey; onu görmesi şart (E1).
 */

export type KatalogOdulu = {
  id: string;
  baslik: string;
  aciklama: string | null;
  /**
   * Ödülün açılması için gereken kanıt (E6).
   *
   * Oyuncuya TL değeri **gösterilmiyor** (E9); gösterilen tek şey ödülün
   * adı ve onu almak için ne gerektiği. Kanıt kademesi zaten tutardan
   * hesaplandığı için bu satır dolaylı olarak "büyük ödül" diyor —
   * rakamı söylemeden.
   */
  kanitSeviyesi: number;
};

export type YuzdeFirsati = {
  id: string;
  yuzde: number;
  urunAdi: string;
  bitis: Date;
};

export type Firsatlar = {
  oduller: KatalogOdulu[];
  kampanyalar: YuzdeFirsati[];
};

export async function buradakiler(cafeId: string): Promise<Firsatlar> {
  return withCafe(cafeId, async (db) => {
    // Ü52: puanla satın alma kalktı, `points_price` okunmuyor. Sıralama
    // artık değere göre — oyuncu neyin büyük ödül olduğunu görüyor.
    const oduller = await db.all<{
      id: string;
      title: string;
      description: string | null;
      min_proof_level: number;
    }>(
      `SELECT id, title, description, min_proof_level
         FROM rewards
        WHERE active
        ORDER BY cost_kurus, sort_order`,
    );

    // Yayında ve süresi dolmamış kampanyalar.
    //
    // Not: "bugün kaç hakkı kaldı" sayacı burada YOK. Günlük limitin canlı
    // sayımı, kupon üretimiyle birlikte anlamlı — o Faz 6/7 işi. Yanlış
    // sayı göstermektense hiç göstermemek doğru.
    const kampanyalar = await db.all<{
      id: string;
      percent: number;
      ends_at: Date;
      urun_adi: string;
    }>(
      `SELECT pc.id, pc.percent, pc.ends_at, p.name AS urun_adi
         FROM percentage_campaigns pc
         JOIN products p ON p.id = pc.product_id
        WHERE pc.status = 'active' AND pc.starts_at <= now() AND pc.ends_at > now()
        ORDER BY pc.percent DESC`,
    );

    return {
      oduller: oduller.map((r) => ({
        id: r.id,
        baslik: r.title,
        aciklama: r.description,
        kanitSeviyesi: r.min_proof_level,
      })),
      kampanyalar: kampanyalar.map((r) => ({
        id: r.id,
        yuzde: r.percent,
        urunAdi: r.urun_adi,
        bitis: r.ends_at,
      })),
    };
  });
}
