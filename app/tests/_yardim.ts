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
