import * as pencere from "./kullanim-penceresi";
import * as ayar from "./ayar";
import { withCafe } from "@/db/context";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";

/**
 * Ödül kataloğu — kafenin oyuncuya sunduğu ödüller.
 *
 * ── Üç tip (Ü18, Ü26) ───────────────────────────────────────
 *
 *   🏆 Ürün ödülü      kafenin kendi ürünü; `maliyetKurus` perakende değeri
 *   🎟️ Yüzdeli indirim yüzde + **TL tavanı**; `maliyetKurus` TAVANDIR (Ü17)
 *   💸 Tutar indirimi  sabit TL; `maliyetKurus` tutarın kendisi
 *
 * Kafe **bakiyesi** hâlâ yok (Ü18): saklanan değer aracı v1 kapsamı dışında.
 * Tutar indirimi bakiye DEĞİL — tek kullanımlık bir kupon; adisyondan bir
 * kez düşülüyor, kalanı saklanmıyor, sonraki ziyarete devretmiyor. Bakiyenin
 * getirdiği kısmi kullanım, kalan takibi, iade/itiraz akışı ve ödeme
 * mevzuatı sınırı bu tipte hiç doğmuyor.
 *
 * Rezervasyon üç tipte de aynı: her zaman `maliyetKurus` bütçeden rezerve
 * edilir. Yalnızca **yüzdelide** kasada gerçekleşen tutar düşülür ve fark
 * iade edilir; diğer ikisinde gerçekleşen zaten tutarın kendisi.
 *
 * ── Kanıt seviyesi kafenin seçimi değil ─────────────────────
 *
 * E6 ödülün kanıt seviyesini **platform kuralı** yapıyor; kafenin
 * panelinden seçilemiyor. Kafe seçebilseydi, en pahalı ödülü en zayıf
 * kanıtla verip fraud'a kapı açabilirdi. Ü268'den beri kural tek kademe:
 * her ödül konum doğrulaması (K2) istiyor — bkz. `kanitSeviyesi`.
 */

export type OdulTipi = "product" | "percent" | "amount";

export type Odul = {
  id: string;
  tip: OdulTipi;
  baslik: string;
  aciklama: string | null;
  /** Ürün ödülünde perakende değeri, yüzdelide TL tavanı, tutar indiriminde tutarın kendisi (kuruş). */
  maliyetKurus: number;
  /** Yüzdeli ödülde indirim oranı; ürün ödülünde null. */
  yuzde: number | null;
  puanFiyati: number;
  /** E2: anlık ödül puan istemez. */
  anlik: boolean;
  kanitSeviyesi: number;
  urunId: string | null;
  /** Ü277: bağlı ürünün fiyatı — yüzde ödülünün TL karşılığını anlatmak için. */
  urunFiyatKurus: number | null;
  urunAdi: string | null;
  aktif: boolean;
  /** Ü94: adı değiştirmenin kaç dolaşımdaki kuponu etkileyeceği. */
  acikKupon: number;
  /** Ü103: günde en fazla kaç kupon verilebilir. null = sınırsız. */
  gunlukLimit: number | null;
  /** Ü103: bugün bu ödülden kaç kupon verildi — limitin canlı sayacı. */
  bugunVerilen: number;
  /** Ü103: kullanım penceresi cümlesi — kısıt yoksa null. */
  pencereMetni: string | null;
  pencere: pencere.Pencere;
};

export type OdulSonucu =
  | { ok: true; id: string; /** Ü277: saklanan değer (kuruş). */ degerKurus: number }
  | { ok: false; hata: string };

