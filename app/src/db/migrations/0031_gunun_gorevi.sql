-- ═══════════════════════════════════════════════════════════
-- Ü106 · Günün görevi (daily challenge)
-- ═══════════════════════════════════════════════════════════
--
-- Bugüne kadar "günün challenge'ı" diye anılan şey yalnızca **günün
-- oyunu** idi: sıradaki oyun ×2 puan veriyordu (`gununOyunu`). Bu bir
-- çarpan, bir görev değil — oyuncuya *"bugün şunu yap"* diyen bir şey
-- yoktu ve dolayısıyla tamamlanacak, kaçırılacak bir şey de yoktu.
--
-- Artık her günün bir hedefi var: belirli bir skora ulaşmak, birden çok
-- tur oynamak ya da birden çok farklı oyun denemek.
--
-- ── ⚠️ Ödül neden PUAN değil, XP ────────────────────────────
--
-- Günlük puan tavanı 900 (E4). Bonuslu oyun tek başına 600 yazıyor
-- (300 × 2), skor eşiği 300'e kadar ekliyor — yani **iyi oynayan oyuncu
-- tavanı zaten tek oyunda dolduruyor.** Görev de puan yazsaydı, tavana
-- takılır ve yalnızca **az oynayana** ödeme yapardı: görevi tamamlamaya
-- en yakın kişiye hiçbir şey vermeyen bir görev.
--
-- XP tavansız (docs/06 §2.1) ve hiçbir bütçeye dokunmuyor. Kupon ise hiç
-- düşünülmedi: seri (Ü54) için yazılan gerekçe burada da geçerli —
-- kafenin günlük bütçesine üçüncü bir musluk açmak E10'un
-- öngörülebilirliğini bozardı.

-- ── Yeni XP kaynağı ────────────────────────────────────────
--
-- 0009'un kendi yorumu bu göçü öngörüyordu: *"yeni bir harcama yolu
-- açmak, bu CHECK'i değiştiren bir göç yazmayı gerektirir — yani
-- sessizce olamaz."* Burada açılan bir harcama yolu değil, yeni bir
-- kazanç kaynağı; yine de aynı kapıdan geçiyor.
--
-- Görev XP'si `GAME` olarak yazılabilirdi ve göç gerekmezdi. Yazılmadı:
-- defterde "bu XP neden yazıldı" sorusunun cevabı **satırın kendisinde**
-- durmalı (Ü48'in skor eşiğini ayrı satıra yazma gerekçesiyle aynı).

ALTER TABLE xp_ledger DROP CONSTRAINT xp_ledger_source_type_check;

ALTER TABLE xp_ledger ADD CONSTRAINT xp_ledger_source_type_check
  CHECK (source_type IN ('GAME','BADGE','REFERRAL','ADJUSTMENT','CHALLENGE'));

-- Ü3 şemada da korunuyor: görev kafede oynayarak tamamlanıyor, dolayısıyla
-- görev XP'si de konum doğrulanmış (K2) oturum istiyor. `GAME` ile aynı
-- kapı — dışarıda bırakılsaydı kafe dışında oynanan turlarla görev
-- tamamlanır ve Ü3 tek bir satırdan sızardı.
ALTER TABLE xp_ledger DROP CONSTRAINT xp_oyun_kafede;

ALTER TABLE xp_ledger ADD CONSTRAINT xp_oyun_kafede
  CHECK (source_type NOT IN ('GAME','CHALLENGE') OR proof_level >= 2);

COMMENT ON COLUMN xp_ledger.source_type IS
  'Ü106: CHALLENGE eklendi — günün görevi. GAME ile aynı kanıt kapısından geçiyor (xp_oyun_kafede).';

-- ── ⚠️ Günde bir kez — şemadan ─────────────────────────────
--
-- Görev bonusu günde bir kez yazılmalı. Kod bunu aynı işlem içinde
-- kontrol ediyor (`bugunYazildiMi`) ama tek başına yeterli değil: aynı
-- anda biten iki oyun iki ayrı işlemde çalışır, ikisi de "yazılmamış"
-- görür ve bonus iki kez düşer. Çift gönderim bunu gerçek bir olasılık
-- yapıyor.
--
-- Tekil indeks bunu **imkânsız** kılıyor; kod kontrolü ise hâlâ değerli,
-- çünkü kullanıcıya hata değil "zaten aldın" diyebilmeyi sağlıyor.

CREATE UNIQUE INDEX xp_ledger_challenge_gun_idx
  ON xp_ledger (cafe_id, player_id, business_date)
  WHERE source_type = 'CHALLENGE';

-- ── Aynı açık, günlük seride de vardı ──────────────────────
--
-- Ü54'ün seri bonusu tam olarak aynı desende yazılıyor ve onun da
-- yalnızca kod kontrolü vardı. Görev için indeks eklerken seriyi
-- korumasız bırakmanın sebebi yok — aynı satır, aynı yarış.
--
-- Mevcut veride çift satır olmadığı doğrulandı (0 grup).

CREATE UNIQUE INDEX points_ledger_seri_gun_idx
  ON points_ledger (cafe_id, player_id, business_date)
  WHERE reason = 'seri';
