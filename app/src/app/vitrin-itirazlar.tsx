import { Beliren, Sirali } from "./vitrin-hareket";

/**
 * "Kafenin aklından geçenler" — Ü220.
 *
 * ── 🔴 SSS ile aynı şey DEĞİL ───────────────────────────────
 *
 * İkisi de soru soruyor ve bu yüzden birleştirilmek istenebilir; ayrı
 * durmalarının sebebi soruların **kime ait** olduğu:
 *
 *   · `VitrinSSS` → ürüne dair bilgi soruları ("POS gerekiyor mu?",
 *     "müşteri uygulama indirir mi?"). Cevabı bir olgu.
 *   · Burası → satın almaya dair **itirazlar** ("personelim bununla
 *     uğraşacak mı?", "kârım düşmez mi?"). Cevabı bir gerekçe.
 *
 * Referans da ikisini ayrı bölüm olarak tutuyor. Tek listede
 * toplansalardı ya itirazlar bilgi sorularının arasında kaybolurdu ya
 * da SSS on üç maddelik bir duvara dönerdi.
 *
 * ── Neden açılır kapanır DEĞİL ──────────────────────────────
 *
 * SSS `<details>` kullanıyor: orada okuyucu **belirli** bir soruyu
 * arıyor. Buradaki itirazlar ise okuyucunun henüz dile getirmediği
 * şeyler — kapalı dururlarsa hiç açılmazlar. Cevaplar açıkta.
 *
 * ── ⚠️ Cevapların hepsi üründe doğrulanabilir ───────────────
 *
 * Sayfanın kuralı (bkz. `vitrin-olcum.tsx`): söylenen her şey üründe var.
 * Buradaki altı cevap da başka bölümlerin ya da SSS'in söylediğiyle
 * **aynı** şeyi söylüyor — biri değişirse öteki yalan olur, o yüzden
 * yeni bir vaat eklenmedi.
 */

type Itiraz = { soru: string; cevap: React.ReactNode };

const ITIRAZLAR: Itiraz[] = [
  {
    soru: "“Müşteri bunu gerçekten kullanır mı?”",
    cevap: (
      <>
        Karekodu okutmak, çarkı çevirmek ve ödülü görmek üç adım. Uygulama
        indirmek yok, hesap açmak yok — müşteri{" "}
        <strong className="font-semibold text-yazi">masadan kalkmadan</strong>{" "}
        bitiriyor. Zaten telefonuna bakarak beklediği dakikalardan söz
        ediyoruz.
      </>
    ),
  },
  {
    soru: "“Ben zaten Instagram'a para veriyorum. Neden buna da vereyim?”",
    cevap: (
      <>
        İkisi aynı işi yapmıyor. Reklamın işi müşteriyi{" "}
        <strong className="font-semibold text-yazi">kapıya getirmek</strong>;
        Looply&apos;nin işi giren müşteriye{" "}
        <strong className="font-semibold text-yazi">yarın için bir sebep</strong>{" "}
        bırakmak. Reklam gösterim sayıyor, Looply kapıdan gireni.
      </>
    ),
  },
  {
    soru: "“Personelim bununla uğraşacak mı?”",
    cevap: (
      <>
        Yeni cihaz, POS bağlantısı ya da ekstra bir işlem adımı yok. Müşteri
        kuponunu gösteriyor, personel panelden ya da telefonundan onaylıyor.
        Yanlış onay için <strong className="font-semibold text-yazi">60
        saniyelik geri alma</strong> var.
      </>
    ),
  },
  {
    soru: "“Ödül verirsem kârım düşmez mi?”",
    cevap: (
      <>
        Günlük indirim bütçeni sen giriyorsun ve o bütçeyi aşan{" "}
        <strong className="font-semibold text-yazi">tek bir kupon bile
        üretilmiyor</strong>. Dağıtılıp kullanılmayan kuponun maliyeti de yok —
        gider yalnızca kasada onaylanınca doğuyor.
      </>
    ),
  },
  {
    soru: "“Müşteri sadece ödül için gelip çıkarsa?”",
    cevap: (
      <>
        Ödül hemen açılmıyor; kullanmak için{" "}
        <strong className="font-semibold text-yazi">tekrar gelmesi</strong>{" "}
        gerekiyor ve geldiğinde hesap ödüyor. Kataloğu da sen kuruyorsun:
        kuponun yanında ne satmak istiyorsan onu koyuyorsun.
      </>
    ),
  },
  {
    soru: "“Bu sadece bir oyun uygulaması mı?”",
    cevap: (
      <>
        Hayır. Oyun <strong className="font-semibold text-yazi">giriş
        kapısı</strong>. Satılan şey sonrası: ödül, bekleme, kupon ve ikinci
        ziyaret. Yukarıdaki yedi adımlı döngünün altısı oyun bittikten sonra
        başlıyor.
      </>
    ),
  },
];

