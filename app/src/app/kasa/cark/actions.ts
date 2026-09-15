"use server";

import { headers } from "next/headers";
import { kasiyerGerekli } from "@/domain/yetki";
import * as kosul from "@/domain/cark-kosul";
import * as carkHakki from "@/domain/cark-hakki";

export type TutarSonucu =
  | {
      durum: "uygun";
      sebep: string;
      /** Müşterinin okutacağı adres — kasada QR olarak çiziliyor. */
      adres: string;
      sonGecerlilik: string;
    }
  | {
      durum: "uygun_degil";
      sebep: string;
      /** Ü137: "isterseniz tamamlayın" cümlesi için. */
      eksikTl: number | null;
    }
  | { durum: "hata"; hata: string };

/**
 * Kasiyer alışveriş tutarını giriyor — Ü137.
 *
 * ── Akışın kalbi ────────────────────────────────────────────
 *
 * Ürün sahibinin tarifi: *"kasiyer okutup 2500 olduğunu görünce
 * kullanıcıya diyecek ki 3000 TL ve üzeri alışverişlerde çark şansınız
 * var, isterseniz 3000'e tamamlayın."*
 *
 * Bu yüzden "uygun değil" cevabı yalnızca **hayır** demiyor: en yakın
 * eşiğe kaç lira kaldığını da söylüyor. Kasiyerin ağzına o cümleyi
 * koymak bu ekranın asıl işi — satışı büyüten şey o.
 *
 * ── 🔴 Hak SORGUYLA BİRLİKTE doğuyor ────────────────────────
 *
 * Uygunsa hak hemen üretiliyor ve QR dönüyor. Ayrı bir "hak ver"
 * düğmesi olsaydı kasiyer tutarı girer, uygun görür, sonra düğmeye
 * basmayı unuturdu — ya da basmadan önce tutarı değiştirip aynı
 * alışverişten iki hak çıkarabilirdi.
 *
 * ⚠️ Bunun bedeli: kasiyer denemek için tutar girdiğinde de hak doğuyor.
 * Kabul edilebilir — hak 15 dakikada sönüyor ve okutulmadan kimseye
 * bağlanmıyor. Karşılığında akış tek dokunuşa iniyor.
 *
 * ⚠️ `cafeId` ve `staffId` **oturumdan** (Değişmez kural #3). Formdan
 * gelselerdi bir kasiyer başka işletmenin adına hak üretirdi.
 */
export async function tutarGir(_onceki: TutarSonucu | null, form: FormData): Promise<TutarSonucu> {
  const o = await kasiyerGerekli();

  const ham = String(form.get("tutar") ?? "").replace(",", ".").trim();
  const tl = Number(ham);

  if (!Number.isFinite(tl) || tl <= 0) {
    return { durum: "hata", hata: "Alışveriş tutarını yaz." };
  }
  if (tl > 1_000_000) {
    return { durum: "hata", hata: "Tutar çok büyük görünüyor. Kontrol et." };
  }

  const tutarKurus = Math.round(tl * 100);

  const sonuc = await kosul.degerlendir({ cafeId: o.cafeId, tutarKurus });

  if (!sonuc.uygun) {
    return {
      durum: "uygun_degil",
      sebep: sonuc.sebep,
      eksikTl: sonuc.eksikKurus === null ? null : Math.ceil(sonuc.eksikKurus / 100),
    };
  }

  const hak = await carkHakki.ver({
    cafeId: o.cafeId,
    staffId: o.ozneId,
    kosulId: sonuc.kosulId,
  });

  /*
    Adres istekten türüyor — ortam değişkeninden değil. Hazırlık ve canlı
    arasında sessizce yanlış adres basma riski, karekod ekranda anlık
    çizildiği için burada basılı etiket kadar kalıcı değil; ama aynı
    hata aynı şekilde sessiz olurdu (`karekod/yazdir` ile aynı tercih).
  */
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "looply";
  const sema = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return {
    durum: "uygun",
    sebep: sonuc.sebep,
    adres: `${sema}://${host}/h/${hak.jeton}`,
    sonGecerlilik: hak.sonGecerlilik.toISOString(),
  };
}
