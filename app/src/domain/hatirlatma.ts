import { withBypass } from "@/db/context";
import { newId } from "@/lib/ids";
import { decryptPII } from "@/lib/crypto";
import { log } from "@/lib/log";
import { gonder, type Sablon } from "@/sms";

/**
 * Kupon hatırlatmaları — Ü39'un vaadini çağıran şey.
 *
 * ── Neden var ───────────────────────────────────────────────
 *
 * Ü39 "eşiğin üstündeki ödül 24 saat sonra açılır" diyor ve bunun amacı
 * ertesi ziyaret. Ama kupon sessizce açılıyordu: oyuncuya hiçbir şey
 * gitmiyordu. "Yarın tekrar gel" mekaniği kurulmuş ama çağıran yoktu.
 *
 * ── Neden hizmet bildirimi ──────────────────────────────────
 *
 * Mesaj, oyuncunun **kendi kazandığı** kuponun durumunu söylüyor: kafe adı
 * yok, ürün yok, kampanya yok, link yok, çağrı yok. G7'nin ticari ileti
 * izni ve İYS kaydı şartı bu yüzden doğmuyor.
 *
 * Sınıflandırmayı ayakta tutan tek şey içerik disiplini — iyi niyet değil.
 * `tests/hatirlatma.test.ts` şablon metinlerini bu yüzden sınıyor: birisi
 * "yeni tatlımızı dene" eklerse CI kırılıyor.
 *
 * İzin sorulmaması kapatılamaz demek değil: `service_reminder` tercihi
 * kayıtta açık başlıyor, `/verilerim` ekranından kapatılıyor.
 *
 * ⚠️ Sınıflandırma ürün sahibinin kararı ve S20'nin (aydınlatma metni
 * hukuk incelemesi) kapsamına girmeli.
 */

/**
 * Sessiz saatler — bu aralığın dışında hatırlatma gönderilmiyor.
 *
 * Ü39'un doğrudan yan etkisi: erteleme 24 saat olduğu için kupon, kazanıldığı
 * saatte açılıyor. Gece 23:00'te oynayan biri ertesi gece 23:00'te bildirim
 * alırdı; o saatte telefon çaldırmak, bildirimi hizmet olmaktan çıkarıp
 * rahatsızlığa çevirir. Vakti dışarıda kalan hatırlatma sıradaki pencereyi
 * bekliyor — kaybolmuyor, erteleniyor.
 */
export const PENCERE_BASI = 9;
export const PENCERE_SONU = 21;

/** Son kullanıma bu kadar kalınca "süresi doluyor" mesajı gider. */
const SON_UYARI_SAAT = 24;

/** Bir koşuda en fazla kaç mesaj — bakım köprüsü istek yolunda çalışıyor. */
const KOSU_TAVANI = 50;

/** Türkiye saatiyle şu anki saat. Sunucunun saat dilimi ne olursa olsun aynı. */
export function istanbulSaati(an: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      hour12: false,
    }).format(an),
  );
}

export function pencereAcikMi(an: Date = new Date()): boolean {
  const saat = istanbulSaati(an);
  return saat >= PENCERE_BASI && saat < PENCERE_SONU;
}

type Aday = {
  kupon_id: string;
  cafe_id: string;
  phone_enc: Buffer;
};

/**
 * Hatırlatma bekleyen kuponlar.
 *
 * Üç süzgeç birden: oyuncu tercihini kapatmamış olmalı, hesap
 * anonimleştirilmemiş olmalı ve bu kupona **daha önce aynı hatırlatma
 * gönderilmemiş** olmalı. Sonuncusu bayrakla değil defterle bakılıyor
 * (`coupon_events`): bakım köprüsü dakikada bir koşuyor ve bayrak ile
 * gönderim arasındaki aralık ikinci bir SMS'e yol açardı.
 */
