import "./_env";
import { adminPool, closePools } from "@/db/pool";
import { withBypass } from "@/db/context";
import { kaydet } from "@/domain/player";
import { normalizePhone, phoneIndex } from "@/lib/crypto";
import { isGunu, gunFarki, gunEkle } from "@/lib/tarih";
import * as masa from "@/domain/masa";
import * as oyun from "@/domain/oyun";
import * as kupon from "@/domain/kupon";
import * as cark from "@/domain/cark";
import * as butce from "@/domain/butce";
import * as rapor from "@/domain/rapor";
import { OYUNLAR } from "@/oyunlar";
import { botOyna, zar } from "./simulasyon-botlar";

/**
 * Demo simülasyonu — bir haftalık gerçek trafik.
 *
 * ── Neden ham INSERT yok ────────────────────────────────────
 *
 * Otuz oyuncuyu ve bir haftalık hareketi doğrudan tablolara yazmak kolay
 * olurdu, ama demoyu yalancı yapardı: bütçe rezervasyonu, günlük puan tavanı,
 * kanıt seviyesi, nitelikli oturum kuralı ve kupon defteri hiç çalışmaz;
 * raporlar ürünün gerçekte üretemeyeceği sayılar gösterirdi.
 *
 * Bu betik bunun yerine **domain fonksiyonlarını** çağırıyor:
 * `masa.ac` → `masa.konumDogrula` → `oyun.basla` → `oyun.bitir` →
 * `kupon.katalogdanAl` → `kupon.onayla`. Bütçe gerçekten tükeniyor, tavan
 * gerçekten kesiyor, doğrulanmamış konum gerçekten ödülü kapatıyor.
 *
 * ── Günler nasıl geriye alınıyor ────────────────────────────
 *
 * Üretim bugünün saatiyle oluyor; her simüle gün BİTTİĞİNDE o turda yazılan
 * satırlar yönetici rolüyle geriye kaydırılıyor. Sıra önemli: kaydırma bir
 * sonraki gün üretilmeden yapıldığı için günlük tavan ve "günde bir nitelikli
 * oturum" kuralı **her simüle gün için ayrı ayrı** işliyor. Hepsi sonda
 * kaydırılsaydı, yedi günün tamamı tek bir güne yığılır ve üçüncü oyundan
 * sonra kimse puan alamazdı.
 *
 * ── Bilerek atlanan tek şey ─────────────────────────────────
 *
 * OTP. `player.kaydet` doğrudan çağrılıyor, yani G13'ün "hesap ancak kod
 * doğrulanınca açılır" kuralı bu betikte devrede değil. Simülasyonun 30 kez
 * SMS akışından geçmesinin bir anlamı yok; kural ürün kodunda duruyor ve
 * `tests/kimlik.test.ts` onu sınıyor.
 *
 * Kullanım:  npm run db:simule           · üret
 *            npm run db:simule -- --sifirla  · önce eskiyi temizle
 */

const OYUNCU_SAYISI = 30;

/**
 * Neden yedi değil, on dört gün.
 *
 * Katalog ödülü 6.000 puan; oyun 300 puan veriyor ve günlük tavan 900. Yani
 * katalog, tanımı gereği **haftalardan oluşan** bir sadakat mekanizması: bir
 * haftalık trafikte kimse eşiğe ulaşamıyor ve ilk koşuda tam olarak bu oldu —
 * 76 anlık kupon çıktı, katalogdan sıfır alım oldu.
 *
 * Fiyatı düşürmek ya da oyunculara sahte bakiye vermek ürünü yalan söyler
 * hâle getirirdi. Geçmişi uzatmak ise yalnızca "kafe iki haftadır açık"
 * demek. Yan faydası: raporun "geçen hafta" karşılaştırması da doluyor.
 */
const GUN_SAYISI = 14;

/**
 * Simüle edilen her GÜNÜN bütçesi — 5.000 TL.
 *
 * Ü45 ile dönem günlük oldu; taban 1.500 TL/gün. Simülasyonun trafiği bunun
 * üstünde olduğu için taahhüt daha yükseğe çekiliyor: aksi hâlde bütçe öğlen
 * tükeniyor ve günün geri kalanı "kupon çıkmadı" ekranına dönüyor.
 *
 * Bütçe kuralı gevşetilmiyor — kafe sadece daha yüksek bir taahhüt vermiş
 * oluyor; tükenirse yine tükeniyor.
 */
