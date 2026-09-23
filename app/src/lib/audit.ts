import type { Db } from "@/db/context";
import { redact } from "./log";

/**
 * Denetim izi — docs/08 §7.3.
 *
 * Parayla veya kişisel veriyle ilgili her işlem buraya yazılır ve
 * silinemez (0004 göçü: uygulama rolünde UPDATE/DELETE yetkisi yok).
 *
 * `detail` alanı kişisel veri İÇERMEZ — yazmadan önce redact()'ten geçer,
 * yani yasaklı bir alan geliştirme ortamında hata fırlatır.
 */

export type Islem =
  // Para
  | "coupon.issue"
  | "coupon.redeem"
  | "coupon.undo"
  | "budget.create"
  | "budget.update"
  | "campaign.create"
  | "campaign.publish"
  | "campaign.stop"
  | "happyhour.open"
  | "happyhour.close"
  | "category.create"
  | "category.update"
  | "product.create"
  | "product.update"
  // Ü94: ad düzeltmesi ayrı bir işlem. `update` içine karışsaydı "kim ne
  // zaman adı değiştirdi" sorusu kayıtta aranamazdı — oysa ad değişikliği
  // dolaşımdaki kuponların gösterdiği metni de değiştiriyor.
  | "product.rename"
  | "reward.create"
  | "reward.update"
  | "reward.rename"
  // Kafenin ödül ekonomisini değiştiren ayarlar (erteleme eşiği gibi).
  // Para başlığı altında: "kupon neden bugün açılmadı" sorusunun cevabı burada.
  | "cafe.config_update"
  | "table.create"
  | "table.enable"
  | "table.disable"
  /* Ü266: basılı kodun başka bir masaya taşınması. `table.*` ailesinin
     içinde ama ayrı bir işlem — basılı bir kâğıdın hangi kafeye
     gittiğini değiştirmek, masayı açıp kapatmakla aynı ağırlıkta
     değil. "Kim, hangi kodu, nereden nereye, neden" sorusunun cevabı
     kayıtta tek satırda durmalı. */
  | "table.print_code_move"
  // Ü109: kafenin oyun tercihi. Para başlığı altında çünkü kapalı oyun
  // dağıtımı değiştiriyor — "bu hafta neden daha az kupon çıktı"
  // sorusunun cevabı burada olabilir.
  | "game.enable"
  | "game.disable"
  // Ü137: butik çarkı. Koşul değişikliği para dağıtımını değiştiriyor —
  // "bu hafta neden bu kadar çok kupon çıktı" sorusunun cevabı burada.
  // Hak verme ayrı bir işlem çünkü farklı el: koşulu yönetici koyuyor,
  // hakkı kasiyer veriyor.
  | "cark.kosul_ekle"
  | "cark.kosul_ac"
  | "cark.kosul_kapat"
  | "cark.hak_ver"
  // Mahremiyet
  | "pii.view"
  | "report.view"
  | "report.export"
  // Yetki
  | "cafe.location"
  | "cafe.approve"
  | "cafe.reject"
  // Ü125: sahibin panelden açtığı şube başvurusu. `cafe.approve`ten ayrı
  // bir işlem çünkü farklı el: bunu işletme sahibi yapıyor, onayı platform.
  // Tek işleme sıkıştırılsaydı "şubeyi kim istedi, kim açtı" ayrımı kayıtta
  // kaybolurdu — ikisi arasındaki sınır G5'in kendisi.
  | "cafe.branch_apply"
  | "staff.create"
  | "staff.disable"
  | "staff.pin_reset"
  | "session.revoke"
  // Acil durdurma (G18) — dördü de geri alınabilir, hepsi kayıtlı
  | "emergency.toggle"
  | "emergency.cafe_suspend"
  | "emergency.cafe_resume"
  | "emergency.sessions_revoke"
  // Davet ve fraud (Faz 9, Ü20) — kapı şartı: risk skoru ve ret gerekçesi
  // denetim izine düşmeli. Ödüllenen davet de kayıtlı: ödül vermek de bir
  // karardır ve sonradan sorulabilmelidir.
  | "referral.rewarded"
  | "referral.rejected"
  // Oyuncu hesabı
  | "player.password_set"
  // Hukuki
  | "consent.grant"
  | "consent.revoke";

export type AuditGirdi = {
  actorType: "player" | "staff" | "platform" | "system";
  actorId?: string;
  cafeId?: string;
  action: Islem;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
  ipHash?: Buffer;
  uaHash?: Buffer;
};

/**
 * Denetim kaydını, işlemi yapan sorguyla **aynı transaction içinde** yazar.
 * Ayrı yazılsaydı, işlem başarılı olup kaydın düşmediği durumlar oluşurdu.
 */
export async function audit(db: Db, girdi: AuditGirdi): Promise<void> {
  await db.query(
    `INSERT INTO audit_log
       (actor_type, actor_id, cafe_id, action, target_type, target_id, detail, ip_hash, ua_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      girdi.actorType,
      girdi.actorId ?? null,
      girdi.cafeId ?? null,
      girdi.action,
      girdi.targetType ?? null,
      girdi.targetId ?? null,
      girdi.detail ? JSON.stringify(redact(girdi.detail)) : null,
      girdi.ipHash ?? null,
      girdi.uaHash ?? null,
    ],
  );
}
