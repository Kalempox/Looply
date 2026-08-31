-- 0005 · schema_migrations okuma yetkisi
--
-- Sorun: `schema_migrations` tablosunu göç çalıştırıcısı, 0001'deki
-- ALTER DEFAULT PRIVILEGES satırından ÖNCE oluşturuyor. Varsayılan yetkiler
-- yalnızca sonradan oluşturulan tablolara uygulandığı için bu tablo
-- yetkisiz kaldı ve uygulama rolü onu okuyamadı.
--
-- Yetki bilerek yalnızca SELECT: tabloya yazma işini göç çalıştırıcısı
-- yönetici rolüyle yapar, uygulamanın yazması gerekmez.
--
-- İçeriği yalnızca göç dosyası adları ve özetleri — veri yok.

GRANT SELECT ON schema_migrations TO cafeplay_app;
