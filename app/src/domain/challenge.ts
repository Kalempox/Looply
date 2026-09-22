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
  /** `tur` ve `cesit` görevlerinde sabit hedef. */
  hedef?: number;
  /** `skor` görevinde oyunun `gunlukHedef`inin yüzdesi — Ü245. */
  oran?: number;
  xp: number;
};

/**
 * ⚠️ Havuzun boyu, oyun sayısıyla **aralarında asal olmak zorunda.**
 *
 * Günün oyunu da günün görevi de aynı gün sayacından türüyor. Boylar ortak
 * bir bölene sahip olsaydı (örneğin ikisi de 4) her oyuna hep aynı görev
 * düşerdi: "Yılan günü" sonsuza kadar "1.200 skor" olurdu ve iki rotasyon
 * varmış gibi görünen tek bir rotasyon kalırdı.
 *
 * ── 🔴 Ü235: tam da öngörüldüğü gibi bozuldu ────────────────
 *
 * Buradaki not *"beşinci oyun eklendiğinde bu sessizce bozulur"* diyordu
 * ve Bıçak eklenince havuz 5, oyun 5 oldu: OBEB 5. `challenge.test.ts`
 * yakaladı — ekranda hiçbir şey görünmezdi, yalnızca her oyun hep aynı
 * görevle eşleşirdi.
 *
 * Havuz altıya çıktı (`cesit3`): OBEB(6, 5) = 1, döngü 30 gün.
 *
 * ── 🔴 Ü244: ikinci kez, tam da öngörüldüğü gibi ────────────
 *
 * Yukarıdaki not *"6 oyunda OBEB 6"* diyordu ve Blok Kırıcı eklenince
 * tam o oldu. Havuz yediye çıktı (`tur4`): OBEB(7, 6) = 1, döngü 42
 * gün.
 *
 * ── 🔴 Ü259: ÜÇÜNCÜ kez, yine öngörüldüğü gibi ─────────────
 *
 * Yukarıdaki not *"7 oyunda OBEB 7"* diyordu ve 2048 eklenince tam o
 * oldu. Havuz sekize çıktı (`cesit4`): OBEB(8, 7) = 1, döngü 56 gün.
 *
 * ⚠️ Kalan iki oyun eklenirken bu **yine** bakılacak: 8 oyunda OBEB 8,
 * 9'da 1. Sabit bir havuz boyu bu sorunu çözmüyor; testi görmezden
 * gelmemek çözüyor — üç kez o test yakaladı.
 */
const HAVUZ: readonly Tanim[] = [
  { id: "skorIyi", tur: "skor", oran: 60, xp: 60 },
  { id: "tur2", tur: "tur", hedef: 2, xp: 60 },
  { id: "cesit2", tur: "cesit", hedef: 2, xp: 75 },
  { id: "skorZor", tur: "skor", oran: 100, xp: 90 },
  { id: "tur3", tur: "tur", hedef: 3, xp: 90 },
  /* Beş oyunla "üç farklı oyun" rahat bir hedef; dört oyunluk katalogda
     havuzun dörtte üçünü istemek olurdu. Oyun sayısı arttıkça yeri var. */
  { id: "cesit3", tur: "cesit", hedef: 3, xp: 100 },
  /* Ü244: yedinci görev **OBEB için** eklendi, denge için değil —
     altı oyunla altı görev OBEB 6 demekti. Dört tur, altı oyunluk bir
     katalogda hâlâ tek oturumda yapılabilecek bir şey.

     ⚠️ XP 110 yazılmıştı ve `challenge.test.ts` düşürdü: tavan 100 ve
     gerekçesi ayrı bir kural — bir bonuslu oyun 100 XP veriyor,
     görev ondan fazla verirse oynamak yerine **görevi beklemek**
     kârlı olur. Dört turluk görev havuzun en uzunu ama tavan tavandır. */
  /* Ü262: onuncu görev, yine **OBEB için** — Bağla ile oyun dokuza
     çıktı ve havuz da dokuzdu. Onda OBEB(10,9) = 1, döngü 90 gün.

     ⚠️ Oran 80: `skorIyi` (60) ile `skorZor` (100) arasındaki boşluğa
     oturuyor, yani yeni bir zorluk kademesi değil eksik olan basamak.
     XP 75 — aynı aralıkta (60 ve 90 arasında). */
  { id: "skorOrta", tur: "skor", oran: 80, xp: 75 },
  { id: "tur4", tur: "tur", hedef: 4, xp: 100 },
  /* Ü259: sekizinci görev, yine **OBEB için**. 2048 eklenince oyun
     yedi oldu ve havuz da yediydi: OBEB 7. Sekizde OBEB(8,7) = 1,
     döngü 56 gün.

     ⚠️ Yedi oyunluk katalogda "dört farklı oyun" havuzun yarısından
     az; `cesit3` ile arası bir adım. */
  /* Ü261: dokuzuncu görev, yine **OBEB için**. Ayır eklenince oyun
     sekiz oldu ve havuz da sekizdi: OBEB 8 — yani her oyuna hep aynı
     görev düşerdi. Dokuzda OBEB(9,8) = 1, döngü 72 gün.

     ⚠️ Neden yine bir **skor** görevi: havuzdaki sekiz görevin altısı
     birden fazla tur istiyor (`tur*`, `cesit*`), yalnızca ikisi tek
     turda bitiyor. Kafede oturan insanın her gün üç tur oynayacak
     vakti yok; tek turluk görevlerin payı üçte bire çıktı.

     ⚠️ Oran 130 — `skorZor`un (100) bir adım üstü. Ölçülen tavanlarla
     uyumlu: Ayır'da iyi oyuncu 540, kusursuz 700 alıyor ve 130% = 702
     tam o sınırda duruyor. XP yine 100, tavan (bkz. `tur4` notu). */
  { id: "skorUsta", tur: "skor", oran: 130, xp: 100 },
  { id: "cesit4", tur: "cesit", hedef: 4, xp: 100 },
];

