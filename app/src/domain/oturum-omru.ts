/**
 * Oturum ömrü — rol ve "beni hatırla" tercihine göre.
 *
 * Ayrı bir dosyada durmasının tek sebebi sınanabilirlik: `session.ts` çerez
 * yazdığı için `next/headers`'a bağlı ve istek bağlamı dışında çağrılamıyor.
 * Oysa "işaretlenmezse 12 saat" bir güvenlik kararı (Ü36) ve çalıştırılabilir
 * bir testi olmalı — yorumda kalan kural, kural değildir.
 */

export type Rol = "oyuncu" | "kasiyer" | "kafe_yoneticisi" | "platform_destek" | "platform_admin";

/** docs/08 §4.4 */
export const OMUR_SN: Record<Rol, number> = {
  oyuncu: 90 * 86_400, // 90 gün — telefon kişinin kendisinde
  kafe_yoneticisi: 12 * 3600,
  kasiyer: 8 * 3600, // vardiya boyu; üstüne ekran kilidi
  platform_destek: 8 * 3600,
  platform_admin: 8 * 3600,
};

/**
 * "Beni hatırla" işaretlenmemiş oyuncu oturumunun ömrü.
 *
 * Kafenin tableti, arkadaşın telefonu, otel lobisindeki bilgisayar — ortak
 * bir cihazda giriş yapan kişi üç ay boyunca açık kalmamalı. On iki saat,
 * "bugün buradayım" ile "bu benim telefonum" arasındaki farkı karşılıyor.
 */
export const HATIRLAMA_YOK_SN = 12 * 3600;

/**
 * Tercih yalnızca **oyuncu** rolünde okunuyor: kasiyer ve panel
 * oturumlarının süresi bir güvenlik kararı (docs/08 §4.4), kullanıcı
 * tercihi değil.
 *
 * `hatirla` verilmediğinde rolün tam ömrü uygulanıyor — kısaltma yalnızca
 * kullanıcı kutuyu açıkça boş bıraktığında devreye giriyor.
 */
export function omurSaniye(rol: Rol, hatirla?: boolean): number {
  return rol === "oyuncu" && hatirla === false ? HATIRLAMA_YOK_SN : OMUR_SN[rol];
}