export function VitrinItirazlar() {
  return (
    <section id="itirazlar" className="scroll-mt-20 bg-cukur py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-5">
        <Beliren yon="olcek">
          <p className="etiket-caps text-yazi-sonuk">Kafenin aklından geçenler</p>
          <h2 className="mt-4 max-w-3xl font-display text-[clamp(28px,4.6vw,50px)] leading-[1.04] font-extrabold tracking-[-0.03em]">
            “Peki bunu benim kafede
            <br />
            <span className="text-vurgu">kullanırlar mı?</span>”
          </h2>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-yazi-sonuk">
            Karar vermeden önce aklına gelen soruları biz soralım. Altısının da
            cevabı üründe var — sahada başka bir şey çıkmıyor.
          </p>
        </Beliren>

        <Sirali adim={110} cocukSinifi="h-full" className="mt-12 grid gap-4 sm:grid-cols-2">
          {ITIRAZLAR.map((i) => (
            <div
              key={i.soru}
              className="relative h-full overflow-hidden rounded-2xl border border-cizgi bg-yuzey p-7"
            >
              {/*
                🔴 Dev tırnak — Ü233.

                Ürün sahibi: *"mobilde çok düz duruyor, çok görselsiz,
                sadece yazı."* Dar ekranda altı kart tek sütuna
                diziliyor ve hepsi birbirinin aynısı: beyaz kutu, kalın
                soru, gri cevap. Göz tutunacak yer bulamıyor.

                Tırnak **süs değil, işaret**: bu kartlardaki cümleler
                işletmecinin ağzından çıkan itirazlar ve metin zaten
                tırnak içinde yazılı. Dev tırnak onu görünür kılıyor —
                kart "burada biri konuşuyor" diyor.

                ⚠️ Soluk (%11) ve `overflow-hidden` ile kırpılıyor:
                okunacak şey soru, tırnak yalnızca dokusu. İlk denemede
                %7'ydi ve ekranda neredeyse görünmüyordu.

                ⚠️ İkon uydurulmadı. Altı itirazın her birine ayrı bir
                simge çizmek, soruların kendisini süse çevirirdi; hepsi
                aynı türden bir şey söylüyor ve aynı işareti taşıyor.
              */}
              <span
                aria-hidden
                className="pointer-events-none absolute -top-9 right-2 font-display text-[124px] leading-none font-extrabold text-vurgu/[0.11] select-none"
              >
                &rdquo;
              </span>

              {/* ⚠️ Soru başlık boyutunda, cevap gövde: kartın taşıdığı
                  şey itirazın kendisi. */}
              <p className="relative font-display text-[19px] leading-tight font-bold tracking-tight">
                {i.soru}
              </p>
              <p className="relative mt-3 text-[14px] leading-relaxed text-yazi-sonuk">
                {i.cevap}
              </p>
            </div>
          ))}
        </Sirali>
      </div>
    </section>
  );
}
