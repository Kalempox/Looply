import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Gün sınırı İSTANBUL gece yarısı — Ü286 sınıf testi.
 *
 * Veritabanı oturumu UTC. `redeemed_at >= $1::date` günü 03:00'te
 * başlatıyordu: gece 00:00–03:00 arasında kasada onaylanan kupon bir önceki
 * günün raporuna yazılıyordu. Ürün sahibi 23:36'da onayladığı kuponu
 * gece yarısından sonra panelde arayınca bu sınıfa rastlandı.
 *
 * Bir zaman damgası kolonu (`…_at`) çıplak bir `$N::date` ile
 * karşılaştırılmamalı; doğru yazılış
 * `($N::date::timestamp AT TIME ZONE 'Europe/Istanbul')`.
 */

const DESEN = /\b\w+_at\s*(?:>=|<=|>|<)\s*\$\d+::date\b(?!::timestamp)/g;

function kaynaklar(dizin: string): string[] {
  return readdirSync(dizin, { withFileTypes: true }).flatMap((g) => {
    const yol = join(dizin, g.name);
    if (g.isDirectory()) return kaynaklar(yol);
    return /\.(ts|tsx)$/.test(g.name) ? [yol] : [];
  });
}

test("🔴 zaman damgası UTC gününe göre bölünmüyor", () => {
  const bulunan = kaynaklar("src").flatMap((dosya) =>
    [...readFileSync(dosya, "utf8").matchAll(DESEN)].map((m) => `${dosya}: ${m[0]}`),
  );
  assert.deepEqual(bulunan, []);
});

test("desen hatalı yazılışı yakalıyor, doğrusunu geçiriyor", () => {
  assert.equal("AND redeemed_at >= $1::date".match(DESEN)?.length, 1);
  assert.equal("AND k.issued_at < $2::date".match(DESEN)?.length, 1);
  assert.equal(
    "redeemed_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul')".match(DESEN),
    null,
  );
  assert.equal("business_date >= $1::date".match(DESEN), null);
});
