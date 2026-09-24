"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { kasaGirisi } from "@/domain/staff";
import { identifierHash } from "@/lib/crypto";
import { log } from "@/lib/log";

export type KasaGirisDurumu = { hata?: string; kafeAdi?: string };

/**
 * Bu cihazın en son girdiği kafe — Ü286.
 *
 * Yalnızca bir **ipucu**: PIN'in kafesini bulup "bu PIN'in geçerli olduğu
 * kafeden X uzaktasın" diyebilmek için. Kapı değil — giriş yine konum ve
 * PIN'le; uydurulmuş bir ipucu yalnızca o kafenin PIN sayacını tüketir.
 */
const IPUCU_CEREZI = "kasa_kafe";

/**
 * Kasiyer girişi — Ü285: PIN ve konum.
 *
 * Ürün sahibi: *"kasiyer her cihazdan girebilir ama cihazın kafe konumunun
 * içinde olması gerekir."* Cihaz kaydı (G11) kalktı; kararı
 * `staff.kasaGirisi` veriyor — kafe formdan değil konumdan ve PIN'den
 * çözülüyor. Formdan gelen bir kafe kimliği, başka kafenin kasasına PIN
 * denemenin kapısı olurdu.
 *
 * Koordinat loglanmıyor ve saklanmıyor (G10) — yalnızca mesafe.
 */
export async function girisEylemi(
  _onceki: KasaGirisDurumu,
  form: FormData,
): Promise<KasaGirisDurumu> {
  const pin = String(form.get("pin") ?? "").replace(/[^\d]/g, "");
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  const dogruluk = Number(form.get("dogruluk"));
  const cihazId = String(form.get("cihazId") ?? "") || undefined;

  if (pin.length !== 4) return { hata: "PIN dört haneli olmalı." };
  if (!form.get("lat") || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { hata: "Konumun okunamadı. Konum iznini ver ve kafenin içinde tekrar dene." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "ip-yok";
  const cerezler = await cookies();

  const karar = await kasaGirisi({
    lat,
    lng,
    dogrulukM: Number.isFinite(dogruluk) ? dogruluk : undefined,
    pin,
    ipAnahtari: identifierHash(`kasa-ip:${ip}`).subarray(0, 8).toString("hex"),
    ipucu: cerezler.get(IPUCU_CEREZI)?.value ?? null,
  });

  switch (karar.durum) {
    case "kilitli":
      return { hata: "Çok fazla deneme. Bir süre bekle." };
    case "kafe_yok":
      return { hata: "Kasaya yalnızca kafenin içinden girilebilir — yakınında bir Looply kafesi yok." };
    case "belirsiz":
      return {
        hata: "Konumun yeterince net değil. Birkaç saniye bekleyip, mümkünse pencereye yakın bir yerde tekrar dene.",
      };
    case "uzak":
      return {
        hata: `Bu PIN'in geçerli olduğu kafeden (${karar.kafeAdi}) ${mesafeMetni(karar.mesafeM)} uzaktasın. Kasaya kafenin içinden girilir.`,
      };
    case "yanlis":
      return karar.kafede
        ? { hata: "PIN yanlış.", kafeAdi: karar.kafeAdi }
        : { hata: "PIN yanlış ya da kafenin içinde değilsin." };
  }

  log.info("kasa girisi", { mesafeM: karar.mesafeM });
  await oturum.olustur({
    ozneTipi: "staff",
    ozneId: karar.staffId,
    rol: "kasiyer",
    cafeId: karar.cafeId,
    cihazId,
  });
  cerezler.set(IPUCU_CEREZI, karar.cafeId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/kasa",
    maxAge: 180 * 86_400,
  });

  redirect("/kasa");
}

function mesafeMetni(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km`;
}
