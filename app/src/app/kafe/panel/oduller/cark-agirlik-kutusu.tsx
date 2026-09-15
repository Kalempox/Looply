"use client";

import { useActionState, useState, useTransition } from "react";
import { agirlikEylemi, otomatikEylemi, type AgirlikDurumu } from "./actions";
import { IsletmeUyari, isletmeGirdi } from "@/components/isletme";

/**
 * Çark olasılıkları tablosu — Ü110, Ü124'te yüzdeye geçti.
 *
 * ── 🔴 Ağırlık değil, yüzde ─────────────────────────────────
 *
 * Kafe **ağırlık** giriyordu ve yüzde yanında türetilmiş hâlde
 * duruyordu. Ürün sahibi: *"Çarktaki ödüller ve yüzde kaç ihtimalle
 * çıkacağı panelden ayarlanmalı."* Artık girilen sayı doğrudan yüzde;
 * kalan pay diğerlerinin oranı korunarak dağıtılıyor ve toplam her
 * zaman 100 (`domain/cark-agirlik.ts`).
 *
 * ── Her satır kendi formu ───────────────────────────────────
 *
 * Tek büyük form olsaydı bir satırdaki hata bütün kaydı reddeder ve
 * kafe hangi satırın sorunlu olduğunu aramak zorunda kalırdı. Ü104'teki
 * haftalık program da aynı gerekçeyle böyle.
 */

export type Satir = {
  odulId: string;
  baslik: string;
  agirlik: number | null;
  etkin: number;
  yuzde: number;
};

export type DisSatir = { odulId: string; baslik: string; aciklama: string };

export function CarkAgirlikKutusu({
  satirlar,
  disarida,
  toplam,
  otomatikMi,
}: {
  satirlar: Satir[];
  disarida: DisSatir[];
  toplam: number;
  otomatikMi: boolean;
}) {
  const [bekliyor, basla] = useTransition();

  if (satirlar.length === 0) {
    return (
      <p className="text-[14px] text-yazi-sonuk">
        Çarkta şu an hiç ödül yok. Önce çark üst sınırının altında bir anlık
        ödül ekle — yoksa çark dönecek bir şey bulamıyor.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-yazi-sonuk">
        {otomatikMi ? (
          <>
            Şu an <strong className="text-yazi">otomatik</strong>: ucuz ödül daha
            sık çıkıyor, her basamakta olasılık yarıya iniyor. Bir yüzde
            yazarsan hepsi bu değerlerden sabitlenir ve kontrol sana geçer.
          </>
        ) : (
          <>
            Yüzdeleri <strong className="text-yazi">sen belirledin</strong>. Bir
            ödülün yüzdesini değiştirdiğinde kalan pay, diğerlerinin oranı
            korunarak aralarında yeniden bölüşülüyor —{" "}
            <strong className="text-yazi">toplam her zaman 100</strong>.
          </>
        )}
      </p>

      <div className="flex items-baseline justify-between gap-3 border-y border-cizgi py-2">
        <span className="etiket-caps text-yazi-sonuk">Toplam</span>
        <span className="font-data text-[15px] font-bold tabular">%{toplam}</span>
      </div>

      <ul className="divide-y divide-cizgi">
        {satirlar.map((s) => (
          // ⚠️ Anahtar sunucudaki değerleri de taşıyor: satır değiştiğinde
          // bileşen yeniden kuruluyor ve `useActionState`te kalan eski
          // hata mesajı da gidiyor. Anahtar yalnızca `odulId` olsaydı,
          // "otomatiğe dön" sonrası düzelmiş bir satırda bir önceki
          // denemenin hatası asılı kalırdı.
          <li key={`${s.odulId}:${s.agirlik}:${s.etkin}`}>
            <AgirlikSatiri satir={s} />
          </li>
        ))}
      </ul>

      {!otomatikMi && (
        <button
          type="button"
          disabled={bekliyor}
          onClick={() => basla(async () => void (await otomatikEylemi()))}
          className="etiket-caps text-yazi-sonuk underline disabled:opacity-50"
        >
          {bekliyor ? "…" : "otomatiğe dön"}
        </button>
      )}

      {disarida.length > 0 && (
        <div className="rounded-lg border border-cizgi bg-cukur px-4 py-3">
          {/* ⚠️ Çarkta olmayan ödüle ağırlık vermek anlamsız; kafe onu
              aramasın diye sebebiyle birlikte ayrı duruyor. Ü103'te
              kapatılan "çarkta görünen ama asla çıkmayan dilim"
              probleminin panel tarafı. */}
          <div className="etiket-caps text-yazi-sonuk">Çarkta olmayan ödüller</div>
          <ul className="mt-2 grid gap-1.5">
            {disarida.map((d) => (
              <li key={d.odulId} className="text-[13px] leading-relaxed">
                <span className="font-semibold">{d.baslik}</span>
                <span className="text-yazi-sonuk"> — {d.aciklama}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AgirlikSatiri({ satir }: { satir: Satir }) {
  const [durum, action, bekliyor] = useActionState(agirlikEylemi, {} as AgirlikDurumu);
  // Kafe sayıyı düzeltmeye başladığı anda hata kalkıyor: düzeltilmiş bir
  // alanın altında duran kırmızı satır, hâlâ hata varmış gibi okunuyor.
  const [duzeltiliyor, setDuzeltiliyor] = useState(false);

  return (
    <form
      action={action}
      onSubmit={() => setDuzeltiliyor(false)}
      className="py-3"
    >
      <input type="hidden" name="odulId" value={satir.odulId} />

      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{satir.baslik}</span>
          <span className="mt-0.5 block font-data text-[11px] text-yazi-sonuk">
            {satir.etkin === 0 ? "çarkta çıkmaz" : `${satir.yuzde} kez / 100`}
            {satir.agirlik == null && " · otomatik"}
          </span>
        </span>

        {/* Yüzde işareti girdinin içinde: ayrı bir etiket satır yüksekliğini
            artırıyor, ipucu metni ise on satırda on kez tekrarlanıyordu. */}
        <span className="relative">
          <input
            name="agirlik"
            type="text"
            inputMode="numeric"
            defaultValue={String(satir.etkin)}
            onInput={() => setDuzeltiliyor(true)}
            aria-label={`${satir.baslik} çıkma yüzdesi`}
            className={`${isletmeGirdi} w-[5.5rem] pr-7`}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-data text-[13px] text-yazi-sonuk"
          >
            %
          </span>
        </span>

        <button
          type="submit"
          disabled={bekliyor}
          className="etiket-caps rounded-lg border border-cizgi px-3 py-2 disabled:opacity-50"
        >
          {bekliyor ? "…" : "Kaydet"}
        </button>
      </div>

      {durum.hata && !duzeltiliyor && (
        <div className="mt-2">
          <IsletmeUyari>{durum.hata}</IsletmeUyari>
        </div>
      )}
    </form>
  );
}
