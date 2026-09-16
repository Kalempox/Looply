import "./_env";
import { adminPool, closePools } from "@/db/pool";
import { newId, aliasCode } from "@/lib/ids";
import { encryptPII, phoneIndex, normalizePhone, sha256 } from "@/lib/crypto";
import { hashle } from "@/domain/parola";
import { isGunu, gunEkle } from "@/lib/tarih";
import { donemAraligi, tabanKurus } from "@/domain/butce";

/**
 * Elle denemek için hazır oyuncu hesabı — Ü144.
 *
 * ── Neden gerekti ───────────────────────────────────────────
 *
 * Ürün sahibi: *"bana içinde kazımayı test edebileceğim, çark ve günlük
 * streak muhabbeti de çalışan hesap ver — neden şu an bu böyle."*
 *
 * Sorunun cevabı ürünün kendi kurallarında: kafedeki oyuncunun **masa
 * oturumu** iki saatte doluyor ve dolduğu anda ekranın yarısı kapanıyor.
 *
 *   · çark    → `cark/page.tsx` açık masa oturumu (ya da butik hakkı) istiyor
 *   · puan/XP → K2 (konum doğrulaması) olmadan yazılmıyor
 *   · seri    → `play_sessions` içindeki **tamamlanmış** turlardan sayılıyor
 *   · kazıma  → kapalı bir kupon gerekiyor, o da ancak oyundan düşüyor
 *
 * Yani "hesapta hiçbir şey yok" bir arıza değil, oturum düşmüş bir
 * hesabın doğru görüntüsü. Ama elle denemek için her seferinde karekod
 * okutup üç gün üst üste oynamak gerçekçi değil — bu betik o durumu
 * **kurallara uyarak** kuruyor.
 *
 * ── Ne kuruyor ──────────────────────────────────────────────
 *
 *   1. Parolalı bir hesap (SMS kodu beklemeden girilebilsin)
 *   2. Kafe A'da AÇIK ve konumu doğrulanmış masa oturumu (K2)
 *   3. Son üç güne tamamlanmış oyun turları → günlük seri 3
 *   4. Puan ve XP → seviye çubuğu dolu görünsün
 *   5. Çark hakkı açık (son 24 saatte çevirme yok)
 *   6. **Kazınmayı bekleyen** bir kupon + karşılaştırma için açık bir kupon
 *
 * ── ⚠️ Bugün bilerek oynanmamış sayılıyor ───────────────────
 *
 * Seri dünden geriye üç gün; bugün boş. Sebep: ekranın asıl anlatmak
 * istediği şey *"serin risk altında, bugün oyna"* ve o hâl ancak bugün
 * oynanmamışken görünüyor. Bugün de dolu olsaydı kart sakin dururdu ve
 * denenecek bir şey kalmazdı.
 *
 * ── ⚠️ Kupon kapalı doğuyor ama oyundan geçmiyor ────────────
 *
 * Kapalı kupon normalde `anlikOdulVer`den çıkıyor ve o **şansa bağlı**:
 * betik her çalıştığında kupon düşeceğinin garantisi yok. Burada kupon
 * doğrudan yazılıyor — denemek için hazır bir kart gerekiyor, motorun
 * doğruluğu zaten testlerde sınanıyor (`kupon-kazima.test.ts`).
 *
 * ── Eklemeli çalışıyor ──────────────────────────────────────
 *
 * `tohum-gelistirme.ts` sıfırdan kuruyor ve dolu veritabanında hiç
 * çalışmıyor. Bu betik var olanın üstüne ekliyor; ikinci kez
 * çalıştırılırsa hesabın durumunu **tazeliyor** (oturumu uzatıyor,
 * kuponları yeniliyor). Böylece "hesabım yine doldu" dendiğinde tek
 * komutla geri geliyor.
 */

const TELEFON = "05320000099";
const PAROLA = "Deneme1234";
const AD = "Buse";
const SOYAD = "Deneme";

/** Kafe A'nın tohumdaki konumu — K2 doğrulaması buna bakıyor. */
const KAFE_SLUG = "kafe-a";

