import * as pencere from "./kullanim-penceresi";
import { withBypass } from "@/db/context";
import { newId } from "@/lib/ids";
import type { KategoriTuru } from "./kategori-tur";

/**
 * Oyuncunun ödül envanteri — "Ödüllerim" ekranının kaynağı.
 *
 * **E9 burada uygulanıyor.** Oyuncu ekranı ödülün *adını* gösterir;
 * TL değerini ve geçerlilik damgasını **göstermez**. Bu yüzden aşağıdaki
 * tipte `kurus` diye bir alan yok — ekran isteseydi bile basamazdı.
 * Değeri yalnızca kasiyer ekranı görür (Faz 7).
 *
 * Gerekçe ürünün kendisinde: kasiyerin sistemi atlaması tasarımla
 * engelleniyor. Telefonunda "80 TL" yazan bir ekran gösterip kasada
 * geçerli sayılmasını istemek mümkün olmamalı.
 *
 * **Neden `withBypass`:** envanter kafeler arası bir görünüm — kupon
 * oyuncunun, ama kafe adı `cafes`'ten, ödül adı `rewards`'tan geliyor ve
 * bu iki tabloda oyuncu politikası **yok** (0003: yalnızca bypass ve
 * tenant). Oyuncu bağlamında sorgu sıfır satır döndürürdü ve ekran
 * sessizce boş kalırdı. `masa.aktif()` aynı sebeple aynı yolu izliyor.
 * Süzgeç bu yüzden SQL'de açıkça duruyor: `k.player_id = $1`.
 */

export type KuponDurumu =
  | "beklemede"
  | "kullanilabilir"
  | "kullanildi"
  | "suresi_doldu"
  | "geri_alindi";

/**
 * Kuponun cinsi — ekranda **renk** olarak kullanılıyor (Ü65).
 *
 * Değer değil cins: E9 kuponun TL karşılığını gizliyor, ne olduğunu
 * değil. "Ücretsiz filtre kahve" ile "%10 indirim" zaten adlarından
 * ayrılıyor; cins bilgisi yalnızca beş kuponun beşinin aynı renkte
 * olmasını engelliyor.
 */
export type KuponTuru = "urun" | "yuzde" | "tutar";

export type EnvanterKuponu = {
  id: string;
  /**
   * Ödülün adı — "1 Filtre Kahve" veya "%20 · Latte". TL yok (E9).
   *
   * ⚠️ **Kapalı kuponda `null`** (Ü141). Oyun ödülü kazınarak açılıyor
   * ve adı o ana kadar istemciye hiç gönderilmiyor; gönderilseydi
   * kazıma bir perde olurdu.
   */
  baslik: string | null;
  /**
   * Ü141: kupon henüz kazınıp açılmadı mı?
   *
   * Kapalıyken ekran ne adı ne cinsini biliyor — kazıma yüzeyi
   * gösteriliyor. Açılınca sunucudan ad geliyor ve kart olağan hâline
   * dönüyor.
   */
  kapali: boolean;
  tur: KuponTuru;
  /**
   * Ü75: bağlı ürünün kategori türü — kartın çizimini bu seçiyor.
   *
   * `null` ise kupon bir ürüne bağlı değil ya da ürünün kategorisi yok;
   * ekran o zaman başlıktan tahmin etmeye düşüyor.
   */
  kategoriTuru: KategoriTuru | null;
  cafeId: string;
  cafeAdi: string;
  durum: KuponDurumu;
  /** A5: büyük ödül yarından itibaren geçerli. */
  aktiflesme: Date;
  sonKullanim: Date;
  /**
   * Ü103: kullanım penceresi cümlesi — kısıt yoksa `null`.
   *
   * ⚠️ E9 TL'yi saklıyor, Ü97 açılma saatini saklıyor; **bu saklanmıyor.**
   * İkisi de oyuncunun elindeki şeyi kullanabilmesini engellemiyor,
   * kullanım penceresi ise engelliyor: bilinmezse oyuncu kasaya gidiyor,
   * reddediliyor ve suçu kafeye yüklüyor.
   */
  pencereMetni: string | null;
};

