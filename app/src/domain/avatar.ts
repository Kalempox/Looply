import { withBypass } from "@/db/context";
import {
  AVATAR_AKSESUARLARI,
  AVATAR_RENKLERI,
  VARSAYILAN_AKSESUAR,
  VARSAYILAN_RENK,
  type AvatarAksesuari,
} from "@/components/avatar";
import type { OyuncuRengi } from "@/components/oyuncu-renk";

/**
 * Oyuncunun avatar seçimi — Ü147.
 *
 * ── Neden alan adları arayüzden import ediliyor ─────────────
 *
 * Renk ve aksesuar listeleri `components/avatar.tsx` içinde: çizimi
 * yapan dosya hangi seçeneklerin olduğunu zaten bilmek zorunda. İkinci
 * bir kopya burada dursaydı biri güncellenirken diğeri geride kalır ve
 * oyuncu seçebildiği bir şeyi kaydedemezdi.
 *
 * Üçüncü kopya **veritabanındaki CHECK** ve o bilerek ayrı: kısıt son
 * savunma, kod ne yaparsa yapsın yanlış değer satıra giremiyor.
 */

export type AvatarSecimi = {
  renk: OyuncuRengi;
  aksesuar: AvatarAksesuari;
};

export const VARSAYILAN_AVATAR: AvatarSecimi = {
  renk: VARSAYILAN_RENK,
  aksesuar: VARSAYILAN_AKSESUAR,
};

/**
 * Gelen değeri listeye göre doğrular.
 *
 * ⚠️ Sunucu tarafında **şart**: seçim bir form üzerinden geliyor ve
 * sunucu eylemleri dışarıdan çağrılabilir uç noktalar. Doğrulanmasaydı
 * kısıt hatası bir 500'e dönerdi; burada sessizce varsayılana düşmek
 * de doğru değil — bilinmeyen değer **reddediliyor**.
 */
export function gecerliMi(secim: { renk: string; aksesuar: string }): boolean {
  return (
    AVATAR_RENKLERI.includes(secim.renk as OyuncuRengi) &&
    AVATAR_AKSESUARLARI.some((a) => a.deger === secim.aksesuar)
  );
}

/**
 * Oyuncunun avatarını okur.
 *
 * `withBypass`: `players` üzerinde oyuncu politikası var ama bu okuma
 * kafe panelinden de (oyuncu listesi) çağrılabiliyor ve orada bağlam
 * oyuncu değil. Süzgeç SQL'de açıkça duruyor.
 */
export async function oku(playerId: string): Promise<AvatarSecimi> {
  const r = await withBypass("oyuncu avatarı", (db) =>
    db.one<{ avatar_renk: string; avatar_aksesuar: string }>(
      "SELECT avatar_renk, avatar_aksesuar FROM players WHERE id = $1",
      [playerId],
    ),
  );
  if (!r) return VARSAYILAN_AVATAR;
  return {
    renk: r.avatar_renk as OyuncuRengi,
    aksesuar: r.avatar_aksesuar as AvatarAksesuari,
  };
}

/** Seçimi kaydeder. Geçersiz değer yazılmıyor — `false` dönüyor. */
export async function yaz(playerId: string, secim: AvatarSecimi): Promise<boolean> {
  if (!gecerliMi(secim)) return false;

  await withBypass("avatar seçimi", (db) =>
    db.query("UPDATE players SET avatar_renk = $2, avatar_aksesuar = $3 WHERE id = $1", [
      playerId,
      secim.renk,
      secim.aksesuar,
    ]),
  );
  return true;
}
