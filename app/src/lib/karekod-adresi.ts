import { networkInterfaces } from "node:os";

/**
 * Karekodun taşıyacağı adresin tabanı — `https://<alan>` (Ü270 · U3).
 *
 * ── 🔴 Neden ayrı bir yer ───────────────────────────────────
 *
 * Adres, paneli açan isteğin `Host` başlığından türüyordu. Ürün sahibi
 * paneli bilgisayarda `localhost` ile açınca ekrandaki karekod
 * `https://localhost:3000/m/…` taşıdı; telefonda "localhost" telefonun
 * **kendisi** demek ve Safari de Chrome da "sunucuya bağlanılamadı"
 * dedi. Aynı kusur toptan baskıda çok daha pahalıya patlardı: yanlış
 * adresle basılmış kâğıt geri alınamıyor.
 *
 * Kurallar, sırayla:
 *   1. `KAREKOD_TABAN_ADRESI` varsa o — canlının adresi, istekten
 *      bağımsız. Toptan baskı bununla yapılmalı (docs/23 · U3).
 *   2. Yoksa isteğin adresi; ama **yerel ad** (localhost, 127.x) ise
 *      bilgisayarın ağ adresiyle değiştiriliyor — yalnızca geliştirmede.
 *      Canlıda yerel ağ yok, değiştirilecek bir şey de yok.
 *   3. Şema isteğin şeması (Next `x-forwarded-proto`'yu kendisi
 *      dolduruyor); bilinmiyorsa `https`.
 */
export function tabanAdres(o: {
  host: string;
  proto: string | null;
  /** `KAREKOD_TABAN_ADRESI` — varsa her şeyi geçersiz kılar. */
  sabit?: string | null;
  /** Bilgisayarın yerel ağ adresi; canlıda `null`. */
  agAdresi?: string | null;
}): string {
  const sabit = o.sabit?.trim();
  if (sabit) return sabit.replace(/\/+$/, "");

  let host = o.host;
  const yerel = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(:\d+)?$/i.exec(host);
  if (yerel && o.agAdresi) host = `${o.agAdresi}${yerel[2] ?? ""}`;

  const proto = o.proto?.split(",")[0].trim() || "https";
  return `${proto}://${host}`;
}

/**
 * Bilgisayarın telefondan ulaşılabilecek IPv4 adresi.
 *
 * ⚠️ Sıra önemli: `192.168.` önce. Bu makinede `172.31.x` bir sanal
 * bağdaştırıcı (WSL/Hyper-V) ve telefon ona ulaşamıyor — ilk bulunanı
 * almak yanlış adresi basardı.
 */
export function yerelAgAdresi(): string | null {
  const adresler = Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === "IPv4" && !a.internal)
    .map((a) => a!.address);
  return (
    adresler.find((a) => a.startsWith("192.168.")) ??
    adresler.find((a) => a.startsWith("10.")) ??
    adresler.find((a) => /^172\.(1[6-9]|2\d|3[01])\./.test(a)) ??
    null
  );
}

/** Sayfalar için: istek başlıklarından taban adres. */
export function istektenTabanAdres(h: { get(ad: string): string | null }): string {
  return tabanAdres({
    host: h.get("x-forwarded-host") ?? h.get("host") ?? "looply",
    proto: h.get("x-forwarded-proto"),
    sabit: process.env.KAREKOD_TABAN_ADRESI ?? null,
    agAdresi: process.env.APP_ENV === "production" ? null : yerelAgAdresi(),
  });
}
