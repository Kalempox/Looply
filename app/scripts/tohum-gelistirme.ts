import "./_env";
import { adminPool, closePools } from "@/db/pool";
import { newId, aliasCode, couponCode } from "@/lib/ids";
import { encryptPII, phoneIndex, normalizePhone, identifierHash } from "@/lib/crypto";
import { platformKullanicisiEkle, pinHashle } from "@/domain/staff";
import { randomBytes } from "node:crypto";

/**
 * Geliştirme tohum verisi — İKİ kafe.
 *
 * İki tane olmasının sebebi kozmetik değil: kiracı izolasyonunun
 * test edilebilmesi için "başkasının verisi" diye bir şeyin var olması
 * gerekiyor. tests/kiraci-izolasyonu.test.ts bu iki kafeyi kullanır.
 *
 * Yönetici (tablo sahibi) rolüyle çalışır — RLS'yi atlar.
 * Uygulama bu bağlantıyı hiçbir zaman kullanmaz.
 */

/**
 * PIN hash'i — **alan katmanının kendisi** kullanılıyor.
 *
 * Buranın kendi kopyası vardı ve biçimi (`salt:hash`, varsayılan scrypt
 * parametreleri) doğrulayıcınınkinden (`scrypt$salt$hash`, N=32768) farklıydı.
 * Sonuç: tohumdaki kasiyer hiçbir zaman giriş yapamıyordu. Faz 7'de kasa
 * ekranı yazılana kadar kimse fark etmedi.
 *
 * Kopya uygulamalar böyle ayrışır. Tek kaynak: `domain/staff.ts`.
 */
const pinHash = pinHashle;

function haftaBasi(): { start: string; end: string } {
  const now = new Date();
  const gun = now.getUTCDay() || 7; // pazar = 7
  const pazartesi = new Date(now);
  pazartesi.setUTCDate(now.getUTCDate() - gun + 1);
  const pazar = new Date(pazartesi);
  pazar.setUTCDate(pazartesi.getUTCDate() + 7);
  return { start: pazartesi.toISOString().slice(0, 10), end: pazar.toISOString().slice(0, 10) };
}

type KafeTohum = {
  slug: string;
  name: string;
  city: string;
  butceKurus: number;
  yoneticiTelefon: string;
  /** Konum doğrulaması (K2) için gerekli — koordinatsız kafede geofence çalışmaz */
  lat: number;
  lng: number;
};

const KAFELER: KafeTohum[] = [
  { slug: "kafe-a", name: "Kafe A", city: "İstanbul", butceKurus: 150_000, yoneticiTelefon: "05320000001", lat: 41.0369, lng: 28.9838 },
  { slug: "kafe-b", name: "Kafe B", city: "İzmir", butceKurus: 300_000, yoneticiTelefon: "05320000002", lat: 38.4237, lng: 27.1428 },
];

