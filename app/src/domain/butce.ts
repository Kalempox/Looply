import { withCafe, type Db } from "@/db/context";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { istanbulDakikasi, isGunu, gunEkle, gunFarki } from "@/lib/tarih";
import { log } from "@/lib/log";
import * as ayar from "./ayar";

/**
 * Kafe bütçesi — Ü6, Ü7, Ü25, E3, E10.
 *
 * ── Bütçe nedir, ne değildir ────────────────────────────────
 *
 * Kafenin sisteme yatırdığı bir para **değil**; dağıtacağını taahhüt ettiği
 * kendi ürününün perakende değeri. Sistemde hiçbir zaman gerçek para durmaz.
 *
 * ── Üç durumlu defter (Ü7) ──────────────────────────────────
 *
 *   REZERVE  kupon oyuncuya verildi   → dağıtılabilir bütçe azalır
 *   HARCANDI kasiyer onayladı          → kalıcı düşer
 *   SERBEST  süresi doldu / iptal      → bütçeye geri döner
 *
 * **Bakiye kolonu yoktur** (E3). Dört sayı da defterin toplamından türer;
 * geçmişe dönük düzeltme yapılamaz, yalnızca yeni satır yazılır.
 *
 * ── Dönem GÜNLÜK (Ü45, Ü25'in revizyonu) ────────────────────
 *
 * Bir dönem = bir gün. Ü25 haftalık kurmuştu; ürün belgesinde dönem her
 * yerde günlük geçiyor ("Günlük ödül bütçesi: 1.500 TL") ve kafenin
 * zihnindeki birim de bu: *"bugün ne kadar dağıtacağım."* Haftalık taahhüt,
 * pazartesi verilen kararın cumayı da bağlaması demekti.
 *
 * Kafe **bir kez günlük tutarını** söylüyor (`domain/ayar.ts`); o günün
 * dönemi ilk ihtiyaç duyulduğunda o tutarla açılıyor. Böylece her sabah
 * yeniden bütçe girmek gerekmiyor, ama kafe istediği günü ayrıca
 * değiştirebiliyor — "yarın maç var, havuzu artırayım".
 */

/** Ü45: günlük taban — 1.500 TL, kuruş cinsinden. */
export const GUNLUK_TABAN_KURUS = 150_000;

/**
 * Kafe açılırken hazır duran pay (Ü87).
 *
 * Tempo sıfırdan başlasaydı günün ilk müşterisi eli boş dönerdi ve E2'nin
 * gerekçesi ("ilk kez oynayanın eli boş çıkarsa bir daha gelmez") tam olarak
 * orada çiğnenirdi. Günün onda biri açılış anından itibaren erişilebilir.
 */
export const ILK_PAY = 0.1;

/**
 * Kapanıştan sonra dağıtımın sürdüğü süre (dakika) — Ü90.
 *
 * Sert kesme haksızlık üretiyor: 22:58'de oyuna başlayan oyuncu 23:01'de
 * bitiriyor ve **kafedeyken oynadığı** turdan eli boş çıkıyor. Yarım saat,
 * son masanın oyununu bitirmesine yetiyor ve yeni müşteri çekecek kadar
 * uzun değil.
 */
export const KAPANIS_PAYI_DK = 30;


