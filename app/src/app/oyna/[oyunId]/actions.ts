"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as oyunDomain from "@/domain/oyun";
import * as masaOturumu from "@/domain/masa";
import * as upsell from "@/domain/upsell";
import { upsellKuponuVer } from "@/domain/kupon";

/**
 * Oyun oturumu eylemleri.
 *
 * İkisi de oyuncunun kimliğini **oturumdan** alıyor; `playerId` istemciden
 * gelmiyor. Gelseydi, oyuncu başkasının hesabına puan yazdırabilirdi.
 */

export type BaslatCevabi =
  | { ok: true; oturumId: string; tohum: string; kazandirir: boolean; bonusMu: boolean }
  | { ok: false; hata: string };

export async function baslaEylemi(oyunId: string): Promise<BaslatCevabi> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return { ok: false, hata: "Önce giriş yapmalısın." };

  return oyunDomain.basla({ playerId: o.ozneId, oyunId });
}

/**
 * Ödül paketi tahtaya çıktı — gösterilsin mi? (Ü275 · "görünürse kesin")
 *
 * Girdi kaydı o ana kadarki hâliyle geliyor; sunucu turu yeniden oynatıp
 * paketin gerçekten çıktığını görüyor. Karar bir kez veriliyor.
 */
export async function odulSorEylemi(
  oturumId: string,
  girdiler: unknown,
): Promise<{ izin: boolean }> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return { izin: false };
  return oyunDomain.odulSor({ playerId: o.ozneId, oturumId, girdiler });
}

export type BitirCevabi = Awaited<ReturnType<typeof oyunDomain.bitir>>;

export async function bitirEylemi(
  oturumId: string,
  girdiler: unknown,
  iddiaEdilenSkor: number,
): Promise<BitirCevabi> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return { ok: false, hata: "Önce giriş yapmalısın." };

  const sonuc = await oyunDomain.bitir({
    playerId: o.ozneId,
    oturumId,
    girdiler,
    iddiaEdilenSkor,
  });

  // Puan, XP ve seviye değişmiş olabilir — ana ekran ve profil tazelensin.
  revalidatePath("/oyna");
  revalidatePath("/profil");

  return sonuc;
}

/**
 * Upsell teklifini kabul et (Ü100).
 *
 * ⚠️ İstemciden gelen tek şey **teklif kimliği**. Ürün, yüzde, tavan ve
 * süre sunucuda teklif satırından okunuyor — Değişmez kural #4: para
 * değeri taşıyan hiçbir sayı istemciden alınmıyor. Teklif başkasının
 * olamaz: sorguda `player_id` süzgeci duruyor.
 */
export async function teklifAlEylemi(
  teklifId: string,
): Promise<{ ok: true; baslik: string } | { ok: false; hata: string }> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  // Kanıt kademesi masadan geliyor, istemciden değil (E6).
  const masa = await masaOturumu.aktif(o.ozneId);
  if (!masa) return { ok: false, hata: "Masa oturumun kapanmış." };

  const sonuc = await upsell.teklifiAl({
    playerId: o.ozneId,
    teklifId,
    kanitSeviyesi: masa.kanitSeviyesi,
    kuponVer: (db, g) =>
      upsellKuponuVer(db, {
        playerId: o.ozneId,
        cafeId: g.cafeId,
        kampanyaId: g.kampanyaId,
        baslik: g.baslik,
        tavanKurus: g.tavanKurus,
        gecerliSaat: g.gecerliSaat,
        kanitSeviyesi: masa.kanitSeviyesi,
      }),
  });

  if (!sonuc.ok) return { ok: false, hata: sonuc.hata };

  revalidatePath("/oduller");
  return { ok: true, baslik: sonuc.baslik };
}
