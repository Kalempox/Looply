import { withBypass } from "@/db/context";
import { oyunBul } from "@/oyunlar";

/**
 * Kafe bazlı oyun **karnesi** — "bu kafede hangi oyunu kaç kez oynadım,
 * rekorum ne, en son ne zaman."
 *
 * ── 🔴 Kütük değil karne — Ü192 ─────────────────────────────
 *
 * Bu dosya Ü20'den beri **son on oturumu** döndürüyordu ve profil onu
 * satır satır basıyordu: `Blok · 16 Eyl · 1172`, altında `Düşen · 14
 * Eyl · 1385`, altında `Yılan · 13 Eyl · 1583`… Ürün sahibi profile
 * bakıp *"içeriğini düzeltmemişsin"* dedi ve liste ölçülünce haklılığı
 * görülüyor: 18 oynanmış oyunun 10 satırı ekranın en uzun bloğuydu,
 * dördü aynı oyunun tekrarıydı ve hiçbiri oyuncunun bilmediği bir şey
 * söylemiyordu. Kendi oynadığı oyunun tarihini zaten biliyor.
 *
 * Oyuncunun bilmediği şey **rekoru**. Aynı 18 oturum oyun başına
 * toplanınca dört satır kalıyor ve her satır bir cevap veriyor: bu
 * oyunu kaç kez bitirdim, en iyim kaç, en son ne zaman.
 *
 * ⚠️ `KAFE_BASINA` limiti bu yüzden KALKTI, unutulmadı. Limit kütüğün
 * sonsuz uzamasını engellemek içindi; karnenin satır sayısı zaten
 * katalogdaki oyun sayısıyla sınırlı (bugün dört). Sınırı korumak,
 * "11. oyunu oynayanın rekoru görünmesin" demek olurdu.
 *
 * Yalnızca **tamamlanmış** oturumlar sayılıyor: yarıda bırakılan veya
 * reddedilen oyun karneye girmez, çünkü oyuncunun sorduğu soru "ne
 * oynadım" değil "ne bitirdim".
 *
 * Skor sunucunun hesapladığı skordur (`server_score`); istemciden gelen
 * `claimed_score` ekrana hiç çıkmaz — o yalnızca denetim için saklanıyor
 * (S5, Faz 5 güvenlik kapısı). Rekor ekranda duran bir sayı olduğu için
 * bu ayrım burada daha da önemli: `claimed_score`tan beslenen bir
 * "en iyi", oyuncunun kendi gönderdiği sayıyı ona rekor diye geri
 * satmak olurdu.
 *
 * `withBypass` gerekçesi `xp.tumKafeler` ile aynı: kafe adı `cafes`'ten
 * geliyor ve orada oyuncu politikası yok. Süzgeç SQL'de açık.
 */

/**
 * Sistemden çıkarılmış oyunların adları — Ü208.
 *
 * ── Neden gerekiyor ─────────────────────────────────────────
 *
 * Kelime kaldırıldığında `play_sessions` içinde **352 tamamlanmış tur**
 * duruyordu ve silinmediler: oyuncunun oynadığı tur oyun listeden
 * çıktı diye olmamış sayılamaz — skoru, XP'si ve kuponu gerçekti.
 *
 * `oyunBul` artık o kimliği tanımıyor ve yedek ham kimliğe düşüyordu:
 * profil karnesinde oyunun adı **"kelime"** diye, küçük harfle ve
 * ürünün dilinin dışında görünürdü. Bu harita o tek satırı kurtarıyor.
 *
 * ⚠️ Burası bir **mezar taşı listesi**, bir kayıt defteri değil. Yeni
 * oyun buraya yazılmaz; yalnızca kaldırılan bir oyunun adı eklenir ve
 * bir daha çıkarılmaz — çıkarıldığı gün eski turlar ham kimliğe döner.
 */
const EMEKLI_OYUNLAR: Record<string, string> = {
  kelime: "Kelime",
};

export type OyunKarnesi = {
  oyunId: string;
  oyunAdi: string;
  /** Bu kafede bu oyunu kaç kez bitirdi. */
  kez: number;
  /**
   * En yüksek sunucu skoru.
   *
   * ⚠️ `null` olabilir ve boş sayılmıyor: skoru olmayan oyun türü
   * (yalnızca bitirme) ileride eklenebilir ve `max()` skorsuz
   * oturumlarda `null` döner. Ekran o satırda rekor kutusunu hiç
   * çizmiyor — `0` yazmak "sıfır puan aldın" demekti.
   */
  enIyi: number | null;
  /** En son ne zaman oynandı. */
  son: Date;
};

export type KafeGecmisi = {
  cafeId: string;
  cafeAdi: string;
  /** O kafede tamamlanan toplam oyun sayısı. */
  toplamOyun: number;
  /** Oyun başına tek satır — çok oynanandan aza. */
  oyunlar: OyunKarnesi[];
};

export async function kafeBazli(playerId: string): Promise<KafeGecmisi[]> {
  const satirlar = await withBypass("oyun karnesi — kafe adları", (db) =>
    db.all<{
      cafe_id: string;
      cafe_adi: string;
      game_id: string;
      kez: string;
      en_iyi: number | null;
      son: Date;
      kafe_toplam: string;
    }>(
      /*
        ⚠️ `sum(count(*)) OVER (PARTITION BY cafe_id)` — toplam oyun
        sayısı ikinci bir sorgu istemiyor. Pencere fonksiyonu GROUP
        BY'dan SONRA çalıştığı için `count(*)` burada zaten gruplanmış
        satırın sayısı; pencere onları kafe içinde topluyor.

        Eskiden bu sayı `count(*) OVER (PARTITION BY cafe_id)` idi ve
        gruplama olmadığı için doğrudan satırları sayıyordu. Gruplamadan
        sonra o ifade "kaç FARKLI oyun" derdi — yani 18 yerine 4.
      */
      `SELECT ps.cafe_id, c.name AS cafe_adi, ps.game_id,
              count(*)                                     AS kez,
              max(ps.server_score)                         AS en_iyi,
              max(ps.started_at)                           AS son,
              sum(count(*)) OVER (PARTITION BY ps.cafe_id) AS kafe_toplam
         FROM play_sessions ps
         JOIN cafes c ON c.id = ps.cafe_id
        WHERE ps.player_id = $1 AND ps.status = 'completed'
        GROUP BY ps.cafe_id, c.name, ps.game_id
        ORDER BY kez DESC, son DESC`,
      [playerId],
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
        oyunlar: [],
      };
      kafeler.set(r.cafe_id, kafe);
    }

    const oyun = oyunBul(r.game_id);
    kafe.oyunlar.push({
      oyunId: r.game_id,
      // Listeden kaldırılmış bir oyunun geçmişteki kaydı kaybolmasın.
      oyunAdi: oyun?.ad ?? EMEKLI_OYUNLAR[r.game_id] ?? r.game_id,
      kez: Number(r.kez),
      enIyi: r.en_iyi,
      son: r.son,
    });
  }

  return [...kafeler.values()].sort((a, b) => b.toplamOyun - a.toplamOyun);
}
