"use server";

import { revalidatePath } from "next/cache";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as happy from "@/domain/happy";
import { istanbulDakikasi } from "@/lib/tarih";

/** `happy.istanbulHaftaGunu` sırası: 0 = Pazar. */
const GUN_ADI = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export type HappyDurumu = { hata?: string; bilgi?: string };

/**
 * İstanbul saatiyle "bugün saat HH:MM" anını üretir.
 *
 * `new Date("2026-08-27T14:00")` sunucunun saat dilimini kullanır ve sunucu
 * UTC'de çalıştığı için pencere üç saat kayardı. Kafe "14:00" dediğinde
 * İstanbul'da 14:00 kastediyor.
 */
function istanbulSaati(gunIso: string, saat: number, dakika: number): Date {
  // Türkiye yıl boyu UTC+3; yaz saati uygulaması 2016'da kaldırıldı.
  const iso = `${gunIso}T${String(saat).padStart(2, "0")}:${String(dakika).padStart(2, "0")}:00+03:00`;
  return new Date(iso);
}

/**
 * Happy Hour penceresi açar.
 *
 * `cafeId` **oturumdan** (değişmez kural #3). Havuz tavanı kafenin
 * dağıtılabilir bütçesini aşamaz — aşsaydı ekranda duran sayı gerçekte
 * dağıtılamayacak bir vaat olurdu.
 */
export async function pencereAc(_onceki: HappyDurumu, form: FormData): Promise<HappyDurumu> {
  const o = await kafeYoneticisiGerekli();

  const baslangicHam = String(form.get("baslangic") ?? "");
  const sureHam = String(form.get("sure") ?? "");
  const havuzHam = String(form.get("havuz") ?? "").replace(/[^\d]/g, "");

  const m = /^(\d{1,2}):(\d{2})$/.exec(baslangicHam);
  if (!m) return { hata: "Başlangıç saatini seç." };

  const saat = Number(m[1]);
  const dakika = Number(m[2]);
  if (saat > 23 || dakika > 59) return { hata: "Geçerli bir saat seç." };

  const sureSaat = Number(sureHam);
  if (!Number.isFinite(sureSaat) || sureSaat < happy.EN_KISA_SAAT || sureSaat > happy.EN_UZUN_SAAT) {
    return { hata: `Süre ${happy.EN_KISA_SAAT}–${happy.EN_UZUN_SAAT} saat arasında olmalı.` };
  }

  const havuzTl = Number(havuzHam);
  if (!Number.isFinite(havuzTl) || havuzTl <= 0) return { hata: "Havuz tutarını gir." };

  const havuzKurus = Math.round(havuzTl * 100);

  /**
   * ⚠️ Ü104: havuzun günlük bütçeden küçük olma şartı **kalktı**.
   *
   * Ürün sahibi: *"happy hour'a özel bütçe olacak ve sistem ona göre
   * dağıtacak."* Havuz artık günlük bütçeden kesilmiyor, ona ekleniyor —
   * dolayısıyla ondan büyük olması bir çelişki değil, kafenin o saate
   * ayrıca para ayırması.
   *
   * Kafenin o günkü toplam taahhüdü artık `günlük bütçe + havuz` ve bütçe
   * ekranı bu toplamı yazıyor: 1.500 TL taahhüt ettiğini sanan kafenin
   * gerçekte 1.900 TL taahhüt etmiş olduğunu ay sonunda öğrenmesi kabul
   * edilemez.
   */

  const gun = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  const baslangic = istanbulSaati(gun, saat, dakika);
  const bitis = new Date(baslangic.getTime() + sureSaat * 3_600_000);

  const sonuc = await happy.pencereAc({
    cafeId: o.cafeId,
    baslangic,
    bitis,
    havuzKurus,
    aktorId: o.ozneId,
    gun,
  });

  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/happy-hour");
  revalidatePath("/kafe/panel");
  return { bilgi: "Pencere açıldı. Oyuncular kafedeyken havuzu görüyor." };
}

export async function pencereKapat(pencereId: string): Promise<HappyDurumu> {
  const o = await kafeYoneticisiGerekli();

  const sonuc = await happy.pencereKapat({
    cafeId: o.cafeId,
    pencereId,
    aktorId: o.ozneId,
  });
  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath("/kafe/panel/happy-hour");
  return { bilgi: "Pencere kapatıldı. Kalan havuz genel bütçende — hiçbir şey kaybolmadı." };
}

