import "./_env";
import { adminPool, closePools } from "@/db/pool";
import { newId, aliasCode, couponCode } from "@/lib/ids";
import { encryptPII, phoneIndex, normalizePhone, randomToken, sha256 } from "@/lib/crypto";
import { pinHashle } from "@/domain/staff";
import { donemAraligi, tabanKurus } from "@/domain/butce";
import { isGunu } from "@/lib/tarih";
import { randomBytes } from "node:crypto";

/**
 * Mock butik — Ü137.
 *
 * ── Neden ayrı betik, neden ana tohumun içinde değil ────────
 *
 * Ana tohum (`tohum-gelistirme.ts`) **sıfırdan bir veritabanı** kuruyor
 * ve başındaki kontrol yüzünden dolu bir veritabanında hiç çalışmıyor.
 * Butiği oraya eklemek `db:reset` gerektirirdi — yani eldeki bütün test
 * verisini, açılmış kuponları, denenmiş akışları silmek.
 *
 * Bu betik **eklemeli** çalışıyor: var olanın üstüne butiği kuruyor,
 * ikinci kez çalıştırılırsa temizleyip yeniden kuruyor.
 *
 * ── Kafeden farkı ───────────────────────────────────────────
 *
 *   · `isletme_turu = 'butik'`
 *   · Ürünler kıyafet, ödüller giyim indirimi
 *   · **Çark koşulları** var — kafede bu kavram hiç kullanılmıyor
 *   · Masa yok: Ü127'den beri kafe başına tek karekod zaten
 *
 * ⚠️ Müşteriler **rıza kaydıyla** açılıyor. Rızasız bir oyuncu satırı
 * tohumda bile durmamalı: pazarlama kitlesi sorgusu onu eleyecek ve
 * "neden 12 kişiden 4'ü çıkıyor" diye bakan biri veriye değil koda
 * şüpheyle bakardı.
 */

const SLUG = "butik-moda";

/** Butiğin menüsü — kafe ürünleriyle karışmasın diye hepsi kıyafet. */
const URUNLER = [
  { ad: "Basic tişört", fiyat: 450_00, kategori: "Üst giyim" },
  { ad: "Oversize sweatshirt", fiyat: 1_250_00, kategori: "Üst giyim" },
  { ad: "Denim ceket", fiyat: 2_400_00, kategori: "Dış giyim" },
  { ad: "Kaşmir kazak", fiyat: 3_200_00, kategori: "Üst giyim" },
  { ad: "Mom jean", fiyat: 1_800_00, kategori: "Alt giyim" },
  { ad: "Deri çanta", fiyat: 4_500_00, kategori: "Aksesuar" },
  { ad: "İpek eşarp", fiyat: 890_00, kategori: "Aksesuar" },
];

/**
 * Ödüller — Ü52 aralığı: 25–50 TL, beşer basamakla.
 *
 * ⚠️ Butikte de aynı aralık. "Butik pahalı, ödülü de büyük olsun" diye
 * aralığın dışına çıkmak `odul_degeri_basamakli` kısıtından dönerdi ve
 * zaten yanlış olurdu: ödül değeri bütçeden çıkıyor ve E6'nın kanıt
 * kademeleri o aralığa göre ayarlı.
 */
const ODULLER = [
  { baslik: "25 TL indirim", kurus: 25_00, tip: "amount" as const },
  { baslik: "30 TL indirim", kurus: 30_00, tip: "amount" as const },
  { baslik: "%10 · İpek eşarp", kurus: 35_00, tip: "percent" as const, yuzde: 10 },
  { baslik: "40 TL indirim", kurus: 40_00, tip: "amount" as const },
  { baslik: "50 TL indirim", kurus: 50_00, tip: "amount" as const },
];

/** Müşteriler — adlar çeşitli, hepsi rıza kaydıyla. */
const MUSTERILER = [
  { ad: "Elif", soyad: "Yıldırım", yil: 1994, pazarlama: true },
  { ad: "Mert", soyad: "Kaya", yil: 1988, pazarlama: true },
  { ad: "Zeynep", soyad: "Arslan", yil: 1999, pazarlama: false },
  { ad: "Can", soyad: "Demir", yil: 1991, pazarlama: true },
  { ad: "Selin", soyad: "Öztürk", yil: 1996, pazarlama: false },
  { ad: "Burak", soyad: "Şahin", yil: 1985, pazarlama: true },
  { ad: "Deniz", soyad: "Aydın", yil: 2000, pazarlama: true },
  { ad: "Ayşe", soyad: "Çelik", yil: 1993, pazarlama: false },
];