const GUNLUK_BUTCE_KURUS = 500_000;

/** Simülasyon oyuncularının numara aralığı — temizlik bunlara bakıyor. */
const TELEFON_TABANI = 5_559_000_000;

const ADLAR = [
  "Abdulkadir", "Talha", "Zeynep", "Emre", "Elif", "Mert", "Selin", "Burak",
  "Ayşe", "Kerem", "Deniz", "Furkan", "Ece", "Yusuf", "Melis", "Onur",
  "Nisa", "Ahmet", "Beren", "Kaan", "İrem", "Hakan", "Sude", "Barış",
  "Ceren", "Eren", "Buse", "Serkan", "Nehir", "Umut",
];

const SOYADLAR = [
  "Aydın", "Çelik", "Doğan", "Yılmaz", "Kaya", "Demir", "Şahin", "Koç",
  "Arslan", "Öztürk", "Kurt", "Polat", "Aksoy", "Erdem", "Güneş",
];

type Kafe = {
  id: string;
  ad: string;
  slug: string;
  lat: number;
  lng: number;
  masalar: { id: string; label: string }[];
  kasiyerId: string;
  katalogOdulu: string | null;
};

const yaz = (s: string) => process.stdout.write(`${s}\n`);

/* ── Hazırlık ─────────────────────────────────────────────── */

async function kafeleriOku(): Promise<Kafe[]> {
  return withBypass("simülasyon — kafeler", async (db) => {
    const kafeler = await db.all<{
      id: string;
      name: string;
      slug: string;
      lat: number | null;
      lng: number | null;
    }>(`SELECT id, name, slug, lat, lng FROM cafes WHERE status = 'approved' ORDER BY slug`);

    const sonuc: Kafe[] = [];
    for (const k of kafeler) {
      if (k.lat == null || k.lng == null) continue;

      const masalar = await db.all<{ id: string; label: string }>(
        `SELECT id, label FROM cafe_tables
          WHERE cafe_id = $1 AND active AND label <> 'Kasa' ORDER BY sort_order`,
        [k.id],
      );
      const kasiyer = await db.one<{ id: string }>(
        `SELECT id FROM staff WHERE cafe_id = $1 AND role = 'cashier' LIMIT 1`,
        [k.id],
      );
      const katalog = await db.one<{ id: string }>(
        `SELECT id FROM rewards WHERE cafe_id = $1 AND kind = 'catalog' AND active
          ORDER BY points_price LIMIT 1`,
        [k.id],
      );
      if (!masalar.length || !kasiyer) continue;

      sonuc.push({
        id: k.id,
        ad: k.name,
        slug: k.slug,
        lat: k.lat,
        lng: k.lng,
        masalar,
        kasiyerId: kasiyer.id,
        katalogOdulu: katalog?.id ?? null,
      });
    }
    return sonuc;
  });
}

function telefon(i: number): string {
  return normalizePhone(`0${TELEFON_TABANI + i}`);
}

async function oyuncularıKur(): Promise<{ id: string; ad: string }[]> {
  const liste: { id: string; ad: string }[] = [];
  for (let i = 0; i < OYUNCU_SAYISI; i++) {
    const ad = ADLAR[i % ADLAR.length];
    const soyad = SOYADLAR[(i * 7) % SOYADLAR.length];
    const { oyuncu } = await kaydet({
      telefon: telefon(i),
      ad,
      soyad,
      dogumYili: 1985 + (i % 20),
      pazarlamaIzni: i % 3 === 0,
    });
    liste.push({ id: oyuncu.id, ad: `${ad} ${soyad}` });
  }
  return liste;
}

/* ── Zaman kaydırma ───────────────────────────────────────── */

/**
 * Bu turda yazılan satırları `gun` kadar geriye alır.
 *
 * Yalnızca `basla`dan sonra oluşan satırlara dokunuyor: tohum verisine ve
 * önceki turlara elini sürmüyor. Yönetici rolü şart — defterlerin bir kısmı
 * uygulama rolüne UPDATE vermiyor ve vermemeli.
 */
