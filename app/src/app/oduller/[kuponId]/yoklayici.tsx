"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { kuponDurumu } from "./actions";

/**
 * Kupon durumu yoklayıcısı — Ü136.
 *
 * ── Kapattığı boşluk ────────────────────────────────────────
 *
 * Müşteri kasada telefonu uzatıyor, kasiyer okutuyor ve onaylıyor.
 * Kasiyerin ekranında ✓ çıkıyor; **müşterinin ekranında hiçbir şey
 * olmuyordu.** Sayfa `force-dynamic` ama bu "her istekte yeniden üret"
 * demek — açık duran sayfayı güncellemiyor. Müşteri ekranına bakıp
 * "oldu mu?" diye soruyordu ve cevap kasiyerin sözüne kalıyordu.
 *
 * ⚠️ E9 bozulmuyor. Ekran hâlâ **geçerlilik iddia etmiyor**: kuponun
 * geçerli olduğunu söylemiyor, yalnızca kullanıldığını **sonradan**
 * bildiriyor. Kasiyerin telefona bakıp ürün vermesi hâlâ imkânsız —
 * "kullanıldı" yazısı bir kanıt değil, bir bildirim.
 *
 * ── Neden SSE değil yoklama ─────────────────────────────────
 *
 * Doğru çözüm sunucunun itmesi ama altyapı istiyor (kalıcı bağlantı,
 * ölçekte bağlantı yönetimi). Buradaki pencere **çok dar**: müşteri bu
 * ekranda en fazla birkaç dakika duruyor ve ekranda tek bir kupon var.
 * Üç saniyede bir tek satırlık bir sorgu, o dar pencere için yeterli.
 *
 * ── Üç şey yoklamayı durduruyor ─────────────────────────────
 *
 *   1. **Durum kesinleşince** — kullanıldı/süresi doldu/geri alındı.
 *      Değişmeyecek bir şeyi sormaya devam etmek saf israf.
 *   2. **Sekme arkaya düşünce** — `visibilitychange`. Cebe giren telefon
 *      dakikada yirmi istek atmamalı; pil ve veri müşterinin.
 *   3. **Süre dolunca** — on dakika. Ekranı açık unutan biri saatlerce
 *      sorgu üretmesin.
 */

/** Yoklama aralığı. Kasada geçen süre saniyelerle ölçülüyor. */
const ARALIK_MS = 3000;

/** Bundan sonra duruyor — ekranı açık unutan biri için üst sınır. */
const EN_UZUN_MS = 10 * 60 * 1000;

/** Bu durumlar değişmez; ulaşınca yoklama biter. */
const KESIN = ["kullanildi", "suresi_doldu", "geri_alindi"];

export function DurumYoklayicisi({
  kuponId,
  baslangic,
}: {
  kuponId: string;
  /** Sunucunun sayfayı çizerken gördüğü durum. */
  baslangic: string;
}) {
  const router = useRouter();
  const [degisti, setDegisti] = useState(false);
  // ⚠️ `useRef(Date.now())` DEĞİL: `Date.now()` render gövdesinde
  // çağrılamıyor (React saflık kuralı). Sıfırla kurulup efektin içinde
  // dolduruluyor — zaten sayacın başlaması gereken an da o.
  const basladi = useRef(0);

  useEffect(() => {
    // Zaten kesin bir durumdaysa hiç kurulmuyor.
    if (KESIN.includes(baslangic)) return;

    basladi.current = Date.now();

    let durduruldu = false;
    let zamanlayici: ReturnType<typeof setTimeout>;

    const sor = async () => {
      if (durduruldu) return;

      // Sekme arkadaysa sormadan bir tur bekle: cebe giren telefon
      // boşuna istek atmasın.
      if (document.visibilityState !== "visible") {
        zamanlayici = setTimeout(sor, ARALIK_MS);
        return;
      }

      if (Date.now() - basladi.current > EN_UZUN_MS) return;

      try {
        const yeni = await kuponDurumu(kuponId);

        // `null`: oturum düşmüş ya da kupon okunamıyor. Ekranı bozmadan
        // sessizce duruyoruz — yenilemek kullanıcıyı giriş ekranına atardı.
        if (yeni === null) return;

        if (yeni !== baslangic) {
          setDegisti(true);
          // Sunucu bileşenini yeniden çizdiriyor: başlık, açıklama ve
          // karekodun kalkması hepsi oradan geliyor. İstemcide ikinci bir
          // "kullanıldı" görünümü yazsaydık iki gerçek olurdu.
          router.refresh();
          return;
        }
      } catch {
        // Ağ hatası yoklamayı öldürmemeli — bir sonraki tur dener.
      }

      zamanlayici = setTimeout(sor, ARALIK_MS);
    };

    zamanlayici = setTimeout(sor, ARALIK_MS);

    // Sekme öne gelince beklemeden bir kez sor: müşteri telefonu cebinden
    // çıkardığında ekranın güncel olması gerekiyor.
    const gorunurluk = () => {
      if (document.visibilityState === "visible" && !durduruldu) {
        clearTimeout(zamanlayici);
        zamanlayici = setTimeout(sor, 300);
      }
    };
    document.addEventListener("visibilitychange", gorunurluk);

    return () => {
      durduruldu = true;
      clearTimeout(zamanlayici);
      document.removeEventListener("visibilitychange", gorunurluk);
    };
  }, [kuponId, baslangic, router]);

  /*
    Değişim anında kısa bir bildirim. `router.refresh()` sunucudan gelen
    yeni ekranı zaten çiziyor; bu şerit yalnızca **bir şey olduğunu**
    söylüyor — müşteri ekrana bakarken değişimi kaçırmasın.

    ⚠️ Metin "onaylandı" demiyor, "güncellendi" diyor: ne olduğunu
    sunucudan gelen başlık söylüyor (kullanıldı / geri alındı / süresi
    doldu) ve burada ikinci bir yorum yapmak yanlış olabilirdi.
  */
  if (!degisti) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="gir mb-4 rounded-2xl border border-vurgu bg-vurgu/10 px-5 py-4 text-center text-[14px] font-semibold"
    >
      Kuponun durumu az önce güncellendi.
    </div>
  );
}