/** Ü98: bir kuponun "yeni açıldı" sayılacağı pencere. */
export const YENI_ACILDI_SAAT = 24;

export type Envanter = {
  /**
   * Ü141: kazınmayı bekleyen kuponlar — henüz ne olduğu bilinmiyor.
   *
   * ⚠️ Diğer listelerin alt kümesi **değil**, onlardan çıkarılmış ayrı
   * bir liste. Sebebi `yeniAcilan`ınkinin tam tersi: kapalı kupon
   * kasada gösterilemez, yani "Kasada gösterebilirsin" sayacına ve
   * listesine girmesi oyuncuyu kasaya boşuna gönderirdi. Önce açılacak,
   * sonra olağan yerine oturacak.
   *
   * Aktifleşmiş de bekleyen de kapalı olabiliyor: kazıma *ne olduğunu*
   * söylüyor, aktifleşme *ne zaman kullanılacağını* (Ü97). İkisi ayrı
   * sorular ve ayrı kalmalı — bekleyen kupon da kazınabilsin ki
   * oyuncunun beklerken yapacak bir şeyi olsun.
   */
  kazinacak: EnvanterKuponu[];
  kullanilabilir: EnvanterKuponu[];
  /**
   * Son 24 saatte açılan kuponlar (Ü98).
   *
   * ⚠️ `kullanilabilir` listesinin **alt kümesi**, ayrı bir liste değil —
   * aynı kupon iki yerde de duruyor. Ayırsaydık oyuncu ödülünü alışık
   * olduğu yerde bulamazdı; buradaki tek iş, açılma anını **bir kez**
   * kutlamak. Yirmi dört saat sonra kutlama kendiliğinden kayboluyor,
   * ödül yerinde kalıyor.
   *
   * Açılma anı `coupon_events` defterinden okunuyor; kupona kolon
   * eklenmiyor (E3).
   */
  yeniAcilan: EnvanterKuponu[];
  /** Beklemede olanlar — henüz aktifleşmemiş (A5). */
  bekleyen: EnvanterKuponu[];
  /**
   * Ü128: geçmiş **ikiye ayrıldı** — kullanılan ve kaçırılan.
   *
   * Önce tek bir `gecmis` listesiydi ve ikisi aynı sönük yığında
   * duruyordu. Oyuncunun bu iki satırdan çıkardığı anlam taban tabana
   * zıt: biri *"bunu yaşadım"*, öbürü *"bunu kaçırdım"*. Aynı başlık
   * altında ikisi de bir şey ifade etmiyordu.
   *
   * ⚠️ Geri alınan kupon (`geri_alindi`, kasiyerin işlemi bozması)
   * **kaçırılanlarla** duruyor, kullanılanlarla değil: oyuncu o ödülü
   * fiilen almadı. Kartın kendi etiketi "Geri alındı" diyor, yani hangi
   * sebeple olduğu kaybolmuyor.
   */
  kullanilan: EnvanterKuponu[];
  /** Süresi dolmuş ya da geri alınmışlar — oyuncunun eline geçmeyenler. */
  kacirilan: EnvanterKuponu[];
};

type Satir = {
  id: string;
  cafe_id: string;
  cafe_adi: string;
  status: string;
  activates_at: Date;
  expires_at: Date;
  odul_adi: string | null;
  odul_tipi: string | null;
  kampanya_yuzde: number | null;
  urun_adi: string | null;
  kategori_turu: string | null;
  /** Ü141: NULL ise kupon henüz kazınmadı. */
  revealed_at: Date | null;
  acilma_ani: Date | null;
  usable_days: number[] | null;
  usable_from_hour: number | null;
  usable_to_hour: number | null;
};

