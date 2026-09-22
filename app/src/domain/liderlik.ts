import { withBypass, type Db } from "@/db/context";
import { decryptPII } from "@/lib/crypto";
import { isGunu, pazartesi, gunEkle, gunFarki } from "@/lib/tarih";

/**
 * Liderlik tablosu — bugünün ve tüm zamanların.
 *
 * ── Neden tahtın yerine geçti ───────────────────────────────
 *
 * Ö1'in "masa tahtı" kartı tek bir kişiyi gösteriyordu: o masanın kralı.
 * İki sorun vardı. Birincisi **masa**: oyuncu hangi masada oturduğunu
 * zaten biliyor, "Masa 3 tahtı" ona kafedeki yerini değil, sisteme ait bir
 * iç kavramı anlatıyordu. İkincisi **tek satır**: bir kişilik sıralamada
 * yarışacak bir şey yok — ikinci sıradaki kendini göremiyor.
 *
 * Yerine kafenin bugünkü sıralaması geçti. Taht mekanizması (`taht.ts`)
 * duruyor; ekrandan kalktı, çünkü bu liste onun sorduğu soruyu daha iyi
 * cevaplıyor.
 *
 * ── Ad maskeleme ────────────────────────────────────────────
 *
 * Ürün sahibinin kararı: **ad + soyadın baş harfi**, gerisi yıldız —
 * `Mert Y***`. Taht kartı soyadı hiç çözmüyordu; bu liste baş harfi için
 * çözüyor ve **yalnızca ilk karakteri** dışarı veriyor. Çözülen tam soyad
 * `maskele()` dışına hiçbir koşulda çıkmıyor.
 *
 * Oyuncu adını `/verilerim`den kapattıysa (göç 0015) listede kafeye özel
 * anonim koduyla duruyor — sıradan düşmüyor, yalnızca adı gizleniyor.
 *
 * ── Ekonomik avantaj yok ────────────────────────────────────
 *
 * Tahtta olduğu gibi burada da sıralama puan, kupon veya çarpan
 * **vermiyor**. Bu dosya hiçbir deftere yazmıyor; yalnızca okuyor. Sıralama
 * için oyun tekrarlamak kimseye bir şey kazandırmadığı sürece yeni bir
 * suistimal yüzeyi de açmıyor (E5).
 */

export type LiderSatiri = {
  sira: number;
  /** Maskelenmiş ad ya da — oyuncu kapattıysa — kafeye özel anonim kod. */
  gorunenAd: string;
  deger: number;
  /** Bakan oyuncunun kendisi mi — ekran satırı vurguluyor. */
  benMiyim: boolean;
};

export type Liste = {
  satirlar: LiderSatiri[];
  /**
   * Bakan oyuncu ilk N'e giremediyse kendi satırı.
   *
   * Listede olmayan kişiye "sen yoksun" demek yerine kaçıncı olduğunu
   * söylüyoruz: sıralamanın işe yaraması için insanın kendini görmesi
   * gerekiyor. İlk N'in içindeyse `null` — aynı satır iki kez çıkmasın.
   */
  benimSiram: LiderSatiri | null;
};

/** Ekranda gösterilen satır sayısı. */
export const LISTE_BOYU = 10;

type HamSatir = {
  player_id: string;
  deger: string;
  ad_gorunur: boolean;
  ad_enc: Buffer;
  soyad_enc: Buffer;
  takma_ad: string | null;
};

/**
 * `Mert Yılmaz` → `Mert Y***`
 *
 * Yıldız sayısı **sabit**: soyadın uzunluğuyla değişseydi maske bilgi
 * sızdırırdı — üç harfli bir soyadı olan kişiyi kalabalıkta bulmak,
 * yıldızları saymakla mümkün olurdu.
 */
