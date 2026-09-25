import { isGunu } from "@/lib/tarih";
import { randomInt } from "node:crypto";
import { imzala, imzaGecerliMi } from "@/lib/crypto";
import { withBypass, type Db } from "@/db/context";
import { log } from "@/lib/log";
import * as acil from "./acil";
import * as ayar from "./ayar";
import { kafeAcikMi, saatYaz } from "./butce";

/**
 * Şans çarkı — Ü49.
 *
 * ── Ne değil ────────────────────────────────────────────────
 *
 * **Oyun değil.** Ürün sahibinin cümlesi: *"çark bir oyun değil, sadece 24
 * saatte bir oluşan, çok da yüksek ödüller vermeyen bir çark."* Skoru yok,
 * puanı yok, XP'si yok, liderlik tablosuna girmiyor. Tek işi kapıdan giren
 * müşteriye elle tutulur bir şey vermek.
 *
 * ── Animasyon süs, karar sunucuda ───────────────────────────
 *
 * Çarkın dönüşü **göstermelik**: hangi dilimde duracağı sunucuda, bu
 * dosyada belirleniyor ve istemciye yalnızca sonuç indeksi gidiyor.
 * Tarayıcıda karar verilseydi çark, oyuncunun düzenleyebileceği bir
 * kazanç makinesi olurdu.
 *
 * Ekranda dilimler **eşit görünüyor**, ağırlıklar eşit değil. Bu bir
 * aldatmaca değil, sunum tercihi: ürün sahibinin kararı bu ve çarkın
 * dağıttığı toplam değer zaten kafenin günlük bütçesinden (E10)
 * karşılanıyor — yani "herkes en büyük ödülü kazansın" fiziksel olarak
 * mümkün değil. Ağırlığı gizlemek, mümkün olmayan bir şeyi vaat etmemek
 * için.
 *
 * ── Ağırlık: sırada her basamak yarısı ──────────────────────
 *
 * Ödüller değere göre sıralanıyor ve her basamakta olasılık yarıya
 * iniyor. Altı ödüllü bir kafede ~%51 / %25 / %13 / %6 / %3 / %2.
 * Değere dayalı bir formül (1/değer²) denendi ve Ü52 aralığı 25–50 TL'ye
 * daraltınca anlamını yitirdi — iki kat fark, kare alsan bile ayırt
 * etmiyor. Sıra, aralık ne kadar dar olursa olsun aynı karakteri veriyor.
 *
 * ── Bütçe ve kanıt aynen işliyor ────────────────────────────
 *
 * Çark kendi ödül havuzunu yaratmıyor: kazanılan şey kafenin **anlık ödül
 * kataloğundan** çıkıyor ve normal kupon yolundan üretiliyor — bütçe
 * rezervi (E10), kanıt kademesi (E6), erteleme eşiği (Ü39) ve denetim izi
 * aynen uygulanıyor. Çark yalnızca "hangi ödül" sorusunu cevaplıyor.
 */

/*
  🔴 `ARALIK_SAAT = 24` sabiti Ü158'de KALDIRILDI.

  Süre artık kafenin ayarı (`ayar.ANAHTARLAR.carkAralikSaat`, 1–168 saat,
  varsayılan 24) ve varsayılan **tek yerde** duruyor: `ayar.ts`in sınır
  tablosunda. Sabit orada da dursaydı iki kaynak olurdu ve biri
  değiştiğinde diğeri sessizce eskiyecekti.

  ⚠️ Kaldırılmasının asıl sebebi başka: sabit dursa ve kimse okumasa,
  kodda "24 saat" yazan bir satır kalırdı ve sonraki okuyucu kuralın o
  olduğunu sanırdı. Bu depoda dört kez çıkan "yazıldı ama bağlanmadı"
  sınıfının sessiz hâli — ölü bir sabit, yanlış bir belge gibi çalışır.
*/

