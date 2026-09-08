import { withBypass, withCafe, type Db } from "@/db/context";
import { newId, couponCode } from "@/lib/ids";
import { randomToken } from "@/lib/crypto";
import { log } from "@/lib/log";
import { isGunu } from "@/lib/tarih";
import * as butce from "./butce";
import * as acil from "./acil";
import * as happy from "./happy";
import * as ayar from "./ayar";
import * as cark from "./cark";
import * as kampanya from "./kampanya";
import * as motor from "./odul-motoru";
import { kanitSeviyesi } from "./katalog";
import { idIleBul, odulKilidiBitis, takmaAdIle } from "./player";

/**
 * Kupon — para değerinin gerçek dünyaya çıktığı yer.
 *
 * ── Üç değişmez kural ───────────────────────────────────────
 *
 * 1. **Kuponu "kullanıldı" yapma yetkisi oyuncunun telefonunda değil.**
 *    Tek yazma yolu kasiyer oturumundan geçiyor (A4).
 *
 * 2. **Geçerlilik yalnızca kasiyer ekranında ortaya çıkıyor** (E9).
 *    Oyuncu ekranı ödülün adını gösteriyor; TL değerini ve geçerlilik
 *    damgasını göstermiyor. Süresi dolmuş bir kupon telefonda geçerli
 *    olanla birebir aynı görünüyor — kasiyerin sistemi atlaması böyle
 *    engelleniyor.
 *
 * 3. **Tutar istemciden gelmez.** Rezerve edilen ve düşülen tutar
 *    kayıttan okunuyor.
 *
 * ── İki yol, tek kupon (Ü19) ────────────────────────────────
 *
 * QR jetonu ve 6 haneli kod **aynı kuponu** gösteriyor ve aynı koşullu
 * UPDATE'ten geçiyor. İkisi aynı anda okutulsa bile yalnızca biri kazanıyor.
 */

/**
 * Ü28: bu tutarın üstündeki ödül **12 saat sonra** aktifleşir.
 *
 * ── Neden sabit süre, neden "ertesi gün" değil ──────────────
 *
 * İlk hâli "yarın 00:00" idi ve takvim gününe bağlıydı: sabah 09:00'da
 * kazanan 15 saat, akşam 23:00'te kazanan 1 saat bekliyordu. Aynı kural iki
 * oyuncuya on beş kat farklı davranıyordu. Sabit süre herkese aynı pencereyi
 * veriyor.
 *
 * ⚠️ **Süre Ü97'de 24 → 12 saate indi.** Bir tur 12 saat denenmiş, ürün
 * belgesindeki *"aktifleşme süresi: 24 saat"* cümlesiyle çeliştiği için geri
 * alınmıştı. Ürün sahibi şimdi doğrudan söyledi: *"sistemde hep 12 saat."*
 * Belge ile sahibi çelişiyorsa sahibi kazanır — belge o cümleyi bir örnek
 * olarak yazmıştı, kural olarak değil.
 *
 * ⚠️ Süre artık **oyuncuya söylenmiyor** (Ü97): oyuncu ödülünü biliyor,
 * saatini bilmiyor ve bekleme ekranında bunun yerine bir mizah cümlesi
 * görüyor (`domain/bekleme-metni.ts`). Sayı burada duruyor ve kasiyer
 * ekranında da görünüyor — gizlenen şey oyuncunun beklentisi, sistemin
 * kaydı değil.
 *
 * ── Eşik neden kafenin ayarı ────────────────────────────────
 *
 * Ödül ekonomisi kafeden kafeye değişiyor: 50 TL bir kafede büyük ödül,
 * başkasında sıradan. Eşik `cafe_config` içinde (`domain/ayar.ts`), buradaki
 * sabit yalnızca varsayılan.
 *
 * E6'nın kanıt kademesi bu ayardan **etkilenmiyor** — o platform kuralı ve
 * `katalog.kanitSeviyesi` içinde duruyor.
 */
export const ERTELEME_SAAT = 12;

/** Kupon kaç gün geçerli (docs/06 §10). */
export const GECERLILIK_GUN = 7;

/** Kasiyerin onayı geri alabileceği süre. */
export const GERI_ALMA_SANIYE = 60;

export type KuponSonucu =
  | {
      ok: true;
      kuponId: string;
      kod: string;
      baslik: string;
      ertelendi: boolean;
      /** Ü97: bekleme metni "yarın" mı "bugün" mü diyeceğini buradan biliyor. */
      aktiflesme: Date;
    }
  | { ok: false; hata: string };

/* ── Ortak yazım ───────────────────────────────────────────── */

type OdulSatiri = {
  id: string;
  title: string;
  cost_kurus: string;
  min_proof_level: number;
  reward_type: string;
  percent: number | null;
};

/**
 * Kuponun arkasındaki şey — katalog ödülü ya da yüzde kampanyası.
 *
 * ── Neden tek tip (Ü82) ─────────────────────────────────────
 *
 * `kuponUret` başlangıçta yalnızca `rewards` satırı alıyordu ve kampanya
 * kuponu bu yüzden hiç yazılamadı: `coupons.campaign_id` kolonu şemada
 * vardı, **hiçbir kod ona yazmıyordu.** Kafe kampanya açıyor, panelde
 * görüyor, tek bir oyuncuya ulaşmıyordu (403 ödül kuponuna karşılık 0
 * kampanya kuponu).
 *
 * İki ayrı üretim yolu yazmak yerine ortak alanlar bu tipe çıkarıldı.
 * Kupon yolunun tamamı — bütçe rezervi (E10), kanıt kademesi (E6),
 * erteleme eşiği (Ü28), takma ad (G1), defter — ikisinde de aynı işliyor;
 * ayrılsalardı biri düzeltilirken diğeri geride kalırdı.
 */
