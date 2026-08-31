import { withBypass } from "@/db/context";
import { log } from "./log";

/**
 * İzleme ve alarm — G19, docs/07 §2.9.
 *
 * Saldırı altında olduğumuzu **fark etmek**, saldırıyı engellemek kadar önemli.
 * Engelleme sessizce çalışır; kimse bakmazsa saldırının sürdüğü anlaşılmaz.
 *
 * Kurallar burada tanımlı, dakikada bir çalıştırılır. Şu an bazıları sıfır
 * döner çünkü ilgili tablolar (kupon, oturum) henüz dolmuyor — kural yapısı
 * ilk günden kurulu olsun diye böyle.
 */

export type Seviye = "uyari" | "kritik";

export type Kural = {
  ad: string;
  aciklama: string;
  seviye: Seviye;
  /** Eşiği aşan sayıyı döner; 0 ise alarm yok. */
  olc: () => Promise<{ deger: number; esik: number }>;
};

export const KURALLAR: Kural[] = [
  {
    ad: "otp_hata_sicramasi",
    aciklama: "Doğrulama hatası oranı normalin 3 katı — kaba kuvvet denemesi",
    seviye: "kritik",
    olc: async () => {
      const d = await withBypass("alarm: otp hataları", (db) =>
        db.one<{ n: string }>(
          `SELECT count(*) AS n FROM otp_challenges
            WHERE created_at > now() - interval '15 minutes' AND attempt_count >= 5`,
        ),
      );
      return { deger: Number(d?.n ?? 0), esik: 10 };
    },
  },
  {
    ad: "sms_gunluk_tavan",
    aciklama: "Günlük SMS tavanının %70'i — kota saldırısı veya beklenmedik trafik",
    seviye: "uyari",
    olc: async () => {
      const d = await withBypass("alarm: sms sayacı", (db) =>
        db.one<{ n: string }>(
          `SELECT COALESCE(sum(hits),0) AS n FROM rate_limits
            WHERE bucket LIKE 'otp_per_phone_day:%' AND window_start > now() - interval '1 day'`,
        ),
      );
      return { deger: Number(d?.n ?? 0), esik: 1400 }; // 2000'in %70'i
    },
  },
  {
    ad: "kupon_onay_sicramasi",
    aciklama: "Tek kafede saatlik kupon onayı normalin 5 katı — sahtecilik veya kasiyer hatası",
    seviye: "kritik",
    olc: async () => {
      const d = await withBypass("alarm: kupon onayları", (db) =>
        db.one<{ n: string }>(
          `SELECT COALESCE(max(c),0) AS n FROM (
             SELECT count(*) AS c FROM coupons
              WHERE redeemed_at > now() - interval '1 hour'
              GROUP BY cafe_id
           ) t`,
        ),
      );
      return { deger: Number(d?.n ?? 0), esik: 50 };
    },
  },
  {
    ad: "cihaz_basina_hesap",
    aciklama: "Bir cihazdan çok hesap denemesi — sahte hesap üretimi",
    seviye: "uyari",
    olc: async () => {
      const d = await withBypass("alarm: fraud bayrakları", (db) =>
        db.one<{ n: string }>(
          `SELECT count(*) AS n FROM fraud_flags
            WHERE rule = 'max_accounts_per_device' AND created_at > now() - interval '1 day'`,
        ),
      );
      return { deger: Number(d?.n ?? 0), esik: 5 };
    },
  },
  {
    ad: "hiz_siniri_yogunlugu",
    aciklama: "Hız sınırına takılma sayısı olağandışı — otomatik trafik",
    seviye: "uyari",
    olc: async () => {
      const d = await withBypass("alarm: hız sınırı", (db) =>
        db.one<{ n: string }>(
          `SELECT COALESCE(max(hits),0) AS n FROM rate_limits
            WHERE window_start > now() - interval '1 hour'`,
        ),
      );
      return { deger: Number(d?.n ?? 0), esik: 100 };
    },
  },
];

export type Bulgu = { kural: string; aciklama: string; seviye: Seviye; deger: number; esik: number };

export async function degerlendir(): Promise<Bulgu[]> {
  const bulgular: Bulgu[] = [];

  for (const k of KURALLAR) {
    try {
      const { deger, esik } = await k.olc();
      if (deger >= esik) {
        bulgular.push({ kural: k.ad, aciklama: k.aciklama, seviye: k.seviye, deger, esik });
      }
    } catch (err) {
      // Alarm kuralının kendisi patlarsa sessiz kalmasın — bu da bir arıza sinyali
      log.error("alarm kurali calismadi", { kural: k.ad, hata: String(err).slice(0, 200) });
    }
  }

  for (const b of bulgular) {
    log.warn("ALARM", { kural: b.kural, seviye: b.seviye, deger: b.deger, esik: b.esik });
  }

  return bulgular;
}