async function main() {
  const db = adminPool();
  const bugun = isGunu();
  const telefon = normalizePhone(TELEFON);

  /* ── Kafe ve personel ─────────────────────────────────── */

  const kafe = await db.query<{ id: string; name: string; lat: number; lng: number }>(
    "SELECT id, name, lat, lng FROM cafes WHERE slug = $1",
    [KAFE_SLUG],
  );
  if (kafe.rowCount === 0) {
    throw new Error(`${KAFE_SLUG} yok — önce: npm run db:seed`);
  }
  const cafeId = kafe.rows[0].id;
  const cafeAdi = kafe.rows[0].name;

  const masa = await db.query<{ id: string }>(
    "SELECT id FROM cafe_tables WHERE cafe_id = $1 ORDER BY sort_order LIMIT 1",
    [cafeId],
  );
  if (masa.rowCount === 0) throw new Error("Kafenin masası yok — önce: npm run db:seed");
  const tableId = masa.rows[0].id;

  /* ── 1 · Hesap ────────────────────────────────────────── */

  const idx = phoneIndex(telefon);
  const varOlan = await db.query<{ id: string }>(
    "SELECT id FROM players WHERE phone_index = $1",
    [idx],
  );

  let playerId: string;
  if (varOlan.rowCount && varOlan.rows[0]) {
    playerId = varOlan.rows[0].id;
  } else {
    playerId = newId("plr");
    await db.query(
      `INSERT INTO players (id, phone_index, phone_enc, first_name_enc, last_name_enc, birth_year_enc)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        playerId,
        idx,
        encryptPII(telefon),
        encryptPII(AD),
        encryptPII(SOYAD),
        encryptPII("1995"),
      ],
    );
    // Aydınlatma onayı olmadan hesap açılmış sayılmaz (docs/08).
    // ⚠️ `kind` kapalı bir liste (göç 0002/0019): 'aydinlatma' değil
    // 'privacy_notice'. Türkçe bir değer yazmak kısıta takılıyor.
    await db.query(
      `INSERT INTO player_consents (id, player_id, kind, text_version)
       VALUES ($1,$2,'privacy_notice','tohum')`,
      [newId("cns"), playerId],
    );
  }

  await db.query("UPDATE players SET password_hash = $2 WHERE id = $1", [
    playerId,
    await hashle(PAROLA),
  ]);

  // Kafeye özel takma ad — oyuncu kafeye anonim kodla görünüyor (G1).
  // ⚠️ Tablonun kendi `id` kolonu yok; anahtarı (cafe_id, player_id).
  await db.query(
    `INSERT INTO player_aliases (cafe_id, player_id, code)
     VALUES ($1,$2,$3)
     ON CONFLICT (cafe_id, player_id) DO NOTHING`,
    [cafeId, playerId, aliasCode()],
  );

  /* ── Bütçe: kupon ve çark ödülü bütçeden rezerve ediyor ── */

  const donem = donemAraligi(bugun);
  await db.query(
    `INSERT INTO budget_periods (id, cafe_id, period_start, period_end, committed_kurus)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (cafe_id, period_start) DO UPDATE SET committed_kurus = EXCLUDED.committed_kurus`,
    [newId("bdg"), cafeId, donem.baslangic, donem.bitis, tabanKurus(300_000)],
  );

  /* ── 2 · Açık ve doğrulanmış masa oturumu ─────────────── */

  /*
    ⚠️ Oturumun "açık" olması bir `status` kolonundan değil,
    `expires_at > now()` koşulundan geliyor (bkz. `masa.aktif`). Eski
    oturumları kapatmak için geçmişe çekmek yeterli — silmek, oyuncunun
    geçmişini defterden koparırdı.
  */
  await db.query(
    "UPDATE table_sessions SET expires_at = now() - interval '1 minute' WHERE player_id = $1 AND expires_at > now()",
    [playerId],
  );

  const oturumId = newId("tbs");
  await db.query(
    `INSERT INTO table_sessions
       (id, cafe_id, table_id, player_id, device_id_hash, proof_mask, proof_level,
        started_at, expires_at, last_seen_at, geo_distance_m, geo_checked_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, now(), now() + interval '6 hours', now(), 12, now())`,
    [
      oturumId,
      cafeId,
      tableId,
      playerId,
      sha256(`demo-cihaz-${playerId}`),
      // K1 (karekod) + K2 (konum) — kanıt maskesi iki biti de taşıyor.
      0b11,
      2,
    ],
  );

  /* ── 3 · Son üç gün oynanmış: günlük seri 3 ───────────── */

  await db.query(
    "DELETE FROM play_sessions WHERE player_id = $1 AND status = 'completed'",
    [playerId],
  );
  for (let g = 1; g <= 3; g++) {
    await db.query(
      `INSERT INTO play_sessions
         (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
          table_session_id, proof_mask, proof_level, business_date, status,
          started_at, ended_at, duration_ms, server_score, claimed_score, is_qualified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'completed',
               now() - ($12 || ' days')::interval,
               now() - ($12 || ' days')::interval + interval '4 minutes',
               240000,$13,$13,true)`,
      [
        newId("pls"),
        cafeId,
        tableId,
        playerId,
        sha256(`demo-cihaz-${playerId}`),
        "blok",
        newId("sed"),
        oturumId,
        0b11,
        2,
        gunEkle(bugun, -g),
        String(g),
        900 + g * 120,
      ],
    );
  }

  /* ── 4 · Puan ve XP ───────────────────────────────────── */

  await db.query("DELETE FROM points_ledger WHERE player_id = $1", [playerId]);
  await db.query("DELETE FROM xp_ledger WHERE player_id = $1", [playerId]);

  for (let g = 1; g <= 3; g++) {
    await db.query(
      `INSERT INTO points_ledger
         (id, cafe_id, player_id, business_date, delta, reason, multiplier, proof_level)
       VALUES ($1,$2,$3,$4,$5,'oyun',1,2)`,
      [newId("pnt"), cafeId, playerId, gunEkle(bugun, -g), 300],
    );
    // ⚠️ `source_type` kapalı ve BÜYÜK HARF bir liste (göç 0009):
    // GAME / BADGE / REFERRAL / ADJUSTMENT / CHALLENGE.
    await db.query(
      `INSERT INTO xp_ledger
         (id, cafe_id, player_id, business_date, delta, source_type, proof_level)
       VALUES ($1,$2,$3,$4,$5,'GAME',2)`,
      [newId("xp"), cafeId, playerId, gunEkle(bugun, -g), 60],
    );
  }

  /* ── 5 · Çark hakkı açık ──────────────────────────────── */

  // Çark 24 saatte bir; son çevirmeyi silmek hakkı geri açıyor.
  await db.query(
    "DELETE FROM coupons WHERE player_id = $1 AND id LIKE 'kpn_demo_%'",
    [playerId],
  );
  await db.query(
    `DELETE FROM coupons
      WHERE player_id = $1 AND issued_at > now() - interval '24 hours'`,
    [playerId],
  );

  /* ── 6 · Kazınacak kupon + karşılaştırma kuponu ───────── */

  const odul = await db.query<{ id: string; cost_kurus: string; title: string }>(
    `SELECT id, cost_kurus, title FROM rewards
      WHERE cafe_id = $1 AND kind = 'instant' AND active
      ORDER BY sort_order LIMIT 1`,
    [cafeId],
  );
  if (odul.rowCount === 0) throw new Error("Kafenin anlık ödülü yok — önce: npm run db:seed");

  const donemSatiri = await db.query<{ id: string }>(
    "SELECT id FROM budget_periods WHERE cafe_id = $1 ORDER BY period_start DESC LIMIT 1",
    [cafeId],
  );

  const kuponYaz = async (id: string, kod: string, kapali: boolean) => {
    await db.query(
      `INSERT INTO coupons
         (id, cafe_id, player_id, reward_id, code, qr_token, status,
          activates_at, expires_at, budget_period_id, reserved_kurus, proof_level, revealed_at)
       VALUES ($1,$2,$3,$4,$5,$6,'active', now(), now() + interval '7 days',$7,$8,2,$9)`,
      [
        id,
        cafeId,
        playerId,
        odul.rows[0].id,
        kod,
        `jeton-${id}`,
        donemSatiri.rows[0].id,
        Number(odul.rows[0].cost_kurus),
        kapali ? null : new Date(),
      ],
    );
  };

  await kuponYaz("kpn_demo_kapali", "DEMO01", true);
  await kuponYaz("kpn_demo_acik", "DEMO02", false);

  console.log("");
  console.log("  Demo oyuncu hazır");
  console.log("  ─────────────────────────────────────────────");
  console.log(`  telefon : ${TELEFON}`);
  console.log(`  parola  : ${PAROLA}`);
  console.log(`  kafe    : ${cafeAdi} · masa oturumu açık (K2), 6 saat`);
  console.log("");
  console.log("  Hazır olanlar:");
  console.log("    · Ödüllerim → kazınmayı bekleyen 1 kupon (DEMO01)");
  console.log(`    · Ödüllerim → karşılaştırma için açık 1 kupon (${odul.rows[0].title})`);
  console.log("    · Çark      → hakkı açık, çevrilebilir");
  console.log("    · Seri      → 3 gün üst üste; bugün oynanmadı (riskte)");
  console.log("    · Puan/XP   → 900 puan, 180 XP");
  console.log("");
  console.log("  Oturum dolarsa tekrar çalıştır: npm run db:demo");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(closePools);
