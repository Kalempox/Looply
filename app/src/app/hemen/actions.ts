"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { biletCoz, MASA_COOKIE } from "@/domain/qr";
import * as misafir from "@/domain/misafir";
import * as cark from "@/domain/cark";
import { cerezGuvenli } from "@/lib/env";
import { kodEkrandaGosterilir } from "@/sms";
import { withBypass } from "@/db/context";
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

/**
 * ⚠️ Sabit değil fonksiyon — bilerek.
 *
 * Önce modül seviyesinde bir `const` idi ve bu, `env()`i **içe aktarma
 * anında** çağırmak demekti: ortam değişkenleri okunmadan modül yüklenirse
 * uygulama açılışta patlıyordu. Kapta derleme (F3) tam o koşulda koşuyor —
 * `.env.local` yok, değerler çalışma zamanında geliyor.
 *
 * Fonksiyon olunca değer istek anında hesaplanıyor; `env()` zaten kendi
 * içinde önbellekli, maliyeti yok.
 */
function cerezAyari() {
  return {
    httpOnly: true,
    secure: cerezGuvenli(),
    sameSite: "lax",
    path: "/",
    maxAge: misafir.TALEP_OMRU_SN,
  } as const;
}

async function masaBileti() {
  const bilet = (await cookies()).get(MASA_COOKIE)?.value;
  return bilet ? biletCoz(bilet) : null;
}

export type BaslaCevabi = { ok: true; tohum: string } | { ok: false; hata: string };

export async function misafirBasla(oyunId: string): Promise<BaslaCevabi> {
  const masa = await masaBileti();
  if (!masa) return { ok: false, hata: "Masa bağlantın düşmüş. Karekodu tekrar okut." };

  const sonuc = await misafir.basla({
    oyunId,
    cafeId: masa.cafeId,
    tableId: masa.tableId,
  });
  if (!sonuc.ok) return sonuc;

  (await cookies()).set(misafir.OYUN_COOKIE, sonuc.cerez, cerezAyari());
  return { ok: true, tohum: sonuc.tohum };
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

  c.set(misafir.TALEP_COOKIE, sonuc.cerez, cerezAyari());
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

  (await cookies()).set(misafir.KONUM_COOKIE, sonuc.cerez, cerezAyari());
  return { durum: sonuc.durum, mesafeM: sonuc.mesafeM };
}

/**
 * Demo kolaylığı — misafiri kafede sayar.
 *
 * `/oyna` tarafındaki `demoKafedeSay` ile aynı gerekçe: kafenin **kendi
 * koordinatı** okunup normal ölçüme veriliyor, mesafe gerçekten hesaplanıyor.
 * Kural gevşemiyor, yalnızca koordinatın kaynağı değişiyor.
 *
 * Canlıda hiç çalışmaz.
 */
export async function demoKafedeSay(): Promise<KonumCevabi> {
  if (!kodEkrandaGosterilir()) return { durum: "olmadi" };

  const masa = await masaBileti();
  if (!masa) return { durum: "olmadi" };

  const kafe = await withBypass("demo — kafe koordinatı", (db) =>
    db.one<{ lat: number | null; lng: number | null }>(
      `SELECT lat, lng FROM cafes WHERE id = $1`,
      [masa.cafeId],
    ),
  );
  if (!kafe || kafe.lat == null || kafe.lng == null) return { durum: "kafe_konumu_yok" };

  const sonuc = await misafir.konumDogrula({
    cafeId: masa.cafeId,
    lat: kafe.lat,
    lng: kafe.lng,
  });
  if (sonuc.durum === "kafe_konumu_yok") return { durum: "kafe_konumu_yok" };

  (await cookies()).set(misafir.KONUM_COOKIE, sonuc.cerez, cerezAyari());
  return { durum: sonuc.durum, mesafeM: sonuc.mesafeM };
}

/* ── Şans çarkı (Ü49) ──────────────────────────────────────── */

/**
 * Misafirin çarkı çevirmesi.
 *
 * Kupon **üretilmiyor**: G13 gereği kaydolmamış ziyaretçinin veritabanında
 * izi olmuyor. Kazanılan ödül imzalı çerezde bekliyor ve kayıt anında
 * `giris/actions.ts` içinde normal kupon yolundan bozduruluyor — bütçe,
 * kanıt kademesi ve erteleme kuralları orada işliyor.
 *
 * Kafe kimliği formdan değil **masa biletinden** okunuyor: aksi hâlde
 * ziyaretçi istediği kafenin adını yazıp o kafenin bütçesinden ödül
 * yazdırabilirdi.
 */
export async function carkiCevir(): Promise<
  { ok: true; dilim: number; baslik: string } | { ok: false; hata: string }
> {
  const masa = await masaBileti();
  if (!masa) return { ok: false, hata: "Masa bilgisi bulunamadı. Karekodu tekrar okut." };

  const c = await cookies();

  // Aynı ziyaretçi ikinci kez çeviremiyor: elindeki talep duruyorsa
  // yenisini üretmek, kaydolmadan ödül biriktirmenin yolu olurdu.
  if (cark.talepCoz(c.get(cark.TALEP_COOKIE)?.value)) {
    return { ok: false, hata: "Çarkı zaten çevirdin. Ödülün hesabını açınca işlenecek." };
  }

  const sonuc = await cark.misafirCevir({ cafeId: masa.cafeId });
  if (!sonuc.ok) return sonuc;

  c.set(cark.TALEP_COOKIE, sonuc.cerez, {
    ...cerezAyari(),
    maxAge: cark.TALEP_OMRU_SN,
  });

  return { ok: true, dilim: sonuc.dilim, baslik: sonuc.baslik };
}
