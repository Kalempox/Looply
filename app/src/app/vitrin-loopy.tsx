import { Avatar, type AvatarIfadesi } from "@/components/avatar";
import { GOVDE_RENKLERI, SERIT_RENKLERI } from "@/components/avatar-renkleri";
import { Beliren, Sirali } from "./vitrin-hareket";

/**
 * Vitrinde Loopy — Ü219.
 *
 * ── Ürün sahibinin isteği ───────────────────────────────────
 *
 * *"Landing page'e Loopy ekleyelim."* Vitrinde maskot **hiç yoktu**:
 * altı ürün görüntüsü, iki fotoğraf, bir logo — ve ürünün müşteriye
 * gösterdiği tek yüz sayfanın hiçbir yerinde görünmüyordu.
 *
 * ── 🔴 Neden bir bölüm, neden bir sticker değil ─────────────
 *
 * Maskotu sayfanın kenarına yapıştırmak kolaydı ve bu sayfada tam
 * olarak bir kez reddedilmiş olan şey o: *"görsel olarak çok zayıf ve
 * eksiğiz, arka planda buna gerek yok"* — süs, içeriğin yerini
 * tutmuyor. Loopy burada bir **ürün özelliği** olarak duruyor, çünkü
 * öyle: karekodu okutan müşteriyi o karşılıyor (`/hemen`), çarkı o
 * çeviriyor (`components/cark.tsx`), kuponu onun elinden alıyor
 * (`/oduller`). Üç iddia da üründe doğrulanabilir — sayfanın kendi
 * kuralı (bkz. `vitrin-olcum.tsx`).
 *
 * ── 🔴 Zemin neden lacivert bir KART ────────────────────────
 *
 * Karakterin buharı (bu karede görselin içinde gömülü) ve gölgesi
 * **açık renkli**: ikisi de oyuncunun koyu ekranları için üretildi.
 * Beyaz bir zeminde buhar görünmez, gölge ise leke olurdu. Koyu kart
 * üçünü birden çözüyor:
 *
 *   · buhar görünüyor
 *   · `loopy-golge` tam olarak `--color-vitrin-lacivert` tonunda
 *     (rgba(16,32,77,.3)), yani koyu kartta kayboluyor — karakter
 *     zemine yapışmış bir leke değil, havada duruyor
 *   · müşterinin gerçekten gördüğü yüzey koyu; burada da öyle
 *
 * ⚠️ Bölümün **kendi zemini düz beyaz.** Kart, sayfanın simülasyon
 * bloğuyla aynı cihaz — yeni bir zemin rengi icat edilmiyor.
 *
 * ── Yeri ────────────────────────────────────────────────────
 *
 * Ü219'da iki fildişi bölümü (*"Bir kere gelen müşteri"* ve *"Sorun"*)
 * ayırmak için araya konmuştu. Ü227'de *"Sorun"* ile yer değiştirdi,
 * Ü228'de o bölüm tamamen kaldırıldı.
 *
 * Bugünkü yeri: *"Bir kere gelen müşteri"*den hemen sonra, *"Nasıl
 * çalışır"*tan hemen önce — döngü anlatılmadan önce döngüyü taşıyan
 * yüz gösteriliyor.
 */

/**
 * Loopy'nin müşteriyle karşılaştığı üç an.
 *
 * ⚠️ Üçü de üründe **var** ve kareleri gerçekten o ekranlarda kullanılan
 * kareler: `neseli` /hemen'de, `kuponlu` /oduller'de. Vitrinde başka bir
 * yüz göstermek, karekodu okutan müşterinin göreceğinden başka bir şey
 * vaat etmek olurdu.
 *
 * ⚠️ Ortadaki an `neseli` çünkü çarkı çeviren Loopy bir **video**
 * (`/cark/loopy-cevirir.webm`, Ü197) ve tek karesi yana eğilmiş bir
 * gövde — vitrinde tek başına durunca sebepsizce devrilmiş görünürdü
 * (aynı gerekçe Ü176'da `mutlu` için yazılmıştı).
 *
 * ⚠️ 🔴 Bu boyda (56 piksel) **yalnızca `durgun` kareler** kullanılıyor:
 * `mutlu`nun kıvılcımları (±78px) ve `keyifli`nin kalpleri (52px)
 * sabit piksel ve karakterin boyuyla ölçeklenmiyor. 56 pikselde
 * kıvılcım karakterin üç katı uzağa saçılırdı. Büyük portre bu yüzden
 * ayrı kare kullanıyor.
 */
