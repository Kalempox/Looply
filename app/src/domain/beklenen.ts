import { withCafe } from "@/db/context";
import { isGunu } from "@/lib/tarih";

/**
 * Bugün kaç müşteri bekleniyor? (Ü99)
 *
 * Ürün sahibi: *"beklenen[i] önceki günlerdeki hava koşulları, hangi günde,
 * bundan önceki zamanlarda kaç kişi gelmiş, o gün özel bir gün mü vb.
 * metriklere göre — eskiden bu kadar gelmiş, bu kadar da bekleniyor
 * diyeceğiz."*
 *
 * ── ⚠️ Açık kupon sayısı beklenen müşteri DEĞİLDİR ───────────
 *
 * Panelde en kolay yanlış bu olurdu: *"30 açık kupon var, bugün 30 kişi
 * gelecek."* Kuponların çoğu bugün kullanılmıyor; bir kısmı hiç
 * kullanılmıyor. Tahmin, kuponun **kullanılma davranışından** çıkmalı.
 *
 * ── Nasıl hesaplanıyor ──────────────────────────────────────
 *
 * Son 28 günün her biri için: o günün başında **açık olan** kupon sayısı ve
 * o gün **kasada onaylanan** kupon sayısı. İkisinin oranı o günün
 * "dönüş oranı". Bugünün tahmini = bugünün açık kupon sayısı × geçmiş oran.
 *
 * Açık kupon sayısı geçmişe dönük **hesaplanabiliyor**, saklamaya gerek yok:
 * bir kupon T anında açıktı demek `activates_at <= T` ve `expires_at > T` ve
 * (`redeemed_at` boş ya da T'den sonra) demek. E3'ün faydası burada —
 * defter duruyorsa geçmiş yeniden kurulabiliyor.
 *
 * ── Neden aralık, neden tek sayı değil ──────────────────────
 *
 * ⚠️ Kesin sayı yazan bir panel, ilk yanlış tahminde işletmecinin panele
 * güvenmeyi bırakmasına yol açar. Günlük oranlar gerçekte dalgalanıyor;
 * o dalgalanmayı gizlemek yerine **gösteriyoruz**: alt ve üst sınır,
 * gözlenen oranların en düşük ve en yüksek çeyreğinden geliyor.
 *
 * ── Aynı gün ağırlığı ───────────────────────────────────────
 *
 * Cumartesi ile salı aynı kafede aynı şey değil. Aynı haftagününe düşen
 * günler iki kat ağırlıkla giriyor — ayrı bir model değil, aynı ortalamanın
 * ağırlıklı hâli. Az veriyle ayrı bir "cumartesi modeli" kurmak, üç
 * cumartesiye bakıp kural çıkarmak olurdu.
 *
 * ── 🔴 Henüz kullanılmayan girdiler ─────────────────────────
 *
 * Ürün sahibinin saydığı iki girdi burada **yok** ve olmadığı yazılı
 * durmalı, sessizce eksik kalmamalı:
 *   · **hava durumu** — sağlayıcı yok (Dalga 5, madde 21)
 *   · **özel gün** — tatil/maç/etkinlik takvimi yok
 * İkisi de `GirdiDurumu` ile dışarı bildiriliyor; panel "neye bakarak
 * söylüyoruz" diyebilsin.
 */

/** Geçmişe kaç gün bakılıyor. */
export const BAKILAN_GUN = 28;

/** Güvenilir bir oran için gereken en az gün sayısı. */
export const EN_AZ_GUN = 7;

/** Aynı haftagününe düşen günün ağırlığı. */
const AYNI_GUN_AGIRLIGI = 2;

export type GirdiDurumu = {
  /** Kaç günlük geçmişe bakılabildi. */
  gun: number;
  haftaGunuAgirligi: boolean;
  /** 🔴 Sağlayıcı yok — Dalga 5. */
  havaDurumu: false;
  /** 🔴 Tatil/etkinlik takvimi yok. */
  ozelGun: false;
};

export type Beklenen =
  | {
      yeterliVeri: true;
      /** Bugün açık olan kupon sayısı — tahminin çarpanı. */
      acikKupon: number;
      /** Tahmin bandı. */
      alt: number;
      ust: number;
      /** Bugün şimdiye kadar kasada onaylanan kupon sayısı. */
      gerceklesen: number;
      girdiler: GirdiDurumu;
    }
  | {
      yeterliVeri: false;
      acikKupon: number;
      gerceklesen: number;
      /** Kaç gün daha veri gerektiği — panel bunu söyleyebilsin. */
      eksikGun: number;
      girdiler: GirdiDurumu;
    };

type GunSatiri = { gun: string; acik: number; kullanilan: number; haftaGunu: number };

/** Çeyrek değeri — küçük dizilerde de anlamlı kalan basit yöntem. */
function ceyrek(sirali: number[], oran: number): number {
  if (sirali.length === 0) return 0;
  const i = Math.min(sirali.length - 1, Math.max(0, Math.round((sirali.length - 1) * oran)));
  return sirali[i];
}