async function geriyeAl(basla: Date, gun: number): Promise<void> {
  // `gun === 0` için de çalışıyor. Erken çıkan bir sürümü vardı ve BUGÜNÜN
  // satırları hiç kaymadığı için hepsi betiğin çalıştığı saate yığılıyordu —
  // raporun saat grafiği tek çubuk gösteriyordu. Gün kaydırması sıfır olsa
  // bile saat dağılımı uygulanmalı.
  if (gun < 0) return;
  const db = adminPool();
  const ara = `${gun} days`;

  // ── Saat dağılımı
  //
  // Yalnızca gün kaydırmak yetmiyordu: her satır betiğin çalıştığı saate
  // düşüyor ve raporun "hangi saat doluyor" grafiği tek bir çubuğa iniyordu.
  // Oysa o grafik kafeye satılan iddianın kanıtı — boş saati doldurmak.
  //
  // Satır başına ±birkaç saatlik kayma veriliyor ve kaymanın TAMAMI aynı
  // satırın bütün kolonlarına uygulanıyor; yoksa bitiş başlangıçtan önceye
  // düşerdi. Aralık gün sınırını aşmayacak kadar dar, `business_date` ile
  // saat ayrışmıyor.
  const KAYMA = `((random() * 12)::int - 5) * interval '1 hour'
                 + (random() * 60)::int * interval '1 minute'`;

  await db.query(
    `WITH yeni AS (
       SELECT id, ${KAYMA} AS kayma, ended_at - started_at AS sure
         FROM play_sessions WHERE started_at >= $3
     )
     UPDATE play_sessions p
        SET started_at = p.started_at - $1::interval + y.kayma,
            ended_at = p.started_at - $1::interval + y.kayma + y.sure,
            business_date = p.business_date - $2::int
       FROM yeni y WHERE p.id = y.id`,
    [ara, gun, basla],
  );

  await db.query(
    `WITH yeni AS (
       SELECT id, ${KAYMA} AS kayma FROM table_sessions WHERE started_at >= $2
     )
     UPDATE table_sessions t
        SET started_at = t.started_at - $1::interval + y.kayma,
            expires_at = t.expires_at - $1::interval + y.kayma,
            last_seen_at = t.last_seen_at - $1::interval + y.kayma,
            geo_checked_at = t.geo_checked_at - $1::interval + y.kayma
       FROM yeni y WHERE t.id = y.id`,
    [ara, basla],
  );

  await db.query(
    `UPDATE coupons
        SET issued_at = issued_at - $1::interval,
            activates_at = activates_at - $1::interval,
            expires_at = expires_at - $1::interval,
            redeemed_at = redeemed_at - $1::interval,
            undo_deadline_at = undo_deadline_at - $1::interval
      WHERE issued_at >= $2`,
    [ara, basla],
  );

  for (const [tablo, kolon] of [
    ["coupon_events", "created_at"],
    ["budget_ledger", "created_at"],
    ["player_badges", "earned_at"],
  ] as const) {
    await db.query(
      `UPDATE ${tablo} SET ${kolon} = ${kolon} - $1::interval WHERE ${kolon} >= $2`,
      [ara, basla],
    );
  }

  for (const tablo of ["points_ledger", "xp_ledger"] as const) {
    await db.query(
      `UPDATE ${tablo}
          SET created_at = created_at - $1::interval,
              business_date = business_date - $2::int
        WHERE created_at >= $3`,
      [ara, gun, basla],
    );
  }
}

/**
 * Masa oturumunu birkaç dakika geriye alır ki K3 oluşabilsin.
 *
 * K3 "masada yeterince kalındı" demek ve `masa.aktif` bunu `started_at`ten
 * hesaplıyor (5 dakika). Katalog ödülleri kanıt seviyesi 3 istiyor; oturum
 * bu saniye açıldığı için kural gerçekten sağlanamazdı. Kaydırma kuralı
 * gevşetmiyor — oturumu, gerçekte olacağı gibi, biraz önce açılmış yapıyor.
 */
async function masadaOturt(playerId: string, dakika: number): Promise<void> {
  await adminPool().query(
    `UPDATE table_sessions SET started_at = started_at - ($2 || ' minutes')::interval
      WHERE player_id = $1 AND expires_at > now()`,
    [playerId, String(dakika)],
  );
}

