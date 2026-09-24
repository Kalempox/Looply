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
import {
  IsletmeDugme,
  IsletmeAlan,
  isletmeGirdi,
  isletmeMiniDugme,
  IsletmeUyari,
} from "@/components/isletme";

const BOS: OdulDurumu = {};

/**
 * Ödül ekleme formu.
 *
 * Form, tipe göre **şekil değiştiriyor**: ürün ödülünde TL değeri, yüzdeli
 * ödülde oran + TL tavanı, tutar indiriminde indirimin kendisi isteniyor.
 * Tek bir uzun formda hepsini gösterip "boş bırak" demek, kafe sahibini
 * yanlış doldurmaya davet ederdi.
 *
 * Kanıt seviyesi formda **yok**. Ü268'de "masada 5 dk" kuralı kalktı ve
 * her ödül için konum doğrulaması yetiyor — seçilecek bir şey kalmadı.
 *
 * Ü52 ile iki alan kalktı: **puan fiyatı** (puanla satın alma yok) ve
 * **anlık mı** sorusu (tek tip ödül kaldı).
 *
 * Ü268 · K5: tutar artık **serbest** — 25 TL ile kafenin kendi üst sınırı
 * arasında, tam TL. Önceden 25–50 arası sabit bir listeden seçiliyordu.
 */
export function OdulEkleme({
  urunler,
  ustSinirTl,
}: {
  urunler: { id: string; ad: string }[];
  /** Kafenin ödül üst sınırı (`ayar.odulUstSinir`), TL. */
  ustSinirTl: number;
}) {
  const [durum, action, bekliyor] = useActionState(ekleEylemi, BOS);
  const [tip, setTip] = useState<"product" | "percent" | "amount">("product");

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <IsletmeAlan etiket="Ödül tipi">
        {/*
          Ü63: emoji kalktı.

          İşletme tarafında emoji zaten yasaktı (Ü31) ama bu üç düğme
          gözden kaçmıştı ve ürün sahibi haklı olarak "rezalet" dedi:
          🏆🎟️💸 üçü de işletim sistemine göre bambaşka çiziliyor,
          hizası tutmuyor ve ödül tipiyle ilgisi zayıf. Yerine kendi
          çizdiğimiz üç ikon geldi — her biri kendi alanının renginde.
        */}
        <div className="grid grid-cols-3 gap-2">
          <TipDugmesi
            secili={tip === "product"}
            onSec={() => setTip("product")}
            ikon={<UrunIkonu />}
            renk="urun"
            etiket="Ürün"
            aciklama="menünden bir şey"
          />
          <TipDugmesi
            secili={tip === "percent"}
            onSec={() => setTip("percent")}
            ikon={<YuzdeIkonu />}
            renk="kampanya"
            etiket="Yüzde"
            aciklama="tavanlı indirim"
          />
          <TipDugmesi
            secili={tip === "amount"}
            onSec={() => setTip("amount")}
            ikon={<TutarIkonu />}
            renk="para"
            etiket="Tutar"
            aciklama="sabit TL"
          />
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
        <IsletmeAlan
          etiket="Hangi ürün"
          ipucu="İsteğe bağlı — raporlarda ödülü ürüne bağlar."
        >
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

      {/* Ü268 · K5: tutar serbest — 25 TL ile kafenin üst sınırı arasında.
          ⚠️ `step={1}`: tam TL. Ü52'nin "27,50" kaygısı hâlâ geçerli;
          tarayıcı kuruşlu değeri daha gönderilmeden reddediyor, sunucu
          da ayrıca reddediyor. */}
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
        <input
          name="tutar"
          type="number"
          inputMode="numeric"
          required
          min={25}
          max={ustSinirTl}
          step={1}
          defaultValue="25"
          className={isletmeGirdi}
        />
        <span className="mt-1.5 block text-[12px] text-yazi-sonuk">
          25 ile {ustSinirTl.toLocaleString("tr-TR")} TL arası, tam TL. Üst sınırı
          ayarlardan değiştirebilirsin.
        </span>
      </IsletmeAlan>

      {/* Ü52: "anlık mı" sorusu kalktı. Tek tip ödül var — oyunlardan ve
          çarktan düşen ödül. Puanla satın alma yok, dolayısıyla puan
          fiyatı alanı da yok. */}
      <p className="rounded-lg border border-cizgi bg-cukur px-4 py-3 text-[13px] leading-relaxed text-yazi-sonuk">
        Bu ödül oyun sonunda ve şans çarkında düşebilir. Oyuncu puanıyla satın
        alamaz — puan yalnızca sıralama ve seviye için birikiyor.
      </p>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Ekleniyor…" : "Ödülü ekle"}
      </IsletmeDugme>
    </form>
  );
}