export async function bugunBeklenen(cafeId: string, an: Date = new Date()): Promise<Beklenen> {
  const bugun = isGunu(an);

  return withCafe(cafeId, async (db) => {
    /**
     * Son 28 günün her biri için açık kupon ve kullanım sayısı.
     *
     * `generate_series` günleri üretiyor; her gün için iki sayaç ayrı alt
     * sorguda. Kupon tablosunu gün başına taramak pahalı görünüyor ama
     * dönem 28 gün ve `coupons` kafe başına RLS ile zaten dar.
     */
    const satirlar = await db.all<{
      gun: string;
      acik: string;
      kullanilan: string;
      hafta_gunu: string;
    }>(
      `WITH gunler AS (
         SELECT (d)::date AS gun
           FROM generate_series($1::date - ($2 || ' days')::interval, $1::date - interval '1 day', interval '1 day') d
       )
       SELECT to_char(g.gun, 'YYYY-MM-DD') AS gun,
              EXTRACT(dow FROM g.gun)::text AS hafta_gunu,
              (SELECT count(*) FROM coupons c
                WHERE c.activates_at < (g.gun + 1)::timestamp AT TIME ZONE 'Europe/Istanbul'
                  AND c.expires_at   > g.gun::timestamp AT TIME ZONE 'Europe/Istanbul'
                  AND (c.redeemed_at IS NULL
                       OR c.redeemed_at >= g.gun::timestamp AT TIME ZONE 'Europe/Istanbul')
              )::text AS acik,
              (SELECT count(*) FROM coupons c
                WHERE c.redeemed_at >= g.gun::timestamp AT TIME ZONE 'Europe/Istanbul'
                  AND c.redeemed_at <  (g.gun + 1)::timestamp AT TIME ZONE 'Europe/Istanbul'
              )::text AS kullanilan
         FROM gunler g
        ORDER BY g.gun`,
      [bugun, BAKILAN_GUN],
    );

    const bugunkuler = await db.one<{ acik: string; gerceklesen: string }>(
      `SELECT
         (SELECT count(*) FROM coupons c
           WHERE c.status IN ('pending','active')
             AND c.expires_at > now())::text AS acik,
         (SELECT count(*) FROM coupons c
           WHERE c.redeemed_at >= ($1::date::timestamp AT TIME ZONE 'Europe/Istanbul'))::text
           AS gerceklesen`,
      [bugun],
    );

    const acikKupon = Number(bugunkuler?.acik ?? 0);
    const gerceklesen = Number(bugunkuler?.gerceklesen ?? 0);

    // ⚠️ Açık kuponu OLMAYAN günler oranı bozar: payda sıfır, oran
    // tanımsız. O günler geçmişten düşüyor — "o gün kimse gelmedi" değil,
    // "o gün gelinecek bir şey yoktu" demek.
    const gunler: GunSatiri[] = satirlar
      .map((r) => ({
        gun: r.gun,
        acik: Number(r.acik),
        kullanilan: Number(r.kullanilan),
        haftaGunu: Number(r.hafta_gunu),
      }))
      .filter((g) => g.acik > 0);

    const girdiler: GirdiDurumu = {
      gun: gunler.length,
      haftaGunuAgirligi: true,
      havaDurumu: false,
      ozelGun: false,
    };

    if (gunler.length < EN_AZ_GUN) {
      return {
        yeterliVeri: false as const,
        acikKupon,
        gerceklesen,
        eksikGun: EN_AZ_GUN - gunler.length,
        girdiler,
      };
    }

    const bugunHaftaGunu = new Date(`${bugun}T12:00:00Z`).getUTCDay();

    // Ağırlıklı ortalama oran: aynı haftagünü iki kat sayılıyor.
    let pay = 0;
    let paydaAgirlik = 0;
    const oranlar: number[] = [];
    for (const g of gunler) {
      const oran = g.kullanilan / g.acik;
      const agirlik = g.haftaGunu === bugunHaftaGunu ? AYNI_GUN_AGIRLIGI : 1;
      pay += oran * agirlik;
      paydaAgirlik += agirlik;
      // Band için aynı haftagünü ağırlığı yok: dalgalanma olduğu gibi görünsün.
      oranlar.push(oran);
    }

    const ortalama = pay / paydaAgirlik;
    oranlar.sort((a, b) => a - b);

    // Band, gözlenen oranların çeyrekliklerinden. Ortalama bandın dışına
    // düşerse band ortalamayı içine alacak şekilde genişliyor — panelde
    // "tahmin 12 ama band 3–8" gibi bir çelişki görünmemeli.
    const altOran = Math.min(ceyrek(oranlar, 0.25), ortalama);
    const ustOran = Math.max(ceyrek(oranlar, 0.75), ortalama);

    return {
      yeterliVeri: true as const,
      acikKupon,
      alt: Math.round(acikKupon * altOran),
      ust: Math.max(Math.round(acikKupon * ustOran), Math.round(acikKupon * altOran)),
      gerceklesen,
      girdiler,
    };
  });
}
