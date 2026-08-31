"use client";

import { useSyncExternalStore } from "react";

/**
 * Cihaz kimliği — tarayıcıda üretilir, sunucuda yalnızca hash'i tutulur.
 *
 * İki yerde kullanılıyor:
 *   · Kasa cihazı kaydı — PIN yalnızca kayıtlı cihazda çalışır (G11)
 *   · Yeni cihazdan giriş bildirimi
 *
 * Kimliğin kendisi kişisel veri değil; sunucuya gidince `identifierHash`
 * ile anahtarlı hash'e çevriliyor, yani gökkuşağı tablosuyla çözülemiyor.
 */

const ANAHTAR = "cp_cihaz";

/**
 * Modül düzeyinde önbellek: `useSyncExternalStore` her render'da
 * `getSnapshot` çağırır ve her seferinde yeni değer dönerse sonsuz döngüye
 * girer. Kimlik bir kez üretilip burada tutuluyor.
 */
let onbellek: string | null = null;

function cihazIdAl(): string {
  if (onbellek) return onbellek;
  let id = localStorage.getItem(ANAHTAR);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANAHTAR, id);
  }
  onbellek = id;
  return id;
}

const aboneOl = () => () => {};

/** Sunucuda boş döner; istemcide kalıcı kimlik. */
export function useCihazId(): string {
  return useSyncExternalStore(aboneOl, cihazIdAl, () => "");
}
