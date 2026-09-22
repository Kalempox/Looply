"use client";

import { useEffect } from "react";

/**
 * Hata sınırı — Ü253.
 *
 * ── 🔴 Neden gerekti: BEYAZ EKRAN ──────────────────────────
 *
 * Ürün sahibi üç tur boyunca *"tüm oyunlara tıklayınca ekran böyle
 * kalıyor"* dedi ve gönderdiği ekran görüntüsünde bomboş bir sayfa ile
 * alt şerit vardı. Üç kez yanlış yerde arandı (önbellek, sunucu
 * yeniden başlatma, paylaşılan tarayıcı paneli).
 *
 * Asıl sebep bu dosyanın **yokluğuydu**: uygulamada hiçbir hata sınırı
 * yoktu. İstemci tarafında bir bileşen çöktüğünde React alt ağacı
 * söküyor, Next koyacak bir yedek bulamıyor ve geriye **hiçbir şey**
 * kalmıyor. Hata konsola düşüyor ama ekranda tek bir iz bırakmıyor.
 *
 * İki ayrı arıza olduğu için üçü de çözmedi:
 *
 *   1. Bir şey çöküyor  ← hâlâ bilinmiyor, bu dosya onu görünür kılacak
 *   2. Çökünce ekran boş kalıyor  ← burada çözülüyor
 *
 * ⚠️ İkincisi birincisinden daha kötü. Bir hata görünürse bildirilir;
 * beyaz ekran "uygulama bozuk" diye kapatılır ve kimse ne olduğunu
 * söyleyemez.
 *
 * ── Ne gösteriyor ──────────────────────────────────────────
 *
 * Geliştirmede **hatanın kendisi**, canlıda `digest` (Next canlıda
 * mesajı zaten gizliyor — hata metni yol, sorgu ya da kimlik
 * sızdırabilir). Kullanıcının yapabileceği tek şey tekrar denemek ve
 * düğme onu veriyor.
 */
export default function Hata({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  /** ⚠️ `reset` DEĞİL — bu Next sürümünde prop adı `retry`. */
  retry: () => void;
}) {
  useEffect(() => {
    // Tarayıcı konsoluna tam hâliyle: bildirenin kopyalayabilmesi için.
    console.error("[Looply] beklenmeyen hata", error);
  }, [error]);

  const ayrinti =
    process.env.NODE_ENV === "production"
      ? error.digest
        ? `Hata kodu: ${error.digest}`
        : null
      : error.message;

  return (
    <div className="mx-auto max-w-md px-5 py-10 text-center">
      <div className="etiket-caps text-tehlike">BİR ŞEY TERS GİTTİ</div>
      <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
        Bu sayfa açılamadı
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-yazi-sonuk">
        Hata bizde. Tekrar denemek çoğu zaman yetiyor.
      </p>

      {ayrinti && (
        /* ⚠️ Seçilebilir ve kırpılmıyor: bildiren kişi kopyalayacak. */
        <pre className="mt-4 overflow-x-auto rounded-lg border border-cizgi bg-yuzey px-3 py-2 text-left font-data text-[11px] leading-relaxed text-yazi-sonuk">
          {ayrinti}
        </pre>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-vurgu px-5 py-3 text-[15px] font-semibold text-white"
        >
          Tekrar dene
        </button>
        {/*
          🔴 `<Link>` DEĞİL, tam sayfa yüklemesi — kural bilerek
          deliniyor.

          Buraya düşülmesinin sebebi istemci tarafında bir şeyin
          çökmesi. `<Link>` aynı bozuk JS bağlamında gezinir ve
          oyuncuyu aynı duvara tekrar çarptırabilir; tam yükleme her
          şeyi baştan getiriyor. `retry()` zaten yumuşak yolu
          deniyor, bu düğme sert olanı.
        */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/oyna" className="py-2 text-[14px] text-vurgu underline">
          Ana ekrana dön
        </a>
      </div>
    </div>
  );
}