/**
 * Kuponun gerçek hâli.
 *
 * **Zaman karar verir, `status` kolonu onu takip eder.** Kolon bir bakım
 * işiyle güncelleniyor (`bekleyenleriAc`); o iş gecikirse satır `pending`
 * kalır. Ekran buna bakarsa, dün açılması gereken ödül bugün hâlâ "yarın
 * açılıyor" der ve oyuncu hak ettiği kuponu kullanamaz. Bu yüzden karar
 * `activates_at` ve `expires_at`e dayanıyor — bakım işi yalnızca bütçe
 * iadesini ve defteri toparlıyor.
 */
function durumBelirle(r: Satir, simdi: number): KuponDurumu {
  if (r.status === "redeemed") return "kullanildi";
  if (r.status === "undone") return "geri_alindi";
  if (r.status === "expired" || r.expires_at.getTime() <= simdi) return "suresi_doldu";
  if (r.activates_at.getTime() > simdi) return "beklemede";
  return "kullanilabilir";
}

/**
 * Kupon başlığı.
 *
 * Yüzde kampanyasında yüzde gösteriliyor ama **TL tavanı gösterilmiyor**
 * (Ü17 ile tavan bütçeye giren bir TL değeri oldu; E9 onu oyuncudan
 * saklıyor). Oyuncunun bilmesi gereken şey "nerede ne kullanabilirim".
 */
function baslikYaz(r: Satir): string {
  if (r.odul_adi) return r.odul_adi;
  if (r.kampanya_yuzde != null) {
    return r.urun_adi ? `%${r.kampanya_yuzde} · ${r.urun_adi}` : `%${r.kampanya_yuzde} indirim`;
  }
  return "Ödül";
}

/**
 * Kuponun cinsi.
 *
 * Yüzde kampanyası kuponları `rewards` tablosuna hiç uğramıyor
 * (`reward_id` boş, `campaign_id` dolu); bu yüzden kampanya kontrolü
 * ödül tipinden önce geliyor. Tanınmayan tip "tutar" sayılıyor —
 * yalnızca renk seçiyor, yanlış olması bir hak kaybına yol açmıyor.
 */
function turBelirle(r: Satir): KuponTuru {
  if (r.kampanya_yuzde != null) return "yuzde";
  if (r.odul_tipi === "product") return "urun";
  if (r.odul_tipi === "percent") return "yuzde";
  return "tutar";
}