/** Kafenin çark aralığı — ayarı yoksa varsayılan. */
export async function aralikSaat(cafeId: string): Promise<number> {
  return ayar.sayiOku(cafeId, ayar.ANAHTARLAR.carkAralikSaat);
}

/** Çarkta görünen dilim sayısı — ödül sayısı azsa liste tekrarlanıyor. */
export const DILIM_SAYISI = 8;

/** Misafirin kazandığı ödülü taşıyan çerez. */
export const TALEP_COOKIE = "cp_cark";

/** Misafir talebinin ömrü — masa bileti ve oyun talebiyle aynı. */
export const TALEP_OMRU_SN = 30 * 60;

const AMAC_TALEP = "cark-talep";

/* ── Dilimler ──────────────────────────────────────────────── */

export type Dilim = {
  odulId: string;
  baslik: string;
  /** Ekranda gösterilmiyor; ağırlık hesabı ve bütçe için taşınıyor (E9). */
  kurusDegeri: number;
  /**
   * Ü110: kafenin yazdığı çıkma ağırlığı. `null` = kafe belirlemedi.
   *
   * ⚠️ **İstemciye geçmiyor.** `/cark` sayfası dilimleri
   * `{ baslik }`e indirerek gönderiyor; ağırlığın oraya sızması,
   * ekranda gizlenen olasılıkları (bkz. dosya başı) ifşa ederdi.
   */
  agirlik: number | null;
};

type OdulSatiri = { id: string; title: string; cost_kurus: string; wheel_weight: number | null };

/**
 * Çarka girecek ödüller.
 *
 * ── Üst sınır neden var ─────────────────────────────────────
 *
 * Ödüller kafenin günlük havuzundan çıkıyor (E10) ama havuz **tek bir
 * ödülün** büyüklüğünü sınırlamıyor: 1.500 TL'lik havuzdan tek seferde
 * 300 TL'lik ödül de çıkabilirdi. Ürün sahibinin tarifi bunun tersi —
 * *"küçük ödüller dağıtacak."* Sınır kafenin ayarı (`cark_ust_sinir_kurus`,
 * varsayılan 25 TL); üstündeki anlık ödüller katalogda kalıyor ve oyun içi
 * anlık ödül olarak çıkmaya devam ediyor, yalnızca çarkta yoklar.
 *
 * Süzgeç **SQL'de**: JavaScript'te filtrelenseydi ağırlık hesabına giren
 * liste ile ekrana giden liste ayrışabilirdi.
 */
export async function odulleriOku(db: Db, cafeId: string, ustSinirKurus: number): Promise<Dilim[]> {
  /**
   * ⚠️ Ü103: günlük adedi dolan ödül çarkın **dilimlerinden de** çıkıyor.
   *
   * Yalnızca oyun tarafında süzseydik çarkta görünen ama asla çıkmayan bir
   * dilim kalırdı — oyuncu onu görüp beklerdi ve çark yalan söylemiş
   * olurdu. Dilim listesi ile çekiliş listesi aynı olmak zorunda.
   */
  const satirlar = await db.all<OdulSatiri>(
    `SELECT r.id, r.title, r.cost_kurus, r.wheel_weight
       FROM rewards r
      WHERE r.cafe_id = $1 AND r.kind = 'instant' AND r.active
        AND r.cost_kurus <= $2
        AND (r.daily_limit IS NULL
             OR (SELECT count(*) FROM coupons c
                  WHERE c.reward_id = r.id
                    AND c.status <> 'undone'
                    AND c.issued_at >= ($3::date::timestamp AT TIME ZONE 'Europe/Istanbul')
                ) < r.daily_limit)
      ORDER BY r.cost_kurus, r.id`,
    [cafeId, ustSinirKurus, isGunu()],
  );

  return satirlar.map((r) => ({
    odulId: r.id,
    baslik: r.title,
    kurusDegeri: Number(r.cost_kurus),
    agirlik: r.wheel_weight,
  }));
}