/**
 * Günlük bütçenin şu ana kadar açılmış oranı (Ü87, Ü90).
 *
 * ── Neden tempo gerekiyor ───────────────────────────────────
 *
 * Tempo olmadan davranış **ilk gelen alır**: `rezerveEt` yalnızca günlük
 * taahhüde bakar, sabahki kalabalık bütçenin tamamını bitirir ve akşam
 * gelen müşteriye hiçbir şey çıkmaz. Kafenin en yoğun saati genelde akşam
 * olduğu için bu, parayı en az işe yarayacağı saate harcamak demek.
 *
 * ── Tavan, taban değil ──────────────────────────────────────
 *
 * Oran **birikimli**: sabah kimse gelmediyse o pay kaybolmuyor, gün
 * ilerledikçe açılan payın içinde duruyor. Yani tempo "şu saatte şu kadar
 * dağıt" demiyor, "şu saate kadar en fazla şu kadar dağıtılmış olabilir"
 * diyor. Kimse gelmezse hiçbir şey dağıtılmıyor ve ertesi güne de
 * devretmiyor (`budget_carryover: false`).
 *
 * ── ⚠️ Kafe kapalıyken sıfır (Ü90) ─────────────────────────
 *
 * İlk sürüm kapanıştan sonra **tamamını** açıyordu; gerekçesi "o saatte
 * gelen zaten günün son müşterisi" idi. Ürün sahibi tersini istedi ve
 * haklı: *"kafe 23'te kapanıyor, o saatten sonra müşteri gelmeyeceği için
 * sistem ödül eklemesin."* Kapalı bir kafenin bütçesini açık bırakmak,
 * günün en savunmasız saatinde en yüksek payı masaya koymak demekti.
 *
 * Açılıştan önce de sıfır: kafe kapalıyken kimse içeride değil.
 *
 * ⚠️ **Kapanışa yarım saatlik pay bırakılıyor** (`KAPANIS_PAYI_DK`): sert
 * kesme, 22:58'de başlayıp 23:01'de biten turu cezalandırırdı.
 *
 * ⚠️ **Pencere gece yarısını aşamıyor.** Gece 02:00'ye kadar açık bir kafe
 * kapanışını 23 yazmak zorunda ve yarım geceden sonrası kapalı sayılıyor.
 * Bilinen sınır; `docs/23` maddesinde duruyor.
 */
export function tempoOrani(an: Date, acilisSaati: number, kapanisSaati: number): number {
  const simdi = istanbulDakikasi(an);
  const bas = acilisSaati * 60;
  const bit = kapanisSaati * 60;

  if (bit <= bas) return 1; // bozuk ayar: tempoyu hiç uygulama
  if (simdi < bas) return 0; // henüz açılmadı
  if (simdi >= bit + KAPANIS_PAYI_DK) return 0; // kapandı, payı da bitti
  if (simdi >= bit) return 1; // kapanış payı: gün tamamen açık

  const gecen = (simdi - bas) / (bit - bas);
  return ILK_PAY + (1 - ILK_PAY) * gecen;
}

/**
 * Kafe şu an açık mı — Ü274.
 *
 * Kapalıyken hiçbir ödül dağıtılmıyor (Ü90, `tempoOrani` 0). Bu fonksiyon
 * o kuralı **önceden sormak** için var: ürün sahibi gece 01:52'de çarkı
 * çevirdi, çark "hazır" dedi ve kazandırmış gibi gösterdi; oyunda ödüllü
 * bloğu kırdı ve hiçbir şey olmadı. Kural doğruydu, ekran sessizdi.
 *
 * `acilis` ekrandaki cümle için: "çark 09:00'da açılıyor".
 */
export async function kafeAcikMi(
  cafeId: string,
  an: Date = new Date(),
): Promise<{ acik: boolean; acilis: number }> {
  const [bas, bit] = await Promise.all([
    ayar.sayiOku(cafeId, ayar.ANAHTARLAR.acilisSaati),
    ayar.sayiOku(cafeId, ayar.ANAHTARLAR.kapanisSaati),
  ]);
  return { acik: tempoOrani(an, bas, bit) > 0, acilis: bas };
}

/** "9" → "09:00" — kapalı kafe cümlelerinde. */
export function saatYaz(saat: number): string {
  return `${String(saat).padStart(2, "0")}:00`;
}

export type Donem = {
  id: string;
  baslangic: string;
  bitis: string;
  /** Kafenin taahhüt ettiği tutar (kuruş). */
  taahhutKurus: number;
  /** Bu dönemin gün sayısı — ilk dönem kısa olabilir. */
  gunSayisi: number;
  /** Bu dönem için geçerli alt sınır (orantılı). */
  tabanKurus: number;
};

