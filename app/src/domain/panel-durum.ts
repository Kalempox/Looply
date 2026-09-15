import { withCafe } from "@/db/context";
import { durum as butceDurumu } from "./butce";
import { bugunBeklenen } from "./beklenen";
import * as acil from "./acil";
import { istanbulDakikasi } from "@/lib/tarih";

/**
 * Panelin uyarıları ve önerileri (Ü101).
 *
 * ── Neden tek modül ─────────────────────────────────────────
 *
 * Panel görselinde iki ayrı yüzey var: sağ üstteki **çan** (kaç şey
 * dikkat bekliyor) ve alttaki **"bugünkü durum" / "önerimiz"** kartları.
 * İkisi de aynı soruya bakıyor — *"şu an neyin farkında olmalıyım?"* —
 * ve ayrı yazılsalardı biri bir gün diğerinden ayrışır, çan "3" derken
 * kartta iki madde görünürdü.
 *
 * ── ⚠️ Uyarılar SAKLANMIYOR, türetiliyor ────────────────────
 *
 * Okundu/okunmadı durumu tutan bir bildirim kutusu kurmadık. Buradaki
 * uyarıların hepsi **şu anki gerçeğin** ifadesi: konum yoksa uyarı var,
 * konum girilince uyarı kendiliğinden kayboluyor. Saklasaydık, işletmeci
 * sorunu çözdükten sonra da "okunmamış bildirim" taşımaya devam eder ve
 * çan bir süre sonra anlamını yitirirdi.
 *
 * ── ⚠️ Öneri uydurmuyor ─────────────────────────────────────
 *
 * Her öneri elimizdeki bir sayıya dayanıyor ve o sayıyı **söylüyor**.
 * "Bu akşam kampanya yap" gibi dayanağı olmayan bir cümle, panelin
 * güvenilirliğini bir kerede harcar. Dayanak yoksa öneri de yok — boş
 * liste dönmek, doldurmaktan iyi.
 */

export type Onem = "engel" | "dikkat" | "bilgi";

export type Uyari = {
  onem: Onem;
  baslik: string;
  aciklama: string;
  yol?: string;
};

export type Oneri = {
  metin: string;
  yol?: string;
};

export type PanelDurumu = {
  uyarilar: Uyari[];
  oneriler: Oneri[];
  /** Çanın rozeti — engel ve dikkat sayılıyor, bilgi sayılmıyor. */
  bekleyen: number;
  /** Üstteki "bugünkü durum" kartının tonu. */
  iyiMi: boolean;
};