function maskele(adEnc: Buffer, soyadEnc: Buffer): string {
  const ad = decryptPII(adEnc).trim();
  const soyad = decryptPII(soyadEnc).trim();
  const bas = soyad ? `${soyad[0].toLocaleUpperCase("tr-TR")}***` : "";
  return bas ? `${ad} ${bas}` : ad;
}

function satiraCevir(r: HamSatir, sira: number, bakan: string | null): LiderSatiri {
  return {
    sira,
    gorunenAd: r.ad_gorunur ? maskele(r.ad_enc, r.soyad_enc) : (r.takma_ad ?? "Bir oyuncu"),
    deger: Number(r.deger),
    benMiyim: r.player_id === bakan,
  };
}

/**
 * Listeyi kurar ve bakan oyuncu ilk N'de değilse kendi satırını ekler.
 *
 * Sıra numarası SQL'den değil buradan geliyor: `row_number()` ile
 * hesaplansaydı "benim sıram" sorgusunun ayrıca aynı pencereyi kurması
 * gerekirdi. Tek yerden numaralamak iki listenin ayrışmasını imkânsız
 * kılıyor.
 */
async function listeKur(
  db: Db,
  bakan: string | null,
  hepsi: HamSatir[],
): Promise<Liste> {
  const satirlar = hepsi.slice(0, LISTE_BOYU).map((r, i) => satiraCevir(r, i + 1, bakan));

  let benimSiram: LiderSatiri | null = null;
  if (bakan && !satirlar.some((s) => s.benMiyim)) {
    const i = hepsi.findIndex((r) => r.player_id === bakan);
    if (i >= 0) benimSiram = satiraCevir(hepsi[i], i + 1, bakan);
  }

  return { satirlar, benimSiram };
}

/* ── Bugünün listesi ───────────────────────────────────────── */

/**
 * Bugün bu kafede, günün oyununda yapılan en yüksek skorlar.
 *
 * ── Neden tek oyun ──────────────────────────────────────────
 *
 * Taht kartıyla aynı gerekçe: Blok'ta 1.240 ile Düşen'de 1.240 aynı şey
 * değil. Farklı oyunları tek listede yarıştırmak sıralamayı anlamsız
 * kılardı.
 *
 * ── Neden masa yok ──────────────────────────────────────────
 *
 * Liste kafe düzeyinde: oyuncunun merak ettiği şey "bu kafede kaçıncıyım",
 * "bu masada kaçıncıyım" değil. Masa süzgeci listeyi çoğu kafede tek
 * satıra indirirdi.
 *
 * ── Neden oyuncu başına tek satır ───────────────────────────
 *
 * `DISTINCT ON`: aynı kişi gün içinde beş kez oynadıysa listeyi tek başına
 * doldurmamalı. En iyi skoru sayılıyor.
 */
export async function bugun(opts: {
  cafeId: string;
  oyunId: string;
  bakanId: string | null;
  gun?: string;
}): Promise<Liste> {
  const gun = opts.gun ?? isGunu();

  return withBypass("bugünün liderlik tablosu", async (db) => {
    const hepsi = await db.all<HamSatir>(
      `SELECT DISTINCT ON (ps.player_id)
              ps.player_id,
              ps.server_score AS deger,
              p.leaderboard_name_visible AS ad_gorunur,
              p.first_name_enc AS ad_enc,
              p.last_name_enc  AS soyad_enc,
              (SELECT code FROM player_aliases a
                WHERE a.cafe_id = ps.cafe_id AND a.player_id = ps.player_id) AS takma_ad
         FROM play_sessions ps
         JOIN players p ON p.id = ps.player_id
        WHERE ps.cafe_id = $1
          AND ps.game_id = $2
          AND ps.business_date = $3::date
          AND ps.status = 'completed'
          AND ps.server_score IS NOT NULL
          -- Ü3: kafede olmayan skor sıralamaya girmiyor. Misafir akışı ve
          -- kafe dışı oyun burada elenir.
          AND (ps.proof_mask & 2) <> 0
          AND p.anonymized_at IS NULL
        ORDER BY ps.player_id, ps.server_score DESC, ps.ended_at ASC`,
      [opts.cafeId, opts.oyunId, gun],
    );

    // DISTINCT ON, sıralamayı player_id'ye göre yapmak zorunda; asıl
    // sıralama bu yüzden burada.
    hepsi.sort((a, b) => Number(b.deger) - Number(a.deger));
    return listeKur(db, opts.bakanId, hepsi);
  });
}