/** Kafenin çark tavanı — `withBypass` dışında okunuyor (RLS açık kalsın). */
export async function ustSinir(cafeId: string): Promise<number> {
  return ayar.sayiOku(cafeId, ayar.ANAHTARLAR.carkUstSinir);
}

/**
 * Çarkın görünen dilimleri.
 *
 * ── Neden her zaman sekiz dilim değil ───────────────────────
 *
 * İlk hâli listeyi hep sekize tamamlıyordu. Tek ödülü olan bir kafede
 * çark aynı ismi sekiz kez yazıyordu ve **bozuk** görünüyordu — çevirmeye
 * değer bir şey yokmuş gibi.
 *
 * Kural şu: dört ve üstü ödül varsa her ödül **bir kez** görünüyor
 * (en çok sekiz). Daha azsa liste, altı dilime yaklaşana kadar tam
 * turlarla tekrarlanıyor: her ödül eşit sayıda göründüğü için görünen
 * sıklık gerçek olasılıkla aynı yönde kalıyor — tekrar, hiçbir ödülü
 * diğerinden avantajlı göstermiyor.
 *
 * Tek ödüllü kafede çark tek dilim: dönecek bir şey yok ve olmadığını
 * göstermek, sekiz kez aynı şeyi yazmaktan dürüst.
 */
export function dilimleriYay(oduller: Dilim[]): Dilim[] {
  const n = oduller.length;
  if (n === 0) return [];
  if (n >= 4) return oduller.slice(0, DILIM_SAYISI);
  if (n === 1) return oduller;

  const tur = Math.max(1, Math.floor(6 / n));
  return Array.from({ length: n * tur }, (_, i) => oduller[i % n]);
}

/**
 * Ağırlıklı seçim — ucuz ödül çok daha olası.
 *
 * ── Neden değere değil SIRAYA bakıyor ───────────────────────
 *
 * İlk sürüm `1 / değer²` kullanıyordu ve 5–45 TL aralığında iyi
 * çalışıyordu: en pahalı ödül yüzde birde kalıyordu. Ü52 ödül aralığını
 * **25–50 TL**'ye daralttı ve formül anlamını yitirdi — en ucuz ile en
 * pahalı arasında yalnızca iki kat var, kare alsan bile en pahalı ödül
 * yüzde on dörde çıkıyor. "Çok da yüksek ödüller vermeyen çark" tarifi
 * bozuluyordu.
 *
 * Şimdi ağırlık **sıradan** geliyor: liste değere göre artan sıralı ve her
 * basamakta ağırlık yarıya iniyor (32, 16, 8, 4, 2, 1). Altı ödüllü bir
 * kafede dağılım ~%51 / %25 / %13 / %6 / %3 / %2 oluyor. Aralık ne kadar
 * dar olursa olsun bu oran değişmiyor — kafenin ödül tutarlarını
 * değiştirmesi çarkın karakterini bozamıyor.
 *
 * `randomInt` kullanılıyor, `Math.random` değil: çarkın sonucu para
 * değerinde ve öngörülebilir bir üreteç, sırayı tahmin etmeye çalışan biri
 * için açık kapı olurdu.
 */
export function otomatikAgirliklar(oduller: Dilim[]): number[] {
  // Liste değere göre artan sıralı gelmeli (SQL öyle veriyor); yine de
  // burada sıralıyoruz — çağıranın sırasına güvenmek, ağırlıkların sessizce
  // ters dönmesi demek olurdu.
  const sira = oduller
    .map((o, i) => ({ i, kurus: o.kurusDegeri }))
    .sort((a, b) => a.kurus - b.kurus || a.i - b.i);

  const n = sira.length;
  const ham = new Array<number>(n).fill(0);
  // 2^(n-1-basamak): en ucuz en ağır. Üs 30'da sınırlanıyor — otuzdan
  // fazla ödülü olan bir kafede taşma riskini almaya değmez.
  sira.forEach((o, basamak) => {
    ham[o.i] = 2 ** Math.min(30, n - 1 - basamak);
  });

  /**
   * Ü110: ham ağırlıklar **yüzde ölçeğine** taşınıyor (toplam ≈ 100).
   *
   * Oran birebir korunuyor; değişen tek şey sayının okunabilirliği. Kafe
   * paneli açıp otomatiği sabitlediğinde "Ağırlık 51 (≈%51)" görüyor —
   * "Ağırlık 32 (≈%51)" görseydi iki sayının ilişkisini kurmak için
   * toplamı elle hesaplaması gerekirdi.
   *
   * Alt sınır 1: sıfıra yuvarlanan ödül çarktan tamamen düşerdi ve bu,
   * kafenin vermediği bir karar olurdu (0 kafenin açık tercihi).
   */
  const tam = ham.reduce((t, k) => t + k, 0);
  return ham.map((h) => Math.max(1, Math.round((h / tam) * 100)));
}

