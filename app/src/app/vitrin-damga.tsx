import { Bilet } from "@/components/bilet";
import { Gorsel } from "@/components/oyuncu-gorsel";
import { Beliren, Sirali } from "./vitrin-hareket";

/**
 * "Biz zaten damga kartı veriyoruz." — Ü220.
 *
 * ── Neden bu bölüm gerekliydi ───────────────────────────────
 *
 * Ürün sahibinin gönderdiği içerik listesinde vardı ve bizde **hiç
 * yoktu.** Eksikliği ciddi: Türkiye'de kafelerin sadakat aracı büyük
 * ölçüde damga kartı ve işletmeci Looply'yi boşlukta değil, elindeki
 * kartla karşılaştırarak değerlendiriyor. Cevap verilmediğinde soru
 * kaybolmuyor, yalnızca **sahada** soruluyor.
 *
 * ── 🔴 Rakip kötülenmiyor ───────────────────────────────────
 *
 * Aynı kural reklam karşılaştırmasında da yazılı (`page.tsx`): "damga
 * kartı işe yaramaz" demek hem yanlış hem de kartı bugün dağıtan
 * işletmeciyi savunmaya geçirir. Söylenen şey dar ve doğrulanabilir:
 * kart **ödüle ulaşmayı** sayıyor, aradaki günleri saymıyor.
 *
 * ── Satırların konusu var ───────────────────────────────────
 *
 * Referans iki sütunu yan yana dizip bırakıyordu. Burada her satırın
 * bir **konusu** var (ödüle ne zaman ulaşır, hatırlamak kimde…), çünkü
 * konu yazılmazsa iki cümle karşılaştırma değil iki ayrı iddia olarak
 * okunuyor.
 *
 * ── ⚠️ Hatırlatma satırı ürünün bugünkü hâline göre yazıldı ─
 *
 * Referans *"dijital hatırlatmalar gönderilebilir"* diyordu. Bizde
 * hatırlatma altyapısı hazır ama **gönderim kanalı kapalı**
 * (2026-09-20, ürün sahibinin kararı) ve SSS bunu açıkça söylüyor.
 * Vitrinde olmayan bir kanalı anlatmak, SSS'in üç satır aşağıda
 * "hayır" demesi demekti. Satır bugün doğru olanı söylüyor: ödül
 * müşterinin kendi ekranında, tarihiyle birlikte duruyor.
 */

type Satir = { konu: string; kart: string; looply: string };

const SATIRLAR: Satir[] = [
  {
    konu: "Ödüle ne zaman ulaşır",
    kart: "Ödül, belirli sayıda damga tamamlanana kadar bekler.",
    looply: "Karekodu okutan müşteri daha ilk oturuşta ödül kazanabilir.",
  },
  {
    konu: "Hatırlamak kimde",
    kart: "Kartı saklamak ve yanında getirmek müşterinin işi.",
    looply:
      "Ödül telefonunda duruyor; ne zaman açılacağı ve ne zaman biteceği ekranında yazıyor.",
  },
  {
    konu: "Bugün elinde ne var",
    kart: "Yarım kalmış bir kart — bugün kullanabileceği bir şey değil.",
    looply: "Bir sonraki gelişinde kasada gösterebileceği bir kupon.",
  },
  {
    konu: "Ödülü kullanınca",
    kart: "Müşteri sıfırdan damga toplamaya başlar.",
    looply: "Oyunlar ve çark her gün yeniden açılıyor; döngü kaldığı yerden sürüyor.",
  },
  {
    konu: "Başka ürün satmak",
    kart: "Kartın tek işi var: damga biriktirmek.",
    looply:
      "Öne çıkarmak istediğin ürün ödül kataloğunda duruyor — cheesecake, kurabiye, yeni içecek.",
  },
  {
    konu: "Kim nerede kaldı",
    kart: "Hangi müşterinin hangi adımda olduğunu göremezsin.",
    looply: "Karekod → oyun → ödül → kupon → kasada kullanım, hepsi panelde.",
  },
];

/**
 * Kâğıt damga kartı — Ü232.
 *
 * ⚠️ Ürünün bir parçası DEĞİL, karşılaştırmanın öteki tarafı. O yüzden
 * ürünün kart dili (koyu zemin, desen, illüstrasyon) bilerek
 * kullanılmadı: kâğıt kart kâğıt gibi duruyor — krem zemin, kesik
 * çerçeve, elle basılmış damgalar.
 *
 * ⚠️ Damga simgesi `Gorsel ad="icecek"` — ürünün kendi fincan çizimi.
 * Yeni bir fincan çizmek, aynı şeyin ikinci bir versiyonunu doğururdu.
 *
 * ⚠️ On kutucuk ve **altısı dolu**: kartın kendi vaadi ("onuncu
 * kahve bedava") görünüyor ve müşterinin **henüz ulaşamadığı** hâl
 * gösteriliyor. Tamamı dolu bir kart, bölümün anlattığı boşluğu
 * anlatmazdı.
 */
