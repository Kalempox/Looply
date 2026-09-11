import { type Db } from "@/db/context";
import { isGunu } from "@/lib/tarih";
import { gununOyunu, OYUNLAR, type HerhangiOyun } from "@/oyunlar";
import { K2 } from "./masa";
import { kapaliIdlerIle, suz } from "./oyun-secimi";

/**
 * Günün görevi — Ü106.
 *
 * ── Neden gerekti ───────────────────────────────────────────
 *
 * "Günün Challenge'ı" diye anılan şey bugüne kadar yalnızca **günün
 * oyunu** idi: sıradaki oyun ×2 puan veriyordu. Bu bir çarpan, bir görev
 * değil. Oyuncuya *"bugün şunu yap"* diyen bir şey yoktu; tamamlanacak
 * ya da kaçırılacak bir şey de yoktu. Çarpan yalnızca zaten oynayanı
 * ödüllendiriyor, kimseyi ikinci tura ya da yarına çağırmıyordu.
 *
 * ── Neden üç tür ────────────────────────────────────────────
 *
 * Üçü farklı davranışı çağırıyor:
 *   · `skor`  → daha iyi oyna (tek tur yeter)
 *   · `tur`   → bir tur daha oyna (aynı ziyaret uzasın)
 *   · `cesit` → başka bir oyun dene (katalog keşfedilsin)
 *
 * Tek tür olsaydı görev her gün aynı şeyi isterdi ve rotasyonun anlamı
 * kalmazdı.
 *
 * ── ⚠️ Reddedilen tür: "ilk üçe gir" ────────────────────────
 *
 * Sıralamaya dayalı bir görev, boş kafede **imkânsız** (kimse yok,
 * sıralama yok) ya da **bedava** (tek oyuncu her zaman birinci). Aynı
 * görev, aynı gün, iki kafede bambaşka bir şey isterdi. Görev yalnızca
 * oyuncunun kendi elindeki şeylere bakmalı.
 *
 * ── ⚠️ Ödül XP, puan değil ──────────────────────────────────
 *
 * Günlük puan tavanı 900 (E4) ve bonuslu oyun tek başına 600 yazıyor;
 * skor eşiği 300'e kadar ekliyor. Görev de puan yazsaydı tavana takılır
 * ve yalnızca **az oynayana** ödeme yapardı — görevi tamamlamaya en
 * yakın kişiye hiçbir şey vermeyen bir görev. XP tavansız ve hiçbir
 * bütçeye dokunmuyor. Göç 0031, gerekçesiyle birlikte.
 *
 * ── Rastgelelik yok ─────────────────────────────────────────
 *
 * Görev tarihten türüyor (`gununOyunu` ile aynı desen): sunucu ve istemci
 * aynı cevabı veriyor, dünün görevi geriye dönük olarak da bilinebiliyor.
 *
 * ── S15 hâlâ açık ───────────────────────────────────────────
 *
 * Görevi platform seçiyor, kafe değil — `gununOyunu` ile aynı tercih ve
 * aynı açık soru. Kafeye bırakmak, günlük görevin kafe panelinde
 * yönetilmesi demek ve o ayrı bir madde.
 */

export type ChallengeTuru = "skor" | "tur" | "cesit";

type Tanim = {
  id: string;
  tur: ChallengeTuru;
  hedef: number;
  xp: number;
};

/**
 * ⚠️ Havuzun boyu, oyun sayısıyla **aralarında asal olmak zorunda.**
 *
 * Günün oyunu da günün görevi de aynı gün sayacından türüyor. Boylar ortak
 * bir bölene sahip olsaydı (örneğin ikisi de 4) her oyuna hep aynı görev
 * düşerdi: "Yılan günü" sonsuza kadar "1.200 skor" olurdu ve iki rotasyon
 * varmış gibi görünen tek bir rotasyon kalırdı. Beşinci oyun eklendiğinde
 * bu sessizce bozulur — `tests/challenge.test.ts` onu bekliyor.
 */
const HAVUZ: readonly Tanim[] = [
  { id: "skor1200", tur: "skor", hedef: 1200, xp: 60 },
  { id: "tur2", tur: "tur", hedef: 2, xp: 60 },
  { id: "cesit2", tur: "cesit", hedef: 2, xp: 75 },
  { id: "skor2000", tur: "skor", hedef: 2000, xp: 90 },
  { id: "tur3", tur: "tur", hedef: 3, xp: 90 },
];

export const HAVUZ_BOYU = HAVUZ.length;

export type Challenge = {
  id: string;
  tur: ChallengeTuru;
  hedef: number;
  xp: number;
  baslik: string;
  aciklama: string;
  /** `skor` görevinde hangi oyun — ilerleme sorgusu buna bakıyor. */
  oyunId: string | null;
};

/** Gün sayacı — `gununOyunu` ile birebir aynı hesap. */
function gunSayaci(gunIso: string): number {
  return Math.floor(Date.parse(`${gunIso}T00:00:00Z`) / 86_400_000);
}

/**
 * Günün görevi.
 *
 * ⚠️ `havuz` (Ü109): kafe oyun kapatabiliyor ve `skor` görevi **günün
 * oyununa** bağlı. Havuz verilmezse kafenin kapattığı oyun görev olarak
 * çıkabilir — *"Yılan'da 1.200 skor"* diyen ama Yılan'ı oynatmayan bir
 * kafe, tamamlanması imkânsız bir görev göstermiş olur.
 */
