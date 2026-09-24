-- 0054 · Masa oturumu gün boyu — Ü279
--
-- Ürün sahibi: "masa oturumun doldu ne anlama geliyor, oturum dolmamalı,
-- orada konum hep takip edilmeli, insanları tekrar karekod okutmaya
-- zorlamamalıyız."
--
-- Oturum artık okutmadan 3 saat sonra değil, iş günü sonunda kapanıyor
-- (`masa.oturumBitisi`). Kural yeni açılan oturumlarda uygulamada; bu göç
-- BUGÜN açılmış ve eski 3 saat kuralıyla dolmuş (ya da dolacak) oturumları
-- aynı kurala çekiyor. Yoksa bugün okutmuş oyuncu, kararın yürürlüğe
-- girdiği gün karekodu bir kez daha okutmak zorunda kalırdı — tam da
-- ürün sahibinin yaşadığı buydu (hesap 02:37'de okuttu, 05:37'de doldu).
--
-- ⚠️ Kazanım yine TAZE konuma bağlı (`masa.KONUM_TAZE_DAKIKA`): uzatılan
-- oturum yalnızca "hangi kafedesin" bağlamını geri getiriyor, ödül değil.
-- ⚠️ Canlı veritabanı boş açılacak; orada hiçbir satıra dokunmaz.

-- `table_sessions` FORCE RLS altında — göç rolünün süper kullanıcı
-- olmadığı ortamda güncelleme sessizce sıfır satıra düşmesin (0053 ile aynı).
SELECT set_config('app.bypass', 'on', true);

UPDATE table_sessions
   SET expires_at = ((started_at AT TIME ZONE 'Europe/Istanbul')::date + 1)::timestamp
                    AT TIME ZONE 'Europe/Istanbul'
 WHERE expires_at < ((started_at AT TIME ZONE 'Europe/Istanbul')::date + 1)::timestamp
                    AT TIME ZONE 'Europe/Istanbul'
   AND ((started_at AT TIME ZONE 'Europe/Istanbul')::date + 1)::timestamp
                    AT TIME ZONE 'Europe/Istanbul' > now();