export async function envanter(playerId: string): Promise<Envanter> {
  const satirlar = await withBypass("ödül envanteri — kafe ve ödül adları", (db) =>
    db.all<Satir>(
      `SELECT k.id, k.cafe_id, c.name AS cafe_adi, k.status,
              k.activates_at, k.expires_at,
              r.title    AS odul_adi,
              r.reward_type AS odul_tipi,
              pc.percent AS kampanya_yuzde,
              p.name     AS urun_adi,
              COALESCE(rk.kind, pk.kind) AS kategori_turu,
              -- Ü141: kazınıp açıldı mı? NULL ise ad istemciye gitmiyor.
              k.revealed_at,
              -- Ü98: kupon ne zaman açıldı? Defterden okunuyor,
              -- kupona kolon eklenmiyor (E3).
              -- Ters tırnak YOK: bu metin bir template literal içinde ve
              -- coupon_events'i vurgulamak için konan ters tırnak dizgiyi
              -- kapatıp dosyayı derlenemez yapmıştı.
              (SELECT ce.created_at FROM coupon_events ce
                WHERE ce.coupon_id = k.id AND ce.event = 'activated'
                ORDER BY ce.created_at DESC LIMIT 1) AS acilma_ani
         FROM coupons k
         JOIN cafes c ON c.id = k.cafe_id
         LEFT JOIN rewards r ON r.id = k.reward_id
         LEFT JOIN percentage_campaigns pc ON pc.id = k.campaign_id
         LEFT JOIN products p ON p.id = pc.product_id
         -- Ü75: kategori iki yoldan gelebiliyor — ödülün kendi ürünü ya
         -- da kampanyanın ürünü. COALESCE hangisi doluysa onu alıyor.
         LEFT JOIN products rp ON rp.id = r.product_id
         LEFT JOIN product_categories rk ON rk.id = rp.category_id
         LEFT JOIN product_categories pk ON pk.id = p.category_id
        WHERE k.player_id = $1
        ORDER BY k.issued_at DESC`,
      [playerId],
    ),
  );

  const simdi = Date.now();
  const sonuc: Envanter = {
    kazinacak: [],
    kullanilabilir: [],
    yeniAcilan: [],
    bekleyen: [],
    kullanilan: [],
    kacirilan: [],
  };

  for (const r of satirlar) {
    const durum = durumBelirle(r, simdi);
    /**
     * Ü141: kapalı kupon hakkında istemciye **hiçbir ipucu gitmiyor.**
     *
     * Yalnızca adı saklamak yetmezdi: `tur` ("yüzde" mi "ürün" mü),
     * `kategoriTuru` (kartın çizimini seçen şey — tatlı, sıcak içecek)
     * ve `pencereMetni` ("yalnızca hafta içi öğleden sonra") üçü birden
     * ödülü büyük ölçüde ele verir. Kazınmamış kart, cinsini de
     * söylemeyen boş bir kart olmalı.
     */
    const kapali = r.revealed_at === null;
    const kupon: EnvanterKuponu = {
      id: r.id,
      baslik: kapali ? null : baslikYaz(r),
      kapali,
      tur: kapali ? "urun" : turBelirle(r),
      kategoriTuru: kapali ? null : ((r.kategori_turu as KategoriTuru | null) ?? null),
      cafeId: r.cafe_id,
      cafeAdi: r.cafe_adi,
      durum,
      aktiflesme: r.activates_at,
      sonKullanim: r.expires_at,
      pencereMetni: kapali
        ? null
        : pencere.pencereYaz({
            gunler: r.usable_days,
            baslangicSaati: r.usable_from_hour,
            bitisSaati: r.usable_to_hour,
          }),
    };

    /*
      Ü141: kapalı kupon kendi yuvasına gidiyor ve başka hiçbir listeye
      girmiyor.

      ⚠️ Süresi dolmuş ya da kullanılmış bir kupon kapalı olsa bile
      buraya DÜŞMÜYOR (aşağıdaki koşul yalnızca yaşayan iki durumu
      alıyor): kazınacak bir şey kalmamış bir kuponu kazıtmak, oyuncuya
      elde edemeyeceği bir ödülü açtırmak olurdu. Geçmişte öyle bir
      satır varsa olağan yerinde, adsız duruyor.
    */
    if (kapali && (durum === "kullanilabilir" || durum === "beklemede")) {
      sonuc.kazinacak.push(kupon);
    }
    else if (durum === "kullanilabilir") {
      sonuc.kullanilabilir.push(kupon);

      // Ertelenmemiş kupon hiç "açılmıyor" — kazanıldığı anda kullanıma
      // hazır ve defterde `activated` satırı yok. Kutlanacak bir an da yok.
      if (
        r.acilma_ani &&
        simdi - r.acilma_ani.getTime() < YENI_ACILDI_SAAT * 3_600_000
      ) {
        sonuc.yeniAcilan.push(kupon);
      }
    }
    else if (durum === "beklemede") sonuc.bekleyen.push(kupon);
    else if (durum === "kullanildi") sonuc.kullanilan.push(kupon);
    else sonuc.kacirilan.push(kupon);
  }

  return sonuc;
}

/* ── Kupon detayı — oyuncu tarafı ──────────────────────────── */

