import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { idIleBul, gorunum } from "@/domain/player";
import { degerlendir, type KazanilmisRozet } from "@/domain/rozet";
import { karne, type KafeKarnesi } from "@/domain/profil";
import Link from "next/link";
import {
  OyuncuSayfa,
  OyuncuBolum,
  Pul,
  BiletYuzeyi,
  KoyuKart,
} from "@/components/oyuncu";
import { RENK, type OyuncuRengi } from "@/components/oyuncu-renk";
import { MadalyaIkonu, OyunIkonu, KupaIkonu } from "@/components/oyuncu-ikon";
import { LooplyLogo } from "@/components/logo";
import { LoopySozu } from "@/components/loopy-sozu";
import { OyuncununRenkleri } from "@/components/loopy-renk-kapsami";
import { Gorsel } from "@/components/oyuncu-gorsel";
import { cikisYap } from "../oyna/actions";

export const dynamic = "force-dynamic";

/**
 * "Profilim" — kafe bazlı seviye, rozetler ve oyun geçmişi.
 *
 * Ü15: **global seviye yok.** Oyuncu "ben 4. seviyeyim" demiyor, "bu
 * kafede 4. seviyeyim" diyor. Ekran da bu yüzden kafe kartlarından
 * oluşuyor — tepede tek bir büyük sayı yok. Ü5'in (puan kafe bazında)
 * profil tarafındaki karşılığı.
 *
 * Ü14: ilerlemenin ölçüsü XP, puan değil. Ödül alan oyuncunun puanı
 * düşer ama seviyesi düşmez.
 *
 * Ü16: rozetlerin ekonomik değeri yok. Bu ekran hiçbir bakiye
 * değiştirmiyor — `degerlendir()` yalnızca `player_badges` tablosuna
 * yazıyor, üstelik idempotent (aynı rozet ikinci kez yazılamıyor).
 *
 * ── Renk seviyeden geliyor (Ü65) ────────────────────────────
 *
 * Kafe kartları birbirinin kopyasıydı. Artık her kart **seviye
 * kuşağının** renginde: 1-2 nane, 3-4 gök, 5-6 menekşe, 7+ altın.
 * Renk süs değil, ilerlemenin kendisi — oyuncu iki kafeyi yan yana
 * görünce hangisinde daha ileride olduğunu sayıya bakmadan anlıyor.
 */
