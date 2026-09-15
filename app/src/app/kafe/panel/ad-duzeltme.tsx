"use client";

import { useActionState, useState } from "react";
import { IsletmeAlan, IsletmeUyari, isletmeGirdi, isletmeMiniDugme } from "@/components/isletme";

/**
 * Ad düzeltme kutusu — ödül ve ürün panelleri ortak kullanıyor (Ü94).
 *
 * ⚠️ Bugüne kadar yazım hatasının tek çaresi kaldırıp yeniden eklemekti ve
 * hata sahada zaten yaşandı: kafe "Ice Americano" yerine **"ize amreicano"**
 * yazdı (Ü75). Yeniden eklemek ödülün geçmişini — kaç kez kazanıldığını,
 * hangi kuponlara bağlı olduğunu — kaybetmek demek.
 *
 * ── Neden yalnızca ad ───────────────────────────────────────
 *
 * Değer, tip, fiyat ve kategori bu kutuda **yok**. Ad düzeltmesi ile
 * ekonomi değişikliği aynı düğmeye bağlansaydı, yazım hatası düzeltmek
 * isteyen kafe yanlışlıkla dolaşımdaki kuponların değerini değiştirebilirdi.
 *
 * ── Neden kapalı başlıyor ───────────────────────────────────
 *
 * Satırın yanında duran açık bir metin kutusu, listeyi bir forma çevirir ve
 * yanlışlıkla yazmayı kolaylaştırır. Ad düzeltmesi nadir bir iş: istendiğinde
 * açılıyor.
 *
 * ⚠️ Kaç kuponun etkileneceği **açılır açılmaz** yazıyor, kaydettikten sonra
 * değil. Kafe sonucu görmeden değiştirmemeli: ad değişikliği dolaşımdaki
 * kuponların gösterdiği metni de değiştiriyor (kupon adı kopyasını tutmuyor,
 * satırdan okuyor).
 */

export type AdDurumu = { hata?: string; bilgi?: string; sira?: number };

export function AdDuzeltme({
  eylem,
  kimlikAlani,
  kimlik,
  adAlani,
  mevcutAd,
  aciklamaAlani,
  mevcutAciklama,
  acikKupon,
  etiket = "Ad",
}: {
  eylem: (onceki: AdDurumu, form: FormData) => Promise<AdDurumu>;
  /** Gizli alanın adı — `odulId` ya da `urunId`. */
  kimlikAlani: string;
  kimlik: string;
  /** Ad alanının adı — `baslik` ya da `ad`. */
  adAlani: string;
  mevcutAd: string;
  /** Ödülde açıklama da düzeltiliyor; üründe yok. */
  aciklamaAlani?: string;
  mevcutAciklama?: string | null;
  acikKupon: number;
  etiket?: string;
}) {
  const [durum, action, bekliyor] = useActionState(eylem, {} as AdDurumu);

  /**
   * Kutu, açıldığı andaki sıra numarasını tutuyor; eylem başarıyla
   * kaydedince numara artıyor ve kutu kendiliğinden kapanıyor.
   *
   * ⚠️ İlk hâli bunu `useEffect` içinde `setAcik(false)` ile yapıyordu ve
   * lint reddetti (`set-state-in-effect`) — kural haklı: efektte durum
   * yazmak fazladan bir çizim turu demek. Mesaj **metnine** bakmak da
   * yetmiyordu; arka arkaya iki düzeltmede metin aynı çıkıyor ve kutu
   * ikincisinde kapanmıyordu. Hata durumunda numara artmıyor: kutu açık
   * kalıyor ve kafe yazdığını düzeltebiliyor.
   */
  const [acilisSirasi, setAcilisSirasi] = useState<number | null>(null);
  const acik = acilisSirasi !== null && (durum.sira ?? 0) === acilisSirasi;

  if (!acik) {
    return (
      <span className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setAcilisSirasi(durum.sira ?? 0)}
          className={isletmeMiniDugme}
        >
          Adı düzelt
        </button>
        {durum.bilgi && (
          <span className="text-[11px] leading-tight text-yazi-sonuk">{durum.bilgi}</span>
        )}
      </span>
    );
  }

  return (
    <form action={action} className="mt-2 w-full space-y-3 rounded-xl bg-cukur px-4 py-4">
      <input type="hidden" name={kimlikAlani} value={kimlik} />

      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}

      <IsletmeAlan
        etiket={etiket}
        ipucu="Yalnızca yazım düzeltiliyor. Değer, tür ve fiyat değişmiyor."
      >
        <input
          name={adAlani}
          type="text"
          defaultValue={mevcutAd}
          maxLength={60}
          autoFocus
          className={isletmeGirdi}
        />
      </IsletmeAlan>

      {aciklamaAlani && (
        <IsletmeAlan etiket="Açıklama">
          <input
            name={aciklamaAlani}
            type="text"
            defaultValue={mevcutAciklama ?? ""}
            maxLength={160}
            className={isletmeGirdi}
          />
        </IsletmeAlan>
      )}

      {/* ⚠️ Sonucu önceden söyle. Kupon adı kopyasını tutmuyor, satırdan
          okuyor — yani düzeltme dolaşımdaki kuponlara da yansıyor. Yazım
          hatası için istenen davranış bu, ama kafe bilmeden yapmamalı. */}
      {acikKupon > 0 && (
        <p className="text-[12px] leading-relaxed text-yazi-sonuk">
          Bu adı dolaşımdaki{" "}
          <strong className="text-odul-koyu">{acikKupon} açık kupon</strong> da gösteriyor;
          onlar da yeni adı gösterecek.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={bekliyor}
          className="etiket-caps rounded-lg bg-vurgu px-4 py-2 text-white disabled:opacity-50"
        >
          {bekliyor ? "…" : "Kaydet"}
        </button>
        <button
          type="button"
          onClick={() => setAcilisSirasi(null)}
          className="etiket-caps text-yazi-sonuk underline"
        >
          vazgeç
        </button>
      </div>
    </form>
  );
}