export type ButceDurumu = {
  donem: Donem | null;
  /** Açık kuponların bağladığı tutar — henüz harcanmadı, dağıtılamaz. */
  rezerveKurus: number;
  /** Kasada onaylanmış, kalıcı düşen tutar. */
  harcananKurus: number;
  /** Süresi dolan / iptal edilen kuponlardan bütçeye dönen tutar. */
  iadeKurus: number;
  /** Yeni kupon dağıtmak için kalan tutar. E10: hiçbir zaman negatif olamaz. */
  dagitilabilirKurus: number;
  /**
   * Ü87: **şu anda** dağıtılabilecek tutar — tempo tavanının bıraktığı.
   *
   * `dagitilabilirKurus`tan farkı: o günün tamamı için kalanı, bu ise
   * saatin açtığı payı söylüyor. Kafe ikisini birden görmeli, yoksa
   * "1.200 TL kaldı ama kupon çıkmıyor" diye arar.
   */
  simdiKurus: number;
  /** Kafenin çalışma saatleri — panelde gösteriliyor (Ü90). */
  pencere: { baslangic: number; bitis: number };
  /** Ü90: kafe şu an açık mı? Kapalıyken hiçbir ödül dağıtılmıyor. */
  acikMi: boolean;
};

/**
 * Bir günün dönem aralığı — dönem artık **tek gün** (Ü45).
 *
 * `katilimGunu` parametresi kaldırıldı: haftalık dönemde kafenin hafta
 * ortasında katılması dönemi kısaltıyordu ve taban orantılanıyordu. Günlük
 * dönemde böyle bir durum yok — her gün tam bir dönem.
 */
export function donemAraligi(gun: string): {
  baslangic: string;
  bitis: string;
  gunSayisi: number;
} {
  return { baslangic: gun, bitis: gunEkle(gun, 1), gunSayisi: 1 };
}

/** Ü45: her gün için 1.500 TL taban. */
export function tabanKurus(gunSayisi: number): number {
  return GUNLUK_TABAN_KURUS * gunSayisi;
}

/** Kuruşu okunur TL'ye çevirir — ekranlar ve hata mesajları için. */
export function tl(kurus: number): string {
  return (kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 0 });
}

/* ── Okuma ─────────────────────────────────────────────────── */

/**
 * Defterin dört toplamı.
 *
 * `undo` hareketi (göç 0013) geri alınan onayı iptal ediyor. Formül bu yüzden
 * çıkarma-toplama karışımı; her terimin karşılığı defterdeki bir olay:
 *
 *   açık rezerve = Σreserve + Σundo − Σcommit − Σrelease
 *   harcanan     = Σcommit − Σundo
 *
 * `Math.max(0, …)` KULLANILMIYOR: kırpma, yanlış bir toplamı gizler.
 * Formül doğruysa negatif çıkmaz; çıkıyorsa bilmek isteriz.
 */
async function hareketler(
  db: Db,
  cafeId: string,
  donemId: string,
): Promise<{ acikRezerve: number; harcanan: number; iade: number }> {
  const r = await db.one<{ rezerve: string; commit: string; release: string; undo: string }>(
    `SELECT COALESCE(sum(amount_kurus) FILTER (WHERE kind = 'reserve'), 0) AS rezerve,
            COALESCE(sum(amount_kurus) FILTER (WHERE kind = 'commit'),  0) AS commit,
            COALESCE(sum(amount_kurus) FILTER (WHERE kind = 'release'), 0) AS release,
            COALESCE(sum(amount_kurus) FILTER (WHERE kind = 'undo'),    0) AS undo
       FROM budget_ledger WHERE cafe_id = $1 AND budget_period_id = $2`,
    [cafeId, donemId],
  );

  const rezerve = Number(r?.rezerve ?? 0);
  const commit = Number(r?.commit ?? 0);
  const release = Number(r?.release ?? 0);
  const undo = Number(r?.undo ?? 0);

  return {
    acikRezerve: rezerve + undo - commit - release,
    harcanan: commit - undo,
    iade: release,
  };
}