const ADAY_SUZGECI = `
  JOIN players p ON p.id = c.player_id
 WHERE p.anonymized_at IS NULL
   AND EXISTS (
     SELECT 1 FROM player_consents pc
      WHERE pc.player_id = p.id AND pc.kind = 'service_reminder'
        AND pc.revoked_at IS NULL
   )
   AND NOT EXISTS (
     SELECT 1 FROM coupon_events ce
      WHERE ce.coupon_id = c.id AND ce.event = $1
   )`;

async function adaylar(db: Parameters<Parameters<typeof withBypass>[1]>[0], olay: string, ek: string) {
  return db.all<Aday>(
    `SELECT c.id AS kupon_id, c.cafe_id, p.phone_enc
       FROM coupons c
       ${ADAY_SUZGECI}
       AND ${ek}
     ORDER BY c.activates_at
     LIMIT ${KOSU_TAVANI}`,
    [olay],
  );
}

async function gonderVeIsaretle(
  aday: Aday,
  sablon: Extract<Sablon, "coupon_active" | "coupon_expiring">,
): Promise<boolean> {
  // Telefon yalnızca burada çözülüyor ve hiçbir yere yazılmıyor; `gonder`
  // deftere maskeli hâlini koyuyor (docs/08 §7.1).
  const sonuc = await gonder({ telefon: decryptPII(aday.phone_enc), sablon }, "hatirlatma");

  // Gönderilemeyen mesaj işaretlenmiyor: bir sonraki koşuda tekrar denenir.
  // Tavan dolduğu için engellendiyse de aynı — hatırlatma kaybolmuyor.
  if (sonuc.durum !== "gonderildi") return false;

  await withBypass("hatırlatma işareti", (db) =>
    db.query(
      `INSERT INTO coupon_events (id, coupon_id, cafe_id, event)
       VALUES ($1,$2,$3,$4)`,
      [newId("cev"), aday.kupon_id, aday.cafe_id, sablon === "coupon_active" ? "reminder_active" : "reminder_expiring"],
    ),
  );
  return true;
}

export type HatirlatmaSonucu = { acilan: number; suresiDolan: number };

/**
 * Gönderilecek hatırlatmaları bulur ve gönderir.
 *
 * Sessiz saat dışında hiç sorgu yapmadan dönüyor: gece yarısı boş yere
 * veritabanı yormanın anlamı yok.
 */
export async function gonderilecekleriGonder(): Promise<HatirlatmaSonucu> {
  const sonuc: HatirlatmaSonucu = { acilan: 0, suresiDolan: 0 };
  if (!pencereAcikMi()) return sonuc;

  // ── Kupon kullanıma açıldı
  const acilanlar = await withBypass("hatırlatma — açılan kuponlar", (db) =>
    adaylar(
      db,
      "reminder_active",
      `c.status = 'active' AND c.activates_at <= now() AND c.expires_at > now()
       AND EXISTS (SELECT 1 FROM coupon_events a
                    WHERE a.coupon_id = c.id AND a.event = 'activated')`,
    ),
  );
  for (const a of acilanlar) {
    if (await gonderVeIsaretle(a, "coupon_active")) sonuc.acilan++;
  }

  // ── Süresi yarın doluyor
  //
  // Yalnızca **kullanılmamış** kupon: kullanılmış olana "süresi doluyor"
  // demek, oyuncuya yanlış bilgi vermek olur.
  const dolanlar = await withBypass("hatırlatma — süresi dolanlar", (db) =>
    adaylar(
      db,
      "reminder_expiring",
      `c.status = 'active' AND c.activates_at <= now()
       AND c.expires_at > now()
       AND c.expires_at <= now() + interval '${SON_UYARI_SAAT} hours'`,
    ),
  );
  for (const a of dolanlar) {
    if (await gonderVeIsaretle(a, "coupon_expiring")) sonuc.suresiDolan++;
  }

  if (sonuc.acilan || sonuc.suresiDolan) log.info("hatirlatma gonderildi", sonuc);
  return sonuc;
}