/**
 * Çekilişte kullanılacak ağırlıklar (Ü110).
 *
 * ── Hepsi NULL ise otomatik ─────────────────────────────────
 *
 * Paneli hiç açmamış kafede Ü49'un sıraya dayalı dağılımı aynen işliyor.
 *
 * ── Biri bile yazılmışsa hepsi elle sayılıyor ───────────────
 *
 * Kafe ilk ağırlığı yazdığında panel kalanları otomatik dağılımdan
 * dolduruyor (`cark-agirlik.ts`), yani burada NULL kalması beklenmiyor.
 * Yine de savunma var: yarı yolda kalmış bir satır, o ödülün otomatik
 * payını alıyor — listeden sessizce düşmesi, kafenin görmediği bir
 * kayıp olurdu.
 *
 * ── ⚠️ Hepsi sıfırsa otomatiğe dönülüyor ────────────────────
 *
 * "Çarkta hiçbir ödül çıkmasın" geçerli bir yapılandırma değil: çark
 * dönecek bir şey bulamaz ve oyuncuya boş bir ekran kalır. Panel bunu
 * zaten reddediyor; burası veri elle bozulursa diye duruyor.
 */
export function agirliklar(oduller: Dilim[]): number[] {
  const otomatik = otomatikAgirliklar(oduller);
  if (oduller.every((o) => o.agirlik == null)) return otomatik;

  const elle = oduller.map((o, i) => (o.agirlik == null ? otomatik[i] : o.agirlik));
  return elle.some((a) => a > 0) ? elle : otomatik;
}

export function agirlikliSec(oduller: Dilim[]): number {
  const kovalar = agirliklar(oduller);

  const tam = kovalar.reduce((t, k) => t + k, 0);
  let atis = randomInt(tam);
  for (let i = 0; i < kovalar.length; i++) {
    atis -= kovalar[i];
    if (atis < 0) return i;
  }
  return kovalar.length - 1;
}

/* ── Durum ─────────────────────────────────────────────────── */

export type CarkDurumu =
  | { acik: true; dilimler: Dilim[] }
  | { acik: false; sebep: "odul_yok" | "durduruldu" }
  /** Ü274: kafe kapalı — kapalıyken hiçbir ödül dağıtılmıyor (Ü90). */
  | { acik: false; sebep: "kapali"; acilis: number }
  | { acik: false; sebep: "sure"; sonrakiAn: Date; dilimler: Dilim[] };

/**
 * Kayıtlı oyuncunun çarkı açık mı?
 *
 * Süre kontrolü **kupon defterinden** okunuyor, ayrı bir "son çevirme"
 * kolonundan değil: kupon zaten üretiliyor ve iki yerde tutulan aynı
 * gerçek er ya da geç ayrışır. Çevirmenin izi, ürettiği kupondur.
 */