/**
 * Dönemi okur.
 *
 * `cafe_id` süzgeci sorguda **açıkça** duruyor, RLS'e bırakılmıyor. Sebep:
 * bu fonksiyon `withBypass` bağlamından da çağrılıyor (kupon üretimi kimlik
 * öncesi akışlarla aynı işlemde koşuyor) ve orada RLS kapalı. Süzgeç yalnızca
 * politikada olsaydı, bypass bağlamında **başka kafenin bütçesi** dönerdi ve
 * kupon yanlış kafenin parasından rezerve edilirdi.
 *
 * G12'nin iki katmanı burada da geçerli: uygulama süzgeci + RLS.
 */
async function donemOku(db: Db, cafeId: string, gun: string): Promise<Donem | null> {
  const r = await db.one<{
    id: string;
    period_start: string;
    period_end: string;
    committed_kurus: string;
  }>(
    `SELECT id, period_start::text, period_end::text, committed_kurus
       FROM budget_periods
      WHERE cafe_id = $1 AND period_start <= $2 AND period_end > $2
      ORDER BY period_start DESC LIMIT 1`,
    [cafeId, gun],
  );

  if (!r) return null;

  const gunSayisi = gunFarki(r.period_start, r.period_end);
  return {
    id: r.id,
    baslangic: r.period_start,
    bitis: r.period_end,
    taahhutKurus: Number(r.committed_kurus),
    gunSayisi,
    tabanKurus: tabanKurus(gunSayisi),
  };
}

/**
 * Bütçenin dört sayısı.
 *
 * Hepsi `budget_ledger`'ın toplamı. `dagitilabilir` negatife düşemez (E10):
 * sistem, kalan bütçenin karşılayamayacağı kadar kupon dağıtmaz.
 */
export async function durum(
  cafeId: string,
  gun = isGunu(),
  an?: Date,
): Promise<ButceDurumu> {
  return withCafe(cafeId, async (db) => {
    const donem = await donemOku(db, cafeId, gun);

    if (!donem) {
      return {
        donem: null,
        rezerveKurus: 0,
        harcananKurus: 0,
        iadeKurus: 0,
        dagitilabilirKurus: 0,
        simdiKurus: 0,
        pencere: { baslangic: 0, bitis: 0 },
        acikMi: false,
      };
    }

    const h = await hareketler(db, cafeId, donem.id);
    const kullanilan = h.acikRezerve + h.harcanan;

    const [bas, bit] = await Promise.all([
      ayar.sayiOku(cafeId, ayar.ANAHTARLAR.acilisSaati),
      ayar.sayiOku(cafeId, ayar.ANAHTARLAR.kapanisSaati),
    ]);
    const oran = tempoOrani(an ?? new Date(), bas, bit);
    const tempoTavani = Math.floor(donem.taahhutKurus * oran);

    return {
      donem,
      rezerveKurus: h.acikRezerve,
      harcananKurus: h.harcanan,
      iadeKurus: h.iade,
      dagitilabilirKurus: Math.max(0, donem.taahhutKurus - kullanilan),
      simdiKurus: Math.max(0, Math.min(donem.taahhutKurus - kullanilan, tempoTavani - kullanilan)),
      pencere: { baslangic: bas, bitis: bit },
      acikMi: oran > 0,
    };
  });
}

/* ── Yazma ─────────────────────────────────────────────────── */

export type DonemSonucu = { ok: true; donem: Donem } | { ok: false; hata: string };

