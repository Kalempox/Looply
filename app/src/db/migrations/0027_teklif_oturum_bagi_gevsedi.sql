-- ═══════════════════════════════════════════════════════════
-- Ü100 düzeltmesi · Teklif, oyun oturumunu KİLİTLEMESİN
-- ═══════════════════════════════════════════════════════════
--
-- ── Ne oldu ─────────────────────────────────────────────────
--
-- `campaign_offers.play_session_id` sıkı bir yabancı anahtardı ve bu,
-- `play_sessions` satırının silinmesini engelledi:
--
--   update or delete on table "play_sessions" violates foreign key
--   constraint "campaign_offers_play_session_id_fkey"
--
-- Testlerin temizliği bu yüzden kilitlendi; canlıda da oyuncu verisi
-- silinirken (S20 / anonimleştirme) aynı duvara çarpardı.
--
-- ── Neden SET NULL, neden CASCADE değil ─────────────────────
--
-- ⚠️ CASCADE olsaydı oturum silinince **teklif kaydı da silinirdi** ve
-- kafenin huni geçmişi, oyuncu verisi temizlendikçe geriye dönük
-- değişirdi: "geçen ay 40 teklif gösterdim" diyen rapor bir gün 31 der.
-- Ticari ölçüm, kişisel verinin silinmesinden etkilenmemeli.
--
-- SET NULL doğru olan: bağ kişisel veriye ait, sayım kafeye. Bağ
-- kopunca teklif satırı kalıyor, yalnızca "hangi oyundan sonra
-- gösterildi" bilgisi düşüyor — o bilgi zaten tek bir işe yarıyor:
-- aynı oturumda ikinci gösterimi engellemek. Oturum yoksa engellenecek
-- bir tekrar da yok.

ALTER TABLE campaign_offers
  DROP CONSTRAINT campaign_offers_play_session_id_fkey;

ALTER TABLE campaign_offers
  ADD CONSTRAINT campaign_offers_play_session_id_fkey
  FOREIGN KEY (play_session_id) REFERENCES play_sessions(id) ON DELETE SET NULL;

COMMENT ON COLUMN campaign_offers.play_session_id IS
  'Ü100: aynı oturumda ikinci gösterimi engelliyor. Oturum silinince NULL olur — huni sayısı geriye dönük değişmesin.';