/* ── Puana dayalı listeler ─────────────────────────────────── */

/**
 * Kafedeki toplam puana göre satırlar — isteğe bağlı gün aralığıyla.
 *
 * Tüm zamanlar ve haftalık sezon **aynı sorgudan** geçiyor. Ayrı yazılsalardı
 * maskeleme, anonimleşmiş oyuncunun elenmesi ve "harcanan puan sıralamayı
 * düşürmez" kuralı iki yerde durur, biri bir gün düzeltilirken öbürü geride
 * kalırdı — iki liste aynı kafede farklı sıralama gösterirdi.
 *
 * `GREATEST(l.delta, 0)`: harcama defterde eksi satır (E3) ama sıralamayı
 * düşürmüyor. Ödülünü alan oyuncunun listede geriye düşmesi, ödül almayı
 * cezalandırmak olurdu.
 */
async function puanSatirlari(
  db: Db,
  cafeId: string,
  aralik: { baslangic: string; bitis: string } | null,
): Promise<HamSatir[]> {
  const kosul = aralik ? "AND l.business_date BETWEEN $2::date AND $3::date" : "";
  const parametreler = aralik ? [cafeId, aralik.baslangic, aralik.bitis] : [cafeId];

  return db.all<HamSatir>(
    `SELECT l.player_id,
            sum(GREATEST(l.delta, 0)) AS deger,
            p.leaderboard_name_visible AS ad_gorunur,
            p.first_name_enc AS ad_enc,
            p.last_name_enc  AS soyad_enc,
            (SELECT code FROM player_aliases a
              WHERE a.cafe_id = l.cafe_id AND a.player_id = l.player_id) AS takma_ad
       FROM points_ledger l
       JOIN players p ON p.id = l.player_id
      WHERE l.cafe_id = $1
        AND p.anonymized_at IS NULL
        ${kosul}
      GROUP BY l.player_id, l.cafe_id, p.leaderboard_name_visible,
               p.first_name_enc, p.last_name_enc
     HAVING sum(GREATEST(l.delta, 0)) > 0
      ORDER BY 2 DESC`,
    parametreler,
  );
}

/**
 * Bu kafede tüm zamanların toplam puanı.
 *
 * ── Neden skor değil puan ───────────────────────────────────
 *
 * "Tüm zamanların en yüksek skoru" bugünün listesinin uzun hâli olurdu ve
 * tıklayan kişi aynı tabloyu ikinci kez görürdü. Toplam puan başka bir
 * soruyu cevaplıyor: *"bu kafenin en düzenli müşterisi kim"*. Tek seferlik
 * yüksek skor değil, süreklilik kazanıyor — sadakat ürününün ödüllendirmek
 * istediği davranış da bu.
 */
export async function tumZamanlar(opts: {
  cafeId: string;
  bakanId: string | null;
}): Promise<Liste> {
  return withBypass("tüm zamanlar liderlik tablosu", async (db) => {
    const hepsi = await puanSatirlari(db, opts.cafeId, null);
    return listeKur(db, opts.bakanId, hepsi);
  });
}

/* ── Haftalık sezon (Ü105) ─────────────────────────────────── */

