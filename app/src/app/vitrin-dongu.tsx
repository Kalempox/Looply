import { Karekod } from "@/components/karekod";
import { Gorsel } from "@/components/oyuncu-gorsel";
import { CarkIkonu, HediyeIkonu } from "@/components/oyuncu-ikon";
import { Beliren, Sirali } from "./vitrin-hareket";

/**
 * Looply döngüsü — Ü200.
 *
 * ── 🔴 Ürünün adı Looply ve döngüyü çizmiyorduk ─────────────
 *
 * Vitrin döngüyü dört numaralı paragrafla anlatıyordu: karekod koy →
 * müşteri oynasın → ödülü sen belirle → yarın gelsin. Doğru ama
 * **düz bir liste**, ve listenin sonu yok; döngünün olayı ise sonunun
 * başına bağlanması.
 *
 * Ürün sahibinin gönderdiği örnek bunu yedi düğümlü bir halka olarak
 * çizmişti ve fark açık: okuyan kişi "sonra ne oluyor" diye sormuyor,
 * çünkü ok başa dönüyor.
 *
 * ── Neden yedi adım ─────────────────────────────────────────
 *
 * Dört adımlık anlatı **kafenin** yaptıklarını sayıyordu (karekod koy,
 * bütçe belirle). Bu halka **müşterinin** yaşadığını sayıyor ve
 * aradaki üç adım tam da kafenin göremediği kısım: ödülün beklemesi,
 * hatırlatma, kasada kullanım. Satılan şey oyun değil, o üç adım.
 *
 * ⚠️ Adımların hepsi üründe VAR. Hatırlatma altyapısı duruyor
 * (sağlayıcı bağlantısı ertelendi, 2026-09-20) ve bu yüzden metni
 * "hatırlatır" değil **"süresi yaklaşınca hatırlatılır"** — ürünün
 * yaptığı şeyi anlatıyor, satmadığımız bir kanalı değil.
 *
 * ⚠️ Halka SVG değil ızgara. Gerçek bir çember çizmek 375 pikselde
 * okunmayan bir yazı yumağı veriyor; adımlar kartlar hâlinde akıyor ve
 * döngüyü **kapatan** şey sondaki dönüş oku.
 */

type Adim = {
  no: string;
  baslik: string;
  metin: string;
  /** Adımın simgesi — Ü232. */
  ikon: React.ReactNode;
};

/**
 * Adım simgeleri — Ü232.
 *
 * ── 🔴 Yedi kutu birbirinin aynısıydı ───────────────────────
 *
 * Ürün sahibi: *"bu kısmı görselleştir."* Bölüm döngünün yedi adımını
 * sayıyordu ama kartları ayırt eden tek şey **numaraydı**; göz bir
 * duvar görüyor, okumaya oradan başlamıyordu.
 *
 * ── Simgeler ürünün kendi dilinden ──────────────────────────
 *
 * Karekod **gerçek** (`Karekod` bileşeni), kumanda · çark · hediye ·
 * bilet ürünün kendi ikon setinden. İkisi burada çizildi çünkü sette
 * yoktu: **bekleme** (kadran) ve **hatırlatma** (zil). Aynı düz,
 * konturlu dilde — yeni bir stil açılmadı.
 */
function Saat() {
  return (
    <svg viewBox="0 0 48 48" className="size-6" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="25" r="16" />
      <path d="M24 16v9l6 4M17 5l-6 4M31 5l6 4" />
    </svg>
  );
}

function Zil() {
  return (
    <svg viewBox="0 0 48 48" className="size-6" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 33c3-3 3-5 3-11a10 10 0 0 1 20 0c0 6 0 8 3 11H11Z" />
      <path d="M20 39a4 4 0 0 0 8 0" />
    </svg>
  );
}

