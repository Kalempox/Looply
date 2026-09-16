import Link from "next/link";
import { CiftYonluSimulasyon } from "../vitrin-simulasyon";
import { VitrinUstSerit } from "../vitrin-ust";

export const metadata = {
  title: "Değer simülasyonu · Looply",
  description:
    "Kendi rakamlarınla dene: müşterin hem düzenli gelse hem arkadaşını getirse kafene ne katardı?",
};

/**
 * Çift yönlü değer simülasyonu — kendi sayfası (Ü142).
 *
 * ── 🔴 Neden ana sayfadan çıktı ─────────────────────────────
 *
 * Ürün sahibi: *"ana sayfadan kaldırıp simülasyon yapması için müşteriyi
 * itelim, çünkü inanılmaz fazla yer kaplıyor."* Haklı ve ölçülebilir bir
 * gerekçe: sekiz girdisi ve dört oranıyla simülasyon ana sayfanın **en
 * uzun bölümüydü**; telefonda onu geçmek için yapılan kaydırma, anlatının
 * ortasını ikiye bölüyordu. İkna olmuş ziyaretçi zaten hesap yapmak
 * istiyor, olmamış ziyaretçi ise sekiz girdilik bir formu geçmek zorunda
 * kalıyordu.
 *
 * Dalga 8'de simülasyonun **sırası** değişmişti (avantajların altına
 * indi); bu tur **yeri** değişti. Sıra kararı boşa gitmedi: ana sayfada
 * yerinde duran kısa bir çağrı aynı noktada, aynı işi yapıyor.
 *
 * ── Sayfa ziyaretçiyi geri bırakmıyor ───────────────────────
 *
 * Hesabı yapan kişi ikna olmuşsa bir sonraki adımı **burada** bulmalı;
 * ana sayfaya dönüp çağrı araması, ikna anı ile düğme arasına kaydırma
 * koymak olurdu (aynı gerekçe ana sayfadaki ara çağrının da sebebi).
 * O yüzden altta başvuru çağrısı duruyor.
 *
 * ⚠️ Sayfa **dinamik değil**: içinde oturuma ya da veritabanına bağlı
 * hiçbir şey yok, hesabın tamamı tarayıcıda. `force-dynamic` yazmak
 * sayfayı her istekte yeniden üretirdi ve karşılığında hiçbir şey
 * kazandırmazdı.
 */
export default function SimulasyonSayfasi() {
  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <VitrinUstSerit />

      <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-yazi-sonuk transition-colors hover:text-yazi"
        >
          ← Ana sayfa
        </Link>

        <div className="mt-6">
          <CiftYonluSimulasyon />
        </div>

        {/*
          Hesabı yapan kişi için bir sonraki adım.

          ⚠️ Rakam tekrarlanmıyor: yukarıdaki tablo ziyaretçinin kendi
          sayılarıyla konuşuyor ve burada "işte X TL kazanırsın" demek,
          onun gördüğü tabloyu bizim sözümüzle ezmek olurdu.
        */}
        <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-3xl border border-cizgi bg-yuzey px-6 py-7 text-center sm:flex-row sm:px-9 sm:text-left">
          <div>
            <p className="font-display text-[19px] leading-tight font-extrabold tracking-tight sm:text-[22px]">
              Rakamlar tuttuysa, karekod beş dakikada hazır.
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-yazi-sonuk">
              Başvur, onaylanınca panelin açılsın — karekodunu oradan yazdır.
            </p>
          </div>
          <Link
            href="/kafe/basvuru"
            className="shrink-0 rounded-full bg-vurgu px-7 py-3.5 text-[15px] font-semibold text-yuzey transition-opacity hover:opacity-90"
          >
            Hemen dene
          </Link>
        </div>
      </div>
    </main>
  );
}