export default async function ProfilSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const oyuncu = await idIleBul(o.ozneId);
  if (!oyuncu) redirect("/giris");
  const g = gorunum(oyuncu);

  // Rozet değerlendirmesi ekran açılırken çalışıyor. Yazma işlemi ama
  // idempotent: benzersiz indeksler ikinci kaydı reddediyor (0009), yani
  // sayfayı yenilemek yeni rozet üretmiyor.
  const masa = await masaOturumu.aktif(o.ozneId);
  await degerlendir(o.ozneId, masa?.cafeId);

  const { kafeler, globalRozetler } = await karne(o.ozneId);

  const rozetSayisi =
    globalRozetler.length + kafeler.reduce((t, k) => t + k.rozetler.length, 0);
  const toplamOyun = kafeler.reduce((t, k) => t + k.toplamOyun, 0);
  // Ü188: elde duran kupon — kafe kartlarındaki sayaçla aynı tanım.
  const kuponElde = kafeler.reduce((t, k) => t + k.kuponElde, 0);

  return (
    // `yuva` AÇIK (Ü172): kapalı olmasının tek sebebi sayfanın
    // ortasındaki avatar kopyasıydı, o kalktı.
    <OyuncuSayfa aktif="/profil" geri={{ href: "/oyna", etiket: "Ana ekran" }}>
      {/* Ü186: oyuncunun seçtiği renkler — bu satırdan sonraki her
          Loopy o renkte çiziliyor. */}
      <OyuncununRenkleri />

      {/*
        🔴 Profil başlığı `SayfaBasi` DEĞİL — Ü175.

        Ürün sahibinin gönderdiği tasarım bu ekrana özel: üstte logo,
        sağ üstte kalem, kalp yapan Loopy, ve karta **binen** üç
        döşeme. `SayfaBasi` ürünün ortak başlığı ve beş ekranda
        kullanılıyor; bu tasarımı oraya koymak öbür dördünü de
        değiştirirdi.

        ⚠️ Üç döşeme kartın alt kenarına **biniyor** (`-mt-12`).
        Tasarımdaki hâli bu ve ucuz bir süs değil: kart ile içerik
        arasındaki sınırı yumuşatıp sayıları "kartın bir parçası"
        olmaktan çıkarıp "kartın taşıdığı şey" yapıyor.
      */}
      <div className="mb-8">
        {/*
          🔴 Zemin `KoyuKart` — Ü177.

          Ü175'te bu gradyan burada **elle yazılmıştı** ve `/oyna`daki
          karşılama kartıyla tonu tutmuyordu. Ürün sahibi ikisini yan
          yana görüp *"renk olarak aynı olmasını istiyorum"* dedi.
          İki yerde de elle düzeltmek aynı çatlağı bir tur sonraya
          ertelemek olurdu; şimdi gradyan, doku ve gölge tek yerden
          geliyor ve iki kart yapı gereği aynı.
        */}
        {/*
          🔴 Kart kısaldı, Loopy büyüdü — Ü179.

          Ürün sahibi: *"alt kısımdaki mor alan fazlalık"*, *"Kahveyle
          daha güzel oyunlar yazısını da kaldır"* ve *"avatarın boyutu
          biraz daha büyümeli ama kartın kısalmalı."*

          İkisi aynı anda ancak **Loopy'nin kolonu kısalırsa** olurdu,
          çünkü kartın boyunu metin değil o belirliyor. Üç yerden
          kazanıldı:

            1. Altyazı gitti (istenen).
            2. Kalem satırı MUTLAK konuma geçti, logo sol kolona girdi:
               Loopy artık kartın tepesinden başlıyor, o satırın 40
               pikselini ödemiyor.
            3. Balon karakterin ALTINA indi (`yon="alt"`): üstteyken
               kalem düğmesiyle çakışıyordu ve bu yüzden kolonu aşağı
               itmek gerekiyordu. Karakterin kafası balondan dar, kalemin
               yanından geçiyor.
        */}
        <KoyuKart className="pt-5 pb-9">
          {/*
            Kalem `/verilerim`e gidiyor: hesabın düzenlenebilir tek
            yeri orası (ad, bildirim tercihi, veri indirme, silme).
            Tasarımda bir kalem var ve gideceği yer olmayan bir düğme
            koymak, verilmemiş bir söz olurdu.

            ⚠️ MUTLAK konumda (Ü179): akışta dururken kendi satırını
            açıyordu ve o satır kartı 40 piksel uzatıyordu. Mutlak
            konumda kartın köşesinde duruyor, hiçbir şeyi itmiyor.

            ⚠️ `-right-2` NEGATİF ve ölçülerek seçildi. Konumlandıran
            ata `KoyuKart`ın **iç** sarmalayıcısı, yani sağ kenarı
            kartın 20 piksellik dolgusunun içinde (335). Loopy'nin
            karesinde üst %35'lik bant (buhar dahil) 250–303 arasını
            kaplıyor; sıfır uzaklıkta düğme 299'da başlıyor ve tam
            buharın üstüne düşüyor. −8 piksel onu dolguya taşırıp 307'ye
            alıyor: buhardan 4 piksel pay, kartın kenarından 12.
          */}
          <Link
            href="/verilerim"
            aria-label="Hesabını düzenle"
            /*
              🔴 `top-10` — Ü189, ölçülerek. Balon Ü179'da kalemden
              kaçmak için Loopy'nin ALTINA inmişti; Ü189'da Loopy bulutun
              üstüne basmak zorunda kalınca balon yine üste döndü ve aynı
              çakışma geri geldi.

              Ölçüm (kart koordinatı): balon 201–309 × 20–53,
              kalem `top-4`te 287–323 × 36–72 → 22×16,5 piksellik
              örtüşme. Kalemi 24 piksel indirmek boşluğu açıyor
              (56–92, balonun altından 3 piksel sonra) ve metnin
              genişliğine hiç dokunmuyor — balonu daraltmak cümleyi üç
              satıra bölerdi.
            */
            className="absolute top-10 -right-2 z-10 flex size-9 items-center justify-center rounded-full bg-white/25 text-white transition-colors hover:bg-white/35"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 20h4L19 9a2.8 2.8 0 10-4-4L4 16v4z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          {/*
            🔴 `items-center` — Ü179 ve sebebi ölçüldü.

            Altyazı kalkınca sol kolon kısaldı, Loopy'nin kolonu uzun
            kaldı. `items-start`te aradaki fark adın ALTINDA tek parça
            boş mor olarak duruyordu — ürün sahibinin şikâyet ettiği
            şeyin ta kendisi, üstelik altyazıyı silmek onu büyütmüştü.

            Ortalayınca aynı boşluk adın altına ve üstüne bölünüyor ve
            hiçbir yerde "burada bir şey eksik" demiyor.
          */}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <LooplyLogo boyut={30} beyaz />
              <p className="etiket-caps mt-5 text-white/60">Profil</p>
              {/* `mt-1.5` — Ü177: ürün sahibi adın biraz daha aşağıda
                  durmasını istedi ve iki kart aynı olmak zorunda. */}
              <h1 className="mt-1.5 font-display text-3xl leading-none font-extrabold tracking-tight text-white">
                {g.ad}
              </h1>
              {/*
                ⚠️ "Kahveyle daha güzel oyunlar!" KALDIRILDI (Ü179) —
                ürün sahibinin isteği. `/oyna`daki karşılığı duruyor
                çünkü orada cümle bilgi taşıyor: kafede olup olmadığına
                göre değişiyor ve ne yapılacağını söylüyor. Buradaki
                yalnızca süslemeydi.
              */}
            </div>

            {/*
              ⚠️ Kolon SABİT genişlikte ve Loopy onun içinde büyüyor —
              Ü174'ün dersi. Esnek kolonda karakteri büyütmek metnin
              yerini yer ve 375 pikselde başlık dört satıra düşer.

              🔴 `-mr-3` — Ü178: Loopy kartın KENDİ İÇ DOLGUSUNA
              taşıyor, kazanılan 20 piksel metinden değil oradan
              geliyor. `/oyna`daki kardeşiyle birebir aynı ölçü.
            */}
            {/*
              🔴 Loopy BULUTUN ÜSTÜNDE — Ü189.

              Ürün sahibi referans gönderdi: *"arka plan bulutlu gibi,
              bizim Loopy'miz de bulutun üstünde gibi, ondan ilham
              alarak yapalım."*

              ⚠️ `items-center` yüzünden karakter kartın dikey ortasına
              hizalıydı ve dalgaların ÜSTÜNDE havada duruyordu.
              `self-end` onu alta indiriyor, `-mb-9` ise kartın iç
              dolgusunu yiyip ayaklarını dalganın tepesine bastırıyor.
              Ölçüldü: dalga tepesi kartın altından ~58 piksel yukarıda,
              karakterin ayak hizası 36 — aradaki fark negatif kenar
              boşluğuyla kapanıyor.
            */}
            <div className="-mr-3 -mb-9 w-[9rem] shrink-0 self-end">
              <LoopySozu soz="İyi ki buradasın!" ifade="keyifli" boy={150} yon="ust" />
            </div>
          </div>
        </KoyuKart>

        {/*
          🔴 `relative` ŞART, süs değil.

          İlk denemede yoktu ve döşemelerin üstü kartın ALTINDA kaldı:
          ikonlar ve etiketler görünmüyordu, yalnızca sayılar
          çıkıyordu. Sebep yığın sırası — kart `relative`, yani
          konumlandırılmış; döşemeler değildi ve konumlandırılmış öge
          konumlandırılmamış kardeşinin üstüne boyanıyor. Sonra
          gelmek yetmiyor.

          ⚠️ Binme `-mt-8`: `-mt-12` denendi ve fazlaydı, döşemenin
          yarısından çoğu kartın altına giriyordu.
        */}
        {/*
          🔴 Dördüncü döşeme KUPON — Ü188.

          Üç döşeme "kaç kafe, kaç oyun, kaç rozet" diyordu; üçü de
          **geçmişi** sayıyor. Oyuncunun elinde ne olduğunu söyleyen tek
          sayı yoktu. Kupon o boşluğu dolduruyor ve profilin tek
          "şu anda" sayısı o.

          ⚠️ Büyük sayı ELDE DURAN kupon — kafe kartlarındaki sayaçla
          aynı tanım. İki yerde iki farklı tanım kullanmak, bu projede
          iki kez yaşanmış bir hata (Ü144).
        */}
        <div className="relative -mt-8 grid grid-cols-4 gap-1.5 px-2">
          <ProfilDosem ikon={<Gorsel ad="icecek" boy={20} />} etiket="Kafe" deger={String(kafeler.length)} />
          <ProfilDosem ikon={<Gorsel ad="kumanda" boy={20} />} etiket="Oyun" deger={toplamOyun.toLocaleString("tr-TR")} />
          <ProfilDosem ikon={<Gorsel ad="bilet" boy={20} />} etiket="Kupon" deger={String(kuponElde)} vurgu={kuponElde > 0} />
          <ProfilDosem ikon={<KupaIkonu boy={20} />} etiket="Rozet" deger={String(rozetSayisi)} vurgu={rozetSayisi > 0} />
        </div>

        {globalRozetler.length > 0 && (
          <div className="mt-5">
            <div className="etiket-caps text-yazi-sonuk">Rozetlerin</div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {globalRozetler.map((r) => (
                <li key={r.code}>
                  <Pul baslik={r.baslik} aciklama={r.aciklama} renk="amber" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/*
        🔴 Loopy profilin ORTASINDAN kalktı — Ü172.

        Ü147'de buraya konmuştu: *"profil kısmına tatlı avatarımızı
        ekleyelim, parmağımızla kaydırarak sevme olsun."* Ürün sahibi
        şimdi kaldırılmasını istedi ve profilin yeniden tasarlanacağını
        söyledi.

        ⚠️ Kaldırırken bir şey geri veriliyor: `yuva` bu sayfada
        **açıldı**. Kapalı olmasının tek sebebi buradaki kopyaydı —
        *"ikisi bir arada aynı karakterin iki kopyası olurdu"*. Kopya
        gidince yuvanın kapalı kalması için sebep kalmıyor ve Loopy
        profilde de ulaşılabilir oluyor.

        ⚠️ Özelleştirme bu sayfadan çıktı ama **hiçbir şey
        kaybedilmedi**: renk ve aksesuar seçicileri zaten `COK_RENKLI`
        bayrağının arkasında kapalı (`components/avatar.tsx`) — elde
        Loopy'in tek 3B karesi var. Bayrak açıldığında seçicilerin
        nereye gideceği yeniden kararlaştırılacak.
      */}

      {kafeler.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-cizgi bg-yuzey px-6 py-8 text-center">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -bottom-8 text-yazi-sonuk opacity-[0.10]"
          >
            <Gorsel ad="madalya" boy={140} />
          </span>
          <div className="relative flex justify-center">
            <MadalyaIkonu boy={64} />
          </div>
          <p className="relative mt-4 text-[15px] leading-relaxed text-yazi-sonuk">
            Henüz bir kafede ilerleme kaydetmedin. Seviye ve rozetler yalnızca kafede, masadaki
            karekodu okutup oynadığında birikir.
          </p>
        </div>
      ) : (
        <OyuncuBolum baslik="Kafelerin" not={`${kafeler.length} kafe`}>
          <div className="flex flex-col gap-3">
            {kafeler.map((k) => (
              <KafeKarti key={k.cafeId} kafe={k} buradaMi={k.cafeId === masa?.cafeId} />
            ))}
          </div>
        </OyuncuBolum>
      )}

      <p className="mb-9 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Seviye her kafede ayrı tutulur — bir kafedeki ilerlemen diğerine taşınmaz.
      </p>

      {/*
        Hesap bölümü — Ü66.

        Ana ekranın en altında üç çıplak alt çizgili bağlantı olarak
        duruyordu ve ürün sahibi *"sayfamızın yapısıyla alakasız
        olmuş"* dedi. Doğru yeri burası: ana ekran oynanacak yer,
        hesap ayarları profilin işi.

        Çıkış ayrı ve en altta, kırmızı değil sönük: yıkıcı bir işlem
        değil, oturumu kapatmak. Kırmızı olsaydı "hesabımı siliyorum"
        gibi okunurdu.
      */}
      <OyuncuBolum baslik="Hesabın">
        <div className="grid gap-2.5">
          {/*
            🔴 Özelleştirme LİSTENİN BAŞINDA — Ü186.

            Ü172'de profilin ortasından kaldırılmıştı ve yerine hiçbir
            şey konmamıştı; oyuncunun renk seçebildiğini öğrenmesinin
            tek yolu yuvadaki düğmeydi. Yuva ise ancak Loopy'ye
            dokunan birinin gördüğü bir şey.

            Başta olmasının sebebi: diğer iki satır (davet, veriler)
            gündelik değil, bu ise ekranı ilk kez gören oyuncunun
            hemen yapmak isteyeceği şey.
          */}
          <HesapSatiri
            yol="/loopy"
            baslik="Loopy'i özelleştir"
            alt="Bardağının ve şeridinin rengini sen seç"
            renk="menekse"
          />
          <HesapSatiri
            yol="/davet"
            baslik="Arkadaşını çağır"
            alt="Davet kodunu paylaş, ikiniz de kazanın"
            renk="yesil"
          />
          <HesapSatiri
            yol="/verilerim"
            baslik="Verilerim ve hesap ayarlarım"
            alt="Adının görünürlüğü, telefonun, hesabını kapatma"
            renk="gok"
          />
          <form action={cikisYap}>
            <button
              type="submit"
              className="w-full rounded-2xl border border-cizgi bg-yuzey px-5 py-4 text-left text-[15px] font-semibold text-yazi-sonuk transition-colors hover:border-yazi-sonuk/40 hover:text-yazi"
            >
              Çıkış yap
            </button>
          </form>
        </div>
      </OyuncuBolum>
    </OyuncuSayfa>
  );
}

function HesapSatiri({
  yol,
  baslik,
  alt,
  renk,
}: {
  yol: string;
  baslik: string;
  alt: string;
  renk: OyuncuRengi;
}) {
  const r = RENK[renk];
  return (
    <Link
      href={yol}
      className="block rounded-2xl border border-cizgi border-l-4 bg-yuzey px-5 py-4 transition-colors hover:border-yazi-sonuk/40"
      style={{ borderLeftColor: r.canli }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] leading-tight font-semibold">{baslik}</span>
        <span aria-hidden className="text-[14px]" style={{ color: r.ana }}>
          →
        </span>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-yazi-sonuk">{alt}</p>
    </Link>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

/**
 * Seviye kuşağı.
 *
 * Dört kuşak var çünkü beş renk sığdırılabilirdi ama ayırt edilemezdi:
 * oyuncunun iki kafe arasındaki farkı görmesi için üç dört basamak
 * yeter, yedi basamak yeniden "hepsi aynı" demek olurdu.
 */
function seviyeRengi(seviye: number): OyuncuRengi {
  if (seviye >= 7) return "amber";
  if (seviye >= 5) return "menekse";
  if (seviye >= 3) return "gok";
  return "yesil";
}

/**
 * Kafe kartındaki tek sayı — Ü188.
 *
 * Zemin kartın kendi koyu gradyanının üstünde duruyor; beyaz bir kutu
 * koysaydık üç delik gibi okunurdu. Ayraç yerine boşluk, çizgi yerine
 * zemin — kart zaten yoğun.
 *
 * 🔴 Zemin `white/10` DEĞİL, `black/25` — Ü192, ölçülerek. Gerekçe
 * karne satırlarıyla ortak ve orada yazılı: eklemeli bir ton kartın
 * aydınlandığı yerde kendisi de aydınlanıyor.
 */
function KafeSayaci({
  etiket,
  deger,
  alt,
  uyari = false,
}: {
  etiket: string;
  deger: string;
  /** İkincil satır — yoksa yerini kaplamıyor. */
  alt?: string;
  /** Dikkat çekmesi gereken hâl (seri riskte). */
  uyari?: boolean;
}) {
  return (
    <div className="rounded-xl bg-black/25 px-2.5 py-2">
      <div className="etiket-caps text-[9px] text-white/55">{etiket}</div>
      <div className="mt-0.5 font-data text-[17px] leading-none font-bold text-white tabular">
        {deger}
      </div>
      {/* ⚠️ Alt satır YOKSA yüksekliği de yok: üç sayaç yan yana ve
          biri boş satır taşısaydı diğerleriyle hizası kayardı. Boşluğu
          eşitlemek için `min-h` konmadı — kart zaten alta hizalı. */}
      {alt && (
        <div
          className={`mt-1 text-[10px] leading-tight ${uyari ? "font-semibold text-odul" : "text-white/50"}`}
        >
          {alt}
        </div>
      )}
    </div>
  );
}

function KafeKarti({ kafe, buradaMi }: { kafe: KafeKarnesi; buradaMi: boolean }) {
  const renk = seviyeRengi(kafe.seviye);
  const r = RENK[renk];

  return (
    <section
      className="kart-golge kart-gel overflow-hidden rounded-3xl"
      style={{ border: `1px solid ${buradaMi ? r.canli : "transparent"}` }}
    >
      {/*
        🔴 Kartın TAMAMI tek koyu yüzey — Ü192.

        Ü172'de yalnızca üst şerit biletti; altındaki "burada
        oynadıkların" listesi beyaz kalıyordu. Ürün sahibi profile bakıp
        *"içeriğini ve burdaki tasarımı düzeltmemişsin"* dedi ve ekranda
        gördüğü şey buydu: koyu bir başlık, altına kaynatılmış beyaz bir
        kütük. Ü171–Ü191 arasında ürünün her yüzeyi koyu bilet ailesine
        geçti; profildeki kafe kartı aynı kartın içinde iki dil
        konuşan son yerdi, üstelik beyaz yarı daha uzundu.

        ⚠️ Çerçeve artık yalnızca BURADAYKEN çiziliyor (`transparent`
        değilse). Eskiden her kartın `cizgi` rengi bir kenarı vardı ve
        beyaz gövdeyi sayfadan ayırmak için gerekiyordu; koyu gövde
        zaten ayrılıyor, kalan kenar "buradasın"ın işareti olarak
        sahiplendi. Rengi `ana` değil `canli`: koyu gövdenin kenarında
        `ana` tonu gövdeden ayrılmıyordu.
      */}
      {/*
        ⚠️ `gorsel` KALDIRILDI. Faz boyunca sağda %17 opaklıkta beyaz bir
        fincan çizimi duruyordu ve `top-1/2` ile ortalanıyordu. Kart
        karne satırlarıyla uzayınca o orta nokta satırların tam arkasına
        düştü: `bg-white/10` kutuların kenarlarından sızan bir filigran.
        Kartın illüstrasyonu artık satırların kendi oyun ikonları — üç
        dört tanesi, tam da beyaz bloğun durduğu yerde.
      */}
      <BiletYuzeyi renk={renk} yuvarlak={false} className="px-5 py-5">
        <div className="flex items-start gap-4">
          <SeviyeHalkasi seviye={kafe.seviye} yuzde={kafe.ilerlemeYuzde} renk={renk} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl leading-tight font-bold text-white">
                {kafe.cafeAdi}
              </h3>
              {buradaMi && <Pul baslik="Buradasın" renk={renk} />}
            </div>

            <div className="mt-2 font-data text-[13px] text-white/70 tabular">
              {kafe.xp.toLocaleString("tr-TR")} XP
            </div>

            {/* Oluk koyu zeminde beyaz/%20; dolgu `canli` — koyu
                zeminde `ana` tonu zeminden ayrılmıyordu. */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="asil-serit h-full rounded-full"
                style={{ width: `${kafe.ilerlemeYuzde}%`, background: r.canli }}
                role="progressbar"
                aria-valuenow={kafe.ilerlemeYuzde}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${kafe.cafeAdi} seviye ilerlemesi`}
              />
            </div>
            <div className="mt-1.5 font-data text-[10px] text-white/55">
              {kafe.sonrakiEsik === null
                ? "En üst seviyedesin"
                : `Sonraki seviyeye ${(kafe.sonrakiEsik - kafe.xp).toLocaleString("tr-TR")} XP`}
            </div>
          </div>
        </div>

        {/*
          🔴 "Nerede duruyorum" şeridi — Ü188.

          Ürün sahibi *"profil kısmını tam işimize yarayacak şekilde
          yenileyelim"* dedi. Eksik olan şey görsel değildi: profil
          Ü15'ten beri yalnızca *"ne kadar ilerledim"* diyordu (seviye,
          XP, rozet, oynadıkların). Oyuncunun asıl merak ettiği üç sayı
          üç ayrı ekrana dağılmıştı —

            puan   → yalnızca ana ekranda, üstelik yalnızca BULUNDUĞU kafede
            kupon  → yalnızca Ödüllerim'de, kafeye göre ayrılmadan
            seri   → yalnızca kafedeyken, ana ekranda

          Yani "B kafesinde ne kadar puanım var" sorusunun cevabı
          üründe hiçbir yerde yoktu. Artık kafe kartının kendisinde.

          ⚠️ Sıralama tesadüf değil: puan harcanacak şey, kupon elde
          duran şey, seri kaybedilecek şey. Soldan sağa "neyim var" →
          "ne yapmalıyım".
        */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <KafeSayaci etiket="Puan" deger={kafe.puan.toLocaleString("tr-TR")} />
          <KafeSayaci
            etiket="Kupon"
            deger={String(kafe.kuponElde)}
            /* ⚠️ Büyük sayı ELDE DURAN, kazanılan toplam değil: oyuncunun
               kasada gösterebileceği şey bu. Toplam alt satırda kalıyor —
               ikisini yer değiştirmek "3 kuponum var" deyip kasada iki
               tanesini bulamamak demekti. */
            alt={
              kafe.kuponToplam > kafe.kuponElde
                ? `${kafe.kuponToplam} kazandın`
                : undefined
            }
          />
          <KafeSayaci
            etiket="Seri"
            deger={kafe.seri.gun > 0 ? `${kafe.seri.gun} gün` : "—"}
            alt={kafe.seri.riskte ? "bugün oyna" : undefined}
            uyari={kafe.seri.riskte}
          />
        </div>

        {/*
          🔴 Kütük değil KARNE — Ü192.

          Burada Ü20'den beri son on oturum satır satır duruyordu:
          `Blok · 16 Eyl · 1172`, `Düşen · 14 Eyl · 1385`, `Yılan · 13
          Eyl · 1583`… Ürün sahibinin *"içeriğini düzeltmemişsin"*
          dediği şey buydu ve ekrandaki hâli gerekçeyi kendi veriyordu:
          18 oyunun 10 satırı kafe kartından uzundu, dördü aynı oyunun
          tekrarıydı ve hiçbiri oyuncunun bilmediği bir şey söylemiyordu.
          Kendi oynadığı oyunun tarihini zaten biliyor.

          Aynı 18 oturum oyun başına toplanınca dört satır kalıyor ve her
          satır bir cevap veriyor: **kaç kez oynadım, rekorum kaç, en son
          ne zaman.** Gruplama SQL'de (`domain/gecmis.ts`) — ekranda
          toplamak, 10 satırlık pencereden 18 oyunun rekorunu
          hesaplamaya çalışmak olurdu.

          ⚠️ Toplam sayı başlıkta KALDI. Satır sayısı artık "kaç oyun
          oynadım"ı söylemiyor (dört satır, 18 oyun) ve o sayı ortadan
          kaybolsaydı içerik zenginleşirken bilgi eksilirdi.
        */}
        {kafe.oyunlar.length > 0 && (
          <div className="mt-4">
            <div className="etiket-caps text-[9px] text-white/55">
              Burada oynadıkların · {kafe.toplamOyun}
            </div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {kafe.oyunlar.map((oyun) => (
                /*
                  🔴 Satır zemini `black/25`, `white/10` DEĞİL — Ü192,
                  ölçülerek.

                  İlk hâli `white/10` idi (kartın üst yarısındaki
                  sayaçlarla aynı ton) ve kopyada alt iki satırın rekor
                  sayısı gözle görülür soluklaştı. Sebep eklemeli ton:
                  `KartDalgalari`nin üçüncü katmanı kartın SAĞ ALTINA
                  `canli` renginde bir aksan koyuyor ve kart karne
                  satırlarıyla uzayınca o aksan tam rekor sütununun
                  altına düştü. Beyaz tint aydınlanan zeminde daha da
                  aydınlanıyor, yani satır arkasındaki her şeyi takip
                  ediyor.

                  Koyulaştıran bir zemin taban veriyor: arkasında ne
                  olursa olsun satır kendi zemininden daha açık olamaz.
                  Nötr siyah, mor değil — kart yeşil, gök, menekşe ve
                  amber kuşaklarının hepsinde aynı bileşen.
                */
                <li
                  key={oyun.oyunId}
                  className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2"
                >
                  {/* ⚠️ İkon 18'den 30'a çıktı: `/oyun/ikon-*.webp`
                      üretilmiş illüstrasyonlar ve 18 pikselde ne
                      oldukları seçilmiyordu. Satır sayısı ona bölündüğü
                      için yer de var. */}
                  <OyunIkonu oyunId={oyun.oyunId} boy={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] leading-tight font-semibold text-white">
                      {oyun.oyunAdi}
                    </span>
                    <span className="mt-0.5 block font-data text-[10px] text-white/55 tabular">
                      {oyun.kez} oyun · son{" "}
                      {oyun.son.toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </span>
                  {/* ⚠️ Rekor yoksa kutu hiç ÇİZİLMİYOR. `0` yazmak
                      "sıfır puan aldın" demekti; skorsuz bir oyun türü
                      eklendiğinde `max()` null döner. */}
                  {oyun.enIyi != null && (
                    <span className="shrink-0 text-right">
                      <span className="etiket-caps block text-[8px] text-white/50">
                        En iyi
                      </span>
                      {/*
                        🔴 Rekor BEYAZ, kuşağın rengi değil — ölçüldü.

                        Önce `canli` tonu denendi: sayı kartın kendi
                        renk ailesinden gelsin diye. Dört kuşakta da
                        kalıyor (2.13–3.06), altın da gök ve amberde
                        kalıyor (2.73 / 2.37 — amberde zaten altının
                        üstünde altın). Kartın rengi seviyeyi zaten
                        söylüyor; rekoru da ona boyamak, okunması
                        gereken tek sayıyı okunmaz yapıyordu.

                        Beyazın satır zemini üstündeki oranları,
                        dalga aksanının altında kalan en kötü hâl
                        dahil —

                          kuşak    white/10        black/25
                                   düz   aksan     düz   aksan
                          yeşil    5.33   3.97     9.54   7.30
                          gök      4.56   3.72     8.27   6.87
                          menekşe  5.79   4.80    10.08   8.62
                          amber    3.96   3.17     7.36   5.95

                        Asıl mesele ortalama değil YAYILMA: `white/10`
                        ile aynı kart içinde 3.17'den 5.79'a gidiyor ve
                        kopyada bu "üst iki satır net, alt iki satır
                        soluk" olarak görülüyordu. Koyu zeminde taban
                        5.95'e çıkıyor ve satırlar birbirinin aynı
                        oluyor.
                      */}
                      <span className="mt-0.5 block font-data text-[15px] leading-none font-bold text-white tabular">
                        {oyun.enIyi.toLocaleString("tr-TR")}
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {kafe.rozetler.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {kafe.rozetler.map((rz) => (
              <RozetPulu key={rz.code} rozet={rz} renk={renk} />
            ))}
          </ul>
        )}
      </BiletYuzeyi>
    </section>
  );
}

/**
 * Seviye halkası — sayı ve ilerleme tek nesnede.
 *
 * Eskiden seviye solda büyük bir sayı, XP sağda küçük bir sayı, ilerleme
 * altta ayrı bir şeritti; üç ayrı yerde okunan tek bir şey. Halka
 * seviyeyi ortada tutup ilerlemeyi çevresine sarıyor.
 *
 * Yay `stroke-dasharray` ile çiziliyor ve **çevre üç haneye
 * yuvarlanıyor**: sunucu ile tarayıcının aynı ondalığı basmaması
 * hidrasyon uyarısı üretiyordu (aynı hata SVG'lerde daha önce de çıktı).
 */
function SeviyeHalkasi({
  seviye,
  yuzde,
  renk,
}: {
  seviye: number;
  yuzde: number;
  renk: OyuncuRengi;
}) {
  const r = RENK[renk];
  const yaricap = 24;
  const cevre = Math.round(2 * Math.PI * yaricap * 1000) / 1000;
  const dolu =
    Math.round(((cevre * Math.min(100, Math.max(0, yuzde))) / 100) * 1000) / 1000;

  return (
    <div className="relative size-14 shrink-0">
      <svg viewBox="0 0 56 56" className="size-full -rotate-90" aria-hidden>
        {/*
          Yatak görünür bir gri.

          İlk denemede yatak da beyazdı ve seviyeye yeni geçmiş bir
          oyuncuda (ilerleme %0) halka tamamen kayboluyordu — ekranda
          bir daire değil, boş bir beyaz leke duruyordu. Yatak
          görününce boş halka da bir halka.
        */}
        <circle cx="28" cy="28" r={yaricap} fill="#ffffff" stroke="#ffffff" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={yaricap}
          fill="none"
          stroke="rgba(0,0,0,0.10)"
          strokeWidth="4"
        />
        <circle
          cx="28"
          cy="28"
          r={yaricap}
          fill="none"
          stroke={r.ana}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dolu} ${cevre}`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="etiket-caps text-[8px] leading-none" style={{ color: r.ana }}>
          SV
        </span>
        <span className="font-data text-lg leading-none font-bold tabular">{seviye}</span>
      </span>
    </div>
  );
}

function RozetPulu({ rozet, renk }: { rozet: KazanilmisRozet; renk: OyuncuRengi }) {
  return (
    <li>
      <Pul baslik={rozet.baslik} aciklama={rozet.aciklama} renk={renk} />
    </li>
  );
}

/**
 * Profil başlığındaki beyaz döşeme — Ü175.
 *
 * `/oyna`daki kardeşiyle (`Dosem`) aynı biçim ama ayrı duruyor:
 * ikisini paylaştırmak, iki ekranın birbirine bağlanması demekti ve
 * tasarımları birlikte değişmiyor. Kopya üç satır; bağ kalıcı olurdu.
 */
function ProfilDosem({
  ikon,
  etiket,
  deger,
  vurgu,
}: {
  ikon: React.ReactNode;
  etiket: string;
  deger: string;
  vurgu?: boolean;
}) {
  return (
    <div className="kart-golge rounded-2xl bg-yuzey px-2 py-3 text-center">
      <span className="flex justify-center text-odul-koyu">{ikon}</span>
      <span className="mt-1.5 block text-[11px] leading-tight font-semibold text-yazi-sonuk">
        {etiket}
      </span>
      <span
        className={`mt-0.5 block font-data text-xl leading-none font-bold tabular ${
          vurgu ? "text-odul-koyu" : "text-yazi"
        }`}
      >
        {deger}
      </span>
    </div>
  );
}