/**
 * Dönemi açar veya taahhüdü günceller.
 *
 * Taban kontrolü hem burada hem veritabanında var. İkisi de gerekli: buradaki
 * kullanıcıya **anlaşılır bir cümle** söylüyor, oradaki kod hata yapsa bile
 * kaydı reddediyor.
 */
export async function donemBelirle(opts: {
  cafeId: string;
  taahhutKurus: number;
  aktorId: string;
  gun?: string;
}): Promise<DonemSonucu> {
  const gun = opts.gun ?? isGunu();
  const aralik = donemAraligi(gun);
  const taban = tabanKurus(aralik.gunSayisi);

  if (!Number.isInteger(opts.taahhutKurus) || opts.taahhutKurus < taban) {
    return { ok: false, hata: `Günlük bütçe en az ${tl(taban)} TL olmalı.` };
  }

  return withCafe(opts.cafeId, async (db) => {
    const mevcut = await donemOku(db, opts.cafeId, gun);

    // Taahhüt düşürülebilir mi? Dağıtılmış kuponların altına inilemez —
    // aksi halde bütçe negatife düşer ve E10 bozulur.
    if (mevcut) {
      const r = await db.one<{ bagli: string }>(
        `SELECT COALESCE(sum(amount_kurus) FILTER (WHERE kind = 'reserve'), 0)
              - COALESCE(sum(amount_kurus) FILTER (WHERE kind = 'release'), 0) AS bagli
           FROM budget_ledger WHERE cafe_id = $1 AND budget_period_id = $2`,
        [opts.cafeId, mevcut.id],
      );
      const bagli = Number(r?.bagli ?? 0);

      if (opts.taahhutKurus < bagli) {
        return {
          ok: false as const,
          hata: `Bu dönemde ${tl(bagli)} TL'lik kupon zaten dağıtıldı. Bütçe bunun altına indirilemez.`,
        };
      }
    }

    const id = mevcut?.id ?? newId("bdg");

    await db.query(
      `INSERT INTO budget_periods (id, cafe_id, period_start, period_end, committed_kurus)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (cafe_id, period_start)
       DO UPDATE SET committed_kurus = EXCLUDED.committed_kurus`,
      [id, opts.cafeId, aralik.baslangic, aralik.bitis, opts.taahhutKurus],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: mevcut ? "budget.update" : "budget.create",
      targetType: "budget_period",
      targetId: id,
      detail: { taahhutKurus: opts.taahhutKurus, gunSayisi: aralik.gunSayisi },
    });

    log.info("butce belirlendi", { gunSayisi: aralik.gunSayisi });

    const donem = await donemOku(db, opts.cafeId, gun);
    return donem
      ? { ok: true as const, donem }
      : { ok: false as const, hata: "Dönem yazıldı ama okunamadı." };
  });
}

/**
 * Bütçeden rezerve eder — kupon üretilirken (Faz 7).
 *
 * Dağıtılabilir tutar yetmiyorsa **yazmaz ve false döner**. E10'un uygulaması:
 * kafe hiçbir senaryoda bütçesinin üstünü ödemez.
 *
 * Çağıran taraf işlemi kendisi açar; rezervasyon ile kupon üretimi aynı
 * işlemde olmalı, yoksa rezerve edilip kuponu üretilmemiş tutar oluşur.
 */