/**
 * Ödül tipi seçeneği — ikon, ad, tek satır açıklama.
 *
 * Eski hâli tek satırlık üç metin düğmesiydi ve hangisinin ne olduğu
 * ancak formu doldurunca anlaşılıyordu. Açıklama satırı, "yüzde" ile
 * "tutar" arasındaki farkı seçim anında söylüyor.
 *
 * Seçili düğme **kendi alanının rengini** alıyor: üçü de siyah olsaydı
 * seçim görünürdü ama ne seçildiği görünmezdi.
 */
function TipDugmesi({
  secili,
  onSec,
  ikon,
  renk,
  etiket,
  aciklama,
}: {
  secili: boolean;
  onSec: () => void;
  ikon: React.ReactNode;
  renk: "urun" | "kampanya" | "para";
  etiket: string;
  aciklama: string;
}) {
  const seciliSinif = {
    urun: "border-urun bg-urun-zemin text-urun",
    kampanya: "border-kampanya bg-kampanya-zemin text-kampanya",
    para: "border-para bg-para-zemin text-para",
  }[renk];

  return (
    <button
      type="button"
      onClick={onSec}
      aria-pressed={secili}
      className={`flex flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left transition-all ${
        secili
          ? `${seciliSinif} shadow-sm`
          : "border-cizgi bg-yuzey text-yazi-sonuk hover:border-yazi-sonuk/50"
      }`}
    >
      <span className="shrink-0">{ikon}</span>
      <span>
        <span
          className={`block text-[14px] leading-tight font-semibold ${secili ? "" : "text-yazi"}`}
        >
          {etiket}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-yazi-sonuk">
          {aciklama}
        </span>
      </span>
    </button>
  );
}

/* ── Ödül tipi ikonları ───────────────────────────────────────
 *
 * Satır içi SVG: emoji işletim sistemine göre değişiyor, hizası
 * tutmuyor ve ödül tipiyle ilgisi zayıf. Bunlar `currentColor`
 * kullanıyor, yani seçili düğmenin rengini miras alıyorlar.
 */

const TIP_CIZGI = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** Fincan — ürün ödülü menüden bir şey. */
function UrunIkonu() {
  return (
    <svg {...TIP_CIZGI}>
      <path d="M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
      <path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7 4.5v1.5M11 3.5v2.5" />
    </svg>
  );
}

/** Yüzde işareti — oran indirimi. */
function YuzdeIkonu() {
  return (
    <svg {...TIP_CIZGI}>
      <path d="M19 5 5 19" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  );
}

/** Etiket ve tutar — sabit TL indirimi. */
function TutarIkonu() {
  return (
    <svg {...TIP_CIZGI}>
      <path d="M12.6 3H20a1 1 0 0 1 1 1v7.4a2 2 0 0 1-.6 1.4l-7.6 7.6a2 2 0 0 1-2.8 0l-6.4-6.4a2 2 0 0 1 0-2.8l7.6-7.6a2 2 0 0 1 1.4-.6Z" />
      <circle cx="16.5" cy="7.5" r="1.4" />
    </svg>
  );
}

export function DurumDugmesi({
  odulId,
  aktif,
}: {
  odulId: string;
  aktif: boolean;
}) {
  const [bekliyor, basla] = useTransition();

  return (
    <button
      type="button"
      disabled={bekliyor}
      onClick={() =>
        basla(async () => void (await durumEylemi(odulId, !aktif)))
      }
      className={
        aktif
          ? isletmeMiniDugme
          : `${isletmeMiniDugme} border-vurgu/40 text-vurgu hover:border-vurgu hover:text-vurgu`
      }
    >
      {bekliyor ? "…" : aktif ? "Yayından kaldır" : "Yayına al"}
    </button>
  );
}

