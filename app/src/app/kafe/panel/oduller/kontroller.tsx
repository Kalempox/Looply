"use client";

import { useActionState, useState, useTransition } from "react";
import {
  ekleEylemi,
  durumEylemi,
  esikEylemi,
  carkSiniriEylemi,
  type OdulDurumu,
  type EsikDurumu,
} from "./actions";
import { IsletmeDugme, IsletmeAlan, isletmeGirdi, IsletmeUyari } from "@/components/isletme";

const BOS: OdulDurumu = {};

/** Ü52: seçilebilir ödül değerleri — 25'ten 50'ye, 5'er artışla. */
const DEGERLER = [25, 30, 35, 40, 45, 50];

/**
 * Ödül ekleme formu.
 *
 * Form, tipe göre **şekil değiştiriyor**: ürün ödülünde TL değeri, yüzdeli
 * ödülde oran + TL tavanı, tutar indiriminde indirimin kendisi isteniyor.
 * Tek bir uzun formda hepsini gösterip "boş bırak" demek, kafe sahibini
 * yanlış doldurmaya davet ederdi.
 *
 * Kanıt seviyesi formda **yok**: E6 onu tutardan hesaplıyor. Kafe seçebilseydi
 * en pahalı ödülü en zayıf kanıtla verebilirdi. Seçenek listesinde yine de
 * yazıyor ("konum yeter" / "masada 5 dk") — kafe neyi seçtiğini bilsin.
 *
 * Ü52 ile iki alan kalktı: **puan fiyatı** (puanla satın alma yok) ve
 * **anlık mı** sorusu (tek tip ödül kaldı). Tutar da serbest metin değil,
 * sabit basamak.
 */
export function OdulEkleme({ urunler }: { urunler: { id: string; ad: string }[] }) {
  const [durum, action, bekliyor] = useActionState(ekleEylemi, BOS);
  const [tip, setTip] = useState<"product" | "percent" | "amount">("product");

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

      {tip === "percent" && (
        <IsletmeAlan etiket="İndirim oranı (%)">
          <input
            name="yuzde"
            type="text"
            inputMode="numeric"
            className={isletmeGirdi}
            placeholder="20"
          />
        </IsletmeAlan>
      )}

      {/* Ü52: serbest tutar yok — 25 ile 50 TL arası, 5'er artışla.
          Metin kutusu bırakılsaydı kafe "27,50" yazar ve form her
          seferinde hata döndürürdü; seçenek listesi kuralı anlatıyor. */}
      <IsletmeAlan
        etiket={
          tip === "percent"
            ? "En fazla indirim (TL)"
            : tip === "amount"
              ? "İndirim tutarı (TL)"
              : "Ödülün TL değeri"
        }
        ipucu={
          tip === "percent"
            ? "Bütçeden bu tutar rezerve edilir; kasada gerçekleşen düşülür, fark geri döner."
            : tip === "amount"
              ? "Adisyondan bir kez düşülür. Kalan tutar saklanmaz, sonraki ziyarete devretmez — bu bir bakiye değil (Ü18)."
              : "Ürünün perakende fiyatı. Kasada onaylandığında bütçeden bu kadar düşer."
        }
      >
        <select name="tutar" className={isletmeGirdi} defaultValue="25">
          {DEGERLER.map((tl) => (
            <option key={tl} value={tl}>
              {tl} TL{tl <= 35 ? " · konum yeter" : " · masada 5 dk"}
            </option>
          ))}
        </select>
      </IsletmeAlan>

      {/* Ü52: "anlık mı" sorusu kalktı. Tek tip ödül var — oyunlardan ve
          çarktan düşen ödül. Puanla satın alma yok, dolayısıyla puan
          fiyatı alanı da yok. */}
      <p className="rounded-lg border border-cizgi bg-cukur px-4 py-3 text-[13px] leading-relaxed text-yazi-sonuk">
        Bu ödül oyun sonunda ve şans çarkında düşebilir. Oyuncu puanıyla satın alamaz — puan
        yalnızca sıralama ve seviye için birikiyor.
      </p>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Ekleniyor…" : "Ödülü ekle"}
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
 * anda değil, 24 saat sonra açılıyor (Ü28). Ertesi ziyareti üreten mekanik
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
        ipucu="Bu tutarın üstündeki ödül 24 saat sonra açılır; altındakiler kasada hemen kullanılabilir. Sıfır yazarsan her ödül gecikir."
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

/** Çarkta çıkabilecek en büyük ödül (Ü49). */
export function CarkSiniri({ mevcutTl, uygunSayisi }: { mevcutTl: number; uygunSayisi: number }) {
  const [durum, action, bekliyor] = useActionState(carkSiniriEylemi, {} as EsikDurumu);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      {uygunSayisi === 0 && (
        <IsletmeUyari tur="bekle">
          Bu sınırın altında anlık ödülün yok — çark hiç dönmüyor. Ya sınırı yükselt ya da daha
          küçük değerli bir anlık ödül ekle.
        </IsletmeUyari>
      )}

      <IsletmeAlan
        etiket="Çarkta en büyük ödül (TL)"
        ipucu={`Çark, anlık ödüllerinden bu tutarın altında kalanları dağıtır — şu an ${uygunSayisi} ödül uygun. Üstündekiler katalogda kalır, oyun içinde çıkmaya devam eder. Ucuz ödül çok daha sık çıkar.`}
      >
        <input
          name="sinir"
          type="text"
          inputMode="numeric"
          defaultValue={String(mevcutTl)}
          className={isletmeGirdi}
          placeholder="25"
        />
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Kaydediliyor…" : "Sınırı kaydet"}
      </IsletmeDugme>
    </form>
  );
}
