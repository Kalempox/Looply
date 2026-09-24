/**
 * Elle girilen kafe koordinatını çözer — Ü278.
 *
 * ── Neden gerekti ───────────────────────────────────────────
 *
 * Ürün sahibi: *"bunu yerinde bilgisayardan doğru bilgiyi alamaz mıyız?"*
 * Bilgisayarda GPS yok; tarayıcı konumu Wi-Fi'den ya da internet
 * adresinden tahmin ediyor ve ±5 km yanıldı (Ü274 o okumayı reddediyor).
 * Kafe sahibinin elinde ise kesin bir kaynak var: Google Haritalar'da
 * kafenin üstüne sağ tıklayınca çıkan koordinat. Bu modül onu okuyor.
 *
 * ── Ne kabul ediliyor ───────────────────────────────────────
 *
 * - Düz koordinat: `41.03690, 28.98380` (sağ tık menüsünün verdiği biçim)
 *   ya da ondalığı virgüllü `41,03690 28,98380`.
 * - Google Haritalar linki. Öncelik sırası önemli: yer sayfasının
 *   linkinde `@enlem,boylam` **haritanın ortası**, işaretli yerin kendisi
 *   `!3d…!4d…` içinde. Önce o aranıyor, sonra `?q=`, en son `@`.
 *
 * ── Ne reddediliyor ─────────────────────────────────────────
 *
 * - Kısa link (`maps.app.goo.gl`): çözmek için Google'a istek atmak
 *   gerekirdi. Sunucu dışarıya istek atmıyor.
 * - Virgülden sonra 4 basamaktan az: 41.04 gibi bir sayı ~1 km payla
 *   gelir ve kafeyi yan mahalleye koyar. 4 basamak ~11 m.
 * - Hizmet alanı dışı (Türkiye ve KKTC'yi kapsayan geniş kutu). Amaç
 *   coğrafya dayatmak değil, **ters girilmiş** (boylam önce) ya da yanlış
 *   kopyalanmış sayıyı yakalamak; tersi kutuya düşüyorsa bunu söylüyor.
 *
 * Saf fonksiyon: ekran yazarken önizliyor, sunucu kaydederken aynı
 * kuralla yeniden çözüyor — ekranı atlayan istek de aynı kapıdan geçer.
 */

export type KoordinatSonucu =
  | {
      ok: true;
      lat: number;
      lng: number;
      /** `merkez`: linkteki `@` — haritanın ortası, işaretli yer değil. */
      kaynak: "metin" | "yer" | "sorgu" | "merkez";
    }
  | { ok: false; hata: string };

/** Türkiye ve KKTC'yi kapsayan geniş kutu — yalnızca yanlış girişi yakalamak için. */
export const HIZMET_ALANI = {
  enlem: [34.5, 42.5],
  boylam: [25.5, 45.0],
} as const;

/** ~11 m. Google Haritalar'ın sağ tık menüsü 5 basamak veriyor. */
export const EN_AZ_BASAMAK = 4;

const SAYI = String.raw`-?\d+(?:\.\d+)?`;

export function hizmetAlanindaMi(lat: number, lng: number): boolean {
  return (
    lat >= HIZMET_ALANI.enlem[0] &&
    lat <= HIZMET_ALANI.enlem[1] &&
    lng >= HIZMET_ALANI.boylam[0] &&
    lng <= HIZMET_ALANI.boylam[1]
  );
}

/** Kaydetmeden önce gözle kontrol için — yeni sekmede açılıyor. */
export function haritaLinki(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function basamak(sayi: string): number {
  const i = sayi.search(/[.,]/);
  return i < 0 ? 0 : sayi.length - i - 1;
}

function linktenCoz(link: string): { enlem: string; boylam: string; kaynak: "yer" | "sorgu" | "merkez" } | null {
  let metin = link;
  try {
    metin = decodeURIComponent(link);
  } catch {
    // Bozuk kodlama: ham hâliyle denenir.
  }

  const yer = metin.match(new RegExp(`!3d(${SAYI})!4d(${SAYI})`));
  if (yer) return { enlem: yer[1], boylam: yer[2], kaynak: "yer" };

  const sorgu = metin.match(
    new RegExp(`[?&](?:q|query|ll|center|destination|daddr)=(${SAYI}),\\s*(${SAYI})`),
  );
  if (sorgu) return { enlem: sorgu[1], boylam: sorgu[2], kaynak: "sorgu" };

  const merkez = metin.match(new RegExp(`@(${SAYI}),(${SAYI})`));
  if (merkez) return { enlem: merkez[1], boylam: merkez[2], kaynak: "merkez" };

  return null;
}

export function koordinatCoz(girdi: string): KoordinatSonucu {
  const metin = girdi.trim();
  if (!metin) return { ok: false, hata: "Koordinatı yapıştır." };

  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(metin)) {
    return {
      ok: false,
      hata: "Kısa link açılamıyor. Haritada kafenin üstüne sağ tıkla ve en üstteki sayılara tıklayıp kopyala.",
    };
  }

  let enlemHam: string;
  let boylamHam: string;
  let kaynak: "metin" | "yer" | "sorgu" | "merkez" = "metin";

  if (/^https?:\/\//i.test(metin) || /google\.[a-z.]+\/maps/i.test(metin)) {
    const c = linktenCoz(metin);
    if (!c) {
      return {
        ok: false,
        hata: "Bu linkte koordinat yok. Haritada kafenin üstüne sağ tıkla ve en üstteki sayılara tıklayıp kopyala.",
      };
    }
    enlemHam = c.enlem;
    boylamHam = c.boylam;
    kaynak = c.kaynak;
  } else {
    // Ondalığı virgüllü de olabilir: "41,03690, 28,98380". Virgül ancak
    // ardından rakam geliyorsa sayının parçası sayılıyor.
    const sayilar = metin.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
    if (sayilar.length !== 2) {
      return {
        ok: false,
        hata: "İki sayı olmalı: önce enlem, sonra boylam — ör. 41.03690, 28.98380",
      };
    }
    [enlemHam, boylamHam] = sayilar;
  }

  if (basamak(enlemHam) < EN_AZ_BASAMAK || basamak(boylamHam) < EN_AZ_BASAMAK) {
    return {
      ok: false,
      hata: `Koordinat çok kaba — virgülden sonra en az ${EN_AZ_BASAMAK} basamak olmalı (Google Haritalar 5 verir). Kaba koordinat kafeyi yüzlerce metre kaydırır.`,
    };
  }

  const lat = Number(enlemHam.replace(",", "."));
  const lng = Number(boylamHam.replace(",", "."));

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false, hata: "Geçerli bir koordinat değil." };
  }

  if (!hizmetAlanindaMi(lat, lng)) {
    if (hizmetAlanindaMi(lng, lat)) {
      return {
        ok: false,
        hata: "Enlem ile boylam yer değiştirmiş görünüyor — önce enlem gelmeli (Türkiye'de 36 ile 42 arası).",
      };
    }
    return {
      ok: false,
      hata: "Bu koordinat Türkiye'de değil. Haritada kafenin üstüne sağ tıklayıp çıkan sayıları kopyala.",
    };
  }

  return { ok: true, lat, lng, kaynak };
}
