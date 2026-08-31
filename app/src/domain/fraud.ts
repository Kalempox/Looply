/**
 * Fraud motoru — davet risk skoru (Faz 9, Ü20).
 *
 * ── Tasarımın tek cümlesi ───────────────────────────────────
 *
 * **Tek sinyal tek başına suçlu ilan etmez.** Kaynak doküman bunu açıkça
 * istiyor ve sebebi pratik: her sinyalin masum bir açıklaması var. Aynı IP —
 * karı koca aynı evden. Aynı tarayıcı — arkadaşına telefonunu uzatıp
 * kaydettirmek. Hızlı kayıt — masada yan yana oturmak.
 *
 * Bu yüzden ağırlıklar öyle seçildi ki **hiçbir sinyal tek başına eşiği
 * geçemiyor** (en ağırı 40, eşik 60). Ret için en az iki bağımsız sinyal
 * gerekiyor. Aşağıdaki testte bu bir iddia olarak sınanıyor.
 *
 * ── Fraud davet ≠ fraud kullanıcı ───────────────────────────
 *
 * Bu motorun verdiği tek karar **davetin ödül alıp almayacağı**. Reddedilen
 * davetin edileni normal oyuncu olmaya devam ediyor: hesabı kapanmıyor,
 * puanı silinmiyor, oynamaya devam ediyor. Kaynak doküman bu ayrımı
 * özellikle vurguluyor ve haklı — yanlış pozitif bir risk skoru yüzünden
 * gerçek müşteriyi kapıdan çevirmek, kaçırılan bir sahte davetten pahalı.
 *
 * ── Neden saf fonksiyon ─────────────────────────────────────
 *
 * Motor veritabanı okumuyor: kararı `FraudGirdisi`ye bakarak veriyor.
 * Sinyalleri toplamak `davet.ts`in işi. Ayrım, ağırlıkların ve eşiğin
 * veritabanı olmadan sınanabilmesini sağlıyor — kalibrasyon değişince test
 * yazmak dakikalar sürüyor.
 */

/** Bu skorun üstündeki davet reddedilir. */
export const RET_ESIGI = 60;

/** Son 24 saatte bu sayıdan çok niteliklenme "patlama" sayılır. */
export const PATLAMA_ESIGI = 4;

export type Sinyal = {
  ad: string;
  agirlik: number;
  /** Yöneticinin ve gerekirse davet edenin okuyacağı cümle. */
  aciklama: string;
};

export type FraudGirdisi = {
  /** Davet eden ile davet edilen aynı IP'den kaydolmuş. */
  ayniIp: boolean;
  /** İkisinin kayıt anındaki tarayıcı parmak izi aynı. */
  ayniTarayici: boolean;
  /** Davet bağlantısına tıklayan iz, davet edenin kendi iziyle aynı. */
  tiklamaDavetciden: boolean;
  /** Davet edenin son 24 saatteki niteliklenme sayısı. */
  sonGunNitelikSayisi: number;
  /** Davet edilen, davet edeni de davet etmiş (karşılıklı zincir). */
  karsilikliDavet: boolean;
  /** Davet edenin hesabı bu kadar saat önce açıldı. */
  davetciHesapYasiSaat: number;
};

export type RiskSonucu = {
  skor: number;
  sebepler: Sinyal[];
  reddedildi: boolean;
};

/**
 * Sinyalleri risk skoruna çevirir.
 *
 * Skor 0–100 arasına kırpılıyor: şema da o aralığı bekliyor ve "137 riskli"
 * gibi bir sayının okura anlattığı fazladan bir şey yok.
 */
export function degerlendir(g: FraudGirdisi): RiskSonucu {
  const sebepler: Sinyal[] = [];

  if (g.ayniIp) {
    sebepler.push({
      ad: "ayni_ip",
      agirlik: 30,
      aciklama: "Davet eden ve davet edilen aynı ağdan kaydolmuş.",
    });
  }

  if (g.ayniTarayici) {
    sebepler.push({
      ad: "ayni_tarayici",
      agirlik: 30,
      aciklama: "İki hesabın kayıt anındaki tarayıcı izi aynı.",
    });
  }

  if (g.tiklamaDavetciden) {
    sebepler.push({
      ad: "tiklama_davetciden",
      agirlik: 20,
      aciklama: "Davet bağlantısına davet edenin kendi cihazından tıklanmış.",
    });
  }

  if (g.sonGunNitelikSayisi > PATLAMA_ESIGI) {
    sebepler.push({
      ad: "davet_patlamasi",
      agirlik: 25,
      aciklama: `Son 24 saatte ${g.sonGunNitelikSayisi} davet niteliklendi.`,
    });
  }

  if (g.karsilikliDavet) {
    sebepler.push({
      ad: "karsilikli_davet",
      agirlik: 40,
      aciklama: "İki hesap birbirini davet etmiş.",
    });
  }

  if (g.davetciHesapYasiSaat < 24) {
    sebepler.push({
      ad: "davetci_yeni_hesap",
      agirlik: 15,
      aciklama: "Davet edenin hesabı 24 saatten genç.",
    });
  }

  const ham = sebepler.reduce((t, s) => t + s.agirlik, 0);
  const skor = Math.min(100, ham);

  return { skor, sebepler, reddedildi: skor >= RET_ESIGI };
}

/**
 * Ağırlıkların değişmez kuralı: hiçbir sinyal tek başına eşiği geçmemeli.
 *
 * Kalibrasyon elle yapılacak bir iş ve bir gün biri "aynı IP zaten yeterli"
 * diyip 30'u 60 yapabilir. O an bu fonksiyon testte patlıyor — kural koda
 * gömülü, yorumda değil.
 */
export function enAgirSinyal(): number {
  const hepsi: FraudGirdisi[] = [
    { ...BOS, ayniIp: true },
    { ...BOS, ayniTarayici: true },
    { ...BOS, tiklamaDavetciden: true },
    { ...BOS, sonGunNitelikSayisi: PATLAMA_ESIGI + 1 },
    { ...BOS, karsilikliDavet: true },
    { ...BOS, davetciHesapYasiSaat: 0 },
  ];
  return Math.max(...hepsi.map((g) => degerlendir(g).skor));
}

/** Hiçbir sinyalin yanmadığı girdi — temel durum ve test kolaylığı. */
export const BOS: FraudGirdisi = {
  ayniIp: false,
  ayniTarayici: false,
  tiklamaDavetciden: false,
  sonGunNitelikSayisi: 0,
  karsilikliDavet: false,
  davetciHesapYasiSaat: 999,
};