/* ── Ödül değerleri (Ü52 → Ü268 · K5 → Ü277) ──────────────────
 *
 * Ü52'de kural **en az 25 TL, 5'er artışla, en çok 50 TL** idi ve panel
 * sabit bir listeden seçtiriyordu. Ü268'de ürün sahibi iki şey istedi:
 *
 *   · *"25 ile üst sınır arasında istediğimi yazabilmeliyim"* → basamak
 *     kalktı, tutar serbest, tam TL.
 *   · *"Üst sınırı kafe belirlesin, bir sınır olmasın, en az 50 olsun"*
 *     → üst sınır `ayar.odulUstSinir`, kafenin ayarı.
 *
 * ── 🔴 Ü277: değer ürünün fiyatından, alt sınır kalktı ──────
 *
 * Ürün sahibi panelde ürün ödülü eklerken fiyatın ayrıca sorulmasını
 * "saçma" buldu — ürünün fiyatı Ürünler'de zaten yazılı. Yüzde ödülünde
 * de hem oran hem "en fazla indirim" soruluyordu. Artık:
 *
 *   ürün  → değer ürünün fiyatı
 *   yüzde → fiyat × oran; **ürün seçmek zorunlu** (ürün sahibinin kararı)
 *   tutar → elle yazılan tutar, tam TL (Ü52'nin "27,50" gerekçesi burada
 *           hâlâ geçerli)
 *
 * Hesaplanan değer 25 TL'nin altına düşebiliyor (15 TL'lik çay, 60 TL'lik
 * kahvede %20 = 12 TL) ve kuruşlu olabiliyor. Sorulunca: *"alt sınır
 * kalksın"* — yalnızca kafenin üst sınırı geçerli (göç 0052).
 *
 * ⚠️ Ürün fiyatı panelde sonradan değiştirilemiyor (Ü94, `urun.ts` ·
 * `adDegistir`), bu yüzden ödülde saklanan değer ürünün fiyatından
 * kaymıyor. Fiyat düzenleme bir gün gelirse bağlı ödüllerin değeri de
 * güncellenmeli.
 */

/**
 * Kafe hiç ayarlamadıysa üst sınır — Ü52'nin eski tavanı. Vitrin
 * simülasyonu da bu aralığı gösteriyor.
 */
export const ODUL_EN_COK = 50_00;
/** Elle yazılan tutarda tam TL — kuruşlu indirim kasada anlamsız (Ü52). */
export const ODUL_ADIM = 1_00;

/**
 * Ödül değeri geçerli mi — kafenin üst sınırına göre.
 *
 * ⚠️ Üst sınır parametre: sabit bir tavan artık yok, her kafenin kendi
 * tavanı var. Sabit bir değer burada kalsaydı kafenin panelde yazdığı
 * üst sınır ekranda görünür ama hiçbir şeyi değiştirmezdi.
 */
export function odulDegeriGecerliMi(kurus: number, ustSinirKurus: number): boolean {
  return Number.isInteger(kurus) && kurus > 0 && kurus <= ustSinirKurus;
}

/**
 * Ürünün fiyatından türeyen ödül değeri — Ü277.
 *
 * Yüzdede kuruşa yuvarlanıyor: 55 TL'de %15 = 8,25 TL. Kasada müşterinin
 * adisyonundan düşülen tutar bu, bütçeden rezerve edilen de bu.
 */
export function urundenDeger(tip: "product" | "percent", fiyatKurus: number, yuzde = 0): number {
  return tip === "product" ? fiyatKurus : Math.round((fiyatKurus * yuzde) / 100);
}