const ANLAR: { ifade: AvatarIfadesi; baslik: string; metin: string }[] = [
  {
    ifade: "neseli",
    baslik: "Masada karşılar",
    metin:
      "Karekodu okutan müşterinin gördüğü ilk yüz o: “Önce çarkı çevir!”",
  },
  {
    ifade: "neseli",
    baslik: "Çarkı o çeviriyor",
    metin: "Günlük şans çarkını iten de, dönüş bitince duran da Loopy.",
  },
  {
    ifade: "kuponlu",
    baslik: "Kuponu onun elinden alır",
    metin: "Kazanılan ödül, Ödüllerim sayfasında Loopy'nin elinde duruyor.",
  },
];

/**
 * Renk şeridinde gösterilen örnekler.
 *
 * ⚠️ Adların hepsi `avatar-paleti.json`da **var**: uydurma bir ad
 * `govdeRengi`/`seritRengi` içinde sessizce varsayılana düşer ve şerit
 * altı özdeş Loopy gösterirdi — bozulduğu belli olmayan bir hata.
 *
 * ⚠️ İlki karakterin **özgün hâli** (krem + turuncu şerit): şerit
 * "istersen değiştir" diyor, "başka bir karakter" değil.
 */
const RENKLER: { govde: string; serit: string }[] = [
  { govde: "krem", serit: "turuncu-canli" },
  { govde: "gok-orta", serit: "kar" },
  { govde: "zumrut-orta", serit: "limon-canli" },
  { govde: "fusya-orta", serit: "kar" },
  { govde: "kehribar-acik", serit: "komur" },
  { govde: "antrasit", serit: "turkuaz-canli" },
];

/**
 * Kaç kombinasyon çıktığı **sayılıyor**, yazılmıyor.
 *
 * ⚠️ Vitrinde elle yazılan her sayı, palet büyüdüğü gün yalan oluyor.
 * Doğrulama tablolarının boyu tek kaynak: `avatar-paleti.json`a bir
 * satır eklenince buradaki cümle kendiliğinden doğru kalıyor.
 */
const KOMBINASYON = GOVDE_RENKLERI.size * SERIT_RENKLERI.size;

