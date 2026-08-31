-- 0019 · Kupon hatırlatma bildirimi
--
-- ═══════════════════════════════════════════════════════════
-- 1) Hatırlatma olayları — tekrar göndermemenin garantisi
-- ═══════════════════════════════════════════════════════════
--
-- Bakım köprüsü dakikada bir koşuyor (`domain/bakim.ts`). Hatırlatmanın
-- gönderilip gönderilmediği bir bayrakta değil **defterde** tutuluyor:
-- sorgu `NOT EXISTS (… reminder_active …)` ile bakıyor. Bayrak olsaydı
-- gönderim ile bayrağın yazılması arasında bir aralık kalır ve o aralıkta
-- ikinci koşu aynı SMS'i tekrar gönderirdi.
--
-- Defter zaten append-only ve zaten kuponun hikâyesini taşıyor; hatırlatma
-- da o hikâyenin parçası. "Bu kupona neden iki mesaj gitti" sorusunun
-- cevabı buradan okunacak.

ALTER TABLE coupon_events DROP CONSTRAINT IF EXISTS coupon_events_event_check;
ALTER TABLE coupon_events ADD CONSTRAINT coupon_events_event_check
  CHECK (event IN (
    'issued', 'activated', 'redeemed', 'undone', 'expired', 'rejected',
    'reminder_active', 'reminder_expiring'
  ));

COMMENT ON COLUMN coupon_events.event IS
  'Kuponun hikâyesi. reminder_active / reminder_expiring: hatırlatma SMS''i gönderildi — aynı kupona ikinci kez gönderilmemesinin garantisi bu satır.';

-- ── Giden mesaj defteri ─────────────────────────────────────
--
-- `sms_outbox` gönderilen her mesajın şablonunu tutuyor (metnini değil —
-- docs/08 §7.1). Yeni şablonlar buraya da tanıtılmazsa hatırlatma
-- gönderilemez: defter yazımı kısıtta patlar ve SMS hiç çıkmaz.

ALTER TABLE sms_outbox DROP CONSTRAINT IF EXISTS sms_outbox_template_check;
ALTER TABLE sms_outbox ADD CONSTRAINT sms_outbox_template_check
  CHECK (template IN (
    'otp', 'phone_changed', 'new_device', 'account_deleted', 'incident',
    'coupon_active', 'coupon_expiring'
  ));

-- ═══════════════════════════════════════════════════════════
-- 2) Hatırlatma tercihi — rıza değil, kapatılabilir hizmet ayarı
-- ═══════════════════════════════════════════════════════════
--
-- ── Neden ticari ileti izni sorulmuyor ──────────────────────
--
-- Bu mesaj oyuncunun **kendi kazandığı** kuponun durumunu bildiriyor:
-- kafe adı yok, ürün yok, kampanya yok, link yok. Hizmet ilişkisinin
-- kendisi hakkında bilgi verdiği için G7'nin ticari ileti izni ve İYS
-- kaydı kapsamına girmiyor. Sınıflandırmayı ayakta tutan şey içerik
-- disiplini; `tests/hatirlatma.test.ts` şablon metnini bu yüzden sınıyor.
--
-- ── Ama susturulamaz değil ──────────────────────────────────
--
-- İzin sorulmaması, kapatılamaz demek değil. `service_reminder` satırı
-- kayıtta hizmet gereği açık başlıyor ve `/verilerim` ekranından
-- kapatılabiliyor. `revoked_at` sayesinde "ne zaman kapattı" denetlenebilir
-- kalıyor — bir gün "ben bunu istememiştim" denirse cevap defterde.
--
-- ⚠️ Sınıflandırma ürün sahibinin kararı ve S20'nin (aydınlatma metni
-- avukat incelemesi) kapsamına girmeli. Bu göç hukuki tespit yapmıyor;
-- tespiti taşıyacak yapıyı kuruyor.

ALTER TABLE player_consents DROP CONSTRAINT IF EXISTS player_consents_kind_check;
ALTER TABLE player_consents ADD CONSTRAINT player_consents_kind_check
  CHECK (kind IN (
    'privacy_notice', 'explicit_consent', 'commercial_message', 'service_reminder'
  ));

COMMENT ON COLUMN player_consents.kind IS
  'privacy_notice / explicit_consent / commercial_message: KVKK rızaları. service_reminder: rıza DEĞİL — hizmete ait bildirim tercihi, kayıtta açık başlar, oyuncu kapatabilir.';

-- ── Mevcut oyuncular ────────────────────────────────────────
--
-- Tercih "satır varsa açık" olarak okunuyor; satırın yokluğu kapalı demek.
-- Bu göç öncesinde kaydolmuş oyunculara satır yazılmazsa hatırlatma
-- **hiç kimseye** gitmezdi ve sebebi görünmez olurdu.
--
-- Anonimleştirilmiş hesaplar dışarıda: silinmiş bir hesaba tercih yazmak,
-- silmenin anlamını bozar.
--
-- Kimlik biçimi `lib/ids.ts` ile aynı uzunlukta: `cns_` + 9 hane + 16 hane.
-- `gen_random_bytes` kullanılmıyor: pgcrypto bu veritabanında kurulu değil ve
-- kimlik üretmek için bir eklenti şartı koymak gereksiz.
INSERT INTO player_consents (id, player_id, kind, text_version)
SELECT
  'cns_' || lpad(to_hex(0), 9, '0') || substr(md5(random()::text || p.id), 1, 16),
  p.id,
  'service_reminder',
  'v0-taslak-2026-08'
FROM players p
WHERE p.anonymized_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM player_consents c
     WHERE c.player_id = p.id AND c.kind = 'service_reminder'
  );