/**
 * Haftalık sezon.
 *
 * ── Neden gerekti ───────────────────────────────────────────
 *
 * Tüm zamanlar listesi **kazanılamaz**: üç aydır gelen müşterinin birikimi,
 * bu hafta gelen için erişilemez bir sayı. Yeni oyuncu listeye bakıp
 * yarışacak bir şey görmüyor, yalnızca ne kadar geride olduğunu görüyor —
 * ve sıralama ancak insan kendini yarışın içinde görebildiğinde bir hedef.
 *
 * Sezon her pazartesi sıfırlanıyor: herkesin her hafta gerçek bir şansı var.
 *
 * ── ⚠️ Sezon haftası BÜTÇE haftasıyla aynı ──────────────────
 *
 * `pazartesi()` Ü25'in bütçe dönemi için yazılmıştı ve sezon onu tekrar
 * kullanıyor. Kendi haftasını kursaydık kafenin panelde gördüğü *"bu hafta
 * 43 oyuncu"* ile oyuncunun gördüğü sezon **farklı günleri** kapsardı;
 * kafe sezon şampiyonunu kendi haftalık raporunda bulamazdı.
 *
 * ── ⚠️ Sezonun ödülü YOK ────────────────────────────────────
 *
 * Sıralama puan, kupon ya da çarpan vermiyor — bu dosyanın baştaki kuralı
 * (E5) sezonla da bozulmuyor. Otomatik bir sezon ödülü koysaydık kafenin
 * bütçesinden **kafenin istemediği** bir para çıkardı ve şans mevzuatı
 * (S7) sorusunu ağırlaştırırdı. Sezon statü; ödül vermek isteyen kafe onu
 * kendi kampanyasıyla kurar.
 */
export type Sezon = {
  /** Sezonun ilk günü — pazartesi. */
  baslangic: string;
  /** Sezonun son günü — pazar. */
  bitis: string;
  /** Bugün dahil kaç gün kaldı. Pazar günü 1. */
  kalanGun: number;
};

export function sezon(gun: string = isGunu()): Sezon {
  const baslangic = pazartesi(gun);
  const bitis = gunEkle(baslangic, 6);
  return { baslangic, bitis, kalanGun: gunFarki(gun, bitis) + 1 };
}

/** Bir önceki sezon — geçen haftanın şampiyonu için. */
export function oncekiSezon(gun: string = isGunu()): Sezon {
  return sezon(gunEkle(pazartesi(gun), -1));
}

/** Bu sezonda bu kafede toplanan puan. */
export async function hafta(opts: {
  cafeId: string;
  bakanId: string | null;
  gun?: string;
}): Promise<Liste> {
  const s = sezon(opts.gun ?? isGunu());

  return withBypass("haftalık sezon liderlik tablosu", async (db) => {
    const hepsi = await puanSatirlari(db, opts.cafeId, s);
    return listeKur(db, opts.bakanId, hepsi);
  });
}

/**
 * Geçen sezonun şampiyonu — kimse oynamadıysa null.
 *
 * Saklanmıyor, **sorulup bulunuyor**: bir "sezon şampiyonları" tablosu
 * defterle ayrışabilecek ikinci bir gerçek olurdu (seri ve tahtla aynı
 * tercih). Oyuncu adını sonradan gizlerse ya da hesabını silerse buradaki
 * cevap da kendiliğinden değişiyor.
 */
export async function gecenSezonunSampiyonu(opts: {
  cafeId: string;
  /** Şampiyon bakan oyuncunun kendisiyse ekran "sendin" diyebilsin. */
  bakanId: string | null;
  gun?: string;
}): Promise<LiderSatiri | null> {
  const s = oncekiSezon(opts.gun ?? isGunu());

  return withBypass("geçen sezonun şampiyonu", async (db) => {
    const hepsi = await puanSatirlari(db, opts.cafeId, s);
    return hepsi.length ? satiraCevir(hepsi[0], 1, opts.bakanId) : null;
  });
}

/** Oyuncunun listedeki kendi satırı — ilk N'de olsun olmasın. */
export function kendiSatiri(l: Liste): LiderSatiri | null {
  return l.satirlar.find((s) => s.benMiyim) ?? l.benimSiram;
}
