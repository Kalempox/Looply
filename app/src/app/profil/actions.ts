"use server";

import * as oturum from "@/domain/session";
import * as avatar from "@/domain/avatar";
import { VARSAYILAN_AKSESUAR } from "@/components/avatar";

/**
 * Avatar seçimini kaydeder — Ü147, Ü186'da iki renge çıktı.
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
 * Palette olmayan bir renk gelirse kayıt **yapılmıyor** ve `ok: false`
 * dönüyor. Varsayılana düşmek de bir seçenekti ama o, bozuk bir
 * arayüzü sessizce çalışıyor gösterirdi.
 *
 * ⚠️ Aksesuar parametre DEĞİL: seçicisi kapalı (`AKSESUARLI`) ve
 * istemciden gelen bir alan kabul etseydik, kapalı bir arayüzün
 * değerini dışarıdan yazdırabilen bir uç nokta bırakmış olurduk.
 * Seçici açıldığında buraya bir parametre eklenecek.
 */
export async function avatariKaydet(
  govde: string,
  serit: string,
): Promise<{ ok: boolean }> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return { ok: false };

  const yazildi = await avatar.yaz(o.ozneId, {
    govde,
    serit,
    aksesuar: VARSAYILAN_AKSESUAR,
  });
  return { ok: yazildi };
}
