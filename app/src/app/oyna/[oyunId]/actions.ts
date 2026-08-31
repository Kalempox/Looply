"use server";

import { revalidatePath } from "next/cache";
import * as oturum from "@/domain/session";
import * as oyunDomain from "@/domain/oyun";

/**
 * Oyun oturumu eylemleri.
 *
 * İkisi de oyuncunun kimliğini **oturumdan** alıyor; `playerId` istemciden
 * gelmiyor. Gelseydi, oyuncu başkasının hesabına puan yazdırabilirdi.
 */

export type BaslatCevabi =
  | { ok: true; oturumId: string; tohum: string; bolum: number; kazandirir: boolean; bonusMu: boolean }
  | { ok: false; hata: string };

export async function baslaEylemi(oyunId: string, bolum: number): Promise<BaslatCevabi> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return { ok: false, hata: "Önce giriş yapmalısın." };

  return oyunDomain.basla({ playerId: o.ozneId, oyunId, bolum });
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
