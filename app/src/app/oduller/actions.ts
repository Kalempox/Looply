"use server";

import * as oturum from "@/domain/session";
import { kaz, type KazimaSonucu } from "@/domain/odul";

/**
 * Kuponu kazıyarak açar ve ödülün adını **ilk kez** döndürür — Ü141.
 *
 * ── 🔴 Oyuncu kimliği istemciden ALINMIYOR ──────────────────
 *
 * Çağrı yalnızca kupon kimliği taşıyor; kimin açtığı oturumdan
 * okunuyor. Oyuncu kimliği parametre olsaydı, başkasının kupon
 * kimliğini bilen biri onun ödülünü açabilir ve adını öğrenebilirdi —
 * sunucu eylemleri dışarıdan çağrılabilir uç noktalardır, formdan
 * geldikleri için güvenli değildirler.
 *
 * Sahiplik ayrıca `kaz()` içindeki sorguda da süzülüyor
 * (`player_id = $2`): burada oturum yanlış okunsa bile başkasının
 * kuponu açılmıyor.
 *
 * ── Neden bir şey yeniden doğrulanmıyor (`revalidatePath`) ──
 *
 * Açılan kuponu ekrana yazan şey bu çağrının **kendi yanıtı**: kart
 * yerinde açılıyor, sayfa yeniden çizilmiyor. Burada yeniden doğrulama
 * yapılsaydı liste kazıma kutlamasının ortasında yenilenir ve kart
 * gözün önünde yer değiştirirdi. Liste bir sonraki gezinmede zaten
 * doğru — sayfa `force-dynamic`.
 */
export async function kuponuKaz(kuponId: string): Promise<KazimaSonucu> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return { ok: false };

  return kaz(o.ozneId, kuponId);
}
