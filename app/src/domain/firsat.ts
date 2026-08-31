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
  /** Oyuncunun ödeyeceği puan. Anlık ödülde 0 (E2). */
  puanFiyati: number;
  /** E2: anlık ödül puan istemez — ilk kez oynayan eli boş çıkmasın. */
  anlik: boolean;
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
    const oduller = await db.all<{
      id: string;
      title: string;
      description: string | null;
      points_price: number;
      kind: string;
    }>(
      `SELECT id, title, description, points_price, kind
         FROM rewards
        WHERE active
        ORDER BY kind DESC, sort_order, points_price`,
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
        puanFiyati: r.points_price,
        anlik: r.kind === "instant",
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
