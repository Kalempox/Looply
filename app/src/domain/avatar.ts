import { withBypass } from "@/db/context";
import { AVATAR_AKSESUARLARI, VARSAYILAN_AKSESUAR, type AvatarAksesuari } from "@/components/avatar";
import {
  GOVDE_RENKLERI,
  SERIT_RENKLERI,
  VARSAYILAN_GOVDE,
  VARSAYILAN_SERIT,
} from "@/components/avatar-renkleri";

/**
 * Oyuncunun avatar seçimi — Ü147, Ü186'da iki renge çıktı.
 *
 * ── Neden listeler arayüzden import ediliyor ────────────────
 *
 * Palet `components/avatar-paleti.json` içinde: çizimi yapan dosya
 * hangi seçeneklerin olduğunu zaten bilmek zorunda. İkinci bir kopya
 * burada dursaydı biri güncellenirken diğeri geride kalır ve oyuncu
 * seçebildiği bir şeyi kaydedemezdi.
 *
 * Üçüncü kopya **veritabanındaki CHECK** ve o bilerek ayrı: kısıt son
 * savunma, kod ne yaparsa yapsın çöp değer satıra giremiyor.
 *
 * ⚠️ Ü186'da kısıdın ŞEKLİ değişti — göç 0045'te yazılı. Kolon artık
 * kapalı bir listeyi değil biçimi (`^[a-z0-9-]{2,24}$`) kontrol ediyor,
 * çünkü palet 990 kombinasyon ve büyümeye açık. Asıl liste burada
 * zorlanıyor; kısıt yalnızca enjeksiyon boyu bir şeyin satıra
 * girmediğine bakıyor.
 */

export type AvatarSecimi = {
  govde: string;
  serit: string;
  aksesuar: AvatarAksesuari;
};

export const VARSAYILAN_AVATAR: AvatarSecimi = {
  govde: VARSAYILAN_GOVDE,
  serit: VARSAYILAN_SERIT,
  aksesuar: VARSAYILAN_AKSESUAR,
};

/**
 * Gelen değeri palete göre doğrular.
 *
 * ⚠️ Sunucu tarafında **şart**: seçim bir form üzerinden geliyor ve
 * sunucu eylemleri dışarıdan çağrılabilir uç noktalar. Doğrulanmasaydı
 * kısıt hatası bir 500'e dönerdi; burada sessizce varsayılana düşmek
 * de doğru değil — bilinmeyen değer **reddediliyor**.
 *
 * (Çizim yolunda tam tersi geçerli: `avatar-renkleri.ts` bilinmeyen adı
 * sessizce varsayılana düşürüyor. Orada oyuncuya bozuk bir avatar
 * göstermektense özgün hâlini göstermek daha iyi.)
 */
export function gecerliMi(secim: {
  govde: string;
  serit: string;
  aksesuar: string;
}): boolean {
  return (
    GOVDE_RENKLERI.has(secim.govde) &&
    SERIT_RENKLERI.has(secim.serit) &&
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
    db.one<{ avatar_govde: string; avatar_serit: string; avatar_aksesuar: string }>(
      "SELECT avatar_govde, avatar_serit, avatar_aksesuar FROM players WHERE id = $1",
      [playerId],
    ),
  );
  if (!r) return VARSAYILAN_AVATAR;
  return {
    govde: r.avatar_govde,
    serit: r.avatar_serit,
    aksesuar: r.avatar_aksesuar as AvatarAksesuari,
  };
}

/** Seçimi kaydeder. Geçersiz değer yazılmıyor — `false` dönüyor. */
export async function yaz(playerId: string, secim: AvatarSecimi): Promise<boolean> {
  if (!gecerliMi(secim)) return false;

  await withBypass("avatar seçimi", (db) =>
    db.query(
      "UPDATE players SET avatar_govde = $2, avatar_serit = $3, avatar_aksesuar = $4 WHERE id = $1",
      [playerId, secim.govde, secim.serit, secim.aksesuar],
    ),
  );
  return true;
}