async function kafeKur(t: KafeTohum, playerId: string) {
  const db = adminPool();
  const cafeId = newId("cafe");
  const hafta = haftaBasi();

  await db.query(
    `INSERT INTO cafes (id, slug, name, city, lat, lng, status, approved_at, approved_by)
     VALUES ($1,$2,$3,$4,$5,$6,'approved', now(), 'tohum')`,
    [cafeId, t.slug, t.name, t.city, t.lat, t.lng],
  );

  // Ü108: 8 masa + kasa, menü ve fiş karekodu. Dördü de aynı şekilde
  // çalışıyor; tohumda dördü birden var ki panel gruplarının hepsi
  // demoda görünsün. "Kasa" satırı zaten vardı, artık türü de doğru.
  const noktalar: { ad: string; tur: string }[] = [
    ...Array.from({ length: 8 }, (_, i) => ({ ad: `Masa ${i + 1}`, tur: "masa" })),
    { ad: "Kasa", tur: "kasa" },
    { ad: "Menü", tur: "menu" },
    { ad: "Fiş", tur: "fis" },
  ];
  for (const [i, n] of noktalar.entries()) {
    await db.query(
      `INSERT INTO cafe_tables (id, cafe_id, label, sort_order, qr_secret, kind)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [newId("tbl"), cafeId, n.ad, i, randomBytes(16), n.tur],
    );
  }

  const staffId = newId("stf");
  await db.query(
    `INSERT INTO staff (id, cafe_id, name, pin_hash, role) VALUES ($1,$2,$3,$4,'cashier')`,
    [staffId, cafeId, `${t.name} kasiyeri`, await pinHash("1234")],
  );
  // Yönetici telefonla girer (docs/08 §4.6); kasiyer kayıtlı cihazda PIN'le.
  const managerId = newId("stf");
  const yoneticiTelefon = normalizePhone(t.yoneticiTelefon);
  await db.query(
    `INSERT INTO staff (id, cafe_id, name, pin_hash, role, phone_index, phone_enc)
     VALUES ($1,$2,$3,$4,'manager',$5,$6)`,
    [
      managerId,
      cafeId,
      `${t.name} işletmecisi`,
      await pinHash("9999"),
      phoneIndex(yoneticiTelefon),
      encryptPII(yoneticiTelefon),
    ],
  );

  await db.query(
    `INSERT INTO cafe_devices (id, cafe_id, label, device_id_hash, registered_by)
     VALUES ($1,$2,'Kasa tableti',$3,$4)`,
    [newId("dev"), cafeId, identifierHash(`kasa-cihazi-${t.slug}`), managerId],
  );

  const periodId = newId("bgt");
  await db.query(
    `INSERT INTO budget_periods (id, cafe_id, period_start, period_end, committed_kurus)
     VALUES ($1,$2,$3,$4,$5)`,
    [periodId, cafeId, hafta.start, hafta.end, t.butceKurus],
  );

  const productId = newId("prd");
  await db.query(
    `INSERT INTO products (id, cafe_id, name, price_kurus) VALUES ($1,$2,$3,$4)`,
    [productId, cafeId, "Tiramisu", 18_000],
  );

  const rewardId = newId("rwd");
  await db.query(
    `INSERT INTO rewards (id, cafe_id, kind, title, points_price, cost_kurus, min_proof_level)
     VALUES ($1,$2,'catalog','Ücretsiz filtre kahve',6000,4500,3)`,
    [rewardId, cafeId],
  );
  await db.query(
    `INSERT INTO rewards (id, cafe_id, kind, title, points_price, cost_kurus, min_proof_level)
     VALUES ($1,$2,'instant','+1 shot espresso',0,1500,2)`,
    [newId("rwd"), cafeId],
  );
  // Soğuk içecek örneği (Ü74): kupon kartının dört kategorisinden
  // biri soğuk ve tohumda karşılığı olmadan ekranda hiç görünmüyordu.
  await db.query(
    `INSERT INTO rewards (id, cafe_id, kind, title, points_price, cost_kurus, min_proof_level)
     VALUES ($1,$2,'instant','Ice Americano',0,3000,2)`,
    [newId("rwd"), cafeId],
  );

  // Ö4 · Ü82: yayında bir yüzde kampanyası.
  //
  // Tohumda kampanya YOKTU ve özellik bu yüzden ekranda hiç görünmüyordu:
  // `db:seed` sonrası kafenin tek bir kampanyası olmuyor, oyuncuya da
  // doğal olarak hiçbir şey düşmüyordu. Kampanya teslim yolu yazılınca
  // (Ü82) tohumun da bir örnek taşıması gerekti — yoksa çalıştığı
  // yalnızca testlerde görülürdü.
  //
  // Üç sınır da dolu (Ü8): tavan 3.600 kuruş (18 TL'lik tiramisunun
  // %20'si), günlük 20 adet, bir hafta süre.
  await db.query(
    `INSERT INTO percentage_campaigns
       (id, cafe_id, product_id, percent, max_discount_kurus, daily_limit, total_limit,
        starts_at, ends_at, status, created_by)
     VALUES ($1,$2,$3,20,3600,20,NULL, now(), now() + interval '7 days', 'active', $4)`,
    [newId("cmp"), cafeId, productId, managerId],
  );

  // Oyuncunun bu kafedeki anonim kodu — her kafede FARKLI (G1)
  await db.query(
    `INSERT INTO player_aliases (cafe_id, player_id, code) VALUES ($1,$2,$3)`,
    [cafeId, playerId, aliasCode()],
  );

  await db.query(
    `INSERT INTO points_ledger (id, cafe_id, player_id, business_date, delta, reason)
     VALUES ($1,$2,$3,CURRENT_DATE,300,'game_complete')`,
    [newId("pts"), cafeId, playerId],
  );

  const couponId = newId("cpn");
  await db.query(
    `INSERT INTO coupons
       (id, cafe_id, player_id, reward_id, code, status, activates_at, expires_at,
        budget_period_id, reserved_kurus, proof_level)
     VALUES ($1,$2,$3,$4,$5,'active', now(), now() + interval '7 days', $6, 4500, 3)`,
    [couponId, cafeId, playerId, rewardId, couponCode(), periodId],
  );
  await db.query(
    `INSERT INTO budget_ledger (id, cafe_id, budget_period_id, kind, amount_kurus, coupon_id)
     VALUES ($1,$2,$3,'reserve',4500,$4)`,
    [newId("bl"), cafeId, periodId, couponId],
  );

  return { cafeId, staffId, periodId, productId, couponId };
}

async function main() {
  const db = adminPool();

  const mevcut = await db.query("SELECT 1 FROM cafes WHERE slug = 'kafe-a'");
  if ((mevcut.rowCount ?? 0) > 0) {
    console.log("Tohum verisi zaten kurulu. Sıfırlamak için: npm run db:reset");
    return;
  }

  // Tek oyuncu, iki kafede oynuyor — anonim kodları farklı olmalı
  const playerId = newId("plr");
  const phone = normalizePhone("05321234567");
  await db.query(
    `INSERT INTO players (id, phone_index, phone_enc, first_name_enc, last_name_enc, birth_year_enc)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      playerId,
      phoneIndex(phone),
      encryptPII(phone),
      encryptPII("Test"),
      encryptPII("Oyuncu"),
      encryptPII("1995"),
    ],
  );
  await db.query(
    `INSERT INTO player_consents (id, player_id, kind, text_version)
     VALUES ($1,$2,'privacy_notice','v0-taslak')`,
    [newId("cns"), playerId],
  );

  // Platform ekibi — G9: iki ayrı rol
  await platformKullanicisiEkle({ ad: "Platform yöneticisi", telefon: normalizePhone("05310000001"), rol: "platform_admin" });
  await platformKullanicisiEkle({ ad: "Platform desteği", telefon: normalizePhone("05310000002"), rol: "platform_destek" });

  const sonuc = [];
  for (const k of KAFELER) sonuc.push({ ...k, ...(await kafeKur(k, playerId)) });

  console.log("✓ Tohum verisi kuruldu\n");
  for (const s of sonuc) {
    console.log(`  ${s.name.padEnd(8)} ${s.slug.padEnd(10)} bütçe ${s.butceKurus / 100} TL  ${s.cafeId}`);
  }
  console.log(`\n  Oyuncu   ${playerId} (her iki kafede de kayıtlı, kodları farklı)`);
  console.log(`
  Kafe yöneticisi girişi  /kafe/giris`);
  for (const s2 of sonuc) console.log(`    ${s2.name.padEnd(8)} ${s2.yoneticiTelefon}`);
  console.log(`
  Platform girişi         /platform/giris`);
  console.log(`    yönetici 05310000001  ·  destek 05310000002`);
  console.log(`
  Kasiyer PIN             1234`);
}

main()
  .then(closePools)
  .catch(async (err) => {
    console.error(err);
    await closePools();
    process.exit(1);
  });
