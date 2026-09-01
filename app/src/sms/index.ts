import { env, demoOrtami } from "@/lib/env";
import { log } from "@/lib/log";
import { withBypass } from "@/db/context";
import { newId } from "@/lib/ids";
import { phoneIndex } from "@/lib/crypto";
import { defteriYaz } from "./gelistirme-defteri";

/**
 * SMS katmanı — Ü13'ün somut hâli.
 *
 * Sağlayıcı bir arayüzün arkasında. Bugün konsola yazıyor, yarın Netgsm'e
 * gidiyor; aradaki her şey (kota, kilit, defter, maliyet sayımı) aynı kalıyor.
 * Yani "sahte" olan tek şey son adım.
 *
 * 🔴 Doğrulama kodu ne loga ne deftere yazılır. Yalnızca sağlayıcıya gider.
 */

export type Sablon =
  | "otp"
  | "phone_changed"
  | "new_device"
  | "account_deleted"
  | "incident"
  | "coupon_active"
  | "coupon_expiring";

export type Mesaj = {
  telefon: string; // E.164
  sablon: Sablon;
  /** Şablonun yerine geçecek değerler. `kod` yalnızca sağlayıcıya ulaşır. */
  degerler?: Record<string, string>;
};

export type GonderimSonucu =
  | { durum: "gonderildi"; ref?: string; gelistirmeKodu?: string }
  | { durum: "engellendi"; sebep: "global_cap" | "rate_limit" }
  | { durum: "basarisiz"; hata: string };

/**
 * Geliştirmede doğrulama kodu ekranda gösterilir mi?
 *
 * Kodu görmek için sunucu logu okumak, test etmeyi gereksiz zorlaştırıyordu.
 * Kapının kendisi `demoOrtami()` — koşulları orada, tek yerde duruyor;
 * canlı ortamda hiçbir koşulda true dönmez.
 */
export function kodEkrandaGosterilir(): boolean {
  return demoOrtami();
}

export interface SmsSaglayici {
  readonly ad: string;
  gonder(mesaj: Mesaj, metin: string): Promise<{ ref?: string }>;
}

/* ── Şablonlar ────────────────────────────────────────────────
 * SMS metninde kafe adı ve link YOK — kimlik avı yüzeyi açılmasın
 * (docs/07 §2.3). Gönderen başlığı zaten CafePlay olacak.
 */

const SABLONLAR: Record<Sablon, (d: Record<string, string>) => string> = {
  otp: (d) => `CafePlay dogrulama kodunuz: ${d.kod}. 3 dakika gecerli. Kimseyle paylasmayin.`,
  phone_changed: () => `CafePlay hesabinizin telefon numarasi degistirildi. Bu islemi siz yapmadiysaniz hemen bize ulasin.`,
  new_device: () => `CafePlay hesabiniza yeni bir cihazdan giris yapildi. Siz degilseniz bize ulasin.`,
  account_deleted: () => `CafePlay hesabiniz silinme talebiniz alindi. 30 gun icinde vazgecebilirsiniz.`,
  incident: (d) => `CafePlay guvenlik bildirimi: ${d.mesaj ?? ""}`,

  // ── Kupon hatırlatmaları ────────────────────────────────────
  //
  // Bu ikisi **hizmet bildirimi**: oyuncunun kendi kazandığı kuponun
  // durumunu söylüyorlar. Kafe adı yok, ürün yok, kampanya yok, çağrı yok.
  // Sınıflandırmayı ayakta tutan tek şey bu içerik disiplini ve
  // `tests/hatirlatma.test.ts` metinleri tam olarak bu yüzden sınıyor —
  // buraya "yeni tatlımızı dene" eklenirse mesaj ticari iletiye döner ve
  // G7'nin izin + İYS kaydı şartı doğar.
  coupon_active: () =>
    `CafePlay odulunuz kullanima acildi. Oduller ekranindan kasada gosterebilirsiniz.`,
  coupon_expiring: () =>
    `CafePlay odulunuzun kullanim suresi yarin doluyor.`,
};