async function temizle(cafeId: string) {
  const db = adminPool();
  // Sıra zorunlu: yabancı anahtarlar yukarıdan aşağı bağlı.
  for (const sql of [
    `DELETE FROM coupon_events WHERE coupon_id IN (SELECT id FROM coupons WHERE cafe_id = $1)`,
    `UPDATE cark_haklari SET coupon_id = NULL WHERE cafe_id = $1`,
    `DELETE FROM coupons WHERE cafe_id = $1`,
    `DELETE FROM cark_haklari WHERE cafe_id = $1`,
    `DELETE FROM cark_kosullari WHERE cafe_id = $1`,
    `DELETE FROM budget_ledger WHERE cafe_id = $1`,
    `DELETE FROM budget_periods WHERE cafe_id = $1`,
    `DELETE FROM player_aliases WHERE cafe_id = $1`,
    `DELETE FROM rewards WHERE cafe_id = $1`,
    `DELETE FROM products WHERE cafe_id = $1`,
    `DELETE FROM product_categories WHERE cafe_id = $1`,
    `DELETE FROM cafe_tables WHERE cafe_id = $1`,
    `DELETE FROM audit_log WHERE cafe_id = $1`,
    `DELETE FROM staff WHERE cafe_id = $1`,
    `DELETE FROM cafes WHERE id = $1`,
  ]) {
    await db.query(sql, [cafeId]);
  }
}