/* ── Bütçe dönemleri ──────────────────────────────────────── */

/**
 * Simüle edilen her gün için o günün bütçe dönemini hazırlar.
 *
 * Bu adım atlanamaz: kupon üretilirken `butce.rezerveEt` **o güne ait
 * dönemi** arıyor ve bulamazsa hiç kupon çıkmıyor. İlk koşuda tam olarak bu
 * oldu — tohumun dönemi geçen haftaya aitti, bu haftanınki hiç yoktu ve
 * simülasyon sıfır kupon üretti.
 *
 * Ü45 ile dönem günlük: her gün kendi satırını alıyor. Dönem anahtarı
 * `(cafe_id, period_start)` olduğu için çağrı yinelenirse aynı satır
 * güncelleniyor.
 */
async function donemleriHazirla(kafeler: Kafe[], gunler: string[]): Promise<Map<string, string>> {
  const donemler = new Map<string, string>();

  for (const kafe of kafeler) {
    for (const gun of gunler) {
      const sonuc = await butce.donemBelirle({
        cafeId: kafe.id,
        taahhutKurus: GUNLUK_BUTCE_KURUS,
        aktorId: kafe.kasiyerId,
        gun,
      });
      if (!sonuc.ok) throw new Error(`Bütçe dönemi kurulamadı (${kafe.slug}, ${gun}): ${sonuc.hata}`);
      donemler.set(`${kafe.id}:${gun}`, sonuc.donem.id);
    }
  }

  return donemler;
}

/**
 * Geriye alınan kuponları, ait oldukları haftanın dönemine bağlar.
 *
 * Kupon bugünün saatiyle üretiliyor, dolayısıyla bu haftanın dönemine
 * bağlanıyor. Satır üç gün geriye alındığında artık o haftaya ait değil —
 * bağı düzeltilmezse panel geçen haftanın kuponunu bu haftanın bütçesinden
 * sayar. Defter satırları da kuponla birlikte taşınıyor, yoksa bütçe
 * hareketleri kupondan kopar.
 */
async function donemeBagla(cafeId: string, gun: string, donemId: string): Promise<void> {
  const db = adminPool();

  const r = await db.query<{ id: string }>(
    `UPDATE coupons SET budget_period_id = $3
      WHERE cafe_id = $1 AND issued_at::date = $2::date AND budget_period_id IS DISTINCT FROM $3
      RETURNING id`,
    [cafeId, gun, donemId],
  );
  if (!r.rows.length) return;

  await db.query(`UPDATE budget_ledger SET budget_period_id = $2 WHERE coupon_id = ANY($1)`, [
    r.rows.map((x) => x.id) as never,
    donemId,
  ]);
}

/* ── Bir günün trafiği ────────────────────────────────────── */

type GunOzeti = {
  oyun: number;
  /** E2 anlık ödülü — oyun bitince kendiliğinden düşen kupon. */
  anlik: number;
  /** Puanla alınan katalog ödülü. */
  katalog: number;
  onay: number;
  geriAlma: number;
};

