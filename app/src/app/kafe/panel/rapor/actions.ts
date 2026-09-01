"use server";

import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as ayar from "@/domain/ayar";
import { disaAktar, goruntulemeyiKaydet, araligiCoz } from "@/domain/rapor";

/**
 * Rapor dışa aktarma.
 *
 * Dosya binadan çıkıyor — e-postayla dolaşıyor, muhasebeciye gidiyor. Bu
 * yüzden iki şey birden yapılıyor: mahremiyet eşiği çıktıda da uygulanıyor
 * (Ü30, `disaAktar` içinde) ve **her dışa aktarma denetim izine düşüyor**.
 *
 * Aralığı ekrandan gelen ham parametrelerle değil, `araligiCoz` ile
 * çözüyoruz: ekranın gördüğü aralıkla dosyanın içindeki aralık aynı
 * fonksiyondan çıksın. İkisi ayrı hesaplansaydı "ekranda gördüğüm sayı
 * dosyada yok" hatası, fark edilmesi en zor hata türü olurdu.
 */
export async function disaAktarEylemi(sp: {
  on?: string;
  bas?: string;
  bit?: string;
}): Promise<string> {
  const o = await kafeYoneticisiGerekli();
  const { aralik } = araligiCoz(sp);

  await goruntulemeyiKaydet({
    cafeId: o.cafeId,
    aktorId: o.ozneId,
    aralik,
    disaAktarma: true,
  });

  return disaAktar(o.cafeId, aralik);
}

/** Getiri tahmininin dayandığı ortalama adisyon (Ü46). */
export async function adisyonKaydet(tl: number): Promise<{ ok: boolean; hata?: string }> {
  const o = await kafeYoneticisiGerekli();

  if (!Number.isFinite(tl)) return { ok: false, hata: "Geçerli bir tutar girin." };

  const s = await ayar.sayiYaz({
    cafeId: o.cafeId,
    anahtar: ayar.ANAHTARLAR.ortalamaAdisyon,
    deger: Math.round(tl * 100),
    aktorId: o.ozneId,
  });

  return s.ok ? { ok: true } : { ok: false, hata: s.hata };
}
