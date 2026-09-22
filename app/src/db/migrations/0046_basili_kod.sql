-- Ü247 · Basılı karekod kodu artık kafenin adını taşıyor
--
-- ── Neden ──────────────────────────────────────────────────
--
-- Basılı kod bugüne kadar `qr_secret`in ilk 8 baytının hex hâliydi:
-- `ec3ebc4b9c1d3931`. Çalışıyor ama iki yerde sorun çıkarıyor:
--
--   · Karekodun altına insan için basılan kod okunmuyor, telefonla
--     elle girilemiyor, telefonda söylenemiyor.
--   · Stok kod modelinde (önce bas, sonra kafeye bağla) hangi etiketin
--     kime verildiği yalnızca ayrı bir listede duruyor. Liste
--     kaybolursa elde anlamsız hex diziler kalıyor.
--
-- Ürün sahibinin istediği biçim: `kafe-a-7f3k9x2m` — **ad + rastgele
-- ek**.
--
-- ── 🔴 Rastgele ek KALDIRILAMAZ ────────────────────────────
--
-- Salt `kafe-a` yazmak ilk bakışta daha temiz görünüyor ve reddedildi.
-- Basılı kod bu sistemde bir bağlantı değil **kanıt**: `proof_mask`te
-- K1 = "karekod okutuldu" ve bütün AL-2 modeli kodun tahmin
-- edilemezliğine dayanıyor (`domain/qr.ts`). Tahmin edilebilir bir
-- adres, dünyanın herhangi bir yerindeki birine "Kafe A'dayım" bileti
-- verirdi.
--
-- Ek 8 karakter ve 32 harfli bir alfabeden geliyor: 40 bit. Puan ve XP
-- zaten konum doğrulaması (K2) istiyor, yani ek olmadan da ödül
-- sızmazdı; sızacak olan kafenin tarama defteri ve kod yenileme
-- valfiydi.
--
-- ── 🔴 Uzunluk sınırı KARENİN GEOMETRİSİNDEN geliyor ───────
--
-- 29 karakter keyfî değil. Adres `https://looplybusiness.com/m/` ile
-- başlıyor (29 karakter) ve karekodun 6. sürümü `H` hata düzeltmede
-- 58 bayt tutuyor. 58 − 29 = 29.
--
-- 7. sürümde hizalama deseni sembolün **tam merkezine** geliyor ve
-- ortadaki Loopy rozeti onu kapatıyor. O desen hata düzeltmeyle
-- kurtarılmıyor — kod hiç okunmaz hâle gelir ve bu, basıldıktan
-- sonra anlaşılır. `tests/karekod.test.ts` sınırı ayrıca bekçiliyor.
--
-- ── Eski kodlar ÖLMÜYOR ────────────────────────────────────
--
-- Kolon isteğe bağlı. Dolu değilse `masaCoz` eski hex yoluna düşüyor,
-- yani daha önce basılmış hiçbir karekod geçersizleşmiyor. İki biçim
-- birbirine karışamıyor: yeni kodda her zaman tire var, hexte hiç yok.

ALTER TABLE cafe_tables ADD COLUMN print_code text;

-- Aynı kod iki masaya verilemez: `masaCoz` tek satır bekliyor ve iki
-- satır dönseydi hangi kafeye gidileceği rastgele olurdu.
CREATE UNIQUE INDEX cafe_tables_print_code_key ON cafe_tables (print_code);

-- Biçim kısıtı katmanlı savunmanın veritabanı katmanı; asıl üretim ve
-- doğrulama `domain/qr.ts`te. En az 3, en fazla 29 karakter.
-- En az bir tire ZORUNLU: eski hex biçiminde hiç tire yok, yani iki
-- biçim birbirine asla karışamıyor.
ALTER TABLE cafe_tables ADD CONSTRAINT cafe_tables_print_code_bicim
  CHECK (
    print_code IS NULL
    OR (print_code ~ '^[a-z0-9]+(-[a-z0-9]+)+$' AND length(print_code) BETWEEN 3 AND 29)
  );

COMMENT ON COLUMN cafe_tables.print_code IS
  'Basılı karekodun taşıdığı kod: ad + rastgele ek (kafe-a-7f3k9x2m). Boşsa qr_secret hexine düşülür. En fazla 29 karakter — karekodun 6. sürümünü aşmamalı.';
