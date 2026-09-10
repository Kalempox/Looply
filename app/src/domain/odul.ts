import * as pencere from "./kullanim-penceresi";
import { withBypass } from "@/db/context";
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
  /** Ödülün adı — "1 Filtre Kahve" veya "%20 · Latte". TL yok (E9). */
  baslik: string;
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
  /** Kullanılmış, süresi dolmuş veya geri alınmışlar. */
  gecmis: EnvanterKuponu[];
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
  const sonuc: Envanter = { kullanilabilir: [], yeniAcilan: [], bekleyen: [], gecmis: [] };

  for (const r of satirlar) {
    const durum = durumBelirle(r, simdi);
    const kupon: EnvanterKuponu = {
      id: r.id,
      baslik: baslikYaz(r),
      tur: turBelirle(r),
      kategoriTuru: (r.kategori_turu as KategoriTuru | null) ?? null,
      cafeId: r.cafe_id,
      cafeAdi: r.cafe_adi,
      durum,
      aktiflesme: r.activates_at,
      sonKullanim: r.expires_at,
      pencereMetni: pencere.pencereYaz({
        gunler: r.usable_days,
        baslangicSaati: r.usable_from_hour,
        bitisSaati: r.usable_to_hour,
      }),
    };

    if (durum === "kullanilabilir") {
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
    else sonuc.gecmis.push(kupon);
  }

  return sonuc;
}

/* ── Kupon detayı — oyuncu tarafı ──────────────────────────── */

export type KuponDetayi = {
  id: string;
  baslik: string;
  tur: KuponTuru;
  kategoriTuru: KategoriTuru | null;
  cafeAdi: string;
  durum: KuponDurumu;
  /** Kasiyerin okutacağı QR jetonu. İçinde ödül bilgisi yok (Ü19). */
  jeton: string;
  /** Kamera çalışmazsa yedek yol (Ü19). */
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

  return {
    id: r.id,
    baslik: baslikYaz(r),
    tur: turBelirle(r),
    kategoriTuru: (r.kategori_turu as KategoriTuru | null) ?? null,
    cafeAdi: r.cafe_adi,
    durum: durumBelirle(r, Date.now()),
    jeton: r.qr_token,
    kod: r.code,
    aktiflesme: r.activates_at,
    sonKullanim: r.expires_at,
    pencereMetni: pencere.pencereYaz({
      gunler: r.usable_days,
      baslangicSaati: r.usable_from_hour,
      bitisSaati: r.usable_to_hour,
    }),
  };
}