export function gununGorevi(
  gunIso: string = isGunu(),
  havuz?: readonly HerhangiOyun[],
): Challenge {
  const t = HAVUZ[gunSayaci(gunIso) % HAVUZ.length];
  // Rotasyon hesabı `gununOyunu`nun içinde, tek yerde: burada tekrarlansaydı
  // biri değiştiğinde görev ile bonuslu oyun sessizce ayrışırdı.
  const oyun = gununOyunu(gunIso, havuz);

  switch (t.tur) {
    case "skor":
      return {
        ...t,
        oyunId: oyun.id,
        baslik: `${oyun.ad}'da ${t.hedef.toLocaleString("tr-TR")} skor`,
        aciklama: `Bugün ${oyun.ad} oynayıp ${t.hedef.toLocaleString(
          "tr-TR",
        )} skora ulaş.`,
      };
    case "tur":
      return {
        ...t,
        oyunId: null,
        baslik: `${t.hedef} tur oyna`,
        aciklama: `Bugün bu kafede ${t.hedef} oyun tamamla. Hangi oyun olduğu fark etmiyor.`,
      };
    case "cesit":
      return {
        ...t,
        oyunId: null,
        baslik: `${t.hedef} farklı oyun`,
        aciklama: `Bugün bu kafede ${t.hedef} farklı oyun dene.`,
      };
  }
}

export type Ilerleme = {
  gorev: Challenge;
  /** Şu ana kadar ulaşılan değer — skor, tur sayısı ya da çeşit sayısı. */
  mevcut: number;
  tamam: boolean;
  /** Bugünün XP'si daha önce yazıldı mı? */
  yazildi: boolean;
};

/**
 * Görevin bugünkü durumu.
 *
 * ⚠️ Yalnızca **kafede** oynanan turlar sayılıyor (`proof_mask & K2`, Ü3).
 * Dışarıda oynanan tur puan ve XP kazandırmıyor; göreve saydırsaydık
 * kapıdan geri çevrilen kazanç görev üzerinden içeri girerdi.
 *
 * ⚠️ Yarım bırakılan tur da **sayılmıyor** (`status = 'completed'`): aksi
 * hâlde "3 tur oyna" görevi, üç kez başlayıp hemen çıkmakla tamamlanırdı —
 * en ucuz çiftlik yolu görevin kendisi olurdu.
 */
export async function ilerleme(
  db: Db,
  opts: { playerId: string; cafeId: string; gun?: string },
): Promise<Ilerleme> {
  const gun = opts.gun ?? isGunu();
  // Ü109: görev kafenin AÇIK oyunları üzerinden kuruluyor. Aynı işlemin
  // içinden okunuyor — panelden az önce kapatılmış bir oyun da görülsün.
  const gorev = gununGorevi(gun, suz(await kapaliIdlerIle(db, opts.cafeId)));

  // Üç görev türü de aynı satır kümesine bakıyor; yalnızca ölçtükleri şey
  // farklı. Tek sorgu, üç sayı: türe göre ayrı sorgu yazmak aynı süzgeci
  // (kafede + tamamlanmış) üç kez yazmak olurdu.
  const r = await db.one<{ en_yuksek: string; tur: string; cesit: string }>(
    `SELECT COALESCE(max(server_score) FILTER (WHERE game_id = $4), 0)::text AS en_yuksek,
            count(*)::text                                                  AS tur,
            count(DISTINCT game_id)::text                                   AS cesit
       FROM play_sessions
      WHERE player_id = $1 AND cafe_id = $2
        AND business_date = $3::date
        AND status = 'completed'
        AND (proof_mask & $5) <> 0`,
    [opts.playerId, opts.cafeId, gun, gorev.oyunId ?? "", K2],
  );

  const mevcut =
    gorev.tur === "skor"
      ? Number(r?.en_yuksek ?? 0)
      : gorev.tur === "tur"
        ? Number(r?.tur ?? 0)
        : Number(r?.cesit ?? 0);

  return {
    gorev,
    mevcut,
    tamam: mevcut >= gorev.hedef,
    yazildi: await bugunYazildiMi(db, { ...opts, gun }),
  };
}

/**
 * Bugünün görev XP'si daha önce yazıldı mı?
 *
 * Tek kayıt yeri defterin kendisi — seri (Ü54) ile aynı tercih. Ayrı bir
 * bayrak kolonu, defterle ayrışabilecek ikinci bir gerçek olurdu.
 *
 * ⚠️ Bu kontrol yarışa karşı tek başına yeterli değil; asıl güvence göç
 * 0031'deki tekil indeks. Buradaki kontrolün işi ekrana "zaten aldın"
 * diyebilmek — kullanıcıya veritabanı hatası göstermemek.
 */
export async function bugunYazildiMi(
  db: Db,
  opts: { playerId: string; cafeId: string; gun?: string },
): Promise<boolean> {
  const r = await db.one(
    `SELECT 1 FROM xp_ledger
      WHERE player_id = $1 AND cafe_id = $2
        AND business_date = $3::date AND source_type = 'CHALLENGE'
      LIMIT 1`,
    [opts.playerId, opts.cafeId, opts.gun ?? isGunu()],
  );
  return !!r;
}

/** Oyun sayısı — rotasyon testinin okuduğu değer. */
export const OYUN_SAYISI = OYUNLAR.length;
