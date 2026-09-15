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
 * Bir ödülün **yüzdesini** yazar ve kalanı diğerlerine dağıtır.
 *
 * ── 🔴 Ağırlıktan yüzdeye (Ü124) ────────────────────────────
 *
 * Ü110'da kafe **ağırlık** yazıyordu, yüzde panelde türetiliyordu.
 * Gerekçe şuydu: yüzde girilseydi toplamın 100 olması gerekirdi ve her
 * ekleme/çıkarma bütün satırların elle yeniden hesaplanması demek
 * olurdu.
 *
 * Gerekçe doğruydu ama çözümü yanlış yerden aldı: kafe sahibine
 * "ağırlık" diye soyut bir sayı soruldu ve yanındaki yüzde okunurken
 * ikisi arasındaki ilişkiyi kurmak zorunda kaldı. Ürün sahibi:
 * *"Çarktaki ödüller ve yüzde kaç ihtimalle çıkacağı panelden
 * ayarlanmalı."*
 *
 * Şimdi kafe **yüzde** yazıyor ve kalan pay **oransal olarak**
 * diğerlerine dağıtılıyor — yani toplam her zaman 100. Elle yeniden
 * hesaplama sorunu ortadan kalkıyor çünkü hesabı biz yapıyoruz:
 *
 *   · Bir ödüle %40 yazıldı → kalan %60, diğerlerinin o anki
 *     oranları korunarak aralarında bölüşülüyor.
 *   · Yuvarlama kayması en büyük paya yazılıyor; toplam tam 100.
 *
 * ── ⚠️ Sıfır = çarkta çıkmaz ────────────────────────────────
 *
 * Ayrı bir "çarkta mı" anahtarı yok ve olmamalı: iki ayrı işaretleyici
 * (anahtar + yüzde) bir gün ayrışır ve "açık ama %0" diye anlamsız bir
 * durum üretirdi. Sıfır yazmak ödülü çarktan çıkarıyor, ekranda da
 * böyle yazıyor.
 *
 * ── ⚠️ Hepsi sıfır olamaz ───────────────────────────────────
 *
 * "Çarkta hiçbir ödül çıkmasın" geçerli bir yapılandırma değil: çark
 * dönecek bir şey bulamaz ve oyuncuya boş ekran kalır.
 */
export async function yaz(opts: {
  cafeId: string;
  odulId: string;
  /** Bu ödülün çıkma yüzdesi, 0–100. Sıfır = çarkta çıkmaz. */
  yuzde: number;
  aktorId: string;
}): Promise<Sonuc> {
  if (
    !Number.isInteger(opts.yuzde) ||
    opts.yuzde < 0 ||
    opts.yuzde > EN_COK_AGIRLIK
  ) {
    return { ok: false, hata: `Yüzde 0 ile ${EN_COK_AGIRLIK} arasında bir tam sayı olmalı.` };
  }

  const d = await durum(opts.cafeId);
  const hedef = d.satirlar.find((s) => s.odulId === opts.odulId);
  if (!hedef) {
    return { ok: false, hata: "Bu ödül şu an çarkta değil; yüzdesi de çarkı etkilemez." };
  }

  const digerler = d.satirlar.filter((s) => s.odulId !== opts.odulId);

  if (opts.yuzde === 0 && digerler.every((s) => s.etkin === 0)) {
    return {
      ok: false,
      hata: "En az bir ödülün yüzdesi sıfırdan büyük olmalı — yoksa çark dönecek bir şey bulamaz.",
    };
  }

  // ── Kalanı oransal böl ────────────────────────────────────
  const kalan = EN_COK_AGIRLIK - opts.yuzde;
  const digerToplam = digerler.reduce((t, s) => t + s.etkin, 0);

  const paylar = digerler.map((s) =>
    digerToplam > 0
      ? Math.round((s.etkin / digerToplam) * kalan)
      : // Hepsi sıfırdıysa oran yok; kalan eşit bölünüyor.
        Math.floor(kalan / digerler.length),
  );

  // Yuvarlama kayması en büyük paya yazılıyor: küçük paylara yazmak
  // yüzde 1'lik bir ödülü yüzde 2 yapıp oranı belirgin biçimde bozardı.
  const toplam = opts.yuzde + paylar.reduce((a, b) => a + b, 0);
  if (paylar.length > 0 && toplam !== EN_COK_AGIRLIK) {
    let enBuyuk = 0;
    for (let i = 1; i < paylar.length; i++) {
      if (paylar[i] > paylar[enBuyuk]) enBuyuk = i;
    }
    paylar[enBuyuk] = Math.max(0, paylar[enBuyuk] + (EN_COK_AGIRLIK - toplam));
  }

  await withCafe(opts.cafeId, async (db) => {
    // Hedef ve kalanlar aynı işlemde: ayrı olsaydı arada dönen bir çark
    // toplamı 100 olmayan bir listeyle karşılaşabilirdi.
    await db.query(`UPDATE rewards SET wheel_weight = $2 WHERE id = $1`, [
      opts.odulId,
      opts.yuzde,
    ]);
    for (let i = 0; i < digerler.length; i++) {
      await db.query(`UPDATE rewards SET wheel_weight = $2 WHERE id = $1`, [
        digerler[i].odulId,
        paylar[i],
      ]);
    }

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "reward.update",
      targetType: "reward",
      targetId: opts.odulId,
      detail: { carkYuzdesi: opts.yuzde, oncekiYuzde: hedef.yuzde },
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