/**
 * Şablonun son metnini üretir.
 *
 * Dışa veriliyor ki metin **sınanabilsin**: `tests/hatirlatma.test.ts`
 * hatırlatma metinlerinde kafe adı, ürün, kampanya çağrısı ve link
 * aramıyor olduğunu doğruluyor. O disiplin bozulursa mesaj hizmet
 * bildirimi olmaktan çıkıp ticari iletiye döner (G7).
 */
export function sablonMetni(sablon: Sablon, degerler?: Record<string, string>): string {
  return SABLONLAR[sablon](degerler ?? {});
}

const BILDIRIM_ADLARI: Partial<Record<Sablon, string>> = {
  phone_changed: "Bildirim — telefon numarası değişti",
  new_device: "Bildirim — yeni cihazdan giriş",
  account_deleted: "Bildirim — hesap silme talebi",
  incident: "Bildirim — güvenlik uyarısı",
  coupon_active: "Hatırlatma — ödül kullanıma açıldı",
  coupon_expiring: "Hatırlatma — ödülün süresi doluyor",
};

/** '0532 *** ** 67' — defterde ve ekranlarda yalnızca bu görünür. */
export function maskele(e164: string): string {
  const n = e164.replace("+90", "");
  return `0${n.slice(0, 3)} *** ** ${n.slice(8)}`;
}

/* ── Sağlayıcılar ─────────────────────────────────────────── */

class KonsolSaglayici implements SmsSaglayici {
  readonly ad = "console";

  async gonder(mesaj: Mesaj, metin: string) {
    // Geliştirme kolaylığı: kod burada GÖRÜNÜR. Canlıda bu sağlayıcı
    // kullanılamaz — env.ts açılışta reddediyor.
    process.stdout.write(
      `\n┌─ SMS (sahte sağlayıcı) ────────────────────────\n` +
        `│ Kime : ${maskele(mesaj.telefon)}\n` +
        `│ ${metin}\n` +
        `└────────────────────────────────────────────────\n\n`,
    );
    // Doğrulama kodunu defterine `otp.ts` yazıyor — orada hangi ekrandan
    // gelindiği biliniyor. Burada yalnızca bildirimler kaydediliyor.
    if (mesaj.sablon !== "otp") {
      defteriYaz({
        telefon: maskele(mesaj.telefon),
        nereden: "Bildirim",
        olay: BILDIRIM_ADLARI[mesaj.sablon] ?? mesaj.sablon,
      });
    }
    return {};
  }
}

class NetgsmSaglayici implements SmsSaglayici {
  readonly ad = "netgsm";

  async gonder(): Promise<{ ref?: string }> {
    // Faz 10 öncesi bağlanacak. Buraya gelen her şey hazır:
    // kota kontrol edilmiş, defter yazılmış, metin oluşturulmuş.
    throw new Error("Netgsm entegrasyonu henüz bağlanmadı — SMS_PROVIDER=console kullanın");
  }
}

function saglayici(): SmsSaglayici {
  switch (env().SMS_PROVIDER) {
    case "netgsm":
    case "iletimerkezi":
      return new NetgsmSaglayici();
    default:
      return new KonsolSaglayici();
  }
}

/* ── Global tavan — G14 ───────────────────────────────────── */

export const GUNLUK_TAVAN = 2000;

export type TavanDurumu = {
  gonderilen: number;
  tavan: number;
  oran: number;
  /** %90'da yeni kayıt durur; giriş devam eder. */
  kayitAcik: boolean;
  /** %100'de her şey durur. */
  girisAcik: boolean;
};

export async function tavanDurumu(): Promise<TavanDurumu> {
  const r = await withBypass("sms günlük tavan sayacı", (db) =>
    db.one<{ n: string }>(
      `SELECT count(*) AS n FROM sms_outbox
        WHERE status = 'sent' AND created_at > now() - interval '1 day'`,
    ),
  );
  const gonderilen = Number(r?.n ?? 0);
  const oran = gonderilen / GUNLUK_TAVAN;

  return {
    gonderilen,
    tavan: GUNLUK_TAVAN,
    oran,
    kayitAcik: oran < 0.9,
    girisAcik: oran < 1,
  };
}

