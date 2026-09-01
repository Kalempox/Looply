"use server";

import { revalidatePath } from "next/cache";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import * as cark from "@/domain/cark";
import { carkOduluVer } from "@/domain/kupon";
import { log } from "@/lib/log";

/**
 * Kayıtlı oyuncunun günlük çarkı (Ü49).
 *
 * ── Neden dilim numarasını sunucu söylüyor ──────────────────
 *
 * Ekran yalnızca **durması gereken yeri** öğreniyor. Seçimi `cark.ts`
 * yapıyor, kuponu `carkOduluVer` üretiyor; ikisi de sunucuda. Animasyonun
 * sonucu belirlediği bir tasarımda oyuncu, konsoldan istediği ödülü
 * yazdırırdı.
 *
 * ── Kafe formdan gelmiyor ───────────────────────────────────
 *
 * Masa oturumundan okunuyor. Parametre olarak alınsaydı oyuncu, bütçesi
 * dolu başka bir kafenin kimliğini geçebilirdi.
 */
export async function carkiCevir(): Promise<
  { ok: true; dilim: number; baslik: string } | { ok: false; hata: string }
> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return { ok: false, hata: "Oturumun kapanmış. Tekrar gir." };

  const masa = await masaOturumu.aktif(o.ozneId);
  if (!masa) {
    return { ok: false, hata: "Çark kafede çevriliyor. Masadaki karekodu okut." };
  }

  const durum = await cark.durum({ playerId: o.ozneId, cafeId: masa.cafeId });
  if (!durum.acik) {
    return { ok: false, hata: cark.durumMetni(durum) };
  }

  const secim = cark.sec(durum.dilimler);
  if (!secim) return { ok: false, hata: "Bu kafede şu an dağıtılan ödül yok." };

  const kupon = await carkOduluVer({
    playerId: o.ozneId,
    cafeId: masa.cafeId,
    odulId: secim.dilim.odulId,
    kanitSeviyesi: masa.kanitSeviyesi,
  });

  if (!kupon.ok) {
    // Kupon üretilemediyse çark dönmüş sayılmıyor: 24 saatlik kilit
    // kuponun kendisinden okunuyor, yani oyuncu hakkını kaybetmiyor.
    log.info("cark odulu verilemedi", { sebep: kupon.hata });
    return { ok: false, hata: kupon.hata };
  }

  revalidatePath("/oyna");
  revalidatePath("/oduller");

  return { ok: true, dilim: secim.indeks, baslik: kupon.baslik };
}
