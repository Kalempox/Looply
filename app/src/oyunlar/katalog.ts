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
 * ⚠️ Sekme "Düşünerek"te, "Yetişerek"te değil: oyunda **hiç zaman
 * baskısı yok** — oyuncu nişan alırken istediği kadar düşünebiliyor ve
 * zorluk açıyı kestirmekte. Ü217'de önce yanlış kategoriye kondu;
 * ayrım hızda değil, oyuncunun ne yaptığında.
 *
 * Üç oyuna üç kategori yapılmadı; o, kategori değil etiket olurdu.
 * İki kategori var ve ayrım oyuncunun hissettiği şey: **düşünerek**
 * mi oynuyorsun yoksa **yetişerek** mi.
 *
 * ── Ü208: Kelime çıkınca Yılan yerine oturdu ────────────────
 *
 * Kelime kaldırılınca "Düşünerek" tek oyunla kaldı ve Yılan hâlâ
 * "Diğer"deydi — aşağıdaki not bunu zaten bir gözden kaçma olarak
 * yazıyordu. Yılan refleks oyunu; yeri "Yetişerek". Şimdi iki kategori
 * de dolu ve "Diğer" boş.
 *
 * ── Ü235: Bıçak "Yetişerek"te ───────────────────────────────
 *
 * Sekme'nin kategorisi Ü217'de yanlış konmuştu ve ayrımın hızda
 * değil **oyuncunun ne yaptığında** olduğu o zaman yazıldı. Bıçak
 * testi tersinden geçiyor: kütük dönerken oyuncunun düşünecek bir
 * şeyi yok, yalnızca **ne zaman** dokunacağı var. Bekleyebilir ama
 * beklemek ona bir bilgi vermiyor — boşluk dönüp geliyor.
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
    oyunlar: ["blok", "sekme"],
  },
  {
    ad: "Yetişerek",
    ozet: "Hızlanıyor, sen yavaşlayamıyorsun",
    oyunlar: ["dusen", "yilan", "bicak"],
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
