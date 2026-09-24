import { randomUUID } from "node:crypto";
import { adminPool } from "@/db/pool";

/**
 * Test temizliği — YÖNETİCİ rolüyle.
 *
 * Uygulama rolünün bazı tablolarda silme yetkisi bilerek yok:
 * `sms_outbox` giden mesaj defteri, `audit_log` denetim izi, ledger'lar
 * append-only. Testin temizlik yapabilmesi için o yetkileri gevşetmek,
 * sınadığımız güvenceyi bozmak olurdu.
 *
 * Bu yüzden temizlik ayrı bir yoldan, yönetici rolüyle yapılıyor —
 * tıpkı gerçek hayatta bakım işlerinin öyle yapılacağı gibi.
 */
export async function yoneticiSorgu(sql: string, params: unknown[] = []): Promise<void> {
  await adminPool().query(sql, params as never[]);
}

/**
 * Test kurgusu için benzersiz e-posta — Ü168.
 *
 * `kaydet()` Ü168'den beri e-posta istiyor ve adres **tekil**: aynı
 * adresle ikinci hesap açılmıyor (`players_email_index_uq`). Sabit bir
 * adres yazılsaydı aynı dosyadaki ikinci oyuncu kaydı düşerdi ve
 * arıza "bu testin kendi kurgusu bozuk" diye değil, "kayıt bozuldu"
 * diye okunurdu.
 *
 * `randomUUID` seçildi, sayaç değil: sayaç dosya başına ayrı tutulur
 * ve iki dosya aynı anda koşunca (ya da yığın ikinci kez koşunca)
 * çakışır. Testler aynı veritabanını paylaşıyor.
 *
 * ⚠️ `.test` alan adı kasıtlı: RFC 2606 ile ayrılmış, dünyada
 * çözülmüyor. Kaza eseri gerçek bir adrese posta gitmesi mümkün değil.
 */
export function benzersizEposta(): string {
  return `oyuncu-${randomUUID()}@ornek.test`;
}

/**
 * Kafeye bağlı tablolar — SİLME SIRASIYLA (önce çocuk, sonra ebeveyn).
 *
 * Hiçbir yabancı anahtar `ON DELETE CASCADE` değil (ölçüldü, 30 tablo):
 * kafeyi tek satırla silmek mümkün değil ve bu bilerek böyle — canlıda
 * bir kafe silinirse geçmişi sessizce gitmemeli. Sıra kısıtların
 * kendisinden çıkarıldı: `coupons` → `rewards` → `products` →
 * `product_categories`; `play_sessions` → `table_sessions` →
 * `cafe_tables`; `cafe_devices` → `staff` …
 */
const KAFE_TABLOLARI = [
  "campaign_offers",
  "coupon_events",
  "cark_haklari",
  "coupons",
  "budget_ledger",
  "play_sessions",
  "qr_tokens",
  "table_sessions",
  "happy_hours",
  "happy_hour_plans",
  "percentage_campaigns",
  "rewards",
  "cark_kosullari",
  "products",
  "product_categories",
  "cafe_devices",
  "cafe_game_settings",
  "points_ledger",
  "xp_ledger",
  "player_badges",
  "player_aliases",
  "fraud_flags",
  "sessions",
  "referrals",
  "cafe_documents",
  "cafe_config",
  "budget_periods",
  "cafe_tables",
  "staff",
  "audit_log",
] as const;

/**
 * Testin açtığı kafeleri ve onlara bağlı HER satırı siler — Ü271.
 *
 * 🔴 Neden var: `cark`, `challenge` ve `liderlik` testleri her koşuda
 * yeni, **onaylı** kafeler açıp hiç silmiyordu. Geliştirme veritabanında
 * 4.550'yi aştılar ve platform panelinin "hangi kafeye gitsin" listesini
 * kullanılmaz yaptılar: ürün sahibi Kafe A'yı 4.561 seçenek arasında
 * 2.353. sırada bulamadı.
 *
 * Tek işlemde: bir tablo takılırsa hiçbir şey silinmiyor. `prova` açıkken
 * her şey yapılıyor, sayılar dönüyor ve işlem GERİ ALINIYOR.
 */
export async function testKafeleriniSil(
  idler: string[],
  opts: { prova?: boolean } = {},
): Promise<Record<string, number>> {
  const sayac: Record<string, number> = {};
  if (idler.length === 0) return sayac;

  const client = await adminPool().connect();
  try {
    await client.query("BEGIN");
    const sil = async (ad: string, sql: string) => {
      const r = await client.query(sql, [idler]);
      if (r.rowCount) sayac[ad] = (sayac[ad] ?? 0) + r.rowCount;
    };
    await sil(
      "referral_events",
      `DELETE FROM referral_events
        WHERE referral_id IN (SELECT id FROM referrals WHERE cafe_id = ANY($1))`,
    );
    for (const tablo of KAFE_TABLOLARI) {
      await sil(tablo, `DELETE FROM ${tablo} WHERE cafe_id = ANY($1)`);
    }
    await sil("cafes", `DELETE FROM cafes WHERE id = ANY($1)`);
    await client.query(opts.prova ? "ROLLBACK" : "COMMIT");
    return sayac;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
