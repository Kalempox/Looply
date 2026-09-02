import { Pool } from "pg";
import { env } from "@/lib/env";

/**
 * İki ayrı bağlantı havuzu — ikisinin farkı bir güvenlik kontrolü.
 *
 *   adminPool → tabloların sahibi. YALNIZCA göç ve tohum verisi.
 *   appPool   → kısıtlı rol. Satır düzeyi güvenliği (RLS) bu rolde çalışır.
 *
 * Uygulama çalışma zamanında adminPool'u kullanırsa RLS devre dışı kalır
 * ve kiracı izolasyonunun ikinci katmanı yok olur. env.ts, canlı ortamda
 * ikisinin aynı olmasını engelliyor.
 */

declare global {
  var __looplyPools: { admin?: Pool; app?: Pool } | undefined;
}

const pools = (globalThis.__looplyPools ??= {});

/** Göç ve tohum verisi için. Uygulama isteklerinde KULLANILMAZ. */
export function adminPool(): Pool {
  return (pools.admin ??= new Pool({
    connectionString: env().DATABASE_URL,
    max: 4,
    application_name: "looply-migrate",
  }));
}

/** Çalışma zamanı. Her sorgu bir bağlam içinden geçer — bkz. context.ts */
export function appPool(): Pool {
  return (pools.app ??= new Pool({
    connectionString: env().APP_DATABASE_URL,
    max: 10,
    application_name: "looply-app",
    statement_timeout: 10_000,
  }));
}

export async function closePools(): Promise<void> {
  await Promise.all([pools.admin?.end(), pools.app?.end()]);
  pools.admin = undefined;
  pools.app = undefined;
}
