/**
 * Karekod türü — Ü108.
 *
 * ⚠️ **Kendi dosyasında ve veritabanına hiç dokunmuyor.** `masa-yonetim`
 * içinde dursaydı, panelin istemci bileşeni (`kontroller.tsx`) tür
 * adlarını okumak için o modülü import eder ve `pg` tarayıcı paketine
 * girerdi. Sunucu/istemci sınırında paylaşılan her şey saf kalmalı.
 *
 * ── Dört tür, tek davranış ──────────────────────────────────
 *
 * Dördü de okutulunca aynı şeyi yapıyor: oturum açıyor, kanıt topluyor,
 * oyun oturumuna bağlanıyor. Tür yalnızca kafenin kendi düzeni ve raporu
 * için — *"kasa karekodu bir haftadır hiç okutulmamış"* cümlesi ancak
 * tür varsa kurulabiliyor.
 *
 * ── ⚠️ `fis` bir SATIN ALMA KANITI DEĞİL ────────────────────
 *
 * E6'nın K4 kademesi (fiş/adisyon kodu, ×2 çarpan, 51 TL+ ödül) bu
 * değil. Buradaki kod fişe bastırılan **sabit** bir karekod: fotoğrafı
 * paylaşılabilir ve hiçbir satın almayı kanıtlamaz. Bir dağıtım kanalı —
 * "müşteri fişi alırken bizi görsün" — o kadar.
 *
 * K4 hâlâ hiçbir yerden verilmiyor ve bu bilinçli: gerçek bir adisyon
 * kanıtı ya POS entegrasyonu ya da kasiyerin tek kullanımlık ürettiği
 * bir kod ister. Bugün ödül aralığı 25–50 TL (Ü52), yani 51 TL+ kademesi
 * zaten aralık dışı ve K4'ün boş kalması zararsız.
 */

export const TURLER = ["masa", "kasa", "menu", "fis"] as const;
export type Tur = (typeof TURLER)[number];

/** Ekranda görünen adlar ve karekodun nereye asılacağı. */
export const TUR_ADI: Record<Tur, { tekil: string; cogul: string; nereye: string }> = {
  masa: {
    tekil: "Masa",
    cogul: "Masalar",
    nereye: "Masaya yapıştırılır",
  },
  kasa: {
    tekil: "Kasa",
    cogul: "Kasa",
    nereye: "Kasanın önüne konur — ayaküstü bekleyen müşteri için",
  },
  menu: {
    tekil: "Menü",
    cogul: "Menü",
    nereye: "Menüye basılır",
  },
  fis: {
    tekil: "Fiş",
    cogul: "Fiş",
    nereye: "Fişin altına basılır — satın alma kanıtı değildir",
  },
};

export function turMu(x: string): x is Tur {
  return (TURLER as readonly string[]).includes(x);
}
