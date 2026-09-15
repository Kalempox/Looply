import { withCafe, withBypass } from "@/db/context";
import { newId } from "@/lib/ids";
import { randomToken, sha256 } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";

/**
 * Çark hakkı — kasiyerin verdiği tekil hak (Ü137).
 *
 * ── Akış ────────────────────────────────────────────────────
 *
 *   1. Kasiyer alışveriş tutarını giriyor
 *   2. Koşul tutuyorsa **hak** doğuyor ve ekranda bir QR beliriyor
 *   3. Müşteri QR'ı kendi telefonuyla okutuyor
 *   4. Kaydoluyor ya da giriş yapıyor — **rızayı kendisi veriyor**
 *   5. Çarkı çeviriyor, kupon telefonuna düşüyor
 *
 * ── 🔴 Satırda kişisel veri YOK ─────────────────────────────
 *
 * İlk tarifte kasiyer müşterinin adını ve telefonunu yazacaktı. O kurgu
 * rıza zincirini kırıyordu: kasiyerin girdiği veriye kim onay verdi?
 * Ürün sahibinin kararı QR oldu — hak verilirken müşterinin kim olduğu
 * **bilinmiyor**, `player_id` ancak müşteri jetonu okutup kendi
 * kaydolduğunda doluyor.
 *
 * ── Jeton neden özetleniyor ─────────────────────────────────
 *
 * Veritabanında `sha256` duruyor, ham jeton değil. Veritabanı sızsa bile
 * o özetten QR üretilemez; ham jeton yalnızca kasadaki ekranda ve
 * müşterinin adres çubuğunda yaşıyor. Kupon jetonlarıyla aynı mantık.
 *
 * ── Süre neden kısa ─────────────────────────────────────────
 *
 * Hak **kasada duran insan** için. Yarım saat sonra okutulan bir QR,
 * kasadan ayrılmış birinin ya da fotoğrafını alan başkasının elinde
 * demektir. On beş dakika, kuyruğu ve tereddüdü karşılayacak kadar
 * uzun, paylaşılacak kadar değil.
 */

/** Hakkın ömrü. Kasada geçen süre dakikalarla ölçülüyor. */
export const HAK_OMRU_DK = 15;

/**
 * Giriş yapmamış müşterinin jetonunu taşıyan çerez.
 *
 * Giriş akışında dönüş adresi taşıyan bir parametre yok ve eklemek
 * kayıt/giriş/OTP zincirinin tamamına dokunmak demekti. Jeton bu çerezde
 * bekliyor; `/cark` dönüşte buluyor ve hakkı sahipleniyor.
 *
 * ⚠️ HttpOnly ve hakla **aynı ömürde**: sönmüş bir hakkın jetonu
 * ortalıkta kalmasın.
 */
export const HAK_COOKIE = "cp_hak";

export type Hak = {
  hakId: string;
  /** Ham jeton — YALNIZCA üretildiği anda dönüyor, bir daha okunamıyor. */
  jeton: string;
  sonGecerlilik: Date;
};

/**
 * Kasiyer hakkı veriyor.
 *
 * ⚠️ `cafeId` ve `staffId` **oturumdan** geliyor (Değişmez kural #3).
 * Formdan gelselerdi bir kasiyer başka işletmenin adına hak üretirdi.
 */
