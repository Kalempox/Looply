"use client";

import { useActionState, useState, useTransition } from "react";
import { ekleEylemi, durumEylemi, esikEylemi, type OdulDurumu, type EsikDurumu } from "./actions";
import { IsletmeDugme, IsletmeAlan, isletmeGirdi, IsletmeUyari } from "@/components/isletme";

const BOS: OdulDurumu = {};

/**
 * Ödül ekleme formu.
 *
 * Form, tipe göre **şekil değiştiriyor**: ürün ödülünde TL değeri, yüzdeli
 * ödülde oran + TL tavanı, tutar indiriminde indirimin kendisi isteniyor.
 * Tek bir uzun formda hepsini gösterip "boş bırak" demek, kafe sahibini
 * yanlış doldurmaya davet ederdi.
 *
 * Kanıt seviyesi formda **yok**: E6 onu tutardan hesaplıyor. Kafe seçebilseydi
 * en pahalı ödülü en zayıf kanıtla verebilirdi.
 */
export function OdulEkleme({ urunler }: { urunler: { id: string; ad: string }[] }) {
  const [durum, action, bekliyor] = useActionState(ekleEylemi, BOS);
  const [tip, setTip] = useState<"product" | "percent" | "amount">("product");
  const [anlik, setAnlik] = useState(false);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <IsletmeAlan etiket="Ödül tipi">
        <div className="flex gap-1 rounded-lg border border-cizgi p-1">
          <TipDugmesi secili={tip === "product"} onSec={() => setTip("product")}>
            🏆 Ürün
          </TipDugmesi>
          <TipDugmesi secili={tip === "percent"} onSec={() => setTip("percent")}>
            🎟️ Yüzde
          </TipDugmesi>
          <TipDugmesi secili={tip === "amount"} onSec={() => setTip("amount")}>
            💸 Tutar
          </TipDugmesi>
        </div>
      </IsletmeAlan>
      <input type="hidden" name="tip" value={tip} />

      <IsletmeAlan etiket="Ödül adı">
        <input
          name="baslik"
          className={isletmeGirdi}
          placeholder={
            tip === "product"
              ? "Ücretsiz filtre kahve"
              : tip === "percent"
                ? "Tatlıda %20 indirim"
                : "50 TL indirim"
          }
          maxLength={60}
        />
      </IsletmeAlan>

      {urunler.length > 0 && (
        <IsletmeAlan etiket="Hangi ürün" ipucu="İsteğe bağlı — raporlarda ödülü ürüne bağlar.">
          <select name="urunId" className={isletmeGirdi} defaultValue="">
            <option value="">Seçme</option>
            {urunler.map((u) => (
              <option key={u.id} value={u.id}>
                {u.ad}
              </option>
            ))}
          </select>
        </IsletmeAlan>
      )}

      {tip === "percent" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <IsletmeAlan etiket="İndirim oranı (%)">
            <input
              name="yuzde"
              type="text"
              inputMode="numeric"
              className={isletmeGirdi}
              placeholder="20"
            />
          </IsletmeAlan>
          <IsletmeAlan
            etiket="En fazla indirim (TL)"
            ipucu="Zorunlu. Bütçeden bu tutar rezerve edilir; kasada gerçekleşen düşülür, fark geri döner."
          >
            <input
              name="tutar"
              type="text"
              inputMode="numeric"
              className={isletmeGirdi}
              placeholder="100"
            />
          </IsletmeAlan>
        </div>
      ) : (
        <IsletmeAlan
          etiket={tip === "amount" ? "İndirim tutarı (TL)" : "Ödülün TL değeri"}
          ipucu={
            tip === "amount"
              ? "Adisyondan bir kez düşülür. Kalan tutar saklanmaz, sonraki ziyarete devretmez — bu bir bakiye değil (Ü18)."
              : "Ürünün perakende fiyatı. Kasada onaylandığında bütçeden bu kadar düşer."
          }
        >
          <input
            name="tutar"
            type="text"
            inputMode="numeric"
            className={isletmeGirdi}
            placeholder={tip === "amount" ? "50" : "45"}
          />
        </IsletmeAlan>
      )}

      <label className="flex items-start gap-2.5 text-[14px] leading-relaxed text-yazi">
        <input
          type="checkbox"
          name="anlik"
          value="evet"
          checked={anlik}
          onChange={(e) => setAnlik(e.target.checked)}
          className="mt-1"
        />
        <span>
          <strong>Anlık ödül</strong> — puan istemez, ilk doğrulanmış oyundan sonra otomatik
          düşer. İlk kez oynayanın puanı sıfırdır; eli boş çıkmasın diye.
        </span>
      </label>

      {!anlik && (
        <IsletmeAlan etiket="Puan fiyatı" ipucu="Oyuncunun bu ödülü almak için biriktireceği puan.">
          <input
            name="puan"
            type="text"
            inputMode="numeric"
            className={isletmeGirdi}
            placeholder="6000"
          />
        </IsletmeAlan>
      )}

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Ekleniyor…" : "Kataloğa ekle"}
      </IsletmeDugme>
    </form>
  );
}

function TipDugmesi({
  secili,
  onSec,
  children,
}: {
  secili: boolean;
  onSec: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSec}
      aria-pressed={secili}
      className={`flex-1 px-4 py-2.5 text-[14px] font-semibold transition-colors ${
        secili ? "bg-yazi text-white" : "text-yazi-sonuk hover:text-yazi"
      }`}
    >
      {children}
    </button>
  );
}

export function DurumDugmesi({ odulId, aktif }: { odulId: string; aktif: boolean }) {
  const [bekliyor, basla] = useTransition();

  return (
    <button
      type="button"
      disabled={bekliyor}
      onClick={() => basla(async () => void (await durumEylemi(odulId, !aktif)))}
      className="etiket-caps text-yazi-sonuk underline disabled:opacity-50"
    >
      {bekliyor ? "…" : aktif ? "yayından kaldır" : "yayına al"}
    </button>
  );
}

/**
 * Erteleme eşiği ayarı.
 *
 * Kafenin ödül ekonomisine ait tek sayı: bunun üstündeki ödül kazanıldığı
 * anda değil, 12 saat sonra açılıyor (Ü28). Ertesi ziyareti üreten mekanik
 * bu — ama "büyük ödül" tanımı her kafede aynı değil, o yüzden ayarlanabilir.
 *
 * Sıfır yazmak her ödülü erteler; üst sınır 500 TL. İkisi de kafenin hakkı,
 * ama sınırsız bırakmak ertelemeyi fiilen kapatmanın yolu olurdu.
 */
export function EsikAyari({ mevcutTl }: { mevcutTl: number }) {
  const [durum, action, bekliyor] = useActionState(esikEylemi, {} as EsikDurumu);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <IsletmeAlan
        etiket="Gecikmeli açılma eşiği (TL)"
        ipucu="Bu tutarın üstündeki ödül 12 saat sonra açılır; altındakiler kasada hemen kullanılabilir. Sıfır yazarsan her ödül gecikir."
      >
        <input
          name="esik"
          type="text"
          inputMode="numeric"
          defaultValue={String(mevcutTl)}
          className={isletmeGirdi}
          placeholder="50"
        />
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Kaydediliyor…" : "Eşiği kaydet"}
      </IsletmeDugme>
    </form>
  );
}
