/**
 * Oyun içi ödül paketinin ortak kuralı — Ü203 · Ü207.
 *
 * ── Paket ne YAPAR, ne YAPMAZ ───────────────────────────────
 *
 * Ürün sahibinin isteği şuydu: *"ödüller dağıtılırken tetriste mesela
 * dışı ödül paketli bir parça yukarıdan aşağıya düşsün, block blastte
 * ödül kaplı parça olsun, ekrana konunca ödül kazanılsın — 'eşik
 * geçildi' tarzı şeyler yazmasın."*
 *
 * Yani istenen şey **bir nesne**, bir bildirim değil. Paket, oyuncunun
 * zaten kazandığı ödülü ekranda elle tutulur hâle getiriyor:
 *
 *   YAPAR     → kazanılmış ödülü görünür kılar, teslim anını yaratır
 *   YAPMAZ    → puan vermez, eşiği düşürmez, kupon şansını artırmaz
 *
 * ── 🔴 Ü201'in ekonomi hatası — bir daha yapılmasın ─────────
 *
 * İlk denemede (Ü201) paket +120 puan veriyor ve eşiğin **altında**
 * çıkıyordu. Sonucu kuponun barının 500'den fiilen 380'e inmesiydi.
 * Ürün sahibi oynayıp gördü: *"oyun çok ödül dağıtıyor… kafenin
 * belirlediği günlük bütçeye göre çok doğru ayarlanmalı."*
 *
 * Bütçe motoru (`domain/odul-motoru.ts`) kuponu kafenin günlük
 * bütçesinden veriyor ve o kural hiç delinmemişti; delinen şey **eşiğe
 * ulaşma zorluğuydu.** Daha çok tur eşiği geçince daha çok kupon talebi
 * doğuyor ve bütçe daha hızlı bitiyor.
 *
 * ── 🔴 Paket `odulIsareti`e BAĞLANMIYOR — kasten ────────────
 *
 * Sözleşmede Ü91'den beri bir kanca var: `Oyun.odulIsareti`. Yılan onu
 * kullanıyor (elmanın yerini alan altın kupon) ve etkisi ikili:
 *
 *   · `domain/puan.basariliMi` → işaret varsa **eşiği tamamen atlıyor**
 *   · `domain/odul-motoru.dusmeSansi` → düşme şansına pay ekliyor
 *
 * Paketi o kancaya takmak, Ü201'in ekonomi kaymasını ikinci kez, bu kez
 * daha büyük ölçekte geri getirirdi. Paket eşik **zaten geçildikten
 * sonra** çıktığı için kancaya ihtiyacı da yok: `basariliMi(skor)` o an
 * hâlihazırda `true`.
 *
 * ⚠️ Yılan'ın işareti ayrı bir şey ve öyle kalmalı: orada ödül bir
 * **hedef** (oyuncu ona ulaşmak için yön değiştiriyor), burada bir
 * **teslimat**. İkisini aynı kancada toplamak, iki farklı ekonomiyi tek
 * sayıya indirir.
 */

/**
 * Kupon eşiği — motorun kopyası.
 *
 * 🔴 `domain/puan.KUPON_ESIGI` ile **aynı olmak zorunda** ve bunu bir
 * test koruyor (`oyun-motoru.test.ts`).
 *
 * Neden kopya: asıl sabit `domain/puan.ts`te ve o dosya `@/db/context`
 * import ediyor. Motorlar hem sunucuda hem tarayıcıda koşuyor; buradan
 * `domain/puan` import etmek `pg`yi istemci paketine çeker ve derleme
 * kırılır (Ü75; Ü199'da iki kez yaşandı). Sayıyı taşımak yerine
 * kopyalayıp **ayrışmasını imkânsız kılmak** daha ucuz.
 */
export const ODUL_ESIGI = 500;

/**
 * Ödül parçasının verdiği fazladan puan — **sıfır**, öyle kalmalı.
 *
 * Skor tam olarak Ü201 öncesindeki skor; ekonomiye dokunan hiçbir şey
 * yok. ⚠️ Bir daha puana bağlanırsa aynı kayma geri gelir ve bu kez
 * sessizce — bu yüzden bir test sayının sıfır kaldığını sınıyor.
 */
export const ODUL_BONUSU = 0;

/**
 * Bu turda paket çıkmalı mı?
 *
 * Tek kural, iki oyunda da aynı: oyuncu eşiği **kendi oyunuyla**
 * geçmiş olacak ve paket bu turda **henüz teslim edilmemiş** olacak.
 *
 * ⚠️ `verildi` bayrağı şart. Eşik geçildikten sonra skor hep eşiğin
 * üstünde kalıyor; bayrak olmasaydı paket sürekli çıkar ve oyuncu her
 * seferinde yeni bir kupon kazandığını sanardı.
 *
 * ⚠️ Motor konumu (kafede mi) ve bütçeyi **bilmiyor ve bilmemeli** —
 * bilseydi aynı girdi kaydı iki farklı skor üretir, sunucunun tekrarı
 * ayrışırdı. Paket bu yüzden kafe dışında da hesaplanıyor; onu
 * **gizlemek ekranın işi** (`kazandirir` bayrağı).
 */
export function odulSirasiGeldi(skor: number, verildi: boolean): boolean {
  return !verildi && skor >= ODUL_ESIGI;
}
