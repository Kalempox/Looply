import { type HerhangiOyun } from "@/oyunlar";

/**
 * Oyun kataloğunun sırası ve kategorileri — Ü195.
 *
 * ── Neden ayrı dosya ────────────────────────────────────────
 *
 * Bu liste Ü66'dan beri `app/oyunlar/page.tsx`in içinde duruyordu ve
 * orada durduğu sürece **tek bir ekran** kullanabiliyordu. Ürün sahibi
 * misafir ekranına bakıp *"bir oyun seç kartlarını oyun ekranımızdaki
 * kartlarla aynı yapmamışsın, birebir aynı olmalı"* deyince sorun
 * göründü: misafir ekranı kendi listesini kendi kuruyordu, yani
 * kategori, bugünün oyunu ve sıralama orada yoktu.
 *
 * "Birebir aynı" iki şey demek ve ikisi de burada çözülüyor:
 *   · aynı **kart** → `OyunKapagi` (karusel.tsx) iki ekranda da o
 *   · aynı **veri** → kategori, sıra ve "bugünün oyunu" bu dosyadan
 *
 * ── Kategoriler (Ü66) ───────────────────────────────────────
 *
 * Üç oyuna üç kategori yapılmadı; o, kategori değil etiket olurdu.
 * İki kategori var ve ayrım oyuncunun hissettiği şey: **düşünerek**
 * mi oynuyorsun yoksa **yetişerek** mi.
 */

export type Kategori = {
  ad: string;
  ozet: string;
  oyunlar: string[];
};

export const KATEGORILER: Kategori[] = [
  {
    ad: "Düşünerek",
    ozet: "Acele yok, doğru hamle var",
    oyunlar: ["blok", "kelime"],
  },
  {
    ad: "Yetişerek",
    ozet: "Hızlanıyor, sen yavaşlayamıyorsun",
    oyunlar: ["dusen"],
  },
];

/** Karuselin bir kartına giden veri. */
export type KatalogKarti = {
  id: string;
  ad: string;
  ozet: string;
  /** "Düşünerek" · "Yetişerek" · "Diğer" */
  kategori: string;
  bugunMu: boolean;
};

/**
 * Açık oyunları katalog sırasına dizer.
 *
 * ⚠️ Sıra **kategorilere göre** kuruluyor, `acik` listesinin kendi
 * sırasına göre değil: karusel tek bir halka ama oyuncunun soldan sağa
 * göreceği düzen hâlâ "önce düşünerek, sonra yetişerek".
 *
 * ⚠️ Kategoriye girmemiş oyun **sona** ekleniyor, düşmüyor: yeni bir
 * oyun eklenip `KATEGORILER` güncellenmezse oyun katalogdan sessizce
 * kaybolurdu. (Yılan bugün tam olarak bu durumda ve "Diğer" altında
 * görünüyor.)
 *
 * @param bugunId Bugünün oyununun kimliği; misafirde de kafeye göre
 *   hesaplanabiliyor, `null` verilirse hiçbir kart işaretlenmiyor.
 */
export function katalogSirasi(
  acik: readonly HerhangiOyun[],
  bugunId: string | null,
): KatalogKarti[] {
  const yerlesik = new Set(KATEGORILER.flatMap((k) => k.oyunlar));
  const digerleri = acik.filter((oy) => !yerlesik.has(oy.id));

  return [
    ...KATEGORILER.flatMap((kat) =>
      kat.oyunlar
        .map((id) => acik.find((oy) => oy.id === id))
        .filter((oy): oy is HerhangiOyun => !!oy)
        .map((oy) => ({ oy, kategori: kat.ad })),
    ),
    ...digerleri.map((oy) => ({ oy, kategori: "Diğer" })),
  ].map(({ oy, kategori }) => ({
    id: oy.id,
    ad: oy.ad,
    ozet: oy.ozet,
    kategori,
    bugunMu: oy.id === bugunId,
  }));
}