function DamgaKarti() {
  const DOLU = 6;

  return (
    <div
      aria-hidden
      className="mx-auto w-full max-w-[340px] rounded-2xl border-2 border-dashed border-vitrin-lacivert/20 bg-[#fdfaf3] px-5 py-5 shadow-[0_14px_34px_-20px_rgba(16,32,77,0.45)]"
    >
      <p className="etiket-caps text-[10px] text-yazi-sonuk">Kahve kartı</p>
      <p className="mt-1 font-display text-[17px] leading-tight font-bold">
        10 kahve · 1 bedava
      </p>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`grid aspect-square place-items-center rounded-full border ${
              i < DOLU
                ? "border-transparent bg-vitrin-lacivert/8 text-vitrin-lacivert/55"
                : "border-dashed border-vitrin-lacivert/25 text-transparent"
            }`}
          >
            {i < DOLU ? (
              <Gorsel ad="icecek" boy={17} />
            ) : (
              <span className="font-data text-[11px] text-vitrin-lacivert/25">
                {i + 1}
              </span>
            )}
          </span>
        ))}
      </div>

      <p className="mt-4 border-t border-dashed border-vitrin-lacivert/15 pt-3 text-[12px] text-yazi-sonuk">
        Dördü daha · kartı yanında getirmen gerekiyor
      </p>
    </div>
  );
}

/**
 * Satır simgeleri — Ü233.
 *
 * ── 🔴 Mobilde bölüm bir yazı duvarıydı ─────────────────────
 *
 * Ürün sahibi: *"bu kısım mobilde çok düz duruyor, çok görselsiz,
 * sadece yazı ve karmaşık."* Dar ekranda her satır şuna dönüşüyordu:
 * konu → **DAMGA KARTI** → cümle → ayraç → **LOOPLY** → cümle. Altı
 * satır = on iki metin bloğu ve aralarında tekrar eden iki etiket.
 *
 * Etiketler mobilde simgeye çevrildi: **kâğıt kart** ve **telefon**.
 * İkisi de yukarıdaki görselde duran nesnelerin küçüğü, yani okuyucu
 * bağlantıyı kendiliğinden kuruyor.
 *
 * ⚠️ ✓/− KULLANILMADI. Sayfanın reklam karşılaştırmasında o işaretler
 * var ama orada iddia "öteki daha kötü". Burada bölümün kendi cümlesi
 * *"doğru bir araç ve çalışıyor"* — kâğıt kartın yanına eksi koymak,
 * bölümü görselle yalanlamak olurdu. Simgeler **tarif ediyor**, hüküm
 * vermiyor.
 *
 * ⚠️ Etiket metni `sr-only` olarak duruyor: simge `aria-hidden` ve
 * ekran okuyucuda iki cümle hangisine ait olduğu belli olmadan
 * okunamaz.
 */
function KagitSimgesi() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" strokeDasharray="3 2.5" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="13.5" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" strokeDasharray="2 2" />
    </svg>
  );
}

function TelefonSimgesi() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />
      <path d="M10.5 5.5h3" />
      <path d="M9.5 12.5h5M9.5 16h3" />
    </svg>
  );
}