const ADIMLAR: Adim[] = [
  {
    no: "1",
    baslik: "Karekodu okutur",
    metin: "Masada, uygulama indirmeden.",
    /* ⚠️ Gerçek karekod, soyut desen değil — aynı karar Ü154'te
       kaydırmalı sahne için de verilmişti. */
    ikon: (
      /* ⚠️ Karekod öbür simgelerden yoğun: aynı piksel boyunda optik
         olarak daha küçük ve daha koyu duruyor. 26 yerine 30 basılıyor
         ki sırada tek başına çukurda kalmasın. */
      <span className="block [&_svg]:block [&_svg]:size-[30px]">
        <Karekod deger="https://looplybusiness.com" boyut={30} etiket="" />
      </span>
    ),
  },
  {
    no: "2",
    baslik: "Oynar",
    metin: "Siparişini beklerken geçen dakikalar.",
    ikon: <Gorsel ad="kumanda" boy={26} />,
  },
  {
    no: "3",
    baslik: "Ödülünü kazanır",
    metin: "Senin kataloğundan, senin bütçenden.",
    ikon: <CarkIkonu boy={26} />,
  },
  {
    no: "4",
    baslik: "Bekler",
    metin: "Ödül hemen açılmaz — merak kalır.",
    ikon: <Saat />,
  },
  {
    no: "5",
    baslik: "Hatırlatılır",
    metin: "Süresi yaklaşınca haber gider.",
    ikon: <Zil />,
  },
  {
    no: "6",
    baslik: "Kasada kullanır",
    metin: "Kuponu gösterir, personel onaylar.",
    ikon: <Gorsel ad="bilet" boy={26} />,
  },
  {
    no: "↻",
    baslik: "Tekrar gelir",
    metin: "Ve döngü baştan başlar.",
    ikon: <HediyeIkonu boy={26} />,
  },
];

export function VitrinDongusu() {
  return (
    <section
      id="nasil-calisir"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20 sm:py-28"
    >
      <Beliren yon="olcek">
        <p className="etiket-caps text-yazi-sonuk">Nasıl çalışır</p>
        <h2 className="mt-4 max-w-3xl font-display text-[clamp(30px,5vw,54px)] leading-[1.02] font-extrabold tracking-[-0.03em]">
          Müşteriyi sadece getirme.
          <br />
          <span className="text-vurgu">Geri gelmesi</span> için bir sebep
          oluştur.
        </h2>
        <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-yazi-sonuk">
          Looply&apos;nin merkezinde oyun yok. Oyundan sonra devam eden yedi adım
          var ve kafenin bugün göremediği kısım tam ortada duruyor.
        </p>
      </Beliren>

      <Sirali adim={90} cocukSinifi="h-full" className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ADIMLAR.map((a, i) => {
          const kapanis = i === ADIMLAR.length - 1;
          return (
            <div
              key={a.no}
              /* ⚠️ Son kart vurgulu: döngüyü **kapatan** adım o ve
                 kafenin satın aldığı şey de o. Diğer altısı ona giden
                 yol. */
              className={`relative h-full overflow-hidden rounded-2xl border p-5 ${
                kapanis
                  ? "border-vurgu bg-vurgu text-yuzey"
                  : "border-cizgi bg-yuzey"
              }`}
            >
              {/* ⚠️ Numara ve simge YAN YANA: numara sırayı, simge
                  adımın ne olduğunu söylüyor. Numara simgeyle
                  değiştirilseydi döngünün sırası kaybolurdu — bölümün
                  tek iddiası zaten o sıra. */}
              <span className="flex items-center gap-2.5">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full font-data text-[15px] font-bold ${
                    kapanis ? "bg-white/20 text-yuzey" : "bg-cukur text-vurgu"
                  }`}
                >
                  {a.no}
                </span>
                <span
                  aria-hidden
                  className={kapanis ? "text-yuzey" : "text-vurgu"}
                >
                  {a.ikon}
                </span>
              </span>
              <h3
                className={`mt-3.5 font-display text-[17px] leading-tight font-bold ${
                  kapanis ? "text-yuzey" : ""
                }`}
              >
                {a.baslik}
              </h3>
              <p
                className={`mt-1.5 text-[14px] leading-relaxed ${
                  kapanis ? "text-white/80" : "text-yazi-sonuk"
                }`}
              >
                {a.metin}
              </p>
            </div>
          );
        })}
      </Sirali>

      <Beliren yon="yakin">
        <p className="mt-8 text-[14px] leading-relaxed text-yazi-sonuk">
          <span className="font-semibold text-yazi">4, 5 ve 6.</span> adımları
          bugün göremiyorsun. İndirim verdin — kaçı kullanıldı, kim geri geldi?
          Looply&apos;nin sattığı şey oyun değil, o üç adım.
        </p>
      </Beliren>
    </section>
  );
}
