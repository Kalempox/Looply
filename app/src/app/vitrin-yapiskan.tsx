"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Ekranın altına yapışan çağrı — Ü200.
 *
 * ── Neden gerekli ───────────────────────────────────────────
 *
 * Ürün sahibi bir örnek vitrin gönderdi ve orada başlat düğmesi ekranın
 * altında **sürekli** duruyordu. Bizde üç çağrı var (kahramanda,
 * ortada, sonda) ama sayfa uzun: kafe sahibi ikna olduğu anda düğmeyi
 * aramak için yukarı ya da aşağı kaydırmak zorunda. İkna anı ile düğme
 * arasındaki her kaydırma bir vazgeçme fırsatı — ortadaki çağrı zaten
 * bu gerekçeyle konmuştu, bu onun tamamlanmış hâli.
 *
 * ── 🔴 Üç kural, üçü de "rahatsız etmesin" için ─────────────
 *
 * 1. **Kahramanda YOK.** Sayfa açılır açılmaz beliren yapışkan bir bant,
 *    henüz hiçbir şey okumamış kişiye bağıran bir reklam. Kahraman
 *    bölümü geçilene kadar (≈%40 ekran) görünmüyor.
 *
 * 2. **Son çağrıda KAYBOLUYOR.** Sayfanın sonunda zaten tam ekran bir
 *    çağrı var; ikisi üst üste geldiğinde aynı düğme iki kez duruyor ve
 *    biri ötekini örtüyor. `IntersectionObserver` son bölümü görünce
 *    şerit çekiliyor.
 *
 * 3. **Oturumu açık olanda hiç YOK.** Girişli işletmeciye "hemen dene"
 *    demek, zaten müşterimiz olan kişiye başvuru formu göstermek olurdu.
 *    Karar sunucuda (`page.tsx`), burada değil.
 *
 * ⚠️ `pb-[env(safe-area-inset-bottom)]`: iPhone'da alttaki çubuk
 * düğmenin üstüne biniyor. Ekranın en altına yapışan her şeyde bu satır
 * gerekiyor.
 */
export function YapiskanCagri({ sonBolumId }: { sonBolumId: string }) {
  const [gorunur, setGorunur] = useState(false);

  useEffect(() => {
    /*
      ⚠️ Kaydırma dinleyicisi DEĞİL, iki ayrı gözlemci.
      `scroll` olayı her karede koşuyor ve bu şeridin tek ihtiyacı iki
      eşik: kahraman bitti mi, son bölüm göründü mü. Gözlemci ikisini de
      tarayıcıya yaptırıyor, ana iş parçacığı boşta kalıyor.
    */
    const son = document.getElementById(sonBolumId);

    let kahramanGecildi = false;
    let sondaMi = false;
    const yaz = () => setGorunur(kahramanGecildi && !sondaMi);

    // Kahraman eşiği: sayfanın üstüne konan görünmez bir nişan.
    const nisan = document.createElement("div");
    nisan.style.cssText = "position:absolute;top:60vh;height:1px;width:1px;pointer-events:none";
    nisan.setAttribute("aria-hidden", "true");
    document.body.appendChild(nisan);

    const g1 = new IntersectionObserver(
      ([g]) => {
        // Nişan yukarı çıktıysa kahraman geçilmiş demektir.
        kahramanGecildi = !g.isIntersecting && g.boundingClientRect.top < 0;
        yaz();
      },
      { threshold: 0 },
    );
    g1.observe(nisan);

    const g2 = son
      ? new IntersectionObserver(
          ([g]) => {
            sondaMi = g.isIntersecting;
            yaz();
          },
          { threshold: 0.12 },
        )
      : null;
    if (son && g2) g2.observe(son);

    return () => {
      g1.disconnect();
      g2?.disconnect();
      nisan.remove();
    };
  }, [sonBolumId]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ${
        gorunur ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="border-t border-cizgi bg-yuzey/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          {/* ⚠️ Metin dar ekranda GİZLİ: 375 pikselde cümle ve düğme yan
              yana sıkışıyor, düğme de küçülüyordu. Şeridin işi ikna
              etmek değil, ikna olanı tıklatmak. */}
          <p className="hidden min-w-0 flex-1 text-[14px] leading-snug text-yazi-sonuk sm:block">
            Kafenin karekodu beş dakikada hazır — başvuru dört alan.
          </p>
          <Link
            href="/kafe/basvuru"
            className="w-full shrink-0 rounded-full bg-vurgu px-6 py-3.5 text-center text-[15px] font-semibold text-yuzey transition-opacity hover:opacity-90 sm:w-auto"
          >
            Kafende Looply&apos;i başlat →
          </Link>
        </div>
      </div>
    </div>
  );
}