/** 1250 → "12,50" · 1200 → "12" */
function tlYaz(kurus: number): string {
  return (kurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

/**
 * E6: ödül için gereken kanıt seviyesi. Ü268'den beri **her ödül K2**.
 *
 * ── Geçmiş: kademeler önce kaydı (Ü52), sonra kalktı (Ü268) ──
 *
 * E6 ilk hâlinde 1–15 TL → K2, 16–50 TL → K3, 51+ → K4'tü. Ödül tabanı
 * 25 TL'ye çıkınca **her ödül K3 oldu** ve bu, çarkın ilk karekod akışını
 * sessizce öldürdü: karekodu yeni okutmuş bir ziyaretçi K2'de oluyor,
 * masada beş dakika geçirmiş olamaz. Ü52 kademeleri yeni aralığa taşıdı
 * (25–35 → K2, 40–50 → K3, 51+ → K4).
 *
 * Ü268'de ürün sahibi K3'ü (masada beş dakika) tamamen kaldırdı. Aynı
 * anda üst sınır kafenin oldu ve 51+ → K4 satırı da gitmek zorundaydı;
 * gerekçe aşağıda, fonksiyonun içinde.
 *
 * ⚠️ İkisi de bir güvenlik kuralının gevşemesi. Bilerek yapıldı ve karar
 * defterinde öyle yazıyor; kural geri istenirse tek satır.
 */
export function kanitSeviyesi(maliyetKurus: number): number {
  /*
    🔴 Ü268: "masada 5 dk" kuralı KALKTI — ürün sahibinin kararı:
    *"masada 5 dk diye bir kural olmayacak."* Her ödül için konum
    doğrulaması (K2) yetiyor.

    ⚠️ Bu kararın ikinci bir sonucu var ve ikisi birlikte alındı: eski
    formül 50 TL'nin üstüne **K4 (fiş kodu)** döndürüyordu ve K4 bilerek
    hiçbir yerden verilmiyor (Ü108). Üst sınır kafenin olunca (K5) o
    formül korunsaydı 50 TL'den pahalı her ödül **hiç kimseye
    düşmezdi** — K5'in kendi notu bunu önceden yazmıştı.

    Pahalı ödülün hâlâ iki koruması var: kuponu **yalnızca kasiyer**
    kapatabiliyor (uzaktan kazanılan kupon kafeye gelmeden
    kullanılamıyor) ve kaybı **bütçe** tavanlıyor — kupon ancak kafenin
    bütçesinden rezerve edilebiliyorsa çıkıyor. Kafe isterse ödüle
    günlük adet sınırı da koyuyor (Ü103), ama o isteğe bağlı.

    Parametre bilerek duruyor: kural geri gelirse imza değişmesin.
  */
  void maliyetKurus;
  return 2;
}

export async function listele(cafeId: string): Promise<Odul[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{
      id: string;
      reward_type: OdulTipi;
      title: string;
      description: string | null;
      cost_kurus: string;
      percent: number | null;
      points_price: number;
      kind: string;
      min_proof_level: number;
      product_id: string | null;
      urun_adi: string | null;
      urun_fiyat: string | null;
      active: boolean;
      acik_kupon: string;
      daily_limit: number | null;
      bugun_verilen: string;
      usable_days: number[] | null;
      usable_from_hour: number | null;
      usable_to_hour: number | null;
    }>(
      `SELECT r.id, r.reward_type, r.title, r.description, r.cost_kurus, r.percent,
              r.points_price, r.kind, r.min_proof_level, r.product_id,
              p.name AS urun_adi, p.price_kurus AS urun_fiyat, r.active,
              (SELECT count(*) FROM coupons c
                WHERE c.reward_id = r.id AND c.status IN ('pending','active')) AS acik_kupon,
              r.daily_limit, r.usable_days, r.usable_from_hour, r.usable_to_hour,
              (SELECT count(*) FROM coupons c
                WHERE c.reward_id = r.id AND c.status <> 'undone'
                  AND c.issued_at >= ((now() AT TIME ZONE 'Europe/Istanbul')::date::timestamp
                                       AT TIME ZONE 'Europe/Istanbul')) AS bugun_verilen
         FROM rewards r
         LEFT JOIN products p ON p.id = r.product_id
        ORDER BY r.active DESC, r.kind DESC, r.sort_order, r.points_price`,
    ),
  );

  return satirlar.map((r) => ({
    id: r.id,
    tip: r.reward_type,
    baslik: r.title,
    aciklama: r.description,
    maliyetKurus: Number(r.cost_kurus),
    yuzde: r.percent,
    puanFiyati: r.points_price,
    anlik: r.kind === "instant",
    kanitSeviyesi: r.min_proof_level,
    urunId: r.product_id,
    urunAdi: r.urun_adi,
    urunFiyatKurus: r.urun_fiyat === null ? null : Number(r.urun_fiyat),
    aktif: r.active,
    acikKupon: Number(r.acik_kupon),
    gunlukLimit: r.daily_limit,
    bugunVerilen: Number(r.bugun_verilen),
    pencereMetni: pencere.pencereYaz({
      gunler: r.usable_days,
      baslangicSaati: r.usable_from_hour,
      bitisSaati: r.usable_to_hour,
    }),
    pencere: {
      gunler: r.usable_days,
      baslangicSaati: r.usable_from_hour,
      bitisSaati: r.usable_to_hour,
    },
  }));
}

export async function ekle(opts: {
  cafeId: string;
  tip: OdulTipi;
  baslik: string;
  aciklama?: string;
  /**
   * Yalnızca TUTAR ödülünde — ve ürünsüz eski ürün ödülünde — okunuyor
   * (Ü277). Ürün seçildiyse değer ürünün fiyatından hesaplanıyor ve bu
   * alan yok sayılıyor: istemciden gelen bir sayı ürünün fiyatını ezmemeli.
   */
  maliyetKurus?: number;
  yuzde?: number;
  puanFiyati: number;
  anlik: boolean;
  urunId?: string;
  aktorId: string;
}): Promise<OdulSonucu> {
  const baslik = opts.baslik.trim();

  if (baslik.length < 2) return { ok: false, hata: "Ödül adı en az iki harf olmalı." };
  if (baslik.length > 60) return { ok: false, hata: "Ödül adı en fazla 60 karakter." };

  if (opts.tip === "percent") {
    if (!Number.isInteger(opts.yuzde) || (opts.yuzde ?? 0) < 1 || (opts.yuzde ?? 0) > 100) {
      return { ok: false, hata: "İndirim oranı 1 ile 100 arasında olmalı." };
    }
  } else if (opts.yuzde != null) {
    return {
      ok: false,
      hata:
        opts.tip === "amount"
          ? "Tutar indiriminde oran olmaz — tutarın kendisi giriliyor."
          : "Ürün ödülünde indirim oranı olmaz.",
    };
  }

  // Ü277: yüzde hep bir ürüne bağlı — TL karşılığı fiyat × oran.
  if (opts.tip === "percent" && !opts.urunId) {
    return {
      ok: false,
      hata: "Yüzde ödülünde ürünü seç — indirimin TL karşılığı ürünün fiyatından hesaplanıyor.",
    };
  }

  // Ü268 · K5: üst sınır kafenin. Ü277: alt sınır yok.
  const ustSinir = await ayar.sayiOku(opts.cafeId, ayar.ANAHTARLAR.odulUstSinir);

  /**
   * Ü52: puanla ödül alma kalktı; her ödül **oyunlardan ve çarktan
   * düşebilen** ödül. Bu yüzden `kind` her zaman `instant` ve puan
   * fiyatı her zaman sıfır.
   *
   * `points_price` kolonu şemada duruyor ve sıfır yazılıyor: kolonu
   * düşürmek eski kuponların bağlı olduğu satırları yeniden yazmayı
   * gerektirirdi ve kazancı yok. Kimse okumuyor.
   */
  const puanFiyati = 0;

  return withCafe(opts.cafeId, async (db) => {
    let fiyat: number | null = null;
    if (opts.urunId) {
      const urun = await db.one<{ price_kurus: string }>(
        `SELECT price_kurus FROM products WHERE id = $1 AND active`,
        [opts.urunId],
      );
      if (!urun) return { ok: false as const, hata: "Seçilen ürün bulunamadı." };
      fiyat = Number(urun.price_kurus);
    }

    // Ü277: ürün ve yüzde ödülünde değer ürünün fiyatından; tutar ödülünde
    // (ve ürünsüz eski ürün ödülünde) elle yazılan tutar.
    const elle = fiyat === null || opts.tip === "amount";
    const deger = elle
      ? (opts.maliyetKurus ?? 0)
      : urundenDeger(opts.tip as "product" | "percent", fiyat as number, opts.yuzde);

    if (elle && (!Number.isInteger(deger) || deger <= 0 || deger % ODUL_ADIM !== 0)) {
      return { ok: false as const, hata: "Tutar sıfırdan büyük ve tam TL olmalı." };
    }
    if (deger <= 0) {
      return { ok: false as const, hata: "Ödülün değeri sıfır çıkıyor — oranı ya da ürünü kontrol et." };
    }
    if (!odulDegeriGecerliMi(deger, ustSinir)) {
      return {
        ok: false as const,
        hata: `Bu ödül ${tlYaz(deger)} TL ediyor; kafenin ödül üst sınırı ${tlYaz(ustSinir)} TL. Üst sınırı "Açılma ve geçerlilik" kutusundan yükseltebilirsin.`,
      };
    }

    const id = newId("rwd");
    await db.query(
      `INSERT INTO rewards
         (id, cafe_id, kind, reward_type, title, description, points_price, cost_kurus,
          percent, product_id, min_proof_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        opts.cafeId,
        "instant",
        opts.tip,
        baslik,
        opts.aciklama?.trim() || null,
        puanFiyati,
        deger,
        opts.tip === "percent" ? opts.yuzde : null,
        opts.urunId ?? null,
        kanitSeviyesi(deger),
      ],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.create",
      targetType: "reward",
      targetId: id,
      detail: {
        tip: opts.tip,
        maliyetKurus: deger,
        urunId: opts.urunId ?? null,
        puanFiyati,
        anlik: opts.anlik,
        yuzde: opts.yuzde ?? null,
      },
    });

    return { ok: true as const, id, degerKurus: deger };
  });
}

export type AdSonucu =
  | { ok: true; etkilenenKupon: number }
  | { ok: false; hata: string };

/**
 * Ödülün adını ve açıklamasını düzeltir (Ü94).
 *
 * ⚠️ Bugüne kadar tek çare ödülü yayından kaldırıp yenisini eklemekti ve
 * hata sahada zaten yaşandı: kafe "Ice Americano" yerine **"ize amreicano"**
 * yazdı (Ü75). Yazım hatasının bedeli, ödülün geçmişini kaybetmek olmamalı.
 *
 * ── Neden yalnızca ad ve açıklama ────────────────────────────
 *
 * Değer, tip ve oran **değişmiyor**. Bunlar değişebilseydi kafe 30 TL'lik
 * bir ödülün adını "Ücretsiz çay" yapar, dolaşımdaki kuponu elinde tutan
 * oyuncu kasada 8 TL'lik bir şey alırdı. Bütçe ekranındaki söz burada da
 * geçerli: *"verilen söz geri alınmaz."* Değerin değişmesi ayrıca E10'un
 * rezerve hesabını da bozardı — kupon 30 TL bağlamışken ödül 8 TL olamaz.
 *
 * ⚠️ **Ad değişikliği dolaşımdaki kuponlara da yansıyor.** Kupon kartı adı
 * `rewards` satırından okuyor, kopyasını tutmuyor. Yazım hatası düzeltmesi
 * için doğru davranış bu — "ize amreicano" yazan kuponlar da düzeliyor.
 * Ama kötüye kullanılabilir bir kapı, o yüzden:
 *   1. kaç açık kuponun etkileneceği geri dönülüyor ve panelde **önceden**
 *      gösteriliyor — kafe sonucu görmeden değiştirmiyor,
 *   2. eski ve yeni ad denetim izine yazılıyor.
 *
 * ⚠️ Ü75'te ad denetim ayrıntısından **çıkarılmıştı**; gerekçe "ad zaten
 * targetId'nin işaret ettiği satırda duruyor" idi. Burada o gerekçe
 * geçmiyor: değişiklikten sonra eski ad hiçbir yerde kalmıyor. Yasak
 * anahtar listesi kişi adı içindir (`ad`, `name`, `first_name`); menü
 * metnini `oncekiBaslik` diye ayrı ve açık bir anahtarla yazıyoruz.
 */
export async function adDegistir(opts: {
  cafeId: string;
  odulId: string;
  baslik: string;
  aciklama?: string | null;
  aktorId: string;
}): Promise<AdSonucu> {
  const baslik = opts.baslik.trim();
  const aciklama = opts.aciklama?.trim() || null;

  if (baslik.length < 2) return { ok: false, hata: "Ödül adı en az iki harf olmalı." };
  if (baslik.length > 60) return { ok: false, hata: "Ödül adı en fazla 60 karakter." };

  return withCafe(opts.cafeId, async (db) => {
    const onceki = await db.one<{ title: string; description: string | null }>(
      `SELECT title, description FROM rewards WHERE id = $1`,
      [opts.odulId],
    );
    if (!onceki) return { ok: false as const, hata: "Ödül bulunamadı." };

    if (onceki.title === baslik && (onceki.description ?? null) === aciklama) {
      return { ok: false as const, hata: "Ad ve açıklama zaten böyle." };
    }

    const etkilenen = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM coupons
        WHERE reward_id = $1 AND status IN ('pending','active')`,
      [opts.odulId],
    );

    await db.query(`UPDATE rewards SET title = $2, description = $3 WHERE id = $1`, [
      opts.odulId,
      baslik,
      aciklama,
    ]);

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.rename",
      targetType: "reward",
      targetId: opts.odulId,
      detail: {
        oncekiBaslik: onceki.title,
        yeniBaslik: baslik,
        aciklamaDegisti: (onceki.description ?? null) !== aciklama,
        etkilenenAcikKupon: Number(etkilenen?.n ?? 0),
      },
    });

    return { ok: true as const, etkilenenKupon: Number(etkilenen?.n ?? 0) };
  });
}

