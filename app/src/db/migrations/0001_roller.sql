-- 0001 · Uygulama rolü
--
-- Uygulama, tabloların SAHİBİ olan rolle bağlanmaz. Sahip rol, satır düzeyi
-- güvenliğini (RLS) varsayılan olarak atlar — o yüzden ayrı ve kısıtlı bir rol
-- kullanıyoruz. Göçler yönetici rolüyle, uygulama `cafeplay_app` ile çalışır.
--
-- Canlı ortamda parola bu dosyada değil, sunucunun sır kasasında durur;
-- buradaki DO bloğu yalnızca rol yoksa oluşturur, parolayı ezmez.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cafeplay_app') THEN
    -- Geliştirme parolası. Canlıda ALTER ROLE ile değiştirilir.
    CREATE ROLE cafeplay_app LOGIN PASSWORD 'gelistirme_uygulama';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE cafeplay TO cafeplay_app;
GRANT USAGE ON SCHEMA public TO cafeplay_app;

-- Bundan sonra oluşturulacak tablolarda varsayılan yetkiler.
-- Silme yetkisi bilerek verilmiyor: hiçbir kayıt uygulama tarafından
-- silinmez, durum değişikliğiyle işaretlenir.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO cafeplay_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO cafeplay_app;
