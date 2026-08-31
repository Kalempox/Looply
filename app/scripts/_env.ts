import { config } from "dotenv";

/**
 * Betikler için ortam yükleyici.
 *
 * Next.js .env.local'i kendisi yükler; komut satırından çalışan betikler
 * (göç, tohum, testler) yüklemez. Bu dosya her betiğin ilk satırında
 * import edilir.
 */
config({ path: ".env.local", quiet: true });