export type KuponDetayi = {
  id: string;
  /** ⚠️ Ü141: kapalı kuponda `null` — bkz. `EnvanterKuponu.baslik`. */
  baslik: string | null;
  /**
   * Ü141: henüz kazınmadı.
   *
   * 🔴 Bu alan listede olup burada olmasaydı, sızıntı kapanmış
   * görünürken açık kalırdı: kupon detayı ayrı bir sayfa (`/oduller/
   * [kuponId]`) ve adresi tahmin edilebilir. Kapalı kuponun adı listede
   * saklanıp detayda yazılsaydı kazıma tamamen anlamsız olurdu — aynı
   * "bir yerde kapatıldı, öbür yol açık kaldı" sınıfı Ü113'te bir kez
   * yaşandı.
   */
  kapali: boolean;
  tur: KuponTuru;
  kategoriTuru: KategoriTuru | null;
  cafeAdi: string;
  durum: KuponDurumu;
  /**
   * Kasiyerin okutacağı QR jetonu. İçinde ödül bilgisi yok (Ü19).
   *
   * ⚠️ Kapalı kuponda **boş**: jeton verilseydi oyuncu ödülü hiç
   * açmadan kasada okutabilir, ödülün adını ilk kez kasiyerin
   * ekranında görürdü. Veritabanındaki kısıt (0041) bunu zaten
   * reddediyor; burada jetonun hiç üretilmemesi aynı kapının önündeki
   * ikinci kilit.
   */
  jeton: string;
  /** Kamera çalışmazsa yedek yol (Ü19). Kapalı kuponda boş. */
  kod: string;
  aktiflesme: Date;
  sonKullanim: Date;
  /** Ü103: kullanım penceresi cümlesi — kısıt yoksa `null`. */
  pencereMetni: string | null;
};

/**
 * Tek bir kuponun oyuncuya gösterilecek hâli.
 *
 * **E9'un en keskin yeri burası.** Dönen tipte TL değeri yok, geçerlilik
 * damgası yok. Süresi dolmuş bir kupon telefonda geçerli olanla neredeyse
 * aynı görünüyor — kasiyerin telefona bakıp ürün vermesi böyle engelleniyor.
 * Durum yalnızca oyuncunun kendini yönetmesi için var ("yarın açılıyor"),
 * kasiyere kanıt olarak sunulacak bir şey değil.
 */
export async function kuponDetayi(playerId: string, kuponId: string): Promise<KuponDetayi | null> {
  const r = await withBypass("kupon detayı", (db) =>
    db.one<Satir & { qr_token: string; code: string }>(
      `SELECT k.id, k.cafe_id, c.name AS cafe_adi, k.status,
              k.activates_at, k.expires_at, k.qr_token, k.code,
              r.title    AS odul_adi,
              r.reward_type AS odul_tipi,
              pc.percent AS kampanya_yuzde,
              p.name     AS urun_adi,
              COALESCE(rk.kind, pk.kind) AS kategori_turu,
              k.revealed_at,
              r.usable_days, r.usable_from_hour, r.usable_to_hour
         FROM coupons k
         JOIN cafes c ON c.id = k.cafe_id
         LEFT JOIN rewards r ON r.id = k.reward_id
         LEFT JOIN percentage_campaigns pc ON pc.id = k.campaign_id
         LEFT JOIN products p ON p.id = pc.product_id
         -- Ü75: kategori iki yoldan gelebiliyor — ödülün kendi ürünü ya
         -- da kampanyanın ürünü. COALESCE hangisi doluysa onu alıyor.
         LEFT JOIN products rp ON rp.id = r.product_id
         LEFT JOIN product_categories rk ON rk.id = rp.category_id
         LEFT JOIN product_categories pk ON pk.id = p.category_id
        WHERE k.id = $1 AND k.player_id = $2`,
      [kuponId, playerId],
    ),
  );

  if (!r) return null;

  // Ü141: kazınmamış kupon hakkında hiçbir şey dönmüyor — ad, cins,
  // kullanım penceresi ve kasada okutulacak jeton dahil.
  const kapali = r.revealed_at === null;

  return {
    id: r.id,
    baslik: kapali ? null : baslikYaz(r),
    kapali,
    tur: kapali ? "urun" : turBelirle(r),
    kategoriTuru: kapali ? null : ((r.kategori_turu as KategoriTuru | null) ?? null),
    cafeAdi: r.cafe_adi,
    durum: durumBelirle(r, Date.now()),
    jeton: kapali ? "" : r.qr_token,
    kod: kapali ? "" : r.code,
    aktiflesme: r.activates_at,
    sonKullanim: r.expires_at,
    pencereMetni: kapali
      ? null
      : pencere.pencereYaz({
          gunler: r.usable_days,
          baslangicSaati: r.usable_from_hour,
          bitisSaati: r.usable_to_hour,
        }),
  };
}

