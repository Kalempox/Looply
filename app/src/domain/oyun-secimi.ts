import { withCafe, withBypass, type Db } from "@/db/context";
import { audit } from "@/lib/audit";
import { OYUNLAR, gununOyunu, type HerhangiOyun } from "@/oyunlar";
import { isGunu } from "@/lib/tarih";
import { isletmeTuruDb } from "@/domain/cark-kosul";

/**
 * Kafe oyun yönetimi — Ü109.
 *
 * Kapsam belgesinin §17'si: *"kafe hangi oyunu açar/kapatır."* Bugüne
 * kadar dört oyun da her kafede zorunluydu.
 *
 * ── Neden bir kafe oyunu kapatmak istesin ───────────────────
 *
 * Oyunlar farklı şeyler istiyor: Kelime okuma-yazma ve dikkat, Yılan
 * refleks. Çocuk ağırlıklı bir kafe Kelime'yi kapatmak, sessiz çalışma
 * kafesi Yılan'ı kapatmak isteyebilir. Bu bir ekonomi kararı değil,
 * mekânın kendi kararı — Ü35'in "kafeye ait olan kafeye" hattı.
 *
 * ── ⚠️ Satırın yokluğu = oyun AÇIK ──────────────────────────
 *
 * Tablo kafenin **kapattığı** oyunları tutuyor. Tersi olsaydı yeni bir
 * oyun eklendiğinde hiçbir kafede görünmez ve 500 kafenin panele girip
 * onu açması gerekirdi.
 *
 * ── ⚠️ GÜNÜN OYUNU kafeye göre seçiliyor ────────────────────
 *
 * Asıl incelik burada. `gununOyunu` tarihten türeyen platform çapında bir
 * seçimdi. Kafe o günün oyununu kapattıysa, dokunulmadan bırakılsaydı:
 *
 *   · bonuslu oyun oynanamaz, ×2 çarpan o gün ölürdü,
 *   · liderlik tablosu kimsenin oynayamadığı bir oyunu listelerdi,
 *   · günün görevi (*"Yılan'da 1.200 skor"*) **imkânsız** olurdu.
 *
 * Bu yüzden rotasyon kafenin **açık listesi** üzerinde dönüyor. Aynı gün
 * iki kafede farklı bir bonus oyunu olabiliyor ve bu doğru: bonus,
 * kafenin kendi müşterisine verdiği bir şey.
 */

/**
 * Kafenin kapattığı oyun kimlikleri — var olan bir işlemin içinde.
 *
 * ⚠️ Süzgeç SQL'de **açıkça** `cafe_id = $1`. Bu sorgu hem kafe
 * bağlamından hem oyuncu bağlamından çağrılıyor; politikaya
 * güvenmiyor, bağlam gevşedi diye sorgu gevşemiyor (`xp.tumKafeler`
 * ile aynı gerekçe).
 */
export async function kapaliIdlerIle(db: Db, cafeId: string): Promise<Set<string>> {
  const satirlar = await db.all<{ game_id: string }>(
    `SELECT game_id FROM cafe_game_settings WHERE cafe_id = $1 AND closed`,
    [cafeId],
  );
  return new Set(satirlar.map((r) => r.game_id));
}

/**
 * Kafede açık oyunlar — kayıt defterindeki sırayla.
 *
 * Kafe yoksa (kafe dışında oynayan oyuncu) bütün oyunlar açık: Ü3
 * oynamayı serbest bırakıyor, yalnızca kazanımı kapatıyor.
 *
 * `withBypass`: oyuncu ekranlarından da çağrılıyor ve oyuncu bağlamında
 * `cafe_game_settings` üzerinde politika yok. Süzgeç yukarıda, SQL'in
 * içinde.
 */
export async function acikOyunlar(cafeId: string | null): Promise<readonly HerhangiOyun[]> {
  if (!cafeId) return OYUNLAR;
  const kapali = await withBypass("kafenin kapalı oyunları", (db) =>
    kapaliIdlerIle(db, cafeId),
  );
  return suz(kapali);
}

/**
 * Kapalı kümesinden açık listeyi üretir.
 *
 * ⚠️ **Hepsi kapalıysa liste boşalmıyor, kayıt defteri dönüyor.** Bu bir
 * savunma katmanı: `degistir` son oyunun kapatılmasını zaten reddediyor,
 * ama veri elle bozulursa (ya da kayıt defterinden oyun kalkarsa) ürün
 * sessizce ölmemeli. Boş liste "oynanacak oyun yok" ekranı demek ve o
 * ekran hiçbir zaman doğru cevap değil.
 */
export function suz(kapali: Set<string>): readonly HerhangiOyun[] {
  const acik = OYUNLAR.filter((o) => !kapali.has(o.id));
  return acik.length > 0 ? acik : OYUNLAR;
}

/** Bu kafede bu oyun oynanabilir mi? */
export async function acikMi(cafeId: string | null, oyunId: string): Promise<boolean> {
  const liste = await acikOyunlar(cafeId);
  return liste.some((o) => o.id === oyunId);
}