export async function ver(opts: {
  cafeId: string;
  staffId: string;
  kosulId: string;
}): Promise<Hak> {
  const jeton = randomToken(24);
  const hakId = newId("hak");
  const sonGecerlilik = new Date(Date.now() + HAK_OMRU_DK * 60_000);

  await withCafe(opts.cafeId, async (db) => {
    await db.query(
      `INSERT INTO cark_haklari (id, cafe_id, jeton_hash, staff_id, kosul_id, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [hakId, opts.cafeId, sha256(jeton), opts.staffId, opts.kosulId, sonGecerlilik],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.staffId,
      cafeId: opts.cafeId,
      action: "cark.hak_ver",
      targetType: "cark_hakki",
      targetId: hakId,
      detail: { kosulId: opts.kosulId },
    });
  });

  log.info("cark hakki verildi");
  return { hakId, jeton, sonGecerlilik };
}

export type HakDurumu =
  | { durum: "gecerli"; hakId: string; cafeId: string; cafeAdi: string }
  | { durum: "bulunamadi" }
  | { durum: "suresi_doldu" }
  | { durum: "kullanildi" };

/**
 * Müşterinin okuttuğu jetonu çözer.
 *
 * ⚠️ `withBypass`: müşteri henüz hiçbir işletmenin bağlamında değil —
 * QR'ı okutan kişi oturum açmamış bile olabilir. Süzgeç sorguda ve
 * jetonun kendisi: özet eşleşmiyorsa hiçbir satır dönmüyor.
 *
 * ⚠️ Süre ve kullanım **burada** kontrol ediliyor, çağıranda değil.
 * Çağırana bırakılsaydı bir yol unutur ve süresi dolmuş hak çevrilirdi.
 */
export async function coz(jeton: string): Promise<HakDurumu> {
  if (!jeton || jeton.length < 10) return { durum: "bulunamadi" };

  const r = await withBypass("çark hakkı çözümleme", (db) =>
    db.one<{
      id: string;
      cafe_id: string;
      cafe_adi: string;
      expires_at: Date;
      used_at: Date | null;
    }>(
      `SELECT h.id, h.cafe_id, c.name AS cafe_adi, h.expires_at, h.used_at
         FROM cark_haklari h
         JOIN cafes c ON c.id = h.cafe_id AND c.status = 'approved'
        WHERE h.jeton_hash = $1`,
      [sha256(jeton)],
    ),
  );

  if (!r) return { durum: "bulunamadi" };
  if (r.used_at) return { durum: "kullanildi" };
  if (r.expires_at.getTime() <= Date.now()) return { durum: "suresi_doldu" };

  return { durum: "gecerli", hakId: r.id, cafeId: r.cafe_id, cafeAdi: r.cafe_adi };
}

/**
 * Hakkı müşteriye bağlar — müşteri kaydolduktan/giriş yaptıktan sonra.
 *
 * ⚠️ Koşullu `UPDATE`: `player_id IS NULL AND used_at IS NULL`. İki
 * telefon aynı QR'ı aynı anda okutursa yalnızca biri bağlanıyor.
 * Önce okuyup sonra yazsaydık ikisi de "boş" görür ve hak iki kişiye
 * birden bağlanırdı.
 */
export async function sahiplen(
  hakId: string,
  playerId: string,
): Promise<{ ok: boolean }> {
  const r = await withBypass("çark hakkı sahiplenme", (db) =>
    db.query(
      `UPDATE cark_haklari
          SET player_id = $2, claimed_at = now()
        WHERE id = $1 AND used_at IS NULL AND expires_at > now()
          AND (player_id IS NULL OR player_id = $2)`,
      [hakId, playerId],
    ),
  );
  return { ok: (r.rowCount ?? 0) > 0 };
}

/**
 * Oyuncunun çevirebileceği açık hakkı — varsa.
 *
 * Butik çarkı bunu arıyor; kafede karşılığı masa oturumu. `cark.ts`
 * değişmedi, iki yol ayrı duruyor.
 */
export async function acikHak(
  playerId: string,
): Promise<{ hakId: string; cafeId: string } | null> {
  const r = await withBypass("açık çark hakkı", (db) =>
    db.one<{ id: string; cafe_id: string }>(
      `SELECT id, cafe_id FROM cark_haklari
        WHERE player_id = $1 AND used_at IS NULL AND expires_at > now()
        ORDER BY created_at DESC LIMIT 1`,
      [playerId],
    ),
  );
  return r ? { hakId: r.id, cafeId: r.cafe_id } : null;
}

/**
 * Hakkı harcanmış olarak işaretler — çark çevrilmeden **ÖNCE**.
 *
 * ── 🔴 Neden önce ───────────────────────────────────────────
 *
 * Kupon üretildikten sonra harcasaydık, iki eşzamanlı istek ikisi de
 * kuponu üretir, sonra biri hakkı harcayamaz ve ortada **sahipsiz bir
 * kupon** kalırdı — kafenin bütçesinden çıkmış, kimsenin hakkına
 * yazılmamış. Koşullu `UPDATE` yarışı burada kapatıyor: `used_at IS
 * NULL` tutmazsa `false` dönüyor ve çağıran kuponu hiç üretmiyor.
 *
 * Bedeli: kupon üretimi düşerse hak yanmış olur. `geriAc` onun için var.
 */
export async function harca(
  hakId: string,
  playerId: string,
  kuponId: string,
): Promise<{ ok: boolean }> {
  const r = await withBypass("çark hakkı harcama", (db) =>
    db.query(
      `UPDATE cark_haklari SET used_at = now(), coupon_id = NULLIF($3, '')
        WHERE id = $1 AND player_id = $2 AND used_at IS NULL AND expires_at > now()`,
      [hakId, playerId, kuponId],
    ),
  );
  return { ok: (r.rowCount ?? 0) > 0 };
}

/**
 * Üretilen kuponu hakka bağlar — "bu alışveriş hangi kuponu doğurdu".
 *
 * Harcama anında kupon kimliği henüz yok (kupon sonra üretiliyor), bu
 * yüzden iki adım. Bağ kurulamazsa hak yine harcanmış kalıyor: iz
 * eksilir ama para muhasebesi bozulmaz.
 */
export async function kuponuBagla(hakId: string, kuponId: string): Promise<void> {
  await withBypass("çark hakkı kupon bağı", (db) =>
    db.query(`UPDATE cark_haklari SET coupon_id = $2 WHERE id = $1`, [hakId, kuponId]),
  );
}

/**
 * Yanan hakkı geri açar — kupon üretilemediyse.
 *
 * ⚠️ Bütçe dolduğu için kupon çıkmamış olabilir ve müşteri alışverişini
 * **yapmış** durumda. Hakkı yakmak, parasını harcamış müşteriden hakkını
 * almak olurdu. Süre yeniden uzatılmıyor: hak aynı pencerede kalıyor,
 * yalnızca "kullanıldı" işareti kalkıyor.
 */
export async function geriAc(hakId: string): Promise<void> {
  await withBypass("çark hakkı geri açma", (db) =>
    db.query(
      `UPDATE cark_haklari SET used_at = NULL, coupon_id = NULL WHERE id = $1`,
      [hakId],
    ),
  );
  log.warn("cark hakki geri acildi — kupon uretilemedi");
}

/**
 * İşletmenin adı — butik çark ekranının alt yazısı için.
 *
 * Kafede bu bilgi masa oturumunda geliyor; butikte masa oturumu yok ve
 * ekranın "ödülü kim karşılıyor" cümlesi yine doğru olmalı.
 */
export async function isletmeAdi(cafeId: string): Promise<string> {
  const r = await withBypass("çark ekranı — işletme adı", (db) =>
    db.one<{ name: string }>(`SELECT name FROM cafes WHERE id = $1`, [cafeId]),
  );
  return r?.name ?? "İşletme";
}
