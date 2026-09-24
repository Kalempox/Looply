"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { pinGiris, konumdakiKafe } from "@/domain/staff";
import { identifierHash } from "@/lib/crypto";
import { log } from "@/lib/log";

export type KasaGirisDurumu = { hata?: string; kafeAdi?: string };

/**
 * Kasiyer girişi — Ü285: PIN ve konum.
 *
 * Ürün sahibi: *"kasiyer her cihazdan girebilir ama cihazın kafe konumunun
 * içinde olması gerekir."* Cihaz kaydı (G11) kalktı; iki şart kaldı: konum
 * kafenin yarıçapında, PIN o kafenin kasiyerlerinden birinin.
 *
 * Kafe kimliği formdan gelmiyor, **konumdan çözülüyor**. Kasiyerin her
 * vardiya başında kafe seçmesi, üç saniyede bitmesi gereken akışa gereksiz
 * bir adım eklerdi; ayrıca formdan gelen bir kafe kimliği, başka kafenin
 * kasasına PIN denemenin kapısı olurdu.
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

  const yer = await konumdakiKafe(lat, lng, Number.isFinite(dogruluk) ? dogruluk : undefined);
  if (yer.durum === "belirsiz") {
    return {
      hata: "Konumun yeterince net değil. Birkaç saniye bekleyip, mümkünse pencereye yakın bir yerde tekrar dene.",
    };
  }
  if (yer.durum === "yok") {
    return {
      hata:
        yer.enYakinM != null
          ? `Kasaya yalnızca kafenin içinden girilebilir — en yakın kafeye ${mesafeMetni(yer.enYakinM)} uzaktasın.`
          : "Kasaya yalnızca kafenin içinden girilebilir — yakınında bir Looply kafesi yok.",
    };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "ip-yok";
  const sonuc = await pinGiris({
    cafeId: yer.cafeId,
    pin,
    ipAnahtari: identifierHash(`kasa-ip:${ip}`).subarray(0, 8).toString("hex"),
  });

  if (sonuc.durum === "kilitli") {
    return { hata: "Çok fazla deneme. Bir süre bekle." };
  }
  if (sonuc.durum === "yanlis") {
    return { hata: "PIN yanlış.", kafeAdi: yer.ad };
  }

  log.info("kasa girisi", { mesafeM: yer.mesafeM });
  await oturum.olustur({
    ozneTipi: "staff",
    ozneId: sonuc.staffId,
    rol: "kasiyer",
    cafeId: yer.cafeId,
    cihazId,
  });

  redirect("/kasa");
}

function mesafeMetni(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km`;
}