export async function rezerveEt(
  db: Db,
  opts: {
    cafeId: string;
    kurus: number;
    kuponId?: string;
    not?: string;
    gun?: string;
    /** Ü87: tempo hesabının okuduğu an. Testler için; normalde şimdi. */
    an?: Date;
    /**
     * Ü104: Happy Hour havuzunun kalanı — günlük tavanın ÜSTÜNE ekleniyor.
     *
     * Ürün sahibi: *"happy hour'a özel bütçe olacak ve sistem ona göre
     * dağıtacak."* Havuz artık günlük bütçeden kesilmiyor, ayrı para.
     *
     * ⚠️ Yalnızca **happy hour kuponu** bu payı geçirebiliyor. Tavanı
     * koşulsuz yükseltseydik, pencere açıkken üretilen sıradan bir kupon da
     * o parayı yerdi ve kafenin "bu saate ayırdım" dediği bütçe başka saate
     * akardı.
     *
     * ⚠️ Tempo tavanına da ekleniyor: tempo günün saatine göre günlük
     * bütçeyi kademeli açıyor (Ü87) ve happy hour zaten belirli bir saat
     * aralığı. Eklemeseydik, sabah 10'da açılan bir happy hour penceresi
     * kendi havuzunu kullanamazdı.
     */
    ekHavuzKurus?: number;
  },
): Promise<boolean> {
  const gun = opts.gun ?? isGunu();
  const donem = await donemOku(db, opts.cafeId, gun);
  if (!donem || opts.kurus <= 0) return false;

  const h = await hareketler(db, opts.cafeId, donem.id);
  const kullanilan = h.acikRezerve + h.harcanan;

  // Ü87: iki tavan birden. Günlük taahhüt (E10) hiçbir zaman aşılmıyor;
  // tempo tavanı ise günün o saatine kadar açılmış payı sınırlıyor.
  const ek = Math.max(0, opts.ekHavuzKurus ?? 0);
  const gunlukKalan = donem.taahhutKurus + ek - kullanilan;
  const tempoTavani = await tempoTavaniHesapla(opts.cafeId, donem.taahhutKurus, opts.an);
  const tempoKalan = tempoTavani + ek - kullanilan;
  const dagitilabilir = Math.min(gunlukKalan, tempoKalan);

  if (opts.kurus > dagitilabilir) {
    log.info("rezervasyon reddedildi: butce yetmiyor", {
      istenen: opts.kurus,
      dagitilabilir,
      // Hangi tavana takıldığı önemli: günlük tavan "kafe bugünkü sözünü
      // tuttu", tempo tavanı "henüz sırası gelmedi" demek. İkisi ayrı
      // sorun ve raporda ayrı görünmeli.
      sebep: tempoTavani === 0 ? "kapali" : gunlukKalan <= tempoKalan ? "gunluk" : "tempo",
    });
    return false;
  }

  await defterYaz(db, donem.id, opts.cafeId, "reserve", opts.kurus, opts.kuponId, opts.not);
  return true;
}

/**
 * Kafenin dağıtım penceresine göre bu ana kadar açılmış tutar (Ü87).
 *
 * Ayarlar `withCafe` istiyor ve `rezerveEt` çoğu zaman `withBypass`
 * içinde koşuyor; bu yüzden ayrı bir bağlamdan okunuyor. Okuma maliyeti
 * iki küçük sorgu ve yalnızca kupon üretiminde çalışıyor.
 */
async function tempoTavaniHesapla(
  cafeId: string,
  taahhutKurus: number,
  an?: Date,
): Promise<number> {
  const [bas, bit] = await Promise.all([
    ayar.sayiOku(cafeId, ayar.ANAHTARLAR.acilisSaati),
    ayar.sayiOku(cafeId, ayar.ANAHTARLAR.kapanisSaati),
  ]);
  return Math.floor(taahhutKurus * tempoOrani(an ?? new Date(), bas, bit));
}

/** Kasada onaylandı — rezerve edilen tutarın gerçekleşen kısmı kalıcı düşer (Faz 7). */
export async function harca(
  db: Db,
  opts: { cafeId: string; donemId: string; kurus: number; kuponId?: string },
): Promise<void> {
  await defterYaz(db, opts.donemId, opts.cafeId, "commit", opts.kurus, opts.kuponId);
}

/**
 * Rezervasyonu serbest bırakır — süresi dolan kupon veya tavan ile gerçekleşen
 * arasındaki fark (Ü17). E11: serbest kalan tutar kadar yeni kupon çıkabilir.
 */
