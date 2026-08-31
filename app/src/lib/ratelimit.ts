import { withBypass } from "@/db/context";
import { log } from "./log";

/**
 * Hız sınırı — üç katman: IP, cihaz, hesap (docs/07 §2.5).
 *
 * Postgres tabanlı, sabit pencereli sayaç. Redis bilerek yok:
 * erken ölçekte gereksiz bir bileşen ve arızası tüm girişleri kilitler.
 *
 * SMS için bu sadece güvenlik değil, MALİYET kontrolü: sınırsız bırakılırsa
 * saldırgan bedava SMS yaktırır (docs/07 §2.3).
 */

export type Limit = { hits: number; windowSeconds: number };

/** docs/07 §2.3 ve §2.5'teki kotalar tek yerde. */
export const LIMITS = {
  otp_per_phone_minute: { hits: 1, windowSeconds: 60 },
  otp_per_phone_hour: { hits: 5, windowSeconds: 3600 },
  otp_per_phone_day: { hits: 10, windowSeconds: 86_400 },
  otp_per_ip_hour: { hits: 5, windowSeconds: 3600 },
  request_per_ip_minute: { hits: 20, windowSeconds: 60 },
  session_per_device_hour: { hits: 6, windowSeconds: 3600 },
  // Kasiyer PIN'i 4 hane = 10.000 ihtimal. Cihaz bağlama tek başına yetmez;
  // kayıtlı cihaz çalınırsa deneme sayısı da sınırlı olmalı (docs/08 §4.7).
  pin_per_device_15min: { hits: 5, windowSeconds: 900 },
} as const satisfies Record<string, Limit>;

export type LimitAdi = keyof typeof LIMITS;

export type Sonuc = { izinli: boolean; kalan: number; sifirlanma: Date };

function pencereBasi(windowSeconds: number): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(Date.now() / ms) * ms);
}

/**
 * Sayacı artırır ve sonucu döner. Sınır aşıldıysa `izinli: false`.
 *
 * `anahtar` kişisel veri İÇERMEMELİ — telefon numarası değil, onun
 * kör indeksinin ilk baytları geçilmeli (docs/08 §7.1).
 */
export async function tuket(ad: LimitAdi, anahtar: string): Promise<Sonuc> {
  const limit = LIMITS[ad];
  const baslangic = pencereBasi(limit.windowSeconds);
  const bucket = `${ad}:${anahtar}`;

  const hits = await withBypass("hız sınırı sayacı", async (db) => {
    const row = await db.one<{ hits: number }>(
      `INSERT INTO rate_limits (bucket, window_start, hits)
       VALUES ($1, $2, 1)
       ON CONFLICT (bucket, window_start)
       DO UPDATE SET hits = rate_limits.hits + 1
       RETURNING hits`,
      [bucket, baslangic],
    );
    return row?.hits ?? 1;
  });

  const izinli = hits <= limit.hits;
  if (!izinli) {
    log.warn("hiz siniri asildi", { limit: ad, hits, tavan: limit.hits });
  }

  return {
    izinli,
    kalan: Math.max(0, limit.hits - hits),
    sifirlanma: new Date(baslangic.getTime() + limit.windowSeconds * 1000),
  };
}

/** Süresi geçmiş sayaçları siler. Günlük bir işten çağrılır. */
export async function temizle(): Promise<number> {
  return withBypass("hız sınırı temizliği", async (db) => {
    const r = await db.query(
      `DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`,
    );
    return r.rowCount ?? 0;
  });
}