/**
 * Erteleme eşiği ayarı.
 *
 * Kafenin ödül ekonomisine ait tek sayı: bunun üstündeki ödül kazanıldığı
 * anda değil, 12 saat sonra açılıyor (Ü28, Ü97). Ertesi ziyareti üreten mekanik
 * bu — ama "büyük ödül" tanımı her kafede aynı değil, o yüzden ayarlanabilir.
 *
 * Sıfır yazmak her ödülü erteler; üst sınır 500 TL. İkisi de kafenin hakkı,
 * ama sınırsız bırakmak ertelemeyi fiilen kapatmanın yolu olurdu.
 */
export function EsikAyari({
  mevcutSaat,
  mevcutGun,
  mevcutUstSinir,
}: {
  mevcutSaat: number;
  mevcutGun: number;
  /** Ü268 · K5 — ödül üst sınırı, TL. */
  mevcutUstSinir: number;
}) {
  const [durum, action, bekliyor] = useActionState(
    esikEylemi,
    {} as EsikDurumu,
  );

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      {/* 🔴 Ü269: "Gecikmeli açılma eşiği (TL)" alanı KALKTI. Ürün sahibi:
          "eşik olmamalı, her ödül gecikmeli açılmalı ... minimum bir tutar
          olmamalı çünkü o zaman yüzdeli ve ürün hediyeleri problem
          oluyor." Kafe yalnızca süreyi ayarlıyor. */}

      {/* Ü129: aktivasyon saati. Önce `kupon.ts`te sabit yazılıydı ve iki
          kez kod değiştirilerek ayarlanmıştı (Ü28: 24, Ü97: 12). Artık
          kafenin kararı — çark ödülü de oyun ödülü de aynı yoldan geçtiği
          için ikisi için de geçerli. */}
      <IsletmeAlan
        etiket="Aktivasyon saati"
        ipucu="Her ödül kaç saat sonra açılsın. Çark ödülü ve oyun ödülü için aynı. 1 ile 48 arası — ödül hiçbir zaman hemen açılmaz."
      >
        <input
          name="saat"
          type="number"
          inputMode="numeric"
          min={1}
          max={48}
          defaultValue={String(mevcutSaat)}
          className={isletmeGirdi}
          placeholder="12"
        />
      </IsletmeAlan>

      {/* Ü250: geçerlilik süresi. `kupon.GECERLILIK_GUN` sabitti ve ürün
          sahibi panele istedi. Açılıştan sayılıyor. */}
      <IsletmeAlan
        etiket="Kupon kaç gün geçerli"
        ipucu="Kupon açıldıktan sonra kaç gün kullanılabilsin. 1 ile 30 arası — kullanılmayan kupon bütçenden pay ayırıyor ve ancak süresi dolunca geri dönüyor."
      >
        <input
          name="gun"
          type="number"
          inputMode="numeric"
          min={1}
          max={30}
          defaultValue={String(mevcutGun)}
          className={isletmeGirdi}
          placeholder="7"
        />
      </IsletmeAlan>

      {/* Ü268 · K5: ürün sahibi — "üst sınırı kafe belirlesin, bir sınır
          olmasın, en az 50 olsun". */}
      <IsletmeAlan
        etiket="Ödül üst sınırı (TL)"
        ipucu="Tanımlayabileceğin en pahalı ödül. En az 50; üst sınır yok. Ödüller 25 TL ile bu tutar arasında olabilir."
      >
        <input
          name="ustSinir"
          type="number"
          inputMode="numeric"
          min={50}
          step={1}
          defaultValue={String(mevcutUstSinir)}
          className={isletmeGirdi}
          placeholder="50"
        />
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Kaydediliyor…" : "Kaydet"}
      </IsletmeDugme>
    </form>
  );
}

/** Çarkta çıkabilecek en büyük ödül (Ü49). */
export function CarkSiniri({
  mevcutTl,
  uygunSayisi,
}: {
  mevcutTl: number;
  uygunSayisi: number;
}) {
  const [durum, action, bekliyor] = useActionState(
    carkSiniriEylemi,
    {} as EsikDurumu,
  );

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      {uygunSayisi === 0 && (
        <IsletmeUyari tur="bekle">
          Bu sınırın altında anlık ödülün yok — çark hiç dönmüyor. Ya sınırı
          yükselt ya da daha küçük değerli bir anlık ödül ekle.
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
