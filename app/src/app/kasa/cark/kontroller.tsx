"use client";

import { useActionState } from "react";
import { tutarGir, type TutarSonucu } from "./actions";
import { Karekod } from "@/components/karekod";

/**
 * Kasada çark hakkı — Ü137.
 *
 * ── Ekranın tek işi ─────────────────────────────────────────
 *
 * Kasiyer tutarı yazıyor, üç cevaptan biri geliyor:
 *
 *   **Uygun**       → ekranda QR, müşteri okutuyor
 *   **Uygun değil** → eksik tutar, kasiyer "tamamlar mısınız" diyor
 *   **Hata**        → yazım hatası
 *
 * ── 🔴 Eksik tutar neden bu kadar büyük yazıyor ─────────────
 *
 * Ürün sahibinin tarifindeki cümle bu ekranda doğuyor: *"3000 TL ve
 * üzerinde çark şansınız var, isterseniz tamamlayın."* Kasiyer kuyruğun
 * ortasında, göz ucuyla bakıyor. Eksik tutar küçük yazsaydı okunmaz,
 * cümle kurulmaz ve özelliğin tamamı boşa giderdi.
 */
export function CarkHakkiFormu() {
  const [durum, action, bekliyor] = useActionState(tutarGir, null as TutarSonucu | null);

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4">
        <label className="block">
          <span className="mb-2 block etiket-caps text-yazi-sonuk">Alışveriş tutarı</span>
          <div className="relative">
            <input
              name="tutar"
              type="text"
              inputMode="decimal"
              autoFocus
              autoComplete="off"
              placeholder="0"
              className="w-full rounded-lg border border-cizgi bg-cukur py-5 pr-16 text-center font-data text-4xl text-yazi focus:border-vurgu focus:outline-none"
            />
            <span className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 font-data text-xl text-yazi-sonuk">
              TL
            </span>
          </div>
        </label>

        <button
          type="submit"
          disabled={bekliyor}
          className="w-full rounded-lg border border-vurgu py-4 font-display text-[16px] font-bold text-vurgu disabled:opacity-40"
        >
          {bekliyor ? "Kontrol ediliyor…" : "Çark hakkı var mı?"}
        </button>
      </form>

      {durum?.durum === "hata" && (
        <p className="rounded-lg border border-tehlike/50 bg-tehlike/5 px-4 py-3 text-center text-[14px] text-tehlike">
          {durum.hata}
        </p>
      )}

      {durum?.durum === "uygun_degil" && (
        <div className="rounded-2xl border border-odul/60 bg-odul-zemin px-5 py-6 text-center">
          <p className="etiket-caps text-[10px] text-yazi-sonuk">Çark hakkı yok</p>
          {durum.eksikTl !== null ? (
            <>
              {/*
                Kasiyerin müşteriye söyleyeceği cümle. Sayı büyük çünkü
                kuyruğun ortasında göz ucuyla okunacak.
              */}
              <p className="mt-2 font-display text-[40px] leading-none font-extrabold tabular text-odul-koyu">
                {durum.eksikTl.toLocaleString("tr-TR")} TL
              </p>
              <p className="mt-2 text-[15px] leading-relaxed">
                daha alışveriş yaparsa <strong>çark hakkı kazanıyor.</strong>
              </p>
              <p className="mt-3 border-t border-odul/40 pt-3 text-[13px] text-yazi-sonuk">
                {durum.sebep}
              </p>
            </>
          ) : (
            <p className="mt-2 text-[15px] leading-relaxed">{durum.sebep}</p>
          )}
        </div>
      )}

      {durum?.durum === "uygun" && (
        <div className="rounded-2xl border border-vurgu bg-yuzey px-5 py-6 text-center">
          <p className="etiket-caps text-[10px] text-vurgu">Çark hakkı kazandı</p>
          <p className="mt-1 text-[14px] text-yazi-sonuk">{durum.sebep}</p>

          {/* Karekodun kendi beyaz sessiz alanı — kasa ekranı koyu olabilir. */}
          <div className="mx-auto mt-5 w-fit rounded-lg bg-white p-3">
            <Karekod deger={durum.adres} boyut={200} etiket="Çark hakkı karekodu" />
          </div>

          <p className="mt-5 text-[15px] leading-relaxed font-semibold">
            Müşteri bu karekodu kendi telefonuyla okutsun.
          </p>
          {/*
            ⚠️ Kasiyere "adını telefonunu sen gir" DEMİYOR ve dememeli:
            müşteri kendi kaydoluyor, aydınlatma metnini kendi onaylıyor.
            Kasiyerin üçüncü bir kişinin verisini yazması rıza zincirini
            kırardı (Ü137).
          */}
          <p className="mt-2 text-[13px] leading-relaxed text-yazi-sonuk">
            Bilgilerini kendisi girecek. Karekod{" "}
            <strong className="text-yazi">15 dakika</strong> geçerli.
          </p>
        </div>
      )}
    </div>
  );
}
