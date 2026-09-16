"use server";

import * as oturum from "@/domain/session";
import * as avatar from "@/domain/avatar";
import type { OyuncuRengi } from "@/components/oyuncu-renk";
import type { AvatarAksesuari } from "@/components/avatar";

/**
 * Avatar seçimini kaydeder — Ü147.
 *
 * ── 🔴 Oyuncu kimliği istemciden alınmıyor ──────────────────
 *
 * Çağrı yalnızca seçimi taşıyor; kimin kaydettiği oturumdan okunuyor.
 * Kimlik parametre olsaydı, başkasının kimliğini bilen biri onun
 * avatarını değiştirebilirdi — sunucu eylemleri dışarıdan çağrılabilir
 * uç noktalardır (aynı gerekçe `oduller/actions.ts`te de yazılı).
 *
 * ── Değer doğrulanıyor, sessizce düzeltilmiyor ──────────────
 *
 * Listede olmayan bir renk gelirse kayıt **yapılmıyor** ve `ok: false`
 * dönüyor. Varsayılana düşmek de bir seçenekti ama o, bozuk bir
 * arayüzü sessizce çalışıyor gösterirdi.
 */
export async function avatariKaydet(
  renk: string,
  aksesuar: string,
): Promise<{ ok: boolean }> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return { ok: false };

  const yazildi = await avatar.yaz(o.ozneId, {
    renk: renk as OyuncuRengi,
    aksesuar: aksesuar as AvatarAksesuari,
  });
  return { ok: yazildi };
}
