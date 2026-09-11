import type { HerhangiOyun } from "./sozlesme";
import { blok } from "./blok";
import { dusen } from "./dusen";
import { kelime } from "./kelime";
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
 *   kelime → (tick, kelime)          · zaman var
 *   düşen  → (tick, hareket)         · zaman var
 *   yılan  → (tick, yön)             · zaman var, **ödül işareti var**
 *
 * İddia ancak böyle sınanır: tek bir girdi biçimine göre yazılmış bir motor
 * "takılabilir" değildir. Ü91'de yılan eklendi ve iddia bir kez daha
 * sınandı — sözleşmeye tek bir isteğe bağlı alan eklendi (`odulIsareti`),
 * motor, oturum akışı ve doğrulama hiç değişmedi.
 */

export const OYUNLAR: readonly HerhangiOyun[] = [blok, kelime, dusen, yilan];

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
