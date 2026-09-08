import { istanbulDakikasi, isGunu } from "@/lib/tarih";

/**
 * Ödül bekleme metinleri (Ü97).
 *
 * ── Sürpriz olan ödül değil, ZAMAN ───────────────────────────
 *
 * Ürün sahibi: *"ödülü kazanan kişi ne zaman aktif olduğunu bilmeyecek —
 * ödülü değil, ödülü tabii ki bilecek, zamanı bilmeyecek. Sistemde hep 12
 * saat ancak onu kullanıcı bilmediğinden 'gezegenler kararını verdi' gibi
 * cümleler olacak."*
 *
 * Bu, mizah belgesinin ilk önerisinden **daha iyi** bir tasarım ve E9 ile
 * çatışmayı da kendiliğinden çözüyor. Belge açılış anında **tutarı**
 * saklamak istiyordu ("50 TL kazandın — işte burada rakam ilk defa ortaya
 * çıkıyor"); oysa E9/Ü76 oyuncuya TL göstermeyi zaten yasaklıyor ve
 * ödülün **adı** en baştan görünüyor. Saklanacak doğru şey saatti.
 *
 * ⚠️ **Mizah değişir, aktivasyon kuralı değişmez.** Metin `activates_at`'i
 * ne öne alır ne erteler; yalnızca onu **anlatır**. Kupon `activates_at`
 * geldiğinde açılır, ekranda hangi gezegen yazıyor olursa olsun.
 *
 * ⚠️ **Mizah ödül tutarıyla ilişkilendirilmez.** "Jüpiter güçlü, 50 TL
 * çıktı" gibi bir mekanik kurulmaz — kurulsaydı şaka, ödül algoritması
 * sanılır ve oyuncu gezegen arayarak oynamaya başlardı.
 *
 * ⚠️ **"Bugün" ve "yarın" kelimeleri serbest kullanılmıyor.** Havuzda
 * *"Bugün yıldızlar senden yana"* gibi zaman iddiası taşımayan cümleler
 * vardı; oyuncu "bugün"ü açılış günü diye okuyabildiği için belirsizlik
 * metinden kaldırıldı. Test bunu koruyor.
 *
 * ⚠️ **Metin yalan söylemez.** "Yarın açılacak" diyen bir mesaj, ödül
 * gerçekten yarın açılıyorsa kullanılır. Zaman ima eden mesajlar `ima`
 * alanıyla işaretli; gerçekle uyuşmayan hiç seçilmiyor. Mizah, oyuncunun
 * saati bilmemesi üzerine kurulu — **yanlış bilmesi** üzerine değil.
 *
 * ⚠️ **Yalnızca oyuncu görür.** Kasiyer ve kafe ekranları gerçek saati
 * görmeye devam ediyor: kasiyer kuponun neden açılmadığını bilmek zorunda,
 * "Satürn işleri ağırdan alıyor" o ekranda arıza gibi okunur.
 */

export type Havuz = "standart" | "astronomi" | "astroloji" | "absurt";

/** Mesajın ima ettiği zaman — gerçekle uyuşmuyorsa seçilmiyor. */
type Ima = "yarin" | "bugun";

type Mesaj = { metin: string; havuz: Havuz; ima?: Ima };

/**
 * Metin havuzu.
 *
 * Dört ton bilerek karışık duruyor: oyuncu arka arkaya iki ödül
 * kazandığında ikisi de astroloji olmasın. Standart mesajlar havuzda
 * **kalıyor** — mizahı sevmeyen ya da anlamayan oyuncu da bir yerde net
 * bir cümle görmeli.
 */
