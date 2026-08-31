import type { HerhangiOyun } from "./sozlesme";
import { blok } from "./blok";
import { dusen } from "./dusen";
import { kelime } from "./kelime";

/**
 * Oyun kayıt defteri.
 *
 * Faz 5'in dördüncü maddesi: *"yeni oyun eklemek kod değişikliği değil,
 * dosya eklemek olsun."* Uygulanışı bu dosya — yeni oyun eklemek, bir modül
 * yazıp aşağıdaki diziye bir satır koymaktır. Motor, oturum akışı, sunucu
 * doğrulaması ve ekranlar değişmez.
 *
 * Üç oyun kasıtlı olarak **farklı girdi biçimleri** üretiyor (Ü21):
 *   blok   → (teklif, satır, sütun)  · zaman yok
 *   kelime → gönderilen kelime       · zaman yok
 *   düşen  → (tick, hareket)         · zaman var
 *
 * İddia ancak böyle sınanır: tek bir girdi biçimine göre yazılmış bir motor
 * "takılabilir" değildir.
 */

export const OYUNLAR: readonly HerhangiOyun[] = [blok, kelime, dusen];

export function oyunBul(id: string): HerhangiOyun | undefined {
  return OYUNLAR.find((o) => o.id === id);
}

/**
 * Günün bonuslu oyunu — tarihe göre döner (E5, ×2 çarpan).
 *
 * S15 hâlâ açık: bunu platform mu kafe mi seçmeli, günlük mü haftalık mı
 * değişmeli? Şimdilik platform seçiyor ve her gün değişiyor; tarihten
 * türediği için sunucu ve istemci aynı cevabı veriyor.
 */
export function gununOyunu(gunIso: string): HerhangiOyun {
  const gun = Math.floor(Date.parse(`${gunIso}T00:00:00Z`) / 86_400_000);
  return OYUNLAR[gun % OYUNLAR.length];
}

export type { HerhangiOyun } from "./sozlesme";
export { tekrarOyna, EN_FAZLA_GIRDI } from "./sozlesme";