export function VitrinLoopy() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-5">
        <Beliren yon="yakin">
          <div className="overflow-hidden rounded-3xl bg-vitrin-lacivert text-yuzey shadow-[0_30px_70px_-30px_rgba(16,32,77,0.6)]">
            <div className="grid items-center gap-10 px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
              {/*
                ── Sahne ────────────────────────────────────

                ⚠️ `oncelik={false}` ELLE veriliyor: `Avatar`ın "büyükse
                üsttedir" tahmini burada yanlış — bu Loopy sayfanın
                ekranlarca aşağısında ve üç dosyayı öne çekmesi için
                sebep yok (Ü219).

                ⚠️ Buhar yalnızca BURADA açık. `Avatar`ın notu net:
                *"her ekranda tüten bir bardak, bir süre sonra
                bakılmayan bir hareket olur"*. Vitrinde tek bir yerde
                açılıyor ve o yer bunu hak ediyor — karakterin bir kahve
                bardağı olduğunu tek kelime harcamadan söyleyen şey o.
              */}
              {/* ⚠️ Geniş ekranda büyüyen şey ÖLÇEK, `boy` değil: boy
                  sunucuda tek bir sayı ve duyarlı olamıyor. Büyüme
                  `origin-bottom` ile yukarı doğru — aşağı doğru
                  büyüseydi karakter kartın alt dolgusuna taşardı. */}
              <div className="flex justify-center">
                <div className="origin-bottom lg:scale-120">
                  <Avatar
                    ifade="keyifli"
                    boy={228}
                    oncelik={false}
                    ad="Loopy — Looply'nin maskotu, kapaklı bir kahve bardağı"
                  />
                </div>
              </div>

              {/* ── Metin ──────────────────────────────────── */}
              <div>
                <p className="etiket-caps text-[10px] text-odul">
                  Müşterinin gördüğü yüz
                </p>
                <h2 className="mt-3 font-display text-[clamp(28px,4.6vw,46px)] leading-[1.04] font-extrabold tracking-[-0.03em]">
                  Kafende bir de{" "}
                  <span className="text-odul">Loopy</span> çalışıyor.
                </h2>
                <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/65 sm:text-[16px]">
                  Karekodu okutan müşteri bir form değil, onu karşılayan bir
                  karakter görüyor. Aynı yüz çarkta, oyunda ve kuponu verirken
                  yeniden çıkıyor.
                </p>

                {/*
                  Üç an teker teker giriyor: anlatılan şey bir liste değil,
                  müşterinin sırayla yaşadığı üç karşılaşma.
                */}
                <Sirali
                  etiket="ul"
                  cocukEtiketi="li"
                  adim={150}
                  gecikme={180}
                  className="mt-8 space-y-5"
                >
                  {ANLAR.map((a) => (
                    <An key={a.baslik} {...a} />
                  ))}
                </Sirali>
              </div>
            </div>
          </div>
        </Beliren>

        {/* ── Renk şeridi ─────────────────────────────── */}
        {/*
          🔴 Bu bir süs değil, işletmeciye söylenen bir şey.

          Müşteri Loopy'nin bardak ve şerit rengini kendisi seçiyor
          (Ü186, `/loopy`) ve seçtiği renk oyunlarda, çarkta, profilinde
          onunla geliyor. İşletmeci açısından anlamı şu: müşteri ürüne
          bir şey **bırakıyor** — geri gelmesinin sebeplerinden biri de
          o.

          ⚠️ Örnekler tek tek renk alıyor (`govde`/`serit` propları).
          Sayfaya `<LoopyRenkleri>` basılsaydı altısı da aynı renge
          düşerdi; bu iki prop zaten tam bu durum için var.
        */}
        <Beliren yon="alt" className="mt-6">
          <div className="rounded-3xl border border-cizgi bg-cukur px-6 py-9 text-center sm:px-10">
            <p className="etiket-caps text-yazi-sonuk">Müşterinin Loopy&apos;si</p>
            <p className="mx-auto mt-3 max-w-lg font-display text-[clamp(19px,2.6vw,26px)] leading-tight font-extrabold tracking-[-0.02em]">
              Bardağın ve şeridin rengini müşterin seçiyor.
            </p>

            <ul className="mt-7 flex flex-wrap items-end justify-center gap-x-5 gap-y-4">
              {RENKLER.map((r) => (
                <li key={`${r.govde}-${r.serit}`}>
                  {/* ⚠️ `neseli`: gülüyor ama sade. Buradaki iş rengi
                      okutmak; elinde bir nesne taşıyan kare altı örneği
                      de kalabalıklaştırırdı. */}
                  <Avatar
                    ifade="neseli"
                    boy={62}
                    govde={r.govde}
                    serit={r.serit}
                    oncelik={false}
                  />
                </li>
              ))}
            </ul>

            <p className="mx-auto mt-6 max-w-md text-[14px] leading-relaxed text-yazi-sonuk">
              {KOMBINASYON.toLocaleString("tr-TR")} kombinasyon — ve seçtiği
              renk oyunlarda, çarkta, profilinde onunla geliyor.
            </p>
          </div>
        </Beliren>
      </div>
    </section>
  );
}

/**
 * Tek bir karşılaşma satırı.
 *
 * ⚠️ Küçük Loopy `aria-hidden` (`ad` verilmiyor): anlamı taşıyan şey
 * yanındaki başlık ve cümle. Üç avatarı da okutmak ekran okuyucuda
 * "Loopy, Loopy, Loopy" demek olurdu.
 *
 * ⚠️ `<li>` ÜRETMİYOR: `Sirali` her çocuğu kendi ögesine sarıyor ve
 * burada da `<li>` olsaydı iç içe iki liste ögesi doğardı (aynı tuzak
 * `page.tsx`teki `Eksi`/`Arti` için yazılı).
 */
function An({
  ifade,
  baslik,
  metin,
}: {
  ifade: AvatarIfadesi;
  baslik: string;
  metin: string;
}) {
  return (
    <span className="flex items-center gap-4">
      <span className="shrink-0">
        <Avatar ifade={ifade} boy={56} oncelik={false} />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold">{baslik}</span>
        <span className="mt-0.5 block text-[14px] leading-relaxed text-white/55">
          {metin}
        </span>
      </span>
    </span>
  );
}
