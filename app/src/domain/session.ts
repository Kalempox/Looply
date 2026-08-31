import { cookies, headers } from "next/headers";
import { withBypass } from "@/db/context";
import { hashSessionToken, identifierHash, randomToken } from "@/lib/crypto";
import { newId } from "@/lib/ids";
import { log } from "@/lib/log";
import { isProduction } from "@/lib/env";
import { omurSaniye, type Rol } from "./oturum-omru";

/**
 * Oturum yönetimi — docs/08 §4.4.
 *
 * Oturumlar sunucuda tutuluyor: çerezin içinde yalnızca rastgele bir jeton var,
 * veritabanında onun hash'i duruyor. İki sonucu var:
 *   · Çerez çalınsa bile jeton veritabanı olmadan işe yaramaz
 *   · Oturum **uzaktan iptal edilebilir** — çalınan tablet, ayrılan personel
 *
 * Rol başına farklı ömür: oyuncunun telefonu kendisinde, kafenin tableti
 * tezgâhta duruyor. Aynı süreyi vermek yanlış olurdu.
 */

export const COOKIE_ADI = "cp_oturum";

/** Ömür kuralı `oturum-omru.ts` içinde — orası saf, dolayısıyla sınanabilir. */
export { omurSaniye } from "./oturum-omru";
export type { Rol } from "./oturum-omru";

export type Oturum = {
  id: string;
  rol: Rol;
  ozneTipi: "player" | "staff" | "platform";
  ozneId: string;
  cafeId: string | null;
  sonGorulme: Date;
};

async function istekBilgisi() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? undefined;
  const ua = h.get("user-agent") ?? undefined;
  return { ip, ua };
}

/**
 * Yeni oturum açar ve çerezi yazar.
 * Dönen jeton hiçbir yerde saklanmaz — yalnızca çereze gider.
 */
export async function olustur(opts: {
  ozneTipi: "player" | "staff" | "platform";
  ozneId: string;
  rol: Rol;
  cafeId?: string;
  cihazId?: string;
  /**
   * Oyuncu "beni hatırla" dedi mi.
   *
   * Yalnızca oyuncu rolünde anlamlı: kasiyer ve panel oturumlarının süresi
   * güvenlik kararı (docs/08 §4.4), kullanıcı tercihi değil.
   */
  hatirla?: boolean;
}): Promise<Oturum> {
  const jeton = randomToken(32);
  const id = newId("ses");
  const { ip, ua } = await istekBilgisi();

  const sonGecerlilik = new Date(Date.now() + omurSaniye(opts.rol, opts.hatirla) * 1000);

  await withBypass("oturum oluşturma", (db) =>
    db.query(
      `INSERT INTO sessions
         (id, subject_type, subject_id, cafe_id, role, token_hash,
          device_id_hash, ua_hash, ip_hash, expires_at, remember_me)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        opts.ozneTipi,
        opts.ozneId,
        opts.cafeId ?? null,
        opts.rol,
        hashSessionToken(jeton),
        opts.cihazId ? identifierHash(opts.cihazId) : null,
        ua ? identifierHash(ua) : null,
        ip ? identifierHash(ip) : null,
        sonGecerlilik,
        opts.hatirla ?? false,
      ],
    ),
  );

  const c = await cookies();
  c.set(COOKIE_ADI, jeton, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    expires: sonGecerlilik,
  });

  log.info("oturum acildi", { rol: opts.rol, ozneTipi: opts.ozneTipi });
  return {
    id,
    rol: opts.rol,
    ozneTipi: opts.ozneTipi,
    ozneId: opts.ozneId,
    cafeId: opts.cafeId ?? null,
    sonGorulme: new Date(),
  };
}

/** Geçerli oturumu okur. Yoksa, süresi dolmuşsa veya iptal edilmişse null. */
export async function oku(): Promise<Oturum | null> {
  const jeton = (await cookies()).get(COOKIE_ADI)?.value;
  if (!jeton) return null;

  return withBypass("oturum okuma", async (db) => {
    const r = await db.one<{
      id: string;
      role: Rol;
      subject_type: "player" | "staff" | "platform";
      subject_id: string;
      cafe_id: string | null;
      last_seen_at: Date;
    }>(
      `SELECT id, role, subject_type, subject_id, cafe_id, last_seen_at
         FROM sessions
        WHERE token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > now()`,
      [hashSessionToken(jeton)],
    );

    if (!r) return null;

    // Son görülme dakikada bir güncellenir — her istekte yazmaya değmez
    if (Date.now() - r.last_seen_at.getTime() > 60_000) {
      await db.query(`UPDATE sessions SET last_seen_at = now() WHERE id = $1`, [r.id]);
    }

    return {
      id: r.id,
      rol: r.role,
      ozneTipi: r.subject_type,
      ozneId: r.subject_id,
      cafeId: r.cafe_id,
      sonGorulme: r.last_seen_at,
    };
  });
}

/** Bu cihazdaki oturumu kapatır. */
export async function kapat(sebep = "cikis"): Promise<void> {
  const jeton = (await cookies()).get(COOKIE_ADI)?.value;
  if (jeton) {
    await withBypass("oturum kapatma", (db) =>
      db.query(
        `UPDATE sessions SET revoked_at = now(), revoke_reason = $2 WHERE token_hash = $1`,
        [hashSessionToken(jeton), sebep],
      ),
    );
  }
  (await cookies()).delete(COOKIE_ADI);
}

/**
 * Bir öznenin TÜM oturumlarını iptal eder.
 * Çalınan cihaz, ayrılan personel, ihlal şüphesi — acil durdurmanın parçası (G18).
 */
export async function tumunuIptalEt(ozneId: string, sebep: string): Promise<number> {
  const n = await withBypass("tüm oturumları iptal", async (db) => {
    const r = await db.query(
      `UPDATE sessions SET revoked_at = now(), revoke_reason = $2
        WHERE subject_id = $1 AND revoked_at IS NULL`,
      [ozneId, sebep],
    );
    return r.rowCount ?? 0;
  });
  log.warn("oturumlar iptal edildi", { adet: n, sebep });
  return n;
}

/**
 * Bu cihaz bu hesapta daha önce görüldü mü?
 * Görülmediyse çağıran taraf "yeni cihazdan giriş" bildirimi gönderir (Faz 3).
 */
export async function cihazTanidikMi(ozneId: string, cihazId: string): Promise<boolean> {
  const r = await withBypass("cihaz tanıma", (db) =>
    db.one<{ n: string }>(
      `SELECT count(*) AS n FROM sessions
        WHERE subject_id = $1 AND device_id_hash = $2`,
      [ozneId, identifierHash(cihazId)],
    ),
  );
  return Number(r?.n ?? 0) > 0;
}
