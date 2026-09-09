-- ═══════════════════════════════════════════════════════════
-- Ü100 düzeltmesi · Oyuncu silinince teklifi de silinsin
-- ═══════════════════════════════════════════════════════════
--
-- `campaign_offers.player_id` sıkı bir yabancı anahtardı ve oyuncu
-- satırının silinmesini engelliyordu.
--
-- ── Neden CASCADE, oturum bağının tersine ───────────────────
--
-- Bir önceki göçte `play_session_id` için SET NULL seçtik: bağ kişisel
-- veriye ait, sayım kafeye; oturum silinse de huni sayısı bozulmamalı.
--
-- ⚠️ Burada tam tersi doğru. `player_id` **kişinin kendisi**. Bir insan
-- gerçekten silindiğinde ona ait teklif satırının kalması, silinmiş bir
-- kişiye işaret eden kayıt bırakmak demek — mahremiyet açısından kabul
-- edilemez. Sayımın bir miktar geriye dönük değişmesi, bu bedelin yanında
-- küçük kalıyor.
--
-- Not: canlıda olağan yol silme değil **anonimleştirme** (`anonymized_at`);
-- satır kalıyor, kimlik gidiyor. Bu kural gerçek silme içindir.

ALTER TABLE campaign_offers
  DROP CONSTRAINT campaign_offers_player_id_fkey;

ALTER TABLE campaign_offers
  ADD CONSTRAINT campaign_offers_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
