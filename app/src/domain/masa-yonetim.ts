import { randomBytes } from "node:crypto";
import { withCafe } from "@/db/context";
import { newId } from "@/lib/ids";
import { basiliKod, kodUret } from "./qr";

/**
 * Kafenin karekodu — Ü127.
 *
 * ── Bu dosya küçüldü ────────────────────────────────────────
 *
 * Burası masa yönetimiydi (D11, Ü108): kafe masa ekliyor, adlandırıyor,
 * dört türe ayırıyor (masa/kasa/menü/fiş), açıp kapatıyor ve son yedi
 * günün masa kullanımını görüyordu. Ürün sahibi kavramı kaldırdı —
 * *"masa kavramına gerek yok, her kafe için 1 qr."*
 *
 * Kalan tek iş: **kafenin tek karekodunu vermek.** `ekle`,
 * `durumDegistir`, `listele` ve `kullanim` silindi; hiçbir yerden
 * çağrılmıyorlardı ve masa kavramıyla birlikte anlamlarını yitirdiler.
 * `karekod-turu.ts` de silindi — tek karekodun türü olmaz.
 *
 * ── Tablo duruyor ───────────────────────────────────────────
 *
 * `cafe_tables` şemada kalıyor: `qr_tokens.table_id` ve `play_sessions`
 * ona bakıyor, düşürseydik geçmiş oturumlar sahipsiz kalırdı. Kafe artık
 * o tabloyu hiç görmüyor; kafe başına tek satır var ve kuralı
 * veritabanı tutuyor (`cafe_tables_tek_aktif`, göç 0038).
 *
 * ⚠️ `domain/masa.ts` BAŞKA bir şey ve ona dokunulmadı: adı masa olsa da
 * oyuncunun **oturumunu** ve kanıt seviyelerini (K1/K2/K3) yönetiyor.
 *
 * ── Karekod neden değişmez ──────────────────────────────────
 *
 * Kod `qr_secret`ten türüyor ve sır bir kez üretiliyor. Değişebilseydi
 * duvara asılmış etiket bir gün sessizce ölürdü; kafe sahibi de bunu
 * ancak müşteri "çalışmıyor" dediğinde öğrenirdi.
 *
 * ── Kodun fotoğrafı paylaşılırsa ────────────────────────────
 *
 * Bu katman onu durdurmuyor; durduran K2 (konum doğrulama). Basılı kod
 * tahmin edilemez olmak zorunda ama gizli olmak zorunda değil.
 *
 * ⚠️ Ü247'den beri iki biçim var: yeni kodlar `kafe-a-7f3k9x2m`
 * (ad + rastgele ek, `print_code` kolonunda), eskiler 16 hex hane
 * (`qr_secret`in ilk 8 baytı). Seçimi `domain/qr.basiliKod` yapıyor.
 */

export type Karekod = {
  id: string;
  /** Kafenin adı — kartın üstünde yazan. */
  ad: string;
  /** Basılı kod; `/m/{kod}` adresine giriyor. */
  kod: string;
};

/**
 * Kafenin tek karekodu. Yoksa geri açılıyor, hiç yoksa üretiliyor.
 *
 * ⚠️ **Sıra önemli: önce geri açmayı dene, sonra üret.** Doğrudan yeni
 * satır üretmek iki şeyi bozuyordu:
 *
 *   1. `(cafe_id, label)` tekil ve göç 0038 kalan satırın etiketini
 *      kafenin adı yaptı — aynı adla ikinci satır **reddedilir**, kafe
 *      karekodsuz kalırdı. Bu tam olarak yaşandı: `ON CONFLICT DO NOTHING`
 *      hatayı yutuyor ve fonksiyon "üretilemedi" diye düşüyordu.
 *   2. Yeni satır yeni `qr_secret` demek, yani **yeni basılı kod** —
 *      asılmış etiket sessizce ölürdü.
 *
 * En küçük `sort_order` seçiliyor: 0038'in bıraktığı satır sıfırda.
 */
export async function kafeKarekodu(cafeId: string): Promise<Karekod> {
  const oku = () =>
    withCafe(cafeId, (db) =>
      db.one<{ id: string; label: string; qr_secret: Buffer; print_code: string | null }>(
        `SELECT id, label, qr_secret, print_code FROM cafe_tables WHERE active LIMIT 1`,
      ),
    );

  let r = await oku();

  if (!r) {
    await withCafe(cafeId, async (db) => {
      const kafe = await db.one<{ name: string }>(`SELECT name FROM cafes`);
      const ad = kafe?.name ?? "Karekod";
      const aday = await db.one<{ id: string }>(
        `SELECT id FROM cafe_tables ORDER BY sort_order, created_at, id LIMIT 1`,
      );

      if (aday) {
        /* Var olanı geri aç: basılı kod korunuyor.

           🔴 `print_code` BURADA DOLDURULMUYOR ve bu kasten. Satır
           zaten varsa kodu da basılmış olabilir; yeni bir kod yazmak
           panelin gösterdiği kodu duvardakinden ayırırdı. Eski kod
           `masaCoz`ta hâlâ geçerli (Ü247), yani kimse bir şey
           kaybetmiyor. */
        await db.query(
          `UPDATE cafe_tables SET active = true, label = $2, sort_order = 0 WHERE id = $1`,
          [aday.id, ad],
        );
        return;
      }

      // Hiç satır yok — kafenin ilk karekodu. `ON CONFLICT DO NOTHING`
      // yalnızca iki sekmenin aynı anda üretmeye kalkma yarışı için.
      await db.query(
        `INSERT INTO cafe_tables (id, cafe_id, label, sort_order, qr_secret, kind, print_code)
         VALUES ($1,$2,$3,0,$4,'masa',$5)
         ON CONFLICT DO NOTHING`,
        [newId("tbl"), cafeId, ad, randomBytes(16), kodUret(ad)],
      );
    });
    r = await oku();
  }

  if (!r) throw new Error("kafeKarekodu: karekod üretilemedi");

  return { id: r.id, ad: r.label, kod: basiliKod(r) };
}