async function birGun(
  kafeler: Kafe[],
  oyuncular: { id: string; ad: string }[],
  rnd: () => number,
  gunSirasi: number,
  turBaslangici: Date,
): Promise<GunOzeti> {
  const ozet: GunOzeti = { oyun: 0, anlik: 0, katalog: 0, onay: 0, geriAlma: 0 };

  // Hafta sonu daha kalabalık — rapordaki saatlik dağılım düz çizgi olmasın.
  const doluluk = gunSirasi >= 5 ? 0.8 : 0.5;

  for (const [i, oyuncu] of oyuncular.entries()) {
    if (rnd() > doluluk) continue;

    const kafe = kafeler[(i + gunSirasi) % kafeler.length];
    const masaSecim = kafe.masalar[Math.floor(rnd() * kafe.masalar.length)];

    await masa.ac({ cafeId: kafe.id, tableId: masaSecim.id, playerId: oyuncu.id });
    await masadaOturt(oyuncu.id, 12);

    // Beşte biri konumunu doğrulamıyor: kimi izni reddediyor, kimi uzakta.
    // Bu satırlar raporda "geldi ama nitelikli değil" olarak görünmeli (Ü3).
    const konumVar = rnd() < 0.8;
    if (konumVar) {
      const sapma = 0.0003 * (rnd() - 0.5);
      await masa.konumDogrula(oyuncu.id, kafe.lat + sapma, kafe.lng + sapma);
    }

    const oyunSayisi = 1 + Math.floor(rnd() * 3);
    for (let n = 0; n < oyunSayisi; n++) {
      const secilen = OYUNLAR[Math.floor(rnd() * OYUNLAR.length)];
      const bolum = 1 + Math.floor(rnd() * Math.min(3, secilen.bolumSayisi));

      const acilis = await oyun.basla({
        playerId: oyuncu.id,
        oyunId: secilen.id,
        bolum,
      });
      if (!acilis.ok) continue;

      const sonuc = botOyna(secilen.id, acilis.tohum, bolum, rnd);
      const bitis = await oyun.bitir({
        playerId: oyuncu.id,
        oturumId: acilis.oturumId,
        girdiler: sonuc.girdiler,
        // İstemcinin iddiası — bot dürüst oynuyor, sunucu zaten kendi hesabını yapıyor.
        iddiaEdilenSkor: sonuc.skor,
      });
      if (bitis.ok) {
        ozet.oyun++;
        if (bitis.kupon) ozet.anlik++;
      }
    }

    // Ü52: puanla katalog ödülü almak kalktı. Yerine günlük çark —
    // ödüle giden ikinci yol artık bu ve simülasyonun onu üretmesi
    // gerekiyor, yoksa rapordaki kupon sayısı gerçeği yansıtmaz.
    if (kafe.katalogOdulu && konumVar && rnd() < 0.35) {
      const aktif = await masa.aktif(oyuncu.id);
      if (aktif) {
        const durum = await cark.durum({ playerId: oyuncu.id, cafeId: kafe.id });
        const secim = durum.acik ? cark.sec(durum.dilimler) : null;
        if (secim) {
          const alim = await kupon.carkOduluVer({
            playerId: oyuncu.id,
            cafeId: kafe.id,
            odulId: secim.dilim.odulId,
            kanitSeviyesi: aktif.kanitSeviyesi,
          });
          if (alim.ok) ozet.katalog++;
        }
      }
    }
  }

  // ── Kasa: günün kuponlarının bir kısmı gerçekten kullanılıyor
  for (const kafe of kafeler) {
    // YALNIZCA bu turda üretilen kuponlar. İlk koşuda bu filtre yoktu ve
    // kasa, tohumdan ve önceki denemelerden kalan eski kuponları onayladı:
    // rapor "325 TL kullanıldı" dedi, defterde karşılığı çıkmadı. Simülasyon
    // kendi ürettiğinden başkasına dokunmamalı.
    const bekleyen = await withBypass("simülasyon — kasa kuyruğu", (db) =>
      db.all<{ id: string }>(
        `SELECT id FROM coupons
          WHERE cafe_id = $1 AND status = 'active' AND issued_at >= $2
            AND activates_at <= now() AND expires_at > now()
          ORDER BY issued_at`,
        [kafe.id, turBaslangici],
      ),
    );

    for (const k of bekleyen) {
      if (rnd() > 0.65) continue; // her kupon kasaya gelmiyor
      const onay = await kupon.onayla({
        cafeId: kafe.id,
        kuponId: k.id,
        staffId: kafe.kasiyerId,
      });
      if (!onay.ok) continue;
      ozet.onay++;

      // Nadiren yanlış kupon okutuluyor ve kasiyer geri alıyor (Faz 7).
      if (rnd() < 0.08) {
        const geri = await kupon.geriAl({
          cafeId: kafe.id,
          kuponId: k.id,
          staffId: kafe.kasiyerId,
        });
        if (geri.ok) ozet.geriAlma++;
      }
    }
  }

  return ozet;
}

/* ── Temizlik ─────────────────────────────────────────────── */