/* ── Kazıyarak açma (Ü141) ─────────────────────────────────── */

export type KazimaSonucu =
  | { ok: true; baslik: string; tur: KuponTuru; kategoriTuru: KategoriTuru | null }
  | { ok: false };

/**
 * Kuponu kazınmış sayar ve ödülün adını **ilk kez** döndürür.
 *
 * ── Neden sunucuda ──────────────────────────────────────────
 *
 * Kazıma yüzeyi tarayıcıda çiziliyor ama açılma kararı orada
 * verilemez: ad zaten istemcide olsaydı kazımaya gerek kalmazdı
 * (bkz. `EnvanterKuponu.baslik`). İstemci "kazıdım" diyor, sunucu
 * defteri yazıyor ve karşılığında adı veriyor.
 *
 * ── Aynı anda iki kez çağrılırsa ────────────────────────────
 *
 * `WHERE revealed_at IS NULL` koşulu güncellemenin **kendisinde**:
 * ikinci çağrı sıfır satır günceller ve defter satırı bir kez yazılır.
 * Önce okuyup sonra yazsaydık iki sekmeden aynı anda kazıyan oyuncu
 * kuponun hikâyesine iki `revealed` satırı düşürürdü. Oyuncu açısından
 * ikisi de aynı sonucu veriyor — ad dönüyor; tekrar çağırmak hata
 * değil, çünkü kazıma yarıda kesilip yeniden denenebilir.
 *
 * ── Sahiplik ────────────────────────────────────────────────
 *
 * `player_id = $2` süzgeci sorguda **açıkça** duruyor: bu kod
 * `withBypass` içinde koşuyor (ödül ve kafe adları oyuncu politikası
 * altında okunamıyor, bkz. dosya başı) ve orada RLS kapalı. Süzgeç
 * yalnızca politikaya bırakılsaydı başkasının kuponu açılabilirdi.
 */
export async function kaz(playerId: string, kuponId: string): Promise<KazimaSonucu> {
  await withBypass("kupon kazıma — açılış kaydı", async (db) => {
    const acildi = await db.one<{ cafe_id: string }>(
      `UPDATE coupons SET revealed_at = now()
        WHERE id = $1 AND player_id = $2 AND revealed_at IS NULL
        RETURNING cafe_id`,
      [kuponId, playerId],
    );

    if (acildi) {
      await db.query(
        `INSERT INTO coupon_events (id, coupon_id, cafe_id, event)
         VALUES ($1, $2, $3, 'revealed')`,
        [newId("cev"), kuponId, acildi.cafe_id],
      );
    }
  });

  /*
    ⚠️ Ad **yazma bağlamının dışında** okunuyor.

    `kuponDetayi` kendi `withBypass`ini açıyor; içeride çağrılsaydı iç
    içe iki bağlam olurdu — ikinci bir bağlantı, ve yazma henüz
    işlenmemişse okuma kuponu hâlâ kapalı görürdü. O durumda kazıyan
    oyuncuya "açılamadı" denirdi, oysa kupon açılmış olurdu.

    Adı `UPDATE ... RETURNING` ile almak da mümkün değil: ad
    `rewards`/`percentage_campaigns` tarafında ve "yüzde mi ürün mü"
    başlık kuralı tek bir yerde yazılı — `kuponDetayi` onu zaten
    uyguluyor, ikinci bir kopyası olmamalı.
  */
  const detay = await kuponDetayi(playerId, kuponId);
  if (!detay || detay.kapali || detay.baslik === null) return { ok: false };

  return {
    ok: true,
    baslik: detay.baslik,
    tur: detay.tur,
    kategoriTuru: detay.kategoriTuru,
  };
}