type KuponKaynagi = {
  /** `rewards.id` ya da `percentage_campaigns.id`. */
  id: string;
  /**
   * Hangi kolona yazılacağı. Şema **tam olarak birini** istiyor:
   * `CHECK ((reward_id IS NOT NULL) <> (campaign_id IS NOT NULL))`.
   */
  kolon: "reward_id" | "campaign_id";
  /** Oyuncunun göreceği ad. TL yok (E9). */
  baslik: string;
  /** Bütçeden rezerve edilecek tutar. Yüzdede TL tavanı (Ü17). */
  tutarKurus: number;
  /** E6: bu değeri açmak için gereken en düşük kanıt kademesi. */
  enAzKanit: number;
};

/**
 * Kuponu üretir ve bütçeden rezerve eder.
 *
 * Rezervasyon **her zaman değerin tamamı kadar**: ürün ödülünde perakende
 * değeri, yüzdeli ödülde ve kampanyada TL tavanı (Ü17). Tek mantık üç
 * tipte de çalışıyor.
 *
 * Bütçe yetmiyorsa kupon **hiç üretilmiyor** (E10). Kafe hiçbir senaryoda
 * taahhüdünün üstünü ödemiyor.
 */
async function kuponUret(
  db: Db,
  opts: {
    playerId: string;
    cafeId: string;
    kaynakNesnesi: KuponKaynagi;
    kanitSeviyesi: number;
    kaynak: string;
    /** Ö3: kupon bir Happy Hour penceresinde üretildiyse o pencerenin kimliği. */
    happyHourId?: string;
    /** Ü88: kuponu doğuran oyun oturumu. Çark ve kampanyada yok. */
    oturumId?: string;
    /**
     * Ü90: bütçe temposunun okuduğu an. **Yalnızca testler için.**
     *
     * Kafe kapalıyken hiç ödül dağıtılmıyor ve tempo gün içinde kademeli
     * açılıyor; ikisi de duvar saatine bakıyor. Bu, kupon üreten her testi
     * saate mahkûm ediyordu — gece yarısından sonra koşan CI hiçbir kupon
     * üretemiyor ve "bütçe" ya da "kanıt kademesi" sınayan testler
     * sebepsiz düşüyordu. Dikiş `butce.rezerveEt`te zaten vardı; bir
     * seviye yukarı taşındı. Üretimde hiçbir çağıran doldurmuyor.
     */
    an?: Date;
  },
): Promise<KuponSonucu> {
  const tutar = opts.kaynakNesnesi.tutarKurus;

  // E6: ödül değerine göre kanıt. Yetmiyorsa ödül verilmiyor.
  if (opts.kanitSeviyesi < opts.kaynakNesnesi.enAzKanit) {
    return { ok: false, hata: "Bu ödül için daha yüksek doğrulama gerekiyor." };
  }

  // Kafe süzgeci sorguda AÇIKÇA: bu kod `withBypass` içinde koşuyor ve orada
  // RLS kapalı. Süzgeç yalnızca politikada olsaydı başka kafenin dönemi
  // dönerdi ve kupon yanlış kafenin bütçesinden rezerve edilirdi.
  const donem = await db.one<{ id: string }>(
    `SELECT id FROM budget_periods
      WHERE cafe_id = $1 AND period_start <= $2 AND period_end > $2
      ORDER BY period_start DESC LIMIT 1`,
    [opts.cafeId, isGunu()],
  );
  if (!donem) {
    return { ok: false, hata: "Bu kafe henüz bütçesini belirlememiş." };
  }

  const rezerveEdildi = await butce.rezerveEt(db, {
    cafeId: opts.cafeId,
    kurus: tutar,
    an: opts.an,
  });
  if (!rezerveEdildi) {
    // Kafenin bütçesi bittiği için ödül çıkmıyor. Oyuncuya söylenen cümle
    // kafeyi suçlamıyor — oyuncunun yapabileceği bir şey yok.
    return { ok: false, hata: "Bu kafenin bu haftaki ödül bütçesi doldu." };
  }

  // Ü28: eşiğin üstündeki ödül 24 saat sonra aktifleşir; ziyareti geri
  // getiren şey bu. Eşik kafenin ayarı — 50 TL yalnızca varsayılan.
  const esik = await ayar.sayiOku(opts.cafeId, ayar.ANAHTARLAR.ertelemeEsigi);
  const ertelendi = tutar > esik;
  const simdi = Date.now();
  const aktiflesme = new Date(simdi + (ertelendi ? ERTELEME_SAAT * 3_600_000 : 0));
  const sonKullanim = new Date(aktiflesme.getTime() + GECERLILIK_GUN * 86_400_000);

  const kuponId = newId("kpn");
  const kod = couponCode();
  const jeton = randomToken(24);

  // İki kimlik kolonundan biri dolu, diğeri NULL — hangisi olduğunu
  // `kolon` söylüyor. Kolon adını SQL'e gömmek yerine iki parametre
  // gönderiliyor: şemadaki CHECK zaten "tam olarak biri" diyor ve sorgu
  // metni sabit kalıyor.
  const odulId = opts.kaynakNesnesi.kolon === "reward_id" ? opts.kaynakNesnesi.id : null;
  const kampanyaId = opts.kaynakNesnesi.kolon === "campaign_id" ? opts.kaynakNesnesi.id : null;

  await db.query(
    `INSERT INTO coupons
       (id, cafe_id, player_id, reward_id, campaign_id, code, qr_token, status,
        activates_at, expires_at, budget_period_id, reserved_kurus, proof_level,
        happy_hour_id, play_session_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      kuponId,
      opts.cafeId,
      opts.playerId,
      odulId,
      kampanyaId,
      kod,
      jeton,
      ertelendi ? "pending" : "active",
      aktiflesme,
      sonKullanim,
      donem.id,
      tutar,
      opts.kanitSeviyesi,
      opts.happyHourId ?? null,
      opts.oturumId ?? null,
    ],
  );

  // G1: kasiyer ekranı müşteriyi anonim kodla gösteriyor. Kupon varsa kodun
  // da olması şart — aynı işlemde üretiliyor.
  await takmaAdIle(db, opts.cafeId, opts.playerId);

  await olayYaz(db, {
    kuponId,
    cafeId: opts.cafeId,
    olay: "issued",
    tutar,
    not: opts.kaynak,
  });

  log.info("kupon uretildi", { ertelendi, kaynak: opts.kaynak });

  return { ok: true, kuponId, kod, baslik: opts.kaynakNesnesi.baslik, ertelendi, aktiflesme };
}

/** `rewards` satırını ortak kupon kaynağına çevirir. */
function odulKaynagi(odul: OdulSatiri): KuponKaynagi {
  return {
    id: odul.id,
    kolon: "reward_id",
    baslik: odul.title,
    tutarKurus: Number(odul.cost_kurus),
    enAzKanit: odul.min_proof_level,
  };
}

async function olayYaz(
  db: Db,
  o: {
    kuponId: string;
    cafeId: string;
    olay: "issued" | "activated" | "redeemed" | "undone" | "expired" | "rejected";
    tutar?: number;
    not?: string;
    staffId?: string;
    deviceId?: string;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO coupon_events
       (id, coupon_id, cafe_id, event, reason, staff_id, device_id, amount_kurus)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      newId("cev"),
      o.kuponId,
      o.cafeId,
      o.olay,
      o.not ?? null,
      o.staffId ?? null,
      o.deviceId ?? null,
      o.tutar ?? null,
    ],
  );
}

/* ── Anlık ödül (Ü27) ──────────────────────────────────────── */

/**
 * Anlık ödül verir — oyun başarıyla bitince, günde bir kez.
 *
 * **Ü27: döngüsel seçim.** Kafenin sıraladığı listeden sırayla. Sıra için
 * ayrı bir sayaç kolonu yok: kafenin bugüne kadar dağıttığı anlık kupon
 * sayısının aktif anlık ödül sayısına bölümünden kalan. Defter zaten sayıyı
 * taşıyor.
 *
 * Rastgele seçim **bilerek yok**: E8 öngörülemezliği reddetti, arka kapıdan
 * geri girmesin.
 *
 * Var olan bir işlemin içinde çalışır — oyun bitişiyle aynı işlemde olmalı.
 */
export async function anlikOdulVer(
  db: Db,
  opts: {
    playerId: string;
    cafeId: string;
    kanitSeviyesi: number;
    /** Ü77: motorun şans ve ağırlık hesabı bu skordan türüyor. */
    skor: number;
    /** Ü77: azalan getiri **oyun başına**; hangi oyun olduğu şart. */
    oyunId: string;
    /** Ü91: turda yakalanan ödül işareti sayısı — şansı yükseltiyor. */
    odulIsareti?: number;
    /** Ü88: kuponu doğuran oyun oturumu — artık kolona yazılıyor. */
    kaynakId?: string;
    /** Ü90: bütçe temposunun okuduğu an. Yalnızca testler için. */
    an?: Date;
  },
): Promise<KuponSonucu | null> {
  // Bugün zaten anlık ödül aldıysa ikincisi yok (docs/06 §3).
  const bugunku = await db.one(
    `SELECT 1 FROM coupons c
       JOIN rewards r ON r.id = c.reward_id
      WHERE c.player_id = $1 AND c.cafe_id = $2 AND r.kind = 'instant'
        AND c.issued_at >= ($3::date::timestamp AT TIME ZONE 'Europe/Istanbul')
      LIMIT 1`,
    // Günün başlangıcı İSTANBUL gece yarısı. `date_trunc('day', now())`
    // sunucunun (UTC) gününü verir ve gece 00:00–03:00 arasında dünün
    // akşamını da "bugün" sayar.
    [opts.playerId, opts.cafeId, isGunu()],
  );
  /**
   * Ö3 · Happy Hour: açık pencerede günlük sınır bir kez daha açılıyor.
   *
   * Normalde günde bir anlık ödül var (docs/06 §3). Kafenin seçtiği saatte
   * ikinci bir ödül düşebiliyor ve maliyeti **pencerenin havuzundan**
   * sayılıyor — havuz bittiğinde pencere kapanıyor, oyun oynanmaya devam
   * ediyor ama o pencereden ödül çıkmıyor.
   *
   * Pencere, bütçeyi büyütmüyor: kupon yine bütçeden rezerve ediliyor.
   * Havuz yalnızca "bu saatte en fazla şu kadar dağıt" diyen bir tavan.
   */
  const pencere = await happy.acikPencereIle(db, opts.cafeId);

  if (bugunku && !pencere) return null;

  // Pencere açık ama oyuncu bugün pencereden zaten ödül aldıysa üçüncüsü yok:
  // sınır "günde bir + pencerede bir", sınırsız değil.
  if (bugunku && pencere) {
    const pencereden = await db.one(
      `SELECT 1 FROM coupons
        WHERE player_id = $1 AND happy_hour_id = $2 LIMIT 1`,
      [opts.playerId, pencere.id],
    );
    if (pencereden) return null;
  }

  const adaylar = await db.all<OdulSatiri>(
    `SELECT id, title, cost_kurus, min_proof_level, reward_type, percent
       FROM rewards
      WHERE cafe_id = $1 AND kind = 'instant' AND active
      ORDER BY sort_order, id`,
    [opts.cafeId],
  );
  if (adaylar.length === 0) return null;

  // ── Ödül motoru (Ü77) ──────────────────────────────────
  //
  // Ü27'nin döngüsel sırası kalktı: sıradaki ödül veriliyordu, skorun ve
  // oyuncunun geçmişinin hiçbir etkisi yoktu. Artık üç girdi var — şans,
  // skor ağırlığı ve aynı oyundan gelen kazanımların kıstığı pay.
  //
  // Pencereden çıkan ödül havuza sığmalı, o yüzden süzgeç seçimden ÖNCE:
  // motor havuza sığmayan bir ödül seçerse tur boşa giderdi ve oyuncu
  // "şansım tuttu ama ödül gelmedi" derdi.
  const pencereden = !!bugunku;
  const uygunlar =
    pencereden && pencere
      ? adaylar.filter((a) => Number(a.cost_kurus) <= pencere.kalanKurus)
      : adaylar;
  if (uygunlar.length === 0) return null;

  const sonKazanim = await ayniOyundanKazanim(db, opts.playerId, opts.cafeId, opts.oyunId);
  const karar = motor.karar({
    skor: opts.skor,
    sonKazanim,
    odulIsareti: opts.odulIsareti,
    kurusDegerleri: uygunlar.map((a) => Number(a.cost_kurus)),
  });

  if (!karar.dusuyor) {
    log.info("anlik odul dusmedi", { sebep: karar.sebep, sonKazanim });
    return null;
  }

  const odul = uygunlar[karar.indeks];

  return kuponUret(db, {
    playerId: opts.playerId,
    cafeId: opts.cafeId,
    kaynakNesnesi: odulKaynagi(odul),
    kanitSeviyesi: opts.kanitSeviyesi,
    kaynak: pencereden ? "happy_hour" : "anlik",
    happyHourId: pencereden && pencere ? pencere.id : undefined,
    oturumId: opts.kaynakId,
    an: opts.an,
  });
}

/**
 * Bu oyuncunun **bu oyundan** son günlerde kaç kupon aldığı (Ü77).
 *
 * Azalan getirinin tek girdisi bu. Oyun bağı Ü88'de eklendi; ondan önce
 * üretilmiş kuponlarda `play_session_id` boş ve sayıma girmiyorlar —
 * geçmişe dönük düzeltme yok (E3), motor da yalnızca son yedi güne
 * bakıyor zaten.
 */
async function ayniOyundanKazanim(
  db: Db,
  playerId: string,
  cafeId: string,
  oyunId: string,
): Promise<number> {
  const r = await db.one<{ n: string }>(
    `SELECT count(*) AS n
       FROM coupons c
       JOIN play_sessions ps ON ps.id = c.play_session_id
      WHERE c.player_id = $1 AND c.cafe_id = $2 AND ps.game_id = $3
        AND c.issued_at >= now() - ($4 || ' days')::interval`,
    [playerId, cafeId, oyunId, String(motor.BAKILAN_GUN)],
  );
  return Number(r?.n ?? 0);
}

/* ── Çark ödülü (Ü49) ──────────────────────────────────────── */

/**
 * Çarkın kazandırdığı ödülü kupona çevirir.
 *
 * ── Hangi ödül sorusu burada sorulmuyor ─────────────────────
 *
 * Seçimi `cark.ts` yapıyor (ağırlıklı, sunucuda). Burası yalnızca
 * seçilen ödülü **normal kupon yolundan** geçiriyor: bütçe rezervi (E10),
 * kanıt kademesi (E6), erteleme eşiği (Ü39), denetim izi. Çark kendine
 * ait bir ödül havuzu ya da ayrı bir kupon türü açmıyor.
 *
 * ── 24 saat kilidi neden burada da var ──────────────────────
 *
 * `cark.durum()` de bakıyor ama o okuma ile bu yazma arasında zaman var:
 * iki sekmeden aynı anda çevrilirse ikisi de "açık" cevabını alır ve iki
 * kupon üretilirdi. Burada oyuncu satırı kilitleniyor ve kontrol **aynı
 * işlemde** tekrar yapılıyor — yarışı kapatan yer burası.
 */
export async function carkOduluVer(opts: {
  playerId: string;
  cafeId: string;
  odulId: string;
  kanitSeviyesi: number;
  /** Kayıt anında bozdurulan misafir talebinde 24 saat kilidi aranmıyor. */
  ilkCevirme?: boolean;
  /** Ü90: bütçe temposunun okuduğu an. Yalnızca testler için. */
  an?: Date;
}): Promise<KuponSonucu> {
  if (await acil.durduruldu(acil.ANAHTARLAR.kupon)) {
    return { ok: false, hata: "Ödül dağıtımı geçici olarak durduruldu." };
  }

  const oyuncu = await idIleBul(opts.playerId);
  if (!oyuncu) return { ok: false, hata: "Oyuncu bulunamadı." };

  // G16: SIM swap koruması — numara değişiminden sonra 24 saat değer çıkmaz.
  const kilit = odulKilidiBitis(oyuncu);
  if (kilit) {
    return { ok: false, hata: "Telefon numaran yakında değişti; güvenlik için ödül açılmıyor." };
  }

  const sinir = await ayar.sayiOku(opts.cafeId, ayar.ANAHTARLAR.carkUstSinir);

  return withBypass("çark ödülü", async (db) => {
    await db.query(`SELECT id FROM players WHERE id = $1 FOR UPDATE`, [opts.playerId]);

    if (!opts.ilkCevirme) {
      const son = await db.one<{ an: Date }>(
        `SELECT max(c.issued_at) AS an
           FROM coupons c
           JOIN coupon_events e ON e.coupon_id = c.id AND e.event = 'issued'
          WHERE c.player_id = $1 AND c.cafe_id = $2 AND e.reason = 'cark'`,
        [opts.playerId, opts.cafeId],
      );
      if (son?.an && son.an.getTime() + cark.ARALIK_SAAT * 3_600_000 > Date.now()) {
        return { ok: false as const, hata: "Çark 24 saatte bir çevrilebilir." };
      }
    }

    // Üst sınır burada da aranıyor. `cark.ts` zaten listeyi süzüyor ama
    // parayı yazan fonksiyon bu: sınırı yalnızca seçim tarafında tutmak,
    // imzalı talebin ya da doğrudan çağrının sınırı atlamasına açık kapı
    // bırakırdı. Süzgeç, değerin çıktığı yerde de duruyor.
    const odul = await db.one<OdulSatiri>(
      `SELECT id, title, cost_kurus, min_proof_level, reward_type, percent
         FROM rewards
        WHERE id = $1 AND cafe_id = $2 AND active AND kind = 'instant'
          AND cost_kurus <= $3`,
      [opts.odulId, opts.cafeId, sinir],
    );
    if (!odul) return { ok: false as const, hata: "Bu ödül artık yayında değil." };

    return kuponUret(db, {
      playerId: opts.playerId,
      cafeId: opts.cafeId,
      kaynakNesnesi: odulKaynagi(odul),
      kanitSeviyesi: opts.kanitSeviyesi,
      kaynak: "cark",
      an: opts.an,
    });
  });
}

/* ── Kampanya kuponu (Ö4, Ü82) ─────────────────────────────── */

/**
 * Kafenin yayındaki yüzde kampanyasını oyuncuya kupon olarak düşürür.
 *
 * ── Neden başarı şartı yok ──────────────────────────────────
 *
 * Anlık ödül `basarili` istiyor: o bir **ödül**, oynamanın karşılığı.
 * Kampanya bir ödül değil, kafenin **pazarlaması** — "bugün latte itiyoruz."
 * Oyunu bitirememiş müşteriye latte indirimi vermemek için bir sebep yok;
 * kafenin istediği şey zaten o lattenin satılması.
 *
 * Oturumun nitelikli olması (kafede olmak, K2) yine şart — Ü3 gevşemiyor.
 *
 * ── Günde bir, kampanya başına ──────────────────────────────
 *
 * Aynı oyuncu beş oyun oynayıp beş kupon toplayamıyor. Kafenin iki
 * kampanyası varsa ikisinden de birer kupon alabiliyor; onlar farklı
 * ürünler ve kafe ikisini de itmek istiyor.
 *
 * ── Limitler ────────────────────────────────────────────────
 *
 * Günlük limit, toplam limit ve tarih aralığı `kampanya.uygunOlan()`
 * içinde; bütçe rezervi (E10) ve kanıt kademesi (E6) ortak kupon yolunda.
 * Rezerve edilen tutar **TL tavanı** (Ü17): gerçekleşen indirim daha küçük
 * çıkarsa fark kasada kapanışta bütçeye dönüyor.
 *
 * Var olan bir işlemin içinde çalışır — oyun bitişiyle aynı işlemde olmalı.
 */
export async function kampanyaKuponuVer(
  db: Db,
  opts: {
    playerId: string;
    cafeId: string;
    kanitSeviyesi: number;
    /** Ü90: bütçe temposunun okuduğu an. Yalnızca testler için. */
    an?: Date;
  },
): Promise<KuponSonucu | null> {
  const uygun = await kampanya.uygunOlan(db, opts.cafeId, opts.playerId);
  if (!uygun) return null;

  return kuponUret(db, {
    playerId: opts.playerId,
    cafeId: opts.cafeId,
    kaynakNesnesi: {
      id: uygun.id,
      kolon: "campaign_id",
      // Envanterdeki başlıkla aynı biçim (`odul.ts` → `baslikYaz`).
      baslik: `%${uygun.yuzde} · ${uygun.urunAdi}`,
      tutarKurus: uygun.tavanKurus,
      // Kampanyanın `min_proof_level` kolonu yok; kanıt kademesi
      // tavandan hesaplanıyor — E6 tutara bakıyor, tabloya değil.
      enAzKanit: kanitSeviyesi(uygun.tavanKurus),
    },
    kanitSeviyesi: opts.kanitSeviyesi,
    kaynak: "kampanya",
    an: opts.an,
  });
}

/* ── Puanla satın alma KALDIRILDI (Ü52) ─────────────────────
 *
 * `katalogdanAl` buradaydı: oyuncu puanını harcayıp katalogdan ödül
 * seçiyordu. Ürün sahibi kararı geri aldı — puan artık yalnızca sıralama
 * ve seviye için birikiyor, harcanmıyor. Ödüle giden iki yol kaldı:
 * oyun sonu anlık ödülü (Ü27) ve şans çarkı (Ü49).
 *
 * Fonksiyon silindi, yorumu kaldı: "puanla ödül alma nereye gitti"
 * sorusunun cevabı, kodun içinde bulunmalı.
 */

/* ── Kasiyer tarafı ────────────────────────────────────────── */

export type KasaGorunumu =
  | {
      bulundu: true;
      kuponId: string;
      baslik: string;
      /** Kasiyer TL değerini GÖRÜR — oyuncu görmez (E9). */
      tutarKurus: number;
      tip: "product" | "percent" | "amount";
      yuzde: number | null;
      /** Yüzdeli kuponda tavan; ürün ve tutar ödülünde tutarın kendisi. */
      tavanKurus: number;
      oyuncuKodu: string;
      sonKullanim: Date;
      gecerli: boolean;
      /** Geçerli değilse sebebi — kasiyere gösterilecek cümle. */
      sebep?: string;
    }
  | { bulundu: false; sebep: string };

/**
 * Kasiyerin girdiği QR jetonunu veya 6 haneli kodu çözer.
 *
 * `cafeId` **kasiyer oturumundan** geliyor. Başka kafenin kuponu bu sorguda
 * hiç dönmüyor — kiracı süzgeci RLS'te, ayrıca sorguda.
 */
export async function coz(cafeId: string, girdi: string): Promise<KasaGorunumu> {
  const temiz = girdi.trim();
  if (temiz.length < 4) return { bulundu: false, sebep: "Kod eksik." };

  return withCafe(cafeId, async (db) => {
    const r = await db.one<{
      id: string;
      status: string;
      activates_at: Date;
      expires_at: Date;
      reserved_kurus: string;
      title: string | null;
      reward_type: string | null;
      percent: number | null;
      alias: string | null;
    }>(
      `SELECT c.id, c.status, c.activates_at, c.expires_at, c.reserved_kurus,
              r.title, r.reward_type, r.percent,
              (SELECT code FROM player_aliases a
                WHERE a.cafe_id = c.cafe_id AND a.player_id = c.player_id) AS alias
         FROM coupons c
         LEFT JOIN rewards r ON r.id = c.reward_id
        WHERE c.qr_token = $1 OR upper(c.code) = upper($1)
        LIMIT 1`,
      [temiz],
    );

    if (!r) return { bulundu: false as const, sebep: "Bu kod bu işletmede geçerli değil." };

    const simdi = Date.now();
    let gecerli = true;
    let sebep: string | undefined;

    if (r.status === "redeemed") {
      gecerli = false;
      sebep = "Bu kupon daha önce kullanılmış.";
    } else if (r.status === "expired" || r.expires_at.getTime() <= simdi) {
      gecerli = false;
      sebep = "Kuponun kullanım süresi dolmuş.";
    } else if (r.status === "undone") {
      gecerli = false;
      sebep = "Bu kupon geri alınmış.";
    } else if (r.activates_at.getTime() > simdi) {
      // Kolon değil zaman karar veriyor: `pending` satır bakım işi geç
      // kalınca bile kendiliğinden açılıyor.
      gecerli = false;
      sebep = `Bu kupon ${r.activates_at.toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} itibarıyla açılıyor.`;
    }

    const tutar = Number(r.reserved_kurus);

    return {
      bulundu: true as const,
      kuponId: r.id,
      baslik: r.title ?? "Ödül",
      tutarKurus: tutar,
      tip: (r.reward_type as "product" | "percent" | "amount") ?? "product",
      yuzde: r.percent,
      tavanKurus: tutar,
      oyuncuKodu: r.alias ?? "—",
      sonKullanim: r.expires_at,
      gecerli,
      sebep,
    };
  });
}

export type OnaySonucu =
  | { ok: true; dusulenKurus: number; geriAlmaBitis: Date }
  | { ok: false; hata: string };

/**
 * Kasiyer kuponu onaylar — bütçeden kalıcı düşer.
 *
 * ── Atomiklik ───────────────────────────────────────────────
 *
 * Durum geçişi **koşullu UPDATE** ile yapılıyor: `WHERE status = 'active'`.
 * İki telefon aynı anda okutursa ikinci UPDATE sıfır satır günceller ve
 * reddedilir. QR ve kod aynı kuponu gösterdiği için ikisi aynı anda gelse
 * bile sonuç değişmiyor (Ü19).
 *
 * ── Yüzdeli kuponda tutar ───────────────────────────────────
 *
 * Kasiyer adisyondaki gerçekleşen indirimi giriyor. Tavandan büyük olamaz;
 * aradaki fark bütçeye iade ediliyor (Ü17). Tutar istemciden gelen değere
 * değil, **kayıttaki tavana** göre sınırlanıyor.
 */
export async function onayla(opts: {
  cafeId: string;
  kuponId: string;
  staffId: string;
  deviceId?: string;
  gerceklesenKurus?: number;
}): Promise<OnaySonucu> {
  return withCafe(opts.cafeId, async (db) => {
    const kupon = await db.one<{
      reserved_kurus: string;
      budget_period_id: string | null;
      player_id: string;
      reward_type: string | null;
    }>(
      `SELECT c.reserved_kurus, c.budget_period_id, c.player_id, r.reward_type
         FROM coupons c LEFT JOIN rewards r ON r.id = c.reward_id
        WHERE c.id = $1
          AND c.status IN ('active', 'pending')
          AND c.activates_at <= now()
          AND c.expires_at > now()
        FOR UPDATE OF c`,
      [opts.kuponId],
    );

    if (!kupon) {
      return { ok: false as const, hata: "Bu kupon kullanılamaz." };
    }

    const tavan = Number(kupon.reserved_kurus);

    // G16: SIM swap kilidi kasada da geçerli — değer buradan çıkıyor.
    const oyuncu = await idIleBul(kupon.player_id);
    if (oyuncu && odulKilidiBitis(oyuncu)) {
      await olayYaz(db, {
        kuponId: opts.kuponId,
        cafeId: opts.cafeId,
        olay: "rejected",
        not: "ödül kilidi (SIM swap koruması)",
        staffId: opts.staffId,
      });
      return { ok: false as const, hata: "Bu hesapta geçici ödül kilidi var." };
    }

    // Yüzdeli kuponda gerçekleşen tutar kasiyerden gelir ama tavanla sınırlı.
    const dusulen =
      kupon.reward_type === "percent" && opts.gerceklesenKurus != null
        ? Math.max(0, Math.min(Math.trunc(opts.gerceklesenKurus), tavan))
        : tavan;

    const geriAlmaBitis = new Date(Date.now() + GERI_ALMA_SANIYE * 1000);

    const r = await db.query(
      `UPDATE coupons
          SET status = 'redeemed', redeemed_at = now(), committed_kurus = $2,
              redeemed_by_staff_id = $3, redeemed_device_id = $4, undo_deadline_at = $5
        WHERE id = $1
          AND status IN ('active', 'pending')
          AND activates_at <= now()
          AND expires_at > now()`,
      [opts.kuponId, dusulen, opts.staffId, opts.deviceId ?? null, geriAlmaBitis],
    );

    if (!r.rowCount) {
      // Araya başka bir onay girdi — eşzamanlı okutma senaryosu.
      return { ok: false as const, hata: "Bu kupon az önce kullanıldı." };
    }

    if (kupon.budget_period_id) {
      await butce.harca(db, {
        cafeId: opts.cafeId,
        donemId: kupon.budget_period_id,
        kurus: dusulen,
        kuponId: opts.kuponId,
      });

      // Ü17: tavan ile gerçekleşen arasındaki fark bütçeye döner.
      if (dusulen < tavan) {
        await butce.serbestBirak(db, {
          cafeId: opts.cafeId,
          donemId: kupon.budget_period_id,
          kurus: tavan - dusulen,
          kuponId: opts.kuponId,
          not: "tavan farkı",
        });
      }
    }

    await olayYaz(db, {
      kuponId: opts.kuponId,
      cafeId: opts.cafeId,
      olay: "redeemed",
      tutar: dusulen,
      staffId: opts.staffId,
      deviceId: opts.deviceId,
    });

    log.info("kupon onaylandi", { dusulen, tavan });
    return { ok: true as const, dusulenKurus: dusulen, geriAlmaBitis };
  });
}

/**
 * Onayı geri alır — 60 saniye içinde.
 *
 * Yanlış kuponu onaylamak sahada olacak bir şey. Geri alma penceresi
 * olmasaydı kasiyerin tek çaresi işletmeciyi aramak olurdu.
 *
 * Bütçe tarafında iki satır yazılıyor: `undo` harcamayı iptal ediyor,
 * `release` kalan rezervasyonu çözüyor (göç 0013).
 */
export async function geriAl(opts: {
  cafeId: string;
  kuponId: string;
  staffId: string;
}): Promise<{ ok: true } | { ok: false; hata: string }> {
  return withCafe(opts.cafeId, async (db) => {
    const kupon = await db.one<{
      committed_kurus: string | null;
      reserved_kurus: string;
      budget_period_id: string | null;
      undo_deadline_at: Date | null;
    }>(
      `SELECT committed_kurus, reserved_kurus, budget_period_id, undo_deadline_at
         FROM coupons WHERE id = $1 AND status = 'redeemed' FOR UPDATE`,
      [opts.kuponId],
    );

    if (!kupon) return { ok: false as const, hata: "Bu kupon geri alınamaz." };

    if (!kupon.undo_deadline_at || kupon.undo_deadline_at.getTime() < Date.now()) {
      return {
        ok: false as const,
        hata: `Geri alma süresi doldu (${GERI_ALMA_SANIYE} saniye). İşletmeciyle görüş.`,
      };
    }

    const dusulen = Number(kupon.committed_kurus ?? 0);

    const r = await db.query(
      `UPDATE coupons SET status = 'undone', undo_deadline_at = NULL
        WHERE id = $1 AND status = 'redeemed'`,
      [opts.kuponId],
    );
    if (!r.rowCount) return { ok: false as const, hata: "Bu kupon geri alınamaz." };

    if (kupon.budget_period_id) {
      await butce.geriAlmaYaz(db, {
        cafeId: opts.cafeId,
        donemId: kupon.budget_period_id,
        kurus: dusulen,
        kuponId: opts.kuponId,
      });
    }

    await olayYaz(db, {
      kuponId: opts.kuponId,
      cafeId: opts.cafeId,
      olay: "undone",
      tutar: dusulen,
      staffId: opts.staffId,
    });

    log.warn("kupon onayi geri alindi", { dusulen });
    return { ok: true as const };
  });
}

/* ── Bakım ─────────────────────────────────────────────────── */

/**
 * Süresi dolan kuponları kapatır ve rezervasyonu bütçeye iade eder (E11).
 *
 * Tembel değil, açıkça çalıştırılıyor: tembel hesaplama "bütçe ne kadar"
 * sorusunun cevabını sorgu zamanına bağlardı ve iki farklı ekran farklı
 * cevap verebilirdi.
 */
export async function sureDolanlariSupur(): Promise<number> {
  return withBypass("süresi dolan kuponlar", async (db) => {
    const dolanlar = await db.all<{
      id: string;
      cafe_id: string;
      reserved_kurus: string;
      budget_period_id: string | null;
    }>(
      `SELECT id, cafe_id, reserved_kurus, budget_period_id
         FROM coupons
        WHERE status IN ('pending', 'active') AND expires_at <= now()
        LIMIT 500`,
    );

    for (const k of dolanlar) {
      const r = await db.query(
        `UPDATE coupons SET status = 'expired'
          WHERE id = $1 AND status IN ('pending', 'active')`,
        [k.id],
      );
      if (!r.rowCount) continue;

      if (k.budget_period_id) {
        await butce.serbestBirak(db, {
          cafeId: k.cafe_id,
          donemId: k.budget_period_id,
          kurus: Number(k.reserved_kurus),
          kuponId: k.id,
          not: "süre doldu",
        });
      }

      await olayYaz(db, {
        kuponId: k.id,
        cafeId: k.cafe_id,
        olay: "expired",
        tutar: Number(k.reserved_kurus),
      });
    }

    if (dolanlar.length) log.info("kuponlarin suresi doldu", { adet: dolanlar.length });
    return dolanlar.length;
  });
}

/** Ertelenmiş kuponları aktifleştirir (Ü28). */
export async function bekleyenleriAc(): Promise<number> {
  return withBypass("bekleyen kuponları açma", async (db) => {
    const acilanlar = await db.all<{ id: string; cafe_id: string }>(
      `UPDATE coupons SET status = 'active'
        WHERE status = 'pending' AND activates_at <= now() AND expires_at > now()
      RETURNING id, cafe_id`,
    );

    for (const k of acilanlar) {
      await olayYaz(db, { kuponId: k.id, cafeId: k.cafe_id, olay: "activated" });
    }
    return acilanlar.length;
  });
}

/* ── Ödül dökümü (Ü93) ────────────────────────────────────── */

export type OdulDokumSatiri = {
  baslik: string;
  /** Verildi, henüz kasada gösterilmedi. Bütçede rezerve duruyor (Ü7). */
  acik: number;
  /** Açık kuponların bütçeden bağladığı tutar. */
  acikKurus: number;
  bugunVerilen: number;
  bugunOnaylanan: number;
  /** Bugün kasada fiilen ödenen. */
  bugunKurus: number;
};

/**
 * Bu kafede hangi ödüller dolaşımda ve bugün ne oldu.
 *
 * ⚠️ Ürün sahibi: *"kazanılan ödüllerin ne olduğu gözükmeli."* Bütçe ekranı
 * bugüne kadar yalnızca **para** gösteriyordu — "açık kuponlarda 160 TL".
 * İşletmeci bütçesinin bağlandığını görüyor ama karşılığında ne verdiğini
 * göremiyordu; "çok fazla ödül dağıtılıyor" şikâyeti de buradan çıktı.
 * Parayı yönetmek için önce neyin gittiğini görmek gerekiyor.
 *
 * ⚠️ **Pencere neden "bugün" değil.** İlk sürüm yalnızca bugün verilenleri
 * sayıyordu ve panelde şu çıktı: *"açık kuponlarda 160 TL"* ile *"bugün 0
 * kupon"* yan yana. İkisi de doğruydu — kuponlar dünden kalmıştı — ama
 * ekran kendi kendisiyle çelişiyor görünüyordu. Açık kupon **tarihten
 * bağımsız** sayılıyor artık: para orada duruyorsa dökümü de durmalı.
 *
 * ⚠️ `bugunkuOzet` bunun yerini tutmuyor: o yalnızca onaylananları sayıyor
 * ve kasiyerin gün sonu mutabakatı için. Bütçeyi bağlayan şey ise VERİLEN
 * kupon (Ü7).
 *
 * E9 burada oyuncuya değil KAFEYE bakıyor; kafenin tutarı görmesi zaten
 * ürün kararı ("kullanılan miktarı kafe görmek zorunda").
 */
export async function odulDokumu(cafeId: string): Promise<OdulDokumSatiri[]> {
  return withCafe(cafeId, async (db) => {
    const gunBasi = "($1::date::timestamp AT TIME ZONE 'Europe/Istanbul')";
    const satirlar = await db.all<{
      baslik: string;
      acik: string;
      acik_kurus: string;
      bugun_verilen: string;
      bugun_onaylanan: string;
      bugun_kurus: string;
    }>(
      `SELECT COALESCE(r.title, '%' || kmp.percent || ' · ' || u.name, 'Diğer') AS baslik,
              count(*) FILTER (WHERE c.status IN ('pending','active'))        AS acik,
              COALESCE(sum(c.reserved_kurus)
                       FILTER (WHERE c.status IN ('pending','active')), 0)    AS acik_kurus,
              count(*) FILTER (WHERE c.issued_at >= ${gunBasi}
                                 AND c.status <> 'undone')                    AS bugun_verilen,
              count(*) FILTER (WHERE c.redeemed_at >= ${gunBasi})             AS bugun_onaylanan,
              COALESCE(sum(c.committed_kurus)
                       FILTER (WHERE c.redeemed_at >= ${gunBasi}), 0)         AS bugun_kurus
         FROM coupons c
         LEFT JOIN rewards r ON r.id = c.reward_id
         LEFT JOIN percentage_campaigns kmp ON kmp.id = c.campaign_id
         LEFT JOIN products u ON u.id = kmp.product_id
        GROUP BY COALESCE(r.title, '%' || kmp.percent || ' · ' || u.name, 'Diğer')
       HAVING count(*) FILTER (WHERE c.status IN ('pending','active')) > 0
           OR count(*) FILTER (WHERE c.issued_at >= ${gunBasi}) > 0
           OR count(*) FILTER (WHERE c.redeemed_at >= ${gunBasi}) > 0
        ORDER BY count(*) FILTER (WHERE c.status IN ('pending','active')) DESC, baslik`,
      [isGunu()],
    );

    return satirlar.map((x) => ({
      baslik: x.baslik,
      acik: Number(x.acik),
      acikKurus: Number(x.acik_kurus),
      bugunVerilen: Number(x.bugun_verilen),
      bugunOnaylanan: Number(x.bugun_onaylanan),
      bugunKurus: Number(x.bugun_kurus),
    }));
  });
}

/* ── Kasiyer kupon geçmişi ─────────────────────────────────── */

export type GunlukOzet = {
  toplamAdet: number;
  toplamKurus: number;
  kalemler: { baslik: string; adet: number }[];
};

/**
 * Bugün bu kafede onaylanan kuponlar.
 *
 * `04-kupon-kullanim-akisi.txt`: *"Bugün 23 kupon: 8 kahve, 7 tatlı,
 * 5 indirim, 3 diğer."* Bu sayı kasiyerin kendini yönetmesi için değil,
 * **günlük mutabakat** için: işletmeci kasayla karşılaştırır. Kupon
 * veriliyor ama onaylanmıyorsa ya kasiyerler sistemi kullanmıyordur ya da
 * kuponlar cazip değildir — ikisi de bilinmeye değer.
 */
export async function bugunkuOzet(cafeId: string): Promise<GunlukOzet> {
  return withCafe(cafeId, async (db) => {
    const satirlar = await db.all<{ baslik: string; adet: string; tutar: string }>(
      `SELECT COALESCE(r.title, 'Diğer') AS baslik,
              count(*) AS adet,
              COALESCE(sum(c.committed_kurus), 0) AS tutar
         FROM coupons c
         LEFT JOIN rewards r ON r.id = c.reward_id
        WHERE c.status = 'redeemed'
          AND c.redeemed_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul')
        GROUP BY COALESCE(r.title, 'Diğer')
        ORDER BY count(*) DESC`,
      [isGunu()],
    );

    return {
      toplamAdet: satirlar.reduce((t, r) => t + Number(r.adet), 0),
      toplamKurus: satirlar.reduce((t, r) => t + Number(r.tutar), 0),
      kalemler: satirlar.map((r) => ({ baslik: r.baslik, adet: Number(r.adet) })),
    };
  });
}