export type SinirSonucu = { ok: true } | { ok: false; hata: string };

/**
 * Günlük adet limiti ve kullanım penceresi (Ü103).
 *
 * ── Neden ad düzeltmesinden AYRI ────────────────────────────
 *
 * Ü94 ad kutusunu bilerek dar tutmuştu: değer ve tip orada değişmiyor.
 * Bu ayar da oraya sığmıyor ama sebebi farklı — burada değişen şey ödülün
 * **ne olduğu** değil, **ne kadar ve ne zaman** dağıtıldığı. İkisi ayrı
 * karar, ayrı form.
 *
 * ⚠️ **Dolaşımdaki kuponları etkilemiyor mu?** Etkiliyor: pencere kupon
 * satırından değil ödül satırından okunuyor. Kafe pencereyi daraltırsa
 * elinde kupon olan oyuncu dünkü kuralla değil bugünkü kuralla karşılaşır.
 * Bu bilerek böyle: kafenin mutfağı akşam 17'de kapanıyorsa, dün verilmiş
 * kupon o gerçeği değiştirmiyor. Panel kaç kuponun etkileneceğini
 * **önceden** söylüyor (Ü94'teki aynı kural).
 */
export async function siniriDegistir(opts: {
  cafeId: string;
  odulId: string;
  gunlukLimit: number | null;
  gunler: number[] | null;
  baslangicSaati: number | null;
  bitisSaati: number | null;
  aktorId: string;
}): Promise<SinirSonucu> {
  if (opts.gunlukLimit != null && (!Number.isInteger(opts.gunlukLimit) || opts.gunlukLimit < 1)) {
    return { ok: false, hata: "Günlük adet en az 1 olmalı. Sınırsız için boş bırak." };
  }

  const saatVar = opts.baslangicSaati != null || opts.bitisSaati != null;
  if (saatVar && (opts.baslangicSaati == null || opts.bitisSaati == null)) {
    return { ok: false, hata: "Saat aralığının iki ucu da girilmeli." };
  }
  if (saatVar && opts.bitisSaati! <= opts.baslangicSaati!) {
    // Ü90'daki aynı bilinen sınır: pencere gece yarısını aşamıyor.
    return { ok: false, hata: "Bitiş saati başlangıçtan sonra olmalı. Pencere gece yarısını aşamıyor." };
  }
  if (opts.gunler != null && (opts.gunler.length === 0 || opts.gunler.some((g) => g < 0 || g > 6))) {
    return { ok: false, hata: "En az bir gün seçilmeli. Hepsi geçerliyse gün seçme." };
  }

  return withCafe(opts.cafeId, async (db) => {
    const etkilenen = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM coupons
        WHERE reward_id = $1 AND status IN ('pending','active')`,
      [opts.odulId],
    );

    const r = await db.query(
      `UPDATE rewards
          SET daily_limit = $2, usable_days = $3,
              usable_from_hour = $4, usable_to_hour = $5
        WHERE id = $1`,
      [
        opts.odulId,
        opts.gunlukLimit,
        opts.gunler != null && opts.gunler.length === 7 ? null : opts.gunler,
        opts.baslangicSaati,
        opts.bitisSaati,
      ],
    );
    if (!r.rowCount) return { ok: false as const, hata: "Ödül bulunamadı." };

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.update",
      targetType: "reward",
      targetId: opts.odulId,
      detail: {
        gunlukLimit: opts.gunlukLimit,
        gunler: opts.gunler,
        baslangicSaati: opts.baslangicSaati,
        bitisSaati: opts.bitisSaati,
        etkilenenAcikKupon: Number(etkilenen?.n ?? 0),
      },
    });

    return { ok: true as const };
  });
}

/** Ödülü yayından kaldırır veya geri açar. Silinmiyor — geçmiş kuponlar bağlı. */
export async function durumDegistir(opts: {
  cafeId: string;
  odulId: string;
  aktif: boolean;
  aktorId: string;
}): Promise<boolean> {
  return withCafe(opts.cafeId, async (db) => {
    const r = await db.query(`UPDATE rewards SET active = $2 WHERE id = $1`, [
      opts.odulId,
      opts.aktif,
    ]);
    if (!r.rowCount) return false;

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.update",
      targetType: "reward",
      targetId: opts.odulId,
      detail: { aktif: opts.aktif },
    });
    return true;
  });
}