export function VitrinDamga() {
  return (
    <section id="damga" className="scroll-mt-20 bg-vitrin-fildisi py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-5">
        <Beliren yon="olcek">
          <p className="etiket-caps text-yazi-sonuk">Damga kartı</p>
          <h2 className="mt-4 max-w-3xl font-display text-[clamp(28px,4.6vw,50px)] leading-[1.04] font-extrabold tracking-[-0.03em]">
            “Biz zaten damga kartı
            <br />
            veriyoruz.”
          </h2>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-yazi-sonuk">
            Doğru bir araç ve çalışıyor. Looply onun yerine geçmek için değil,
            müşterinin <strong className="font-semibold text-yazi">iki gelişi
            arasındaki boşluğu</strong> doldurmak için farklı bir mekanik
            kuruyor.
          </p>
        </Beliren>

        {/*
          ── İki araç yan yana — Ü232 ────────────────────────

          Ürün sahibi: *"bu kısmı görselleştir."* Bölüm altı satır
          karşılaştırma yapıyordu ve **hiçbirini göstermiyordu**;
          okuyan kişi iki aracı kafasında canlandırmak zorundaydı.

          Soldaki kart bir **kâğıt damga kartının** kendisi: on
          kutucuk, altısı damgalı. Sağdaki ürünün **gerçek kupon
          kartı** (`Bilet`, süs kipinde) — vitrinin başka yerinde de
          uçan kartların aynısı.

          ⚠️ Damga kartı **kötülenmiyor**: dolu, düzgün, işleyen bir
          kart çizildi. Yarım yamalak bir kart çizmek, bölümün
          *"doğru bir araç ve çalışıyor"* cümlesini görselle
          yalanlamak olurdu.
        */}
        <Beliren yon="yakin" className="mt-12">
          <div className="grid items-center gap-5 sm:grid-cols-[1fr_auto_1fr] sm:gap-7">
            <DamgaKarti />

            <span
              aria-hidden
              className="hidden shrink-0 text-[13px] font-semibold tracking-[0.18em] text-yazi-sonuk uppercase sm:block"
            >
              yanında
            </span>

            <div className="mx-auto w-full max-w-[340px]">
              <Bilet
                sus
                veri={{
                  href: "/oduller",
                  kafe: "Kafende",
                  baslik: "Ücretsiz filtre kahve",
                  gorsel: "icecek",
                  renk: "kahve",
                  son: "yarın kullan",
                  tarihOneki: "",
                }}
              />
            </div>
          </div>
        </Beliren>

        {/*
          ⚠️ Sütun başlıkları yalnızca geniş ekranda. Dar ekranda her
          satır zaten kendi içinde etiketli (iki küçük başlık): 375
          pikselde tabloyu yatay kaydırtmak yerine satırı dikey açmak,
          bu sayfada daha önce de seçilen yol.
        */}
        <div
          aria-hidden
          className="mt-12 hidden gap-4 px-6 sm:grid sm:grid-cols-[minmax(0,10rem)_1fr_1fr]"
        >
          <span />
          <span className="etiket-caps text-[10px] text-yazi-sonuk">Damga kartı</span>
          <span className="etiket-caps text-[10px] text-vurgu">Looply</span>
        </div>

        <Sirali adim={90} cocukSinifi="h-full" className="mt-3 grid gap-3">
          {SATIRLAR.map((s) => (
            <div
              key={s.konu}
              className="h-full rounded-2xl border border-cizgi bg-yuzey px-6 py-5 sm:grid sm:grid-cols-[minmax(0,10rem)_1fr_1fr] sm:items-baseline sm:gap-4"
            >
              <p className="font-display text-[15px] leading-tight font-bold tracking-tight">
                {s.konu}
              </p>

              <div className="mt-3 flex items-start gap-3 sm:mt-0 sm:block">
                <span aria-hidden className="mt-[1px] shrink-0 text-yazi-sonuk sm:hidden">
                  <KagitSimgesi />
                </span>
                <span className="sr-only">Damga kartı:</span>
                <p className="text-[14px] leading-relaxed text-yazi-sonuk">{s.kart}</p>
              </div>

              {/*
                ⚠️ Sağ hücre vurgulu DEĞİL — çerçeve ya da renkli zemin
                yok. Karşılaştırmanın işi iki cümleyi yan yana koymak;
                birini kutulayıp öbürünü açıkta bırakmak okuyucuya
                kararı bizim verdiğimizi söylerdi. Ayrım yalnızca
                başlığın renginde.
              */}
              {/* ⚠️ Mobilde ayraç KALKTI: iki simge zaten iki tarafı
                  ayırıyor ve çizgi, altı satırın her birinde tekrar
                  eden fazladan bir yatay çizgi demekti. */}
              <div className="mt-2.5 flex items-start gap-3 sm:mt-0 sm:block">
                <span aria-hidden className="mt-[1px] shrink-0 text-vurgu sm:hidden">
                  <TelefonSimgesi />
                </span>
                <span className="sr-only">Looply:</span>
                <p className="text-[14px] leading-relaxed text-yazi">{s.looply}</p>
              </div>
            </div>
          ))}
        </Sirali>

        <Beliren yon="yakin">
          <p className="mt-8 max-w-2xl border-l-2 border-vurgu pl-5 text-[16px] leading-relaxed">
            Damga kartını bırakman gerekmiyor. İkisi farklı soruya cevap
            veriyor: kart <strong>onuncu kahveyi</strong> sayıyor, Looply{" "}
            <strong>ikinci ziyareti</strong>.
          </p>
        </Beliren>
      </div>
    </section>
  );
}