/* ── Gönderim ─────────────────────────────────────────────── */

/**
 * Mesajı deftere yazar, tavanı kontrol eder, sağlayıcıya verir.
 *
 * `amac` tavan davranışını belirler (G14): tavanın %90'ında **yeni kayıt**
 * durur ama mevcut kullanıcının girişi devam eder. Saldırının hedefi kayıt
 * akışıdır; mevcut kullanıcıyı sistemden atmak saldırganın işini görür.
 */
export type Amac = "kayit" | "giris" | "bildirim" | "hatirlatma";

export async function gonder(
  mesaj: Mesaj,
  amac: Amac = "bildirim",
): Promise<GonderimSonucu> {
  const durum = await tavanDurumu();

  // Hatırlatma, **kayıtla aynı kademede** kesiliyor (%90) — girişten önce.
  //
  // Sebebi öncelik sırası: giriş SMS'i kapıda bekleyen bir insan, hatırlatma
  // ise bir gün sonra da gidebilecek bir bilgi. Hatırlatmalar `bildirim`
  // seviyesinde kalsaydı, günlük tavanı yiyip **girişleri kilitleyebilirlerdi**;
  // yani rahatlık uğruna hizmetin kendisi durabilirdi.
  const engelli =
    (amac === "kayit" || amac === "hatirlatma"
      ? !durum.kayitAcik
      : !durum.girisAcik);

  const id = newId("sms");
  const ortak = {
    id,
    maskeli: maskele(mesaj.telefon),
    indeks: phoneIndex(mesaj.telefon),
    sablon: mesaj.sablon,
  };

  if (engelli) {
    await withBypass("sms engellendi kaydı", (db) =>
      db.query(
        `INSERT INTO sms_outbox (id, phone_masked, phone_index, template, provider, status, block_reason)
         VALUES ($1,$2,$3,$4,$5,'blocked','global_cap')`,
        [ortak.id, ortak.maskeli, ortak.indeks, ortak.sablon, env().SMS_PROVIDER],
      ),
    );
    log.warn("sms global tavan engeli", { amac, gonderilen: durum.gonderilen, tavan: durum.tavan });
    defteriYaz({
      telefon: ortak.maskeli,
      nereden: "SMS katmanı",
      olay: "Gönderilmedi — günlük SMS tavanı",
      not: `${durum.gonderilen}/${durum.tavan} · amaç: ${amac}`,
    });
    return { durum: "engellendi", sebep: "global_cap" };
  }

  const metin = sablonMetni(mesaj.sablon, mesaj.degerler);
  const s = saglayici();

  try {
    const { ref } = await s.gonder(mesaj, metin);
    await withBypass("sms gönderildi kaydı", (db) =>
      db.query(
        `INSERT INTO sms_outbox (id, phone_masked, phone_index, template, provider, status, provider_ref, sent_at)
         VALUES ($1,$2,$3,$4,$5,'sent',$6, now())`,
        [ortak.id, ortak.maskeli, ortak.indeks, ortak.sablon, s.ad, ref ?? null],
      ),
    );
    // Numara ve kod loglanmaz — yalnızca şablon adı
    log.info("sms gonderildi", { sablon: mesaj.sablon, saglayici: s.ad });
    return {
      durum: "gonderildi",
      ref,
      gelistirmeKodu: kodEkrandaGosterilir() ? mesaj.degerler?.kod : undefined,
    };
  } catch (err) {
    const hata = err instanceof Error ? err.message : String(err);
    await withBypass("sms başarısız kaydı", (db) =>
      db.query(
        `INSERT INTO sms_outbox (id, phone_masked, phone_index, template, provider, status, block_reason)
         VALUES ($1,$2,$3,$4,$5,'failed',$6)`,
        [ortak.id, ortak.maskeli, ortak.indeks, ortak.sablon, s.ad, hata.slice(0, 200)],
      ),
    );
    log.error("sms gonderilemedi", { sablon: mesaj.sablon, saglayici: s.ad });
    return { durum: "basarisiz", hata };
  }
}
