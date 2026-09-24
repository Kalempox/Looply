"use client";

import { useEffect, useState } from "react";
import { Cark, type CarkDilimi, type CevirmeCevabi, type KazanilanKupon } from "./cark";
import { KartDalgalari, KartResmi } from "./kart-gorseli";
import { RENK } from "./oyuncu-renk";

/**
 * Davet kartının rengi — `/oyna`daki çark kartıyla AYNI (Ü188, pembe).
 *
 * Sabit ve kafeye göre değişmiyor: çark bir ödül türü değil, ürünün tek
 * bir özelliği. İki ekranda iki ton, aynı şeyin iki farklı nesne
 * olduğunu söylerdi.
 */
const DAVET = RENK.pembe;

/**
 * Çark sahnesi — Ü59.
 *
 * ── Neden tam ekran ─────────────────────────────────────────
 *
 * Çark bir kartın içinde duruyordu: sayfanın ortasında, altında ve
 * üstünde başka içerik varken. Ürün sahibi *"çarkı çevirme animasyonu
 * ekrana gelip ekranda belirmeli, o kutunun içinde olmamalı"* dedi.
 *
 * Haklı gerekçesi şu: çevirme **tek seferlik ve gününün olayı**. Kartın
 * içinde kaldığında sayfadaki onuncu bileşen gibi görünüyor; tam ekranda
 * ekranın o anki tek işi oluyor ve dönüş gerçekten bir olay gibi
 * hissediliyor.
 *
 * ── Sayfada kalan şey ───────────────────────────────────────
 *
 * Sayfada yalnızca **davet** duruyor: küçük bir çark önizlemesi ve
 * düğme. Ödül listesini orada da göstermek sahneyi gereksiz kılardı.
 *
 * ── Kapatma kuralı ──────────────────────────────────────────
 *
 * Çark dönerken sahne kapanmıyor: yarıda kesilen bir dönüşten sonra
 * oyuncu ne kazandığını göremez ama kupon çoktan yazılmıştır. Kapatma
 * yalnızca çevirmeden önce ve sonuç göründükten sonra açık.
 */
