import { withCafe } from "@/db/context";
import * as ayar from "./ayar";
import * as butce from "./butce";
import * as kupon from "./kupon";
import * as yogunluk from "./yogunluk";

/**
 * Bütçe ekranının "yoğun saatlerin ve bugünkü dağıtım" bölümü — Ü281.
 *
 * Ürün sahibi dağıtımın kafenin kalabalığına göre yapılmasını istedi ve
 * *"panelde de göster"* dedi: kafe sahibi sistemin ne öğrendiğini ve bugün
 * ne yaptığını görmeli. Buradaki her sayı dağıtımın KENDİ fonksiyonundan
 * okunuyor (`yogunluk`, `butce.tempoOrani`, `kupon.paketSansiIle`) —
 * ekranda görünen şans ile kararı veren şans ayrışamaz.
 *
 * Ayrı dosyada çünkü üç modülü birden okuyor: `kupon` zaten `butce` ve
 * `yogunluk`u içe aktarıyor; ters yönde bağlamak döngü kurardı.
 */

/** Bu kadar günden azsa profil "öğreniliyor" diye gösteriliyor. */
export const OGRENME_GUNU = 7;

export type DagitimPlani = {
  acilis: number;
  kapanis: number;
  /** Saat başına pay (0–23). */
  paylar: number[];
  gunSayisi: number;
  gunTuru: yogunluk.GunTuru;
  /** Profil yeterli veriden mi — değilse düze yakın. */
  ogrenildi: boolean;
  enYogun: { bas: number; bit: number; pay: number };
  /** Günün şimdiye kadar geçen payı (profile göre). */
  gecenPay: number;
  /** Bütçenin şu ana kadar açılan oranı (tempo). */
  acilanOran: number;
  bugunSimdiye: number;
  bugunBeklenen: number;
  /** Kafede konumu doğrulanmış, bugün ödül almamış bir oyuncunun şu anki paket şansı (0..1). */
  sans: number;
};

export async function dagitimPlani(cafeId: string, an: Date = new Date()): Promise<DagitimPlani> {
  const [acilis, kapanis] = await Promise.all([
    ayar.sayiOku(cafeId, ayar.ANAHTARLAR.acilisSaati),
    ayar.sayiOku(cafeId, ayar.ANAHTARLAR.kapanisSaati),
  ]);

  return withCafe(cafeId, async (db) => {
    // Aynı istemcide sıralı — `pg` bir istemcide eşzamanlı sorguyu bırakıyor.
    const profil = await yogunluk.profilIle(db, { cafeId, acilis, kapanis, an });
    const bugunSimdiye = await yogunluk.bugunkuFirsatIle(db, { cafeId, an });
    // Oyun kimliği yalnızca bıkkınlığı etkiliyor; oyuncusuz sorulunca o sıfır.
    const sans = await kupon.paketSansiIle(db, {
      playerId: null,
      cafeId,
      oyunId: "sekme",
      kanitSeviyesi: 2,
      an,
    });
    const gecenPay = yogunluk.birikimliPay(profil.paylar, an);
    return {
      acilis,
      kapanis,
      paylar: profil.paylar,
      gunSayisi: profil.gunSayisi,
      gunTuru: profil.gunTuru,
      ogrenildi: profil.gunSayisi >= OGRENME_GUNU,
      enYogun: yogunluk.enYogunAralik(profil.paylar, acilis, kapanis),
      gecenPay,
      acilanOran: butce.tempoOrani(an, acilis, kapanis, profil.paylar),
      bugunSimdiye,
      bugunBeklenen: Math.round(
        yogunluk.gunlukTahmin({ profil, bugunSimdiye, acilis, kapanis }, gecenPay),
      ),
      sans,
    };
  });
}