/**
 * Skor görevinin varsayılan ölçeği — oyun `gunlukHedef` vermezse.
 *
 * ⚠️ 2.000, bugüne kadarki sabit hedefin kendisi: tanımlamayan
 * oyunlar için davranış **değişmiyor**. Bugün Blok, Düşen ve Yılan
 * bu durumda ve üçünün tavanı ölçülmedi (`docs/23`, açık madde).
 */
export const VARSAYILAN_HEDEF = 2000;

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
    case "skor": {
      /*
        🔴 Hedef oyunun kendi ölçeğinden türüyor — Ü245.

        Sabit sayı bazı oyunlarda imkânsız, bazılarında bedavaydı;
        gerekçesi ve ölçümü `sozlesme.gunlukHedef`te yazılı. Sayı
        okunabilir olsun diye 50'nin katına yuvarlanıyor —
        *"1.140 skor"* diyen bir görev uydurulmuş görünür.
      */
      const taban = oyun.gunlukHedef ?? VARSAYILAN_HEDEF;
      const hedef = Math.round((taban * (t.oran ?? 100)) / 100 / 50) * 50;
      return {
        ...t,
        hedef,
        oyunId: oyun.id,
        baslik: `${oyun.ad}'da ${hedef.toLocaleString("tr-TR")} skor`,
        aciklama: `Bugün ${oyun.ad} oynayıp ${hedef.toLocaleString(
          "tr-TR",
        )} skora ulaş.`,
      };
    }
    case "tur":
      return {
        ...t,
        hedef: t.hedef ?? 1,
        oyunId: null,
        baslik: `${t.hedef} tur oyna`,
        aciklama: `Bugün bu kafede ${t.hedef} oyun tamamla. Hangi oyun olduğu fark etmiyor.`,
      };
    case "cesit": {
      /*
        🔴 Hedef, kafenin AÇIK oyun sayısını geçemez — Ü235.

        Kafe oyun kapatabiliyor (Ü109) ve kuralın tek sınırı *"en az
        bir oyun açık kalmalı"* (`oyun-secimi.ts`). Yani iki oyun açık
        bırakan bir kafede *"3 farklı oyun"* **tamamlanması imkânsız**
        bir görev olurdu: oyuncu bütün günü oynasa da ilerleme 2'de
        kalır ve XP hiç yazılmaz.

        ⚠️ Bu delik `cesit3` ile açılmadı, `cesit2` ile zaten vardı:
        tek oyun bırakan kafede o da imkânsızdı. Görülmemiş olması
        yalnızca kimsenin dört oyundan üçünü kapatmamış olması.

        ⚠️ Havuz verilmezse (kafe bilinmiyor) tam katalog varsayılıyor
        — `gununOyunu` ile aynı tercih.

        ⚠️ Tek oyun açıksa hedef 1'e iniyor ve görev *"1 farklı oyun"*
        diyor. Tuhaf bir cümle ama doğru ve tamamlanabilir; oyun
        çeşidi olmayan bir kafede çeşit görevinin söyleyebileceği
        başka bir şey yok.
      */
      const acik = havuz && havuz.length > 0 ? havuz.length : OYUNLAR.length;
      const hedef = Math.min(t.hedef ?? 1, acik);
      return {
        ...t,
        hedef,
        oyunId: null,
        baslik: `${hedef} farklı oyun`,
        aciklama: `Bugün bu kafede ${hedef} farklı oyun dene.`,
      };
    }
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
