import { withBypass, withCafe } from "@/db/context";
import { audit } from "@/lib/audit";
import { isGunu } from "@/lib/tarih";
import * as cark from "./cark";

/**
 * Çark olasılıkları — Ü110.
 *
 * Ürün sahibi: *"kafeler kendi panelinde, kendi QR kodu okutulduğunda
 * çarkın içinden hangi ödül yüzde kaç ihtimalle çıkacak belirlemeli."*
 *
 * ── Yüzde değil ağırlık ─────────────────────────────────────
 *
 * Kafe **ağırlık** yazıyor, yüzde panelde türetiliyor. Doğrudan yüzde
 * girilseydi toplamın 100 olması gerekirdi ve her ödül ekleme/çıkarma
 * bütün satırların elle yeniden hesaplanması demek olurdu. Ağırlık
 * sıradan bağımsız; Ü103 ile de tutarlı — günlük adedi dolan ödül
 * çarktan düşünce kalanların yüzdesi kendiliğinden yeniden dağılıyor.
 *
 * ── ⚠️ Panel yalnızca ÇARKA GİREN ödülleri gösteriyor ───────
 *
 * Üç sebeple bir ödül çarkta olmayabilir: çark üst sınırının üstünde
 * (`cark_ust_sinir_kurus`), günlük adedi dolmuş (Ü103) ya da çarkın
 * dilim sayısını aşmış (Ü49: en ucuz sekiz ödül). Üçü de ekranda ayrı
 * ayrı yazılıyor — kafe bir ödüle ağırlık verip onun hiç çıkmadığını
 * görmemelidir. Ü103'te kapatılan "çark yalan söylüyor" açığının aynısı.
 */

/** Ağırlık için izin verilen aralık — göç 0034'teki kısıtla aynı. */
export const EN_COK_AGIRLIK = 100;

export type AgirlikSatiri = {
  odulId: string;
  baslik: string;
  kurusDegeri: number;
  /** Kafenin yazdığı değer. `null` = otomatik. */
  agirlik: number | null;
  /** Çekilişte fiilen kullanılan ağırlık. */
  etkin: number;
  /** Türetilmiş yüzde — o anki toplam üzerinden. */
  yuzde: number;
};

export type DisSebep = "ust_sinir" | "gunluk_doldu" | "dilim_disi";

export type DisSatiri = {
  odulId: string;
  baslik: string;
  kurusDegeri: number;
  sebep: DisSebep;
};

export type Durum = {
  satirlar: AgirlikSatiri[];
  disarida: DisSatiri[];
  toplam: number;
  /** Hiçbir ağırlık yazılmamışsa true — sıraya dayalı dağılım işliyor. */
  otomatikMi: boolean;
  ustSinirKurus: number;
};

type HamOdul = {
  id: string;
  title: string;
  cost_kurus: string;
  daily_limit: number | null;
  bugun: string;
};

/**
 * Panelin gördüğü tablo.
 *
 * Çarka giren liste `cark.odulleriOku` + `cark.dilimleriYay`ten geliyor —
 * çekilişin kullandığı **aynı** iki fonksiyon. Panel kendi listesini
 * kursaydı ekrandaki yüzdelerle gerçek olasılıklar sessizce ayrışırdı.
 */
export async function durum(cafeId: string): Promise<Durum> {
  const ustSinirKurus = await cark.ustSinir(cafeId);

  return withBypass("çark ağırlıkları — panel", async (db) => {
    const carktakiler = await cark.odulleriOku(db, cafeId, ustSinirKurus);

    // `dilimleriYay` aynı ödülü tekrar edebiliyor (az ödüllü kafede);
    // çekiliş de benzersizler üzerinden yapılıyor (`cark.sec`).
    const gorunen: cark.Dilim[] = [];
    for (const d of cark.dilimleriYay(carktakiler)) {
      if (!gorunen.some((g) => g.odulId === d.odulId)) gorunen.push(d);
    }

    const kovalar = cark.agirliklar(gorunen);
    const toplam = kovalar.reduce((t, k) => t + k, 0);

    const satirlar: AgirlikSatiri[] = gorunen.map((d, i) => ({
      odulId: d.odulId,
      baslik: d.baslik,
      kurusDegeri: d.kurusDegeri,
      agirlik: d.agirlik,
      etkin: kovalar[i],
      // Toplam sıfır olamaz (`agirliklar` otomatiğe düşüyor) ama bölmeden
      // önce korumak, bir gün o garanti gevşerse NaN'ı ekrana taşımamak.
      yuzde: toplam > 0 ? Math.round((kovalar[i] / toplam) * 100) : 0,
    }));

    // ── Çarka giremeyenler ve sebepleri ──────────────────────
    const hepsi = await db.all<HamOdul>(
      `SELECT r.id, r.title, r.cost_kurus, r.daily_limit,
              (SELECT count(*) FROM coupons c
                WHERE c.reward_id = r.id
                  AND c.status <> 'undone'
                  AND c.issued_at >= ($2::date::timestamp AT TIME ZONE 'Europe/Istanbul')
              )::text AS bugun
         FROM rewards r
        WHERE r.cafe_id = $1 AND r.kind = 'instant' AND r.active
        ORDER BY r.cost_kurus, r.id`,
      [cafeId, isGunu()],
    );

    const icerideki = new Set(gorunen.map((g) => g.odulId));
    const disarida: DisSatiri[] = [];

    for (const r of hepsi) {
      if (icerideki.has(r.id)) continue;

      const kurus = Number(r.cost_kurus);
      const sebep: DisSebep =
        kurus > ustSinirKurus
          ? "ust_sinir"
          : r.daily_limit != null && Number(r.bugun) >= r.daily_limit
            ? "gunluk_doldu"
            : "dilim_disi";

      disarida.push({ odulId: r.id, baslik: r.title, kurusDegeri: kurus, sebep });
    }

    return {
      satirlar,
      disarida,
      toplam,
      otomatikMi: gorunen.every((g) => g.agirlik == null),
      ustSinirKurus,
    };
  });
}