export async function panelDurumu(cafeId: string, an: Date = new Date()): Promise<PanelDurumu> {
  const [temel, butce, beklenen, kuponDurduruldu] = await Promise.all([
    withCafe(cafeId, async (db) => {
      const kafe = await db.one<{ lat: number | null }>(`SELECT lat FROM cafes`);
      const masa = await db.one<{ n: string }>(`SELECT count(*) AS n FROM cafe_tables`);
      const odul = await db.one<{ n: string }>(
        `SELECT count(*) AS n FROM rewards WHERE active`,
      );
      const acikKupon = await db.one<{ n: string }>(
        `SELECT count(*) AS n FROM coupons
          WHERE status = 'active' AND expires_at > now()
            AND expires_at < now() + interval '2 days'`,
      );
      return {
        konumVar: kafe?.lat != null,
        masa: Number(masa?.n ?? 0),
        odul: Number(odul?.n ?? 0),
        yakindaDolan: Number(acikKupon?.n ?? 0),
      };
    }),
    butceDurumu(cafeId),
    bugunBeklenen(cafeId, an),
    acil.durduruldu(acil.ANAHTARLAR.kupon),
  ]);

  const uyarilar: Uyari[] = [];
  const oneriler: Oneri[] = [];

  // ── Engeller: bunlar varken kimse hiçbir şey kazanamıyor ──

  if (!temel.konumVar) {
    uyarilar.push({
      onem: "engel",
      baslik: "Kafenin konumu belirlenmemiş",
      aciklama: "Oyuncular konumlarını doğrulayamıyor; puan, ödül ve kupon hiç kazanılmıyor.",
      yol: "/kafe/panel/konum",
    });
  }

  if (temel.masa === 0) {
    uyarilar.push({
      onem: "engel",
      baslik: "Karekodun yok",
      aciklama: "Karekod olmadan oyuncu kafeye giremiyor.",
      yol: "/kafe/panel/karekod",
    });
  }

  if (temel.odul === 0) {
    uyarilar.push({
      onem: "engel",
      baslik: "Yayında ödül yok",
      aciklama: "Oyuncu oynuyor ama kazanacağı bir şey yok.",
      yol: "/kafe/panel/oduller",
    });
  }

  if (!butce.donem) {
    uyarilar.push({
      onem: "engel",
      baslik: "Bu dönemin bütçesi belirlenmemiş",
      aciklama: "Bütçe dönemi olmadan kupon üretilemiyor.",
      yol: "/kafe/panel/butce",
    });
  }

  /**
   * ⚠️ Acil durdurma bir **arıza değil**, bilinçli bir düğme (G18). Uyarı
   * metni suçlayıcı değil, hatırlatıcı: açık kaldığı unutulursa kafe
   * sebebini aramadan "sistem çalışmıyor" der.
   */
  if (kuponDurduruldu) {
    uyarilar.push({
      onem: "engel",
      baslik: "Kupon dağıtımı durdurulmuş",
      aciklama: "Platform tarafından durduruldu. Açılana kadar hiçbir kupon çıkmıyor.",
    });
  }

  // ── Dikkat: çalışıyor ama bir şey ters ───────────────────

  if (butce.donem && !butce.acikMi) {
    uyarilar.push({
      onem: "dikkat",
      baslik: "Kafe şu an kapalı",
      aciklama: "Çalışma saatlerin dışındayız; ödül dağıtılmıyor.",
      yol: "/kafe/panel/butce",
    });
  }

  if (butce.donem && butce.simdiKurus === 0 && butce.acikMi) {
    uyarilar.push({
      onem: "dikkat",
      baslik: "Şu an dağıtılabilir bütçe kalmadı",
      aciklama: "Yeni kupon çıkmıyor. Kullanılmayan kuponların süresi dolunca bütçeye döner.",
      yol: "/kafe/panel/butce",
    });
  }

  if (temel.yakindaDolan > 0) {
    uyarilar.push({
      onem: "bilgi",
      baslik: `${temel.yakindaDolan} kuponun süresi iki gün içinde doluyor`,
      aciklama: "Kullanılmazsa tutarları bütçene geri döner.",
    });
  }

  // ── Öneriler ─────────────────────────────────────────────

  /**
   * Görseldeki öneri buydu: *"Hâlâ 6 beklenen müşteriniz var. Bu akşam
   * için masa QR'ları daha görünür hale getirebilirsiniz."*
   *
   * ⚠️ Yalnızca **tahmin üretilebildiğinde** ve gerçekten bir fark
   * kaldığında yazılıyor. Veri yetmiyorsa öneri de yok.
   */
  if (beklenen.yeterliVeri) {
    const kalan = beklenen.ust - beklenen.gerceklesen;
    const saat = Math.floor(istanbulDakikasi(an) / 60);
    if (kalan > 0 && saat >= 16) {
      oneriler.push({
        metin: `Bugün ${kalan} müşteri daha bekleniyor. Akşam saatlerinde karekodunun görünür olduğundan emin ol.`,
        yol: "/kafe/panel/karekod",
      });
    }
  }

  const taahhut = butce.donem?.taahhutKurus ?? 0;
  if (taahhut > 0) {
    const kullanilanOran = (butce.harcananKurus + butce.rezerveKurus) / taahhut;
    const saat = Math.floor(istanbulDakikasi(an) / 60);
    // Gün ilerlemişken bütçenin çoğu duruyorsa, ödül dağıtımı zayıf demektir.
    if (saat >= 18 && kullanilanOran < 0.3) {
      oneriler.push({
        metin: `Bugünkü bütçenin yalnızca %${Math.round(kullanilanOran * 100)}'i bağlandı. Ödül değerlerini ya da happy hour saatlerini gözden geçirebilirsin.`,
        yol: "/kafe/panel/oduller",
      });
    }
  }

  const bekleyen = uyarilar.filter((u) => u.onem !== "bilgi").length;

  return {
    uyarilar,
    oneriler,
    bekleyen,
    iyiMi: bekleyen === 0,
  };
}
