"use server";

import * as oturum from "@/domain/session";
import { kuponDetayi } from "@/domain/odul";

/**
 * Kuponun o anki durumu — yoklama için (Ü136).
 *
 * ── 🔴 Sahiplik kontrolü `kuponDetayi` içinde ───────────────
 *
 * Sorgu `WHERE k.id = $1 AND k.player_id = $2` — yani başkasının kupon
 * kimliğini yazan biri `null` alıyor. Kimlik istemciden geliyor ve
 * gelmek zorunda (hangi kupona bakıldığını o biliyor); güvenliği veren
 * şey `playerId`'nin **oturumdan** okunması.
 *
 * ⚠️ Dönen şey yalnızca **durum dizgisi**. `kuponDetayi` jetonu ve kodu
 * da taşıyor ama onlar buradan çıkmıyor: bu uç saniyede bir çağrılıyor
 * ve her çağrıda kuponun sırrını ağa koymanın hiçbir gerekçesi yok.
 *
 * ⚠️ Oturum yoksa `null` — hata fırlatmıyor. Oyuncunun oturumu kupon
 * ekranı açıkken dolabilir; yoklamanın patlaması ekranı bozmamalı,
 * sessizce durması yeter.
 */
export async function kuponDurumu(kuponId: string): Promise<string | null> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return null;

  const kupon = await kuponDetayi(o.ozneId, kuponId);
  return kupon?.durum ?? null;
}