async function main() {
  const db = adminPool();

  const mevcut = await db.query<{ id: string }>(
    `SELECT id FROM cafes WHERE slug = $1`,
    [SLUG],
  );
  if ((mevcut.rowCount ?? 0) > 0) {
    console.log("Mevcut butik siliniyor ve yeniden kuruluyor…");
    await temizle(mevcut.rows[0].id);
  }

  const cafeId = newId("cafe");
  const yoneticiTel = normalizePhone("05320000003");

  /* ── İşletme ─────────────────────────────────────────── */

  await db.query(
    `INSERT INTO cafes (id, slug, name, city, lat, lng, isletme_turu,
                        contact_name_enc, contact_phone_enc, business_phone_enc,
                        status, approved_at, approved_by, applied_at)
     VALUES ($1,$2,$3,$4,$5,$6,'butik',$7,$8,$9,'approved', now(), 'tohum', now())`,
    [
      cafeId,
      SLUG,
      "Moda Butik",
      "İstanbul",
      41.0382,
      28.9855,
      encryptPII("Nazlı Kurt"),
      encryptPII(yoneticiTel),
      encryptPII("0212 444 55 66"),
    ],
  );

  /* ── Personel ────────────────────────────────────────── */

  await db.query(
    `INSERT INTO staff (id, cafe_id, name_enc, pin_hash, role, phone_index, phone_enc)
     VALUES ($1,$2,$3,'-','manager',$4,$5)`,
    [newId("stf"), cafeId, encryptPII("Nazlı Kurt"), phoneIndex(yoneticiTel), encryptPII(yoneticiTel)],
  );

  const kasiyerId = newId("stf");
  await db.query(
    `INSERT INTO staff (id, cafe_id, name_enc, pin_hash, role)
     VALUES ($1,$2,$3,$4,'cashier')`,
    [kasiyerId, cafeId, encryptPII("Kasiyer Derya"), await pinHashle("1234")],
  );

  /* ── Karekod — Ü127: kafe başına tek ──────────────────── */

  await db.query(
    `INSERT INTO cafe_tables (id, cafe_id, label, sort_order, qr_secret, kind)
     VALUES ($1,$2,$3,0,$4,'masa')`,
    [newId("tbl"), cafeId, "Moda Butik", randomBytes(16)],
  );

  /* ── Kategoriler ve ürünler ───────────────────────────── */

  const kategoriler = new Map<string, string>();
  for (const [i, ad] of [...new Set(URUNLER.map((u) => u.kategori))].entries()) {
    const id = newId("ktg");
    kategoriler.set(ad, id);
    // ⚠️ `kind` kapalı liste (0022): giyim türü yok, hepsi 'yiyecek'
    // dışında bir çizim istiyor. En nötr olanı seçiliyor — kart çizimi
    // yanlış olsa da bir hak kaybına yol açmıyor.
    await db.query(
      `INSERT INTO product_categories (id, cafe_id, name, kind, sort_order)
       VALUES ($1,$2,$3,'tatli',$4)`,
      [id, cafeId, ad, i],
    );
  }

  const urunIds: string[] = [];
  for (const u of URUNLER) {
    const id = newId("prd");
    urunIds.push(id);
    await db.query(
      `INSERT INTO products (id, cafe_id, name, price_kurus, category_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, cafeId, u.ad, u.fiyat, kategoriler.get(u.kategori)],
    );
  }

  /* ── Ödüller ─────────────────────────────────────────── */

  for (const [i, o] of ODULLER.entries()) {
    await db.query(
      `INSERT INTO rewards (id, cafe_id, kind, reward_type, title, points_price,
                            cost_kurus, percent, product_id, min_proof_level, sort_order)
       VALUES ($1,$2,'instant',$3,$4,0,$5,$6,$7,$8,$9)`,
      [
        newId("rwd"),
        cafeId,
        o.tip,
        o.baslik,
        o.kurus,
        o.tip === "percent" ? o.yuzde : null,
        o.tip === "percent" ? urunIds[6] : null,
        o.kurus <= 35_00 ? 2 : 3,
        i,
      ],
    );
  }

  /* ── Bütçe ───────────────────────────────────────────── */

  // ⚠️ Alan adları `baslangic`/`bitis` ve `tabanKurus` GÜN SAYISI alıyor
  // — tarih değil. İlk yazışta ikisi de yanlıştı ve `committed_kurus`
  // NaN olarak gidip veritabanından döndü.
  const bugun = isGunu();
  const { baslangic, bitis, gunSayisi } = donemAraligi(bugun);
  await db.query(
    `INSERT INTO budget_periods (id, cafe_id, period_start, period_end, committed_kurus)
     VALUES ($1,$2,$3,$4,$5)`,
    [newId("bdg"), cafeId, baslangic, bitis, Math.max(500_000, tabanKurus(gunSayisi))],
  );

  /* ── 🔴 Çark koşulları — butiğin çekirdeği ────────────── */

  const kosulId = newId("ksl");
  await db.query(
    `INSERT INTO cark_kosullari (id, cafe_id, tur, esik_kurus, created_by)
     VALUES ($1,$2,'tutar',$3,'tohum')`,
    [kosulId, cafeId, 3_000_00],
  );
  /*
    İkinci koşul — VEYA mantığını göstermek için, ama **KAPALI**.

    ⚠️ Açık olsaydı ürünün asıl senaryosunu gizlerdi: "günün ilk 5
    müşterisi" koşulu 2.500 TL'lik alışverişi de geçirir ve kasiyer
    *"500 TL daha alırsanız çark hakkı kazanıyorsunuz"* cümlesini hiç
    kuramazdı. Demoyu açan kişi önce o senaryoyu görmeli.

    Panelden tek tıkla açılıyor — açınca VEYA'nın etkisi anında
    görülüyor: aynı 2.500 TL bu kez hak kazanıyor.
  */
  await db.query(
    `INSERT INTO cark_kosullari (id, cafe_id, tur, adet, aktif, created_by)
     VALUES ($1,$2,'ilk_gelen',5,false,'tohum')`,
    [newId("ksl"), cafeId],
  );

  /* ── Müşteriler ──────────────────────────────────────── */

  const oyuncuIds: string[] = [];
  for (const [i, m] of MUSTERILER.entries()) {
    const tel = normalizePhone(`0555100${String(1000 + i).slice(-4)}`);

    // Numara başka bir tohumdan kalmış olabilir — varsa onu kullan.
    const varOlan = await db.query<{ id: string }>(
      `SELECT id FROM players WHERE phone_index = $1`,
      [phoneIndex(tel)],
    );

    let playerId: string;
    if ((varOlan.rowCount ?? 0) > 0) {
      playerId = varOlan.rows[0].id;
    } else {
      playerId = newId("plr");
      await db.query(
        `INSERT INTO players (id, phone_index, phone_enc, first_name_enc, last_name_enc, birth_year_enc)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          playerId,
          phoneIndex(tel),
          encryptPII(tel),
          encryptPII(m.ad),
          encryptPII(m.soyad),
          encryptPII(String(m.yil)),
        ],
      );
      await db.query(
        `INSERT INTO player_consents (id, player_id, kind, text_version)
         VALUES ($1,$2,'privacy_notice','v0-taslak')`,
        [newId("cns"), playerId],
      );
      if (m.pazarlama) {
        await db.query(
          `INSERT INTO player_consents (id, player_id, kind, text_version)
           VALUES ($1,$2,'commercial_message','v0-taslak')`,
          [newId("cns"), playerId],
        );
      }
    }

    oyuncuIds.push(playerId);

    // Anonim kod — kasiyer ad-soyad değil bunu görüyor (G1).
    // ⚠️ `player_aliases` tablosunun `id` kolonu YOK — birincil anahtar
    // (cafe_id, player_id) çifti. İlk yazışta `id` eklenmişti ve
    // veritabanından döndü.
    await db.query(
      `INSERT INTO player_aliases (cafe_id, player_id, code)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [cafeId, playerId, aliasCode()],
    );
  }

  /* ── Geçmiş: verilmiş haklar ve kuponlar ──────────────── */

  const odulSatirlari = await db.query<{ id: string; cost_kurus: string; title: string }>(
    `SELECT id, cost_kurus, title FROM rewards WHERE cafe_id = $1 ORDER BY sort_order`,
    [cafeId],
  );
  const donemSatiri = await db.query<{ id: string }>(
    `SELECT id FROM budget_periods WHERE cafe_id = $1`,
    [cafeId],
  );
  const donemId = donemSatiri.rows[0].id;

  let kullanilan = 0;
  let acik = 0;

  for (const [i, playerId] of oyuncuIds.entries()) {
    // İlk altı müşteri hak kullanmış; ikisi bugün kasada bekliyor.
    if (i >= 6) continue;

    const odul = odulSatirlari.rows[i % odulSatirlari.rows.length];
    const hakId = newId("hak");
    const kuponId = newId("kpn");
    // ⚠️ `used_at` dolu: bu haklar geçmişte kullanılmış. Açık bırakılsaydı
    // müşteriler girdiğinde çark çevirmeye hazır görünürlerdi.
    const gunOnce = i + 1;

    // İlk üçü kasada kullanılmış, kalanı elde duruyor.
    const redeemed = i < 3;
    await db.query(
      // ⚠️ Kolon adları şemadan: `source` diye bir kolon YOK ve onaylayan
      // kolonun adı `redeemed_by_staff_id`. Kullanılan kuponda
      // `committed_kurus` de dolu olmalı — rezerve edilen tutar kasada
      // kesinleşiyor ve rapor o kolonu okuyor.
      `INSERT INTO coupons (id, cafe_id, player_id, reward_id, status, code, qr_token,
                            issued_at, activates_at, expires_at, reserved_kurus,
                            committed_kurus, proof_level, budget_period_id,
                            redeemed_at, redeemed_by_staff_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,
               now() - ($8 || ' days')::interval,
               now() - ($8 || ' days')::interval,
               now() + interval '5 days',
               $9, $13, 3, $10, $11, $12)`,
      [
        kuponId,
        cafeId,
        playerId,
        odul.id,
        redeemed ? "redeemed" : "active",
        couponCode(),
        randomToken(24),
        String(gunOnce),
        Number(odul.cost_kurus),
        donemId,
        redeemed ? new Date(Date.now() - gunOnce * 86_400_000) : null,
        redeemed ? kasiyerId : null,
        redeemed ? Number(odul.cost_kurus) : 0,
      ],
    );


    // ⚠️ Hak kuponu referans veriyor (`coupon_id`), bu yüzden kupon ÖNCE
    // yazılıyor. Ters sırada yabancı anahtar reddediyor — gerçek akışta da
    // böyle: hak önce kuponsuz doğuyor, kupon üretilince bağlanıyor.
    await db.query(
      `INSERT INTO cark_haklari (id, cafe_id, jeton_hash, staff_id, kosul_id,
                                 created_at, expires_at, player_id, claimed_at, coupon_id, used_at)
       VALUES ($1,$2,$3,$4,$5, now() - ($6 || ' days')::interval,
               now() - ($6 || ' days')::interval + interval '15 minutes',
               $7, now() - ($6 || ' days')::interval, $8,
               now() - ($6 || ' days')::interval)`,
      [hakId, cafeId, sha256(randomToken(24)), kasiyerId, kosulId, String(gunOnce), playerId, kuponId],
    );

    if (redeemed) kullanilan++;
    else acik++;
  }

  const karekod = await db.query<{ qr_secret: Buffer }>(
    `SELECT qr_secret FROM cafe_tables WHERE cafe_id = $1 AND active`,
    [cafeId],
  );

  console.log("\n✓ Mock butik kuruldu\n");
  console.log(`  İşletme       Moda Butik  (${SLUG})`);
  console.log(`  Tür           butik — oyun yok, çark hakkı kasadan`);
  console.log(`  Kimlik        ${cafeId}`);
  console.log(`  Karekod       /m/${karekod.rows[0].qr_secret.subarray(0, 8).toString("hex")}`);
  console.log(`\n  Ürün ${URUNLER.length} · Ödül ${ODULLER.length} · Müşteri ${MUSTERILER.length}`);
  console.log(`  Kupon: ${kullanilan} kullanılmış, ${acik} elde duruyor`);
  console.log(`\n  Çark koşulları`);
  console.log(`    · 3.000 TL ve üzeri alışveriş`);
  console.log(`    · Günün ilk 5 müşterisi   [KAPALI — panelden aç]`);
  console.log(`    (herhangi biri yeterli — VEYA)`);
  console.log(`\n  Yönetici girişi   /kafe/giris   0532 000 00 03`);
  console.log(`  Kasiyer PIN       1234           → /kasa/cark`);
  console.log(`\n  Pazarlama rızası olan müşteri: ${MUSTERILER.filter((m) => m.pazarlama).length}\n`);
}

main()
  .then(() => closePools())
  .catch(async (e) => {
    console.error(e);
    await closePools();
    process.exit(1);
  });