export async function durum(opts: {
  playerId: string;
  cafeId: string;
  /**
   * Kafenin açık olup olmadığının okunduğu an — **yalnızca testler için**
   * (Ü90'daki aynı dikiş). Kapalı kafe kuralı duvar saatine bakıyor ve
   * dikiş olmasa çark testleri gece koşunca sebepsiz düşerdi.
   */
  an?: Date;
}): Promise<CarkDurumu> {
  if (await acil.durduruldu(acil.ANAHTARLAR.kupon)) {
    return { acik: false, sebep: "durduruldu" };
  }

  /* 🔴 Ü274: kapalı kafede çark "hazır" DEMİYOR. Önce diyordu: çevirme
     başarılı görünüyor, kupon ise bütçe kapalı olduğu için hiç
     üretilmiyordu — oyuncu kazandığını sanıp eli boş kalıyordu. */
  const saat = await kafeAcikMi(opts.cafeId, opts.an);
  if (!saat.acik) return { acik: false, sebep: "kapali", acilis: saat.acilis };

  const sinir = await ustSinir(opts.cafeId);

  return withBypass("çark durumu", async (db) => {
    const oduller = await odulleriOku(db, opts.cafeId, sinir);
    if (oduller.length === 0) return { acik: false as const, sebep: "odul_yok" as const };

    const son = await sonCevirme(db, opts);
    if (son) {
      const saat = await aralikSaat(opts.cafeId);
      const sonraki = new Date(son.getTime() + saat * 3_600_000);
      if (sonraki > new Date()) {
        return {
          acik: false as const,
          sebep: "sure" as const,
          sonrakiAn: sonraki,
          dilimler: dilimleriYay(oduller),
        };
      }
    }

    return { acik: true as const, dilimler: dilimleriYay(oduller) };
  });
}

async function sonCevirme(
  db: Db,
  opts: { playerId: string; cafeId: string },
): Promise<Date | null> {
  const r = await db.one<{ an: Date }>(
    `SELECT max(c.issued_at) AS an
       FROM coupons c
       JOIN coupon_events e ON e.coupon_id = c.id AND e.event = 'issued'
      WHERE c.player_id = $1 AND c.cafe_id = $2 AND e.reason = 'cark'`,
    [opts.playerId, opts.cafeId],
  );
  return r?.an ?? null;
}

/**
 * Yayılmış dilim listesinden ağırlıklı bir dilim seçer.
 *
 * Seçim **benzersiz ödüller** üzerinden yapılıyor, yayılmış liste
 * üzerinden değil: aynı ödül listede iki kez geçiyorsa iki kat olası
 * olurdu ve `DILIM_SAYISI`'nin ödül sayısına bölünmediği durumlarda
 * ağırlıklar sessizce bozulurdu.
 */
export function sec(dilimler: Dilim[]): { dilim: Dilim; indeks: number } | null {
  if (dilimler.length === 0) return null;

  const benzersiz: Dilim[] = [];
  for (const d of dilimler) {
    if (!benzersiz.some((b) => b.odulId === d.odulId)) benzersiz.push(d);
  }

  const secilen = benzersiz[agirlikliSec(benzersiz)];
  const indeks = dilimler.findIndex((d) => d.odulId === secilen.odulId);
  return { dilim: secilen, indeks: indeks < 0 ? 0 : indeks };
}

/** Çark kapalıysa oyuncuya söylenecek cümle. */
export function durumMetni(d: CarkDurumu): string {
  if (d.acik) return "";
  if (d.sebep === "kapali") return kapaliCumlesi(d.acilis);
  if (d.sebep !== "sure") {
    return d.sebep === "odul_yok"
      ? "Bu kafede şu an dağıtılan ödül yok."
      : "Ödül dağıtımı geçici olarak durduruldu.";
  }

  return `${BEKLEME_BASLIGI} — ${beklemeSuresi(d.sonrakiAn)} yine seni bekliyor.`;
}

