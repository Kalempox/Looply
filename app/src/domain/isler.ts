import { bekleyenleriAc, sureDolanlariSupur } from "./kupon";
import { gonderilecekleriGonder } from "./hatirlatma";
import { programlariUygula } from "./happy";
import { sureDolanlariKapat } from "./davet";
import { silmeleriUygula } from "./player";
import { temizle as otpTemizle } from "./otp";
import { temizle as qrTemizle } from "./qr";
import { temizle as hizSiniriTemizle } from "@/lib/ratelimit";
import { degerlendir as alarmDegerlendir } from "@/lib/alarm";

/**
 * Arka plan işleri kaydı — Ü113.
 *
 * ── Neden bir kayıt defteri gerekti ─────────────────────────
 *
 * Bu kod tabanında **dört kez** aynı arıza çıktı: bir iş yazıldı, hiçbir
 * yerden çağrılmadı, kimse fark etmedi.
 *
 *   · Kampanya kuponu üretimi (Ü82) — 403 ödüle karşı 0 kampanya kuponu
 *   · `bekleyenleriAc` / `sureDolanlariSupur` — bakım köprüsü bunun için doğdu
 *   · `silmeleriUygula` (Ü111) — KVKK envanteri çıkarılırken bulundu
 *   · `alarm.degerlendir` ve üç temizlik işi — bu tur
 *
 * Sonuncular özellikle kötü: `otp.temizle`, `qr.temizle` ve
 * `ratelimit.temizle` fonksiyonlarının **kendi yorumlarında** *"saatlik bir
 * işten çağrılır"* yazıyor. O iş hiç yazılmamıştı. Kayıtlar süresiz
 * birikiyordu — `otp_challenges` telefonun kör indeksini ve IP hash'ini
 * taşıyor, yani bu aynı zamanda bir saklama süresi ihlaliydi.
 *
 * Alarm ise hiç ölçülmüyordu; `lib/alarm.ts`in kendi cümlesi:
 * *"Engelleme sessizce çalışır; kimse bakmazsa saldırının sürdüğü
 * anlaşılmaz."*
 *
 * ── Kayıt defteri neyi çözüyor ──────────────────────────────
 *
 * Artık tek bir liste var ve köprü **onu geziyor**. Yeni bir iş eklemek
 * listeye satır eklemek demek; bağlamayı unutmak, işi hiç yazmamak kadar
 * görünür oluyor. `tests/arka-plan-isleri.test.ts` ayrıca kaydın dışında
 * kalmış iş var mı diye kaynağı tarıyor.
 *
 * ── ⚠️ SIRA ÖNEMLİ ─────────────────────────────────────────
 *
 * Liste **sırayla** işletiliyor ve iki bağımlılık var:
 *   1. Happy Hour penceresi, kupon açılmadan ÖNCE — pencere açılmadan
 *      üretilen kupon o pencerenin havuzundan sayılmaz.
 *   2. Hatırlatma, kupon açıldıktan SONRA — ters olsaydı aynı koşuda
 *      açılan kupon bir sonraki koşuyu bekler ve mesaj gecikirdi.
 */

export type Is = {
  /** Günlüğe ve son koşu takibine giden ad. */
  ad: string;
  aciklama: string;
  /**
   * En sık kaç dakikada bir koşsun.
   *
   * Temizlik işleri seyrek: her dakika `DELETE` taramak boşuna yük ve
   * kazandırdığı bir şey yok — bir saat geç silinen süresi dolmuş bir OTP
   * kaydı kimseyi etkilemiyor.
   */
  aralikDk: number;
  /** Yapılan iş sayısı — sıfırsa günlüğe yazılmıyor. */
  calistir: () => Promise<number>;
};

export const ISLER: readonly Is[] = [
  {
    ad: "happy_hour_program",
    aciklama: "Bugüne düşen Happy Hour programlarını pencereye çevirir (Ü104)",
    aralikDk: 1,
    calistir: programlariUygula,
  },
  {
    ad: "kupon_ac",
    aciklama: "Açılma saati gelen ertelenmiş kuponları açar (Ü28)",
    aralikDk: 1,
    calistir: bekleyenleriAc,
  },
  {
    ad: "kupon_suresi_dolan",
    aciklama: "Süresi dolan kuponun rezervasyonunu bütçeye iade eder (E11)",
    aralikDk: 1,
    calistir: sureDolanlariSupur,
  },
  {
    ad: "hatirlatma",
    aciklama: "Kupon açıldı / son gün hatırlatmalarını gönderir (Ü42)",
    aralikDk: 1,
    calistir: async () => {
      const r = await gonderilecekleriGonder();
      return r.acilan + r.suresiDolan;
    },
  },
  {
    ad: "davet_suresi_dolan",
    aciklama: "Süresi dolan daveti kapatır — 'sürüyor' sayacı şişik kalmasın",
    aralikDk: 1,
    calistir: sureDolanlariKapat,
  },
  {
    ad: "alarm",
    aciklama: "Saldırı alarmlarını ölçer (G19). Bulgular günlüğe düşer",
    aralikDk: 5,
    calistir: async () => (await alarmDegerlendir()).length,
  },
  {
    ad: "hesap_silme",
    aciklama: "30 günü dolan hesapları geri döndürülemez şekilde siler (Ü111)",
    aralikDk: 60,
    calistir: silmeleriUygula,
  },
  {
    ad: "otp_temizlik",
    aciklama: "Süresi geçmiş doğrulama kayıtlarını siler — kör indeks ve IP hash'i taşıyorlar",
    aralikDk: 60,
    calistir: otpTemizle,
  },
  {
    ad: "qr_temizlik",
    aciklama: "Eski karekod tarama kayıtlarını siler",
    aralikDk: 60,
    calistir: qrTemizle,
  },
  {
    ad: "hiz_siniri_temizlik",
    aciklama: "Süresi geçmiş hız sınırı sayaçlarını siler",
    aralikDk: 1440,
    calistir: hizSiniriTemizle,
  },
];
