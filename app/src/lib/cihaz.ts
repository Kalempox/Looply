"use client";

import { useSyncExternalStore } from "react";

/**
 * Cihaz kimliği — tarayıcıda üretilir, sunucuda yalnızca hash'i tutulur.
 *
 * Oturumun kaydında "hangi cihazdan açıldı" için kullanılıyor (yeni
 * cihazdan giriş bildirimi). Ü285'e kadar kasa PIN'i yalnızca kayıtlı
 * cihazda çalışıyordu (G11); o kapı kalktı, kasa artık konuma bakıyor.
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