/** Sebebin kafeye söylenecek hâli. */
export function sebepMetni(s: DisSebep, ustSinirKurus: number): string {
  switch (s) {
    case "ust_sinir":
      return `Çark üst sınırının (${ustSinirKurus / 100} TL) üstünde — ayarlardan değiştirilebilir.`;
    case "gunluk_doldu":
      return "Bugünkü adedi doldu; yarın yeniden çarka giriyor.";
    case "dilim_disi":
      return `Çarkta en fazla ${cark.DILIM_SAYISI} ödül gösteriliyor ve bu, en ucuz ${cark.DILIM_SAYISI} arasına girmedi.`;
  }
}

export type Sonuc = { ok: true } | { ok: false; hata: string };

/**
 * Bir ödülün ağırlığını yazar.
 *
 * ── ⚠️ İlk yazımda kalanlar da SABİTLENİYOR ─────────────────
 *
 * Kafe ilk ağırlığı yazdığında diğer ödüllerin ağırlıkları o anki
 * otomatik dağılımdan dolduruluyor. Yarısı otomatik yarısı elle bir
 * liste, panelde gösterilen yüzdeyi açıklanamaz yapardı: kafe 90 yazıp
 * %47 görürdü. Sabitlemeden sonra aritmetik görünür — 90 yazan 90/toplam
 * görüyor.
 *
 * Sabitleme o anki dağılımı birebir koruyor, yani ilk yazımın kendisi
 * diğer ödüllerin olasılığını değiştirmiyor.
 *
 * ── ⚠️ Hepsi sıfır olamaz ───────────────────────────────────
 *
 * "Çarkta hiçbir ödül çıkmasın" geçerli bir yapılandırma değil: çark
 * dönecek bir şey bulamaz ve oyuncuya boş ekran kalır. Kafe çarkı
 * kapatmak istiyorsa ödülleri kapatır ya da üst sınırı indirir — ikisi de
 * ekranda ne olduğunu söyleyen kararlar.
 */
export async function yaz(opts: {
  cafeId: string;
  odulId: string;
  agirlik: number;
  aktorId: string;
}): Promise<Sonuc> {
  if (
    !Number.isInteger(opts.agirlik) ||
    opts.agirlik < 0 ||
    opts.agirlik > EN_COK_AGIRLIK
  ) {
    return { ok: false, hata: `Ağırlık 0 ile ${EN_COK_AGIRLIK} arasında bir tam sayı olmalı.` };
  }

  const d = await durum(opts.cafeId);
  const hedef = d.satirlar.find((s) => s.odulId === opts.odulId);
  if (!hedef) {
    return { ok: false, hata: "Bu ödül şu an çarkta değil; ağırlığı da çarkı etkilemez." };
  }

  const sonrasi = d.satirlar.map((s) =>
    s.odulId === opts.odulId ? opts.agirlik : s.etkin,
  );
  if (sonrasi.every((a) => a === 0)) {
    return {
      ok: false,
      hata: "En az bir ödülün ağırlığı sıfırdan büyük olmalı — yoksa çark dönecek bir şey bulamaz.",
    };
  }

  await withCafe(opts.cafeId, async (db) => {
    // Sabitleme ve yazım aynı işlemde: ayrı olsaydı arada dönen bir çark
    // yarı sabitlenmiş bir listeyle karşılaşabilirdi.
    for (const s of d.satirlar) {
      const deger = s.odulId === opts.odulId ? opts.agirlik : s.etkin;
      await db.query(`UPDATE rewards SET wheel_weight = $2 WHERE id = $1`, [s.odulId, deger]);
    }

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.update",
      targetType: "reward",
      targetId: opts.odulId,
      detail: { carkAgirligi: opts.agirlik, oncekiEtkin: hedef.etkin },
    });
  });

  return { ok: true };
}

/**
 * Bütün ağırlıkları otomatiğe döndürür.
 *
 * Satır silinmiyor, `wheel_weight` NULL yapılıyor — "otomatik" bir değer
 * değil, **değer yokluğu** (göç 0034). İki ayrı işaretleyici (mod kolonu +
 * ağırlık) tutmak, ikisinin bir gün ayrışması demek olurdu.
 *
 * Kapalı ve çark dışı ödüller de sıfırlanıyor: kafe "otomatiğe dön"
 * dediğinde geride yarın çarka girecek gizli bir ağırlık kalmamalı.
 */
export async function otomatigeDon(opts: { cafeId: string; aktorId: string }): Promise<Sonuc> {
  await withCafe(opts.cafeId, async (db) => {
    await db.query(
      `UPDATE rewards SET wheel_weight = NULL
        WHERE kind = 'instant' AND wheel_weight IS NOT NULL`,
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.update",
      targetType: "reward",
      detail: { carkAgirligi: "otomatige_donduruldu" },
    });
  });

  return { ok: true };
}
