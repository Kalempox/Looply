import type { HerhangiOyun } from "./sozlesme";
import { bicak } from "./bicak";
import { blok } from "./blok";
import { dusen } from "./dusen";
import { sekme } from "./sekme";
import { yilan } from "./yilan";

/**
 * Oyun kayıt defteri.
 *
 * Faz 5'in dördüncü maddesi: *"yeni oyun eklemek kod değişikliği değil,
 * dosya eklemek olsun."* Uygulanışı bu dosya — yeni oyun eklemek, bir modül
 * yazıp aşağıdaki diziye bir satır koymaktır. Motor, oturum akışı, sunucu
 * doğrulaması ve ekranlar değişmez.
 *
 * Oyunlar kasıtlı olarak **farklı girdi biçimleri** üretiyor (Ü21):
 *   blok   → (teklif, satır, sütun)  · zaman yok
 *   düşen  → (tick, hareket)         · zaman var
 *   sekme  → (atış no, açı)          · zaman **motorun içinde**
 *   yılan  → (tick, yön)             · zaman var, **ödül işareti var**
 *   bıçak  → (tick)                  · **girdinin tamamı zaman**
 *
 * Ü235'te Bıçak eklendi ve iddia beşinci kez sınandı — bu sefer en
 * uçtan: girdinin tek alanı var ve o da tick. Oyuncunun yaptığı tek
 * şey *ne zaman* dokunduğu; nereye dokunduğu oyunda yok. Sözleşmeye
 * hiçbir şey eklenmedi.
 *
 * Ü217'de Sekme eklendi ve iddia dördüncü kez sınandı: bir girdi tek
 * bir **atışın tamamı** — motor topların uçuşunu kendi içinde
 * simüle ediyor. Sözleşmeye hiçbir şey eklenmedi.
 *
 * İddia ancak böyle sınanır: tek bir girdi biçimine göre yazılmış bir motor
 * "takılabilir" değildir. Ü91'de yılan eklendi ve iddia bir kez daha
 * sınandı — sözleşmeye tek bir isteğe bağlı alan eklendi (`odulIsareti`),
 * motor, oturum akışı ve doğrulama hiç değişmedi.
 *
 * ── Ü208: Kelime kaldırıldı ─────────────────────────────────
 *
 * Ürün sahibinin kararı. Defterden bir satır silmek yetti — motor, oturum
 * akışı, sunucu doğrulaması ve ekranlar hiç değişmedi. Faz 5'in sözünün
 * **ters yönü** de böylece sınanmış oldu: oyun eklemek kadar oyun
 * çıkarmak da dosya işi.
 *
 * ⚠️ Geçmiş turlar duruyor (`play_sessions.game_id = 'kelime'`) ve
 * silinmedi. Adlarını `domain/gecmis.ts` içindeki emekli oyun haritası
 * karşılıyor — orası olmasaydı profil karnesinde ham kimlik görünürdü.
 */

export const OYUNLAR: readonly HerhangiOyun[] = [blok, dusen, sekme, yilan, bicak];

export function oyunBul(id: string): HerhangiOyun | undefined {
  return OYUNLAR.find((o) => o.id === id);
}

/**
 * Günün bonuslu oyunu — tarihe göre döner (E5, ×2 çarpan).
 *
 * S15 hâlâ açık: bunu platform mu kafe mi seçmeli, günlük mü haftalık mı
 * değişmeli? Şimdilik platform seçiyor ve her gün değişiyor; tarihten
 * türediği için sunucu ve istemci aynı cevabı veriyor.
 *
 * ── `havuz` neden var (Ü109) ────────────────────────────────
 *
 * Kafe artık oyun kapatabiliyor. Havuz verilmezse rotasyon bütün kayıt
 * defteri üzerinde döner ve **kafenin kapattığı oyun günün oyunu
 * çıkabilir**: bonuslu oyun oynanamaz, liderlik kimsenin oynayamadığı
 * bir oyunu listeler, günün görevi imkânsız olur.
 *
 * Kafe bağlamı olan her çağrı `domain/oyun-secimi.gununOyunuKafede`
 * kullanıyor; bu imza kafe bilinmeyen yerler (kafe dışı oyuncu, testler)
 * için duruyor.
 *
 * ⚠️ Boş havuz kayıt defterine düşüyor: "oyun yok" diye bir cevap
 * üretmek, çağıran her yeri bir daha düşünmeye zorlar ve hiçbirinde
 * doğru cevabı yoktur.
 */
export function gununOyunu(
  gunIso: string,
  havuz: readonly HerhangiOyun[] = OYUNLAR,
): HerhangiOyun {
  const liste = havuz.length > 0 ? havuz : OYUNLAR;
  const gun = Math.floor(Date.parse(`${gunIso}T00:00:00Z`) / 86_400_000);
  return liste[gun % liste.length];
}

export type { HerhangiOyun } from "./sozlesme";
export { tekrarOyna, EN_FAZLA_GIRDI, TICK_MS, saatTutarliMi } from "./sozlesme";
