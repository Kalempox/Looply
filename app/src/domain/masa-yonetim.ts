import { randomBytes } from "node:crypto";
import { withCafe } from "@/db/context";
import { newId } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { basiliKod } from "./qr";

/**
 * Masa ve karekod yönetimi — D11.
 *
 * ── Neden bu ekran gerekiyordu ──────────────────────────────
 *
 * Masalar yalnızca geliştirme tohumuyla üretiliyordu. Gerçek bir kafe
 * başvurusunu onaylatıp panele girdiğinde **hiç masası olmuyor**, dolayısıyla
 * yapıştıracak karekodu da yok — ürünün giriş kapısı hiç açılmıyor.
 *
 * ── Karekod neden değişmez ──────────────────────────────────
 *
 * Kod `qr_secret`ten türüyor ve sır bir kez üretiliyor. Değişebilseydi
 * masaya yapıştırılmış her etiket bir gün sessizce ölürdü; kafe sahibi de
 * bunu ancak müşteri "çalışmıyor" dediğinde öğrenirdi.
 *
 * Bu yüzden masa **silinmiyor, kapatılıyor**: kapatılan masanın kodu
 * çözümlenmiyor ama satır duruyor, geçmiş raporlar bozulmuyor.
 *
 * ── Kodun fotoğrafı paylaşılırsa ────────────────────────────
 *
 * Bu katman onu durdurmuyor; durduran K2 (konum doğrulama). Basılı kod
 * tahmin edilemez olmak zorunda ama gizli olmak zorunda değil — 16 hex hane,
 * `qr_secret`in ilk 8 baytı.
 */

export type MasaSatiri = {
  id: string;
  ad: string;
  kod: string;
  aktif: boolean;
  sira: number;
};

export type MasaSonucu = { ok: true; id: string } | { ok: false; hata: string };

/** Kafenin masaları — kapalılar dahil, sıralı. */
export async function listele(cafeId: string): Promise<MasaSatiri[]> {
  const satirlar = await withCafe(cafeId, (db) =>
    db.all<{ id: string; label: string; qr_secret: Buffer; active: boolean; sort_order: number }>(
      `SELECT id, label, qr_secret, active, sort_order
         FROM cafe_tables ORDER BY sort_order, label`,
    ),
  );

  return satirlar.map((r) => ({
    id: r.id,
    ad: r.label,
    kod: basiliKod(r.qr_secret),
    aktif: r.active,
    sira: r.sort_order,
  }));
}

/**
 * Masa ekler.
 *
 * `qr_secret` **sunucuda** üretiliyor: istemciden gelseydi kafe yöneticisi
 * tahmin edilebilir bir sır yazabilir ve kendi masalarının kodunu üretilebilir
 * hâle getirebilirdi.
 */
export async function ekle(opts: {
  cafeId: string;
  ad: string;
  aktorId: string;
}): Promise<MasaSonucu> {
  const ad = opts.ad.trim();

  if (ad.length < 1) return { ok: false, hata: "Masaya bir ad ver." };
  if (ad.length > 40) return { ok: false, hata: "Masa adı en fazla 40 karakter olabilir." };

  return withCafe(opts.cafeId, async (db) => {
    const cakisma = await db.one(`SELECT 1 FROM cafe_tables WHERE label = $1`, [ad]);
    if (cakisma) return { ok: false as const, hata: "Bu adda bir masa zaten var." };

    const sira = await db.one<{ n: number }>(
      `SELECT COALESCE(max(sort_order), -1) + 1 AS n FROM cafe_tables`,
    );

    const id = newId("tbl");
    await db.query(
      `INSERT INTO cafe_tables (id, cafe_id, label, sort_order, qr_secret)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, opts.cafeId, ad, sira?.n ?? 0, randomBytes(16)],
    );

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "table.create",
      targetType: "cafe_table",
      targetId: id,
      // Anahtar `ad` değil `masaEtiketi`: `lib/log.ts` "ad" alanını yasaklı
      // sayıyor ve haklı — kural alan adına bakıyor, "bu sefer masanın adı"
      // gibi bir istisna tanımıyor. Kuralı gevşetmek yerine anahtarı
      // netleştiriyoruz; masa etiketi ("Masa 7") kişisel veri değil.
      detail: { masaEtiketi: ad },
    });

    return { ok: true as const, id };
  });
}

/**
 * Masayı kapatır veya yeniden açar.
 *
 * Silmek yerine kapatmak: silinen masanın geçmiş oyun oturumları ve raporları
 * sahipsiz kalırdı. Kapalı masanın karekodu `masaCoz` tarafından çözülmüyor,
 * yani yapıştırılmış etiket çalışmaz hâle geliyor — ama defter bozulmuyor.
 */
export async function durumDegistir(opts: {
  cafeId: string;
  tableId: string;
  aktif: boolean;
  aktorId: string;
}): Promise<MasaSonucu> {
  return withCafe(opts.cafeId, async (db) => {
    const r = await db.query(`UPDATE cafe_tables SET active = $2 WHERE id = $1`, [
      opts.tableId,
      opts.aktif,
    ]);
    // RLS zaten başka kafenin masasını göstermiyor; sıfır satır "bu masa
    // senin değil" demek.
    if (!r.rowCount) return { ok: false as const, hata: "Masa bulunamadı." };

    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: opts.aktif ? "table.enable" : "table.disable",
      targetType: "cafe_table",
      targetId: opts.tableId,
    });

    return { ok: true as const, id: opts.tableId };
  });
}

/* ── Kullanım (Ü62) ────────────────────────────────────────── */

export type MasaKullanimi = {
  masaAdi: string;
  /** Son yedi günde bu masada tamamlanan oyun. */
  oyun: number;
  /** Kaç farklı gün kullanıldı — "her gün mü, bir kez mi" sorusu. */
  gun: number;
};

/**
 * Son yedi günün masa kullanımı.
 *
 * ── Neden bu ekranda ────────────────────────────────────────
 *
 * Masalar ekranı "hangi masa var" sorusunu cevaplıyordu; kafe sahibinin
 * asıl merak ettiği **hangi masa çalışıyor**. Camdaki masaya yapıştırılan
 * kodun hiç okutulmadığını görmek, kodu taşımak için tek sebep.
 *
 * ── Mahremiyet eşiği (Ü30) burada YOK ───────────────────────
 *
 * Eşik oyuncu **sayısını** koruyor: "saat 14'te 2 oyuncu" satırı kişiyi
 * işaret edebilir. Burada oyuncu sayılmıyor, oyun sayılıyor — kaç kez
 * oynandığı kimseyi işaret etmiyor ve kafe zaten masasında kimin
 * oturduğunu görüyor.
 */
export async function kullanim(cafeId: string, gunSayisi = 7): Promise<MasaKullanimi[]> {
  return withCafe(cafeId, async (db) => {
    const satirlar = await db.all<{ masa: string; oyun: string; gun: string }>(
      `SELECT t.label AS masa,
              count(ps.id) AS oyun,
              count(DISTINCT ps.business_date) AS gun
         FROM cafe_tables t
         LEFT JOIN play_sessions ps
                ON ps.table_id = t.id
               AND ps.status = 'completed'
               AND ps.business_date > (CURRENT_DATE - $1::int)
        WHERE t.active
        GROUP BY t.id, t.label
        ORDER BY count(ps.id) DESC, t.sort_order`,
      [gunSayisi],
    );

    return satirlar.map((r) => ({
      masaAdi: r.masa,
      oyun: Number(r.oyun),
      gun: Number(r.gun),
    }));
  });
}