async function sifirla(): Promise<number> {
  const db = adminPool();
  const indeksler = Array.from({ length: OYUNCU_SAYISI }, (_, i) => phoneIndex(telefon(i)));

  const r = await db.query<{ id: string }>(
    `SELECT id FROM players WHERE phone_index = ANY($1)`,
    [indeksler as never],
  );
  const idler = r.rows.map((x) => x.id);
  if (!idler.length) return 0;

  for (const sql of [
    `DELETE FROM coupon_events WHERE coupon_id IN (SELECT id FROM coupons WHERE player_id = ANY($1))`,
    `DELETE FROM budget_ledger WHERE coupon_id IN (SELECT id FROM coupons WHERE player_id = ANY($1))`,
    `DELETE FROM coupons WHERE player_id = ANY($1)`,
    `DELETE FROM points_ledger WHERE player_id = ANY($1)`,
    `DELETE FROM xp_ledger WHERE player_id = ANY($1)`,
    `DELETE FROM player_badges WHERE player_id = ANY($1)`,
    `DELETE FROM play_sessions WHERE player_id = ANY($1)`,
    `DELETE FROM table_sessions WHERE player_id = ANY($1)`,
    `DELETE FROM player_aliases WHERE player_id = ANY($1)`,
    `DELETE FROM player_consents WHERE player_id = ANY($1)`,
    `DELETE FROM sessions WHERE subject_id = ANY($1)`,
    `DELETE FROM audit_log WHERE target_id = ANY($1) OR actor_id = ANY($1)`,
    `DELETE FROM players WHERE id = ANY($1)`,
  ]) {
    await db.query(sql, [idler as never]);
  }
  return idler.length;
}

/* ── Tutarlılık ───────────────────────────────────────────── */

/**
 * Raporun gösterdiği sayılar defterlerle tutuyor mu?
 *
 * Simülasyonun kendi kendini denetlemesi: veri gerçek yoldan üretildiyse
 * rapordaki "kullanılan indirim" ile bütçe defterindeki `commit` toplamı
 * aynı olmalı. Tutmuyorsa üretimde bir şey ham yazılmış demektir.
 */
async function tutarlilik(kafeler: Kafe[], aralik: rapor.Aralik): Promise<boolean> {
  let hepsiTutuyor = true;

  for (const kafe of kafeler) {
    const ozet = await rapor.ozet(kafe.id, aralik);

    // Defter, dönemden değil **kuponun kendisinden** okunuyor. Aralık
    // sınırında bir kupon geçen hafta dağıtılıp bu hafta kullanılabiliyor;
    // dönem üzerinden bakan bir sorgu bunu ayrışma sanırdı. Karşılaştırma
    // aynı kupon kümesi üzerinden yapılınca ilişki değişmez oluyor.
    const defter = await withBypass("simülasyon — bütçe defteri", (db) =>
      db.one<{ commit: string; undo: string }>(
        `SELECT
           COALESCE(sum(bl.amount_kurus) FILTER (WHERE bl.kind = 'commit'), 0) AS commit,
           COALESCE(sum(bl.amount_kurus) FILTER (WHERE bl.kind = 'undo'), 0)   AS undo
         FROM budget_ledger bl
         JOIN coupons c ON c.id = bl.coupon_id
        WHERE bl.cafe_id = $1 AND c.status = 'redeemed'
          AND c.redeemed_at >= $2::date AND c.redeemed_at < $3::date`,
        [kafe.id, aralik.baslangic, aralik.bitis],
      ),
    );

    const harcanan = Number(defter?.commit ?? 0) - Number(defter?.undo ?? 0);
    const tutuyor = harcanan === ozet.kullanilanIndirimKurus;
    if (!tutuyor) hepsiTutuyor = false;

    yaz(
      `  ${kafe.ad.padEnd(8)} ` +
        `nitelikli ${String(ozet.nitelikliOyuncu).padStart(3)} · ` +
        `tekil ${String(ozet.tekilOyuncu).padStart(3)} · ` +
        `oyun ${String(ozet.toplamOyun).padStart(4)} · ` +
        `kupon ${ozet.kuponVerilen}/${ozet.kuponKullanilan} · ` +
        `kasada ${(ozet.kullanilanIndirimKurus / 100).toFixed(2)} TL ` +
        `${tutuyor ? "· defterle tutuyor ✓" : `· ⚠ DEFTER ${(harcanan / 100).toFixed(2)} TL`}`,
    );
  }

  return hepsiTutuyor;
}

