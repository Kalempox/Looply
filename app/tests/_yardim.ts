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
