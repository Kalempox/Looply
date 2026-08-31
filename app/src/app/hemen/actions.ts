"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { biletCoz, MASA_COOKIE } from "@/domain/qr";
import * as misafir from "@/domain/misafir";
import { isProduction } from "@/lib/env";
import { dogrula } from "@/lib/validate";

/**
 * Misafir oyun eylemleri (Ü35).
 *
 * Üçünün de ortak yanı: **masayı formdan değil çerezden** okuyorlar. Masa
 * bileti HttpOnly ve imzalı; formdaki gizli bir alan olsaydı oyuncu istediği
 * kafenin kimliğini yazardı.
 *
 * Hiçbiri veritabanına yazmıyor — G13: doğrulanmamış ziyaretçinin kalıcı izi
 * olmuyor. Tek istisna `konumBildir`'in kafe koordinatını **okuması**.
 */

const CEREZ_AYARI = {
  httpOnly: true,
  secure: isProduction(),
  sameSite: "lax",
  path: "/",
  maxAge: misafir.TALEP_OMRU_SN,
} as const;

async function masaBileti() {
  const bilet = (await cookies()).get(MASA_COOKIE)?.value;
  return bilet ? biletCoz(bilet) : null;
}

export type BaslaCevabi =
  | { ok: true; tohum: string; bolum: number }
  | { ok: false; hata: string };

export async function misafirBasla(oyunId: string, bolum: number): Promise<BaslaCevabi> {
  const masa = await masaBileti();
  if (!masa) return { ok: false, hata: "Masa bağlantın düşmüş. Karekodu tekrar okut." };

  const sonuc = await misafir.basla({
    oyunId,
    bolum,
    cafeId: masa.cafeId,
    tableId: masa.tableId,
  });
  if (!sonuc.ok) return sonuc;

  (await cookies()).set(misafir.OYUN_COOKIE, sonuc.cerez, CEREZ_AYARI);
  return { ok: true, tohum: sonuc.tohum, bolum: sonuc.bolum };
}

export type BitirCevabi =
  | { ok: true; skor: number; basarili: boolean; k2: boolean }
  | { ok: false; hata: string; reddedildi?: boolean };

export async function misafirBitir(
  girdiler: unknown,
  iddiaEdilenSkor: number,
): Promise<BitirCevabi> {
  const c = await cookies();

  const sonuc = misafir.bitir({
    acikOyunCerezi: c.get(misafir.OYUN_COOKIE)?.value,
    konumCerezi: c.get(misafir.KONUM_COOKIE)?.value,
    girdiler,
    iddiaEdilenSkor,
  });

  // Açık oyun her hâlükârda kapanıyor: aynı tohumla ikinci bir kayıt
  // gönderilebilseydi oyuncu en iyi denemesini seçerdi.
  c.delete(misafir.OYUN_COOKIE);

  if (!sonuc.ok) return sonuc;

  c.set(misafir.TALEP_COOKIE, sonuc.cerez, CEREZ_AYARI);
  return { ok: true, skor: sonuc.skor, basarili: sonuc.basarili, k2: sonuc.k2 };
}

const konumSemasi = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type KonumCevabi =
  | { durum: "dogrulandi"; mesafeM: number }
  | { durum: "uzak"; mesafeM: number }
  | { durum: "kafe_konumu_yok" }
  | { durum: "olmadi" };

/**
 * Misafirin konumu (K2) — kayıttan **önce** ölçülüyor.
 *
 * Sebebi Ü35'in vaadi: "önce oynasın, ödül kazansın." Konum kayıttan sonra
 * sorulsaydı, oyun bittikten sonra ölçülmüş olurdu ve talep K2'siz
 * bozdurulup hiçbir ödül üretmezdi.
 *
 * Koordinat sunucuya geliyor, mesafe hesaplanıyor, **koordinat atılıyor**
 * (G10). Çereze yalnızca metre ve "yakın mı" giriyor; imzalı olduğu için
 * oyuncu kendini yakın ilan edemiyor.
 */
export async function konumBildir(lat: number, lng: number): Promise<KonumCevabi> {
  const masa = await masaBileti();
  if (!masa) return { durum: "olmadi" };

  const girdi = dogrula(konumSemasi, { lat, lng });
  if (!girdi.ok) return { durum: "olmadi" };

  const sonuc = await misafir.konumDogrula({
    cafeId: masa.cafeId,
    lat: girdi.veri.lat,
    lng: girdi.veri.lng,
  });

  if (sonuc.durum === "kafe_konumu_yok") return { durum: "kafe_konumu_yok" };

  (await cookies()).set(misafir.KONUM_COOKIE, sonuc.cerez, CEREZ_AYARI);
  return { durum: sonuc.durum, mesafeM: sonuc.mesafeM };
}
