-- Ü249 · Temizlik işlerine DELETE yetkisi
--
-- ── 🔴 Bulunuş: kayıtlı bir iş sessizce patlıyordu ─────────
--
-- Madde 37 için giden kutusu temizliği yazılırken testi düştü:
-- *"permission denied for table sms_outbox"*. Sorun testte değil
-- üründe çıktı — ve peşinden daha kötüsü geldi.
--
-- `qr_temizlik` **zaten kayıt defterinde, zaten koşuyor** ve her
-- koşuda `permission denied for table qr_tokens` alıyor. Ölçüldü:
--
--     qr_temizlik          🔴 permission denied for table qr_tokens
--     otp_temizlik         ✅ koştu
--     hiz_siniri_temizlik  ✅ koştu
--
-- Hata `bakim.ts:60`ta yakalanıp `log.warn`a yazılıyor ve sonraki iş
-- koşmaya devam ediyor — yalıtım doğru çalışıyor, o yüzden kimse fark
-- etmedi. Karekod tarama kayıtları *"1 saat"* diye beyan edilmişken
-- (`docs/24` §6) **süresiz birikiyordu**.
--
-- ── Neden oldu ─────────────────────────────────────────────
--
-- Varsayılan yetki (göç 0001) `SELECT, INSERT, UPDATE` veriyor; DELETE
-- kasten yok ve tablo tablo açılıyor (0004: `otp_challenges`,
-- `rate_limits`). Bu iyi bir tasarım — silme yetkisi her tabloya
-- dağıtılmıyor. Kaçan şey, yeni temizlik işi yazanın aynı satırı
-- eklemesi gerektiğiydi.
--
-- ⚠️ Ü113 "yazıldı ama bağlanmadı" sınıfını kapatmıştı. Bu onun bir
-- adım ötesi: **yazıldı, bağlandı, sessizce patlıyor.** Kayıt defteri
-- testi işin çağrıldığını sınıyordu, çalıştığını değil.
-- `tests/giden-kutusu-saklama.test.ts` artık her temizlik işini
-- gerçekten koşturuyor.

-- Karekod tarama kayıtları — `domain/qr.temizle`, saatlik.
GRANT DELETE ON qr_tokens TO cafeplay_app;

-- Giden kutuları — madde 37, `domain/saklama.GIDEN_KUTUSU_GUN`.
GRANT DELETE ON sms_outbox TO cafeplay_app;
GRANT DELETE ON email_outbox TO cafeplay_app;