/**
 * Kafenin bugünkü bonuslu oyunu.
 *
 * `gununOyunu` ile aynı gün sayacı, farklı havuz. İki kafede aynı gün
 * farklı bonus oyunu çıkabiliyor — bonus kafenin kendi müşterisine
 * verdiği şey, platformun takvimi değil.
 */
export async function gununOyunuKafede(
  cafeId: string | null,
  gun: string = isGunu(),
): Promise<HerhangiOyun> {
  return gununOyunu(gun, await acikOyunlar(cafeId));
}

/**
 * Aynı hesabın var olan bir işlem içindeki hâli — oyun bitişi için.
 *
 * Ayrı bağlantıdan sorulsaydı, aynı işlemde yazılmış ama henüz commit
 * edilmemiş bir ayar değişikliği görülmezdi.
 */
export async function gununOyunuIle(
  db: Db,
  cafeId: string | null,
  gun: string = isGunu(),
): Promise<HerhangiOyun> {
  if (!cafeId) return gununOyunu(gun);
  return gununOyunu(gun, suz(await kapaliIdlerIle(db, cafeId)));
}

/** Panelin listesi: her oyun ve açık mı. */
export type OyunSatiri = {
  id: string;
  ad: string;
  ozet: string;
  acik: boolean;
  /** Son 7 günde bu kafede kaç kez oynandı — kapatmadan önce görülmeli. */
  oyun: number;
};

export async function panelListesi(cafeId: string): Promise<OyunSatiri[]> {
  const [kapali, sayimlar] = await Promise.all([
    withCafe(cafeId, (db) => kapaliIdlerIle(db, cafeId)),
    withCafe(cafeId, (db) =>
      db.all<{ game_id: string; n: string }>(
        `SELECT game_id, count(*)::text AS n
           FROM play_sessions
          WHERE status = 'completed'
            AND business_date > (CURRENT_DATE - 7)
          GROUP BY game_id`,
      ),
    ),
  ]);

  const sayac = new Map(sayimlar.map((r) => [r.game_id, Number(r.n)]));

  return OYUNLAR.map((o) => ({
    id: o.id,
    ad: o.ad,
    ozet: o.ozet,
    acik: !kapali.has(o.id),
    oyun: sayac.get(o.id) ?? 0,
  }));
}

export type OyunSonucu = { ok: true } | { ok: false; hata: string };

/**
 * Bir oyunu açar veya kapatır.
 *
 * ⚠️ **Son açık oyun kapatılamıyor.** Kafe bütün oyunları kapatabilseydi
 * karekodu okutan müşteri boş bir ekranla karşılaşır ve ürün o kafede
 * sessizce ölürdü — kafe de bunu ancak müşteri şikâyet edince anlardı.
 * Ekranı boş bırakmak bir tercih değil, bir arıza.
 *
 * ⚠️ **Kapatmak silmek değil**, `closed = true`. 0001'in kuralı: hiçbir
 * kayıt uygulama tarafından silinmiyor, durum değişikliğiyle
 * işaretleniyor. Yeniden açmak da aynı satırı `false` yapıyor.
 *
 * ⚠️ **Butikte oyun yönetimi yok ve bu kapı burada** (Ü137). Panelin
 * menüsü butikte "Oyunlar" durağını göstermiyor, ama menüden gizlemek bir
 * denetim değil: adres çubuğuna yolu elle yazan biri formu görürdü.
 * Butiğin oyun ayarı yazması anlamsız değil, **yanıltıcı** olurdu — ayar
 * kaydedilir, hiçbir şeyi etkilemez ve işletme oyun açtığını sanır.
 */
export async function degistir(opts: {
  cafeId: string;
  oyunId: string;
  acik: boolean;
  aktorId: string;
}): Promise<OyunSonucu> {
  if (!OYUNLAR.some((o) => o.id === opts.oyunId)) {
    return { ok: false, hata: "Böyle bir oyun yok." };
  }

  return withCafe(opts.cafeId, async (db) => {
    if ((await isletmeTuruDb(db, opts.cafeId)) === "butik") {
      return {
        ok: false as const,
        hata: "Butik kipinde oyun yok — müşteri çark hakkını kasadan alıyor, oyundan değil.",
      };
    }

    if (!opts.acik) {
      const kapali = await kapaliIdlerIle(db, opts.cafeId);
      kapali.add(opts.oyunId);
      if (OYUNLAR.every((o) => kapali.has(o.id))) {
        return {
          ok: false as const,
          hata: "En az bir oyun açık kalmalı. Kapatırsan müşteri okutunca oynayacak bir şey bulamaz.",
        };
      }
    }

    await db.query(
      `INSERT INTO cafe_game_settings (cafe_id, game_id, closed, updated_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (cafe_id, game_id)
       DO UPDATE SET closed = EXCLUDED.closed,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = now()`,
      [opts.cafeId, opts.oyunId, !opts.acik, opts.aktorId],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: opts.acik ? "game.enable" : "game.disable",
      targetType: "game",
      targetId: opts.oyunId,
    });

    return { ok: true as const };
  });
}