export function CarkSahnesi({
  dilimler,
  cevir,
  kilitli = false,
  kapaliMetin,
  altMetin,
  kazandiMetni,
  davetBaslik,
  davetMetin,
  otomatikAc,
}: {
  dilimler: CarkDilimi[];
  cevir: () => Promise<CevirmeCevabi>;
  kilitli?: boolean;
  /** Çark kapalıysa sayfada görünen sebep. */
  kapaliMetin?: string;
  altMetin: string;
  kazandiMetni: React.ReactNode | ((kupon: KazanilanKupon | null) => React.ReactNode);
  davetBaslik: string;
  davetMetin: string;
  /**
   * Sahne kendiliğinden açılsın mı? (Ü96)
   *
   * Ürün sahibi: *"karekodu okutunca otomatik direkt çarka çevirmeyle
   * başlamalı."* Karekodu okutan kişi bir karar vermek için değil,
   * **oynamak** için okutuyor; araya "dokun, çark açılsın" diye bir adım
   * koymak hunideki ilk dönüşümü boşa harcıyor.
   *
   * ⚠️ Kararı **sunucu** veriyor: karekod adresi `?cark=1` ile geliyor ve
   * bayrak yalnızca o girişte doluyor. İlk sürüm burada `sessionStorage`
   * okuyordu ve hiç açılmadı — `useState` başlatıcısı sunucuda da
   * çalışıyor, orada `sessionStorage` yok, `catch` `false` dönüyor ve
   * hidrasyon o değeri koruyordu. Tarayıcıya özel bir API'yi ilk render'ın
   * kararına sokmak bu yüzden çalışmıyor.
   *
   * Kilitli çarkta (bugün çevrilmiş ya da kapalı) hiç açılmıyor — açılsaydı
   * sahne yalnızca "yarın gel" demek için tam ekranı kaplardı.
   */
  otomatikAc?: boolean;
}) {
  const [acik, setAcik] = useState(!!otomatikAc && !kilitli);
  const [donuyor, setDonuyor] = useState(false);

  /**
   * Sahne açıkken arka plan kaymasın.
   *
   * Kilitlenmezse çark tam ekranken parmak hareketi altındaki sayfayı
   * kaydırıyor ve sahne kapandığında oyuncu bambaşka bir yerde
   * buluyor kendini.
   */
  useEffect(() => {
    if (!acik) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = onceki;
    };
  }, [acik]);

  useEffect(() => {
    if (!acik) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !donuyor) setAcik(false);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [acik, donuyor]);

  return (
    <>
      {/* ── Sayfadaki davet ───────────────────────────── */}
      {/*
        🔴 Davet KOYU bilete geçti — Ü194.

        Bu kart pastel krem bir kutuydu ve içinde `MiniCark` adında
        sadeleştirilmiş bir çark simgesi duruyordu. Ürün sahibi misafir
        ekranına bakıp *"buranın arayüzünü de düzeltmemişsin"* dedi.

        🔴 Asıl mesele tek kartın soluk olması değil: çarka üç ayrı
        kapıdan giriliyor ve **ikisi** zaten koyu bileti konuşuyordu —
        `/oyna`daki çark kartı (Ü188'de geçti, üstünde Ü189'un
        illüstrasyonu) ve sahnenin kendisi. Geride kalan bu üçüncüsüydü
        ve iki ekranda birden görünüyor: `/cark` ile misafirin ilk
        ekranı `/hemen`.

        ⚠️ `MiniCark` SİLİNDİ, kullanılmıyor diye bırakılmadı. Onun işi
        "küçük boyutta okunan bir çark" idi; illüstrasyon o işi
        kendisi yapıyor ve iki çark çizimini birlikte güncel tutmak
        Ü71'in uyardığı çatlağın ta kendisi.

        ⚠️ Kilitliyken `grayscale`: kapalı çarkta neşeli, renkli bir
        Loopy kartın söylediğiyle çelişiyordu.
      */}
      {/*
        ⚠️ Yüzey `BiletYuzeyi` ile DEĞİL, gradyanı doğrudan verilerek
        kuruluyor. Sebep yapısal: `BiletYuzeyi` çocuklarını bir `<div>`e
        sarıyor ve `<button>`ın içerik modeli yalnızca **phrasing**
        içerik kabul ediyor. Aynı tercih seri kartında da yapıldı
        (`seri-sahnesi.tsx`) ve gerekçesi orada da bu.
      */}
      <button
        type="button"
        onClick={() => !kilitli && setAcik(true)}
        disabled={kilitli}
        className={`kart-golge kart-gel relative w-full overflow-hidden rounded-3xl px-5 py-5 text-left text-white transition-transform active:scale-[0.99] disabled:active:scale-100 ${
          kilitli ? "opacity-60 grayscale" : ""
        }`}
        style={{ background: `linear-gradient(115deg, ${DAVET.koyu} 0%, ${DAVET.ana} 100%)` }}
      >
        <KartDalgalari vurgu={`${DAVET.canli}38`} />

        {/* ⚠️ Görsel sağ üstten TAŞIYOR ve kırpılıyor — `/oyna`daki
            kardeşiyle birebir aynı ölçü (Ü189). İçine sığdırılmış
            hâli "buraya bir ikon koyduk" diye okunuyor. */}
        <span aria-hidden className="pointer-events-none absolute -top-6 -right-10">
          <KartResmi ad="cark" boy={184} />
        </span>

        {/* Perde: çizimin metne değdiği yerde zemin koyulaşıyor. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(100deg, ${DAVET.koyu} 30%, ${DAVET.koyu}dd 52%, transparent 74%)`,
          }}
        />

        {/* ⚠️ Kolon DAR: görsel sağın üçte birini kaplıyor ve tam
            genişlikte bir satır onun altına girerdi. */}
        <span className="relative block max-w-[60%]">
          <span className="block font-display text-xl leading-tight font-extrabold text-white">
            {davetBaslik}
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-white/80">
            {kilitli ? kapaliMetin : davetMetin}
          </span>
        </span>
      </button>

      {/* ── Sahne ─────────────────────────────────────── */}
      {acik && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Şans çarkı"
          className="sahne-ac fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto px-5 py-8"
        >
          {/*
            Zemin ve ışınlar AYRI katmanlar, ikisi de `absolute inset-0`.

            Bir tur zemin doğrudan diyalogun kendi `background`'ıydı ve
            ışınlar `-z-10` ile arkasına konmuştu. Sonuç: sahne saydam
            açıldı, altındaki sayfa okunuyordu. Negatif z-index, kendi
            yığın bağlamı içinde ebeveynin zemininin de arkasına düşüyor
            — o katman hiç görünmüyor, zemin de boyanmıyordu.

            Şimdi sıralama açık: zemin, ışınlar, içerik. Negatif değer yok.
          */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              // Koyu mor gradyan: referans çarkların hepsi koyu, doygun bir
              // zemine oturuyor. Pastel dilimler ancak orada parlıyor.
              background:
                "radial-gradient(circle at 50% 38%, #4c2a8f 0%, #2a1450 45%, #150a2b 100%)",
            }}
          />
          {/*
            Işın demeti KIRPMA katmanının içinde.

            Doğrudan sahneye konduğunda 150vmax'lik boyu sahnenin kaydırma
            alanını 1015 piksele çıkarıyordu (ekran 812): sahne sebepsiz
            kaydırılabilir hâle geliyor ve `justify-center` ile ortalanan
            içeriğin üstü erişilemez oluyordu. Kırpma, ışığı görsel bir
            katman olarak bırakıp yerleşimden çıkarıyor.
          */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <span
              className="sahne-isik absolute top-1/2 left-1/2 size-[150vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.14]"
              style={{
                background:
                  "repeating-conic-gradient(from 0deg, #fff 0deg 6deg, transparent 6deg 18deg)",
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setAcik(false)}
            disabled={donuyor}
            aria-label="Kapat"
            className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/12 text-[20px] text-white transition-colors hover:bg-white/22 disabled:opacity-30"
          >
            ×
          </button>

          <div className="sahne-cark-gel relative z-10 w-full max-w-[420px]">
            <Cark
              dilimler={dilimler}
              cevir={cevir}
              altMetin={altMetin}
              kazandiMetni={kazandiMetni}
              koyuZemin
              donusBildir={setDonuyor}
            />
          </div>
        </div>
      )}
    </>
  );
}
