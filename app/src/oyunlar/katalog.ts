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
 * ── Kategoriler: Ü66'nın ikilisi Ü263'te ÜÇE çıktı ────────────
 *
 * Ü66'dan beri iki kategori vardı — "Düşünerek" ve "Yetişerek" — ve
 * ayrım oyuncunun ne yaptığıydı: düşünerek mi oynuyorsun yoksa
 * yetişerek mi.
 *
 * Ü263'te ürün sahibi kart referansları gönderdi ve onlarda üç kategori
 * vardı: **Stratejik · Mantık & Düşünme · Beceri & Hız**. Soruldu,
 * referans seçildi.
 *
 * ⚠️ Ayrım ölçütü **değişmedi**, yalnızca "Düşünerek" ikiye bölündü:
 * planlayıp biriktirdiğin oyunlar (Blok, Blok Kırıcı, Blok 2048) ile
 * tek doğru çözümü aradığın bulmacalar (Renkli Tüpler, Renkli
 * Çizgiler) artık ayrı duruyor. "Yetişerek" olduğu gibi "Beceri & Hız"
 * oldu.
 *
 * ⚠️ Referansta yalnızca **altı** oyunun kartı vardı. Blok, Düşen ve
 * Yılan'ınkiler henüz gelmedi; üçü de eski ayrımın söylediği yere
 * kondu (Blok stratejik; Düşen ve Yılan beceri). Kartları gelince
 * teyit edilecek.
 *
 * ⚠️ Blok Kırıcı burada **Sekme'nin yeni adı**: referansta "Blok
 * Kırıcı" topları fırlatıp blokları patlatan oyun, paletli olan ise
 * "Tuğla Kırıcı". Eski adlandırmada ikisi terstiydi.
 */

export type Kategori = {
  ad: string;
  ozet: string;
  oyunlar: string[];
};

export const KATEGORILER: Kategori[] = [
  {
    ad: "Stratejik",
    ozet: "Planla, yerleştir, biriktir",
    oyunlar: ["blok", "sekme", "ikibin"],
  },
  {
    ad: "Mantık & Düşünme",
    ozet: "Acele yok, doğru hamle var",
    oyunlar: ["ayir", "bagla"],
  },
  {
    ad: "Beceri & Hız",
    ozet: "Hızlanıyor, sen yavaşlayamıyorsun",
    oyunlar: ["dusen", "yilan", "bicak", "kirici"],
  },
];

/** Karuselin bir kartına giden veri. */
export type KatalogKarti = {
  id: string;
  ad: string;
  ozet: string;
  /** "Stratejik" · "Mantık & Düşünme" · "Beceri & Hız" · "Diğer" */
  kategori: string;
  bugunMu: boolean;
};

/**
 * Açık oyunları katalog sırasına dizer.
 *
 * ⚠️ Sıra **kategorilere göre** kuruluyor, `acik` listesinin kendi
 * sırasına göre değil: karusel tek bir halka ama oyuncunun soldan sağa
 * göreceği düzen kategorilerin sırası.
 *
 * ⚠️ Kategoriye girmemiş oyun **sona** ekleniyor, düşmüyor: yeni bir
 * oyun eklenip `KATEGORILER` güncellenmezse oyun katalogdan sessizce
 * kaybolurdu. Bugün "Diğer" boş ve öyle kalmalı — dolduğu gün
 * `KATEGORILER`in güncellenmediği anlaşılır.
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