/**
 * Bekleyen çarkın başlığı — Ü293.
 *
 * Ürün sahibi: *"küçük ve tatlı bir mesajla — şu kadar saat sonra tekrar
 * bekleriz gibi, ama daha tatlı."* Eskiden çark sayfası 13 saat sonra da
 * "Çarkı az önce çevirdin" diyordu; ana ekranda ise hiçbir şey yoktu
 * (Ü275) ve oyuncu çarkının verilmediğini sandı. Ana ekrandaki küçük kart,
 * çark sayfası ve çevirme denemesi aynı cümleyi söylüyor.
 *
 * Emoji yok: oyuncu ekranlarının hiçbirinde yok, telefona göre farklı
 * çiziliyor. Sıcaklığı kartın yanındaki çark resmi veriyor.
 */
export const BEKLEME_BASLIGI = "Çark kahve molasında";

/**
 * Çarkın yeniden açılmasına ne kadar kaldığı — Ü293. "11 saat sonra",
 * "25 dakika sonra", "birazdan".
 *
 * Yukarı yuvarlanıyor: söylenen sürede dönen oyuncu çarkı hazır bulmalı,
 * bir de "20 dakika daha" duymamalı.
 */
export function beklemeSuresi(sonrakiAn: Date, an: Date = new Date()): string {
  const dk = Math.ceil(Math.max(0, sonrakiAn.getTime() - an.getTime()) / 60_000);
  if (dk <= 1) return "birazdan";
  if (dk < 60) return `${dk} dakika sonra`;
  return `${Math.ceil(dk / 60)} saat sonra`;
}

/** Ana ekrandaki kartın cümlesi: "11 saat sonra yine seni bekliyor." */
export function beklemeCumlesi(sonrakiAn: Date, an?: Date): string {
  const s = beklemeSuresi(sonrakiAn, an);
  return `${s.charAt(0).toLocaleUpperCase("tr-TR")}${s.slice(1)} yine seni bekliyor.`;
}

/**
 * Misafire gösterilecek dilimler.
 *
 * Liste **sunucudan** geliyor: istemci kendi dilim listesini kursaydı
 * ödülün adını da uydurabilir ve "kazandım" ekranı gerçekle ilgisiz
 * olurdu. Ödülün TL değeri bu listede taşınıyor ama ekrana çıkmıyor (E9).
 */
/** Ü274: kapalı kafenin cümlesi — çark, misafir ekranı ve oyun sonu aynısını söylüyor. */
export function kapaliCumlesi(acilis: number): string {
  return `Kafe şu an kapalı — ödüller ${saatYaz(acilis)}'da açılıyor. Oynayabilirsin ama ödül çıkmaz.`;
}

/** Misafir ekranı için: kafe kapalıysa cümlesi, açıksa `null`. */
export async function kapaliMetni(cafeId: string, an?: Date): Promise<string | null> {
  const saat = await kafeAcikMi(cafeId, an);
  return saat.acik ? null : kapaliCumlesi(saat.acilis);
}

export async function misafirDurumu(cafeId: string, an?: Date): Promise<Dilim[]> {
  if (await acil.durduruldu(acil.ANAHTARLAR.kupon)) return [];
  // Ü274: kapalı kafede misafire çark gösterilmiyor — kazandırmış gibi
  // görünüp kayıtta boşa çıkıyordu. Sebebi `kapaliMetni` söylüyor.
  if (!(await kafeAcikMi(cafeId, an)).acik) return [];
  const sinir = await ustSinir(cafeId);
  return withBypass("misafir çark dilimleri", async (db) =>
    dilimleriYay(await odulleriOku(db, cafeId, sinir)),
  );
}

/* ── Misafir çevirmesi ─────────────────────────────────────── */

export type Talep = {
  cafeId: string;
  odulId: string;
  baslik: string;
  /** Animasyonun duracağı dilim — ekranın tek işi burada durmak. */
  dilim: number;
  son: number;
};

export type MisafirSonucu =
  | { ok: true; dilim: number; baslik: string; cerez: string }
  | { ok: false; hata: string };