export async function serbestBirak(
  db: Db,
  opts: { cafeId: string; donemId: string; kurus: number; kuponId?: string; not?: string },
): Promise<void> {
  if (opts.kurus <= 0) return;
  await defterYaz(db, opts.donemId, opts.cafeId, "release", opts.kurus, opts.kuponId, opts.not);
}

async function defterYaz(
  db: Db,
  donemId: string,
  cafeId: string,
  kind: "reserve" | "commit" | "release" | "undo",
  kurus: number,
  kuponId?: string,
  not?: string,
): Promise<void> {
  await db.query(
    `INSERT INTO budget_ledger (id, cafe_id, budget_period_id, kind, amount_kurus, coupon_id, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [newId("bl"), cafeId, donemId, kind, kurus, kuponId ?? null, not ?? null],
  );
}

/**
 * Kasiyer onayını geri alır — bütçe tarafı.
 *
 * İki satır yazıyor (göç 0013): `undo` harcamayı iptal ediyor, `release`
 * kalan rezervasyonu çözüyor. Tek satır yetmezdi — biri harcamayı, diğeri
 * rezervasyonu ilgilendiriyor ve ikisi ayrı toplamlarda duruyor.
 */
export async function geriAlmaYaz(
  db: Db,
  opts: { cafeId: string; donemId: string; kurus: number; kuponId?: string },
): Promise<void> {
  if (opts.kurus <= 0) return;
  await defterYaz(db, opts.donemId, opts.cafeId, "undo", opts.kurus, opts.kuponId, "geri alma");
  await defterYaz(db, opts.donemId, opts.cafeId, "release", opts.kurus, opts.kuponId, "geri alma");
}

/* ── Son yedi gün (Ü62) ────────────────────────────────────── */

export type ButceGunu = {
  gun: string;
  /** O gün taahhüt edilen tutar. Dönem açılmamışsa sıfır. */
  taahhutKurus: number;
  /** O gün kasada onaylanan tutar — kafenin fiilen ödediği. */
  harcananKurus: number;
};

/**
 * Son yedi günün bütçe hareketi.
 *
 * ── Neden `coupons`'tan okunuyor ────────────────────────────
 *
 * `budget_periods.committed_kurus` taahhüdü tutuyor ama **harcamayı**
 * tutmuyor: harcanan, o döneme bağlı kuponların `committed_kurus`
 * toplamı (E3 — bakiye kolonu yok, her sayı defterin toplamı). İki
 * yerde tutulsaydı biri güncellenmeden kalırdı.
 *
 * ── Neden dönem yoksa sıfır ─────────────────────────────────
 *
 * Kafe her gün bütçe açmak zorunda değil; dönem ilk ihtiyaçta açılıyor
 * (Ü45). O günler grafikte **boş** görünmeli, atlanmamalı — atlanan gün
 * grafiği kaydırır ve "dün" yanlış güne denk gelir.
 */
export async function sonYediGun(cafeId: string, bugun = isGunu()): Promise<ButceGunu[]> {
  const bas = gunEkle(bugun, -6);

  return withCafe(cafeId, async (db) => {
    const satirlar = await db.all<{ gun: string; taahhut: string; harcanan: string }>(
      `SELECT bp.period_start::text AS gun,
              bp.committed_kurus    AS taahhut,
              COALESCE((SELECT sum(k.committed_kurus) FROM coupons k
                         WHERE k.budget_period_id = bp.id AND k.status = 'redeemed'), 0)
                                    AS harcanan
         FROM budget_periods bp
        WHERE bp.period_start >= $1::date AND bp.period_start <= $2::date`,
      [bas, bugun],
    );

    const harita = new Map(satirlar.map((r) => [r.gun, r]));

    return Array.from({ length: 7 }, (_, i) => {
      const gun = gunEkle(bas, i);
      const r = harita.get(gun);
      return {
        gun,
        taahhutKurus: Number(r?.taahhut ?? 0),
        harcananKurus: Number(r?.harcanan ?? 0),
      };
    });
  });
}