/* ── Ana akış ─────────────────────────────────────────────── */

async function main() {
  if (process.env.APP_ENV === "production") {
    throw new Error("Simülasyon canlı ortamda çalıştırılamaz — sahte oyuncu ve sahte trafik üretir.");
  }

  const kafeler = await kafeleriOku();
  if (kafeler.length === 0) {
    throw new Error("Onaylı ve konumu belirlenmiş kafe yok — önce: npm run db:seed");
  }

  if (process.argv.includes("--sifirla")) {
    const n = await sifirla();
    yaz(`  Önceki simülasyon temizlendi (${n} oyuncu).\n`);
  }

  // Son yedi gün. Aralık iki bütçe haftasına yayılabiliyor; her gün için o
  // günü kapsayan dönem hazırlanıyor ve satırlar sonradan doğru döneme
  // bağlanıyor (`donemeBagla`).
  const bugun = isGunu();
  const gunler = Array.from({ length: GUN_SAYISI }, (_, i) => gunEkle(bugun, i - (GUN_SAYISI - 1)));

  yaz(`\n  CafePlay simülasyonu`);
  yaz(`  ${kafeler.length} kafe · ${OYUNCU_SAYISI} oyuncu · ${GUN_SAYISI} gün (${gunler[0]} → ${bugun})\n`);

  const donemler = await donemleriHazirla(kafeler, gunler);
  yaz(`  Bütçe dönemleri hazır (${new Set(donemler.values()).size} dönem).`);

  const oyuncular = await oyuncularıKur();
  yaz(`  Oyuncular hazır: ${oyuncular[0].ad}, ${oyuncular[1].ad}, … (${oyuncular.length})\n`);

  const rnd = zar(20260829);
  const toplam: GunOzeti = { oyun: 0, anlik: 0, katalog: 0, onay: 0, geriAlma: 0 };

  for (const [i, gun] of gunler.entries()) {
    const geriGun = gunFarki(gun, bugun);
    const basla = new Date();

    const ozet = await birGun(kafeler, oyuncular, rnd, i, basla);

    // Kaydırma bir sonraki gün üretilmeden yapılıyor — günlük tavan ve
    // "günde bir nitelikli oturum" kuralı her simüle gün için ayrı işlesin.
    await geriyeAl(basla, geriGun);

    for (const kafe of kafeler) {
      const donemId = donemler.get(`${kafe.id}:${gun}`);
      if (donemId) await donemeBagla(kafe.id, gun, donemId);
    }

    toplam.oyun += ozet.oyun;
    toplam.anlik += ozet.anlik;
    toplam.katalog += ozet.katalog;
    toplam.onay += ozet.onay;
    toplam.geriAlma += ozet.geriAlma;

    yaz(
      `  ${gun}  oyun ${String(ozet.oyun).padStart(3)} · ` +
        `anlık kupon ${String(ozet.anlik).padStart(2)} · ` +
        `katalog ${String(ozet.katalog).padStart(2)} · ` +
        `kasada onay ${String(ozet.onay).padStart(2)} · geri alma ${ozet.geriAlma}`,
    );
  }

  yaz(
    `\n  Toplam: ${toplam.oyun} oyun · ${toplam.anlik} anlık kupon · ` +
      `${toplam.katalog} katalog ödülü · ` +
      `${toplam.onay} onay · ${toplam.geriAlma} geri alma\n`,
  );

  yaz(`  Rapor ile defter karşılaştırması:`);
  const tutuyor = await tutarlilik(kafeler, { baslangic: gunler[0], bitis: gunEkle(bugun, 1) });

  yaz(
    tutuyor
      ? `\n  Hazır. Kafe paneli → Rapor ekranında görülebilir.\n`
      : `\n  ⚠ Rapor ile bütçe defteri ayrışıyor — üretimde ham yazım olabilir.\n`,
  );

  await closePools();
  if (!tutuyor) process.exit(1);
}

main().catch(async (err) => {
  process.stderr.write(`\nSimülasyon başarısız: ${err instanceof Error ? err.message : String(err)}\n`);
  await closePools().catch(() => {});
  process.exit(1);
});