/**
 * Haftalık program kurma / kaldırma (Ü104).
 *
 * ⚠️ Boş havuz alanı **o günün programını kaldırıyor**. Ayrı bir "sil"
 * düğmesi yerine bu: kafe zaten havuzu silerek "bu gün happy hour yok"
 * demek istiyor ve iki ayrı yol iki ayrı sonuç doğurma riski taşırdı.
 */
export async function programEylemi(
  onceki: HappyDurumu,
  form: FormData,
): Promise<HappyDurumu> {
  const o = await kafeYoneticisiGerekli();

  const haftaGunu = Number(String(form.get("haftaGunu") ?? ""));
  const havuzHam = String(form.get("havuz") ?? "").replace(/[^\d]/g, "");
  const saatHam = String(form.get("baslangic") ?? "");
  const sureSaat = Number(String(form.get("sure") ?? "3"));

  if (!havuzHam) {
    const sonuc = await happy.programKur({
      cafeId: o.cafeId,
      haftaGunu,
      baslangicDakika: null,
      sureDakika: null,
      havuzKurus: null,
      aktorId: o.ozneId,
    });
    revalidatePath("/kafe/panel/happy-hour");
    return sonuc.ok
      ? {
          bilgi: sonuc.bugunSuruyor
            ? "Bu günün programı kaldırıldı. Bugünkü happy hour şu an sürüyor ve bitene kadar devam eder."
            : "Bu günün programı kaldırıldı.",
        }
      : { hata: sonuc.hata };
  }

  const [saat, dakika] = saatHam.split(":").map(Number);
  if (!Number.isInteger(saat) || !Number.isInteger(dakika)) {
    return { hata: "Başlangıç saatini gir." };
  }

  const sonuc = await happy.programKur({
    cafeId: o.cafeId,
    haftaGunu,
    baslangicDakika: saat * 60 + dakika,
    sureDakika: sureSaat * 60,
    havuzKurus: Number(havuzHam) * 100,
    aktorId: o.ozneId,
  });

  revalidatePath("/kafe/panel/happy-hour");
  if (!sonuc.ok) return { hata: sonuc.hata };

  /*
    Ü277: ürün sahibi *"pencere kendiliğinden açılacaktan kastı ne?"* diye
    sordu — "pencere" bizim iç sözcüğümüz. Cümle artık ne olacağını
    söylüyor: hangi gün, hangi saatte, ne kadar, oyuncuya ne kazandırıyor.
  */
  const saatYazi = `${String(saat).padStart(2, "0")}:${String(dakika).padStart(2, "0")}`;
  // Bugünün penceresi saati gelmeden de yazılıyor (Ü277) — "açıldı" demek
  // saati henüz gelmemiş pencerede yanlış olurdu.
  const baslamadi = saat * 60 + dakika > istanbulDakikasi(new Date());
  // Ü279: kafenin son kaydı geçerli — bugünün satırı bugün de açılıyor;
  // açılmadıysa neden açılmadığı söyleniyor.
  const bugunMesaji: Record<happy.BugunSonucu, string> = {
    acildi: baslamadi ? ` Bugün ${saatYazi}'te başlayacak.` : " Bugünkü happy hour şu an açık.",
    ikinci: baslamadi
      ? ` Bugün ikinci happy hour ${saatYazi}'te başlayacak.`
      : " Bugün ikinci happy hour şu an açık.",
    gecti: " Bugün için saati geçti — yeni saat gelecek haftadan geçerli.",
    sinir: ` Bugün en fazla ${happy.GUNLUK_EN_FAZLA} happy hour açılabiliyor — yeni saat gelecek haftadan geçerli.`,
    cakisiyor:
      " Bugünkü happy hour sürüyor ve yeni saat onunla çakışıyor — yeni saat gelecek haftadan geçerli.",
  };
  const ek = sonuc.bugun ? bugunMesaji[sonuc.bugun] : "";
  return {
    bilgi: `Kaydedildi. Her ${GUN_ADI[haftaGunu]} ${saatYazi}'te happy hour kendiliğinden başlar ve ${sureSaat} saat sürer — senin bir şey yapman gerekmez. Bu sürede bugünkü oyun ödülünü almış oyuncu havuzdan ikinci bir ödül kazanabilir.${ek}`,
  };
}
