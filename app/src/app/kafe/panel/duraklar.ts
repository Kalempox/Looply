import type { IsletmeTuru } from "@/domain/cark-kosul";

/**
 * İşletme panelinin durak tablosu.
 *
 * ── Neden gezinmeden ayrı bir dosya ─────────────────────────
 *
 * `gezinme.tsx` bir istemci bileşeni: `next/link`, `usePathname`, satır içi
 * SVG ikonlar. Duraklar orada dururken iki şey yapılamıyordu:
 *
 *   1. **Sınamak.** "Butik menüsünde Oyunlar var mı" sorusu, bir React
 *      ağacı kurmadan cevaplanamıyordu.
 *   2. **Paylaşmak.** Panelin ana ekranı (`page.tsx`) aynı yolları
 *      **ikinci kez**, elle yazıyordu. İki liste ayrı ayrı bakıldığı için
 *      ayrışmıştı: `Oyunlar` ve `Şubeler` kenar çubuğunda vardı, ana
 *      ekranda yoktu — ve alt şeritte de olmadıkları için **telefondan
 *      hiçbir yoldan açılamıyorlardı.**
 *
 * Tablo burada duruyor; ikon ve çizim `gezinme.tsx`te kalıyor. Yol ve ad
 * veridir, ikon sunum.
 *
 * ── 🔴 `yalnizca` ne yapıyor ────────────────────────────────
 *
 * Ü137 butik kipini açtı: butikte **oyun yok**, çark hakkını kasiyer
 * alışverişe bakarak veriyor. Menü bunu bilmiyordu — oyunu olmayan
 * işletme "Oyunlar" durağı görüyordu.
 *
 * ⚠️ **Bu alan bir denetim değil.** Menüden gizlemek, adres çubuğuna elle
 * yazan birini durdurmuyor. Asıl kapı `oyun-secimi.degistir` içinde:
 * butik için oyun ayarı sunucuda **reddediliyor**. Burası yalnızca
 * olmayan bir şeyi menüde göstermemek.
 */
export type Durak = {
  yol: string;
  ad: string;
  /** Yalnızca bu işletme türünde görünür. Boşsa her türde görünüyor. */
  yalnizca?: IsletmeTuru;
};

/**
 * Telefonda alt şeritte görünen dört durak — günlük iş bunlara iniyor.
 *
 * ⚠️ Dörtten fazlası telefonda okunmuyor; beşinci ikon sıkışıyor. Bu
 * yüzden kalan duraklara telefondan **ana ekrandaki kurulum listesinden**
 * gidiliyor ve o listenin eksiksiz olması bir test tarafından korunuyor.
 */
export const GUNLUK: readonly Durak[] = [
  { yol: "/kafe/panel", ad: "Panel" },
  { yol: "/kafe/panel/oduller", ad: "Ödüller" },
  { yol: "/kafe/panel/rapor", ad: "Rapor" },
  { yol: "/kafe/panel/butce", ad: "Bütçe" },
];

/**
 * Kenar çubuğu: kampanya ödülün hemen ardında, çark sonda.
 *
 * **Çark** (Ü123) masa başında yapılan bir ayar, telefonda acil değil;
 * oraya Ödüller sayfasındaki bağlantıdan da gidiliyor.
 *
 * **Kampanyalar** ödülün kardeşi. Daha önce ayrı durak değildi:
 * `/kafe/panel/oduller` altında bir sekmeydi ve kafe sahibi ikisini
 * sürekli karıştırıyordu. Ayrı tablolar, ayrı mekanizmalar (Ü26) — menüde
 * de ayrı duruyorlar. Farkı anlatan not `fark-notu.tsx`te.
 */
export const GUNLUK_GENIS: readonly Durak[] = [
  { yol: "/kafe/panel", ad: "Panel" },
  { yol: "/kafe/panel/oduller", ad: "Ödüller" },
  { yol: "/kafe/panel/kampanyalar", ad: "Kampanyalar" },
  { yol: "/kafe/panel/rapor", ad: "Rapor" },
  { yol: "/kafe/panel/butce", ad: "Bütçe" },
  { yol: "/kafe/panel/cark", ad: "Çark" },
];

/**
 * Kurulum durakları — kenar çubuğunda ve ana ekrandaki kartlarda.
 *
 * ── Konum: çıktı, sonra geri geldi (Ü123 → Ü131) ────────────
 *
 * Ü123'te menüden çıkarılmıştı — ürün sahibi *"panelde durmasının anlamı
 * yok"* dedi ve haklıydı: kurulumda bir kez kullanılıp bir daha açılmayan
 * bir ekran, her gün bakılan bir listede yer kaplıyordu.
 *
 * **Ü131 o gerekçeyi ortadan kaldırdı.** Sayfada artık ayarlanacak bir şey
 * var: doğrulama yarıçapı. Kafe çemberini daraltmak istediğinde
 * ("bahçeyi de saysın" / "yan bina sayılmasın") aranacak bir yer gerekiyor
 * ve bulunamayan bir ayar, olmayan bir ayardır.
 *
 * ⚠️ **Konum sayfası hiç silinmedi ve silinemez.** Kafenin koordinatını
 * yazan tek yer orası; koordinat yoksa K2 hiç doğrulanamıyor ve o kafede
 * **hiç kimse hiçbir şey kazanamıyor**.
 */
export const KURULUM: readonly Durak[] = [
  { yol: "/kafe/panel/konum", ad: "Konum" },
  { yol: "/kafe/panel/urunler", ad: "Ürünler" },
  { yol: "/kafe/panel/karekod", ad: "Karekod" },
  // 🔴 Butikte oyun YOK (Ü137) — bu durak orada yönetecek bir şey bulmuyor.
  { yol: "/kafe/panel/oyunlar", ad: "Oyunlar", yalnizca: "kafe" },
  { yol: "/kafe/panel/personel", ad: "Personel" },
  { yol: "/kafe/panel/happy-hour", ad: "Happy Hour" },
  // Ü125: şube açma yolu. Üst şeritteki şube seçici tek şubeli işletmede
  // hiç çizilmiyor ve çizilmemeli — yani ikinci şubeyi açmak isteyen kişi
  // orayı hiç göremiyor. Yol bu yüzden menüde duruyor.
  { yol: "/kafe/panel/subeler", ad: "Şubeler" },
];

/** Bir işletme türünün göreceği duraklar. */
export function duraklar(hepsi: readonly Durak[], turu: IsletmeTuru): readonly Durak[] {
  return hepsi.filter((d) => !d.yalnizca || d.yalnizca === turu);
}