/**
 * Kaydolmamış ziyaretçinin çevirmesi.
 *
 * ── Neden hemen kupon üretilmiyor ───────────────────────────
 *
 * G13: doğrulanmamış ziyaretçinin veritabanında izi olmamalı. Kazanılan
 * ödül imzalı bir çerezde bekliyor; oyuncu kaydolduğunda `bozdur()` onu
 * normal kupon yolundan geçiriyor — bütçe, kanıt ve erteleme kuralları
 * orada işliyor.
 *
 * ── Neden kafe kimliği imzanın içinde ───────────────────────
 *
 * Çerez oyuncunun elinde. Kafe imzalı gövdede olmasaydı, A kafesinde
 * çevrilen çark B kafesinin bütçesinden ödül yazdırabilirdi.
 */
export async function misafirCevir(opts: { cafeId: string; an?: Date }): Promise<MisafirSonucu> {
  if (await acil.durduruldu(acil.ANAHTARLAR.kupon)) {
    return { ok: false, hata: "Ödül dağıtımı geçici olarak durduruldu." };
  }
  // Ü274: ekran çarkı zaten göstermiyor; sunucu da ayrıca reddediyor.
  const saat = await kafeAcikMi(opts.cafeId, opts.an);
  if (!saat.acik) return { ok: false, hata: kapaliCumlesi(saat.acilis) };

  const sinir = await ustSinir(opts.cafeId);

  return withBypass("misafir çark çevirme", async (db) => {
    const oduller = await odulleriOku(db, opts.cafeId, sinir);
    if (oduller.length === 0) {
      return { ok: false as const, hata: "Bu kafede şu an dağıtılan ödül yok." };
    }

    // Kayıtlı oyuncuyla aynı seçim fonksiyonu: iki akışın olasılıkları
    // ayrışırsa "misafirken daha iyi ödül çıkıyor" gibi bir fark doğar ve
    // kimse bunu fark etmez.
    const secim = sec(dilimleriYay(oduller));
    if (!secim) return { ok: false as const, hata: "Bu kafede şu an dağıtılan ödül yok." };

    const talep: Talep = {
      cafeId: opts.cafeId,
      odulId: secim.dilim.odulId,
      baslik: secim.dilim.baslik,
      dilim: secim.indeks,
      son: Date.now() + TALEP_OMRU_SN * 1000,
    };

    // Ödülün TL değeri loga da girmiyor (E9).
    log.info("misafir cark cevirdi", { cafeId: opts.cafeId, dilim: talep.dilim });

    return {
      ok: true as const,
      dilim: talep.dilim,
      baslik: talep.baslik,
      cerez: paketle(talep),
    };
  });
}

/* ── İmzalı taşıyıcı ──────────────────────────────────────── */

/**
 * Gövde JSON, taşıma base64url, sonuna imza.
 *
 * `misafir.ts` ile aynı biçim ve aynı sıra: çözerken **önce imza
 * doğrulanıyor**, sonra JSON ayrıştırılıyor. Kurcalanmış çerez
 * ayrıştırıcıya hiç ulaşmıyor.
 */
function paketle(veri: Talep): string {
  const govde = Buffer.from(JSON.stringify(veri), "utf8").toString("base64url");
  return `${govde}.${imzala(AMAC_TALEP, govde)}`;
}

/** Talebi çözer. İmza tutmuyorsa, süresi geçtiyse veya biçim bozuksa null. */
export function talepCoz(cerez: string | undefined): Talep | null {
  if (!cerez) return null;

  const nokta = cerez.lastIndexOf(".");
  if (nokta < 1) return null;

  const govde = cerez.slice(0, nokta);
  if (!imzaGecerliMi(AMAC_TALEP, govde, cerez.slice(nokta + 1))) return null;

  let t: Talep;
  try {
    t = JSON.parse(Buffer.from(govde, "base64url").toString("utf8")) as Talep;
  } catch {
    return null;
  }

  if (typeof t?.son !== "number" || t.son < Date.now()) return null;
  if (typeof t.cafeId !== "string" || typeof t.odulId !== "string") return null;
  if (typeof t.baslik !== "string" || typeof t.dilim !== "number") return null;

  return t;
}
