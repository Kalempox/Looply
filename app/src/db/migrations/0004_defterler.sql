-- 0004 · Defterlerin değiştirilemezliği
--
-- E3: finansal ve denetim kayıtları güncellenmez, yeni satır yazılır.
-- Bu, kod disiplinine bırakılamayacak kadar önemli — uygulama rolünden
-- UPDATE yetkisi tamamen alınıyor. Kod hata yapsa bile veritabanı reddeder.
--
-- DELETE yetkisi zaten hiçbir tabloda verilmedi (0001).

REVOKE UPDATE ON audit_log      FROM cafeplay_app;
REVOKE UPDATE ON points_ledger  FROM cafeplay_app;
REVOKE UPDATE ON budget_ledger  FROM cafeplay_app;

-- Doğrulama kodu kaydı: doğrulanınca silinmesi gerekir (docs/08 §6, 3 dakika).
-- Bu tek istisna için DELETE veriliyor.
GRANT DELETE ON otp_challenges TO cafeplay_app;

-- Hız sınırı sayaçları da temizlenebilir olmalı.
GRANT DELETE ON rate_limits TO cafeplay_app;

COMMENT ON TABLE audit_log IS
  'Append-only — uygulama rolünde UPDATE ve DELETE yetkisi YOKTUR (0004).';
COMMENT ON TABLE points_ledger IS
  'Append-only — bakiye = SUM(delta). UPDATE yetkisi YOKTUR (0004).';
COMMENT ON TABLE budget_ledger IS
  'Append-only — bütçe durumu hareketlerden türer. UPDATE yetkisi YOKTUR (0004).';