const HAVUZ: Mesaj[] = [
  // ── Standart: güvenli, anlaşılır ────────────────────────
  { metin: "Ödülün hazırlanıyor. Açıldığında haber vereceğiz.", havuz: "standart" },
  { metin: "Ödülün sırada. Açılınca kasada gösterebilirsin.", havuz: "standart" },
  { metin: "Ödülün açılmayı bekliyor.", havuz: "standart" },
  { metin: "Ödülün yarın seni bekliyor olacak.", havuz: "standart", ima: "yarin" },
  { metin: "Ödülün bugün içinde açılacak.", havuz: "standart", ima: "bugun" },

  // ── Astronomi: ay, güneş, gezegen, yıldız ───────────────
  { metin: "Ödülün yörüngeye girdi. Birazdan değil, zamanı gelince.", havuz: "astronomi" },
  { metin: "Gezegenler toplantıda. Ödülün için karar çıkmasını bekliyoruz.", havuz: "astronomi" },
  { metin: "Satürn halkalarını taktı, işlem biraz uzadı.", havuz: "astronomi" },
  { metin: "Jüpiter şu an meşgul. Ödülün için de biraz beklemek gerekecek.", havuz: "astronomi" },
  { metin: "Yıldızlar hizalanıyor. Ödülün de sıraya girdi.", havuz: "astronomi" },
  { metin: "Kozmik kurul toplandı. Karar açıklanmak üzere.", havuz: "astronomi" },
  { metin: "Ödülün şu anda Samanyolu'nda küçük bir tur atıyor.", havuz: "astronomi" },
  { metin: "Işık hızında gitmesini isterdik ama ödüller biraz daha geleneksel.", havuz: "astronomi" },
  { metin: "Ay biraz nazlı. Ödülün yarın açılacak.", havuz: "astronomi", ima: "yarin" },
  { metin: "Güneş doğmadan bazı şeyler açılmıyor. Ödülün de onlardan biri.", havuz: "astronomi", ima: "yarin" },

  // ── Astroloji: burç, retro, doğum haritası ──────────────
  { metin: "Doğum haritana baktık. Ödülün biraz sabır istiyor.", havuz: "astroloji" },
  { metin: "Merkür retroda. Suçu ona atmak en kolayı.", havuz: "astroloji" },
  { metin: "Venüs olumlu, Mars kararsız. Ödülün beklemede.", havuz: "astroloji" },
  { metin: "Yükselenin sabır çıktı.", havuz: "astroloji" },
  { metin: "Burçlar toplandı, ödülün için olumlu konuşuyorlar.", havuz: "astroloji" },
  { metin: "Astrologlar bile ödülünün saatini göremiyor.", havuz: "astroloji" },
  { metin: "Yıldızlar senden yana. Ödülün yakında açılacak.", havuz: "astroloji" },
  { metin: "Gezegenler olumlu. Kasada görüşürüz.", havuz: "astroloji" },
  { metin: "Satürn sabır diyor. Satürn'ü dinlemek zorundayız.", havuz: "astroloji" },
  { metin: "Jüpiter olumlu konuştu. Ödülün yarın açılacak.", havuz: "astroloji", ima: "yarin" },

  // ── Absürt Looply mizahı ────────────────────────────────
  { metin: "Ödülünü hemen açamadık. Çünkü çok heyecanlandı.", havuz: "absurt" },
  { metin: "Ödülün hazırlanıyor. Üzerine bir şey giyip gelecek.", havuz: "absurt" },
  { metin: "Ödülün bizi biraz bekletiyor. Havalı olmaya çalışıyor.", havuz: "absurt" },
  { metin: "Ödülün geldi ama 'sürpriz' dedi. Saygı duyuyoruz.", havuz: "absurt" },
  { metin: "Ödülün kasada değil, zamanda bekliyor.", havuz: "absurt" },
  { metin: "Sistem ödülünü gördü. Sistem de 'vay be' dedi.", havuz: "absurt" },
  { metin: "Ödülün şu an gizli görevde.", havuz: "absurt" },
  { metin: "Ödülün sana bir sürpriz yapmak istiyor.", havuz: "absurt" },
  { metin: "Burada işler biraz gizemli yürüyor. Çünkü Looply.", havuz: "absurt" },
];

/** Açılma anının metinleri — mizah biter, net cümle gelir. */
const ACILIS: string[] = [
  "Gezegenler kararını verdi. Ödülün açıldı.",
  "Yıldızlar hizalandı. Ödülün açıldı.",
  "Kozmik kurul onayladı. Ödülün hazır.",
  "Evren onay verdi. Ödülün açıldı.",
  "Merkür retrodan çıktı. Ödülün açıldı.",
  "Beklemen bitti. Ödülün açıldı.",
];

export type GunDilimi = "sabah" | "gunduz" | "aksam" | "gece";

/** İstanbul saatine göre gün dilimi. */
export function gunDilimi(an: Date): GunDilimi {
  const saat = Math.floor(istanbulDakikasi(an) / 60);
  if (saat < 6) return "gece";
  if (saat < 11) return "sabah";
  if (saat < 18) return "gunduz";
  return "aksam";
}

/**
 * Metni tohumdan seçen küçük karma.
 *
 * ⚠️ `Math.random` **kullanılmıyor**: aynı kupon aynı dilimde her zaman
 * aynı cümleyi göstermeli. Rastgele olsaydı oyuncu sayfayı her
 * yenilediğinde başka bir gezegen görür ve bu, mizah değil **arıza** gibi
 * okunurdu. Dilim değişince (akşam → gece → sabah) cümle kendiliğinden
 * değişiyor; beklemenin ilerlediğini gösteren şey de bu.
 */
function karma(tohum: string): number {
  let h = 2166136261;
  for (let i = 0; i < tohum.length; i++) {
    h ^= tohum.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Bekleyen ödülün metni.
 *
 * `kuponId` + gün dilimi tohumu veriyor; `aktiflesme` yalnızca hangi
 * mesajların **dürüst** olduğunu belirlemek için okunuyor.
 */
export function beklemeMetni(kuponId: string, aktiflesme: Date, an: Date = new Date()): string {
  const dilim = gunDilimi(an);

  // Ödül bugün mü açılıyor, yarın mı? Zaman ima eden mesajlar yalnızca
  // gerçekle uyuşuyorsa kullanılıyor.
  const bugunMu = isGunu(aktiflesme) === isGunu(an);
  const uygun = HAVUZ.filter((m) => !m.ima || (m.ima === "bugun") === bugunMu);

  // Teorik: her mesaj elenirse boş dönmeyelim.
  if (uygun.length === 0) return "Ödülün açılmayı bekliyor.";

  return uygun[karma(`${kuponId}:${dilim}`) % uygun.length].metin;
}

/** Açılma anının metni — kupon başına sabit. */
export function acilmaMetni(kuponId: string): string {
  return ACILIS[karma(`${kuponId}:acilis`) % ACILIS.length];
}

/** Havuz büyüklüğü — test ve panel için. */
export const HAVUZ_BOYU = HAVUZ.length;
